"""
Schema do Dossiê Político — SINGLE SOURCE OF TRUTH.

═══════════════════════════════════════════════════════════════════════════════
REGRA PRINCIPAL (não violar):

API, UI e PDF devem usar EXATAMENTE este objeto. Nenhuma exceção.

Quando um bloco não tem dados disponíveis hoje (jurídico, legislativo, redes
sociais, doadores), o bloco vem com `disponivel: false` e os campos null/vazios.
A UI/PDF deve mostrar explicitamente "Dados não disponíveis ainda" — NUNCA
inventar valores default.
═══════════════════════════════════════════════════════════════════════════════
"""
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


# ── Aliases de tipo ──────────────────────────────────────────────────────────

ResultadoCargo = Literal["ELEITO", "NAO_ELEITO", "SUPLENTE"]
TipoProcesso = Literal["CRIMINAL", "ELEITORAL", "CIVIL"]
StatusProcesso = Literal["EM_ANDAMENTO", "CONDENADO", "ABSOLVIDO"]
NivelClassificacao = Literal["ALTO", "MEDIO", "BAIXO"]
Ideologia = Literal[
    "esquerda", "centro-esquerda", "centro", "centro-direita", "direita"
]


# ── Bloco 1: Identificação ───────────────────────────────────────────────────

class Identificacao(BaseModel):
    id: int
    nome: str
    nome_urna: Optional[str] = None
    foto_url: Optional[str] = None
    genero: Optional[str] = None
    idade: Optional[int] = None
    grau_instrucao: Optional[str] = None
    ocupacao: Optional[str] = None
    estado_nascimento: Optional[str] = None
    naturalidade: Optional[str] = None  # cidade de nascimento (zero em 2026-04: campo TSE ausente)
    bio_resumida: Optional[str] = None      # primeiro paragrafo Wikipedia PT
    bio_curta: Optional[str] = None         # max 180 chars, calculado pelo backend
    wikipedia_url: Optional[str] = None     # link para o artigo fonte


# ── Bloco 2: Perfil Político ─────────────────────────────────────────────────

class PerfilPolitico(BaseModel):
    """
    `ideologia_aproximada` vem da tabela estática em
    `app/services/dossie_ideologia.py` — é estimativa do PARTIDO,
    não do indivíduo. Sempre exibida como "ideologia aproximada".

    `alinhamento_partido` requer dados legislativos (alinhamento de votações)
    que ainda não temos integrados → vem null com `disponivel=false`.
    """
    partido_atual: Optional[str] = None
    historico_partidos: list[str] = Field(default_factory=list)
    ideologia_aproximada: Optional[Ideologia] = None
    alinhamento_partido: Optional[float] = None  # 0-100
    disponivel: bool = True


# ── Bloco 3: Trajetória ──────────────────────────────────────────────────────

class CargoDisputado(BaseModel):
    """
    Uma candidatura historica. `votos` = soma 1T+2T quando ambos ocorreram,
    mas UI deve exibir `votos_1t` e `votos_2t` separados quando `votos_2t > 0`
    (soma nao faz sentido semantico - sao duas eleicoes distintas).
    """
    candidatura_id: Optional[int] = None
    ano: int
    cargo: str
    resultado: ResultadoCargo
    votos: int = 0                          # legado: soma historica
    votos_1t: Optional[int] = None
    votos_2t: Optional[int] = None
    disputou_segundo_turno: bool = False
    partido: Optional[str] = None
    partido_numero: Optional[int] = None
    municipio: Optional[str] = None
    estado_uf: Optional[str] = None


class Trajetoria(BaseModel):
    cargos_disputados: list[CargoDisputado] = Field(default_factory=list)
    disponivel: bool = True


# ── Bloco 4: Desempenho Eleitoral ────────────────────────────────────────────

class EvolucaoVotos(BaseModel):
    ano: int
    votos: int
    cargo: str


class DesempenhoEleitoral(BaseModel):
    """
    Desempenho do CICLO ATIVO (nao da carreira toda).
    `total_votos` = votos recebidos na eleicao selecionada.
    `votos_carreira` = soma de todas as candidaturas (referencia secundaria).
    `ciclo_cargo` e `ciclo_ano` preenchem o titulo do card.
    `evolucao_votos` sempre lista TODAS as candidaturas (contexto historico).
    """
    ciclo_cargo: Optional[str] = None
    ciclo_ano: Optional[int] = None
    ciclo_uf: Optional[str] = None
    ciclo_municipio: Optional[str] = None
    total_votos: int = 0                    # votos do ciclo ativo apenas
    votos_carreira: int = 0                 # soma de todas as candidaturas
    evolucao_votos: list[EvolucaoVotos] = Field(default_factory=list)
    regioes_fortes: list[str] = Field(default_factory=list)
    regioes_fracas: list[str] = Field(default_factory=list)
    disponivel: bool = True


