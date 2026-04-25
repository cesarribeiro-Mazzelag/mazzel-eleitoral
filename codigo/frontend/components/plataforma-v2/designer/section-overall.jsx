/* Section 02 — Overall Map (radar + breakdown) */

function scoreColor(v) {
  if (v >= 85) return { ring: "rgba(34,197,94,0.35)",  fg: "#22c55e", bg: "rgba(34,197,94,0.10)",  grade: "A" };
  if (v >= 70) return { ring: "rgba(59,130,246,0.35)", fg: "#3b82f6", bg: "rgba(59,130,246,0.10)", grade: "B" };
  if (v >= 50) return { ring: "rgba(234,179,8,0.40)",  fg: "#eab308", bg: "rgba(234,179,8,0.10)",  grade: "C" };
  if (v >= 30) return { ring: "rgba(249,115,22,0.40)", fg: "#f97316", bg: "rgba(249,115,22,0.10)", grade: "D" };
  return         { ring: "rgba(239,68,68,0.45)",  fg: "#ef4444", bg: "rgba(239,68,68,0.10)",  grade: "F" };
}

function HexRadar({ values, size = 260 }) {
  const cx = size/2, cy = size/2, R = size*0.38;
  const rings = [0.25, 0.5, 0.75, 1.0];
  const angle = (i) => (Math.PI*2*i)/6 - Math.PI/2;
  const ringPoints = (r) => DIMENSIONS.map((_,i)=>{ const a=angle(i); return [cx+Math.cos(a)*R*r, cy+Math.sin(a)*R*r]; });
  const valuePoints = DIMENSIONS.map((d,i)=>{ const a=angle(i); const r=(values[d.key]??0)/100; return [cx+Math.cos(a)*R*r, cy+Math.sin(a)*R*r]; });
  const poly = (pts) => pts.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width:"100%", maxWidth:size, height:"auto" }}>
      {rings.map((r,i)=>(
        <polygon key={r} points={poly(ringPoints(r))} fill="none" stroke="var(--rule-strong)" strokeWidth={i===rings.length-1?1.25:0.75}/>
      ))}
      {DIMENSIONS.map((d,i)=>{ const [x,y]=ringPoints(1)[i]; return <line key={d.key} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--rule)" strokeWidth="0.75"/>; })}
      <defs>
        <radialGradient id="radar-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.18"/>
        </radialGradient>
      </defs>
      <polygon points={poly(valuePoints)} fill="url(#radar-fill)" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round"/>
      {valuePoints.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3.5" fill="var(--bg-card)" stroke="#60a5fa" strokeWidth="1.5"/>)}
      {DIMENSIONS.map((d,i)=>{ const a=angle(i); const lx=cx+Math.cos(a)*(R+22); const ly=cy+Math.sin(a)*(R+22); const v=values[d.key]??0;
        return (
          <g key={d.key}>
            <text x={lx} y={ly-4} textAnchor="middle" fontSize="10" fontWeight="700" letterSpacing="0.15em" fill="var(--fg-muted)" fontFamily="Inter">{d.key}</text>
            <text x={lx} y={ly+9} textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--fg-strong)" fontFamily="Inter" style={{ fontVariantNumeric:"tabular-nums" }}>{v}</text>
          </g>
        );
      })}
    </svg>
  );
}

function StatRow({ dim, value, isActive, onClick }) {
  const c = scoreColor(value);
  return (
    <button type="button" onClick={onClick}
      className="w-full text-left rounded-lg px-3 py-2.5 flex items-center gap-3 transition-colors"
      style={{ background: isActive?"var(--rule)":"transparent", border:`1px solid ${isActive?"var(--rule-strong)":"transparent"}` }}>
      <div className="flex-shrink-0 w-10 h-10 rounded-md flex flex-col items-center justify-center"
        style={{ background:c.bg, boxShadow:`inset 0 0 0 1px ${c.ring}` }}>
        <div className="text-[9px] font-bold tracking-[0.15em]" style={{color:c.fg}}>{dim.key}</div>
        <div className="text-[11px] font-black tnum leading-none mt-0.5" style={{color:c.fg}}>{value}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[12px] font-semibold t-fg-strong">{dim.label}</div>
          <div className="text-[10px] font-mono t-fg-dim">
            <span className="font-bold" style={{color:c.fg}}>{c.grade}</span>
            <span className="t-fg-ghost"> · </span>
            <span className="tnum">{value}/100</span>
          </div>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"var(--rule)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width:`${value}%`, background:`linear-gradient(90deg, ${c.fg}88, ${c.fg})` }}/>
        </div>
      </div>
    </button>
  );
}

