"use client";

/* Sidebar esquerda do Mapa do Cabo: modo (view/lasso), camadas, rotas, equipe.
 * Adaptado de Mapa do Cabo.html LeftToolbar. */

import { Icon } from "../../Icon";
import { CABOS, QUADRAS_BASE, CONFLICTS } from "./data";

const LAYERS = [
  { k: "responsavel", l: "Responsável", i: "Users" },
  { k: "cobertura",   l: "Cobertura",   i: "Target" },
  { k: "performance", l: "Performance", i: "Trend" },
  { k: "orfaos",      l: "Órfãs",       i: "AlertTriangle" },
  { k: "conflitos",   l: "Conflitos",   i: "Zap" },
];

export function LeftToolbar({
  layer, setLayer,
  editMode, setEditMode,
  showRoutes, setShowRoutes,
  caboFocus, setCaboFocus,
  owners,
}) {
  const orfanCount = QUADRAS_BASE.filter((q) => !owners[q.id]).length;
  const conflictCount = Object.keys(CONFLICTS).length;

  return (
    <aside
      className="w-[260px] flex-shrink-0 overflow-y-auto"
      style={{ borderRight: "1px solid var(--rule)", background: "var(--bg-sidebar)" }}
    >
      <div className="p-4" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-2">Modo de trabalho</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setEditMode("view")}
            className={`btn-ghost ${editMode === "view" ? "active" : ""}`}
            style={{ padding: "7px 8px", justifyContent: "center", fontSize: 10.5 }}
            type="button"
          >
            <Icon name="Eye" size={11} />Visão
          </button>
          <button
            onClick={() => setEditMode("lasso")}
            className={`btn-ghost ${editMode === "lasso" ? "active" : ""}`}
            style={{ padding: "7px 8px", justifyContent: "center", fontSize: 10.5 }}
            type="button"
          >
            <Icon name="Filter" size={11} />Lasso
          </button>
        </div>
        {editMode === "lasso" && (
          <div
            className="mt-2 p-2 rounded text-[10.5px] t-fg-muted"
            style={{ background: "rgba(0,42,123,0.06)", border: "1px solid rgba(0,42,123,0.2)" }}
          >
            Arraste no mapa para selecionar quadras e atribuir a um cabo.
          </div>
        )}
      </div>

      <div className="p-4" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-2">Camada</div>
        <div className="space-y-1">
          {LAYERS.map((o) => (
            <button
              key={o.k}
              onClick={() => setLayer(o.k)}
              className={`btn-ghost w-full ${layer === o.k ? "active" : ""}`}
              style={{ padding: "7px 10px", justifyContent: "flex-start", fontSize: 11 }}
              type="button"
            >
              <Icon name={o.i} size={11} />
              <span className="flex-1 text-left">{o.l}</span>
              {o.k === "orfaos" && orfanCount > 0 && <span className="chip chip-red" style={{ height: 16, fontSize: 9 }}>{orfanCount}</span>}
              {o.k === "conflitos" && conflictCount > 0 && <span className="chip chip-red" style={{ height: 16, fontSize: 9 }}>{conflictCount}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Rotas de hoje</div>
          <button
            className="btn-ghost"
            style={{ padding: "3px 7px", fontSize: 10 }}
            onClick={() => setShowRoutes(!showRoutes)}
            type="button"
          >
            {showRoutes ? "ocultar" : "mostrar"}
          </button>
        </div>
        <div className="text-[10.5px] t-fg-dim">Trilha de cada cabo · atualizada a cada 15 min</div>
      </div>

      <div className="p-4">
        <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-2">
          Equipe do bairro · {CABOS.length}
        </div>
        <div className="space-y-1.5">
          <button
            onClick={() => setCaboFocus(null)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left"
            style={{ background: !caboFocus ? "var(--rule-strong)" : "transparent" }}
            type="button"
          >
            <div style={{ width: 8, height: 8, borderRadius: 99, background: "var(--fg-muted)" }} />
            <span className="text-[11.5px] t-fg-strong font-semibold">Todos</span>
            <span className="text-[10px] t-fg-dim ml-auto">{CABOS.length}</span>
          </button>
          {CABOS.map((c) => {
            const n = Object.values(owners).filter((v) => v === c.id).length;
            const scoreColor =
              c.score >= 80 ? "var(--ok)" :
              c.score >= 65 ? "var(--warn)" : "var(--danger)";
            return (
              <button
                key={c.id}
                onClick={() => setCaboFocus(caboFocus === c.id ? null : c.id)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left"
                style={{ background: caboFocus === c.id ? "var(--rule-strong)" : "transparent" }}
                type="button"
              >
                <div style={{ width: 9, height: 9, borderRadius: 99, background: c.cor, boxShadow: `0 0 0 2px ${c.cor}22` }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] font-semibold t-fg-strong truncate">{c.nome}</div>
                  <div className="text-[10px] t-fg-dim">{n} quadras · {c.visitasHoje}/{c.metaHoje} hoje</div>
                </div>
                <span className="text-[10px] tnum font-bold" style={{ color: scoreColor }}>{c.score}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
