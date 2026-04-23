"use client";

/**
 * Seção 10 - Linha do tempo (4 variações)
 */
import type { Section } from "../types";

const ANOS = [2018, 2020, 2022, 2024];

// ── J1 - Slider iOS com label flutuante ─────────────────────────────────────
function J1() {
  return (
    <div className="max-w-md rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
      <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Ano da eleição</div>
      <div className="mt-4 relative">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full w-full rounded-full bg-neutral-900" />
        </div>
        <div className="absolute top-1/2 right-0 -translate-y-1/2">
          <div className="h-6 w-6 rounded-full border-4 border-neutral-900 bg-white shadow-md" />
        </div>
        <div className="absolute -top-12 right-0 translate-x-1/2 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white">
          2024
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-neutral-900" />
        </div>
      </div>
      <div className="mt-3 flex justify-between text-[10px] font-medium uppercase tracking-wider text-neutral-400">
        {ANOS.map((a) => <span key={a}>{a}</span>)}
      </div>
    </div>
  );
}
const J1Source = `<div className="relative">
  <div className="h-1.5 w-full rounded-full bg-neutral-100">
    <div className="h-full rounded-full bg-neutral-900" style={{ width: pct + "%" }} />
  </div>
  <div className="absolute h-6 w-6 rounded-full border-4 border-neutral-900 bg-white" style={{ left: pct + "%" }} />
  <div className="absolute -top-12 rounded-lg bg-neutral-900 px-3 py-1.5 text-white">2024</div>
</div>`;

// ── J2 - Pílulas pequenas no rodapé ─────────────────────────────────────────
function J2() {
  return (
    <div className="inline-flex items-center rounded-full bg-white p-1 shadow-sm ring-1 ring-neutral-200">
      {ANOS.map((a) => (
        <button key={a} className={"rounded-full px-4 py-2 text-sm font-medium " + (a === 2024 ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900")}>
          {a}
        </button>
      ))}
      <button className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200">
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4l10 6-10 6V4z" /></svg>
      </button>
    </div>
  );
}
const J2Source = `<div className="inline-flex items-center rounded-full bg-white p-1 shadow-sm ring-1 ring-neutral-200">
  {anos.map(a => (
    <button className={a === 2024 ? "bg-neutral-900 text-white" : "text-neutral-500"}>
      {a}
    </button>
  ))}
  <PlayButton />
</div>`;

// ── J3 - Botão único que abre seletor ───────────────────────────────────────
function J3() {
  return (
    <div className="flex items-center gap-3">
      <button className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-200">
        <svg className="h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" /></svg>
        Eleição de 2024
        <svg className="h-3 w-3 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}
const J3Source = `<button className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 shadow-sm ring-1 ring-neutral-200">
  <CalendarIcon /> Eleição de 2024 <ChevronDown />
</button>`;

// ── J4 - Sumido (vai dentro do menu) ────────────────────────────────────────
function J4() {
  return (
    <div className="max-w-md rounded-2xl bg-neutral-50 p-6 text-sm text-neutral-500">
      <div className="font-medium text-neutral-700">Linha do tempo embutida no menu de Histórias.</div>
      <div className="mt-2">
        Quando o usuário escolhe um capítulo (ex: "Onde estou forte"), a sidebar pergunta o ano dentro do próprio fluxo, não há controle persistente no mapa.
      </div>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200">
        Você está vendo <span className="font-semibold text-neutral-900">2024</span>
        <button className="text-neutral-500 underline">trocar</button>
      </div>
    </div>
  );
}
const J4Source = `// Sem controle persistente no mapa.
// O ano é decidido na escolha do capítulo.
// Indicação discreta:
<div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-neutral-200">
  Você está vendo <span className="font-semibold">2024</span>
  <button className="underline">trocar</button>
</div>`;

export const Section10LinhaDoTempo: Section = {
  id: "linha-tempo",
  letter: "J",
  title: "Linha do tempo",
  subtitle: "4 jeitos de selecionar/visualizar o ano da eleição (2018/2020/2022/2024).",
  variants: [
    { code: "J1", name: "Slider iOS", description: "Slider horizontal com label flutuante no thumb.", Component: J1, source: J1Source },
    { code: "J2", name: "Pílulas + play", description: "4 pílulas pequenas + botão de play.", Component: J2, source: J2Source },
    { code: "J3", name: "Botão único", description: "Um único botão 'Eleição de 2024' que abre seletor.", Component: J3, source: J3Source },
    { code: "J4", name: "Sumido (no menu)", description: "Sem controle no mapa, ano vai dentro do fluxo do capítulo.", Component: J4, source: J4Source },
  ],
};
