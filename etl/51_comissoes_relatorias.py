"""
PASSO 51 - Comissoes Parlamentares + Relatorias (Senado + Camara Federal)

Aprofunda atividade legislativa:
  - Comissoes: CCJ, CPI, Educacao, etc - com cargo (Titular/Presidente/Relator)
  - Relatorias: materias onde o parlamentar foi designado relator

Fontes:
  - Senado: /senador/{id}/comissoes + /senador/{id}/relatorias (XML)
  - Camara: /deputados/{id}/orgaos (JSON)

Paralelismo: ThreadPoolExecutor com 10 workers (amigavel com rate limits).

Execucao:
  python3 51_comissoes_relatorias.py            # ambos
  python3 51_comissoes_relatorias.py --senado   # so Senado
  python3 51_comissoes_relatorias.py --camara   # so Camara
"""
from __future__ import annotations
import sys
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
from db import get_session, test_connection
from sqlalchemy import text


SENADO_BASE = "https://legis.senado.leg.br/dadosabertos"
CAMARA_BASE = "https://dadosabertos.camara.leg.br/api/v2"
TIMEOUT = 30
MAX_WORKERS = 10


# ── HTTP ──────────────────────────────────────────────────────────────────
def _get(url: str, headers: dict | None = None, retries: int = 3) -> requests.Response | None:
    for tentativa in range(retries):
        try:
            r = requests.get(url, headers=headers or {}, timeout=TIMEOUT)
            if r.status_code == 200:
                return r
            if r.status_code in (429, 500, 502, 503):
                time.sleep(2 ** tentativa)
                continue
            return None
        except requests.RequestException:
            time.sleep(2 ** tentativa)
    return None


# ── Senado ────────────────────────────────────────────────────────────────
def buscar_senado_comissoes(codigo: str) -> list[dict]:
    """Retorna lista de dicts de comissoes de um senador."""
    r = _get(f"{SENADO_BASE}/senador/{codigo}/comissoes")
    if not r:
        return []
    try:
        root = ET.fromstring(r.content)
    except ET.ParseError:
        return []

    out = []
    for c in root.iter("Comissao"):
        ident = c.find("IdentificacaoComissao")
        if ident is None:
            continue
        out.append({
            "id_ext": (ident.findtext("CodigoComissao") or "").strip(),
            "sigla": (ident.findtext("SiglaComissao") or "").strip()[:30],
            "nome":  (ident.findtext("NomeComissao") or "").strip()[:500],
            "sigla_casa": (ident.findtext("SiglaCasaComissao") or "").strip()[:10],
            "cargo": (c.findtext("DescricaoParticipacao") or "").strip()[:50],
            "data_inicio": (c.findtext("DataInicio") or "").strip(),
            "data_fim":    (c.findtext("DataFim") or "").strip(),
        })
    return out


def buscar_senado_relatorias(codigo: str) -> list[dict]:
    """Retorna lista de matérias onde o senador foi relator."""
    r = _get(f"{SENADO_BASE}/senador/{codigo}/relatorias")
    if not r:
        return []
    try:
        root = ET.fromstring(r.content)
    except ET.ParseError:
        return []

    out = []
    for rel in root.iter("Relatoria"):
        materia = rel.find("Materia")
        comissao = rel.find("Comissao")
        if materia is None:
            continue
        out.append({
            "codigo_materia": (materia.findtext("Codigo") or "").strip(),
            "identificacao": (materia.findtext("DescricaoIdentificacao") or "").strip(),
            "sigla": (materia.findtext("Sigla") or "").strip(),
            "numero": (materia.findtext("Numero") or "").strip(),
            "ano": (materia.findtext("Ano") or "").strip(),
            "ementa": (materia.findtext("Ementa") or "").strip(),
            "data_designacao": (rel.findtext("DataDesignacao") or "").strip(),
            "data_destituicao": (rel.findtext("DataDestituicao") or "").strip(),
            "tipo_relator": (rel.findtext("DescricaoTipoRelator") or "").strip(),
            "comissao_nome": comissao.findtext("Nome", "").strip() if comissao is not None else "",
        })
    return out


# ── Camara Federal ────────────────────────────────────────────────────────
def buscar_camara_orgaos(id_dep: str) -> list[dict]:
    """Retorna lista de comissoes/frentes/orgaos do deputado.
    Itera paginado (alguns deputados tem 50+ participacoes).
    """
    all_orgaos = []
    pagina = 1
    while True:
        r = _get(f"{CAMARA_BASE}/deputados/{id_dep}/orgaos?itens=100&pagina={pagina}",
                 headers={"Accept": "application/json"})
        if not r:
            break
        try:
            data = r.json()
        except Exception:
            break
        dados = data.get("dados") or []
        if not dados:
            break
        all_orgaos.extend(dados)
        if len(dados) < 100:
            break
        pagina += 1
    return all_orgaos


# ── DB helpers ────────────────────────────────────────────────────────────
def carregar_mandatos(session, casa: str) -> list[tuple[int, str, str]]:
    """Retorna [(mandato_id, id_externo, nome)]."""
    sql = "SELECT id, id_externo, nome FROM mandatos_legislativo WHERE casa = :casa"
    rows = session.execute(text(sql), {"casa": casa}).mappings().all()
    return [(r["id"], r["id_externo"], r["nome"]) for r in rows]


def parse_date(s: str) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s[:10]).date()
    except (ValueError, TypeError):
        return None


