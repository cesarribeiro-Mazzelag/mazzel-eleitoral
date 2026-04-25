"""
Listagem do modulo Dossies (Biblioteca de Dossies Politicos).

Antes vivia em `app/radar/dimensions/politicos.py` quando o modulo se chamava
"Radar Politico". Em 21/04/2026 o modulo foi renomeado para "Dossies" e
em 25/04/2026 o codigo foi movido pra ca pra alinhar a semantica do backend.

Serve (e ainda via alias /radar/politicos) a grade de cartinhas FIFA da
biblioteca de dossies. Cada item da grade abre um dossie detalhado em
/dossie/{id}.

Uma query SQL agregada que calcula classificacao + risco + metrica_destaque
+ status (ELEITO/NAO_ELEITO/SUPLENTE_ASSUMIU/SUPLENTE_ESPERA) em SQL puro.

V2 adiciona:
  - StatusPolitico: derivado do cruzamento candidaturas x mandatos_legislativo
  - votos_faltando: gap pro ultimo eleito no mesmo (cargo, municipio, ano)
  - votos_ultimo_eleito: referencia para micro barra de progresso na UI
  - Filtro por status
  - Ordenacao por votos_faltando

Classificacao simplificada da Fase 1 (sem benchmarks externos):

- FORTE          : eleito + votos_total no top 25% do par (cargo, estado_uf, ano)
- EM_CRESCIMENTO : crescimento >= 30% vs. eleicao anterior do mesmo candidato
                   no mesmo cargo (e nao casa em FORTE)
- EM_RISCO       : votos_total no bottom 25% do par OU nao eleito sem crescimento
- CRITICO        : votos_total = 0
- INDISPONIVEL   : sem dados suficientes (sem candidaturas do par)

Status:

- ELEITO           : eleito = TRUE no TSE
- SUPLENTE_ASSUMIU : nao eleito no TSE, mas encontrado em mandatos_legislativo
- SUPLENTE_ESPERA  : situacao_final = 'SUPLENTE' no TSE, sem mandato
- NAO_ELEITO       : todos os demais nao-eleitos

votos_faltando:

  Para cada (cargo, municipio_id, ano), pega o MIN(votos_total) dos eleitos.
  votos_faltando = menor_voto_eleito - votos_total_do_candidato.
  Negativo = acima do corte. Positivo = faltaram X votos.
"""
from __future__ import annotations
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.radar import (
    DossieCard,
    DossiesListagemResponse,
    FiltrosDossies,
    MetricaDestaque,
    TrajetoriaItem,
)
from app.services.cores_partidos import get_cor_partido
from app.services.validacao_dados import sanear_votos_total


# Numeros TSE de Uniao Brasil + predecessores (DEM, PSL).
PARTIDOS_UB = (44, 25, 17)


_ORDENACAO_SQL = {
    "potencial_estrategico": "potencial_estrategico DESC NULLS LAST, votos_total DESC NULLS LAST",
    "votos_total":           "votos_total DESC NULLS LAST",
    "ano_recente":           "ano DESC, votos_total DESC NULLS LAST",
    "nome":                  "nome ASC",
    "nome_asc":              "nome ASC",
    "votos_desc":            "votos_total DESC NULLS LAST",
    # overall_desc agora le da tabela politico_overall_v9 (fonte unica). Candidatos
    # sem linha na tabela ficam com NULL e caem para o final, com ordenacao
    # secundaria por potencial_estrategico (proxy).
    "overall_desc":          "pov_overall DESC NULLS LAST, potencial_estrategico DESC NULLS LAST, votos_total DESC NULLS LAST",
    "votos_faltando":        "votos_faltando ASC NULLS LAST, votos_total DESC NULLS LAST",
}


def _build_filtros(filtros: FiltrosDossies) -> tuple[str, dict]:
    """
    Monta a clausula WHERE para o SELECT FINAL (depois da CTE base).
    Usa nomes das colunas da CTE (sem prefixo de tabela).
    """
    parts: list[str] = []
    params: dict = {}

    if filtros.cargo:
        parts.append("cargo = ANY(:cargos)")
        params["cargos"] = [c.upper() for c in filtros.cargo]

    if filtros.estado_uf:
        parts.append("estado_uf = ANY(:ufs)")
        params["ufs"] = [u.upper() for u in filtros.estado_uf]

    if filtros.ano:
        parts.append("ano = ANY(:anos)")
        params["anos"] = list(filtros.ano)

    if filtros.busca:
        parts.append("UPPER(nome) LIKE :busca")
        params["busca"] = f"%{filtros.busca.upper()}%"

    if filtros.classificacao:
        parts.append("classificacao = ANY(:classifs)")
        params["classifs"] = list(filtros.classificacao)

    if filtros.risco:
        parts.append("risco = ANY(:riscos)")
        params["riscos"] = list(filtros.risco)

    if filtros.status:
        parts.append("status = ANY(:statuses)")
        params["statuses"] = list(filtros.status)

    where_sql = "WHERE " + " AND ".join(parts) if parts else ""
    return where_sql, params


# ══════════════════════════════════════════════════════════════════════════════
# NOTA (17/04/2026): a CTE que calculava classificacao/risco/potencial em
# tempo de request foi MATERIALIZADA em `mv_radar_politicos`
# (migration 039). A query em `listar_dossies` abaixo le direto da MV.
#
# Se precisar alterar a logica (cortes de pct_rank, formula do potencial,
# criterios de classificacao): editar o SQL da MV na migration 039 ou
# criar uma nova migration de substituicao, depois rodar REFRESH.
#
# O codigo SQL completo ficou disponivel para referencia em:
#   alembic/versions/039_mv_radar_politicos.py
# ══════════════════════════════════════════════════════════════════════════════


