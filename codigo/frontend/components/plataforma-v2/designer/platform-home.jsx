/* Home Dashboard module */

const { useState: useHState, useMemo: useHMemo } = React;

/* ============ SVG Brazil choropleth (simplified states) ============ */
/* Simplified polygon path per state - illustrative positions */
const BRASIL_STATES = [
  { uf: "AC", cx: 96,  cy: 240, path: "M60,220 L130,215 L135,260 L80,265 Z" },
  { uf: "AM", cx: 230, cy: 200, path: "M140,150 L330,150 L335,250 L140,255 Z" },
  { uf: "RR", cx: 280, cy: 110, path: "M230,80 L320,85 L325,145 L235,145 Z" },
  { uf: "AP", cx: 390, cy: 115, path: "M355,85 L425,90 L430,145 L360,145 Z" },
  { uf: "PA", cx: 400, cy: 210, path: "M340,150 L465,150 L465,265 L345,260 Z" },
  { uf: "RO", cx: 165, cy: 290, path: "M140,265 L230,265 L230,320 L140,320 Z" },
  { uf: "MT", cx: 305, cy: 305, path: "M235,265 L390,265 L395,355 L240,355 Z" },
  { uf: "MS", cx: 330, cy: 390, path: "M275,360 L395,360 L400,445 L280,445 Z" },
  { uf: "TO", cx: 430, cy: 290, path: "M400,265 L470,265 L475,340 L405,340 Z" },
  { uf: "MA", cx: 490, cy: 205, path: "M470,150 L545,155 L550,255 L475,260 Z" },
  { uf: "PI", cx: 515, cy: 250, path: "M490,200 L555,200 L560,295 L495,295 Z" },
  { uf: "CE", cx: 560, cy: 195, path: "M540,155 L615,160 L620,225 L545,225 Z" },
  { uf: "RN", cx: 620, cy: 205, path: "M600,170 L660,175 L665,220 L605,220 Z" },
  { uf: "PB", cx: 635, cy: 235, path: "M595,220 L670,225 L670,255 L600,255 Z" },
  { uf: "PE", cx: 605, cy: 260, path: "M555,250 L670,255 L670,285 L560,285 Z" },
  { uf: "AL", cx: 635, cy: 290, path: "M600,285 L665,288 L665,310 L605,310 Z" },
  { uf: "SE", cx: 615, cy: 315, path: "M585,308 L645,310 L645,335 L590,335 Z" },
  { uf: "BA", cx: 525, cy: 310, path: "M460,265 L590,270 L595,365 L465,365 Z" },
  { uf: "GO", cx: 410, cy: 360, path: "M385,340 L460,340 L465,410 L390,410 Z" },
  { uf: "DF", cx: 450, cy: 350, path: "M440,340 L470,340 L470,360 L440,360 Z" },
  { uf: "MG", cx: 475, cy: 400, path: "M395,365 L575,370 L580,445 L400,445 Z" },
  { uf: "ES", cx: 555, cy: 420, path: "M535,395 L590,395 L590,445 L540,445 Z" },
  { uf: "RJ", cx: 510, cy: 455, path: "M470,440 L560,440 L560,475 L475,475 Z" },
  { uf: "SP", cx: 425, cy: 450, path: "M330,430 L470,430 L475,480 L335,480 Z" },
  { uf: "PR", cx: 380, cy: 490, path: "M310,475 L445,475 L445,510 L315,510 Z" },
  { uf: "SC", cx: 375, cy: 525, path: "M315,510 L430,510 L430,545 L320,545 Z" },
  { uf: "RS", cx: 340, cy: 570, path: "M265,545 L410,545 L415,610 L270,610 Z" },
];

