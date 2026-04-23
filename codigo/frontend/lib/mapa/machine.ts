/**
 * Máquina de estados do Mapa V2 - reducer puro com invariantes explícitas.
 *
 * Baseada no documento `/MAPA_ARQUITETURA_V2.md` seção 3. Substitui o
 * fluxo reativo (useEffect + setState) por transições nomeadas tipo-seguras:
 *
 *   - P (parked/home)    → reset total
 *   - R (reverse/voltar) → sobe um nível geográfico
 *   - N (neutral)        → muda filtro sem navegar
 *   - D (drive/avançar)  → desce um nível geográfico
 *
 * TODA mudança de estado passa por `reducer(state, action)`, que:
 *   1. Aplica a ação (switch por type).
 *   2. Enforça invariantes I1-I11 em fixed-point (máx 5 passes).
 *
 * Regra: esta máquina é PURA. Zero side-effects (fetch, setTimeout, DOM).
 * Side-effects declarados são responsabilidade do store + middleware.
 */

import type { SelecionadoItem } from "@/lib/types";
import type {
  MapaFilters,
  MapaGeography,
  MapaUI,
  ModoMapa,
  TabTurno,
  SidebarState,
  ViewMode,
  ModoProduto,
} from "./tipos";
import {
  CARGOS_COM_DOIS_TURNOS,
  CARGO_DEFAULT_POR_ANO,
  CARGOS_VALIDOS_POR_ANO,
} from "./tipos";

// ── Estado da máquina ────────────────────────────────────────────────────────

/**
 * Estado completo do mapa V2.
 *
 * Diferente do store atual, `selecionados` é primeira-classe aqui.
 * Os campos legados `filters.partido` e `filters.candidatoId` são
 * **derivados** de `selecionados`:
 *   - `partido`: último partido único (len===1 && tipo==="partido") ou null.
 *   - `candidatoId`: último candidato único (len===1 && tipo==="candidato") ou null.
 *
 * O store V2 expõe esses derivados via selectors para preservar compatibilidade
 * com consumidores legados.
 */
export interface MapaStateV2 {
  filters: MapaFilters;
  geography: MapaGeography;
  ui: MapaUI;
  selecionados: SelecionadoItem[];
}

// ── Actions (união discriminada) ─────────────────────────────────────────────

export type Action =
  // D - Drive (desce nível)
  | { type: "D_drill_estado"; uf: string }
  | { type: "D_drill_municipio"; ibge: string; ufHint?: string }
  | { type: "D_drill_bairro"; cdDist: string }

  // R - Reverse (sobe nível)
  | { type: "R_voltar" }

  // P - Park (reset total, preserva viewMode)
  | { type: "P_reset" }

  // N - Neutral (filtros sem navegar)
  | { type: "N_set_cargo"; cargo: string | null }
  | { type: "N_set_ano"; ano: number }
  | { type: "N_set_ano_comparacao"; ano: number | null }
  | { type: "N_set_turno"; turno: 0 | 1 | 2 }
  | { type: "N_set_tab"; tab: TabTurno }
  | { type: "N_set_modo"; modo: ModoMapa }

  // N - Seleção (partidos/candidatos)
  | { type: "N_add_selecionado"; item: SelecionadoItem }
  | { type: "N_remove_selecionado"; tipo: "partido" | "candidato"; id: number }
  | { type: "N_toggle_selecionado"; item: SelecionadoItem }
  | { type: "N_clear_selecionados" }
  | { type: "N_set_selecionados"; items: SelecionadoItem[] }

  // N - UI
  | { type: "N_set_sidebar_state"; state: SidebarState }
  | { type: "N_toggle_sidebar_compact" }
  | { type: "N_fechar_sidebar" }
  | { type: "N_abrir_sidebar" }
  | { type: "N_set_view_mode"; viewMode: ViewMode }
  | { type: "N_set_modo_produto"; modoProduto: ModoProduto }
  | { type: "N_set_hover"; feature: any | null }
  | { type: "N_set_loading"; loading: boolean }
  | { type: "N_toggle_debug" };

// ── Defaults (usados pelo P_reset e bootstrap) ───────────────────────────────

