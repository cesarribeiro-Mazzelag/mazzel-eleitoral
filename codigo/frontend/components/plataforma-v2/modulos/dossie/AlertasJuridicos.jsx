"use client";

/* Dossie 06 - Alertas Juridicos.
 * Adaptado de designer/section-alertas.jsx. */

import { Icon } from "../../Icon";
import { SectionShell, EmptyState } from "../../Primitives";

const SEV_MAP = {
  critico: { cls: "sev-critico", chip: "chip-red",    label: "Crítico" },
  alto:    { cls: "sev-alto",    chip: "chip-red",    label: "Alto"    },
  medio:   { cls: "sev-medio",   chip: "chip-amber",  label: "Médio"   },
  baixo:   { cls: "sev-baixo",   chip: "chip-muted",  label: "Baixo"   },
};

export function AlertasJuridicos({ profile }) {
  const A = profile.alertas;
  // 3 estados explicitos:
  // (a) ficha limpa confirmada (true) E sem alertas -> EmptyState verde
  // (b) sem alertas mas ficha_limpa null/false (sem dado consolidado) -> EmptyState neutro
  // (c) tem alertas -> lista
  if (!A.itens.length && A.fichaLimpa) {
    return (
      <SectionShell id="sec-alertas" label="06 Alertas" title="Alertas Jurídicos" sub="sanções e processos">
        <EmptyState
          tone="ok"
          icon={<Icon name="Check" size={28} />}
          title="Ficha limpa - sem sanções ativas"
          text="Não há registros do candidato nos cadastros CEIS, CEAF ou TCU no período verificado."
        />
      </SectionShell>
    );
  }
  if (!A.itens.length) {
    return (
      <SectionShell id="sec-alertas" label="06 Alertas" title="Alertas Jurídicos" sub="sanções e processos">
        <EmptyState
          icon={<Icon name="Build" size={28} />}
          title="Sem dados jurídicos consolidados"
          text="A consulta aos cadastros públicos (CEIS, CEAF, TCU, STF, TJs) ainda não retornou registros para este candidato. Não confunda com 'ficha limpa' - é ausência de dado, não confirmação de regularidade."
        />
      </SectionShell>
    );
  }

  return (
    <SectionShell
      id="sec-alertas"
      label="06 Alertas"
      title="Alertas Jurídicos"
      sub="sanções e processos"
      kicker={
        <span>
          {A.itens.length} {A.itens.length === 1 ? "alerta" : "alertas"} · última verif. ontem
        </span>
      }
    >
      <div className="space-y-3">
        {A.itens.map((it, i) => {
          const s = SEV_MAP[it.severidade] || SEV_MAP.baixo;
          return (
            <div
              key={i}
              className={`rounded-xl p-5 ${s.cls}`}
              style={{ background: "var(--bg-card-2)" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.10)", color: "var(--danger)" }}
                >
                  <Icon name="AlertTriangle" size={18} stroke={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`chip ${s.chip}`}>{it.tipo}</span>
                    <span className="text-[10px] font-mono t-fg-dim tracking-[0.15em] uppercase">{it.orgao}</span>
                    <span className="t-fg-ghost">·</span>
                    <span className="text-[10px] font-mono t-fg-dim">{it.data}</span>
                    {it.valor && (
                      <>
                        <span className="t-fg-ghost">·</span>
                        <span className="text-[11px] font-mono font-bold tnum t-fg-strong">{it.valor}</span>
                      </>
                    )}
                    <span
                      className="ml-auto text-[10px] font-bold tracking-[0.15em] uppercase"
                      style={{
                        color:
                          it.severidade === "critico" || it.severidade === "alto" ? "var(--danger)" :
                          it.severidade === "medio" ? "var(--warn)" :
                          "var(--fg-muted)",
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div className="mt-2 text-[13px] t-fg leading-snug">{it.desc}</div>
                  <a href={it.url} className="mt-2 inline-flex items-center gap-1 text-[11px] t-accent font-medium">
                    Ver fonte oficial <Icon name="External" size={10} />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
