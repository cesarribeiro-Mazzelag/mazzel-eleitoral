"use client";

/* Painel Pessoal Político · 1:1 com Designer V1.2 (05-painel-pessoal-politico.html)
 *
 * Caso âncora canônico: Rafael Rodrigues (vereador 3º mandato Líder
 * Bancada UB SP). Substitui Portal.jsx V1 antigo.
 *
 * Layout: sidebar 220px + main (top-bar + mode-tabs + 3 modes-pane)
 *
 * 3 Modes:
 *   1. Minha Vida Política (trajetória + métricas + performance SVG + próximos + reputação)
 *   2. Equipe Gabinete (5 stats + organograma 8 pessoas + cargos comissão + folha + alertas)
 *   3. Agenda Pessoal (calendário Abril 2026 + agenda hoje + conflitos)
 *
 * "Os dados aqui visíveis NÃO são compartilhados com o partido sem
 *  autorização explícita do político." - Designer
 */

import { useState } from "react";
import {
  POLITICO,
  TRAJETORIA,
  METRICAS_MANDATO,
  PERFORMANCE,
  INDICADORES_PRIVADOS,
  PROXIMOS,
  REPUTACAO,
  GAB_STATS,
  EQUIPE,
  FOLHA,
  SINAIS_ALERTA,
  CAL_ABR_2026,
  HOJE,
  NAV_PRIMARY,
  NAV_CIDADE,
  MODES,
} from "./dados";

export function PainelPessoal() {
  const [mode, setMode] = useState("my");

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "220px 1fr",
        minHeight: "calc(100vh - 48px)",
        background: "var(--mz-bg-page)",
      }}
    >
      <Sidebar />
      <main style={{ padding: 0 }}>
        <TopBar />
        <ModeTabs mode={mode} onMode={setMode} />
        {mode === "my"  && <ModeMy />}
        {mode === "gab" && <ModeGab />}
        {mode === "ag"  && <ModeAg />}
      </main>
    </div>
  );
}

/* ============ SIDEBAR ============ */
function Sidebar() {
  return (
    <aside
      style={{
        background: "var(--mz-bg-sidebar)",
        borderRight: "1px solid var(--mz-rule)",
        height: "calc(100vh - 48px)",
        position: "sticky",
        top: 48,
        overflowY: "auto",
      }}
    >
      {/* Persona card */}
      <div style={{ padding: 16, borderBottom: "1px solid var(--mz-rule)" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--mz-tenant-primary)",
            border: "2px solid var(--mz-tenant-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Bebas Neue, sans-serif",
            color: "var(--mz-tenant-accent)",
            fontSize: 22,
            marginBottom: 10,
          }}
        >
          {POLITICO.iniciais}
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--mz-fg-strong)" }}>{POLITICO.nome}</div>
        <div
          style={{
            fontSize: 10,
            color: "var(--mz-fg-faint)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            marginTop: 2,
          }}
        >
          {POLITICO.cargo}
        </div>
        <span
          style={{
            display: "inline-block",
            marginTop: 8,
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: 3,
            background: "var(--mz-tenant-accent)",
            color: "var(--mz-fg-on-accent)",
          }}
        >
          {POLITICO.pill}
        </span>
      </div>

      <NavSection titulo="Painel Pessoal" items={NAV_PRIMARY} />
      <NavSection titulo="Cidade" items={NAV_CIDADE} />
    </aside>
  );
}

function NavSection({ titulo, items }) {
  return (
    <div style={{ padding: "12px 8px", borderBottom: "1px solid var(--mz-rule)" }}>
      <h3
        style={{
          fontSize: 9.5,
          letterSpacing: "0.16em",
          color: "var(--mz-fg-faint)",
          textTransform: "uppercase",
          fontWeight: 700,
          margin: "0 10px 8px",
        }}
      >
        {titulo}
      </h3>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: it.active ? "7px 10px 7px 7px" : "7px 10px",
            cursor: "pointer",
            fontSize: 12,
            color: it.active ? "var(--mz-fg-strong)" : "var(--mz-fg)",
            borderRadius: 4,
            background: it.active ? "var(--mz-tenant-primary-soft)" : undefined,
            borderLeft: it.active ? "3px solid var(--mz-tenant-accent)" : undefined,
            fontWeight: it.active ? 700 : 400,
          }}
        >
          <span style={{ fontSize: 13, width: 18 }}>{it.ico}</span>
          {it.label}
          {it.qty && (
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9.5,
                color: it.warn ? "#fff" : "var(--mz-fg-faint)",
                background: it.warn ? "var(--mz-warn)" : undefined,
                padding: it.warn ? "1px 5px" : 0,
                borderRadius: 3,
                fontWeight: it.warn ? 800 : 400,
              }}
            >
              {it.qty}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============ TOP BAR ============ */