/**
 * "Mandatos Vigentes" - estado inicial do mapa (15/04/2026).
 * Cargo padrão = PREFEITO (maior cargo do último ciclo municipal).
 */
export const FILTERS_DEFAULT: MapaFilters = {
  partido: null,
  candidatoId: null,
  cargo: CARGO_DEFAULT_POR_ANO[2024],
  ano: 2024,
  anoComparacao: null,
  turno: 0,
  tab: "total",
  modo: "eleitos",
};

export const GEOGRAPHY_DEFAULT: MapaGeography = {
  nivel: "brasil",
  uf: null,
  ibge: null,
  cdDist: null,
};

export const UI_DEFAULT: MapaUI = {
  loading: false,
  sidebarState: "open",
  debugMode: false,
  hoverFeature: null,
  viewMode: "partidos",
  modoProduto: "inteligencia",
};

export const SELECIONADOS_DEFAULT: SelecionadoItem[] = [];

/** Estado inicial completo da máquina. */
export function initialState(): MapaStateV2 {
  return {
    filters: FILTERS_DEFAULT,
    geography: GEOGRAPHY_DEFAULT,
    ui: UI_DEFAULT,
    selecionados: SELECIONADOS_DEFAULT,
  };
}

// ── Helpers de cargo ─────────────────────────────────────────────────────────

const CARGOS_NACIONAIS = new Set(["PRESIDENTE", "SENADOR"]);
const CARGOS_ESTADUAIS = new Set([
  "GOVERNADOR",
  "DEPUTADO_FEDERAL",
  "DEPUTADO_ESTADUAL",
]);
const CARGOS_MUNICIPAIS = new Set(["PREFEITO", "VEREADOR"]);

function isCargoNacional(cargo: string | null): boolean {
  return !!cargo && CARGOS_NACIONAIS.has(cargo);
}
function isCargoEstadual(cargo: string | null): boolean {
  return !!cargo && CARGOS_ESTADUAIS.has(cargo);
}
function isCargoMunicipal(cargo: string | null): boolean {
  return !!cargo && CARGOS_MUNICIPAIS.has(cargo);
}
function temDoisTurnos(cargo: string | null): boolean {
  return !!cargo && CARGOS_COM_DOIS_TURNOS.has(cargo);
}

// ── Reducer principal ────────────────────────────────────────────────────────

/**
 * Aplica uma action ao state e enforça invariantes.
 *
 * Contrato:
 *   - Pura: mesma entrada → mesma saída. Zero side-effects.
 *   - Nunca lança (erros viram no-op com warning opcional).
 *   - Retorna sempre um novo objeto (ou `state` se não houve mudança).
 */
export function reducer(state: MapaStateV2, action: Action): MapaStateV2 {
  const afterAction = applyAction(state, action);
  if (afterAction === state) return state;
  return enforceInvariants(afterAction);
}

// ── applyAction: aplica a ação sem se preocupar com invariantes ──────────────

