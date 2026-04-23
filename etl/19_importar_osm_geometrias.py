"""ETL: Importa OSM ruas arteriais + rios + ferrovias por bbox do distrito.

Usado para construcao dos limites Voronoi (ETL 20):
  - arteriais — snap das bordas Voronoi
  - rios e ferrovias — barreiras intransponiveis (cortam celulas)

Estrategia:
  1. Calcula bbox do distrito IBGE com buffer de 500m
  2. Query Overpass:
     - way[highway~"primary|secondary|trunk|motorway|tertiary"]
     - way[waterway~"river|canal|stream"]
     - way[railway~"rail|subway|light_rail"]
  3. Insere em osm_geometrias

Uso:
    python3 19_importar_osm_geometrias.py --distrito 355030863  # Pirituba
    python3 19_importar_osm_geometrias.py --municipio 3550308   # SP capital inteira
"""
from __future__ import annotations
import argparse
import json
import sys
import time
from pathlib import Path

import requests
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
]


def overpass_query(query: str, max_retries: int = 3) -> dict:
    """Tenta cada endpoint, retry com backoff em caso de overload (504/429)."""
    for tentativa in range(max_retries):
        for endpoint in OVERPASS_ENDPOINTS:
            try:
                print(f"  [tentativa {tentativa+1}] {endpoint}...")
                r = requests.post(endpoint, data={"data": query}, timeout=300)
                if r.status_code == 200:
                    return r.json()
                print(f"    HTTP {r.status_code}")
            except Exception as e:
                print(f"    erro: {e}")
        if tentativa < max_retries - 1:
            wait = 30 * (tentativa + 1)
            print(f"  todos endpoints falharam, aguardando {wait}s...")
            time.sleep(wait)
    raise RuntimeError("todos endpoints Overpass falharam apos retries")


def get_bbox_distrito(conn, cd_dist: str) -> tuple[float, float, float, float]:
    """Retorna bbox (south, west, north, east) com buffer 500m."""
    r = conn.execute(text("""
        SELECT ST_YMin(env) AS south, ST_XMin(env) AS west,
               ST_YMax(env) AS north, ST_XMax(env) AS east
        FROM (
          SELECT ST_Envelope(ST_Buffer(geometry::geography, 500)::geometry) AS env
          FROM distritos_municipio WHERE cd_dist = :cd LIMIT 1
        ) t
    """), {"cd": cd_dist}).fetchone()
    if not r:
        raise RuntimeError(f"distrito {cd_dist} nao encontrado")
    return float(r.south), float(r.west), float(r.north), float(r.east)


def get_bbox_municipio(conn, codigo_ibge: str) -> tuple[float, float, float, float]:
    r = conn.execute(text("""
        SELECT ST_YMin(env) AS south, ST_XMin(env) AS west,
               ST_YMax(env) AS north, ST_XMax(env) AS east
        FROM (
          SELECT ST_Envelope(ST_Buffer(geometry::geography, 500)::geometry) AS env
          FROM municipios WHERE codigo_ibge = :c LIMIT 1
        ) t
    """), {"c": codigo_ibge.zfill(7)}).fetchone()
    if not r:
        raise RuntimeError(f"municipio {codigo_ibge} nao encontrado")
    return float(r.south), float(r.west), float(r.north), float(r.east)


def importar_bbox(bbox: tuple[float, float, float, float], municipio_id: int | None, uf: str | None):
    south, west, north, east = bbox
    bbox_str = f"({south},{west},{north},{east})"

    # Query Overpass — 1 chamada com 3 categorias
    query = f"""
    [out:json][timeout:180];
    (
      way["highway"~"^(primary|secondary|trunk|motorway|tertiary|primary_link|secondary_link|trunk_link|motorway_link)$"]{bbox_str};
      way["waterway"~"^(river|canal|stream)$"]{bbox_str};
      way["railway"~"^(rail|subway|light_rail|tram)$"]{bbox_str};
    );
    out geom;
    """
    print(f"  bbox: ({south:.4f},{west:.4f},{north:.4f},{east:.4f})")
    data = overpass_query(query)
    elementos = data.get("elements", [])
    print(f"  {len(elementos)} elementos retornados")

    # Filtra e classifica
    registros = []
    for el in elementos:
        if el.get("type") != "way" or "geometry" not in el:
            continue
        coords = [(pt["lon"], pt["lat"]) for pt in el["geometry"]]
        if len(coords) < 2:
            continue
        tags = el.get("tags", {})
        if "highway" in tags:
            categoria = "arterial"
            subcategoria = tags["highway"]
        elif "waterway" in tags:
            categoria = "rio"
            subcategoria = tags["waterway"]
        elif "railway" in tags:
            categoria = "ferrovia"
            subcategoria = tags["railway"]
        else:
            continue
        # LineString WKT
        coords_str = ",".join(f"{lng} {lat}" for lng, lat in coords)
        wkt = f"LINESTRING({coords_str})"
        registros.append({
            "osm_id": el["id"],
            "osm_type": "way",
            "categoria": categoria,
            "subcategoria": subcategoria[:40],
            "nome": (tags.get("name") or tags.get("name:pt") or "")[:200] or None,
            "municipio_id": municipio_id,
            "estado_uf": uf,
            "wkt": wkt,
        })

    print(f"  {len(registros)} registros validos")

    BATCH = 500
    inseridos = 0
    with engine.begin() as conn:
        for i in range(0, len(registros), BATCH):
            batch = registros[i:i+BATCH]
            conn.execute(text("""
                INSERT INTO osm_geometrias
                  (osm_id, osm_type, categoria, subcategoria, nome,
                   municipio_id, estado_uf, geometry)
                VALUES
                  (:osm_id, :osm_type, :categoria, :subcategoria, :nome,
                   :municipio_id, :estado_uf,
                   ST_SetSRID(ST_GeomFromText(:wkt), 4326))
                ON CONFLICT DO NOTHING
            """), batch)
            inseridos += len(batch)
    print(f"  {inseridos} inseridos")
    return inseridos


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--distrito", help="cd_dist do distrito IBGE")
    parser.add_argument("--municipio", help="codigo_ibge do municipio (bbox total)")
    args = parser.parse_args()

    inicio = time.time()
    with engine.connect() as conn:
        if args.distrito:
            print(f"importando bbox do distrito {args.distrito}...")
            bbox = get_bbox_distrito(conn, args.distrito)
            mun = conn.execute(text(
                "SELECT m.id, m.estado_uf FROM municipios m "
                "JOIN distritos_municipio d ON d.cd_mun = m.codigo_ibge "
                "WHERE d.cd_dist = :cd LIMIT 1"
            ), {"cd": args.distrito}).fetchone()
            mid, uf = (mun.id, mun.estado_uf) if mun else (None, None)
        elif args.municipio:
            print(f"importando bbox do municipio {args.municipio}...")
            bbox = get_bbox_municipio(conn, args.municipio)
            mun = conn.execute(text(
                "SELECT id, estado_uf FROM municipios WHERE codigo_ibge = :c"
            ), {"c": args.municipio.zfill(7)}).fetchone()
            mid, uf = (mun.id, mun.estado_uf) if mun else (None, None)
        else:
            print("uso: --distrito CD_DIST  ou  --municipio CODIGO_IBGE")
            return

    importar_bbox(bbox, mid, uf)
    print(f"FIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
