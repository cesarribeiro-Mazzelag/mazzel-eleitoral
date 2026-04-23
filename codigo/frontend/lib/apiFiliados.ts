/**
 * API client — Modulo Filiados (mazzel-preview)
 * Endpoints: GET /filiados (com filtros + paginacao), GET /filiados/exportar
 *
 * Nota: backend nao tem endpoint de agregacao por UF nem faixa etaria.
 * Esses dados sao calculados no cliente ou caem no mock.
 *
 * Auth: Bearer token em localStorage["ub_token"]
 */

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8002";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface FiliadoBase {
  id: number;
  nome_completo: string;
  cpf_ultimos4?: string | null;
  data_nascimento?: string | null;
  cidade?: string | null;
  estado_uf: string;
  status_cpf?: string | null;
  status_titulo?: string | null;
  criado_em?: string | null;
}

export interface FiliadosResponse {
  total: number;
  pagina: number;
  limite: number;
  filiados: FiliadoBase[];
}

export interface FiliadosFiltros {
  estado_uf?: string;
  cidade?: string;
  busca?: string;
  pagina?: number;
  limite?: number;
}

// Estrutura calculada no cliente para o visual por UF
export interface FiliadoUF {
  uf: string;
  total: number;
  novos30d: number;
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

export function listarFiliadosPreview(filtros?: FiliadosFiltros): Promise<FiliadosResponse> {
  const params = new URLSearchParams();
  if (filtros?.estado_uf) params.set("estado_uf", filtros.estado_uf);
  if (filtros?.cidade) params.set("cidade", filtros.cidade);
  if (filtros?.busca) params.set("busca", filtros.busca);
  if (filtros?.pagina) params.set("pagina", String(filtros.pagina));
  if (filtros?.limite) params.set("limite", String(filtros.limite));
  const qs = params.toString();
  return fetcher<FiliadosResponse>(`/filiados${qs ? `?${qs}` : ""}`);
}

// ---------------------------------------------------------------------------
// SWR key builders
// ---------------------------------------------------------------------------

export const filiadosPreviewKeys = {
  lista: (filtros?: FiliadosFiltros) => {
    const params = new URLSearchParams();
    if (filtros?.estado_uf) params.set("estado_uf", filtros.estado_uf);
    if (filtros?.limite) params.set("limite", String(filtros.limite));
    const qs = params.toString();
    return `/filiados${qs ? `?${qs}` : ""}`;
  },
};