function BrasilChoropleth({ mode, onHover, onClick, highlightUf, data }) {
  const colorFor = (uf) => {
    if (mode === "partido") {
      const p = PARTY_STRENGTH[uf];
      return partyColor(p);
    }
    const score = data?.[uf] ?? 50;
    if (score >= 85) return "#34d399";
    if (score >= 70) return "#60a5fa";
    if (score >= 55) return "#fbbf24";
    if (score >= 40) return "#fb923c";
    return "#f87171";
  };
  return (
    <svg viewBox="50 70 620 560" className="w-full h-full" style={{ maxHeight: 420 }}>
      {BRASIL_STATES.map(s => {
        const isHi = highlightUf === s.uf;
        return (
          <g key={s.uf} onMouseEnter={() => onHover?.(s.uf)} onMouseLeave={() => onHover?.(null)} onClick={() => onClick?.(s.uf)} style={{ cursor: "pointer" }}>
            <path d={s.path}
                  fill={colorFor(s.uf)}
                  fillOpacity={isHi ? 0.95 : 0.72}
                  stroke={isHi ? "#fff" : "rgba(0,0,0,0.25)"}
                  strokeWidth={isHi ? 2 : 0.6}
                  className="region-polygon" />
            <text x={s.cx} y={s.cy + 3} textAnchor="middle"
                  className="state-label"
                  style={{ fontSize: 11, fill: "#0a0a0b" }}
                  pointerEvents="none">{s.uf}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ============ Home module ============ */
function ModuleHome({ tenant, role, onNavigate }) {
  const kpis = HOME_KPIS[role];
  const [mapMode, setMapMode] = useHState("partido");
  const [hoverUf, setHoverUf] = useHState(null);
  const scoreData = useHMemo(() => {
    const d = {};
    UF_LIST.forEach((u, i) => { d[u] = 45 + ((u.charCodeAt(0) + u.charCodeAt(1) + i * 7) % 50); });
    return d;
  }, []);

  const hoveredDetail = hoverUf ? {
    uf: hoverUf,
    partido: PARTY_STRENGTH[hoverUf] || "—",
    score: scoreData[hoverUf],
    eleitos: 10 + ((hoverUf.charCodeAt(0) + hoverUf.charCodeAt(1)) % 40),
  } : null;

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">

        {/* Saudação */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Dashboard · {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</div>
            <h1 className="text-[34px] font-display font-bold t-fg-strong mt-1 leading-none">
              {role === "candidato" ? "Bom dia, Senador." : role === "presidente" ? "Bom dia, Presidente." : "Bom dia, diretoria."}
            </h1>
            <div className="text-[13px] t-fg-muted mt-1.5 max-w-xl">
              {role === "candidato"
                ? "Resumo do seu mandato, base e emendas em execução."
                : "Visão executiva agregada da plataforma Mazzel · dados atualizados há 4 minutos."}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost"><Icon name="Download" size={13}/>Exportar visão</button>
            <button className="btn-primary"><Icon name="Sparkles" size={13}/>Resumo IA</button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {kpis.map((k, i) => (
            <div key={i} className="kpi-card ring-soft">
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.k}</div>
              <div className="flex items-end gap-2 mt-2">
                <div className="text-[38px] font-display font-bold tnum leading-none"
                     style={{ backgroundImage: "linear-gradient(180deg, var(--overall-from), var(--overall-to))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                  {k.v}
                </div>
              </div>
              <div className="text-[11px] t-fg-dim mt-2">{k.hint}</div>
              <div className="kpi-trend">
                <span className={`chip ${k.ok ? "chip-green" : "chip-red"}`} style={{ height: 20 }}>
                  <Icon name={k.trend.startsWith("+") ? "ArrowUp" : (k.trend.startsWith("-") ? "ArrowDown" : "Check")} size={10} />
                  {k.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Map + Alerts row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Map */}
          <div className="col-span-2 t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div>
                <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Mapa do Brasil</div>
                <div className="text-[15px] font-bold t-fg-strong leading-tight">Força política por UF</div>
              </div>
              <div className="flex items-center gap-1 p-0.5 rounded-md" style={{ background: "var(--rule)" }}>
                {[{k:"partido",l:"Partido"},{k:"score",l:"Score regional"}].map(o => (
                  <button key={o.k} onClick={() => setMapMode(o.k)}
                          className={`btn-ghost ${mapMode === o.k ? "active" : ""}`} style={{ padding: "5px 10px" }}>{o.l}</button>
                ))}
                <button className="btn-ghost" style={{ padding: "5px 10px" }} onClick={() => onNavigate("mapa")}>Abrir mapa completo →</button>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_220px]">
              <div className="p-4 pt-2">
                <BrasilChoropleth mode={mapMode} onHover={setHoverUf} onClick={() => onNavigate("mapa")} highlightUf={hoverUf} data={scoreData} />
              </div>
              <div className="border-l p-4" style={{ borderColor: "var(--rule)" }}>
                {hoveredDetail ? (
                  <>
                    <div className="text-[10px] t-fg-dim uppercase tracking-wider">UF</div>
                    <div className="text-[28px] font-display font-bold t-fg-strong">{hoveredDetail.uf}</div>
                    <div className="text-[11.5px] t-fg-muted mt-0.5 mb-4">Clique para abrir Mapa Eleitoral</div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] t-fg-dim uppercase tracking-wider mb-1">Partido dominante</div>
                        <div className="flex items-center gap-2">
                          <span className="party-dot" style={{ background: partyColor(hoveredDetail.partido) }} />
                          <span className="text-[13px] font-semibold t-fg-strong">{hoveredDetail.partido}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] t-fg-dim uppercase tracking-wider mb-1">Score regional</div>
                        <div className="text-[22px] font-bold tnum t-fg-strong">{hoveredDetail.score}<span className="text-[12px] t-fg-dim"> / 100</span></div>
                      </div>
                      <div>
                        <div className="text-[10px] t-fg-dim uppercase tracking-wider mb-1">Eleitos UB</div>
                        <div className="text-[22px] font-bold tnum t-fg-strong">{hoveredDetail.eleitos}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="text-[11px] t-fg-dim uppercase tracking-wider">Passe o mouse sobre</div>
                    <div className="text-[14px] font-semibold t-fg mt-1">uma unidade federativa</div>
                    <div className="text-[11px] t-fg-dim mt-2">para ver detalhes</div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-2.5 border-t" style={{ borderColor: "var(--rule)" }}>
              {mapMode === "partido"
                ? ["UNIÃO BRASIL","PL","PT","PSD","MDB","PSB"].map(p => (
                    <div key={p} className="flex items-center gap-1.5 text-[10.5px] t-fg-muted">
                      <span className="party-dot" style={{ background: partyColor(p) }} />{p}
                    </div>
                  ))
                : [["#f87171","<40"],["#fb923c","40-55"],["#fbbf24","55-70"],["#60a5fa","70-85"],["#34d399","≥85"]].map(([c,l]) => (
                    <div key={l} className="flex items-center gap-1.5 text-[10.5px] t-fg-muted">
                      <span className="party-dot" style={{ background: c }} />{l}
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Alerts timeline */}
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div>
                <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Alertas recentes</div>
                <div className="text-[15px] font-bold t-fg-strong leading-tight">Últimas 24h</div>
              </div>
              <button className="btn-ghost" onClick={() => onNavigate("alertas")} style={{ padding: "5px 9px" }}>Ver todos</button>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 520 }}>
              {HOME_ALERTS.map(a => (
                <div key={a.id} className={`alert-row alert-sev-${a.sev}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`chip ${a.sev === "crit" ? "chip-red" : a.sev === "alto" ? "chip-red" : a.sev === "med" ? "chip-amber" : "chip-muted"}`} style={{ height: 16, fontSize: 9 }}>{a.sev === "crit" ? "Crítico" : a.sev === "alto" ? "Alto" : a.sev === "med" ? "Médio" : "Baixo"}</span>
                      <span className="text-[10px] t-fg-dim uppercase tracking-wider">{a.tipo}</span>
                      <span className="text-[10px] t-fg-dim ml-auto">{a.when}</span>
                    </div>
                    <div className="text-[12.5px] font-semibold t-fg-strong truncate">{a.who} · {a.uf}</div>
                    <div className="text-[11.5px] t-fg-muted truncate">{a.what}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Three feature cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Top 10 Overall */}
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--rule)" }}>
              <div>
                <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Ranking</div>
                <div className="text-[15px] font-bold t-fg-strong leading-tight">Top 10 · Overall Mazzel</div>
              </div>
              <button className="btn-ghost" style={{ padding: "5px 9px" }} onClick={() => onNavigate("radar")}>Ver radar →</button>
            </div>
            <div className="row-striped">
              {HOME_TOP_CANDIDATOS.map((c, i) => (
                <div key={i} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 px-5 py-2 cursor-pointer card-hover" onClick={() => onNavigate("dossie")}>
                  <div className="text-[12px] font-bold tnum t-fg-dim">{String(i+1).padStart(2,"0")}</div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold t-fg-strong truncate">{c.nome}</div>
                    <div className="flex items-center gap-1.5 text-[10.5px] t-fg-dim">
                      <span className="party-dot" style={{ background: partyColor(c.partido) }} />
                      {c.partido} · {c.uf} · {c.cargo}
                    </div>
                  </div>
                  <div className={`tnum font-bold text-[16px] ${c.tier === "dourado" ? "text-amber-300" : "t-fg-strong"}`}>{c.overall}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Emendas por UF */}
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Execução orçamentária</div>
              <div className="text-[15px] font-bold t-fg-strong leading-tight">Emendas liberadas · 2024 (top UF)</div>
            </div>
            <div className="p-5 space-y-2.5">
              {HOME_EMENDAS_UF.map((e, i) => {
                const pct = 100 - i * 8;
                return (
                  <div key={e.uf} className="flex items-center gap-3">
                    <div className="w-7 text-[11px] font-bold tnum t-fg">{e.uf}</div>
                    <div className="flex-1 h-2.5 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
                      <div className="h-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--tenant-primary), rgba(var(--tenant-primary-rgb), 0.4))" }} />
                    </div>
                    <div className="tnum font-bold text-[12.5px] t-fg-strong w-[68px] text-right">{e.v}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Movimentações do dia */}
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Atividade operacional</div>
              <div className="text-[15px] font-bold t-fg-strong leading-tight">Movimentações do dia</div>
            </div>
            <div>
              {HOME_MOV_DIA.map((m, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-2.5 border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
                  <div className="w-7 h-7 rounded-md t-bg-tenant-soft flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name={m.icon} size={13} className="t-tenant" stroke={2.2}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-[12px] font-semibold t-fg-strong truncate">{m.evento}</div>
                      <div className="text-[10px] t-fg-dim ml-auto tnum">{m.hora}</div>
                    </div>
                    <div className="text-[11px] t-fg-muted truncate">{m.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit feed */}
        <div className="t-bg-card ring-soft rounded-xl overflow-hidden mb-8">
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--rule)" }}>
            <div>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Auditoria</div>
              <div className="text-[15px] font-bold t-fg-strong leading-tight">Atividade recente na plataforma</div>
            </div>
            <div className="text-[11px] t-fg-dim">Retenção 90 dias · LGPD-compliant</div>
          </div>
          <div>
            {HOME_AUDIT.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5 border-b last:border-0 text-[12px]" style={{ borderColor: "var(--rule)" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--tenant-primary)" }} />
                <div className="font-semibold t-fg-strong">{a.who}</div>
                <div className="t-fg-muted flex-1 truncate">{a.what}</div>
                <div className="t-fg-dim text-[11px] tnum">{a.when}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

Object.assign(window, { ModuleHome, BrasilChoropleth });
