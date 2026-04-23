"use client";

// Mazzel Inteligencia Eleitoral - Card do Partido (v3 FINAL)
// - Cores oficiais por partido (primaria + secundaria + terciaria)
// - Plataforma branca adaptativa (quadrada para logos compactos, pill para logos largos)
// - OVR emblem glass + chip BR (bandeira) no lugar do texto NACIONAL
// - Sigla + Numero de legenda (urna) com auto-contraste
// - 6 atributos FUT (ATQ/MEI/DEF/COE/FIN/MOM)
// - Footer com Presenca (UFs), Votos 2024 e delta colorido de variacao
// - Assinatura cromatica de 3px no rodape (c1 -> c2 -> c3)

import React from "react";
import { useRouter } from "next/navigation";

// Paleta oficial por partido (p = primaria, s = secundaria, t = terciaria)
export const PARTY_COLORS = {
  PT:            { p: "#C8102E", s: "#8B0A1A", t: "#FFFFFF" },
  PCDOB:         { p: "#E60012", s: "#FFD400", t: "#FFFFFF" },
  "PC DO B":     { p: "#E60012", s: "#FFD400", t: "#FFFFFF" },
  PSOL:          { p: "#5B2A86", s: "#F5C518", t: "#FFFFFF" },
  PDT:           { p: "#E30613", s: "#0032A0", t: "#FFFFFF" },
  PSB:           { p: "#F7A81B", s: "#EA2027", t: "#FFFFFF" },
  REDE:          { p: "#00A758", s: "#F5C500", t: "#FFFFFF" },
  PV:            { p: "#009739", s: "#FFD400", t: "#FFFFFF" },
  CIDADANIA:     { p: "#E6007E", s: "#00AEEF", t: "#FFFFFF" },

  MDB:           { p: "#0A9E5A", s: "#F5C500", t: "#E30613" },
  PSDB:          { p: "#005BAC", s: "#F5C500", t: "#FFFFFF" },
  PSD:           { p: "#F39200", s: "#005BAC", t: "#FFFFFF" },
  PODE:          { p: "#00A859", s: "#F5C500", t: "#005BAC" },
  PODEMOS:       { p: "#00A859", s: "#F5C500", t: "#005BAC" },
  SOLIDARIEDADE: { p: "#6B3E26", s: "#E67E22", t: "#FFFFFF" },
  AVANTE:        { p: "#F07A1E", s: "#2EC4B6", t: "#FFFFFF" },

  PL:              { p: "#002776", s: "#F5C500", t: "#009739" },
  "UNIÃO":         { p: "#003A8C", s: "#F8C808", t: "#FFFFFF" },
  "UNIÃO BRASIL":  { p: "#003A8C", s: "#F8C808", t: "#FFFFFF" },
  PP:              { p: "#0055A4", s: "#009CDE", t: "#FFFFFF" },
  PROGRESSISTAS:   { p: "#0055A4", s: "#009CDE", t: "#FFFFFF" },
  REPUBLICANOS:    { p: "#00874C", s: "#0055A4", t: "#F5C500" },
  NOVO:            { p: "#F26522", s: "#1A1A1A", t: "#FFFFFF" },
  DEM:             { p: "#003DA5", s: "#00A859", t: "#FFFFFF" },
  DEMOCRATAS:      { p: "#003DA5", s: "#00A859", t: "#FFFFFF" },
  PFL:             { p: "#003DA5", s: "#00A859", t: "#FFFFFF" },
  PTB:             { p: "#F5C500", s: "#009739", t: "#E30613" },
  PSC:             { p: "#00874C", s: "#005BAC", t: "#FFFFFF" },
  PSL:             { p: "#005BAC", s: "#E30613", t: "#FFFFFF" },
  PATRIOTA:        { p: "#006341", s: "#E30613", t: "#F5C500" },
  PRTB:            { p: "#0A9E5A", s: "#F5C500", t: "#FFFFFF" },
  PMB:             { p: "#7B3F99", s: "#F5C500", t: "#FFFFFF" },
  PROS:            { p: "#F39200", s: "#005BAC", t: "#FFFFFF" },
  PMN:             { p: "#E30613", s: "#005BAC", t: "#FFFFFF" },
  PRB:             { p: "#00874C", s: "#0055A4", t: "#F5C500" },
  AGIR:            { p: "#003A8C", s: "#F5C500", t: "#FFFFFF" },
  PRD:             { p: "#005BAC", s: "#E30613", t: "#FFFFFF" },
  MOBILIZA:        { p: "#00A859", s: "#F39200", t: "#FFFFFF" },
  DC:                    { p: "#00874C", s: "#003DA5", t: "#009CDE" },
  "DEMOCRACIA CRISTÃ":   { p: "#00874C", s: "#003DA5", t: "#009CDE" },
  PSDC:            { p: "#00874C", s: "#003DA5", t: "#009CDE" },
  PHS:             { p: "#F07A1E", s: "#7B1E2B", t: "#FFFFFF" },
  PPL:             { p: "#E30613", s: "#F5C500", t: "#009739" },
  PTC:             { p: "#0055A4", s: "#F5C500", t: "#FFFFFF" },
  PCB:             { p: "#E30613", s: "#1A1A1A", t: "#F5C500" },
  PCO:             { p: "#E30613", s: "#1A1A1A", t: "#FFFFFF" },
  PSTU:            { p: "#E30613", s: "#F5C500", t: "#1A1A1A" },
  UP:              { p: "#E30613", s: "#1A1A1A", t: "#F5C500" },
  PRONA:           { p: "#009739", s: "#FFD400", t: "#002776" },
  PPR:             { p: "#003DA5", s: "#E30613", t: "#FFFFFF" },
  PST:             { p: "#005BAC", s: "#F5C500", t: "#FFFFFF" },
  "PT DO B":       { p: "#E30613", s: "#F5C500", t: "#1A1A1A" },
  PTDOB:           { p: "#E30613", s: "#F5C500", t: "#1A1A1A" },
  PEN:             { p: "#00874C", s: "#F39200", t: "#FFFFFF" },
  PRP:             { p: "#E30613", s: "#F5C500", t: "#FFFFFF" },
};

