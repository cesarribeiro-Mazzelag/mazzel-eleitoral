"""ETL: Bairros populares do OpenStreetMap (micro-regioes).

Importa elementos OSM com tags place=suburb/neighbourhood/quarter/hamlet
e cruza com setores censitarios IBGE via spatial join.

Uso:
    python3 13_bairros_osm.py              # todos os estados
    python3 13_bairros_osm.py --uf SP      # so SP
    python3 13_bairros_osm.py --uf SP,RJ   # SP e RJ

Estrategia:
    - Query Overpass API por UF (evita timeout)
    - Batch inserts 500 por vez
    - Apos insert, popula setores_ibge array via spatial join
"""
import argparse
import json
import sys
import time

import requests
from sqlalchemy import text

from db import engine


OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
]

UFS = [
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
    "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
    "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
]


def overpass_query_uf(uf: str, timeout: int = 300) -> dict:
    """Busca elementos place=* dentro de uma UF do Brasil."""
    # Admin level 4 = estados brasileiros no OSM
    query = f"""
    [out:json][timeout:{timeout}];
    area["ISO3166-2"="BR-{uf}"][admin_level=4]->.uf;
    (
      node["place"~"^(suburb|neighbourhood|quarter|hamlet)$"]["name"](area.uf);
      way["place"~"^(suburb|neighbourhood|quarter|hamlet)$"]["name"](area.uf);
      relation["place"~"^(suburb|neighbourhood|quarter|hamlet)$"]["name"](area.uf);
    );
    out geom;
    """
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            print(f"[OSM {uf}] Consultando {endpoint}...")
            r = requests.post(endpoint, data={"data": query}, timeout=timeout + 30)
            if r.status_code == 200:
                return r.json()
            print(f"[OSM {uf}] HTTP {r.status_code}, tentando proximo endpoint")
        except Exception as e:
            print(f"[OSM {uf}] ERRO {endpoint}: {e}")
            continue
    raise RuntimeError(f"Todos os endpoints Overpass falharam para {uf}")


def element_to_geojson(el):
    """Converte elemento Overpass em GeoJSON geometry."""
    if el["type"] == "node":
        return {
            "type": "Point",
            "coordinates": [el["lon"], el["lat"]],
        }
    elif el["type"] == "way" and "geometry" in el:
        coords = [[pt["lon"], pt["lat"]] for pt in el["geometry"]]
        if len(coords) < 2:
            return None
        # Se fechado, e polygon
        if coords[0] == coords[-1] and len(coords) >= 4:
            return {"type": "Polygon", "coordinates": [coords]}
        return {"type": "LineString", "coordinates": coords}
    elif el["type"] == "relation" and "members" in el:
        # Relacao multipoligono simples - pega primeiro way com geometry
        for m in el["members"]:
            if m.get("type") == "way" and "geometry" in m:
                coords = [[pt["lon"], pt["lat"]] for pt in m["geometry"]]
                if len(coords) >= 4 and coords[0] == coords[-1]:
                    return {"type": "Polygon", "coordinates": [coords]}
        return None
    return None


