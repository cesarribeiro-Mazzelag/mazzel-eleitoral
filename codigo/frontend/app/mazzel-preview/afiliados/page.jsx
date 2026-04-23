"use client";

import { useState, useEffect, useRef } from "react";
import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { Search, Download, Plus, AlertTriangle, Clock, Settings, Send, CheckCircle } from "lucide-react";
import {
  useAfiliadosKPIs,
  useFiliados,
  useRepasses,
  useTreinamentos,
  useComunicacoes,
  useDemografia,
  useSaudeBase,
} from "@/hooks/useAfiliados";

// ======================== MOCK DATA (fallback quando API retorna vazio/erro) ========================
const MOCK_KPIS = {
  total: 47382, ativos: 38219, inativos: 9163, suspensos: 210,
  novos_30d: 892, churn_30d: 214,
  diretorios_ativos: 182, diretorios_totais: 204,
};

const MOCK_FILIADOS = [
  { id:"m1", nome_completo:"Carlos Eduardo Silva",      cpf_hash:"***.***.***-12", cidade:"Salvador",     status:"ativo",    data_filiacao:"2019-03", contribuinte_em_dia:true,  treinamentos_concluidos:4, tags:["Liderança","Jovem"] },
  { id:"m2", nome_completo:"Maria das Graças Oliveira", cpf_hash:"***.***.***-34", cidade:"Feira de S.",  status:"ativo",    data_filiacao:"2021-07", contribuinte_em_dia:true,  treinamentos_concluidos:2, tags:["Mulher","Diretoria local"] },
  { id:"m3", nome_completo:"João Pedro Santos",         cpf_hash:"***.***.***-56", cidade:"Ilhéus",       status:"inativo",  data_filiacao:"2016-11", contribuinte_em_dia:false, treinamentos_concluidos:0, tags:[] },
  { id:"m4", nome_completo:"Ana Beatriz Costa",         cpf_hash:"***.***.***-78", cidade:"Vitória da C.",status:"ativo",    data_filiacao:"2023-01", contribuinte_em_dia:true,  treinamentos_concluidos:5, tags:["Jovem","Tech"] },
  { id:"m5", nome_completo:"Roberto Almeida",           cpf_hash:"***.***.***-90", cidade:"Barreiras",    status:"ativo",    data_filiacao:"2018-05", contribuinte_em_dia:false, treinamentos_concluidos:1, tags:["Rural"] },
  { id:"m6", nome_completo:"Fernanda Lima",             cpf_hash:"***.***.***-11", cidade:"Salvador",     status:"suspenso", data_filiacao:"2020-02", contribuinte_em_dia:false, treinamentos_concluidos:0, tags:["Investigação"] },
  { id:"m7", nome_completo:"Pedro Henrique Rocha",      cpf_hash:"***.***.***-22", cidade:"Juazeiro",     status:"ativo",    data_filiacao:"2022-09", contribuinte_em_dia:true,  treinamentos_concluidos:3, tags:["Jovem"] },
  { id:"m8", nome_completo:"Luciana Barbosa",           cpf_hash:"***.***.***-33", cidade:"Porto Seguro", status:"ativo",    data_filiacao:"2017-06", contribuinte_em_dia:true,  treinamentos_concluidos:6, tags:["Mulher","Liderança"] },
  { id:"m9", nome_completo:"Gilberto Mendonça",         cpf_hash:"***.***.***-44", cidade:"Alagoinhas",   status:"ativo",    data_filiacao:"2020-11", contribuinte_em_dia:true,  treinamentos_concluidos:2, tags:["Rural","Jovem"] },
  { id:"m10",nome_completo:"Simone Rodrigues",          cpf_hash:"***.***.***-55", cidade:"Cruz das Almas",status:"ativo",  data_filiacao:"2019-04", contribuinte_em_dia:true,  treinamentos_concluidos:4, tags:["Mulher","Tech"] },
  { id:"m11",nome_completo:"Márcio de Souza",           cpf_hash:"***.***.***-66", cidade:"Salvador",     status:"inativo",  data_filiacao:"2015-08", contribuinte_em_dia:false, treinamentos_concluidos:1, tags:[] },
  { id:"m12",nome_completo:"Raquel Ferreira",           cpf_hash:"***.***.***-77", cidade:"Camaçari",     status:"ativo",    data_filiacao:"2021-03", contribuinte_em_dia:true,  treinamentos_concluidos:3, tags:["Mulher","Diretoria local"] },
  { id:"m13",nome_completo:"Paulo Freitas",             cpf_hash:"***.***.***-88", cidade:"Lauro de Freitas",status:"ativo", data_filiacao:"2022-06", contribuinte_em_dia:false, treinamentos_concluidos:2, tags:["Jovem"] },
  { id:"m14",nome_completo:"Daniela Castro",            cpf_hash:"***.***.***-99", cidade:"Feira de S.",  status:"suspenso", data_filiacao:"2018-01", contribuinte_em_dia:false, treinamentos_concluidos:0, tags:["Investigação"] },
  { id:"m15",nome_completo:"Wilson Teixeira",           cpf_hash:"***.***.***-10", cidade:"Vitória da C.",status:"ativo",    data_filiacao:"2020-09", contribuinte_em_dia:true,  treinamentos_concluidos:5, tags:["Rural","Liderança"] },
];

