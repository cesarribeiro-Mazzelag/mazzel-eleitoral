"""
Configurações do pipeline ETL — Plataforma Eleitoral União Brasil
"""
import os
from pathlib import Path

# Diretório raiz do ETL
ETL_DIR = Path(__file__).parent
DADOS_BRUTOS = ETL_DIR.parent / "codigo" / "backend" / "dados_brutos"
DADOS_BRUTOS.mkdir(parents=True, exist_ok=True)

# Banco de dados (local, fora do Docker)
DATABASE_URL = os.getenv(
    "DATABASE_URL_ETL",
    "postgresql://postgres:postgres@localhost:5435/uniao_brasil"
)

# TSE — URLs base para download
TSE_CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele"

# Eleições municipais: Prefeito + Vereador
ANOS_MUNICIPAIS = [2008, 2012, 2016, 2020, 2024]

# Eleições gerais: DepEst, DepFed, Senador, Governador, Presidente
ANOS_GERAIS = [2010, 2014, 2018, 2022]

TODOS_OS_ANOS = sorted(ANOS_MUNICIPAIS + ANOS_GERAIS)

# Cargos municipais
CARGOS_MUNICIPAIS = {"PREFEITO", "VICE-PREFEITO", "VEREADOR"}

# Cargos estaduais/federais
CARGOS_GERAIS = {
    "GOVERNADOR", "VICE-GOVERNADOR",
    "SENADOR",
    "DEPUTADO FEDERAL",
    "DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL",
    "PRESIDENTE", "VICE-PRESIDENTE",
}

TODOS_OS_CARGOS = CARGOS_MUNICIPAIS | CARGOS_GERAIS

# União Brasil: número atual + predecessores históricos
UNIAO_BRASIL_NUMERO = 44
PREDECESSORES_UNIAO = {25: "DEM", 17: "PSL"}  # número: sigla

# Encoding dos CSVs do TSE
TSE_ENCODING = "latin-1"  # ISO-8859-1
TSE_SEPARATOR = ";"

# Batch size para inserções
BATCH_SIZE = 5000

print(f"[config] Dados brutos em: {DADOS_BRUTOS}")
print(f"[config] Banco: {DATABASE_URL}")
