"use client";

/* Módulo Operações · 1:1 com Designer V1.2 (02-modulo-operacoes.html)
 *
 * Substitui Operacoes.jsx anterior (327 linhas STUB) pelo módulo completo
 * 1:1 com o mockup de 1858 linhas. Estilo Facebook Ads aplicado à política.
 *
 * 4 sub-views (mode-tabs):
 *   01 Hub                · 4 KPIs + 3 actions + 6 ops ativas + 2 done
 *   02 Wizard 6 passos    · stepper sticky + canvas dinâmico por step
 *   03 Gestão Ativa Live  · OP-2026-014 hero + feed + sidebar (coordenação/marcos/alertas/ações)
 *   04 Relatório Final    · paper completo OP-2025-007 BA Salvador (encerrada com sucesso)
 */

import { useState } from "react";
import {
  VIEWS,
  HUB_KPIS,
  HUB_ACTIONS,
  ACTIVE_OPS,
  DONE_OPS,
  OPS_FILTROS,
  STATUS_LABELS,
  WIZ_STEPS,
  TIPOS_OPERACAO,
  UFS_LIST,
  MUN_SP,
  BAIRROS_SP,
  LEADER_OPTIONS,
  CABOS_OPTIONS,
  FASES_PADRAO,
  METAS_PERFORMANCE,
  ORCAMENTO_DETALHADO,
  ORCAMENTO_TOTAL,
  LIVE_HERO,
  LIVE_KPIS,
  FEED,
  FEED_FILTROS,
  COORDENACAO,
  PROXIMOS_MARCOS,
  LIVE_ALERTAS,
  LIVE_ACOES,
  LIVE_ACAO_PRIMARY,
  REPORT,
  META_TOTAL_DEFAULT,
} from "./dados";

export function Operacoes() {
  const [view, setView] = useState("hub");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 48px)",
        overflow: "hidden",
      }}
    >
      <ModesBar view={view} onView={setView} />
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          background:
            "radial-gradient(800px 400px at 70% -100px, rgba(0,42,123,0.08), transparent), var(--mz-bg-page)",
        }}
      >
        <div style={{ padding: "24px 28px 48px", maxWidth: 1480, margin: "0 auto" }}>
          {view === "hub"    && <HubView onWizard={() => setView("wizard")} onOp={() => setView("live")} />}
          {view === "wizard" && <WizardView onCancel={() => setView("hub")} onLaunch={() => setView("live")} />}
          {view === "live"   && <LiveView />}
          {view === "report" && <ReportView />}
        </div>
      </main>
    </div>
  );
}

/* ============ MODE BAR (4 sub-views) ============ */
function ModesBar({ view, onView }) {
  return (
    <div
      style={{
        height: 56,
        flexShrink: 0,
        background: "var(--mz-bg-topbar)",
        borderBottom: "1px solid var(--mz-rule)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 24,
      }}
    >
      <h1 style={{ fontSize: 13, fontWeight: 800, color: "var(--mz-fg-strong)", letterSpacing: "-0.01em", margin: 0 }}>
        Operações
      </h1>
      <div style={{ display: "flex", gap: 2 }}>
        {VIEWS.map((v) => {
          const ativo = v.id === view;
          return (
            <button
              key={v.id}
              onClick={() => onView(v.id)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 14px",
                background: ativo ? "var(--mz-tenant-primary)" : "none",
                border: 0,
                color: ativo ? "#fff" : "var(--mz-fg-muted)",
                borderRadius: 6,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 9.5,
                  background: ativo ? "rgba(255,204,0,0.25)" : "rgba(0,0,0,0.3)",
                  color: ativo ? "#FFCC00" : undefined,
                  padding: "1px 5px",
                  borderRadius: 3,
                }}
              >
                {v.num}
              </span>
              {v.label}
            </button>
          );
        })}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontSize: 11, color: "var(--mz-fg-faint)", alignItems: "center" }}>
        <span>Tenant: <b style={{ color: "var(--mz-fg)", fontWeight: 600 }}>UB</b></span>
        <span>·</span>
        <span>Visão: <b style={{ color: "var(--mz-fg)", fontWeight: 600 }}>Pres. Estadual SP</b></span>
      </div>
    </div>
  );
}

/* ============ VIEW 1 · HUB ============ */
function HubView({ onWizard, onOp }) {
  const [filter, setFilter] = useState("Todas");

  return (
    <>
      {/* 4 KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {HUB_KPIS.map((k, i) => (
          <div
            key={i}
            style={{
              background: "var(--mz-bg-card)",
              border: "1px solid var(--mz-rule)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 9.5, letterSpacing: "0.16em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700 }}>
              {k.lbl}
            </div>
            <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 36, color: k.warn ? "var(--mz-warn)" : "var(--mz-fg-strong)", letterSpacing: "0.02em", lineHeight: 1, margin: "6px 0 4px" }}>
              {k.v}
            </div>
            <div
              style={{
                fontSize: 11,
                fontVariantNumeric: "tabular-nums",
                color: k.up ? "var(--mz-ok)" : k.warn ? "var(--mz-warn)" : "var(--mz-fg-faint)",
              }}
            >
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      {/* 3 Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {HUB_ACTIONS.map((a, i) => (
          <button
            key={i}
            onClick={a.primary ? onWizard : undefined}
            style={{
              background: a.primary
                ? "linear-gradient(135deg, var(--mz-tenant-primary), var(--mz-tenant-primary-strong))"
                : "var(--mz-bg-card)",
              border: a.primary ? "1px solid var(--mz-tenant-accent)" : "1px solid var(--mz-rule)",
              borderRadius: 12,
              padding: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              transition: "all 120ms",
              color: a.primary ? "#fff" : undefined,
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: a.primary ? "rgba(0,0,0,0.25)" : "var(--mz-tenant-accent)",
                color: a.primary ? "#FFCC00" : "var(--mz-fg-on-accent)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {a.ico}
            </div>
            <div>
              <b style={{ fontSize: 14, color: a.primary ? "#fff" : "var(--mz-fg-strong)", display: "block", letterSpacing: "-0.01em" }}>
                {a.titulo}
              </b>
              <span style={{ fontSize: 11, color: a.primary ? "rgba(255,255,255,0.75)" : "var(--mz-fg-muted)" }}>
                {a.sub}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Operações em curso */}
      <Section titulo="Operações em Curso" count="14 ATIVAS · 3 ALERTA">
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {OPS_FILTROS.map((f) => (
            <span
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
                background: f === filter ? "var(--mz-tenant-primary)" : "var(--mz-bg-elevated)",
                color: f === filter ? "#fff" : "var(--mz-fg-muted)",
                cursor: "pointer",
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </Section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, padding: 16, background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderTop: 0, borderRadius: "0 0 12px 12px", marginBottom: 16 }}>
        {ACTIVE_OPS.map((op) => <OpCard key={op.id} op={op} onClick={onOp} />)}
      </div>

      {/* Operações concluídas */}
      <Section titulo="Operações Concluídas · 30 dias" count="8 ENCERRADAS" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, padding: 16, background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderTop: 0, borderRadius: "0 0 12px 12px" }}>
        {DONE_OPS.map((op) => <OpCard key={op.id} op={op} onClick={onOp} />)}
      </div>
    </>
  );
}