const MOCK_REPASSES = [
  { id:"r1", mes_ref:"Jan/26", fundo_partidario:1842000, fundo_especial:620000,  doacoes:185400, total:2647400 },
  { id:"r2", mes_ref:"Dez/25", fundo_partidario:1842000, fundo_especial:0,       doacoes:212100, total:2054100 },
  { id:"r3", mes_ref:"Nov/25", fundo_partidario:1842000, fundo_especial:0,       doacoes:148700, total:1990700 },
  { id:"r4", mes_ref:"Out/25", fundo_partidario:1842000, fundo_especial:1240000, doacoes:412800, total:3494800 },
  { id:"r5", mes_ref:"Set/25", fundo_partidario:1842000, fundo_especial:0,       doacoes:198200, total:2040200 },
  { id:"r6", mes_ref:"Ago/25", fundo_partidario:1842000, fundo_especial:0,       doacoes:176500, total:2018500 },
];

const MOCK_TREINAMENTOS = [
  { id:"t1", nome_curso:"Escola de Líderes · Módulo I",    inscritos:312, concluintes:287, nps:87, data_proxima:"15/Abr" },
  { id:"t2", nome_curso:"Marketing Político Digital",      inscritos:208, concluintes:174, nps:82, data_proxima:"22/Abr" },
  { id:"t3", nome_curso:"Oratória para Candidatos",        inscritos:156, concluintes:142, nps:91, data_proxima:"03/Mai" },
  { id:"t4", nome_curso:"Legislação Eleitoral 2026",       inscritos:429, concluintes:381, nps:78, data_proxima:"10/Mai" },
  { id:"t5", nome_curso:"Fundraising e Compliance",        inscritos:94,  concluintes:81,  nps:85, data_proxima:"18/Mai" },
];

const MOCK_COMUNICACOES = [
  { id:"c1", assunto:"Convite Congresso Estadual 2026", canal:"E-mail + WhatsApp", enviados:47382, aberturas:28429, cliques:9874,  enviado_em:"há 2 dias" },
  { id:"c2", assunto:"Boleto mensal Jan/26",            canal:"E-mail + SMS",      enviados:47382, aberturas:38217, cliques:31254, enviado_em:"há 5 dias" },
  { id:"c3", assunto:"Curso novo: Escola de Líderes",   canal:"WhatsApp",          enviados:12043, aberturas:8921,  cliques:3184,  enviado_em:"há 8 dias" },
  { id:"c4", assunto:"Campanha Filie-se · Q1",          canal:"E-mail + Push",     enviados:47382, aberturas:22104, cliques:4821,  enviado_em:"há 12 dias" },
];

const MOCK_DEMOGRAFIA = {
  genero:     [{ label:"Masculino", pct:58 }, { label:"Feminino", pct:41 }, { label:"Não binário", pct:1 }],
  faixa_etaria:[{ label:"16-24", pct:12 }, { label:"25-34", pct:24 }, { label:"35-44", pct:28 }, { label:"45-54", pct:19 }, { label:"55-64", pct:11 }, { label:"65+", pct:6 }],
  uf:         [{ label:"RMS", pct:42 }, { label:"Recôncavo", pct:14 }, { label:"Sul", pct:12 }, { label:"Oeste", pct:10 }, { label:"Chapada", pct:8 }, { label:"Sertão", pct:14 }],
};

const MOCK_SAUDE = [
  { id:"s1", mes_ref:"Ago/25", filiacoes_mes:1024, cancelamentos_mes:186 },
  { id:"s2", mes_ref:"Set/25", filiacoes_mes:987,  cancelamentos_mes:172 },
  { id:"s3", mes_ref:"Out/25", filiacoes_mes:941,  cancelamentos_mes:203 },
  { id:"s4", mes_ref:"Nov/25", filiacoes_mes:1102, cancelamentos_mes:198 },
  { id:"s5", mes_ref:"Dez/25", filiacoes_mes:843,  cancelamentos_mes:234 },
  { id:"s6", mes_ref:"Jan/26", filiacoes_mes:892,  cancelamentos_mes:214 },
];

// ======================== TABS ========================
const TABS = [
  ["filiacao","Filiação"],
  ["financeiro","Finanças do diretório"],
  ["treinamento","Treinamentos"],
  ["comunicacao","Comunicação"],
  ["demografia","Demografia"],
  ["saude","Saúde da base"],
];

// ======================== UTILITÁRIOS ========================
function ProgressBar({ value, color = "var(--mz-tenant-primary,#002A7B)" }) {
  return (
    <div style={{ height:6,background:"var(--mz-rule)",borderRadius:3,overflow:"hidden" }}>
      <div style={{ width:`${Math.min(100,Math.max(0,value))}%`,height:"100%",background:color,borderRadius:3 }}/>
    </div>
  );
}

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold"
      style={{ background:"rgba(217,119,6,0.12)", color:"var(--mz-warn,#fbbf24)", border:"1px solid rgba(217,119,6,0.2)" }}>
      📊 demo
    </span>
  );
}

