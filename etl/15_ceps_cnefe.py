"""ETL: CNEFE 2022 IBGE — agrega CEPs por municipio.

CEP NAO eh fonte de geometria. Apenas:
  - lista bairros do municipio (DNE Correios, via CNEFE)
  - link bairro -> codigo_setor IBGE (ja vem no CNEFE)
  - lat/lng do CEP via media das coordenadas dos enderecos

Fonte:
  https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/
    Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/{UF_codigo}_{UF}/
    {codigo_ibge}_{NOME}.zip

CSV columns (subset relevante):
  COD_UNICO_ENDERECO, COD_UF, COD_MUNICIPIO, COD_DISTRITO, COD_SUBDISTRITO,
  COD_SETOR, NUM_QUADRA, NUM_FACE, CEP, DSC_LOCALIDADE,
  NOM_TIPO_SEGLOGR, NOM_TITULO_SEGLOGR, NOM_SEGLOGR, NUM_ENDERECO,
  DSC_MODIFICADOR, NOM_COMP_ELEM1, VAL_COMP_ELEM1, ...
  LATITUDE, LONGITUDE, NV_GEO_COORD, COD_ESPECIE, ...

Estrategia:
  1. Download ZIP do municipio
  2. Stream CSV (line-by-line — arquivo grande)
  3. Agrega por CEP: bairro (DSC_LOCALIDADE), media lat/lng,
     codigo_setor mais comum (deveria ser unico por CEP em geral)
  4. Insert batch ON CONFLICT DO UPDATE

Uso:
    python3 15_ceps_cnefe.py --municipio 3550308 --uf SP
    python3 15_ceps_cnefe.py --uf SP            # municipios todos
"""
from __future__ import annotations
import argparse
import csv
import io
import sys
import time
import zipfile
from collections import defaultdict
from pathlib import Path

import requests
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine

UF_CODIGO = {
    "RO": "11", "AC": "12", "AM": "13", "RR": "14", "PA": "15", "AP": "16", "TO": "17",
    "MA": "21", "PI": "22", "CE": "23", "RN": "24", "PB": "25", "PE": "26", "AL": "27",
    "SE": "28", "BA": "29",
    "MG": "31", "ES": "32", "RJ": "33", "SP": "35",
    "PR": "41", "SC": "42", "RS": "43",
    "MS": "50", "MT": "51", "GO": "52", "DF": "53",
}

CACHE_DIR = Path(__file__).parent / "_cache_cnefe"


