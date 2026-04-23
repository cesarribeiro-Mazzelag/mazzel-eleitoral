"""ETL 30: Suavizar bordas das microzonas + remover holes degenerados.

Problema identificado em 13/04 noite (print Cesar 20:30):
    Piqueri aparece com visual limpo (112 vertices, 0 holes). Mas Vila
    Pereira Barreto (533 vert), Vila Renato (582), Vila Zatt (564), Vila
    Pereira Cerca (257 + 1 hole degenerado area=0) tem aparencia de "sujeira"
    com traços internos.

Causas:
    1. ST_SnapToGrid + ST_UnaryUnion (ETL 29) pode deixar holes degenerados
       (interior rings com area ~ 0) - MapLibre ainda desenha linha falsa.
    2. Contornos herdados dos setores IBGE tem muitos vertices seguindo
       zigzag de ruas estreitas. Muitos vertices = sensacao visual de
       "rebarba" mesmo sem holes reais.

Fix:
    1. Remover interior rings com area < 10 m² (holes degenerados sem
       significado real).
    2. Aplicar ST_SimplifyPreserveTopology(0.00005) ~ 5 m em SP. Reduz
       vertices mantendo forma. Piqueri (referencia visual limpa) deve
       continuar OK.

Respeita freeze. Atualiza hash+audit.

Uso:
    python3 30_suavizar_bordas.py --distrito 355030863
    python3 30_suavizar_bordas.py --municipio 3550308
"""
from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


# Tolerancia do simplify em graus SRID 4674 (~5m em SP).
# 1 grau lat ~= 111 km, entao 5m = 5/111000 ~ 0.000045. Arredondo pra 0.00005.
SIMPLIFY_TOLERANCE = 0.00005

# Area minima de hole pra preservar (m²). Abaixo disso = hole degenerado.
AREA_MIN_HOLE_M2 = 10.0


def suavizar(municipio_id: int, distrito_cd: str | None) -> dict:
    filtro_dist = (
        f"AND mr.distrito_cd = '{distrito_cd}'" if distrito_cd
        else "AND mr.distrito_cd IS NOT NULL"
    )

    with engine.begin() as conn:
        # Snapshot antes
        antes = conn.execute(text(f"""
            SELECT COUNT(*) AS n_mz,
                   SUM(ST_NPoints(mr.geometry)) AS total_vertices
            FROM microregioes mr
            WHERE mr.municipio_id = :mid {filtro_dist}
              AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND mr.congelada_em IS NULL
              AND mr.calibrada_final = FALSE
              AND mr.geometry IS NOT NULL
        """), {"mid": municipio_id}).fetchone()

        # 1) REMOVER HOLES DEGENERADOS (area < 10 m²)
        # Aplica so onde ha holes.
        holes_removidos = conn.execute(text(f"""
            WITH mzs_com_hole AS (
                SELECT mr.id, (ST_Dump(mr.geometry)).path[1] AS idx, (ST_Dump(mr.geometry)).geom AS poly
                FROM microregioes mr
                WHERE mr.municipio_id = :mid {filtro_dist}
                  AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
                  AND mr.congelada_em IS NULL
                  AND mr.calibrada_final = FALSE
                  AND mr.geometry IS NOT NULL
            ),
            partes_limpas AS (
                SELECT mr_id_idx.id AS mr_id, mr_id_idx.idx,
                       ST_MakePolygon(
                         ST_ExteriorRing(mr_id_idx.poly),
                         COALESCE(NULLIF(
                           ARRAY(
                             SELECT ST_InteriorRingN(mr_id_idx.poly, i)
                             FROM generate_series(1, ST_NumInteriorRings(mr_id_idx.poly)) AS i
                             WHERE ST_Area(
                                 ST_MakePolygon(ST_InteriorRingN(mr_id_idx.poly, i))::geography
                               ) >= {AREA_MIN_HOLE_M2}
                           ), ARRAY[]::geometry[]), ARRAY[]::geometry[])
                       ) AS poly_limpa,
                       ST_NumInteriorRings(mr_id_idx.poly) AS n_rings_antes
                FROM mzs_com_hole mr_id_idx
                WHERE ST_NumInteriorRings(mr_id_idx.poly) > 0
            ),
            reagregadas AS (
                SELECT mr_id,
                       ST_Multi(ST_SetSRID(ST_Union(poly_limpa), 4674)) AS nova,
                       SUM(n_rings_antes) AS total_holes
                FROM partes_limpas GROUP BY mr_id
            )
            UPDATE microregioes mr SET geometry = r.nova
            FROM reagregadas r
            WHERE mr.id = r.mr_id
              AND mr.origem != 'manual_edit'
              AND mr.congelada_em IS NULL
              AND mr.calibrada_final = FALSE
              AND mr.geometry IS NOT NULL
            RETURNING mr.id
        """), {"mid": municipio_id}).fetchall()

        # 2) SIMPLIFY - reduzir vertices
        conn.execute(text(f"""
            UPDATE microregioes mr SET
                geometry = ST_Multi(ST_SetSRID(
                    ST_MakeValid(ST_SimplifyPreserveTopology(mr.geometry, {SIMPLIFY_TOLERANCE})),
                    4674
                ))
            WHERE mr.municipio_id = :mid {filtro_dist}
              AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND mr.congelada_em IS NULL
              AND mr.calibrada_final = FALSE
              AND mr.geometry IS NOT NULL
        """), {"mid": municipio_id})

        # Snapshot depois
        depois = conn.execute(text(f"""
            SELECT COUNT(*) AS n_mz,
                   SUM(ST_NPoints(mr.geometry)) AS total_vertices
            FROM microregioes mr
            WHERE mr.municipio_id = :mid {filtro_dist}
              AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND mr.congelada_em IS NULL
              AND mr.calibrada_final = FALSE
              AND mr.geometry IS NOT NULL
        """), {"mid": municipio_id}).fetchone()

    return {
        "mzs_processadas": antes.n_mz,
        "holes_degenerados_limpos": len(holes_removidos),
        "vertices_antes": antes.total_vertices,
        "vertices_depois": depois.total_vertices,
        "reducao_pct": round(100 * (antes.total_vertices - depois.total_vertices) / max(antes.total_vertices, 1), 1),
    }


