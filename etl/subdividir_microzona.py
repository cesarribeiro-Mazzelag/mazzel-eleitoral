"""Subdivide uma microzona existente em N novas usando locais_votacao.bairro
como sementes.

Use quando o Voronoi original gerou uma microzona grande que engoliu bairros
pequenos (ex: Brasilandia virou 1 celula em vez de 14).

Pipeline:
    1. Pega microzona alvo (validando governanca — nao mexe em manual_edit,
       congelada, calibrada_final)
    2. Pega locais_votacao DENTRO do poligono dela, agrupa por bairro
       → 1 centroide por bairro = 1 semente
    3. Se >= 2 sementes: ST_VoronoiPolygons das sementes, recortado pelo poligono
       da microzona (nao sai do poligono original)
    4. Cada celula vira nova microzona (origem='voronoi_v2')
    5. Setores_censitarios DENTRO da microzona original sao re-atribuidos
       a cada celula (pelo centroide)
    6. DELETE da microzona original
    7. Audit: DELETE + N INSERTs

Uso:
    python3 subdividir_microzona.py --id 4571         # 1 microzona
    python3 subdividir_microzona.py --distrito 355030811   # todas do distrito
"""
from __future__ import annotations
import argparse
import sys
import time
import unicodedata
import re
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


def title_case_bairro(s: str) -> str:
    if not s: return "Sem Nome"
    n = s.strip().lower()
    return " ".join(w.capitalize() for w in n.split())


