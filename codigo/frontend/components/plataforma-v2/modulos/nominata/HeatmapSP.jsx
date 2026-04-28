"use client";

/* Nominata · Aba 02 · Heatmap SP
 * 1:1 com Designer (07-saude-nominatas.html linhas 134-160 + app.js 227-353)
 *
 * Princípio canônico (decisão Cérebro 25/04 + 27/04 noite):
 *   MapLibre real em TODOS os mapas da plataforma. SVG estático = bug.
 *
 * Layout 3 colunas: legenda+filtros (280) | mapa MapLibre (1fr) | resumo SP+detalhe (320)
 *
 * 18 markers totais: 3 destaques (Bauru/Marília/Tatuí com score grande)
 * + 15 secundárias. Coords convertidas das xy do mockup SVG (700×720)
 * pra lng/lat aproximadas via helpers.svgCoordsToLngLat.
 */

import { useState, useMemo } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { NOMINATA_DATA } from "./dados";
import { calcScore, tierColor, tierLabel, fmt, svgCoordsToLngLat } from "./helpers";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// SP bounding box (oeste/sul, leste/norte)
const SP_BOUNDS = [
  [-53.1, -25.31],
  [-44.16, -19.78],
];

// coords manuais (lng/lat reais) das 3 comissões principais - mais precisas que conversão xy
const PRINC_COORDS = {
  bauru:   { lng: -49.06, lat: -22.32 },
  marilia: { lng: -49.95, lat: -22.21 },
  tatui:   { lng: -47.86, lat: -23.36 },
};

