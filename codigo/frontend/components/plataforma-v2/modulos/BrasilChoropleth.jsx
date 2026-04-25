"use client";

/* Choropleth Brasil simplificado (paths retangulares ilustrativos).
 * Fonte: designer/platform-home.jsx.
 * Será substituído por MapLibre GL + IBGE na Fase 4 (cartograma real + micro-bairros). */

import { PARTY_STRENGTH, partyColor } from "../data";

export const BRASIL_STATES = [
  { uf: "AC", cx: 96,  cy: 240, path: "M60,220 L130,215 L135,260 L80,265 Z" },
  { uf: "AM", cx: 230, cy: 200, path: "M140,150 L330,150 L335,250 L140,255 Z" },
  { uf: "RR", cx: 280, cy: 110, path: "M230,80 L320,85 L325,145 L235,145 Z" },
  { uf: "AP", cx: 390, cy: 115, path: "M355,85 L425,90 L430,145 L360,145 Z" },
  { uf: "PA", cx: 400, cy: 210, path: "M340,150 L465,150 L465,265 L345,260 Z" },
  { uf: "RO", cx: 165, cy: 290, path: "M140,265 L230,265 L230,320 L140,320 Z" },
  { uf: "MT", cx: 305, cy: 305, path: "M235,265 L390,265 L395,355 L240,355 Z" },
  { uf: "MS", cx: 330, cy: 390, path: "M275,360 L395,360 L400,445 L280,445 Z" },
  { uf: "TO", cx: 430, cy: 290, path: "M400,265 L470,265 L475,340 L405,340 Z" },
  { uf: "MA", cx: 490, cy: 205, path: "M470,150 L545,155 L550,255 L475,260 Z" },
  { uf: "PI", cx: 515, cy: 250, path: "M490,200 L555,200 L560,295 L495,295 Z" },
  { uf: "CE", cx: 560, cy: 195, path: "M540,155 L615,160 L620,225 L545,225 Z" },
  { uf: "RN", cx: 620, cy: 205, path: "M600,170 L660,175 L665,220 L605,220 Z" },
  { uf: "PB", cx: 635, cy: 235, path: "M595,220 L670,225 L670,255 L600,255 Z" },
  { uf: "PE", cx: 605, cy: 260, path: "M555,250 L670,255 L670,285 L560,285 Z" },
  { uf: "AL", cx: 635, cy: 290, path: "M600,285 L665,288 L665,310 L605,310 Z" },
  { uf: "SE", cx: 615, cy: 315, path: "M585,308 L645,310 L645,335 L590,335 Z" },
  { uf: "BA", cx: 525, cy: 310, path: "M460,265 L590,270 L595,365 L465,365 Z" },
  { uf: "GO", cx: 410, cy: 360, path: "M385,340 L460,340 L465,410 L390,410 Z" },
  { uf: "DF", cx: 450, cy: 350, path: "M440,340 L470,340 L470,360 L440,360 Z" },
  { uf: "MG", cx: 475, cy: 400, path: "M395,365 L575,370 L580,445 L400,445 Z" },
  { uf: "ES", cx: 555, cy: 420, path: "M535,395 L590,395 L590,445 L540,445 Z" },
  { uf: "RJ", cx: 510, cy: 455, path: "M470,440 L560,440 L560,475 L475,475 Z" },
  { uf: "SP", cx: 425, cy: 450, path: "M330,430 L470,430 L475,480 L335,480 Z" },
  { uf: "PR", cx: 380, cy: 490, path: "M310,475 L445,475 L445,510 L315,510 Z" },
  { uf: "SC", cx: 375, cy: 525, path: "M315,510 L430,510 L430,545 L320,545 Z" },
  { uf: "RS", cx: 340, cy: 570, path: "M265,545 L410,545 L415,610 L270,610 Z" },
];

export function BrasilChoropleth({ mode, onHover, onClick, highlightUf, data }) {
  const colorFor = (uf) => {
    if (mode === "partido") {
      const p = PARTY_STRENGTH[uf];
      return partyColor(p);
    }
    const score = data?.[uf] ?? 50;
    if (score >= 85) return "#34d399";
    if (score >= 70) return "#60a5fa";
    if (score >= 55) return "#fbbf24";
    if (score >= 40) return "#fb923c";
    return "#f87171";
  };
  return (
    <svg viewBox="50 70 620 560" className="w-full h-full" style={{ maxHeight: 420 }}>
      {BRASIL_STATES.map((s) => {
        const isHi = highlightUf === s.uf;
        return (
          <g
            key={s.uf}
            onMouseEnter={() => onHover?.(s.uf)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onClick?.(s.uf)}
            style={{ cursor: "pointer" }}
          >
            <path
              d={s.path}
              fill={colorFor(s.uf)}
              fillOpacity={isHi ? 0.95 : 0.72}
              stroke={isHi ? "#fff" : "rgba(0,0,0,0.25)"}
              strokeWidth={isHi ? 2 : 0.6}
              className="region-polygon"
            />
            <text
              x={s.cx}
              y={s.cy + 3}
              textAnchor="middle"
              className="state-label"
              style={{ fontSize: 11, fill: "#0a0a0b" }}
              pointerEvents="none"
            >
              {s.uf}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ufName(uf) {
  const map = {
    AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia",
    CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
    MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul", MT: "Mato Grosso",
    PA: "Pará", PB: "Paraíba", PE: "Pernambuco", PI: "Piauí", PR: "Paraná",
    RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RO: "Rondônia", RR: "Roraima",
    RS: "Rio Grande do Sul", SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo",
    TO: "Tocantins",
  };
  return map[uf] || uf;
}
