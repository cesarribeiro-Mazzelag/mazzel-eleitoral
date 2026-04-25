"use client";

/* Dossie 03 - Mapa Eleitoral (choropleth ilustrativo).
 * Adaptado de designer/section-eleitoral.jsx. */

import { SectionShell } from "../../Primitives";

/* Cores dos partidos - espelho de radar/CardPolitico.jsx (PARTY_COLORS).
 * Mantemos uma copia inline para evitar dependencia circular entre modulos. */
const PARTY_COLORS = {
  PT:             { a: "#C8102E", b: "#8B0A1A", accent: "#FFDD00" },
  PSDB:           { a: "#005BAC", b: "#F5C500", accent: "#005BAC" },
  MDB:            { a: "#0A9E5A", b: "#F5C500", accent: "#0A9E5A" },
  PSD:            { a: "#F39200", b: "#005BAC", accent: "#F39200" },
  PL:             { a: "#002776", b: "#F5C500", accent: "#F5C500" },
  REPUBLICANOS:   { a: "#00874C", b: "#0055A4", accent: "#F5C518" },
  PSC:            { a: "#00874C", b: "#005BAC", accent: "#F5C518" },
  PSL:            { a: "#005BAC", b: "#00984C", accent: "#F5C518" },
  PTN:            { a: "#334155", b: "#64748B", accent: "#94A3B8" },
  PDT:            { a: "#E30613", b: "#005BAC", accent: "#F5C518" },
  NOVO:           { a: "#F39200", b: "#1A1A1A", accent: "#F39200" },
  DEM:            { a: "#005BAC", b: "#00984C", accent: "#F5C518" },
  PATRIOTA:       { a: "#00984C", b: "#F5C518", accent: "#005BAC" },
  PP:             { a: "#005BAC", b: "#00984C", accent: "#F5C518" },
  PSOL:           { a: "#E30613", b: "#F5C518", accent: "#F5C518" },
  PSB:            { a: "#FFDD00", b: "#005BAC", accent: "#005BAC" },
  "UNIÃO":        { a: "#005BAC", b: "#F5C518", accent: "#E30613" },
  UNIAO:          { a: "#005BAC", b: "#F5C518", accent: "#E30613" },
  AVANTE:         { a: "#005BAC", b: "#00984C", accent: "#F5C518" },
  SOLIDARIEDADE:  { a: "#E30613", b: "#F5C518", accent: "#005BAC" },
  CIDADANIA:      { a: "#E30613", b: "#FFFFFF", accent: "#005BAC" },
  PTB:            { a: "#005BAC", b: "#F5C518", accent: "#E30613" },
  PV:             { a: "#006633", b: "#FFFFFF", accent: "#FFCC00" },
  AGIR:           { a: "#0066B3", b: "#F5C518", accent: "#0066B3" },
  PCDOB:          { a: "#DA251C", b: "#FFFFFF", accent: "#FFDD00" },
  "PC DO B":      { a: "#DA251C", b: "#FFFFFF", accent: "#FFDD00" },
  PRTB:           { a: "#005BAC", b: "#F5C518", accent: "#E30613" },
  PROS:           { a: "#F68E21", b: "#005BAC", accent: "#F68E21" },
  PODEMOS:        { a: "#5A8ECB", b: "#005BAC", accent: "#FFFFFF" },
  PODE:           { a: "#5A8ECB", b: "#005BAC", accent: "#FFFFFF" },
  REDE:           { a: "#2EB5C2", b: "#005BAC", accent: "#FFFFFF" },
  PMB:            { a: "#005BAC", b: "#F5C518", accent: "#FFFFFF" },
  PHS:            { a: "#FF6600", b: "#005BAC", accent: "#FFFFFF" },
  PSTU:           { a: "#E30613", b: "#1A1A1A", accent: "#FFFFFF" },
  PCB:            { a: "#E30613", b: "#1A1A1A", accent: "#FFDD00" },
  PPL:            { a: "#005BAC", b: "#FFFFFF", accent: "#E30613" },
  PCO:            { a: "#E30613", b: "#1A1A1A", accent: "#FFFFFF" },
  SD:             { a: "#E30613", b: "#F5C518", accent: "#005BAC" },
  PRD:            { a: "#005BAC", b: "#FFFFFF", accent: "#FFDD00" },
};

