"use client";

/**
 * Seção 4 - Cards de KPI
 */
import type { Section } from "../types";

// ── D1 - Número minimal ─────────────────────────────────────────────────────
function D1() {
  return (
    <div className="grid max-w-2xl grid-cols-3 gap-6">
      <div>
        <div className="text-[64px] font-semibold leading-none tracking-tight text-neutral-900">412</div>
        <div className="mt-2 text-xs font-medium uppercase tracking-wider text-neutral-500">prefeitos eleitos</div>
      </div>
      <div>
        <div className="text-[64px] font-semibold leading-none tracking-tight text-neutral-900">5</div>
        <div className="mt-2 text-xs font-medium uppercase tracking-wider text-neutral-500">estados onde domina</div>
      </div>
      <div>
        <div className="text-[64px] font-semibold leading-none tracking-tight text-neutral-900">18%</div>
        <div className="mt-2 text-xs font-medium uppercase tracking-wider text-neutral-500">crescimento desde 2020</div>
      </div>
    </div>
  );
}
const D1Source = `<div>
  <div className="text-[64px] font-semibold leading-none tracking-tight text-neutral-900">412</div>
  <div className="mt-2 text-xs font-medium uppercase tracking-wider text-neutral-500">prefeitos eleitos</div>
</div>`;

