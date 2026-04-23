"""003 farol pct_mandatos

Revision ID: 003
Revises: 002
Create Date: 2026-04-05

Adiciona pct_mandatos à farol_municipio para o algoritmo de 4 cores
(AZUL/VERDE/AMARELO/VERMELHO) baseado em % de mandatos na câmara.
"""
from alembic import op
import sqlalchemy as sa


revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "farol_municipio",
        sa.Column("pct_mandatos", sa.Float(), nullable=True),
    )
    op.add_column(
        "farol_municipio",
        sa.Column("total_eleitos_municipio", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("farol_municipio", "total_eleitos_municipio")
    op.drop_column("farol_municipio", "pct_mandatos")
