/* Root App - routing + tweak panel + tenant/theme */

const { useState: useAState, useEffect: useAEffect, useCallback: useACb } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "tenant": "uniao",
  "role": "presidente",
  "theme": "dark"
}/*EDITMODE-END*/;

function applyTenant(tenantId) {
  const t = TENANTS[tenantId] || TENANTS.uniao;
  const r = document.documentElement.style;
  r.setProperty("--tenant-primary", t.primary);
  r.setProperty("--tenant-primary-rgb", t.primaryRgb);
  r.setProperty("--tenant-accent", t.accent);
  r.setProperty("--tenant-nome", `"${t.nome}"`);
  r.setProperty("--tenant-sigla", `"${t.sigla}"`);
}

function TweakPanel({ visible, state, onChange }) {
  if (!visible) return null;
  return (
    <div className="tweak-panel">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-bold t-fg-strong">Tweaks</div>
        <div className="text-[10px] t-fg-dim tracking-wider uppercase">Protótipo</div>
      </div>

      <div className="space-y-3.5">
        <div>
          <div className="text-[10px] t-fg-dim uppercase tracking-wider font-semibold mb-1.5">Cliente (white-label)</div>
          <div className="flex gap-1 p-0.5 rounded-md" style={{ background: "var(--rule)" }}>
            {Object.values(TENANTS).map(t => (
              <button key={t.id} onClick={() => onChange({ tenant: t.id })}
                      className={`btn-ghost flex-1 justify-center ${state.tenant === t.id ? "active" : ""}`} style={{ padding: "6px 8px", fontSize: 11 }}>
                <span className="party-dot" style={{ background: t.primary }}/>{t.sigla}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] t-fg-dim uppercase tracking-wider font-semibold mb-1.5">Perfil de acesso</div>
          <div className="flex gap-1 p-0.5 rounded-md" style={{ background: "var(--rule)" }}>
            {Object.entries(ROLES).map(([k, v]) => (
              <button key={k} onClick={() => onChange({ role: k })}
                      className={`btn-ghost flex-1 justify-center ${state.role === k ? "active" : ""}`} style={{ padding: "6px 8px", fontSize: 11 }}>{v.label}</button>
            ))}
          </div>
          <div className="text-[10.5px] t-fg-dim mt-1.5">{ROLES[state.role].scope}</div>
        </div>

        <div>
          <div className="text-[10px] t-fg-dim uppercase tracking-wider font-semibold mb-1.5">Tema</div>
          <div className="flex gap-1 p-0.5 rounded-md" style={{ background: "var(--rule)" }}>
            <button onClick={() => onChange({ theme: "dark" })}
                    className={`btn-ghost flex-1 justify-center ${state.theme === "dark" ? "active" : ""}`} style={{ padding: "6px 8px", fontSize: 11 }}>
              <Icon name="Moon" size={11}/> Dark
            </button>
            <button onClick={() => onChange({ theme: "light" })}
                    className={`btn-ghost flex-1 justify-center ${state.theme === "light" ? "active" : ""}`} style={{ padding: "6px 8px", fontSize: 11 }}>
              <Icon name="Sun" size={11}/> Light
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [tweaks, setTweaks] = useAState(TWEAK_DEFAULTS);
  const [tweakVisible, setTweakVisible] = useAState(false);
  const [module, setModule] = useAState(() => (localStorage.getItem("mazzel-module") || "home"));
  const [cmdk, setCmdk] = useAState(false);

  /* apply tenant/theme */
  useAEffect(() => { applyTenant(tweaks.tenant); }, [tweaks.tenant]);
  useAEffect(() => { document.body.dataset.theme = tweaks.theme; }, [tweaks.theme]);
  useAEffect(() => { localStorage.setItem("mazzel-module", module); }, [module]);

  /* if role changes and current module not allowed, go home */
  useAEffect(() => {
    const m = MODULES.find(x => x.id === module);
    if (m && !m.roles.includes(tweaks.role)) setModule("home");
  }, [tweaks.role, module]);

  /* cmd+K */
  useAEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmdk(c => !c); }
      if (e.key === "Escape") setCmdk(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* edit mode bridge */
  useAEffect(() => {
    const handler = (e) => {
      if (e?.data?.type === "__activate_edit_mode") setTweakVisible(true);
      if (e?.data?.type === "__deactivate_edit_mode") setTweakVisible(false);
    };
    window.addEventListener("message", handler);
    try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch {}
    return () => window.removeEventListener("message", handler);
  }, []);

  const applyTweaks = useACb((partial) => {
    setTweaks(prev => {
      const next = { ...prev, ...partial };
      try { window.parent.postMessage({ type: "__edit_mode_set_keys", edits: partial }, "*"); } catch {}
      return next;
    });
  }, []);

  const breadcrumbs = React.useMemo(() => {
    const t = TENANTS[tweaks.tenant];
    const m = MODULES.find(x => x.id === module);
    return [t.nome, m ? m.label : "Dashboard"];
  }, [tweaks.tenant, module]);

  const renderModule = () => {
    const props = { tenant: tweaks.tenant, role: tweaks.role, onNavigate: setModule };
    switch (module) {
      case "home":      return <ModuleHome {...props} />;
      case "mapa":      return <ModuleMapa {...props} />;
      case "radar":     return <ModuleRadar {...props} />;
      case "dossie":    return <ModuleDossieFull {...props} />;
      case "estudo":    return <ModuleEstudo {...props} />;
      case "delegados": return <ModuleDelegados {...props} />;
      case "filiados":  return <ModuleFiliados {...props} />;
      case "ia":        return <ModuleIA {...props} />;
      case "alertas":   return <ModuleAlertas {...props} />;
      case "portal":    return <ModulePortal {...props} />;
      case "admin":     return <ModuleAdmin {...props} />;
      default:          return <ModuleHome {...props} />;
    }
  };

  return (
    <div className="shell" data-role={tweaks.role}>
      <div className="shell-body">
        <Sidebar tenant={tweaks.tenant} role={tweaks.role} activeModule={module} onNavigate={setModule} />
        <div className="shell-main">
          <Topbar tenant={tweaks.tenant} role={tweaks.role} onOpenCmdk={() => setCmdk(true)} breadcrumbs={breadcrumbs} />
          <div className="main-scroll">{renderModule()}</div>
        </div>
      </div>
      <CmdKPalette open={cmdk} onClose={() => setCmdk(false)} onNavigate={setModule} />
      <TweakPanel visible={tweakVisible} state={tweaks} onChange={applyTweaks} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
