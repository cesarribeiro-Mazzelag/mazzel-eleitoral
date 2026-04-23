"""ETL: Construcao de polígonos das microzonas via Voronoi + barreiras + snap.

Pipeline (por distrito IBGE — escalavel por distrito ou municipio):

  1. Coleta Points OSM (place=suburb|neighbourhood) DENTRO do distrito
  2. DEDUP: clusteriza Points com mesmo nome a < 100m, mantém centróide
  3. VORONOI: ST_VoronoiPolygons sobre os Points dedup
  4. RECORTE: ST_Intersection com a geometria do distrito (cada célula
     fica dentro do distrito)
  5. CORTE POR BARREIRAS: ST_Split nas células que atravessam rios
     (waterway) e ferrovias (railway). Cada fragmento é re-associado
     ao Point OSM mais próximo
  6. SNAP DINÂMICO: para cada borda da célula, se há rua arterial a <
     50-100m, snap (ST_Snap)
  7. SUAVIZAÇÃO: ST_SimplifyPreserveTopology(0.0001) + ST_Buffer(0)
     + ST_MakeValid
  8. ATRIBUI SETORES: cada setor IBGE atribuído à célula que contem seu
     centróide. ST_Union(setores) = polígono final da microzona
  9. INSERE/UPDATE em microregioes (origem='voronoi_v2')

Uso:
    python3 20_limites_voronoi.py --distrito 355030863  # Pirituba (piloto)
    python3 20_limites_voronoi.py --municipio 3550308   # SP capital
"""
from __future__ import annotations
import argparse
import re
import sys
import time
import unicodedata
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine

# Parametros (ajustes 11.x do plano)
DEDUP_DIST_M = 100         # clusteriza Points OSM mesmo nome a < 100m
SNAP_THRESHOLD_M = 80      # snap dinamico — 50-100m, default 80m
SIMPLIFY_TOL = 0.0001      # ~10m em SP
MIN_CLUSTER_FRAGMENT_KM = 3.0  # multipoligono ate 3km de distancia entre frags


def normalizar(s: str) -> str:
    if not s:
        return ""
    n = unicodedata.normalize("NFKD", s)
    n = "".join(c for c in n if not unicodedata.combining(c))
    n = re.sub(r"[^a-zA-Z0-9 ]+", " ", n).strip()
    n = re.sub(r"\s+", " ", n).title()
    return n


