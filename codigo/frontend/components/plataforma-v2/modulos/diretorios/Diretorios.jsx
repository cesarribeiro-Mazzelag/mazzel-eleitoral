"use client";

/* Módulo Diretórios & Comissões · 1:1 com Designer V1.2
 * Fonte: public/mockups/v1.2/F4-estatutario/01-diretorios-comissoes.html
 *
 * Layout 3 colunas: árvore (280) + main (1fr) + sidebar (380)
 * 5 abas: Diretório · Comissões · Atas · Atos & Resoluções · Histórico
 *
 * Refator 27/04 (substitui Diretorios.jsx anterior que tinha 4 abas stub +
 * faltava sidebar direita com Saúde Estatutária + Alertas + Próximas Reuniões
 * + Ações Rápidas + Conformidade TSE/LGPD).
 */

import { useState } from "react";
import {
  TREE,
  TABS,
  HERO,
  COMISSOES_DETALHADAS,
  COMISSOES_SETORIAIS,
  DOCUMENTOS,
  TIMELINE,
  ATAS,
  ATOS_RESOLUCOES,
  SAUDE,
  ALERTAS,
  REUNIOES,
  ACOES_RAPIDAS,
  ACAO_PRINCIPAL,
  CONFORMIDADE,
} from "./dados";

const ROLE_STYLES = {
  pres: { bg: "var(--mz-tenant-accent)",  fg: "var(--mz-fg-on-accent)" },
  vice: { bg: "var(--mz-tenant-primary)", fg: "var(--mz-tenant-accent)" },
  tes:  { bg: "var(--mz-warn-soft)",      fg: "var(--mz-warn)" },
  sec:  { bg: "var(--mz-info-soft)",      fg: "var(--mz-info)" },
  vac:  { bg: "var(--mz-danger-soft)",    fg: "var(--mz-danger)" },
};

const STATUS_STYLES = {
  assinado: { bg: "var(--mz-ok-soft)",     fg: "var(--mz-ok)" },
  pend:     { bg: "var(--mz-warn-soft)",   fg: "var(--mz-warn)" },
  exp:      { bg: "var(--mz-danger-soft)", fg: "var(--mz-danger)" },
};

export function Diretorios() {
  const [tab, setTab] = useState("dir");

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "280px 1fr 380px",
        height: "calc(100vh - 48px)",
        background: "var(--mz-bg-page)",
      }}
    >
      <Tree />
      <Main tab={tab} onTab={setTab} />
      <Sidebar />
    </div>
  );
}

/* ============ ÁRVORE ESQUERDA ============ */
function Tree() {
  return (
    <aside
      style={{
        background: "var(--mz-bg-sidebar)",
        borderRight: "1px solid var(--mz-rule)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--mz-rule)" }}>
        <input
          type="text"
          placeholder="Buscar diretório, UF ou município..."
          style={{
            width: "100%",
            background: "var(--mz-bg-card)",
            border: "1px solid var(--mz-rule)",
            borderRadius: 6,
            padding: "7px 12px",
            fontSize: 12,
            color: "var(--mz-fg)",
            outline: "none",
          }}
        />
      </div>
      <div style={{ padding: "14px 8px", flex: 1 }}>
        <h3
          style={{
            fontSize: 9.5,
            letterSpacing: "0.16em",
            color: "var(--mz-fg-faint)",
            textTransform: "uppercase",
            fontWeight: 700,
            margin: "0 0 8px",
            padding: "0 10px",
          }}
        >
          Hierarquia Estatutária
        </h3>
        {TREE.map((node, i) => (
          <TreeRow key={i} node={node} indent={node.lvl === "mun" ? 18 : 0} />
        ))}
      </div>
    </aside>
  );
}

