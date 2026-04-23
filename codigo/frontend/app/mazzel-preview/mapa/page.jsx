"use client";

import { useState, useMemo } from "react";
import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { MapPin, Filter, Download, ArrowUp, ArrowDown } from "lucide-react";
import {
  PARTY_STRENGTH, UF_LIST, UF_NAMES, partyColor, BRASIL_STATES,
} from "@/components/mazzel-data/mock";

// ── Choropleth (mesmo componente do Home) ─────────────────────────────────────

function BrasilChoropleth({ mode, onHover, onClick, highlightUf, data }) {
  function colorFor(uf) {
    if (mode === "partido") return partyColor(PARTY_STRENGTH[uf]);
    const score = data?.[uf] ?? 50;
    if (score >= 85) return "#34d399";
    if (score >= 70) return "#60a5fa";
    if (score >= 55) return "#fbbf24";
    if (score >= 40) return "#fb923c";
    return "#f87171";
  }
  return (
    <svg viewBox="50 70 620 560" className="w-full h-full">
      {BRASIL_STATES.map(s => {
        const isHi = highlightUf === s.uf;
        return (
          <g key={s.uf}
            onMouseEnter={() => onHover?.(s.uf)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onClick?.(s.uf)}
            style={{ cursor: "pointer" }}>
            <path d={s.path}
              fill={colorFor(s.uf)}
              fillOpacity={isHi ? 0.95 : 0.72}
              stroke={isHi ? "#fff" : "rgba(0,0,0,0.25)"}
              strokeWidth={isHi ? 2 : 0.6} />
            <text x={s.cx} y={s.cy + 3} textAnchor="middle"
              style={{ fontSize: 11, fill: "#0a0a0b", fontWeight: 600 }}
              pointerEvents="none">{s.uf}</text>
          </g>
        );
      })}
    </svg>
  );
}

const MAP_LAYERS = [
  { id: "partido",  label: "Partido dominante" },
  { id: "score",    label: "Score regional" },
  { id: "eleitos",  label: "Eleitos UB" },
  { id: "emendas",  label: "Emendas R$" },
  { id: "alertas",  label: "Densidade alertas" },
];

const MAP_YEARS = ["2026 (proj.)","2024","2022","2020","2018"];

// ── Map content ───────────────────────────────────────────────────────────────

