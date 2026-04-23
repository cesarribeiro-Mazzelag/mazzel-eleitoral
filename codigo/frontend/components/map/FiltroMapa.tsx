"use client";

/**
 * Filtro de pesquisa integrado ao mapa.
 * Busca unificada por: municipio, estado, bairro, zona eleitoral, politico.
 *
 * Cesar 20/04/2026: dropdown mostra "Suas regioes recentes" quando o input esta
 * vazio e focado. Cada clique em sugestao e registrado em POST /mapa/buscas/registrar
 * para alimentar o historico pessoal. Score futuro: frequencia * 0.7 + recencia * 0.3.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, X, Loader2, Clock,
  MapPin, Map, Home, Vote, User, Flag, MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { API_BASE } from "@/lib/api/base";

export interface Sugestao {
  tipo: "municipio" | "estado" | "politico" | "pergunta" | "bairro" | "zona" | "partido";
  label: string;
  sublabel?: string;
  valor: string;
  // Contexto preenchido por bairro/zona (pra drill em cascata UF -> municipio -> ...).
  contexto_ibge?: string;
  contexto_uf?: string;
  contexto_nome?: string;
}

interface RecenteItem {
  tipo: Sugestao["tipo"];
  valor: string;
  nome: string;
  uf: string | null;
  contexto: string | null;
}

interface Props {
  onResultado: (tipo: string, valor: string, sugestao?: Sugestao) => void;
}

// Icones lucide em estilo consistente com a sidebar (CardPolitico, StatsResumo,
// ListaCargos, etc). Cada tipo tem cor sutil de fundo pra facilitar scan do usuario.
const ICONE_POR_TIPO: Record<Sugestao["tipo"], { Icon: LucideIcon; bg: string; fg: string }> = {
  municipio: { Icon: MapPin,        bg: "bg-brand-50",    fg: "text-brand-700" },
  estado:    { Icon: Map,           bg: "bg-sky-50",      fg: "text-sky-700" },
  bairro:    { Icon: Home,          bg: "bg-emerald-50",  fg: "text-emerald-700" },
  zona:      { Icon: Vote,          bg: "bg-amber-50",    fg: "text-amber-700" },
  politico:  { Icon: User,          bg: "bg-violet-50",   fg: "text-violet-700" },
  partido:   { Icon: Flag,          bg: "bg-rose-50",     fg: "text-rose-700" },
  pergunta:  { Icon: MessageCircle, bg: "bg-gray-100",    fg: "text-gray-600" },
};

function IconeSugestao({ tipo, size = "md" }: { tipo: Sugestao["tipo"]; size?: "sm" | "md" }) {
  const cfg = ICONE_POR_TIPO[tipo] ?? ICONE_POR_TIPO.municipio;
  const box = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const icon = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <div className={`${box} ${cfg.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
      <cfg.Icon className={`${icon} ${cfg.fg}`} />
    </div>
  );
}

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ub_token") ?? "";
}

export function FiltroMapa({ onResultado }: Props) {
  const [texto, setTexto] = useState("");
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [recentes, setRecentes] = useState<RecenteItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textoBuscado = useDebounce(texto, 300);

  // Carrega recentes na montagem (1x por sessao - lista pequena).
  useEffect(() => {
    async function carregarRecentes() {
      try {
        const resp = await fetch(`${API_BASE}/mapa/buscas/recentes?limit=8`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (resp.ok) {
          const dados: RecenteItem[] = await resp.json();
          setRecentes(dados);
        }
      } catch {
        // silent fail - recentes e feature opcional, nao bloqueia a busca.
      }
    }
    carregarRecentes();
  }, []);

  useEffect(() => {
    if (!textoBuscado || textoBuscado.length < 2) {
      setSugestoes([]);
      return;
    }
    async function buscar() {
      setCarregando(true);
      try {
        const resp = await fetch(
          `${API_BASE}/mapa/buscar?q=${encodeURIComponent(textoBuscado)}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        if (resp.ok) {
          const dados: Sugestao[] = await resp.json();
          setSugestoes(dados);
          setAberto(true);
        }
      } finally {
        setCarregando(false);
      }
    }
    buscar();
  }, [textoBuscado]);

  const registrarBusca = useCallback(async (s: Sugestao) => {
    try {
      await fetch(`${API_BASE}/mapa/buscas/registrar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          tipo: s.tipo,
          valor: s.valor,
          nome: s.label,
          uf: s.contexto_uf ?? null,
          contexto: s.contexto_nome ?? s.sublabel ?? null,
        }),
      });
      // Atualiza lista local pra aparecer no proximo focus sem refetch.
      setRecentes((prev) => {
        const filtered = prev.filter(
          (r) => !(r.tipo === s.tipo && r.valor === s.valor)
        );
        return [
          {
            tipo: s.tipo,
            valor: s.valor,
            nome: s.label,
            uf: s.contexto_uf ?? null,
            contexto: s.contexto_nome ?? s.sublabel ?? null,
          },
          ...filtered,
        ].slice(0, 8);
      });
    } catch {
      // silent fail
    }
  }, []);

  const selecionar = useCallback(
    (s: Sugestao) => {
      setTexto(s.label);
      setSugestoes([]);
      setAberto(false);
      registrarBusca(s);
      onResultado(s.tipo, s.valor, s);
    },
    [onResultado, registrarBusca]
  );

  const selecionarRecente = useCallback(
    (r: RecenteItem) => {
      // Reconstroi Sugestao a partir do historico.
      const s: Sugestao = {
        tipo: r.tipo,
        label: r.nome,
        valor: r.valor,
        sublabel: r.contexto ?? undefined,
        contexto_uf: r.uf ?? undefined,
        contexto_nome: r.contexto ?? undefined,
      };
      // Recente ja conta como registro - so atualiza recencia, nao duplica excessivamente.
      selecionar(s);
    },
    [selecionar]
  );

  const limpar = () => {
    setTexto("");
    setSugestoes([]);
    setAberto(false);
    inputRef.current?.focus();
  };

  // Dropdown: mostra sugestoes quando tem texto; senao mostra recentes.
  const mostrarSugestoes = aberto && sugestoes.length > 0;
  const mostrarRecentes =
    aberto && !texto && recentes.length > 0 && sugestoes.length === 0;

  return (
    <div className="relative">
      <div className="flex items-center h-8 bg-white rounded-lg border border-gray-200 hover:border-brand-200 focus-within:border-brand-300 focus-within:ring-1 focus-within:ring-brand-200 transition-all overflow-hidden">
        <Search className="w-3.5 h-3.5 text-gray-400 ml-2.5 flex-shrink-0" />
        <input
          ref={inputRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onFocus={() => setAberto(true)}
          onBlur={() => {
            // Delay pra click em item do dropdown ter tempo de disparar.
            setTimeout(() => setAberto(false), 180);
          }}
          placeholder="Buscar cidade, estado, bairro, zona, político..."
          className="flex-1 px-2 text-gray-900 placeholder-gray-400 bg-transparent outline-none text-xs"
        />
        {carregando && (
          <Loader2 className="w-3 h-3 text-gray-400 mr-2 animate-spin flex-shrink-0" />
        )}
        {texto && !carregando && (
          <button
            onClick={limpar}
            className="p-1 mr-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {mostrarSugestoes && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 max-h-80 overflow-y-auto">
          {sugestoes.map((s, i) => (
            <button
              key={i}
              onClick={() => selecionar(s)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
            >
              <IconeSugestao tipo={s.tipo} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {s.label}
                </p>
                {s.sublabel && (
                  <p className="text-xs text-gray-500 truncate">{s.sublabel}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {mostrarRecentes && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 max-h-80 overflow-y-auto">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 border-b border-gray-100">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
              Suas regiões recentes
            </span>
          </div>
          {recentes.map((r, i) => (
            <button
              key={`${r.tipo}-${r.valor}-${i}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selecionarRecente(r)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
            >
              <IconeSugestao tipo={r.tipo} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {r.nome}
                </p>
                {r.contexto && (
                  <p className="text-xs text-gray-500 truncate">{r.contexto}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
