/**
 * API client — Radar Político
 * Endpoints:
 *   GET /radar/politicos   — lista paginada com filtros e Overall FIFA
 *   GET /radar/partidos    — lista paginada de partidos
 *
 * Auth: Bearer token em localStorage["ub_token"]
 */

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8002";

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
// Tipos
// ---------------------------------------------------------------------------

export interface MetricaDestaque {
  chave: string;
  valor: number;
  label: string;
  formato: "numero" | "moeda" | "percentual";
}

export interface TrajetoriaItem {
  ano: number;
  cargo: string;
  estado_uf?: string | null;
  eleito: boolean;
  votos_total?: number | null;
}

export interface PoliticoCard {
  candidato_id: number;
  candidatura_id: number;
  nome: string;
  cargo: string;
  estado_uf: string;
  municipio_nome?: string | null;
  ano: number;
  eleito: boolean;
  foto_url?: string | null;
  votos_total?: number | null;
  partido_sigla?: string | null;
  partido_numero?: number | null;
  partido_cor?: string | null;
  partido_logo_url?: string | null;
  classificacao: "FORTE" | "EM_CRESCIMENTO" | "EM_RISCO" | "CRITICO" | "INDISPONIVEL";
  risco?: string | null;
  metrica_destaque?: MetricaDestaque | null;
  potencial_estrategico?: number | null;
  status: "ELEITO" | "NAO_ELEITO" | "SUPLENTE_ASSUMIU" | "SUPLENTE_ESPERA";
  votos_faltando?: number | null;
  votos_ultimo_eleito?: number | null;
  situacao_tse?: string | null;
  disputou_segundo_turno: boolean;
  votos_melhor_turno?: number | null;
  overall?: number | null;
  tier?: string | null;
  traits: string[];
  atributos_6?: Record<string, number> | null;
  trajetoria: TrajetoriaItem[];
}

export interface RadarPoliticosResponse {
  items: PoliticoCard[];
  total: number;
  pagina: number;
  por_pagina: number;
}

export interface FiltrosPoliticos {
  classificacao?: string;
  risco?: string;
  status?: string;
  cargo?: string;
  estado_uf?: string;
  ano?: string;
  tier?: string;
  trait?: string;
  busca?: string;
  ordenar_por?: string;
  pagina?: number;
  por_pagina?: number;
}

export interface PartidoCard {
  partido_id: number;
  sigla: string;
  numero: number;
  nome: string;
  logo_url?: string | null;
  ano_referencia: number;
  presenca_territorial: number;
  n_eleitos: number;
  n_candidaturas: number;
  votos_total: number;
  variacao_inter_ciclo?: number | null;
  classificacao: string;
  metrica_destaque?: MetricaDestaque | null;
  fifa?: Record<string, unknown> | null;
}

export interface RadarPartidosResponse {
  items: PartidoCard[];
  total: number;
  pagina: number;
  por_pagina: number;
}

// ---------------------------------------------------------------------------
// Funcoes tipadas
// ---------------------------------------------------------------------------

export function listarPoliticos(filtros?: FiltrosPoliticos): Promise<RadarPoliticosResponse> {
  const params = new URLSearchParams();
  if (filtros?.classificacao) params.set("classificacao", filtros.classificacao);
  if (filtros?.risco) params.set("risco", filtros.risco);
  if (filtros?.status) params.set("status", filtros.status);
  if (filtros?.cargo) params.set("cargo", filtros.cargo);
  if (filtros?.estado_uf) params.set("estado_uf", filtros.estado_uf);
  if (filtros?.ano) params.set("ano", filtros.ano);
  if (filtros?.tier) params.set("tier", filtros.tier);
  if (filtros?.trait) params.set("trait", filtros.trait);
  if (filtros?.busca) params.set("busca", filtros.busca);
  if (filtros?.ordenar_por) params.set("ordenar_por", filtros.ordenar_por);
  if (filtros?.pagina) params.set("pagina", String(filtros.pagina));
  if (filtros?.por_pagina) params.set("por_pagina", String(filtros.por_pagina));
  const qs = params.toString();
  return fetcher<RadarPoliticosResponse>(`/radar/politicos${qs ? `?${qs}` : ""}`);
}

export function listarPartidos(filtros?: { ano?: number; busca?: string; ordenar_por?: string; pagina?: number; por_pagina?: number }): Promise<RadarPartidosResponse> {
  const params = new URLSearchParams();
  if (filtros?.ano) params.set("ano", String(filtros.ano));
  if (filtros?.busca) params.set("busca", filtros.busca);
  if (filtros?.ordenar_por) params.set("ordenar_por", filtros.ordenar_por);
  if (filtros?.pagina) params.set("pagina", String(filtros.pagina));
  if (filtros?.por_pagina) params.set("por_pagina", String(filtros.por_pagina));
  const qs = params.toString();
  return fetcher<RadarPartidosResponse>(`/radar/partidos${qs ? `?${qs}` : ""}`);
}

// ---------------------------------------------------------------------------
// SWR key builders
// ---------------------------------------------------------------------------

export const radarKeys = {
  politicos: (filtros?: FiltrosPoliticos) => {
    const params = new URLSearchParams();
    if (filtros?.cargo) params.set("cargo", filtros.cargo);
    if (filtros?.estado_uf) params.set("estado_uf", filtros.estado_uf);
    if (filtros?.tier) params.set("tier", filtros.tier);
    if (filtros?.ordenar_por) params.set("ordenar_por", filtros.ordenar_por);
    if (filtros?.por_pagina) params.set("por_pagina", String(filtros.por_pagina));
    const qs = params.toString();
    return `/radar/politicos${qs ? `?${qs}` : ""}`;
  },
  partidos: (filtros?: { ano?: number; ordenar_por?: string }) => {
    const params = new URLSearchParams();
    if (filtros?.ano) params.set("ano", String(filtros.ano));
    if (filtros?.ordenar_por) params.set("ordenar_por", filtros.ordenar_por);
    return `/radar/partidos${params.toString() ? `?${params.toString()}` : ""}`;
  },
};
