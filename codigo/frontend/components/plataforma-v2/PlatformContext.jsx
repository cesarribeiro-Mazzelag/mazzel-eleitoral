"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ROLE_MAP, ROLE_ORDER } from "./rbac";

function initialsOf(nome) {
  if (!nome) return "--";
  const parts = String(nome).trim().split(/\s+/);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return (a + b).toUpperCase() || "--";
}

const DEFAULT_STATE = {
  tenant: "uniao",
  role: "presidente",
  theme: "light",   // 27/04 (Cesar): default Light, nao Dark
  userName: "Sessão local",
  userInitials: "--",
  sessionRole: null,   // role real do backend (null em dev)
};

const LS_KEY = "mazzel-preview-prefs";

const PlatformContext = createContext({
  ...DEFAULT_STATE,
  setRole: () => {},
  setTenant: () => {},
  setTheme: () => {},
  toggleTheme: () => {},
});

export function PlatformProvider({ children }) {
  const [state, setState] = useState(DEFAULT_STATE);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 1. preferencias persistidas (tweak panel)
    let prefs = {};
    try {
      prefs = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    } catch {}
    // 2. tema da querystring (?theme=light|dark) - prioridade maxima
    //    Designer V1.2 (27/04): tema propaga via querystring na navegacao
    //    entre paginas pra garantir consistencia em links externos.
    let themeFromQS = null;
    try {
      const qs = new URLSearchParams(window.location.search);
      const t = qs.get("theme");
      if (t === "light" || t === "dark") themeFromQS = t;
    } catch {}
    // 3. tema global (mz-theme) - escolha previa do usuario (anti-FOUC root)
    let themeGlobal = null;
    try {
      const t = localStorage.getItem("mz-theme");
      if (t === "dark" || t === "light") themeGlobal = t;
    } catch {}
    // 4. preferencia do sistema operacional (Cesar 27/04: respeitar
    //    configuracao do equipamento do usuario quando ele nao escolheu).
    //    Se OS reporta dark, usa dark. Senao, usa light (default).
    let themeFromSystem = null;
    try {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        themeFromSystem = "dark";
      } else {
        themeFromSystem = "light";
      }
    } catch {}
    // 4. role real da sessao
    let sessionRole = null;
    let userName = null;
    try {
      const raw = localStorage.getItem("ub_user");
      if (raw) {
        const u = JSON.parse(raw);
        sessionRole = ROLE_MAP[String(u?.perfil || "").toUpperCase()] || null;
        userName = u?.nome || null;
      }
    } catch {}

    // Ordem de prioridade do tema:
    //   1. ?theme=...        (link explicito)
    //   2. localStorage      (escolha previa do usuario)
    //   3. prefs.theme       (preferencias do tweak panel - se houver)
    //   4. prefers-color-scheme do SO
    //   5. fallback Light    (default conservador, escolha Cesar 27/04)
    const finalTheme =
      themeFromQS ||
      themeGlobal ||
      prefs.theme ||
      themeFromSystem ||
      DEFAULT_STATE.theme;
    const finalTenant = prefs.tenant || DEFAULT_STATE.tenant;

    // Se veio de querystring, persiste pro proximo load
    if (themeFromQS) {
      try { localStorage.setItem("mz-theme", themeFromQS); } catch {}
    }

    // Aplica no <html> imediatamente (data-theme + data-tenant)
    // data-tenant="uniao-brasil" eh o slug usado pelos tokens em globals-mazzel.css
    document.documentElement.setAttribute("data-theme", finalTheme);
    document.documentElement.setAttribute("data-tenant", "uniao-brasil");

    setState((s) => ({
      ...s,
      role: prefs.role || sessionRole || s.role,
      tenant: finalTenant,
      theme: finalTheme,
      sessionRole,
      userName: userName || s.userName,
      userInitials: userName ? initialsOf(userName) : s.userInitials,
    }));
  }, []);

  const persistPrefs = (patch) => {
    try {
      const cur = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      localStorage.setItem(LS_KEY, JSON.stringify({ ...cur, ...patch }));
    } catch {}
  };

  const setRole = (r) => {
    if (!ROLE_ORDER.includes(r)) return;
    setState((s) => ({ ...s, role: r }));
    persistPrefs({ role: r });
  };

  const setTenant = (t) => {
    setState((s) => ({ ...s, tenant: t }));
    persistPrefs({ tenant: t });
  };

  const setTheme = (t) => {
    if (t !== "dark" && t !== "light") return;
    setState((s) => ({ ...s, theme: t }));
    try { localStorage.setItem("mz-theme", t); } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", t);
    }
  };

  const toggleTheme = () =>
    setTheme(state.theme === "dark" ? "light" : "dark");

  return (
    <PlatformContext.Provider value={{ ...state, setRole, setTenant, setTheme, toggleTheme }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  return useContext(PlatformContext);
}
