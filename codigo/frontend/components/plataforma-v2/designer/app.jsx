/* App shell: sidebar + content + tweaks */

const DEFAULTS = /*EDITMODE-BEGIN*/{
  "profile": "wagner",
  "alert": false,
  "theme": "light",
  "cargo": "SEN",
  "densidade": "completo"
}/*EDITMODE-END*/;

function App() {
  const [state, setState] = useState(() => {
    try { const s = localStorage.getItem("dossie-state"); if (s) return { ...DEFAULTS, ...JSON.parse(s) }; } catch(e){}
    return DEFAULTS;
  });
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [activeId, setActiveId] = useState("sec-identidade");
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    document.body.dataset.theme = state.theme;
    try { localStorage.setItem("dossie-state", JSON.stringify(state)); } catch(e){}
  }, [state]);

  // edit-mode bridge
  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data) return;
      if (e.data.type === "__activate_edit_mode")  setTweaksOpen(true);
      if (e.data.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const updateState = (next) => {
    setState(next);
    const keys = {};
    for (const k of Object.keys(next)) if (next[k] !== state[k]) keys[k] = next[k];
    if (Object.keys(keys).length) window.parent.postMessage({ type: "__edit_mode_set_keys", edits: keys }, "*");
  };

  // active section tracking
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const pct = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      setScrollPct(pct);
      for (const n of NAV) {
        const el = document.getElementById(n.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.35 && r.bottom > 0) { setActiveId(n.id); }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onNavClick = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 20, behavior: "smooth" });
  };

  const profile = PROFILES[state.profile];

  return (
    <div className="shell-grid">
      <Sidebar profile={profile} activeId={activeId} onNavClick={onNavClick} scrollPct={scrollPct}/>
      <div className="min-w-0">
        <TopBar profile={profile}
          theme={state.theme}
          onToggleTheme={() => updateState({ ...state, theme: state.theme==="dark"?"light":"dark" })}/>
        <div className="p-6 space-y-8 max-w-[1400px]">
          <HeaderHero profile={profile} alert={state.alert}/>
          <OverallMap profile={profile}/>
          <MapaEleitoral profile={profile}/>
          <TrajetoriaTimeline profile={profile}/>
          <AtividadeLegislativa profile={profile}/>
          <AlertasJuridicos profile={profile}/>
          <Financeiro profile={profile}/>
          <Emendas profile={profile}/>
          <Perfil profile={profile}/>
          <div className="py-8 text-center text-[10px] font-mono t-fg-ghost tracking-[0.2em]">
            FIM DO DOSSIÊ · v2.4.1 · {profile.firstName} {profile.lastName}
          </div>
        </div>
      </div>
      {tweaksOpen && <TweaksPanel state={state} setState={updateState} onClose={()=>setTweaksOpen(false)}/>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
