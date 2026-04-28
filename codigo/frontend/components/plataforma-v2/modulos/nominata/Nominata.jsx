"use client";

/* Módulo Nominata · 1:1 com Designer V1.2 (07-saude-nominatas.html)
 *
 * O módulo é "Nominata" - a lista oficial de candidatos do partido.
 * Saúde é UMA das ferramentas de avaliação dentro dele (não o nome).
 *
 * 5 abas (mesma ordem do mockup):
 *  01 · Avaliação Saúde   (hexágono 7 sub-medidas + sinalizações)
 *  02 · Heatmap SP        (MapLibre real - polígono SP + markers municípios)
 *  03 · Ranking           (3 cards destaque + tabela 18 amostras)
 *  04 · Dossiê Comissão   (Tatuí - 7 seções: id, sub-medidas, sinalizações,
 *                          pulso filiação, cronologia, jurídica, recomendações)
 *  05 · Alertas Anti-Fraude (feed agrupado temporal + regras configuradas)
 *
 * Topbar do mockup (brand UB + breadcrumb + tema + user) já vem do Shell
 * global do mazzel-preview - não duplicar aqui.
 */

import { useState } from "react";
import { AvaliacaoSaude } from "./AvaliacaoSaude";
import { HeatmapSP } from "./HeatmapSP";
import { Ranking } from "./Ranking";
import { Dossie } from "./Dossie";
import { Alertas } from "./Alertas";

const TABS = [
  { id: "hex",    num: "01", label: "Avaliação Saúde" },
  { id: "map",    num: "02", label: "Heatmap SP" },
  { id: "rank",   num: "03", label: "Ranking",            dot: true },
  { id: "dossie", num: "04", label: "Dossiê Comissão",    dot: true },
  { id: "ale",    num: "05", label: "Alertas Anti-Fraude", dot: true },
];

export function Nominata() {
  const [tab, setTab] = useState("hex");

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--mz-bg-page)" }}>

      {/* TABS · 44px (1:1 mockup linha 51-70) */}
      <div
        className="flex items-stretch flex-shrink-0"
        style={{
          height: 44,
          padding: "0 24px",
          background: "var(--mz-bg-page)",
          borderBottom: "1px solid var(--mz-rule)",
          gap: 0,
        }}
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 cursor-pointer"
              style={{
                padding: "0 18px",
                border: 0,
                background: "transparent",
                color: active ? "var(--mz-fg-strong)" : "var(--mz-fg-muted)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.02em",
                borderBottom: active
                  ? "2px solid var(--mz-tenant-accent)"
                  : "2px solid transparent",
                height: "100%",
                transition: "color 100ms",
              }}
            >
              <span
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 9.5,
                  color: active ? "var(--mz-tenant-accent)" : "var(--mz-fg-faint)",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                {t.num}
              </span>
              {t.label}
              {t.dot && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--mz-danger)",
                    display: "inline-block",
                  }}
                />
              )}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        <div
          className="flex items-center gap-2.5"
          style={{
            fontSize: 10.5,
            color: "var(--mz-fg-faint)",
            paddingRight: 4,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          <span
            style={{
              background: "var(--mz-bg-card)",
              border: "1px solid var(--mz-rule)",
              padding: "3px 10px",
              borderRadius: 999,
            }}
          >
            UF · <b style={{ color: "var(--mz-fg)", fontWeight: 700 }}>SP</b>
          </span>
          <span
            style={{
              background: "var(--mz-bg-card)",
              border: "1px solid var(--mz-rule)",
              padding: "3px 10px",
              borderRadius: 999,
            }}
          >
            RECORTE · <b style={{ color: "var(--mz-fg)", fontWeight: 700 }}>2024-2028</b>
          </span>
        </div>
      </div>

      {/* VIEWS · 1fr */}
      <div className="flex-1 relative overflow-hidden">
        {tab === "hex"    && <AvaliacaoSaude />}
        {tab === "map"    && <HeatmapSP />}
        {tab === "rank"   && <Ranking />}
        {tab === "dossie" && <Dossie />}
        {tab === "ale"    && <Alertas />}
      </div>
    </div>
  );
}
