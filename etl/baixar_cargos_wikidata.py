"""
Script: baixa cargos publicos historicos via Wikidata SPARQL, e faz match
com candidatos do banco por nome_completo.

Query: pega todas as P39 (position held) de pessoas com P27=Q155 (Brasil)
e P106=Q82955 (politician). Retorna ~16k statements.

Match: normaliza nome (UPPER + strip acentos) e compara. Em caso de
homonimo, ignora (nao inserir - prefere precisao).

Idempotente via UNIQUE(candidato_id, cargo, orgao, inicio).
"""
from __future__ import annotations
import sys
import time
import unicodedata
from datetime import date
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

from sqlalchemy import text
from db import get_session, test_connection


SPARQL = "https://query.wikidata.org/sparql"
HEADERS = {
    "User-Agent": "UBElectoralPlatform/1.0 (+contato@uniaobrasil.org.br)",
    "Accept": "application/sparql-results+json",
}

# Cada pagina ~5k linhas pra nao estourar timeout de 60s do endpoint
PAGE_SIZE = 5000


QUERY = """
SELECT ?p ?pLabel ?nasc ?cargo ?cargoLabel ?orgao ?orgaoLabel ?ini ?fim WHERE {{
  ?p wdt:P27 wd:Q155 ;
     wdt:P106 wd:Q82955 ;
     p:P39 ?stmt .
  ?stmt ps:P39 ?cargo .
  OPTIONAL {{ ?stmt pq:P580 ?ini . }}
  OPTIONAL {{ ?stmt pq:P582 ?fim . }}
  OPTIONAL {{ ?stmt pq:P642 ?orgao . }}
  OPTIONAL {{ ?p wdt:P569 ?nasc . }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "pt,en". }}
}}
ORDER BY ?p
LIMIT {limit} OFFSET {offset}
"""


def _normalizar(nome: str) -> str:
    """UPPER sem acentos pra match robusto."""
    if not nome:
        return ""
    nfd = unicodedata.normalize("NFD", nome.upper())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn").strip()


def _parse_iso_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    # Wikidata retorna ISO 8601 as "+YYYY-MM-DDT00:00:00Z"
    try:
        s = s.lstrip("+").split("T")[0]
        y, m, d = s.split("-")
        # Datas sem dia/mes: "01"
        return date(int(y), max(1, int(m)), max(1, int(d)))
    except Exception:
        return None


def _infer_esfera(cargo: str) -> tuple[Optional[str], Optional[str]]:
    """
    Infere esfera (federal/estadual/municipal) e UF a partir do label do cargo.
    Ex: 'deputado federal pelo Maranhão' -> (federal, MA)
        'governador do Rio' -> (estadual, RJ)
        'prefeito de Sao Paulo' -> (municipal, None)
        'ministro da Fazenda' -> (federal, None)
    """
    low = cargo.lower()
    # UFs por nome (parcial)
    UF_NOMES = {
        "acre": "AC", "alagoas": "AL", "amapá": "AP", "amapa": "AP",
        "amazonas": "AM", "bahia": "BA", "ceará": "CE", "ceara": "CE",
        "distrito federal": "DF", "espírito santo": "ES", "espirito santo": "ES",
        "goiás": "GO", "goias": "GO", "maranhão": "MA", "maranhao": "MA",
        "mato grosso do sul": "MS", "mato grosso": "MT",
        "minas gerais": "MG", "pará": "PA", "para": "PA", "paraíba": "PB", "paraiba": "PB",
        "paraná": "PR", "parana": "PR", "pernambuco": "PE", "piauí": "PI", "piaui": "PI",
        "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS",
        "rondônia": "RO", "rondonia": "RO", "roraima": "RR", "santa catarina": "SC",
        "são paulo": "SP", "sao paulo": "SP", "sergipe": "SE", "tocantins": "TO",
    }
    uf = None
    for nome, sigla in UF_NOMES.items():
        if nome in low:
            uf = sigla
            break

    federal_kw = ("federal", "ministro", "ministra", "senador", "senadora",
                  "presidente do brasil", "president of brazil", "supremo")
    estadual_kw = ("estadual", "governador", "governadora", "vice-governador",
                   "secretário de estado", "secretaria de estado")
    municipal_kw = ("municipal", "prefeito", "prefeita", "vice-prefeito",
                    "vereador", "vereadora", "secretário municipal")

    if any(k in low for k in federal_kw):
        return "federal", uf
    if any(k in low for k in estadual_kw):
        return "estadual", uf
    if any(k in low for k in municipal_kw):
        return "municipal", uf
    return None, uf