function TopBar() {
  return (
    <div
      style={{
        padding: "14px 24px",
        borderBottom: "1px solid var(--mz-rule)",
        background: "var(--mz-bg-topbar)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        position: "sticky",
        top: 0,
        zIndex: 5,
      }}
    >
      <div style={{ fontSize: 11.5, color: "var(--mz-fg-muted)", flex: 1 }}>
        Mazzel Eleitoral
        <span style={crumbSep}>›</span>
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>UB · São Paulo · SP</b>
        <span style={crumbSep}>›</span>
        Painel Pessoal
      </div>
      <Btn>⚙ Configurar</Btn>
      <Btn primary>+ Novo Compromisso</Btn>
    </div>
  );
}

const crumbSep = { margin: "0 6px", color: "var(--mz-rule-strong)" };

/* ============ MODE TABS ============ */
function ModeTabs({ mode, onMode }) {
  return (
    <div
      style={{
        padding: "0 24px",
        background: "var(--mz-bg-topbar)",
        borderBottom: "1px solid var(--mz-rule)",
        display: "flex",
        gap: 0,
      }}
    >
      {MODES.map((m) => {
        const ativo = m.id === mode;
        return (
          <button
            key={m.id}
            onClick={() => onMode(m.id)}
            style={{
              background: "none",
              border: 0,
              padding: "14px 18px",
              fontSize: 12,
              color: ativo ? "var(--mz-fg-strong)" : "var(--mz-fg-muted)",
              cursor: "pointer",
              borderBottom: ativo ? "2px solid var(--mz-tenant-accent)" : "2px solid transparent",
              fontWeight: 600,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                background: ativo ? "var(--mz-tenant-accent)" : "var(--mz-rule)",
                color: ativo ? "var(--mz-fg-on-accent)" : undefined,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9.5,
              }}
            >
              {m.num}
            </span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

/* ============ MODE 1 · MINHA VIDA POLÍTICA ============ */
function ModeMy() {
  return (
    <div>
      <SectionTitle h1="RAFAEL RODRIGUES">
        3º mandato como Vereador · Líder de Bancada UB · São Paulo. Painel privado consolidando
        trajetória política, performance no mandato atual e indicadores pessoais. Os dados aqui
        visíveis NÃO são compartilhados com o partido sem autorização explícita.
      </SectionTitle>

      <div style={{ padding: "22px 24px", display: "grid", gridTemplateColumns: "320px 1fr 320px", gap: 14 }}>
        {/* LEFT */}
        <ColCard>
          <H3>Trajetória Política</H3>
          {TRAJETORIA.map((t, i) => (
            <MandateRow key={i} {...t} last={i === TRAJETORIA.length - 1} />
          ))}
          <H3 style={{ marginTop: 24 }}>Métricas Mandato Atual</H3>
          <MetricsGrid items={METRICAS_MANDATO} />
        </ColCard>

        {/* CENTER */}
        <ColCard>
          <H3>Performance Eleitoral</H3>
          <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", marginBottom: 18 }}>
            Evolução de votos · 4 disputas eleitorais
          </div>
          <PerformanceSVG />
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 10.5 }}>
            <LegendItem color="var(--mz-tenant-accent)" label="Votos recebidos" />
            <LegendItem color="var(--mz-warn)" label="Não eleito" />
          </div>
          <H3 style={{ marginTop: 22 }}>Indicadores Privados</H3>
          <MetricsGrid items={INDICADORES_PRIVADOS} />
        </ColCard>

        {/* RIGHT */}
        <ColCard>
          <H3>Próximos · 7 Dias</H3>
          {PROXIMOS.map((p, i) => (
            <UpRow key={i} {...p} last={i === PROXIMOS.length - 1} />
          ))}
          <H3 style={{ marginTop: 22 }}>Reputação · Tempo Real</H3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {REPUTACAO.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ color: "var(--mz-fg-muted)" }}>{r.lbl}</span>
                <span
                  style={{
                    color: r.color || "var(--mz-fg-strong)",
                    fontFamily: r.mono ? "JetBrains Mono, monospace" : undefined,
                    fontWeight: r.bold ? 700 : 600,
                  }}
                >
                  {r.v}
                </span>
              </div>
            ))}
          </div>
        </ColCard>
      </div>
    </div>
  );
}

