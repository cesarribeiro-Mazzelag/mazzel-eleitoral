/**
 * API client — Módulo Afiliados
 * Endpoints: /afiliados/kpis, /afiliados/filiados, /afiliados/repasses,
 *            /afiliados/treinamentos, /afiliados/comunicacoes,
 *            /afiliados/demografia, /afiliados/saude
 *
 * Auth: Bearer token em localStorage["ub_token"]
 * Base URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002"
 */

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8002";

// ---------------------------------------------------------------------------
// Tipos de resposta (espelha schemas Pydantic do backend)
// ---------------------------------------------------------------------------

export interface AfiliadosKPIs {
  total: number;
  ativos: number;
  inativos: number;
  suspensos: number;
  novos_30d: number;
  churn_30d: number;
  diretorios_ativos: number;
  diretorios_totais: number;
}

export interface Filiado {
  id: string;
  nome_completo: string;
  cpf_hash?: string | null;
  cidade?: string | null;
  uf?: string | null;
  status: "ativo" | "inativo" | "suspenso";
  data_filiacao?: string | null;
  contribuinte_em_dia?: boolean | null;
  treinamentos_concluidos?: number | null;
  tags?: string[] | null;
  genero?: string | null;
  data_nascimento?: string | null;
}

export interface FiliadoList {
  items: Filiado[];
  total: number;
}

export interface FiliadosFiltros {
  status?: string;
  uf?: string;
  busca?: string;
  page?: number;
  per_page?: number;
}

export interface Repasse {
  id: string;
  mes_ref: string;
  fundo_partidario: number;
  fundo_especial: number;
  doacoes: number;
  total: number;
}

export interface RepasseList {
  items: Repasse[];
}

export interface Treinamento {
  id: string;
  nome_curso: string;
  inscritos: number;
  concluintes: number;
  nps: number;
  data_proxima?: string | null;
}

export interface TreinamentoList {
  items: Treinamento[];
}

export interface Comunicacao {
  id: string;
  assunto: string;
  canal: string;
  enviados: number;
  aberturas: number;
  cliques: number;
  enviado_em?: string | null;
}

export interface ComunicacaoList {
  items: Comunicacao[];
}

export interface DemografiaItem {
  label: string;
  pct: number;
}

export interface DemografiaResponse {
  genero: DemografiaItem[];
  faixa_etaria: DemografiaItem[];
  uf: DemografiaItem[];
}

export interface SaudeMes {
  id: string;
  mes_ref: string;
  filiacoes_mes: number;
  cancelamentos_mes: number;
}

export interface SaudeList {
  items: SaudeMes[];
}

// ---------------------------------------------------------------------------
// Helpers de auth
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ub_token");
}

// ---------------------------------------------------------------------------
// Fetcher base — lança erro com mensagem legível, redireciona em 401
// ---------------------------------------------------------------------------

export async function fetcher<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
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
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Não autorizado.");
  }

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? `Erro ${resp.status}`);
  }

  if (resp.status === 204) return null as unknown as T;
  return resp.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Funções tipadas para cada endpoint
// ---------------------------------------------------------------------------

export function getAfiliadosKPIs(): Promise<AfiliadosKPIs> {
  return fetcher<AfiliadosKPIs>("/afiliados/kpis");
}

export function listarFiliados(filtros?: FiliadosFiltros): Promise<FiliadoList> {
  const params = new URLSearchParams();
  if (filtros?.status) params.set("status", filtros.status);
  if (filtros?.uf) params.set("uf", filtros.uf);
  if (filtros?.busca) params.set("busca", filtros.busca);
  if (filtros?.page) params.set("page", String(filtros.page));
  if (filtros?.per_page) params.set("per_page", String(filtros.per_page));
  const qs = params.toString();
  return fetcher<FiliadoList>(`/afiliados/filiados${qs ? `?${qs}` : ""}`);
}

export function getFiliado(id: string): Promise<Filiado> {
  return fetcher<Filiado>(`/afiliados/filiados/${id}`);
}

export function listarRepasses(): Promise<RepasseList> {
  return fetcher<RepasseList>("/afiliados/repasses");
}

export function listarTreinamentos(): Promise<TreinamentoList> {
  return fetcher<TreinamentoList>("/afiliados/treinamentos");
}

export function listarComunicacoes(): Promise<ComunicacaoList> {
  return fetcher<ComunicacaoList>("/afiliados/comunicacoes");
}

export function getDemografia(): Promise<DemografiaResponse> {
  return fetcher<DemografiaResponse>("/afiliados/demografia");
}

export function getSaudeBase(): Promise<SaudeList> {
  return fetcher<SaudeList>("/afiliados/saude");
}

// ---------------------------------------------------------------------------
// SWR key builders — chaves únicas e tipadas
// ---------------------------------------------------------------------------

export const swrKeys = {
  kpis: "/afiliados/kpis",
  filiados: (filtros?: FiliadosFiltros) => {
    const params = new URLSearchParams();
    if (filtros?.status) params.set("status", filtros.status);
    if (filtros?.uf) params.set("uf", filtros.uf);
    if (filtros?.busca) params.set("busca", filtros.busca);
    if (filtros?.page) params.set("page", String(filtros.page));
    if (filtros?.per_page) params.set("per_page", String(filtros.per_page));
    const qs = params.toString();
    return `/afiliados/filiados${qs ? `?${qs}` : ""}`;
  },
  filiado: (id: string) => `/afiliados/filiados/${id}`,
  repasses: "/afiliados/repasses",
  treinamentos: "/afiliados/treinamentos",
  comunicacoes: "/afiliados/comunicacoes",
  demografia: "/afiliados/demografia",
  saude: "/afiliados/saude",
};
