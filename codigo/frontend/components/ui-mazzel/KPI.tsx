"use client";

import React from "react";

type KPITone = "default" | "ok" | "warn" | "danger";

interface KPIProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: KPITone;
}

const TONE_STYLES: Record<KPITone, React.CSSProperties> = {
  default: {},
  ok:      { color: "var(--mz-ok)" },
  warn:    { color: "var(--mz-warn)" },
  danger:  { color: "var(--mz-danger)" },
};

/**
 * KPI - card de métrica simples com label, valor e hint.
 * Portado de platform/primitives.jsx para TSX.
 */
export function KPI({ label, value, hint, tone = "default" }: KPIProps) {
  const valueStyle = TONE_STYLES[tone];
  return (
    <div
      className="rounded-lg px-4 py-3.5"
      style={{
        background: "var(--mz-bg-card-2)",
        border: "1px solid var(--mz-rule)",
      }}
    >
      <div className="text-[10px] mz-font-mono tracking-[0.15em] uppercase mz-t-fg-dim">
        {label}
      </div>
      <div
        className="text-[22px] font-black mz-tnum mt-1 mz-font-display mz-t-fg-strong"
        style={tone !== "default" ? valueStyle : undefined}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[11px] mz-t-fg-muted mt-0.5">{hint}</div>
      )}
    </div>
  );
}
