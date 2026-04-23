"""
Insights financeiros determinísticos — Fase 2 do Radar Político.

Cada insight é uma regra pura: recebe os indicadores financeiros calculados
e devolve uma `string` (mensagem) ou `None` (regra não casou).

REGRAS DE GOVERNANÇA:
- Nenhum insight é gerado quando o indicador-base é None ("INDISPONÍVEL").
- Nenhum alerta hardcoded sem benchmark (proibido pelo plano v3).
- Sem juízo moral; tom analítico.
- Templates fixos (nenhuma chamada de IA externa).
"""
from __future__ import annotations
from typing import Optional

from app.schemas.dossie import (
    ConcentracaoDoadores,
    CustoPorVotoBenchmark,
    OrigemRecursos,
)


def _formatar_brl(valor: float) -> str:
    """Formato monetário BR: R$ 1.234,56."""
    s = f"{valor:,.2f}"  # 1,234.56
    # converte separador para padrão BR
    return "R$ " + s.replace(",", "X").replace(".", ",").replace("X", ".")


def insight_cpv_alto_vs_pares(
    bench: Optional[CustoPorVotoBenchmark],
) -> Optional[str]:
    """
    Alto custo por voto em relação aos pares. Só dispara quando há
    benchmark válido (n_pares ≥ 3, valor do candidato presente, p90 presente).
    """
    if bench is None or bench.valor_candidato is None:
        return None
    if bench.p90_pares is None or bench.n_pares is None or bench.n_pares < 3:
        return None
    if bench.valor_candidato >= bench.p90_pares:
        return (
            f"Custo por voto no top 10% do cargo "
            f"({_formatar_brl(bench.valor_candidato)} contra mediana "
            f"{_formatar_brl(bench.mediana_pares or 0)})."
        )
    return None


def insight_forca_organica(
    bench: Optional[CustoPorVotoBenchmark],
    votos_total: int | None,
    mediana_votos_pares: float | None,
) -> Optional[str]:
    """
    Força orgânica: poucos recursos + muitos votos. Indicador de capilaridade
    real, não dependente de máquina financeira.
    """
    if bench is None or bench.valor_candidato is None or bench.p25_pares is None:
        return None
    if votos_total is None or mediana_votos_pares is None or mediana_votos_pares <= 0:
        return None
    if bench.valor_candidato <= bench.p25_pares and votos_total >= mediana_votos_pares:
        return (
            "Força orgânica: votação igual ou acima da mediana do cargo "
            "com custo por voto no quartil mais barato."
        )
    return None


def insight_concentracao_doadores(
    conc: Optional[ConcentracaoDoadores],
) -> Optional[str]:
    """
    Concentração de doadores acima de 50% no top 1, ou 80% no top 5.
    Hoje sempre retorna None porque o ETL de prestação de contas detalhada
    não rodou. Mantida pronta para Fase 4.
    """
    if conc is None:
        return None
    if conc.top1_pct is not None and conc.top1_pct >= 0.50:
        return f"Mais da metade do financiamento veio de um único doador ({conc.top1_pct*100:.0f}%)."
    if conc.top5_pct is not None and conc.top5_pct >= 0.80:
        return f"80% ou mais do financiamento veio dos 5 maiores doadores."
    return None


def insight_dependencia_publica(
    origem: Optional[OrigemRecursos],
) -> Optional[str]:
    """
    Dependência de recursos públicos (fundo partidário/eleitoral) acima de 80%.
    Hoje sempre None — depende do ETL de prestação detalhada (Fase 4).
    """
    if origem is None:
        return None
    pub = (origem.fundo_partidario_pct or 0) + (origem.fundo_eleitoral_pct or 0)
    if pub >= 0.80:
        return f"Campanha bancada ~{pub*100:.0f}% por recursos públicos."
    return None


def gerar_insights_financeiros(
    *,
    bench: Optional[CustoPorVotoBenchmark],
    concentracao: Optional[ConcentracaoDoadores],
    origem: Optional[OrigemRecursos],
    votos_total: int | None,
    mediana_votos_pares: float | None,
) -> list[str]:
    """
    Pipeline canônico — chama todos os insights e devolve só os que casaram.
    A camada de exibição (UI/PDF) recebe a lista pronta, sem precisar saber
    quais regras existem.
    """
    candidatos = [
        insight_cpv_alto_vs_pares(bench),
        insight_forca_organica(bench, votos_total, mediana_votos_pares),
        insight_concentracao_doadores(concentracao),
        insight_dependencia_publica(origem),
    ]
    return [c for c in candidatos if c]
