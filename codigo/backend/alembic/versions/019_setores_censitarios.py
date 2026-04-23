"""019 - Setores censitários IBGE (granularidade máxima)

Revision ID: 019
Revises: 018
Create Date: 2026-04-12

Tabela `setores_censitarios`: polígonos dos ~452.000 setores censitários
do Censo 2022 (IBGE). Cada setor tem ~150-300 domicílios - é a menor
unidade geográfica oficial do Brasil.

Usado pelo mapa eleitoral para drill-down abaixo do nível de distrito:
o usuário clica num bairro/distrito e vê os setores censitários coloridos
pelo farol de votação.
"""

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry


revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "setores_censitarios",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("codigo_setor", sa.String(20), unique=True, nullable=False),
        sa.Column("codigo_municipio", sa.String(7), nullable=False),
        sa.Column("estado_uf", sa.String(2), nullable=False),
        sa.Column("nome_distrito", sa.String(200)),
        sa.Column("nome_subdistrito", sa.String(200)),
        sa.Column("tipo", sa.String(50)),
        sa.Column("geometry", Geometry("MULTIPOLYGON", srid=4326), nullable=False),
        sa.Column("populacao", sa.Integer),
        sa.Column("domicilios", sa.Integer),
    )

    op.create_index("ix_setores_codigo_municipio", "setores_censitarios", ["codigo_municipio"])
    op.create_index("ix_setores_estado_uf", "setores_censitarios", ["estado_uf"])
    # GiST spatial index is created automatically by GeoAlchemy2 for Geometry columns,
    # but we create it explicitly for clarity
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_setores_geometry_gist
        ON setores_censitarios USING GIST (geometry)
    """)


def downgrade():
    op.drop_index("ix_setores_geometry_gist", "setores_censitarios")
    op.drop_index("ix_setores_estado_uf", "setores_censitarios")
    op.drop_index("ix_setores_codigo_municipio", "setores_censitarios")
    op.drop_table("setores_censitarios")
