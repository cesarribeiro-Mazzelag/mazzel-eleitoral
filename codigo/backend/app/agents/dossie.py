"""
Agente Dossiê — compila o DossiePolitico de um candidato.

SINGLE SOURCE OF TRUTH:
A função `compilar_dossie` é a única fonte de dados consolidados para o
endpoint /dossie/{id}, para a UI do ModalDossie e para o gerador de PDF.
Todos consomem o mesmo objeto Pydantic `DossiePolitico`.

Convenção de campos sem dados:
    bloco.disponivel = False  →  UI/PDF mostram "Dados não disponíveis ainda"
    score.X         = None    →  não entra na média do score.geral
"""
from __future__ import annotations

from typing import Iterable

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.dossie import (
    AtoExecutivo,
    CargoDisputado,
    CargoHistorico,
    CarreiraPublica,
    CartinhaPolitico,
    CicloAptidao,
    SancaoAdm,
    Classificacao,
    ComissaoAtual,
    Comparativos,
    Comportamento,
    ConcentracaoDoadores,
    Doador,
    DesempenhoEleitoral,
    DossiePolitico,
    EvolucaoVotos,
    Executivo,
    Financeiro,
    Identificacao,
    Inteligencia,
    Juridico,
    KpiHeader,
    Legislativo,
    OrigemRecursos,
    OverallV9,
    PerfilPolitico,
    ProjetoRef,
    RedesSociais,
    Reduto,
    RedutosEleitorais,
    Score,
    Trajetoria,
    ViceCandidato,
)
from app.services.dossie_ideologia import get_ideologia
from app.services.dossie_inteligencia import enriquecer_inteligencia


async def _calcular_bonus_recorde(
    db: AsyncSession,
    candidatura_id: int | None,
    cargo: str | None,
    ano: int | None,
    estado_uf: str | None,
) -> tuple[int, list[str]]:
    """Consulta mv_radar_politicos para verificar se este candidato e recordista.

    Retorna (pontos, traits):
    - #1 do Brasil no cargo+ano eleito: (+8, ["FENOMENO"])
    - #1 do estado no cargo+ano eleito: (+5, ["FERA_REGIONAL"])
    - Top 5 Brasil no cargo+ano eleito: (+3, [])
    - Demais: (0, [])

    Se qualquer parametro for None ou mv_radar_politicos nao tiver dados, retorna (0, []).
    """
    if not candidatura_id or not cargo or not ano:
        return (0, [])
    try:
        # #1 do Brasil no cargo+ano
        row_br = (await db.execute(text("""
            SELECT candidatura_id
            FROM mv_radar_politicos
            WHERE cargo = :cargo AND ano = :ano AND eleito = true
            ORDER BY votos_total DESC
            LIMIT 1
        """), {"cargo": cargo, "ano": ano})).fetchone()
        if row_br and row_br[0] == candidatura_id:
            return (8, ["FENOMENO"])

        # Top 5 Brasil (usado tanto pra FERA_REGIONAL quanto pra top5)
        rows_top5 = (await db.execute(text("""
            SELECT candidatura_id
            FROM mv_radar_politicos
            WHERE cargo = :cargo AND ano = :ano AND eleito = true
            ORDER BY votos_total DESC
            LIMIT 5
        """), {"cargo": cargo, "ano": ano})).fetchall()
        ids_top5 = [r[0] for r in rows_top5]

        # #1 do estado no cargo+ano
        if estado_uf:
            row_uf = (await db.execute(text("""
                SELECT candidatura_id
                FROM mv_radar_politicos
                WHERE cargo = :cargo AND ano = :ano AND estado_uf = :uf AND eleito = true
                ORDER BY votos_total DESC
                LIMIT 1
            """), {"cargo": cargo, "ano": ano, "uf": estado_uf})).fetchone()
            if row_uf and row_uf[0] == candidatura_id:
                return (5, ["FERA_REGIONAL"])

        if candidatura_id in ids_top5:
            return (3, [])

        return (0, [])
    except Exception:
        # Se mv nao existir ou qualquer erro, nao bloqueia o dossie
        return (0, [])


# ── Helpers pre-computados (movidos do frontend) ─────────────────────────────

_CARGOS_EXECUTIVOS = {
    "PRESIDENTE", "GOVERNADOR", "PREFEITO",
    "VICE-PRESIDENTE", "VICE-GOVERNADOR", "VICE-PREFEITO",
}


def _calcular_overall_v9(fifa) -> OverallV9 | None:
    """
    Mapeia as 8 dimensoes FIFA (atributos_6) para as 6 dimensoes v9 do Card.
    Mapeamento: ATV<-EFI, LEG<-ART, BSE<-VOT, INF<-FID, MID<-POT, PAC<-TER.
    Retorna None se o objeto fifa nao tem nenhuma dimensao preenchida.
    """
    if fifa is None:
        return None
    atv = fifa.eficiencia
    leg = fifa.articulacao
    bse = fifa.votacao
    inf = fifa.fidelidade
    mid = fifa.potencial
    pac = fifa.territorial
    if all(v is None for v in [atv, leg, bse, inf, mid, pac]):
        return None
    return OverallV9(ATV=atv, LEG=leg, BSE=bse, INF=inf, MID=mid, PAC=pac)


def _derivar_arquetipos(fifa) -> list[str]:
    """
    Deriva arquetipos politicos a partir do OverallFifa.
    Logica espelha deriveArchetypes do frontend, consolidada no backend.
    """
    if fifa is None:
        return []
    arquetipos: list[str] = []
    vot = fifa.votacao or 0
    art = fifa.articulacao or 0
    fid = fifa.fidelidade or 0
    ter = fifa.territorial or 0
    efi = fifa.eficiencia or 0
    pot = fifa.potencial or 0
    tier = (fifa.tier or "").lower()

    # Fenomeno: grande massa eleitoral OU tier dourado
    if vot >= 85 or tier == "dourado":
        arquetipos.append("fenomeno")
    # Trabalhador: articulacao + integridade (entrega silenciosa)
    if art >= 75 and fid >= 70:
        arquetipos.append("trabalhador")
    # Articulador: articulacao + fidelidade (maquina politica)
    if art >= 70 and fid >= 75 and "trabalhador" not in arquetipos:
        arquetipos.append("articulador")
    # Chefe de base: capilaridade territorial + fidelidade
    if ter >= 75 and fid >= 65:
        arquetipos.append("chefe_de_base")
    # Tecnico-legislador: articulacao + eficiencia (especialista produtivo)
    if art >= 70 and efi >= 70:
        arquetipos.append("tecnico")
    # Potencial em ascensao: potencial alto sem ainda ter vot alto
    if pot >= 80 and vot < 70:
        arquetipos.append("promessa")
    return arquetipos


def _build_bio_curta(bio_resumida: str | None, max_len: int = 180) -> str | None:
    """Trunca bio_resumida em max_len caracteres, cortando na ultima palavra completa."""
    if not bio_resumida:
        return None
    bio = bio_resumida.strip()
    if len(bio) <= max_len:
        return bio
    truncada = bio[:max_len].rsplit(" ", 1)[0]
    return truncada.rstrip(".,;:") + "..."


def _build_kpis_header(ultima, legislativo, executivo_block) -> list[KpiHeader]:
    """
    Retorna lista de KPIs para o header do dossie, variando conforme cargo.
    - Cargo executivo: Mandatos, MPs/Decretos, PL executivos
    - Cargo legislativo: Mandatos, PL aprovados, PL apresentados
    """
    if not ultima:
        return []

    cargo = (ultima.cargo or "").upper()
    is_executivo = cargo in _CARGOS_EXECUTIVOS

    # Contar mandatos (candidaturas eleitas)
    mandatos_v = str(getattr(ultima, "_mandatos_total", None) or "")
    # Se nao tiver campo pre-calculado, nao podemos calcular aqui (sem acesso a candidaturas)
    # O chamador deve passar o valor. Por ora retornamos com None.

    if is_executivo:
        n_mps = executivo_block.n_medidas_provisorias if executivo_block and executivo_block.disponivel else None
        n_decretos = executivo_block.n_decretos if executivo_block and executivo_block.disponivel else None
        n_pls = executivo_block.n_pls_enviados if executivo_block and executivo_block.disponivel else None
        mps_dec = None
        if n_mps is not None and n_decretos is not None:
            mps_dec = str(n_mps + n_decretos)
        elif n_mps is not None:
            mps_dec = str(n_mps)
        elif n_decretos is not None:
            mps_dec = str(n_decretos)
        return [
            KpiHeader(k="MPs / Decretos", v=mps_dec),
            KpiHeader(k="PLs enviados", v=str(n_pls) if n_pls is not None else None),
        ]
    else:
        # Legislativo
        aprovados = legislativo.projetos_aprovados if legislativo and legislativo.disponivel else None
        apresentados = legislativo.projetos_apresentados if legislativo and legislativo.disponivel else None
        return [
            KpiHeader(k="PL aprovados", v=str(aprovados) if aprovados is not None else None),
            KpiHeader(k="PL apresentados", v=str(apresentados) if apresentados is not None else None),
        ]


def _build_cartinha(
    cand,
    ultima,
    overall_v9: OverallV9 | None,
    fifa,
) -> CartinhaPolitico | None:
    """Monta o shape completo CartinhaPolitico para consumo direto pelo Card V2/V8."""
    if cand is None:
        return None
    nome = getattr(cand, "nome_completo", None) or getattr(cand, "nome", None)
    partido_sigla = getattr(ultima, "partido_sigla", None) if ultima else None
    estado_uf = getattr(ultima, "estado_uf", None) if ultima else None
    foto_url = getattr(cand, "foto_url", None)
    overall = fifa.overall if fifa else None
    tier = fifa.tier if fifa else None
    traits = list(fifa.traits) if fifa and fifa.traits else []
    # Votos do ciclo ativo (melhor turno)
    votos_total = _votos_melhor_turno(ultima) if ultima else None
    ano = int(ultima.ano) if ultima and ultima.ano else None
    return CartinhaPolitico(
        nome=nome,
        partido_sigla=partido_sigla,
        estado_uf=estado_uf,
        foto_url=foto_url,
        overall=overall,
        overall_v9=overall_v9,
        votos_total=votos_total,
        ano=ano,
        tier=tier,
        traits=traits,
    )


