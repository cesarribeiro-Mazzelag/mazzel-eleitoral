"""012 - Logo URL dos partidos políticos

Revision ID: 012
Revises: 011
Create Date: 2026-04-08

Adiciona coluna logo_url à tabela partidos e popula com URLs oficiais
do Wikipedia Commons (https://commons.wikimedia.org/wiki/Special:FilePath/)
que são estáveis e públicas para todos os partidos brasileiros registrados.
"""

from alembic import op


revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


# Mapeamento número TSE → nome do arquivo no Wikimedia Commons
# Fonte: Wikipedia Commons — stable Special:FilePath redirect
LOGOS = {
    10:  "Republicanos_logo.png",
    11:  "Progressistas_logo.png",
    12:  "PDT_logo.png",
    13:  "PT_Logo.svg",
    14:  "PTB_logo.svg",
    15:  "MDB_logo.svg",
    16:  "PSC_logo.png",
    17:  "PSL_logo.svg",
    20:  "PODE_logo.png",
    22:  "PL_logo.svg",
    23:  "Cidadania_partido_logo.png",
    25:  "PRD_Brasil_logo.png",
    27:  "DC_partido_logo.png",
    28:  "PRTB_logo.png",
    30:  "Novo_partido_logo.svg",
    31:  "PHS_logo.png",
    33:  "PMN_logo.png",
    35:  "PMB_logo.png",
    36:  "Agir_partido_logo.png",
    40:  "PSB_logo.svg",
    43:  "PV_logo.svg",
    44:  "Uniao_Brasil_logo.svg",
    45:  "PSDB_logo.svg",
    50:  "PSOL_logo.svg",
    51:  "Patriota_partido_logo.png",
    55:  "PSD_Brasil_logo.svg",
    65:  "PCdoB_logo.svg",
    70:  "Avante_partido_logo.png",
    77:  "Solidariedade_partido_logo.png",
    80:  "Prona_logo.png",
    90:  "PROS_logo.png",
}

BASE_URL = "https://commons.wikimedia.org/wiki/Special:FilePath"


def upgrade() -> None:
    op.execute("ALTER TABLE partidos ADD COLUMN IF NOT EXISTS logo_url TEXT")

    for numero, filename in LOGOS.items():
        url = f"{BASE_URL}/{filename}?width=120"
        op.execute(
            f"UPDATE partidos SET logo_url = '{url}' WHERE numero = {numero} AND logo_url IS NULL"
        )


def downgrade() -> None:
    op.execute("ALTER TABLE partidos DROP COLUMN IF EXISTS logo_url")
