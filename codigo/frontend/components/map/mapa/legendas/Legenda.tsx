"use client";

import type { NivelMapa } from "@/lib/types";
import { LogoPartido } from "@/components/shared/LogoPartido";
import { CORES_FAROL, NOME_ESTADO, corPartido } from "../utils";

// ── Legenda padrão ────────────────────────────────────────────────────────────
export function Legenda({ nivel, stats, uf, modo, geojsonData, partidoNumero, onTogglePartido }: {
  nivel: NivelMapa;
  stats: { azuis: number; verdes: number; amarelos: number; vermelhos: number; total: number };
  uf?: string | null;
  modo: "eleitos" | "votos";
  geojsonData?: any;
  partidoNumero: number | null;
  onTogglePartido?: (numero: number, sigla: string) => void;
}) {
  // Modo todos os partidos: mostra top partidos por eleitos com logo + clicável.
  // Cor no mapa pode confundir (partidos com paletas similares); logo e sigla
  // dão identificação inequívoca. Clicar filtra o mapa para aquele partido.
  if (partidoNumero === null && modo === "eleitos" && geojsonData) {
    const counts: Record<string, { num: number; sigla: string; count: number }> = {};
    for (const f of geojsonData.features ?? []) {
      const num = f.properties?.partido_num;
      const sigla = f.properties?.partido_sigla;
      if (num && num > 0) {
        const k = String(num);
        if (!counts[k]) counts[k] = { num, sigla, count: 0 };
        counts[k].count += 1;
      }
    }
    const top = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 6);
    const semPartido = (geojsonData.features ?? []).filter((f: any) => !f.properties?.partido_num || f.properties.partido_num === 0).length;
    return (
      <div className="absolute bottom-8 left-4 z-10 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-w-[210px]">
        <div className="px-3 py-2 border-b border-gray-100" style={{ background: "linear-gradient(135deg,#1E0A3C,#3B0764)" }}>
          <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Partido Dominante</p>
          <p className="text-[9px] text-purple-200/80 mt-0.5">Clique para filtrar o mapa</p>
        </div>
        <div className="px-2 py-2 space-y-0.5">
          {top.map(({ num, sigla, count }) => (
            <button
              key={num}
              onClick={() => onTogglePartido?.(num, sigla)}
              className="w-full flex items-center gap-2 py-1 px-1.5 rounded-md hover:bg-gray-50 transition-colors text-left"
            >
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border border-white shadow-sm"
                style={{ backgroundColor: corPartido(num) }}
              />
              <LogoPartido sigla={sigla} cor={corPartido(num)} size={22} />
              <span className="text-gray-800 text-xs font-bold flex-1 truncate">{sigla}</span>
              <span className="text-xs font-bold text-gray-600 tabular-nums">{count}</span>
            </button>
          ))}
          {semPartido > 0 && (
            <div className="flex items-center gap-2 py-1 px-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-gray-200 flex-shrink-0" />
              <div className="w-[22px] h-[22px] rounded-md bg-gray-100 flex-shrink-0" />
              <span className="text-gray-400 text-xs flex-1">Sem dados</span>
              <span className="text-xs text-gray-400 tabular-nums">{semPartido}</span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-1.5 mt-1.5 px-1.5 text-[10px] text-gray-400">
            {stats.total.toLocaleString("pt-BR")} {nivel === "brasil" ? "estados" : "municípios"}
          </div>
        </div>
      </div>
    );
  }

  const itens = modo === "votos"
    ? [
        { cor: CORES_FAROL.AZUL,     label: "Base muito forte", count: stats.azuis,     desc: "≥ média + 1σ" },
        { cor: CORES_FAROL.VERDE,    label: "Base sólida",      count: stats.verdes,    desc: "Acima da média" },
        { cor: CORES_FAROL.AMARELO,  label: "Presença pequena", count: stats.amarelos,  desc: "Abaixo da média" },
        { cor: CORES_FAROL.VERMELHO, label: "Sem presença",     count: stats.vermelhos, desc: "Sem votos" },
      ]
    : [
        { cor: CORES_FAROL.AZUL,     label: "Domina",   count: stats.azuis,     desc: "≥30% da câmara" },
        { cor: CORES_FAROL.VERDE,    label: "Forte",    count: stats.verdes,    desc: "15-29% da câmara" },
        { cor: CORES_FAROL.AMARELO,  label: "Presente", count: stats.amarelos,  desc: "Pouca voz" },
        { cor: CORES_FAROL.VERMELHO, label: "Ausente",  count: stats.vermelhos, desc: "Sem vereador" },
      ];
  const tituloLegenda = modo === "votos" ? "Força de Voto" : "Presença do Partido";
  return (
    <div className="absolute bottom-8 left-4 z-10 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-w-[200px]">
      <div className="px-3 py-2 border-b border-gray-100" style={{ background: "linear-gradient(135deg,#1E0A3C,#3B0764)" }}>
        <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{tituloLegenda}</p>
      </div>
      <div className="px-3 py-2.5 space-y-0.5">
        {itens.map(({ cor, label, count, desc }) => (
          <div key={label} className="flex items-center justify-between gap-3 py-0.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: cor }} />
              <div>
                <span className="text-gray-800 text-xs font-semibold">{label}</span>
                <span className="text-gray-400 text-[10px] block">{desc}</span>
              </div>
            </div>
            <span className="text-xs font-bold text-gray-700">{count.toLocaleString("pt-BR")}</span>
          </div>
        ))}
        <div className="border-t border-gray-100 pt-1.5 mt-1.5 text-[10px] text-gray-400">
          {stats.total.toLocaleString("pt-BR")}{" "}
          {nivel === "brasil" ? "estados" : `municípios${uf ? ` - ${NOME_ESTADO[uf] ?? uf}` : ""}`}
        </div>
      </div>
    </div>
  );
}