# ── Constantes de domínio ────────────────────────────────────────────────────

# Cargos exibidos na trajetória principal (exclui suplentes/vice/etc).
_CARGOS_PRINCIPAIS = {
    "PRESIDENTE", "GOVERNADOR", "SENADOR", "DEPUTADO FEDERAL",
    "DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL", "PREFEITO", "VEREADOR",
}

# Cargos com escopo MUNICIPAL → votos agregados por zona eleitoral
_CARGO_MUNICIPIO = {"VEREADOR", "PREFEITO"}
# Cargos com escopo ESTADUAL → votos agregados por município
_CARGO_ESTADUAL = {
    "DEPUTADO ESTADUAL", "DEPUTADO FEDERAL", "GOVERNADOR", "DEPUTADO DISTRITAL",
}
# Cargos com escopo NACIONAL → votos agregados por estado
_CARGO_NACIONAL = {"SENADOR", "PRESIDENTE"}


# ── Função principal ─────────────────────────────────────────────────────────

async def compilar_dossie(
    db: AsyncSession,
    candidato_id: int,
    ano_ciclo: int | None = None,
    _skip_overall_ultimo: bool = False,
) -> DossiePolitico:
    """
    Compila o DossiePolitico completo a partir dos dados publicos do TSE.

    ano_ciclo: quando passado, os blocos Financeiro, Desempenho, Mapa e Overall
    usam a candidatura daquele ano como base (em vez da mais recente).
    A trajetoria sempre retorna TODAS as candidaturas.

    _skip_overall_ultimo: flag interna para evitar recursao ao computar
    `overall_ultimo_ciclo` (chamada recursiva com ano_ciclo=None).
    """
    cand = await _fetch_candidato(db, candidato_id)
    if cand is None:
        raise ValueError(f"Candidato {candidato_id} não encontrado.")

    candidaturas = await _fetch_candidaturas(db, candidato_id)
    candidaturas_ord = [c for c in candidaturas if c.cargo in _CARGOS_PRINCIPAIS]
    # Juridico considera TODAS as candidaturas (inclusive vice e suplente),
    # pois ficha_limpa eh registrada por candidatura independente do cargo.
    candidaturas_todas_juridico = candidaturas

    # Selecionar candidatura base: ciclo especifico ou mais recente
    if ano_ciclo and candidaturas_ord:
        candidatura_ciclo = next((c for c in candidaturas_ord if c.ano == ano_ciclo), None)
        ultima = candidatura_ciclo or candidaturas_ord[0]
    else:
        ultima = candidaturas_ord[0] if candidaturas_ord else None

    # Votos regionais da candidatura selecionada (semantica varia por cargo)
    votos_regionais = await _fetch_votos_regionais(db, ultima)

    # Benchmark financeiro da candidatura selecionada
    cpv_benchmark = await _build_cpv_benchmark(db, ultima)

    # Comparativos (ranking + mediana de votos vs pares) da candidatura selecionada
    comparativos = await _build_comparativos(db, ultima)

    # Juridico (ficha_limpa + historico + sancoes CGU/TCU)
    # Usa TODAS as candidaturas (inclui vice/suplente) para historico de aptidao
    juridico = await _build_juridico(db, candidato_id, ultima, candidaturas_todas_juridico)

    # Legislativo (mandato ativo)
    legislativo = await _build_legislativo(db, candidato_id)

    # Executivo (Presidente/Governador) - 18/04/2026
    executivo = await _build_executivo(db, candidato_id)

    # Carreira no setor publico (executivo/comissionado)
    carreira_publica = await _build_carreira_publica(db, candidato_id)

    # Detalhes financeiros da candidatura selecionada
    detalhes_financeiros = await _build_financeiro_detalhes(db, ultima)

    # Filtrar candidaturas para financeiro:
    # Se ano_ciclo especificado, usar so a candidatura daquele ano
    # Senao, usar todas (comportamento financeiro legado)
    candidaturas_para_blocos = [ultima] if (ano_ciclo and ultima) else candidaturas_ord

    # Desempenho eleitoral SEMPRE reflete o ciclo ativo (mesmo sem ano explicito).
    # Regioes fortes/fracas ja vem do ciclo ativo via `votos_regionais`.
    candidaturas_ciclo = [ultima] if ultima else []

    # Ciclos disponiveis para o seletor
    ciclos = sorted(set(c.ano for c in candidaturas_ord), reverse=True)

    dossie = DossiePolitico(
        identificacao=_build_identificacao(cand),
        perfil_politico=_build_perfil_politico(candidaturas_ord),
        trajetoria=_build_trajetoria(candidaturas_ord),  # sempre TODAS
        desempenho_eleitoral=_build_desempenho(
            candidaturas_ciclo=candidaturas_ciclo,
            candidaturas_todas=candidaturas_ord,
            votos_regionais=votos_regionais,
            ultima=ultima,
        ),
        comparativos=comparativos,
        redutos_eleitorais=_build_redutos(votos_regionais, ultima),
        financeiro=_build_financeiro(
            candidaturas_para_blocos,
            cpv_benchmark=cpv_benchmark,
            detalhes=detalhes_financeiros,
        ),
        legislativo=legislativo,
        executivo=executivo,
        carreira_publica=carreira_publica,
        redes_sociais=_build_redes_sociais(cand),
        juridico=juridico,
        inteligencia=Inteligencia(),
        ano_ciclo_ativo=ultima.ano if ultima else None,
        ciclos_disponiveis=ciclos,
    )

    # Buscar complexidade territorial conforme o nivel do cargo:
    # Quanto maior o cargo, maior a complexidade do territorio que governa.
    # - Vereador/Prefeito: PIB e populacao do MUNICIPIO
    # - Dep. Estadual/Governador/Dep. Federal/Senador: PIB e populacao do ESTADO
    # - Presidente: PIB e populacao do BRASIL (bonus maximo - cargo mais complexo)
    complexidade_territorial = None
    if ultima:
        cargo_upper = (ultima.cargo or "").upper()
        if cargo_upper in ("VEREADOR", "PREFEITO") and ultima.municipio_id:
            row = await db.execute(text("""
                SELECT pib_per_capita, populacao FROM municipios WHERE id = :mid
            """), {"mid": ultima.municipio_id})
            mun = row.fetchone()
            if mun and mun.pib_per_capita and mun.populacao:
                complexidade_territorial = {
                    "pib_per_capita": float(mun.pib_per_capita),
                    "populacao": int(mun.populacao),
                }
        elif cargo_upper in ("DEPUTADO ESTADUAL", "GOVERNADOR", "DEPUTADO FEDERAL",
                             "DEPUTADO DISTRITAL", "SENADOR") and ultima.estado_uf:
            row = await db.execute(text("""
                SELECT
                    SUM(populacao * pib_per_capita) / NULLIF(SUM(populacao), 0) AS pib_per_capita,
                    SUM(populacao) AS populacao
                FROM municipios
                WHERE estado_uf = :uf AND populacao > 0
            """), {"uf": ultima.estado_uf})
            est = row.fetchone()
            if est and est.pib_per_capita and est.populacao:
                complexidade_territorial = {
                    "pib_per_capita": float(est.pib_per_capita),
                    "populacao": int(est.populacao),
                }
        elif cargo_upper == "PRESIDENTE":
            # Brasil inteiro - bonus maximo
            row = await db.execute(text("""
                SELECT
                    SUM(populacao * pib_per_capita) / NULLIF(SUM(populacao), 0) AS pib_per_capita,
                    SUM(populacao) AS populacao
                FROM municipios
                WHERE populacao > 0
            """))
            br = row.fetchone()
            if br and br.pib_per_capita and br.populacao:
                complexidade_territorial = {
                    "pib_per_capita": float(br.pib_per_capita),
                    "populacao": int(br.populacao),
                }

    # Overall regional do PARTIDO no escopo correspondente ao cargo do candidato.
    # Bonus de liga: cargos municipais e estaduais/federais usam o Overall
    # ESTADUAL do partido (nivel UF). Presidente usa o nacional. Nacional e a
    # juncao macro dos estaduais. Municipal foi removido (dados voltateis).
    partido_overall = None
    partido_sigla = None
    if ultima and getattr(ultima, "partido_id", None):
        try:
            from app.radar.overall_partido import calcular_overall_partido
            cargo_upper = (ultima.cargo or "").upper()
            if cargo_upper == "PRESIDENTE":
                escopo, escopo_uf = "nacional", None
            elif ultima.estado_uf:
                escopo, escopo_uf = "estadual", ultima.estado_uf
            else:
                escopo, escopo_uf = "nacional", None

            partido_fifa = await calcular_overall_partido(
                db=db,
                partido_id=ultima.partido_id,
                ano=int(ultima.ano),
                escopo=escopo,
                escopo_uf=escopo_uf,
            )
            partido_overall = partido_fifa.overall
            partido_sigla = getattr(ultima, "partido_sigla", None)
        except Exception:
            partido_overall = None

    # Recorde eleitoral: #1 do Brasil/estado ou top 5 ganha bonus no overall
    bonus_recorde = await _calcular_bonus_recorde(
        db,
        candidatura_id=ultima.candidatura_id if ultima else None,
        cargo=ultima.cargo if ultima else None,
        ano=ultima.ano if ultima else None,
        estado_uf=ultima.estado_uf if ultima else None,
    )

    # Enriquecimento da inteligencia (scores, alertas, classificacao, resumo)
    dossie = enriquecer_inteligencia(
        dossie,
        complexidade_municipal=complexidade_territorial,
        partido_overall=partido_overall,
        partido_sigla=partido_sigla,
        bonus_recorde=bonus_recorde,
    )

    # ── Campos pre-computados para o frontend ────────────────────────────
    # overall_v9: mapeamento das 8 dimensoes FIFA -> 6 dimensoes v9 do Card
    fifa = dossie.inteligencia.overall_fifa
    v9 = _calcular_overall_v9(fifa)
    dossie.inteligencia.overall_v9 = v9

    # arquetipos: lista de arquetipos politicos derivados do overall_fifa
    dossie.inteligencia.arquetipos = _derivar_arquetipos(fifa)

    # bio_curta: max 180 chars truncados na ultima palavra completa
    bio_longa = dossie.identificacao.bio_resumida
    dossie.identificacao.bio_curta = _build_bio_curta(bio_longa)

    # kpis_header: KPIs do header variando por tipo de cargo (executivo vs legislativo)
    dossie.kpis_header = _build_kpis_header(ultima, legislativo, executivo)

    # cartinha: shape completo para o Card V2/V8
    dossie.cartinha = _build_cartinha(cand, ultima, v9, fifa)

    # Overall fixo do ultimo ciclo disponivel (para badge na foto do hero).
    # Sem recompilar se ja estamos no ultimo ciclo OU se foi chamada recursiva.
    if _skip_overall_ultimo or not ciclos:
        dossie.overall_ultimo_ciclo = dossie.inteligencia.overall_fifa.overall
    elif ano_ciclo and ano_ciclo != ciclos[0]:
        # Compila o dossie do ultimo ciclo apenas para capturar o overall
        ultimo_dossie = await compilar_dossie(
            db, candidato_id, ano_ciclo=None, _skip_overall_ultimo=True
        )
        dossie.overall_ultimo_ciclo = ultimo_dossie.inteligencia.overall_fifa.overall
    else:
        # ano_ciclo == ciclos[0] ou ano_ciclo is None -> ja e o ultimo
        dossie.overall_ultimo_ciclo = dossie.inteligencia.overall_fifa.overall

    return dossie


