"use client";

import React from "react";

interface SectionShellProps {
  id?: string;
  label?: string;
  title: string;
  sub?: string;
  kicker?: React.ReactNode;
  children: React.ReactNode;
  pad?: boolean;
}

/**
 * SectionShell - container de seção com header padronizado.
 * Portado de platform/primitives.jsx para TSX.
 * Usa tokens CSS do design system Mazzel (globals-mazzel.css).
 */
export function SectionShell({
  id,
  label,
  title,
  sub,
  kicker,
  children,
  pad = true,
}: SectionShellProps) {
  return (
    <section
      id={id}
      data-screen-label={label}
      className="rounded-2xl mz-t-bg-card mz-ring-soft overflow-hidden"
    >
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--mz-rule)" }}
      >
        <div className="flex items-baseline gap-3">
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase mz-t-fg-dim">
            {title}
          </div>
          {sub && (
            <div className="text-[11px] mz-font-mono mz-t-fg-ghost">/ {sub}</div>
          )}
        </div>
        {kicker && (
          <div className="text-[11px] mz-font-mono mz-t-fg-dim">{kicker}</div>
        )}
      </div>
      <div className={pad ? "p-6" : ""}>{children}</div>
    </section>
  );
}
