"use client";

/**
 * Topbar expansivel do Mapa Eleitoral.
 *
 * Cesar 20/04/2026: evolucao inspirada na sidebar compacta (hover = expande).
 * A topbar passa de "barra de filtros" a "cockpit analitico". 3 abas:
 *   - Filtros: o que ja existe (chips Ciclo/Cargo/Partido + modo + busca)
 *   - Estudos: lentes componiveis (Vigentes, Suplentes, Comparacoes, Viradas, etc)
 *   - Ferramentas: Exportar, Favoritos, Zonas, etc.
 *
 * Motor Toyota: mapa + sidebar + topbar sincronizados via store, sem ruptura.
 *
 * Sprint A (atual): frame expansivel + placeholders em Estudos/Ferramentas.
 * Sprints seguintes vao popular as abas incrementalmente.
 */

import { useState, useRef, useCallback, type ReactNode } from "react";
import {
  SlidersHorizontal, FlaskConical, Wrench, ChevronDown,
  Crown, Users, GitCompareArrows, RefreshCw, Check, type LucideIcon,
} from "lucide-react";
import { useMapaStore } from "@/lib/store/mapaStore";

type Aba = "filtros" | "estudos" | "ferramentas";

interface Props {
  /** JSX da topbar compacta atual (chips de filtro, modo, busca). */
  children: ReactNode;
}

const ABAS: { id: Aba; label: string; Icon: typeof SlidersHorizontal }[] = [
  { id: "filtros",     label: "Filtros",     Icon: SlidersHorizontal },
  { id: "estudos",     label: "Estudos",     Icon: FlaskConical },
  { id: "ferramentas", label: "Ferramentas", Icon: Wrench },
];

