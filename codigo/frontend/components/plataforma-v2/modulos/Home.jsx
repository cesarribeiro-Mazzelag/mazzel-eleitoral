"use client";

/* Home · Dashboard Linear (minimalista).
 * Designer V1.2 F2-01 Variação A — escolhida em 27/04/2026.
 *
 * Tipografia FIEL ao mockup:
 *   - Eyebrow:   11px / weight 500 / letter-spacing 0.10em
 *   - Headline:  36px / weight 800 / letter-spacing -0.025em / line-height 1.05
 *   - KPI label: 11px / weight 600 / letter-spacing 0.08em
 *   - KPI value: 44px / weight 800 / letter-spacing -0.025em / Inter (NÃO Bebas)
 *   - Card h3:   12px / weight 700 / letter-spacing 0.02em
 *
 * Reais (com fallback graceful pra mock):
 *   - KPI Filiados SP        <- API.dashboard().big_numbers.total_eleitos (proxy)
 *   - KPI Receita Partidária <- API.dashboard().big_numbers.receita_total */

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { usePlatform } from "../PlatformContext";
import { API } from "../api";
import {
  HOME_LINEAR_HEADLINE,
  HOME_LINEAR_KPIS,
  HOME_LINEAR_SUBORDINADOS,
  HOME_LINEAR_SENTINELA,
  HOME_LINEAR_DECISOES,
} from "../data";
import { VisaoNacionalKPIs } from "./home/VisaoNacionalKPIs";

const ROLE_GREET = {
  presidente:         "Bom dia, Presidente",
  lideranca_estadual: "Bom dia, Presidente",
  coord_regional:     "Bom dia, Coordenador",
  coord_territorial:  "Bom dia, Coordenador",
  cabo_eleitoral:     "Bom dia, Cabo",
  politico_eleito:    "Bom dia, Senador",
  candidato:          "Bom dia, Candidato",
  equipe_gabinete:    "Bom dia, equipe de gabinete",
  admin_partido:      "Bom dia, administração",
  admin_mazzel:       "Bom dia, Mazzel",
};

function todayLabel() {
  return new Date()
    .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/-feira/, "")
    .replace(".", "");
}

function fmtMoney(n) {
  if (!n) return "—";
  if (n >= 1e9) return `R$ ${(n / 1e9).toFixed(1).replace(".", ",")}B`;
  if (n >= 1e6) return `R$ ${(n / 1e6).toFixed(1).replace(".", ",")}M`;
  if (n >= 1e3) return `R$ ${Math.round(n / 1e3)}k`;
  return `R$ ${Number(n).toLocaleString("pt-BR")}`;
}

function dirColor(dir) {
  if (dir === "up")   return "var(--ok)";
  if (dir === "down") return "var(--danger)";
  return "var(--fg-muted)";
}

function statusColor(status) {
  if (status === "crit") return "var(--danger)";
  if (status === "warn") return "var(--warn)";
  return null;
}

/* ============ Subcomponentes ============ */

