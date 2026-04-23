"""ETL 38 — Apuração por município (aptos, comparecimento, abstenções,
válidos, brancos, nulos).

Baixa `detalhe_votacao_munzona_{ano}.zip` do TSE CDN (público), agrega por
(municipio, cargo, turno) e popula a tabela `apuracao_municipio`.

Uso:
    python 38_apuracao_totais.py --ano 2024
    python 38_apuracao_totais.py --anos 2024,2022,2020,2018
"""
from __future__ import annotations
import argparse
import csv
import io
import sys
import urllib.request
import zipfile
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine

TSE_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_{ano}.zip"

# CD_CARGO do TSE → nome no sistema (alinha com candidaturas.cargo)
CARGO_MAP = {
    "1":  "PRESIDENTE",
    "3":  "GOVERNADOR",
    "5":  "SENADOR",
    "6":  "DEPUTADO FEDERAL",
    "7":  "DEPUTADO ESTADUAL",
    "8":  "DEPUTADO DISTRITAL",
    "11": "PREFEITO",
    "13": "VEREADOR",
}


def baixar(ano: int) -> bytes:
    url = TSE_URL.format(ano=ano)
    print(f"[{ano}] baixando {url}")
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def processar(ano: int, zip_bytes: bytes):
    """Agrega por (municipio_tse, cargo, turno) e insere em apuracao_municipio."""
    # agregador: (cd_municipio_tse, cargo, turno) → dict de somas
    agg: dict[tuple[str, str, int], dict] = {}

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        # TSE publica 1 CSV por UF + um agregado "_BR.csv" — pular o BR pra não dobrar.
        csvs = [
            n for n in zf.namelist()
            if n.lower().endswith(".csv") and "brasil" not in n.lower()
        ]
        print(f"[{ano}] {len(csvs)} CSVs por UF (BRASIL agregado pulado)")
        for name in csvs:
            with zf.open(name) as f:
                # TSE usa latin-1 + separador ;
                data = io.TextIOWrapper(f, encoding="latin-1", newline="")
                reader = csv.DictReader(data, delimiter=";", quotechar='"')
                for row in reader:
                    cd_mun_raw = row.get("CD_MUNICIPIO") or ""
                    try:
                        cd_mun = int(cd_mun_raw)
                    except ValueError:
                        continue
                    cd_cargo = row.get("CD_CARGO") or ""
                    cargo_nome = CARGO_MAP.get(cd_cargo)
                    if not cargo_nome or not cd_mun:
                        continue
                    try:
                        turno = int(row.get("NR_TURNO") or "1")
                    except ValueError:
                        continue
                    key = (cd_mun, cargo_nome, turno)
                    a = agg.setdefault(key, {
                        "aptos": 0, "comparecimento": 0, "abstencoes": 0,
                        "validos": 0, "brancos": 0, "nulos": 0,
                    })
                    # Valores (TSE grava "-1" quando não aplicável → trata como 0)
                    def _i(k: str) -> int:
                        v = row.get(k) or "0"
                        try:
                            n = int(v)
                            return n if n >= 0 else 0
                        except ValueError:
                            return 0
                    a["aptos"]          += _i("QT_APTOS")
                    a["comparecimento"] += _i("QT_COMPARECIMENTO")
                    a["abstencoes"]     += _i("QT_ABSTENCOES")
                    # TSE 2024+ usa QT_VOTOS_NOMINAIS_VALIDOS + QT_VOTOS_LEG_VALIDOS.
                    a["validos"]        += _i("QT_VOTOS_NOMINAIS_VALIDOS") + _i("QT_VOTOS_LEG_VALIDOS")
                    a["brancos"]        += _i("QT_VOTOS_BRANCOS")
                    a["nulos"]          += _i("QT_VOTOS_NULOS")

    print(f"[{ano}] agregados: {len(agg)} combinações (mun, cargo, turno)")

    # Upsert em batch
    rows_to_insert = []
    with engine.begin() as conn:
        # Mapear cd_municipio_tse → municipios.id (uma vez)
        mun_map = {r.codigo_tse: r.id for r in conn.execute(text(
            "SELECT id, codigo_tse FROM municipios WHERE codigo_tse IS NOT NULL"
        ))}

        for (cd_tse, cargo, turno), a in agg.items():
            mun_id = mun_map.get(cd_tse)
            if not mun_id:
                continue
            rows_to_insert.append({
                "mun": mun_id, "ano": ano, "cargo": cargo, "turno": turno,
                **a,
            })

        print(f"[{ano}] inserindo {len(rows_to_insert)} linhas...")
        # delete existente + insert (mais rápido que upsert linha a linha)
        conn.execute(text("DELETE FROM apuracao_municipio WHERE ano = :ano"), {"ano": ano})
        # chunked insert
        CHUNK = 5000
        for i in range(0, len(rows_to_insert), CHUNK):
            conn.execute(text("""
                INSERT INTO apuracao_municipio
                  (municipio_id, ano, cargo, turno, aptos, comparecimento,
                   abstencoes, validos, brancos, nulos)
                VALUES
                  (:mun, :ano, :cargo, :turno, :aptos, :comparecimento,
                   :abstencoes, :validos, :brancos, :nulos)
            """), rows_to_insert[i:i+CHUNK])

    print(f"[{ano}] OK")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ano", type=int)
    ap.add_argument("--anos", type=str, help="lista separada por vírgula, ex: 2024,2022")
    args = ap.parse_args()

    anos: list[int] = []
    if args.ano:
        anos.append(args.ano)
    if args.anos:
        anos.extend(int(x) for x in args.anos.split(","))
    if not anos:
        anos = [2024]

    for ano in anos:
        try:
            data = baixar(ano)
            processar(ano, data)
        except Exception as e:
            print(f"[{ano}] ERRO: {e}")


if __name__ == "__main__":
    main()
