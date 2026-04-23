"""
PASSO 2 — Importar municípios + geometrias
Fontes:
  - municipio_tse_ibge.csv (mapeamento código TSE <-> código IBGE, já baixado)
  - BR_Municipios_2022.shp (shapefile IBGE, já baixado)
  - API IBGE servicodados.ibge.gov.br (população + PIB)

Após este script, tabela `municipios` estará completa com:
  - codigo_tse, codigo_ibge, nome, estado_uf
  - geometry (PostGIS — polígono do município)
  - populacao, pib_per_capita (opcionais, via API IBGE)
"""
from __future__ import annotations
import sys
import json
import time
import requests
import pandas as pd
import geopandas as gpd
from pathlib import Path
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import get_session, test_connection, engine
from config import DADOS_BRUTOS

MAPEAMENTO_CSV = DADOS_BRUTOS / "municipio_tse_ibge" / "municipio_tse_ibge.csv"
SHAPEFILE = DADOS_BRUTOS / "shapefiles" / "BR_Municipios_2022.shp"

# API IBGE — dados socioeconômicos
IBGE_API = "https://servicodados.ibge.gov.br/api/v1"


def carregar_mapeamento() -> pd.DataFrame:
    print("[municipios] Carregando mapeamento TSE-IBGE...")
    df = pd.read_csv(
        MAPEAMENTO_CSV,
        sep=";",
        encoding="latin-1",
        dtype=str,
        quotechar='"',
    )
    # Normaliza nomes de colunas
    df.columns = [c.strip() for c in df.columns]

    df = df.rename(columns={
        "CD_MUNICIPIO_TSE": "codigo_tse",
        "CD_MUNICIPIO_IBGE": "codigo_ibge",
        "NM_MUNICIPIO_TSE": "nome_tse",
        "NM_MUNICIPIO_IBGE": "nome_ibge",
        "SG_UF": "estado_uf",
        "NM_UF": "nome_uf",
    })

    df["codigo_tse"] = df["codigo_tse"].str.strip()
    df["codigo_ibge"] = df["codigo_ibge"].str.strip().str.zfill(7)
    df["estado_uf"] = df["estado_uf"].str.strip()
    df["nome"] = df["nome_ibge"].str.strip().str.title()

    print(f"  {len(df)} municípios no mapeamento TSE-IBGE")
    return df[["codigo_tse", "codigo_ibge", "nome", "estado_uf"]].copy()


def carregar_geometrias() -> gpd.GeoDataFrame:
    print("[municipios] Carregando shapefile IBGE...")
    gdf = gpd.read_file(SHAPEFILE)
    print(f"  CRS original: {gdf.crs}")

    # Reprojetar para WGS84 (SRID 4326) — padrão PostGIS para o mapa
    if gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)

    # Normaliza código IBGE para 7 dígitos
    # O shapefile geralmente usa a coluna CD_MUN (7 dígitos) ou CD_GEOCODM (7)
    col_codigo = None
    for col in ["CD_MUN", "CD_GEOCODM", "GEOCODIGO", "CD_GEOCOD", "CD_IBGE"]:
        if col in gdf.columns:
            col_codigo = col
            break

    if col_codigo is None:
        print(f"  Colunas disponíveis: {list(gdf.columns)}")
        raise ValueError("Coluna de código IBGE não encontrada no shapefile")

    gdf["codigo_ibge"] = gdf[col_codigo].astype(str).str.zfill(7)
    gdf = gdf[["codigo_ibge", "geometry"]].copy()
    print(f"  {len(gdf)} geometrias carregadas")
    return gdf


