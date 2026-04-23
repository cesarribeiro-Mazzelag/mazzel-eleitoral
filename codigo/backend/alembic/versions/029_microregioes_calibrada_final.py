"""Flag calibrada_final - microzonas aprovadas que ETL nao deve tocar.

Cesar 14/04/2026 17h: congelada_em eh timestamp de freeze temporario.
calibrada_final eh intencao explicita - marca que a microzona passou por
validacao humana e nao pode ser alterada por ETL automatico.

Todos ETLs que escrevem em microregioes.geometry passam a incluir:
    AND calibrada_final = FALSE
    AND origem != 'manual_edit'

calibrada_final pode ser setado via endpoint PATCH (botao "Marcar como final"
no editor) ou manualmente via SQL.
"""
from alembic import op
import sqlalchemy as sa


revision = "029"
down_revision = "028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "microregioes",
        sa.Column(
            "calibrada_final",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index(
        "ix_microregioes_calibrada_final",
        "microregioes",
        ["calibrada_final"],
    )


def downgrade() -> None:
    op.drop_index("ix_microregioes_calibrada_final", table_name="microregioes")
    op.drop_column("microregioes", "calibrada_final")
