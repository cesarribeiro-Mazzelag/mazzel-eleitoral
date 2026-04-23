"use client";

/**
 * Seção 9 - Menu de capítulos (resolve a barra cluttered atual)
 */
import { useState } from "react";
import type { Section } from "../types";

const CAPITULOS = [
  { id: "cenario", label: "Cenário Político", desc: "Top 5 partidos do Brasil hoje" },
  { id: "forte", label: "Onde estou forte", desc: "Estados onde o partido domina" },
  { id: "crescendo", label: "Onde estou crescendo", desc: "Maiores saltos vs ciclo anterior", lock: true },
  { id: "perdendo", label: "Onde estou perdendo", desc: "Risco identificado", lock: true },
  { id: "maiores", label: "Maiores eleitos", desc: "Top 10 com dossiê", lock: true },
  { id: "ameaca", label: "Quem me ameaça", desc: "Concorrentes em alta", lock: true },
  { id: "comparar", label: "Comparar com outro", desc: "Bivariado partido vs partido", lock: true },
];

// ── I1 - Drawer lateral ─────────────────────────────────────────────────────
function I1() {
  const [open, setOpen] = useState(true);
  return (
    <div className="relative h-[400px] overflow-hidden rounded-2xl bg-neutral-100">
      <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">[ mapa aqui ]</div>
      <button onClick={() => setOpen(!open)} className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 shadow-md ring-1 ring-neutral-200">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>
        Histórias
      </button>
      {open && (
        <div className="absolute left-4 top-16 w-72 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-neutral-200">
          <div className="border-b border-neutral-100 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Escolha uma história</div>
          <ul className="max-h-72 overflow-y-auto py-2">
            {CAPITULOS.map((c) => (
              <li key={c.id}>
                <button disabled={c.lock} className={"flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition " + (c.lock ? "cursor-not-allowed text-neutral-400" : "hover:bg-neutral-50")}>
                  <div>
                    <div className="text-sm font-medium text-neutral-900">{c.label}</div>
                    <div className="text-xs text-neutral-500">{c.desc}</div>
                  </div>
                  {c.lock && <span className="text-xs">🔒</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
const I1Source = `<button className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 shadow-md ring-1 ring-neutral-200">
  <MenuIcon /> Histórias
</button>
{/* Drawer aparece embaixo */}
<div className="w-72 rounded-2xl bg-white shadow-2xl ring-1 ring-neutral-200">
  <ul>{capitulos.map(c => <li>...</li>)}</ul>
</div>`;

// ── I2 - Modal centralizado ─────────────────────────────────────────────────
function I2() {
  return (
    <div className="relative h-[400px] overflow-hidden rounded-2xl bg-neutral-100">
      <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">[ mapa aqui ]</div>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="absolute left-1/2 top-1/2 w-96 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Histórias do mapa</div>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">Qual história quer ver?</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 px-6 pb-6">
          {CAPITULOS.slice(0, 4).map((c) => (
            <button key={c.id} disabled={c.lock} className={"rounded-2xl border p-4 text-left " + (c.lock ? "border-neutral-200 text-neutral-400" : "border-neutral-300 hover:border-neutral-900 hover:bg-neutral-50")}>
              <div className="text-sm font-semibold text-neutral-900">{c.label}</div>
              <div className="mt-1 text-xs text-neutral-500">{c.desc}</div>
              {c.lock && <span className="mt-2 inline-block text-xs">🔒</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
const I2Source = `<div className="fixed inset-0 bg-black/30 backdrop-blur-sm">
  <div className="absolute left-1/2 top-1/2 w-96 -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white shadow-2xl">
    <h3 className="text-xl font-semibold">Qual história quer ver?</h3>
    <div className="grid grid-cols-2 gap-3">
      {capitulos.map(c => <button>{c.label}</button>)}
    </div>
  </div>
</div>`;

// ── I3 - Segmented com "Mais" oculto ────────────────────────────────────────
function I3() {
  return (
    <div className="relative h-[400px] overflow-hidden rounded-2xl bg-neutral-100">
      <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">[ mapa aqui ]</div>
      <div className="absolute left-1/2 top-4 -translate-x-1/2">
        <div className="inline-flex items-center rounded-full bg-white p-1 shadow-md ring-1 ring-neutral-200">
          <button className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white">Cenário</button>
          <button className="rounded-full px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">Onde estou forte</button>
          <button className="rounded-full px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100">⋯ Mais 5</button>
        </div>
      </div>
    </div>
  );
}
const I3Source = `<div className="inline-flex items-center rounded-full bg-white p-1 shadow-md ring-1 ring-neutral-200">
  <button className="rounded-full bg-neutral-900 px-5 py-2 text-white">Cenário</button>
  <button className="rounded-full px-5 py-2 text-neutral-700">Onde estou forte</button>
  <button className="rounded-full px-4 py-2 text-neutral-500">⋯ Mais 5</button>
</div>`;

// ── I4 - Bottom sheet iOS ───────────────────────────────────────────────────
function I4() {
  return (
    <div className="relative h-[400px] overflow-hidden rounded-2xl bg-neutral-100">
      <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">[ mapa aqui ]</div>
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white shadow-2xl">
        <div className="flex justify-center pt-2">
          <div className="h-1 w-12 rounded-full bg-neutral-300" />
        </div>
        <div className="px-6 pt-3 pb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Histórias</div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {CAPITULOS.map((c) => (
              <button key={c.id} disabled={c.lock} className={"shrink-0 rounded-2xl px-4 py-3 text-left " + (c.lock ? "bg-neutral-100 text-neutral-400" : "bg-neutral-900 text-white")}>
                <div className="text-sm font-semibold">{c.label}</div>
                <div className={"text-xs " + (c.lock ? "text-neutral-400" : "text-neutral-300")}>{c.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
const I4Source = `<div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white shadow-2xl">
  <div className="flex justify-center pt-2"><div className="h-1 w-12 rounded-full bg-neutral-300" /></div>
  <div className="flex gap-2 overflow-x-auto px-6 pb-6">
    {capitulos.map(c => <button className="rounded-2xl bg-neutral-900 px-4 py-3 text-white">{c.label}</button>)}
  </div>
</div>`;

// ── I5 - Dropdown estilo Tesla ──────────────────────────────────────────────
function I5() {
  return (
    <div className="relative h-[400px] overflow-hidden rounded-2xl bg-neutral-100">
      <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">[ mapa aqui ]</div>
      <div className="absolute right-4 top-4 w-64 overflow-hidden rounded-xl bg-neutral-900 text-white shadow-2xl">
        <div className="border-b border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">CAPÍTULO ATUAL</div>
        <button className="flex w-full items-center justify-between px-4 py-3 text-left">
          <div>
            <div className="text-sm font-semibold">Cenário Político</div>
            <div className="text-xs text-neutral-400">Top 5 partidos do Brasil</div>
          </div>
          <svg className="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
}
const I5Source = `<div className="absolute right-4 top-4 w-64 rounded-xl bg-neutral-900 text-white shadow-2xl">
  <div className="px-4 py-3 text-[10px] uppercase tracking-wider text-neutral-400">CAPÍTULO ATUAL</div>
  <button className="flex w-full items-center justify-between px-4 py-3">
    <div>
      <div className="text-sm font-semibold">Cenário Político</div>
      <div className="text-xs text-neutral-400">Top 5 partidos</div>
    </div>
    <ChevronDown />
  </button>
</div>`;

// ── I6 - Command palette ⌘K ─────────────────────────────────────────────────
function I6() {
  return (
    <div className="relative h-[400px] overflow-hidden rounded-2xl bg-neutral-100">
      <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">[ mapa aqui ]</div>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="absolute left-1/2 top-16 w-[420px] -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4">
          <svg className="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
          <input placeholder="Buscar história, cidade ou político..." className="flex-1 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none" />
          <kbd className="rounded border border-neutral-300 px-1.5 text-[10px] font-mono text-neutral-500">esc</kbd>
        </div>
        <div className="max-h-64 overflow-y-auto py-2">
          <div className="px-5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">HISTÓRIAS</div>
          {CAPITULOS.slice(0, 4).map((c) => (
            <button key={c.id} className="flex w-full items-center justify-between px-5 py-2 text-left hover:bg-neutral-50">
              <div>
                <div className="text-sm font-medium text-neutral-900">{c.label}</div>
                <div className="text-xs text-neutral-500">{c.desc}</div>
              </div>
              {c.lock && <span className="text-xs">🔒</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
const I6Source = `<div className="fixed inset-0 bg-black/30 backdrop-blur-sm">
  <div className="absolute left-1/2 top-16 w-[420px] -translate-x-1/2 rounded-2xl bg-white shadow-2xl">
    <input placeholder="Buscar história, cidade ou político..." />
    <ul>{historias.map(h => <li>{h.label}</li>)}</ul>
  </div>
</div>`;

export const Section9Capitulos: Section = {
  id: "capitulos",
  letter: "I",
  title: "Menu de capítulos",
  subtitle: "6 jeitos de organizar 7 histórias sem cluttering. Resolve o problema atual da barra V3.",
  variants: [
    { code: "I1", name: "Drawer lateral", description: "Botão único 'Histórias' que abre lista lateral.", Component: I1, source: I1Source },
    { code: "I2", name: "Modal centralizado", description: "Botão abre modal com cards grandes.", Component: I2, source: I2Source },
    { code: "I3", name: "Segmented + Mais", description: "2 capítulos visíveis + 'Mais 5' oculto.", Component: I3, source: I3Source },
    { code: "I4", name: "Bottom sheet iOS", description: "Cards horizontais que sobem do rodapé.", Component: I4, source: I4Source },
    { code: "I5", name: "Dropdown Tesla", description: "Card escuro no canto que expande.", Component: I5, source: I5Source },
    { code: "I6", name: "Command palette ⌘K", description: "Pesquisa + lista, atalho de teclado.", Component: I6, source: I6Source },
  ],
};
