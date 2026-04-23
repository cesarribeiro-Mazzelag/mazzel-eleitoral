"""
Tabela estática de ideologia aproximada por partido brasileiro.

═══════════════════════════════════════════════════════════════════════════════
ATENÇÃO — REGRAS DE USO (não violar):

1. Esta classificação é uma ESTIMATIVA INSTITUCIONAL do partido,
   inspirada em literatura acadêmica brasileira sobre posicionamento
   partidário (revistas Dados, Opinião Pública, BPSR, entre outras).

2. NÃO representa a posição individual de qualquer candidato.
   É uma referência sobre o partido, não sobre a pessoa.

3. Sempre exibir como "ideologia aproximada" / "posição estimada",
   nunca como verdade absoluta. UI e PDF devem deixar isso claro.

4. Partidos sem classificação segura retornam None — UI/PDF mostram "—"
   ou "não classificado".

5. NÃO inferir ideologia a partir de texto livre, redes sociais ou
   opinião do modelo de linguagem. A única fonte legítima é esta tabela.

6. Esta tabela pode ser atualizada quando houver mudança institucional
   relevante do partido (mudança de estatuto, fusão, refundação).
═══════════════════════════════════════════════════════════════════════════════

Escala: esquerda → centro-esquerda → centro → centro-direita → direita
"""
from typing import Literal, Optional

Ideologia = Literal[
    "esquerda",
    "centro-esquerda",
    "centro",
    "centro-direita",
    "direita",
]


# Mapeamento por número TSE → ideologia aproximada do partido
# Fonte: literatura acadêmica brasileira sobre posicionamento partidário.
_IDEOLOGIA_POR_PARTIDO: dict[int, Ideologia] = {
    # ── Esquerda ─────────────────────────────────────────────────────────
    50: "esquerda",          # PSOL
    65: "esquerda",          # PCdoB
    16: "esquerda",          # PSTU
    21: "esquerda",          # PCB

    # ── Centro-esquerda ──────────────────────────────────────────────────
    13: "centro-esquerda",   # PT
    12: "centro-esquerda",   # PDT
    40: "centro-esquerda",   # PSB
    43: "centro-esquerda",   # PV
    33: "centro-esquerda",   # PMN

    # ── Centro ───────────────────────────────────────────────────────────
    23: "centro",            # Cidadania
    45: "centro",            # PSDB
    20: "centro",            # PODE / Podemos
    77: "centro",            # Solidariedade

    # ── Centro-direita ───────────────────────────────────────────────────
    15: "centro-direita",    # MDB
    55: "centro-direita",    # PSD
    44: "centro-direita",    # União Brasil (UNIÃO)
    25: "centro-direita",    # DEM (histórico → PRD/UNIÃO)
    14: "centro-direita",    # PTB

    # ── Direita ──────────────────────────────────────────────────────────
    11: "direita",           # PP
    22: "direita",           # PL
    17: "direita",           # PSL (histórico)
    10: "direita",           # Republicanos
    51: "direita",           # Patriota
    30: "direita",           # NOVO
    36: "direita",           # Agir
    27: "direita",           # DC (Democracia Cristã)
    28: "direita",           # PRTB
}


def get_ideologia(partido_numero: int | None) -> Optional[Ideologia]:
    """
    Retorna a ideologia aproximada do partido brasileiro identificado pelo
    número TSE. Devolve None quando o partido não tem classificação segura
    nesta tabela — UI e PDF devem exibir "—" ou "não classificado".

    Não infere a partir de texto livre nem usa heurísticas de linguagem.
    """
    if partido_numero is None:
        return None
    try:
        n = int(partido_numero)
    except (TypeError, ValueError):
        return None
    return _IDEOLOGIA_POR_PARTIDO.get(n)