function KpiCard({ kpi }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--rule)",
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--fg-faint)",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {kpi.l}
      </div>
      <div
        className="tnum"
        style={{
          fontSize: 44,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          color: "var(--fg-strong)",
          marginTop: 6,
          lineHeight: 1,
        }}
      >
        {kpi.v}
        {kpi.suffix && (
          <span
            style={{
              fontSize: 24,
              color: "var(--fg-faint)",
              fontWeight: 600,
            }}
          >
            {kpi.suffix}
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          gap: 14,
          marginTop: 12,
          paddingTop: 12,
          borderTop: "1px solid var(--rule)",
          fontSize: 11,
        }}
      >
        {kpi.deltas.map((d, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span
              style={{
                color: "var(--fg-faint)",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {d.when}
            </span>
            <span
              className="tnum"
              style={{ fontWeight: 600, color: dirColor(d.dir) }}
            >
              {d.v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubordinadoRow({ s }) {
  const sc = statusColor(s.status);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 70px 50px 90px",
        gap: 12,
        padding: "8px 0",
        alignItems: "center",
        borderBottom: "1px solid var(--rule)",
        fontSize: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <b
          style={{
            color: sc || "var(--fg-strong)",
            fontWeight: 600,
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {s.mun}{s.warn ? " ⚠" : ""}
        </b>
        <span style={{ color: "var(--fg-faint)", fontSize: 11 }}>{s.nome}</span>
      </div>
      <div
        className="tnum"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          fontWeight: 700,
          color: sc || "var(--fg)",
          textAlign: "right",
        }}
      >
        {s.ovr}
      </div>
      <div
        className="tnum"
        style={{
          fontSize: 11,
          textAlign: "right",
          fontWeight: 600,
          color: dirColor(s.dir),
        }}
      >
        {s.delta}
      </div>
      <div
        style={{
          height: 4,
          background: "var(--bg-elevated)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${s.ovr}%`,
            height: "100%",
            background: sc || "linear-gradient(90deg, var(--tenant-primary), var(--tenant-accent))",
          }}
        />
      </div>
    </div>
  );
}

function SentinelaRow({ row }) {
  const color =
    row.kind === "crit" ? "var(--danger)" :
    row.kind === "warn" ? "var(--warn)" :
    "var(--fg-strong)";
  return (
    <div
      style={{
        padding: "10px 0",
        borderBottom: "1px solid var(--rule)",
        fontSize: 12,
        lineHeight: 1.45,
        color: "var(--fg)",
      }}
    >
      <b style={{ color, fontWeight: 600 }}>{row.bold}</b>
      {row.rest}
      <span style={{ color: "var(--fg-faint)" }}> {row.when}</span>
    </div>
  );
}

function DecisaoCard({ d }) {
  const priColor =
    d.pri === "alta"  ? { bg: "var(--mz-danger-soft, rgba(248,113,113,0.14))", fg: "var(--danger)", label: "Alta"  } :
    d.pri === "media" ? { bg: "var(--mz-warn-soft, rgba(251,191,36,0.14))",     fg: "var(--warn)",   label: "Média" } :
    { bg: "var(--bg-card-2)", fg: "var(--fg-muted)", label: "Baixa" };
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        border: "1px solid var(--rule)",
        background: "var(--bg-card-2)",
        cursor: "pointer",
        transition: "border-color 120ms",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--tenant-accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--rule)")}
    >
      <span
        style={{
          display: "inline-block",
          padding: "2px 7px",
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.06em",
          borderRadius: 999,
          marginBottom: 6,
          background: priColor.bg,
          color: priColor.fg,
        }}
      >
        {priColor.label}
      </span>
      <div style={{ fontSize: 12, color: "var(--fg)", lineHeight: 1.45 }}>
        {d.txt}
        {d.bold && <b style={{ color: "var(--fg-strong)", fontWeight: 600 }}>{d.bold}</b>}
        {d.suffix}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-faint)",
          marginTop: 4,
          letterSpacing: "0.06em",
        }}
      >
        {d.meta}
      </div>
    </div>
  );
}

/* ============ Main ============ */

