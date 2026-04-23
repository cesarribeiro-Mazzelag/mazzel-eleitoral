"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMap, LoadScript } from "@react-google-maps/api";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const LIBRARIES = ["places", "geometry"];

const CENTER_SP = { lat: -23.5505, lng: -46.6333 };

// Paleta politica (partidos principais — alinhar com CORES_PARTIDOS do MapaEleitoral)
const CORES_PARTIDOS = {
  13: "#C8102E", 22: "#1E40AF", 44: "#1E3A8A", 55: "#0EA5E9",
  15: "#1D4ED8", 10: "#10B981", 11: "#EAB308", 45: "#F59E0B",
  40: "#DC2626", 20: "#065F46", 23: "#0EA5E9", 77: "#EC4899",
};
const COR_PADRAO = "#9CA3AF";

export default function MapaGooglePage() {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [distritosFeatures, setDistritosFeatures] = useState([]);
  const [distritoSelecionado, setDistritoSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(false);

  // Carrega GeoJSON de distritos do nosso backend
  async function carregarDistritos(map) {
    setCarregando(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("ub_token") : null;
      const res = await fetch(`${API_BASE}/mapa/distritos-geojson?codigo_ibge=3550308`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        // Endpoint ainda nao existe — usar fallback estatico
        console.warn("Endpoint distritos-geojson nao encontrado, usando fallback");
        return;
      }
      const geojson = await res.json();
      const features = map.data.addGeoJson(geojson);
      setDistritosFeatures(features);

      // Estilo: cor por partido dominante (quando vier), borda sempre visivel
      map.data.setStyle((feature) => {
        const partidoNum = feature.getProperty("partido_dominante");
        const cor = CORES_PARTIDOS[partidoNum] ?? COR_PADRAO;
        return {
          fillColor: cor,
          fillOpacity: 0.35,
          strokeColor: "#1F2937",
          strokeWeight: 1.2,
          strokeOpacity: 0.85,
        };
      });

      // Hover
      map.data.addListener("mouseover", (e) => {
        map.data.overrideStyle(e.feature, { strokeWeight: 3, fillOpacity: 0.55 });
      });
      map.data.addListener("mouseout", () => {
        map.data.revertStyle();
      });

      // Click
      map.data.addListener("click", (e) => {
        const props = {};
        e.feature.forEachProperty((v, k) => (props[k] = v));
        setDistritoSelecionado(props);
      });
    } catch (e) {
      console.error("Erro carregando distritos:", e);
    } finally {
      setCarregando(false);
    }
  }

  const onLoad = (map) => {
    mapRef.current = map;
    setMapLoaded(true);
    carregarDistritos(map);
  };

  if (!API_KEY) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold mb-2">Google Maps API Key nao configurada</h1>
        <p>Adicione <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> em .env.local</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      <LoadScript googleMapsApiKey={API_KEY} libraries={LIBRARIES}>
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={CENTER_SP}
          zoom={11}
          onLoad={onLoad}
          options={{
            mapTypeId: "roadmap",
            disableDefaultUI: false,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            gestureHandling: "greedy",
          }}
        />
      </LoadScript>

      {/* HUD topo esquerda */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200 max-w-xs">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          Mapa Google (POC)
        </p>
        <h1 className="text-sm font-bold mt-1">Sao Paulo capital</h1>
        <p className="text-xs text-gray-600 mt-1">
          {mapLoaded ? (
            carregando ? "Carregando distritos..." :
            distritosFeatures.length > 0 ? `${distritosFeatures.length} distritos carregados` :
            "Aguardando endpoint distritos-geojson"
          ) : "Carregando Google Maps..."}
        </p>
      </div>

      {/* Card do distrito selecionado */}
      {distritoSelecionado && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200 max-w-sm">
          <button
            onClick={() => setDistritoSelecionado(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >✕</button>
          <h2 className="font-bold text-sm">{distritoSelecionado.nome ?? "Distrito"}</h2>
          <pre className="mt-2 text-[10px] text-gray-600 overflow-auto max-h-48">
            {JSON.stringify(distritoSelecionado, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
