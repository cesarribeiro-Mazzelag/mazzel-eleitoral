"""
Passo 47 - Execucao orcamentaria municipal via SICONFI (Tesouro Nacional).

Popula `execucao_orcamentaria_municipal` com DCA (Declaracao de Contas Anuais).
Impacto no dossie: Prefeitos/Vice-Prefeitos mostram a execucao orcamentaria
do municipio durante o mandato.

Fonte: https://apidatalake.tesouro.gov.br/ords/siconfi/tt/dca
Sem autenticacao. Iteramos municipio por municipio (filtro no_anexo nao funciona
na API, entao pegamos tudo e filtramos por cod_conta em Python).

Execucao:
  python3 47_siconfi_execucao_municipal.py              # ultimos 3 anos
  python3 47_siconfi_execucao_municipal.py --ano=2022   # ano especifico
  python3 47_siconfi_execucao_municipal.py --max-mun=10 # teste com 10 muns
"""
from __future__ import annotations
import sys
import time
from pathlib import Path
from decimal import Decimal

import requests

sys.path.insert(0, str(Path(__file__).parent))
from db import get_session, test_connection
from sqlalchemy import text


API = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/dca"
PAUSE = 0.15
TIMEOUT = 60
ANOS_PADRAO = [2023, 2022, 2021]  # 2024 ainda nao consolidado em abril/26


def _get(params: dict, retries: int = 3) -> list[dict]:
    """GET com retry em 429/500/502/503. Retorna items."""
    for tentativa in range(retries):
        try:
            r = requests.get(API, params=params, timeout=TIMEOUT)
            if r.status_code == 200:
                return (r.json() or {}).get("items") or []
            if r.status_code in (429, 500, 502, 503):
                time.sleep(2 ** tentativa)
                continue
            return []
        except requests.RequestException:
            time.sleep(2 ** tentativa)
    return []


# Chaves das contas que queremos capturar
CHAVE_RECEITA_TOTAL = "1.0.0.0.00.00.00"   # Receitas Correntes + de Capital
CHAVE_DESPESA_TOTAL_PREFIX = "Total das Despesas"
CHAVE_PESSOAL = "3.1.0.0.00.00.00"          # Pessoal e Encargos
CHAVE_INVESTIMENTO = "4.4.0.0.00.00.00"     # Investimentos


def extrair_metricas(items: list[dict]) -> dict:
    """Extrai receita total, despesa total, pessoal, investimento."""
    receita_total = Decimal("0")
    despesa_total = Decimal("0")
    despesa_pessoal = Decimal("0")
    despesa_investimentos = Decimal("0")

    # Receita: Anexo I-C, cod_conta começa com "1." (categorias de receita)
    # Consolidamos: soma das receitas de nivel 1 (1.1, 1.2, etc)
    for it in items:
        anexo = it.get("anexo", "")
        cod = (it.get("cod_conta") or "").strip()
        conta = (it.get("conta") or "").lower()
        try:
            valor = Decimal(str(it.get("valor") or 0))
        except Exception:
            continue

        # Anexo I-C = Receita Orçamentária (Realizada)
        if anexo == "DCA-Anexo I-C":
            # Padrão RO (receita orçamentária total)
            if cod == "P1.0.0.0.00.00.00" or "total das receitas" in conta:
                if valor > receita_total:
                    receita_total = valor

        # Anexo I-D = Despesa por Função (Liquidada)
        if anexo == "DCA-Anexo I-D":
            # Total das Despesas
            if "total" in conta and "despesas" in conta:
                if valor > despesa_total:
                    despesa_total = valor

        # Anexo I-E ou I-F = Despesa por Categoria Econômica (Liquidada)
        if anexo in ("DCA-Anexo I-E", "DCA-Anexo I-F"):
            if cod == "P3.1.0.0.00.00.00" or "pessoal e encargos" in conta:
                if valor > despesa_pessoal:
                    despesa_pessoal = valor
            if cod == "P4.4.0.0.00.00.00" or ("investimentos" == conta.strip()):
                if valor > despesa_investimentos:
                    despesa_investimentos = valor

    resultado = None
    if receita_total > 0 and despesa_total > 0:
        resultado = receita_total - despesa_total

    return {
        "receita_total": receita_total if receita_total > 0 else None,
        "despesa_total": despesa_total if despesa_total > 0 else None,
        "despesa_pessoal": despesa_pessoal if despesa_pessoal > 0 else None,
        "despesa_investimentos": despesa_investimentos if despesa_investimentos > 0 else None,
        "receita_corrente_liquida": None,  # precisa outro anexo - deixamos None
        "despesa_pessoal_pct_rcl": None,
        "resultado_orcamentario": resultado,
    }


