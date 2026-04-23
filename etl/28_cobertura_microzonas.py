"""ETL 28: Popular cobertura eleitoral das microzonas.

Reflexao Cesar + GPT 13/04/2026:
    Microzona eh territorio. Escola eh ponto de apuracao.
    Toda microzona TEM cobertura (direta ou estimada).
    Nunca deve aparecer como "sem dado".

Logica de vinculacao:

CASO 1 - microzona TEM escola(s) interna(s):
    Todas as escolas internas entram com peso igualitario (1/N).
    tipo_cobertura = 'interna'

CASO 2 - microzona SEM escola interna:
    Selecionar as 3 escolas mais plausiveis do MESMO DISTRITO PAI.
    Ranking:
        - Escolas em microzonas ADJACENTES primeiro (ST_Touches)
        - Depois, escolas em microzonas nao-adjacentes, ordenadas por
          distancia do centroide da microzona-alvo ao ponto da escola
    Peso = 1 / (distancia_m + 100)^2 normalizado pra somar 1.0
    tipo_cobertura = 'vizinha_estimativa' (<= 3km)
                  OU 'vizinha_distante'   (> 3km - suspeita)

Hard filter: escolas candidatas DEVEM estar no mesmo distrito pai
(barreira administrativa - evita vincular escola de Osasco a microzona
de Pirituba, por exemplo).

Uso:
    python3 28_cobertura_microzonas.py --distrito 355030863   # piloto
    python3 28_cobertura_microzonas.py --municipio 3550308    # cidade
"""
from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


# Parametros
TOP_N_ESCOLAS_VIZINHAS = 3
OFFSET_PESO_M = 100.0          # evita divisao por zero e suaviza picos
DISTANCIA_SUSPEITA_M = 3000.0  # >3km marca como "distante"


