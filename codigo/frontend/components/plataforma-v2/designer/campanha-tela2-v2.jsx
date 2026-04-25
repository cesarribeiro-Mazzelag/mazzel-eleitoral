/* =========================================================================
 * Tela 2 · Mapa Operacional v2 — modelo iFood cascata
 *
 * Lógica: cada nível hierárquico desenha (raio + bairros) a área do nível abaixo.
 *   Delegado    → desenha áreas p/ Coordenadores
 *   Coordenador → desenha áreas p/ Territoriais
 *   Territorial → desenha áreas p/ Cabos
 *   Cabo        → trabalha na sua área
 *
 * Tela: minha área (outline) + sub-áreas que EU desenhei (em camadas).
 *   - Sidebar esquerda: lista de sub-áreas (KPIs mini)
 *   - Mapa central: polígonos de bairros coloridos por sub-área, raio circular
 *   - Painel direito: detalhes da selecionada ou modo edição
 *   - Toolbar: nova sub-área, órfãos, conflitos, cobertura
 * ========================================================================= */

(() => {
const { useState, useMemo, useRef, useEffect } = React;

// ======================== DADOS MOCK ========================
// Grid 10x8 de bairros (Recôncavo / Feira de Santana) — id + nome + polygon + centro
// Cada célula ~= 1 bairro. Alguns bairros têm sub-área atribuída (subareaId), outros são órfãos.

const GRID_COLS = 10;
const GRID_ROWS = 8;
const CELL_W = 80;
const CELL_H = 68;
const MAP_W = GRID_COLS * CELL_W; // 800
const MAP_H = GRID_ROWS * CELL_H; // 544

const BAIRRO_NAMES = [
  "Pituba","Barra","Rio Vermelho","Brotas","Itapuã","Cabula","Tancredo","Federação","Amaralina","Graça",
  "Vitória","Garcia","Nazaré","Comércio","Barris","Canela","Ondina","São Caetano","Fazenda Grande","Cajazeiras",
  "Pau da Lima","Valéria","Águas Claras","Lobato","Subúrbio","Periperi","Paripe","Tubarão","São Tomé","Mussurunga",
  "Stella Maris","Piatã","Jardim Armação","Patamares","Itaigara","Stiep","Iguatemi","Paralela","Imbuí","Costa Azul",
  "Armação","Boca do Rio","Jardim das Margaridas","Pernambués","Saboeiro","Sussuarana","Resgate","Narandiba","Dom Avelar","Canabrava",
  "São Rafael","Jardim Santo Inácio","Castelo Branco","Boca da Mata","Campinas","Mata Escura","Plataforma","Alto de Coutos","Rio Sena","Sete de Abril",
  "São Marcos","Pirajá","Escada","Colinas","Acupe","Vale dos Barris","Saramandaia","Marback","Cosme de Farias","Liberdade",
  "Curuzu","Uruguai","Roma","Calçada","Ribeira","Monte Serrat","Itapagipe","Massaranduba","Boa Viagem","Água de Meninos"
];

// gera bairros: id 0..79, polígono retangular ligeiramente irregular
function mkBairros() {
  const arr = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const i = r * GRID_COLS + c;
      const x = c * CELL_W;
      const y = r * CELL_H;
      // jitter nas bordas pra parecer orgânico
      const j = (a, b) => {
        const h = Math.sin(i * 73 + a * 31 + b * 17) * 0.5 + 0.5;
        return (h - 0.5) * 10;
      };
      const pts = [
        [x + j(0,0), y + j(0,1)],
        [x + CELL_W + j(1,0), y + j(1,1)],
        [x + CELL_W + j(2,0), y + CELL_H + j(2,1)],
        [x + j(3,0), y + CELL_H + j(3,1)],
      ];
      arr.push({
        id: `b-${i}`,
        nome: BAIRRO_NAMES[i % BAIRRO_NAMES.length],
        cx: x + CELL_W/2,
        cy: y + CELL_H/2,
        poly: pts,
        // KPIs
        eleitores: 1200 + ((i * 137) % 3800),
        presenca: (i * 13) % 100,
        score: 35 + ((i * 19) % 55),
        // quem atua (subareaId ou null)
        subareaId: null, // será preenchido abaixo
      });
    }
  }
  return arr;
}

