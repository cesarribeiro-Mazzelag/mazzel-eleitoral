"use client";

import { useState } from "react";
import { AlertTriangle, Target, RotateCcw, CheckCircle, Clock, MapPin, Plus, Sparkles, Info } from "lucide-react";
import { MISSOES, LIDERANCAS } from "@/components/mazzel-data/campanha";
import { useAniversariantes } from "@/hooks/useCampanha";

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>
      <Info size={8} />dados de demonstração
    </span>
  );
}

function Avatar({ nome, size = 24 }) {
  const colors = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6"];
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",background:colors[nome.charCodeAt(0)%colors.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.38,fontWeight:700,color:"#fff",flexShrink:0 }}>
      {nome.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}
    </div>
  );
}

const TIPO_ICON = { ALERTA: AlertTriangle, META: Target, MISSAO: MapPin, FOLLOWUP: RotateCcw };
const TIPO_COLOR = { ALERTA:"var(--mz-danger,#f87171)", META:"var(--mz-ok,#34d399)", MISSAO:"var(--mz-tenant-primary,#002A7B)", FOLLOWUP:"var(--mz-warn,#fbbf24)" };
const STATUS_LABEL = { aberto:"Aberto", em_andamento:"Em andamento", planejado:"Planejado", concluido:"Concluído" };
const STATUS_COLOR = { aberto:"rgba(220,38,38,0.1)", em_andamento:"rgba(37,99,235,0.1)", planejado:"rgba(82,82,91,0.08)", concluido:"rgba(5,150,105,0.1)" };
const STATUS_TEXT  = { aberto:"var(--mz-danger,#f87171)", em_andamento:"#1d4ed8", planejado:"var(--mz-fg-dim)", concluido:"var(--mz-ok,#34d399)" };

function ProgressBarSmall({ value, color }) {
  return (
    <div style={{ height:4,background:"var(--mz-rule)",borderRadius:2,overflow:"hidden",marginTop:4 }}>
      <div style={{ width:`${Math.min(100,Math.max(0,value))}%`,height:"100%",background:color,borderRadius:2 }}/>
    </div>
  );
}