async def listar_dossies(
    db: AsyncSession,
    filtros: FiltrosDossies,
) -> DossiesListagemResponse:
    """
    Devolve a pagina da listagem do Radar - Politicos.

    Le da materialized view `mv_radar_politicos` (migration 039). A MV
    contem a mesma logica da _BASE_CTE pre-calculada — a CTE inline
    nao e mais usada em tempo de request. Para atualizar a MV apos
    novos ETLs: `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_radar_politicos`.

    Latencia: antes ~47s (CTE full scan), agora <50ms (indice sobre MV).
    """
    where_sql, params = _build_filtros(filtros)

    ordem = _ORDENACAO_SQL.get(filtros.ordenar_por, _ORDENACAO_SQL["overall_desc"])

    # Filtros tier/trait sao calculados em Python (nao estao na MV).
    # Quando ativos, puxamos batch maior e aplicamos post-filter + paginacao em memoria.
    tem_filtro_fifa = bool(filtros.tier or filtros.trait)

    # Le da `mv_dossies_listagem` (migration 052) - MV ja com 1 row por
    # candidato_id (DISTINCT ON precomputado). Antes faziamos DISTINCT ON em
    # runtime sobre mv_radar_politicos, que custava ~1.95s de sort em disco.
    #
    # LEFT JOIN politico_overall_v9 traz overall pre-calculado quando o
    # candidato ja foi backfilled. Sem linha -> pov_* = NULL e _calcular_fifa_lite
    # cobre via batches. Backfill prioriza eleitos; demais ganham linha sob
    # demanda no /dossie/{id} (lazy warmup).
    base_query = f"""
        SELECT
            distintos.*,
            pov.overall AS pov_overall,
            pov.tier    AS pov_tier,
            pov.traits  AS pov_traits,
            pov.atv AS pov_atv, pov.leg AS pov_leg, pov.bse AS pov_bse,
            pov.inf AS pov_inf, pov.mid AS pov_mid, pov.pac AS pov_pac
        FROM mv_dossies_listagem AS distintos
        LEFT JOIN politico_overall_v9 pov
          ON pov.candidato_id = distintos.candidato_id
         AND pov.ciclo_ano = distintos.ano
        {where_sql}
    """

    if tem_filtro_fifa:
        # Puxa ate 500 candidatos filtrados em SQL, depois refina em Python
        params["limit"] = 500
        params["offset"] = 0
        sql = f"""
            SELECT * FROM ({base_query}) AS distintos
            ORDER BY {ordem}
            LIMIT :limit OFFSET :offset
        """
        rows = (await db.execute(text(sql), params)).mappings().all()

        # Batch: score juridico + financeiro + legislativo + executivo por candidato
        cids = {r["candidato_id"] for r in rows}
        candids = {r["candidatura_id"] for r in rows}
        juri_por_cand = await _buscar_juridico_batch(db, cids)
        fin_por_candid = await _buscar_financeiro_batch(db, candids)
        legis_por_cand = await _buscar_legislativo_lite_batch(db, cids)
        exec_por_cand = await _buscar_executivo_lite_batch(db, cids)
        recordes_por_candid = await _buscar_recordes_batch(db, list(rows))
        items_all = [
            _row_to_card(
                r,
                juri_por_cand.get(r["candidato_id"]),
                fin_por_candid.get(r["candidatura_id"]),
                legis_por_cand.get(r["candidato_id"]),
                exec_por_cand.get(r["candidato_id"]),
                recorde_tipo=recordes_por_candid.get(r["candidatura_id"]),
            )
            for r in rows
        ]
        # Filtro em Python (tier/trait preferem valores da tabela quando disponiveis)
        if filtros.tier:
            items_all = [i for i in items_all if i.tier == filtros.tier]
        if filtros.trait:
            items_all = [i for i in items_all if filtros.trait in (i.traits or [])]

        # Sort por overall ja foi feito em SQL via JOIN com politico_overall_v9.
        # Nao reordenamos em Python pra nao misturar overall real (tabela) com lite.

        total = len(items_all)
        inicio = (filtros.pagina - 1) * filtros.por_pagina
        fim = inicio + filtros.por_pagina
        items = items_all[inicio:fim]
    else:
        # Fluxo rapido: paginacao SQL direta
        offset = (filtros.pagina - 1) * filtros.por_pagina
        params["limit"] = filtros.por_pagina
        params["offset"] = offset
        sql = f"""
            SELECT * FROM ({base_query}) AS distintos
            ORDER BY {ordem}
            LIMIT :limit OFFSET :offset
        """
        count_sql = f"""
            SELECT COUNT(*) FROM ({base_query}) AS distintos
        """
        rows = (await db.execute(text(sql), params)).mappings().all()
        total = (await db.execute(text(count_sql), params)).scalar() or 0

        # Otimizacao: se TODAS as rows ja tem pov_overall (do JOIN), pulamos os
        # batches que so existem para alimentar _calcular_fifa_lite. Reduz a
        # latencia de paginas onde o backfill esta completo.
        precisa_batches = any(r.get("pov_overall") is None for r in rows)

        if precisa_batches:
            cids = {r["candidato_id"] for r in rows if r.get("pov_overall") is None}
            candids = {r["candidatura_id"] for r in rows if r.get("pov_overall") is None}
            juri_por_cand = await _buscar_juridico_batch(db, cids)
            fin_por_candid = await _buscar_financeiro_batch(db, candids)
            legis_por_cand = await _buscar_legislativo_lite_batch(db, cids)
            exec_por_cand = await _buscar_executivo_lite_batch(db, cids)
            recordes_por_candid = await _buscar_recordes_batch(
                db, [r for r in rows if r.get("pov_overall") is None]
            )
        else:
            juri_por_cand = {}
            fin_por_candid = {}
            legis_por_cand = {}
            exec_por_cand = {}
            recordes_por_candid = {}
        items = [
            _row_to_card(
                r,
                juri_por_cand.get(r["candidato_id"]),
                fin_por_candid.get(r["candidatura_id"]),
                legis_por_cand.get(r["candidato_id"]),
                exec_por_cand.get(r["candidato_id"]),
                recorde_tipo=recordes_por_candid.get(r["candidatura_id"]),
            )
            for r in rows
        ]

        # Sort por overall ja foi feito em SQL via JOIN com politico_overall_v9.

    # Batch fetch de trajetoria + votos corretos por turno. 2 queries IN (...)
    # para toda a pagina, evita N+1. Latencia total: ~10-20ms.
    if items:
        await _anexar_votos_turno(db, items)
        await _anexar_trajetoria(db, items)

    return DossiesListagemResponse(
        items=items,
        total=int(total),
        pagina=filtros.pagina,
        por_pagina=filtros.por_pagina,
    )


