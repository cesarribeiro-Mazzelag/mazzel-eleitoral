"""ETL 36b: Chaikin agressivo (2 iteracoes) pra distritos com Voronoi cru.

Motivo: o ETL 36 tem regra C que pula distritos > 1500ha (Perus/Marsilac/
Parelheiros/Cidade Dutra/J. Sao Luis). Distritos gerados via ETL 20b
(locais_votacao como sementes) tem linhas retas de Voronoi e precisam de
suavizacao agressiva, mesmo se grandes.

Aplica Chaikin 2x + SimplifyPreserveTopology leve + intersect distrito-pai
+ difference vizinhas. Ignora regras B e C do 36.

Uso:
    python3 36b_suavizar_voronoi_cru.py --distrito 355030823
    python3 36b_suavizar_voronoi_cru.py --distritos 355030823,355030846,...
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

# Reusa funcao chaikin do 36
sys.path.insert(0, str(Path(__file__).parent))
from importlib import import_module
_mod36 = import_module("36_arredondar_fronteiras")
chaikin_ring = _mod36.chaikin_ring


def suavizar_microzona(conn, mr_id: int, iters: int = 2) -> dict:
    dados = conn.execute(text("""
        SELECT ST_NPoints(geometry) AS v, ST_AsGeoJSON(geometry)::json AS gj
        FROM microregioes WHERE id = :mid AND congelada_em IS NULL
    """), {"mid": mr_id}).fetchone()
    if not dados:
        return {"ok": False}

    v_antes = dados.v
    gj = dados.gj

    if gj["type"] == "Polygon":
        rings = [chaikin_ring(r, iters=iters) for r in gj["coordinates"]]
        novo_gj = {"type": "Polygon", "coordinates": rings}
    elif gj["type"] == "MultiPolygon":
        partes = []
        for parte in gj["coordinates"]:
            rings = [chaikin_ring(r, iters=iters) for r in parte]
            partes.append(rings)
        novo_gj = {"type": "MultiPolygon", "coordinates": partes}
    else:
        return {"ok": False}

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
            -- Simplify leve pos-Chaikin (2x gera muitos vertices)
            SELECT ST_SimplifyPreserveTopology(
                ST_MakeValid(ST_CollectionExtract(ST_MakeValid(base.g), 3)),
                0.00002
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


def processar(cd_dist: str, iters: int = 2) -> dict:
    with engine.connect() as conn:
        alvos = conn.execute(text("""
            SELECT id, nome FROM microregioes
            WHERE distrito_cd = :cd
              AND origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND congelada_em IS NULL
            ORDER BY nome
        """), {"cd": cd_dist}).fetchall()

    total = {"n": 0, "v_antes": 0, "v_depois": 0}
    for a in alvos:
        with engine.begin() as conn:
            s = suavizar_microzona(conn, a.id, iters=iters)
        if s.get("ok"):
            total["n"] += 1
            total["v_antes"] += s["v_antes"]
            total["v_depois"] += s["v_depois"]
    return total


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--distrito")
    parser.add_argument("--distritos", help="lista separada por virgula")
    parser.add_argument("--iters", type=int, default=2)
    args = parser.parse_args()

    if args.distrito:
        alvos = [args.distrito]
    elif args.distritos:
        alvos = [x.strip() for x in args.distritos.split(",") if x.strip()]
    else:
        print("uso: --distrito CD  ou  --distritos CD1,CD2,...")
        return

    inicio = time.time()
    for cd in alvos:
        with engine.connect() as c:
            nm = c.execute(text("SELECT nm_dist FROM distritos_municipio WHERE cd_dist=:cd"), {"cd": cd}).scalar()
        s = processar(cd, iters=args.iters)
        print(f"{cd} {nm[:25]:<25} n={s['n']:>3} v:{s['v_antes']}->{s['v_depois']}")
    print(f"\nFIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
