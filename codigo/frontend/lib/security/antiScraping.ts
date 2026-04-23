/**
 * Detecção client-side de extensões de IA e scraping automatizado.
 *
 * Camada 1 da defesa (ver project_uniao_brasil_protecao_ai_scraping.md):
 * executa logo após o mount de páginas autenticadas, identifica fingerprints
 * conhecidos de extensões (Claude for Chrome, ChatGPT Browse, Perplexity Comet
 * etc) e reporta ao backend via POST /seguranca/scraping-detectado.
 *
 * Cesar 20/04/2026: "ninguém faz isso no segmento, não é justo deixar a IA
 * extrair de graça o que é pago".
 *
 * Design:
 * - Detecções SÃO LEVES (window properties, MutationObserver seletivo).
 * - Fail-open: se a chamada falhar, não impacta o app. So loga.
 * - Throttle: 1 report por sessão por categoria (não spammar backend).
 */

import { API_BASE } from "@/lib/api/base";

type Motivo =
  | "claude_extension"
  | "chatgpt_extension"
  | "perplexity_extension"
  | "automation_cdp"
  | "headless_browser"
  | "suspicious_user_agent"
  | "dom_overlay_injection";

const reportadosNaSessao = new Set<Motivo>();

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ub_token") ?? "";
}

async function reportar(motivo: Motivo, detalhes?: Record<string, any>) {
  if (reportadosNaSessao.has(motivo)) return;
  reportadosNaSessao.add(motivo);
  try {
    await fetch(`${API_BASE}/seguranca/scraping-detectado`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        motivo,
        url: window.location.pathname,
        detalhes: detalhes ?? null,
      }),
      keepalive: true,
    });
  } catch {
    /* fail open */
  }
}

// ── Fingerprints conhecidos de extensões IA ─────────────────────────────────

function detectarClaudeExtension(): boolean {
  // Claude for Chrome injeta variáveis globais e marcadores no DOM.
  const w = window as any;
  if (w.__CLAUDE_EXTENSION__ || w.__anthropic_extension__) return true;
  // Injeta tag <anthropic-portal> ou similar no body
  if (document.querySelector("anthropic-portal, [data-anthropic-extension]")) return true;
  return false;
}

function detectarChatGPTExtension(): boolean {
  const w = window as any;
  if (w.__CHATGPT_BROWSE__ || w.__openai_extension__) return true;
  if (document.querySelector("[data-openai-extension], openai-portal")) return true;
  return false;
}

function detectarPerplexityComet(): boolean {
  const w = window as any;
  if (w.__PERPLEXITY_COMET__ || w.__perplexity_extension__) return true;
  if (document.querySelector("[data-perplexity], perplexity-portal")) return true;
  return false;
}

function detectarAutomation(): boolean {
  // Chrome DevTools Protocol ativo (playwright/puppeteer/CDP-driven)
  const w = window as any;
  if (w.navigator.webdriver === true) return true;
  // Runtime-only flags que CDP injeta
  if (w.__playwright || w.__puppeteer) return true;
  return false;
}

function detectarHeadless(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("headlesschrome") ||
    ua.includes("phantomjs") ||
    ua.includes("slimerjs") ||
    ua.includes("htmlunit")
  );
}

// ── MutationObserver: detecta overlays injetados dinamicamente ──────────────
// Várias extensões IA adicionam iframes/divs flutuantes pra fazer seu próprio
// chat sobre a página. Flag isso como suspeito.

function iniciarObservadorOverlay(): () => void {
  const padroes = /anthropic|openai|perplexity|chatgpt|claude-?for|copilot/i;

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of Array.from(m.addedNodes)) {
        if (n.nodeType !== 1) continue;
        const el = n as Element;
        const id = el.id?.toLowerCase() ?? "";
        const cls = (typeof el.className === "string" ? el.className : "").toLowerCase();
        if (padroes.test(id) || padroes.test(cls)) {
          reportar("dom_overlay_injection", { tag: el.tagName, id, className: cls });
          break;
        }
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  return () => obs.disconnect();
}

// ── API pública ─────────────────────────────────────────────────────────────

/**
 * Executa todas as checagens estáticas e inicia o observador de DOM.
 * Chame uma vez no mount de layouts autenticados (AuthGuard, por exemplo).
 * Retorna função de cleanup do observador.
 */
export function iniciarProtecaoAntiScraping(): () => void {
  if (typeof window === "undefined") return () => {};

  // Checagens imediatas
  if (detectarClaudeExtension()) reportar("claude_extension");
  if (detectarChatGPTExtension()) reportar("chatgpt_extension");
  if (detectarPerplexityComet()) reportar("perplexity_extension");
  if (detectarAutomation()) reportar("automation_cdp");
  if (detectarHeadless()) reportar("headless_browser");

  // Observador contínuo
  return iniciarObservadorOverlay();
}
