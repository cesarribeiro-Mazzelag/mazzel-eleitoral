"""Redes sociais em candidatos (usernames publicos do Wikidata).

Cesar 16/04/2026: Wikidata tem redes sociais oficiais dos politicos, com
historico versionado. Populado via `etl/baixar_redes_sociais_wikidata.py`.

Guardamos so o username (nao URL completa) - o link eh montado no frontend.
"""
from alembic import op
import sqlalchemy as sa


revision = "034"
down_revision = "033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("candidatos",
                  sa.Column("instagram", sa.String(100), nullable=True))
    op.add_column("candidatos",
                  sa.Column("twitter", sa.String(100), nullable=True))
    op.add_column("candidatos",
                  sa.Column("facebook", sa.String(100), nullable=True))
    op.add_column("candidatos",
                  sa.Column("tiktok", sa.String(100), nullable=True))
    op.add_column("candidatos",
                  sa.Column("youtube", sa.String(100), nullable=True))
    op.add_column("candidatos",
                  sa.Column("website", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("candidatos", "website")
    op.drop_column("candidatos", "youtube")
    op.drop_column("candidatos", "tiktok")
    op.drop_column("candidatos", "facebook")
    op.drop_column("candidatos", "twitter")
    op.drop_column("candidatos", "instagram")
