"""020 - Bairros populares (OpenStreetMap)

Revision ID: 020
Revises: 019
Create Date: 2026-04-12

Tabela `bairros_osm`: micro-regioes/bairros populares do OpenStreetMap.
IBGE nao tem "Jardim Iris", "Taipas", "Morro Grande" oficialmente - esses
nomes populares vivem no OSM (tags place=suburb/neighbourhood/quarter).

Cada bairro OSM e cruzado com setores_censitarios via spatial join,
permitindo agregar dados eleitorais por micro-regiao nomeada.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geometry


revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "bairros_osm",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("osm_id", sa.BigInteger, nullable=False),
        sa.Column("osm_type", sa.String(10), nullable=False),
        sa.Column("nome", sa.String(300), nullable=False),
        sa.Column("tipo", sa.String(50), nullable=False),
        sa.Column("municipio_id", sa.Integer, sa.ForeignKey("municipios.id"), nullable=True),
        sa.Column("estado_uf", sa.String(2), nullable=True),
        sa.Column("populacao", sa.Integer, nullable=True),
        sa.Column("geometry", Geometry(geometry_type="GEOMETRY", srid=4326), nullable=False),
        sa.Column("setores_ibge", postgresql.ARRAY(sa.String(20)), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint("uq_bairros_osm_osm_id_type", "bairros_osm", ["osm_id", "osm_type"])
    op.create_index("ix_bairros_osm_municipio_tipo", "bairros_osm", ["municipio_id", "tipo"])
    op.create_index("ix_bairros_osm_estado_tipo", "bairros_osm", ["estado_uf", "tipo"])
    op.create_index("ix_bairros_osm_nome", "bairros_osm", ["nome"])
    op.execute("CREATE INDEX ix_bairros_osm_geom ON bairros_osm USING GIST (geometry)")


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_bairros_osm_geom")
    op.drop_index("ix_bairros_osm_nome", table_name="bairros_osm")
    op.drop_index("ix_bairros_osm_estado_tipo", table_name="bairros_osm")
    op.drop_index("ix_bairros_osm_municipio_tipo", table_name="bairros_osm")
    op.drop_constraint("uq_bairros_osm_osm_id_type", "bairros_osm", type_="unique")
    op.drop_table("bairros_osm")
