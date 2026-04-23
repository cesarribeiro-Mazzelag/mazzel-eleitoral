"""Sancoes administrativas (CGU CEIS, CEAF, TCU) associadas a candidatos.

Cesar 16/04/2026 (Onda 1 roadmap juridico). Cobre:
  - CEIS (Cadastro de Empresas Inidoneas e Suspensas)
  - CEAF (Cadastro de Expulsoes da Administracao Federal)
  - TCU Inabilitados

Match conservador: apenas pessoa fisica com nome unificado (sem homonimo)
entre candidatos do banco. CPF da API vem mascarado (***.nnn.nnn-**).
"""
from alembic import op
import sqlalchemy as sa


revision = "036"
down_revision = "035"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sancoes_administrativas",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("candidato_id", sa.Integer,
                  sa.ForeignKey("candidatos.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("fonte", sa.String(20), nullable=False),      # CEIS | CEAF | TCU
        sa.Column("id_externo", sa.String(50), nullable=True),  # id original na fonte
        sa.Column("tipo_sancao", sa.String(300), nullable=True),
        sa.Column("descricao", sa.Text, nullable=True),
        sa.Column("orgao_sancionador", sa.String(300), nullable=True),
        sa.Column("fundamentacao", sa.Text, nullable=True),
        sa.Column("cpf_mascarado", sa.String(20), nullable=True),
        sa.Column("data_inicio", sa.Date, nullable=True),
        sa.Column("data_fim", sa.Date, nullable=True),
        sa.Column("data_publicacao", sa.Date, nullable=True),
        sa.Column("ativa", sa.Boolean, nullable=True),
        sa.Column("link_publicacao", sa.Text, nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=False),
                  server_default=sa.text("now()")),
    )
    op.create_index("ix_sancoes_candidato", "sancoes_administrativas", ["candidato_id"])
    op.create_index("ix_sancoes_fonte", "sancoes_administrativas", ["fonte"])
    op.create_unique_constraint(
        "uq_sancoes_fonte_idext", "sancoes_administrativas",
        ["fonte", "id_externo"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_sancoes_fonte_idext", "sancoes_administrativas", type_="unique")
    op.drop_index("ix_sancoes_fonte", "sancoes_administrativas")
    op.drop_index("ix_sancoes_candidato", "sancoes_administrativas")
    op.drop_table("sancoes_administrativas")
