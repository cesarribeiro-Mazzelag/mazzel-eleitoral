/* Radar Político - grid de cards FIFA + filtros */

const { useState: useRState, useMemo: useRMemo } = React;

function FifaMiniCard({ c, onClick }) {
  const tierClass = c.tier === "dourado" || c.tier === "ouro" ? "" : c.tier === "prata" ? "tier-silver" : "tier-bronze";
  const goldNum = "#fcd34d";
  const numColor = c.tier === "prata" ? "#e5e7eb" : c.tier === "bronze" ? "#fdba74" : goldNum;
  return (
    <div className={`fifa-mini ${tierClass}`} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="text-center">
          <div className="font-display font-black leading-none tnum" style={{ fontSize: 34, color: numColor, textShadow: "0 2px 4px rgba(0,0,0,0.4)" }}>{c.overall}</div>
          <div className="text-[10px] font-bold tracking-widest mt-0.5" style={{ color: numColor, opacity: 0.85 }}>{c.cargo}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded"
               style={{ background: partyColor(c.partido), color: "#fff" }}>{c.partido}</div>
          <div className="text-[10px] font-bold t-fg tnum" style={{ color: numColor }}>{c.uf}</div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full h-[78px] rounded-md flex items-center justify-center"
             style={{ background: `radial-gradient(circle at 50% 40%, ${numColor}22, transparent 70%)` }}>
          <svg width="62" height="62" viewBox="0 0 24 24" fill="none" stroke={numColor} strokeWidth="1.2">
            <circle cx="12" cy="8" r="3.5"/>
            <path d="M5 20a7 7 0 0 1 14 0"/>
          </svg>
        </div>
      </div>

      <div className="text-center mb-1.5">
        <div className="text-[12px] font-bold t-fg-strong leading-tight truncate" style={{ color: c.tier === "prata" ? "#f1f5f9" : c.tier === "bronze" ? "#fed7aa" : "#fef3c7" }}>{c.nome}</div>
      </div>

      <div className="grid grid-cols-3 gap-x-1 gap-y-0.5 text-[9px] font-bold tracking-wider" style={{ color: numColor, opacity: 0.92 }}>
        <div className="tnum">{c.pac} <span style={{ opacity: 0.7 }}>PAC</span></div>
        <div className="tnum">{c.pres} <span style={{ opacity: 0.7 }}>ATV</span></div>
        <div className="tnum">{c.inf} <span style={{ opacity: 0.7 }}>INF</span></div>
        <div className="tnum">{c.leg} <span style={{ opacity: 0.7 }}>LEG</span></div>
        <div className="tnum">{c.bse} <span style={{ opacity: 0.7 }}>BSE</span></div>
        <div className="tnum">{c.mid} <span style={{ opacity: 0.7 }}>MID</span></div>
      </div>

      {c.traits && c.traits.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
          {c.traits.slice(0, 2).map(t => (
            <span key={t} className="text-[8.5px] font-bold tracking-wider uppercase px-1.5 py-[1px] rounded"
                  style={{ background: "rgba(0,0,0,0.35)", color: numColor, border: `1px solid ${numColor}33` }}>{TRAIT_LABEL[t]}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleRadar({ onNavigate }) {
  const [cargo, setCargo] = useRState("TODOS");
  const [uf, setUf] = useRState("TODAS");
  const [partido, setPartido] = useRState("TODOS");
  const [tier, setTier] = useRState("TODOS");
  const [sort, setSort] = useRState("overall");
  const [q, setQ] = useRState("");

  const partidos = useRMemo(() => ["TODOS", ...Array.from(new Set(RADAR_CANDIDATOS.map(c => c.partido)))], []);
  const cargos = ["TODOS","PRES","GOV","SEN","DEP"];
  const tiers = ["TODOS","dourado","ouro","prata","bronze"];

  const results = useRMemo(() => {
    let r = RADAR_CANDIDATOS.slice();
    if (cargo !== "TODOS") r = r.filter(c => c.cargo === cargo);
    if (uf !== "TODAS")   r = r.filter(c => c.uf === uf);
    if (partido !== "TODOS") r = r.filter(c => c.partido === partido);
    if (tier !== "TODOS") r = r.filter(c => c.tier === tier);
    if (q) r = r.filter(c => c.nome.toLowerCase().includes(q.toLowerCase()));
    if (sort === "overall") r.sort((a,b)=>b.overall-a.overall);
    else if (sort === "nome") r.sort((a,b)=>a.nome.localeCompare(b.nome));
    else if (sort === "uf") r.sort((a,b)=>a.uf.localeCompare(b.uf));
    return r;
  }, [cargo, uf, partido, tier, sort, q]);

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">

        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Radar Político</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">Ranking nacional · 51.384 políticos monitorados</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">Cards Mazzel FIFA-style · metodologia proprietária com 6 dimensões ponderadas.</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost"><Icon name="Download" size={13}/>Exportar CSV</button>
            <button className="btn-primary"><Icon name="Sparkles" size={13}/>Análise IA</button>
          </div>
        </div>

        {/* Filtros */}
        <div className="t-bg-card ring-soft rounded-xl p-4 mb-5">
          <div className="grid grid-cols-[260px_repeat(5,1fr)_auto] gap-2 items-center">
            <div className="flex items-center gap-2 h-8 px-2.5 rounded-md" style={{ background: "var(--rule)" }}>
              <Icon name="Search" size={12} className="t-fg-dim" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar nome…"
                     className="flex-1 bg-transparent outline-none text-[12px] t-fg placeholder:t-fg-dim" />
            </div>
            {[
              { v: cargo, s: setCargo, opts: cargos, label: "Cargo" },
              { v: uf, s: setUf, opts: ["TODAS", ...UF_LIST], label: "UF" },
              { v: partido, s: setPartido, opts: partidos, label: "Partido" },
              { v: tier, s: setTier, opts: tiers, label: "Tier" },
              { v: sort, s: setSort, opts: ["overall","nome","uf"], label: "Ordenar" },
            ].map((f, i) => (
              <div key={i}>
                <div className="text-[9.5px] t-fg-dim uppercase tracking-wider font-semibold mb-1">{f.label}</div>
                <select value={f.v} onChange={e => f.s(e.target.value)}
                        className="btn-ghost w-full" style={{ padding: "6px 9px", fontSize: 12 }}>
                  {f.opts.map(o => <option key={o} value={o}>{typeof o === "string" ? o : o}</option>)}
                </select>
              </div>
            ))}
            <div className="text-right pl-2 border-l" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[9.5px] t-fg-dim uppercase tracking-wider font-semibold">Resultados</div>
              <div className="text-[18px] font-bold t-fg-strong tnum">{results.length}</div>
            </div>
          </div>
        </div>

        {/* Grid de cards */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(186px, 1fr))" }}>
          {results.map(c => <FifaMiniCard key={c.id} c={c} onClick={() => onNavigate("dossie")} />)}
          {results.length === 0 && (
            <div className="col-span-full t-bg-card ring-soft rounded-xl p-12 text-center">
              <div className="text-[15px] font-semibold t-fg">Nenhum resultado.</div>
              <div className="text-[12px] t-fg-muted mt-1">Ajuste os filtros.</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

Object.assign(window, { ModuleRadar, FifaMiniCard });