function applyAction(s: MapaStateV2, a: Action): MapaStateV2 {
  switch (a.type) {
    // ── D - Drive ──────────────────────────────────────────────────────────
    case "D_drill_estado":
      return {
        ...s,
        geography: { nivel: "estado", uf: a.uf, ibge: null, cdDist: null },
      };

    case "D_drill_municipio":
      return {
        ...s,
        geography: {
          nivel: "municipio",
          uf: a.ufHint ?? s.geography.uf,
          ibge: a.ibge,
          cdDist: null,
        },
      };

    case "D_drill_bairro":
      return {
        ...s,
        geography: { ...s.geography, nivel: "bairro", cdDist: a.cdDist },
      };

    // ── R - Reverse ────────────────────────────────────────────────────────
    case "R_voltar": {
      const { nivel, uf } = s.geography;
      if (nivel === "bairro") {
        return {
          ...s,
          geography: { ...s.geography, nivel: "municipio", cdDist: null },
        };
      }
      if (nivel === "municipio") {
        return {
          ...s,
          geography: { nivel: "estado", uf, ibge: null, cdDist: null },
        };
      }
      if (nivel === "estado") {
        return { ...s, geography: GEOGRAPHY_DEFAULT };
      }
      return s; // brasil → no-op
    }

    // ── P - Park (reset) ───────────────────────────────────────────────────
    case "P_reset":
      return {
        ...s,
        filters: FILTERS_DEFAULT,
        geography: GEOGRAPHY_DEFAULT,
        selecionados: [],
        // Preserva UI (sidebar, viewMode) e hover
      };

    // ── N - Filtros ────────────────────────────────────────────────────────
    case "N_set_cargo":
      return {
        ...s,
        filters: {
          ...s.filters,
          cargo: a.cargo ? a.cargo.toUpperCase() : null,
        },
      };

    case "N_set_ano":
      return {
        ...s,
        filters: { ...s.filters, ano: a.ano },
      };

    case "N_set_ano_comparacao":
      return {
        ...s,
        filters: { ...s.filters, anoComparacao: a.ano },
      };

    case "N_set_turno":
      return { ...s, filters: { ...s.filters, turno: a.turno } };

    case "N_set_tab":
      return { ...s, filters: { ...s.filters, tab: a.tab } };

    case "N_set_modo":
      return { ...s, filters: { ...s.filters, modo: a.modo } };

    // ── N - Seleção ────────────────────────────────────────────────────────
    case "N_add_selecionado": {
      if (jaExiste(s.selecionados, a.item)) return s;
      return { ...s, selecionados: [...s.selecionados, a.item] };
    }

    case "N_remove_selecionado": {
      const next = s.selecionados.filter(
        (x) => !(x.tipo === a.tipo && x.id === a.id)
      );
      if (next.length === s.selecionados.length) return s;
      return { ...s, selecionados: next };
    }

    case "N_toggle_selecionado": {
      if (jaExiste(s.selecionados, a.item)) {
        return {
          ...s,
          selecionados: s.selecionados.filter(
            (x) => !(x.tipo === a.item.tipo && x.id === a.item.id)
          ),
        };
      }
      return { ...s, selecionados: [...s.selecionados, a.item] };
    }

    case "N_clear_selecionados":
      if (s.selecionados.length === 0) return s;
      // Ao limpar, zera derivados legados também (setPartido/setCandidato
      // não podem mais ter valor "órfão" após um clear explícito).
      return {
        ...s,
        selecionados: [],
        filters: { ...s.filters, partido: null, candidatoId: null },
      };

    case "N_set_selecionados":
      // Se vai zerar, limpa derivados também (ver N_clear_selecionados).
      if (a.items.length === 0) {
        return {
          ...s,
          selecionados: [],
          filters: { ...s.filters, partido: null, candidatoId: null },
        };
      }
      return { ...s, selecionados: a.items };

    // ── N - UI ─────────────────────────────────────────────────────────────
    case "N_set_sidebar_state":
      return { ...s, ui: { ...s.ui, sidebarState: a.state } };

    case "N_toggle_sidebar_compact":
      return {
        ...s,
        ui: {
          ...s.ui,
          sidebarState: s.ui.sidebarState === "compact" ? "open" : "compact",
        },
      };

    case "N_fechar_sidebar":
      return { ...s, ui: { ...s.ui, sidebarState: "closed" } };

    case "N_abrir_sidebar":
      return { ...s, ui: { ...s.ui, sidebarState: "open" } };

    case "N_set_view_mode":
      return { ...s, ui: { ...s.ui, viewMode: a.viewMode } };

    case "N_set_modo_produto":
      if (s.ui.modoProduto === a.modoProduto) return s;
      return { ...s, ui: { ...s.ui, modoProduto: a.modoProduto } };

    case "N_set_hover":
      return { ...s, ui: { ...s.ui, hoverFeature: a.feature } };

    case "N_set_loading":
      return { ...s, ui: { ...s.ui, loading: a.loading } };

    case "N_toggle_debug":
      return { ...s, ui: { ...s.ui, debugMode: !s.ui.debugMode } };

    default: {
      // TypeScript prova exaustividade acima; este default só existe pra
      // JS caller que passe action desconhecida (não lança, vira no-op).
      return s;
    }
  }
}

// ── Invariantes ──────────────────────────────────────────────────────────────

