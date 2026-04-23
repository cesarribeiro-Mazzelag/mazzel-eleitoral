"use client";

/**
 * CampanhaChat — aba de chat sigiloso dentro de uma campanha.
 * UI delegada para ChatWorkspace (componente compartilhado).
 * Conectado ao backend via useChat hooks.
 */

import ChatWorkspace from "@/components/chat/ChatWorkspace";
import { useCampanhas } from "@/hooks/useCampanha";

export default function CampanhaChat() {
  // Pega a primeira campanha disponivel para filtrar salas
  const { campanhas } = useCampanhas();
  const campanhaId = campanhas?.[0]?.id ?? undefined;

  return (
    <ChatWorkspace
      campanhaId={campanhaId}
      altura="calc(100vh - 140px)"
    />
  );
}
