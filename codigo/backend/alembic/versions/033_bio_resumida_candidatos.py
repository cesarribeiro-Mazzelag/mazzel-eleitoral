"""Bio resumida (primeiro paragrafo Wikipedia PT) e wikidata_qid em candidatos.

Cesar 16/04/2026: dossie precisa de resumo biografico do candidato. Fonte:
Wikipedia PT via Wikidata Q-id. Populado via `etl/baixar_bio_wikipedia.py`.

wikidata_qid serve tambem como ancora para futuros ETLs (P69 formacao,
P108 empregadores, etc) sem precisar re-resolver por nome.
"""
from alembic import op
import sqlalchemy as sa


revision = "033"
down_revision = "032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("candidatos",
                  sa.Column("bio_resumida", sa.Text(), nullable=True))
    op.add_column("candidatos",
                  sa.Column("wikidata_qid", sa.String(20), nullable=True))
    op.add_column("candidatos",
                  sa.Column("wikipedia_url", sa.Text(), nullable=True))
    op.create_index("ix_candidatos_wikidata_qid",
                    "candidatos", ["wikidata_qid"])


def downgrade() -> None:
    op.drop_index("ix_candidatos_wikidata_qid", "candidatos")
    op.drop_column("candidatos", "wikipedia_url")
    op.drop_column("candidatos", "wikidata_qid")
    op.drop_column("candidatos", "bio_resumida")
