/* =========================================================================
 * Telas 4 · Árvore · 5 · Cadastro · 6 · CRM · 7 · Chat · 8 · Ranking
 * ========================================================================= */

/* ---------- Tela 4 · Árvore Hierárquica ---------- */
function Tela4Arvore() {
  const [expanded, setExpanded] = React.useState({ "reg-reconcavo": true, "mun-feira": true });
  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const row = (node, depth) => {
    const hasChildren = node.filhas && node.filhas.length > 0;
    const isOpen = expanded[node.id];
    return (
      <React.Fragment key={node.id}>
        <div className="list-row" style={{ gridTemplateColumns: `${depth * 20 + 28}px 24px 1fr 140px 120px 80px 140px 80px`, paddingLeft: 14 + depth * 20 }}>
          <div onClick={() => hasChildren && toggle(node.id)} style={{ cursor: hasChildren ? "pointer" : "default" }}>
            {hasChildren && <CIcon name={isOpen ? "ChevronDown" : "ChevronRight"} size={12} className="t-fg-muted"/>}
          </div>
          <StatusDot status={node.status}/>
          <div className="min-w-0 flex items-center gap-2">
            <CIcon name={node.nivel === "regional" ? "Flag" : node.nivel === "municipio" ? "MapPin" : "Home"} size={12} className="t-fg-dim"/>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold t-fg-strong truncate">{node.nome}</div>
              <div className="text-[10px] t-fg-dim uppercase tracking-wider">{node.nivel}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            {node.responsavelId ? <Avatar nome={node.responsavel} size={22}/> : <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center" style={{ background: "rgba(220,38,38,0.1)", color: "var(--danger)" }}><CIcon name="AlertTriangle" size={10}/></span>}
            <div className="text-[11.5px] t-fg truncate">{node.responsavel}</div>
          </div>
          <div>
            <ProgressBar value={(node.cadastrados/node.meta)*100} color={(node.cadastrados/node.meta) > 0.7 ? "var(--ok)" : (node.cadastrados/node.meta) > 0.4 ? "var(--warn)" : "var(--danger)"}/>
            <div className="text-[10px] tnum t-fg-dim mt-0.5">{node.cadastrados.toLocaleString("pt-BR")} / {node.meta.toLocaleString("pt-BR")}</div>
          </div>
          <div className="text-[13px] font-bold tnum" style={{ color: node.score >= 70 ? "var(--ok)" : node.score >= 50 ? "var(--warn)" : "var(--danger)" }}>{node.score}</div>
          <div className="text-[11px] tnum t-fg-muted">{node.engajamento}%</div>
          <div className="flex gap-1 justify-end">
            <button className="btn-ghost" style={{ padding: "4px 7px" }}><CIcon name="MessageCircle" size={10}/></button>
            <button className="btn-ghost" style={{ padding: "4px 7px" }}><CIcon name="MoreHorizontal" size={10}/></button>
          </div>
        </div>
        {hasChildren && isOpen && node.filhas.map(c => row(c, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="p-6 space-y-4" style={{ maxWidth: 1680, margin: "0 auto" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black font-display t-fg-strong">Hierarquia da campanha</h1>
          <div className="text-[12px] t-fg-muted mt-0.5">Delegado → Regionais → Territoriais → Bairros · cobertura em tempo real</div>
        </div>
        <div className="flex gap-2">
          <Segment value="operacional" onChange={() => {}} options={[{value:"operacional",label:"Operacional"},{value:"geografica",label:"Geográfica"}]}/>
          <button className="btn-ghost"><CIcon name="Download" size={11}/>Export</button>
          <button className="btn-primary"><CIcon name="Plus" size={11}/>Nova cerca</button>
        </div>
      </div>

      <Card noPadding>
        <div className="list-row" style={{ gridTemplateColumns: "48px 24px 1fr 140px 120px 80px 140px 80px", paddingTop: 8, paddingBottom: 8, background: "var(--bg-card-2)", fontWeight: 600, color: "var(--fg-dim)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          <div/><div/><div>Cerca</div><div>Responsável</div><div>Cadastro</div><div>Score</div><div>Engaj.</div><div className="text-right">Ações</div>
        </div>
        {CERCAS.map(n => row(n, 0))}
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Regionais" value="3" sub="1 vaga" tone="warn"/>
        <StatCard label="Territoriais" value="8" sub="1 vaga" tone="warn"/>
        <StatCard label="Bairros" value="11" sub="2 vagos" tone="danger"/>
        <StatCard label="Cobertura total" value="74%" sub="meta 90%" tone="ok"/>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, tone }) {
  const color = tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : tone === "danger" ? "var(--danger)" : "var(--fg-strong)";
  return (
    <div className="card p-4">
      <div className="text-[10px] t-fg-dim uppercase tracking-wider font-semibold mb-1.5">{label}</div>
      <div className="text-[26px] font-black tnum font-display" style={{ color }}>{value}</div>
      <div className="text-[10.5px] t-fg-muted mt-0.5">{sub}</div>
    </div>
  );
}

/* ---------- Tela 5 · Cadastro de Lideranças ---------- */
function Tela5Cadastro() {
  const [q, setQ] = React.useState("");
  const [filtro, setFiltro] = React.useState("todos");
  const [editing, setEditing] = React.useState(null);

  const filtered = LIDERANCAS.filter(l => {
    if (filtro === "vagas") return false;
    if (filtro === "ouro" && l.tier !== "ouro") return false;
    if (filtro === "mulher" && !l.tags.includes("Mulher")) return false;
    if (q && !(l.nome.toLowerCase().includes(q.toLowerCase()) || l.cidade.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="p-6" style={{ maxWidth: 1680, margin: "0 auto" }}>
      <div className="grid grid-cols-[1fr_400px] gap-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-black font-display t-fg-strong">Lideranças</h1>
              <div className="text-[12px] t-fg-muted mt-0.5">{filtered.length} de {LIDERANCAS.length} · cadastros, tiers, cercas</div>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 h-[34px] rounded-md" style={{ background: "var(--rule)", width: 260 }}>
                <CIcon name="Search" size={12} className="t-fg-dim"/>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome ou cidade…" className="flex-1 bg-transparent outline-none text-[12px]" style={{ color: "var(--fg)" }}/>
              </div>
              <Segment value={filtro} onChange={setFiltro} options={[{value:"todos",label:"Todos"},{value:"ouro",label:"Ouro"},{value:"mulher",label:"Mulheres"}]}/>
              <button className="btn-primary"><CIcon name="UserPlus" size={11}/>Cadastrar</button>
            </div>
          </div>

          <Card noPadding>
            <div className="list-row" style={{ gridTemplateColumns: "1fr 140px 140px 80px 100px 80px", paddingTop: 8, paddingBottom: 8, background: "var(--bg-card-2)", fontWeight: 600, color: "var(--fg-dim)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <div>Nome</div><div>Papel</div><div>Cerca</div><div>Tier</div><div className="text-right">Influência</div><div className="text-right">Score</div>
            </div>
            {filtered.map(l => (
              <div key={l.id} className="list-row" style={{ gridTemplateColumns: "1fr 140px 140px 80px 100px 80px", cursor: "pointer" }} onClick={() => setEditing(l)}>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar nome={l.nome} size={30}/>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold t-fg-strong truncate">{l.nome}</div>
                    <div className="text-[10.5px] t-fg-dim truncate">{l.cidade} · {l.tags.join(" · ")}</div>
                  </div>
                </div>
                <div className="text-[11.5px] t-fg-muted truncate">{l.papel}</div>
                <div className="text-[11.5px] t-fg-muted truncate">{l.cerca || "—"}</div>
                <div><TierPill tier={l.tier}/></div>
                <div className="text-[11.5px] tnum t-fg text-right">{l.eleitoresInfluenciados.toLocaleString("pt-BR")}</div>
                <div className="text-[13px] font-bold tnum text-right" style={{ color: l.score >= 80 ? "var(--ok)" : l.score >= 60 ? "var(--warn)" : "var(--danger)" }}>{l.score}</div>
              </div>
            ))}
          </Card>
        </div>

        {/* Formulário lateral (ou Edit pane) */}
        <Card title={editing ? "Editar liderança" : "Cadastrar liderança"} sub={editing ? editing.nome : "Formulário rápido"}
              right={editing && <button className="btn-ghost" onClick={() => setEditing(null)} style={{ padding: "5px 7px" }}><CIcon name="X" size={11}/></button>}>
          <div className="space-y-3">
            {[
              { label: "Nome completo",     val: editing?.nome || "",       ph: "Ex: Rita Lima" },
              { label: "Papel",             val: editing?.papel || "",      ph: "Cabo Eleitoral" },
              { label: "Telefone · WhatsApp",val: editing?.telefone || "",   ph: "(75) 9 ..." },
              { label: "Cidade",            val: editing?.cidade || "",     ph: "Feira de Santana" },
              { label: "Cerca",             val: editing?.cerca || "",      ph: "Tomba" },
            ].map((f, i) => (
              <Field key={i} label={f.label}>
                <input defaultValue={f.val} placeholder={f.ph}
                       className="w-full h-[34px] px-3 rounded-md outline-none text-[12.5px]"
                       style={{ background: "var(--rule)", color: "var(--fg)" }}/>
              </Field>
            ))}

            <Field label="Tier">
              <div className="flex gap-1.5">
                {["ouro","prata","bronze"].map(t => (
                  <button key={t} className={`btn-ghost ${editing?.tier === t ? "active" : ""}`} style={{ flex: 1, justifyContent: "center", padding: "7px 8px" }}>{t.toUpperCase()}</button>
                ))}
              </div>
            </Field>

            <Field label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {["Mulher","Jovem","Idoso","Religioso","Comunidade","Destaque","Atenção"].map(t => {
                  const on = editing?.tags?.includes(t);
                  return <span key={t} className={`chip ${on ? "chip-blue" : "chip-gray"}`} style={{ cursor: "pointer" }}>{t}</span>;
                })}
              </div>
            </Field>

            <div className="flex gap-2 pt-2">
              <button className="btn-primary flex-1" style={{ justifyContent: "center" }}>
                <CIcon name="CheckCircle" size={12}/>
                Salvar
              </button>
              <button className="btn-ghost" style={{ padding: "8px 12px" }}>Cancelar</button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] t-fg-dim uppercase tracking-wider font-semibold mb-1.5">{label}</div>
      {children}
    </div>
  );
}

/* ---------- Tela 6 · CRM Aniversariantes + Follow-ups ---------- */
function Tela6CRM() {
  const hoje = new Date(2026, 2, 14); // 14 mar 2026 (ref demo)
  const comAniv = LIDERANCAS.map(l => ({ ...l, aniv: proximoAniversario(l.aniversario, hoje) })).sort((a,b) => a.aniv.diffDays - b.aniv.diffDays);
  const proximos7 = comAniv.filter(l => l.aniv.diffDays <= 7);
  const proximos30 = comAniv.filter(l => l.aniv.diffDays > 7 && l.aniv.diffDays <= 30);

  return (
    <div className="p-6 space-y-5" style={{ maxWidth: 1680, margin: "0 auto" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black font-display t-fg-strong">CRM · relacionamento</h1>
          <div className="text-[12px] t-fg-muted mt-0.5">Aniversários, follow-ups, contatos agendados</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost"><CIcon name="Calendar" size={11}/>Mês de março</button>
          <button className="btn-primary"><CIcon name="Plus" size={11}/>Nova lembrança</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiTile label="Aniversariantes hoje"    valor={comAniv.filter(l => l.aniv.diffDays === 0).length.toString()} sub="plano de contato pronto" sentiment="up"/>
        <KpiTile label="Próximos 7 dias"          valor={proximos7.length.toString()}                    sub="ligações programadas"/>
        <KpiTile label="Follow-ups pendentes"     valor="23"                                             delta="-4" sentiment="up" sub="vs semana anterior"/>
        <KpiTile label="Taxa de resposta"         valor="78%"                                            delta="+6pp" sentiment="up" sub="WhatsApp · 30d"/>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-4">
        <Card title="Próximos aniversariantes" sub="7 dias" noPadding>
          {proximos7.length === 0 && <div className="p-8 text-center text-[12px] t-fg-dim">Nenhum aniversariante nos próximos 7 dias.</div>}
          {proximos7.map((l, i) => (
            <div key={l.id} className="list-row" style={{ gridTemplateColumns: "60px 30px 1fr 120px 90px auto" }}>
              <div className="text-center">
                <div className="text-[11px] font-bold tnum t-fg-strong">{l.aniv.date.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</div>
                <div className="text-[9.5px] t-fg-dim uppercase">{l.aniv.diffDays === 0 ? "hoje" : l.aniv.diffDays === 1 ? "amanhã" : `em ${l.aniv.diffDays}d`}</div>
              </div>
              <Avatar nome={l.nome} size={28}/>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[12.5px] font-semibold t-fg-strong truncate">{l.nome}</div>
                  <TierPill tier={l.tier}/>
                </div>
                <div className="text-[10.5px] t-fg-dim truncate">{l.papel} · {l.cidade}</div>
              </div>
              <div className="text-[11px] t-fg-muted">
                <div>{new Date().getFullYear() - new Date(l.aniversario).getFullYear()} anos</div>
                <div className="t-fg-faint">{l.telefone}</div>
              </div>
              <div className="flex gap-1">
                {l.whats && <span className="chip chip-green" style={{ height: 18 }}>WA</span>}
                <span className="chip chip-gray" style={{ height: 18 }}>CALL</span>
              </div>
              <div className="flex gap-1">
                <button className="btn-ghost" style={{ padding: "5px 8px" }}><CIcon name="MessageCircle" size={11}/></button>
                <button className="btn-primary" style={{ padding: "5px 10px", fontSize: 10.5 }}>Preparar</button>
              </div>
            </div>
          ))}
        </Card>

        <div className="space-y-4">
          <Card title="Plano do dia" sub="Copiloto · auto-gerado">
            <div className="space-y-2.5">
              {[
                { h: "10:30", t: "Ligar para Helena Barreto", ctx: "Tomba · pauta: apoio domingo" },
                { h: "14:00", t: "Mensagem para Pastor Elias", ctx: "aniversário amanhã · sugestão de buquê" },
                { h: "16:30", t: "Visita Cachoeira · Paula", ctx: "reforço de cadastros" },
                { h: "18:00", t: "Retornar Marcos Oliveira",  ctx: "queda de engajamento Brasília" },
              ].map((it, i) => (
                <div key={i} className="flex items-start gap-3 pb-2.5" style={{ borderBottom: i < 3 ? "1px solid var(--rule)" : "none" }}>
                  <div className="text-[11px] tnum font-mono t-fg-dim w-10 flex-shrink-0 mt-0.5">{it.h}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold t-fg-strong">{it.t}</div>
                    <div className="text-[10.5px] t-fg-muted">{it.ctx}</div>
                  </div>
                  <input type="checkbox" className="mt-1"/>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Mais em 30 dias" sub={`${proximos30.length} pessoas`} noPadding>
            {proximos30.slice(0, 5).map(l => (
              <div key={l.id} className="list-row" style={{ gridTemplateColumns: "50px 1fr 40px" }}>
                <div className="text-[10.5px] tnum t-fg-dim">{l.aniv.date.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</div>
                <div className="text-[11.5px] t-fg-strong truncate">{l.nome}</div>
                <TierPill tier={l.tier}/>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------- Tela 7 · Chat Sigiloso ---------- */
function Tela7Chat({ modoFurtivoDefault }) {
  const [canal, setCanal] = React.useState(CHAT_CANAIS[0]);
  const [furtivo, setFurtivo] = React.useState(modoFurtivoDefault === "furtivo");
  const msgs = CHAT_MENSAGENS[canal.id] || [];

  return (
    <div className="h-full w-full flex" style={{ background: "var(--bg-page-2)" }}>
      {/* channel list */}
      <aside className="w-[300px] flex-shrink-0 border-r overflow-y-auto thin-scroll flex flex-col" style={{ borderColor: "var(--rule)", background: "var(--bg-card)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="flex items-center gap-2 mb-3">
            <CIcon name="Shield" size={14} style={{ color: "var(--tenant-primary)" }}/>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-bold t-fg-strong">Canais seguros</div>
              <div className="text-[10px] t-fg-dim">E2E · registros auditáveis</div>
            </div>
            <button className="btn-ghost" style={{ padding: "5px 7px" }}><CIcon name="Plus" size={11}/></button>
          </div>
          <div className="flex items-center gap-2 px-3 h-[30px] rounded-md" style={{ background: "var(--rule)" }}>
            <CIcon name="Search" size={11} className="t-fg-dim"/>
            <input placeholder="Buscar canal…" className="flex-1 bg-transparent outline-none text-[11.5px]" style={{ color: "var(--fg)" }}/>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {CHAT_CANAIS.map(c => {
            const active = canal.id === c.id;
            return (
              <div key={c.id} onClick={() => setCanal(c)}
                   className="px-4 py-3 cursor-pointer"
                   style={{ background: active ? "var(--rule-strong)" : "transparent", borderBottom: "1px solid var(--rule)" }}
                   onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--chart-hover)"; }}
                   onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <div className="flex items-center gap-2 mb-1">
                  {c.furtivo && <CIcon name="Lock" size={10} style={{ color: "var(--warn)" }}/>}
                  <div className="text-[12px] font-semibold t-fg-strong flex-1 truncate">{c.nome}</div>
                  <div className="text-[9.5px] t-fg-dim">{c.ultima}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[11px] t-fg-muted flex-1 truncate">{c.furtivo ? <span className="italic t-fg-faint">Mensagem protegida</span> : c.preview}</div>
                  {c.unread > 0 && <span className="chip chip-red" style={{ height: 16, minWidth: 16, justifyContent: "center", fontSize: 9.5 }}>{c.unread}</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="chip chip-gray" style={{ height: 15, fontSize: 9 }}>{c.tipo.toUpperCase()}</span>
                  <span className="text-[9.5px] t-fg-faint">· {c.membros} membros · {c.classificacao}</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* chat body */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-5 h-[56px] flex-shrink-0 border-b" style={{ borderColor: "var(--rule)", background: "var(--bg-card)" }}>
          <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: "var(--tenant-primary)", color: "#fff" }}>
            <CIcon name={canal.tipo === "direto" ? "User" : "Users"} size={14}/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-[13px] font-bold t-fg-strong">{canal.nome}</div>
              {canal.furtivo && <span className="chip chip-amber"><CIcon name="Lock" size={9}/>FURTIVO</span>}
              <span className="chip chip-gray">{canal.classificacao.toUpperCase()}</span>
            </div>
            <div className="text-[10.5px] t-fg-dim">{canal.membros} membros · última atividade {canal.ultima} atrás</div>
          </div>
          <button className="btn-ghost" onClick={() => setFurtivo(!furtivo)} title="Modo furtivo (burn-after-read)">
            <CIcon name={furtivo ? "EyeOff" : "Eye"} size={11}/>
            {furtivo ? "Furtivo ON" : "Furtivo OFF"}
          </button>
          <button className="btn-ghost" style={{ padding: "6px 8px" }}><CIcon name="Phone" size={11}/></button>
          <button className="btn-ghost" style={{ padding: "6px 8px" }}><CIcon name="MoreHorizontal" size={11}/></button>
        </div>

        <div className="flex-1 overflow-y-auto thin-scroll px-6 py-5 space-y-3" style={{ background: "var(--bg-page-2)" }}>
          <div className="flex justify-center mb-4">
            <div className="px-3 py-1.5 rounded-full text-[10.5px] flex items-center gap-1.5" style={{ background: "rgba(217,119,6,0.1)", color: "var(--warn)", border: "1px solid rgba(217,119,6,0.25)" }}>
              <CIcon name="Shield" size={10}/>
              Conversa cifrada ponta-a-ponta · log de auditoria apenas em acesso judicial
            </div>
          </div>

          {msgs.map(m => (
            <div key={m.id} className={`flex gap-2 ${m.me ? "justify-end" : "justify-start"}`}>
              {!m.me && <Avatar nome={m.autor} size={26}/>}
              <div className={m.me ? "text-right" : ""} style={{ maxWidth: "75%" }}>
                {!m.me && <div className="text-[10px] t-fg-dim font-semibold mb-0.5">{m.autor} · <span className="t-fg-faint">{m.papel}</span></div>}
                <div className={`msg-bubble ${m.me ? "msg-me" : "msg-them"}`}>
                  {m.texto}
                  {m.anexo && (
                    <div className={`mt-2 px-2.5 py-2 rounded-md flex items-center gap-2 text-[10.5px]`} style={{ background: m.me ? "rgba(255,255,255,0.14)" : "var(--bg-card)" }}>
                      <CIcon name="FileText" size={11}/>
                      {m.anexo}
                    </div>
                  )}
                </div>
                <div className="text-[9.5px] t-fg-faint mt-0.5 flex items-center gap-1 justify-end">
                  <span>{m.hora}</span>
                  {m.me && <CIcon name="CheckCircle" size={9} style={{ color: m.status === "lido" ? "var(--ok)" : "var(--fg-faint)" }}/>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-shrink-0 px-5 py-3 border-t" style={{ borderColor: "var(--rule)", background: "var(--bg-card)" }}>
          {furtivo && (
            <div className="mb-2 px-3 py-1.5 rounded-md text-[10.5px] flex items-center gap-2" style={{ background: "rgba(217,119,6,0.08)", color: "var(--warn)", border: "1px solid rgba(217,119,6,0.2)" }}>
              <CIcon name="Clock" size={10}/>
              Modo furtivo: mensagem expira em 24h e não é armazenada após leitura.
            </div>
          )}
          <div className="flex items-end gap-2">
            <button className="btn-ghost" style={{ padding: "8px" }}><CIcon name="Paperclip" size={12}/></button>
            <textarea rows={1} placeholder="Escrever mensagem segura…" className="flex-1 resize-none rounded-md px-3 py-2 text-[12.5px] outline-none"
                      style={{ background: "var(--rule)", color: "var(--fg)", minHeight: 36, maxHeight: 120 }}/>
            <button className="btn-primary" style={{ padding: "8px 14px" }}>
              <CIcon name="Send" size={12}/>
              Enviar
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] t-fg-dim">
            <div>Delegado → {canal.nome} · membros vinculados à cerca</div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><CIcon name="Lock" size={9}/>E2E</span>
              <span className="flex items-center gap-1"><CIcon name="Shield" size={9}/>Compliance LGPD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Tela 8 · Ranking + Heatmap ---------- */
function Tela8Ranking() {
  const [view, setView] = React.useState("lista");

  return (
    <div className="p-6 space-y-5" style={{ maxWidth: 1680, margin: "0 auto" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black font-display t-fg-strong">Ranking & heatmap</h1>
          <div className="text-[12px] t-fg-muted mt-0.5">Produtividade individual · engajamento por cerca/dia</div>
        </div>
        <div className="flex gap-2">
          <Segment value={view} onChange={setView} options={[{value:"lista",label:"Ranking"},{value:"heatmap",label:"Heatmap"}]}/>
          <button className="btn-ghost"><CIcon name="Download" size={11}/>Exportar</button>
        </div>
      </div>

      {view === "lista" && (
        <div className="grid grid-cols-[1fr_380px] gap-4">
          <Card title="Ranking do mês" sub={`${RANKING.length} lideranças · ordenado por score`} noPadding>
            <div className="list-row" style={{ gridTemplateColumns: "40px 32px 1fr 90px 90px 80px 70px", paddingTop: 8, paddingBottom: 8, background: "var(--bg-card-2)", fontWeight: 600, color: "var(--fg-dim)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <div className="text-center">#</div><div/><div>Liderança</div><div>Papel</div><div className="text-right">Cadastros</div><div className="text-right">Δ</div><div className="text-right">Score</div>
            </div>
            {RANKING.slice(0, 12).map((l) => (
              <div key={l.id} className="list-row" style={{ gridTemplateColumns: "40px 32px 1fr 90px 90px 80px 70px" }}>
                <div className="text-center">
                  {l.posicao <= 3 ? (
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-[11px] tier-${l.posicao === 1 ? "ouro" : l.posicao === 2 ? "prata" : "bronze"}`}>{l.posicao}</span>
                  ) : (
                    <span className="text-[12px] font-bold tnum t-fg-muted">{l.posicao}</span>
                  )}
                </div>
                <Avatar nome={l.nome} size={28}/>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold t-fg-strong truncate">{l.nome}</div>
                  <div className="text-[10.5px] t-fg-dim truncate">{l.cidade} · {l.cerca}</div>
                </div>
                <div className="text-[11px] t-fg-muted truncate">{l.papel}</div>
                <div className="text-right text-[12px] font-bold tnum t-fg">{l.cadastrosMes}</div>
                <div className="text-right text-[11px] font-bold tnum" style={{ color: l.variacao > 0 ? "var(--ok)" : l.variacao < 0 ? "var(--danger)" : "var(--fg-dim)" }}>
                  {l.variacao > 0 ? `↑${l.variacao}` : l.variacao < 0 ? `↓${Math.abs(l.variacao)}` : "—"}
                </div>
                <div className="text-right text-[13px] font-bold tnum" style={{ color: l.score >= 80 ? "var(--ok)" : l.score >= 60 ? "var(--warn)" : "var(--danger)" }}>{l.score}</div>
              </div>
            ))}
          </Card>

          <div className="space-y-4">
            <Card title="Pódio · ouro" sub="Top 3 do mês">
              <div className="space-y-3">
                {RANKING.slice(0, 3).map((l, i) => (
                  <div key={l.id} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[15px] tier-${i === 0 ? "ouro" : i === 1 ? "prata" : "bronze"}`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-bold t-fg-strong">{l.nome}</div>
                      <div className="text-[10.5px] t-fg-dim">{l.cerca} · {l.cadastrosMes} cadastros</div>
                    </div>
                    <div className="text-[16px] font-black tnum font-display" style={{ color: "var(--ok)" }}>{l.score}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Gamificação" sub="Regras ativas">
              <div className="space-y-2 text-[11.5px]">
                {[
                  { icon: "Zap",    t: "+1 pt",  d: "por liderança cadastrada" },
                  { icon: "Star",   t: "+5 pt",  d: "por liderança com tag Destaque" },
                  { icon: "Heart",  t: "+2 pt",  d: "por contato ativo (WhatsApp ≤ 7d)" },
                  { icon: "Target", t: "+20 pt", d: "por cerca 100% da meta" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1">
                    <CIcon name={r.icon} size={13} className="t-fg-dim"/>
                    <span className="font-bold tnum t-fg-strong w-10">{r.t}</span>
                    <span className="t-fg-muted flex-1">{r.d}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {view === "heatmap" && (
        <Card title="Engajamento diário por cerca" sub="12 semanas · darker = mais engajamento">
          <div style={{ display: "grid", gridTemplateColumns: "140px repeat(84, 1fr)", gap: 2, fontSize: 9.5 }}>
            <div/>
            {Array.from({ length: 84 }, (_, i) => (
              <div key={i} className="text-center t-fg-faint" style={{ fontSize: 8, visibility: i % 7 === 0 ? "visible" : "hidden" }}>W{Math.floor(i/7) + 1}</div>
            ))}
            {HEATMAP_CERCAS.map(c => (
              <React.Fragment key={c.nome}>
                <div className="text-[10.5px] t-fg-strong font-semibold py-0.5 truncate">{c.nome}</div>
                {c.dias.map((v, d) => (
                  <div key={d} title={`${c.nome} · ${v}%`}
                       style={{ height: 14, borderRadius: 2,
                                background: `rgba(29, 78, 216, ${Math.max(0.05, v/100)})`,
                                border: v < 20 ? "1px solid rgba(220,38,38,0.4)" : "none" }}/>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4 text-[10.5px] t-fg-dim">
            <span>Baixo</span>
            {[0.1, 0.3, 0.5, 0.7, 0.9].map(op => <span key={op} style={{ width: 18, height: 12, background: `rgba(29, 78, 216, ${op})`, borderRadius: 2 }}/>)}
            <span>Alto</span>
            <div className="flex-1"/>
            <span className="flex items-center gap-1"><span style={{ width: 10, height: 10, border: "1.5px solid var(--danger)", borderRadius: 2 }}/> &lt; 20% · alerta</span>
          </div>
        </Card>
      )}
    </div>
  );
}

Object.assign(window, { Tela4Arvore, Tela5Cadastro, Tela6CRM, Tela7Chat, Tela8Ranking });
