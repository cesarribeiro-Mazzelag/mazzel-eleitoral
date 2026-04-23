/**
 * Hooks SWR — Portal do Politico (meu-painel)
 * Acesso: apenas perfil POLITICO. Retorna isMock=true para outros perfis.
 */
"use client";

import useSWR from "swr";
import {
  getPortalResumo,
  getPortalVotos,
  portalKeys,
  type PortalResumo,
  type PortalVotos,
} from "@/lib/apiPortal";

const SWR_OPTS = {
  revalidateOnFocus: false,
  keepPreviousData: true,
  shouldRetryOnError: false, // 403 nao deve fazer retry
};

// ---------------------------------------------------------------------------
// usePortalResumo — dashboard pessoal do politico
// ---------------------------------------------------------------------------

export function usePortalResumo() {
  const { data, error, isLoading } = useSWR<PortalResumo>(
    portalKeys.resumo,
    () => getPortalResumo(),
    SWR_OPTS
  );

  return {
    resumo: data ?? null,
    candidato: data?.candidato ?? null,
    candidaturas: data?.candidaturas ?? [],
    farol: data?.farol_ultima_eleicao ?? null,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data),
  };
}

// ---------------------------------------------------------------------------
// usePortalVotos — historico de votos por municipio
// ---------------------------------------------------------------------------

export function usePortalVotos() {
  const { data, error, isLoading } = useSWR<PortalVotos>(
    portalKeys.votos,
    () => getPortalVotos(),
    SWR_OPTS
  );

  return {
    candidatura: data?.candidatura ?? null,
    votosPorMunicipio: data?.votos_por_municipio ?? [],
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data),
  };
}
