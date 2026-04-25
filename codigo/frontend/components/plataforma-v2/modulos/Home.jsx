"use client";

/* Home dashboard adaptado de designer/platform-home.jsx. */

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { usePlatform } from "../PlatformContext";
import { makeNavigate } from "../navigate";
import { API, ApiError } from "../api";
import {
  kpisFromDashboard, alertasFromApi,
  topCandidatosFromRadar, movimentacoesFromAuditoria,
  auditFromAuditoria,
} from "../adapters/home";
import {
  HOME_KPIS, HOME_ALERTS, HOME_TOP_CANDIDATOS, HOME_EMENDAS_UF,
  HOME_MOV_DIA, HOME_AUDIT, PARTY_STRENGTH, partyColor, UF_LIST,
} from "../data";
import { BrasilChoropleth } from "./BrasilChoropleth";
import { VisaoNacionalKPIs } from "./home/VisaoNacionalKPIs";

export function Home() {
  const router = useRouter();
  const navigate = makeNavigate(router);
  const { role } = usePlatform();

  const [apiKpis, setApiKpis] = useState(null);
  const [apiAlertas, setApiAlertas] = useState(null);
  const [apiTopCand, setApiTopCand] = useState(null);
  const [apiMovDia, setApiMovDia] = useState(null);
  const [apiAudit, setApiAudit] = useState(null);
  const [authStatus, setAuthStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [dash, al, rad, audit] = await Promise.all([
          API.dashboard().catch((e) => { throw e; }),
          API.alertas({ limit: 8 }).catch(() => null),
          API.radar({ por_pagina: 10, ordenar_por: "overall" }).catch(() => null),
          API.adminAuditoria().catch(() => null),
        ]);
        if (cancelled) return;
        setApiKpis(kpisFromDashboard(dash, role));
        setApiAlertas(alertasFromApi(al));
        setApiTopCand(topCandidatosFromRadar(rad));
        setApiMovDia(movimentacoesFromAuditoria(audit));
        setApiAudit(auditFromAuditoria(audit));
        setAuthStatus("ok");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setAuthStatus("unauth");
        } else {
          setAuthStatus("error");
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [role]);

  const kpis = apiKpis || HOME_KPIS[role] || HOME_KPIS.presidente;
  const alertas = apiAlertas || HOME_ALERTS;
  const topCand = apiTopCand || HOME_TOP_CANDIDATOS;
  const movDia = apiMovDia || HOME_MOV_DIA;
  const auditFeed = apiAudit || HOME_AUDIT;

  const [mapMode, setMapMode] = useState("partido");
  const [hoverUf, setHoverUf] = useState(null);

  const scoreData = useMemo(() => {
    const d = {};
    UF_LIST.forEach((u, i) => {
      d[u] = 45 + ((u.charCodeAt(0) + u.charCodeAt(1) + i * 7) % 50);
    });
    return d;
  }, []);

  const hoveredDetail = hoverUf
    ? {
        uf: hoverUf,
        partido: PARTY_STRENGTH[hoverUf] || "-",
        score: scoreData[hoverUf],
        eleitos: 10 + ((hoverUf.charCodeAt(0) + hoverUf.charCodeAt(1)) % 40),
      }
    : null;

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">

        {authStatus === "unauth" && (
          <div
            className="mb-4 rounded-lg px-4 py-2.5 flex items-center gap-2 text-[12px]"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.35)" }}
          >
            <Icon name="AlertTriangle" size={14} className="t-warn" />
            <span className="t-fg">Sem sessão ativa. Exibindo dados fictícios. Faça login para ver a base real.</span>
          </div>
        )}
        {authStatus === "error" && (
          <div
            className="mb-4 rounded-lg px-4 py-2.5 flex items-center gap-2 text-[12px]"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)" }}
          >
            <Icon name="AlertTriangle" size={14} className="t-danger" />
            <span className="t-fg">Falha ao consultar o backend. Exibindo mock.</span>
          </div>
        )}

        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">
              Dashboard · {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <h1 className="text-[34px] font-display font-bold t-fg-strong mt-1 leading-none">
              {role === "candidato" ? "Bom dia, Senador." : role === "presidente" ? "Bom dia, Presidente." : "Bom dia, diretoria."}
            </h1>
            <div className="text-[13px] t-fg-muted mt-1.5 max-w-xl">
              {role === "candidato"
                ? "Resumo do seu mandato, base e emendas em execução."
                : "Visão executiva agregada da plataforma Mazzel · dados atualizados há 4 minutos."}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" type="button"><Icon name="Download" size={13} />Exportar visão</button>
            <button className="btn-primary" type="button"><Icon name="Sparkles" size={13} />Resumo IA</button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {kpis.map((k, i) => (
            <div key={i} className="kpi-card ring-soft">
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.k}</div>
              <div className="flex items-end gap-2 mt-2">
                <div
                  className="text-[38px] font-display font-bold tnum leading-none"
                  style={{
                    backgroundImage: "linear-gradient(180deg, var(--overall-from), var(--overall-to))",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {k.v}
                </div>
              </div>
              <div className="text-[11px] t-fg-dim mt-2">{k.hint}</div>
              <div className="kpi-trend">
                <span className={`chip ${k.ok ? "chip-green" : "chip-red"}`} style={{ height: 20 }}>
                  <Icon name={k.trend.startsWith("+") ? "ArrowUp" : k.trend.startsWith("-") ? "ArrowDown" : "Check"} size={10} />
                  {k.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="col-span-2 t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div>
                <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Mapa do Brasil</div>
                <div className="text-[15px] font-bold t-fg-strong leading-tight">Força política por UF</div>
              </div>
              <div className="flex items-center gap-1 p-0.5 rounded-md" style={{ background: "var(--rule)" }}>
                {[{ k: "partido", l: "Partido" }, { k: "score", l: "Score regional" }].map((o) => (
                  <button
                    key={o.k}
                    onClick={() => setMapMode(o.k)}
                    className={`btn-ghost ${mapMode === o.k ? "active" : ""}`}
                    style={{ padding: "5px 10px" }}
                    type="button"
                  >
                    {o.l}
                  </button>
                ))}
                <button className="btn-ghost" style={{ padding: "5px 10px" }} onClick={() => navigate("mapa")} type="button">
                  Abrir mapa completo →
                </button>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_220px]">
              <div className="p-4 pt-2">
                <BrasilChoropleth
                  mode={mapMode}
                  onHover={setHoverUf}
                  onClick={() => navigate("mapa")}
                  highlightUf={hoverUf}
                  data={scoreData}
                />
              </div>
              <div className="border-l p-4" style={{ borderColor: "var(--rule)" }}>
                {hoveredDetail ? (
                  <>
                    <div className="text-[10px] t-fg-dim uppercase tracking-wider">UF</div>
                    <div className="text-[28px] font-display font-bold t-fg-strong">{hoveredDetail.uf}</div>
                    <div className="text-[11.5px] t-fg-muted mt-0.5 mb-4">Clique para abrir Mapa Eleitoral</div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] t-fg-dim uppercase tracking-wider mb-1">Partido dominante</div>
                        <div className="flex items-center gap-2">
                          <span className="party-dot" style={{ background: partyColor(hoveredDetail.partido) }} />
                          <span className="text-[13px] font-semibold t-fg-strong">{hoveredDetail.partido}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] t-fg-dim uppercase tracking-wider mb-1">Score regional</div>
                        <div className="text-[22px] font-bold tnum t-fg-strong">{hoveredDetail.score}<span className="text-[12px] t-fg-dim"> / 100</span></div>
                      </div>
                      <div>
                        <div className="text-[10px] t-fg-dim uppercase tracking-wider mb-1">Eleitos UB</div>
                        <div className="text-[22px] font-bold tnum t-fg-strong">{hoveredDetail.eleitos}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="text-[11px] t-fg-dim uppercase tracking-wider">Passe o mouse sobre</div>
                    <div className="text-[14px] font-semibold t-fg mt-1">uma unidade federativa</div>
                    <div className="text-[11px] t-fg-dim mt-2">para ver detalhes</div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-2.5 border-t" style={{ borderColor: "var(--rule)" }}>
              {mapMode === "partido"
                ? ["UNIÃO BRASIL", "PL", "PT", "PSD", "MDB", "PSB"].map((p) => (
                    <div key={p} className="flex items-center gap-1.5 text-[10.5px] t-fg-muted">
                      <span className="party-dot" style={{ background: partyColor(p) }} />{p}
                    </div>
                  ))
                : [["#f87171", "<40"], ["#fb923c", "40-55"], ["#fbbf24", "55-70"], ["#60a5fa", "70-85"], ["#34d399", "≥85"]].map(([c, l]) => (
                    <div key={l} className="flex items-center gap-1.5 text-[10.5px] t-fg-muted">
                      <span className="party-dot" style={{ background: c }} />{l}
                    </div>
                  ))}
            </div>
          </div>

          <div className="t-bg-card ring-soft rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div>
                <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Alertas recentes</div>
                <div className="text-[15px] font-bold t-fg-strong leading-tight">Últimas 24h</div>
              </div>
              <button className="btn-ghost" onClick={() => navigate("alertas")} style={{ padding: "5px 9px" }} type="button">
                Ver todos
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 520 }}>
              {alertas.map((a) => (
                <div key={a.id} className={`alert-row alert-sev-${a.sev}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`chip ${
                          a.sev === "crit" ? "chip-red" :
                          a.sev === "alto" ? "chip-red" :
                          a.sev === "med"  ? "chip-amber" : "chip-muted"
                        }`}
                        style={{ height: 16, fontSize: 9 }}
                      >
                        {a.sev === "crit" ? "Crítico" : a.sev === "alto" ? "Alto" : a.sev === "med" ? "Médio" : "Baixo"}
                      </span>
                      <span className="text-[10px] t-fg-dim uppercase tracking-wider">{a.tipo}</span>
                      <span className="text-[10px] t-fg-dim ml-auto">{a.when}</span>
                    </div>
                    <div className="text-[12.5px] font-semibold t-fg-strong truncate">{a.who} · {a.uf}</div>
                    <div className="text-[11.5px] t-fg-muted truncate">{a.what}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--rule)" }}>
              <div>
                <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Ranking</div>
                <div className="text-[15px] font-bold t-fg-strong leading-tight">Top 10 · Overall Mazzel</div>
              </div>
              <button className="btn-ghost" style={{ padding: "5px 9px" }} onClick={() => navigate("radar")} type="button">
                Ver radar →
              </button>
            </div>
            <div className="row-striped">
              {topCand.map((c, i) => (
                <div
                  key={c.id ?? i}
                  className="grid grid-cols-[28px_1fr_auto] items-center gap-3 px-5 py-2 cursor-pointer card-hover"
                  onClick={() => router.push(c.id ? `/mazzel-preview/dossies/${c.id}` : "/mazzel-preview/dossies")}
                >
                  <div className="text-[12px] font-bold tnum t-fg-dim">{String(i + 1).padStart(2, "0")}</div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold t-fg-strong truncate">{c.nome}</div>
                    <div className="flex items-center gap-1.5 text-[10.5px] t-fg-dim">
                      <span className="party-dot" style={{ background: partyColor(c.partido) }} />
                      {c.partido} · {c.uf} · {c.cargo}
                    </div>
                  </div>
                  <div className={`tnum font-bold text-[16px] ${c.tier === "dourado" ? "text-amber-300" : "t-fg-strong"}`}>{c.overall}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Execução orçamentária</div>
              <div className="text-[15px] font-bold t-fg-strong leading-tight">Emendas liberadas · 2024 (top UF)</div>
            </div>
            <div className="p-5 space-y-2.5">
              {HOME_EMENDAS_UF.map((e, i) => {
                const pct = 100 - i * 8;
                return (
                  <div key={e.uf} className="flex items-center gap-3">
                    <div className="w-7 text-[11px] font-bold tnum t-fg">{e.uf}</div>
                    <div className="flex-1 h-2.5 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
                      <div
                        className="h-full"
                        style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--tenant-primary), rgba(var(--tenant-primary-rgb), 0.4))" }}
                      />
                    </div>
                    <div className="tnum font-bold text-[12.5px] t-fg-strong w-[68px] text-right">{e.v}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Atividade operacional</div>
              <div className="text-[15px] font-bold t-fg-strong leading-tight">Movimentações do dia</div>
            </div>
            <div>
              {movDia.map((m, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-2.5 border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
                  <div className="w-7 h-7 rounded-md t-bg-tenant-soft flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name={m.icon} size={13} className="t-tenant" stroke={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-[12px] font-semibold t-fg-strong truncate">{m.evento}</div>
                      <div className="text-[10px] t-fg-dim ml-auto tnum">{m.hora}</div>
                    </div>
                    <div className="text-[11px] t-fg-muted truncate">{m.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="t-bg-card ring-soft rounded-xl overflow-hidden mb-8">
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--rule)" }}>
            <div>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Auditoria</div>
              <div className="text-[15px] font-bold t-fg-strong leading-tight">Atividade recente na plataforma</div>
            </div>
            <div className="text-[11px] t-fg-dim">Retenção 90 dias · LGPD-compliant</div>
          </div>
          <div>
            {auditFeed.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-2.5 border-b last:border-0 text-[12px]"
                style={{ borderColor: "var(--rule)" }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--tenant-primary)" }} />
                <div className="font-semibold t-fg-strong">{a.who}</div>
                <div className="t-fg-muted flex-1 truncate">{a.what}</div>
                <div className="t-fg-dim text-[11px] tnum">{a.when}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Visao Nacional (dados TSE) ─────────────────────────────── */}
        <div className="mb-8">
          <VisaoNacionalKPIs />
        </div>

      </div>
    </div>
  );
}
