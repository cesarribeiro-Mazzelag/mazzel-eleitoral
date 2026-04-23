/**
 * Hooks SWR — Módulo Afiliados
 *
 * Padrão:
 *   - revalidateOnFocus: false  (evita revalidação inesperada)
 *   - keepPreviousData: true    (mantém dados anteriores durante revalidação)
 *   - isMock: true quando fetch falha ou retorna vazio → componente exibe badge "demo"
 */
"use client";

import useSWR from "swr";
import {
  getAfiliadosKPIs,
  listarFiliados,
  getFiliado,
  listarRepasses,
  listarTreinamentos,
  listarComunicacoes,
  getDemografia,
  getSaudeBase,
  swrKeys,
  type AfiliadosKPIs,
  type FiliadoList,
  type Filiado,
  type RepasseList,
  type TreinamentoList,
  type ComunicacaoList,
  type DemografiaResponse,
  type SaudeList,
  type FiliadosFiltros,
} from "@/lib/apiAfiliados";

const SWR_OPTS = {
  revalidateOnFocus: false,
  keepPreviousData: true,
};

// ---------------------------------------------------------------------------
// useAfiliadosKPIs — KPIs gerais do módulo
// ---------------------------------------------------------------------------
export function useAfiliadosKPIs() {
  const { data, error, isLoading, mutate } = useSWR<AfiliadosKPIs>(
    swrKeys.kpis,
    () => getAfiliadosKPIs(),
    SWR_OPTS
  );
  return {
    kpis: data ?? null,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data),
    mutate,
  };
}

// ---------------------------------------------------------------------------
// useFiliados — lista paginada com filtros
// ---------------------------------------------------------------------------
export function useFiliados(filtros?: FiliadosFiltros) {
  const key = swrKeys.filiados(filtros);
  const { data, error, isLoading, mutate } = useSWR<FiliadoList>(
    key,
    () => listarFiliados(filtros),
    SWR_OPTS
  );
  return {
    filiados: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || (data?.items?.length ?? 0) === 0),
    mutate,
  };
}

// ---------------------------------------------------------------------------
// useFiliado — detalhe de um filiado específico
// ---------------------------------------------------------------------------
export function useFiliado(id: string | null | undefined) {
  const key = id ? swrKeys.filiado(id) : null;
  const { data, error, isLoading } = useSWR<Filiado>(
    key,
    id ? () => getFiliado(id) : null,
    { ...SWR_OPTS, shouldRetryOnError: false }
  );
  return {
    filiado: data ?? null,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data),
  };
}

// ---------------------------------------------------------------------------
// useRepasses — repasses financeiros
// ---------------------------------------------------------------------------
export function useRepasses() {
  const { data, error, isLoading, mutate } = useSWR<RepasseList>(
    swrKeys.repasses,
    () => listarRepasses(),
    SWR_OPTS
  );
  return {
    repasses: data?.items ?? [],
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || (data?.items?.length ?? 0) === 0),
    mutate,
  };
}

// ---------------------------------------------------------------------------
// useTreinamentos — lista de cursos/treinamentos
// ---------------------------------------------------------------------------
export function useTreinamentos() {
  const { data, error, isLoading, mutate } = useSWR<TreinamentoList>(
    swrKeys.treinamentos,
    () => listarTreinamentos(),
    SWR_OPTS
  );
  return {
    treinamentos: data?.items ?? [],
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || (data?.items?.length ?? 0) === 0),
    mutate,
  };
}

// ---------------------------------------------------------------------------
// useComunicacoes — histórico de campanhas enviadas
// ---------------------------------------------------------------------------
export function useComunicacoes() {
  const { data, error, isLoading, mutate } = useSWR<ComunicacaoList>(
    swrKeys.comunicacoes,
    () => listarComunicacoes(),
    SWR_OPTS
  );
  return {
    comunicacoes: data?.items ?? [],
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || (data?.items?.length ?? 0) === 0),
    mutate,
  };
}

// ---------------------------------------------------------------------------
// useDemografia — dados demográficos (genero, faixa etária, UF)
// ---------------------------------------------------------------------------
export function useDemografia() {
  const { data, error, isLoading, mutate } = useSWR<DemografiaResponse>(
    swrKeys.demografia,
    () => getDemografia(),
    SWR_OPTS
  );
  return {
    demografia: data ?? null,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data),
    mutate,
  };
}

// ---------------------------------------------------------------------------
// useSaudeBase — série histórica de filiações vs cancelamentos
// ---------------------------------------------------------------------------
export function useSaudeBase() {
  const { data, error, isLoading, mutate } = useSWR<SaudeList>(
    swrKeys.saude,
    () => getSaudeBase(),
    SWR_OPTS
  );
  return {
    saude: data?.items ?? [],
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || (data?.items?.length ?? 0) === 0),
    mutate,
  };
}
