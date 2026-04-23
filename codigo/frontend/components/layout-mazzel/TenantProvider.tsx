"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface TenantConfig {
  id: string;
  nome: string;
  sigla: string;
  primary: string;
  primaryRgb: string;
  accent: string;
  logoText: string;
  plano: string;
  versao: string;
}

export type RoleId = "presidente" | "diretoria" | "candidato";

export interface RoleConfig {
  label: string;
  scope: string;
}

// ── Dados de tenants (espelho do platform-data.jsx, sem tocar o original) ─────

export const TENANT_CONFIGS: Record<string, TenantConfig> = {
  uniao: {
    id: "uniao",
    nome: "União Brasil",
    sigla: "UB",
    primary: "#002A7B",
    primaryRgb: "0, 42, 123",
    accent: "#FFCC00",
    logoText: "UB",
    plano: "Enterprise",
    versao: "v2.4.1",
  },
  mazzel: {
    id: "mazzel",
    nome: "Mazzel Demo",
    sigla: "MZ",
    primary: "#6D28D9",
    primaryRgb: "109, 40, 217",
    accent: "#F59E0B",
    logoText: "MZ",
    plano: "Demo",
    versao: "v2.4.1",
  },
};

export const ROLE_CONFIGS: Record<RoleId, RoleConfig> = {
  presidente: { label: "Presidente",  scope: "Nacional · irrestrito" },
  diretoria:  { label: "Diretoria",   scope: "Nacional · sem admin" },
  candidato:  { label: "Candidato",   scope: "Portal exclusivo · próprio" },
};

// ── Context ───────────────────────────────────────────────────────────────────

interface TenantContextValue {
  tenant: TenantConfig;
  role: RoleId;
  setTenant: (id: string) => void;
  setRole: (role: RoleId) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

interface TenantProviderProps {
  children: React.ReactNode;
  /**
   * ID do tenant inicial.
   * Em fase posterior, virá do user logado via API.
   * Por ora: hardcode "uniao" como default.
   */
  defaultTenantId?: string;
  /**
   * Role inicial do usuário logado.
   * Em fase posterior, virá do JWT/sessão.
   * Por ora: hardcode "presidente" como default.
   */
  defaultRole?: RoleId;
}

/**
 * TenantProvider - aplica CSS custom properties de tenant no documentElement.
 *
 * Equivalente à função applyTenant() do platform-app.jsx, portado para
 * React Context + useEffect para funcionar no Next.js App Router.
 *
 * ATENÇÃO: este é client component. Wrapa somente as rotas que usam
 * MazzelLayout - não substituir o RootLayout existente.
 */
export function TenantProvider({
  children,
  defaultTenantId = "uniao",
  defaultRole = "presidente",
}: TenantProviderProps) {
  const [tenantId, setTenantId] = useState(defaultTenantId);
  const [role, setRole] = useState<RoleId>(defaultRole);

  const tenant = useMemo(
    () => TENANT_CONFIGS[tenantId] ?? TENANT_CONFIGS.uniao,
    [tenantId]
  );

  // Aplica tokens CSS no documentElement (igual ao applyTenant() original)
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--mz-tenant-primary",     tenant.primary);
    root.setProperty("--mz-tenant-primary-rgb", tenant.primaryRgb);
    root.setProperty("--mz-tenant-accent",      tenant.accent);
    root.setProperty("--mz-tenant-nome",        `"${tenant.nome}"`);
    root.setProperty("--mz-tenant-sigla",       `"${tenant.sigla}"`);
  }, [tenant]);

  // Aplica data-mz-role no body para CSS de role-specific styling
  useEffect(() => {
    document.body.setAttribute("data-mz-role", role);
    return () => document.body.removeAttribute("data-mz-role");
  }, [role]);

  const value: TenantContextValue = {
    tenant,
    role,
    setTenant: setTenantId,
    setRole,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * useTenant - acessa configuração do tenant ativo e setter.
 */
export function useTenant(): Pick<TenantContextValue, "tenant" | "setTenant"> {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant: precisa estar dentro de <TenantProvider>");
  return { tenant: ctx.tenant, setTenant: ctx.setTenant };
}

/**
 * useRole - acessa role do usuário e setter.
 */
export function useRole(): Pick<TenantContextValue, "role" | "setRole"> {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useRole: precisa estar dentro de <TenantProvider>");
  return { role: ctx.role, setRole: ctx.setRole };
}
