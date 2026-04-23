"use client";

import { X } from "lucide-react";
import type { SelecionadoItem } from "@/lib/types";

// ── Barra de filtros ativos (chips) ──────────────────────────────────────────
export function BarraFiltros({
  selecionados,
  onRemover,
  onLimpar,
}: {
  selecionados: SelecionadoItem[];
  onRemover: (id: number, tipo: "candidato" | "partido") => void;
  onLimpar: () => void;
}) {
  if (selecionados.length === 0) return null;
  const label = selecionados[0].tipo === "candidato" ? "candidatos" : "partidos";
  return (
    <div className="flex items-center gap-1.5 flex-wrap bg-white/95 backdrop-blur-sm rounded-xl shadow border border-gray-200 px-2 py-1.5">
      {selecionados.length >= 2 && (
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mr-0.5">
          {selecionados.length === 2 ? "Comparando" : `${selecionados.length} ${label}`}
        </span>
      )}
      {selecionados.map(s => (
        <div
          key={`${s.tipo}-${s.id}`}
          className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-white text-[11px] font-semibold"
          style={{ backgroundColor: s.cor }}
        >
          <span className="truncate max-w-[100px]">{s.nome}</span>
          <button
            onClick={() => onRemover(s.id, s.tipo)}
            className="hover:opacity-70 transition-opacity flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {selecionados.length > 1 && (
        <button
          onClick={onLimpar}
          className="text-[10px] text-gray-400 hover:text-gray-600 font-semibold px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
