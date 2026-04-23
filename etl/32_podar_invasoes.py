"""ETL 32: Poda invasoes + remove pontas agudas (arestas feias).

Passos (em ordem, cada um idempotente):
    1. Intersect com distrito-pai (nao sai do distrito)
    2. Difference union(vizinhas) (nao sobrepoe outras microzonas)
    3. Remove vertices com angulo < 30 graus (ponta aguda "farpa")
    4. Remove vertices com angulo > 178 graus (quase colinear, redundante)

Uso:
    python3 32_podar_invasoes.py --distrito 355030868
    python3 32_podar_invasoes.py --municipio 3550308
"""
from __future__ import annotations
import argparse
import sys
import time
import math
import json
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


# Thresholds de remocao de vertice
ANGULO_MIN_DEG = 30.0    # < 30 graus = ponta aguda (farpa)
ANGULO_MAX_DEG = 178.0   # > 178 graus = quase colinear (redundante)


def _angulo_interno(a: list, v: list, c: list) -> float:
    """Angulo interno no vertex V entre arestas V-A e V-C (em graus)."""
    va = (a[0] - v[0], a[1] - v[1])
    vc = (c[0] - v[0], c[1] - v[1])
    mag_a = math.hypot(va[0], va[1])
    mag_c = math.hypot(vc[0], vc[1])
    if mag_a == 0 or mag_c == 0:
        return 180.0
    cos = max(-1.0, min(1.0, (va[0]*vc[0] + va[1]*vc[1]) / (mag_a * mag_c)))
    return math.degrees(math.acos(cos))


