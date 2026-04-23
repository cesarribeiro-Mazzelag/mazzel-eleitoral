"use client";

/**
 * Botão Voltar — aparece em todo nível de navegação do mapa.
 * Requisito explícito do cliente: usuário precisa poder voltar à ação anterior.
 */

import { ChevronLeft } from "lucide-react";

interface Props {
  onClick: () => void;
  label?: string;
}

export function BotaoVoltar({ onClick, label = "Voltar" }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 bg-white text-gray-700 px-4 py-2.5 rounded-xl shadow-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 active:scale-95 transition-all"
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </button>
  );
}
