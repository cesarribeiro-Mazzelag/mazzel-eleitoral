/**
 * Hooks SWR — Modulo Delegados
 */
"use client";

import useSWR from "swr";
import {
  listarDelegados,
  getDelegado,
  getMeuDelegado,
  delegadosKeys,
  type Delegado,
  type DelegadoDetalhe,
  type DelegadosFiltros,
} from "@/lib/apiDelegados";

const SWR_OPTS = {
  revalidateOnFocus: false,
  keepPreviousData: true,
};

// ---------------------------------------------------------------------------
// useDelegados — lista com filtros opcionais
// ---------------------------------------------------------------------------

export function useDelegados(filtros?: DelegadosFiltros) {
  const key = delegadosKeys.lista(filtros);
  const { data, error, isLoading, mutate } = useSWR<Delegado[]>(
    key,
    () => listarDelegados(filtros),
    SWR_OPTS
  );

  return {
    delegados: data ?? [],
    total: data?.length ?? 0,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data || data.length === 0),
    mutate,
  };
}

// ---------------------------------------------------------------------------
// useDelegado — detalhe de um delegado
// ---------------------------------------------------------------------------

export function useDelegado(id: number | null | undefined) {
  const key = id ? delegadosKeys.detalhe(id) : null;
  const { data, error, isLoading } = useSWR<DelegadoDetalhe>(
    key,
    id ? () => getDelegado(id) : null,
    { ...SWR_OPTS, shouldRetryOnError: false }
  );

  return {
    delegado: data ?? null,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data),
  };
}

// ---------------------------------------------------------------------------
// useMeuDelegado — dados do proprio delegado logado
// ---------------------------------------------------------------------------

export function useMeuDelegado() {
  const { data, error, isLoading } = useSWR<DelegadoDetalhe>(
    delegadosKeys.meu,
    () => getMeuDelegado(),
    { ...SWR_OPTS, shouldRetryOnError: false }
  );

  return {
    meuDelegado: data ?? null,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data),
  };
}
