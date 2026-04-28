"use client";

/* Nominata · Aba 05 · Alertas Anti-Fraude
 * 1:1 com Designer (07-saude-nominatas.html linhas 291-339 + app.js 608-680)
 *
 * Linguagem NEUTRA: "padrão atípico detectado", "concentração de origem",
 * "filiação em pulso". Nunca "fraude", "crime", "denúncia".
 */

import { NOMINATA_DATA } from "./dados";

const GRUPOS = [
  { tag: "AGORA",  title: "Em curso · últimas 6h" },
  { tag: "24h",    title: "Últimas 24 horas" },
  { tag: "semana", title: "Esta semana" },
];

const SEV_STYLE = {
  crit: { borderLeft: "#dc2626", icBg: "var(--mz-danger-soft)", icColor: "var(--mz-danger)", sevBg: "var(--mz-danger-soft)", sevColor: "var(--mz-danger)", label: "CRÍTICO" },
  high: { borderLeft: "#f59e0b", icBg: "var(--mz-warn-soft)",   icColor: "var(--mz-warn)",   sevBg: "var(--mz-warn-soft)",   sevColor: "var(--mz-warn)",   label: "ALTO" },
  med:  { borderLeft: "#60a5fa", icBg: "var(--mz-info-soft)",   icColor: "var(--mz-info)",   sevBg: "var(--mz-info-soft)",   sevColor: "var(--mz-info)",   label: "MÉDIO" },
};

const RULE_BORDER = {
  crit: "#dc2626",
  high: "#f59e0b",
  med:  "#60a5fa",
};

export function Alertas() {
  return (
    <div
      className="grid h-full"
      style={{ gridTemplateColumns: "1fr 360px" }}
    >
      {/* FEED esquerda */}
      <main
        style={{
          padding: "24px 28px",
          overflowY: "auto",
        }}
      >
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "var(--mz-fg-strong)",
            margin: "0 0 4px",
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
              marginBottom: 4,
            }}
          >
            Sistema de alertas · Saúde da Nominata
          </span>
          Padrões atípicos detectados pelo cron Mazzel
        </h2>

        <div
          style={{
            background: "var(--mz-bg-card)",
            borderLeft: "3px solid var(--mz-tenant-accent)",
            padding: "10px 14px",
            borderRadius: "0 8px 8px 0",
            margin: "18px 0 22px",
            fontSize: 11.5,
            color: "var(--mz-fg-muted)",
            lineHeight: 1.55,
          }}
        >
          <b style={{ color: "var(--mz-fg)" }}>Nota de linguagem.</b> Os alertas usam linguagem
          neutra e descritiva - "padrão atípico", "concentração de origem", "filiação em pulso" -
          para sinalizar desvios estatísticos ou estatutários sem prejulgar intenção. A
          interpretação cabe à Comissão Estadual e, quando aplicável, ao Conselho de Ética.{" "}
          <b style={{ color: "var(--mz-fg)" }}>Mazzel sinaliza, não acusa.</b>
        </div>

        {GRUPOS.map((g) => {
          const items = NOMINATA_DATA.ALERTAS.filter((a) => a.when_tag === g.tag);
          if (!items.length) return null;
          return (
            <div key={g.tag} style={{ marginBottom: 22 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                  paddingBottom: 8,
                  borderBottom: "1px solid var(--mz-rule)",
                }}
              >
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--mz-fg-faint)",
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  {g.title}
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 10.5,
                    color: "var(--mz-fg-faint)",
                  }}
                >
                  {items.length} alerta{items.length > 1 ? "s" : ""}
                </div>
              </div>
              {items.map((a) => (
                <AlertaItem key={a.id} alerta={a} />
              ))}
            </div>
          );
        })}
      </main>

      {/* SIDE direita */}
      <aside
        style={{
          background: "var(--mz-bg-sidebar)",
          borderLeft: "1px solid var(--mz-rule)",
          padding: "22px 20px",
          overflowY: "auto",
        }}
      >
        <SectionHeader>Resumo · 30 dias</SectionHeader>
        <ResumoRow label="Críticos"   value={3}     color="#f87171" />
        <ResumoRow label="Altos"      value={5}     color="#f59e0b" />
        <ResumoRow label="Médios"     value={12}    color="#60a5fa" />
        <ResumoRow label="Resolvidos" value="9 / 20" color="var(--mz-ok)" last />

        <SectionHeader style={{ marginTop: 22 }}>
          Regras configuradas · {NOMINATA_DATA.REGRAS.length}
        </SectionHeader>
        {NOMINATA_DATA.REGRAS.map((r) => (
          <RuleCard key={r.nm} regra={r} />
        ))}

        <SectionHeader style={{ marginTop: 22 }}>Política de comunicação</SectionHeader>
        <div
          style={{
            fontSize: 11,
            color: "var(--mz-fg-muted)",
            lineHeight: 1.6,
            padding: "10px 12px",
            background: "var(--mz-bg-card)",
            border: "1px solid var(--mz-rule)",
            borderRadius: 8,
          }}
        >
          Alertas críticos vão para{" "}
          <b style={{ color: "var(--mz-fg)" }}>presidência estadual + jurídico</b> via push e email.
          <br />
          Alertas altos vão para{" "}
          <b style={{ color: "var(--mz-fg)" }}>comissão municipal + jurídico</b> via email.
          <br />
          Alertas médios ficam na timeline do dossiê.
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
        margin: "0 0 14px",
        ...style,
      }}
    >
      {children}
    </h3>
  );
}

