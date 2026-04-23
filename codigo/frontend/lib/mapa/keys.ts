/**
 * Derivação central de SWR keys a partir do state do mapa.
 *
 * Regra: hooks SWR do mapa NÃO constroem URLs inline. Toda key sai de uma
 * função pura aqui. Isso garante:
 *   - Cache hit determinístico (mesma entrada = mesma key).
 *   - Invalidação coordenada (um filtro muda = todas as keys relacionadas
 *     mudam juntas).
 *   - Auditoria: grep por `keys.*` mostra todo o universo de requests do mapa.
 *
 * Naming convention: `key<Recurso>(filters, geography?)` retorna string ou null.
 * Retornar null faz o SWR pular a chamada (ex: geojson de estado sem UF).
 */
import { buildQs } from "./fetcher";
import type {
  MapaFilters,
  MapaGeography,
} from "@/lib/store/mapaStore";

// Re-export para consumidores que só precisam dos tipos
export type { MapaFilters, MapaGeography };

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Ajuste do turno pra endpoints que pintam o mapa.
 *
 * `turno=0` ("Total") é abstração de UI apenas — no backend o mapa é pintado
 * pela cor do partido eleito (que não muda entre turnos). Endpoints de pintura
 * (/geojson/*) convertem 0 → 1. Endpoints de agregação (/ranking-partidos,
 * /totais-apuracao) aceitam 0 como "todos os turnos".
 */
function turnoMapa(turno: number): number {
  return turno === 0 ? 1 : turno;
}

// ── Keys de GeoJSON ──────────────────────────────────────────────────────────

/** GeoJSON dos 27 estados (nível Brasil). */
export function keyGeojsonBrasil(f: MapaFilters): string {
  const qs = buildQs({
    ano: f.ano,
    cargo: f.cargo,
    modo: f.modo === "heatmap" ? "eleitos" : f.modo,
    partido: f.partido,
    candidato_id: f.candidatoId,
    turno: turnoMapa(f.turno),
  });
  return `/mapa/geojson/brasil${qs}`;
}

/** GeoJSON dos 5571 municípios do Brasil (granularidade fina, nível Brasil). */
export function keyGeojsonBrasilMunicipios(f: MapaFilters): string {
  const qs = buildQs({
    ano: f.ano,
    cargo: f.cargo,
    partido: f.partido,
    turno: turnoMapa(f.turno),
  });
  return `/mapa/geojson/brasil-municipios${qs}`;
}

/** GeoJSON dos municípios de um estado (drill nível estado). */
export function keyGeojsonEstado(
  f: MapaFilters,
  g: MapaGeography
): string | null {
  if (!g.uf) return null;
  const qs = buildQs({
    ano: f.ano,
    cargo: f.cargo,
    modo: f.modo === "heatmap" ? "eleitos" : f.modo,
    partido: f.partido,
    candidato_id: f.candidatoId,
    turno: turnoMapa(f.turno),
  });
  return `/mapa/geojson/${g.uf}${qs}`;
}

/** Pontos do heatmap (só quando modo === "heatmap"). */
export function keyHeatmap(
  f: MapaFilters,
  g: MapaGeography
): string | null {
  if (f.modo !== "heatmap") return null;
  const qs = buildQs({
    ano: f.ano,
    cargo: f.cargo,
    partido: f.partido,
    uf: g.uf,
  });
  return `/mapa/heatmap${qs}`;
}

// ── Keys de painel/sidebar ───────────────────────────────────────────────────

/** Resumo do município (prefeito + vereadores). */
export function keyMunicipioResumo(
  f: MapaFilters,
  g: MapaGeography
): string | null {
  if (!g.ibge) return null;
  return `/mapa/municipio/${g.ibge}/resumo?ano=${f.ano}`;
}

/** Painel completo do município. */
export function keyPainelMunicipio(ibge: string | null): string | null {
  return ibge ? `/mapa/municipio/${ibge}` : null;
}

/** Recomendações estratégicas para região atual (estado ou município). */
export function keyRecomendacoes(
  f: MapaFilters,
  g: MapaGeography
): string | null {
  const regiao = g.ibge ?? g.uf ?? null;
  if (!f.partido || !regiao) return null;
  const qs = buildQs({
    partido: f.partido,
    cargo: f.cargo,
    ano: f.ano,
  });
  return `/mapa/recomendacoes/${regiao}${qs}`;
}

/** Totais agregados de apuração (nível + contexto). */
export function keyTotaisApuracao(
  f: MapaFilters,
  g: MapaGeography,
  nivel: "brasil" | "estado" | "municipio"
): string {
  const qs = buildQs({
    nivel,
    uf: g.uf,
    codigo_ibge: g.ibge,
    cargo: f.cargo,
    ano: f.ano,
    turno: f.turno, // aqui turno=0 é semântico ("total")
  });
  return `/mapa/totais-apuracao${qs}`;
}

/** Ranking de partidos no contexto atual. */
export function keyRankingPartidos(
  f: MapaFilters,
  g: MapaGeography
): string {
  const qs = buildQs({
    ano: f.ano,
    cargo: f.cargo,
    turno: f.turno,
    uf: g.uf,
    codigo_ibge: g.ibge,
  });
  return `/mapa/ranking-partidos${qs}`;
}

/** Eleitos de um estado (todos os cargos do ciclo). */
export function keyEstadoEleitos(
  f: MapaFilters,
  g: MapaGeography
): string | null {
  if (!g.uf) return null;
  const qs = buildQs({ ano: f.ano, turno: f.turno });
  return `/mapa/estado/${g.uf}/eleitos${qs}`;
}

/** Não-eleitos de um estado/cargo. */
export function keyEstadoNaoEleitos(
  f: MapaFilters,
  g: MapaGeography
): string | null {
  if (!g.uf) return null;
  const qs = buildQs({
    cargo: f.cargo,
    ano: f.ano,
    turno: f.turno,
    partido: f.partido,
  });
  return `/mapa/estado/${g.uf}/nao-eleitos${qs}`;
}

/** Zonas eleitorais de um município. */
export function keyMunicipioZonas(
  f: MapaFilters,
  g: MapaGeography
): string | null {
  if (!g.ibge) return null;
  const qs = buildQs({
    cargo: f.cargo,
    ano: f.ano,
    turno: f.turno,
  });
  return `/mapa/municipio/${g.ibge}/zonas${qs}`;
}

/** Comparativo candidato×zona de um município. */
export function keyMunicipioComparativoZonas(
  f: MapaFilters,
  g: MapaGeography
): string | null {
  if (!g.ibge) return null;
  const qs = buildQs({
    cargo: f.cargo,
    ano: f.ano,
    turno: f.turno,
  });
  return `/mapa/municipio/${g.ibge}/comparativo-zonas${qs}`;
}

/** Top 2 candidatos de um município (tooltip rico Globo-like). */
export function keyMunicipioTop2(
  f: MapaFilters,
  g: MapaGeography
): string | null {
  if (!g.ibge) return null;
  const qs = buildQs({
    cargo: f.cargo,
    ano: f.ano,
    turno: f.turno,
  });
  return `/mapa/municipio/${g.ibge}/top2${qs}`;
}

/** Vereadores de um município. */
export function keyMunicipioVereadores(
  f: MapaFilters,
  g: MapaGeography
): string | null {
  if (!g.ibge) return null;
  const qs = buildQs({
    ano: f.ano,
    turno: f.turno,
    partido: f.partido,
  });
  return `/mapa/municipio/${g.ibge}/vereadores${qs}`;
}

/** Detalhe completo do município (endpoint raiz /mapa/municipio/{ibge}). */
export function keyMunicipioDetalhe(ibge: string | null): string | null {
  return ibge ? `/mapa/municipio/${ibge}` : null;
}

/**
 * Cidades onde um partido elegeu candidatos no estado (usado na sidebar
 * quando um único partido está selecionado em nivel=estado).
 */
export function keyEstadoCidadesPartido(
  f: MapaFilters,
  g: MapaGeography,
  partidoNum: number | null
): string | null {
  if (!g.uf || !partidoNum) return null;
  const qs = buildQs({ cargo: f.cargo, ano: f.ano, turno: f.turno });
  return `/mapa/estado/${g.uf}/partido/${partidoNum}/cidades${qs}`;
}

/** Resumo de um distrito (sub-divisão municipal) dentro de um município. */
export function keyDistritoResumo(
  f: MapaFilters,
  g: MapaGeography
): string | null {
  if (!g.ibge || !g.cdDist) return null;
  const qs = buildQs({
    cargo: f.cargo,
    ano: f.ano,
    turno: f.turno,
    partido: f.partido,
  });
  return `/mapa/municipio/${g.ibge}/distrito/${g.cdDist}/resumo${qs}`;
}

// ── Keys estáticas ───────────────────────────────────────────────────────────

/** Lista de partidos (cache longo — quase não muda). */
export const KEY_PARTIDOS = "/mapa/partidos";

/** Farol global (1× por sessão). */
export const KEY_FAROL_GLOBAL = "/mapa/farol";