function TreeRow({ node, indent }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "12px 22px 1fr auto",
        gap: 6,
        padding: "5px 10px",
        marginLeft: indent,
        cursor: "pointer",
        alignItems: "center",
        fontSize: 12,
        color: "var(--mz-fg)",
        borderRadius: 4,
        background: node.active ? "var(--mz-tenant-primary-soft)" : undefined,
        borderLeft: node.active ? "3px solid var(--mz-tenant-accent)" : undefined,
        paddingLeft: node.active ? 7 : 10,
        position: "relative",
      }}
    >
      <span style={{ color: "var(--mz-fg-faint)", fontSize: 9 }}>{node.arr}</span>
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          background:
            node.lvl === "nac" ? "var(--mz-tenant-accent)" :
            node.lvl === "est" ? "var(--mz-tenant-primary)" :
                                 "var(--mz-bg-card-2)",
          color:
            node.lvl === "nac" ? "var(--mz-fg-on-accent)" :
            node.lvl === "est" ? "var(--mz-tenant-accent)" :
                                 "var(--mz-fg-faint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontFamily: "Bebas Neue, sans-serif",
          letterSpacing: "0.04em",
        }}
      >
        {node.icon}
      </div>
      <b style={{ fontWeight: 600, color: "var(--mz-fg-strong)" }}>{node.nome}</b>
      <span style={{ color: "var(--mz-fg-faint)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>
        {node.total}
      </span>
      {node.warn && (
        <span style={{ position: "absolute", right: 14, color: "var(--mz-warn)", fontWeight: 800, fontSize: 10 }}>
          !
        </span>
      )}
    </div>
  );
}

/* ============ MAIN ============ */
function Main({ tab, onTab }) {
  return (
    <main style={{ overflowY: "auto", background: "var(--mz-bg-page)", paddingBottom: 60 }}>
      <TopBar tab={tab} onTab={onTab} />
      <Hero />
      {tab === "dir"  && <ConteudoDiretorio />}
      {tab === "com"  && <ConteudoComissoes />}
      {tab === "atas" && <ConteudoAtas />}
      {tab === "atos" && <ConteudoAtos />}
      {tab === "hist" && <ConteudoHistorico />}
    </main>
  );
}

