"use client";

/* Campanha 2026 · Tela 7 · Chat.
 * Adaptado de Plataforma-v2.html Tela7Chat - versao enxuta (sem anti-screenshot).
 * Canais + conversa + composer + modo furtivo visual (watermark + burn timer). */

import { useState, useEffect, useMemo } from "react";
import { Icon } from "../../Icon";
import { Avatar } from "./primitives";
import { CHAT_CANAIS, CHAT_MENSAGENS } from "./data";

function MensagemBubble({ m }) {
  const bubbleStyle = m.me
    ? { background: "rgba(var(--tenant-primary-rgb),0.18)", color: "var(--fg-strong)" }
    : { background: "var(--bg-card)", color: "var(--fg)" };
  return (
    <div className={`flex gap-2 ${m.me ? "justify-end" : "justify-start"}`}>
      {!m.me && <Avatar nome={m.autor} size={26} />}
      <div className={m.me ? "text-right" : ""} style={{ maxWidth: "75%" }}>
        {!m.me && (
          <div className="text-[10px] t-fg-dim font-semibold mb-0.5">
            {m.autor} · <span className="t-fg-faint">{m.papel}</span>
          </div>
        )}
        <div
          className="rounded-2xl px-3 py-2 text-[13px] ring-soft"
          style={{ ...bubbleStyle, textAlign: "left" }}
        >
          {m.msg || m.texto}
          {m.anexo && (
            <div
              className="mt-2 px-2.5 py-2 rounded-md flex items-center gap-2 text-[10.5px]"
              style={{ background: m.me ? "rgba(255,255,255,0.08)" : "var(--bg-card-2)" }}
            >
              <Icon name="FileText" size={11} /> {m.anexo}
            </div>
          )}
        </div>
        <div className={`text-[9.5px] t-fg-faint mt-0.5 flex items-center gap-1 ${m.me ? "justify-end" : ""}`}>
          <span>{m.hora || m.t}</span>
          {m.me && <Icon name="Check" size={9} className={m.status === "lido" ? "t-ok" : "t-fg-faint"} />}
        </div>
      </div>
    </div>
  );
}

function Watermark({ tag }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden select-none">
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(-30deg, transparent 0, transparent 140px, rgba(217,119,6,0.06) 140px, rgba(217,119,6,0.06) 142px)",
        }}
      />
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-[10px] font-mono whitespace-nowrap"
          style={{
            top: `${(i % 6) * 18}%`,
            left: `${(i * 37) % 100}%`,
            transform: "rotate(-30deg)",
            color: "rgba(217,119,6,0.18)",
          }}
        >
          {tag}
        </div>
      ))}
    </div>
  );
}

