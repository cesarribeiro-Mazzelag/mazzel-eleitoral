"""
PASSO 7 — Importar locais de votação (escolas) com coordenadas
Fonte: eleitorado_local_votacao_ATUAL.zip — TSE
URL: https://cdn.tse.jus.br/estatistica/sead/odsele/perfil_eleitorado/eleitorado_local_votacao_ATUAL.zip

Popula a tabela:
  - locais_votacao (nome da escola, bairro, lat, lng por zona/seção)

Um local de votação pode ter várias seções, mas ocupa uma posição geográfica.
Deduplicamos por (municipio_id, nr_zona, nr_local).

Importante: zonas_eleitorais também é populada aqui se estiver vazia.
"""
from __future__ import annotations
import csv
import io
import sys
import zipfile
import requests
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))

from sqlalchemy import text
from db import get_session, test_connection
from config import DADOS_BRUTOS

URL_ATUAL = (
    "https://cdn.tse.jus.br/estatistica/sead/odsele/perfil_eleitorado/"
    "eleitorado_local_votacao_ATUAL.zip"
)
DEST = DADOS_BRUTOS / "zonas" / "eleitorado_local_votacao_ATUAL.zip"
BATCH = 2000


def _parse_coord(valor: str) -> float | None:
    """Converte '"-20,0030247"' → -20.0030247. Retorna None se inválido."""
    v = valor.strip().strip('"').replace(",", ".")
    try:
        f = float(v)
        return f if f not in (-1.0, 0.0) else None
    except ValueError:
        return None


def _parse_int(valor: str) -> int | None:
    v = valor.strip().strip('"')
    try:
        i = int(v)
        return i if i > 0 else None
    except ValueError:
        return None


def download():
    DEST.parent.mkdir(parents=True, exist_ok=True)
    if DEST.exists():
        print(f"  [skip] {DEST.name} já existe")
        return True
    print(f"  Baixando {URL_ATUAL} ...")
    r = requests.get(URL_ATUAL, stream=True, timeout=120)
    if r.status_code != 200:
        print(f"  [erro] HTTP {r.status_code}")
        return False
    total = int(r.headers.get("content-length", 0))
    baixado = 0
    with open(DEST, "wb") as f:
        for chunk in r.iter_content(65536):
            f.write(chunk)
            baixado += len(chunk)
            if total:
                print(f"\r  {baixado/1024/1024:.1f}/{total/1024/1024:.1f} MB", end="", flush=True)
    print(f"\n  [ok] {DEST.stat().st_size/1024/1024:.1f} MB")
    return True


