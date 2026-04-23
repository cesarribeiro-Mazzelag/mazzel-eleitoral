"use client";

import type { SelecionadoItem } from "@/lib/types";

/**
 * Legenda visual que explica a coloração do mapa quando há partido filtrado.
 * Duas cores lado a lado:
 *   - Cor do partido: municípios onde ele elegeu o cargo filtrado.
 *   - Azul neutro: municípios sem representação do partido.
 *
 * Cesar 20/04: "azul = onde o partido não está, mas o usuário não sabe disso.
 * Coloca o box do gradiente pra ser intuitivo, sem precisar explicar".
 */
export function LegendaPartido({ partidoSel }: { partidoSel: SelecionadoItem }) {
  return (
    <div className="mx-3 mt-2 mb-1 flex-shrink-0 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2 flex items-center gap-3 text-[10px]">
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="w-3 h-3 rounded-sm flex-shrink-0 border border-black/10"
          style={{ backgroundColor: partidoSel.cor }}
        />
        <span className="text-gray-700 truncate">
          Onde <span className="font-semibold">{partidoSel.nome}</span> elegeu
        </span>
      </div>
      <div className="w-px h-3 bg-gray-200 flex-shrink-0" />
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="w-3 h-3 rounded-sm flex-shrink-0 border border-black/10"
          style={{ backgroundColor: "#1E3A8A" }}
        />
        <span className="text-gray-500 truncate">Sem {partidoSel.nome}</span>
      </div>
    </div>
  );
}
