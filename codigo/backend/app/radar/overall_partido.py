"""
Overall FIFA do Partido - analogia ao time no FIFA.

Partidos sao "times" e os candidatos sao "jogadores". O Overall do time
reflete a forca coletiva da bancada num escopo especifico:
  - Nacional (Brasil inteiro)
  - Estadual (UB em SP, UB em MG, ...)
  - Municipal (UB em SP capital, UB em Curitiba, ...)

Funcao pura de leitura - nao escreve no banco, calcula on-demand via SQL.
Se virar gargalo, criar tabela pre-calculada via ETL.
"""
from __future__ import annotations

import math
import time
from datetime import date
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.radar import PartidoFifa


# Cache in-memory do Overall por (partido_id, ano, escopo, escopo_uf).
# O calculo e deterministico pro ciclo eleitoral fechado, entao faz sentido
# cachear. Sem ele, listar_partidos do Radar dispara N+1 queries (~30 partidos
# x 8 queries cada = 7s). Com cache, segunda carga cai pra ~200ms.
# TTL de 1h protege contra drift caso dados do ETL sejam reprocessados.
_FIFA_CACHE: dict[tuple, tuple[float, PartidoFifa]] = {}
_FIFA_CACHE_TTL = 3600.0


def fifa_cache_invalidar() -> int:
    """Limpa o cache de Overall. Retorna quantidade de entradas removidas.
    Chamar quando o ETL reprocessar votos/candidaturas do ciclo."""
    n = len(_FIFA_CACHE)
    _FIFA_CACHE.clear()
    return n


def _tier(overall: Optional[int]) -> Optional[str]:
    if overall is None:
        return None
    if overall >= 85:
        return "dourado"
    if overall >= 75:
        return "ouro"
    if overall >= 65:
        return "prata"
    return "bronze"


async def calcular_overall_partido(
    db: AsyncSession,
    partido_id: int,
    ano: int,
    escopo: str = "nacional",
    escopo_uf: Optional[str] = None,
) -> PartidoFifa:
    """Wrapper cacheado de `_calcular_overall_partido_uncached`.

    Chave: (partido_id, ano, escopo_normalizado, escopo_uf).
    TTL: `_FIFA_CACHE_TTL` (1h). Miss: 8 queries (~200ms). Hit: O(1).
    """
    escopo_norm = "estadual" if (escopo == "estadual" and escopo_uf) else "nacional"
    key = (partido_id, ano, escopo_norm, escopo_uf if escopo_norm == "estadual" else None)
    now = time.monotonic()

    entry = _FIFA_CACHE.get(key)
    if entry is not None:
        ts, cached = entry
        if now - ts < _FIFA_CACHE_TTL:
            return cached

    result = await _calcular_overall_partido_uncached(
        db=db,
        partido_id=partido_id,
        ano=ano,
        escopo=escopo,
        escopo_uf=escopo_uf,
    )
    _FIFA_CACHE[key] = (now, result)
    return result


