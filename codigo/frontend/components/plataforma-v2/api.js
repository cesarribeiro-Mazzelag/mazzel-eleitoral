/* API client da plataforma Mazzel.
 *
 * - Lê token httpOnly via cookie do backend (credentials: include).
 * - Fallback: lê `ub_token` do localStorage (compat com antiga).
 * - Usa NEXT_PUBLIC_API_URL ou localhost:8002.
 */

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8002";

function tokenFromStorage() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("ub_token") || "";
  } catch {
    return "";
  }
}

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function fetchJson(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = new Headers(opts.headers || {});
  if (!headers.has("Content-Type") && opts.body && !(opts.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const tk = tokenFromStorage();
  if (tk && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${tk}`);
  }

  const r = await fetch(url, {
    credentials: "include",
    ...opts,
    headers,
  });

  if (!r.ok) {
    let body = null;
    try { body = await r.json(); } catch {}
    // body.detail pode ser string (erro simples) ou array (422 validacao) - normalizamos pra string
    let detail = body?.detail ?? body?.message;
    if (Array.isArray(detail)) {
      detail = detail.map((e) => e?.msg || JSON.stringify(e)).join("; ");
    } else if (detail && typeof detail === "object") {
      detail = JSON.stringify(detail);
    }
    throw new ApiError(String(detail || `HTTP ${r.status}`), r.status, body);
  }
  if (r.status === 204) return null;
  return r.json();
}

export const API = {
  base: API_BASE,
  dashboard: (params = {}) =>
    fetchJson(`/dashboard/visao-geral${toQuery(params)}`),
  dossie: (id) => fetchJson(`/dossie/${encodeURIComponent(id)}`),
  radar: (params = {}) =>
    fetchJson(`/radar/politicos${toQuery(params)}`),
  filiados: (params = {}) =>
    fetchJson(`/filiados${toQuery(params)}`),
  delegados: () => fetchJson(`/delegados`),
  alertas: (params = {}) => fetchJson(`/alertas${toQuery(params)}`),
  iaChat: (body) =>
    fetchJson(`/ia/chat`, { method: "POST", body: JSON.stringify(body) }),
  iaSugestoes: () => fetchJson(`/ia/sugestoes`),
  adminUsuarios: () => fetchJson(`/admin/usuarios`),
  adminAuditoria: () => fetchJson(`/admin/auditoria`),
  liderancas: (params = {}) => fetchJson(`/liderancas/${toQuery(params)}`),
  liderancaMunicipios: (uf) => fetchJson(`/liderancas/util/municipios/${encodeURIComponent(uf)}`),
  liderancaCriar: (body) =>
    fetchJson(`/liderancas/`, { method: "POST", body: JSON.stringify(body) }),
  liderancaAtualizar: (id, body) =>
    fetchJson(`/liderancas/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  liderancaDeletar: (id) =>
    fetchJson(`/liderancas/${id}`, { method: "DELETE" }),
  meuPainel: () => fetchJson(`/meu-painel/resumo`),
  mapaFarol: (params = {}) => fetchJson(`/mapa/farol${toQuery(params)}`),
  mapaEstadoEleitos: (uf, params = {}) =>
    fetchJson(`/mapa/estado/${encodeURIComponent(uf)}/eleitos${toQuery(params)}`),
  mapaEstadoForcas: (uf, params = {}) =>
    fetchJson(`/mapa/estado/${encodeURIComponent(uf)}/forcas${toQuery(params)}`),
  mapaGeojson: (uf, params = {}) =>
    fetchJson(`/mapa/geojson/${encodeURIComponent(uf)}${toQuery(params)}`),
  mapaDistritosGeojson: (params = {}) =>
    fetchJson(`/mapa/distritos-geojson${toQuery(params)}`),
  mapaMunicipio: (codIbge) =>
    fetchJson(`/mapa/municipio/${encodeURIComponent(codIbge)}`),
  cabos: (params = {}) =>
    fetchJson(`/cabos/${toQuery(params)}`),
  caboCriar: (body) =>
    fetchJson(`/cabos/`, { method: "POST", body: JSON.stringify(body) }),
  caboAtualizar: (id, body) =>
    fetchJson(`/cabos/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  caboDeletar: (id) =>
    fetchJson(`/cabos/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

function toQuery(params) {
  const entries = Object.entries(params || {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (!entries.length) return "";
  const q = new URLSearchParams();
  entries.forEach(([k, v]) => q.set(k, String(v)));
  return `?${q.toString()}`;
}