function PerformanceSVG() {
  // Linha + área + 4 pontos · 2014 não eleito (warn) · 2016/20/24 eleito (accent)
  return (
    <svg viewBox="0 0 600 220" preserveAspectRatio="none" style={{ width: "100%", height: 220 }}>
      <defs>
        <linearGradient id="grad-traj" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--mz-tenant-accent)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--mz-tenant-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="180" x2="600" y2="180" stroke="var(--mz-rule)" strokeWidth="1" />
      <line x1="0" y1="120" x2="600" y2="120" stroke="var(--mz-rule)" strokeWidth="1" strokeDasharray="2 4" />
      <line x1="0" y1="60"  x2="600" y2="60"  stroke="var(--mz-rule)" strokeWidth="1" strokeDasharray="2 4" />

      <text x="0" y="184" fontSize="9" fill="var(--mz-fg-faint)">0</text>
      <text x="0" y="124" fontSize="9" fill="var(--mz-fg-faint)">15k</text>
      <text x="0" y="64"  fontSize="9" fill="var(--mz-fg-faint)">30k</text>

      <polygon points="60,140 220,90 380,80 540,40 540,180 60,180" fill="url(#grad-traj)" />
      <polyline points="60,140 220,90 380,80 540,40" fill="none" stroke="var(--mz-tenant-accent)" strokeWidth="2.5" />

      <circle cx="60"  cy="140" r="6" fill="var(--mz-bg-card)" stroke="var(--mz-warn)" strokeWidth="2" />
      <circle cx="220" cy="90"  r="6" fill="var(--mz-bg-card)" stroke="var(--mz-tenant-accent)" strokeWidth="2" />
      <circle cx="380" cy="80"  r="6" fill="var(--mz-bg-card)" stroke="var(--mz-tenant-accent)" strokeWidth="2" />
      <circle cx="540" cy="40"  r="8" fill="var(--mz-tenant-accent)" stroke="var(--mz-bg-card)" strokeWidth="3" />

      <text x="60"  y="208" fontSize="10" fill="var(--mz-fg-muted)" textAnchor="middle">2014</text>
      <text x="220" y="208" fontSize="10" fill="var(--mz-fg-muted)" textAnchor="middle">2016</text>
      <text x="380" y="208" fontSize="10" fill="var(--mz-fg-muted)" textAnchor="middle">2020</text>
      <text x="540" y="208" fontSize="10" fill="var(--mz-fg-strong)" textAnchor="middle" fontWeight="800">2024</text>

      <text x="60"  y="130" fontSize="10" fill="var(--mz-warn)"          textAnchor="middle">32k</text>
      <text x="220" y="80"  fontSize="10" fill="var(--mz-fg-strong)"     textAnchor="middle">9.1k</text>
      <text x="380" y="70"  fontSize="10" fill="var(--mz-fg-strong)"     textAnchor="middle">14.9k</text>
      <text x="540" y="30"  fontSize="11" fill="var(--mz-tenant-accent)" textAnchor="middle" fontWeight="800">18.4k</text>
    </svg>
  );
}

