"""005 — Tabela distritos_municipio (polígonos de bairros/distritos do IBGE 2022)

Revision ID: 005
Revises: 004
Create Date: 2026-04-06
"""
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "distritos_municipio",
        sa.Column("id",          sa.Integer(), primary_key=True),
        sa.Column("cd_dist",     sa.String(10),  nullable=False, unique=True),  # código IBGE do distrito
        sa.Column("nm_dist",     sa.String(200), nullable=True),                # nome do distrito
        sa.Column("cd_mun",      sa.String(10),  nullable=False),               # código IBGE do município
        sa.Column("nm_mun",      sa.String(200), nullable=True),
        sa.Column("sigla_uf",    sa.String(2),   nullable=True),
        sa.Column("geometry",    Geometry("MULTIPOLYGON", srid=4326), nullable=True),
    )
    op.create_index("ix_distritos_cd_mun",  "distritos_municipio", ["cd_mun"])
    op.create_index("ix_distritos_uf",      "distritos_municipio", ["sigla_uf"])
    op.create_index(
        "ix_distritos_geom", "distritos_municipio", ["geometry"],
        postgresql_using="gist",
    )


def downgrade():
    op.drop_table("distritos_municipio")
