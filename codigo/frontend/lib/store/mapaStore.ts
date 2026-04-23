/**
 * Store global do módulo mapa eleitoral (Zustand + máquina de estados).
 *
 * Arquitetura V2 (20/04/2026):
 *   - Estado canônico em 4 slices: filters, geography, ui, selecionados.
 *   - TODA mudança de estado passa por `reducer` (lib/mapa/machine.ts) que
 *     enforça invariantes I1-I11. Actions reativas (setCargo, drillToEstado,
 *     etc) são wrappers que montam a action tipada e fazem dispatch.
 *   - Persist em sessionStorage: navegação back/forward reaproveita estado;
 *     fechar a aba limpa (dados TSE mudam raramente, sessão é o horizonte).
 *   - `selecionados` é primeira-classe; os campos legados `filters.partido`
 *     e `filters.candidatoId` são DERIVADOS (mantidos em sync pelo reducer).
 *
 * API pública preservada: todos os métodos do store anterior continuam
 * funcionando. Consumidores legados (useMapaActions, componentes) não
 * precisam mudar. Novas actions V2 (addSelecionado, toggleSelecionado,
 * reset) estão disponíveis pra migração gradual.
 *
 * Importante: o store NÃO contém dados do servidor. GeoJSON/listas ficam
 * no cache SWR (lib/mapa/fetcher.ts + hooks/useMapaData.ts).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SelecionadoItem } from "@/lib/types";
import {
  reducer,
  initialState,
  FILTERS_DEFAULT,
  GEOGRAPHY_DEFAULT,
  type MapaStateV2,
  type Action,
} from "@/lib/mapa/machine";

// Re-export dos tipos/constantes compartilhadas pra preservar a API pública
// anterior (consumidores legados importam daqui).
export type {
  NivelGeografico,
  ModoMapa,
  TabTurno,
  SidebarState,
  ViewMode,
  MapaFilters,
  MapaGeography,
  MapaUI,
} from "@/lib/mapa/tipos";
export {
  CARGO_DEFAULT_POR_ANO,
  CARGOS_VALIDOS_POR_ANO,
  CARGOS_COM_DOIS_TURNOS,
} from "@/lib/mapa/tipos";

import type {
  NivelGeografico,
  SidebarState,
  TabTurno,
  ModoMapa,
  ViewMode,
  ModoProduto,
} from "@/lib/mapa/tipos";

// ── Interface do store ───────────────────────────────────────────────────────

interface MapaState extends MapaStateV2 {
  // ── V2 primitivas ─────────────────────────────────────────────────────
  /** Aplica action via reducer (lib/mapa/machine). Use este para ações novas. */
  dispatch: (action: Action) => void;

  // ── Filter actions (legacy API, preservadas) ──────────────────────────
  setPartido: (p: number | null) => void;
  setCandidato: (id: number | null) => void;
  setCargo: (c: string | null) => void;
  setAno: (a: number) => void;
  setAnoComparacao: (a: number | null) => void;
  setTurno: (t: 0 | 1 | 2) => void;
  setTab: (t: TabTurno) => void;
  setModo: (m: ModoMapa) => void;
  resetFilters: () => void;

  // ── Geography actions ─────────────────────────────────────────────────
  drillToEstado: (uf: string) => void;
  drillToMunicipio: (ibge: string, ufHint?: string) => void;
  drillToBairro: (cdDist: string) => void;
  voltar: () => void;
  resetGeografia: () => void;
  setNivel: (n: NivelGeografico) => void;
  setUf: (uf: string | null) => void;
  setIbge: (ibge: string | null) => void;

  // ── Seleção (V2 primeira-classe) ───────────────────────────────────────
  addSelecionado: (item: SelecionadoItem) => void;
  removeSelecionado: (tipo: "partido" | "candidato", id: number) => void;
  toggleSelecionado: (item: SelecionadoItem) => void;
  clearSelecionados: () => void;
  setSelecionados: (items: SelecionadoItem[]) => void;

  // ── UI actions ────────────────────────────────────────────────────────
  setLoading: (v: boolean) => void;
  setSidebarState: (s: SidebarState) => void;
  toggleSidebarCompact: () => void;
  fecharSidebar: () => void;
  abrirSidebar: () => void;
  toggleDebug: () => void;
  setHover: (f: any | null) => void;
  setViewMode: (m: ViewMode) => void;
  setModoProduto: (m: ModoProduto) => void;

  // ── Reset total (P_reset) ─────────────────────────────────────────────
  reset: () => void;
}

// ── Store ────────────────────────────────────────────────────────────────────

/**
 * Extrai o estado canônico (4 slices) ignorando actions.
 * Usado pra montar o input do reducer.
 */
function extractState(s: MapaState): MapaStateV2 {
  return {
    filters: s.filters,
    geography: s.geography,
    ui: s.ui,
    selecionados: s.selecionados,
  };
}