/* ============ MODE 2 · GABINETE ============ */
function ModeGab() {
  return (
    <div>
      <SectionTitle h1="EQUIPE DE GABINETE">
        Gestão da estrutura de pessoal vinculada ao mandato. Inclui cargos comissionados,
        terceirizados, estagiários e voluntários. Folha sincronizada com SIAPE/sistema da
        Casa Legislativa quando disponível.
      </SectionTitle>

      {/* 5 stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, padding: "20px 24px" }}>
        {GAB_STATS.map((s, i) => (
          <GabStat key={i} {...s} />
        ))}
      </div>

      {/* 2 colunas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: "14px 24px 28px" }}>
        {/* Organograma */}
        <OrgBlock titulo="Estrutura Hierárquica" badge="7 setores">
          {EQUIPE.map((p, i) => (
            <TeamRow key={i} {...p} last={i === EQUIPE.length - 1} />
          ))}
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid var(--mz-rule)",
              textAlign: "center",
            }}
          >
            <Btn ghost>+ ver mais 20 colaboradores</Btn>
          </div>
        </OrgBlock>

        {/* Direita: 3 cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <OrgBlock titulo="Ocupação Cargos Comissionados" badge="21/24">
            <div
              style={{
                display: "flex",
                height: 28,
                borderRadius: 4,
                overflow: "hidden",
                marginBottom: 8,
                border: "1px solid var(--mz-rule)",
              }}
            >
              <CCBarSeg flex={21} bg="var(--mz-tenant-primary)" label="21 ocupados" />
              <CCBarSeg flex={2}  bg="var(--mz-rule)"           label="2 vagos" muted />
              <CCBarSeg flex={1}  bg="var(--mz-danger)"         label="1 bloqueado" />
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 10.5, color: "var(--mz-fg-muted)", marginTop: 10 }}>
              <span><b style={{ color: "var(--mz-fg-strong)" }}>21</b> ocupados (87.5%)</span>
              <span><b style={{ color: "var(--mz-warn)" }}>2</b> em recrutamento</span>
              <span><b style={{ color: "var(--mz-danger)" }}>1</b> bloqueado · MP</span>
            </div>
            <div
              style={{
                marginTop: 12,
                padding: 10,
                background: "var(--mz-bg-elevated)",
                borderRadius: 6,
                fontSize: 11,
                color: "var(--mz-fg-muted)",
                borderLeft: "3px solid var(--mz-warn)",
              }}
            >
              <b style={{ color: "var(--mz-warn)" }}>⚠ Bloqueio judicial</b> - Cargo de Assessor
              Especial bloqueado por decisão MP-SP nº 2026-0421. Aguardando manifestação até 15/05.
            </div>
          </OrgBlock>

          <OrgBlock titulo="Folha Salarial · Abril 2026" badge="94% teto">
            {FOLHA.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: i === FOLHA.length - 1 ? 0 : "1px dashed var(--mz-rule)",
                  fontSize: 11.5,
                  paddingTop: f.total ? 10 : 6,
                  fontWeight: f.total ? 800 : undefined,
                  color: f.total ? "var(--mz-fg-strong)" : undefined,
                }}
              >
                <span>{f.lbl}</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{f.v}</span>
              </div>
            ))}
          </OrgBlock>

          <OrgBlock titulo="Sinais de Alerta" badge="3 ativos" badgeWarn>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SINAIS_ALERTA.map((a, i) => (
                <div
                  key={i}
                  style={{
                    padding: 10,
                    background: "var(--mz-bg-elevated)",
                    borderRadius: 6,
                    borderLeft: `3px solid ${a.sev === "crit" ? "var(--mz-danger)" : "var(--mz-warn)"}`,
                  }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--mz-fg-strong)" }}>
                    {a.titulo}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--mz-fg-muted)", marginTop: 2 }}>{a.desc}</div>
                </div>
              ))}
            </div>
          </OrgBlock>
        </div>
      </div>
    </div>
  );
}

/* ============ MODE 3 · AGENDA ============ */
function ModeAg() {
  return (
    <div>
      <SectionTitle h1="AGENDA PESSOAL">
        Compromissos públicos e privados, sincronizados com a Casa Legislativa, comissões e
        operações territoriais. Eventos privados são marcados com cadeado e não compartilhados.
      </SectionTitle>

      <div style={{ padding: "22px 24px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        {/* Calendário */}
        <ColCard>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <H3 style={{ margin: 0 }}>Abril 2026</H3>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn ghost compact>‹</Btn>
              <Btn ghost compact>Hoje</Btn>
              <Btn ghost compact>›</Btn>
            </div>
          </div>
          <CalendarioMes />

          <div
            style={{
              display: "flex",
              gap: 18,
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid var(--mz-rule)",
              fontSize: 10.5,
              color: "var(--mz-fg-muted)",
            }}
          >
            <CalLegend bg="var(--mz-tenant-primary)" border="2px solid var(--mz-tenant-accent)" label="Mandato/Casa" />
            <CalLegend bg="rgba(34,197,94,0.4)" label="Operação/Visita" />
            <CalLegend bg="rgba(245,158,11,0.4)" label="Viagem" />
            <CalLegend bg="var(--mz-rule)" border="1px dashed var(--mz-rule-strong)" label="Privado/Família" />
          </div>
        </ColCard>

        {/* Side */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ColCard>
            <H3>Hoje · 28 ABR</H3>
            {HOJE.map((h, i) => (
              <TimelineEvent key={i} {...h} last={i === HOJE.length - 1} />
            ))}
          </ColCard>

          <ColCard>
            <H3>Conflitos · 7 Dias</H3>
            <div
              style={{
                padding: 10,
                background: "var(--mz-bg-elevated)",
                borderRadius: 6,
                borderLeft: "3px solid var(--mz-warn)",
                fontSize: 11,
              }}
            >
              <b style={{ color: "var(--mz-warn)" }}>⚠ 02/05 · 11h</b>
              <br />
              <span style={{ color: "var(--mz-fg-muted)" }}>
                Reunião líder bancada conflita com convite Café com Eleitor (Lucas Oliveira)
              </span>
              <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                <Btn ghost compact>Manter líder</Btn>
                <Btn ghost compact>Delegar</Btn>
              </div>
            </div>
          </ColCard>
        </div>
      </div>
    </div>
  );
}

function CalendarioMes() {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"].map((d) => (
          <div
            key={d}
            style={{
              fontSize: 9.5,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--mz-fg-faint)",
              textAlign: "center",
              padding: "6px 0",
              fontWeight: 700,
            }}
          >
            {d}
          </div>
        ))}
        {CAL_ABR_2026.flat().map((d, i) => (
          <DayCell key={i} {...d} />
        ))}
      </div>
    </>
  );
}

