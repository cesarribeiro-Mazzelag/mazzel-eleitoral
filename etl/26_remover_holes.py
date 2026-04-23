"""ETL 26: Remover holes (buracos internos) dos poligonos das microzonas.

Motivacao: ST_Union dos setores IBGE + P1 opening morfologico (ETL 23) deixa
ilhas internas no MultiPolygon. Isso gera "buracos cinzas" dentro da microzona
colorida no mapa - visual ruim.

Regra (decisao Cesar + GPT 13/04/2026 noite):
    Preenche um hole SE:
        area_hole < 50.000 m²  (meio quarteirao)
        OR
        area_hole < 5% da area total da microzona

Justificativa do OR: o absoluto 50k pode deixar escapar holes GRANDES em
microzonas PEQUENAS (ex: hole de 40k m² numa microzona de 100k m² = 40% da
area, visualmente ruim). O 5% relativo captura esse caso.

Holes maiores que ambos os cortes sao PRESERVADOS (vazios urbanos legitimos:
parques, cemiterios, reservas).

Respeita freeze: microzonas congeladas (congelada_em IS NOT NULL) nao sao
tocadas. Ao final, incrementa versao + grava linha em microregioes_audit
se hash mudou (reusa _atualizar_hash_e_audit do ETL 23).

Uso:
    python3 26_remover_holes.py --distrito 355030863   # piloto
    python3 26_remover_holes.py --municipio 3550308    # cidade
"""
from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


# Parametros (ver docstring pra justificativa)
THRESHOLD_ABSOLUTO_M2 = 50_000       # 0.05 km2
THRESHOLD_RELATIVO_FRACAO = 0.05     # 5% da area total


def remover_holes(municipio_id: int, distrito_cd: str | None) -> dict:
    """
    Para cada microzona nao-congelada do escopo, reconstroi a geometria
    preservando so holes (interior rings) cuja area seja >= threshold.

    Retorna stats: {processadas, com_mudanca, holes_removidos_total}
    """
    filtro_dist = (
        f"AND mr.distrito_cd = '{distrito_cd}'" if distrito_cd
        else "AND mr.distrito_cd IS NOT NULL"
    )

    with engine.begin() as conn:
        # Contagem inicial de holes ANTES
        antes = conn.execute(text(f"""
            SELECT COUNT(*) AS n_holes
            FROM (
                SELECT ST_NumInteriorRings((ST_Dump(mr.geometry)).geom) AS n
                FROM microregioes mr
                WHERE mr.municipio_id = :mid {filtro_dist}
                  AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
                  AND mr.congelada_em IS NULL
                  AND mr.calibrada_final = FALSE
                  AND mr.geometry IS NOT NULL
            ) t
            WHERE n > 0
        """), {"mid": municipio_id}).fetchone()
        n_holes_antes = antes.n_holes if antes else 0

        # SQL principal: reconstroi geometria filtrando holes pequenos.
        #
        # IMPORTANTE (determinismo):
        # So reconstroi microzonas que tem AO MENOS UM hole ABAIXO do threshold.
        # Se a microzona ja nao tem hole, ou so tem holes grandes (preservados),
        # NAO toca nela. Isso evita rerun gerar versao nova sem mudanca real.
        #
        # Estrategia:
        # 1. Pra cada parte de cada microzona nao-congelada, avaliar se tem
        #    algum interior ring cuja area < threshold. So essas entram no WHERE.
        # 2. Reconstruir ST_MakePolygon mantendo so interior rings GRANDES.
        # 3. ST_Union das partes + ST_Multi.
        resultado = conn.execute(text(f"""
            WITH partes AS (
                SELECT mr.id AS mr_id,
                       (ST_Dump(mr.geometry)).path[1] AS idx,
                       (ST_Dump(mr.geometry)).geom AS poly
                FROM microregioes mr
                WHERE mr.municipio_id = :mid {filtro_dist}
                  AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
                  AND mr.congelada_em IS NULL
                  AND mr.calibrada_final = FALSE
                  AND mr.geometry IS NOT NULL
            ),
            mrs_com_holes_pequenos AS (
                -- So microzonas que tem AO MENOS um hole a ser removido.
                SELECT DISTINCT p.mr_id
                FROM partes p
                WHERE EXISTS (
                    SELECT 1 FROM generate_series(1, ST_NumInteriorRings(p.poly)) AS i
                    WHERE ST_Area(
                        ST_MakePolygon(ST_InteriorRingN(p.poly, i))::geography
                      ) < GREATEST(
                        {THRESHOLD_ABSOLUTO_M2},
                        {THRESHOLD_RELATIVO_FRACAO} * ST_Area(p.poly::geography)
                      )
                )
            ),
            partes_limpas AS (
                SELECT p.mr_id, p.idx,
                       ST_MakePolygon(
                         ST_ExteriorRing(p.poly),
                         COALESCE(
                           NULLIF(
                             ARRAY(
                               SELECT ST_InteriorRingN(p.poly, i)
                               FROM generate_series(1, ST_NumInteriorRings(p.poly)) AS i
                               WHERE ST_Area(
                                   ST_MakePolygon(ST_InteriorRingN(p.poly, i))::geography
                                 ) >= GREATEST(
                                   {THRESHOLD_ABSOLUTO_M2},
                                   {THRESHOLD_RELATIVO_FRACAO} * ST_Area(p.poly::geography)
                                 )
                             ),
                             ARRAY[]::geometry[]
                           ),
                           ARRAY[]::geometry[]
                         )
                       ) AS poly_limpa
                FROM partes p
                WHERE p.mr_id IN (SELECT mr_id FROM mrs_com_holes_pequenos)
            ),
            reagregadas AS (
                SELECT mr_id,
                       ST_Multi(ST_SetSRID(ST_Union(poly_limpa), 4674)) AS nova_geom
                FROM partes_limpas
                GROUP BY mr_id
            )
            UPDATE microregioes mr SET geometry = r.nova_geom
            FROM reagregadas r
            WHERE mr.id = r.mr_id
              AND mr.origem != 'manual_edit'
              AND mr.congelada_em IS NULL
              AND mr.calibrada_final = FALSE
              AND mr.geometry IS NOT NULL
            RETURNING mr.id
        """), {"mid": municipio_id}).fetchall()

        # Contagem de holes DEPOIS
        depois = conn.execute(text(f"""
            SELECT COUNT(*) AS n_holes
            FROM (
                SELECT ST_NumInteriorRings((ST_Dump(mr.geometry)).geom) AS n
                FROM microregioes mr
                WHERE mr.municipio_id = :mid {filtro_dist}
                  AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
                  AND mr.congelada_em IS NULL
                  AND mr.calibrada_final = FALSE
                  AND mr.geometry IS NOT NULL
            ) t
            WHERE n > 0
        """), {"mid": municipio_id}).fetchone()
        n_holes_depois = depois.n_holes if depois else 0

    return {
        "microzonas_processadas": len(resultado),
        "holes_antes": n_holes_antes,
        "holes_depois": n_holes_depois,
        "holes_removidos": n_holes_antes - n_holes_depois,
    }


