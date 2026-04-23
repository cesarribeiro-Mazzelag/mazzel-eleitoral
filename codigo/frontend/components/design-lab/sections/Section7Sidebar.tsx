"use client";

/**
 * Seção 7 - Sidebar narradora (4 variações completas)
 */
import type { Section } from "../types";

// ── G1 - Hero: 1 número gigante + 1 frase + 1 ação ──────────────────────────
function G1() {
  return (
    <aside className="flex h-[520px] w-80 flex-col bg-white ring-1 ring-neutral-200">
      <div className="px-7 pt-8">
        <div className="flex items-baseline gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#0033A0" }} />
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">União Brasil</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center px-7">
        <div className="text-[80px] font-semibold leading-none tracking-tight text-neutral-900">412</div>
        <div className="mt-2 text-base text-neutral-600">prefeitos eleitos em 2024.</div>
        <div className="mt-1 text-base text-neutral-600">Cresceu 18% desde 2020.</div>
      </div>
      <div className="px-7 pb-7">
        <button className="w-full rounded-full bg-neutral-900 px-6 py-4 text-base font-medium text-white">
          Ver onde estamos fortes
        </button>
      </div>
    </aside>
  );
}
const G1Source = `<aside className="flex h-full w-80 flex-col bg-white ring-1 ring-neutral-200">
  <div className="px-7 pt-8 text-xs uppercase tracking-wider text-neutral-500">União Brasil</div>
  <div className="flex flex-1 flex-col justify-center px-7">
    <div className="text-[80px] font-semibold leading-none tracking-tight">412</div>
    <div className="text-base text-neutral-600">prefeitos eleitos em 2024.</div>
  </div>
  <div className="px-7 pb-7">
    <button className="w-full rounded-full bg-neutral-900 px-6 py-4 text-white">
      Ver onde estamos fortes
    </button>
  </div>
</aside>`;

// ── G2 - Stack vertical com KPIs ────────────────────────────────────────────
function G2() {
  return (
    <aside className="flex h-[520px] w-80 flex-col overflow-y-auto bg-white ring-1 ring-neutral-200">
      <header className="border-b border-neutral-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full text-white font-bold" style={{ backgroundColor: "#0033A0" }}>UB</div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">União Brasil</div>
            <div className="text-xs text-neutral-500">Visão 2024</div>
          </div>
        </div>
      </header>
      <div className="space-y-5 px-6 py-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">Prefeitos eleitos</div>
          <div className="text-3xl font-semibold tracking-tight text-neutral-900">412</div>
          <div className="text-xs text-emerald-700">+18% vs 2020</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">Estados onde domina</div>
          <div className="text-3xl font-semibold tracking-tight text-neutral-900">5</div>
          <div className="text-xs text-neutral-400">de 27</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">Maior força</div>
          <div className="text-base font-semibold text-neutral-900">Bahia, Goiás, Tocantins</div>
        </div>
      </div>
      <div className="mt-auto border-t border-neutral-100 px-6 py-4">
        <button className="w-full rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white">Ver onde estamos fortes</button>
      </div>
    </aside>
  );
}
const G2Source = `<aside className="flex h-full w-80 flex-col bg-white ring-1 ring-neutral-200">
  <header className="border-b border-neutral-100 px-6 py-5">
    <div className="flex items-center gap-3">
      <Avatar /> <div><div>União Brasil</div><div>Visão 2024</div></div>
    </div>
  </header>
  <div className="space-y-5 px-6 py-5">
    <div>
      <div className="text-xs uppercase tracking-wider text-neutral-500">Prefeitos eleitos</div>
      <div className="text-3xl font-semibold">412</div>
      <div className="text-xs text-emerald-700">+18% vs 2020</div>
    </div>
    {/* mais KPIs */}
  </div>
</aside>`;

