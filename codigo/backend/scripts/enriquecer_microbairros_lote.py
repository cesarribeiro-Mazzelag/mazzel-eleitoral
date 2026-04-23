"""
Enriquecimento de microbairros com polygon_final (estrategia hibrida gratuita).

Para os 1.073 microbairros que tem polygon_voronoi mas NAO tem polygon_censitario,
gera polygon_final usando:

  Tentativa 1 — OSM Nominatim (gratuito, 1 req/s):
    Busca o poligono do bairro por nome + "São Paulo".
    Usa se retornar polygon com area > 0 dentro dos bounds de SP.

  Tentativa 2 — Setores IBGE que intersectam polygon_voronoi:
    ST_Multi(ST_SimplifyPreserveTopology(ST_Union(setores), 0.00002))

Como rodar:
  docker exec ub_backend python -m scripts.enriquecer_microbairros_lote --limite=100
  docker exec ub_backend python -m scripts.enriquecer_microbairros_lote --limite=50 --force-ibge

Cron sugerido (documentacao — nao instalado automaticamente):
  0 3 * * * docker exec ub_backend python -m scripts.enriquecer_microbairros_lote --limite=100

Limites Nominatim: 1 req/s, User-Agent obrigatorio, sem uso comercial agressivo.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
import logging
import urllib.request
import urllib.parse
import json
import textwrap
from typing import Optional

# Permite rodar como `python -m scripts.enriquecer_microbairros_lote`
# dentro do container, onde DATABASE_URL esta no env
try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("ERRO: psycopg2 nao encontrado. Instale com: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("enriquecer_microbairros")

# Bounds de SP capital (lat/lon) para validar se poligono Nominatim e valido
SP_BOUNDS = {
    "min_lon": -46.83,
    "max_lon": -46.36,
    "min_lat": -23.80,
    "max_lat": -23.36,
}

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "uniao-brasil-etl/1.0 (contato@uniaobrasil.org.br)"


def get_db_conn():
    """Conecta ao banco de dados via DATABASE_URL ou variaveis individuais."""
    database_url = os.environ.get("DATABASE_URL", "")
    if database_url:
        # Converte postgresql+asyncpg:// para postgresql:// se necessario
        database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
        database_url = database_url.replace("postgresql+psycopg2://", "postgresql://")
        return psycopg2.connect(database_url)

    # Fallback: variaveis individuais
    host = os.environ.get("POSTGRES_HOST", "localhost")
    port = os.environ.get("POSTGRES_PORT", "5432")
    db   = os.environ.get("POSTGRES_DB", "uniao_brasil")
    user = os.environ.get("POSTGRES_USER", "postgres")
    pwd  = os.environ.get("POSTGRES_PASSWORD", "postgres")
    return psycopg2.connect(host=host, port=port, dbname=db, user=user, password=pwd)


def buscar_nominatim(nome: str) -> Optional[str]:
    """
    Busca poligono do bairro no Nominatim.
    Retorna WKT string se encontrou poligono valido dentro de SP, None caso contrario.
    """
    params = urllib.parse.urlencode({
        "q": f"{nome}, São Paulo, SP, Brasil",
        "format": "geojson",
        "polygon_geojson": "1",
        "limit": "3",
        "addressdetails": "1",
        "countrycodes": "br",
        "featuretype": "settlement",
    })
    url = f"{NOMINATIM_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        log.debug(f"Nominatim erro para '{nome}': {e}")
        return None

    if not data or "features" not in data:
        return None

    for feature in data["features"]:
        geom = feature.get("geometry", {})
        geom_type = geom.get("type", "")

        # Aceita apenas Polygon ou MultiPolygon
        if geom_type not in ("Polygon", "MultiPolygon"):
            continue

        # Valida que o centroide esta dentro dos bounds de SP
        props = feature.get("properties", {})
        lat = props.get("lat") or feature.get("properties", {}).get("centroid", {}).get("coordinates", [None, None])[1]
        lon = props.get("lon") or feature.get("properties", {}).get("centroid", {}).get("coordinates", [None, None])[0]

        try:
            lat = float(lat) if lat else None
            lon = float(lon) if lon else None
        except (ValueError, TypeError):
            lat = lon = None

        # Se nao tem centroide, tenta extrair do primeiro ponto do poligono
        if lat is None and geom_type == "Polygon":
            try:
                lon, lat = geom["coordinates"][0][0]
            except (IndexError, TypeError):
                pass
        elif lat is None and geom_type == "MultiPolygon":
            try:
                lon, lat = geom["coordinates"][0][0][0]
            except (IndexError, TypeError):
                pass

        if lat is not None and lon is not None:
            if not (SP_BOUNDS["min_lat"] <= lat <= SP_BOUNDS["max_lat"] and
                    SP_BOUNDS["min_lon"] <= lon <= SP_BOUNDS["max_lon"]):
                log.debug(f"Nominatim: '{nome}' retornou poligono fora de SP ({lat}, {lon})")
                continue

        # Converte GeoJSON geometry para WKT via ST_GeomFromGeoJSON no Postgres
        # Retorna o GeoJSON serializado para processar no Postgres
        return json.dumps(geom)

    return None


def processar_lote(conn, limite: int, force_ibge: bool = False) -> dict:
    """
    Processa proximo lote de microbairros sem polygon_final.
    Retorna estatisticas: processados, via_nominatim, via_ibge, erros.
    """
    stats = {"processados": 0, "via_nominatim": 0, "via_ibge": 0, "erros": 0}

    with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
        # Busca proximos N sem polygon_final, priorizando os com polygon_voronoi
        cur.execute("""
            SELECT id, nome, nome_padronizado
            FROM microbairros
            WHERE polygon_final IS NULL
              AND polygon_censitario IS NULL
              AND polygon_voronoi IS NOT NULL
              AND uf = 'SP'
              AND cidade = 'São Paulo'
            ORDER BY id
            LIMIT %s
        """, (limite,))
        rows = cur.fetchall()

    if not rows:
        log.info("Nenhum microbairro pendente encontrado.")
        return stats

    log.info(f"Processando {len(rows)} microbairros...")

    for row in rows:
        mb_id = row["id"]
        nome = row["nome"]
        nome_pad = row["nome_padronizado"]

        geojson_str = None
        fonte = None

        # Tentativa 1: Nominatim (a menos que --force-ibge)
        if not force_ibge:
            geojson_str = buscar_nominatim(nome)
            if geojson_str:
                fonte = "nominatim"
            time.sleep(1.1)  # Respeita rate limit: max 1 req/s

        # Tentativa 2: Setores IBGE que intersectam polygon_voronoi
        if geojson_str is None:
            with conn.cursor() as cur2:
                cur2.execute("""
                    SELECT ST_AsGeoJSON(
                        ST_Multi(
                            ST_SimplifyPreserveTopology(
                                ST_Union(s.geometry),
                                0.00002
                            )
                        )
                    ) AS geojson
                    FROM setores_censitarios s
                    JOIN microbairros m ON ST_Intersects(s.geometry, m.polygon_voronoi)
                    WHERE m.id = %s
                    GROUP BY m.id
                    HAVING ST_Area(ST_Union(s.geometry)) > 0
                """, (mb_id,))
                ibge_row = cur2.fetchone()
                if ibge_row and ibge_row[0]:
                    geojson_str = ibge_row[0]
                    fonte = "ibge_setores"

        if geojson_str is None:
            log.warning(f"ID {mb_id} '{nome}': sem poligono (Nominatim e IBGE falharam)")
            stats["erros"] += 1
            continue

        # Persiste polygon_final
        try:
            with conn.cursor() as cur3:
                if fonte == "nominatim":
                    # GeoJSON vem do Nominatim — converte para geometry no Postgres
                    cur3.execute("""
                        UPDATE microbairros
                        SET polygon_final = ST_Multi(
                            ST_CollectionExtract(
                                ST_MakeValid(
                                    ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)
                                ),
                                3
                            )
                        )
                        WHERE id = %s
                    """, (geojson_str, mb_id))
                else:
                    # GeoJSON ja e MultiPolygon valido gerado pelo PostGIS
                    cur3.execute("""
                        UPDATE microbairros
                        SET polygon_final = ST_Multi(
                            ST_CollectionExtract(
                                ST_MakeValid(
                                    ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)
                                ),
                                3
                            )
                        )
                        WHERE id = %s
                    """, (geojson_str, mb_id))
            conn.commit()

            stats["processados"] += 1
            if fonte == "nominatim":
                stats["via_nominatim"] += 1
            else:
                stats["via_ibge"] += 1

            log.info(f"OK  ID {mb_id:4d} '{nome[:40]}' -> {fonte}")

        except Exception as e:
            conn.rollback()
            log.error(f"ERRO gravando ID {mb_id} '{nome}': {e}")
            stats["erros"] += 1

    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Enriquece microbairros com polygon_final (Nominatim + IBGE setores)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""
            Exemplos:
              python -m scripts.enriquecer_microbairros_lote --limite=100
              python -m scripts.enriquecer_microbairros_lote --limite=50 --force-ibge

            Cron sugerido (documentacao — nao instalar manualmente):
              0 3 * * * docker exec ub_backend python -m scripts.enriquecer_microbairros_lote --limite=100
        """)
    )
    parser.add_argument("--limite", type=int, default=100,
                        help="Numero maximo de microbairros a processar (default: 100)")
    parser.add_argument("--force-ibge", action="store_true",
                        help="Pula Nominatim e usa apenas setores IBGE (mais rapido, sem rate limit)")
    args = parser.parse_args()

    log.info(f"Iniciando enriquecimento: limite={args.limite}, force_ibge={args.force_ibge}")

    try:
        conn = get_db_conn()
    except Exception as e:
        log.error(f"Falha ao conectar ao banco: {e}")
        sys.exit(1)

    try:
        stats = processar_lote(conn, limite=args.limite, force_ibge=args.force_ibge)
    finally:
        conn.close()

    log.info(
        f"Concluido: {stats['processados']} processados | "
        f"{stats['via_nominatim']} via Nominatim | "
        f"{stats['via_ibge']} via IBGE setores | "
        f"{stats['erros']} erros"
    )

    # Relatorio de pendencias restantes
    try:
        conn2 = get_db_conn()
        with conn2.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM microbairros
                WHERE polygon_final IS NULL
                  AND polygon_voronoi IS NOT NULL
                  AND uf = 'SP' AND cidade = 'São Paulo'
            """)
            pendentes = cur.fetchone()[0]
        conn2.close()
        log.info(f"Microbairros ainda pendentes: {pendentes}")
    except Exception:
        pass

    sys.exit(0 if stats["erros"] == 0 else 1)


if __name__ == "__main__":
    main()
