/* Helpers Nominata · 1:1 com 07-saude-nominatas.app.js do Designer */

import { NOMINATA_DATA } from "./dados";

export const fmt = (n) => (typeof n === "number" ? n.toLocaleString("pt-BR") : n);

// score ponderado: sum(score_sub × peso_sub) / sum(pesos)
export function calcScore(scores) {
  const total = NOMINATA_DATA.SUBMEDIDAS.reduce((acc, sm) => acc + sm.peso, 0);
  const sum = NOMINATA_DATA.SUBMEDIDAS.reduce(
    (acc, sm) => acc + (scores[sm.key] || 0) * sm.peso,
    0,
  );
  return Math.round(sum / total);
}

export function tierFromScore(s) {
  if (s >= 75) return "ok";
  if (s >= 55) return "high";
  return "crit";
}

export function tierColor(t) {
  return t === "ok" ? "#22c55e" : t === "high" ? "#f59e0b" : "#f87171";
}

export function tierLabel(t) {
  return t === "ok" ? "SAUDÁVEL" : t === "high" ? "ATENÇÃO" : "CRÍTICA";
}

// Conversão coords mockup SVG (700×720) → lng/lat aproximado SP.
// Mockup: viewBox 0..700 horizontal, 0..720 vertical. SP real: lng [-53.1, -44.16], lat [-25.31, -19.78].
// Mapeamento linear simples - o suficiente pra layout de markers no mapa de SP.
export function svgCoordsToLngLat(x, y) {
  const lngMin = -53.1, lngMax = -44.16;
  const latMin = -25.31, latMax = -19.78;
  const lng = lngMin + (x / 700) * (lngMax - lngMin);
  const lat = latMax - (y / 720) * (latMax - latMin);
  return [lng, lat];
}
