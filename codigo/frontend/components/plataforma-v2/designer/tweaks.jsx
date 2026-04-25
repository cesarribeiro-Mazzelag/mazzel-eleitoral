/* Tweaks panel */

function TweakToggle({ label, value, options, onChange }) {
  return (
    <div className="mb-3">
      <div className="text-[9px] font-mono tracking-[0.15em] uppercase t-fg-dim mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1">
        {options.map(o => (
          <button key={o.v} onClick={()=>onChange(o.v)}
            className={`btn-ghost ${value===o.v?"active":""}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TweaksPanel({ state, setState, onClose }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 w-[280px] rounded-xl p-4"
      style={{ background:"var(--bg-card)", border:"1px solid var(--rule-strong)", boxShadow:"0 20px 60px -20px rgba(0,0,0,0.6)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-bold tracking-[0.2em] uppercase t-fg-strong">Tweaks</div>
        <button onClick={onClose} className="t-fg-dim hover:t-fg"><XIcon size={14}/></button>
      </div>

      <TweakToggle label="Perfil" value={state.profile}
        options={[{v:"wagner",label:"Wagner"},{v:"marcal",label:"Marçal (esparso)"}]}
        onChange={(v)=>setState({ ...state, profile: v })}/>

      <TweakToggle label="Alerta jurídico (hero)" value={state.alert?"on":"off"}
        options={[{v:"off",label:"Off"},{v:"on",label:"On"}]}
        onChange={(v)=>setState({ ...state, alert: v==="on" })}/>

      <TweakToggle label="Tema" value={state.theme}
        options={[{v:"dark",label:"Dark"},{v:"light",label:"Light"}]}
        onChange={(v)=>setState({ ...state, theme: v })}/>

      <TweakToggle label="Cargo (contextual)" value={state.cargo}
        options={[
          {v:"SEN",label:"Sen"},{v:"DEP_F",label:"Dep F."},{v:"DEP_E",label:"Dep E."},
          {v:"GOV",label:"Gov"},{v:"PRES",label:"Pres"},{v:"PREF",label:"Pref"},{v:"VER",label:"Ver"}
        ]}
        onChange={(v)=>setState({ ...state, cargo: v })}/>

      <TweakToggle label="Densidade" value={state.densidade}
        options={[{v:"completo",label:"Completo"},{v:"esparso",label:"Esparso"}]}
        onChange={(v)=>setState({ ...state, densidade: v })}/>
    </div>
  );
}

Object.assign(window, { TweaksPanel });
