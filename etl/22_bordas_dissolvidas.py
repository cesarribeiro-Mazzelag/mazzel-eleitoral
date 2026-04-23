"""ETL: Popula microregioes_bordas via ST_LineMerge(ST_Union(ST_Boundary)).

Elimina duplicacao visual de linhas compartilhadas entre microregioes
vizinhas. Cada borda compartilhada vira UMA linha (nao 2).

Uso:
    python3 22_bordas_dissolvidas.py --municipio 3550308
    python3 22_bordas_dissolvidas.py --municipio 3550308 --distrito 355030863
"""
from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


def processar(municipio_id: int, codigo_ibge: str, nome_mun: str, distrito_cd: str | None = None):
    print(f"\n[{nome_mun} / {codigo_ibge}{' / dist=' + distrito_cd if distrito_cd else ''}]")
    cd_mun = codigo_ibge.zfill(7)

    with engine.begin() as conn:
        # Limpa bordas anteriores do escopo
        if distrito_cd:
            conn.execute(text(f"""
                DELETE FROM microregioes_bordas
                WHERE municipio_id = {municipio_id} AND distrito_cd = '{distrito_cd}'
            """))
        else:
            conn.execute(text(f"DELETE FROM microregioes_bordas WHERE municipio_id = {municipio_id}"))

        # ST_Boundary -> ST_Union -> ST_LineMerge para dissolver linhas
        # compartilhadas em uma so. Resultado: MultiLineString com bordas
        # unicas que separam todas as microregioes do escopo.
        if distrito_cd:
            sql_insert = f"""
                INSERT INTO microregioes_bordas (municipio_id, distrito_cd, geometry, n_segmentos)
                SELECT {municipio_id}, '{distrito_cd}',
                       ST_Multi(ST_LineMerge(ST_SnapToGrid(ST_Union(ST_SnapToGrid(ST_Boundary(geometry), 0.000001)), 0.000001))),
                       COUNT(*)
                FROM microregioes
                WHERE municipio_id = {municipio_id}
                  AND distrito_cd = '{distrito_cd}'
            """
        else:
            sql_insert = f"""
                INSERT INTO microregioes_bordas (municipio_id, distrito_cd, geometry, n_segmentos)
                SELECT {municipio_id}, NULL,
                       ST_Multi(ST_LineMerge(ST_SnapToGrid(ST_Union(ST_SnapToGrid(ST_Boundary(geometry), 0.000001)), 0.000001))),
                       COUNT(*)
                FROM microregioes
                WHERE municipio_id = {municipio_id}
            """

        conn.execute(text(sql_insert))

        # Stats
        row = conn.execute(text(f"""
            SELECT n_segmentos, ST_NumGeometries(geometry) AS n_lines
            FROM microregioes_bordas
            WHERE municipio_id = {municipio_id}
              {f"AND distrito_cd = '{distrito_cd}'" if distrito_cd else ""}
            ORDER BY id DESC LIMIT 1
        """)).fetchone()
        if row:
            print(f"      {row.n_segmentos} microregioes -> {row.n_lines} linhas dissolvidas")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipio", required=True)
    parser.add_argument("--distrito", help="cd_dist (opcional, processa so 1 distrito)")
    parser.add_argument("--por-distrito", action="store_true",
                        help="Gera 1 linha de bordas por distrito do municipio (em vez de uma global)")
    args = parser.parse_args()

    inicio = time.time()
    with engine.connect() as conn:
        r = conn.execute(text(
            "SELECT id, codigo_ibge, nome FROM municipios WHERE codigo_ibge = :c"
        ), {"c": args.municipio.zfill(7)}).fetchone()
        if not r:
            print(f"municipio {args.municipio} nao encontrado")
            return
        municipio_id, codigo_ibge, nome_mun = r.id, r.codigo_ibge, r.nome

        if args.distrito:
            distritos = [args.distrito]
        elif args.por_distrito:
            rs = conn.execute(text(
                "SELECT cd_dist FROM distritos_municipio WHERE cd_mun = :c ORDER BY cd_dist"
            ), {"c": codigo_ibge.zfill(7)})
            distritos = [r.cd_dist for r in rs]
        else:
            distritos = [None]  # bordas globais do municipio

    print(f"processando {len(distritos)} escopo(s)...")
    for d in distritos:
        try:
            processar(municipio_id, codigo_ibge, nome_mun, d)
        except Exception as e:
            print(f"  ERRO em {d}: {e}")

    print(f"\nFIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
