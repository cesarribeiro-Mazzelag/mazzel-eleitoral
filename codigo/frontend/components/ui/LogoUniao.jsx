/**
 * Logo Mazzel Tech — Plataforma de Inteligência Eleitoral
 *
 * Identidade visual Mazzel:
 *   Roxo escuro:  #1E0A3C  (sidebar)
 *   Violeta:      #7C3AED  (primary)
 *   Âmbar:        #F59E0B  (destaque)
 *
 * Variantes:
 *   "color"  - logotipo colorido sobre fundo claro
 *   "white"  - tudo branco + âmbar (para fundo escuro/sidebar)
 *   "roxo"   - roxo sobre fundo claro
 */

export function LogoMazzel({ size = "md", variant = "color" }) {
  const TAMANHOS = {
    icon: { outer: "w-8 h-8", text: "text-[11px]", sub: "text-[8px]" },
    sm:   { outer: "h-8",     text: "text-sm",      sub: "text-[9px]" },
    md:   { outer: "h-10",    text: "text-base",    sub: "text-[10px]" },
    lg:   { outer: "h-12",    text: "text-lg",      sub: "text-xs" },
  };
  const t = TAMANHOS[size] ?? TAMANHOS.md;

  const cor = {
    color: { m: "#7C3AED", text: "#1E0A3C", tech: "#7C3AED", dot: "#F59E0B" },
    white: { m: "#FFFFFF", text: "#FFFFFF",  tech: "#A78BFA", dot: "#F59E0B" },
    roxo:  { m: "#7C3AED", text: "#1E0A3C", tech: "#7C3AED", dot: "#F59E0B" },
  }[variant] ?? { m: "#7C3AED", text: "#1E0A3C", tech: "#7C3AED", dot: "#F59E0B" };

  // Ícone compacto (modo collapsed sidebar)
  if (size === "icon") {
    return (
      <div className={`flex items-center justify-center ${t.outer} rounded-lg`}
           style={{ background: variant === "white" ? "rgba(255,255,255,0.15)" : "#EDE9FE" }}>
        <span className={`font-display font-black ${t.text} leading-none`}
              style={{ color: cor.m }}>
          M
        </span>
        <span className={`font-display font-black ${t.sub} leading-none`}
              style={{ color: cor.dot }}>·</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${t.outer}`}>
      {/* Ícone M */}
      <div className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0"
           style={{ background: variant === "white" ? "rgba(255,255,255,0.15)" : "#EDE9FE" }}>
        <span className="font-display font-black text-sm leading-none"
              style={{ color: cor.m }}>M</span>
      </div>

      {/* Wordmark */}
      <div className="flex flex-col leading-none">
        <span className={`font-display font-black ${t.text} uppercase tracking-tight leading-none`}
              style={{ color: cor.text }}>
          MAZZEL
        </span>
        <span className={`font-sans font-semibold ${t.sub} uppercase tracking-widest leading-none`}
              style={{ color: cor.tech }}>
          Inteligência Eleitoral
        </span>
      </div>
    </div>
  );
}

// Alias de compatibilidade — AppLayout importa LogoUniaoB
export const LogoUniaoB = LogoMazzel;
