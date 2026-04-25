"""
CLI: Coletar atividade parlamentar (presenca + liderancas).

Uso:
    docker exec ub_backend python -m app.cli.coletar_parlamentares --camara
    docker exec ub_backend python -m app.cli.coletar_parlamentares --senado
    docker exec ub_backend python -m app.cli.coletar_parlamentares --ambos
    docker exec ub_backend python -m app.cli.coletar_parlamentares --ambos --ano 2023

Fontes:
    Camara: https://dadosabertos.camara.leg.br/api/v2/
    Senado:  https://legis.senado.leg.br/dadosabertos/

Preenchimento:
    mandatos_legislativo.presenca_plenario_pct
    mandatos_legislativo.presenca_comissoes_pct
    mandatos_legislativo.sessoes_plenario_total
    mandatos_legislativo.sessoes_plenario_presente
    mandatos_legislativo.cargos_lideranca
    mandatos_legislativo.atividade_atualizada_em

Nao cria novos mandatos — apenas atualiza os que ja existem.
Idempotente: pode rodar quantas vezes quiser sem duplicar.
"""
import argparse
import asyncio
import sys
from datetime import datetime, timezone


async def _rodar(camara: bool, senado: bool, ano: int) -> int:
    """Retorna 0 em sucesso, 1 se houve falhas."""
    from app.services.coleta_atividade_parlamentar import (
        coletar_deputados_federais,
        coletar_senadores,
    )

    inicio = datetime.now(tz=timezone.utc)
    print(f"\n{'='*60}", flush=True)
    print(f"Coleta de Atividade Parlamentar", flush=True)
    print(f"Inicio: {inicio.isoformat()}", flush=True)
    print(f"Ano referencia: {ano}", flush=True)
    print(f"{'='*60}\n", flush=True)

    resultados = {}
    cod_saida  = 0

    if camara:
        print("\n--- CAMARA DOS DEPUTADOS ---\n", flush=True)
        r = await coletar_deputados_federais(ano_referencia=ano)
        resultados["camara"] = r
        if r.get("skipped", 0) > 0:
            cod_saida = 1

    if senado:
        print("\n--- SENADO FEDERAL ---\n", flush=True)
        r = await coletar_senadores(ano_referencia=ano)
        resultados["senado"] = r
        if r.get("skipped", 0) > 0:
            cod_saida = 1

    fim = datetime.now(tz=timezone.utc)
    duracao = (fim - inicio).total_seconds()

    print(f"\n{'='*60}", flush=True)
    print(f"RESUMO FINAL (duracao: {duracao:.1f}s)", flush=True)
    print(f"{'='*60}", flush=True)

    for casa, r in resultados.items():
        total        = r.get("total", 0)
        importados   = r.get("importados", 0)
        skipped      = r.get("skipped", 0)
        sem_tse      = r.get("sem_candidato_tse", 0)
        pct_casamento = round((total - sem_tse) / total * 100, 1) if total > 0 else 0

        print(f"\n{casa.upper()}:", flush=True)
        print(f"  Total mandatos     : {total}", flush=True)
        print(f"  Importados OK      : {importados}", flush=True)
        print(f"  Erros / skipped    : {skipped}", flush=True)
        print(f"  Sem candidato TSE  : {sem_tse}", flush=True)
        print(f"  Casamento TSE      : {pct_casamento}%", flush=True)
        if r.get("erros"):
            print(f"  Erros detalhados:", flush=True)
            for e in r["erros"][:5]:
                print(f"    - {e}", flush=True)
            if len(r["erros"]) > 5:
                print(f"    ... (+{len(r['erros'])-5} mais)", flush=True)

    print(f"\nFinalizado em: {fim.isoformat()}", flush=True)
    return cod_saida


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Coleta presenca e liderancas parlamentares via APIs oficiais"
    )
    grupo = parser.add_mutually_exclusive_group(required=True)
    grupo.add_argument("--camara", action="store_true", help="Coleta apenas Camara dos Deputados")
    grupo.add_argument("--senado", action="store_true", help="Coleta apenas Senado Federal")
    grupo.add_argument("--ambos",  action="store_true", help="Coleta Camara e Senado")
    parser.add_argument(
        "--ano", type=int, default=2024,
        help="Ano de referencia para calcular presenca (default: 2024)"
    )
    args = parser.parse_args()

    camara = args.camara or args.ambos
    senado = args.senado or args.ambos

    codigo = asyncio.run(_rodar(camara=camara, senado=senado, ano=args.ano))
    sys.exit(codigo)


if __name__ == "__main__":
    main()