function StatBreakdown({ dim, value }) {
  const rows = STAT_BREAKDOWN[dim.key] || [];
  const c = scoreColor(value);
  return (
    <div className="h-full rounded-lg p-5" style={{ background:"var(--bg-card-2)", border:"1px solid var(--rule)" }}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase t-fg-dim">{dim.key}</div>
          <div className="text-[22px] font-black t-fg-strong font-display mt-0.5">{dim.label}</div>
        </div>
        <div className="text-right">
          <div className="text-[48px] font-black font-display tnum leading-[0.9]" style={{color:c.fg}}>{value}</div>
          <div className="text-[10px] font-bold tracking-[0.15em] uppercase mt-0.5" style={{color:c.fg}}>Grade {c.grade}</div>
        </div>
      </div>
      <p className="text-[12px] t-fg-muted leading-relaxed mt-2 mb-4">{dim.hint}</p>
      <div className="text-[10px] font-bold tracking-[0.15em] uppercase t-fg-dim mb-2">Composição</div>
      <div className="space-y-2.5">
        {rows.map(r=>{ const rc=scoreColor(r.v); return (
          <div key={r.k}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[12px] t-fg">{r.k}</div>
              <div className="text-[11px] font-mono t-fg-dim flex items-center gap-2">
                <span className="tnum" style={{color:rc.fg}}>{r.v}</span>
                <span className="t-fg-ghost">peso</span>
                <span className="t-fg-muted">{r.w}</span>
              </div>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background:"var(--rule)" }}>
              <div className="h-full rounded-full" style={{ width:`${r.v}%`, background:rc.fg }}/>
            </div>
          </div>
        ); })}
      </div>
      <div className="mt-5 pt-4 grid grid-cols-3 gap-3" style={{ borderTop:"1px solid var(--rule)" }}>
        <div>
          <div className="text-[9px] font-mono tracking-[0.15em] uppercase t-fg-dim">Percentil</div>
          <div className="text-[15px] font-bold tnum t-fg-strong mt-0.5">Top {value>=85?"10":value>=70?"25":value>=50?"50":"70"}%</div>
        </div>
        <div>
          <div className="text-[9px] font-mono tracking-[0.15em] uppercase t-fg-dim">Variação</div>
          <div className="text-[15px] font-bold tnum mt-0.5" style={{color: value>=60?"#22c55e":"#ef4444"}}>{value>=60?"▲ +4":"▼ -7"}</div>
        </div>
        <div>
          <div className="text-[9px] font-mono tracking-[0.15em] uppercase t-fg-dim">Fonte</div>
          <div className="text-[11px] t-fg-muted mt-0.5 leading-tight">TSE · Câmara · Senado</div>
        </div>
      </div>
    </div>
  );
}

function OverallMap({ profile }) {
  const values = STATS[profile.sparse ? "marcal" : "wagner"];
  const [selKey, setSelKey] = useState("BSE");
  const dim = DIMENSIONS.find(d=>d.key===selKey);
  const overall = Math.round(Object.values(values).reduce((a,b)=>a+b,0)/DIMENSIONS.length);
  return (
    <SectionShell id="sec-overall" label="02 Overall" title="Mapa do Overall" sub="stat breakdown"
      kicker={<><span>Média ponderada: <span className="t-fg-strong font-bold tnum">{overall}</span></span><span className="t-fg-ghost mx-2">·</span><span>6 dimensões</span></>}>
      <div className="grid gap-6" style={{ gridTemplateColumns: "320px 280px 1fr" }}>
        <div className="flex flex-col">
          <div className="flex items-center justify-center flex-1" style={{minHeight:280}}>
            <HexRadar values={values} size={280}/>
          </div>
          <div className="mt-2 pt-4 flex items-center justify-between text-[10px] font-mono t-fg-dim" style={{borderTop:"1px solid var(--rule)"}}>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{background:"#3b82f6"}}/>Candidato</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{background:"var(--rule-strong)",boxShadow:"inset 0 0 0 1px var(--fg-ghost)"}}/>Grade (0–100)</div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-bold tracking-[0.15em] uppercase t-fg-dim mb-2 px-1">Dimensões</div>
          {DIMENSIONS.map(d=>(
            <StatRow key={d.key} dim={d} value={values[d.key]} isActive={d.key===selKey} onClick={()=>setSelKey(d.key)}/>
          ))}
        </div>
        <div><StatBreakdown dim={dim} value={values[dim.key]}/></div>
      </div>
    </SectionShell>
  );
}

Object.assign(window, { OverallMap, scoreColor });