function DayCell({ num, muted, today, eventos = [] }) {
  return (
    <div
      style={{
        background: today ? "var(--mz-tenant-primary-soft)" : "var(--mz-bg-elevated)",
        border: today ? "1px solid var(--mz-tenant-accent)" : "1px solid var(--mz-rule)",
        borderRadius: 4,
        minHeight: 90,
        padding: 6,
        position: "relative",
        cursor: "pointer",
        opacity: muted ? 0.35 : 1,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: today ? "var(--mz-fg-strong)" : "var(--mz-fg-muted)",
        }}
      >
        {num}
      </div>
      {eventos.map((e, i) => {
        const styles =
          e.tipo === "event"
            ? { bg: "var(--mz-tenant-primary)", color: "var(--mz-tenant-accent)", border: "2px solid var(--mz-tenant-accent)" }
            : e.tipo === "cor"
            ? { bg: "rgba(34,197,94,0.18)", color: "var(--mz-ok)" }
            : e.tipo === "travel"
            ? { bg: "rgba(245,158,11,0.18)", color: "var(--mz-warn)" }
            : { bg: "var(--mz-bg-card)", color: "var(--mz-fg)" };
        return (
          <div
            key={i}
            style={{
              fontSize: 9,
              padding: "2px 4px",
              borderRadius: 3,
              marginTop: 3,
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              background: styles.bg,
              color: styles.color,
              borderLeft: styles.border,
            }}
          >
            {e.label}
          </div>
        );
      })}
    </div>
  );
}

function CalLegend({ bg, border, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, background: bg, border: border || undefined }} />
      {label}
    </span>
  );
}