async def _buscar_financeiro_batch(
    db: AsyncSession, candidatura_ids: set[int]
) -> dict[int, dict]:
    """
    Busca despesa + receita de campanha por candidatura_id (batch).
    Retorna dict candidatura_id -> {despesa, receita} ou {} se sem dado.

    Usado pra calcular FIN real (custo por voto) no _calcular_fifa_lite.
    """
    if not candidatura_ids:
        return {}
    ids_list = list(candidatura_ids)
    sql = text("""
        SELECT id AS candidatura_id, despesa_campanha, receita_campanha
        FROM candidaturas
        WHERE id = ANY(:ids)
    """)
    rows = (await db.execute(sql, {"ids": ids_list})).mappings().all()
    resultado: dict[int, dict] = {}
    for r in rows:
        resultado[r["candidatura_id"]] = {
            "despesa": r["despesa_campanha"],
            "receita": r["receita_campanha"],
        }
    return resultado


async def _buscar_juridico_batch(
    db: AsyncSession, candidato_ids: set[int]
) -> dict[int, Optional[float]]:
    """
    Calcula score_juridico real pra cada candidato (batch).

    Retorna dict candidato_id -> score (float) ou None quando nao ha dado.

    Mesma logica de `calcular_score_juridico` do dossie:
    - Se nao ha ficha_limpa E nao ha sancoes: retorna None
    - Senao: 100 - penalidades (ficha_limpa=False, sancoes CEIS/CEAF/TCU)

    CRITICO: retornar None nao eh inflacao. INT=72 hardcoded inflava o Overall
    pra quem nao tinha dado auditado.
    """
    from datetime import date as _date
    if not candidato_ids:
        return {}

    ids_list = list(candidato_ids)

    # Unifica por nome_completo: TSE gera candidato_id novo a cada eleicao para
    # a mesma pessoa fisica. Dossie unifica. Pra bater 100%, card tb unifica.
    # Mapa: candidato_id original -> set de candidato_ids unificados (mesma pessoa)
    sql_unif = text("""
        SELECT c1.id AS original_id, c2.id AS unificado_id
        FROM candidatos c1
        JOIN candidatos c2 ON c2.nome_completo = c1.nome_completo
        WHERE c1.id = ANY(:ids)
          AND c1.nome_completo IS NOT NULL
          AND c1.nome_completo != ''
    """)
    rows_unif = (await db.execute(sql_unif, {"ids": ids_list})).mappings().all()
    unif_por_orig: dict[int, set[int]] = {}
    todos_unif: set[int] = set()
    for r in rows_unif:
        unif_por_orig.setdefault(r["original_id"], set()).add(r["unificado_id"])
        todos_unif.add(r["unificado_id"])
    # Candidatos sem nome_completo caem no proprio id
    for cid in ids_list:
        if cid not in unif_por_orig:
            unif_por_orig[cid] = {cid}
            todos_unif.add(cid)

    # Ficha_limpa + sancoes dos IDs unificados (union dos conjuntos)
    ids_todos = list(todos_unif)
    sql_ficha = text("""
        SELECT candidato_id, ano, ficha_limpa
        FROM candidaturas
        WHERE candidato_id = ANY(:ids) AND ficha_limpa IS NOT NULL
    """)
    rows_ficha = (await db.execute(sql_ficha, {"ids": ids_todos})).mappings().all()

    sql_sancoes = text("""
        SELECT candidato_id, fonte, data_fim
        FROM sancoes_administrativas
        WHERE candidato_id = ANY(:ids)
    """)
    rows_sancoes = (await db.execute(sql_sancoes, {"ids": ids_todos})).mappings().all()

    # Agrega por candidato_id UNIFICADO
    ficha_por_unif: dict[int, dict[int, bool]] = {}
    for r in rows_ficha:
        ficha_por_unif.setdefault(r["candidato_id"], {})[r["ano"]] = r["ficha_limpa"]

    sancoes_por_unif: dict[int, list[dict]] = {}
    for r in rows_sancoes:
        sancoes_por_unif.setdefault(r["candidato_id"], []).append(r)

    # Monta ficha+sancoes consolidadas por candidato original
    ficha_por_cand: dict[int, dict[int, bool]] = {}
    sancoes_por_cand: dict[int, list[dict]] = {}
    for orig_id, unif_ids in unif_por_orig.items():
        fichas_consolidadas: dict[int, bool] = {}
        sancoes_consolidadas: list[dict] = []
        for uid in unif_ids:
            fichas_consolidadas.update(ficha_por_unif.get(uid, {}))
            sancoes_consolidadas.extend(sancoes_por_unif.get(uid, []))
        ficha_por_cand[orig_id] = fichas_consolidadas
        sancoes_por_cand[orig_id] = sancoes_consolidadas

    hoje = _date.today()
    resultado: dict[int, Optional[float]] = {}

    for cid in ids_list:
        fichas = ficha_por_cand.get(cid, {})
        sancoes = sancoes_por_cand.get(cid, [])

        # SEM DADO: retorna None (nao inflar com baseline 72 hardcoded)
        if not fichas and not sancoes:
            resultado[cid] = None
            continue

        # Score inicial 100, subtrai penalidades
        score = 100.0

        # Ciclos historicos inaptos (cap 4)
        ciclos_inapto = sum(1 for f in fichas.values() if f is False)
        ciclos_cap = min(ciclos_inapto, 4)
        # Se tem ciclo atual inapto, desconta separado (penalidade maior)
        # Simplificacao: assume que cada inapto vale -15 (media entre cap 10 hist e 30 atual)
        score -= ciclos_cap * 15

        # Sancoes ativas
        sancoes_ativas = [
            s for s in sancoes
            if s["data_fim"] is None or s["data_fim"] >= hoje
        ]
        sancoes_tcu = [s for s in sancoes_ativas if s["fonte"] == "TCU"]
        sancoes_cgu = [s for s in sancoes_ativas if s["fonte"] in ("CEIS", "CEAF")]

        if sancoes_tcu:
            score -= 40
        score -= min(len(sancoes_cgu), 2) * 25

        resultado[cid] = max(score, 0.0)

    return resultado


