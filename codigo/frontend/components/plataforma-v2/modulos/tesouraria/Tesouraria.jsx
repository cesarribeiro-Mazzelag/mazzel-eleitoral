"use client";

/* Módulo Tesouraria · 1:1 com Designer V1.2 (04-tesouraria.html)
 *
 * Layout: shell 240+1fr (sidebar fixa + main scrollable)
 *
 * Sidebar: brand + balance card R$ 4.7M + 3 nav-sections
 * Main: top-bar + period-bar + 4 hero KPIs + 4 TSE compliance cards +
 *       cashflow + donut + rubricas orçado vs realizado + transações +
 *       top doadores + alocação por município + alertas Q1/2026
 *
 * Substitui Tesouraria.jsx anterior (129 linhas, raso vs 605 do mockup).
 */

import {
  NAV_PRIMARY,
  NAV_COMPLIANCE,
  NAV_RELATORIOS,
  HERO_KPIS,
  TSE_CARDS,
  CASHFLOW,
  DONUT_RUBRICAS,
  RUBRICAS,
  TRANSACOES,
  DOADORES,
  MUNICIPIOS,
  ALERTAS,
  PERIODOS,
} from "./dados";

export function Tesouraria() {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "240px 1fr",
        minHeight: "calc(100vh - 48px)",
        background: "var(--mz-bg-page)",
      }}
    >
      <Sidebar />
      <Main />
    </div>
  );
}

/* ============ SIDEBAR ============ */
function Sidebar() {
  return (
    <aside
      style={{
        background: "var(--mz-bg-sidebar)",
        borderRight: "1px solid var(--mz-rule)",
        height: "calc(100vh - 48px)",
        position: "sticky",
        top: 48,
        overflowY: "auto",
      }}
    >
      {/* Balance card */}
      <div style={{ padding: "16px", borderBottom: "1px solid var(--mz-rule)" }}>
        <div
          style={{
            background: "linear-gradient(135deg, var(--mz-tenant-primary), var(--mz-tenant-primary-strong))",
            border: "1px solid var(--mz-tenant-accent)",
            borderRadius: 8,
            padding: 14,
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", fontWeight: 700 }}>
            Saldo Consolidado
          </div>
          <div
            style={{
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: 32,
              color: "var(--mz-tenant-accent)",
              lineHeight: 1,
              marginTop: 4,
              letterSpacing: "0.02em",
            }}
          >
            R$ 4.7
            <small style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
              M
            </small>
          </div>
          <div style={{ fontSize: 10, color: "var(--mz-ok)", marginTop: 4, fontFamily: "JetBrains Mono, monospace" }}>
            ▲ +R$ 612k vs mês anterior
          </div>
        </div>
      </div>

      <NavSection titulo="Navegação" items={NAV_PRIMARY} />
      <NavSection titulo="Compliance" items={NAV_COMPLIANCE} />
      <NavSection titulo="Relatórios" items={NAV_RELATORIOS} />
    </aside>
  );
}

function NavSection({ titulo, items }) {
  return (
    <div style={{ padding: "12px 8px", borderBottom: "1px solid var(--mz-rule)" }}>
      <h3
        style={{
          fontSize: 9.5,
          letterSpacing: "0.16em",
          color: "var(--mz-fg-faint)",
          textTransform: "uppercase",
          fontWeight: 700,
          margin: "0 10px 8px",
        }}
      >
        {titulo}
      </h3>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: it.active ? "7px 10px 7px 7px" : "7px 10px",
            cursor: "pointer",
            fontSize: 12,
            color: it.active ? "var(--mz-fg-strong)" : "var(--mz-fg)",
            borderRadius: 4,
            background: it.active ? "var(--mz-tenant-primary-soft)" : undefined,
            borderLeft: it.active ? "3px solid var(--mz-tenant-accent)" : undefined,
            fontWeight: it.active ? 700 : 400,
          }}
        >
          <span style={{ fontSize: 13, width: 18 }}>{it.ico}</span>
          {it.label}
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9.5,
              color: it.warn ? "#fff" : "var(--mz-fg-faint)",
              background: it.warn ? "var(--mz-warn)" : undefined,
              padding: it.warn ? "1px 5px" : 0,
              borderRadius: 3,
              fontWeight: it.warn ? 800 : 400,
            }}
          >
            {it.qty}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ============ MAIN ============ */