export const useMapaStore = create<MapaState>()(
  persist(
    (set, get) => {
      // Helper interno: aplica action via reducer e atualiza o store.
      const dispatch = (action: Action) => {
        const current = extractState(get());
        const next = reducer(current, action);
        if (next === current) return; // no-op
        set({
          filters: next.filters,
          geography: next.geography,
          ui: next.ui,
          selecionados: next.selecionados,
        });
      };

      return {
        ...initialState(),

        dispatch,

        // ── Filters ─────────────────────────────────────────────────────
        setPartido: (p) => {
          // Legacy: manipula só `filters.partido`. Consumidores V2 devem
          // usar addSelecionado/toggleSelecionado com SelecionadoItem
          // completo (nome + cor). Esta action será migrada na Fase 2.
          // Invariante `I_derivados` só sobrescreve quando há seleção ativa,
          // então setPartido com selecionados vazio funciona sem conflito.
          set((s) => ({ filters: { ...s.filters, partido: p } }));
        },

        setCandidato: (id) => {
          set((s) => ({ filters: { ...s.filters, candidatoId: id } }));
        },

        setCargo: (c) => dispatch({ type: "N_set_cargo", cargo: c }),
        setAno: (a) => dispatch({ type: "N_set_ano", ano: a }),
        setAnoComparacao: (a) => dispatch({ type: "N_set_ano_comparacao", ano: a }),
        setTurno: (t) => dispatch({ type: "N_set_turno", turno: t }),
        setTab: (t) => dispatch({ type: "N_set_tab", tab: t }),
        setModo: (m) => dispatch({ type: "N_set_modo", modo: m }),
        resetFilters: () => set({ filters: FILTERS_DEFAULT, selecionados: [] }),

        // ── Geography ───────────────────────────────────────────────────
        drillToEstado: (uf) => dispatch({ type: "D_drill_estado", uf }),
        drillToMunicipio: (ibge, ufHint) =>
          dispatch({ type: "D_drill_municipio", ibge, ufHint }),
        drillToBairro: (cdDist) => dispatch({ type: "D_drill_bairro", cdDist }),
        voltar: () => dispatch({ type: "R_voltar" }),
        resetGeografia: () => set({ geography: GEOGRAPHY_DEFAULT }),
        setNivel: (n) => set((s) => ({ geography: { ...s.geography, nivel: n } })),
        setUf: (uf) => set((s) => ({ geography: { ...s.geography, uf } })),
        setIbge: (ibge) => set((s) => ({ geography: { ...s.geography, ibge } })),

        // ── Seleção (V2) ────────────────────────────────────────────────
        addSelecionado: (item) => dispatch({ type: "N_add_selecionado", item }),
        removeSelecionado: (tipo, id) =>
          dispatch({ type: "N_remove_selecionado", tipo, id }),
        toggleSelecionado: (item) =>
          dispatch({ type: "N_toggle_selecionado", item }),
        clearSelecionados: () => dispatch({ type: "N_clear_selecionados" }),
        setSelecionados: (items) =>
          dispatch({ type: "N_set_selecionados", items }),

        // ── UI ──────────────────────────────────────────────────────────
        setLoading: (v) => dispatch({ type: "N_set_loading", loading: v }),
        setSidebarState: (st) =>
          dispatch({ type: "N_set_sidebar_state", state: st }),
        toggleSidebarCompact: () => dispatch({ type: "N_toggle_sidebar_compact" }),
        fecharSidebar: () => dispatch({ type: "N_fechar_sidebar" }),
        abrirSidebar: () => dispatch({ type: "N_abrir_sidebar" }),
        toggleDebug: () => dispatch({ type: "N_toggle_debug" }),
        setHover: (f) => dispatch({ type: "N_set_hover", feature: f }),
        setViewMode: (m) => dispatch({ type: "N_set_view_mode", viewMode: m }),
        setModoProduto: (m) => dispatch({ type: "N_set_modo_produto", modoProduto: m }),

        // ── Reset total ─────────────────────────────────────────────────
        reset: () => dispatch({ type: "P_reset" }),
      };
    },
    {
      name: "ub-mapa-store",
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      // Persist só o essencial: filters, geography, selecionados.
      // UI é transiente (loading, hover, sidebar-state) - reset ao carregar.
      partialize: (state) => ({
        filters: state.filters,
        geography: state.geography,
        selecionados: state.selecionados,
      }),
      // Sanitiza estado rehidratado: se geography rehidratada é inválida
      // (ex: ibge sem uf), reseta pra brasil.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const g = state.geography;
        if (g.nivel !== "brasil" && !g.uf) {
          state.geography = GEOGRAPHY_DEFAULT;
        }
        if ((g.nivel === "municipio" || g.nivel === "bairro") && !g.ibge) {
          state.geography = g.uf
            ? { nivel: "estado", uf: g.uf, ibge: null, cdDist: null }
            : GEOGRAPHY_DEFAULT;
        }
      },
    }
  )
);
