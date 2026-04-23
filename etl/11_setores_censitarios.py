"""
PASSO 11 — Importar setores censitários do IBGE (Censo 2022)
Fonte: geoftp.ibge.gov.br — malhas de setores censitários por UF
URL: https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/
     malhas_de_setores_censitarios__702/censo_2022/{UF}/{UF}_setores_2022.zip

Popula a tabela:
  - setores_censitarios (polígonos dos setores de cada município)

Cada setor censitário tem ~150-300 domicílios. É a menor unidade geográfica
oficial do Brasil. Total esperado: ~452.000 setores em 27 UFs.

Uso: python 11_setores_censitarios.py [--force] [--uf SP,RJ,MG]
  --force: reimporta mesmo se já existem dados
  --uf:    importa apenas as UFs listadas (default: todas)
"""
from __future__ import annotations
import io
import os
import sys
import time
import zipfile
from pathlib import Path

import requests
import geopandas as gpd
from shapely.geometry import MultiPolygon, mapping
from shapely import wkt

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))

from sqlalchemy import text
from db import get_session, test_connection
from config import DADOS_BRUTOS

# Todas as UFs do Brasil
TODAS_UFS = [
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
    "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
    "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
]

BASE_URL = (
    "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/"
    "malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/"
    "setores/shp/UF"
)

DEST_DIR = DADOS_BRUTOS / "ibge" / "setores_censitarios"
BATCH = 1000
SIMPLIFY_TOLERANCE = 0.0001  # ~11m at equator — fine for display


def download_uf(uf: str) -> Path | None:
    """Download shapefile ZIP for a single UF. Returns path or None on error."""
    dest = DEST_DIR / f"{uf}_setores_CD2022.zip"
    dest.parent.mkdir(parents=True, exist_ok=True)

    if dest.exists() and dest.stat().st_size > 1000:
        print(f"  [skip] {dest.name} já existe ({dest.stat().st_size / 1024 / 1024:.1f} MB)")
        return dest

    url = f"{BASE_URL}/{uf}_setores_CD2022.zip"
    print(f"  Baixando {url} ...")
    try:
        r = requests.get(url, stream=True, timeout=600)
        if r.status_code != 200:
            print(f"  [erro] HTTP {r.status_code} para {uf}")
            return None
        total = int(r.headers.get("content-length", 0))
        baixado = 0
        with open(dest, "wb") as f:
            for chunk in r.iter_content(65536):
                f.write(chunk)
                baixado += len(chunk)
                if total:
                    print(f"\r  {uf}: {baixado / 1024 / 1024:.1f}/{total / 1024 / 1024:.0f} MB", end="", flush=True)
        print(f"\n  [ok] {dest.name} ({dest.stat().st_size / 1024 / 1024:.1f} MB)")
        return dest
    except Exception as e:
        print(f"  [erro] Download {uf}: {e}")
        if dest.exists():
            dest.unlink()
        return None


def _find_col(gdf: gpd.GeoDataFrame, candidates: list[str]) -> str | None:
    """Find column by name candidates (case-insensitive)."""
    cols = list(gdf.columns)
    cols_upper = [c.upper() for c in cols]
    for c in candidates:
        if c.upper() in cols_upper:
            return cols[cols_upper.index(c.upper())]
    return None


def _ensure_multi(geom):
    """Ensure geometry is MultiPolygon."""
    if geom is None or geom.is_empty:
        return None
    if geom.geom_type == "Polygon":
        return MultiPolygon([geom])
    if geom.geom_type == "MultiPolygon":
        return geom
    # GeometryCollection or other — try to extract polygons
    from shapely.geometry import GeometryCollection
    if hasattr(geom, "geoms"):
        polys = [g for g in geom.geoms if g.geom_type in ("Polygon", "MultiPolygon")]
        if polys:
            all_polys = []
            for p in polys:
                if p.geom_type == "Polygon":
                    all_polys.append(p)
                else:
                    all_polys.extend(p.geoms)
            if all_polys:
                return MultiPolygon(all_polys)
    return None


