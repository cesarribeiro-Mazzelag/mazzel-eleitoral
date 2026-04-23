"use client";

import type { SelecionadoItem } from "@/lib/types";
import { corFarolNivel, corOposta } from "@/lib/farolPartido";
import { CORES_FAROL } from "../utils";

// ── Legenda City Mode ─────────────────────────────────────────────────────────
export function LegendaCity({
  selecionados,
  vereadorSelecionado,
}: {
  selecionados: SelecionadoItem[];
  vereadorSelecionado: { candidaturaId: number; nome: string; fotoUrl?: string | null } | null;
}) {
  const candidatoUnico = selecionados.find(s => s.tipo === "candidato");
  const partidoUnico   = selecionados.length === 1 && selecionados[0].tipo === "partido" ? selecionados[0] : null;
  const filtrado       = candidatoUnico ?? partidoUnico ?? (vereadorSelecionado ? { nome: vereadorSelecionado.nome, cor: CORES_FAROL.AZUL } : null);
  const corBase        = filtrado?.cor ?? CORES_FAROL.AZUL;

  // Sem filtro ativo, a escala de "Força por bairro" não tem referência
  // (cor base seria arbitrária e o mapa está em modo dominância de partido).
  // Esconde a legenda nesse caso pra não poluir e evitar confusão de cores.
  if (!filtrado) return null;

  // Labels unificados com LABELS_ESCALA_ELEITOS (BarraLateral).
  // Escala contínua 5→1 + categórico "Sem dados" (0).
  const itens = [
    { nivel: 5, cor: corFarolNivel(corBase, 5), label: "Alta concentração" },
    { nivel: 4, cor: corFarolNivel(corBase, 4), label: "Forte presença" },
    { nivel: 3, cor: corFarolNivel(corBase, 3), label: "Presença moderada" },
    { nivel: 2, cor: corFarolNivel(corBase, 2), label: "Baixa presença" },
    { nivel: 1, cor: corFarolNivel(corBase, 1), label: "Presença residual" },
    { nivel: 0, cor: corOposta(corBase),        label: "Sem dados" },
  ];

  return (
    <div className="absolute bottom-8 left-4 z-10 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-w-[200px] max-w-[240px]">
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.18em]">
          Força por bairro
        </p>
        {filtrado && (
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: corBase }} />
            <p className="text-xs font-bold text-gray-900 truncate">{filtrado.nome}</p>
          </div>
        )}
      </div>
      <div className="px-3 py-2 space-y-0.5">
        {itens.map(({ nivel, cor, label }) => (
          <div key={nivel} className="flex items-center gap-2 py-0.5">
            <div className="w-4 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: cor }} />
            <span className="text-[11px] text-gray-700 font-medium truncate">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
