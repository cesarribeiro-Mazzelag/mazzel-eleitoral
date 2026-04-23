"""
PASSO 12 — Prestação de Contas Detalhada (Caminho B do Radar Político)

Processa o ZIP de receitas do TSE e popula `prestacao_resumo_candidato` com:
  - origem por fonte (fundo partidário, fundo eleitoral, doação privada, próprios)
  - concentração (top1/5/10 doadores)
  - top 5 doadores (nome + valor)

Reaproveita a infra de Range request do 09_prestacao_contas.py:
  - Não baixa o ZIP inteiro (são 1+ GB)
  - Lê o central directory via Range no fim do arquivo
  - Baixa só os CSVs por UF
  - Agrega por candidato em memória

Uso:
    python3 12_prestacao_detalhada.py             # processa 2024 (default)
    python3 12_prestacao_detalhada.py 2024 2022   # processa múltiplos anos
"""
from __future__ import annotations
import struct
import zlib
import sys
import io
import csv
import json
from pathlib import Path
from collections import defaultdict
from typing import Optional

import requests

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))

from sqlalchemy import text
from db import get_session, test_connection

URLS = {
    2024: "https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2024.zip",
    2022: "https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2022.zip",
    2020: "https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2020.zip",
    2018: "https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2018.zip",
}

TIMEOUT = 120


# ── Range request infra (cópia do 09 para isolamento) ───────────────────────

def _get_file_size(url: str) -> int:
    r = requests.head(url, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"HTTP {r.status_code}")
    return int(r.headers["Content-Length"])


def _read_central_directory(url: str, file_size: int) -> list[dict]:
    tail_size = min(1_500_000, file_size)
    start = file_size - tail_size
    r = requests.get(url, headers={"Range": f"bytes={start}-{file_size-1}"}, timeout=TIMEOUT)
    data = r.content
    entries = []
    pos = 0
    while pos < len(data) - 46:
        if data[pos:pos+4] == b"PK\x01\x02":
            fl = struct.unpack("<H", data[pos+28:pos+30])[0]
            el = struct.unpack("<H", data[pos+30:pos+32])[0]
            cl = struct.unpack("<H", data[pos+32:pos+34])[0]
            fn = data[pos+46:pos+46+fl].decode("utf-8", errors="replace")
            local_offset = struct.unpack("<I", data[pos+42:pos+46])[0]
            comp_size    = struct.unpack("<I", data[pos+20:pos+24])[0]
            uncomp_size  = struct.unpack("<I", data[pos+24:pos+28])[0]
            entries.append({"name": fn, "local_offset": local_offset,
                            "comp_size": comp_size, "uncomp_size": uncomp_size})
            pos += 46 + fl + el + cl
        else:
            pos += 1
    return entries


def _download_and_decompress(url: str, entry: dict) -> Optional[bytes]:
    offset = entry["local_offset"]
    comp_size = entry["comp_size"]
    if comp_size == 0 or comp_size > 500_000_000:
        return None
    r = requests.get(url, headers={"Range": f"bytes={offset}-{offset+100}"}, timeout=TIMEOUT)
    hdr = r.content
    if hdr[:4] != b"PK\x03\x04":
        return None
    fname_len = struct.unpack("<H", hdr[26:28])[0]
    extra_len = struct.unpack("<H", hdr[28:30])[0]
    data_start = offset + 30 + fname_len + extra_len
    end = data_start + comp_size - 1
    r2 = requests.get(url, headers={"Range": f"bytes={data_start}-{end}"}, timeout=TIMEOUT)
    if r2.status_code not in (200, 206):
        return None
    try:
        return zlib.decompress(r2.content, -15)
    except zlib.error:
        return None


# ── Classificação de fonte ──────────────────────────────────────────────────

def classificar_fonte(ds_fonte: str) -> str:
    """
    Mapeia DS_FONTE_RECEITA do TSE para uma das categorias do dossiê.
    Devolve uma de: fundo_partidario, fundo_eleitoral, doacao_privada,
    recursos_proprios, outros.
    """
    if not ds_fonte:
        return "outros"
    upper = ds_fonte.upper()

    # Fundo Especial de Financiamento de Campanha (FEFC) = fundo eleitoral público
    if "FUNDO ESPECIAL" in upper or "FEFC" in upper:
        return "fundo_eleitoral"

    # Fundo Partidário (recursos do próprio partido)
    if "FUNDO PARTID" in upper:
        return "fundo_partidario"

    # Recursos próprios do candidato
    if "PRÓPRIO" in upper or "PROPRIO" in upper:
        return "recursos_proprios"

    # Doação de pessoa física ou jurídica
    if "DOAÇÃO" in upper or "DOACAO" in upper or "DOADOR" in upper:
        return "doacao_privada"

    # Transferência de outro candidato/partido = doação interna política
    if "TRANSFER" in upper:
        return "doacao_privada"

    # Comercialização de bens ou serviços, rendimentos de aplicações = outros
    return "outros"


