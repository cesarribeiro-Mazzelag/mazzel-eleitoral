"""Indice trigram (pg_trgm) para busca rapida por nome de candidato.

Cesar 17/04/2026. Resolve latencia de 20s na barra de busca do mapa.

Sem este indice, `UPPER(nome) LIKE '%xxx%'` forca sequential scan de
1M+ candidatos no backend (via CTE do Radar). Com o GIN + pg_trgm,
`UPPER(nome_completo) LIKE '%xxx%'` vira index scan em <100ms.

Cria em nome_completo E nome_urna (ambos usados pela busca, via
COALESCE(NULLIF(nome_urna,''), nome_completo)).
"""
from alembic import op


revision = "038"
down_revision = "037"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Extensao pg_trgm (nativa do PostgreSQL, sem instalacao externa)
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # 2. Indices GIN sobre UPPER(nome) para suportar LIKE '%XXX%' com index scan.
    #    CONCURRENTLY evita lock de tabela em producao; em dev/local tambem roda ok.
    #    IF NOT EXISTS torna o script idempotente.
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_candidatos_nome_completo_trgm
        ON candidatos USING gin (UPPER(nome_completo) gin_trgm_ops)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_candidatos_nome_urna_trgm
        ON candidatos USING gin (UPPER(nome_urna) gin_trgm_ops)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_candidatos_nome_urna_trgm")
    op.execute("DROP INDEX IF EXISTS ix_candidatos_nome_completo_trgm")
    # Nao dropa pg_trgm (pode ser usada por outras features)