def upsert_comissao(session, mandato_id: int, casa: str, c: dict) -> None:
    """Insere ou atualiza uma participacao em comissao."""
    di = parse_date(c.get("data_inicio", ""))
    df = parse_date(c.get("data_fim", ""))
    if not c.get("id_ext"):
        return

    session.execute(text("""
        INSERT INTO comissoes_parlamentar
            (mandato_id, casa, id_externo_orgao, sigla_comissao, nome_comissao,
             sigla_casa, cargo, data_inicio, data_fim)
        VALUES
            (:mid, :casa, :id_ext, :sigla, :nome, :sigla_casa, :cargo, :di, :df)
        ON CONFLICT (mandato_id, id_externo_orgao, data_inicio) DO UPDATE SET
            cargo = EXCLUDED.cargo,
            data_fim = EXCLUDED.data_fim,
            nome_comissao = EXCLUDED.nome_comissao
    """), {
        "mid": mandato_id,
        "casa": casa,
        "id_ext": c["id_ext"],
        "sigla": c.get("sigla"),
        "nome": c.get("nome"),
        "sigla_casa": c.get("sigla_casa"),
        "cargo": c.get("cargo"),
        "di": di,
        "df": df,
    })


def atualizar_relator(session, mandato_id: int, rel: dict) -> int:
    """Associa relator a propositiva existente em proposicoes_legislativo.
    Retorna 1 se encontrou match, 0 caso contrario.
    """
    codigo = rel.get("codigo_materia")
    if not codigo:
        return 0
    data_desig = parse_date(rel.get("data_designacao", ""))

    res = session.execute(text("""
        UPDATE proposicoes_legislativo
        SET relator_mandato_id = :mid,
            data_designacao_relator = :dd,
            comissao_relatoria = :com
        WHERE casa = 'SENADO' AND id_externo = :codigo
    """), {
        "mid": mandato_id,
        "dd": data_desig,
        "com": (rel.get("comissao_nome") or "")[:150] or None,
        "codigo": codigo,
    })
    return res.rowcount or 0


# ── Main per casa ─────────────────────────────────────────────────────────
def processar_senado(session) -> tuple[int, int, int]:
    """Retorna (n_senadores, n_comissoes, n_relatorias_matched)."""
    mandatos = carregar_mandatos(session, "SENADO")
    print(f"  {len(mandatos)} senadores a processar...")

    n_com = 0
    n_rel = 0
    processados = 0

    def _fetch(mandato):
        mid, cod, nome = mandato
        comissoes = buscar_senado_comissoes(cod)
        relatorias = buscar_senado_relatorias(cod)
        return (mid, nome, comissoes, relatorias)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = [ex.submit(_fetch, m) for m in mandatos]
        for fut in as_completed(futures):
            try:
                mid, nome, comissoes, relatorias = fut.result()
            except Exception as e:
                print(f"  [erro] {e}")
                continue

            try:
                for c in comissoes:
                    upsert_comissao(session, mid, "SENADO", c)
                    n_com += 1
                for r in relatorias:
                    n_rel += atualizar_relator(session, mid, r)
                session.commit()
            except Exception as e:
                print(f"  [db {nome}] {e}")
                session.rollback()

            processados += 1
            if processados % 10 == 0:
                print(f"    [{processados}/{len(mandatos)}] · {n_com} comissoes · {n_rel} relatorias", flush=True)

    return (len(mandatos), n_com, n_rel)


def processar_camara(session) -> tuple[int, int]:
    """Retorna (n_deputados, n_comissoes)."""
    mandatos = carregar_mandatos(session, "CAMARA")
    print(f"  {len(mandatos)} deputados a processar...")

    n_com = 0
    processados = 0

    def _fetch(mandato):
        mid, id_ext, nome = mandato
        orgaos = buscar_camara_orgaos(id_ext)
        return (mid, nome, orgaos)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = [ex.submit(_fetch, m) for m in mandatos]
        for fut in as_completed(futures):
            try:
                mid, nome, orgaos = fut.result()
            except Exception as e:
                print(f"  [erro] {e}")
                continue

            try:
                for o in orgaos:
                    c = {
                        "id_ext": str(o.get("idOrgao") or ""),
                        "sigla": (o.get("siglaOrgao") or "")[:30],
                        "nome": (o.get("nomeOrgao") or "")[:500],
                        "sigla_casa": "CD",
                        "cargo": (o.get("titulo") or "")[:50],
                        "data_inicio": (o.get("dataInicio") or "")[:10],
                        "data_fim": (o.get("dataFim") or "")[:10] if o.get("dataFim") else "",
                    }
                    upsert_comissao(session, mid, "CAMARA", c)
                    n_com += 1
                session.commit()
            except Exception as e:
                print(f"  [db {nome}] {e}")
                session.rollback()

            processados += 1
            if processados % 50 == 0:
                print(f"    [{processados}/{len(mandatos)}] · {n_com} orgaos", flush=True)

    return (len(mandatos), n_com)


def main(so_senado: bool = False, so_camara: bool = False) -> None:
    print("=== Passo 51 - Comissoes Parlamentares + Relatorias ===\n")
    if not test_connection():
        return
    session = get_session()

    if not so_camara:
        print("[1/2] Senado (comissoes + relatorias)...")
        n_sen, n_com_sen, n_rel = processar_senado(session)
        print(f"  [done] {n_sen} senadores · {n_com_sen} comissoes · {n_rel} relatorias associadas\n")

    if not so_senado:
        print("[2/2] Camara Federal (orgaos)...")
        n_dep, n_com_cam = processar_camara(session)
        print(f"  [done] {n_dep} deputados · {n_com_cam} orgaos\n")

    session.close()


if __name__ == "__main__":
    so_senado = "--senado" in sys.argv
    so_camara = "--camara" in sys.argv
    main(so_senado=so_senado, so_camara=so_camara)
