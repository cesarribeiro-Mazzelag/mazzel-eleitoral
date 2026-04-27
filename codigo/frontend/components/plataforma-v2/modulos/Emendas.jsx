"use client";

/* Modulo Emendas - Designer V1.2 F3 04-modulo-emendas.
 * 5 abas: Mapa, Dossiê, Fluxo (Sankey), Inconsistências, Alertas.
 *
 * Esta primeira versão implementa Mapa (lista ranqueada) + Inconsistências +
 * Alertas funcionais. Dossiê e Sankey ficam stubs até portarmos o SVG/d3.
 *
 * Mocks puros - sem backend ainda. ETL futuro: SIOP + CGU + TCU. */

import { useState, useMemo } from "react";
import { Icon } from "../Icon";
import {
  EMENDAS_MUNICIPIOS,
  EMENDAS_LIST,
  EMENDAS_ALERTAS,
  EMENDAS_REGRAS,
} from "../data";

const TABS = [
  { k: "mapa",   num: "01", label: "Mapa de Emendas" },
  { k: "dossie", num: "02", label: "Dossiê da Emenda" },
  { k: "flux",   num: "03", label: "Fluxo · Sankey"   },
  { k: "inc",    num: "04", label: "Inconsistências", badge: 5 },
  { k: "alert",  num: "05", label: "Alertas",         badge: 3 },
];

const STATUS_COLOR = {
  ok:   { bg: "rgba(22,163,74,0.10)",  fg: "#16a34a", label: "Coerente" },
  high: { bg: "rgba(245,158,11,0.12)", fg: "#d97706", label: "Acima do esperado" },
  crit: { bg: "rgba(220,38,38,0.12)",  fg: "#dc2626", label: "Inconsistência" },
};

const SEV_COLOR = {
  crit: { bg: "rgba(220,38,38,0.12)",  fg: "#fca5a5", label: "Crítico" },
  high: { bg: "rgba(245,158,11,0.12)", fg: "#fcd34d", label: "Alto" },
  med:  { bg: "rgba(59,130,246,0.12)", fg: "#93c5fd", label: "Médio" },
  low:  { bg: "rgba(161,161,170,0.10)",fg: "#a1a1aa", label: "Baixo" },
};

function fmtCurrency(n) {
  if (n >= 1e9) return `R$ ${(n / 1e9).toFixed(2).replace(".", ",")}B`;
  if (n >= 1e6) return `R$ ${(n / 1e6).toFixed(1).replace(".", ",")}M`;
  if (n >= 1e3) return `R$ ${Math.round(n / 1e3)}k`;
  return `R$ ${n.toLocaleString("pt-BR")}`;
}

function fmtPop(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(".", ",")}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return n.toLocaleString("pt-BR");
}

function ScorePill({ score }) {
  let bg = "rgba(22,163,74,0.10)";
  let fg = "#16a34a";
  if (score >= 70) { bg = "rgba(220,38,38,0.14)"; fg = "#dc2626"; }
  else if (score >= 40) { bg = "rgba(245,158,11,0.14)"; fg = "#d97706"; }
  return (
    <span
      className="inline-flex items-center justify-center px-2 py-[2px] rounded text-[11px] font-bold tabular-nums"
      style={{ background: bg, color: fg, fontFamily: "JetBrains Mono, monospace" }}
    >
      {score}
    </span>
  );
}

/* ============ VIEWS ============ */