function Section({ titulo, count, children }) {
  return (
    <div
      style={{
        padding: "14px 18px",
        background: "var(--mz-bg-card-2)",
        border: "1px solid var(--mz-rule)",
        borderRadius: "12px 12px 0 0",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--mz-fg-strong)", margin: 0, letterSpacing: "0.02em" }}>
        {titulo}
      </h2>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-tenant-accent)", fontWeight: 700 }}>
        {count}
      </span>
      {children}
    </div>
  );
}

function OpCard({ op, onClick }) {
  const statusStyles = {
    live:  { bg: "var(--mz-ok-soft)",     fg: "var(--mz-ok)",     pulse: true },
    plan:  { bg: "var(--mz-info-soft)",   fg: "var(--mz-info)" },
    done:  { bg: "var(--mz-bg-elevated)", fg: "var(--mz-fg-faint)" },
    alert: { bg: "var(--mz-warn-soft)",   fg: "var(--mz-warn)" },
  };
  const s = statusStyles[op.status];
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--mz-bg-card-2)",
        border: "1px solid var(--mz-rule)",
        borderRadius: 8,
        padding: 14,
        cursor: "pointer",
        transition: "all 120ms",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "start", gap: 10, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 999,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: s.bg,
            color: s.fg,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {s.pulse && <span style={{ width: 6, height: 6, background: "var(--mz-ok)", borderRadius: "50%", animation: "opsPulse 1.6s ease infinite" }} />}
          {STATUS_LABELS[op.status]}
        </span>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-fg-faint)", fontWeight: 700 }}>
          {op.id} · {op.tipo}
        </span>
      </div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--mz-fg-strong)", margin: "4px 0 0", letterSpacing: "-0.01em" }}>
        {op.nome}
      </h3>
      <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
        <b style={{ color: "var(--mz-fg-faint)" }}>{op.uf}</b>
        <span>·</span>
        <span>{op.mun}</span>
        <span>·</span>
        <span>{op.recorte}</span>
      </div>
      <div style={{ margin: "12px 0 8px", height: 6, background: "var(--mz-bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${op.progresso}%`, background: "linear-gradient(90deg, var(--mz-tenant-primary), var(--mz-tenant-accent))" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, fontSize: 10.5, fontVariantNumeric: "tabular-nums" }}>
        <OpStat lbl="Líd." v={op.lid} />
        <OpStat lbl="Cabos" v={op.cabos} />
        <OpStat lbl="Filiações" v={op.fil.toLocaleString("pt-BR")} />
        <OpStat lbl="Alertas" v={op.alertas} color={op.alertas >= 5 ? "var(--mz-danger)" : op.alertas >= 1 ? "var(--mz-warn)" : "var(--mz-ok)"} />
      </div>
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--mz-rule)", display: "flex", alignItems: "center", fontSize: 10.5, color: "var(--mz-fg-muted)", gap: 8 }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--mz-tenant-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color: "var(--mz-tenant-accent)" }}>
          {op.leader}
        </span>
        <span>
          <b style={{ color: "var(--mz-fg)", fontWeight: 600 }}>{op.leaderNome}</b>
          <span style={{ color: "var(--mz-rule-strong)", margin: "0 4px" }}>·</span>
          Líder operação
        </span>
        <span style={{ marginLeft: "auto", color: "var(--mz-tenant-accent)", fontWeight: 700 }}>{op.progresso}%</span>
      </div>
      <style>{`@keyframes opsPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

function OpStat({ lbl, v, color }) {
  return (
    <div style={{ background: "var(--mz-bg-card)", borderRadius: 4, padding: "6px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 8.5, letterSpacing: "0.10em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700 }}>
        {lbl}
      </div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: color || "var(--mz-fg-strong)", lineHeight: 1.2 }}>
        {v}
      </div>
    </div>
  );
}

/* ============ VIEW 2 · WIZARD ============ */
function WizardView({ onCancel, onLaunch }) {
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < 5) setStep(step + 1);
    else onLaunch();
  };
  const prev = () => step > 0 && setStep(step - 1);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
      {/* Stepper */}
      <aside
        style={{
          background: "var(--mz-bg-card)",
          border: "1px solid var(--mz-rule)",
          borderRadius: 12,
          padding: 18,
          position: "sticky",
          top: 0,
        }}
      >
        <h3 style={{ fontSize: 9.5, letterSpacing: "0.16em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700, margin: "0 0 16px" }}>
          Wizard · 6 passos
        </h3>
        {WIZ_STEPS.map((s, i) => (
          <StepRow key={i} s={s} idx={i} active={i === step} done={i < step} onClick={() => setStep(i)} last={i === WIZ_STEPS.length - 1} />
        ))}
      </aside>

      {/* Canvas */}
      <div style={{ background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 12, overflow: "hidden" }}>
        <header style={{ padding: "18px 24px", borderBottom: "1px solid var(--mz-rule)", background: "var(--mz-bg-card-2)" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-tenant-accent)", letterSpacing: "0.10em", fontWeight: 700, marginBottom: 6 }}>
            PASSO {WIZ_STEPS[step].num} DE 06
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--mz-fg-strong)", margin: 0, letterSpacing: "-0.015em" }}>
            {WIZ_STEPS[step].titulo}
          </h2>
          <p style={{ fontSize: 12, color: "var(--mz-fg-muted)", margin: "6px 0 0" }}>{WIZ_STEPS[step].desc}</p>
        </header>
        <div style={{ padding: 24, minHeight: 320 }}>
          <WizardStepContent step={step} />
        </div>
        <footer
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--mz-rule)",
            background: "var(--mz-bg-card-2)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--mz-fg-muted)" }}>
            Progresso: <b style={{ color: "var(--mz-fg-strong)" }}>{Math.round(((step + 1) / 6) * 100)}%</b> · {step + 1} de 6 passos
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <Btn ghost onClick={onCancel}>Cancelar</Btn>
            <Btn onClick={prev} disabled={step === 0}>← Anterior</Btn>
            <Btn primary onClick={next}>{step === 5 ? "Lançar Operação ⚡" : "Próximo →"}</Btn>
          </div>
        </footer>
      </div>
    </div>
  );
}

function StepRow({ s, idx, active, done, onClick, last }) {
  return (
    <div onClick={onClick} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 12, padding: "10px 0", cursor: "pointer", position: "relative" }}>
      {!last && (
        <div
          style={{
            position: "absolute",
            left: 13,
            top: 36,
            bottom: -8,
            width: 2,
            background: done ? "var(--mz-ok)" : "var(--mz-rule)",
          }}
        />
      )}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: done ? "var(--mz-ok)" : active ? "var(--mz-tenant-accent)" : "var(--mz-bg-elevated)",
          border: `2px solid ${done ? "var(--mz-ok)" : active ? "var(--mz-tenant-accent)" : "var(--mz-rule)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          color: done ? "#fff" : active ? "var(--mz-fg-on-accent)" : "var(--mz-fg-faint)",
          fontWeight: 700,
        }}
      >
        {done ? "✓" : s.num}
      </div>
      <div>
        <b style={{ fontSize: 12, fontWeight: 600, color: active ? "var(--mz-fg-strong)" : done ? "var(--mz-fg-muted)" : "var(--mz-fg)", display: "block", textDecoration: done ? "line-through" : "none" }}>
          {s.titulo}
        </b>
        <span style={{ fontSize: 10.5, color: "var(--mz-fg-faint)", marginTop: 1 }}>
          {s.desc.split(".")[0]}.
        </span>
      </div>
    </div>
  );
}

