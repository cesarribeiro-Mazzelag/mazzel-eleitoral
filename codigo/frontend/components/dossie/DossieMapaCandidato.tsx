"use client";

/**
 * Mapa eleitoral leve do candidato — usado dentro do <BlocoMapaEleitoral>.
 *
 * Lê o GeoJSON de /mapa/candidato/{id}/geojson e renderiza um mapa MapLibre
 * NÃO INTERATIVO (sem pan/zoom/click). Cor base = partido do candidato.
 * Intensidade = nivel_farol 0-5.
 *
 * REGRAS DE ISOLAMENTO (não mexer):
 * - NÃO importa useMapaStore (estado local privado)
 * - interactive={false} — desabilita todos os handlers nativos do MapLibre
 * - container com pointer-events explícito
 * - estado próprio (useState) — não compartilha com mapa principal
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Source, Layer, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Info } from "lucide-react";
import { API_BASE } from "@/lib/apiBase";

const API = API_BASE;

function tkn() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ub_token") ?? "";
}

// Estilo inline ULTRA-MINIMAL: só fundo branco. Sem dependência externa
// (qualquer style.json remoto é risco de CORS/timeout). O choropleth do
// candidato é renderizado por cima. Foco: visibilidade dos polígonos.
const MAP_STYLE: any = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#f8fafc" },
    },
  ],
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
};

interface CandidatoMeta {
  candidato_id: number;
  candidato_nome: string;
  partido_numero: number | null;
  partido_sigla: string | null;
  partido_cor: string;
  cargo: string;
  ano: number;
  nivel: string;
  uf: string | null;
  municipio_ibge: string | null;
  municipio_nome: string | null;
  total_features: number;
  total_votos: number;
  fallback_aplicado: boolean;
  top_regiao: string | null;
  regiao_mais_fraca: string | null;
}

interface CandidatoGeoJSON {
  type: "FeatureCollection";
  features: any[];
  _meta: CandidatoMeta;
}

interface Props {
  candidatoId: number;
  candidaturaId?: number | null;
  /** Classe Tailwind de altura do container do mapa. Default h-72 (288px).
   *  Ex: "h-[500px]" pra mapa grande no dashboard do politico. */
  alturaMapa?: string;
}

// ── Helpers de cor ──────────────────────────────────────────────────────────

/**
 * Escurece/clareia uma cor hex misturando com branco.
 * fator 0 = cor original, fator 1 = branco puro.
 */
function lighten(hex: string, fator: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * fator);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

// ── Componente ──────────────────────────────────────────────────────────────

