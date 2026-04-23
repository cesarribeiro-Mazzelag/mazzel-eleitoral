"""009 - Granularidade eleitoral: turno, eleitorado, brancos, nulos, resultados por zona

Revision ID: 009
Revises: 008
Create Date: 2026-04-08

Expande votos_por_zona e candidaturas para suportar:
  - turno 1 e 2 (corrige o bug de votos 2×)
  - eleitorado, comparecimento, abstenções por seção
  - votos válidos, brancos e nulos por seção
  - tabela resultados_zona para aggregação analítica
"""
from alembic import op
import sqlalchemy as sa

revision     = "009"
down_revision = "008"
branch_labels = None
depends_on    = None


def upgrade():
    # ── candidaturas: adicionar turno ────────────────────────────────────────
    op.add_column("candidaturas", sa.Column("turno", sa.Integer, server_default="1"))
    op.create_index("ix_candidaturas_turno", "candidaturas", ["turno"])
    op.create_index("ix_candidaturas_ano_cargo_turno", "candidaturas", ["ano", "cargo", "turno"])

    # ── votos_por_zona: adicionar turno + campos eleitorais ──────────────────
    op.add_column("votos_por_zona", sa.Column("turno",              sa.Integer, server_default="1"))
    op.add_column("votos_por_zona", sa.Column("qt_eleitores_secao", sa.Integer))   # eleitorado da seção
    op.add_column("votos_por_zona", sa.Column("qt_comparecimento",  sa.Integer))   # quem foi votar
    op.add_column("votos_por_zona", sa.Column("qt_abstencoes",      sa.Integer))   # não compareceu
    op.add_column("votos_por_zona", sa.Column("qt_votos_validos",   sa.Integer))   # votos válidos
    op.add_column("votos_por_zona", sa.Column("qt_votos_brancos",   sa.Integer))   # branco
    op.add_column("votos_por_zona", sa.Column("qt_votos_nulos",     sa.Integer))   # nulo
    op.create_index("ix_votos_por_zona_turno", "votos_por_zona", ["turno"])

    # ── resultados_zona: agregação analítica por partido/cargo/zona/turno ────
    # Permite calcular conversão de voto sem depender da estrutura de candidaturas
    op.create_table(
        "resultados_zona",
        sa.Column("id",                  sa.Integer, primary_key=True),
        sa.Column("ano",                 sa.Integer, nullable=False),
        sa.Column("turno",               sa.Integer, nullable=False, server_default="1"),
        sa.Column("cargo",               sa.String(100), nullable=False),
        sa.Column("partido_id",          sa.Integer, sa.ForeignKey("partidos.id")),
        sa.Column("municipio_id",        sa.Integer, sa.ForeignKey("municipios.id"), nullable=False),
        sa.Column("zona_id",             sa.Integer, sa.ForeignKey("zonas_eleitorais.id")),
        sa.Column("local_votacao_id",    sa.Integer, sa.ForeignKey("locais_votacao.id")),
        # Votos do partido nessa combinação
        sa.Column("qt_votos_partido",    sa.Integer, server_default="0"),
        # Dados eleitorais da zona/local nesse turno
        sa.Column("qt_eleitores",        sa.Integer),   # eleitorado aptos
        sa.Column("qt_comparecimento",   sa.Integer),   # quem compareceu
        sa.Column("qt_abstencoes",       sa.Integer),   # não compareceu
        sa.Column("qt_votos_validos",    sa.Integer),   # votos válidos totais
        sa.Column("qt_votos_brancos",    sa.Integer),   # brancos
        sa.Column("qt_votos_nulos",      sa.Integer),   # nulos
        # KPIs calculados (derivados dos campos acima, populados pelo ETL/job)
        sa.Column("pct_conversao",       sa.Float),     # votos_partido / eleitores
        sa.Column("pct_market_share",    sa.Float),     # votos_partido / votos_validos
        sa.Column("pct_comparecimento",  sa.Float),     # comparecimento / eleitores
        sa.Column("calculado_em",        sa.DateTime),
    )
    op.create_index("ix_resultados_zona_ano_cargo",  "resultados_zona", ["ano", "cargo"])
    op.create_index("ix_resultados_zona_municipio",  "resultados_zona", ["municipio_id"])
    op.create_index("ix_resultados_zona_zona",       "resultados_zona", ["zona_id"])
    op.create_index("ix_resultados_zona_partido",    "resultados_zona", ["partido_id"])
    op.create_index("ix_resultados_zona_local",      "resultados_zona", ["local_votacao_id"])
    op.create_index("ix_resultados_zona_turno",      "resultados_zona", ["turno"])

    # Índice composto para queries de performance de coordenador
    op.execute("""
        CREATE INDEX ix_resultados_zona_lookup
        ON resultados_zona (municipio_id, zona_id, ano, turno, cargo)
    """)


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_resultados_zona_lookup")
    op.drop_table("resultados_zona")

    op.drop_index("ix_votos_por_zona_turno",         table_name="votos_por_zona")
    op.drop_column("votos_por_zona", "qt_votos_nulos")
    op.drop_column("votos_por_zona", "qt_votos_brancos")
    op.drop_column("votos_por_zona", "qt_votos_validos")
    op.drop_column("votos_por_zona", "qt_abstencoes")
    op.drop_column("votos_por_zona", "qt_comparecimento")
    op.drop_column("votos_por_zona", "qt_eleitores_secao")
    op.drop_column("votos_por_zona", "turno")

    op.drop_index("ix_candidaturas_ano_cargo_turno", table_name="candidaturas")
    op.drop_index("ix_candidaturas_turno",           table_name="candidaturas")
    op.drop_column("candidaturas", "turno")
