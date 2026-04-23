"""
PASSO 4 — Importar votos por município/zona
Fonte: votacao_candidato_munzona_{ano}.zip — TSE

Popula:
  - zonas_eleitorais (cria se não existir)
  - votos_por_zona (granularidade por zona eleitoral)

Atenção: estes arquivos são grandes (2-5 GB por ano).
O script suporta retomada: verifica se o ano já foi importado antes de processar.
"""
from __future__ import annotations
import sys
import csv
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))

from sqlalchemy import text
from db import get_session, test_connection
from config import DADOS_BRUTOS, TODOS_OS_ANOS, BATCH_SIZE, TSE_ENCODING, TSE_SEPARATOR
from download import download_votos_municipio, extract_zip

# Colunas dos arquivos de votação por zona
COL_ANO = ["CD_ANO_ELEICAO", "ANO_ELEICAO"]
COL_UF = ["SG_UF"]
COL_MUNICIPIO_TSE = ["CD_MUNICIPIO", "CD_MUN_GOV"]
COL_ZONA = ["NR_ZONA"]
COL_CARGO = ["DS_CARGO", "CD_CARGO"]
COL_SEQUENCIAL = ["SQ_CANDIDATO"]
COL_PARTIDO_NUM = ["NR_PARTIDO"]
COL_VOTOS = ["QT_VOTOS_NOMINAIS", "QT_VOTOS_NOMINAIS_VALIDOS"]
COL_TURNO = ["NR_TURNO"]
COL_NUMERO_CAND = ["NR_CANDIDATO"]
COL_SIGLA_PARTIDO = ["SG_PARTIDO"]


def _get_col(row: dict, candidates: list[str], default="") -> str:
    for c in candidates:
        if c in row:
            v = row[c].strip().strip('"')
            return v if v not in ("#NULO#", "#NE#", "#NI#", "") else default
    return default


def _parse_votos(valor: str) -> int:
    try:
        return int(valor.replace(".", "").replace(",", ""))
    except (ValueError, AttributeError):
        return 0


def ano_ja_importado(ano: int, session) -> bool:
    """Verifica se já existe dados de votos para o ano (evita reimportar)."""
    count = session.execute(
        text("""
            SELECT COUNT(*)
            FROM votos_por_zona vpz
            JOIN candidaturas c ON vpz.candidatura_id = c.id
            WHERE c.ano = :ano
            LIMIT 1
        """),
        {"ano": ano}
    ).scalar()
    return count > 0