def processar_distrito(cd_dist: str, municipio_id: int, codigo_ibge: str, nome_distrito: str):
    print(f"\n[Distrito {cd_dist} — {nome_distrito}]")
    cd_mun = codigo_ibge.zfill(7)

    with engine.begin() as conn:
        # PASSO 1+2: Pontos OSM dedup-clusterizados dentro do distrito
        print("  [1+2] dedup Points OSM dentro do distrito...")
        conn.execute(text("DROP TABLE IF EXISTS _tmp_pts"))
        conn.execute(text(f"""
            CREATE TEMP TABLE _tmp_pts AS
            WITH dentro AS (
                SELECT bo.id, bo.nome,
                       ST_Centroid(bo.geometry) AS centro,
                       lower(unaccent(bo.nome)) AS nome_norm
                FROM bairros_osm bo
                JOIN distritos_municipio dm ON dm.cd_dist = '{cd_dist}'
                WHERE bo.municipio_id = {municipio_id}
                  AND bo.tipo IN ('suburb', 'neighbourhood')
                  AND ST_GeometryType(bo.geometry) = 'ST_Point'
                  AND ST_Within(bo.geometry, dm.geometry)
            ),
            clusters AS (
                SELECT id, nome, centro, nome_norm,
                       ST_ClusterDBSCAN(centro, eps := {DEDUP_DIST_M}::float / 111000, minpoints := 1)
                         OVER (PARTITION BY nome_norm) AS cid
                FROM dentro
            ),
            consolidados AS (
                SELECT MIN(id) AS osm_id_repr,
                       MIN(nome) AS nome,
                       nome_norm,
                       cid,
                       ST_Centroid(ST_Collect(centro)) AS centro
                FROM clusters
                GROUP BY nome_norm, cid
            )
            SELECT row_number() OVER () AS pid,
                   osm_id_repr, nome, nome_norm, centro
            FROM consolidados
        """))
        n_pts = conn.execute(text("SELECT COUNT(*) AS n FROM _tmp_pts")).fetchone().n
        print(f"      {n_pts} Points OSM (apos dedup)")

        if n_pts < 2:
            print("      precisa de >= 2 Points para Voronoi. Skip.")
            return

        # PASSO 3: Voronoi
        print("  [3] gerando Voronoi...")
        conn.execute(text("DROP TABLE IF EXISTS _tmp_vor"))
        conn.execute(text(f"""
            CREATE TEMP TABLE _tmp_vor AS
            WITH coll AS (SELECT ST_Collect(centro) AS pts FROM _tmp_pts),
                 vor  AS (
                     SELECT (ST_Dump(ST_VoronoiPolygons(pts))).geom AS cel
                     FROM coll
                 ),
                 dist AS (
                     SELECT ST_SetSRID(geometry, 4326) AS geom
                     FROM distritos_municipio WHERE cd_dist = '{cd_dist}'
                 )
            -- Recorte ao distrito + associa a cada Point cuja celula contém
            SELECT p.pid,
                   p.nome,
                   p.osm_id_repr,
                   ST_Intersection(v.cel, d.geom) AS poligono
            FROM vor v
            CROSS JOIN dist d
            JOIN _tmp_pts p ON ST_Within(p.centro, v.cel)
            WHERE NOT ST_IsEmpty(ST_Intersection(v.cel, d.geom))
        """))
        n_cel = conn.execute(text("SELECT COUNT(*) AS n FROM _tmp_vor")).fetchone().n
        print(f"      {n_cel} celulas Voronoi geradas")

        # PASSO 5/6/7: removidos. Snap em poligono Voronoi cria "sujeira" e
        # corte por barreiras gera buracos visiveis no mapa. A nova estrategia
        # eh atribuir setores ao Voronoi BRUTO, depois construir geometria
        # final via ST_Union dos setores (que ja respeita ruas/rios via
        # malha IBGE) e remover buracos pequenos.

        # PASSO 8: Atribui CADA setor ao Voronoi mais proximo do centroide.
        # Usa ST_Within primeiro; se nao bater, usa proximidade (KNN)
        # garantindo que NENHUM setor fica orfao.
        print("  [8] atribuindo setores ao Voronoi mais proximo...")
        conn.execute(text(f"""
            DROP TABLE IF EXISTS _tmp_setor_alvo;
            CREATE TEMP TABLE _tmp_setor_alvo AS
            WITH setores_dist AS (
                SELECT sc.codigo_setor, ST_Centroid(sc.geometry) AS centro
                FROM setores_censitarios sc
                WHERE sc.codigo_municipio = '{cd_mun}'
                  AND ST_Within(ST_Centroid(sc.geometry),
                      (SELECT ST_SetSRID(geometry, 4326)
                       FROM distritos_municipio WHERE cd_dist = '{cd_dist}'))
            )
            SELECT DISTINCT ON (sd.codigo_setor)
                   sd.codigo_setor, v.pid, v.nome, v.osm_id_repr
            FROM setores_dist sd
            CROSS JOIN LATERAL (
                SELECT pid, nome, osm_id_repr, poligono
                FROM _tmp_vor
                ORDER BY poligono <-> sd.centro  -- KNN nearest
                LIMIT 1
            ) v
        """))
        n_setores_atrib = conn.execute(text("SELECT COUNT(*) FROM _tmp_setor_alvo")).fetchone()[0]
        print(f"      {n_setores_atrib} setores atribuidos (sem orfaos via KNN)")

        # PASSO 9: Apaga microregioes anteriores DESTE distrito + insere novas
        print("  [9] limpando microregioes antigas do distrito + inserindo novas...")
        # Remove microregioes que estao majoritariamente dentro deste distrito
        conn.execute(text(f"""
            UPDATE setores_censitarios SET microregiao_id = NULL
            WHERE microregiao_id IN (
                SELECT mr.id FROM microregioes mr
                WHERE mr.municipio_id = {municipio_id}
                  AND ST_Within(ST_Centroid(mr.geometry),
                      (SELECT ST_Transform(geometry, 4674) FROM distritos_municipio WHERE cd_dist = '{cd_dist}'))
            )
        """))
        conn.execute(text(f"""
            DELETE FROM microregioes
            WHERE municipio_id = {municipio_id}
              AND ST_Within(ST_Centroid(geometry),
                  (SELECT ST_Transform(geometry, 4674) FROM distritos_municipio WHERE cd_dist = '{cd_dist}'))
        """))

        # Insere microregioes via ST_Union dos setores + simplificacao leve.
        # A limpeza de holes/sujeira eh feita em UPDATE separado (set-returning
        # functions nao podem estar em agregacao no PostgreSQL).
        conn.execute(text(f"""
            INSERT INTO microregioes (
                nome, nome_padronizado, nivel, municipio_id, distrito_cd,
                geometry, area_km2, n_setores, populacao, osm_ref_id, origem
            )
            SELECT
                MIN(sa.nome) AS nome,
                MIN(sa.nome) || '-vor-' || sa.pid AS nome_padronizado,
                5,
                {municipio_id},
                '{cd_dist}',
                ST_Multi(
                    ST_SetSRID(
                        ST_MakeValid(
                            ST_Buffer(
                                ST_SimplifyPreserveTopology(
                                    ST_Union(sc.geometry),
                                    0.0002
                                ),
                                0
                            )
                        ),
                        4674
                    )
                ),
                ROUND((SUM(ST_Area(sc.geometry::geography)) / 1000000.0)::numeric, 3),
                COUNT(*),
                SUM(sc.populacao)::int,
                MIN(sa.osm_id_repr),
                'voronoi_v2'
            FROM _tmp_setor_alvo sa
            JOIN setores_censitarios sc ON sc.codigo_setor = sa.codigo_setor
            GROUP BY sa.pid
            ON CONFLICT (municipio_id, nome_padronizado) DO NOTHING
        """))

        # PASSO 9b: remove HOLES internos via reconstrucao das poligonos
        # (so casca externa). Um update por id, sem set-returning na agregacao.
        conn.execute(text(f"""
            UPDATE microregioes mr SET geometry = sub.cleaned
            FROM (
                SELECT m.id,
                       ST_Multi(
                           ST_Collect(ST_MakePolygon(ST_ExteriorRing(part.geom)))
                       ) AS cleaned
                FROM microregioes m,
                     LATERAL (SELECT (ST_Dump(m.geometry)).geom) part
                WHERE m.municipio_id = {municipio_id}
                  AND m.distrito_cd = '{cd_dist}'
                  AND m.origem = 'voronoi_v2'
                  AND ST_GeometryType(part.geom) IN ('ST_Polygon')
                GROUP BY m.id
            ) sub
            WHERE mr.id = sub.id
        """))

        # Atualiza setores_censitarios.microregiao_id
        conn.execute(text(f"""
            UPDATE setores_censitarios sc
            SET microregiao_id = mr.id
            FROM _tmp_setor_alvo sa, microregioes mr
            WHERE sc.codigo_setor = sa.codigo_setor
              AND mr.municipio_id = {municipio_id}
              AND mr.nome_padronizado = sa.nome || '-vor-' || sa.pid
        """))

        n_final = conn.execute(text(f"""
            SELECT COUNT(*) FROM microregioes
            WHERE municipio_id = {municipio_id}
              AND distrito_cd = '{cd_dist}' AND origem = 'voronoi_v2'
        """)).fetchone()[0]
        print(f"      {n_final} microregioes Voronoi V2 geradas")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--distrito", help="cd_dist do distrito IBGE")
    parser.add_argument("--municipio", help="codigo_ibge (todos distritos)")
    args = parser.parse_args()

    inicio = time.time()
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))
        conn.commit()

    if args.distrito:
        with engine.connect() as conn:
            r = conn.execute(text("""
                SELECT d.cd_dist, d.nm_dist, m.id AS mid, m.codigo_ibge
                FROM distritos_municipio d
                JOIN municipios m ON m.codigo_ibge = d.cd_mun
                WHERE d.cd_dist = :cd
            """), {"cd": args.distrito}).fetchone()
            if not r:
                print(f"distrito {args.distrito} nao encontrado")
                return
        processar_distrito(r.cd_dist, r.mid, r.codigo_ibge, r.nm_dist)
    elif args.municipio:
        with engine.connect() as conn:
            distritos = conn.execute(text("""
                SELECT d.cd_dist, d.nm_dist, m.id AS mid, m.codigo_ibge
                FROM distritos_municipio d
                JOIN municipios m ON m.codigo_ibge = d.cd_mun
                WHERE d.cd_mun = :c
                ORDER BY d.nm_dist
            """), {"c": args.municipio.zfill(7)}).fetchall()
            print(f"processando {len(distritos)} distritos do municipio {args.municipio}")
        for d in distritos:
            try:
                processar_distrito(d.cd_dist, d.mid, d.codigo_ibge, d.nm_dist)
            except Exception as e:
                print(f"  ERRO em {d.nm_dist}: {e}")
    else:
        print("uso: --distrito CD_DIST  ou  --municipio CODIGO_IBGE")
        return

    print(f"\nFIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
