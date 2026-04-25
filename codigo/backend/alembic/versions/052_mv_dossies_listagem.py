"""052 - MV mv_dossies_listagem (1 row por candidato).

Cesar 25/04/2026: a `mv_radar_politicos` tem 1 row por CANDIDATURA (1.5M).
A UI da Biblioteca de Dossies mostra 1 cartinha por PESSOA (~700k), entao
toda chamada a `/dossies` fazia `DISTINCT ON (candidato_id) ... ORDER BY
candidato_id, ano DESC` em runtime. EXPLAIN ANALYZE mostrou 1.95s de SQL
puro com sort externo em disco (106 MB temp).

Esta MV pre-computa esse DISTINCT ON. Latencia esperada: 4s -> ~50-100ms.

Refresh: junto com `mv_radar_politicos` (mesmo gatilho ETL). Como tem
UNIQUE INDEX em candidato_id, suporta REFRESH MATERIALIZED VIEW
CONCURRENTLY (sem bloquear leituras).

Quando o /dossies passar a consumir esta MV, o codigo do
`app/dossie/listagem.py` deixa de fazer DISTINCT ON em runtime.
"""
from alembic import op


revision      = "052"
down_revision = "051"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # MV: 1 row por candidato_id (candidatura mais recente).
    op.execute("""
        CREATE MATERIALIZED VIEW mv_dossies_listagem AS
        SELECT DISTINCT ON (candidato_id) *
        FROM mv_radar_politicos
        ORDER BY candidato_id, ano DESC
    """)

    # UNIQUE INDEX em candidato_id - obrigatorio pra REFRESH CONCURRENTLY.
    op.execute("""
        CREATE UNIQUE INDEX ux_mv_dossies_listagem_candidato
        ON mv_dossies_listagem (candidato_id)
    """)

    # Indices de filtro (espelham os da mv_radar_politicos).
    op.execute("CREATE INDEX ix_mv_dossies_cargo ON mv_dossies_listagem (cargo)")
    op.execute("CREATE INDEX ix_mv_dossies_estado ON mv_dossies_listagem (estado_uf)")
    op.execute("CREATE INDEX ix_mv_dossies_ano ON mv_dossies_listagem (ano)")
    op.execute("CREATE INDEX ix_mv_dossies_partido ON mv_dossies_listagem (partido_numero)")
    op.execute("CREATE INDEX ix_mv_dossies_eleito ON mv_dossies_listagem (eleito)")
    op.execute("CREATE INDEX ix_mv_dossies_classif ON mv_dossies_listagem (classificacao)")
    op.execute("CREATE INDEX ix_mv_dossies_status ON mv_dossies_listagem (status)")
    op.execute("CREATE INDEX ix_mv_dossies_potencial ON mv_dossies_listagem (potencial_estrategico DESC NULLS LAST)")
    # Trigram em UPPER(nome) pra busca substring rapida (igual MV original).
    op.execute("CREATE INDEX ix_mv_dossies_nome_trgm ON mv_dossies_listagem USING gin (UPPER(nome) gin_trgm_ops)")


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_dossies_listagem")
