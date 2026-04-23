"use client";

import { useState, useMemo } from "react";
import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { Eye, Target, AlertTriangle, Zap, Clock, Trophy, UserPlus, Download, MessageCircle, MapPin, Route } from "lucide-react";
import Link from "next/link";

// ======================== MOCK DATA ========================
const CABOS = [
  { id:"rita",   nome:"Rita Lima",        tier:"ouro",   score:89, visitasHoje:42, metaHoje:50, conv:0.68, cor:"#2563eb" },
  { id:"marcos", nome:"Marcos Oliveira",  tier:"prata",  score:72, visitasHoje:28, metaHoje:50, conv:0.54, cor:"#059669" },
  { id:"ana",    nome:"Ana Paula Ribeiro",tier:"prata",  score:76, visitasHoje:31, metaHoje:40, conv:0.61, cor:"#7c3aed" },
  { id:"jose",   nome:"José Roberto",     tier:"bronze", score:54, visitasHoje:12, metaHoje:35, conv:0.32, cor:"#d97706" },
  { id:"helena", nome:"Helena Barreto",   tier:"ouro",   score:82, visitasHoje:38, metaHoje:45, conv:0.72, cor:"#db2777" },
];

const RUAS = [
  "Rua São Domingos","Rua das Palmeiras","Av. Getúlio Vargas","Rua Coronel Juca Sobrinho",
  "Rua Olavo Bilac","Rua dos Girassóis","Rua Manoel Vitorino","Av. Artêmio Castro",
  "Rua Pedro Álvares","Rua da Matriz","Travessa do Cruzeiro","Rua Nilo Peçanha",
];

function buildQuadras() {
  const cols = 8, rows = 5;
  const cellW = 84, cellH = 78;
  const gapX = 8, gapY = 8;
  const originX = 40, originY = 40;
  const arr = [];
  let id = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = originX + c * (cellW + gapX);
      const y = originY + r * (cellH + gapY);
      const jx = (Math.sin(id * 1.3) * 4);
      const jy = (Math.cos(id * 1.7) * 4);
      const pts = [[x+jx,y+jy],[x+cellW-jy,y+jx],[x+cellW+jx,y+cellH-jy],[x-jy,y+cellH+jx]];
      arr.push({
        id: `Q${String(id).padStart(2,"0")}`,
        centroid: [x+cellW/2, y+cellH/2],
        points: pts,
        domicilios: 40 + ((id * 7) % 60),
        rua: RUAS[id % RUAS.length],
      });
      id++;
    }
  }
  return arr;
}

const QUADRAS_BASE = buildQuadras();

const OWNERS = {
  "Q01":"rita","Q02":"rita","Q03":"rita","Q09":"rita","Q10":"rita","Q11":"rita",
  "Q04":"marcos","Q05":"marcos","Q06":"marcos","Q12":"marcos","Q13":"marcos","Q14":"marcos",
  "Q07":"ana","Q08":"ana","Q15":"ana","Q16":"ana","Q23":"ana","Q24":"ana",
  "Q17":"jose","Q18":"jose","Q19":"jose","Q20":"jose","Q25":"jose","Q26":"jose","Q27":"jose","Q28":"jose",
  "Q33":"helena","Q34":"helena","Q35":"helena","Q36":"helena","Q37":"helena",
};
const CONFLICTS = { "Q20": ["jose","helena"] };

function perfFor(qId) {
  const cabo = OWNERS[qId];
  if (!cabo) return { cobertura:0, conversao:0, feitoHoje:0 };
  const c = CABOS.find(x=>x.id===cabo);
  const seed = (qId.charCodeAt(1)+qId.charCodeAt(2));
  return {
    cobertura: Math.min(0.95, (0.3+((seed*7)%60)/100)*(c.score/80)),
    conversao: c.conv*(0.8+((seed*11)%30)/100),
    feitoHoje: Math.round((seed%7)+1),
  };
}

function routesForCabo(caboId) {
  return Object.entries(OWNERS).filter(([,v])=>v===caboId).map(([k])=>QUADRAS_BASE.find(x=>x.id===k)?.centroid).filter(Boolean);
}

function polyToPath(points) {
  return "M " + points.map(p=>p.join(",")).join(" L ") + " Z";
}

