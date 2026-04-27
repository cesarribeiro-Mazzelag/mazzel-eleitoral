"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { TENANTS } from "./data";
import { MODULES } from "./rbac";
import { PlatformProvider, usePlatform } from "./PlatformContext";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CmdKPalette } from "./CmdKPalette";

function matchModule(pathname) {
  if (!pathname) return "home";
  if (pathname === "/mazzel-preview" || pathname === "/mazzel-preview/") return "home";
  if (pathname.startsWith("/mazzel-preview/dossies")) return "dossies";
  if (pathname.startsWith("/mazzel-preview/afiliados")) return "filiados";
  if (pathname.startsWith("/mazzel-preview/cabos-gestao"))  return "cabos-gestao";
  if (pathname.startsWith("/mazzel-preview/cabo/agenda"))   return "agenda_dia";
  if (pathname.startsWith("/mazzel-preview/cabo/area"))     return "minha_area";
  if (pathname.startsWith("/mazzel-preview/cabo/metas"))    return "metas_sem";
  if (pathname.startsWith("/mazzel-preview/cabo/registro")) return "registro";
  if (pathname.startsWith("/mazzel-preview/mandato/compromissos")) return "compromissos";
  if (pathname.startsWith("/mazzel-preview/mandato/estrutura"))    return "estrutura_partido";
  const seg = pathname.replace(/^\/mazzel-preview\//, "").split("/")[0];
  return seg || "home";
}

function ShellInner({ children, alertCount }) {
  const pathname = usePathname();
  const { tenant, role, theme, userName, userInitials } = usePlatform();
  const [cmdk, setCmdk] = useState(false);

  useEffect(() => {
    // PlatformContext.setTheme ja aplica data-theme no html; este efeito cobre
    // o caso de mount inicial (quando o anti-FOUC ja setou html mas o body nao).
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const t = TENANTS[tenant] || TENANTS.uniao;
    const r = document.documentElement.style;
    r.setProperty("--tenant-primary", t.primary);
    r.setProperty("--tenant-primary-rgb", t.primaryRgb);
    r.setProperty("--tenant-accent", t.accent);
    r.setProperty("--tenant-nome", `"${t.nome}"`);
    r.setProperty("--tenant-sigla", `"${t.sigla}"`);
  }, [tenant]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdk((c) => !c);
      }
      if (e.key === "Escape") setCmdk(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeModule = matchModule(pathname);

  const breadcrumbs = useMemo(() => {
    const t = TENANTS[tenant] || TENANTS.uniao;
    const m = MODULES.find((x) => x.id === activeModule);
    return [t.productName || t.nome, m ? m.label : "Dashboard"];
  }, [tenant, activeModule]);

  return (
    <div className="shell" data-role={role}>
      <div className="shell-body">
        <Sidebar
          tenant={tenant}
          role={role}
          activeModule={activeModule}
          userName={userName}
          userInitials={userInitials}
        />
        <div className="shell-main">
          <Topbar
            role={role}
            breadcrumbs={breadcrumbs}
            alertCount={alertCount}
            onOpenCmdk={() => setCmdk(true)}
          />
          <div className="main-scroll">{children}</div>
        </div>
      </div>
      <CmdKPalette open={cmdk} onClose={() => setCmdk(false)} role={role} />
    </div>
  );
}

export function Shell({ children, alertCount = 0 }) {
  return (
    <PlatformProvider>
      <ShellInner alertCount={alertCount}>{children}</ShellInner>
    </PlatformProvider>
  );
}