def atualizar_hash_e_audit(
    municipio_id: int, distrito_cd: str | None, motivo: str,
) -> int:
    """Delega para o helper ja implementado no ETL 23 (import dinamico)."""
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
                print(f"distrito {args.distrito} nao encontrado")
                return
            municipio_id, distrito_cd = r.mid, r.cd_dist
            print(f"\npiloto: {r.nome_mun} / {r.nm_dist} ({distrito_cd})")
        else:
            r = conn.execute(text("""
                SELECT id AS mid, codigo_ibge, nome AS nome_mun
                FROM municipios WHERE codigo_ibge = :c
            """), {"c": args.municipio.zfill(7)}).fetchone()
            if not r:
                print(f"municipio {args.municipio} nao encontrado")
                return
            municipio_id, distrito_cd = r.mid, None
            print(f"\nmunicipio: {r.nome_mun} ({r.codigo_ibge})")

    print(f"\n[ETL 26] removendo holes (< {THRESHOLD_ABSOLUTO_M2} m² OR "
          f"< {THRESHOLD_RELATIVO_FRACAO:.0%} da area)...")
    stats = remover_holes(municipio_id, distrito_cd)
    print(f"  microzonas processadas : {stats['microzonas_processadas']}")
    print(f"  holes antes            : {stats['holes_antes']}")
    print(f"  holes depois           : {stats['holes_depois']}")
    print(f"  holes removidos        : {stats['holes_removidos']}")

    # Versionamento: incrementa versao + grava audit nas microzonas que mudaram.
    n_versionadas = atualizar_hash_e_audit(
        municipio_id, distrito_cd, "etl_26_remover_holes",
    )
    print(f"  versionadas em audit   : {n_versionadas}")

    print(f"\nFIM. {time.time() - inicio:.0f}s")
    print("\nProximo: regenerar ETL 22 (bordas dissolvidas) pra atualizar as linhas.")


if __name__ == "__main__":
    main()
