"use client";

/**
 * Insignias militares por cargo politico - identidade visual unica da carta.
 *
 * 8 cargos, metais por hierarquia:
 *   OURO:   Presidente, Governador, Prefeito
 *   PRATA:  Senador, Dep. Federal
 *   BRONZE: Vice-Prefeito, Dep. Estadual, Vereador
 *
 * Estados (prop `estado`):
 *   - "atual":     cor cheia, destaque (ocupando o cargo agora)
 *   - "anterior":  sepia/opacity reduzida (ja ocupou no passado)
 *   - "disputou":  contorno tracejado (disputou sem vencer)
 *
 * SVG inline, zero requests, reutilizavel em qualquer lugar.
 */

const METAIS = {
  ouro:   "#d4a84b",
  prata:  "#6b7280",
  bronze: "#b87333",
};

// Normaliza string de cargo para chave do map abaixo.
function chaveCargo(cargo) {
  const c = (cargo || "").toUpperCase().trim();
  if (c === "PRESIDENTE")        return "PRESIDENTE";
  if (c === "GOVERNADOR")        return "GOVERNADOR";
  if (c === "PREFEITO")          return "PREFEITO";
  if (c === "VICE-PREFEITO" || c === "VICE PREFEITO") return "VICE_PREFEITO";
  if (c === "SENADOR")           return "SENADOR";
  if (c === "DEPUTADO FEDERAL")  return "DEP_FEDERAL";
  if (c === "DEPUTADO ESTADUAL" || c === "DEPUTADO DISTRITAL") return "DEP_ESTADUAL";
  if (c === "VEREADOR")          return "VEREADOR";
  return null;
}

const METAL_POR_CARGO = {
  PRESIDENTE:    "ouro",
  GOVERNADOR:    "ouro",
  PREFEITO:      "ouro",
  SENADOR:       "prata",
  DEP_FEDERAL:   "prata",
  VICE_PREFEITO: "bronze",
  DEP_ESTADUAL:  "bronze",
  VEREADOR:      "bronze",
};

// ──────────────────────────────────────────────────────────────────────────────
// SVGs por cargo. Cada retorna <g> com path que usa currentColor pro metal.
// ──────────────────────────────────────────────────────────────────────────────

