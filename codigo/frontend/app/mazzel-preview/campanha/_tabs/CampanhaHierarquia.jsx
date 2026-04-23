"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Flag, MapPin, Home, Download, Plus, MessageCircle, MoreHorizontal, AlertTriangle, Info } from "lucide-react";
import { useCampanhas, useCercas, usePapeis } from "@/hooks/useCampanha";

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>
      <Info size={8} />dados de demonstração
    </span>
  );
}

// Constrói árvore de papéis a partir de lista plana (por superior_id)
function buildPapeisTrees(papeis) {
  const map = {};
  papeis.forEach(p => { map[p.id] = { ...p, filhos: [] }; });
  const roots = [];
  papeis.forEach(p => {
    if (p.superior_id && map[p.superior_id]) {
      map[p.superior_id].filhos.push(map[p.id]);
    } else {
      roots.push(map[p.id]);
    }
  });
  return roots;
}

function papelLabel(papel) {
  const labels = {
    delegado: "Delegado", coord_regional: "Coord. Regional",
    coord_territorial: "Coord. Territorial", cabo: "Cabo",
    lideranca: "Liderança", apoiador: "Apoiador", candidato: "Candidato",
  };
  return labels[papel] ?? papel;
}

function Avatar({ nome, size = 24 }) {
  const colors = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899"];
  const color = colors[nome.replace("—","X").charCodeAt(0) % colors.length];
  const initials = nome === "—" ? "?" : nome.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase();
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.4,fontWeight:700,color:"#fff",flexShrink:0 }}>
      {initials}
    </div>
  );
}

function ProgressBar({ value, color = "var(--mz-ok,#34d399)" }) {
  return (
    <div style={{ height:4,background:"var(--mz-rule)",borderRadius:2,overflow:"hidden" }}>
      <div style={{ width:`${Math.min(100,Math.max(0,value))}%`,height:"100%",background:color,borderRadius:2 }}/>
    </div>
  );
}

function StatusDot({ status }) {
  const color = {
    ativo:"#10b981", destaque:"#3b82f6", atencao:"#f59e0b", vaga:"#ef4444", critico:"#dc2626"
  }[status] || "#a1a1aa";
  return <div style={{ width:8,height:8,borderRadius:"50%",background:color,flexShrink:0 }}/>;
}

const NIVEL_ICON = { regional: Flag, municipio: MapPin, bairro: Home };

function TreeRow({ node, depth = 0, expanded, onToggle }) {
  const hasChildren = node.filhas && node.filhas.length > 0;
  const isOpen = expanded[node.id];
  const Icon = NIVEL_ICON[node.nivel] || MapPin;
  const metaPct = Math.round((node.cadastrados / node.meta) * 100);
  const metaColor = metaPct > 70 ? "var(--mz-ok,#34d399)" : metaPct > 40 ? "var(--mz-warn,#fbbf24)" : "var(--mz-danger,#f87171)";

  return (
    <>
      <div className="grid items-center border-b last:border-0 px-4 py-3"
        style={{ gridTemplateColumns:`${depth*20+28}px 10px 1fr 160px 140px 70px 110px 70px`, gap:"10px", borderColor:"var(--mz-rule)" }}>
        <div onClick={()=>hasChildren&&onToggle(node.id)} style={{ cursor:hasChildren?"pointer":"default", display:"flex", alignItems:"center" }}>
          {hasChildren && (isOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>)}
        </div>
        <StatusDot status={node.status}/>
        <div className="min-w-0 flex items-center gap-2">
          <Icon size={12} style={{ color:"var(--mz-fg-dim)", flexShrink:0 }}/>
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold mz-t-fg-strong truncate">{node.nome}</div>
            <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider">{node.nivel}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          {node.responsavelId
            ? <Avatar nome={node.responsavel} size={22}/>
            : <div style={{ width:22,height:22,borderRadius:"50%",background:"rgba(220,38,38,0.1)",display:"flex",alignItems:"center",justifyContent:"center" }}><AlertTriangle size={10} style={{color:"var(--mz-danger,#f87171)"}}/></div>
          }
          <div className="text-[11.5px] mz-t-fg truncate">{node.responsavel}</div>
        </div>
        <div>
          <ProgressBar value={metaPct} color={metaColor}/>
          <div className="text-[10px] mz-tnum mz-t-fg-dim mt-0.5">
            {node.cadastrados.toLocaleString("pt-BR")} / {node.meta.toLocaleString("pt-BR")}
          </div>
        </div>
        <div className="text-[13px] font-bold mz-tnum" style={{ color: node.score>=70?"var(--mz-ok,#34d399)":node.score>=50?"var(--mz-warn,#fbbf24)":"var(--mz-danger,#f87171)" }}>
          {node.score}
        </div>
        <div className="text-[11px] mz-tnum mz-t-fg-muted">{node.engajamento}%</div>
        <div className="flex gap-1 justify-end">
          <button style={{ padding:"4px 6px", background:"var(--mz-rule)", borderRadius:6 }}><MessageCircle size={10}/></button>
          <button style={{ padding:"4px 6px", background:"var(--mz-rule)", borderRadius:6 }}><MoreHorizontal size={10}/></button>
        </div>
      </div>
      {hasChildren && isOpen && node.filhas.map(c => (
        <TreeRow key={c.id} node={c} depth={depth+1} expanded={expanded} onToggle={onToggle}/>
      ))}
    </>
  );
}

