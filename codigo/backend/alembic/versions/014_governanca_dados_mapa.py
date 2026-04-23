"""014 - Governança de dados do mapa: app_status, etl_executions, mv_validacao_votos, validado_em

Revision ID: 014
Revises: 013
Create Date: 2026-04-10

Migration aditiva (não-destrutiva) que prepara a infraestrutura de governança
para a operação de correção de dados do mapa eleitoral (Trilha B).

Cria:
1. Tabela `app_status` — flag global de bloqueio do mapa (com timeout de 4h)
2. Tabela `etl_executions` — log de execuções do ETL com dataset_hash
3. Materialized view `mv_validacao_votos` — divergências candidatura×votos_por_zona
4. Coluna `validado_em` em `candidaturas` e `votos_por_zona`

Nenhum dado existente é modificado. Pode ser revertida sem perda.
"""

from alembic import op


revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. app_status ────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS app_status (
            chave         TEXT PRIMARY KEY,
            valor         TEXT NOT NULL,
            expires_at    TIMESTAMPTZ,
            atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("""
        INSERT INTO app_status (chave, valor, expires_at)
        VALUES ('mapa_bloqueado', 'false', NULL)
        ON CONFLICT (chave) DO NOTHING
    """)

    # ── 2. etl_executions ────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS etl_executions (
            id                    SERIAL PRIMARY KEY,
            script_nome           VARCHAR(100) NOT NULL,
            ano_alvo              INTEGER NOT NULL,
            arquivo_nome          TEXT NOT NULL,
            arquivo_tamanho_bytes BIGINT NOT NULL,
            dataset_hash          TEXT NOT NULL,
            iniciado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            finalizado_em         TIMESTAMPTZ,
            status                VARCHAR(20) NOT NULL,
            rows_inserted         INTEGER,
            rows_skipped          INTEGER,
            error_message         TEXT,
            forcado               BOOLEAN NOT NULL DEFAULT FALSE
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_etl_dataset_hash
        ON etl_executions (dataset_hash, status)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_etl_arquivo_nome
        ON etl_executions (arquivo_nome, status, ano_alvo)
    """)

    # ── 3. mv_validacao_votos ────────────────────────────────────────────
    op.execute("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_validacao_votos AS
        SELECT
            ca.id              AS candidatura_id,
            ca.ano,
            UPPER(ca.cargo)    AS cargo,
            ca.estado_uf,
            ca.votos_total     AS votos_declarados,
            COALESCE(SUM(vpz.qt_votos), 0) AS votos_somados,
            COALESCE(SUM(vpz.qt_votos), 0) - ca.votos_total AS divergencia,
            CASE
                WHEN ABS(COALESCE(SUM(vpz.qt_votos), 0) - ca.votos_total)
                     <= GREATEST(ca.votos_total * 0.01, 5)
                  THEN 'VALIDADO'
                WHEN ca.votos_total > 0
                 AND ABS(COALESCE(SUM(vpz.qt_votos), 0) - ca.votos_total) / ca.votos_total::float > 0.05
                  THEN 'DIVERGENTE'
                ELSE 'EM_VALIDACAO'
            END AS dataset_status
        FROM candidaturas ca
        LEFT JOIN votos_por_zona vpz ON vpz.candidatura_id = ca.id
        GROUP BY ca.id, ca.ano, ca.cargo, ca.estado_uf, ca.votos_total
        WITH DATA
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_validacao_votos
        ON mv_validacao_votos (candidatura_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_mv_validacao_status
        ON mv_validacao_votos (dataset_status, ano)
    """)

    # ── 4. coluna validado_em (auditoria) ────────────────────────────────
    op.execute("""
        ALTER TABLE candidaturas
        ADD COLUMN IF NOT EXISTS validado_em TIMESTAMPTZ NULL
    """)
    op.execute("""
        ALTER TABLE votos_por_zona
        ADD COLUMN IF NOT EXISTS validado_em TIMESTAMPTZ NULL
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE votos_por_zona DROP COLUMN IF EXISTS validado_em")
    op.execute("ALTER TABLE candidaturas DROP COLUMN IF EXISTS validado_em")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_validacao_votos")
    op.execute("DROP TABLE IF EXISTS etl_executions")
    op.execute("DROP TABLE IF EXISTS app_status")
