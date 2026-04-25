"use client";

/* Modulo IA Assistente - adaptado de designer/platform-lote4.jsx ModuleIA. */

import { useState } from "react";
import { Icon } from "../Icon";
import { IA_CONVERSA, IA_SUGESTOES } from "../data";
import { API, ApiError } from "../api";

export function IA() {
  const [msgs, setMsgs] = useState(IA_CONVERSA);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const q = input.trim();
    if (!q || sending) return;
    const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setMsgs((prev) => [...prev, { role: "user", msg: q, t: hora }]);
    setInput("");
    setSending(true);
    try {
      const historico = msgs.map((m) => ({ role: m.role, content: m.msg }));
      historico.push({ role: "user", content: q });
      const res = await API.iaChat({ pergunta: q, historico });
      const assistantMsg = res?.resposta || res?.answer || res?.message || "Sem resposta.";
      setMsgs((prev) => [...prev, { role: "assistant", msg: assistantMsg, t: "agora" }]);
    } catch (err) {
      const texto =
        err instanceof ApiError && (err.status === 401 || err.status === 403)
          ? "Sessão expirada. Faça login para conversar com a IA."
          : "Não consegui responder agora. Tente novamente em instantes.";
      setMsgs((prev) => [...prev, { role: "assistant", msg: texto, t: "agora" }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-page-grad" style={{ height: "100%" }}>
      <div className="max-w-[1200px] mx-auto h-full flex flex-col px-8 py-7">
        <div className="mb-4">
          <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">IA Assistente</div>
          <h1 className="text-[28px] font-display font-bold t-fg-strong mt-1 leading-none">
            <span
              style={{
                background: "linear-gradient(90deg, var(--tenant-primary), var(--accent-blue-strong))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Mazzel AI
            </span>
            {" "}· Sua copiloto política
          </h1>
        </div>

        <div className="flex-1 t-bg-card ring-soft rounded-xl overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, var(--tenant-primary), var(--accent-blue-strong))" }}
                  >
                    <Icon name="Sparkles" size={14} className="text-white" stroke={2.2} />
                  </div>
                )}
                <div className={`max-w-[76%] ${m.role === "user" ? "order-1" : ""}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${m.role === "user" ? "ring-tenant" : "ring-soft"}`}
                    style={{
                      background: m.role === "user" ? "rgba(var(--tenant-primary-rgb), 0.12)" : "var(--bg-card-2)",
                      color: "var(--fg)",
                    }}
                  >
                    {m.msg}
                    {m.citations && (
                      <div className="mt-3 space-y-1.5 text-[12px]">
                        {m.citations.map((c, j) => (
                          <div key={j} className="flex items-start gap-2">
                            <span className="chip chip-blue" style={{ height: 18, fontSize: 9 }}>{c.ref}</span>
                            <span className="t-fg-muted flex-1">{c.texto}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {m.followup && <div className="mt-3 text-[12px] t-fg italic">{m.followup}</div>}
                  </div>
                  <div className={`text-[10px] t-fg-dim mt-1 ${m.role === "user" ? "text-right" : ""}`}>{m.t}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t" style={{ borderColor: "var(--rule)" }}>
            <div className="text-[10px] t-fg-dim uppercase tracking-wider font-semibold mb-2">Sugestões</div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {IA_SUGESTOES.slice(0, 4).map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s.titulo)}
                  className="btn-ghost text-left"
                  style={{ padding: "6px 10px", fontSize: 11.5 }}
                  type="button"
                >
                  <Icon name={s.icon} size={11} />{s.titulo}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg ring-soft" style={{ background: "var(--bg-card-2)" }}>
              <Icon name="Sparkles" size={14} className="t-tenant" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Pergunte qualquer coisa sobre a base política nacional..."
                className="flex-1 bg-transparent outline-none text-[13px] t-fg placeholder:t-fg-dim"
              />
              <button
                onClick={send}
                disabled={sending}
                className="btn-primary"
                style={{ padding: "6px 14px", fontSize: 11, opacity: sending ? 0.5 : 1 }}
                type="button"
              >
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
