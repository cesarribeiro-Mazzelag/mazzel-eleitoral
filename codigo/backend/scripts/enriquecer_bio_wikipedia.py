"""
ETL: Enriquecimento de bio_resumida via Wikipedia API.

Busca top 1000 candidatos eleitos sem bio (priorizando por cargo e votos)
e popula bio_resumida + wikidata_qid + wikipedia_url via Wikipedia pt.

Estrategia:
1. Busca pelo titulo exato (nome_urna, depois nome_completo)
2. Se nao encontrar, busca via /w/api.php?action=query&list=search
3. Valida que pagina encontrada é de politico brasileiro (heuristica simples)
4. Extrai primeiro paragrafo (max 500 chars)

Rate limit: 1 req/seg (respeitando politica Wikipedia).

Uso:
    python scripts/enriquecer_bio_wikipedia.py [--dry-run] [--cargo SENADOR] [--limit 100]
"""

import asyncio
import re
import sys
import time
import argparse
import logging
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import httpx
import psycopg2
from psycopg2.extras import RealDictCursor

# --- Configuracao ---------------------------------------------------------

DATABASE_URL_SYNC = "postgresql://postgres:postgres@ub_postgres:5432/uniao_brasil"

WIKIPEDIA_API = "https://pt.wikipedia.org/w/api.php"
WIKIPEDIA_BASE = "https://pt.wikipedia.org/wiki/"

# Cargo com prioridade
CARGO_PRIORIDADE = [
    "SENADOR",
    "GOVERNADOR",
    "DEPUTADO FEDERAL",
    "DEPUTADO ESTADUAL",
    "DEPUTADO DISTRITAL",
    "PREFEITO",
    "VEREADOR",
    "VICE-GOVERNADOR",
    "VICE-PRESIDENTE",
    "1º SUPLENTE",
    "2º SUPLENTE",
    "VICE-PREFEITO",
]

# Termos que indicam que a pagina é de um politico / figura publica brasileira
TERMOS_POLITICO = [
    "político", "politico", "brasileiro", "brasileira", "partido",
    "deputado", "senador", "governador", "prefeito", "vereador",
    "ministro", "secretário", "secretaria", "eleito", "mandato",
    "câmara", "camara", "senado", "assembléia", "assembleia",
    "federal", "estadual", "municipal", "candidato", "eleição",
]

# Padroes que indicam que NAO é uma pagina de pessoa (paginas de eventos/lugares/etc)
PADROES_REJEITAR = [
    r"^as eleições",
    r"^eleições? (municipais|estaduais|presidenciais|gerais|legislativas)",
    r"^eleição (municipal|estadual|presidencial|geral|legislativa)",
    r"^o município de",
    r"^porto walter",  # cidade do Acre
    r"é um município",
    r"é uma cidade",
    r"é um bairro",
    r"foi uma batalha",
    r"é uma batalha",
]

MAX_BIO_CHARS = 500
RATE_LIMIT_DELAY = 1.1  # segundos entre requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger(__name__)


# --- Utilitarios ----------------------------------------------------------

def limpar_nome(nome: str) -> str:
    """Remove acentos problemáticos, normaliza."""
    return nome.strip().title()


def truncar_bio(texto: str, max_chars: int = MAX_BIO_CHARS) -> str:
    """Trunca bio no limite de chars, preferencialmente em fim de frase."""
    if not texto:
        return ""
    texto = texto.strip()
    if len(texto) <= max_chars:
        return texto
    # Tenta cortar em ponto final
    trunc = texto[:max_chars]
    ultimo_ponto = trunc.rfind(".")
    if ultimo_ponto > max_chars * 0.6:
        return trunc[: ultimo_ponto + 1].strip()
    return trunc.strip() + "..."


def _validar_pagina_politico(extract: str, nome: str) -> bool:
    """
    Heuristica: verifica se o extrato é de um politico e NAO de evento/lugar/eleicao.
    """
    if not extract:
        return False
    extract_lower = extract.lower().strip()

    # Rejeita paginas de desambiguacao
    if "pode referir-se a:" in extract_lower or "pode referir-se a" in extract_lower:
        return False
    if "pode significar:" in extract_lower:
        return False

    # Rejeita paginas de eleicoes, municipios, batalhas, etc
    for padrao in PADROES_REJEITAR:
        if re.search(padrao, extract_lower):
            return False

    # Precisa de pelo menos 2 termos de politico
    score = sum(1 for t in TERMOS_POLITICO if t in extract_lower)
    return score >= 2


