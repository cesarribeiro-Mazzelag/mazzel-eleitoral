"use client";

/**
 * /radar/partidos - listagem de partidos como cartas FIFA (times).
 */
import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RadarHeader } from "@/components/radar/RadarHeader";
import { CardPartido } from "@/components/radar/CardPartido";
import { Loader2, Search } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

function tkn() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ub_token") ?? "";
}

const fmt = (n) => (n == null ? "-" : Number(n).toLocaleString("pt-BR"));

const ANOS = [2024, 2022, 2020, 2018];
const ORDENACOES = [
  { value: "votos_total",          label: "Votos" },
  { value: "presenca_territorial", label: "Presença" },
  { value: "variacao_inter_ciclo", label: "Crescimento" },
  { value: "sigla",                label: "Sigla A-Z" },
];

const TIERS = [
  { key: "dourado", label: "Dourado", color: "#f4d03f" },
  { key: "ouro",    label: "Ouro",    color: "#fbbf24" },
  { key: "prata",   label: "Prata",   color: "#9ca3af" },
  { key: "bronze",  label: "Bronze",  color: "#d97706" },
];

function Chip({ ativo, onClick, children, cor, compacto }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all whitespace-nowrap",
        ativo
          ? "bg-gray-900 text-white border-gray-900 shadow-sm"
          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50",
        compacto ? "px-2 py-0.5 text-[10px]" : "",
      ].join(" ")}
    >
      {cor && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cor }} />}
      {children}
    </button>
  );
}

export default function RadarPartidosPage() {
  const [ano, setAno] = useState(2024);
  const [ordenarPor, setOrdenarPor] = useState("votos_total");
  const [busca, setBusca] = useState("");
  const [tierFiltro, setTierFiltro] = useState("");
  const [resposta, setResposta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("ano", String(ano));
    p.set("ordenar_por", ordenarPor);
    if (busca.length >= 2) p.set("busca", busca);
    p.set("por_pagina", "30");
    return p.toString();
  }, [ano, ordenarPor, busca]);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    fetch(`${API}/radar/partidos?${queryString}`, {
      headers: { Authorization: `Bearer ${tkn()}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Erro ${r.status}`);
        return r.json();
      })
      .then((j) => { if (!cancelado) setResposta(j); })
      .catch((e) => { if (!cancelado) setErro(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [queryString]);

  // Filtro por tier em memoria (backend ainda nao suporta)
  const itensFiltrados = useMemo(() => {
    if (!resposta?.items) return [];
    if (!tierFiltro) return resposta.items;
    return resposta.items.filter(p => p.fifa?.tier === tierFiltro);
  }, [resposta, tierFiltro]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4">
        <RadarHeader />

        {/* Filtros FUT */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
          {/* Busca + ordenacao */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por sigla ou nome do partido..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-gray-400 font-bold uppercase">Ordenar:</span>
              {ORDENACOES.map(o => (
                <Chip key={o.value} ativo={ordenarPor === o.value} onClick={() => setOrdenarPor(o.value)} compacto>
                  {o.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Tier */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tier</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {TIERS.map(t => (
                <Chip
                  key={t.key}
                  ativo={tierFiltro === t.key}
                  onClick={() => setTierFiltro(tierFiltro === t.key ? "" : t.key)}
                  cor={t.color}
                >
                  {t.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Ano */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ano de referência</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ANOS.map(a => (
                <Chip key={a} ativo={ano === a} onClick={() => setAno(a)} compacto>
                  {a}
                </Chip>
              ))}
            </div>
          </div>

          {(tierFiltro || busca) && (
            <div className="flex items-center justify-end pt-1 border-t border-gray-100">
              <button
                onClick={() => { setTierFiltro(""); setBusca(""); }}
                className="text-[11px] text-gray-500 hover:text-gray-900 font-semibold"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>

        {/* Contador */}
        {resposta && !carregando && (
          <p className="text-sm text-gray-700">
            <span className="font-black text-gray-900 tabular-nums">{fmt(itensFiltrados.length)}</span>
            {" "}partido{itensFiltrados.length === 1 ? "" : "s"}
            {tierFiltro ? ` no tier ${tierFiltro}` : ""}
          </p>
        )}

        {carregando && (
          <div className="card p-12 flex items-center justify-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {erro && !carregando && (
          <div className="card p-6 text-center text-red-600 text-sm">
            Erro: {erro}
          </div>
        )}

        {!carregando && !erro && itensFiltrados.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {itensFiltrados.map((p) => (
              <CardPartido key={p.partido_id} partido={p} />
            ))}
          </div>
        )}

        {!carregando && !erro && itensFiltrados.length === 0 && (
          <div className="card p-10 text-center text-gray-500 text-sm">
            Nenhum partido encontrado.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
