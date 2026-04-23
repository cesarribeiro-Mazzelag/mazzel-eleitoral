"use client";

import { useEffect, useState } from "react";
import { X, BarChart2 } from "lucide-react";
import type { SelecionadoItem } from "@/lib/types";
import { API_BASE } from "@/lib/api/base";
import { LogoPartido } from "@/components/shared/LogoPartido";
import type { PartidoItem } from "../types";
import { corPartido } from "../utils";

const API = API_BASE;

// ── Painel flutuante de seleção de partido (logo chips) ──────────────────────
export function PainelPartidos({
  selecionados,
  onTogglePartido,
  onFechar,
}: {
  selecionados: SelecionadoItem[];
  onTogglePartido: (numero: number, sigla: string) => void;
  onFechar: () => void;
}) {
  const [partidos, setPartidos] = useState<PartidoItem[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch(`${API}/mapa/partidos`, {
      headers: { Authorization: `Bearer ${typeof window !== "undefined" ? (localStorage.getItem("ub_token") ?? "") : ""}` },
    })
      .then(r => r.json())
      .then((data: PartidoItem[]) => Array.isArray(data) && setPartidos(data.sort((a, b) => b.total_eleitos - a.total_eleitos)))
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, []);

  const partidosSel = selecionados.filter(s => s.tipo === "partido");
  const filtrados = partidos.filter(p =>
    !busca ||
    p.sigla.toLowerCase().includes(busca.toLowerCase()) ||
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    String(p.numero).includes(busca)
  );

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
         style={{ width: 360, maxHeight: "70vh" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0"
           style={{ background: "linear-gradient(135deg, #1E0A3C, #3B0764)" }}>
        <div>
          <p className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">Filtro</p>
          <h3 className="text-sm font-bold text-white">
            Partidos {partidosSel.length > 0 && `(${partidosSel.length} selecionados)`}
          </h3>
        </div>
        <button onClick={onFechar} className="p-1 text-white/50 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Chips de selecionados */}
      {partidosSel.length > 0 && (
        <div className="px-3 pt-2 pb-1 flex-shrink-0 flex flex-wrap gap-1">
          {partidosSel.map(s => (
            <div
              key={s.id}
              className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-white text-[10px] font-bold"
              style={{ backgroundColor: s.cor }}
            >
              {s.nome}
              <button onClick={() => onTogglePartido(s.id, s.nome)} className="hover:opacity-70">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Todos os partidos (reset) */}
      <div className="px-3 pt-2 pb-1 flex-shrink-0">
        <button
          onClick={() => selecionados.filter(s => s.tipo === "partido").forEach(s => onTogglePartido(s.id, s.nome))}
          disabled={partidosSel.length === 0}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
            partidosSel.length === 0
              ? "bg-brand-900 border-brand-700 text-white"
              : "bg-gray-50 border-gray-200 hover:border-brand-300 text-gray-700"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-brand-800 flex items-center justify-center flex-shrink-0">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-bold ${partidosSel.length === 0 ? "text-white" : "text-gray-800"}`}>
              Todos os partidos
            </p>
            <p className={`text-[10px] ${partidosSel.length === 0 ? "text-brand-300" : "text-gray-400"}`}>
              {partidosSel.length === 0 ? "Mapa por partido dominante" : "Clique para limpar filtros"}
            </p>
          </div>
          {partidosSel.length === 0 && (
            <span className="text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">ativo</span>
          )}
        </button>
      </div>

      {/* Busca */}
      <div className="px-3 pb-2 flex-shrink-0">
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar partido... (selecione 2+ para comparar)"
          className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>

      {/* Grid de logos - 3 colunas, ordenado por relevancia */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {carregando ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filtrados.map(p => {
              const selItem = partidosSel.find(s => s.id === p.numero);
              const ativo = !!selItem;
              const cor = ativo ? selItem!.cor : corPartido(p.numero);
              return (
                <button
                  key={p.numero}
                  onClick={() => onTogglePartido(p.numero, p.sigla)}
                  title={`${p.sigla} - ${p.nome} - ${p.total_eleitos.toLocaleString("pt-BR")} eleitos`}
                  className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                    ativo
                      ? "shadow-lg ring-2 ring-offset-1 bg-white"
                      : "hover:bg-gray-50 hover:shadow-sm bg-transparent"
                  }`}
                  style={ativo ? { ringColor: cor } as any : {}}
                >
                  {ativo && (
                    <div className="absolute inset-0 rounded-xl border-2 pointer-events-none"
                         style={{ borderColor: cor }} />
                  )}
                  <LogoPartido
                    sigla={p.sigla}
                    logoUrl={p.logo_url}
                    cor={cor}
                    size={48}
                  />
                  <div className="text-center w-full">
                    <p className="text-[10px] font-bold text-gray-800 truncate">{p.sigla}</p>
                    <p className="text-[8px] text-gray-400">{p.total_eleitos.toLocaleString("pt-BR")} el.</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
