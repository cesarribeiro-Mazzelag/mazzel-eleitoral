"use client";

import { useState } from "react";
import { Download, Trophy, Star, Zap, Heart, Target, Info } from "lucide-react";
import { useCampanhas, useCercas, useAgregacaoCerca } from "@/hooks/useCampanha";

function Avatar({ nome, size = 28 }) {
  const colors = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899"];
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",background:colors[nome.charCodeAt(0)%colors.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.38,fontWeight:700,color:"#fff",flexShrink:0 }}>
      {nome.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}
    </div>
  );
}

function TierPos({ pos }) {
  const styles = {
    1: { background:"linear-gradient(135deg,#fcd34d,#f59e0b)", color:"#78350f" },
    2: { background:"linear-gradient(135deg,#e2e8f0,#94a3b8)", color:"#1e293b" },
    3: { background:"linear-gradient(135deg,#fdba74,#f97316)", color:"#431407" },
  };
  const s = styles[pos];
  return s ? (
    <div className="w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px]" style={s}>{pos}</div>
  ) : (
    <span className="text-[12px] font-bold mz-tnum mz-t-fg-muted w-6 text-center">{pos}</span>
  );
}

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>
      <Info size={8} />dados de demonstração
    </span>
  );
}

function ClassifBadge({ classificacao }) {
  const styles = {
    ouro:   { bg: "rgba(234,179,8,0.12)", color: "#a16207" },
    prata:  { bg: "rgba(148,163,184,0.12)", color: "#64748b" },
    bronze: { bg: "rgba(180,83,9,0.12)", color: "#b45309" },
    critico: { bg: "rgba(220,38,38,0.1)", color: "#dc2626" },
  };
  const s = styles[classificacao] || styles.bronze;
  return (
    <span style={{ background: s.bg, color: s.color, display:"inline-flex", alignItems:"center", padding:"0 8px", height:18, borderRadius:999, fontSize:9.5, fontWeight:700 }}>
      {(classificacao || "—").toUpperCase()}
    </span>
  );
}

// Componente separado que busca agregação de uma cerca
function CercaRankingRow({ cerca, pos }) {
  const { agregacao, isLoading } = useAgregacaoCerca(cerca.id);
  const score = agregacao?.score_engajamento ?? 0;
  const cobertura = agregacao?.cobertura_pct ?? 0;
  const cadastros = agregacao?.total_cadastros ?? 0;
  const classif = agregacao?.classificacao ?? null;
  const tendencia = agregacao?.tendencia ?? null;

  return (
    <div className="grid items-center px-5 py-3 border-b last:border-0"
      style={{ gridTemplateColumns:"40px 1fr 120px 100px 80px 70px", gap:"10px", borderColor:"var(--mz-rule)" }}>
      <div className="flex justify-center"><TierPos pos={pos}/></div>
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold mz-t-fg-strong truncate">{cerca.nome}</div>
        <div className="text-[10.5px] mz-t-fg-dim truncate">
          {cerca.tipo_criacao} · {cerca.raio_metros ? `${(cerca.raio_metros/1000).toFixed(0)}km` : "—"}
        </div>
      </div>
      <div>{isLoading ? <span className="text-[10px] mz-t-fg-dim">...</span> : <ClassifBadge classificacao={classif}/>}</div>
      <div className="text-right text-[12px] font-bold mz-tnum mz-t-fg">{isLoading ? "—" : (cadastros || 0).toLocaleString("pt-BR")}</div>
      <div className="text-right text-[11px] font-bold mz-tnum" style={{ color: tendencia==="crescendo"?"var(--mz-ok,#34d399)":tendencia==="caindo"?"var(--mz-danger,#f87171)":"var(--mz-fg-dim)" }}>
        {tendencia === "crescendo" ? "↑" : tendencia === "caindo" ? "↓" : "—"}
      </div>
      <div className="text-right text-[13px] font-bold mz-tnum" style={{ color: score>=80?"var(--mz-ok,#34d399)":score>=60?"var(--mz-warn,#fbbf24)":"var(--mz-danger,#f87171)" }}>{isLoading ? "—" : Math.round(score) || 0}</div>
    </div>
  );
}