export default function CampanhaComando() {
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [selected, setSelected] = useState(null);

  // API real: aniversariantes da semana
  const { aniversariantes, isMock: anivMock } = useAniversariantes("semana");

  // Missões: sem endpoint ainda — usa mock
  const filtered = MISSOES.filter(m =>
    filtroTipo === "todos" || m.tipo.toLowerCase() === filtroTipo
  );

  const counts = {
    aberto: MISSOES.filter(m=>m.status==="aberto").length,
    em_andamento: MISSOES.filter(m=>m.status==="em_andamento").length,
    planejado: MISSOES.filter(m=>m.status==="planejado").length,
  };

  return (
    <div className="p-6 space-y-5" style={{ maxWidth:1680, margin:"0 auto" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black mz-t-fg-strong">Comando de Campo</h1>
          <div className="text-[12px] mz-t-fg-muted mt-0.5 flex items-center gap-2">Missões, alertas, validações, follow-ups · {MISSOES.length} itens <MockBadge /></div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11.5px] font-semibold mz-t-fg-muted" style={{ background:"var(--mz-rule)" }}>
            <Sparkles size={11}/>Copiloto
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11.5px] font-bold text-white" style={{ background:"var(--mz-tenant-primary,#002A7B)" }}>
            <Plus size={11}/>Nova missão
          </button>
        </div>
      </div>

      {/* KPIs status */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:"Abertos",      v:counts.aberto,       color:"var(--mz-danger,#f87171)" },
          { label:"Em andamento", v:counts.em_andamento, color:"#1d4ed8" },
          { label:"Planejados",   v:counts.planejado,    color:"var(--mz-fg-dim)" },
        ].map(k=>(
          <div key={k.label} className="mz-kpi-card mz-ring-soft">
            <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.12em] font-semibold">{k.label}</div>
            <div className="text-[28px] font-black mz-tnum mt-1" style={{ color:k.color }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Filtros tipo */}
      <div className="flex gap-2 flex-wrap">
        {[["todos","Todos"],["alerta","Alertas"],["meta","Metas"],["missao","Missões"],["followup","Follow-ups"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFiltroTipo(k)}
            className="px-3 py-2 rounded-lg text-[11.5px] font-semibold"
            style={{ background:filtroTipo===k?"var(--mz-tenant-primary,#002A7B)":"var(--mz-rule)", color:filtroTipo===k?"#fff":"var(--mz-fg-muted)" }}>
            {l}
          </button>
        ))}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns:"1fr 360px" }}>
        {/* Lista missões */}
        <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
          {filtered.map((m,i) => {
            const Icon = TIPO_ICON[m.tipo] || Target;
            const isSelected = selected?.id === m.id;
            return (
              <div key={m.id} className="px-5 py-4 border-b last:border-0 cursor-pointer"
                style={{ borderColor:"var(--mz-rule)", background: isSelected ? "var(--mz-bg-card-2,rgba(0,0,0,0.02))" : "transparent" }}
                onClick={()=>setSelected(isSelected?null:m)}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${TIPO_COLOR[m.tipo]}22`, color: TIPO_COLOR[m.tipo] }}>
                    <Icon size={14}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-bold px-2 h-4 flex items-center rounded-full"
                        style={{ background:`${TIPO_COLOR[m.tipo]}15`, color:TIPO_COLOR[m.tipo] }}>{m.tipo}</span>
                      <span className="text-[10px] font-bold px-2 h-4 flex items-center rounded-full"
                        style={{ background:STATUS_COLOR[m.status], color:STATUS_TEXT[m.status] }}>{STATUS_LABEL[m.status]}</span>
                      <span className="text-[10px] mz-t-fg-dim">· {m.cerca}</span>
                      <span className="text-[10px] mz-t-fg-dim ml-auto">prazo: {m.prazo}</span>
                    </div>
                    <div className="text-[12.5px] font-bold mz-t-fg-strong">{m.titulo}</div>
                    <div className="text-[11px] mz-t-fg-muted mt-0.5">{m.descricao}</div>
                    {m.cadastros !== null && (
                      <div className="mt-2">
                        <ProgressBarSmall
                          value={m.cadastros}
                          color={TIPO_COLOR[m.tipo]}
                        />
                        <div className="text-[10px] mz-tnum mz-t-fg-dim mt-0.5">{m.cadastros?.toLocaleString("pt-BR")} cadastros</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Painel detalhe / Copiloto */}
        <div className="space-y-4">
          {selected ? (
            <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
              <div className="px-4 py-3.5 border-b" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
                <div className="text-[13px] font-bold mz-t-fg-strong">{selected.titulo}</div>
                <div className="text-[10.5px] mz-t-fg-dim mt-0.5">{selected.cerca} · prazo: {selected.prazo}</div>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-[12px] mz-t-fg">{selected.descricao}</div>
                <div>
                  <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-1.5">Responsável</div>
                  <div className="flex items-center gap-2">
                    <Avatar nome={selected.responsavel || "X"} size={26}/>
                    <span className="text-[12px] font-semibold mz-t-fg-strong">{selected.responsavel || "—"}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-1.5">Status</div>
                  <div className="flex gap-1.5">
                    {["aberto","em_andamento","concluido"].map(s=>(
                      <button key={s} className="flex-1 py-2 rounded-md text-[10.5px] font-bold"
                        style={{ background: selected.status===s ? STATUS_COLOR[s] : "var(--mz-rule)", color: selected.status===s ? STATUS_TEXT[s] : "var(--mz-fg-muted)" }}>
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button className="flex-1 py-2.5 rounded-lg text-[11.5px] font-bold text-white" style={{ background:"var(--mz-tenant-primary,#002A7B)" }}>Atualizar</button>
                  <button className="px-3 py-2.5 rounded-lg text-[11.5px] font-semibold mz-t-fg-muted" style={{ background:"var(--mz-rule)" }}>Fechar</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mz-ring-soft rounded-xl p-4" style={{ background:"var(--mz-bg-card)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} style={{ color:"#9333ea" }}/>
                <div className="text-[13px] font-bold mz-t-fg-strong">Copiloto · prioridades de hoje</div>
              </div>
              <div className="space-y-3 text-[11.5px]">
                <div className="p-3 rounded-lg" style={{ background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)" }}>
                  <div className="font-bold" style={{ color:"var(--mz-danger,#f87171)" }}>🚨 Maragogipe ainda sem responsável</div>
                  <div className="mz-t-fg-muted mt-0.5">Risco de perder 3.600 eleitores. Acionar Renato Bastos agora?</div>
                </div>
                <div className="p-3 rounded-lg" style={{ background:"rgba(217,119,6,0.06)", border:"1px solid rgba(217,119,6,0.15)" }}>
                  <div className="font-bold" style={{ color:"var(--mz-warn,#fbbf24)" }}>⚠ José Roberto inativo há 12 dias</div>
                  <div className="mz-t-fg-muted mt-0.5">Parque Ipê em risco. Considere substituição temporária.</div>
                </div>
                <div className="p-3 rounded-lg" style={{ background:"rgba(5,150,105,0.06)", border:"1px solid rgba(5,150,105,0.15)" }}>
                  <div className="font-bold" style={{ color:"var(--mz-ok,#34d399)" }}>✓ Caravana Recôncavo confirmada</div>
                  <div className="mz-t-fg-muted mt-0.5">12 regionais confirmaram presença para 22/abr.</div>
                </div>
              </div>
            </div>
          )}

          {/* Agenda rápida */}
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
              <div className="text-[12.5px] font-bold mz-t-fg-strong">Agenda · hoje</div>
            </div>
            <div className="p-4 space-y-2">
              {[
                { h:"10:30", t:"Ligar para Diego Almeida",    ctx:"queda de score em Feira de Santana" },
                { h:"14:00", t:"Visita Cachoeira · Paula N.", ctx:"reforço de cadastros" },
                { h:"16:30", t:"Retornar Marcos Oliveira",    ctx:"engajamento Brasília caindo" },
                { h:"18:00", t:"Briefing sigiloso · Regionais",ctx:"pauta: cobertura Sul" },
              ].map((it,i)=>(
                <div key={i} className="flex items-start gap-3 pb-2 border-b last:border-0" style={{ borderColor:"var(--mz-rule)" }}>
                  <div className="text-[11px] mz-tnum font-mono mz-t-fg-dim w-10 flex-shrink-0 mt-0.5">{it.h}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold mz-t-fg-strong">{it.t}</div>
                    <div className="text-[10.5px] mz-t-fg-muted">{it.ctx}</div>
                  </div>
                  <input type="checkbox" style={{ marginTop:2, accentColor:"var(--mz-tenant-primary,#002A7B)" }}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