# ── Bloco 4b: Comparativos do ciclo ativo ────────────────────────────────────

EscopoComparativo = Literal["municipal", "estadual", "nacional"]


class ViceCandidato(BaseModel):
    """Companheiro de chapa em cargo majoritario (Presidente/Governador/Prefeito).
    Identificado pela mesma eleicao + mesmo numero_urna + cargo VICE-*.
    """
    candidato_id: Optional[int] = None
    nome: Optional[str] = None
    nome_urna: Optional[str] = None
    partido_sigla: Optional[str] = None
    cargo: Optional[str] = None  # VICE-PRESIDENTE | VICE-GOVERNADOR | VICE-PREFEITO
    foto_url: Optional[str] = None


class Comparativos(BaseModel):
    """
    Comparacoes do candidato no ciclo ativo contra os pares da MESMA disputa:
      - Cargos municipais (PREFEITO/VEREADOR/VICE-PREFEITO): mesmo municipio
      - Cargos estaduais/federais: mesma UF
      - Presidente: nacional

    Linguagem politica em vez de estatistica:
      - vagas_cargo: quantas cadeiras o cargo tem (55 vereadores de SP, 70 dep.
        federais de SP, 1 prefeito, 1 governador, 1-2 senadores)
      - votos_ultimo_eleito: linha de corte (votos do ultimo candidato eleito)
      - votos_primeiro_nao_eleito: votos do primeiro que ficou de fora
      - folga_votos: diferenca entre votos do candidato e a linha de corte
        (positivo = folga acima do corte, negativo = faltou votos pra entrar)
      - foi_eleito: True/False (duplicado de trajetoria pra simplificar UI)
      - vencedor_nome/votos_vencedor: so pra cargos majoritarios (prefeito,
        governador, senador, presidente) quando o candidato nao foi o vencedor
      - votos_mediana_pares: mantido pra compatibilidade (usado no PDF/IA)
    """
    cargo: Optional[str] = None
    estado_uf: Optional[str] = None
    municipio: Optional[str] = None  # preenchido quando escopo=municipal
    escopo: Optional[EscopoComparativo] = None
    ano: Optional[int] = None
    votos_candidato: Optional[int] = None
    posicao_ranking: Optional[int] = None
    total_candidatos: Optional[int] = None

    # Linha de corte (eleicao)
    vagas_cargo: Optional[int] = None
    foi_eleito: Optional[bool] = None
    votos_ultimo_eleito: Optional[int] = None
    votos_primeiro_nao_eleito: Optional[int] = None
    folga_votos: Optional[int] = None

    # Majoritarios: vencedor quando o candidato nao eh o vencedor
    vencedor_nome: Optional[str] = None
    votos_vencedor: Optional[int] = None

    # Proporcionais: Quociente Eleitoral + regras do TSE (Lei 4.737/1965 +
    # Lei 13.165/2015). Cargos proporcionais (vereador, dep. estadual/federal)
    # seguem logica diferente dos majoritarios.
    eh_proporcional: bool = False
    partido_sigla: Optional[str] = None
    quociente_eleitoral: Optional[int] = None  # votos_validos / vagas
    votos_validos_cargo: Optional[int] = None  # base do calculo do QE
    votos_partido: Optional[int] = None        # soma nominal dos candidatos do partido
    partido_atingiu_qe: Optional[bool] = None  # votos_partido >= QE
    piso_individual: Optional[int] = None      # 10% do QE
    atingiu_piso_individual: Optional[bool] = None  # votos_candidato >= piso
    colocacao_no_partido: Optional[int] = None  # posicao dentro do partido
    total_candidatos_partido: Optional[int] = None  # tamanho da lista do partido

    # Compatibilidade / uso interno
    votos_mediana_pares: Optional[int] = None
    percentil: Optional[float] = None  # 0-100: melhor que X% dos pares

    # Chapa (so majoritarios): se candidato eh titular, informa vice;
    # se eh vice, informa o titular.
    vice: Optional[ViceCandidato] = None
    titular: Optional[ViceCandidato] = None  # quando o candidato e o vice

    disponivel: bool = False