async def _anexar_votos_turno(db: AsyncSession, items: list[DossieCard]) -> None:
    """
    Corrige `votos_total` usando a tabela `votos_por_zona` como fonte de verdade.

    Bug que isso resolve: `candidaturas.votos_total` esta populado como SOMA de
    1T + 2T em alguns casos (ex: Lula 2022 presidente com 117M = 57M + 60M).

    Fonte correta = SUM(qt_votos) em votos_por_zona GROUP BY turno:
    - Se disputou 2T: mostra votos do turno 2 (turno decisivo)
    - Se nao disputou 2T: mostra votos do turno 1
    - Fallback: mantem o valor atual se a tabela nao tiver dados para a candidatura

    Latencia: 1 query agregada com index ix_votos_candidatura, ~5-15ms para 24 cards.
    """
    if not items:
        return
    ids = [it.candidatura_id for it in items if it.candidatura_id]
    if not ids:
        return

    sql = text("""
        SELECT candidatura_id, turno, SUM(qt_votos)::bigint AS votos
        FROM votos_por_zona
        WHERE candidatura_id = ANY(:ids)
        GROUP BY candidatura_id, turno
    """)
    rows = (await db.execute(sql, {"ids": ids})).mappings().all()

    # Agrupa: {candidatura_id: {1: votos_1t, 2: votos_2t}}
    por_cand: dict[int, dict[int, int]] = {}
    for r in rows:
        turno_map = por_cand.setdefault(r["candidatura_id"], {})
        turno_map[int(r["turno"])] = int(r["votos"])

    for it in items:
        turnos = por_cand.get(it.candidatura_id)
        if not turnos:
            continue
        v1 = turnos.get(1, 0)
        v2 = turnos.get(2, 0)

        if v2 > 0:
            it.votos_total = v2
            it.votos_melhor_turno = v2
        elif v1 > 0:
            it.votos_total = v1
            it.votos_melhor_turno = v1


async def _anexar_trajetoria(db: AsyncSession, items: list[DossieCard]) -> None:
    """
    Preenche o campo `trajetoria` de cada card com os cargos anteriores do
    candidato (exceto a candidatura atual que ja esta no card).

    Uma unica query IN (...) para evitar N+1. Inclui apenas candidaturas
    anteriores ao ano da candidatura atual, limitadas aos 4 cargos mais
    recentes por candidato (fileira do card nao comporta mais que isso).
    """
    if not items:
        return

    # Mapeia candidato_id -> (ano da candidatura atual) pra filtrar anteriores
    ano_atual_por_candidato: dict[int, int] = {}
    for it in items:
        # Fica com o maior ano caso o mesmo candidato apareca 2x (raro, mas ok)
        prev = ano_atual_por_candidato.get(it.candidato_id)
        if prev is None or it.ano > prev:
            ano_atual_por_candidato[it.candidato_id] = it.ano

    candidato_ids = list(ano_atual_por_candidato.keys())

    sql = text("""
        SELECT
            ca.candidato_id,
            ca.ano,
            ca.cargo,
            ca.estado_uf,
            ca.eleito,
            ca.votos_total
        FROM candidaturas ca
        WHERE ca.candidato_id = ANY(:ids)
        ORDER BY ca.candidato_id, ca.ano DESC
    """)
    rows = (await db.execute(sql, {"ids": candidato_ids})).mappings().all()

    # Agrupa por candidato_id; exclui candidatura do ano atual; limita a 4 entradas.
    por_candidato: dict[int, list[TrajetoriaItem]] = {}
    for r in rows:
        cid = r["candidato_id"]
        ano_atual = ano_atual_por_candidato.get(cid)
        if ano_atual is not None and r["ano"] >= ano_atual:
            continue
        bucket = por_candidato.setdefault(cid, [])
        if len(bucket) >= 4:
            continue
        bucket.append(TrajetoriaItem(
            ano=int(r["ano"]),
            cargo=r["cargo"],
            estado_uf=r.get("estado_uf"),
            eleito=bool(r["eleito"]),
            votos_total=int(r["votos_total"]) if r.get("votos_total") is not None else None,
        ))

    for it in items:
        it.trajetoria = por_candidato.get(it.candidato_id, [])


