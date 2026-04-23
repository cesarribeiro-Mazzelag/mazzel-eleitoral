"use client";

import { API_BASE } from "@/lib/api/base";

export function TooltipCandidato({ item, rotulo, destacado }: {
  item: import("@/hooks/useMunicipioTop2").Top2Item;
  rotulo: string;
  destacado?: boolean;
}) {
  const fmt = (n: number) => Number(n).toLocaleString("pt-BR");
  const iniciais = (item.nome ?? "?").split(" ").slice(0, 2).map(s => s[0]).join("").toUpperCase();
  // foto_url vem do backend como caminho relativo ("/fotos/2024/SP/FSP...jpg").
  // Precisa prefixar com API_BASE (padrão usado em BarraLateral.Avatar).
  const fotoFull = item.foto_url ? `${API_BASE}${item.foto_url}` : null;
  return (
    <div className={`px-3 py-2 border-t border-gray-100 ${destacado ? "bg-gray-50" : ""}`}>
      <p className="text-[9px] font-bold text-gray-400 tracking-widest mb-1.5">{rotulo}</p>
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white border-2 overflow-hidden bg-gray-100"
          style={{ borderColor: item.cor_hex }}
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
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-gray-900 truncate leading-tight">{item.nome}</p>
          <p className="text-[10px] leading-tight mt-0.5">
            <span className="font-semibold" style={{ color: item.cor_hex }}>{item.partido_sigla}</span>
            <span className="text-gray-500"> · {fmt(item.votos)} votos</span>
          </p>
        </div>
      </div>
    </div>
  );
}
