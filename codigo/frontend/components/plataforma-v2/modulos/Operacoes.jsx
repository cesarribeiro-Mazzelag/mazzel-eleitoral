"use client";

/* Modulo Operacoes - Hub view (F3 Designer V1.2 02-modulo-operacoes).
 * Wizard / Live / Relatorio ainda nao portados (proximas iteracoes). */

import { useState, useMemo } from "react";
import { Icon } from "../Icon";
import {
  OPERACOES_KPIS,
  OPERACOES_ATIVAS,
  OPERACOES_CONCLUIDAS,
  OPERACOES_TIPOS,
  OPERACOES_STATUS_LABEL,
} from "../data";

const STATUS_CHIP = {
  live:  { bg: "rgba(34,197,94,0.14)",  fg: "#86efac", border: "rgba(34,197,94,0.30)" },
  plan:  { bg: "rgba(59,130,246,0.12)", fg: "#93c5fd", border: "rgba(59,130,246,0.25)" },
  done:  { bg: "rgba(161,161,170,0.12)", fg: "#a1a1aa", border: "rgba(161,161,170,0.20)" },
  alert: { bg: "rgba(239,68,68,0.12)",  fg: "#fca5a5", border: "rgba(239,68,68,0.30)" },
};

function alertColor(n) {
  if (n >= 5) return "var(--mz-danger, #ef4444)";
  if (n >= 1) return "var(--mz-warn, #f59e0b)";
  return "var(--mz-ok, #22c55e)";
}

function fmt(n) {
  return n.toLocaleString("pt-BR");
}

