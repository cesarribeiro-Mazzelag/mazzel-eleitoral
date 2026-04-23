"""
ETL 46: constroi polygon de microbairros por AGREGACAO CENSITARIA.

Ideia: pra cada bairro popular (nome nos CEPs dos Correios), agrupa os
setores censitarios IBGE que contem esses CEPs. ST_Union produz polygon
organico real (nao Voronoi artificial).

Fluxo por cidade:
  1. SELECT DISTINCT bairro FROM ceps WHERE cidade = X
  2. Para cada bairro:
     - Pegar setores_censitarios via codigo_setor dos CEPs
     - ST_Union dos polygons
     - Suavizar com ST_ChaikinSmoothing
     - Calcular area + contagem setores
  3. UPDATE microbairros SET polygon_censitario = ... WHERE nome_norm match
     OU INSERT novo microbairro quando nao existe

Idempotente. Rodar varias vezes = resultado igual.
"""
from __future__ import annotations
import sys
import unicodedata
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from sqlalchemy import text
from db import get_session, test_connection


# Ordem de prioridade das cidades a processar (SP primeiro, depois capitais)
CIDADES_PRIORIDADE = [
    ("São Paulo", "SP"),
    ("Rio de Janeiro", "RJ"),
    ("Belo Horizonte", "MG"),
    ("Brasilia", "DF"),
    ("Salvador", "BA"),
    ("Fortaleza", "CE"),
    ("Curitiba", "PR"),
    ("Porto Alegre", "RS"),
]

# Filtros de qualidade
MIN_SETORES = 3     # ignora bairro com < 3 setores (ruido CNEFE)
MAX_AREA_KM2 = 80   # ignora resultado acima de 80km2 (provavelmente distrito inteiro)


def _norm(s: str) -> str:
    if not s: return ""
    nfd = unicodedata.normalize("NFD", s.upper())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn").strip()


