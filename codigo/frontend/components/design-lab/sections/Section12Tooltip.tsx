"use client";

/**
 * Seção 12 - Tooltip / Hover sobre estado
 */
import type { Section } from "../types";

// ── L1 - Card flutuante mínimo ──────────────────────────────────────────────
function L1() {
  return (
    <div className="relative h-40 w-72 rounded-2xl bg-neutral-100">
      <div className="absolute left-12 top-12 rounded-xl bg-neutral-900 px-4 py-3 text-white shadow-2xl">
        <div className="text-xs text-neutral-400">São Paulo</div>
        <div className="mt-0.5 text-sm font-semibold">PSD domina</div>
        <div className="mt-1 text-xs text-neutral-300">28 prefeitos UB · 4º lugar</div>
      </div>
    </div>
  );
}
const L1Source = `<div className="absolute rounded-xl bg-neutral-900 px-4 py-3 text-white shadow-2xl">
  <div className="text-xs text-neutral-400">{nome}</div>
  <div className="text-sm font-semibold">{partido_dominante} domina</div>
  <div className="text-xs text-neutral-300">{eleitos_cliente} prefeitos UB</div>
</div>`;

// ── L2 - Card grande com KPI + sigla + foto ─────────────────────────────────
function L2() {
  return (
    <div className="relative h-60 w-96 rounded-2xl bg-neutral-100">
      <div className="absolute left-12 top-12 w-72 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-neutral-200">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full text-white font-bold" style={{ backgroundColor: "#F58220" }}>SP</div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">São Paulo</div>
            <div className="text-xs text-neutral-500">Dominado por PSD</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-2xl font-semibold text-neutral-900">723</div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">UB eleitos</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-neutral-900">4º</div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">posição</div>
          </div>
        </div>
        <button className="mt-3 w-full rounded-full bg-neutral-900 py-2 text-xs font-medium text-white">Ver dossiê</button>
      </div>
    </div>
  );
}
const L2Source = `<div className="absolute w-72 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-neutral-200">
  <div className="flex items-center gap-3">
    <Badge sigla="SP" cor={partido_dominante.cor} />
    <div>
      <div className="text-sm font-semibold">{nome}</div>
      <div className="text-xs text-neutral-500">Dominado por {partido}</div>
    </div>
  </div>
  <div className="grid grid-cols-2 gap-3">
    <KPI value={eleitos} label="UB eleitos" />
    <KPI value={posicao} label="posição" />
  </div>
  <button>Ver dossiê</button>
</div>`;

// ── L3 - Tooltip nativo discreto ────────────────────────────────────────────
function L3() {
  return (
    <div className="relative h-40 w-72 rounded-2xl bg-neutral-100">
      <div className="absolute left-12 top-12 rounded-md bg-neutral-900 px-2 py-1 text-xs text-white">
        SP · PSD · 723 UB
      </div>
    </div>
  );
}
const L3Source = `<div className="absolute rounded-md bg-neutral-900 px-2 py-1 text-xs text-white">
  {uf} · {partido} · {eleitos} UB
</div>`;

// ── L4 - Preview lateral compacto ───────────────────────────────────────────
function L4() {
  return (
    <div className="relative flex h-60 w-[480px] rounded-2xl bg-neutral-100">
      <div className="flex-1" />
      <div className="w-56 rounded-r-2xl bg-white p-4 shadow-xl ring-1 ring-neutral-200">
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Hover</div>
        <div className="mt-1 text-lg font-semibold text-neutral-900">São Paulo</div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">Dominante</span>
            <span className="font-semibold text-neutral-900">PSD</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">UB eleitos</span>
            <span className="font-semibold text-neutral-900">723</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">Posição</span>
            <span className="font-semibold text-neutral-900">4º</span>
          </div>
        </div>
      </div>
    </div>
  );
}
const L4Source = `// Preview lateral - sidebar compacta substitui o tooltip
<div className="w-56 rounded-r-2xl bg-white p-4 shadow-xl ring-1 ring-neutral-200">
  <div className="text-xs uppercase tracking-wider text-neutral-500">Hover</div>
  <div className="text-lg font-semibold">{nome}</div>
  <KPIRow label="Dominante" value={partido} />
  <KPIRow label="UB eleitos" value={eleitos} />
</div>`;

export const Section12Tooltip: Section = {
  id: "tooltip",
  letter: "L",
  title: "Tooltip / Hover sobre estado",
  subtitle: "4 jeitos de mostrar info quando o usuário passa o mouse num estado.",
  variants: [
    { code: "L1", name: "Card flutuante mínimo", description: "Card escuro pequeno com 3 linhas.", Component: L1, source: L1Source },
    { code: "L2", name: "Card grande com KPIs + ação", description: "Card branco completo, KPIs e botão.", Component: L2, source: L2Source },
    { code: "L3", name: "Tooltip nativo discreto", description: "Linha única, mínima.", Component: L3, source: L3Source },
    { code: "L4", name: "Preview lateral compacto", description: "Sidebar compacta substitui o tooltip.", Component: L4, source: L4Source },
  ],
};
