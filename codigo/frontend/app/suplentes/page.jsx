"use client";

/**
 * Módulo Suplentes — "O Banco de Reservas do Partido"
 *
 * Lista todos os candidatos não eleitos do partido ordenados por votos,
 * classificados por proximidade de assumir uma vaga.
 *
 * Proximidade:
 *   IMINENTE  (<200 votos de diferença) — risco real de assumir a qualquer momento
 *   PROXIMO   (200–500 votos)           — reserva ativa
 *   RELEVANTE (500–2000 votos)          — reserva estratégica
 *   RESERVA   (>2000 votos)             — banco amplo
 */

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { AlertTriangle, TrendingUp, Users, Search, ChevronRight, Vote, MapPin, Filter } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

function tkn() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ub_token") ?? "";
}

function fmt(n) {
  if (n == null) return "-";
  return Number(n).toLocaleString("pt-BR");
}

const PROXIMIDADE_CONFIG = {
  CRITICO:  { label: "Crítico",  cor: "bg-red-600",    text: "text-white",      border: "border-red-400",    desc: "Pode assumir imediatamente" },
  IMINENTE: { label: "Iminente", cor: "bg-orange-500", text: "text-white",      border: "border-orange-400", desc: "< 200 votos de diferença" },
  PROXIMO:  { label: "Próximo",  cor: "bg-yellow-500", text: "text-white",      border: "border-yellow-400", desc: "200–500 votos" },
  RELEVANTE:{ label: "Relevante",cor: "bg-blue-500",   text: "text-white",      border: "border-blue-300",   desc: "500–2000 votos" },
  RESERVA:  { label: "Reserva",  cor: "bg-gray-200",   text: "text-gray-700",   border: "border-gray-200",   desc: "> 2000 votos" },
};

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

export default function SuplentesPag() {
  const router = useRouter();
  const [dados, setDados]           = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [uf, setUf]                 = useState("");
  const [faixa, setFaixa]           = useState("todos");
  const [busca, setBusca]           = useState("");

  const abrirDossie = (id) => router.push(`/radar/politicos/${id}`);

  useEffect(() => {
    setCarregando(true);
    const params = new URLSearchParams({ cargo: "VEREADOR", ano: "2024", faixa });
    if (uf) params.set("uf", uf);
    fetch(`${API}/mapa/suplentes?${params}`, {
      headers: { Authorization: `Bearer ${tkn()}` },
    })
      .then(r => r.json())
      .then(setDados)
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, [uf, faixa]);

  const lista = useMemo(() => {
    if (!dados?.suplentes) return [];
    if (!busca.trim()) return dados.suplentes;
    const q = busca.toUpperCase();
    return dados.suplentes.filter(s =>
      s.nome.toUpperCase().includes(q) ||
      s.municipio.toUpperCase().includes(q) ||
      s.estado_uf.toUpperCase().includes(q)
    );
  }, [dados, busca]);

  const stats = dados?.stats ?? {};

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suplentes Estratégicos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Candidatos não eleitos ordenados por força de voto — banco de reservas do partido
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl">
            <AlertTriangle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            Cargos vagos por cassação, renúncia ou licença
          </div>
        </div>

        {/* KPIs de proximidade */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: "criticos",  label: "Críticos",  icon: AlertTriangle, cor: "text-red-600",    bg: "bg-red-50",    border: "border-red-100", desc: "Podem assumir já" },
            { key: "iminentes", label: "Iminentes", icon: AlertTriangle, cor: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100", desc: "< 200 votos" },
            { key: "proximos",  label: "Próximos",  icon: TrendingUp,    cor: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100", desc: "200–500 votos" },
            { key: "relevantes",label: "Relevantes",icon: Users,         cor: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100",  desc: "500–2000 votos" },
          ].map(({ key, label, icon: Icon, cor, bg, border, desc }) => (
            <button
              key={key}
              onClick={() => setFaixa(faixa === key.replace("s", "") ? "todos" : key.replace("iminentes", "proximos").replace("criticos", "proximos").replace("proximos", "proximos").replace("relevantes", "relevantes"))}
              className={`${bg} border ${border} rounded-xl p-4 text-left hover:opacity-80 transition-opacity`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${cor}`} />
                <span className={`text-xl font-bold ${cor}`}>{stats[key] ?? 0}</span>
              </div>
              <p className="text-xs font-semibold text-gray-700">{label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, município ou estado..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Estado */}
          <select
            value={uf}
            onChange={e => setUf(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos os estados</option>
            {UFS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          {/* Faixa */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { v: "todos",     l: "Todos" },
              { v: "proximos",  l: "Iminente/Próximo" },
              { v: "relevantes",l: "Relevante" },
            ].map(({ v, l }) => (
              <button
                key={v}
                onClick={() => setFaixa(v)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  faixa === v ? "bg-white shadow text-blue-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {carregando ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : lista.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-medium">Nenhum suplente encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Header da tabela */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4">Candidato</div>
              <div className="col-span-3">Município</div>
              <div className="col-span-2 text-right">Votos</div>
              <div className="col-span-2 text-center">Proximidade</div>
            </div>

            <div className="divide-y divide-gray-50">
              {lista.slice(0, 200).map((s, i) => {
                const cfg = PROXIMIDADE_CONFIG[s.proximidade] ?? PROXIMIDADE_CONFIG.RESERVA;
                return (
                  <button
                    key={s.candidatura_id}
                    onClick={() => abrirDossie(s.candidato_id)}
                    className="w-full grid grid-cols-12 gap-2 px-4 py-3 hover:bg-blue-50/50 transition-colors text-left group"
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-300">{i + 1}</span>
                    </div>

                    {/* Candidato */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      {s.foto_url ? (
                        <img
                          src={`${API}${s.foto_url}`}
                          alt={s.nome}
                          className="w-9 h-9 rounded-full object-cover border-2 border-gray-100 flex-shrink-0"
                          onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                        />
                      ) : null}
                      <div
                        style={{ display: s.foto_url ? "none" : "flex" }}
                        className="w-9 h-9 rounded-full bg-blue-100 items-center justify-center flex-shrink-0 text-sm font-bold text-blue-700"
                      >
                        {s.nome[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-800 truncate">
                          {s.nome}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {s.total_eleitos > 0
                            ? `${s.total_eleitos} eleito${s.total_eleitos > 1 ? "s" : ""} no mun.`
                            : "Sem eleitos no município"}
                        </p>
                      </div>
                    </div>

                    {/* Município */}
                    <div className="col-span-3 flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 text-gray-300 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-700 truncate">{s.municipio}</p>
                        <p className="text-[10px] text-gray-400">{s.estado_uf}</p>
                      </div>
                    </div>

                    {/* Votos */}
                    <div className="col-span-2 flex flex-col items-end justify-center">
                      <div className="flex items-center gap-1">
                        <Vote className="w-3 h-3 text-gray-300" />
                        <span className="text-sm font-bold text-gray-800">{fmt(s.votos)}</span>
                      </div>
                      {s.votos_faltando > 0 && s.votos_faltando < 9999 && (
                        <span className="text-[10px] text-gray-400">
                          -{fmt(s.votos_faltando)} p/ eleito
                        </span>
                      )}
                    </div>

                    {/* Proximidade */}
                    <div className="col-span-2 flex items-center justify-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cor} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {lista.length > 200 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400">
                Mostrando 200 de {lista.length} suplentes. Use os filtros para refinar.
              </div>
            )}
          </div>
        )}
      </div>

    </AppLayout>
  );
}
