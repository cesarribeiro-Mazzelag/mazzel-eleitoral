"""
PASSO 48 - Assembleia Legislativa de SP (ALESP)

Baixa via XML publico (sem chave):
  - Deputados em exercicio (94 deputados, 20a Legislatura 2023-2027)
  - Proposituras (PL, PLC, PEC, REQ etc)
  - Autoria documento → deputado

Fonte: https://www.al.sp.gov.br/dados-abertos/
  - deputados.xml    (~300KB, direto)
  - naturezasSpl.xml (decode IdNatureza → sigla tipo)
  - proposituras.zip (~15MB, 127MB descomprimido, 538k proposituras historicas)
  - documento_autor.zip (~6MB, 142MB descomprimido, 2.2M vinculos)

Estrategia:
  1. deputados.xml: load full, upsert mandatos_legislativo casa=ASSEMBLEIA_ESTADUAL uf=SP
  2. naturezasSpl.xml: load full, dict IdNatureza → sigla
  3. documento_autor.zip: stream com iterparse, filtra so autorias dos 94 deputados
  4. proposituras.zip: stream com iterparse, upsert se IdDocumento tem autor conhecido

Match candidato_id: best-effort por nome + UF='SP' + cargo DepEstadual ciclo recente.

Execucao:
  python3 48_alesp_deputados_estaduais.py
  python3 48_alesp_deputados_estaduais.py --skip-props   # so deputados/mandatos
"""
from __future__ import annotations
import io
import re
import sys
import time
import zipfile
import requests
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))
from db import get_session, test_connection
from sqlalchemy import text


BASE = "https://www.al.sp.gov.br/repositorioDados"
URL_DEPUTADOS = f"{BASE}/deputados/deputados.xml"
URL_NATUREZAS = f"{BASE}/processo_legislativo/naturezasSpl.xml"
URL_PROPOSITURAS_ZIP = f"{BASE}/processo_legislativo/proposituras.zip"
URL_DOCUMENTO_AUTOR_ZIP = f"{BASE}/processo_legislativo/documento_autor.zip"

LEGISLATURA_ATUAL = 20  # 20a Legislatura SP: 2023-2027
UF = "SP"
TIMEOUT = 300  # 5min (ZIPs sao grandes)


# ── Download ──────────────────────────────────────────────────────────────────
def baixar_xml(url: str) -> bytes:
    print(f"  [download] {url}", flush=True)
    r = requests.get(url, timeout=TIMEOUT)
    r.raise_for_status()
    print(f"  [download] {len(r.content)/1024/1024:.1f}MB OK", flush=True)
    return r.content


# ── Deputados ─────────────────────────────────────────────────────────────────
def baixar_deputados() -> list[dict]:
    """Retorna lista de dicts com campos dos deputados em exercicio."""
    data = baixar_xml(URL_DEPUTADOS)
    root = ET.fromstring(data)
    deps = []
    for d in root.findall("Deputado"):
        sit = d.findtext("Situacao", "").strip()
        if sit != "EXE":
            continue
        deps.append({
            "IdDeputado": d.findtext("IdDeputado", "").strip(),
            "IdSPL":      d.findtext("IdSPL", "").strip(),
            "Matricula":  d.findtext("Matricula", "").strip(),
            "Nome":       d.findtext("NomeParlamentar", "").strip(),
            "Partido":    d.findtext("Partido", "").strip(),
            "Email":      d.findtext("Email", "").strip(),
        })
    return deps


def upsert_deputado(session, dep: dict) -> int:
    """Insere/atualiza mandato, retorna mandato_id."""
    res = session.execute(text("""
        INSERT INTO mandatos_legislativo
            (casa, id_externo, nome, partido_sigla, uf,
             legislatura, email, ativo, atualizado_em)
        VALUES
            ('ASSEMBLEIA_ESTADUAL', :id_ext, :nome, :partido, :uf,
             :legislatura, :email, true, NOW())
        ON CONFLICT (casa, id_externo) DO UPDATE SET
            nome          = EXCLUDED.nome,
            partido_sigla = EXCLUDED.partido_sigla,
            uf            = EXCLUDED.uf,
            legislatura   = EXCLUDED.legislatura,
            email         = EXCLUDED.email,
            ativo         = true,
            atualizado_em = NOW()
        RETURNING id
    """), {
        "id_ext":      dep["IdDeputado"],
        "nome":        dep["Nome"][:200],
        "partido":     dep["Partido"][:20],
        "uf":          UF,
        "legislatura": LEGISLATURA_ATUAL,
        "email":       (dep["Email"] or "")[:200] if dep["Email"] else None,
    })
    return res.fetchone()[0]


