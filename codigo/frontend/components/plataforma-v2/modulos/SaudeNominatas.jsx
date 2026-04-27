"use client";

/* Saúde das Nominatas · Mazzel Eleitoral · UB
 * 1:1 com Designer V1.2 — codigo/frontend/public/mockups/v1.2/F4-estatutario/07-saude-nominatas.html
 *
 * Estrutura (linhas 25-413 do mockup):
 *  - Topbar Milton-CEO 56px (3-col: brand UB / breadcrumb · "Beta · sigiloso" / user pill)
 *  - Tabs 44px com nº mono + dot vermelho · UF/RECORTE pills à direita
 *  - 5 views:
 *    01 · Score · Hexágono — 3-col (lista comissões / hexágono SVG / sinalizações)
 *    02 · Heatmap SP — 3-col (legenda / mapa SVG / detalhe município)
 *    03 · Ranking — 3 cards âncora + tabela amostral
 *    04 · Dossiê Comissão — TOC esquerda + 7 seções (Tatuí · diligência aberta)
 *    05 · Alertas Anti-Fraude — feed agrupado + side regras
 *
 * Linguagem NEUTRA (decisão Designer): "padrão atípico", "pulso de filiação",
 * "concentração de origem geográfica" — NUNCA "fraude"/"crime"/"denúncia". */

import { useState, useMemo } from "react";
import { Icon } from "../Icon";
import { usePlatform } from "../PlatformContext";
import {
  NOMINATA_SUBMEDIDAS,
  NOMINATA_COMISSOES,
  NOMINATA_SECUNDARIAS,
  NOMINATA_ALERTAS,
  NOMINATA_REGRAS,
} from "../data";

/* ============ Helpers (idênticos ao mockup app.js) ============ */

function calcScore(scores) {
  const total = NOMINATA_SUBMEDIDAS.reduce((a, sm) => a + sm.peso, 0);
  const sum = NOMINATA_SUBMEDIDAS.reduce((a, sm) => a + (scores[sm.key] || 0) * sm.peso, 0);
  return Math.round(sum / total);
}
function tierFromScore(s) {
  if (s >= 75) return "ok";
  if (s >= 55) return "high";
  return "crit";
}
function tierColor(t) {
  return t === "ok" ? "#22c55e" : t === "high" ? "#f59e0b" : "#f87171";
}
function tierLabel(t) {
  return t === "ok" ? "SAUDÁVEL" : t === "high" ? "ATENÇÃO" : "CRÍTICA";
}
function fmt(n) {
  return typeof n === "number" ? n.toLocaleString("pt-BR") : n;
}

/* ============ Topbar Milton-CEO ============ */

function Topbar() {
  const { userName, userInitials } = usePlatform();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr 220px",
        alignItems: "center",
        padding: "0 24px",
        background: "var(--bg-topbar)",
        borderBottom: "1px solid var(--rule)",
        height: 56,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            background: "var(--tenant-primary)",
            border: "1px solid var(--tenant-accent)",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Bebas Neue', sans-serif",
            color: "var(--tenant-accent)",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          UB
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.02em", color: "var(--fg-strong)", lineHeight: 1.1 }}>
          MAZZEL
          <span style={{ display: "block", fontSize: 9, color: "var(--fg-faint)", fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase", marginTop: 2 }}>
            União Brasil · SP
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, color: "var(--fg-muted)" }}>
        Mazzel Eleitoral{" "}
        <span style={{ color: "var(--rule-strong)" }}>›</span>{" "}
        <b style={{ color: "var(--fg-strong)", fontWeight: 600 }}>Estatutário</b>{" "}
        <span style={{ color: "var(--rule-strong)" }}>›</span>{" "}
        <b style={{ color: "var(--fg-strong)", fontWeight: 600 }}>Saúde das Nominatas</b>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            padding: "2px 8px",
            borderRadius: 4,
            background: "var(--tenant-accent-soft, rgba(255,204,0,0.16))",
            color: "var(--tenant-accent)",
            border: "1px solid var(--tenant-accent-soft, rgba(255,204,0,0.16))",
            fontWeight: 700,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            marginLeft: 4,
          }}
        >
          Beta · sigiloso
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "flex-end" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 10px 4px 4px",
            border: "1px solid var(--rule)",
            borderRadius: 999,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "var(--tenant-primary)",
              color: "var(--tenant-accent)",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {userInitials || "M"}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg)", lineHeight: 1.1 }}>
            {userName?.split(" ")[0] || "Milton"}
            <span style={{ display: "block", fontSize: 9, color: "var(--fg-faint)", fontWeight: 500 }}>
              Pres. Estadual
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ Tabs ============ */

const TABS = [
  { k: "hex",    num: "01", label: "Score · Hexágono",       dot: false },
  { k: "map",    num: "02", label: "Heatmap SP",             dot: false },
  { k: "rank",   num: "03", label: "Ranking",                dot: true  },
  { k: "dossie", num: "04", label: "Dossiê Comissão",        dot: true  },
  { k: "ale",    num: "05", label: "Alertas Anti-Fraude",    dot: true  },
];

function Tabs({ active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        padding: "0 24px",
        background: "var(--bg-page)",
        borderBottom: "1px solid var(--rule)",
        height: 44,
        flexShrink: 0,
      }}
    >
      {TABS.map((t) => {
        const isActive = active === t.k;
        return (
          <button
            key={t.k}
            type="button"
            onClick={() => onChange(t.k)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 18px",
              cursor: "pointer",
              border: 0,
              background: "transparent",
              color: isActive ? "var(--fg-strong)" : "var(--fg-muted)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.02em",
              borderBottom: `2px solid ${isActive ? "var(--tenant-accent)" : "transparent"}`,
              height: "100%",
              transition: "color 100ms",
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9.5,
                color: isActive ? "var(--tenant-accent)" : "var(--fg-faint)",
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              {t.num}
            </span>
            {t.label}
            {t.dot && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--danger)",
                  display: "inline-block",
                }}
              />
            )}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 10.5,
          color: "var(--fg-faint)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        <span style={{ background: "var(--bg-card)", border: "1px solid var(--rule)", padding: "3px 10px", borderRadius: 999 }}>
          UF · <b style={{ color: "var(--fg)", fontWeight: 700 }}>SP</b>
        </span>
        <span style={{ background: "var(--bg-card)", border: "1px solid var(--rule)", padding: "3px 10px", borderRadius: 999 }}>
          RECORTE · <b style={{ color: "var(--fg)", fontWeight: 700 }}>2024-2028</b>
        </span>
      </div>
    </div>
  );
}

