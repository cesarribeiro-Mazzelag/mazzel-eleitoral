"""ETL 36: Arredonda cantos agudos das fronteiras (Chaikin's algorithm).

Cesar 14/04 (10:40): invasoes triangulares entre fronteiras sao feias.
Pediu que invasoes existentes sejam "arredondadas", suaves visualmente.

Algoritmo Chaikin: cada vertex V entre A e C vira 2 pontos:
    Q = A*0.25 + V*0.75   (25% caminho A->V, proximo de V)
    R = V*0.75 + C*0.25   (75% caminho V->C, proximo de V)
Isso "corta o canto" do vertex V, arredondando. Iterativo, suaviza mais.

Pipeline:
    1. Aplica 1 iteracao de Chaikin em cada microzona (duplica vertices)
    2. ST_SimplifyVW pra reduzir vertices extras (mantendo forma)
    3. ST_Intersection com distrito-pai (guarda)
    4. ST_Difference com vizinhas (guarda)

Blindagem: nao mexe em manual_edit nem congeladas.

Uso:
    python3 36_arredondar_fronteiras.py --distrito 355030894
    python3 36_arredondar_fronteiras.py --municipio 3550308
"""
from __future__ import annotations
import argparse
import json
import sys
import time
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


def chaikin_ring(ring: list, iters: int = 1) -> list:
    """
    Chaikin's corner cutting: cada vertex vira 2 pontos mais proximos da
    linha reta entre vizinhos, arredondando cantos. iters=1 suaviza de
    forma moderada, iters=2 bem mais (mas dobra+dobra vertices).
    """
    if len(ring) < 4:
        return ring
    pts = ring[:-1]  # sem fechamento duplicado
    for _ in range(iters):
        n = len(pts)
        if n < 3:
            break
        novos = []
        for i in range(n):
            a = pts[i]
            c = pts[(i + 1) % n]
            # Q = 75% caminho A->C (proximo de A)
            # R = 25% caminho A->C (proximo de C)
            # Substitui [a, c] por [q, r] onde q = a*0.75 + c*0.25, r = a*0.25 + c*0.75
            q = [a[0] * 0.75 + c[0] * 0.25, a[1] * 0.75 + c[1] * 0.25]
            r = [a[0] * 0.25 + c[0] * 0.75, a[1] * 0.25 + c[1] * 0.75]
            novos.append(q)
            novos.append(r)
        pts = novos
    return pts + [pts[0]]


def arredondar_microzona(conn, mr_id: int) -> dict:
    dados = conn.execute(text("""
        SELECT geometry AS g, distrito_cd, municipio_id,
               ST_NPoints(geometry) AS v,
               ST_AsGeoJSON(geometry)::json AS gj
        FROM microregioes WHERE id = :mid AND congelada_em IS NULL
    """), {"mid": mr_id}).fetchone()
    if not dados:
        return {"ok": False}

    v_antes = dados.v
    gj = dados.gj

    # Aplica Chaikin em cada ring
    if gj["type"] == "Polygon":
        rings = [chaikin_ring(r, iters=1) for r in gj["coordinates"]]
        novo_gj = {"type": "Polygon", "coordinates": rings}
    elif gj["type"] == "MultiPolygon":
        partes = []
        for parte in gj["coordinates"]:
            rings = [chaikin_ring(r, iters=1) for r in parte]
            partes.append(rings)
        novo_gj = {"type": "MultiPolygon", "coordinates": partes}
    else:
        return {"ok": False}

    # Aplica Chaikin + simplify + intersecta distrito + difference vizinhas.
    # SimplifyVW com tolerancia moderada pra reduzir os vertices duplicados
    # pela Chaikin sem perder o arredondamento.
    result = conn.execute(text("""
        WITH
        base AS (
            SELECT ST_SetSRID(ST_GeomFromGeoJSON(:gj), 4674) AS g,
                   (SELECT distrito_cd FROM microregioes WHERE id = :mid) AS cd,
                   (SELECT municipio_id FROM microregioes WHERE id = :mid) AS mid_m
        ),
        distrito_pai AS (
            SELECT ST_Transform(dm.geometry, 4674) AS g
            FROM distritos_municipio dm, base WHERE dm.cd_dist = base.cd
        ),
        vizinhas AS (
            SELECT ST_Union(mr.geometry) AS g
            FROM microregioes mr, base
            WHERE mr.distrito_cd = base.cd AND mr.municipio_id = base.mid_m
              AND mr.id != :mid
        ),
        suavizada AS (
            -- Simplify pos-Chaikin (tolerancia ~3m em graus 4674) pra reduzir
            -- vertices duplicados pela Chaikin sem perder arredondamento.
            SELECT ST_SimplifyPreserveTopology(
                ST_MakeValid(ST_CollectionExtract(ST_MakeValid(base.g), 3)),
                0.00003
            ) AS g FROM base
        ),
        cortada_dist AS (
            SELECT ST_Intersection(suavizada.g, distrito_pai.g) AS g
            FROM suavizada, distrito_pai
        ),
        cortada_vi AS (
            SELECT CASE WHEN vizinhas.g IS NOT NULL
                THEN ST_Difference(cortada_dist.g, vizinhas.g)
                ELSE cortada_dist.g
            END AS g
            FROM cortada_dist LEFT JOIN vizinhas ON TRUE
        ),
        final AS (
            SELECT ST_Multi(ST_SetSRID(
                ST_CollectionExtract(ST_MakeValid(cortada_vi.g), 3), 4674
            )) AS g FROM cortada_vi
        )
        UPDATE microregioes SET geometry = final.g
        FROM final WHERE microregioes.id = :mid AND congelada_em IS NULL
        RETURNING ST_NPoints(geometry) AS v_depois
    """), {"mid": mr_id, "gj": json.dumps(novo_gj)}).fetchone()

    if not result:
        return {"ok": False}
    return {"ok": True, "v_antes": v_antes, "v_depois": result.v_depois}


