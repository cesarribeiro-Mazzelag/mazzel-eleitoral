"use client";

/* Drawer direito do Mapa do Cabo - 4 modos:
 * - Overview (sem seleção)
 * - QuadraPanel (clique numa quadra)
 * - CaboPanel (foco num cabo)
 * - AssignPanel (lasso)
 *
 * Adaptado de Mapa do Cabo.html RightDrawer. */

import { useMemo } from "react";
import { Icon } from "../../Icon";
import {
  CABOS, QUADRAS_BASE, CONFLICTS, perfFor,
  CHECKLIST_MOCK, ELEITORES_MOCK, AGENDA_DIA_MOCK,
} from "./data";

function MiniStat({ label, value, sub, color }) {
  return (
    <div>
      <div className="text-[9.5px] t-fg-dim uppercase tracking-wider font-semibold mb-0.5">{label}</div>
      <div
        className="text-[17px] font-black tnum font-display"
        style={{ color: color || "var(--fg-strong)" }}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] t-fg-dim mt-0.5">{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, color, height = 6 }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="rounded-full overflow-hidden"
      style={{ height, background: "var(--rule)" }}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color || "var(--fg-strong)" }}
      />
    </div>
  );
}

function drawerClass() {
  return "w-[360px] flex-shrink-0 overflow-y-auto";
}
function drawerStyle() {
  return { borderLeft: "1px solid var(--rule)", background: "var(--bg-card)" };
}

export function RightDrawer({ selected, setSelected, lassoSet, setLassoSet, onAssign, caboFocus, owners }) {
  if (lassoSet.size > 0) {
    return <AssignPanel lassoSet={lassoSet} owners={owners} onAssign={onAssign} onClose={() => setLassoSet(new Set())} />;
  }
  if (caboFocus) {
    return <CaboPanel caboId={caboFocus} owners={owners} />;
  }
  if (selected) {
    return <QuadraPanel qId={selected} owners={owners} onClose={() => setSelected(null)} />;
  }
  return <OverviewPanel owners={owners} />;
}

