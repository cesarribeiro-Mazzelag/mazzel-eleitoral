"""Execucao orcamentaria municipal via SICONFI.

Cria tabela `execucao_orcamentaria_municipal` pra armazenar:
- Receita total do municipio
- Despesa total
- Despesa com pessoal (% limite LRF)
- Investimentos

Fonte: API SICONFI do Tesouro Nacional (apidatalake.tesouro.gov.br).
Dados anuais (DCA - Declaracao de Contas Anuais) dos ultimos ciclos.

Usado no dossie politico quando candidato e Prefeito/Vice-Prefeito: mostra
a execucao orcamentaria do mandato dele.
"""
from alembic import op
import sqlalchemy as sa


revision = "040"
down_revision = "039"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "execucao_orcamentaria_municipal",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("municipio_id", sa.Integer(), nullable=False),
        sa.Column("ano", sa.Integer(), nullable=False),
        # Valores em reais
        sa.Column("receita_total", sa.Numeric(18, 2), nullable=True),
        sa.Column("despesa_total", sa.Numeric(18, 2), nullable=True),
        sa.Column("despesa_pessoal", sa.Numeric(18, 2), nullable=True),
        sa.Column("despesa_investimentos", sa.Numeric(18, 2), nullable=True),
        sa.Column("receita_corrente_liquida", sa.Numeric(18, 2), nullable=True),
        # Indicadores %
        sa.Column("despesa_pessoal_pct_rcl", sa.Numeric(6, 2), nullable=True),
        sa.Column("resultado_orcamentario", sa.Numeric(18, 2), nullable=True),  # receita - despesa
        # Metadata
        sa.Column("fonte", sa.String(40), nullable=False, server_default="SICONFI_DCA"),
        sa.Column("importado_em", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("municipio_id", "ano", name="uq_execucao_municipio_ano"),
    )

    op.create_index(
        "ix_execucao_municipio_ano",
        "execucao_orcamentaria_municipal",
        ["municipio_id", "ano"],
    )


def downgrade() -> None:
    op.drop_index("ix_execucao_municipio_ano", table_name="execucao_orcamentaria_municipal")
    op.drop_table("execucao_orcamentaria_municipal")