function TimelineEvent({ hr, titulo, sub, dotColor, privado, last }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "9px 0",
        borderBottom: last ? 0 : "1px dashed var(--mz-rule)",
      }}
    >
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-fg-faint)", width: 38 }}>
        {hr}
      </div>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: privado ? "var(--mz-rule-strong)" : dotColor || "var(--mz-tenant-accent)",
          border: privado ? "1px dashed var(--mz-fg-faint)" : undefined,
          marginTop: 4,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mz-fg-strong)" }}>{titulo}</div>
        <div style={{ fontSize: 10.5, color: "var(--mz-fg-muted)", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

/* ============ HELPERS COMPARTILHADOS ============ */

function SectionTitle({ h1, children }) {
  return (
    <div style={{ padding: "24px 24px 4px" }}>
      <h1
        style={{
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: 30,
          letterSpacing: "0.04em",
          color: "var(--mz-fg-strong)",
          margin: 0,
        }}
      >
        {h1}
      </h1>
      <p style={{ fontSize: 12.5, color: "var(--mz-fg-muted)", margin: "4px 0 0", maxWidth: 720 }}>{children}</p>
    </div>
  );
}

function ColCard({ children }) {
  return (
    <div
      style={{
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderRadius: 12,
        padding: 18,
      }}
    >
      {children}
    </div>
  );
}

function H3({ children, style }) {
  return (
    <h3
      style={{
        fontSize: 9.5,
        letterSpacing: "0.14em",
        color: "var(--mz-fg-faint)",
        textTransform: "uppercase",
        fontWeight: 700,
        margin: "0 0 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        ...style,
      }}
    >
      <span style={{ width: 4, height: 12, background: "var(--mz-tenant-accent)", display: "inline-block" }} />
      {children}
    </h3>
  );
}

function MandateRow({ yr, titulo, sub, badge, state, last }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
        borderBottom: last ? 0 : "1px dashed var(--mz-rule)",
      }}
    >
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-fg-faint)", width: 50 }}>
        {yr}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mz-fg-strong)" }}>{titulo}</div>
        <div style={{ fontSize: 10.5, color: "var(--mz-fg-muted)", marginTop: 2 }}>{sub}</div>
      </div>
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          padding: "3px 7px",
          borderRadius: 3,
          background: state === "now" ? "var(--mz-ok)" : "var(--mz-tenant-primary-soft)",
          color: state === "now" ? "#fff" : "var(--mz-tenant-accent)",
        }}
      >
        {badge}
      </span>
    </div>
  );
}

