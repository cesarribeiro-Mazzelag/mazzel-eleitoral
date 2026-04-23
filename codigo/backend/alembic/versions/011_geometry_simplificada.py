"""011 - Geometria pré-simplificada + índices GIST para performance do mapa

Revision ID: 011
Revises: 010
Create Date: 2026-04-08

Problema: ST_SimplifyPreserveTopology executado em runtime para 5.570 municípios
a cada requisição fria era o maior gargalo de latência do mapa (~10-30s).

Solução:
  1. Adiciona coluna geometry_brasil (tolerância 0.01° para nível Brasil)
  2. Adiciona coluna geometry_estado (tolerância 0.001° para nível estado)
  3. Pré-computa ambas via UPDATE (executa uma vez, leitura é instantânea)
  4. Cria índices GIST em todas as colunas de geometria
  5. Cria índice parcial em candidaturas (ano, cargo, municipio_id, eleito)
     para acelerar as queries de partido dominante

Resultado esperado: latência Brasil de 10-30s → <1s após primeira requisição.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Colunas de geometria pré-simplificada ─────────────────────────────
    op.execute("""
        ALTER TABLE municipios
        ADD COLUMN IF NOT EXISTS geometry_brasil geometry(MultiPolygon, 4326),
        ADD COLUMN IF NOT EXISTS geometry_estado  geometry(MultiPolygon, 4326)
    """)

    # ── 2. Pré-computar geometrias (executa uma vez) ──────────────────────────
    # Nível Brasil: tolerância 0.01° (~1km) — suficiente para ver o país inteiro
    op.execute("""
        UPDATE municipios
        SET geometry_brasil = ST_Multi(
            ST_SimplifyPreserveTopology(geometry, 0.01)
        )
        WHERE geometry IS NOT NULL
          AND geometry_brasil IS NULL
    """)

    # Nível estado: tolerância 0.001° (~100m) — suficiente para ver municípios
    op.execute("""
        UPDATE municipios
        SET geometry_estado = ST_Multi(
            ST_SimplifyPreserveTopology(geometry, 0.001)
        )
        WHERE geometry IS NOT NULL
          AND geometry_estado IS NULL
    """)

    # ── 3. Índices GIST ───────────────────────────────────────────────────────
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_municipios_geometry_gist
        ON municipios USING GIST (geometry)
        WHERE geometry IS NOT NULL
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_municipios_geometry_brasil_gist
        ON municipios USING GIST (geometry_brasil)
        WHERE geometry_brasil IS NOT NULL
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_municipios_geometry_estado_gist
        ON municipios USING GIST (geometry_estado)
        WHERE geometry_estado IS NOT NULL
    """)

    # ── 4. Índice composto em candidaturas para queries de partido dominante ──
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_candidatura_mapa_brasil
        ON candidaturas (ano, cargo, municipio_id, eleito, partido_id, votos_total)
        WHERE municipio_id IS NOT NULL
    """)

    # Índice para farol_municipio (lookup por municipio + ano + cargo + partido)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_farol_mapa_lookup
        ON farol_municipio (municipio_id, ano_referencia, cargo, partido_id)
        WHERE partido_id IS NOT NULL
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_farol_mapa_lookup")
    op.execute("DROP INDEX IF EXISTS ix_candidatura_mapa_brasil")
    op.execute("DROP INDEX IF EXISTS ix_municipios_geometry_estado_gist")
    op.execute("DROP INDEX IF EXISTS ix_municipios_geometry_brasil_gist")
    op.execute("DROP INDEX IF EXISTS ix_municipios_geometry_gist")
    op.execute("ALTER TABLE municipios DROP COLUMN IF EXISTS geometry_estado")
    op.execute("ALTER TABLE municipios DROP COLUMN IF EXISTS geometry_brasil")
