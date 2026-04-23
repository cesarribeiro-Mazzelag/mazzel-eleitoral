"""015 - MV de benchmarks (cargo, UF, ano) para o Radar Político

Revision ID: 015
Revises: 014
Create Date: 2026-04-11

Migration aditiva (não-destrutiva) que cria a materialized view
`mv_benchmarks_cargo_uf_ano` usada pela Fase 2 do Radar Político para
comparar cada candidatura com a mediana / percentis do par
(cargo, estado_uf, ano).

REGRA CRÍTICA DE GOVERNANÇA: a MV exclui candidaturas com dados inválidos
(votos_total = 0 entre eleitos, despesa = 0 ou NULL). Senão a mediana fica
contaminada e os benchmarks não fazem sentido.

Cobre apenas anos consolidados (2018-2024). Refresh manual após o ETL
de votos terminar.
"""

from alembic import op


revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_benchmarks_cargo_uf_ano AS
        SELECT
            UPPER(ca.cargo)             AS cargo,
            ca.estado_uf,
            ca.ano,
            COUNT(*)                    AS n_candidaturas,
            -- Volume de votos (mediana e percentis sobre quem TEVE votos)
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ca.votos_total)
                FILTER (WHERE ca.votos_total > 0)                  AS votos_mediana,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ca.votos_total)
                FILTER (WHERE ca.votos_total > 0)                  AS votos_p25,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ca.votos_total)
                FILTER (WHERE ca.votos_total > 0)                  AS votos_p75,
            PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY ca.votos_total)
                FILTER (WHERE ca.votos_total > 0)                  AS votos_p90,
            -- Custo por voto: (despesa_campanha / votos_total) — só para
            -- candidaturas com despesa > 0 E votos > 0 (senão a divisão é
            -- inválida ou trivial). Outliers extremos (CPV > 1000 BRL/voto)
            -- são excluídos como dado provavelmente errado do TSE.
            PERCENTILE_CONT(0.50) WITHIN GROUP (
                ORDER BY (ca.despesa_campanha / NULLIF(ca.votos_total, 0))
            ) FILTER (
                WHERE ca.despesa_campanha > 0
                  AND ca.votos_total > 0
                  AND (ca.despesa_campanha / ca.votos_total) <= 1000
            )                                                       AS cpv_mediana,
            PERCENTILE_CONT(0.25) WITHIN GROUP (
                ORDER BY (ca.despesa_campanha / NULLIF(ca.votos_total, 0))
            ) FILTER (
                WHERE ca.despesa_campanha > 0
                  AND ca.votos_total > 0
                  AND (ca.despesa_campanha / ca.votos_total) <= 1000
            )                                                       AS cpv_p25,
            PERCENTILE_CONT(0.75) WITHIN GROUP (
                ORDER BY (ca.despesa_campanha / NULLIF(ca.votos_total, 0))
            ) FILTER (
                WHERE ca.despesa_campanha > 0
                  AND ca.votos_total > 0
                  AND (ca.despesa_campanha / ca.votos_total) <= 1000
            )                                                       AS cpv_p75,
            PERCENTILE_CONT(0.90) WITHIN GROUP (
                ORDER BY (ca.despesa_campanha / NULLIF(ca.votos_total, 0))
            ) FILTER (
                WHERE ca.despesa_campanha > 0
                  AND ca.votos_total > 0
                  AND (ca.despesa_campanha / ca.votos_total) <= 1000
            )                                                       AS cpv_p90,
            -- Quantos candidatos do par têm dados financeiros válidos
            COUNT(*) FILTER (
                WHERE ca.despesa_campanha > 0 AND ca.votos_total > 0
            )                                                       AS n_validos_financeiro
        FROM candidaturas ca
        WHERE ca.ano BETWEEN 2018 AND 2024
        GROUP BY UPPER(ca.cargo), ca.estado_uf, ca.ano
        WITH DATA
    """)

    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_benchmarks_cargo_uf_ano
        ON mv_benchmarks_cargo_uf_ano (cargo, estado_uf, ano)
    """)


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_benchmarks_cargo_uf_ano")
