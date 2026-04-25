"use client";
/**
 * PoliticosContent - grid/lista de candidatos FIFA com filtros.
 * Migração Radar → Dossiê: quando renderizado em /mazzel-preview/dossies,
 * esconde o RadarHeader e navega pra rota de dossiê da plataforma nova.
 *
 * Props:
 *   hrefBase: prefixo da rota do dossiê individual
 *     ex: "/radar/politicos" (antiga) | "/mazzel-preview/dossies" (nova)
 *   mostrarHeader: exibe o RadarHeader (true default, false em /mazzel-preview/dossies)
 */
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RadarHeader } from "@/components/radar/RadarHeader";
import { CardPolitico } from "@/components/radar/CardPolitico";
import { FiltrosFUT, BarraBreakdownTiers } from "@/components/radar/FiltrosFUT";
import { useDebounce } from "@/hooks/useDebounce";
import { ChevronLeft, ChevronRight, Loader2, Crown } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
function tkn() { if (typeof window === "undefined") return ""; return localStorage.getItem("ub_token") ?? ""; }
const fmt = (n) => (n == null ? "-" : Number(n).toLocaleString("pt-BR"));

const FILTROS_PADRAO = { cargo: "", estado_uf: "", ano: "", tier: "", trait: "", busca: "", ordenar_por: "overall_desc", pagina: 1 };

const TIER_COR = {
  dourado: { bg: "bg-yellow-100 text-yellow-900 border-yellow-400" },
  ouro:    { bg: "bg-amber-100 text-amber-900 border-amber-400" },
  prata:   { bg: "bg-gray-100 text-gray-800 border-gray-400" },
  bronze:  { bg: "bg-orange-100 text-orange-900 border-orange-400" },
};

function LinhaPolitico({ politico, onAbrir }) {
  const tier = TIER_COR[politico.tier] || TIER_COR.bronze;
  const localidade = politico.municipio_nome ? `${politico.municipio_nome}/${politico.estado_uf}` : politico.estado_uf;
  return (
    <button onClick={() => onAbrir(politico.candidato_id)} className="w-full grid grid-cols-[auto_auto_1fr_auto_auto_auto] items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-brand-300 hover:shadow-sm transition-all text-left">
      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border ${tier.bg} font-black text-base tabular-nums`} style={{ fontFamily: "Georgia, serif" }}>{politico.overall ?? "-"}</span>
      {politico.eleito && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{politico.nome}</p>
        <p className="text-[10px] text-gray-500 truncate">{politico.cargo} · {localidade} · {politico.ano}</p>
      </div>
      {politico.partido_sigla && <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: politico.partido_cor || "#94A3B8" }}>{politico.partido_sigla}</span>}
      <span className="text-xs font-bold text-gray-700 tabular-nums">{fmt(politico.votos_melhor_turno ?? politico.votos_total)}</span>
      <div className="flex gap-0.5">
        {(politico.traits || []).slice(0, 3).map(t => {
          const map = { LEGEND: "⭐", CAMPEAO: "🏆", FERA: "🔥", COMEBACK: "🔄", ESTREANTE: "🌱" };
          return map[t] ? <span key={t}>{map[t]}</span> : null;
        })}
      </div>
    </button>
  );
}

export function PoliticosContent({ hrefBase = "/radar/politicos", mostrarHeader = true }) {
  const router = useRouter();
  const [filtros, setFiltros] = useState(FILTROS_PADRAO);
  const [vista, setVista] = useState("grid");
  const [resposta, setResposta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const abrirDossie = (id) => router.push(`${hrefBase}/${id}`);
  const buscaDebounced = useDebounce(filtros.busca, 300);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filtros.cargo)     params.set("cargo", filtros.cargo);
    if (filtros.estado_uf) params.set("estado_uf", filtros.estado_uf);
    if (filtros.ano)       params.set("ano", filtros.ano);
    if (filtros.tier)      params.set("tier", filtros.tier);
    if (filtros.trait)     params.set("trait", filtros.trait);
    if (buscaDebounced && buscaDebounced.length >= 2) params.set("busca", buscaDebounced);
    if (filtros.ordenar_por) params.set("ordenar_por", filtros.ordenar_por);
    params.set("pagina", String(filtros.pagina || 1));
    params.set("por_pagina", "30");
    return params.toString();
  }, [filtros.cargo, filtros.estado_uf, filtros.ano, filtros.tier, filtros.trait, buscaDebounced, filtros.ordenar_por, filtros.pagina]);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true); setErro(null);
    fetch(`${API}/radar/politicos?${queryString}`, { headers: { Authorization: `Bearer ${tkn()}` } })
      .then(async (r) => { if (!r.ok) throw new Error(`Erro ${r.status}`); return r.json(); })
      .then((j) => { if (!cancelado) setResposta(j); })
      .catch((e) => { if (!cancelado) setErro(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [queryString]);

  const totalPaginas = resposta ? Math.max(1, Math.ceil(resposta.total / resposta.por_pagina)) : 1;
  const contadoresPorTier = useMemo(() => {
    if (!resposta?.items) return null;
    const c = { dourado: 0, ouro: 0, prata: 0, bronze: 0 };
    for (const p of resposta.items) if (p.tier) c[p.tier] = (c[p.tier] || 0) + 1;
    return c;
  }, [resposta]);
  const temFiltros = filtros.tier || filtros.trait || filtros.cargo || filtros.estado_uf || filtros.ano || filtros.busca;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {mostrarHeader && <RadarHeader />}

      <FiltrosFUT filtros={filtros} onChange={setFiltros} contadoresPorTier={contadoresPorTier} vista={vista} onMudarVista={setVista} />

      {resposta && !carregando && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              <span className="font-black text-gray-900 tabular-nums">{fmt(resposta.total)}</span>{" "}
              político{resposta.total === 1 ? "" : "s"}{temFiltros ? " encontrado" : " no total"}{resposta.total === 1 ? "" : "s"}
            </p>
          </div>
          <BarraBreakdownTiers total={resposta.total} contadores={contadoresPorTier} />
        </div>
      )}

      {carregando && <div className="card p-12 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>}
      {erro && !carregando && <div className="card p-6 text-center text-red-600 text-sm">Erro ao carregar políticos: {erro}</div>}

      {!carregando && !erro && resposta?.items?.length > 0 && vista === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {resposta.items.map((p) => (<CardPolitico key={p.candidatura_id} politico={p} onAbrirDossie={abrirDossie} />))}
        </div>
      )}

      {!carregando && !erro && resposta?.items?.length > 0 && vista === "lista" && (
        <div className="space-y-1.5">
          {resposta.items.map((p) => (<LinhaPolitico key={p.candidatura_id} politico={p} onAbrir={abrirDossie} />))}
        </div>
      )}

      {!carregando && !erro && resposta?.items?.length === 0 && (
        <div className="card p-10 text-center text-gray-500 text-sm">Nenhum político encontrado com os filtros atuais.</div>
      )}

      {resposta && totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">Página {resposta.pagina} de {totalPaginas}</p>
          <div className="flex items-center gap-2">
            <button disabled={resposta.pagina <= 1} onClick={() => setFiltros({ ...filtros, pagina: filtros.pagina - 1 })} className="btn-outline text-xs flex items-center gap-1 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" />Anterior</button>
            <button disabled={resposta.pagina >= totalPaginas} onClick={() => setFiltros({ ...filtros, pagina: filtros.pagina + 1 })} className="btn-outline text-xs flex items-center gap-1 disabled:opacity-30">Próxima<ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
