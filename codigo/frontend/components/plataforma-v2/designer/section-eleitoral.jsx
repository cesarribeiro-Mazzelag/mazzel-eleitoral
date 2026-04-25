/* Section 03 — Mapa Eleitoral (abstract choropleth) */

const UF_POLYS = {
  BA: "M 280 180 L 340 170 L 360 200 L 380 240 L 360 290 L 310 300 L 280 280 L 260 240 Z",
  PE: "M 290 150 L 340 140 L 360 160 L 340 170 L 280 180 L 270 160 Z",
  SE: "M 340 170 L 360 170 L 370 185 L 360 200 Z",
  AL: "M 360 170 L 380 165 L 395 180 L 375 195 L 360 200 Z",
  CE: "M 280 100 L 340 90 L 360 110 L 340 140 L 290 150 L 280 135 Z",
  PI: "M 230 110 L 280 100 L 280 135 L 270 160 L 250 170 L 220 140 Z",
  MA: "M 180 90 L 230 95 L 240 130 L 220 140 L 180 135 L 165 115 Z",
  SP: "M 200 320 L 260 310 L 280 340 L 260 370 L 210 370 L 190 350 Z",
  MG: "M 230 240 L 290 230 L 310 260 L 290 300 L 240 300 L 215 270 Z",
  RJ: "M 280 310 L 310 305 L 325 320 L 310 335 L 285 335 Z",
  PR: "M 190 360 L 240 355 L 260 380 L 240 400 L 200 400 L 180 380 Z",
};

function intensityColor(v) {
  // 5-level ramp using --accent (candidate/party blue)
  if (v >= 80) return "#1e40af";
  if (v >= 60) return "#2563eb";
  if (v >= 40) return "#60a5fa";
  if (v >= 20) return "#93c5fd";
  if (v > 0)   return "#dbeafe";
  return "var(--rule-strong)";
}
function intensityLabel(v) {
  if (v >= 80) return "Domina";
  if (v >= 60) return "Forte";
  if (v >= 40) return "Médio";
  if (v >= 20) return "Fraco";
  return "Ausente";
}

function MapaEleitoral({ profile }) {
  const e = profile.eleitoral;
  return (
    <SectionShell id="sec-mapa" label="03 Mapa Eleitoral" title="Mapa Eleitoral" sub={e.escopo.toLowerCase()}
      kicker={<span>Ano-referência: <span className="t-fg-strong tnum">{e.ano}</span></span>} pad={false}>
      <div className="relative" style={{ height: 480 }}>
        {/* choropleth */}
        <svg viewBox="0 0 600 480" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="map-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--bg-card)"/>
              <stop offset="100%" stopColor="var(--bg-card-2)"/>
            </linearGradient>
            <pattern id="grid-dots" width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="var(--fg-ghost)" opacity="0.35"/>
            </pattern>
          </defs>
          <rect width="600" height="480" fill="url(#map-bg)"/>
          <rect width="600" height="480" fill="url(#grid-dots)"/>
          {/* ocean label */}
          <text x="480" y="240" fontSize="10" letterSpacing="0.25em" fill="var(--fg-ghost)" fontFamily="JetBrains Mono">ATLÂNTICO</text>
          {/* polygons */}
          {Object.entries(UF_POLYS).map(([uf, d])=>{
            const v = e.mapIntensity[uf] ?? 0;
            const c = intensityColor(v);
            return (
              <g key={uf} className="map-region">
                <path d={d} fill={c} fillOpacity={v>0?0.9:0.15} stroke="var(--bg-card)" strokeWidth="1.5"/>
                {v >= 40 && (() => {
                  // centroid approximation from path - simple text at heuristic pos
                  const pos = { BA:[315,235], PE:[315,160], SP:[230,345], MG:[270,270], CE:[315,120], PI:[250,135], MA:[205,115], RJ:[300,322], PR:[220,380], SE:[355,188], AL:[378,183] }[uf];
                  return pos ? (
                    <text x={pos[0]} y={pos[1]} fontSize="11" fontWeight="800" fill={v>=60?"#fff":"var(--fg-strong)"} textAnchor="middle" fontFamily="Inter">{uf}</text>
                  ) : null;
                })()}
              </g>
            );
          })}
        </svg>

        {/* chip top-left: context */}
        <div className="absolute top-5 left-5">
          <div className="chip chip-blue !h-auto !px-3 !py-2 !text-[11px]">
            <span className="t-fg-strong font-bold">Eleito em {e.ano}</span>
            <span className="t-fg-ghost">·</span>
            <span className="tnum">{e.votos} votos</span>
            <span className="t-fg-ghost">·</span>
            <span>{e.percentValidos} válidos</span>
          </div>
        </div>

        {/* badge top-right */}
        <div className="absolute top-5 right-5 rounded-lg px-3 py-2"
          style={{ background:"var(--bg-card)", border:"1px solid var(--rule-strong)" }}>
          <div className="text-[9px] font-mono t-fg-dim tracking-[0.2em]">ESCOPO</div>
          <div className="text-[13px] font-bold t-fg-strong mt-0.5">{e.escopo}</div>
        </div>

        {/* top 3 munis card */}
        <div className="absolute right-5 bottom-16 w-[240px] rounded-xl p-4"
          style={{ background:"var(--bg-card)", border:"1px solid var(--rule-strong)", boxShadow:"0 20px 40px -20px rgba(0,0,0,0.5)" }}>
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase t-fg-dim mb-3">Top 3 municípios</div>
          <div className="space-y-2.5">
            {e.topMunis.map((m,i)=>(
              <div key={m.nome} className="flex items-center gap-3">
                <div className="text-[10px] font-mono t-fg-ghost w-4">{String(i+1).padStart(2,'0')}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold t-fg-strong truncate">{m.nome}</div>
                  <div className="text-[10px] font-mono t-fg-dim">{m.votos} votos</div>
                </div>
                <div className="text-[13px] font-black tnum t-accent">{m.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* legend */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop:"1px solid var(--rule)" }}>
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase t-fg-dim">Intensidade</div>
        <div className="flex items-center gap-0">
          {[0,20,40,60,80].map((v,i)=>(
            <div key={v} className="flex items-center gap-2 px-3" style={i>0?{borderLeft:"1px solid var(--rule)"}:{}}>
              <div className="w-5 h-3 rounded-sm" style={{ background: intensityColor(v+1), opacity: v===0?0.25:1 }}/>
              <div className="text-[11px] t-fg-muted">{intensityLabel(v+1)}</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] font-mono t-fg-dim">Fonte: TSE</div>
      </div>
    </SectionShell>
  );
}

Object.assign(window, { MapaEleitoral });
