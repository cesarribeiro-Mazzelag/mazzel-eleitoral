/* =========================================================================
 * Campanha · Primitives, Icons, Shell chrome
 * ========================================================================= */

const CAMP_TENANTS = {
  uniao:  { label: "UB",       name: "União Brasil",   primary: "#002A7B", primaryRgb: "0, 42, 123",   accent: "#FFCC00" },
  mazzel: { label: "MZ",       name: "Mazzel",         primary: "#111111", primaryRgb: "17, 17, 17",   accent: "#FFD700" },
};
const TENANTS_CAMP = CAMP_TENANTS;

const CAMPANHA_PERSONAS = {
  delegado:    { id: "delegado",    label: "Delegado",      scope: "UF · BA",          descricao: "Visão estadual, coordena regionais" },
  regional:    { id: "regional",    label: "Coord. Regional", scope: "Recôncavo",      descricao: "Coordena território com múltiplas cidades" },
  territorial: { id: "territorial", label: "Coord. Territorial", scope: "Feira de Santana",  descricao: "Coordena uma cidade ou grande bairro" },
  cabo:        { id: "cabo",        label: "Cabo Eleitoral", scope: "Bairro Tomba",     descricao: "Operador de rua, micro-cerca" },
};

const CAMP_SCREENS = [
  { id: "hub",      label: "Hub",              icon: "LayoutDashboard" },
  { id: "mapa",     label: "Mapa de Cercas",   icon: "Map" },
  { id: "arvore",   label: "Hierarquia",       icon: "GitBranch" },
  { id: "cadastro", label: "Lideranças",       icon: "UserPlus" },
  { id: "crm",      label: "CRM",              icon: "CalendarHeart" },
  { id: "chat",     label: "Chat sigiloso",    icon: "MessagesSquare" },
  { id: "ranking",  label: "Ranking",          icon: "Trophy" },
];

/* ========================================================================
 * CIcon — SVG icon set (stroke-based, lucide-flavored)
 * ======================================================================== */
