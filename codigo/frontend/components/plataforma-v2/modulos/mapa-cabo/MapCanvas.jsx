"use client";

/* SVG do bairro com quadras + cabos + rotas.
 * Adaptado de Mapa do Cabo.html MapCanvas. */

import { useRef, useState } from "react";
import { CABOS, QUADRAS_BASE, CONFLICTS, perfFor, routesForCabo } from "./data";

function polyToPath(points) {
  return "M " + points.map((p) => p.join(",")).join(" L ") + " Z";
}

function pointInPoly(pt, poly) {
  let [x, y] = pt;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect =
      ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function colorForQuadra(q, layer, owners) {
  const caboId = owners[q.id];
  const p = perfFor(q.id, owners);
  if (layer === "responsavel") {
    if (CONFLICTS[q.id]) return { fill: "#dc2626", fillOpacity: 0.35, stroke: "#dc2626" };
    if (!caboId)          return { fill: "#a1a1aa", fillOpacity: 0.15, stroke: "#dc2626" };
    const c = CABOS.find((x) => x.id === caboId);
    return { fill: c.cor, fillOpacity: 0.22, stroke: c.cor };
  }
  if (layer === "cobertura") {
    const v = p.cobertura || 0;
    const hue = Math.round(v * 135);
    return { fill: `hsl(${hue},65%,55%)`, fillOpacity: 0.45, stroke: `hsl(${hue},65%,40%)` };
  }
  if (layer === "performance") {
    const v = p.conversao || 0;
    if (v > 0.6)  return { fill: "#059669", fillOpacity: 0.38, stroke: "#047857" };
    if (v > 0.45) return { fill: "#d97706", fillOpacity: 0.32, stroke: "#b45309" };
    if (v > 0)    return { fill: "#dc2626", fillOpacity: 0.30, stroke: "#b91c1c" };
    return { fill: "#a1a1aa", fillOpacity: 0.12, stroke: "#71717a" };
  }
  if (layer === "orfaos") {
    if (CONFLICTS[q.id]) return { fill: "#dc2626", fillOpacity: 0.32, stroke: "#dc2626" };
    if (!caboId)          return { fill: "#dc2626", fillOpacity: 0.40, stroke: "#b91c1c" };
    return { fill: "#a1a1aa", fillOpacity: 0.08, stroke: "#a1a1aa" };
  }
  if (layer === "conflitos") {
    if (CONFLICTS[q.id]) return { fill: "#dc2626", fillOpacity: 0.45, stroke: "#b91c1c" };
    if (!caboId)          return { fill: "#a1a1aa", fillOpacity: 0.08, stroke: "#71717a" };
    const c = CABOS.find((x) => x.id === caboId);
    return { fill: c.cor, fillOpacity: 0.14, stroke: c.cor };
  }
  return { fill: "#a1a1aa", fillOpacity: 0.1, stroke: "#71717a" };
}

export function MapCanvas({
  layer,
  owners,
  selected,
  onSelect,
  editMode,
  lassoSet,
  onLassoAdd,
  showRoutes,
  caboFocus,
}) {
  const svgRef = useRef(null);
  const [lassoPath, setLassoPath] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [hoverQ, setHoverQ] = useState(null);

  function svgPoint(e) {
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svgRef.current.getScreenCTM().inverse());
  }

  function onMouseDown(e) {
    if (editMode !== "lasso") return;
    const p = svgPoint(e);
    setLassoPath([[p.x, p.y]]);
    setDragging(true);
  }

  function onMouseMove(e) {
    if (!dragging) return;
    const p = svgPoint(e);
    setLassoPath((pp) => [...pp, [p.x, p.y]]);
  }

  function onMouseUp() {
    if (!dragging) return;
    setDragging(false);
    if (lassoPath.length > 2) {
      const inside = QUADRAS_BASE.filter((q) => pointInPoly(q.centroid, lassoPath)).map((q) => q.id);
      onLassoAdd(inside);
    }
    setLassoPath([]);
  }

  return (
    <div className="relative w-full h-full" style={{ background: "var(--bg-page-2)" }}>
      <svg
        ref={svgRef}
        viewBox="0 0 800 500"
        style={{ width: "100%", height: "100%", display: "block", cursor: editMode === "lasso" ? "crosshair" : "default" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <defs>
          <pattern id="mc-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--rule)" strokeWidth="0.5" />
          </pattern>
          <filter id="mc-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.15" />
          </filter>
        </defs>
        <rect width="800" height="500" fill="url(#mc-grid)" />
        <path
          d="M 20 30 L 790 30 L 790 475 L 20 475 Z"
          fill="none"
          stroke="var(--tenant-primary)"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          opacity="0.35"
        />
        <line x1="20" y1="244" x2="790" y2="244" stroke="var(--fg-ghost)" strokeWidth="3" />
        <text x="780" y="240" textAnchor="end" fontSize="8.5" fontWeight="600" fill="var(--fg-dim)" letterSpacing="0.1em">
          AV. GETÚLIO VARGAS
        </text>
        <line x1="410" y1="30" x2="410" y2="475" stroke="var(--fg-ghost)" strokeWidth="3" />

        {QUADRAS_BASE.map((q) => {
          const col = colorForQuadra(q, layer, owners);
          const isSelected = selected === q.id;
          const isLasso = lassoSet.has(q.id);
          const isOrphan = !owners[q.id];
          const isConflict = !!CONFLICTS[q.id];
          const isCaboFocus = caboFocus && owners[q.id] === caboFocus;
          const dim = caboFocus && !isCaboFocus;
          return (
            <g key={q.id}>
              <path
                d={polyToPath(q.points)}
                fill={col.fill}
                fillOpacity={dim ? col.fillOpacity * 0.25 : col.fillOpacity}
                stroke={isLasso ? "var(--tenant-primary)" : col.stroke}
                strokeWidth={isSelected ? 2.2 : isLasso ? 2 : 1}
                style={{ filter: isSelected ? "url(#mc-shadow)" : "none", opacity: dim ? 0.5 : 1, cursor: "pointer" }}
                onMouseEnter={() => setHoverQ(q.id)}
                onMouseLeave={() => setHoverQ(null)}
                onClick={(e) => { e.stopPropagation(); onSelect(q.id); }}
              />
              {isOrphan && (layer === "orfaos" || layer === "responsavel") && (
                <circle cx={q.centroid[0]} cy={q.centroid[1]} r={14} fill="none" stroke="#dc2626" strokeWidth="1.4" />
              )}
              {isConflict && (layer === "conflitos" || layer === "responsavel") && (
                <g>
                  <circle cx={q.centroid[0]} cy={q.centroid[1]} r={12} fill="#fff" stroke="#b91c1c" strokeWidth="1.6" />
                  <text x={q.centroid[0]} y={q.centroid[1] + 4} textAnchor="middle" fontSize="11" fontWeight="900" fill="#b91c1c">!</text>
                </g>
              )}
              <text
                x={q.centroid[0]}
                y={q.centroid[1] + 3}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={dim ? "var(--fg-faint)" : "var(--fg-strong)"}
                opacity={isConflict ? 0 : 1}
                pointerEvents="none"
              >
                {q.id}
              </text>
            </g>
          );
        })}

        {showRoutes && CABOS.map((c) => {
          if (caboFocus && c.id !== caboFocus) return null;
          const pts = routesForCabo(c.id, owners);
          if (pts.length < 2) return null;
          const d = pts.reduce((acc, p, i) => acc + (i === 0 ? `M ${p[0]},${p[1]}` : ` L ${p[0]},${p[1]}`), "");
          return <path key={c.id} d={d} fill="none" stroke={c.cor} strokeWidth="2" strokeOpacity="0.75" />;
        })}

        {CABOS.map((c) => {
          if (caboFocus && c.id !== caboFocus) return null;
          const pts = routesForCabo(c.id, owners);
          if (!pts.length) return null;
          const [x, y] = pts[pts.length - 1];
          return (
            <g key={c.id}>
              <circle cx={x} cy={y} r={9} fill="#fff" stroke={c.cor} strokeWidth="2.2" />
              <circle cx={x} cy={y} r={4} fill={c.cor} />
            </g>
          );
        })}

        {lassoPath.length > 1 && (
          <path
            d={"M " + lassoPath.map((p) => p.join(",")).join(" L ")}
            fill="rgba(0,42,123,0.08)"
            stroke="var(--tenant-primary)"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
        )}

        <text x="28" y="22" fontSize="10" fontWeight="700" fill="var(--fg-dim)" letterSpacing="0.14em">
          BAIRRO TOMBA · FEIRA DE SANTANA · ~40 QUADRAS
        </text>
        <text x="28" y="490" fontSize="8.5" fill="var(--fg-faint)" fontFamily="JetBrains Mono">
          {QUADRAS_BASE.length} quadras · {Object.keys(owners).length} atribuídas · {QUADRAS_BASE.length - Object.keys(owners).length} órfãs · {Object.keys(CONFLICTS).length} conflitos
        </text>
      </svg>

      {hoverQ && !dragging && (() => {
        const q = QUADRAS_BASE.find((x) => x.id === hoverQ);
        const caboId = owners[q.id];
        const c = caboId ? CABOS.find((x) => x.id === caboId) : null;
        const p = perfFor(q.id, owners);
        const conflict = CONFLICTS[q.id];
        return (
          <div
            className="absolute pointer-events-none rounded-lg p-3 text-[11px] ring-soft"
            style={{
              top: 14,
              right: 14,
              width: 210,
              background: "var(--bg-card)",
              boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="font-mono font-bold t-fg-strong text-[13px]">{q.id}</div>
              {conflict && <span className="chip chip-red" style={{ height: 16, fontSize: 9 }}>conflito</span>}
              {!caboId && !conflict && <span className="chip chip-red" style={{ height: 16, fontSize: 9 }}>órfã</span>}
              {caboId && !conflict && <span className="chip chip-green" style={{ height: 16, fontSize: 9 }}>atribuída</span>}
            </div>
            <div className="t-fg-muted mb-2">{q.rua} · {q.domicilios} domicílios</div>
            {c && (
              <div className="flex items-center gap-2 mb-2">
                <div style={{ width: 8, height: 8, borderRadius: 99, background: c.cor }} />
                <span className="t-fg-strong font-semibold">{c.nome}</span>
              </div>
            )}
            {caboId && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div className="t-fg-dim">Cobertura</div>
                <div className="tnum font-semibold">{Math.round(p.cobertura * 100)}%</div>
                <div className="t-fg-dim">Conversão</div>
                <div className="tnum font-semibold">{Math.round(p.conversao * 100)}%</div>
                <div className="t-fg-dim">Hoje</div>
                <div className="tnum font-semibold">{p.feitoHoje} visitas</div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
