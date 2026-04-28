"use client";

/* Nominata · Aba 01 · Avaliação Saúde
 * 1:1 com Designer (07-saude-nominatas.html linhas 80-132 + app.js 51-225)
 *
 * Layout 3 colunas: lista comissões | hexágono 7 sub-medidas | identificação+flags
 * Default: Tatuí (caso crítico mais didático).
 */

import { useState } from "react";
import { NOMINATA_DATA, SUBMED_SHORT } from "./dados";
import { calcScore, tierColor, tierLabel, tierFromScore, fmt } from "./helpers";

const PICK_BADGE = {
  ok:   { bg: "rgba(22,163,74,0.15)",  fg: "#22c55e" },
  high: { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b" },
  crit: { bg: "rgba(220,38,38,0.18)",  fg: "#f87171" },
};

const FLAG_STYLE = {
  danger: { bg: "var(--mz-danger-soft)", border: "rgba(248,113,113,0.25)", fg: "var(--mz-danger)", ic: "✕ Crítico" },
  warn:   { bg: "var(--mz-warn-soft)",   border: "rgba(251,191,36,0.25)", fg: "var(--mz-warn)",   ic: "! Atenção" },
  info:   { bg: "var(--mz-info-soft)",   border: "rgba(96,165,250,0.20)", fg: "var(--mz-info)",   ic: "i Informativo" },
};

export function AvaliacaoSaude() {
  const [activeHex, setActiveHex] = useState("tatui");
  const c = NOMINATA_DATA.COMISSOES.find((x) => x.id === activeHex);
  const score = calcScore(c.scores);

  return (
    <div
      className="grid h-full"
      style={{ gridTemplateColumns: "320px 1fr 360px" }}
    >
      {/* COLUNA ESQUERDA · seleção de comissão */}
      <aside
        style={{
          background: "var(--mz-bg-sidebar)",
          borderRight: "1px solid var(--mz-rule)",
          overflowY: "auto",
          padding: "18px 20px",
        }}
      >
        <SectionHeader>Comissões · 3 destacadas</SectionHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {NOMINATA_DATA.COMISSOES.map((com) => (
            <PickCard
              key={com.id}
              com={com}
              active={activeHex === com.id}
              onClick={() => setActiveHex(com.id)}
            />
          ))}
        </div>

        <SectionHeader style={{ marginTop: 22 }}>Atalhos</SectionHeader>
        <PickCardStatic title="Ranking estadual completo" meta="645 munis · 18 amostradas no heatmap" />
        <PickCardStatic title="Histórico do score" meta="Variação semanal por comissão" />
      </aside>

      {/* COLUNA CENTRAL · hexágono */}
      <main
        style={{
          background: "var(--mz-bg-page)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: 32,
          overflowY: "auto",
        }}
      >
        <header
          style={{
            width: "100%",
            maxWidth: 720,
            marginBottom: 18,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 18,
            alignItems: "end",
          }}
        >
          <h1
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 30,
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
              Score · Saúde da Comissão Municipal
            </span>
            {c.nm}, {c.uf}
          </h1>
          <div
            style={{
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: 72,
              lineHeight: 1,
              letterSpacing: "0.02em",
              color: tierColor(c.tier),
            }}
          >
            {score}
            <small
              style={{
                fontSize: 16,
                color: "var(--mz-fg-faint)",
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
              }}
            >
              /100 · {tierLabel(c.tier)}
            </small>
          </div>
        </header>

        <Heptagono comissao={c} />

        {/* Legenda · 7 sub-medidas (grid 2 colunas) */}
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {NOMINATA_DATA.SUBMEDIDAS.map((sm) => {
            const v = c.scores[sm.key];
            const t = tierFromScore(v);
            return (
              <div
                key={sm.key}
                style={{
                  background: "var(--mz-bg-card)",
                  border: "1px solid var(--mz-rule)",
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mz-fg-strong)" }}>{sm.nm}</div>
                  <div style={{ fontFamily: "Bebas Neue", fontSize: 22, letterSpacing: "0.02em", color: tierColor(t) }}>
                    {v}
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: "var(--mz-fg-muted)", marginTop: 4, lineHeight: 1.4 }}>
                  {sm.desc}
                </div>
                <div
                  style={{
                    height: 4,
                    background: "var(--mz-bg-elevated)",
                    borderRadius: 2,
                    marginTop: 8,
                    overflow: "hidden",
                  }}
                >
                  <span style={{ display: "block", height: "100%", width: `${v}%`, background: tierColor(t) }} />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* COLUNA DIREITA · identificação + sinalizações + atualização */}
      <aside
        style={{
          background: "var(--mz-bg-sidebar)",
          borderLeft: "1px solid var(--mz-rule)",
          overflowY: "auto",
          padding: "18px 20px",
        }}
      >
        <SectionHeader>Identificação</SectionHeader>
        <div
          style={{
            background: "var(--mz-bg-card)",
            border: "1px solid var(--mz-rule)",
            borderRadius: 10,
            padding: 14,
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--mz-tenant-primary)",
                color: "var(--mz-tenant-accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Bebas Neue", fontSize: 14,
              }}
            >
              {c.pres.av}
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--mz-fg-strong)" }}>{c.pres.nm}</div>
              <div style={{ fontSize: 10.5, color: "var(--mz-fg-faint)" }}>{c.pres.cargo}</div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              paddingTop: 10,
              borderTop: "1px solid var(--mz-hairline)",
              fontSize: 11,
            }}
          >
            <KpiMini label="Pop." value={fmt(c.pop)} />
            <KpiMini label="Filiados" value={fmt(c.filiados)} />
            <KpiMini label="Candidatos" value={c.candidatos} />
            <KpiMini label="Mandato" value={c.mandato} small />
          </div>
        </div>

        <SectionHeader>
          Sinalizações {c.flags.length ? `· ${c.flags.length}` : ""}
        </SectionHeader>
        {c.flags.length ? (
          c.flags.map((f, i) => {
            const s = FLAG_STYLE[f.tipo];
            return (
              <div
                key={i}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  marginBottom: 8,
                  border: `1px solid ${s.border}`,
                  background: s.bg,
                  fontSize: 11.5,
                  lineHeight: 1.5,
                  color: "var(--mz-fg)",
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontFamily: "JetBrains Mono",
                    fontSize: 10,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: s.fg,
                  }}
                >
                  {s.ic}
                </div>
                <div style={{ marginTop: 4 }}>{f.label}</div>
              </div>
            );
          })
        ) : (
          <div
            style={{
              fontSize: 11.5,
              color: "var(--mz-ok)",
              padding: "12px 14px",
              background: "rgba(34,197,94,0.10)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: 10,
            }}
          >
            ✓ Nenhuma sinalização ativa
            <br />
            <span style={{ color: "var(--mz-fg-muted)", fontWeight: 500 }}>
              Comissão dentro dos parâmetros estatutários.
            </span>
          </div>
        )}

        <SectionHeader style={{ marginTop: 22 }}>Última atualização</SectionHeader>
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            color: "var(--mz-fg-muted)",
            padding: "10px 14px",
            background: "var(--mz-bg-card)",
            border: "1px solid var(--mz-rule)",
            borderRadius: 8,
          }}
        >
          {c.ult_atualizacao}
        </div>
      </aside>
    </div>
  );
}

