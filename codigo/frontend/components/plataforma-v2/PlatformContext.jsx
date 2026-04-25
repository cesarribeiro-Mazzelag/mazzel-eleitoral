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
  theme: "dark",
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
    // 2. tema global (mz-theme) - usado pelo anti-FOUC root
    let themeGlobal = null;
    try {
      const t = localStorage.getItem("mz-theme");
      if (t === "dark" || t === "light") themeGlobal = t;
    } catch {}
    // 3. role real da sessao
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
    setState((s) => ({
      ...s,
      role: prefs.role || sessionRole || s.role,
      tenant: prefs.tenant || s.tenant,
      theme: themeGlobal || prefs.theme || s.theme,
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
