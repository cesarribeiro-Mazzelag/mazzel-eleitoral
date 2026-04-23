"""
Carrega municípios no banco:
  1. Lê o CSV de mapeamento TSE ↔ IBGE
  2. Lê o shapefile IBGE (geometrias)
  3. Insere/atualiza a tabela `municipios`
"""
import pandas as pd
import geopandas as gpd
from pathlib import Path
from sqlalchemy import text
from app.etl.config import DATA_DIR, TSE_SEP, TSE_ENC


def _ler_mapeamento() -> pd.DataFrame:
    pasta = DATA_DIR / "municipio_tse_ibge"
    csvs = list(pasta.glob("*.csv"))
    if not csvs:
        raise FileNotFoundError(f"CSV de mapeamento não encontrado em {pasta}")

    df = pd.read_csv(csvs[0], sep=TSE_SEP, encoding=TSE_ENC, dtype=str)
    df.columns = [c.strip() for c in df.columns]

    # Normaliza nomes das colunas (variam entre versões do arquivo)
    col_map = {}
    for col in df.columns:
        cu = col.upper()
        if "CD_MUNICIPIO_TSE" in cu or cu == "CD_MUN_TSE":
            col_map[col] = "codigo_tse"
        elif "CD_MUNICIPIO_IBGE" in cu or cu == "CD_MUN_IBGE":
            col_map[col] = "codigo_ibge"
        elif "NM_MUNICIPIO" in cu:
            col_map[col] = "nome"
        elif cu in ("SG_UF", "UF"):
            col_map[col] = "estado_uf"

    df = df.rename(columns=col_map)
    needed = ["codigo_tse", "codigo_ibge", "nome", "estado_uf"]
    for n in needed:
        if n not in df.columns:
            raise ValueError(f"Coluna '{n}' não encontrada. Colunas disponíveis: {list(df.columns)}")

    df = df[needed].drop_duplicates(subset=["codigo_tse"]).copy()
    df["codigo_tse"]  = df["codigo_tse"].str.strip().str.lstrip("0")
    df["codigo_ibge"] = df["codigo_ibge"].str.strip().str.zfill(7)
    df["nome"]        = df["nome"].str.strip()
    df["estado_uf"]   = df["estado_uf"].str.strip()
    return df


def _ler_shapefile() -> gpd.GeoDataFrame | None:
    pasta = DATA_DIR / "shapefiles"
    shps = list(pasta.rglob("*.shp"))
    if not shps:
        print("    ⚠ Shapefile não encontrado — municípios sem geometria")
        return None

    gdf = gpd.read_file(shps[0])
    gdf = gdf.to_crs(epsg=4326)

    # Normaliza colunas
    col_map = {}
    for col in gdf.columns:
        cu = col.upper()
        if cu in ("CD_MUN", "GEOCODIGO", "CD_GEOCMU", "CD_GEOCODM"):
            col_map[col] = "codigo_ibge"
        elif cu in ("NM_MUN", "NM_MUNICIP", "NOME"):
            col_map[col] = "nome_shp"

    gdf = gdf.rename(columns=col_map)
    if "codigo_ibge" not in gdf.columns:
        # Tenta a primeira coluna com 7 dígitos
        for col in gdf.columns:
            sample = gdf[col].dropna().astype(str).head(5).tolist()
            if all(len(v.strip()) == 7 and v.strip().isdigit() for v in sample):
                gdf = gdf.rename(columns={col: "codigo_ibge"})
                break

    gdf["codigo_ibge"] = gdf["codigo_ibge"].astype(str).str.strip().str.zfill(7)
    return gdf[["codigo_ibge", "geometry"]]


def carregar_municipios(conn):
    print("\n  Municípios: lendo mapeamento TSE↔IBGE...")
    df = _ler_mapeamento()
    print(f"    {len(df)} municípios no mapeamento")

    print("  Municípios: lendo shapefile IBGE...")
    gdf = _ler_shapefile()

    if gdf is not None:
        df = df.merge(gdf, on="codigo_ibge", how="left")
        print(f"    {df['geometry'].notna().sum()} municípios com geometria")
    else:
        df["geometry"] = None

    # Upsert via SQL (mais rápido que ORM para bulk)
    linhas = 0
    for _, row in df.iterrows():
        geom_wkt = None
        if row.get("geometry") is not None:
            try:
                geom_wkt = row["geometry"].wkt
            except Exception:
                pass

        conn.execute(text("""
            INSERT INTO municipios (codigo_tse, codigo_ibge, nome, estado_uf, geometry)
            VALUES (
                :codigo_tse, :codigo_ibge, :nome, :estado_uf,
                CASE WHEN :geom IS NOT NULL
                     THEN ST_Multi(ST_GeomFromText(:geom, 4326))
                     ELSE NULL END
            )
            ON CONFLICT (codigo_tse) DO UPDATE SET
                codigo_ibge = EXCLUDED.codigo_ibge,
                nome        = EXCLUDED.nome,
                estado_uf   = EXCLUDED.estado_uf,
                geometry    = COALESCE(EXCLUDED.geometry, municipios.geometry)
        """), {
            "codigo_tse":  int(row["codigo_tse"]) if str(row["codigo_tse"]).isdigit() else 0,
            "codigo_ibge": row["codigo_ibge"],
            "nome":        row["nome"],
            "estado_uf":   row["estado_uf"],
            "geom":        geom_wkt,
        })
        linhas += 1

    conn.commit()
    print(f"  ✓ {linhas} municípios carregados")
    return linhas