function OpCard({ op }) {
  const sc = STATUS_CHIP[op.status] || STATUS_CHIP.plan;
  return (
    <div
      className="rounded-lg p-4 transition-colors cursor-pointer"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--rule)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--tenant-accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--rule)")}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="px-2 py-[2px] rounded text-[9.5px] font-bold tracking-[0.06em]"
          style={{ background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}` }}
        >
          {OPERACOES_STATUS_LABEL[op.status] || "—"}
        </span>
        <span
          className="text-[10.5px] tracking-[0.04em]"
          style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--fg-faint)" }}
        >
          {op.id} · {op.tipo}
        </span>
      </div>

      <h3 className="text-[14px] font-semibold t-fg-strong leading-snug mb-2 truncate">{op.nome}</h3>

      <div className="flex items-center gap-2 text-[11px] t-fg-muted mb-3">
        <span className="font-semibold t-fg-strong">{op.uf}</span>
        <span className="t-fg-faint">·</span>
        <span className="truncate">{op.mun}</span>
        <span className="t-fg-faint">·</span>
        <span className="truncate">{op.recorte}</span>
      </div>

      <div
        className="h-[6px] rounded-sm overflow-hidden mb-3"
        style={{ background: "var(--bg-elevated, rgba(0,0,0,0.04))" }}
      >
        <div
          className="h-full"
          style={{
            width: `${op.progresso}%`,
            background: "linear-gradient(90deg, var(--tenant-primary), var(--tenant-accent))",
          }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <Stat label="Líd."      value={fmt(op.lid)} />
        <Stat label="Cabos"     value={fmt(op.cabos)} />
        <Stat label="Filiações" value={fmt(op.fil)} />
        <Stat
          label="Alertas"
          value={String(op.alertas)}
          color={alertColor(op.alertas)}
        />
      </div>

      <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "var(--rule)" }}>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--tenant-primary), var(--tenant-primary-strong, var(--tenant-primary)))" }}
        >
          {op.leader}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11.5px] font-semibold t-fg-strong truncate leading-tight">{op.leaderNome}</div>
          <div className="text-[10px] t-fg-faint leading-tight">Líder operação</div>
        </div>
        <span
          className="px-2 py-[2px] rounded text-[10px] font-bold tabular-nums"
          style={{ background: "rgba(34,197,94,0.14)", color: "#86efac" }}
        >
          {op.progresso}%
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div className="text-[9px] t-fg-faint uppercase tracking-[0.10em] font-semibold">{label}</div>
      <div className="text-[13px] font-semibold tabular-nums" style={{ color: color || "var(--fg-strong)" }}>
        {value}
      </div>
    </div>
  );
}

function HubAction({ icon, title, sub, primary, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg p-4 flex items-center gap-3.5 text-left transition-transform"
      style={{
        background: primary
          ? "linear-gradient(135deg, var(--tenant-primary), var(--tenant-primary-strong, var(--tenant-primary)))"
          : "var(--bg-card)",
        border: primary ? "1px solid var(--tenant-accent)" : "1px solid var(--rule)",
        color: primary ? "#fff" : "inherit",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        if (!primary) e.currentTarget.style.borderColor = "var(--tenant-accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        if (!primary) e.currentTarget.style.borderColor = "var(--rule)";
      }}
    >
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 text-[18px]"
        style={{
          background: primary ? "var(--tenant-accent)" : "var(--bg-card-2)",
          color: primary ? "var(--fg-on-accent, #18181b)" : "var(--tenant-accent)",
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-bold leading-tight">{title}</div>
        <div
          className="text-[11px] mt-0.5 leading-tight truncate"
          style={{ color: primary ? "rgba(255,255,255,0.8)" : "var(--fg-muted)" }}
        >
          {sub}
        </div>
      </div>
    </button>
  );
}

export function Operacoes() {
  const [tipoFilter, setTipoFilter] = useState("todas");

  const ativasFiltradas = useMemo(() => {
    if (tipoFilter === "todas") return OPERACOES_ATIVAS;
    return OPERACOES_ATIVAS.filter((op) => op.tipo === tipoFilter);
  }, [tipoFilter]);

  const ativasCount = OPERACOES_ATIVAS.length;
  const alertaCount = OPERACOES_ATIVAS.filter((op) => op.status === "alert").length;

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Operações</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">Hub de operações táticas</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">
              Capilarização, eleitoral, crise e filiação · {ativasCount} ativas · {alertaCount} em alerta
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" type="button">
              <Icon name="FileText" size={13} />Templates
            </button>
            <button className="btn-primary" type="button">
              <Icon name="Plus" size={13} />Nova operação
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {OPERACOES_KPIS.map((kpi) => (
            <div
              key={kpi.l}
              className="rounded-lg p-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}
            >
              <div className="text-[9.5px] t-fg-faint uppercase tracking-[0.16em] font-bold">{kpi.l}</div>
              <div
                className="text-[36px] font-bold t-fg-strong tabular-nums leading-none mt-1.5"
                style={{ letterSpacing: "-0.01em" }}
              >
                {kpi.v}
              </div>
              <div
                className="text-[11px] tabular-nums mt-1"
                style={{
                  color:
                    kpi.ok === true ? "var(--mz-ok, #22c55e)" :
                    kpi.ok === false ? "var(--mz-danger, #ef4444)" :
                    "var(--fg-muted)",
                }}
              >
                {kpi.d}
              </div>
            </div>
          ))}
        </div>

        {/* Hub actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <HubAction
            primary
            icon="+"
            title="Criar Nova Operação"
            sub="Wizard guiado · 6 passos"
          />
          <HubAction
            icon={<Icon name="FileText" size={18} />}
            title="Template Library"
            sub="14 modelos validados"
          />
          <HubAction
            icon={<Icon name="Sparkles" size={18} />}
            title="Briefing IA"
            sub="Sugere onde criar a próxima op"
          />
        </div>

        {/* Operações em curso */}
        <section className="mb-8">
          <header className="flex items-center gap-3 flex-wrap mb-3">
            <h2 className="text-[16px] font-bold t-fg-strong">Operações em Curso</h2>
            <span className="text-[10.5px] t-fg-faint tracking-[0.10em] uppercase font-semibold">
              {ativasCount} ATIVAS · {alertaCount} ALERTA
            </span>
            <div className="flex gap-1.5 ml-auto">
              {OPERACOES_TIPOS.map((t) => {
                const on = tipoFilter === t.k;
                return (
                  <button
                    key={t.k}
                    type="button"
                    onClick={() => setTipoFilter(t.k)}
                    className="text-[11px] px-2.5 py-1 rounded-full transition-colors font-medium"
                    style={{
                      background: on ? "var(--tenant-primary)" : "var(--bg-card)",
                      color: on ? "#fff" : "var(--fg-muted)",
                      border: `1px solid ${on ? "var(--tenant-primary)" : "var(--rule)"}`,
                    }}
                  >
                    {t.l}
                  </button>
                );
              })}
            </div>
          </header>

          {ativasFiltradas.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {ativasFiltradas.map((op) => (
                <OpCard key={op.id} op={op} />
              ))}
            </div>
          ) : (
            <div
              className="rounded-lg p-8 text-center text-[12px] t-fg-muted"
              style={{ background: "var(--bg-card)", border: "1px dashed var(--rule)" }}
            >
              Nenhuma operação do tipo "{tipoFilter}" em curso.
            </div>
          )}
        </section>

        {/* Operações concluídas */}
        <section>
          <header className="flex items-center gap-3 mb-3">
            <h2 className="text-[16px] font-bold t-fg-strong">Operações Concluídas · 30 dias</h2>
            <span className="text-[10.5px] t-fg-faint tracking-[0.10em] uppercase font-semibold">
              {OPERACOES_CONCLUIDAS.length} ENCERRADAS
            </span>
          </header>
          <div className="grid grid-cols-3 gap-4">
            {OPERACOES_CONCLUIDAS.map((op) => (
              <OpCard key={op.id} op={op} />
            ))}
          </div>
        </section>

        {/* Roadmap stub */}
        <div
          className="mt-10 rounded-lg p-4 flex items-center gap-3 text-[12px] t-fg-muted"
          style={{ background: "var(--bg-card-2)", border: "1px dashed var(--rule)" }}
        >
          <Icon name="Sparkles" size={14} />
          <span>
            <b className="t-fg-strong">Próximos passos:</b> Wizard de criação · Gestão Ativa (live feed) · Relatório Final.
            Designer V1.2 entregou os 4 sub-views · Hub portado primeiro pra você validar a base visual.
          </span>
        </div>
      </div>
    </div>
  );
}
