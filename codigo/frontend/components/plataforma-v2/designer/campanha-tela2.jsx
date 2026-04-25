/* =========================================================================
 * Tela 2 · Mapa de Cercas — canvas dedicado
 * Mapa esquemático da Bahia com cercas, sidebar contextual, legenda
 * ========================================================================= */

function Tela2Mapa({ demoMode, corCerca }) {
  const [selected, setSelected] = React.useState(null);
  const [hovered, setHovered] = React.useState(null);
  const [layer, setLayer] = React.useState("responsavel"); // responsavel | score | engajamento | vaga

  // cores por estado
  const colorFor = (cerca) => {
    if (layer === "score" || corCerca === "score") {
      const s = cerca.score;
      if (s >= 80) return "#059669";
      if (s >= 65) return "#fbbf24";
      if (s >= 45) return "#f97316";
      return "#dc2626";
    }
    if (layer === "engajamento") {
      const e = cerca.engajamento;
      if (e >= 75) return "#1d4ed8";
      if (e >= 55) return "#60a5fa";
      if (e >= 35) return "#fbbf24";
      return "#dc2626";
    }
    if (layer === "vaga") {
      return cerca.responsavelId ? "rgba(82,82,91,0.4)" : "#dc2626";
    }
    // responsavel: por tier do responsável (ou vermelho se vago)
    if (!cerca.responsavelId) return "#dc2626";
    const lid = LIDERANCAS.find(l => l.id === cerca.responsavelId);
    if (!lid) return "#71717a";
    return lid.tier === "ouro" ? "#1d4ed8" : lid.tier === "prata" ? "#9ca3af" : "#c2410c";
  };

  const allMuns = CERCAS[0].filhas || [];
  const allBairros = allMuns.flatMap(m => m.filhas || []);

  return (
    <div className="h-full w-full flex" style={{ background: "var(--bg-page-2)" }}>
      {/* Left toolbar */}
      <aside className="w-[260px] flex-shrink-0 border-r overflow-y-auto thin-scroll" style={{ borderColor: "var(--rule)", background: "var(--bg-card)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="card-sub mb-2">Camada ativa</div>
          <div className="grid grid-cols-2 gap-1">
            {[
              { k: "responsavel", l: "Responsável" },
              { k: "score",       l: "Score" },
              { k: "engajamento", l: "Engajamento" },
              { k: "vaga",        l: "Vagas" },
            ].map(o => (
              <button key={o.k} onClick={() => setLayer(o.k)} className={`btn-ghost ${layer === o.k ? "active" : ""}`} style={{ padding: "6px 8px", fontSize: 10.5, justifyContent: "center" }}>{o.l}</button>
            ))}
          </div>
        </div>

        <div className="p-4 border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="card-sub mb-2">Legenda</div>
          <MapLegend layer={layer}/>
        </div>

        <div className="p-4">
          <div className="card-sub mb-2">Regionais · Recôncavo</div>
          <div className="space-y-1">
            {allMuns.map(m => (
              <button key={m.id} onClick={() => setSelected(m)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left"
                      style={{ background: selected?.id === m.id ? "var(--rule-strong)" : "transparent", border: "1px solid transparent" }}
                      onMouseEnter={e => { if (selected?.id !== m.id) e.currentTarget.style.background = "var(--chart-hover)"; }}
                      onMouseLeave={e => { if (selected?.id !== m.id) e.currentTarget.style.background = "transparent"; }}>
                <StatusDot status={m.status}/>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold t-fg-strong">{m.nome}</div>
                  <div className="text-[10px] t-fg-dim">{m.responsavel}</div>
                </div>
                <span className="text-[10px] tnum font-bold" style={{ color: m.score >= 70 ? "var(--ok)" : m.score >= 50 ? "var(--warn)" : "var(--danger)" }}>{m.score}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Map canvas */}
      <div className="flex-1 relative min-w-0" onClick={() => setSelected(null)}>
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
          <div className="px-3 py-2 rounded-lg pointer-events-auto" style={{ background: "var(--bg-card)", border: "1px solid var(--rule-strong)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            <div className="text-[9.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Região</div>
            <div className="text-[13px] font-bold t-fg-strong">Recôncavo Baiano</div>
          </div>
          <div className="flex gap-2 pointer-events-auto">
            <button className="btn-ghost"><CIcon name="Filter" size={11}/>Filtros</button>
            <button className="btn-ghost"><CIcon name="Layers" size={11}/>Camadas</button>
            <button className="btn-ghost"><CIcon name="Plus" size={11}/>Zoom</button>
            <button className="btn-ghost"><CIcon name="Minus" size={11}/></button>
            <button className="btn-primary" style={{ padding: "6px 10px", fontSize: 11 }}>
              <CIcon name="Plus" size={11}/>
              Nova cerca
            </button>
          </div>
        </div>

        <svg viewBox="0 0 800 600" style={{ width: "100%", height: "100%", cursor: "grab" }} onClick={e => e.stopPropagation()}>
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--rule)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="800" height="600" fill="url(#grid)"/>

          {/* Regional outline (esquemático) */}
          <path d="M 120 120 Q 180 80, 280 100 T 520 120 Q 620 140, 680 220 T 700 400 Q 680 480, 580 500 T 340 490 Q 200 480, 140 400 T 120 240 Z"
                fill="rgba(0, 42, 123, 0.05)" stroke="var(--tenant-primary)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6"/>

          {/* Municípios (grandes) */}
          {[
            { id: "mun-feira",       cx: 300, cy: 240, r: 58,  nome: "Feira de Santana" },
            { id: "mun-ssalvador",   cx: 520, cy: 400, r: 52,  nome: "Salvador (subúrbio)" },
            { id: "mun-sfelix",      cx: 210, cy: 370, r: 28,  nome: "São Félix" },
            { id: "mun-cachoeira",   cx: 260, cy: 410, r: 36,  nome: "Cachoeira" },
            { id: "mun-maragogipe",  cx: 380, cy: 460, r: 40,  nome: "Maragogipe" },
          ].map(m => {
            const mun = allMuns.find(x => x.id === m.id);
            const c = colorFor(mun);
            const active = selected?.id === m.id;
            return (
              <g key={m.id} style={{ cursor: "pointer" }}
                 onClick={e => { e.stopPropagation(); setSelected(mun); }}
                 onMouseEnter={() => setHovered(mun)} onMouseLeave={() => setHovered(null)}>
                <circle cx={m.cx} cy={m.cy} r={m.r} fill={c} fillOpacity={active ? 0.30 : 0.15} stroke={c} strokeWidth={active ? 2.2 : 1.4}/>
                {/* Bairros dentro */}
                {(mun.filhas || []).map((b, i) => {
                  const bc = colorFor(b);
                  const ang = (i / (mun.filhas.length)) * Math.PI * 2;
                  const x = m.cx + Math.cos(ang) * (m.r * 0.55);
                  const y = m.cy + Math.sin(ang) * (m.r * 0.55);
                  return (
                    <g key={b.id}>
                      <circle cx={x} cy={y} r={7} fill={bc} fillOpacity={0.85} stroke="#fff" strokeWidth={1.2}/>
                      {!b.responsavelId && (
                        <circle cx={x} cy={y} r={10} fill="none" stroke="#dc2626" strokeWidth={1} strokeDasharray="2 2">
                          {demoMode && <animate attributeName="r" values="10;13;10" dur="2s" repeatCount="indefinite"/>}
                        </circle>
                      )}
                    </g>
                  );
                })}
                <text x={m.cx} y={m.cy + m.r + 14} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--fg-strong)">{m.nome}</text>
                <text x={m.cx} y={m.cy + m.r + 26} textAnchor="middle" fontSize="9.5" fill="var(--fg-dim)">score {mun.score} · {Math.round(mun.cadastrados/1000)}k cadastros</text>
              </g>
            );
          })}

          {/* Crosshair label */}
          <text x="40" y="40" fontSize="10.5" fontWeight="600" fill="var(--fg-dim)" letterSpacing="0.1em">MAPA ESQUEMÁTICO · BA · recôncavo</text>
          <text x="40" y="560" fontSize="9" fill="var(--fg-faint)" fontFamily="JetBrains Mono">zoom 1:80k  ·  {allBairros.length} micro-cercas  ·  {allMuns.filter(m => !m.responsavelId).length + allBairros.filter(b => !b.responsavelId).length} sem responsável</text>
        </svg>

        {/* hover tooltip */}
        {hovered && !selected && (
          <div className="absolute top-24 right-6 p-3 rounded-lg pointer-events-none" style={{ background: "var(--bg-card)", border: "1px solid var(--rule-strong)", boxShadow: "0 8px 20px rgba(0,0,0,0.12)", width: 220 }}>
            <div className="text-[10px] t-fg-dim uppercase tracking-wider font-semibold">{hovered.nivel}</div>
            <div className="text-[14px] font-bold t-fg-strong">{hovered.nome}</div>
            <div className="text-[11px] t-fg-muted mb-2">{hovered.responsavel}</div>
            <div className="grid grid-cols-2 gap-1 text-[10.5px]">
              <div><span className="t-fg-dim">Score</span> <b className="tnum">{hovered.score}</b></div>
              <div><span className="t-fg-dim">Eng.</span> <b className="tnum">{hovered.engajamento}%</b></div>
              <div><span className="t-fg-dim">Meta</span> <b className="tnum">{hovered.meta.toLocaleString("pt-BR")}</b></div>
              <div><span className="t-fg-dim">Feito</span> <b className="tnum">{hovered.cadastrados.toLocaleString("pt-BR")}</b></div>
            </div>
          </div>
        )}
      </div>

      {/* Right drawer */}
      {selected && (
        <aside className="w-[360px] flex-shrink-0 border-l overflow-y-auto thin-scroll" style={{ borderColor: "var(--rule)", background: "var(--bg-card)" }}>
          <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="card-sub mb-1">{selected.nivel}</div>
                <div className="text-[20px] font-black font-display t-fg-strong">{selected.nome}</div>
              </div>
              <button className="btn-ghost" onClick={() => setSelected(null)} style={{ padding: "5px 7px" }}><CIcon name="X" size={11}/></button>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot status={selected.status}/>
              <span className="text-[11px] t-fg-muted capitalize">{selected.status}</span>
              <span className="text-[11px] t-fg-faint">·</span>
              <span className="text-[11px] t-fg-muted">Resp. {selected.responsavel}</span>
            </div>
          </div>

          <div className="p-5 grid grid-cols-2 gap-3 border-b" style={{ borderColor: "var(--rule)" }}>
            <MiniStat label="Score overall"   value={selected.score}                color={selected.score >= 70 ? "var(--ok)" : selected.score >= 50 ? "var(--warn)" : "var(--danger)"}/>
            <MiniStat label="Engajamento"     value={`${selected.engajamento}%`}/>
            <MiniStat label="Cadastros"       value={selected.cadastrados.toLocaleString("pt-BR")}/>
            <MiniStat label="Meta"            value={selected.meta.toLocaleString("pt-BR")}/>
          </div>

          <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
            <div className="card-sub mb-2">Progresso de cadastro</div>
            <ProgressBar value={(selected.cadastrados / selected.meta) * 100}
                         color={(selected.cadastrados / selected.meta) > 0.7 ? "var(--ok)" : (selected.cadastrados / selected.meta) > 0.4 ? "var(--warn)" : "var(--danger)"}
                         height={8}/>
            <div className="flex justify-between mt-1 text-[10.5px] t-fg-dim">
              <span className="tnum">{Math.round((selected.cadastrados / selected.meta) * 100)}%</span>
              <span>{(selected.meta - selected.cadastrados).toLocaleString("pt-BR")} faltando</span>
            </div>
          </div>

          {selected.filhas && selected.filhas.length > 0 && (
            <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="card-sub mb-2">Bairros · {selected.filhas.length}</div>
              <div className="space-y-1.5">
                {selected.filhas.map(b => (
                  <div key={b.id} className="flex items-center gap-2 py-1.5">
                    <StatusDot status={b.status}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11.5px] font-semibold t-fg-strong">{b.nome}</div>
                      <div className="text-[10px] t-fg-dim">{b.responsavel}</div>
                    </div>
                    <div className="text-[10px] font-bold tnum t-fg-strong">{b.score}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-5 space-y-2">
            <button className="btn-primary w-full" style={{ justifyContent: "center" }}>
              <CIcon name="UserPlus" size={12}/>
              Adicionar liderança
            </button>
            <button className="btn-ghost w-full" style={{ justifyContent: "center" }}>
              <CIcon name="MessagesSquare" size={12}/>
              Abrir canal da cerca
            </button>
            <button className="btn-ghost w-full" style={{ justifyContent: "center" }}>
              <CIcon name="FileText" size={12}/>
              Relatório desta cerca
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

function MapLegend({ layer }) {
  const items = {
    responsavel: [
      { color: "#1d4ed8", label: "Tier ouro" },
      { color: "#9ca3af", label: "Tier prata" },
      { color: "#c2410c", label: "Tier bronze" },
      { color: "#dc2626", label: "Sem responsável" },
    ],
    score: [
      { color: "#059669", label: "80+" },
      { color: "#fbbf24", label: "65–79" },
      { color: "#f97316", label: "45–64" },
      { color: "#dc2626", label: "<45" },
    ],
    engajamento: [
      { color: "#1d4ed8", label: "75+%" },
      { color: "#60a5fa", label: "55–75%" },
      { color: "#fbbf24", label: "35–54%" },
      { color: "#dc2626", label: "<35%" },
    ],
    vaga: [
      { color: "#dc2626", label: "Cerca sem responsável" },
      { color: "rgba(82,82,91,0.4)", label: "Com responsável" },
    ],
  };
  return (
    <div className="space-y-1">
      {items[layer].map((it, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span style={{ width: 12, height: 12, borderRadius: 3, background: it.color, flexShrink: 0 }}/>
          <span className="t-fg-muted">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div>
      <div className="text-[9.5px] t-fg-dim uppercase tracking-wider font-semibold mb-0.5">{label}</div>
      <div className="text-[18px] font-black tnum font-display" style={{ color: color || "var(--fg-strong)" }}>{value}</div>
    </div>
  );
}

Object.assign(window, { Tela2Mapa });