function SkeletonRow({ cols = 9 }) {
  return (
    <div className="grid items-center px-5 py-3" style={{ gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:"10px" }}>
      {Array.from({ length: cols }).map((_,i) => (
        <div key={i} className="h-3 rounded animate-pulse" style={{ background:"var(--mz-rule)", width:i===0?"80%":"60%" }}/>
      ))}
    </div>
  );
}

// ======================== TAB FILIAÇÃO ========================
function TabFiliacao({ isMockKPIs, kpis }) {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  // Debounce 350ms na busca
  const debounceTimer = useRef(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(debounceTimer.current);
  }, [q]);

  // Reset page ao mudar filtros
  useEffect(() => { setPage(1); }, [statusFilter]);

  const filtros = {
    status: statusFilter !== "todos" ? statusFilter : undefined,
    busca: debouncedQ || undefined,
    page,
    per_page: PER_PAGE,
  };

  const { filiados, total, isLoading, isError, isMock } = useFiliados(filtros);

  const displayFiliados = isMock
    ? MOCK_FILIADOS.filter(f => {
        if (statusFilter !== "todos" && f.status !== statusFilter) return false;
        if (q && !f.nome_completo.toLowerCase().includes(q.toLowerCase()) && !(f.cidade||"").toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      })
    : filiados;

  const displayTotal = isMock ? MOCK_KPIS.total : total;
  const totalPages = Math.ceil((isMock ? displayFiliados.length : total) / PER_PAGE);

  const statusStyle = (s) => ({
    ativo:    { background:"rgba(16,185,129,0.12)",  color:"var(--mz-ok,#34d399)" },
    inativo:  { background:"rgba(217,119,6,0.12)",   color:"var(--mz-warn,#fbbf24)" },
    suspenso: { background:"rgba(220,38,38,0.12)",   color:"var(--mz-danger,#f87171)" },
  }[s] || {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 h-[32px] rounded-md flex-1" style={{ background:"var(--mz-rule)", minWidth:240 }}>
          <Search size={11} style={{ color:"var(--mz-fg-dim)", flexShrink:0 }}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nome ou cidade…"
            className="flex-1 bg-transparent outline-none text-[11.5px]" style={{ color:"var(--mz-fg)" }}/>
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          className="h-[32px] rounded-md px-3 text-[11.5px]" style={{ background:"var(--mz-rule)", color:"var(--mz-fg)", border:"1px solid var(--mz-rule-strong,rgba(0,0,0,0.1))" }}>
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
          <option value="suspenso">Suspensos</option>
        </select>
        {isMock && <MockBadge/>}
        <button className="flex items-center gap-1.5 h-[32px] px-3 rounded-md text-[11px] font-semibold mz-t-fg-muted" style={{ background:"var(--mz-rule)" }}>
          <Download size={11}/>CSV
        </button>
        <button className="flex items-center gap-1.5 h-[32px] px-4 rounded-md text-[11px] font-bold text-white" style={{ background:"var(--mz-tenant-primary,#002A7B)" }}>
          <Plus size={11}/>Nova filiação
        </button>
      </div>

      <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
        <div className="grid px-5 py-2.5 text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold border-b"
          style={{ gridTemplateColumns:"1fr 110px 120px 80px 80px 70px 80px 140px 50px", gap:"10px", borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
          <div>Nome</div><div>CPF</div><div>Município</div><div>Desde</div><div>Status</div><div>Doador</div><div>Trein.</div><div>Tags</div><div/>
        </div>

        {isLoading && !isMock
          ? Array.from({ length: 5 }).map((_,i) => <SkeletonRow key={i} cols={9}/>)
          : displayFiliados.map((f) => (
            <div key={f.id} className="grid items-center px-5 py-2.5 border-b last:border-0 text-[11.5px]"
              style={{ gridTemplateColumns:"1fr 110px 120px 80px 80px 70px 80px 140px 50px", gap:"10px", borderColor:"var(--mz-rule)" }}>
              <div className="font-semibold mz-t-fg-strong truncate">{f.nome_completo}</div>
              <div className="mz-tnum mz-t-fg-dim font-mono text-[10.5px]">{f.cpf_hash || "***.***.***-**"}</div>
              <div className="mz-t-fg-muted truncate">{f.cidade || "—"}</div>
              <div className="mz-t-fg-muted text-[10.5px]">
                {f.data_filiacao ? f.data_filiacao.substring(0,7).replace("-","/") : "—"}
              </div>
              <div>
                <span className="inline-flex px-2 h-5 items-center rounded-full text-[10px] font-bold" style={statusStyle(f.status)}>
                  {f.status}
                </span>
              </div>
              <div>
                {f.contribuinte_em_dia
                  ? <span className="text-[11px] font-semibold" style={{ color:"var(--mz-ok,#34d399)" }}>◆ sim</span>
                  : <span className="mz-t-fg-dim">—</span>}
              </div>
              <div className="text-center mz-t-fg">{f.treinamentos_concluidos ?? 0}</div>
              <div className="flex flex-wrap gap-1 min-w-0">
                {(f.tags || []).slice(0,2).map(t=>(
                  <span key={t} className="inline-flex px-1.5 h-4 items-center rounded-full text-[9px] font-bold"
                    style={{ background:"var(--mz-rule)", color:"var(--mz-fg-dim)" }}>{t}</span>
                ))}
              </div>
              <div>
                <button className="text-[11px] font-semibold" style={{ color:"var(--mz-tenant-primary,#002A7B)" }}>abrir →</button>
              </div>
            </div>
          ))
        }

        <div className="px-5 py-3 flex items-center justify-between text-[10.5px] mz-t-fg-dim border-t"
          style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
          <div>
            Exibindo {displayFiliados.length} de {displayTotal.toLocaleString("pt-BR")} registros
            {isMock && <span className="ml-2 opacity-60">(dados demonstração)</span>}
          </div>
          {!isMock && totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p-1))}
                className="px-2 py-1 rounded text-[10.5px] font-semibold disabled:opacity-40"
                style={{ background:"var(--mz-rule)" }}>
                ← ant.
              </button>
              <span>pág. {page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p+1))}
                className="px-2 py-1 rounded text-[10.5px] font-semibold disabled:opacity-40"
                style={{ background:"var(--mz-rule)" }}>
                próx. →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================== TAB FINANCEIRO ========================
function TabFinanceiro() {
  const { repasses, isLoading, isMock } = useRepasses();
  const displayRepasses = isMock ? MOCK_REPASSES : repasses;

  // Normaliza campos da API para os nomes usados na UI
  const normalize = (r) => ({
    mes: r.mes_ref ?? r.mes,
    fundoPart: r.fundo_partidario ?? r.fundoPart ?? 0,
    fundoEsp: r.fundo_especial ?? r.fundoEsp ?? 0,
    doacoes: r.doacoes ?? 0,
    total: r.total ?? 0,
  });

  const normalized = displayRepasses.map(normalize);
  const totalPeriodo = normalized.reduce((acc, r) => acc + r.total, 0);

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns:"1fr 320px" }}>
      <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
          <div>
            <div className="text-[13px] font-bold mz-t-fg-strong flex items-center gap-2">
              Repasses recebidos · últimos 6 meses
              {isMock && <MockBadge/>}
            </div>
            <div className="text-[10.5px] mz-t-fg-dim mt-0.5">Fundo Partidário + Fundo Especial + doações estatutárias</div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold mz-t-fg-muted" style={{ background:"var(--mz-rule)" }}>
            <Download size={11}/>Prestação TSE
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-wider mz-t-fg-dim border-b" style={{ borderColor:"var(--mz-rule)" }}>
              <tr>
                {["Mês","Fundo Partidário","Fundo Especial","Doações","Total"].map(h=>(
                  <th key={h} className="px-5 py-2.5 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && !isMock
                ? Array.from({ length: 3 }).map((_,i) => (
                    <tr key={i}>
                      {[0,1,2,3,4].map(j => (
                        <td key={j} className="px-5 py-2.5">
                          <div className="h-3 rounded animate-pulse" style={{ background:"var(--mz-rule)", width:"70%" }}/>
                        </td>
                      ))}
                    </tr>
                  ))
                : normalized.map((r,i)=>(
                  <tr key={r.mes ?? i} className="border-b last:border-0" style={{ borderColor:"var(--mz-rule)" }}>
                    <td className="px-5 py-2.5 font-semibold mz-t-fg-strong">{r.mes}</td>
                    <td className="px-5 py-2.5 mz-tnum">R$ {(r.fundoPart/1000).toLocaleString("pt-BR",{maximumFractionDigits:0})}k</td>
                    <td className="px-5 py-2.5 mz-tnum" style={{ color:r.fundoEsp?"var(--mz-ok,#34d399)":"var(--mz-fg-dim)" }}>
                      {r.fundoEsp ? `R$ ${(r.fundoEsp/1000).toLocaleString("pt-BR",{maximumFractionDigits:0})}k` : "—"}
                    </td>
                    <td className="px-5 py-2.5 mz-tnum">R$ {(r.doacoes/1000).toLocaleString("pt-BR",{maximumFractionDigits:0})}k</td>
                    <td className="px-5 py-2.5 mz-tnum font-bold mz-t-fg-strong">R$ {(r.total/1000000).toFixed(2)}mi</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3.5 border-t flex items-center justify-between" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
          <div className="text-[10.5px] mz-t-fg-dim">Total no período</div>
          <div className="text-[15px] font-black mz-tnum mz-t-fg-strong">
            R$ {(totalPeriodo/1000000).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})} mi
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="mz-ring-soft rounded-xl p-4" style={{ background:"var(--mz-bg-card)" }}>
          <div className="text-[13px] font-bold mz-t-fg-strong mb-0.5">Distribuição para diretórios</div>
          <div className="text-[10.5px] mz-t-fg-dim mb-3">Regra estatutária · próximo repasse em 12 dias</div>
          <div className="space-y-2 text-[11.5px]">
            {[["Nacional","40%"],["Estaduais","35%"],["Municipais","20%"],["Fundação / estudos","5%"]].map(([l,v])=>(
              <div key={l} className="flex justify-between py-1 border-b last:border-0" style={{ borderColor:"var(--mz-rule)" }}>
                <span className="mz-t-fg-muted">{l}</span><span className="mz-tnum font-semibold mz-t-fg-strong">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mz-ring-soft rounded-xl p-4" style={{ background:"var(--mz-bg-card)" }}>
          <div className="text-[13px] font-bold mz-t-fg-strong mb-2">Pendências</div>
          <div className="space-y-2 text-[11.5px]">
            <div className="flex items-start gap-2 p-2 rounded-lg" style={{ background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)" }}>
              <AlertTriangle size={11} style={{ color:"var(--mz-danger,#f87171)", marginTop:2, flexShrink:0 }}/>
              <div>
                <div className="font-semibold" style={{ color:"var(--mz-danger,#f87171)" }}>22 diretórios sem prestação</div>
                <div className="mz-t-fg-dim text-[10px]">prazo TSE: 30/abr</div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg" style={{ background:"rgba(217,119,6,0.06)", border:"1px solid rgba(217,119,6,0.15)" }}>
              <Clock size={11} style={{ color:"var(--mz-warn,#fbbf24)", marginTop:2, flexShrink:0 }}/>
              <div>
                <div className="font-semibold" style={{ color:"var(--mz-warn,#fbbf24)" }}>8 notas fiscais pendentes</div>
                <div className="mz-t-fg-dim text-[10px]">auditoria interna</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ======================== TAB TREINAMENTOS ========================
function TabTreinamento() {
  const { treinamentos, isLoading, isMock } = useTreinamentos();
  const displayTreinamentos = isMock ? MOCK_TREINAMENTOS : treinamentos;

  return (
    <div className="space-y-4">
      {isMock && (
        <div className="flex items-center gap-2">
          <MockBadge/>
          <span className="text-[10.5px] mz-t-fg-dim">dados de demonstração</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {isLoading && !isMock
          ? Array.from({ length: 4 }).map((_,i) => (
              <div key={i} className="mz-ring-soft rounded-xl p-5" style={{ background:"var(--mz-bg-card)" }}>
                <div className="h-4 rounded animate-pulse mb-3" style={{ background:"var(--mz-rule)", width:"60%" }}/>
                <div className="h-3 rounded animate-pulse mb-2" style={{ background:"var(--mz-rule)", width:"80%" }}/>
                <div className="h-2 rounded animate-pulse" style={{ background:"var(--mz-rule)" }}/>
              </div>
            ))
          : displayTreinamentos.map((t,i) => {
              const pct = Math.round((t.concluintes/t.inscritos)*100);
              return (
                <div key={t.id} className="mz-ring-soft rounded-xl p-5" style={{ background:"var(--mz-bg-card)" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-0.5">Curso #{i+1}</div>
                      <div className="text-[13px] font-bold mz-t-fg-strong">{t.nome_curso}</div>
                    </div>
                    <span className="inline-flex px-2 h-6 items-center rounded-full text-[10.5px] font-bold" style={{ background:"var(--mz-rule)", color:"var(--mz-fg-muted)" }}>NPS {t.nps}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] mz-t-fg-muted mb-3">
                    <span>📚 {t.inscritos} inscritos</span>
                    <span>✓ {t.concluintes} concluíram</span>
                    {t.data_proxima && <span>📅 {t.data_proxima}</span>}
                  </div>
                  <ProgressBar value={pct} />
                  <div className="flex items-center justify-between mt-1.5 text-[10px] mz-t-fg-dim">
                    <span>{pct}% de conclusão</span>
                    {t.data_proxima && <span>próxima turma: {t.data_proxima}</span>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {["Ver turma","Material","Certificados"].map(a=>(
                      <button key={a} className="px-3 py-1.5 rounded-md text-[10.5px] font-semibold mz-t-fg-muted" style={{ background:"var(--mz-rule)" }}>{a}</button>
                    ))}
                  </div>
                </div>
              );
            })
        }
        <button className="mz-ring-soft rounded-xl p-6 flex items-center justify-center text-[12.5px] font-semibold mz-t-fg-dim"
          style={{ background:"transparent", border:"2px dashed var(--mz-rule)", cursor:"pointer" }}>
          + Novo treinamento
        </button>
      </div>
    </div>
  );
}

// ======================== TAB COMUNICAÇÃO ========================
function TabComunicacao() {
  const { comunicacoes, isLoading, isMock } = useComunicacoes();
  const displayComunicacoes = isMock ? MOCK_COMUNICACOES : comunicacoes;

  // Normaliza campos da API vs mock
  const normalize = (c) => ({
    id: c.id,
    assunto: c.assunto,
    canal: c.canal,
    enviados: c.enviados ?? 0,
    aberturas: c.aberturas ?? 0,
    cliques: c.cliques ?? 0,
    quando: c.enviado_em ?? c.quando ?? "—",
  });

  const normalized = displayComunicacoes.map(normalize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>{isMock && <MockBadge/>}</div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold text-white" style={{ background:"var(--mz-tenant-primary,#002A7B)" }}>
          <Send size={12}/>Nova campanha
        </button>
      </div>
      <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
        <div className="grid px-5 py-2.5 text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold border-b"
          style={{ gridTemplateColumns:"2fr 140px 100px 100px 100px 100px", gap:"12px", borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
          <div>Assunto</div><div>Canal</div><div className="text-right">Enviados</div><div className="text-right">Aberturas</div><div className="text-right">Cliques</div><div className="text-right">Quando</div>
        </div>
        {isLoading && !isMock
          ? Array.from({ length: 3 }).map((_,i) => (
              <div key={i} className="grid items-center px-5 py-3.5 border-b"
                style={{ gridTemplateColumns:"2fr 140px 100px 100px 100px 100px", gap:"12px", borderColor:"var(--mz-rule)" }}>
                {[0,1,2,3,4,5].map(j => (
                  <div key={j} className="h-3 rounded animate-pulse" style={{ background:"var(--mz-rule)" }}/>
                ))}
              </div>
            ))
          : normalized.map((c)=>(
            <div key={c.id} className="grid items-center px-5 py-3.5 border-b last:border-0 text-[11.5px]"
              style={{ gridTemplateColumns:"2fr 140px 100px 100px 100px 100px", gap:"12px", borderColor:"var(--mz-rule)" }}>
              <div className="font-semibold mz-t-fg-strong truncate">{c.assunto}</div>
              <div className="mz-t-fg-muted">{c.canal}</div>
              <div className="text-right mz-tnum mz-t-fg">{c.enviados.toLocaleString("pt-BR")}</div>
              <div className="text-right mz-tnum" style={{ color:"var(--mz-ok,#34d399)" }}>{c.aberturas.toLocaleString("pt-BR")}</div>
              <div className="text-right mz-tnum" style={{ color:"var(--mz-tenant-primary,#002A7B)" }}>{c.cliques.toLocaleString("pt-BR")}</div>
              <div className="text-right mz-t-fg-muted">{c.quando}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ======================== TAB DEMOGRAFIA ========================
function DemoBar({ label, value, max, color }) {
  return (
    <div className="flex items-center gap-3 text-[11.5px]">
      <div className="w-24 mz-t-fg-muted flex-shrink-0">{label}</div>
      <div className="flex-1 h-4 rounded-md overflow-hidden" style={{ background:"var(--mz-rule)" }}>
        <div style={{ width:`${(value/max)*100}%`,height:"100%",background:color||"var(--mz-tenant-primary,#002A7B)",borderRadius:4 }}/>
      </div>
      <div className="w-8 text-right mz-tnum font-semibold mz-t-fg-strong">{value}%</div>
    </div>
  );
}

function TabDemografia() {
  const { demografia, isLoading, isMock } = useDemografia();
  const displayDemografia = isMock ? MOCK_DEMOGRAFIA : demografia;
  const colors = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];

  const sections = displayDemografia
    ? [
        { title:"Gênero",     data:(displayDemografia.genero||[]).map(d => [d.label, d.pct]) },
        { title:"Faixa etária", data:(displayDemografia.faixa_etaria||[]).map(d => [d.label, d.pct]) },
        { title:"Região / UF", data:(displayDemografia.uf||[]).map(d => [d.label, d.pct]) },
      ]
    : [];

  return (
    <div className="space-y-4">
      {isMock && (
        <div className="flex items-center gap-2">
          <MockBadge/>
          <span className="text-[10.5px] mz-t-fg-dim">dados de demonstração</span>
        </div>
      )}
      {isLoading && !isMock
        ? (
          <div className="grid grid-cols-3 gap-4">
            {[0,1,2].map(i => (
              <div key={i} className="mz-ring-soft rounded-xl p-5" style={{ background:"var(--mz-bg-card)" }}>
                <div className="h-4 rounded animate-pulse mb-4" style={{ background:"var(--mz-rule)", width:"50%" }}/>
                {[0,1,2].map(j => (
                  <div key={j} className="flex items-center gap-3 mb-3">
                    <div className="h-3 rounded animate-pulse" style={{ background:"var(--mz-rule)", width:80 }}/>
                    <div className="flex-1 h-4 rounded animate-pulse" style={{ background:"var(--mz-rule)" }}/>
                    <div className="h-3 rounded animate-pulse" style={{ background:"var(--mz-rule)", width:24 }}/>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
        : (
          <div className="grid grid-cols-3 gap-4">
            {sections.map((sec,si)=>{
              const max = Math.max(...sec.data.map(d=>d[1]));
              return (
                <div key={sec.title} className="mz-ring-soft rounded-xl p-5" style={{ background:"var(--mz-bg-card)" }}>
                  <div className="text-[13px] font-bold mz-t-fg-strong mb-4">{sec.title}</div>
                  <div className="space-y-2.5">
                    {sec.data.map(([l,v],i)=>(
                      <DemoBar key={l} label={l} value={v} max={max} color={colors[i%colors.length]}/>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ======================== TAB SAUDE ========================
function TabSaude() {
  const { saude, isLoading, isMock } = useSaudeBase();
  const displaySaude = isMock ? MOCK_SAUDE : saude;

  // Normaliza campos da API
  const normalize = (s) => ({
    mes: s.mes_ref ?? s.mes,
    filiacoes: s.filiacoes_mes ?? s.filiacoes ?? 0,
    cancel: s.cancelamentos_mes ?? s.cancel ?? 0,
  });

  const normalized = displaySaude.map(normalize);
  const maxFil = Math.max(...normalized.map(s=>s.filiacoes), 1);

  // KPIs dinâmicos a partir dos dados reais
  const ultimo = normalized[normalized.length - 1];
  const penultimo = normalized[normalized.length - 2];
  const churnPct = ultimo && (ultimo.filiacoes + ultimo.cancel) > 0
    ? ((ultimo.cancel / (ultimo.filiacoes + ultimo.cancel)) * 100).toFixed(2).replace(".",",")
    : "0,00";
  const filDelta = ultimo && penultimo && penultimo.filiacoes > 0
    ? Math.round(((ultimo.filiacoes - penultimo.filiacoes) / penultimo.filiacoes) * 100)
    : null;
  const cancelDelta = ultimo && penultimo && penultimo.cancel > 0
    ? Math.round(((ultimo.cancel - penultimo.cancel) / penultimo.cancel) * 100)
    : null;

  return (
    <div className="space-y-4">
      {isMock && (
        <div className="flex items-center gap-2">
          <MockBadge/>
          <span className="text-[10.5px] mz-t-fg-dim">dados de demonstração</span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            l:"Churn mensal",
            v:`${churnPct}%`,
            delta:"▼ Bom",
            color:"var(--mz-ok,#34d399)"
          },
          {
            l:`Filiações ${ultimo?.mes || "—"}`,
            v: ultimo ? String(ultimo.filiacoes) : "—",
            delta: filDelta !== null ? `${filDelta >= 0 ? "▲" : "▼"} ${filDelta >= 0 ? "+" : ""}${filDelta}% vs mês ant.` : "—",
            color: filDelta !== null && filDelta >= 0 ? "var(--mz-ok,#34d399)" : "var(--mz-danger,#f87171)",
          },
          {
            l:`Cancelamentos ${ultimo?.mes || ""}`,
            v: ultimo ? String(ultimo.cancel) : "—",
            delta: cancelDelta !== null ? `${cancelDelta <= 0 ? "▼" : "▲"} ${cancelDelta <= 0 ? "" : "+"}${cancelDelta}% vs mês ant.` : "—",
            color: cancelDelta !== null && cancelDelta <= 0 ? "var(--mz-ok,#34d399)" : "var(--mz-danger,#f87171)",
          },
        ].map(k=>(
          <div key={k.l} className="mz-kpi-card mz-ring-soft">
            <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.12em] font-semibold">{k.l}</div>
            <div className="text-[28px] font-black mz-tnum mt-1 mz-t-fg-strong">{k.v}</div>
            <div className="text-[11px] mt-0.5 font-semibold" style={{ color:k.color }}>{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background:"var(--mz-bg-card)" }}>
        <div className="px-5 py-3.5 border-b" style={{ borderColor:"var(--mz-rule)", background:"var(--mz-bg-card-2,rgba(0,0,0,0.02))" }}>
          <div className="text-[13px] font-bold mz-t-fg-strong">Filiações vs Cancelamentos · últimos 6 meses</div>
        </div>
        <div className="p-5">
          {isLoading && !isMock
            ? Array.from({ length: 4 }).map((_,i) => (
                <div key={i} className="grid items-center gap-4 mb-3" style={{ gridTemplateColumns:"70px 1fr 1fr 80px 80px" }}>
                  <div className="h-3 rounded animate-pulse" style={{ background:"var(--mz-rule)" }}/>
                  <div className="h-2 rounded animate-pulse" style={{ background:"var(--mz-rule)" }}/>
                  <div className="h-2 rounded animate-pulse" style={{ background:"var(--mz-rule)" }}/>
                  <div className="h-3 rounded animate-pulse" style={{ background:"var(--mz-rule)" }}/>
                  <div className="h-3 rounded animate-pulse" style={{ background:"var(--mz-rule)" }}/>
                </div>
              ))
            : (
              <div className="space-y-3">
                {normalized.map((s,i)=>(
                  <div key={s.mes ?? i} className="grid items-center gap-4 text-[11.5px]" style={{ gridTemplateColumns:"70px 1fr 1fr 80px 80px" }}>
                    <div className="font-semibold mz-t-fg-strong">{s.mes}</div>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] mz-t-fg-dim mb-0.5">
                        <span>Filiações</span><span className="mz-tnum">{s.filiacoes}</span>
                      </div>
                      <div style={{ height:5,background:"var(--mz-rule)",borderRadius:3,overflow:"hidden" }}>
                        <div style={{ width:`${(s.filiacoes/maxFil)*100}%`,height:"100%",background:"var(--mz-ok,#34d399)",borderRadius:3 }}/>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] mz-t-fg-dim mb-0.5">
                        <span>Cancelamentos</span><span className="mz-tnum">{s.cancel}</span>
                      </div>
                      <div style={{ height:5,background:"var(--mz-rule)",borderRadius:3,overflow:"hidden" }}>
                        <div style={{ width:`${(s.cancel/maxFil)*100}%`,height:"100%",background:"var(--mz-danger,#f87171)",borderRadius:3 }}/>
                      </div>
                    </div>
                    <div className="text-right mz-tnum font-semibold" style={{ color:"var(--mz-ok,#34d399)" }}>{s.filiacoes}</div>
                    <div className="text-right mz-tnum font-semibold" style={{ color:"var(--mz-danger,#f87171)" }}>{s.cancel}</div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

// ======================== MAIN PAGE ========================
function AfiliadosContent() {
  const [tab, setTab] = useState("filiacao");
  const { kpis, isLoading: kpisLoading, isMock: kpisMock } = useAfiliadosKPIs();

  const displayKPIs = kpisMock ? MOCK_KPIS : {
    total: kpis?.total ?? 0,
    ativos: kpis?.ativos ?? 0,
    inativos: kpis?.inativos ?? 0,
    suspensos: kpis?.suspensos ?? 0,
    novos_30d: kpis?.novos_30d ?? 0,
    churn_30d: kpis?.churn_30d ?? 0,
    diretorios_ativos: kpis?.diretorios_ativos ?? 0,
    diretorios_totais: kpis?.diretorios_totais ?? 0,
  };

  const tabContent = {
    filiacao:    <TabFiliacao isMockKPIs={kpisMock} kpis={displayKPIs}/>,
    financeiro:  <TabFinanceiro/>,
    treinamento: <TabTreinamento/>,
    comunicacao: <TabComunicacao/>,
    demografia:  <TabDemografia/>,
    saude:       <TabSaude/>,
  };

  return (
    <div style={{ background:"var(--mz-bg-page)", minHeight:"100%" }}>
      {/* Page header */}
      <div className="px-8 pt-6 pb-0" style={{ background:"var(--mz-bg-card)", borderBottom:"1px solid var(--mz-rule)" }}>
        <div className="max-w-[1680px] mx-auto">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="text-[11px] mz-t-fg-dim tracking-[0.18em] uppercase font-semibold">Afiliados</div>
              <h1 className="text-[30px] font-black mz-t-fg-strong mt-1 leading-none">Gestão de filiados</h1>
              <div className="text-[13px] mz-t-fg-muted mt-1.5 flex items-center gap-2">
                Base de {displayKPIs.total.toLocaleString("pt-BR")} filiados · {displayKPIs.diretorios_ativos} diretórios ativos
                {kpisMock && <MockBadge/>}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-6 gap-3 mb-5">
            {kpisLoading && !kpisMock
              ? Array.from({ length: 6 }).map((_,i) => (
                  <div key={i} className="mz-kpi-card mz-ring-soft">
                    <div className="h-2.5 rounded animate-pulse mb-2" style={{ background:"var(--mz-rule)", width:"70%" }}/>
                    <div className="h-7 rounded animate-pulse mb-1" style={{ background:"var(--mz-rule)", width:"50%" }}/>
                    <div className="h-2 rounded animate-pulse" style={{ background:"var(--mz-rule)", width:"60%" }}/>
                  </div>
                ))
              : [
                  { l:"Total filiados",    v:displayKPIs.total.toLocaleString("pt-BR"),         sub:"TSE atualizado",         color:"var(--mz-fg-strong)" },
                  { l:"Ativos",            v:displayKPIs.ativos.toLocaleString("pt-BR"),         sub:`${displayKPIs.total > 0 ? Math.round(displayKPIs.ativos/displayKPIs.total*100) : 0}% da base`, color:"var(--mz-ok,#34d399)" },
                  { l:"Inativos",          v:displayKPIs.inativos.toLocaleString("pt-BR"),       sub:"risco de cancelamento",  color:"var(--mz-warn,#fbbf24)" },
                  { l:"Novos (30d)",       v:displayKPIs.novos_30d,                              sub:"▲ +12% vs mês ant.",     color:"var(--mz-ok,#34d399)" },
                  { l:"Cancelaram (30d)",  v:displayKPIs.churn_30d,                              sub:"▼ churn 0,45%",          color:"var(--mz-danger,#f87171)" },
                  { l:"Diretórios ativos", v:displayKPIs.diretorios_ativos,                      sub:`de ${displayKPIs.diretorios_totais} municipais`, color:"var(--mz-fg-strong)" },
                ].map(k=>(
                  <div key={k.l} className="mz-kpi-card mz-ring-soft">
                    <div className="text-[10px] mz-t-fg-dim uppercase tracking-[0.12em] font-semibold">{k.l}</div>
                    <div className="text-[24px] font-black mz-tnum mt-1" style={{ color:k.color }}>{k.v}</div>
                    <div className="text-[10px] mz-t-fg-dim mt-0.5">{k.sub}</div>
                  </div>
                ))
            }
          </div>

          {/* Tabs */}
          <div className="flex gap-0 overflow-x-auto" style={{ scrollbarWidth:"none" }}>
            {TABS.map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)}
                className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap border-b-2 transition-all"
                style={{ borderColor:tab===k?"var(--mz-tenant-primary,#002A7B)":"transparent", color:tab===k?"var(--mz-tenant-primary,#002A7B)":"var(--mz-fg-muted)" }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6 max-w-[1680px] mx-auto">
        {tabContent[tab]}
      </div>
    </div>
  );
}

export default function AfiliadosPage() {
  return (
    <MazzelLayout activeModule="afiliados" breadcrumbs={["Mazzel","Afiliados"]}>
      <AfiliadosContent />
    </MazzelLayout>
  );
}
