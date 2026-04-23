"use client";

/**
 * Inicializa detecção de extensões IA/scraping em rotas autenticadas.
 * Cesar 20/04/2026: pre-requisito Modo Campanha pago.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { iniciarProtecaoAntiScraping } from "@/lib/security/antiScraping";

const ROTAS_PUBLICAS = new Set(["/login", "/"]);

export function AntiScrapingProvider() {
  const pathname = usePathname();

  useEffect(() => {
    // Só ativa em rotas autenticadas (login/publico ignora).
    if (!pathname || ROTAS_PUBLICAS.has(pathname)) return;
    const cleanup = iniciarProtecaoAntiScraping();
    return cleanup;
  }, [pathname]);

  return null;
}
