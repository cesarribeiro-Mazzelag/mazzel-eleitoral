"""Poligono censitario em microbairros (agregacao IBGE + CEP).

Cesar 16/04/2026: polygon_voronoi artificial foi frustrante. Nova abordagem:
agregar setores censitarios IBGE pelos bairros dos CEPs que eles contem.
Resultado: polygon ORGANICO (herdado do IBGE), nao artificial.

Nao remove polygon_voronoi nem osm_polygon - adiciona como 3a opcao.
Frontend deve preferir polygon_censitario > osm_polygon > polygon_voronoi.
"""
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry


revision = "037"
down_revision = "036"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("microbairros",
                  sa.Column("polygon_censitario",
                            Geometry(geometry_type="MultiPolygon", srid=4326),
                            nullable=True))
    op.add_column("microbairros",
                  sa.Column("setores_censitarios_n", sa.Integer, nullable=True))
    op.add_column("microbairros",
                  sa.Column("area_km2", sa.Float, nullable=True))
    # geoalchemy2 cria um indice spatial_microbairros_polygon_censitario_idx
    # automatico quando Geometry eh adicionado, entao NAO criar manualmente.


def downgrade() -> None:
    op.drop_index("idx_microbairros_polygon_censitario", "microbairros")
    op.drop_column("microbairros", "area_km2")
    op.drop_column("microbairros", "setores_censitarios_n")
    op.drop_column("microbairros", "polygon_censitario")
