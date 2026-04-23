"""Materialized View do Radar Politico (mv_radar_politicos).

Cesar 17/04/2026. Resolve latencia de 47s na listagem do Radar.

Antes: cada request do `/radar/politicos` roda a CTE completa sobre
1.079.525 candidaturas — dedup por GROUP BY, duas window functions
(PERCENT_RANK + LAG) e multiplos JOINs. Pra servir 30 cards.

Depois: a CTE vira MATERIALIZED VIEW pre-calculada. Listagem vira
SELECT direto da MV com indices nos filtros comuns. ~100-300ms.

REFRESH deve ser rodado apos cada ETL grande (ver endpoint admin):
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_radar_politicos;

NOTA: a logica SQL aqui e IDENTICA a _BASE_CTE em
`app/radar/dimensions/politicos.py` — se alterar uma, alterar a outra,
ou melhor ainda, apagar a CTE inline e deixar apenas a MV.
"""
from alembic import op


revision = "039"
down_revision = "038"
branch_labels = None
depends_on = None


MV_SQL = """
CREATE MATERIALIZED VIEW mv_radar_politicos AS
WITH
-- 1. Set de candidato_ids que tem mandato legislativo ativo
mandatos_ativos AS (
    SELECT DISTINCT candidato_id
    FROM mandatos_legislativo
    WHERE ativo = true AND candidato_id IS NOT NULL
),

-- 2. Menor voto entre eleitos por (cargo, municipio, ano)
corte_eleitos AS (
    SELECT
        UPPER(cargo) AS cargo,
        municipio_id,
        estado_uf,
        ano,
        MIN(CASE WHEN votos_total > 0 THEN votos_total END) AS menor_voto_eleito
    FROM candidaturas
    WHERE eleito = TRUE
    GROUP BY UPPER(cargo), municipio_id, estado_uf, ano
),

-- 3. Deduplicacao de 2o turno (ver comentario em _BASE_CTE)
candidaturas_dedup AS (
    SELECT
        (ARRAY_AGG(ca.id ORDER BY ca.votos_total DESC NULLS LAST))[1] AS id,
        (ARRAY_AGG(ca.candidato_id ORDER BY ca.votos_total DESC NULLS LAST))[1] AS candidato_id,
        UPPER(ca.cargo) AS cargo,
        ca.municipio_id,
        ca.estado_uf,
        (ARRAY_AGG(ca.partido_id ORDER BY ca.votos_total DESC NULLS LAST))[1] AS partido_id,
        ca.ano,
        BOOL_OR(ca.eleito) AS eleito,
        MAX(COALESCE(ca.votos_total, 0)) AS votos_total,
        (ARRAY_AGG(ca.situacao_final ORDER BY ca.eleito DESC, ca.votos_total DESC NULLS LAST))[1] AS situacao_final,
        BOOL_OR(UPPER(COALESCE(ca.situacao_final, '')) = '2º TURNO') AS disputou_segundo_turno,
        MAX(ca.despesa_campanha) AS despesa_campanha,
        MAX(ca.receita_campanha) AS receita_campanha
    FROM candidaturas ca
    JOIN candidatos c ON c.id = ca.candidato_id
    GROUP BY c.sequencial_tse, UPPER(ca.cargo), ca.municipio_id, ca.estado_uf, ca.ano
),

base AS (
    SELECT
        cd.id                                       AS candidatura_id,
        cd.candidato_id                             AS candidato_id,
        COALESCE(NULLIF(c.nome_urna,''), c.nome_completo) AS nome,
        c.foto_url                                  AS foto_url,
        cd.cargo,
        cd.estado_uf,
        cd.ano,
        cd.eleito,
        cd.situacao_final                           AS situacao_tse,
        cd.votos_total,
        cd.disputou_segundo_turno,
        p.sigla                                     AS partido_sigla,
        p.numero                                    AS partido_numero,
        p.logo_url                                  AS partido_logo_url,
        m.nome                                      AS municipio_nome,
        ce.menor_voto_eleito                        AS votos_ultimo_eleito,
        CASE
            WHEN cd.eleito = TRUE THEN NULL
            WHEN ce.menor_voto_eleito IS NOT NULL
                THEN ce.menor_voto_eleito - cd.votos_total
            ELSE NULL
        END                                         AS votos_faltando,
        CASE
            WHEN cd.eleito = TRUE
                THEN 'ELEITO'
            WHEN ma.candidato_id IS NOT NULL
                THEN 'SUPLENTE_ASSUMIU'
            WHEN UPPER(COALESCE(cd.situacao_final, '')) = 'SUPLENTE'
                THEN 'SUPLENTE_ESPERA'
            ELSE 'NAO_ELEITO'
        END                                         AS status,
        PERCENT_RANK() OVER (
            PARTITION BY cd.cargo, cd.estado_uf, cd.ano
            ORDER BY cd.votos_total
        )                                           AS pct_rank,
        LAG(cd.votos_total) OVER (
            PARTITION BY cd.candidato_id, cd.cargo
            ORDER BY cd.ano
        )                                           AS votos_anterior
    FROM candidaturas_dedup cd
    JOIN candidatos c ON c.id = cd.candidato_id
    JOIN partidos   p ON p.id = cd.partido_id
    LEFT JOIN municipios m ON m.id = cd.municipio_id
    LEFT JOIN mandatos_ativos ma ON ma.candidato_id = cd.candidato_id
    LEFT JOIN corte_eleitos ce
        ON ce.cargo = cd.cargo
        AND ce.municipio_id = cd.municipio_id
        AND ce.estado_uf = cd.estado_uf
        AND ce.ano = cd.ano
)
SELECT
    b.*,
    CASE
        WHEN eleito = TRUE AND votos_total = 0
            THEN 'INDISPONIVEL'
        WHEN votos_total = 0
            THEN 'CRITICO'
        WHEN eleito = TRUE AND pct_rank >= 0.75
            THEN 'FORTE'
        WHEN votos_anterior IS NOT NULL
             AND votos_anterior > 0
             AND votos_total::float / votos_anterior >= 1.30
            THEN 'EM_CRESCIMENTO'
        WHEN eleito = TRUE
            THEN 'FORTE'
        WHEN pct_rank < 0.25
            THEN 'EM_RISCO'
        ELSE 'EM_RISCO'
    END AS classificacao,
    CASE
        WHEN eleito = TRUE AND votos_total = 0       THEN 'MEDIO'
        WHEN eleito = TRUE AND pct_rank >= 0.50      THEN 'BAIXO'
        WHEN eleito = TRUE OR pct_rank >= 0.50       THEN 'MEDIO'
        ELSE 'ALTO'
    END AS risco,
    (pct_rank * 100.0
        + CASE WHEN eleito THEN 25.0 ELSE 0.0 END
        + CASE WHEN status = 'SUPLENTE_ASSUMIU' THEN 15.0 ELSE 0.0 END
    ) AS potencial_estrategico
FROM base b
"""


