/* Sidebar + Topbar + Cmd+K shell */

const { useState, useEffect, useRef, useMemo } = React;

function Icon({ name, size = 16, className = "", stroke = 1.8 }) {
  const s = size;
  const common = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", className };
  switch (name) {
    case "Home":     return <svg {...common}><path d="M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>;
    case "MapPin":   return <svg {...common}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
    case "Target":   return <svg {...common}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>;
    case "FileSearch":return <svg {...common}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7"/><path d="M14 3v5h5"/><circle cx="17" cy="17" r="3"/><path d="m21 21-1.5-1.5"/></svg>;
    case "BarChart3":return <svg {...common}><path d="M3 3v18h18"/><path d="M7 14v4"/><path d="M12 8v10"/><path d="M17 4v14"/></svg>;
    case "Users":    return <svg {...common}><path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="8" r="4"/><path d="M21 20v-2a4 4 0 0 0-3-3.87"/><path d="M15 4.13a4 4 0 0 1 0 7.75"/></svg>;
    case "UserCheck":return <svg {...common}><path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="8" r="4"/><path d="m16 11 2 2 4-4"/></svg>;
    case "Sparkles": return <svg {...common}><path d="M12 3 13.5 9 20 10.5 13.5 12 12 18 10.5 12 4 10.5 10.5 9z"/><path d="M19 3v4M21 5h-4"/></svg>;
    case "Bell":     return <svg {...common}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case "Briefcase":return <svg {...common}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
    case "Settings": return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case "Search":   return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>;
    case "Crown":    return <svg {...common}><path d="M2 7l4 10h12l4-10-5 4-5-7-5 7-5-4z"/></svg>;
    case "User":     return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
    case "ChevronDown":return <svg {...common}><path d="m6 9 6 6 6-6"/></svg>;
    case "ChevronRight":return <svg {...common}><path d="m9 18 6-6-6-6"/></svg>;
    case "Banknote": return <svg {...common}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>;
    case "AlertTriangle":return <svg {...common}><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.7 3h16.97a2 2 0 0 0 1.7-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>;
    case "Sun":      return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;
    case "Moon":     return <svg {...common}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
    case "Filter":   return <svg {...common}><path d="M22 3H2l8 9.46V19l4 2v-8.54z"/></svg>;
    case "ArrowUp":  return <svg {...common}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case "ArrowDown":return <svg {...common}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>;
    case "Check":    return <svg {...common}><path d="M20 6 9 17l-5-5"/></svg>;
    case "X":        return <svg {...common}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case "Plus":     return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "Download": return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

function Sidebar({ tenant, role, activeModule, onNavigate }) {
  const items = MODULES.filter(m => m.roles.includes(role));
  const t = TENANTS[tenant];
  return (
    <aside className="sidebar-col" data-role={role}>
      <div className="tenant-brand">
        <div className="tenant-logo">{t.logoText}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="text-[13px] font-bold t-fg-strong leading-tight truncate">{t.nome}</div>
          <div className="text-[10.5px] t-fg-dim tracking-wider uppercase mt-[1px]">{t.plano} · {t.versao}</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <div className="px-4 pb-1 text-[9.5px] font-bold t-fg-ghost tracking-[0.14em] uppercase">Módulos</div>
        {items.map(m => (
          <a key={m.id}
             className={`nav-item ${activeModule === m.id ? "active" : ""}`}
             onClick={(e) => { e.preventDefault(); onNavigate(m.id); }}>
            <Icon name={m.icon} size={15} />
            <span className="flex-1">{m.label}</span>
            {m.badge ? <span className="chip chip-red" style={{ height: 16, fontSize: 9.5, padding: "0 5px" }}>{m.badge}</span> : null}
          </a>
        ))}
      </nav>

      <div className="px-4 py-3 border-t" style={{ borderColor: "var(--rule)" }}>
        <div className="text-[10px] t-fg-ghost tracking-[0.14em] uppercase mb-2">Sessão</div>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full t-bg-tenant-soft ring-soft flex items-center justify-center text-[11px] font-bold t-fg-strong">
            {role === "presidente" ? "PG" : role === "diretoria" ? "AC" : "JW"}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="text-[12px] font-semibold t-fg leading-tight truncate">
              {role === "presidente" ? "Paulo Guedes" : role === "diretoria" ? "Ana Carolina" : "Jaques Wagner"}
            </div>
            <div className="text-[10px] t-fg-dim leading-tight truncate">{ROLES[role].label}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ tenant, role, onOpenCmdk, breadcrumbs }) {
  const t = TENANTS[tenant];
  return (
    <header className="topbar">
      <div className="breadcrumb flex items-center gap-2 text-[12px]" style={{ flexShrink: 1 }}>
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="ChevronRight" size={12} className="t-fg-ghost" style={{ flexShrink: 0 }} />}
            <span className={i === breadcrumbs.length - 1 ? "t-fg-strong font-semibold" : "t-fg-muted"} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{b}</span>
          </React.Fragment>
        ))}
      </div>

      <div className="flex-1" />

      <button className="search-cmdk" onClick={onOpenCmdk}>
        <Icon name="Search" size={13} className="t-fg-dim" />
        <span className="text-[12px] t-fg-dim flex-1 text-left">Buscar candidato, UF, partido, processo…</span>
        <span className="kbd">⌘K</span>
      </button>

      <button className="btn-ghost" title="Alertas">
        <Icon name="Bell" size={13} />
        <span>7</span>
      </button>

      <div className="h-5 w-px" style={{ background: "var(--rule)" }} />

      <div className="flex items-center gap-2 text-[11.5px]">
        <div className="chip chip-muted" style={{ height: 22 }}>
          <span className="chip-dot" style={{ background: "var(--tenant-primary)" }} />
          {ROLES[role].label}
        </div>
      </div>
    </header>
  );
}

function CmdKPalette({ open, onClose, onNavigate }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);

  const items = useMemo(() => {
    const base = [
      ...MODULES.map(m => ({ kind: "Módulo", label: m.label, icon: m.icon, action: () => onNavigate(m.id) })),
      ...RADAR_CANDIDATOS.slice(0, 12).map(c => ({ kind: "Candidato", label: `${c.nome} · ${c.partido}-${c.uf}`, icon: "User", action: () => onNavigate("dossie") })),
      ...UF_LIST.map(uf => ({ kind: "UF", label: `Unidade Federativa · ${uf}`, icon: "MapPin", action: () => onNavigate("mapa") })),
    ];
    if (!q) return base.slice(0, 14);
    const lc = q.toLowerCase();
    return base.filter(i => i.label.toLowerCase().includes(lc) || i.kind.toLowerCase().includes(lc)).slice(0, 14);
  }, [q, onNavigate]);

  if (!open) return null;
  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk-panel" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--rule)" }}>
          <Icon name="Search" size={14} className="t-fg-dim" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                 placeholder="O que você procura?"
                 className="flex-1 bg-transparent outline-none text-[13px] t-fg placeholder:t-fg-dim" />
          <span className="kbd">ESC</span>
        </div>
        <div className="max-h-[380px] overflow-y-auto py-2">
          {items.length === 0 && <div className="px-4 py-8 text-center text-[12px] t-fg-dim">Nenhum resultado.</div>}
          {items.map((it, i) => (
            <button key={i} onClick={() => { it.action(); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--chart-hover)]">
              <Icon name={it.icon} size={14} className="t-fg-muted" />
              <span className="text-[12.5px] t-fg flex-1">{it.label}</span>
              <span className="text-[10px] t-fg-dim tracking-wider uppercase">{it.kind}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Icon, Sidebar, Topbar, CmdKPalette });
