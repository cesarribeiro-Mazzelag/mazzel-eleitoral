"""
Listagem do Radar — Partidos.

Cards de partidos no ciclo de referência (default = ano mais recente disponível).
Cada card mostra:

- presença territorial (nº de UFs com pelo menos 1 eleito naquele ciclo)
- nº de eleitos / nº de candidaturas
- votos totais somados
- variação % vs. ciclo anterior comparável
- classificação simplificada (FORTE / EM_RISCO / etc)

Tudo em SQL agregado (GROUP BY p.id), uma única query por requisição.

Classificação simplificada Fase 1:
- FORTE          : presenca_territorial >= 10 UFs OU n_eleitos no top 10% nacional
- EM_CRESCIMENTO : variacao_inter_ciclo >= +20%
- EM_RISCO       : variacao_inter_ciclo <= -20% OU presenca <= 3 UFs
- INDISPONIVEL   : sem dados do partido no ano de referência

Fase 2 substituirá por benchmark contra mediana de partidos pares.
"""
from __future__ import annotations
import asyncio
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.radar import (
    FiltrosPartidos,
    MetricaDestaque,
    PartidoCard,
    RadarPartidosResponse,
)
from app.services.cores_partidos import get_cor_partido
from app.services.validacao_dados import sanear_crescimento
from app.radar.overall_partido import calcular_overall_partido


PARTIDOS_UB = (44, 25, 17)

_ORDENACAO_SQL = {
    "votos_total":          "votos_total DESC NULLS LAST",
    "presenca_territorial": "presenca_territorial DESC, votos_total DESC NULLS LAST",
    "variacao_inter_ciclo": "variacao_inter_ciclo DESC NULLS LAST",
    "sigla":                "sigla ASC",
}


async def _resolver_ano_referencia(db: AsyncSession, ano_filtro: Optional[int]) -> int:
    """Se o filtro vier vazio, usa o último ano com dados em candidaturas."""
    if ano_filtro is not None:
        return ano_filtro
    row = await db.execute(text("SELECT MAX(ano) FROM candidaturas"))
    return int(row.scalar() or 2024)


