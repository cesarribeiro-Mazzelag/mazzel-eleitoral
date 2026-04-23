"use client";

import type { HoverInfo } from "../types";
import { TooltipCandidato } from "./TooltipCandidato";

// ── Tooltip rico junto ao cursor ──────────────────────────────────────────────
export function TooltipCursor({ x, y, info, modo, top2 }: {
  x: number; y: number; info: HoverInfo; modo: "eleitos" | "votos";
  top2?: import("@/hooks/useMunicipioTop2").Top2Response | null;
}) {
  const COR_BADGE: Record<string, string> = {
    AZUL:     "bg-brand-700 text-brand-100",
    VERDE:    "bg-brand-500 text-white",
    AMARELO:  "bg-amber-500 text-white",
    VERMELHO: "bg-red-600 text-white",
    SEM_DADOS:"bg-gray-500 text-gray-100",
  };
  const LABEL_ELEITOS: Record<string, string> = {
    AZUL: "Domina", VERDE: "Forte", AMARELO: "Presente", VERMELHO: "Ausente", SEM_DADOS: "Ausente",
  };
  const LABEL_VOTOS: Record<string, string> = {
    AZUL: "Muito forte", VERDE: "Forte", AMARELO: "Médio", VERMELHO: "Fraco", SEM_DADOS: "Fraco",
  };
  const labelStatus = modo === "votos" ? LABEL_VOTOS : LABEL_ELEITOS;

  // Tooltip rico (Globo-like) quando top2 existe e bate com a cidade em hover.
  const mostrarTop2 = !!top2 && top2.municipio?.nome === info.nome && !!top2.eleito;

  return (
    <div
      className="absolute z-30 pointer-events-none"
      style={{ left: x + 16, top: y - 12, transform: "translateY(-100%)" }}
    >
      <div className="bg-white text-gray-800 text-xs rounded-xl overflow-hidden min-w-[200px] max-w-[300px] border border-gray-200"
           style={{ boxShadow: "0 8px 28px rgba(15, 23, 42, 0.18)" }}>
        <div className="flex items-center justify-between gap-3 px-3 pt-2.5 pb-2">
          <span className="font-bold text-sm leading-tight text-gray-900">
            {info.nome}
            {mostrarTop2 && top2?.municipio?.estado_uf && (
              <span className="text-gray-400 font-normal"> · {top2.municipio.estado_uf}</span>
            )}
          </span>
          {!mostrarTop2 && info.status && info.status !== "COMPARACAO" && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${COR_BADGE[info.status] ?? "bg-gray-200 text-gray-700"}`}>
              {labelStatus[info.status] ?? ""}
            </span>
          )}
        </div>

        {mostrarTop2 ? (
          <>
            {/* Eleito */}
            <TooltipCandidato item={top2!.eleito!} rotulo="ELEITO" destacado />
            {/* 2º colocado */}
            {top2!.segundo && <TooltipCandidato item={top2!.segundo} rotulo="2º COLOCADO" />}
            {/* Contexto */}
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-[10px] font-semibold text-gray-500 uppercase tracking-widest leading-snug">
              {top2!.cargo} {top2!.ano} · {top2!.turno}º turno
            </div>
          </>
        ) : (
          <>
            {info.extra && (
              <div className="px-3 pb-2 text-[11px] text-gray-600 leading-snug">
                {info.extra}
              </div>
            )}
            {info.hint && (
              <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-500 leading-snug">
                {info.hint}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
