"""
Script: baixa CEAF (Cadastro de Expulsoes da Administracao Federal) via API
CGU. Mesma logica de match que CEIS - apenas pessoa fisica, nome unico.

CEAF registra servidores publicos federais demitidos, cassados por
improbidade ou exonerados a bem do servico publico.
"""
from __future__ import annotations
import sys
import time
import unicodedata
from datetime import date, datetime
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


API = "https://api.portaldatransparencia.gov.br/api-de-dados/ceaf"
ENV_FILE = Path.home() / ".env.cgu_key"


def _load_key() -> str:
    if not ENV_FILE.exists():
        print(f"[erro] {ENV_FILE} nao existe")
        sys.exit(1)
    for line in ENV_FILE.read_text().splitlines():
        if line.startswith("CGU_API_KEY="):
            return line.split("=", 1)[1].strip()
    sys.exit(1)


def _norm(s: str) -> str:
    if not s: return ""
    nfd = unicodedata.normalize("NFD", s.upper())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn").strip()


def _parse_date(s: Optional[str]) -> Optional[date]:
    if not s or s == "Sem informação":
        return None
    try:
        return datetime.strptime(s, "%d/%m/%Y").date()
    except ValueError:
        return None


def main() -> bool:
    if not test_connection():
        return False

    api_key = _load_key()
    headers = {"chave-api-dados": api_key, "Accept": "application/json"}

    session = get_session()

    print("[match] carregando candidatos...")
    rows = session.execute(text("""
        SELECT id, nome_completo FROM candidatos WHERE nome_completo IS NOT NULL
    """)).fetchall()
    id_to_nc = {r.id: r.nome_completo for r in rows}
    idx: dict[str, list[int]] = {}
    for r in rows:
        if r.nome_completo:
            idx.setdefault(_norm(r.nome_completo), []).append(r.id)
    print(f"  {len(rows)} candidatos")

    pagina = 1
    total = 0
    match = 0
    inseridos = 0
    homonimo = 0
    erros_ins = 0
    _first_err_printed = {"v": False}

    print("[ceaf] baixando...")
    while True:
        r = requests.get(API, params={"pagina": pagina}, headers=headers, timeout=30)
        if r.status_code == 429:
            print(f"  [rate limit] esperando 60s...")
            time.sleep(60)
            continue
        if r.status_code != 200:
            print(f"  [erro] pagina {pagina} status {r.status_code}")
            break
        lista = r.json()
        if not lista:
            break
        total += len(lista)

        for item in lista:
            pessoa = item.get("pessoa") or {}
            tipo = (pessoa.get("tipo") or "").lower()
            if "fisica" not in tipo and "física" not in tipo:
                continue
            nome = pessoa.get("nome") or (item.get("punicao") or {}).get("nomePunido") or ""
            if not nome:
                continue

            ids = idx.get(_norm(nome), [])
            if not ids:
                continue
            ncs = {id_to_nc.get(i) for i in ids}
            if len(ncs) > 1:
                homonimo += 1
                continue

            match += 1

            tipo_pun = (item.get("tipoPunicao") or {}).get("descricao")
            orgao = (item.get("orgaoLotacao") or {}).get("nome")
            punicao = item.get("punicao") or {}
            fund = f"Portaria {punicao.get('portaria','')} - Processo {punicao.get('processo','')}"

            params_ins = {
                "fonte": "CEAF",
                "id_externo": str(item.get("id")),
                "tipo_sancao": (tipo_pun or "")[:300] or None,
                "descricao": tipo_pun,
                "orgao_sancionador": (orgao or "")[:300] or None,
                "fundamentacao": fund,
                "cpf_mascarado": (pessoa.get("cpfFormatado") or "")[:20] or None,
                "data_inicio": _parse_date(item.get("dataPublicacao")),
                "data_fim": None,  # CEAF e permanente
                "data_publicacao": _parse_date(item.get("dataPublicacao")),
                "ativa": True,
                "link_publicacao": None,
            }

            cid = ids[0]
            try:
                savepoint = session.begin_nested()
                session.execute(
                    text("""
                        INSERT INTO sancoes_administrativas
                            (candidato_id, fonte, id_externo, tipo_sancao,
                             descricao, orgao_sancionador, fundamentacao,
                             cpf_mascarado, data_inicio, data_fim,
                             data_publicacao, ativa, link_publicacao)
                        VALUES
                            (:cid, :fonte, :id_externo, :tipo_sancao,
                             :descricao, :orgao_sancionador, :fundamentacao,
                             :cpf_mascarado, :data_inicio, :data_fim,
                             :data_publicacao, :ativa, :link_publicacao)
                        ON CONFLICT (fonte, id_externo) DO NOTHING
                    """),
                    {**params_ins, "cid": cid},
                )
                savepoint.commit()
                inseridos += 1
            except Exception as e:
                try: savepoint.rollback()
                except Exception: pass
                if not _first_err_printed["v"]:
                    _first_err_printed["v"] = True
                    print(f"  [erro insert] pag={pagina} nome={nome!r}: "
                          f"{type(e).__name__}: {str(e)[:300]}")
                erros_ins += 1

        if pagina % 20 == 0:
            session.commit()
            print(f"  [pag {pagina}] total={total} match={match} ins={inseridos}")
        pagina += 1
        time.sleep(0.8)

    session.commit()
    session.close()
    print(f"\n=== Resumo CEAF ===")
    print(f"  Paginas:    {pagina - 1}")
    print(f"  Sancoes:    {total}")
    print(f"  Match:      {match}")
    print(f"  Inseridos:  {inseridos}")
    print(f"  Erros:      {erros_ins}")
    print(f"  Homonimos:  {homonimo}")
    return True


if __name__ == "__main__":
    main()
