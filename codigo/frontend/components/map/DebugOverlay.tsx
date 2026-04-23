"use client";

/**
 * Overlay de debug do mapa eleitoral.
 *
 * Mostra os filtros ativos, geografia, dados de hover e métricas do
 * nivel_farol/score_normalizado quando ui.debugMode === true.
 *
 * Toggle: useMapaActions().toggleDebug() ou tecla "D" no mapa.
 */
import { useMapaFilters, useMapaGeography, useMapaUI, useMapaActions } from "@/hooks/useMapaState";
import { useMapaStore } from "@/lib/store/mapaStore";
import { FILTERS_DEFAULT, UI_DEFAULT } from "@/lib/mapa/machine";

export function DebugOverlay() {
  const filters = useMapaFilters();
  const geography = useMapaGeography();
  const ui = useMapaUI();
  const { toggleDebug } = useMapaActions();
  const selecionados = useMapaStore((s) => s.selecionados);

  // Replica a logica do HeaderVoltar.isInitial pra diagnosticar o disabled.
  const isInitial =
    geography.nivel === "brasil" &&
    !geography.uf &&
    !geography.ibge &&
    selecionados.length === 0 &&
    filters.partido === FILTERS_DEFAULT.partido &&
    filters.candidatoId === FILTERS_DEFAULT.candidatoId &&
    filters.cargo === FILTERS_DEFAULT.cargo &&
    filters.ano === FILTERS_DEFAULT.ano &&
    filters.anoComparacao === FILTERS_DEFAULT.anoComparacao &&
    filters.turno === FILTERS_DEFAULT.turno &&
    filters.tab === FILTERS_DEFAULT.tab &&
    filters.modo === FILTERS_DEFAULT.modo &&
    ui.viewMode === UI_DEFAULT.viewMode;

  if (!ui.debugMode) return null;

  const hover = ui.hoverFeature;
  const hoverProps = (hover && hover.properties) || null;

  return (
    <div
      className="fixed bottom-3 right-3 z-[60] max-w-xs rounded-lg border border-slate-700 bg-slate-900/95 p-3 font-mono text-[11px] text-slate-100 shadow-2xl backdrop-blur"
      style={{ pointerEvents: "auto" }}
    >
      <div className="mb-2 flex items-center justify-between border-b border-slate-700 pb-1">
        <span className="text-amber-400">DEBUG</span>
        <button
          onClick={toggleDebug}
          className="text-slate-400 hover:text-white"
          aria-label="Fechar debug"
        >
          ×
        </button>
      </div>

      <div className="space-y-1.5">
        <Section title="filters">
          <Row k="partido" v={filters.partido} />
          <Row k="cargo" v={filters.cargo} />
          <Row k="ano" v={filters.ano} />
          <Row k="anoComparacao" v={filters.anoComparacao} />
          <Row k="turno" v={filters.turno} />
          <Row k="modo" v={filters.modo} />
        </Section>

        <Section title="geography">
          <Row k="nivel" v={geography.nivel} />
          <Row k="uf" v={geography.uf} />
          <Row k="ibge" v={geography.ibge} />
        </Section>

        <Section title="selecionados">
          <Row k="count" v={selecionados.length} highlight />
          {selecionados.map((s, i) => (
            <Row key={i} k={`[${i}]`} v={`${s.tipo}#${s.id} ${s.nome}`} />
          ))}
        </Section>

        <Section title="voltar">
          <Row k="isInitial" v={isInitial} highlight />
          <Row k="disabled" v={isInitial} highlight />
          <Row k="tab" v={filters.tab} />
          <Row k="viewMode" v={ui.viewMode} />
        </Section>

        {hoverProps && (
          <Section title="hover">
            {"nivel_farol" in hoverProps && (
              <Row k="nivel_farol" v={hoverProps.nivel_farol} highlight />
            )}
            {"score_normalizado" in hoverProps && (
              <Row
                k="score_norm"
                v={
                  typeof hoverProps.score_normalizado === "number"
                    ? hoverProps.score_normalizado.toFixed(3)
                    : hoverProps.score_normalizado
                }
                highlight
              />
            )}
            {"score_ponderado" in hoverProps && (
              <Row k="score_pond" v={hoverProps.score_ponderado} />
            )}
            {"status_farol" in hoverProps && (
              <Row k="status_farol" v={hoverProps.status_farol} />
            )}
            {"votos" in hoverProps && <Row k="votos" v={hoverProps.votos} />}
            {"eleitos" in hoverProps && (
              <Row k="eleitos" v={hoverProps.eleitos} />
            )}
            {"partido_sigla" in hoverProps && (
              <Row k="partido" v={hoverProps.partido_sigla} />
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-0.5 text-slate-400">{title}</div>
      <div className="ml-2 space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  k,
  v,
  highlight = false,
}: {
  k: string;
  v: unknown;
  highlight?: boolean;
}) {
  const display =
    v === null || v === undefined
      ? "—"
      : typeof v === "object"
      ? JSON.stringify(v)
      : String(v);
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-slate-500">{k}:</span>
      <span className={highlight ? "text-amber-300" : "text-slate-100"}>
        {display}
      </span>
    </div>
  );
}
