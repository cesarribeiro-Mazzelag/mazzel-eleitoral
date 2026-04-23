/**
 * Hooks SWR — Modulo Alertas
 */
"use client";

import useSWR from "swr";
import { useCallback } from "react";
import {
  listarAlertas,
  marcarAlertaLido,
  marcarTodosLidos,
  alertasKeys,
  type Alerta,
  type AlertaListResponse,
  type AlertasFiltros,
} from "@/lib/apiAlertas";

const SWR_OPTS = {
  revalidateOnFocus: false,
  keepPreviousData: true,
};

// ---------------------------------------------------------------------------
// useAlertas — lista com filtros opcionais
// ---------------------------------------------------------------------------

export function useAlertas(filtros?: AlertasFiltros) {
  const key = alertasKeys.lista(filtros);
  const { data, error, isLoading, mutate } = useSWR<AlertaListResponse>(
    key,
    () => listarAlertas(filtros),
    SWR_OPTS
  );

  const marcarLido = useCallback(
    async (id: number) => {
      await marcarAlertaLido(id);
      await mutate();
    },
    [mutate]
  );

  const marcarTodos = useCallback(
    async () => {
      await marcarTodosLidos();
      await mutate();
    },
    [mutate]
  );

  return {
    alertas: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data || (data?.items?.length ?? 0) === 0),
    mutate,
    marcarLido,
    marcarTodos,
  };
}