export function DossieMapaCandidato({ candidatoId, candidaturaId, alturaMapa = "h-72" }: Props) {
  const [data, setData] = useState<CandidatoGeoJSON | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const mapRef = useRef<MapRef | null>(null);

  // Fetch isolado — não compartilha cache com nenhum outro componente
  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setErro(null);
    setData(null);
    const params = candidaturaId ? `?candidatura_id=${candidaturaId}` : "";
    const url = `${API}/mapa/candidato/${candidatoId}/geojson${params}`;
    console.log("[DossieMapa] fetch", url);
    fetch(url, {
      headers: { Authorization: `Bearer ${tkn()}` },
    })
      .then(async (r) => {
        console.log("[DossieMapa] response status", r.status);
        if (!r.ok) {
          if (r.status === 404) throw new Error("Sem dados de mapa para esse candidato.");
          throw new Error(`Erro ${r.status}`);
        }
        return r.json();
      })
      .then((j: CandidatoGeoJSON) => {
        if (cancelado) return;
        console.log("[DossieMapa] features:", j.features?.length, "primeira:", j.features?.[0]?.properties);
        setData(j);
      })
      .catch((e) => { if (!cancelado) setErro(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [candidatoId, candidaturaId]);

  // Expressão de cor: GRADIENTE da cor do partido baseado em nivel_farol 0-5.
  // Réplica fiel da lógica do MapaEleitoral.tsx COR_FILL_CANDIDATO quando 1
  // candidato é selecionado (linha ~1417). O backend agora normaliza por
  // PERCENTIL (ver enriquecer_features_percentil em mapa_score.py), então o
  // gradiente fica bem distribuído mesmo para candidatos com 1 capital
  // concentrando muito voto (caso típico de governador/presidente).
  const fillExpression = useMemo(() => {
    const cor = data?._meta?.partido_cor ?? "#94A3B8";
    return [
      "match",
      ["coalesce", ["get", "nivel_farol"], 0],
      0, "#E5E7EB",                  // ausente — cinza claro
      1, lighten(cor, 0.78),         // fraco
      2, lighten(cor, 0.55),         // médio-fraco
      3, lighten(cor, 0.32),         // médio
      4, lighten(cor, 0.12),         // forte
      5, cor,                        // domina — cor pura
      "#E5E7EB",
    ] as any;
  }, [data]);

  // Bounds calculados SOMENTE a partir das features onde o candidato TEVE votos
  // (nivel_farol > 0). Sem esse filtro, o backend que retorna todos estados do
  // Brasil (com cinza nos que nao votaram) puxava o zoom pra Brasil inteiro
  // mesmo para senador/governador/deputado — bug reportado Cesar 20/04.
  // Agora: presidente zoom Brasil (votos em todos); senador zoom UF; prefeito zoom municipio.
  const bounds = useMemo(() => {
    if (!data?.features?.length) return null;
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    const featuresComVoto = data.features.filter((f: any) => (f.properties?.nivel_farol ?? 0) > 0);
    const source = featuresComVoto.length > 0 ? featuresComVoto : data.features;
    for (const f of source) {
      const geom = f.geometry;
      if (!geom) continue;
      const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
      for (const poly of polys) {
        for (const ring of poly) {
          for (const [lng, lat] of ring as number[][]) {
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
        }
      }
    }
    if (!isFinite(minLng)) return null;
    return [[minLng, minLat], [maxLng, maxLat]] as [[number, number], [number, number]];
  }, [data]);

  // Aplica bounds via onLoad do <Map> (mais confiável que useEffect — garante
  // que a instância MapLibre já está totalmente inicializada). Também aplica
  // se os bounds mudarem depois que o mapa já carregou.
  function aplicarFitBounds() {
    if (!mapRef.current || !bounds) {
      console.log("[DossieMapa] fitBounds skip: mapRef=", !!mapRef.current, "bounds=", !!bounds);
      return;
    }
    try {
      console.log("[DossieMapa] fitBounds:", bounds);
      mapRef.current.getMap().fitBounds(bounds, { padding: 20, duration: 0 });
    } catch (e) {
      console.warn("[DossieMapa] fitBounds erro:", e);
    }
  }

  useEffect(() => {
    // Quando bounds mudarem após o mapa já estar montado, refit
    if (mapRef.current) aplicarFitBounds();
  }, [bounds]);

  // Estados de UI
  if (loading) {
    return (
      <div className={`${alturaMapa} rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center`}>
        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-brand-600 rounded-full" />
      </div>
    );
  }

  if (erro || !data) {
    return (
      <div className={`${alturaMapa} rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center px-4`}>
        <div className="flex items-start gap-2 text-gray-500">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-xs">{erro ?? "Dados de mapa não disponíveis."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/*
        Container do mapa — pointer-events:none para garantir que cliques
        não sejam capturados (interactive=false já faz isso, mas redundância
        defensiva contra interferência com modais e outros componentes).
      */}
      <div
        className={`${alturaMapa} rounded-xl overflow-hidden border border-gray-200 relative`}
        style={{ pointerEvents: "none" }}
      >
        <Map
          ref={mapRef}
          mapStyle={MAP_STYLE}
          initialViewState={{ longitude: -52, latitude: -15, zoom: 3 }}
          interactive={false}
          attributionControl={false}
          dragRotate={false}
          touchZoomRotate={false}
          doubleClickZoom={false}
          scrollZoom={false}
          dragPan={false}
          keyboard={false}
          // preserveDrawingBuffer necessário para html2canvas conseguir
          // capturar o canvas WebGL durante a geração do PDF do dossiê.
          preserveDrawingBuffer={true}
          onLoad={() => {
            console.log("[DossieMapa] onLoad — mapa pronto, aplicando fitBounds");
            aplicarFitBounds();
          }}
        >
          <Source id="cand-geo" type="geojson" data={data as any}>
            <Layer
              id="cand-fill"
              type="fill"
              paint={{
                "fill-color": fillExpression,
                "fill-opacity": 0.85,
              }}
            />
            <Layer
              id="cand-outline"
              type="line"
              paint={{
                "line-color": "#475569",
                "line-width": 0.5,
              }}
            />
          </Source>
        </Map>
      </div>

      {/* Legenda — gradiente da cor do partido (igual mapa principal) */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: "#E5E7EB" }} />
          <span>Ausente</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: lighten(data._meta.partido_cor, 0.78) }} />
          <span>Fraco</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: lighten(data._meta.partido_cor, 0.32) }} />
          <span>Médio</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: lighten(data._meta.partido_cor, 0.12) }} />
          <span>Forte</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: data._meta.partido_cor }} />
          <span>Domina</span>
        </div>
      </div>

      {/* Caption discreta */}
      <p className="text-[10px] text-gray-400 text-center">
        {data._meta.nivel === "bairros" && `Bairros de ${data._meta.municipio_nome}`}
        {data._meta.nivel.startsWith("municipios") && `Municípios de ${data._meta.uf}`}
        {data._meta.nivel === "estados" && "Estados do Brasil"}
        {" · "}
        {data._meta.cargo} {data._meta.ano}
        {data._meta.fallback_aplicado && " · (sem distritos cadastrados — exibindo nível acima)"}
      </p>
    </div>
  );
}