function Btn({ children, primary, ghost, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: "8px 14px",
        borderRadius: 6,
        border: ghost ? "1px solid transparent" : primary ? "1px solid var(--mz-tenant-primary-strong)" : "1px solid var(--mz-rule)",
        background: ghost ? "transparent" : primary ? "var(--mz-tenant-primary)" : "var(--mz-bg-card)",
        color: ghost ? "var(--mz-fg-muted)" : primary ? "#fff" : "var(--mz-fg)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

function WizardStepContent({ step }) {
  if (step === 0) return <Step1TipoOp />;
  if (step === 1) return <Step2Recorte />;
  if (step === 2) return <Step3Equipe />;
  if (step === 3) return <Step4Cronograma />;
  if (step === 4) return <Step5Metas />;
  if (step === 5) return <Step6Review />;
  return null;
}

function Step1TipoOp() {
  const [sel, setSel] = useState("capilarizacao");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {TIPOS_OPERACAO.map((t) => {
        const isSel = t.id === sel;
        return (
          <div
            key={t.id}
            onClick={() => setSel(t.id)}
            style={{
              background: isSel ? "var(--mz-tenant-primary-soft)" : "var(--mz-bg-card-2)",
              border: `1px solid ${isSel ? "var(--mz-tenant-accent)" : "var(--mz-rule)"}`,
              borderRadius: 12,
              padding: 18,
              cursor: "pointer",
              transition: "all 120ms",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>{t.ico}</div>
            <b style={{ fontSize: 14, color: "var(--mz-fg-strong)", display: "block", marginBottom: 4 }}>
              {t.titulo}
            </b>
            <div style={{ fontSize: 11.5, color: "var(--mz-fg-muted)", lineHeight: 1.45, marginBottom: 12 }}>
              {t.desc}
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 10.5, color: "var(--mz-fg-faint)" }}>
              <span><b style={{ color: "var(--mz-fg)" }}>{t.fases}</b> fases</span>
              <span><b style={{ color: "var(--mz-fg)" }}>{t.duracao}</b></span>
              <span><b style={{ color: "var(--mz-fg)" }}>{t.orcamento}</b></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Step2Recorte() {
  const [uf, setUf] = useState("SP");
  const [muns, setMuns] = useState(["São Paulo"]);
  const [bairros, setBairros] = useState(["Vila Mariana", "Itaim Bibi", "Moema", "Saúde", "Mirandópolis"]);

  return (
    <>
      <div
        style={{
          padding: "10px 14px",
          background: "var(--mz-bg-card-2)",
          borderRadius: 6,
          fontSize: 11,
          color: "var(--mz-fg-muted)",
          marginBottom: 14,
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <span>Selecionado: <b style={{ color: "var(--mz-fg-strong)" }}>{uf}</b></span>
        <span style={{ color: "var(--mz-rule-strong)" }}>›</span>
        <span>Municípios: <b style={{ color: "var(--mz-fg-strong)" }}>{muns.length}</b></span>
        <span style={{ color: "var(--mz-rule-strong)" }}>›</span>
        <span>Bairros: <b style={{ color: "var(--mz-fg-strong)" }}>{bairros.length}</b></span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, height: 360 }}>
        <CascataCol titulo="UF · 1 obrigatória" badge={uf ? "1" : "0"}>
          {UFS_LIST.map((u) => (
            <CascataRow key={u.id} sel={uf === u.id} onClick={() => setUf(u.id)}>
              <span style={{ flex: 1 }}>
                <b>{u.id}</b> · {u.nome}
              </span>
              <span style={{ color: "var(--mz-fg-faint)", fontSize: 10 }}>{u.m} m</span>
            </CascataRow>
          ))}
        </CascataCol>

        <CascataCol titulo="Municípios · 1+ obrigatório" badge={String(muns.length)}>
          {MUN_SP.map((m) => (
            <CascataRow
              key={m}
              sel={muns.includes(m)}
              onClick={() => setMuns(muns.includes(m) ? muns.filter((x) => x !== m) : [...muns, m])}
            >
              <span style={{ flex: 1 }}>
                <b>{m}</b>
              </span>
            </CascataRow>
          ))}
        </CascataCol>

        <CascataCol titulo="Bairros · opcional" badge={String(bairros.length)}>
          {BAIRROS_SP.map((b) => (
            <CascataRow
              key={b}
              sel={bairros.includes(b)}
              onClick={() => setBairros(bairros.includes(b) ? bairros.filter((x) => x !== b) : [...bairros, b])}
            >
              <span style={{ flex: 1 }}>
                <b>{b}</b>
              </span>
            </CascataRow>
          ))}
        </CascataCol>
      </div>
      <div style={{ marginTop: 14, fontSize: 11, color: "var(--mz-fg-muted)", display: "flex", gap: 14 }}>
        <span>💡 Sem bairros = operação cobre municípios inteiros</span>
        <span>⚡ Suporta multi-UF - abre 2ª aba após confirmar a 1ª</span>
      </div>
    </>
  );
}

function CascataCol({ titulo, badge, children }) {
  return (
    <div style={{ background: "var(--mz-bg-card-2)", border: "1px solid var(--mz-rule)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <h4
        style={{
          fontSize: 9.5,
          letterSpacing: "0.14em",
          color: "var(--mz-fg-faint)",
          textTransform: "uppercase",
          fontWeight: 700,
          margin: "0 0 10px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {titulo}
        <span style={{ marginLeft: "auto", fontFamily: "JetBrains Mono, monospace", background: "var(--mz-tenant-accent)", color: "var(--mz-fg-on-accent)", padding: "1px 5px", borderRadius: 3, fontSize: 9.5, fontWeight: 800 }}>
          {badge}
        </span>
      </h4>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {children}
      </div>
    </div>
  );
}

function CascataRow({ sel, onClick, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        background: sel ? "var(--mz-tenant-primary-soft)" : "transparent",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: 11.5,
        color: "var(--mz-fg)",
      }}
    >
      <span style={{ width: 14, height: 14, borderRadius: 3, background: sel ? "var(--mz-tenant-accent)" : "var(--mz-bg-elevated)", color: sel ? "var(--mz-fg-on-accent)" : "var(--mz-fg-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>
        {sel ? "✓" : ""}
      </span>
      {children}
    </div>
  );
}

function Step3Equipe() {
  const [leader, setLeader] = useState("rita");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: "var(--mz-bg-card-2)", borderRadius: 8, padding: 16 }}>
        <h4 style={equipeH4Style}>Identidade da Operação</h4>
        <InputGroup label="Nome interno" defaultValue="Capilarização SP · Zona Sul" />
        <InputGroup label="Sigla TSE (opcional)" defaultValue="OP-2026-014" />
        <SelectGroup label="Cargo-foco" options={["Vereador 2028", "Prefeito 2028", "Dep. Estadual 2026", "Senador 2026"]} />
        <SelectGroup label="Visibilidade" options={["Privada · só equipe", "Tenant · todos da UB", "Pública · transparência"]} />
      </div>
      <div style={{ background: "var(--mz-bg-card-2)", borderRadius: 8, padding: 16 }}>
        <h4 style={equipeH4Style}>Líder da Operação · 1 obrigatório</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {LEADER_OPTIONS.map((l) => (
            <LeadPick key={l.id} l={l} on={leader === l.id} onClick={() => setLeader(l.id)} />
          ))}
          <LeadPick disabled label="+ procurar" />
        </div>
        <h4 style={{ ...equipeH4Style, marginTop: 16 }}>Cabos-de-Piso · 0 a 10</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CABOS_OPTIONS.map((c) => (
            <LeadPick key={c.id} l={c} on={c.on} />
          ))}
          <LeadPick disabled label="+ buscar nome" />
        </div>
      </div>
    </div>
  );
}

const equipeH4Style = {
  fontSize: 11,
  letterSpacing: "0.10em",
  color: "var(--mz-fg-faint)",
  textTransform: "uppercase",
  fontWeight: 700,
  margin: "0 0 12px",
};

function InputGroup({ label, defaultValue }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 10, color: "var(--mz-fg-faint)", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>
        {label}
      </label>
      <input
        defaultValue={defaultValue}
        style={{ width: "100%", background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "var(--mz-fg)", outline: "none" }}
      />
    </div>
  );
}

function SelectGroup({ label, options }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 10, color: "var(--mz-fg-faint)", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>
        {label}
      </label>
      <select
        style={{ width: "100%", background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "var(--mz-fg)", outline: "none" }}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function LeadPick({ l, on, onClick, disabled, label }) {
  if (disabled) {
    return (
      <div style={{ padding: "6px 12px", background: "var(--mz-bg-card)", border: "1px dashed var(--mz-rule)", borderRadius: 999, fontSize: 11, color: "var(--mz-fg-faint)", cursor: "default", opacity: 0.6 }}>
        {label}
      </div>
    );
  }
  return (
    <div
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px 5px 5px",
        background: on ? "var(--mz-tenant-primary-soft)" : "var(--mz-bg-card)",
        border: `1px solid ${on ? "var(--mz-tenant-accent)" : "var(--mz-rule)"}`,
        borderRadius: 999,
        fontSize: 11.5,
        cursor: "pointer",
      }}
    >
      <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--mz-tenant-primary)", color: "var(--mz-tenant-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, fontFamily: "Bebas Neue, sans-serif" }}>
        {l.av}
      </span>
      <span>{l.nome}</span>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-tenant-accent)", fontWeight: 700, marginLeft: 4 }}>
        {l.ovr}
      </span>
    </div>
  );
}

function Step4Cronograma() {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        <div style={{ background: "var(--mz-bg-card-2)", borderRadius: 8, padding: 12 }}>
          {FASES_PADRAO.map((f, i) => (
            <PhaseItem key={i} f={f} active={f.active} />
          ))}
          <button style={{ marginTop: 8, width: "100%", padding: "8px 12px", background: "transparent", border: "1px dashed var(--mz-rule)", color: "var(--mz-fg-muted)", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>
            + adicionar fase
          </button>
        </div>
        <div style={{ background: "var(--mz-bg-card-2)", borderRadius: 8, padding: 14, overflow: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px repeat(8, 1fr)", gap: 4, fontSize: 9.5, color: "var(--mz-fg-faint)", fontWeight: 700, letterSpacing: "0.10em", marginBottom: 8 }}>
            <div></div>
            {["SEM 1-3", "SEM 4-6", "SEM 7-9", "SEM 10-12", "SEM 13-15", "SEM 16-18", "SEM 19-21", "SEM 22-24"].map((w) => <div key={w}>{w}</div>)}
          </div>
          {FASES_PADRAO.map((f, i) => (
            <GanttRow key={i} fase={f} startWeek={i * 1} duracaoSemanas={parseInt(f.dur)} />
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14, fontSize: 11, color: "var(--mz-fg-muted)", display: "flex", gap: 14 }}>
        <span>📅 Início: <b style={{ color: "var(--mz-fg)" }}>{META_TOTAL_DEFAULT.inicio}</b></span>
        <span>🏁 Encerramento: <b style={{ color: "var(--mz-fg)" }}>{META_TOTAL_DEFAULT.fim}</b></span>
        <span>⏱️ Duração total: <b style={{ color: "var(--mz-tenant-accent)" }}>{META_TOTAL_DEFAULT.duracao}</b></span>
      </div>
    </>
  );
}

function PhaseItem({ f, active }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr auto",
        gap: 10,
        padding: "10px 12px",
        background: active ? "var(--mz-tenant-primary-soft)" : "var(--mz-bg-card)",
        border: `1px solid ${active ? "var(--mz-tenant-accent)" : "var(--mz-rule)"}`,
        borderRadius: 6,
        marginBottom: 6,
        alignItems: "center",
      }}
    >
      <span style={{ width: 32, height: 32, borderRadius: 6, background: active ? "var(--mz-tenant-accent)" : "var(--mz-bg-elevated)", color: active ? "var(--mz-fg-on-accent)" : "var(--mz-fg-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700 }}>
        {f.n}
      </span>
      <div>
        <b style={{ fontSize: 12, color: "var(--mz-fg-strong)", display: "block", fontWeight: 700 }}>{f.t}</b>
        <span style={{ fontSize: 10.5, color: "var(--mz-fg-faint)" }}>{f.d}</span>
      </div>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--mz-fg)", fontWeight: 700 }}>
        {f.dur}
      </span>
    </div>
  );
}

function GanttRow({ fase, startWeek, duracaoSemanas }) {
  // Calcula posição/largura da barra na grid 8 (24 semanas)
  // Aproximação simples - posiciona barra no slot startWeek (0-7)
  const barLeft = `${(startWeek / 8) * 100}%`;
  const barWidth = `${Math.min(100, (duracaoSemanas / 24) * 100)}%`;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 4, marginBottom: 4, alignItems: "center", fontSize: 11 }}>
      <div style={{ color: "var(--mz-fg-muted)", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5 }}>
        {fase.n} · {fase.t}
      </div>
      <div style={{ position: "relative", height: 24, background: "var(--mz-bg-card)", borderRadius: 4 }}>
        <div
          style={{
            position: "absolute",
            left: barLeft,
            width: barWidth,
            top: 4,
            bottom: 4,
            background: fase.active ? "var(--mz-tenant-accent)" : "linear-gradient(90deg, var(--mz-tenant-primary), var(--mz-tenant-primary-strong))",
            color: "#fff",
            borderRadius: 3,
            fontSize: 9.5,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            paddingLeft: 6,
          }}
        >
          {fase.dur}
        </div>
      </div>
    </div>
  );
}

function Step5Metas() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: "var(--mz-bg-card-2)", borderRadius: 8, padding: 16 }}>
        <h4 style={equipeH4Style}>Metas de Performance</h4>
        {METAS_PERFORMANCE.map((m, i) => <MetaRow key={i} m={m} />)}
      </div>
      <div style={{ background: "var(--mz-bg-card-2)", borderRadius: 8, padding: 16 }}>
        <h4 style={equipeH4Style}>Orçamento Detalhado</h4>
        {ORCAMENTO_DETALHADO.map((m, i) => <MetaRow key={i} m={m} />)}
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "2px solid var(--mz-tenant-accent)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--mz-fg-strong)", fontWeight: 700 }}>Orçamento Total</span>
          <b style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 28, color: "var(--mz-tenant-accent)" }}>{ORCAMENTO_TOTAL}</b>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ m }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--mz-rule)", alignItems: "center" }}>
      <div>
        <b style={{ fontSize: 12, color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{m.lbl}</b>
        <span style={{ fontSize: 10.5, color: "var(--mz-fg-faint)" }}>{m.sub}</span>
      </div>
      <input
        defaultValue={m.val}
        style={{ background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 4, padding: "6px 10px", fontSize: 12, color: "var(--mz-fg)", textAlign: "right", fontFamily: "JetBrains Mono, monospace", outline: "none" }}
      />
    </div>
  );
}