function AlertaItem({ alerta: a }) {
  const s = SEV_STYLE[a.sev];
  const ic = a.sev === "crit" ? "✕" : a.sev === "high" ? "!" : "i";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "36px 1fr 200px",
        gap: 14,
        padding: 14,
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderLeft: `3px solid ${s.borderLeft}`,
        borderRadius: 10,
        marginBottom: 8,
        cursor: "pointer",
        transition: "border-color 100ms",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 14,
          background: s.icBg,
          color: s.icColor,
        }}
      >
        {ic}
      </div>
      <div>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9.5,
              padding: "2px 7px",
              borderRadius: 3,
              letterSpacing: "0.10em",
              fontWeight: 700,
              background: s.sevBg,
              color: s.sevColor,
            }}
          >
            {s.label}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--mz-fg-strong)" }}>
            {a.titulo}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--mz-fg-muted)", marginTop: 5, lineHeight: 1.5 }}>
          {a.desc}
        </div>
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            color: "var(--mz-fg-faint)",
            marginTop: 6,
            letterSpacing: "0.04em",
          }}
        >
          LÓGICA: {a.logica} · TARGET: {a.target} · ID {a.id}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10.5,
            color: "var(--mz-fg-faint)",
          }}
        >
          {a.when}
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {a.channels.map((ch) => (
            <span
              key={ch}
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                padding: "2px 6px",
                borderRadius: 3,
                background: "var(--mz-bg-card-2)",
                color: "var(--mz-fg-muted)",
                border: "1px solid var(--mz-rule)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {ch}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResumoRow({ label, value, color, last }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "7px 0",
        fontSize: 11.5,
        borderBottom: last ? "0" : "1px solid var(--mz-rule)",
      }}
    >
      <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{label}</b>
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          color,
          fontWeight: 700,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function RuleCard({ regra: r }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderLeft: `3px solid ${RULE_BORDER[r.sev]}`,
        borderRadius: 10,
        marginBottom: 8,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mz-fg-strong)" }}>{r.nm}</div>
      <div style={{ fontSize: 10.5, color: "var(--mz-fg-muted)", marginTop: 4, lineHeight: 1.45 }}>
        {r.desc}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
        {r.channels.map((ch) => (
          <span
            key={ch}
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              padding: "2px 6px",
              borderRadius: 3,
              background: "var(--mz-bg-card-2)",
              color: "var(--mz-fg-muted)",
              border: "1px solid var(--mz-rule)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {ch}
          </span>
        ))}
      </div>
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9.5,
          color: "var(--mz-fg-faint)",
          marginTop: 4,
          letterSpacing: "0.04em",
        }}
      >
        FREQ · {r.freq}
      </div>
    </div>
  );
}
