"use client";

import React, { useState } from "react";
import { TenantProvider, type RoleId } from "./TenantProvider";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

// ── Props ─────────────────────────────────────────────────────────────────────

interface MazzelLayoutProps {
  children: React.ReactNode;
  defaultTenantId?: string;
  defaultRole?: RoleId;
  breadcrumbs?: string[];
  alertCount?: number;
  activeModule?: string;
}

// ── Inner (precisa estar dentro do TenantProvider) ────────────────────────────

function LayoutInner({
  children,
  breadcrumbs,
  alertCount = 0,
  activeModule: activeModuleProp,
}: {
  children: React.ReactNode;
  breadcrumbs?: string[];
  alertCount?: number;
  activeModule?: string;
}) {
  const [activeModule, setActiveModule] = useState<string>(activeModuleProp ?? "home");

  return (
    <div className="mz-shell">
      <div className="mz-shell-body">
        {/* Sidebar */}
        <Sidebar
          activeModule={activeModuleProp ?? activeModule}
          onNavigate={setActiveModule}
        />

        {/* Main content */}
        <div className="mz-shell-main">
          <Topbar
            breadcrumbs={breadcrumbs}
            alertCount={alertCount}
          />
          <div className="mz-main-scroll">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

/**
 * MazzelLayout - shell completo (Sidebar + Topbar + conteúdo) do design system Mazzel.
 *
 * Orquestra:
 * - TenantProvider (tokens CSS white-label)
 * - Sidebar (navegação com RBAC)
 * - Topbar (breadcrumbs, search, role badge)
 *
 * NOTA: não substitui AppLayout.jsx existente.
 * Usada apenas em rotas novas (ex: /mazzel-preview) como sandbox visual.
 *
 * TODO (fase posterior): receber tenant/role do user logado via API.
 */
export function MazzelLayout({
  children,
  defaultTenantId = "uniao",
  defaultRole = "presidente",
  breadcrumbs,
  alertCount,
  activeModule,
}: MazzelLayoutProps) {
  return (
    <TenantProvider defaultTenantId={defaultTenantId} defaultRole={defaultRole}>
      <LayoutInner breadcrumbs={breadcrumbs} alertCount={alertCount} activeModule={activeModule}>
        {children}
      </LayoutInner>
    </TenantProvider>
  );
}
