/**
 * Tipos e constantes compartilhadas do módulo mapa.
 *
 * Arquivo neutro: sem dependência de Zustand ou React. Pode ser importado
 * tanto por `machine.ts` (reducer puro) quanto por `mapaStore.ts` (store)
 * sem risco de ciclo de imports.
 */

// ── Tipos geográficos e de UI ────────────────────────────────────────────────

export type NivelGeografico =
  | "brasil"
  | "estado"
  | "municipio"
  | "bairro"
  | "microzona";

export type ModoMapa = "eleitos" | "votos" | "heatmap";

export type TabTurno = "total" | "2_turno" | "1_turno";

export type SidebarState = "open" | "compact" | "closed";

export type ViewMode = "partidos" | "eleitos";

/**
 * Modo de produto do mapa (Cesar 20/04/2026):
 * - inteligencia: analistas, diretoria UB. Vê Brasil inteiro, comparações, Vigentes, Suplentes.
 * - campanha: candidato contratante. Vê território da candidatura + cobertura/equipe/metas.
 * - zona: delegado. Só as zonas atribuídas.
 *
 * Default: "inteligencia". Ativado automaticamente pelo perfil do usuário no login
 * (Sprint D). User pode alternar manualmente sempre que quiser.
 */
export type ModoProduto = "inteligencia" | "campanha" | "zona";

// ── State slices ─────────────────────────────────────────────────────────────

export interface MapaFilters {
  /** Número TSE do partido. Derivado de `selecionados` (1 item partido). */
  partido: number | null;
  /** ID de candidato. Derivado de `selecionados` (1 item candidato). */
  candidatoId: number | null;
  cargo: string | null;
  ano: number;
  anoComparacao: number | null;
  turno: 0 | 1 | 2;
  tab: TabTurno;
  modo: ModoMapa;
}

export interface MapaGeography {
  nivel: NivelGeografico;
  uf: string | null;
  ibge: string | null;
  cdDist: string | null;
}

export interface MapaUI {
  loading: boolean;
  sidebarState: SidebarState;
  debugMode: boolean;
  hoverFeature: any | null;
  viewMode: ViewMode;
  /** Modo de produto - Inteligência (default), Campanha (candidato), Zona (delegado). */
  modoProduto: ModoProduto;
}

// ── Constantes de cargo ──────────────────────────────────────────────────────

/** Cargo default por ciclo eleitoral (maior cargo disputado no ano). */
export const CARGO_DEFAULT_POR_ANO: Record<number, string> = {
  2024: "PREFEITO",
  2022: "PRESIDENTE",
  2020: "PREFEITO",
  2018: "PRESIDENTE",
};

/** Cargos válidos por ciclo. Dropdown filtra por aqui. */
export const CARGOS_VALIDOS_POR_ANO: Record<number, string[]> = {
  2024: ["PREFEITO", "VEREADOR"],
  2022: [
    "PRESIDENTE",
    "GOVERNADOR",
    "SENADOR",
    "DEPUTADO_FEDERAL",
    "DEPUTADO_ESTADUAL",
  ],
  2020: ["PREFEITO", "VEREADOR"],
  2018: [
    "PRESIDENTE",
    "GOVERNADOR",
    "SENADOR",
    "DEPUTADO_FEDERAL",
    "DEPUTADO_ESTADUAL",
  ],
};

/** Cargos que têm 2 turnos (tabs Total/1T/2T ficam visíveis). */
export const CARGOS_COM_DOIS_TURNOS = new Set([
  "PRESIDENTE",
  "GOVERNADOR",
  "PREFEITO",
]);
