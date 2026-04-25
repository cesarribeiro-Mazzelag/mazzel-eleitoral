"use client";

import React from "react";
import { Search, Bell, ChevronRight } from "lucide-react";
import { useTenant, useRole, ROLE_CONFIGS } from "./TenantProvider";

interface TopbarProps {
  breadcrumbs?: string[];
  onOpenSearch?: () => void;
  alertCount?: number;
}

/**
 * Topbar - barra de topo do shell Mazzel.
 * Portada de platform-shell.jsx para TSX.
 * Usa lucide-react para ícones.
 *
 * NOTA: não substitui componentes de topbar existentes.
 * Usada apenas em MazzelLayout / rota /v1.
 */
export function Topbar({
  breadcrumbs = [],
  onOpenSearch,
  alertCount = 0,
}: TopbarProps) {
  const { tenant } = useTenant();
  const { role } = useRole();

  return (
    <header className="mz-topbar">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[12px]">
        {breadcrumbs.length === 0 ? (
          <span className="mz-t-fg-strong font-semibold">{tenant.nome}</span>
        ) : (
          breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={12} className="mz-t-fg-ghost" />}
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? "mz-t-fg-strong font-semibold"
                    : "mz-t-fg-muted"
                }
              >
                {b}
              </span>
            </React.Fragment>
          ))
        )}
      </div>

      <div className="flex-1" />

      {/* Search trigger */}
      <button
        className="mz-search-cmdk"
        onClick={onOpenSearch}
        type="button"
        aria-label="Buscar"
      >
        <Search size={13} className="mz-t-fg-dim" />
        <span className="text-[12px] mz-t-fg-dim flex-1 text-left">
          Buscar candidato, UF, partido...
        </span>
        <span className="mz-kbd">⌘K</span>
      </button>

      {/* Alerts */}
      {alertCount > 0 && (
        <button className="mz-btn-ghost" type="button" title="Alertas">
          <Bell size={13} />
          <span>{alertCount}</span>
        </button>
      )}

      <div
        className="h-5 w-px"
        style={{ background: "var(--mz-rule)" }}
      />

      {/* Role badge */}
      <div className="flex items-center gap-2 text-[11.5px]">
        <span
          className="mz-chip mz-chip-muted"
          style={{ height: 22 }}
        >
          <span
            className="mz-chip-dot"
            style={{ background: "var(--mz-tenant-primary)" }}
          />
          {ROLE_CONFIGS[role].label}
        </span>
      </div>
    </header>
  );
}
