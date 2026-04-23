"""
Tabela canônica de cores oficiais dos partidos políticos brasileiros.

**ESPELHO EXATO** de `frontend/lib/farolPartido.ts` CORES_PARTIDOS.
Quando atualizar uma, atualizar a outra no mesmo PR para manter paridade visual.

Unificação 19/04/2026 (Cesar): backend e frontend tinham paletas divergentes,
PSOL aparecia roxo no mapa e laranja na sidebar de candidatos. Padrão único:
farolPartido.ts é a source of truth.
"""

# Fallback obrigatório para partidos não mapeados — cinza neutro
COR_PARTIDO_FALLBACK = "#6B7280"


# Mapeamento por número TSE → cor hexadecimal oficial
# SINCRONIZADO com frontend/lib/farolPartido.ts
_CORES_PARTIDOS: dict[int, str] = {
    10: "#005FAF",  # REPUBLICANOS
    11: "#14416F",  # PP
    12: "#033D7F",  # PDT
    13: "#E4142C",  # PT
    14: "#006B25",  # PTB
    15: "#4AA71E",  # MDB
    16: "#EE1C24",  # PSTU
    17: "#1F3467",  # PSL (histórico)
    18: "#2EB5C2",  # REDE
    19: "#000000",  # PTN
    20: "#006F41",  # PSC
    21: "#C90B1C",  # PCO
    22: "#004F9F",  # PL
    23: "#022E4A",  # CIDADANIA
    25: "#144059",  # DEM
    27: "#0668C2",  # PSDC
    28: "#4DAD32",  # PRTB
    29: "#A72823",  # PCB
    30: "#F3702B",  # NOVO
    31: "#8A191E",  # PHS
    33: "#5A8ECB",  # PODEMOS
    35: "#103D80",  # PMB
    36: "#FFFF03",  # AGIR
    39: "#341214",  # SD
    40: "#E00000",  # PSB
    43: "#006600",  # PV
    44: "#002A7B",  # UNIÃO Brasil
    45: "#0C2CC3",  # PSDB
    50: "#68008E",  # PSOL — ROXO (pós-rebranding 2023)
    51: "#9C9C94",  # PATRIOTA
    52: "#002AC3",  # PPR
    54: "#005200",  # PPL
    55: "#FDB913",  # PSD
    62: "#EE6C34",  # PT do B
    65: "#DA251C",  # PCdoB
    67: "#00562E",  # PEN
    70: "#EE6C34",  # AVANTE
    73: "#D91A1A",  # PMN
    74: "#005FAF",  # PRB
    76: "#004F9F",  # PR
    77: "#341214",  # SOLIDARIEDADE
    79: "#007FCA",  # PRP
    80: "#054E3E",  # PRONA
    84: "#144059",  # PFL
    90: "#F68E21",  # PROS
}


def get_cor_partido(partido_numero: int | None) -> str:
    """
    Retorna a cor hex oficial do partido brasileiro identificado pelo
    número TSE. Se não houver mapeamento, devolve o cinza neutro de
    fallback (#94A3B8) — nunca inventa uma cor arbitrária.
    """
    if partido_numero is None:
        return COR_PARTIDO_FALLBACK
    try:
        n = int(partido_numero)
    except (TypeError, ValueError):
        return COR_PARTIDO_FALLBACK
    return _CORES_PARTIDOS.get(n, COR_PARTIDO_FALLBACK)
