/**
 * useSidebarState - lógica da sidebar híbrida adaptativa.
 *
 * Três estados possíveis:
 *   - "expanded"   : 240px, ícone + label visíveis
 *   - "rail"       : 64px, só ícone (tooltip on hover)
 *   - "peek"       : 240px overlay temporário sobre conteúdo (hover sobre rail)
 *
 * Lógica:
 *   1. Preferência manual do usuário (localStorage) tem prioridade máxima.
 *   2. Se sem preferência: auto-decide por rota.
 *      - Módulos densos (mapa/radar/dossiê): rail
 *      - Módulos leves (filiados/alertas/config/...): expanded
 *   3. Peek só aparece quando o estado base é "rail" e o usuário faz hover
 *      sobre a sidebar. Fecha ao sair.
 *   4. Cmd+B toggle entre expanded <-> rail e SALVA preferência.
 *   5. Primeira entrada no sistema (localStorage vazio): sempre expanded.
 *
 * O contrato é: sidebar NUNCA desaparece (mínimo 64px), respondendo a
 * "cadê a navegação?" que o produto tinha antes.
 */
import { useCallback, useEffect, useState } from "react";

export type SidebarMode = "expanded" | "rail";

export interface UseSidebarState {
  /** Modo efetivo (sem peek) - o que ocupa espaço no layout. */
  mode: SidebarMode;
  /** Se está em peek (overlay temporário). */
  peeking: boolean;
  /** Width em px do slot que a sidebar ocupa no fluxo do layout. */
  railWidth: number;
  /** Width em px da sidebar renderizada (considera peek). */
  renderedWidth: number;
  /** Toggle manual (salva preferência). */
  toggle: () => void;
  /** Força um modo específico (salva preferência). */
  setMode: (mode: SidebarMode) => void;
  /** Peek temporário (hover na rail). */
  setPeeking: (peeking: boolean) => void;
  /** Se o usuário já setou preferência manualmente alguma vez. */
  hasManualPreference: boolean;
}

const STORAGE_KEY = "ub_sidebar_mode";
const MANUAL_KEY  = "ub_sidebar_manual";

// Módulos densos que ganham MUITO com espaço horizontal.
// Auto-colapsa para rail ao entrar (se usuário não setou preferência).
const MODULOS_DENSOS = [
  "/mapa",
  "/mapa-google",
  "/radar",                    // radar + dossiê (/radar/politicos/[id])
];

function rotaEhDensa(pathname: string | null): boolean {
  if (!pathname) return false;
  return MODULOS_DENSOS.some(m => pathname === m || pathname.startsWith(m + "/"));
}

function lerStorage(): { mode: SidebarMode | null; manual: boolean } {
  if (typeof window === "undefined") return { mode: null, manual: false };
  try {
    const m = window.localStorage.getItem(STORAGE_KEY);
    const man = window.localStorage.getItem(MANUAL_KEY) === "1";
    if (m === "expanded" || m === "rail") return { mode: m, manual: man };
  } catch {}
  return { mode: null, manual: false };
}

function salvarStorage(mode: SidebarMode, manual: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
    window.localStorage.setItem(MANUAL_KEY, manual ? "1" : "0");
  } catch {}
}

export function useSidebarState(pathname: string | null): UseSidebarState {
  // Primeira entrada: expanded. Depois: lê preferência.
  const [mode, setModeInternal] = useState<SidebarMode>("expanded");
  const [hasManual, setHasManual] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [hidratado, setHidratado] = useState(false);

  // Hidrata do localStorage no client
  useEffect(() => {
    const { mode: m, manual } = lerStorage();
    if (m) {
      setModeInternal(m);
      setHasManual(manual);
    }
    setHidratado(true);
  }, []);

  // Auto-ajuste por rota (só se não tem preferência manual)
  useEffect(() => {
    if (!hidratado) return;
    if (hasManual) return;  // respeita preferência do usuário
    const deveSerRail = rotaEhDensa(pathname);
    const alvo: SidebarMode = deveSerRail ? "rail" : "expanded";
    setModeInternal(prev => prev === alvo ? prev : alvo);
  }, [pathname, hasManual, hidratado]);

  const setMode = useCallback((novo: SidebarMode) => {
    setModeInternal(novo);
    setHasManual(true);
    salvarStorage(novo, true);
  }, []);

  const toggle = useCallback(() => {
    setModeInternal(prev => {
      const alvo: SidebarMode = prev === "expanded" ? "rail" : "expanded";
      salvarStorage(alvo, true);
      return alvo;
    });
    setHasManual(true);
  }, []);

  // Atalho Cmd+B / Ctrl+B
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "b" && e.key !== "B") return;
      if (!(e.metaKey || e.ctrlKey)) return;
      // Não interferir em campos de texto
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable)) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  const railWidth = mode === "expanded" ? 240 : 64;
  const renderedWidth = peeking && mode === "rail" ? 240 : railWidth;

  return {
    mode,
    peeking: peeking && mode === "rail",
    railWidth,
    renderedWidth,
    toggle,
    setMode,
    setPeeking,
    hasManualPreference: hasManual,
  };
}