function Step6Review() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
      <div>
        <ReviewBlock titulo="Identidade">
          <Field k="Nome" v="Capilarização SP · Zona Sul" />
          <Field k="Sigla" v="OP-2026-014" />
          <Field k="Tipo" v="Capilarização Territorial" />
          <Field k="Cargo-foco" v="Vereador 2028" />
          <Field k="Visibilidade" v="Privada · só equipe" />
        </ReviewBlock>
        <ReviewBlock titulo="Recorte territorial">
          <Field k="UF" v="São Paulo" />
          <Field k="Municípios (1)" v="São Paulo (capital)" />
          <Field k="Bairros (5)" v="Vila Mariana, Itaim Bibi, Moema, Saúde, Mirandópolis" />
          <Field k="População" v="~520.000 habitantes" />
        </ReviewBlock>
        <ReviewBlock titulo="Liderança & Equipe">
          <Field k="Líder" v="Rita Tavares · OVR 94" />
          <Field k="Cabos-de-piso (3)" v="João Mendes (91), Paula Silva (82), André Fonseca (68)" />
        </ReviewBlock>
        <ReviewBlock titulo="Cronograma">
          <Field k="Fases" v="6 fases padrão" />
          <Field k="Início" v="28/abr/2026" />
          <Field k="Encerramento" v="29/out/2026" />
          <Field k="Duração" v="22 semanas (~5 meses)" />
        </ReviewBlock>
        <ReviewBlock titulo="Metas & Orçamento">
          <Field k="Filiações alvo" v="5.000" />
          <Field k="Cabos alvo" v="100" />
          <Field k="Eventos alvo" v="18" />
          <Field k="Orçamento total" v="R$ 850.000" />
        </ReviewBlock>
      </div>
      <aside
        style={{
          background: "linear-gradient(135deg, var(--mz-tenant-primary), var(--mz-tenant-primary-strong))",
          color: "#fff",
          padding: 18,
          borderRadius: 12,
          position: "sticky",
          top: 0,
          height: "fit-content",
        }}
      >
        <h4 style={{ fontSize: 11, letterSpacing: "0.10em", color: "var(--mz-tenant-accent)", textTransform: "uppercase", fontWeight: 700, margin: "0 0 14px" }}>
          Pronto para Lançar
        </h4>
        <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 32, color: "var(--mz-tenant-accent)", letterSpacing: "0.02em", lineHeight: 1, marginBottom: 4 }}>
          OP-2026-014
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          Capilarização SP · Zona Sul
        </div>
        {[
          ["Tipo", "Capilarização"],
          ["Duração", "~5 meses"],
          ["Equipe", "1 + 3 cabos"],
          ["Bairros", "5"],
          ["Investimento", "R$ 850k"],
          ["Meta filiações", "5.000"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", fontSize: 11.5 }}>
            <span style={{ color: "rgba(255,255,255,0.7)" }}>{k}</span>
            <b>{v}</b>
          </div>
        ))}
        <button
          style={{
            width: "100%",
            marginTop: 16,
            padding: "12px 16px",
            background: "var(--mz-tenant-accent)",
            color: "var(--mz-fg-on-accent)",
            border: 0,
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.04em",
            cursor: "pointer",
          }}
        >
          ⚡ Lançar Operação
        </button>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 10 }}>
          Auditoria pela Tesouraria · gravado em DOU interno
        </div>
      </aside>
    </div>
  );
}

