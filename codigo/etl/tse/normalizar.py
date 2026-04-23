"""
Normalização dos CSVs do TSE.
Problemas tratados:
  - Encoding ISO-8859-1 → UTF-8
  - Schema muda entre anos (2016 tem colunas que 2024 não tem)
  - Código de município TSE ≠ código IBGE
  - DEM + PSL → União Brasil (equivalência histórica)
"""
import pandas as pd
from pathlib import Path

# Partidos que fazem parte do histórico do União Brasil
PARTIDOS_UNIAO_BRASIL = {
    44: "UNIAO",  # União Brasil (2022+)
    25: "DEM",    # Democratas → predecessor
    17: "PSL",    # PSL → predecessor
}

# Separador e encoding padrão do TSE
TSE_SEP = ";"
TSE_ENC = "latin-1"

# Colunas mínimas necessárias — existem em todos os anos
COLUNAS_CANDIDATOS = {
    "ANO_ELEICAO": "ano",
    "SG_UF": "estado_uf",
    "CD_MUNICIPIO": "codigo_municipio_tse",
    "NM_MUNICIPIO": "nome_municipio",
    "CD_CARGO": "codigo_cargo",
    "DS_CARGO": "cargo",
    "SQ_CANDIDATO": "sequencial_tse",
    "NM_CANDIDATO": "nome_completo",
    "NM_URNA_CANDIDATO": "nome_urna",
    "NR_CPF_CANDIDATO": "cpf_raw",
    "NR_PARTIDO": "numero_partido",
    "SG_PARTIDO": "sigla_partido",
    "DS_GENERO": "genero",
    "DS_GRAU_INSTRUCAO": "grau_instrucao",
    "DS_COR_RACA": "cor_raca",
    "DS_OCUPACAO": "ocupacao",
    "DS_SIT_TOT_TURNO": "situacao_final",
}

COLUNAS_VOTACAO = {
    "ANO_ELEICAO": "ano",
    "SG_UF": "estado_uf",
    "CD_MUNICIPIO": "codigo_municipio_tse",
    "NM_MUNICIPIO": "nome_municipio",
    "NR_ZONA": "zona",
    "CD_CARGO": "codigo_cargo",
    "DS_CARGO": "cargo",
    "SQ_CANDIDATO": "sequencial_tse",
    "NM_CANDIDATO": "nome_candidato",
    "NR_PARTIDO": "numero_partido",
    "SG_PARTIDO": "sigla_partido",
    "QT_VOTOS_NOMINAIS": "qt_votos",
    "DS_SIT_TOT_TURNO": "situacao_final",
}

# Valores que indicam eleição bem-sucedida
SITUACOES_ELEITO = {"ELEITO", "ELEITO POR QP", "ELEITO POR MÉDIA"}


def ler_csv_tse(caminho: Path, colunas_mapa: dict) -> pd.DataFrame:
    """Lê um CSV do TSE com tratamento de encoding e normalização de colunas."""
    df = pd.read_csv(
        caminho,
        sep=TSE_SEP,
        encoding=TSE_ENC,
        dtype=str,
        low_memory=False,
    )

    # Remove colunas extras e renomeia para o padrão interno
    colunas_existentes = {
        k: v for k, v in colunas_mapa.items() if k in df.columns
    }
    df = df[list(colunas_existentes.keys())].rename(columns=colunas_existentes)

    # Limpa espaços extras
    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].str.strip()

    return df


def filtrar_uniao_brasil(df: pd.DataFrame) -> pd.DataFrame:
    """
    Filtra apenas candidatos do União Brasil e seus predecessores históricos.
    """
    df["numero_partido"] = pd.to_numeric(df["numero_partido"], errors="coerce")
    return df[df["numero_partido"].isin(PARTIDOS_UNIAO_BRASIL.keys())].copy()


def normalizar_situacao(df: pd.DataFrame) -> pd.DataFrame:
    """Adiciona coluna booleana 'eleito' baseada em situacao_final."""
    df["eleito"] = df["situacao_final"].isin(SITUACOES_ELEITO)
    return df


def carregar_mapeamento_ibge(dados_dir: Path) -> pd.DataFrame:
    """
    Carrega o arquivo de correspondência entre códigos TSE e IBGE.
    Obrigatório para cruzar dados eleitorais com shapefile do IBGE.
    """
    caminho = dados_dir / "municipio_tse_ibge" / "municipio_tse_ibge.csv"
    df = pd.read_csv(caminho, sep=TSE_SEP, encoding=TSE_ENC, dtype=str)
    return df[["CD_MUNICIPIO_TSE", "CD_MUNICIPIO_IBGE", "NM_MUNICIPIO_TSE", "SG_UF"]].rename(
        columns={
            "CD_MUNICIPIO_TSE": "codigo_tse",
            "CD_MUNICIPIO_IBGE": "codigo_ibge",
            "NM_MUNICIPIO_TSE": "nome",
            "SG_UF": "estado_uf",
        }
    )


def processar_candidatos(ano: int, dados_dir: Path) -> pd.DataFrame:
    """Pipeline completo de normalização dos candidatos de um ano."""
    pasta = dados_dir / f"candidatos_{ano}"
    csvs = list(pasta.glob("*.csv"))
    if not csvs:
        raise FileNotFoundError(f"Nenhum CSV encontrado em {pasta}")

    frames = []
    for csv in csvs:
        df = ler_csv_tse(csv, COLUNAS_CANDIDATOS)
        df = filtrar_uniao_brasil(df)
        df = normalizar_situacao(df)
        frames.append(df)

    resultado = pd.concat(frames, ignore_index=True)
    resultado["ano"] = ano
    return resultado


def processar_votacao(ano: int, dados_dir: Path) -> pd.DataFrame:
    """Pipeline completo de normalização da votação de um ano."""
    pasta = dados_dir / f"votacao_munzona_{ano}"
    csvs = list(pasta.glob("*.csv"))
    if not csvs:
        raise FileNotFoundError(f"Nenhum CSV encontrado em {pasta}")

    frames = []
    for csv in csvs:
        df = ler_csv_tse(csv, COLUNAS_VOTACAO)
        df = filtrar_uniao_brasil(df)
        df["qt_votos"] = pd.to_numeric(df["qt_votos"], errors="coerce").fillna(0).astype(int)
        frames.append(df)

    resultado = pd.concat(frames, ignore_index=True)
    resultado["ano"] = ano
    return resultado
