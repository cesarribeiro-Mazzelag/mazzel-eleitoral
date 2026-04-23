"use client";

/**
 * Chat — tela cheia estilo WhatsApp Web.
 * Usa ChatWorkspace (mesmo componente do CampanhaChat).
 * Sem filtro de campanha: exibe todos os canais do usuario.
 */

import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import ChatWorkspace from "@/components/chat/ChatWorkspace";
import { useChatSalas } from "@/hooks/useChat";

function ChatContent() {
  // Para badge do sidebar: total de nao lidas agregadas
  // (nao disponivel na listagem simples, exibe sem badge por ora)
  return (
    <div className="h-full" style={{ background: "var(--mz-bg-page)" }}>
      <ChatWorkspace altura="calc(100vh - 48px)" />
    </div>
  );
}

export default function ChatPage() {
  const { salas } = useChatSalas();
  // Soma nao_lidas: nao disponivel sem buscar detalhe de cada sala.
  // Badge sera mostrado no sidebar via contagem de salas com unread > 0 (mock por ora).
  const alertCount = 0;

  return (
    <MazzelLayout activeModule="chat" breadcrumbs={["Uniao Brasil", "Chat"]} alertCount={alertCount}>
      <ChatContent />
    </MazzelLayout>
  );
}
