/**
 * API client — Modulo Admin
 * Endpoints: GET /admin/usuarios, POST /admin/usuarios, PUT /admin/usuarios/{id},
 *            POST /admin/usuarios/{id}/toggle, GET /admin/auditoria
 *
 * Auth: Bearer token em localStorage["ub_token"]
 * Acesso restrito: apenas perfil PRESIDENTE
 */

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8002";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface AdminUsuario {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  estado_uf?: string | null;
  ativo: boolean;
  tem_2fa: boolean;
  ultimo_acesso?: string | null;
}

export interface AdminAuditLog {
  id: number;
  usuario_id?: number | null;
  acao: string;
  tabela?: string | null;
  ip?: string | null;
  criado_em?: string | null;
}

export interface AdminAuditResponse {
  total: number;
  items: AdminAuditLog[];
}

export interface CriarUsuarioPayload {
  nome: string;
  email: string;
  senha: string;
  perfil: string;
  estado_uf?: string;
}

export interface EditarUsuarioPayload {
  nome?: string;
  perfil?: string;
  estado_uf?: string;
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ub_token");
}

// ---------------------------------------------------------------------------
// Fetcher base
// ---------------------------------------------------------------------------

export async function fetcher<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const resp = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (resp.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Nao autorizado.");
  }

  if (resp.status === 403) {
    throw new Error("Acesso restrito ao administrador.");
  }

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? `Erro ${resp.status}`);
  }

  if (resp.status === 204) return null as unknown as T;
  return resp.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Funcoes tipadas
// ---------------------------------------------------------------------------

export function listarUsuarios(): Promise<AdminUsuario[]> {
  return fetcher<AdminUsuario[]>("/admin/usuarios");
}

export function criarUsuario(payload: CriarUsuarioPayload): Promise<AdminUsuario> {
  return fetcher<AdminUsuario>("/admin/usuarios", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function editarUsuario(id: number, payload: EditarUsuarioPayload): Promise<AdminUsuario> {
  return fetcher<AdminUsuario>(`/admin/usuarios/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function toggleUsuario(id: number): Promise<{ ok: boolean; ativo: boolean }> {
  return fetcher<{ ok: boolean; ativo: boolean }>(`/admin/usuarios/${id}/toggle`, {
    method: "POST",
  });
}

export function listarAuditoria(params?: {
  limit?: number;
  offset?: number;
  usuario_id?: number;
}): Promise<AdminAuditResponse> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.usuario_id) qs.set("usuario_id", String(params.usuario_id));
  const q = qs.toString();
  return fetcher<AdminAuditResponse>(`/admin/auditoria${q ? `?${q}` : ""}`);
}

// ---------------------------------------------------------------------------
// SWR key builders
// ---------------------------------------------------------------------------

export const adminKeys = {
  usuarios: "/admin/usuarios",
  auditoria: (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return `/admin/auditoria${q ? `?${q}` : ""}`;
  },
};
