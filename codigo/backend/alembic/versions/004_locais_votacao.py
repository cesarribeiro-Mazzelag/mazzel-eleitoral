"""004 — Tabela locais_votacao (escolas/seções com lat/lng do TSE)

Revision ID: 004
Revises: 003
Create Date: 2026-04-05
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "locais_votacao",
        sa.Column("id",           sa.Integer(),     primary_key=True),
        sa.Column("municipio_id", sa.Integer(),     sa.ForeignKey("municipios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("zona_id",      sa.Integer(),     sa.ForeignKey("zonas_eleitorais.id", ondelete="SET NULL"), nullable=True),
        sa.Column("nr_zona",      sa.Integer(),     nullable=False),
        sa.Column("nr_local",     sa.Integer(),     nullable=False),
        sa.Column("nome",         sa.String(400),   nullable=True),
        sa.Column("endereco",     sa.String(400),   nullable=True),
        sa.Column("bairro",       sa.String(200),   nullable=True),
        sa.Column("cep",          sa.String(10),    nullable=True),
        sa.Column("latitude",     sa.Float(),       nullable=True),
        sa.Column("longitude",    sa.Float(),       nullable=True),
        sa.Column("qt_eleitores", sa.Integer(),     nullable=True),
    )
    # Unique por (municipio + zona + local) — evita duplicatas entre eleições
    op.create_unique_constraint(
        "uq_local_votacao", "locais_votacao", ["municipio_id", "nr_zona", "nr_local"]
    )
    op.create_index("ix_locais_municipio", "locais_votacao", ["municipio_id"])
    op.create_index("ix_locais_zona",      "locais_votacao", ["zona_id"])
    op.create_index("ix_locais_coords",    "locais_votacao", ["latitude", "longitude"],
                    postgresql_where=sa.text("latitude IS NOT NULL AND longitude IS NOT NULL"))


def downgrade():
    op.drop_table("locais_votacao")
