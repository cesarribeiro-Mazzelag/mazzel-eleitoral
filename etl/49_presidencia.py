"""
PASSO 49 - Atividade da Presidencia (Lula 1/2/3, Dilma, Temer, Bolsonaro)

Fonte: https://dadosabertos.camara.leg.br/api/v2/
Cobre atividade presidencial acessivel via API do Congresso:
  - MPV (Medidas Provisorias) - exclusividade presidencial
  - PL / PLP / PEC autorado por "Poder Executivo"
  - VETO ainda nao coberto (precisa scraping do Senado, fase 2)
  - DECRETO tambem fase 2 (DOU/Planalto)

Estrategia:
  1. Upsert mandatos_executivo pros 7 periodos presidenciais (Lula1..Lula3).
  2. Para cada ano do periodo:
     a. MPs:  /proposicoes?siglaTipo=MPV&ano=Y
     b. PLs:  /proposicoes?siglaTipo=PL&autor=Poder+Executivo&ano=Y
     c. PLPs: /proposicoes?siglaTipo=PLP&autor=Poder+Executivo&ano=Y
     d. PECs: /proposicoes?siglaTipo=PEC&autor=Poder+Executivo&ano=Y
  3. Pra cada proposicao, determinar qual presidente estava no cargo pela
     data de apresentacao e inserir em atos_executivo.
  4. Detalhe (situacao) via /proposicoes/{id} - pega so do ano corrente e
     anterior (antigas dificilmente mudam status).

Match candidato_id: best-effort por nome em candidatos.nome_completo,
cargo=PRESIDENTE, ano do TSE correspondente.

Execucao:
  python3 49_presidencia.py                 # tudo (2003-hoje)
  python3 49_presidencia.py --ano=2023      # so um ano
  python3 49_presidencia.py --no-detalhes   # pula statusProposicao (mais rapido)
"""
from __future__ import annotations
import sys
import time
from pathlib import Path
from datetime import date, datetime

import requests

sys.path.insert(0, str(Path(__file__).parent))
from db import get_session, test_connection
from sqlalchemy import text


API = "https://dadosabertos.camara.leg.br/api/v2"
TIMEOUT = 30
PAUSE = 0.15


# ── Mandatos presidenciais ────────────────────────────────────────────────────
# (nome_completo, nome_urna, partido, ano_inicio, ano_fim, ano_tse_eleicao)
PRESIDENTES = [
    ("LUIZ INACIO LULA DA SILVA",     "Lula",             "PT",    2003, 2006, 2002),
    ("LUIZ INACIO LULA DA SILVA",     "Lula",             "PT",    2007, 2010, 2006),
    ("DILMA VANA ROUSSEFF",           "Dilma",            "PT",    2011, 2014, 2010),
    ("DILMA VANA ROUSSEFF",           "Dilma",            "PT",    2015, 2016, 2014),  # interrompido em 31/08/2016
    ("MICHEL MIGUEL ELIAS TEMER LULIA","Michel Temer",    "MDB",   2016, 2018, None),  # assumiu vice
    ("JAIR MESSIAS BOLSONARO",        "Jair Bolsonaro",   "PL",    2019, 2022, 2018),
    ("LUIZ INACIO LULA DA SILVA",     "Lula",             "PT",    2023, 2026, 2022),
]


def presidente_em(data: date) -> tuple[str, str, int, int] | None:
    """Retorna (nome_completo, partido, ano_inicio, ano_fim) pro presidente
    em cargo na data informada. Lida com transicao Dilma→Temer em 2016.
    """
    for nome, _urna, partido, inicio, fim, _tse in PRESIDENTES:
        if not (inicio <= data.year <= fim):
            continue
        # transicao 31/08/2016 (impeachment Dilma)
        if data.year == 2016:
            if data.month < 9 and "DILMA" in nome:
                return (nome, partido, inicio, fim)
            if data.month >= 9 and "TEMER" in nome:
                return (nome, partido, inicio, fim)
            continue
        return (nome, partido, inicio, fim)
    return None


# ── HTTP ──────────────────────────────────────────────────────────────────────
def _get(url: str, params: dict | None = None, retries: int = 3) -> dict | None:
    for tentativa in range(retries):
        try:
            r = requests.get(url, params=params, timeout=TIMEOUT,
                             headers={"Accept": "application/json"})
            if r.status_code == 200:
                return r.json()
            if r.status_code in (429, 500, 502, 503):
                time.sleep(2 ** tentativa)
                continue
            return None
        except requests.RequestException:
            time.sleep(2 ** tentativa)
    return None


