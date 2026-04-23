"use client";

import { CARGOS_COM_DOIS_TURNOS, useMapaStore, type TabTurno } from "@/lib/store/mapaStore";

// Padrão Globo/G1: 3 tabs para cargos com 2T (Presidente/Governador/Prefeito).
// - Total: resultado FINAL do pleito. Pra candidato que foi pro 2T conta votos_2t;
//          pra quem foi eleito no 1T ou não passou pro 2T, conta votos_1t.
//          NUNCA soma 1T+2T (regra crítica: eleitor votaria 2x, inflaria totais).
//          Implementação backend: COALESCE(votos_2t, votos_1t) via turno=0.
// - 1T: votos_1t puros (pleito original com todos os candidatos)
// - 2T: votos_2t puros (disputa final, só cargos majoritários que foram pra 2T)
const TABS: { id: TabTurno; label: string }[] = [
  { id: "total",   label: "Total" },
  { id: "1_turno", label: "1º Turno" },
  { id: "2_turno", label: "2º Turno" },
];

export function TabsTurno() {
  const cargo = useMapaStore((s) => s.filters.cargo);
  const tab = useMapaStore((s) => s.filters.tab);
  const setTab = useMapaStore((s) => s.setTab);
  const setTurno = useMapaStore((s) => s.setTurno);

  if (!cargo || !CARGOS_COM_DOIS_TURNOS.has(cargo)) return null;

  function handle(id: TabTurno) {
    setTab(id);
    // turno=0 significa "total/final" no backend (COALESCE 2t/1t).
    // turno=1 = só 1T. turno=2 = só 2T.
    setTurno(id === "2_turno" ? 2 : id === "1_turno" ? 1 : 0);
  }

  return (
    <div className="flex-shrink-0 px-3 pt-3">
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        {TABS.map((t) => {
          const ativo = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handle(t.id)}
              className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                ativo
                  ? "bg-white text-brand-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
