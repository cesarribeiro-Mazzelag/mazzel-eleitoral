/**
 * API client — Modulo Alertas
 * Endpoints: GET /alertas, POST /alertas/{id}/lido, POST /alertas/lidos
 *
 * Auth: Bearer token em localStorage["ub_token"]
 */

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8002";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface Alerta {
  id: number;
  tipo: string;
  gravidade: string;
  municipio_id?: number | null;
  delegado_id?: number | null;
  descricao: string;
  lido: boolean;
  notificado_email: boolean;
  criado_em?: string | null;
}

export interface AlertaListResponse {
  total: number;
  items: Alerta[];
}

export interface AlertasFiltros {
  lido?: boolean;
  gravidade?: string;
  tipo?: string;
  limit?: number;
  offset?: number;
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

export function listarAlertas(filtros?: AlertasFiltros): Promise<AlertaListResponse> {
  const params = new URLSearchParams();
  if (filtros?.lido !== undefined) params.set("lido", String(filtros.lido));
  if (filtros?.gravidade) params.set("gravidade", filtros.gravidade);
  if (filtros?.tipo) params.set("tipo", filtros.tipo);
  if (filtros?.limit) params.set("limit", String(filtros.limit));
  if (filtros?.offset) params.set("offset", String(filtros.offset));
  const qs = params.toString();
  return fetcher<AlertaListResponse>(`/alertas${qs ? `?${qs}` : ""}`);
}

export function marcarAlertaLido(id: number): Promise<{ ok: boolean }> {
  return fetcher<{ ok: boolean }>(`/alertas/${id}/lido`, { method: "POST" });
}

export function marcarTodosLidos(): Promise<{ ok: boolean }> {
  return fetcher<{ ok: boolean }>("/alertas/lidos", { method: "POST" });
}

// ---------------------------------------------------------------------------
// SWR key builders
// ---------------------------------------------------------------------------

export const alertasKeys = {
  lista: (filtros?: AlertasFiltros) => {
    const params = new URLSearchParams();
    if (filtros?.lido !== undefined) params.set("lido", String(filtros.lido));
    if (filtros?.gravidade) params.set("gravidade", filtros.gravidade);
    if (filtros?.tipo) params.set("tipo", filtros.tipo);
    if (filtros?.limit) params.set("limit", String(filtros.limit));
    const qs = params.toString();
    return `/alertas${qs ? `?${qs}` : ""}`;
  },
};
