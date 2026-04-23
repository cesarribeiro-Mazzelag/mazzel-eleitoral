"""
Enriquecimento de nomes de microbairros de SP via OSM Nominatim reverse geocoding.

Objetivo: garantir que 100% dos microbairros de SP capital tenham nome legível.
Usado no "Modo Campanha" da plataforma União Brasil.

Fontes de coordenadas (ordem de preferência):
  1. here_lat / here_lng
  2. ST_Centroid(polygon_censitario)
  3. ST_Centroid(osm_polygon)

Critérios de nome inválido:
  - nome IS NULL ou nome = ''
  - nome ILIKE 'microbairro%'
  - nome ILIKE 'sem nome%'
  - nome ~ '^[0-9]+$'  (puramente numérico, ex: '0', '123')
  - nome IN ('Sp', 'Zona Norte', 'Setor G', 'Bairro Do Limao')  (nomes genéricos conhecidos)

Estratégia de nome via Nominatim:
  Prioridade: suburb > neighbourhood > quarter > city_district > name

Desambiguação: se nome já existe na cidade, acrescenta '({road})' como sufixo.

Idempotente: só toca registros sem nome válido.
Rate limit: 1 req/s conforme política Nominatim.

Como rodar (dentro do container):
  docker exec ub_backend python -m scripts.enriquecer_nomes_microbairros
  docker exec ub_backend python -m scripts.enriquecer_nomes_microbairros --limite=80

Cron de rotina (NÃO instalar automaticamente — apenas referência):
  0 4 * * * docker exec ub_backend python -m scripts.enriquecer_nomes_microbairros --limite=80

Segurança multi-agente:
  Usa advisory lock Postgres (pg_try_advisory_lock(20260420)) para não colidir
  com outros scripts que escrevem em outras colunas da mesma tabela.
  Os outros agentes (ex: polígonos Voronoi) usam locks distintos — podem rodar em paralelo.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
import unicodedata
import re

import httpx
from sqlalchemy import create_engine, text

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "uniao-brasil-etl/1.0 (contato@uniaobrasil.org.br)"

# Nomes conhecidos como genéricos/inválidos (além dos critérios padrão)
NOMES_GENERICOS = frozenset({
    "sp", "zona norte", "zona sul", "zona leste", "zona oeste",
    "setor g", "bairro do limao", "bairro do limão",
    "centro", "outros", "nao identificado",
})

# Advisory lock id — diferente do lock dos polígonos Voronoi (que usa outro id)
# Os dois scripts podem rodar em paralelo pois escrevem colunas diferentes
ADVISORY_LOCK_ID = 20260420_01  # nomes


def _engine():
    url = os.getenv("DATABASE_URL", "").replace("+asyncpg", "+psycopg2")
    if not url:
        # fallback local para rodar fora do container (debug)
        url = "postgresql+psycopg2://postgres:postgres@localhost:5433/uniao_brasil"
    return create_engine(url, echo=False)


def _nome_invalido(nome: str | None) -> bool:
    """Retorna True se o nome precisa de enriquecimento."""
    if nome is None or nome.strip() == "":
        return True
    n = nome.strip()
    # Puramente numérico
    if re.match(r"^\d+$", n):
        return True
    # Padrões explícitos
    n_lower = n.lower()
    if n_lower.startswith("microbairro") or n_lower.startswith("sem nome"):
        return True
    if n_lower in NOMES_GENERICOS:
        return True
    return False


def _normalizar(s: str) -> str:
    """Remove acentos e deixa em lowercase para comparação."""
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()


def _buscar_nome_nominatim(lat: float, lon: float, client: httpx.Client) -> dict | None:
    """Chama Nominatim e retorna dict com nome, road. Retorna None se falhar."""
    try:
        resp = client.get(
            NOMINATIM_URL,
            params={
                "lat": lat,
                "lon": lon,
                "format": "json",
                "accept-language": "pt-BR",
                "zoom": 15,
                "addressdetails": 1,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"    [ERRO Nominatim] lat={lat} lon={lon}: {e}")
        return None

    address = data.get("address", {})

    # Ordem de preferência para o nome do bairro
    nome = (
        address.get("suburb")
        or address.get("neighbourhood")
        or address.get("quarter")
        or address.get("city_district")
        or data.get("name")
    )

    if not nome:
        return None

    # Garantir que está em SP (evitar resultados fora da cidade)
    cidade_osm = address.get("city") or address.get("town") or address.get("municipality") or ""
    if "são paulo" not in cidade_osm.lower() and "sao paulo" not in cidade_osm.lower():
        # Aceitar mesmo assim mas logar warning
        print(f"    [AVISO] Nominatim retornou cidade={cidade_osm!r} para lat={lat} lon={lon}")

    road = address.get("road") or address.get("pedestrian") or ""

    return {"nome": nome.strip(), "road": road.strip()}


def main():
    parser = argparse.ArgumentParser(description="Enriquece nomes de microbairros de SP via Nominatim")
    parser.add_argument("--limite", type=int, default=80,
                        help="Máximo de requisições Nominatim nesta rodada (default: 80)")
    args = parser.parse_args()

    engine = _engine()

    with engine.begin() as conn:
        # ── Advisory lock para coordenar com outros scripts ──────────────────
        # Polígonos Voronoi usa lock diferente → podem rodar em paralelo
        # (escrevem em colunas diferentes: polygon_voronoi vs nome/nome_padronizado)
        locked = conn.execute(
            text("SELECT pg_try_advisory_xact_lock(:lid)"),
            {"lid": 20260420},
        ).scalar()
        if not locked:
            print("[AVISO] Outro processo de enriquecimento de nomes já está rodando. Saindo.")
            sys.exit(0)

        print("=" * 60)
        print("ENRIQUECIMENTO DE NOMES — MICROBAIRROS SP")
        print(f"Limite desta rodada: {args.limite} requisições")
        print("=" * 60)

        # ── 1. Buscar candidatos a enriquecimento ──────────────────
        rows = conn.execute(text("""
            SELECT
                id,
                nome,
                here_lat,
                here_lng,
                ST_Y(ST_Centroid(polygon_censitario)) AS lat_censitario,
                ST_X(ST_Centroid(polygon_censitario)) AS lng_censitario,
                ST_Y(ST_Centroid(osm_polygon)) AS lat_osm,
                ST_X(ST_Centroid(osm_polygon)) AS lng_osm
            FROM microbairros
            WHERE uf = 'SP' AND cidade = 'São Paulo'
            ORDER BY id
        """)).fetchall()

        candidatos = []
        for row in rows:
            if _nome_invalido(row.nome):
                # Escolher melhor coordenada disponível
                lat, lng = None, None
                if row.here_lat is not None and row.here_lng is not None:
                    lat, lng = float(row.here_lat), float(row.here_lng)
                elif row.lat_censitario is not None:
                    lat, lng = float(row.lat_censitario), float(row.lng_censitario)
                elif row.lat_osm is not None:
                    lat, lng = float(row.lat_osm), float(row.lng_osm)

                candidatos.append({
                    "id": row.id,
                    "nome_atual": row.nome,
                    "lat": lat,
                    "lng": lng,
                })

        total_candidatos = len(candidatos)
        print(f"\nRegistros sem nome válido encontrados: {total_candidatos}")

        if total_candidatos == 0:
            print("Nenhum registro precisando de enriquecimento. Saindo.")
            return

        # Pegar nomes já existentes para desambiguação
        nomes_existentes = set(
            _normalizar(r[0])
            for r in conn.execute(
                text("SELECT nome FROM microbairros WHERE uf = 'SP' AND cidade = 'São Paulo'")
            ).fetchall()
        )

        # ── 2. Loop de enriquecimento ──────────────────────────────
        nomeados = 0
        falharam = 0
        desambiguados = 0
        sem_coords = 0

        limite_efetivo = min(args.limite, total_candidatos)
        candidatos_com_coords = [c for c in candidatos if c["lat"] is not None]
        candidatos_sem_coords = [c for c in candidatos if c["lat"] is None]

        sem_coords = len(candidatos_sem_coords)
        if sem_coords:
            print(f"  Sem coordenadas (impossível enriquecer): {sem_coords}")
            for c in candidatos_sem_coords:
                print(f"    id={c['id']} nome_atual={c['nome_atual']!r}")

        a_processar = candidatos_com_coords[:limite_efetivo]
        print(f"  Com coordenadas: {len(candidatos_com_coords)} | Processando agora: {len(a_processar)}")
        print()

        with httpx.Client(headers={"User-Agent": USER_AGENT}) as client:
            for i, candidato in enumerate(a_processar, 1):
                print(f"[{i}/{len(a_processar)}] id={candidato['id']} | "
                      f"nome_atual={candidato['nome_atual']!r} | "
                      f"lat={candidato['lat']:.6f} lon={candidato['lng']:.6f}")

                resultado = _buscar_nome_nominatim(candidato["lat"], candidato["lng"], client)

                if not resultado:
                    print(f"    -> FALHOU (Nominatim sem resultado)")
                    falharam += 1
                    time.sleep(1)
                    continue

                nome_novo = resultado["nome"]
                road = resultado["road"]

                # Verificar conflito com nomes existentes
                nome_norm = _normalizar(nome_novo)
                if nome_norm in nomes_existentes:
                    if road:
                        nome_novo = f"{nome_novo} ({road})"
                        nome_norm = _normalizar(nome_novo)
                        desambiguados += 1
                        print(f"    -> CONFLITO desambiguado: {nome_novo!r}")
                    else:
                        # Sem road para desambiguar - usar coordenadas como sufixo
                        nome_novo = f"{nome_novo} ({candidato['lat']:.4f},{candidato['lng']:.4f})"
                        nome_norm = _normalizar(nome_novo)
                        desambiguados += 1
                        print(f"    -> CONFLITO desambiguado (sem road): {nome_novo!r}")
                else:
                    print(f"    -> NOME: {nome_novo!r}")

                # Capitalizar corretamente (title case preservando preposições)
                nome_final = _capitalizar_nome(nome_novo)
                nome_padronizado = nome_norm

                # Gravar no banco
                conn.execute(text("""
                    UPDATE microbairros
                    SET nome = :nome, nome_padronizado = :padronizado
                    WHERE id = :id
                """), {
                    "nome": nome_final,
                    "padronizado": nome_padronizado,
                    "id": candidato["id"],
                })

                nomes_existentes.add(nome_norm)
                nomeados += 1

                # Rate limit obrigatório Nominatim: 1 req/s
                time.sleep(1)

        # ── 3. Relatório final ──────────────────────────────────────
        print()
        print("=" * 60)
        print("RESULTADO")
        print("=" * 60)
        print(f"  Total candidatos:      {total_candidatos}")
        print(f"  Sem coordenadas:       {sem_coords} (não processados)")
        print(f"  Processados:           {len(a_processar)}")
        print(f"  Nomeados com sucesso:  {nomeados}")
        print(f"  Falharam (Nominatim):  {falharam}")
        print(f"  Desambiguados:         {desambiguados}")
        restantes = total_candidatos - sem_coords - nomeados - falharam
        if restantes > 0:
            print(f"  Restam para próximas rodadas: {restantes} (limite de {args.limite} atingido)")
        print()
        print("Cron de rotina (NÃO instalar agora — apenas referência):")
        print("  0 4 * * * docker exec ub_backend python -m scripts.enriquecer_nomes_microbairros --limite=80")


def _capitalizar_nome(nome: str) -> str:
    """Title case preservando preposições minúsculas (de, do, da, dos, das, e)."""
    preposicoes = {"de", "do", "da", "dos", "das", "e", "em", "no", "na", "nos", "nas"}
    palavras = nome.split()
    resultado = []
    for i, palavra in enumerate(palavras):
        # Conteúdo dentro de parênteses mantém capitalização própria
        if palavra.startswith("("):
            resultado.append(palavra)
        elif i == 0 or palavra.lower() not in preposicoes:
            resultado.append(palavra.capitalize())
        else:
            resultado.append(palavra.lower())
    return " ".join(resultado)


if __name__ == "__main__":
    main()
