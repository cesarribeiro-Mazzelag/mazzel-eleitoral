"""ETL: Recupera microregioes canonicas OSM que foram perdidas no ETL 14.

Problema: Piqueri/Jardim Iris/Taipas sao OSM Points. No matching
"OSM mais proximo do centroide do setor", varios setores acabaram
absorvidos por outros OSMs maiores (ou fallback). Resultado: nomes
reconhecidos da cidade ficam de fora do mapa.

Solucao: para cada OSM suburb SEM microregiao correspondente:
  1. Buscar ate 15 setores proximos (ST_DWithin 1500m) que estao em
     microregioes "secundarias" (split_kmeans, Região X, distrito_fallback)
  2. Roubar esses setores e criar microregiao canonica nova
  3. Atualizar geometrias das microregioes doadoras (ST_Difference)
  4. Deletar doadoras se ficarem sem setores

Criterios de doadora valida:
  - origem in (split_kmeans, distrito_fallback) OU
  - nome comeca com "Região " / "Área sem nome"

Criterios proibidos (NAO roubar):
  - origem = 'osm' (match polygon direto, canonica)
  - origem = 'osm_proxim' com nome OSM suburb ja registrado

Uso:
    python3 18_recuperar_canonicos.py --municipio 3550308
"""
from __future__ import annotations
import argparse
import re
import sys
import time
import unicodedata
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine

RAIO_DWITHIN_M = 1500      # raio de busca de setores candidatos
MAX_SETORES_ROUBO = 15     # teto de setores por canonico recuperado
MIN_SETORES_CANONICO = 3   # relaxa minimo pra preservar nome

TIPOS_OSM_CANONICOS = ("suburb", "neighbourhood")


def normalizar(s: str) -> str:
    if not s:
        return ""
    n = unicodedata.normalize("NFKD", s)
    n = "".join(c for c in n if not unicodedata.combining(c))
    n = re.sub(r"[^a-zA-Z0-9 ]+", " ", n).strip()
    n = re.sub(r"\s+", " ", n).title()
    return n