def processar_votos_csv(
    csv_path: Path,
    ano: int,
    municipios_map: dict,   # {codigo_tse: id}
    candidaturas_map: dict, # {(sequencial, ano): candidatura_id}
    candidaturas_fallback_map: dict,  # {(numero_str, sigla, ano, uf): candidatura_id}
    zonas_cache: dict,      # {(municipio_id, numero): zona_id}
    session,
) -> tuple[int, int]:
    """
    Processa um CSV de votos. Retorna (inseridos, fallback_hits).

    O `candidaturas_fallback_map` é usado quando o sequencial do CSV não bate
    com o do banco — situação comum quando o passo 03 foi executado com uma
    versão antiga do CSV de cadastro do TSE. A chave de fallback é
    `(numero_candidato, sigla_partido, ano, estado_uf)`, que é única por
    eleição.
    """
    inseridos = 0
    ignorados = 0
    fallback_hits = 0

    with open(csv_path, encoding=TSE_ENCODING, errors="replace") as f:
        reader = csv.DictReader(f, delimiter=TSE_SEPARATOR, quotechar='"')

        for row in reader:
            sequencial = _get_col(row, COL_SEQUENCIAL)
            municipio_tse = _get_col(row, COL_MUNICIPIO_TSE)
            zona_num_str = _get_col(row, COL_ZONA)
            votos_str = _get_col(row, COL_VOTOS, "0")
            turno_str = _get_col(row, COL_TURNO, "1")
            try:
                turno = int(turno_str) if turno_str else 1
            except ValueError:
                turno = 1
            if turno not in (1, 2):
                turno = 1

            if not sequencial or not municipio_tse:
                continue

            municipio_id = municipios_map.get(municipio_tse)
            if not municipio_id:
                ignorados += 1
                continue

            candidatura_id = candidaturas_map.get((sequencial, ano))
            if not candidatura_id:
                # Fallback: tenta (numero, sigla_partido, ano, uf).
                # Resolve o caso histórico onde o sequencial do banco diverge
                # do sequencial atual no CSV do TSE (eleitos antigos com 0
                # votos). A combinação numero+partido+ano+uf é única.
                numero = _get_col(row, COL_NUMERO_CAND)
                sigla = _get_col(row, COL_SIGLA_PARTIDO)
                uf = _get_col(row, COL_UF)
                fb_key = (numero, sigla.upper(), ano, uf.upper())
                candidatura_id = candidaturas_fallback_map.get(fb_key)
                if candidatura_id:
                    fallback_hits += 1
                else:
                    ignorados += 1
                    continue

            # Zona eleitoral
            try:
                zona_num = int(zona_num_str) if zona_num_str else None
            except ValueError:
                zona_num = None

            zona_id = None
            if zona_num is not None:
                zona_key = (municipio_id, zona_num)
                if zona_key not in zonas_cache:
                    # Cria a zona se não existir
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
                        # Já existe — busca
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
                    INSERT INTO votos_por_zona
                        (candidatura_id, municipio_id, zona_id, turno, qt_votos)
                    VALUES (:cid, :mid, :zid, :turno, :votos)
                    ON CONFLICT (candidatura_id, municipio_id, zona_id, turno)
                    DO UPDATE SET qt_votos = EXCLUDED.qt_votos
                """),
                {
                    "cid": candidatura_id, "mid": municipio_id,
                    "zid": zona_id, "turno": turno, "votos": votos,
                }
            )
            inseridos += 1

            if inseridos % BATCH_SIZE == 0:
                session.commit()

    session.commit()
    return inseridos, fallback_hits


def importar_votos(anos: list[int] = None, forcar: bool = False):
    """
    Importa votos por zona/turno para os anos indicados.

    Se `forcar=True`, ignora o check `ano_ja_importado` e reprocessa o CSV
    inteiro — útil para re-importar após correção de bug de ETL. Como o
    INSERT usa `ON CONFLICT (candidatura_id, municipio_id, zona_id, turno)
    DO UPDATE`, registros já corretos viram no-op e novos turnos viram
    INSERT.
    """
    if anos is None:
        anos = TODOS_OS_ANOS

    if not test_connection():
        return False

    session = get_session()
    try:
        print("[votos] Carregando cache de municípios...")
        rows = session.execute(text("SELECT codigo_tse, id FROM municipios")).fetchall()
        # Garante chaves como string (DB retorna int, CSV retorna str)
        municipios_map = {str(r[0]): r[1] for r in rows}
        print(f"  {len(municipios_map)} municípios")

        print("[votos] Carregando cache de zonas...")
        rows = session.execute(
            text("SELECT municipio_id, numero, id FROM zonas_eleitorais")
        ).fetchall()
        zonas_cache = {(r[0], r[1]): r[2] for r in rows}
        print(f"  {len(zonas_cache)} zonas existentes")

    except Exception as e:
        print(f"[votos] ERRO ao carregar caches: {e}")
        session.close()
        return False

    total_inseridos = 0

    for ano in anos:
        print(f"\n{'='*50}")
        print(f"[votos] Processando ano {ano}")

        if not forcar and ano_ja_importado(ano, session):
            print(f"  [skip] Votos de {ano} já importados")
            continue
        if forcar:
            print(f"  [forcar=True] reprocessando CSV (UPSERT na chave única)")

        # Carrega candidaturas do ano (cache primário por sequencial)
        print(f"  Carregando candidaturas de {ano}...")
        rows = session.execute(
            text("""
                SELECT c.id, cand.sequencial_tse,
                       c.numero_candidato, p.sigla, c.estado_uf
                FROM candidaturas c
                JOIN candidatos cand ON cand.id = c.candidato_id
                JOIN partidos    p   ON p.id = c.partido_id
                WHERE c.ano = :ano
            """),
            {"ano": ano}
        ).fetchall()
        candidaturas_map = {(r[1], ano): r[0] for r in rows}
        # Cache de fallback: (numero, sigla, ano, uf) → candidatura_id
        candidaturas_fallback_map: dict = {}
        for r in rows:
            cid, _seq, numero, sigla, uf = r[0], r[1], r[2], r[3], r[4]
            if numero and sigla and uf:
                candidaturas_fallback_map[(str(numero), sigla.upper(), ano, uf.upper())] = cid
        print(f"  {len(candidaturas_map)} candidaturas carregadas (fallback={len(candidaturas_fallback_map)})")

        if not candidaturas_map:
            print(f"  [aviso] Sem candidaturas para {ano} — execute o passo 3 primeiro")
            continue

        # Download se necessário
        zip_path = DADOS_BRUTOS / "votos" / f"votacao_candidato_munzona_{ano}.zip"
        if not zip_path.exists():
            downloads = download_votos_municipio([ano])
            if ano not in downloads:
                print(f"  [skip] Não foi possível baixar votos {ano}")
                continue
            zip_path = downloads[ano]

        # Extrai
        extract_dir = extract_zip(zip_path)

        # Processa cada UF
        csvs = sorted(extract_dir.glob(f"votacao_candidato_munzona_{ano}_*.csv"))
        if not csvs:
            csvs = sorted(extract_dir.glob("*.csv"))

        if not csvs:
            print(f"  [aviso] Nenhum CSV encontrado")
            continue

        print(f"  {len(csvs)} arquivos UF para processar")

        for i, csv_path in enumerate(csvs, 1):
            uf = csv_path.stem.split("_")[-1]

            # Pula arquivo BRASIL (agregado nacional — dados já nos UFs individuais)
            if uf.upper() == "BRASIL":
                print(f"  [{i}/{len(csvs)}] {uf}... [skip — agregado, dados já nos UFs]")
                continue

            print(f"  [{i}/{len(csvs)}] {uf}...", end=" ", flush=True)

            try:
                n, fb = processar_votos_csv(
                    csv_path, ano, municipios_map, candidaturas_map,
                    candidaturas_fallback_map, zonas_cache, session
                )
                total_inseridos += n
                if fb > 0:
                    print(f"{n} registros (fallback={fb})")
                else:
                    print(f"{n} registros")
            except Exception as e:
                session.rollback()
                print(f"\n  [erro] {csv_path.name}: {e}")

    total_db = session.execute(text("SELECT COUNT(*) FROM votos_por_zona")).scalar()
    zonas_db = session.execute(text("SELECT COUNT(*) FROM zonas_eleitorais")).scalar()
    print(f"\n[votos] Inseridos nesta sessão: {total_inseridos}")
    print(f"[votos] Total banco: {total_db} votos, {zonas_db} zonas")

    session.close()
    return True


if __name__ == "__main__":
    import sys as _sys
    args = _sys.argv[1:]
    forcar = False
    if "--forcar" in args:
        forcar = True
        args = [a for a in args if a != "--forcar"]
    anos_arg = [int(a) for a in args] if args else None

    print("=== Passo 4 — Importar Votos por Zona ===\n")
    if forcar:
        print("[modo] forcar=True (reprocessa CSV mesmo se ano já importado)\n")
    importar_votos(anos_arg, forcar=forcar)
    print("\n[done]")
