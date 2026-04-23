"use client";

/**
 * Seção 11 - Estilo do mapa (4 variações)
 *
 * K4 (cartograma) é a recuperação visual do "template-d" antigo,
 * referência aprovada pelo César. Cada estado é um quadrado uniforme
 * arranjado geograficamente.
 */
import type { Section } from "../types";

// Posição aproximada de cada estado num grid 7×9 (cartograma).
// Inspirado no template-d antigo + cartograma da Globo/G1.
const TILE_GRID: Array<{ uf: string; row: number; col: number; cor: string; sigla: string }> = [
  { uf: "RR", row: 0, col: 2, cor: "#0033A0", sigla: "RR" },
  { uf: "AP", row: 0, col: 4, cor: "#073776", sigla: "AP" },
  { uf: "AM", row: 1, col: 2, cor: "#0033A0", sigla: "AM" },
  { uf: "PA", row: 1, col: 3, cor: "#C8102E", sigla: "PA" },
  { uf: "MA", row: 1, col: 4, cor: "#FFCC00", sigla: "MA" },
  { uf: "CE", row: 1, col: 5, cor: "#F58220", sigla: "CE" },
  { uf: "RN", row: 1, col: 6, cor: "#00853F", sigla: "RN" },
  { uf: "AC", row: 2, col: 1, cor: "#FFCC00", sigla: "AC" },
  { uf: "RO", row: 2, col: 2, cor: "#F58220", sigla: "RO" },
  { uf: "TO", row: 2, col: 3, cor: "#FFCC00", sigla: "TO" },
  { uf: "PI", row: 2, col: 4, cor: "#00853F", sigla: "PI" },
  { uf: "PB", row: 2, col: 5, cor: "#0033A0", sigla: "PB" },
  { uf: "PE", row: 2, col: 6, cor: "#073776", sigla: "PE" },
  { uf: "AL", row: 2, col: 7, cor: "#C8102E", sigla: "AL" },
  { uf: "MT", row: 3, col: 2, cor: "#0033A0", sigla: "MT" },
  { uf: "GO", row: 3, col: 3, cor: "#0033A0", sigla: "GO" },
  { uf: "DF", row: 3, col: 4, cor: "#F58220", sigla: "DF" },
  { uf: "BA", row: 3, col: 5, cor: "#00853F", sigla: "BA" },
  { uf: "SE", row: 3, col: 6, cor: "#F58220", sigla: "SE" },
  { uf: "MS", row: 4, col: 2, cor: "#073776", sigla: "MS" },
  { uf: "MG", row: 4, col: 4, cor: "#F58220", sigla: "MG" },
  { uf: "ES", row: 4, col: 5, cor: "#0033A0", sigla: "ES" },
  { uf: "SP", row: 5, col: 3, cor: "#F58220", sigla: "SP" },
  { uf: "RJ", row: 5, col: 4, cor: "#0033A0", sigla: "RJ" },
  { uf: "PR", row: 5, col: 2, cor: "#073776", sigla: "PR" },
  { uf: "SC", row: 6, col: 2, cor: "#0033A0", sigla: "SC" },
  { uf: "RS", row: 7, col: 2, cor: "#073776", sigla: "RS" },
];

// ── K1 - Choropleth poligonal sem bordas ────────────────────────────────────
function K1() {
  return (
    <div className="aspect-[5/4] w-full max-w-2xl rounded-2xl bg-neutral-50 p-12">
      <svg viewBox="0 0 400 320" className="h-full w-full">
        {/* Brasil schematic - simplified */}
        <path d="M150 60 Q250 50 320 80 L350 150 L330 240 L240 280 L150 270 L100 200 L80 130 Z" fill="#0033A0" opacity="0.85" />
        <text x="200" y="180" textAnchor="middle" className="fill-white text-sm font-semibold">BRASIL</text>
      </svg>
    </div>
  );
}
const K1Source = `// Polígonos reais via MapLibre + GeoJSON
// Sem bordas, fundo cinza neutro, cores saturadas
<Map mapStyle={MAP_STYLE}>
  <Source id="brasil" type="geojson" data={geojson}>
    <Layer paint={{ "fill-color": ["get", "cor"], "fill-opacity": 0.92 }} />
  </Source>
</Map>`;

// ── K2 - Choropleth com bordas brancas grossas ──────────────────────────────
function K2() {
  return (
    <div className="aspect-[5/4] w-full max-w-2xl rounded-2xl bg-white p-12">
      <svg viewBox="0 0 400 320" className="h-full w-full">
        <path d="M150 60 Q250 50 320 80 L350 150 L330 240 L240 280 L150 270 L100 200 L80 130 Z"
          fill="#0033A0" opacity="0.92" stroke="#FFFFFF" strokeWidth="3" />
        <text x="200" y="180" textAnchor="middle" className="fill-white text-sm font-semibold">BRASIL</text>
      </svg>
    </div>
  );
}
const K2Source = `// Bordas brancas finas, fundo branco, alta saturação
<Layer paint={{
  "fill-color": ["get", "cor"],
  "fill-opacity": 0.92,
}} />
<Layer type="line" paint={{
  "line-color": "#FFFFFF",
  "line-width": 1.2,
}} />`;

