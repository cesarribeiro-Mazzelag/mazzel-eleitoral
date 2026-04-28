"use client";

/* Mapa Estratégico · Topbar
 *
 * Combina:
 *   - 3 Modos pré-configurados (decisão Cérebro 27/04 - dropdown principal)
 *   - 5 camadas individuais (modo Avançado, plataforma.html linhas 1226-1232)
 *   - Ano + Comparar UFs + Exportar
 *
 * Default ao abrir = Modo "Saúde Operacional".
 * Botão ⚙ Avançado expande as 5 pílulas individuais.
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Filter, Download, Settings2 } from "lucide-react";
import { MODOS, CAMADAS_AVANCADAS, ANOS } from "./dados";

export function TopbarEstrategico({
  modo,
  onModo,
  camadaAvancada,
  onCamadaAvancada,
  ano,
  onAno,
  comparando,
  onComparar,
  avancadoAberto,
  onToggleAvancado,
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        right: 12,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 10px",
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Dropdown Modo (3 pré-configurados) */}
      <DropdownModo modo={modo} onModo={onModo} />

      <Divider />

      {/* Botão Avançado · expande 5 camadas individuais */}
      <button
        onClick={onToggleAvancado}
        title="Modo Avançado · combinar camadas livres"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: 30,
          padding: "0 10px",
          background: avancadoAberto ? "var(--mz-tenant-primary-soft)" : "transparent",
          border: "1px dashed var(--mz-rule-strong)",
          color: avancadoAberto ? "var(--mz-tenant-accent)" : "var(--mz-fg-muted)",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          borderRadius: 6,
          fontFamily: "JetBrains Mono, monospace",
          letterSpacing: "0.04em",
        }}
      >
        <Settings2 size={11} /> avançado
      </button>

      {/* Camadas individuais (visíveis quando Avançado aberto) */}
      {avancadoAberto && (
        <>
          <Divider />
          <span
            style={{
              fontSize: 10,
              color: "var(--mz-fg-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.10em",
              fontWeight: 600,
              padding: "0 4px",
            }}
          >
            Camada
          </span>
          {CAMADAS_AVANCADAS.map((c) => {
            const ativo = camadaAvancada === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onCamadaAvancada(c.id)}
                style={{
                  height: 28,
                  padding: "0 10px",
                  background: ativo ? "var(--mz-fg-strong)" : "transparent",
                  border: ativo ? "1px solid var(--mz-fg-strong)" : "1px solid var(--mz-rule)",
                  color: ativo ? "var(--mz-bg-page)" : "var(--mz-fg)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                }}
              >
                {c.label}
              </button>
            );
          })}
        </>
      )}

      <Divider />

      {/* Ano (dropdown) */}
      <span
        style={{
          fontSize: 10,
          color: "var(--mz-fg-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.10em",
          fontWeight: 600,
          padding: "0 4px",
        }}
      >
        Ano
      </span>
      <select
        value={ano}
        onChange={(e) => onAno(e.target.value)}
        style={{
          height: 28,
          padding: "0 8px",
          background: "var(--mz-bg-page)",
          border: "1px solid var(--mz-rule)",
          color: "var(--mz-fg)",
          fontSize: 11,
          fontWeight: 600,
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        {ANOS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <div style={{ flex: 1 }} />

      {/* Comparar UFs */}
      <button
        onClick={onComparar}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          height: 28,
          padding: "0 10px",
          background: comparando ? "var(--mz-tenant-primary-soft)" : "transparent",
          border: "1px solid var(--mz-rule)",
          color: comparando ? "var(--mz-tenant-accent)" : "var(--mz-fg)",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          borderRadius: 6,
        }}
      >
        <Filter size={11} /> {comparando ? "Comparando 2 UFs" : "Comparar UFs"}
      </button>

      {/* Exportar */}
      <button
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          height: 28,
          padding: "0 10px",
          background: "transparent",
          border: "1px solid var(--mz-rule)",
          color: "var(--mz-fg)",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          borderRadius: 6,
        }}
      >
        <Download size={11} /> Exportar
      </button>
    </div>
  );
}

/* ============ DROPDOWN MODO (3 pré-configs) ============ */

function DropdownModo({ modo, onModo }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const ativo = MODOS.find((m) => m.id === modo) || MODOS[0];

  useEffect(() => {
    if (!aberto) return;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    };
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [aberto]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setAberto((v) => !v)}
        title="Trocar modo de visualização (Saúde Op / Fluxo Dinheiro / Compliance)"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 30,
          padding: "0 12px",
          background: "var(--mz-fg-strong)",
          border: "1px solid var(--mz-fg-strong)",
          color: "var(--mz-bg-page)",
          fontSize: 11.5,
          fontWeight: 700,
          cursor: "pointer",
          borderRadius: 8,
          letterSpacing: "0.01em",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: ativo.accent,
            boxShadow: ativo.critico ? `0 0 6px ${ativo.accent}` : "none",
          }}
        />
        Modo · {ativo.titulo}
        <ChevronDown
          size={13}
          style={{ transition: "transform 120ms", transform: aberto ? "rotate(180deg)" : "none" }}
        />
      </button>

      {aberto && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: 360,
            background: "var(--mz-bg-card)",
            border: "1px solid var(--mz-rule-strong)",
            borderRadius: 10,
            boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
            padding: 6,
            zIndex: 50,
          }}
        >
          {MODOS.map((m) => {
            const isActive = m.id === modo;
            return (
              <button
                key={m.id}
                onClick={() => {
                  onModo(m.id);
                  setAberto(false);
                }}
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "6px 1fr auto",
                  gap: 12,
                  alignItems: "flex-start",
                  textAlign: "left",
                  padding: "12px 12px",
                  background: isActive ? "var(--mz-tenant-primary-soft)" : "transparent",
                  border: 0,
                  borderRadius: 8,
                  cursor: "pointer",
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 38,
                    borderRadius: 3,
                    background: m.accent,
                    boxShadow: m.critico ? `0 0 8px ${m.accent}` : "none",
                  }}
                />
                <div style={{ lineHeight: 1.35 }}>
                  <b
                    style={{
                      fontSize: 12,
                      color: "var(--mz-fg-strong)",
                      display: "block",
                      marginBottom: 2,
                    }}
                  >
                    {m.titulo}
                  </b>
                  <span
                    style={{
                      fontSize: 10.5,
                      color: "var(--mz-fg-muted)",
                      display: "block",
                      marginBottom: 4,
                      fontStyle: "italic",
                    }}
                  >
                    "{m.pergunta}"
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--mz-fg-faint)",
                      display: "block",
                      lineHeight: 1.4,
                    }}
                  >
                    {m.camadas}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: isActive ? "var(--mz-tenant-accent)" : "var(--mz-fg-faint)",
                    marginTop: 2,
                  }}
                >
                  {isActive ? "●" : "○"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 22, background: "var(--mz-rule)", flexShrink: 0 }} />;
}