# ── Bloco 4c: Redutos Eleitorais do ciclo ativo ──────────────────────────────

TipoReduto = Literal["zona", "municipio", "uf"]


class Reduto(BaseModel):
    """
    Regiao onde o candidato teve mais votos no ciclo ativo.
    `label` varia com o cargo:
      - cargo municipal -> zona/bairro (ex: "Centro - Z01")
      - cargo estadual/federal -> municipio
      - presidente -> UF
    """
    label: str
    votos: int
    pct_do_total: float  # 0-1


PerfilTerritorial = Literal["concentrado", "equilibrado", "disperso"]


class RedutosEleitorais(BaseModel):
    """
    Top 5 redutos do ciclo ativo + granularidade + analise territorial.
    Alimenta o card 'Redutos Eleitorais' na coluna esquerda do dossie.

    perfil_territorial:
      - concentrado: top 3 concentram > 60% dos votos (nicho forte, risco)
      - equilibrado: top 3 entre 30-60% (saudavel)
      - disperso: top 3 < 30% (capilaridade alta)
    """
    tipo: Optional[TipoReduto] = None  # orienta o rotulo do card na UI
    total_votos_ciclo: int = 0
    redutos: list[Reduto] = Field(default_factory=list)  # top 5 fortes
    redutos_fracos: list[Reduto] = Field(default_factory=list)  # bottom 3 com voto > 0
    concentracao_top3_pct: Optional[float] = None  # 0-100
    perfil_territorial: Optional[PerfilTerritorial] = None
    total_regioes_com_voto: int = 0
    disponivel: bool = False


# ── Bloco 5: Financeiro ──────────────────────────────────────────────────────

class Doador(BaseModel):
    nome: str
    valor: float


class OrigemRecursos(BaseModel):
    """
    Repartição percentual da receita total da candidatura.
    Soma dos campos não-None deve dar próximo de 1.0 quando há detalhamento.
    """
    fundo_partidario_pct: Optional[float] = None
    fundo_eleitoral_pct: Optional[float] = None
    doacao_privada_pct: Optional[float] = None
    recursos_proprios_pct: Optional[float] = None
    outros_pct: Optional[float] = None


class ConcentracaoDoadores(BaseModel):
    """Quanto a campanha depende dos maiores doadores."""
    top1_pct: Optional[float] = None    # % do maior doador
    top5_pct: Optional[float] = None    # % dos 5 maiores
    top10_pct: Optional[float] = None
    n_doadores: Optional[int] = None


class CustoPorVotoBenchmark(BaseModel):
    """
    Comparativo do custo por voto da candidatura vs. mediana dos pares
    (mesmo cargo, mesmo estado, mesmo ano). Sem isso, "custo alto" não tem
    significado.
    """
    valor_candidato: Optional[float] = None
    mediana_pares: Optional[float] = None
    p25_pares: Optional[float] = None
    p75_pares: Optional[float] = None
    p90_pares: Optional[float] = None
    n_pares: Optional[int] = None
    leitura_curta: Optional[str] = None  # template determinístico, sem IA


class Financeiro(BaseModel):
    """
    Bloco financeiro evoluído (Fase 2 do Radar).

    Campos legados (`total_arrecadado`, `total_gasto`, `principais_doadores`,
    `concentracao_doadores`) são mantidos por compatibilidade — a UI pode
    consumir os campos novos quando disponíveis.

    Campos novos (Fase 2):
    - `origem_recursos`: % por fonte (fundo partidário, fundo eleitoral, doação privada, próprios)
    - `concentracao`: top 1/5/10 doadores
    - `cpv_benchmark`: custo por voto vs mediana dos pares (NUNCA alerta sem benchmark)

    Quando o ETL de prestação de contas detalhada não rodou ainda,
    `doadores_disponiveis=false` e os campos detalhados ficam None.
    """
    total_arrecadado: Optional[float] = None
    total_gasto: Optional[float] = None
    principais_doadores: list[Doador] = Field(default_factory=list)
    # ↓ campo legado mantido por compat — usar `concentracao.top5_pct` no novo código
    concentracao_doadores: Optional[float] = None
    # Campos novos da Fase 2:
    origem_recursos: Optional[OrigemRecursos] = None
    concentracao: Optional[ConcentracaoDoadores] = None
    cpv_benchmark: Optional[CustoPorVotoBenchmark] = None
    disponivel: bool = True
    doadores_disponiveis: bool = False


