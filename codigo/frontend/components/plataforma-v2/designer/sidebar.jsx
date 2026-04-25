/* Sidebar + top bar */

const NAV = [
  { n: "01", id: "sec-identidade",  label: "Identidade",           Icon: UserIcon },
  { n: "02", id: "sec-overall",     label: "Overall",              Icon: TargetIcon },
  { n: "03", id: "sec-mapa",        label: "Mapa eleitoral",       Icon: MapPinIcon },
  { n: "04", id: "sec-trajetoria",  label: "Trajetória",           Icon: GitBranchIcon },
  { n: "05", id: "sec-legislativo", label: "Atividade legislativa",Icon: FileTextIcon },
  { n: "06", id: "sec-alertas",     label: "Alertas jurídicos",    Icon: AlertTriIcon },
  { n: "07", id: "sec-financeiro",  label: "Financeiro",           Icon: WalletIcon },
  { n: "08", id: "sec-emendas",     label: "Emendas",              Icon: BanknoteIcon },
  { n: "09", id: "sec-perfil",      label: "Perfil",               Icon: UserCircleIcon },
];

function Sidebar({ profile, activeId, onNavClick, scrollPct }) {
  return (
    <aside className="sidebar-col sticky top-0 self-start h-screen flex flex-col t-bg-sidebar" style={{ borderRight:"1px solid var(--rule)" }}>
      <div className="px-5 pt-5 pb-4">
        <div className="text-[10px] font-mono tracking-[0.25em] t-fg-dim">DOSSIÊ</div>
        <div className="text-[14px] font-bold t-fg-strong mt-0.5 leading-tight">
          {profile.firstName} {profile.lastName}
        </div>
        <div className="text-[10px] font-mono t-fg-dim mt-0.5">{profile.meta}</div>
      </div>
      <div className="flex-1 overflow-y-auto py-2 relative">
        {/* progress bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background:"var(--rule)" }}>
          <div className="w-full" style={{ height:`${scrollPct*100}%`, background:"var(--accent-blue-strong)", transition:"height .15s" }}/>
        </div>
        <nav className="flex flex-col py-2" style={{ gap: 2 }}>
          {NAV.map(it => {
            const active = it.id === activeId;
            const Icon = it.Icon;
            return (
              <a key={it.id} href={`#${it.id}`} onClick={(e)=>{ e.preventDefault(); onNavClick(it.id); }}
                className={`nav-item ${active?"active":""}`}>
                <span className="nav-num">{it.n}</span>
                <Icon size={13}/>
                <span>{it.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
      <div className="px-4 pt-3 pb-4 flex flex-col gap-2" style={{ borderTop:"1px solid var(--rule)" }}>
        <button className="btn-ghost flex items-center justify-center gap-2">
          <DownloadIcon size={12}/><span>Baixar PDF</span>
        </button>
        <button className="btn-ghost flex items-center justify-center gap-2">
          <EditIcon size={12}/><span>Modo de edição</span>
        </button>
      </div>
    </aside>
  );
}

function TopBar({ profile, theme, onToggleTheme }) {
  return (
    <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom:"1px solid var(--rule)" }}>
      <div className="text-[10px] font-mono tracking-[0.2em] t-fg-dim flex items-center gap-2">
        <span>DOSSIÊ</span>
        <span className="t-fg-ghost">/</span>
        <span>candidato</span>
        <span className="t-fg-ghost">/</span>
        <span className="t-fg uppercase">{profile.firstName} {profile.lastName}</span>
      </div>
      <div className="flex items-center gap-4 text-[11px] font-mono t-fg-dim">
        <span>v2.4.1</span>
        <span className="t-fg-ghost">·</span>
        <span>atualizado há 2h</span>
        <button onClick={onToggleTheme} className="btn-ghost flex items-center gap-1.5">
          {theme==="dark" ? <SunIcon size={12}/> : <MoonIcon size={12}/>}
          <span>{theme==="dark"?"Light":"Dark"}</span>
        </button>
        <button className="btn-ghost flex items-center gap-1.5">
          <ArrowLIcon size={12}/><span>Voltar</span>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, TopBar, NAV });
