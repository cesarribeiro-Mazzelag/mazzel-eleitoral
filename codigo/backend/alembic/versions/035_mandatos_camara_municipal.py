"""Expandir mandatos_legislativo para Camaras Municipais.

Cesar 16/04/2026: pente fino eleitoral inclui vereadores ativos. Sprint 1 -
SP (190 vereadores cadastrados). Depois: outras capitais.

Mudancas:
  1. Adiciona valor CAMARA_MUNICIPAL ao enum casa_legislativa_enum
  2. Adiciona municipio_id (FK) em mandatos_legislativo (qual municipio o
     vereador representa)
  3. Adiciona splegis_id (string) como identificador externo auxiliar no
     sistema de projetos de lei da Camara Municipal SP
"""
from alembic import op
import sqlalchemy as sa


revision = "035"
down_revision = "034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adiciona novo valor ao enum. Postgres nao permite dentro de transaction
    # em versoes antigas, mas funciona em PG 12+.
    op.execute("ALTER TYPE casa_legislativa_enum ADD VALUE IF NOT EXISTS 'CAMARA_MUNICIPAL'")

    op.add_column("mandatos_legislativo",
                  sa.Column("municipio_id", sa.Integer(),
                            sa.ForeignKey("municipios.id", ondelete="SET NULL"),
                            nullable=True))
    op.add_column("mandatos_legislativo",
                  sa.Column("splegis_id", sa.String(30), nullable=True))
    op.create_index("ix_mandatos_municipio",
                    "mandatos_legislativo", ["municipio_id"])


def downgrade() -> None:
    # Postgres nao permite remover valor de enum - deixa o valor CAMARA_MUNICIPAL
    op.drop_index("ix_mandatos_municipio", "mandatos_legislativo")
    op.drop_column("mandatos_legislativo", "splegis_id")
    op.drop_column("mandatos_legislativo", "municipio_id")
