/**
 * Hooks SWR — Modulo Radar Politico
 * Endpoints: GET /radar/politicos, GET /radar/partidos
 *
 * isMock=true quando API falha ou retorna vazio.
 */
"use client";

import useSWR from "swr";
import {
  listarPoliticos,
  listarPartidos,
  radarKeys,
  type FiltrosPoliticos,
  type RadarPoliticosResponse,
  type RadarPartidosResponse,
} from "@/lib/apiRadar";

const SWR_OPTS = {
  revalidateOnFocus: false,
  keepPreviousData: true,
  shouldRetryOnError: false,
};

// ---------------------------------------------------------------------------
// useRadarPoliticos — lista paginada do hub de politicos
// ---------------------------------------------------------------------------

export function useRadarPoliticos(filtros?: FiltrosPoliticos) {
  const key = radarKeys.politicos(filtros);
  const { data, error, isLoading } = useSWR<RadarPoliticosResponse>(
    key,
    () => listarPoliticos(filtros),
    SWR_OPTS
  );

  return {
    politicos: data?.items ?? [],
    total: data?.total ?? 0,
    pagina: data?.pagina ?? 1,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data || (data.items?.length ?? 0) === 0),
  };
}

// ---------------------------------------------------------------------------
// useRadarPartidos — lista paginada do hub de partidos
// ---------------------------------------------------------------------------

export function useRadarPartidos(filtros?: { ano?: number; ordenar_por?: string; por_pagina?: number }) {
  const key = radarKeys.partidos(filtros);
  const { data, error, isLoading } = useSWR<RadarPartidosResponse>(
    key,
    () => listarPartidos(filtros),
    SWR_OPTS
  );

  return {
    partidos: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    isMock: !isLoading && (!!error || !data || (data.items?.length ?? 0) === 0),
  };
}