function MetricsGrid({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {items.map((m, i) => (
        <div
          key={i}
          style={{
            background: "var(--mz-bg-elevated)",
            border: "1px solid var(--mz-rule)",
            borderRadius: 6,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.14em",
              color: "var(--mz-fg-faint)",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {m.lbl}
          </div>
          <div
            style={{
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: 28,
              lineHeight: 1,
              color: "var(--mz-fg-strong)",
              marginTop: 4,
            }}
          >
            {m.v}
            {m.suffix && (
              <small style={{ fontSize: 11, color: "var(--mz-fg-muted)", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                {m.suffix}
              </small>
            )}
          </div>
          <div
            style={{
              fontSize: 10,
              marginTop: 4,
              fontFamily: "JetBrains Mono, monospace",
              color: m.deltaColor || "var(--mz-ok)",
            }}
          >
            {m.delta}
          </div>
        </div>
      ))}
    </div>
  );
}

function UpRow({ dia, mes, titulo, sub, last }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "10px 0",
        borderBottom: last ? 0 : "1px dashed var(--mz-rule)",
      }}
    >
      <div
        style={{
          background: "var(--mz-tenant-primary)",
          color: "#fff",
          borderRadius: 4,
          padding: "4px 6px",
          textAlign: "center",
          minWidth: 38,
        }}
      >
        <div
          style={{
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: 18,
            lineHeight: 1,
            color: "var(--mz-tenant-accent)",
          }}
        >
          {dia}
        </div>
        <div
          style={{
            fontSize: 8.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {mes}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mz-fg-strong)" }}>{titulo}</div>
        <div style={{ fontSize: 10.5, color: "var(--mz-fg-muted)", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--mz-fg-muted)" }}>
      <span style={{ width: 10, height: 2, background: color }} />
      {label}
    </span>
  );
}

function GabStat({ lbl, v, suffix, sub, warn }) {
  return (
    <div
      style={{
        background: "var(--mz-bg-card)",
        border: warn ? "1px solid var(--mz-warn)" : "1px solid var(--mz-rule)",
        borderRadius: 6,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.14em",
          color: "var(--mz-fg-faint)",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {lbl}
      </div>
      <div
        style={{
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: 30,
          lineHeight: 1,
          color: warn ? "var(--mz-warn)" : "var(--mz-fg-strong)",
          marginTop: 4,
        }}
      >
        {v}
        {suffix && (
          <small style={{ fontSize: 11, color: "var(--mz-fg-muted)", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
            {suffix}
          </small>
        )}
      </div>
      <div style={{ fontSize: 10, color: "var(--mz-fg-muted)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function OrgBlock({ titulo, badge, badgeWarn, children }) {
  return (
    <div
      style={{
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderRadius: 12,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3
          style={{
            fontSize: 9.5,
            letterSpacing: "0.14em",
            color: "var(--mz-fg-faint)",
            textTransform: "uppercase",
            fontWeight: 700,
            margin: 0,
          }}
        >
          {titulo}
        </h3>
        {badge && (
          <span
            style={{
              fontSize: 9,
              padding: "3px 7px",
              borderRadius: 3,
              background: badgeWarn ? "var(--mz-warn)" : "var(--mz-rule)",
              color: badgeWarn ? "#fff" : "var(--mz-fg-muted)",
              fontWeight: 800,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function TeamRow({ iniciais, nome, sub, role, roleClass, status, statusKey, destaque, vaga, last }) {
  const roleColor =
    roleClass === "cef"  ? "var(--mz-tenant-accent)" :
    roleClass === "warn" ? "var(--mz-warn)" :
                           "var(--mz-fg-strong)";
  const statusBg =
    statusKey === "ok"   ? "rgba(34,197,94,0.16)" :
    statusKey === "warn" ? "rgba(245,158,11,0.16)" :
                           "rgba(220,38,38,0.18)";
  const statusFg =
    statusKey === "ok"   ? "var(--mz-ok)" :
    statusKey === "warn" ? "var(--mz-warn)" :
                           "var(--mz-danger)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "36px 1fr 90px 90px 28px",
        gap: 10,
        alignItems: "center",
        padding: "10px 0",
        borderBottom: last ? 0 : "1px dashed var(--mz-rule)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: destaque ? "var(--mz-tenant-accent)" : vaga ? "transparent" : "var(--mz-bg-elevated)",
          border: vaga ? "1px dashed var(--mz-warn)" : "1px solid var(--mz-rule)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 800,
          color: destaque ? "var(--mz-fg-on-accent)" : vaga ? "var(--mz-warn)" : "var(--mz-fg-muted)",
        }}
      >
        {iniciais}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: vaga ? "var(--mz-warn)" : "var(--mz-fg-strong)",
        }}
      >
        {nome}
        <small
          style={{
            display: "block",
            fontSize: 10,
            color: "var(--mz-fg-muted)",
            fontWeight: 500,
            marginTop: 2,
          }}
        >
          {sub}
        </small>
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: roleColor,
          fontWeight: roleClass === "cef" ? 700 : roleClass === "com" ? 600 : 400,
        }}
      >
        {role}
      </div>
      <span
        style={{
          fontSize: 9,
          padding: "2px 6px",
          borderRadius: 3,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          textAlign: "center",
          background: statusBg,
          color: statusFg,
        }}
      >
        {status}
      </span>
      <span style={{ fontSize: 14, color: "var(--mz-fg-faint)", cursor: "pointer" }}>⋮</span>
    </div>
  );
}

function CCBarSeg({ flex, bg, label, muted }) {
  return (
    <span
      style={{
        flex,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 800,
        color: muted ? "var(--mz-fg-muted)" : "#fff",
      }}
    >
      {label}
    </span>
  );
}

function Btn({ children, primary, tenant, ghost, compact }) {
  return (
    <button
      style={{
        fontSize: compact ? 10 : 11.5,
        fontWeight: 600,
        padding: compact ? "3px 8px" : "7px 12px",
        borderRadius: 6,
        border: ghost ? "1px solid var(--mz-rule)" : tenant ? "1px solid var(--mz-tenant-accent)" : primary ? "1px solid var(--mz-tenant-primary-strong)" : "1px solid var(--mz-rule)",
        background: ghost ? "none" : tenant ? "var(--mz-tenant-accent)" : primary ? "var(--mz-tenant-primary)" : "var(--mz-bg-card)",
        color: ghost ? "var(--mz-fg)" : tenant ? "var(--mz-fg-on-accent)" : primary ? "#fff" : "var(--mz-fg)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
