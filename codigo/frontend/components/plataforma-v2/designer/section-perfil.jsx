/* Section 09 — Perfil */

function SocialCard({ r }) {
  const icons = { Instagram: InstaIcon, Twitter: TwitterIcon, Facebook: FacebookIcon, YouTube: YoutubeIcon, TikTok: TiktokIcon };
  const Icon = icons[r.rede] || InstaIcon;
  return (
    <div className="rounded-lg p-3 flex items-center gap-3" style={{ background:"var(--bg-card-2)", border:"1px solid var(--rule)" }}>
      <div className="flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center" style={{ background:"var(--rule)", color:"var(--fg)" }}>
        <Icon size={16}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="text-[12px] font-semibold t-fg-strong truncate">{r.handle}</div>
          {r.verificado && <span style={{color:"var(--verified)"}}><CheckIcon size={10} stroke={3}/></span>}
        </div>
        <div className="text-[10px] font-mono t-fg-dim mt-0.5 flex items-center gap-1.5">
          <span className="tnum">{r.seguidores}</span>
          <span className="t-fg-ghost">·</span>
          <span>eng. {r.engajamento}</span>
        </div>
      </div>
    </div>
  );
}

function Perfil({ profile }) {
  const P = profile.perfil;
  return (
    <SectionShell id="sec-perfil" label="09 Perfil" title="Perfil" sub="biografia · redes · contato">
      <div className="grid gap-8" style={{ gridTemplateColumns: "1fr 360px" }}>
        <div>
          <div className="text-[11px] font-bold tracking-[0.15em] uppercase t-fg-strong mb-3">Biografia</div>
          <p className="text-[14px] t-fg leading-[1.7]" style={{ textWrap:"pretty" }}>{P.bioLong}</p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg p-4" style={{ background:"var(--bg-card-2)", border:"1px solid var(--rule)" }}>
              <div className="text-[10px] font-mono tracking-[0.15em] uppercase t-fg-dim">Nascimento</div>
              <div className="text-[13px] font-semibold t-fg-strong mt-1">{P.nascimento}</div>
            </div>
            <div className="rounded-lg p-4" style={{ background:"var(--bg-card-2)", border:"1px solid var(--rule)" }}>
              <div className="text-[10px] font-mono tracking-[0.15em] uppercase t-fg-dim">Formação</div>
              <div className="text-[13px] font-semibold t-fg-strong mt-1">{P.formacao}</div>
            </div>
          </div>

          <div className="mt-4 rounded-lg p-4" style={{ background:"var(--bg-card-2)", border:"1px solid var(--rule)" }}>
            <div className="text-[10px] font-mono tracking-[0.15em] uppercase t-fg-dim mb-2">Histórico partidário</div>
            <div className="flex flex-wrap gap-2">
              {P.partidos.map((p, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
                  style={{ background:"var(--rule)" }}>
                  <span className="text-[11px] font-bold tracking-[0.1em] t-fg-strong">{p.p}</span>
                  <span className="text-[10px] font-mono t-fg-dim">desde {p.desde}</span>
                </div>
              ))}
            </div>
          </div>

          {(P.gabinete !== "—" || P.email !== "—") && (
            <div className="mt-4 rounded-lg p-4" style={{ background:"var(--bg-card-2)", border:"1px solid var(--rule)" }}>
              <div className="text-[10px] font-mono tracking-[0.15em] uppercase t-fg-dim mb-2">Contato oficial</div>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-[12px]">
                  <BriefcaseIcon size={12} className="mt-0.5" style={{color:"var(--fg-dim)"}}/>
                  <span className="t-fg">{P.gabinete}</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] font-mono">
                  <span style={{color:"var(--fg-dim)"}}>@</span>
                  <span className="t-accent">{P.email}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-bold tracking-[0.15em] uppercase t-fg-strong mb-3">Redes sociais</div>
          <div className="space-y-2">
            {P.redes.map(r => <SocialCard key={r.rede} r={r}/>)}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

Object.assign(window, { Perfil });
