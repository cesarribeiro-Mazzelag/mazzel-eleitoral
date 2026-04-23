"""045 - Tabela de audit log de deteccao de scraping/extensoes IA.

Cesar 20/04/2026: antes de lancar recursos pagos (Modo Campanha), registrar
todas as tentativas de scraping identificadas. Campo `motivo` categoriza
(claude_extension, chatgpt_extension, automation_cdp, etc). Relatorios
agregados ajudam ajustar defesas.
"""
from alembic import op
import sqlalchemy as sa


revision      = "045"
down_revision = "044"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        "seguranca_scraping",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("motivo", sa.String(50), nullable=False),
        sa.Column("url", sa.String(500), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("ip", sa.String(50), nullable=True),
        sa.Column("detalhes", sa.JSON(), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_seguranca_scraping_user_criado",
        "seguranca_scraping",
        ["user_id", sa.text("criado_em DESC")],
    )
    op.create_index(
        "ix_seguranca_scraping_motivo",
        "seguranca_scraping",
        ["motivo"],
    )


def downgrade() -> None:
    op.drop_index("ix_seguranca_scraping_motivo", table_name="seguranca_scraping")
    op.drop_index("ix_seguranca_scraping_user_criado", table_name="seguranca_scraping")
    op.drop_table("seguranca_scraping")
