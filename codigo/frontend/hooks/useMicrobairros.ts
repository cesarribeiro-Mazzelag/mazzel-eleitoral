/**
 * Camada de microbairros (HERE Geocoding + OSM polygon).
 * Resultado do robô ETL 43 — 1.795 microbairros SP capital indexados.
 */
import useSWR from "swr";
import { API_BASE } from "@/lib/api/base";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ub_token");
}

async function fetcher(path: string) {
  const token = getToken();
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!resp.ok) throw new Error(`Erro ${resp.status}`);
  return resp.json();
}

export function useMicrobairros(opts: { cidade?: string; uf?: string; soComPolygon?: boolean; enabled?: boolean }) {
  const { cidade = "São Paulo", uf = "SP", soComPolygon = false, enabled = true } = opts;
  const params = new URLSearchParams({ cidade, uf });
  if (soComPolygon) params.set("so_com_polygon", "true");
  const key = enabled ? `/mapa/microbairros?${params.toString()}` : null;
  const { data, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600_000,
  });
  return { data, isLoading };
}
