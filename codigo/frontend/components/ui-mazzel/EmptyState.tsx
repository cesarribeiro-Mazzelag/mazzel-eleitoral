"use client";

import React from "react";

type Tone = "muted" | "ok" | "warn";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  text?: string;
  tone?: Tone;
}

const TONE_STYLES: Record<Tone, { bg: string; fg: string; border: string }> = {
  muted: {
    bg: "var(--mz-bg-card-2)",
    fg: "var(--mz-fg-muted)",
    border: "var(--mz-rule)",
  },
  ok: {
    bg: "rgba(34,197,94,0.06)",
    fg: "var(--mz-ok)",
    border: "rgba(34,197,94,0.35)",
  },
  warn: {
    bg: "rgba(251,191,36,0.06)",
    fg: "var(--mz-warn)",
    border: "rgba(251,191,36,0.35)",
  },
};

/**
 * EmptyState - estado vazio padronizado com ícone e mensagem.
 * Portado de platform/primitives.jsx para TSX.
 */
export function EmptyState({ icon, title, text, tone = "muted" }: EmptyStateProps) {
  const styles = TONE_STYLES[tone];
  return (
    <div
      className="rounded-xl px-6 py-8 flex flex-col items-center text-center"
      style={{
        background: styles.bg,
        border: `1px dashed ${styles.border}`,
      }}
    >
      {icon && <div style={{ color: styles.fg }}>{icon}</div>}
      <div className="mt-3 text-[14px] font-bold mz-t-fg-strong">{title}</div>
      {text && (
        <div className="mt-1 text-[12px] mz-t-fg-muted max-w-sm">{text}</div>
      )}
    </div>
  );
}
