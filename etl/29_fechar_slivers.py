"""ETL 29: Fechar slivers geometricos (partes adjacentes que nao fundem).

Problema identificado em 13/04/2026 (print Cesar):
    Vila Pereira Cerca aparecia com 2 labels no mapa -> microzona tinha
    MultiPolygon com 2 partes. Query de distancia: as 2 partes estavam a
    ZERO METROS de distancia, ou seja, adjacentes. Mas ST_Union nao fundiu
    porque ha um "sliver" (gap microscopico de precisao float) entre os
    vertices.

    Efeito visual: alem do label duplicado, as bordas dissolvidas (ETL 22)
    geram MUITAS linhas internas (498 no total pra Pirituba, com 15
    microzonas) porque cada parte do MultiPolygon tem boundary separada
    que o LineMerge nao conecta.

Fix: aplicar ST_SnapToGrid com grid bem fino (0.0000001 deg ~ 1 cm) que
forca vertices muito proximos a convergir pra mesma coordenada. Depois
ST_Union dessas partes "encaixadas" produz 1 Polygon unico.

Criterio de aplicacao:
    Microzonas com MultiPolygon onde TODAS as partes estao a 0m entre si
    (se tocam em algum ponto). Partes realmente separadas (ilha oceanica,
    bairro descontinuo legitimo) NAO entram - permanecem como MultiPolygon.

Respeita freeze. Versiona em audit se hash mudar.

Uso:
    python3 29_fechar_slivers.py --distrito 355030863
    python3 29_fechar_slivers.py --municipio 3550308
"""
from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


# Grid de snap em graus SRID 4674 (~11 cm em SP). Fino o suficiente pra
# nao distorcer forma, grande o suficiente pra fechar slivers reais
# (medidos em Pirituba: gaps de 1-28 mm).
SNAP_GRID = 0.000001

# Threshold de deteccao: partes com dist_min <= 1 metro sao consideradas
# "encostadas" (sliver). Acima disso, sao realmente separadas (ilhas) e
# nao mexemos.
DIST_MAX_SLIVER_M = 1.0


def fechar_slivers(municipio_id: int, distrito_cd: str | None) -> dict:
    filtro_dist = (
        f"AND mr.distrito_cd = '{distrito_cd}'" if distrito_cd
        else "AND mr.distrito_cd IS NOT NULL"
    )

    with engine.begin() as conn:
        # Candidatas: N>1 partes MAS dist minima entre partes == 0 (touch).
        # Se dist > 0, partes sao fisicamente separadas (nao mexemos).
        candidatas = conn.execute(text(f"""
            WITH partes AS (
                SELECT mr.id,
                       (ST_Dump(mr.geometry)).path[1] AS idx,
                       (ST_Dump(mr.geometry)).geom AS poly
                FROM microregioes mr
                WHERE mr.municipio_id = :mid {filtro_dist}
                  AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
                  AND mr.congelada_em IS NULL
                  AND mr.calibrada_final = FALSE
                  AND mr.geometry IS NOT NULL
                  AND ST_NumGeometries(mr.geometry) > 1
            ),
            pares AS (
                SELECT p1.id,
                       MIN(ST_Distance(p1.poly::geography, p2.poly::geography)) AS dist_min_m
                FROM partes p1
                JOIN partes p2 ON p1.id = p2.id AND p1.idx < p2.idx
                GROUP BY p1.id
            )
            SELECT id FROM pares WHERE dist_min_m <= {DIST_MAX_SLIVER_M}
        """), {"mid": municipio_id}).fetchall()

        ids_para_fechar = [c.id for c in candidatas]

        if not ids_para_fechar:
            return {
                "candidatas": 0, "fechadas_com_sucesso": 0,
                "ainda_multi": 0, "total_multi_antes": 0,
            }

        # Contagem de fragmentadas ANTES
        antes = conn.execute(text(f"""
            SELECT COUNT(*) AS n FROM microregioes mr
            WHERE mr.municipio_id = :mid {filtro_dist}
              AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND mr.congelada_em IS NULL
              AND mr.calibrada_final = FALSE
              AND mr.geometry IS NOT NULL
              AND ST_NumGeometries(mr.geometry) > 1
        """), {"mid": municipio_id}).scalar()

        # Aplica snap+union nas candidatas
        ids_sql = ",".join(str(i) for i in ids_para_fechar)
        conn.execute(text(f"""
            UPDATE microregioes mr SET geometry = sub.nova_geom
            FROM (
                SELECT mr2.id,
                       ST_Multi(ST_MakeValid(
                         ST_UnaryUnion(
                           ST_SnapToGrid(mr2.geometry, {SNAP_GRID})
                         )
                       )) AS nova_geom
                FROM microregioes mr2
                WHERE mr2.id IN ({ids_sql})
            ) sub
            WHERE mr.id = sub.id
              AND mr.origem != 'manual_edit'
              AND mr.congelada_em IS NULL
              AND mr.calibrada_final = FALSE
              AND mr.geometry IS NOT NULL
        """))

        # Garante SRID e MultiPolygon tipo consistente
        conn.execute(text(f"""
            UPDATE microregioes SET geometry = ST_Multi(ST_SetSRID(geometry, 4674))
            WHERE id IN ({ids_sql})
              AND origem != 'manual_edit'
              AND congelada_em IS NULL
              AND calibrada_final = FALSE
              AND geometry IS NOT NULL
              AND (ST_GeometryType(geometry) = 'ST_Polygon' OR ST_SRID(geometry) = 0)
        """))

        # Contagem de fragmentadas DEPOIS
        depois = conn.execute(text(f"""
            SELECT COUNT(*) AS n FROM microregioes mr
            WHERE mr.municipio_id = :mid {filtro_dist}
              AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND mr.congelada_em IS NULL
              AND mr.calibrada_final = FALSE
              AND mr.geometry IS NOT NULL
              AND ST_NumGeometries(mr.geometry) > 1
        """), {"mid": municipio_id}).scalar()

        fechadas = antes - depois

    return {
        "candidatas": len(ids_para_fechar),
        "fechadas_com_sucesso": fechadas,
        "ainda_multi": depois,
        "total_multi_antes": antes,
    }


