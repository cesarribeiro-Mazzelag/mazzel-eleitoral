"use client";

/* Modulo Diretórios & Comissões - Designer V1.2 F4 01.
 * Layout: árvore hierárquica esquerda + main com hero + 4 sections. */

import { useState } from "react";
import { Icon } from "../Icon";
import {
  DIRETORIOS_TREE,
  DIRETORIO_MESA,
  DIRETORIO_COMISSOES,
  DIRETORIO_DOCUMENTOS,
} from "../data";

const TABS = ["Diretório", "Comissões", "Atas", "Atos & Resoluções", "Histórico"];

const ROLE_COLOR = {
  "Pres.": "rgba(34,197,94,0.15)",
  "Vice":  "rgba(59,130,246,0.15)",
  "Tes.":  "rgba(251,191,36,0.15)",
  "Sec.":  "rgba(168,85,247,0.15)",
  "Adj.":  "rgba(161,161,170,0.10)",
};

const STATUS_COLOR = {
  ok:   { bg: "rgba(34,197,94,0.12)",  fg: "#16a34a" },
  warn: { bg: "rgba(245,158,11,0.12)", fg: "#d97706" },
};

function MemberCard({ m }) {
  return (
    <div
      className="grid items-center gap-3 px-3 py-2 rounded-md"
      style={{
        gridTemplateColumns: "32px 1fr auto",
        background: "var(--bg-card-2)",
        border: "1px solid var(--rule)",
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
        style={{ background: "linear-gradient(135deg, var(--tenant-primary), var(--tenant-primary-strong, var(--tenant-primary)))" }}
      >
        {m.av}
      </div>
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold t-fg-strong truncate">{m.nome}</div>
        <div className="text-[10.5px] t-fg-muted truncate">{m.sub}</div>
      </div>
      <span
        className="text-[10px] font-bold px-2 py-[2px] rounded"
        style={{ background: ROLE_COLOR[m.role] || "var(--rule)", color: "var(--fg-strong)" }}
      >
        {m.role}
      </span>
    </div>
  );
}

export function Diretorios() {
  const [tab, setTab] = useState("Diretório");

  return (
    <div className="bg-page-grad min-h-full grid" style={{ gridTemplateColumns: "260px 1fr", height: "calc(100vh - 48px)" }}>
      {/* Árvore esquerda */}
      <aside className="border-r overflow-y-auto" style={{ borderColor: "var(--rule)", background: "var(--bg-sidebar, var(--bg-card))" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--rule)" }}>
          <input
            type="text"
            placeholder="Buscar diretório, UF ou município..."
            className="w-full text-[12px] px-2.5 py-1.5 rounded outline-none"
            style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)", color: "var(--fg)" }}
          />
        </div>
        <div className="p-3">
          <h3 className="text-[10px] t-fg-faint tracking-[0.16em] uppercase font-bold mb-2 px-1">Hierarquia Estatutária</h3>
          {DIRETORIOS_TREE.map((node, i) => (
            <button
              key={i}
              type="button"
              className="w-full grid items-center gap-2 px-2 py-1.5 rounded text-left text-[12px] mb-0.5"
              style={{
                gridTemplateColumns: "12px 24px 1fr auto",
                background: node.active ? "var(--bg-card-2)" : "transparent",
                color: node.active ? "var(--fg-strong)" : "var(--fg-muted)",
                paddingLeft: node.lvl === "mun" ? 24 : node.lvl === "est" ? 12 : 4,
              }}
            >
              <span className="text-[8px] t-fg-faint">{node.expanded ? "▾" : "▸"}</span>
              <div
                className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: node.warn ? "var(--mz-warn, #d97706)" : "var(--tenant-primary)" }}
              >
                {node.icon}
              </div>
              <span className="truncate font-medium">{node.nome}</span>
              <span className="text-[9px] t-fg-faint tabular-nums">{node.total}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-8 py-6">
          {/* Crumb + tabs */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="text-[12px] t-fg-muted">
              Estatutário <span className="t-fg-faint">›</span> <b className="t-fg-strong">Brasil</b> <span className="t-fg-faint">›</span> <b className="t-fg-strong">SP</b> <span className="t-fg-faint">›</span> <b className="t-fg-strong">São Paulo (capital)</b>
            </div>
            <div className="flex gap-1 p-0.5 rounded-md" style={{ background: "var(--rule)" }}>
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`btn-ghost ${tab === t ? "active" : ""}`}
                  style={{ padding: "5px 12px", fontSize: 11.5 }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {tab !== "Diretório" ? (
            <div
              className="rounded-lg p-12 text-center"
              style={{ background: "var(--bg-card)", border: "1px dashed var(--rule)" }}
            >
              <div className="text-[40px] mb-3">📋</div>
              <h3 className="text-[16px] font-bold t-fg-strong mb-2">Aba "{tab}"</h3>
              <p className="text-[13px] t-fg-muted">Designer V1.2 entregou layout · port em construção. Por ora, abre a aba Diretório.</p>
            </div>
          ) : (
            <>
              {/* Hero */}
              <div
                className="rounded-lg p-6 mb-6 grid gap-6"
                style={{ background: "var(--bg-card)", border: "1px solid var(--rule)", gridTemplateColumns: "auto 1fr auto" }}
              >
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-[20px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, var(--tenant-primary), var(--tenant-primary-strong, var(--tenant-primary)))" }}
                >
                  SP
                </div>
                <div className="min-w-0">
                  <h1 className="text-[24px] font-display font-bold t-fg-strong leading-tight">Diretório Municipal · São Paulo Capital</h1>
                  <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                    <span className="px-2 py-1 rounded font-semibold" style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a" }}>✓ Estatuto vigente</span>
                    <span className="px-2 py-1 rounded" style={{ background: "var(--bg-card-2)", color: "var(--fg-muted)" }}>Mandato: <b className="t-fg-strong">2024 — 2028</b></span>
                    <span className="px-2 py-1 rounded" style={{ background: "var(--bg-card-2)", color: "var(--fg-muted)" }}>Pres: <b className="t-fg-strong">Milton Leite</b></span>
                    <span className="px-2 py-1 rounded" style={{ background: "var(--bg-card-2)", color: "var(--fg-muted)" }}>TSE: <b className="t-fg-strong">regular</b></span>
                  </div>
                  <div className="grid grid-cols-5 gap-4 mt-4">
                    {[
                      { l: "Membros eleitos", v: "96" },
                      { l: "Comissões ativas", v: "14" },
                      { l: "Suplentes", v: "28" },
                      { l: "Filiados ativos", v: "124k" },
                      { l: "Mandatários", v: "147" },
                    ].map((s) => (
                      <div key={s.l}>
                        <div className="text-[9px] t-fg-faint uppercase tracking-[0.14em] font-bold">{s.l}</div>
                        <div className="text-[20px] font-bold t-fg-strong tabular-nums">{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button className="btn-primary text-[11.5px]" type="button">+ Convocar Reunião</button>
                  <button className="btn-ghost text-[11.5px]" type="button">+ Nova Comissão</button>
                  <button className="btn-ghost text-[11.5px]" type="button"><Icon name="Download" size={11} />Exportar PDF</button>
                </div>
              </div>

              {/* Mesa Diretora */}
              <section className="mb-6">
                <h2 className="text-[15px] font-bold t-fg-strong mb-3 flex items-center gap-2">
                  Mesa Diretora · Pres. Municipal
                  <span className="text-[10px] t-fg-faint tracking-[0.10em] uppercase font-semibold">{DIRETORIO_MESA.length} cargos</span>
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {DIRETORIO_MESA.map((m) => (
                    <MemberCard key={m.av} m={m} />
                  ))}
                </div>
              </section>

              {/* Comissões */}
              <section className="mb-6">
                <h2 className="text-[15px] font-bold t-fg-strong mb-3 flex items-center gap-2">
                  Comissões Setoriais
                  <span className="text-[10px] t-fg-faint tracking-[0.10em] uppercase font-semibold">{DIRETORIO_COMISSOES.length} ativas</span>
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {DIRETORIO_COMISSOES.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-md p-3.5"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-[11px] font-bold text-white"
                          style={{ background: "var(--tenant-primary)" }}
                        >
                          {c.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-semibold t-fg-strong truncate">{c.nome}</div>
                          <div className="text-[10.5px] t-fg-faint">{c.ocupacao} ocupados</div>
                        </div>
                      </div>
                      <div className="text-[11px] t-fg-muted">Coord: <b className="t-fg-strong">{c.coord}</b></div>
                      {c.vaga > 0 && (
                        <div className="text-[10px] mt-1 font-semibold" style={{ color: "var(--mz-warn, #d97706)" }}>
                          ⚠ {c.vaga} vaga{c.vaga > 1 ? "s" : ""} em aberto
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Documentos */}
              <section>
                <h2 className="text-[15px] font-bold t-fg-strong mb-3 flex items-center gap-2">
                  Documentos Estatutários
                  <span className="text-[10px] t-fg-faint tracking-[0.10em] uppercase font-semibold">{DIRETORIO_DOCUMENTOS.length} docs</span>
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {DIRETORIO_DOCUMENTOS.map((d, i) => {
                    const sc = STATUS_COLOR[d.status_kind] || STATUS_COLOR.ok;
                    return (
                      <div
                        key={i}
                        className="rounded-md p-3 grid items-center gap-2.5"
                        style={{ gridTemplateColumns: "32px 1fr auto", background: "var(--bg-card)", border: "1px solid var(--rule)" }}
                      >
                        <div
                          className="w-8 h-9 rounded flex items-center justify-center text-[9px] font-bold"
                          style={{ background: "var(--bg-card-2)", color: "var(--fg-muted)" }}
                        >
                          {d.ico}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11.5px] font-semibold t-fg-strong truncate">{d.nome}</div>
                          <div className="text-[10px] t-fg-muted truncate">{d.sub}</div>
                        </div>
                        <span
                          className="text-[9px] font-bold tracking-wider px-1.5 py-[2px] rounded"
                          style={{ background: sc.bg, color: sc.fg }}
                        >
                          {d.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
