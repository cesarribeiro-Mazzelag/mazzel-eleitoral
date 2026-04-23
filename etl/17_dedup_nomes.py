"""ETL: Dedup de nomes duplicados em microregioes.

Apos 14/16/18, ainda existem grupos de microregioes com mesmo nome
(ex: 11 "Jaraguá", 14 "Itaim Paulista"). Causa: varios clusters do
k-means convergiram pro mesmo bairro CEP.

Estrategia: adicionar sufixo cardinal (Norte/Sul/Leste/Oeste/Centro)
a cada uma baseado no centroide vs centroide do grupo. Se colidir
(4 no Norte), numera com "Norte 2", "Norte 3", etc.

Nao toca em `nome_padronizado` (ja eh unico via sufixo id).

Uso:
    python3 17_dedup_nomes.py --municipio 3550308
"""
from __future__ import annotations
import argparse
import sys
import time
from collections import defaultdict
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


def cardinal(d_lat: float, d_lng: float) -> str:
    if abs(d_lng) < 0.003 and abs(d_lat) < 0.003:
        return "Centro"
    if abs(d_lat) > abs(d_lng):
        return "Norte" if d_lat > 0 else "Sul"
    return "Leste" if d_lng > 0 else "Oeste"


def processar_municipio(municipio_id: int, codigo_ibge: str, nome_mun: str):
    print(f"\n[{nome_mun} / {codigo_ibge}]")
    with engine.begin() as conn:
        # Lista grupos com nome duplicado
        grupos = conn.execute(text(f"""
            SELECT nome, COUNT(*) AS n
            FROM microregioes
            WHERE municipio_id = {municipio_id}
            GROUP BY nome
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
        """)).fetchall()

        print(f"      {len(grupos)} grupos de nome duplicado")
        total_renomeadas = 0

        for g in grupos:
            # Pega as microregioes do grupo + centroides
            micros = conn.execute(text(f"""
                SELECT id, nome,
                       ST_Y(ST_Centroid(geometry)) AS lat,
                       ST_X(ST_Centroid(geometry)) AS lng
                FROM microregioes
                WHERE municipio_id = {municipio_id} AND nome = :nome
                ORDER BY id
            """), {"nome": g.nome}).fetchall()

            # Centroide do grupo (media)
            avg_lat = sum(float(m.lat) for m in micros) / len(micros)
            avg_lng = sum(float(m.lng) for m in micros) / len(micros)

            # Distribui por cardinal; se colide, numera
            por_cardinal: dict[str, list[int]] = defaultdict(list)
            for m in micros:
                d = cardinal(float(m.lat) - avg_lat, float(m.lng) - avg_lng)
                por_cardinal[d].append(m.id)

            for direcao, ids in por_cardinal.items():
                for i, mid in enumerate(ids):
                    sufixo = direcao if i == 0 else f"{direcao} {i+1}"
                    novo_nome = f"{g.nome} {sufixo}"
                    conn.execute(text(
                        "UPDATE microregioes SET nome = :n WHERE id = :id"
                    ), {"n": novo_nome, "id": mid})
                    total_renomeadas += 1

        print(f"      {total_renomeadas} microregioes renomeadas com sufixo cardinal")

        # Auditoria pos-dedup
        restantes = conn.execute(text(f"""
            SELECT COUNT(*) AS n FROM (
                SELECT nome FROM microregioes
                WHERE municipio_id = {municipio_id}
                GROUP BY nome HAVING COUNT(*) > 1
            ) t
        """)).fetchone().n
        print(f"      grupos duplicados remanescentes: {restantes}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipio", required=True)
    args = parser.parse_args()

    inicio = time.time()
    with engine.connect() as conn:
        r = conn.execute(text(
            "SELECT id, codigo_ibge, nome FROM municipios WHERE codigo_ibge = :c"
        ), {"c": args.municipio.zfill(7)}).fetchone()
        if not r:
            print(f"Municipio nao encontrado: {args.municipio}")
            return

    processar_municipio(r.id, r.codigo_ibge, r.nome)
    print(f"\nFIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
