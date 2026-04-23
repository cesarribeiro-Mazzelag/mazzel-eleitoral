"use client";

import { useState } from "react";
import { Search, UserPlus, CheckCircle, Info } from "lucide-react";
import { usePessoas, usePapeis } from "@/hooks/useCampanha";

function Avatar({ nome, size = 30 }) {
  const colors = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899"];
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",background:colors[nome.charCodeAt(0)%colors.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.38,fontWeight:700,color:"#fff",flexShrink:0 }}>
      {nome.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}
    </div>
  );
}

function TierPill({ tier }) {
  const styles = {
    ouro:   { background:"rgba(234,179,8,0.12)", color:"#a16207",  border:"1px solid rgba(234,179,8,0.3)" },
    prata:  { background:"rgba(148,163,184,0.12)", color:"#64748b", border:"1px solid rgba(148,163,184,0.3)" },
    bronze: { background:"rgba(180,83,9,0.12)", color:"#b45309",   border:"1px solid rgba(180,83,9,0.3)" },
  };
  const style = styles[tier] || styles.bronze;
  return (
    <span style={{ ...style, display:"inline-flex",alignItems:"center",padding:"0 8px",height:18,borderRadius:999,fontSize:9.5,fontWeight:700,letterSpacing:"0.04em" }}>
      {(tier || "—").toUpperCase()}
    </span>
  );
}

function PapelPill({ papel }) {
  const labels = {
    delegado: "Delegado",
    coord_regional: "Coord. Regional",
    coord_territorial: "Coord. Territorial",
    cabo: "Cabo Eleitoral",
    lideranca: "Liderança",
    apoiador: "Apoiador",
    candidato: "Candidato",
  };
  return <span>{labels[papel] ?? papel}</span>;
}

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>
      <Info size={8} />dados de demonstração
    </span>
  );
}

const CAMPOS_FORM = [
  { label:"Nome completo",      ph:"Ex: Rita Lima" },
  { label:"Papel",              ph:"Cabo Eleitoral" },
  { label:"Telefone / WhatsApp",ph:"(75) 9 ..." },
  { label:"Cidade",             ph:"Feira de Santana" },
  { label:"Cerca",              ph:"Tomba" },
];

// Normaliza PessoaBase + PapelCampanha para o formato de exibição
function normalizePessoa(pessoa, papeis = []) {
  const papel = papeis.find(p => p.pessoa_id === pessoa.id);
  return {
    id: pessoa.id,
    nome: pessoa.nome_completo || pessoa.nome_politico || "—",
    papel: papel?.papel ?? "—",
    cidade: pessoa.endereco_json?.cidade ?? "—",
    cerca: "—", // sem endpoint de cerca por pessoa ainda
    tier: "prata", // sem tier na API ainda
    score: 70, // sem score na API ainda
    eleitoresInfluenciados: 0,
    tags: [],
    telefone: pessoa.telefone ?? "",
    status: pessoa.status,
    ultimoContato: "—",
  };
}