def _calcular_fifa_lite(
    row,
    score_juridico_real: Optional[float] = None,
    dados_financeiros: Optional[dict] = None,
    legis_lite: Optional[object] = None,
    exec_lite: Optional[object] = None,
    recorde_tipo: Optional[str] = None,
) -> tuple[Optional[int], Optional[str], list[str], Optional[dict]]:
    """
    Overall FIFA simplificado pra carta da listagem (nao compila dossie).
    Usa status eleito + cargo + pct_rank do cargo + crescimento.

    recorde_tipo: "br" (+8, FENOMENO), "uf" (+5, FERA_REGIONAL), "top5" (+3), None.

    Retorna (overall, tier, traits). Overall None se sem dados.
    """
    pct_rank_raw = row.get("pct_rank")
    if pct_rank_raw is None:
        return None, None, [], None
    # MV retorna pct_rank em 0-1; normaliza pra 0-100
    pct_rank = float(pct_rank_raw) * 100

    eleito = bool(row.get("eleito", False))
    votos_ant = int(row.get("votos_anterior") or 0)
    votos_total = int(row.get("votos_total") or 0)
    disputou_2t = bool(row.get("disputou_segundo_turno", False))
    cargo = (row.get("cargo") or "").upper()

    # FIN (score financeiro): custo por voto. Usado tanto no atributo FIN
    # do card quanto na ponderacao final do overall.
    despesa = dados_financeiros.get("despesa") if dados_financeiros else None
    if despesa is not None and despesa > 0 and votos_total > 0:
        cpv = float(despesa) / votos_total
        if cpv < 5:
            score_financeiro = 95.0
        elif cpv > 500:
            score_financeiro = 25.0
        else:
            import math as _math
            score_financeiro = max(25, min(95, 99 - (_math.log10(cpv / 5) * 30)))
    else:
        score_financeiro = None

    traits: list[str] = []
    if eleito:
        traits.append("CAMPEAO")
    if pct_rank is not None and pct_rank >= 90:
        traits.append("FERA")
    if votos_ant == 0 and votos_total > 0:
        traits.append("ESTREANTE")

    # 6 atributos condensados pra carta (estimativas rapidas baseadas nos
    # dados disponiveis; dossie completo tem os 8 valores reais)
    # VOT: votacao (pct_rank direto)
    vot = int(min(99, max(20, pct_rank * 0.85 + (15 if disputou_2t else 0))))
    # EFI: eficiencia (eleito + relacao com pct_rank)
    efi = int(min(99, max(20, (85 if eleito else 45) + (pct_rank - 50) * 0.15)))
    # ART: articulacao.
    # Quando ha dados reais (legis_lite ou exec_lite batch-fetched), usa as
    # mesmas formulas do dossie via `_art_por_cargo` - zero duplicacao de regra.
    # Caso contrario, cai na estimativa por cargo (fallback pra MV sem dados).
    art = None
    if legis_lite is not None or exec_lite is not None:
        try:
            from app.services.dossie_inteligencia import _art_por_cargo
            # cargos = lista com 1 item fake representando o cargo atual
            from types import SimpleNamespace
            cargos_fake = [SimpleNamespace(cargo=cargo, resultado="ELEITO" if eleito else "NAO_ELEITO")]
            art = _art_por_cargo(cargo, legis_lite, cargos_fake, exec_lite)
        except Exception:
            art = None
    if art is None:
        # Fallback: estimativa antiga por cargo + eleito
        if cargo in ("DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL", "SENADOR"):
            art = 65 if eleito else 35
        else:
            art = 55 if eleito else 40

    # Penalidade "Parlamentar inerte" (identica ao dossie apos Mecanismo 4):
    # NAO aplica a Senador. Amaciada: so aplica quando VOT < 70 (fenomenos
    # eleitorais compensam falta de aprovacoes por agenda politica, nao inercial).
    if cargo != "SENADOR" and legis_lite is not None:
        projs = getattr(legis_lite, "projetos_apresentados", 0) or 0
        aprov = getattr(legis_lite, "projetos_aprovados", 0) or 0
        if aprov == 0 and projs >= 10 and vot < 70:
            art = max(0, art - 15)
    # FID: sem dados de historico no preview, default por eleito
    fid = 70 if eleito else 55
    # INT: integridade - usa score_juridico real OU None se sem dado (nunca baseline)
    # Frontend mostra "—" quando intg eh None (regra igual ao dossie)
    if score_juridico_real is not None:
        intg = int(round(score_juridico_real))
    else:
        intg = None
    # TER: territorial - volume de votos
    import math as _math
    if votos_total > 0:
        ter = int(min(99, max(25, _math.log10(votos_total + 1) * 12)))
    else:
        ter = 30

    # POT: potencial estrategico (ja calculado na MV, 0-100+). None se ausente.
    pot_raw = row.get("potencial_estrategico")
    if pot_raw is not None:
        pot = int(max(25, min(99, pot_raw)))
    else:
        pot = None

    # FIN: financeiro (eficiencia de campanha). None quando sem dados reais.
    if score_financeiro is not None:
        fin = int(round(score_financeiro))
    else:
        fin = None

    # Schema mantem `atributos_6` como nome pra compat, mas retorna 8 chaves.
    # Card visual usa 6 (VOT/FID/EFI/INT/ART/TER), dossie usa os 8.
    atributos_6 = {
        "VOT": vot,
        "EFI": efi,
        "ART": art,
        "FID": fid,
        "INT": intg,
        "TER": ter,
        "POT": pot,
        "FIN": fin,
    }

    # ─── Overall = media ponderada dos 8 atributos pela matriz do dossie ───
    # Usa PESOS_OVERALL_POR_CARGO (estudo Sonnet 20/04). Senador pesa ART 25%,
    # Vereador pesa ART 10% etc. Atributos None tem peso redistribuido.
    from app.services.dossie_inteligencia import (
        PESOS_OVERALL_POR_CARGO, _resolver_chave_pesos, PESOS_DEFAULT,
    )
    # eh_capital: listagem nao tem municipio_nome pra cruzar com a whitelist
    # de capitais, entao assumimos True (VEREADOR_CAPITAL) quando cargo=VEREADOR.
    # Dossie fara o calculo exato usando o nome do municipio.
    chave_pesos = _resolver_chave_pesos(cargo, eh_capital=True)
    pesos = PESOS_OVERALL_POR_CARGO.get(chave_pesos, PESOS_DEFAULT)
    soma_pesos = sum(pesos[k] for k, v in atributos_6.items() if v is not None)
    if soma_pesos > 0:
        overall_base = (
            sum(v * pesos[k] for k, v in atributos_6.items() if v is not None)
            / soma_pesos
        )
        overall = int(max(30, min(99, round(overall_base))))
    else:
        overall = None

    # Bonus de cargo (mesma regra do dossie, sem os bonus que dependem
    # de complexidade municipal / liga partido - esses ficam so no dossie).
    if overall is not None:
        bonus_cargo = {
            "PRESIDENTE": 15, "SENADOR": 10, "GOVERNADOR": 8,
            "DEPUTADO FEDERAL": 5, "DEPUTADO ESTADUAL": 3, "DEPUTADO DISTRITAL": 3,
            "PREFEITO": 2, "VEREADOR": 0,
        }.get(cargo, 0)
        if bonus_cargo:
            overall = min(99, overall + bonus_cargo)

    # Bonus de recorde eleitoral (pre-calculado em batch pelo fluxo principal).
    if overall is not None and recorde_tipo:
        if recorde_tipo == "br":
            overall = min(99, overall + 8)
            if "FENOMENO" not in traits:
                traits.append("FENOMENO")
        elif recorde_tipo == "uf":
            overall = min(99, overall + 5)
            if "FERA_REGIONAL" not in traits:
                traits.append("FERA_REGIONAL")
        elif recorde_tipo == "top5":
            overall = min(99, overall + 3)

    if overall is None:
        tier = None
    elif overall >= 85:
        tier = "dourado"
    elif overall >= 75:
        tier = "ouro"
    elif overall >= 65:
        tier = "prata"
    else:
        tier = "bronze"

    return overall, tier, traits, atributos_6


