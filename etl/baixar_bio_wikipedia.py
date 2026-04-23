"""
Script: baixa bio resumida (primeiro paragrafo da Wikipedia PT) + Q-id + URL
de todos os politicos brasileiros que tem artigo na Wikipedia PT.

Fluxo:
  1. SPARQL Wikidata: lista (Q-id, nome, artigo pt.wikipedia) de politicos BR
  2. Match com candidatos do banco por nome normalizado (UPPER + sem acento)
  3. Para cada match, baixa extract via Wikipedia API (batch de 50 titulos)
  4. UPDATE candidatos SET bio_resumida, wikidata_qid, wikipedia_url

Idempotente. Rode quantas vezes quiser.
"""
from __future__ import annotations
import sys
import time
import unicodedata
from pathlib import Path
from typing import Optional
from urllib.parse import unquote

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

from sqlalchemy import text
from db import get_session, test_connection


SPARQL = "https://query.wikidata.org/sparql"
WIKI_API = "https://pt.wikipedia.org/w/api.php"
UA = {"User-Agent": "UBElectoralPlatform/1.0 (+contato@uniaobrasil.org.br)"}

PAGE_SIZE_SPARQL = 5000
BATCH_EXTRACTS = 20  # Wikipedia API aceita ate 50, mas extracts eh pesado


def _norm(s: str) -> str:
    if not s: return ""
    nfd = unicodedata.normalize("NFD", s.upper())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn").strip()


def _title_from_url(url: str) -> str:
    # https://pt.wikipedia.org/wiki/Guilherme_Boulos -> "Guilherme Boulos"
    return unquote(url.split("/wiki/", 1)[-1]).replace("_", " ")


def listar_politicos_br() -> list[dict]:
    """SPARQL: (q_id, nome, url pt.wikipedia) de todos politicos BR com artigo."""
    todos = []
    offset = 0
    while True:
        q = f"""
        SELECT ?p ?pLabel ?article WHERE {{
          ?p wdt:P27 wd:Q155 ;
             wdt:P106 wd:Q82955 .
          ?article schema:about ?p ;
                   schema:isPartOf <https://pt.wikipedia.org/> .
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "pt,en". }}
        }}
        ORDER BY ?p
        LIMIT {PAGE_SIZE_SPARQL} OFFSET {offset}
        """
        r = requests.get(SPARQL, params={"query": q, "format": "json"},
                         headers=UA, timeout=120)
        if r.status_code != 200:
            print(f"  [erro] SPARQL status {r.status_code}")
            break
        bindings = r.json().get("results", {}).get("bindings", [])
        print(f"  [sparql] offset={offset} -> {len(bindings)}")
        for b in bindings:
            qid = b.get("p", {}).get("value", "").rsplit("/", 1)[-1]
            nome = b.get("pLabel", {}).get("value")
            url = b.get("article", {}).get("value")
            if qid and nome and url:
                todos.append({"qid": qid, "nome": nome, "url": url})
        if len(bindings) < PAGE_SIZE_SPARQL:
            break
        offset += PAGE_SIZE_SPARQL
        time.sleep(1)
    return todos


def baixar_extracts(titulos: list[str]) -> dict[str, str]:
    """
    Batch API: titles=A|B|C... devolve dict title_original -> extract.
    A API pode retornar com titulo normalizado/redirecionado - fazemos mapping.
    """
    if not titulos:
        return {}
    r = requests.get(WIKI_API, params={
        "action": "query",
        "prop": "extracts",
        "exintro": 1,
        "explaintext": 1,
        "titles": "|".join(titulos),
        "format": "json",
        "redirects": 1,
    }, headers=UA, timeout=30)
    if r.status_code != 200:
        return {}
    data = r.json().get("query", {})

    # Mapeamento de normalizacao: pedimos "X" e a API normalizou pra "Y"
    norm_map = {n["from"]: n["to"] for n in data.get("normalized", [])}
    redir_map = {n["from"]: n["to"] for n in data.get("redirects", [])}

    # title_final -> extract
    pages = data.get("pages", {})
    final_to_extract = {}
    for p in pages.values():
        t = p.get("title")
        e = p.get("extract") or ""
        if t and e:
            final_to_extract[t] = e

    # Agora volta do titulo original pro extract seguindo a cadeia
    result = {}
    for t_orig in titulos:
        t = norm_map.get(t_orig, t_orig)
        t = redir_map.get(t, t)
        if t in final_to_extract:
            result[t_orig] = final_to_extract[t]
    return result


