"use client";

import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import {
  FileSearch, Download, Users, Bell, Sparkles, Settings, Info,
} from "lucide-react";
import { PORTAL_AGENDA, PORTAL_METAS, PORTAL_EQUIPE } from "@/components/mazzel-data/mock";
import { usePortalResumo } from "@/hooks/usePortal";

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>
      <Info size={8} />dados de demonstracao
    </span>
  );
}

function PortalContent() {
  const { candidato, candidaturas, farol, isMock, isLoading } = usePortalResumo();

  // Nome do politico (API ou fallback)
  const nomePolitico = candidato?.nome_urna ?? candidato?.nome_completo ?? "Sen. Jaques Wagner";

  // Ultima eleicao (para KPI de emendas vem do farol, nao ha endpoint especifico)
  const ultimaCandidatura = candidaturas?.[0];

  return (
    <div className="min-h-full" style={{ background: "var(--mz-bg-page)" }}>
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] mz-t-fg-dim tracking-[0.18em] uppercase font-semibold">
              Meu Painel · {isLoading ? "Carregando..." : nomePolitico}
            </div>
            <h1 className="text-[32px] font-bold mz-t-fg-strong mt-1 leading-none">Comando do mandato</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="text-[13px] mz-t-fg-muted">
                Visao proprietaria do candidato · dados confidenciais · nao visivel a terceiros.
              </div>
              {isMock && <MockBadge />}
            </div>
          </div>
          <span className="mz-chip mz-chip-green flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--mz-ok, #34d399)" }}/>
            Portal ativo · renovacao em 147 dias
          </span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { l:"Overall Mazzel",        v:"87",    h:"Top 12% entre senadores",     ok:true  },
            { l:"Emendas em execucao",   v:"R$ 42M",h:"de R$ 61M aprovado (69%)",   ok:true  },
            { l:"Eventos agenda semana", v:"18",    h:"5 Brasilia · 13 BA",          ok:true  },
            { l:"Metas 2024 batidas",    v:"3/4",   h:"1 em risco: imprensa",        ok:false },
          ].map(k => (
            <div key={k.l} className="mz-kpi-card mz-ring-soft">
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.l}</div>
              <div className="text-[32px] font-bold mz-tnum mt-1.5 leading-none"
                style={{ backgroundImage: "linear-gradient(180deg, var(--mz-tenant-primary), #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {k.v}
              </div>
              <div className="text-[11px] mz-t-fg-dim mt-1.5">{k.h}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[1.3fr_1fr] gap-3 mb-5">
          {/* Agenda (mock - backend nao tem endpoint de agenda) */}
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
            <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--mz-rule)" }}>
              <div>
                <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Agenda · hoje</div>
                <div className="text-[15px] font-bold mz-t-fg-strong">Quinta, 28 novembro · 5 compromissos</div>
              </div>
              <button className="mz-btn-ghost" style={{ padding: "5px 9px" }}>Ver semana -&gt;</button>
            </div>
            <div>
              {PORTAL_AGENDA.map((a, i) => (
                <div key={i} className="grid grid-cols-[60px_1fr_auto_auto] gap-3 items-center px-5 py-3 border-b last:border-0" style={{ borderColor: "var(--mz-rule)" }}>
                  <div className="text-[14px] font-bold mz-tnum mz-t-fg-strong">{a.h}</div>
                  <div>
                    <div className="text-[12.5px] font-semibold mz-t-fg-strong">{a.titulo}</div>
                    <div className="text-[11px] mz-t-fg-dim">{a.local}</div>
                  </div>
                  <span className="mz-chip mz-chip-muted w-fit" style={{ height: 20 }}>{a.tipo}</span>
                  <span className={`mz-chip w-fit ${a.conf === "confirmado" ? "mz-chip-green" : "mz-chip-amber"}`} style={{ height: 20 }}>
                    {a.conf === "confirmado" ? "✓" : "?"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Metas (mock) */}
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--mz-rule)" }}>
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Metas 2024</div>
              <div className="text-[15px] font-bold mz-t-fg-strong">Progresso do mandato</div>
            </div>
            <div className="p-5 space-y-4">
              {PORTAL_METAS.map(m => {
                const pct = Math.round((m.v / m.meta) * 100);
                const cor = pct >= 90 ? "var(--mz-ok, #34d399)" : pct >= 75 ? "var(--mz-warn, #fbbf24)" : "var(--mz-danger, #f87171)";
                return (
                  <div key={m.m}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <div className="text-[12px] font-semibold mz-t-fg">{m.m}</div>
                      <div className="mz-tnum text-[12px] mz-t-fg-muted">{m.v}{m.unidade} / {m.meta}{m.unidade}</div>
                    </div>
                    <div className="h-2 rounded-sm overflow-hidden" style={{ background: "var(--mz-rule)" }}>
                      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: cor }}/>
                    </div>
                    <div className="text-[10px] mz-t-fg-dim mt-1">{pct}% atingido</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Equipe (mock) */}
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--mz-rule)" }}>
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Minha equipe</div>
              <div className="text-[15px] font-bold mz-t-fg-strong">Gabinete + campo · 5 ativos</div>
            </div>
            <div>
              {PORTAL_EQUIPE.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 border-b last:border-0" style={{ borderColor: "var(--mz-rule)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold mz-t-fg-strong"
                    style={{ background: "rgba(var(--mz-tenant-primary-rgb), 0.15)" }}>
                    {p.nome.split(" ").map(x => x[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="text-[12.5px] font-semibold mz-t-fg-strong">{p.nome}</div>
                    <div className="text-[11px] mz-t-fg-muted">{p.papel} · {p.local}</div>
                  </div>
                  <span className={`mz-chip w-fit ${p.ativo ? "mz-chip-green" : "mz-chip-muted"}`} style={{ height: 20 }}>
                    {p.ativo ? "online" : "offline"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Acoes rapidas */}
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--mz-rule)" }}>
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Acoes rapidas</div>
              <div className="text-[15px] font-bold mz-t-fg-strong">Comandos do mandato</div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              {[
                { l:"Abrir meu dossie",       Icon: FileSearch },
                { l:"Solicitar relatorio",     Icon: Download   },
                { l:"Agendar reuniao",         Icon: Users      },
                { l:"Falar com diretoria",     Icon: Bell       },
                { l:"Analise IA do mandato",   Icon: Sparkles   },
                { l:"Configurar alertas",      Icon: Settings   },
              ].map((a, i) => (
                <button key={i} className="flex items-center gap-2 p-3 rounded-md text-left mz-card-hover"
                  style={{ border: "1px solid var(--mz-rule)", background: "var(--mz-bg-card-2)" }}>
                  <a.Icon size={14} style={{ color: "var(--mz-tenant-primary)" }}/>
                  <span className="text-[12px] font-semibold mz-t-fg">{a.l}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortalPage() {
  return (
    <MazzelLayout activeModule="portal" breadcrumbs={["Uniao Brasil", "Meu Painel"]} alertCount={12}>
      <PortalContent />
    </MazzelLayout>
  );
}
