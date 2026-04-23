"use client";

/**
 * Coroa de louros (laurel) em volta do Overall da carta politica.
 *
 * Aparece apenas quando o politico foi eleito na candidatura atual (props.ativo).
 * Cor do laurel segue o tier (dourado/ouro/prata/bronze).
 *
 * SVG inline (zero requests). Monochrome + stroke. Low-latency by design.
 */

const CORES = {
  dourado: "#d4a84b",
  ouro:    "#eab308",
  prata:   "#9ca3af",
  bronze:  "#b87333",
};

export function Laurel({ tier = "dourado", ativo = true, className = "" }) {
  if (!ativo) return null;
  const cor = CORES[tier] ?? CORES.dourado;

  return (
    <svg
      viewBox="0 0 140 140"
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      fill="none"
      stroke={cor}
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* folha esquerda */}
      <g>
        <ellipse cx="32"  cy="50"  rx="4" ry="9" transform="rotate(-40 32 50)"/>
        <ellipse cx="28"  cy="62"  rx="4" ry="9" transform="rotate(-25 28 62)"/>
        <ellipse cx="27"  cy="75"  rx="4" ry="9" transform="rotate(-10 27 75)"/>
        <ellipse cx="30"  cy="88"  rx="4" ry="9" transform="rotate(10 30 88)"/>
        <ellipse cx="38"  cy="100" rx="4" ry="9" transform="rotate(30 38 100)"/>
        <path d="M 35 45 Q 25 70, 45 108" />
      </g>
      {/* folha direita (espelho) */}
      <g>
        <ellipse cx="108" cy="50"  rx="4" ry="9" transform="rotate(40 108 50)"/>
        <ellipse cx="112" cy="62"  rx="4" ry="9" transform="rotate(25 112 62)"/>
        <ellipse cx="113" cy="75"  rx="4" ry="9" transform="rotate(10 113 75)"/>
        <ellipse cx="110" cy="88"  rx="4" ry="9" transform="rotate(-10 110 88)"/>
        <ellipse cx="102" cy="100" rx="4" ry="9" transform="rotate(-30 102 100)"/>
        <path d="M 105 45 Q 115 70, 95 108" />
      </g>
    </svg>
  );
}
