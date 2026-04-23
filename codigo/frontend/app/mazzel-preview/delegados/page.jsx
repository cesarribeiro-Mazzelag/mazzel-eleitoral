"use client";

import { useState } from "react";
import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { Plus, Info } from "lucide-react";
import { DELEGADOS_LIST } from "@/components/mazzel-data/mock";
import { useDelegados } from "@/hooks/useDelegados";

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>
      <Info size={8} />dados de demonstracao
    </span>
  );
}

// Adapta delegado da API para o formato visual do Designer
function adaptarDelegado(d) {
  const perf = Math.min(100, Math.round(
    ((d.filiados_cadastrados ?? 0) / 500) * 50 +
    ((d.zonas_cobertas ?? 0) / 10) * 50
  ));
  return {
    nome: d.nome,
    uf: d.estado_uf,
    cidades: d.municipios_cobertos ?? 0,
    filiados: d.filiados_cadastrados ?? 0,
    perf: perf || 50,
    status: perf >= 80 ? "top" : perf >= 60 ? "ok" : perf >= 40 ? "at" : "baixo",
  };
}

function DelegadosContent() {
  const [sort, setSort] = useState("perf");
  const { delegados: delegadosApi, isMock, isLoading } = useDelegados({ ativo: true });

  // Fallback mock quando API retorna vazio
  const usarMock = isMock || delegadosApi.length === 0;
  const fonte = usarMock ? DELEGADOS_LIST : delegadosApi.map(adaptarDelegado);

  const sorted = [...fonte].sort((a, b) =>
    sort === "perf"     ? b.perf - a.perf
    : sort === "filiados" ? b.filiados - a.filiados
    : a.uf.localeCompare(b.uf)
  );

  return (
    <div className="min-h-full" style={{ background: "var(--mz-bg-page)" }}>
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] mz-t-fg-dim tracking-[0.18em] uppercase font-semibold">Delegados</div>
            <h1 className="text-[32px] font-bold mz-t-fg-strong mt-1 leading-none">
              Gestao de delegacoes estaduais
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="text-[13px] mz-t-fg-muted">
                {isLoading ? "Carregando..." : `${sorted.length} delegados · hierarquia UF · performance operacional`}
              </div>
              {usarMock && <MockBadge />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="mz-btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>
              <option value="perf">Ordenar · Performance</option>
              <option value="filiados">Ordenar · Filiados</option>
              <option value="uf">Ordenar · UF</option>
            </select>
            <button className="mz-btn-primary flex items-center gap-1.5">
              <Plus size={13} />Novo delegado
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { l:"Delegados ativos",   v: String(sorted.length) },
            { l:"Cidades cobertas",   v: sorted.reduce((s, d) => s + (d.cidades || 0), 0).toLocaleString("pt-BR") },
            { l:"Filiados base",      v: sorted.reduce((s, d) => s + (d.filiados || 0), 0).toLocaleString("pt-BR") },
            { l:"Performance media",  v: sorted.length ? String(Math.round(sorted.reduce((s, d) => s + d.perf, 0) / sorted.length)) : "-" },
          ].map(k => (
            <div key={k.l} className="mz-kpi-card mz-ring-soft">
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.l}</div>
              <div className="text-[32px] font-bold mz-tnum mt-1 mz-t-fg-strong">{k.v}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
          <div className="grid grid-cols-[50px_2fr_80px_1fr_1fr_120px_100px] gap-3 px-5 py-2.5 text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold border-b"
            style={{ borderColor: "var(--mz-rule)", background: "var(--mz-bg-card-2)" }}>
            <div>UF</div><div>Delegado</div><div>Cidades</div><div>Filiados</div><div>Performance</div><div>Status</div><div></div>
          </div>
          {sorted.map((d, i) => (
            <div key={i} className="grid grid-cols-[50px_2fr_80px_1fr_1fr_120px_100px] gap-3 px-5 py-3 items-center text-[12px] border-b last:border-0"
              style={{ borderColor: "var(--mz-rule)" }}>
              <div className="mz-tnum font-bold mz-t-fg-strong">{d.uf}</div>
              <div>
                <div className="font-semibold mz-t-fg-strong">{d.nome}</div>
                <div className="text-[10.5px] mz-t-fg-dim">Delegado · Federacao {d.uf}</div>
              </div>
              <div className="mz-tnum mz-t-fg">{d.cidades}</div>
              <div className="mz-tnum mz-t-fg">{d.filiados.toLocaleString("pt-BR")}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-sm overflow-hidden" style={{ background: "var(--mz-rule)" }}>
                  <div style={{
                    width: `${d.perf}%`, height: "100%",
                    background: d.perf >= 80 ? "var(--mz-ok, #34d399)" : d.perf >= 60 ? "var(--mz-warn, #fbbf24)" : "var(--mz-danger, #f87171)"
                  }}/>
                </div>
                <div className="mz-tnum font-bold mz-t-fg-strong w-8 text-right">{d.perf}</div>
              </div>
              <div>
                <span className={`mz-chip w-fit ${
                  d.status === "top"   ? "mz-chip-green"
                  : d.status === "ok"  ? "mz-chip-blue"
                  : d.status === "at"  ? "mz-chip-amber"
                  : "mz-chip-red"
                }`} style={{ height: 20 }}>
                  {d.status === "top" ? "Top performer" : d.status === "ok" ? "Em linha" : d.status === "at" ? "Atencao" : "Abaixo"}
                </span>
              </div>
              <div className="text-right">
                <button className="mz-btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }}>Ver -&gt;</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DelegadosPage() {
  return (
    <MazzelLayout activeModule="delegados" breadcrumbs={["Uniao Brasil", "Delegados"]} alertCount={12}>
      <DelegadosContent />
    </MazzelLayout>
  );
}
