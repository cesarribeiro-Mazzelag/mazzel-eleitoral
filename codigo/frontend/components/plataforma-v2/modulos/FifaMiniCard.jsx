"use client";

/* Card FIFA mini - usado no Radar e Dossies.
 * Adaptado de designer/platform-radar.jsx. */

import { partyColor, TRAIT_LABEL } from "../data";

export function FifaMiniCard({ c, onClick }) {
  const tierClass = c.tier === "dourado" || c.tier === "ouro" ? "" : c.tier === "prata" ? "tier-silver" : "tier-bronze";
  const gold = "#fcd34d";
  const numColor = c.tier === "prata" ? "#e5e7eb" : c.tier === "bronze" ? "#fdba74" : gold;

  return (
    <div className={`fifa-mini ${tierClass}`} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="text-center">
          <div
            className="font-display font-black leading-none tnum"
            style={{ fontSize: 34, color: numColor, textShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
          >
            {c.overall}
          </div>
          <div className="text-[10px] font-bold tracking-widest mt-0.5" style={{ color: numColor, opacity: 0.85 }}>
            {c.cargo}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: partyColor(c.partido), color: "#fff" }}
          >
            {c.partido}
          </div>
          <div className="text-[10px] font-bold tnum" style={{ color: numColor }}>{c.uf}</div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-full h-[78px] rounded-md flex items-center justify-center"
          style={{ background: `radial-gradient(circle at 50% 40%, ${numColor}22, transparent 70%)` }}
        >
          <svg width="62" height="62" viewBox="0 0 24 24" fill="none" stroke={numColor} strokeWidth="1.2">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </svg>
        </div>
      </div>

      <div className="text-center mb-1.5">
        <div
          className="text-[12px] font-bold t-fg-strong leading-tight truncate"
          style={{ color: c.tier === "prata" ? "#f1f5f9" : c.tier === "bronze" ? "#fed7aa" : "#fef3c7" }}
        >
          {c.nome}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-1 gap-y-0.5 text-[9px] font-bold tracking-wider" style={{ color: numColor, opacity: 0.92 }}>
        <div className="tnum">{c.pac}  <span style={{ opacity: 0.7 }}>PAC</span></div>
        <div className="tnum">{c.pres} <span style={{ opacity: 0.7 }}>ATV</span></div>
        <div className="tnum">{c.inf}  <span style={{ opacity: 0.7 }}>INF</span></div>
        <div className="tnum">{c.leg}  <span style={{ opacity: 0.7 }}>LEG</span></div>
        <div className="tnum">{c.bse}  <span style={{ opacity: 0.7 }}>BSE</span></div>
        <div className="tnum">{c.mid}  <span style={{ opacity: 0.7 }}>MID</span></div>
      </div>

      {c.traits && c.traits.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
          {c.traits.slice(0, 2).map((t) => (
            <span
              key={t}
              className="text-[8.5px] font-bold tracking-wider uppercase px-1.5 py-[1px] rounded"
              style={{ background: "rgba(0,0,0,0.35)", color: numColor, border: `1px solid ${numColor}33` }}
            >
              {TRAIT_LABEL[t]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