def popular_cobertura(municipio_id: int, distrito_cd: str | None) -> dict:
    """
    Popula microregiao_escola_cobertura para todas microzonas nao-congeladas
    do escopo. Limpa entradas antigas e reescreve (operacao idempotente).

    Retorna stats.
    """
    filtro_dist = (
        f"AND mr.distrito_cd = '{distrito_cd}'" if distrito_cd
        else "AND mr.distrito_cd IS NOT NULL"
    )

    with engine.begin() as conn:
        # 1. Limpar entradas antigas das microzonas em escopo (so as NAO congeladas).
        conn.execute(text(f"""
            DELETE FROM microregiao_escola_cobertura
            WHERE microregiao_id IN (
                SELECT id FROM microregioes mr
                WHERE mr.municipio_id = :mid {filtro_dist}
                  AND mr.origem = 'voronoi_v2'
                  AND mr.congelada_em IS NULL
            )
        """), {"mid": municipio_id})

        # 2. CASO 1 - microzonas COM escola interna: peso igualitario entre elas.
        # Poderia usar simples `lv.microregiao_id = mr.id` (vinculo ja existe
        # via ETL 24). Peso = 1 / N.
        r_internas = conn.execute(text(f"""
            INSERT INTO microregiao_escola_cobertura
                (microregiao_id, local_votacao_id, peso, distancia_m, tipo_cobertura)
            SELECT
                mr.id AS microregiao_id,
                lv.id AS local_votacao_id,
                1.0 / COUNT(*) OVER (PARTITION BY mr.id) AS peso,
                0.0 AS distancia_m,
                'interna' AS tipo_cobertura
            FROM microregioes mr
            JOIN locais_votacao lv ON lv.microregiao_id = mr.id
            WHERE mr.municipio_id = :mid {filtro_dist}
              AND mr.origem = 'voronoi_v2'
              AND mr.congelada_em IS NULL
            RETURNING microregiao_id
        """), {"mid": municipio_id}).fetchall()

        # 3. CASO 2 - microzonas SEM escola interna. Precisa buscar vizinhas.
        orfas = conn.execute(text(f"""
            SELECT mr.id, mr.nome, mr.distrito_cd, mr.municipio_id
            FROM microregioes mr
            LEFT JOIN locais_votacao lv ON lv.microregiao_id = mr.id
            WHERE mr.municipio_id = :mid {filtro_dist}
              AND mr.origem = 'voronoi_v2'
              AND mr.congelada_em IS NULL
            GROUP BY mr.id, mr.nome, mr.distrito_cd, mr.municipio_id
            HAVING COUNT(lv.id) = 0
        """), {"mid": municipio_id}).fetchall()

        n_orfas_processadas = 0
        n_links_vizinhas = 0

        for orfa in orfas:
            # Pega centroide + candidatas numa query so. Microregioes estao em SRID
            # 4674, escolas em 4326. ST_Transform na fly. Distancia em metros via
            # ::geography.
            candidatas = conn.execute(text(f"""
                WITH origem AS (
                    SELECT ST_Transform(ST_Centroid(geometry), 4326) AS centroide
                    FROM microregioes WHERE id = :orfa_id
                ),
                adjacencia AS (
                    SELECT mr_vizinha.id AS mid_vizinha
                    FROM microregioes mr_vizinha, microregioes mr_orfa
                    WHERE mr_orfa.id = :orfa_id
                      AND mr_vizinha.municipio_id = :mid
                      AND mr_vizinha.distrito_cd = :dist
                      AND mr_vizinha.id != :orfa_id
                      AND ST_Touches(mr_vizinha.geometry, mr_orfa.geometry)
                )
                SELECT
                    lv.id AS lv_id,
                    ST_Distance(
                        (SELECT centroide FROM origem)::geography,
                        ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326)::geography
                    ) AS dist_m,
                    CASE WHEN lv.microregiao_id IN (SELECT mid_vizinha FROM adjacencia) THEN 0 ELSE 1 END AS adj_flag
                FROM locais_votacao lv
                WHERE lv.municipio_id = :mid
                  AND lv.latitude IS NOT NULL
                  AND lv.microregiao_id IS NOT NULL
                  AND lv.microregiao_id IN (
                      SELECT id FROM microregioes
                      WHERE distrito_cd = :dist AND municipio_id = :mid
                  )
                ORDER BY adj_flag ASC, dist_m ASC
                LIMIT :topn
            """), {
                "mid": municipio_id,
                "dist": orfa.distrito_cd,
                "orfa_id": orfa.id,
                "topn": TOP_N_ESCOLAS_VIZINHAS,
            }).fetchall()

            if not candidatas:
                continue

            # Calcular pesos com fonte: 1 / (d + offset)^2, normalizado.
            pesos_brutos = [1.0 / ((c.dist_m + OFFSET_PESO_M) ** 2) for c in candidatas]
            soma = sum(pesos_brutos)
            pesos_norm = [p / soma for p in pesos_brutos]

            for c, peso in zip(candidatas, pesos_norm):
                tipo = (
                    "vizinha_distante"
                    if c.dist_m > DISTANCIA_SUSPEITA_M
                    else "vizinha_estimativa"
                )
                conn.execute(text("""
                    INSERT INTO microregiao_escola_cobertura
                        (microregiao_id, local_votacao_id, peso, distancia_m, tipo_cobertura)
                    VALUES (:mid, :lv, :peso, :dist, :tipo)
                """), {
                    "mid": orfa.id,
                    "lv": c.lv_id,
                    "peso": peso,
                    "dist": float(c.dist_m),
                    "tipo": tipo,
                })
                n_links_vizinhas += 1

            n_orfas_processadas += 1

        # 4. Atualizar cache em microregioes (tipo_cobertura_dominante + n_escolas_cobertura)
        conn.execute(text(f"""
            WITH agg AS (
                SELECT c.microregiao_id AS mid,
                       COUNT(*) AS n,
                       MODE() WITHIN GROUP (ORDER BY c.tipo_cobertura) AS tipo_dom
                FROM microregiao_escola_cobertura c
                JOIN microregioes mr ON mr.id = c.microregiao_id
                WHERE mr.municipio_id = :mid {filtro_dist}
                  AND mr.origem = 'voronoi_v2'
                  AND mr.congelada_em IS NULL
                GROUP BY c.microregiao_id
            )
            UPDATE microregioes mr SET
                tipo_cobertura_dominante = agg.tipo_dom,
                n_escolas_cobertura = agg.n
            FROM agg WHERE mr.id = agg.mid
        """), {"mid": municipio_id})

        # Zera as que nao tem NENHUMA cobertura (caso raro - distrito sem
        # nenhuma escola). Evita valor defasado.
        conn.execute(text(f"""
            UPDATE microregioes mr SET
                tipo_cobertura_dominante = NULL,
                n_escolas_cobertura = 0
            WHERE mr.municipio_id = :mid {filtro_dist}
              AND mr.origem = 'voronoi_v2'
              AND mr.congelada_em IS NULL
              AND NOT EXISTS (
                  SELECT 1 FROM microregiao_escola_cobertura c
                  WHERE c.microregiao_id = mr.id
              )
        """), {"mid": municipio_id})

        # 5. Stats
        stats_row = conn.execute(text(f"""
            SELECT
              COUNT(*) FILTER (WHERE tipo_cobertura_dominante = 'interna') AS com_interna,
              COUNT(*) FILTER (WHERE tipo_cobertura_dominante = 'vizinha_estimativa') AS estimativa,
              COUNT(*) FILTER (WHERE tipo_cobertura_dominante = 'vizinha_distante') AS distante,
              COUNT(*) FILTER (WHERE tipo_cobertura_dominante IS NULL) AS sem_cobertura,
              COUNT(*) AS total
            FROM microregioes mr
            WHERE mr.municipio_id = :mid {filtro_dist}
              AND mr.origem = 'voronoi_v2'
              AND mr.congelada_em IS NULL
        """), {"mid": municipio_id}).fetchone()

    return {
        "microzonas_internas": len(set(r.microregiao_id for r in r_internas)),
        "orfas_processadas": n_orfas_processadas,
        "links_vizinhas_criados": n_links_vizinhas,
        "total_com_interna": stats_row.com_interna,
        "total_estimativa": stats_row.estimativa,
        "total_distante": stats_row.distante,
        "total_sem_cobertura": stats_row.sem_cobertura,
        "total_microzonas": stats_row.total,
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

    print(f"\n[ETL 28] populando cobertura eleitoral...")
    print(f"  top escolas vizinhas : {TOP_N_ESCOLAS_VIZINHAS}")
    print(f"  peso fn              : 1 / (d + {OFFSET_PESO_M:.0f})^2  (normalizado)")
    print(f"  marca 'distante' se  : d > {DISTANCIA_SUSPEITA_M:.0f}m\n")

    stats = popular_cobertura(municipio_id, distrito_cd)

    print(f"  microzonas com escola interna : {stats['microzonas_internas']}")
    print(f"  orfas processadas             : {stats['orfas_processadas']}")
    print(f"  links vizinhas criados        : {stats['links_vizinhas_criados']}")
    print(f"\n  tipo dominante por microzona:")
    print(f"    interna            : {stats['total_com_interna']}")
    print(f"    vizinha_estimativa : {stats['total_estimativa']}")
    print(f"    vizinha_distante   : {stats['total_distante']}")
    print(f"    SEM cobertura      : {stats['total_sem_cobertura']}")
    print(f"    total              : {stats['total_microzonas']}")

    print(f"\nFIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
