"use client";

/**
 * Toolbar minimalista do mapa eleitoral.
 *
 * Antes (Fase 6) tinha modo (Eleitos/Votos/Heatmap) + comparação temporal +
 * debug. Tudo isso migrou para o header da página (UX Fase: tudo num
 * lugar só). Aqui ficou só o toggle de Debug, no canto inferior direito,
 * pequeno e discreto — pode ser ignorado pelo usuário comum.
 */
import { useDebugMode, useMapaActions } from "@/hooks/useMapaState";

export function MapaToolbar() {
  const debugMode = useDebugMode();
  const { toggleDebug } = useMapaActions();

  return (
    <button
      onClick={toggleDebug}
      className={
        "absolute bottom-3 right-3 z-30 rounded-md border px-2 py-1 text-[10px] font-mono shadow-sm transition " +
        (debugMode
          ? "border-amber-400 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-white/80 text-slate-400 hover:bg-white hover:text-slate-700")
      }
      title="Ativar/desativar painel de debug"
      aria-label="Toggle debug"
    >
      DEBUG {debugMode ? "ON" : ""}
    </button>
  );
}
