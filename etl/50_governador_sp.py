"""
PASSO 50 - Governador de SP (atividade legislativa enviada a ALESP)

Fonte: ALESP XMLs (mesmos de 48_alesp_deputados_estaduais.py).
Filtra proposituras com IdAutor=105 (Governador).

Cobertura historica:
  - Mario Covas / Geraldo Alckmin (PSDB) 1995-2006
  - Jose Serra (PSDB) 2007-2010
  - Geraldo Alckmin (PSDB) 2011-2018
  - Joao Doria / Rodrigo Garcia (PSDB) 2019-2022
  - Tarcisio de Freitas (REPUBLICANOS) 2023-2026

~19.820 proposituras historicas atribuidas ao "Governador" - mapeadas pro
governador em exercicio na data de apresentacao.

Limitacao: so SP por enquanto (dataset da ALESP). Outros estados seguem em
sprints separados (cada ALE tem seu XML/API).

Execucao:
  python3 50_governador_sp.py
"""
from __future__ import annotations
import io
import sys
import zipfile
import requests
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import date, datetime

sys.path.insert(0, str(Path(__file__).parent))
from db import get_session, test_connection
from sqlalchemy import text


BASE = "https://www.al.sp.gov.br/repositorioDados"
URL_NATUREZAS = f"{BASE}/processo_legislativo/naturezasSpl.xml"
URL_PROPOSITURAS_ZIP = f"{BASE}/processo_legislativo/proposituras.zip"
URL_DOCUMENTO_AUTOR_ZIP = f"{BASE}/processo_legislativo/documento_autor.zip"
TIMEOUT = 300

ID_AUTOR_GOVERNADOR = "105"
UF = "SP"


# Governadores SP (nome_completo, nome_urna, partido, inicio, fim, ano_tse)
GOVERNADORES = [
    ("MARIO COVAS JUNIOR",                     "Mario Covas",     "PSDB",         1995, 2001, 1998),
    ("GERALDO JOSE RODRIGUES ALCKMIN FILHO",   "Geraldo Alckmin", "PSDB",         2001, 2006, None),   # assumiu vice
    ("JOSE SERRA",                             "Jose Serra",      "PSDB",         2007, 2010, 2006),
    ("GERALDO JOSE RODRIGUES ALCKMIN FILHO",   "Geraldo Alckmin", "PSDB",         2011, 2014, 2010),
    ("GERALDO JOSE RODRIGUES ALCKMIN FILHO",   "Geraldo Alckmin", "PSDB",         2015, 2018, 2014),
    ("JOAO AGRIPINO DA COSTA DORIA JUNIOR",    "Joao Doria",      "PSDB",         2019, 2022, 2018),
    ("TARCISIO GOMES DE FREITAS",              "Tarcisio",        "REPUBLICANOS", 2023, 2026, 2022),
]


def governador_em(data: date) -> tuple[str, str, int, int] | None:
    """Retorna (nome_completo, partido, inicio, fim) pro governador na data."""
    # Alckmin assumiu 6/3/2001 depois da morte de Covas
    for nome, _urna, partido, inicio, fim, _tse in GOVERNADORES:
        if not (inicio <= data.year <= fim):
            continue
        # transicao Doria -> Rodrigo Garcia em 2/4/2022
        # (Joao Doria renunciou pra disputar presidencia, nao se elegeu - ignoro)
        return (nome, partido, inicio, fim)
    return None


def baixar_naturezas() -> dict[str, str]:
    r = requests.get(URL_NATUREZAS, timeout=TIMEOUT)
    r.raise_for_status()
    root = ET.fromstring(r.content)
    out = {}
    for n in root.iter("natureza"):
        _id = n.findtext("idNatureza", "").strip()
        _sg = n.findtext("sgNatureza", "").strip()
        if _id and _sg:
            out[_id] = _sg[:10]
    return out


