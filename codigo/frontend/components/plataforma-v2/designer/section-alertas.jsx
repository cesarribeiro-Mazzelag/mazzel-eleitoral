/* Section 06 — Alertas Jurídicos */

function AlertasJuridicos({ profile }) {
  const A = profile.alertas;
  if (!A.itens.length && A.fichaLimpa) {
    return (
      <SectionShell id="sec-alertas" label="06 Alertas" title="Alertas Jurídicos" sub="sanções e processos">
        <EmptyState tone="ok" icon={<CheckIcon size={28}/>} title="Ficha limpa — sem sanções ativas"
          text="Não há registros do candidato nos cadastros CEIS, CEAF ou TCU no período verificado."/>
      </SectionShell>
    );
  }

  const sevMap = {
    critico: { cls:"sev-critico", chip:"chip-red",    label:"Crítico" },
    alto:    { cls:"sev-alto",    chip:"chip-red",    label:"Alto" },
    medio:   { cls:"sev-medio",   chip:"chip-amber",  label:"Médio" },
    baixo:   { cls:"sev-baixo",   chip:"chip-muted",  label:"Baixo" },
  };

  return (
    <SectionShell id="sec-alertas" label="06 Alertas" title="Alertas Jurídicos" sub="sanções e processos"
      kicker={<span>{A.itens.length} {A.itens.length===1?"alerta":"alertas"} · última verif. ontem</span>}>
      <div className="space-y-3">
        {A.itens.map((it, i) => {
          const s = sevMap[it.severidade] || sevMap.baixo;
          return (
            <div key={i} className={`rounded-xl p-5 ${s.cls}`} style={{ background:"var(--bg-card-2)" }}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background:"rgba(239,68,68,0.10)", color:"var(--danger)" }}>
                  <AlertTriIcon size={18} stroke={2}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`chip ${s.chip}`}>{it.tipo}</span>
                    <span className="text-[10px] font-mono t-fg-dim tracking-[0.15em] uppercase">{it.orgao}</span>
                    <span className="t-fg-ghost">·</span>
                    <span className="text-[10px] font-mono t-fg-dim">{it.data}</span>
                    {it.valor && <>
                      <span className="t-fg-ghost">·</span>
                      <span className="text-[11px] font-mono font-bold tnum t-fg-strong">{it.valor}</span>
                    </>}
                    <span className="ml-auto text-[10px] font-bold tracking-[0.15em] uppercase"
                      style={{ color: it.severidade==="critico"||it.severidade==="alto"?"var(--danger)":it.severidade==="medio"?"var(--warn)":"var(--fg-muted)" }}>
                      {s.label}
                    </span>
                  </div>
                  <div className="mt-2 text-[13px] t-fg leading-snug">{it.desc}</div>
                  <a href={it.url} className="mt-2 inline-flex items-center gap-1 text-[11px] t-accent font-medium">
                    Ver fonte oficial <ExternalIcon size={10}/>
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

Object.assign(window, { AlertasJuridicos });
