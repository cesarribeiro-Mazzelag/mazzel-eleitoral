/**
 * Hooks SWR — Módulo Campanha
 *
 * Padrão:
 *   - revalidateOnFocus: false  (evita revalidação inesperada)
 *   - keepPreviousData: true    (mantém dados anteriores durante revalidação)
 *   - Fallback para mock quando API retorna vazio ou falha
 */
"use client";

import useSWR from "swr";
import {
  fetcher,
  listarCampanhas,
  listarPessoas,
  listarCercas,
  listarPapeis,
  getAgregacao,
  listarAniversariantes,
  swrKeys,
  type Campanha,
  type CampanhaList,
  type PessoaBase,
  type PessoaBaseList,
  type CercaVirtual,
  type CercaVirtualList,
  type PapelCampanha,
  type PapelCampanhaList,
  type CercaAgregacao,
} from "@/lib/apiCampanha";

const SWR_OPTS = {
  revalidateOnFocus: false,
  keepPreviousData: true,
};

// ---------------------------------------------------------------------------
// useCampanhas — lista todas as campanhas do tenant
// ---------------------------------------------------------------------------
export function useCampanhas(tenantId?: number) {
  const key = swrKeys.campanhas(tenantId);
  const { data, error, isLoading, mutate } = useSWR<CampanhaList>(
    key,
    () => listarCampanhas(tenantId),
    SWR_OPTS
  );
  return {
    campanhas: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    isMock: !isLoading && !error && (data?.items?.length ?? 0) === 0,
    mutate,
  };
}

// ---------------------------------------------------------------------------
// useCercas — cercas de uma campanha específica
// ---------------------------------------------------------------------------
export function useCercas(campanhaId: string | null | undefined) {
  const key = campanhaId ? swrKeys.cercas(campanhaId) : null;
  const { data, error, isLoading, mutate } = useSWR<CercaVirtualList>(
    key,
    campanhaId ? () => listarCercas(campanhaId) : null,
    SWR_OPTS
  );
  return {
    cercas: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    isMock: !isLoading && !error && (data?.items?.length ?? 0) === 0,
    mutate,
  };
}

// ---------------------------------------------------------------------------
// usePessoas — pessoas base do tenant (com filtros opcionais)
// ---------------------------------------------------------------------------
export function usePessoas(
  tenantId?: number,
  filters?: { nome?: string; status?: string }
) {
  const extra = filters?.nome ? `&nome=${encodeURIComponent(filters.nome)}` : "";
  const key = swrKeys.pessoas(tenantId, extra);
  const { data, error, isLoading, mutate } = useSWR<PessoaBaseList>(
    key,
    () => listarPessoas(tenantId, filters),
    SWR_OPTS
  );
  return {
    pessoas: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    isMock: !isLoading && !error && (data?.items?.length ?? 0) === 0,
    mutate,
  };
}

// ---------------------------------------------------------------------------
// usePapeis — papéis de uma campanha específica
// ---------------------------------------------------------------------------
export function usePapeis(campanhaId: string | null | undefined) {
  const key = campanhaId ? swrKeys.papeis(campanhaId) : null;
  const { data, error, isLoading, mutate } = useSWR<PapelCampanhaList>(
    key,
    campanhaId ? () => listarPapeis(campanhaId) : null,
    SWR_OPTS
  );
  return {
    papeis: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    isMock: !isLoading && !error && (data?.items?.length ?? 0) === 0,
    mutate,
  };
}

// ---------------------------------------------------------------------------
// useAgregacao — KPIs de uma cerca específica
// ---------------------------------------------------------------------------
export function useAgregacao(cercaId: string | null | undefined) {
  const key = cercaId ? swrKeys.agregacao(cercaId) : null;
  const { data, error, isLoading } = useSWR<CercaAgregacao>(
    key,
    cercaId ? () => getAgregacao(cercaId) : null,
    { ...SWR_OPTS, shouldRetryOnError: false }
  );
  return {
    agregacao: data ?? null,
    isLoading,
    isError: !!error,
  };
}

// ---------------------------------------------------------------------------
// useAniversariantes — pessoas com aniversário hoje/semana/mês
// ---------------------------------------------------------------------------
export function useAniversariantes(
  dia: "hoje" | "semana" | "mes",
  tenantId?: number
) {
  const key = swrKeys.aniversariantes(dia, tenantId);
  const { data, error, isLoading } = useSWR<PessoaBase[]>(
    key,
    () => listarAniversariantes(dia, tenantId),
    { ...SWR_OPTS, refreshInterval: 60_000 } // revalida a cada 1min para "hoje"
  );
  return {
    aniversariantes: data ?? [],
    count: data?.length ?? 0,
    isLoading,
    isError: !!error,
    isMock: !isLoading && !error && (data?.length ?? 0) === 0,
  };
}

// ---------------------------------------------------------------------------
// useAgregacoesCercas — agrega KPIs de múltiplas cercas (loop de hooks)
// Uso: const { agregacoesPorId } = useAgregacoesCercas(["id1","id2"])
// Nota: chamada com lista fixa — não alterar comprimento dinâmico
// ---------------------------------------------------------------------------
export function useAgregacaoCerca(cercaId: string | null | undefined) {
  // Alias público — mesmo que useAgregacao mas nome mais explícito
  return useAgregacao(cercaId);
}
