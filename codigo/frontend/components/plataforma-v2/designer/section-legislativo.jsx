/* Section 05 — Atividade Legislativa */

function LegislativoCard({ title, count, tone, items }) {
  const map = {
    green:  { chip:"chip-green",  fg:"var(--ok)" },
    amber:  { chip:"chip-amber",  fg:"var(--warn)" },
    red:    { chip:"chip-red",    fg:"var(--danger)" },
  };
  const c = map[tone];
  return (
    <div className="rounded-xl p-5 flex flex-col" style={{ background:"var(--bg-card-2)", border:"1px solid var(--rule)" }}>
      <div className="flex items-baseline justify-between">
        <div className={`chip ${c.chip}`}>{title}</div>
        <div className="text-[36px] font-black font-display tnum" style={{ color: c.fg }}>{String(count).padStart(2,"0")}</div>
      </div>
      <div className="mt-4 pt-4 space-y-2.5" style={{ borderTop:"1px solid var(--rule)" }}>
        <div className="text-[9px] font-mono tracking-[0.2em] uppercase t-fg-dim">Últimas 3</div>
        {items.map((it, i) => (
          <a key={i} href="#" className="block group">
            <div className="text-[12px] t-fg group-hover:t-fg-strong leading-snug">{it.em}</div>
            <div className="text-[10px] font-mono t-fg-dim mt-0.5 flex items-center gap-1.5">
              <span>{it.data}</span>
              <ExternalIcon size={9}/>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function AtividadeLegislativa({ profile }) {
  const L = profile.legislativo;
  if (!L.disponivel) {
    return (
      <SectionShell id="sec-legislativo" label="05 Legislativo" title="Atividade Legislativa" sub="mandato ativo">
        <EmptyState icon={<FileTextIcon size={28}/>} title="Sem mandato legislativo ativo"
          text="Este candidato não possui mandato parlamentar ativo no período analisado."/>
      </SectionShell>
    );
  }

  const cargoCls = (c) => ({
    "Presidente":"chip-green",
    "Vice":"chip-blue",
    "Titular":"chip-muted",
    "Suplente":"chip-amber",
    "Relator":"chip-purple",
  }[c] || "chip-muted");

  return (
    <SectionShell id="sec-legislativo" label="05 Legislativo" title="Atividade Legislativa" sub="PLs · comissões · relatorias"
      kicker={<><span>Mandato: <span className="t-fg-strong">Senador · BA</span></span><span className="t-fg-ghost mx-2">·</span><span>2019–2027</span></>}>
      <div className="grid grid-cols-3 gap-4">
        <LegislativoCard title="Aprovados" count={L.aprovados.count} tone="green" items={L.aprovados.recentes}/>
        <LegislativoCard title="Em tramitação" count={L.tramitando.count} tone="amber" items={L.tramitando.recentes}/>
        <LegislativoCard title="Vetados" count={L.vetados.count} tone="red" items={L.vetados.recentes}/>
      </div>

      {/* comissões */}
      <div className="mt-6 rounded-xl overflow-hidden" style={{ background:"var(--bg-card-2)", border:"1px solid var(--rule)" }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom:"1px solid var(--rule)" }}>
          <div className="text-[11px] font-bold tracking-[0.15em] uppercase t-fg-strong">Comissões atuais</div>
          <div className="text-[10px] font-mono t-fg-dim">{L.comissoes.length} comissões</div>
        </div>
        <div>
          {L.comissoes.map((c, i) => (
            <div key={c.sigla} className="px-5 py-3 flex items-center gap-4"
              style={i>0?{borderTop:"1px solid var(--rule)"}:{}}>
              <div className="text-[11px] font-mono font-bold t-fg-strong w-14">{c.sigla}</div>
              <div className="flex-1 text-[13px] t-fg">{c.nome}</div>
              <span className={`chip ${cargoCls(c.cargo)}`}>{c.cargo}</span>
              <div className="text-[10px] font-mono tracking-[0.15em] uppercase flex items-center gap-1.5"
                style={{ color: c.ativa ? "var(--ok)" : "var(--fg-dim)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.ativa ? "var(--ok)" : "var(--fg-dim)" }}/>
                {c.ativa ? "Ativa" : "Inativa"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* relatorias */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-bold tracking-[0.15em] uppercase t-fg-strong">Relatorias recentes</div>
          <div className="text-[10px] font-mono t-fg-dim">Top 5</div>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border:"1px solid var(--rule)" }}>
          {L.relatorias.map((r, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-4"
              style={{ background: i%2===0 ? "var(--bg-card-2)" : "transparent", ...(i>0?{borderTop:"1px solid var(--rule)"}:{}) }}>
              <div className="flex-1 text-[13px] t-fg">{r.em}</div>
              <div className="text-[10px] font-mono t-fg-dim w-16 text-right">{r.data}</div>
              <span className={`chip ${r.situ==="Aprovado"?"chip-green":r.situ==="Arquivado"?"chip-red":"chip-amber"} w-[88px] justify-center`}>{r.situ}</span>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

Object.assign(window, { AtividadeLegislativa });
