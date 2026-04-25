"use client";

/* Motor MapLibre que vive dentro do container do Designer (Mapa.jsx).
 *
 * - Base: OpenStreetMap raster tiles (sem token).
 * - Brasil inteiro: fetch /mapa/farol e colore por status do município.
 * - Drilldown UF: fetch /mapa/geojson/{uf}?modo=eleitos pra polígonos reais.
 * - Camadas:
 *     partido -> cor do partido dominante
 *     score   -> gradient azul (farol VERDE/AMARELO/VERMELHO agregado)
 * - Click em polígono seleciona UF (ou município dentro da UF). */

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { API, ApiError } from "../api";
import { partyColor } from "../data";

const BRASIL_CENTER = [-51.9253, -14.235];
const BRASIL_ZOOM = 3.5;
const UF_ZOOM = 6;

// Restringe a visao ao territorio brasileiro - usuario nao pode arrastar para outros paises.
// Bounding box: [oeste, sul, leste, norte]
const BRASIL_BOUNDS = [[-74, -34], [-32, 6]];

const STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0e0e11" } },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: { "raster-opacity": 0.35, "raster-saturation": -0.8, "raster-contrast": 0.15 },
    },
  ],
};

function farolToColor(status) {
  switch (status) {
    case "AZUL":     return "#1e40af";
    case "VERDE":    return "#22c55e";
    case "AMARELO":  return "#fbbf24";
    case "VERMELHO": return "#ef4444";
    default:         return "#4b5563";
  }
}

export function MapaLibreCanvas({ layer = "partido", selectedUf, onSelectUf, onAuthError }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [selectedMun, setSelectedMun] = useState(null); // { codigoIbge, nome }

  // init map
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const m = new maplibregl.Map({
      container: ref.current,
      style: STYLE,
      center: BRASIL_CENTER,
      zoom: BRASIL_ZOOM,
      minZoom: 3,
      maxZoom: 12,
      maxBounds: BRASIL_BOUNDS,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    m.on("load", () => setReady(true));
    mapRef.current = m;
    return () => { m.remove(); mapRef.current = null; };
  }, []);

  // UF polygons
  useEffect(() => {
    if (!ready || !selectedUf) return;
    const m = mapRef.current;
    let cancelled = false;

    async function load() {
      try {
        const gj = await API.mapaGeojson(selectedUf);
        if (cancelled || !m) return;
        const SRC = "uf-polys";
        const FILL = "uf-fill";
        const LINE = "uf-line";

        if (m.getLayer(FILL)) m.removeLayer(FILL);
        if (m.getLayer(LINE)) m.removeLayer(LINE);
        if (m.getSource(SRC)) m.removeSource(SRC);

        m.addSource(SRC, { type: "geojson", data: gj });
        m.addLayer({
          id: FILL, type: "fill", source: SRC,
          paint: {
            "fill-color": [
              "case",
              ["has", "partido_numero"],
              colorExpressionPartido(),
              farolColorExpression(),
            ],
            "fill-opacity": 0.65,
          },
        });
        m.addLayer({
          id: LINE, type: "line", source: SRC,
          paint: { "line-color": "#ffffff", "line-width": 0.4, "line-opacity": 0.25 },
        });

        // Click em municipio -> carrega distritos (micro-bairros)
        const onMunClick = (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const cod = f.properties?.codigo_ibge || f.properties?.cd_mun || f.properties?.geocodigo;
          const nome = f.properties?.nome || f.properties?.NM_MUN || "Município";
          if (cod) setSelectedMun({ codigoIbge: String(cod), nome });
        };
        m.on("click", FILL, onMunClick);
        m.on("mouseenter", FILL, () => { m.getCanvas().style.cursor = "pointer"; });
        m.on("mouseleave", FILL, () => { m.getCanvas().style.cursor = ""; });

        // fit bounds
        if (gj.bbox && gj.bbox.length === 4) {
          m.fitBounds([[gj.bbox[0], gj.bbox[1]], [gj.bbox[2], gj.bbox[3]]], { padding: 40, duration: 900 });
        } else {
          m.flyTo({ center: BRASIL_CENTER, zoom: UF_ZOOM });
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          onAuthError?.();
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [ready, selectedUf, layer, onAuthError]);

  // reset to Brasil when no UF
  useEffect(() => {
    if (!ready || selectedUf) return;
    const m = mapRef.current;
    ["uf-fill", "uf-line", "dist-fill", "dist-line", "dist-label"].forEach((id) => m.getLayer(id) && m.removeLayer(id));
    ["uf-polys", "distritos"].forEach((s) => m.getSource(s) && m.removeSource(s));
    m.flyTo({ center: BRASIL_CENTER, zoom: BRASIL_ZOOM, duration: 900 });
    setSelectedMun(null);
  }, [ready, selectedUf]);

  // clear distritos when UF changes (mun pertencia a UF anterior)
  useEffect(() => {
    setSelectedMun(null);
  }, [selectedUf]);

  // distritos / micro-bairros
  useEffect(() => {
    const m = mapRef.current;
    if (!ready || !m) return;

    ["dist-fill", "dist-line", "dist-label"].forEach((id) => m.getLayer(id) && m.removeLayer(id));
    if (m.getSource("distritos")) m.removeSource("distritos");

    if (!selectedMun?.codigoIbge) return;

    let cancelled = false;
    (async () => {
      try {
        const fc = await API.mapaDistritosGeojson({ codigo_ibge: selectedMun.codigoIbge });
        if (cancelled || !fc || !m || (fc.features?.length ?? 0) === 0) return;

        m.addSource("distritos", { type: "geojson", data: fc });
        m.addLayer({
          id: "dist-fill", type: "fill", source: "distritos",
          paint: {
            "fill-color": ["match", ["get", "partido_dominante"],
              44, "#002A7B", 13, "#E4142C", 22, "#004F9F", 15, "#4AA71E",
              45, "#0C2CC3", 55, "#FDB913", 11, "#14416F", 40, "#E00000",
              10, "#005FAF", 50, "#68008E", 12, "#033D7F",
              "#a855f7",
            ],
            "fill-opacity": 0.55,
          },
        });
        m.addLayer({
          id: "dist-line", type: "line", source: "distritos",
          paint: { "line-color": "#ffffff", "line-width": 0.6, "line-opacity": 0.5 },
        });
        m.addLayer({
          id: "dist-label", type: "symbol", source: "distritos",
          layout: {
            "text-field": ["get", "nome"],
            "text-size": 10,
            "text-font": ["Open Sans Regular"],
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "rgba(0,0,0,0.6)",
            "text-halo-width": 1.2,
          },
        });

        // fit bounds pros distritos
        const bounds = new maplibregl.LngLatBounds();
        fc.features.forEach((f) => expandBounds(bounds, f.geometry));
        if (!bounds.isEmpty()) {
          m.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 12 });
        }
      } catch (err) {
        // 401/403 ou 404 - silencioso; permanece o layer do município
      }
    })();

    return () => { cancelled = true; };
  }, [ready, selectedMun]);

  return (
    <>
      <div
        ref={ref}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 0,
        }}
      />
      {selectedMun && (
        <div
          className="absolute z-10 rounded-md px-3 py-2 text-[11px] flex items-center gap-2"
          style={{
            top: 72, left: 16,
            background: "var(--bg-elevated)",
            border: "1px solid var(--rule-strong)",
          }}
        >
          <span className="t-fg-dim uppercase tracking-wider text-[9px]">Municipio</span>
          <span className="t-fg-strong font-semibold">{selectedMun.nome}</span>
          <span className="t-fg-ghost">·</span>
          <span className="t-fg-dim">micro-bairros ativos</span>
          <button
            onClick={() => setSelectedMun(null)}
            className="btn-ghost ml-2"
            style={{ padding: "2px 6px", fontSize: 10 }}
            type="button"
          >
            fechar
          </button>
        </div>
      )}
    </>
  );
}