def processar_cidade(session, cidade: str, uf: str) -> tuple[int, int, int]:
    """Retorna (novos_bairros, atualizados, ignorados)."""
    print(f"\n[{cidade}/{uf}] buscando bairros distintos...")

    # Municipio_id
    mun_row = session.execute(text("""
        SELECT id FROM municipios WHERE UPPER(nome) = UPPER(:nome) AND estado_uf = :uf LIMIT 1
    """), {"nome": cidade, "uf": uf}).fetchone()
    municipio_id = mun_row[0] if mun_row else None
    if not municipio_id:
        print(f"  [erro] municipio {cidade}/{uf} nao encontrado")
        return 0, 0, 0

    # Agregar setores por bairro (fazer em uma query SQL + PostGIS pra performance)
    # Usa UPPER + TRANSLATE pra normalizar acentos em PG (aproxima _norm python)
    print(f"  processando via PostGIS (ST_Union + ST_ChaikinSmoothing)...")
    result = session.execute(text("""
        WITH bairros_agg AS (
          SELECT
            -- nome original mais frequente (capitalizacao bonita)
            MODE() WITHIN GROUP (ORDER BY c.bairro) AS nome_original,
            -- nome normalizado pra match
            UPPER(TRANSLATE(c.bairro,
              'áéíóúâêîôûãõàèìòùäëïöüçÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÄËÏÖÜÇ',
              'aeiouaeiouaoaeiouaeiouCAEIOUAEIOUAOAEIOUAEIOUC')) AS bairro_norm,
            COUNT(DISTINCT s.id) AS n_setores,
            ST_Multi(ST_CollectionExtract(
              ST_ChaikinSmoothing(
                ST_Buffer(ST_Buffer(ST_Union(s.geometry), 0), 0),
                2
              ),
              3  -- extrai apenas polygons
            )) AS geom,
            ST_Area(ST_Union(s.geometry)::geography) / 1e6 AS area_km2
          FROM ceps c
          JOIN setores_censitarios s ON s.codigo_setor = c.codigo_setor
          WHERE UPPER(c.cidade) = UPPER(:cidade)
            AND c.uf = :uf
            AND c.bairro IS NOT NULL
            AND c.bairro != ''
            AND c.codigo_setor IS NOT NULL
          GROUP BY bairro_norm
          HAVING COUNT(DISTINCT s.id) >= :min_setores
        )
        SELECT nome_original, bairro_norm, n_setores,
               area_km2, ST_AsEWKB(geom) AS geom_bytes
        FROM bairros_agg
        WHERE area_km2 <= :max_area
        ORDER BY n_setores DESC
    """), {"cidade": cidade, "uf": uf, "min_setores": MIN_SETORES, "max_area": MAX_AREA_KM2})

    novos = 0
    atualizados = 0
    ignorados = 0

    rows = result.fetchall()
    print(f"  {len(rows)} bairros agregados via setores censitarios")

    for r in rows:
        nome_norm = r.bairro_norm
        nome_original = r.nome_original

        # Filtros adicionais no Python (bugs comuns)
        # "Sao Paulo" como bairro e erro comum do CNEFE
        if nome_norm == _norm(cidade):
            ignorados += 1
            continue

        # Tenta achar microbairro existente por nome padronizado
        existing = session.execute(text("""
            SELECT id FROM microbairros
            WHERE cidade = :cidade AND uf = :uf
              AND nome_padronizado = :norm
            LIMIT 1
        """), {"cidade": cidade, "uf": uf, "norm": nome_norm}).fetchone()

        if existing:
            session.execute(text("""
                UPDATE microbairros SET
                    polygon_censitario = ST_GeomFromEWKB(:geom)::geometry(MultiPolygon, 4326),
                    setores_censitarios_n = :n,
                    area_km2 = :area
                WHERE id = :id
            """), {
                "id": existing[0], "geom": r.geom_bytes,
                "n": r.n_setores, "area": float(r.area_km2)
            })
            atualizados += 1
        else:
            # Insere novo microbairro
            session.execute(text("""
                INSERT INTO microbairros (
                    nome, nome_padronizado, cidade, uf, municipio_id,
                    fonte, status, polygon_censitario,
                    setores_censitarios_n, area_km2, polygon_origem
                ) VALUES (
                    :nome, :norm, :cidade, :uf, :mid,
                    'censitaria', 'censitaria_ok',
                    ST_GeomFromEWKB(:geom)::geometry(MultiPolygon, 4326),
                    :n, :area, 'censitaria'
                )
                ON CONFLICT (uf, cidade, nome_padronizado) DO UPDATE SET
                    polygon_censitario = EXCLUDED.polygon_censitario,
                    setores_censitarios_n = EXCLUDED.setores_censitarios_n,
                    area_km2 = EXCLUDED.area_km2
            """), {
                "nome": nome_original, "norm": nome_norm,
                "cidade": cidade, "uf": uf, "mid": municipio_id,
                "geom": r.geom_bytes,
                "n": r.n_setores, "area": float(r.area_km2)
            })
            novos += 1

    session.commit()
    return novos, atualizados, ignorados


def main(cidades_filtro: Optional[list[str]] = None) -> bool:
    if not test_connection():
        return False
    session = get_session()

    cidades = CIDADES_PRIORIDADE
    if cidades_filtro:
        nomes_filtro = {c.upper() for c in cidades_filtro}
        cidades = [c for c in cidades if c[0].upper() in nomes_filtro]

    total_novos = 0
    total_atu = 0

    for cidade, uf in cidades:
        try:
            n, a, ig = processar_cidade(session, cidade, uf)
            total_novos += n
            total_atu += a
            print(f"  => novos={n} atualizados={a} ignorados={ig}")
        except Exception as e:
            print(f"  [erro] {cidade}: {e}")
            session.rollback()

    session.close()
    print(f"\n=== Resumo ===")
    print(f"  Novos microbairros:        {total_novos}")
    print(f"  Microbairros atualizados:  {total_atu}")
    return True


if __name__ == "__main__":
    filtro = sys.argv[1:] or None
    main(filtro)