/* ============ SUBCOMPONENTES ============ */

function SectionHeader({ children, style }) {
  return (
    <h3
      style={{
        fontSize: 9.5,
        letterSpacing: "0.16em",
        color: "var(--mz-fg-faint)",
        textTransform: "uppercase",
        fontWeight: 700,
        margin: "0 0 12px",
        ...style,
      }}
    >
      {children}
    </h3>
  );
}

function PickCard({ com, active, onClick }) {
  const s = calcScore(com.scores);
  const badge = PICK_BADGE[com.tier];
  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 12px",
        background: active ? "var(--mz-tenant-primary-soft)" : "var(--mz-bg-card)",
        border: `1px solid ${active ? "var(--mz-tenant-accent)" : "var(--mz-rule)"}`,
        borderRadius: 8,
        cursor: "pointer",
        transition: "border-color 100ms",
      }}
    >
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: "var(--mz-fg-strong)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {com.nm} · {com.uf}
        <span
          style={{
            fontSize: 9.5,
            fontFamily: "JetBrains Mono, monospace",
            padding: "1px 6px",
            borderRadius: 3,
            fontWeight: 700,
            background: badge.bg,
            color: badge.fg,
          }}
        >
          {tierLabel(com.tier)}
        </span>
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: "var(--mz-fg-faint)",
          marginTop: 4,
          lineHeight: 1.4,
          letterSpacing: "0.04em",
        }}
      >
        {fmt(com.pop)} hab · {fmt(com.filiados)} filiados · {com.candidatos} cand.
      </div>
      <div
        style={{
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: 22,
          lineHeight: 1,
          marginTop: 6,
          letterSpacing: "0.02em",
          color: tierColor(com.tier),
        }}
      >
        {s}{" "}
        <small
          style={{
            fontSize: 11,
            color: "var(--mz-fg-faint)",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
          }}
        >
          /100
        </small>
      </div>
    </div>
  );
}

function PickCardStatic({ title, meta }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderRadius: 8,
        marginBottom: 8,
        cursor: "default",
        opacity: 0.7,
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--mz-fg-strong)" }}>{title}</div>
      <div
        style={{
          fontSize: 10.5,
          color: "var(--mz-fg-faint)",
          marginTop: 4,
          lineHeight: 1.4,
          letterSpacing: "0.04em",
        }}
      >
        {meta}
      </div>
    </div>
  );
}

