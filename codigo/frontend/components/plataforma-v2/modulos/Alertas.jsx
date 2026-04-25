"use client";

/* Modulo Alertas (central) - adaptado de designer/platform-lote4.jsx ModuleAlertas. */

import { useState, useMemo } from "react";
import { Icon } from "../Icon";
import { ALERTAS_DIA, ALERTAS_CATS } from "../data";
import { API } from "../api";
import { useApiFetch, StatusBanner } from "../useApiFetch";
import { alertasListFromApi } from "../adapters/listagens";

const FILTROS = [
  { k: "todos", l: "Todos"   },
  { k: "crit",  l: "Crítico" },
  { k: "alto",  l: "Alto"    },
  { k: "med",   l: "Médio"   },
  { k: "bx",    l: "Baixo"   },
];

const SEV_LABEL = {
  crit: "Crítico",
  alto: "Alto",
  med:  "Médio",
  bx:   "Baixo",
};

const KPIS = [
  { l: "Críticos abertos", v: "12",  t: "+3 · 24h", ok: false },
  { l: "Alto",             v: "34",  t: "+7",       ok: false },
  { l: "Médio",            v: "58",  t: "-4",       ok: true  },
  { l: "Total 7d",         v: "138", t: "+18%",     ok: false },
];

export function Alertas() {
  const [filtro, setFiltro] = useState("todos");
  const { data: apiList, status, errorMsg } = useApiFetch(
    () => API.alertas({ limit: 100 }).then(alertasListFromApi),
    null,
    [],
  );
  const fonte = apiList || ALERTAS_DIA;
  const visible = useMemo(
    () => (filtro === "todos" ? fonte : fonte.filter((a) => a.sev === filtro)),
    [fonte, filtro],
  );
  const total = ALERTAS_CATS.reduce((s, c) => s + c.qtd, 0);

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <StatusBanner status={status} errorMsg={errorMsg} />
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Central de Alertas</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">Monitoramento 24/7</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">Jurídico · Mídia · Redes · Emendas · Processos · Legislativo</div>
          </div>
          <button className="btn-primary" type="button"><Icon name="Settings" size={13} />Configurar</button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {KPIS.map((k) => (
            <div key={k.l} className="kpi-card ring-soft">
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.l}</div>
              <div className="text-[32px] font-bold tnum mt-1 t-fg-strong">{k.v}</div>
              <div className="kpi-trend">
                <span className={`chip ${k.ok ? "chip-green" : "chip-red"}`} style={{ height: 20 }}>{k.t}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-3">
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: "var(--rule)" }}>
              <div className="flex-1">
                <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Feed em tempo real</div>
                <div className="text-[15px] font-bold t-fg-strong">{visible.length} alertas filtrados</div>
              </div>
              <div className="flex items-center gap-1 p-0.5 rounded-md" style={{ background: "var(--rule)" }}>
                {FILTROS.map((f) => (
                  <button
                    key={f.k}
                    onClick={() => setFiltro(f.k)}
                    className={`btn-ghost ${filtro === f.k ? "active" : ""}`}
                    style={{ padding: "5px 10px", fontSize: 11 }}
                    type="button"
                  >
                    {f.l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              {visible.map((a) => (
                <div key={a.id} className={`alert-row alert-sev-${a.sev}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`chip ${
                          a.sev === "crit" ? "chip-red" :
                          a.sev === "alto" ? "chip-red" :
                          a.sev === "med"  ? "chip-amber" : "chip-muted"
                        }`}
                        style={{ height: 18, fontSize: 9 }}
                      >
                        {SEV_LABEL[a.sev]}
                      </span>
                      <span className="text-[10px] t-fg-dim uppercase tracking-wider">{a.tipo}</span>
                      <span className="tnum text-[11px] t-fg-muted">{a.uf}</span>
                      <span className="text-[10px] t-fg-dim ml-auto tnum">{a.hora}</span>
                    </div>
                    <div className="text-[13px] font-semibold t-fg-strong">{a.titulo}</div>
                    <div className="text-[11px] t-fg-muted">Fonte: {a.fonte}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Por categoria · 7 dias</div>
              <div className="text-[15px] font-bold t-fg-strong">{total} alertas totais</div>
            </div>
            <div className="p-5 space-y-2.5">
              {ALERTAS_CATS.map((c) => (
                <div key={c.cat} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.cor }} />
                    <div className="text-[12px] t-fg flex-1">{c.cat}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
                      <div style={{ width: `${(c.qtd / total) * 250}%`, height: "100%", background: c.cor }} />
                    </div>
                    <div className="tnum font-bold text-[12px] t-fg-strong w-7 text-right">{c.qtd}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