function Main() {
  return (
    <main style={{ padding: 0 }}>
      <TopBar />
      <PeriodBar />
      <HeroKPIs />
      <TseStrip />
      <CashflowDonut />
      <RubricasTransacoes />
      <TopDoadores />
      <AlocacaoMunicipios />
      <AlertasFinanceiros />
    </main>
  );
}

function TopBar() {
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
        top: 48,
        zIndex: 5,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", flex: 1, display: "flex", gap: 6 }}>
        Tesouraria <Sep />
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>Brasil</b> <Sep />
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>SP</b> <Sep />
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>Capital · Q1/2026</b>
      </div>
      <Btn>📤 Exportar prestação TSE</Btn>
      <Btn>📥 Importar OFX</Btn>
      <Btn primary>+ Lançamento</Btn>
      <Btn tenant>📋 Gerar Relatório Q1</Btn>
    </div>
  );
}

function Sep() {
  return <span style={{ color: "var(--mz-rule-strong)", margin: "0 6px" }}>›</span>;
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
        background: tenant ? "var(--mz-tenant-accent)" : primary ? "var(--mz-tenant-primary)" : "var(--mz-bg-card)",
        color: tenant ? "var(--mz-fg-on-accent)" : primary ? "#fff" : "var(--mz-fg)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function PeriodBar() {
  return (
    <div
      style={{
        padding: "10px 24px",
        borderBottom: "1px solid var(--mz-rule)",
        background: "var(--mz-bg-page)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 11,
        color: "var(--mz-fg-muted)",
      }}
    >
      <span>Período:</span>
      <div style={{ display: "flex", background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 4 }}>
        {PERIODOS.map((p) => (
          <button
            key={p}
            style={{
              background: p === "Q1/2026" ? "var(--mz-tenant-primary)" : "none",
              color: p === "Q1/2026" ? "#fff" : "var(--mz-fg-muted)",
              border: 0,
              padding: "5px 10px",
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {p}
          </button>
        ))}
      </div>
      <span style={{ marginLeft: 14, color: "var(--mz-fg)" }}>
        jan/26 → mar/26 · <b style={{ color: "var(--mz-fg-strong)" }}>90 dias</b>
      </span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontSize: 11, color: "var(--mz-fg-muted)" }}>
        <span>
          Tenant: <b style={{ color: "var(--mz-fg-strong)" }}>UB · SP capital</b>
        </span>
        <span>·</span>
        <span style={{ color: "var(--mz-ok)" }}>● Auto-sync ativo</span>
        <span>·</span>
        <span>
          Última sync: <b style={{ color: "var(--mz-fg-strong)" }}>há 4 min</b>
        </span>
      </div>
    </div>
  );
}

function HeroKPIs() {
  return (
    <div
      style={{
        padding: "20px 24px",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 14,
      }}
    >
      {HERO_KPIS.map((k, i) => (
        <KpiCard key={i} {...k} />
      ))}
    </div>
  );
}

