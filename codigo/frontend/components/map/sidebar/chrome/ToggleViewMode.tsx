"use client";

import { useMapaStore } from "@/lib/store/mapaStore";

// Cesar 19/04: "quero manter o angulo partidos ao navegar, hoje só dá pra voltar
// pelo topbar - e muito chato."
export function ToggleViewMode() {
  const viewMode = useMapaStore((s) => s.ui.viewMode);
  const setViewMode = useMapaStore((s) => s.setViewMode);
  return (
    <div className="flex-shrink-0 px-3 pt-2">
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => setViewMode("partidos")}
          className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
            viewMode === "partidos"
              ? "bg-white text-brand-800 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
          title="Força dos partidos no nível atual (ranking)"
        >
          Partidos
        </button>
        <button
          onClick={() => setViewMode("eleitos")}
          className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
            viewMode === "eleitos"
              ? "bg-white text-brand-800 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
          title="Eleitos por cargo no nível atual"
        >
          Eleitos
        </button>
      </div>
    </div>
  );
}
