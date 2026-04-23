"""
Indicadores financeiros para o dossiê — Fase 2 do Radar Político.

Funções puras (sem I/O, exceto acesso ao DB para benchmark) que recebem
uma `Candidatura` (modelo SQLAlchemy) ou seus campos primitivos e devolvem
estruturas Pydantic do schema `dossie.Financeiro`.

REGRAS DE GOVERNANÇA APLICADAS:
- CPV só é calculado quando despesa > 0 E votos > 0 (senão retorna None).
- Benchmark vem da MV `mv_benchmarks_cargo_uf_ano` (refrescada após o ETL).
- Quando o par (cargo/UF/ano) não tem dados financeiros válidos, todos os
  campos do `CustoPorVotoBenchmark` ficam None — UI mostra INDISPONÍVEL.
- Origem de recursos e concentração de doadores **não são calculáveis na
  Fase 2** porque não há tabela de prestação de contas detalhada — voltam
  None com `doadores_disponiveis=False`.
"""
from __future__ import annotations
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.dossie import (
    ConcentracaoDoadores,
    CustoPorVotoBenchmark,
    OrigemRecursos,
)


# ── CPV simples ─────────────────────────────────────────────────────────────


def calcular_cpv(despesa: float | None, votos: int | None) -> Optional[float]:
    """
    Custo por voto: despesa de campanha / votos totais. Retorna None quando
    qualquer dos dois é zero/None — divisão sem significado.
    """
    if not despesa or not votos:
        return None
    if votos <= 0 or despesa <= 0:
        return None
    return despesa / votos


# ── Benchmark de CPV ────────────────────────────────────────────────────────


async def buscar_benchmark_cpv(
    db: AsyncSession,
    *,
    cargo: str,
    estado_uf: str,
    ano: int,
) -> Optional[dict]:
    """
    Lê uma linha da MV `mv_benchmarks_cargo_uf_ano`. Retorna dict com
    chaves cpv_mediana, cpv_p25, cpv_p75, cpv_p90, n_validos_financeiro
    OU None se não há linha (par inexistente).
    """
    row = (await db.execute(
        text("""
            SELECT cpv_mediana, cpv_p25, cpv_p75, cpv_p90,
                   votos_mediana, n_candidaturas, n_validos_financeiro
            FROM mv_benchmarks_cargo_uf_ano
            WHERE cargo = :cargo AND estado_uf = :uf AND ano = :ano
        """),
        {"cargo": cargo.upper(), "uf": estado_uf, "ano": ano},
    )).mappings().first()
    return dict(row) if row else None


def montar_cpv_benchmark(
    *,
    despesa_candidato: float | None,
    votos_candidato: int | None,
    bench: dict | None,
) -> Optional[CustoPorVotoBenchmark]:
    """
    Constrói o `CustoPorVotoBenchmark` para uma candidatura.

    REGRA: se faltar despesa/votos do candidato OU o benchmark do par não
    tiver dados financeiros válidos suficientes (n_validos < 3), retorna
    `None` — UI mostra "INDISPONÍVEL", nunca um valor inventado.
    """
    cpv_cand = calcular_cpv(despesa_candidato, votos_candidato)
    if cpv_cand is None:
        return None
    if not bench or not bench.get("cpv_mediana"):
        return None
    n_validos = bench.get("n_validos_financeiro") or 0
    if n_validos < 3:
        # Pares insuficientes — qualquer comparação seria estatisticamente fraca.
        return None

    cpv_mediana = float(bench["cpv_mediana"])
    cpv_p25 = float(bench["cpv_p25"]) if bench.get("cpv_p25") else None
    cpv_p75 = float(bench["cpv_p75"]) if bench.get("cpv_p75") else None
    cpv_p90 = float(bench["cpv_p90"]) if bench.get("cpv_p90") else None

    leitura = _ler_cpv_em_relacao_a_pares(
        cpv_cand, cpv_mediana, cpv_p25, cpv_p75, cpv_p90
    )

    return CustoPorVotoBenchmark(
        valor_candidato=cpv_cand,
        mediana_pares=cpv_mediana,
        p25_pares=cpv_p25,
        p75_pares=cpv_p75,
        p90_pares=cpv_p90,
        n_pares=int(n_validos),
        leitura_curta=leitura,
    )


def _ler_cpv_em_relacao_a_pares(
    cpv: float,
    mediana: float,
    p25: Optional[float],
    p75: Optional[float],
    p90: Optional[float],
) -> str:
    """
    Template determinístico (zero IA) que descreve onde o CPV cai em
    relação aos pares. Sem juízo moral, apenas leitura factual.
    """
    if p90 is not None and cpv >= p90:
        return "Custo por voto no decil mais alto do cargo (top 10%)."
    if p75 is not None and cpv >= p75:
        return "Custo por voto acima do percentil 75 do cargo."
    if p25 is not None and cpv <= p25:
        return "Custo por voto abaixo do percentil 25 do cargo."
    if cpv >= mediana * 1.20:
        return "Custo por voto cerca de 20% acima da mediana do cargo."
    if cpv <= mediana * 0.80:
        return "Custo por voto cerca de 20% abaixo da mediana do cargo."
    return "Custo por voto próximo da mediana do cargo."


# ── Origem de recursos / concentração de doadores ──────────────────────────


def calcular_origem_recursos(*args, **kwargs) -> Optional[OrigemRecursos]:
    """
    PENDENTE FASE 4: requer tabela `prestacao_contas` (TSE detalhado por
    receita). Hoje retorna None — UI mostra "INDISPONÍVEL".
    """
    return None


def calcular_concentracao_doadores(*args, **kwargs) -> Optional[ConcentracaoDoadores]:
    """
    PENDENTE FASE 4: requer tabela `doacoes` (TSE detalhado por doador).
    Hoje retorna None — UI mostra "INDISPONÍVEL".
    """
    return None
