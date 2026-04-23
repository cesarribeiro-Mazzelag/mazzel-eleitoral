"""
Pipeline ETL completo — Plataforma Eleitoral União Brasil
Executa todos os passos em ordem, com verificação de pré-requisitos.

Uso:
  python run_all.py                     # todos os anos (2008-2024)
  python run_all.py 2020 2024           # anos específicos
  python run_all.py --passo 3           # a partir do passo 3
  python run_all.py --apenas-download   # só baixa, não importa
  python run_all.py --sem-votos         # pula votos por zona (mais rápido)
"""
import sys
import time
import argparse
from datetime import datetime

sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent / "codigo" / "backend"))


def formatar_tempo(segundos: float) -> str:
    if segundos < 60:
        return f"{segundos:.0f}s"
    elif segundos < 3600:
        return f"{segundos/60:.1f}min"
    else:
        return f"{segundos/3600:.1f}h"


# Materialized views do mapa eleitoral (criadas pela migration 013).
# REFRESH CONCURRENTLY exige o índice UNIQUE que a migration já criou
# e mantém o mapa servindo as queries durante o recálculo.
MV_MAPA = (
    "mv_score_estado",
    "mv_score_municipio",
    "mv_dominancia_estado",
    "mv_dominancia_municipio",
)


def refresh_materialized_views() -> bool:
    """
    Recalcula as MVs do mapa eleitoral. Deve rodar depois que candidaturas/
    votos foram atualizados (final do pipeline). REFRESH CONCURRENTLY garante
    que o backend continua servindo dados antigos enquanto a nova versão é
    construída em segundo plano.
    """
    from db import engine
    from sqlalchemy import text

    print("\n" + "─" * 60)
    print("PASSO 6/6 — Refresh das Materialized Views do mapa")

    sucesso = True
    # Cada REFRESH precisa rodar fora de um BEGIN explícito (autocommit)
    # porque CONCURRENTLY não pode estar em uma transação multi-statement.
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        for mv in MV_MAPA:
            t = time.time()
            try:
                conn.execute(text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {mv}"))
                print(f"  [ok] {mv:<26} ({formatar_tempo(time.time() - t)})")
            except Exception as e:
                print(f"  [ERRO] {mv}: {e}")
                sucesso = False
    return sucesso


def main():
    parser = argparse.ArgumentParser(description="Pipeline ETL — União Brasil")
    parser.add_argument("anos", nargs="*", type=int, help="Anos a processar (ex: 2020 2024)")
    parser.add_argument("--passo", type=int, default=1, help="Iniciar a partir do passo (1-6)")
    parser.add_argument("--apenas-download", action="store_true", help="Só baixa os arquivos")
    parser.add_argument("--sem-votos", action="store_true", help="Pula passo 4 (votos por zona)")
    args = parser.parse_args()

    anos = args.anos if args.anos else None
    inicio_total = time.time()

    print("=" * 60)
    print("PIPELINE ETL — PLATAFORMA ELEITORAL UNIÃO BRASIL")
    print(f"Início: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    if anos:
        print(f"Anos: {anos}")
    else:
        print("Anos: todos (2008-2024)")
    print("=" * 60)

    # --- Verificação de conexão ---
    from db import test_connection
    if not test_connection():
        print("\n[ERRO] Banco de dados indisponível.")
        print("Verifique se o Docker está rodando:")
        print("  docker compose up -d ub_postgres")
        sys.exit(1)

    resultados = {}

    # --- Passo 1: Partidos ---
    if args.passo <= 1 and not args.apenas_download:
        print("\n" + "─" * 60)
        print("PASSO 1/5 — Importar Partidos")
        t = time.time()
        from importlib import import_module
        m = import_module("01_partidos")
        ok = m.importar_partidos()
        resultados["Partidos"] = ("OK" if ok else "ERRO", formatar_tempo(time.time() - t))

    # --- Passo 2: Municípios ---
    if args.passo <= 2 and not args.apenas_download:
        print("\n" + "─" * 60)
        print("PASSO 2/5 — Importar Municípios + Geometrias")
        t = time.time()
        import municipios_02 as m2
        ok = m2.importar_municipios(com_populacao=True)
        resultados["Municípios"] = ("OK" if ok else "ERRO", formatar_tempo(time.time() - t))

    # --- Download (sempre antes dos passos 3 e 4) ---
    if args.passo <= 3:
        print("\n" + "─" * 60)
        print("DOWNLOAD — Candidatos TSE")
        t = time.time()
        from download import download_candidatos
        download_candidatos(anos)
        resultados["Download Candidatos"] = ("OK", formatar_tempo(time.time() - t))

    if args.passo <= 4 and not args.sem_votos:
        print("\n" + "─" * 60)
        print("DOWNLOAD — Votos por Município/Zona TSE")
        t = time.time()
        from download import download_votos_municipio
        download_votos_municipio(anos)
        resultados["Download Votos"] = ("OK", formatar_tempo(time.time() - t))

    if args.apenas_download:
        print("\n[done] Downloads concluídos. Use sem --apenas-download para importar.")
        _print_resumo(resultados, inicio_total)
        return

    # --- Passo 3: Candidatos ---
    if args.passo <= 3:
        print("\n" + "─" * 60)
        print("PASSO 3/5 — Importar Candidatos e Candidaturas")
        t = time.time()
        import candidatos_03 as m3
        ok = m3.importar_candidatos(anos)
        resultados["Candidatos"] = ("OK" if ok else "ERRO", formatar_tempo(time.time() - t))

    # --- Passo 4: Votos por zona ---
    if args.passo <= 4 and not args.sem_votos:
        print("\n" + "─" * 60)
        print("PASSO 4/5 — Importar Votos por Zona")
        print("[aviso] Este passo processa volumes grandes (2-5 GB/ano).")
        t = time.time()
        import votos_04 as m4
        ok = m4.importar_votos(anos)
        resultados["Votos por Zona"] = ("OK" if ok else "ERRO", formatar_tempo(time.time() - t))

    # --- Passo 4.5: Atualizar candidaturas.votos_total ---
    # Recalcula o total agregado por candidatura somando todos os turnos
    # diretamente dos CSVs do TSE. Idempotente. Roda sempre que o passo 4
    # rodar — o farol e o dossiê dependem desse campo.
    if args.passo <= 4 and not args.sem_votos:
        print("\n" + "─" * 60)
        print("PASSO 4.5 — Atualizar candidaturas.votos_total (1º + 2º turno)")
        t = time.time()
        from atualizar_votos_total import atualizar_votos_total
        anos_total = anos if anos else None
        if anos_total is None:
            from config import TODOS_OS_ANOS
            anos_total = TODOS_OS_ANOS
        ok = atualizar_votos_total(anos_total)
        resultados["Votos Total"] = ("OK" if ok else "ERRO", formatar_tempo(time.time() - t))

    # --- Passo 5: Farol ---
    if args.passo <= 5 and not args.apenas_download:
        print("\n" + "─" * 60)
        print("PASSO 5/6 — Calcular Farol por Município")
        t = time.time()
        import farol_05 as m5
        ok = m5.calcular_todos_os_farois(anos)
        resultados["Farol"] = ("OK" if ok else "ERRO", formatar_tempo(time.time() - t))

    # --- Passo 6: Refresh das materialized views do mapa ---
    if args.passo <= 6 and not args.apenas_download:
        t = time.time()
        ok = refresh_materialized_views()
        resultados["MV Mapa"] = ("OK" if ok else "ERRO", formatar_tempo(time.time() - t))

    _print_resumo(resultados, inicio_total)


def _print_resumo(resultados: dict, inicio_total: float):
    print("\n" + "=" * 60)
    print("RESUMO DO PIPELINE")
    print("=" * 60)
    for passo, (status, tempo) in resultados.items():
        icone = "✓" if status == "OK" else "✗"
        print(f"  {icone} {passo:<25} {status:<6} {tempo}")
    print(f"\nTempo total: {formatar_tempo(time.time() - inicio_total)}")
    print(f"Fim: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")


if __name__ == "__main__":
    # Adiciona o diretório do ETL ao path para imports relativos
    import os
    os.chdir(str(__import__("pathlib").Path(__file__).parent))

    # Renomeia módulos para import sem números no nome
    import importlib.util, sys as _sys

    def _load(name, file):
        spec = importlib.util.spec_from_file_location(name, file)
        mod = importlib.util.module_from_spec(spec)
        _sys.modules[name] = mod
        spec.loader.exec_module(mod)
        return mod

    etl_dir = __import__("pathlib").Path(__file__).parent
    _load("municipios_02", etl_dir / "02_municipios.py")
    _load("candidatos_03", etl_dir / "03_candidatos.py")
    _load("votos_04", etl_dir / "04_votos_zona.py")
    _load("farol_05", etl_dir / "05_farol.py")

    main()
