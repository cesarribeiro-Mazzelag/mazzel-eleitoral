"""
Schemas do Radar Politico - listagens leves para o hub de inteligencia.

═══════════════════════════════════════════════════════════════════════════════
DIFERENCA EM RELACAO AO DOSSIE:

`dossie.py` e a fonte unica para o **dossie detalhado** (modal, PDF). Roda
`compilar_dossie(db, candidato_id)`, que faz N queries e a inteligencia
completa. Caro - nao pode rodar por item de listagem.

Este modulo cobre as **listagens** do Radar Politico (Politicos / Partidos):
cards leves, calculados em SQL agregado, com classificacao/risco/metrica
destacada por candidatura ou partido. UMA query por requisicao, mesmo para
centenas de cards.

Os campos `classificacao` e `risco` aqui sao a versao simplificada usada na
listagem. Os scores numericos detalhados continuam so no dossie.

V2 (Champion Select):
  - StatusPolitico: ELEITO, NAO_ELEITO, SUPLENTE_ASSUMIU, SUPLENTE_ESPERA
  - votos_faltando: gap pro ultimo eleito (nao-eleitos e suplentes)
  - votos_ultimo_eleito: referencia para a micro barra de progresso
═══════════════════════════════════════════════════════════════════════════════
"""
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.dossie import NivelClassificacao


# ── Aliases ──────────────────────────────────────────────────────────────────

ClassificacaoRadar = Literal[
    "FORTE",
    "EM_CRESCIMENTO",
    "EM_RISCO",
    "CRITICO",
    "INDISPONIVEL",
]

StatusPolitico = Literal[
    "ELEITO",            # ganhou a eleicao, titular
    "NAO_ELEITO",        # perdeu a eleicao
    "SUPLENTE_ASSUMIU",  # nao eleito mas assumiu a cadeira (cruzamento mandatos)
    "SUPLENTE_ESPERA",   # suplente (TSE), ainda nao assumiu
]

OrdenacaoPolitico = Literal[
    "overall_desc",           # novo default - carta FIFA
    "potencial_estrategico",  # composto de forca + risco invertido
    "votos_total",
    "votos_desc",             # alias frontend-friendly
    "ano_recente",
    "nome",
    "nome_asc",               # alias frontend-friendly
    "votos_faltando",         # V2: proximidade do ultimo eleito
]

OrdenacaoPartido = Literal[
    "votos_total",
    "presenca_territorial",
    "variacao_inter_ciclo",
    "sigla",
]


# ── Métrica destaque (1 valor por card) ──────────────────────────────────────

class MetricaDestaque(BaseModel):
    """
    Uma única métrica selecionada por card. O algoritmo de seleção é
    determinístico (escolher_metrica_destaque). A UI exibe sem interpretar.
    """
    chave: str   # ex: "votos_total", "cpv", "concentracao_top1", "crescimento"
    valor: float
    label: str   # rotulo curto para a UI ("Votos", "Custo/voto", "Top 1 doador")
    formato: Literal["numero", "moeda", "percentual"]


# ══════════════════════════════════════════════════════════════════════════════
# POLÍTICOS
# ══════════════════════════════════════════════════════════════════════════════

class TrajetoriaItem(BaseModel):
    """
    Um cargo disputado previamente pelo politico. Usado na fileira de
    insignias do rodape da carta (trajetoria politica visivel).
    """
    ano: int
    cargo: str
    estado_uf: Optional[str] = None
    eleito: bool = False
    votos_total: Optional[int] = None


class PoliticoCard(BaseModel):
    """
    Linha da listagem do Radar - Politicos (V2 Champion Select).

    REGRA: no maximo 3 elementos analiticos visiveis no card ->
    classificacao + risco + metrica_destaque.

    V2 adiciona: status (eleito/nao_eleito/suplente), votos_faltando
    e votos_ultimo_eleito para badges visuais e micro barra de progresso.
    """
    candidato_id: int
    candidatura_id: int
    nome: str
    cargo: str
    estado_uf: str
    municipio_nome: Optional[str] = None
    ano: int
    eleito: bool

    foto_url: Optional[str] = None
    votos_total: Optional[int] = None

    partido_sigla: Optional[str] = None
    partido_numero: Optional[int] = None
    partido_cor: Optional[str] = None  # hex preenchido pela UI
    partido_logo_url: Optional[str] = None

    classificacao: ClassificacaoRadar = "INDISPONIVEL"
    risco: Optional[NivelClassificacao] = None
    metrica_destaque: Optional[MetricaDestaque] = None

    # Pre-calculo opcional para "potencial estrategico" (ranking).
    potencial_estrategico: Optional[float] = None

    # ── V2 Champion Select ────────────────────────────────────────────
    status: StatusPolitico = "NAO_ELEITO"
    # Gap de votos pro ultimo eleito (negativo = acima do corte)
    votos_faltando: Optional[int] = None
    # Votos do ultimo eleito no mesmo cargo/municipio/ano (referencia)
    votos_ultimo_eleito: Optional[int] = None
    # Situacao original do TSE (SUPLENTE, NAO ELEITO, ELEITO POR QP, etc)
    situacao_tse: Optional[str] = None
    # Candidato disputou segundo turno (prefeito, governador, presidente)
    disputou_segundo_turno: bool = False
    # Votos priorizando 2T quando houve
    votos_melhor_turno: Optional[int] = None

    # ── Overall FIFA (lite) pra carta da listagem ─────────────────────
    # Calculado via heuristica rapida, nao compila dossie completo.
    # Dossie detalhado (ao clicar no card) mostra o Overall preciso.
    overall: Optional[int] = None
    tier: Optional[str] = None  # dourado | ouro | prata | bronze
    traits: list[str] = Field(default_factory=list)
    # 6 atributos compactos pra carta (VOT/EFI/ART/FID/INT/TER) - LEGADO
    atributos_6: Optional[dict] = None
    # Sub-medidas v9 (ATV/LEG/BSE/INF/MID/PAC) precalculadas em politico_overall_v9.
    # Quando preenchido, frontend deve preferir este sobre atributos_6 (fonte unica).
    overall_v9: Optional[dict] = None

    # Trajetoria politica: cargos disputados anteriormente (rodape da carta)
    trajetoria: list[TrajetoriaItem] = Field(default_factory=list)