const DEFAULT_PARTY_COLORS = { a: "#334155", b: "#64748B", accent: "#94A3B8" };

function partyColors(sigla) {
  if (!sigla) return DEFAULT_PARTY_COLORS;
  return PARTY_COLORS[sigla.toUpperCase()] || DEFAULT_PARTY_COLORS;
}

const UF_POLYS = {
  BA: "M 280 180 L 340 170 L 360 200 L 380 240 L 360 290 L 310 300 L 280 280 L 260 240 Z",
  PE: "M 290 150 L 340 140 L 360 160 L 340 170 L 280 180 L 270 160 Z",
  SE: "M 340 170 L 360 170 L 370 185 L 360 200 Z",
  AL: "M 360 170 L 380 165 L 395 180 L 375 195 L 360 200 Z",
  CE: "M 280 100 L 340 90 L 360 110 L 340 140 L 290 150 L 280 135 Z",
  PI: "M 230 110 L 280 100 L 280 135 L 270 160 L 250 170 L 220 140 Z",
  MA: "M 180 90 L 230 95 L 240 130 L 220 140 L 180 135 L 165 115 Z",
  SP: "M 200 320 L 260 310 L 280 340 L 260 370 L 210 370 L 190 350 Z",
  MG: "M 230 240 L 290 230 L 310 260 L 290 300 L 240 300 L 215 270 Z",
  RJ: "M 280 310 L 310 305 L 325 320 L 310 335 L 285 335 Z",
  PR: "M 190 360 L 240 355 L 260 380 L 240 400 L 200 400 L 180 380 Z",
};

const CENTROIDS = {
  BA: [315, 235], PE: [315, 160], SP: [230, 345], MG: [270, 270],
  CE: [315, 120], PI: [250, 135], MA: [205, 115], RJ: [300, 322],
  PR: [220, 380], SE: [355, 188], AL: [378, 183],
};

/* Retorna a cor do partido com opacidade proporcional a intensidade.
 * v=0  -> cinza (sem presenca)
 * v>0  -> cor.a com opacidade escalonada de 0.18 (fraco) ate 1.0 (domina) */
function intensityColor(v, partyA) {
  if (v <= 0) return "var(--rule-strong)";
  const base = partyA || "#1e40af";
  return base;
}

function intensityLabel(v) {
  if (v >= 80) return "Domina";
  if (v >= 60) return "Forte";
  if (v >= 40) return "Médio";
  if (v >= 20) return "Fraco";
  return "Ausente";
}