export function Home() {
  const router = useRouter();
  const { role, userName } = usePlatform();

  const [apiKpis, setApiKpis] = useState(null);
  const [authStatus, setAuthStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const dash = await API.dashboard().catch(() => null);
        if (cancelled) return;
        setApiKpis(dash?.big_numbers || null);
        setAuthStatus(dash ? "ok" : "error");
      } catch {
        if (cancelled) return;
        setAuthStatus("error");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [role]);

  const kpis = useMemo(() => {
    const base = HOME_LINEAR_KPIS.map((k) => ({ ...k, deltas: [...k.deltas] }));
    if (apiKpis) {
      if (typeof apiKpis.total_eleitos === "number") {
        const idx = base.findIndex((k) => k.k === "filiados");
        if (idx >= 0) {
          base[idx] = {
            ...base[idx],
            l: "Eleitos UB · TSE",
            v: apiKpis.total_eleitos.toLocaleString("pt-BR"),
          };
        }
      }
      if (typeof apiKpis.receita_total === "number") {
        const idx = base.findIndex((k) => k.k === "receita");
        if (idx >= 0) {
          base[idx] = { ...base[idx], v: fmtMoney(apiKpis.receita_total) };
        }
      }
    }
    return base;
  }, [apiKpis]);

  const greet = ROLE_GREET[role] || ROLE_GREET.presidente;

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100%" }}>
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "32px 32px 28px" }}>

        {authStatus === "error" && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.30)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Icon name="AlertTriangle" size={14} className="t-danger" />
            <span style={{ color: "var(--fg)" }}>Backend indisponível · exibindo mock graceful.</span>
          </div>
        )}

        {/* Header narrativo: greet + headline */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 24,
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 11,
                letterSpacing: "0.10em",
                color: "var(--fg-faint)",
                textTransform: "uppercase",
                fontWeight: 500,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--ok)",
                  boxShadow: "0 0 8px var(--ok)",
                  display: "inline-block",
                }}
              />
              <span>{greet} · {todayLabel()}</span>
            </div>
            <h1
              style={{
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "var(--fg-strong)",
                margin: 0,
                lineHeight: 1.05,
                maxWidth: 760,
              }}
            >
              SP está{" "}
              <em style={{ fontStyle: "normal", color: "var(--tenant-accent)" }}>
                {HOME_LINEAR_HEADLINE.cidade_pct}
              </em>{" "}
              coberta hoje.<br />
              {HOME_LINEAR_HEADLINE.mun_risco} municípios entraram em risco.
            </h1>
            {userName && (
              <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>{userName}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                background: "var(--bg-card)",
                border: "1px solid var(--rule)",
                color: "var(--fg)",
                borderRadius: 10,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Período: 30 dias
              <Icon name="ChevronDown" size={10} />
            </button>
            <button
              type="button"
              onClick={() => router.push("/mazzel-preview/operacoes")}
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                background: "var(--tenant-primary)",
                color: "#fff",
                border: "1px solid var(--tenant-primary-strong, var(--tenant-primary))",
                borderRadius: 10,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="Plus" size={12} />Nova operação
            </button>
          </div>
        </div>

        {/* 4 KPIs hero */}
        <div
          className="tnum"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 20,
            marginBottom: 24,
          }}
        >
          {kpis.map((k) => (
            <KpiCard key={k.k} kpi={k} />
          ))}
        </div>

        {/* 3 colunas: subordinados | sentinela | decisões */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr",
            gap: 16,
          }}
        >
          {/* Subordinados Diretos */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--rule)",
              borderRadius: 14,
              padding: 18,
            }}
          >
            <h3
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--fg-strong)",
                margin: "0 0 14px",
                letterSpacing: "0.02em",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              Subordinados Diretos
              <span
                style={{
                  fontSize: 10,
                  color: "var(--fg-faint)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                645 Pres Municipais
              </span>
            </h3>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {HOME_LINEAR_SUBORDINADOS.map((s, i) => (
                <SubordinadoRow key={i} s={s} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => router.push("/mazzel-preview/dossies")}
              style={{
                width: "100%",
                marginTop: 14,
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 600,
                background: "transparent",
                border: "1px solid var(--rule)",
                color: "var(--fg-muted)",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Ver todos os 645 →
            </button>
          </div>

          {/* Sentinela 24h */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--rule)",
              borderRadius: 14,
              padding: 18,
            }}
          >
            <h3
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--fg-strong)",
                margin: "0 0 14px",
                letterSpacing: "0.02em",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              Sentinela · 24h
              <span
                style={{
                  fontSize: 10,
                  color: "var(--fg-faint)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                Movimentações
              </span>
            </h3>
            <div>
              {HOME_LINEAR_SENTINELA.map((row, i) => (
                <SentinelaRow key={i} row={row} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => router.push("/mazzel-preview/alertas")}
              style={{
                width: "100%",
                marginTop: 14,
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 600,
                background: "transparent",
                border: "1px solid var(--rule)",
                color: "var(--fg-muted)",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Ver feed completo →
            </button>
          </div>

          {/* Decidir Agora */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--rule)",
              borderRadius: 14,
              padding: 18,
            }}
          >
            <h3
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--fg-strong)",
                margin: "0 0 14px",
                letterSpacing: "0.02em",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              Decidir Agora
              <span
                style={{
                  fontSize: 10,
                  color: "var(--fg-faint)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                {HOME_LINEAR_DECISOES.length} ações
              </span>
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {HOME_LINEAR_DECISOES.map((d, i) => (
                <DecisaoCard key={i} d={d} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Visao Nacional (TSE consolidado) abaixo da fold ─────── */}
        <div style={{ marginTop: 40 }}>
          <VisaoNacionalKPIs />
        </div>

      </div>
    </div>
  );
}
