"""
Script: baixa TCU Inabilitados da API publica oficial.

Fonte: https://contas.tcu.gov.br/ords/condenacao/consulta/inabilitados
Nao requer API key. Paginacao ORDS (offset/limit + hasMore).

TCU retorna CPF completo (diferente do Portal da Transparencia que mascara).
Match primario por cpf_hash (SHA256 dos digitos) = sem homonimo.
Fallback por nome_completo quando CPF nao bate (candidato pode ter hash
nao carregado se CSV TSE do ano do ato fiscal nao tinha aquele candidato).

Idempotente via UNIQUE(fonte, id_externo) = (TCU, processo+deliberacao).
"""
from __future__ import annotations
import sys
import time
import hashlib
import unicodedata
from pathlib import Path
from datetime import date, datetime
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

from sqlalchemy import text
from db import get_session, test_connection


API = "https://contas.tcu.gov.br/ords/condenacao/consulta/inabilitados"
LIMIT = 100  # ORDS aceita ate 10000 mas 100 reduz payload


def _norm(s: str) -> str:
    if not s: return ""
    nfd = unicodedata.normalize("NFD", s.upper())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn").strip()


def _hash_cpf(cpf: str) -> Optional[str]:
    if not cpf: return None
    digits = "".join(c for c in cpf if c.isdigit())
    if len(digits) < 11: return None
    return hashlib.sha256(digits.encode()).hexdigest()


def _parse_iso(s: Optional[str]) -> Optional[date]:
    if not s: return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def main() -> bool:
    if not test_connection():
        return False

    session = get_session()

    # Indexa candidatos por cpf_hash e por nome_norm (pra fallback)
    print("[match] carregando candidatos...")
    rows = session.execute(text("""
        SELECT id, nome_completo, cpf_hash FROM candidatos
        WHERE nome_completo IS NOT NULL
    """)).fetchall()
    id_to_nc = {r.id: r.nome_completo for r in rows}
    by_hash: dict[str, int] = {}
    by_name: dict[str, list[int]] = {}
    for r in rows:
        if r.cpf_hash and r.cpf_hash not in by_hash:
            by_hash[r.cpf_hash] = r.id
        by_name.setdefault(_norm(r.nome_completo), []).append(r.id)
    print(f"  {len(rows)} candidatos, {len(by_hash)} com cpf_hash, "
          f"{len(by_name)} chaves de nome")

    offset = 0
    total_api = 0
    match_cpf = 0
    match_nome = 0
    sem_match = 0
    homonimo = 0
    inseridos = 0
    erros_ins = 0
    _first_err_printed = {"v": False}

    print("[tcu] baixando...")
    while True:
        r = requests.get(API, params={"offset": offset, "limit": LIMIT}, timeout=30)
        if r.status_code != 200:
            print(f"  [erro api] offset={offset} status={r.status_code}: {r.text[:200]}")
            break
        data = r.json()
        items = data.get("items") or []
        if not items:
            break

        total_api += len(items)

        for item in items:
            nome = item.get("nome") or ""
            cpf = item.get("cpf") or ""
            if not nome:
                continue

            # Match primario: cpf_hash
            cid: Optional[int] = None
            via = None
            chash = _hash_cpf(cpf)
            if chash and chash in by_hash:
                cid = by_hash[chash]
                via = "cpf"
                match_cpf += 1
            else:
                # Fallback: nome (com filtro anti-homonimo)
                ids = by_name.get(_norm(nome), [])
                if ids:
                    ncs = {id_to_nc.get(i) for i in ids}
                    if len(ncs) > 1:
                        homonimo += 1
                        continue
                    cid = ids[0]
                    via = "nome"
                    match_nome += 1

            if cid is None:
                sem_match += 1
                continue

            # id_externo: processo + deliberacao (unicos no TCU)
            processo = (item.get("processo") or "").strip()
            delib = (item.get("deliberacao") or "").strip()
            id_externo = f"{processo}|{delib}"[:50] or None

            data_ini = _parse_iso(item.get("data_transito_julgado"))
            data_fim = _parse_iso(item.get("data_final"))
            data_pub = _parse_iso(item.get("data_acordao"))
            ativa = data_fim is None or data_fim >= date.today()

            orgao = "Tribunal de Contas da Uniao (TCU)"
            uf_mun = " - ".join(x for x in [item.get("uf"), item.get("municipio")] if x)
            fund = f"Processo {processo} / {delib}"
            if uf_mun:
                fund += f" ({uf_mun})"

            params_ins = {
                "cid": cid,
                "fonte": "TCU",
                "id_externo": id_externo,
                "tipo_sancao": "Inabilitacao para funcao de confianca",
                "descricao": f"Inabilitado pelo TCU via {delib}",
                "orgao_sancionador": orgao,
                "fundamentacao": fund,
                "cpf_mascarado": (cpf or "")[:20] or None,
                "data_inicio": data_ini,
                "data_fim": data_fim,
                "data_publicacao": data_pub,
                "ativa": ativa,
                "link_publicacao": None,
            }

            try:
                sp = session.begin_nested()
                session.execute(text("""
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
                """), params_ins)
                sp.commit()
                inseridos += 1
            except Exception as e:
                try: sp.rollback()
                except Exception: pass
                if not _first_err_printed["v"]:
                    _first_err_printed["v"] = True
                    print(f"  [erro insert] offset={offset} nome={nome!r} "
                          f"via={via}: {type(e).__name__}: {str(e)[:300]}")
                erros_ins += 1

        # Log de progresso a cada 10 paginas (~1000 items)
        if (offset // LIMIT) % 10 == 0 and offset > 0:
            session.commit()
            print(f"  [offset {offset}] api={total_api} "
                  f"match_cpf={match_cpf} match_nome={match_nome} "
                  f"ins={inseridos} sem_match={sem_match}")

        if not data.get("hasMore"):
            break
        offset += LIMIT
        time.sleep(0.3)  # API do TCU e tolerante, mas manter polidez

    session.commit()
    session.close()
    print(f"\n=== Resumo TCU Inabilitados ===")
    print(f"  Registros na API:    {total_api}")
    print(f"  Match via CPF hash:  {match_cpf}")
    print(f"  Match via nome:      {match_nome}")
    print(f"  Sem match:           {sem_match}")
    print(f"  Homonimos ignorados: {homonimo}")
    print(f"  Inseridos:           {inseridos}")
    print(f"  Erros de insert:     {erros_ins}")
    return True


if __name__ == "__main__":
    main()
