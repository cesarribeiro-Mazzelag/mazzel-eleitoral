/**
 * Hooks SWR para os endpoints do mapa eleitoral.
 *
 * Cada hook lê do store global (mapaStore) para construir a key via funções
 * puras em `lib/mapa/keys.ts`. Componentes só precisam chamar o hook — o
 * cache, o dedupe e o revalidate ficam por conta do SWR.
 *
 * Regra: NÃO recalcular dados aqui. Backend é a única fonte de verdade.
 */
import useSWR from "swr";
import { useMapaStore } from "@/lib/store/mapaStore";
import { mapaFetcher, SWR_DEFAULTS, buildQs } from "@/lib/mapa/fetcher";
import {
  keyGeojsonBrasil,
  keyGeojsonBrasilMunicipios,
  keyGeojsonEstado,
  keyHeatmap,
  keyMunicipioResumo,
  keyRecomendacoes,
  keyPainelMunicipio,
  keyMunicipioDetalhe,
  keyMunicipioVereadores,
  keyMunicipioZonas,
  keyEstadoEleitos,
  keyEstadoNaoEleitos,
  keyEstadoCidadesPartido,
  keyRankingPartidos,
  keyDistritoResumo,
  KEY_PARTIDOS,
  KEY_FAROL_GLOBAL,
} from "@/lib/mapa/keys";

// ── Hooks de GeoJSON ─────────────────────────────────────────────────────────

/** GeoJSON dos 27 estados (nível Brasil). */
export function useGeojsonBrasil() {
  const f = useMapaStore((s) => s.filters);
  return useSWR(keyGeojsonBrasil(f), mapaFetcher, SWR_DEFAULTS);
}

/** GeoJSON dos 5571 municípios do Brasil (granularidade fina, nível Brasil). */
export function useGeojsonBrasilMunicipios() {
  const f = useMapaStore((s) => s.filters);
  return useSWR(keyGeojsonBrasilMunicipios(f), mapaFetcher, SWR_DEFAULTS);
}

/** GeoJSON dos municípios de um estado (drill nível estado). */
export function useGeojsonEstado() {
  const f = useMapaStore((s) => s.filters);
  const g = useMapaStore((s) => s.geography);
  return useSWR(keyGeojsonEstado(f, g), mapaFetcher, SWR_DEFAULTS);
}

/** Pontos para o layer heatmap nativo do MapLibre. */
export function useHeatmap() {
  const f = useMapaStore((s) => s.filters);
  const g = useMapaStore((s) => s.geography);
  return useSWR(keyHeatmap(f, g), mapaFetcher, SWR_DEFAULTS);
}

// ── Hooks de painel ──────────────────────────────────────────────────────────

/** Resumo enxuto do município selecionado (prefeito + vereadores). */
export function useMunicipioResumo() {
  const f = useMapaStore((s) => s.filters);
  const g = useMapaStore((s) => s.geography);
  return useSWR(keyMunicipioResumo(f, g), mapaFetcher, SWR_DEFAULTS);
}

/** Recomendação estratégica para a região atual (estado ou município). */
export function useRecomendacoes() {
  const f = useMapaStore((s) => s.filters);
  const g = useMapaStore((s) => s.geography);
  return useSWR(keyRecomendacoes(f, g), mapaFetcher, SWR_DEFAULTS);
}

/** Lista de partidos com totais (alimenta o seletor). */
export function usePartidos() {
  return useSWR(KEY_PARTIDOS, mapaFetcher, {
    ...SWR_DEFAULTS,
    dedupingInterval: 5 * 60_000, // partidos quase nunca mudam
  });
}

/** Painel completo de município (endpoint /mapa/municipio/{ibge}). */
export function usePainelMunicipio(codigoIbge: string | null) {
  return useSWR(keyPainelMunicipio(codigoIbge), mapaFetcher, SWR_DEFAULTS);
}

/**
 * Detalhe completo de um município (mesmo endpoint de usePainelMunicipio).
 * Aceita o ibge como argumento explícito pra usos fora do store (hover preview).
 */
export function useMunicipioDetalhe(codigoIbge: string | null) {
  return useSWR(keyMunicipioDetalhe(codigoIbge), mapaFetcher, SWR_DEFAULTS);
}

/** Vereadores do município atual (lê do store). */
export function useMunicipioVereadores() {
  const f = useMapaStore((s) => s.filters);
  const g = useMapaStore((s) => s.geography);
  return useSWR(keyMunicipioVereadores(f, g), mapaFetcher, SWR_DEFAULTS);
}

/** Vereadores por código IBGE explícito (sem depender do store). */
export function useMunicipioVereadoresBy(codigoIbge: string | null) {
  const key = codigoIbge ? `/mapa/municipio/${codigoIbge}/vereadores` : null;
  return useSWR(key, mapaFetcher, SWR_DEFAULTS);
}

