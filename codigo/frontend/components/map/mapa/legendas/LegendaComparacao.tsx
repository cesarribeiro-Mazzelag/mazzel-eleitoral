"use client";

import type { NivelMapa, SelecionadoItem } from "@/lib/types";

// ── Legenda comparação ────────────────────────────────────────────────────────
export function LegendaComparacao({
  selecionados,
  dadosAtivos,
  nivel,
  tipoComparacao,
}: {
  selecionados: SelecionadoItem[];
  dadosAtivos: any;
  nivel: NivelMapa;
  tipoComparacao: "candidatos" | "partidos";
}) {
  // No nível Brasil, features têm "partido_num"; em estado/município têm "partido_dominante_num"
  const prop = tipoComparacao === "candidatos"
    ? "candidato_dominante_id"
    : nivel === "brasil" ? "partido_num" : "partido_dominante_num";

  // Contagens por vencedor + bucket de margem (domina/morno/disputa/empate)
  const contagens: Record<number, number> = {};
  let dominacao = 0, vitoriaClara = 0, disputaApertada = 0, empate = 0, semDados = 0;
  for (const f of dadosAtivos?.features ?? []) {
    const id = f.properties?.[prop];
    const margem = f.properties?.margem_pct ?? 0;
    const total = f.properties?.total_selecionados ?? 0;
    if (id == null || id === -1 || total === 0) { semDados += 1; continue; }
    contagens[id] = (contagens[id] ?? 0) + 1;
    if (margem >= 60)      dominacao += 1;
    else if (margem >= 30) vitoriaClara += 1;
    else if (margem >= 10) disputaApertada += 1;
    else                    empate += 1;
  }

  return (
    <div className="absolute bottom-8 left-4 z-10 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-w-[230px]">
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.18em]">
          Comparando {selecionados.length} {tipoComparacao === "candidatos" ? "candidatos" : "partidos"}
        </p>
      </div>
      {/* Quem são */}
      <div className="px-3 py-2 space-y-0.5 border-b border-gray-100">
        {selecionados.map(s => (
          <div key={s.id} className="flex items-center gap-2 py-0.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.cor }} />
            <span className="text-[11px] text-gray-800 font-semibold truncate flex-1">{s.nome}</span>
            <span className="text-[11px] font-bold tabular-nums text-gray-700 flex-shrink-0">{contagens[s.id] ?? 0}</span>
          </div>
        ))}
      </div>
      {/* Intensidade por margem */}
      <div className="px-3 py-2 space-y-0.5">
        <div className="flex items-center gap-2 py-0.5">
          <div className="w-4 h-3 rounded-sm flex-shrink-0 bg-brand-600" />
          <span className="text-[10px] text-gray-700 flex-1">Domina (margem &gt;60%)</span>
          <span className="text-[10px] tabular-nums text-gray-500">{dominacao}</span>
        </div>
        <div className="flex items-center gap-2 py-0.5">
          <div className="w-4 h-3 rounded-sm flex-shrink-0 bg-brand-500 opacity-80" />
          <span className="text-[10px] text-gray-700 flex-1">Vitória clara (30–60%)</span>
          <span className="text-[10px] tabular-nums text-gray-500">{vitoriaClara}</span>
        </div>
        <div className="flex items-center gap-2 py-0.5">
          <div className="w-4 h-3 rounded-sm flex-shrink-0 bg-brand-400 opacity-55" />
          <span className="text-[10px] text-gray-700 flex-1">Disputa apertada (10–30%)</span>
          <span className="text-[10px] tabular-nums text-gray-500">{disputaApertada}</span>
        </div>
        <div className="flex items-center gap-2 py-0.5">
          <div className="w-4 h-3 rounded-sm flex-shrink-0 bg-gray-300" />
          <span className="text-[10px] text-gray-700 flex-1">Ninguém domina (&lt;10%)</span>
          <span className="text-[10px] tabular-nums text-gray-500">{empate}</span>
        </div>
        <div className="flex items-center gap-2 py-0.5">
          <div className="w-4 h-3 rounded-sm flex-shrink-0 bg-gray-200" />
          <span className="text-[10px] text-gray-400 flex-1">Sem dados</span>
          <span className="text-[10px] tabular-nums text-gray-400">{semDados}</span>
        </div>
      </div>
    </div>
  );
}
