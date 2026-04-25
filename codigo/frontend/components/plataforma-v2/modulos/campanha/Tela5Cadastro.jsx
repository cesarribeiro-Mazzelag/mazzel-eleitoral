"use client";

/* Campanha 2026 · Tela 5 · Cadastro de Liderancas.
 * Adaptado de Plataforma-v2.html Tela5Cadastro. */

import { useState, useMemo } from "react";
import { Icon } from "../../Icon";
import { Card, Segment, Avatar } from "./primitives";
import { LIDERANCAS } from "./data";

const TIER_CHIP = {
  ouro:   { cls: "chip-amber", label: "OURO" },
  prata:  { cls: "chip-muted", label: "PRATA" },
  bronze: { cls: "chip-red",   label: "BRONZE" },
};

function TierPill({ tier }) {
  const t = TIER_CHIP[tier] || TIER_CHIP.bronze;
  return <span className={`chip ${t.cls}`} style={{ height: 20, fontSize: 10 }}>{t.label}</span>;
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] t-fg-dim uppercase tracking-wider font-semibold mb-1.5">{label}</div>
      {children}
    </div>
  );
}

const TAG_OPTIONS = ["Mulher", "Jovem", "Idoso", "Religioso", "Comunidade", "Destaque", "Atenção"];

export function Tela5Cadastro() {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    return LIDERANCAS.filter((l) => {
      if (filtro === "ouro" && l.tier !== "ouro") return false;
      if (filtro === "mulher" && !l.tags.includes("Mulher")) return false;
      if (q && !(l.nome.toLowerCase().includes(q.toLowerCase()) || l.cidade.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [q, filtro]);

  return (
    <div className="p-6" style={{ maxWidth: 1680, margin: "0 auto" }}>
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 400px" }}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-[22px] font-black font-display t-fg-strong">Lideranças</h1>
              <div className="text-[12px] t-fg-muted mt-0.5">
                {filtered.length} de {LIDERANCAS.length} · presença, tiers, cercas
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div
                className="flex items-center gap-2 px-3 h-[34px] rounded-md"
                style={{ background: "var(--rule)", width: 260 }}
              >
                <Icon name="Search" size={12} className="t-fg-dim" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nome ou cidade..."
                  className="flex-1 bg-transparent outline-none text-[12px]"
                  style={{ color: "var(--fg)" }}
                />
              </div>
              <Segment
                value={filtro}
                onChange={setFiltro}
                options={[
                  { value: "todos",  label: "Todos" },
                  { value: "ouro",   label: "Ouro" },
                  { value: "mulher", label: "Mulheres" },
                ]}
              />
              <button className="btn-primary" type="button">
                <Icon name="Plus" size={11} />Nova liderança
              </button>
            </div>
          </div>

          <Card title="Lista de lideranças" sub={`${filtered.length} resultado(s)`} noPadding>
            <div
              className="grid items-center gap-3 px-4 py-2"
              style={{
                gridTemplateColumns: "1fr 140px 140px 80px 100px 80px",
                background: "var(--bg-card-2)",
                fontWeight: 600,
                color: "var(--fg-dim)",
                fontSize: 10.5,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              <div>Nome</div>
              <div>Papel</div>
              <div>Cerca</div>
              <div>Tier</div>
              <div className="text-right">Influência</div>
              <div className="text-right">Score</div>
            </div>
            {filtered.map((l) => {
              const scoreColor =
                l.score >= 80 ? "var(--ok)" :
                l.score >= 60 ? "var(--warn)" : "var(--danger)";
              return (
                <div
                  key={l.id}
                  className="grid items-center gap-3 px-4 py-3 cursor-pointer"
                  style={{
                    gridTemplateColumns: "1fr 140px 140px 80px 100px 80px",
                    borderBottom: "1px solid var(--rule)",
                    background: editing?.id === l.id ? "var(--chart-hover)" : "transparent",
                  }}
                  onClick={() => setEditing(l)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar nome={l.nome} size={30} />
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold t-fg-strong truncate">{l.nome}</div>
                      <div className="text-[10.5px] t-fg-dim truncate">{l.cidade} · {l.tags.join(" · ")}</div>
                    </div>
                  </div>
                  <div className="text-[11.5px] t-fg-muted truncate">{l.papel}</div>
                  <div className="text-[11.5px] t-fg-muted truncate">{l.cerca || "-"}</div>
                  <div><TierPill tier={l.tier} /></div>
                  <div className="text-[11.5px] tnum t-fg text-right">
                    {l.eleitoresInfluenciados.toLocaleString("pt-BR")}
                  </div>
                  <div
                    className="text-[13px] font-bold tnum text-right"
                    style={{ color: scoreColor }}
                  >
                    {l.score}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        <Card
          title={editing ? "Editar liderança" : "Nova liderança"}
          sub={editing ? editing.nome : "Formulário rápido"}
          right={
            editing && (
              <button
                className="btn-ghost"
                onClick={() => setEditing(null)}
                style={{ padding: "5px 7px" }}
                type="button"
              >
                <Icon name="X" size={11} />
              </button>
            )
          }
        >
          <div className="space-y-3">
            {[
              { label: "Nome completo",       val: editing?.nome || "",     ph: "Ex: Rita Lima" },
              { label: "Papel",               val: editing?.papel || "",    ph: "Cabo Eleitoral" },
              { label: "Telefone · WhatsApp", val: editing?.telefone || "", ph: "(75) 9 ..." },
              { label: "Cidade",              val: editing?.cidade || "",   ph: "Feira de Santana" },
              { label: "Cerca",               val: editing?.cerca || "",    ph: "Tomba" },
            ].map((f, i) => (
              <Field key={i} label={f.label}>
                <input
                  defaultValue={f.val}
                  placeholder={f.ph}
                  className="w-full h-[34px] px-3 rounded-md outline-none text-[12.5px]"
                  style={{ background: "var(--rule)", color: "var(--fg)" }}
                />
              </Field>
            ))}

            <Field label="Tier">
              <div className="flex gap-1.5">
                {["ouro", "prata", "bronze"].map((t) => (
                  <button
                    key={t}
                    className={`btn-ghost ${editing?.tier === t ? "active" : ""}`}
                    style={{ flex: 1, justifyContent: "center", padding: "7px 8px" }}
                    type="button"
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map((t) => {
                  const on = editing?.tags?.includes(t);
                  return (
                    <span
                      key={t}
                      className={`chip ${on ? "chip-blue" : "chip-muted"}`}
                      style={{ cursor: "pointer" }}
                    >
                      {t}
                    </span>
                  );
                })}
              </div>
            </Field>

            <div className="flex gap-2 pt-2">
              <button
                className="btn-primary flex-1"
                style={{ justifyContent: "center" }}
                type="button"
              >
                <Icon name="Check" size={12} />Salvar
              </button>
              <button
                className="btn-ghost"
                style={{ padding: "8px 12px" }}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
