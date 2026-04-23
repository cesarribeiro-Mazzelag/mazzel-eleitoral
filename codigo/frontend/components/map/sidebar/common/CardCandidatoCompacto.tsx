"use client";

import { useRef } from "react";
import { Info } from "lucide-react";
import { Avatar } from "./Avatar";
import { fmt } from "../utils";

// Card genérico de candidato em ranking. Mesma mecânica nova:
//   - 1 click: noop (preview leve apenas)
//   - 2 cliques: ativa força eleitoral (gradiente). Com 1 já ativo, entra comparação automaticamente.
//   - Botão ⓘ separado: abre dossiê.
export function CardCandidatoCompacto({
  candidatoId, nome, fotoUrl, partidoSigla, votos, eleito, numero,
  extraInfo, corSelecionado, onFiltrar, onDossie,
}: {
  candidatoId: number;
  nome: string;
  fotoUrl?: string | null;
  partidoSigla?: string;
  votos?: number;
  eleito?: boolean;
  numero?: number;
  extraInfo?: string;
  corSelecionado?: string | null;
  onFiltrar: () => void;
  onDossie: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selecionado = corSelecionado != null;
  function handleClick() {
    if (timerRef.current) {
      clearTimeout(timerRef.current); timerRef.current = null;
      onFiltrar();  // 2 cliques: ativa gradiente / entra comparação
    } else {
      // 1 click: noop (timer só evita falso-double)
      timerRef.current = setTimeout(() => { timerRef.current = null; }, 260);
    }
  }
  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left border-2 ${
        selecionado ? "bg-gray-50" : "border-transparent hover:bg-gray-50"
      }`}
      style={selecionado ? { borderColor: corSelecionado!, boxShadow: `0 0 0 2px ${corSelecionado}33` } : {}}
    >
      {numero != null && (
        <span className="text-[10px] font-bold text-gray-400 w-4 text-right flex-shrink-0">{numero}</span>
      )}
      <Avatar nome={nome} fotoUrl={fotoUrl as string | null} size={8} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-xs font-semibold text-gray-900 truncate">{nome}</p>
          {eleito && (
            <span className="text-[8px] font-bold text-green-700 bg-green-50 px-1 rounded">ELEITO</span>
          )}
        </div>
        <p className="text-[10px] text-gray-400">
          {partidoSigla ? `${partidoSigla} - ` : ""}{votos != null ? `${fmt(votos)} votos` : ""}{extraInfo ? ` - ${extraInfo}` : ""}
        </p>
      </div>
      <span
        role="button"
        tabIndex={0}
        onClick={(ev) => { ev.stopPropagation(); onDossie(); }}
        onKeyDown={(ev) => { if (ev.key === "Enter") { ev.stopPropagation(); onDossie(); } }}
        className="p-1 -m-1 rounded hover:bg-brand-100 text-gray-400 hover:text-brand-700 transition-colors flex-shrink-0"
        title="Abrir dossiê"
      >
        <Info className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}
