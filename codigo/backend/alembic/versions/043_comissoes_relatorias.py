"""043 - Comissoes Parlamentares + Relatorias.

Cesar 18/04/2026: aprofundar atividade legislativa via APIs de Senado e
Camara Federal. Objetivo: diferenciar parlamentar que so apresenta PLs
daquele que REALMENTE trabalha (relata, preside comissao, membro de CPI).

Mudancas:
  1. Tabela `comissoes_parlamentar`: membros de comissoes permanentes,
     temporarias, CPIs. Cargo: Titular/Suplente/Presidente/Vice/Relator.
     Fonte: /senador/{id}/comissoes (Senado) + /deputados/{id}/orgaos (Camara)
  2. Colunas em `proposicoes_legislativo`:
     - relator_mandato_id (FK) - quem relatou a materia
     - data_designacao_relator - quando foi designado
     - comissao_relatoria - qual comissao

Relatoria = indicador mais forte de produtividade real que numero de PLs.
"""
from alembic import op
import sqlalchemy as sa


revision      = "043"
down_revision = "042"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # ── comissoes_parlamentar ────────────────────────────────────────
    op.create_table(
        "comissoes_parlamentar",
        sa.Column("id",                sa.Integer, primary_key=True),
        sa.Column("mandato_id",        sa.Integer,
                  sa.ForeignKey("mandatos_legislativo.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("casa",              sa.String(30), nullable=False),   # inherits mandato
        sa.Column("id_externo_orgao", sa.String(30), nullable=False),
        sa.Column("sigla_comissao",   sa.String(30), nullable=True),
        sa.Column("nome_comissao",    sa.String(500), nullable=True),
        sa.Column("sigla_casa",       sa.String(10), nullable=True),   # SF, CD, CN
        sa.Column("cargo",            sa.String(50),  nullable=True),  # Titular/Presidente/Relator/Vice
        sa.Column("data_inicio",      sa.Date, nullable=True),
        sa.Column("data_fim",         sa.Date, nullable=True),
        sa.Column("criado_em",        sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_index("ix_comissoes_mandato",
                    "comissoes_parlamentar", ["mandato_id"])
    op.create_index("ix_comissoes_sigla_ativa",
                    "comissoes_parlamentar", ["sigla_comissao", "data_fim"])
    op.create_index("ix_comissoes_cargo",
                    "comissoes_parlamentar", ["cargo"])
    # Unique por mandato + orgao + data_inicio (evita duplicar mesma participacao)
    op.create_unique_constraint(
        "uq_comissao_mandato_orgao_inicio",
        "comissoes_parlamentar",
        ["mandato_id", "id_externo_orgao", "data_inicio"])

    # ── proposicoes_legislativo ──────────────────────────────────────
    op.add_column("proposicoes_legislativo",
                  sa.Column("relator_mandato_id", sa.Integer,
                            sa.ForeignKey("mandatos_legislativo.id", ondelete="SET NULL"),
                            nullable=True))
    op.add_column("proposicoes_legislativo",
                  sa.Column("data_designacao_relator", sa.Date, nullable=True))
    op.add_column("proposicoes_legislativo",
                  sa.Column("comissao_relatoria", sa.String(150), nullable=True))
    op.create_index("ix_proposicoes_relator",
                    "proposicoes_legislativo", ["relator_mandato_id"])


def downgrade() -> None:
    op.drop_index("ix_proposicoes_relator", "proposicoes_legislativo")
    op.drop_column("proposicoes_legislativo", "comissao_relatoria")
    op.drop_column("proposicoes_legislativo", "data_designacao_relator")
    op.drop_column("proposicoes_legislativo", "relator_mandato_id")

    op.drop_constraint("uq_comissao_mandato_orgao_inicio",
                       "comissoes_parlamentar", type_="unique")
    op.drop_index("ix_comissoes_cargo", "comissoes_parlamentar")
    op.drop_index("ix_comissoes_sigla_ativa", "comissoes_parlamentar")
    op.drop_index("ix_comissoes_mandato", "comissoes_parlamentar")
    op.drop_table("comissoes_parlamentar")
