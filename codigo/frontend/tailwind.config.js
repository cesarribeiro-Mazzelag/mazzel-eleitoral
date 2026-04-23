/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      // ─── Identidade Visual Mazzel Tech ────────────────────────────────────
      colors: {
        // Cores primárias Mazzel (identidade da marca)
        uniao: {
          azul:    "#1E0A3C",   // Roxo escuro — fundo principal, sidebar
          ciano:   "#7C3AED",   // Violeta — ícones, acentos, links ativos
          dourado: "#F59E0B",   // Âmbar — destaque, CTAs, avatar
          branco:  "#FFFFFF",
          preto:   "#0A0A0A",
        },
        mazzel: {
          roxo:    "#1E0A3C",   // Sidebar, header
          violeta: "#7C3AED",   // Primary accent
          lavanda: "#A78BFA",   // Hover, selecionado
          ambar:   "#F59E0B",   // Destaque, badges
          branco:  "#FFFFFF",
          preto:   "#0A0A0A",
        },
        // Escala do violeta (para backgrounds, borders, hovers)
        brand: {
          50:  "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#7C3AED",   // ← principal
          600: "#6D28D9",
          700: "#5B21B6",
          800: "#4C1D95",
          900: "#3B0764",
          950: "#2E1065",
        },
        // Âmbar (destaques, badges, avatar)
        dourado: {
          50:  "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",   // ← principal
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
        // Violeta claro (acentos, links, ícones)
        ciano: {
          50:  "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",   // ← principal
          500: "#7C3AED",
          600: "#6D28D9",
        },

        // ─── Farol de força ───────────────────────────────────────────────
        farol: {
          verde:    "#16A34A",
          verdeBg:  "#DCFCE7",
          amarelo:  "#CA8A04",
          amareloBg:"#FEF9C3",
          vermelho: "#DC2626",
          vermelhoBg:"#FEE2E2",
          semDados: "#9CA3AF",
        },

        // ─── Superfícies (neutros) ────────────────────────────────────────
        surface: {
          bg:     "#F8F9FC",
          card:   "#FFFFFF",
          border: "#E5E7EB",
          muted:  "#6B7280",
          input:  "#F3F4F6",
        },
      },

      fontFamily: {
        // Mont não tem versão gratuita — Barlow Condensed é a alternativa mais fiel
        // Para títulos/wordmarks no estilo do partido
        sans:      ["var(--font-barlow)", "Barlow", "ui-sans-serif", "system-ui", "sans-serif"],
        display:   ["var(--font-barlow-condensed)", "Barlow Condensed", "sans-serif"],
        mono:      ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },

      boxShadow: {
        "brand-sm": "0 1px 3px 0 rgb(124 58 237 / 0.12)",
        "brand":    "0 4px 12px 0 rgb(124 58 237 / 0.18)",
        "brand-lg": "0 8px 24px 0 rgb(124 58 237 / 0.24)",
        "card":     "0 1px 4px 0 rgb(0 0 0 / 0.06), 0 2px 8px 0 rgb(0 0 0 / 0.04)",
      },

      borderRadius: {
        "xl":  "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },

      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "pulse-farol": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "fade-in":     "fade-in 0.2s ease-out",
        "slide-in":    "slide-in 0.3s ease-out",
        "pulse-farol": "pulse-farol 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
