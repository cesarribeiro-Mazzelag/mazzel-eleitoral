"use client";

/* Dossie 01 - Header Hero.
 * Adaptado de designer/section-header.jsx. */

import { Icon } from "../../Icon";
import { ARCHETYPES } from "../../data";
import { CardPolitico } from "../../../radar/CardPolitico";

function ArchetypeChip({ type }) {
  const a = ARCHETYPES[type];
  if (!a) return null;
  return (
    <span className={`chip ${a.cls}`}>
      <span className={`chip-dot ${a.dot}`} />{a.label}
    </span>
  );
}

function AlertChip() {
  return (
    <span className="chip chip-red">
      <span className="chip-dot dot-red" />
      <Icon name="AlertTriangle" size={10} stroke={2.5} />Alerta jurídico
    </span>
  );
}

function TraitBadge({ variant = "gold", label, icon }) {
  return (
    <div className={`${variant === "gold" ? "trait-gold" : "trait-silver"} rounded-md px-2 py-1.5 flex items-center gap-1.5`}>
      <span>{icon}</span>
      <span className="text-[10px] font-black tracking-[0.12em] uppercase leading-none">{label}</span>
    </div>
  );
}

export function HeaderHero({ profile, alert }) {
  const p = profile;
  const isSparse = !!p.sparse;
  return (
    <section
      data-screen-label="01 Identidade"
      id="sec-identidade"
      className={`relative rounded-2xl t-bg-card ring-soft overflow-hidden ${alert ? "ring-danger" : ""}`}
    >
      {alert && (
        <div className="alert-bar px-6 py-2.5 flex items-center gap-3">
          <div className="flex items-center gap-2" style={{ color: "var(--danger)" }}>
            <Icon name="AlertTriangle" size={14} stroke={2.5} />
            <span className="text-[11px] font-bold tracking-[0.12em] uppercase">Alerta jurídico ativo</span>
          </div>
          <span className="t-fg-dim text-[12px]">Ação penal em tramitação · STF · Processo nº 4421/2024</span>
          <div className="ml-auto flex items-center gap-1.5 t-fg-muted text-[11px] font-medium cursor-pointer">
            Ver detalhes <span className="font-mono">→</span>
          </div>
        </div>
      )}
      <div className="grid gap-6 p-6" style={{ gridTemplateColumns: "240px 1fr 340px" }}>
        <div className="flex-shrink-0">
          <CardPolitico politico={p.cartinha || {}} width={240} height={422} />
        </div>
        <div className="flex flex-col min-w-0 pt-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono t-fg-dim tracking-[0.2em]">CAND_ID</span>
            <span className="text-[10px] font-mono t-fg-muted tracking-[0.15em]">
              BR-{p.lastName.slice(0, 3).toUpperCase()}-{p.rating ?? "XX"}
            </span>
            <span className="w-1 h-1 rounded-full" style={{ background: "var(--fg-ghost)" }} />
            <span className="text-[10px] font-mono t-ok tracking-[0.15em] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--verified)" }} /> VERIFICADO
            </span>
          </div>
          <h1 className="font-display leading-[0.95]">
            <span className="block text-[28px] font-light t-fg-muted tracking-tight">{p.firstName}</span>
            <span className="block text-[48px] font-black t-fg-strong tracking-[-0.03em] -mt-1">{p.lastName}</span>
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-[11px] font-bold t-fg tracking-[0.2em] uppercase">{p.meta}</span>
            {!isSparse && <span className="t-fg-ghost">·</span>}
            {!isSparse && (
              <span className="text-[11px] font-mono t-fg-dim flex items-center gap-1.5">
                <Icon name="Trend" size={11} /> +3 pts YoY
              </span>
            )}
          </div>
          <p className="mt-3 text-[14px] t-fg-muted leading-[1.55] max-w-[460px]">{p.bio}</p>
          <div className="mt-auto pt-5 grid grid-cols-4" style={{ borderTop: "1px solid var(--rule)" }}>
            {p.stats.map((s, i) => (
              <div
                key={s.k}
                className="pt-4"
                style={i > 0 ? { borderLeft: "1px solid var(--rule)", paddingLeft: 16 } : {}}
              >
                <div className="text-[10px] font-mono t-fg-dim tracking-[0.15em] uppercase">{s.k}</div>
                <div className={`text-[18px] font-semibold tnum mt-1 ${isSparse ? "t-fg-ghost" : "t-fg-strong"}`}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="pl-6 flex flex-col" style={{ borderLeft: "1px solid var(--rule)" }}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div
                className={`${isSparse ? "overall-muted" : "overall-num"} font-black tnum font-display leading-[0.85]`}
                style={{ fontSize: 88 }}
              >
                {p.rating ?? "-"}
              </div>
              <div className="mt-1 text-[10px] font-bold tracking-[0.15em] uppercase t-fg-dim">Overall</div>
            </div>
            {!isSparse && p.traits.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-2">
                {p.traits.map((t) => (
                  <TraitBadge
                    key={t.label}
                    variant={t.variant}
                    label={t.label}
                    icon={t.variant === "gold"
                      ? <Icon name="Zap" size={11} stroke={2.5} />
                      : <Icon name="Star" size={11} stroke={2.5} />}
                  />
                ))}
              </div>
            )}
          </div>
          <div className={`mt-2 text-[13px] flex items-center gap-1.5 ${isSparse ? "t-fg-dim" : "t-accent"}`}>
            {!isSparse && <Icon name="Hash" size={12} />}
            {isSparse && <Icon name="Build" size={12} />}
            <span>{p.percentile}</span>
          </div>
          {!isSparse && (
            <div className="mt-4">
              <div className="h-1 w-full rounded-full rank-track overflow-hidden">
                <div className="h-full rounded-full rank-fill" style={{ width: `${p.rating}%` }} />
              </div>
              <div className="flex justify-between mt-1.5 text-[9px] font-mono t-fg-ghost tracking-[0.1em]">
                <span>0</span><span>50</span><span className="t-accent">{p.rating}</span><span>100</span>
              </div>
            </div>
          )}
          <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--rule)" }}>
            <div className="text-[10px] font-bold tracking-[0.15em] uppercase t-fg-dim mb-2.5">
              {isSparse ? "Status" : "Arquétipos"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {isSparse ? (
                <span className="chip chip-muted">
                  <Icon name="Build" size={10} />Perfil em construção
                </span>
              ) : (
                <>
                  {p.archetypes.map((a) => <ArchetypeChip key={a} type={a} />)}
                  {alert && <AlertChip />}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