/**
 * Aplica invariantes I1-I8 em fixed-point (até estabilizar).
 *
 * Cada passe roda todas as invariantes. Se alguma modificou o state, roda
 * outro passe. Máximo 5 passes pra evitar loop em bug de definição.
 *
 * I9, I10, I11 são comportamentais (side-effects, transições) - não entram
 * aqui. São garantidas pelo próprio reducer ao aplicar a action.
 */
export function enforceInvariants(s: MapaStateV2): MapaStateV2 {
  let current = s;
  for (let pass = 0; pass < 5; pass++) {
    const next = singlePass(current);
    if (next === current) return current;
    current = next;
  }
  if (typeof console !== "undefined") {
    console.warn(
      "[mapa/machine] enforceInvariants não convergiu em 5 passes",
      current
    );
  }
  return current;
}

function singlePass(s: MapaStateV2): MapaStateV2 {
  let r = s;
  // Ordem importa: primeiro corrigimos cargo em função de ano (I4/I5),
  // depois invariantes que usam cargo (I1/I2/I3), depois seleção-modo,
  // e por fim os derivados. Se fizéssemos I1 antes de I4, cargo nacional
  // num ano municipal zeraria o nivel antes de o cargo ser corrigido -
  // perda de informação geográfica sem motivo.
  r = I4_ano_municipal_valida_cargo(r);
  r = I5_ano_geral_valida_cargo(r);
  r = I1_cargo_nacional_em_brasil_ou_estado(r);
  r = I2_cargo_estadual_em_brasil_ou_estado(r);
  r = I3_cargo_sem_2t_forca_turno_zero(r);
  // I6/I7/I8 REMOVIDOS em 20/04/2026 (Cesar): forçavam modo em funcao de
  // selecao/cargo, revertendo click do usuario. "quando clico no PSD muda
  // pra Votos automaticamente, e isso esta errado, deveria continuar Eleitos.
  // essa mecanica esta quebrada". Agora modo e totalmente controlado pelo
  // toggle da topbar - user escolhe Eleitos/Votos/Heatmap e nada sobrescreve.
  // r = I6_multi_partido_modo_votos(r);
  // r = I7_sem_selecionados_modo_eleitos(r);
  // r = I8_unico_partido_modo_votos(r);
  r = I_derivados_de_selecionados(r);
  return r;
}

/** I1: cargo ∈ {PRESIDENTE, SENADOR} ⇒ nivel ∈ {brasil, estado}. */
function I1_cargo_nacional_em_brasil_ou_estado(
  s: MapaStateV2
): MapaStateV2 {
  if (!isCargoNacional(s.filters.cargo)) return s;
  const n = s.geography.nivel;
  if (n === "brasil" || n === "estado") return s;
  // Violação: desce pra brasil
  return {
    ...s,
    geography: { nivel: "brasil", uf: null, ibge: null, cdDist: null },
  };
}

/** I2: cargo ∈ {GOVERNADOR, DEP_*} ⇒ nivel ∈ {brasil, estado}. */
function I2_cargo_estadual_em_brasil_ou_estado(
  s: MapaStateV2
): MapaStateV2 {
  if (!isCargoEstadual(s.filters.cargo)) return s;
  const n = s.geography.nivel;
  if (n === "brasil" || n === "estado") return s;
  // Violação: sobe pra estado (preserva uf)
  return {
    ...s,
    geography: {
      nivel: "estado",
      uf: s.geography.uf,
      ibge: null,
      cdDist: null,
    },
  };
}

/** I3: cargo ∉ cargos-com-2T ⇒ turno = 0 e tab = "total". */
function I3_cargo_sem_2t_forca_turno_zero(s: MapaStateV2): MapaStateV2 {
  if (temDoisTurnos(s.filters.cargo)) return s;
  if (s.filters.turno === 0 && s.filters.tab === "total") return s;
  return {
    ...s,
    filters: { ...s.filters, turno: 0, tab: "total" },
  };
}