def baixar_paginado() -> list[dict]:
    """Pagina SPARQL ate esgotar. Retorna lista de binding dicts."""
    todos = []
    offset = 0
    while True:
        q = QUERY.format(limit=PAGE_SIZE, offset=offset)
        try:
            r = requests.get(SPARQL, params={"query": q, "format": "json"},
                             headers=HEADERS, timeout=120)
            if r.status_code != 200:
                print(f"  [erro] offset={offset} status={r.status_code}")
                break
            bindings = r.json().get("results", {}).get("bindings", [])
            print(f"  [wikidata] offset={offset} -> {len(bindings)} linhas")
            todos.extend(bindings)
            if len(bindings) < PAGE_SIZE:
                break
            offset += PAGE_SIZE
            time.sleep(1)
        except Exception as e:
            print(f"  [erro] offset={offset}: {e}")
            break
    return todos


def main(dry_run: bool = False) -> bool:
    if not test_connection():
        return False
    session = get_session()

    # Indice candidato por nome normalizado (aceita homonimo: lista)
    print("[match] carregando candidatos do banco...")
    rows = session.execute(text("""
        SELECT id, nome_completo FROM candidatos WHERE nome_completo IS NOT NULL
    """)).fetchall()
    idx: dict[str, list[int]] = {}
    for r in rows:
        k = _normalizar(r.nome_completo)
        idx.setdefault(k, []).append(r.id)
    print(f"  {len(rows)} candidatos, {len(idx)} nomes unicos")

    print("[wikidata] baixando paginas...")
    bindings = baixar_paginado()
    print(f"[wikidata] total: {len(bindings)} statements")

    inseridos = 0
    ignorados_sem_match = 0
    ignorados_homonimo = 0
    ignorados_duplicata = 0

    for b in bindings:
        nome = b.get("pLabel", {}).get("value")
        cargo = b.get("cargoLabel", {}).get("value")
        if not nome or not cargo:
            continue
        k = _normalizar(nome)
        ids = idx.get(k, [])
        if not ids:
            ignorados_sem_match += 1
            continue
        if len(ids) > 1:
            # Homonimo - pular (sem foto/nascimento pra desambiguar com confianca)
            ignorados_homonimo += 1
            continue
        candidato_id = ids[0]

        orgao = b.get("orgaoLabel", {}).get("value")
        ini = _parse_iso_date(b.get("ini", {}).get("value"))
        fim = _parse_iso_date(b.get("fim", {}).get("value"))
        esfera, uf = _infer_esfera(cargo)
        wd_url = b.get("p", {}).get("value", "")

        if dry_run:
            inseridos += 1
            continue

        try:
            session.execute(
                text("""
                    INSERT INTO cargos_publicos_historico
                        (candidato_id, cargo, orgao, esfera, uf,
                         inicio, fim, fonte, fonte_ref)
                    VALUES (:cid, :cargo, :org, :esf, :uf,
                            :ini, :fim, 'wikidata', :ref)
                    ON CONFLICT (candidato_id, cargo, orgao, inicio) DO NOTHING
                """),
                {"cid": candidato_id, "cargo": cargo[:300],
                 "org": orgao[:300] if orgao else None,
                 "esf": esfera, "uf": uf, "ini": ini, "fim": fim,
                 "ref": wd_url},
            )
            inseridos += 1
            if inseridos % 500 == 0:
                session.commit()
                print(f"  [commit] {inseridos} insercoes")
        except Exception as e:
            ignorados_duplicata += 1

    if not dry_run:
        session.commit()
    session.close()
    print(f"\n=== Resumo ===")
    print(f"  Inseridos (ou que cairiam em match): {inseridos}")
    print(f"  Ignorados sem match no banco:         {ignorados_sem_match}")
    print(f"  Ignorados por homonimo:               {ignorados_homonimo}")
    print(f"  Ignorados duplicata/erro:             {ignorados_duplicata}")
    return True


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    main(dry_run=dry)
