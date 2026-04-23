"use client";

/**
 * Layer de heatmap (densidade de votos) para o módulo mapa eleitoral.
 *
 * Renderizado DENTRO de um <Map> do react-map-gl/maplibre. Lê os dados do
 * endpoint /mapa/heatmap via SWR (cache automático) e renderiza um layer
 * nativo do MapLibre — sem dependências extras.
 *
 * Aparece somente quando filters.modo === 'heatmap'. Em outros modos
 * retorna null e é completamente neutro.
 */
import { Source, Layer } from "react-map-gl/maplibre";
import { useHeatmap } from "@/hooks/useMapaData";
import { useModo } from "@/hooks/useMapaState";

export function HeatmapLayer() {
  const modo = useModo();
  const { data, error } = useHeatmap();

  if (modo !== "heatmap") return null;
  if (error || !data) return null;
  if (!data.features || data.features.length === 0) return null;

  return (
    <Source id="mapa-heatmap-src" type="geojson" data={data as any}>
      <Layer
        id="mapa-heatmap-layer"
        type="heatmap"
        maxzoom={12}
        paint={{
          // Peso de cada ponto no heatmap (já normalizado pelo backend)
          "heatmap-weight": [
            "interpolate", ["linear"], ["get", "weight_norm"],
            0, 0,
            1, 1,
          ],
          // Intensidade aumenta com o zoom
          "heatmap-intensity": [
            "interpolate", ["linear"], ["zoom"],
            0, 1,
            12, 3,
          ],
          // Gradiente clássico azul → verde → amarelo → vermelho
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0,    "rgba(0, 0, 0, 0)",
            0.1,  "rgba(33, 102, 172, 0.4)",
            0.3,  "rgba(103, 169, 207, 0.6)",
            0.5,  "rgba(209, 229, 240, 0.7)",
            0.7,  "rgba(253, 219, 199, 0.8)",
            0.85, "rgba(239, 138, 98, 0.85)",
            1,    "rgba(178, 24, 43, 0.9)",
          ],
          // Raio cresce com zoom — pontos próximos se fundem em zoom alto
          "heatmap-radius": [
            "interpolate", ["linear"], ["zoom"],
            0, 4,
            6, 18,
            12, 40,
          ],
          // Esmaece quando zoom >= 11 (deixa o usuário ver os polígonos)
          "heatmap-opacity": [
            "interpolate", ["linear"], ["zoom"],
            7, 1,
            11, 0.6,
            12, 0,
          ],
        }}
      />
    </Source>
  );
}
