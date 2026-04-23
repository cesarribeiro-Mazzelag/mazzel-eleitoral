"""ETL 34: Pipeline orquestrador - aplica ETL 31+32+33+22 em sequencia.

Pra cada distrito do municipio:
    1. ETL 31 - refinamento automatico (Laplacian + Simplify)
    2. ETL 32 - poda invasoes + limpa pontas agudas / colineares
    3. ETL 33 - preenche gaps orfaos (guard rail anti-ilha)
    4. ETL 22 - regenera bordas dissolvidas

Proteção: microzonas com origem='manual_edit' NUNCA sao tocadas (os
ETLs individuais ja tem esse filtro).

Uso:
    python3 34_pipeline_completo.py --municipio 3550308
    python3 34_pipeline_completo.py --municipio 3550308 --distrito-inicial Tatuape
"""
from __future__ import annotations
import argparse
import subprocess
import sys
import time
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


ETL_DIR = Path(__file__).parent


def rodar_etl(script: str, args: list[str]) -> bool:
    """Roda um script ETL e retorna True se sucesso."""
    cmd = [sys.executable, str(ETL_DIR / script)] + args
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if r.returncode != 0:
            print(f"    ERRO em {script}: {r.stderr[-500:]}")
            return False
        return True
    except Exception as e:
        print(f"    EXCECAO em {script}: {e}")
        return False


def processar_distrito(cd_dist: str, nm_dist: str, municipio: str, idx: int, total: int):
    inicio = time.time()
    print(f"\n[{idx}/{total}] {nm_dist} ({cd_dist})")

    # 1. Refinamento automatico
    if not rodar_etl("31_refinamento_automatico.py", ["--distrito", cd_dist]):
        print("  31 falhou, pulando distrito")
        return False
    print(f"  1. refinamento OK")

    # 2. Poda invasoes + pontas
    if not rodar_etl("32_podar_invasoes.py", ["--distrito", cd_dist]):
        print("  32 falhou, pulando distrito")
        return False
    print(f"  2. poda OK")

    # 3. Preenche gaps
    if not rodar_etl("33_preencher_gaps.py", ["--distrito", cd_dist]):
        print("  33 falhou, continuando sem gaps")
    else:
        print(f"  3. gaps OK")

    # 4. Bordas dissolvidas
    if not rodar_etl("22_bordas_dissolvidas.py", ["--municipio", municipio, "--distrito", cd_dist]):
        print("  22 falhou, continuando sem bordas")
    else:
        print(f"  4. bordas OK")

    print(f"  concluido em {time.time() - inicio:.1f}s")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipio", required=True)
    parser.add_argument("--distrito-inicial", help="Nome do distrito pra comecar (retomar)")
    args = parser.parse_args()

    cd_mun = args.municipio.zfill(7)

    with engine.connect() as conn:
        r = conn.execute(text(
            "SELECT id, nome FROM municipios WHERE codigo_ibge = :c"
        ), {"c": cd_mun}).fetchone()
        if not r:
            print(f"municipio {args.municipio} nao encontrado")
            return
        nome_mun = r.nome

        distritos = conn.execute(text("""
            SELECT dm.cd_dist, dm.nm_dist
            FROM distritos_municipio dm
            WHERE dm.cd_mun = :cm
              AND EXISTS (
                SELECT 1 FROM microregioes mr
                WHERE mr.distrito_cd = dm.cd_dist
                  AND mr.origem = 'voronoi_v2'
                  AND mr.congelada_em IS NULL
              )
            ORDER BY dm.nm_dist
        """), {"cm": cd_mun}).fetchall()

    # Filtro --distrito-inicial: pula ate encontrar (pra retomar)
    if args.distrito_inicial:
        idx = next(
            (i for i, d in enumerate(distritos) if d.nm_dist.lower().startswith(args.distrito_inicial.lower())),
            0
        )
        distritos = distritos[idx:]

    print(f"\n{nome_mun}: {len(distritos)} distritos a processar.")
    print("(distritos sem voronoi_v2 sao pulados; microzonas manual_edit sao protegidas)")

    inicio_total = time.time()
    sucessos = 0
    falhas = 0
    for idx, d in enumerate(distritos, 1):
        ok = processar_distrito(d.cd_dist, d.nm_dist, args.municipio, idx, len(distritos))
        if ok: sucessos += 1
        else: falhas += 1

    print(f"\n{'=' * 60}")
    print(f"Pipeline completo: {sucessos}/{len(distritos)} distritos processados")
    print(f"Falhas: {falhas}")
    print(f"Tempo total: {(time.time() - inicio_total)/60:.1f} min")


if __name__ == "__main__":
    main()
