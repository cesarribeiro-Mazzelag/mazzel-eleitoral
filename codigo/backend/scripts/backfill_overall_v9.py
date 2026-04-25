"""Backfill da tabela politico_overall_v9.

Uso (dentro do container):
  docker exec ub_backend python -m scripts.backfill_overall_v9 --help
  docker exec ub_backend python -m scripts.backfill_overall_v9 --only-eleitos --limit 100
  docker exec ub_backend python -m scripts.backfill_overall_v9 --candidato-id 931510

Estrategia padrao (sem args): processa SO eleitos em ordem de votos.
Sao ~70k candidatos — leva algumas horas. Roda offline.

Exemplos uteis:
  --only-eleitos                 # padrao
  --min-votos 50000              # nao-eleitos com 50k+ votos
  --cargos PRESIDENTE GOVERNADOR # filtra cargos altos
  --candidato-id 931510          # 1 candidato (smoke test)
  --limit 100                    # limita processamento
  --include-nao-eleitos          # remove filtro de eleitos
"""
from __future__ import annotations

import argparse
import asyncio
import time

from app.core.database import AsyncSessionLocal
from app.services.overall_v9_batch import (
    backfill,
    calcular_e_persistir,
    listar_candidatos_priorizados,
)


async def _run(args) -> None:
    inicio = time.monotonic()

    async with AsyncSessionLocal() as db:
        if args.candidato_id:
            print(f"Processando candidato_id={args.candidato_id} ...")
            res = await calcular_e_persistir(db, args.candidato_id)
            print(f"OK overall={res}")
            return

        only_eleitos = not args.include_nao_eleitos
        ids = await listar_candidatos_priorizados(
            db,
            only_eleitos=only_eleitos,
            min_votos=args.min_votos,
            cargos=args.cargos or None,
            limit=args.limit,
        )
        print(f"Encontrados {len(ids)} candidato_ids para backfill.")
        print(
            f"Filtros: only_eleitos={only_eleitos} min_votos={args.min_votos} "
            f"cargos={args.cargos} limit={args.limit}"
        )

        stats = await backfill(db, ids, log_every=args.log_every)

    duracao = time.monotonic() - inicio
    print(f"\nFim em {duracao:.1f}s")
    print(f"Stats: {stats}")


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--candidato-id", type=int, help="Processa apenas 1 candidato.")
    p.add_argument("--include-nao-eleitos", action="store_true",
                   help="Inclui nao-eleitos (com min-votos opcional).")
    p.add_argument("--min-votos", type=int, default=0,
                   help="Filtro de votos minimos (default 0).")
    p.add_argument("--cargos", nargs="*", default=None,
                   help="Lista de cargos (ex: PRESIDENTE GOVERNADOR).")
    p.add_argument("--limit", type=int, default=None,
                   help="Limite de candidatos a processar.")
    p.add_argument("--log-every", type=int, default=100,
                   help="Frequencia de log de progresso (default 100).")
    return p.parse_args()


if __name__ == "__main__":
    asyncio.run(_run(_parse_args()))