export default function CampanhaRanking() {
  const [view, setView] = useState("lista");

  // API real: cercas da campanha ativa (sem fallback mock)
  const { campanhas } = useCampanhas();
  const campanhaAtiva = campanhas[0];
  const { cercas: apiCercas, isLoading: cercasLoading } = useCercas(campanhaAtiva?.id);
  const semCercas = apiCercas.length === 0;

  return (
    <div className="p-6 space-y-5" style={{ maxWidth:1680, margin:"0 auto" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black mz-t-fg-strong">Ranking & Heatmap</h1>
          <div className="text-[12px] mz-t-fg-muted mt-0.5 flex items-center gap-2">
            Produtividade individual · engajamento por cerca/dia
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1">
            {[["lista","Ranking"],["heatmap","Heatmap"]].map(([k,l])=>(
              <button key={k} onClick={()=>setView(k)}
                className="px-3 py-2 rounded-lg text-[11.5px] font-semibold"
                style={{ background:view===k?"var(--mz-tenant-primary,#002A7B)":"var(--mz-rule)", color:view===k?"#fff":"var(--mz-fg-muted)" }}>
                {l}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11.5px] font-semibold mz-t-fg-muted" style={{ background:"var(--mz-rule)" }}>
            <Download size={11}/>Exportar
          </button>
        </div>
      </div>

      {view === "lista" && (
        <div className="grid gap-4" style={{ gridTemplateColumns:"1fr 360px" }}>
          {/* Cercas da API */}
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
              <div className="text-[13px] font-bold mz-t-fg-strong">Ranking de cercas</div>
              <div className="text-[10.5px] mz-t-fg-dim">{apiCercas.length} cercas{campanhaAtiva?.nome ? ` · ${campanhaAtiva.nome}` : ""}</div>
            </div>
            <div className="grid px-5 py-2.5 text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold border-b"
              style={{ gridTemplateColumns:"40px 1fr 120px 100px 80px 70px", gap:"10px", borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
              <div className="text-center">#</div><div>Cerca</div><div>Classificação</div><div className="text-right">Cadastros</div><div className="text-right">Tendência</div><div className="text-right">Score</div>
            </div>
            {cercasLoading ? (
              <div className="px-5 py-8 text-[12px] mz-t-fg-dim text-center">Carregando cercas...</div>
            ) : semCercas ? (
              <div className="px-5 py-10 text-center">
                <div className="text-[13px] font-semibold mz-t-fg-muted">Sem cercas ativas</div>
                <div className="text-[11px] mz-t-fg-dim mt-1">Cadastre cercas na aba Hierarquia para ver o ranking.</div>
              </div>
            ) : (
              apiCercas.map((cerca, idx) => (
                <CercaRankingRow key={cerca.id} cerca={cerca} pos={idx + 1} />
              ))
            )}
          </div>

          {/* Sidebar: pódio + gamificação */}
          <div className="space-y-4">
            <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
              <div className="px-4 py-3.5 border-b" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
                <div className="flex items-center gap-2">
                  <Trophy size={14} style={{ color:"#f59e0b" }}/>
                  <div className="text-[13px] font-bold mz-t-fg-strong">Pódio · ouro</div>
                </div>
                <div className="text-[10.5px] mz-t-fg-dim">Top 3 do mês</div>
              </div>
              <div className="p-4 space-y-3">
                {semCercas ? (
                  <div className="text-[11px] mz-t-fg-dim text-center py-4">Sem cercas para o pódio.</div>
                ) : apiCercas.slice(0, 3).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[15px]"
                      style={{ background: ["linear-gradient(135deg,#fcd34d,#f59e0b)","linear-gradient(135deg,#e2e8f0,#94a3b8)","linear-gradient(135deg,#fdba74,#f97316)"][i], color: ["#78350f","#1e293b","#431407"][i] }}>
                      {i+1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-bold mz-t-fg-strong">{c.nome}</div>
                      <div className="text-[10.5px] mz-t-fg-dim">{c.tipo_criacao}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
              <div className="px-4 py-3.5 border-b" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
                <div className="text-[13px] font-bold mz-t-fg-strong">Gamificação</div>
                <div className="text-[10.5px] mz-t-fg-dim">Regras ativas</div>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { Icon:Zap,    t:"+1 pt",   d:"por liderança cadastrada" },
                  { Icon:Star,   t:"+5 pt",   d:"por liderança com tag Destaque" },
                  { Icon:Heart,  t:"+2 pt",   d:"por contato ativo (WhatsApp ≤ 7d)" },
                  { Icon:Target, t:"+20 pt",  d:"por cerca 100% da meta" },
                ].map((r,i)=>(
                  <div key={i} className="flex items-center gap-2.5 py-1 text-[11.5px]">
                    <r.Icon size={13} style={{ color:"var(--mz-fg-dim)" }}/>
                    <span className="font-bold mz-tnum mz-t-fg-strong w-10">{r.t}</span>
                    <span className="mz-t-fg-muted flex-1">{r.d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "heatmap" && (
        <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
          <div className="px-5 py-3.5 border-b" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
            <div className="text-[13px] font-bold mz-t-fg-strong">Engajamento diário por cerca</div>
            <div className="text-[10.5px] mz-t-fg-dim">12 semanas · escuro = mais engajamento</div>
          </div>
          <div className="p-5">
            {semCercas ? (
              <div className="py-10 text-center">
                <div className="text-[13px] font-semibold mz-t-fg-muted">Sem dados de engajamento</div>
                <div className="text-[11px] mz-t-fg-dim mt-1">O heatmap será exibido quando houver cercas ativas com histórico.</div>
              </div>
            ) : (
              <div className="overflow-x-auto" style={{ scrollbarWidth:"thin" }}>
                <div style={{ display:"grid", gridTemplateColumns:"140px repeat(84, 10px)", gap:2, fontSize:9.5, minWidth:"max-content" }}>
                  <div/>
                  {Array.from({length:84},(_,i)=>(
                    <div key={i} className="text-center mz-t-fg-dim" style={{ fontSize:8, visibility:i%7===0?"visible":"hidden" }}>W{Math.floor(i/7)+1}</div>
                  ))}
                  {apiCercas.map(c=>(
                    <>
                      <div key={c.id+"-label"} className="text-[10.5px] mz-t-fg-strong font-semibold truncate py-0.5" style={{ alignSelf:"center" }}>{c.nome}</div>
                      {Array.from({length:84},(_,d)=>(
                        <div key={d} title={`${c.nome} · dia ${d+1}`}
                          style={{ height:14,borderRadius:2,background:"rgba(0,42,123,0.08)" }}/>
                      ))}
                    </>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-4 text-[10.5px] mz-t-fg-dim">
                  <span>Baixo</span>
                  {[0.1,0.25,0.4,0.6,0.85].map(op=>(
                    <span key={op} style={{ width:18,height:12,background:`rgba(0,42,123,${op})`,borderRadius:2,display:"inline-block" }}/>
                  ))}
                  <span>Alto</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
