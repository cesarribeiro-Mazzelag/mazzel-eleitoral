/**
 * Hook SWR para /mapa/municipio/{ibge}/comparativo-zonas — matriz candidato × zona.
 * Usado no side panel da Fase 7 (comparativo por zona eleitoral).
 */
import useSWR from "swr";
import { API_BASE } from "@/lib/api/base";

export interface ComparativoCandidato {
  candidato_id: number;
  nome: string;
  foto_url: string | null;
  partido_num: number;
  partido_sigla: string;
  cor_hex: string;
  votos_total: number;
  eleito: boolean;
  votos_por_zona: Record<string, number>;
  pct_por_zona: Record<string, number>;
}

export interface ComparativoZona {
  numero: number;
  total_votos: number;
}

export interface ComparativoResponse {
  municipio: { codigo_ibge: string; nome: string; estado_uf: string };
  cargo: string;
  ano: number;
  turno: number;
  zonas: ComparativoZona[];
  candidatos: ComparativoCandidato[];
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ub_token");
}

async function fetcher(path: string): Promise<ComparativoResponse> {
  const token = getToken();
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!resp.ok) throw new Error(`Erro ${resp.status}`);
  return resp.json();
}

export function useComparativoZonas(
  ibge: string | null,
  cargo: string | null,
  ano: number,
  turno: number,
  enabled: boolean,
) {
  const cargoUpper = cargo?.toUpperCase() ?? "";
  const key = enabled && ibge && cargoUpper
    ? `/mapa/municipio/${ibge}/comparativo-zonas?cargo=${cargoUpper}&ano=${ano}&turno=${turno}`
    : null;

  const { data, isLoading, error } = useSWR<ComparativoResponse>(key, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    dedupingInterval: 300_000,
  });

  return { data, isLoading, error };
}
