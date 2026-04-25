"""
Coleta de atividade parlamentar — Deputados Federais e Senadores.

Fonte:
  Camara: https://dadosabertos.camara.leg.br/api/v2/
  Senado: https://legis.senado.leg.br/dadosabertos/

Preenche em mandatos_legislativo (por mandato_id):
  - presenca_plenario_pct     : % de sessoes deliberativas em que participou
  - presenca_comissoes_pct    : % de reunioes deliberativas (comissoes) participadas
  - sessoes_plenario_total    : total de sessoes no ano coletado (global)
  - sessoes_plenario_presente : sessoes em que o parlamentar esteve presente
  - cargos_lideranca          : array de textos descrevendo cargos de lideranca
  - atividade_atualizada_em   : timestamp da ultima coleta

Estrategia de presenca (Camara):
  - Sessoes plenarias = endpoint /eventos (total global) filtrado por codTipoEvento=110
  - Participacao do deputado = /deputados/{id}/eventos (lista eventos participados)
  - Presenca plenario = count(Sessao Deliberativa no deputado) / count(global)
  - Presenca comissoes = count(Reuniao Deliberativa no deputado) / count(global plenario)
    (usamos como proxy: reunioes deliberativas que o dep aparece)

Estrategia de presenca (Senado):
  - Votacoes como proxy de presenca: votos registrados em sessoes plenarias
  - Se votou: presente. Voto "P-NRV" = presente sem registrar voto (conta).
  - Total de sessoes = via /votacoes de qualquer senador (todas apontam as mesmas sessoes)

Casamento TSE:
  - Mandatos ja populados pelo ETL 10/11 (com ou sem candidato_id)
  - Nos apenas atualizamos os que JA EXISTEM em mandatos_legislativo
  - Nao criamos novos mandatos neste service

Idempotente: UPSERT por (casa, id_externo). Repete sem duplicar.

Uso (via CLI):
  docker exec ub_backend python -m app.cli.coletar_parlamentares --camara
  docker exec ub_backend python -m app.cli.coletar_parlamentares --senado
  docker exec ub_backend python -m app.cli.coletar_parlamentares --ambos
"""
from __future__ import annotations

import asyncio
import sys
import time
from datetime import datetime, timezone
from typing import Optional

import httpx

API_CAMARA = "https://dadosabertos.camara.leg.br/api/v2"
API_SENADO = "https://legis.senado.leg.br/dadosabertos"

PAUSE_S = 0.6    # segundos entre chamadas (rate-limit amigavel ~1.6 req/s)
TIMEOUT  = 30
HEADERS_SENADO = {"Accept": "application/json"}

# Tipos de evento Camara que contam como sessao plenaria
TIPOS_SESSAO_PLENARIA = {110, 115, 150, 197, 202}  # Sessao Deliberativa + variantes soleneis/debates
# Tipos que contam como reuniao de comissao
TIPOS_REUNIAO_COMISSAO = {112, 120, 125, 152, 180, 185, 190}


# ── Helpers HTTP ──────────────────────────────────────────────────────────────

async def _get_camara(client: httpx.AsyncClient, path: str, params: dict | None = None) -> dict | None:
    """GET na API da Camara com retry em 429/5xx."""
    url = f"{API_CAMARA}/{path}"
    for tentativa in range(3):
        try:
            r = await client.get(url, params=params, timeout=TIMEOUT)
            if r.status_code == 200:
                return r.json()
            if r.status_code in (429, 500, 502, 503):
                wait = 2 ** tentativa
                print(f"  [AVISO] {r.status_code} em {path} — aguardando {wait}s", flush=True)
                await asyncio.sleep(wait)
                continue
            return None
        except httpx.HTTPError as e:
            print(f"  [ERRO] {path}: {e}", flush=True)
            await asyncio.sleep(2 ** tentativa)
    return None


