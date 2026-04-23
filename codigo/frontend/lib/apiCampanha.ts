/**
 * API client — Módulo Campanha
 * Endpoints: /pessoas-base, /campanhas, /cercas, /papeis-campanha,
 *            /metas-cerca, /cercas-agregacoes
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

export interface PessoaBase {
  id: string;
  tenant_id: number;
  nome_completo: string;
  nome_politico?: string | null;
  cpf?: string | null;
  data_nascimento?: string | null;
  foto_url?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  status: "ativo" | "inativo" | "falecido" | "removido";
  criado_em: string;
}

export interface PessoaBaseList {
  total: number;
  page: number;
  limit: number;
  items: PessoaBase[];
}

export interface Campanha {
  id: string;
  tenant_id: number;
  nome: string;
  candidato_pessoa_id: string;
  cargo_disputado:
    | "PRESIDENTE"
    | "GOVERNADOR"
    | "SENADOR"
    | "DEP_FEDERAL"
    | "DEP_ESTADUAL"
    | "PREFEITO"
    | "VEREADOR";
  ciclo_eleitoral: number;
  uf?: string | null;
  periodo_atual: string;
  status: "ativa" | "encerrada" | "arquivada";
  orcamento_total_centavos?: number | null;
  metas_json?: Record<string, unknown> | null;
  criado_em: string;
}

export interface CampanhaList {
  total: number;
  // Nota: backend não retorna page/limit — apenas total + items
  items: Campanha[];
}

export interface CercaVirtual {
  id: string;
  campanha_id: string;
  parent_id?: string | null;
  nome: string;
  cor_hex: string;
  observacoes?: string | null;
  responsavel_papel_id?: string | null;
  poligono_geojson?: Record<string, unknown> | null;
  tipo_criacao: string;
  raio_metros?: number | null;
  status: "ativa" | "arquivada";
  classificacao?: string | null;
  tendencia?: string | null;
  criado_em: string;
}

export interface CercaVirtualList {
  total: number;
  // Nota: backend não retorna page/limit
  items: CercaVirtual[];
}

export interface PapelCampanha {
  id: string;
  pessoa_id: string;
  campanha_id: string;
  papel:
    | "lideranca"
    | "delegado"
    | "coord_regional"
    | "coord_territorial"
    | "cabo"
    | "apoiador"
    | "candidato";
  cerca_virtual_id?: string | null;
  superior_id?: string | null;
  status: "ativo" | "inativo" | "suspenso";
  data_inicio: string;
  data_fim?: string | null;
}

export interface PapelCampanhaList {
  total: number;
  // Nota: backend não retorna page/limit
  items: PapelCampanha[];
}

export interface CercaAgregacao {
  cerca_virtual_id: string;
  total_papeis_ativos?: number | null;
  total_cadastros?: number | null;
  cobertura_pct?: number | null;
  score_engajamento?: number | null;
  classificacao?: "ouro" | "prata" | "bronze" | "critico" | null;
  tendencia?: "crescendo" | "estavel" | "caindo" | null;
  calculado_em?: string | null;
}

// ---------------------------------------------------------------------------
// Fetcher base — lança erro com mensagem legível
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ub_token");
}

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

const TENANT_ID = 1; // TODO: pegar do user logado via localStorage["ub_user"]

function getTenantId(): number {
  if (typeof window !== "undefined") {
    try {
      const user = JSON.parse(localStorage.getItem("ub_user") ?? "null");
      if (user?.tenant_id) return user.tenant_id;
    } catch {
      // fallback abaixo
    }
  }
  return TENANT_ID;
}

export function listarCampanhas(tenantId?: number): Promise<CampanhaList> {
  const tid = tenantId ?? getTenantId();
  return fetcher<CampanhaList>(`/campanhas?tenant_id=${tid}&limit=50`);
}

export function getCampanha(id: string): Promise<Campanha> {
  return fetcher<Campanha>(`/campanhas/${id}`);
}

export function listarPessoas(
  tenantId?: number,
  opts?: { nome?: string; status?: string; page?: number; limit?: number }
): Promise<PessoaBaseList> {
  const tid = tenantId ?? getTenantId();
  const params = new URLSearchParams({ tenant_id: String(tid), limit: "100" });
  if (opts?.nome) params.set("nome", opts.nome);
  if (opts?.status) params.set("status", opts.status);
  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.limit) params.set("limit", String(opts.limit));
  return fetcher<PessoaBaseList>(`/pessoas-base?${params.toString()}`);
}

export function listarAniversariantes(
  dia: "hoje" | "semana" | "mes",
  tenantId?: number
): Promise<PessoaBase[]> {
  const tid = tenantId ?? getTenantId();
  return fetcher<PessoaBase[]>(
    `/pessoas-base/aniversariantes?tenant_id=${tid}&dia=${dia}`
  );
}

export function listarCercas(campanhaId: string): Promise<CercaVirtualList> {
  return fetcher<CercaVirtualList>(`/cercas?campanha_id=${campanhaId}`);
}

export function listarPapeis(campanhaId: string): Promise<PapelCampanhaList> {
  return fetcher<PapelCampanhaList>(`/papeis-campanha?campanha_id=${campanhaId}`);
}

export function getAgregacao(cercaId: string): Promise<CercaAgregacao> {
  return fetcher<CercaAgregacao>(`/cercas-agregacoes/${cercaId}`);
}

export function recalcularCerca(cercaId: string): Promise<CercaAgregacao> {
  return fetcher<CercaAgregacao>(`/cercas/${cercaId}/recalcular-agregacao`, {
    method: "POST",
  });
}

// SWR key builders — garante chaves únicas e tipadas
export const swrKeys = {
  campanhas: (tenantId?: number) =>
    `/campanhas?tenant_id=${tenantId ?? getTenantId()}`,
  campanha: (id: string) => `/campanhas/${id}`,
  pessoas: (tenantId?: number, extra = "") =>
    `/pessoas-base?tenant_id=${tenantId ?? getTenantId()}${extra}`,
  aniversariantes: (dia: string, tenantId?: number) =>
    `/pessoas-base/aniversariantes?tenant_id=${tenantId ?? getTenantId()}&dia=${dia}`,
  cercas: (campanhaId: string) => `/cercas?campanha_id=${campanhaId}`,
  papeis: (campanhaId: string) => `/papeis-campanha?campanha_id=${campanhaId}`,
  agregacao: (cercaId: string) => `/cercas-agregacoes/${cercaId}`,
};