# ── Processamento agregado por candidato ────────────────────────────────────

def processar_csv(raw_bytes: bytes) -> dict[str, dict]:
    """
    Lê o CSV de receitas e devolve um dict por SQ_CANDIDATO com:
      {
        sq: {
          'total': float,
          'por_fonte': {fundo_partidario: float, ...},
          'por_doador': {nome: total, ...}
        }
      }
    """
    text_data = raw_bytes.decode("latin-1")
    reader = csv.DictReader(io.StringIO(text_data), delimiter=";", quotechar='"')

    # Detecta nomes das colunas (variam por ano)
    fieldnames = reader.fieldnames or []
    col_seq    = next((c for c in fieldnames if c == "SQ_CANDIDATO"), None)
    col_valor  = next((c for c in fieldnames if c in ["VR_RECEITA", "VR_VALOR_RECEITA"]), None)
    col_fonte  = next((c for c in fieldnames if c in ["DS_FONTE_RECEITA", "DS_NATUREZA_RECEITA"]), None)
    col_doador = next((c for c in fieldnames if c in ["NM_DOADOR", "NM_DOADOR_ORIGINARIO"]), None)

    if not col_seq or not col_valor:
        return {}

    candidatos: dict[str, dict] = {}

    for row in reader:
        sq = (row.get(col_seq) or "").strip()
        val_str = (row.get(col_valor) or "0").strip().replace(",", ".").replace('"', '')
        if not sq:
            continue
        try:
            val = float(val_str) if val_str else 0.0
        except ValueError:
            continue
        if val <= 0:
            continue

        fonte_raw = (row.get(col_fonte) or "") if col_fonte else ""
        fonte = classificar_fonte(fonte_raw)

        doador_nome = (row.get(col_doador) or "").strip() if col_doador else ""
        doador_nome = doador_nome[:200] if doador_nome else "—"

        if sq not in candidatos:
            candidatos[sq] = {"total": 0.0, "por_fonte": defaultdict(float), "por_doador": defaultdict(float)}

        c = candidatos[sq]
        c["total"] += val
        c["por_fonte"][fonte] += val
        c["por_doador"][doador_nome] += val

    return candidatos


# ── Persistência ────────────────────────────────────────────────────────────

def upsert_resumo(session, candidatura_id: int, ano: int, dados: dict) -> None:
    total = dados["total"]
    if total <= 0:
        return

    por_fonte = dados["por_fonte"]
    fp = por_fonte.get("fundo_partidario", 0.0) / total
    fe = por_fonte.get("fundo_eleitoral", 0.0) / total
    dp = por_fonte.get("doacao_privada", 0.0) / total
    rp = por_fonte.get("recursos_proprios", 0.0) / total
    out = por_fonte.get("outros", 0.0) / total

    # Top doadores
    doadores_ord = sorted(dados["por_doador"].items(), key=lambda x: -x[1])
    n_doadores = len(doadores_ord)
    top1 = doadores_ord[0][1] / total if doadores_ord else 0.0
    top5 = sum(v for _, v in doadores_ord[:5]) / total if doadores_ord else 0.0
    top10 = sum(v for _, v in doadores_ord[:10]) / total if doadores_ord else 0.0

    top5_lista = [{"nome": n, "valor": round(v, 2)} for n, v in doadores_ord[:5]]

    session.execute(text("""
        INSERT INTO prestacao_resumo_candidato
            (candidatura_id, ano, total_receitas,
             fundo_partidario_pct, fundo_eleitoral_pct, doacao_privada_pct,
             recursos_proprios_pct, outros_pct,
             top1_pct, top5_pct, top10_pct, n_doadores, top_doadores)
        VALUES
            (:cid, :ano, :total,
             :fp, :fe, :dp, :rp, :out,
             :t1, :t5, :t10, :nd, :top5j)
        ON CONFLICT (candidatura_id) DO UPDATE SET
            total_receitas        = EXCLUDED.total_receitas,
            fundo_partidario_pct  = EXCLUDED.fundo_partidario_pct,
            fundo_eleitoral_pct   = EXCLUDED.fundo_eleitoral_pct,
            doacao_privada_pct    = EXCLUDED.doacao_privada_pct,
            recursos_proprios_pct = EXCLUDED.recursos_proprios_pct,
            outros_pct            = EXCLUDED.outros_pct,
            top1_pct              = EXCLUDED.top1_pct,
            top5_pct              = EXCLUDED.top5_pct,
            top10_pct             = EXCLUDED.top10_pct,
            n_doadores            = EXCLUDED.n_doadores,
            top_doadores          = EXCLUDED.top_doadores,
            processado_em         = NOW()
    """), {
        "cid":   candidatura_id,
        "ano":   ano,
        "total": round(total, 2),
        "fp":    round(fp, 4), "fe": round(fe, 4),
        "dp":    round(dp, 4), "rp": round(rp, 4), "out": round(out, 4),
        "t1":    round(top1, 4), "t5": round(top5, 4), "t10": round(top10, 4),
        "nd":    n_doadores,
        "top5j": json.dumps(top5_lista, ensure_ascii=False),
    })


