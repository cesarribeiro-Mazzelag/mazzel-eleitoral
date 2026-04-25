/* Módulo Estudo - 3 abas: Pulso | Clusters | Biblioteca */

const { useState: useEstState } = React;

function ModuleEstudo({ onNavigate }) {
  const [tab, setTab] = useEstState("pulso");
  const [temaSel, setTemaSel] = useEstState(ESTUDO_TEMAS[0]);

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Módulo Estudo</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">Inteligência política aprofundada</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">Temas em alta, clusters de influência e biblioteca de pesquisas exclusivas.</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost"><Icon name="Download" size={13}/>Exportar</button>
            <button className="btn-primary"><Icon name="Sparkles" size={13}/>Gerar briefing IA</button>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-5 p-1 rounded-lg inline-flex" style={{ background: "var(--rule)" }}>
          {[{k:"pulso",l:"Pulso · Temas em alta"},{k:"clusters",l:"Clusters de influência"},{k:"biblioteca",l:"Biblioteca"}].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`btn-ghost ${tab === t.k ? "active" : ""}`} style={{ padding: "7px 14px", fontSize: 12 }}>{t.l}</button>
          ))}
        </div>

        {tab === "pulso" && (
          <div className="grid grid-cols-[1.25fr_1fr] gap-3">
            <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
                <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Temas · últimos 30 dias</div>
                <div className="text-[15px] font-bold t-fg-strong leading-tight">Monitoramento semântico (187 fontes · IA)</div>
              </div>
              <div>
                {ESTUDO_TEMAS.map(t => {
                  const sel = temaSel.id === t.id;
                  return (
                    <div key={t.id} onClick={() => setTemaSel(t)}
                         className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 border-b last:border-0 cursor-pointer card-hover"
                         style={{ borderColor: "var(--rule)", background: sel ? "var(--chart-hover)" : "transparent" }}>
                      <div>
                        <div className="text-[13px] font-semibold t-fg-strong">{t.nome}</div>
                        <div className="text-[10.5px] t-fg-dim uppercase tracking-wider">{t.cat}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] t-fg-dim uppercase tracking-wider">Menções</div>
                        <div className="tnum font-bold t-fg-strong">{t.mencoes.toLocaleString("pt-BR")}</div>
                      </div>
                      <div className="text-right w-[70px]">
                        <div className="text-[11px] t-fg-dim uppercase tracking-wider">Sent.</div>
                        <div className={`tnum font-bold ${t.sentimento < 0 ? "t-danger" : "t-ok"}`}>{t.sentimento > 0 ? "+" : ""}{t.sentimento}</div>
                      </div>
                      <div className={`chip ${t.trend.startsWith("+") ? "chip-red" : "chip-green"}`} style={{ height: 22 }}>
                        <Icon name={t.trend.startsWith("+") ? "ArrowUp" : "ArrowDown"} size={9}/>{t.trend}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="t-bg-card ring-soft rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
                <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Tema selecionado</div>
                <div className="text-[15px] font-bold t-fg-strong leading-tight">{temaSel.nome}</div>
              </div>
              <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
                <div className="grid grid-cols-3 gap-3">
                  <div><div className="text-[10px] t-fg-dim uppercase tracking-wider">Menções</div>
                    <div className="text-[22px] font-bold tnum t-fg-strong">{temaSel.mencoes.toLocaleString("pt-BR")}</div></div>
                  <div><div className="text-[10px] t-fg-dim uppercase tracking-wider">Sentimento</div>
                    <div className={`text-[22px] font-bold tnum ${temaSel.sentimento < 0 ? "t-danger" : "t-ok"}`}>{temaSel.sentimento > 0 ? "+" : ""}{temaSel.sentimento}</div></div>
                  <div><div className="text-[10px] t-fg-dim uppercase tracking-wider">Trend</div>
                    <div className="text-[22px] font-bold tnum t-fg-strong">{temaSel.trend}</div></div>
                </div>
              </div>
              <div className="p-5 border-b" style={{ borderColor: "var(--rule)" }}>
                <div className="text-[10.5px] t-fg-dim uppercase tracking-wider font-semibold mb-2">Distribuição por fonte</div>
                <div className="space-y-2">
                  {[["Imprensa tradicional", 42],["Twitter/X", 28],["Instagram", 14],["Podcasts", 9],["YouTube", 7]].map(([k,v]) => (
                    <div key={k} className="flex items-center gap-3">
                      <div className="text-[11px] t-fg w-[130px] truncate">{k}</div>
                      <div className="flex-1 h-2 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
                        <div style={{ width: `${v*2.2}%`, height: "100%", background: "linear-gradient(90deg, var(--tenant-primary), #60a5fa)" }} />
                      </div>
                      <div className="tnum text-[11px] font-bold t-fg-strong w-8 text-right">{v}%</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5 flex-1">
                <div className="text-[10.5px] t-fg-dim uppercase tracking-wider font-semibold mb-2">Insight IA</div>
                <div className="text-[12.5px] t-fg-muted leading-relaxed">
                  Tema em aceleração rápida — atenção crítica. Base conservadora com sentimento predominantemente negativo. Recomenda-se posicionamento cauteloso e alinhamento com a bancada do Nordeste antes de declarações públicas.
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "clusters" && (
          <div className="grid grid-cols-[1fr_320px] gap-3">
            <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
                <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Mapa de clusters</div>
                <div className="text-[15px] font-bold t-fg-strong leading-tight">Principais agrupamentos políticos · força de coesão</div>
              </div>
              <div className="p-6">
                <svg viewBox="0 0 600 340" className="w-full">
                  {ESTUDO_CLUSTERS.map((c, i) => {
                    const cx = 120 + i * 90;
                    const cy = 170 + (i % 2 === 0 ? -40 : 40);
                    const r = 18 + c.forca / 4;
                    return (
                      <g key={c.lider}>
                        <circle cx={cx} cy={cy} r={r} fill={c.cor} fillOpacity="0.22" stroke={c.cor} strokeWidth="1.5"/>
                        {[...Array(Math.min(12, Math.floor(c.aliados / 26)))].map((_, j) => {
                          const ang = (j / 12) * Math.PI * 2;
                          return <circle key={j} cx={cx + Math.cos(ang) * (r + 16)} cy={cy + Math.sin(ang) * (r + 16)} r="3.5" fill={c.cor} fillOpacity="0.6" />;
                        })}
                        <text x={cx} y={cy + 3} textAnchor="middle" style={{ fontSize: 11, fill: c.cor, fontWeight: 700 }}>{c.forca}</text>
                        <text x={cx} y={cy + r + 32} textAnchor="middle" style={{ fontSize: 10, fill: "var(--fg)", fontWeight: 600 }}>{c.lider.split(" (")[0]}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
            <div className="space-y-3">
              {ESTUDO_CLUSTERS.map((c, i) => (
                <div key={i} className="t-bg-card ring-soft rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: c.cor }}/>
                    <div className="text-[13px] font-bold t-fg-strong flex-1">{c.lider}</div>
                    <div className="tnum text-[16px] font-bold t-fg-strong">{c.forca}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="t-fg-dim">Aliados </span><span className="tnum font-semibold t-fg">{c.aliados}</span></div>
                    <div><span className="t-fg-dim">Alcance </span><span className="font-semibold t-fg">{c.alcance}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "biblioteca" && (
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center gap-3" style={{ borderColor: "var(--rule)" }}>
              <div className="flex-1">
                <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Biblioteca Mazzel</div>
                <div className="text-[15px] font-bold t-fg-strong leading-tight">Pesquisas, papers e relatórios exclusivos</div>
              </div>
              <div className="flex items-center gap-2 h-8 px-3 rounded-md" style={{ background: "var(--rule)" }}>
                <Icon name="Search" size={12} className="t-fg-dim"/>
                <input placeholder="Buscar por título, autor, tipo…" className="bg-transparent outline-none text-[12px] t-fg placeholder:t-fg-dim w-64" />
              </div>
            </div>
            <div className="row-striped">
              <div className="grid grid-cols-[2.5fr_1.5fr_1fr_100px_80px_80px] gap-3 px-5 py-2.5 text-[10px] t-fg-dim uppercase tracking-wider font-semibold border-b" style={{ borderColor: "var(--rule)", background: "var(--bg-card-2)" }}>
                <div>Título</div><div>Autor</div><div>Data</div><div>Tipo</div><div className="text-right">Páginas</div><div></div>
              </div>
              {ESTUDO_ESTUDOS.map((e, i) => (
                <div key={i} className="grid grid-cols-[2.5fr_1.5fr_1fr_100px_80px_80px] gap-3 px-5 py-3 items-center text-[12px]">
                  <div className="font-semibold t-fg-strong flex items-center gap-2">
                    <Icon name="FileSearch" size={13} className="t-tenant"/>{e.titulo}
                  </div>
                  <div className="t-fg-muted">{e.autor}</div>
                  <div className="t-fg-muted tnum">{e.data}</div>
                  <div><span className="chip chip-blue" style={{ height: 20 }}>{e.tipo}</span></div>
                  <div className="text-right tnum t-fg">{e.paginas}</div>
                  <div className="text-right"><button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }}>Abrir</button></div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* Portal do Cliente */
function ModulePortal({ onNavigate }) {
  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Portal do Cliente · Sen. Jaques Wagner</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">Comando do mandato</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">Visão proprietária do candidato · dados confidenciais · não visível a terceiros.</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip chip-green"><span className="chip-dot" style={{ background: "var(--ok)" }}/>Portal ativo · renovação em 147 dias</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { l:"Overall Mazzel",       v:"87", h:"Top 12% entre senadores",     ok:true  },
            { l:"Emendas em execução",  v:"R$ 42M", h:"de R$ 61M aprovado (69%)",ok:true  },
            { l:"Eventos agenda semana",v:"18",    h:"5 Brasília · 13 BA",       ok:true  },
            { l:"Metas 2024 batidas",   v:"3/4",  h:"1 em risco: imprensa",      ok:false },
          ].map(k => (
            <div key={k.l} className="kpi-card ring-soft">
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.l}</div>
              <div className="text-[32px] font-display font-bold tnum mt-1.5 leading-none" style={{ backgroundImage: "linear-gradient(180deg, var(--overall-from), var(--overall-to))", WebkitBackgroundClip: "text", color: "transparent" }}>{k.v}</div>
              <div className="text-[11px] t-fg-dim mt-1.5">{k.h}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[1.3fr_1fr] gap-3 mb-5">
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--rule)" }}>
              <div>
                <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Agenda · hoje</div>
                <div className="text-[15px] font-bold t-fg-strong">Quinta, 28 novembro · 5 compromissos</div>
              </div>
              <button className="btn-ghost" style={{ padding: "5px 9px" }}>Ver semana →</button>
            </div>
            <div>
              {PORTAL_AGENDA.map((a, i) => (
                <div key={i} className="grid grid-cols-[60px_1fr_auto_auto] gap-3 items-center px-5 py-3 border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
                  <div className="text-[14px] font-bold tnum t-fg-strong">{a.h}</div>
                  <div>
                    <div className="text-[12.5px] font-semibold t-fg-strong">{a.titulo}</div>
                    <div className="text-[11px] t-fg-dim">{a.local}</div>
                  </div>
                  <span className="chip chip-muted" style={{ height: 20 }}>{a.tipo}</span>
                  <span className={`chip ${a.conf === "confirmado" ? "chip-green" : "chip-amber"}`} style={{ height: 20 }}>
                    {a.conf === "confirmado" ? "✓" : "?"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Metas 2024</div>
              <div className="text-[15px] font-bold t-fg-strong">Progresso do mandato</div>
            </div>
            <div className="p-5 space-y-4">
              {PORTAL_METAS.map(m => {
                const pct = Math.round((m.v / m.meta) * 100);
                const cor = pct >= 90 ? "var(--ok)" : pct >= 75 ? "var(--warn)" : "var(--danger)";
                return (
                  <div key={m.m}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <div className="text-[12px] font-semibold t-fg">{m.m}</div>
                      <div className="tnum text-[12px] t-fg-muted">{m.v}{m.unidade} / {m.meta}{m.unidade}</div>
                    </div>
                    <div className="h-2 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
                      <div style={{ width: `${Math.min(100,pct)}%`, height: "100%", background: cor }}/>
                    </div>
                    <div className="text-[10px] t-fg-dim mt-1">{pct}% atingido</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Minha equipe</div>
              <div className="text-[15px] font-bold t-fg-strong">Gabinete + campo · 5 ativos</div>
            </div>
            <div>
              {PORTAL_EQUIPE.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
                  <div className="w-8 h-8 rounded-full t-bg-tenant-soft flex items-center justify-center text-[11px] font-bold t-fg-strong">{p.nome.split(" ").map(x=>x[0]).join("").slice(0,2)}</div>
                  <div className="flex-1">
                    <div className="text-[12.5px] font-semibold t-fg-strong">{p.nome}</div>
                    <div className="text-[11px] t-fg-muted">{p.papel} · {p.local}</div>
                  </div>
                  <span className={`chip ${p.ativo ? "chip-green" : "chip-muted"}`} style={{ height: 20 }}>{p.ativo ? "online" : "offline"}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Ações rápidas</div>
              <div className="text-[15px] font-bold t-fg-strong">Comandos do mandato</div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              {[
                { l:"Abrir meu dossiê", icon:"FileSearch", onClick:() => window.open("Header Hero.html","_blank") },
                { l:"Solicitar relatório", icon:"Download" },
                { l:"Agendar reunião", icon:"Users" },
                { l:"Falar com diretoria", icon:"Bell" },
                { l:"Análise IA do mandato", icon:"Sparkles" },
                { l:"Configurar alertas", icon:"Settings" },
              ].map((a,i) => (
                <button key={i} onClick={a.onClick} className="flex items-center gap-2 p-3 rounded-md t-border card-hover text-left" style={{ border: "1px solid var(--rule)", background: "var(--bg-card-2)" }}>
                  <Icon name={a.icon} size={14} className="t-tenant"/>
                  <span className="text-[12px] font-semibold t-fg">{a.l}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ModuleEstudo, ModulePortal });