function colorForQuadra(q, layer) {
  const cabo = OWNERS[q.id];
  if (CONFLICTS[q.id]) return { fill:"#dc2626", fillOpacity:0.35 };
  if (!cabo) return { fill:"#a1a1aa", fillOpacity:0.15 };
  const c = CABOS.find(x=>x.id===cabo);
  if (layer === "cobertura") {
    const v = perfFor(q.id).cobertura;
    const hue = Math.round(v*135);
    return { fill:`hsl(${hue},65%,55%)`, fillOpacity:0.45 };
  }
  return { fill:c.cor, fillOpacity:0.22 };
}

// ======================== SUB COMPONENTS ========================
function Avatar({ nome, size = 24 }) {
  const colors = ["#2563eb","#059669","#7c3aed","#d97706","#db2777"];
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",background:colors[nome.charCodeAt(0)%colors.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.38,fontWeight:700,color:"#fff",flexShrink:0 }}>
      {nome.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}
    </div>
  );
}

function ProgressBar({ value, color }) {
  return (
    <div style={{ height:5,background:"var(--mz-rule)",borderRadius:3,overflow:"hidden" }}>
      <div style={{ width:`${Math.min(100,Math.max(0,value))}%`,height:"100%",background:color||"var(--mz-ok,#34d399)",borderRadius:3 }}/>
    </div>
  );
}

