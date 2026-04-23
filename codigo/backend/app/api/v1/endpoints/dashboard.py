"""
Dashboard Nacional — Visão CEO de Inteligência Eleitoral
Mazzel Tech — dados de todas as eleições, todos os partidos

GET /dashboard/visao-geral
  Parâmetros (todos opcionais):
    anos        = "2022,2024"  (multi-ano separado por vírgula)
    cargo       = "VEREADOR"   (ou "todos")
    estado      = "SP"         (ou "todos")
    partido_ids = "44,25"      (números dos partidos, ou vazio = todos)
    resultado   = "eleito"     (ou "todos")
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional

from app.core.database import get_db
from app.core.deps import requer_qualquer
from app.models.operacional import Usuario

router = APIRouter()

# Cargos em ordem hierárquica
ORDEM_CARGOS = {
    "PRESIDENTE": 1, "GOVERNADOR": 2, "SENADOR": 3,
    "DEPUTADO FEDERAL": 4, "DEPUTADO ESTADUAL": 5, "DEPUTADO DISTRITAL": 6,
    "PREFEITO": 7, "VEREADOR": 8,
}

CARGOS_VALIDOS = set(ORDEM_CARGOS.keys())


def _build_where(
    anos: Optional[str],
    cargo: Optional[str],
    estado: Optional[str],
    partido_ids: Optional[str],
    resultado: Optional[str],
    prefix: str = "ca",
) -> tuple[str, dict]:
    """Monta cláusulas WHERE e dicionário de parâmetros."""
    clauses = []
    params: dict = {}

    # Filtro anos
    if anos:
        anos_list = [int(a.strip()) for a in anos.split(",") if a.strip().isdigit()]
        if anos_list:
            placeholders = ", ".join(f":ano_{i}" for i in range(len(anos_list)))
            clauses.append(f"{prefix}.ano IN ({placeholders})")
            for i, a in enumerate(anos_list):
                params[f"ano_{i}"] = a

    # Filtro cargo
    if cargo and cargo.upper() != "TODOS":
        clauses.append(f"UPPER({prefix}.cargo) = :cargo")
        params["cargo"] = cargo.upper()

    # Filtro estado
    if estado and estado.upper() != "TODOS":
        clauses.append(f"{prefix}.estado_uf = :estado")
        params["estado"] = estado.upper()

    # Filtro partido
    if partido_ids:
        nums = [int(p.strip()) for p in partido_ids.split(",") if p.strip().isdigit()]
        if nums:
            placeholders = ", ".join(f":partido_{i}" for i in range(len(nums)))
            clauses.append(f"p.numero IN ({placeholders})")
            for i, n in enumerate(nums):
                params[f"partido_{i}"] = n

    # Filtro resultado
    if resultado and resultado.lower() == "eleito":
        clauses.append(f"{prefix}.eleito = TRUE")
    elif resultado and resultado.lower() == "nao_eleito":
        clauses.append(f"{prefix}.eleito = FALSE")

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return where, params


@router.get("/visao-geral")
async def get_visao_geral(
    anos: Optional[str] = Query(None, description="Ex: 2022,2024"),
    cargo: Optional[str] = Query(None, description="Cargo ou 'todos'"),
    estado: Optional[str] = Query(None, description="UF ou 'todos'"),
    partido_ids: Optional[str] = Query(None, description="Números separados por vírgula"),
    resultado: Optional[str] = Query(None, description="eleito | nao_eleito | todos"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Dashboard CEO — métricas nacionais com filtros dinâmicos.
    Retorna big numbers, evolução por ano, breakdown por cargo e estados.
    """
    where, params = _build_where(anos, cargo, estado, partido_ids, resultado)
    join_partido = "JOIN partidos p ON p.id = ca.partido_id"

    # ── Big numbers ────────────────────────────────────────────────────────────
    sql_nums = text(f"""
        SELECT
            COUNT(ca.id)                                          AS total_candidatos,
            COUNT(ca.id) FILTER (WHERE ca.eleito = TRUE)         AS total_eleitos,
            COALESCE(SUM(ca.votos_total), 0)                     AS total_votos,
            COUNT(DISTINCT ca.municipio_id)
                FILTER (WHERE ca.votos_total > 0)                AS municipios_com_votos,
            COUNT(DISTINCT ca.municipio_id)
                FILTER (WHERE ca.eleito = TRUE)                  AS municipios_com_eleito,
            COUNT(DISTINCT ca.estado_uf)
                FILTER (WHERE ca.eleito = TRUE)                  AS estados_com_eleito,
            COUNT(DISTINCT ca.estado_uf)                         AS estados_com_candidatos,
            COUNT(DISTINCT ca.partido_id)
                FILTER (WHERE ca.eleito = TRUE)                  AS partidos_com_eleitos,
            COALESCE(SUM(ca.receita_campanha), 0)                AS receita_total,
            COALESCE(SUM(ca.despesa_campanha), 0)                AS despesa_total,
            ROUND(
                100.0 * COUNT(ca.id) FILTER (WHERE ca.eleito = TRUE)
                / NULLIF(COUNT(ca.id), 0), 1
            )                                                    AS taxa_eleicao,
            ROUND(
                100.0 * COUNT(ca.id) FILTER (
                    WHERE ca.eleito = TRUE
                    AND EXISTS (
                        SELECT 1 FROM candidatos cand
                        WHERE cand.id = ca.candidato_id
                        AND UPPER(cand.genero) = 'FEMININO'
                    )
                )
                / NULLIF(COUNT(ca.id) FILTER (WHERE ca.eleito = TRUE), 0), 1
            )                                                    AS pct_mulheres_eleitas,
            COUNT(ca.id) FILTER (
                WHERE EXISTS (
                    SELECT 1 FROM candidatos cand
                    WHERE cand.id = ca.candidato_id
                    AND UPPER(cand.genero) = 'FEMININO'
                )
            )                                                    AS candidatas_femininas,
            (SELECT COUNT(DISTINCT id) FROM municipios)          AS total_municipios
        FROM candidaturas ca
        {join_partido}
        {where}
    """)
    row = (await db.execute(sql_nums, params)).fetchone()

    big_numbers = {
        "total_candidatos":      int(row.total_candidatos or 0),
        "total_eleitos":         int(row.total_eleitos or 0),
        "taxa_eleicao":          float(row.taxa_eleicao or 0),
        "total_votos":           int(row.total_votos or 0),
        "municipios_com_votos":  int(row.municipios_com_votos or 0),
        "municipios_com_eleito": int(row.municipios_com_eleito or 0),
        "total_municipios":      int(row.total_municipios or 0),
        "estados_com_eleito":    int(row.estados_com_eleito or 0),
        "estados_com_candidatos":int(row.estados_com_candidatos or 0),
        "partidos_com_eleitos":  int(row.partidos_com_eleitos or 0),
        "receita_total":         float(row.receita_total or 0),
        "despesa_total":         float(row.despesa_total or 0),
        "pct_mulheres_eleitas":  float(row.pct_mulheres_eleitas or 0),
        "candidatas_femininas":  int(row.candidatas_femininas or 0),
    }

    # ── Evolução por ano ───────────────────────────────────────────────────────
    where_evo, params_evo = _build_where(None, cargo, estado, partido_ids, resultado)
    sql_evo = text(f"""
        SELECT
            ca.ano,
            COUNT(ca.id)                                  AS candidatos,
            COUNT(ca.id) FILTER (WHERE ca.eleito = TRUE)  AS eleitos,
            COALESCE(SUM(ca.votos_total), 0)              AS votos,
            COALESCE(SUM(ca.receita_campanha), 0)         AS receita,
            COALESCE(SUM(ca.despesa_campanha), 0)         AS despesa
        FROM candidaturas ca
        {join_partido}
        {where_evo}
        GROUP BY ca.ano
        ORDER BY ca.ano
    """)
    evo_rows = (await db.execute(sql_evo, params_evo)).fetchall()
    evolucao = [
        {
            "ano": r.ano,
            "candidatos": int(r.candidatos),
            "eleitos": int(r.eleitos),
            "votos": int(r.votos),
            "receita": float(r.receita),
            "despesa": float(r.despesa),
        }
        for r in evo_rows
    ]

    # ── Por cargo ──────────────────────────────────────────────────────────────
    where_cargo, params_cargo = _build_where(anos, None, estado, partido_ids, resultado)
    sql_cargo = text(f"""
        SELECT
            UPPER(ca.cargo)                               AS cargo,
            COUNT(ca.id)                                  AS candidatos,
            COUNT(ca.id) FILTER (WHERE ca.eleito = TRUE)  AS eleitos,
            COALESCE(SUM(ca.votos_total), 0)              AS votos,
            MAX(ca.ano)                                   AS ultimo_ano
        FROM candidaturas ca
        {join_partido}
        {where_cargo}
        GROUP BY UPPER(ca.cargo)
        ORDER BY MIN(
            CASE UPPER(ca.cargo)
                WHEN 'PRESIDENTE'         THEN 1
                WHEN 'GOVERNADOR'         THEN 2
                WHEN 'SENADOR'            THEN 3
                WHEN 'DEPUTADO FEDERAL'   THEN 4
                WHEN 'DEPUTADO ESTADUAL'  THEN 5
                WHEN 'DEPUTADO DISTRITAL' THEN 6
                WHEN 'PREFEITO'           THEN 7
                WHEN 'VEREADOR'           THEN 8
                ELSE 9
            END
        )
    """)
    cargo_rows = (await db.execute(sql_cargo, params_cargo)).fetchall()
    por_cargo = [
        {
            "cargo": r.cargo,
            "candidatos": int(r.candidatos),
            "eleitos": int(r.eleitos),
            "votos": int(r.votos),
            "ultimo_ano": r.ultimo_ano,
        }
        for r in cargo_rows
    ]

    # ── Top estados por eleitos ────────────────────────────────────────────────
    where_uf, params_uf = _build_where(anos, cargo, None, partido_ids, "eleito")
    sql_uf = text(f"""
        SELECT
            ca.estado_uf,
            COUNT(ca.id)                                  AS eleitos,
            COALESCE(SUM(ca.votos_total), 0)              AS votos,
            COUNT(DISTINCT ca.partido_id)                 AS partidos
        FROM candidaturas ca
        {join_partido}
        {where_uf}
        GROUP BY ca.estado_uf
        ORDER BY eleitos DESC
        LIMIT 27
    """)
    uf_rows = (await db.execute(sql_uf, params_uf)).fetchall()
    por_estado = [
        {
            "estado": r.estado_uf,
            "eleitos": int(r.eleitos),
            "votos": int(r.votos),
            "partidos": int(r.partidos),
        }
        for r in uf_rows
    ]

    # ── Top partidos por eleitos ───────────────────────────────────────────────
    where_part, params_part = _build_where(anos, cargo, estado, None, "eleito")
    sql_part = text(f"""
        SELECT
            p.numero,
            p.sigla,
            COUNT(ca.id)                    AS eleitos,
            COALESCE(SUM(ca.votos_total), 0) AS votos
        FROM candidaturas ca
        JOIN partidos p ON p.id = ca.partido_id
        {where_part}
        GROUP BY p.numero, p.sigla
        ORDER BY eleitos DESC
        LIMIT 20
    """)
    part_rows = (await db.execute(sql_part, params_part)).fetchall()
    por_partido = [
        {
            "numero": r.numero,
            "sigla": r.sigla,
            "eleitos": int(r.eleitos),
            "votos": int(r.votos),
        }
        for r in part_rows
    ]

    # ── Anos disponíveis no banco ──────────────────────────────────────────────
    anos_rows = (await db.execute(text(
        "SELECT DISTINCT ano FROM candidaturas ORDER BY ano"
    ))).fetchall()
    anos_disponiveis = [r.ano for r in anos_rows]

    return {
        "big_numbers": big_numbers,
        "evolucao_por_ano": evolucao,
        "por_cargo": por_cargo,
        "por_estado": por_estado,
        "por_partido": por_partido,
        "anos_disponiveis": anos_disponiveis,
        "filtros_aplicados": {
            "anos": anos,
            "cargo": cargo,
            "estado": estado,
            "partido_ids": partido_ids,
            "resultado": resultado,
        },
    }


@router.get("/anos")
async def get_anos_disponiveis(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """Anos eleitorais disponíveis no banco."""
    rows = (await db.execute(text(
        "SELECT DISTINCT ano FROM candidaturas ORDER BY ano"
    ))).fetchall()
    return {"anos": [r.ano for r in rows]}


@router.get("/partidos")
async def get_partidos_disponiveis(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """Partidos com candidaturas no banco."""
    rows = (await db.execute(text("""
        SELECT DISTINCT p.numero, p.sigla, p.nome
        FROM partidos p
        JOIN candidaturas ca ON ca.partido_id = p.id
        ORDER BY p.sigla
    """))).fetchall()
    return {"partidos": [{"numero": r.numero, "sigla": r.sigla, "nome": r.nome} for r in rows]}