// ── K3 - Dark Tesla com cores vibrantes ─────────────────────────────────────
function K3() {
  return (
    <div className="aspect-[5/4] w-full max-w-2xl rounded-2xl bg-neutral-950 p-12">
      <svg viewBox="0 0 400 320" className="h-full w-full">
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        <path d="M150 60 Q250 50 320 80 L350 150 L330 240 L240 280 L150 270 L100 200 L80 130 Z"
          fill="#3B82F6" opacity="0.9" stroke="#1E3A8A" strokeWidth="2" filter="url(#glow)" />
        <text x="200" y="180" textAnchor="middle" className="fill-white text-sm font-semibold">BRASIL</text>
      </svg>
    </div>
  );
}
const K3Source = `// Fundo escuro Tesla, cores vibrantes, glow
<div className="bg-neutral-950">
  <Layer paint={{
    "fill-color": ["get", "cor"],
    "fill-opacity": 0.9,
  }} />
</div>`;

// ── K4 - Cartograma quadrado (template-d, recuperado do print) ──────────────
function K4() {
  const tileSize = 50;
  const gap = 6;
  return (
    <div className="rounded-2xl bg-neutral-900 p-8">
      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">FAROL DE FORÇA · 2024</div>
        <div className="mt-1 text-sm font-medium text-neutral-300">Cada quadrado é um estado, cor = partido dominante</div>
      </div>
      <div
        className="relative"
        style={{
          width: 8 * (tileSize + gap),
          height: 9 * (tileSize + gap),
        }}
      >
        {TILE_GRID.map((t) => (
          <div
            key={t.uf}
            className="absolute flex items-center justify-center rounded-xl text-xs font-bold text-white shadow-md transition hover:scale-110"
            style={{
              left: t.col * (tileSize + gap),
              top: t.row * (tileSize + gap),
              width: tileSize,
              height: tileSize,
              backgroundColor: t.cor,
            }}
          >
            {t.sigla}
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3 text-[11px]">
        <div className="flex items-center gap-2 text-neutral-300"><div className="h-3 w-3 rounded bg-[#0033A0]" />Domina</div>
        <div className="flex items-center gap-2 text-neutral-300"><div className="h-3 w-3 rounded bg-[#073776]" />Forte</div>
        <div className="flex items-center gap-2 text-neutral-300"><div className="h-3 w-3 rounded bg-[#F58220]" />Presente</div>
        <div className="flex items-center gap-2 text-neutral-300"><div className="h-3 w-3 rounded bg-[#FFCC00]" />Médio</div>
        <div className="flex items-center gap-2 text-neutral-300"><div className="h-3 w-3 rounded bg-[#C8102E]" />Fraco</div>
      </div>
    </div>
  );
}
const K4Source = `// Cartograma quadrado (recuperação do template-d)
// Cada estado é um quadrado fixo num grid 8x9
const TILE_GRID = [
  { uf: "RR", row: 0, col: 2, cor: "#0033A0" },
  { uf: "AM", row: 1, col: 2, cor: "#0033A0" },
  ...
];

<div className="relative">
  {TILE_GRID.map(t => (
    <div className="absolute rounded-xl text-white shadow-md hover:scale-110"
      style={{
        left: t.col * (size+gap),
        top: t.row * (size+gap),
        width: size, height: size,
        backgroundColor: t.cor,
      }}>
      {t.uf}
    </div>
  ))}
</div>`;

export const Section11Mapa: Section = {
  id: "mapa",
  letter: "K",
  title: "Estilo do mapa",
  subtitle: "4 jeitos de renderizar o mapa do Brasil. K4 é a recuperação do template-d (cartograma).",
  variants: [
    { code: "K1", name: "Choropleth sem bordas", description: "Polígonos reais MapLibre, fundo cinza, sem bordas.", Component: K1, source: K1Source },
    { code: "K2", name: "Choropleth bordas brancas", description: "Polígonos reais com bordas brancas finas, alto contraste.", Component: K2, source: K2Source },
    { code: "K3", name: "Dark Tesla glow", description: "Fundo escuro com glow nas cores - estilo broadcast TV.", Component: K3, source: K3Source },
    { code: "K4", name: "Cartograma quadrado (template-d)", description: "Cada estado é um quadrado uniforme, recuperação do template-d antigo.", Component: K4, source: K4Source },
  ],
};
