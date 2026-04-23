"""Microregioes bordas dissolvidas — anti-duplicacao visual

Quando 2 microregioes vizinhas compartilham fronteira, cada uma
desenha sua propria linha (= linha visualmente "dobrada"). Esta
tabela materializa as bordas UNICAS via ST_LineMerge(ST_Union(
ST_Boundary(geometry))).

Recomendacao do GPT consolidada com Claude em 13/04/2026.
"""
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry


revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "microregioes_bordas",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("municipio_id", sa.Integer, sa.ForeignKey("municipios.id"), nullable=False),
        sa.Column("distrito_cd", sa.String(15), nullable=True),
        sa.Column("geometry", Geometry("MultiLineString", srid=4674), nullable=False),
        sa.Column("n_segmentos", sa.Integer, nullable=False, server_default="0"),
        sa.Column("criado_em", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_mr_bordas_mun", "microregioes_bordas", ["municipio_id"])
    op.create_index("idx_mr_bordas_distrito", "microregioes_bordas", ["municipio_id", "distrito_cd"])
    op.create_index("idx_mr_bordas_geom", "microregioes_bordas", ["geometry"], postgresql_using="gist")


def downgrade() -> None:
    op.drop_index("idx_mr_bordas_geom", table_name="microregioes_bordas")
    op.drop_index("idx_mr_bordas_distrito", table_name="microregioes_bordas")
    op.drop_index("idx_mr_bordas_mun", table_name="microregioes_bordas")
    op.drop_table("microregioes_bordas")
