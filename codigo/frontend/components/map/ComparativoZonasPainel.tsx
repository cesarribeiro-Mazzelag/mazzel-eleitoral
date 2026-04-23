"use client";

/**
 * Fase 7 — Comparativo por Zona Eleitoral (side panel Globo-like).
 * Tabela: candidato × zonas × votos × % da zona.
 */
import { X } from "lucide-react";
import { useComparativoZonas } from "@/hooks/useComparativoZonas";
import { API_BASE as API } from "@/lib/api/base";

function fmt(n: number): string {
  return Number(n).toLocaleString("pt-BR");
}
function fmtPct(n: number | undefined): string {
  if (n == null || n === 0) return "-";
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

interface Props {
  ibge: string | null;
  cargo: string | null;
  ano: number;
  turno: number;
  aberto: boolean;
  onFechar: () => void;
}

export function ComparativoZonasPainel({ ibge, cargo, ano, turno, aberto, onFechar }: Props) {
  const { data, isLoading } = useComparativoZonas(ibge, cargo, ano, turno, aberto);

  if (!aberto) return null;

  return (
    <>
      {/* Overlay sutil pra capturar clique fora */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onFechar}
        aria-label="Fechar comparativo"
      />

      {/* Side panel (à direita, sobre o mapa — NÃO sobrepõe sidebar) */}
      <aside
        className="fixed top-[52px] right-[340px] bottom-0 z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col"
        style={{ width: 640 }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gradient-to-br from-brand-50 to-white flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-brand-500 uppercase tracking-widest">
              Comparativo por Zona Eleitoral
            </p>
            <h2 className="text-base font-bold text-gray-900 truncate mt-0.5">
              {data?.municipio?.nome ?? "..."}
              {data?.municipio?.estado_uf && (
                <span className="text-gray-400 font-normal text-sm"> · {data.municipio.estado_uf}</span>
              )}
            </h2>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">
              {data?.cargo} {data?.ano} · {data?.turno}º turno
            </p>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            title="Fechar"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="p-6 text-center text-gray-400 text-sm">Carregando...</div>
          )}
          {!isLoading && data && data.candidatos.length === 0 && (
            <div className="p-6 text-center text-gray-400 text-sm">
              Sem dados de apuração para este cargo/ano.
            </div>
          )}
          {!isLoading && data && data.candidatos.length > 0 && (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-widest text-[9px]">
                    Candidato
                  </th>
                  <th className="text-right px-2 py-2.5 font-semibold text-gray-500 uppercase tracking-widest text-[9px] w-[70px]">
                    Total
                  </th>
                  {data.zonas.map((z) => (
                    <th
                      key={z.numero}
                      className="text-right px-1.5 py-2.5 font-semibold text-gray-400 text-[9px] whitespace-nowrap"
                      title={`Zona ${z.numero} — ${fmt(z.total_votos)} votos`}
                    >
                      Z{z.numero}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.candidatos.map((c) => {
                  const iniciais = (c.nome ?? "?").split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();
                  const fotoFull = c.foto_url ? `${API}${c.foto_url}` : null;
                  return (
                    <tr key={c.candidato_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white border-2 overflow-hidden bg-gray-100"
                            style={{ borderColor: c.cor_hex }}
                          >
                            {fotoFull ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={fotoFull} alt={c.nome} className="w-full h-full object-cover" />
                            ) : (
                              <span
                                style={{ backgroundColor: c.cor_hex }}
                                className="w-full h-full flex items-center justify-center"
                              >
                                {iniciais}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 truncate text-[11px]">{c.nome}</span>
                              {c.eleito && (
                                <span className="text-[8px] font-bold bg-green-600 text-white px-1 rounded">
                                  E
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] font-semibold" style={{ color: c.cor_hex }}>
                              {c.partido_sigla} · {c.partido_num}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-gray-900 tabular-nums">
                        {fmt(c.votos_total)}
                      </td>
                      {data.zonas.map((z) => {
                        const pct = c.pct_por_zona[String(z.numero)];
                        const votos = c.votos_por_zona[String(z.numero)];
                        const intensidade = pct != null ? Math.min(pct / 50, 1) : 0;
                        return (
                          <td
                            key={z.numero}
                            className="px-1.5 py-2 text-right tabular-nums"
                            style={{
                              backgroundColor:
                                intensidade > 0
                                  ? `${c.cor_hex}${Math.round(intensidade * 50 + 10)
                                      .toString(16)
                                      .padStart(2, "0")}`
                                  : undefined,
                            }}
                            title={votos ? `${fmt(votos)} votos · ${fmtPct(pct)}` : "Sem votos"}
                          >
                            <span className={pct && pct > 20 ? "font-bold text-gray-900" : "text-gray-600"}>
                              {fmtPct(pct)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer com dica */}
        <div className="flex-shrink-0 px-4 py-2 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-500 italic">
          Intensidade de cor = % da zona · hover nos cabeçalhos pra total da zona
        </div>
      </aside>
    </>
  );
}