function KpiMini({ label, value, small }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.10em",
          color: "var(--mz-fg-faint)",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          color: "var(--mz-fg-strong)",
          fontWeight: 700,
          marginTop: 2,
          fontSize: small ? 10.5 : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ============ HEPTÁGONO SVG · 7 sub-medidas ============
 * Replica linha por linha o canvas do Designer (.app.js 95-184).
 * 540×560 viewBox · centro 270,280 · raio 165 · 7 ângulos = -π/2 + 2π/7 × i
 */
function Heptagono({ comissao }) {
  const cx = 270, cy = 280, R = 165;
  const subs = NOMINATA_DATA.SUBMEDIDAS;
  const angles = subs.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i) / subs.length);
  const score = calcScore(comissao.scores);
  const color = tierColor(comissao.tier);

  // grid concêntrica (4 níveis: 25/50/75/100)
  const gridLevels = [25, 50, 75, 100];

  // dados (vértice do polígono por sub-medida)
  const dataPts = subs.map((sm, i) => {
    const v = comissao.scores[sm.key];
    const r = R * (v / 100);
    return [cx + Math.cos(angles[i]) * r, cy + Math.sin(angles[i]) * r];
  });
  const polyPts = dataPts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

  return (
    <svg
      viewBox="0 0 540 560"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: 540, height: 560, maxWidth: "100%", flexShrink: 0, marginTop: -10 }}
    >
      {/* grid concêntrica */}
      {gridLevels.map((lvl) => {
        const r = R * (lvl / 100);
        const pts = angles
          .map((a) => `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`)
          .join(" ");
        return (
          <polygon
            key={lvl}
            points={pts}
            fill="none"
            stroke="var(--mz-rule)"
            strokeWidth={lvl === 100 ? 1.4 : 0.8}
            strokeDasharray={lvl === 100 ? "none" : "2 3"}
          />
        );
      })}

      {/* eixos */}
      {angles.map((a, i) => {
        const x2 = cx + Math.cos(a) * R;
        const y2 = cy + Math.sin(a) * R;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x2.toFixed(1)}
            y2={y2.toFixed(1)}
            stroke="var(--mz-rule)"
            strokeWidth={0.6}
            strokeDasharray="2 3"
          />
        );
      })}

      {/* labels níveis grid */}
      {gridLevels.map((lvl) => {
        const r = R * (lvl / 100);
        return (
          <text
            key={`lbl-${lvl}`}
            x={cx + 4}
            y={cy - r + 3}
            fontFamily="JetBrains Mono"
            fontSize="8"
            fill="var(--mz-fg-faint)"
            letterSpacing="0.04em"
          >
            {lvl}
          </text>
        );
      })}

      {/* polígono dos dados */}
      <polygon
        points={polyPts}
        fill={color}
        fillOpacity={0.18}
        stroke={color}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />

      {/* pontos nos vértices */}
      {dataPts.map((p, i) => (
        <circle
          key={i}
          cx={p[0].toFixed(1)}
          cy={p[1].toFixed(1)}
          r={3.6}
          fill={color}
          stroke="var(--mz-bg-page)"
          strokeWidth={1.5}
        />
      ))}

      {/* labels externos (nome + valor) */}
      {subs.map((sm, i) => {
        const r = R + 22;
        const x = cx + Math.cos(angles[i]) * r;
        const y = cy + Math.sin(angles[i]) * r;
        const v = comissao.scores[sm.key];
        const vColor = tierColor(tierFromScore(v));
        let anchor = "middle";
        if (Math.cos(angles[i]) > 0.2) anchor = "start";
        else if (Math.cos(angles[i]) < -0.2) anchor = "end";
        const dx = anchor === "start" ? 6 : anchor === "end" ? -6 : 0;
        return (
          <g key={sm.key}>
            <text
              x={(x + dx).toFixed(1)}
              y={(y - 3).toFixed(1)}
              textAnchor={anchor}
              fontFamily="Inter"
              fontSize="10.5"
              fontWeight="700"
              fill="var(--mz-fg-strong)"
              letterSpacing="0.06em"
            >
              {SUBMED_SHORT[sm.key]}
            </text>
            <text
              x={(x + dx).toFixed(1)}
              y={(y + 13).toFixed(1)}
              textAnchor={anchor}
              fontFamily="Bebas Neue"
              fontSize="22"
              fill={vColor}
              letterSpacing="0.04em"
            >
              {v}
            </text>
          </g>
        );
      })}

      {/* círculo central com score grande */}
      <circle cx={cx} cy={cy} r={38} fill="var(--mz-bg-card)" stroke={color} strokeWidth={1.2} />
      <text
        x={cx}
        y={cy + 5}
        textAnchor="middle"
        fontFamily="Bebas Neue"
        fontSize="32"
        fill={color}
        letterSpacing="0.02em"
      >
        {score}
      </text>
    </svg>
  );
}
