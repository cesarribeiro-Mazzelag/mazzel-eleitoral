/**
 * Totais agregados de apuração (aptos/válidos/brancos/nulos/abstenções/comparecimento)
 * em qualquer nível geográfico (brasil, estado, município).
 */
import useSWR from "swr";
import { API_BASE } from "@/lib/api/base";

export interface TotaisResponse {
  nivel: string;
  uf: string | null;
  codigo_ibge: string | null;
  cargo: string;
  ano: number;
  turno: number;
  n_municipios: number;
  totais: {
    aptos: number;
    comparecimento: number;
    abstencoes: number;
    validos: number;
    brancos: number;
    nulos: number;
    total_votos: number;
    pct_abstencoes: number | null;
    pct_comparecimento: number | null;
    pct_validos: number | null;
    pct_brancos: number | null;
    pct_nulos: number | null;
  };
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ub_token");
}

async function fetcher(path: string): Promise<TotaisResponse> {
  const token = getToken();
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!resp.ok) throw new Error(`Erro ${resp.status}`);
  return resp.json();
}

export function useTotaisApuracao(args: {
  cargo: string | null;
  ano: number;
  turno: number;
  nivel: "brasil" | "estado" | "municipio";
  uf?: string | null;
  codigoIbge?: string | null;
  enabled?: boolean;
}) {
  const { cargo, ano, turno, nivel, uf, codigoIbge, enabled = true } = args;
  const cargoUpper = cargo?.toUpperCase() ?? "";
  // Só faz sentido pra cargos majoritários (apuracao_municipio só tem dado pra esses)
  const cargosOk = ["PRESIDENTE", "GOVERNADOR", "PREFEITO", "VEREADOR", "SENADOR",
                    "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL"].includes(cargoUpper);
  const ok = enabled && cargosOk && (
    nivel === "brasil"
    || (nivel === "estado" && !!uf)
    || (nivel === "municipio" && !!codigoIbge)
  );
  const params = new URLSearchParams({
    cargo: cargoUpper, ano: String(ano), turno: String(turno), nivel,
  });
  if (uf) params.set("uf", uf);
  if (codigoIbge) params.set("codigo_ibge", codigoIbge);
  const key = ok ? `/mapa/totais-apuracao?${params.toString()}` : null;
  const { data, isLoading } = useSWR<TotaisResponse>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300_000,
    keepPreviousData: true,
  });
  return { data, isLoading };
}