export function TopbarExpandivel({ children }: Props) {
  const [expandida, setExpandida] = useState(false);
  const [aba, setAba] = useState<Aba>("filtros");
  const containerRef = useRef<HTMLDivElement>(null);
  const timerAbrir = useRef<number | null>(null);
  const timerFechar = useRef<number | null>(null);

  // Fix Cesar 20/04: se houver dropdown aberto dentro da topbar (SeletorModo,
  // Ciclo, Cargo, Partido - todos usam .absolute.top-full.z-50), NAO expande
  // o painel. Evita duas UIs sobrepostas poluindo a tela.
  const dropdownAberto = useCallback(() => {
    if (!containerRef.current) return false;
    return containerRef.current.querySelector('.absolute.top-full.z-50') !== null;
  }, []);

  // Hover com delay: evita abertura acidental ao passar rapido.
  const handleMouseEnter = useCallback(() => {
    if (timerFechar.current) {
      window.clearTimeout(timerFechar.current);
      timerFechar.current = null;
    }
    if (!expandida) {
      timerAbrir.current = window.setTimeout(() => {
        // Pula abertura se dropdown estiver aberto.
        if (dropdownAberto()) return;
        setExpandida(true);
      }, 350);
    }
  }, [expandida, dropdownAberto]);

  const handleMouseLeave = useCallback(() => {
    if (timerAbrir.current) {
      window.clearTimeout(timerAbrir.current);
      timerAbrir.current = null;
    }
    if (expandida) {
      timerFechar.current = window.setTimeout(() => setExpandida(false), 500);
    }
  }, [expandida]);

  const toggle = useCallback(() => {
    if (timerAbrir.current) window.clearTimeout(timerAbrir.current);
    if (timerFechar.current) window.clearTimeout(timerFechar.current);
    setExpandida((v) => !v);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative z-30"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Linha compacta: topbar atual + chevron de toggle manual */}
      <div className="relative">
        {children}

        {/* Chevron pra touch/mobile (click toggle). Posicionado no canto inf-direito
            do header de 52px, entre a busca e a borda. */}
        <button
          onClick={toggle}
          aria-label={expandida ? "Recolher topbar" : "Expandir topbar"}
          className={`absolute right-3 -bottom-3 z-40 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-brand-700 hover:border-brand-300 transition-all ${
            expandida ? "rotate-180" : ""
          }`}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Painel expandido: cola visualmente na topbar (cresce em altura, nao
          vira "2 barras"). Cesar 20/04: "tudo seja uma so coisa".
          -mt-px cobre o border-b do header; sem shadow-lg (que criava card
          separado), so border-b sutil como continuacao. */}
      <div
        className={`absolute top-full left-0 right-0 -mt-px z-40 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200 transition-all duration-200 ease-out ${
          expandida
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        {/* Tabs - sem fundo separado, continuam o visual da topbar acima */}
        <div className="flex items-end gap-1 px-4 pt-2">
          {ABAS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors ${
                aba === a.id
                  ? "text-brand-800 bg-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <a.Icon className="w-3.5 h-3.5" />
              {a.label}
            </button>
          ))}
        </div>

        {/* Conteudo da aba - fundo branco pra contrastar com o cinza da topbar */}
        <div className="px-4 py-4 min-h-[120px] max-h-[380px] overflow-y-auto bg-white border-t border-gray-200">
          {aba === "filtros" && <AbaFiltros />}
          {aba === "estudos" && <AbaEstudos />}
          {aba === "ferramentas" && <AbaFerramentas />}
        </div>
      </div>
    </div>
  );
}

// ── Conteudo das abas (placeholder Sprint A) ─────────────────────────────────

function AbaFiltros() {
  return (
    <div className="text-xs text-gray-500 leading-relaxed">
      Todos os filtros principais estão na linha acima. Em breve aqui:
      <ul className="mt-2 space-y-1 list-disc list-inside text-gray-400">
        <li>Timeline de ciclos (2016 → 2024)</li>
        <li>Seletor de cargo visual com ícones</li>
        <li>Filtros avançados (coligação, faixa de votos, resultado)</li>
      </ul>
    </div>
  );
}

function AbaEstudos() {
  const cargoAtual = useMapaStore((s) => s.filters.cargo);
  const setCargo = useMapaStore((s) => s.setCargo);

  const vigentesAtivo = cargoAtual === "VIGENTES";

  const ativarVigentes = () => {
    setCargo(vigentesAtivo ? null : "VIGENTES");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Lentes componíveis sobre o mapa.</span>
          {" "}Pessoas · Movimento · Comparação · Território.
        </p>
      </div>

      {/* Seção: Pessoas (quem está / quem pode estar) */}
      <div>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
          Pessoas
        </p>
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          <CardEstudo
            titulo="Vigentes"
            desc="Quem está no poder agora (todos cargos)"
            Icon={Crown}
            cor="amber"
            ativo={vigentesAtivo}
            onClick={ativarVigentes}
          />
          <CardPlaceholder titulo="Suplentes" desc="Quem pode assumir" Icon={Users} cor="violet" />
          <CardPlaceholder titulo="Não eleitos" desc="Quem quase ganhou" Icon={Users} cor="slate" />
          <CardPlaceholder titulo="Cassados" desc="Mandatos encerrados" Icon={Users} cor="rose" />
        </div>
      </div>

      {/* Seção: Comparação */}
      <div>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
          Comparação
        </p>
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          <CardPlaceholder titulo="Partidos" desc="2-5 partidos, mesmo cargo" Icon={GitCompareArrows} cor="sky" />
          <CardPlaceholder titulo="Candidatos" desc="2-5 candidatos, mesmo cargo" Icon={GitCompareArrows} cor="emerald" />
          <CardPlaceholder titulo="Temporal" desc="Ano X vs Ano Y lado a lado" Icon={RefreshCw} cor="indigo" />
          <CardPlaceholder titulo="Virada" desc="Municípios que mudaram" Icon={RefreshCw} cor="orange" />
        </div>
      </div>
    </div>
  );
}

// ── Cards de estudo (ativaveis) ──────────────────────────────────────────────

const CORES_CARD: Record<string, { bg: string; ring: string; icon: string; ativo_bg: string; ativo_ring: string; ativo_icon: string }> = {
  amber:   { bg: "bg-amber-50",   ring: "border-amber-200",   icon: "text-amber-700",   ativo_bg: "bg-amber-100",   ativo_ring: "border-amber-400",   ativo_icon: "text-amber-800" },
  violet:  { bg: "bg-violet-50",  ring: "border-violet-200",  icon: "text-violet-700",  ativo_bg: "bg-violet-100",  ativo_ring: "border-violet-400",  ativo_icon: "text-violet-800" },
  slate:   { bg: "bg-slate-50",   ring: "border-slate-200",   icon: "text-slate-700",   ativo_bg: "bg-slate-100",   ativo_ring: "border-slate-400",   ativo_icon: "text-slate-800" },
  rose:    { bg: "bg-rose-50",    ring: "border-rose-200",    icon: "text-rose-700",    ativo_bg: "bg-rose-100",    ativo_ring: "border-rose-400",    ativo_icon: "text-rose-800" },
  sky:     { bg: "bg-sky-50",     ring: "border-sky-200",     icon: "text-sky-700",     ativo_bg: "bg-sky-100",     ativo_ring: "border-sky-400",     ativo_icon: "text-sky-800" },
  emerald: { bg: "bg-emerald-50", ring: "border-emerald-200", icon: "text-emerald-700", ativo_bg: "bg-emerald-100", ativo_ring: "border-emerald-400", ativo_icon: "text-emerald-800" },
  indigo:  { bg: "bg-indigo-50",  ring: "border-indigo-200",  icon: "text-indigo-700",  ativo_bg: "bg-indigo-100",  ativo_ring: "border-indigo-400",  ativo_icon: "text-indigo-800" },
  orange:  { bg: "bg-orange-50",  ring: "border-orange-200",  icon: "text-orange-700",  ativo_bg: "bg-orange-100",  ativo_ring: "border-orange-400",  ativo_icon: "text-orange-800" },
};

function CardEstudo({
  titulo, desc, Icon, cor, ativo, onClick,
}: {
  titulo: string;
  desc: string;
  Icon: LucideIcon;
  cor: keyof typeof CORES_CARD;
  ativo: boolean;
  onClick: () => void;
}) {
  const c = CORES_CARD[cor];
  return (
    <button
      onClick={onClick}
      className={`relative text-left rounded-lg border px-3 py-2.5 transition-all hover:shadow-sm ${
        ativo
          ? `${c.ativo_bg} ${c.ativo_ring}`
          : `${c.bg} ${c.ring} hover:brightness-95`
      }`}
    >
      {ativo && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-sm">
          <Check className={`w-2.5 h-2.5 ${c.ativo_icon}`} />
        </div>
      )}
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className={`w-3.5 h-3.5 ${ativo ? c.ativo_icon : c.icon}`} />
        <p className={`font-semibold truncate ${ativo ? c.ativo_icon : "text-gray-800"}`}>
          {titulo}
        </p>
      </div>
      <p className="text-[10px] text-gray-500 truncate">{desc}</p>
    </button>
  );
}

function CardPlaceholder({
  titulo, desc, Icon, cor,
}: {
  titulo: string;
  desc: string;
  Icon: LucideIcon;
  cor: keyof typeof CORES_CARD;
}) {
  const c = CORES_CARD[cor];
  return (
    <div
      className={`relative rounded-lg border ${c.bg} ${c.ring} px-3 py-2.5 opacity-50 cursor-not-allowed`}
      title="Em breve"
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
        <p className="font-semibold text-gray-700 truncate">{titulo}</p>
      </div>
      <p className="text-[10px] text-gray-500 truncate">{desc}</p>
      <span className="absolute top-1.5 right-1.5 text-[8px] font-bold text-gray-400 uppercase tracking-wide">
        Em breve
      </span>
    </div>
  );
}

function AbaFerramentas() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2 text-[11px]">
        <CardPlaceholder titulo="Exportar" desc="PNG, PDF, CSV do visível" Icon={Wrench} cor="slate" />
        <CardPlaceholder titulo="Favoritos" desc="Salvar presets de análise" Icon={Wrench} cor="amber" />
        <CardPlaceholder titulo="Pontos de votação" desc="Toggle de escolas" Icon={Wrench} cor="emerald" />
        <CardPlaceholder titulo="Coordenadores" desc="Sobreposição territorial" Icon={Wrench} cor="sky" />
      </div>
      <p className="text-[10px] text-gray-400 italic">Em construção.</p>
    </div>
  );
}
