"use client";

import { ArrowLeft } from "lucide-react";
import { useMapaStore } from "@/lib/store/mapaStore";
import { FILTERS_DEFAULT, UI_DEFAULT } from "@/lib/mapa/machine";
import { NOME_ESTADO } from "../constants";

/**
 * HeaderVoltar - STEP-BY-STEP (Cesar 20/04/2026).
 *
 * Antes fazia reset total - Cesar: "esta burro a mecanica, voltar deveria ir
 * ao step anterior, nao ao Brasil direto". Agora chama o mesmo `onVoltarStep`
 * do botao voltar do mapa, que sobe UM nivel da hierarquia:
 *
 *   microzona -> bairro -> municipio -> estado -> brasil + filtro -> brasil puro
 *
 * Label adapta ao proximo destino. Desabilita so no estado inicial puro
 * (brasil, sem filtro, defaults).
 */
export function HeaderVoltar({ onVoltarStep }: { onVoltarStep: () => void }) {
  const filters = useMapaStore((s) => s.filters);
  const geography = useMapaStore((s) => s.geography);
  const selecionados = useMapaStore((s) => s.selecionados);
  const viewMode = useMapaStore((s) => s.ui.viewMode);

  const isInitial =
    geography.nivel === "brasil" &&
    !geography.uf &&
    !geography.ibge &&
    selecionados.length === 0 &&
    filters.partido === FILTERS_DEFAULT.partido &&
    filters.candidatoId === FILTERS_DEFAULT.candidatoId &&
    filters.cargo === FILTERS_DEFAULT.cargo &&
    filters.ano === FILTERS_DEFAULT.ano &&
    filters.anoComparacao === FILTERS_DEFAULT.anoComparacao &&
    filters.turno === FILTERS_DEFAULT.turno &&
    filters.tab === FILTERS_DEFAULT.tab &&
    filters.modo === FILTERS_DEFAULT.modo &&
    viewMode === UI_DEFAULT.viewMode;

  // Label adaptativo = proximo step. Alinhado com voltarUmNivel do mapa.
  const nomeEstado = NOME_ESTADO[geography.uf ?? ""] ?? geography.uf ?? "";
  let label = "Voltar";
  if (geography.cdDist) label = "Voltar à cidade";
  else if (geography.nivel === "municipio") label = `Voltar a ${nomeEstado || "estado"}`;
  else if (geography.nivel === "estado") label = "Voltar ao Brasil";
  else if (geography.nivel === "brasil" && selecionados.length > 0) label = "Limpar filtro";

  return (
    <div className="flex-shrink-0 px-3 pt-2 pb-1">
      <button
        onClick={isInitial ? undefined : onVoltarStep}
        disabled={isInitial}
        className={`flex items-center gap-1.5 text-xs transition-colors ${
          isInitial
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-500 hover:text-brand-700"
        }`}
        title={isInitial ? "Ja esta no estado inicial" : label}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {label}
      </button>
    </div>
  );
}
