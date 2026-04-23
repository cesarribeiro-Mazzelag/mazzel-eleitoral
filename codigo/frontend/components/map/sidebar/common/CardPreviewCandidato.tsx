"use client";

import { useRef } from "react";
import { Info } from "lucide-react";

// ── Card individual no preview, com mecânica 2-click (igual CardPolitico) ─────
export function CardPreviewCandidato({
  item, iniciais, fotoFull, pct, fmt, fmtPct, corSelecionado, cargo, ano,
  onAtivarGradiente, onAbrirDossie,
}: {
  item: import("@/hooks/useMunicipioTop2").Top2Item;
  iniciais: string;
  fotoFull: string | null;
  pct: number | undefined;
  fmt: (n: number) => string;
  fmtPct: (n?: number | null) => string;
  corSelecionado: string | null;
  cargo: string;
  ano: number;
  onAtivarGradiente?: (id: number, nome: string, partido_num?: number, cargo?: string, ano?: number) => void;
  onAbrirDossie?: (id: number) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sel = corSelecionado !== null;

  function handleClick() {
    if (timerRef.current) {
      clearTimeout(timerRef.current); timerRef.current = null;
      onAtivarGradiente?.(item.candidato_id, item.nome, item.partido_num, cargo, ano);
    } else {
      timerRef.current = setTimeout(() => { timerRef.current = null; }, 260);
    }
  }

  return (
    <div
      onClick={onAtivarGradiente ? handleClick : undefined}
      className={`px-3 py-2.5 border-t border-gray-100 flex items-center gap-2.5 transition-colors ${
        onAtivarGradiente ? "cursor-pointer hover:bg-gray-50" : ""
      } ${sel ? "bg-brand-50 ring-2 ring-inset" : ""}`}
      style={sel ? { boxShadow: `inset 0 0 0 2px ${corSelecionado}` } : {}}
      title={onAtivarGradiente ? "2 cliques: ativa força eleitoral. Outro candidato com 2 cliques: comparação." : undefined}
    >
      <div className="relative flex-shrink-0">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-[11px] font-bold text-white border-2 overflow-hidden bg-gray-100"
          style={{ borderColor: sel && corSelecionado ? corSelecionado : item.cor_hex }}
        >
          {fotoFull ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={fotoFull} alt={item.nome} className="w-full h-full object-cover" />
          ) : (
            <span style={{ backgroundColor: item.cor_hex }} className="w-full h-full flex items-center justify-center">
              {iniciais}
            </span>
          )}
        </div>
        {item.eleito && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold bg-green-600 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
            Eleito
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[12px] font-bold text-gray-900 truncate">{item.nome}</p>
          {pct != null && (
            <span className="text-[13px] font-bold text-gray-800 flex-shrink-0">{fmtPct(pct)}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-[10px] font-semibold" style={{ color: item.cor_hex }}>
            {item.partido_sigla} · {item.partido_num}
          </span>
          <span className="text-[10px] text-gray-500">{fmt(item.votos)} votos</span>
        </div>
        {pct != null && (
          <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: item.cor_hex }}
            />
          </div>
        )}
      </div>
      {onAbrirDossie && (
        <span
          role="button"
          tabIndex={0}
          onClick={(ev) => { ev.stopPropagation(); onAbrirDossie(item.candidato_id); }}
          onKeyDown={(ev) => { if (ev.key === "Enter") { ev.stopPropagation(); onAbrirDossie(item.candidato_id); } }}
          className="p-1.5 rounded hover:bg-brand-100 text-gray-400 hover:text-brand-700 transition-colors flex-shrink-0"
          title="Abrir dossiê"
        >
          <Info className="w-3.5 h-3.5" />
        </span>
      )}
    </div>
  );
}