/* ============================================================
 * VIEW 1 · HEXÁGONO SCORE
 * ============================================================ */

function HexSidePick({ comissao, active, onClick }) {
  const score = calcScore(comissao.scores);
  const tier = comissao.tier;
  const tierLbl = tierLabel(tier);
  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 12px",
        background: active ? "var(--tenant-primary-soft, rgba(0,42,123,0.18))" : "var(--bg-card)",
        border: `1px solid ${active ? "var(--tenant-accent)" : "var(--rule)"}`,
        borderRadius: 8,
        cursor: "pointer",
        marginBottom: 8,
        transition: "border-color 100ms",
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg-strong)", display: "flex", alignItems: "center", gap: 8 }}>
        {comissao.nm} · {comissao.uf}
        <span
          style={{
            fontSize: 9.5,
            fontFamily: "'JetBrains Mono', monospace",
            padding: "1px 6px",
            borderRadius: 3,
            fontWeight: 700,
            background: tier === "ok" ? "rgba(22,163,74,0.15)" : tier === "high" ? "rgba(245,158,11,0.15)" : "rgba(220,38,38,0.18)",
            color: tierColor(tier),
          }}
        >
          {tierLbl}
        </span>
      </div>
      <div style={{ fontSize: 10.5, color: "var(--fg-faint)", marginTop: 4, lineHeight: 1.4, letterSpacing: "0.04em" }}>
        {fmt(comissao.pop)} hab · {fmt(comissao.filiados)} filiados · {comissao.candidatos} cand.
      </div>
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 22,
          lineHeight: 1,
          marginTop: 6,
          letterSpacing: "0.02em",
          color: tierColor(tier),
        }}
      >
        {score}
        <span style={{ fontSize: 11, color: "var(--fg-faint)", fontFamily: "Inter", fontWeight: 600 }}>
          {" "}/100
        </span>
      </div>
    </div>
  );
}

function HexagonSVG({ comissao }) {
  const cx = 270, cy = 280, R = 165;
  const angles = NOMINATA_SUBMEDIDAS.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i) / NOMINATA_SUBMEDIDAS.length);
  const score = calcScore(comissao.scores);
  const tier = comissao.tier;
  const color = tierColor(tier);

  const gridLevels = [25, 50, 75, 100];
  const dataPts = NOMINATA_SUBMEDIDAS.map((sm, i) => {
    const v = comissao.scores[sm.key];
    const r = R * (v / 100);
    return [cx + Math.cos(angles[i]) * r, cy + Math.sin(angles[i]) * r];
  });
  const polyPts = dataPts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

  return (
    <svg width={540} height={560} viewBox="0 0 540 560" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: "100%", marginTop: -10 }}>
      {/* grid concêntrica */}
      {gridLevels.map((lvl) => {
        const r = R * (lvl / 100);
        const pts = angles.map((a) => `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`).join(" ");
        return (
          <polygon
            key={lvl}
            points={pts}
            fill="none"
            stroke="var(--rule)"
            strokeWidth={lvl === 100 ? 1.4 : 0.8}
            strokeDasharray={lvl === 100 ? undefined : "2 3"}
          />
        );
      })}
      {/* eixos */}
      {angles.map((a, i) => {
        const x2 = cx + Math.cos(a) * R, y2 = cy + Math.sin(a) * R;
        return (
          <line key={i} x1={cx} y1={cy} x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke="var(--rule)" strokeWidth={0.6} strokeDasharray="2 3" />
        );
      })}
      {/* grid level labels */}
      {gridLevels.map((lvl) => {
        const r = R * (lvl / 100);
        return (
          <text key={lvl} x={cx + 4} y={cy - r + 3} fontFamily="'JetBrains Mono', monospace" fontSize={8} fill="var(--fg-faint)" letterSpacing="0.04em">
            {lvl}
          </text>
        );
      })}
      {/* polígono dados */}
      <polygon points={polyPts} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2.6} strokeLinejoin="round" />
      {/* pontos vértices */}
      {dataPts.map((p, i) => (
        <circle key={i} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r={3.6} fill={color} stroke="var(--bg-page)" strokeWidth={1.5} />
      ))}
      {/* labels (raio externo) */}
      {NOMINATA_SUBMEDIDAS.map((sm, i) => {
        const r = R + 22;
        const x = cx + Math.cos(angles[i]) * r;
        const y = cy + Math.sin(angles[i]) * r;
        const v = comissao.scores[sm.key];
        const vColor = tierColor(tierFromScore(v));
        let anchor = "middle";
        if (Math.cos(angles[i]) > 0.2) anchor = "start";
        else if (Math.cos(angles[i]) < -0.2) anchor = "end";
        const dx = anchor === "start" ? 6 : anchor === "end" ? -6 : 0;
        return (
          <g key={sm.key}>
            <text x={(x + dx).toFixed(1)} y={(y - 3).toFixed(1)} textAnchor={anchor} fontFamily="Inter" fontSize={10.5} fontWeight={700} fill="var(--fg-strong)" letterSpacing="0.06em">
              {sm.short}
            </text>
            <text x={(x + dx).toFixed(1)} y={(y + 13).toFixed(1)} textAnchor={anchor} fontFamily="'Bebas Neue', sans-serif" fontSize={22} fill={vColor} letterSpacing="0.04em">
              {v}
            </text>
          </g>
        );
      })}
      {/* score central */}
      <circle cx={cx} cy={cy} r={38} fill="var(--bg-card)" stroke={color} strokeWidth={1.2} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontFamily="'Bebas Neue', sans-serif" fontSize={32} fill={color} letterSpacing="0.02em">
        {score}
      </text>
    </svg>
  );
}