def upgrade() -> None:
    op.execute(MV_SQL)

    # UNIQUE INDEX e obrigatorio para REFRESH CONCURRENTLY
    op.execute(
        "CREATE UNIQUE INDEX uq_mv_radar_politicos_cid "
        "ON mv_radar_politicos (candidatura_id)"
    )

    # Indices para os filtros mais comuns do Radar
    op.execute("CREATE INDEX ix_mv_radar_pol_cargo ON mv_radar_politicos (cargo)")
    op.execute("CREATE INDEX ix_mv_radar_pol_uf ON mv_radar_politicos (estado_uf)")
    op.execute("CREATE INDEX ix_mv_radar_pol_ano ON mv_radar_politicos (ano)")
    op.execute("CREATE INDEX ix_mv_radar_pol_partido ON mv_radar_politicos (partido_numero)")
    op.execute("CREATE INDEX ix_mv_radar_pol_classif ON mv_radar_politicos (classificacao)")
    op.execute("CREATE INDEX ix_mv_radar_pol_risco ON mv_radar_politicos (risco)")
    op.execute("CREATE INDEX ix_mv_radar_pol_status ON mv_radar_politicos (status)")
    op.execute("CREATE INDEX ix_mv_radar_pol_eleito ON mv_radar_politicos (eleito)")
    # ORDER BY potencial_estrategico DESC (default do endpoint)
    op.execute(
        "CREATE INDEX ix_mv_radar_pol_potencial "
        "ON mv_radar_politicos (potencial_estrategico DESC NULLS LAST)"
    )
    # Busca trigram em nome (autocomplete dentro do radar)
    op.execute(
        "CREATE INDEX ix_mv_radar_pol_nome_trgm "
        "ON mv_radar_politicos USING gin (UPPER(nome) gin_trgm_ops)"
    )


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_radar_politicos")
