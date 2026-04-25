/* Mapa Eleitoral — interactive SVG with toolbar + sidebar contextual */

const { useState: useMState, useMemo: useMMemo } = React;

const MAP_LAYERS = [
  { id: "partido",   label: "Partido dominante" },
  { id: "score",     label: "Score regional" },
  { id: "eleitos",   label: "Eleitos UB" },
  { id: "emendas",   label: "Emendas R$" },
  { id: "alertas",   label: "Densidade alertas" },
];

const MAP_YEARS = ["2026 (proj.)","2024","2022","2020","2018"];

function ModuleMapa({ tenant, onNavigate }) {
  const [layer, setLayer] = useMState("partido");
  const [year, setYear] = useMState("2026 (proj.)");
  const [selectedUf, setSelectedUf] = useMState("SP");
  const [hoverUf, setHoverUf] = useMState(null);
  const [compareMode, setCompareMode] = useMState(false);
  const [compareUf, setCompareUf] = useMState("MG");

  const scoreData = useMMemo(() => {
    const d = {};
    UF_LIST.forEach((u, i) => { d[u] = 45 + ((u.charCodeAt(0) + u.charCodeAt(1) + i * 7) % 50); });
    return d;
  }, []);

  const ufDetail = (uf) => ({
    uf,
    partido: PARTY_STRENGTH[uf] || "—",
    score: scoreData[uf],
    eleitos: 10 + ((uf.charCodeAt(0) + uf.charCodeAt(1)) % 40),
    senadores: ((uf.charCodeAt(0) + uf.charCodeAt(1)) % 3) + 1,
    deputados: 5 + ((uf.charCodeAt(0)) % 20),
    prefeitos: 30 + ((uf.charCodeAt(0) + uf.charCodeAt(1) * 3) % 70),
    emendas: 40 + ((uf.charCodeAt(0) + uf.charCodeAt(1)) % 160),
    alertas: (uf.charCodeAt(1) % 5),
    trend: (uf.charCodeAt(0) % 2) ? "+2,3pp" : "-0,8pp",
    top3: [
      { nome: "Jaques Wagner", partido: "PT", overall: 87 },
      { nome: "Otto Alencar", partido: "PSD", overall: 79 },
      { nome: "Angelo Coronel", partido: "PSD", overall: 75 },
    ],
  });

  const det = ufDetail(selectedUf);
  const cmp = compareMode ? ufDetail(compareUf) : null;

  return (
    <div style={{ height: "calc(100vh - 48px)", position: "relative", overflow: "hidden", background: "var(--bg-page)" }}>

      {/* Map canvas */}
      <div className="absolute inset-0 bg-page-grad flex items-center justify-center p-8" style={{ paddingRight: 392 }}>
        <div className="w-full h-full flex items-center justify-center">
          <BrasilChoropleth
            mode={layer === "score" ? "score" : layer === "partido" ? "partido" : "score"}
            onHover={setHoverUf}
            onClick={(uf) => { if (compareMode) setCompareUf(uf); else setSelectedUf(uf); }}
            highlightUf={hoverUf || selectedUf}
            data={scoreData}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="map-toolbar">
        <div className="flex items-center gap-1 pr-2 border-r" style={{ borderColor: "var(--rule)" }}>
          <span className="text-[10px] t-fg-dim uppercase tracking-wider px-2 font-semibold">Camada</span>
          {MAP_LAYERS.map(l => (
            <button key={l.id} onClick={() => setLayer(l.id)}
                    className={`btn-ghost ${layer === l.id ? "active" : ""}`} style={{ padding: "5px 9px", fontSize: 11 }}>{l.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 pr-2 border-r" style={{ borderColor: "var(--rule)" }}>
          <span className="text-[10px] t-fg-dim uppercase tracking-wider px-2 font-semibold">Ano</span>
          <select value={year} onChange={e => setYear(e.target.value)}
                  className="btn-ghost" style={{ padding: "5px 9px", fontSize: 11 }}>
            {MAP_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={() => setCompareMode(!compareMode)} className={`btn-ghost ${compareMode ? "active" : ""}`} style={{ padding: "5px 10px", fontSize: 11 }}>
          <Icon name="Filter" size={11}/> {compareMode ? "Comparando 2 UFs" : "Comparar UFs"}
        </button>
        <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }}><Icon name="Download" size={11}/> Exportar</button>
      </div>

      {/* Legend */}
      <div className="map-legend">
        <div className="text-[9.5px] t-fg-dim uppercase tracking-wider font-semibold mb-1.5">Legenda · {MAP_LAYERS.find(l => l.id === layer).label}</div>
        <div className="flex items-center gap-3 flex-wrap" style={{ maxWidth: 340 }}>
          {layer === "partido" ? ["UNIÃO BRASIL","PL","PT","PSD","MDB","PSB","REPUBLICANOS","PSDB"].map(p => (
            <div key={p} className="flex items-center gap-1.5 text-[10.5px] t-fg-muted">
              <span className="party-dot" style={{ background: partyColor(p) }} />{p}
            </div>
          )) : [["#f87171","<40"],["#fb923c","40-55"],["#fbbf24","55-70"],["#60a5fa","70-85"],["#34d399","≥85"]].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1.5 text-[10.5px] t-fg-muted">
              <span className="party-dot" style={{ background: c }} />{l}
            </div>
          ))}
        </div>
      </div>

      {/* Context panel */}
      <div className="map-context-panel">
        <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Icon name="MapPin" size={13} className="t-tenant" />
            <span className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Unidade federativa</span>
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-[48px] font-display font-bold t-fg-strong leading-none tnum">{selectedUf}</div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold t-fg">{ufName(selectedUf)}</div>
              <div className="text-[11px] t-fg-muted">{year}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="chip chip-blue">
              <span className="party-dot" style={{ background: partyColor(det.partido) }} />
              {det.partido} dominante
            </span>
            <span className={`chip ${det.trend.startsWith("+") ? "chip-green" : "chip-red"}`}>
              <Icon name={det.trend.startsWith("+") ? "ArrowUp" : "ArrowDown"} size={9}/>
              {det.trend} YoY
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* big metric */}
          <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
            <div className="text-[10.5px] t-fg-dim uppercase tracking-wider font-semibold mb-1.5">Score regional</div>
            <div className="flex items-baseline gap-2">
              <div className="text-[44px] font-display font-bold tnum t-fg-strong leading-none">{det.score}</div>
              <div className="text-[14px] t-fg-dim tnum">/ 100</div>
              {cmp && <div className="ml-auto text-right">
                <div className="text-[10.5px] t-fg-dim uppercase tracking-wider">vs {compareUf}</div>
                <div className="text-[22px] font-display font-bold tnum t-fg-muted">{cmp.score}</div>
              </div>}
            </div>
            <div className="mt-3 h-1.5 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
              <div style={{ width: `${det.score}%`, height: "100%", background: "linear-gradient(90deg, var(--tenant-primary), #60a5fa)" }} />
            </div>
          </div>

          {/* breakdown */}
          <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
            <div className="text-[10.5px] t-fg-dim uppercase tracking-wider font-semibold mb-3">Força eleitoral UB</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: "Senadores", v: det.senadores },
                { l: "Dep. fed.",  v: det.deputados },
                { l: "Prefeitos",  v: det.prefeitos },
              ].map(m => (
                <div key={m.l} className="ring-soft rounded-md p-3" style={{ background: "var(--bg-card-2)" }}>
                  <div className="text-[10px] t-fg-dim uppercase tracking-wider">{m.l}</div>
                  <div className="text-[22px] font-bold tnum t-fg-strong mt-0.5 leading-none">{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10.5px] t-fg-dim uppercase tracking-wider font-semibold">Emendas 2024</div>
              <div className="tnum text-[13px] font-bold t-fg-strong">R$ {det.emendas}M</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-[10.5px] t-fg-dim uppercase tracking-wider font-semibold">Alertas abertos</div>
              <div className="tnum text-[13px] font-bold t-fg-strong flex items-center gap-1.5">
                <span className={`chip-dot`} style={{ background: det.alertas > 2 ? "var(--danger)" : "var(--warn)", width: 8, height: 8 }}/>
                {det.alertas}
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="text-[10.5px] t-fg-dim uppercase tracking-wider font-semibold mb-3">Top 3 · políticos da UF</div>
            <div className="space-y-2">
              {det.top3.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md card-hover cursor-pointer" style={{ background: "var(--bg-card-2)" }} onClick={() => onNavigate("dossie")}>
                  <div className="text-[11px] tnum font-bold t-fg-dim w-4">#{i+1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold t-fg-strong truncate">{c.nome}</div>
                    <div className="flex items-center gap-1.5 text-[10.5px] t-fg-dim">
                      <span className="party-dot" style={{ background: partyColor(c.partido) }} />
                      {c.partido}
                    </div>
                  </div>
                  <div className="tnum text-[15px] font-bold text-amber-300">{c.overall}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex gap-2" style={{ borderColor: "var(--rule)" }}>
          <button className="btn-primary flex-1 justify-center" onClick={() => onNavigate("dossie")}>Abrir dossiê da UF</button>
          <button className="btn-ghost">Exportar</button>
        </div>
      </div>

    </div>
  );
}

function ufName(uf) {
  const map = { AC:"Acre", AL:"Alagoas", AM:"Amazonas", AP:"Amapá", BA:"Bahia", CE:"Ceará", DF:"Distrito Federal", ES:"Espírito Santo", GO:"Goiás", MA:"Maranhão", MG:"Minas Gerais", MS:"Mato Grosso do Sul", MT:"Mato Grosso", PA:"Pará", PB:"Paraíba", PE:"Pernambuco", PI:"Piauí", PR:"Paraná", RJ:"Rio de Janeiro", RN:"Rio Grande do Norte", RO:"Rondônia", RR:"Roraima", RS:"Rio Grande do Sul", SC:"Santa Catarina", SE:"Sergipe", SP:"São Paulo", TO:"Tocantins" };
  return map[uf] || uf;
}

Object.assign(window, { ModuleMapa });
