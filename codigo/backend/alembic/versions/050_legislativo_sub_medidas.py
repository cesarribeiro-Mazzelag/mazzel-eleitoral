"""050 - Legislativo: sub-medidas de presenca e lideranca.

Cesar 23/04/2026: adicionar colunas de atividade parlamentar em
mandatos_legislativo para alimentar o Overall Dossie.

Colunas novas:
  - presenca_plenario_pct   : % de presenca nas sessoes plenarias
  - presenca_comissoes_pct  : % de presenca nas reunioes de comissoes
  - sessoes_plenario_total   : total de sessoes no periodo coletado
  - sessoes_plenario_presente: total em que esteve presente
  - cargos_lideranca         : array texto (ex: ["Lider do Bloco X", "Vice-lider Y"])
  - lideranca_atualizada_em  : quando o dado de lideranca foi coletado por ultimo
  - atividade_atualizada_em  : quando presenca/comissao foi coletada por ultimo

Estas colunas sao populadas pelo ETL
`app/services/coleta_atividade_parlamentar.py` via APIs oficiais:
  - Camara: /deputados/{id}/eventosPresenca
  - Senado: /senador/{codigo}/apartes (fallback: contagem de apartes)

Nao criamos tabela nova porque os dados de presenca pertencem ao mandato
(1:1) e o mandato_id ja eh a chave primaria natural.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY

revision      = "050"
down_revision = "049"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # Presenca plenario
    op.add_column("mandatos_legislativo",
        sa.Column("presenca_plenario_pct", sa.Numeric(5, 2), nullable=True))
    op.add_column("mandatos_legislativo",
        sa.Column("presenca_comissoes_pct", sa.Numeric(5, 2), nullable=True))
    op.add_column("mandatos_legislativo",
        sa.Column("sessoes_plenario_total", sa.Integer, nullable=True))
    op.add_column("mandatos_legislativo",
        sa.Column("sessoes_plenario_presente", sa.Integer, nullable=True))

    # Cargos de lideranca (array de texto)
    op.add_column("mandatos_legislativo",
        sa.Column("cargos_lideranca",
                  PG_ARRAY(sa.Text), nullable=True))

    # Timestamps de controle de coleta
    op.add_column("mandatos_legislativo",
        sa.Column("lideranca_atualizada_em",
                  sa.DateTime(timezone=True), nullable=True))
    op.add_column("mandatos_legislativo",
        sa.Column("atividade_atualizada_em",
                  sa.DateTime(timezone=True), nullable=True))

    # Indice para facilitar filtrar quem precisa ser recoletado
    op.create_index(
        "ix_mandatos_atividade_atualizada",
        "mandatos_legislativo",
        ["atividade_atualizada_em"],
    )


def downgrade() -> None:
    op.drop_index("ix_mandatos_atividade_atualizada", "mandatos_legislativo")
    op.drop_column("mandatos_legislativo", "atividade_atualizada_em")
    op.drop_column("mandatos_legislativo", "lideranca_atualizada_em")
    op.drop_column("mandatos_legislativo", "cargos_lideranca")
    op.drop_column("mandatos_legislativo", "sessoes_plenario_presente")
    op.drop_column("mandatos_legislativo", "sessoes_plenario_total")
    op.drop_column("mandatos_legislativo", "presenca_comissoes_pct")
    op.drop_column("mandatos_legislativo", "presenca_plenario_pct")
