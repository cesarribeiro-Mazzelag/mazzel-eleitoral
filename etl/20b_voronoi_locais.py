"""ETL 20b: Voronoi usando locais_votacao como sementes (fallback).

Motivo: distritos sem bairros_osm mapeados (periferia SP: Cidade Dutra,
Jardim Sao Luis, Campo Limpo, Cidade Tiradentes etc.) nao geravam microzonas
pelo ETL 20. Aqui usamos locais_votacao agrupados por campo `bairro` como
sementes do Voronoi, preenchendo o gap.

Uso:
    python3 20b_voronoi_locais.py --distrito 355030823  # Cidade Dutra
    python3 20b_voronoi_locais.py --vazios 3550308      # todos vazios em SP
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


def title_case_bairro(s: str) -> str:
    if not s:
        return "Sem Nome"
    n = s.strip().lower()
    return " ".join(w.capitalize() for w in n.split())


def processar_distrito(cd_dist: str) -> dict:
    with engine.begin() as conn:
        ctx = conn.execute(text("""
            SELECT d.cd_dist, d.nm_dist, m.id AS mid, m.codigo_ibge
            FROM distritos_municipio d
            JOIN municipios m ON m.codigo_ibge = d.cd_mun
            WHERE d.cd_dist = :cd
        """), {"cd": cd_dist}).fetchone()
        if not ctx:
            return {"ok": False, "erro": "distrito nao encontrado"}

        municipio_id = ctx.mid
        nm_dist = ctx.nm_dist
        print(f"\n[{cd_dist} {nm_dist}]")

        # PASSO 1: Sementes = 1 centroide por bairro distinto em locais_votacao
        conn.execute(text("DROP TABLE IF EXISTS _tmp_seeds"))
        conn.execute(text("""
            CREATE TEMP TABLE _tmp_seeds AS
            WITH dentro AS (
                SELECT lv.id, lv.bairro,
                       unaccent(lower(COALESCE(NULLIF(trim(lv.bairro), ''), 'sem bairro'))) AS bairro_norm,
                       ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326) AS centro
                FROM locais_votacao lv
                JOIN distritos_municipio dm ON dm.cd_dist = :cd
                WHERE lv.latitude IS NOT NULL AND lv.longitude IS NOT NULL
                  AND ST_Contains(ST_Transform(dm.geometry, 4326), ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326))
            )
            SELECT row_number() OVER (ORDER BY bairro_norm) AS pid,
                   MIN(id) AS osm_id_repr,
                   MIN(bairro) AS nome,
                   bairro_norm,
                   ST_Centroid(ST_Collect(centro)) AS centro
            FROM dentro
            GROUP BY bairro_norm
        """), {"cd": cd_dist})

        n_seeds = conn.execute(text("SELECT COUNT(*) FROM _tmp_seeds")).scalar()
        print(f"  sementes (bairros distintos): {n_seeds}")

        if n_seeds == 0:
            return {"ok": False, "erro": "0 sementes"}

        if n_seeds == 1:
            # 1 microzona cobrindo distrito inteiro
            seed = conn.execute(text("SELECT nome, osm_id_repr FROM _tmp_seeds")).fetchone()
            nome_final = title_case_bairro(seed.nome)
            conn.execute(text("""
                DELETE FROM microregioes WHERE municipio_id=:mid AND distrito_cd=:cd
            """), {"mid": municipio_id, "cd": cd_dist})
            conn.execute(text("""
                INSERT INTO microregioes (
                    nome, nome_padronizado, nivel, municipio_id, distrito_cd,
                    geometry, area_km2, n_setores, populacao, osm_ref_id, origem
                )
                SELECT :nome, :nome || '-vor-1', 5, :mid, :cd,
                    ST_Multi(ST_SetSRID(ST_MakeValid(ST_Transform(dm.geometry, 4674)), 4674)),
                    ROUND((ST_Area(dm.geometry::geography)/1000000.0)::numeric, 3),
                    0, 0, :osm_id, 'voronoi_v2'
                FROM distritos_municipio dm WHERE dm.cd_dist = :cd
            """), {"nome": nome_final, "mid": municipio_id, "cd": cd_dist, "osm_id": seed.osm_id_repr})
            print(f"  1 microzona criada: {nome_final}")
            return {"ok": True, "n": 1, "modo": "solo"}

        # PASSO 2: Voronoi em 4326
        conn.execute(text("DROP TABLE IF EXISTS _tmp_vor"))
        conn.execute(text(f"""
            CREATE TEMP TABLE _tmp_vor AS
            WITH coll AS (SELECT ST_Collect(centro) AS pts FROM _tmp_seeds),
                 vor AS (SELECT (ST_Dump(ST_VoronoiPolygons(pts))).geom AS cel FROM coll),
                 dist AS (SELECT ST_SetSRID(geometry, 4326) AS geom FROM distritos_municipio WHERE cd_dist = :cd)
            SELECT s.pid, s.nome, s.osm_id_repr,
                   ST_Intersection(v.cel, d.geom) AS poligono
            FROM _tmp_seeds s, vor v, dist d
            WHERE ST_Contains(v.cel, s.centro)
        """), {"cd": cd_dist})

        # PASSO 3: Atribuir setores censitarios do distrito a cada celula Voronoi
        conn.execute(text("DROP TABLE IF EXISTS _tmp_setor_alvo"))
        conn.execute(text("""
            CREATE TEMP TABLE _tmp_setor_alvo AS
            WITH
            setores_dist AS (
                SELECT sc.codigo_setor, sc.geometry,
                       ST_Transform(ST_Centroid(sc.geometry), 4326) AS centro_4326
                FROM setores_censitarios sc
                JOIN distritos_municipio dm ON dm.cd_dist = :cd
                WHERE sc.codigo_municipio = dm.cd_mun
                  AND ST_Intersects(
                      ST_Transform(sc.geometry, 4326),
                      CASE WHEN ST_SRID(dm.geometry) = 4326 THEN dm.geometry
                           ELSE ST_Transform(dm.geometry, 4326) END)
            ),
            dentro AS (
                -- centroide dentro do Voronoi -> atribui
                SELECT sd.codigo_setor, v.pid, v.nome, v.osm_id_repr
                FROM setores_dist sd
                JOIN _tmp_vor v ON ST_Contains(v.poligono, sd.centro_4326)
            ),
            orfaos AS (
                SELECT sd.codigo_setor
                FROM setores_dist sd
                LEFT JOIN dentro d ON d.codigo_setor = sd.codigo_setor
                WHERE d.codigo_setor IS NULL
            ),
            knn AS (
                -- orfaos -> atribui ao Voronoi mais proximo do centroide
                SELECT o.codigo_setor,
                       (SELECT v.pid FROM _tmp_vor v
                        ORDER BY sd.centro_4326 <-> v.poligono LIMIT 1) AS pid,
                       (SELECT v.nome FROM _tmp_vor v
                        ORDER BY sd.centro_4326 <-> v.poligono LIMIT 1) AS nome,
                       (SELECT v.osm_id_repr FROM _tmp_vor v
                        ORDER BY sd.centro_4326 <-> v.poligono LIMIT 1) AS osm_id_repr
                FROM orfaos o JOIN setores_dist sd ON sd.codigo_setor = o.codigo_setor
            )
            SELECT * FROM dentro
            UNION ALL
            SELECT * FROM knn
        """), {"cd": cd_dist, "mid": municipio_id})

        n_setores = conn.execute(text("SELECT COUNT(*) FROM _tmp_setor_alvo")).scalar()
        print(f"  setores atribuidos: {n_setores}")

        # PASSO 4: Limpar microregioes antigas deste distrito
        conn.execute(text("""
            UPDATE setores_censitarios SET microregiao_id = NULL
            WHERE microregiao_id IN (
                SELECT id FROM microregioes WHERE municipio_id = :mid AND distrito_cd = :cd
            )
        """), {"mid": municipio_id, "cd": cd_dist})
        conn.execute(text("""
            DELETE FROM microregioes WHERE municipio_id = :mid AND distrito_cd = :cd
        """), {"mid": municipio_id, "cd": cd_dist})

        # PASSO 5: INSERT microregioes (ST_Union setores por pid)
        conn.execute(text("""
            INSERT INTO microregioes (
                nome, nome_padronizado, nivel, municipio_id, distrito_cd,
                geometry, area_km2, n_setores, populacao, osm_ref_id, origem
            )
            SELECT
                INITCAP(LOWER(MIN(sa.nome))) AS nome,
                INITCAP(LOWER(MIN(sa.nome))) || '-vor-' || sa.pid AS nome_padronizado,
                5, :mid, :cd,
                ST_Multi(ST_SetSRID(ST_MakeValid(
                    ST_Buffer(ST_SimplifyPreserveTopology(ST_Union(sc.geometry), 0.0002), 0)
                ), 4674)),
                ROUND((SUM(ST_Area(sc.geometry::geography)) / 1000000.0)::numeric, 3),
                COUNT(*), SUM(sc.populacao)::int, MIN(sa.osm_id_repr), 'voronoi_v2'
            FROM _tmp_setor_alvo sa
            JOIN setores_censitarios sc ON sc.codigo_setor = sa.codigo_setor
            GROUP BY sa.pid
            ON CONFLICT (municipio_id, nome_padronizado) DO NOTHING
        """), {"mid": municipio_id, "cd": cd_dist})

        # PASSO 6: Remover holes internos
        conn.execute(text("""
            UPDATE microregioes mr SET geometry = sub.cleaned
            FROM (
                SELECT m.id,
                       ST_Multi(ST_Collect(ST_MakePolygon(ST_ExteriorRing(part.geom)))) AS cleaned
                FROM microregioes m,
                     LATERAL (SELECT (ST_Dump(m.geometry)).geom) part
                WHERE m.municipio_id = :mid AND m.distrito_cd = :cd
                  AND m.origem = 'voronoi_v2'
                  AND ST_GeometryType(part.geom) = 'ST_Polygon'
                GROUP BY m.id
            ) sub WHERE mr.id = sub.id
        """), {"mid": municipio_id, "cd": cd_dist})

        # PASSO 7: Vincula setores_censitarios.microregiao_id
        conn.execute(text("""
            UPDATE setores_censitarios sc
            SET microregiao_id = mr.id
            FROM _tmp_setor_alvo sa, microregioes mr
            WHERE sc.codigo_setor = sa.codigo_setor
              AND mr.municipio_id = :mid
              AND mr.nome_padronizado = INITCAP(LOWER(sa.nome)) || '-vor-' || sa.pid
        """), {"mid": municipio_id})

        n_final = conn.execute(text("""
            SELECT COUNT(*) FROM microregioes
            WHERE municipio_id = :mid AND distrito_cd = :cd AND origem = 'voronoi_v2'
        """), {"mid": municipio_id, "cd": cd_dist}).scalar()
        print(f"  {n_final} microregioes criadas")
        return {"ok": True, "n": n_final, "modo": "voronoi"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--distrito")
    parser.add_argument("--vazios", help="codigo_ibge municipio — processa todos distritos vazios")
    args = parser.parse_args()

    inicio = time.time()

    if args.vazios:
        with engine.connect() as conn:
            r = conn.execute(text("""
                SELECT d.cd_dist FROM distritos_municipio d
                WHERE d.cd_mun = :c
                  AND NOT EXISTS (
                      SELECT 1 FROM microregioes mr
                      JOIN municipios m ON m.codigo_ibge = :c
                      WHERE mr.municipio_id = m.id AND mr.distrito_cd = d.cd_dist
                  )
            """), {"c": args.vazios.zfill(7)}).fetchall()
        alvos = [row.cd_dist for row in r]
        print(f"Distritos vazios: {len(alvos)}")
        for cd in alvos:
            processar_distrito(cd)
    elif args.distrito:
        processar_distrito(args.distrito)
    else:
        print("uso: --distrito CD_DIST  ou  --vazios CODIGO_IBGE_MUNICIPIO")
        return

    print(f"\nFIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
