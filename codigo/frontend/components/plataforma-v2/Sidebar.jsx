"use client";

import Link from "next/link";
import Image from "next/image";
import { Icon } from "./Icon";
import { TENANTS } from "./data";
import { ROLES } from "./rbac";
import { sidebarGroupsFor, isMobileFirstProfile } from "./sidebars";

const TENANT_LOGOS = {
  uniao: "/branding/uniao-brasil/logo_white.svg",
};

/* Render do badge no formato Designer V1.2 (parsed em sidebars.js).
 * kind ∈ live | ok | danger | warn | tenant | muted */
function Badge({ badge }) {
  if (!badge) return null;
  if (badge.kind === "live") {
    return (
      <span
        className="inline-flex items-center"
        style={{ marginLeft: 6 }}
        title="Live · pulse"
      >
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--ok)",
            boxShadow: "0 0 6px var(--ok)",
            animation: "pulse-live 1.6s ease-in-out infinite",
          }}
        />
      </span>
    );
  }
  const styles = {
    ok:     { bg: "rgba(52,211,153,0.14)",  fg: "var(--ok)" },
    danger: { bg: "rgba(248,113,113,0.14)", fg: "var(--danger)" },
    warn:   { bg: "rgba(251,191,36,0.14)",  fg: "var(--warn)" },
    tenant: { bg: "var(--tenant-accent-soft, rgba(255,204,0,0.16))", fg: "var(--tenant-accent)" },
    muted:  { bg: "var(--bg-elevated)", fg: "var(--fg-muted)" },
  }[badge.kind] || { bg: "var(--bg-elevated)", fg: "var(--fg-muted)" };
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: "0.04em",
        padding: "1px 6px",
        borderRadius: 3,
        background: styles.bg,
        color: styles.fg,
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: "nowrap",
      }}
    >
      {badge.text}
    </span>
  );
}

export function Sidebar({ tenant, role, activeModule, userName, userInitials }) {
  const t = TENANTS[tenant] || TENANTS.uniao;
  const groups = sidebarGroupsFor(role);
  const roleInfo = ROLES[role] || { label: role, scope: "-" };
  const logoSrc = TENANT_LOGOS[tenant];
  const productLabel = t.productName || t.nome;
  const mobileFirst = isMobileFirstProfile(role);

  return (
    <aside className="sidebar-col" data-role={role} data-mobile-first={mobileFirst ? "1" : "0"}>
      <div className="tenant-brand">
        {logoSrc ? (
          <Image
            src={logoSrc}
            alt={`${productLabel} logo`}
            width={32}
            height={32}
            className="rounded-md"
            priority
          />
        ) : (
          <div className="tenant-logo">{t.logoText}</div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.02em",
              color: "var(--fg-strong)",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {productLabel}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--tenant-accent)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginTop: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {roleInfo.label}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto" style={{ padding: "8px 0" }}>
        {groups.map((g, gi) => (
          <div key={g.section}>
            <div
              style={{
                padding: "8px 16px 4px",
                fontSize: 9.5,
                letterSpacing: "0.16em",
                color: "var(--fg-faint)",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {g.section}
            </div>
            {g.items.map((m) => {
              const isActive = activeModule === m.id || activeModule === m.sid;
              return (
                <Link
                  key={`${g.section}-${m.sid}-${m.label}`}
                  href={m.href}
                  className={`nav-item ${isActive ? "active" : ""}`}
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <Icon name={m.icon} size={15} />
                  <span style={{ flex: 1 }}>{m.label}</span>
                  <Badge badge={m.badge} />
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--rule)" }}>
        <div
          style={{
            fontSize: 10,
            color: "var(--fg-ghost)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Sessão
        </div>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--tenant-primary), var(--tenant-primary-strong, var(--tenant-primary)))",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {userInitials || "--"}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--fg-strong)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {userName || "Usuário"}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--fg-muted)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {roleInfo.scope}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </aside>
  );
}
