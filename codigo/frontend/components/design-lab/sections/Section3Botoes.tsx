"use client";

/**
 * Seção 3 - Botões
 */
import type { Section } from "../types";

// ── C1 - Pílula primary preenchida ──────────────────────────────────────────
function C1() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700">
        Ver onde estou forte
      </button>
      <button className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white opacity-50" disabled>
        Desabilitado
      </button>
    </div>
  );
}
const C1Source = `<button className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700">
  Ver onde estou forte
</button>`;

// ── C2 - Pílula ghost ───────────────────────────────────────────────────────
function C2() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-900 transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white">
        Ver onde estou forte
      </button>
      <button className="rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium text-neutral-400" disabled>
        Desabilitado
      </button>
    </div>
  );
}
const C2Source = `<button className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-900 hover:text-white">
  Ver onde estou forte
</button>`;

// ── C3 - Texto puro com underline ───────────────────────────────────────────
function C3() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <button className="text-sm font-medium text-neutral-900 underline-offset-4 hover:underline">
        Ver onde estou forte
      </button>
      <button className="text-sm font-medium text-neutral-900 underline-offset-4 hover:underline">
        Voltar
      </button>
    </div>
  );
}
const C3Source = `<button className="text-sm font-medium text-neutral-900 underline-offset-4 hover:underline">
  Ver onde estou forte
</button>`;

// ── C4 - Pílula com ícone à esquerda ────────────────────────────────────────
function C4() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button className="flex items-center gap-2.5 rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M14 5l7 7-7 7M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Próximo capítulo
      </button>
      <button className="flex items-center gap-2.5 rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-900">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M10 19l-7-7 7-7M3 12h18" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Voltar
      </button>
    </div>
  );
}
const C4Source = `<button className="flex items-center gap-2.5 rounded-full bg-neutral-900 px-5 py-3 text-white">
  <svg className="h-4 w-4">...</svg>
  Próximo capítulo
</button>`;

// ── C5 - FAB (botão flutuante grande) ───────────────────────────────────────
function C5() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900 text-white shadow-xl transition hover:scale-105">
        <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>
      <button className="flex h-14 items-center gap-3 rounded-full bg-neutral-900 px-6 text-base font-medium text-white shadow-xl">
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 4l10 6-10 6V4z" />
        </svg>
        Tocar evolução
      </button>
    </div>
  );
}
const C5Source = `<button className="h-16 w-16 rounded-full bg-neutral-900 text-white shadow-xl hover:scale-105 flex items-center justify-center">
  <PlusIcon />
</button>`;

// ── C6 - Segmented control ──────────────────────────────────────────────────
function C6() {
  return (
    <div className="inline-flex rounded-full bg-neutral-100 p-1">
      <button className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-900 shadow-sm">Resultado</button>
      <button className="rounded-full px-5 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900">Operação</button>
      <button className="rounded-full px-5 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900">Comparar</button>
    </div>
  );
}
const C6Source = `<div className="inline-flex rounded-full bg-neutral-100 p-1">
  <button className="rounded-full bg-white px-5 py-2 text-neutral-900 shadow-sm">Resultado</button>
  <button className="rounded-full px-5 py-2 text-neutral-500">Operação</button>
</div>`;

// ── C7 - Toggle iOS ─────────────────────────────────────────────────────────
function C7() {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-neutral-50 px-4 py-3 ring-1 ring-neutral-200">
        <span className="text-sm text-neutral-900">Mostrar nomes das cidades</span>
        <span className="relative inline-block h-7 w-12 rounded-full bg-neutral-900 transition">
          <span className="absolute right-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow" />
        </span>
      </label>
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-neutral-50 px-4 py-3 ring-1 ring-neutral-200">
        <span className="text-sm text-neutral-900">Mostrar bordas dos estados</span>
        <span className="relative inline-block h-7 w-12 rounded-full bg-neutral-300 transition">
          <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow" />
        </span>
      </label>
    </div>
  );
}
const C7Source = `<label className="flex items-center justify-between gap-4 rounded-xl bg-neutral-50 px-4 py-3 ring-1 ring-neutral-200">
  <span>Mostrar nomes das cidades</span>
  <span className="relative h-7 w-12 rounded-full bg-neutral-900">
    <span className="absolute right-0.5 top-0.5 h-6 w-6 rounded-full bg-white" />
  </span>
</label>`;

// ── C8 - Ícone circular ─────────────────────────────────────────────────────
function C8() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-900 hover:text-white">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M5 12h14M12 5v14" strokeLinecap="round" />
        </svg>
      </button>
      <button className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-900 hover:text-white">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M5 12h14" strokeLinecap="round" />
        </svg>
      </button>
      <button className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-white">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
const C8Source = `<button className="h-11 w-11 rounded-full border border-neutral-300 hover:bg-neutral-900 hover:text-white flex items-center justify-center">
  <PlusIcon />
</button>`;

export const Section3Botoes: Section = {
  id: "botoes",
  letter: "C",
  title: "Botões",
  subtitle: "8 estilos para todas as ações do produto - principal, secundária, ícone, toggle.",
  variants: [
    { code: "C1", name: "Pílula primary", description: "Botão principal, fundo preto, texto branco.", Component: C1, source: C1Source },
    { code: "C2", name: "Pílula ghost", description: "Borda fina, transparente, hover invertido.", Component: C2, source: C2Source },
    { code: "C3", name: "Texto puro", description: "Sem fundo, link tipográfico, underline no hover.", Component: C3, source: C3Source },
    { code: "C4", name: "Pílula com ícone", description: "Pílula + ícone à esquerda - ações de navegação.", Component: C4, source: C4Source },
    { code: "C5", name: "FAB", description: "Botão flutuante grande - ação primária do canto.", Component: C5, source: C5Source },
    { code: "C6", name: "Segmented control", description: "Múltiplas opções num só componente, estilo iOS.", Component: C6, source: C6Source },
    { code: "C7", name: "Toggle iOS", description: "Liga/desliga estilo iOS para opções booleanas.", Component: C7, source: C7Source },
    { code: "C8", name: "Ícone circular", description: "Botão só com ícone - zoom, voltar, expandir.", Component: C8, source: C8Source },
  ],
};