async def _buscar_legislativo_lite_batch(
    db: AsyncSession, candidato_ids: set[int]
) -> dict[int, object]:
    """Batch fetch dos dados legislativos usados pelo calculo de ART.
    Retorna dict candidato_id -> SimpleNamespace com os campos que as funcoes
    _art_senador/_art_deputado_federal/etc esperam (duck typing). Garante que
    a listagem use EXATAMENTE a mesma regra do dossie (sem duplicar formula).

    Os campos retornados replicam o schema Legislativo do dossie, mas em
    objeto leve (SimpleNamespace) para nao pagar custo de Pydantic validation.
    """
    from types import SimpleNamespace
    if not candidato_ids:
        return {}

    # 1. Mandato ativo mais recente por candidato (parlamentar).
    # Um candidato pode ter historico de mandatos - pegamos o da legislatura
    # mais recente (eleicao mais proxima). Candidatos sem mandato legislativo
    # (so executivo, ou nunca exerceu) nao aparecem.
    ids = list(candidato_ids)
    sql_mand = text("""
        SELECT DISTINCT ON (candidato_id)
               id, candidato_id, casa, situacao, legislatura
        FROM mandatos_legislativo
        WHERE candidato_id = ANY(:ids)
        ORDER BY candidato_id, legislatura DESC NULLS LAST
    """)
    rows_mand = (await db.execute(sql_mand, {"ids": ids})).mappings().all()
    if not rows_mand:
        return {}
    mandato_por_cid: dict[int, dict] = {r["candidato_id"]: dict(r) for r in rows_mand}
    mandato_ids = [r["id"] for r in rows_mand]

    # 2. Agregado de proposicoes por mandato (apresentadas / aprovadas).
    sql_prop = text("""
        SELECT mandato_id,
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE aprovada = true) AS aprovadas
        FROM proposicoes_legislativo
        WHERE mandato_id = ANY(:ids)
        GROUP BY mandato_id
    """)
    rows_prop = (await db.execute(sql_prop, {"ids": mandato_ids})).mappings().all()
    prop_por_mand = {r["mandato_id"]: (r["total"], r["aprovadas"]) for r in rows_prop}

    # 3. Relatorias: count de proposicoes onde relator_mandato_id = mandato_id.
    sql_rel = text("""
        SELECT relator_mandato_id AS mandato_id, COUNT(*) AS n
        FROM proposicoes_legislativo
        WHERE relator_mandato_id = ANY(:ids)
        GROUP BY relator_mandato_id
    """)
    rows_rel = (await db.execute(sql_rel, {"ids": mandato_ids})).mappings().all()
    rel_por_mand = {r["mandato_id"]: r["n"] for r in rows_rel}

    # 4. Comissoes - trazemos TODAS de uma vez (ativas e historicas).
    sql_com = text("""
        SELECT mandato_id, sigla_comissao, nome_comissao, cargo,
               (data_fim IS NULL OR data_fim >= CURRENT_DATE) AS ativa
        FROM comissoes_parlamentar
        WHERE mandato_id = ANY(:ids)
    """)
    rows_com = (await db.execute(sql_com, {"ids": mandato_ids})).mappings().all()
    com_por_mand: dict[int, list[object]] = {}
    hist_por_mand: dict[int, int] = {}
    for r in rows_com:
        mid = r["mandato_id"]
        hist_por_mand[mid] = hist_por_mand.get(mid, 0) + 1
        if r["ativa"]:
            com_por_mand.setdefault(mid, []).append(SimpleNamespace(
                sigla=r["sigla_comissao"],
                nome=r["nome_comissao"],
                cargo=r["cargo"],
                ativa=True,
            ))

    # 5. Montar o SimpleNamespace por candidato.
    out: dict[int, object] = {}
    for cid, mand in mandato_por_cid.items():
        mid = mand["id"]
        prop = prop_por_mand.get(mid, (0, 0))
        out[cid] = SimpleNamespace(
            disponivel=True,
            casa=mand.get("casa"),
            situacao=mand.get("situacao"),
            projetos_apresentados=int(prop[0] or 0),
            projetos_aprovados=int(prop[1] or 0),
            comissoes_atuais=com_por_mand.get(mid, []),
            n_comissoes_historico=hist_por_mand.get(mid, 0),
            n_relatorias=int(rel_por_mand.get(mid, 0) or 0),
        )
    return out