def atualizar_hash_e_audit(municipio_id, distrito_cd, motivo):
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "etl23", Path(__file__).parent / "23_limpeza_microregioes.py",
    )
    etl23 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(etl23)
    with engine.begin() as conn:
        return etl23._atualizar_hash_e_audit(conn, municipio_id, distrito_cd, motivo)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipio")
    parser.add_argument("--distrito")
    args = parser.parse_args()
    if not args.municipio and not args.distrito:
        print("uso: --municipio CODIGO  ou  --distrito CD_DIST"); return

    inicio = time.time()
    with engine.connect() as conn:
        if args.distrito:
            r = conn.execute(text("""
                SELECT d.cd_dist, d.nm_dist, m.id AS mid, m.codigo_ibge, m.nome AS nome_mun
                FROM distritos_municipio d JOIN municipios m ON m.codigo_ibge = d.cd_mun
                WHERE d.cd_dist = :cd"""), {"cd": args.distrito}).fetchone()
            if not r: print("distrito nao encontrado"); return
            municipio_id, distrito_cd = r.mid, r.cd_dist
            print(f"\npiloto: {r.nome_mun} / {r.nm_dist}")
        else:
            r = conn.execute(text("""
                SELECT id AS mid, codigo_ibge, nome AS nome_mun FROM municipios WHERE codigo_ibge = :c
            """), {"c": args.municipio.zfill(7)}).fetchone()
            if not r: print("municipio nao encontrado"); return
            municipio_id, distrito_cd = r.mid, None
            print(f"\nmunicipio: {r.nome_mun}")

    print(f"\n[ETL 30] suavizando bordas (simplify {SIMPLIFY_TOLERANCE} + remove holes < {AREA_MIN_HOLE_M2} m²)...")
    stats = suavizar(municipio_id, distrito_cd)
    print(f"  microzonas processadas   : {stats['mzs_processadas']}")
    print(f"  holes degenerados limpos : {stats['holes_degenerados_limpos']}")
    print(f"  vertices antes           : {stats['vertices_antes']}")
    print(f"  vertices depois          : {stats['vertices_depois']}")
    print(f"  reducao vertices         : {stats['reducao_pct']}%")

    n_audit = atualizar_hash_e_audit(municipio_id, distrito_cd, "etl_30_suavizar_bordas")
    print(f"  versionadas em audit     : {n_audit}")

    print(f"\nFIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