def processar(municipio_id: int, cd_dist: str | None) -> dict:
    filtro = f"AND mr.distrito_cd = '{cd_dist}'" if cd_dist else "AND mr.distrito_cd IS NOT NULL"
    # Regras B + C (calibrado pelas edicoes manuais Cesar 14/04):
    # - B: preservar microzonas GRANDES com forma COMPLEXA
    #      (area > 500 ha E compac < 0.35) - Chaikin distorce detalhe real
    # - C: pular microzonas em distritos GIGANTES (area_distrito > 1500 ha,
    #      tipo Perus/Marsilac/Parelheiros) - morfologia natural precisa de
    #      mais vertices (ex: Perus tinha 1298 original)
    with engine.connect() as conn:
        alvos = conn.execute(text(f"""
            SELECT mr.id, mr.nome FROM microregioes mr
            LEFT JOIN distritos_municipio dm ON dm.cd_dist = mr.distrito_cd
            WHERE mr.municipio_id = :mid {filtro}
              AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND mr.congelada_em IS NULL
              -- B: exclui microzonas grandes de forma complexa
              AND NOT (
                ST_Area(mr.geometry::geography) > 5000000  -- > 500 ha
                AND (4 * pi() * ST_Area(mr.geometry::geography) /
                     NULLIF(power(ST_Perimeter(mr.geometry::geography), 2), 0)) < 0.35
              )
              -- C: exclui se distrito-pai eh enorme
              AND COALESCE(ST_Area(ST_Transform(dm.geometry, 4674)::geography) / 10000, 0) < 1500
            ORDER BY mr.nome
        """), {"mid": municipio_id}).fetchall()

    total = {"processadas": 0, "v_antes": 0, "v_depois": 0}
    for a in alvos:
        with engine.begin() as conn:
            s = arredondar_microzona(conn, a.id)
        if s.get("ok"):
            total["processadas"] += 1
            total["v_antes"] += s["v_antes"]
            total["v_depois"] += s["v_depois"]
    return total


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
                SELECT d.nm_dist, m.id AS mid FROM distritos_municipio d
                JOIN municipios m ON m.codigo_ibge = d.cd_mun
                WHERE d.cd_dist = :cd
            """), {"cd": args.distrito}).fetchone()
            if not r: print("nao encontrado"); return
            print(f"Escopo: {r.nm_dist}")
            s = processar(r.mid, args.distrito)
        else:
            r = conn.execute(text("""
                SELECT id, nome FROM municipios WHERE codigo_ibge = :c
            """), {"c": args.municipio.zfill(7)}).fetchone()
            if not r: print("nao encontrado"); return
            print(f"Escopo: {r.nome}")
            s = processar(r.id, None)

    print(f"\n{s['processadas']} microzonas arredondadas")
    print(f"Vertices antes : {s['v_antes']:>7}")
    print(f"Vertices depois: {s['v_depois']:>7}")
    if s['v_antes']:
        print(f"Variacao       : {100 * (s['v_depois']-s['v_antes'])/s['v_antes']:+.1f}%")
    print(f"\nFIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
