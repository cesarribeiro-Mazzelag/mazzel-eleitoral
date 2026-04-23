"use client";

import { useState } from "react";
import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { Sparkles } from "lucide-react";
import { IA_SUGESTOES, IA_CONVERSA } from "@/components/mazzel-data/mock";
import { useIASugestoes, useIAChat } from "@/hooks/useIA";

// Icon map para sugestoes
const ICON_COMPONENTS = {
  Target: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Sparkles: () => <Sparkles size={11} />,
  BarChart3: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
    </svg>
  ),
  MapPin: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  FileSearch: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>
      <circle cx="11" cy="16" r="2"/><path d="m13 18 2 2"/>
    </svg>
  ),
};

function IAContent() {
  const [input, setInput] = useState("");

  // Sugestoes da API
  const { sugestoes: sugestoesApi, isMock: isMockSugestoes } = useIASugestoes();
  const sugestoes = isMockSugestoes || sugestoesApi.length === 0
    ? IA_SUGESTOES
    : sugestoesApi.map(s => ({ titulo: s, icon: "Sparkles" }));

  // Chat com historico
  const { msgs, enviar, loading: loadingIA } = useIAChat(IA_CONVERSA);

  function send() {
    if (!input.trim() || loadingIA) return;
    enviar(input);
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div style={{ height: "calc(100vh - 48px)", background: "var(--mz-bg-page)" }}>
      <div className="max-w-[1200px] mx-auto h-full flex flex-col px-8 py-7">
        <div className="mb-4">
          <div className="text-[11px] mz-t-fg-dim tracking-[0.18em] uppercase font-semibold">IA Assistente</div>
          <h1 className="text-[28px] font-bold mz-t-fg-strong mt-1 leading-none">
            <span style={{ background: "linear-gradient(90deg, var(--mz-tenant-primary), #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Mazzel AI
            </span>
            {" · "}Sua copiloto politica
          </h1>
        </div>

        <div className="flex-1 mz-ring-soft rounded-xl overflow-hidden flex flex-col min-h-0" style={{ background: "var(--mz-bg-card)" }}>
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, var(--mz-tenant-primary), #60a5fa)" }}>
                    <Sparkles size={14} color="white" strokeWidth={2.2}/>
                  </div>
                )}
                <div className={`max-w-[76%] ${m.role === "user" ? "order-1" : ""}`}>
                  <div className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed mz-ring-soft`}
                    style={{
                      background: m.role === "user" ? "rgba(var(--mz-tenant-primary-rgb), 0.12)" : "var(--mz-bg-card-2)",
                      color: "var(--mz-fg)"
                    }}>
                    {m.msg}
                    {m.citations && (
                      <div className="mt-3 space-y-1.5 text-[12px]">
                        {m.citations.map((c, j) => (
                          <div key={j} className="flex items-start gap-2">
                            <span className="mz-chip mz-chip-blue w-fit" style={{ height: 18, fontSize: 9 }}>{c.ref}</span>
                            <span className="mz-t-fg-muted flex-1">{c.texto}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {m.followup && (
                      <div className="mt-3 text-[12px] mz-t-fg italic">{m.followup}</div>
                    )}
                  </div>
                  <div className={`text-[10px] mz-t-fg-dim mt-1 ${m.role === "user" ? "text-right" : ""}`}>{m.t}</div>
                </div>
              </div>
            ))}
            {loadingIA && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--mz-tenant-primary), #60a5fa)" }}>
                  <Sparkles size={14} color="white" strokeWidth={2.2}/>
                </div>
                <div className="rounded-2xl px-4 py-3 text-[13px] mz-ring-soft" style={{ background: "var(--mz-bg-card-2)", color: "var(--mz-fg-dim)" }}>
                  Analisando...
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t" style={{ borderColor: "var(--mz-rule)" }}>
            <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold mb-2">Sugestoes</div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {sugestoes.slice(0, 4).map((s, i) => {
                const IconComp = ICON_COMPONENTS[s.icon] || ICON_COMPONENTS.Sparkles;
                return (
                  <button key={i} onClick={() => setInput(s.titulo)}
                    className="mz-btn-ghost text-left flex items-center gap-1" style={{ padding: "6px 10px", fontSize: 11.5 }}>
                    <IconComp />{s.titulo}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg mz-ring-soft" style={{ background: "var(--mz-bg-card-2)" }}>
              <Sparkles size={14} style={{ color: "var(--mz-tenant-primary)" }}/>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte qualquer coisa sobre a base politica nacional..."
                className="flex-1 bg-transparent outline-none text-[13px] mz-t-fg placeholder:mz-t-fg-dim"
                disabled={loadingIA}
              />
              <button onClick={send} disabled={loadingIA || !input.trim()} className="mz-btn-primary" style={{ padding: "6px 14px", fontSize: 11 }}>
                {loadingIA ? "..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IAPage() {
  return (
    <MazzelLayout activeModule="ia" breadcrumbs={["Uniao Brasil", "IA Assistente"]} alertCount={12}>
      <IAContent />
    </MazzelLayout>
  );
}
