"""Funde microzonas adjacentes com mesmo nome base.

Apos subdividir, o mesmo bairro pode virar N microzonas adjacentes quando
aparece em multiplas locais de votacao. Este script detecta e funde.

Nome base = nome sem sufixo numerico final ("Morro Grande 2" -> "Morro Grande").

Respeita Wave 1: so opera em voronoi_v2/plus_manual nao-congelada nao-final.
"""
from __future__ import annotations
import argparse, re, sys, time, unicodedata
from pathlib import Path
from sqlalchemy import text
sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


def nome_base(nome: str) -> str:
    s = re.sub(r"\s+\d+$", "", (nome or "").strip().lower())
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s).strip()


def merge_distrito(cd_dist: str) -> dict:
    stats = {"grupos_processados": 0, "microzonas_fundidas": 0}
    with engine.connect() as conn:
        microzonas = conn.execute(text("""
            SELECT id, nome, ST_Area(geometry::geography) AS area
            FROM microregioes
            WHERE distrito_cd = :cd
              AND origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND congelada_em IS NULL
              AND calibrada_final = FALSE
        """), {"cd": cd_dist}).fetchall()

    # Agrupa por nome_base
    grupos = {}
    for mr in microzonas:
        nb = nome_base(mr.nome)
        if nb: grupos.setdefault(nb, []).append(mr)

    for nb, grupo in grupos.items():
        if len(grupo) < 2:
            continue

        # Monta componentes conexos (adjacentes via ST_DWithin < 2m)
        ids = [m.id for m in grupo]
        with engine.connect() as conn:
            pares = conn.execute(text(f"""
                SELECT a.id AS a_id, b.id AS b_id
                FROM microregioes a, microregioes b
                WHERE a.id = ANY(:ids) AND b.id = ANY(:ids) AND a.id < b.id
                  AND ST_DWithin(a.geometry::geography, b.geometry::geography, 20)
            """), {"ids": ids}).fetchall()

        if not pares:
            continue

        # Union-Find pra achar componentes conexos
        parent = {i: i for i in ids}
        def find(x):
            while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]
            return x
        def union(a,b): parent[find(a)] = find(b)
        for p in pares: union(p.a_id, p.b_id)

        componentes = {}
        for i in ids: componentes.setdefault(find(i), []).append(i)

        # Pra cada componente >= 2: funde
        for root, ids_comp in componentes.items():
            if len(ids_comp) < 2:
                continue
            stats["grupos_processados"] += 1
            with engine.begin() as conn:
                # Destino: microzona com MAIOR area
                destino_id = max(ids_comp, key=lambda i: next(m.area for m in grupo if m.id == i))
                outros = [i for i in ids_comp if i != destino_id]

                # Reatribuir setores
                conn.execute(text("UPDATE setores_censitarios SET microregiao_id = :dest WHERE microregiao_id = ANY(:outros)"),
                             {"dest": destino_id, "outros": outros})

                # Union geometry
                conn.execute(text(f"""
                    UPDATE microregioes dst SET
                        geometry = (
                            SELECT ST_Multi(ST_SetSRID(ST_MakeValid(ST_Union(geometry)), 4674))
                            FROM microregioes WHERE id = ANY(:all_ids)
                        ),
                        nome = regexp_replace(nome, ' \\d+$', ''),
                        area_km2 = (
                            SELECT ROUND((ST_Area(ST_Union(geometry)::geography)/1000000.0)::numeric, 3)
                            FROM microregioes WHERE id = ANY(:all_ids)
                        )
                    WHERE dst.id = :dest
                """), {"all_ids": ids_comp, "dest": destino_id})

                # DELETE outros
                conn.execute(text("DELETE FROM microregioes WHERE id = ANY(:outros)"), {"outros": outros})
                stats["microzonas_fundidas"] += len(outros)
    return stats


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--distrito", required=True)
    a = p.parse_args()
    inicio = time.time()
    s = merge_distrito(a.distrito)
    print(f"  grupos: {s['grupos_processados']}")
    print(f"  fundidas: {s['microzonas_fundidas']}")
    print(f"FIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