function KpiCard({ lbl, v, suffix, delta, sub, tipo }) {
  const isWarn = tipo === "warn";
  const isTenant = tipo === "tenant";
  const deltaColor =
    tipo === "up"     ? "var(--mz-ok)" :
    tipo === "down"   ? "var(--mz-danger)" :
    isWarn            ? "var(--mz-warn)" :
                        "var(--mz-fg-faint)";

  return (
    <div
      style={{
        background: isTenant
          ? "linear-gradient(135deg, var(--mz-tenant-primary), var(--mz-tenant-primary-strong))"
          : "var(--mz-bg-card)",
        border: isWarn ? "1px solid var(--mz-warn)" : "1px solid var(--mz-rule)",
        borderRadius: 8,
        padding: 16,
        color: isTenant ? "#fff" : undefined,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          color: isTenant ? "rgba(255,255,255,0.7)" : "var(--mz-fg-faint)",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {lbl}
      </div>
      <div
        style={{
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: 36,
          color: isTenant ? "var(--mz-tenant-accent)" : isWarn ? "var(--mz-warn)" : "var(--mz-fg-strong)",
          lineHeight: 1,
          marginTop: 4,
          letterSpacing: "0.02em",
        }}
      >
        {v}
        <small style={{ fontSize: 14, color: isTenant ? "rgba(255,255,255,0.7)" : "var(--mz-fg-muted)", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
          {suffix}
        </small>
      </div>
      <div style={{ fontSize: 10.5, color: deltaColor, marginTop: 4, fontFamily: "JetBrains Mono, monospace" }}>
        {delta}
      </div>
      <div style={{ fontSize: 10, color: isTenant ? "rgba(255,255,255,0.6)" : "var(--mz-fg-faint)", marginTop: 4 }}>
        {sub}
      </div>
    </div>
  );
}

function TseStrip() {
  return (
    <div
      style={{
        padding: "0 24px 18px",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 10,
      }}
    >
      {TSE_CARDS.map((c, i) => (
        <TseCard key={i} {...c} />
      ))}
    </div>
  );
}

function TseCard({ ico, titulo, val, sub, tipo }) {
  const styles =
    tipo === "ok"
      ? { borderColor: "var(--mz-ok)", icBg: "var(--mz-ok-soft)", icColor: "var(--mz-ok)" }
      : tipo === "warn"
      ? { borderColor: "var(--mz-warn)", icBg: "var(--mz-warn-soft)", icColor: "var(--mz-warn)", valColor: "var(--mz-warn)" }
      : tipo === "danger"
      ? { borderColor: "var(--mz-danger)", icBg: "var(--mz-danger-soft)", icColor: "var(--mz-danger)", valColor: "var(--mz-danger)" }
      : { borderColor: "var(--mz-rule)", icBg: "var(--mz-bg-elevated)", icColor: "var(--mz-fg-muted)" };

  return (
    <div
      style={{
        background: "var(--mz-bg-card)",
        border: `1px solid ${styles.borderColor}`,
        borderRadius: 6,
        padding: 14,
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: styles.icBg,
          color: styles.icColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 800,
        }}
      >
        {ico}
      </div>
      <div>
        <b style={{ fontSize: 11.5, color: "var(--mz-fg-strong)", display: "block", fontWeight: 700 }}>{titulo}</b>
        <div
          style={{
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: 16,
            color: styles.valColor || "var(--mz-fg-strong)",
            lineHeight: 1.1,
            marginTop: 2,
            letterSpacing: "0.02em",
          }}
        >
          {val}
        </div>
        <span style={{ fontSize: 10, color: "var(--mz-fg-faint)", display: "block", marginTop: 2 }}>{sub}</span>
      </div>
    </div>
  );
}

/* ============ CASHFLOW + DONUT ============ */
function CashflowDonut() {
  return (
    <div style={{ padding: "0 24px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Card titulo="Fluxo de Caixa · Q1/2026" right={<><Chip on>Mensal</Chip><Chip>Semanal</Chip><Chip>Diário</Chip></>}>
        <div style={{ padding: "12px 18px 18px" }}>
          <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--mz-fg-muted)", marginBottom: 14, alignItems: "center" }}>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "linear-gradient(180deg, var(--mz-ok), rgba(34,197,94,0.5))" }} />
              Receitas
            </span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "linear-gradient(180deg, var(--mz-danger), rgba(239,68,68,0.5))" }} />
              Despesas
            </span>
            <span style={{ marginLeft: "auto", fontFamily: "JetBrains Mono, monospace", color: "var(--mz-fg)" }}>
              Saldo: <b style={{ color: "var(--mz-ok)" }}>+R$ 612k</b>
            </span>
          </div>
          <CashflowChart />
        </div>
      </Card>

      <Card titulo="Despesas por Rubrica">
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "auto 1fr", gap: 18, alignItems: "center" }}>
          <Donut />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {DONUT_RUBRICAS.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "10px 1fr auto", gap: 10, alignItems: "center" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: r.color }} />
                <div style={{ fontSize: 11.5 }}>
                  <b style={{ color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{r.nome}</b>
                  <span style={{ color: "var(--mz-fg-faint)", fontSize: 10 }}>{r.sub}</span>
                </div>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "var(--mz-fg-strong)", fontWeight: 700 }}>
                  {r.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function CashflowChart() {
  return (
    <div style={{ position: "relative", height: 200, display: "grid", gridTemplateColumns: "60px 1fr", gap: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 9, color: "var(--mz-fg-faint)", fontFamily: "JetBrains Mono, monospace", paddingTop: 4 }}>
        <span>R$ 1M</span>
        <span>R$ 750k</span>
        <span>R$ 500k</span>
        <span>R$ 250k</span>
        <span>R$ 0</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${CASHFLOW.length}, 1fr)`, gap: 12, alignItems: "end", borderLeft: "1px solid var(--mz-rule)", borderBottom: "1px solid var(--mz-rule)" }}>
        {CASHFLOW.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
            <div style={{ display: "flex", gap: 4, alignItems: "end", height: "100%", padding: "8px 0" }}>
              <div style={{ width: 18, height: `${m.in}%`, background: "linear-gradient(180deg, var(--mz-ok), rgba(34,197,94,0.5))", borderRadius: "3px 3px 0 0", opacity: m.parcial ? 0.5 : 1 }} />
              <div style={{ width: 18, height: `${m.out}%`, background: "linear-gradient(180deg, var(--mz-danger), rgba(239,68,68,0.5))", borderRadius: "3px 3px 0 0", opacity: m.parcial ? 0.5 : 1 }} />
            </div>
            <span style={{ fontSize: 10, color: "var(--mz-fg-faint)", marginTop: 4, fontFamily: "JetBrains Mono, monospace" }}>
              {m.mes}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Donut() {
  // SVG donut - 5 segmentos calculados a partir dos pcts
  const cx = 70, cy = 70, r = 50;
  const innerR = 32;
  let acc = 0;
  const segs = DONUT_RUBRICAS.map((d) => {
    const start = acc;
    acc += d.pct;
    const end = acc;
    return { ...d, start, end };
  });

  const arc = (start, end) => {
    const a1 = (start / 100) * 2 * Math.PI - Math.PI / 2;
    const a2 = (end / 100) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const xi1 = cx + innerR * Math.cos(a1);
    const yi1 = cy + innerR * Math.sin(a1);
    const xi2 = cx + innerR * Math.cos(a2);
    const yi2 = cy + innerR * Math.sin(a2);
    const large = end - start > 50 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 ${large} 0 ${xi1} ${yi1} Z`;
  };

  return (
    <div style={{ position: "relative", width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        {segs.map((s, i) => (
          <path key={i} d={arc(s.start, s.end)} fill={s.color} />
        ))}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <b style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 22, color: "var(--mz-fg-strong)" }}>R$ 1.8M</b>
        <span style={{ fontSize: 9, color: "var(--mz-fg-faint)", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 700 }}>
          Total
        </span>
      </div>
    </div>
  );
}

/* ============ RUBRICAS + TRANSACOES ============ */
function RubricasTransacoes() {
  return (
    <div style={{ padding: "0 24px 18px", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14 }}>
      <Card titulo="Orçamento vs. Realizado · Q1" right={<><Chip on>Q1</Chip><Chip>Anual</Chip></>}>
        <div style={{ padding: 0 }}>
          {RUBRICAS.map((r, i) => (
            <RubricaRow key={i} {...r} />
          ))}
        </div>
      </Card>

      <Card titulo="Últimas Transações" right={<><Chip on>Todas</Chip><Chip>Receitas</Chip><Chip>Despesas</Chip></>}>
        <div style={{ padding: 0 }}>
          {TRANSACOES.map((t, i) => (
            <TxRow key={i} {...t} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function RubricaRow({ nome, real, orcado, pct, warn, over }) {
  const barColor = over ? "var(--mz-danger)" : warn ? "var(--mz-warn)" : "linear-gradient(90deg, var(--mz-tenant-primary), var(--mz-tenant-accent))";
  return (
    <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--mz-rule)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "baseline", fontSize: 12 }}>
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{nome}</b>
        <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--mz-fg)" }}>
          {real} <small style={{ color: "var(--mz-fg-faint)" }}>/ {orcado}</small>
        </span>
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 12,
            fontWeight: 700,
            color: over ? "var(--mz-danger)" : warn ? "var(--mz-warn)" : "var(--mz-fg-strong)",
            minWidth: 44,
            textAlign: "right",
          }}
        >
          {pct}%
        </span>
      </div>
      <div style={{ height: 4, background: "var(--mz-bg-elevated)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${Math.min(pct, 100)}%`, background: barColor }} />
      </div>
    </div>
  );
}

function TxRow({ tipo, titulo, sub, cat, when, val, status, statusClass }) {
  const out = tipo === "out";
  const statusStyles = {
    ok:   { bg: "var(--mz-ok-soft)",     fg: "var(--mz-ok)" },
    pend: { bg: "var(--mz-warn-soft)",   fg: "var(--mz-warn)" },
    tse:  { bg: "var(--mz-info-soft)",   fg: "var(--mz-info)" },
  };
  const s = statusStyles[statusClass] || statusStyles.ok;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr 90px 100px 100px 100px",
        gap: 10,
        padding: "11px 18px",
        borderBottom: "1px solid var(--mz-rule)",
        alignItems: "center",
        fontSize: 11.5,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: out ? "var(--mz-danger-soft)" : "var(--mz-ok-soft)",
          color: out ? "var(--mz-danger)" : "var(--mz-ok)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        {tipo === "in" ? "↑" : "↓"}
      </div>
      <div>
        <b style={{ color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{titulo}</b>
        <small style={{ color: "var(--mz-fg-faint)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>{sub}</small>
      </div>
      <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "var(--mz-bg-elevated)", color: "var(--mz-fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, textAlign: "center" }}>
        {cat}
      </span>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-fg-faint)" }}>{when}</span>
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 13,
          fontWeight: 700,
          color: out ? "var(--mz-danger)" : "var(--mz-ok)",
        }}
      >
        {val}
      </span>
      <span
        style={{
          fontSize: 9,
          padding: "2px 6px",
          borderRadius: 3,
          fontWeight: 800,
          letterSpacing: "0.04em",
          background: s.bg,
          color: s.fg,
          textAlign: "center",
        }}
      >
        {status}
      </span>
    </div>
  );
}

/* ============ TOP DOADORES ============ */
function TopDoadores() {
  return (
    <div style={{ padding: "0 24px 18px" }}>
      <SectionHead titulo="Top Doadores · Q1/2026" subtitulo="847 doadores · ticket médio R$ 2.834" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {DOADORES.map((d, i) => (
          <DoadorCard key={i} {...d} />
        ))}
      </div>
    </div>
  );
}

function DoadorCard({ av, nome, sub, total, totalSuffix, doacoes, ultima, flag, flagColor, tipo }) {
  const tipoBg =
    tipo === "pj" ? "rgba(0,42,123,0.18)" :
    tipo === "fp" ? "rgba(255,204,0,0.18)" :
                    "var(--mz-bg-card-2)";
  return (
    <div
      style={{
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderTop: `3px solid ${tipo === "fp" ? "var(--mz-tenant-accent)" : tipo === "pj" ? "var(--mz-tenant-primary)" : "var(--mz-info)"}`,
        borderRadius: 8,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: tipoBg,
            color: tipo === "fp" ? "var(--mz-tenant-accent)" : "var(--mz-tenant-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {av}
        </div>
        <div style={{ minWidth: 0 }}>
          <b style={{ fontSize: 12.5, color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{nome}</b>
          <span style={{ fontSize: 10, color: "var(--mz-fg-faint)", fontFamily: "JetBrains Mono, monospace" }}>{sub}</span>
        </div>
      </div>
      <div
        style={{
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: 28,
          color: "var(--mz-fg-strong)",
          lineHeight: 1,
          letterSpacing: "0.02em",
        }}
      >
        {total}
        <small style={{ fontSize: 13, color: "var(--mz-fg-muted)", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
          {totalSuffix}
        </small>
      </div>
      <div style={{ display: "flex", gap: 10, fontSize: 10.5, color: "var(--mz-fg-muted)", marginTop: 8 }}>
        <span>
          {typeof doacoes === "string" && doacoes.includes(":") ? doacoes : <>Doações: <b style={{ color: "var(--mz-fg)", fontWeight: 600 }}>{doacoes}</b></>}
        </span>
        {ultima && (
          <span>
            {ultima.includes(":") ? ultima : <>Última: <b style={{ color: "var(--mz-fg)", fontWeight: 600 }}>{ultima}</b></>}
          </span>
        )}
        {flag && (
          <span style={{ marginLeft: "auto", color: flagColor }}>{flag}</span>
        )}
      </div>
    </div>
  );
}

/* ============ ALOCAÇÃO POR MUNICÍPIO ============ */
function AlocacaoMunicipios() {
  return (
    <div style={{ padding: "0 24px 18px" }}>
      <SectionHead titulo="Alocação por Município · SP" subtitulo="645 diretórios · R$ 1.8M repassado Q1" />
      <div
        style={{
          background: "var(--mz-bg-card)",
          border: "1px solid var(--mz-rule)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {MUNICIPIOS.map((m, i) => (
          <MuniRow key={i} {...m} last={i === MUNICIPIOS.length - 1} />
        ))}
      </div>
    </div>
  );
}

function MuniRow({ av, nome, sub, orcado, realizado, realizadoColor, pct, warn, vRestante, vRestanteColor, subRestante, last }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "44px 1fr 100px 100px 140px 90px 80px",
        gap: 12,
        padding: "12px 18px",
        borderBottom: last ? 0 : "1px solid var(--mz-rule)",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          background: "var(--mz-tenant-primary)",
          color: "var(--mz-tenant-accent)",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: 12,
        }}
      >
        {av}
      </div>
      <div>
        <b style={{ fontSize: 12.5, color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{nome}</b>
        <small style={{ fontSize: 10.5, color: "var(--mz-fg-faint)" }}>{sub}</small>
      </div>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--mz-fg)" }}>{orcado}</span>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: realizadoColor || "var(--mz-fg)" }}>{realizado}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 70, height: 5, background: "var(--mz-bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", width: `${pct}%`, background: warn ? "var(--mz-warn)" : "var(--mz-tenant-accent)" }} />
        </div>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--mz-fg)", fontWeight: 700, minWidth: 32 }}>{pct}%</span>
      </div>
      <span style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 18, color: vRestanteColor || "var(--mz-fg-strong)" }}>{vRestante}</span>
      <span style={{ fontSize: 9.5, color: "var(--mz-fg-faint)", fontFamily: "JetBrains Mono, monospace" }}>{subRestante}</span>
    </div>
  );
}

/* ============ ALERTAS FINANCEIROS ============ */
function AlertasFinanceiros() {
  return (
    <div style={{ padding: "0 24px 24px" }}>
      <h3 style={{ fontSize: 13, color: "var(--mz-fg-strong)", fontWeight: 800, margin: "0 0 14px", letterSpacing: "-0.01em" }}>
        Alertas Financeiros · Q1/2026
      </h3>
      {ALERTAS.map((a, i) => (
        <AlertaRow key={i} {...a} />
      ))}
    </div>
  );
}

function AlertaRow({ tipo, ico, titulo, desc, btn, btnTipo }) {
  const styles =
    tipo === "danger" ? { borderColor: "var(--mz-danger)", icBg: "var(--mz-danger-soft)", icColor: "var(--mz-danger)" } :
    tipo === "info"   ? { borderColor: "var(--mz-info)",   icBg: "var(--mz-info-soft)",   icColor: "var(--mz-info)" } :
                        { borderColor: "var(--mz-warn)",   icBg: "var(--mz-warn-soft)",   icColor: "var(--mz-warn)" };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "38px 1fr auto",
        gap: 14,
        padding: "12px 16px",
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderLeft: `4px solid ${styles.borderColor}`,
        borderRadius: 6,
        marginBottom: 8,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          background: styles.icBg,
          color: styles.icColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 800,
        }}
      >
        {ico}
      </div>
      <div>
        <b style={{ fontSize: 12.5, color: "var(--mz-fg-strong)", fontWeight: 700, display: "block" }}>{titulo}</b>
        <span style={{ fontSize: 11, color: "var(--mz-fg-muted)", display: "block", marginTop: 2 }}>{desc}</span>
      </div>
      <Btn primary={btnTipo === "primary"}>{btn}</Btn>
    </div>
  );
}

/* ============ HELPERS ============ */
function Card({ titulo, right, children }) {
  return (
    <div
      style={{
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--mz-rule)",
          background: "var(--mz-bg-card-2)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h3 style={{ fontSize: 13, color: "var(--mz-fg-strong)", fontWeight: 700, margin: 0 }}>{titulo}</h3>
        {right && <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>{right}</div>}
      </header>
      <div>{children}</div>
    </div>
  );
}

function Chip({ children, on }) {
  return (
    <span
      style={{
        fontSize: 10,
        padding: "3px 8px",
        borderRadius: 999,
        background: on ? "var(--mz-tenant-primary)" : "var(--mz-bg-card)",
        color: on ? "#fff" : "var(--mz-fg-muted)",
        cursor: "pointer",
        fontWeight: on ? 700 : 400,
        border: "1px solid var(--mz-rule)",
      }}
    >
      {children}
    </span>
  );
}

function SectionHead({ titulo, subtitulo }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 12 }}>
      <h3 style={{ fontSize: 13, color: "var(--mz-fg-strong)", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
        {titulo}
      </h3>
      <span style={{ fontSize: 11, color: "var(--mz-fg-muted)" }}>{subtitulo}</span>
      <button
        style={{
          marginLeft: "auto",
          fontSize: 11,
          padding: "5px 10px",
          background: "var(--mz-bg-card)",
          border: "1px solid var(--mz-rule)",
          borderRadius: 6,
          color: "var(--mz-fg)",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Ver todos →
      </button>
    </div>
  );
}
