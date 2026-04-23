/**
 * Hooks de leitura/escrita do estado global do mapa eleitoral.
 *
 * Use estes wrappers em vez de importar useMapaStore diretamente
 * — eles fazem subscribe granular e evitam rerenders desnecessários.
 *
 * Exemplos:
 *   const filters   = useMapaFilters();      // só rerender em mudança de filtros
 *   const geography = useMapaGeography();    // só rerender em mudança de nível
 *   const ui        = useMapaUI();           // só rerender em mudança de UI
 *   const actions   = useMapaActions();      // nunca rerender — só funções
 */
import { useMapaStore } from "@/lib/store/mapaStore";

// ── Selectors ────────────────────────────────────────────────────────────────

export function useMapaFilters() {
  return useMapaStore((s) => s.filters);
}

export function useMapaGeography() {
  return useMapaStore((s) => s.geography);
}

export function useMapaUI() {
  return useMapaStore((s) => s.ui);
}

// ── Selectors granulares (1 campo) ───────────────────────────────────────────
// Use em componentes "folha" que só dependem de UM campo. Evita re-renderizar
// quando outros campos do slice mudam.

export const usePartido = () => useMapaStore((s) => s.filters.partido);
export const useCargo = () => useMapaStore((s) => s.filters.cargo);
export const useAno = () => useMapaStore((s) => s.filters.ano);
export const useModo = () => useMapaStore((s) => s.filters.modo);
export const useTurno = () => useMapaStore((s) => s.filters.turno);
export const useNivel = () => useMapaStore((s) => s.geography.nivel);
export const useUf = () => useMapaStore((s) => s.geography.uf);
export const useIbge = () => useMapaStore((s) => s.geography.ibge);
export const useDebugMode = () => useMapaStore((s) => s.ui.debugMode);

// ── Actions agrupadas ────────────────────────────────────────────────────────
// Não causa rerender porque todas as funções são estáveis no Zustand.

export function useMapaActions() {
  return {
    setPartido: useMapaStore((s) => s.setPartido),
    setCandidato: useMapaStore((s) => s.setCandidato),
    setCargo: useMapaStore((s) => s.setCargo),
    setAno: useMapaStore((s) => s.setAno),
    setAnoComparacao: useMapaStore((s) => s.setAnoComparacao),
    setTurno: useMapaStore((s) => s.setTurno),
    setModo: useMapaStore((s) => s.setModo),
    resetFilters: useMapaStore((s) => s.resetFilters),

    drillToEstado: useMapaStore((s) => s.drillToEstado),
    drillToMunicipio: useMapaStore((s) => s.drillToMunicipio),
    drillToBairro: useMapaStore((s) => s.drillToBairro),
    voltar: useMapaStore((s) => s.voltar),
    resetGeografia: useMapaStore((s) => s.resetGeografia),

    setLoading: useMapaStore((s) => s.setLoading),
    setSidebarState: useMapaStore((s) => s.setSidebarState),
    toggleSidebarCompact: useMapaStore((s) => s.toggleSidebarCompact),
    fecharSidebar: useMapaStore((s) => s.fecharSidebar),
    abrirSidebar: useMapaStore((s) => s.abrirSidebar),
    toggleDebug: useMapaStore((s) => s.toggleDebug),
    setHover: useMapaStore((s) => s.setHover),
  };
}

// Selector específico para sidebar (usado pelo botão flutuante e pela barra)
export const useSidebarState = () => useMapaStore((s) => s.ui.sidebarState);
