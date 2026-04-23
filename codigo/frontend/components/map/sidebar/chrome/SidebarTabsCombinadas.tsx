"use client";

import type { NivelMapa, SelecionadoItem } from "@/lib/types";
import { useMapaStore, CARGOS_COM_DOIS_TURNOS, type TabTurno } from "@/lib/store/mapaStore";

// ── Tabs combinadas: Turno (esquerda) + ViewMode (direita) em 1 linha ───────
// Antes: 2 componentes separados, 2 linhas (~88px). Agora: 1 linha (~36px).
// Turno só renderiza em cargos com 2T (Pres/Gov/Pref). ViewMode só em
// brasil/estado sem partido/candidato filtrado.
const TABS_TURNO: { id: TabTurno; label: string }[] = [
  { id: "total",   label: "Total" },
  { id: "1_turno", label: "1T" },
  { id: "2_turno", label: "2T" },
];

export function SidebarTabsCombinadas({
  cargo, nivel, partidoUnico, candidatoUnico,
}: {
  cargo: string | null;
  nivel: NivelMapa;
  partidoUnico: SelecionadoItem | null;
  candidatoUnico: SelecionadoItem | null;
}) {
  const tab = useMapaStore((s) => s.filters.tab);
  const setTab = useMapaStore((s) => s.setTab);
  const setTurno = useMapaStore((s) => s.setTurno);
  const viewMode = useMapaStore((s) => s.ui.viewMode);
  const setViewMode = useMapaStore((s) => s.setViewMode);

  const cargoTemDoisTurnos = !!cargo && CARGOS_COM_DOIS_TURNOS.has(cargo);
  const mostrarViewMode = !partidoUnico && !candidatoUnico && (nivel === "brasil" || nivel === "estado");

  if (!cargoTemDoisTurnos && !mostrarViewMode) return null;

  function handleTab(id: TabTurno) {
    setTab(id);
    setTurno(id === "2_turno" ? 2 : id === "1_turno" ? 1 : 0);
  }

  return (
    <div className="flex-shrink-0 px-3 py-1.5 border-b border-gray-100 flex items-center gap-2">
      {cargoTemDoisTurnos && (
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5">
          {TABS_TURNO.map((t) => {
            const ativo = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTab(t.id)}
                className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                  ativo ? "bg-white text-brand-800 shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}
      {mostrarViewMode && (
        <div className="flex-1 flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5">
          <button
            onClick={() => setViewMode("partidos")}
            className={`flex-1 px-2 py-1 rounded text-[10px] font-semibold transition-all ${
              viewMode === "partidos" ? "bg-white text-brand-800 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
            title="Força dos partidos no nível atual"
          >
            Partidos
          </button>
          <button
            onClick={() => setViewMode("eleitos")}
            className={`flex-1 px-2 py-1 rounded text-[10px] font-semibold transition-all ${
              viewMode === "eleitos" ? "bg-white text-brand-800 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
            title="Eleitos por cargo no nível atual"
          >
            Eleitos
          </button>
        </div>
      )}
    </div>
  );
}
