"use client";

import type { NivelMapa, SelecionadoItem } from "@/lib/types";

// ── PainelComparacao: 2+ selecionados (candidatos ou partidos) ────────────────
// Mostra cards lado-a-lado + breakdown de regioes por margem de vitoria.
// Alimenta a decisao estrategica: onde A domina, onde B domina, zonas disputadas,
// zonas onde ninguem domina.
export function PainelComparacao({
  itens, tipo, geojsonData, distritosGeojson, nivel, onLimparTodos,
}: {
  itens: SelecionadoItem[];
  tipo: "candidatos" | "partidos";
  geojsonData: any;
  distritosGeojson?: any | null;
  nivel: NivelMapa;
  onLimparTodos: () => void;
}) {
  const prop = tipo === "candidatos"
    ? "candidato_dominante_id"
    : nivel === "brasil" ? "partido_num" : "partido_dominante_num";

  // Agregacao: quantas regioes cada item ganha, e em que nivel de margem
  const fonte = (nivel === "municipio" ? distritosGeojson : geojsonData)?.features ?? [];
  const porItem: Record<number, { domina: number; claro: number; apertado: number; total: number }> = {};
  let empate = 0, semDados = 0;
  for (const it of itens) porItem[it.id] = { domina: 0, claro: 0, apertado: 0, total: 0 };
  for (const f of fonte) {
    const id = f.properties?.[prop];
    const margem = f.properties?.margem_pct ?? 0;
    const total = f.properties?.total_selecionados ?? 0;
    if (id == null || id === -1 || total === 0) { semDados += 1; continue; }
    if (margem < 10) { empate += 1; continue; }
    const bucket = porItem[id];
    if (!bucket) continue;
    bucket.total += 1;
    if (margem >= 60)      bucket.domina += 1;
    else if (margem >= 30) bucket.claro += 1;
    else                    bucket.apertado += 1;
  }

  const totalRegioes = fonte.length;
  const labelRegiao = nivel === "brasil" ? "estados"
    : nivel === "estado" ? "municípios"
    : "bairros";

  return (
    <>
      <div className="px-3 py-2 border-b border-gray-100 bg-gradient-to-r from-brand-50 to-white flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-brand-600">Comparação</p>
          <p className="text-xs font-bold text-gray-900">
            {itens.length} {tipo === "candidatos" ? "candidatos" : "partidos"}
          </p>
        </div>
        <button
          onClick={onLimparTodos}
          className="text-[10px] px-2 py-1 rounded text-gray-500 hover:text-red-700 hover:bg-red-50 font-semibold transition-colors"
          title="Limpar comparação"
        >
          Limpar
        </button>
      </div>

      {/* Cards lado-a-lado dos selecionados */}
      <div className="px-3 py-3 border-b border-gray-100 grid grid-cols-2 gap-2">
        {itens.slice(0, 4).map(it => {
          const stats = porItem[it.id] ?? { domina: 0, claro: 0, apertado: 0, total: 0 };
          return (
            <div
              key={it.id}
              className="p-2 rounded-lg border"
              style={{ borderColor: it.cor, background: `${it.cor}0D` }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: it.cor }} />
                <span className="text-[11px] font-bold text-gray-900 truncate">{it.nome}</span>
              </div>
              <p className="text-[9px] uppercase text-gray-500 tracking-wide">Ganha em</p>
              <p className="text-lg font-black tabular-nums text-gray-900 leading-none">{stats.total}</p>
              <p className="text-[10px] text-gray-500">de {totalRegioes} {labelRegiao}</p>
            </div>
          );
        })}
        {itens.length > 4 && (
          <p className="col-span-2 text-[10px] text-gray-400 italic text-center">
            + {itens.length - 4} mais ao comparar
          </p>
        )}
      </div>

      {/* Breakdown por margem */}
      <div className="px-3 py-3 flex-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-2">
          Como se distribuem
        </p>
        <div className="space-y-1.5">
          <LinhaBreakdown label="Domina (margem >60%)"   total={itens.reduce((a,it)=>a+(porItem[it.id]?.domina ?? 0),0)} cor="bg-emerald-500"  totalRegioes={totalRegioes} />
          <LinhaBreakdown label="Vitória clara (30–60%)" total={itens.reduce((a,it)=>a+(porItem[it.id]?.claro ?? 0),0)}  cor="bg-blue-500"     totalRegioes={totalRegioes} />
          <LinhaBreakdown label="Disputa apertada (10–30%)" total={itens.reduce((a,it)=>a+(porItem[it.id]?.apertado ?? 0),0)} cor="bg-amber-500" totalRegioes={totalRegioes} />
          <LinhaBreakdown label="Ninguém domina (<10%)"  total={empate}   cor="bg-gray-400"     totalRegioes={totalRegioes} />
          <LinhaBreakdown label="Sem dados"              total={semDados} cor="bg-gray-200"     totalRegioes={totalRegioes} mute />
        </div>

        <p className="text-[10px] text-gray-500 italic leading-relaxed mt-4 border-t border-gray-100 pt-3">
          Intensidade da cor no mapa mostra a margem de vitória.
          Regiões cinzas = ninguém dos selecionados domina.
        </p>
      </div>
    </>
  );
}

function LinhaBreakdown({ label, total, cor, totalRegioes, mute }: {
  label: string; total: number; cor: string; totalRegioes: number; mute?: boolean;
}) {
  const pct = totalRegioes > 0 ? (total / totalRegioes) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-0.5">
        <span className={`text-[11px] ${mute ? "text-gray-400" : "text-gray-700 font-semibold"}`}>{label}</span>
        <span className={`text-[11px] tabular-nums ${mute ? "text-gray-400" : "text-gray-900 font-black"}`}>{total}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