async def listar_partidos(
    db: AsyncSession,
    filtros: FiltrosPartidos,
) -> RadarPartidosResponse:
    """Devolve a página da listagem do Radar — Partidos."""
    ano_ref = await _resolver_ano_referencia(db, filtros.ano)

    # Ano "anterior comparável": para municipal (2024,2020), o anterior é 4 anos antes
    # (mesmo tipo de eleição). Para geral (2022,2018), idem.
    # Heurística simples: subtrair 4. Se não houver dados, variacao vira None.
    ano_anterior = ano_ref - 4

    where_parts: list[str] = []
    params: dict = {"ano_ref": ano_ref, "ano_anterior": ano_anterior}

    if filtros.busca:
        where_parts.append(
            "(UPPER(p.sigla) LIKE :busca OR UPPER(p.nome) LIKE :busca)"
        )
        params["busca"] = f"%{filtros.busca.upper()}%"

    where_sql = " AND ".join(where_parts) if where_parts else "TRUE"
    ordem = _ORDENACAO_SQL.get(filtros.ordenar_por, _ORDENACAO_SQL["votos_total"])
    offset = (filtros.pagina - 1) * filtros.por_pagina
    params["limit"] = filtros.por_pagina
    params["offset"] = offset

    sql = f"""
        WITH atual AS (
            SELECT
                p.id                AS partido_id,
                p.sigla,
                p.numero,
                p.nome,
                p.logo_url,
                COUNT(*)            AS n_candidaturas,
                COUNT(*) FILTER (WHERE ca.eleito = TRUE)              AS n_eleitos,
                COUNT(DISTINCT ca.estado_uf) FILTER (WHERE ca.eleito) AS presenca_territorial,
                COALESCE(SUM(ca.votos_total), 0)                      AS votos_total
            FROM partidos p
            LEFT JOIN candidaturas ca
                   ON ca.partido_id = p.id AND ca.ano = :ano_ref
            WHERE {where_sql}
            GROUP BY p.id, p.sigla, p.numero, p.nome, p.logo_url
        ),
        anterior AS (
            SELECT
                p.id                                AS partido_id,
                COALESCE(SUM(ca.votos_total), 0)    AS votos_anterior,
                COUNT(*)                            AS n_candidaturas_anterior
            FROM partidos p
            LEFT JOIN candidaturas ca
                   ON ca.partido_id = p.id AND ca.ano = :ano_anterior
            WHERE {where_sql}
            GROUP BY p.id
        )
        SELECT
            a.*,
            CASE
                -- Comparação só faz sentido se o partido tinha volume real
                -- na eleição anterior (>500k votos). Mesmo assim, capamos
                -- variações absurdas (>5x = +500%) que tipicamente vêm de
                -- glitches de dados (fusões, reclassificações partidárias)
                -- e não de crescimento orgânico real.
                WHEN ant.votos_anterior >= 500000 THEN
                    LEAST(
                        5.0,
                        (a.votos_total::float - ant.votos_anterior) / ant.votos_anterior
                    )
                ELSE NULL
            END AS variacao_inter_ciclo
        FROM atual a
        LEFT JOIN anterior ant ON ant.partido_id = a.partido_id
        ORDER BY {ordem}
        LIMIT :limit OFFSET :offset
    """

    count_sql = f"""
        SELECT COUNT(*)
        FROM partidos p
        WHERE {where_sql}
    """

    rows = (await db.execute(text(sql), params)).mappings().all()
    total = (await db.execute(text(count_sql), params)).scalar() or 0

    items = [_row_to_card(r, ano_ref) for r in rows]

    # Enriquecimento: Overall FIFA nacional de cada partido no ano (sequencial
    # pra nao saturar a conexao async do SQLAlchemy; ~30 partidos/pagina).
    for card in items:
        try:
            card.fifa = await calcular_overall_partido(
                db=db,
                partido_id=card.partido_id,
                ano=ano_ref,
                escopo="nacional",
            )
        except Exception:
            card.fifa = None

    return RadarPartidosResponse(
        items=items,
        total=int(total),
        pagina=filtros.pagina,
        por_pagina=filtros.por_pagina,
    )


def _row_to_card(row, ano_ref: int) -> PartidoCard:
    n_eleitos = int(row["n_eleitos"] or 0)
    presenca = int(row["presenca_territorial"] or 0)
    var_inter = row.get("variacao_inter_ciclo")
    var_raw = float(var_inter) if var_inter is not None else None
    # Aplica governança: variação > 500% vira None (provavelmente glitch).
    # O cap em 500% no SQL é a primeira linha de defesa; aqui é a segunda.
    var_inter_f = sanear_crescimento(var_raw)

    # Classificação simples Fase 1
    if int(row["n_candidaturas"] or 0) == 0:
        classificacao = "INDISPONIVEL"
    elif presenca >= 10 or n_eleitos >= 50:
        classificacao = "FORTE"
    elif var_inter_f is not None and var_inter_f >= 0.20:
        classificacao = "EM_CRESCIMENTO"
    elif (var_inter_f is not None and var_inter_f <= -0.20) or presenca <= 3:
        classificacao = "EM_RISCO"
    else:
        classificacao = "EM_RISCO"  # default conservador na Fase 1

    metrica = MetricaDestaque(
        chave="n_eleitos",
        valor=float(n_eleitos),
        label="Eleitos",
        formato="numero",
    )

    return PartidoCard(
        partido_id=int(row["partido_id"]),
        sigla=row["sigla"],
        numero=int(row["numero"]),
        nome=row["nome"],
        logo_url=row.get("logo_url"),
        ano_referencia=ano_ref,
        presenca_territorial=presenca,
        n_eleitos=n_eleitos,
        n_candidaturas=int(row["n_candidaturas"] or 0),
        votos_total=int(row["votos_total"] or 0),
        variacao_inter_ciclo=var_inter_f,
        classificacao=classificacao,
        metrica_destaque=metrica,
    )