export function Tela7Chat() {
  const [canalId, setCanalId] = useState(CHAT_CANAIS[0].id);
  const [furtivo, setFurtivo] = useState(CHAT_CANAIS[0].furtivo);
  const [burnSeconds, setBurnSeconds] = useState(30);
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState("");

  const canal = useMemo(
    () => CHAT_CANAIS.find((c) => c.id === canalId) || CHAT_CANAIS[0],
    [canalId],
  );

  useEffect(() => {
    setMsgs(CHAT_MENSAGENS[canal.id] || []);
    setFurtivo(!!canal.furtivo);
  }, [canal.id, canal.furtivo]);

  // Burn timer: remove mensagens expiradas a cada 500ms
  useEffect(() => {
    if (!furtivo) return;
    const t = setInterval(() => {
      setMsgs((prev) => prev.filter((m) => !m.expireAt || m.expireAt > Date.now()));
    }, 500);
    return () => clearInterval(t);
  }, [furtivo]);

  const enviar = () => {
    const q = texto.trim();
    if (!q) return;
    const novo = {
      id: "L" + Date.now(),
      autor: "Você",
      papel: "Operador",
      me: true,
      texto: q,
      hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      status: "enviado",
      expireAt: furtivo ? Date.now() + burnSeconds * 1000 : null,
    };
    setMsgs((m) => [...m, novo]);
    setTexto("");
  };

  const userTag = `OP-${((Math.random() * 9999) | 0).toString().padStart(4, "0")} · ${new Date().toLocaleDateString("pt-BR")}`;

  return (
    <div
      className="flex relative"
      style={{ background: "var(--bg-page-2)", height: "calc(100vh - 48px - 44px)" }}
    >
      {furtivo && <Watermark tag={userTag} />}

      {/* canais */}
      <aside
        className="flex-shrink-0 overflow-y-auto flex flex-col"
        style={{ width: 300, borderRight: "1px solid var(--rule)", background: "var(--bg-card)" }}
      >
        <div className="p-4" style={{ borderBottom: "1px solid var(--rule)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Icon name="Crown" size={14} style={{ color: "var(--tenant-primary)" }} />
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-bold t-fg-strong">Canais seguros</div>
              <div className="text-[10px] t-fg-dim">E2E · burn-after-read</div>
            </div>
            <button className="btn-ghost" style={{ padding: "5px 7px" }} type="button">
              <Icon name="Plus" size={11} />
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 h-[30px] rounded-md" style={{ background: "var(--rule)" }}>
            <Icon name="Search" size={11} className="t-fg-dim" />
            <input
              placeholder="Buscar canal..."
              className="flex-1 bg-transparent outline-none text-[11.5px]"
              style={{ color: "var(--fg)" }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {CHAT_CANAIS.map((c) => {
            const active = canalId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setCanalId(c.id)}
                className="px-4 py-3 cursor-pointer"
                style={{
                  background: active ? "var(--rule-strong)" : "transparent",
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  {c.furtivo && (
                    <Icon name="AlertTriangle" size={10} style={{ color: "var(--warn)" }} />
                  )}
                  <div className="text-[12px] font-semibold t-fg-strong flex-1 truncate">{c.nome}</div>
                  <div className="text-[9.5px] t-fg-dim">{c.ultima}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[11px] t-fg-muted flex-1 truncate">
                    {c.furtivo ? (
                      <span className="italic t-fg-faint">Mensagem protegida</span>
                    ) : (
                      c.preview
                    )}
                  </div>
                  {c.unread > 0 && (
                    <span
                      className="chip chip-red"
                      style={{ height: 16, minWidth: 16, justifyContent: "center", fontSize: 9.5 }}
                    >
                      {c.unread}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="chip chip-muted" style={{ height: 15, fontSize: 9 }}>
                    {c.tipo.toUpperCase()}
                  </span>
                  <span className="text-[9.5px] t-fg-faint">
                    · {c.membros} membros · {c.classificacao}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* conversa */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div
          className="flex items-center gap-3 px-5 h-[56px] flex-shrink-0"
          style={{ borderBottom: "1px solid var(--rule)", background: "var(--bg-card)" }}
        >
          <div
            className="rounded-md flex items-center justify-center"
            style={{
              width: 36, height: 36,
              background: furtivo ? "var(--warn)" : "var(--tenant-primary)",
              color: "#fff",
            }}
          >
            <Icon name={furtivo ? "AlertTriangle" : canal.tipo === "direto" ? "User" : "Users"} size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-[13px] font-bold t-fg-strong">{canal.nome}</div>
              {furtivo && (
                <span className="chip chip-amber" style={{ height: 18, fontSize: 9 }}>
                  <Icon name="AlertTriangle" size={9} />FURTIVO · burn {burnSeconds}s
                </span>
              )}
              <span className="chip chip-muted" style={{ height: 18, fontSize: 9 }}>
                {canal.classificacao.toUpperCase()}
              </span>
            </div>
            <div className="text-[10.5px] t-fg-dim">
              {canal.membros} membros · identidade: {userTag.split(" · ")[0]}
            </div>
          </div>
          {furtivo && (
            <select
              value={burnSeconds}
              onChange={(e) => setBurnSeconds(Number(e.target.value))}
              className="text-[11px] rounded px-2 py-1"
              style={{ background: "var(--rule)", color: "var(--fg)", border: "1px solid var(--rule-strong)" }}
            >
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1min</option>
              <option value={3600}>1h</option>
            </select>
          )}
          <button
            className="btn-ghost"
            onClick={() => setFurtivo(!furtivo)}
            title="Modo furtivo (burn-after-read)"
            type="button"
          >
            <Icon name={furtivo ? "X" : "Check"} size={11} />
            {furtivo ? "Furtivo ON" : "Furtivo OFF"}
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 py-5 space-y-3 relative"
          style={{ background: "var(--bg-page-2)" }}
        >
          <div className="flex justify-center mb-4">
            <div
              className="px-3 py-1.5 rounded-full text-[10.5px] flex items-center gap-1.5"
              style={{
                background: "rgba(217,119,6,0.1)",
                color: "var(--warn)",
                border: "1px solid rgba(217,119,6,0.25)",
              }}
            >
              <Icon name="AlertTriangle" size={10} />
              {furtivo
                ? "Furtivo ATIVO · mensagens se autodestroem · paste bloqueado · blur alerta a sala"
                : "Conversa cifrada ponta-a-ponta · log de auditoria apenas em acesso judicial"}
            </div>
          </div>
          {msgs.map((m, i) => {
            const restaMs = m.expireAt ? m.expireAt - Date.now() : null;
            const restaS = restaMs !== null ? Math.max(0, Math.ceil(restaMs / 1000)) : null;
            return (
              <div key={m.id || i} className="relative">
                <MensagemBubble m={m} />
                {restaS !== null && (
                  <div
                    className={`absolute ${m.me ? "right-0" : "left-0"} -top-1 rounded-full flex items-center justify-center text-[9px] font-bold`}
                    style={{
                      width: 20, height: 20,
                      background: restaS < 5 ? "var(--danger)" : "var(--warn)",
                      color: "#fff",
                    }}
                  >
                    {restaS}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="flex-shrink-0 px-5 py-3"
          style={{ borderTop: "1px solid var(--rule)", background: "var(--bg-card)" }}
        >
          {furtivo && (
            <div
              className="mb-2 px-3 py-1.5 rounded-md text-[10.5px] flex items-center gap-2"
              style={{
                background: "rgba(217,119,6,0.08)",
                color: "var(--warn)",
                border: "1px solid rgba(217,119,6,0.2)",
              }}
            >
              <Icon name="AlertTriangle" size={10} />
              Modo furtivo: mensagem expira em {burnSeconds}s · selecionar texto desabilitado
            </div>
          )}
          <div className="flex items-end gap-2">
            <button className="btn-ghost" style={{ padding: 8 }} type="button">
              <Icon name="Download" size={12} />
            </button>
            <textarea
              rows={1}
              placeholder={furtivo ? "Mensagem furtiva (autodestrói após leitura)..." : "Escrever mensagem segura..."}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
              className="flex-1 resize-none rounded-md px-3 py-2 text-[12.5px] outline-none"
              style={{
                background: "var(--rule)",
                color: "var(--fg)",
                minHeight: 36, maxHeight: 120,
              }}
            />
            <button className="btn-primary" onClick={enviar} style={{ padding: "8px 14px" }} type="button">
              <Icon name="ArrowRight" size={12} />Enviar
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] t-fg-dim">
            <div>
              {furtivo
                ? "⚠ Mensagens desta sessão não serão armazenadas após expirar"
                : `Delegado → ${canal.nome} · membros vinculados à cerca`}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Icon name="Check" size={9} />E2E
              </span>
              <span className="flex items-center gap-1">
                <Icon name="Check" size={9} />LGPD
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