async def _buscar_executivo_lite_batch(
    db: AsyncSession, candidato_ids: set[int]
) -> dict[int, object]:
    """Batch fetch de atos executivos para Presidente/Governador/Prefeito.
    Mesma logica do Executivo do dossie, em objeto leve.
    """
    from types import SimpleNamespace
    if not candidato_ids:
        return {}
    ids = list(candidato_ids)
    sql_mand = text("""
        SELECT DISTINCT ON (candidato_id)
               id, candidato_id, ano_inicio, ano_fim
        FROM mandatos_executivo
        WHERE candidato_id = ANY(:ids)
        ORDER BY candidato_id, ano_inicio DESC NULLS LAST
    """)
    rows_mand = (await db.execute(sql_mand, {"ids": ids})).mappings().all()
    if not rows_mand:
        return {}
    mandato_por_cid = {r["candidato_id"]: dict(r) for r in rows_mand}
    mandato_ids = [r["id"] for r in rows_mand]

    sql_atos = text("""
        SELECT mandato_id, tipo,
               COUNT(*) AS n,
               COUNT(*) FILTER (WHERE tipo = 'MP' AND aprovada = true) AS mps_aprov,
               COUNT(*) FILTER (WHERE tipo = 'MP') AS mps_total
        FROM atos_executivo
        WHERE mandato_id = ANY(:ids)
        GROUP BY mandato_id, tipo
    """)
    rows_atos = (await db.execute(sql_atos, {"ids": mandato_ids})).mappings().all()
    # Agrega por mandato
    agg: dict[int, dict] = {}
    for r in rows_atos:
        mid = r["mandato_id"]
        a = agg.setdefault(mid, {"mps": 0, "pls": 0, "plps": 0, "pecs": 0, "mps_aprov": 0, "mps_total": 0})
        tipo = (r["tipo"] or "").upper()
        if tipo == "MP":
            a["mps"] += r["n"]
            a["mps_aprov"] += r["mps_aprov"] or 0
            a["mps_total"] += r["mps_total"] or 0
        elif tipo in ("PL_EXECUTIVO", "PL"):
            a["pls"] += r["n"]
        elif tipo in ("PLP_EXECUTIVO", "PLP"):
            a["plps"] += r["n"]
        elif tipo in ("PEC_EXECUTIVO", "PEC"):
            a["pecs"] += r["n"]

    out: dict[int, object] = {}
    for cid, mand in mandato_por_cid.items():
        mid = mand["id"]
        a = agg.get(mid, {"mps": 0, "pls": 0, "plps": 0, "pecs": 0, "mps_aprov": 0, "mps_total": 0})
        taxa_mp = None
        if a["mps_total"] > 0:
            taxa_mp = float(a["mps_aprov"]) / a["mps_total"] * 100
        out[cid] = SimpleNamespace(
            disponivel=True,
            n_medidas_provisorias=a["mps"],
            n_pls_enviados=a["pls"],
            n_plps_enviados=a["plps"],
            n_pecs_enviadas=a["pecs"],
            taxa_aprovacao_mps=taxa_mp,
            mandato_ano_inicio=mand.get("ano_inicio"),
            mandato_ano_fim=mand.get("ano_fim"),
        )
    return out