async def _get_senado(client: httpx.AsyncClient, path: str) -> dict | None:
    """GET na API do Senado (JSON) com retry."""
    url = f"{API_SENADO}/{path}"
    for tentativa in range(3):
        try:
            r = await client.get(url, headers=HEADERS_SENADO, timeout=TIMEOUT)
            if r.status_code == 200:
                return r.json()
            if r.status_code in (429, 500, 502, 503):
                wait = 2 ** tentativa
                await asyncio.sleep(wait)
                continue
            return None
        except httpx.HTTPError as e:
            print(f"  [ERRO] senado/{path}: {e}", flush=True)
            await asyncio.sleep(2 ** tentativa)
    return None


async def _total_eventos_camara(client: httpx.AsyncClient, cod_tipo: int, ano: int) -> int:
    """Retorna X-Total-Count de eventos globais de um tipo no ano."""
    url = f"{API_CAMARA}/eventos"
    params = {
        "codTipoEvento": cod_tipo,
        "dataInicio": f"{ano}-01-01",
        "dataFim": f"{ano}-12-31",
        "itens": 1,
    }
    for tentativa in range(3):
        try:
            r = await client.get(url, params=params, timeout=TIMEOUT)
            if r.status_code == 200:
                return int(r.headers.get("x-total-count", 0))
            if r.status_code in (429, 500, 502, 503):
                await asyncio.sleep(2 ** tentativa)
                continue
            return 0
        except httpx.HTTPError:
            await asyncio.sleep(2 ** tentativa)
    return 0


# ── Camara: presenca por deputado ─────────────────────────────────────────────

async def _presenca_deputado(
    client: httpx.AsyncClient,
    id_externo: str,
    total_plenario: int,
    total_comissoes: int,
) -> tuple[Optional[float], Optional[float], int, int]:
    """
    Retorna (presenca_plenario_pct, presenca_comissoes_pct,
             n_sessoes_plenario, n_sessoes_presente).

    Percorre todas as paginas de /deputados/{id}/eventos para o ano.
    Distingue plenario vs comissao pelo campo descricaoTipo.
    """
    url = f"deputados/{id_externo}/eventos"
    # Buscar 2024 (ano mais completo do mandato 57)
    params = {"dataInicio": "2024-01-01", "dataFim": "2024-12-31", "itens": 100}

    n_plenario  = 0
    n_comissao  = 0
    pagina      = 1

    while True:
        params["pagina"] = pagina
        data = await _get_camara(client, url, params)
        if not data or not data.get("dados"):
            break
        for ev in data["dados"]:
            tipo = ev.get("descricaoTipo", "")
            if "Sess" in tipo and "Deliberat" in tipo:
                n_plenario += 1
            elif "Reuni" in tipo and ("Deliberat" in tipo or "Elei" in tipo or "Instala" in tipo):
                n_comissao += 1
        if len(data["dados"]) < 100:
            break
        pagina += 1
        await asyncio.sleep(PAUSE_S)

    pct_plenario = round(n_plenario / total_plenario * 100, 2) if total_plenario > 0 else None
    pct_comissao = round(n_comissao / total_comissoes * 100, 2) if total_comissoes > 0 else None

    # Limitar 100%: um deputado pode participar de mais reunioes que o total global
    # (diferentes comissoes no mesmo dia) — isso e esperado; deixar ultrapassar 100 nao faz sentido
    if pct_plenario and pct_plenario > 100:
        pct_plenario = 100.0
    if pct_comissao and pct_comissao > 100:
        pct_comissao = 100.0

    return pct_plenario, pct_comissao, total_plenario, n_plenario