def buscar_candidatura_id(session, sq_candidato: str, ano: int) -> Optional[int]:
    """Match candidato.sequencial_tse → candidaturas.id."""
    res = session.execute(text("""
        SELECT ca.id FROM candidaturas ca
        JOIN candidatos c ON c.id = ca.candidato_id
        WHERE c.sequencial_tse = :sq AND ca.ano = :ano
        ORDER BY ca.id LIMIT 1
    """), {"sq": sq_candidato, "ano": ano})
    row = res.fetchone()
    return row[0] if row else None


def processar_ano(ano: int) -> dict:
    url = URLS.get(ano)
    if not url:
        return {"processados": 0}

    print(f"\n[pc-detalhada] Ano {ano}")
    print(f"  URL: {url}")

    try:
        file_size = _get_file_size(url)
        print(f"  Tamanho: {file_size/1024/1024:.1f} MB")
    except Exception as e:
        print(f"  [erro] HEAD: {e}")
        return {"processados": 0}

    print(f"  Lendo central directory...")
    try:
        entries = _read_central_directory(url, file_size)
    except Exception as e:
        print(f"  [erro] central dir: {e}")
        return {"processados": 0}
    print(f"  {len(entries)} arquivos no ZIP")

    # Filtrar receitas por UF (não BRASIL)
    receitas = [
        e for e in entries
        if f"receitas_candidatos_{ano}" in e["name"]
        and "BRASIL" not in e["name"]
        and "doador" not in e["name"]
    ]
    print(f"  Receitas UF: {len(receitas)}")

    # Acumulador GLOBAL (todos os UFs juntos)
    candidatos_global: dict[str, dict] = {}

    for i, entry in enumerate(receitas, 1):
        uf = entry["name"].split("_")[-1].replace(".csv", "")
        print(f"    [{i:2d}/{len(receitas)}] {uf} ({entry['comp_size']/1024:.0f} KB)...", end="", flush=True)
        raw = _download_and_decompress(url, entry)
        if not raw:
            print(" skip")
            continue
        cands = processar_csv(raw)
        for sq, dados in cands.items():
            if sq not in candidatos_global:
                candidatos_global[sq] = {
                    "total": 0.0,
                    "por_fonte": defaultdict(float),
                    "por_doador": defaultdict(float),
                }
            g = candidatos_global[sq]
            g["total"] += dados["total"]
            for k, v in dados["por_fonte"].items():
                g["por_fonte"][k] += v
            for k, v in dados["por_doador"].items():
                g["por_doador"][k] += v
        print(f" {len(cands)} cands")

    print(f"\n  Total candidatos com receita: {len(candidatos_global)}")
    print(f"  Persistindo no banco...")

    session = get_session()
    n_persistidos = 0
    n_sem_match = 0

    for i, (sq, dados) in enumerate(candidatos_global.items(), 1):
        candidatura_id = buscar_candidatura_id(session, sq, ano)
        if not candidatura_id:
            n_sem_match += 1
            continue
        try:
            upsert_resumo(session, candidatura_id, ano, dados)
            n_persistidos += 1
            if n_persistidos % 5000 == 0:
                session.commit()
                print(f"    {n_persistidos} persistidos...")
        except Exception as e:
            session.rollback()
            print(f"    [erro] sq={sq}: {e}")

    session.commit()
    session.close()
    print(f"  [done] {n_persistidos} persistidos · {n_sem_match} sem match TSE")
    return {"processados": n_persistidos}


def main():
    print("=== Passo 12 — Prestação de Contas Detalhada ===\n")
    if not test_connection():
        return

    anos = [int(a) for a in sys.argv[1:] if a.isdigit()]
    if not anos:
        anos = [2024]

    for ano in anos:
        processar_ano(ano)

    print("\n[done] Concluído.")


if __name__ == "__main__":
    main()
