"""
Validação de dados — funções puras de governança aplicadas em todas as
camadas que servem dados ao usuário (Radar, Dossiê, mapa).

REGRA PRINCIPAL: nenhum dado inconsistente pode ser apresentado como verdade
ao usuário. Quando uma das funções abaixo retorna True, a camada de exibição
deve mostrar "INDISPONÍVEL" (ou ocultar o indicador), em vez de inventar um
valor neutro como 0 ou 50.

Estas funções são determinísticas, sem I/O, e devem ser usadas tanto pelas
queries do Radar (via SQL CASE WHEN equivalente) quanto pela inteligência
do Dossiê (via Python).

═══════════════════════════════════════════════════════════════════════════════
ANTIPADRÕES PROIBIDOS:
- Substituir dado faltante por valor neutro (ex: 50 em score, 0 em votos).
- Calcular crescimento entre 2 valores onde o anterior é zero ou inválido.
- Classificar candidatura sem dados-chave como FORTE/EM_RISCO; usar INDISPONIVEL.
═══════════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations
from typing import Optional


# Limite de variação considerada "não-absurda". Valores acima disso são
# tipicamente glitches de dados (fusões partidárias, reclassificações).
MAX_VARIACAO_RAZOAVEL = 5.0  # 500%

# Volume mínimo de votos para que uma comparação de variação faça sentido.
# Abaixo disso (ex: partido recém-criado em ano anterior), a divisão fica
# instável e gera valores absurdos.
MIN_VOTOS_PARA_COMPARAR = 500_000


def eleito_sem_votos(eleito: bool, votos_total: int | None) -> bool:
    """
    True quando a candidatura foi eleita mas tem `votos_total = 0` (ou None).
    Sintoma do bug histórico do ETL onde algumas candidaturas eleitas não
    foram mapeadas em `votos_por_zona`. NÃO é critério para classificar como
    CRÍTICO — é dado incompleto, deve virar INDISPONIVEL.
    """
    return bool(eleito) and (votos_total is None or votos_total == 0)


def crescimento_eh_absurdo(crescimento: float | None) -> bool:
    """
    True quando o crescimento percentual ultrapassa o limite razoável (500%).
    Tipicamente indica fusão partidária, reclassificação histórica ou troca
    de chave de identificação no TSE — não é crescimento orgânico real.

    Exemplo: União Brasil 2024 vs 2020 = +43.681% porque o partido nem existia
    em 2020, mas tem ~26 candidaturas residuais com 50k votos → comparação
    inválida. Esse caso deve retornar None na UI, não o número absurdo.
    """
    if crescimento is None:
        return True
    return abs(crescimento) > MAX_VARIACAO_RAZOAVEL


def base_comparativa_eh_valida(votos_anterior: int | None) -> bool:
    """
    True quando há volume suficiente no ano anterior para comparação confiável.
    Evita divisões por números pequenos que geram variações absurdas.
    """
    return votos_anterior is not None and votos_anterior >= MIN_VOTOS_PARA_COMPARAR


def pode_classificar(
    *,
    eleito: bool,
    votos_total: int | None,
    tem_dados_minimos: bool = True,
) -> bool:
    """
    True quando há dados suficientes para gerar uma classificação confiável
    (FORTE/EM_RISCO/EM_CRESCIMENTO/CRITICO). Quando False, a UI deve mostrar
    INDISPONIVEL.

    Critérios atuais:
    - Eleito + votos_total=0 → não pode (bug do ETL, dado incompleto)
    - Sem dados mínimos → não pode
    """
    if not tem_dados_minimos:
        return False
    if eleito_sem_votos(eleito, votos_total):
        return False
    return True


def sanear_crescimento(crescimento: float | None) -> Optional[float]:
    """
    Retorna o crescimento se ele for "razoável" (≤500% em valor absoluto),
    senão retorna None. Use isso ao expor variação inter-ciclo na UI.

    >>> sanear_crescimento(0.30)
    0.30
    >>> sanear_crescimento(8.5) is None
    True
    >>> sanear_crescimento(None) is None
    True
    """
    if crescimento is None:
        return None
    if crescimento_eh_absurdo(crescimento):
        return None
    return crescimento


def sanear_votos_total(eleito: bool, votos_total: int | None) -> Optional[int]:
    """
    Retorna o `votos_total` se válido (não é o caso eleito-sem-votos),
    senão None. Use ao popular DTOs que vão pra UI/PDF.
    """
    if eleito_sem_votos(eleito, votos_total):
        return None
    return votos_total
