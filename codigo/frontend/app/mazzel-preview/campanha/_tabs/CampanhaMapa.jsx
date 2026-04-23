"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Info, Target } from "lucide-react";
import Map, { Source, Layer, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCampanhas, useCercas, useAgregacao } from "@/hooks/useCampanha";

// ─── Constantes ─────────────────────────────────────────────────────────────

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const COR_CLASSIFICACAO = {
  ouro:    "#F5C518",
  prata:   "#CBD5E1",
  bronze:  "#CD7F32",
  critico: "#DC2626",
};
const COR_DEFAULT = "#64748B";

function corCerca(cerca) {
  return COR_CLASSIFICACAO[cerca.classificacao] ?? cerca.cor_hex ?? COR_DEFAULT;
}

// ─── Helpers GeoJSON ─────────────────────────────────────────────────────────

function bboxDeGeoJSON(geojson) {
  if (!geojson) return null;
  const coords = [];
  function coletarCoords(c) {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === "number") {
      coords.push(c);
    } else {
      c.forEach(coletarCoords);
    }
  }
  if (geojson.coordinates) coletarCoords(geojson.coordinates);
  if (!coords.length) return null;
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

// ─── Sub-componente: chip de classificação ───────────────────────────────────

function ChipClassificacao({ classificacao }) {
  const labels = { ouro: "Ouro", prata: "Prata", bronze: "Bronze", critico: "Crítico" };
  const label = labels[classificacao] ?? "—";
  const cor = COR_CLASSIFICACAO[classificacao] ?? COR_DEFAULT;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-bold"
      style={{
        background: cor + "22",
        color: cor,
        border: `1px solid ${cor}55`,
      }}
    >
      {label}
    </span>
  );
}

// ─── Agregação lazy por cerca selecionada ────────────────────────────────────

function useAgregacaoLazy(cercaId) {
  return useAgregacao(cercaId);
}

// ─── Card de cerca na sidebar ────────────────────────────────────────────────

function CercaCard({ cerca, selected, onClick }) {
  const { agregacao } = useAgregacaoLazy(selected ? cerca.id : null);
  const cor = corCerca(cerca);
  const raioKm = cerca.raio_metros ? `${(cerca.raio_metros / 1000).toFixed(0)} km` : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg transition-all"
      style={{
        background: selected
          ? "var(--mz-rule-strong, rgba(0,0,0,0.08))"
          : "var(--mz-bg-card-2, rgba(0,0,0,0.02))",
        border: `1px solid ${selected ? cor : "var(--mz-rule)"}`,
        outline: "none",
      }}
    >
      {/* Linha superior */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: cor,
              flexShrink: 0,
            }}
          />
          <div className="text-[11.5px] font-bold mz-t-fg-strong truncate">{cerca.nome}</div>
        </div>
        {raioKm && (
          <span className="text-[9.5px] mz-t-fg-dim flex-shrink-0">{raioKm}</span>
        )}
      </div>

      {/* Classificação */}
      {cerca.classificacao && (
        <div className="mb-2">
          <ChipClassificacao classificacao={cerca.classificacao} />
        </div>
      )}

      {/* Métricas (se agregação disponível) */}
      {selected && agregacao && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2">
          {agregacao.score_engajamento != null && (
            <>
              <span className="text-[9.5px] mz-t-fg-dim">Score</span>
              <span
                className="text-[18px] font-black mz-tnum col-span-2"
                style={{ color: cor, lineHeight: 1 }}
              >
                {Math.round(agregacao.score_engajamento)}
              </span>
            </>
          )}
          {agregacao.total_cadastros != null && (
            <>
              <span className="text-[9.5px] mz-t-fg-dim">Cadastros</span>
              <span className="text-[10.5px] font-semibold mz-t-fg-strong mz-tnum">
                {agregacao.total_cadastros.toLocaleString("pt-BR")}
              </span>
            </>
          )}
          {agregacao.cobertura_pct != null && (
            <>
              <span className="text-[9.5px] mz-t-fg-dim">Cobertura</span>
              <span className="text-[10.5px] font-semibold mz-t-fg-strong mz-tnum">
                {Math.round(agregacao.cobertura_pct)}%
              </span>
            </>
          )}
        </div>
      )}
    </button>
  );
}

// ─── Mock badge ──────────────────────────────────────────────────────────────

function MockBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{
        background: "rgba(99,102,241,0.1)",
        color: "#6366f1",
        border: "1px solid rgba(99,102,241,0.2)",
      }}
    >
      <Info size={8} />
      demo
    </span>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function CampanhaMapa() {
  const [selectedId, setSelectedId] = useState(null);
  const [tooltip, setTooltip] = useState(null); // { x, y, nome }
  const mapRef = useRef(null);

  const { campanhas } = useCampanhas();
  const campanhaAtiva = campanhas[0] ?? null;
  const { cercas, isLoading, isMock } = useCercas(campanhaAtiva?.id ?? null);

  // ── Adiciona sources/layers ao mapa quando cercas carregarem ──────────────
  const [mapaCarregado, setMapaCarregado] = useState(false);

  const volarParaCerca = useCallback(
    (cercaId) => {
      const map = mapRef.current?.getMap?.();
      if (!map) return;
      const cerca = cercas.find((c) => c.id === cercaId);
      if (!cerca?.poligono_geojson) return;
      const bbox = bboxDeGeoJSON(cerca.poligono_geojson);
      if (!bbox) return;
      map.fitBounds(bbox, { padding: 80, duration: 800 });
    },
    [cercas]
  );

  function handleSelectCerca(id) {
    const novo = id === selectedId ? null : id;
    setSelectedId(novo);
    if (novo) volarParaCerca(novo);
  }

  // ── Handlers de interação no mapa ─────────────────────────────────────────

  function onMouseEnter(e) {
    const feature = e.features?.[0];
    if (!feature) return;
    e.target.getCanvas().style.cursor = "pointer";
    setTooltip({
      x: e.point.x,
      y: e.point.y,
      nome: feature.properties?.nome ?? "Cerca",
    });
  }

  function onMouseLeave(e) {
    e.target.getCanvas().style.cursor = "";
    setTooltip(null);
  }

  function onClickPoly(e) {
    const feature = e.features?.[0];
    if (!feature) return;
    const id = feature.properties?.cercaId;
    if (id) handleSelectCerca(id);
  }

  // ── Camadas por cerca ─────────────────────────────────────────────────────

  const cercasComGeom = cercas.filter((c) => c.poligono_geojson);

  // ── Empty state ───────────────────────────────────────────────────────────

  const emptyState = !isLoading && cercas.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex h-full"
      style={{ height: "calc(100vh - 140px)", minHeight: 560 }}
    >
      {/* ── Sidebar esquerda ──────────────────────────────────────────────── */}
      <aside
        className="w-[280px] flex-shrink-0 border-r overflow-y-auto flex flex-col"
        style={{
          borderColor: "var(--mz-rule)",
          background: "var(--mz-bg-card)",
        }}
      >
        {/* Cabeçalho */}
        <div className="p-4 border-b flex-shrink-0" style={{ borderColor: "var(--mz-rule)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] mz-t-fg-dim uppercase tracking-wider font-semibold">
                Cercas ativas
              </span>
              {cercas.length > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "var(--mz-rule)",
                    color: "var(--mz-fg-muted)",
                  }}
                >
                  {cercas.length}
                </span>
              )}
              {isMock && <MockBadge />}
            </div>
            <button
              className="flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-md"
              style={{
                background: "var(--mz-rule)",
                color: "var(--mz-fg-muted)",
              }}
            >
              <Plus size={10} />
              Nova
            </button>
          </div>
        </div>

        {/* Lista de cercas */}
        <div className="flex-1 p-3 space-y-1.5">
          {isLoading && (
            <div className="text-[11px] mz-t-fg-dim text-center py-8">
              Carregando cercas...
            </div>
          )}
          {!isLoading &&
            cercas.map((cerca) => (
              <CercaCard
                key={cerca.id}
                cerca={cerca}
                selected={selectedId === cerca.id}
                onClick={() => handleSelectCerca(cerca.id)}
              />
            ))}
        </div>
      </aside>

      {/* ── Mapa central ─────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {emptyState ? (
          /* Empty state */
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="p-8 rounded-2xl text-center max-w-xs"
              style={{
                background: "var(--mz-bg-card)",
                border: "1px solid var(--mz-rule)",
                boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
              }}
            >
              <div className="text-4xl mb-3">🎯</div>
              <div
                className="text-[13.5px] font-bold mz-t-fg-strong mb-1"
              >
                Sem cercas cadastradas
              </div>
              <div className="text-[11.5px] mz-t-fg-dim mb-4">
                Crie a primeira cerca eleitoral para visualizar no mapa.
              </div>
              <button
                className="px-4 py-2 rounded-lg text-[11.5px] font-bold text-white"
                style={{ background: "var(--mz-tenant-primary, #002A7B)" }}
              >
                Criar cerca
              </button>
            </div>
          </div>
        ) : (
          <Map
            ref={mapRef}
            initialViewState={{
              longitude: -38.97,
              latitude: -12.4,
              zoom: 9,
            }}
            style={{ width: "100%", height: "100%" }}
            mapStyle={MAP_STYLE}
            onLoad={() => setMapaCarregado(true)}
            interactiveLayerIds={cercasComGeom.map((c) => `fill-${c.id}`)}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClickPoly}
          >
            <NavigationControl position="top-right" />

            {/* Sources + Layers por cerca */}
            {mapaCarregado &&
              cercasComGeom.map((cerca) => {
                const cor = corCerca(cerca);
                const isSel = selectedId === cerca.id;
                const geojson = {
                  type: "Feature",
                  properties: {
                    nome: cerca.nome,
                    cercaId: cerca.id,
                    classificacao: cerca.classificacao ?? null,
                  },
                  geometry: cerca.poligono_geojson,
                };
                return (
                  <Source
                    key={cerca.id}
                    id={`src-${cerca.id}`}
                    type="geojson"
                    data={geojson}
                  >
                    {/* Fill */}
                    <Layer
                      id={`fill-${cerca.id}`}
                      type="fill"
                      paint={{
                        "fill-color": cor,
                        "fill-opacity": isSel ? 0.5 : 0.35,
                      }}
                    />
                    {/* Stroke */}
                    <Layer
                      id={`line-${cerca.id}`}
                      type="line"
                      paint={{
                        "line-color": cor,
                        "line-width": isSel ? 3 : 2,
                        "line-opacity": 1,
                      }}
                    />
                  </Source>
                );
              })}
          </Map>
        )}

        {/* Tooltip hover */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 rounded-lg px-3 py-2 text-[11px] font-semibold mz-t-fg-strong"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 32,
              background: "var(--mz-bg-card)",
              border: "1px solid var(--mz-rule)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.14)",
              whiteSpace: "nowrap",
            }}
          >
            {tooltip.nome}
          </div>
        )}
      </div>
    </div>
  );
}