# ── Bloco 6: Legislativo ─────────────────────────────────────────────────────

class ProjetoRef(BaseModel):
    """Referencia curta a um projeto - usada nas listas 'ultimos projetos'.
    Ementa eh o texto descritivo da proposicao (vindo do ETL).
    """
    sigla_tipo: str
    numero: int
    ano: int
    ementa: Optional[str] = None
    situacao: Optional[str] = None
    url: Optional[str] = None


class ComissaoAtual(BaseModel):
    """Participacao em comissao parlamentar - ativa ou historica.
    Populado em 18/04/2026 via API Senado/Camara (ETL 51).
    """
    sigla: Optional[str] = None
    nome: Optional[str] = None
    cargo: Optional[str] = None                     # Titular | Suplente | Presidente | Vice | Relator
    sigla_casa: Optional[str] = None                # SF | CD | CN
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None                  # null = ativa
    ativa: bool = False


class Legislativo(BaseModel):
    """
    Atividade legislativa quando o politico tem mandato federal (Dep Fed,
    Senador) ou municipal (Vereador SP).

    `disponivel=False` quando o candidato nunca teve mandato legislativo.

    Sub-medidas de presenca (populadas pelo ETL `coletar_parlamentares`):
      - presenca_plenario_pct   : % de sessoes plenarias em que o parlamentar esteve presente
      - presenca_comissoes_pct  : % de reunioes de comissoes (Camara apenas; Senado = None)
      - sessoes_plenario_total  : total de sessoes no ano de referencia (baseline global)
      - sessoes_plenario_presente: sessoes em que o parlamentar participou
      - cargos_lideranca        : lista de cargos (Lider de bloco, Presidente de comissao, etc.)

    Fonte: APIs Camara + Senado (atualizado via app/cli/coletar_parlamentares.py).
    """
    casa: Optional[str] = None                      # CAMARA | SENADO | CAMARA_MUNICIPAL | ASSEMBLEIA_ESTADUAL
    cargo_titulo: Optional[str] = None              # "Deputado Federal" | "Senador" | "Vereador" | "Deputado Estadual"
    uf: Optional[str] = None
    partido_sigla: Optional[str] = None
    legislatura: Optional[int] = None
    periodo_legislatura: Optional[str] = None
    situacao: Optional[str] = None
    condicao_eleitoral: Optional[str] = None
    licenciado_para: Optional[str] = None
    projetos_apresentados: Optional[int] = None     # total (aprovadas + tramitando + vetadas)
    projetos_aprovados: Optional[int] = None
    projetos_em_tramitacao: Optional[int] = None
    projetos_vetados: Optional[int] = None
    ultimas_aprovadas: list[ProjetoRef] = Field(default_factory=list)
    ultimas_em_tramitacao: list[ProjetoRef] = Field(default_factory=list)
    ultimas_vetadas: list[ProjetoRef] = Field(default_factory=list)
    alinhamento_votacoes: Optional[float] = None
    temas_atuacao: list[str] = Field(default_factory=list)
    # Comissoes + Relatorias (novo 18/04/2026)
    comissoes_atuais: list[ComissaoAtual] = Field(default_factory=list)
    n_comissoes_historico: int = 0
    presidencias: list[str] = Field(default_factory=list)  # nomes das comissoes que preside
    n_relatorias: int = 0
    relatorias_recentes: list[ProjetoRef] = Field(default_factory=list)
    # Sub-medidas de presenca e lideranca (populadas pelo ETL 23/04/2026)
    presenca_plenario_pct: Optional[float] = None   # 0-100 (None = nao coletado ainda)
    presenca_comissoes_pct: Optional[float] = None  # 0-100 (None = Senado ou nao coletado)
    sessoes_plenario_total: Optional[int] = None    # total de sessoes no ano de referencia
    sessoes_plenario_presente: Optional[int] = None # quantas o parlamentar esteve presente
    cargos_lideranca: list[str] = Field(default_factory=list)  # ["Lider do Bloco X", ...]
    disponivel: bool = False


# ── Bloco 6c: Executivo (Presidente, Governador, Prefeito) ──────────────────