async def _liderancas_deputado(client: httpx.AsyncClient, id_externo: str) -> list[str]:
    """
    Retorna lista de cargos de lideranca via /deputados/{id}/orgaos.
    Filtros: cargos que indicam lideranca (Presidente, Vice, Lider, Coordenador).
    """
    data = await _get_camara(
        client,
        f"deputados/{id_externo}/orgaos",
        {"dataInicio": "2024-01-01", "dataFim": "2026-12-31", "itens": 50},
    )
    if not data or not data.get("dados"):
        return []

    CARGOS_LIDERANCA = {"Presidente", "Vice-Presidente", "Lider", "Vice-Lider",
                        "Coordenador", "Relator Geral", "Titular Representante"}
    cargos: list[str] = []
    for org in data["dados"]:
        titulo = org.get("titulo", "") or ""
        # Titulo contem o cargo no orgao
        for cargo_kw in CARGOS_LIDERANCA:
            if cargo_kw.lower() in titulo.lower():
                nome_orgao = org.get("nomeOrgao") or org.get("siglaOrgao") or ""
                descricao = f"{titulo} - {nome_orgao}" if nome_orgao else titulo
                if descricao not in cargos:
                    cargos.append(descricao[:200])
                break
    return cargos


# ── Camara: funcao principal ──────────────────────────────────────────────────

async def coletar_deputados_federais(ano_referencia: int = 2024) -> dict:
    """
    Percorre todos os mandatos CAMARA em mandatos_legislativo e preenche
    presenca_plenario_pct, presenca_comissoes_pct, cargos_lideranca,
    atividade_atualizada_em.

    Retorna dict com resumo: total, importados, skipped, sem_candidato_tse.
    """
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import text as sqlt

    resultado = {
        "total": 0,
        "importados": 0,
        "skipped": 0,
        "erros": [],
    }

    # 1. Buscar total de sessoes plenarias globais no ano (baseline)
    print(f"[Camara] Buscando totais globais de sessoes {ano_referencia}...", flush=True)
    async with httpx.AsyncClient() as client:
        total_plenario  = await _total_eventos_camara(client, 110, ano_referencia)
        total_comissoes = await _total_eventos_camara(client, 112, ano_referencia)

    print(f"[Camara] Sessoes plenarias globais: {total_plenario}", flush=True)
    print(f"[Camara] Reunioes comissoes globais: {total_comissoes}", flush=True)

    # 2. Buscar mandatos da Camara no banco
    async with AsyncSessionLocal() as db:
        res = await db.execute(sqlt("""
            SELECT id, id_externo, nome, candidato_id
            FROM mandatos_legislativo
            WHERE casa = 'CAMARA'
              AND ativo = true
            ORDER BY id
        """))
        mandatos = res.fetchall()

    resultado["total"] = len(mandatos)
    print(f"[Camara] {len(mandatos)} mandatos ativos encontrados", flush=True)

    # 3. Para cada mandato, coletar presenca e liderancas
    async with httpx.AsyncClient() as client:
        for i, mand in enumerate(mandatos, 1):
            mandato_id  = mand.id
            id_externo  = mand.id_externo
            nome        = mand.nome
            candidato_id = mand.candidato_id

            print(
                f"  [{i}/{len(mandatos)}] {nome} (ext={id_externo}, "
                f"cand={candidato_id or 'sem TSE'})...",
                end=" ", flush=True
            )

            try:
                pct_plen, pct_com, total_sess, n_presente = await _presenca_deputado(
                    client, id_externo, total_plenario, total_comissoes
                )
                await asyncio.sleep(PAUSE_S)

                cargos = await _liderancas_deputado(client, id_externo)
                await asyncio.sleep(PAUSE_S)

                # Gravar no banco
                async with AsyncSessionLocal() as db:
                    await db.execute(sqlt("""
                        UPDATE mandatos_legislativo SET
                            presenca_plenario_pct     = :pct_plen,
                            presenca_comissoes_pct    = :pct_com,
                            sessoes_plenario_total    = :total_sess,
                            sessoes_plenario_presente = :n_presente,
                            cargos_lideranca          = :cargos,
                            atividade_atualizada_em   = :ts
                        WHERE id = :mid
                    """), {
                        "pct_plen":   pct_plen,
                        "pct_com":    pct_com,
                        "total_sess": total_sess if total_sess > 0 else None,
                        "n_presente": n_presente if n_presente > 0 else None,
                        "cargos":     cargos if cargos else None,
                        "ts":         datetime.now(tz=timezone.utc),
                        "mid":        mandato_id,
                    })
                    await db.commit()

                resultado["importados"] += 1
                status = (
                    f"plenario={pct_plen}% comissoes={pct_com}% "
                    f"liderancas={len(cargos)}"
                )
                print(f"OK ({status})", flush=True)

            except Exception as e:
                resultado["skipped"] += 1
                msg = f"{nome}: {e}"
                resultado["erros"].append(msg)
                print(f"ERRO: {e}", flush=True)

    sem_candidato = sum(1 for m in mandatos if not m.candidato_id)
    resultado["sem_candidato_tse"] = sem_candidato
    print(
        f"\n[Camara] Concluido: {resultado['importados']} importados, "
        f"{resultado['skipped']} erros, {sem_candidato} sem candidato TSE",
        flush=True
    )
    return resultado