def listar_proposicoes(sigla: str, ano: int, autor: str | None = None) -> list[dict]:
    """Lista todas proposicoes de um tipo/ano, com paginacao."""
    out: list[dict] = []
    pagina = 1
    while True:
        params = {
            "siglaTipo": sigla,
            "ano": ano,
            "ordem": "ASC",
            "ordenarPor": "id",
            "itens": 100,
            "pagina": pagina,
        }
        if autor:
            params["autor"] = autor
        data = _get(f"{API}/proposicoes", params)
        if not data or not data.get("dados"):
            break
        out.extend(data["dados"])
        if len(data["dados"]) < 100:
            break
        pagina += 1
        time.sleep(PAUSE)
    return out


def buscar_detalhe(id_prop: int) -> dict | None:
    data = _get(f"{API}/proposicoes/{id_prop}")
    return (data or {}).get("dados")


# ── DB ────────────────────────────────────────────────────────────────────────
def upsert_mandato_presidente(session, nome: str, nome_urna: str, partido: str,
                               inicio: int, fim: int, ano_tse: int | None) -> int:
    """Upsert mandato_executivo e match candidato por nome_completo."""
    candidato_id = None
    if ano_tse:
        res = session.execute(text("""
            SELECT c.id
            FROM candidatos c
            JOIN candidaturas ca ON ca.candidato_id = c.id
            WHERE ca.ano = :ano
              AND ca.cargo = 'PRESIDENTE'
              AND UPPER(unaccent(c.nome_completo)) = UPPER(unaccent(:nome))
            ORDER BY c.id DESC
            LIMIT 1
        """), {"ano": ano_tse, "nome": nome})
        row = res.fetchone()
        if row:
            candidato_id = row[0]

    res = session.execute(text("""
        INSERT INTO mandatos_executivo
            (cargo, candidato_id, nome, nome_completo, partido_sigla,
             ano_inicio, ano_fim, ativo, atualizado_em)
        VALUES
            ('PRESIDENTE', :cid, :nome, :nome_comp, :partido,
             :inicio, :fim, true, NOW())
        ON CONFLICT (cargo, ano_inicio, nome) DO UPDATE SET
            candidato_id  = COALESCE(EXCLUDED.candidato_id, mandatos_executivo.candidato_id),
            partido_sigla = EXCLUDED.partido_sigla,
            ano_fim       = EXCLUDED.ano_fim,
            atualizado_em = NOW()
        RETURNING id
    """), {
        "cid": candidato_id,
        "nome": nome_urna[:200],
        "nome_comp": nome[:300],
        "partido": partido[:20],
        "inicio": inicio,
        "fim": fim,
    })
    return res.fetchone()[0]


TIPO_MAP = {
    "MPV": "MP",
    "PL":  "PL_EXECUTIVO",
    "PLP": "PLP_EXECUTIVO",
    "PEC": "PEC_EXECUTIVO",
}


def upsert_ato(session, mandato_id: int, tipo_api: str, prop: dict,
               detalhe: dict | None = None) -> None:
    tipo_db = TIPO_MAP.get(tipo_api)
    if not tipo_db:
        return

    data_apres_str = prop.get("dataApresentacao")
    data_apres = None
    if data_apres_str:
        try:
            data_apres = datetime.fromisoformat(data_apres_str.split("T")[0]).date()
        except (ValueError, TypeError):
            pass

    situacao = None
    aprovada = None
    url = None
    if detalhe:
        sp = detalhe.get("statusProposicao") or {}
        situacao = sp.get("descricaoSituacao")
        url = sp.get("url")
        if situacao:
            # heuristica simples pra MP/PL
            situ_l = situacao.lower()
            if ("convertida em lei" in situ_l or "transformad" in situ_l
                    or "norma jurid" in situ_l or "norma juríd" in situ_l
                    or "aprovad" in situ_l or "sancionad" in situ_l):
                aprovada = True
            elif ("rejeitad" in situ_l or "perdeu a eficacia" in situ_l
                  or "perdeu a eficácia" in situ_l or "arquivad" in situ_l
                  or "vetad" in situ_l):
                aprovada = False

    session.execute(text("""
        INSERT INTO atos_executivo
            (mandato_id, tipo, id_externo, numero, ano,
             data_apresentacao, ementa, situacao, aprovada, url, fonte)
        VALUES
            (:mid, :tipo, :id_ext, :numero, :ano,
             :data, :ementa, :situacao, :aprovada, :url, 'CAMARA_FEDERAL')
        ON CONFLICT (tipo, id_externo) DO UPDATE SET
            mandato_id        = EXCLUDED.mandato_id,
            ementa            = EXCLUDED.ementa,
            situacao          = EXCLUDED.situacao,
            aprovada          = EXCLUDED.aprovada,
            url               = EXCLUDED.url,
            data_apresentacao = EXCLUDED.data_apresentacao
    """), {
        "mid": mandato_id,
        "tipo": tipo_db,
        "id_ext": str(prop["id"]),
        "numero": prop.get("numero"),
        "ano": prop.get("ano"),
        "data": data_apres,
        "ementa": (prop.get("ementa") or "")[:5000] or None,
        "situacao": situacao[:100] if situacao else None,
        "aprovada": aprovada,
        "url": url,
    })


