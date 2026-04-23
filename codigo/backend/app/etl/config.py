"""
Configuração do pipeline ETL.
"""
from pathlib import Path

# Pasta de dados brutos (dentro do container)
DATA_DIR = Path("/app/dados_brutos")
DATA_DIR.mkdir(exist_ok=True)

# CDN do TSE
TSE_CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele"

# IBGE
IBGE_SHAPEFILE_URL = (
    "https://geoftp.ibge.gov.br/organizacao_do_territorio/"
    "malhas_territoriais/malhas_municipais/municipio_2022/"
    "Brasil/BR/BR_Municipios_2022.zip"
)

# Eleições municipais: Prefeito + Vereador
ANOS_MUNICIPAIS = [2016, 2020, 2024]

# Eleições gerais: Dep. Estadual + Dep. Federal + Senador + Governador
ANOS_GERAIS = [2018, 2022]

TODOS_ANOS = sorted(set(ANOS_MUNICIPAIS + ANOS_GERAIS))

# Partidos históricos do União Brasil
NUMEROS_UNIAO = {44, 25, 17}  # UNIAO, DEM, PSL

# Encoding dos CSVs do TSE
TSE_ENC = "latin-1"
TSE_SEP = ";"

# Colunas mínimas necessárias por arquivo
COLUNAS_CAND = [
    "ANO_ELEICAO", "SG_UF", "SG_UE", "CD_MUNICIPIO", "NM_MUNICIPIO",
    "DS_CARGO", "SQ_CANDIDATO", "NM_CANDIDATO", "NM_URNA_CANDIDATO",
    "NR_CPF_CANDIDATO", "NR_PARTIDO", "SG_PARTIDO",
    "DS_GENERO", "DS_GRAU_INSTRUCAO", "DS_COR_RACA", "DS_OCUPACAO",
    "DS_SIT_TOT_TURNO", "DT_NASCIMENTO",
]

COLUNAS_VOTO = [
    "ANO_ELEICAO", "SG_UF", "CD_MUNICIPIO", "NM_MUNICIPIO",
    "NR_ZONA", "DS_CARGO", "SQ_CANDIDATO",
    "NM_CANDIDATO", "NR_PARTIDO", "SG_PARTIDO",
    "QT_VOTOS_NOMINAIS", "DS_SIT_TOT_TURNO",
]

SITUACOES_ELEITO = {"ELEITO", "ELEITO POR QP", "ELEITO POR MÉDIA"}
