"use client";

/**
 * Seção 6 - Lista com partidos (logo + dado)
 */
import type { Section } from "../types";

// Top 5 partidos do Brasil em 2024 - dados reais do backend
const PARTIDOS = [
  { sigla: "MDB", numero: 15, eleitos: 9730, cor: "#00853F", nome: "Movimento Democrático Brasileiro" },
  { sigla: "PP",  numero: 11, eleitos: 8356, cor: "#073776", nome: "Progressistas" },
  { sigla: "PSD", numero: 55, eleitos: 8118, cor: "#F58220", nome: "Partido Social Democrático" },
  { sigla: "UB",  numero: 44, eleitos: 6556, cor: "#0033A0", nome: "União Brasil" },
  { sigla: "PL",  numero: 22, eleitos: 5976, cor: "#002F87", nome: "Partido Liberal" },
];

const MAX_ELEITOS = Math.max(...PARTIDOS.map((p) => p.eleitos));

// ── F1 - Logo pequeno + sigla + número, linha simples ───────────────────────
function F1() {
  return (
    <ul className="max-w-md divide-y divide-neutral-100 rounded-2xl bg-white ring-1 ring-neutral-200">
      {PARTIDOS.map((p) => (
        <li key={p.sigla} className="flex items-center gap-3 px-5 py-3">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: p.cor }} />
          <div className="flex-1">
            <div className="text-sm font-semibold text-neutral-900">{p.sigla}</div>
            <div className="text-xs text-neutral-500">#{p.numero}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-neutral-900">{p.eleitos.toLocaleString("pt-BR")}</div>
            <div className="text-xs text-neutral-400">eleitos</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
const F1Source = `<li className="flex items-center gap-3 px-5 py-3">
  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cor }} />
  <div className="flex-1">
    <div className="text-sm font-semibold">{sigla}</div>
    <div className="text-xs text-neutral-500">#{numero}</div>
  </div>
  <div className="text-sm font-semibold">{eleitos}</div>
</li>`;

// ── F2 - Logo + barra horizontal proporcional ───────────────────────────────
function F2() {
  return (
    <div className="max-w-lg space-y-3">
      {PARTIDOS.map((p) => (
        <div key={p.sigla}>
          <div className="mb-1 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-neutral-900">{p.sigla}</span>
              <span className="text-xs text-neutral-500">{p.nome}</span>
            </div>
            <span className="text-sm font-semibold text-neutral-900">{p.eleitos.toLocaleString("pt-BR")}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full"
              style={{ width: (p.eleitos / MAX_ELEITOS) * 100 + "%", backgroundColor: p.cor }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
const F2Source = `<div>
  <div className="flex items-baseline justify-between">
    <span className="text-sm font-semibold">{sigla}</span>
    <span className="text-sm font-semibold">{eleitos}</span>
  </div>
  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
    <div className="h-full rounded-full" style={{ width: pct + "%", backgroundColor: cor }} />
  </div>
</div>`;

// ── F3 - Cards quadrados com logo grande ────────────────────────────────────
function F3() {
  return (
    <div className="grid max-w-2xl grid-cols-5 gap-3">
      {PARTIDOS.map((p) => (
        <div key={p.sigla} className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200">
          <div
            className="flex aspect-square items-center justify-center text-3xl font-bold text-white"
            style={{ backgroundColor: p.cor }}
          >
            {p.sigla}
          </div>
          <div className="px-3 py-3 text-center">
            <div className="text-lg font-semibold text-neutral-900">{p.eleitos.toLocaleString("pt-BR")}</div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">eleitos</div>
          </div>
        </div>
      ))}
    </div>
  );
}
const F3Source = `<div className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200">
  <div className="flex aspect-square items-center justify-center text-3xl font-bold text-white" style={{ backgroundColor: cor }}>
    {sigla}
  </div>
  <div className="px-3 py-3 text-center">
    <div className="text-lg font-semibold">{eleitos}</div>
    <div className="text-[10px] uppercase">eleitos</div>
  </div>
</div>`;

// ── F4 - Lista com faixa lateral colorida ───────────────────────────────────
function F4() {
  return (
    <ul className="max-w-md space-y-2">
      {PARTIDOS.map((p) => (
        <li key={p.sigla} className="flex items-stretch overflow-hidden rounded-xl bg-white ring-1 ring-neutral-200">
          <div className="w-1.5" style={{ backgroundColor: p.cor }} />
          <div className="flex flex-1 items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-neutral-900">{p.sigla}</div>
              <div className="text-xs text-neutral-500">{p.nome}</div>
            </div>
            <div className="text-right">
              <div className="text-base font-semibold text-neutral-900">{p.eleitos.toLocaleString("pt-BR")}</div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">eleitos</div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
const F4Source = `<li className="flex items-stretch overflow-hidden rounded-xl bg-white ring-1 ring-neutral-200">
  <div className="w-1.5" style={{ backgroundColor: cor }} />
  <div className="flex flex-1 items-center gap-3 px-4 py-3">
    <div className="flex-1">
      <div className="text-sm font-semibold">{sigla}</div>
      <div className="text-xs text-neutral-500">{nome}</div>
    </div>
    <div className="text-right">
      <div className="text-base font-semibold">{eleitos}</div>
    </div>
  </div>
</li>`;

export const Section6Partidos: Section = {
  id: "partidos",
  letter: "F",
  title: "Lista de partidos",
  subtitle: "4 jeitos de listar partidos com cor oficial + número de eleitos.",
  variants: [
    { code: "F1", name: "Linha simples com bullet", description: "Bola colorida + sigla + número.", Component: F1, source: F1Source },
    { code: "F2", name: "Barra horizontal proporcional", description: "Sigla + barra de progresso colorida proporcional.", Component: F2, source: F2Source },
    { code: "F3", name: "Cards quadrados com logo", description: "Grid de cards com sigla grande dentro do card colorido.", Component: F3, source: F3Source },
    { code: "F4", name: "Faixa lateral colorida", description: "Lista com strip de cor à esquerda + nome completo.", Component: F4, source: F4Source },
  ],
};
