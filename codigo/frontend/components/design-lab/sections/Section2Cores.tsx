"use client";

/**
 * Seção 2 - Paletas de cor
 */
import type { Section } from "../types";

interface SwatchProps {
  label: string;
  hex: string;
  textWhite?: boolean;
}
function Swatch({ label, hex, textWhite }: SwatchProps) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-20 rounded-2xl"
        style={{ backgroundColor: hex }}
      />
      <div className="px-1">
        <div className="text-sm font-medium text-neutral-900">{label}</div>
        <div className="text-xs text-neutral-500">{hex}</div>
      </div>
    </div>
  );
}

// ── B1 - Light Apple ────────────────────────────────────────────────────────
function B1Light() {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Neutros</div>
        <div className="grid grid-cols-6 gap-3">
          <Swatch label="Background" hex="#FFFFFF" />
          <Swatch label="Surface" hex="#F8FAFC" />
          <Swatch label="Border" hex="#E5E7EB" />
          <Swatch label="Muted" hex="#9CA3AF" />
          <Swatch label="Body" hex="#374151" />
          <Swatch label="Heading" hex="#0F172A" />
        </div>
      </div>
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Acento</div>
        <div className="grid grid-cols-6 gap-3">
          <Swatch label="Primary" hex="#0033A0" />
          <Swatch label="Primary Soft" hex="#E0E9F8" />
          <Swatch label="Success" hex="#15803D" />
          <Swatch label="Warning" hex="#F59E0B" />
          <Swatch label="Danger" hex="#B91C1C" />
          <Swatch label="Highlight" hex="#FFCC00" />
        </div>
      </div>
      <div className="rounded-2xl bg-white p-8 text-neutral-900 shadow-sm ring-1 ring-neutral-200">
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Aplicação</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight">412 prefeitos eleitos</div>
        <div className="mt-1 text-base text-neutral-600">Cresceu 18% desde 2020.</div>
        <button className="mt-5 rounded-full bg-[#0033A0] px-6 py-2.5 text-sm font-medium text-white">Ver no mapa</button>
      </div>
    </div>
  );
}
const B1Source = `// Background #FFFFFF | Surface #F8FAFC | Body #374151 | Heading #0F172A
// Primary #0033A0 | Success #15803D | Danger #B91C1C
<div className="rounded-2xl bg-white p-8 ring-1 ring-neutral-200 shadow-sm">
  <div className="text-3xl font-semibold tracking-tight text-neutral-900">412 prefeitos eleitos</div>
  <div className="mt-1 text-neutral-600">Cresceu 18% desde 2020.</div>
  <button className="mt-5 rounded-full bg-[#0033A0] px-6 py-2.5 text-white">Ver no mapa</button>
</div>`;

// ── B2 - Dark Tesla ─────────────────────────────────────────────────────────
function B2Dark() {
  return (
    <div className="space-y-6 rounded-2xl bg-neutral-950 p-6 -m-2">
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Neutros (dark)</div>
        <div className="grid grid-cols-6 gap-3">
          <Swatch label="Background" hex="#0A0A0A" />
          <Swatch label="Surface" hex="#171717" />
          <Swatch label="Elevated" hex="#262626" />
          <Swatch label="Border" hex="#404040" />
          <Swatch label="Body" hex="#D4D4D8" />
          <Swatch label="Heading" hex="#FAFAFA" />
        </div>
      </div>
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Acento</div>
        <div className="grid grid-cols-6 gap-3">
          <Swatch label="Primary" hex="#3B82F6" />
          <Swatch label="Primary Glow" hex="#1E3A8A" />
          <Swatch label="Success" hex="#22C55E" />
          <Swatch label="Warning" hex="#FACC15" />
          <Swatch label="Danger" hex="#EF4444" />
          <Swatch label="Highlight" hex="#FFCC00" />
        </div>
      </div>
      <div className="rounded-2xl bg-neutral-900 p-8 ring-1 ring-neutral-800">
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Aplicação</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-white">412 prefeitos eleitos</div>
        <div className="mt-1 text-base text-neutral-400">Cresceu 18% desde 2020.</div>
        <button className="mt-5 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-neutral-900">Ver no mapa</button>
      </div>
    </div>
  );
}
const B2Source = `// Background #0A0A0A | Surface #171717 | Body #D4D4D8 | Heading #FAFAFA
// Primary #3B82F6 | Glow #1E3A8A
<div className="rounded-2xl bg-neutral-900 p-8 ring-1 ring-neutral-800">
  <div className="text-3xl font-semibold tracking-tight text-white">412 prefeitos eleitos</div>
  <div className="mt-1 text-neutral-400">Cresceu 18% desde 2020.</div>
  <button className="mt-5 rounded-full bg-white px-6 py-2.5 text-neutral-900">Ver no mapa</button>
</div>`;

// ── B3 - Bicolor com partido ────────────────────────────────────────────────
function B3Bicolor() {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Neutros</div>
        <div className="grid grid-cols-4 gap-3">
          <Swatch label="Background" hex="#FFFFFF" />
          <Swatch label="Surface" hex="#FAFAFA" />
          <Swatch label="Body" hex="#525252" />
          <Swatch label="Heading" hex="#171717" />
        </div>
      </div>
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Identidade do partido (UB)</div>
        <div className="grid grid-cols-4 gap-3">
          <Swatch label="UB Azul" hex="#0033A0" />
          <Swatch label="UB Amarelo" hex="#FFCC00" />
          <Swatch label="UB Azul soft" hex="#D6E0F4" />
          <Swatch label="UB Amarelo soft" hex="#FFF6CC" />
        </div>
      </div>
      <div className="rounded-2xl bg-white p-8 ring-1 ring-neutral-200">
        <div className="flex items-baseline gap-3">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#0033A0" }} />
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">União Brasil</div>
        </div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">412 prefeitos</div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full w-[72%] rounded-full" style={{ backgroundColor: "#0033A0" }} />
        </div>
        <button className="mt-5 rounded-full px-6 py-2.5 text-sm font-medium text-neutral-900" style={{ backgroundColor: "#FFCC00" }}>
          Ver no mapa
        </button>
      </div>
    </div>
  );
}
const B3Source = `// Identidade do tenant carrega cores do partido
<div className="rounded-2xl bg-white p-8 ring-1 ring-neutral-200">
  <div className="flex items-baseline gap-3">
    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#0033A0" }} />
    <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">União Brasil</div>
  </div>
  <div className="text-3xl font-semibold text-neutral-900">412 prefeitos</div>
  <button className="rounded-full px-6 py-2.5 text-neutral-900" style={{ backgroundColor: "#FFCC00" }}>
    Ver no mapa
  </button>
</div>`;

export const Section2Cores: Section = {
  id: "cores",
  letter: "B",
  title: "Paletas de cor",
  subtitle: "3 paletas: Light Apple, Dark Tesla e Bicolor com identidade do partido.",
  variants: [
    { code: "B1", name: "Light Apple", description: "Branco dominante, neutros frios, 1 acento azul.", Component: B1Light, source: B1Source },
    { code: "B2", name: "Dark Tesla", description: "Preto/grafite dominante, contraste alto, glow azul.", Component: B2Dark, source: B2Source },
    { code: "B3", name: "Bicolor partido", description: "Neutros + 2 cores oficiais do partido cliente.", Component: B3Bicolor, source: B3Source },
  ],
};