def upsert_execucao(session, municipio_id: int, ano: int, dados: dict) -> None:
    session.execute(text("""
        INSERT INTO execucao_orcamentaria_municipal
            (municipio_id, ano, receita_total, despesa_total, despesa_pessoal,
             despesa_investimentos, receita_corrente_liquida, despesa_pessoal_pct_rcl,
             resultado_orcamentario, fonte, importado_em)
        VALUES
            (:mid, :ano, :rt, :dt, :dp, :di, :rcl, :pct, :res, 'SICONFI_DCA', NOW())
        ON CONFLICT (municipio_id, ano) DO UPDATE SET
            receita_total = EXCLUDED.receita_total,
            despesa_total = EXCLUDED.despesa_total,
            despesa_pessoal = EXCLUDED.despesa_pessoal,
            despesa_investimentos = EXCLUDED.despesa_investimentos,
            resultado_orcamentario = EXCLUDED.resultado_orcamentario,
            importado_em = NOW()
    """), {
        "mid": municipio_id, "ano": ano,
        "rt": dados.get("receita_total"),
        "dt": dados.get("despesa_total"),
        "dp": dados.get("despesa_pessoal"),
        "di": dados.get("despesa_investimentos"),
        "rcl": dados.get("receita_corrente_liquida"),
        "pct": dados.get("despesa_pessoal_pct_rcl"),
        "res": dados.get("resultado_orcamentario"),
    })


def carregar_municipios(session, max_mun: int | None = None) -> list[tuple[int, str, str]]:
    """Retorna (municipio_id, codigo_ibge, nome) ordenados por populacao DESC.
    Capitais e grandes cidades vao primeiro - cobrem maioria da populacao BR.
    """
    sql = """
        SELECT id, codigo_ibge, nome
        FROM municipios
        WHERE codigo_ibge IS NOT NULL
        ORDER BY populacao DESC NULLS LAST, nome
    """
    if max_mun:
        sql += f" LIMIT {max_mun}"
    rows = session.execute(text(sql)).mappings().all()
    return [(r["id"], str(r["codigo_ibge"]), r["nome"]) for r in rows]


def main(anos: list[int], max_mun: int | None = None) -> None:
    print(f"=== Passo 47 — SICONFI Execucao Orcamentaria Municipal ===")
    print(f"    Anos: {anos}")
    if not test_connection():
        return

    session = get_session()
    municipios = carregar_municipios(session, max_mun)
    print(f"  {len(municipios)} municipios a processar.\n")

    total_inseridos = 0
    total_sem_dados = 0
    total_com_erro = 0

    for i, (muni_id, cod_ibge, nome) in enumerate(municipios, 1):
        for ano in anos:
            try:
                items = _get({
                    "an_exercicio": ano,
                    "id_ente": cod_ibge,
                    "$limit": 3000,
                })
                if not items:
                    total_sem_dados += 1
                    continue
                dados = extrair_metricas(items)
                if not any(v for v in dados.values() if v is not None):
                    total_sem_dados += 1
                    continue
                upsert_execucao(session, muni_id, ano, dados)
                total_inseridos += 1
            except Exception as e:
                total_com_erro += 1
                if total_com_erro <= 5:
                    print(f"  [erro {cod_ibge}/{ano}] {e}")
                session.rollback()
            time.sleep(PAUSE)

        # Commit a cada 50 municipios pra nao perder progresso
        if i % 50 == 0:
            session.commit()
            print(f"  [{i:5d}/{len(municipios)}] {nome[:30]:30} · inseridos: {total_inseridos} · sem_dados: {total_sem_dados}", flush=True)

    session.commit()
    session.close()
    print(f"\n[done] Inseridos: {total_inseridos} · Sem dados: {total_sem_dados} · Erros: {total_com_erro}")


if __name__ == "__main__":
    anos = ANOS_PADRAO[:]
    max_mun = None
    for arg in sys.argv[1:]:
        if arg.startswith("--ano="):
            anos = [int(arg.split("=")[1])]
        elif arg.startswith("--max-mun="):
            max_mun = int(arg.split("=")[1])
    main(anos=anos, max_mun=max_mun)
