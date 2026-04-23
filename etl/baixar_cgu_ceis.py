"""
Script: baixa CEIS (Cadastro de Empresas Inidoneas e Suspensas) da CGU via
API oficial do Portal da Transparencia.

Requer chave API em /Users/cesarribeiro/.env.cgu_key (CGU_API_KEY=xxx).

Match conservador: so aplica sancao a candidato quando:
  - pessoa fisica (nao empresa)
  - nome_completo casa com EXATAMENTE um politico unificado do banco

CPF da API vem mascarado (***.nnn.nnn-**), entao match so por nome.

Idempotente via UNIQUE(fonte, id_externo).
"""
from __future__ import annotations
import sys
import time
import os
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


API = "https://api.portaldatransparencia.gov.br/api-de-dados/ceis"
ENV_FILE = Path.home() / ".env.cgu_key"


def _load_key() -> str:
    """Le CGU_API_KEY de ~/.env.cgu_key."""
    if not ENV_FILE.exists():
        print(f"[erro] arquivo {ENV_FILE} nao existe")
        sys.exit(1)
    for line in ENV_FILE.read_text().splitlines():
        if line.startswith("CGU_API_KEY="):
            return line.split("=", 1)[1].strip()
    print(f"[erro] CGU_API_KEY nao encontrado em {ENV_FILE}")
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

    # Index candidatos por nome normalizado. Agrupa ids unificados por
    # nome_completo igual (TSE duplica por ciclo).
    print("[match] carregando candidatos...")
    rows = session.execute(text("""
        SELECT id, nome_completo, nome_urna FROM candidatos
        WHERE nome_completo IS NOT NULL
    """)).fetchall()
    id_to_nc = {r.id: r.nome_completo for r in rows}
    idx: dict[str, list[int]] = {}
    for r in rows:
        if r.nome_completo:
            idx.setdefault(_norm(r.nome_completo), []).append(r.id)
    print(f"  {len(rows)} candidatos, {len(idx)} chaves")

    pagina = 1
    total_sancoes = 0
    total_pessoa_fisica = 0
    total_match = 0
    total_inseridos = 0
    sem_match = 0
    homonimo = 0
    erros_ins = 0
    _first_err_printed = {"v": False}

    print("[ceis] baixando...")
    while True:
        r = requests.get(API, params={"pagina": pagina}, headers=headers, timeout=30)
        if r.status_code == 429:
            print(f"  [rate limit] pagina {pagina} - esperando 60s...")
            time.sleep(60)
            continue
        if r.status_code != 200:
            print(f"  [erro] pagina {pagina} status {r.status_code}: {r.text[:200]}")
            break
        lista = r.json()
        if not lista:
            break

        total_sancoes += len(lista)

        for item in lista:
            pessoa = item.get("pessoa") or {}
            tipo = (pessoa.get("tipo") or "").lower()
            if "fisica" not in tipo and "física" not in tipo:
                continue
            total_pessoa_fisica += 1

            nome = pessoa.get("nome") or ""
            if not nome:
                continue

            ids = idx.get(_norm(nome), [])
            if not ids:
                sem_match += 1
                continue

            # Se ids apontam pra nomes_completos diferentes, eh homonimo real
            ncs = {id_to_nc.get(i) for i in ids}
            if len(ncs) > 1:
                homonimo += 1
                continue

            total_match += 1

            # Dados estruturados
            tipo_sancao = (item.get("tipoSancao") or {}).get("descricaoResumida")
            orgao = (item.get("orgaoSancionador") or {}).get("nome") or \
                    (item.get("fonteSancao") or {}).get("nomeExibicao")
            data_ini = _parse_date(item.get("dataInicioSancao"))
            data_fim = _parse_date(item.get("dataFimSancao"))
            ativa = data_fim is None or data_fim >= date.today()

            # API retorna fundamentacao como lista de dicts {codigo, descricao}
            fund_raw = item.get("fundamentacao")
            if isinstance(fund_raw, list):
                fund_str = " | ".join(
                    (f.get("descricao") or f.get("codigo") or "")
                    for f in fund_raw if isinstance(f, dict)
                ) or None
            else:
                fund_str = fund_raw

            params_ins = {
                "fonte": "CEIS",
                "id_externo": str(item.get("id")),
                "tipo_sancao": (tipo_sancao or "")[:300] or None,
                "descricao": fund_str,
                "orgao_sancionador": (orgao or "")[:300] or None,
                "fundamentacao": fund_str,
                "cpf_mascarado": (pessoa.get("cpfFormatado") or "")[:20] or None,
                "data_inicio": data_ini,
                "data_fim": data_fim,
                "data_publicacao": _parse_date(item.get("dataPublicacaoSancao")),
                "ativa": ativa,
                "link_publicacao": item.get("linkPublicacao"),
            }

            # UNIQUE em (fonte, id_externo) - o mesmo id_externo CEIS so pode
            # ser associado a UM candidato. Usa o primeiro do grupo unificado.
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
                total_inseridos += 1
            except Exception as e:
                try: savepoint.rollback()
                except Exception: pass
                # Primeira exceção sempre imprime (pra nao silenciar bug em pag alta).
                # Depois so agrega contador.
                if not _first_err_printed["v"]:
                    _first_err_printed["v"] = True
                    print(f"  [erro insert] pag={pagina} nome={nome!r}: "
                          f"{type(e).__name__}: {str(e)[:300]}")
                erros_ins += 1

        if pagina % 50 == 0:
            session.commit()
            print(f"  [pag {pagina}] total_sancoes={total_sancoes} "
                  f"pessoa_fisica={total_pessoa_fisica} match={total_match} "
                  f"ins={total_inseridos}")

        pagina += 1
        time.sleep(0.8)  # ~75 req/min. CGU aceita 90/min no geral.

    session.commit()
    session.close()
    print(f"\n=== Resumo CEIS ===")
    print(f"  Paginas processadas: {pagina - 1}")
    print(f"  Sancoes no total:    {total_sancoes}")
    print(f"  Pessoas fisicas:     {total_pessoa_fisica}")
    print(f"  Match no banco:      {total_match}")
    print(f"  Inseridos:           {total_inseridos}")
    print(f"  Erros de insert:     {erros_ins}")
    print(f"  Sem match:           {sem_match}")
    print(f"  Homonimos ignorados: {homonimo}")
    return True


if __name__ == "__main__":
    main()
