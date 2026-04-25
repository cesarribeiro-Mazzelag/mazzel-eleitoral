"use client";

/* Modulo Filiados - adaptado de designer/platform-lote4.jsx ModuleFiliados. */

import { Icon } from "../Icon";
import { FILIADOS_UF, FILIADOS_TOTAL, FILIADOS_NOVOS_30, FILIADOS_FAIXA_IDADE } from "../data";
import { API } from "../api";
import { useApiFetch, StatusBanner } from "../useApiFetch";
import { filiadosListFromApi } from "../adapters/listagens";

function makeKpis(total) {
  return [
    { l: "Total nacional",   v: total.toLocaleString("pt-BR") },
    { l: "Novos (30d)",      v: FILIADOS_NOVOS_30.toLocaleString("pt-BR"), t: "+14%"   },
    { l: "Taxa retenção",    v: "94,2%",                                    t: "+0,8pp" },
    { l: "Ranking nacional", v: "4º",                                       h: "entre 33 partidos" },
  ];
}

export function Filiados() {
  const { data, status, errorMsg } = useApiFetch(
    () => API.filiados({ pagina: 1, limite: 500 }).then(filiadosListFromApi),
    null,
    [],
  );
  const ufs = (data?.porUf?.length ? data.porUf : FILIADOS_UF);
  const total = data?.total ?? FILIADOS_TOTAL;
  const maxUf = ufs[0]?.total || 1;

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <StatusBanner status={status} errorMsg={errorMsg} />
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Filiados União Brasil</div>
            <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">Base nacional de filiados</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">Sincronizada com TSE · atualizada diariamente</div>
          </div>
          <button className="btn-primary" type="button"><Icon name="Download" size={13} />Exportar base completa</button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {makeKpis(total).map((k) => (
            <div key={k.l} className="kpi-card ring-soft">
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.l}</div>
              <div className="text-[32px] font-bold tnum mt-1 t-fg-strong">{k.v}</div>
              {k.t && (
                <div className="kpi-trend">
                  <span className="chip chip-green" style={{ height: 20 }}>
                    <Icon name="ArrowUp" size={10} />{k.t}
                  </span>
                </div>
              )}
              {k.h && <div className="text-[11px] t-fg-dim mt-1">{k.h}</div>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[1.5fr_1fr] gap-3">
          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Distribuição por UF</div>
              <div className="text-[15px] font-bold t-fg-strong">Top 15 unidades federativas</div>
            </div>
            <div className="p-5 space-y-1.5">
              {ufs.slice(0, 15).map((u) => (
                <div key={u.uf} className="grid grid-cols-[36px_1fr_90px_70px] gap-3 items-center text-[11.5px]">
                  <div className="tnum font-bold t-fg-strong">{u.uf}</div>
                  <div className="h-2 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
                    <div
                      style={{
                        width: `${(u.total / maxUf) * 100}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, var(--tenant-primary), #60a5fa)",
                      }}
                    />
                  </div>
                  <div className="tnum font-semibold t-fg text-right">{u.total.toLocaleString("pt-BR")}</div>
                  <div className="tnum text-[10px] t-ok text-right">{u.novos30d ? `+${u.novos30d}` : "-"}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="t-bg-card ring-soft rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Perfil demográfico</div>
              <div className="text-[15px] font-bold t-fg-strong">Faixa etária dos filiados</div>
            </div>
            <div className="p-5 space-y-2">
              {FILIADOS_FAIXA_IDADE.map((f) => (
                <div key={f.faixa} className="grid grid-cols-[80px_1fr_50px] gap-3 items-center text-[11.5px]">
                  <div className="t-fg">{f.faixa} anos</div>
                  <div className="h-2 rounded-sm overflow-hidden" style={{ background: "var(--rule)" }}>
                    <div
                      style={{
                        width: `${f.v * 4}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, var(--tenant-primary), var(--accent-blue))",
                      }}
                    />
                  </div>
                  <div className="tnum font-bold t-fg-strong text-right">{f.v}%</div>
                </div>
              ))}
              <div className="pt-4 mt-4 border-t grid grid-cols-2 gap-2" style={{ borderColor: "var(--rule)" }}>
                <div>
                  <div className="text-[10px] t-fg-dim uppercase tracking-wider">Gênero M/F</div>
                  <div className="tnum font-bold t-fg-strong">54% / 46%</div>
                </div>
                <div>
                  <div className="text-[10px] t-fg-dim uppercase tracking-wider">Escolaridade</div>
                  <div className="tnum font-bold t-fg-strong">62% superior</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
