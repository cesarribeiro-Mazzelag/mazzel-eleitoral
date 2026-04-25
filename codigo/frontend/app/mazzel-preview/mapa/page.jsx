"use client";

/* Rota /mazzel-preview/mapa — mapa eleitoral portado para a nova plataforma.
 *
 * O Shell do mazzel-preview envolve o conteúdo em .main-scroll (flex: 1, overflow: auto).
 * Para que o mapa ocupe toda a área disponível sem barra de scroll, este wrapper
 * seta height: 100% + overflow: hidden no container intermediário. O componente
 * Mapa.jsx usa position: absolute para seus filhos, então basta o pai ter dimensoes
 * corretas.
 *
 * Componentes portados de components/plataforma-v2/modulos/:
 *   - Mapa.jsx        — container principal (toolbar, context panel, legenda)
 *   - MapaLibreCanvas.jsx — motor MapLibre GL JS
 *   - BrasilChoropleth.jsx — fallback SVG + ufName
 */

import { Mapa } from "@/components/plataforma-v2/modulos/Mapa";

export default function MapaPage() {
  /* O Shell envolve este conteudo em .main-scroll (flex: 1, overflow: auto).
   * Para que o mapa ocupe toda a viewport disponivel sem barra de scroll,
   * usamos height: calc(100vh - 48px) — a topbar do Shell tem 48px (var definida
   * no platform.css como .topbar { height: 48px }). A sidebar nao subtrai porque
   * esta fora do fluxo do main-scroll. */
  return (
    <div style={{ height: "calc(100vh - 48px)", overflow: "hidden", position: "relative" }}>
      <Mapa />
    </div>
  );
}
