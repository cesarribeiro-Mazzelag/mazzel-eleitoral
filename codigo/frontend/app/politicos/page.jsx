import { redirect } from "next/navigation";

/**
 * Alias da antiga rota /politicos.
 *
 * O módulo foi renomeado para "Radar Político" em 11/04/2026 (Fase 1 do plano
 * v3). Mantemos este redirect por 1 release para não quebrar links salvos
 * (Slack, e-mails, bookmarks, alertas). Pode ser removido na próxima limpeza.
 */
export default function PoliticosRedirect() {
  redirect("/radar/politicos");
}
