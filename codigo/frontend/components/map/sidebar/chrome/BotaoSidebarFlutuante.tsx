"use client";

import { PanelRightOpen } from "lucide-react";
import { useSidebarState, useMapaActions } from "@/hooks/useMapaState";

// ── Botao flutuante pra reabrir sidebar fechada ─────────────────────────────

export function BotaoSidebarFlutuante() {
  const sidebarState = useSidebarState();
  const { abrirSidebar } = useMapaActions();

  if (sidebarState !== "closed") return null;

  return (
    <button
      onClick={abrirSidebar}
      className="fixed top-1/2 right-3 -translate-y-1/2 z-40 w-10 h-12 bg-white border border-gray-300 rounded-l-xl shadow-lg flex items-center justify-center text-brand-700 hover:bg-brand-50 transition-colors"
      title="Abrir painel lateral"
    >
      <PanelRightOpen className="w-4 h-4" />
    </button>
  );
}