def _build_redes_sociais(cand) -> RedesSociais:
    """Popula redes sociais do row de candidatos. disponivel=True se algum handle."""
    ig = getattr(cand, "instagram", None)
    tw = getattr(cand, "twitter", None)
    fb = getattr(cand, "facebook", None)
    tk = getattr(cand, "tiktok", None)
    yt = getattr(cand, "youtube", None)
    ws = getattr(cand, "website", None)
    tem_algum = any([ig, tw, fb, tk, yt, ws])
    return RedesSociais(
        instagram=ig, twitter=tw, facebook=fb, tiktok=tk,
        youtube=yt, website=ws, disponivel=tem_algum,
    )


async def _build_juridico(db: AsyncSession, candidato_id: int, ultima, candidaturas_todas) -> Juridico:
    """
    Bloco Juridico:
      - ficha_limpa do ciclo ativo + historico de aptidao
      - sancoes administrativas CGU (CEIS, CEAF) - integrado 16/04/2026
    """
    historico = [
        CicloAptidao(
            ano=int(c.ano),
            cargo=c.cargo,
            ficha_limpa=bool(c.ficha_limpa) if c.ficha_limpa is not None else None,
        )
        for c in candidaturas_todas
    ]
    ciclos_inapto = sum(1 for c in historico if c.ficha_limpa is False)
    fl_atual = bool(ultima.ficha_limpa) if ultima and ultima.ficha_limpa is not None else None

    # Sancoes administrativas (unifica por nome_completo - mesmo politico com
    # candidato_ids duplicados no TSE)
    res = await db.execute(text("""
        WITH ids_unificados AS (
            SELECT DISTINCT c2.id
            FROM candidatos c1
            JOIN candidatos c2 ON c2.nome_completo = c1.nome_completo
            WHERE c1.id = :cid
              AND c1.nome_completo IS NOT NULL
              AND c1.nome_completo != ''
        )
        SELECT DISTINCT ON (fonte, id_externo)
               fonte, tipo_sancao, orgao_sancionador, data_inicio, data_fim,
               ativa, link_publicacao
        FROM sancoes_administrativas
        WHERE candidato_id IN (SELECT id FROM ids_unificados)
        ORDER BY fonte, id_externo, data_inicio DESC NULLS LAST
    """), {"cid": candidato_id})
    sancoes = [
        SancaoAdm(
            fonte=r.fonte,
            tipo_sancao=r.tipo_sancao,
            orgao_sancionador=r.orgao_sancionador,
            data_inicio=r.data_inicio.isoformat() if r.data_inicio else None,
            data_fim=r.data_fim.isoformat() if r.data_fim else None,
            ativa=r.ativa,
            link_publicacao=r.link_publicacao,
        )
        for r in res.fetchall()
    ]
    sancoes_ativas = sum(1 for s in sancoes if s.ativa)

    tem_algum_dado = (
        fl_atual is not None
        or any(c.ficha_limpa is not None for c in historico)
        or len(sancoes) > 0
    )

    return Juridico(
        ficha_limpa=fl_atual,
        historico_aptidao=historico,
        ciclos_inapto=ciclos_inapto,
        sancoes=sancoes,
        sancoes_ativas=sancoes_ativas,
        disponivel=tem_algum_dado,
    )


def _votos_melhor_turno(ca) -> int:
    """
    Retorna votos da candidatura usando o MELHOR turno, nao a soma bugada.
    Prioridade: votos_2t (se passou pro 2T) > votos_1t > votos_total (fallback).

    NOTA: candidaturas.votos_total soma 1T+2T (bug conhecido). Nao usar
    diretamente em comparativos/ranking — compara coisas incompativeis.
    """
    v2 = getattr(ca, "votos_2t", None) or 0
    if v2 > 0:
        return int(v2)
    v1 = getattr(ca, "votos_1t", None) or 0
    if v1 > 0:
        return int(v1)
    return int(getattr(ca, "votos_total", 0) or 0)


# SQL fragment para expressao "melhor turno" em queries brutas
_SQL_VOTOS_MELHOR_TURNO = (
    "(CASE WHEN COALESCE(votos_2t,0) > 0 THEN votos_2t "
    "WHEN COALESCE(votos_1t,0) > 0 THEN votos_1t "
    "ELSE COALESCE(votos_total,0) END)"
)


_CARGOS_COM_CHAPA = {
    "PRESIDENTE":     "VICE-PRESIDENTE",
    "GOVERNADOR":     "VICE-GOVERNADOR",
    "PREFEITO":       "VICE-PREFEITO",
    "VICE-PRESIDENTE":"PRESIDENTE",
    "VICE-GOVERNADOR":"GOVERNADOR",
    "VICE-PREFEITO":  "PREFEITO",
}


async def _build_chapa(db: AsyncSession, ultima) -> tuple[ViceCandidato | None, ViceCandidato | None]:
    """Busca o companheiro de chapa (vice quando titular; titular quando vice).

    Chapa e identificada por ano + escopo (municipio_id/estado_uf) + numero_candidato
    (mesmo numero da chapa no TSE).

    Returns: (vice, titular) - um dos dois vem preenchido dependendo do cargo atual.
    """
    if not ultima or not ultima.cargo or not ultima.numero_candidato:
        return None, None
    cargo = ultima.cargo.upper()
    cargo_par = _CARGOS_COM_CHAPA.get(cargo)
    if not cargo_par:
        return None, None

    params = {
        "ano": int(ultima.ano),
        "numero": ultima.numero_candidato,
        "cargo_par": cargo_par,
    }
    if ultima.municipio_id is not None:
        where_escopo = "can.municipio_id = :mid"
        params["mid"] = ultima.municipio_id
    elif cargo_par == "PRESIDENTE" or cargo == "PRESIDENTE":
        where_escopo = "can.municipio_id IS NULL"
    else:
        where_escopo = "can.municipio_id IS NULL AND can.estado_uf = :uf"
        params["uf"] = ultima.estado_uf

    row = (await db.execute(text(f"""
        SELECT c.id, c.nome_completo, c.nome_urna, c.foto_url,
               p.sigla AS partido_sigla, can.cargo
        FROM candidaturas can
        JOIN candidatos c ON c.id = can.candidato_id
        JOIN partidos p   ON p.id = can.partido_id
        WHERE can.ano = :ano
          AND can.numero_candidato = :numero
          AND UPPER(can.cargo) = :cargo_par
          AND {where_escopo}
        ORDER BY can.votos_total DESC NULLS LAST
        LIMIT 1
    """), params)).mappings().first()

    if not row:
        return None, None

    chapa = ViceCandidato(
        candidato_id=row["id"],
        nome=row["nome_completo"],
        nome_urna=row["nome_urna"],
        partido_sigla=row["partido_sigla"],
        cargo=row["cargo"],
        foto_url=row["foto_url"],
    )
    # Se o candidato atual e titular, o companheiro e o vice. E vice-versa.
    if cargo.startswith("VICE"):
        return None, chapa  # candidato e vice -> chapa e o titular
    return chapa, None      # candidato e titular -> chapa e o vice


