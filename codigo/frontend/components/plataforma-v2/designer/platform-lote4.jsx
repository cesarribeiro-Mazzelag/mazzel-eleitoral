/* Delegados + Filiados + IA + Alertas */

const { useState: useLotState } = React;

function ModuleDelegados({ onNavigate }) {
  const [sort, setSort] = useLotState("perf");
  const sorted = [...DELEGADOS_LIST].sort((a,b) => sort === "perf" ? b.perf - a.perf : sort === "filiados" ? b.filiados - a.filiados : a.uf.localeCompare(b.uf));
  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Delegados</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">Gestão de delegações estaduais</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">27 delegados · hierarquia UF · performance operacional</div>
          </div>
          <div className="flex items-center gap-2">
            <select value={sort} onChange={e => setSort(e.target.value)} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>
              <option value="perf">Ordenar · Performance</option>
              <option value="filiados">Ordenar · Filiados</option>
              <option value="uf">Ordenar · UF</option>
            </select>
            <button className="btn-primary"><Icon name="Plus" size={13}/>Novo delegado</button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { l:"Delegados ativos", v:"27" },
            { l:"Cidades cobertas", v:"4.238" },
            { l:"Filiados base",    v:"234k" },
            { l:"Performance média", v:"72" },
          ].map(k => (
            <div key={k.l} className="kpi-card ring-soft">
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.l}</div>
              <div className="text-[32px] font-bold tnum mt-1 t-fg-strong">{k.v}</div>
            </div>
          ))}
        </div>
        <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
          <div className="grid grid-cols-[50px_2fr_80px_1fr_1fr_120px_100px] gap-3 px-5 py-2.5 text-[10px] t-fg-dim uppercase tracking-wider font-semibold border-b" style={{ borderColor: "var(--rule)", background: "var(--bg-card-2)" }}>
            <div>UF</div><div>Delegado</div><div>Cidades</div><div>Filiados</div><div>Performance</div><div>Status</div><div></div>
          </div>
          {sorted.map((d, i) => (
            <div key={i} className="grid grid-cols-[50px_2fr_80px_1fr_1fr_120px_100px] gap-3 px-5 py-3 items-center text-[12px] border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
              <div className="tnum font-bold t-fg-strong">{d.uf}</div>
              <div>
                <div className="font-semibold t-fg-strong">{d.nome}</div>
                <div className="text-[10.5px] t-fg-dim">Delegado · Federação {d.uf}</div>
              </div>
              <div className="tnum t-fg">{d.cidades}</div>
              <div className="tnum t-fg">{d.filiados.toLocaleString("pt-BR")}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
                  <div style={{ width: `${d.perf}%`, height: "100%", background: d.perf >= 80 ? "var(--ok)" : d.perf >= 60 ? "var(--warn)" : "var(--danger)" }}/>
                </div>
                <div className="tnum font-bold t-fg-strong w-8 text-right">{d.perf}</div>
              </div>
              <div><span className={`chip ${d.status === "top" ? "chip-green" : d.status === "ok" ? "chip-blue" : d.status === "at" ? "chip-amber" : "chip-red"}`} style={{ height: 20 }}>{d.status === "top" ? "Top performer" : d.status === "ok" ? "Em linha" : d.status === "at" ? "Atenção" : "Abaixo"}</span></div>
              <div className="text-right"><button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }}>Ver →</button></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleFiliados({ onNavigate }) {
  const maxUf = FILIADOS_UF[0].total;
  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Filiados União Brasil</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">Base nacional de filiados</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">Sincronizada com TSE · atualizada diariamente</div>
          </div>
          <button className="btn-primary"><Icon name="Download" size={13}/>Exportar base completa</button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { l:"Total nacional",     v: FILIADOS_TOTAL.toLocaleString("pt-BR") },
            { l:"Novos (30d)",        v: FILIADOS_NOVOS_30.toLocaleString("pt-BR"), t:"+14%" },
            { l:"Taxa retenção",      v:"94,2%", t:"+0,8pp" },
            { l:"Ranking nacional",   v:"4º", h:"entre 33 partidos" },
          ].map(k => (
            <div key={k.l} className="kpi-card ring-soft">
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.l}</div>
              <div className="text-[32px] font-bold tnum mt-1 t-fg-strong">{k.v}</div>
              {k.t && <div className="kpi-trend"><span className="chip chip-green" style={{ height: 20 }}><Icon name="ArrowUp" size={10}/>{k.t}</span></div>}
              {k.h && <div className="text-[11px] t-fg-dim mt-1">{k.h}</div>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[1.5fr_1fr] gap-3">
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Distribuição por UF</div>
              <div className="text-[15px] font-bold t-fg-strong">Top 15 unidades federativas</div>
            </div>
            <div className="p-5 space-y-1.5">
              {FILIADOS_UF.slice(0, 15).map(u => (
                <div key={u.uf} className="grid grid-cols-[36px_1fr_90px_70px] gap-3 items-center text-[11.5px]">
                  <div className="tnum font-bold t-fg-strong">{u.uf}</div>
                  <div className="h-2 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
                    <div style={{ width: `${(u.total/maxUf)*100}%`, height: "100%", background: "linear-gradient(90deg, var(--tenant-primary), #60a5fa)" }}/>
                  </div>
                  <div className="tnum font-semibold t-fg text-right">{u.total.toLocaleString("pt-BR")}</div>
                  <div className="tnum text-[10px] t-ok text-right">+{u.novos30d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Perfil demográfico</div>
              <div className="text-[15px] font-bold t-fg-strong">Faixa etária dos filiados</div>
            </div>
            <div className="p-5 space-y-2">
              {FILIADOS_FAIXA_IDADE.map(f => (
                <div key={f.faixa} className="grid grid-cols-[80px_1fr_50px] gap-3 items-center text-[11.5px]">
                  <div className="t-fg">{f.faixa} anos</div>
                  <div className="h-2 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
                    <div style={{ width: `${f.v*4}%`, height: "100%", background: "linear-gradient(90deg, var(--tenant-primary), var(--accent-blue))" }}/>
                  </div>
                  <div className="tnum font-bold t-fg-strong text-right">{f.v}%</div>
                </div>
              ))}
              <div className="pt-4 mt-4 border-t grid grid-cols-2 gap-2" style={{ borderColor: "var(--rule)" }}>
                <div><div className="text-[10px] t-fg-dim uppercase tracking-wider">Gênero M/F</div><div className="tnum font-bold t-fg-strong">54% / 46%</div></div>
                <div><div className="text-[10px] t-fg-dim uppercase tracking-wider">Escolaridade</div><div className="tnum font-bold t-fg-strong">62% superior</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleIA({ onNavigate }) {
  const [msgs, setMsgs] = useLotState(IA_CONVERSA);
  const [input, setInput] = useLotState("");
  const send = () => {
    if (!input.trim()) return;
    setMsgs(prev => [...prev, { role:"user", msg: input, t: new Date().toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }) },
      { role:"assistant", msg:"Analisando… Este é um protótipo — a integração Claude está pronta para ativação em produção.", t: "agora" }]);
    setInput("");
  };
  return (
    <div className="bg-page-grad" style={{ height: "100%" }}>
      <div className="max-w-[1200px] mx-auto h-full flex flex-col px-8 py-7">
        <div className="mb-4">
          <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">IA Assistente</div>
          <h1 className="text-[28px] font-display font-bold t-fg-strong mt-1 leading-none">
            <span style={{ background: "linear-gradient(90deg, var(--tenant-primary), var(--accent-blue-strong))", WebkitBackgroundClip: "text", color: "transparent" }}>Mazzel AI</span> · Sua copiloto política
          </h1>
        </div>

        <div className="flex-1 t-bg-card ring-soft rounded-xl overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, var(--tenant-primary), var(--accent-blue-strong))" }}>
                    <Icon name="Sparkles" size={14} className="text-white" stroke={2.2}/>
                  </div>
                )}
                <div className={`max-w-[76%] ${m.role === "user" ? "order-1" : ""}`}>
                  <div className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${m.role === "user" ? "ring-tenant" : "ring-soft"}`} style={{ background: m.role === "user" ? "rgba(var(--tenant-primary-rgb), 0.12)" : "var(--bg-card-2)", color: "var(--fg)" }}>
                    {m.msg}
                    {m.citations && (
                      <div className="mt-3 space-y-1.5 text-[12px]">
                        {m.citations.map((c, j) => (
                          <div key={j} className="flex items-start gap-2">
                            <span className="chip chip-blue" style={{ height: 18, fontSize: 9 }}>{c.ref}</span>
                            <span className="t-fg-muted flex-1">{c.texto}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {m.followup && <div className="mt-3 text-[12px] t-fg italic">{m.followup}</div>}
                  </div>
                  <div className={`text-[10px] t-fg-dim mt-1 ${m.role === "user" ? "text-right" : ""}`}>{m.t}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t" style={{ borderColor: "var(--rule)" }}>
            <div className="text-[10px] t-fg-dim uppercase tracking-wider font-semibold mb-2">Sugestões</div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {IA_SUGESTOES.slice(0, 4).map((s, i) => (
                <button key={i} onClick={() => setInput(s.titulo)} className="btn-ghost text-left" style={{ padding: "6px 10px", fontSize: 11.5 }}>
                  <Icon name={s.icon} size={11}/>{s.titulo}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg ring-soft" style={{ background: "var(--bg-card-2)" }}>
              <Icon name="Sparkles" size={14} className="t-tenant"/>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                     placeholder="Pergunte qualquer coisa sobre a base política nacional…" className="flex-1 bg-transparent outline-none text-[13px] t-fg placeholder:t-fg-dim"/>
              <button onClick={send} className="btn-primary" style={{ padding: "6px 14px", fontSize: 11 }}>Enviar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleAlertas({ onNavigate }) {
  const [filtro, setFiltro] = useLotState("todos");
  const visible = filtro === "todos" ? ALERTAS_DIA : ALERTAS_DIA.filter(a => a.sev === filtro);
  const total = ALERTAS_CATS.reduce((s, c) => s + c.qtd, 0);
  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Central de Alertas</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">Monitoramento 24/7</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">Jurídico · Mídia · Redes · Emendas · Processos · Legislativo</div>
          </div>
          <button className="btn-primary"><Icon name="Settings" size={13}/>Configurar</button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { l:"Críticos abertos", v:"12", t:"+3 · 24h", ok:false },
            { l:"Alto",             v:"34", t:"+7",       ok:false },
            { l:"Médio",            v:"58", t:"-4",       ok:true  },
            { l:"Total 7d",         v:"138", t:"+18%",    ok:false },
          ].map(k => (
            <div key={k.l} className="kpi-card ring-soft">
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.l}</div>
              <div className="text-[32px] font-bold tnum mt-1 t-fg-strong">{k.v}</div>
              <div className="kpi-trend"><span className={`chip ${k.ok ? "chip-green" : "chip-red"}`} style={{ height: 20 }}>{k.t}</span></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-3">
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: "var(--rule)" }}>
              <div className="flex-1">
                <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Feed em tempo real</div>
                <div className="text-[15px] font-bold t-fg-strong">{visible.length} alertas filtrados</div>
              </div>
              <div className="flex items-center gap-1 p-0.5 rounded-md" style={{ background: "var(--rule)" }}>
                {["todos","crit","alto","med","bx"].map(f => (
                  <button key={f} onClick={() => setFiltro(f)} className={`btn-ghost ${filtro === f ? "active" : ""}`} style={{ padding: "5px 10px", fontSize: 11 }}>
                    {f === "todos" ? "Todos" : f === "crit" ? "Crítico" : f === "alto" ? "Alto" : f === "med" ? "Médio" : "Baixo"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              {visible.map(a => (
                <div key={a.id} className={`alert-row alert-sev-${a.sev}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`chip ${a.sev === "crit" ? "chip-red" : a.sev === "alto" ? "chip-red" : a.sev === "med" ? "chip-amber" : "chip-muted"}`} style={{ height: 18, fontSize: 9 }}>{a.sev === "crit" ? "Crítico" : a.sev === "alto" ? "Alto" : a.sev === "med" ? "Médio" : "Baixo"}</span>
                      <span className="text-[10px] t-fg-dim uppercase tracking-wider">{a.tipo}</span>
                      <span className="tnum text-[11px] t-fg-muted">{a.uf}</span>
                      <span className="text-[10px] t-fg-dim ml-auto tnum">{a.hora}</span>
                    </div>
                    <div className="text-[13px] font-semibold t-fg-strong">{a.titulo}</div>
                    <div className="text-[11px] t-fg-muted">Fonte: {a.fonte}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Por categoria · 7 dias</div>
              <div className="text-[15px] font-bold t-fg-strong">{total} alertas totais</div>
            </div>
            <div className="p-5 space-y-2.5">
              {ALERTAS_CATS.map(c => (
                <div key={c.cat} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.cor }}/>
                    <div className="text-[12px] t-fg flex-1">{c.cat}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
                      <div style={{ width: `${(c.qtd/total)*250}%`, height: "100%", background: c.cor }}/>
                    </div>
                    <div className="tnum font-bold text-[12px] t-fg-strong w-7 text-right">{c.qtd}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ModuleDelegados, ModuleFiliados, ModuleIA, ModuleAlertas });
