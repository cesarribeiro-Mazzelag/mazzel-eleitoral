"use client";

/**
 * Tab "Analise" - V2.
 * KPIs nacionais + distribuicao de bancada + comparativo visual.
 * Mesmo padrao compacto das outras abas.
 */
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Building2, Users, Vote, MapPin, Loader2 } from "lucide-react";
import { LogoPartido } from "@/components/shared/LogoPartido";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
const tkn = () => (typeof window === "undefined" ? "" : localStorage.getItem("ub_token") ?? "");
const fmt = (n) => (n == null ? "-" : Number(n).toLocaleString("pt-BR"));

const CARGOS = [
  { value: "VEREADOR",          label: "Vereador" },
  { value: "PREFEITO",          label: "Prefeito" },
  { value: "DEPUTADO ESTADUAL", label: "Dep. Estadual" },
  { value: "DEPUTADO FEDERAL",  label: "Dep. Federal" },
  { value: "SENADOR",           label: "Senador" },
  { value: "GOVERNADOR",        label: "Governador" },
];

const ANOS = [2024, 2022, 2020, 2018];

const fetcher = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${tkn()}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export function TabAnalise() {
  const [cargo, setCargo] = useState("VEREADOR");
  const [ano, setAno] = useState("2024");

  const { data, isLoading } = useSWR(
    `${API}/mapa/ranking-partidos?cargo=${cargo}&ano=${ano}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const partidos = Array.isArray(data) ? data : [];
  const totalEleitos = partidos.reduce((a, p) => a + Number(p.total_eleitos || 0), 0);
  const totalVotos = partidos.reduce((a, p) => a + Number(p.total_votos || 0), 0);
  const top5 = partidos.slice(0, 5);
  const concentracaoTop5 = totalEleitos > 0
    ? (top5.reduce((a, p) => a + Number(p.total_eleitos || 0), 0) / totalEleitos) * 100
    : 0;
  const maxEleitos = Math.max(1, ...partidos.map(p => Number(p.total_eleitos || 0)));

  return (
    <div className="space-y-3">
      {/* ── Filtros ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {CARGOS.map(c => (
            <button
              key={c.value}
              onClick={() => setCargo(c.value)}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                cargo === c.value
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {c.label}
            </button>
          ))}
          <div className="h-4 w-px bg-gray-200" />
          {ANOS.map(a => (
            <button
              key={a}
              onClick={() => setAno(String(a))}
              className={`px-1.5 py-1 text-[10px] font-medium rounded-md border transition-all ${
                ano === String(a) ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── KPIs ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <Kpi icon={Building2} label="Partidos" valor={partidos.length} />
            <Kpi icon={Users} label="Eleitos" valor={fmt(totalEleitos)} />
            <Kpi icon={Vote} label="Votos" valor={fmt(totalVotos)} />
            <Kpi icon={MapPin} label="Top 5 concentra" valor={`${concentracaoTop5.toFixed(1)}%`} />
          </div>

          {/* ── Distribuicao de bancada ───────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Distribuicao de bancada - {cargo} {ano}
            </p>
            <div className="space-y-1">
              {partidos.slice(0, 15).map((p, i) => {
                const eleitos = Number(p.total_eleitos || 0);
                const pct = (eleitos / Math.max(totalEleitos, 1)) * 100;
                const barW = (eleitos / maxEleitos) * 100;
                return (
                  <div key={p.numero ?? i} className="flex items-center gap-2 group hover:bg-gray-50 rounded px-1 py-0.5 transition-colors">
                    <span className="w-3 text-[9px] text-gray-400 font-bold tabular-nums text-right">{i + 1}</span>
                    <LogoPartido sigla={p.sigla ?? "?"} logoUrl={p.logo_url} cor="#7C3AED" size={20} className="rounded" />
                    <span className="w-12 text-[11px] font-bold text-gray-700">{p.sigla}</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded flex items-center justify-end pr-1.5 transition-all duration-500"
                        style={{ width: `${Math.max(barW, 3)}%` }}
                      >
                        {barW > 15 && (
                          <span className="text-[9px] font-bold text-white tabular-nums">{fmt(eleitos)}</span>
                        )}
                      </div>
                    </div>
                    {barW <= 15 && (
                      <span className="text-[9px] text-gray-500 tabular-nums w-10 text-right">{fmt(eleitos)}</span>
                    )}
                    <span className="text-[9px] text-gray-400 tabular-nums w-10 text-right">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Top 5 partidos detalhado ──────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {top5.map((p, i) => {
              const eleitos = Number(p.total_eleitos || 0);
              const votos = Number(p.total_votos || 0);
              return (
                <div key={p.numero ?? i} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                  <LogoPartido sigla={p.sigla ?? "?"} logoUrl={p.logo_url} cor="#7C3AED" size={48} className="mx-auto" />
                  <p className="text-sm font-black text-gray-900 mt-2">{p.sigla}</p>
                  <p className="text-lg font-black text-brand-700 tabular-nums">{fmt(eleitos)}</p>
                  <p className="text-[9px] text-gray-500">eleitos</p>
                  <p className="text-[10px] text-gray-500 mt-1 tabular-nums">{fmt(votos)} votos</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, valor }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-brand-600">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-base font-black text-gray-900 tabular-nums leading-tight">{valor}</p>
      </div>
    </div>
  );
}