function ReviewBlock({ titulo, children }) {
  return (
    <div style={{ background: "var(--mz-bg-card-2)", borderRadius: 8, padding: 14, marginBottom: 10 }}>
      <h4 style={{ ...equipeH4Style, display: "flex", alignItems: "center", gap: 8 }}>
        {titulo}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--mz-tenant-accent)", fontWeight: 700, cursor: "pointer", textTransform: "lowercase", letterSpacing: "0.04em" }}>
          editar
        </span>
      </h4>
      {children}
    </div>
  );
}

function Field({ k, v }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, padding: "5px 0", fontSize: 11.5 }}>
      <span style={{ color: "var(--mz-fg-faint)" }}>{k}</span>
      <span style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{v}</span>
    </div>
  );
}

/* ============ VIEW 3 · LIVE (Gestão Ativa) ============ */
function LiveView() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
      <div>
        <LiveHero />
        <LiveFeed />
      </div>
      <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SideCard titulo="Coordenação" qty={String(COORDENACAO.length)}>
          {COORDENACAO.map((c, i) => <CaboMini key={i} c={c} />)}
        </SideCard>
        <SideCard titulo="Próximos Marcos" qty={String(PROXIMOS_MARCOS.length)}>
          {PROXIMOS_MARCOS.map((m, i) => <MarcoRow key={i} m={m} />)}
        </SideCard>
        <SideCard titulo="Alertas" qty={String(LIVE_ALERTAS.length)} qtyWarn>
          {LIVE_ALERTAS.map((a, i) => <AlertaRow key={i} a={a} />)}
        </SideCard>
        <SideCard titulo="Ações Rápidas">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {LIVE_ACOES.map((a) => (
              <button key={a} style={{ textAlign: "left", padding: "8px 12px", background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 6, color: "var(--mz-fg)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                {a}
              </button>
            ))}
            <button style={{ textAlign: "left", padding: "8px 12px", background: "var(--mz-tenant-primary)", border: "1px solid var(--mz-tenant-primary-strong)", borderRadius: 6, color: "#fff", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
              {LIVE_ACAO_PRIMARY}
            </button>
          </div>
        </SideCard>
      </aside>
    </div>
  );
}

function LiveHero() {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, var(--mz-tenant-primary), var(--mz-tenant-primary-strong))",
        border: "1px solid var(--mz-tenant-accent)",
        borderRadius: 12,
        padding: 22,
        marginBottom: 16,
        color: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 10px", background: "var(--mz-tenant-accent)", color: "var(--mz-fg-on-accent)", borderRadius: 999, letterSpacing: "0.10em" }}>
          {LIVE_HERO.tag}
        </span>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.06em" }}>
          {LIVE_HERO.id}
        </span>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
        {LIVE_HERO.titulo}
      </h1>
      <div style={{ display: "flex", gap: 14, fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 8, flexWrap: "wrap" }}>
        {LIVE_HERO.where.map((w, i) => (
          <span key={i}>
            {w.lbl}: <b style={{ color: "#fff" }}>{w.v}</b>
          </span>
        ))}
      </div>

      {/* Progress fase */}
      <div style={{ marginTop: 16, position: "relative", height: 8, background: "rgba(0,0,0,0.3)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, width: `${LIVE_HERO.fase.percent}%`, background: "var(--mz-tenant-accent)" }} />
        {[1, 2, 3, 4, 5].map((m) => (
          <div key={m} style={{ position: "absolute", left: `${(m / 6) * 100}%`, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.3)" }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--mz-tenant-accent)", marginTop: 6, fontWeight: 700 }}>
        Fase {LIVE_HERO.fase.atual} de {LIVE_HERO.fase.total} · {LIVE_HERO.fase.nome} · {LIVE_HERO.fase.percent}%
      </div>

      {/* 5 KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginTop: 16, fontVariantNumeric: "tabular-nums" }}>
        {LIVE_KPIS.map((k, i) => (
          <div key={i} style={{ background: "rgba(0,0,0,0.25)", padding: "10px 12px", borderRadius: 6 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.10em", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: 700 }}>
              {k.lbl}
            </div>
            <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 22, color: "#fff", letterSpacing: "0.02em", lineHeight: 1, marginTop: 4 }}>
              {k.v}
            </div>
            <div style={{ fontSize: 10, color: k.up ? "var(--mz-ok)" : k.down ? "var(--mz-warn)" : "rgba(255,255,255,0.7)", marginTop: 2, fontFamily: "JetBrains Mono, monospace" }}>
              {k.delta}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveFeed() {
  const [filter, setFilter] = useState("Todos");
  return (
    <div
      style={{
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <header style={{ padding: "14px 18px", borderBottom: "1px solid var(--mz-rule)", background: "var(--mz-bg-card-2)", display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--mz-fg-strong)", margin: 0 }}>
          Feed de Atividade · LIVE
        </h2>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-tenant-accent)", fontWeight: 700 }}>
          347 eventos · 24h
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {FEED_FILTROS.map((f) => (
            <span
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
                background: f === filter ? "var(--mz-tenant-primary)" : "var(--mz-bg-elevated)",
                color: f === filter ? "#fff" : "var(--mz-fg-muted)",
                cursor: "pointer",
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </header>
      <div style={{ padding: "8px 18px" }}>
        {FEED.map((f, i) => <FeedRow key={i} f={f} />)}
      </div>
    </div>
  );
}

function FeedRow({ f }) {
  const avBg =
    f.tipo === "sys"   ? "var(--mz-bg-elevated)" :
    f.tipo === "alert" ? "var(--mz-warn-soft)"   :
                         "var(--mz-tenant-primary)";
  const avColor =
    f.tipo === "sys"   ? "var(--mz-fg-faint)" :
    f.tipo === "alert" ? "var(--mz-warn)"     :
                         "var(--mz-tenant-accent)";

  // Renderiza **bold** simples
  const renderText = (s) => {
    const parts = s.split(/\*\*([^*]+)\*\*/g);
    return parts.map((p, i) =>
      i % 2 === 0 ? p : <b key={i} style={{ color: "var(--mz-fg-strong)", fontWeight: 700 }}>{p}</b>
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr auto",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px dashed var(--mz-rule)",
        alignItems: "center",
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: avBg, color: avColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bebas Neue, sans-serif", fontSize: 13, fontWeight: 700 }}>
        {f.av}
      </div>
      <div style={{ fontSize: 12, color: "var(--mz-fg)" }}>
        {renderText(f.t)}
        <div style={{ fontSize: 10.5, color: "var(--mz-fg-faint)", marginTop: 2 }}>{f.sub}</div>
      </div>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-fg-faint)" }}>
        {f.when}
      </span>
    </div>
  );
}

function SideCard({ titulo, qty, qtyWarn, children }) {
  return (
    <div style={{ background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 12, padding: 14 }}>
      <h3 style={{ fontSize: 9.5, letterSpacing: "0.16em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
        {titulo}
        {qty && (
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "JetBrains Mono, monospace",
              background: qtyWarn ? "var(--mz-warn)" : "var(--mz-tenant-accent)",
              color: qtyWarn ? "#fff" : "var(--mz-fg-on-accent)",
              padding: "1px 5px",
              borderRadius: 3,
              fontSize: 9.5,
            }}
          >
            {qty}
          </span>
        )}
      </h3>
      {children}
    </div>
  );
}

function CaboMini({ c }) {
  const pctColor = c.level === "high" ? "var(--mz-ok)" : c.level === "mid" ? "var(--mz-warn)" : "var(--mz-danger)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--mz-rule)", alignItems: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--mz-tenant-primary)", color: "var(--mz-tenant-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bebas Neue, sans-serif", fontSize: 12, fontWeight: 700 }}>
        {c.av}
      </div>
      <div>
        <b style={{ fontSize: 12, color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{c.nome}</b>
        <span style={{ fontSize: 10.5, color: "var(--mz-fg-faint)" }}>{c.sub}</span>
      </div>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color: pctColor }}>
        {c.pct}%
      </span>
    </div>
  );
}

function MarcoRow({ m }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--mz-rule)", alignItems: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: m.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
        {m.ico}
      </div>
      <div>
        <b style={{ fontSize: 12, color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{m.nome}</b>
        <span style={{ fontSize: 10.5, color: "var(--mz-fg-faint)" }}>{m.sub}</span>
      </div>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: m.color, fontWeight: 700 }}>
        {m.when}
      </span>
    </div>
  );
}

function AlertaRow({ a }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--mz-rule)", alignItems: "center" }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: a.warn ? "var(--mz-warn)" : "var(--mz-info)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        {a.ico}
      </div>
      <div>
        <b style={{ fontSize: 12, color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{a.nome}</b>
        <span style={{ fontSize: 10.5, color: "var(--mz-fg-faint)" }}>{a.sub}</span>
      </div>
    </div>
  );
}

/* ============ VIEW 4 · RELATÓRIO FINAL ============ */
function ReportView() {
  const renderText = (s) => {
    const parts = s.split(/\*\*([^*]+)\*\*/g);
    return parts.map((p, i) =>
      i % 2 === 0 ? p : <b key={i} style={{ color: "var(--mz-fg-strong)", fontWeight: 700 }}>{p}</b>
    );
  };

  return (
    <div style={{ background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 12, padding: "32px 36px", maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--mz-tenant-accent)", fontWeight: 700, textTransform: "uppercase" }}>
            RELATÓRIO FINAL · OPERAÇÃO TERRITORIAL
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--mz-fg-strong)", margin: "8px 0 4px", letterSpacing: "-0.02em", lineHeight: 1.1, whiteSpace: "pre-line" }}>
            {REPORT.titulo}
          </h1>
          <div style={{ fontSize: 12, color: "var(--mz-fg-muted)" }}>{REPORT.lead}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ width: 64, height: 64, background: "var(--mz-tenant-primary)", border: "1px solid var(--mz-tenant-accent)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bebas Neue, sans-serif", fontSize: 22, color: "var(--mz-tenant-accent)", marginLeft: "auto" }}>
            UB
          </div>
          <div style={{ fontSize: 9, letterSpacing: "0.10em", color: "var(--mz-fg-faint)", marginTop: 8, fontWeight: 700 }}>
            CONFIDENCIAL · MAZZEL
          </div>
        </div>
      </div>
      <hr style={{ border: 0, borderTop: "1px solid var(--mz-rule)", margin: "20px 0" }} />

      <ReportSection num="1" titulo="Resumo Executivo">
        {REPORT.resumo.map((p, i) => (
          <p key={i} style={{ fontSize: 12.5, color: "var(--mz-fg)", lineHeight: 1.65, margin: "0 0 10px" }}>
            {renderText(p)}
          </p>
        ))}
      </ReportSection>

      <ReportSection num="2" titulo="Indicadores-Chave">
        {REPORT.kpis.map((row, ri) => (
          <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 10, fontVariantNumeric: "tabular-nums" }}>
            {row.map((k, ki) => (
              <div key={ki} style={{ background: "var(--mz-bg-card-2)", border: "1px solid var(--mz-rule)", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700 }}>
                  {k.lbl}
                </div>
                <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 26, color: "var(--mz-fg-strong)", lineHeight: 1, margin: "4px 0", letterSpacing: "0.02em" }}>
                  {k.v}
                </div>
                <div style={{ fontSize: 10, color: k.up ? "var(--mz-ok)" : "var(--mz-fg-faint)", fontFamily: "JetBrains Mono, monospace" }}>
                  {k.delta}
                </div>
              </div>
            ))}
          </div>
        ))}
      </ReportSection>

      <ReportSection num="3" titulo="Performance por Bairro · Top 10">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr>
              {["Bairro", "Cabo Líder", "Cobertura", "Filiações", "Δ Score", "Status"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, letterSpacing: "0.10em", color: "var(--mz-fg-faint)", textTransform: "uppercase", fontWeight: 700, borderBottom: "1px solid var(--mz-rule)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REPORT.bairros.map((b, i) => (
              <tr key={i} style={{ borderBottom: "1px dashed var(--mz-rule)" }}>
                <td style={{ padding: "10px" }}><b style={{ color: "var(--mz-fg-strong)" }}>{b.nome}</b></td>
                <td style={{ padding: "10px", color: "var(--mz-fg-muted)" }}>{b.cabo}</td>
                <td style={{ padding: "10px", fontFamily: "JetBrains Mono, monospace" }}>{b.cob}</td>
                <td style={{ padding: "10px", fontFamily: "JetBrains Mono, monospace" }}>{b.fil}</td>
                <td style={{ padding: "10px", fontFamily: "JetBrains Mono, monospace", color: b.deltaColor }}>{b.delta}</td>
                <td style={{ padding: "10px", color: b.statusColor || "var(--mz-fg)", fontWeight: b.statusColor ? 700 : 400 }}>{b.status}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: 16, color: "var(--mz-fg-faint)", fontSize: 11 }}>
                + 39 bairros adicionais · ver anexo I
              </td>
            </tr>
          </tbody>
        </table>
      </ReportSection>

      <ReportSection num="4" titulo="Lições Aprendidas e Recomendações">
        {REPORT.licoes.map((l, i) => (
          <p key={i} style={{ fontSize: 12.5, color: "var(--mz-fg)", lineHeight: 1.65, margin: "0 0 10px" }}>
            <b style={{ color: "var(--mz-fg-strong)" }}>{l.titulo}</b> {renderText(l.body)}
          </p>
        ))}
      </ReportSection>

      <div
        style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid var(--mz-rule)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "var(--mz-fg-faint)",
          letterSpacing: "0.04em",
        }}
      >
        <span>Gerado por Mazzel · IA-assistida</span>
        <span>Confidencial · UB Direção Nacional · 2026-04-25</span>
        <span>Documento OP-2025-007-FINAL.pdf · v1.2</span>
      </div>
    </div>
  );
}

function ReportSection({ num, titulo, children }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--mz-fg-strong)", margin: "0 0 14px", letterSpacing: "-0.01em" }}>
        {num}. {titulo}
      </h2>
      {children}
    </section>
  );
}
