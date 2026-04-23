"""ETL 24: Vincular escolas (locais_votacao) as microzonas.

Regra primaria: ST_Within(ST_MakePoint(lng, lat), microzona.geometry).
Fallback: escola em borda (ST_Within falha por precisao float) -> pega
microzona mais proxima (ST_Distance) dentro do distrito correto.

Microzonas congeladas sao respeitadas: vinculos existentes que apontam
pra microzona congelada nao mudam, ainda que o recalculo sugira outra.

Uso:
    python3 24_vincular_escolas.py --distrito 355030863   # piloto
    python3 24_vincular_escolas.py --municipio 3550308    # cidade

Plano aprovado (Claude + GPT + Cesar) em 13/04/2026.
"""
from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


def vincular(municipio_id: int, distrito_cd: str | None) -> dict:
    """
    Escopo = escolas do municipio. Se distrito_cd passado, limita as
    escolas cujo ponto cai dentro do poligono do distrito (pra nao tentar
    vincular escola de outro distrito).
    """
    filtro_dist_escola = ""
    if distrito_cd:
        filtro_dist_escola = f"""
            AND ST_Within(
                ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326),
                ST_Transform(
                    (SELECT geometry FROM distritos_municipio WHERE cd_dist = '{distrito_cd}'),
                    4326
                )
            )
        """

    filtro_dist_mr = (
        f"AND mr.distrito_cd = '{distrito_cd}'" if distrito_cd
        else "AND mr.distrito_cd IS NOT NULL"
    )

    with engine.begin() as conn:
        # Passo 1: ST_Within - 99% dos casos.
        # Escolas ja vinculadas a microzona CONGELADA sao preservadas.
        r1 = conn.execute(text(f"""
            WITH candidatas AS (
                SELECT lv.id AS lv_id, mr.id AS mr_id
                FROM locais_votacao lv
                JOIN microregioes mr ON mr.municipio_id = lv.municipio_id
                WHERE lv.municipio_id = {municipio_id}
                  AND lv.latitude IS NOT NULL
                  AND mr.origem = 'voronoi_v2'
                  {filtro_dist_mr}
                  {filtro_dist_escola}
                  AND ST_Within(
                    ST_Transform(
                      ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326),
                      4674
                    ),
                    mr.geometry
                  )
            )
            UPDATE locais_votacao lv SET microregiao_id = c.mr_id
            FROM candidatas c
            WHERE lv.id = c.lv_id
              AND (
                -- Se ja esta vinculado a microzona congelada, preserva.
                NOT EXISTS (
                    SELECT 1 FROM microregioes mr2
                    WHERE mr2.id = lv.microregiao_id
                      AND mr2.congelada_em IS NOT NULL
                )
              )
            RETURNING lv.id
        """)).fetchall()

        # Passo 2: fallback ST_Distance - escolas sem vinculo apos passo 1.
        # Acontece quando a escola esta fora de TODAS as microzonas por precisao
        # de borda, ou quando a cobertura espacial tem gaps.
        r2 = conn.execute(text(f"""
            WITH orfas AS (
                SELECT lv.id AS lv_id,
                       ST_Transform(
                         ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326),
                         4674
                       ) AS ponto
                FROM locais_votacao lv
                WHERE lv.municipio_id = {municipio_id}
                  AND lv.latitude IS NOT NULL
                  AND lv.microregiao_id IS NULL
                  {filtro_dist_escola.replace("lv.longitude", "lv.longitude").replace("lv.latitude", "lv.latitude")}
            ),
            melhor AS (
                SELECT o.lv_id,
                       (
                         SELECT mr.id FROM microregioes mr
                         WHERE mr.municipio_id = {municipio_id}
                           AND mr.origem = 'voronoi_v2'
                           {filtro_dist_mr}
                         ORDER BY ST_Distance(mr.geometry, o.ponto) ASC
                         LIMIT 1
                       ) AS mr_id
                FROM orfas o
            )
            UPDATE locais_votacao lv SET microregiao_id = m.mr_id
            FROM melhor m
            WHERE lv.id = m.lv_id
              AND m.mr_id IS NOT NULL
            RETURNING lv.id
        """)).fetchall()

        # Relatorio
        stats = conn.execute(text(f"""
            SELECT
                COUNT(*) FILTER (WHERE lv.microregiao_id IS NOT NULL) AS vinculadas,
                COUNT(*) FILTER (WHERE lv.microregiao_id IS NULL) AS orfas_final,
                COUNT(*) AS total
            FROM locais_votacao lv
            WHERE lv.municipio_id = {municipio_id}
              AND lv.latitude IS NOT NULL
              {filtro_dist_escola}
        """)).fetchone()

    return {
        "pela_within": len(r1),
        "pelo_fallback": len(r2),
        "vinculadas_total": stats.vinculadas,
        "orfas": stats.orfas_final,
        "total": stats.total,
    }


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

    stats = vincular(municipio_id, distrito_cd)

    print("\n[resultado]")
    print(f"  total escolas no escopo      : {stats['total']}")
    print(f"  vinculadas por ST_Within     : {stats['pela_within']}")
    print(f"  vinculadas por fallback dist : {stats['pelo_fallback']}")
    print(f"  vinculadas (total)           : {stats['vinculadas_total']}")
    print(f"  orfas (sem microzona)        : {stats['orfas']}")
    print(f"\nFIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
