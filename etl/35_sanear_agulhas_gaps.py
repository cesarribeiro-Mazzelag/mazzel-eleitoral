"""ETL 35: Sanear agulhas + fechar gaps pequenos entre microzonas vizinhas.

Cesar 14/04 (09:50): ilhas em formato de agulha poluem o mapa. Tambem
pediu limite de invasao/gap entre fronteiras - buracos pequenos devem
ser fechados pra fronteiras ficarem encostadas.

Tratamentos (ordem):

A) Remove partes-agulha:
   MultiPolygon com parte secundaria de compacidade < 0.12 (forma alongada
   tipo agulha / sliver). Remove. Mantem so partes com forma decente.

B) Fecha gaps pequenos entre vizinhas:
   Gap < AREA_GAP_MAX_M2 (default 10.000 m2 = 1ha) e que toca >=1 microzona
   e atribuido inteiro a vizinha com maior fronteira compartilhada.
   Gaps maiores (parques, reservas) sao preservados.

Uso:
    python3 35_sanear_agulhas_gaps.py --distrito 355030811
    python3 35_sanear_agulhas_gaps.py --municipio 3550308
"""
from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


COMPAC_AGULHA = 0.12          # parte com compac < 0.12 eh agulha
AREA_GAP_MAX_M2 = 10_000.0    # gap < 1ha = fechavel por area bruta
AREA_GAP_MAX_ALONGADO_M2 = 100_000.0  # gap < 10ha MAIS compac baixa = agulha, fecha
COMPAC_GAP_ALONGADO = 0.30    # gap com compac < 0.3 eh formato agulha
GAP_MIN_FECHAR_M2 = 10.0      # gap < 10 m² sao slivers


