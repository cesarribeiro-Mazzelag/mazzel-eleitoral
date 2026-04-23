"""locais_votacao.microregiao_id: vinculo escola <-> microzona.

Cada escola (ponto de votacao) pertence a UMA microzona. O vinculo e
calculado por ST_Within(ST_MakePoint(lng,lat), microregiao.geometry).

Regra operacional:
- Se microregiao congelada, o vinculo tambem e imutavel (a ser enforced
  via app, nao via constraint de banco).
- ETL 24 popula em lote. Em producao, trigger pode recalcular quando
  uma microregiao muda (fase futura).

Plano aprovado (Claude + GPT + Cesar) em 13/04/2026.
"""
from alembic import op
import sqlalchemy as sa


revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "locais_votacao",
        sa.Column("microregiao_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_locais_votacao_microregiao",
        "locais_votacao",
        "microregioes",
        ["microregiao_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "idx_locais_votacao_microregiao",
        "locais_votacao",
        ["microregiao_id"],
        postgresql_where=sa.text("microregiao_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "idx_locais_votacao_microregiao", table_name="locais_votacao"
    )
    op.drop_constraint(
        "fk_locais_votacao_microregiao", "locais_votacao", type_="foreignkey"
    )
    op.drop_column("locais_votacao", "microregiao_id")
