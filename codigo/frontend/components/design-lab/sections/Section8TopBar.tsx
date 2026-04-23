"use client";

/**
 * Seção 8 - Top bar (5 variações)
 */
import type { Section } from "../types";

// ── H1 - Logo + busca pílula central + avatar (Apple) ───────────────────────
function H1() {
  return (
    <header className="flex h-16 items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white px-5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0033A0] text-sm font-bold text-white">UB</div>
        <div className="text-sm font-semibold text-neutral-900">União Brasil</div>
      </div>
      <div className="relative w-full max-w-md">
        <input
          placeholder="Buscar cidade ou político..."
          className="h-10 w-full rounded-full border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm text-neutral-900 focus:bg-white"
          readOnly
        />
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">CR</div>
    </header>
  );
}
const H1Source = `<header className="flex h-16 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-5">
  <div className="flex items-center gap-2">
    <div className="h-9 w-9 rounded-xl bg-[#0033A0] text-white font-bold flex items-center justify-center">UB</div>
    <div className="text-sm font-semibold">União Brasil</div>
  </div>
  <input placeholder="Buscar..." className="h-10 max-w-md w-full rounded-full bg-neutral-50 pl-10" />
  <Avatar />
</header>`;

// ── H2 - Nome centralizado (Tesla) ──────────────────────────────────────────
function H2() {
  return (
    <header className="flex h-16 items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0033A0] text-sm font-bold text-white">UB</div>
      <div className="absolute left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-900">
        MAPA ELEITORAL
      </div>
      <div className="flex items-center gap-3">
        <button className="text-neutral-500 hover:text-neutral-900">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">CR</div>
      </div>
    </header>
  );
}
const H2Source = `<header className="relative flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-5">
  <Logo />
  <div className="absolute left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.25em]">
    MAPA ELEITORAL
  </div>
  <div className="flex items-center gap-3">
    <SearchIcon /> <Avatar />
  </div>
</header>`;

// ── H3 - Top bar transparente sobreposta ────────────────────────────────────
function H3() {
  return (
    <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900 to-blue-700">
      <header className="absolute inset-x-0 top-0 flex h-16 items-center justify-between px-5">
        <div className="flex items-center gap-2 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-sm font-bold backdrop-blur">UB</div>
          <div className="text-sm font-semibold">União Brasil</div>
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/25">
            Buscar
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white backdrop-blur">CR</div>
        </div>
      </header>
    </div>
  );
}
const H3Source = `<header className="absolute inset-x-0 top-0 flex h-16 items-center justify-between px-5 bg-transparent">
  <div className="flex items-center gap-2 text-white">
    <Logo bg="bg-white/20" /> <Title />
  </div>
  <div className="flex items-center gap-3">
    <button className="rounded-full bg-white/15 px-4 py-2 text-white backdrop-blur">Buscar</button>
    <Avatar />
  </div>
</header>`;

// ── H4 - Top bar com pílula central tipo "tabs invisíveis" ──────────────────
function H4() {
  return (
    <header className="flex h-16 items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0033A0] text-sm font-bold text-white">UB</div>
      <div className="inline-flex rounded-full bg-neutral-100 p-1">
        <button className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-neutral-900 shadow-sm">Mapa</button>
        <button className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-500">Radar</button>
        <button className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-500">Operação</button>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">CR</div>
    </header>
  );
}
const H4Source = `<header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-5">
  <Logo />
  <div className="inline-flex rounded-full bg-neutral-100 p-1">
    <button className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold shadow-sm">Mapa</button>
    <button className="rounded-full px-4 py-1.5 text-xs text-neutral-500">Radar</button>
  </div>
  <Avatar />
</header>`;

// ── H5 - Mínima com cmd+K ───────────────────────────────────────────────────
function H5() {
  return (
    <header className="flex h-14 items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0033A0] text-xs font-bold text-white">UB</div>
      </div>
      <button className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-500 hover:border-neutral-400">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
        Buscar
        <kbd className="ml-2 rounded border border-neutral-300 bg-white px-1 text-[10px] font-mono text-neutral-500">⌘K</kbd>
      </button>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">CR</div>
    </header>
  );
}
const H5Source = `<header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
  <Logo />
  <button className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-500">
    <SearchIcon /> Buscar <kbd>⌘K</kbd>
  </button>
  <Avatar />
</header>`;

export const Section8TopBar: Section = {
  id: "topbar",
  letter: "H",
  title: "Top bar",
  subtitle: "5 estilos de barra superior - de Apple completa a Tesla minimalista.",
  variants: [
    { code: "H1", name: "Apple completa", description: "Logo + nome + busca pílula central + avatar.", Component: H1, source: H1Source },
    { code: "H2", name: "Tesla com nome centralizado", description: "Logo + nome do produto centralizado + ícones discretos.", Component: H2, source: H2Source },
    { code: "H3", name: "Transparente sobreposta", description: "Sobre o mapa, fundo translúcido com glass effect.", Component: H3, source: H3Source },
    { code: "H4", name: "Com tabs no centro", description: "Logo + segmented control + avatar - navegação principal.", Component: H4, source: H4Source },
    { code: "H5", name: "Mínima com ⌘K", description: "Compacta, busca via atalho de teclado.", Component: H5, source: H5Source },
  ],
};
