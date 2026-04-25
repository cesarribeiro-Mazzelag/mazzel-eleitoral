"use client";

/* Dossie 04 - Trajetoria (timeline horizontal).
 * Adaptado de designer/section-trajetoria.jsx. */

import { useRef } from "react";
import { Icon } from "../../Icon";
import { SectionShell } from "../../Primitives";

const NODE_CLS = {
  "eleito":     "node-eleito",
  "nao-eleito": "node-naoeleito",
  "2o-turno":   "node-2turno",
  "nomeado":    "node-nomeado",
};

const STATUS_LABEL = {
  "eleito":     ["ELEITO",     "var(--ok)"],
  "nao-eleito": ["NÃO ELEITO", "var(--fg-dim)"],
  "2o-turno":   ["2º TURNO",   "#fbbf24"],
  "nomeado":    ["NOMEADO",    "#a855f7"],
};

export function TrajetoriaTimeline({ profile }) {
  const events = profile.trajetoria || [];
  const scrollRef = useRef(null);
  const scroll = (dx) => scrollRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  return (
    <SectionShell
      id="sec-trajetoria"
      label="04 Trajetória"
      title="Trajetória Política"
      sub="linha do tempo"
      kicker={<span>{events.length} eventos</span>}
    >
      <div className="relative">
        <button
          onClick={() => scroll(-360)}
          type="button"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--rule-strong)",
            color: "var(--fg-muted)",
          }}
        >
          <Icon name="ArrowLeft" size={14} />
        </button>
        <button
          onClick={() => scroll(360)}
          type="button"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--rule-strong)",
            color: "var(--fg-muted)",
          }}
        >
          <Icon name="ArrowRight" size={14} />
        </button>

        <div ref={scrollRef} className="timeline-scroll overflow-x-auto px-10 pb-2">
          <div className="relative" style={{ minWidth: events.length * 220 }}>
            <div
              className="absolute left-0 right-0 h-px"
              style={{ top: 32, background: "var(--rule-strong)" }}
            />
            <div className="flex items-start" style={{ gap: 0 }}>
              {events.map((ev, i) => {
                const prev = events[i - 1];
                const gap = prev ? (parseInt(ev.ano) - parseInt(prev.ano)) : 0;
                const [stLabel, stColor] = STATUS_LABEL[ev.status] || ["-", "var(--fg-dim)"];
                return (
                  <div
                    key={i}
                    className="flex-shrink-0 relative flex flex-col items-center"
                    style={{ width: 220 }}
                  >
                    {prev && gap > 4 && (
                      <div
                        className="absolute"
                        style={{
                          top: 30,
                          left: "-50%",
                          width: "50%",
                          height: 4,
                          borderTop: "2px dotted var(--fg-ghost)",
                        }}
                      />
                    )}
                    <div
                      className={`w-4 h-4 rounded-full ${NODE_CLS[ev.status] || "node-naoeleito"}`}
                      style={{ marginTop: 24 }}
                    />
                    <div
                      className="mt-5 w-[200px] rounded-lg px-3 py-3 text-center"
                      style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}
                    >
                      <div className="text-[18px] font-black font-display t-fg-strong leading-none">{ev.ano}</div>
                      <div
                        className="text-[10px] font-bold uppercase tracking-[0.15em] mt-1.5"
                        style={{ color: stColor }}
                      >
                        {stLabel}
                      </div>
                      <div className="text-[12px] font-semibold t-fg mt-1">{ev.cargo}</div>
                      <div className="text-[11px] t-fg-dim mt-0.5 flex items-center justify-center gap-1.5">
                        <span className="font-mono">{ev.uf}</span>
                        <span className="t-fg-ghost">·</span>
                        <span
                          className="chip chip-muted"
                          style={{ height: 16, padding: "0 6px", fontSize: 9 }}
                        >
                          {ev.partido}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono tnum t-fg-muted mt-1.5">{ev.votos} votos</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="mt-3 pt-4 flex items-center gap-5 text-[10px] font-mono t-fg-dim"
          style={{ borderTop: "1px solid var(--rule)" }}
        >
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full node-eleito" />Eleito</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full node-2turno" />2º turno</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full node-naoeleito" />Não eleito</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full node-nomeado" />Nomeado</div>
          <div className="ml-auto">Fonte: TSE</div>
        </div>
      </div>
    </SectionShell>
  );
}
