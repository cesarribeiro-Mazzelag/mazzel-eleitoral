/* =========================================================================
 * Campanha · Adapter — small utility shims + reusable mini-components
 * ========================================================================= */

/* Sparkline SVG */
function Sparkline({ points, width = 120, height = 32, color = "currentColor", fill = true }) {
  if (!points || !points.length) return null;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${height - ((p - min) / span) * height}`).join(" ");
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      {fill && <path d={area} fill={color} opacity={0.12}/>}
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* KPI tile */
function KpiTile({ label, valor, delta, sentiment, sub, sparkPoints, sparkColor, onClick }) {
  const sentimentColor = sentiment === "up" ? "var(--ok)" : sentiment === "down" ? "var(--danger)" : "var(--fg-dim)";
  return (
    <div className="kpi-card" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.12em] font-semibold">{label}</div>
        {delta && (
          <span className="text-[11px] font-bold tnum flex items-center gap-0.5" style={{ color: sentimentColor }}>
            {sentiment === "up" && <CIcon name="ArrowUp" size={10}/>}
            {sentiment === "down" && <CIcon name="ArrowDown" size={10}/>}
            {delta}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[28px] font-black tnum font-display leading-none" style={{ background: "linear-gradient(180deg, var(--overall-from), var(--overall-to))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{valor}</div>
          {sub && <div className="text-[10.5px] t-fg-muted mt-1.5">{sub}</div>}
        </div>
        {sparkPoints && <Sparkline points={sparkPoints} color={sparkColor || sentimentColor} width={96} height={36}/>}
      </div>
    </div>
  );
}

/* Progress bar */
function ProgressBar({ value, max = 100, color = "var(--tenant-primary)", height = 6 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ width: "100%", height, background: "var(--rule)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.4s" }}/>
    </div>
  );
}

/* Status dot */
function StatusDot({ status }) {
  const map = {
    ativo:    "var(--ok)",
    destaque: "var(--ok)",
    atencao:  "var(--warn)",
    vaga:     "var(--fg-dim)",
    critico:  "var(--danger)",
  };
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: map[status] || "var(--fg-dim)", display: "inline-block", flexShrink: 0 }}/>;
}

/* Tier pill */
function TierPill({ tier }) {
  return (
    <span className={`chip tier-${tier}`} style={{ border: "none" }}>{tier.toUpperCase()}</span>
  );
}

/* Avatar */
function Avatar({ nome, size = 28, bg = null }) {
  const ini = nome.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const colors = ["#1d4ed8","#059669","#9333ea","#c2410c","#db2777","#0891b2","#ca8a04"];
  const seed = nome.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const color = bg || colors[seed % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 700, flexShrink: 0 }}>{ini}</div>
  );
}

/* Card wrapper */
function Card({ title, sub, right, children, noPadding, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <header className="card-header">
          <div className="min-w-0 flex-1">
            {sub && <div className="card-sub mb-0.5">{sub}</div>}
            {title && <div className="card-title">{title}</div>}
          </div>
          {right}
        </header>
      )}
      <div style={{ padding: noPadding ? 0 : 14 }}>{children}</div>
    </section>
  );
}

/* Segment control */
function Segment({ value, options, onChange }) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={o.value} className={`seg-item ${value === o.value ? "active" : ""}`} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

Object.assign(window, { Sparkline, KpiTile, ProgressBar, StatusDot, TierPill, Avatar, Card, Segment });
