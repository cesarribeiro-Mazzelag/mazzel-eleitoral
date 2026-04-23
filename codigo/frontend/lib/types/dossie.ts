/**
 * Tipo TypeScript do DossiePolitico — espelhamento manual do schema Pydantic
 * em `backend/app/schemas/dossie.py`.
 *
 * SINGLE SOURCE OF TRUTH: o backend é a referência. Quando atualizar o
 * Pydantic model, atualizar este arquivo no mesmo PR para manter paridade.
 *
 * Convenção de campos sem dados:
 *   bloco.disponivel === false   → UI/PDF mostra "Dados não disponíveis ainda"
 *   score.X === null             → não entra na média do score.geral
 *   ideologia_aproximada === null → exibe "—" / "não classificado"
 */

export type ResultadoCargo = "ELEITO" | "NAO_ELEITO" | "SUPLENTE";
export type TipoProcesso = "CRIMINAL" | "ELEITORAL" | "CIVIL";
export type StatusProcesso = "EM_ANDAMENTO" | "CONDENADO" | "ABSOLVIDO";
export type NivelClassificacao = "ALTO" | "MEDIO" | "BAIXO";
export type Ideologia =
  | "esquerda"
  | "centro-esquerda"
  | "centro"
  | "centro-direita"
  | "direita";

// ── Bloco 1: Identificação ─────────────────────────────────────────────────

export interface Identificacao {
  id: number;
  nome: string;
  nome_urna: string | null;
  foto_url: string | null;
}

// ── Bloco 2: Perfil Político ───────────────────────────────────────────────

export interface PerfilPolitico {
  partido_atual: string | null;
  historico_partidos: string[];
  /** Estimativa do PARTIDO, não do indivíduo. Sempre exibir como "aproximada". */
  ideologia_aproximada: Ideologia | null;
  /** 0-100. null quando sem dados legislativos. */
  alinhamento_partido: number | null;
  disponivel: boolean;
}

// ── Bloco 3: Trajetória ────────────────────────────────────────────────────

export interface CargoDisputado {
  ano: number;
  cargo: string;
  resultado: ResultadoCargo;
  votos: number;
  partido: string | null;
  municipio: string | null;
  estado_uf: string | null;
}

export interface Trajetoria {
  cargos_disputados: CargoDisputado[];
  disponivel: boolean;
}

// ── Bloco 4: Desempenho Eleitoral ──────────────────────────────────────────

export interface EvolucaoVotos {
  ano: number;
  votos: number;
  cargo: string;
}

export interface DesempenhoEleitoral {
  total_votos: number;
  evolucao_votos: EvolucaoVotos[];
  regioes_fortes: string[];
  regioes_fracas: string[];
  disponivel: boolean;
}

// ── Bloco 5: Financeiro ────────────────────────────────────────────────────

export interface Doador {
  nome: string;
  valor: number;
}

/**
 * Repartição percentual da receita por fonte (Fase 2 - Caminho B).
 * Soma dos campos não-null deve dar próximo de 1.0 quando há detalhamento.
 */
export interface OrigemRecursos {
  fundo_partidario_pct: number | null;
  fundo_eleitoral_pct: number | null;
  doacao_privada_pct: number | null;
  recursos_proprios_pct: number | null;
  outros_pct: number | null;
}

/** Quanto a campanha depende dos maiores doadores (Fase 2 - Caminho B). */
export interface ConcentracaoDoadores {
  top1_pct: number | null;
  top5_pct: number | null;
  top10_pct: number | null;
  n_doadores: number | null;
}

/**
 * Custo por voto da candidatura vs mediana dos pares (mesmo cargo, UF, ano).
 * Calculado pela MV mv_benchmarks_cargo_uf_ano. JÁ ESTÁ ATIVO no backend.
 */
export interface CustoPorVotoBenchmark {
  valor_candidato: number | null;
  mediana_pares: number | null;
  p25_pares: number | null;
  p75_pares: number | null;
  p90_pares: number | null;
  n_pares: number | null;
  /** Frase pronta gerada por template determinístico (sem IA). */
  leitura_curta: string | null;
}

export interface Financeiro {
  total_arrecadado: number | null;
  total_gasto: number | null;
  principais_doadores: Doador[];
  /** Campo legado mantido por compat — usar `concentracao.top5_pct` no novo código. */
  concentracao_doadores: number | null;
  /** Fase 2 - origem detalhada (objeto, não array). null até Caminho B rodar. */
  origem_recursos: OrigemRecursos | null;
  /** Fase 2 - concentração de doadores. null até Caminho B rodar. */
  concentracao: ConcentracaoDoadores | null;
  /** Fase 2 - benchmark CPV vs pares. JÁ ATIVO. */
  cpv_benchmark: CustoPorVotoBenchmark | null;
  disponivel: boolean;
  doadores_disponiveis: boolean;
}

// ── Bloco 6: Legislativo (sem dados ainda) ─────────────────────────────────

export interface Legislativo {
  projetos_apresentados: number | null;
  projetos_aprovados: number | null;
  alinhamento_votacoes: number | null;
  temas_atuacao: string[];
  disponivel: boolean;
}

// ── Bloco 7: Redes Sociais (sem dados ainda) ───────────────────────────────

export interface RedesSociais {
  instagram: string | null;
  twitter: string | null;
  tiktok: string | null;
  seguidores_total: number | null;
  engajamento_medio: number | null;
  disponivel: boolean;
}

// ── Bloco 8: Jurídico (sem dados ainda) ────────────────────────────────────

export interface ProcessoRelevante {
  tipo: TipoProcesso;
  status: StatusProcesso;
}

export interface Juridico {
  ficha_limpa: boolean | null;
  processos_total: number | null;
  processos_relevantes: ProcessoRelevante[];
  risco_juridico: NivelClassificacao | null;
  disponivel: boolean;
}

// ── Bloco 9: Inteligência ──────────────────────────────────────────────────

export interface Comportamento {
  alinhamento_partido: number | null;
  alinhamento_governo: number | null;
  coerencia_ideologica: number | null;
}

export interface Score {
  eleitoral: number | null;
  juridico: number | null;
  financeiro: number | null;
  politico: number | null;
  digital: number | null;
  geral: number | null;
  eleitoral_disponivel: boolean;
  juridico_disponivel: boolean;
  financeiro_disponivel: boolean;
  politico_disponivel: boolean;
  digital_disponivel: boolean;
}

export interface Classificacao {
  risco: NivelClassificacao | null;
  potencial: NivelClassificacao | null;
}

export interface Inteligencia {
  comportamento: Comportamento;
  alertas: string[];
  score: Score;
  classificacao: Classificacao;
}

// ── Modelo principal ───────────────────────────────────────────────────────

export interface DossiePolitico {
  identificacao: Identificacao;
  perfil_politico: PerfilPolitico;
  trajetoria: Trajetoria;
  desempenho_eleitoral: DesempenhoEleitoral;
  financeiro: Financeiro;
  legislativo: Legislativo;
  redes_sociais: RedesSociais;
  juridico: Juridico;
  inteligencia: Inteligencia;
  /** Texto analítico gerado pela Fase 2 — null até lá. */
  resumo_executivo: string | null;
}
