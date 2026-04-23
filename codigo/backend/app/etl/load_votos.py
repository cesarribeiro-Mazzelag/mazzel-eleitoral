"""
Carrega votos por zona/seção no banco.
Processa em chunks para não explodir a memória (arquivo 2024 tem 717k linhas).
"""
import pandas as pd
from pathlib import Path
from sqlalchemy import text
from app.etl.config import (
    DATA_DIR, TSE_SEP, TSE_ENC, NUMEROS_UNIAO, COLUNAS_VOTO,
)

CHUNK = 50_000  # linhas por batch


def carregar_votos(conn, ano: int):
    pasta = DATA_DIR / f"voto_{ano}"
    csvs = list(pasta.glob("*.csv"))
    if not csvs:
        print(f"  ⚠ Nenhum CSV em {pasta}")
        return 0

    # Pré-carrega mapa de candidaturas para lookup rápido
    rows = conn.execute(text("""
        SELECT c.sequencial_tse, ca.id
        FROM candidaturas ca
        JOIN candidatos c ON c.id = ca.candidato_id
        WHERE ca.ano = :ano
    """), {"ano": ano}).fetchall()
    seq_to_cand_id = {r[0]: r[1] for r in rows}

    if not seq_to_cand_id:
        print(f"  ⚠ {ano}: nenhuma candidatura no banco — rode load_candidatos primeiro")
        return 0

    rows_mun = conn.execute(text("SELECT codigo_tse, id FROM municipios")).fetchall()
    tse_to_mun_id = {str(r[0]): r[1] for r in rows_mun}

    total = 0
    for csv_path in csvs:
        try:
            reader = pd.read_csv(
                csv_path, sep=TSE_SEP, encoding=TSE_ENC, dtype=str,
                low_memory=False, chunksize=CHUNK, on_bad_lines="skip",
            )
        except Exception as e:
            print(f"    ⚠ {csv_path.name}: {e}")
            continue

        for chunk in reader:
            chunk.columns = [c.strip() for c in chunk.columns]

            if "NR_PARTIDO" not in chunk.columns:
                continue

            chunk["NR_PARTIDO"] = pd.to_numeric(chunk["NR_PARTIDO"], errors="coerce")
            chunk = chunk[chunk["NR_PARTIDO"].isin(NUMEROS_UNIAO)]
            if chunk.empty:
                continue

            batch = []
            for _, row in chunk.iterrows():
                seq    = str(row.get("SQ_CANDIDATO", "")).strip()
                cod    = str(row.get("CD_MUNICIPIO", "")).strip().lstrip("0")
                zona   = str(row.get("NR_ZONA", "")).strip()
                votos  = int(str(row.get("QT_VOTOS_NOMINAIS", "0") or "0").replace(",", "") or 0)

                cand_id = seq_to_cand_id.get(seq)
                mun_id  = tse_to_mun_id.get(cod)

                if not cand_id or not mun_id:
                    continue

                batch.append({
                    "cand_id": cand_id,
                    "mun_id":  mun_id,
                    "zona":    int(zona) if zona.isdigit() else None,
                    "votos":   votos,
                })

            if batch:
                conn.execute(text("""
                    INSERT INTO votos_por_zona (candidatura_id, municipio_id, qt_votos)
                    SELECT :cand_id, :mun_id, :votos
                    WHERE NOT EXISTS (
                        SELECT 1 FROM votos_por_zona
                        WHERE candidatura_id = :cand_id AND municipio_id = :mun_id
                          AND COALESCE(zona_id, 0) = 0
                    )
                """), batch)
                total += len(batch)

        conn.commit()

    # Atualiza votos_total em candidaturas
    conn.execute(text("""
        UPDATE candidaturas ca
        SET votos_total = sub.total
        FROM (
            SELECT candidatura_id, SUM(qt_votos) AS total
            FROM votos_por_zona
            GROUP BY candidatura_id
        ) sub
        WHERE ca.id = sub.candidatura_id AND ca.ano = :ano
    """), {"ano": ano})
    conn.commit()

    print(f"  ✓ {ano}: {total} registros de votos carregados")
    return total
