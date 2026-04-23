"use client";

import React from "react";
import Link from "next/link";
import {
  Home,
  MapPin,
  Target,
  FileSearch,
  BarChart3,
  Users,
  UserCheck,
  Sparkles,
  Bell,
  Briefcase,
  Settings,
  ChevronRight,
  Flag,
  MessageCircle,
  Shield,
  Network,
  Crown,
  Megaphone,
  UserPlus,
  FileText,
  BookOpen,
  UserCircle,
} from "lucide-react";
import { useTenant, useRole, ROLE_CONFIGS, type RoleId } from "./TenantProvider";

// ── Definição dos módulos (espelho de platform-data.jsx) ─────────────────────

interface ModuleItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  roles: RoleId[];
  badge?: number;
}

interface ModuleItemExt extends ModuleItem {
  badgeLabel?: string;
}

const MODULES: ModuleItemExt[] = [
  { id: "home",          label: "Dashboard",      icon: Home,           href: "/mazzel-preview/home",          roles: ["presidente","diretoria","candidato"] },
  { id: "mapa",          label: "Mapa Eleitoral", icon: MapPin,         href: "/mazzel-preview/mapa",          roles: ["presidente","diretoria","candidato"] },
  { id: "radar",         label: "Radar Político", icon: Target,         href: "/mazzel-preview/radar",         roles: ["presidente","diretoria"] },
  { id: "dossies",       label: "Dossiês",        icon: FileSearch,     href: "/mazzel-preview/dossies",       roles: ["presidente","diretoria","candidato"] },
  { id: "estudo",        label: "Módulo Estudo",  icon: BarChart3,      href: "/mazzel-preview/estudo",        roles: ["presidente","diretoria"] },
  { id: "campanha",      label: "Campanha 2026",  icon: Flag,           href: "/mazzel-preview/campanha",      roles: ["presidente","diretoria","candidato"] },
  { id: "delegados",     label: "Delegados",      icon: Shield,         href: "/mazzel-preview/delegados",     roles: ["presidente","diretoria"] },
  { id: "coordenadores", label: "Coordenadores",  icon: Network,        href: "/mazzel-preview/coordenadores", roles: ["presidente","diretoria"] },
  { id: "liderancas",    label: "Lideranças",     icon: Crown,          href: "/mazzel-preview/liderancas",    roles: ["presidente","diretoria"] },
  { id: "cabos",         label: "Cabos Eleitorais", icon: Megaphone,    href: "/mazzel-preview/cabos",         roles: ["presidente","diretoria"] },
  { id: "suplentes",     label: "Suplentes",      icon: UserPlus,       href: "/mazzel-preview/suplentes",     roles: ["presidente","diretoria"] },
  { id: "filiados",      label: "Filiados",       icon: UserCheck,      href: "/mazzel-preview/afiliados",     roles: ["presidente","diretoria"], badgeLabel: "NEW" },
  { id: "chat",          label: "Chat",           icon: MessageCircle,  href: "/mazzel-preview/chat",          roles: ["presidente","diretoria","candidato"] },
  { id: "alertas",       label: "Alertas",        icon: Bell,           href: "/mazzel-preview/alertas",       roles: ["presidente","diretoria","candidato"], badge: 7 },
  { id: "ia",            label: "IA Assistente",  icon: Sparkles,       href: "/mazzel-preview/ia",            roles: ["presidente","diretoria","candidato"] },
  { id: "relatorios",    label: "Relatórios",     icon: FileText,       href: "/mazzel-preview/relatorios",    roles: ["presidente","diretoria"] },
  { id: "portal",        label: "Meu Painel",     icon: UserCircle,     href: "/mazzel-preview/portal",        roles: ["presidente","diretoria","candidato"] },
  { id: "glossario",     label: "Glossário",      icon: BookOpen,       href: "/mazzel-preview/glossario",     roles: ["presidente","diretoria","candidato"] },
  { id: "admin",         label: "Admin",          icon: Settings,       href: "/mazzel-preview/admin",         roles: ["presidente"] },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface SidebarProps {
  activeModule?: string;
  onNavigate?: (moduleId: string) => void;
}

// ── User initials helper ──────────────────────────────────────────────────────

function getInitials(role: RoleId): string {
  switch (role) {
    case "presidente": return "PG";
    case "diretoria":  return "AC";
    case "candidato":  return "JW";
    default:           return "--";
  }
}

function getUserName(role: RoleId): string {
  switch (role) {
    case "presidente": return "Paulo Guedes";
    case "diretoria":  return "Ana Carolina";
    case "candidato":  return "Jaques Wagner";
    default:           return "Usuário";
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * Sidebar - barra de navegação lateral do shell Mazzel.
 * Portada de platform-shell.jsx para TSX.
 * Usa lucide-react (já instalado) em vez do Icon custom do fonte.
 *
 * NOTA: não substitui o AppLayout.jsx existente.
 * Usada apenas em MazzelLayout / rota /mazzel-preview.
 */
export function Sidebar({ activeModule, onNavigate }: SidebarProps) {
  const { tenant } = useTenant();
  const { role } = useRole();

  const visibleModules = MODULES.filter((m) => m.roles.includes(role));

  return (
    <aside className="mz-sidebar-col" data-mz-role={role}>
      {/* Brand header */}
      <div className="mz-tenant-brand">
        <div className="mz-tenant-logo">{tenant.logoText}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="text-[13px] font-bold mz-t-fg-strong leading-tight truncate">
            {tenant.nome}
          </div>
          <div className="text-[10.5px] mz-t-fg-dim tracking-wider uppercase mt-[1px]">
            {tenant.plano} · {tenant.versao}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        <div className="px-4 pb-1 text-[9.5px] font-bold mz-t-fg-ghost tracking-[0.14em] uppercase">
          Módulos
        </div>
        {visibleModules.map((m) => {
          const Icon = m.icon;
          const isActive = activeModule === m.id;
          // Quando navegando em /mazzel-preview/*, prefixar hrefs pra manter
          // o usuario dentro do sandbox do design system.
          return (
            <Link
              key={m.id}
              href={m.href}
              className={`mz-nav-item ${isActive ? "active" : ""}`}
              onClick={() => onNavigate?.(m.id)}
            >
              <Icon size={15} />
              <span className="flex-1">{m.label}</span>
              {(m as ModuleItemExt).badgeLabel ? (
                <span
                  style={{ height: 16, fontSize: 9, padding: "0 5px", borderRadius: 999, background: "rgba(0,42,123,0.12)", color: "var(--mz-tenant-primary,#002A7B)", fontWeight: 700, display: "inline-flex", alignItems: "center" }}
                >
                  {(m as ModuleItemExt).badgeLabel}
                </span>
              ) : m.badge ? (
                <span
                  className="mz-chip mz-chip-red"
                  style={{ height: 16, fontSize: 9.5, padding: "0 5px" }}
                >
                  {m.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Session footer */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: "var(--mz-rule)" }}
      >
        <div className="text-[10px] mz-t-fg-ghost tracking-[0.14em] uppercase mb-2">
          Sessão
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full mz-t-bg-tenant-soft mz-ring-soft flex items-center justify-center text-[11px] font-bold mz-t-fg-strong">
            {getInitials(role)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="text-[12px] font-semibold mz-t-fg leading-tight truncate">
              {getUserName(role)}
            </div>
            <div className="text-[10px] mz-t-fg-dim leading-tight truncate">
              {ROLE_CONFIGS[role].label}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
