"use client";

/* Modulo IDs · Convites - Designer V1.2 F4 06 + briefing § 12.
 *
 * Wizard 3 passos (Discord-style aplicado à política):
 *   1. Como adicionar (Buscar CPF/email · Link · Designar filiado)
 *   2. Escolher cargo/tipo (com permissões pré-explicadas)
 *   3. Confirmar e enviar
 *
 * IDs Discord-style: tenant:ub · dir:ub:sp:3550308 · pol:milton-leite. */

import { useState, useMemo } from "react";
import { Icon } from "../Icon";
import {
  CONVITES_KPIS,
  CONVITES_LIST,
  CONVITES_ID_EXAMPLES,
  CONVITES_MODOS,
  CONVITES_PERFIS,
} from "../data";

const STATUS_COLOR = {
  pendente: { bg: "rgba(245,158,11,0.12)", fg: "#d97706", label: "Aguardando" },
  aceito:   { bg: "rgba(34,197,94,0.12)",  fg: "#16a34a", label: "Aceito"     },
  recusado: { bg: "rgba(161,161,170,0.12)", fg: "#71717a", label: "Recusado"  },
};

const MODO_LABEL = {
  cpf:        { label: "Busca CPF",  icon: "🔍" },
  link:       { label: "Link",       icon: "🔗" },
  filiado:    { label: "Filiado",    icon: "👤" },
  designacao: { label: "Designação", icon: "↳"  },
};

const EXPIRACAO_OPTS = [
  { k: "24h",    label: "24 horas",   sub: "uso único" },
  { k: "7d",     label: "7 dias",     sub: "uso único" },
  { k: "30d",    label: "30 dias",    sub: "uso múltiplo (até 50)" },
  { k: "never",  label: "Sem expirar", sub: "uso múltiplo · revogável" },
];

/* ============ Wizard ============ */

