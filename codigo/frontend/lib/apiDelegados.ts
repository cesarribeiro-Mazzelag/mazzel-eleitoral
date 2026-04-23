/**
 * API client — Modulo Delegados
 * Endpoints: GET /delegados, GET /delegados/{id}, GET /delegados/{id}/zonas
 *
 * Auth: Bearer token em localStorage["ub_token"]
 * Base URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002"
 */

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8002";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface DelegadoPerformance {
  filiados_cadastrados: number;
  zonas_cobertas: number;
  municipios_cobertos: number;
}

export interface DelegadoZona {
  delegado_zona_id: number;
  zona_id: number;
  zona_numero: string;
  municipio_id: number;
  municipio_nome: string;
  estado_uf: string;
}

export interface Delegado {
  id: number;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  estado_uf: string;
  ativo: boolean;
  usuario_id: number;
  criado_em?: string | null;
  // campos de performance (presentes na listagem)
  filiados_cadastrados?: number;
  zonas_cobertas?: number;
  municipios_cobertos?: number;
}

export interface DelegadoDetalhe extends Delegado {
  performance: DelegadoPerformance;
  zonas: DelegadoZona[];
}

export interface DelegadosFiltros {
  estado_uf?: string;
  ativo?: boolean;
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

export function listarDelegados(filtros?: DelegadosFiltros): Promise<Delegado[]> {
  const params = new URLSearchParams();
  if (filtros?.estado_uf) params.set("estado_uf", filtros.estado_uf);
  if (filtros?.ativo !== undefined) params.set("ativo", String(filtros.ativo));
  const qs = params.toString();
  return fetcher<Delegado[]>(`/delegados${qs ? `?${qs}` : ""}`);
}

export function getDelegado(id: number): Promise<DelegadoDetalhe> {
  return fetcher<DelegadoDetalhe>(`/delegados/${id}`);
}

export function getZonasDelegado(id: number): Promise<DelegadoZona[]> {
  return fetcher<DelegadoZona[]>(`/delegados/${id}/zonas`);
}

export function getMeuDelegado(): Promise<DelegadoDetalhe> {
  return fetcher<DelegadoDetalhe>("/delegados/meu");
}

// ---------------------------------------------------------------------------
// SWR key builders
// ---------------------------------------------------------------------------

export const delegadosKeys = {
  lista: (filtros?: DelegadosFiltros) => {
    const params = new URLSearchParams();
    if (filtros?.estado_uf) params.set("estado_uf", filtros.estado_uf);
    if (filtros?.ativo !== undefined) params.set("ativo", String(filtros.ativo));
    const qs = params.toString();
    return `/delegados${qs ? `?${qs}` : ""}`;
  },
  detalhe: (id: number) => `/delegados/${id}`,
  zonas: (id: number) => `/delegados/${id}/zonas`,
  meu: "/delegados/meu",
};