class AtoExecutivo(BaseModel):
    """Um ato do executivo - MP, PL, Decreto, Veto etc."""
    tipo: str                                       # MP | PL_EXECUTIVO | PLP_EXECUTIVO | PEC_EXECUTIVO | DECRETO | VETO
    numero: Optional[int] = None
    ano: Optional[int] = None
    ementa: Optional[str] = None
    situacao: Optional[str] = None
    aprovada: Optional[bool] = None
    data_apresentacao: Optional[str] = None         # ISO yyyy-mm-dd


class Executivo(BaseModel):
    """Atividade do executivo: Presidente (MPs/PLs/Vetos), Governador (PLs estado),
    Prefeito (financeiro via execucao_orcamentaria_municipal - futuro).

    disponivel=False quando candidato nunca exerceu cargo executivo federal/estadual.
    """
    cargo: Optional[str] = None                     # PRESIDENTE | GOVERNADOR | PREFEITO
    cargo_titulo: Optional[str] = None              # "Presidente da Republica" | "Governador de SP"
    mandato_ano_inicio: Optional[int] = None
    mandato_ano_fim: Optional[int] = None
    uf: Optional[str] = None
    partido_sigla: Optional[str] = None
    # Contadores por tipo
    n_medidas_provisorias: int = 0
    n_mps_aprovadas: int = 0
    n_mps_rejeitadas: int = 0
    n_mps_caducadas: int = 0
    n_pls_enviados: int = 0
    n_plps_enviados: int = 0
    n_pecs_enviadas: int = 0
    n_vetos: int = 0
    n_decretos: int = 0
    total_atos: int = 0
    taxa_aprovacao_mps: Optional[float] = None      # % MPs convertidas em lei
    ultimas_mps: list[AtoExecutivo] = Field(default_factory=list)
    ultimos_pls: list[AtoExecutivo] = Field(default_factory=list)
    disponivel: bool = False


# ── Bloco 6b: Carreira no Setor Publico (executivo/comissionado) ────────────

class CargoHistorico(BaseModel):
    """
    Um cargo publico ocupado pelo candidato (Ministro, Secretario, cargo em
    comissao, assessor, etc). Fonte auditavel para rastreabilidade.
    """
    cargo: str
    orgao: Optional[str] = None
    esfera: Optional[str] = None       # federal | estadual | municipal
    uf: Optional[str] = None
    inicio: Optional[str] = None       # ISO yyyy-mm-dd
    fim: Optional[str] = None          # ISO yyyy-mm-dd ou null (atual)
    fonte: str = "manual"              # wikidata | api_camara | dou | manual


class CarreiraPublica(BaseModel):
    """
    Lista de cargos executivos/comissionados historicamente ocupados.
    Nao inclui mandatos eletivos (esses estao em `trajetoria`).
    `disponivel=False` quando a tabela esta vazia para o candidato.
    """
    cargos: list[CargoHistorico] = Field(default_factory=list)
    disponivel: bool = False


# ── Bloco 7: Redes Sociais ───────────────────────────────────────────────────

class RedesSociais(BaseModel):
    """
    Usernames oficiais de redes sociais do politico, vindos do Wikidata
    (properties P2002/P2003/P2013/P7085/P2397/P856). Populado via ETL
    `baixar_redes_sociais_wikidata.py`.

    Seguidores e engajamento ainda nao coletados (requer scraping por rede).
    `disponivel=True` quando ha pelo menos uma rede/site cadastrado.
    """
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    facebook: Optional[str] = None
    tiktok: Optional[str] = None
    youtube: Optional[str] = None
    website: Optional[str] = None
    seguidores_total: Optional[int] = None
    engajamento_medio: Optional[float] = None
    disponivel: bool = False


# ── Bloco 8: Jurídico ────────────────────────────────────────────────────────

class ProcessoRelevante(BaseModel):
    tipo: TipoProcesso
    status: StatusProcesso


class CicloAptidao(BaseModel):
    """Um ciclo eleitoral com status de aptidao (ficha limpa TSE)."""
    ano: int
    cargo: str
    ficha_limpa: Optional[bool] = None  # true=APTO, false=INAPTO, null=sem dado TSE


class SancaoAdm(BaseModel):
    """Sancao administrativa do CGU (CEIS/CEAF) ou TCU."""
    fonte: str                            # CEIS | CEAF | TCU
    tipo_sancao: Optional[str] = None
    orgao_sancionador: Optional[str] = None
    data_inicio: Optional[str] = None     # ISO
    data_fim: Optional[str] = None
    ativa: Optional[bool] = None
    link_publicacao: Optional[str] = None


