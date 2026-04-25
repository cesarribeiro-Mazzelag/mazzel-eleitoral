/* Section 07 — Financeiro de campanha */

function BarRow({ k, v, max }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-[12px] t-fg w-36">{k}</div>
      <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background:"var(--rule)" }}>
        <div className="h-full rounded-md flex items-center justify-end pr-2"
          style={{ width:`${(v/max)*100}%`, background:"linear-gradient(90deg, #3b82f666, #60a5fa)" }}>
          <span className="text-[11px] font-mono font-bold tnum t-fg-strong">{v}%</span>
        </div>
      </div>
    </div>
  );
}

function Financeiro({ profile }) {
  const F = profile.financeiro;
  if (!F.disponivel) {
    return (
      <SectionShell id="sec-financeiro" label="07 Financeiro" title="Financeiro de Campanha" sub="arrecadação · gasto · CPV">
        <EmptyState icon={<WalletIcon size={28}/>} title="TSE ainda não publicou dados do ciclo"
          text="A prestação de contas do ciclo eleitoral atual ainda está em análise no TSE."/>
      </SectionShell>
    );
  }
  const max = Math.max(...F.fontes.map(f=>f.v));
  return (
    <SectionShell id="sec-financeiro" label="07 Financeiro" title="Financeiro de Campanha" sub="arrecadação · gasto · CPV"
      kicker={<span>Ciclo <span className="t-fg-strong tnum">2022</span> · TSE</span>}>
      <div className="grid grid-cols-3 gap-4">
        <KPI label="Arrecadado" value={F.arrecadado} tone="ok"/>
        <KPI label="Gasto" value={F.gasto}/>
        <KPI label="Saldo" value={F.saldo} tone={F.saldo.startsWith("-") ? "danger" : "ok"}/>
      </div>

      {/* CPV benchmark */}
      <div className="mt-6 rounded-xl p-5" style={{ background:"var(--bg-card-2)", border:"1px solid var(--rule)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase t-fg-dim">Custo por voto (CPV)</div>
            <div className="flex items-baseline gap-2 mt-1">
              <div className="text-[32px] font-black font-display tnum t-fg-strong">{F.cpv.valor}</div>
              <div className="text-[11px] t-fg-muted">/voto</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] t-fg-muted">{F.cpv.label}: <span className="font-mono t-fg tnum">{F.cpv.medianaCargo}</span></div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md"
              style={{ background:"rgba(34,197,94,0.10)", color:"var(--ok)" }}>
              <CheckIcon size={12} stroke={2.5}/>
              <span className="text-[12px] font-bold tnum">{Math.abs(F.cpv.deltaPct)}% abaixo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fontes */}
      <div className="mt-6">
        <div className="text-[11px] font-bold tracking-[0.15em] uppercase t-fg-strong mb-3">Origem das doações</div>
        <div className="space-y-2">
          {F.fontes.map(f => <BarRow key={f.k} k={f.k} v={f.v} max={max}/>)}
        </div>
      </div>

      {/* Top doadores */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-bold tracking-[0.15em] uppercase t-fg-strong">Top 10 doadores (PF)</div>
          <div className="text-[10px] font-mono t-fg-dim">ordenado por valor</div>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border:"1px solid var(--rule)" }}>
          {F.topDoadores.map((d, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-4"
              style={{ background: i%2===0 ? "var(--bg-card-2)" : "transparent", ...(i>0?{borderTop:"1px solid var(--rule)"}:{}) }}>
              <div className="text-[10px] font-mono t-fg-ghost w-6">{String(i+1).padStart(2,"0")}</div>
              <div className="flex-1 text-[13px] t-fg">{d.nome}</div>
              <div className="text-[13px] font-mono font-bold tnum t-fg-strong">{d.v}</div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

Object.assign(window, { Financeiro });
