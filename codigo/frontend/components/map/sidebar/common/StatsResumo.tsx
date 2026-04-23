"use client";

// ── Stats resumo no topo ────────────────────────────────────────────────────

export function StatsResumo({ label, stats }: {
  label?: string;
  stats: Array<{ titulo: string; valor: string; cor?: string }>;
}) {
  // Inline denso (1 linha): valor em destaque + label minúsculo ao lado.
  // Hierarquia tipográfica faz a leitura — não precisa de label vertical acima.
  return (
    <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3 flex-wrap">
      {label && (
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
          {label}
        </span>
      )}
      {stats.map(s => (
        <div key={s.titulo} className="flex items-baseline gap-1 min-w-0">
          <span className={`text-[13px] font-bold tabular-nums leading-none ${s.cor ?? "text-gray-900"}`}>
            {s.valor}
          </span>
          <span className="text-[10px] text-gray-500 leading-none truncate">
            {s.titulo.toLowerCase()}
          </span>
        </div>
      ))}
    </div>
  );
}
