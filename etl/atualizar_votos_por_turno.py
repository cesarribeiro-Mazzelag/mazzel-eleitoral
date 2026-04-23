"""
Script: popula `candidaturas.votos_1t` e `candidaturas.votos_2t` a partir
dos CSVs `votacao_candidato_munzona_{ano}` (coluna NR_TURNO + QT_VOTOS_*).

Chave de match: sequencial_tse + ano. Soma todas as linhas de zonas.

Importante: nao altera `votos_total` existente. Idempotente.
"""
from __future__ import annotations
import sys
import csv
from pathlib import Path
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from sqlalchemy import text
from db import get_session, test_connection
from config import DADOS_BRUTOS


def _parse_int(s: str) -> int:
    s = (s or "").strip().strip('"')
    try:
        return int(s.replace(".", "").replace(",", ""))
    except ValueError:
        return 0


def atualizar_turnos(anos: list[int]) -> bool:
    if not test_connection():
        return False

    session = get_session()
    try:
        for ano in anos:
            pasta = DADOS_BRUTOS / "votos" / f"votacao_candidato_munzona_{ano}"
            if not pasta.exists():
                print(f"[turnos] pasta {pasta} nao existe, pulando {ano}")
                continue

            # Exclui agregados BRASIL / BR
            csvs = sorted(
                f for f in pasta.glob(f"votacao_candidato_munzona_{ano}_*.csv")
                if not f.stem.upper().endswith(("_BRASIL", "_BR"))
            )
            print(f"\n[turnos] {ano}: {len(csvs)} CSVs")

            # Acumula (seq, turno) -> votos
            votos: dict = defaultdict(int)
            for i, csv_path in enumerate(csvs, 1):
                uf = csv_path.stem.split("_")[-1]
                with open(csv_path, encoding="ISO-8859-1") as f:
                    r = csv.DictReader(f, delimiter=";", quotechar='"')
                    for row in r:
                        seq = (row.get("SQ_CANDIDATO", "") or "").strip().strip('"')
                        if not seq:
                            continue
                        turno = _parse_int(row.get("NR_TURNO", "1")) or 1
                        if turno not in (1, 2):
                            continue
                        v = _parse_int(row.get("QT_VOTOS_NOMINAIS_VALIDOS") or
                                       row.get("QT_VOTOS_NOMINAIS", "0"))
                        votos[(seq, turno)] += v
                print(f"  [{i}/{len(csvs)}] {uf} — {len(votos):,} pares acumulados", end="\r")

            # Separa em 2 dicts: seq -> votos_1t / seq -> votos_2t
            v1 = defaultdict(int)
            v2 = defaultdict(int)
            for (seq, t), v in votos.items():
                if t == 1:
                    v1[seq] = v
                elif t == 2:
                    v2[seq] = v
            print(f"\n  seqs com 1T: {len(v1):,}  |  com 2T: {len(v2):,}")

            # Seq -> candidatura_id(s) no banco para o ano
            rows = session.execute(text("""
                SELECT c.sequencial_tse, ca.id
                FROM candidatos c
                JOIN candidaturas ca ON ca.candidato_id = c.id
                WHERE ca.ano = :ano
            """), {"ano": ano}).fetchall()
            seq_to_ids: dict[str, list[int]] = defaultdict(list)
            for r in rows:
                seq_to_ids[r[0]].append(r[1])
            print(f"  candidaturas no banco: {len(rows):,}")

            # Bulk update: para cada seq, atualiza 1T e 2T (quando > 0)
            batch_1t = []
            batch_2t = []
            for seq, ids in seq_to_ids.items():
                if not ids:
                    continue
                v1_val = v1.get(seq, 0)
                v2_val = v2.get(seq, 0)
                for cid in ids:
                    if v1_val:
                        batch_1t.append({"id": cid, "v": v1_val})
                    if v2_val:
                        batch_2t.append({"id": cid, "v": v2_val})

            if batch_1t:
                session.execute(
                    text("UPDATE candidaturas SET votos_1t = :v WHERE id = :id"),
                    batch_1t,
                )
            if batch_2t:
                session.execute(
                    text("UPDATE candidaturas SET votos_2t = :v WHERE id = :id"),
                    batch_2t,
                )
            session.commit()
            print(f"  updated: {len(batch_1t):,} 1T, {len(batch_2t):,} 2T")

    except Exception as e:
        print(f"[turnos] ERRO: {e}")
        session.rollback()
        return False
    finally:
        session.close()
    return True


if __name__ == "__main__":
    anos = [int(a) for a in sys.argv[1:]] if len(sys.argv) > 1 else [2018, 2020, 2022, 2024]
    print(f"=== atualizar_votos_por_turno -> {anos} ===")
    atualizar_turnos(anos)