async def _build_comparativos(db: AsyncSession, ultima) -> Comparativos:
    """
    Compara o candidato contra os pares da MESMA disputa:
      - Cargos municipais (PREFEITO/VEREADOR/VICE-PREFEITO): mesmo municipio
      - Cargos estaduais/federais: mesma UF
      - Presidente: nacional (mesmo ano)

    Votos usam MELHOR TURNO (ignora soma bugada de votos_total). Mediana e
    ranking aplicam mesma regra — comparacao apples-to-apples.
    """
    if ultima is None or not ultima.cargo or not ultima.estado_uf or not ultima.ano:
        return Comparativos()

    votos = _votos_melhor_turno(ultima)
    cargo = ultima.cargo.upper()

    # Define escopo da comparacao por cargo
    cargos_municipais = {"PREFEITO", "VEREADOR", "VICE-PREFEITO"}
    escopo_municipal = cargo in cargos_municipais and ultima.municipio_id is not None
    municipio_nome = getattr(ultima, "municipio_nome", None) if escopo_municipal else None

    if cargo == "PRESIDENTE":
        escopo_label = "nacional"
    elif escopo_municipal:
        escopo_label = "municipal"
    else:
        escopo_label = "estadual"

    if votos <= 0:
        return Comparativos(
            cargo=ultima.cargo,
            estado_uf=ultima.estado_uf,
            municipio=municipio_nome,
            escopo=escopo_label,
            ano=int(ultima.ano),
            votos_candidato=0,
        )

    params: dict = {
        "cargo": cargo,
        "ano": int(ultima.ano),
        "v": votos,
    }

    if escopo_municipal:
        params["mid"] = ultima.municipio_id
        where_pares = (
            "UPPER(cargo) = :cargo AND ano = :ano "
            "AND municipio_id = :mid"
        )
    else:
        params["uf"] = ultima.estado_uf
        where_pares = (
            "UPPER(cargo) = :cargo AND ano = :ano "
            "AND estado_uf = :uf"
        )

    # Mediana + contagem ad-hoc (considera melhor turno por candidatura)
    row_bench = (await db.execute(
        text(f"""
            SELECT
              COUNT(*) FILTER (WHERE {_SQL_VOTOS_MELHOR_TURNO} > 0) AS n_candidaturas,
              percentile_cont(0.5) WITHIN GROUP (
                ORDER BY {_SQL_VOTOS_MELHOR_TURNO}
              ) FILTER (WHERE {_SQL_VOTOS_MELHOR_TURNO} > 0) AS votos_mediana
            FROM candidaturas
            WHERE {where_pares}
        """),
        params,
    )).mappings().first()

    total = int(row_bench["n_candidaturas"]) if row_bench and row_bench.get("n_candidaturas") else 0
    mediana = int(row_bench["votos_mediana"]) if row_bench and row_bench.get("votos_mediana") else None

    if total < 3:
        return Comparativos(
            cargo=ultima.cargo,
            estado_uf=ultima.estado_uf,
            municipio=municipio_nome,
            escopo=escopo_label,
            ano=int(ultima.ano),
            votos_candidato=votos,
            votos_mediana_pares=mediana,
            total_candidatos=total,
            disponivel=False,
        )

    # Ranking: quantas candidaturas tem mais votos (melhor turno) no mesmo par
    row_rank = (await db.execute(
        text(f"""
            SELECT COUNT(*)::int AS n_mais
            FROM candidaturas
            WHERE {where_pares}
              AND {_SQL_VOTOS_MELHOR_TURNO} > :v
        """),
        params,
    )).mappings().first()
    posicao = int(row_rank["n_mais"]) + 1 if row_rank else None
    percentil = round(100 * (total - posicao) / total, 1) if (posicao and total) else None

    # ── Linha de corte (politica, nao estatistica) ──────────────────────────
    # Vagas do cargo = COUNT(eleito=true) no mesmo recorte.
    # Ultimo eleito = menor votacao entre os eleitos (corte).
    # Primeiro nao eleito = maior votacao entre os nao eleitos (quem ficou de fora).
    row_corte = (await db.execute(
        text(f"""
            SELECT
              COUNT(*) FILTER (WHERE eleito = true)::int AS vagas,
              MIN({_SQL_VOTOS_MELHOR_TURNO}) FILTER (WHERE eleito = true) AS corte_eleito,
              MAX({_SQL_VOTOS_MELHOR_TURNO}) FILTER (
                WHERE eleito = false AND {_SQL_VOTOS_MELHOR_TURNO} > 0
              ) AS top_nao_eleito
            FROM candidaturas
            WHERE {where_pares}
        """),
        params,
    )).mappings().first()

    vagas = int(row_corte["vagas"]) if row_corte and row_corte.get("vagas") else 0
    votos_ult_eleito = int(row_corte["corte_eleito"]) if row_corte and row_corte.get("corte_eleito") is not None else None
    votos_primeiro_nao = int(row_corte["top_nao_eleito"]) if row_corte and row_corte.get("top_nao_eleito") is not None else None

    foi_eleito = bool(getattr(ultima, "eleito", False))
    # Folga = diferenca em relacao ao corte
    #  - Se foi eleito: votos - corte (positivo = margem acima do corte)
    #  - Se nao foi eleito: votos - corte (negativo = quanto faltou pra entrar)
    folga = None
    if votos_ult_eleito is not None:
        folga = votos - votos_ult_eleito

    # Cargos majoritarios: se nao venceu, buscar quem venceu pra
    # contextualizar a derrota. Query limpa (nao reaproveita where_pares).
    majoritarios = {"PRESIDENTE", "GOVERNADOR", "PREFEITO", "SENADOR"}
    vencedor_nome = None
    votos_vencedor = None
    if cargo in majoritarios and not foi_eleito and vagas and vagas >= 1:
        if escopo_municipal:
            sql_vcd = f"""
                SELECT c.nome_completo, c.nome_urna,
                       {_SQL_VOTOS_MELHOR_TURNO} AS votos_v
                FROM candidaturas
                JOIN candidatos c ON c.id = candidaturas.candidato_id
                WHERE UPPER(cargo) = :cargo AND ano = :ano
                  AND municipio_id = :mid
                  AND eleito = true
                ORDER BY {_SQL_VOTOS_MELHOR_TURNO} DESC
                LIMIT 1
            """
        else:
            sql_vcd = f"""
                SELECT c.nome_completo, c.nome_urna,
                       {_SQL_VOTOS_MELHOR_TURNO} AS votos_v
                FROM candidaturas
                JOIN candidatos c ON c.id = candidaturas.candidato_id
                WHERE UPPER(cargo) = :cargo AND ano = :ano
                  AND estado_uf = :uf
                  AND eleito = true
                ORDER BY {_SQL_VOTOS_MELHOR_TURNO} DESC
                LIMIT 1
            """
        row_vcd = (await db.execute(text(sql_vcd), params)).mappings().first()
        if row_vcd:
            vencedor_nome = row_vcd.get("nome_urna") or row_vcd.get("nome_completo")
            votos_vencedor = int(row_vcd.get("votos_v") or 0)

    # ── Proporcionais: Quociente Eleitoral + piso individual + colocacao no partido ──
    # Regras do TSE (Lei 4.737/1965 + Lei 13.165/2015):
    #   QE = votos validos / vagas
    #   Partido so elege se atingir QE (soma dos votos nominais dos seus candidatos)
    #   Candidato precisa ter >= 10% do QE em votos proprios
    # Federacoes: nao modeladas no schema - tratamos partido isolado (honesto pra UB
    # 2024 que nao esta em federacao, aproximacao pra outros).
    proporcionais = {"VEREADOR", "DEPUTADO ESTADUAL", "DEPUTADO FEDERAL", "DEPUTADO DISTRITAL"}
    eh_proporcional = cargo in proporcionais
    quociente_eleitoral = None
    votos_validos_cargo = None
    votos_partido = None
    partido_atingiu_qe = None
    piso_individual = None
    atingiu_piso_individual = None
    colocacao_no_partido = None
    total_candidatos_partido = None
    partido_sigla = None
    partido_id = getattr(ultima, "partido_id", None)

    if eh_proporcional and vagas and vagas > 0 and partido_id:
        # Votos validos do cargo = soma dos votos nominais de todas as candidaturas
        # (aproximacao: despreza voto de legenda, que no sistema atual e pouco relevante)
        row_qe = (await db.execute(
            text(f"""
                SELECT COALESCE(SUM({_SQL_VOTOS_MELHOR_TURNO}), 0)::bigint AS soma
                FROM candidaturas
                WHERE {where_pares}
            """),
            params,
        )).mappings().first()
        votos_validos_cargo = int(row_qe["soma"]) if row_qe else 0
        if votos_validos_cargo > 0:
            quociente_eleitoral = votos_validos_cargo // vagas
            piso_individual = max(1, quociente_eleitoral // 10)
            atingiu_piso_individual = votos >= piso_individual

        # Votos do partido = soma nominal dos candidatos do mesmo partido no cargo
        params_p = {**params, "pid": partido_id}
        row_partido = (await db.execute(
            text(f"""
                SELECT
                  COALESCE(SUM({_SQL_VOTOS_MELHOR_TURNO}), 0)::bigint AS votos_p,
                  COUNT(*)::int AS total_p,
                  COUNT(*) FILTER (WHERE {_SQL_VOTOS_MELHOR_TURNO} > :v)::int AS mais_votados_p
                FROM candidaturas
                WHERE {where_pares}
                  AND partido_id = :pid
            """),
            params_p,
        )).mappings().first()
        if row_partido:
            votos_partido = int(row_partido["votos_p"])
            total_candidatos_partido = int(row_partido["total_p"])
            colocacao_no_partido = int(row_partido["mais_votados_p"]) + 1
            if quociente_eleitoral is not None:
                partido_atingiu_qe = votos_partido >= quociente_eleitoral

        # Sigla do partido pra UI
        row_sigla = (await db.execute(
            text("SELECT sigla FROM partidos WHERE id = :pid"),
            {"pid": partido_id},
        )).mappings().first()
        if row_sigla:
            partido_sigla = row_sigla["sigla"]

    vice, titular_chapa = await _build_chapa(db, ultima)

    return Comparativos(
        cargo=ultima.cargo,
        estado_uf=ultima.estado_uf,
        municipio=municipio_nome,
        escopo=escopo_label,
        ano=int(ultima.ano),
        votos_candidato=votos,
        posicao_ranking=posicao,
        total_candidatos=total,
        vagas_cargo=vagas or None,
        foi_eleito=foi_eleito,
        votos_ultimo_eleito=votos_ult_eleito,
        votos_primeiro_nao_eleito=votos_primeiro_nao,
        folga_votos=folga,
        vencedor_nome=vencedor_nome,
        votos_vencedor=votos_vencedor,
        eh_proporcional=eh_proporcional,
        partido_sigla=partido_sigla,
        quociente_eleitoral=quociente_eleitoral,
        votos_validos_cargo=votos_validos_cargo,
        votos_partido=votos_partido,
        partido_atingiu_qe=partido_atingiu_qe,
        piso_individual=piso_individual,
        atingiu_piso_individual=atingiu_piso_individual,
        colocacao_no_partido=colocacao_no_partido,
        total_candidatos_partido=total_candidatos_partido,
        votos_mediana_pares=mediana,
        percentil=percentil,
        vice=vice,
        titular=titular_chapa,
        disponivel=True,
    )


def _build_redutos(votos_regionais: list[dict], ultima) -> RedutosEleitorais:
    """
    Top 5 redutos + bottom 3 fracos + analise de concentracao territorial.
    Granularidade varia por cargo (zona/municipio/UF).
    """
    if not votos_regionais or ultima is None:
        return RedutosEleitorais()

    cargo = (ultima.cargo or "").upper()
    if cargo in _CARGO_MUNICIPIO:
        tipo = "zona"
    elif cargo in _CARGO_NACIONAL:
        tipo = "uf"
    else:
        tipo = "municipio"

    com_voto = [r for r in votos_regionais if (r.get("votos") or 0) > 0]
    total = sum(int(r["votos"]) for r in com_voto)
    if total <= 0:
        return RedutosEleitorais(tipo=tipo, total_votos_ciclo=0)

    # Top 5 fortes
    top5 = com_voto[:5]
    redutos = [
        Reduto(
            label=r["label"],
            votos=int(r["votos"]),
            pct_do_total=(int(r["votos"]) / total) if total else 0.0,
        )
        for r in top5
    ]

    # Bottom 3 fracos (com voto > 0, mostra regioes onde teve pior performance)
    # So mostra se tem >= 6 regioes no total (senao nao faz sentido dividir)
    redutos_fracos: list[Reduto] = []
    if len(com_voto) >= 6:
        bottom3 = com_voto[-3:]
        redutos_fracos = [
            Reduto(
                label=r["label"],
                votos=int(r["votos"]),
                pct_do_total=(int(r["votos"]) / total) if total else 0.0,
            )
            for r in bottom3
        ]

    # Concentracao: top 3 em % do total
    top3_votos = sum(int(r["votos"]) for r in com_voto[:3])
    concentracao = (top3_votos / total * 100) if total else 0
    if concentracao >= 60:
        perfil = "concentrado"
    elif concentracao >= 30:
        perfil = "equilibrado"
    else:
        perfil = "disperso"

    return RedutosEleitorais(
        tipo=tipo,
        total_votos_ciclo=total,
        redutos=redutos,
        redutos_fracos=redutos_fracos,
        concentracao_top3_pct=round(concentracao, 1),
        perfil_territorial=perfil,
        total_regioes_com_voto=len(com_voto),
        disponivel=len(redutos) > 0,
    )


async def _build_cpv_benchmark(db: AsyncSession, ultima):
    """
    Busca o `CustoPorVotoBenchmark` para a candidatura mais recente do
    político. Retorna None quando faltam dados (ou benchmark insuficiente).
    """
    if ultima is None or not ultima.cargo or not ultima.estado_uf or not ultima.ano:
        return None
    from app.radar.indicadores.financeiro import (
        buscar_benchmark_cpv,
        montar_cpv_benchmark,
    )
    bench = await buscar_benchmark_cpv(
        db,
        cargo=ultima.cargo.upper(),
        estado_uf=ultima.estado_uf,
        ano=int(ultima.ano),
    )
    return montar_cpv_benchmark(
        despesa_candidato=ultima.despesa_campanha,
        votos_candidato=ultima.votos_total,
        bench=bench,
    )


# ── Queries SQL ──────────────────────────────────────────────────────────────

async def _fetch_candidato(db: AsyncSession, candidato_id: int):
    result = await db.execute(text("""
        SELECT
            c.id, c.nome_completo, c.nome_urna, c.foto_url,
            c.genero, c.data_nascimento, c.grau_instrucao,
            c.ocupacao, c.estado_nascimento_uf, c.naturalidade,
            c.bio_resumida, c.wikipedia_url,
            c.instagram, c.twitter, c.facebook, c.tiktok, c.youtube, c.website
        FROM candidatos c
        WHERE c.id = :cid
    """), {"cid": candidato_id})
    return result.fetchone()


async def _fetch_candidaturas(db: AsyncSession, candidato_id: int):
    """
    Todas as candidaturas do politico em ordem cronologica decrescente.

    IMPORTANTE: o TSE cria candidato_ids diferentes para a mesma pessoa
    em ciclos eleitorais distintos. Para unificar, buscamos por
    nome_completo de todos os candidato_ids com o mesmo nome.

    Deduplicacao de 2o turno: para cada (nome, cargo, municipio, ano),
    consolida os registros (o marcador ELEITO com 0 votos + o registro
    real com votos) num unico resultado.
    """
    result = await db.execute(text("""
        WITH
        -- Encontrar todos os candidato_ids com o mesmo nome_completo
        ids_unificados AS (
            SELECT DISTINCT c2.id
            FROM candidatos c1
            JOIN candidatos c2 ON c2.nome_completo = c1.nome_completo
            WHERE c1.id = :cid
              AND c1.nome_completo IS NOT NULL
              AND c1.nome_completo != ''
        ),
        -- Deduplicar 2o turno: para cada (cargo, municipio, ano),
        -- consolida num unico registro
        candidaturas_dedup AS (
            SELECT
                (ARRAY_AGG(ca.id ORDER BY ca.votos_total DESC NULLS LAST))[1] AS candidatura_id,
                ca.ano,
                UPPER(ca.cargo) AS cargo,
                ca.estado_uf,
                ca.municipio_id,
                (ARRAY_AGG(ca.numero_candidato ORDER BY ca.votos_total DESC NULLS LAST))[1] AS numero_candidato,
                MAX(COALESCE(ca.votos_total, 0)) AS votos_total,
                (ARRAY_AGG(ca.situacao_final ORDER BY ca.eleito DESC, ca.votos_total DESC NULLS LAST))[1] AS situacao_final,
                BOOL_OR(ca.eleito) AS eleito,
                MAX(ca.despesa_campanha) AS despesa_campanha,
                MAX(ca.receita_campanha) AS receita_campanha,
                (ARRAY_AGG(ca.partido_id ORDER BY ca.votos_total DESC NULLS LAST))[1] AS partido_id,
                BOOL_OR(UPPER(COALESCE(ca.situacao_final, '')) = '2º TURNO' OR COALESCE(ca.votos_2t, 0) > 0) AS disputou_segundo_turno,
                BOOL_AND(COALESCE(ca.ficha_limpa, TRUE)) FILTER (WHERE ca.ficha_limpa IS NOT NULL) AS ficha_limpa,
                MAX(ca.votos_1t) AS votos_1t,
                MAX(ca.votos_2t) AS votos_2t
            FROM candidaturas ca
            WHERE ca.candidato_id IN (SELECT id FROM ids_unificados)
            GROUP BY ca.ano, UPPER(ca.cargo), ca.estado_uf, ca.municipio_id
        )
        SELECT
            cd.candidatura_id,
            cd.ano,
            cd.cargo,
            cd.estado_uf,
            cd.municipio_id,
            cd.numero_candidato,
            cd.votos_total,
            cd.situacao_final,
            cd.eleito,
            cd.despesa_campanha,
            cd.receita_campanha,
            cd.disputou_segundo_turno,
            cd.ficha_limpa,
            cd.votos_1t,
            cd.votos_2t,
            cd.partido_id      AS partido_id,
            p.sigla            AS partido_sigla,
            p.numero           AS partido_numero,
            m.nome             AS municipio_nome,
            m.codigo_ibge      AS municipio_ibge
        FROM candidaturas_dedup cd
        JOIN partidos p ON p.id = cd.partido_id
        LEFT JOIN municipios m ON m.id = cd.municipio_id
        ORDER BY cd.ano DESC, cd.cargo
    """), {"cid": candidato_id})
    return result.fetchall()


async def _fetch_votos_regionais(db: AsyncSession, ultima) -> list[dict]:
    """
    Retorna até 30 regiões com mais votos do candidato na última candidatura.
    A região é zona eleitoral / município / estado conforme o cargo.

    Retorna lista de `{ "label": str, "votos": int }`.
    """
    if ultima is None or ultima.candidatura_id is None:
        return []

    cargo = (ultima.cargo or "").upper()
    cid = ultima.candidatura_id

    if cargo in _CARGO_MUNICIPIO:
        rows = await db.execute(text("""
            SELECT
                ze.numero    AS nr_zona,
                ze.descricao AS bairro,
                m.nome       AS municipio,
                SUM(vpz.qt_votos) AS votos
            FROM votos_por_zona vpz
            JOIN zonas_eleitorais ze ON ze.id = vpz.zona_id
            JOIN municipios m        ON m.id  = vpz.municipio_id
            WHERE vpz.candidatura_id = :cid
            GROUP BY ze.id, ze.numero, ze.descricao, m.nome
            ORDER BY votos DESC
            LIMIT 30
        """), {"cid": cid})
        return [
            {
                "label": (
                    f"{r.bairro} — Z{r.nr_zona}"
                    if r.bairro else f"Zona {r.nr_zona}"
                ),
                "votos": int(r.votos or 0),
            }
            for r in rows.fetchall()
        ]

    if cargo in _CARGO_ESTADUAL:
        rows = await db.execute(text("""
            SELECT m.nome AS municipio, SUM(vpz.qt_votos) AS votos
            FROM votos_por_zona vpz
            JOIN municipios m ON m.id = vpz.municipio_id
            WHERE vpz.candidatura_id = :cid
            GROUP BY m.id, m.nome
            ORDER BY votos DESC
            LIMIT 30
        """), {"cid": cid})
        return [
            {"label": r.municipio, "votos": int(r.votos or 0)}
            for r in rows.fetchall()
        ]

    if cargo in _CARGO_NACIONAL:
        rows = await db.execute(text("""
            SELECT m.estado_uf, SUM(vpz.qt_votos) AS votos
            FROM votos_por_zona vpz
            JOIN municipios m ON m.id = vpz.municipio_id
            WHERE vpz.candidatura_id = :cid
            GROUP BY m.estado_uf
            ORDER BY votos DESC
        """), {"cid": cid})
        return [
            {"label": r.estado_uf, "votos": int(r.votos or 0)}
            for r in rows.fetchall()
        ]

    return []


# ── Builders dos blocos do schema ────────────────────────────────────────────

def _build_identificacao(cand) -> Identificacao:
    from datetime import date
    idade = None
    if cand.data_nascimento:
        try:
            hoje = date.today()
            nasc = cand.data_nascimento
            idade = hoje.year - nasc.year - ((hoje.month, hoje.day) < (nasc.month, nasc.day))
        except Exception:
            pass
    return Identificacao(
        id=cand.id,
        nome=cand.nome_completo,
        nome_urna=cand.nome_urna,
        foto_url=cand.foto_url,
        genero=cand.genero,
        idade=idade,
        grau_instrucao=cand.grau_instrucao,
        ocupacao=cand.ocupacao,
        estado_nascimento=cand.estado_nascimento_uf,
        naturalidade=cand.naturalidade,
        bio_resumida=getattr(cand, "bio_resumida", None),
        wikipedia_url=getattr(cand, "wikipedia_url", None),
    )


def _build_perfil_politico(candidaturas) -> PerfilPolitico:
    """
    partido_atual           = sigla da candidatura mais recente
    historico_partidos      = siglas únicas em ordem cronológica (mais antigo→mais novo)
    ideologia_aproximada    = lookup na tabela estática (estimativa do PARTIDO)
    alinhamento_partido     = None (sem dados legislativos)
    """
    if not candidaturas:
        return PerfilPolitico(disponivel=False)

    # Sigla atual: do mais recente
    partido_atual = candidaturas[0].partido_sigla
    partido_atual_num = candidaturas[0].partido_numero

    # Histórico ordenado do mais antigo para o mais recente, sem repetições
    # consecutivas (dedup adjacente — preserva troca de partido como evento).
    siglas_historico: list[str] = []
    for c in reversed(candidaturas):
        sig = c.partido_sigla
        if not sig:
            continue
        if not siglas_historico or siglas_historico[-1] != sig:
            siglas_historico.append(sig)

    return PerfilPolitico(
        partido_atual=partido_atual,
        historico_partidos=siglas_historico,
        ideologia_aproximada=get_ideologia(partido_atual_num),
        alinhamento_partido=None,  # requer dados legislativos — Fase futura
    )


def _build_trajetoria(candidaturas) -> Trajetoria:
    cargos: list[CargoDisputado] = []
    for c in candidaturas:
        cargos.append(CargoDisputado(
            candidatura_id=c.candidatura_id,
            ano=c.ano,
            cargo=c.cargo,
            resultado=_classificar_resultado(c),
            votos=int(c.votos_total or 0),
            votos_1t=int(c.votos_1t) if c.votos_1t is not None else None,
            votos_2t=int(c.votos_2t) if c.votos_2t is not None else None,
            disputou_segundo_turno=bool(c.disputou_segundo_turno),
            partido=c.partido_sigla,
            partido_numero=c.partido_numero,
            municipio=c.municipio_nome,
            estado_uf=c.estado_uf,
        ))
    return Trajetoria(cargos_disputados=cargos)


def _classificar_resultado(c) -> str:
    """ELEITO / NAO_ELEITO / SUPLENTE — derivado de `eleito` e `situacao_final`."""
    if c.eleito:
        return "ELEITO"
    sit = (c.situacao_final or "").upper()
    if "SUPLENTE" in sit:
        return "SUPLENTE"
    return "NAO_ELEITO"


def _build_desempenho(
    candidaturas_ciclo,
    candidaturas_todas,
    votos_regionais: list[dict],
    ultima,
) -> DesempenhoEleitoral:
    """
    Card Desempenho Eleitoral reflete sempre o CICLO ATIVO.
    - total_votos = soma dos votos da candidatura do ciclo ativo (pode ter 1T+2T)
    - votos_carreira = soma de TODAS as candidaturas (referencia secundaria)
    - evolucao_votos = TODAS as candidaturas (gráfico histórico)
    - regioes_* = regioes da candidatura do ciclo ativo (já vem filtrado via votos_regionais)
    """
    def _votos_da_candidatura(c) -> int:
        """
        Quando houve 2T, conta apenas o 2T (1T e 2T sao eleicoes distintas -
        somar dobraria os mesmos eleitores). Sem 2T, usa votos_total.
        """
        disputou_2t = getattr(c, "disputou_segundo_turno", False)
        v2 = getattr(c, "votos_2t", None)
        if disputou_2t and v2:
            return int(v2)
        return int(c.votos_total or 0)

    total_ciclo = sum(_votos_da_candidatura(c) for c in candidaturas_ciclo)
    votos_carreira = sum(_votos_da_candidatura(c) for c in candidaturas_todas)

    evolucao = [
        EvolucaoVotos(
            ano=c.ano,
            votos=int(c.votos_total or 0),
            cargo=c.cargo,
        )
        for c in reversed(candidaturas_todas)  # cronológico crescente
        if c.votos_total
    ]

    com_votos = [v for v in votos_regionais if v.get("votos", 0) > 0]
    regioes_fortes = [v["label"] for v in com_votos[:3]]
    regioes_fracas = (
        [v["label"] for v in reversed(com_votos[-3:])]
        if len(com_votos) >= 6 else []
    )

    return DesempenhoEleitoral(
        ciclo_cargo=ultima.cargo if ultima else None,
        ciclo_ano=int(ultima.ano) if ultima else None,
        ciclo_uf=ultima.estado_uf if ultima else None,
        ciclo_municipio=ultima.municipio_nome if ultima else None,
        total_votos=total_ciclo,
        votos_carreira=votos_carreira,
        evolucao_votos=evolucao,
        regioes_fortes=regioes_fortes,
        regioes_fracas=regioes_fracas,
        disponivel=bool(candidaturas_todas),
    )


def _build_financeiro(candidaturas, *, cpv_benchmark=None, detalhes=None) -> Financeiro:
    """
    Soma receita/despesa de TODAS as candidaturas e plugga:
      - benchmark CPV (Fase 2)
      - detalhes da prestação de contas detalhada (Caminho B):
        origem_recursos, concentracao, principais_doadores

    `detalhes` é um dict com chaves opcionais ou None se a candidatura
    mais recente não foi processada pelo ETL 12.
    """
    total_arrecadado = _somar_opt(c.receita_campanha for c in candidaturas)
    total_gasto = _somar_opt(c.despesa_campanha for c in candidaturas)
    disponivel_basico = total_arrecadado is not None or total_gasto is not None

    origem = None
    concentracao = None
    principais_doadores: list[Doador] = []
    doadores_disponiveis = False

    if detalhes:
        # Origem de recursos — só popular se ao menos uma fonte for não-None
        op = detalhes.get("origem")
        if op and any(op.values()):
            origem = OrigemRecursos(
                fundo_partidario_pct=op.get("fundo_partidario"),
                fundo_eleitoral_pct=op.get("fundo_eleitoral"),
                doacao_privada_pct=op.get("doacao_privada"),
                recursos_proprios_pct=op.get("recursos_proprios"),
                outros_pct=op.get("outros"),
            )
        # Concentração
        cc = detalhes.get("concentracao")
        if cc and (cc.get("top1_pct") is not None or cc.get("n_doadores")):
            concentracao = ConcentracaoDoadores(
                top1_pct=cc.get("top1_pct"),
                top5_pct=cc.get("top5_pct"),
                top10_pct=cc.get("top10_pct"),
                n_doadores=cc.get("n_doadores"),
            )
        # Top doadores
        for d in detalhes.get("top_doadores") or []:
            try:
                principais_doadores.append(Doador(nome=str(d["nome"]), valor=float(d["valor"])))
            except (KeyError, TypeError, ValueError):
                continue
        if principais_doadores or origem or concentracao:
            doadores_disponiveis = True

    return Financeiro(
        total_arrecadado=total_arrecadado,
        total_gasto=total_gasto,
        principais_doadores=principais_doadores,
        # Campo legado: usar top5_pct para retro-compat
        concentracao_doadores=(concentracao.top5_pct if concentracao else None),
        # Campos novos:
        origem_recursos=origem,
        concentracao=concentracao,
        cpv_benchmark=cpv_benchmark,
        disponivel=disponivel_basico,
        doadores_disponiveis=doadores_disponiveis,
    )


async def _build_financeiro_detalhes(db: AsyncSession, ultima) -> dict | None:
    """
    Lê a tabela `prestacao_resumo_candidato` para a candidatura mais recente.
    Devolve dict com chaves {origem, concentracao, top_doadores} ou None.
    """
    if ultima is None or ultima.candidatura_id is None:
        return None

    res = await db.execute(text("""
        SELECT
            fundo_partidario_pct, fundo_eleitoral_pct, doacao_privada_pct,
            recursos_proprios_pct, outros_pct,
            top1_pct, top5_pct, top10_pct, n_doadores, top_doadores
        FROM prestacao_resumo_candidato
        WHERE candidatura_id = :cid
        LIMIT 1
    """), {"cid": ultima.candidatura_id})
    row = res.fetchone()
    if not row:
        return None

    return {
        "origem": {
            "fundo_partidario":  row.fundo_partidario_pct,
            "fundo_eleitoral":   row.fundo_eleitoral_pct,
            "doacao_privada":    row.doacao_privada_pct,
            "recursos_proprios": row.recursos_proprios_pct,
            "outros":            row.outros_pct,
        },
        "concentracao": {
            "top1_pct":   row.top1_pct,
            "top5_pct":   row.top5_pct,
            "top10_pct":  row.top10_pct,
            "n_doadores": row.n_doadores,
        },
        "top_doadores": row.top_doadores or [],
    }


def _somar_opt(valores: Iterable) -> float | None:
    """Soma valores não-nulos. Retorna None se nenhum valor presente."""
    total = 0.0
    encontrou = False
    for v in valores:
        if v is None:
            continue
        try:
            total += float(v)
            encontrou = True
        except (TypeError, ValueError):
            continue
    return total if encontrou else None


# ── M10 Fase 3 — Bloco Legislativo (Câmara + Senado) ────────────────────────

async def _build_legislativo(db: AsyncSession, candidato_id: int) -> Legislativo:
    """
    Bloco Legislativo do Dossiê Político.

    Consulta `mandatos_legislativo` (matched via candidato_id) e
    `proposicoes_legislativo`. Devolve `disponivel=False` quando o candidato
    não tem mandato federal ativo (caso da maioria).

    Quando há mandato:
      - projetos_apresentados = total de proposições autoradas
      - projetos_aprovados    = total com aprovada=true
      - alinhamento_votacoes  = None (Fase 3.5 - precisa de votações por proposição)
      - temas_atuacao         = top 5 temas mais frequentes (deduplicado)
    """
    res = await db.execute(text("""
        WITH ids_unificados AS (
            SELECT DISTINCT c2.id
            FROM candidatos c1
            JOIN candidatos c2 ON c2.nome_completo = c1.nome_completo
            WHERE c1.id = :cid
              AND c1.nome_completo IS NOT NULL
              AND c1.nome_completo != ''
        )
        SELECT
            m.id,
            m.casa,
            m.uf,
            m.partido_sigla,
            m.legislatura,
            m.situacao,
            m.condicao_eleitoral,
            m.licenciado_para,
            m.presenca_plenario_pct,
            m.presenca_comissoes_pct,
            m.sessoes_plenario_total,
            m.sessoes_plenario_presente,
            m.cargos_lideranca,
            COUNT(p.id)                                         AS n_propostas,
            COUNT(p.id) FILTER (WHERE p.aprovada=true)          AS n_aprovadas,
            COUNT(p.id) FILTER (WHERE p.aprovada IS NULL)       AS n_tramitando,
            COUNT(p.id) FILTER (WHERE p.aprovada=false)         AS n_vetadas,
            ARRAY_AGG(DISTINCT p.tema) FILTER (WHERE p.tema IS NOT NULL) AS temas
        FROM mandatos_legislativo m
        LEFT JOIN proposicoes_legislativo p ON p.mandato_id = m.id
        WHERE m.candidato_id IN (SELECT id FROM ids_unificados)
        GROUP BY m.id, m.casa, m.uf, m.partido_sigla, m.legislatura,
                 m.situacao, m.condicao_eleitoral, m.licenciado_para,
                 m.presenca_plenario_pct, m.presenca_comissoes_pct,
                 m.sessoes_plenario_total, m.sessoes_plenario_presente,
                 m.cargos_lideranca
        ORDER BY m.ativo DESC NULLS LAST, m.id DESC
        LIMIT 1
    """), {"cid": candidato_id})
    row = res.fetchone()
    if not row:
        return Legislativo()  # disponivel=False por default

    temas = list(row.temas) if row.temas else []
    casa = row.casa.name if hasattr(row.casa, "name") else str(row.casa)
    cargo_titulo = (
        "Deputado Federal" if casa == "CAMARA"
        else "Senador" if casa == "SENADO"
        else "Vereador" if casa == "CAMARA_MUNICIPAL"
        else "Parlamentar"
    )
    # Legislaturas da Camara Federal: 56=2019-2023, 57=2023-2027...
    # Camara Municipal SP nao tem legislatura populada no nosso ETL ainda.
    periodo = None
    if row.legislatura and casa == "CAMARA":
        base = 2019 + (int(row.legislatura) - 56) * 4
        periodo = f"{base}-{base + 4}"

    # Listar ate 5 projetos mais recentes por categoria.
    # ETL SP gravou URLs no campo `ementa`; outros ETLs gravam texto real.
    # Separa: se comeca com http, vai pra `url`; caso contrario, vira ementa texto.
    async def _listar(filtro_where: str) -> list[ProjetoRef]:
        res = await db.execute(text(f"""
            SELECT sigla_tipo, numero, ano, situacao, ementa
            FROM proposicoes_legislativo
            WHERE mandato_id = :mid {filtro_where}
            ORDER BY ano DESC NULLS LAST, numero DESC NULLS LAST
            LIMIT 5
        """), {"mid": row.id})
        out: list[ProjetoRef] = []
        for r in res.fetchall():
            raw = r.ementa or ""
            eh_url = raw.startswith("http")
            out.append(ProjetoRef(
                sigla_tipo=r.sigla_tipo, numero=r.numero or 0, ano=r.ano or 0,
                situacao=r.situacao,
                ementa=None if eh_url else (raw[:300] or None),
                url=raw if eh_url else None,
            ))
        return out

    ultimas_aprovadas = await _listar("AND aprovada = true")
    ultimas_tramitando = await _listar("AND aprovada IS NULL")
    ultimas_vetadas = await _listar("AND aprovada = false")

    # Comissoes - historico + ativas (sem data_fim OR data_fim no futuro)
    res_com = await db.execute(text("""
        SELECT sigla_comissao, nome_comissao, cargo, sigla_casa,
               data_inicio, data_fim,
               (data_fim IS NULL OR data_fim >= CURRENT_DATE) AS ativa
        FROM comissoes_parlamentar
        WHERE mandato_id = :mid
        ORDER BY (data_fim IS NULL OR data_fim >= CURRENT_DATE) DESC,
                 data_inicio DESC NULLS LAST
        LIMIT 50
    """), {"mid": row.id})
    comissoes_rows = res_com.fetchall()
    comissoes_atuais = [
        ComissaoAtual(
            sigla=r.sigla_comissao,
            nome=r.nome_comissao,
            cargo=r.cargo,
            sigla_casa=r.sigla_casa,
            data_inicio=r.data_inicio.isoformat() if r.data_inicio else None,
            data_fim=r.data_fim.isoformat() if r.data_fim else None,
            ativa=bool(r.ativa),
        )
        for r in comissoes_rows if r.ativa
    ]
    n_comissoes_historico = len(comissoes_rows)
    presidencias = [
        r.nome_comissao or r.sigla_comissao or ""
        for r in comissoes_rows
        if r.ativa and (r.cargo or "").lower().startswith("presidente")
    ]

    # Relatorias (materias onde o parlamentar foi designado relator)
    res_rel = await db.execute(text("""
        SELECT sigla_tipo, numero, ano, situacao, comissao_relatoria, ementa
        FROM proposicoes_legislativo
        WHERE relator_mandato_id = :mid
        ORDER BY data_designacao_relator DESC NULLS LAST, ano DESC NULLS LAST
        LIMIT 5
    """), {"mid": row.id})
    relatorias_rows = res_rel.fetchall()
    relatorias_recentes = []
    for r in relatorias_rows:
        raw = r.ementa or ""
        eh_url = raw.startswith("http")
        relatorias_recentes.append(ProjetoRef(
            sigla_tipo=r.sigla_tipo,
            numero=r.numero or 0,
            ano=r.ano or 0,
            situacao=r.situacao or r.comissao_relatoria,
            ementa=None if eh_url else (raw[:300] or None),
            url=raw if eh_url else None,
        ))
    n_relatorias_row = await db.execute(text("""
        SELECT COUNT(*) AS n FROM proposicoes_legislativo
        WHERE relator_mandato_id = :mid
    """), {"mid": row.id})
    n_relatorias = int(n_relatorias_row.scalar() or 0)

    # Normalizar cargos_lideranca (pode vir como lista ou None do PostgreSQL ARRAY)
    cargos_lideranca_raw = row.cargos_lideranca
    if cargos_lideranca_raw:
        cargos_lideranca_list = list(cargos_lideranca_raw)
    else:
        cargos_lideranca_list = []

    return Legislativo(
        casa=casa,
        cargo_titulo=cargo_titulo,
        uf=row.uf,
        partido_sigla=row.partido_sigla,
        legislatura=int(row.legislatura) if row.legislatura else None,
        periodo_legislatura=periodo,
        situacao=row.situacao,
        condicao_eleitoral=row.condicao_eleitoral,
        licenciado_para=row.licenciado_para,
        projetos_apresentados=int(row.n_propostas) if row.n_propostas else 0,
        projetos_aprovados=int(row.n_aprovadas) if row.n_aprovadas else 0,
        projetos_em_tramitacao=int(row.n_tramitando) if row.n_tramitando else 0,
        projetos_vetados=int(row.n_vetadas) if row.n_vetadas else 0,
        ultimas_aprovadas=ultimas_aprovadas,
        ultimas_em_tramitacao=ultimas_tramitando,
        ultimas_vetadas=ultimas_vetadas,
        alinhamento_votacoes=None,
        temas_atuacao=temas[:5],
        comissoes_atuais=comissoes_atuais,
        n_comissoes_historico=n_comissoes_historico,
        presidencias=presidencias,
        n_relatorias=n_relatorias,
        relatorias_recentes=relatorias_recentes,
        # Sub-medidas de presenca + lideranca (ETL 23/04/2026)
        presenca_plenario_pct=float(row.presenca_plenario_pct) if row.presenca_plenario_pct is not None else None,
        presenca_comissoes_pct=float(row.presenca_comissoes_pct) if row.presenca_comissoes_pct is not None else None,
        sessoes_plenario_total=int(row.sessoes_plenario_total) if row.sessoes_plenario_total is not None else None,
        sessoes_plenario_presente=int(row.sessoes_plenario_presente) if row.sessoes_plenario_presente is not None else None,
        cargos_lideranca=cargos_lideranca_list,
        disponivel=True,
    )


# ── Executivo (Presidente, Governador) ──────────────────────────────────────

async def _build_executivo(db: AsyncSession, candidato_id: int) -> Executivo:
    """Retorna atividade do politico quando ele exerceu cargo executivo
    (Presidente, Governador). Busca mandato vinculado via candidato_id
    ou nome_completo.
    """
    res = await db.execute(text("""
        WITH ids_unificados AS (
            SELECT DISTINCT c2.id
            FROM candidatos c1
            JOIN candidatos c2 ON c2.nome_completo = c1.nome_completo
            WHERE c1.id = :cid
              AND c1.nome_completo IS NOT NULL
              AND c1.nome_completo != ''
        ),
        candidato_nomes AS (
            SELECT DISTINCT UPPER(unaccent(nome_completo)) AS n
            FROM candidatos
            WHERE id IN (SELECT id FROM ids_unificados)
              AND nome_completo IS NOT NULL
        )
        SELECT m.id, m.cargo::text AS cargo, m.nome, m.nome_completo,
               m.partido_sigla, m.uf, m.ano_inicio, m.ano_fim
        FROM mandatos_executivo m
        WHERE m.candidato_id IN (SELECT id FROM ids_unificados)
           OR UPPER(unaccent(m.nome_completo)) IN (SELECT n FROM candidato_nomes)
        ORDER BY m.ano_inicio DESC
        LIMIT 1
    """), {"cid": candidato_id})
    row = res.fetchone()
    if not row:
        return Executivo()

    # Agregar contadores por tipo
    res_cnt = await db.execute(text("""
        SELECT
            tipo::text AS tipo,
            COUNT(*) AS n,
            COUNT(*) FILTER (WHERE aprovada = true) AS n_aprov,
            COUNT(*) FILTER (WHERE aprovada = false) AS n_rej
        FROM atos_executivo
        WHERE mandato_id = :mid
        GROUP BY tipo
    """), {"mid": row.id})
    tot = {r.tipo: {"n": int(r.n), "aprov": int(r.n_aprov or 0), "rej": int(r.n_rej or 0)}
           for r in res_cnt.fetchall()}

    # Split MP status: aprovada / rejeitada_stricta / caducou / sem_info
    # "Perdeu Eficácia" conta como caducou, nao como rejeitada.
    res_mp = await db.execute(text("""
        SELECT
            COUNT(*) AS n,
            COUNT(*) FILTER (WHERE aprovada = true) AS aprov,
            COUNT(*) FILTER (
                WHERE aprovada = false AND (
                    LOWER(situacao) LIKE '%perdeu a eficacia%'
                    OR LOWER(situacao) LIKE '%perdeu a eficácia%'
                    OR LOWER(situacao) LIKE '%caduc%'
                )
            ) AS caducou,
            COUNT(*) FILTER (
                WHERE aprovada = false AND NOT (
                    LOWER(situacao) LIKE '%perdeu a eficacia%'
                    OR LOWER(situacao) LIKE '%perdeu a eficácia%'
                    OR LOWER(situacao) LIKE '%caduc%'
                )
            ) AS rejeitada
        FROM atos_executivo
        WHERE mandato_id = :mid AND tipo = 'MP'
    """), {"mid": row.id})
    mp_stats = res_mp.mappings().first() or {}
    n_mp = int(mp_stats.get("n") or 0)
    n_mp_aprov = int(mp_stats.get("aprov") or 0)
    n_mp_caducou = int(mp_stats.get("caducou") or 0)
    n_mp_rej = int(mp_stats.get("rejeitada") or 0)
    # Taxa de aprovacao: so calcula quando temos amostra conhecida
    n_conhecidas = n_mp_aprov + n_mp_rej + n_mp_caducou
    taxa_mp = (n_mp_aprov / n_conhecidas * 100) if n_conhecidas > 0 else None

    n_pl = tot.get("PL_EXECUTIVO", {}).get("n", 0)
    n_plp = tot.get("PLP_EXECUTIVO", {}).get("n", 0)
    n_pec = tot.get("PEC_EXECUTIVO", {}).get("n", 0)
    n_veto = tot.get("VETO", {}).get("n", 0)
    n_decreto = tot.get("DECRETO", {}).get("n", 0)
    total_atos = sum(v["n"] for v in tot.values())

    # Ultimas MPs + PLs (5 cada)
    async def _listar_atos(tipo: str) -> list[AtoExecutivo]:
        res = await db.execute(text("""
            SELECT tipo::text AS tipo, numero, ano, ementa, situacao, aprovada,
                   data_apresentacao
            FROM atos_executivo
            WHERE mandato_id = :mid AND tipo = :tipo
            ORDER BY data_apresentacao DESC NULLS LAST, ano DESC NULLS LAST
            LIMIT 5
        """), {"mid": row.id, "tipo": tipo})
        return [
            AtoExecutivo(
                tipo=r.tipo,
                numero=r.numero,
                ano=r.ano,
                ementa=(r.ementa or "")[:300] or None,
                situacao=r.situacao,
                aprovada=r.aprovada,
                data_apresentacao=r.data_apresentacao.isoformat() if r.data_apresentacao else None,
            )
            for r in res.fetchall()
        ]

    ultimas_mps = await _listar_atos("MP")
    ultimos_pls = await _listar_atos("PL_EXECUTIVO")

    cargo = row.cargo
    cargo_titulo_map = {
        "PRESIDENTE": "Presidente da Republica",
        "VICE_PRESIDENTE": "Vice-Presidente da Republica",
        "GOVERNADOR": f"Governador{' de ' + row.uf if row.uf else ''}",
        "VICE_GOVERNADOR": f"Vice-Governador{' de ' + row.uf if row.uf else ''}",
        "PREFEITO": "Prefeito",
        "VICE_PREFEITO": "Vice-Prefeito",
    }

    return Executivo(
        cargo=cargo,
        cargo_titulo=cargo_titulo_map.get(cargo, cargo.replace("_", " ").title()),
        mandato_ano_inicio=int(row.ano_inicio) if row.ano_inicio else None,
        mandato_ano_fim=int(row.ano_fim) if row.ano_fim else None,
        uf=row.uf,
        partido_sigla=row.partido_sigla,
        n_medidas_provisorias=n_mp,
        n_mps_aprovadas=n_mp_aprov,
        n_mps_rejeitadas=n_mp_rej,
        n_mps_caducadas=n_mp_caducou,
        n_pls_enviados=n_pl,
        n_plps_enviados=n_plp,
        n_pecs_enviadas=n_pec,
        n_vetos=n_veto,
        n_decretos=n_decreto,
        total_atos=total_atos,
        taxa_aprovacao_mps=round(taxa_mp, 1) if taxa_mp is not None else None,
        ultimas_mps=ultimas_mps,
        ultimos_pls=ultimos_pls,
        disponivel=total_atos > 0,
    )


async def _build_carreira_publica(db: AsyncSession, candidato_id: int) -> CarreiraPublica:
    """
    Consulta `cargos_publicos_historico`. Inclui candidatos com mesmo
    nome_completo (unificacao - igual a de candidaturas).
    Ordena por inicio DESC (mais recente primeiro).
    """
    res = await db.execute(text("""
        WITH ids_unificados AS (
            SELECT DISTINCT c2.id
            FROM candidatos c1
            JOIN candidatos c2 ON c2.nome_completo = c1.nome_completo
            WHERE c1.id = :cid
              AND c1.nome_completo IS NOT NULL
              AND c1.nome_completo != ''
        )
        SELECT cargo, orgao, esfera, uf, inicio, fim, fonte
        FROM cargos_publicos_historico
        WHERE candidato_id IN (SELECT id FROM ids_unificados)
        ORDER BY inicio DESC NULLS LAST, id DESC
    """), {"cid": candidato_id})
    rows = res.fetchall()
    if not rows:
        return CarreiraPublica()
    cargos = [
        CargoHistorico(
            cargo=r.cargo,
            orgao=r.orgao,
            esfera=r.esfera,
            uf=r.uf,
            inicio=r.inicio.isoformat() if r.inicio else None,
            fim=r.fim.isoformat() if r.fim else None,
            fonte=r.fonte,
        )
        for r in rows
    ]
    return CarreiraPublica(cargos=cargos, disponivel=True)
