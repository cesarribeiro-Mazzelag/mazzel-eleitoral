"use client";

/* Dossie 8 Cargos · 1:1 com Designer V1.2 (03-dossie-8cargos.html)
 *
 * Motor único: <Dossie role={...} /> renderiza todas as 15 seções,
 * mas a config de cada cargo (priority/hidden/placeholder) altera
 * como cada seção aparece.
 *
 * Layout: top-bar com 9 pílulas de cargo + grid 1fr+320px (dossie + inspector).
 *
 * Default ao abrir: Senador (Wagner) - "bom exemplo" segundo Designer.
 *
 * Substitui o grid abstrato anterior pelo placeholder geográfico do
 * MapaEleitoral.tsx (decisão 27/04 noite - bug do mapa do Dossiê
 * conceitualmente errado).
 */

import { useState } from "react";
import { SECTIONS, ROLES } from "./dados";
import { renderSection } from "./secoes";

export function Dossie8Cargos() {
  const [activeId, setActiveId] = useState("sen");
  const role = ROLES.find((r) => r.id === activeId) || ROLES[0];

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 48px)", overflow: "hidden", background: "var(--mz-bg-page)" }}
    >
      {/* Top bar com pílulas dos cargos */}
      <RoleBar activeId={activeId} onPick={setActiveId} />

      {/* Layout principal */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "1fr 320px",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Dossie role={role} />
        <Inspector role={role} />
      </div>
    </div>
  );
}

/* ============ ROLE BAR ============ */
function RoleBar({ activeId, onPick }) {
  return (
    <header
      style={{
        height: 64,
        flexShrink: 0,
        background: "var(--mz-bg-topbar)",
        borderBottom: "1px solid var(--mz-rule)",
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "0 24px",
        overflow: "hidden",
      }}
    >
      <h1 style={{ fontSize: 13, fontWeight: 700, color: "var(--mz-fg-strong)", letterSpacing: "0.04em", margin: 0, whiteSpace: "nowrap" }}>
        Dossiê · Layout por Cargo
      </h1>
      <span style={{ fontSize: 11, color: "var(--mz-fg-faint)", whiteSpace: "nowrap" }}>
        Cada cargo prioriza/oculta seções diferentes · clique nos cargos →
      </span>
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          padding: "6px 0",
          flex: 1,
          scrollbarWidth: "thin",
          scrollbarColor: "var(--mz-rule-strong) transparent",
        }}
      >
        {ROLES.map((r) => {
          const ativo = r.id === activeId;
          return (
            <button
              key={r.id}
              onClick={() => onPick(r.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                background: ativo ? "var(--mz-tenant-primary)" : "var(--mz-bg-card)",
                border: ativo ? "1px solid var(--mz-tenant-primary-strong)" : "1px solid var(--mz-rule)",
                color: ativo ? "#fff" : "var(--mz-fg-muted)",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "all 120ms",
                boxShadow: ativo ? "0 0 0 1px var(--mz-tenant-accent-soft)" : undefined,
              }}
            >
              <span
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  background: ativo ? "rgba(255,204,0,0.25)" : "rgba(0,0,0,0.3)",
                  color: ativo ? "#FFCC00" : undefined,
                  padding: "1px 5px",
                  borderRadius: 3,
                }}
              >
                {r.pillNum}
              </span>
              <span>{r.pill}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}

/* ============ DOSSIE (centro) ============ */
function Dossie({ role }) {
  return (
    <main
      style={{
        overflowY: "auto",
        background:
          "radial-gradient(1000px 400px at 30% -100px, rgba(0,42,123,0.10), transparent), var(--mz-bg-page)",
      }}
    >
      {/* Hero */}
      <Hero role={role} />

      {/* TOC sticky */}
      <Toc role={role} />

      {/* Body com seções */}
      <div style={{ padding: "24px 32px 48px", display: "flex", flexDirection: "column", gap: 24 }}>
        {SECTIONS.filter((s) => !role.hidden.includes(s.id)).map((s) => (
          <Section key={s.id} secao={s} role={role} />
        ))}
      </div>
    </main>
  );
}

function Hero({ role }) {
  return (
    <div
      style={{
        padding: "28px 32px 24px",
        borderBottom: "1px solid var(--mz-rule)",
        display: "grid",
        gridTemplateColumns: "96px 1fr auto",
        gap: 24,
        alignItems: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 32,
          right: 32,
          height: 3,
          background: "linear-gradient(90deg, var(--mz-tenant-primary), var(--mz-tenant-accent))",
          borderRadius: 2,
        }}
      />
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--mz-tenant-primary), var(--mz-tenant-primary-strong))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: 44,
          color: "var(--mz-tenant-accent)",
          letterSpacing: "0.04em",
          boxShadow: "inset 0 4px 12px rgba(0,0,0,0.3), 0 0 0 3px var(--mz-tenant-accent-soft)",
        }}
      >
        {role.iniciais}
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.16em",
            color: "var(--mz-tenant-accent)",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          {role.eyebrow}
        </div>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: "var(--mz-fg-strong)",
            margin: 0,
            lineHeight: 1.05,
          }}
        >
          {role.nome}
        </h1>
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            marginTop: 8,
            fontSize: 12,
            color: "var(--mz-fg-muted)",
          }}
        >
          {role.metas.map((m, i) => (
            <span key={i} style={{ display: "flex", gap: 14, alignItems: "center" }}>
              {i > 0 && <span style={{ width: 3, height: 3, background: "var(--mz-fg-faint)", borderRadius: "50%" }} />}
              <span>{m}</span>
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div>
          <div
            style={{
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: 78,
              fontWeight: 700,
              color: "var(--mz-tenant-accent)",
              lineHeight: 1,
              letterSpacing: "0.02em",
              textShadow: "0 0 20px rgba(255, 204, 0, 0.25)",
            }}
          >
            {role.ovr ?? "··"}
          </div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.20em",
              color: "var(--mz-fg-faint)",
              fontWeight: 700,
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            {role.ovr ? "OVR" : "EM CONSTRUÇÃO"}
          </div>
        </div>
        <div
          style={{
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: 24,
            background: "var(--mz-tenant-accent)",
            color: "var(--mz-fg-on-accent)",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            letterSpacing: "0.04em",
          }}
        >
          {role.tier}
        </div>
      </div>
    </div>
  );
}

function Toc({ role }) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        display: "flex",
        gap: 4,
        overflowX: "auto",
        background: "var(--mz-bg-page)",
        borderBottom: "1px solid var(--mz-rule)",
        padding: "10px 32px",
        scrollbarWidth: "none",
      }}
    >
      {SECTIONS.map((s) => {
        const isPriority = role.priority.includes(s.id);
        const isHidden = role.hidden.includes(s.id);
        if (isHidden) return null;
        return (
          <a
            key={s.id}
            href={`#sec-${s.id}`}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: isPriority ? "var(--mz-tenant-accent)" : "var(--mz-fg-muted)",
              padding: "6px 10px",
              borderRadius: 6,
              whiteSpace: "nowrap",
              cursor: "pointer",
              transition: "all 120ms",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: isPriority ? "var(--mz-tenant-primary-soft)" : undefined,
              textDecoration: "none",
            }}
          >
            {isPriority && (
              <span
                style={{
                  width: 5,
                  height: 5,
                  background: "var(--mz-tenant-accent)",
                  borderRadius: "50%",
                }}
              />
            )}
            {s.title}
          </a>
        );
      })}
    </nav>
  );
}

