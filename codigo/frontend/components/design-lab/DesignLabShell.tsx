"use client";

/**
 * DesignLabShell - layout principal do Design Lab.
 *
 * Estrutura:
 *   ┌─────────────────────────────────────────────┐
 *   │ Header (logo + título)                      │
 *   ├──────────┬──────────────────────────────────┤
 *   │ Sidebar  │ Conteúdo da seção atual          │
 *   │ (12      │  (cada variação com render +     │
 *   │  seções) │   painel de código colapsável)   │
 *   └──────────┴──────────────────────────────────┘
 *
 * O usuário navega pelas seções na sidebar esquerda. A área principal mostra
 * todas as variações da seção atual, com nome, descrição, render e código.
 */
import { useState } from "react";

import type { Section } from "./types";
import { CodePanel } from "./CodePanel";

interface DesignLabShellProps {
  sections: Section[];
}

export function DesignLabShell({ sections }: DesignLabShellProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const active = sections.find((s) => s.id === activeId) ?? sections[0];

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold tracking-tight">Design Lab</h1>
            <span className="text-sm text-neutral-500">
              Mazzel · Plataforma de Inteligência Eleitoral
            </span>
          </div>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-neutral-200 bg-neutral-50">
          <nav className="sticky top-[72px] space-y-1 px-3 py-6">
            {sections.map((s) => {
              const isActive = s.id === active?.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className={
                    "block w-full rounded-lg px-3 py-2.5 text-left transition " +
                    (isActive
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-700 hover:bg-neutral-200/60")
                  }
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className={
                        "text-[10px] font-bold uppercase tracking-wider " +
                        (isActive ? "text-neutral-300" : "text-neutral-400")
                      }
                    >
                      {s.letter}
                    </span>
                    <span className="text-sm font-medium">{s.title}</span>
                  </div>
                  <div
                    className={
                      "mt-0.5 text-xs " +
                      (isActive ? "text-neutral-400" : "text-neutral-500")
                    }
                  >
                    {s.variants.length} variações
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-x-auto px-10 py-8">
          {active && (
            <>
              <header className="mb-8">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Seção {active.letter}
                </div>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight">
                  {active.title}
                </h2>
                <p className="mt-2 text-base text-neutral-600">
                  {active.subtitle}
                </p>
              </header>

              <div className="space-y-12">
                {active.variants.map((v) => (
                  <article key={v.code} className="space-y-4">
                    {/* Cabeçalho da variação */}
                    <header className="flex items-baseline gap-4">
                      <span className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-bold text-white">
                        {v.code}
                      </span>
                      <h3 className="text-lg font-medium text-neutral-900">
                        {v.name}
                      </h3>
                      <span className="text-sm text-neutral-500">
                        {v.description}
                      </span>
                    </header>

                    {/* Render */}
                    <div className="rounded-2xl border border-neutral-200 bg-white p-8">
                      <v.Component />
                    </div>

                    {/* Painel de código */}
                    <CodePanel source={v.source} />
                  </article>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