class Juridico(BaseModel):
    """
    Situacao juridico-administrativa do candidato. Fontes integradas:
      - Ficha limpa TSE (ciclo atual + historico)
      - Sancoes CGU CEIS (empresas inidoneas e suspensas)
      - Sancoes CGU CEAF (expulsoes do servico publico federal)
      - TCU inabilitados (roadmap)
    """
    ficha_limpa: Optional[bool] = None
    historico_aptidao: list[CicloAptidao] = Field(default_factory=list)
    ciclos_inapto: int = 0
    sancoes: list[SancaoAdm] = Field(default_factory=list)
    sancoes_ativas: int = 0
    processos_total: Optional[int] = None
    processos_relevantes: list[ProcessoRelevante] = Field(default_factory=list)
    risco_juridico: Optional[NivelClassificacao] = None
    disponivel: bool = False


# ── Bloco 9: Inteligência (scores + alertas + classificação) ─────────────────

class Comportamento(BaseModel):
    alinhamento_partido: Optional[float] = None
    alinhamento_governo: Optional[float] = None
    coerencia_ideologica: Optional[float] = None


class Score(BaseModel):
    """
    Cada dimensão tem score 0-100 OU null + flag `_disponivel: false`.
    Score `geral` é média APENAS dos disponíveis. Nunca usar 50 neutro
    para dimensões sem dados — isso pareceria avaliação real.
    """
    eleitoral: Optional[float] = None
    juridico: Optional[float] = None
    financeiro: Optional[float] = None
    politico: Optional[float] = None
    digital: Optional[float] = None
    geral: Optional[float] = None

    eleitoral_disponivel: bool = True
    juridico_disponivel: bool = False
    financeiro_disponivel: bool = True
    politico_disponivel: bool = True
    digital_disponivel: bool = False


class OverallFifa(BaseModel):
    """
    8 dimensoes estilo FIFA para a carta do politico (radar octogonal).
    Cada dimensao 0-99 OU null. Overall = media das disponiveis + bonus/penalidades.

    Dimensoes:
    - votacao:     Volume e crescimento de votos (pace)
    - eficiencia:  Taxa de vitoria + custo/voto (shooting)
    - articulacao: Projetos legislativos APROVADOS (passing)
    - fidelidade:  Coerencia ideologica + lealdade partidaria (dribbling)
    - financeiro:  Arrecadacao + transparencia + equilibrio (defending)
    - territorial: Presenca em UFs + regioes fortes (physical)
    - potencial:   Momentum, trajetoria de ascensao/declinio (novo)
    - integridade: Ficha limpa + sancoes (inverso do risco juridico, novo)
    """
    votacao: Optional[int] = None
    eficiencia: Optional[int] = None
    articulacao: Optional[int] = None
    fidelidade: Optional[int] = None
    financeiro: Optional[int] = None
    territorial: Optional[int] = None
    potencial: Optional[int] = None
    integridade: Optional[int] = None
    overall: Optional[int] = None

    votacao_desc: str = "Volume e crescimento de votos ao longo da carreira"
    eficiencia_desc: str = "Taxa de vitoria eleitoral e custo por voto"
    articulacao_desc: str = "Projetos legislativos aprovados (nao apenas apresentados)"
    fidelidade_desc: str = "Coerencia ideologica e lealdade ao partido"
    financeiro_desc: str = "Gestao financeira de campanha e transparencia"
    territorial_desc: str = "Presenca territorial e forca regional"
    potencial_desc: str = "Momentum e trajetoria de ascensao ou declinio"
    integridade_desc: str = "Ficha limpa e ausencia de sancoes administrativas"

    # Tier visual (derivado do overall)
    tier: Optional[str] = None  # "dourado" | "ouro" | "prata" | "bronze"

    # Traits especiais (cartinhas FIFA). Lista de traits ativos.
    traits: list[str] = Field(default_factory=list)
    # Ex: ["LEGEND", "CAMPEAO", "FERA", "COMEBACK", "ESTREANTE"]

    # Breakdown dos bonus/penalidades aplicados (transparencia + gamificacao)
    bonus_aplicados: list[str] = Field(default_factory=list)
    penalidades_aplicadas: list[str] = Field(default_factory=list)


class Classificacao(BaseModel):
    risco: Optional[NivelClassificacao] = None
    potencial: Optional[NivelClassificacao] = None


