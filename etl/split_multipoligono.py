"""Detecta microzonas com MultiPolygon (>1 parte fisica separada) e quebra
cada parte em microzona propria com sufixo numerico.

Motivo: subdividir_microzona.py agrupa por `bairro_norm`. Se o mesmo nome de
bairro aparece em areas fisicamente separadas (ex: "Sitio Morro Grande" em 3
pontos), vira 1 microzona com 3 partes + 3 labels visuais. Isso gera ruido.

Fix: para cada MultiPolygon:
    - Parte 0 (maior) mantem microzona original
    - Partes 1..N criam microzonas novas com nome + sufixo " 2", " 3", etc
    - Setores re-atribuidos pelo centroide

Respeita governanca: nao toca manual_edit/congelada/calibrada_final.

Uso:
    python3 split_multipoligono.py --distrito 355030811
"""
from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path
from sqlalchemy import text
sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


def split_distrito(cd_dist: str) -> dict:
    stats = {"microzonas_splitadas": 0, "partes_novas": 0}
    with engine.begin() as conn:
        alvos = conn.execute(text("""
            SELECT id, nome, nome_padronizado, municipio_id, distrito_cd, origem,
                   ST_NumGeometries(geometry) AS n
            FROM microregioes
            WHERE distrito_cd = :cd
              AND ST_NumGeometries(geometry) > 1
              AND origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND congelada_em IS NULL
              AND calibrada_final = FALSE
        """), {"cd": cd_dist}).fetchall()

        for mr in alvos:
            # Pega partes como EWKT ordenadas por area
            partes = conn.execute(text("""
                SELECT (ST_Dump(geometry)).path[1] AS idx,
                       ST_AsEWKT((ST_Dump(geometry)).geom) AS g_ewkt,
                       ST_Area((ST_Dump(geometry)).geom::geography) AS area
                FROM microregioes WHERE id = :mid
                ORDER BY area DESC
            """), {"mid": mr.id}).fetchall()

            if len(partes) < 2:
                continue

            # Parte maior fica com a original
            maior = partes[0]
            conn.execute(text("""
                UPDATE microregioes SET geometry = ST_Multi(ST_SetSRID(ST_GeomFromEWKT(:g), 4674)),
                       area_km2 = ROUND((:a/1000000.0)::numeric, 3)
                WHERE id = :mid
            """), {"mid": mr.id, "g": maior.g_ewkt, "a": float(maior.area)})

            for i, parte in enumerate(partes[1:], start=2):
                sufixo = f" {i}"
                nome_padr = f"{mr.nome_padronizado}-part{i}"
                novo = conn.execute(text("""
                    INSERT INTO microregioes (
                        nome, nome_padronizado, nivel, municipio_id, distrito_cd,
                        geometry, area_km2, origem
                    ) VALUES (
                        :nome, :nome_padr, 5, :mid_mun, :cd,
                        ST_Multi(ST_SetSRID(ST_GeomFromEWKT(:g), 4674)),
                        ROUND((:a/1000000.0)::numeric, 3), 'voronoi_v2'
                    )
                    ON CONFLICT (municipio_id, nome_padronizado) DO NOTHING
                    RETURNING id
                """), {"nome": mr.nome + sufixo, "nome_padr": nome_padr,
                       "mid_mun": mr.municipio_id, "cd": cd_dist,
                       "g": parte.g_ewkt, "a": float(parte.area)}).fetchone()
                if novo:
                    conn.execute(text("""
                        UPDATE setores_censitarios sc SET microregiao_id = :novo_id
                        WHERE sc.microregiao_id = :mid_orig
                          AND ST_Contains(
                              ST_GeomFromEWKT(:g),
                              ST_Transform(ST_Centroid(sc.geometry), 4674)
                          )
                    """), {"novo_id": novo.id, "mid_orig": mr.id, "g": parte.g_ewkt})
                    stats["partes_novas"] += 1

            stats["microzonas_splitadas"] += 1

    return stats


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--distrito", required=True)
    a = p.parse_args()
    inicio = time.time()
    s = split_distrito(a.distrito)
    print(f"  splitadas: {s['microzonas_splitadas']}")
    print(f"  partes novas criadas: {s['partes_novas']}")
    print(f"FIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
