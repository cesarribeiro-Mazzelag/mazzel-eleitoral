"""016 - Cores oficiais dos partidos políticos

Revision ID: 016
Revises: 015
Create Date: 2026-04-11

Adiciona cor_primaria e cor_secundaria à tabela partidos. Cores baseadas
em fontes públicas (logos oficiais no Wikimedia Commons + identidade visual
dos partidos). Usadas pelo "X9 visual" do Mapa Eleitoral, que pinta:
  - municípios fortes do tenant: cor primária do tenant
  - municípios fracos do tenant: cor primária do partido dominante (lavada)
  - municípios ausentes do tenant: cor primária do partido dominante (saturada)

Decisão de produto sujeita a aprovação: as cores podem ser ajustadas
posteriormente sem mudança de schema. Aqui populamos os 21 partidos
brasileiros mais relevantes.
"""

from alembic import op


revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


# (numero TSE, cor_primaria, cor_secundaria)
# Fontes: identidade visual oficial publicada pelos próprios partidos +
# imagens do Wikimedia Commons usadas na migration 012 (logo_url).
CORES = [
    (10, "#1A5CB8", "#FFFFFF"),  # Republicanos - azul / branco
    (11, "#073776", "#C5C5C5"),  # PP (Progressistas) - azul escuro / cinza
    (12, "#B22222", "#002664"),  # PDT - vermelho / azul
    (13, "#C8102E", "#FFFFFF"),  # PT - vermelho / branco
    (14, "#009639", "#FFD700"),  # PTB - verde / amarelo
    (15, "#00853F", "#FFD700"),  # MDB - verde / amarelo
    (17, "#002F87", "#FFD700"),  # PSL - azul / amarelo
    (20, "#1F2A44", "#00B5E2"),  # Podemos - azul escuro / azul claro
    (22, "#002F87", "#FFD700"),  # PL - azul / amarelo
    (23, "#E6007E", "#FFFFFF"),  # Cidadania - rosa / branco
    (25, "#1A4DA6", "#FFFFFF"),  # PRD (ex-DEM) - azul / branco
    (30, "#FF6600", "#1A1A1A"),  # NOVO - laranja / preto
    (40, "#C8102E", "#FFD700"),  # PSB - vermelho / amarelo
    (43, "#00A859", "#FFD700"),  # PV - verde / amarelo
    (44, "#0033A0", "#FFCC00"),  # União Brasil - azul / amarelo
    (45, "#0080C6", "#FFD700"),  # PSDB - azul / amarelo
    (50, "#FFCC00", "#B22222"),  # PSOL - amarelo / vermelho
    (55, "#F58220", "#1A1A1A"),  # PSD - laranja / preto
    (65, "#C8102E", "#FFD700"),  # PCdoB - vermelho / amarelo
    (70, "#0073B7", "#FFFFFF"),  # Avante - azul / branco
    (77, "#C8102E", "#FFFFFF"),  # Solidariedade - vermelho / branco
]

# Cor neutra de fallback para partidos sem cor definida (cinza médio).
# Usada pelo X9 visual quando o partido dominante não está na tabela acima.
COR_FALLBACK_PRIMARIA  = "#64748B"
COR_FALLBACK_SECUNDARIA = "#FFFFFF"


def upgrade() -> None:
    op.execute("ALTER TABLE partidos ADD COLUMN IF NOT EXISTS cor_primaria   VARCHAR(7)")
    op.execute("ALTER TABLE partidos ADD COLUMN IF NOT EXISTS cor_secundaria VARCHAR(7)")

    for numero, primaria, secundaria in CORES:
        op.execute(
            f"UPDATE partidos "
            f"SET cor_primaria = '{primaria}', cor_secundaria = '{secundaria}' "
            f"WHERE numero = {numero}"
        )

    # Fallback para qualquer partido sem cor definida
    op.execute(
        f"UPDATE partidos "
        f"SET cor_primaria = '{COR_FALLBACK_PRIMARIA}', "
        f"    cor_secundaria = '{COR_FALLBACK_SECUNDARIA}' "
        f"WHERE cor_primaria IS NULL"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE partidos DROP COLUMN IF EXISTS cor_secundaria")
    op.execute("ALTER TABLE partidos DROP COLUMN IF EXISTS cor_primaria")