class OverallV9(BaseModel):
    """
    6 dimensoes visuais v9 para o Card Politico e radar hexagonal.
    Mapeadas das 8 dimensoes FIFA (atributos_6):
      ATV (Atividade)   <- EFI (eficiencia: taxa vitoria + custo/voto)
      LEG (Legislativo) <- ART (articulacao: PLs aprovados)
      BSE (Base)        <- VOT (votacao: volume eleitoral)
      INF (Influencia)  <- FID (fidelidade: coerencia partidaria)
      MID (Midia)       <- POT (potencial: momentum + trajetoria)
      PAC (Pactuacao)   <- TER (territorial: alcance geografico)
    Calculado pelo backend — o frontend NAO deve derivar este campo.
    """
    ATV: Optional[int] = None
    LEG: Optional[int] = None
    BSE: Optional[int] = None
    INF: Optional[int] = None
    MID: Optional[int] = None
    PAC: Optional[int] = None


class KpiHeader(BaseModel):
    """Par chave-valor para o header do dossie. Varia conforme tipo de cargo."""
    k: str
    v: Optional[str] = None


class CartinhaPolitico(BaseModel):
    """Shape completo para o card/cartinha do politico (Card V2/V8)."""
    nome: Optional[str] = None
    partido_sigla: Optional[str] = None
    estado_uf: Optional[str] = None
    foto_url: Optional[str] = None
    overall: Optional[int] = None
    overall_v9: Optional[OverallV9] = None
    votos_total: Optional[int] = None
    ano: Optional[int] = None
    tier: Optional[str] = None
    traits: list[str] = Field(default_factory=list)


class Inteligencia(BaseModel):
    comportamento: Comportamento = Field(default_factory=Comportamento)
    alertas: list[str] = Field(default_factory=list)
    score: Score = Field(default_factory=Score)
    overall_fifa: OverallFifa = Field(default_factory=OverallFifa)
    classificacao: Classificacao = Field(default_factory=Classificacao)
    # Campos pre-computados para o frontend (evitar recalculo client-side)
    overall_v9: Optional[OverallV9] = None
    arquetipos: list[str] = Field(default_factory=list)


# ── Modelo principal ─────────────────────────────────────────────────────────

class DossiePolitico(BaseModel):
    """
    Dossiê político consolidado. SINGLE SOURCE OF TRUTH para API, UI e PDF.

    Convenção de campos ausentes:
        bloco.disponivel == false → UI/PDF mostra "Dados não disponíveis ainda"
        score.X == null            → não entra na média do score.geral
    """
    identificacao: Identificacao
    perfil_politico: PerfilPolitico
    trajetoria: Trajetoria
    desempenho_eleitoral: DesempenhoEleitoral
    comparativos: Comparativos = Field(default_factory=Comparativos)
    redutos_eleitorais: RedutosEleitorais = Field(default_factory=RedutosEleitorais)
    financeiro: Financeiro
    legislativo: Legislativo
    executivo: Executivo = Field(default_factory=Executivo)
    carreira_publica: CarreiraPublica = Field(default_factory=CarreiraPublica)
    redes_sociais: RedesSociais
    juridico: Juridico
    inteligencia: Inteligencia
    resumo_executivo: Optional[str] = None
    # Ciclo eleitoral ativo (qual ano os dados de financeiro/desempenho/mapa representam)
    ano_ciclo_ativo: Optional[int] = None
    # Lista de anos disponiveis para o seletor de ciclo
    ciclos_disponiveis: list[int] = Field(default_factory=list)
    # Overall fixo do ultimo ciclo disponivel (para badge na foto do hero)
    # Nao muda com seletor de ciclo - mostra o "estado atual" do candidato.
    overall_ultimo_ciclo: Optional[int] = None
    # KPIs pre-computados para o header do dossie (varia por tipo de cargo)
    kpis_header: list[KpiHeader] = Field(default_factory=list)
    # Cartinha completa para o Card V2/V8 (evita reconstrucao no frontend)
    cartinha: Optional[CartinhaPolitico] = None

    model_config = ConfigDict(
        json_schema_extra={
            "description": (
                "Dossiê político consolidado. Quando bloco.disponivel=false, "
                "UI/PDF devem exibir 'Dados não disponíveis ainda' explicitamente. "
                "Nunca inventar valores default."
            )
        }
    )