export default function CampanhaLiderancas() {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [editing, setEditing] = useState(null);

  // Hook API real
  const { pessoas: apiPessoas, isLoading, isMock: pessoasMock } = usePessoas();

  const usandoMock = pessoasMock || apiPessoas.length === 0;

  const liderancasDisplay = usandoMock
    ? []
    : apiPessoas.filter(p => p.status === "ativo").map(p => normalizePessoa(p));

  const filtered = liderancasDisplay.filter(l => {
    if (filtro === "ouro" && l.tier !== "ouro") return false;
    if (filtro === "mulher" && !l.tags?.includes("Mulher")) return false;
    if (q && !((l.nome || "").toLowerCase().includes(q.toLowerCase()) || (l.cidade || "").toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="p-6" style={{ maxWidth:1680, margin:"0 auto" }}>
      <div className="grid gap-4" style={{ gridTemplateColumns:"1fr 400px" }}>
        {/* Lista */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-[22px] font-black mz-t-fg-strong">Lideranças</h1>
              <div className="text-[12px] mz-t-fg-muted mt-0.5 flex items-center gap-2">
                {isLoading ? "Carregando..." : `${filtered.length} de ${liderancasDisplay.length} · cadastros, tiers, cercas`}
                {usandoMock && <MockBadge />}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-2 px-3 h-[34px] rounded-md" style={{ background:"var(--mz-rule)", width:260 }}>
                <Search size={12} style={{ color:"var(--mz-fg-dim)", flexShrink:0 }}/>
                <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nome ou cidade…"
                  className="flex-1 bg-transparent outline-none text-[12px]" style={{ color:"var(--mz-fg)" }}/>
              </div>
              <div className="flex gap-1">
                {[["todos","Todos"],["ouro","Ouro"],["mulher","Mulheres"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setFiltro(k)}
                    className="px-3 h-[34px] rounded-md text-[11.5px] font-semibold"
                    style={{ background: filtro===k ? "var(--mz-tenant-primary,#002A7B)" : "var(--mz-rule)", color: filtro===k ? "#fff" : "var(--mz-fg-muted)" }}>
                    {l}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-1.5 px-4 h-[34px] rounded-lg text-[11.5px] font-bold text-white" style={{ background:"var(--mz-tenant-primary,#002A7B)" }}>
                <UserPlus size={12}/>Cadastrar
              </button>
            </div>
          </div>

          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
            <div className="grid px-5 py-2.5 text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold border-b"
              style={{ gridTemplateColumns:"1fr 140px 140px 80px 110px 70px", gap:"12px", borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
              <div>Nome</div><div>Papel</div><div>Cerca</div><div>Tier</div><div className="text-right">Influência</div><div className="text-right">Score</div>
            </div>
            {isLoading ? (
              <div className="px-5 py-8 text-[12px] mz-t-fg-dim text-center">Carregando lideranças...</div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="text-[13px] font-semibold mz-t-fg-muted">Sem lideranças cadastradas</div>
                <div className="text-[11px] mz-t-fg-dim mt-1">Use o formulário ao lado para cadastrar a primeira liderança.</div>
              </div>
            ) : filtered.map(l => (
              <div key={l.id} className="grid items-center px-5 py-3 border-b last:border-0 cursor-pointer"
                style={{ gridTemplateColumns:"1fr 140px 140px 80px 110px 70px", gap:"12px", borderColor:"var(--mz-rule)" }}
                onClick={()=>setEditing(l)}>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar nome={l.nome} size={30}/>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold mz-t-fg-strong truncate">{l.nome}</div>
                    <div className="text-[10.5px] mz-t-fg-dim truncate">{l.cidade} · {(l.tags || []).join(" · ") || "—"}</div>
                  </div>
                </div>
                <div className="text-[11.5px] mz-t-fg-muted truncate"><PapelPill papel={l.papel}/></div>
                <div className="text-[11.5px] mz-t-fg-muted truncate">{l.cerca || "—"}</div>
                <div><TierPill tier={l.tier}/></div>
                <div className="text-[11.5px] mz-tnum mz-t-fg text-right">{(l.eleitoresInfluenciados || 0).toLocaleString("pt-BR")}</div>
                <div className="text-[13px] font-bold mz-tnum text-right" style={{ color: l.score>=80?"var(--mz-ok,#34d399)":l.score>=60?"var(--mz-warn,#fbbf24)":"var(--mz-danger,#f87171)" }}>{l.score}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulário lateral */}
        <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
            <div>
              <div className="text-[13px] font-bold mz-t-fg-strong">{editing ? "Editar liderança" : "Cadastrar liderança"}</div>
              <div className="text-[10.5px] mz-t-fg-dim">{editing ? editing.nome : "Formulário rápido"}</div>
            </div>
            {editing && (
              <button onClick={()=>setEditing(null)} style={{ padding:"5px 7px", background:"var(--mz-rule)", borderRadius:6, fontSize:10, fontWeight:600 }}>✕</button>
            )}
          </div>
          <div className="p-5 space-y-3">
            {CAMPOS_FORM.map((f,i) => (
              <div key={i}>
                <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-1.5">{f.label}</div>
                <input defaultValue={editing?[editing.nome,editing.papel,editing.telefone,editing.cidade,editing.cerca||""][i]||"":""} placeholder={f.ph}
                  className="w-full h-[34px] px-3 rounded-md outline-none text-[12.5px]" style={{ background:"var(--mz-rule)", color:"var(--mz-fg)", border:"1px solid var(--mz-rule-strong,rgba(0,0,0,0.1))" }}/>
              </div>
            ))}
            <div>
              <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-1.5">Tier</div>
              <div className="flex gap-1.5">
                {["ouro","prata","bronze"].map(t=>(
                  <button key={t} className="flex-1 py-2 rounded-md text-[11px] font-bold"
                    style={{ background: editing?.tier===t ? "var(--mz-rule-strong,rgba(0,0,0,0.1))" : "var(--mz-rule)", color:"var(--mz-fg)" }}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-1.5">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {["Mulher","Jovem","Idoso","Religioso","Comunidade","Destaque","Atenção"].map(t => {
                  const on = editing?.tags?.includes(t);
                  return (
                    <span key={t} className="inline-flex px-2 h-5 items-center rounded-full text-[10px] font-bold cursor-pointer"
                      style={{ background: on ? "rgba(0,42,123,0.12)" : "var(--mz-rule)", color: on ? "var(--mz-tenant-primary,#002A7B)" : "var(--mz-fg-muted)" }}>
                      {t}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button className="flex items-center gap-1.5 justify-center flex-1 py-2.5 rounded-lg text-[12px] font-bold text-white" style={{ background:"var(--mz-tenant-primary,#002A7B)" }}>
                <CheckCircle size={12}/>Salvar
              </button>
              <button className="px-4 py-2.5 rounded-lg text-[12px] font-semibold mz-t-fg-muted" style={{ background:"var(--mz-rule)" }}>Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
