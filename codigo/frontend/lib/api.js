/**
 * Cliente HTTP - Mazzel Tech Inteligência Eleitoral
 * Adaptado do padrão Jarbis (api.js)
 *
 * - Token JWT armazenado em localStorage
 * - 401 → redireciona para /login
 * - Auditoria: toda ação sensível passa por aqui
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ub_token");
}

function getUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("ub_user") ?? "null");
  } catch {
    return null;
  }
}

function setSession(token, user) {
  localStorage.setItem("ub_token", token);
  localStorage.setItem("ub_user", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem("ub_token");
  localStorage.removeItem("ub_user");
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // 401 → limpa sessão e vai para login
  if (resp.status === 401) {
    const isAuthRoute = path.startsWith("/auth/");
    if (!isAuthRoute) {
      clearSession();
      window.location.href = "/login";
    }
    const err = await resp.json().catch(() => ({ detail: "Não autorizado." }));
    throw new Error(err.detail ?? "Não autorizado.");
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "Erro inesperado." }));
    throw new Error(err.detail ?? `Erro ${resp.status}`);
  }

  // Respostas sem corpo (204)
  if (resp.status === 204) return null;

  return resp.json();
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const api = {
  // ── Auth ────────────────────────────────────────────────────────────────────
  auth: {
    login: (email, senha) =>
      apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      }),

    logout: () =>
      apiFetch("/auth/logout", { method: "POST" }),

    me: () => apiFetch("/auth/me"),

    verificar2fa: (codigo, token_temp) =>
      apiFetch("/auth/2fa/verificar", {
        method: "POST",
        body: JSON.stringify({ codigo, token_temp }),
      }),

    trocar_senha: (dados) =>
      apiFetch("/auth/trocar-senha", {
        method: "POST",
        body: JSON.stringify(dados),
      }),
  },

  // ── Mapa / Dados Eleitorais ──────────────────────────────────────────────────
  mapa: {
    farol: (params = {}) =>
      apiFetch(`/mapa/farol?${new URLSearchParams(params)}`),

    municipio: (codigoIbge) =>
      apiFetch(`/mapa/municipio/${codigoIbge}`),

    estado: (uf) =>
      apiFetch(`/mapa/estado/${uf}`),

    buscar: (q) =>
      apiFetch(`/mapa/buscar?q=${encodeURIComponent(q)}`),
  },

  // ── Políticos / Dossiê ───────────────────────────────────────────────────────
  politicos: {
    buscar: (q) =>
      apiFetch(`/politicos/buscar?q=${encodeURIComponent(q)}`),

    get: (id) =>
      apiFetch(`/politicos/${id}`),

    // Dossiê migrado para rota única /dossie/{id} (single source of truth)
    dossie: (id) =>
      apiFetch(`/dossie/${id}`),

    // URL para download do PDF (Fase 4 do refactor — temporariamente 503)
    dossie_pdf_url: (id) =>
      `${API_BASE}/dossie/${id}/pdf?token=${getToken()}`,

    votos_granular: (id, params = {}) =>
      apiFetch(`/politicos/${id}/votos?${new URLSearchParams(params)}`),
  },

  // ── Delegados ───────────────────────────────────────────────────────────────
  delegados: {
    list: () => apiFetch("/delegados"),
    get: (id) => apiFetch(`/delegados/${id}`),
    create: (data) =>
      apiFetch("/delegados", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) =>
      apiFetch(`/delegados/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id) =>
      apiFetch(`/delegados/${id}`, { method: "DELETE" }),
    performance: (id) =>
      apiFetch(`/delegados/${id}/performance`),
    zonas: (id) =>
      apiFetch(`/delegados/${id}/zonas`),
    atribuir_zonas: (id, zona_ids) =>
      apiFetch(`/delegados/${id}/zonas`, {
        method: "POST",
        body: JSON.stringify({ zona_ids }),
      }),
  },

  // ── Filiados ────────────────────────────────────────────────────────────────
  filiados: {
    list: (params = {}) =>
      apiFetch(`/filiados?${new URLSearchParams(params)}`),
    get: (id) => apiFetch(`/filiados/${id}`),
    create: (data) =>
      apiFetch("/filiados", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) =>
      apiFetch(`/filiados/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    exportar: () =>
      `${API_BASE}/filiados/exportar?token=${getToken()}`,
  },

  // ── Validações ──────────────────────────────────────────────────────────────
  validar: {
    cpf: (cpf) =>
      apiFetch("/validar/cpf", { method: "POST", body: JSON.stringify({ cpf }) }),
    titulo: (titulo) =>
      apiFetch("/validar/titulo", { method: "POST", body: JSON.stringify({ titulo }) }),
  },

  // ── Alertas ─────────────────────────────────────────────────────────────────
  alertas: {
    list: (params = {}) =>
      apiFetch(`/alertas?${new URLSearchParams(params)}`),
    marcar_lido: (id) =>
      apiFetch(`/alertas/${id}/lido`, { method: "POST" }),
    marcar_todos_lido: () =>
      apiFetch("/alertas/lidos", { method: "POST" }),
    gerar: (uf) =>
      apiFetch(`/alertas/gerar${uf ? `?uf=${uf}` : ""}`, { method: "POST" }),
  },

  // ── Relatórios ──────────────────────────────────────────────────────────────
  relatorios: {
    list: () => apiFetch("/relatorios"),
    gerar: (tipo, params) =>
      apiFetch("/relatorios", {
        method: "POST",
        body: JSON.stringify({ tipo, params }),
      }),
    download_url: (id) =>
      `${API_BASE}/relatorios/${id}/download?token=${getToken()}`,
  },

  // ── IA / Análise ─────────────────────────────────────────────────────────────
  ia: {
    chat: (pergunta, historico = []) =>
      apiFetch("/ia/chat", {
        method: "POST",
        body: JSON.stringify({ pergunta, historico }),
      }),
    busca_rapida: (texto) =>
      apiFetch(`/ia/busca?q=${encodeURIComponent(texto)}`),
  },

  // ── Usuários / Admin ─────────────────────────────────────────────────────────
  usuarios: {
    list: () => apiFetch("/admin/usuarios"),
    create: (data) =>
      apiFetch("/admin/usuarios", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) =>
      apiFetch(`/admin/usuarios/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    toggle_ativo: (id) =>
      apiFetch(`/admin/usuarios/${id}/toggle`, { method: "POST" }),
  },

  // ── Auditoria ────────────────────────────────────────────────────────────────
  auditoria: {
    list: (params = {}) =>
      apiFetch(`/admin/auditoria?${new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
      )}`),
  },

  // ── Utilitários ──────────────────────────────────────────────────────────────
  utils: {
    cep: (cep) =>
      fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, "")}/json/`).then(
        (r) => r.json()
      ),
  },

  // Expõe helpers de sessão
  getUser,
  setSession,
  clearSession,
  getToken,
};