const DEFAULT_COLORS = { p: "#334155", s: "#64748b", t: "#FFFFFF" };

// Logos horizontais/largos -> plataforma pill. Compactos/quadrados -> quadrada.
const WIDE_LOGOS = new Set([
  "PSDB", "PSB", "UNIÃO", "UNIÃO BRASIL", "PROGRESSISTAS", "REPUBLICANOS",
  "CIDADANIA", "SOLIDARIEDADE", "AVANTE", "PODE", "PODEMOS", "PATRIOTA",
  "MOBILIZA", "AGIR", "PRD", "DC", "PHS", "PTC", "PPL", "PMB", "PRTB",
  "DEM", "NOVO", "PSC", "PDT", "PCDOB", "PC DO B", "PV", "PROS", "PRB",
  "PSL",
]);

const getColors = (sigla) => {
  const key = (sigla || "").toUpperCase().trim();
  return PARTY_COLORS[key] || PARTY_COLORS[key.replace(/\s+/g, " ")] || DEFAULT_COLORS;
};

const relLum = (hex) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.substr(0, 2), 16) / 255;
  const g = parseInt(h.substr(2, 2), 16) / 255;
  const b = parseInt(h.substr(4, 2), 16) / 255;
  const toLin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
};

const pickTextOn = (bg) => (relLum(bg) > 0.55 ? "#111111" : "#FFFFFF");

const tierColor = (tier, ovr) => {
  if (tier === "ouro") return "#F5C518";
  if (tier === "prata") return "#E5E7EB";
  if (tier === "bronze") return "#CD7F32";
  if (tier === "madeira") return "#9CA3AF";
  if (ovr == null) return "#9CA3AF";
  if (ovr >= 85) return "#F5C518";
  if (ovr >= 75) return "#E5E7EB";
  if (ovr >= 60) return "#CD7F32";
  return "#9CA3AF";
};

const fmtNum = (n) => {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "K";
  return n.toLocaleString("pt-BR");
};

// Bandeira do Brasil inline
const BrFlag = () => (
  <svg viewBox="0 0 20 14" width="15" height="10" style={{ borderRadius: 2, display: "block" }}>
    <rect width="20" height="14" fill="#009739" />
    <polygon points="10,2 18,7 10,12 2,7" fill="#FEDD00" />
    <circle cx="10" cy="7" r="2.6" fill="#002776" />
  </svg>
);

