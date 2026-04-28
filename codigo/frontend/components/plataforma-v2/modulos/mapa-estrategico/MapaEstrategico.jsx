"use client";

/* Módulo Mapa Estratégico
 *
 * Decisão canônica [[Decisao - Mapa Estrategico vs Mapa Eleitoral 2026-04-25]]:
 *   /mazzel-preview/mapa = Mapa Estratégico (cobertura UB, scores, emendas, equipe)
 *
 * Compõe:
 *   - Engine: <MapaEleitoral /> em modo wrapper (Fase 0a refator 27/04 -
 *     props chrome+overlays). Drill-down 5 níveis + hover + tooltip preservados.
 *   - Topbar: 3 Modos pré-config (canon Cérebro 27/04) + 5 camadas individuais
 *     (modo Avançado, plataforma.html linhas 1226-1232) + Ano + Comparar UFs + Exportar
 *   - Sidebar direita: preview da UF selecionada (KPIs UB-state + Pres Estadual
 *     + Sentinela 24h + Ações Sugeridas). Lê uf do useMapaStore.
 *
 * Default: Modo "Saúde Operacional" (visão "como está minha operação AGORA").
 */

import { useState } from "react";
import { MapaEleitoral } from "@/components/map/MapaEleitoral";
import { TopbarEstrategico } from "./TopbarEstrategico";
import { SidebarPreviewUF } from "./SidebarPreviewUF";

export function MapaEstrategico() {
  const [modo, setModo] = useState("saude");
  const [camadaAvancada, setCamadaAvancada] = useState("partido");
  const [ano, setAno] = useState("2026 (proj.)");
  const [comparando, setComparando] = useState(false);
  const [avancadoAberto, setAvancadoAberto] = useState(false);

  return (
    <div style={{ position: "relative", height: "calc(100vh - 48px)", overflow: "hidden" }}>
      <MapaEleitoral
        esconderTopbar
        esconderSidebar
        overlayTop={
          <TopbarEstrategico
            modo={modo}
            onModo={setModo}
            camadaAvancada={camadaAvancada}
            onCamadaAvancada={setCamadaAvancada}
            ano={ano}
            onAno={setAno}
            comparando={comparando}
            onComparar={() => setComparando((v) => !v)}
            avancadoAberto={avancadoAberto}
            onToggleAvancado={() => setAvancadoAberto((v) => !v)}
          />
        }
        overlayRight={<SidebarPreviewUF />}
      />
    </div>
  );
}
