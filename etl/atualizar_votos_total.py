"""
Script auxiliar: atualiza candidaturas.votos_total somando os votos
de todos os CSVs de votacao_candidato_munzona_{ano}.
Junta por SQ_CANDIDATO (sequencial_tse) + ano.

Soma TODAS as linhas dos CSVs (independente de NR_TURNO), portanto o
`votos_total` resultante representa o total combinado 1º turno + 2º turno.
"""
import sys
import csv
from pathlib import Path
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from sqlalchemy import text
from db import get_session, test_connection
from config import DADOS_BRUTOS


def atualizar_votos_total(anos: list[int]) -> bool:
    """
    Recalcula `candidaturas.votos_total` para os anos indicados, somando
    diretamente dos CSVs do TSE. Idempotente: pode ser executado quantas
    vezes quiser que o resultado é o mesmo.
    """
    if not test_connection():
        return False

    session = get_session()
    sucesso = True
    try:
        for ano in anos:
            pasta = DADOS_BRUTOS / "votos" / f"votacao_candidato_munzona_{ano}"
            if not pasta.exists():
                print(f"[votos] Pasta {pasta} não encontrada, pulando {ano}")
                continue

            # Exclui arquivos agregados (BRASIL, BR) — contêm todos os UFs e causariam double-counting
            csvs = sorted(
                f for f in pasta.glob(f"votacao_candidato_munzona_{ano}_*.csv")
                if not f.stem.upper().endswith(("_BRASIL", "_BR"))
            )
            print(f"\n[votos] Somando votos de {len(csvs)} CSVs para {ano} (excluindo BRASIL/BR)...")

            # Acumula votos por sequencial_tse
            votos_por_seq: dict[str, int] = defaultdict(int)
            for i, csv_path in enumerate(csvs, 1):
                uf = csv_path.stem.split("_")[-1]
                with open(csv_path, encoding="latin-1") as f:
                    reader = csv.DictReader(f, delimiter=";", quotechar='"')
                    for row in reader:
                        seq = row.get("SQ_CANDIDATO", "").strip().strip('"')
                        v_str = row.get("QT_VOTOS_NOMINAIS_VALIDOS") or row.get("QT_VOTOS_NOMINAIS", "0")
                        try:
                            v = int(v_str.strip().strip('"'))
                        except (ValueError, AttributeError):
                            v = 0
                        if seq:
                            votos_por_seq[seq] += v
                print(f"  [{i}/{len(csvs)}] {uf} — {len(votos_por_seq):,} seqs acumulados", end="\r")

            print(f"\n  {len(votos_por_seq):,} candidatos com votos somados")

            # Busca candidatos do ano no banco (sequencial_tse → candidatura_id)
            rows = session.execute(text("""
                SELECT c.sequencial_tse, ca.id
                FROM candidatos c
                JOIN candidaturas ca ON ca.candidato_id = c.id
                WHERE ca.ano = :ano
            """), {"ano": ano}).fetchall()

            seq_to_cand = {r[0]: r[1] for r in rows}
            print(f"  {len(seq_to_cand):,} candidaturas encontradas no banco")

            # Atualiza em batch
            atualizados = 0
            batch = []
            for seq, votos in votos_por_seq.items():
                cand_id = seq_to_cand.get(seq)
                if cand_id:
                    batch.append({"id": cand_id, "votos": votos})

            if batch:
                session.execute(text("""
                    UPDATE candidaturas SET votos_total = :votos WHERE id = :id
                """), batch)
                session.commit()
                atualizados = len(batch)

            print(f"  {atualizados:,} candidaturas atualizadas com votos_total")

    except Exception as e:
        print(f"[votos_total] ERRO: {e}")
        sucesso = False
        session.rollback()
    finally:
        session.close()

    return sucesso


if __name__ == "__main__":
    anos_arg = [int(a) for a in sys.argv[1:]] if len(sys.argv) > 1 else [2024]
    print(f"=== atualizar_votos_total → {anos_arg} ===")
    ok = atualizar_votos_total(anos_arg)
    sys.exit(0 if ok else 1)
