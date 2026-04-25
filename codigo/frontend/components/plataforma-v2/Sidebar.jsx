"use client";

import Link from "next/link";
import { Icon } from "./Icon";
import { TENANTS } from "./data";
import { ROLES, modulesBySection } from "./rbac";

export function Sidebar({ tenant, role, activeModule, userName, userInitials }) {
  const t = TENANTS[tenant] || TENANTS.uniao;
  const groups = modulesBySection(role);
  const roleInfo = ROLES[role] || { label: role, scope: "-" };

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
        {groups.map((g, gi) => (
          <div
            key={g.section}
            className="py-1.5"
            style={gi > 0 ? { borderTop: "1px solid var(--rule)", marginTop: 4 } : {}}
          >
            {g.items.map((m) => (
              <Link
                key={m.id}
                href={m.href}
                className={`nav-item ${activeModule === m.id ? "active" : ""}`}
              >
                <Icon name={m.icon} size={15} />
                <span className="flex-1">{m.label}</span>
                {m.vis === "filtered" && (
                  <span
                    title="Visibilidade filtrada pelo seu escopo"
                    className="text-[9px] tracking-wider uppercase"
                    style={{ color: "var(--fg-ghost)" }}
                  >
                    escopo
                  </span>
                )}
                {m.consultivo && (
                  <span
                    title="Visão consultiva · leitura"
                    className="text-[9px] tracking-wider uppercase"
                    style={{ color: "var(--fg-ghost)" }}
                  >
                    consult
                  </span>
                )}
                {m.badge && (
                  <span className="chip chip-red" style={{ height: 16, fontSize: 9.5, padding: "0 5px" }}>{m.badge}</span>
                )}
                {m.badgeLabel && (
                  <span className="chip chip-amber" style={{ height: 15, fontSize: 8.5, padding: "0 5px", letterSpacing: "0.1em" }}>{m.badgeLabel}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t" style={{ borderColor: "var(--rule)" }}>
        <div className="text-[10px] t-fg-ghost tracking-[0.14em] uppercase mb-2">Sessão</div>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full t-bg-tenant-soft ring-soft flex items-center justify-center text-[11px] font-bold t-fg-strong">
            {userInitials || "--"}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="text-[12px] font-semibold t-fg leading-tight truncate">{userName || "Usuário"}</div>
            <div className="text-[10px] t-fg-dim leading-tight truncate">{roleInfo.label}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
