"use client";

/* Módulo Emendas · 1:1 com Designer V1.2 (04-modulo-emendas.html + .data.js + .app.js)
 *
 * Substitui Emendas.jsx anterior (534 linhas, parcial - só Inconsistências/Alertas)
 * pelo módulo completo 5 abas + topbar Milton-CEO + Mapa SVG SP + Sankey + Dossiê.
 *
 * Caso âncora central: Santa Bárbara d'Oeste (SP) score 87 CRÍTICO -
 * EMD-2025-014729 · André Amaral (UNIÃO-PB) · R$ 35M · sem ligação eleitoral.
 *
 * 5 abas:
 *   01 Mapa de Emendas       (SVG SP com 20 municípios, hover G1, legenda coerência)
 *   02 Dossiê da Emenda      (TOC + body com 9 seções + toolbar designar operação)
 *   03 Fluxo · Sankey         (autor → órgão → cidade · ondulações fluxo financeiro)
 *   04 Painel Inconsistências (5 emendas críticas com score + dimensões + motivos)
 *   05 Sistema de Alertas     (feed temporal + regras configuradas)
 */

import { useState } from "react";
import {
  TABS,
  TOPBAR_3_PERGUNTAS,
  MUNICIPIOS,
  PARLAMENTARES,
  EMENDAS,
  ALERTAS,
  REGRAS,
  STATUS_LABEL,
  TIER_COLOR,
  SEV_LABEL,
  SEV_COLOR,
} from "./dados";

const fmtBRL = (v) => "R$ " + (v / 1000000).toFixed(1).replace(".", ",") + "M";
const fmtBRLk = (v) => v >= 1000000 ? fmtBRL(v) : "R$ " + (v / 1000).toFixed(0) + "k";

export function Emendas() {
  const [tab, setTab] = useState("map");
  const [emendaId, setEmendaId] = useState("EMD-2025-014729");
  const emenda = EMENDAS.find((e) => e.id === emendaId);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)", overflow: "hidden", background: "var(--mz-bg-page)" }}>
      <TopbarMiltonCEO />
      <Subnav tab={tab} onTab={setTab} />

      <main style={{ flex: 1, overflowY: "auto" }}>
        {tab === "map"    && <MapaView onSelectEmenda={(id) => { setEmendaId(id); setTab("dossie"); }} />}
        {tab === "dossie" && <DossieView emenda={emenda} onBack={() => setTab("map")} />}
        {tab === "flux"   && <FluxoView />}
        {tab === "inc"    && <InconsistenciasView onSelectEmenda={(id) => { setEmendaId(id); setTab("dossie"); }} />}
        {tab === "alert"  && <AlertasView />}
      </main>
    </div>
  );
}