async def _calcular_overall_partido_uncached(
    db: AsyncSession,
    partido_id: int,
    ano: int,
    escopo: str = "nacional",
    escopo_uf: Optional[str] = None,
) -> PartidoFifa:
    """
    Calcula o Overall FIFA de um partido no escopo dado.

    escopo=nacional : agrega Brasil inteiro no ano
    escopo=estadual : filtra estado_uf

    Nacional e a juncao macro de todos os estaduais. Municipal foi removido
    por gerar dados pouco significativos em cidades pequenas.
    """
    if escopo == "estadual" and escopo_uf:
        where_escopo = "ca.estado_uf = :uf"
        params_escopo = {"uf": escopo_uf}
    else:
        escopo = "nacional"
        where_escopo = "TRUE"
        params_escopo = {}

    base_params = {
        "pid": partido_id,
        "ano": ano,
        **params_escopo,
    }

    # ── Metricas base do ciclo atual ─────────────────────────────────────
    row = (await db.execute(
        text(f"""
            SELECT
              COUNT(*)::int                              AS n_candidaturas,
              COUNT(*) FILTER (WHERE ca.eleito = true)::int AS n_eleitos,
              COALESCE(SUM(
                CASE WHEN COALESCE(ca.votos_2t,0) > 0 THEN ca.votos_2t
                     WHEN COALESCE(ca.votos_1t,0) > 0 THEN ca.votos_1t
                     ELSE COALESCE(ca.votos_total,0) END
              ), 0)::bigint AS votos_total,
              COUNT(DISTINCT ca.estado_uf) FILTER (WHERE ca.eleito = true)::int AS ufs_com_eleito,
              COUNT(*) FILTER (WHERE ca.eleito = true AND UPPER(ca.cargo) = 'PRESIDENTE')::int AS n_presidente,
              COUNT(*) FILTER (WHERE ca.eleito = true AND UPPER(ca.cargo) = 'GOVERNADOR')::int AS n_governador,
              COUNT(*) FILTER (WHERE ca.eleito = true AND UPPER(ca.cargo) = 'SENADOR')::int AS n_senador,
              COUNT(*) FILTER (WHERE ca.eleito = true AND UPPER(ca.cargo) = 'PREFEITO')::int AS n_prefeito,
              COUNT(*) FILTER (WHERE ca.eleito = true AND UPPER(ca.cargo) IN ('DEPUTADO FEDERAL','DEPUTADO ESTADUAL','DEPUTADO DISTRITAL'))::int AS n_deputado,
              COUNT(*) FILTER (WHERE ca.eleito = true AND UPPER(ca.cargo) = 'VEREADOR')::int AS n_vereador
            FROM candidaturas ca
            WHERE ca.partido_id = :pid AND ca.ano = :ano
              AND {where_escopo}
        """),
        base_params,
    )).mappings().first()

    n_cand = int(row["n_candidaturas"] or 0)
    n_eleitos = int(row["n_eleitos"] or 0)
    votos_total = int(row["votos_total"] or 0)
    ufs_com_eleito = int(row["ufs_com_eleito"] or 0)
    n_presidente = int(row["n_presidente"] or 0)
    n_governador = int(row["n_governador"] or 0)
    n_senador = int(row["n_senador"] or 0)
    n_prefeito = int(row["n_prefeito"] or 0)
    n_deputado = int(row["n_deputado"] or 0)
    n_vereador = int(row["n_vereador"] or 0)

    if n_cand == 0:
        return PartidoFifa(escopo=escopo, escopo_uf=escopo_uf)

    # ── 1. ATQ (Poder Eleitoral) ────────────────────────────────────────
    # Volume de votos (60%) + pct eleicao (40%)
    pts_vol = min(math.log10(votos_total + 1) / 8.0, 1.0) * 60  # 100M = 100%
    pct_eleicao = n_eleitos / n_cand if n_cand else 0
    pts_pct = pct_eleicao * 40
    atq = min(99, int(pts_vol + pts_pct))

    # ── 2. MEIO (Qualidade da Bancada) ──────────────────────────────────
    # Taxa reeleicao (50%) + media votos por eleito (50%)
    # Taxa reeleicao: dos eleitos atuais, quantos tambem foram eleitos no ciclo anterior
    meio = None
    if n_eleitos > 0:
        # Media votos por eleito (log scale)
        row_media = (await db.execute(
            text(f"""
                SELECT AVG(
                  CASE WHEN COALESCE(ca.votos_2t,0) > 0 THEN ca.votos_2t
                       WHEN COALESCE(ca.votos_1t,0) > 0 THEN ca.votos_1t
                       ELSE COALESCE(ca.votos_total,0) END
                )::float AS media_votos
                FROM candidaturas ca
                WHERE ca.partido_id = :pid AND ca.ano = :ano
                  AND ca.eleito = true
                  AND {where_escopo}
            """),
            base_params,
        )).mappings().first()
        media_votos = float(row_media["media_votos"] or 0)
        pts_media = min(math.log10(media_votos + 1) / 6.0, 1.0) * 50  # 1M = 100%

        # Taxa de reeleicao: quantos dos eleitos atuais ja eram eleitos no ciclo anterior
        # Proxy: buscar candidatos com mesmo nome_completo eleitos no ciclo anterior
        anos_anteriores = [ano - 2, ano - 4]  # eleicao anterior (2 ou 4 anos atras)
        row_reelect = (await db.execute(
            text(f"""
                WITH eleitos_atual AS (
                    SELECT DISTINCT c.nome_completo
                    FROM candidaturas ca
                    JOIN candidatos c ON c.id = ca.candidato_id
                    WHERE ca.partido_id = :pid AND ca.ano = :ano
                      AND ca.eleito = true
                      AND {where_escopo}
                )
                SELECT COUNT(DISTINCT ea.nome_completo)::int AS reeleitos
                FROM eleitos_atual ea
                WHERE EXISTS (
                    SELECT 1 FROM candidaturas ca2
                    JOIN candidatos c2 ON c2.id = ca2.candidato_id
                    WHERE c2.nome_completo = ea.nome_completo
                      AND ca2.ano = ANY(:anos_ant)
                      AND ca2.eleito = true
                )
            """),
            {**base_params, "anos_ant": anos_anteriores},
        )).mappings().first()
        n_reeleitos = int(row_reelect["reeleitos"] or 0) if row_reelect else 0
        taxa_reeleicao = n_reeleitos / n_eleitos if n_eleitos else 0
        pts_reel = taxa_reeleicao * 50

        meio = min(99, int(pts_media + pts_reel))

    # ── 3. DEF (Influencia Institucional) ───────────────────────────────
    # Calibracao por escopo.
    if escopo == "estadual":
        # Foco: governador + senador + deputados; sem presidente (nacional)
        pts_inst = (
            n_governador * 40
            + n_senador * 20
            + n_prefeito * 2  # prefeitos dentro da UF somam
            + n_deputado * 3
            + n_vereador * 0.2
        )
    else:  # nacional
        pts_inst = (
            n_presidente * 40
            + n_governador * 8
            + n_senador * 6
            + n_prefeito * 3
            + n_deputado * 1
            + n_vereador * 0.3
        )
    defe = min(99, int(pts_inst))

    # ── 4. COESAO (Unidade da Bancada) ──────────────────────────────────
    # Proxy: dos eleitos, quantos sao "fieis" (so tiveram esse partido na carreira)
    coesao = None
    if n_eleitos > 0:
        row_fid = (await db.execute(
            text(f"""
                WITH eleitos_partido AS (
                    SELECT DISTINCT c.id AS cand_id, c.nome_completo
                    FROM candidaturas ca
                    JOIN candidatos c ON c.id = ca.candidato_id
                    WHERE ca.partido_id = :pid AND ca.ano = :ano
                      AND ca.eleito = true
                      AND {where_escopo}
                ),
                unicos_nome AS (
                    SELECT DISTINCT ON (nome_completo) cand_id, nome_completo
                    FROM eleitos_partido
                )
                SELECT
                  COUNT(*)::int AS total_eleitos_unicos,
                  COUNT(*) FILTER (
                    WHERE NOT EXISTS (
                      SELECT 1 FROM candidaturas ca2
                      JOIN candidatos c2 ON c2.id = ca2.candidato_id
                      WHERE c2.nome_completo = u.nome_completo
                        AND ca2.partido_id != :pid
                    )
                  )::int AS fieis_ao_partido
                FROM unicos_nome u
            """),
            base_params,
        )).mappings().first()
        total_u = int(row_fid["total_eleitos_unicos"] or 0) if row_fid else 0
        fieis = int(row_fid["fieis_ao_partido"] or 0) if row_fid else 0
        taxa_fid = fieis / total_u if total_u else 0
        coesao = min(99, int(taxa_fid * 99))

    # ── 5. FIN (Estrutura Financeira) ───────────────────────────────────
    # Arrecadacao total (60%) + diversificacao (40%) dos candidatos do partido no escopo
    row_fin = (await db.execute(
        text(f"""
            SELECT
              COALESCE(SUM(ca.receita_campanha), 0)::bigint AS total_arrec,
              COALESCE(SUM(ca.despesa_campanha), 0)::bigint AS total_gasto,
              COUNT(*) FILTER (WHERE ca.receita_campanha > 0)::int AS n_com_receita
            FROM candidaturas ca
            WHERE ca.partido_id = :pid AND ca.ano = :ano
              AND {where_escopo}
        """),
        base_params,
    )).mappings().first()
    total_arrec = int(row_fin["total_arrec"] or 0) if row_fin else 0
    # Log scale em milhoes: 100M = 100%
    pts_arrec = min(math.log10(total_arrec / 1_000_000 + 1) / 2.0, 1.0) * 60 if total_arrec > 0 else 0

    # Diversificacao = % dos candidatos com receita reportada
    pct_div = (int(row_fin["n_com_receita"] or 0) / n_cand) if n_cand else 0
    pts_div = pct_div * 40
    fin = min(99, int(pts_arrec + pts_div))

    # ── 6. TRADICAO (Anos de existencia + continuidade) ─────────────────
    # Como o schema Partido nao tem data_fundacao, deriva do primeiro ano
    # em que o partido aparece em candidaturas (incluindo predecessores).
    # Considera predecessores (DEM/PSL -> UB) pra nao penalizar UB que tem
    # linhagem longa mas numero novo.
    row_idade = (await db.execute(
        text("""
            SELECT MIN(ca.ano)::int AS primeiro_ano
            FROM candidaturas ca
            WHERE ca.partido_id = :pid
               OR ca.partido_id IN (
                 SELECT p2.id FROM partidos p2
                 WHERE EXISTS (
                   SELECT 1 FROM partidos p1
                   WHERE p1.id = :pid
                     AND p1.predecessores::jsonb @> to_jsonb(p2.numero)
                 )
               )
        """),
        {"pid": partido_id},
    )).mappings().first()

    tradicao = None
    primeiro_ano = int(row_idade["primeiro_ano"]) if row_idade and row_idade.get("primeiro_ano") else None
    if primeiro_ano:
        idade = date.today().year - primeiro_ano
        # Idade (70%): 50 anos = 100%
        pts_idade = min(idade / 50.0, 1.0) * 70

        # Continuidade (30%): nos ultimos 3 ciclos teve eleito?
        row_cont = (await db.execute(
            text(f"""
                SELECT COUNT(DISTINCT ca.ano)::int AS ciclos_com_eleito
                FROM candidaturas ca
                WHERE ca.partido_id = :pid
                  AND ca.ano >= :ano_min
                  AND ca.eleito = true
                  AND {where_escopo}
            """),
            {**base_params, "ano_min": ano - 8},
        )).mappings().first()
        ciclos = int(row_cont["ciclos_com_eleito"] or 0) if row_cont else 0
        pts_cont = min(ciclos / 3.0, 1.0) * 30
        tradicao = min(99, int(pts_idade + pts_cont))

    # ── 7. MOMENTUM (Trajetoria entre ciclos) ───────────────────────────
    # Delta votos + delta eleitos vs ciclo anterior (mesmo cargo mix).
    # Pra simplificar: pega o ano anterior nacional (sem filtrar cargo).
    momentum = None
    anos_anteriores = [ano - 2, ano - 4]
    row_ant = (await db.execute(
        text(f"""
            SELECT
              COALESCE(SUM(
                CASE WHEN COALESCE(ca.votos_2t,0) > 0 THEN ca.votos_2t
                     WHEN COALESCE(ca.votos_1t,0) > 0 THEN ca.votos_1t
                     ELSE COALESCE(ca.votos_total,0) END
              ), 0)::bigint AS votos_ant,
              COUNT(*) FILTER (WHERE ca.eleito = true)::int AS eleitos_ant
            FROM candidaturas ca
            WHERE ca.partido_id = :pid
              AND ca.ano = ANY(:anos_ant)
              AND {where_escopo}
        """),
        {**base_params, "anos_ant": anos_anteriores},
    )).mappings().first()
    if row_ant:
        votos_ant = int(row_ant["votos_ant"] or 0)
        eleitos_ant = int(row_ant["eleitos_ant"] or 0)
        if votos_ant > 0 or eleitos_ant > 0:
            # Delta votos (60%)
            delta_v = ((votos_total - votos_ant) / votos_ant) if votos_ant > 0 else 0
            delta_v = max(-1.0, min(2.0, delta_v))  # cap [-100%, +200%]
            pts_dv = 30 + delta_v * 30  # 30 neutro, cap 0-90
            # Delta eleitos (40%)
            delta_e = ((n_eleitos - eleitos_ant) / eleitos_ant) if eleitos_ant > 0 else 0
            delta_e = max(-1.0, min(2.0, delta_e))
            pts_de = 20 + delta_e * 20  # 20 neutro, cap 0-60

            momentum = max(0, min(99, int(pts_dv + pts_de)))

    # ── OVERALL ─────────────────────────────────────────────────────────
    dims = [d for d in [atq, meio, defe, coesao, fin, tradicao, momentum] if d is not None]
    overall = min(99, int(sum(dims) / len(dims))) if dims else None

    return PartidoFifa(
        escopo=escopo,
        escopo_uf=escopo_uf,
        atq=atq,
        meio=meio,
        defe=defe,
        coesao=coesao,
        fin=fin,
        tradicao=tradicao,
        momentum=momentum,
        overall=overall,
        tier=_tier(overall),
    )
