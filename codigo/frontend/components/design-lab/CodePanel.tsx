"use client";

/**
 * CodePanel - painel de código ao lado de cada variação.
 *
 * Mostra o JSX bruto da variação. Permite o usuário entender exatamente
 * o que está sendo renderizado e copiar/calibrar.
 */
import { useState } from "react";

interface CodePanelProps {
  source: string;
  defaultOpen?: boolean;
}

export function CodePanel({ source, defaultOpen = false }: CodePanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(source).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50">
      <header className="flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
        >
          <svg
            className={"h-3 w-3 transition-transform " + (open ? "rotate-90" : "")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Código JSX
        </button>
        {open && (
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
        )}
      </header>
      {open && (
        <pre className="overflow-x-auto border-t border-neutral-200 bg-white px-4 py-3 text-[11px] leading-relaxed text-neutral-800">
          <code>{source}</code>
        </pre>
      )}
    </div>
  );
}
