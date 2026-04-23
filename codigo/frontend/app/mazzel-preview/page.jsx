"use client";

/**
 * /mazzel-preview - página de validação visual do design system Mazzel.
 *
 * Rota de SANDBOX - não está na navegação principal, não altera rotas existentes.
 * Demonstra: MazzelLayout, SectionShell, KPI, EmptyState, Chip, TraitBadge, Divider.
 *
 * Acesso: http://localhost:3002/mazzel-preview
 * Light:  http://localhost:3002/mazzel-preview?theme=light
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import {
  SectionShell,
  KPI,
  EmptyState,
  Chip,
  Divider,
  TraitBadge,
} from "@/components/ui-mazzel";
import { AlertTriangle, Users, MapPin, TrendingUp } from "lucide-react";

// ── Demo data (sem backend) ────────────────────────────────────────────────────

const DEMO_KPIS = [
  { label: "Eleitos União Brasil",   value: "1.247", hint: "59 senadores + dep fed/est + prefeitos", tone: "default" },
  { label: "Candidatos monitorados", value: "51.384", hint: "base TSE cruzada",                       tone: "ok"      },
  { label: "Alertas críticos 24h",   value: "12",     hint: "exige atenção imediata",                 tone: "danger"  },
  { label: "Score regional médio",   value: "73,8",   hint: "0-100 · agregado nacional",              tone: "default" },
];

const DEMO_ALERTS = [
  { sev: "crit", who: "Pablo Marçal",          uf: "SP", what: "Nova ação inscrita no CEAF", when: "há 12min" },
  { sev: "alto", who: "Sen. Flávio Bolsonaro", uf: "RJ", what: "Cobertura negativa em Folha", when: "há 40min" },
  { sev: "med",  who: "Dep. Júlia Rocha",      uf: "MG", what: "Emenda cancelada pela CGU",  when: "há 1h" },
];

const DEMO_CANDIDATOS = [
  { nome: "Lula",              partido: "PT",           uf: "BR", overall: 93, tier: "dourado", traits: ["LEGEND", "FENOMENO"] },
  { nome: "Tarcísio Freitas",  partido: "REPUBLICANOS", uf: "SP", overall: 91, tier: "dourado", traits: ["FENOMENO", "CAMPEAO"] },
  { nome: "Jaques Wagner",     partido: "PT",           uf: "BA", overall: 87, tier: "ouro",    traits: ["LEGEND", "FERA_REG"] },
  { nome: "Renan Calheiros",   partido: "MDB",          uf: "AL", overall: 86, tier: "ouro",    traits: ["LEGEND"] },
];

const TRAIT_LABEL = {
  FENOMENO: "Fenômeno", FERA_REG: "Fera regional", CAMPEAO: "Campeão",
  LEGEND: "Lenda", COMEBACK: "Comeback", ESTREANTE: "Estreante",
};

const PARTY_COLORS = {
  PT: "#E4142C", MDB: "#4AA71E", REPUBLICANOS: "#005FAF",
  "UNIÃO BRASIL": "#002A7B", PL: "#004F9F",
};

function partyColor(p) {
  return PARTY_COLORS[String(p || "").toUpperCase()] || "#6B7280";
}

function AlertSevClass(sev) {
  switch (sev) {
    case "crit": return "mz-alert-sev-crit";
    case "alto": return "mz-alert-sev-alto";
    case "med":  return "mz-alert-sev-med";
    default:     return "mz-alert-sev-bx";
  }
}

// ── Conteúdo de demo ──────────────────────────────────────────────────────────

function DemoContent() {
  const searchParams = useSearchParams();
  const initialTheme = searchParams.get("theme") === "light" ? "light" : "dark";
  const [theme, setTheme] = useState(initialTheme);

  // Apply theme from URL param on mount
  useEffect(() => {
    document.body.dataset.theme = initialTheme;
  }, [initialTheme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.body.dataset.theme = next;
  }

  return (
    <div
      className="mz-bg-page-grad min-h-screen p-6 space-y-6"
      style={{ background: "var(--mz-bg-page)" }}
    >
      {/* Header de controle */}
      <div
        className="rounded-xl p-4 flex items-center justify-between"
        style={{
          background: "var(--mz-bg-card)",
          border: "1px solid var(--mz-rule)",
        }}
      >
        <div>
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase mz-t-fg-dim mb-0.5">
            Mazzel Design System
          </div>
          <div className="text-[16px] font-black mz-t-fg-strong">
            Preview Foundation v1
          </div>
          <div className="text-[12px] mz-t-fg-muted mt-0.5">
            Sandbox visual - rota /mazzel-preview
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="mz-btn-ghost"
          type="button"
        >
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      {/* KPIs */}
      <SectionShell title="KPIs Dashboard" kicker="Presidente · Brasil">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DEMO_KPIS.map((k) => (
            <KPI key={k.label} label={k.label} value={k.value} hint={k.hint} tone={k.tone} />
          ))}
        </div>
      </SectionShell>

      {/* Chips e Traits */}
      <SectionShell title="Chips e TraitBadges">
        <div className="flex flex-wrap gap-2 mb-4">
          <Chip variant="blue">Blue</Chip>
          <Chip variant="green">Green</Chip>
          <Chip variant="amber">Amber</Chip>
          <Chip variant="red">Red</Chip>
          <Chip variant="purple">Purple</Chip>
          <Chip variant="muted">Muted</Chip>
          <Chip variant="muted" dot="var(--mz-tenant-primary)">
            União Brasil
          </Chip>
        </div>
        <Divider />
        <div className="flex flex-wrap gap-2 mt-4">
          <TraitBadge label="Lenda" tier="gold" />
          <TraitBadge label="Fenômeno" tier="gold" />
          <TraitBadge label="Campeão" tier="silver" />
          <TraitBadge label="Fera regional" tier="silver" />
          <TraitBadge label="Estreante" tier="silver" />
        </div>
      </SectionShell>

      {/* Alertas */}
      <SectionShell title="Alertas" sub="24h" pad={false}>
        {DEMO_ALERTS.map((a, i) => (
          <div key={i} className={`mz-alert-row ${AlertSevClass(a.sev)}`}>
            <AlertTriangle size={14} className="mz-t-fg-muted mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold mz-t-fg truncate">
                {a.who}
              </div>
              <div className="text-[11.5px] mz-t-fg-muted truncate">{a.what}</div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <Chip variant="muted" className="text-[9px]">{a.uf}</Chip>
              <span className="text-[10px] mz-t-fg-dim">{a.when}</span>
            </div>
          </div>
        ))}
      </SectionShell>

      {/* Ranking candidatos */}
      <SectionShell title="Top Candidatos" kicker="Overall FIFA">
        <div className="space-y-2">
          {DEMO_CANDIDATOS.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded-lg mz-card-hover"
              style={{ border: "1px solid var(--mz-rule)" }}
            >
              <span className="text-[11px] mz-t-fg-dim w-4 text-right mz-tnum">
                {i + 1}
              </span>
              <span
                className="mz-party-dot"
                style={{ background: partyColor(c.partido) }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold mz-t-fg-strong truncate">
                  {c.nome}
                </div>
                <div className="text-[10px] mz-t-fg-dim">
                  {c.partido} · {c.uf}
                </div>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {c.traits.slice(0, 2).map((t) => (
                  <TraitBadge key={t} label={TRAIT_LABEL[t] || t} tier={i < 3 ? "gold" : "silver"} />
                ))}
              </div>
              <div className="text-[20px] font-black mz-overall-num mz-font-display w-10 text-right mz-tnum">
                {c.overall}
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* Empty State */}
      <SectionShell title="Empty States">
        <div className="grid gap-4 sm:grid-cols-3">
          <EmptyState
            icon={<Users size={28} />}
            title="Sem delegados cadastrados"
            text="Adicione delegados para começar a monitorar zonas eleitorais."
            tone="muted"
          />
          <EmptyState
            icon={<MapPin size={28} />}
            title="Municipio sem dados"
            text="Dados TSE ainda não disponíveis para este município."
            tone="warn"
          />
          <EmptyState
            icon={<TrendingUp size={28} />}
            title="Tudo ok!"
            text="Nenhum alerta crítico nas últimas 24 horas."
            tone="ok"
          />
        </div>
      </SectionShell>

      {/* Footer de rodapé */}
      <div className="text-center py-4">
        <div className="text-[10px] mz-t-fg-dim tracking-[0.2em] uppercase">
          Mazzel Design System Foundation · NEXT_PUBLIC_MAZZEL_UI=1
        </div>
      </div>
    </div>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

export default function MazzelPreviewPage() {
  return (
    <MazzelLayout
      defaultTenantId="uniao"
      defaultRole="presidente"
      breadcrumbs={["União Brasil", "Preview Design System"]}
      alertCount={7}
    >
      <DemoContent />
    </MazzelLayout>
  );
}
