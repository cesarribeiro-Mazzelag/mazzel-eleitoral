/**
 * API client — Modulo Chat Sigiloso
 * Endpoints: /chat/salas, /chat/mensagens
 *
 * Auth: Bearer token em localStorage["ub_token"]
 * Base URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002"
 *
 * Criptografia: servidor e zero-knowledge.
 * O cliente envia conteudo como base64 (btoa/atob como stub).
 * Criptografia real E2E sera implementada em sprint futuro.
 */

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8002";

// ---------------------------------------------------------------------------
// Tipos (espelham schemas Pydantic do backend)
// ---------------------------------------------------------------------------

export interface ChatSala {
  id: string;
  tenant_id: number;
  campanha_id?: string | null;
  nome: string;
  descricao?: string | null;
  tipo: "direto" | "grupo" | "canal";
  criado_por_id?: number | null;
  e2e: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface ChatParticipante {
  id: string;
  sala_id: string;
  usuario_id: number;
  papel: "moderador" | "membro";
  entrou_em: string;
  saiu_em?: string | null;
  ultima_leitura_em?: string | null;
  silenciado: boolean;
  usuario_nome?: string | null;
}

export interface ChatSalaDetail extends ChatSala {
  participantes: ChatParticipante[];
  nao_lidas: number;
}

export interface ChatSalaListResponse {
  total: number;
  salas: ChatSala[];
}

export interface ChatMensagem {
  id: string;
  sala_id: string;
  remetente_id?: number | null;
  modo: "padrao" | "sigiloso" | "view_unico";
  conteudo_criptografado: string;
  tipo_conteudo: string;
  expira_em?: string | null;
  visualizada_em?: string | null;
  reply_to_id?: string | null;
  deletada: boolean;
  deletada_em?: string | null;
  created_at: string;
}

export interface ChatMensagemListResponse {
  total: number;
  mensagens: ChatMensagem[];
  proximo_cursor?: string | null;
}

export interface ChatSalaCreate {
  nome: string;
  descricao?: string;
  tipo: "direto" | "grupo" | "canal";
  campanha_id?: string;
  participantes_iniciais?: number[];
}

export interface ChatParticipanteCreate {
  usuario_id: number;
  papel: "moderador" | "membro";
}

export interface EnviarMensagemPayload {
  conteudo: string;
  modo?: "padrao" | "sigiloso" | "view_unico";
  ttl_segundos?: number;
  reply_to_id?: string;
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

async function fetcher<T>(url: string, options: RequestInit = {}): Promise<T> {
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
// Helper de criptografia stub (base64 simples ate E2E real)
// ---------------------------------------------------------------------------

export function cifrarTexto(texto: string): string {
  // Stub: base64 puro. Em producao: substituir por E2E real (AES-GCM).
  return btoa(unescape(encodeURIComponent(texto)));
}

export function decifrarTexto(base64: string): string {
  // Stub: decode base64.
  try {
    return decodeURIComponent(escape(atob(base64)));
  } catch {
    return "[conteudo ilegivel]";
  }
}

// ---------------------------------------------------------------------------
// 1. GET /chat/salas - listar salas do usuario
// ---------------------------------------------------------------------------

export function listarSalas(campanhaId?: string): Promise<ChatSalaListResponse> {
  const qs = campanhaId ? `?campanha_id=${campanhaId}` : "";
  return fetcher<ChatSalaListResponse>(`/chat/salas${qs}`);
}

// ---------------------------------------------------------------------------
// 2. POST /chat/salas - criar sala
// ---------------------------------------------------------------------------

export function criarSala(payload: ChatSalaCreate): Promise<ChatSala> {
  return fetcher<ChatSala>("/chat/salas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// 3. GET /chat/salas/{id} - detalhe da sala
// ---------------------------------------------------------------------------

export function getSala(salaId: string): Promise<ChatSalaDetail> {
  return fetcher<ChatSalaDetail>(`/chat/salas/${salaId}`);
}

// ---------------------------------------------------------------------------
// 4. GET /chat/salas/{id}/mensagens - listar mensagens
// ---------------------------------------------------------------------------

export function listarMensagens(
  salaId: string,
  cursor?: string,
  limite = 50
): Promise<ChatMensagemListResponse> {
  const params = new URLSearchParams({ limite: String(limite) });
  if (cursor) params.set("cursor", cursor);
  return fetcher<ChatMensagemListResponse>(`/chat/salas/${salaId}/mensagens?${params}`);
}

// ---------------------------------------------------------------------------
// 5. POST /chat/salas/{id}/mensagens - enviar mensagem
// ---------------------------------------------------------------------------

export function enviarMensagem(
  salaId: string,
  payload: EnviarMensagemPayload
): Promise<ChatMensagem> {
  const body = {
    conteudo_criptografado: cifrarTexto(payload.conteudo),
    modo: payload.modo ?? "padrao",
    tipo_conteudo: "texto",
    ...(payload.ttl_segundos ? { ttl_segundos: payload.ttl_segundos } : {}),
    ...(payload.reply_to_id ? { reply_to_id: payload.reply_to_id } : {}),
  };
  return fetcher<ChatMensagem>(`/chat/salas/${salaId}/mensagens`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// 6. DELETE /chat/mensagens/{id} - apagar mensagem
// ---------------------------------------------------------------------------

export function deletarMensagem(mensagemId: string): Promise<null> {
  return fetcher<null>(`/chat/mensagens/${mensagemId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// 7. POST /chat/salas/{id}/participantes - adicionar participante
// ---------------------------------------------------------------------------

export function addParticipante(
  salaId: string,
  payload: ChatParticipanteCreate
): Promise<ChatParticipante> {
  return fetcher<ChatParticipante>(`/chat/salas/${salaId}/participantes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// 8. DELETE /chat/salas/{id}/participantes/{usuario_id} - remover participante
// ---------------------------------------------------------------------------

export function removerParticipante(salaId: string, usuarioId: number): Promise<null> {
  return fetcher<null>(`/chat/salas/${salaId}/participantes/${usuarioId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// 9. POST /chat/mensagens/{id}/lida - marcar lida
// ---------------------------------------------------------------------------

export function marcarLida(mensagemId: string): Promise<ChatMensagem> {
  return fetcher<ChatMensagem>(`/chat/mensagens/${mensagemId}/lida`, {
    method: "POST",
  });
}

// ---------------------------------------------------------------------------
// SWR key builders
// ---------------------------------------------------------------------------

export const chatKeys = {
  salas: (campanhaId?: string) => `/chat/salas${campanhaId ? `?campanha_id=${campanhaId}` : ""}`,
  sala: (salaId: string) => `/chat/salas/${salaId}`,
  mensagens: (salaId: string, cursor?: string) =>
    `/chat/salas/${salaId}/mensagens${cursor ? `?cursor=${cursor}` : ""}`,
};