/* ============ TOPBAR MILTON-CEO ============ */
function TopbarMiltonCEO() {
  return (
    <div
      style={{
        background: "var(--mz-bg-topbar)",
        borderBottom: "1px solid var(--mz-rule)",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, background: "var(--mz-tenant-primary)", border: "1px solid var(--mz-tenant-accent)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bebas Neue, sans-serif", color: "var(--mz-tenant-accent)", fontSize: 14 }}>
          UB
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--mz-fg-strong)" }}>MAZZEL</div>
          <div style={{ fontSize: 9, color: "var(--mz-fg-faint)", letterSpacing: "0.10em", textTransform: "uppercase" }}>UNIÃO BRASIL · SP</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", display: "flex", alignItems: "center", gap: 8 }}>
        Mazzel Eleitoral
        <i style={{ color: "var(--mz-rule-strong)", fontStyle: "normal" }}>›</i>
        Módulos
        <i style={{ color: "var(--mz-rule-strong)", fontStyle: "normal" }}>›</i>
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>Emendas</b>
        <span style={{ marginLeft: 6, padding: "2px 10px", background: "var(--mz-tenant-primary-soft)", border: "1px solid var(--mz-tenant-accent-soft)", borderRadius: 999, fontSize: 9, color: "var(--mz-tenant-accent)", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" }}>
          Beta · sigiloso
        </span>
      </div>

      {/* Topbar Milton-CEO · 3 perguntas em ≤3s */}
      <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
        {TOPBAR_3_PERGUNTAS.map((p, i) => (
          <div
            key={i}
            style={{
              background: p.alert ? "rgba(220,38,38,0.10)" : p.warn ? "rgba(245,158,11,0.10)" : "var(--mz-bg-card)",
              border: p.alert ? "1px solid var(--mz-danger)" : p.warn ? "1px solid var(--mz-warn)" : "1px solid var(--mz-rule)",
              borderRadius: 8,
              padding: "8px 12px",
              minWidth: 160,
            }}
          >
            <div style={{ fontSize: 9, letterSpacing: "0.10em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700 }}>
              {p.lbl}
            </div>
            <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 20, color: p.alert ? "var(--mz-danger)" : p.warn ? "var(--mz-warn)" : "var(--mz-fg-strong)", letterSpacing: "0.02em", lineHeight: 1, marginTop: 2 }}>
              {p.v}
            </div>
            {p.sub && (
              <div style={{ fontSize: 9.5, color: "var(--mz-fg-faint)", marginTop: 2 }}>
                {p.sub}
              </div>
            )}
            {p.delta && (
              <div style={{ fontSize: 9.5, color: "var(--mz-fg-faint)", marginTop: 2, fontFamily: "JetBrains Mono, monospace" }}>
                {p.delta}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--mz-tenant-primary)", color: "var(--mz-tenant-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bebas Neue, sans-serif", fontSize: 12, fontWeight: 700 }}>
          M
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--mz-fg-strong)", fontWeight: 700, lineHeight: 1.1 }}>Milton</div>
          <div style={{ fontSize: 9, color: "var(--mz-fg-faint)" }}>Pres Estadual</div>
        </div>
      </div>
    </div>
  );
}

/* ============ SUBNAV (5 abas) ============ */
function Subnav({ tab, onTab }) {
  return (
    <div
      style={{
        background: "var(--mz-bg-topbar)",
        borderBottom: "1px solid var(--mz-rule)",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        gap: 0,
        flexShrink: 0,
      }}
    >
      {TABS.map((t) => {
        const ativo = t.id === tab;
        return (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "11px 16px",
              background: "none",
              border: 0,
              color: ativo ? "var(--mz-fg-strong)" : "var(--mz-fg-muted)",
              cursor: "pointer",
              borderBottom: ativo ? "2px solid var(--mz-tenant-accent)" : "2px solid transparent",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: ativo ? "var(--mz-tenant-accent)" : "var(--mz-fg-faint)", fontWeight: 700, letterSpacing: "0.08em" }}>
              {t.num}
            </span>
            {t.label}
            {t.badge && (
              <span style={{ background: "var(--mz-warn)", color: "#fff", fontSize: 9.5, fontWeight: 800, padding: "1px 5px", borderRadius: 8, minWidth: 16, textAlign: "center" }}>
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--mz-fg-muted)", padding: "4px 10px", border: "1px solid var(--mz-rule)", borderRadius: 999 }}>
        <span style={{ fontSize: 9, color: "var(--mz-fg-faint)", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 600 }}>UF</span>
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 700 }}>SP</b>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--mz-fg-muted)", padding: "4px 10px", border: "1px solid var(--mz-rule)", borderRadius: 999, marginLeft: 8 }}>
        <span style={{ fontSize: 9, color: "var(--mz-fg-faint)", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 600 }}>Período</span>
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 700 }}>2024-2026</b>
      </span>
    </div>
  );
}

/* ============ VIEW 1 · MAPA SVG SP ============ */
function MapaView({ onSelectEmenda }) {
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const muniSel = selected ? MUNICIPIOS.find((m) => m.id === selected) : null;
  const muniHov = hover ? MUNICIPIOS.find((m) => m.id === hover) : null;

  // Emendas relacionadas ao município selecionado
  const emendasMuni = muniSel ? EMENDAS.filter((e) => e.municipio === muniSel.id) : [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 320px", gap: 0, height: "100%" }}>
      {/* Left: rankings */}
      <aside style={{ background: "var(--mz-bg-sidebar)", borderRight: "1px solid var(--mz-rule)", padding: 16, overflowY: "auto" }}>
        <h3 style={{ fontSize: 9.5, letterSpacing: "0.16em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700, margin: "0 0 12px" }}>
          Top 5 inconsistências
        </h3>
        {[...MUNICIPIOS].sort((a, b) => b.score - a.score).slice(0, 5).map((m) => (
          <MuniRanking key={m.id} m={m} active={selected === m.id} onClick={() => setSelected(m.id)} />
        ))}
      </aside>

      {/* Centro: SVG SP */}
      <div style={{ position: "relative", background: "linear-gradient(180deg, rgba(0,42,123,0.04), transparent), var(--mz-bg-page)", overflow: "hidden" }}>
        <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
          {/* Outline SP esquemático */}
          <path
            d="M 100 200 L 240 150 L 380 140 L 500 130 L 620 160 L 720 200 L 800 280 L 850 360 L 870 440 L 850 520 L 800 580 L 720 620 L 600 640 L 480 630 L 380 600 L 280 540 L 180 460 L 130 360 L 100 280 Z"
            fill="var(--mz-bg-card-2)"
            stroke="var(--mz-rule-strong)"
            strokeWidth="1"
          />
          <text x="180" y="640" fontFamily="Bebas Neue" fontSize="36" fill="var(--mz-tenant-accent)" letterSpacing="0.10em" opacity="0.5">
            SÃO PAULO
          </text>

          {/* Municípios como círculos */}
          {MUNICIPIOS.map((m) => {
            const r = 6 + Math.log10(Math.max(50000, m.pop)) * 2;
            const col =
              m.status === "crit" ? "#dc2626" :
              m.status === "high" ? "#f59e0b" :
              m.score < 25       ? "#16a34a" :
                                    "#bbf7d0";
            const ativo = selected === m.id || hover === m.id;
            return (
              <g
                key={m.id}
                onClick={() => setSelected(m.id)}
                onMouseEnter={() => setHover(m.id)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              >
                {m.status === "crit" && (
                  <circle cx={m.x} cy={m.y} r={r + 8} fill={col} fillOpacity={0.15}>
                    <animate attributeName="r" from={r + 4} to={r + 14} dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="fill-opacity" from={0.25} to={0} dur="2.4s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={m.x} cy={m.y} r={r} fill={col} fillOpacity={ativo ? 1 : 0.85} stroke={ativo ? "#fff" : "var(--mz-bg-page)"} strokeWidth={ativo ? 2 : 1.5} />
                {m.status === "crit" && (
                  <text x={m.x} y={m.y + 3} textAnchor="middle" fontFamily="Bebas Neue" fontSize="11" fill="#fff" letterSpacing="0.04em">
                    {m.score}
                  </text>
                )}
              </g>
            );
          })}

          {/* Labels destaques */}
          {MUNICIPIOS.filter((m) => m.status === "crit" || m.status === "high" || m.id === "sp").map((m) => (
            <text key={m.id} x={m.x} y={m.y - 18} textAnchor="middle" fontFamily="Inter" fontSize="11" fontWeight="700" fill="var(--mz-fg-strong)" letterSpacing="0.04em">
              {m.nm}
            </text>
          ))}
        </svg>

        {/* Map controls */}
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <MapBtn>+</MapBtn>
          <MapBtn>−</MapBtn>
          <MapBtn>⊡</MapBtn>
        </div>

        {/* Hover meta G1-style */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            background: "var(--mz-bg-card)",
            border: "1px solid var(--mz-rule)",
            borderRadius: 8,
            padding: "10px 14px",
            minWidth: 240,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {muniHov ? (
            <>
              <b style={{ display: "block", fontSize: 14, color: "var(--mz-fg-strong)", fontWeight: 700 }}>{muniHov.nm}</b>
              <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", marginTop: 2 }}>{muniHov.area} · {(muniHov.pop / 1000).toFixed(0)}k hab</div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--mz-rule)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                <div>
                  <div style={{ fontSize: 9, color: "var(--mz-fg-faint)", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 700 }}>Total emendas</div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "var(--mz-fg-strong)" }}>{fmtBRL(muniHov.total)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "var(--mz-fg-faint)", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 700 }}>Score</div>
                  <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 18, color: muniHov.status === "crit" ? "var(--mz-danger)" : muniHov.status === "high" ? "var(--mz-warn)" : "var(--mz-ok)" }}>
                    {muniHov.score}
                  </div>
                </div>
              </div>
              {muniHov.flag && (
                <div style={{ marginTop: 6, padding: "6px 10px", background: "var(--mz-danger-soft)", borderRadius: 4, fontSize: 10.5, color: "var(--mz-danger)", fontWeight: 600 }}>
                  ⚠ {muniHov.flag}
                </div>
              )}
            </>
          ) : (
            <>
              <b style={{ display: "block", fontSize: 12, color: "var(--mz-fg-strong)" }}>Hover sobre município</b>
              <span style={{ fontSize: 10.5, color: "var(--mz-fg-faint)" }}>Passe o mouse sobre os círculos para ver detalhes G1-style.</span>
            </>
          )}
        </div>

        {/* Legenda */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            background: "var(--mz-bg-card)",
            border: "1px solid var(--mz-rule)",
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          <h4 style={{ fontSize: 9.5, letterSpacing: "0.16em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700, margin: "0 0 8px" }}>
            Coerência do volume
          </h4>
          <LegendaRow color="#16a34a" label="Coerente"             sub="com porte" />
          <LegendaRow color="#bbf7d0" label="Baixo"                  sub="cidade pequena" />
          <LegendaRow color="#f59e0b" label="Acima do esperado" />
          <LegendaRow color="#dc2626" label="Inconsistência"          sub="detectada" />
        </div>
      </div>

      {/* Right: emendas do município selecionado */}
      <aside style={{ background: "var(--mz-bg-sidebar)", borderLeft: "1px solid var(--mz-rule)", padding: 16, overflowY: "auto" }}>
        {muniSel ? (
          <>
            <h3 style={{ fontSize: 9.5, letterSpacing: "0.16em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700, margin: "0 0 12px" }}>
              {muniSel.nm} · {emendasMuni.length} emendas
            </h3>
            {emendasMuni.map((e) => (
              <EmendaMini key={e.id} e={e} onClick={() => onSelectEmenda(e.id)} />
            ))}
          </>
        ) : (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--mz-fg-faint)", fontSize: 11.5 }}>
            Clique em uma cidade no mapa para ver as emendas vinculadas.
          </div>
        )}
      </aside>
    </div>
  );
}

function MapBtn({ children }) {
  return (
    <button
      style={{
        width: 32,
        height: 32,
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        color: "var(--mz-fg)",
        borderRadius: 4,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function LegendaRow({ color, label, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginBottom: 4 }}>
      <span style={{ width: 12, height: 12, borderRadius: 2, background: color }} />
      <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{label}</b>
      {sub && <span style={{ color: "var(--mz-fg-faint)" }}>{sub}</span>}
    </div>
  );
}

function MuniRanking({ m, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr auto",
        gap: 10,
        padding: "10px 12px",
        background: active ? "var(--mz-tenant-primary-soft)" : "var(--mz-bg-card)",
        border: `1px solid ${active ? "var(--mz-tenant-accent)" : "var(--mz-rule)"}`,
        borderRadius: 6,
        marginBottom: 8,
        cursor: "pointer",
        alignItems: "center",
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 4, background: m.status === "crit" ? "var(--mz-danger-soft)" : m.status === "high" ? "var(--mz-warn-soft)" : "var(--mz-bg-elevated)", color: m.status === "crit" ? "var(--mz-danger)" : m.status === "high" ? "var(--mz-warn)" : "var(--mz-fg-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bebas Neue, sans-serif", fontSize: 14, fontWeight: 700 }}>
        {m.score}
      </div>
      <div style={{ minWidth: 0 }}>
        <b style={{ fontSize: 12, color: "var(--mz-fg-strong)", display: "block", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {m.nm}
        </b>
        <span style={{ fontSize: 10, color: "var(--mz-fg-faint)" }}>{fmtBRL(m.total)}</span>
      </div>
    </div>
  );
}

function EmendaMini({ e, onClick }) {
  const par = PARLAMENTARES[e.autor];
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderLeft: `3px solid ${TIER_COLOR[e.tier]}`,
        borderRadius: 6,
        padding: 10,
        marginBottom: 8,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: "var(--mz-tenant-accent)", fontWeight: 700 }}>
          {e.id}
        </span>
        <span style={{ marginLeft: "auto", fontFamily: "Bebas Neue, sans-serif", fontSize: 14, color: TIER_COLOR[e.tier] }}>
          {e.score}
        </span>
      </div>
      <b style={{ fontSize: 11, color: "var(--mz-fg-strong)", display: "block", fontWeight: 600, lineHeight: 1.3 }}>
        {e.titulo}
      </b>
      <div style={{ fontSize: 10, color: "var(--mz-fg-faint)", marginTop: 4 }}>
        {par?.nm} ({par?.partido}) · {fmtBRL(e.valor)}
      </div>
    </div>
  );
}

/* ============ VIEW 2 · DOSSIÊ ============ */
function DossieView({ emenda, onBack }) {
  if (!emenda) return null;
  const par = PARLAMENTARES[emenda.autor];

  const SECOES = [
    { id: "id",      num: "01", label: "Identificação" },
    { id: "score",   num: "02", label: "Score · 5 dimensões" },
    { id: "motivos", num: "03", label: "Motivos detectados" },
    { id: "autor",   num: "04", label: "Autor · padrão" },
    { id: "exec",    num: "05", label: "Execução · marcos" },
    { id: "audit",   num: "06", label: "Auditoria CGU" },
    { id: "muni",    num: "07", label: "Município · contexto" },
    { id: "orgao",   num: "08", label: "Órgão executor" },
    { id: "acoes",   num: "09", label: "Próximas ações" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 0, height: "100%" }}>
      <aside style={{ background: "var(--mz-bg-sidebar)", borderRight: "1px solid var(--mz-rule)", padding: 18, overflowY: "auto" }}>
        <h3 style={{ fontSize: 9.5, letterSpacing: "0.16em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700, margin: "0 0 12px" }}>
          Dossiê · navegação
        </h3>
        {SECOES.map((s, i) => (
          <a key={s.id} href={`#sec-${s.id}`} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 8, padding: "8px 10px", borderRadius: 6, fontSize: 11.5, color: i === 0 ? "var(--mz-fg-strong)" : "var(--mz-fg-muted)", background: i === 0 ? "var(--mz-tenant-primary-soft)" : "transparent", textDecoration: "none", marginBottom: 2, borderLeft: i === 0 ? "3px solid var(--mz-tenant-accent)" : undefined, paddingLeft: i === 0 ? 7 : 10 }}>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: i === 0 ? "var(--mz-tenant-accent)" : "var(--mz-fg-faint)", fontWeight: 700 }}>
              {s.num}
            </span>
            {s.label}
          </a>
        ))}
      </aside>

      <div style={{ overflowY: "auto", background: "var(--mz-bg-page)" }}>
        {/* Toolbar */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "var(--mz-bg-topbar)",
            borderBottom: "1px solid var(--mz-rule)",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            zIndex: 5,
          }}
        >
          <Btn onClick={onBack}>← Voltar ao Painel</Btn>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--mz-fg-muted)" }}>
            {emenda.id} · Câmara dos Deputados
          </span>
          <div style={{ flex: 1 }} />
          <Btn>📋 Copiar link</Btn>
          <Btn>📎 Documentos</Btn>
          <Btn danger>⚐ Marcar inconsistência</Btn>
          <Btn primary>⚖ Designar Operação</Btn>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 32px 48px" }}>
          {/* Hero */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 22, marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid var(--mz-rule)" }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, padding: "3px 9px", background: "var(--mz-bg-card)", borderRadius: 4, color: "var(--mz-fg-faint)", fontWeight: 700 }}>
                  {emenda.id}
                </span>
                <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 999, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--mz-danger-soft)", color: "var(--mz-danger)" }}>
                  INCONSISTÊNCIA · SCORE {emenda.score}
                </span>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--mz-fg-strong)", margin: "6px 0 8px", letterSpacing: "-0.02em" }}>
                {emenda.titulo}
              </h1>
              <div style={{ fontSize: 12, color: "var(--mz-fg-muted)" }}>
                Por <b style={{ color: "var(--mz-fg)" }}>{par?.nm}</b> ({par?.partido}-{par?.uf}) ·{" "}
                Município <b style={{ color: "var(--mz-fg)" }}>{MUNICIPIOS.find((m) => m.id === emenda.municipio)?.nm}</b> ·{" "}
                <b style={{ color: "var(--mz-fg)" }}>{fmtBRL(emenda.valor)}</b> ({emenda.rp})
              </div>
              {par?.nota && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--mz-danger-soft)", borderLeft: "3px solid var(--mz-danger)", borderRadius: "0 6px 6px 0", fontSize: 11.5, color: "var(--mz-fg)" }}>
                  ⚠ <b style={{ color: "var(--mz-danger)" }}>Nota:</b> {par.nota}
                </div>
              )}
            </div>
            <div style={{ background: "var(--mz-bg-card)", border: "1px solid var(--mz-danger)", borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700 }}>
                Score Inconsistência
              </div>
              <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 64, color: TIER_COLOR[emenda.tier], lineHeight: 1, letterSpacing: "0.02em" }}>
                {emenda.score}
              </div>
              <div style={{ fontSize: 14, color: TIER_COLOR[emenda.tier], fontWeight: 700, margin: "4px 0 8px" }}>
                {emenda.tier === "crit" ? "CRÍTICA" : emenda.tier === "high" ? "ATENÇÃO" : "OK"}
              </div>
              <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", lineHeight: 1.45 }}>
                Score 0-100 · 5 dimensões · cálculo audited.
              </div>
            </div>
          </div>

          {/* Sec 02 · Score 5 dimensões */}
          <Section num="02" titulo="Score · 5 dimensões">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              {[
                ["Volume",       emenda.dimensoes.volume,       "vs benchmark cidades similares"],
                ["Autor",        emenda.dimensoes.autor,         "ligação eleitoral + histórico"],
                ["Finalidade",   emenda.dimensoes.finalidade,    "NLP score 0-100 (alto = vago)"],
                ["Concentração", emenda.dimensoes.concentracao, "cluster autores → cidade"],
                ["Execução",     emenda.dimensoes.execucao,     "atrasos + sem nota fiscal"],
              ].map(([lbl, v, sub]) => {
                const cor = v >= 70 ? "#dc2626" : v >= 40 ? "#f59e0b" : "#16a34a";
                return (
                  <div key={lbl} style={{ background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700 }}>
                      {lbl}
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 800, color: cor, marginTop: 4, lineHeight: 1 }}>
                      {v}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--mz-fg-muted)", marginTop: 6, lineHeight: 1.4 }}>
                      {sub}
                    </div>
                    <div style={{ height: 4, background: "var(--mz-bg-elevated)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${v}%`, background: cor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Sec 03 · Motivos */}
          {emenda.motivos && emenda.motivos.length > 0 && (
            <Section num="03" titulo="Motivos detectados" extra={`${emenda.motivos.length} sinais`}>
              {emenda.motivos.map((m, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 12, padding: "12px 14px", background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderLeft: `3px solid ${m.tipo === "danger" ? "var(--mz-danger)" : "var(--mz-warn)"}`, borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, background: m.tipo === "danger" ? "var(--mz-danger-soft)" : "var(--mz-warn-soft)", color: m.tipo === "danger" ? "var(--mz-danger)" : "var(--mz-warn)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>
                    {m.tipo === "danger" ? "✕" : "!"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--mz-fg-strong)", fontWeight: 600, alignSelf: "center" }}>
                    {m.label}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* Sec 05 · Execução marcos */}
          <Section num="05" titulo="Execução · marcos" extra="cronologia">
            {[
              { lbl: "Apresentação",  v: emenda.data_apresentacao || "—", state: emenda.data_apresentacao ? "done" : "pending" },
              { lbl: "Aprovação",     v: emenda.data_aprovacao    || "—", state: emenda.data_aprovacao    ? "done" : "pending" },
              { lbl: "Empenho",       v: emenda.data_empenho      || "—", state: emenda.data_empenho      ? "done" : "pending" },
              { lbl: "Liquidação",    v: emenda.data_liquidacao   || "—", state: emenda.data_liquidacao   ? "done" : "pending" },
              { lbl: "Pagamento",     v: emenda.data_pagamento    || "—", state: emenda.data_pagamento    && emenda.data_pagamento !== "—" ? "done" : "pending" },
            ].map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px", gap: 14, padding: "10px 14px", background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 6, marginBottom: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mz-fg-strong)" }}>{s.lbl}</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--mz-fg)" }}>{s.v}</span>
                <span style={{ fontSize: 9.5, padding: "2px 8px", borderRadius: 999, background: s.state === "done" ? "var(--mz-ok-soft)" : "var(--mz-bg-elevated)", color: s.state === "done" ? "var(--mz-ok)" : "var(--mz-fg-faint)", fontWeight: 700, letterSpacing: "0.04em", textAlign: "center" }}>
                  {s.state === "done" ? "✓ FEITO" : "PENDENTE"}
                </span>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--mz-bg-card-2)", borderRadius: 6, fontSize: 11.5, color: "var(--mz-fg)" }}>
              <b style={{ color: "var(--mz-fg-strong)" }}>Status atual:</b> {STATUS_LABEL[emenda.status]} ·{" "}
              <b style={{ color: "var(--mz-fg-strong)" }}>Pago:</b> {fmtBRLk(emenda.valor_pago)} de {fmtBRL(emenda.valor)} ({Math.round((emenda.valor_pago / emenda.valor) * 100)}%)
            </div>
          </Section>

          {/* Sec 06 · Auditoria */}
          {emenda.auditoria && (
            <Section num="06" titulo="Auditoria CGU" extra="diligência aberta">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {Object.entries(emenda.auditoria).map(([k, v]) => (
                  <div key={k} style={{ background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 6, padding: "10px 14px" }}>
                    <div style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700 }}>
                      {k.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: 12, color: v === "Pendente" || v.includes("Não") || v === "Ausentes" ? "var(--mz-warn)" : "var(--mz-fg-strong)", fontWeight: 600, marginTop: 2 }}>
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ num, titulo, extra, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--mz-fg-strong)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 12, letterSpacing: "-0.01em" }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--mz-tenant-accent)", padding: "3px 7px", background: "var(--mz-tenant-accent-soft)", borderRadius: 4, fontWeight: 700, letterSpacing: "0.06em" }}>
          {num}
        </span>
        {titulo}
        {extra && (
          <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--mz-fg-faint)", fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase" }}>
            {extra}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

function Btn({ children, primary, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        padding: "7px 12px",
        borderRadius: 6,
        border: danger ? "1px solid var(--mz-danger)" : primary ? "1px solid var(--mz-tenant-primary-strong)" : "1px solid var(--mz-rule)",
        background: danger ? "var(--mz-danger-soft)" : primary ? "var(--mz-tenant-primary)" : "var(--mz-bg-card)",
        color: danger ? "var(--mz-danger)" : primary ? "#fff" : "var(--mz-fg)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* ============ VIEW 3 · FLUXO SANKEY ============ */
function FluxoView() {
  // Sankey simplificado: 3 colunas (autores → categorias → cidades)
  const flows = EMENDAS.map((e) => ({
    autor: PARLAMENTARES[e.autor]?.nm || e.autor,
    cat: e.categoria,
    cidade: MUNICIPIOS.find((m) => m.id === e.municipio)?.nm || e.municipio,
    valor: e.valor,
    tier: e.tier,
  }));

  const total = flows.reduce((acc, f) => acc + f.valor, 0);

  return (
    <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center" }}>
        <Pill lbl="Filtro" v="SP · 2024-2026" />
        <Pill lbl="Tipo" v="Individuais (RP-6) + Comissão (RP-8)" />
        <Pill lbl="Status" v="Todas" />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "var(--mz-fg-faint)", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 600 }}>
          3ª coluna
        </span>
        <div style={{ display: "flex", background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 6 }}>
          <button style={{ background: "var(--mz-tenant-primary)", color: "#fff", border: 0, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Município</button>
          <button style={{ background: "none", color: "var(--mz-fg-muted)", border: 0, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Órgão executor</button>
        </div>
      </div>

      {/* Sankey simplificado · 3 colunas com ondulações */}
      <div style={{ flex: 1, background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 12, padding: 24, overflow: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 0, alignItems: "stretch", minHeight: 480 }}>
          {/* Coluna 1 · Autores (deduplicados) */}
          <SankeyCol titulo="AUTORES" itens={uniqueByKey(flows, "autor").map((a) => ({ label: a.autor, total: sumByKey(flows, "autor", a.autor), color: "var(--mz-tenant-primary)" }))} total={total} />
          <FlowConnector />
          {/* Coluna 2 · Categorias */}
          <SankeyCol titulo="CATEGORIAS" itens={uniqueByKey(flows, "cat").map((a) => ({ label: a.cat, total: sumByKey(flows, "cat", a.cat), color: "var(--mz-tenant-accent)" }))} total={total} />
          <FlowConnector />
          {/* Coluna 3 · Cidades (com tier) */}
          <SankeyCol titulo="CIDADES" itens={uniqueByKey(flows, "cidade").map((a) => {
            const flow = flows.find((f) => f.cidade === a.cidade);
            return { label: a.cidade, total: sumByKey(flows, "cidade", a.cidade), color: TIER_COLOR[flow.tier] };
          })} total={total} />
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 18, fontSize: 11, color: "var(--mz-fg-muted)" }}>
        <span>Total fluxo: <b style={{ color: "var(--mz-fg-strong)" }}>{fmtBRL(total)}</b></span>
        <span>Volume crítico: <b style={{ color: "var(--mz-danger)" }}>{fmtBRL(EMENDAS.filter((e) => e.tier === "crit").reduce((a, e) => a + e.valor, 0))}</b></span>
        <span>Autores únicos: <b style={{ color: "var(--mz-fg-strong)" }}>{uniqueByKey(flows, "autor").length}</b></span>
        <span>Cidades atingidas: <b style={{ color: "var(--mz-fg-strong)" }}>{uniqueByKey(flows, "cidade").length}</b></span>
      </div>
    </div>
  );
}

function uniqueByKey(arr, k) {
  const seen = new Set();
  return arr.filter((it) => { if (seen.has(it[k])) return false; seen.add(it[k]); return true; });
}

function sumByKey(arr, k, val) {
  return arr.filter((it) => it[k] === val).reduce((a, it) => a + it.valor, 0);
}

function SankeyCol({ titulo, itens, total }) {
  return (
    <div>
      <h4 style={{ fontSize: 9.5, letterSpacing: "0.16em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700, margin: "0 0 12px" }}>
        {titulo}
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {itens.map((it) => {
          const pct = (it.total / total) * 100;
          const heightPx = Math.max(40, pct * 6);
          return (
            <div
              key={it.label}
              style={{
                background: it.color,
                color: "#fff",
                padding: "10px 14px",
                borderRadius: 6,
                fontSize: 11,
                minHeight: heightPx,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <b style={{ fontSize: 12, fontWeight: 700 }}>{it.label}</b>
              <span style={{ fontSize: 10, opacity: 0.85, fontFamily: "JetBrains Mono, monospace", marginTop: 2 }}>
                {fmtBRL(it.total)} · {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowConnector() {
  return (
    <div style={{ width: 60, position: "relative", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <svg viewBox="0 0 60 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        <path d="M 0 0 C 30 20, 30 80, 60 100 L 60 0 Z" fill="var(--mz-tenant-primary-soft)" />
        <path d="M 0 100 C 30 80, 30 20, 60 0 L 60 100 Z" fill="var(--mz-tenant-primary-soft)" />
      </svg>
    </div>
  );
}

function Pill({ lbl, v }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 999, fontSize: 11 }}>
      <span style={{ fontSize: 9, color: "var(--mz-fg-faint)", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 600 }}>{lbl}</span>
      <b style={{ color: "var(--mz-fg-strong)", fontWeight: 700 }}>{v}</b>
      <span style={{ color: "var(--mz-fg-faint)" }}>▾</span>
    </div>
  );
}

/* ============ VIEW 4 · INCONSISTÊNCIAS ============ */
function InconsistenciasView({ onSelectEmenda }) {
  const inconsistentes = EMENDAS.filter((e) => e.score >= 40).sort((a, b) => b.score - a.score);

  return (
    <div style={{ padding: 24 }}>
      {/* Header + filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--mz-fg-strong)", margin: 0, letterSpacing: "-0.015em" }}>
          Painel de Inconsistências
          <div style={{ fontSize: 12, color: "var(--mz-fg-muted)", fontWeight: 500, marginTop: 2, letterSpacing: 0 }}>
            Auditoria de anomalias · score 0-100
          </div>
        </h2>
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <Filter active label="Estado" v="SP" />
          <Filter label="Score ≥" v="40" />
          <Filter label="Valor ≥" v="R$ 10M" />
          <Filter label="Período" v="12 meses" />
          <Filter label="Categoria" v="Todas" />
        </div>
      </div>

      {/* Summary 4 cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <SummaryCard lbl="Inconsistências críticas" v={EMENDAS.filter((e) => e.tier === "crit").length} suffix=" emendas" warn />
        <SummaryCard lbl="Volume sob suspeita" v={fmtBRL(EMENDAS.filter((e) => e.tier === "crit").reduce((a, e) => a + e.valor, 0))} />
        <SummaryCard lbl="Cidades afetadas" v={new Set(EMENDAS.filter((e) => e.tier === "crit").map((e) => e.municipio)).size} suffix=" cidades" />
        <SummaryCard lbl="Autores envolvidos" v={new Set(EMENDAS.filter((e) => e.tier === "crit").map((e) => e.autor)).size} suffix=" parlamentares" />
      </div>

      {/* Lista de inconsistências */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {inconsistentes.map((e) => <IncCard key={e.id} e={e} onClick={() => onSelectEmenda(e.id)} />)}
      </div>
    </div>
  );
}

function Filter({ active, label, v }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: active ? "var(--mz-tenant-primary-soft)" : "var(--mz-bg-card)", border: `1px solid ${active ? "var(--mz-tenant-accent)" : "var(--mz-rule)"}`, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
      <span style={{ fontSize: 9, color: "var(--mz-fg-faint)", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
      <b style={{ color: active ? "var(--mz-tenant-accent)" : "var(--mz-fg-strong)", fontWeight: 700 }}>{v}</b>
    </div>
  );
}

function SummaryCard({ lbl, v, suffix, warn }) {
  return (
    <div style={{ background: "var(--mz-bg-card)", border: warn ? "1px solid var(--mz-danger)" : "1px solid var(--mz-rule)", borderRadius: 8, padding: 14 }}>
      <div style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700 }}>
        {lbl}
      </div>
      <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 28, color: warn ? "var(--mz-danger)" : "var(--mz-fg-strong)", lineHeight: 1, marginTop: 4, letterSpacing: "0.02em" }}>
        {v}
        {suffix && <small style={{ fontSize: 12, color: "var(--mz-fg-muted)", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>{suffix}</small>}
      </div>
    </div>
  );
}

function IncCard({ e, onClick }) {
  const par = PARLAMENTARES[e.autor];
  const muni = MUNICIPIOS.find((m) => m.id === e.municipio);
  const cor = TIER_COLOR[e.tier];

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderLeft: `4px solid ${cor}`,
        borderRadius: 8,
        padding: 16,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 16, alignItems: "center" }}>
        <div style={{ width: 56, height: 56, background: e.tier === "crit" ? "var(--mz-danger-soft)" : "var(--mz-warn-soft)", color: cor, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bebas Neue, sans-serif", fontSize: 28, fontWeight: 700 }}>
          {e.score}
        </div>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-tenant-accent)", fontWeight: 700 }}>
              {e.id}
            </span>
            <span style={{ fontSize: 9.5, padding: "2px 6px", background: "var(--mz-bg-elevated)", color: "var(--mz-fg-muted)", borderRadius: 3, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {e.categoria}
            </span>
          </div>
          <b style={{ fontSize: 14, color: "var(--mz-fg-strong)", display: "block", fontWeight: 600, lineHeight: 1.3 }}>
            {e.titulo}
          </b>
          <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", marginTop: 4 }}>
            <b style={{ color: "var(--mz-fg)" }}>{par?.nm}</b> ({par?.partido}-{par?.uf}) → <b style={{ color: "var(--mz-fg)" }}>{muni?.nm}</b>
          </div>
          {e.motivos && e.motivos.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {e.motivos.slice(0, 3).map((m, i) => (
                <span key={i} style={{ fontSize: 10, padding: "2px 7px", background: m.tipo === "danger" ? "var(--mz-danger-soft)" : "var(--mz-warn-soft)", color: m.tipo === "danger" ? "var(--mz-danger)" : "var(--mz-warn)", borderRadius: 3, fontWeight: 600 }}>
                  {m.tipo === "danger" ? "✕" : "!"} {m.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 22, color: "var(--mz-fg-strong)", lineHeight: 1 }}>
            {fmtBRL(e.valor)}
          </div>
          <div style={{ fontSize: 10, color: "var(--mz-fg-faint)", marginTop: 2, fontFamily: "JetBrains Mono, monospace" }}>
            pago: {fmtBRLk(e.valor_pago)} ({Math.round((e.valor_pago / e.valor) * 100)}%)
          </div>
        </div>
        <div>
          <span style={{ fontSize: 9.5, padding: "3px 8px", borderRadius: 999, background: cor, color: "#fff", fontWeight: 700, letterSpacing: "0.06em" }}>
            {e.tier === "crit" ? "CRÍTICA" : "ATENÇÃO"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ============ VIEW 5 · ALERTAS ============ */
function AlertasView() {
  const grupos = [
    { tag: "AGORA",   titulo: "Em curso · últimas 6h" },
    { tag: "24h",     titulo: "Últimas 24 horas" },
    { tag: "semana",  titulo: "Esta semana" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 0, height: "100%" }}>
      <main style={{ padding: 24, overflowY: "auto" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--mz-fg-strong)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Sistema de Alertas
          <div style={{ fontSize: 11, color: "var(--mz-fg-faint)", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", marginTop: 4 }}>
            Inconsistências detectadas em tempo real · linguagem neutra
          </div>
        </h2>

        <div style={{ background: "var(--mz-bg-card)", borderLeft: "3px solid var(--mz-tenant-accent)", padding: "10px 14px", borderRadius: "0 8px 8px 0", margin: "18px 0 22px", fontSize: 11.5, color: "var(--mz-fg-muted)", lineHeight: 1.55 }}>
          <b style={{ color: "var(--mz-fg)" }}>Nota de linguagem.</b> Os alertas usam linguagem neutra
          - "padrão atípico", "concentração coordenada", "volume acima do benchmark" - para sinalizar
          desvios estatísticos sem prejulgar intenção. Mazzel sinaliza, não acusa.
        </div>

        {grupos.map((g) => {
          const items = ALERTAS.filter((a) => a.when_tag === g.tag);
          if (!items.length) return null;
          return (
            <div key={g.tag} style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid var(--mz-rule)" }}>
                <div style={{ fontSize: 10.5, color: "var(--mz-fg-faint)", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 700 }}>
                  {g.titulo}
                </div>
                <div style={{ marginLeft: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--mz-fg-faint)" }}>
                  {items.length} alerta{items.length > 1 ? "s" : ""}
                </div>
              </div>
              {items.map((a) => <AlertaItem key={a.id} a={a} />)}
            </div>
          );
        })}
      </main>

      <aside style={{ background: "var(--mz-bg-sidebar)", borderLeft: "1px solid var(--mz-rule)", padding: 22, overflowY: "auto" }}>
        <h3 style={{ fontSize: 9.5, letterSpacing: "0.16em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700, margin: "0 0 14px" }}>
          Resumo · 30 dias
        </h3>
        {[
          ["Críticos",   3, "#dc2626"],
          ["Altos",      4, "#f59e0b"],
          ["Médios",     8, "#60a5fa"],
          ["Resolvidos", "9 / 15", "var(--mz-ok)"],
        ].map(([lbl, v, color]) => (
          <div key={lbl} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 11.5, borderBottom: "1px solid var(--mz-rule)" }}>
            <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{lbl}</b>
            <span style={{ fontFamily: "JetBrains Mono, monospace", color, fontWeight: 700 }}>{v}</span>
          </div>
        ))}

        <h3 style={{ fontSize: 9.5, letterSpacing: "0.16em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700, margin: "22px 0 14px" }}>
          Regras configuradas · {REGRAS.length}
        </h3>
        {REGRAS.map((r) => (
          <div key={r.nm} style={{ padding: "12px 14px", background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderLeft: `3px solid ${SEV_COLOR[r.sev]}`, borderRadius: 6, marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mz-fg-strong)" }}>{r.nm}</div>
            <div style={{ fontSize: 10.5, color: "var(--mz-fg-muted)", marginTop: 4, lineHeight: 1.45 }}>{r.desc}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {r.channels.map((ch) => (
                <span key={ch} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "var(--mz-bg-card-2)", color: "var(--mz-fg-muted)", border: "1px solid var(--mz-rule)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>
                  {ch}
                </span>
              ))}
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: "var(--mz-fg-faint)", marginTop: 4 }}>
              FREQ · {r.freq}
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}

function AlertaItem({ a }) {
  const cor = SEV_COLOR[a.sev];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 200px", gap: 14, padding: 14, background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderLeft: `3px solid ${cor}`, borderRadius: 6, marginBottom: 8 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", fontSize: 14, background: a.sev === "crit" ? "var(--mz-danger-soft)" : a.sev === "high" ? "var(--mz-warn-soft)" : "var(--mz-info-soft)", color: cor }}>
        {a.sev === "crit" ? "✕" : a.sev === "high" ? "!" : "i"}
      </div>
      <div>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, padding: "2px 7px", borderRadius: 3, letterSpacing: "0.10em", fontWeight: 700, background: a.sev === "crit" ? "var(--mz-danger-soft)" : a.sev === "high" ? "var(--mz-warn-soft)" : "var(--mz-info-soft)", color: cor }}>
            {SEV_LABEL[a.sev]}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--mz-fg-strong)" }}>{a.titulo}</span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--mz-fg-muted)", marginTop: 5, lineHeight: 1.5 }}>{a.desc}</div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-fg-faint)", marginTop: 6, letterSpacing: "0.04em" }}>
          TARGET: {a.target} · ID {a.id}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", gap: 6 }}>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--mz-fg-faint)" }}>{a.when}</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {a.channels.map((ch) => (
            <span key={ch} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "var(--mz-bg-card-2)", color: "var(--mz-fg-muted)", border: "1px solid var(--mz-rule)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>
              {ch}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
