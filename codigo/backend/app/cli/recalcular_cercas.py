"""
CLI: Recalcula KPIs de todas as cercas virtuais ativas.

Uso:
    docker exec ub_backend python -m app.cli.recalcular_cercas

Para agendar via cron (dentro do container ou externo):
    0 3 * * * docker exec ub_backend python -m app.cli.recalcular_cercas >> /var/log/cercas.log 2>&1

Saida JSON com resumo do processamento.
"""
import asyncio
import json
import sys
from datetime import datetime, timezone


async def main() -> int:
    """Retorna 0 em sucesso, 1 em falha."""
    from app.core.database import AsyncSessionLocal
    from app.services.campanha_agregacao import recalcular_todas_cercas_ativas

    inicio = datetime.now(tz=timezone.utc).isoformat()
    print(f"[{inicio}] Iniciando recalculo de cercas...", flush=True)

    async with AsyncSessionLocal() as db:
        try:
            resultado = await recalcular_todas_cercas_ativas(db)
            resultado["iniciado_em"] = inicio
            resultado["finalizado_em"] = datetime.now(tz=timezone.utc).isoformat()
            print(json.dumps(resultado, ensure_ascii=False, indent=2), flush=True)

            if resultado.get("erros"):
                print(
                    f"[AVISO] {len(resultado['erros'])} cerca(s) com erro.",
                    file=sys.stderr,
                    flush=True,
                )

            return 0

        except Exception as e:
            print(
                f"[ERRO FATAL] {type(e).__name__}: {e}",
                file=sys.stderr,
                flush=True,
            )
            return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