# ── Main ──────────────────────────────────────────────────────────────────────
def main(ano_unico: int | None = None, sem_detalhe: bool = False) -> None:
    print("=== Passo 49 - Atividade da Presidencia ===\n")
    if not test_connection():
        return

    session = get_session()

    print("[1/2] Upserting mandatos presidenciais...")
    mandatos_por_presidente: dict[tuple[str, int], int] = {}
    n_matched = 0
    for nome, nome_urna, partido, inicio, fim, ano_tse in PRESIDENTES:
        mid = upsert_mandato_presidente(session, nome, nome_urna, partido, inicio, fim, ano_tse)
        mandatos_por_presidente[(nome, inicio)] = mid
        res = session.execute(text("SELECT candidato_id FROM mandatos_executivo WHERE id = :id"),
                              {"id": mid})
        if res.fetchone()[0]:
            n_matched += 1
    session.commit()
    print(f"  {len(PRESIDENTES)} mandatos · {n_matched} matched com TSE ({100*n_matched/len(PRESIDENTES):.0f}%)\n")

    # Resolve data→mandato_id usando presidente_em()
    def mandato_para(data: date) -> int | None:
        info = presidente_em(data)
        if not info:
            return None
        nome, _partido, inicio, _fim = info
        return mandatos_por_presidente.get((nome, inicio))

    # Anos a processar
    anos_processar = [ano_unico] if ano_unico else list(range(2003, date.today().year + 1))

    print(f"[2/2] Buscando atos no range {anos_processar[0]}-{anos_processar[-1]} ({len(anos_processar)} anos)...")
    total_atos = 0
    por_tipo: dict[str, int] = {"MPV": 0, "PL": 0, "PLP": 0, "PEC": 0}

    for ano in anos_processar:
        for sigla in ["MPV", "PL", "PLP", "PEC"]:
            autor = None if sigla == "MPV" else "Poder Executivo"
            try:
                props = listar_proposicoes(sigla, ano, autor)
            except Exception as e:
                print(f"  [erro {sigla}/{ano}] {e}")
                continue

            for p in props:
                d_str = p.get("dataApresentacao")
                if not d_str:
                    continue
                try:
                    d = datetime.fromisoformat(d_str.split("T")[0]).date()
                except Exception:
                    continue
                mid = mandato_para(d)
                if not mid:
                    continue

                detalhe = None
                # pega detalhe pros mandatos recentes (Lula 3, Bolsonaro) onde
                # status ainda esta mudando. Antes de 2019 raramente muda.
                if not sem_detalhe and ano >= 2019:
                    try:
                        detalhe = buscar_detalhe(p["id"])
                        time.sleep(PAUSE)
                    except Exception:
                        pass

                try:
                    upsert_ato(session, mid, sigla, p, detalhe)
                    total_atos += 1
                    por_tipo[sigla] += 1
                except Exception as e:
                    print(f"  [erro upsert {sigla} {p.get('id')}] {e}")
                    session.rollback()

            session.commit()
            print(f"  [{ano}] {sigla:3}: {len(props):4d} proposicoes", flush=True)

    session.close()
    print(f"\n[done] Total {total_atos} atos executivos")
    for k, v in por_tipo.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    ano_unico = None
    sem_detalhe = "--no-detalhes" in sys.argv
    for arg in sys.argv[1:]:
        if arg.startswith("--ano="):
            ano_unico = int(arg.split("=")[1])
    main(ano_unico=ano_unico, sem_detalhe=sem_detalhe)
