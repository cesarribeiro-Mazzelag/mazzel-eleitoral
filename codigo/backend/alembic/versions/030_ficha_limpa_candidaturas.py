"""Flag ficha_limpa em candidaturas.

Cesar 16/04/2026: popular via DS_SITUACAO_CANDIDATURA do CSV TSE.
Mapeamento: APTO -> true, INAPTO -> false, resto -> null.
Dados disponiveis apenas para 2018/2020/2022 (CSV 2024 tem #NE em todas as linhas).
"""
from alembic import op
import sqlalchemy as sa


revision = "030"
down_revision = "029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "candidaturas",
        sa.Column("ficha_limpa", sa.Boolean(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("candidaturas", "ficha_limpa")
