"use client";

import { useState, useMemo } from "react";
import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import {
  Download, Sparkles, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  HOME_KPIS, HOME_ALERTS, HOME_TOP_CANDIDATOS, HOME_EMENDAS_UF, HOME_MOV_DIA, HOME_AUDIT,
  PARTY_STRENGTH, UF_LIST, partyColor, BRASIL_STATES,
} from "@/components/mazzel-data/mock";
import { useAlertas } from "@/hooks/useAlertas";
import { useRadarPoliticos } from "@/hooks/useRadar";
import { useAdminAudit } from "@/hooks/useAdmin";

// ── SVG Choropleth ────────────────────────────────────────────────────────────

function BrasilChoropleth({ mode, onHover, onClick, highlightUf, data }) {
  function colorFor(uf) {
    if (mode === "partido") {
      const p = PARTY_STRENGTH[uf];
      return partyColor(p);
    }
    const score = data?.[uf] ?? 50;
    if (score >= 85) return "#34d399";
    if (score >= 70) return "#60a5fa";
    if (score >= 55) return "#fbbf24";
    if (score >= 40) return "#fb923c";
    return "#f87171";
  }
  return (
    <svg viewBox="50 70 620 560" className="w-full h-full" style={{ maxHeight: 420 }}>
      {BRASIL_STATES.map(s => {
        const isHi = highlightUf === s.uf;
        return (
          <g key={s.uf}
            onMouseEnter={() => onHover?.(s.uf)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onClick?.(s.uf)}
            style={{ cursor: "pointer" }}>
            <path
              d={s.path}
              fill={colorFor(s.uf)}
              fillOpacity={isHi ? 0.95 : 0.72}
              stroke={isHi ? "#fff" : "rgba(0,0,0,0.25)"}
              strokeWidth={isHi ? 2 : 0.6}
            />
            <text x={s.cx} y={s.cy + 3} textAnchor="middle"
              style={{ fontSize: 11, fill: "#0a0a0b", fontWeight: 600 }}
              pointerEvents="none">{s.uf}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Dashboard content ─────────────────────────────────────────────────────────

function HomeContent() {
  const role = "presidente";
  const kpis = HOME_KPIS[role];
  const [mapMode, setMapMode] = useState("partido");
  const [hoverUf, setHoverUf] = useState(null);

  // API: alertas recentes
  const { alertas: apiAlertas, isMock: alertasMock } = useAlertas({ limit: 20 });
  // Adapta alerta da API para o formato esperado pela UI
  const GRAVIDADE_MAP = { CRITICO: "crit", ALTO: "alto", MEDIO: "med", BAIXO: "bx" };
  const alertasDisplay = alertasMock || apiAlertas.length === 0
    ? HOME_ALERTS
    : apiAlertas.map(a => ({
        id: a.id,
        sev: GRAVIDADE_MAP[a.gravidade] ?? "bx",
        tipo: a.tipo ?? "geral",
        who: a.tipo ?? "Sistema",
        uf: "BR",
        what: a.descricao ?? "",
        when: a.criado_em ? new Date(a.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—",
      }));

  // API: top candidatos por overall
  const { politicos: apiPoliticos, isMock: radarMock } = useRadarPoliticos({ ordenar_por: "overall_desc", por_pagina: 10 });
  const topCandidatos = radarMock || apiPoliticos.length === 0
    ? HOME_TOP_CANDIDATOS
    : apiPoliticos.slice(0, 10).map(p => ({
        nome: p.nome,
        partido: p.partido_sigla ?? "—",
        uf: p.estado_uf,
        cargo: p.cargo,
        overall: p.overall ?? 0,
        tier: p.tier ?? "bronze",
      }));

  // API: audit log
  const { logs: apiLogs, isMock: auditMock } = useAdminAudit({ limit: 8 });
  const auditDisplay = auditMock || apiLogs.length === 0
    ? HOME_AUDIT
    : apiLogs.map(l => ({
        who: l.usuario_id ? `Usuario #${l.usuario_id}` : "Sistema",
        what: l.acao,
        when: l.criado_em ? new Date(l.criado_em).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "—",
      }));

  const scoreData = useMemo(() => {
    const d = {};
    UF_LIST.forEach((u, i) => { d[u] = 45 + ((u.charCodeAt(0) + u.charCodeAt(1) + i * 7) % 50); });
    return d;
  }, []);

  const hoveredDetail = hoverUf ? {
    uf: hoverUf,
    partido: PARTY_STRENGTH[hoverUf] || "-",
    score: scoreData[hoverUf],
    eleitos: 10 + ((hoverUf.charCodeAt(0) + hoverUf.charCodeAt(1)) % 40),
  } : null;

  return (
    <div className="mz-bg-page-grad min-h-full" style={{ background: "var(--mz-bg-page)" }}>
      <div className="max-w-[1600px] mx-auto px-8 py-7">

        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[11px] mz-t-fg-dim tracking-[0.18em] uppercase font-semibold">
              Dashboard · {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <h1 className="text-[34px] font-bold mz-t-fg-strong mt-1 leading-none">
              Bom dia, Presidente.
            </h1>
            <div className="text-[13px] mz-t-fg-muted mt-1.5 max-w-xl">
              Visão executiva agregada da plataforma Mazzel · dados atualizados há 4 minutos.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="mz-btn-ghost flex items-center gap-1.5">
              <Download size={13} />Exportar visão
            </button>
            <button className="mz-btn-primary flex items-center gap-1.5">
              <Sparkles size={13} />Resumo IA
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {kpis.map((k, i) => (
            <div key={i} className="mz-kpi-card mz-ring-soft">
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.k}</div>
              <div className="flex items-end gap-2 mt-2">
                <div className="text-[38px] font-bold mz-tnum leading-none mz-t-fg-strong">{k.v}</div>
              </div>
              <div className="text-[11px] mz-t-fg-dim mt-2">{k.hint}</div>
              <div className="mt-2">
                <span className={`mz-chip ${k.ok ? "mz-chip-green" : "mz-chip-red"} flex items-center gap-1 w-fit`} style={{ height: 20 }}>
                  {k.trend.startsWith("+") ? <ArrowUp size={10} /> : k.trend.startsWith("-") ? <ArrowDown size={10} /> : null}
                  {k.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Map + Alerts row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Map */}
          <div className="col-span-2 mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--mz-rule)" }}>
              <div>
                <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Mapa do Brasil</div>
                <div className="text-[15px] font-bold mz-t-fg-strong leading-tight">Força política por UF</div>
              </div>
              <div className="flex items-center gap-1 p-0.5 rounded-md" style={{ background: "var(--mz-rule)" }}>
                {[{k:"partido",l:"Partido"},{k:"score",l:"Score regional"}].map(o => (
                  <button key={o.k} onClick={() => setMapMode(o.k)}
                    className={`mz-btn-ghost ${mapMode === o.k ? "active" : ""}`}
                    style={{ padding: "5px 10px" }}>{o.l}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_220px]">
              <div className="p-4 pt-2">
                <BrasilChoropleth mode={mapMode} onHover={setHoverUf} highlightUf={hoverUf} data={scoreData} />
              </div>
              <div className="border-l p-4" style={{ borderColor: "var(--mz-rule)" }}>
                {hoveredDetail ? (
                  <>
                    <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider">UF</div>
                    <div className="text-[28px] font-bold mz-t-fg-strong">{hoveredDetail.uf}</div>
                    <div className="space-y-3 mt-3">
                      <div>
                        <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider mb-1">Partido dominante</div>
                        <div className="flex items-center gap-2">
                          <span className="mz-party-dot" style={{ background: partyColor(hoveredDetail.partido) }} />
                          <span className="text-[13px] font-semibold mz-t-fg-strong">{hoveredDetail.partido}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider mb-1">Score regional</div>
                        <div className="text-[22px] font-bold mz-tnum mz-t-fg-strong">
                          {hoveredDetail.score}<span className="text-[12px] mz-t-fg-dim"> / 100</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider mb-1">Eleitos UB</div>
                        <div className="text-[22px] font-bold mz-tnum mz-t-fg-strong">{hoveredDetail.eleitos}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="text-[11px] mz-t-fg-dim uppercase tracking-wider">Passe o mouse sobre</div>
                    <div className="text-[14px] font-semibold mz-t-fg mt-1">uma unidade federativa</div>
                    <div className="text-[11px] mz-t-fg-dim mt-2">para ver detalhes</div>
                  </div>
                )}
              </div>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 px-5 py-2.5 border-t" style={{ borderColor: "var(--mz-rule)" }}>
              {mapMode === "partido"
                ? ["UNIÃO BRASIL","PL","PT","PSD","MDB","PSB"].map(p => (
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

          {/* Alerts timeline */}
          <div className="mz-ring-soft rounded-xl overflow-hidden flex flex-col" style={{ background: "var(--mz-bg-card)" }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--mz-rule)" }}>
              <div>
                <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Alertas recentes</div>
                <div className="text-[15px] font-bold mz-t-fg-strong leading-tight">Ultimas 24h</div>
              </div>
              <button className="mz-btn-ghost" style={{ padding: "5px 9px" }}>Ver todos</button>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 520 }}>
              {alertasDisplay.map(a => (
                <div key={a.id} className={`mz-alert-row mz-alert-sev-${a.sev}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`mz-chip ${a.sev === "crit" || a.sev === "alto" ? "mz-chip-red" : a.sev === "med" ? "mz-chip-amber" : "mz-chip-muted"} flex items-center w-fit`} style={{ height: 16, fontSize: 9 }}>
                        {a.sev === "crit" ? "Crítico" : a.sev === "alto" ? "Alto" : a.sev === "med" ? "Médio" : "Baixo"}
                      </span>
                      <span className="text-[10px] mz-t-fg-dim uppercase tracking-wider">{a.tipo}</span>
                      <span className="text-[10px] mz-t-fg-dim ml-auto">{a.when}</span>
                    </div>
                    <div className="text-[12.5px] font-semibold mz-t-fg-strong truncate">{a.who} · {a.uf}</div>
                    <div className="text-[11.5px] mz-t-fg-muted truncate">{a.what}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Three feature cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Top 10 Overall */}
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
            <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--mz-rule)" }}>
              <div>
                <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Ranking</div>
                <div className="text-[15px] font-bold mz-t-fg-strong leading-tight">Top 10 · Overall Mazzel</div>
              </div>
              <button className="mz-btn-ghost" style={{ padding: "5px 9px" }}>Ver radar -&gt;</button>
            </div>
            <div>
              {topCandidatos.map((c, i) => (
                <div key={i} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 px-5 py-2 cursor-pointer mz-card-hover">
                  <div className="text-[12px] font-bold mz-tnum mz-t-fg-dim">{String(i+1).padStart(2,"0")}</div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold mz-t-fg-strong truncate">{c.nome}</div>
                    <div className="flex items-center gap-1.5 text-[10.5px] mz-t-fg-dim">
                      <span className="mz-party-dot" style={{ background: partyColor(c.partido) }} />
                      {c.partido} · {c.uf} · {c.cargo}
                    </div>
                  </div>
                  <div className={`mz-tnum font-bold text-[16px] ${c.tier === "dourado" ? "text-amber-300" : "mz-t-fg-strong"}`}>{c.overall}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Emendas por UF */}
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--mz-rule)" }}>
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Execução orçamentária</div>
              <div className="text-[15px] font-bold mz-t-fg-strong leading-tight">Emendas liberadas · 2024 (top UF)</div>
            </div>
            <div className="p-5 space-y-2.5">
              {HOME_EMENDAS_UF.map((e, i) => {
                const pct = 100 - i * 8;
                return (
                  <div key={e.uf} className="flex items-center gap-3">
                    <div className="w-7 text-[11px] font-bold mz-tnum mz-t-fg">{e.uf}</div>
                    <div className="flex-1 h-2.5 rounded-sm overflow-hidden" style={{ background: "var(--mz-rule)" }}>
                      <div className="h-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--mz-tenant-primary), rgba(var(--mz-tenant-primary-rgb), 0.4))" }} />
                    </div>
                    <div className="mz-tnum font-bold text-[12.5px] mz-t-fg-strong w-[68px] text-right">{e.v}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Movimentações do dia */}
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--mz-rule)" }}>
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Atividade operacional</div>
              <div className="text-[15px] font-bold mz-t-fg-strong leading-tight">Movimentações do dia</div>
            </div>
            <div>
              {HOME_MOV_DIA.map((m, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-2.5 border-b last:border-0" style={{ borderColor: "var(--mz-rule)" }}>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(var(--mz-tenant-primary-rgb), 0.12)" }}>
                    <Sparkles size={12} style={{ color: "var(--mz-tenant-primary)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-[12px] font-semibold mz-t-fg-strong truncate">{m.evento}</div>
                      <div className="text-[10px] mz-t-fg-dim ml-auto mz-tnum">{m.hora}</div>
                    </div>
                    <div className="text-[11px] mz-t-fg-muted truncate">{m.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit feed */}
        <div className="mz-ring-soft rounded-xl overflow-hidden mb-8" style={{ background: "var(--mz-bg-card)" }}>
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--mz-rule)" }}>
            <div>
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Auditoria</div>
              <div className="text-[15px] font-bold mz-t-fg-strong leading-tight">Atividade recente na plataforma</div>
            </div>
            <div className="text-[11px] mz-t-fg-dim">Retenção 90 dias · LGPD-compliant</div>
          </div>
          <div>
            {auditDisplay.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5 border-b last:border-0 text-[12px]" style={{ borderColor: "var(--mz-rule)" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--mz-tenant-primary)" }} />
                <div className="font-semibold mz-t-fg-strong">{a.who}</div>
                <div className="mz-t-fg-muted flex-1 truncate">{a.what}</div>
                <div className="mz-t-fg-dim text-[11px] mz-tnum">{a.when}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <MazzelLayout activeModule="home" breadcrumbs={["União Brasil", "Dashboard"]} alertCount={12}>
      <HomeContent />
    </MazzelLayout>
  );
}
