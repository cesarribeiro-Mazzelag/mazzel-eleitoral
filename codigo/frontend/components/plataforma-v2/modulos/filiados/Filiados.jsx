"use client";

/* Módulo Filiados · 1:1 com Designer V1.2 (02-filiados.html)
 *
 * Layout 3 colunas: filtros (240) | lista central (1fr) | perfil (420)
 * 6 abas: Todos · Pendentes DocuSign · Em abono · Sigilosos · A renovar · Auditoria
 * 12 filiados de exemplo · perfil completo de João Mendes (cabo ZL OP-2026-014)
 *
 * Caso âncora canônico: João Mendes da Silva - mostra cadeia abono 3 níveis
 * (Milton Leite → Rita Tavares → João), DocuSign com 6 steps assinados,
 * trail LGPD completo. Substitui /afiliados V1 antigo.
 */

import { useState } from "react";
import {
  KPIS,
  FILTROS,
  TABS,
  FILIADOS,
  SELECIONADOS_DEFAULT,
  PERFIL_ATIVO_DEFAULT,
  PERFIL_DETALHE,
  STATUS_CLASS,
} from "./dados";

export function Filiados() {
  const [tab, setTab] = useState("todos");
  const [perfilAtivoId, setPerfilAtivoId] = useState(PERFIL_ATIVO_DEFAULT);
  const [selecionados, setSelecionados] = useState(SELECIONADOS_DEFAULT);
  const perfil = PERFIL_DETALHE[perfilAtivoId];

  function toggleSelecionado(id) {
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "240px 1fr 420px",
        height: "calc(100vh - 48px)",
        background: "var(--mz-bg-page)",
      }}
    >
      {/* COLUNA ESQUERDA · KPIs + Filtros */}
      <aside style={asideStyle}>
        <div className="kpi-stack" style={{ padding: "14px 16px", borderBottom: "1px solid var(--mz-rule)", display: "flex", flexDirection: "column", gap: 12 }}>
          {KPIS.map((k) => (
            <div
              key={k.label}
              style={{
                background: "var(--mz-bg-card)",
                border: "1px solid var(--mz-rule)",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <div style={lblStyle}>{k.label}</div>
              <div
                style={{
                  fontFamily: "Bebas Neue, sans-serif",
                  fontSize: 28,
                  lineHeight: 1,
                  color: k.valueColor || "var(--mz-fg-strong)",
                  marginTop: 4,
                  letterSpacing: "0.02em",
                }}
              >
                {k.value}
              </div>
              <div
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  fontFamily: "JetBrains Mono, monospace",
                  color:
                    k.deltaTipo === "up" ? "var(--mz-ok)" :
                    k.deltaTipo === "down" ? "var(--mz-danger)" :
                                             "var(--mz-fg-faint)",
                }}
              >
                {k.delta}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--mz-rule)" }}>
          <h3 style={h3Style}>Filtros</h3>
          <FilterGroup label="UF">
            <select style={inputStyle}>
              {FILTROS.ufs.map((u) => <option key={u}>{u}</option>)}
            </select>
          </FilterGroup>
          <FilterGroup label="Município">
            <select style={inputStyle}>
              {FILTROS.municipios.map((m) => <option key={m}>{m}</option>)}
            </select>
          </FilterGroup>
          <FilterGroup label="Status">
            <Chips items={FILTROS.status} />
          </FilterGroup>
          <FilterGroup label="Tags">
            <Chips items={FILTROS.tags} />
          </FilterGroup>
          <FilterGroup label="Filiado desde">
            <select style={inputStyle}>
              {FILTROS.datas.map((d) => <option key={d}>{d}</option>)}
            </select>
          </FilterGroup>
          <FilterGroup label="Abonador">
            <select style={inputStyle}>
              {FILTROS.abonadores.map((a) => <option key={a}>{a}</option>)}
            </select>
          </FilterGroup>
        </div>
      </aside>

      {/* COLUNA CENTRAL · top-bar + tabs + bulk-bar + lista */}
      <main style={{ overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--mz-bg-page)" }}>
        {/* Top bar */}
        <div
          style={{
            padding: "12px 22px",
            borderBottom: "1px solid var(--mz-rule)",
            background: "var(--mz-bg-topbar)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ flex: 1, maxWidth: 480, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: 9, fontSize: 12 }}>🔍</span>
            <input
              defaultValue="cabo eleitoral · zona leste · São Paulo"
              style={{
                width: "100%",
                background: "var(--mz-bg-card)",
                border: "1px solid var(--mz-rule)",
                borderRadius: 8,
                padding: "9px 36px",
                fontSize: 12,
                color: "var(--mz-fg)",
                outline: "none",
              }}
            />
            <span
              style={{
                position: "absolute",
                right: 8,
                top: 7,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                background: "var(--mz-bg-elevated)",
                padding: "2px 6px",
                borderRadius: 3,
                color: "var(--mz-fg-faint)",
              }}
            >
              ⌘K
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn>📥 Importar CSV</Btn>
            <Btn>📤 Exportar (124.812)</Btn>
            <Btn primary>+ Novo Filiado</Btn>
            <Btn tenant>+ Convite c/ Abonador</Btn>
          </div>
        </div>

        {/* Tabs bar */}
        <div
          style={{
            padding: "0 22px",
            borderBottom: "1px solid var(--mz-rule)",
            background: "var(--mz-bg-topbar)",
            display: "flex",
            gap: 0,
          }}
        >
          {TABS.map((t) => {
            const ativo = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "12px 14px",
                  background: "none",
                  border: 0,
                  color: ativo ? "var(--mz-fg-strong)" : "var(--mz-fg-muted)",
                  cursor: "pointer",
                  borderBottom: ativo ? "2px solid var(--mz-tenant-accent)" : "2px solid transparent",
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                {t.label}
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 9.5,
                    background: ativo ? "var(--mz-tenant-accent)" : "var(--mz-bg-card)",
                    padding: "1px 5px",
                    borderRadius: 3,
                    color: ativo ? "var(--mz-fg-on-accent)" : "var(--mz-fg-faint)",
                  }}
                >
                  {t.num}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bulk bar (visible quando há selecionados) */}
        {selecionados.length > 0 && (
          <div
            style={{
              padding: "10px 22px",
              background: "var(--mz-tenant-primary)",
              borderBottom: "1px solid var(--mz-tenant-primary-strong)",
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span>{selecionados.length} filiado{selecionados.length > 1 ? "s" : ""} selecionado{selecionados.length > 1 ? "s" : ""}</span>
            <BulkBtn>📤 Enviar p/ DocuSign em lote</BulkBtn>
            <BulkBtn>🏷️ Aplicar tag</BulkBtn>
            <BulkBtn>📂 Mover para grupo</BulkBtn>
            <BulkBtn>🗑️ Arquivar</BulkBtn>
            <button
              onClick={() => setSelecionados([])}
              style={{
                marginLeft: "auto",
                background: "rgba(255,255,255,0.10)",
                border: 0,
                color: "#fff",
                padding: "5px 10px",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Limpar seleção
            </button>
          </div>
        )}

        {/* Lista */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={listHeadStyle}>
            <span></span>
            <span>Filiado</span>
            <span>Status</span>
            <span>Filiado desde</span>
            <span>Abonador</span>
            <span>Localização</span>
            <span></span>
          </div>
          {FILIADOS.map((f) => {
            const isSelected = selecionados.includes(f.id);
            const isActive = perfilAtivoId === f.id;
            return (
              <div
                key={f.id}
                onClick={() => setPerfilAtivoId(f.id)}
                style={{
                  ...listRowStyle,
                  background: isSelected || isActive ? "var(--mz-tenant-primary-soft)" : undefined,
                  borderLeft: isSelected || isActive ? "3px solid var(--mz-tenant-accent)" : undefined,
                  paddingLeft: isSelected || isActive ? 19 : 22,
                }}
              >
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelecionado(f.id);
                  }}
                  style={{
                    width: 16,
                    height: 16,
                    border: "1.5px solid var(--mz-rule-strong)",
                    borderRadius: 3,
                    background: isSelected ? "var(--mz-tenant-accent)" : "transparent",
                    borderColor: isSelected ? "var(--mz-tenant-accent)" : undefined,
                    display: "inline-block",
                  }}
                />
                <Person iniciais={f.iniciais} nome={f.nome} sub={`CPF ${f.cpfMasked} · ${f.idade}a`} />
                <Cell>
                  <StatusBadge tipo={f.statusKey} label={f.statusLabel} />
                </Cell>
                <Cell>
                  <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{f.desde}</b>
                  <small>{f.duracao}</small>
                </Cell>
                <Cell>
                  {f.abonador !== "—" ? (
                    <>
                      <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{f.abonador}</b>
                      <small>{f.abonadorTipo}</small>
                    </>
                  ) : (
                    <>
                      <span>—</span>
                      <small>{f.abonadorTipo}</small>
                    </>
                  )}
                </Cell>
                <Cell>
                  <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{f.local}</b>
                  <small>{f.localSub}</small>
                </Cell>
                <div style={{ display: "flex", gap: 4, opacity: isSelected || isActive ? 1 : 0 }}>
                  <ActionBtn>✉</ActionBtn>
                  <ActionBtn>📞</ActionBtn>
                  <ActionBtn>⋯</ActionBtn>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* COLUNA DIREITA · Perfil completo */}
      <aside style={asideStyle}>
        {perfil && <PerfilCompleto perfil={perfil} />}
      </aside>
    </div>
  );
}

/* ============ SUBCOMPONENTES ============ */

const asideStyle = {
  background: "var(--mz-bg-sidebar)",
  borderLeft: "1px solid var(--mz-rule)",
  borderRight: "1px solid var(--mz-rule)",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
};

const lblStyle = {
  fontSize: 9,
  letterSpacing: "0.14em",
  color: "var(--mz-fg-faint)",
  textTransform: "uppercase",
  fontWeight: 700,
};

const h3Style = {
  fontSize: 9.5,
  letterSpacing: "0.16em",
  color: "var(--mz-fg-faint)",
  textTransform: "uppercase",
  fontWeight: 700,
  margin: "0 0 10px",
};

const inputStyle = {
  width: "100%",
  background: "var(--mz-bg-card)",
  border: "1px solid var(--mz-rule)",
  borderRadius: 4,
  padding: "6px 9px",
  fontSize: 11.5,
  color: "var(--mz-fg)",
  outline: "none",
};

const listHeadStyle = {
  display: "grid",
  gridTemplateColumns: "28px 1fr 100px 110px 120px 140px 80px",
  gap: 10,
  padding: "10px 22px",
  fontSize: 9.5,
  letterSpacing: "0.14em",
  color: "var(--mz-fg-faint)",
  textTransform: "uppercase",
  fontWeight: 700,
  borderBottom: "1px solid var(--mz-rule)",
  position: "sticky",
  top: 0,
  background: "var(--mz-bg-page)",
  zIndex: 2,
};

const listRowStyle = {
  display: "grid",
  gridTemplateColumns: "28px 1fr 100px 110px 120px 140px 80px",
  gap: 10,
  padding: "12px 22px",
  borderBottom: "1px solid var(--mz-rule)",
  alignItems: "center",
  cursor: "pointer",
  transition: "background 100ms",
};

function FilterGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: "block",
          fontSize: 10,
          color: "var(--mz-fg-faint)",
          marginBottom: 4,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Chips({ items }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
      {items.map((c) => (
        <span
          key={c.label}
          style={{
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 999,
            background: c.on ? "var(--mz-tenant-accent)" : "var(--mz-bg-card)",
            border: c.on ? "1px solid var(--mz-tenant-accent)" : "1px solid var(--mz-rule)",
            color: c.on ? "var(--mz-fg-on-accent)" : "var(--mz-fg-muted)",
            cursor: "pointer",
            fontWeight: c.on ? 700 : 400,
          }}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

function Btn({ children, primary, tenant }) {
  return (
    <button
      style={{
        fontSize: 11.5,
        fontWeight: tenant ? 800 : 600,
        padding: "7px 12px",
        borderRadius: 6,
        border: tenant
          ? "1px solid var(--mz-tenant-accent)"
          : primary
          ? "1px solid var(--mz-tenant-primary-strong)"
          : "1px solid var(--mz-rule)",
        background: tenant
          ? "var(--mz-tenant-accent)"
          : primary
          ? "var(--mz-tenant-primary)"
          : "var(--mz-bg-card)",
        color: tenant ? "var(--mz-fg-on-accent)" : primary ? "#fff" : "var(--mz-fg)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function BulkBtn({ children }) {
  return (
    <button
      style={{
        background: "rgba(255,255,255,0.15)",
        border: 0,
        color: "#fff",
        padding: "5px 10px",
        borderRadius: 4,
        fontSize: 11,
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}

function Person({ iniciais, nome, sub }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "var(--mz-tenant-primary)",
          color: "var(--mz-tenant-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        {iniciais}
      </div>
      <div>
        <b
          style={{
            fontSize: 13,
            color: "var(--mz-fg-strong)",
            display: "block",
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {nome}
        </b>
        <small style={{ fontSize: 10.5, color: "var(--mz-fg-faint)", fontFamily: "JetBrains Mono, monospace" }}>
          {sub}
        </small>
      </div>
    </div>
  );
}

function Cell({ children }) {
  return (
    <span
      style={{
        fontSize: 11.5,
        color: "var(--mz-fg)",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {typeof children === "object" ? (
        <>
          {Array.isArray(children)
            ? children.map((c, i) => <span key={i}>{c}</span>)
            : children}
        </>
      ) : (
        children
      )}
      <style>{`
        small {
          display: block;
          color: var(--mz-fg-faint);
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>
    </span>
  );
}

function StatusBadge({ tipo, label }) {
  const c = STATUS_CLASS[tipo] || STATUS_CLASS.regular;
  return (
    <span
      style={{
        fontSize: 9.5,
        padding: "3px 7px",
        borderRadius: 3,
        fontWeight: 800,
        letterSpacing: "0.04em",
        background: c.bg,
        color: c.fg,
      }}
    >
      {label}
    </span>
  );
}

function ActionBtn({ children }) {
  return (
    <button
      style={{
        width: 24,
        height: 24,
        border: 0,
        background: "var(--mz-bg-card)",
        borderRadius: 4,
        color: "var(--mz-fg-muted)",
        cursor: "pointer",
        fontSize: 11,
      }}
    >
      {children}
    </button>
  );
}

/* ============ PERFIL COMPLETO (lateral direita) ============ */
function PerfilCompleto({ perfil }) {
  return (
    <>
      {/* Header */}
      <div
        style={{
          padding: "22px 20px",
          borderBottom: "1px solid var(--mz-rule)",
          background: "linear-gradient(135deg, rgba(0,42,123,0.18), transparent)",
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--mz-tenant-primary)",
              color: "var(--mz-tenant-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: 22,
            }}
          >
            {perfil.iniciais}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, color: "var(--mz-fg-strong)", fontWeight: 800, lineHeight: 1.15 }}>
              {perfil.nome}
            </h2>
            <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", marginTop: 4 }}>{perfil.meta}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 12 }}>
          {perfil.pills.map((p, i) => {
            const styleByTipo =
              p.tipo === "ok"
                ? { background: "var(--mz-ok-soft)", color: "var(--mz-ok)", borderColor: "transparent", fontWeight: 700 }
                : p.tipo === "warn"
                ? { background: "var(--mz-warn-soft)", color: "var(--mz-warn)", borderColor: "transparent", fontWeight: 700 }
                : { background: "var(--mz-bg-card)", color: "var(--mz-fg-muted)", borderColor: "var(--mz-rule)" };
            return (
              <span
                key={i}
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: "1px solid var(--mz-rule)",
                  ...styleByTipo,
                }}
              >
                {p.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Dados Cadastrais */}
      <SectionR titulo="Dados Cadastrais">
        <dl style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: "6px 12px", fontSize: 11.5, margin: 0 }}>
          {perfil.cadastrais.map((c) => (
            <DlPair key={c.k} k={c.k} v={c.v} sub={c.sub} />
          ))}
        </dl>
      </SectionR>

      {/* Cadeia de Abono */}
      <SectionR titulo="Cadeia de Abono" qty="3 níveis">
        <div
          style={{
            background: "var(--mz-bg-card)",
            border: "1px solid var(--mz-rule)",
            borderRadius: 8,
            padding: 12,
          }}
        >
          {perfil.cadeiaAbono.map((a, i) => {
            const last = i === perfil.cadeiaAbono.length - 1;
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 1fr auto",
                  gap: 10,
                  padding: i === 0 ? "0 0 8px" : last ? "8px 0 0" : "8px 0",
                  borderBottom: last ? 0 : "1px solid var(--mz-rule)",
                  alignItems: "center",
                  fontSize: 11.5,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: a.destaque ? "var(--mz-tenant-accent)" : "var(--mz-tenant-primary)",
                    color: a.destaque ? "var(--mz-fg-on-accent)" : "var(--mz-tenant-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Bebas Neue, sans-serif",
                    fontSize: 11,
                  }}
                >
                  {a.iniciais}
                </div>
                <div>
                  <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{a.nome}</b>
                  <span style={{ display: "block", color: "var(--mz-fg-faint)", fontSize: 10 }}>{a.sub}</span>
                </div>
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 9.5,
                    color: "var(--mz-fg-faint)",
                  }}
                >
                  {a.nivel}
                </span>
              </div>
            );
          })}
        </div>
      </SectionR>

      {/* Status DocuSign */}
      <SectionR titulo="Status DocuSign">
        <div
          style={{
            background: "linear-gradient(135deg, rgba(0,42,123,0.20), var(--mz-bg-card))",
            border: "1px solid var(--mz-tenant-accent)",
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: "var(--mz-tenant-accent)",
                color: "var(--mz-fg-on-accent)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Bebas Neue, sans-serif",
                fontWeight: 800,
                fontSize: 11,
              }}
            >
              DS
            </div>
            <div>
              <b style={{ fontSize: 12.5, color: "var(--mz-fg-strong)", display: "block", fontWeight: 700 }}>
                {perfil.docusign.titulo}
              </b>
              <span style={{ fontSize: 10, color: "var(--mz-fg-faint)" }}>{perfil.docusign.envelope}</span>
            </div>
          </div>
          {perfil.docusign.steps.map((s, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "22px 1fr auto",
                gap: 10,
                padding: "7px 0",
                borderTop: i === 0 ? 0 : "1px solid var(--mz-rule)",
                fontSize: 11.5,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: s.state === "done" ? "var(--mz-ok)" : s.state === "cur" ? "var(--mz-tenant-accent)" : "var(--mz-bg-elevated)",
                  color: s.state === "done" || s.state === "cur" ? "#fff" : "var(--mz-fg-faint)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                ✓
              </div>
              <div>
                <b style={{ color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{s.label}</b>
                <span style={{ color: "var(--mz-fg-faint)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>
                  {s.sub}
                </span>
              </div>
              <span
                style={{
                  fontSize: 9.5,
                  padding: "2px 6px",
                  borderRadius: 3,
                  fontWeight: 800,
                  background: s.state === "done" ? "var(--mz-ok-soft)" : "var(--mz-warn-soft)",
                  color: s.state === "done" ? "var(--mz-ok)" : "var(--mz-warn)",
                }}
              >
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </SectionR>

      {/* Tags */}
      <SectionR titulo="Tags & Operações" qty={String(perfil.tags.length)}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {perfil.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 999,
                background: "var(--mz-tenant-accent)",
                color: "var(--mz-fg-on-accent)",
                border: "1px solid var(--mz-tenant-accent)",
                fontWeight: 700,
              }}
            >
              {t}
            </span>
          ))}
          <span
            style={{
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 999,
              background: "var(--mz-bg-card)",
              color: "var(--mz-fg-muted)",
              border: "1px solid var(--mz-rule)",
            }}
          >
            + tag
          </span>
        </div>
      </SectionR>

      {/* Auditoria */}
      <SectionR titulo="Auditoria · últimos 30 dias" qty={String(perfil.auditoria.length)}>
        {perfil.auditoria.map((a, i) => (
          <AuditRow key={i} {...a} />
        ))}
      </SectionR>

      {/* Ações */}
      <SectionR titulo="Ações">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {perfil.acoes.map((a) => (
            <button
              key={a}
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                padding: "7px 12px",
                borderRadius: 6,
                border: "1px solid var(--mz-rule)",
                background: "var(--mz-bg-card)",
                color: "var(--mz-fg)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {a}
            </button>
          ))}
          <button
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              padding: "7px 12px",
              borderRadius: 6,
              border: "1px solid var(--mz-tenant-primary-strong)",
              background: "var(--mz-tenant-primary)",
              color: "#fff",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {perfil.acaoPrincipal}
          </button>
        </div>
      </SectionR>

      {/* LGPD */}
      <SectionR titulo="LGPD · Acesso a este registro" bg>
        {perfil.lgpd.map((a, i) => (
          <AuditRow key={i} {...a} />
        ))}
        <div style={{ fontSize: 10, color: "var(--mz-fg-faint)", marginTop: 8, lineHeight: 1.5 }}>
          Todo acesso é auditado conforme LGPD art. 37. Logs imutáveis · retenção 5 anos.
        </div>
      </SectionR>
    </>
  );
}

function SectionR({ titulo, qty, bg, children }) {
  return (
    <div
      style={{
        padding: "16px 20px",
        borderBottom: "1px solid var(--mz-rule)",
        background: bg ? "var(--mz-bg-card-2)" : undefined,
      }}
    >
      <h4
        style={{
          fontSize: 9.5,
          letterSpacing: "0.16em",
          color: "var(--mz-fg-faint)",
          textTransform: "uppercase",
          fontWeight: 700,
          margin: "0 0 12px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {titulo}
        {qty && (
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "JetBrains Mono, monospace",
              background: "var(--mz-tenant-accent)",
              color: "var(--mz-fg-on-accent)",
              padding: "1px 5px",
              borderRadius: 3,
              fontSize: 9.5,
              fontWeight: 800,
            }}
          >
            {qty}
          </span>
        )}
      </h4>
      {children}
    </div>
  );
}

function DlPair({ k, v, sub }) {
  return (
    <>
      <dt style={{ color: "var(--mz-fg-faint)" }}>{k}</dt>
      <dd style={{ margin: 0, color: "var(--mz-fg-strong)", fontWeight: 600 }}>
        {v}
        {sub && (
          <small style={{ display: "block", color: "var(--mz-fg-faint)", fontWeight: 400, fontFamily: "JetBrains Mono, monospace", fontSize: 10 }}>
            {sub}
          </small>
        )}
      </dd>
    </>
  );
}

function AuditRow({ texto, when }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "12px 1fr", gap: 10, padding: "6px 0", fontSize: 11, alignItems: "start" }}>
      <span style={{ color: "var(--mz-tenant-accent)", fontSize: 8, lineHeight: 1.4 }}>●</span>
      <div>
        <b style={{ color: "var(--mz-fg)", fontWeight: 600 }}>{texto}</b>
        <div style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--mz-fg-faint)", fontSize: 10 }}>{when}</div>
      </div>
    </div>
  );
}
