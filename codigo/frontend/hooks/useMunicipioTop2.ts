/**
 * Hook SWR para /mapa/municipio/{ibge}/top2 — tooltip rico Globo-like.
 *
 * Só dispara fetch quando cargo é majoritário (PREFEITO, PRESIDENTE, GOVERNADOR)
 * e o usuário pausou 300ms sobre o município (debounce vive no MapaEleitoral).
 *
 * keepPreviousData: evita piscar o tooltip quando o usuário passa rápido entre
 * cidades vizinhas enquanto o novo fetch resolve.
 */
import useSWR from "swr";
import { API_BASE } from "@/lib/api/base";

const CARGOS_SUPORTADOS = new Set([
  // Majoritários — top 2 (eleito + 2º colocado)
  "PREFEITO", "PRESIDENTE", "GOVERNADOR",
  // Proporcionais — top 30, separados por flag eleito (frontend mostra abas)
  "VEREADOR", "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL", "SENADOR",
]);

export interface Top2Item {
  candidato_id: number;
  nome: string;
  foto_url: string | null;
  partido_num: number;
  partido_sigla: string;
  cor_hex: string;
  votos: number;
  /** % sobre votos válidos (apenas quando backend devolve). */
  pct_validos?: number;
  /** Flag de eleito (preenchido pelo campo `eleito` da tabela candidaturas). */
  eleito?: boolean;
}

export interface Top2Totais {
  eleitores: number | null;
  comparecimento: number | null;
  abstencoes: number | null;
  validos: number | null;
  brancos: number | null;
  nulos: number | null;
  total_votos: number | null;
  pct_abstencoes: number | null;
  pct_validos: number | null;
  pct_brancos: number | null;
  pct_nulos: number | null;
}

export interface Top2Response {
  municipio: { codigo_ibge: string; nome: string; estado_uf: string };
  cargo: string;
  ano: number;
  turno: number;
  teve_segundo_turno?: boolean;
  candidatos?: Top2Item[];
  /** Compat: top 1 e 2 do array candidatos. */
  eleito: Top2Item | null;
  segundo: Top2Item | null;
  totais?: Top2Totais;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ub_token");
}

async function fetcher(path: string): Promise<Top2Response> {
  const token = getToken();
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!resp.ok) throw new Error(`Erro ${resp.status}`);
  return resp.json();
}

export function useMunicipioTop2(
  ibge: string | null,
  cargo: string | null,
  ano: number,
  turno: number,
  tab?: "total" | "1_turno" | "2_turno",
) {
  const cargoUpper = cargo?.toUpperCase() ?? "";
  const enabled = !!ibge && CARGOS_SUPORTADOS.has(cargoUpper);
  const tabParam = tab ? `&tab=${tab}` : "";
  const key = enabled
    ? `/mapa/municipio/${ibge}/top2?cargo=${cargoUpper}&ano=${ano}&turno=${turno}${tabParam}`
    : null;

  const { data, isLoading, error } = useSWR<Top2Response>(key, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    dedupingInterval: 300_000,
  });

  return { data, isLoading, error };
}

/** Apuração DO DISTRITO (bairro) — mesmo shape do município, sem brancos/nulos. */
export function useDistritoTop2(
  cdDist: string | null,
  cargo: string | null,
  ano: number,
  turno: number,
  tab?: "total" | "1_turno" | "2_turno",
) {
  const cargoUpper = cargo?.toUpperCase() ?? "";
  const enabled = !!cdDist && CARGOS_SUPORTADOS.has(cargoUpper);
  const tabParam = tab ? `&tab=${tab}` : "";
  const key = enabled
    ? `/mapa/distrito/${cdDist}/top2?cargo=${cargoUpper}&ano=${ano}&turno=${turno}${tabParam}`
    : null;
  const { data, isLoading, error } = useSWR<Top2Response>(key, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    dedupingInterval: 300_000,
  });
  return { data, isLoading, error };
}
