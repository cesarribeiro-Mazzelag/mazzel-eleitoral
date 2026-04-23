"""006 — Tabela coordenadores e territórios (mapa de coordenadores)

Revision ID: 006
Revises: 005
Create Date: 2026-04-06
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade():
    # ── Coordenadores ─────────────────────────────────────────────────────────
    op.create_table(
        "coordenadores",
        sa.Column("id",          sa.Integer(),     primary_key=True),
        sa.Column("nome",        sa.String(300),   nullable=False),
        sa.Column("email",       sa.String(300),   nullable=True),
        sa.Column("telefone",    sa.String(30),    nullable=True),
        sa.Column("estado_uf",   sa.String(2),     nullable=False),    # estado base do coordenador
        sa.Column("cor_hex",     sa.String(7),     nullable=False, server_default="#3B82F6"),  # cor no mapa
        sa.Column("usuario_id",  sa.Integer(),     sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("ativo",       sa.Boolean(),     nullable=False, server_default="true"),
        sa.Column("criado_em",   sa.DateTime(),    server_default=sa.text("now()")),
        sa.Column("atualizado_em", sa.DateTime(),  nullable=True),
    )
    op.create_index("ix_coordenadores_uf",    "coordenadores", ["estado_uf"])
    op.create_index("ix_coordenadores_ativo", "coordenadores", ["ativo"])

    # ── Territórios: N municípios por coordenador ─────────────────────────────
    op.create_table(
        "coordenador_municipios",
        sa.Column("id",               sa.Integer(), primary_key=True),
        sa.Column("coordenador_id",   sa.Integer(), sa.ForeignKey("coordenadores.id", ondelete="CASCADE"), nullable=False),
        sa.Column("municipio_id",     sa.Integer(), sa.ForeignKey("municipios.id",    ondelete="CASCADE"), nullable=False),
        sa.Column("atribuido_em",     sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_coord_mun_coord",   "coordenador_municipios", ["coordenador_id"])
    op.create_index("ix_coord_mun_mun",     "coordenador_municipios", ["municipio_id"])
    op.create_unique_constraint(
        "uq_coord_mun", "coordenador_municipios", ["coordenador_id", "municipio_id"]
    )


def downgrade():
    op.drop_table("coordenador_municipios")
    op.drop_table("coordenadores")
