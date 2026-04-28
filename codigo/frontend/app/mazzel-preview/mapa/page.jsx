"use client";

/* Rota /mazzel-preview/mapa = Mapa Estratégico (sidebar principal).
 *
 * Decisão canônica [[Decisao - Mapa Estrategico vs Mapa Eleitoral 2026-04-25]]:
 *   Mapa Estratégico = visão "como está minha operação UB AGORA"
 *   (cobertura, lideranças, eleitos, emendas, scores, equipe).
 *
 * O Mapa Eleitoral histórico (votos TSE, drill-down) mudou pra:
 *   /mazzel-preview/estudo/mapa-eleitoral
 *
 * Implementação: MapaEstrategico compõe o engine MapaEleitoral.tsx (Fase 0a
 * refator 27/04 - props chrome+overlays) com sua própria topbar (3 Modos
 * pré-config) e sidebar (preview UB-state). MapLibre canon mantido.
 */

import { MapaEstrategico } from "@/components/plataforma-v2/modulos/mapa-estrategico/MapaEstrategico";

export default function MapaPage() {
  return <MapaEstrategico />;
}