function StepDots({ step, total = 3 }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors"
            style={{
              background: i + 1 <= step ? "var(--tenant-primary)" : "var(--bg-card-2)",
              color:      i + 1 <= step ? "#fff" : "var(--fg-faint)",
              border:     `1px solid ${i + 1 <= step ? "var(--tenant-primary)" : "var(--rule)"}`,
            }}
          >
            {i + 1}
          </div>
          {i < total - 1 && (
            <div
              className="w-12 h-[2px]"
              style={{ background: i + 1 < step ? "var(--tenant-primary)" : "var(--rule)" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ModoCard({ modo, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-lg p-4 transition-all"
      style={{
        background: selected ? "var(--tenant-primary-soft)" : "var(--bg-card)",
        border: `1px solid ${selected ? "var(--tenant-accent)" : "var(--rule)"}`,
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = "var(--rule-strong)"; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = "var(--rule)"; }}
    >
      <div className="text-[28px] mb-2">{modo.icon}</div>
      <div className="text-[14px] font-bold t-fg-strong mb-0.5">{modo.titulo}</div>
      <div className="text-[11px] t-fg-muted mb-2">{modo.sub}</div>
      <div className="text-[11.5px] t-fg leading-snug">{modo.desc}</div>
    </button>
  );
}

function PerfilCard({ perfil, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-md p-3 transition-all w-full"
      style={{
        background: selected ? "var(--tenant-primary-soft)" : "var(--bg-card)",
        border: `1px solid ${selected ? "var(--tenant-accent)" : "var(--rule)"}`,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <b className="text-[13px] t-fg-strong">{perfil.label}</b>
        <span
          className="text-[9.5px] tracking-[0.06em] uppercase font-bold px-1.5 py-[1px] rounded"
          style={{ background: "var(--bg-card-2)", color: "var(--fg-muted)" }}
        >
          {perfil.group}
        </span>
      </div>
      <div className="text-[10.5px] t-fg-muted leading-snug mb-1.5">
        <b className="t-fg">Permissões:</b> {perfil.perms}
      </div>
      <div className="text-[10.5px] t-fg-faint">
        <b>Escopo:</b> {perfil.escopo_label}
      </div>
    </button>
  );
}

function WizardModal({ onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [modo, setModo] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [contato, setContato] = useState("");
  const [escopo, setEscopo] = useState("SP · Capital");
  const [expiracao, setExpiracao] = useState("7d");

  const modoData = CONVITES_MODOS.find((m) => m.k === modo);
  const perfilData = CONVITES_PERFIS.find((p) => p.k === perfil);

  function next() {
    if (step === 1 && !modo) return;
    if (step === 2 && !perfil) return;
    setStep((s) => Math.min(3, s + 1));
  }
  function prev() { setStep((s) => Math.max(1, s - 1)); }

  function submit() {
    onSubmit({ modo, perfil, contato, escopo, expiracao });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl w-full max-w-3xl flex flex-col"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--rule-strong)",
          maxHeight: "90vh",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--rule)" }}
        >
          <div>
            <div className="text-[10.5px] t-fg-faint tracking-[0.16em] uppercase font-bold">Wizard · 3 passos</div>
            <h2 className="text-[18px] font-bold t-fg-strong mt-0.5">
              {step === 1 ? "Como adicionar?" :
               step === 2 ? "Cargo / tipo" :
               "Confirmar e enviar"}
            </h2>
          </div>
          <StepDots step={step} />
        </header>

        <div className="flex-1 overflow-auto px-6 py-5">
          {step === 1 && (
            <>
              <div className="text-[12.5px] t-fg-muted mb-4 leading-relaxed">
                3 modos de adicionar pessoa. Briefing 25/04: <b className="t-fg">"em qualquer tela onde se adiciona pessoa, a UI é idêntica"</b> — consistência cognitiva.
              </div>
              <div className="grid grid-cols-3 gap-3">
                {CONVITES_MODOS.map((m) => (
                  <ModoCard
                    key={m.k}
                    modo={m}
                    selected={modo === m.k}
                    onClick={() => setModo(m.k)}
                  />
                ))}
              </div>

              {modo === "cpf" && (
                <div
                  className="mt-5 rounded-lg p-4"
                  style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}
                >
                  <label className="text-[10px] t-fg-faint tracking-[0.14em] uppercase font-bold block mb-1.5">
                    CPF, e-mail ou título eleitoral
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={contato}
                    onChange={(e) => setContato(e.target.value)}
                    placeholder="123.456.789-00 · pessoa@email.com · 0000.0000.0000"
                    className="w-full text-[13px] px-3 py-2 rounded-md outline-none"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--rule)",
                      color: "var(--fg)",
                    }}
                  />
                  <div className="text-[10.5px] t-fg-faint mt-1.5">
                    Plataforma busca em filiados TSE + base interna. Se não achar, oferece convidar por e-mail.
                  </div>
                </div>
              )}

              {modo === "link" && (
                <div
                  className="mt-5 rounded-lg p-4"
                  style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}
                >
                  <label className="text-[10px] t-fg-faint tracking-[0.14em] uppercase font-bold block mb-2">
                    Expiração do link
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {EXPIRACAO_OPTS.map((e) => (
                      <button
                        key={e.k}
                        type="button"
                        onClick={() => setExpiracao(e.k)}
                        className="rounded-md px-3 py-2 text-left transition-colors"
                        style={{
                          background: expiracao === e.k ? "var(--tenant-primary-soft)" : "var(--bg-card)",
                          border: `1px solid ${expiracao === e.k ? "var(--tenant-accent)" : "var(--rule)"}`,
                        }}
                      >
                        <div className="text-[12px] font-bold t-fg-strong">{e.label}</div>
                        <div className="text-[10px] t-fg-muted">{e.sub}</div>
                      </button>
                    ))}
                  </div>
                  <div className="text-[10.5px] t-fg-faint mt-3">
                    Link gerado: <code className="px-1 rounded" style={{ background: "var(--bg-card)", fontFamily: "JetBrains Mono, monospace", color: "var(--tenant-accent)" }}>app.mazzelag.com/convite/dir:ub:sp:3550308?token=xyz</code>
                  </div>
                </div>
              )}

              {modo === "filiado" && (
                <div
                  className="mt-5 rounded-lg p-4"
                  style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}
                >
                  <label className="text-[10px] t-fg-faint tracking-[0.14em] uppercase font-bold block mb-1.5">
                    Filtrar filiados ativos
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Buscar entre os 124.847 filiados UB-SP..."
                    className="w-full text-[13px] px-3 py-2 rounded-md outline-none"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--rule)",
                      color: "var(--fg)",
                    }}
                  />
                  <div className="text-[10.5px] t-fg-faint mt-1.5">
                    Cabo, Coord e Membro de comissão são designados a partir de filiados existentes.
                  </div>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-[12.5px] t-fg-muted mb-4 leading-relaxed">
                Escolha o cargo. As <b className="t-fg-strong">permissões</b> e <b className="t-fg-strong">escopo</b> são pré-explicadas — sem surpresa pra quem aceita.
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CONVITES_PERFIS.map((p) => (
                  <PerfilCard
                    key={p.k}
                    perfil={p}
                    selected={perfil === p.k}
                    onClick={() => setPerfil(p.k)}
                  />
                ))}
              </div>

              {perfil && (
                <div
                  className="mt-5 rounded-lg p-4"
                  style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}
                >
                  <label className="text-[10px] t-fg-faint tracking-[0.14em] uppercase font-bold block mb-1.5">
                    Escopo específico
                  </label>
                  <input
                    type="text"
                    value={escopo}
                    onChange={(e) => setEscopo(e.target.value)}
                    placeholder="Ex.: SP · Capital · Zona Sul · Capão Redondo"
                    className="w-full text-[13px] px-3 py-2 rounded-md outline-none"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--rule)",
                      color: "var(--fg)",
                    }}
                  />
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className="text-[12.5px] t-fg-muted mb-4 leading-relaxed">
                Revisar e confirmar. Depois disso, convite é gerado, contato recebe push/e-mail/WhatsApp e fica registrado no log de auditoria.
              </div>
              <div
                className="rounded-lg p-5 mb-4"
                style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}
              >
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-[12.5px]">
                  <div>
                    <div className="text-[10px] t-fg-faint uppercase tracking-wider mb-1 font-bold">Modo</div>
                    <div className="t-fg-strong font-semibold">{modoData?.icon} {modoData?.titulo}</div>
                  </div>
                  <div>
                    <div className="text-[10px] t-fg-faint uppercase tracking-wider mb-1 font-bold">Cargo</div>
                    <div className="t-fg-strong font-semibold">{perfilData?.label}</div>
                  </div>
                  {contato && (
                    <div className="col-span-2">
                      <div className="text-[10px] t-fg-faint uppercase tracking-wider mb-1 font-bold">Contato</div>
                      <div className="t-fg-strong font-semibold tabular-nums" style={{ fontFamily: "JetBrains Mono, monospace" }}>{contato}</div>
                    </div>
                  )}
                  <div className="col-span-2">
                    <div className="text-[10px] t-fg-faint uppercase tracking-wider mb-1 font-bold">Escopo</div>
                    <div className="t-fg-strong font-semibold">{escopo}</div>
                  </div>
                  {modo === "link" && (
                    <div className="col-span-2">
                      <div className="text-[10px] t-fg-faint uppercase tracking-wider mb-1 font-bold">Expiração</div>
                      <div className="t-fg-strong font-semibold">
                        {EXPIRACAO_OPTS.find((e) => e.k === expiracao)?.label}
                      </div>
                    </div>
                  )}
                  <div className="col-span-2">
                    <div className="text-[10px] t-fg-faint uppercase tracking-wider mb-1 font-bold">Permissões automáticas</div>
                    <div className="text-[11.5px] t-fg leading-snug">{perfilData?.perms}</div>
                  </div>
                </div>
              </div>
              <div
                className="rounded-md p-3 flex items-start gap-2.5 text-[11.5px] t-fg-muted"
                style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.20)" }}
              >
                <span style={{ color: "#16a34a" }}>✓</span>
                <span>2FA TOTP obrigatório no primeiro login. Convite registrado em <b className="t-fg-strong">auditoria_log</b> · LGPD-compliant.</span>
              </div>
            </>
          )}
        </div>

        <footer
          className="px-6 py-4 border-t flex items-center justify-between"
          style={{ borderColor: "var(--rule)", background: "var(--bg-card-2)" }}
        >
          <div className="text-[11px] t-fg-faint">
            Passo <b className="t-fg-strong">{step}</b> de 3
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost text-[12px]"
              style={{ padding: "7px 14px" }}
            >
              Cancelar
            </button>
            {step > 1 && (
              <button
                type="button"
                onClick={prev}
                className="btn-ghost text-[12px]"
                style={{ padding: "7px 14px" }}
              >
                ← Anterior
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={next}
                disabled={(step === 1 && !modo) || (step === 2 && !perfil)}
                className="btn-primary text-[12px]"
                style={{
                  padding: "7px 14px",
                  opacity: ((step === 1 && !modo) || (step === 2 && !perfil)) ? 0.5 : 1,
                  cursor: ((step === 1 && !modo) || (step === 2 && !perfil)) ? "not-allowed" : "pointer",
                }}
              >
                Próximo →
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                className="btn-primary text-[12px]"
                style={{ padding: "7px 14px" }}
              >
                <Icon name="Check" size={12} />Enviar convite
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ============ Lista + IDs side ============ */

export function Convites() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [filter, setFilter] = useState("todos");

  const filtered = useMemo(() => {
    if (filter === "todos") return CONVITES_LIST;
    return CONVITES_LIST.filter((c) => c.status === filter);
  }, [filter]);

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1400px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Sistema IDs</div>
            <h1 className="text-[28px] font-display font-bold t-fg-strong mt-1 leading-none">IDs · Convites · 2FA</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">
              Discord-style aplicado à política. Cada entidade tem ID curto. 5 modos de adicionar pessoas. Wizard 3 passos.
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" type="button"><Icon name="Filter" size={13} />Filtrar</button>
            <button className="btn-primary" type="button" onClick={() => setWizardOpen(true)}>
              <Icon name="Plus" size={13} />Novo convite
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {CONVITES_KPIS.map((k) => (
            <div key={k.l} className="rounded-md p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}>
              <div className="text-[9.5px] t-fg-faint uppercase tracking-[0.16em] font-bold">{k.l}</div>
              <div className="text-[26px] font-bold tabular-nums leading-none mt-1.5 t-fg-strong">{k.v}</div>
              <div className="text-[10.5px] t-fg-muted mt-1">{k.d}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 360px" }}>
          {/* Lista de convites */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-bold t-fg-strong">Convites recentes</h2>
              <div className="flex gap-1.5">
                {[
                  { k: "todos",    l: "Todos" },
                  { k: "pendente", l: "Pendentes" },
                  { k: "aceito",   l: "Aceitos" },
                  { k: "recusado", l: "Recusados" },
                ].map((f) => {
                  const on = filter === f.k;
                  return (
                    <button
                      key={f.k}
                      type="button"
                      onClick={() => setFilter(f.k)}
                      className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors"
                      style={{
                        background: on ? "var(--tenant-primary)" : "var(--bg-card)",
                        color: on ? "#fff" : "var(--fg-muted)",
                        border: `1px solid ${on ? "var(--tenant-primary)" : "var(--rule)"}`,
                      }}
                    >
                      {f.l}
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              className="rounded-lg overflow-hidden"
              style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}
            >
              <div
                className="grid items-center gap-3 px-4 py-2.5 text-[10px] t-fg-faint tracking-[0.10em] uppercase font-bold border-b"
                style={{ gridTemplateColumns: "32px 1.4fr 1fr 90px 70px 70px", borderColor: "var(--rule)", background: "var(--bg-card-2)" }}
              >
                <span></span>
                <span>Pessoa</span>
                <span>Cargo · Escopo</span>
                <span>Modo</span>
                <span>Status</span>
                <span className="text-right">Quando</span>
              </div>
              {filtered.map((c) => {
                const sc = STATUS_COLOR[c.status] || STATUS_COLOR.pendente;
                const md = MODO_LABEL[c.modo] || MODO_LABEL.cpf;
                return (
                  <div
                    key={c.id}
                    className="grid items-center gap-3 px-4 py-3 border-b last:border-0"
                    style={{ gridTemplateColumns: "32px 1.4fr 1fr 90px 70px 70px", borderColor: "var(--rule)" }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: "linear-gradient(135deg, var(--tenant-primary), var(--tenant-primary-strong, var(--tenant-primary)))" }}
                    >
                      {c.para.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold t-fg-strong truncate">{c.para}</div>
                      <div className="text-[10.5px] t-fg-muted truncate">{c.email}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11.5px] t-fg-strong font-medium truncate">{c.perfil}</div>
                      <div className="text-[10px] t-fg-faint truncate">{c.escopo}</div>
                    </div>
                    <span
                      className="text-[10px] inline-flex items-center gap-1 px-2 py-[2px] rounded"
                      style={{ background: "var(--bg-card-2)", color: "var(--fg-muted)" }}
                    >
                      {md.icon} {md.label}
                    </span>
                    <span
                      className="text-[10px] font-bold tracking-wider px-2 py-[2px] rounded text-center uppercase"
                      style={{ background: sc.bg, color: sc.fg }}
                    >
                      {sc.label}
                    </span>
                    <span className="text-[10px] t-fg-faint text-right">{c.enviado}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side: IDs Discord-style */}
          <aside
            className="rounded-lg p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--rule)", height: "fit-content" }}
          >
            <h3 className="text-[13px] font-bold t-fg-strong mb-1">Sistema de IDs</h3>
            <p className="text-[11px] t-fg-muted leading-snug mb-3">
              Cada entidade tem ID curto e legível. Estilo Discord (<code style={{ fontFamily: "JetBrains Mono, monospace" }}>discord.gg/xyz</code>) — memorável e compartilhável.
            </p>
            <div className="space-y-2">
              {CONVITES_ID_EXAMPLES.map((ex) => (
                <div
                  key={ex.entidade}
                  className="grid items-start gap-2 py-1.5 border-b last:border-0"
                  style={{ gridTemplateColumns: "20px 1fr", borderColor: "var(--rule)" }}
                >
                  <span className="text-[14px]">{ex.icon}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold t-fg-strong">{ex.entidade}</div>
                    <code
                      className="text-[10.5px] tabular-nums"
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        color: "var(--tenant-accent)",
                      }}
                    >
                      {ex.exemplo}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div
          className="mt-6 rounded-lg p-4 flex items-center gap-3 text-[12px] t-fg-muted"
          style={{ background: "var(--bg-card-2)", border: "1px dashed var(--rule)" }}
        >
          <Icon name="Sparkles" size={14} />
          <span>
            <b className="t-fg-strong">ETL pendente:</b> AWS SES (e-mail) + WhatsApp Business API + 2FA TOTP setup. Backend de auth já existe · falta integração de mensageria.
          </span>
        </div>
      </div>

      {wizardOpen && (
        <WizardModal
          onClose={() => setWizardOpen(false)}
          onSubmit={(data) => console.log("Convite criado:", data)}
        />
      )}
    </div>
  );
}
