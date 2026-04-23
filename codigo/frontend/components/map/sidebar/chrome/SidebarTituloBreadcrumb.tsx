"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NivelMapa } from "@/lib/types";

// ── Título-breadcrumb do header (1 linha, denso) ────────────────────────────
// Substitui o header gigante "Quem domina X" + breadcrumb separado. O contexto
// (cargo+ano) já está nos filtros globais da barra superior — não duplica aqui.
export function SidebarTituloBreadcrumb({
  nivel, ufSelecionada, nomeEstado, nomeMunicipio,
  onVoltarBrasil, onVoltarEstado,
}: {
  nivel: NivelMapa;
  ufSelecionada: string | null;
  nomeEstado: string;
  nomeMunicipio: string;
  onVoltarBrasil?: () => void;
  onVoltarEstado?: () => void;
}) {
  const podeVoltar = nivel !== "brasil";
  const handleVoltar = () => {
    if (nivel === "municipio") onVoltarEstado?.();
    else if (nivel === "estado") onVoltarBrasil?.();
  };
  return (
    <div className="min-w-0 flex-1 flex items-center gap-1.5">
      {podeVoltar && (
        <button
          onClick={handleVoltar}
          className="p-0.5 -ml-0.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors flex-shrink-0"
          title="Voltar um nível"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <div className="min-w-0 flex items-center gap-1 text-[12px] font-bold text-white">
        <button
          onClick={onVoltarBrasil}
          disabled={nivel === "brasil"}
          className="hover:underline disabled:no-underline disabled:cursor-default truncate"
        >
          Brasil
        </button>
        {ufSelecionada && (
          <>
            <ChevronRight className="w-3 h-3 text-white/40 flex-shrink-0" />
            <button
              onClick={onVoltarEstado}
              disabled={nivel === "estado"}
              className="hover:underline disabled:no-underline disabled:cursor-default truncate"
            >
              {nomeEstado}
            </button>
          </>
        )}
        {nivel === "municipio" && nomeMunicipio && (
          <>
            <ChevronRight className="w-3 h-3 text-white/40 flex-shrink-0" />
            <span className="truncate">{nomeMunicipio}</span>
          </>
        )}
      </div>
    </div>
  );
}