def processar_municipio(municipio_id: int, codigo_ibge: str, nome_mun: str):
    print(f"\n[{nome_mun} / {codigo_ibge}]")
    cd_mun = codigo_ibge.zfill(7)

    with engine.begin() as conn:
        # Lista OSM suburb/neighbourhood que NAO tem microregiao canonica
        # (isto e, nao ha microregiao cujo nome bate com nome OSM no municipio)
        osms = conn.execute(text(f"""
            SELECT bo.id AS osm_id, bo.nome, bo.tipo,
                   ST_X(bo.geometry) AS lng,
                   ST_Y(bo.geometry) AS lat,
                   ST_GeometryType(bo.geometry) AS tipo_geom
            FROM bairros_osm bo
            WHERE bo.municipio_id = {municipio_id}
              AND bo.tipo IN {TIPOS_OSM_CANONICOS}
              AND ST_GeometryType(bo.geometry) = 'ST_Point'
              AND NOT EXISTS (
                  SELECT 1 FROM microregioes mr
                  WHERE mr.municipio_id = {municipio_id}
                    AND lower(unaccent(mr.nome)) = lower(unaccent(bo.nome))
              )
            ORDER BY bo.nome
        """)).fetchall()

        print(f"      {len(osms)} OSM canonicos sem microregiao correspondente")

        n_recuperadas = 0
        n_sem_setores = 0
        for o in osms:
            # Busca setores proximos do ponto OSM dentro do municipio,
            # que estao em microregioes "secundarias" (doaveis)
            candidatos = conn.execute(text(f"""
                SELECT sc.codigo_setor, sc.microregiao_id,
                       mr.nome AS mr_nome, mr.origem, mr.n_setores,
                       ST_Distance(
                           ST_SetSRID(ST_MakePoint({o.lng}, {o.lat}), 4326)::geography,
                           ST_Centroid(sc.geometry)::geography
                       ) AS dist_m
                FROM setores_censitarios sc
                JOIN microregioes mr ON mr.id = sc.microregiao_id
                WHERE sc.codigo_municipio = '{cd_mun}'
                  AND ST_DWithin(
                      ST_SetSRID(ST_MakePoint({o.lng}, {o.lat}), 4326)::geography,
                      ST_Centroid(sc.geometry)::geography,
                      {RAIO_DWITHIN_M}
                  )
                  -- doavel: origem secundaria
                  AND (
                      mr.origem IN ('split_kmeans', 'distrito_fallback')
                      OR mr.origem LIKE 'distrito_fallback%'
                      OR mr.nome LIKE 'Região %'
                      OR mr.nome LIKE 'Área sem nome%'
                  )
                ORDER BY dist_m ASC
                LIMIT {MAX_SETORES_ROUBO}
            """)).fetchall()

            if len(candidatos) < MIN_SETORES_CANONICO:
                n_sem_setores += 1
                continue

            # Cria microregiao nova com os setores
            codigos = "','".join(c.codigo_setor for c in candidatos)
            novo_nome = o.nome
            novo_pad = f"{normalizar(novo_nome)}-osm{o.osm_id}"

            novo_id = conn.execute(text(f"""
                INSERT INTO microregioes (
                    nome, nome_padronizado, nivel, municipio_id, distrito_cd,
                    geometry, area_km2, n_setores, populacao, osm_ref_id, origem
                )
                SELECT :nome, :pad, 5, {municipio_id}, NULL,
                       ST_Multi(ST_SetSRID(ST_Union(sc.geometry), 4674)),
                       ROUND((SUM(ST_Area(sc.geometry::geography)) / 1000000.0)::numeric, 3),
                       COUNT(*),
                       SUM(sc.populacao)::int,
                       {o.osm_id},
                       'osm_recuperado'
                FROM setores_censitarios sc
                WHERE sc.codigo_setor IN ('{codigos}')
                ON CONFLICT (municipio_id, nome_padronizado) DO UPDATE
                  SET n_setores = EXCLUDED.n_setores,
                      geometry = EXCLUDED.geometry,
                      osm_ref_id = EXCLUDED.osm_ref_id,
                      origem = EXCLUDED.origem
                RETURNING id
            """), {"nome": novo_nome, "pad": novo_pad}).fetchone()

            # Move setores pra nova microregiao
            doadoras = set(c.microregiao_id for c in candidatos)
            conn.execute(text(
                f"UPDATE setores_censitarios SET microregiao_id = {novo_id.id} "
                f"WHERE codigo_setor IN ('{codigos}')"
            ))

            # Atualiza geometria/n_setores das doadoras
            for did in doadoras:
                if did == novo_id.id:
                    continue
                stats = conn.execute(text(f"""
                    SELECT COUNT(*) AS n,
                           COALESCE(ST_Multi(ST_SetSRID(ST_Union(geometry), 4674)), NULL) AS g,
                           SUM(populacao)::int AS pop,
                           ROUND((SUM(ST_Area(geometry::geography)) / 1000000.0)::numeric, 3) AS km2
                    FROM setores_censitarios
                    WHERE microregiao_id = {did}
                """)).fetchone()
                if stats.n == 0:
                    conn.execute(text(f"DELETE FROM microregioes WHERE id = {did}"))
                else:
                    conn.execute(text(f"""
                        UPDATE microregioes SET
                          n_setores = {stats.n},
                          geometry = '{stats.g}'::geometry,
                          populacao = {stats.pop or 0},
                          area_km2 = {stats.km2}
                        WHERE id = {did}
                    """))
            n_recuperadas += 1

        print(f"      {n_recuperadas} canonicos recuperados · {n_sem_setores} sem setores doaveis suficientes")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipio", required=True)
    args = parser.parse_args()

    inicio = time.time()
    with engine.connect() as conn:
        # Garante extensao unaccent
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))
        conn.commit()
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
