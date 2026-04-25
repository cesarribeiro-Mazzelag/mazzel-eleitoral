"use client";

/* Primitivos usados dentro do modulo Campanha 2026.
 * Adaptado de designer/campanha-primitives.jsx. */

import { Icon } from "../../Icon";

export function Card({ title, sub, right, children, noPadding = false }) {
  return (
    <div className="rounded-xl ring-soft t-bg-card overflow-hidden">
      <div
        className="flex items-center gap-3 px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold t-fg-strong">{title}</div>
          {sub && <div className="text-[10.5px] t-fg-dim mt-0.5">{sub}</div>}
        </div>
        {right}
      </div>
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </div>
  );
}

export function Segment({ value, onChange, options }) {
  return (
    <div
      className="inline-flex items-center gap-0.5 p-0.5 rounded-md"
      style={{ background: "var(--rule)" }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`btn-ghost ${value === o.value ? "active" : ""}`}
          style={{ padding: "4px 10px", fontSize: 11 }}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, color = "var(--tenant-primary)", height = 6 }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="rounded-full overflow-hidden"
      style={{ background: "var(--rule)", height }}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function Sparkline({ points = [], width = 120, height = 32, color = "#60a5fa", fill = false }) {
  if (!points.length) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const path = points
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const last = points.length - 1;
  const lastX = last * step;
  const lastY = height - ((points[last] - min) / range) * height;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      {fill && (
        <path
          d={`${path} L ${lastX.toFixed(1)} ${height} L 0 ${height} Z`}
          fill={color}
          fillOpacity={0.14}
        />
      )}
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

export function KpiTile({ label, valor, delta, sentiment = "neutral", sub, sparkPoints }) {
  const color =
    sentiment === "up"   ? "#22c55e" :
    sentiment === "down" ? "#ef4444" : "#60a5fa";
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}
    >
      <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">{label}</div>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-[28px] font-black tnum font-display t-fg-strong leading-none">{valor}</span>
        {delta && (
          <span className="text-[11px] font-bold tnum" style={{ color }}>
            {delta}
          </span>
        )}
      </div>
      {sub && <div className="text-[10.5px] t-fg-muted mt-1.5">{sub}</div>}
      {sparkPoints && (
        <div className="mt-3">
          <Sparkline points={sparkPoints} width={260} height={28} color={color} fill />
        </div>
      )}
    </div>
  );
}

export function Avatar({ nome, size = 32 }) {
  const initials = String(nome || "-")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold tnum"
      style={{
        width: size,
        height: size,
        background: "var(--rule-strong)",
        color: "var(--fg-strong)",
        fontSize: Math.round(size * 0.34),
      }}
    >
      {initials}
    </div>
  );
}

export function HeroStat({ label, value, sub, delta }) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-1"
        style={{ color: "rgba(255,255,255,0.68)" }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] font-black tnum font-display" style={{ color: "#fff" }}>
          {value}
        </span>
        {sub && <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.72)" }}>{sub}</span>}
        {delta && (
          <span
            className="text-[11px] font-bold tnum"
            style={{ color: delta.startsWith("+") ? "#6ee7b7" : "#fca5a5" }}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

export function ScreenTabs({ screens, active, onChange }) {
  return (
    <div
      className="flex items-center gap-1 px-4 h-11 flex-shrink-0"
      style={{ background: "var(--bg-topbar)", borderBottom: "1px solid var(--rule)" }}
    >
      <div className="flex items-center gap-2 mr-3">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: "var(--tenant-primary)", color: "#fff" }}
        >
          <Icon name="Sparkles" size={12} />
        </div>
        <div>
          <div className="text-[12px] font-bold t-fg-strong leading-none">Campanha 2026</div>
          <div className="text-[9.5px] t-fg-dim uppercase tracking-[0.1em] font-semibold mt-0.5">
            Jaques Wagner · BA
          </div>
        </div>
      </div>
      <div className="w-px h-5" style={{ background: "var(--rule)" }} />
      <nav className="flex items-center gap-0.5 ml-2 overflow-x-auto">
        {screens.map((s) => {
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              className="flex items-center gap-1.5 px-3 h-7 rounded-md text-[12px] font-semibold whitespace-nowrap"
              style={{
                color: isActive ? "var(--fg-strong)" : "var(--fg-muted)",
                background: isActive ? "var(--rule-strong)" : "transparent",
              }}
              type="button"
            >
              <Icon name={s.icon} size={12} />
              {s.label}
            </button>
          );
        })}
      </nav>
      <div className="flex-1" />
      <button className="btn-ghost" style={{ padding: "5px 9px" }} type="button">
        <Icon name="Download" size={11} />
        Export
      </button>
    </div>
  );
}
