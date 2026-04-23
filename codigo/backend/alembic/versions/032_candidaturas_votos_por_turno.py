"""Campos votos_1t e votos_2t em candidaturas.

Cesar 16/04/2026: nao podemos somar 1T+2T como se fossem a mesma eleicao.
Cada turno tem seu total proprio - precisa ser apresentado separado no dossie.

Fonte: CSV votacao_candidato_munzona_{ano} (coluna NR_TURNO).
Populado via `etl/atualizar_votos_por_turno.py`.
"""
from alembic import op
import sqlalchemy as sa


revision = "032"
down_revision = "031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("candidaturas",
                  sa.Column("votos_1t", sa.Integer(), nullable=True))
    op.add_column("candidaturas",
                  sa.Column("votos_2t", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("candidaturas", "votos_2t")
    op.drop_column("candidaturas", "votos_1t")