# --- Wikipedia API --------------------------------------------------------

class WikipediaClient:
    def __init__(self, client: httpx.Client):
        self.client = client
        self._last_request = 0.0

    def _rate_limit(self):
        elapsed = time.time() - self._last_request
        if elapsed < RATE_LIMIT_DELAY:
            time.sleep(RATE_LIMIT_DELAY - elapsed)
        self._last_request = time.time()

    def _get(self, params: dict) -> Optional[dict]:
        self._rate_limit()
        try:
            r = self.client.get(WIKIPEDIA_API, params=params, timeout=15)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            log.warning(f"Erro Wikipedia API: {e}")
            return None

    def buscar_por_titulo(self, titulo: str) -> Optional[dict]:
        """Busca pagina pelo titulo exato (com redirects)."""
        data = self._get({
            "action": "query",
            "format": "json",
            "titles": titulo,
            "prop": "extracts|pageprops|info",
            "exintro": True,
            "explaintext": True,
            "redirects": 1,
            "ppprop": "wikibase_item",
            "inprop": "url",
        })
        if not data:
            return None
        pages = data.get("query", {}).get("pages", {})
        for pid, page in pages.items():
            if pid == "-1":  # Pagina nao encontrada
                return None
            return page
        return None

    def buscar_por_texto(self, query: str, limit: int = 3) -> list[dict]:
        """Busca fulltext para encontrar pagina do politico."""
        data = self._get({
            "action": "query",
            "format": "json",
            "list": "search",
            "srsearch": query,
            "srlimit": limit,
            "srnamespace": 0,
        })
        if not data:
            return []
        return data.get("query", {}).get("search", [])

    def obter_pagina(self, titulo: str) -> Optional[dict]:
        """Obtem pagina completa (extrato + wikidata QID)."""
        data = self._get({
            "action": "query",
            "format": "json",
            "titles": titulo,
            "prop": "extracts|pageprops|info",
            "exintro": True,
            "explaintext": True,
            "redirects": 1,
            "ppprop": "wikibase_item",
            "inprop": "url",
        })
        if not data:
            return None
        pages = data.get("query", {}).get("pages", {})
        for pid, page in pages.items():
            if pid == "-1":
                return None
            return page
        return None


# --- Logica principal -----------------------------------------------------