// ── D2 - Número com barra ───────────────────────────────────────────────────
function D2() {
  return (
    <div className="grid max-w-2xl grid-cols-3 gap-6">
      {[
        { num: "412", label: "Prefeitos", pct: 72 },
        { num: "5/27", label: "Estados onde domina", pct: 18 },
        { num: "18%", label: "Crescimento", pct: 90 },
      ].map((k) => (
        <div key={k.num} className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
          <div className="text-3xl font-semibold tracking-tight text-neutral-900">{k.num}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider text-neutral-500">{k.label}</div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-neutral-900" style={{ width: k.pct + "%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
const D2Source = `<div className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
  <div className="text-3xl font-semibold tracking-tight">412</div>
  <div className="mt-1 text-xs uppercase tracking-wider text-neutral-500">Prefeitos</div>
  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
    <div className="h-full rounded-full bg-neutral-900" style={{ width: "72%" }} />
  </div>
</div>`;

// ── D3 - Número com comparação ──────────────────────────────────────────────
function D3() {
  return (
    <div className="grid max-w-2xl grid-cols-3 gap-6">
      {[
        { num: "412", label: "Prefeitos", delta: "+18%", up: true },
        { num: "5", label: "Estados domina", delta: "+1", up: true },
        { num: "21", label: "Estados fraco", delta: "-3", up: false },
      ].map((k) => (
        <div key={k.label} className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
          <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">{k.label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-3xl font-semibold tracking-tight text-neutral-900">{k.num}</div>
            <div className={"text-sm font-medium " + (k.up ? "text-emerald-700" : "text-red-700")}>
              {k.delta}
            </div>
          </div>
          <div className="mt-1 text-xs text-neutral-400">vs 2020</div>
        </div>
      ))}
    </div>
  );
}
const D3Source = `<div className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
  <div className="text-xs uppercase tracking-wider text-neutral-500">Prefeitos</div>
  <div className="flex items-baseline gap-2">
    <div className="text-3xl font-semibold">412</div>
    <div className="text-sm font-medium text-emerald-700">+18%</div>
  </div>
  <div className="text-xs text-neutral-400">vs 2020</div>
</div>`;

// ── D4 - Número com sparkline ───────────────────────────────────────────────
function D4() {
  const sparkline = "M0,30 L20,28 L40,22 L60,25 L80,15 L100,10";
  return (
    <div className="grid max-w-2xl grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
          <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">Prefeitos</div>
          <div className="text-3xl font-semibold tracking-tight text-neutral-900">412</div>
          <svg viewBox="0 0 100 40" className="mt-2 h-10 w-full">
            <path d={sparkline} fill="none" stroke="#0033A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d={sparkline + " L100,40 L0,40 Z"} fill="#0033A0" fillOpacity="0.08" />
          </svg>
          <div className="mt-1 flex justify-between text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            <span>2018</span>
            <span>2024</span>
          </div>
        </div>
      ))}
    </div>
  );
}
const D4Source = `<div className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
  <div className="text-xs uppercase tracking-wider text-neutral-500">Prefeitos</div>
  <div className="text-3xl font-semibold">412</div>
  <svg viewBox="0 0 100 40" className="mt-2 h-10 w-full">
    <path d="M0,30 L20,28 L40,22 L60,25 L80,15 L100,10" stroke="#0033A0" strokeWidth="2" fill="none" />
  </svg>
</div>`;

// ── D5 - Número com ícone e cor ─────────────────────────────────────────────
function D5() {
  return (
    <div className="grid max-w-2xl grid-cols-3 gap-6">
      {[
        { num: "412", label: "Prefeitos", icon: "👥", bg: "#0033A0", soft: "#E0E9F8" },
        { num: "5", label: "Estados", icon: "🏛", bg: "#15803D", soft: "#DCFCE7" },
        { num: "18%", label: "Crescimento", icon: "↗", bg: "#FFCC00", soft: "#FFF6CC" },
      ].map((k) => (
        <div key={k.label} className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg" style={{ backgroundColor: k.soft, color: k.bg }}>
            {k.icon}
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">{k.num}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider text-neutral-500">{k.label}</div>
        </div>
      ))}
    </div>
  );
}
const D5Source = `<div className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
  <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "#E0E9F8", color: "#0033A0" }}>
    👥
  </div>
  <div className="mt-3 text-3xl font-semibold">412</div>
  <div className="text-xs uppercase tracking-wider text-neutral-500">Prefeitos</div>
</div>`;

// ── D6 - Gauge circular ─────────────────────────────────────────────────────
function D6() {
  function Gauge({ pct, num, label }: { pct: number; num: string; label: string }) {
    const c = 2 * Math.PI * 36;
    const offset = c - (pct / 100) * c;
    return (
      <div className="flex flex-col items-center">
        <div className="relative h-24 w-24">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle cx="40" cy="40" r="36" fill="none" stroke="#F3F4F6" strokeWidth="6" />
            <circle cx="40" cy="40" r="36" fill="none" stroke="#0033A0" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-neutral-900">{num}</div>
        </div>
        <div className="mt-2 text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-8">
      <Gauge pct={72} num="72%" label="Cobertura" />
      <Gauge pct={18} num="5/27" label="Estados" />
      <Gauge pct={90} num="+18%" label="Crescimento" />
    </div>
  );
}
const D6Source = `function Gauge({ pct, num, label }) {
  const c = 2 * Math.PI * 36;
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r="36" stroke="#F3F4F6" strokeWidth="6" fill="none" />
        <circle cx="40" cy="40" r="36" stroke="#0033A0" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct/100)*c} fill="none" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold">{num}</div>
    </div>
  );
}`;

export const Section4KPI: Section = {
  id: "kpi",
  letter: "D",
  title: "Cards de KPI",
  subtitle: "6 jeitos de mostrar um número com contexto - do mais minimal ao mais rico.",
  variants: [
    { code: "D1", name: "Número minimal", description: "Só o número grande + label minúsculo. Apple puro.", Component: D1, source: D1Source },
    { code: "D2", name: "Com barra", description: "Número + barra de progresso para representar percentual.", Component: D2, source: D2Source },
    { code: "D3", name: "Com comparação", description: "Número + delta (+18%) vs período anterior.", Component: D3, source: D3Source },
    { code: "D4", name: "Com sparkline", description: "Número + mini-gráfico de tendência por dentro do card.", Component: D4, source: D4Source },
    { code: "D5", name: "Com ícone e cor", description: "Ícone colorido + número + label. Mais visual.", Component: D5, source: D5Source },
    { code: "D6", name: "Gauge circular", description: "Anel circular preenchido + número no centro.", Component: D6, source: D6Source },
  ],
};
