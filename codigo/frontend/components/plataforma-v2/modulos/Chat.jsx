"use client";

/* Modulo Chat (3 modos) - Designer V1.2 F3 03-chat-evoluido.
 * Permanente · Sigiloso (E2EE) · SOS Cabo (escalada).
 *
 * Visual: 3-col (modes rail | conv list | chat). Mocks puros — backend de chat
 * ainda não existe. Em produção, sigiloso usa Signal protocol e SOS aciona PM. */

import { useState, useMemo } from "react";
import {
  CHAT_MODES,
  CHAT_FEATURES,
  CHAT_CONVERSATIONS,
  CHAT_MESSAGES,
} from "../data";

const MODE_THEME = {
  permanente: {
    bgRail:    "var(--bg-sidebar)",
    bgList:    "var(--bg-card)",
    bgChat:    "var(--bg-page)",
    bannerBg:  "transparent",
    bannerFg:  "transparent",
    headerBg:  "var(--bg-card)",
    sendBg:    "var(--tenant-primary)",
    sendFg:    "#fff",
    accent:    "var(--tenant-accent)",
  },
  sigiloso: {
    bgRail:    "#1a0033",
    bgList:    "#1a0033",
    bgChat:    "#0c0019",
    bannerBg:  "linear-gradient(90deg, #4c1d95, #6d28d9)",
    bannerFg:  "#fff",
    headerBg:  "#1a0033",
    sendBg:    "#7c3aed",
    sendFg:    "#fff",
    accent:    "#d8b4fe",
  },
  sos: {
    bgRail:    "#1a0808",
    bgList:    "#1a0808",
    bgChat:    "#0a0303",
    bannerBg:  "linear-gradient(90deg, #7f1d1d, #b91c1c)",
    bannerFg:  "#fff",
    headerBg:  "#1a0808",
    sendBg:    "#dc2626",
    sendFg:    "#fff",
    accent:    "#fca5a5",
  },
};

const BANNER_TEXT = {
  sigiloso: "🔒 MODO SIGILOSO · E2EE · Mensagens expiram em 24h · Print bloqueado · Watermark ativo",
  sos:      "🚨 SOS CABO · ESCALADO ATÉ ENCERRAMENTO · Coord + Jurídico + Segurança notificados · Localização em tempo real",
};

function ModeButton({ mode, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid items-center gap-2.5 rounded-md p-2.5 text-left transition-colors w-full"
      style={{
        gridTemplateColumns: "32px 1fr auto",
        background: active ? "var(--bg-card-2)" : "var(--bg-card)",
        border: `1px solid ${active ? "var(--tenant-accent)" : "var(--rule)"}`,
        color: "var(--fg)",
      }}
    >
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[14px]"
        style={{ background: "var(--bg-elevated, rgba(0,0,0,0.06))" }}
      >
        {mode.icon}
      </span>
      <div className="min-w-0">
        <div className="text-[12.5px] font-bold t-fg-strong leading-tight truncate">{mode.label}</div>
        <div className="text-[10.5px] t-fg-muted leading-tight truncate">{mode.sub}</div>
      </div>
      <span
        className="text-[9.5px] font-bold tabular-nums px-1.5 py-[1px] rounded-[3px]"
        style={{
          fontFamily: "JetBrains Mono, monospace",
          background: "var(--bg-elevated, rgba(0,0,0,0.06))",
          color: "var(--fg-faint)",
        }}
      >
        {mode.qty}
      </span>
    </button>
  );
}

function FeatureRow({ item }) {
  const isCrit = !!item.crit;
  const isOn = !!item.on;
  const ck = isCrit ? "!" : isOn ? "✓" : "—";
  const ckBg = isCrit
    ? "rgba(239,68,68,0.2)"
    : isOn
    ? "rgba(34,197,94,0.15)"
    : "rgba(161,161,170,0.10)";
  const ckColor = isCrit ? "#fca5a5" : isOn ? "#86efac" : "var(--fg-faint)";
  return (
    <div
      className="grid items-center gap-2.5 py-1.5"
      style={{ gridTemplateColumns: "20px 1fr" }}
    >
      <div
        className="w-5 h-5 rounded-[4px] flex items-center justify-center text-[10px] font-bold"
        style={{ background: ckBg, color: ckColor }}
      >
        {ck}
      </div>
      <div className="min-w-0">
        <div className="text-[11.5px] font-semibold t-fg-strong leading-tight truncate">{item.b}</div>
        <div className="text-[10.5px] t-fg-muted leading-tight truncate">{item.s}</div>
      </div>
    </div>
  );
}

