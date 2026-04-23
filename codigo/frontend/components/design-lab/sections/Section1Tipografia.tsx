"use client";

/**
 * Seção 1 - Tipografia
 * Inspirações: Apple HIG, Tesla industrial, Mazzel próprio
 */
import type { Section } from "../types";

const FRASE_DESTAQUE = "União Brasil tem 412 prefeitos eleitos.";
const FRASE_APOIO = "Cresceu 18% desde 2020.";
const FRASE_SUB = "Maior força em Bahia, Goiás e Tocantins.";

// ── A1 - Apple HIG ──────────────────────────────────────────────────────────
function A1Apple() {
  return (
    <div className="space-y-1" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" }}>
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500">União Brasil hoje</div>
      <div className="text-[56px] font-semibold leading-[1.05] tracking-[-0.025em] text-neutral-900">{FRASE_DESTAQUE}</div>
      <div className="pt-2 text-[22px] font-normal leading-snug text-neutral-700">{FRASE_APOIO}</div>
      <div className="pt-1 text-[15px] font-normal text-neutral-500">{FRASE_SUB}</div>
    </div>
  );
}
const A1Source = `<div className="space-y-1" style={{ fontFamily: "-apple-system, 'SF Pro Display'..." }}>
  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500">União Brasil hoje</div>
  <div className="text-[56px] font-semibold leading-[1.05] tracking-[-0.025em] text-neutral-900">União Brasil tem 412 prefeitos eleitos.</div>
  <div className="pt-2 text-[22px] font-normal leading-snug text-neutral-700">Cresceu 18% desde 2020.</div>
  <div className="pt-1 text-[15px] font-normal text-neutral-500">Maior força em Bahia, Goiás e Tocantins.</div>
</div>`;

// ── A2 - Tesla industrial ───────────────────────────────────────────────────
function A2Tesla() {
  return (
    <div className="space-y-2" style={{ fontFamily: "Inter, 'Helvetica Neue', sans-serif" }}>
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">UNIÃO BRASIL HOJE</div>
      <div className="text-[64px] font-light leading-none tracking-[-0.015em] text-neutral-900">{FRASE_DESTAQUE}</div>
      <div className="pt-3 text-[20px] font-normal uppercase tracking-wide text-neutral-600">{FRASE_APOIO}</div>
      <div className="pt-1 text-[14px] font-normal tracking-wide text-neutral-500">{FRASE_SUB}</div>
    </div>
  );
}
const A2Source = `<div className="space-y-2" style={{ fontFamily: "Inter, 'Helvetica Neue', sans-serif" }}>
  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">UNIÃO BRASIL HOJE</div>
  <div className="text-[64px] font-light leading-none tracking-[-0.015em] text-neutral-900">União Brasil tem 412 prefeitos eleitos.</div>
  <div className="pt-3 text-[20px] font-normal uppercase tracking-wide text-neutral-600">Cresceu 18% desde 2020.</div>
  <div className="pt-1 text-[14px] font-normal tracking-wide text-neutral-500">Maior força em Bahia, Goiás e Tocantins.</div>
</div>`;

// ── A3 - Mazzel próprio ─────────────────────────────────────────────────────
function A3Mazzel() {
  return (
    <div className="space-y-1" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">União Brasil hoje</div>
      <div className="text-[48px] font-bold leading-[1.1] tracking-tight text-neutral-900">{FRASE_DESTAQUE}</div>
      <div className="pt-2 text-xl font-medium leading-snug text-neutral-700">{FRASE_APOIO}</div>
      <div className="pt-1 text-sm font-normal text-neutral-500">{FRASE_SUB}</div>
    </div>
  );
}
const A3Source = `<div className="space-y-1" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">União Brasil hoje</div>
  <div className="text-[48px] font-bold leading-[1.1] tracking-tight text-neutral-900">União Brasil tem 412 prefeitos eleitos.</div>
  <div className="pt-2 text-xl font-medium leading-snug text-neutral-700">Cresceu 18% desde 2020.</div>
  <div className="pt-1 text-sm font-normal text-neutral-500">Maior força em Bahia, Goiás e Tocantins.</div>
</div>`;

export const Section1Tipografia: Section = {
  id: "tipografia",
  letter: "A",
  title: "Tipografia",
  subtitle: "3 escalas de hierarquia tipográfica para o produto inteiro.",
  variants: [
    { code: "A1", name: "Apple HIG", description: "SF Pro Display, leve, generosa, tracking negativo nos títulos.", Component: A1Apple, source: A1Source },
    { code: "A2", name: "Tesla industrial", description: "Inter ultra-leve, uppercase, espaçamento de letras alto.", Component: A2Tesla, source: A2Source },
    { code: "A3", name: "Mazzel próprio", description: "Inter bold para títulos, hierarquia clássica de produto SaaS.", Component: A3Mazzel, source: A3Source },
  ],
};
