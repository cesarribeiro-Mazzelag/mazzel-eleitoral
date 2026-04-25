/* Stub modules + Dossie integration */

function ModuleStub({ title, subtitle, onNavigate }) {
  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1200px] mx-auto px-8 py-10">
        <div className="mb-6">
          <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">{title}</div>
          <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">{subtitle}</h1>
        </div>
        <div className="t-bg-card ring-soft rounded-xl p-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl t-bg-tenant-soft mb-4">
            <Icon name="Sparkles" size={22} className="t-tenant" />
          </div>
          <div className="text-[18px] font-semibold t-fg-strong">Módulo em desenvolvimento</div>
          <div className="text-[13px] t-fg-muted mt-1 max-w-md mx-auto">Esta seção já está prototipada no backlog. Use os módulos abaixo enquanto isso.</div>
          <div className="flex items-center justify-center gap-2 mt-5">
            <button className="btn-ghost" onClick={() => onNavigate("home")}>← Dashboard</button>
            <button className="btn-ghost" onClick={() => onNavigate("radar")}>Radar</button>
            <button className="btn-ghost" onClick={() => onNavigate("mapa")}>Mapa</button>
            <button className="btn-ghost" onClick={() => onNavigate("dossie")}>Dossiês</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleDossie({ onNavigate }) {
  const [openFull, setOpenFull] = React.useState(false);
  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Dossiês políticos</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">Biblioteca de dossiês</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">Selecione um político para abrir o dossiê completo — Overall FIFA, radar de dimensões, histórico, emendas, processos e mídia.</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-primary" onClick={() => window.open("Header Hero.html", "_blank")}>
              <Icon name="FileSearch" size={13}/> Abrir dossiê completo · Jaques Wagner
            </button>
          </div>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(186px, 1fr))" }}>
          {RADAR_CANDIDATOS.map(c => (
            <FifaMiniCard key={c.id} c={c} onClick={() => {
              if (c.nome === "Jaques Wagner") window.open("Header Hero.html", "_blank");
              else alert(`Dossiê completo: ${c.nome} — mockado neste protótipo. O dossiê de Jaques Wagner está completo (botão acima).`);
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ModuleStub, ModuleDossie });
