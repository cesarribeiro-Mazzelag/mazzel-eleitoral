"use client";

/* Rota /mazzel-preview/mapa - Mapa Eleitoral V2.
 *
 * Refator 25/04/2026 (noite): substitui o wrapper skeletal
 * `plataforma-v2/modulos/Mapa.jsx` (504 linhas, ~10% do que existia na V1)
 * pelo `components/map/MapaEleitoral.tsx` (3196 linhas) que ja estava no
 * repo com TODAS as features:
 *   - Drill-down 5 niveis (Brasil > UF > Municipio > Bairro > Escola)
 *   - Foto do candidato no hover (interacao destacada pelo Cesar)
 *   - Sidebar contextual com 8 ConteudoXXX
 *   - Tabs Turno (1T/2T/Total)
 *   - Tooltip X9 estilo Globo G1
 *   - Microbairros SP (1.795 poligonos)
 *   - Comparativo de zonas
 *   - 11 endpoints integrados (/mapa/farol, /mapa/municipio/{ibge}/top2, etc)
 *
 * O Shell do mazzel-preview (layout.jsx) ja envolve em <Shell> com topbar
 * de 48px. NAO usar AppLayout aqui (geraria double-shell). Wrapper apenas
 * garante height/overflow corretos pro mapa MapLibre ocupar a area visivel.
 *
 * Pendencia (proxima sessao Designer): decisao 25/04 manha foi mover Mapa
 * Eleitoral pra sub-tela do modulo Estudo, e a sidebar principal recebe
 * Mapa Estrategico (novo). Esta rota /mazzel-preview/mapa eh transicional
 * ate o Estudo ficar pronto.
 */

import { MapaEleitoral } from "@/components/map/MapaEleitoral";

export default function MapaPage() {
  return (
    <div style={{ height: "calc(100vh - 48px)", overflow: "hidden", position: "relative" }}>
      <MapaEleitoral />
    </div>
  );
}