export function HeatmapSP() {
  const [selecionada, setSelecionada] = useState(null);

  // 3 destaques + 15 secundárias com lng/lat
  const markers = useMemo(() => {
    const principais = NOMINATA_DATA.COMISSOES.map((c) => ({
      ...c,
      score: calcScore(c.scores),
      lng: PRINC_COORDS[c.id]?.lng ?? svgCoordsToLngLat(0, 0)[0],
      lat: PRINC_COORDS[c.id]?.lat ?? svgCoordsToLngLat(0, 0)[1],
      destaque: true,
    }));
    const secundarias = NOMINATA_DATA.COMISSOES_SECUNDARIAS.map((c) => {
      const [lng, lat] = svgCoordsToLngLat(c.x, c.y);
      return { ...c, lng, lat, destaque: false };
    });
    return [...principais, ...secundarias];
  }, []);

  const todas = useMemo(() => {
    return [
      ...NOMINATA_DATA.COMISSOES.map((c) => ({ ...c, score: calcScore(c.scores) })),
      ...NOMINATA_DATA.COMISSOES_SECUNDARIAS,
    ];
  }, []);

  const total = todas.length;
  const ok = todas.filter((c) => c.tier === "ok").length;
  const high = todas.filter((c) => c.tier === "high").length;
  const crit = todas.filter((c) => c.tier === "crit").length;
  const scoreMedio = Math.round(todas.reduce((acc, c) => acc + c.score, 0) / total);

  return (
    <div
      className="grid h-full"
      style={{ gridTemplateColumns: "280px 1fr 320px" }}
    >
      {/* COLUNA ESQUERDA · camada + legenda + filtros */}
      <aside
        style={{
          background: "var(--mz-bg-sidebar)",
          borderRight: "1px solid var(--mz-rule)",
          overflowY: "auto",
          padding: "16px 18px",
        }}
      >
        <SectionHeader>Camada ativa</SectionHeader>
        <div
          style={{
            background: "var(--mz-bg-card)",
            border: "1px solid var(--mz-tenant-accent)",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            color: "var(--mz-fg-strong)",
            fontWeight: 600,
          }}
        >
          Saúde das Nominatas
          <div
            style={{
              fontSize: 10.5,
              color: "var(--mz-fg-faint)",
              marginTop: 3,
              fontWeight: 500,
            }}
          >
            Score por comissão municipal
          </div>
        </div>

        <SectionHeader style={{ marginTop: 18 }}>Legenda · score</SectionHeader>
        <LegendRow color="#22c55e" label="Saudável" range="≥ 75" />
        <LegendRow color="#f59e0b" label="Atenção"  range="55-74" />
        <LegendRow color="#f87171" label="Crítica"  range="< 55" />

        <SectionHeader style={{ marginTop: 18 }}>Outras camadas</SectionHeader>
        <LegendRow color="var(--mz-rule-strong)" label="Densidade filiados"  faded />
        <LegendRow color="var(--mz-rule-strong)" label="Histórico eleitoral" faded />
        <LegendRow color="var(--mz-rule-strong)" label="Emendas executadas"  faded />

        <SectionHeader style={{ marginTop: 18 }}>Filtros</SectionHeader>
        <div style={{ fontSize: 11.5, color: "var(--mz-fg-muted)", lineHeight: 1.6 }}>
          <FilterRow label="Saudáveis (≥75)" />
          <FilterRow label="Atenção (55-74)" />
          <FilterRow label="Críticas (<55)" />
        </div>
      </aside>

      {/* COLUNA CENTRAL · MapLibre real */}
      <div style={{ position: "relative", overflow: "hidden", background: "var(--mz-bg-page)" }}>
        <Map
          initialViewState={{
            bounds: SP_BOUNDS,
            fitBoundsOptions: { padding: 40 },
          }}
          mapStyle={MAP_STYLE}
          maxBounds={[
            [-54.5, -26.5],
            [-43.0, -18.5],
          ]}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="bottom-left" />

          {markers.map((m) => {
            const col = tierColor(m.tier);
            const r = m.destaque ? 18 : 8 + Math.log10(Math.max(50000, m.pop)) - 4;
            const ativo = selecionada?.id === m.id;
            return (
              <Marker
                key={m.id}
                longitude={m.lng}
                latitude={m.lat}
                anchor="center"
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelecionada(m);
                  }}
                  style={{
                    cursor: "pointer",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: r * 2,
                    height: r * 2,
                  }}
                  title={m.nm}
                >
                  {/* Anel pulsante nos destaques */}
                  {m.destaque && (
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        background: col,
                        opacity: 0.20,
                        animation: "nominataPulse 2.4s ease infinite",
                      }}
                    />
                  )}
                  <span
                    style={{
                      width: r * 2,
                      height: r * 2,
                      borderRadius: "50%",
                      background: col,
                      opacity: m.destaque ? 0.9 : 0.7,
                      border: ativo
                        ? "2.5px solid var(--mz-fg-strong)"
                        : "2px solid #fff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "Bebas Neue, sans-serif",
                      fontSize: m.destaque ? 14 : 0,
                      color: "#fff",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {m.destaque ? m.score : null}
                  </span>
                </div>
              </Marker>
            );
          })}
        </Map>

        {/* Anim CSS pra anel pulsante */}
        <style>{`
          @keyframes nominataPulse {
            0%   { transform: scale(0.8); opacity: 0.4; }
            70%  { transform: scale(1.6); opacity: 0; }
            100% { transform: scale(0.8); opacity: 0; }
          }
        `}</style>

        {/* Badge identificação canto superior esquerdo */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 5,
            background: "var(--mz-bg-card)",
            border: "1px solid var(--mz-rule)",
            borderRadius: 6,
            padding: "5px 10px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9.5,
            color: "var(--mz-fg-faint)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          }}
        >
          SP · 645 mun. · 18 amostradas
        </div>
      </div>

      {/* COLUNA DIREITA · resumo + comissão selecionada + atalhos */}
      <aside
        style={{
          background: "var(--mz-bg-sidebar)",
          borderLeft: "1px solid var(--mz-rule)",
          overflowY: "auto",
          padding: "16px 18px",
        }}
      >
        <SectionHeader>Resumo · {total} amostradas</SectionHeader>
        <SummaryRow label="Saudáveis"     value={ok}   color="#22c55e" />
        <SummaryRow label="Em atenção"    value={high} color="#f59e0b" />
        <SummaryRow label="Críticas"      value={crit} color="#f87171" />
        <SummaryRow label="Score médio SP" value={scoreMedio} />

        <SectionHeader style={{ marginTop: 18 }}>Comissão selecionada</SectionHeader>
        {selecionada ? (
          <ComissaoCard com={selecionada} />
        ) : (
          <div
            style={{
              fontSize: 11.5,
              color: "var(--mz-fg-muted)",
              padding: "10px 12px",
              background: "var(--mz-bg-card)",
              border: "1px solid var(--mz-rule)",
              borderRadius: 8,
            }}
          >
            Clique em um município no mapa para detalhar.
          </div>
        )}

        <SectionHeader style={{ marginTop: 18 }}>Atalhos</SectionHeader>
        <ShortcutBtn label="→ Ver ranking estadual" />
        <ShortcutBtn label="→ Exportar shapefile" />
        <ShortcutBtn label="→ Histórico do score" />
      </aside>
    </div>
  );
}