/** I4: ano ∈ {2024, 2020} ⇒ cargo ∈ {PREFEITO, VEREADOR, VIGENTES}. */
function I4_ano_municipal_valida_cargo(s: MapaStateV2): MapaStateV2 {
  const ano = s.filters.ano;
  if (ano !== 2024 && ano !== 2020) return s;
  const cargo = s.filters.cargo;
  if (!cargo) return s;
  if (cargo === "VIGENTES" || isCargoMunicipal(cargo)) return s;
  // Violação: cai pro cargo default do ano
  return {
    ...s,
    filters: { ...s.filters, cargo: CARGO_DEFAULT_POR_ANO[ano] ?? "PREFEITO" },
  };
}

/** I5: ano ∈ {2022, 2018} ⇒ cargo ∈ {PRESIDENTE, GOVERNADOR, SENADOR, DEP_*, VIGENTES}. */
function I5_ano_geral_valida_cargo(s: MapaStateV2): MapaStateV2 {
  const ano = s.filters.ano;
  if (ano !== 2022 && ano !== 2018) return s;
  const cargo = s.filters.cargo;
  if (!cargo) return s;
  const validos = CARGOS_VALIDOS_POR_ANO[ano] ?? [];
  if (cargo === "VIGENTES" || validos.includes(cargo)) return s;
  return {
    ...s,
    filters: {
      ...s.filters,
      cargo: CARGO_DEFAULT_POR_ANO[ano] ?? "PRESIDENTE",
    },
  };
}

/** I6: |partidos_selecionados| ≥ 2 ⇒ modo = votos. */
function I6_multi_partido_modo_votos(s: MapaStateV2): MapaStateV2 {
  const partidos = s.selecionados.filter((x) => x.tipo === "partido");
  if (partidos.length < 2) return s;
  if (s.filters.modo === "votos") return s;
  return { ...s, filters: { ...s.filters, modo: "votos" } };
}

/** I7: |selecionados| == 0 e cargo != VIGENTES ⇒ modo = eleitos. */
function I7_sem_selecionados_modo_eleitos(s: MapaStateV2): MapaStateV2 {
  if (s.selecionados.length > 0) return s;
  if (s.filters.cargo === "VIGENTES") return s;
  if (s.filters.modo === "eleitos" || s.filters.modo === "heatmap") return s;
  return { ...s, filters: { ...s.filters, modo: "eleitos" } };
}

/** I8: |selecionados| == 1 e é partido ⇒ modo = votos. */
function I8_unico_partido_modo_votos(s: MapaStateV2): MapaStateV2 {
  if (s.selecionados.length !== 1) return s;
  if (s.selecionados[0].tipo !== "partido") return s;
  if (s.filters.modo === "votos") return s;
  return { ...s, filters: { ...s.filters, modo: "votos" } };
}

/**
 * Derivados: mantém `filters.partido` e `filters.candidatoId` em sincronia
 * com `selecionados` QUANDO há seleção ativa.
 *
 * Regras (compatíveis com MapaEleitoral atual e consumidores legados):
 *   - Exatamente 1 item partido → `partido = item.id`, `candidatoId = null`.
 *   - Exatamente 1 item candidato → `candidatoId = item.id`, `partido = null`.
 *   - 2+ itens → ambos null (modo comparação).
 *   - 0 itens (selecionados vazio) → NÃO MEXE em filters.partido/candidatoId.
 *     Consumidores legados (setPartido direto) continuam funcionando até
 *     a Fase 2 migrar tudo pra selecionados[].
 */
function I_derivados_de_selecionados(s: MapaStateV2): MapaStateV2 {
  const sel = s.selecionados;

  // Sem seleção: não mexe nos campos legados.
  if (sel.length === 0) return s;

  let partido: number | null = null;
  let candidatoId: number | null = null;
  if (sel.length === 1) {
    const item = sel[0];
    if (item.tipo === "partido") partido = item.id;
    else candidatoId = item.id;
  }
  // Com 2+ itens, ambos ficam null (comparação).

  if (
    s.filters.partido === partido &&
    s.filters.candidatoId === candidatoId
  ) {
    return s;
  }
  return { ...s, filters: { ...s.filters, partido, candidatoId } };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function jaExiste(list: SelecionadoItem[], item: SelecionadoItem): boolean {
  return list.some((x) => x.tipo === item.tipo && x.id === item.id);
}
