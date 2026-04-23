"""ETL 33: Preencher gaps - areas do distrito nao cobertas por microzona.

Depois de poda (ETL 32) ou edicoes manuais, podem sobrar "ilhas" do distrito
que nao pertencem a nenhuma microzona. Visualmente aparecem como "buracos"
dentro do bairro oficial.

Algoritmo:
    1. Pra cada distrito: gap = ST_Difference(distrito_pai, union(microzonas))
    2. Pra cada ilha do gap:
       - Calcular microzona vizinha com MAIOR fronteira compartilhada
       - ST_Union(microzona_vizinha, ilha) = microzona cobre a ilha

Respeita freeze (nao mexe em congeladas mesmo que vizinhas de gaps).

Uso:
    python3 33_preencher_gaps.py --distrito 355030868
    python3 33_preencher_gaps.py --municipio 3550308
"""
from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


# Gaps com area < AREA_MIN_IGNORAR sao ignorados (slivers de precisao)
AREA_MIN_IGNORAR_M2 = 50.0


def preencher_gaps_distrito(municipio_id: int, distrito_cd: str) -> dict:
    """Preenche gaps de UM distrito. Retorna stats."""
    stats = {"gaps_totais": 0, "gaps_preenchidos": 0, "area_preenchida_m2": 0.0,
             "ignorados_pequenos": 0, "sem_vizinha_valida": 0}

    with engine.begin() as conn:
        # 1. Calcula gaps e os dumpa em ilhas individuais.
        ilhas = conn.execute(text("""
            WITH dist AS (
                SELECT ST_Transform(geometry, 4674) AS g
                FROM distritos_municipio WHERE cd_dist = :cd
            ),
            mrs AS (
                SELECT ST_Union(geometry) AS g FROM microregioes
                WHERE distrito_cd = :cd AND municipio_id = :mid
            ),
            gap AS (
                SELECT ST_Difference(dist.g, COALESCE(mrs.g, ST_GeomFromText('POLYGON EMPTY', 4674))) AS g
                FROM dist LEFT JOIN mrs ON TRUE
            )
            SELECT
                (ST_Dump(gap.g)).path[1] AS idx,
                ST_AsEWKT((ST_Dump(gap.g)).geom) AS ewkt,
                ST_Area((ST_Dump(gap.g)).geom::geography) AS area_m2
            FROM gap
        """), {"cd": distrito_cd, "mid": municipio_id}).fetchall()

        stats["gaps_totais"] = len(ilhas)

        for ilha in ilhas:
            if ilha.area_m2 < AREA_MIN_IGNORAR_M2:
                stats["ignorados_pequenos"] += 1
                continue

            # 2. Acha microzona vizinha com maior FRONTEIRA compartilhada.
            # ST_Length(intersection das boundaries) = quanto a ilha toca a microzona.
            vizinha = conn.execute(text("""
                SELECT mr.id, mr.nome,
                       ST_Length(ST_Intersection(
                           ST_Boundary(ST_GeomFromEWKT(:ewkt)),
                           ST_Boundary(mr.geometry)
                       )::geography) AS fronteira_m
                FROM microregioes mr
                WHERE mr.distrito_cd = :cd
                  AND mr.municipio_id = :mid
                  AND mr.congelada_em IS NULL
                  AND ST_Intersects(ST_GeomFromEWKT(:ewkt), ST_Boundary(mr.geometry))
                ORDER BY fronteira_m DESC NULLS LAST
                LIMIT 1
            """), {"ewkt": ilha.ewkt, "cd": distrito_cd, "mid": municipio_id}).fetchone()

            if not vizinha or not vizinha.fronteira_m or vizinha.fronteira_m <= 0:
                # Fallback: vizinha NAO-CONGELADA mais proxima (por distancia)
                vizinha = conn.execute(text("""
                    SELECT mr.id, mr.nome
                    FROM microregioes mr
                    WHERE mr.distrito_cd = :cd AND mr.municipio_id = :mid
                      AND mr.congelada_em IS NULL
                    ORDER BY ST_Distance(mr.geometry, ST_GeomFromEWKT(:ewkt))
                    LIMIT 1
                """), {"ewkt": ilha.ewkt, "cd": distrito_cd, "mid": municipio_id}).fetchone()

            if not vizinha:
                stats["sem_vizinha_valida"] += 1
                continue

            # 3. Preview do ST_Union. SO aplica se resultado for poligono
            # unico contiguo (evita criar ilha desconexa = "quadrado duplicado"
            # que poluiu o mapa - Cesar 14/04 01:26).
            preview = conn.execute(text("""
                SELECT ST_NumGeometries(ST_Multi(ST_MakeValid(ST_Union(
                    mr.geometry, ST_GeomFromEWKT(:ewkt)
                )))) AS n_partes
                FROM microregioes mr WHERE mr.id = :vid
            """), {"vid": vizinha.id, "ewkt": ilha.ewkt}).fetchone()

            if preview and preview.n_partes > 1:
                # Nao aplica - union criaria ilha desconexa
                stats["ignorados_desconexos"] = stats.get("ignorados_desconexos", 0) + 1
                continue

            conn.execute(text("""
                UPDATE microregioes mr SET geometry = ST_Multi(ST_SetSRID(
                    ST_MakeValid(ST_Union(mr.geometry, ST_GeomFromEWKT(:ewkt))),
                    4674
                ))
                WHERE id = :vid AND congelada_em IS NULL
            """), {"vid": vizinha.id, "ewkt": ilha.ewkt})

            stats["gaps_preenchidos"] += 1
            stats["area_preenchida_m2"] += float(ilha.area_m2)

    return stats


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipio"); parser.add_argument("--distrito")
    args = parser.parse_args()
    if not args.municipio and not args.distrito:
        print("uso: --municipio CODIGO  ou  --distrito CD_DIST"); return

    inicio = time.time()
    with engine.connect() as conn:
        if args.distrito:
            r = conn.execute(text("""
                SELECT d.nm_dist, d.cd_dist, m.id AS mid FROM distritos_municipio d
                JOIN municipios m ON m.codigo_ibge = d.cd_mun
                WHERE d.cd_dist = :cd
            """), {"cd": args.distrito}).fetchone()
            if not r: print("nao encontrado"); return
            distritos = [(r.cd_dist, r.nm_dist, r.mid)]
        else:
            r = conn.execute(text("""
                SELECT id AS mid, codigo_ibge, nome FROM municipios WHERE codigo_ibge = :c
            """), {"c": args.municipio.zfill(7)}).fetchone()
            if not r: print("nao encontrado"); return
            distritos = conn.execute(text("""
                SELECT cd_dist, nm_dist FROM distritos_municipio WHERE cd_mun = :c
            """), {"c": r.codigo_ibge.zfill(7)}).fetchall()
            distritos = [(d.cd_dist, d.nm_dist, r.mid) for d in distritos]

    print(f"\nProcessando {len(distritos)} distrito(s)...\n")
    print(f"{'distrito':<28} {'gaps':>6} {'preench':>8} {'area_ha':>9} {'ignor':>6} {'sem_viz':>8}")
    print("-" * 75)

    total = {"gaps_totais": 0, "gaps_preenchidos": 0, "area_preenchida_m2": 0.0}
    for cd_dist, nm_dist, mid in distritos:
        s = preencher_gaps_distrito(mid, cd_dist)
        total["gaps_totais"] += s["gaps_totais"]
        total["gaps_preenchidos"] += s["gaps_preenchidos"]
        total["area_preenchida_m2"] += s["area_preenchida_m2"]
        print(f"{nm_dist[:27]:<28} {s['gaps_totais']:>6} {s['gaps_preenchidos']:>8} "
              f"{s['area_preenchida_m2']/10000:>9.2f} {s['ignorados_pequenos']:>6} "
              f"{s['sem_vizinha_valida']:>8}")

    print("-" * 75)
    print(f"\nTotal gaps preenchidos: {total['gaps_preenchidos']}/{total['gaps_totais']}")
    print(f"Area total preenchida : {total['area_preenchida_m2']/10000:.2f} ha")
    print(f"\nFIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
