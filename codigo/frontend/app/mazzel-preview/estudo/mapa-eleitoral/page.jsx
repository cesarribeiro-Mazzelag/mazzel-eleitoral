"use client";

/* Estudo · Mapa Eleitoral histórico
 *
 * Decisão canônica [[Decisao - Mapa Estrategico vs Mapa Eleitoral 2026-04-25]]:
 *   /mazzel-preview/mapa = Mapa Estratégico (cobertura UB, scores, emendas, equipe)
 *   /mazzel-preview/estudo/mapa-eleitoral = Mapa Eleitoral histórico TSE
 *
 * Esta rota preserva o MapaEleitoral.tsx (3196 linhas, drill-down 5 níveis,
 * microbairros SP, 12 hooks SWR) sem modificações - só hospeda em outra
 * URL pra liberar /mapa pro Estratégico.
 */

import { MapaEleitoral } from "@/components/map/MapaEleitoral";

export default function Page() {
  return (
    <div style={{ height: "calc(100vh - 48px)", overflow: "hidden", position: "relative" }}>
      <MapaEleitoral />
    </div>
  );
}
