"""
PASSO 8 — Importar polígonos de distritos/bairros do IBGE 2022
Fonte: BR_distritos_CD2022.zip — IBGE Censo 2022
URL: https://geoftp.ibge.gov.br/.../censo_2022/distritos/shp/BR/BR_distritos_CD2022.zip

Popula a tabela:
  - distritos_municipio (polígonos dos distritos de cada município)

Estes polígonos são exibidos no mapa quando o usuário entra no nível de cidade,
mostrando a divisão real de bairros/distritos — o mesmo nível de granularidade
usado nos mapas eleitorais oficiais.

Total Brasil: ~10.900 distritos cobrindo todos os 5.570 municípios.
"""
from __future__ import annotations
import io
import sys
import zipfile
from pathlib import Path

import requests
import geopandas as gpd
from shapely.geometry import mapping
import json

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))

from sqlalchemy import text
from db import get_session, test_connection
from config import DADOS_BRUTOS

URL = (
    "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/"
    "malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/"
    "distritos/shp/BR/BR_distritos_CD2022.zip"
)
DEST = DADOS_BRUTOS / "ibge" / "BR_distritos_CD2022.zip"
BATCH = 200


def download():
    DEST.parent.mkdir(parents=True, exist_ok=True)
    if DEST.exists():
        print(f"  [skip] {DEST.name} já existe ({DEST.stat().st_size/1024/1024:.0f} MB)")
        return True
    print(f"  Baixando {URL} (~237 MB) ...")
    r = requests.get(URL, stream=True, timeout=300)
    if r.status_code != 200:
        print(f"  [erro] HTTP {r.status_code}")
        return False
    total = int(r.headers.get("content-length", 0))
    baixado = 0
    with open(DEST, "wb") as f:
        for chunk in r.iter_content(65536):
            f.write(chunk)
            baixado += len(chunk)
            if total:
                print(f"\r  {baixado/1024/1024:.1f}/{total/1024/1024:.0f} MB", end="", flush=True)
    print(f"\n  [ok] {DEST.stat().st_size/1024/1024:.0f} MB")
    return True


def importar():
    if not test_connection():
        return False

    if not DEST.exists():
        if not download():
            return False

    print("[distritos] Lendo shapefile do IBGE...")
    gdf = gpd.read_file(f"zip://{DEST}")
    print(f"  {len(gdf)} distritos | CRS: {gdf.crs}")
    print(f"  Colunas: {list(gdf.columns)}")

    # Reprojeta para WGS84 (SRID 4326) se necessário
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)
        print("  Reprojetado para EPSG:4326")

    # Identifica colunas do shapefile (nomes podem variar)
    col_cd_dist = _find_col(gdf, ["CD_DIST", "cd_dist", "CODDISTR"])
    col_nm_dist = _find_col(gdf, ["NM_DIST", "nm_dist", "NOMEDIST", "NM_DISTRIT"])
    col_cd_mun  = _find_col(gdf, ["CD_MUN", "cd_mun", "CD_GCMUN", "CODMUN"])
    col_nm_mun  = _find_col(gdf, ["NM_MUN", "nm_mun", "NOMEMUN"])
    col_uf      = _find_col(gdf, ["SIGLA_UF", "sigla_uf", "UF", "SG_UF"])

    print(f"  Colunas mapeadas: dist={col_cd_dist}, mun={col_cd_mun}, uf={col_uf}")

    session = get_session()

    # Verifica se já existe dados
    count_existente = session.execute(text("SELECT COUNT(*) FROM distritos_municipio")).scalar()
    if count_existente and count_existente > 0:
        print(f"  [skip] Já existem {count_existente:,} distritos no banco. Use --force para reimportar.")
        session.close()
        return True

    inseridos = 0
    erros = 0
    batch_params = []

    for _, row in gdf.iterrows():
        geom = row.geometry
        if geom is None or geom.is_empty:
            erros += 1
            continue

        # Converte geometria para WKT para inserção PostGIS
        try:
            geom_wkt = geom.wkt
        except Exception:
            erros += 1
            continue

        cd_dist = str(row[col_cd_dist]).strip() if col_cd_dist else None
        nm_dist = str(row[col_nm_dist]).strip()[:200] if col_nm_dist else None
        cd_mun  = str(row[col_cd_mun]).strip()[:10]   if col_cd_mun  else None
        nm_mun  = str(row[col_nm_mun]).strip()[:200]  if col_nm_mun  else None
        uf      = str(row[col_uf]).strip()[:2]         if col_uf      else None

        batch_params.append({
            "cd_dist": cd_dist,
            "nm_dist": nm_dist,
            "cd_mun":  cd_mun,
            "nm_mun":  nm_mun,
            "uf":      uf,
            "geom":    geom_wkt,
        })

        if len(batch_params) >= BATCH:
            _flush(session, batch_params)
            inseridos += len(batch_params)
            batch_params = []
            print(f"\r  {inseridos:,} distritos...", end="", flush=True)

    if batch_params:
        _flush(session, batch_params)
        inseridos += len(batch_params)

    session.commit()
    session.close()
    print(f"\n[distritos] {inseridos:,} inseridos | {erros} erros")
    return True


def _find_col(gdf: gpd.GeoDataFrame, candidates: list[str]) -> str | None:
    cols = list(gdf.columns)
    cols_upper = [c.upper() for c in cols]
    for c in candidates:
        if c.upper() in cols_upper:
            return cols[cols_upper.index(c.upper())]
    return None


def _flush(session, batch: list):
    session.execute(text("""
        INSERT INTO distritos_municipio (cd_dist, nm_dist, cd_mun, nm_mun, sigla_uf, geometry)
        VALUES (
            :cd_dist, :nm_dist, :cd_mun, :nm_mun, :uf,
            ST_Multi(ST_GeomFromText(:geom, 4326))
        )
        ON CONFLICT (cd_dist) DO NOTHING
    """), batch)
    session.commit()


if __name__ == "__main__":
    import sys
    force = "--force" in sys.argv
    print("=== Passo 8 — Distritos/Bairros IBGE 2022 ===\n")
    importar()
    print("\n[done]")
