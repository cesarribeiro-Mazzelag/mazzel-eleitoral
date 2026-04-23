"use client";

/**
 * Seletor de Modo de Produto da topbar (Cesar 20/04/2026).
 *
 * 3 modos:
 *   - Inteligência: analistas/diretoria - Brasil inteiro, análises nacionais
 *   - Campanha: candidato - território da candidatura, cobertura/equipe
 *   - Zona: delegado - só as zonas atribuídas
 *
 * Sprint C: seletor visual + troca de modo no store.
 * Sprint D: detecção automática por PerfilUsuario + escopo inicial.
 */

import { useState, useRef, useEffect } from "react";
import { Brain, Megaphone, Map, ChevronDown, Lock } from "lucide-react";
import { useMapaStore } from "@/lib/store/mapaStore";
import type { ModoProduto } from "@/lib/mapa/tipos";

interface ModoConfig {
  id: ModoProduto;
  label: string;
  descricao: string;
  Icon: typeof Brain;
  cor: string;
  disponivel: boolean;
}

const MODOS: ModoConfig[] = [
  {
    id: "inteligencia",
    label: "Inteligência",
    descricao: "Análise nacional, Vigentes, comparações",
    Icon: Brain,
    cor: "text-violet-600",
    disponivel: true,
  },
  {
    id: "campanha",
    label: "Campanha",
    descricao: "Território da candidatura, cobertura, equipe",
    Icon: Megaphone,
    cor: "text-amber-600",
    disponivel: false, // Sprint D
  },
  {
    id: "zona",
    label: "Zona",
    descricao: "Zonas atribuídas do delegado",
    Icon: Map,
    cor: "text-emerald-600",
    disponivel: false, // Sprint D
  },
];

export function SeletorModo() {
  const modo = useMapaStore((s) => s.ui.modoProduto);
  const setModoProduto = useMapaStore((s) => s.setModoProduto);
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aberto]);

  const atual = MODOS.find((m) => m.id === modo) ?? MODOS[0];
  const AtualIcon = atual.Icon;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setAberto((v) => !v)}
        title={atual.descricao}
        className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-all ${
          aberto
            ? "bg-brand-50 border-brand-300 text-brand-800"
            : "border-gray-200 bg-white hover:bg-brand-50/50 hover:border-brand-200 text-gray-700"
        }`}
      >
        <AtualIcon className={`w-3.5 h-3.5 ${atual.cor}`} />
        <span className="font-bold">{atual.label}</span>
        <ChevronDown
          className={`w-3 h-3 text-gray-400 transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50">
          <div className="px-3 pb-1.5 border-b border-gray-100">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
              Modo de trabalho
            </p>
          </div>
          {MODOS.map((m) => {
            const ativo = m.id === modo;
            const Icon = m.Icon;
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (!m.disponivel) return;
                  setModoProduto(m.id);
                  setAberto(false);
                }}
                disabled={!m.disponivel}
                className={`w-full flex items-start gap-2.5 px-3 py-2.5 transition-colors text-left ${
                  !m.disponivel
                    ? "cursor-not-allowed opacity-50"
                    : ativo
                    ? "bg-brand-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 ${
                  ativo ? "bg-brand-100" : ""
                }`}>
                  <Icon className={`w-4 h-4 ${m.cor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs font-bold ${ativo ? "text-brand-800" : "text-gray-800"}`}>
                      {m.label}
                    </p>
                    {!m.disponivel && (
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> em breve
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{m.descricao}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