function CIcon({ name, size = 14, className = "", style = {}, stroke = 1.6 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", className, style };
  const P = {
    LayoutDashboard: <><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>,
    Map:             <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14"/><path d="M15 6v14"/></>,
    GitBranch:       <><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7v10"/><path d="M18 10a4 4 0 0 0-4-4H8"/></>,
    UserPlus:        <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></>,
    CalendarHeart:   <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M12 18s-3-2-3-4.5A1.5 1.5 0 0 1 12 12a1.5 1.5 0 0 1 3 1.5C15 16 12 18 12 18Z"/></>,
    MessagesSquare:  <><path d="M14 9a2 2 0 0 1-2 2H7l-3 3V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4Z"/><path d="M18 9h2a2 2 0 0 1 2 2v10l-3-3h-5a2 2 0 0 1-2-2"/></>,
    Trophy:          <><path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></>,
    Search:          <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
    X:               <><path d="M18 6 6 18M6 6l12 12"/></>,
    ChevronDown:     <><polyline points="6 9 12 15 18 9"/></>,
    ChevronRight:    <><polyline points="9 18 15 12 9 6"/></>,
    ArrowRight:      <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    ArrowUp:         <><path d="M12 19V5M5 12l7-7 7 7"/></>,
    ArrowDown:       <><path d="M12 5v14M19 12l-7 7-7-7"/></>,
    Plus:            <><path d="M12 5v14M5 12h14"/></>,
    Filter:          <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
    Settings:        <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></>,
    MoreHorizontal:  <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    Bell:            <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
    User:            <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    Users:           <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    Phone:           <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.35 1.84.59 2.8.72A2 2 0 0 1 22 16.92Z"/></>,
    MessageCircle:   <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></>,
    Lock:            <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    Eye:             <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></>,
    EyeOff:          <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="m1 1 22 22"/></>,
    Heart:           <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/></>,
    Gift:            <><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z"/></>,
    MapPin:          <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></>,
    Home:            <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    Target:          <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    TrendingUp:      <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    Flag:            <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z"/><line x1="4" y1="22" x2="4" y2="15"/></>,
    CheckCircle:     <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
    AlertTriangle:   <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    Send:            <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    Paperclip:       <><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></>,
    Shield:          <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></>,
    Clock:           <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    Calendar:        <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    Sparkles:        <><path d="M12 3l1.9 4.8L19 9.7l-4.8 1.9L12 16.4l-2.2-4.8L5 9.7l4.8-1.9Z"/><path d="M19 17v4M17 19h4M4 4v2M3 5h2"/></>,
    CircleDot:       <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></>,
    Star:            <><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/></>,
    Copy:            <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    Download:        <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    Layers:          <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    Minus:           <><line x1="5" y1="12" x2="19" y2="12"/></>,
    Command:         <><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3Z"/></>,
    Zap:             <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    Cake:            <><path d="M20 21V11a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10"/><path d="M4 16s1.5-2 4-2 3.5 2 4 2 1.5-2 4-2 4 2 4 2"/><path d="M2 21h20"/><path d="M7 8V6c0-1 1-2 1-2s-.5-1 0-2"/><path d="M12 8V6c0-1 1-2 1-2s-.5-1 0-2"/><path d="M17 8V6c0-1 1-2 1-2s-.5-1 0-2"/></>,
    FileText:        <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  };
  return <svg {...common}>{P[name] || P.CircleDot}</svg>;
}

/* ========================================================================
 * CSidebar — left nav (just this Campanha module in focus)
 * ======================================================================== */
function CSidebar({ tenant }) {
  const t = CAMP_TENANTS[tenant];
  const modules = [
    { id: "dash",    label: "Dashboard",       icon: "LayoutDashboard" },
    { id: "mapa",    label: "Mapa eleitoral",  icon: "Map" },
    { id: "radar",   label: "Radar político",  icon: "Target" },
    { id: "dossies", label: "Dossiês",         icon: "FileText" },
    { id: "campanha",label: "Campanha 2026",   icon: "Flag", active: true, badge: "LIVE" },
    { id: "estudo",  label: "Estudo de caso",  icon: "Sparkles" },
    { id: "ia",      label: "Copiloto IA",     icon: "MessageCircle" },
    { id: "alertas", label: "Alertas",         icon: "Bell" },
  ];
  return (
    <aside className="sidebar-col">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center font-black text-[13px]"
             style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.primary}cc)`, color: "#fff", boxShadow: "0 4px 12px -2px rgba(0,0,0,0.25)" }}>
          {t.label}
        </div>
        <div className="min-w-0">
          <div className="text-[12.5px] font-bold t-fg-strong truncate">{t.name}</div>
          <div className="text-[9.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Plataforma Mazzel</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto thin-scroll pt-3 pb-2">
        <div className="px-4 text-[9.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-2">Módulos</div>
        {modules.map(m => (
          <a key={m.id} href="#" className={`nav-item ${m.active ? "active" : ""}`} onClick={e => e.preventDefault()}>
            <CIcon name={m.icon} size={14}/>
            <span className="flex-1 truncate">{m.label}</span>
            {m.badge && <span className="chip chip-green" style={{ height: 16, fontSize: 9, padding: "0 5px" }}>{m.badge}</span>}
          </a>
        ))}
      </nav>

      <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: "var(--rule)" }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--rule-strong)", color: "var(--fg-strong)" }}>AM</div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold t-fg-strong truncate">Antonio Mazzel</div>
          <div className="text-[9.5px] t-fg-dim truncate">CEO · Mazzel</div>
        </div>
        <CIcon name="Settings" size={12} className="t-fg-dim"/>
      </div>
    </aside>
  );
}

/* ========================================================================
 * CTopbar
 * ======================================================================== */
function CTopbar({ tenant, personaLabel, breadcrumbs, onOpenCmdk }) {
  return (
    <header className="topbar">
      <div className="breadcrumb flex items-center gap-1.5 text-[12px]">
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <CIcon name="ChevronRight" size={11} className="t-fg-faint"/>}
            <span className={i === breadcrumbs.length - 1 ? "t-fg-strong font-semibold" : "t-fg-muted"}>{b}</span>
          </React.Fragment>
        ))}
      </div>

      <div className="flex-1"/>

      <div onClick={onOpenCmdk} className="search-cmdk">
        <CIcon name="Search" size={13} className="t-fg-dim"/>
        <span className="text-[12px] t-fg-dim flex-1">Buscar cercas, lideranças, campanhas…</span>
        <span className="kbd" style={{ background: "var(--kbd-bg)", color: "var(--kbd-fg)" }}>⌘K</span>
      </div>

      <button className="btn-ghost" title="Alertas">
        <CIcon name="Bell" size={12}/>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--danger)" }}/>
      </button>

      <div className="flex items-center gap-2 pl-3" style={{ borderLeft: "1px solid var(--rule)" }}>
        <span className="chip chip-violet">{personaLabel}</span>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--tenant-primary)", color: "#fff" }}>AM</div>
      </div>
    </header>
  );
}

/* ========================================================================
 * Campaign sub-nav (horizontal tab strip under topbar)
 * ======================================================================== */
function CampSubNav({ screen, onChange, persona }) {
  return (
    <div className="flex items-center gap-1 px-4 h-11 flex-shrink-0" style={{ background: "var(--bg-topbar)", borderBottom: "1px solid var(--rule)" }}>
      <div className="flex items-center gap-2 mr-3">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--tenant-primary)", color: "#fff" }}>
          <CIcon name="Flag" size={12}/>
        </div>
        <div>
          <div className="text-[12px] font-bold t-fg-strong leading-none">Campanha 2026</div>
          <div className="text-[9.5px] t-fg-dim uppercase tracking-[0.1em] font-semibold mt-0.5">{persona.scope}</div>
        </div>
      </div>
      <div className="w-px h-5" style={{ background: "var(--rule)" }}/>
      <nav className="flex items-center gap-0.5 ml-2 overflow-x-auto thin-scroll">
        {CAMP_SCREENS.map(s => {
          const active = screen === s.id;
          return (
            <button key={s.id} onClick={() => onChange(s.id)}
              className="flex items-center gap-1.5 px-3 h-7 rounded-md text-[12px] font-semibold transition-colors whitespace-nowrap"
              style={{
                color: active ? "var(--fg-strong)" : "var(--fg-muted)",
                background: active ? "var(--rule-strong)" : "transparent",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = "var(--fg)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = "var(--fg-muted)"; }}
            >
              <CIcon name={s.icon} size={12}/>
              {s.label}
            </button>
          );
        })}
      </nav>
      <div className="flex-1"/>
      <button className="btn-ghost" style={{ padding: "5px 9px" }}>
        <CIcon name="Download" size={11}/>
        Export
      </button>
    </div>
  );
}

/* export to window scope */
Object.assign(window, {
  CAMP_TENANTS, TENANTS_CAMP, CAMPANHA_PERSONAS, CAMP_SCREENS,
  CIcon, CSidebar, CTopbar, CampSubNav,
});