# ── Senado: presenca via votacoes ─────────────────────────────────────────────

async def _coletar_sessoes_senador(
    client: httpx.AsyncClient,
    codigo: str,
    ano: int,
) -> tuple[set[str], set[str]]:
    """
    Coleta dados BRUTOS de votacoes do senador no ano.

    Retorna dois sets:
      - sessoes_participou: CodigoSessao em que o senador aparece (qualquer voto)
      - sessoes_presente: CodigoSessao em que o voto NAO foi ausente

    Importante: nao calcula percentual aqui. O denominador correto eh o
    UNIVERSO de sessoes plenarias do ano, construido agregando os sets
    de todos os 81 senadores em coletar_senadores(). Assumindo que pelo
    menos 1 senador esteve em cada sessao realizada, essa uniao cobre o
    total real.

    Bug antigo (pre-24/04/2026): _presenca_senador usava o proprio set
    como denominador, resultando em 100% para qualquer senador. Fix:
    separar coleta de calculo.
    """
    data = await _get_senado(client, f"senador/{codigo}/votacoes")
    if not data:
        return set(), set()

    parl = data.get("VotacaoParlamentar", {}).get("Parlamentar", {})
    items = parl.get("Votacoes", {}).get("Votacao", [])
    if isinstance(items, dict):
        items = [items]

    sessoes_participou: set[str] = set()
    sessoes_presente:   set[str] = set()

    VOTOS_AUSENTE = {"A", "AJ", "L", "FL", "AN"}  # Ausente, Licenca, etc.

    for item in items:
        sessao_info = item.get("SessaoPlenaria", {})
        data_sessao = sessao_info.get("DataSessao", "")
        if not data_sessao.startswith(str(ano)):
            continue
        cod_sessao = sessao_info.get("CodigoSessao", "")
        if not cod_sessao:
            continue

        sessoes_participou.add(cod_sessao)
        sigla_voto = item.get("SiglaDescricaoVoto", "")
        # Qualquer voto que nao seja explicitamente ausente = presente
        if sigla_voto and sigla_voto.split("-")[0] not in VOTOS_AUSENTE:
            sessoes_presente.add(cod_sessao)

    return sessoes_participou, sessoes_presente