const PATHS = {
  PRESIDENTE: (
    <g>
      {/* Louros laterais */}
      <g fill="currentColor" opacity="0.9">
        <ellipse cx="20" cy="38" rx="3" ry="7" transform="rotate(-35 20 38)"/>
        <ellipse cx="17" cy="50" rx="3" ry="7" transform="rotate(-15 17 50)"/>
        <ellipse cx="20" cy="62" rx="3" ry="7" transform="rotate(15 20 62)"/>
        <ellipse cx="76" cy="38" rx="3" ry="7" transform="rotate(35 76 38)"/>
        <ellipse cx="79" cy="50" rx="3" ry="7" transform="rotate(15 79 50)"/>
        <ellipse cx="76" cy="62" rx="3" ry="7" transform="rotate(-15 76 62)"/>
      </g>
      <circle cx="48" cy="48" r="22" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="48" cy="48" r="18" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
      <path d="M 48 36 L 51 44 L 60 44 L 53 50 L 56 58 L 48 53 L 40 58 L 43 50 L 36 44 L 45 44 Z" fill="currentColor"/>
      <path d="M 35 68 L 40 82 L 48 76 L 56 82 L 61 68" fill="currentColor" opacity="0.7"/>
    </g>
  ),

  GOVERNADOR: (
    <g>
      <path d="M 48 20 L 68 28 L 68 54 Q 68 72, 48 80 Q 28 72, 28 54 L 28 28 Z" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M 48 24 L 64 31 L 64 54 Q 64 68, 48 75 Q 32 68, 32 54 L 32 31 Z" fill="currentColor" opacity="0.15"/>
      <path d="M 48 38 L 51 46 L 59 46 L 53 52 L 55 60 L 48 55 L 41 60 L 43 52 L 37 46 L 45 46 Z" fill="currentColor"/>
      <line x1="36" y1="67" x2="60" y2="67" stroke="currentColor" strokeWidth="1.5"/>
    </g>
  ),

  PREFEITO: (
    <g>
      {/* Coroa mural */}
      <path d="M 26 28 L 26 22 L 32 22 L 32 26 L 38 26 L 38 22 L 44 22 L 44 26 L 52 26 L 52 22 L 58 22 L 58 26 L 64 26 L 64 22 L 70 22 L 70 28 L 26 28 Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="26" y="28" width="44" height="3" fill="currentColor" opacity="0.3"/>
      <circle cx="48" cy="54" r="18" fill="none" stroke="currentColor" strokeWidth="2"/>
      <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M 38 46 L 56 64"/>
        <path d="M 58 46 L 40 64"/>
        <circle cx="38" cy="46" r="2.5" fill="currentColor"/>
        <circle cx="58" cy="46" r="2.5" fill="currentColor"/>
      </g>
    </g>
  ),

  VICE_PREFEITO: (
    <g>
      <path d="M 32 30 L 32 24 L 38 24 L 38 28 L 46 28 L 46 24 L 52 24 L 52 28 L 58 28 L 58 24 L 64 24 L 64 30 L 32 30 Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="32" y="30" width="32" height="2" fill="currentColor" opacity="0.3"/>
      <circle cx="48" cy="56" r="18" fill="none" stroke="currentColor" strokeWidth="2"/>
      <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
        <circle cx="44" cy="48" r="3" fill="currentColor"/>
        <path d="M 44 51 L 52 64"/>
        <line x1="48" y1="60" x2="52" y2="58"/>
      </g>
    </g>
  ),

  SENADOR: (
    <g>
      <circle cx="48" cy="48" r="24" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="48" cy="48" r="20" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.5"/>
      <g stroke="currentColor" strokeWidth="1.5" fill="none">
        <line x1="36" y1="38" x2="36" y2="60"/>
        <line x1="48" y1="36" x2="48" y2="62"/>
        <line x1="60" y1="38" x2="60" y2="60"/>
        <line x1="33" y1="62" x2="39" y2="62"/>
        <line x1="45" y1="64" x2="51" y2="64"/>
        <line x1="57" y1="62" x2="63" y2="62"/>
        <line x1="33" y1="38" x2="39" y2="38"/>
        <line x1="45" y1="36" x2="51" y2="36"/>
        <line x1="57" y1="38" x2="63" y2="38"/>
        <path d="M 30 36 L 48 30 L 66 36 L 30 36 Z" fill="currentColor" opacity="0.15"/>
      </g>
    </g>
  ),

  DEP_FEDERAL: (
    <g>
      <circle cx="48" cy="48" r="24" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="48" cy="48" r="20" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.5"/>
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M 42 60 Q 48 45, 56 36"/>
        <line x1="45" y1="54" x2="50" y2="50"/>
        <line x1="46" y1="50" x2="52" y2="46"/>
        <line x1="48" y1="46" x2="54" y2="42"/>
        <line x1="50" y1="42" x2="55" y2="38"/>
      </g>
      <g fill="currentColor">
        <circle cx="36" cy="38" r="1.5"/>
        <circle cx="32" cy="44" r="1.5"/>
        <circle cx="34" cy="52" r="1.5"/>
        <circle cx="60" cy="60" r="1.5"/>
        <circle cx="62" cy="52" r="1.5"/>
      </g>
    </g>
  ),

  DEP_ESTADUAL: (
    <g>
      <circle cx="48" cy="48" r="22" fill="none" stroke="currentColor" strokeWidth="2"/>
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M 42 60 Q 48 45, 56 36"/>
        <line x1="45" y1="54" x2="50" y2="50"/>
        <line x1="46" y1="50" x2="52" y2="46"/>
        <line x1="48" y1="46" x2="54" y2="42"/>
      </g>
      <path d="M 38 40 L 40 45 L 45 45 L 41 48 L 43 53 L 38 50 L 33 53 L 35 48 L 31 45 L 36 45 Z" fill="currentColor" opacity="0.7"/>
    </g>
  ),

  VEREADOR: (
    <g>
      <circle cx="48" cy="48" r="22" fill="none" stroke="currentColor" strokeWidth="2"/>
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M 34 44 L 48 40 L 62 44 L 62 58 L 48 56 L 34 58 Z" fill="currentColor" fillOpacity="0.1"/>
        <line x1="48" y1="40" x2="48" y2="56"/>
        <line x1="38" y1="48" x2="46" y2="46"/>
        <line x1="38" y1="52" x2="46" y2="50"/>
        <line x1="50" y1="46" x2="58" y2="48"/>
        <line x1="50" y1="50" x2="58" y2="52"/>
      </g>
    </g>
  ),
};


export function Insignia({ cargo, estado = "atual", size = 46, className = "" }) {
  const key = chaveCargo(cargo);
  if (!key) return null;

  const metal = METAL_POR_CARGO[key];
  const cor = METAIS[metal];
  const path = PATHS[key];

  // Estado "disputou": contorno tracejado, cor cinza, sem preenchimento
  if (estado === "disputou") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 96 96"
        className={`drop-shadow ${className}`}
        style={{ color: "#9ca3af" }}
        aria-label={`Disputou ${cargo}`}
      >
        {key === "PREFEITO" ? (
          <>
            <path d="M 26 28 L 26 22 L 32 22 L 32 26 L 38 26 L 38 22 L 44 22 L 44 26 L 52 26 L 52 22 L 58 22 L 58 26 L 64 26 L 64 22 L 70 22 L 70 28 L 26 28 Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="48" cy="54" r="18" fill="white" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2"/>
            <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
              <path d="M 38 46 L 56 64"/>
              <path d="M 58 46 L 40 64"/>
            </g>
          </>
        ) : (
          <>
            <circle cx="48" cy="48" r="22" fill="white" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2"/>
            {path}
          </>
        )}
      </svg>
    );
  }

  // Estado "anterior": sepia, opacity reduzida
  if (estado === "anterior") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 96 96"
        className={`opacity-50 ${className}`}
        style={{ color: cor }}
        aria-label={cargo}
      >
        {path}
      </svg>
    );
  }

  // Estado "atual": cor cheia, drop shadow
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={`drop-shadow-md ${className}`}
      style={{ color: cor }}
      aria-label={cargo}
    >
      {path}
    </svg>
  );
}

// Exportar metais para outros componentes (barra de tier no card)
export const INSIGNIA_METAIS = METAIS;
export const cargoParaChave = chaveCargo;