async def _buscar_recordes_batch(
    db: AsyncSession, rows: list
) -> dict[int, str]:
    """Para cada candidatura_id na pagina, determina se e recordista.

    Retorna dict candidatura_id -> tipo_recorde: "br" | "uf" | "top5" | None.

    Faz no maximo 3 queries IN por bloco de cargo+ano distintos na pagina.
    Se mv_radar_politicos nao existir, retorna dict vazio silenciosamente.
    """
    result: dict[int, str] = {}
    if not rows:
        return result

    # Agrupa candidaturas por (cargo, ano) para minimizar queries
    from collections import defaultdict
    grupos: dict[tuple, list[dict]] = defaultdict(list)
    for r in rows:
        cargo = (r.get("cargo") or "").upper()
        ano = r.get("ano")
        cid = r.get("candidatura_id")
        uf = r.get("estado_uf")
        if cargo and ano and cid:
            grupos[(cargo, ano)].append({"candidatura_id": cid, "estado_uf": uf})

    try:
        for (cargo, ano), candidaturas in grupos.items():
            cids_grupo = {c["candidatura_id"] for c in candidaturas}

            # Top 5 BR (uma unica query por grupo)
            rows_top5 = (await db.execute(text("""
                SELECT candidatura_id
                FROM mv_radar_politicos
                WHERE cargo = :cargo AND ano = :ano AND eleito = true
                ORDER BY votos_total DESC
                LIMIT 5
            """), {"cargo": cargo, "ano": ano})).fetchall()
            top5_br = [r[0] for r in rows_top5]

            # #1 do estado por UF presente na pagina
            ufs_na_pagina = {c["estado_uf"] for c in candidaturas if c["estado_uf"]}
            top1_por_uf: dict[str, int] = {}
            for uf in ufs_na_pagina:
                row_uf = (await db.execute(text("""
                    SELECT candidatura_id
                    FROM mv_radar_politicos
                    WHERE cargo = :cargo AND ano = :ano AND estado_uf = :uf AND eleito = true
                    ORDER BY votos_total DESC
                    LIMIT 1
                """), {"cargo": cargo, "ano": ano, "uf": uf})).fetchone()
                if row_uf:
                    top1_por_uf[uf] = row_uf[0]

            # Clasifica cada candidatura do grupo
            for c in candidaturas:
                cid = c["candidatura_id"]
                uf = c["estado_uf"]
                if top5_br and cid == top5_br[0]:
                    result[cid] = "br"
                elif uf and top1_por_uf.get(uf) == cid:
                    result[cid] = "uf"
                elif cid in top5_br:
                    result[cid] = "top5"
                # else: sem recorde, nao insere (None por default)
    except Exception:
        # Se mv nao existe ou erro, nao bloqueia a listagem
        pass

    return result


def _row_to_card(
    row,
    score_juridico_real: Optional[float] = None,
    dados_financeiros: Optional[dict] = None,
    legis_lite: Optional[object] = None,
    exec_lite: Optional[object] = None,
    recorde_tipo: Optional[str] = None,
) -> DossieCard:
    """Converte uma linha SQL em DossieCard, escolhendo a metrica destaque.

    score_juridico_real vem do _buscar_juridico_batch. None quando candidato
    nao tem dado juridico (nao entra na media do overall).

    dados_financeiros vem do _buscar_financeiro_batch. Dict {despesa, receita}
    ou None. Usado pra calcular FIN real (CPV = despesa/votos).

    recorde_tipo: "br" | "uf" | "top5" | None - pre-calculado em batch.
    """
    cor = get_cor_partido(row["partido_numero"])

    votos_saneado = sanear_votos_total(bool(row["eleito"]), row["votos_total"])

    metrica: Optional[MetricaDestaque]
    if votos_saneado is None:
        metrica = None
    else:
        metrica = MetricaDestaque(
            chave="votos_total",
            valor=float(votos_saneado),
            label="Votos",
            formato="numero",
        )

    # Fonte unica: prefere politico_overall_v9 (LEFT JOIN traz pov_*) sobre o
    # calculo lite. Fallback pro lite quando o candidato ainda nao foi backfilled.
    pov_overall = row.get("pov_overall")
    if pov_overall is not None:
        overall = int(pov_overall)
        tier = row.get("pov_tier")
        traits = list(row.get("pov_traits") or [])
        overall_v9 = {
            "ATV": row.get("pov_atv"), "LEG": row.get("pov_leg"),
            "BSE": row.get("pov_bse"), "INF": row.get("pov_inf"),
            "MID": row.get("pov_mid"), "PAC": row.get("pov_pac"),
        }
        atributos_6 = None  # frontend deve preferir overall_v9 quando presente
    else:
        overall, tier, traits, atributos_6 = _calcular_fifa_lite(
            row, score_juridico_real, dados_financeiros, legis_lite, exec_lite,
            recorde_tipo=recorde_tipo,
        )
        overall_v9 = None

    return DossieCard(
        candidato_id=row["candidato_id"],
        candidatura_id=row["candidatura_id"],
        nome=row["nome"],
        foto_url=row.get("foto_url"),
        cargo=row["cargo"],
        estado_uf=row["estado_uf"],
        municipio_nome=row.get("municipio_nome"),
        ano=row["ano"],
        eleito=bool(row["eleito"]),
        votos_total=int(row.get("votos_total") or 0) or None,
        votos_melhor_turno=int(row.get("votos_total") or 0) or None,  # mv ja consolida 2T em votos_total
        partido_sigla=row.get("partido_sigla"),
        partido_numero=row.get("partido_numero"),
        partido_cor=cor,
        partido_logo_url=row.get("partido_logo_url"),
        classificacao=row["classificacao"],
        risco=row["risco"],
        metrica_destaque=metrica,
        potencial_estrategico=float(row["potencial_estrategico"]) if row.get("potencial_estrategico") is not None else None,
        # V2
        status=row["status"],
        votos_faltando=int(row["votos_faltando"]) if row.get("votos_faltando") is not None else None,
        votos_ultimo_eleito=int(row["votos_ultimo_eleito"]) if row.get("votos_ultimo_eleito") is not None else None,
        situacao_tse=row.get("situacao_tse"),
        disputou_segundo_turno=bool(row.get("disputou_segundo_turno", False)),
        # FIFA: pov (tabela) tem prioridade; lite fica como fallback
        overall=overall,
        tier=tier,
        traits=traits,
        atributos_6=atributos_6,
        overall_v9=overall_v9,
    )
