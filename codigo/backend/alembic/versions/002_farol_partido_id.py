"""002 farol partido_id

Revision ID: 002
Revises: 001
Create Date: 2026-04-05

Adiciona partido_id à tabela farol_municipio para suportar
dados de todos os partidos (não só União Brasil).
"""
from alembic import op
import sqlalchemy as sa


revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adiciona coluna partido_id (nullable — NULL = farol consolidado)
    op.add_column(
        "farol_municipio",
        sa.Column("partido_id", sa.Integer(), sa.ForeignKey("partidos.id"), nullable=True)
    )

    # Remove índice antigo
    op.drop_index("ix_farol_municipio_ano_cargo", table_name="farol_municipio")

    # Cria índice novo incluindo partido_id
    op.create_index(
        "ix_farol_municipio_ano_cargo",
        "farol_municipio",
        ["municipio_id", "partido_id", "ano_referencia", "cargo"],
    )

    # Índice para consultas por partido
    op.create_index(
        "ix_farol_partido",
        "farol_municipio",
        ["partido_id", "ano_referencia", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_farol_partido", table_name="farol_municipio")
    op.drop_index("ix_farol_municipio_ano_cargo", table_name="farol_municipio")
    op.create_index(
        "ix_farol_municipio_ano_cargo",
        "farol_municipio",
        ["municipio_id", "ano_referencia", "cargo"],
    )
    op.drop_column("farol_municipio", "partido_id")