def limpar_pontas_ring(ring: list) -> tuple[list, int, int]:
    """
    Remove vertices com angulo < 30 graus (ponta aguda) ou > 178 (colinear).
    Limita remocao por rodada a 1/3 dos vertices pra evitar degeneracao.
    Preserva minimo de 4 vertices (triangulo + fechamento).
    Retorna (ring_limpo, n_agudos, n_colineares).
    """
    if len(ring) < 5:
        return ring, 0, 0

    pts = ring[:-1]
    removidos_agudos = 0
    removidos_colineares = 0

    while True:
        n = len(pts)
        if n <= 4:
            break
        # Marca vertices a remover (calcula angulos em snapshot)
        marcados = []
        for i in range(n):
            prev = pts[(i - 1) % n]
            atual = pts[i]
            prox = pts[(i + 1) % n]
            ang = _angulo_interno(prev, atual, prox)
            if ang < ANGULO_MIN_DEG or ang > ANGULO_MAX_DEG:
                marcados.append((i, ang))

        if not marcados:
            break

        # Limita remocao a 1/3 dos vertices por rodada + preserva min 4
        max_remover = min(len(marcados), max(0, n - 4), n // 3 or 1)
        # Prioriza os mais extremos (menores angulos primeiro, depois maiores)
        marcados.sort(key=lambda x: abs(90 - x[1]), reverse=True)
        idx_remover = {i for i, _ in marcados[:max_remover]}

        novo = []
        for i in range(n):
            if i in idx_remover:
                ang = next(a for ii, a in marcados if ii == i)
                if ang < ANGULO_MIN_DEG:
                    removidos_agudos += 1
                else:
                    removidos_colineares += 1
                continue
            novo.append(pts[i])

        # Guard: remove duplicados vizinhos (bug de degeneracao)
        dedup = [novo[0]]
        for p in novo[1:]:
            if p[0] != dedup[-1][0] or p[1] != dedup[-1][1]:
                dedup.append(p)

        if len(dedup) <= 3:
            break
        pts = dedup

    return pts + [pts[0]], removidos_agudos, removidos_colineares


def podar_microzona(conn, mr_id: int) -> dict:
    """Aplica poda + limpeza de pontas agudas.

    Governanca Wave 1: double-check de seguranca - skip se alvo for
    manual_edit, congelada ou calibrada_final.
    """
    antes = conn.execute(text("""
        SELECT ST_Area(geometry::geography) AS a, ST_NPoints(geometry) AS v,
               4 * pi() * ST_Area(geometry::geography) /
                   NULLIF(power(ST_Perimeter(geometry::geography), 2), 0) AS compac,
               origem, congelada_em, calibrada_final
        FROM microregioes WHERE id = :mid
    """), {"mid": mr_id}).fetchone()

    if not antes:
        return {"ok": False, "motivo": "nao encontrada"}
    if antes.origem == 'manual_edit':
        return {"ok": False, "motivo": "manual_edit"}
    if antes.congelada_em is not None:
        return {"ok": False, "motivo": "congelada"}
    if antes.calibrada_final:
        return {"ok": False, "motivo": "calibrada_final"}

    # PASSO 1+2: Recorta por distrito-pai + remove sobreposicao com vizinhas
    intermediario = conn.execute(text("""
        WITH orig AS (SELECT geometry AS g, distrito_cd, municipio_id FROM microregioes WHERE id = :mid),
        distrito_pai AS (
            SELECT ST_Transform(dm.geometry, 4674) AS g
            FROM distritos_municipio dm, orig
            WHERE dm.cd_dist = orig.distrito_cd
        ),
        vizinhas AS (
            SELECT ST_Union(mr.geometry) AS g
            FROM microregioes mr, orig
            WHERE mr.distrito_cd = orig.distrito_cd
              AND mr.municipio_id = orig.municipio_id
              AND mr.id != :mid
        ),
        step1 AS (
            SELECT ST_Intersection(orig.g, distrito_pai.g) AS g FROM orig, distrito_pai
        ),
        step2 AS (
            SELECT CASE
                WHEN vizinhas.g IS NOT NULL
                THEN ST_Difference(step1.g, vizinhas.g)
                ELSE step1.g
            END AS g FROM step1 LEFT JOIN vizinhas ON TRUE
        )
        SELECT ST_AsGeoJSON(ST_Multi(ST_SetSRID(
            ST_CollectionExtract(ST_MakeValid(step2.g), 3), 4674
        )))::json AS gj
        FROM step2
    """), {"mid": mr_id}).fetchone()

    if not intermediario or not intermediario.gj:
        return {"ok": False}

    # PASSO 3: Limpar pontas agudas / vertices colineares em Python
    gj = intermediario.gj
    total_agudos = total_colin = 0
    if gj["type"] == "Polygon":
        rings_limpos = []
        for r in gj["coordinates"]:
            novo, ag, co = limpar_pontas_ring(r)
            rings_limpos.append(novo)
            total_agudos += ag
            total_colin += co
        gj_final = {"type": "Polygon", "coordinates": rings_limpos}
    elif gj["type"] == "MultiPolygon":
        partes_limpas = []
        for parte in gj["coordinates"]:
            rings_limpos = []
            for r in parte:
                novo, ag, co = limpar_pontas_ring(r)
                rings_limpos.append(novo)
                total_agudos += ag
                total_colin += co
            partes_limpas.append(rings_limpos)
        gj_final = {"type": "MultiPolygon", "coordinates": partes_limpas}
    else:
        return {"ok": False}

    # PASSO 4: Aplicar geometria final.
    # ST_MakeValid pode retornar GeometryCollection se ha self-intersection.
    # Usamos ST_CollectionExtract(3) pra pegar so poligonos.
    # Governanca Wave 1: origem != 'manual_edit', nao-congelada, nao calibrada_final.
    result = conn.execute(text("""
        UPDATE microregioes SET geometry = ST_Multi(ST_SetSRID(
            ST_CollectionExtract(ST_MakeValid(ST_GeomFromGeoJSON(:gj)), 3),
            4674
        ))
        WHERE id = :mid
          AND origem != 'manual_edit'
          AND congelada_em IS NULL
          AND calibrada_final = FALSE
          AND geometry IS NOT NULL
        RETURNING
            ST_Area(geometry::geography) AS a, ST_NPoints(geometry) AS v,
            4 * pi() * ST_Area(geometry::geography) /
                NULLIF(power(ST_Perimeter(geometry::geography), 2), 0) AS compac
    """), {"mid": mr_id, "gj": json.dumps(gj_final)}).fetchone()

    if not result:
        return {"ok": False}

    pct_cortado = 100.0 * (float(antes.a) - float(result.a)) / float(antes.a) if antes.a else 0
    return {
        "ok": True,
        "area_antes": float(antes.a), "area_depois": float(result.a),
        "pct_cortado": round(pct_cortado, 2),
        "v_antes": antes.v, "v_depois": result.v,
        "agudos_removidos": total_agudos,
        "colineares_removidos": total_colin,
        "compac_antes": round(float(antes.compac or 0), 3),
        "compac_depois": round(float(result.compac or 0), 3),
    }


def processar(municipio_id: int, distrito_cd: str | None):
    filtro = f"AND distrito_cd = '{distrito_cd}'" if distrito_cd else "AND distrito_cd IS NOT NULL"
    # Governanca Wave 1: alvos sao voronoi_v2/plus_manual nao-congeladas e
    # nao-calibrada_final. Manual_edit sempre excluida. Trabalho manual tem
    # prioridade absoluta sobre algoritmo.
    with engine.connect() as conn:
        alvos = conn.execute(text(f"""
            SELECT id, nome FROM microregioes
            WHERE municipio_id = :mid {filtro}
              AND origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND congelada_em IS NULL
              AND calibrada_final = FALSE
            ORDER BY nome
        """), {"mid": municipio_id}).fetchall()

    print(f"\nPodando {len(alvos)} microzonas (recorte + limpeza pontas)...\n")
    print(f"{'nome':<28} {'v_ini':>6} {'v_fim':>6} {'c_ini':>6} {'c_fim':>6} {'%cortado':>9} {'agudos':>7} {'colin':>6}")
    print("-" * 90)

    total_cortado = total_agudos = total_colin = 0
    com_invasao = 0
    for a in alvos:
        with engine.begin() as conn:
            stats = podar_microzona(conn, a.id)
        if not stats.get("ok"): continue
        if stats["pct_cortado"] > 0.1:
            com_invasao += 1
            total_cortado += stats["pct_cortado"]
        total_agudos += stats.get("agudos_removidos", 0)
        total_colin += stats.get("colineares_removidos", 0)
        print(f"{a.nome[:27]:<28} {stats['v_antes']:>6} {stats['v_depois']:>6} "
              f"{stats['compac_antes']:>6.3f} {stats['compac_depois']:>6.3f} "
              f"{stats['pct_cortado']:>+9.2f}% {stats.get('agudos_removidos', 0):>7} "
              f"{stats.get('colineares_removidos', 0):>6}")

    print("-" * 90)
    print(f"\nMicrozonas com invasao (>0.1% cortado): {com_invasao}/{len(alvos)}")
    if com_invasao > 0:
        print(f"Area media cortada das com invasao    : {total_cortado/com_invasao:.2f}%")
    print(f"Vertices agudos (<30 graus) removidos : {total_agudos}")
    print(f"Vertices colineares (>178 graus)      : {total_colin}")


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
            municipio_id, distrito_cd = r.mid, args.distrito
            print(f"Escopo: {r.nm_dist}")
        else:
            r = conn.execute(text("""
                SELECT id AS mid, nome FROM municipios WHERE codigo_ibge = :c
            """), {"c": args.municipio.zfill(7)}).fetchone()
            if not r: print("nao encontrado"); return
            municipio_id, distrito_cd = r.mid, None
            print(f"Escopo: {r.nome}")

    processar(municipio_id, distrito_cd)

    # Governanca Wave 1: audit obrigatorio em toda escrita de geometria.
    print("\n[audit] versionando microzonas que mudaram geometricamente...")
    from importlib import import_module
    etl23 = import_module("23_limpeza_microregioes")
    with engine.begin() as conn:
        etl23._atualizar_hash_e_audit(conn, municipio_id, distrito_cd,
                                      "etl_32_poda")

    print(f"\nFIM. {time.time() - inicio:.0f}s\n")


if __name__ == "__main__":
    main()
