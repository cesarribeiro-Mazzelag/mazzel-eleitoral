"use client";

/**
 * Seção 5 - Lista com pessoas (foto + nome + dado)
 */
import type { Section } from "../types";

const PESSOAS = [
  { nome: "Lucas Pavanotto", cargo: "Vereador", local: "Freguesia do Ó", votos: 8247, sigla: "UB" },
  { nome: "Milton Leite",     cargo: "Vereador", local: "São Paulo",      votos: 21450, sigla: "UB" },
  { nome: "Dario Saadi",      cargo: "Prefeito", local: "Campinas",       votos: 195320, sigla: "UB" },
  { nome: "Orlando Morando",  cargo: "Prefeito", local: "São Bernardo",   votos: 156823, sigla: "UB" },
  { nome: "Rodrigo Manga",    cargo: "Prefeito", local: "Sorocaba",       votos: 174905, sigla: "UB" },
];

function Avatar({ size = 40, label = "?" }: { size?: number; label?: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-full bg-neutral-200 text-neutral-600"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {label.substring(0, 2)}
    </div>
  );
}

// ── E1 - Avatar circular pequeno + nome + dado à direita ────────────────────
function E1() {
  return (
    <ul className="max-w-md divide-y divide-neutral-100 rounded-2xl bg-white ring-1 ring-neutral-200">
      {PESSOAS.map((p) => (
        <li key={p.nome} className="flex items-center gap-3 px-5 py-3.5">
          <Avatar size={40} label={p.nome[0]} />
          <div className="flex-1">
            <div className="text-sm font-medium text-neutral-900">{p.nome}</div>
            <div className="text-xs text-neutral-500">{p.cargo} · {p.local}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-neutral-900">{p.votos.toLocaleString("pt-BR")}</div>
            <div className="text-xs text-neutral-400">votos</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
const E1Source = `<li className="flex items-center gap-3 px-5 py-3.5">
  <Avatar size={40} />
  <div className="flex-1">
    <div className="text-sm font-medium">{nome}</div>
    <div className="text-xs text-neutral-500">{cargo} · {local}</div>
  </div>
  <div className="text-right">
    <div className="text-sm font-semibold">{votos}</div>
    <div className="text-xs text-neutral-400">votos</div>
  </div>
</li>`;

// ── E2 - Foto retangular grande estilo card de filme ────────────────────────
function E2() {
  return (
    <div className="grid max-w-2xl grid-cols-3 gap-4">
      {PESSOAS.slice(0, 3).map((p) => (
        <div key={p.nome} className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200">
          <div className="aspect-[3/4] bg-gradient-to-b from-neutral-200 to-neutral-300" />
          <div className="p-4">
            <div className="text-base font-semibold text-neutral-900">{p.nome}</div>
            <div className="text-xs text-neutral-500">{p.cargo} · {p.local}</div>
            <div className="mt-3 text-2xl font-semibold text-neutral-900">{p.votos.toLocaleString("pt-BR")}</div>
            <div className="text-xs uppercase tracking-wider text-neutral-400">votos</div>
          </div>
        </div>
      ))}
    </div>
  );
}
const E2Source = `<div className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200">
  <div className="aspect-[3/4] bg-neutral-200" /> {/* foto */}
  <div className="p-4">
    <div className="text-base font-semibold">{nome}</div>
    <div className="text-xs text-neutral-500">{cargo} · {local}</div>
    <div className="mt-3 text-2xl font-semibold">{votos}</div>
  </div>
</div>`;

// ── E3 - Estilo iMessage (avatar + 2 linhas) ────────────────────────────────
function E3() {
  return (
    <div className="max-w-md space-y-3">
      {PESSOAS.map((p) => (
        <div key={p.nome} className="flex items-start gap-3">
          <Avatar size={48} label={p.nome[0]} />
          <div className="flex-1 rounded-2xl rounded-tl-md bg-neutral-100 px-4 py-2.5">
            <div className="text-sm font-semibold text-neutral-900">{p.nome}</div>
            <div className="mt-0.5 text-sm text-neutral-700">
              {p.votos.toLocaleString("pt-BR")} votos em {p.local}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
const E3Source = `<div className="flex items-start gap-3">
  <Avatar size={48} />
  <div className="flex-1 rounded-2xl rounded-tl-md bg-neutral-100 px-4 py-2.5">
    <div className="text-sm font-semibold">{nome}</div>
    <div className="text-sm text-neutral-700">{votos} votos em {local}</div>
  </div>
</div>`;

// ── E4 - Ranking numerado ───────────────────────────────────────────────────
function E4() {
  return (
    <ol className="max-w-md space-y-1 rounded-2xl bg-white p-2 ring-1 ring-neutral-200">
      {PESSOAS.map((p, idx) => (
        <li key={p.nome} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-neutral-50">
          <span className="w-6 text-right text-sm font-bold text-neutral-300">{idx + 1}</span>
          <Avatar size={36} label={p.nome[0]} />
          <div className="flex-1">
            <div className="text-sm font-medium text-neutral-900">{p.nome}</div>
            <div className="text-xs text-neutral-500">{p.local}</div>
          </div>
          <div className="text-sm font-semibold text-neutral-900">{p.votos.toLocaleString("pt-BR")}</div>
        </li>
      ))}
    </ol>
  );
}
const E4Source = `<li className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-neutral-50">
  <span className="w-6 text-right text-sm font-bold text-neutral-300">{idx+1}</span>
  <Avatar size={36} />
  <div className="flex-1">
    <div className="text-sm font-medium">{nome}</div>
    <div className="text-xs text-neutral-500">{local}</div>
  </div>
  <div className="text-sm font-semibold">{votos}</div>
</li>`;

// ── E5 - Grid de fotos quadradas ────────────────────────────────────────────
function E5() {
  return (
    <div className="grid max-w-md grid-cols-4 gap-3">
      {PESSOAS.map((p) => (
        <div key={p.nome} className="text-center">
          <div className="aspect-square overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-200 to-neutral-300" />
          <div className="mt-2 truncate text-xs font-medium text-neutral-900">{p.nome.split(" ")[0]}</div>
          <div className="text-[10px] text-neutral-500">{(p.votos / 1000).toFixed(0)}k votos</div>
        </div>
      ))}
    </div>
  );
}
const E5Source = `<div className="text-center">
  <div className="aspect-square overflow-hidden rounded-2xl bg-neutral-200" />
  <div className="mt-2 text-xs font-medium">{nome}</div>
  <div className="text-[10px] text-neutral-500">{votos} votos</div>
</div>`;

export const Section5Pessoas: Section = {
  id: "pessoas",
  letter: "E",
  title: "Lista com pessoas",
  subtitle: "5 jeitos de mostrar pessoas (políticos, líderes, cabos eleitorais) com foto + nome + dado.",
  variants: [
    { code: "E1", name: "Linha simples", description: "Avatar pequeno + 2 linhas + dado à direita.", Component: E1, source: E1Source },
    { code: "E2", name: "Card grande estilo filme", description: "Foto retangular grande + nome + KPI embaixo.", Component: E2, source: E2Source },
    { code: "E3", name: "Estilo iMessage", description: "Avatar + balão de mensagem com texto.", Component: E3, source: E3Source },
    { code: "E4", name: "Ranking numerado", description: "Lista numerada (top 5/10) com posição.", Component: E4, source: E4Source },
    { code: "E5", name: "Grid de fotos", description: "Grade quadrada compacta - panorama visual rápido.", Component: E5, source: E5Source },
  ],
};
