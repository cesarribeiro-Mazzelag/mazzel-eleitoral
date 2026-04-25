/* Section 08 — Emendas parlamentares */

function Donut({ data, size = 180 }) {
  const total = data.reduce((a,b)=>a+b.v,0);
  const cx = size/2, cy = size/2, R = size/2 - 8, r = size/2 - 34;
  let acc = 0;
  const arcs = data.map(d => {
    const start = acc/total * Math.PI*2 - Math.PI/2;
    acc += d.v;
    const end = acc/total * Math.PI*2 - Math.PI/2;
    const large = (end-start) > Math.PI ? 1 : 0;
    const x1 = cx+Math.cos(start)*R, y1=cy+Math.sin(start)*R;
    const x2 = cx+Math.cos(end)*R,   y2=cy+Math.sin(end)*R;
    const x3 = cx+Math.cos(end)*r,   y3=cy+Math.sin(end)*r;
    const x4 = cx+Math.cos(start)*r, y4=cy+Math.sin(start)*r;
    return { d, path: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${large} 0 ${x4} ${y4} Z` };
  });
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {arcs.map((a,i)=><path key={i} d={a.path} fill={a.d.c} opacity={0.9}/>)}
      <circle cx={cx} cy={cy} r={r-2} fill="var(--bg-card)"/>
      <text x={cx} y={cy-4} textAnchor="middle" fontSize="10" fill="var(--fg-dim)" fontFamily="Inter" fontWeight="700" letterSpacing="0.15em">EXECUTADO</text>
      <text x={cx} y={cy+14} textAnchor="middle" fontSize="18" fill="var(--fg-strong)" fontFamily="Inter" fontWeight="900" style={{fontVariantNumeric:"tabular-nums"}}>R$ 42M</text>
    </svg>
  );
}

function Emendas({ profile }) {
  const E = profile.emendas;
  if (!E.aplicavel) {
    return (
      <SectionShell id="sec-emendas" label="08 Emendas" title="Emendas Parlamentares" sub="execução e destino">
        <EmptyState icon={<BanknoteIcon size={28}/>} title="Seção não aplicável"
          text="Emendas parlamentares são um indicador exclusivo de parlamentares com mandato ativo."/>
      </SectionShell>
    );
  }
  const maxYear = Math.max(...E.anual.map(a=>a.v));
  const statusCls = { "Pago":"chip-green","Em execução":"chip-amber","Cancelado":"chip-red" };
  return (
    <SectionShell id="sec-emendas" label="08 Emendas" title="Emendas Parlamentares" sub="RP-6 · RP-9 · individuais"
      kicker={<span>Ciclos <span className="t-fg-strong tnum">2019–2025</span></span>}>
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Apresentado" value={E.apresentado}/>
        <KPI label="Aprovado" value={E.aprovado}/>
        <KPI label="Executado" value={E.executado} tone="ok"/>
        <div className="rounded-lg px-4 py-3.5 flex flex-col justify-between"
          style={{ background:"linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.02))", border:"1px solid rgba(34,197,94,0.35)" }}>
          <div className="text-[10px] font-mono tracking-[0.15em] uppercase" style={{color:"var(--ok)"}}>Taxa de execução</div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-[30px] font-black font-display tnum" style={{color:"var(--ok)"}}>{E.taxa}%</div>
            <div className="text-[10px] font-mono" style={{color:"var(--ok)"}}>▲ alta</div>
          </div>
        </div>
      </div>

      {/* charts row */}
      <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: "1fr 280px" }}>
        {/* anual bars */}
        <div className="rounded-xl p-5" style={{ background:"var(--bg-card-2)", border:"1px solid var(--rule)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-bold tracking-[0.15em] uppercase t-fg-strong">Execução anual</div>
            <div className="text-[10px] font-mono t-fg-dim">R$ milhões</div>
          </div>
          <div className="flex items-end gap-3 h-40">
            {E.anual.map(a => (
              <div key={a.ano} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5">
                <div className="text-[10px] font-mono font-bold tnum t-fg-muted">{a.v}</div>
                <div className="w-full rounded-t-sm" style={{ height:`${(a.v/maxYear)*80}%`, minHeight:4, background:"linear-gradient(180deg, #60a5fa, #3b82f6)" }}/>
                <div className="text-[10px] font-mono t-fg-dim">{a.ano}</div>
              </div>
            ))}
          </div>
        </div>
        {/* donut */}
        <div className="rounded-xl p-5" style={{ background:"var(--bg-card-2)", border:"1px solid var(--rule)" }}>
          <div className="text-[11px] font-bold tracking-[0.15em] uppercase t-fg-strong mb-3">Por área</div>
          <div className="flex flex-col items-center">
            <Donut data={E.areas} size={160}/>
            <div className="mt-3 w-full space-y-1.5">
              {E.areas.map(a => (
                <div key={a.k} className="flex items-center gap-2 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background:a.c }}/>
                  <span className="flex-1 t-fg-muted">{a.k}</span>
                  <span className="font-mono tnum t-fg-strong font-bold">{a.v}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* top 10 emendas */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-bold tracking-[0.15em] uppercase t-fg-strong">Top 10 emendas por valor</div>
          <div className="text-[10px] font-mono t-fg-dim">SIOP</div>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border:"1px solid var(--rule)" }}>
          {E.top.map((t, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4"
              style={{ background: i%2===0?"var(--bg-card-2)":"transparent", ...(i>0?{borderTop:"1px solid var(--rule)"}:{}) }}>
              <div className="text-[10px] font-mono t-fg-ghost w-6">{String(i+1).padStart(2,"0")}</div>
              <div className="flex-1 text-[13px] t-fg">{t.muni}</div>
              <div className="text-[11px] t-fg-muted w-28">{t.area}</div>
              <div className="text-[13px] font-mono font-bold tnum t-fg-strong w-32 text-right">{t.v}</div>
              <span className={`chip ${statusCls[t.st]} w-[100px] justify-center`}>{t.st}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg px-4 py-3 flex items-start gap-2"
        style={{ background:"var(--bg-card-2)", border:"1px dashed var(--rule-strong)" }}>
        <div className="text-[11px] t-fg-muted"><span className="font-bold t-fg">Contexto:</span> Taxa de execução alta indica articulação real com o Executivo para liberação orçamentária.</div>
      </div>
    </SectionShell>
  );
}

Object.assign(window, { Emendas });