def candidatos_sem_bio(conn, cargo_filtro: Optional[str], limit: int) -> list[dict]:
    """
    Retorna candidatos eleitos sem bio, priorizados por:
    1. Ordem de importancia do cargo (Senador > Governador > Dep Federal > ...)
    2. Votos decrescentes dentro do mesmo cargo
    """
    cargo_cond = "AND ca.cargo = %(cargo)s" if cargo_filtro else ""
    # Prioridade de cargo: menor numero = mais importante
    cargo_priority = """
        CASE ca.cargo
            WHEN 'PRESIDENTE'         THEN 1
            WHEN 'VICE-PRESIDENTE'    THEN 2
            WHEN 'GOVERNADOR'         THEN 3
            WHEN 'VICE-GOVERNADOR'    THEN 4
            WHEN 'SENADOR'            THEN 5
            WHEN '1º SUPLENTE'        THEN 6
            WHEN '2º SUPLENTE'        THEN 7
            WHEN 'DEPUTADO FEDERAL'   THEN 8
            WHEN 'DEPUTADO ESTADUAL'  THEN 9
            WHEN 'DEPUTADO DISTRITAL' THEN 10
            WHEN 'PREFEITO'           THEN 11
            WHEN 'VICE-PREFEITO'      THEN 12
            WHEN 'VEREADOR'           THEN 13
            ELSE 99
        END
    """
    sql = f"""
    WITH ranked AS (
        SELECT DISTINCT ON (c.id)
            c.id,
            c.nome_completo,
            c.nome_urna,
            c.wikidata_qid,
            ca.cargo,
            ca.votos_total,
            {cargo_priority} as cargo_prio
        FROM candidatos c
        JOIN candidaturas ca ON ca.candidato_id = c.id
        WHERE ca.eleito = true
          AND c.bio_resumida IS NULL
          {cargo_cond}
        ORDER BY c.id, ca.votos_total DESC NULLS LAST
    )
    SELECT * FROM ranked
    ORDER BY cargo_prio ASC, votos_total DESC NULLS LAST
    LIMIT %(limit)s
    """
    params = {"limit": limit}
    if cargo_filtro:
        params["cargo"] = cargo_filtro

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def cobertura_por_cargo(conn) -> dict:
    """Retorna dict cargo -> (total_eleitos, com_bio, pct)."""
    sql = """
    SELECT
        ca.cargo,
        COUNT(*) as total,
        COUNT(c.bio_resumida) as com_bio,
        ROUND(100.0 * COUNT(c.bio_resumida) / NULLIF(COUNT(*), 0), 1) as pct
    FROM candidatos c
    JOIN candidaturas ca ON ca.candidato_id = c.id
    WHERE ca.eleito = true
    GROUP BY ca.cargo
    ORDER BY pct DESC
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql)
        return {r["cargo"]: dict(r) for r in cur.fetchall()}


def atualizar_bio(conn, candidato_id: int, bio: str, wikidata_qid: Optional[str],
                  wikipedia_url: Optional[str], dry_run: bool = False):
    if dry_run:
        return
    sql = """
    UPDATE candidatos
    SET bio_resumida = %(bio)s,
        wikidata_qid = COALESCE(%(qid)s, wikidata_qid),
        wikipedia_url = COALESCE(%(url)s, wikipedia_url)
    WHERE id = %(id)s
    """
    with conn.cursor() as cur:
        cur.execute(sql, {"bio": bio, "qid": wikidata_qid, "url": wikipedia_url, "id": candidato_id})
    conn.commit()


def _tentar_busca(wiki: WikipediaClient, candidato: dict) -> Optional[tuple[str, str, str]]:
    """
    Tenta encontrar bio para candidato.
    Retorna (bio, wikidata_qid, wikipedia_url) ou None.
    """
    nome_urna = candidato.get("nome_urna", "").strip()
    nome_completo = candidato.get("nome_completo", "").strip()
    wikidata_qid_existente = candidato.get("wikidata_qid")

    # Estrategia 1: usa wikidata_qid existente para buscar pagina Wikipedia
    if wikidata_qid_existente:
        # Ja tem QID mas nao tem bio - buscar pelo titulo
        # Nao sabemos o titulo, entao pulamos para busca por nome
        pass

    # Candidatos para busca (ordem: nome_urna, nome_completo, variações)
    nomes_busca = []
    if nome_urna and len(nome_urna) > 3:
        nomes_busca.append(nome_urna.title())
    if nome_completo and nome_completo.lower() != nome_urna.lower():
        nomes_busca.append(nome_completo.title())

    for nome in nomes_busca:
        # Estrategia A: titulo exato
        pagina = wiki.buscar_por_titulo(nome)
        if pagina:
            extract = pagina.get("extract", "")
            if extract and _validar_pagina_politico(extract, nome):
                bio = truncar_bio(extract)
                qid = pagina.get("pageprops", {}).get("wikibase_item")
                titulo_encode = pagina.get("title", "").replace(" ", "_")
                url = WIKIPEDIA_BASE + quote(titulo_encode, safe="/:_()")
                return bio, qid, url

        # Estrategia B: busca fulltext com "politico brasileiro"
        query = f"{nome} político"
        resultados = wiki.buscar_por_texto(query, limit=3)
        for res in resultados:
            titulo = res.get("title", "")
            snippet = res.get("snippet", "")
            # Filtro rapido pelo snippet
            if not _validar_pagina_politico(snippet, nome):
                continue
            # Obtem pagina completa
            pagina = wiki.obter_pagina(titulo)
            if not pagina:
                continue
            extract = pagina.get("extract", "")
            if not extract or not _validar_pagina_politico(extract, nome):
                continue
            # Verifica se nome do candidato aparece na pagina
            nome_partes = nome.lower().split()
            extract_lower = extract.lower()
            matches = sum(1 for p in nome_partes if len(p) > 3 and p in extract_lower)
            if matches < 2:
                continue
            bio = truncar_bio(extract)
            qid = pagina.get("pageprops", {}).get("wikibase_item")
            titulo_encode = pagina.get("title", "").replace(" ", "_")
            url = WIKIPEDIA_BASE + quote(titulo_encode, safe="/:_()")
            return bio, qid, url

    return None


def run(dry_run: bool, cargo_filtro: Optional[str], limit: int):
    conn = psycopg2.connect(DATABASE_URL_SYNC)

    log.info("=== Cobertura ANTES ===")
    cobertura_antes = cobertura_por_cargo(conn)
    cargos_relevantes = [
        "SENADOR", "GOVERNADOR", "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL",
        "DEPUTADO DISTRITAL", "PREFEITO", "VEREADOR"
    ]
    for cargo in cargos_relevantes:
        if cargo in cobertura_antes:
            r = cobertura_antes[cargo]
            log.info(f"  {cargo}: {r['com_bio']}/{r['total']} ({r['pct']}%)")

    candidatos = candidatos_sem_bio(conn, cargo_filtro, limit)
    log.info(f"\nCandidatos para processar: {len(candidatos)}")

    headers = {
        "User-Agent": "UniaoBrasilBot/1.0 (https://uniaobrasil.org.br; contato@uniaobrasil.org.br)"
    }

    processados = 0
    com_bio = 0
    sem_bio = 0
    samples = []

    with httpx.Client(headers=headers) as client:
        wiki = WikipediaClient(client)

        for i, cand in enumerate(candidatos):
            cid = cand["id"]
            nome = cand.get("nome_urna") or cand.get("nome_completo", "?")
            cargo = cand.get("cargo", "?")

            log.info(f"[{i+1}/{len(candidatos)}] {nome} ({cargo})")

            resultado = _tentar_busca(wiki, cand)

            if resultado:
                bio, qid, url = resultado
                log.info(f"  OK: {bio[:80]}...")
                atualizar_bio(conn, cid, bio, qid, url, dry_run=dry_run)
                com_bio += 1
                if len(samples) < 3:
                    samples.append({
                        "nome": nome,
                        "cargo": cargo,
                        "bio": bio[:200],
                        "url": url,
                    })
            else:
                log.info(f"  SEM BIO encontrada")
                sem_bio += 1

            processados += 1

    log.info(f"\n=== Resultado ===")
    log.info(f"Processados: {processados}")
    log.info(f"Com bio nova: {com_bio}")
    log.info(f"Sem bio: {sem_bio}")

    log.info("\n=== Cobertura DEPOIS ===")
    cobertura_depois = cobertura_por_cargo(conn)
    for cargo in cargos_relevantes:
        antes = cobertura_antes.get(cargo, {})
        depois = cobertura_depois.get(cargo, {})
        pct_antes = antes.get("pct", 0)
        pct_depois = depois.get("pct", 0)
        total = depois.get("total", 0)
        com = depois.get("com_bio", 0)
        log.info(f"  {cargo}: {com}/{total} ({pct_depois}%) [era {pct_antes}%]")

    conn.close()

    return {
        "processados": processados,
        "com_bio": com_bio,
        "sem_bio": sem_bio,
        "cobertura_antes": {c: cobertura_antes.get(c, {}) for c in cargos_relevantes},
        "cobertura_depois": {c: cobertura_depois.get(c, {}) for c in cargos_relevantes},
        "samples": samples,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Enriquece bio_resumida via Wikipedia")
    parser.add_argument("--dry-run", action="store_true", help="Nao salva no banco")
    parser.add_argument("--cargo", type=str, default=None, help="Filtrar por cargo (ex: SENADOR)")
    parser.add_argument("--limit", type=int, default=1000, help="Limite de candidatos")
    args = parser.parse_args()

    result = run(dry_run=args.dry_run, cargo_filtro=args.cargo, limit=args.limit)
    log.info("Concluido.")