def importar():
    if not test_connection():
        return False

    if not DEST.exists():
        if not download():
            return False

    session = get_session()

    # Cache de municípios {codigo_tse: id}
    print("[locais] Carregando municípios...")
    rows = session.execute(text("SELECT codigo_tse, id FROM municipios")).fetchall()
    mun_map = {int(r[0]): r[1] for r in rows if r[0]}
    print(f"  {len(mun_map)} municípios")

    # Cache de zonas {(municipio_id, nr_zona): zona_id}
    print("[locais] Carregando zonas eleitorais...")
    rows = session.execute(text("SELECT municipio_id, numero, id FROM zonas_eleitorais")).fetchall()
    zona_map = {(r[0], r[1]): r[2] for r in rows}
    print(f"  {len(zona_map)} zonas no banco")

    print("[locais] Lendo arquivo TSE...")
    inseridos = 0
    ignorados = 0
    zonas_criadas = 0
    batch = []

    with zipfile.ZipFile(DEST) as z:
        fname = next(n for n in z.namelist() if n.endswith(".csv"))
        with z.open(fname) as raw:
            reader = csv.DictReader(
                io.TextIOWrapper(raw, encoding="latin-1", errors="replace"),
                delimiter=";",
                quotechar='"',
            )

            vistos: set[tuple] = set()  # (municipio_id, nr_zona, nr_local) já processados

            for row in reader:
                cd_mun  = row.get("CD_MUNICIPIO", "").strip().strip('"')
                nr_zona = _parse_int(row.get("NR_ZONA", ""))
                nr_local= _parse_int(row.get("NR_LOCAL_VOTACAO", ""))
                lat     = _parse_coord(row.get("NR_LATITUDE", ""))
                lng     = _parse_coord(row.get("NR_LONGITUDE", ""))

                # Filtra sem coordenadas ou sem referência
                if not lat or not lng or not nr_zona or not nr_local:
                    ignorados += 1
                    continue

                try:
                    municipio_id = mun_map.get(int(cd_mun))
                except (ValueError, TypeError):
                    ignorados += 1
                    continue

                if not municipio_id:
                    ignorados += 1
                    continue

                chave = (municipio_id, nr_zona, nr_local)
                if chave in vistos:
                    continue
                vistos.add(chave)

                # Zona eleitoral — cria se não existe
                zona_id = zona_map.get((municipio_id, nr_zona))
                if not zona_id:
                    try:
                        r2 = session.execute(text("""
                            INSERT INTO zonas_eleitorais (numero, municipio_id, descricao)
                            VALUES (:num, :mid, :desc)
                            ON CONFLICT DO NOTHING
                            RETURNING id
                        """), {"num": nr_zona, "mid": municipio_id, "desc": None})
                        new = r2.fetchone()
                        if new:
                            zona_id = new[0]
                            zona_map[(municipio_id, nr_zona)] = zona_id
                            zonas_criadas += 1
                        else:
                            # Já existe — busca
                            r3 = session.execute(text("""
                                SELECT id FROM zonas_eleitorais
                                WHERE municipio_id = :mid AND numero = :num
                            """), {"mid": municipio_id, "num": nr_zona})
                            row3 = r3.fetchone()
                            if row3:
                                zona_id = row3[0]
                                zona_map[(municipio_id, nr_zona)] = zona_id
                    except Exception:
                        session.rollback()
                        continue

                nome     = row.get("NM_LOCAL_VOTACAO", "").strip().strip('"')[:400] or None
                endereco = row.get("DS_ENDERECO", "").strip().strip('"')[:400] or None
                bairro   = row.get("NM_BAIRRO", "").strip().strip('"')[:200] or None
                cep      = row.get("NR_CEP", "").strip().strip('"')[:10] or None
                eleitores= _parse_int(row.get("QT_ELEITOR_SECAO", ""))

                batch.append({
                    "mid": municipio_id, "zid": zona_id,
                    "nz": nr_zona, "nl": nr_local,
                    "nome": nome, "end": endereco, "bairro": bairro, "cep": cep,
                    "lat": lat, "lng": lng, "el": eleitores,
                })

                if len(batch) >= BATCH:
                    _flush(session, batch)
                    inseridos += len(batch)
                    batch = []
                    print(f"\r  {inseridos:,} locais inseridos...", end="", flush=True)

    if batch:
        _flush(session, batch)
        inseridos += len(batch)

    session.commit()
    session.close()

    total = session.execute(text("SELECT COUNT(*) FROM locais_votacao")).scalar() if False else inseridos
    print(f"\n[locais] {inseridos:,} locais inseridos | {zonas_criadas} zonas criadas | {ignorados:,} ignorados")
    return True


def _flush(session, batch: list):
    session.execute(text("""
        INSERT INTO locais_votacao
            (municipio_id, zona_id, nr_zona, nr_local, nome, endereco, bairro, cep, latitude, longitude, qt_eleitores)
        VALUES
            (:mid, :zid, :nz, :nl, :nome, :end, :bairro, :cep, :lat, :lng, :el)
        ON CONFLICT ON CONSTRAINT uq_local_votacao DO NOTHING
    """), batch)
    session.commit()


if __name__ == "__main__":
    print("=== Passo 7 — Locais de Votação (escolas + coordenadas) ===\n")
    importar()
    print("\n[done]")