def buscar_populacao_ibge(codigos_ibge: list[str]) -> dict[str, int]:
    """Busca população via API IBGE (censo 2022)."""
    print("[municipios] Buscando população via API IBGE...")
    pop = {}
    try:
        # API IBGE V3 - estimativa de população 2022
        # Máximo 100 municípios por requisição
        batch_size = 100
        for i in range(0, len(codigos_ibge), batch_size):
            batch = codigos_ibge[i:i + batch_size]
            codigos_str = "|".join(batch)
            url = f"{IBGE_API}/pesquisas/-/indicadores/29171/resultados/{codigos_str}"
            r = requests.get(url, timeout=30)
            if r.status_code == 200:
                data = r.json()
                for item in data:
                    for res in item.get("res", []):
                        loc_id = res.get("localidade")
                        valor = res.get("res", {})
                        if isinstance(valor, dict):
                            anos = list(valor.keys())
                            if anos:
                                v = valor[max(anos)]
                                try:
                                    pop[loc_id] = int(v)
                                except (ValueError, TypeError):
                                    pass
            time.sleep(0.3)
            print(f"  {min(i + batch_size, len(codigos_ibge))}/{len(codigos_ibge)}", end="\r")
    except Exception as e:
        print(f"\n  [aviso] Falha ao buscar população: {e} — continuando sem ela")
    print(f"\n  {len(pop)} municípios com população")
    return pop


def importar_municipios(com_populacao: bool = True):
    if not test_connection():
        return False

    # Carrega os dados
    df_mapa = carregar_mapeamento()

    geometrias_disponiveis = SHAPEFILE.exists()
    if geometrias_disponiveis:
        gdf = carregar_geometrias()
        df_mapa = df_mapa.merge(
            gdf[["codigo_ibge", "geometry"]],
            on="codigo_ibge",
            how="left",
        )
        sem_geom = df_mapa["geometry"].isna().sum()
        if sem_geom > 0:
            print(f"  [aviso] {sem_geom} municípios sem geometria no shapefile")
    else:
        print("  [aviso] Shapefile não encontrado — importando sem geometrias")
        df_mapa["geometry"] = None

    # Busca população (opcional)
    pop = {}
    if com_populacao:
        codigos = df_mapa["codigo_ibge"].tolist()
        pop = buscar_populacao_ibge(codigos)

    # Insere no banco
    session = get_session()
    try:
        existentes = session.execute(text("SELECT COUNT(*) FROM municipios")).scalar()
        print(f"\n[municipios] Registros existentes: {existentes}")

        inseridos = 0
        atualizados = 0

        for _, row in df_mapa.iterrows():
            codigo_tse = str(row["codigo_tse"]).strip()
            codigo_ibge = str(row["codigo_ibge"]).strip()
            nome = row["nome"]
            estado_uf = row["estado_uf"]
            populacao = pop.get(codigo_ibge[:6])  # API usa 6 dígitos

            # Verifica se existe
            existente = session.execute(
                text("SELECT id FROM municipios WHERE codigo_tse = :tse"),
                {"tse": codigo_tse}
            ).fetchone()

            if geometrias_disponiveis and row["geometry"] is not None:
                from shapely import to_wkt
                geom_wkt = to_wkt(row["geometry"])
                geom_sql = f"ST_GeomFromText('{geom_wkt}', 4326)"
            else:
                geom_sql = "NULL"

            if existente:
                session.execute(
                    text(f"""
                        UPDATE municipios
                        SET codigo_ibge = :ibge, nome = :nome, estado_uf = :uf,
                            populacao = :pop,
                            geometry = {geom_sql}
                        WHERE codigo_tse = :tse
                    """),
                    {
                        "ibge": codigo_ibge, "nome": nome, "uf": estado_uf,
                        "pop": populacao, "tse": codigo_tse,
                    }
                )
                atualizados += 1
            else:
                session.execute(
                    text(f"""
                        INSERT INTO municipios
                            (codigo_tse, codigo_ibge, nome, estado_uf, populacao, geometry)
                        VALUES
                            (:tse, :ibge, :nome, :uf, :pop, {geom_sql})
                    """),
                    {
                        "tse": codigo_tse, "ibge": codigo_ibge, "nome": nome,
                        "uf": estado_uf, "pop": populacao,
                    }
                )
                inseridos += 1

            if (inseridos + atualizados) % 500 == 0:
                session.commit()
                print(f"  {inseridos + atualizados}/{len(df_mapa)} processados...", end="\r")

        session.commit()
        total = session.execute(text("SELECT COUNT(*) FROM municipios")).scalar()
        print(f"\n[municipios] Inseridos: {inseridos} | Atualizados: {atualizados} | Total: {total}")
        return True

    except Exception as e:
        session.rollback()
        print(f"\n[municipios] ERRO: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    print("=== Passo 2 — Importar Municípios ===\n")
    importar_municipios(com_populacao=True)
    print("\n[done]")
