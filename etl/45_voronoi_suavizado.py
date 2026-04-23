"""ETL 45 — Polígonos Voronoi suavizados pros microbairros.

Substitui o ETL 44 (Voronoi cru com pontas) por versão visual:
  1. Voronoi entre centroides do distrito
  2. ST_Buffer(+50m) → arredonda cantos
  3. ST_Buffer(-50m) → retorna ao tamanho original mantendo curvas
  4. ST_ChaikinSmoothing(geom, 3) → suaviza vértices remanescentes
  5. ST_Intersection(distrito) → limita ao contorno IBGE

Resultado: polígonos arredondados, sem pontas triangulares, sem ilhas, sem agulhas.

Uso:
    python3 45_voronoi_suavizado.py
    python3 45_voronoi_suavizado.py --buffer 40  # metro de arredondamento
    python3 45_voronoi_suavizado.py --reset
"""
from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


def processar(uf: str, cidade: str, buffer_m: int, reset: bool):
    with engine.begin() as conn:
        if reset:
            conn.execute(text("""
                UPDATE microbairros SET polygon_voronoi = NULL, polygon_origem = NULL
                WHERE uf = :uf AND cidade = :cidade AND polygon_origem = 'voronoi'
            """), {"uf": uf, "cidade": cidade})
            print("[reset] limpou polygon_voronoi (origem=voronoi)")

        # Marca OSM como origem='osm'
        conn.execute(text("""
            UPDATE microbairros SET polygon_origem = 'osm'
            WHERE uf = :uf AND cidade = :cidade
              AND osm_polygon IS NOT NULL AND (polygon_origem IS NULL OR polygon_origem != 'osm')
        """), {"uf": uf, "cidade": cidade})

        # Lista distritos com microbairros
        distritos = conn.execute(text("""
            SELECT DISTINCT dm.cd_dist, dm.nm_dist
            FROM microbairros mb
            JOIN distritos_municipio dm ON dm.cd_mun = (
                SELECT codigo_ibge FROM municipios WHERE estado_uf = :uf AND nome = :cidade LIMIT 1
            ) AND ST_Contains(dm.geometry, ST_SetSRID(ST_Point(mb.here_lng, mb.here_lat), 4326))
            WHERE mb.uf = :uf AND mb.cidade = :cidade AND mb.here_lat IS NOT NULL
        """), {"uf": uf, "cidade": cidade}).fetchall()

    print(f"Processando {len(distritos)} distritos (buffer={buffer_m}m)...")
    total_saved = 0
    inicio = time.time()

    for i, d in enumerate(distritos, 1):
        with engine.begin() as conn:
            # Conta pontos no distrito (pra decidir abordagem)
            n = conn.execute(text("""
                SELECT COUNT(*) AS n FROM microbairros mb
                JOIN distritos_municipio dm ON dm.cd_dist = :cd
                WHERE mb.uf = :uf AND mb.cidade = :cidade AND mb.here_lat IS NOT NULL
                  AND ST_Contains(dm.geometry, ST_SetSRID(ST_Point(mb.here_lng, mb.here_lat), 4326))
                  AND mb.osm_polygon IS NULL
            """), {"cd": d.cd_dist, "uf": uf, "cidade": cidade}).fetchone().n

            if n == 0:
                continue

            if n == 1:
                # Ponto solitário: buffer circular suavizado
                conn.execute(text("""
                    UPDATE microbairros mb SET
                        polygon_voronoi = ST_Multi(ST_Intersection(
                            ST_Buffer(ST_SetSRID(ST_Point(mb.here_lng, mb.here_lat), 4326)::geography, :buf)::geometry,
                            dm.geometry
                        )),
                        polygon_origem = 'voronoi'
                    FROM distritos_municipio dm
                    WHERE dm.cd_dist = :cd
                      AND mb.uf = :uf AND mb.cidade = :cidade AND mb.here_lat IS NOT NULL
                      AND mb.osm_polygon IS NULL
                      AND ST_Contains(dm.geometry, ST_SetSRID(ST_Point(mb.here_lng, mb.here_lat), 4326))
                """), {"cd": d.cd_dist, "uf": uf, "cidade": cidade, "buf": buffer_m * 10})
                saved = 1
            else:
                # Voronoi + suavização morfológica
                # Passo 1: Voronoi cru → JOIN com pontos (match preciso antes de suavizar)
                # Passo 2: Suavizar cada cell (buffer opening + Chaikin)
                # Passo 3: Re-clip pelo distrito
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
                    voronoi_raw AS (
                        SELECT (ST_Dump(ST_VoronoiPolygons(pts, 0, dm.geometry))).geom AS cell
                        FROM multi, distritos_municipio dm WHERE dm.cd_dist = :cd
                    ),
                    voronoi_clipped AS (
                        SELECT ST_Intersection(vr.cell, dm.geometry) AS poly
                        FROM voronoi_raw vr, distritos_municipio dm
                        WHERE dm.cd_dist = :cd AND ST_IsValid(vr.cell)
                    ),
                    -- JOIN com pontos ANTES de suavizar (match preciso no Voronoi cru)
                    matched AS (
                        SELECT p.id AS mb_id, vc.poly AS raw_poly
                        FROM pontos p
                        JOIN voronoi_clipped vc ON ST_Contains(vc.poly, p.pt)
                        WHERE NOT ST_IsEmpty(vc.poly)
                    ),
                    -- Suavizar: opening morfológico + Chaikin + re-clip
                    smoothed AS (
                        SELECT mb_id,
                            ST_Multi(ST_Intersection(
                                ST_ChaikinSmoothing(
                                    ST_Buffer(ST_Buffer(raw_poly::geography, {buffer_m}), -{buffer_m})::geometry,
                                3),
                                dm.geometry
                            )) AS poly
                        FROM matched, distritos_municipio dm
                        WHERE dm.cd_dist = :cd
                    )
                    UPDATE microbairros mb
                    SET polygon_voronoi = s.poly,
                        polygon_origem = 'voronoi'
                    FROM smoothed s
                    WHERE mb.id = s.mb_id
                      AND mb.osm_polygon IS NULL
                      AND s.poly IS NOT NULL
                      AND NOT ST_IsEmpty(s.poly)
                    RETURNING mb.id
                """), {"cd": d.cd_dist, "uf": uf, "cidade": cidade})
                saved = len(r.fetchall())

            total_saved += saved

        if i % 10 == 0 or i == len(distritos):
            elapsed = time.time() - inicio
            print(f"  [{i}/{len(distritos)}] {d.nm_dist} → +{saved} | total {total_saved} ({elapsed:.0f}s)")

    print(f"\n== FIM ==")
    print(f"  {total_saved} polígonos Voronoi suavizados gerados")

    with engine.connect() as conn:
        r = conn.execute(text("""
            SELECT polygon_origem, COUNT(*) FROM microbairros
            WHERE uf = :uf AND cidade = :cidade GROUP BY polygon_origem ORDER BY polygon_origem
        """), {"uf": uf, "cidade": cidade}).fetchall()
        for row in r:
            print(f"  {row.polygon_origem or 'NULL (ponto)':15s}: {row.count}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--uf", default="SP")
    ap.add_argument("--cidade", default="São Paulo")
    ap.add_argument("--buffer", type=int, default=50, help="metros de arredondamento (default 50)")
    ap.add_argument("--reset", action="store_true")
    args = ap.parse_args()
    processar(args.uf, args.cidade, args.buffer, args.reset)


if __name__ == "__main__":
    main()