function ConvRow({ conv, active, onClick, mode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid items-start gap-3 px-4 py-3 text-left w-full border-b transition-colors"
      style={{
        gridTemplateColumns: "44px 1fr auto",
        background: active ? "var(--bg-card-2)" : "transparent",
        borderColor: "var(--rule)",
        borderLeft: active ? "3px solid var(--tenant-accent)" : "3px solid transparent",
      }}
    >
      <div className="relative flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
          style={{
            background: "linear-gradient(135deg, var(--tenant-primary), var(--tenant-primary-strong, var(--tenant-primary)))",
          }}
        >
          {conv.avatar}
        </div>
        {conv.tag === "SOS" && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: "#dc2626" }}
          >
            !
          </div>
        )}
        {conv.tag === "SIGIL" && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
            style={{ background: "#7c3aed" }}
          >
            🔒
          </div>
        )}
        {conv.online && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
            style={{ background: "#22c55e", borderColor: "var(--bg-card)" }}
          />
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <b className="text-[13px] font-semibold t-fg-strong truncate">{conv.name}</b>
          <span className="text-[10px] t-fg-faint flex-shrink-0">{conv.when}</span>
        </div>
        <div className="text-[11.5px] t-fg-muted line-clamp-1 mb-1">{conv.preview}</div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] t-fg-faint truncate">{conv.sub}</span>
          {conv.tag === "OP-014" && (
            <span
              className="text-[9px] font-bold px-1.5 py-[1px] rounded-[3px]"
              style={{ background: "rgba(var(--tenant-primary-rgb), 0.15)", color: "var(--tenant-accent)" }}
            >
              OP-014
            </span>
          )}
          {conv.tag === "SIGIL" && (
            <span
              className="text-[9px] font-bold px-1.5 py-[1px] rounded-[3px]"
              style={{ background: "rgba(124,58,237,0.20)", color: "#d8b4fe" }}
            >
              E2EE
            </span>
          )}
          {conv.tag === "SOS" && conv.sos && (
            <span
              className="text-[9px] font-bold px-1.5 py-[1px] rounded-[3px]"
              style={{ background: "rgba(220,38,38,0.20)", color: "#fca5a5" }}
            >
              ATIVO
            </span>
          )}
          {conv.tag === "OFICIAL" && (
            <span
              className="text-[9px] font-bold px-1.5 py-[1px] rounded-[3px]"
              style={{ background: "var(--tenant-accent)", color: "var(--fg-on-accent, #18181b)" }}
            >
              OFICIAL
            </span>
          )}
        </div>
      </div>

      {conv.unread > 0 && (
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
          style={{ background: conv.tag === "SOS" ? "#dc2626" : "var(--tenant-primary)" }}
        >
          {conv.unread}
        </span>
      )}
    </button>
  );
}

