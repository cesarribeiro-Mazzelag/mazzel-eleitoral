"""
Runner principal do ETL.
Executa todas as etapas em ordem:
  1. Download dos arquivos (TSE + IBGE)
  2. Municípios (mapeamento TSE↔IBGE + shapefile)
  3. Candidatos por eleição
  4. Votos por zona
  5. Farol de força

Uso dentro do container:
  docker exec ub_backend python -m app.etl.run
  docker exec ub_backend python -m app.etl.run --skip-download
  docker exec ub_backend python -m app.etl.run --only-farol
"""
import sys
import time
from sqlalchemy import create_engine

DB_URL = None  # preenchido em runtime


def _engine():
    import os
    url = os.getenv("DATABASE_URL", "").replace("+asyncpg", "+psycopg2")
    return create_engine(url, echo=False)


def run(skip_download=False, only_farol=False):
    from app.etl.config import TODOS_ANOS

    engine = _engine()
    t0 = time.time()

    print("=" * 60)
    print("PIPELINE ETL — PLATAFORMA ELEITORAL UNIÃO BRASIL")
    print("=" * 60)

    # ── Download ────────────────────────────────────────────────
    if not skip_download and not only_farol:
        from app.etl.download import baixar_tudo
        baixar_tudo()

    with engine.connect() as conn:
        # ── Municípios ───────────────────────────────────────────
        if not only_farol:
            from app.etl.load_municipios import carregar_municipios
            print("\n[ETAPA 1] Municípios")
            carregar_municipios(conn)

        # ── Candidatos ───────────────────────────────────────────
        if not only_farol:
            from app.etl.load_candidatos import carregar_candidatos
            print("\n[ETAPA 2] Candidatos")
            for ano in TODOS_ANOS:
                print(f"\n  → {ano}")
                carregar_candidatos(conn, ano)

        # ── Votos ────────────────────────────────────────────────
        if not only_farol:
            from app.etl.load_votos import carregar_votos
            print("\n[ETAPA 3] Votos por zona")
            for ano in TODOS_ANOS:
                print(f"\n  → {ano}")
                carregar_votos(conn, ano)

        # ── Farol ────────────────────────────────────────────────
        from app.etl.calcular_farol import calcular_farol
        print("\n[ETAPA 4] Farol de Força")
        calcular_farol(conn)

    elapsed = time.time() - t0
    print(f"\n{'='*60}")
    print(f"✓ Pipeline concluído em {elapsed/60:.1f} min")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    skip_dl    = "--skip-download" in sys.argv
    only_farol = "--only-farol"    in sys.argv
    run(skip_download=skip_dl, only_farol=only_farol)