def sanear_distrito(municipio_id: int, cd_dist: str) -> dict:
    stats = {"agulhas_removidas": 0, "gaps_fechados": 0, "gaps_preservados": 0,
             "area_gap_fechada_ha": 0.0}

    with engine.begin() as conn:
        # PASSO A: remove partes-agulha de MultiPolygons
        # Mantem so partes com compac >= COMPAC_AGULHA OU area >= 5 ha
        antes_agulhas = conn.execute(text(f"""
            SELECT COUNT(*) AS n FROM (
                SELECT (ST_Dump(mr.geometry)).geom AS g FROM microregioes mr
                WHERE mr.distrito_cd = :cd AND mr.municipio_id = :mid
                  AND ST_NumGeometries(mr.geometry) > 1
                  AND mr.congelada_em IS NULL
            ) t
            WHERE 4*pi()*ST_Area(g::geography)/NULLIF(power(ST_Perimeter(g::geography),2), 0) < {COMPAC_AGULHA}
        """), {"cd": cd_dist, "mid": municipio_id}).scalar() or 0

        conn.execute(text(f"""
            WITH candidatas AS (
                SELECT id FROM microregioes
                WHERE distrito_cd = :cd AND municipio_id = :mid
                  AND ST_NumGeometries(geometry) > 1
                  AND congelada_em IS NULL
            ),
            partes AS (
                SELECT c.id,
                       (ST_Dump((SELECT geometry FROM microregioes WHERE id = c.id))).geom AS g
                FROM candidatas c
            ),
            partes_com_metricas AS (
                SELECT p.id, p.g,
                       ST_Area(p.g::geography) AS area_m2,
                       4*pi()*ST_Area(p.g::geography)/NULLIF(power(ST_Perimeter(p.g::geography), 2), 0) AS compac
                FROM partes p
            ),
            mantidas AS (
                -- Mantem parte se: compac decente OU area grande OU eh a principal
                SELECT id, g FROM partes_com_metricas p
                WHERE compac >= {COMPAC_AGULHA}
                   OR area_m2 >= 50000
                   OR area_m2 = (SELECT MAX(area_m2) FROM partes_com_metricas WHERE id = p.id)
            ),
            nova_geom AS (
                SELECT id, ST_Multi(ST_SetSRID(ST_Union(g), 4674)) AS g
                FROM mantidas GROUP BY id
            )
            UPDATE microregioes mr SET geometry = n.g
            FROM nova_geom n WHERE mr.id = n.id
        """), {"cd": cd_dist, "mid": municipio_id})

        stats["agulhas_removidas"] = antes_agulhas

        # PASSO B: fecha gaps pequenos entre vizinhas
        # Gaps sao atribuidos a microzona com MAIOR fronteira compartilhada.
        # Se gap > AREA_GAP_MAX_M2, preserva (provavelmente parque real).
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
            SELECT (ST_Dump(gap.g)).path[1] AS idx,
                   ST_AsEWKT((ST_Dump(gap.g)).geom) AS ewkt,
                   ST_Area((ST_Dump(gap.g)).geom::geography) AS area_m2
            FROM gap
        """), {"cd": cd_dist, "mid": municipio_id}).fetchall()

        for ilha in ilhas:
            if ilha.area_m2 < GAP_MIN_FECHAR_M2:
                continue

            # Criterio duplo de fechamento (atualizado 14/04 apos edicao Cesar):
            # 1. Gap pequeno (< 1ha): fecha (comportamento antigo)
            # 2. Gap medio (1-10ha) MAS com formato de agulha (compac < 0.3):
            #    tambem fecha. Agulha = gap alongado/fino, nao eh parque.
            # 3. Gap >= 10ha OU compacto (forma regular): preserva (parque).
            info = conn.execute(text("""
                SELECT 4*pi()*ST_Area(ST_GeomFromEWKT(:ewkt)::geography) /
                       NULLIF(power(ST_Perimeter(ST_GeomFromEWKT(:ewkt)::geography), 2), 0) AS compac
            """), {"ewkt": ilha.ewkt}).fetchone()
            compac_gap = float(info.compac or 0) if info else 0

            eh_pequeno = ilha.area_m2 <= AREA_GAP_MAX_M2
            eh_agulha_media = (
                ilha.area_m2 <= AREA_GAP_MAX_ALONGADO_M2
                and compac_gap < COMPAC_GAP_ALONGADO
            )
            if not (eh_pequeno or eh_agulha_media):
                stats["gaps_preservados"] += 1
                continue

            # Acha vizinha NAO-CONGELADA com maior fronteira compartilhada
            # (ST_DWithin 2m captura gaps que "quase tocam" por precisao float).
            vizinha = conn.execute(text("""
                SELECT mr.id,
                       ST_Length(ST_Intersection(
                           ST_Boundary(ST_GeomFromEWKT(:ewkt)),
                           ST_Boundary(mr.geometry)
                       )::geography) AS fronteira_m
                FROM microregioes mr
                WHERE mr.distrito_cd = :cd AND mr.municipio_id = :mid
                  AND mr.congelada_em IS NULL
                  AND ST_DWithin(ST_GeomFromEWKT(:ewkt), mr.geometry, 0.00002)
                ORDER BY fronteira_m DESC NULLS LAST
                LIMIT 1
            """), {"ewkt": ilha.ewkt, "cd": cd_dist, "mid": municipio_id}).fetchone()

            # Fallback: gap flutuante sem vizinha proxima. Vai pra microzona
            # NAO-CONGELADA mais proxima por ST_Distance.
            if not vizinha or not vizinha.id:
                vizinha = conn.execute(text("""
                    SELECT mr.id FROM microregioes mr
                    WHERE mr.distrito_cd = :cd AND mr.municipio_id = :mid
                      AND mr.congelada_em IS NULL
                    ORDER BY ST_Distance(mr.geometry, ST_GeomFromEWKT(:ewkt))
                    LIMIT 1
                """), {"ewkt": ilha.ewkt, "cd": cd_dist, "mid": municipio_id}).fetchone()

            if not vizinha:
                continue

            # Tentativa 1: union direto (funciona se tocam).
            # Tentativa 2: ST_Snap(vizinha->gap, 20m) antes, pra alinhar
            # vertices proximos e colar o gap na vizinha (resolve gaps
            # "flutuantes" que estao a <20m mas nao tocam).
            preview = conn.execute(text("""
                SELECT ST_NumGeometries(ST_Multi(ST_MakeValid(ST_Union(
                    mr.geometry, ST_GeomFromEWKT(:ewkt)
                )))) AS n
                FROM microregioes mr WHERE mr.id = :vid
            """), {"vid": vizinha.id, "ewkt": ilha.ewkt}).fetchone()

            if preview and preview.n > 1:
                # Criaria ilha. Aplica BRIDGE por buffer morfologico:
                # - Calcula distancia entre vizinha e gap (em metros).
                # - Buffer(+D + slack) no union → "incha" e cria ponte.
                # - Buffer(-D) → "murcha" pra tamanho proximo ao original.
                # - Intersect com distrito-pai → nao sai do distrito.
                bridge_ok = conn.execute(text("""
                    WITH
                    vz AS (SELECT geometry AS g FROM microregioes WHERE id = :vid),
                    gp AS (SELECT ST_GeomFromEWKT(:ewkt) AS g),
                    dist AS (
                        SELECT ST_Transform(dm.geometry, 4674) AS g
                        FROM distritos_municipio dm WHERE dm.cd_dist = :cd
                    ),
                    dist_m AS (
                        SELECT ST_Distance(vz.g::geography, gp.g::geography) + 1 AS d
                        FROM vz, gp
                    ),
                    bridge AS (
                        SELECT ST_Intersection(
                            ST_Buffer(
                                ST_Buffer(ST_Union(vz.g, gp.g), (dist_m.d / 111320.0)),
                                -(dist_m.d / 111320.0) * 0.95
                            ),
                            dist.g
                        ) AS g
                        FROM vz, gp, dist_m, dist
                    )
                    SELECT ST_NumGeometries(ST_Multi(ST_MakeValid(bridge.g))) AS n,
                           ST_AsEWKT(ST_Multi(ST_CollectionExtract(ST_MakeValid(bridge.g), 3))) AS ewkt
                    FROM bridge
                """), {"vid": vizinha.id, "ewkt": ilha.ewkt, "cd": cd_dist}).fetchone()

                if bridge_ok and bridge_ok.n == 1:
                    conn.execute(text("""
                        UPDATE microregioes SET geometry = ST_Multi(ST_SetSRID(
                            ST_GeomFromEWKT(:new_ewkt), 4674
                        )) WHERE id = :vid AND congelada_em IS NULL
                    """), {"vid": vizinha.id, "new_ewkt": bridge_ok.ewkt})
                    stats["gaps_fechados"] += 1
                    stats["area_gap_fechada_ha"] += ilha.area_m2 / 10000
                    continue
                else:
                    continue  # bridge tambem criaria ilha, desiste

            conn.execute(text("""
                UPDATE microregioes mr SET geometry = ST_Multi(ST_SetSRID(
                    ST_CollectionExtract(
                        ST_MakeValid(ST_Union(mr.geometry, ST_GeomFromEWKT(:ewkt))),
                        3
                    ), 4674
                ))
                WHERE id = :vid AND congelada_em IS NULL
            """), {"vid": vizinha.id, "ewkt": ilha.ewkt})

            stats["gaps_fechados"] += 1
            stats["area_gap_fechada_ha"] += ilha.area_m2 / 10000

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
            dists = conn.execute(text("""
                SELECT cd_dist, nm_dist FROM distritos_municipio WHERE cd_mun = :c
            """), {"c": r.codigo_ibge.zfill(7)}).fetchall()
            distritos = [(d.cd_dist, d.nm_dist, r.mid) for d in dists]

    print(f"\nProcessando {len(distritos)} distrito(s)...\n")
    print(f"{'distrito':<28} {'agulhas':>8} {'fechados':>9} {'area_ha':>9} {'preserv':>8}")
    print("-" * 72)

    total = {"agulhas": 0, "fechados": 0, "area": 0.0, "preserv": 0}
    for cd, nm, mid in distritos:
        s = sanear_distrito(mid, cd)
        print(f"{nm[:27]:<28} {s['agulhas_removidas']:>8} {s['gaps_fechados']:>9} "
              f"{s['area_gap_fechada_ha']:>9.2f} {s['gaps_preservados']:>8}")
        total["agulhas"] += s["agulhas_removidas"]
        total["fechados"] += s["gaps_fechados"]
        total["area"] += s["area_gap_fechada_ha"]
        total["preserv"] += s["gaps_preservados"]

    print("-" * 72)
    print(f"\nTotal: {total['agulhas']} agulhas removidas, {total['fechados']} gaps fechados")
    print(f"       {total['area']:.2f} ha preenchidos, {total['preserv']} gaps > 1ha preservados")
    print(f"\nFIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