function Section({ secao, role }) {
  const isPriority = role.priority.includes(secao.id);
  const isPlaceholder = role.placeholder.includes(secao.id) || role.id === "fall";

  return (
    <section
      id={`sec-${secao.id}`}
      style={{
        background: "var(--mz-bg-card)",
        border: isPriority ? "1px solid var(--mz-tenant-accent-soft)" : "1px solid var(--mz-rule)",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: isPriority ? "0 0 0 1px var(--mz-tenant-accent-soft) inset" : undefined,
        opacity: isPlaceholder ? 0.55 : 1,
        transition: "opacity 200ms",
      }}
    >
      <header
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--mz-rule)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "var(--mz-bg-card-2)",
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--mz-tenant-accent)",
            letterSpacing: "0.10em",
          }}
        >
          {secao.num}
        </span>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--mz-fg-strong)",
            margin: 0,
            letterSpacing: "0.02em",
          }}
        >
          {secao.title}
        </h2>
        {isPriority && (
          <span
            style={{
              fontSize: 9,
              background: "var(--mz-tenant-accent)",
              color: "var(--mz-fg-on-accent)",
              padding: "2px 6px",
              borderRadius: 999,
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            PRIORIDADE
          </span>
        )}
        {isPlaceholder && (
          <span
            style={{
              fontSize: 9,
              background: "var(--mz-warn-soft)",
              color: "var(--mz-warn)",
              padding: "2px 6px",
              borderRadius: 999,
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            EM CONSTRUÇÃO
          </span>
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: "var(--mz-fg-faint)",
            letterSpacing: "0.06em",
            fontWeight: 500,
          }}
        >
          {isPriority ? "Foco do cargo" : isPlaceholder ? "Aguardando dado" : "Padrão"}
        </span>
      </header>
      <div style={{ padding: 18 }}>{renderSection(secao.id, role)}</div>
    </section>
  );
}

/* ============ INSPECTOR (right panel) ============ */
function Inspector({ role }) {
  const visibleSections = SECTIONS.filter((s) => !role.hidden.includes(s.id));
  const totalSections = SECTIONS.length;
  const priorityCount = role.priority.length;
  const hiddenCount = role.hidden.length;
  const placeholderCount = role.placeholder.length;
  const padraoCount = visibleSections.length - priorityCount - placeholderCount;

  return (
    <aside
      style={{
        background: "var(--mz-bg-sidebar)",
        borderLeft: "1px solid var(--mz-rule)",
        overflowY: "auto",
      }}
    >
      <InspSection>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.10em",
            color: "var(--mz-tenant-accent)",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          {role.eyebrow}
        </div>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: "var(--mz-fg-strong)",
            margin: 0,
            letterSpacing: "-0.015em",
          }}
        >
          {role.pill}
        </h2>
        <p
          style={{
            color: "var(--mz-fg-muted)",
            fontSize: 11,
            marginTop: 8,
            lineHeight: 1.6,
          }}
        >
          {role.desc}
        </p>
      </InspSection>

      <InspSection titulo="Composição do Layout">
        <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
          {SECTIONS.map((s) => {
            const isPriority = role.priority.includes(s.id);
            const isHidden = role.hidden.includes(s.id);
            const isPlaceholder = role.placeholder.includes(s.id);
            const status = isHidden ? "🚫" : isPriority ? "★" : isPlaceholder ? "◯" : "·";
            return (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "16px 1fr",
                  gap: 8,
                  padding: "5px 0",
                  borderBottom: "1px dashed var(--mz-rule)",
                  color: "var(--mz-fg)",
                }}
              >
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 9.5,
                    color: "var(--mz-tenant-accent)",
                    fontWeight: 700,
                  }}
                >
                  {s.num}
                </span>
                <div>
                  <b
                    style={{
                      color: isPriority ? "var(--mz-tenant-accent)" : isHidden ? "var(--mz-fg-faint)" : isPlaceholder ? "var(--mz-warn)" : undefined,
                      textDecoration: isHidden ? "line-through" : undefined,
                    }}
                  >
                    {status} {s.title}
                  </b>
                </div>
              </div>
            );
          })}
        </div>
      </InspSection>

      <InspSection titulo="Resumo">
        <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
          <ResumoRow icon="★"  label={<><b style={{ color: "var(--mz-tenant-accent)" }}>{priorityCount}</b> seções priorizadas</>} />
          <ResumoRow icon="◯"  label={<><b style={{ color: "var(--mz-warn)" }}>{placeholderCount}</b> em construção (fallback)</>} />
          <ResumoRow icon="🚫" label={<><b style={{ color: "var(--mz-fg-faint)" }}>{hiddenCount}</b> ocultas (não se aplica)</>} />
          <ResumoRow icon="·"  label={<><b>{padraoCount}</b> em modo padrão</>} />
        </div>
      </InspSection>

      <InspSection titulo="Engine Técnica">
        <p style={{ fontSize: 11, color: "var(--mz-fg-muted)", lineHeight: 1.6, margin: "0 0 10px" }}>
          Componente único <code style={inspCodeStyle}>&lt;Dossie role={`{...}`} /&gt;</code> renderiza
          todas as {totalSections} seções, mas a config do cargo pode marcar cada seção como{" "}
          <code style={inspCodeStyle}>priority</code>,{" "}
          <code style={inspCodeStyle}>hidden</code> ou{" "}
          <code style={inspCodeStyle}>placeholder</code>.
        </p>
        <p style={{ fontSize: 11, color: "var(--mz-fg-muted)", lineHeight: 1.6, margin: 0 }}>
          Princípio César 25/04:{" "}
          <b style={{ color: "var(--mz-tenant-accent)" }}>nunca mostrar 0</b>. Quando dado falta,
          mostrar em construção sóbrio (sem inventar score).
        </p>
      </InspSection>
    </aside>
  );
}

function InspSection({ titulo, children }) {
  return (
    <section style={{ padding: "16px 20px", borderBottom: "1px solid var(--mz-rule)" }}>
      {titulo && (
        <h3
          style={{
            fontSize: 9.5,
            letterSpacing: "0.16em",
            color: "var(--mz-fg-faint)",
            textTransform: "uppercase",
            fontWeight: 700,
            margin: "0 0 10px",
          }}
        >
          {titulo}
        </h3>
      )}
      {children}
    </section>
  );
}

function ResumoRow({ icon, label }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "16px 1fr",
        gap: 8,
        padding: "5px 0",
        borderBottom: "1px dashed var(--mz-rule)",
        color: "var(--mz-fg)",
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9.5,
          color: "var(--mz-tenant-accent)",
          fontWeight: 700,
        }}
      >
        {icon}
      </span>
      <div>{label}</div>
    </div>
  );
}

const inspCodeStyle = {
  background: "var(--mz-bg-card)",
  border: "1px solid var(--mz-rule)",
  padding: "1px 5px",
  borderRadius: 3,
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 11,
  color: "var(--mz-fg-strong)",
};