def import_uf(uf: str):
    """Importa bairros OSM de uma UF."""
    print(f"\n{'='*50}\nProcessando {uf}\n{'='*50}")

    data = overpass_query_uf(uf)
    elementos = data.get("elements", [])
    print(f"[OSM {uf}] {len(elementos)} elementos retornados")

    if not elementos:
        return 0

    registros = []
    for el in elementos:
        nome = el.get("tags", {}).get("name", "").strip()
        tipo = el.get("tags", {}).get("place", "").strip()
        if not nome or not tipo:
            continue

        geom = element_to_geojson(el)
        if not geom:
            continue

        pop_str = el.get("tags", {}).get("population", "")
        try:
            populacao = int(pop_str.replace(",", "").replace(".", "")) if pop_str else None
        except ValueError:
            populacao = None

        registros.append({
            "osm_id": el["id"],
            "osm_type": el["type"],
            "nome": nome[:300],
            "tipo": tipo[:50],
            "estado_uf": uf,
            "populacao": populacao,
            "geometry": json.dumps(geom),
        })

    print(f"[OSM {uf}] {len(registros)} registros validos prontos pra inserir")

    if not registros:
        return 0

    # Batch insert com ON CONFLICT DO NOTHING
    BATCH = 200
    inseridos = 0
    with engine.begin() as conn:
        for i in range(0, len(registros), BATCH):
            batch = registros[i:i+BATCH]
            conn.execute(
                text("""
                    INSERT INTO bairros_osm (osm_id, osm_type, nome, tipo, estado_uf, populacao, geometry)
                    VALUES (:osm_id, :osm_type, :nome, :tipo, :estado_uf, :populacao,
                            ST_GeomFromGeoJSON(:geometry))
                    ON CONFLICT (osm_id, osm_type) DO NOTHING
                """),
                batch
            )
            inseridos += len(batch)
            print(f"[OSM {uf}] Inserido batch {i//BATCH + 1}: {inseridos}/{len(registros)}")

    return len(registros)


def vincular_municipio_e_setores(uf=None):
    """Apos insert, popula municipio_id e setores_ibge via spatial join."""
    print(f"\n[VINCULACAO] Vinculando bairros OSM aos municipios e setores IBGE...")

    where_clause = f"AND bo.estado_uf = '{uf}'" if uf else ""

    # Passo 1: vincular municipio_id via spatial
    with engine.begin() as conn:
        print(f"[VINCULACAO] Passo 1: municipio_id (pode demorar)...")
        r = conn.execute(text(f"""
            UPDATE bairros_osm bo
            SET municipio_id = m.id
            FROM municipios m
            WHERE bo.municipio_id IS NULL
              AND m.estado_uf = bo.estado_uf
              AND ST_Intersects(m.geometry, bo.geometry)
              {where_clause}
        """))
        print(f"[VINCULACAO] {r.rowcount} bairros vinculados a municipios")

    # Passo 2: popular setores_ibge array
    with engine.begin() as conn:
        print(f"[VINCULACAO] Passo 2: setores_ibge array...")
        r = conn.execute(text(f"""
            UPDATE bairros_osm bo
            SET setores_ibge = (
                SELECT ARRAY_AGG(sc.codigo_setor)
                FROM setores_censitarios sc
                WHERE sc.codigo_municipio = (
                    SELECT codigo_ibge FROM municipios WHERE id = bo.municipio_id
                )
                AND ST_Intersects(bo.geometry, sc.geometry)
            )
            WHERE bo.municipio_id IS NOT NULL
              AND bo.setores_ibge IS NULL
              {where_clause}
        """))
        print(f"[VINCULACAO] {r.rowcount} bairros com setores IBGE atribuidos")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--uf", type=str, help="UFs separadas por virgula (ex: SP,RJ)")
    args = parser.parse_args()

    ufs_alvo = args.uf.split(",") if args.uf else UFS
    ufs_alvo = [uf.upper().strip() for uf in ufs_alvo]

    print(f"Importando bairros OSM para: {ufs_alvo}")

    total = 0
    for uf in ufs_alvo:
        try:
            total += import_uf(uf)
            time.sleep(2)  # Rate limit - 2s entre UFs
        except Exception as e:
            print(f"[ERRO {uf}] {e}")
            continue

    print(f"\nTotal inserido: {total}")

    # Vincular municipio + setores
    if len(ufs_alvo) == 1:
        vincular_municipio_e_setores(ufs_alvo[0])
    else:
        vincular_municipio_e_setores(None)

    # Stats finais
    with engine.connect() as conn:
        r = conn.execute(text("""
            SELECT estado_uf, tipo, COUNT(*) AS n
            FROM bairros_osm
            GROUP BY estado_uf, tipo
            ORDER BY estado_uf, tipo
        """))
        print("\n=== STATS FINAIS ===")
        for row in r:
            print(f"  {row.estado_uf} {row.tipo:15s} {row.n}")


if __name__ == "__main__":
    main()
