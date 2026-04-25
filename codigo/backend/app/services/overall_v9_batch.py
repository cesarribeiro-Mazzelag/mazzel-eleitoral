"""Calculo e persistencia em lote de overall_v9 (fonte unica).

Reusa `compilar_dossie` para garantir que o overall persistido bate com
o que o `/dossie/{id}` calcula em runtime - mesma formula, mesmas regras
por cargo, mesmos arquetipos.

Uso:
- `calcular_e_persistir(db, candidato_id)` - calcula e UPSERT um candidato.
- `listar_candidatos_priorizados(db, ...)` - candidatos para backfill em
  ordem de relevancia (eleitos > altos cargos > altos votos).
- `backfill(db, ids)` - itera ids e chama calcular_e_persistir.

CALC_VERSION versiona a formula. Quando ajustar pesos do FIFA ou
arquetipos, bumpar versao -> backfill regrava com o novo valor.
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.dossie import compilar_dossie
from app.schemas.dossie import DossiePolitico

CALC_VERSION = "v9.0"


async def persistir_overall_v9_de_dossie(
    db: AsyncSession,
    candidato_id: int,
    dossie: DossiePolitico,
) -> Optional[int]:
    """UPSERT na politico_overall_v9 a partir de um dossie ja compilado.

    Usado pelo endpoint `/dossie/{id}` como lazy warmup (toda visualizacao
    de dossie alimenta a tabela que o `/radar` consome). Idempotente.

    Retorna o overall persistido ou None quando o dossie e sparse demais
    pra ter ciclo_ano.
    """
    fifa = dossie.inteligencia.overall_fifa
    v9 = dossie.inteligencia.overall_v9
    arquetipos = dossie.inteligencia.arquetipos or []
    ano_ciclo = dossie.ano_ciclo_ativo

    if ano_ciclo is None:
        return None

    overall = fifa.overall if fifa else None

    await db.execute(
        text(
            """
            INSERT INTO politico_overall_v9 (
                candidato_id, ciclo_ano,
                atv, leg, bse, inf, mid, pac,
                overall, tier,
                traits, arquetipos,
                bonus_aplicados, penalidades_aplicadas,
                calc_version, calculado_em
            ) VALUES (
                :candidato_id, :ciclo_ano,
                :atv, :leg, :bse, :inf, :mid, :pac,
                :overall, :tier,
                CAST(:traits AS JSONB), CAST(:arquetipos AS JSONB),
                CAST(:bonus AS JSONB), CAST(:penalidades AS JSONB),
                :calc_version, now()
            )
            ON CONFLICT (candidato_id, ciclo_ano) DO UPDATE SET
                atv = EXCLUDED.atv,
                leg = EXCLUDED.leg,
                bse = EXCLUDED.bse,
                inf = EXCLUDED.inf,
                mid = EXCLUDED.mid,
                pac = EXCLUDED.pac,
                overall = EXCLUDED.overall,
                tier = EXCLUDED.tier,
                traits = EXCLUDED.traits,
                arquetipos = EXCLUDED.arquetipos,
                bonus_aplicados = EXCLUDED.bonus_aplicados,
                penalidades_aplicadas = EXCLUDED.penalidades_aplicadas,
                calc_version = EXCLUDED.calc_version,
                calculado_em = now()
            """
        ),
        {
            "candidato_id": candidato_id,
            "ciclo_ano": int(ano_ciclo),
            "atv": v9.ATV if v9 else None,
            "leg": v9.LEG if v9 else None,
            "bse": v9.BSE if v9 else None,
            "inf": v9.INF if v9 else None,
            "mid": v9.MID if v9 else None,
            "pac": v9.PAC if v9 else None,
            "overall": overall,
            "tier": fifa.tier if fifa else None,
            "traits": _to_json(fifa.traits if fifa else []),
            "arquetipos": _to_json(arquetipos),
            "bonus": _to_json(fifa.bonus_aplicados if fifa else []),
            "penalidades": _to_json(fifa.penalidades_aplicadas if fifa else []),
            "calc_version": CALC_VERSION,
        },
    )
    await db.commit()
    return overall


async def calcular_e_persistir(
    db: AsyncSession,
    candidato_id: int,
) -> Optional[int]:
    """Compila o dossie e persiste o overall (usado pelo backfill em lote).

    Retorna o overall persistido (0-99) ou None quando o candidato nao
    tem dados suficientes pro calculo (sparse).
    """
    try:
        dossie = await compilar_dossie(db, candidato_id, ano_ciclo=None)
    except ValueError:
        return None
    return await persistir_overall_v9_de_dossie(db, candidato_id, dossie)


async def listar_candidatos_priorizados(
    db: AsyncSession,
    only_eleitos: bool = True,
    min_votos: int = 0,
    cargos: Optional[list[str]] = None,
    limit: Optional[int] = None,
) -> list[int]:
    """Candidato_ids em ordem de relevancia para backfill.

    Estrategia padrao: eleitos primeiro, ordenados por votos_total DESC.
    Quando `only_eleitos=False`, expande para nao-eleitos com
    `votos_total >= min_votos`.
    """
    where = []
    params: dict = {}
    if only_eleitos:
        where.append("eleito = TRUE")
    if min_votos > 0:
        where.append("votos_total >= :min_votos")
        params["min_votos"] = min_votos
    if cargos:
        placeholders = ", ".join(f":cargo_{i}" for i in range(len(cargos)))
        where.append(f"UPPER(cargo) IN ({placeholders})")
        for i, c in enumerate(cargos):
            params[f"cargo_{i}"] = c.upper()

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""
    limit_sql = f"LIMIT {int(limit)}" if limit else ""

    sql = f"""
        SELECT DISTINCT ON (candidato_id) candidato_id
        FROM candidaturas
        {where_sql}
        ORDER BY candidato_id, ano DESC, votos_total DESC NULLS LAST
        {limit_sql}
    """
    rows = (await db.execute(text(sql), params)).all()
    return [r.candidato_id for r in rows if r.candidato_id is not None]


async def backfill(
    db: AsyncSession,
    candidato_ids: list[int],
    log_every: int = 100,
) -> dict:
    """Itera candidato_ids e chama calcular_e_persistir.

    Sequencial (uma sessao DB) para evitar contention. Loga progresso
    a cada `log_every`. Retorna estatisticas finais.
    """
    total = len(candidato_ids)
    ok = 0
    sparse = 0
    erro = 0

    for idx, cid in enumerate(candidato_ids, start=1):
        try:
            res = await calcular_e_persistir(db, cid)
            if res is None:
                sparse += 1
            else:
                ok += 1
        except Exception as e:
            erro += 1
            print(f"[ERR] candidato_id={cid}: {e}")
            try:
                await db.rollback()
            except Exception:
                pass

        if idx % log_every == 0:
            print(f"[{idx}/{total}] ok={ok} sparse={sparse} erro={erro}")

    return {"total": total, "ok": ok, "sparse": sparse, "erro": erro}


def _to_json(value) -> str:
    """Serializa lista/dict como JSON string para passar pro CAST(:x AS JSONB)."""
    import json

    return json.dumps(value or [], ensure_ascii=False)