// Componente de nó de papel (árvore de papéis)
function PapelRow({ node, depth = 0, expanded, onToggle }) {
  const hasChildren = node.filhos && node.filhos.length > 0;
  const isOpen = expanded[node.id];
  return (
    <>
      <div className="grid items-center border-b last:border-0 px-4 py-3"
        style={{ gridTemplateColumns:`${depth*20+28}px 1fr 180px 120px`, gap:"10px", borderColor:"var(--mz-rule)" }}>
        <div onClick={()=>hasChildren&&onToggle(node.id)} style={{ cursor:hasChildren?"pointer":"default", display:"flex", alignItems:"center" }}>
          {hasChildren && (isOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>)}
        </div>
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold mz-t-fg-strong truncate">{node.pessoa_id ?? node.id}</div>
          <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider">{papelLabel(node.papel)}</div>
        </div>
        <div className="text-[11px] mz-t-fg-muted">{node.status}</div>
        <div className="text-[10.5px] mz-t-fg-dim">
          {node.filhos?.length ?? 0} subordinado(s)
        </div>
      </div>
      {hasChildren && isOpen && node.filhos.map(c => (
        <PapelRow key={c.id} node={c} depth={depth+1} expanded={expanded} onToggle={onToggle}/>
      ))}
    </>
  );
}

