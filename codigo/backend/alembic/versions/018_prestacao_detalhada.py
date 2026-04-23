"""018 - Prestação de contas detalhada (Caminho B do Radar Político)

Revision ID: 018
Revises: 017
Create Date: 2026-04-12

Tabela `prestacao_resumo_candidato`: resumo pré-agregado da prestação de
contas do TSE por candidatura. Permite que o dossiê político mostre:
  - origem_recursos (% por fonte)
  - concentracao (top1/5/10 doadores)
  - principais_doadores (top 5 nome + valor)

Sem essa tabela, o backend teria que ler milhões de linhas de receita
detalhada a cada abertura de dossiê. Com ela: 1 SELECT por candidatura.

A tabela é populada pelo ETL etl/12_prestacao_detalhada.py, que lê
os ZIPs do TSE de prestação de contas (anos relevantes), parseia
NM_DOADOR + DS_FONTE_RECEITA, agrega em memória, e faz upsert.
"""

from alembic import op
import sqlalchemy as sa


revision      = "018"
down_revision = "017"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        "prestacao_resumo_candidato",
        sa.Column("id",                       sa.Integer, primary_key=True),
        sa.Column("candidatura_id",           sa.Integer,
                  sa.ForeignKey("candidaturas.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("ano",                      sa.Integer, nullable=False),
        # Totais (pode redundar com candidaturas.receita_campanha mas é mais seguro
        # ter a soma das LINHAS da receita detalhada, pode diferir do agregado)
        sa.Column("total_receitas",           sa.Float,    nullable=True),
        # Origem por fonte (Fase 2)
        sa.Column("fundo_partidario_pct",     sa.Float,    nullable=True),
        sa.Column("fundo_eleitoral_pct",      sa.Float,    nullable=True),
        sa.Column("doacao_privada_pct",       sa.Float,    nullable=True),
        sa.Column("recursos_proprios_pct",    sa.Float,    nullable=True),
        sa.Column("outros_pct",               sa.Float,    nullable=True),
        # Concentração top doadores
        sa.Column("top1_pct",                 sa.Float,    nullable=True),
        sa.Column("top5_pct",                 sa.Float,    nullable=True),
        sa.Column("top10_pct",                sa.Float,    nullable=True),
        sa.Column("n_doadores",               sa.Integer,  nullable=True),
        # Lista dos top 5 doadores (JSON)
        sa.Column("top_doadores",             sa.JSON,     nullable=True),
        sa.Column("processado_em",            sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_index("ix_prestacao_resumo_candidatura",
                    "prestacao_resumo_candidato",
                    ["candidatura_id"], unique=True)
    op.create_index("ix_prestacao_resumo_ano",
                    "prestacao_resumo_candidato",
                    ["ano"])


def downgrade() -> None:
    op.drop_index("ix_prestacao_resumo_ano",         "prestacao_resumo_candidato")
    op.drop_index("ix_prestacao_resumo_candidatura", "prestacao_resumo_candidato")
    op.drop_table("prestacao_resumo_candidato")