/* ============ SUBCOMPONENTES ============ */

function SectionHeader({ children, style }) {
  return (
    <h3
      style={{
        fontSize: 9.5,
        letterSpacing: "0.16em",
        color: "var(--mz-fg-faint)",
        textTransform: "uppercase",
        fontWeight: 700,
        margin: "0 0 10px",
        ...style,
      }}
    >
      {children}
    </h3>
  );
}

function LegendRow({ color, label, range, faded }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 11.5,
        color: "var(--mz-fg)",
        padding: "6px 0",
        opacity: faded ? 0.6 : 1,
      }}
    >
      <div style={{ width: 18, height: 18, borderRadius: 4, background: color }} />
      <b style={{ fontWeight: 600 }}>{label}</b>
      {range && (
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "JetBrains Mono, monospace",
            color: "var(--mz-fg-faint)",
          }}
        >
          {range}
        </span>
      )}
    </div>
  );
}

function FilterRow({ label }) {
  return (
    <label style={{ display: "flex", gap: 6, alignItems: "center", margin: "4px 0" }}>
      <input type="checkbox" defaultChecked /> {label}
    </label>
  );
}

function SummaryRow({ label, value, color }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "7px 0",
        fontSize: 11.5,
        borderBottom: "1px solid var(--mz-rule)",
      }}
    >
      <b style={{ fontWeight: 600, color: "var(--mz-fg-strong)" }}>{label}</b>
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          color: color || "var(--mz-fg)",
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ShortcutBtn({ label }) {
  return (
    <button
      style={{
        width: "100%",
        padding: 9,
        borderRadius: 8,
        border: "1px solid var(--mz-rule)",
        background: "var(--mz-bg-card)",
        color: "var(--mz-fg)",
        fontSize: 11.5,
        fontWeight: 600,
        cursor: "pointer",
        marginBottom: 6,
        textAlign: "left",
      }}
    >
      {label}
    </button>
  );
}

function ComissaoCard({ com }) {
  const isMain = !!com.scores;
  const score = isMain ? calcScore(com.scores) : com.score;
  const col = tierColor(com.tier);
  return (
    <div
      style={{
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderRadius: 10,
        padding: 14,
        marginTop: 10,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--mz-fg-strong)" }}>
        {com.nm} · SP
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: "var(--mz-fg-faint)",
          marginTop: 2,
          letterSpacing: "0.04em",
        }}
      >
        {fmt(com.pop)} habitantes
        {isMain && ` · ${com.area}`}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "12px 0",
          padding: "10px 0",
          borderTop: "1px solid var(--mz-hairline)",
          borderBottom: "1px solid var(--mz-hairline)",
        }}
      >
        <div
          style={{
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: 38,
            lineHeight: 1,
            color: col,
          }}
        >
          {score}
        </div>
        <div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.14em",
              color: "var(--mz-fg-faint)",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Score Saúde
          </div>
          <div style={{ fontSize: 11, color: "var(--mz-fg)", fontWeight: 600 }}>
            {tierLabel(com.tier)}
          </div>
        </div>
      </div>
      {isMain ? (
        <>
          <CardRow label="Filiados"     value={fmt(com.filiados)} />
          <CardRow label="Candidatos"   value={com.candidatos} />
          <CardRow label="Sinalizações" value={com.flags.length} valueColor={com.flags.length ? col : "#22c55e"} />
          <button
            style={{
              width: "100%",
              marginTop: 10,
              padding: 8,
              borderRadius: 6,
              border: "1px solid var(--mz-tenant-accent)",
              background: "var(--mz-tenant-accent-soft)",
              color: "var(--mz-tenant-accent)",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Abrir dossiê completo →
          </button>
        </>
      ) : (
        <>
          <CardRow label="Disponibilidade" value="amostra" valueColor="var(--mz-fg-faint)" />
          <div
            style={{
              fontSize: 10.5,
              color: "var(--mz-fg-faint)",
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            Comissões secundárias têm dados resumidos. Para dossiê completo, ative o coletor.
          </div>
        </>
      )}
    </div>
  );
}

function CardRow({ label, value, valueColor }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        padding: "6px 0",
        fontSize: 11.5,
        borderBottom: "1px solid var(--mz-hairline)",
      }}
    >
      <b style={{ color: "var(--mz-fg)", fontWeight: 600 }}>{label}</b>
      <span style={{ fontFamily: "JetBrains Mono, monospace", color: valueColor || "inherit" }}>
        {value}
      </span>
    </div>
  );
}
