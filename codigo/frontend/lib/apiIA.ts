/**
 * API client — Modulo IA
 * Endpoints: POST /ia/chat, GET /ia/sugestoes, GET /ia/busca
 *
 * Auth: Bearer token em localStorage["ub_token"]
 */

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8002";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface IAChatPayload {
  pergunta: string;
  historico?: Array<{ role: string; content: string }>;
}

export interface IAChatResponse {
  resposta: string;
}

export interface IASugestoesResponse {
  sugestoes: string[];
}

export interface IABuscaResponse {
  intencao?: string;
  resultado?: string;
  [key: string]: unknown;
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

export function chatIA(payload: IAChatPayload): Promise<IAChatResponse> {
  return fetcher<IAChatResponse>("/ia/chat", {
    method: "POST",
    body: JSON.stringify({
      pergunta: payload.pergunta,
      historico: payload.historico ?? [],
    }),
  });
}

export function getSugestoes(): Promise<IASugestoesResponse> {
  return fetcher<IASugestoesResponse>("/ia/sugestoes");
}

export function buscaIA(q: string): Promise<IABuscaResponse> {
  return fetcher<IABuscaResponse>(`/ia/busca?q=${encodeURIComponent(q)}`);
}

// ---------------------------------------------------------------------------
// SWR key builders
// ---------------------------------------------------------------------------

export const iaKeys = {
  sugestoes: "/ia/sugestoes",
};