def matchar_candidato_id(session, mandato_id: int, nome: str) -> None:
    """Match best-effort: nome_urna OU nome_completo == NomeParlamentar, UF=SP,
    cargo Deputado Estadual, ciclo mais recente.
    """
    if not nome:
        return
    res = session.execute(text("""
        SELECT c.id
        FROM candidatos c
        JOIN candidaturas ca ON ca.candidato_id = c.id
        WHERE ca.estado_uf = :uf
          AND ca.cargo = 'DEPUTADO ESTADUAL'
          AND (
            UPPER(c.nome_urna) = UPPER(:nome)
            OR UPPER(c.nome_completo) = UPPER(:nome)
          )
        ORDER BY ca.ano DESC, c.id DESC
        LIMIT 1
    """), {"nome": nome, "uf": UF})
    row = res.fetchone()
    if row:
        session.execute(text("""
            UPDATE mandatos_legislativo SET candidato_id = :cid WHERE id = :mid
        """), {"cid": row[0], "mid": mandato_id})


# ── Naturezas (decode IdNatureza → sigla) ────────────────────────────────────
def baixar_naturezas() -> dict[str, str]:
    """Retorna {IdNatureza: sgNatureza}. Ex: '1' → 'PL', '2' → 'PLC'."""
    data = baixar_xml(URL_NATUREZAS)
    root = ET.fromstring(data)
    out = {}
    for n in root.iter("natureza"):
        _id = n.findtext("idNatureza", "").strip()
        _sg = n.findtext("sgNatureza", "").strip()
        if _id and _sg:
            out[_id] = _sg[:10]
    return out


# ── Autoria documento (streaming do ZIP 142MB) ───────────────────────────────
def baixar_e_parsear_autores(idspl_por_dep: dict[str, int]) -> dict[str, int]:
    """Stream documento_autor.xml e devolve {IdDocumento: mandato_id} para
    documentos cujo IdAutor bate com IdSPL de um dos deputados.

    Se varios autores: pega o primeiro que bate (lead author).
    """
    print(f"  [download] {URL_DOCUMENTO_AUTOR_ZIP}", flush=True)
    r = requests.get(URL_DOCUMENTO_AUTOR_ZIP, timeout=TIMEOUT)
    r.raise_for_status()
    print(f"  [download] {len(r.content)/1024/1024:.1f}MB OK (zip)", flush=True)

    zf = zipfile.ZipFile(io.BytesIO(r.content))
    name = zf.namelist()[0]
    print(f"  [parse] stream {name} ({zf.getinfo(name).file_size/1024/1024:.1f}MB)...", flush=True)

    doc_to_mandato: dict[str, int] = {}
    total = 0
    hits = 0
    with zf.open(name) as f:
        for _event, elem in ET.iterparse(f, events=("end",)):
            if elem.tag != "DocumentoAutor":
                continue
            total += 1
            id_autor = (elem.findtext("IdAutor") or "").strip()
            id_doc = (elem.findtext("IdDocumento") or "").strip()
            if id_autor in idspl_por_dep and id_doc and id_doc not in doc_to_mandato:
                doc_to_mandato[id_doc] = idspl_por_dep[id_autor]
                hits += 1
            elem.clear()
            if total % 500_000 == 0:
                print(f"    · {total:,} lidos · {hits:,} de nossos deps", flush=True)
    print(f"  [parse] autoria: {total:,} registros · {hits:,} ligadas aos 94 deputados", flush=True)
    return doc_to_mandato