function OverviewPanel({ owners }) {
  const totais = useMemo(() => {
    const orfas = QUADRAS_BASE.filter((q) => !owners[q.id]);
    const confl = Object.keys(CONFLICTS);
    const domTotal = QUADRAS_BASE.reduce((s, q) => s + q.domicilios, 0);
    const visitasHoje = CABOS.reduce((s, c) => s + c.visitasHoje, 0);
    const metaHoje = CABOS.reduce((s, c) => s + c.metaHoje, 0);
    return { orfas: orfas.length, conflitos: confl.length, domTotal, visitasHoje, metaHoje };
  }, [owners]);

  return (
    <aside className={drawerClass()} style={drawerStyle()}>
      <div className="p-5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-1">Coordenação territorial</div>
        <div className="text-[20px] font-black font-display t-fg-strong leading-tight">Sala de comando</div>
        <div className="text-[11px] t-fg-muted mt-0.5">Bairro Tomba · Feira de Santana · BA</div>
      </div>

      <div className="p-5 grid grid-cols-2 gap-3" style={{ borderBottom: "1px solid var(--rule)" }}>
        <MiniStat label="Domicílios" value={totais.domTotal.toLocaleString("pt-BR")} />
        <MiniStat
          label="Visitas hoje"
          value={`${totais.visitasHoje}/${totais.metaHoje}`}
          color={totais.visitasHoje / totais.metaHoje >= 0.7 ? "var(--ok)" : "var(--warn)"}
        />
        <MiniStat label="Órfãs" value={totais.orfas} color={totais.orfas ? "var(--danger)" : "var(--ok)"} />
        <MiniStat label="Conflitos" value={totais.conflitos} color={totais.conflitos ? "var(--danger)" : "var(--ok)"} />
      </div>

      <div className="p-5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Ranking do dia</div>
          <Icon name="Star" size={12} className="t-fg-dim" />
        </div>
        <div className="space-y-2">
          {[...CABOS]
            .sort((a, b) => (b.visitasHoje / b.metaHoje) - (a.visitasHoje / a.metaHoje))
            .map((c, i) => {
              const pct = c.visitasHoje / c.metaHoje;
              const color = pct >= 0.8 ? "var(--ok)" : pct >= 0.5 ? "var(--warn)" : "var(--danger)";
              return (
                <div key={c.id} className="flex items-center gap-2 text-[11px]">
                  <div className="tnum t-fg-dim w-4 text-right">{i + 1}</div>
                  <div style={{ width: 8, height: 8, borderRadius: 99, background: c.cor }} />
                  <div className="flex-1 min-w-0 truncate t-fg-strong font-semibold">{c.nome}</div>
                  <div className="flex-1 max-w-[80px]">
                    <ProgressBar value={pct * 100} color={color} />
                  </div>
                  <div className="tnum t-fg-muted w-10 text-right">{Math.round(pct * 100)}%</div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="p-5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-2">Agenda · hoje</div>
        <div className="space-y-1.5 text-[11.5px]">
          {AGENDA_DIA_MOCK.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <Icon name="Calendar" size={11} className="t-fg-dim" />
              <span className="tnum t-fg-dim">{a.hora}</span>
              <span className="t-fg-strong">{a.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-2">
        <button className="btn-primary w-full" style={{ justifyContent: "center" }} type="button">
          <Icon name="UserCheck" size={12} />Contratar novo cabo
        </button>
        <button className="btn-ghost w-full" style={{ justifyContent: "center" }} type="button">
          <Icon name="Download" size={12} />Exportar mapa + performance
        </button>
        <button className="btn-ghost w-full" style={{ justifyContent: "center" }} type="button">
          <Icon name="Bell" size={12} />Abrir chat do bairro
        </button>
      </div>
    </aside>
  );
}

function QuadraPanel({ qId, owners, onClose }) {
  const q = QUADRAS_BASE.find((x) => x.id === qId);
  const caboId = owners[qId];
  const c = caboId ? CABOS.find((x) => x.id === caboId) : null;
  const p = perfFor(qId, owners);
  const conflict = CONFLICTS[qId];

  return (
    <aside className={drawerClass()} style={drawerStyle()}>
      <div className="p-5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-0.5">
              Quadra · <span className="font-mono">{q.id}</span>
            </div>
            <div className="text-[17px] font-black font-display t-fg-strong leading-tight">{q.rua}</div>
            <div className="text-[11px] t-fg-muted mt-0.5">{q.domicilios} domicílios</div>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: "5px 7px" }} type="button">
            <Icon name="X" size={11} />
          </button>
        </div>

        {conflict && (
          <div className="mt-2 p-2 rounded flex items-start gap-2" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)" }}>
            <Icon name="AlertTriangle" size={12} className="t-danger mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-[11px]">
              <div className="font-bold t-danger mb-0.5">Conflito de atribuição</div>
              <div className="t-fg-muted">
                Reivindicada por <b>{CABOS.find((x) => x.id === conflict[0])?.nome}</b> e{" "}
                <b>{CABOS.find((x) => x.id === conflict[1])?.nome}</b>. Escolha quem fica:
              </div>
              <div className="flex gap-1 mt-2">
                {conflict.map((id) => {
                  const k = CABOS.find((x) => x.id === id);
                  return (
                    <button key={id} className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10.5 }} type="button">
                      {k.nome.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!caboId && !conflict && (
          <div className="mt-2 p-2 rounded flex items-start gap-2" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)" }}>
            <Icon name="AlertTriangle" size={12} className="t-danger mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-[11px] t-fg-muted">
              <b className="t-danger">Órfã</b> · sem cabo responsável há 8 dias. Atribua abaixo ↓
            </div>
          </div>
        )}

        {c && !conflict && (
          <div className="mt-2 flex items-center gap-2 p-2 rounded" style={{ background: "var(--bg-page)" }}>
            <div
              className="flex items-center justify-center font-bold"
              style={{ width: 28, height: 28, borderRadius: 99, background: c.cor, color: "#fff", fontSize: 11 }}
            >
              {c.nome.split(" ").map((x) => x[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold t-fg-strong truncate">{c.nome}</div>
              <div className="text-[10px] t-fg-dim">Cabo · tier {c.tier} · score {c.score}</div>
            </div>
          </div>
        )}
      </div>

      {caboId && (
        <div className="p-5 grid grid-cols-3 gap-3" style={{ borderBottom: "1px solid var(--rule)" }}>
          <MiniStat label="Cobertura" value={`${Math.round(p.cobertura * 100)}%`} color={p.cobertura >= 0.6 ? "var(--ok)" : "var(--warn)"} />
          <MiniStat label="Conversão" value={`${Math.round(p.conversao * 100)}%`} color={p.conversao >= 0.6 ? "var(--ok)" : "var(--warn)"} />
          <MiniStat label="Hoje" value={`${p.feitoHoje}v`} />
        </div>
      )}

      <div className="p-5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Checklist porta-a-porta</div>
          <div className="text-[10px] t-fg-dim tnum">
            {CHECKLIST_MOCK.filter((x) => x.status === "done").length}/{CHECKLIST_MOCK.length}
          </div>
        </div>
        <div className="space-y-1.5">
          {CHECKLIST_MOCK.map((it, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] py-1">
              <span
                className="inline-flex items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  width: 16, height: 16,
                  background: it.status === "done" ? "var(--ok)" : it.status === "partial" ? "var(--warn)" : "var(--rule)",
                  color: it.status === "pending" ? "var(--fg-dim)" : "#fff",
                }}
              >
                {it.status === "done" && "✓"}
                {it.status === "partial" && "½"}
              </span>
              <span className={`flex-1 ${it.status === "pending" ? "t-fg-dim" : "t-fg"}`}>{it.label}</span>
              {it.status !== "pending" && <span className="text-[9.5px] t-fg-dim font-mono">hoje</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="p-5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Eleitores cadastrados · {ELEITORES_MOCK.length}</div>
          <button className="btn-ghost" style={{ padding: "3px 7px", fontSize: 10 }} type="button">
            <Icon name="Plus" size={10} />Novo
          </button>
        </div>
        <div className="space-y-1.5">
          {ELEITORES_MOCK.map((e, i) => (
            <div key={i} className="flex items-center gap-2 py-1 text-[11px]">
              <span className="flex-1 t-fg-strong truncate">{e.nome}</span>
              <span className="t-fg-dim tnum">{e.idade} anos</span>
              <span
                className={`chip ${
                  e.status === "confirmado" ? "chip-green" :
                  e.status === "pendente"   ? "chip-amber" : "chip-blue"
                }`}
                style={{ height: 16, fontSize: 9 }}
              >
                {e.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!caboId && !conflict && (
        <div className="p-5 space-y-2">
          <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-2">Atribuir a</div>
          {CABOS.map((k) => (
            <button
              key={k.id}
              className="w-full flex items-center gap-2 px-3 py-2 rounded"
              style={{ background: "var(--rule)" }}
              type="button"
            >
              <div style={{ width: 8, height: 8, borderRadius: 99, background: k.cor }} />
              <span className="text-[11.5px] font-semibold t-fg-strong flex-1 text-left">{k.nome}</span>
              <span className="text-[10px] t-fg-dim">
                {Object.values(owners).filter((v) => v === k.id).length} q.
              </span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

function CaboPanel({ caboId, owners }) {
  const c = CABOS.find((x) => x.id === caboId);
  const quadras = Object.entries(owners)
    .filter(([, v]) => v === caboId)
    .map(([k]) => QUADRAS_BASE.find((x) => x.id === k))
    .filter(Boolean);
  const domicilios = quadras.reduce((s, q) => s + q.domicilios, 0);
  const avgConv = quadras.reduce((s, q) => s + perfFor(q.id, owners).conversao, 0) / (quadras.length || 1);

  return (
    <aside className={drawerClass()} style={drawerStyle()}>
      <div className="p-5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex items-center justify-center font-bold"
            style={{ width: 44, height: 44, borderRadius: 99, background: c.cor, color: "#fff", fontSize: 14 }}
          >
            {c.nome.split(" ").map((x) => x[0]).slice(0, 2).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold">Cabo eleitoral</div>
            <div className="text-[17px] font-black font-display t-fg-strong leading-tight truncate">{c.nome}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`chip ${c.tier === "ouro" ? "chip-amber" : c.tier === "prata" ? "chip-muted" : "chip-red"}`}
                style={{ height: 16, fontSize: 9 }}
              >
                tier {c.tier}
              </span>
              <span className="chip chip-blue" style={{ height: 16, fontSize: 9 }}>score {c.score}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" style={{ justifyContent: "center", fontSize: 11 }} type="button">
            <Icon name="User" size={11} />Ligar
          </button>
          <button className="btn-ghost flex-1" style={{ justifyContent: "center", fontSize: 11 }} type="button">
            <Icon name="Bell" size={11} />Chat
          </button>
        </div>
      </div>

      <div className="p-5 grid grid-cols-2 gap-3" style={{ borderBottom: "1px solid var(--rule)" }}>
        <MiniStat label="Quadras" value={quadras.length} />
        <MiniStat label="Domicílios" value={domicilios.toLocaleString("pt-BR")} />
        <MiniStat
          label="Visitas hoje"
          value={`${c.visitasHoje}/${c.metaHoje}`}
          color={c.visitasHoje / c.metaHoje >= 0.7 ? "var(--ok)" : "var(--warn)"}
        />
        <MiniStat
          label="Conversão"
          value={`${Math.round(avgConv * 100)}%`}
          color={avgConv >= 0.6 ? "var(--ok)" : "var(--warn)"}
        />
      </div>

      <div className="p-5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-2">Próximo ponto de visita</div>
        <div className="flex items-center gap-3 p-3 rounded" style={{ background: "var(--bg-page)" }}>
          <div
            className="flex items-center justify-center"
            style={{ width: 36, height: 36, borderRadius: 8, background: c.cor, color: "#fff" }}
          >
            <Icon name="MapPin" size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold t-fg-strong">{quadras[0]?.rua || "-"}</div>
            <div className="text-[10.5px] t-fg-dim">Quadra {quadras[0]?.id} · em 12 min</div>
          </div>
          <div className="text-[11px] font-mono tnum t-fg-strong">14:30</div>
        </div>
      </div>

      <div className="p-5">
        <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-2">
          Quadras sob responsabilidade · {quadras.length}
        </div>
        <div className="space-y-1">
          {quadras.map((q) => {
            const p = perfFor(q.id, owners);
            return (
              <div key={q.id} className="flex items-center gap-2 py-1 text-[11px]">
                <span className="font-mono t-fg-dim font-bold w-8">{q.id}</span>
                <span className="flex-1 truncate t-fg-strong">{q.rua}</span>
                <div className="w-14">
                  <ProgressBar value={p.cobertura * 100} color={c.cor} />
                </div>
                <span className="tnum t-fg-muted w-9 text-right">{Math.round(p.cobertura * 100)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function AssignPanel({ lassoSet, owners, onAssign, onClose }) {
  const ids = [...lassoSet];
  const totalDom = ids.reduce((s, id) => {
    const q = QUADRAS_BASE.find((x) => x.id === id);
    return s + (q?.domicilios || 0);
  }, 0);

  return (
    <aside className={drawerClass()} style={drawerStyle()}>
      <div className="p-5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-0.5">Nova sub-área</div>
            <div className="text-[20px] font-black font-display t-fg-strong leading-tight">{ids.length} quadras</div>
            <div className="text-[11px] t-fg-muted mt-0.5">
              {totalDom.toLocaleString("pt-BR")} domicílios · ~{Math.round(totalDom * 2.2).toLocaleString("pt-BR")} eleitores estimados
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: "5px 7px" }} type="button">
            <Icon name="X" size={11} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {ids.slice(0, 12).map((id) => (
            <span
              key={id}
              className="font-mono text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "var(--rule)", color: "var(--fg-muted)" }}
            >
              {id}
            </span>
          ))}
          {ids.length > 12 && <span className="text-[10px] t-fg-dim">+{ids.length - 12}</span>}
        </div>
      </div>

      <div className="p-5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold mb-2">Atribuir para</div>
        <div className="space-y-1.5">
          {CABOS.map((c) => {
            const current = Object.values(owners).filter((v) => v === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => onAssign(c.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded"
                style={{ background: "var(--rule)" }}
                type="button"
              >
                <div style={{ width: 10, height: 10, borderRadius: 99, background: c.cor }} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[12px] font-semibold t-fg-strong">{c.nome}</div>
                  <div className="text-[10px] t-fg-dim">
                    atualmente {current} quadras · +{ids.length} = <b className="t-fg-strong">{current + ids.length}</b>
                  </div>
                </div>
                <span className={`chip ${c.tier === "ouro" ? "chip-amber" : "chip-muted"}`} style={{ height: 16, fontSize: 9 }}>
                  {c.tier}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5">
        <button className="btn-ghost w-full" style={{ justifyContent: "center" }} onClick={onClose} type="button">
          Cancelar seleção
        </button>
      </div>
    </aside>
  );
}