function HexLegend({ comissao }) {
  return (
    <div style={{ width: "100%", maxWidth: 720, marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {NOMINATA_SUBMEDIDAS.map((sm) => {
        const v = comissao.scores[sm.key];
        const t = tierFromScore(v);
        return (
          <div
            key={sm.key}
            style={{ background: "var(--bg-card)", border: "1px solid var(--rule)", borderRadius: 10, padding: "12px 14px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-strong)" }}>{sm.nm}</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: "0.02em", color: tierColor(t) }}>
                {v}
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--fg-muted)", marginTop: 4, lineHeight: 1.4 }}>{sm.desc}</div>
            <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${v}%`, background: tierColor(t) }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HexFlags({ comissao }) {
  return (
    <div style={{ background: "var(--bg-sidebar)", borderLeft: "1px solid var(--rule)", overflowY: "auto", padding: "18px 20px" }}>
      <h3 style={hexH3}>Identificação</h3>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--rule)", borderRadius: 10, padding: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--tenant-primary)", color: "var(--tenant-accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 14,
            }}
          >
            {comissao.pres.av}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-strong)" }}>{comissao.pres.nm}</div>
            <div style={{ fontSize: 10.5, color: "var(--fg-faint)", marginTop: 2 }}>{comissao.pres.cargo}</div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--fg-muted)", lineHeight: 1.5, paddingTop: 10, borderTop: "1px solid var(--rule)" }}>
          {fmt(comissao.pop)} hab · {comissao.area}<br />
          {fmt(comissao.filiados)} filiados · {comissao.candidatos} candidatos<br />
          Mandato {comissao.mandato}<br />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-faint)", marginTop: 4, display: "block" }}>
            ⟳ {comissao.ult_atualizacao}
          </span>
        </div>
      </div>

      <h3 style={hexH3}>Sinalizações</h3>
      {comissao.flags.length === 0 ? (
        <div
          style={{
            padding: "12px 14px", borderRadius: 10,
            background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)",
            color: "var(--ok)", fontSize: 11.5, lineHeight: 1.5, fontWeight: 600,
          }}
        >
          ✓ Nenhuma sinalização ativa. Comissão saudável.
        </div>
      ) : (
        comissao.flags.map((f, i) => (
          <div
            key={i}
            style={{
              padding: "12px 14px", borderRadius: 10, marginBottom: 8,
              background: f.tipo === "danger" ? "rgba(248,113,113,0.10)" : f.tipo === "warn" ? "rgba(251,191,36,0.10)" : "rgba(96,165,250,0.10)",
              border: `1px solid ${f.tipo === "danger" ? "rgba(248,113,113,0.25)" : f.tipo === "warn" ? "rgba(251,191,36,0.25)" : "rgba(96,165,250,0.20)"}`,
              fontSize: 11.5, lineHeight: 1.5, color: "var(--fg)",
            }}
          >
            <div
              style={{
                fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 4,
                color: f.tipo === "danger" ? "var(--danger)" : f.tipo === "warn" ? "var(--warn)" : "var(--accent-blue)",
              }}
            >
              {f.tipo === "danger" ? "Risco crítico" : f.tipo === "warn" ? "Atenção" : "Info"}
            </div>
            {f.label}
          </div>
        ))
      )}
    </div>
  );
}

const hexH3 = {
  fontSize: 9.5,
  letterSpacing: "0.16em",
  color: "var(--fg-faint)",
  textTransform: "uppercase",
  fontWeight: 700,
  margin: "0 0 12px",
};

function ViewHex({ activeId, setActive }) {
  const comissao = NOMINATA_COMISSOES.find((c) => c.id === activeId) || NOMINATA_COMISSOES[2];
  const score = calcScore(comissao.scores);
  const tier = comissao.tier;
  const tierLbl = tierLabel(tier);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 360px", height: "100%" }}>
      <aside style={{ background: "var(--bg-sidebar)", borderRight: "1px solid var(--rule)", overflowY: "auto", padding: "18px 20px" }}>
        <h3 style={hexH3}>Comissões · 3 destacadas</h3>
        {NOMINATA_COMISSOES.map((c) => (
          <HexSidePick key={c.id} comissao={c} active={c.id === comissao.id} onClick={() => setActive(c.id)} />
        ))}
        <h3 style={{ ...hexH3, marginTop: 22 }}>Atalhos</h3>
        <div style={{ padding: "10px 12px", background: "var(--bg-card)", border: "1px solid var(--rule)", borderRadius: 8, marginBottom: 8, opacity: 0.7 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg-strong)" }}>Ranking estadual completo</div>
          <div style={{ fontSize: 10.5, color: "var(--fg-faint)", marginTop: 4, letterSpacing: "0.04em" }}>645 munis · 18 amostradas no heatmap</div>
        </div>
        <div style={{ padding: "10px 12px", background: "var(--bg-card)", border: "1px solid var(--rule)", borderRadius: 8, opacity: 0.7 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fg-strong)" }}>Histórico do score</div>
          <div style={{ fontSize: 10.5, color: "var(--fg-faint)", marginTop: 4, letterSpacing: "0.04em" }}>Variação semanal por comissão</div>
        </div>
      </aside>

      <main style={{ background: "var(--bg-page)", display: "flex", flexDirection: "column", alignItems: "center", padding: 32, overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 720, marginBottom: 18, display: "grid", gridTemplateColumns: "1fr auto", gap: 18, alignItems: "end" }}>
          <h1 style={{ fontFamily: "Inter", fontSize: 30, fontWeight: 800, color: "var(--fg-strong)", margin: 0, letterSpacing: "-0.02em" }}>
            <span style={{ display: "block", fontSize: 11, color: "var(--fg-faint)", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 6 }}>
              Score · Saúde da Comissão Municipal
            </span>
            {comissao.nm}, {comissao.uf}
          </h1>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 72, lineHeight: 1, letterSpacing: "0.02em", color: tierColor(tier) }}>
            {score}
            <small style={{ fontSize: 16, color: "var(--fg-faint)", fontFamily: "Inter", fontWeight: 600 }}>
              /100 · {tierLbl}
            </small>
          </div>
        </div>
        <HexagonSVG comissao={comissao} />
        <HexLegend comissao={comissao} />
      </main>

      <HexFlags comissao={comissao} />
    </div>
  );
}

/* ============================================================
 * VIEW 2 · HEATMAP SP (versão simplificada · drill-down ranking)
 * Mockup tem SVG geográfico SP (linhas 230-358 do app.js); por ora aqui
 * lista os 18 municípios sample com mesmo dado e seleciona pra detalhe.
 * ============================================================ */

function ViewMap({ activeId, setActive }) {
  const all = NOMINATA_SECUNDARIAS;
  const groups = useMemo(() => {
    const ok = all.filter((c) => c.tier === "ok").length;
    const hi = all.filter((c) => c.tier === "high").length;
    const cr = all.filter((c) => c.tier === "crit").length;
    const med = Math.round(all.reduce((s, c) => s + c.score, 0) / all.length);
    return { ok, hi, cr, med };
  }, [all]);
  const sel = all.find((c) => c.id === activeId) || all[0];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 320px", height: "100%" }}>
      <aside style={{ background: "var(--bg-sidebar)", borderRight: "1px solid var(--rule)", overflowY: "auto", padding: "16px 18px" }}>
        <h3 style={hexH3}>Legenda</h3>
        {[
          ["#22c55e", "Saudável", "score ≥ 75"],
          ["#f59e0b", "Atenção", "55 ≤ score < 75"],
          ["#f87171", "Crítica", "score < 55"],
        ].map(([cor, lbl, sub]) => (
          <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11.5, color: "var(--fg)", padding: "6px 0" }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: cor }} />
            <div>
              <b style={{ color: "var(--fg-strong)", fontWeight: 600 }}>{lbl}</b>
              <div style={{ fontSize: 10, color: "var(--fg-faint)" }}>{sub}</div>
            </div>
          </div>
        ))}
        <h3 style={{ ...hexH3, marginTop: 18 }}>Resumo SP · 18 amostras</h3>
        {[
          ["Saudáveis", groups.ok],
          ["Atenção", groups.hi],
          ["Críticas", groups.cr],
          ["Score médio", `${groups.med}/100`],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 11.5, borderBottom: "1px solid var(--rule)" }}>
            <b style={{ fontWeight: 600, color: "var(--fg-strong)" }}>{k}</b>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--fg)", fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </aside>

      <div style={{ position: "relative", background: "var(--bg-page)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 24 }}>
        <svg viewBox="0 0 700 720" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)" }}>
          {/* contorno SP simplificado */}
          <path
            d="M 100 380 Q 180 240, 320 220 Q 440 220, 580 280 Q 660 340, 640 460 Q 600 580, 480 620 Q 320 640, 200 580 Q 80 500, 100 380 Z"
            fill="var(--bg-card)"
            stroke="var(--rule-strong)"
            strokeWidth={1.5}
          />
          {/* municípios como círculos por tier */}
          {NOMINATA_SECUNDARIAS.map((c) => (
            <g key={c.id} onClick={() => setActive(c.id)} style={{ cursor: "pointer" }}>
              <circle
                cx={c.x}
                cy={c.y}
                r={Math.max(8, Math.log10(c.pop / 1000) * 4)}
                fill={tierColor(c.tier)}
                fillOpacity={c.id === sel.id ? 0.9 : 0.55}
                stroke={c.id === sel.id ? "var(--fg-strong)" : "transparent"}
                strokeWidth={2}
              />
              {(c.tier === "crit" || c.id === sel.id) && (
                <text
                  x={c.x}
                  y={c.y - 14}
                  textAnchor="middle"
                  fontFamily="Inter"
                  fontSize={9.5}
                  fontWeight={700}
                  fill="var(--fg-strong)"
                  letterSpacing="0.04em"
                >
                  {c.nm}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      <aside style={{ background: "var(--bg-sidebar)", borderLeft: "1px solid var(--rule)", overflowY: "auto", padding: "16px 18px" }}>
        <h3 style={hexH3}>Município selecionado</h3>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--rule)", borderRadius: 10, padding: 14, marginTop: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-strong)" }}>{sel.nm}</div>
          <div style={{ fontSize: 10.5, color: "var(--fg-faint)", marginTop: 2, letterSpacing: "0.04em" }}>
            {fmt(sel.pop)} habitantes · UB-SP
          </div>
          <div style={{ marginTop: 10 }}>
            {[
              ["Score saúde", `${sel.score}/100`],
              ["Tier", tierLabel(sel.tier)],
              ["População", fmt(sel.pop)],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  padding: "6px 0",
                  fontSize: 11.5,
                  borderBottom: "1px solid var(--hairline)",
                }}
              >
                <b style={{ color: "var(--fg)", fontWeight: 600 }}>{k}</b>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            marginTop: 14,
            padding: 12,
            fontSize: 10.5,
            color: "var(--fg-muted)",
            background: "var(--bg-card-2)",
            border: "1px dashed var(--rule)",
            borderRadius: 8,
            lineHeight: 1.5,
          }}
        >
          <b style={{ color: "var(--fg-strong)" }}>Mapa SVG geográfico SP:</b> 645 contornos municipais via GeoJSON IBGE.
          Versão atual usa círculos posicionados (Designer mockup linha 392). Próxima sprint: importar geojson real.
        </div>
      </aside>
    </div>
  );
}

/* ============================================================
 * VIEW 3 · RANKING — 3 cards âncora + tabela
 * ============================================================ */

function RankCard({ comissao }) {
  const score = calcScore(comissao.scores);
  const tier = comissao.tier;
  const flags = comissao.flags;
  const stats = [
    ["Filiados",   fmt(comissao.filiados)],
    ["Candidatos", String(comissao.candidatos)],
    ["População",  fmt(comissao.pop)],
    ["Mandato",    comissao.mandato],
  ];
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--rule)",
        borderRadius: 12,
        overflow: "hidden",
        borderTop: `4px solid ${tier === "ok" ? "#22c55e" : tier === "high" ? "#f59e0b" : "#dc2626"}`,
      }}
    >
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--rule)", display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "var(--tenant-primary)", color: "var(--tenant-accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 14,
          }}
        >
          {comissao.pres.av}
        </div>
        <div>
          <b style={{ fontSize: 14, color: "var(--fg-strong)", display: "block", fontWeight: 700 }}>{comissao.nm}, {comissao.uf}</b>
          <span style={{ fontSize: 10.5, color: "var(--fg-faint)" }}>{comissao.pres.nm} · {tierLabel(tier)}</span>
        </div>
      </div>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--rule)", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center" }}>
        <div style={{ fontSize: 9.5, letterSpacing: "0.16em", color: "var(--fg-faint)", textTransform: "uppercase", fontWeight: 700 }}>
          Score saúde
        </div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, lineHeight: 1, color: tierColor(tier) }}>
          {score}
          <small style={{ fontSize: 13, color: "var(--fg-faint)", fontFamily: "Inter", fontWeight: 600 }}>/100</small>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        {stats.map(([k, v], i) => (
          <div
            key={k}
            style={{
              padding: "10px 14px",
              borderRight: i % 2 === 0 ? "1px solid var(--rule)" : "0",
              borderBottom: i < 2 ? "1px solid var(--rule)" : "0",
            }}
          >
            <div style={{ fontSize: 9, letterSpacing: "0.10em", color: "var(--fg-faint)", textTransform: "uppercase", fontWeight: 600 }}>{k}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--fg-strong)", fontWeight: 700, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 18px" }}>
        <div style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--fg-faint)", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
          Sinalizações ({flags.length})
        </div>
        {flags.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--ok)", fontWeight: 600 }}>✓ Nenhuma sinalização ativa.</div>
        ) : (
          flags.slice(0, 4).map((f, i) => (
            <div
              key={i}
              style={{
                fontSize: 11, color: "var(--fg)", padding: "5px 0",
                borderBottom: "1px solid var(--hairline)", lineHeight: 1.4,
                display: "grid", gridTemplateColumns: "14px 1fr", gap: 6,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 10, color: f.tipo === "danger" ? "var(--danger)" : "var(--warn)" }}>
                {f.tipo === "danger" ? "✗" : "!"}
              </span>
              <span>{f.label}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ViewRank() {
  return (
    <div style={{ padding: "24px 28px", overflowY: "auto", height: "100%", background: "var(--bg-page)" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--fg-strong)", margin: 0, letterSpacing: "-0.02em" }}>
          <span style={{ display: "block", fontSize: 11, color: "var(--fg-faint)", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 6 }}>
            Ranking · 3 casos âncora
          </span>
          Comparação lado a lado
        </h1>
        <p style={{ fontSize: 12.5, color: "var(--fg-muted)", margin: "8px 0 0", maxWidth: 720, lineHeight: 1.55 }}>
          3 comissões municipais SP calibradas pra validar o método: <b style={{ color: "var(--fg-strong)" }}>Bauru</b> (saudável),{" "}
          <b style={{ color: "var(--fg-strong)" }}>Marília</b> (atenção) e <b style={{ color: "var(--fg-strong)" }}>Tatuí</b> (crítica · diligência aberta).
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 28 }}>
        {NOMINATA_COMISSOES.map((c) => <RankCard key={c.id} comissao={c} />)}
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--rule)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", margin: 0, fontSize: 13, color: "var(--fg-strong)", fontWeight: 700, borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Tabela amostral · 18 municípios SP
          <span style={{ fontSize: 10.5, color: "var(--fg-faint)", fontWeight: 500, letterSpacing: "0.04em" }}>
            ordenado por score ↓
          </span>
        </div>
        {[...NOMINATA_SECUNDARIAS].sort((a, b) => b.score - a.score).map((c, i) => (
          <div
            key={c.id}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 110px 110px 100px",
              padding: "11px 18px",
              gap: 12,
              borderBottom: "1px solid var(--hairline)",
              alignItems: "center",
              fontSize: 12,
              cursor: "pointer",
              transition: "background 80ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "var(--fg-faint)", fontWeight: 700 }}>
              #{String(i + 1).padStart(2, "0")}
            </div>
            <div style={{ fontWeight: 600, color: "var(--fg-strong)" }}>
              {c.nm}
              <small style={{ display: "block", fontSize: 10, color: "var(--fg-faint)", fontWeight: 500, marginTop: 1 }}>
                {fmt(c.pop)} hab
              </small>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--fg-muted)" }}>
              tier {tierLabel(c.tier).toLowerCase()}
            </div>
            <div style={{ height: 6, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${c.score}%`, background: tierColor(c.tier) }} />
            </div>
            <div
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 18,
                padding: "1px 9px",
                borderRadius: 4,
                textAlign: "center",
                background: c.tier === "ok" ? "rgba(34,197,94,0.15)" : c.tier === "high" ? "rgba(245,158,11,0.15)" : "rgba(220,38,38,0.18)",
                color: tierColor(c.tier),
              }}
            >
              {c.score}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 * VIEW 4 · DOSSIÊ COMISSÃO — caso âncora Tatuí (diligência aberta)
 * ============================================================ */

const DOSSIE_TOC = [
  { num: "01", id: "ident",  label: "Identificação" },
  { num: "02", id: "subm",   label: "Sub-medidas" },
  { num: "03", id: "sinal",  label: "Sinalizações" },
  { num: "04", id: "pulso",  label: "Pulso de filiação" },
  { num: "05", id: "crono",  label: "Cronologia" },
  { num: "06", id: "compl",  label: "Conformidade jurídica" },
  { num: "07", id: "rec",    label: "Recomendações Mazzel" },
];

function ViewDossie() {
  const [tocActive, setTocActive] = useState("ident");
  const c = NOMINATA_COMISSOES.find((c) => c.id === "tatui");
  const score = calcScore(c.scores);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", height: "100%" }}>
      <aside style={{ background: "var(--bg-sidebar)", borderRight: "1px solid var(--rule)", overflowY: "auto", padding: "22px 16px" }}>
        <h3 style={{ ...hexH3, padding: "0 4px" }}>Seções</h3>
        {DOSSIE_TOC.map((t) => {
          const isActive = tocActive === t.id;
          return (
            <a
              key={t.id}
              href={`#sec-${t.id}`}
              onClick={() => setTocActive(t.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "24px 1fr",
                gap: 8,
                padding: "8px 12px",
                paddingLeft: isActive ? 9 : 12,
                borderRadius: 6,
                fontSize: 11.5,
                color: isActive ? "var(--fg-strong)" : "var(--fg-muted)",
                background: isActive ? "var(--tenant-primary-soft, rgba(0,42,123,0.18))" : "transparent",
                borderLeft: isActive ? "3px solid var(--tenant-accent)" : "0",
                textDecoration: "none",
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: isActive ? "var(--tenant-accent)" : "var(--fg-faint)",
                  fontWeight: 700,
                }}
              >
                {t.num}
              </span>
              {t.label}
            </a>
          );
        })}
      </aside>

      <div style={{ overflowY: "auto", padding: 0, background: "var(--bg-page)" }}>
        {/* Hero */}
        <div style={{ padding: "28px 32px", borderBottom: "1px solid var(--rule)", display: "grid", gridTemplateColumns: "1fr 320px", gap: 22 }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "3px 9px", background: "var(--bg-card)", borderRadius: 4, color: "var(--fg-faint)", fontWeight: 700, letterSpacing: "0.04em" }}>
                COM-{c.uf}-{c.id.toUpperCase()}
              </span>
              <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 999, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: "rgba(248,113,113,0.14)", color: "var(--danger)" }}>
                Diligência aberta
              </span>
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: "var(--fg-strong)", margin: "6px 0 8px", letterSpacing: "-0.02em" }}>
              {c.nm}, {c.uf}
            </h1>
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              <b style={{ color: "var(--fg)", fontWeight: 600 }}>{c.pres.nm}</b> · {c.pres.cargo}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--rule)" }}>
              {[
                ["Mandato", c.mandato],
                ["População", fmt(c.pop)],
                ["Filiados ativos", fmt(c.filiados)],
                ["Candidatos na nominata", String(c.candidatos)],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--fg-faint)", textTransform: "uppercase", fontWeight: 700 }}>{k}</div>
                  <div style={{ fontSize: 13, color: "var(--fg-strong)", fontWeight: 600, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--rule)", borderRadius: 12, padding: 20 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 64, lineHeight: 1, letterSpacing: "0.02em", color: tierColor(c.tier) }}>
              {score}
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--fg-faint)", textTransform: "uppercase", fontWeight: 700 }}>
              Score saúde
            </div>
            <hr style={{ border: 0, borderTop: "1px solid var(--rule)", margin: "14px 0" }} />
            <div style={{ fontSize: 14, color: "var(--fg-strong)", fontWeight: 700, margin: "0 0 4px" }}>{tierLabel(c.tier)}</div>
            <div style={{ fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.45 }}>
              Comissão com múltiplas sinalizações ativas e prestação de contas TSE em mora prolongada. Ação imediata recomendada antes da janela de registro 2026.
            </div>
          </div>
        </div>

        {/* Section 02 · Sub-medidas */}
        <div id="sec-subm" style={{ padding: "24px 32px", borderBottom: "1px solid var(--rule)" }}>
          <h2 style={dossieSecH2}>
            <span style={dossieSecNum}>02</span>
            Sub-medidas
            <span style={dossieSecExtra}>7 dimensões · score ponderado</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {NOMINATA_SUBMEDIDAS.map((sm) => {
              const v = c.scores[sm.key];
              const t = tierFromScore(v);
              return (
                <div key={sm.key} style={{ background: "var(--bg-card)", border: "1px solid var(--rule)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--fg-faint)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>{sm.nm}</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, lineHeight: 1, color: tierColor(t), letterSpacing: "0.02em" }}>{v}</div>
                  <div style={{ fontSize: 10.5, color: "var(--fg-muted)", marginTop: 4, lineHeight: 1.4 }}>{sm.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 03 · Sinalizações */}
        <div id="sec-sinal" style={{ padding: "24px 32px", borderBottom: "1px solid var(--rule)" }}>
          <h2 style={dossieSecH2}>
            <span style={dossieSecNum}>03</span>
            Sinalizações ativas
            <span style={dossieSecExtra}>{c.flags.length} sinalizações</span>
          </h2>
          {c.flags.map((f, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--rule)",
                borderLeft: `3px solid ${f.tipo === "danger" ? "#dc2626" : "#f59e0b"}`,
                borderRadius: 10,
                padding: "12px 14px",
                display: "grid",
                gridTemplateColumns: "36px 1fr",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
                  background: f.tipo === "danger" ? "rgba(248,113,113,0.14)" : "rgba(251,191,36,0.14)",
                  color: f.tipo === "danger" ? "var(--danger)" : "var(--warn)",
                }}
              >
                {f.tipo === "danger" ? "!" : "⚠"}
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--fg)", lineHeight: 1.5 }}>{f.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Section 04 · Pulso de filiação */}
        <div id="sec-pulso" style={{ padding: "24px 32px", borderBottom: "1px solid var(--rule)" }}>
          <h2 style={dossieSecH2}>
            <span style={dossieSecNum}>04</span>
            Pulso de filiação
            <span style={dossieSecExtra}>histórico 90 dias</span>
          </h2>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--rule)", borderLeft: "3px solid var(--danger)", borderRadius: 10, padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                ["18/03/2025 (1 dia)", "412 filiações", "var(--danger)"],
                ["Média móvel 90d", "~20 / dia", "var(--fg-strong)"],
                ["Desvio padrão", "21× acima · pulse > 5σ", "var(--danger)"],
              ].map(([k, v, color]) => (
                <div key={k}>
                  <div style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--fg-faint)", textTransform: "uppercase", fontWeight: 700 }}>{k}</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, lineHeight: 1, color, letterSpacing: "0.02em", marginTop: 4 }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 12, lineHeight: 1.5, padding: 12, background: "var(--bg-card-2)", borderRadius: 6 }}>
              <b style={{ color: "var(--fg)", fontWeight: 600 }}>Padrão atípico detectado.</b> Pode indicar mobilização legítima (campanha de filiação local) OU lista pré-fabricada. Linguagem neutra · investigação manual obrigatória.
            </div>
          </div>
        </div>

        {/* Section 06 · Conformidade jurídica */}
        <div id="sec-compl" style={{ padding: "24px 32px", borderBottom: "1px solid var(--rule)" }}>
          <h2 style={dossieSecH2}>
            <span style={dossieSecNum}>06</span>
            Conformidade jurídica
            <span style={dossieSecExtra}>3 itens críticos</span>
          </h2>
          {[
            ["Lei 9.504/97 art.10§3", "Cota de gênero", "18% mulheres · mínimo legal 30%", "danger"],
            ["LC 135/2010 (Ficha Limpa)", "4 candidatos com pendência", "Validação CNJ + TJ-SP + TRE em curso", "danger"],
            ["Prestação contas TSE 2024", "Em mora há 4 meses", "Risco de indeferimento da nominata 2026", "danger"],
          ].map(([norma, item, situacao, tipo], i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--rule)",
                borderLeft: `3px solid ${tipo === "danger" ? "#dc2626" : "#f59e0b"}`,
                borderRadius: 10,
                padding: 14,
                marginBottom: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-faint)", letterSpacing: "0.06em", fontWeight: 700, textTransform: "uppercase" }}>
                  {norma}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: tipo === "danger" ? "var(--danger)" : "var(--warn)" }}>
                  {tipo === "danger" ? "Crítico" : "Atenção"}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-strong)", marginTop: 4 }}>{item}</div>
              <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4, lineHeight: 1.5 }}>{situacao}</div>
            </div>
          ))}
        </div>

        {/* Section 07 · Recomendações Mazzel */}
        <div id="sec-rec" style={{ padding: "24px 32px" }}>
          <h2 style={dossieSecH2}>
            <span style={dossieSecNum}>07</span>
            Recomendações Mazzel
            <span style={dossieSecExtra}>sequência sugerida</span>
          </h2>
          <ol style={{ paddingLeft: 24, fontSize: 12, color: "var(--fg)", lineHeight: 1.7 }}>
            <li>Auditar manualmente as <b>412 filiações de 18/03/2025</b> · cruzar com base TSE e validar autenticidade.</li>
            <li>Notificar Pres Estadual sobre <b>diligência aberta</b> · habilitar canal sigiloso pra coordenação jurídica.</li>
            <li>Protocolar <b>prestação de contas TSE 2024</b> em até 30 dias · sob pena de indeferimento da nominata 2026.</li>
            <li>Substituir 4 candidaturas com Ficha Limpa pendente · validar substitutos pelo cruzamento CNJ.</li>
            <li>Adicionar 2 candidaturas femininas pra atender cota mínima de 30%.</li>
            <li>Validar domicílio eleitoral dos 9 candidatos com endereço externo · oficializar substituições se incoerente.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

