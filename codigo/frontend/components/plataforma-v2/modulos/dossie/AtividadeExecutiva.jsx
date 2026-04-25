"use client";

/* Dossie 05b - Atividade Executiva (PRES, GOV, PREF).
 * Renderizado quando candidato exerceu cargo executivo (dossie.executivo populado).
 * Mostra MPs editadas, PLs enviados, decretos, vetos, taxa de aprovacao.
 *
 * Espelha visualmente AtividadeLegislativa mas usando dados de executivo. */

import { Icon } from "../../Icon";
import { SectionShell, EmptyState } from "../../Primitives";

const TONE_MAP = {
  green: { chip: "chip-green", fg: "var(--ok)"     },
  amber: { chip: "chip-amber", fg: "var(--warn)"   },
  red:   { chip: "chip-red",   fg: "var(--danger)" },
  blue:  { chip: "chip-blue",  fg: "var(--accent)" },
};

function ExecutivoCard({ title, count, tone, items, vazioMsg }) {
  const c = TONE_MAP[tone] || TONE_MAP.blue;
  return (
    <div
      className="rounded-xl p-5 flex flex-col"
      style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}
    >
      <div className="flex items-baseline justify-between">
        <div className={`chip ${c.chip}`}>{title}</div>
        <div className="text-[36px] font-black font-display tnum" style={{ color: c.fg }}>
          {String(count).padStart(2, "0")}
        </div>
      </div>
      <div className="mt-4 pt-4 space-y-2.5" style={{ borderTop: "1px solid var(--rule)" }}>
        <div className="text-[9px] font-mono tracking-[0.2em] uppercase t-fg-dim">Últimas {items?.length || 0}</div>
        {items && items.length > 0 ? (
          items.slice(0, 3).map((it, i) => (
            <div key={i} className="block group">
              <div className="text-[12px] t-fg group-hover:t-fg-strong leading-snug line-clamp-2">
                {it.tipo} {it.numero}/{it.ano} · {it.ementa}
              </div>
              <div className="text-[10px] font-mono t-fg-dim mt-0.5">
                {it.data_apresentacao || "-"}
              </div>
            </div>
          ))
        ) : (
          <div className="text-[11px] t-fg-dim italic">{vazioMsg || "Sem registros"}</div>
        )}
      </div>
    </div>
  );
}

export function AtividadeExecutiva({ profile }) {
  // Espera profile.executivo com shape do schema Executivo do backend
  const E = profile.executivo;
  if (!E || !E.cargo) {
    return null;  // Renderiza nada quando nao e executivo (AtividadeLegislativa entra no lugar)
  }

  const cargoLabel = E.cargo_titulo || E.cargo;
  const periodo = E.mandato_ano_inicio
    ? `${E.mandato_ano_inicio}-${E.mandato_ano_fim || "atual"}`
    : "-";

  return (
    <SectionShell
      id="sec-executivo"
      label="05 Executivo"
      title="Atividade Executiva"
      sub="MPs · decretos · vetos · projetos"
      kicker={
        <>
          <span>Mandato: <span className="t-fg-strong">{cargoLabel}</span></span>
          {E.uf && <><span className="t-fg-ghost mx-2">·</span><span className="t-fg-strong">{E.uf}</span></>}
          <span className="t-fg-ghost mx-2">·</span>
          <span>{periodo}</span>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-4">
        <ExecutivoCard
          title="MPs editadas"
          count={E.n_medidas_provisorias || 0}
          tone="amber"
          items={E.ultimas_mps}
          vazioMsg="Nenhuma MP no período"
        />
        <ExecutivoCard
          title="MPs aprovadas"
          count={E.n_mps_aprovadas || 0}
          tone="green"
          items={(E.ultimas_mps || []).filter((m) => m.aprovada === true)}
          vazioMsg="Nenhuma MP aprovada ainda"
        />
        <ExecutivoCard
          title="Projetos enviados"
          count={E.n_pls_enviados || 0}
          tone="blue"
          items={E.ultimos_pls}
          vazioMsg="Nenhum projeto enviado"
        />
      </div>

      <div className="mt-6 grid grid-cols-4 gap-3">
        <div className="rounded-lg p-4" style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}>
          <div className="text-[10px] font-mono tracking-[0.15em] uppercase t-fg-dim">Decretos</div>
          <div className="text-[22px] font-black tnum t-fg-strong mt-1">{E.n_decretos || 0}</div>
        </div>
        <div className="rounded-lg p-4" style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}>
          <div className="text-[10px] font-mono tracking-[0.15em] uppercase t-fg-dim">Vetos</div>
          <div className="text-[22px] font-black tnum t-fg-strong mt-1">{E.n_vetos || 0}</div>
        </div>
        <div className="rounded-lg p-4" style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}>
          <div className="text-[10px] font-mono tracking-[0.15em] uppercase t-fg-dim">PECs enviadas</div>
          <div className="text-[22px] font-black tnum t-fg-strong mt-1">{E.n_pecs_enviadas || 0}</div>
        </div>
        <div className="rounded-lg p-4" style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}>
          <div className="text-[10px] font-mono tracking-[0.15em] uppercase t-fg-dim">Taxa aprovação MPs</div>
          <div className="text-[22px] font-black tnum t-fg-strong mt-1" style={{ color: "var(--ok)" }}>
            {E.taxa_aprovacao_mps != null ? `${Math.round(E.taxa_aprovacao_mps)}%` : "-"}
          </div>
        </div>
      </div>

      <div className="mt-4 text-[11px] t-fg-muted">
        Total de atos no mandato: <span className="t-fg-strong tnum">{E.total_atos || 0}</span>
        {E.n_mps_caducadas > 0 && (
          <> · <span className="t-warn">{E.n_mps_caducadas} MPs caducadas</span></>
        )}
      </div>
    </SectionShell>
  );
}
