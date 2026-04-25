"use client";

/* Portal do Cliente - visao do candidato.
 * Adaptado de designer/platform-estudo-portal.jsx ModulePortal. */

import { Icon } from "../Icon";
import { PORTAL_AGENDA, PORTAL_METAS, PORTAL_EQUIPE } from "../data";
import { API } from "../api";
import { useApiFetch, StatusBanner } from "../useApiFetch";
import { portalKpisFromApi } from "../adapters/listagens";

const KPI_CARDS = [
  { l: "Overall Mazzel",        v: "87",     h: "Top 12% entre senadores",     ok: true  },
  { l: "Emendas em execução",   v: "R$ 42M", h: "de R$ 61M aprovado (69%)",    ok: true  },
  { l: "Eventos agenda semana", v: "18",     h: "5 Brasília · 13 BA",          ok: true  },
  { l: "Metas 2024 batidas",    v: "3/4",    h: "1 em risco: imprensa",        ok: false },
];

const ACOES_RAPIDAS = [
  { l: "Abrir meu dossiê",        icon: "FileSearch" },
  { l: "Solicitar relatório",     icon: "Download"   },
  { l: "Agendar reunião",         icon: "Users"      },
  { l: "Falar com diretoria",     icon: "Bell"       },
  { l: "Análise IA do mandato",   icon: "Sparkles"   },
  { l: "Configurar alertas",      icon: "Settings"   },
];

export function Portal() {
  const { data: apiKpis, status, errorMsg } = useApiFetch(
    () => API.meuPainel().then(portalKpisFromApi),
    null,
    [],
  );
  const kpis = apiKpis || KPI_CARDS;

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <StatusBanner status={status} errorMsg={errorMsg} />
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Portal do Cliente · Sen. Jaques Wagner</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">Comando do mandato</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">Visão proprietária do candidato · dados confidenciais · não visível a terceiros.</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip chip-green">
              <span className="chip-dot" style={{ background: "var(--ok)" }} />Portal ativo · renovação em 147 dias
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {kpis.map((k) => (
            <div key={k.l} className="kpi-card ring-soft">
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.l}</div>
              <div
                className="text-[32px] font-display font-bold tnum mt-1.5 leading-none"
                style={{
                  backgroundImage: "linear-gradient(180deg, var(--overall-from), var(--overall-to))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {k.v}
              </div>
              <div className="text-[11px] t-fg-dim mt-1.5">{k.h}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[1.3fr_1fr] gap-3 mb-5">
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--rule)" }}>
              <div>
                <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Agenda · hoje</div>
                <div className="text-[15px] font-bold t-fg-strong">Quinta, 28 novembro · 5 compromissos</div>
              </div>
              <button className="btn-ghost" style={{ padding: "5px 9px" }} type="button">Ver semana →</button>
            </div>
            <div>
              {PORTAL_AGENDA.map((a, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[60px_1fr_auto_auto] gap-3 items-center px-5 py-3 border-b last:border-0"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <div className="text-[14px] font-bold tnum t-fg-strong">{a.h}</div>
                  <div>
                    <div className="text-[12.5px] font-semibold t-fg-strong">{a.titulo}</div>
                    <div className="text-[11px] t-fg-dim">{a.local}</div>
                  </div>
                  <span className="chip chip-muted" style={{ height: 20 }}>{a.tipo}</span>
                  <span className={`chip ${a.conf === "confirmado" ? "chip-green" : "chip-amber"}`} style={{ height: 20 }}>
                    {a.conf === "confirmado" ? "✓" : "?"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Metas 2024</div>
              <div className="text-[15px] font-bold t-fg-strong">Progresso do mandato</div>
            </div>
            <div className="p-5 space-y-4">
              {PORTAL_METAS.map((m) => {
                const pct = Math.round((m.v / m.meta) * 100);
                const cor = pct >= 90 ? "var(--ok)" : pct >= 75 ? "var(--warn)" : "var(--danger)";
                return (
                  <div key={m.m}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <div className="text-[12px] font-semibold t-fg">{m.m}</div>
                      <div className="tnum text-[12px] t-fg-muted">{m.v}{m.unidade} / {m.meta}{m.unidade}</div>
                    </div>
                    <div className="h-2 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
                      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: cor }} />
                    </div>
                    <div className="text-[10px] t-fg-dim mt-1">{pct}% atingido</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Minha equipe</div>
              <div className="text-[15px] font-bold t-fg-strong">Gabinete + campo · 5 ativos</div>
            </div>
            <div>
              {PORTAL_EQUIPE.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-5 py-3 border-b last:border-0"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <div className="w-8 h-8 rounded-full t-bg-tenant-soft flex items-center justify-center text-[11px] font-bold t-fg-strong">
                    {p.nome.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="text-[12.5px] font-semibold t-fg-strong">{p.nome}</div>
                    <div className="text-[11px] t-fg-muted">{p.papel} · {p.local}</div>
                  </div>
                  <span className={`chip ${p.ativo ? "chip-green" : "chip-muted"}`} style={{ height: 20 }}>
                    {p.ativo ? "online" : "offline"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Ações rápidas</div>
              <div className="text-[15px] font-bold t-fg-strong">Comandos do mandato</div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              {ACOES_RAPIDAS.map((a, i) => (
                <button
                  key={i}
                  className="flex items-center gap-2 p-3 rounded-md card-hover text-left"
                  style={{ border: "1px solid var(--rule)", background: "var(--bg-card-2)" }}
                  type="button"
                >
                  <Icon name={a.icon} size={14} className="t-tenant" />
                  <span className="text-[12px] font-semibold t-fg">{a.l}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