/** Zonas eleitorais de um município (bar horizontal de zonas G1-like). */
export function useMunicipioZonas() {
  const f = useMapaStore((s) => s.filters);
  const g = useMapaStore((s) => s.geography);
  return useSWR(keyMunicipioZonas(f, g), mapaFetcher, SWR_DEFAULTS);
}

/** Eleitos de um estado (todos os cargos do ciclo). */
export function useEstadoEleitos() {
  const f = useMapaStore((s) => s.filters);
  const g = useMapaStore((s) => s.geography);
  return useSWR(keyEstadoEleitos(f, g), mapaFetcher, SWR_DEFAULTS);
}

/** Não-eleitos de um estado para o cargo atual (corrige Bug 2 do plano). */
export function useEstadoNaoEleitos() {
  const f = useMapaStore((s) => s.filters);
  const g = useMapaStore((s) => s.geography);
  return useSWR(keyEstadoNaoEleitos(f, g), mapaFetcher, SWR_DEFAULTS);
}

/**
 * Variante com args explícitos para casos fora do contexto do store.
 * Ex: ConteudoBrasilRanking usa uf="BR" hardcoded pra PRESIDENTE.
 */
export function useEstadoEleitosBy(
  uf: string | null,
  cargo: string | null,
  ano?: number,
  turno?: number
) {
  const qs = buildQs({ cargo, ano, turno });
  const key = uf ? `/mapa/estado/${uf}/eleitos${qs}` : null;
  return useSWR(key, mapaFetcher, SWR_DEFAULTS);
}

export function useEstadoNaoEleitosBy(
  uf: string | null,
  cargo: string | null,
  ano?: number,
  turno?: number
) {
  const qs = buildQs({ cargo, ano, turno });
  const key = uf ? `/mapa/estado/${uf}/nao-eleitos${qs}` : null;
  return useSWR(key, mapaFetcher, SWR_DEFAULTS);
}

export function useRankingPartidosBy(args: {
  cargo?: string | null;
  ano?: number | null;
  turno?: number | null;
  uf?: string | null;
}) {
  const qs = buildQs({
    cargo: args.cargo && args.cargo !== "VIGENTES" ? args.cargo : null,
    ano: args.cargo && args.cargo !== "VIGENTES" ? args.ano : null,
    turno: args.cargo && args.cargo !== "VIGENTES" ? args.turno ?? 1 : null,
    uf: args.uf,
  });
  return useSWR(`/mapa/ranking-partidos${qs}`, mapaFetcher, SWR_DEFAULTS);
}

/**
 * Cidades de um estado onde um partido elegeu candidatos.
 * Só dispara quando há 1 partido selecionado em nivel=estado.
 */
export function useEstadoCidadesPartido(partidoNum: number | null) {
  const f = useMapaStore((s) => s.filters);
  const g = useMapaStore((s) => s.geography);
  return useSWR(
    keyEstadoCidadesPartido(f, g, partidoNum),
    mapaFetcher,
    SWR_DEFAULTS
  );
}

/**
 * Ranking de partidos contextual (nível atual: brasil, estado ou municipio).
 * Backend decide agregação pelo context (uf e ibge no querystring).
 */
export function useRankingPartidos() {
  const f = useMapaStore((s) => s.filters);
  const g = useMapaStore((s) => s.geography);
  return useSWR(keyRankingPartidos(f, g), mapaFetcher, SWR_DEFAULTS);
}

/** Resumo de um distrito (sub-divisão municipal) dentro do município atual. */
export function useDistritoResumo() {
  const f = useMapaStore((s) => s.filters);
  const g = useMapaStore((s) => s.geography);
  return useSWR(keyDistritoResumo(f, g), mapaFetcher, SWR_DEFAULTS);
}

/** Farol global do mapa. Lido 1× por sessão. */
export function useFarolGlobal() {
  return useSWR(KEY_FAROL_GLOBAL, mapaFetcher, {
    ...SWR_DEFAULTS,
    dedupingInterval: 5 * 60_000,
  });
}

// ── Hook genérico ────────────────────────────────────────────────────────────

/**
 * Hook SWR para URLs construídas dinamicamente em componentes que têm
 * lógica de URL complexa demais para um hook dedicado.
 *
 * `buildUrl` é chamada a cada render — quando devolve a mesma string, SWR
 * faz cache hit. Quando devolve `null`, SWR pula a chamada (loading=false).
 *
 * Use isto para migrar useEffects de fetch existentes sem reescrever a
 * lógica de URL.
 */
export function useMapaUrlSwr<T = any>(buildUrl: () => string | null) {
  const url = buildUrl();
  return useSWR<T>(url, mapaFetcher, SWR_DEFAULTS);
}

// ── Helpers exportados (retrocompatibilidade; usar `lib/mapa/fetcher` em código novo) ──

export { mapaFetcher, buildQs as mapaBuildQs };