async def _liderancas_senador(client: httpx.AsyncClient, codigo: str, lista_data: dict) -> list[str]:
    """
    Extrai cargos de lideranca do senador.
    Usa dois campos da lista /senador/lista/atual:
      - MembroMesa     : membro da mesa do senado
      - MembroLideranca: lider/vice-lider de bloco/partido

    Tambem checa comissoes para cargo de presidente/vice.
    """
    cargos: list[str] = []

    id_p = lista_data.get("IdentificacaoParlamentar", {})

    # Membro da mesa
    mesa = id_p.get("MembroMesa")
    if mesa and isinstance(mesa, dict):
        cargo_mesa = mesa.get("DescricaoCargo") or mesa.get("Cargo")
        if cargo_mesa:
            cargos.append(f"Mesa do Senado: {cargo_mesa}"[:200])
    elif mesa and isinstance(mesa, str):
        cargos.append(f"Membro da Mesa do Senado"[:200])

    # Liderancas
    lideranca = id_p.get("MembroLideranca")
    if lideranca and isinstance(lideranca, dict):
        desc = lideranca.get("DescricaoLideranca") or lideranca.get("Lideranca")
        bloco = lideranca.get("NomeBloco") or lideranca.get("Bloco")
        if desc:
            texto = f"{desc} - {bloco}" if bloco else desc
            cargos.append(texto[:200])
    elif lideranca and isinstance(lideranca, list):
        for lid in lideranca:
            desc = lid.get("DescricaoLideranca") or lid.get("Lideranca") or ""
            bloco = lid.get("NomeBloco") or lid.get("Bloco") or ""
            if desc:
                texto = f"{desc} - {bloco}" if bloco else desc
                cargos.append(texto[:200])

    # Presidencias em comissoes (via endpoint comissoes)
    data_com = await _get_senado(client, f"senador/{codigo}/comissoes")
    if data_com:
        parl_com = data_com.get("MembroComissaoParlamentar", {}).get("Parlamentar", {})
        comissoes = parl_com.get("MembroComissoes", {}).get("Comissao", [])
        if isinstance(comissoes, dict):
            comissoes = [comissoes]
        for com in comissoes:
            participacao = com.get("DescricaoParticipacao", "")
            if "President" in participacao or "Vice-President" in participacao:
                nome_com = com.get("IdentificacaoComissao", {}).get("NomeComissao", "")
                sigla_com = com.get("IdentificacaoComissao", {}).get("SiglaComissao", "")
                id_com = nome_com or sigla_com
                if id_com:
                    texto = f"{participacao} - {id_com}"
                    if texto not in cargos:
                        cargos.append(texto[:200])

    return cargos


# ── Senado: funcao principal ──────────────────────────────────────────────────

