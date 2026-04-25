"use client";

/* Modulo Delegados - adaptado de designer/platform-lote4.jsx ModuleDelegados. */

import { useState, useMemo } from "react";
import { Icon } from "../Icon";
import { DELEGADOS_LIST } from "../data";
import { API } from "../api";
import { useApiFetch, StatusBanner } from "../useApiFetch";
import { delegadosListFromApi } from "../adapters/listagens";

const STATUS_CHIP = {
  top:   { cls: "chip-green",  label: "Top performer" },
  ok:    { cls: "chip-blue",   label: "Em linha" },
  at:    { cls: "chip-amber",  label: "Atenção" },
  baixo: { cls: "chip-red",    label: "Abaixo" },
};

export function Delegados() {
  const [sort, setSort] = useState("perf");
  const { data: apiList, status, errorMsg } = useApiFetch(
    () => API.delegados().then(delegadosListFromApi),
    null,
    [],
  );
  const fonte = apiList || DELEGADOS_LIST;
  const sorted = useMemo(() => {
    const arr = [...fonte];
    if (sort === "perf")      arr.sort((a, b) => b.perf - a.perf);
    else if (sort === "filiados") arr.sort((a, b) => b.filiados - a.filiados);
    else                          arr.sort((a, b) => a.uf.localeCompare(b.uf));
    return arr;
  }, [fonte, sort]);

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <StatusBanner status={status} errorMsg={errorMsg} />
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Delegados</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">Gestão de delegações estaduais</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">27 delegados · hierarquia UF · performance operacional</div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="btn-ghost"
              style={{ padding: "6px 10px", fontSize: 12 }}
            >
              <option value="perf">Ordenar · Performance</option>
              <option value="filiados">Ordenar · Filiados</option>
              <option value="uf">Ordenar · UF</option>
            </select>
            <button className="btn-primary" type="button"><Icon name="Plus" size={13} />Novo delegado</button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { l: "Delegados ativos",   v: "27"    },
            { l: "Cidades cobertas",   v: "4.238" },
            { l: "Filiados base",      v: "234k"  },
            { l: "Performance média",  v: "72"    },
          ].map((k) => (
            <div key={k.l} className="kpi-card ring-soft">
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.l}</div>
              <div className="text-[32px] font-bold tnum mt-1 t-fg-strong">{k.v}</div>
            </div>
          ))}
        </div>

        <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
          <div
            className="grid grid-cols-[50px_2fr_80px_1fr_1fr_120px_100px] gap-3 px-5 py-2.5 text-[10px] t-fg-dim uppercase tracking-wider font-semibold border-b"
            style={{ borderColor: "var(--rule)", background: "var(--bg-card-2)" }}
          >
            <div>UF</div><div>Delegado</div><div>Cidades</div><div>Filiados</div><div>Performance</div><div>Status</div><div></div>
          </div>
          {sorted.map((d, i) => {
            const s = STATUS_CHIP[d.status] || STATUS_CHIP.ok;
            return (
              <div
                key={i}
                className="grid grid-cols-[50px_2fr_80px_1fr_1fr_120px_100px] gap-3 px-5 py-3 items-center text-[12px] border-b last:border-0"
                style={{ borderColor: "var(--rule)" }}
              >
                <div className="tnum font-bold t-fg-strong">{d.uf}</div>
                <div>
                  <div className="font-semibold t-fg-strong">{d.nome}</div>
                  <div className="text-[10.5px] t-fg-dim">Delegado · Federação {d.uf}</div>
                </div>
                <div className="tnum t-fg">{d.cidades}</div>
                <div className="tnum t-fg">{d.filiados.toLocaleString("pt-BR")}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
                    <div
                      style={{
                        width: `${d.perf}%`,
                        height: "100%",
                        background: d.perf >= 80 ? "var(--ok)" : d.perf >= 60 ? "var(--warn)" : "var(--danger)",
                      }}
                    />
                  </div>
                  <div className="tnum font-bold t-fg-strong w-8 text-right">{d.perf}</div>
                </div>
                <div>
                  <span className={`chip ${s.cls}`} style={{ height: 20 }}>{s.label}</span>
                </div>
                <div className="text-right">
                  <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} type="button">Ver →</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