def main() -> bool:
    if not test_connection():
        return False
    session = get_session()

    print("[match] carregando candidatos do banco...")
    rows = session.execute(text("""
        SELECT id, nome_completo, nome_urna FROM candidatos
        WHERE nome_completo IS NOT NULL
    """)).fetchall()

    # Mapa de id -> nome_completo para detectar "homonimo real" vs "mesma
    # pessoa com ids duplicados" (TSE cria um id por ciclo/eleicao)
    id_to_nc = {r.id: r.nome_completo for r in rows}

    idx: dict[str, list[int]] = {}
    for r in rows:
        if r.nome_completo:
            idx.setdefault(_norm(r.nome_completo), []).append(r.id)
        if r.nome_urna:
            k = _norm(r.nome_urna)
            if k and r.id not in idx.get(k, []):
                idx.setdefault(k, []).append(r.id)
    print(f"  {len(rows)} candidatos, {len(idx)} chaves de match")

    print("[wikidata] listando politicos BR com artigo na Wiki PT...")
    politicos = listar_politicos_br()
    print(f"  {len(politicos)} politicos com artigo")

    # Filtra pra apenas os que tem match no banco.
    # Agrupa IDs por nome_completo: se todos os IDs casados tem o MESMO
    # nome_completo, sao o mesmo politico (TSE duplica por ciclo) - atualiza
    # todos. Se tem nomes_completos diferentes, e homonimo real - ignora.
    alvo = []  # lista de dicts com "candidato_ids" (pode ser varios)
    ignorados_sem_match = 0
    ignorados_homonimo = 0
    for p in politicos:
        ids = idx.get(_norm(p["nome"]), [])
        if not ids:
            ignorados_sem_match += 1
            continue
        nomes_completos_distintos = {id_to_nc.get(i) for i in ids}
        if len(nomes_completos_distintos) > 1:
            # Homonimo REAL (nomes completos diferentes, so o de urna coincide)
            ignorados_homonimo += 1
            continue
        alvo.append({**p, "candidato_ids": ids})
    print(f"  {len(alvo)} com match, "
          f"{ignorados_sem_match} sem match, "
          f"{ignorados_homonimo} homonimos")

    # Baixa extracts em batch
    atualizados = 0
    erros = 0
    # Agrupar em batches de BATCH_EXTRACTS
    for i in range(0, len(alvo), BATCH_EXTRACTS):
        batch = alvo[i:i + BATCH_EXTRACTS]
        titulos = [_title_from_url(p["url"]) for p in batch]
        try:
            extracts = baixar_extracts(titulos)
        except Exception as e:
            print(f"  [erro batch {i}]: {e}")
            erros += len(batch)
            continue

        for p, titulo in zip(batch, titulos):
            bio = extracts.get(titulo)
            if not bio:
                continue
            # Corta em ~1500 chars (primeiros 1-2 paragrafos) e faz trim
            bio = bio.strip()
            if len(bio) > 1500:
                bio = bio[:1500].rsplit(".", 1)[0] + "."
            try:
                session.execute(
                    text("""
                        UPDATE candidatos
                        SET bio_resumida = :bio,
                            wikidata_qid = :qid,
                            wikipedia_url = :url
                        WHERE id = ANY(:ids)
                    """),
                    {"bio": bio, "qid": p["qid"], "url": p["url"],
                     "ids": p["candidato_ids"]},
                )
                atualizados += len(p["candidato_ids"])
            except Exception as e:
                erros += 1

        if (i + BATCH_EXTRACTS) % (BATCH_EXTRACTS * 5) == 0:
            session.commit()
            print(f"  [commit] {atualizados} candidatos atualizados")
        time.sleep(0.3)  # respeita Wikipedia API

    session.commit()
    print(f"\n=== Resumo ===")
    print(f"  Atualizados: {atualizados}")
    print(f"  Erros: {erros}")
    session.close()
    return True


if __name__ == "__main__":
    main()
