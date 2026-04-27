"use client";

/* Modulo Documentos - Designer V1.2 F4 03. */

import { useState } from "react";
import { Icon } from "../Icon";
import { DOCUMENTOS_KPIS, DIRETORIO_DOCUMENTOS } from "../data";

const TABS = [
  { k: "pend",  l: "DocuSign Pendentes", num: 12, kind: "warn" },
  { k: "vig",   l: "Vigentes",            num: 19 },
  { k: "venc",  l: "Vencendo",            num: 3,  kind: "warn" },
  { k: "sigil", l: "Sigilosos",           num: 2 },
  { k: "rasc",  l: "Rascunhos",           num: 2 },
];

const STATUS_COLOR = {
  ok:   { bg: "rgba(34,197,94,0.12)",  fg: "#16a34a" },
  warn: { bg: "rgba(245,158,11,0.12)", fg: "#d97706" },
};

export function Documentos() {
  const [tab, setTab] = useState("vig");

  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1400px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">Documentos</div>
            <h1 className="text-[28px] font-display font-bold t-fg-strong mt-1 leading-none">Acervo digital · UB</h1>
            <div className="text-[13px] t-fg-muted mt-1.5">Estatuto, atas, resoluções, procurações, contratos · DocuSign integrado</div>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" type="button"><Icon name="Filter" size={13} />Filtrar</button>
            <button className="btn-primary" type="button"><Icon name="Plus" size={13} />Novo documento</button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {DOCUMENTOS_KPIS.map((k) => (
            <div key={k.l} className="rounded-md p-3.5" style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}>
              <div className="text-[9.5px] t-fg-faint uppercase tracking-[0.16em] font-bold">{k.l}</div>
              <div
                className="text-[28px] font-bold tabular-nums leading-none mt-1"
                style={{ color: k.kind === "warn" ? "var(--mz-warn, #d97706)" : "var(--fg-strong)" }}
              >
                {k.v}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 p-0.5 rounded-md mb-4 inline-flex" style={{ background: "var(--bg-card)" }}>
          {TABS.map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => setTab(t.k)}
              className={`btn-ghost ${tab === t.k ? "active" : ""} flex items-center gap-1.5`}
              style={{ padding: "6px 12px", fontSize: 11.5 }}
            >
              {t.l}
              <span
                className="text-[9.5px] tabular-nums px-1.5 py-[1px] rounded"
                style={{
                  background: t.kind === "warn" ? "rgba(245,158,11,0.20)" : "var(--bg-card-2)",
                  color: t.kind === "warn" ? "#d97706" : "var(--fg-muted)",
                }}
              >
                {t.num}
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-lg overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}>
          {DIRETORIO_DOCUMENTOS.map((d, i) => {
            const sc = STATUS_COLOR[d.status_kind] || STATUS_COLOR.ok;
            return (
              <div
                key={i}
                className="grid items-center gap-3 px-4 py-3 border-b last:border-0"
                style={{ gridTemplateColumns: "40px 1fr auto auto", borderColor: "var(--rule)" }}
              >
                <div
                  className="w-10 h-12 rounded flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "var(--bg-card-2)", color: "var(--fg-muted)" }}
                >
                  {d.ico}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold t-fg-strong truncate">{d.nome}</div>
                  <div className="text-[11px] t-fg-muted truncate">{d.sub}</div>
                </div>
                <span
                  className="text-[10px] font-bold tracking-wider px-2 py-[3px] rounded"
                  style={{ background: sc.bg, color: sc.fg }}
                >
                  {d.status}
                </span>
                <div className="flex gap-1">
                  <button className="btn-ghost" style={{ padding: "5px 8px" }} type="button">
                    <Icon name="Download" size={12} />
                  </button>
                  <button className="btn-ghost" style={{ padding: "5px 8px" }} type="button">
                    <Icon name="External" size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="mt-6 rounded-lg p-4 flex items-center gap-3 text-[12px] t-fg-muted"
          style={{ background: "var(--bg-card-2)", border: "1px dashed var(--rule)" }}
        >
          <Icon name="Sparkles" size={14} />
          <span>
            <b className="t-fg-strong">ETL pendente:</b> integração DocuSign API + scanner OCR + assinatura digital.
            Designer V1.2 entregou layout completo · próxima sprint backend conecta os 12 pendentes.
          </span>
        </div>
      </div>
    </div>
  );
}