const BAIRROS_BASE = mkBairros();

// Minha área (do delegado/coordenador) — um "footprint" irregular composto por bairros
const MINHA_AREA_IDS = new Set([
  // linhas 1-6, colunas 1-8 aproximadamente, com borda irregular
  11,12,13,14,15,16,17,
  21,22,23,24,25,26,27,28,
  31,32,33,34,35,36,37,38,
  41,42,43,44,45,46,47,48,
  51,52,53,54,55,56,57,
  62,63,64,65,66,
].map(i => `b-${i}`));

// Sub-áreas existentes (desenhadas POR MIM para meus subordinados)
const SUBAREAS_INIT = [
  {
    id: "sa-1",
    subordinado: "Marcos Silveira",
    papel: "Coordenador Territorial · Centro",
    avatar: "MS",
    cor: "#3b82f6",
    // centro do raio + raio (em px do SVG)
    center: { x: 3.5 * CELL_W, y: 2.5 * CELL_H },
    raio: 160,
    // bairros dela
    bairroIds: [11,12,13,21,22,23,24,31,32,33,34].map(i => `b-${i}`),
    status: "ativo",
  },
  {
    id: "sa-2",
    subordinado: "Paula Nascimento",
    papel: "Coordenadora Territorial · Sul",
    avatar: "PN",
    cor: "#10b981",
    center: { x: 6 * CELL_W, y: 2.5 * CELL_H },
    raio: 145,
    bairroIds: [14,15,16,17,25,26,27,28,35,36,37,38].map(i => `b-${i}`),
    status: "ativo",
  },
  {
    id: "sa-3",
    subordinado: "Renato Bastos",
    papel: "Coordenador Territorial · Oeste",
    avatar: "RB",
    cor: "#f59e0b",
    center: { x: 3 * CELL_W, y: 5 * CELL_H },
    raio: 155,
    bairroIds: [41,42,43,51,52,53,62,63].map(i => `b-${i}`),
    status: "ativo",
  },
  {
    id: "sa-4",
    subordinado: "Luciana Rocha",
    papel: "Coordenadora Territorial · Leste",
    avatar: "LR",
    cor: "#a855f7",
    center: { x: 5.5 * CELL_W, y: 5 * CELL_H },
    raio: 140,
    bairroIds: [44,45,46,54,55,56].map(i => `b-${i}`),
    status: "ativo",
  },
];

// Aplica subareaId aos bairros
function applySubareas(bairros, subareas) {
  const map = new Map();
  subareas.forEach(sa => sa.bairroIds.forEach(bid => map.set(bid, sa.id)));
  return bairros.map(b => ({ ...b, subareaId: map.get(b.id) || null }));
}