async def coletar_senadores(ano_referencia: int = 2024) -> dict:
    """
    Percorre todos os mandatos SENADO em mandatos_legislativo e preenche
    presenca_plenario_pct, cargos_lideranca, atividade_atualizada_em.

    Para senadores, presenca_comissoes_pct fica None (API nao fornece dado
    de presenca em comissoes por parlamentar de forma direta).

    Retorna dict com resumo.
    """
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import text as sqlt

    resultado = {
        "total": 0,
        "importados": 0,
        "skipped": 0,
        "erros": [],
    }

    # 1. Buscar lista atual do senado (para MembroMesa + MembroLideranca)
    print("[Senado] Baixando lista atual de senadores...", flush=True)
    async with httpx.AsyncClient() as client:
        data_lista = await _get_senado(client, "senador/lista/atual")

    senadores_map: dict[str, dict] = {}  # codigo -> dados da lista
    if data_lista:
        itens = (
            data_lista.get("ListaParlamentarEmExercicio", {})
            .get("Parlamentares", {})
            .get("Parlamentar", [])
        )
        if isinstance(itens, dict):
            itens = [itens]
        for s in itens:
            id_p = s.get("IdentificacaoParlamentar", {})
            cod = str(id_p.get("CodigoParlamentar", ""))
            if cod:
                senadores_map[cod] = s

    print(f"[Senado] {len(senadores_map)} senadores na lista atual", flush=True)

    # 2. Buscar mandatos do Senado no banco
    async with AsyncSessionLocal() as db:
        res = await db.execute(sqlt("""
            SELECT id, id_externo, nome, candidato_id
            FROM mandatos_legislativo
            WHERE casa = 'SENADO'
              AND ativo = true
            ORDER BY id
        """))
        mandatos = res.fetchall()

    resultado["total"] = len(mandatos)
    print(f"[Senado] {len(mandatos)} mandatos ativos no banco", flush=True)

    # 3. PASSADA 1 - coletar dados brutos de cada senador (sem calcular %)
    #    O denominador correto so existe depois de agregar todos.
    print(f"[Senado] Passada 1/2: coletando votacoes de {len(mandatos)} senadores...", flush=True)

    dados_brutos: dict[int, dict] = {}
    universo_sessoes: set[str] = set()

    async with httpx.AsyncClient() as client:
        for i, mand in enumerate(mandatos, 1):
            mandato_id   = mand.id
            id_externo   = mand.id_externo
            nome         = mand.nome
            candidato_id = mand.candidato_id

            print(
                f"  [{i}/{len(mandatos)}] {nome} (ext={id_externo}, "
                f"cand={candidato_id or 'sem TSE'})...",
                end=" ", flush=True
            )

            lista_data = senadores_map.get(str(id_externo), {})

            try:
                sessoes_participou, sessoes_presente = await _coletar_sessoes_senador(
                    client, id_externo, ano_referencia
                )
                await asyncio.sleep(PAUSE_S)

                cargos = await _liderancas_senador(client, id_externo, lista_data)
                await asyncio.sleep(PAUSE_S)

                dados_brutos[mandato_id] = {
                    "id_externo":         id_externo,
                    "nome":               nome,
                    "candidato_id":       candidato_id,
                    "sessoes_participou": sessoes_participou,
                    "sessoes_presente":   sessoes_presente,
                    "cargos":             cargos,
                }
                universo_sessoes.update(sessoes_participou)

                print(
                    f"OK (participou={len(sessoes_participou)} "
                    f"presente={len(sessoes_presente)} liderancas={len(cargos)})",
                    flush=True,
                )

            except Exception as e:
                dados_brutos[mandato_id] = {"erro": str(e), "nome": nome}
                print(f"ERRO: {e}", flush=True)

    # 4. PASSADA 2 - calcular % usando o universo agregado como denominador
    total_ano = len(universo_sessoes)
    print(
        f"\n[Senado] Universo agregado de sessoes plenarias em {ano_referencia}: {total_ano}",
        flush=True,
    )
    print(f"[Senado] Passada 2/2: calculando % e persistindo...", flush=True)

    async with AsyncSessionLocal() as db:
        for mandato_id, dados in dados_brutos.items():
            if "erro" in dados:
                resultado["skipped"] += 1
                resultado["erros"].append(f"{dados['nome']}: {dados['erro']}")
                continue

            n_presente = len(dados["sessoes_presente"])
            pct_plen = round(n_presente / total_ano * 100, 2) if total_ano > 0 else None

            await db.execute(sqlt("""
                UPDATE mandatos_legislativo SET
                    presenca_plenario_pct     = :pct_plen,
                    presenca_comissoes_pct    = NULL,
                    sessoes_plenario_total    = :total_sess,
                    sessoes_plenario_presente = :n_presente,
                    cargos_lideranca          = :cargos,
                    atividade_atualizada_em   = :ts
                WHERE id = :mid
            """), {
                "pct_plen":   pct_plen,
                "total_sess": total_ano if total_ano > 0 else None,
                "n_presente": n_presente if n_presente > 0 else None,
                "cargos":     dados["cargos"] if dados["cargos"] else None,
                "ts":         datetime.now(tz=timezone.utc),
                "mid":        mandato_id,
            })
            resultado["importados"] += 1

        await db.commit()

    sem_candidato = sum(
        1 for d in dados_brutos.values() if d.get("candidato_id") is None
    )
    resultado["sem_candidato_tse"] = sem_candidato
    resultado["total_sessoes_ano"] = total_ano
    print(
        f"\n[Senado] Concluido: {resultado['importados']} importados, "
        f"{resultado['skipped']} erros, universo={total_ano} sessoes, "
        f"{sem_candidato} sem candidato TSE",
        flush=True,
    )
    return resultado
