"use client";

import { Icon } from "./Icon";
import { ROLES } from "./rbac";
import { ThemeToggle, PersonaSwitcher, TenantSwitcher } from "./TopbarControls";

export function Topbar({ role, breadcrumbs, onOpenCmdk, alertCount = 0 }) {
  return (
    <header className="topbar">
      <div className="breadcrumb flex items-center gap-2 text-[12px]" style={{ flexShrink: 1 }}>
        {breadcrumbs.map((b, i) => (
          <span key={i} className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            {i > 0 && <Icon name="ChevronRight" size={12} className="t-fg-ghost" />}
            <span
              className={i === breadcrumbs.length - 1 ? "t-fg-strong font-semibold" : "t-fg-muted"}
              style={{ whiteSpace: "nowrap" }}
            >
              {b}
            </span>
          </span>
        ))}
      </div>

      <div className="flex-1" />

      <button className="search-cmdk" onClick={onOpenCmdk} type="button">
        <Icon name="Search" size={13} className="t-fg-dim" />
        <span className="text-[12px] t-fg-dim flex-1 text-left">Buscar candidato, UF, partido, processo...</span>
        <span className="kbd">⌘K</span>
      </button>

      <button className="btn-ghost" title="Alertas" type="button">
        <Icon name="Bell" size={13} />
        <span>{alertCount}</span>
      </button>

      <ThemeToggle />

      <div className="h-5 w-px" style={{ background: "var(--rule)" }} />

      <TenantSwitcher />
      <PersonaSwitcher />
    </header>
  );
}
