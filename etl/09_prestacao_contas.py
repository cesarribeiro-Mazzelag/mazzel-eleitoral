"""
PASSO 9 — Prestação de Contas de Candidatos (Receitas + Despesas)
Fonte: TSE CDN — prestacao_de_contas_eleitorais_candidatos_{ano}.zip

Estratégia de acesso eficiente:
  1. Lê o diretório central do ZIP (via Range request no final do arquivo)
  2. Filtra apenas arquivos por UF (despesas_pagas + receitas) — ignora BRASIL (gigante)
  3. Para cada arquivo: Range request apenas dos bytes comprimidos
  4. Descomprime, agrega por SQ_CANDIDATO, atualiza candidaturas no banco

Resultado: popula candidaturas.receita_campanha e candidaturas.despesa_campanha
"""
from __future__ import annotations
import struct
import zlib
import sys
import io
import csv
from pathlib import Path
from collections import defaultdict
from typing import Optional

import requests

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))

from sqlalchemy import text
from db import get_session, test_connection
from config import DADOS_BRUTOS

# URLs dos ZIPs de prestação de contas por ano
URLS = {
    2024: "https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2024.zip",
    2022: "https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2022.zip",
    2018: "https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2018.zip",
    2020: "https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2020.zip",
}

TIMEOUT = 120


def _get_file_size(url: str) -> int:
    """Retorna o tamanho do arquivo via HEAD."""
    r = requests.head(url, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"HTTP {r.status_code} para {url}")
    return int(r.headers["Content-Length"])


def _read_central_directory(url: str, file_size: int) -> list[dict]:
    """
    Lê o diretório central do ZIP (fim do arquivo) via Range request.
    Retorna lista de {'name', 'local_offset', 'comp_size', 'uncomp_size'}.
    """
    # Último 1MB deve ser suficiente para o diretório central
    tail_size = min(1_000_000, file_size)
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
            entries.append({
                "name":         fn,
                "local_offset": local_offset,
                "comp_size":    comp_size,
                "uncomp_size":  uncomp_size,
            })
            pos += 46 + fl + el + cl
        else:
            pos += 1

    return entries


def _download_and_decompress(url: str, entry: dict) -> Optional[bytes]:
    """
    Baixa e descomprime um arquivo individual do ZIP via Range request.
    Lê o header local para encontrar o offset exato dos dados.
    """
    offset = entry["local_offset"]
    comp_size = entry["comp_size"]

    if comp_size == 0 or comp_size > 300_000_000:
        # Muito grande — pular (arquivos BRASIL com 100s de MB)
        return None

    # Ler local file header para saber extra_len exato
    r = requests.get(url, headers={"Range": f"bytes={offset}-{offset+100}"}, timeout=TIMEOUT)
    hdr = r.content
    if hdr[:4] != b"PK\x03\x04":
        return None

    fname_len = struct.unpack("<H", hdr[26:28])[0]
    extra_len = struct.unpack("<H", hdr[28:30])[0]
    data_start = offset + 30 + fname_len + extra_len

    # Baixar dados comprimidos
    end = data_start + comp_size - 1
    r2 = requests.get(url, headers={"Range": f"bytes={data_start}-{end}"}, timeout=TIMEOUT)
    if r2.status_code not in (200, 206):
        return None

    compressed = r2.content
    try:
        return zlib.decompress(compressed, -15)
    except zlib.error:
        return None


def _parse_csv_aggregated(raw_bytes: bytes, col_seq: str, col_valor: str) -> dict[str, float]:
    """
    Lê CSV e agrega col_valor por col_seq.
    Retorna {sq_candidato: total_valor}.
    """
    aggregated: dict[str, float] = defaultdict(float)
    text_data = raw_bytes.decode("latin-1")
    reader = csv.DictReader(io.StringIO(text_data), delimiter=";", quotechar='"')

    for row in reader:
        sq = row.get(col_seq, "").strip()
        val_str = row.get(col_valor, "0").strip().replace(",", ".").replace('"', '')
        if not sq:
            continue
        try:
            val = float(val_str) if val_str else 0.0
        except ValueError:
            continue
        aggregated[sq] += val

    return dict(aggregated)


def _detectar_colunas(raw_bytes: bytes) -> tuple[str, str]:
    """
    Detecta o nome da coluna SQ_CANDIDATO e da coluna de valor no CSV.
    Retorna (col_seq, col_valor).
    """
    header = raw_bytes.decode("latin-1").split("\n")[0].strip()
    cols = [c.strip('"') for c in header.split(";")]

    # Sequencial
    col_seq = next((c for c in cols if c == "SQ_CANDIDATO"), None)
    if not col_seq:
        return None, None

    # Valor - tenta várias denominações
    for candidate in ["VR_RECEITA_TOTAL", "VR_DESPESA_CONTRATADA", "VR_PAGTO_DESPESA",
                      "VR_DESPESA_PAGA", "VR_RECEITA", "VR_VALOR_RECEITA"]:
        if candidate in cols:
            return col_seq, candidate

    return col_seq, None