function TopBar({ tab, onTab }) {
  return (
    <div
      style={{
        padding: "14px 24px",
        borderBottom: "1px solid var(--mz-rule)",
        background: "var(--mz-bg-topbar)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        position: "sticky",
        top: 0,
        zIndex: 5,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", display: "flex", gap: 6, alignItems: "center" }}>
        Estatutário <Sep />
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>Brasil</b> <Sep />
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>SP</b> <Sep />
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>São Paulo (capital)</b>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
        {TABS.map((t) => {
          const ativo = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 12px",
                background: ativo ? "var(--mz-tenant-primary)" : "transparent",
                color: ativo ? "#fff" : "var(--mz-fg-muted)",
                border: 0,
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Sep() {
  return <span style={{ color: "var(--mz-rule-strong)", margin: "0 6px" }}>›</span>;
}

function Hero() {
  return (
    <div
      style={{
        padding: 24,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 22,
        alignItems: "start",
        borderBottom: "1px solid var(--mz-rule)",
        background: "linear-gradient(135deg, rgba(0,42,123,0.16), transparent), var(--mz-bg-page)",
      }}
    >
      <div
        style={{
          width: 88,
          height: 88,
          background: "var(--mz-tenant-primary)",
          border: "2px solid var(--mz-tenant-accent)",
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: 36,
          color: "var(--mz-tenant-accent)",
        }}
      >
        {HERO.badge}
      </div>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--mz-fg-strong)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          {HERO.titulo}
        </h1>
        <div style={{ fontSize: 12, color: "var(--mz-fg-muted)", display: "flex", gap: 14, flexWrap: "wrap" }}>
          {HERO.pills.map((p, i) => (
            <span
              key={i}
              style={{
                background: p.tipo === "ok" ? "var(--mz-ok-soft)" : "var(--mz-bg-card)",
                color: p.tipo === "ok" ? "var(--mz-ok)" : undefined,
                padding: "3px 10px",
                borderRadius: 999,
                border: p.tipo === "ok" ? "1px solid transparent" : "1px solid var(--mz-rule)",
                fontWeight: p.tipo === "ok" ? 700 : 400,
              }}
            >
              {renderPillLabel(p)}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          {HERO.stats.map((s) => (
            <div
              key={s.lbl}
              style={{
                background: "var(--mz-bg-card)",
                border: "1px solid var(--mz-rule)",
                borderRadius: 6,
                padding: "10px 14px",
                minWidth: 100,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.14em",
                  color: "var(--mz-fg-faint)",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                {s.lbl}
              </div>
              <div
                style={{
                  fontFamily: "Bebas Neue, sans-serif",
                  fontSize: 24,
                  color: "var(--mz-fg-strong)",
                  lineHeight: 1,
                  marginTop: 2,
                  letterSpacing: "0.02em",
                }}
              >
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {HERO.acoes.map((a) => (
          <Btn key={a.label} tipo={a.tipo}>
            {a.label}
          </Btn>
        ))}
      </div>
    </div>
  );
}

function renderPillLabel(p) {
  if (!p.bold) return p.label;
  let out = p.label;
  p.bold.forEach((b) => {
    out = out.replace(b, "");
  });
  return (
    <>
      {out}
      {p.bold.map((b, i) => (
        <b key={i} style={{ color: "var(--mz-fg)", fontWeight: 600 }}>
          {b}
        </b>
      ))}
    </>
  );
}

function Btn({ tipo, children }) {
  const style =
    tipo === "tenant"
      ? { background: "var(--mz-tenant-accent)", border: "1px solid var(--mz-tenant-accent)", color: "var(--mz-fg-on-accent)", fontWeight: 800 }
      : tipo === "primary"
      ? { background: "var(--mz-tenant-primary)", border: "1px solid var(--mz-tenant-primary-strong)", color: "#fff" }
      : { background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", color: "var(--mz-fg)" };
  return (
    <button
      style={{
        ...style,
        fontSize: 12,
        fontWeight: style.fontWeight ?? 600,
        padding: "8px 14px",
        borderRadius: 6,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {children}
    </button>
  );
}

/* ============ ABA · DIRETÓRIO ============ */
function ConteudoDiretorio() {
  return (
    <>
      {/* Mesa Diretora + 3 órgãos colegiados (4 cards) */}
      <Section titulo="Mesa Diretora · Pres. Municipal" count="7 cargos">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {COMISSOES_DETALHADAS.map((c, i) => (
            <ComissaoCard key={i} comissao={c} />
          ))}
        </div>
      </Section>

      {/* Comissões setoriais */}
      <Section titulo="Comissões Setoriais" count="10 ativas">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {COMISSOES_SETORIAIS.map((c, i) => (
            <ComissaoCard key={i} comissao={c} />
          ))}
        </div>
      </Section>

      {/* Documentos */}
      <Section titulo="Documentos Estatutários · vigentes" count="9 docs">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {DOCUMENTOS.map((d, i) => (
            <DocCard key={i} doc={d} />
          ))}
        </div>
      </Section>

      {/* Timeline */}
      <Section titulo="Atos Recentes & Histórico" count="12 últimos">
        <Timeline />
      </Section>
    </>
  );
}

/* ============ ABA · COMISSÕES ============ */
function ConteudoComissoes() {
  return (
    <>
      <Section titulo="4 Órgãos Colegiados Permanentes" count="Mesa · Executiva · Fiscal · Ética">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {COMISSOES_DETALHADAS.map((c, i) => (
            <ComissaoCard key={i} comissao={c} />
          ))}
        </div>
      </Section>
      <Section titulo="Comissões Setoriais Permanentes & Especiais" count="10 ativas">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {COMISSOES_SETORIAIS.map((c, i) => (
            <ComissaoCard key={i} comissao={c} />
          ))}
        </div>
      </Section>
    </>
  );
}

/* ============ ABA · ATAS ============ */
function ConteudoAtas() {
  return (
    <Section titulo="Atas Registradas · Diretório Municipal" count={`${ATAS.length} atas`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ATAS.map((a, i) => {
          const s = STATUS_STYLES[a.statusClass];
          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 110px 130px 130px",
                gap: 14,
                padding: "12px 16px",
                background: "var(--mz-bg-card)",
                border: "1px solid var(--mz-rule)",
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 600, color: "var(--mz-tenant-accent)" }}>
                {a.id}
              </span>
              <div>
                <b style={{ display: "block", color: "var(--mz-fg-strong)", fontWeight: 600, fontSize: 13 }}>{a.titulo}</b>
                <span style={{ color: "var(--mz-fg-muted)", fontSize: 11 }}>{a.sub}</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--mz-fg-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                {a.presentes}
              </span>
              <span
                style={{
                  fontSize: 9.5,
                  padding: "3px 7px",
                  borderRadius: 3,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  background: s.bg,
                  color: s.fg,
                  textAlign: "center",
                }}
              >
                {a.status}
              </span>
              <span style={{ fontSize: 10.5, color: "var(--mz-fg-faint)", fontFamily: "JetBrains Mono, monospace" }}>
                {a.when}
              </span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ============ ABA · ATOS & RESOLUÇÕES ============ */
function ConteudoAtos() {
  return (
    <Section titulo="Atos, Resoluções & Memorandos" count={`${ATOS_RESOLUCOES.length} ativos`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ATOS_RESOLUCOES.map((a, i) => {
          const s = STATUS_STYLES[a.statusClass];
          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 160px 140px 130px",
                gap: 14,
                padding: "12px 16px",
                background: "var(--mz-bg-card)",
                border: "1px solid var(--mz-rule)",
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 600, color: "var(--mz-tenant-accent)" }}>
                {a.id}
              </span>
              <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600, fontSize: 13 }}>{a.titulo}</b>
              <span style={{ fontSize: 11, color: "var(--mz-fg-muted)" }}>{a.autor}</span>
              <span
                style={{
                  fontSize: 9.5,
                  padding: "3px 7px",
                  borderRadius: 3,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  background: s.bg,
                  color: s.fg,
                  textAlign: "center",
                }}
              >
                {a.status}
              </span>
              <span style={{ fontSize: 10.5, color: "var(--mz-fg-faint)", fontFamily: "JetBrains Mono, monospace" }}>
                {a.when}
              </span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ============ ABA · HISTÓRICO ============ */
function ConteudoHistorico() {
  return (
    <Section titulo="Histórico Completo · Atos Cronológicos" count={`${TIMELINE.length} entradas`}>
      <Timeline />
    </Section>
  );
}

/* ============ HELPERS COMPARTILHADOS ============ */

function Section({ titulo, count, children }) {
  return (
    <section style={{ padding: "22px 24px", borderBottom: "1px solid var(--mz-rule)" }}>
      <h2
        style={{
          fontSize: 11,
          letterSpacing: "0.16em",
          color: "var(--mz-fg-faint)",
          textTransform: "uppercase",
          fontWeight: 700,
          margin: "0 0 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {titulo}
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            background: "var(--mz-tenant-accent)",
            color: "var(--mz-fg-on-accent)",
            padding: "1px 6px",
            borderRadius: 3,
            fontWeight: 800,
          }}
        >
          {count}
        </span>
      </h2>
      {children}
    </section>
  );
}

function ComissaoCard({ comissao: c }) {
  return (
    <div
      style={{
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          background: "var(--mz-bg-card-2)",
          borderBottom: "1px solid var(--mz-rule)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            background: "var(--mz-tenant-primary)",
            color: "var(--mz-tenant-accent)",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontFamily: "Bebas Neue, sans-serif",
          }}
        >
          {c.icon}
        </div>
        <b style={{ fontSize: 13, color: "var(--mz-fg-strong)", flex: 1, fontWeight: 700 }}>{c.nome}</b>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-fg-faint)" }}>
          {c.qty}
        </span>
      </header>
      <div style={{ padding: "8px 14px 14px" }}>
        {c.members.map((m, i) => {
          const roleStyle = m.roleClass ? ROLE_STYLES[m.roleClass] : { bg: "var(--mz-bg-elevated)", fg: "var(--mz-fg-muted)" };
          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr auto",
                gap: 10,
                padding: "8px 0",
                borderBottom: i === c.members.length - 1 ? 0 : "1px solid var(--mz-rule)",
                alignItems: "center",
                fontSize: 11.5,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--mz-tenant-primary)",
                  color: "var(--mz-tenant-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Bebas Neue, sans-serif",
                  fontSize: 12,
                }}
              >
                {m.av}
              </div>
              <div>
                <b style={{ color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{m.nome}</b>
                <span style={{ color: "var(--mz-fg-faint)", fontSize: 10.5 }}>{m.sub}</span>
              </div>
              <span
                style={{
                  fontSize: 9.5,
                  padding: "2px 7px",
                  borderRadius: 3,
                  background: roleStyle.bg,
                  color: roleStyle.fg,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                {m.role}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocCard({ doc: d }) {
  const s = STATUS_STYLES[d.statusClass];
  return (
    <div
      style={{
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderRadius: 8,
        padding: 14,
        cursor: "pointer",
        transition: "all 120ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div
          style={{
            width: 36,
            height: 44,
            background: "var(--mz-tenant-accent)",
            color: "var(--mz-fg-on-accent)",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {d.ico}
        </div>
        <div>
          <b style={{ fontSize: 12.5, color: "var(--mz-fg-strong)", display: "block", fontWeight: 600, lineHeight: 1.25 }}>
            {d.titulo}
          </b>
          <span style={{ fontSize: 10, color: "var(--mz-fg-faint)" }}>{d.sub}</span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "4px 0 6px",
          fontSize: 10.5,
          color: "var(--mz-fg-muted)",
          borderTop: "1px dashed var(--mz-rule)",
          marginTop: 4,
        }}
      >
        <span>{d.r1Lbl}</span>
        <b style={{ color: d.r1Color || "var(--mz-fg)", fontWeight: 600 }}>{d.r1Val}</b>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "4px 0",
          fontSize: 10.5,
          color: "var(--mz-fg-muted)",
        }}
      >
        <span>Status</span>
        <span
          style={{
            fontSize: 9.5,
            padding: "2px 6px",
            borderRadius: 3,
            fontWeight: 700,
            background: s.bg,
            color: s.fg,
          }}
        >
          {d.status}
        </span>
      </div>
    </div>
  );
}

function Timeline() {
  return (
    <div style={{ position: "relative", paddingLeft: 28 }}>
      <div
        style={{
          position: "absolute",
          left: 9,
          top: 6,
          bottom: 0,
          width: 2,
          background: "var(--mz-rule)",
        }}
      />
      {TIMELINE.map((t, i) => {
        const dotBg =
          t.tipo === "danger" ? "var(--mz-danger)" :
          t.tipo === "warn"   ? "var(--mz-warn)" :
                                "var(--mz-tenant-accent)";
        return (
          <div key={i} style={{ position: "relative", padding: "8px 0 14px", fontSize: 12 }}>
            <span
              style={{
                position: "absolute",
                left: -23,
                top: 12,
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: dotBg,
                border: "2px solid var(--mz-bg-page)",
              }}
            />
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                color: "var(--mz-fg-faint)",
                display: "block",
              }}
            >
              {t.when}
            </span>
            <b style={{ color: "var(--mz-fg-strong)", fontWeight: 700 }}>{t.titulo}</b>
            <p style={{ margin: "2px 0 0", color: "var(--mz-fg-muted)" }}>{t.body}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ============ SIDEBAR DIREITA ============ */
function Sidebar() {
  return (
    <aside
      style={{
        background: "var(--mz-bg-sidebar)",
        borderLeft: "1px solid var(--mz-rule)",
        overflowY: "auto",
      }}
    >
      <RSection titulo="Saúde Estatutária">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SAUDE.map((s, i) => (
            <HealthRow key={i} {...s} />
          ))}
        </div>
      </RSection>

      <RSection titulo="Alertas" qty="3" qtyWarn>
        {ALERTAS.map((a, i) => (
          <AlertRow key={i} {...a} />
        ))}
      </RSection>

      <RSection titulo="Próximas Reuniões" qty="3">
        {REUNIOES.map((r, i) => (
          <ReunaoRow key={i} {...r} />
        ))}
      </RSection>

      <RSection titulo="Ações Rápidas">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ACOES_RAPIDAS.map((a) => (
            <button
              key={a}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 14px",
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
              fontSize: 12,
              fontWeight: 600,
              padding: "8px 14px",
              borderRadius: 6,
              border: "1px solid var(--mz-tenant-primary-strong)",
              background: "var(--mz-tenant-primary)",
              color: "#fff",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {ACAO_PRINCIPAL}
          </button>
        </div>
      </RSection>

      <RSection titulo="Conformidade TSE/LGPD">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CONFORMIDADE.map((c, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
                alignItems: "center",
                fontSize: 11.5,
              }}
            >
              <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{c.lbl}</b>
              <span
                style={{
                  fontFamily: c.bold ? undefined : "JetBrains Mono, monospace",
                  fontSize: 10,
                  color: c.vColor,
                  fontWeight: c.bold ? 800 : 600,
                }}
              >
                {c.v}
              </span>
            </div>
          ))}
        </div>
      </RSection>
    </aside>
  );
}

function RSection({ titulo, qty, qtyWarn, children }) {
  return (
    <section style={{ padding: "16px 18px", borderBottom: "1px solid var(--mz-rule)" }}>
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
          gap: 8,
        }}
      >
        {titulo}
        {qty && (
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              background: qtyWarn ? "var(--mz-warn)" : "var(--mz-tenant-accent)",
              color: qtyWarn ? "#fff" : "var(--mz-fg-on-accent)",
              padding: "1px 5px",
              borderRadius: 3,
              fontSize: 9.5,
            }}
          >
            {qty}
          </span>
        )}
      </h4>
      {children}
    </section>
  );
}

function HealthRow({ lbl, v, bar, warn, vColor }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", fontSize: 11.5 }}>
      <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{lbl}</b>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: vColor }}>{v}</span>
      <div
        style={{
          gridColumn: "1 / -1",
          height: 4,
          background: "var(--mz-bg-elevated)",
          borderRadius: 2,
          overflow: "hidden",
          marginTop: 2,
        }}
      >
        <span
          style={{
            display: "block",
            height: "100%",
            width: `${bar}%`,
            background: warn
              ? "var(--mz-warn)"
              : "linear-gradient(90deg, var(--mz-tenant-primary), var(--mz-tenant-accent))",
          }}
        />
      </div>
    </div>
  );
}

function AlertRow({ ic, titulo, sub, danger }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "28px 1fr",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid var(--mz-rule)",
        fontSize: 11.5,
        alignItems: "start",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: danger ? "var(--mz-danger-soft)" : "var(--mz-warn-soft)",
          color: danger ? "var(--mz-danger)" : "var(--mz-warn)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
        }}
      >
        {ic}
      </div>
      <div>
        <b style={{ color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{titulo}</b>
        <span style={{ color: "var(--mz-fg-faint)", fontSize: 10.5 }}>{sub}</span>
      </div>
    </div>
  );
}

function ReunaoRow({ dia, titulo, sub, icoBg, icoColor }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "28px 1fr",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid var(--mz-rule)",
        fontSize: 11.5,
        alignItems: "start",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: icoBg,
          color: icoColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
        }}
      >
        {dia}
      </div>
      <div>
        <b style={{ color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{titulo}</b>
        <span style={{ color: "var(--mz-fg-faint)", fontSize: 10.5 }}>{sub}</span>
      </div>
    </div>
  );
}
