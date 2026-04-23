"""Microregioes — modelagem territorial sem sobreposicao

- Tabela `microregioes` com geometria pre-calculada via ST_Union
  de setores censitarios.
- Cada setor pertence a UMA microregiao (1:N).
- Campos:
  * nome           — sugestao do OSM (place=suburb|neighbourhood|quarter)
  * nome_padronizado — versao normalizada/curada (admin pode editar)
  * nivel          — granularidade na hierarquia (5 = subdistrito)
  * osm_ref_id     — id do bairros_osm que originou o nome (NULL se sem match)
  * geometry       — MultiPolygon SRID 4674 (SIRGAS2000)

Fonte do plano: Cesar 13/04/2026 03:00
"""
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

# revision identifiers
revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "microregioes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("nome_padronizado", sa.String(200), nullable=False),
        sa.Column("nivel", sa.Integer, nullable=False, server_default="5"),
        sa.Column("municipio_id", sa.Integer, sa.ForeignKey("municipios.id"), nullable=False),
        sa.Column("distrito_cd", sa.String(15), nullable=True),
        sa.Column("geometry", Geometry("MultiPolygon", srid=4674), nullable=False),
        sa.Column("area_km2", sa.Numeric(10, 3), nullable=True),
        sa.Column("n_setores", sa.Integer, nullable=False, server_default="0"),
        sa.Column("populacao", sa.Integer, nullable=True),
        sa.Column("osm_ref_id", sa.BigInteger, nullable=True),
        sa.Column("origem", sa.String(30), nullable=False, server_default="osm"),
        sa.Column("criado_em", sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_microregioes_geom", "microregioes", ["geometry"], postgresql_using="gist")
    op.create_index("idx_microregioes_mun", "microregioes", ["municipio_id"])
    op.create_index("idx_microregioes_distrito", "microregioes", ["municipio_id", "distrito_cd"])
    op.create_index("uq_microregioes_mun_nome", "microregioes", ["municipio_id", "nome_padronizado"], unique=True)

    # Coluna em setores_censitarios — cada setor em 1 microregiao
    op.add_column(
        "setores_censitarios",
        sa.Column("microregiao_id", sa.Integer, sa.ForeignKey("microregioes.id"), nullable=True),
    )
    op.create_index("idx_setores_microregiao", "setores_censitarios", ["microregiao_id"])


def downgrade() -> None:
    op.drop_index("idx_setores_microregiao", table_name="setores_censitarios")
    op.drop_column("setores_censitarios", "microregiao_id")
    op.drop_index("uq_microregioes_mun_nome", table_name="microregioes")
    op.drop_index("idx_microregioes_distrito", table_name="microregioes")
    op.drop_index("idx_microregioes_mun", table_name="microregioes")
    op.drop_index("idx_microregioes_geom", table_name="microregioes")
    op.drop_table("microregioes")
