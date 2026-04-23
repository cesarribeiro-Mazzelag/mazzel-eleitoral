"use client";

import { useRef } from "react";
import { Vote, Info } from "lucide-react";
import type { EleitoPorCargo } from "@/lib/types";
import { corDoPartido } from "@/lib/farolPartido";
import { Avatar } from "./Avatar";
import { fmt } from "../utils";

export function CardPolitico({
  e, corSelecionado, onSingleClick, onDoubleClick, onAbrirDossie, mostrarPartido = false,
}: {
  e: EleitoPorCargo & { partido_num?: number; partido_sigla?: string; situacao?: string };
  corSelecionado: string | null;
  /** Single-click no card — em geral noop ou highlight leve. */
  onSingleClick: () => void;
  /** Double-click — ativa modo gradiente (força eleitoral) ou entra comparação automaticamente. */
  onDoubleClick: () => void;
  /** Botão "ⓘ Dossiê" separado do click no card. */
  onAbrirDossie?: () => void;
  mostrarPartido?: boolean;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selecionado = corSelecionado !== null;
  const cor = mostrarPartido && e.partido_num ? corDoPartido(e.partido_num) : null;

  function handleClick() {
    if (timerRef.current) {
      clearTimeout(timerRef.current); timerRef.current = null;
      onDoubleClick();
    } else {
      timerRef.current = setTimeout(() => { timerRef.current = null; onSingleClick(); }, 260);
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left border-2 group ${
        selecionado ? "bg-gray-50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
      }`}
      style={selecionado ? { borderColor: corSelecionado!, boxShadow: `0 0 0 2px ${corSelecionado}33` } : {}}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative flex-shrink-0">
          <Avatar nome={e.nome} fotoUrl={e.foto_url} size={9} />
          {selecionado && (
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
                 style={{ backgroundColor: corSelecionado! }} />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate leading-tight" title={e.nome}>{e.nome}</p>
          <div className="flex items-center gap-1 flex-wrap">
            {mostrarPartido && e.partido_sigla && (
              <span className="text-[10px] font-bold px-1.5 py-0 rounded text-white flex-shrink-0"
                    title={e.partido_sigla}
                    style={{ backgroundColor: cor ?? "#6B7280" }}>
                {e.partido_sigla}
              </span>
            )}
            <p className="text-[10px] text-gray-400 truncate">
              {e.ano}{e.situacao ? ` - ${e.situacao}` : ""}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {e.votos != null && e.votos > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Vote className="w-3 h-3" />
            {fmt(e.votos)}
          </div>
        )}
        {onAbrirDossie && (
          <span
            role="button"
            tabIndex={0}
            onClick={(ev) => { ev.stopPropagation(); onAbrirDossie(); }}
            onKeyDown={(ev) => { if (ev.key === "Enter") { ev.stopPropagation(); onAbrirDossie(); } }}
            className="p-1 -m-1 rounded hover:bg-brand-100 text-gray-400 hover:text-brand-700 transition-colors"
            title="Abrir dossiê"
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </button>
  );
}