function expandBounds(bounds, geom) {
  if (!geom) return;
  if (geom.type === "Polygon") {
    geom.coordinates.forEach((ring) => ring.forEach((pt) => bounds.extend(pt)));
  } else if (geom.type === "MultiPolygon") {
    geom.coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach((pt) => bounds.extend(pt))));
  }
}

function colorExpressionPartido() {
  // Mapeia partido_numero (int) para cor. Tabela baseada em PARTY_COLORS/partyColor
  // (PARTY_COLORS usa sigla, então montamos case numérico).
  // Fontes: 44=UB, 13=PT, 22=PL, 15=MDB, 45=PSDB, 55=PSD, 11=PP, 40=PSB, 14=PTB, 20=PSC, ...
  return [
    "match", ["get", "partido_numero"],
    44, "#002A7B",
    13, "#E4142C",
    22, "#004F9F",
    15, "#4AA71E",
    45, "#0C2CC3",
    55, "#FDB913",
    11, "#14416F",
    40, "#E00000",
    10, "#005FAF",   // REPUBLICANOS
    50, "#68008E",   // PSOL
    12, "#033D7F",   // PDT
    25, "#002A7B",   // DEM (hist)
    17, "#004F9F",   // PSL (hist)
    /* default */ "#6B7280",
  ];
}

function farolColorExpression() {
  return [
    "match", ["get", "farol"],
    "AZUL", "#1e40af",
    "VERDE", "#22c55e",
    "AMARELO", "#fbbf24",
    "VERMELHO", "#ef4444",
    /* default */ "#4b5563",
  ];
}

export { farolToColor };