def processar_ano(ano: int, session) -> dict:
    """
    Baixa e processa os arquivos de prestação de contas de um ano.
    Retorna {'receita': N, 'despesa': M} com quantidades atualizadas.
    """
    url = URLS.get(ano)
    if not url:
        print(f"  [skip] Ano {ano} não mapeado")
        return {"receita": 0, "despesa": 0}

    print(f"\n[pc] Ano {ano}")
    print(f"  URL: {url}")

    try:
        file_size = _get_file_size(url)
    except Exception as e:
        print(f"  [erro] {e}")
        return {"receita": 0, "despesa": 0}

    print(f"  Tamanho: {file_size/1024/1024:.1f} MB")
    print(f"  Lendo diretório central...")

    try:
        entries = _read_central_directory(url, file_size)
    except Exception as e:
        print(f"  [erro] Diretório central: {e}")
        return {"receita": 0, "despesa": 0}

    print(f"  {len(entries)} arquivos no ZIP")

    # Filtrar: receitas e despesas por UF (não BRASIL — muito grande)
    receitas_entries   = [e for e in entries if f"receitas_candidatos_{ano}" in e["name"]
                          and "BRASIL" not in e["name"] and "doador" not in e["name"]]

    # Preferir despesas_contratadas (tem SQ_CANDIDATO) sobre despesas_pagas (usa SQ_PRESTADOR_CONTAS)
    despesas_entries   = [e for e in entries if f"despesas_contratadas_candidatos_{ano}" in e["name"]
                          and "BRASIL" not in e["name"]]

    # Fallback: despesas_pagas se contratadas não encontrado
    if not despesas_entries:
        despesas_entries = [e for e in entries if f"despesas_pagas_candidatos_{ano}" in e["name"]
                            and "BRASIL" not in e["name"]]

    print(f"  Receitas UF: {len(receitas_entries)} | Despesas UF: {len(despesas_entries)}")

    # Agregar receitas
    receita_por_seq: dict[str, float] = {}
    print(f"  Processando receitas...")
    for i, entry in enumerate(receitas_entries):
        uf = entry["name"].split("_")[-1].replace(".csv", "")
        print(f"    [{i+1}/{len(receitas_entries)}] {uf} ({entry['comp_size']/1024:.0f} KB)...", end="", flush=True)
        raw = _download_and_decompress(url, entry)
        if raw:
            col_seq, col_val = _detectar_colunas(raw)
            if col_seq and col_val:
                agg = _parse_csv_aggregated(raw, col_seq, col_val)
                for sq, val in agg.items():
                    receita_por_seq[sq] = receita_por_seq.get(sq, 0) + val
                print(f" {len(agg)} cands")
            else:
                print(f" colunas não detectadas")
        else:
            print(f" erro")

    # Agregar despesas
    despesa_por_seq: dict[str, float] = {}
    print(f"  Processando despesas...")
    for i, entry in enumerate(despesas_entries):
        uf = entry["name"].split("_")[-1].replace(".csv", "")
        print(f"    [{i+1}/{len(despesas_entries)}] {uf} ({entry['comp_size']/1024:.0f} KB)...", end="", flush=True)
        raw = _download_and_decompress(url, entry)
        if raw:
            col_seq, col_val = _detectar_colunas(raw)
            if col_seq and col_val:
                agg = _parse_csv_aggregated(raw, col_seq, col_val)
                for sq, val in agg.items():
                    despesa_por_seq[sq] = despesa_por_seq.get(sq, 0) + val
                print(f" {len(agg)} cands")
            else:
                print(f" colunas não detectadas")
        else:
            print(f" erro")

    print(f"  Receita: {len(receita_por_seq):,} candidatos | Despesa: {len(despesa_por_seq):,} candidatos")

    # Atualizar banco
    rec_updated = 0
    desp_updated = 0

    if receita_por_seq:
        print(f"  Atualizando receitas no banco...")
        # Batch update via temp table approach
        items = list(receita_por_seq.items())
        batch_size = 5000
        for start in range(0, len(items), batch_size):
            batch = items[start:start+batch_size]
            for sq, val in batch:
                r = session.execute(text("""
                    UPDATE candidaturas ca
                    SET receita_campanha = :val
                    FROM candidatos c
                    WHERE ca.candidato_id = c.id
                      AND c.sequencial_tse = :sq
                      AND ca.ano = :ano
                """), {"val": val, "sq": sq, "ano": ano})
                rec_updated += r.rowcount
        session.commit()
        print(f"  {rec_updated:,} candidaturas atualizadas com receita")

    if despesa_por_seq:
        print(f"  Atualizando despesas no banco...")
        items = list(despesa_por_seq.items())
        for start in range(0, len(items), batch_size if 'batch_size' in dir() else 5000):
            batch = items[start:start+5000]
            for sq, val in batch:
                r = session.execute(text("""
                    UPDATE candidaturas ca
                    SET despesa_campanha = :val
                    FROM candidatos c
                    WHERE ca.candidato_id = c.id
                      AND c.sequencial_tse = :sq
                      AND ca.ano = :ano
                """), {"val": val, "sq": sq, "ano": ano})
                desp_updated += r.rowcount
        session.commit()
        print(f"  {desp_updated:,} candidaturas atualizadas com despesa")

    return {"receita": rec_updated, "despesa": desp_updated}


if __name__ == "__main__":
    print("=== Passo 9 — Prestação de Contas (Receitas + Despesas) ===\n")

    anos_arg = [int(a) for a in sys.argv[1:] if a.isdigit()] or [2024, 2022, 2018]
    print(f"Anos a processar: {anos_arg}")

    if not test_connection():
        sys.exit(1)

    session = get_session()
    total_rec = total_desp = 0

    for ano in anos_arg:
        r = processar_ano(ano, session)
        total_rec  += r["receita"]
        total_desp += r["despesa"]

    session.close()

    print(f"\n=== RESUMO ===")
    print(f"Receitas atualizadas: {total_rec:,}")
    print(f"Despesas atualizadas: {total_desp:,}")
    print("[done]")