// ── G3 - Cartões empilhados ─────────────────────────────────────────────────
function G3() {
  return (
    <aside className="flex h-[520px] w-80 flex-col gap-3 bg-neutral-50 p-4">
      <div className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
        <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">União Brasil hoje</div>
        <div className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">412 prefeitos</div>
        <div className="text-sm text-emerald-700">+18% vs 2020</div>
      </div>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
        <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">Maior força</div>
        <div className="mt-1 text-base font-medium text-neutral-900">Bahia · Goiás · Tocantins</div>
      </div>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
        <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">Maior risco</div>
        <div className="mt-1 text-base font-medium text-neutral-900">Mato Grosso (-3 cadeiras)</div>
      </div>
      <div className="mt-auto rounded-2xl bg-neutral-900 p-5 text-white">
        <div className="text-xs font-medium uppercase tracking-wider text-neutral-400">Próxima ação</div>
        <button className="mt-2 text-base font-medium underline-offset-4 hover:underline">Ver onde estamos fortes →</button>
      </div>
    </aside>
  );
}
const G3Source = `<aside className="flex h-full w-80 flex-col gap-3 bg-neutral-50 p-4">
  <div className="rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
    <div className="text-xs uppercase tracking-wider text-neutral-500">União Brasil hoje</div>
    <div className="text-2xl font-semibold">412 prefeitos</div>
  </div>
  {/* mais cartões */}
</aside>`;

// ── G4 - Card de relatório clássico ─────────────────────────────────────────
function G4() {
  return (
    <aside className="flex h-[520px] w-80 flex-col bg-white ring-1 ring-neutral-200">
      <div className="border-b border-neutral-100 px-6 py-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">RELATÓRIO 2024</div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">União Brasil</h2>
      </div>
      <div className="px-6 py-5">
        <p className="text-sm leading-relaxed text-neutral-700">
          O União Brasil elegeu <strong>412 prefeitos</strong> nas eleições de 2024, um crescimento de <strong className="text-emerald-700">18%</strong> em relação ao ciclo anterior.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-neutral-700">
          A maior força concentra-se em <strong>Bahia</strong>, <strong>Goiás</strong> e <strong>Tocantins</strong>. Em 5 estados o partido tem dominância.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-neutral-700">
          Maior risco identificado em <strong>Mato Grosso</strong>, com perda de 3 cadeiras desde 2020.
        </p>
      </div>
      <div className="mt-auto border-t border-neutral-100 px-6 py-4">
        <a href="#" className="text-sm font-medium text-neutral-900 underline underline-offset-4">Continuar lendo →</a>
      </div>
    </aside>
  );
}
const G4Source = `<aside className="flex h-full w-80 flex-col bg-white ring-1 ring-neutral-200">
  <div className="border-b border-neutral-100 px-6 py-5">
    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">RELATÓRIO 2024</div>
    <h2 className="mt-1 text-xl font-semibold">União Brasil</h2>
  </div>
  <div className="px-6 py-5">
    <p className="text-sm leading-relaxed text-neutral-700">
      O União Brasil elegeu <strong>412 prefeitos</strong>...
    </p>
  </div>
</aside>`;

export const Section7Sidebar: Section = {
  id: "sidebar",
  letter: "G",
  title: "Sidebar narradora",
  subtitle: "4 jeitos de a sidebar contar a história - do hero minimalista ao relatório de jornal.",
  variants: [
    { code: "G1", name: "Hero gigante", description: "Um número enorme + frase + uma única ação. Apple puro.", Component: G1, source: G1Source },
    { code: "G2", name: "Stack de KPIs", description: "Header + 3 KPIs empilhados + ação no rodapé.", Component: G2, source: G2Source },
    { code: "G3", name: "Cartões empilhados", description: "Cada informação num card separado, fundo cinza claro.", Component: G3, source: G3Source },
    { code: "G4", name: "Relatório de jornal", description: "Texto corrido com dados em negrito - estilo análise.", Component: G4, source: G4Source },
  ],
};