def baixar_docs_do_governador() -> set[str]:
    """Stream documento_autor.zip e retorna set de IdDocumento cujo
    IdAutor == 105 (Governador)."""
    print(f"  [download] {URL_DOCUMENTO_AUTOR_ZIP}", flush=True)
    r = requests.get(URL_DOCUMENTO_AUTOR_ZIP, timeout=TIMEOUT)
    r.raise_for_status()
    print(f"  [download] {len(r.content)/1024/1024:.1f}MB OK", flush=True)

    zf = zipfile.ZipFile(io.BytesIO(r.content))
    name = zf.namelist()[0]
    print(f"  [parse] stream {name}...", flush=True)

    docs: set[str] = set()
    total = 0
    with zf.open(name) as f:
        for _ev, elem in ET.iterparse(f, events=("end",)):
            if elem.tag != "DocumentoAutor":
                continue
            total += 1
            if (elem.findtext("IdAutor") or "").strip() == ID_AUTOR_GOVERNADOR:
                id_doc = (elem.findtext("IdDocumento") or "").strip()
                if id_doc:
                    docs.add(id_doc)
            elem.clear()
            if total % 500_000 == 0:
                print(f"    · {total:,} lidos · {len(docs):,} do Governador", flush=True)
    print(f"  [parse] {total:,} registros · {len(docs):,} do Governador", flush=True)
    return docs


