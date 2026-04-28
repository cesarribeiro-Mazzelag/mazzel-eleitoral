"use client";

/* Nominata · Aba 03 · Ranking
 * 1:1 com Designer (07-saude-nominatas.html linhas 162-221 + app.js 358-424)
 *
 * 3 cards destaque (Bauru/Marília/Tatuí) com sub-medidas + sinalizações
 * Tabela 18 linhas ordenadas por score decrescente, todas as comissões.
 */

import { NOMINATA_DATA } from "./dados";
import { calcScore, tierColor, tierLabel, fmt } from "./helpers";

export function Ranking() {
  const all = [
    ...NOMINATA_DATA.COMISSOES.map((c) => ({ ...c, score: calcScore(c.scores) })),
    ...NOMINATA_DATA.COMISSOES_SECUNDARIAS.map((c) => ({ ...c, candidatos: "—", filiados: null })),
  ].sort((a, b) => b.score - a.score);

  return (
    <div
      style={{
        padding: "24px 28px",
        overflowY: "auto",
        height: "100%",
        background: "var(--mz-bg-page)",
      }}
    >
      <header style={{ marginBottom: 22 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--mz-fg-strong)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: 11,
              color: "var(--mz-fg-faint)",
              fontWeight: 600,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Ranking estadual · saúde da nominata
          </span>
          3 comissões em destaque + amostragem
        </h1>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--mz-fg-muted)",
            margin: "8px 0 0",
            maxWidth: 720,
            lineHeight: 1.55,
          }}
        >
          O score Saúde de Comissão consolida sete sub-medidas estatutárias e legais
          (paridade, vinculação territorial, conformidade documental, etc) numa nota única
          de 0-100. Comparativo entre comissões municipais escolhidas como exemplares
          para validação do método.
        </p>
      </header>

      {/* 3 cards destaque */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {NOMINATA_DATA.COMISSOES.map((c) => (
          <DestaqueCard key={c.id} comissao={c} />
        ))}
      </div>

      {/* Tabela rank */}
      <div
        style={{
          background: "var(--mz-bg-card)",
          border: "1px solid var(--mz-rule)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <h2
          style={{
            padding: "14px 18px",
            margin: 0,
            fontSize: 13,
            color: "var(--mz-fg-strong)",
            fontWeight: 700,
            borderBottom: "1px solid var(--mz-rule)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Amostra estadual · 18 comissões
          <span
            style={{
              fontSize: 10.5,
              color: "var(--mz-fg-faint)",
              fontWeight: 500,
              letterSpacing: "0.04em",
            }}
          >
            de 645 municípios SP · ordenadas por score decrescente
          </span>
        </h2>
        {all.map((c, i) => (
          <RankRow key={c.id} pos={i + 1} comissao={c} />
        ))}
      </div>
    </div>
  );
}

/* ============ DESTAQUE CARD ============ */
function DestaqueCard({ comissao: c }) {
  const s = calcScore(c.scores);
  const tier = c.tier;
  const borderTopColor = tier === "ok" ? "#22c55e" : tier === "high" ? "#f59e0b" : "#dc2626";
  const flagsList = c.flags.length ? c.flags.slice(0, 4) : null;

  return (
    <div
      style={{
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderRadius: 12,
        overflow: "hidden",
        borderTop: `4px solid ${borderTopColor}`,
      }}
    >
      {/* head */}
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid var(--mz-rule)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "var(--mz-tenant-primary)",
            color: "var(--mz-tenant-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: 14,
          }}
        >
          {c.pres.av}
        </div>
        <div>
          <b style={{ fontSize: 14, color: "var(--mz-fg-strong)", display: "block", fontWeight: 700 }}>
            {c.nm}, {c.uf}
          </b>
          <span style={{ fontSize: 10.5, color: "var(--mz-fg-faint)" }}>{c.pres.nm}</span>
        </div>
      </div>

      {/* score row */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--mz-rule)",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 9.5,
            letterSpacing: "0.16em",
            color: "var(--mz-fg-faint)",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Score Saúde · {tierLabel(tier)}
        </div>
        <div
          style={{
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: 36,
            lineHeight: 1,
            color: tierColor(tier),
          }}
        >
          {s}
          <small
            style={{
              fontSize: 13,
              color: "var(--mz-fg-faint)",
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
            }}
          >
            {" "}
            /100
          </small>
        </div>
      </div>

      {/* stats grid 2x3 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        <Stat label="População"        value={fmt(c.pop)} />
        <Stat label="Filiados"         value={fmt(c.filiados)} />
        <Stat label="Candidatos"       value={c.candidatos} />
        <Stat label="Mandato"          value={c.mandato} small />
        <Stat label="Paridade gênero"  value={c.scores.paridade} last />
        <Stat label="Conformidade doc." value={c.scores.documental} last />
      </div>

      {/* flag list */}
      <div style={{ padding: "12px 18px" }}>
        <div
          style={{
            fontSize: 9.5,
            letterSpacing: "0.14em",
            color: "var(--mz-fg-faint)",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Sinalizações {c.flags.length ? `· ${c.flags.length}` : ""}
        </div>
        {flagsList ? (
          <>
            {flagsList.map((f, i) => (
              <FlagLine key={i} tipo={f.tipo} label={f.label} />
            ))}
            {c.flags.length > 4 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "14px 1fr",
                  gap: 6,
                  fontSize: 11,
                  color: "var(--mz-fg-faint)",
                  fontStyle: "italic",
                  padding: "5px 0",
                }}
              >
                <span></span>
                <span>+ {c.flags.length - 4} sinalização(ões) adicional(is)</span>
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 11, color: "var(--mz-ok)", fontWeight: 600 }}>
            ✓ Nenhuma sinalização - dentro dos parâmetros
          </div>
        )}
      </div>

      {/* cta */}
      <div style={{ padding: "14px 18px", borderTop: "1px solid var(--mz-rule)" }}>
        <button
          style={{
            width: "100%",
            padding: 9,
            borderRadius: 8,
            border: "1px solid var(--mz-rule)",
            background: "var(--mz-bg-card-2)",
            color: "var(--mz-fg)",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 100ms",
          }}
        >
          Abrir dossiê detalhado →
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, small, last }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRight: "1px solid var(--mz-rule)",
        borderBottom: last ? "0" : "1px solid var(--mz-rule)",
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.10em",
          color: "var(--mz-fg-faint)",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: small ? 11.5 : 13,
          color: "var(--mz-fg-strong)",
          fontWeight: 700,
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function FlagLine({ tipo, label }) {
  const ic = tipo === "danger" ? "✕" : tipo === "warn" ? "!" : "i";
  const color =
    tipo === "danger" ? "var(--mz-danger)" :
    tipo === "warn"   ? "var(--mz-warn)"   :
                        "var(--mz-info)";
  return (
    <div
      style={{
        fontSize: 11,
        color: "var(--mz-fg)",
        padding: "5px 0",
        borderBottom: "1px solid var(--mz-hairline)",
        lineHeight: 1.4,
        display: "grid",
        gridTemplateColumns: "14px 1fr",
        gap: 6,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 10, color }}>{ic}</span>
      <span>{label}</span>
    </div>
  );
}

/* ============ RANK ROW ============ */
function RankRow({ pos, comissao: c }) {
  const isMain = !!c.scores;
  const col = tierColor(c.tier);
  const bg = c.tier === "ok"   ? "rgba(34, 197, 94, 0.15)" :
             c.tier === "high" ? "rgba(245, 158, 11, 0.15)" :
                                 "rgba(220, 38, 38, 0.18)";
  const fg = c.tier === "ok" ? "#22c55e" : c.tier === "high" ? "#f59e0b" : "#f87171";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "28px 1fr 110px 110px 100px",
        padding: "11px 18px",
        gap: 12,
        borderBottom: "1px solid var(--mz-hairline)",
        alignItems: "center",
        fontSize: 12,
        cursor: "pointer",
        transition: "background 80ms",
      }}
    >
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10.5,
          color: "var(--mz-fg-faint)",
          fontWeight: 700,
        }}
      >
        #{String(pos).padStart(2, "0")}
      </div>
      <div style={{ fontWeight: 600, color: "var(--mz-fg-strong)" }}>
        {c.nm}
        {isMain && (
          <small
            style={{
              color: "var(--mz-tenant-accent)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginLeft: 6,
            }}
          >
            ★ destaque
          </small>
        )}
        <small
          style={{
            display: "block",
            fontSize: 10,
            color: "var(--mz-fg-faint)",
            fontWeight: 500,
            marginTop: 1,
          }}
        >
          {fmt(c.pop)} hab
        </small>
      </div>
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          color: "var(--mz-fg-muted)",
        }}
      >
        {isMain ? `${fmt(c.filiados)} fil.` : "—"}
      </div>
      <div
        style={{
          height: 6,
          background: "var(--mz-bg-elevated)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <span style={{ display: "block", height: "100%", width: `${c.score}%`, background: col }} />
      </div>
      <div
        style={{
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: 18,
          padding: "1px 9px",
          borderRadius: 4,
          textAlign: "center",
          background: bg,
          color: fg,
        }}
      >
        {c.score}
      </div>
    </div>
  );
}
