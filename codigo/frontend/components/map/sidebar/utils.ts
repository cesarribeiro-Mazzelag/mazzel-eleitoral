// Helpers puros compartilhados pela sidebar refatorada.
// Extraidos de BarraLateral.tsx sem alterar comportamento.

import { API_BASE } from "@/lib/api/base";
import { SIGLA_CURTA, LOGO_HORIZONTAL } from "./constants";

export const API = API_BASE;

export function token() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ub_token") ?? "";
}

export function fmt(n: number | null | undefined) {
  if (n == null) return "-";
  return Number(n).toLocaleString("pt-BR");
}

export function siglaExibida(sigla: string): string {
  const up = (sigla || "").toUpperCase().trim();
  if (SIGLA_CURTA[up]) return SIGLA_CURTA[up];
  return up.length > 10 ? up.slice(0, 9) + "." : up;
}

export function isLogoHorizontal(sigla: string): boolean {
  return LOGO_HORIZONTAL.has((sigla || "").toUpperCase().trim());
}
