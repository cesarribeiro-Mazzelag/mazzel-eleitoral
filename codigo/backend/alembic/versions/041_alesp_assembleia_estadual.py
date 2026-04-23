"""Adicionar ASSEMBLEIA_ESTADUAL ao enum casa_legislativa_enum.

Passo 48 (ALESP) - expansao do pipeline legislativo pra Deputados Estaduais.
Inicio: SP (ALESP) - 94 deputados, ~538k proposituras historicas.
Futuro: ALERJ, ALEMG, ALERS, ALEGO etc (cada assembleia tem API/XML proprio).

Cesar 18/04/2026: dossie precisa mostrar atividade do politico independente
do cargo. Dep Estadual e o proximo passo depois de Dep Federal + Senador.
"""
from alembic import op


revision = "041"
down_revision = "040"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE casa_legislativa_enum ADD VALUE IF NOT EXISTS 'ASSEMBLEIA_ESTADUAL'")


def downgrade() -> None:
    # Postgres nao permite remover valor de enum - deixa ASSEMBLEIA_ESTADUAL
    pass
