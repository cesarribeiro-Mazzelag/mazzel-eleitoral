/**
 * Fonte única do API_BASE pra toda a aplicação.
 *
 * Resolve a URL da API no formato:
 *   - Produção (Vercel+Railway): NEXT_PUBLIC_API_URL (setado no env)
 *   - Dev local: http://localhost:8002 (fallback)
 *
 * Modo print (?print=1): substitui `localhost` por `host.docker.internal`
 * quando o Chromium headless está dentro de um container e precisa alcançar
 * o backend via host Mac.
 *
 * Consumidores antigos (`lib/apiBase.js`, `lib/api.js`) re-exportam deste
 * arquivo para não quebrar imports legados.
 */

const API_DEFAULT: string =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8002";

function resolverApi(): string {
  if (typeof window === "undefined") return API_DEFAULT;
  const params = new URLSearchParams(window.location.search);
  if (params.get("print") === "1" && API_DEFAULT.includes("localhost")) {
    return API_DEFAULT.replace("localhost", "host.docker.internal");
  }
  return API_DEFAULT;
}

export const API_BASE: string =
  typeof window === "undefined" ? API_DEFAULT : resolverApi();
