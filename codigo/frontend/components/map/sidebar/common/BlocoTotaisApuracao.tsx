"use client";

import type { TotaisResponse } from "@/hooks/useTotaisApuracao";

// ── Bloco reutilizável de totais (aptos/válidos/brancos/nulos/abstenções) ────────
export function BlocoTotaisApuracao({ data }: { data: TotaisResponse | undefined }) {
  if (!data) return null;
  const t = data.totais;
  const fmt = (n: number) => Number(n).toLocaleString("pt-BR");
  const fmtPct = (n: number | null) => n == null ? "-" : `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const tem = t.validos > 0 || t.brancos > 0 || t.nulos > 0;
  if (!tem) return null;

  const linha = (label: string, valor: number | null, pct: number | null, destaque?: boolean) => {
    if (valor == null) return null;
    return (
      <div key={label} className="flex items-baseline justify-between gap-2 py-1">
        <span className={`text-[11px] ${destaque ? "font-semibold text-gray-800" : "text-gray-500"}`}>{label}</span>
        <div className="flex items-baseline gap-2">
          {pct != null && (
            <span className={`text-[11px] ${destaque ? "font-bold text-gray-800" : "text-gray-600"}`}>{fmtPct(pct)}</span>
          )}
          <span className={`text-[11px] tabular-nums ${destaque ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
            {fmt(valor)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="px-3 py-2.5 bg-gray-50 border-t border-b border-gray-100">
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-[9px] font-bold text-gray-400 tracking-widest">APURAÇÃO</p>
        {data.n_municipios > 1 && (
          <p className="text-[9px] text-gray-400">{fmt(data.n_municipios)} municípios</p>
        )}
      </div>
      <div className="divide-y divide-gray-100">
        {linha("Total de votos", t.total_votos, null, true)}
        {linha("Válidos", t.validos, t.pct_validos)}
        {linha("Brancos", t.brancos, t.pct_brancos)}
        {linha("Nulos", t.nulos, t.pct_nulos)}
        {linha("Abstenções", t.abstencoes, t.pct_abstencoes)}
        {linha("Comparecimento", t.comparecimento, t.pct_comparecimento)}
        {linha("Aptos a votar", t.aptos, null)}
      </div>
    </div>
  );
}