function MapaView({ municipios, onSelect, selected }) {
  const [sortKey, setSortKey] = useState("score");
  const sorted = useMemo(() => {
    const arr = [...municipios];
    if (sortKey === "score") arr.sort((a, b) => b.score - a.score);
    else if (sortKey === "total") arr.sort((a, b) => b.total - a.total);
    else if (sortKey === "pop") arr.sort((a, b) => b.pop - a.pop);
    return arr;
  }, [municipios, sortKey]);

  return (
    <div className="grid h-full overflow-hidden" style={{ gridTemplateColumns: "1fr 380px" }}>
      <div className="overflow-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[16px] font-bold t-fg-strong">Município por nível de coerência</h2>
            <div className="text-[12px] t-fg-muted mt-0.5">
              {municipios.length} municípios SP analisados · ordenado por {sortKey === "score" ? "score de inconsistência" : sortKey === "total" ? "volume total" : "população"}
            </div>
          </div>
          <div className="flex gap-1 p-0.5 rounded-md" style={{ background: "var(--rule)" }}>
            {[
              { k: "score", l: "Score" },
              { k: "total", l: "Volume" },
              { k: "pop",   l: "População" },
            ].map((s) => (
              <button
                key={s.k}
                type="button"
                onClick={() => setSortKey(s.k)}
                className={`btn-ghost ${sortKey === s.k ? "active" : ""}`}
                style={{ padding: "4px 10px" }}
              >
                {s.l}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          {sorted.map((m) => {
            const sc = STATUS_COLOR[m.status] || STATUS_COLOR.ok;
            const isActive = selected === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m)}
                className="w-full grid items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors"
                style={{
                  gridTemplateColumns: "12px 1fr 90px 90px 60px",
                  background: isActive ? "var(--bg-card-2)" : "var(--bg-card)",
                  border: `1px solid ${isActive ? "var(--tenant-accent)" : "var(--rule)"}`,
                }}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: sc.fg }} />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold t-fg-strong truncate">{m.nm}</div>
                  <div className="text-[10.5px] t-fg-muted truncate">{m.area}</div>
                  {m.flag && (
                    <div
                      className="text-[10.5px] mt-0.5 font-semibold"
                      style={{ color: sc.fg }}
                    >
                      ⚠ {m.flag}
                    </div>
                  )}
                </div>
                <div className="text-right text-[12px] font-semibold tabular-nums t-fg-strong">
                  {fmtCurrency(m.total)}
                  <div className="text-[10px] t-fg-faint font-normal">{fmtPop(m.pop)} hab.</div>
                </div>
                <div className="text-right text-[10.5px] t-fg-muted truncate">{sc.label}</div>
                <div className="flex justify-end">
                  <ScorePill score={m.score} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="border-l flex flex-col overflow-auto"
        style={{ borderColor: "var(--rule)", background: "var(--bg-card)" }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--rule)" }}>
          <h3 className="text-[13px] font-bold t-fg-strong">Coerência de volume</h3>
          <div className="text-[11px] t-fg-muted mt-0.5">Critério G1-style por porte municipal</div>
        </div>
        <div className="px-5 py-4 space-y-2.5 text-[12px]">
          {[
            { color: "#16a34a", label: "Coerente",            sub: "compatível com PIB/população" },
            { color: "#bbf7d0", label: "Baixo",               sub: "cidade pequena · volume modesto" },
            { color: "#f59e0b", label: "Acima do esperado",   sub: "investigar contexto" },
            { color: "#dc2626", label: "Inconsistência",      sub: "score ≥ 70 · ação imediata" },
          ].map((row) => (
            <div key={row.label} className="flex items-start gap-2.5">
              <span className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: row.color }} />
              <div>
                <b className="t-fg-strong">{row.label}</b>
                <div className="t-fg-muted">{row.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t mt-2 text-[11px] t-fg-muted" style={{ borderColor: "var(--rule)" }}>
          <b className="t-fg-strong">Pendência ETL:</b> mapa SVG SP por município (Designer V1.2) requer
          GeoJSON IBGE + d3-geo. Hoje exibe ranking ordenado · próxima sprint backend portará o mapa.
        </div>
      </div>
    </div>
  );
}

function InconsistenciasView({ emendas }) {
  const filtered = useMemo(() => emendas.filter((e) => e.score >= 40).sort((a, b) => b.score - a.score), [emendas]);

  return (
    <div className="overflow-auto p-5 h-full">
      <header className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-[18px] font-bold t-fg-strong">Painel de Inconsistências</h2>
          <div className="text-[12px] t-fg-muted mt-0.5">
            Auditoria de anomalias · score 0–100 · {filtered.length} casos com score ≥ 40
          </div>
        </div>
        <div className="flex gap-1.5">
          {[
            { l: "UF", v: "SP" },
            { l: "Score ≥", v: "40" },
            { l: "Valor ≥", v: "R$ 10M" },
            { l: "Período", v: "12 meses" },
          ].map((f) => (
            <span
              key={f.l}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px]"
              style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}
            >
              <span className="t-fg-faint uppercase tracking-wider">{f.l}</span>
              <b className="t-fg-strong">{f.v}</b>
            </span>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { l: "Score médio",       v: Math.round(filtered.reduce((s, e) => s + e.score, 0) / Math.max(filtered.length, 1)), suffix: "/100",                ok: false },
          { l: "Volume sob alerta", v: fmtCurrency(filtered.reduce((s, e) => s + e.valor, 0)),                                suffix: "",                    ok: false },
          { l: "Pago sem prestação", v: filtered.filter((e) => e.motivos?.some((m) => m.label?.includes("nota fiscal"))).length, suffix: " emendas",          ok: false },
        ].map((kpi) => (
          <div key={kpi.l} className="rounded-lg p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}>
            <div className="text-[10px] t-fg-faint uppercase tracking-[0.14em] font-bold">{kpi.l}</div>
            <div className="text-[28px] font-bold t-fg-strong mt-1.5 tabular-nums leading-none">
              {kpi.v}<span className="text-[14px] t-fg-faint font-normal">{kpi.suffix}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((e) => (
          <div
            key={e.id}
            className="rounded-lg p-4"
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${e.tier === "crit" ? "rgba(220,38,38,0.30)" : e.tier === "high" ? "rgba(245,158,11,0.30)" : "var(--rule)"}`,
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <ScorePill score={e.score} />
                <div className="text-[10px] t-fg-faint mt-2 uppercase tracking-wider text-center">
                  {e.tier === "crit" ? "CRÍTICO" : e.tier === "high" ? "ALTO" : "MÉDIO"}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[10.5px] tabular-nums t-fg-faint" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    {e.id}
                  </span>
                  <span className="text-[10.5px] px-1.5 py-[1px] rounded-[3px]"
                    style={{ background: "var(--bg-card-2)", color: "var(--fg-muted)" }}>
                    {e.rp} · {e.categoria}
                  </span>
                </div>
                <h3 className="text-[15px] font-semibold t-fg-strong mt-1 leading-snug">{e.titulo}</h3>
                <div className="grid grid-cols-3 gap-4 mt-3 text-[11.5px]">
                  <div>
                    <div className="t-fg-faint uppercase tracking-wider text-[9.5px] font-bold">Autor</div>
                    <div className="t-fg-strong font-semibold">{e.autor}</div>
                    <div className="t-fg-muted">{e.autor_partido} · {e.autor_uf}</div>
                    {e.autor_nota && (
                      <div className="text-[10.5px] mt-1" style={{ color: "var(--mz-danger, #ef4444)" }}>
                        ⚠ {e.autor_nota}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="t-fg-faint uppercase tracking-wider text-[9.5px] font-bold">Município</div>
                    <div className="t-fg-strong font-semibold">{e.municipio}</div>
                    <div className="t-fg-muted">{e.status === "pago" ? "Pago integral" : "Em execução"}</div>
                  </div>
                  <div>
                    <div className="t-fg-faint uppercase tracking-wider text-[9.5px] font-bold">Valores</div>
                    <div className="t-fg-strong font-semibold tabular-nums">{fmtCurrency(e.valor)}</div>
                    <div className="t-fg-muted tabular-nums">{fmtCurrency(e.valor_pago)} pago ({Math.round((e.valor_pago / e.valor) * 100)}%)</div>
                  </div>
                </div>
                {e.motivos && e.motivos.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {e.motivos.map((m, i) => (
                      <li
                        key={i}
                        className="text-[11.5px] flex items-start gap-2"
                        style={{ color: m.tipo === "danger" ? "#dc2626" : m.tipo === "warn" ? "#d97706" : "var(--fg)" }}
                      >
                        <span className="font-bold">{m.tipo === "danger" ? "✗" : m.tipo === "warn" ? "!" : "·"}</span>
                        <span>{m.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <button className="btn-ghost text-[11px]" style={{ padding: "5px 10px" }} type="button">
                  Designar Op
                </button>
                <button
                  className="text-[11px] rounded-md px-2.5 py-1 font-semibold"
                  style={{ background: "rgba(220,38,38,0.10)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.30)" }}
                  type="button"
                >
                  ⚐ Reportar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertasView({ alertas, regras }) {
  return (
    <div className="grid h-full overflow-hidden" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
      <div className="overflow-auto p-5">
        <h2 className="text-[16px] font-bold t-fg-strong mb-3">Feed de Alertas</h2>
        <div className="space-y-2">
          {alertas.map((a) => {
            const sc = SEV_COLOR[a.sev] || SEV_COLOR.med;
            return (
              <div
                key={a.id}
                className="rounded-md p-3"
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${a.sev === "crit" ? "rgba(220,38,38,0.30)" : "var(--rule)"}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="text-[10px] font-bold tracking-[0.06em] px-1.5 py-[2px] rounded-[3px] flex-shrink-0"
                    style={{ background: sc.bg, color: sc.fg }}
                  >
                    {sc.label.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <h3 className="text-[13px] font-semibold t-fg-strong leading-tight">{a.titulo}</h3>
                      <span className="text-[10px] t-fg-faint ml-auto flex-shrink-0">{a.when}</span>
                    </div>
                    <div className="text-[11.5px] t-fg-muted leading-snug">{a.desc}</div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-[10px] t-fg-faint uppercase tracking-wider">Para: <b className="t-fg">{a.target}</b></span>
                      <div className="flex gap-1">
                        {a.channels.map((ch) => (
                          <span
                            key={ch}
                            className="text-[9.5px] px-1.5 py-[1px] rounded font-semibold uppercase"
                            style={{ background: "var(--bg-card-2)", color: "var(--fg-muted)" }}
                          >
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="border-l flex flex-col overflow-auto"
        style={{ borderColor: "var(--rule)", background: "var(--bg-card)" }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--rule)" }}>
          <h3 className="text-[13px] font-bold t-fg-strong">Regras de alerta ativas</h3>
          <div className="text-[11px] t-fg-muted mt-0.5">{regras.length} regras configuradas</div>
        </div>
        <div className="px-5 py-4 space-y-3">
          {regras.map((r, i) => (
            <div key={i} className="border-b last:border-0 pb-3" style={{ borderColor: "var(--rule)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[9.5px] font-bold tracking-[0.06em] px-1.5 py-[1px] rounded-[3px]"
                  style={{ background: SEV_COLOR[r.sev]?.bg, color: SEV_COLOR[r.sev]?.fg }}
                >
                  {SEV_COLOR[r.sev]?.label.toUpperCase()}
                </span>
                <b className="text-[12px] t-fg-strong">{r.nm}</b>
              </div>
              <div className="text-[11px] t-fg-muted leading-snug mb-1.5">{r.desc}</div>
              <div className="text-[10px] t-fg-faint">
                {r.freq} · {r.channels.join(" + ")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StubView({ icon, title, desc }) {
  return (
    <div className="flex items-center justify-center h-full p-12">
      <div
        className="rounded-lg p-8 max-w-2xl text-center"
        style={{ background: "var(--bg-card)", border: "1px dashed var(--rule)" }}
      >
        <div className="text-[40px] mb-3">{icon}</div>
        <h3 className="text-[18px] font-bold t-fg-strong mb-2">{title}</h3>
        <p className="text-[13px] t-fg-muted leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* ============ MAIN ============ */

export function Emendas() {
  const [tab, setTab] = useState("mapa");
  const [selectedMun, setSelectedMun] = useState("sbo");

  return (
    <div className="bg-page-grad min-h-full flex flex-col" style={{ height: "calc(100vh - 48px)" }}>
      <div className="max-w-[1600px] mx-auto w-full px-8 pt-7 pb-3">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Emendas Parlamentares</div>
            <h1 className="text-[28px] font-display font-bold t-fg-strong mt-1 leading-none">
              Auditoria de Emendas · São Paulo
            </h1>
            <div className="text-[13px] t-fg-muted mt-1.5">
              Caso central · Santa Bárbara d'Oeste · 2 emendas críticas detectadas · período 2024–2026
            </div>
          </div>
          <div className="flex gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px]"
              style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}
            >
              <span className="t-fg-faint uppercase tracking-wider">UF</span>
              <b className="t-fg-strong">SP</b>
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px]"
              style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}
            >
              <span className="t-fg-faint uppercase tracking-wider">Período</span>
              <b className="t-fg-strong">2024–2026</b>
            </span>
            <button className="btn-primary" type="button">
              <Icon name="Download" size={13} />Exportar PDF
            </button>
          </div>
        </div>

        {/* Subnav (5 abas) */}
        <div
          className="flex items-center gap-1 px-1 rounded-md"
          style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}
        >
          {TABS.map((t) => {
            const on = tab === t.k;
            return (
              <button
                key={t.k}
                type="button"
                onClick={() => setTab(t.k)}
                className="text-[12px] font-semibold rounded-md px-3 py-1.5 transition-colors flex items-center gap-1.5"
                style={{
                  background: on ? "var(--tenant-primary)" : "transparent",
                  color: on ? "#fff" : "var(--fg-muted)",
                }}
              >
                <span
                  className="text-[9.5px] tabular-nums"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    background: on ? "rgba(255,204,0,0.25)" : "var(--bg-card-2)",
                    color: on ? "#FFCC00" : "var(--fg-faint)",
                    padding: "1px 5px",
                    borderRadius: 3,
                  }}
                >
                  {t.num}
                </span>
                {t.label}
                {t.badge && (
                  <span
                    className="text-[9.5px] font-bold tabular-nums px-1.5 py-[1px] rounded-full"
                    style={{
                      background: "rgba(220,38,38,0.20)",
                      color: "#fca5a5",
                    }}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo da aba */}
      <div className="flex-1 min-h-0 max-w-[1600px] mx-auto w-full px-8 pb-8">
        <div
          className="rounded-lg overflow-hidden h-full"
          style={{ background: "var(--bg-page)", border: "1px solid var(--rule)" }}
        >
          {tab === "mapa" && (
            <MapaView municipios={EMENDAS_MUNICIPIOS} onSelect={(m) => setSelectedMun(m.id)} selected={selectedMun} />
          )}
          {tab === "dossie" && (
            <StubView
              icon="📋"
              title="Dossiê de emenda · em construção"
              desc="Layout completo com 8 seções (sumário, autor, finalidade, fluxo financeiro, auditoria CGU, similares, parecer jurídico, ações) entregue pelo Designer V1.2. Próxima sprint: portar componente. Por ora, abre o Designer original em /mockups/v1.2/F3-modulos/04-modulo-emendas.html."
            />
          )}
          {tab === "flux" && (
            <StubView
              icon="🔀"
              title="Fluxo Sankey · em construção"
              desc="Diagrama Sankey 3 colunas (autor → categoria → município/órgão executor) requer integração d3-sankey. Designer entregou layout funcional · próxima sprint backend portará."
            />
          )}
          {tab === "inc" && <InconsistenciasView emendas={EMENDAS_LIST} />}
          {tab === "alert" && <AlertasView alertas={EMENDAS_ALERTAS} regras={EMENDAS_REGRAS} />}
        </div>
      </div>
    </div>
  );
}
