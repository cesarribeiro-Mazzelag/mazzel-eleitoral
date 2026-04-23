"use client";

import { useState } from "react";
import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { Settings, Info } from "lucide-react";
import { ALERTAS_DIA, ALERTAS_CATS } from "@/components/mazzel-data/mock";
import { useAlertas } from "@/hooks/useAlertas";

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>
      <Info size={8} />dados de demonstracao
    </span>
  );
}

// Mapa de gravidade backend -> sev visual
const GRAVIDADE_MAP = {
  CRITICO: "crit",
  ALTO: "alto",
  MEDIO: "med",
  BAIXO: "bx",
};

function adaptarAlerta(a) {
  return {
    id: a.id,
    sev: GRAVIDADE_MAP[a.gravidade?.toUpperCase()] ?? "med",
    hora: a.criado_em ? new Date(a.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
    tipo: a.tipo ?? "Sistema",
    titulo: a.descricao ?? "",
    fonte: "Sistema interno",
    uf: "-",
  };
}

function AlertasContent() {
  const [filtro, setFiltro] = useState("todos");

  const { alertas: alertasApi, total, isMock, isLoading } = useAlertas({ limit: 50 });

  // Fallback mock
  const usarMock = isMock || alertasApi.length === 0;
  const alertas = usarMock ? ALERTAS_DIA : alertasApi.map(adaptarAlerta);
  const cats = usarMock ? ALERTAS_CATS : [];

  const visible = filtro === "todos" ? alertas : alertas.filter(a => a.sev === filtro);

  // KPIs derivados
  const criticos = alertas.filter(a => a.sev === "crit").length;
  const altos = alertas.filter(a => a.sev === "alto").length;
  const medios = alertas.filter(a => a.sev === "med").length;
  const totalCats = cats.reduce((s, c) => s + c.qtd, 0);

  return (
    <div className="min-h-full" style={{ background: "var(--mz-bg-page)" }}>
      <div className="max-w-[1600px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] mz-t-fg-dim tracking-[0.18em] uppercase font-semibold">Central de Alertas</div>
            <h1 className="text-[32px] font-bold mz-t-fg-strong mt-1 leading-none">Monitoramento 24/7</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="text-[13px] mz-t-fg-muted">
                {isLoading ? "Carregando..." : "Juridico · Midia · Redes · Emendas · Processos · Legislativo"}
              </div>
              {usarMock && <MockBadge />}
            </div>
          </div>
          <button className="mz-btn-primary flex items-center gap-1.5">
            <Settings size={13} />Configurar
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { l:"Criticos abertos", v: String(criticos), t: "+3 · 24h", ok: false },
            { l:"Alto",             v: String(altos),    t: "+7",       ok: false },
            { l:"Medio",            v: String(medios),   t: "-4",       ok: true  },
            { l:"Total",            v: String(alertas.length), t: "+18%", ok: false },
          ].map(k => (
            <div key={k.l} className="mz-kpi-card mz-ring-soft">
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">{k.l}</div>
              <div className="text-[32px] font-bold mz-tnum mt-1 mz-t-fg-strong">{k.v}</div>
              <div className="mt-2">
                <span className={`mz-chip ${k.ok ? "mz-chip-green" : "mz-chip-red"} w-fit`} style={{ height: 20 }}>{k.t}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-3">
          {/* Feed */}
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
            <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: "var(--mz-rule)" }}>
              <div className="flex-1">
                <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">Feed em tempo real</div>
                <div className="text-[15px] font-bold mz-t-fg-strong">{visible.length} alertas filtrados</div>
              </div>
              <div className="flex items-center gap-1 p-0.5 rounded-md" style={{ background: "var(--mz-rule)" }}>
                {["todos","crit","alto","med","bx"].map(f => (
                  <button key={f} onClick={() => setFiltro(f)}
                    className={`mz-btn-ghost ${filtro === f ? "active" : ""}`} style={{ padding: "5px 10px", fontSize: 11 }}>
                    {f === "todos" ? "Todos" : f === "crit" ? "Critico" : f === "alto" ? "Alto" : f === "med" ? "Medio" : "Baixo"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              {visible.length === 0 && (
                <div className="text-center text-[12px] mz-t-fg-dim py-8">Nenhum alerta nesta categoria.</div>
              )}
              {visible.map(a => (
                <div key={a.id} className={`mz-alert-row mz-alert-sev-${a.sev}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`mz-chip w-fit ${
                        a.sev === "crit" || a.sev === "alto" ? "mz-chip-red"
                        : a.sev === "med" ? "mz-chip-amber"
                        : "mz-chip-muted"
                      }`} style={{ height: 18, fontSize: 9 }}>
                        {a.sev === "crit" ? "Critico" : a.sev === "alto" ? "Alto" : a.sev === "med" ? "Medio" : "Baixo"}
                      </span>
                      <span className="text-[10px] mz-t-fg-dim uppercase tracking-wider">{a.tipo}</span>
                      <span className="mz-tnum text-[11px] mz-t-fg-muted">{a.uf}</span>
                      <span className="text-[10px] mz-t-fg-dim ml-auto mz-tnum">{a.hora}</span>
                    </div>
                    <div className="text-[13px] font-semibold mz-t-fg-strong">{a.titulo}</div>
                    <div className="text-[11px] mz-t-fg-muted">Fonte: {a.fonte}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Por categoria (mock apenas - backend nao agrega por categoria) */}
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--mz-rule)" }}>
              <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold">
                Por categoria · 7 dias
                {usarMock && <span className="ml-1 text-[9px] opacity-60">(estimado)</span>}
              </div>
              <div className="text-[15px] font-bold mz-t-fg-strong">{totalCats || alertas.length} alertas totais</div>
            </div>
            <div className="p-5 space-y-2.5">
              {(cats.length > 0 ? cats : [
                { cat: "Sistema", qtd: alertas.length, cor: "#60a5fa" }
              ]).map(c => (
                <div key={c.cat} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.cor }}/>
                    <div className="text-[12px] mz-t-fg flex-1">{c.cat}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-sm overflow-hidden" style={{ background: "var(--mz-rule)" }}>
                      <div style={{ width: `${(c.qtd / (totalCats || alertas.length || 1)) * 250}%`, height: "100%", background: c.cor }}/>
                    </div>
                    <div className="mz-tnum font-bold text-[12px] mz-t-fg-strong w-7 text-right">{c.qtd}</div>
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

export default function AlertasPage() {
  return (
    <MazzelLayout activeModule="alertas" breadcrumbs={["Uniao Brasil", "Alertas"]} alertCount={12}>
      <AlertasContent />
    </MazzelLayout>
  );
}
