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

async function fetchCoordenadores() {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const resp = await fetch(`${API_BASE}/coordenadores`, { headers, credentials: "include" });
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

const MOCK_COORDENADORES = [
  { id: 1, nome: "Ana Lima",     estado_uf: "SP", total_municipios: 48, municipios_com_eleito: 32, total_votos: 184200, cor_hex: "#2563EB" },
  { id: 2, nome: "Carlos Mota",  estado_uf: "MG", total_municipios: 55, municipios_com_eleito: 28, total_votos: 142000, cor_hex: "#7C3AED" },
  { id: 3, nome: "Vera Santos",  estado_uf: "BA", total_municipios: 41, municipios_com_eleito: 19, total_votos:  98400, cor_hex: "#059669" },
  { id: 4, nome: "Paulo Rocha",  estado_uf: "RJ", total_municipios: 36, municipios_com_eleito: 22, total_votos: 121000, cor_hex: "#D97706" },
  { id: 5, nome: "Lia Ferreira", estado_uf: "RS", total_municipios: 44, municipios_com_eleito: 31, total_votos: 165500, cor_hex: "#DC2626" },
];

function CoordenadoresContent() {
  const [sort, setSort] = useState("municipios");
  const { data, error, isLoading } = useSWR("/coordenadores", fetchCoordenadores, {
    revalidateOnFocus: false, shouldRetryOnError: false,
  });

  const isMock = !isLoading && (!!error || !data || !data.coordenadores?.length);
  const fonte = isMock ? MOCK_COORDENADORES : (data?.coordenadores ?? []);

  const sorted = [...fonte].sort((a, b) =>
    sort === "municipios"  ? b.total_municipios - a.total_municipios
    : sort === "eleitos"   ? b.municipios_com_eleito - a.municipios_com_eleito
    : sort === "votos"     ? b.total_votos - a.total_votos
    : a.estado_uf.localeCompare(b.estado_uf)
  );

  const totalMunicipios = sorted.reduce((s, c) => s + (c.total_municipios ?? 0), 0);
  const totalVotos = sorted.reduce((s, c) => s + (c.total_votos ?? 0), 0);
  const mediaEleitos = sorted.length
    ? Math.round(sorted.reduce((s, c) => s + (c.municipios_com_eleito ?? 0), 0) / sorted.length)
    : 0;

  return (
    <div className="min-h-full" style={{ background: "var(--mz-bg-page)" }}>
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] mz-t-fg-dim tracking-[0.18em] uppercase font-semibold">Coordenadores</div>
            <h1 className="text-[32px] font-bold mz-t-fg-strong mt-1 leading-none">
              Coordenacao territorial
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="text-[13px] mz-t-fg-muted">
                {isLoading ? "Carregando..." : `${sorted.length} coordenadores - territorio por UF`}
              </div>
              {isMock && !isLoading && <MockBadge />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="mz-btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>
              <option value="municipios">Ordenar - Municipios</option>
              <option value="eleitos">Ordenar - Com eleito</option>
              <option value="votos">Ordenar - Votos</option>
              <option value="uf">Ordenar - UF</option>
            </select>
            <button className="mz-btn-primary flex items-center gap-1.5">
              <Plus size={13} />Novo coordenador
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { l: "Coordenadores ativos", v: String(sorted.length) },
            { l: "Municipios cobertos",  v: totalMunicipios.toLocaleString("pt-BR") },
            { l: "Total de votos",       v: totalVotos.toLocaleString("pt-BR") },
            { l: "Media munic. c/ eleito", v: String(mediaEleitos) },
          ].map(k => (
            <div key={k.l} className="mz-kpi-card mz-ring-soft">
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.l}</div>
              <div className="text-[32px] font-bold mz-tnum mt-1 mz-t-fg-strong">{k.v}</div>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
          <div className="grid grid-cols-[60px_2fr_80px_1fr_1fr_100px] gap-3 px-5 py-2.5 text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold border-b"
            style={{ borderColor: "var(--mz-rule)", background: "var(--mz-bg-card-2)" }}>
            <div>UF</div><div>Coordenador</div><div>Munic.</div><div>Com eleito</div><div>Votos</div><div></div>
          </div>
          {sorted.map((c, i) => (
            <div key={c.id} className="grid grid-cols-[60px_2fr_80px_1fr_1fr_100px] gap-3 px-5 py-3 items-center text-[12px] border-b last:border-0"
              style={{ borderColor: "var(--mz-rule)" }}>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.cor_hex || "var(--mz-fg-dim)" }}/>
                <span className="mz-tnum font-bold mz-t-fg-strong">{c.estado_uf}</span>
              </div>
              <div>
                <div className="font-semibold mz-t-fg-strong">{c.nome}</div>
                <div className="text-[10.5px] mz-t-fg-dim">Coord. Regional - {c.estado_uf}</div>
              </div>
              <div className="mz-tnum mz-t-fg">{c.total_municipios}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-sm overflow-hidden" style={{ background: "var(--mz-rule)" }}>
                  <div style={{
                    width: `${c.total_municipios > 0 ? (c.municipios_com_eleito / c.total_municipios) * 100 : 0}%`,
                    height: "100%",
                    background: "var(--mz-ok, #34d399)"
                  }}/>
                </div>
                <div className="mz-tnum font-bold mz-t-fg-strong w-6 text-right">{c.municipios_com_eleito}</div>
              </div>
              <div className="mz-tnum mz-t-fg">{(c.total_votos ?? 0).toLocaleString("pt-BR")}</div>
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

export default function CoordenadoresPage() {
  return (
    <MazzelLayout activeModule="coordenadores" breadcrumbs={["Uniao Brasil", "Coordenadores"]} alertCount={12}>
      <CoordenadoresContent />
    </MazzelLayout>
  );
}
