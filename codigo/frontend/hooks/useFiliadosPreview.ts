/**
 * Hooks SWR — Modulo Filiados (mazzel-preview)
 * Nota: backend nao tem agregacao por UF/faixa etaria.
 * isMock=true quando dados nao disponiveis - componente usa mock.
 */
"use client";

import useSWR from "swr";
import {
  listarFiliadosPreview,
  filiadosPreviewKeys,
  type FiliadosResponse,
  type FiliadosFiltros,
} from "@/lib/apiFiliados";

const SWR_OPTS = {
  revalidateOnFocus: false,
  keepPreviousData: true,
  shouldRetryOnError: false,
};

// ---------------------------------------------------------------------------
// useFiliadosPreview — lista com total e filiados (sem agregacao por UF)
// ---------------------------------------------------------------------------

export function useFiliadosPreview(filtros?: FiliadosFiltros) {
  const key = filiadosPreviewKeys.lista(filtros);
  const { data, error, isLoading } = useSWR<FiliadosResponse>(
    key,
    () => listarFiliadosPreview(filtros),
    SWR_OPTS
  );

  return {
    filiados: data?.filiados ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    // isMock: true se falhou ou retornou vazio
    isMock: !isLoading && (!!error || !data),
  };
}
