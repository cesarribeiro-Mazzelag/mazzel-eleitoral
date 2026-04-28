"use client";

/* Mapa Estratégico · Sidebar direita (preview da UF selecionada)
 *
 * Lê UF selecionada do useMapaStore (geography.uf) - mesmo store que o
 * MapaEleitoral usa internamente. Atualiza automaticamente ao clicar em
 * estado no mapa.
 *
 * Layout 1:1 com Designer (01-mapa-estrategico.html linhas 1044-1097):
 *   - Header: badge UF (Bebas 36px) + nome + região + botões (Dossiê / Dashboard)
 *   - KPIs grid 2x3 (Filiados / Cobertura / Score Md / % Votos UB / Eventos / Alertas)
 *   - Mini-cartinha do Pres. Estadual (OVR / Tier / Lid)
 *   - Sentinela 24h (lista alertas dinâmica por UF)
 *   - Ações Sugeridas (3 atalhos)
 *
 * Quando nenhuma UF selecionada → empty state convidando a clicar.
 */

import { useMapaStore } from "@/lib/store/mapaStore";
import { UF_DATA, UF_NOME, UF_REGIAO } from "./dados";

export function SidebarPreviewUF() {
  const uf = useMapaStore((s) => s.geography.uf);
  const d = uf ? UF_DATA[uf] : null;

  if (!uf || !d) {
    return (
      <aside style={asideStyle}>
        <div
          style={{
            padding: 20,
            margin: 20,
            textAlign: "center",
            background: "var(--mz-bg-card)",
            border: "1px dashed var(--mz-rule-strong)",
            borderRadius: 10,
            fontSize: 11.5,
            color: "var(--mz-fg-faint)",
            lineHeight: 1.5,
          }}
        >
          Clique em uma UF no mapa
          <br />
          para ver o detalhamento da operação UB.
        </div>
      </aside>
    );
  }

  const nome = UF_NOME[uf] || uf;
  const regiao = UF_REGIAO[uf] || "—";

  return (
    <aside style={asideStyle}>
      {/* HEAD */}
      <div
        style={{
          padding: "18px 22px 14px",
          borderBottom: "1px solid var(--mz-rule)",
          background:
            "linear-gradient(135deg, var(--mz-tenant-primary-soft), transparent), var(--mz-bg-sidebar)",
          position: "relative",
        }}
      >
        <span
          style={{
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: 36,
            background: "var(--mz-tenant-accent)",
            color: "var(--mz-fg-on-accent)",
            padding: "0 12px",
            borderRadius: 6,
            lineHeight: 1.1,
            display: "inline-block",
          }}
        >
          {uf}
        </span>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "var(--mz-fg-strong)",
            letterSpacing: "-0.015em",
            margin: "8px 0 2px",
          }}
        >
          {nome}
        </h1>
        <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", letterSpacing: "0.04em" }}>
          {regiao} · <b style={{ color: "var(--mz-fg)", fontWeight: 600 }}>{d.mand} mandatos</b>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          <Btn primary>Abrir Dossiê do Pres. Est.</Btn>
          <Btn>Ir pro Dashboard</Btn>
        </div>
      </div>

      {/* KPIs · Estado */}
      <Section title="KPIs · Estado">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Kpi label="Filiados"     value={d.fil.toLocaleString("pt-BR")}             delta={`+${Math.floor(d.fil * 0.018).toLocaleString("pt-BR")} 30d`} up />
          <Kpi label="Cobertura"    value={`${d.cob}%`}                               delta={`${d.cob >= 70 ? "+" : ""}meta 80%`}                up={d.cob >= 70} />
          <Kpi label="Score Md."    value={d.score}                                   delta="+1.2 7d"                                            up />
          <Kpi label="% Votos UB"   value={`${d.votosUB}%`}                           delta={d.vencedor ? "aliado venceu" : "aliado perdeu"}     up={!!d.vencedor} />
          <Kpi label="Eventos +30d" value={d.eventos}                                 delta="próximos" />
          <Kpi label="Alertas"      value={d.alertas}                                 delta={d.risco === "alta" ? "risco ALTO" : d.risco === "media" ? "risco médio" : "sob controle"} valueColor={d.alertas >= 5 ? "var(--mz-danger)" : d.alertas >= 3 ? "var(--mz-warn)" : undefined} />
        </div>
      </Section>

      {/* Pres. Estadual · mini-cartinha */}
      <Section title={`Pres. Estadual · ${uf}`}>
        <div
          style={{
            background: "linear-gradient(135deg, var(--mz-tenant-primary), var(--mz-tenant-primary-strong))",
            border: "1px solid var(--mz-tenant-accent)",
            borderRadius: 8,
            padding: 12,
            display: "grid",
            gridTemplateColumns: "56px 1fr",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              background: "rgba(0,0,0,0.2)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: 26,
              color: "var(--mz-tenant-accent)",
            }}
          >
            {d.pres
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.15 }}>
              {d.pres}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.04em",
                marginTop: 2,
              }}
            >
              Pres. Estadual UB · {uf}
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 6,
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                color: "var(--mz-tenant-accent)",
              }}
            >
              <span>
                <b style={{ color: "#fff" }}>{d.presOvr}</b> OVR
              </span>
              <span>
                <b style={{ color: "#fff" }}>
                  {d.presOvr >= 80 ? "A" : d.presOvr >= 70 ? "B" : "C"}
                </b>{" "}
                Tier
              </span>
              <span>
                <b style={{ color: "#fff" }}>{d.lid}</b> lid.
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* Sentinela 24h */}
      <Section title={`Sentinela · 24h em ${uf}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {d.alertas >= 5 && (
            <SentinelaRow
              kind="alta"
              ic="!"
              title={`Alertas críticos · ${d.alertas}`}
              sub="Risco jurídico ou interno"
              when="24h"
            />
          )}
          {d.eventos >= 8 && (
            <SentinelaRow
              kind="opo"
              ic="★"
              title={`${d.eventos} eventos agendados`}
              sub="+30 dias · agenda partidária"
              when="+30d"
            />
          )}
          <SentinelaRow
            kind="media"
            ic="⚡"
            title={`${d.lid} lideranças mapeadas`}
            sub="OVR ≥ 75 · escala territorial"
            when="live"
          />
          {!d.vencedor && (
            <SentinelaRow
              kind="alta"
              ic="↓"
              title="Aliado UB perdeu eleição executiva"
              sub="Strat: recuperação 2028"
              when="2022"
            />
          )}
        </div>
      </Section>

      {/* Ações sugeridas */}
      <Section title="Ações Sugeridas">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SentinelaRow kind="opo" ic="+" title={`Criar operação territorial em ${uf}`} sub="Wizard 6 passos · partido + diretório" when="›" />
          <SentinelaRow kind="default" ic="≡" title={`Ranking dos ${d.mand} mandatos`} sub="OVR Pres. Municipais ordenado" when="›" />
          <SentinelaRow kind="default" ic="📋" title={`Briefing executivo · ${uf}`} sub="PDF pronto · 12 págs" when="›" />
        </div>
      </Section>
    </aside>
  );
}

/* ============ SUBCOMPONENTES ============ */

const asideStyle = {
  background: "var(--mz-bg-sidebar)",
  borderLeft: "1px solid var(--mz-rule)",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  height: "100%",
};

function Section({ title, children }) {
  return (
    <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--mz-rule)" }}>
      <h3
        style={{
          fontSize: 9.5,
          letterSpacing: "0.16em",
          color: "var(--mz-fg-faint)",
          textTransform: "uppercase",
          fontWeight: 700,
          margin: "0 0 12px",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function Btn({ children, primary }) {
  return (
    <button
      style={{
        flex: 1,
        fontSize: 11,
        fontWeight: 600,
        padding: "7px 10px",
        background: primary ? "var(--mz-tenant-primary)" : "var(--mz-bg-card)",
        border: primary ? "1px solid var(--mz-tenant-primary-strong)" : "1px solid var(--mz-rule)",
        color: primary ? "#fff" : "var(--mz-fg)",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Kpi({ label, value, delta, up, valueColor }) {
  return (
    <div
      style={{
        background: "var(--mz-bg-card)",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
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
          fontSize: 18,
          fontWeight: 700,
          color: valueColor || "var(--mz-fg-strong)",
          lineHeight: 1.2,
          marginTop: 2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          fontVariantNumeric: "tabular-nums",
          color:
            up === true ? "var(--mz-ok)" : up === false ? "var(--mz-danger)" : "var(--mz-fg-faint)",
        }}
      >
        {delta}
      </div>
    </div>
  );
}

function SentinelaRow({ kind, ic, title, sub, when }) {
  const colors = {
    alta:    { border: "var(--mz-danger)",        icBg: "var(--mz-danger-soft)", icColor: "var(--mz-danger)" },
    media:   { border: "var(--mz-warn)",          icBg: "var(--mz-warn-soft)",   icColor: "var(--mz-warn)" },
    opo:     { border: "var(--mz-tenant-accent)", icBg: "var(--mz-tenant-accent)", icColor: "var(--mz-fg-on-accent)" },
    default: { border: "var(--mz-rule)",          icBg: "var(--mz-bg-elevated)", icColor: "var(--mz-fg)" },
  };
  const c = colors[kind] || colors.default;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 10,
        padding: 10,
        background: "var(--mz-bg-card)",
        borderRadius: 8,
        alignItems: "center",
        fontSize: 11,
        borderLeft: `3px solid ${c.border}`,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          background: c.icBg,
          color: c.icColor,
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {ic}
      </div>
      <div>
        <b style={{ display: "block", color: "var(--mz-fg-strong)", fontWeight: 600, fontSize: 12 }}>
          {title}
        </b>
        <span style={{ color: "var(--mz-fg-faint)", fontSize: 10.5 }}>{sub}</span>
      </div>
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9.5,
          color: "var(--mz-fg-faint)",
          whiteSpace: "nowrap",
        }}
      >
        {when}
      </span>
    </div>
  );
}