function MapaContent() {
  const [layer, setLayer] = useState("partido");
  const [year, setYear] = useState("2026 (proj.)");
  const [selectedUf, setSelectedUf] = useState("SP");
  const [hoverUf, setHoverUf] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareUf, setCompareUf] = useState("MG");

  const scoreData = useMemo(() => {
    const d = {};
    UF_LIST.forEach((u, i) => { d[u] = 45 + ((u.charCodeAt(0) + u.charCodeAt(1) + i * 7) % 50); });
    return d;
  }, []);

  function ufDetail(uf) {
    return {
      uf,
      partido: PARTY_STRENGTH[uf] || "-",
      score: scoreData[uf],
      eleitos: 10 + ((uf.charCodeAt(0) + uf.charCodeAt(1)) % 40),
      senadores: ((uf.charCodeAt(0) + uf.charCodeAt(1)) % 3) + 1,
      deputados: 5 + ((uf.charCodeAt(0)) % 20),
      prefeitos: 30 + ((uf.charCodeAt(0) + uf.charCodeAt(1) * 3) % 70),
      emendas: 40 + ((uf.charCodeAt(0) + uf.charCodeAt(1)) % 160),
      alertas: (uf.charCodeAt(1) % 5),
      trend: (uf.charCodeAt(0) % 2) ? "+2,3pp" : "-0,8pp",
      top3: [
        { nome: "Jaques Wagner", partido: "PT", overall: 87 },
        { nome: "Otto Alencar", partido: "PSD", overall: 79 },
        { nome: "Angelo Coronel", partido: "PSD", overall: 75 },
      ],
    };
  }

  const det = ufDetail(selectedUf);
  const cmp = compareMode ? ufDetail(compareUf) : null;

  return (
    <div style={{ height: "calc(100vh - 48px)", position: "relative", overflow: "hidden", background: "var(--mz-bg-page)" }}>

      {/* Map canvas */}
      <div className="absolute inset-0 flex items-center justify-center p-8" style={{ paddingRight: 392, background: "var(--mz-bg-page-grad, var(--mz-bg-page))" }}>
        <div className="w-full h-full flex items-center justify-center">
          <BrasilChoropleth
            mode={layer === "score" ? "score" : "partido"}
            onHover={setHoverUf}
            onClick={(uf) => { if (compareMode) setCompareUf(uf); else setSelectedUf(uf); }}
            highlightUf={hoverUf || selectedUf}
            data={scoreData}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="absolute top-4 left-4 right-[396px] flex items-center gap-2 rounded-lg px-3 py-2 mz-ring-soft" style={{ background: "var(--mz-bg-card)" }}>
        <div className="flex items-center gap-1 pr-2 border-r" style={{ borderColor: "var(--mz-rule)" }}>
          <span className="text-[10px] mz-t-fg-dim uppercase tracking-wider px-2 font-semibold">Camada</span>
          {MAP_LAYERS.map(l => (
            <button key={l.id} onClick={() => setLayer(l.id)}
              className={`mz-btn-ghost ${layer === l.id ? "active" : ""}`} style={{ padding: "5px 9px", fontSize: 11 }}>{l.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 pr-2 border-r" style={{ borderColor: "var(--mz-rule)" }}>
          <span className="text-[10px] mz-t-fg-dim uppercase tracking-wider px-2 font-semibold">Ano</span>
          <select value={year} onChange={e => setYear(e.target.value)}
            className="mz-btn-ghost" style={{ padding: "5px 9px", fontSize: 11 }}>
            {MAP_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={() => setCompareMode(!compareMode)}
          className={`mz-btn-ghost flex items-center gap-1 ${compareMode ? "active" : ""}`} style={{ padding: "5px 10px", fontSize: 11 }}>
          <Filter size={11} /> {compareMode ? "Comparando 2 UFs" : "Comparar UFs"}
        </button>
        <button className="mz-btn-ghost flex items-center gap-1" style={{ padding: "5px 10px", fontSize: 11 }}>
          <Download size={11} /> Exportar
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 rounded-lg px-4 py-3 mz-ring-soft" style={{ background: "var(--mz-bg-card)" }}>
        <div className="text-[9.5px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-1.5">
          Legenda · {MAP_LAYERS.find(l => l.id === layer)?.label}
        </div>
        <div className="flex items-center gap-3 flex-wrap" style={{ maxWidth: 340 }}>
          {layer === "partido"
            ? ["UNIÃO BRASIL","PL","PT","PSD","MDB","PSB","REPUBLICANOS","PSDB"].map(p => (
                <div key={p} className="flex items-center gap-1.5 text-[10.5px] mz-t-fg-muted">
                  <span className="mz-party-dot" style={{ background: partyColor(p) }} />{p}
                </div>
              ))
            : [["#f87171","<40"],["#fb923c","40-55"],["#fbbf24","55-70"],["#60a5fa","70-85"],["#34d399",">=85"]].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5 text-[10.5px] mz-t-fg-muted">
                  <span className="mz-party-dot" style={{ background: c }} />{l}
                </div>
              ))
          }
        </div>
      </div>

      {/* Context panel */}
      <div className="absolute top-0 right-0 bottom-0 w-[380px] flex flex-col border-l" style={{ background: "var(--mz-bg-card)", borderColor: "var(--mz-rule)" }}>
        <div className="p-5 border-b" style={{ borderColor: "var(--mz-rule)" }}>
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={13} style={{ color: "var(--mz-tenant-primary)" }} />
            <span className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Unidade federativa</span>
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-[48px] font-bold mz-t-fg-strong leading-none mz-tnum">{selectedUf}</div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold mz-t-fg">{UF_NAMES[selectedUf] || selectedUf}</div>
              <div className="text-[11px] mz-t-fg-muted">{year}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="mz-chip mz-chip-blue flex items-center gap-1 w-fit">
              <span className="mz-party-dot" style={{ background: partyColor(det.partido) }} />
              {det.partido} dominante
            </span>
            <span className={`mz-chip ${det.trend.startsWith("+") ? "mz-chip-green" : "mz-chip-red"} flex items-center gap-1 w-fit`}>
              {det.trend.startsWith("+") ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
              {det.trend} YoY
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Score */}
          <div className="p-5 border-b" style={{ borderColor: "var(--mz-rule)" }}>
            <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-1.5">Score regional</div>
            <div className="flex items-baseline gap-2">
              <div className="text-[44px] font-bold mz-tnum mz-t-fg-strong leading-none">{det.score}</div>
              <div className="text-[14px] mz-t-fg-dim mz-tnum">/ 100</div>
              {cmp && (
                <div className="ml-auto text-right">
                  <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-wider">vs {compareUf}</div>
                  <div className="text-[22px] font-bold mz-tnum mz-t-fg-muted">{cmp.score}</div>
                </div>
              )}
            </div>
            <div className="mt-3 h-1.5 rounded-sm overflow-hidden" style={{ background: "var(--mz-rule)" }}>
              <div style={{ width: `${det.score}%`, height: "100%", background: "linear-gradient(90deg, var(--mz-tenant-primary), #60a5fa)" }} />
            </div>
          </div>

          {/* Breakdown */}
          <div className="p-5 border-b" style={{ borderColor: "var(--mz-rule)" }}>
            <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-3">Força eleitoral UB</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: "Senadores", v: det.senadores },
                { l: "Dep. fed.",  v: det.deputados },
                { l: "Prefeitos",  v: det.prefeitos },
              ].map(m => (
                <div key={m.l} className="mz-ring-soft rounded-md p-3" style={{ background: "var(--mz-bg-card-2)" }}>
                  <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider">{m.l}</div>
                  <div className="text-[22px] font-bold mz-tnum mz-t-fg-strong mt-0.5 leading-none">{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 border-b" style={{ borderColor: "var(--mz-rule)" }}>
            <div className="flex items-center justify-between">
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-wider font-semibold">Emendas 2024</div>
              <div className="mz-tnum text-[13px] font-bold mz-t-fg-strong">R$ {det.emendas}M</div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-wider font-semibold">Alertas abertos</div>
              <div className="mz-tnum text-[13px] font-bold mz-t-fg-strong">{det.alertas}</div>
            </div>
          </div>

          <div className="p-5">
            <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-3">Top 3 · políticos da UF</div>
            <div className="space-y-2">
              {det.top3.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md mz-card-hover cursor-pointer" style={{ background: "var(--mz-bg-card-2)" }}>
                  <div className="text-[11px] mz-tnum font-bold mz-t-fg-dim w-4">#{i+1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold mz-t-fg-strong truncate">{c.nome}</div>
                    <div className="flex items-center gap-1.5 text-[10.5px] mz-t-fg-dim">
                      <span className="mz-party-dot" style={{ background: partyColor(c.partido) }} />
                      {c.partido}
                    </div>
                  </div>
                  <div className="mz-tnum text-[15px] font-bold text-amber-300">{c.overall}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex gap-2" style={{ borderColor: "var(--mz-rule)" }}>
          <button className="mz-btn-primary flex-1 justify-center">Abrir dossiê da UF</button>
          <button className="mz-btn-ghost">Exportar</button>
        </div>
      </div>
    </div>
  );
}

export default function MapaPage() {
  return (
    <MazzelLayout activeModule="mapa" breadcrumbs={["União Brasil", "Mapa Eleitoral"]} alertCount={12}>
      <MapaContent />
    </MazzelLayout>
  );
}