const dossieSecH2 = {
  fontFamily: "Inter",
  fontSize: 18,
  fontWeight: 700,
  color: "var(--fg-strong)",
  margin: "0 0 14px",
  display: "flex",
  alignItems: "center",
  gap: 12,
  letterSpacing: "-0.01em",
};
const dossieSecNum = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  color: "var(--tenant-accent)",
  padding: "3px 7px",
  background: "var(--tenant-accent-soft, rgba(255,204,0,0.16))",
  borderRadius: 4,
  fontWeight: 700,
  letterSpacing: "0.06em",
};
const dossieSecExtra = {
  marginLeft: "auto",
  fontSize: 10,
  color: "var(--fg-faint)",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
};

/* ============================================================
 * VIEW 5 · ALERTAS ANTI-FRAUDE — feed agrupado + side regras
 * Linguagem NEUTRA · "padrão atípico", nunca "fraude"
 * ============================================================ */

function ViewAlertas() {
  const groups = useMemo(() => {
    const g = { AGORA: [], "24h": [], semana: [] };
    NOMINATA_ALERTAS.forEach((a) => { (g[a.when_tag] || g["24h"]).push(a); });
    return g;
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", height: "100%" }}>
      <main style={{ padding: "24px 28px", overflowY: "auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--fg-strong)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          <span style={{ display: "block", fontSize: 11, color: "var(--fg-faint)", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 4 }}>
            Anti-fraude · linguagem neutra
          </span>
          Feed de alertas
        </h2>

        <div
          style={{
            background: "var(--bg-card)",
            borderLeft: "3px solid var(--tenant-accent)",
            padding: "10px 14px",
            borderRadius: "0 8px 8px 0",
            margin: "18px 0 22px",
            fontSize: 11.5,
            color: "var(--fg-muted)",
            lineHeight: 1.55,
          }}
        >
          Linguagem desta tela é <b style={{ color: "var(--fg)" }}>estritamente neutra</b>. Usamos termos como
          "padrão atípico detectado", "concentração de origem geográfica", "pulso de filiação". Nunca "fraude" ou "crime" —
          a investigação manual é obrigatória pra qualificar qualquer caso.
        </div>

        {Object.entries(groups).map(([tag, alertas]) => (
          alertas.length > 0 && (
            <div key={tag} style={{ marginBottom: 22 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                  paddingBottom: 8,
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                <span style={{ fontSize: 10.5, color: "var(--fg-faint)", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 700 }}>
                  {tag === "AGORA" ? "Agora" : tag === "24h" ? "Últimas 24h" : "Esta semana"}
                </span>
                <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "var(--fg-faint)" }}>
                  {alertas.length} {alertas.length === 1 ? "alerta" : "alertas"}
                </span>
              </div>
              {alertas.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 1fr 200px",
                    gap: 14,
                    padding: 14,
                    background: "var(--bg-card)",
                    border: "1px solid var(--rule)",
                    borderLeft: `3px solid ${a.sev === "crit" ? "#dc2626" : a.sev === "high" ? "#f59e0b" : "#60a5fa"}`,
                    borderRadius: 10,
                    marginBottom: 8,
                    cursor: "pointer",
                    transition: "border-color 100ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--tenant-accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--rule)")}
                >
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
                      background: a.sev === "crit" ? "rgba(248,113,113,0.14)" : a.sev === "high" ? "rgba(251,191,36,0.14)" : "rgba(96,165,250,0.14)",
                      color: a.sev === "crit" ? "var(--danger)" : a.sev === "high" ? "var(--warn)" : "var(--accent-blue)",
                    }}
                  >
                    {a.sev === "crit" ? "!" : a.sev === "high" ? "⚠" : "ⓘ"}
                  </div>
                  <div>
                    <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9.5,
                          padding: "2px 7px",
                          borderRadius: 3,
                          letterSpacing: "0.10em",
                          fontWeight: 700,
                          background: a.sev === "crit" ? "rgba(248,113,113,0.14)" : a.sev === "high" ? "rgba(251,191,36,0.14)" : "rgba(96,165,250,0.14)",
                          color: a.sev === "crit" ? "var(--danger)" : a.sev === "high" ? "var(--warn)" : "var(--accent-blue)",
                        }}
                      >
                        {a.sev === "crit" ? "CRÍTICO" : a.sev === "high" ? "ALTO" : "MÉDIO"}
                      </span>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-strong)" }}>{a.titulo}</div>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 5, lineHeight: 1.5 }}>
                      {a.desc}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-faint)", marginTop: 6, letterSpacing: "0.04em" }}>
                      lógica: {a.logica}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", gap: 6 }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "var(--fg-faint)" }}>
                      {a.when}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {a.channels.map((ch) => (
                        <span
                          key={ch}
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 9,
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: "var(--bg-card-2)",
                            color: "var(--fg-muted)",
                            border: "1px solid var(--rule)",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            fontWeight: 700,
                          }}
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ))}
      </main>

      <aside style={{ background: "var(--bg-sidebar)", borderLeft: "1px solid var(--rule)", padding: "22px 20px", overflowY: "auto" }}>
        <h3 style={hexH3}>Regras configuradas · {NOMINATA_REGRAS.length}</h3>
        {NOMINATA_REGRAS.map((r, i) => (
          <div
            key={i}
            style={{
              padding: "12px 14px",
              background: "var(--bg-card)",
              border: "1px solid var(--rule)",
              borderLeft: `3px solid ${r.sev === "crit" ? "#dc2626" : r.sev === "high" ? "#f59e0b" : "#60a5fa"}`,
              borderRadius: 10,
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-strong)" }}>{r.nm}</div>
            <div style={{ fontSize: 10.5, color: "var(--fg-muted)", marginTop: 4, lineHeight: 1.45 }}>{r.desc}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {r.channels.map((ch) => (
                <span
                  key={ch}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    padding: "2px 6px",
                    borderRadius: 3,
                    background: "var(--bg-card-2)",
                    color: "var(--fg-muted)",
                    border: "1px solid var(--rule)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  {ch}
                </span>
              ))}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "var(--fg-faint)", marginTop: 4, letterSpacing: "0.04em" }}>
              freq: {r.freq}
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}

/* ============ Main export ============ */

export function SaudeNominatas() {
  const [tab, setTab] = useState("hex");
  const [activeHex, setActiveHex] = useState("tatui");  // start em Tatuí · caso mais didático
  const [activeMap, setActiveMap] = useState("tatui");

  return (
    <div style={{ display: "grid", gridTemplateRows: "56px 44px 1fr", height: "calc(100vh - 48px)", background: "var(--bg-page)" }}>
      <Topbar />
      <Tabs active={tab} onChange={setTab} />
      <div style={{ position: "relative", overflow: "hidden" }}>
        {tab === "hex"    && <ViewHex activeId={activeHex} setActive={setActiveHex} />}
        {tab === "map"    && <ViewMap activeId={activeMap} setActive={setActiveMap} />}
        {tab === "rank"   && <ViewRank />}
        {tab === "dossie" && <ViewDossie />}
        {tab === "ale"    && <ViewAlertas />}
      </div>
    </div>
  );
}
