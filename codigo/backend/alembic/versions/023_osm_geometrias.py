"""OSM geometrias auxiliares — ruas, rios, ferrovias

Usado pelo ETL 20 (limites Voronoi) para:
  - snap das bordas Voronoi a ruas arteriais (categoria=highway)
  - cortar células Voronoi em barreiras físicas (waterway, railway)

Categoria simplificada:
  - 'arterial'  — highway primary/secondary/trunk/motorway/tertiary
  - 'rio'       — waterway river/canal/stream
  - 'ferrovia'  — railway rail/subway/light_rail
"""
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry


revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "osm_geometrias",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("osm_id", sa.BigInteger, nullable=False),
        sa.Column("osm_type", sa.String(20), nullable=False),
        sa.Column("categoria", sa.String(20), nullable=False),  # arterial|rio|ferrovia
        sa.Column("subcategoria", sa.String(40), nullable=True),
        sa.Column("nome", sa.String(200), nullable=True),
        sa.Column("municipio_id", sa.Integer, nullable=True),
        sa.Column("estado_uf", sa.String(2), nullable=True),
        sa.Column("geometry", Geometry("LineString", srid=4326), nullable=False),
        sa.Column("criado_em", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_osm_geom_categoria", "osm_geometrias", ["categoria"])
    op.create_index("idx_osm_geom_municipio", "osm_geometrias", ["municipio_id"])
    op.create_index("idx_osm_geom_uf", "osm_geometrias", ["estado_uf"])
    op.create_index("idx_osm_geom_geom", "osm_geometrias", ["geometry"], postgresql_using="gist")


def downgrade() -> None:
    op.drop_index("idx_osm_geom_geom", table_name="osm_geometrias")
    op.drop_index("idx_osm_geom_uf", table_name="osm_geometrias")
    op.drop_index("idx_osm_geom_municipio", table_name="osm_geometrias")
    op.drop_index("idx_osm_geom_categoria", table_name="osm_geometrias")
    op.drop_table("osm_geometrias")