def _flush(session, batch: list[dict]):
    """Insert a batch of setores into the database."""
    session.execute(text("""
        INSERT INTO setores_censitarios
            (codigo_setor, codigo_municipio, estado_uf, nome_distrito,
             nome_subdistrito, tipo, geometry, populacao, domicilios)
        VALUES
            (:codigo_setor, :codigo_municipio, :estado_uf, :nome_distrito,
             :nome_subdistrito, :tipo,
             ST_Multi(ST_GeomFromText(:geom, 4326)),
             :populacao, :domicilios)
        ON CONFLICT (codigo_setor) DO NOTHING
    """), batch)
    session.commit()


def importar_uf(session, uf: str, zip_path: Path) -> tuple[int, int]:
    """Import setores from a single UF shapefile. Returns (inserted, errors)."""
    print(f"\n[{uf}] Lendo shapefile...")
    t0 = time.time()

    try:
        gdf = gpd.read_file(f"zip://{zip_path}")
    except Exception as e:
        print(f"  [erro] Leitura shapefile {uf}: {e}")
        return 0, 1

    print(f"  {len(gdf):,} features | CRS: {gdf.crs}")
    print(f"  Colunas: {list(gdf.columns)}")

    # Reproject to WGS84 if needed
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)
        print("  Reprojetado para EPSG:4326")

    # Map columns — IBGE Censo 2022 setores
    # Known columns: CD_SETOR, SITUACAO, CD_SIT, CD_MUN, NM_DIST, NM_SUBDIST, CD_UF, NM_UF
    col_cd_setor = _find_col(gdf, ["CD_SETOR", "cd_setor", "CD_GEOCODI", "GEOCODIGO"])
    col_cd_mun = _find_col(gdf, ["CD_MUN", "cd_mun", "CD_GCMUN", "CODMUN"])
    col_nm_dist = _find_col(gdf, ["NM_DIST", "nm_dist", "NM_DISTRIT", "NOME_DIST"])
    col_nm_subdist = _find_col(gdf, ["NM_SUBDIST", "nm_subdist", "NM_SUBDIS"])
    col_tipo = _find_col(gdf, ["SITUACAO", "TIPO", "NM_SIT", "TIPO_SETOR"])
    col_pop = _find_col(gdf, ["POP", "POPULACAO", "V001", "MORADORES"])
    col_dom = _find_col(gdf, ["DOM", "DOMICILIOS", "V002", "QT_DOMIC"])

    print(f"  Mapeamento: setor={col_cd_setor}, mun={col_cd_mun}")

    if not col_cd_setor:
        # Fallback: try to derive from other columns or use first numeric column
        print(f"  [AVISO] Coluna de código do setor não encontrada! Tentando CD_GEOCODSE...")
        col_cd_setor = _find_col(gdf, ["CD_GEOCODSE", "CD_GEOCODI", "GEOCODIGO", "CD_SETOR_CENSITARIO"])
        if not col_cd_setor:
            print(f"  [erro] Impossível identificar coluna de código do setor para {uf}")
            return 0, len(gdf)

    inseridos = 0
    erros = 0
    batch_params = []

    for _, row in gdf.iterrows():
        geom = row.geometry
        if geom is None or geom.is_empty:
            erros += 1
            continue

        # Simplify geometry for performance
        try:
            geom_simplified = geom.simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)
            geom_multi = _ensure_multi(geom_simplified)
            if geom_multi is None or geom_multi.is_empty:
                erros += 1
                continue
            geom_wkt = geom_multi.wkt
        except Exception:
            erros += 1
            continue

        codigo_setor = str(row[col_cd_setor]).strip() if col_cd_setor else None
        if not codigo_setor:
            erros += 1
            continue

        # Derive municipio from first 7 digits of setor code
        codigo_mun = codigo_setor[:7] if len(codigo_setor) >= 7 else (
            str(row[col_cd_mun]).strip()[:7] if col_cd_mun else None
        )

        estado = uf  # We know the UF from the download parameter

        nm_dist = str(row[col_nm_dist]).strip()[:200] if col_nm_dist and row[col_nm_dist] else None
        nm_subdist = str(row[col_nm_subdist]).strip()[:200] if col_nm_subdist and row[col_nm_subdist] else None
        tipo = str(row[col_tipo]).strip()[:50] if col_tipo and row[col_tipo] else None

        # Population and households (may not be in shapefile)
        pop = None
        if col_pop:
            try:
                pop = int(row[col_pop])
            except (ValueError, TypeError):
                pass
        dom = None
        if col_dom:
            try:
                dom = int(row[col_dom])
            except (ValueError, TypeError):
                pass

        batch_params.append({
            "codigo_setor": codigo_setor,
            "codigo_municipio": codigo_mun,
            "estado_uf": estado,
            "nome_distrito": nm_dist,
            "nome_subdistrito": nm_subdist,
            "tipo": tipo,
            "geom": geom_wkt,
            "populacao": pop,
            "domicilios": dom,
        })

        if len(batch_params) >= BATCH:
            try:
                _flush(session, batch_params)
                inseridos += len(batch_params)
            except Exception as e:
                print(f"\n  [erro batch] {e}")
                session.rollback()
                erros += len(batch_params)
            batch_params = []
            print(f"\r  [{uf}] {inseridos:,} setores...", end="", flush=True)

    # Flush remaining
    if batch_params:
        try:
            _flush(session, batch_params)
            inseridos += len(batch_params)
        except Exception as e:
            print(f"\n  [erro batch final] {e}")
            session.rollback()
            erros += len(batch_params)

    elapsed = time.time() - t0
    print(f"\n  [{uf}] {inseridos:,} inseridos | {erros} erros | {elapsed:.1f}s")
    return inseridos, erros