# ── Mandato matching ─────────────────────────────────────────────────────────
def upsert_mandato_governador(session, nome: str, nome_urna: str, partido: str,
                               inicio: int, fim: int, ano_tse: int | None) -> int:
    candidato_id = None
    if ano_tse:
        res = session.execute(text("""
            SELECT c.id FROM candidatos c
            JOIN candidaturas ca ON ca.candidato_id = c.id
            WHERE ca.ano = :ano AND ca.cargo = 'GOVERNADOR'
              AND ca.estado_uf = :uf
              AND UPPER(unaccent(c.nome_completo)) = UPPER(unaccent(:nome))
            ORDER BY c.id DESC LIMIT 1
        """), {"ano": ano_tse, "nome": nome, "uf": UF})
        row = res.fetchone()
        if row:
            candidato_id = row[0]

    res = session.execute(text("""
        INSERT INTO mandatos_executivo
            (cargo, candidato_id, nome, nome_completo, partido_sigla, uf,
             ano_inicio, ano_fim, ativo, atualizado_em)
        VALUES
            ('GOVERNADOR', :cid, :nome, :nome_comp, :partido, :uf,
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
        "uf": UF,
        "inicio": inicio,
        "fim": fim,
    })
    return res.fetchone()[0]


def tipo_db_de_sigla(sigla: str) -> str:
    if sigla == "PL":   return "PL_EXECUTIVO"
    if sigla == "PLC":  return "PLP_EXECUTIVO"  # SP: PLC = Projeto de Lei Complementar
    if sigla == "PEC":  return "PEC_EXECUTIVO"
    if sigla == "VET":  return "VETO"
    if sigla == "MSG":  return "MSG"
    return "MSG"


def inserir_proposituras(session, docs_gov: set[str], naturezas: dict[str, str],
                          mandatos: dict[int, int]) -> int:
    """mandatos = {ano_inicio: mandato_id}. Stream propositura, filtra os de
    Governador, acha mandato pela data de apresentacao, insere ato."""
    print(f"  [download] {URL_PROPOSITURAS_ZIP}", flush=True)
    r = requests.get(URL_PROPOSITURAS_ZIP, timeout=TIMEOUT)
    r.raise_for_status()
    print(f"  [download] {len(r.content)/1024/1024:.1f}MB OK", flush=True)

    zf = zipfile.ZipFile(io.BytesIO(r.content))
    name = zf.namelist()[0]
    print(f"  [parse] stream {name}...", flush=True)

    inserted = 0
    skipped_no_mandato = 0
    total = 0
    batch = 0
    with zf.open(name) as f:
        for _ev, elem in ET.iterparse(f, events=("end",)):
            if elem.tag != "propositura":
                continue
            total += 1
            id_doc = (elem.findtext("IdDocumento") or "").strip()
            if id_doc in docs_gov:
                dt_pub = (elem.findtext("DtPublicacao") or "").strip()
                data_apres = None
                if dt_pub:
                    try:
                        data_apres = datetime.fromisoformat(dt_pub.split("T")[0]).date()
                    except (ValueError, TypeError):
                        data_apres = None

                if not data_apres:
                    # fallback: AnoLegislativo
                    ano = (elem.findtext("AnoLegislativo") or "").strip()
                    try:
                        data_apres = date(int(ano), 7, 1)
                    except (ValueError, TypeError):
                        elem.clear()
                        continue

                info = governador_em(data_apres)
                if not info:
                    skipped_no_mandato += 1
                    elem.clear()
                    continue
                _nome, _partido, inicio, _fim = info
                mandato_id = mandatos.get(inicio)
                if not mandato_id:
                    skipped_no_mandato += 1
                    elem.clear()
                    continue

                id_natureza = (elem.findtext("IdNatureza") or "").strip()
                sigla = naturezas.get(id_natureza, "PL")
                tipo_db = tipo_db_de_sigla(sigla)

                ementa = (elem.findtext("Ementa") or "").strip()
                numero = (elem.findtext("NroLegislativo") or "").strip()
                ano = (elem.findtext("AnoLegislativo") or "").strip()
                try:
                    numero_int = int(numero) if numero else None
                except ValueError:
                    numero_int = None
                try:
                    ano_int = int(ano) if ano else None
                except ValueError:
                    ano_int = None

                session.execute(text("""
                    INSERT INTO atos_executivo
                        (mandato_id, tipo, id_externo, numero, ano,
                         data_apresentacao, ementa, fonte)
                    VALUES
                        (:mid, :tipo, :id_ext, :numero, :ano,
                         :data, :ementa, 'ALESP')
                    ON CONFLICT (tipo, id_externo) DO UPDATE SET
                        mandato_id        = EXCLUDED.mandato_id,
                        ementa            = EXCLUDED.ementa,
                        data_apresentacao = EXCLUDED.data_apresentacao
                """), {
                    "mid": mandato_id,
                    "tipo": tipo_db,
                    "id_ext": id_doc,
                    "numero": numero_int,
                    "ano": ano_int,
                    "data": data_apres,
                    "ementa": ementa[:5000] if ementa else None,
                })
                inserted += 1
                batch += 1
                if batch >= 1000:
                    session.commit()
                    batch = 0
            elem.clear()
            if total % 100_000 == 0:
                print(f"    · {total:,} proposituras lidas · {inserted:,} inseridas", flush=True)
    session.commit()
    print(f"  [parse] {total:,} total · {inserted:,} inseridas · {skipped_no_mandato:,} sem mandato (datas antigas)", flush=True)
    return inserted


def main() -> None:
    print("=== Passo 50 - Governador de SP ===\n")
    if not test_connection():
        return

    session = get_session()

    print("[1/3] Upserting mandatos de governador SP...")
    mandatos: dict[int, int] = {}
    n_matched = 0
    for nome, urna, partido, inicio, fim, ano_tse in GOVERNADORES:
        mid = upsert_mandato_governador(session, nome, urna, partido, inicio, fim, ano_tse)
        mandatos[inicio] = mid
        res = session.execute(text("SELECT candidato_id FROM mandatos_executivo WHERE id = :id"),
                              {"id": mid})
        if res.fetchone()[0]:
            n_matched += 1
    session.commit()
    print(f"  {len(GOVERNADORES)} mandatos · {n_matched} matched com TSE ({100*n_matched/len(GOVERNADORES):.0f}%)\n")

    print("[2/3] Baixando naturezas + docs do Governador...")
    naturezas = baixar_naturezas()
    print(f"  {len(naturezas)} tipos\n")
    docs_gov = baixar_docs_do_governador()
    if not docs_gov:
        print("  [aviso] 0 docs - abortando.")
        session.close()
        return

    print("\n[3/3] Baixando proposituras + upsert atos...")
    inseridas = inserir_proposituras(session, docs_gov, naturezas, mandatos)
    session.close()
    print(f"\n[done] {len(GOVERNADORES)} mandatos · {n_matched} matched · {inseridas:,} atos")


if __name__ == "__main__":
    main()