// ======================== COMPONENT ========================
function Tela2Mapa({ demoMode, corCerca }) {
  const [subareas, setSubareas] = useState(SUBAREAS_INIT);
  const [selectedId, setSelectedId] = useState(null); // sub-área selecionada
  const [mode, setMode] = useState("view");           // view | edit | create
  const [draftRaio, setDraftRaio] = useState(140);
  const [draftCenter, setDraftCenter] = useState(null);
  const [filter, setFilter] = useState("all");        // all | orfaos | conflitos
  const [hoverBairroId, setHoverBairroId] = useState(null);

  const bairros = useMemo(() => applySubareas(BAIRROS_BASE, subareas), [subareas]);
  const bairrosMap = useMemo(() => {
    const m = new Map();
    bairros.forEach(b => m.set(b.id, b));
    return m;
  }, [bairros]);

  const selected = subareas.find(s => s.id === selectedId);
  const bairrosNaMinhaArea = bairros.filter(b => MINHA_AREA_IDS.has(b.id));

  // Cobertura, órfãos, conflitos
  const cobertos = bairrosNaMinhaArea.filter(b => b.subareaId).length;
  const orfaosArr = bairrosNaMinhaArea.filter(b => !b.subareaId);
  const coberturaPct = Math.round((cobertos / bairrosNaMinhaArea.length) * 100);
  // "Conflitos": nesse mock, bairro fora da minha área com subareaId = extravasamento
  const conflitos = bairros.filter(b => !MINHA_AREA_IDS.has(b.id) && b.subareaId);

  // Totais agregados por sub-área
  const saStats = useMemo(() => {
    const stats = {};
    subareas.forEach(sa => {
      const bs = sa.bairroIds.map(bid => bairrosMap.get(bid)).filter(Boolean);
      const eleitores = bs.reduce((s,b) => s + b.eleitores, 0);
      const presenca = bs.length ? Math.round(bs.reduce((s,b) => s + b.presenca, 0) / bs.length) : 0;
      const score = bs.length ? Math.round(bs.reduce((s,b) => s + b.score, 0) / bs.length) : 0;
      stats[sa.id] = { bairros: bs.length, eleitores, presenca, score };
    });
    return stats;
  }, [subareas, bairrosMap]);

  // ======================== AÇÕES ========================
  function enterEdit(saId) {
    const sa = subareas.find(s => s.id === saId);
    if (!sa) return;
    setSelectedId(saId);
    setDraftRaio(sa.raio);
    setDraftCenter({ ...sa.center });
    setMode("edit");
  }
  function cancelEdit() { setMode("view"); }
  function saveEdit() {
    setSubareas(prev => prev.map(s => s.id === selectedId ? { ...s, raio: draftRaio, center: draftCenter } : s));
    setMode("view");
  }
  function toggleBairro(bid) {
    if (mode !== "edit" || !selected) return;
    setSubareas(prev => prev.map(s => {
      if (s.id !== selectedId) {
        // se bairro pertencia a outra sub-área e agora vai pra atual, remove da outra
        return { ...s, bairroIds: s.bairroIds.filter(x => x !== bid) };
      }
      const has = s.bairroIds.includes(bid);
      return { ...s, bairroIds: has ? s.bairroIds.filter(x => x !== bid) : [...s.bairroIds, bid] };
    }));
  }
  function autoFillByRadius() {
    if (!selected || !draftCenter) return;
    const r = draftRaio;
    const within = bairros
      .filter(b => MINHA_AREA_IDS.has(b.id))
      .filter(b => {
        const dx = b.cx - draftCenter.x;
        const dy = b.cy - draftCenter.y;
        return Math.sqrt(dx*dx + dy*dy) <= r;
      })
      .map(b => b.id);
    setSubareas(prev => prev.map(s => {
      if (s.id === selectedId) return { ...s, bairroIds: within };
      // remove esses bairros das outras sub-áreas
      return { ...s, bairroIds: s.bairroIds.filter(x => !within.includes(x)) };
    }));
  }
  function clearSubarea() {
    setSubareas(prev => prev.map(s => s.id === selectedId ? { ...s, bairroIds: [] } : s));
  }
  function newSubarea() {
    const colors = ["#3b82f6","#10b981","#f59e0b","#a855f7","#ec4899","#06b6d4","#ef4444","#84cc16"];
    const usedCols = new Set(subareas.map(s => s.cor));
    const cor = colors.find(c => !usedCols.has(c)) || colors[subareas.length % colors.length];
    const newSa = {
      id: `sa-${Date.now()}`,
      subordinado: "Novo coordenador",
      papel: "Coordenador Territorial",
      avatar: "??",
      cor,
      center: { x: MAP_W/2, y: MAP_H/2 },
      raio: 120,
      bairroIds: [],
      status: "rascunho",
    };
    setSubareas(prev => [...prev, newSa]);
    setSelectedId(newSa.id);
    setDraftRaio(120);
    setDraftCenter({ ...newSa.center });
    setMode("edit");
  }

  // ======================== RENDER ========================
  return (
    <div className="h-full w-full flex" style={{ background: "var(--bg-page-2)" }}>

      {/* =========== SIDEBAR ESQUERDA — Sub-áreas =========== */}
      <aside className="w-[280px] flex-shrink-0 border-r flex flex-col" style={{ borderColor: "var(--rule)", background: "var(--bg-card)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="card-sub mb-2">Minha área</div>
          <div className="text-[16px] font-black font-display t-fg-strong leading-tight">Recôncavo Norte</div>
          <div className="text-[11px] t-fg-dim mt-0.5">Delegado · {bairrosNaMinhaArea.length} bairros</div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--rule)" }}>
                <div style={{ width: `${coberturaPct}%`, height: "100%", background: coberturaPct >= 80 ? "var(--ok)" : coberturaPct >= 60 ? "var(--warn)" : "var(--danger)" }}/>
              </div>
            </div>
            <div className="text-[13px] font-black tnum t-fg-strong">{coberturaPct}%</div>
          </div>
          <div className="text-[10px] t-fg-dim mt-1">cobertura · {cobertos}/{bairrosNaMinhaArea.length}</div>
        </div>

        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="card-sub">Sub-áreas · {subareas.length}</div>
          <button onClick={newSubarea} className="btn-primary" style={{ padding: "5px 10px", fontSize: 10.5 }}>
            <CIcon name="Plus" size={10}/>Nova
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto thin-scroll pb-3">
          {subareas.map(sa => {
            const st = saStats[sa.id];
            const active = selectedId === sa.id;
            return (
              <button key={sa.id} onClick={() => { setSelectedId(sa.id); setMode("view"); }}
                      className="w-full text-left px-4 py-3 border-l-[3px] transition-all"
                      style={{
                        borderLeftColor: active ? sa.cor : "transparent",
                        background: active ? "var(--chart-hover)" : "transparent"
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--chart-hover)"; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9.5px] font-bold flex-shrink-0" style={{ background: sa.cor, color: "#fff" }}>{sa.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold t-fg-strong truncate">{sa.subordinado}</div>
                    <div className="text-[10px] t-fg-dim truncate">{sa.papel}</div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] t-fg-muted">
                      <span><b className="tnum t-fg-strong">{st.bairros}</b> bairros</span>
                      <span>·</span>
                      <span><b className="tnum t-fg-strong">{(st.eleitores/1000).toFixed(1)}k</b> eleitores</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="chip" style={{ height: 15, fontSize: 9, padding: "0 5px", background: "var(--rule)", color: "var(--fg-dim)" }}>Presença {st.presenca}%</span>
                      <span className="chip" style={{ height: 15, fontSize: 9, padding: "0 5px", background: st.score >= 70 ? "rgba(5,150,105,0.12)" : st.score >= 50 ? "rgba(217,119,6,0.12)" : "rgba(220,38,38,0.12)", color: st.score >= 70 ? "var(--ok)" : st.score >= 50 ? "var(--warn)" : "var(--danger)" }}>Score {st.score}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Alertas */}
        <div className="border-t p-3 space-y-1.5" style={{ borderColor: "var(--rule)" }}>
          {orfaosArr.length > 0 && (
            <button onClick={() => setFilter(filter === "orfaos" ? "all" : "orfaos")}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left"
                    style={{ background: filter === "orfaos" ? "rgba(220,38,38,0.1)" : "transparent", border: `1px solid ${filter === "orfaos" ? "var(--danger)" : "var(--rule)"}` }}>
              <CIcon name="AlertTriangle" size={12} style={{ color: "var(--danger)" }}/>
              <div className="flex-1 min-w-0">
                <div className="text-[11.5px] font-semibold" style={{ color: "var(--danger)" }}>{orfaosArr.length} órfãos</div>
                <div className="text-[9.5px] t-fg-dim">Sem responsável</div>
              </div>
            </button>
          )}
          {conflitos.length > 0 && (
            <button onClick={() => setFilter(filter === "conflitos" ? "all" : "conflitos")}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left"
                    style={{ background: filter === "conflitos" ? "rgba(217,119,6,0.1)" : "transparent", border: `1px solid ${filter === "conflitos" ? "var(--warn)" : "var(--rule)"}` }}>
              <CIcon name="AlertTriangle" size={12} style={{ color: "var(--warn)" }}/>
              <div className="flex-1 min-w-0">
                <div className="text-[11.5px] font-semibold" style={{ color: "var(--warn)" }}>{conflitos.length} conflitos</div>
                <div className="text-[9.5px] t-fg-dim">Fora da sua área</div>
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* =========== MAPA CENTRAL =========== */}
      <div className="flex-1 relative min-w-0 overflow-hidden">
        {/* TOOLBAR flutuante topo */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex gap-2 pointer-events-auto">
            <div className="px-3 py-2 rounded-lg flex items-center gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--rule-strong)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
              <CIcon name="Map" size={13} className="t-fg-dim"/>
              <div>
                <div className="text-[9.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Modo</div>
                <div className="text-[12px] font-bold t-fg-strong">{mode === "edit" ? "Editando sub-área" : "Visualização"}</div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pointer-events-auto">
            <button onClick={() => setFilter("all")} className={`btn-ghost ${filter === "all" ? "active" : ""}`}><CIcon name="Layers" size={11}/>Todas</button>
            <button onClick={() => setFilter("orfaos")} className={`btn-ghost ${filter === "orfaos" ? "active" : ""}`} style={filter === "orfaos" ? { color: "var(--danger)" } : undefined}><CIcon name="AlertTriangle" size={11}/>Órfãos</button>
            <button onClick={() => setFilter("conflitos")} className={`btn-ghost ${filter === "conflitos" ? "active" : ""}`} style={filter === "conflitos" ? { color: "var(--warn)" } : undefined}><CIcon name="AlertTriangle" size={11}/>Conflitos</button>
            <div className="w-px" style={{ background: "var(--rule-strong)" }}/>
            <button className="btn-ghost"><CIcon name="Minus" size={11}/></button>
            <button className="btn-ghost"><CIcon name="Plus" size={11}/></button>
          </div>
        </div>

        {/* LEGENDA inferior */}
        <div className="absolute bottom-4 left-4 z-20 px-3 py-2.5 rounded-lg pointer-events-auto" style={{ background: "var(--bg-card)", border: "1px solid var(--rule-strong)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          <div className="text-[9.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-1.5">Legenda</div>
          <div className="flex items-center gap-3 text-[10.5px]">
            <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: "var(--tenant-primary)", opacity: 0.12, border: "1px dashed var(--tenant-primary)" }}/><span className="t-fg-muted">Minha área</span></div>
            <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: "rgba(59,130,246,0.3)", border: "1px solid #3b82f6" }}/><span className="t-fg-muted">Sub-área</span></div>
            <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full border-2 border-dashed" style={{ borderColor: "var(--fg-dim)", background: "transparent" }}/><span className="t-fg-muted">Raio</span></div>
            <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: "rgba(220,38,38,0.25)", border: "1px solid var(--danger)" }}/><span className="t-fg-muted">Órfão</span></div>
          </div>
        </div>

        {/* Scale indicator */}
        <div className="absolute bottom-4 right-4 z-20 px-2.5 py-1.5 rounded text-[10px] t-fg-faint font-mono pointer-events-none" style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}>
          zoom 1:80k · {bairrosNaMinhaArea.length} bairros
        </div>

        {/* SVG MAP */}
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}
             onClick={() => { if (mode !== "edit") setSelectedId(null); }}>
          <defs>
            <pattern id="gridMap" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--rule)" strokeWidth="0.5" opacity="0.5"/>
            </pattern>
            <filter id="saShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3"/>
            </filter>
          </defs>

          <rect width={MAP_W} height={MAP_H} fill="url(#gridMap)"/>

          {/* Minha área — contorno tracejado */}
          <MinhaAreaOutline bairros={bairrosNaMinhaArea}/>

          {/* Todos os bairros da minha área */}
          {bairrosNaMinhaArea.map(b => {
            const sa = b.subareaId ? subareas.find(s => s.id === b.subareaId) : null;
            const isOrphan = !sa;
            const inSelected = selected && selected.bairroIds.includes(b.id);
            const isHovered = hoverBairroId === b.id;
            const dimmed = (filter === "orfaos" && !isOrphan) || (filter === "conflitos") || (selected && !inSelected && mode === "view");
            const fillColor = isOrphan ? "rgba(220,38,38,0.18)" : sa.cor;
            const fillOp = isHovered ? 0.55 : (inSelected ? 0.5 : isOrphan ? 1 : 0.28);
            const strokeColor = isOrphan ? "#dc2626" : sa.cor;

            return (
              <g key={b.id}
                 onMouseEnter={() => setHoverBairroId(b.id)}
                 onMouseLeave={() => setHoverBairroId(null)}
                 onClick={e => {
                   e.stopPropagation();
                   if (mode === "edit") toggleBairro(b.id);
                   else if (sa) { setSelectedId(sa.id); }
                 }}
                 style={{ cursor: mode === "edit" ? "pointer" : (sa ? "pointer" : "default"), opacity: dimmed ? 0.3 : 1 }}>
                <polygon points={b.poly.map(p => p.join(",")).join(" ")}
                         fill={fillColor} fillOpacity={fillOp}
                         stroke={strokeColor} strokeWidth={inSelected || isHovered ? 1.8 : 0.8}
                         strokeOpacity={isOrphan ? 0.8 : 0.6}/>
                {(isHovered || inSelected) && (
                  <text x={b.cx} y={b.cy + 3} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="var(--fg-strong)" pointerEvents="none">{b.nome}</text>
                )}
              </g>
            );
          })}

          {/* Bairros de conflito (fora da minha área) */}
          {filter === "conflitos" && conflitos.map(b => (
            <polygon key={b.id} points={b.poly.map(p => p.join(",")).join(" ")}
                     fill="rgba(217,119,6,0.3)" stroke="var(--warn)" strokeWidth={1.5} strokeDasharray="3 2"/>
          ))}

          {/* Raios das sub-áreas (modo view) */}
          {mode === "view" && subareas.map(sa => {
            const active = selectedId === sa.id;
            return (
              <circle key={sa.id} cx={sa.center.x} cy={sa.center.y} r={sa.raio}
                      fill="none" stroke={sa.cor} strokeWidth={active ? 1.5 : 0.8}
                      strokeDasharray="4 3" opacity={active ? 0.8 : filter === "all" ? 0.35 : 0.15}
                      pointerEvents="none"/>
            );
          })}

          {/* Raio em modo edit (arrastável) */}
          {mode === "edit" && selected && draftCenter && (
            <g>
              <circle cx={draftCenter.x} cy={draftCenter.y} r={draftRaio}
                      fill={selected.cor} fillOpacity={0.08}
                      stroke={selected.cor} strokeWidth={1.8} strokeDasharray="5 3" pointerEvents="none"/>
              {/* centro handle */}
              <circle cx={draftCenter.x} cy={draftCenter.y} r={8} fill={selected.cor} stroke="#fff" strokeWidth={2} style={{ cursor: "grab" }}
                      onMouseDown={e => {
                        e.stopPropagation();
                        const svg = e.currentTarget.ownerSVGElement;
                        const pt = svg.createSVGPoint();
                        const onMove = (mv) => {
                          pt.x = mv.clientX; pt.y = mv.clientY;
                          const sp = pt.matrixTransform(svg.getScreenCTM().inverse());
                          setDraftCenter({ x: Math.max(0, Math.min(MAP_W, sp.x)), y: Math.max(0, Math.min(MAP_H, sp.y)) });
                        };
                        const onUp = () => {
                          document.removeEventListener("mousemove", onMove);
                          document.removeEventListener("mouseup", onUp);
                        };
                        document.addEventListener("mousemove", onMove);
                        document.addEventListener("mouseup", onUp);
                      }}/>
            </g>
          )}

          {/* Centros das sub-áreas (pin) */}
          {mode === "view" && subareas.map(sa => {
            const active = selectedId === sa.id;
            return (
              <g key={sa.id} style={{ cursor: "pointer" }}
                 onClick={e => { e.stopPropagation(); setSelectedId(sa.id); }}>
                <circle cx={sa.center.x} cy={sa.center.y} r={active ? 14 : 11} fill={sa.cor} stroke="#fff" strokeWidth={active ? 3 : 2}/>
                <text x={sa.center.x} y={sa.center.y + 3} textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff">{sa.avatar}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* =========== PAINEL DIREITO =========== */}
      {selected && (
        <aside className="w-[340px] flex-shrink-0 border-l flex flex-col overflow-hidden" style={{ borderColor: "var(--rule)", background: "var(--bg-card)" }}>
          <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0" style={{ background: selected.cor, color: "#fff" }}>{selected.avatar}</div>
                <div className="min-w-0">
                  <div className="text-[15px] font-black t-fg-strong truncate">{selected.subordinado}</div>
                  <div className="text-[11px] t-fg-dim truncate">{selected.papel}</div>
                </div>
              </div>
              <button className="btn-ghost" onClick={() => setSelectedId(null)} style={{ padding: "5px 7px" }}><CIcon name="X" size={11}/></button>
            </div>
            {mode === "view" && (
              <div className="flex gap-2">
                <button onClick={() => enterEdit(selected.id)} className="btn-primary flex-1" style={{ justifyContent: "center", fontSize: 11 }}>
                  <CIcon name="Edit" size={11}/>Editar área
                </button>
                <button className="btn-ghost" style={{ padding: "6px 10px" }}><CIcon name="MessageCircle" size={11}/></button>
                <button className="btn-ghost" style={{ padding: "6px 10px" }}><CIcon name="MoreHorizontal" size={11}/></button>
              </div>
            )}
            {mode === "edit" && (
              <div className="flex gap-2">
                <button onClick={saveEdit} className="btn-primary flex-1" style={{ justifyContent: "center", fontSize: 11, background: "var(--ok)", borderColor: "var(--ok)" }}>
                  <CIcon name="Check" size={11}/>Salvar
                </button>
                <button onClick={cancelEdit} className="btn-ghost flex-1" style={{ justifyContent: "center", fontSize: 11 }}>Cancelar</button>
              </div>
            )}
          </div>

          {mode === "edit" ? (
            <EditPanel subarea={selected} stats={saStats[selected.id]}
                       raio={draftRaio} setRaio={setDraftRaio}
                       autoFill={autoFillByRadius} clear={clearSubarea}
                       bairros={bairros.filter(b => selected.bairroIds.includes(b.id))}
                       toggleBairro={toggleBairro}/>
          ) : (
            <ViewPanel subarea={selected} stats={saStats[selected.id]}
                       bairros={bairros.filter(b => selected.bairroIds.includes(b.id))}/>
          )}
        </aside>
      )}
    </div>
  );
}

// ======================== SUB-COMPONENTS ========================

function MinhaAreaOutline({ bairros }) {
  // Une todos os polígonos dos bairros em um contorno aproximado.
  // Simples: desenha borda tracejada ao redor do bounding box dos bairros
  // mais um "halo" agregado. Pra visual, faremos hulls por linha de bairros.
  // Aqui: só desenhamos polígonos finos ao redor de cada bairro (stroke only).
  const minX = Math.min(...bairros.flatMap(b => b.poly.map(p => p[0]))) - 2;
  const maxX = Math.max(...bairros.flatMap(b => b.poly.map(p => p[0]))) + 2;
  const minY = Math.min(...bairros.flatMap(b => b.poly.map(p => p[1]))) - 2;
  const maxY = Math.max(...bairros.flatMap(b => b.poly.map(p => p[1]))) + 2;
  return (
    <g>
      <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY}
            fill="var(--tenant-primary)" fillOpacity={0.04}
            stroke="var(--tenant-primary)" strokeWidth={1.2} strokeDasharray="6 4" opacity={0.6} rx={8}/>
    </g>
  );
}

function ViewPanel({ subarea, stats, bairros }) {
  return (
    <div className="flex-1 overflow-y-auto thin-scroll">
      <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Bairros" value={stats.bairros}/>
          <Stat label="Eleitores" value={(stats.eleitores/1000).toFixed(1) + "k"}/>
          <Stat label="Presença média" value={stats.presenca + "%"} color={stats.presenca >= 70 ? "var(--ok)" : stats.presenca >= 50 ? "var(--warn)" : "var(--danger)"}/>
          <Stat label="Score médio" value={stats.score} color={stats.score >= 70 ? "var(--ok)" : stats.score >= 50 ? "var(--warn)" : "var(--danger)"}/>
        </div>
      </div>
      <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
        <div className="card-sub mb-2">Raio de atuação</div>
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-black tnum font-display t-fg-strong">{subarea.raio}</span>
          <span className="text-[11px] t-fg-dim">px · ~{(subarea.raio * 0.08).toFixed(1)}km</span>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="card-sub">Bairros · {bairros.length}</div>
          <button className="btn-ghost" style={{ padding: "3px 7px", fontSize: 10 }}>Ver tudo</button>
        </div>
        <div className="space-y-1">
          {bairros.map(b => (
            <div key={b.id} className="flex items-center gap-2 py-1.5 px-2 rounded" style={{ background: "var(--bg-card-2)" }}>
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: subarea.cor }}/>
              <div className="flex-1 min-w-0 text-[11.5px] font-semibold t-fg-strong truncate">{b.nome}</div>
              <span className="text-[10px] tnum t-fg-dim">{(b.eleitores/1000).toFixed(1)}k</span>
              <span className="text-[10px] tnum font-bold" style={{ color: b.score >= 70 ? "var(--ok)" : b.score >= 50 ? "var(--warn)" : "var(--danger)" }}>{b.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditPanel({ subarea, stats, raio, setRaio, autoFill, clear, bairros, toggleBairro }) {
  return (
    <div className="flex-1 overflow-y-auto thin-scroll">
      <div className="p-4 border-b" style={{ borderColor: "var(--rule)", background: "rgba(59,130,246,0.05)" }}>
        <div className="flex items-center gap-2 text-[11px] font-semibold mb-1" style={{ color: "var(--accent-blue)" }}>
          <CIcon name="Edit" size={11}/>Modo edição
        </div>
        <div className="text-[10.5px] t-fg-muted" style={{ lineHeight: 1.45 }}>
          Arraste o centro no mapa, ajuste o raio, ou clique em bairros para incluir/excluir.
        </div>
      </div>

      {/* Raio */}
      <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="card-sub">Raio de atuação</div>
          <div className="text-[13px] font-black tnum t-fg-strong">{raio}px · {(raio * 0.08).toFixed(1)}km</div>
        </div>
        <input type="range" min="40" max="280" value={raio} onChange={e => setRaio(+e.target.value)}
               className="w-full" style={{ accentColor: subarea.cor }}/>
        <div className="flex justify-between text-[9px] t-fg-faint mt-1 font-mono">
          <span>40</span><span>160</span><span>280</span>
        </div>
        <button onClick={autoFill} className="btn-ghost w-full mt-3" style={{ justifyContent: "center", fontSize: 11 }}>
          <CIcon name="Zap" size={11}/>Auto-preencher bairros dentro do raio
        </button>
      </div>

      {/* Bairros atuais */}
      <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="card-sub">Bairros incluídos · {bairros.length}</div>
          <button onClick={clear} className="text-[10px] font-semibold" style={{ color: "var(--danger)" }}>Limpar tudo</button>
        </div>
        {bairros.length === 0 ? (
          <div className="text-[11px] t-fg-dim py-3 text-center">Nenhum bairro ainda. Clique no mapa para adicionar.</div>
        ) : (
          <div className="space-y-1 max-h-[280px] overflow-y-auto thin-scroll">
            {bairros.map(b => (
              <button key={b.id} onClick={() => toggleBairro(b.id)}
                      className="w-full flex items-center gap-2 py-1.5 px-2 rounded text-left"
                      style={{ background: "var(--bg-card-2)" }}>
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: subarea.cor }}/>
                <div className="flex-1 min-w-0 text-[11.5px] font-semibold t-fg-strong truncate">{b.nome}</div>
                <CIcon name="X" size={11} className="t-fg-dim"/>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="card-sub mb-2">Totais após edição</div>
        <div className="grid grid-cols-3 gap-2">
          <MiniStat2 label="Bairros" value={bairros.length}/>
          <MiniStat2 label="Eleitores" value={(bairros.reduce((s,b)=>s+b.eleitores,0)/1000).toFixed(1)+"k"}/>
          <MiniStat2 label="Presença" value={bairros.length ? Math.round(bairros.reduce((s,b)=>s+b.presenca,0)/bairros.length)+"%" : "—"}/>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div className="text-[9.5px] t-fg-dim uppercase tracking-wider font-semibold mb-1">{label}</div>
      <div className="text-[20px] font-black tnum font-display leading-none" style={{ color: color || "var(--fg-strong)" }}>{value}</div>
    </div>
  );
}

function MiniStat2({ label, value }) {
  return (
    <div className="p-2 rounded" style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}>
      <div className="text-[8.5px] t-fg-dim uppercase tracking-wider font-semibold">{label}</div>
      <div className="text-[13px] font-black tnum font-display t-fg-strong mt-0.5">{value}</div>
    </div>
  );
}

Object.assign(window, { Tela2Mapa });
})();