# ── Proposituras (streaming do ZIP 127MB) ────────────────────────────────────
def baixar_e_inserir_proposituras(session, doc_to_mandato: dict[str, int],
                                   naturezas: dict[str, str]) -> int:
    """Stream proposituras.xml e upsert so as que tem autor conhecido."""
    print(f"  [download] {URL_PROPOSITURAS_ZIP}", flush=True)
    r = requests.get(URL_PROPOSITURAS_ZIP, timeout=TIMEOUT)
    r.raise_for_status()
    print(f"  [download] {len(r.content)/1024/1024:.1f}MB OK (zip)", flush=True)

    zf = zipfile.ZipFile(io.BytesIO(r.content))
    name = zf.namelist()[0]
    print(f"  [parse] stream {name} ({zf.getinfo(name).file_size/1024/1024:.1f}MB)...", flush=True)

    inserted = 0
    total = 0
    batch = 0
    with zf.open(name) as f:
        for _event, elem in ET.iterparse(f, events=("end",)):
            if elem.tag != "propositura":
                continue
            total += 1
            id_doc = (elem.findtext("IdDocumento") or "").strip()
            mandato_id = doc_to_mandato.get(id_doc)
            if mandato_id:
                id_natureza = (elem.findtext("IdNatureza") or "").strip()
                ementa = (elem.findtext("Ementa") or "").strip()
                ano = (elem.findtext("AnoLegislativo") or "").strip()
                numero = (elem.findtext("NroLegislativo") or "").strip()
                dt_pub = (elem.findtext("DtPublicacao") or "").strip()

                try:
                    ano_int = int(ano) if ano else None
                except ValueError:
                    ano_int = None
                try:
                    numero_int = int(numero) if numero else None
                except ValueError:
                    numero_int = None

                data_apres = None
                if dt_pub:
                    try:
                        data_apres = datetime.fromisoformat(dt_pub.split("T")[0]).date()
                    except (ValueError, TypeError):
                        data_apres = None

                sigla = naturezas.get(id_natureza, "PL")[:10]

                session.execute(text("""
                    INSERT INTO proposicoes_legislativo
                        (casa, id_externo, mandato_id, sigla_tipo, numero, ano,
                         data_apresentacao, ementa)
                    VALUES
                        ('ASSEMBLEIA_ESTADUAL', :id_ext, :mandato, :sigla,
                         :numero, :ano, :data, :ementa)
                    ON CONFLICT (casa, id_externo) DO UPDATE SET
                        mandato_id        = EXCLUDED.mandato_id,
                        ementa            = EXCLUDED.ementa,
                        data_apresentacao = EXCLUDED.data_apresentacao
                """), {
                    "id_ext":  id_doc,
                    "mandato": mandato_id,
                    "sigla":   sigla,
                    "numero":  numero_int,
                    "ano":     ano_int,
                    "data":    data_apres,
                    "ementa":  ementa[:5000] if ementa else None,
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
    print(f"  [parse] proposituras: {total:,} total · {inserted:,} inseridas nos 94 deps", flush=True)
    return inserted


# ── Main ──────────────────────────────────────────────────────────────────────
def main(skip_props: bool = False) -> None:
    print("=== Passo 48 — ALESP Deputados Estaduais ===\n")
    if not test_connection():
        return

    session = get_session()

    print("[1/4] Baixando deputados em exercicio...")
    deps = baixar_deputados()
    print(f"  {len(deps)} deputados em exercicio.\n")

    # Upsert + match candidato
    print("[2/4] Upsert mandatos + match candidato...")
    idspl_por_dep: dict[str, int] = {}   # IdSPL → mandato_id
    n_matched = 0
    for dep in deps:
        try:
            mandato_id = upsert_deputado(session, dep)
            idspl_por_dep[dep["IdSPL"]] = mandato_id
            matchar_candidato_id(session, mandato_id, dep["Nome"])
            res = session.execute(text(
                "SELECT candidato_id FROM mandatos_legislativo WHERE id = :id"
            ), {"id": mandato_id})
            if res.fetchone()[0]:
                n_matched += 1
        except Exception as e:
            print(f"  [erro {dep['Nome']}] {e}")
            session.rollback()
    session.commit()
    print(f"  {len(idspl_por_dep)} mandatos · {n_matched} matched ({100*n_matched/max(1,len(deps)):.0f}%)\n")

    if skip_props:
        print("[skip-props] Pulando proposituras.")
        session.close()
        return

    print("[3/4] Baixando naturezas (tipos de propositura)...")
    naturezas = baixar_naturezas()
    print(f"  {len(naturezas)} tipos carregados (PL, PLC, PEC, REQ etc)\n")

    print("[4/4] Baixando autoria + proposituras (streaming)...")
    doc_to_mandato = baixar_e_parsear_autores(idspl_por_dep)
    if not doc_to_mandato:
        print("  [aviso] nenhum documento ligado aos deputados - abortando.")
        session.close()
        return

    inseridas = baixar_e_inserir_proposituras(session, doc_to_mandato, naturezas)
    session.close()

    print(f"\n[done] {len(idspl_por_dep)} deputados · {n_matched} matched · {inseridas:,} proposicoes")


if __name__ == "__main__":
    skip_props = "--skip-props" in sys.argv
    main(skip_props=skip_props)
