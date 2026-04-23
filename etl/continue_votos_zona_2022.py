"""
Script de continuação — processa apenas os UFs pendentes de 2022
(RS, SC, SE, SP, TO) sem verificar se o ano já foi importado.

Uso:
  cd /Users/cesarribeiro/projetos/uniao-brasil/etl
  python continue_votos_zona_2022.py
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))

from sqlalchemy import text
from db import get_session, test_connection
from config import DADOS_BRUTOS, BATCH_SIZE, TSE_ENCODING, TSE_SEPARATOR

UFS_PENDENTES = ["RS", "SC", "SE", "SP", "TO"]
ANO = 2022


def _get_col(row, candidates, default=""):
    for c in candidates:
        if c in row:
            v = row[c].strip().strip('"')
            return v if v not in ("#NULO#", "#NE#", "#NI#", "") else default
    return default


def _parse_votos(valor):
    try:
        return int(valor.replace(".", "").replace(",", ""))
    except (ValueError, AttributeError):
        return 0


def processar_csv(csv_path, municipios_map, candidaturas_map, zonas_cache, session):
    import csv
    inseridos = 0
    ignorados = 0

    COL_MUNICIPIO_TSE = ["CD_MUNICIPIO", "CD_MUN_GOV"]
    COL_ZONA = ["NR_ZONA"]
    COL_SEQUENCIAL = ["SQ_CANDIDATO"]
    COL_VOTOS = ["QT_VOTOS_NOMINAIS", "QT_VOTOS_NOMINAIS_VALIDOS"]

    with open(csv_path, encoding=TSE_ENCODING, errors="replace") as f:
        reader = csv.DictReader(f, delimiter=TSE_SEPARATOR, quotechar='"')
        for row in reader:
            sequencial = _get_col(row, COL_SEQUENCIAL)
            municipio_tse = _get_col(row, COL_MUNICIPIO_TSE)
            zona_num_str = _get_col(row, COL_ZONA)
            votos_str = _get_col(row, COL_VOTOS, "0")

            if not sequencial or not municipio_tse:
                continue

            municipio_id = municipios_map.get(municipio_tse)
            if not municipio_id:
                ignorados += 1
                continue

            candidatura_id = candidaturas_map.get((sequencial, ANO))
            if not candidatura_id:
                ignorados += 1
                continue

            zona_id = None
            try:
                zona_num = int(zona_num_str) if zona_num_str else None
            except ValueError:
                zona_num = None

            if zona_num is not None:
                zona_key = (municipio_id, zona_num)
                if zona_key not in zonas_cache:
                    result = session.execute(
                        text("""
                            INSERT INTO zonas_eleitorais (numero, municipio_id)
                            VALUES (:num, :mid)
                            ON CONFLICT DO NOTHING
                            RETURNING id
                        """),
                        {"num": zona_num, "mid": municipio_id}
                    ).fetchone()
                    if result:
                        zonas_cache[zona_key] = result[0]
                    else:
                        r = session.execute(
                            text("SELECT id FROM zonas_eleitorais WHERE numero = :n AND municipio_id = :m"),
                            {"n": zona_num, "m": municipio_id}
                        ).fetchone()
                        if r:
                            zonas_cache[zona_key] = r[0]
                zona_id = zonas_cache.get(zona_key)

            votos = _parse_votos(votos_str)
            session.execute(
                text("""
                    INSERT INTO votos_por_zona (candidatura_id, municipio_id, zona_id, qt_votos)
                    VALUES (:cid, :mid, :zid, :votos)
                """),
                {"cid": candidatura_id, "mid": municipio_id, "zid": zona_id, "votos": votos}
            )
            inseridos += 1
            if inseridos % BATCH_SIZE == 0:
                session.commit()

    session.commit()
    return inseridos, ignorados


def main():
    print(f"=== Continuação votos_por_zona 2022 — UFs: {UFS_PENDENTES} ===\n")

    if not test_connection():
        print("[ERRO] Banco indisponível.")
        return

    session = get_session()

    print("[cache] Carregando municípios...")
    rows = session.execute(text("SELECT codigo_tse, id FROM municipios")).fetchall()
    municipios_map = {str(r[0]): r[1] for r in rows}
    print(f"  {len(municipios_map)} municípios")

    print("[cache] Carregando candidaturas 2022...")
    rows = session.execute(
        text("""
            SELECT c.id, cand.sequencial_tse
            FROM candidaturas c
            JOIN candidatos cand ON cand.id = c.candidato_id
            WHERE c.ano = 2022
        """)
    ).fetchall()
    candidaturas_map = {(r[1], ANO): r[0] for r in rows}
    print(f"  {len(candidaturas_map)} candidaturas")

    print("[cache] Carregando zonas existentes...")
    rows = session.execute(
        text("SELECT municipio_id, numero, id FROM zonas_eleitorais")
    ).fetchall()
    zonas_cache = {(r[0], r[1]): r[2] for r in rows}
    print(f"  {len(zonas_cache)} zonas\n")

    extract_dir = DADOS_BRUTOS / "votos" / f"votacao_candidato_munzona_{ANO}"
    total = 0

    for i, uf in enumerate(UFS_PENDENTES, 1):
        csv_path = extract_dir / f"votacao_candidato_munzona_{ANO}_{uf}.csv"
        if not csv_path.exists():
            print(f"[{i}/{len(UFS_PENDENTES)}] {uf}... arquivo não encontrado: {csv_path}")
            continue

        print(f"[{i}/{len(UFS_PENDENTES)}] {uf}...", end=" ", flush=True)
        try:
            n, ign = processar_csv(csv_path, municipios_map, candidaturas_map, zonas_cache, session)
            total += n
            print(f"{n:,} registros ({ign:,} ignorados)")
        except Exception as e:
            session.rollback()
            print(f"\n  [ERRO] {e}")

    total_db = session.execute(text("SELECT COUNT(*) FROM votos_por_zona")).scalar()
    zonas_db = session.execute(text("SELECT COUNT(*) FROM zonas_eleitorais")).scalar()
    print(f"\n[done] Inseridos nesta sessão: {total:,}")
    print(f"[done] Total banco: {total_db:,} votos, {zonas_db:,} zonas")
    session.close()


if __name__ == "__main__":
    import os
    os.chdir(str(Path(__file__).parent))
    main()
