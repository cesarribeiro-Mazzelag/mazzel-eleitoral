"use client";

import { useState } from "react";
import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { Plus, Info } from "lucide-react";
import useSWR from "swr";

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8002";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ub_token");
}

async function fetchLiderancas() {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const resp = await fetch(`${API_BASE}/liderancas/?por_pagina=100`, { headers, credentials: "include" });
  if (!resp.ok) throw new Error(`Erro ${resp.status}`);
  return resp.json();
}

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>
      <Info size={8} />dados de demonstracao
    </span>
  );
}

const MOCK_LIDERANCAS = [
  { id: 1, nome_completo: "Maria da Silva",   nome_politico: "Mariazinha", municipio_nome: "Sao Paulo",    estado_uf: "SP", status: "ATIVO",    score_valor: 88, score_classificacao: "A" },
  { id: 2, nome_completo: "Jose Oliveira",    nome_politico: "Ze Beto",    municipio_nome: "Campinas",     estado_uf: "SP", status: "ATIVO",    score_valor: 72, score_classificacao: "B" },
  { id: 3, nome_completo: "Ana Paula Rocha",  nome_politico: "Ana Paula",  municipio_nome: "Salvador",     estado_uf: "BA", status: "ATIVO",    score_valor: 65, score_classificacao: "C" },
  { id: 4, nome_completo: "Raimundo Nonato",  nome_politico: "Raimundo",   municipio_nome: "Fortaleza",    estado_uf: "CE", status: "INATIVO",  score_valor: 40, score_classificacao: "D" },
  { id: 5, nome_completo: "Sandra Freitas",   nome_politico: "Sandra",     municipio_nome: "Porto Alegre", estado_uf: "RS", status: "ATIVO",    score_valor: 91, score_classificacao: "A" },
];

function adaptarLideranca(l) {
  return {
    id: l.id,
    nome_completo: l.nome_completo,
    nome_politico: l.nome_politico,
    municipio_nome: l.municipio_nome || "-",
    estado_uf: "-",
    status: l.status,
    score_valor: l.score_valor ?? 0,
    score_classificacao: l.score_classificacao ?? "?",
  };
}

function LiderancasContent() {
  const [sort, setSort] = useState("score");
  const { data, error, isLoading } = useSWR("/liderancas", fetchLiderancas, {
    revalidateOnFocus: false, shouldRetryOnError: false,
  });

  const items = data?.items ?? data?.liderancas ?? (Array.isArray(data) ? data : []);
  const isMock = !isLoading && (!!error || !items.length);
  const fonte = isMock ? MOCK_LIDERANCAS : items.map(adaptarLideranca);

  const sorted = [...fonte].sort((a, b) =>
    sort === "score" ? b.score_valor - a.score_valor
    : a.nome_completo.localeCompare(b.nome_completo)
  );

  const totalAtivos = sorted.filter(l => l.status === "ATIVO").length;
  const mediaScore = sorted.length
    ? Math.round(sorted.reduce((s, l) => s + (l.score_valor ?? 0), 0) / sorted.length)
    : 0;

  const scoreCls = (v) => v >= 80 ? "mz-chip-green" : v >= 60 ? "mz-chip-blue" : v >= 40 ? "mz-chip-amber" : "mz-chip-red";

  return (
    <div className="min-h-full" style={{ background: "var(--mz-bg-page)" }}>
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] mz-t-fg-dim tracking-[0.18em] uppercase font-semibold">Liderancas</div>
            <h1 className="text-[32px] font-bold mz-t-fg-strong mt-1 leading-none">
              Liderancas locais
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="text-[13px] mz-t-fg-muted">
                {isLoading ? "Carregando..." : `${sorted.length} liderancas - atuacao nos municipios`}
              </div>
              {isMock && !isLoading && <MockBadge />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="mz-btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>
              <option value="score">Ordenar - Score</option>
              <option value="nome">Ordenar - Nome</option>
            </select>
            <button className="mz-btn-primary flex items-center gap-1.5">
              <Plus size={13} />Nova lideranca
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { l: "Total liderancas",  v: String(sorted.length) },
            { l: "Ativos",            v: String(totalAtivos) },
            { l: "Inativos",          v: String(sorted.length - totalAtivos) },
            { l: "Score medio",       v: String(mediaScore) },
          ].map(k => (
            <div key={k.l} className="mz-kpi-card mz-ring-soft">
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.l}</div>
              <div className="text-[32px] font-bold mz-tnum mt-1 mz-t-fg-strong">{k.v}</div>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
          <div className="grid grid-cols-[2fr_1fr_1fr_100px_80px_100px] gap-3 px-5 py-2.5 text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold border-b"
            style={{ borderColor: "var(--mz-rule)", background: "var(--mz-bg-card-2)" }}>
            <div>Lideranca</div><div>Municipio</div><div>UF</div><div>Score</div><div>Status</div><div></div>
          </div>
          {sorted.map((l, i) => (
            <div key={l.id} className="grid grid-cols-[2fr_1fr_1fr_100px_80px_100px] gap-3 px-5 py-3 items-center text-[12px] border-b last:border-0"
              style={{ borderColor: "var(--mz-rule)" }}>
              <div>
                <div className="font-semibold mz-t-fg-strong">{l.nome_completo}</div>
                {l.nome_politico && l.nome_politico !== l.nome_completo && (
                  <div className="text-[10.5px] mz-t-fg-dim">{l.nome_politico}</div>
                )}
              </div>
              <div className="mz-t-fg">{l.municipio_nome}</div>
              <div className="mz-tnum font-bold mz-t-fg-strong">{l.estado_uf}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-sm overflow-hidden" style={{ background: "var(--mz-rule)" }}>
                  <div style={{ width: `${l.score_valor}%`, height: "100%", background: "var(--mz-accent)" }}/>
                </div>
                <div className="mz-tnum font-bold mz-t-fg-strong w-8 text-right">{l.score_valor}</div>
              </div>
              <div>
                <span className={`mz-chip ${l.status === "ATIVO" ? "mz-chip-green" : "mz-chip-muted"}`} style={{ height: 20 }}>
                  {l.status === "ATIVO" ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="text-right">
                <button className="mz-btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }}>Ver -&gt;</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LiderancasPage() {
  return (
    <MazzelLayout activeModule="liderancas" breadcrumbs={["Uniao Brasil", "Liderancas"]} alertCount={12}>
      <LiderancasContent />
    </MazzelLayout>
  );
}
