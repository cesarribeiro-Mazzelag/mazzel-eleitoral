"""008 - Módulo Territorial: lideranças, cercas virtuais e score

Revision ID: 008
Revises: 007
Create Date: 2026-04-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None

# Enums definidos uma única vez aqui (SQLAlchemy cria no banco automaticamente)
status_lideranca = postgresql.ENUM("ATIVO", "INATIVO", name="status_lideranca_enum", create_type=True)
score_lideranca  = postgresql.ENUM("OURO", "PRATA", "BRONZE", "CRITICO", name="score_lideranca_enum", create_type=True)


def upgrade():
    # Cria os tipos enum no banco
    status_lideranca.create(op.get_bind(), checkfirst=True)
    score_lideranca.create(op.get_bind(), checkfirst=True)

    # ── liderancas ────────────────────────────────────────────────────────────
    op.create_table(
        "liderancas",
        sa.Column("id",                  sa.Integer, primary_key=True),
        sa.Column("nome_completo",       sa.String(300), nullable=False),
        sa.Column("nome_politico",       sa.String(200)),
        sa.Column("telefone",            sa.String(30)),
        sa.Column("whatsapp",            sa.String(30)),
        sa.Column("email",               sa.String(300)),
        sa.Column("foto_url",            sa.Text),
        # Território
        sa.Column("municipio_id",        sa.Integer, sa.ForeignKey("municipios.id"),       nullable=False),
        sa.Column("bairro",              sa.String(200)),
        sa.Column("zona_id",             sa.Integer, sa.ForeignKey("zonas_eleitorais.id")),
        # Vinculações
        sa.Column("coordenador_id",      sa.Integer, sa.ForeignKey("coordenadores.id")),
        sa.Column("equipe",              sa.String(300)),
        # Status
        sa.Column("status",              postgresql.ENUM("ATIVO", "INATIVO",
                                             name="status_lideranca_enum", create_type=False),
                  server_default="ATIVO", nullable=False),
        sa.Column("data_entrada",        sa.Date),
        # Score (calculado pelo sistema)
        sa.Column("score_valor",         sa.Float),
        sa.Column("score_classificacao", postgresql.ENUM("OURO", "PRATA", "BRONZE", "CRITICO",
                                             name="score_lideranca_enum", create_type=False)),
        sa.Column("score_calculado_em",  sa.DateTime),
        sa.Column("observacoes",         sa.Text),
        sa.Column("criado_em",           sa.DateTime, server_default=sa.text("now()")),
        sa.Column("atualizado_em",       sa.DateTime),
    )
    op.create_index("ix_liderancas_municipio",   "liderancas", ["municipio_id"])
    op.create_index("ix_liderancas_zona",        "liderancas", ["zona_id"])
    op.create_index("ix_liderancas_coordenador", "liderancas", ["coordenador_id"])
    op.create_index("ix_liderancas_status",      "liderancas", ["status"])

    # ── lideranca_escolas (M2M liderança ↔ local_votacao) ─────────────────────
    op.create_table(
        "lideranca_escolas",
        sa.Column("id",               sa.Integer, primary_key=True),
        sa.Column("lideranca_id",     sa.Integer,
                  sa.ForeignKey("liderancas.id",     ondelete="CASCADE"), nullable=False),
        sa.Column("local_votacao_id", sa.Integer,
                  sa.ForeignKey("locais_votacao.id", ondelete="CASCADE"), nullable=False),
        sa.Column("vinculado_em",     sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_index("ix_lideranca_escolas_lideranca", "lideranca_escolas", ["lideranca_id"])
    op.create_index("ix_lideranca_escolas_local",     "lideranca_escolas", ["local_votacao_id"])

    # ── cercas_virtuais ───────────────────────────────────────────────────────
    op.create_table(
        "cercas_virtuais",
        sa.Column("id",               sa.Integer, primary_key=True),
        sa.Column("nome",             sa.String(300), nullable=False),
        sa.Column("cor_hex",          sa.String(7),   server_default="#7B2FBE"),
        sa.Column("estado_uf",        sa.String(2),   nullable=False),
        sa.Column("municipio_id",     sa.Integer, sa.ForeignKey("municipios.id")),
        sa.Column("responsavel_id",   sa.Integer, sa.ForeignKey("usuarios.id")),
        sa.Column("equipe",           sa.String(300)),
        sa.Column("observacoes",      sa.Text),
        # GeoJSON string da geometria (para retorno na API)
        sa.Column("geometria_json",   sa.Text),
        # Cache de consolidação
        sa.Column("total_votos",      sa.Integer, server_default="0"),
        sa.Column("total_eleitores",  sa.Integer),
        sa.Column("total_liderancas", sa.Integer, server_default="0"),
        sa.Column("total_escolas",    sa.Integer, server_default="0"),
        sa.Column("total_zonas",      sa.Integer, server_default="0"),
        sa.Column("consolidado_em",   sa.DateTime),
        sa.Column("ativo",            sa.Boolean,  server_default="true"),
        sa.Column("criado_em",        sa.DateTime, server_default=sa.text("now()")),
        sa.Column("atualizado_em",    sa.DateTime),
    )
    # Adiciona coluna PostGIS geometry separadamente
    op.execute("""
        ALTER TABLE cercas_virtuais
        ADD COLUMN geometria_postgis geometry(Polygon, 4326)
    """)
    op.execute("CREATE INDEX ix_cercas_geometria ON cercas_virtuais USING GIST (geometria_postgis)")
    op.create_index("ix_cercas_estado",    "cercas_virtuais", ["estado_uf"])
    op.create_index("ix_cercas_municipio", "cercas_virtuais", ["municipio_id"])
    op.create_index("ix_cercas_ativo",     "cercas_virtuais", ["ativo"])

    # ── cerca_liderancas (M2M cerca ↔ liderança) ──────────────────────────────
    op.create_table(
        "cerca_liderancas",
        sa.Column("id",           sa.Integer, primary_key=True),
        sa.Column("cerca_id",     sa.Integer,
                  sa.ForeignKey("cercas_virtuais.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lideranca_id", sa.Integer,
                  sa.ForeignKey("liderancas.id",      ondelete="CASCADE"), nullable=False),
        sa.Column("vinculado_em", sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_index("ix_cerca_liderancas_cerca",     "cerca_liderancas", ["cerca_id"])
    op.create_index("ix_cerca_liderancas_lideranca", "cerca_liderancas", ["lideranca_id"])


def downgrade():
    op.drop_table("cerca_liderancas")
    op.execute("DROP INDEX IF EXISTS ix_cercas_geometria")
    op.drop_table("cercas_virtuais")
    op.drop_table("lideranca_escolas")
    op.drop_table("liderancas")
    score_lideranca.drop(op.get_bind(), checkfirst=True)
    status_lideranca.drop(op.get_bind(), checkfirst=True)