// ======================== MAIN ========================
function MapaCaboContent() {
  const [layer, setLayer] = useState("responsavel");
  const [editMode, setEditMode] = useState("view");
  const [showRoutes, setShowRoutes] = useState(true);
  const [caboFocus, setCaboFocus] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hoverQ, setHoverQ] = useState(null);

  const orfanCount = QUADRAS_BASE.filter(q => !OWNERS[q.id]).length;
  const conflictCount = Object.keys(CONFLICTS).length;
  const totDom = QUADRAS_BASE.reduce((s,q)=>s+q.domicilios,0);
  const totVisitas = CABOS.reduce((s,c)=>s+c.visitasHoje,0);
  const totMeta = CABOS.reduce((s,c)=>s+c.metaHoje,0);

  const LAYERS = [
    { k:"responsavel", l:"Responsável", I:() => <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="7" r="3"/><path d="M15 14c3 0 6 2 6 5.5"/></svg> },
    { k:"cobertura",   l:"Cobertura",   I:Eye },
    { k:"performance", l:"Performance", I:Target },
    { k:"orfaos",      l:`Órfãs (${orfanCount})`, I:AlertTriangle, alert:true },
    { k:"conflitos",   l:`Conflitos (${conflictCount})`, I:Zap, alert:true },
  ];

  return (
    <div className="flex flex-col" style={{ height:"100%", minHeight:600, background:"var(--mz-bg-page)" }}>
      {/* Topbar */}
      <div className="flex items-center gap-4 px-5 h-[52px] border-b flex-shrink-0" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card)" }}>
        <Link href="/mazzel-preview/campanha" className="text-[11px] mz-t-fg-dim font-semibold">← Campanha</Link>
        <div className="flex items-center gap-2">
          <MapPin size={13} style={{ color:"var(--mz-tenant-primary,#002A7B)" }}/>
          <span className="text-[13px] font-bold mz-t-fg-strong">Mapa do Cabo</span>
          <span className="inline-flex px-2 h-5 items-center rounded-full text-[9.5px] font-bold" style={{ background:"rgba(0,42,123,0.1)", color:"var(--mz-tenant-primary,#002A7B)" }}>BAIRRO TOMBA · FEIRA DE SANTANA</span>
        </div>
        <div className="flex-1"/>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold text-white" style={{ background:"var(--mz-tenant-primary,#002A7B)" }}>
          <UserPlus size={11}/>Contratar
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold mz-t-fg-muted" style={{ background:"var(--mz-rule)" }}>
          <Download size={11}/>Exportar mapa
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold mz-t-fg-muted" style={{ background:"var(--mz-rule)" }}>
          <MessageCircle size={11}/>Abrir chat
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-[240px] flex-shrink-0 border-r flex flex-col overflow-y-auto" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card)" }}>
          {/* Modo */}
          <div className="p-3 border-b" style={{ borderColor:"var(--mz-rule)" }}>
            <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-2">Modo de trabalho</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[["view","Visão"],["lasso","Lasso"]].map(([k,l])=>(
                <button key={k} onClick={()=>setEditMode(k)}
                  className="py-2 rounded-md text-[10.5px] font-bold flex items-center justify-center gap-1.5"
                  style={{ background:editMode===k?"var(--mz-tenant-primary,#002A7B)":"var(--mz-rule)", color:editMode===k?"#fff":"var(--mz-fg-muted)" }}>
                  {k==="view" ? <Eye size={10}/> : <Route size={10}/>}{l}
                </button>
              ))}
            </div>
            {editMode==="lasso" && (
              <div className="mt-2 p-2 rounded text-[10px] mz-t-fg-muted" style={{ background:"rgba(0,42,123,0.06)", border:"1px solid rgba(0,42,123,0.18)" }}>
                Arraste no mapa para selecionar quadras.
              </div>
            )}
          </div>

          {/* Camada */}
          <div className="p-3 border-b" style={{ borderColor:"var(--mz-rule)" }}>
            <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-2">Camada</div>
            <div className="space-y-1">
              {LAYERS.map(o=>(
                <button key={o.k} onClick={()=>setLayer(o.k)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-[11px] font-semibold text-left"
                  style={{ background:layer===o.k?"var(--mz-rule-strong,rgba(0,0,0,0.1))":"transparent", color: o.alert && layer!==o.k ? "var(--mz-danger,#f87171)" : "var(--mz-fg)" }}>
                  <o.I size={11}/>
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {/* Rotas */}
          <div className="p-3 border-b" style={{ borderColor:"var(--mz-rule)" }}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold">Rotas de hoje</div>
              <button onClick={()=>setShowRoutes(!showRoutes)} className="text-[10px] mz-t-fg-dim font-semibold px-2 py-1 rounded" style={{ background:"var(--mz-rule)" }}>
                {showRoutes?"ocultar":"mostrar"}
              </button>
            </div>
            <div className="text-[10px] mz-t-fg-dim">Trilha · atualizada a cada 15 min</div>
          </div>

          {/* Equipe */}
          <div className="p-3 flex-1">
            <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-2">Equipe do bairro · {CABOS.length}</div>
            <button onClick={()=>setCaboFocus(null)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left mb-1"
              style={{ background:!caboFocus?"var(--mz-rule-strong,rgba(0,0,0,0.08))":"transparent" }}>
              <div style={{ width:8,height:8,borderRadius:"50%",background:"var(--mz-fg-muted)" }}/>
              <span className="text-[11.5px] font-semibold mz-t-fg-strong flex-1">Todos</span>
              <span className="text-[10px] mz-t-fg-dim">{CABOS.length}</span>
            </button>
            {CABOS.map(c=>{
              const n = Object.values(OWNERS).filter(v=>v===c.id).length;
              const pct = c.visitasHoje/c.metaHoje;
              return (
                <button key={c.id} onClick={()=>setCaboFocus(caboFocus===c.id?null:c.id)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left mb-1"
                  style={{ background:caboFocus===c.id?"var(--mz-rule-strong,rgba(0,0,0,0.08))":"transparent" }}>
                  <div style={{ width:9,height:9,borderRadius:"50%",background:c.cor,flexShrink:0 }}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-semibold mz-t-fg-strong truncate">{c.nome}</div>
                    <div className="text-[10px] mz-t-fg-dim">{n} quadras · {c.visitasHoje}/{c.metaHoje} hoje</div>
                    <div className="mt-0.5">
                      <ProgressBar value={pct*100} color={pct>=0.8?"var(--mz-ok,#34d399)":pct>=0.5?"var(--mz-warn,#fbbf24)":"var(--mz-danger,#f87171)"}/>
                    </div>
                  </div>
                  <span className="text-[10px] mz-tnum font-bold" style={{ color:c.score>=80?"var(--mz-ok,#34d399)":c.score>=65?"var(--mz-warn,#fbbf24)":"var(--mz-danger,#f87171)" }}>{c.score}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* SVG Mapa */}
        <div className="flex-1 relative overflow-hidden" style={{ background:"var(--mz-bg-page-2,#f9f9fb)" }}>
          <svg viewBox="0 0 800 500" style={{ width:"100%",height:"100%",display:"block" }}>
            <defs>
              <pattern id="cabo-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--mz-rule)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="800" height="500" fill="url(#cabo-grid)"/>

            {/* Envelope do bairro */}
            <path d="M 20 30 L 790 30 L 790 475 L 20 475 Z"
              fill="none" stroke="var(--mz-tenant-primary,#002A7B)" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.35"/>

            {/* Avenida horizontal */}
            <line x1="20" y1="244" x2="790" y2="244" stroke="var(--mz-fg-dim)" strokeWidth="3" opacity="0.3"/>
            <text x="780" y="240" textAnchor="end" fontSize="8.5" fontWeight="600" fill="var(--mz-fg-dim)" letterSpacing="0.1em">AV. GETÚLIO VARGAS</text>
            {/* Avenida vertical */}
            <line x1="410" y1="30" x2="410" y2="475" stroke="var(--mz-fg-dim)" strokeWidth="3" opacity="0.3"/>

            {/* Quadras */}
            {QUADRAS_BASE.map(q => {
              const col = colorForQuadra(q, layer);
              const isOrphan = !OWNERS[q.id];
              const isConflict = !!CONFLICTS[q.id];
              const cabo = OWNERS[q.id];
              const dim = caboFocus && cabo !== caboFocus;
              const isHover = hoverQ === q.id;
              return (
                <g key={q.id}>
                  <path d={polyToPath(q.points)}
                    fill={col.fill} fillOpacity={dim ? col.fillOpacity*0.2 : (isHover ? Math.min(col.fillOpacity+0.2,1) : col.fillOpacity)}
                    stroke={isHover?"var(--mz-fg-strong)":col.fill} strokeWidth={isHover?1.4:0.8}
                    opacity={dim?0.4:1} style={{ cursor:"pointer" }}
                    onMouseEnter={()=>setHoverQ(q.id)} onMouseLeave={()=>setHoverQ(null)}
                    onClick={()=>setSelected(q.id===selected?null:q.id)}/>
                  {isOrphan && (layer==="orfaos"||layer==="responsavel") && (
                    <circle cx={q.centroid[0]} cy={q.centroid[1]} r={14} fill="none" stroke="#dc2626" strokeWidth="1.4" opacity="0.7"/>
                  )}
                  {isConflict && (layer==="conflitos"||layer==="responsavel") && (
                    <g>
                      <circle cx={q.centroid[0]} cy={q.centroid[1]} r={12} fill="#fff" stroke="#b91c1c" strokeWidth="1.6"/>
                      <text x={q.centroid[0]} y={q.centroid[1]+4} textAnchor="middle" fontSize="11" fontWeight="900" fill="#b91c1c">!</text>
                    </g>
                  )}
                  <text x={q.centroid[0]} y={q.centroid[1]+3} textAnchor="middle" fontSize="9" fontWeight="700"
                    fill={dim?"var(--mz-fg-dim)":"var(--mz-fg-strong)"} opacity={isConflict?0:0.8} pointerEvents="none">
                    {q.id}
                  </text>
                </g>
              );
            })}

            {/* Rotas */}
            {showRoutes && CABOS.map(c=>{
              if (caboFocus && c.id !== caboFocus) return null;
              const pts = routesForCabo(c.id);
              if (pts.length < 2) return null;
              const d = pts.reduce((acc,p,i)=>acc+(i===0?`M ${p[0]},${p[1]}`:`L ${p[0]},${p[1]}`), "");
              return <path key={c.id+"-route"} d={d} fill="none" stroke={c.cor} strokeWidth="2" strokeOpacity="0.7" strokeDasharray="4 3"/>;
            })}

            {/* Pins cabos */}
            {CABOS.map(c=>{
              if (caboFocus && c.id !== caboFocus) return null;
              const pts = routesForCabo(c.id);
              if (!pts.length) return null;
              const [x,y] = pts[pts.length-1];
              return (
                <g key={c.id+"-pin"}>
                  <circle cx={x} cy={y} r={9} fill="#fff" stroke={c.cor} strokeWidth="2.2"/>
                  <circle cx={x} cy={y} r={4} fill={c.cor}/>
                </g>
              );
            })}

            <text x="28" y="22" fontSize="9.5" fontWeight="700" fill="var(--mz-fg-dim)" letterSpacing="0.14em">BAIRRO TOMBA · FEIRA DE SANTANA · {QUADRAS_BASE.length} QUADRAS</text>
          </svg>

          {/* Tooltip */}
          {hoverQ && (() => {
            const q = QUADRAS_BASE.find(x=>x.id===hoverQ);
            const cabo = OWNERS[q.id];
            const c = cabo ? CABOS.find(x=>x.id===cabo) : null;
            const p = perfFor(q.id);
            return (
              <div className="absolute top-3 right-3 rounded-xl p-3 text-[11px]"
                style={{ background:"var(--mz-bg-card,#fff)", border:"1px solid var(--mz-rule)", boxShadow:"0 6px 18px rgba(0,0,0,0.12)", width:200, pointerEvents:"none" }}>
                <div className="font-bold mz-t-fg-strong text-[13px] mb-1 mz-tnum">{q.id}</div>
                <div className="mz-t-fg-muted mb-2 text-[10.5px]">{q.rua} · {q.domicilios} domicílios</div>
                {c ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div style={{ width:8,height:8,borderRadius:"50%",background:c.cor }}/>
                      <span className="mz-t-fg-strong font-semibold">{c.nome}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mz-t-fg-dim">
                      <span>Cobertura</span><span className="font-semibold mz-t-fg-strong mz-tnum">{Math.round(p.cobertura*100)}%</span>
                      <span>Conversão</span><span className="font-semibold mz-t-fg-strong mz-tnum">{Math.round(p.conversao*100)}%</span>
                      <span>Hoje</span><span className="font-semibold mz-t-fg-strong mz-tnum">{p.feitoHoje} visitas</span>
                    </div>
                  </>
                ) : (
                  <div style={{ color:"var(--mz-danger,#f87171)", fontWeight:700 }}>QUADRA ÓRFÃ</div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Right panel */}
        <aside className="w-[300px] flex-shrink-0 border-l overflow-y-auto" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card)" }}>
          {/* Sala de comando */}
          <div className="p-4 border-b" style={{ borderColor:"var(--mz-rule)" }}>
            <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-0.5">Coordenação territorial</div>
            <div className="text-[18px] font-black mz-t-fg-strong leading-tight">Sala de comando</div>
            <div className="text-[11px] mz-t-fg-muted">Bairro Tomba · Feira de Santana · BA</div>
          </div>

          <div className="p-4 grid grid-cols-2 gap-3 border-b" style={{ borderColor:"var(--mz-rule)" }}>
            {[
              { l:"Domicílios",  v:totDom.toLocaleString("pt-BR"), color:"var(--mz-fg-strong)" },
              { l:"Visitas hoje",v:`${totVisitas}/${totMeta}`, color:totVisitas/totMeta>=0.7?"var(--mz-ok,#34d399)":"var(--mz-warn,#fbbf24)" },
              { l:"Órfãs",       v:orfanCount, color:orfanCount?"var(--mz-danger,#f87171)":"var(--mz-ok,#34d399)" },
              { l:"Conflitos",   v:conflictCount, color:conflictCount?"var(--mz-danger,#f87171)":"var(--mz-ok,#34d399)" },
            ].map(k=>(
              <div key={k.l}>
                <div className="text-[9.5px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-0.5">{k.l}</div>
                <div className="text-[18px] font-black mz-tnum" style={{ color:k.color }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Ranking do dia */}
          <div className="p-4 border-b" style={{ borderColor:"var(--mz-rule)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold">Ranking do dia</div>
              <Trophy size={12} style={{ color:"var(--mz-fg-dim)" }}/>
            </div>
            <div className="space-y-2">
              {[...CABOS].sort((a,b)=>(b.visitasHoje/b.metaHoje)-(a.visitasHoje/a.metaHoje)).map((c,i)=>{
                const pct = c.visitasHoje/c.metaHoje;
                return (
                  <div key={c.id} className="flex items-center gap-2 text-[11px]">
                    <div className="mz-tnum mz-t-fg-dim w-4 text-right">{i+1}</div>
                    <div style={{ width:8,height:8,borderRadius:"50%",background:c.cor }}/>
                    <div className="flex-1 min-w-0 truncate mz-t-fg-strong font-semibold">{c.nome.split(" ")[0]}</div>
                    <div style={{ width:60 }}><ProgressBar value={pct*100} color={pct>=0.8?"var(--mz-ok,#34d399)":pct>=0.5?"var(--mz-warn,#fbbf24)":"var(--mz-danger,#f87171)"}/></div>
                    <div className="mz-tnum mz-t-fg-muted w-8 text-right text-[10px]">{Math.round(pct*100)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agenda hoje */}
          <div className="p-4">
            <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-2">Agenda · hoje</div>
            <div className="space-y-1.5 text-[11.5px]">
              {[
                { h:"08:00", t:"Briefing equipe · ponto de encontro" },
                { h:"09:30", t:"Rita · Rua São Domingos" },
                { h:"14:00", t:"Marcos · Av. Getúlio Vargas" },
                { h:"17:00", t:"Check-in diário · chat furtivo" },
              ].map((it,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <Clock size={11} style={{ color:"var(--mz-fg-dim)", flexShrink:0 }}/>
                  <span className="mz-tnum mz-t-fg-dim text-[10.5px] w-10 flex-shrink-0">{it.h}</span>
                  <span className="mz-t-fg-strong truncate">{it.t}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function MapaDoCaboPage() {
  return (
    <MazzelLayout activeModule="campanha" breadcrumbs={["Mazzel","Campanha 2026","Mapa do Cabo"]}>
      <MapaCaboContent />
    </MazzelLayout>
  );
}
