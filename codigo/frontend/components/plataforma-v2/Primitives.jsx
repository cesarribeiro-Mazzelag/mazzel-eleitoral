"use client";

/* Primitivos reutilizáveis do Designer.
 * Adaptado de designer/primitives.jsx. */

export function SectionShell({ id, label, title, sub, kicker, children, pad = true }) {
  return (
    <section id={id} data-screen-label={label} className="rounded-2xl t-bg-card ring-soft overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="flex items-baseline gap-3">
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase t-fg-dim">{title}</div>
          {sub && <div className="text-[11px] font-mono t-fg-ghost">/ {sub}</div>}
        </div>
        {kicker && <div className="text-[11px] font-mono t-fg-dim">{kicker}</div>}
      </div>
      <div className={pad ? "p-6" : ""}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon, title, text, tone = "muted" }) {
  const toneCls = {
    muted: { bg: "var(--bg-card-2)",         fg: "var(--fg-muted)", border: "var(--rule)" },
    ok:    { bg: "rgba(34,197,94,0.06)",     fg: "var(--ok)",       border: "rgba(34,197,94,0.35)" },
    warn:  { bg: "rgba(251,191,36,0.06)",    fg: "var(--warn)",     border: "rgba(251,191,36,0.35)" },
  }[tone];
  return (
    <div className="rounded-xl px-6 py-8 flex flex-col items-center text-center"
         style={{ background: toneCls.bg, border: `1px dashed ${toneCls.border}` }}>
      <div style={{ color: toneCls.fg }}>{icon}</div>
      <div className="mt-3 text-[14px] font-bold t-fg-strong">{title}</div>
      {text && <div className="mt-1 text-[12px] t-fg-muted max-w-sm">{text}</div>}
    </div>
  );
}

export function KPI({ label, value, hint, tone = "default" }) {
  const color = { default: "t-fg-strong", ok: "", warn: "", danger: "" }[tone] || "t-fg-strong";
  const style = {
    default: {},
    ok:     { color: "var(--ok)" },
    warn:   { color: "var(--warn)" },
    danger: { color: "var(--danger)" },
  }[tone] || {};
  return (
    <div className="rounded-lg px-4 py-3.5" style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}>
      <div className="text-[10px] font-mono tracking-[0.15em] uppercase t-fg-dim">{label}</div>
      <div className={`text-[22px] font-black tnum mt-1 font-display ${color}`} style={style}>{value}</div>
      {hint && <div className="text-[11px] t-fg-muted mt-0.5">{hint}</div>}
    </div>
  );
}

export function Divider() {
  return <div className="h-px" style={{ background: "var(--rule)" }} />;
}
