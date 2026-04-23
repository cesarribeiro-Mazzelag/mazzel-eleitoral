"""007 - Multi-tenancy: tabela tenants + tenant_id em usuarios

Revision ID: 007
Revises: 006
Create Date: 2026-04-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade():
    # ── Tabela tenants ─────────────────────────────────────────────────────────
    op.create_table(
        "tenants",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column(
            "modo",
            sa.Enum("DEMO", "CONTRATADO", name="tenant_modo_enum"),
            nullable=False,
            server_default="DEMO",
        ),
        sa.Column("partido_id", sa.Integer, sa.ForeignKey("partidos.id", ondelete="SET NULL"), nullable=True),
        sa.Column("logo_url", sa.Text, nullable=True),
        sa.Column("cor_primaria", sa.String(7), nullable=True),
        sa.Column("cor_secundaria", sa.String(7), nullable=True),
        sa.Column("dominio_custom", sa.String(200), nullable=True),
        sa.Column("ativo", sa.Boolean, nullable=False, server_default="TRUE"),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ── Insere tenant padrão Mazzel (modo DEMO, sem partido) ──────────────────
    op.execute("""
        INSERT INTO tenants (nome, modo, cor_primaria, cor_secundaria, ativo)
        VALUES ('Mazzel Tech', 'DEMO', '#7C3AED', '#1E0A3C', TRUE)
    """)

    # ── Adiciona tenant_id na tabela usuarios ──────────────────────────────────
    op.add_column(
        "usuarios",
        sa.Column("tenant_id", sa.Integer, sa.ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True),
    )

    # Associa usuários existentes ao tenant 1 (Mazzel demo)
    op.execute("UPDATE usuarios SET tenant_id = 1")

    # ── Índices ────────────────────────────────────────────────────────────────
    op.create_index("ix_tenants_ativo", "tenants", ["ativo"])
    op.create_index("ix_tenants_partido_id", "tenants", ["partido_id"])
    op.create_index("ix_usuarios_tenant_id", "usuarios", ["tenant_id"])


def downgrade():
    op.drop_index("ix_usuarios_tenant_id", "usuarios")
    op.drop_index("ix_tenants_partido_id", "tenants")
    op.drop_index("ix_tenants_ativo", "tenants")
    op.drop_column("usuarios", "tenant_id")
    op.drop_table("tenants")
    op.execute("DROP TYPE IF EXISTS tenant_modo_enum")