class FiltrosPoliticos(BaseModel):
    """Filtros aceitos pelo endpoint GET /radar/politicos."""
    classificacao: Optional[list[ClassificacaoRadar]] = None
    risco: Optional[list[NivelClassificacao]] = None
    status: Optional[list[StatusPolitico]] = None
    cargo: Optional[list[str]] = None
    estado_uf: Optional[list[str]] = None
    ano: Optional[list[int]] = None
    tier: Optional[str] = None   # dourado|ouro|prata|bronze
    trait: Optional[str] = None  # LEGEND|CAMPEAO|FERA|COMEBACK|ESTREANTE
    busca: Optional[str] = None
    ordenar_por: OrdenacaoPolitico = "overall_desc"
    pagina: int = Field(default=1, ge=1)
    por_pagina: int = Field(default=30, ge=1, le=100)


class RadarPoliticosResponse(BaseModel):
    items: list[PoliticoCard]
    total: int
    pagina: int
    por_pagina: int


# ── Aliases semanticos (modulo virou Dossies em 21/04/2026) ──────────────────
# Nomes "Politico"/"Radar" foram herdados do antigo Radar Politico, que foi
# unificado com Dossies. Codigo novo deve preferir os aliases abaixo. Os nomes
# antigos continuam exportados para nao quebrar a versao preservada.
DossieCard = PoliticoCard
FiltrosDossies = FiltrosPoliticos
DossiesListagemResponse = RadarPoliticosResponse


# ══════════════════════════════════════════════════════════════════════════════
# PARTIDOS
# ══════════════════════════════════════════════════════════════════════════════

EscopoPartido = Literal["nacional", "estadual"]


class PartidoFifa(BaseModel):
    """
    Overall FIFA do partido (analogia time no FIFA).
    7 dimensoes calculadas a partir da bancada e da performance coletiva.
    Regionalizavel: mesmo partido tem Overall diferente em escopos diferentes
    (UB nacional = agregacao macro; UB-SP estadual = bancada do estado).

    Decisao: escopo municipal foi removido - volume baixo de dados em cidades
    pequenas gera Overall erratico. Nacional e a juncao macro dos estaduais.
    """
    escopo: EscopoPartido = "nacional"
    escopo_uf: Optional[str] = None  # preenchido quando escopo=estadual

    atq: Optional[int] = None  # Poder Eleitoral
    meio: Optional[int] = None  # Qualidade da Bancada
    defe: Optional[int] = None  # Influencia Institucional (def é keyword reservada)
    coesao: Optional[int] = None
    fin: Optional[int] = None
    tradicao: Optional[int] = None
    momentum: Optional[int] = None
    overall: Optional[int] = None

    atq_desc: str = "Poder eleitoral: volume de votos e vagas ocupadas"
    meio_desc: str = "Qualidade da bancada: taxa de eleicao e reeleicao"
    defe_desc: str = "Influencia institucional: cargos majoritarios no escopo"
    coesao_desc: str = "Coesao da bancada: fidelidade partidaria interna"
    fin_desc: str = "Estrutura financeira: arrecadacao e diversificacao"
    tradicao_desc: str = "Tradicao: anos de existencia e continuidade eleitoral"
    momentum_desc: str = "Momentum: variacao de votos e eleitos entre ciclos"

    tier: Optional[str] = None  # dourado | ouro | prata | bronze


class PartidoCard(BaseModel):
    """
    Linha da listagem do Radar - Partidos.

    Mesma regra dos politicos: 3 elementos analiticos no maximo.
    `presenca_territorial` e um numero simples (UFs com eleitos no ciclo);
    `variacao_inter_ciclo` e a diferenca % entre o ciclo atual e o anterior.
    """
    partido_id: int
    sigla: str
    numero: int
    nome: str
    logo_url: Optional[str] = None
    ano_referencia: int

    presenca_territorial: int = 0      # nro de UFs com pelo menos 1 eleito
    n_eleitos: int = 0
    n_candidaturas: int = 0
    votos_total: int = 0

    variacao_inter_ciclo: Optional[float] = None  # ex: 0.12 = +12%

    classificacao: ClassificacaoRadar = "INDISPONIVEL"
    metrica_destaque: Optional[MetricaDestaque] = None

    # Overall FIFA do partido (nacional no contexto da listagem)
    fifa: Optional[PartidoFifa] = None


class FiltrosPartidos(BaseModel):
    """Filtros aceitos pelo endpoint GET /radar/partidos."""
    ano: Optional[int] = None
    busca: Optional[str] = None
    ordenar_por: OrdenacaoPartido = "votos_total"
    pagina: int = Field(default=1, ge=1)
    por_pagina: int = Field(default=30, ge=1, le=100)


class RadarPartidosResponse(BaseModel):
    items: list[PartidoCard]
    total: int
    pagina: int
    por_pagina: int