def importar(ufs: list[str] | None = None, force: bool = False):
    """Main import function."""
    if not test_connection():
        return False

    session = get_session()

    # Check existing count
    count_existente = session.execute(text("SELECT COUNT(*) FROM setores_censitarios")).scalar()
    if count_existente and count_existente > 0 and not force:
        print(f"  [info] Já existem {count_existente:,} setores no banco.")
        print(f"  Use --force para reimportar (ON CONFLICT = skip duplicatas).")
        if ufs is None:
            session.close()
            return True

    ufs_to_import = ufs or TODAS_UFS
    total_inseridos = 0
    total_erros = 0
    t_global = time.time()

    print(f"\n{'='*60}")
    print(f"  Importando setores censitários para {len(ufs_to_import)} UFs")
    print(f"{'='*60}")

    for i, uf in enumerate(ufs_to_import, 1):
        print(f"\n[{i}/{len(ufs_to_import)}] === {uf} ===")

        # Download
        zip_path = download_uf(uf)
        if not zip_path:
            print(f"  [skip] Não foi possível baixar {uf}")
            continue

        # Import
        ins, err = importar_uf(session, uf, zip_path)
        total_inseridos += ins
        total_erros += err

        # Progress report
        count_atual = session.execute(text("SELECT COUNT(*) FROM setores_censitarios")).scalar()
        elapsed = time.time() - t_global
        print(f"  [progresso] Total no banco: {count_atual:,} | Tempo: {elapsed/60:.1f} min")

    session.close()

    elapsed_total = time.time() - t_global
    print(f"\n{'='*60}")
    print(f"  RESULTADO FINAL")
    print(f"  Inseridos: {total_inseridos:,}")
    print(f"  Erros:     {total_erros:,}")
    print(f"  Tempo:     {elapsed_total/60:.1f} min")
    print(f"{'='*60}")
    return True


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="ETL Setores Censitários IBGE 2022")
    parser.add_argument("--force", action="store_true", help="Reimportar (skip duplicatas)")
    parser.add_argument("--uf", type=str, default=None,
                        help="UFs separadas por vírgula (ex: SP,RJ,MG). Default: todas")
    args = parser.parse_args()

    ufs = [u.strip().upper() for u in args.uf.split(",")] if args.uf else None

    print("=== Passo 11 — Setores Censitários IBGE 2022 ===\n")
    importar(ufs=ufs, force=args.force)
    print("\n[done]")
