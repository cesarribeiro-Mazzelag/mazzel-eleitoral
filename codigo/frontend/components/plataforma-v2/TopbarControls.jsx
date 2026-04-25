"use client";

/* Controles do Topbar:
 * - ThemeToggle (sun/moon)
 * - PersonaSwitcher (alterna entre as 10 personas pra preview RBAC)
 * - TenantSwitcher (alterna white-label pra demo multi-partido)
 *
 * Os 2 switchers so sao uteis em preview/demo; em producao a role vem
 * da sessao real e o tenant vem da config do partido. */

import { useState, useRef, useEffect } from "react";
import { Icon } from "./Icon";
import { usePlatform } from "./PlatformContext";
import { TENANTS } from "./data";
import { ROLES, ROLE_ORDER } from "./rbac";

export function ThemeToggle() {
  const { theme, toggleTheme } = usePlatform();
  return (
    <button
      className="btn-ghost"
      title={theme === "dark" ? "Mudar para claro" : "Mudar para escuro"}
      onClick={toggleTheme}
      type="button"
    >
      <Icon name={theme === "dark" ? "Sun" : "Moon"} size={13} />
    </button>
  );
}

export function PersonaSwitcher() {
  const { role, setRole } = usePlatform();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const cur = ROLES[role] || { label: role, group: "-" };
  const groups = {};
  ROLE_ORDER.forEach((r) => {
    const info = ROLES[r];
    if (!info) return;
    if (!groups[info.group]) groups[info.group] = [];
    groups[info.group].push({ id: r, ...info });
  });

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="btn-ghost"
        onClick={() => setOpen((o) => !o)}
        title="Alternar perfil (preview)"
        type="button"
      >
        <Icon name="User" size={13} />
        <span className="text-[11px] font-semibold">{cur.label}</span>
        <Icon name="ChevronDown" size={10} />
      </button>
      {open && (
        <div
          className="absolute z-50 rounded-lg p-1"
          style={{
            right: 0,
            top: "calc(100% + 6px)",
            minWidth: 260,
            background: "var(--bg-elevated)",
            border: "1px solid var(--rule-strong)",
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)",
          }}
        >
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="py-1">
              <div className="px-3 py-1 text-[9.5px] font-bold t-fg-ghost tracking-[0.14em] uppercase">
                {group}
              </div>
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => { setRole(it.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 rounded-md transition-colors ${it.id === role ? "t-bg-tenant-soft" : ""}`}
                  style={{ color: "var(--fg)" }}
                  type="button"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold t-fg-strong">{it.label}</div>
                    <div className="text-[11px] t-fg-muted">{it.scope}</div>
                  </div>
                  {it.id === role && <Icon name="Check" size={12} className="t-accent" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TenantSwitcher() {
  const { tenant, setTenant } = usePlatform();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const cur = TENANTS[tenant] || TENANTS.uniao;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="btn-ghost"
        onClick={() => setOpen((o) => !o)}
        title="Alternar white-label (preview)"
        type="button"
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: cur.primary }}
        />
        <span className="text-[11px] font-semibold">{cur.sigla}</span>
        <Icon name="ChevronDown" size={10} />
      </button>
      {open && (
        <div
          className="absolute z-50 rounded-lg p-1"
          style={{
            right: 0,
            top: "calc(100% + 6px)",
            minWidth: 200,
            background: "var(--bg-elevated)",
            border: "1px solid var(--rule-strong)",
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)",
          }}
        >
          {Object.values(TENANTS).map((t) => (
            <button
              key={t.id}
              onClick={() => { setTenant(t.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 rounded-md transition-colors ${t.id === tenant ? "t-bg-tenant-soft" : ""}`}
              type="button"
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
                style={{ background: t.primary }}
              >
                {t.logoText}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold t-fg-strong">{t.nome}</div>
                <div className="text-[10px] t-fg-dim uppercase tracking-wider">{t.plano}</div>
              </div>
              {t.id === tenant && <Icon name="Check" size={12} className="t-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
