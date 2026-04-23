"""010 - Cabos eleitorais: entidade + vínculos + performance

Revision ID: 010
Revises: 009
Create Date: 2026-04-08

Cabo eleitoral é o agente de campo contratado por um coordenador para mobilizar
eleitores em um conjunto de escolas (locais de votação).

Hierarquia:
  Coordenador → Cabo Eleitoral → Escolas → Seções

Performance medida por: conversão de voto na urna (dados TSE pós-eleição)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision      = "010"
down_revision = "009"
branch_labels = None
depends_on    = None

status_cabo = postgresql.ENUM(
    "ATIVO", "INATIVO", "RESCINDIDO",
    name="status_cabo_enum", create_type=True
)
performance_cabo = postgresql.ENUM(
    "VERDE", "AMARELO", "VERMELHO", "SEM_DADOS",
    name="performance_cabo_enum", create_type=True
)


def upgrade():
    status_cabo.create(op.get_bind(), checkfirst=True)
    performance_cabo.create(op.get_bind(), checkfirst=True)

    # ── cabos_eleitorais ─────────────────────────────────────────────────────
    op.create_table(
        "cabos_eleitorais",
        sa.Column("id",                    sa.Integer, primary_key=True),
        sa.Column("nome_completo",         sa.String(300), nullable=False),
        sa.Column("nome_guerra",           sa.String(200)),
        sa.Column("telefone",              sa.String(30)),
        sa.Column("whatsapp",              sa.String(30)),
        sa.Column("email",                 sa.String(300)),
        sa.Column("foto_url",              sa.Text),
        sa.Column("cpf",                   sa.String(14)),
        # Território
        sa.Column("municipio_id",          sa.Integer, sa.ForeignKey("municipios.id"), nullable=False),
        sa.Column("bairros",               sa.Text),          # lista livre de bairros
        # Hierarquia
        sa.Column("coordenador_id",        sa.Integer, sa.ForeignKey("coordenadores.id")),
        sa.Column("lideranca_id",          sa.Integer, sa.ForeignKey("liderancas.id")),  # vínculo com liderança
        # Contrato
        sa.Column("status",                postgresql.ENUM(
                                               "ATIVO","INATIVO","RESCINDIDO",
                                               name="status_cabo_enum", create_type=False),
                  nullable=False, server_default="ATIVO"),
        sa.Column("data_inicio",           sa.Date),
        sa.Column("data_fim",              sa.Date),
        sa.Column("valor_contrato",        sa.Float),         # R$ por eleição
        sa.Column("meta_votos",            sa.Integer),       # meta acordada de votos
        # Performance (calculada pós-eleição via job)
        sa.Column("ciclo_ref",             sa.Integer),       # ano do último ciclo calculado
        sa.Column("votos_ciclo_atual",     sa.Integer),       # votos obtidos no ciclo_ref
        sa.Column("votos_ciclo_anterior",  sa.Integer),       # votos no ciclo anterior
        sa.Column("eleitores_area",        sa.Integer),       # eleitorado das escolas dele
        sa.Column("conversao_pct",         sa.Float),         # votos_ciclo_atual / eleitores_area
        sa.Column("variacao_pct",          sa.Float),         # delta vs ciclo anterior
        sa.Column("performance",           postgresql.ENUM(
                                               "VERDE","AMARELO","VERMELHO","SEM_DADOS",
                                               name="performance_cabo_enum", create_type=False),
                  server_default="SEM_DADOS"),
        sa.Column("performance_calculada_em", sa.DateTime),
        sa.Column("observacoes",           sa.Text),
        sa.Column("criado_em",             sa.DateTime, server_default=sa.text("now()")),
        sa.Column("atualizado_em",         sa.DateTime),
    )
    op.create_index("ix_cabos_municipio",     "cabos_eleitorais", ["municipio_id"])
    op.create_index("ix_cabos_coordenador",   "cabos_eleitorais", ["coordenador_id"])
    op.create_index("ix_cabos_status",        "cabos_eleitorais", ["status"])
    op.create_index("ix_cabos_performance",   "cabos_eleitorais", ["performance"])

    # ── cabo_zonas (M2M: cabo ↔ zona_eleitoral) ──────────────────────────────
    op.create_table(
        "cabo_zonas",
        sa.Column("id",         sa.Integer, primary_key=True),
        sa.Column("cabo_id",    sa.Integer, sa.ForeignKey("cabos_eleitorais.id", ondelete="CASCADE"), nullable=False),
        sa.Column("zona_id",    sa.Integer, sa.ForeignKey("zonas_eleitorais.id", ondelete="CASCADE"), nullable=False),
        sa.Column("criado_em",  sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_index("ix_cabo_zonas_cabo", "cabo_zonas", ["cabo_id"])
    op.create_index("ix_cabo_zonas_zona", "cabo_zonas", ["zona_id"])

    # ── cabo_escolas (M2M: cabo ↔ local_votacao) ─────────────────────────────
    op.create_table(
        "cabo_escolas",
        sa.Column("id",               sa.Integer, primary_key=True),
        sa.Column("cabo_id",          sa.Integer, sa.ForeignKey("cabos_eleitorais.id", ondelete="CASCADE"), nullable=False),
        sa.Column("local_votacao_id", sa.Integer, sa.ForeignKey("locais_votacao.id",  ondelete="CASCADE"), nullable=False),
        sa.Column("criado_em",        sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_index("ix_cabo_escolas_cabo",  "cabo_escolas", ["cabo_id"])
    op.create_index("ix_cabo_escolas_local", "cabo_escolas", ["local_votacao_id"])


def downgrade():
    op.drop_table("cabo_escolas")
    op.drop_table("cabo_zonas")
    op.drop_table("cabos_eleitorais")
    performance_cabo.drop(op.get_bind(), checkfirst=True)
    status_cabo.drop(op.get_bind(), checkfirst=True)