def _baixar_municipio(codigo_ibge: str, uf: str, nome_uf: str) -> Path:
    """Download e cache do ZIP CNEFE do municipio."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache = CACHE_DIR / f"{codigo_ibge}.zip"
    if cache.exists() and cache.stat().st_size > 1000:
        print(f"      cache: {cache.name} ({cache.stat().st_size // 1024} KB)")
        return cache

    # Achar nome_municipio no FTP (varia: SAO_PAULO, RIO_DE_JANEIRO, etc)
    base = (
        f"https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/"
        f"Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/{nome_uf}/"
    )
    listing = requests.get(base, timeout=30).text
    import re
    match = re.search(rf'href="({codigo_ibge}_[^"]+\.zip)"', listing)
    if not match:
        raise RuntimeError(f"ZIP do municipio {codigo_ibge} nao encontrado em {base}")
    url = base + match.group(1)
    print(f"      baixando {url}...")
    r = requests.get(url, stream=True, timeout=600)
    r.raise_for_status()
    total = int(r.headers.get("Content-Length", 0))
    baixado = 0
    with open(cache, "wb") as f:
        for chunk in r.iter_content(chunk_size=1024 * 256):
            f.write(chunk)
            baixado += len(chunk)
            if total:
                pct = baixado * 100 // total
                if baixado % (1024 * 1024 * 10) < 1024 * 256:  # log a cada ~10MB
                    print(f"        {pct}% ({baixado // (1024*1024)} MB)")
    print(f"      download completo: {baixado // (1024*1024)} MB")
    return cache


def _parse_e_agregar(zip_path: Path) -> list[dict]:
    """Le o CSV dentro do ZIP e agrega registros por CEP.

    Retorna lista de dicts {cep, bairro, n_enderecos, codigo_setor, lat, lng}.
    """
    print("      parseando CSV e agregando por CEP...")
    agg: dict[str, dict] = {}
    n_total = 0
    with zipfile.ZipFile(zip_path) as zf:
        # Sabemos que tem 1 CSV dentro
        csv_name = next((n for n in zf.namelist() if n.lower().endswith(".csv")), None)
        if not csv_name:
            raise RuntimeError(f"Nenhum CSV em {zip_path}")
        with zf.open(csv_name) as raw:
            text_io = io.TextIOWrapper(raw, encoding="latin-1", errors="replace")
            reader = csv.DictReader(text_io, delimiter=";")
            for row in reader:
                n_total += 1
                cep = (row.get("CEP") or "").strip().zfill(8)[:8]
                if not cep or cep == "00000000":
                    continue
                bairro = (row.get("DSC_LOCALIDADE") or "").strip().title() or None
                cod_setor = (row.get("COD_SETOR") or "").strip()
                lat_s = (row.get("LATITUDE") or "").replace(",", ".").strip()
                lng_s = (row.get("LONGITUDE") or "").replace(",", ".").strip()
                try:
                    lat = float(lat_s) if lat_s else None
                    lng = float(lng_s) if lng_s else None
                except ValueError:
                    lat = lng = None

                a = agg.setdefault(cep, {
                    "cep": cep, "bairros": defaultdict(int),
                    "setores": defaultdict(int), "n": 0,
                    "lat_sum": 0.0, "lng_sum": 0.0, "n_coord": 0,
                })
                a["n"] += 1
                if bairro:
                    a["bairros"][bairro] += 1
                if cod_setor:
                    a["setores"][cod_setor] += 1
                if lat is not None and lng is not None and -90 <= lat <= 90 and -180 <= lng <= 180:
                    a["lat_sum"] += lat
                    a["lng_sum"] += lng
                    a["n_coord"] += 1

    print(f"      {n_total} registros lidos, {len(agg)} CEPs distintos")

    # Resolve dominantes
    out = []
    for cep, a in agg.items():
        bairro = max(a["bairros"], key=a["bairros"].get) if a["bairros"] else None
        # CNEFE 2022 codigo_setor tem 16 chars (sufixo P/etc). Truncamos pra
        # 15 que e o que esta em setores_censitarios.
        setor_full = max(a["setores"], key=a["setores"].get) if a["setores"] else None
        setor = setor_full[:15] if setor_full else None
        lat = a["lat_sum"] / a["n_coord"] if a["n_coord"] > 0 else None
        lng = a["lng_sum"] / a["n_coord"] if a["n_coord"] > 0 else None
        out.append({
            "cep": cep,
            "bairro": bairro[:200] if bairro else None,
            "codigo_setor": setor,
            "lat": lat,
            "lng": lng,
            "n_enderecos": a["n"],
        })
    return out


def processar_municipio(codigo_ibge: str, uf: str, nome_municipio: str):
    print(f"\n[{nome_municipio} / {codigo_ibge}] iniciando")
    nome_uf = f"{UF_CODIGO[uf]}_{uf}"
    zip_path = _baixar_municipio(codigo_ibge, uf, nome_uf)
    ceps = _parse_e_agregar(zip_path)
    print(f"      inserindo {len(ceps)} CEPs no banco...")

    BATCH = 1000
    inseridos = 0
    with engine.begin() as conn:
        for i in range(0, len(ceps), BATCH):
            batch = ceps[i:i+BATCH]
            params = [{
                "cep": c["cep"],
                "bairro": c["bairro"],
                "cidade": nome_municipio.title(),
                "uf": uf,
                "lat": c["lat"],
                "lng": c["lng"],
                "codigo_setor": c["codigo_setor"],
            } for c in batch]
            conn.execute(text("""
                INSERT INTO ceps (cep, bairro, cidade, uf, lat, lng, codigo_setor, origem)
                VALUES (:cep, :bairro, :cidade, :uf, :lat, :lng, :codigo_setor, 'cnefe')
                ON CONFLICT (cep) DO UPDATE SET
                  bairro = EXCLUDED.bairro,
                  cidade = EXCLUDED.cidade,
                  uf     = EXCLUDED.uf,
                  lat    = EXCLUDED.lat,
                  lng    = EXCLUDED.lng,
                  codigo_setor = EXCLUDED.codigo_setor,
                  origem = 'cnefe'
            """), params)
            inseridos += len(batch)

    print(f"      {inseridos} CEPs inseridos/atualizados")
    return inseridos


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipio", help="Codigo IBGE")
    parser.add_argument("--uf", default="SP")
    args = parser.parse_args()

    inicio = time.time()
    with engine.connect() as conn:
        if args.municipio:
            r = conn.execute(text(
                "SELECT codigo_ibge, nome FROM municipios WHERE codigo_ibge = :c"
            ), {"c": args.municipio.zfill(7)}).fetchone()
            if not r:
                print(f"Municipio {args.municipio} nao encontrado")
                return
            municipios = [(r.codigo_ibge, r.nome)]
        else:
            rs = conn.execute(text(
                "SELECT codigo_ibge, nome FROM municipios WHERE estado_uf = :uf ORDER BY id"
            ), {"uf": args.uf.upper()})
            municipios = [(r.codigo_ibge, r.nome) for r in rs]

    print(f"Processando {len(municipios)} municipios da UF {args.uf}...")
    for cibge, nome in municipios:
        try:
            processar_municipio(cibge, args.uf.upper(), nome)
        except Exception as e:
            print(f"  ERRO em {nome}: {e}")
            continue

    elapsed = time.time() - inicio
    print(f"\nFIM. {elapsed:.0f}s")


if __name__ == "__main__":
    main()
