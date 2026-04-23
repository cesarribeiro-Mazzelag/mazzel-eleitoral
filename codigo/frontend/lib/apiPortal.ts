/**
 * API client — Portal do Politico (meu-painel)
 * Endpoints: GET /meu-painel/resumo, GET /meu-painel/votos, GET /meu-painel/dossie
 *
 * Auth: Bearer token em localStorage["ub_token"]
 * Acesso: apenas perfil POLITICO
 */

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8002";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface PortalCandidato {
  id: number;
  nome_completo: string;
  nome_urna?: string | null;
  foto_url?: string | null;
  genero?: string | null;
  grau_instrucao?: string | null;
  ocupacao?: string | null;
}

export interface PortalCandidatura {
  ano: number;
  cargo: string;
  estado_uf: string;
  votos: number;
  situacao?: string | null;
  eleito: boolean;
}

export interface PortalFarol {
  status?: string | null;
  votos_atual?: number | null;
  votos_anterior?: number | null;
  variacao_pct?: number | null;
}

export interface PortalResumo {
  candidato: PortalCandidato;
  candidaturas: PortalCandidatura[];
  farol_ultima_eleicao?: PortalFarol | null;
}

export interface PortalVotos {
  candidatura?: {
    ano: number;
    cargo: string;
    estado: string;
    votos_total: number;
    eleito: boolean;
  } | null;
  votos_por_municipio: Array<{
    municipio: string;
    estado_uf: string;
    codigo_ibge?: string | null;
    votos: number;
  }>;
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

export function getPortalResumo(): Promise<PortalResumo> {
  return fetcher<PortalResumo>("/meu-painel/resumo");
}

export function getPortalVotos(): Promise<PortalVotos> {
  return fetcher<PortalVotos>("/meu-painel/votos");
}

// ---------------------------------------------------------------------------
// SWR key builders
// ---------------------------------------------------------------------------

export const portalKeys = {
  resumo: "/meu-painel/resumo",
  votos: "/meu-painel/votos",
};