def subdividir(mr_id: int) -> dict:
    with engine.begin() as conn:
        mr = conn.execute(text("""
            SELECT id, nome, distrito_cd, municipio_id, origem, nivel,
                   congelada_em IS NOT NULL AS cong, calibrada_final,
                   ST_AsEWKT(geometry) AS g_ewkt,
                   ST_Area(geometry::geography) AS area_m2
            FROM microregioes WHERE id = :mid
        """), {"mid": mr_id}).fetchone()
        if not mr:
            return {"ok": False, "motivo": "nao encontrada"}
        if mr.origem == 'manual_edit':
            return {"ok": False, "motivo": "manual_edit (intocavel)"}
        if mr.cong:
            return {"ok": False, "motivo": "congelada (intocavel)"}
        if mr.calibrada_final:
            return {"ok": False, "motivo": "calibrada_final (intocavel)"}

        # PASSO 1: Sementes = centroides dos bairros distintos de locais_votacao
        # dentro do poligono da microzona.
        conn.execute(text("DROP TABLE IF EXISTS _tmp_sub_seeds"))
        conn.execute(text("""
            CREATE TEMP TABLE _tmp_sub_seeds AS
            WITH dentro AS (
                SELECT lv.id, lv.bairro,
                       unaccent(lower(COALESCE(NULLIF(trim(lv.bairro),''),'sem bairro'))) AS bairro_norm,
                       ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326) AS centro
                FROM locais_votacao lv
                WHERE lv.latitude IS NOT NULL
                  AND ST_Within(
                      ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326),
                      ST_Transform((SELECT geometry FROM microregioes WHERE id = :mid), 4326)
                  )
            )
            SELECT row_number() OVER (ORDER BY bairro_norm) AS pid,
                   MIN(id) AS lv_id_repr,
                   MIN(bairro) AS nome,
                   bairro_norm,
                   ST_Centroid(ST_Collect(centro)) AS centro
            FROM dentro GROUP BY bairro_norm
        """), {"mid": mr_id})

        n_seeds = conn.execute(text("SELECT COUNT(*) FROM _tmp_sub_seeds")).scalar()
        if n_seeds < 2:
            return {"ok": False, "motivo": f"so {n_seeds} seed(s) — nao vale subdividir"}

        # PASSO 2: Voronoi em 4326 recortado pelo poligono da microzona original
        conn.execute(text("DROP TABLE IF EXISTS _tmp_sub_vor"))
        conn.execute(text("""
            CREATE TEMP TABLE _tmp_sub_vor AS
            WITH coll AS (SELECT ST_Collect(centro) AS pts FROM _tmp_sub_seeds),
                 vor AS (SELECT (ST_Dump(ST_VoronoiPolygons(pts))).geom AS cel FROM coll),
                 orig AS (
                    SELECT ST_Transform(geometry, 4326) AS g
                    FROM microregioes WHERE id = :mid
                 )
            SELECT s.pid, s.nome, s.lv_id_repr,
                   ST_Intersection(v.cel, o.g) AS poligono
            FROM _tmp_sub_seeds s, vor v, orig o
            WHERE ST_Contains(v.cel, s.centro)
        """), {"mid": mr_id})

        # PASSO 3: Atribui setores_censitarios (que ja estao nessa microzona)
        # a cada celula Voronoi (pelo centroide do setor)
        conn.execute(text("DROP TABLE IF EXISTS _tmp_sub_setor_alvo"))
        conn.execute(text("""
            CREATE TEMP TABLE _tmp_sub_setor_alvo AS
            WITH
            setores AS (
                SELECT sc.codigo_setor, sc.geometry,
                       ST_Transform(ST_Centroid(sc.geometry), 4326) AS centro_4326
                FROM setores_censitarios sc
                WHERE sc.microregiao_id = :mid
            ),
            dentro AS (
                SELECT s.codigo_setor, v.pid, v.nome, v.lv_id_repr
                FROM setores s
                JOIN _tmp_sub_vor v ON ST_Contains(v.poligono, s.centro_4326)
            ),
            orfaos AS (
                SELECT s.codigo_setor FROM setores s
                LEFT JOIN dentro d ON d.codigo_setor = s.codigo_setor
                WHERE d.codigo_setor IS NULL
            ),
            knn AS (
                SELECT o.codigo_setor,
                       (SELECT v.pid FROM _tmp_sub_vor v
                        ORDER BY s.centro_4326 <-> v.poligono LIMIT 1) AS pid,
                       (SELECT v.nome FROM _tmp_sub_vor v
                        ORDER BY s.centro_4326 <-> v.poligono LIMIT 1) AS nome,
                       (SELECT v.lv_id_repr FROM _tmp_sub_vor v
                        ORDER BY s.centro_4326 <-> v.poligono LIMIT 1) AS lv_id_repr
                FROM orfaos o JOIN setores s ON s.codigo_setor = o.codigo_setor
            )
            SELECT * FROM dentro UNION ALL SELECT * FROM knn
        """), {"mid": mr_id})

        n_setores = conn.execute(text("SELECT COUNT(*) FROM _tmp_sub_setor_alvo")).scalar()

        # PASSO 4: Audit da delecao original
        conn.execute(text("""
            INSERT INTO microregiao_edicoes_manuais (
                microregiao_id, usuario_id, geometry_antes, geometry_depois,
                n_vertices_antes, n_vertices_depois,
                area_antes_m2, area_depois_m2, diff_area_m2, motivo
            )
            SELECT :mid, NULL, :g_ewkt, ST_GeomFromText('MULTIPOLYGON EMPTY', 4674),
                   ST_NPoints(ST_GeomFromEWKT(:g_ewkt)), 0,
                   CAST(:a AS float), 0, CAST(:diff AS float),
                   'subdividir_bairros'
        """), {"mid": mr_id, "g_ewkt": mr.g_ewkt, "a": float(mr.area_m2),
               "diff": -float(mr.area_m2)})

        # PASSO 5: Libera setores + DELETE original
        conn.execute(text("UPDATE setores_censitarios SET microregiao_id = NULL WHERE microregiao_id = :mid"), {"mid": mr_id})
        conn.execute(text("DELETE FROM microregioes WHERE id = :mid"), {"mid": mr_id})

        # PASSO 6: INSERT das novas (microzonas = ST_Union setores)
        conn.execute(text("""
            INSERT INTO microregioes (
                nome, nome_padronizado, nivel, municipio_id, distrito_cd,
                geometry, area_km2, n_setores, populacao, osm_ref_id, origem
            )
            SELECT
                INITCAP(LOWER(MIN(sa.nome))) AS nome,
                INITCAP(LOWER(MIN(sa.nome))) || '-subdiv-' || sa.pid AS nome_padronizado,
                :nivel, :mid_mun, :cd_dist,
                ST_Multi(ST_SetSRID(ST_MakeValid(
                    ST_Buffer(ST_SimplifyPreserveTopology(ST_Union(sc.geometry), 0.0002), 0)
                ), 4674)),
                ROUND((SUM(ST_Area(sc.geometry::geography))/1000000.0)::numeric, 3),
                COUNT(*), SUM(sc.populacao)::int, MIN(sa.lv_id_repr), 'voronoi_v2'
            FROM _tmp_sub_setor_alvo sa
            JOIN setores_censitarios sc ON sc.codigo_setor = sa.codigo_setor
            GROUP BY sa.pid
            ON CONFLICT (municipio_id, nome_padronizado) DO NOTHING
        """), {"nivel": mr.nivel or 5, "mid_mun": mr.municipio_id, "cd_dist": mr.distrito_cd})

        # PASSO 7: Vincula setores_censitarios.microregiao_id
        conn.execute(text("""
            UPDATE setores_censitarios sc
            SET microregiao_id = mr.id
            FROM _tmp_sub_setor_alvo sa, microregioes mr
            WHERE sc.codigo_setor = sa.codigo_setor
              AND mr.municipio_id = :mid_mun
              AND mr.distrito_cd = :cd_dist
              AND mr.nome_padronizado = INITCAP(LOWER(sa.nome)) || '-subdiv-' || sa.pid
        """), {"mid_mun": mr.municipio_id, "cd_dist": mr.distrito_cd})

        # PASSO 8: Remover holes internos do Union (mesma tecnica do 20b)
        conn.execute(text("""
            UPDATE microregioes mr SET geometry = sub.cleaned
            FROM (
                SELECT m.id,
                       ST_Multi(ST_Collect(ST_MakePolygon(ST_ExteriorRing(part.geom)))) AS cleaned
                FROM microregioes m,
                     LATERAL (SELECT (ST_Dump(m.geometry)).geom) part
                WHERE m.municipio_id = :mid_mun AND m.distrito_cd = :cd_dist
                  AND m.origem = 'voronoi_v2'
                  AND m.nome_padronizado LIKE '%-subdiv-%'
                  AND ST_GeometryType(part.geom) = 'ST_Polygon'
                GROUP BY m.id
            ) sub WHERE mr.id = sub.id
        """), {"mid_mun": mr.municipio_id, "cd_dist": mr.distrito_cd})

        n_criadas = conn.execute(text("""
            SELECT COUNT(*) FROM microregioes
            WHERE municipio_id = :mid_mun AND distrito_cd = :cd_dist
              AND origem = 'voronoi_v2' AND nome_padronizado LIKE '%-subdiv-%'
        """), {"mid_mun": mr.municipio_id, "cd_dist": mr.distrito_cd}).scalar()

        return {"ok": True, "nome_original": mr.nome, "seeds": n_seeds,
                "setores": n_setores, "criadas": n_criadas}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--id", type=int)
    p.add_argument("--distrito", help="cd_dist — subdivide TODAS microzonas do distrito")
    a = p.parse_args()
    if not a.id and not a.distrito:
        print("uso: --id MR_ID  ou  --distrito CD_DIST"); return

    inicio = time.time()

    alvos = []
    if a.id:
        alvos = [a.id]
    else:
        with engine.connect() as c:
            rows = c.execute(text("""
                SELECT id FROM microregioes
                WHERE distrito_cd = :cd
                  AND origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
                  AND congelada_em IS NULL
                  AND calibrada_final = FALSE
                ORDER BY id
            """), {"cd": a.distrito}).fetchall()
            alvos = [r.id for r in rows]

    for mr_id in alvos:
        s = subdividir(mr_id)
        if s.get("ok"):
            print(f"  id={mr_id} {s['nome_original']:<25} {s['seeds']} seeds → {s['criadas']} novas ({s['setores']} setores)")
        else:
            print(f"  id={mr_id}: skip — {s['motivo']}")

    print(f"\nFIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
