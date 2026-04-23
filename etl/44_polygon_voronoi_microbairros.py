"""ETL 44 — gera polígonos Voronoi pros microbairros que só têm centroide HERE.

Algoritmo:
  Pra cada distrito IBGE de SP capital:
    1. Pega TODOS os centroides HERE de microbairros dentro do distrito
       (incluindo os que já têm osm_polygon — entram como "âncoras")
    2. ST_VoronoiPolygons(multi_pontos) gera as células
    3. ST_Intersection com a geometria do distrito limita as células
    4. Salva em microbairros.polygon_voronoi APENAS pros que NÃO têm osm_polygon
    5. Marca polygon_origem='voronoi'

Os com osm_polygon entram só como "âncoras" Voronoi (pra dividir melhor o espaço)
mas não recebem polygon_voronoi (já têm osm_polygon = polygon real, melhor).

Uso:
    python3 44_polygon_voronoi_microbairros.py
    python3 44_polygon_voronoi_microbairros.py --uf SP --cidade "São Paulo"
    python3 44_polygon_voronoi_microbairros.py --reset  # limpa antes
"""
from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


def processar(uf: str, cidade: str, reset: bool):
    with engine.begin() as conn:
        if reset:
            conn.execute(text("""
                UPDATE microbairros SET polygon_voronoi = NULL, polygon_origem = NULL
                WHERE uf = :uf AND cidade = :cidade
            """), {"uf": uf, "cidade": cidade})
            print("[reset] limpou polygon_voronoi/polygon_origem")

        # Marca os que já têm osm_polygon como origem='osm' (1x setup)
        conn.execute(text("""
            UPDATE microbairros SET polygon_origem = 'osm'
            WHERE uf = :uf AND cidade = :cidade
              AND osm_polygon IS NOT NULL AND polygon_origem IS NULL
        """), {"uf": uf, "cidade": cidade})

        # Lista distritos que têm pelo menos 1 microbairro
        distritos = conn.execute(text("""
            SELECT DISTINCT dm.cd_dist, dm.nm_dist
            FROM microbairros mb
            JOIN distritos_municipio dm ON dm.cd_mun = (
                SELECT codigo_ibge FROM municipios WHERE estado_uf = :uf AND nome = :cidade LIMIT 1
            ) AND ST_Contains(dm.geometry, ST_SetSRID(ST_Point(mb.here_lng, mb.here_lat), 4326))
            WHERE mb.uf = :uf AND mb.cidade = :cidade AND mb.here_lat IS NOT NULL
        """), {"uf": uf, "cidade": cidade}).fetchall()

    print(f"Processando {len(distritos)} distritos…")
    total_saved = 0
    inicio = time.time()

    for i, d in enumerate(distritos, 1):
        with engine.begin() as conn:
            # 1. Pega centroides + ids de todos os microbairros dentro do distrito
            #    (inclui os com osm_polygon como âncoras, pra Voronoi dividir bem)
            pontos = conn.execute(text("""
                SELECT mb.id, mb.here_lng, mb.here_lat,
                       (mb.osm_polygon IS NOT NULL) AS tem_osm
                FROM microbairros mb
                JOIN distritos_municipio dm ON dm.cd_dist = :cd
                WHERE mb.uf = :uf AND mb.cidade = :cidade AND mb.here_lat IS NOT NULL
                  AND ST_Contains(dm.geometry, ST_SetSRID(ST_Point(mb.here_lng, mb.here_lat), 4326))
            """), {"cd": d.cd_dist, "uf": uf, "cidade": cidade}).fetchall()
            n = len(pontos)
            sem_osm = sum(1 for p in pontos if not p.tem_osm)
            if sem_osm == 0:
                continue
            if n < 2:
                # 1 ponto só → buffer simples (sem Voronoi)
                p0 = pontos[0]
                if not p0.tem_osm:
                    conn.execute(text("""
                        UPDATE microbairros SET
                            polygon_voronoi = ST_Multi(ST_Intersection(
                                ST_Buffer(ST_SetSRID(ST_Point(:lng, :lat), 4326)::geography, 500)::geometry,
                                (SELECT geometry FROM distritos_municipio WHERE cd_dist=:cd)
                            )),
                            polygon_origem = 'voronoi'
                        WHERE id = :id
                    """), {"lng": p0.here_lng, "lat": p0.here_lat, "cd": d.cd_dist, "id": p0.id})
                    total_saved += 1
                continue

            # 2. Voronoi PostGIS + corte pelo distrito
            ids_str = ",".join(str(p.id) for p in pontos if not p.tem_osm)
            if not ids_str:
                continue

            r = conn.execute(text(f"""
                WITH pontos AS (
                    SELECT mb.id,
                           ST_SetSRID(ST_Point(mb.here_lng, mb.here_lat), 4326) AS pt
                    FROM microbairros mb
                    JOIN distritos_municipio dm ON dm.cd_dist = :cd
                    WHERE mb.uf = :uf AND mb.cidade = :cidade AND mb.here_lat IS NOT NULL
                      AND ST_Contains(dm.geometry, ST_SetSRID(ST_Point(mb.here_lng, mb.here_lat), 4326))
                ),
                multi AS (
                    SELECT ST_Collect(pt) AS pts FROM pontos
                ),
                cells AS (
                    SELECT (ST_Dump(ST_VoronoiPolygons(pts, 0, dm.geometry))).geom AS cell
                    FROM multi, distritos_municipio dm
                    WHERE dm.cd_dist = :cd
                ),
                cells_clip AS (
                    SELECT ST_Intersection(c.cell, dm.geometry) AS clipped
                    FROM cells c, distritos_municipio dm
                    WHERE dm.cd_dist = :cd
                ),
                joined AS (
                    SELECT p.id, ST_Multi(cc.clipped) AS poly
                    FROM pontos p
                    JOIN cells_clip cc ON ST_Contains(cc.clipped, p.pt)
                )
                UPDATE microbairros mb
                SET polygon_voronoi = j.poly,
                    polygon_origem = 'voronoi'
                FROM joined j
                WHERE mb.id = j.id
                  AND mb.osm_polygon IS NULL
                  AND mb.id IN ({ids_str})
                RETURNING mb.id
            """), {"cd": d.cd_dist, "uf": uf, "cidade": cidade})
            saved = len(r.fetchall())
            total_saved += saved

        if i % 10 == 0 or i == len(distritos):
            elapsed = time.time() - inicio
            print(f"  [{i}/{len(distritos)}] {d.nm_dist} → +{saved} polígonos | total {total_saved} ({elapsed:.0f}s)")

    print(f"\n══ FIM ══")
    print(f"  {total_saved} polígonos Voronoi gerados")

    with engine.connect() as conn:
        r = conn.execute(text("""
            SELECT polygon_origem, COUNT(*) FROM microbairros
            WHERE uf = :uf AND cidade = :cidade
            GROUP BY polygon_origem ORDER BY polygon_origem
        """), {"uf": uf, "cidade": cidade}).fetchall()
        for row in r:
            print(f"  {row.polygon_origem or 'NULL'}: {row.count}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--uf", default="SP")
    ap.add_argument("--cidade", default="São Paulo")
    ap.add_argument("--reset", action="store_true")
    args = ap.parse_args()
    processar(args.uf, args.cidade, args.reset)


if __name__ == "__main__":
    main()