export function DossieMapaEleitoral({ profile }) {
  const e = profile.eleitoral;
  const pColors = partyColors(e.partidoSigla);
  const partyA = pColors.a;   // cor principal do partido (ex: PT -> #C8102E)
  const partyB = pColors.b;   // cor secundaria (para gradiente do fundo do mapa)

  return (
    <SectionShell
      id="sec-mapa"
      label="03 Mapa Eleitoral"
      title="Mapa Eleitoral"
      sub={e.escopo.toLowerCase()}
      kicker={<span>Ano-referencia: <span className="t-fg-strong tnum">{e.ano}</span></span>}
      pad={false}
    >
      <div className="relative" style={{ height: 480 }}>
        <svg viewBox="0 0 600 480" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="dossie-map-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--bg-card)" />
              <stop offset="100%" stopColor="var(--bg-card-2)" />
            </linearGradient>
            {/* Gradiente radial da cor do partido - usado no halo dos redutos fortes */}
            <radialGradient id="dossie-party-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={partyA} stopOpacity="0.18" />
              <stop offset="100%" stopColor={partyA} stopOpacity="0" />
            </radialGradient>
            <pattern id="dossie-map-grid" width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="var(--fg-ghost)" opacity="0.35" />
            </pattern>
          </defs>
          <rect width="600" height="480" fill="url(#dossie-map-bg)" />
          <rect width="600" height="480" fill="url(#dossie-map-grid)" />
          {/* Halo sutil da cor do partido no centro do mapa */}
          <rect width="600" height="480" fill="url(#dossie-party-glow)" />
          <text
            x="480" y="240"
            fontSize="10"
            letterSpacing="0.25em"
            fill="var(--fg-ghost)"
            fontFamily="JetBrains Mono"
          >
            ATLANTICO
          </text>
          {Object.entries(UF_POLYS).map(([uf, d]) => {
            const v = e.mapIntensity[uf] ?? 0;
            const c = intensityColor(v, partyA);
            const pos = CENTROIDS[uf];
            // Opacidade proporcional a intensidade: fraco=0.22, medio=0.55, forte=0.80, domina=1.0
            const opacity =
              v <= 0   ? 0.12 :
              v < 20   ? 0.22 :
              v < 40   ? 0.45 :
              v < 60   ? 0.65 :
              v < 80   ? 0.82 :
                         1.00;
            return (
              <g key={uf} className="map-region">
                <path d={d} fill={c} fillOpacity={opacity} stroke="var(--bg-card)" strokeWidth="1.5" />
                {v >= 40 && pos && (
                  <text
                    x={pos[0]}
                    y={pos[1]}
                    fontSize="11"
                    fontWeight="800"
                    fill={v >= 60 ? "#fff" : "var(--fg-strong)"}
                    textAnchor="middle"
                    fontFamily="Inter"
                  >
                    {uf}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="absolute top-5 left-5">
          <div
            className="chip"
            style={{
              height: "auto",
              padding: "8px 12px",
              fontSize: 11,
              background: partyA,
              color: "#fff",
              border: "none",
            }}
          >
            <span className="font-bold">Eleito em {e.ano}</span>
            <span style={{ opacity: 0.7 }}>·</span>
            <span className="tnum">{e.votos} votos</span>
            <span style={{ opacity: 0.7 }}>·</span>
            <span>{e.percentValidos} validos</span>
          </div>
        </div>

        {/* Badge partido (sigla) */}
        {e.partidoSigla && (
          <div
            className="absolute top-5 right-32 rounded-lg px-3 py-2 flex items-center gap-2"
            style={{
              background: partyA,
              border: `1px solid ${partyB}`,
            }}
          >
            <div className="text-[13px] font-black text-white tracking-wide">{e.partidoSigla}</div>
          </div>
        )}

        <div
          className="absolute top-5 right-5 rounded-lg px-3 py-2"
          style={{ background: "var(--bg-card)", border: "1px solid var(--rule-strong)" }}
        >
          <div className="text-[9px] font-mono t-fg-dim tracking-[0.2em]">ESCOPO</div>
          <div className="text-[13px] font-bold t-fg-strong mt-0.5">{e.escopo}</div>
        </div>

        <div
          className="absolute right-5 bottom-16 w-[240px] rounded-xl p-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--rule-strong)",
            boxShadow: "0 20px 40px -20px rgba(0,0,0,0.5)",
          }}
        >
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase t-fg-dim mb-3">Top 3 municipios</div>
          <div className="space-y-2.5">
            {e.topMunis.map((m, i) => (
              <div key={m.nome} className="flex items-center gap-3">
                <div className="text-[10px] font-mono t-fg-ghost w-4">{String(i + 1).padStart(2, "0")}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold t-fg-strong truncate">{m.nome}</div>
                  <div className="text-[10px] font-mono t-fg-dim">{m.votos} votos</div>
                </div>
                <div className="text-[13px] font-black tnum" style={{ color: partyA }}>{m.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--rule)" }}
      >
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase t-fg-dim">Intensidade</div>
        <div className="flex items-center gap-0">
          {[0, 20, 40, 60, 80].map((v, i) => (
            <div
              key={v}
              className="flex items-center gap-2 px-3"
              style={i > 0 ? { borderLeft: "1px solid var(--rule)" } : {}}
            >
              <div
                className="w-5 h-3 rounded-sm"
                style={{
                  background: v === 0 ? "var(--rule-strong)" : partyA,
                  opacity:
                    v === 0  ? 0.25 :
                    v === 20 ? 0.45 :
                    v === 40 ? 0.65 :
                    v === 60 ? 0.82 :
                               1.00,
                }}
              />
              <div className="text-[11px] t-fg-muted">{intensityLabel(v + 1)}</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] font-mono t-fg-dim">Fonte: TSE</div>
      </div>
    </SectionShell>
  );
}