export function CardPartido({ partido, escopoUF = null, alerta, onAbrirDetalhe, onDownload }) {
  const router = useRouter();
  if (!partido) return null;

  const { sigla, numero, nome, logo_url, fifa = {} } = partido;
  const key = (sigla || "").toUpperCase();
  const colors = getColors(sigla);
  const c1 = colors.p;
  const c2 = colors.s;
  const c3 = colors.t || colors.s;

  const ovr = fifa?.overall ?? null;
  const bar = tierColor(fifa?.tier, ovr);
  const escopoEfetivo = escopoUF ? "estadual" : (fifa?.escopo ?? "nacional");
  const isNacional = escopoEfetivo === "nacional";
  const ufChip = isNacional ? "BR" : (escopoUF || fifa?.escopo_uf || "UF");

  const siglaLen = (sigla || "").length;
  const siglaSize =
    siglaLen > 9 ? "text-[12px]" : siglaLen > 6 ? "text-[14px]" : "text-[18px]";
  const isWide = WIDE_LOGOS.has(key);

  const v = partido.variacao_inter_ciclo;
  const isPos = v != null && v > 0;
  const isNeg = v != null && v < 0;
  const deltaPct = v == null ? "" : `${Math.min(999, Math.abs(Math.round(v * 100)))}%`;

  const stats = [
    { k: "ATQ", v: fifa?.atq },
    { k: "MEI", v: fifa?.meio },
    { k: "DEF", v: fifa?.defe },
    { k: "COE", v: fifa?.coesao },
    { k: "FIN", v: fifa?.fin },
    { k: "MOM", v: fifa?.momentum },
  ];

  const presencaTxt =
    partido.presenca_territorial != null ? `${partido.presenca_territorial}/27 UFs` : "—";

  const textOnC2 = pickTextOn(c2);
  const isDarkTextOnC2 = textOnC2 === "#111111";

  const gradBg = `linear-gradient(135deg, ${c1} 0%, ${c1} 35%, ${c2} 100%)`;
  const orbBg = `radial-gradient(circle, ${c2} 0%, transparent 65%)`;
  const stripeBg = `linear-gradient(90deg, ${c1}, ${c2}, ${c3})`;
  const signatureBg = `linear-gradient(90deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)`;
  const ovrBg = "linear-gradient(160deg, rgba(255,255,255,.28), rgba(255,255,255,.06))";

  const legendaStyle = {
    background: c2,
    color: textOnC2,
    textShadow: isDarkTextOnC2 ? "none" : "0 1px 2px rgba(0,0,0,.45)",
    border: `1px solid ${isDarkTextOnC2 ? "rgba(0,0,0,.25)" : "rgba(255,255,255,.35)"}`,
  };

  const plateClass = isWide
    ? "w-full max-w-[152px] h-[82px] rounded-[16px] p-[10px_14px]"
    : "w-[104px] h-[104px] rounded-[20px] p-[14px]";

  const handleClick = () => {
    if (onAbrirDetalhe) {
      onAbrirDetalhe(partido);
      return;
    }
    const base = `/radar/partidos/${sigla}`;
    router.push(escopoUF ? `${base}/${escopoUF}` : base);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative w-full min-w-0 h-[348px] overflow-hidden rounded-[18px] cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-0.5 transition-all isolate"
    >
      {/* Fundo: gradiente oficial do partido */}
      <div className="absolute inset-0 z-0" style={{ background: gradBg }}>
        <div
          className="absolute -top-[30%] -right-[20%] w-[85%] h-[85%] rounded-full opacity-55 blur-[6px] mix-blend-screen"
          style={{ background: orbBg }}
        />
      </div>

      {/* Faixa decorativa (cor terciaria) */}
      <div
        className="absolute left-[-10%] right-[-10%] top-[120px] h-[90px] z-[1] opacity-25 -skew-y-6"
        style={{ background: c3 }}
      />

      {/* Overlay escuro na zona do rodape (legibilidade do texto) */}
      <div className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-b from-black/0 via-black/0 via-55% to-black/[.88]" />

      {/* Shine diagonal */}
      <div className="absolute inset-0 z-[3] pointer-events-none bg-gradient-to-br from-white/[.22] to-transparent to-40%" />

      {/* Emblema OVR */}
      <div
        className="absolute top-[10px] left-[10px] z-[6] flex flex-col items-start px-[10px] pt-[6px] pb-[7px] rounded-[11px] border border-white/35 backdrop-blur-md shadow-[0_6px_18px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,255,255,.28)]"
        style={{ background: ovrBg }}
      >
        <span className="font-black text-[24px] leading-none text-white tabular-nums tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,.5)]">
          {ovr ?? "—"}
        </span>
        <span className="mt-[2px] text-[7.5px] font-extrabold tracking-[0.3em] uppercase text-white/90">
          Overall
        </span>
        <span
          className="mt-[3px] h-[2.5px] w-[28px] rounded-sm"
          style={{ background: bar, boxShadow: `0 0 8px ${bar}80` }}
        />
      </div>

      {/* Chip BR (bandeira) / UF */}
      <div
        className="absolute top-[14px] right-[12px] z-[6] flex items-center gap-[5px] pl-[5px] pr-2 py-[4px] rounded-full bg-[rgba(10,12,22,.62)] border border-white/25 backdrop-blur-md"
        title={isNacional ? "Escopo Nacional" : `Escopo ${ufChip}`}
      >
        {isNacional ? <BrFlag /> : <span className="w-[15px] h-[10px] rounded-[2px] bg-white/25" />}
        <span className="text-[8.5px] font-extrabold tracking-[0.22em] uppercase text-white">
          {ufChip}
        </span>
      </div>

      {/* Plataforma branca do logo */}
      <div className="absolute left-0 right-0 top-[72px] h-[118px] z-[4] flex items-center justify-center px-3.5">
        <div
          className={
            "relative flex items-center justify-center bg-white overflow-hidden " +
            "shadow-[0_12px_28px_-10px_rgba(0,0,0,.45),0_2px_6px_rgba(0,0,0,.12),inset_0_-2px_0_rgba(0,0,0,.04)] " +
            plateClass
          }
        >
          <div className="absolute top-0 left-0 right-0 h-[4px]" style={{ background: stripeBg }} />
          <img
            src={logo_url}
            alt={sigla}
            className="max-w-full max-h-full object-contain"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
      </div>

      {/* Corpo */}
      <div className="absolute left-0 right-0 bottom-0 z-[5] px-3 pt-2.5 pb-3 text-white">
        {/* Sigla + Numero de legenda (urna) */}
        <div className="flex items-center justify-between gap-1.5 mb-2 min-w-0">
          <span
            className={
              "font-black leading-none tracking-wide uppercase truncate flex-1 min-w-0 drop-shadow-[0_2px_10px_rgba(0,0,0,.6)] " +
              siglaSize
            }
            title={nome || sigla}
          >
            {sigla}
          </span>
          {numero != null && (
            <span
              className="shrink-0 inline-flex items-baseline gap-1 px-2 py-[3px] rounded-lg text-[13px] font-black tabular-nums leading-none shadow-[0_4px_12px_rgba(0,0,0,.25),inset_0_1px_0_rgba(255,255,255,.25)]"
              style={legendaStyle}
            >
              <span className="opacity-70 text-[9px] font-bold">Nº</span>
              {numero}
            </span>
          )}
        </div>

        {/* Atributos FUT */}
        <div className="grid grid-cols-6 gap-[3px] mb-2">
          {stats.map((s) => (
            <div
              key={s.k}
              className="flex flex-col items-center py-[3px] rounded-md bg-white/[.12] border border-white/[.14] backdrop-blur-[4px]"
            >
              <span className="text-[7.5px] font-extrabold tracking-wider uppercase text-white/80">
                {s.k}
              </span>
              <span className="text-[11.5px] font-black text-white tabular-nums leading-tight">
                {s.v ?? "—"}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between gap-1.5 pt-2 border-t border-white/20">
          <div className="flex flex-col min-w-0">
            <span className="text-[7.5px] tracking-wider uppercase text-white/75 font-bold mb-[2px]">
              Presença
            </span>
            <span className="text-[12.5px] font-black text-white tabular-nums leading-none">
              {presencaTxt}
            </span>
          </div>
          <div className="flex flex-col items-end min-w-0">
            <span className="text-[7.5px] tracking-wider uppercase text-white/75 font-bold mb-[2px]">
              Votos {partido.ano_referencia ?? 2024}
            </span>
            <span className="text-[12.5px] font-black text-white tabular-nums leading-none">
              {fmtNum(partido.votos_total)}
            </span>
            {v != null && (
              <span
                className={
                  "mt-[3px] inline-flex items-center gap-[3px] px-1.5 py-[1px] rounded-md text-[10px] font-extrabold " +
                  (isPos
                    ? "bg-emerald-500/35 text-emerald-100 shadow-[inset_0_0_0_1px_rgba(134,239,172,.4)]"
                    : isNeg
                    ? "bg-red-500/35 text-red-100 shadow-[inset_0_0_0_1px_rgba(252,165,165,.4)]"
                    : "")
                }
              >
                {isPos ? "▲" : isNeg ? "▼" : ""} {deltaPct}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Assinatura cromatica no rodape */}
      <div
        className="absolute left-0 right-0 bottom-0 h-[3px] z-[6]"
        style={{ background: signatureBg }}
      />
    </div>
  );
}

export default CardPartido;