export default function CampanhaHierarquia() {
  const [expanded, setExpanded] = useState({ "reg-reconcavo": true, "mun-feira": true });
  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  // API real: busca campanha ativa, papéis e cercas
  const { campanhas } = useCampanhas();
  const campanhaAtiva = campanhas[0];
  const { papeis: apiPapeis, isLoading: papeisLoading, isMock: papeisMock } = usePapeis(campanhaAtiva?.id);
  const papeisTree = apiPapeis.length > 0 ? buildPapeisTrees(apiPapeis) : [];
  const usandoMockHierarquia = papeisMock || apiPapeis.length === 0;

  // Cercas da API real
  const { cercas: apiCercas, isLoading: cercasLoading, isMock: cercasMock } = useCercas(campanhaAtiva?.id);
  const usandoMockCercas = cercasMock || apiCercas.length === 0;

  return (
    <div className="p-6 space-y-4" style={{ maxWidth:1680, margin:"0 auto" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black mz-t-fg-strong">Hierarquia da campanha</h1>
          <div className="text-[12px] mz-t-fg-muted mt-0.5 flex items-center gap-2">
            Delegado → Regionais → Territoriais → Bairros · cobertura em tempo real
            {usandoMockCercas && <MockBadge />}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11.5px] font-semibold mz-t-fg-muted" style={{ background:"var(--mz-rule)" }}>
            <Download size={11}/>Export
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11.5px] font-bold text-white" style={{ background:"var(--mz-tenant-primary,#002A7B)" }}>
            <Plus size={11}/>Nova cerca
          </button>
        </div>
      </div>

      {/* Árvore de Papéis (API real) */}
      {!usandoMockHierarquia && papeisTree.length > 0 && (
        <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
            <div className="text-[13px] font-bold mz-t-fg-strong">Papéis da campanha (API real)</div>
            <div className="text-[10.5px] mz-t-fg-dim">{apiPapeis.length} papéis ativos</div>
          </div>
          <div className="grid px-4 py-2.5 text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold border-b"
            style={{ gridTemplateColumns:"28px 1fr 180px 120px", gap:"10px", borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
            <div/><div>Pessoa ID · Papel</div><div>Status</div><div>Subordinados</div>
          </div>
          {papeisTree.map(n => (
            <PapelRow key={n.id} node={n} depth={0} expanded={expanded} onToggle={toggle}/>
          ))}
        </div>
      )}

      {/* Tabela de Cercas (mock) */}
      <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
          <div className="text-[13px] font-bold mz-t-fg-strong">Cercas virtuais</div>
          {usandoMockCercas && <MockBadge />}
        </div>
        <div className="grid px-4 py-2.5 text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold border-b"
          style={{ gridTemplateColumns:"48px 10px 1fr 160px 140px 70px 110px 70px", gap:"10px", borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
          <div/><div/><div>Cerca</div><div>Responsável</div><div>Cadastro</div><div>Score</div><div>Engaj.</div><div className="text-right">Ações</div>
        </div>
        {cercasLoading ? (
          <div className="px-4 py-8 text-[12px] mz-t-fg-dim text-center">Carregando cercas...</div>
        ) : apiCercas.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="text-[13px] font-semibold mz-t-fg-muted">Sem cercas cadastradas</div>
            <div className="text-[11px] mz-t-fg-dim mt-1">Clique em "Nova cerca" para criar a primeira.</div>
          </div>
        ) : apiCercas.map(n => {
          // Adapta CercaVirtual para o formato esperado por TreeRow
          const node = {
            id: n.id,
            nome: n.nome,
            nivel: n.tipo_criacao === "bairro" ? "bairro" : n.tipo_criacao === "municipio" ? "municipio" : "regional",
            status: n.ativa ? "ativo" : "vaga",
            responsavel: "—",
            responsavelId: null,
            cadastrados: 0,
            meta: 100,
            score: 0,
            engajamento: 0,
            filhas: [],
          };
          return <TreeRow key={node.id} node={node} depth={0} expanded={expanded} onToggle={toggle}/>;
        })}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:"Total cercas",  value: apiCercas.length > 0 ? String(apiCercas.length) : "—",   sub: apiCercas.length > 0 ? `${apiCercas.filter(c => c.ativa).length} ativas` : "sem dados",   color:"var(--mz-ok,#34d399)" },
          { label:"Ativas",        value: apiCercas.length > 0 ? String(apiCercas.filter(c => c.ativa).length) : "—",  sub:"cercas ativas",   color:"var(--mz-ok,#34d399)" },
          { label:"Inativas",      value: apiCercas.length > 0 ? String(apiCercas.filter(c => !c.ativa).length) : "—", sub:"aguardando",  color:"var(--mz-warn,#fbbf24)" },
          { label:"Papéis",        value: apiPapeis.length > 0 ? String(apiPapeis.length) : "—", sub:"hierarquia cadastrada", color:"var(--mz-ok,#34d399)" },
        ].map(k => (
          <div key={k.label} className="mz-kpi-card mz-ring-soft">
            <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.12em] font-semibold">{k.label}</div>
            <div className="text-[28px] font-black mz-tnum mt-1" style={{ color:k.color }}>{k.value}</div>
            <div className="text-[10.5px] mz-t-fg-dim mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
