"""
Script auxiliar: popula `candidaturas.ficha_limpa` a partir do
campo `DS_SITUACAO_CANDIDATURA` dos CSVs consulta_cand do TSE.

Mapeamento:
    APTO   -> true  (candidatura deferida / sem impedimento)
    INAPTO -> false (indeferida / ineligivel)
    resto  -> null  (dado ausente, #NE, etc)

Dados disponiveis em CSVs 2018/2020/2022. Os CSVs 2024 locais tem
apenas #NE nesse campo (dataset preliminar do TSE) - pular 2024.

Junta por SQ_CANDIDATO (sequencial_tse) + ano.
"""
from __future__ import annotations
import sys
import csv
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from sqlalchemy import text
from db import get_session, test_connection
from config import DADOS_BRUTOS


def _mapear(valor: str) -> Optional[bool]:
    v = (valor or "").strip().strip('"').upper()
    if v == "APTO":
        return True
    if v == "INAPTO":
        return False
    return None


def atualizar_ficha_limpa(anos: list[int]) -> bool:
    if not test_connection():
        return False

    session = get_session()
    sucesso = True
    try:
        for ano in anos:
            pasta = DADOS_BRUTOS / "candidatos" / f"consulta_cand_{ano}"
            if not pasta.exists():
                print(f"[ficha_limpa] Pasta {pasta} nao encontrada, pulando {ano}")
                continue

            csvs = sorted(
                f for f in pasta.glob(f"consulta_cand_{ano}_*.csv")
                if not f.stem.upper().endswith(("_BRASIL", "_BR"))
            )
            print(f"\n[ficha_limpa] Lendo {len(csvs)} CSVs de {ano}...")

            # sequencial_tse -> Optional[bool]
            ficha_por_seq: dict = {}
            null_count = 0
            apto_count = 0
            inapto_count = 0
            for i, csv_path in enumerate(csvs, 1):
                uf = csv_path.stem.split("_")[-1]
                with open(csv_path, encoding="latin-1") as f:
                    reader = csv.DictReader(f, delimiter=";", quotechar='"')
                    for row in reader:
                        seq = row.get("SQ_CANDIDATO", "").strip().strip('"')
                        if not seq:
                            continue
                        sit = _mapear(row.get("DS_SITUACAO_CANDIDATURA", ""))
                        ficha_por_seq[seq] = sit
                        if sit is True:
                            apto_count += 1
                        elif sit is False:
                            inapto_count += 1
                        else:
                            null_count += 1
                print(f"  [{i}/{len(csvs)}] {uf} — {len(ficha_por_seq):,} seqs", end="\r")

            print(
                f"\n  {len(ficha_por_seq):,} seqs lidos — "
                f"APTO={apto_count:,}, INAPTO={inapto_count:,}, NULL={null_count:,}"
            )

            # Se 90%+ vierem null, pular (dataset sem info)
            total_classificados = apto_count + inapto_count
            if total_classificados < len(ficha_por_seq) * 0.1:
                print(f"  [skip] {ano} nao tem dados de situacao (todos #NE ou vazios)")
                continue

            # Mapear sequencial_tse -> candidatura_id (ano)
            rows = session.execute(text("""
                SELECT c.sequencial_tse, ca.id
                FROM candidatos c
                JOIN candidaturas ca ON ca.candidato_id = c.id
                WHERE ca.ano = :ano
            """), {"ano": ano}).fetchall()
            seq_to_cand = {r[0]: r[1] for r in rows}
            print(f"  {len(seq_to_cand):,} candidaturas encontradas no banco para {ano}")

            # Bulk update separado para true/false (skip null)
            batch_true = [
                {"id": seq_to_cand[seq]}
                for seq, v in ficha_por_seq.items()
                if v is True and seq in seq_to_cand
            ]
            batch_false = [
                {"id": seq_to_cand[seq]}
                for seq, v in ficha_por_seq.items()
                if v is False and seq in seq_to_cand
            ]

            if batch_true:
                session.execute(
                    text("UPDATE candidaturas SET ficha_limpa = TRUE WHERE id = :id"),
                    batch_true,
                )
            if batch_false:
                session.execute(
                    text("UPDATE candidaturas SET ficha_limpa = FALSE WHERE id = :id"),
                    batch_false,
                )
            session.commit()
            print(
                f"  atualizadas: {len(batch_true):,} APTO, "
                f"{len(batch_false):,} INAPTO"
            )

    except Exception as e:
        print(f"[ficha_limpa] ERRO: {e}")
        sucesso = False
        session.rollback()
    finally:
        session.close()

    return sucesso


if __name__ == "__main__":
    anos_arg = [int(a) for a in sys.argv[1:]] if len(sys.argv) > 1 else [2018, 2020, 2022]
    print(f"=== atualizar_ficha_limpa → {anos_arg} ===")
    ok = atualizar_ficha_limpa(anos_arg)
    sys.exit(0 if ok else 1)
