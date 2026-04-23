/**
 * Fonte única do fetcher e SWR config para o módulo mapa.
 *
 * Centraliza:
 *   - `mapaFetcher`: fetch com Bearer token + tratamento de erro tipado
 *   - `HttpError`: erro com status code (habilita retry seletivo)
 *   - `SWR_DEFAULTS`: config padrão (dedup 5min, keepPreviousData, retry 5xx)
 *   - `buildQs`: serialização limpa de query string (ignora null/undefined/"")
 *
 * Usado por `useMapaData.ts` e por qualquer hook SWR novo do módulo mapa.
 * NÃO duplicar essa lógica em componentes — importar daqui.
 */
import type { SWRConfiguration } from "swr";
import { API_BASE } from "@/lib/api/base";

// ── Token ────────────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ub_token");
}

// ── Erro tipado ──────────────────────────────────────────────────────────────

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

// ── Fetcher ──────────────────────────────────────────────────────────────────

/**
 * Fetcher padrão do módulo mapa.
 *
 * - Adiciona Authorization Bearer automaticamente.
 * - Converte respostas !ok em `HttpError` com status.
 * - Trata 204 No Content retornando null.
 * - `credentials: "include"` pra httpOnly cookies (JWT + CSRF).
 */
export async function mapaFetcher(path: string): Promise<any> {
  const token = getToken();
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!resp.ok) {
    let detail = `Erro ${resp.status}`;
    try {
      const body = await resp.json();
      detail = body.detail ?? detail;
    } catch {
      // corpo não-JSON
    }
    throw new HttpError(resp.status, detail);
  }
  if (resp.status === 204) return null;
  return resp.json();
}

// ── Query string ─────────────────────────────────────────────────────────────

/**
 * Serializa objeto em query string, ignorando chaves com valor null/undefined/"".
 * Retorna string com prefixo "?" ou string vazia.
 */
export function buildQs(params: Record<string, unknown>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

// ── SWR config ───────────────────────────────────────────────────────────────

/**
 * Config SWR padrão do módulo mapa.
 *
 * - `dedupingInterval: 5min` — dados TSE são imutáveis; revisitar o mesmo
 *   contexto dentro da sessão NÃO dispara fetch (cache hit in-memory).
 * - `keepPreviousData: true` — evita piscar mapa/sidebar no drill-down.
 * - `shouldRetryOnError` — retry exponencial APENAS para 5xx (erros transitórios
 *   do servidor). 4xx não retry (erro do cliente: auth, 404, validação).
 * - `revalidateOnFocus/Reconnect: false` — dados imutáveis, sem necessidade.
 */
export const SWR_DEFAULTS: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  shouldRetryOnError: (err: unknown) => {
    if (err instanceof HttpError) return err.status >= 500 && err.status < 600;
    return true; // erros de rede — retry
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000, // 1s → 2s → 4s (backoff exponencial default do SWR)
  dedupingInterval: 5 * 60_000, // 5 min
  keepPreviousData: true,
};