def atualizar_hash_e_audit(
    municipio_id: int, distrito_cd: str | None, motivo: str,
) -> int:
    """Delega para o helper do ETL 23."""
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "etl23", Path(__file__).parent / "23_limpeza_microregioes.py",
    )
    etl23 = importlib.util.module_from_spec(spec)  # type: ignore
    spec.loader.exec_module(etl23)  # type: ignore
    with engine.begin() as conn:
        return etl23._atualizar_hash_e_audit(conn, municipio_id, distrito_cd, motivo)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipio", help="codigo_ibge")
    parser.add_argument("--distrito", help="cd_dist (piloto)")
    args = parser.parse_args()

    if not args.municipio and not args.distrito:
        print("uso: --municipio CODIGO_IBGE  ou  --distrito CD_DIST")
        return

    inicio = time.time()
    with engine.connect() as conn:
        if args.distrito:
            r = conn.execute(text("""
                SELECT d.cd_dist, d.nm_dist, m.id AS mid, m.codigo_ibge, m.nome AS nome_mun
                FROM distritos_municipio d
                JOIN municipios m ON m.codigo_ibge = d.cd_mun
                WHERE d.cd_dist = :cd
            """), {"cd": args.distrito}).fetchone()
            if not r:
                print(f"distrito {args.distrito} nao encontrado"); return
            municipio_id, distrito_cd = r.mid, r.cd_dist
            print(f"\npiloto: {r.nome_mun} / {r.nm_dist} ({distrito_cd})")
        else:
            r = conn.execute(text("""
                SELECT id AS mid, codigo_ibge, nome AS nome_mun
                FROM municipios WHERE codigo_ibge = :c
            """), {"c": args.municipio.zfill(7)}).fetchone()
            if not r:
                print(f"municipio {args.municipio} nao encontrado"); return
            municipio_id, distrito_cd = r.mid, None
            print(f"\nmunicipio: {r.nome_mun} ({r.codigo_ibge})")

    print(f"\n[ETL 29] fechando slivers (ST_SnapToGrid({SNAP_GRID}) + ST_UnaryUnion)...")
    stats = fechar_slivers(municipio_id, distrito_cd)
    print(f"  fragmentadas antes           : {stats['total_multi_antes']}")
    print(f"  candidatas (dist=0 entre p)  : {stats['candidatas']}")
    print(f"  fechadas com sucesso         : {stats['fechadas_com_sucesso']}")
    print(f"  ainda fragmentadas (legitimas): {stats['ainda_multi']}")

    n_audit = atualizar_hash_e_audit(municipio_id, distrito_cd, "etl_29_fechar_slivers")
    print(f"  versionadas em audit         : {n_audit}")

    print(f"\nFIM. {time.time() - inicio:.0f}s")
    print("\nProximo: rodar ETL 22 (bordas dissolvidas) pra regenerar linhas limpas.")


if __name__ == "__main__":
    main()