function MessageRow({ msg, mode }) {
  if (msg.type === "date") {
    return (
      <div className="text-center my-4 text-[10px] t-fg-faint tracking-[0.16em] uppercase font-bold">
        {msg.val}
      </div>
    );
  }
  if (msg.type === "system") {
    return (
      <div
        className="my-2 mx-auto rounded-md px-3 py-1.5 text-[11px] text-center"
        style={{ background: "var(--bg-card-2)", color: "var(--fg-muted)", maxWidth: "90%" }}
      >
        {msg.val}
      </div>
    );
  }
  if (msg.type === "expired") {
    return (
      <div className="grid items-center gap-2 my-1.5" style={{ gridTemplateColumns: "32px 1fr" }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[14px]"
          style={{ background: "rgba(124,58,237,0.20)", color: "#d8b4fe" }}
        >
          ⏱
        </div>
        <div
          className="text-[11px] italic"
          style={{ color: mode === "sigiloso" ? "#a78bfa" : "var(--fg-faint)" }}
        >
          {msg.val}
        </div>
      </div>
    );
  }

  const isMe = msg.from === "me";
  const isSys = msg.system;
  const align = isMe ? "justify-end" : "justify-start";
  const sigiloso = mode === "sigiloso";
  const sos = mode === "sos";

  let bubbleBg = isMe ? "var(--tenant-primary)" : "var(--bg-card)";
  let bubbleColor = isMe ? "#fff" : "var(--fg-strong)";
  let bubbleBorder = "1px solid var(--rule)";
  if (sigiloso) {
    bubbleBg = isMe ? "#7c3aed" : "#2d0050";
    bubbleColor = "#f3e8ff";
    bubbleBorder = "1px solid #4c1d95";
  } else if (sos) {
    bubbleBg = isMe ? "#dc2626" : "#2a0606";
    bubbleColor = "#fff";
    bubbleBorder = "1px solid #7f1d1d";
  }
  if (isSys) {
    bubbleBg = "rgba(34,197,94,0.10)";
    bubbleColor = sos ? "#fecaca" : sigiloso ? "#d8b4fe" : "var(--fg)";
    bubbleBorder = "1px solid rgba(34,197,94,0.20)";
  }

  return (
    <div className={`flex ${align} mb-2`}>
      <div className="max-w-[78%]">
        <div
          className="rounded-lg px-3 py-2 text-[12.5px] leading-snug"
          style={{
            background: bubbleBg,
            color: bubbleColor,
            border: bubbleBorder,
          }}
        >
          {!isMe && !isSys && (
            <div className="text-[10px] font-bold mb-1 opacity-90" style={{ color: sigiloso ? "#d8b4fe" : sos ? "#fca5a5" : "var(--tenant-accent)" }}>
              {msg.name}
            </div>
          )}
          <div>{msg.body}</div>
          {msg.attach && (
            <div
              className="mt-2 grid items-center gap-2 p-2 rounded-md"
              style={{
                gridTemplateColumns: "32px 1fr",
                background: "rgba(0,0,0,0.18)",
              }}
            >
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold"
                style={{ background: "rgba(255,255,255,0.10)" }}
              >
                {msg.attach.ico}
              </div>
              <div className="min-w-0">
                <div className="text-[11.5px] font-semibold truncate">{msg.attach.b}</div>
                <div className="text-[10px] opacity-70 truncate">{msg.attach.s}</div>
              </div>
            </div>
          )}
        </div>
        <div
          className="text-[9.5px] mt-1 px-1"
          style={{ textAlign: isMe ? "right" : "left", color: sigiloso ? "#a78bfa" : sos ? "#fca5a5" : "var(--fg-faint)" }}
        >
          {msg.when}
          {msg.expire !== undefined && (
            <span className="ml-2">
              · expira em {Math.round((1 - msg.expire) * 24)}h
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function Chat() {
  const [mode, setMode] = useState("permanente");
  const [convId, setConvId] = useState("p1");

  const theme = MODE_THEME[mode];
  const conversations = CHAT_CONVERSATIONS[mode] || [];
  const conv = useMemo(
    () => conversations.find((c) => c.id === convId) || conversations[0],
    [conversations, convId],
  );
  const messages = (conv && CHAT_MESSAGES[conv.id]) || [];

  function pickMode(k) {
    setMode(k);
    const first = CHAT_CONVERSATIONS[k]?.[0];
    if (first) setConvId(first.id);
  }

  const placeholder =
    mode === "sigiloso"
      ? `Mensagem cifrada para ${conv?.name?.split("·")[0] || "..."}...`
      : mode === "sos"
      ? `Resposta de coord. para ${conv?.name?.split("·")[0] || "..."}...`
      : `Mensagem para ${conv?.name?.split("·")[0] || "..."}...`;
  const sendLabel = mode === "sigiloso" ? "🔒 Cifrar e enviar" : mode === "sos" ? "🚨 Responder" : "Enviar";

  return (
    <div
      className="grid h-full"
      style={{
        gridTemplateColumns: "300px 340px 1fr",
        height: "calc(100vh - 48px)", // descontar topbar
        background: theme.bgChat,
      }}
      data-mode={mode}
    >
      {/* Rail · modos */}
      <aside
        className="flex flex-col border-r"
        style={{ background: theme.bgRail, borderColor: "var(--rule)" }}
      >
        <div className="px-4 py-4 border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="text-[12.5px] font-bold t-fg-strong">Comunicação Interna</div>
          <div className="text-[10px] t-fg-faint tracking-[0.10em] uppercase mt-0.5">3 modos · Mazzel · UB</div>
        </div>
        <div className="px-3 py-3 space-y-1.5 border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="text-[9.5px] t-fg-faint tracking-[0.16em] uppercase font-bold px-1 mb-1">
            Modo de Conversa
          </div>
          {CHAT_MODES.map((m) => (
            <ModeButton key={m.k} mode={m} active={mode === m.k} onClick={() => pickMode(m.k)} />
          ))}
        </div>
        <div className="px-4 py-3 flex-1 overflow-auto">
          <div className="text-[10.5px] font-bold t-fg-strong mb-2">{CHAT_FEATURES[mode]?.title}</div>
          <div>
            {CHAT_FEATURES[mode]?.items.map((it, i) => (
              <FeatureRow key={i} item={it} />
            ))}
          </div>
        </div>
      </aside>

      {/* Lista de conversas */}
      <section
        className="flex flex-col border-r overflow-hidden"
        style={{ background: theme.bgList, borderColor: "var(--rule)" }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="flex items-center justify-between mb-2">
            <b className="text-[13.5px] t-fg-strong">
              {mode === "permanente" ? "Conversas Permanentes" : mode === "sigiloso" ? "Sigiloso · 14 ativos" : "SOS Cabo · 3 abertos"}
            </b>
            <button
              type="button"
              className="text-[11px] font-semibold rounded-md px-2.5 py-1"
              style={{
                background: "var(--tenant-primary)",
                color: "#fff",
              }}
            >
              + Nova
            </button>
          </div>
          <div
            className="rounded-md flex items-center gap-2 px-2.5 py-1.5"
            style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}
          >
            <span className="text-[12px] t-fg-faint">🔍</span>
            <input
              type="text"
              placeholder="Buscar pessoa, grupo, mensagem..."
              className="flex-1 bg-transparent border-0 outline-none text-[12px] t-fg"
              style={{ minWidth: 0 }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {conversations.map((c) => (
            <ConvRow
              key={c.id}
              conv={c}
              active={c.id === conv?.id}
              onClick={() => setConvId(c.id)}
              mode={mode}
            />
          ))}
        </div>
      </section>

      {/* Chat principal */}
      <main className="flex flex-col overflow-hidden" style={{ background: theme.bgChat }}>
        {(mode === "sigiloso" || mode === "sos") && (
          <div
            className="px-4 py-2 text-[11px] font-bold text-center"
            style={{ background: theme.bannerBg, color: theme.bannerFg, letterSpacing: "0.04em" }}
          >
            {BANNER_TEXT[mode]}
          </div>
        )}

        {/* Header da conversa */}
        {conv && (
          <header
            className="grid items-center gap-3 px-5 py-3 border-b"
            style={{
              gridTemplateColumns: "40px 1fr auto",
              background: theme.headerBg,
              borderColor: "var(--rule)",
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--tenant-primary), var(--tenant-primary-strong, var(--tenant-primary)))" }}
            >
              {conv.avatar}
            </div>
            <div className="min-w-0">
              <b className="text-[13.5px] t-fg-strong truncate block">{conv.name}</b>
              <div className="flex items-center gap-2 text-[11px] t-fg-muted">
                <span className="truncate">{conv.sub}</span>
                <span
                  className="px-1.5 py-[1px] rounded-[3px] text-[9px] font-bold"
                  style={{
                    background:
                      mode === "sigiloso"
                        ? "rgba(124,58,237,0.20)"
                        : mode === "sos"
                        ? "rgba(220,38,38,0.20)"
                        : "rgba(var(--tenant-primary-rgb), 0.15)",
                    color:
                      mode === "sigiloso"
                        ? "#d8b4fe"
                        : mode === "sos"
                        ? "#fca5a5"
                        : "var(--tenant-accent)",
                  }}
                >
                  {mode.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex gap-1 t-fg-muted">
              <button title="Buscar" className="w-8 h-8 rounded hover:bg-black/10">🔍</button>
              <button title="Anexar" className="w-8 h-8 rounded hover:bg-black/10">📎</button>
              <button title="Vídeo" className="w-8 h-8 rounded hover:bg-black/10">📹</button>
              <button title="Mais" className="w-8 h-8 rounded hover:bg-black/10">⋯</button>
            </div>
          </header>
        )}

        {/* Mensagens */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {messages.length > 0 ? (
            messages.map((m, i) => <MessageRow key={i} msg={m} mode={mode} />)
          ) : (
            <div className="text-[12px] t-fg-faint text-center mt-8">
              Selecione uma conversa pra ver as mensagens.
            </div>
          )}
        </div>

        {/* Composer meta */}
        <div
          className="px-5 py-1.5 border-t flex items-center gap-2 text-[10.5px]"
          style={{
            borderColor: "var(--rule)",
            background: mode === "sigiloso" ? "#1a0033" : mode === "sos" ? "#1a0808" : "var(--bg-card-2)",
            color: mode === "sigiloso" ? "#d8b4fe" : mode === "sos" ? "#fca5a5" : "var(--fg-muted)",
          }}
        >
          {mode === "permanente" && (
            <>
              <span>Modo: <b className="t-fg-strong">Permanente</b> · histórico auditável · LGPD</span>
              <span>·</span>
              <span>Anexos OK · sem expiração</span>
            </>
          )}
          {mode === "sigiloso" && (
            <>
              <span>🔒 Cifrado · <b style={{ color: "#f3e8ff" }}>E2EE Signal</b></span>
              <span>·</span>
              <span>Auto-destrói: <b style={{ color: "#f3e8ff" }}>24h</b></span>
              <span>·</span>
              <span>Print: <b style={{ color: "#f3e8ff" }}>BLOQUEADO</b></span>
              <span>·</span>
              <span>Watermark: <b style={{ color: "#f3e8ff" }}>ATIVO</b></span>
            </>
          )}
          {mode === "sos" && (
            <>
              <span>🚨 SOS aberto · <b style={{ color: "#fff" }}>Resposta de Coordenação</b></span>
              <span>·</span>
              <span>Tudo gravado para forense</span>
            </>
          )}
          <span className="ml-auto">⌘ Enter para enviar</span>
        </div>

        {/* Composer */}
        <footer
          className="grid items-end gap-2 px-4 py-3 border-t"
          style={{
            gridTemplateColumns: "auto 1fr auto",
            borderColor: "var(--rule)",
            background: mode === "sigiloso" ? "#1a0033" : mode === "sos" ? "#1a0808" : "var(--bg-card)",
          }}
        >
          <div className="flex gap-1">
            <button title="Anexar" className="w-9 h-9 rounded-md t-fg-muted hover:bg-black/10">📎</button>
            <button title="Foto" className="w-9 h-9 rounded-md t-fg-muted hover:bg-black/10">📷</button>
            <button title="Áudio" className="w-9 h-9 rounded-md t-fg-muted hover:bg-black/10">🎤</button>
          </div>
          <textarea
            placeholder={placeholder}
            className="rounded-md px-3 py-2 text-[12.5px] outline-none resize-none"
            style={{
              minHeight: 36,
              maxHeight: 120,
              background: mode === "sigiloso" ? "#2d0050" : mode === "sos" ? "#2a0606" : "var(--bg-card-2)",
              border: `1px solid ${mode === "sigiloso" ? "#4c1d95" : mode === "sos" ? "#7f1d1d" : "var(--rule)"}`,
              color: mode === "sigiloso" ? "#f3e8ff" : mode === "sos" ? "#fff" : "var(--fg-strong)",
            }}
          />
          <button
            type="button"
            className="rounded-md px-4 py-2 text-[12px] font-bold"
            style={{ background: theme.sendBg, color: theme.sendFg }}
          >
            {sendLabel}
          </button>
        </footer>
      </main>
    </div>
  );
}
