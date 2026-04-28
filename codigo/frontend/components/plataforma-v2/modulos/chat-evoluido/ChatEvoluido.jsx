"use client";

/* Chat Evoluído · 1:1 com Designer V1.2 (03-chat-evoluido.html)
 *
 * Layout 3 colunas: modes-rail (280) + conv-list (320) + chat (1fr)
 * 3 modos com paleta + comportamento próprio:
 *   - permanente (cor tenant, LGPD)
 *   - sigiloso  (purple gradient + watermark CSS + auto-destrói)
 *   - sos       (red gradient + sos-card + escalada + buddy)
 *
 * Substitui Chat.jsx anterior (595 linhas vs 1094 do mockup).
 * Caso âncora SOS: Luiz Ribeiro · M'Boi Mirim ATIVO.
 * Caso âncora Sigiloso: Milton Leite confidencial chapa 2026.
 */

import { useState } from "react";
import {
  MODES,
  FEATURES,
  CL_TABS,
  CONVS,
  MSGS,
  SOS_CARD_DATA,
  COMPOSER_META,
  TITULO_LISTA,
} from "./dados";

export function ChatEvoluido() {
  const [mode, setMode] = useState("permanente");
  const lista = CONVS[mode];
  const [convId, setConvId] = useState(lista[0].id);
  const conv = lista.find((c) => c.id === convId) || lista[0];

  // resetar conv quando muda modo
  const onMode = (m) => {
    setMode(m);
    setConvId(CONVS[m][0].id);
  };

  return (
    <div
      data-mode={mode}
      style={{
        display: "grid",
        gridTemplateColumns: "280px 320px 1fr",
        height: "calc(100vh - 48px)",
        overflow: "hidden",
      }}
    >
      <ModesRail mode={mode} onMode={onMode} />
      <ConvList mode={mode} convId={convId} onConv={setConvId} />
      <Chat mode={mode} conv={conv} />
    </div>
  );
}

/* ============ MODES RAIL ============ */
function ModesRail({ mode, onMode }) {
  const f = FEATURES[mode];
  return (
    <aside
      style={{
        background: "var(--mz-bg-sidebar)",
        borderRight: "1px solid var(--mz-rule)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 6, borderBottom: "1px solid var(--mz-rule)" }}>
        <div
          style={{
            fontSize: 9.5,
            letterSpacing: "0.16em",
            color: "var(--mz-fg-faint)",
            textTransform: "uppercase",
            fontWeight: 700,
            padding: "0 4px 4px",
          }}
        >
          Modo de Conversa
        </div>
        {MODES.map((m) => (
          <ModeBtn key={m.id} m={m} active={mode === m.id} onClick={() => onMode(m.id)} />
        ))}
      </div>

      <div style={{ padding: 14, flex: 1, overflowY: "auto" }}>
        <h4
          style={{
            fontSize: 9.5,
            letterSpacing: "0.16em",
            color: "var(--mz-fg-faint)",
            textTransform: "uppercase",
            fontWeight: 700,
            margin: "0 0 10px",
          }}
        >
          {f.titulo}
        </h4>
        {f.items.map((it, i) => (
          <FeatRow key={i} item={it} last={i === f.items.length - 1} />
        ))}
      </div>
    </aside>
  );
}

function ModeBtn({ m, active, onClick }) {
  const styleByMode = {
    permanente: active
      ? { bg: "linear-gradient(135deg, var(--mz-tenant-primary), var(--mz-tenant-primary-strong))", border: "var(--mz-tenant-accent)", icBg: "var(--mz-tenant-accent)", icColor: "var(--mz-fg-on-accent)", textColor: "#fff", subColor: "rgba(255,255,255,0.75)", qtyBg: "rgba(0,0,0,0.3)", qtyColor: "#FFCC00" }
      : null,
    sigiloso: active
      ? { bg: "linear-gradient(135deg, #1a0033, #3d0066)", border: "#a855f7", icBg: "#7c3aed", icColor: "#fff", textColor: "#fff", subColor: "#d8b4fe", qtyBg: "rgba(0,0,0,0.4)", qtyColor: "#d8b4fe" }
      : null,
    sos: active
      ? { bg: "linear-gradient(135deg, #7f1d1d, #991b1b)", border: "#fca5a5", icBg: "#dc2626", icColor: "#fff", textColor: "#fff", subColor: "#fecaca", qtyBg: "rgba(0,0,0,0.4)", qtyColor: "#fecaca" }
      : null,
  };
  const s = styleByMode[m.id];

  return (
    <button
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr auto",
        gap: 10,
        alignItems: "center",
        background: s?.bg || "var(--mz-bg-card)",
        border: `1px solid ${s?.border || "var(--mz-rule)"}`,
        borderRadius: 8,
        padding: "10px 12px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 120ms",
        color: s?.textColor || "var(--mz-fg)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          background: s?.icBg || "var(--mz-bg-elevated)",
          color: s?.icColor || "var(--mz-fg)",
          animation: m.id === "sos" && active ? "chatPulseRed 1.4s ease infinite" : undefined,
        }}
      >
        {m.ico}
      </div>
      <div>
        <b style={{ fontSize: 12.5, fontWeight: 700, color: s?.textColor || "var(--mz-fg-strong)", display: "block" }}>
          {m.titulo}
        </b>
        <span style={{ fontSize: 10.5, color: s?.subColor || "var(--mz-fg-muted)" }}>{m.sub}</span>
      </div>
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9.5,
          background: s?.qtyBg || "var(--mz-bg-elevated)",
          color: s?.qtyColor || "var(--mz-fg-faint)",
          padding: "1px 5px",
          borderRadius: 3,
          fontWeight: 700,
        }}
      >
        {m.qty}
      </span>
      {m.id === "sos" && active && (
        <style>{`@keyframes chatPulseRed { 0%,100%{box-shadow: 0 0 0 0 #dc2626} 50%{box-shadow: 0 0 0 6px transparent} }`}</style>
      )}
    </button>
  );
}

function FeatRow({ item, last }) {
  const ckBg =
    item.state === "crit" ? "var(--mz-danger)" :
    item.state === "on"   ? "var(--mz-ok)" :
                            "var(--mz-bg-elevated)";
  const ckColor =
    item.state === "crit" ? "#fff" :
    item.state === "on"   ? "#fff" :
                            "var(--mz-fg-faint)";
  const ckSym =
    item.state === "crit" ? "!" :
    item.state === "on"   ? "✓" :
                            "—";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "14px 1fr",
        gap: 10,
        padding: "6px 0",
        fontSize: 11.5,
        color: "var(--mz-fg)",
        borderBottom: last ? 0 : "1px dashed var(--mz-rule)",
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          background: ckBg,
          color: ckColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
        }}
      >
        {ckSym}
      </div>
      <div>
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{item.b}</b>
        <span style={{ display: "block", color: "var(--mz-fg-faint)", fontSize: 10.5 }}>{item.s}</span>
      </div>
    </div>
  );
}

/* ============ CONV LIST ============ */
function ConvList({ mode, convId, onConv }) {
  const [tab, setTab] = useState("Todas");
  const lista = CONVS[mode];
  return (
    <section
      style={{
        background: "var(--mz-bg-card)",
        borderRight: "1px solid var(--mz-rule)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--mz-rule)", background: "var(--mz-bg-card-2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <b style={{ fontSize: 14, fontWeight: 800, color: "var(--mz-fg-strong)", letterSpacing: "-0.01em" }}>
            {TITULO_LISTA[mode]}
          </b>
          <button
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: "var(--mz-tenant-accent)",
              color: "var(--mz-fg-on-accent)",
              border: 0,
              padding: "4px 10px",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            + Nova
          </button>
        </div>
        <div
          style={{
            background: "var(--mz-bg-card)",
            border: "1px solid var(--mz-rule)",
            borderRadius: 6,
            padding: "6px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "var(--mz-fg-faint)", fontSize: 12 }}>🔍</span>
          <input
            placeholder="Buscar pessoa, grupo, mensagem..."
            style={{ flex: 1, background: "none", border: 0, fontSize: 11.5, color: "var(--mz-fg)", outline: "none" }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 2, padding: "6px 12px", borderBottom: "1px solid var(--mz-rule)", background: "var(--mz-bg-card-2)" }}>
        {CL_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              padding: "5px 10px",
              background: t === tab ? "var(--mz-bg-elevated)" : "none",
              color: t === tab ? "var(--mz-fg-strong)" : "var(--mz-fg-muted)",
              border: 0,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {lista.map((c) => (
          <ConvRow key={c.id} c={c} active={c.id === convId} onClick={() => onConv(c.id)} />
        ))}
      </div>
    </section>
  );
}

function ConvRow({ c, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr auto",
        gap: 10,
        padding: active ? "12px 14px 12px 11px" : "12px 14px",
        borderBottom: "1px solid var(--mz-rule)",
        cursor: "pointer",
        alignItems: "start",
        background: active ? "var(--mz-tenant-primary-soft)" : undefined,
        borderLeft: active ? "3px solid var(--mz-tenant-accent)" : undefined,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "var(--mz-tenant-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: 15,
          color: "var(--mz-tenant-accent)",
          position: "relative",
        }}
      >
        {c.avatar}
        {(c.tag === "SOS" || c.tag === "SIGIL" || c.online) && (
          <div
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "2px solid var(--mz-bg-card)",
              fontSize: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: c.tag === "SOS" ? "#dc2626" : c.tag === "SIGIL" ? "#7c3aed" : "var(--mz-ok)",
              color: "#fff",
            }}
          >
            {c.tag === "SOS" ? "!" : c.tag === "SIGIL" ? "🔒" : ""}
          </div>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <b
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--mz-fg-strong)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {c.nome}
          </b>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-fg-faint)", flexShrink: 0 }}>
            {c.when}
          </span>
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--mz-fg-muted)",
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {c.preview}
        </div>
        <div style={{ fontSize: 10, color: "var(--mz-fg-faint)", marginTop: 3, display: "flex", gap: 8, alignItems: "center" }}>
          <span>{c.sub}</span>
          {c.tag === "OP-014" && <Pill bg="var(--mz-tenant-primary-soft)" color="var(--mz-tenant-accent)">OP-014</Pill>}
          {c.tag === "SIGIL" && <Pill bg="rgba(124,58,237,0.15)" color="#d8b4fe" border="1px solid rgba(124,58,237,0.27)">E2EE</Pill>}
          {c.tag === "SOS" && c.sos && <Pill bg="rgba(220,38,38,0.15)" color="#fca5a5" border="1px solid rgba(220,38,38,0.27)">ATIVO</Pill>}
          {c.tag === "OFICIAL" && <Pill bg="var(--mz-tenant-accent)" color="var(--mz-fg-on-accent)">OFICIAL</Pill>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "end", gap: 4 }}>
        {c.unread > 0 && (
          <span
            style={{
              background: c.tag === "SOS" ? "#dc2626" : "var(--mz-tenant-accent)",
              color: "#fff",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9.5,
              fontWeight: 800,
              padding: "1px 5px",
              borderRadius: 8,
              minWidth: 16,
              textAlign: "center",
              animation: c.tag === "SOS" ? "chatPulseRed 1.4s ease infinite" : undefined,
            }}
          >
            {c.unread}
          </span>
        )}
      </div>
    </div>
  );
}

function Pill({ children, bg, color, border }) {
  return (
    <span
      style={{
        background: bg,
        padding: "1px 5px",
        borderRadius: 3,
        fontSize: 9,
        letterSpacing: "0.06em",
        fontWeight: 700,
        textTransform: "uppercase",
        color,
        border,
      }}
    >
      {children}
    </span>
  );
}

/* ============ CHAT (área principal) ============ */
function Chat({ mode, conv }) {
  const isSigil = mode === "sigiloso";
  const isSos = mode === "sos";

  const bgChat = isSigil
    ? "radial-gradient(ellipse 600px 400px at 50% -100px, #4c1d9520, transparent), #110022"
    : isSos
    ? "radial-gradient(ellipse 600px 400px at 50% -100px, #dc262620, transparent), #1a0808"
    : "var(--mz-bg-page)";

  const headerBg = isSigil ? "#1a0033" : isSos ? "#1a0808" : "var(--mz-bg-card)";
  const headerBorder = isSigil ? "#4c1d95" : isSos ? "#7f1d1d" : "var(--mz-rule)";

  return (
    <main style={{ display: "flex", flexDirection: "column", background: bgChat, position: "relative", overflow: "hidden" }}>
      {/* Banner topo (sigiloso/sos) */}
      {isSigil && (
        <Banner bg="linear-gradient(90deg, #2d0050, #3d0066, #2d0050)" color="#d8b4fe" border="1px solid #7c3aed">
          🔒 MODO SIGILOSO · E2EE · Mensagens expiram em 24h · Print bloqueado · Watermark ativo
        </Banner>
      )}
      {isSos && (
        <Banner bg="linear-gradient(90deg, #7f1d1d, #991b1b, #7f1d1d)" color="#fecaca" border="1px solid #dc2626">
          🚨 SOS CABO · ESCALADO ATÉ ENCERRAMENTO · Coord. Operação + Jurídico + Segurança notificados · Localização em tempo real
        </Banner>
      )}

      {/* Header */}
      <header
        style={{
          padding: "14px 24px",
          borderBottom: `1px solid ${headerBorder}`,
          background: headerBg,
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: isSigil || isSos ? 28 : 0,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--mz-tenant-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: 17,
            color: "var(--mz-tenant-accent)",
            flexShrink: 0,
          }}
        >
          {conv.avatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ fontSize: 15, fontWeight: 800, color: isSigil || isSos ? "#fff" : "var(--mz-fg-strong)", letterSpacing: "-0.01em", display: "block" }}>
            {conv.nome}
          </b>
          <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", display: "flex", gap: 12, alignItems: "center", marginTop: 2 }}>
            <span>{conv.sub}</span>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 3,
                background: isSigil ? "#4c1d9540" : isSos ? "#7f1d1d40" : "var(--mz-bg-elevated)",
                color: isSigil ? "#d8b4fe" : isSos ? "#fecaca" : "var(--mz-fg-muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {mode}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <HeaderBtn>🔍</HeaderBtn>
          <HeaderBtn>📎</HeaderBtn>
          <HeaderBtn>📹</HeaderBtn>
          <HeaderBtn>📞</HeaderBtn>
          <HeaderBtn>⋯</HeaderBtn>
        </div>
      </header>

      {/* Messages */}
      <Messages mode={mode} convId={conv.id} />

      {/* Composer meta + composer */}
      <ComposerMeta mode={mode} />
      <Composer mode={mode} conv={conv} />
    </main>
  );
}

function Banner({ children, bg, color, border }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5,
        padding: "8px 24px",
        textAlign: "center",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        background: bg,
        color,
        borderBottom: border,
      }}
    >
      {children}
    </div>
  );
}

function HeaderBtn({ children }) {
  return (
    <button
      style={{
        width: 36,
        height: 36,
        background: "var(--mz-bg-card-2)",
        border: "1px solid var(--mz-rule)",
        color: "var(--mz-fg)",
        borderRadius: 6,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* ============ MESSAGES ============ */
function Messages({ mode, convId }) {
  const arr = MSGS[convId] || [];
  const isSigil = mode === "sigiloso";

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        position: "relative",
      }}
    >
      {/* Watermark sigiloso */}
      {isSigil && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(168, 85, 247, 0.03) 60px, rgba(168, 85, 247, 0.03) 61px)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-30deg)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 24,
              fontWeight: 700,
              color: "rgba(216, 180, 254, 0.06)",
              letterSpacing: "0.10em",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            SIGILOSO · M.LEITE · 09:14:23 · 187.X.X.42
          </div>
        </>
      )}

      {arr.map((m, i) => (
        <MsgRender key={i} m={m} mode={mode} />
      ))}
    </div>
  );
}

function MsgRender({ m, mode }) {
  if (m.type === "date") return <DateDiv val={m.val} />;
  if (m.type === "system") return <MsgSystem val={m.val} />;
  if (m.type === "expired") return <MsgExpired val={m.val} />;
  if (m.type === "sos-card") return <SosCard />;
  if (m.type === "sysmsg") return <MsgSysmsg body={m.body} />;
  return <MsgBubble m={m} mode={mode} />;
}

function DateDiv({ val }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 10,
        letterSpacing: "0.14em",
        color: "var(--mz-fg-faint)",
        fontWeight: 700,
        margin: "8px 0 4px",
        textTransform: "uppercase",
      }}
    >
      <span style={{ flex: 1, height: 1, background: "var(--mz-rule)" }} />
      {val}
      <span style={{ flex: 1, height: 1, background: "var(--mz-rule)" }} />
    </div>
  );
}

function MsgSystem({ val }) {
  return (
    <div
      style={{
        background: "var(--mz-bg-card-2)",
        border: "1px dashed var(--mz-rule-strong)",
        borderRadius: 999,
        padding: "6px 14px",
        fontSize: 11,
        color: "var(--mz-fg-muted)",
        margin: "0 auto",
        display: "inline-flex",
        gap: 8,
        alignItems: "center",
        width: "fit-content",
      }}
    >
      {val}
    </div>
  );
}

function MsgExpired({ val }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px auto", gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "var(--mz-bg-elevated)",
          color: "var(--mz-fg-faint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        ⏱
      </div>
      <div
        style={{
          background: "rgba(220, 38, 38, 0.08)",
          border: "1px dashed #7f1d1d",
          padding: "8px 14px",
          borderRadius: 12,
          fontSize: 11.5,
          color: "#fca5a5",
          fontStyle: "italic",
          display: "inline-flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        {val}
      </div>
    </div>
  );
}

function MsgSysmsg({ body }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "var(--mz-bg-elevated)",
          color: "var(--mz-fg-faint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        ⚡
      </div>
      <div
        style={{
          background: "var(--mz-bg-card-2)",
          border: "1px solid var(--mz-rule)",
          borderRadius: 12,
          padding: "8px 14px",
          fontSize: 11,
          color: "var(--mz-fg-muted)",
        }}
      >
        {body}
      </div>
    </div>
  );
}

function MsgBubble({ m, mode }) {
  const isMe = m.from === "me";
  const isSigil = mode === "sigiloso";
  const isSos = mode === "sos";

  const bubbleBg = isMe
    ? (isSigil ? "#6d28d9" : isSos ? "#991b1b" : "var(--mz-tenant-primary)")
    : (isSigil ? "#1f0040" : isSos ? "#2a0606" : "var(--mz-bg-card)");
  const bubbleBorder = isMe
    ? (isSigil ? "#7c3aed" : isSos ? "#dc2626" : "var(--mz-tenant-primary-strong)")
    : (isSigil ? "#4c1d95" : isSos ? "#7f1d1d" : "var(--mz-rule)");
  const bubbleColor = isMe
    ? "#fff"
    : (isSigil ? "#f3e8ff" : isSos ? "#fecaca" : "var(--mz-fg)");
  const authorColor = isMe ? "#FFCC00" : (isSigil ? "#d8b4fe" : "var(--mz-tenant-accent)");

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMe ? "1fr 32px" : "32px 1fr",
        gap: 10,
        alignItems: "start",
        maxWidth: 720,
        marginLeft: isMe ? "auto" : 0,
      }}
    >
      {!isMe && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--mz-tenant-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "Bebas Neue, sans-serif",
            color: "var(--mz-tenant-accent)",
            flexShrink: 0,
          }}
        >
          {m.from}
        </div>
      )}
      <div
        style={{
          background: bubbleBg,
          border: `1px solid ${bubbleBorder}`,
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 13,
          color: bubbleColor,
          lineHeight: 1.5,
          textAlign: "left",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: authorColor, marginBottom: 4, display: "flex", gap: 8, alignItems: "center" }}>
          {m.nome}
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: isMe ? "rgba(255,255,255,0.6)" : "var(--mz-fg-faint)", fontWeight: 500 }}>
            {m.when}
          </span>
        </div>
        {m.body}
        {m.attach && <Attachment a={m.attach} />}
        {m.expire !== undefined && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 9.5, color: isSigil ? "#d8b4fe" : "var(--mz-fg-faint)", marginTop: 6, fontFamily: "JetBrains Mono, monospace" }}>
            <span>⏱ expira em {Math.round(24 - m.expire * 24)}h</span>
            <div style={{ width: 32, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", background: "#ef4444", width: `${m.expire * 100}%` }} />
            </div>
          </div>
        )}
      </div>
      {isMe && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--mz-tenant-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "Bebas Neue, sans-serif",
            color: "var(--mz-tenant-accent)",
            flexShrink: 0,
          }}
        >
          VC
        </div>
      )}
    </div>
  );
}

function Attachment({ a }) {
  return (
    <div
      style={{
        background: "var(--mz-bg-card-2)",
        border: "1px solid var(--mz-rule)",
        borderRadius: 8,
        padding: "10px 12px",
        marginTop: 8,
        display: "grid",
        gridTemplateColumns: "36px 1fr auto",
        gap: 10,
        alignItems: "center",
        fontSize: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          background: "var(--mz-tenant-accent)",
          color: "var(--mz-fg-on-accent)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        {a.ico}
      </div>
      <div>
        <b style={{ color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{a.b}</b>
        <span style={{ color: "var(--mz-fg-faint)", fontSize: 10.5 }}>{a.s}</span>
      </div>
      <button
        style={{
          background: "var(--mz-bg-card)",
          border: "1px solid var(--mz-rule)",
          color: "var(--mz-fg)",
          padding: "5px 10px",
          borderRadius: 4,
          fontSize: 10,
          cursor: "pointer",
        }}
      >
        ↓
      </button>
    </div>
  );
}

function SosCard() {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #7f1d1d, #991b1b)",
        border: "2px solid #dc2626",
        borderRadius: 14,
        padding: "16px 20px",
        color: "#fff",
        maxWidth: 560,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            background: "#dc2626",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            animation: "chatPulseRed 1.4s ease infinite",
          }}
        >
          🚨
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: "0.04em" }}>
            SOS CABO ATIVO
            <span style={{ display: "block", fontSize: 10, color: "#fecaca", fontWeight: 600, letterSpacing: "0.10em", marginTop: 2 }}>
              aberto há {SOS_CARD_DATA.abertoHa}
            </span>
          </h3>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11.5, marginBottom: 12 }}>
        <SosInfo lbl="Cabo"          v={SOS_CARD_DATA.cabo} />
        <SosInfo lbl="Operação"      v={SOS_CARD_DATA.operacao} />
        <SosInfo lbl="Localização"    v={SOS_CARD_DATA.localizacao} />
        <SosInfo lbl="Áudio"          v={SOS_CARD_DATA.audio} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <SosBtn>📞 Ligar PM (190)</SosBtn>
        <SosBtn>📍 Ver mapa</SosBtn>
        <SosBtn>🎧 Ouvir áudio</SosBtn>
        <SosBtn primary>✓ Encerrar SOS</SosBtn>
      </div>
    </div>
  );
}

function SosInfo({ lbl, v }) {
  return (
    <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px 10px", borderRadius: 6 }}>
      <div style={{ fontSize: 9, color: "#fca5a5", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 700 }}>
        {lbl}
      </div>
      <b style={{ color: "#fff", fontWeight: 700 }}>{v}</b>
    </div>
  );
}

function SosBtn({ children, primary }) {
  return (
    <button
      style={{
        flex: 1,
        background: primary ? "#fff" : "rgba(0,0,0,0.3)",
        border: `1px solid ${primary ? "#fff" : "#fca5a5"}`,
        color: primary ? "#7f1d1d" : "#fff",
        padding: "8px 12px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* ============ COMPOSER ============ */
function ComposerMeta({ mode }) {
  const items = COMPOSER_META[mode];
  const isSigil = mode === "sigiloso";
  const isSos = mode === "sos";

  return (
    <div
      style={{
        padding: "0 18px 8px",
        background: isSigil ? "#1a0033" : isSos ? "#1a0808" : "var(--mz-bg-card)",
        fontSize: 10,
        color: isSigil ? "#d8b4fe" : isSos ? "#fca5a5" : "var(--mz-fg-faint)",
        letterSpacing: "0.04em",
        display: "flex",
        gap: 18,
        alignItems: "center",
      }}
    >
      {items.map((it, i) => {
        if (it.tipo === "right") {
          return (
            <span key={i} style={{ marginLeft: "auto" }}>
              {it.v}
            </span>
          );
        }
        if (it.tipo === "toggle") {
          const dotBg = isSigil ? "#ef4444" : "var(--mz-ok)";
          return (
            <span
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 8px",
                background: "var(--mz-bg-card-2)",
                borderRadius: 999,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: it.on ? dotBg : "var(--mz-fg-faint)",
                  boxShadow: it.on ? `0 0 6px ${dotBg}` : undefined,
                }}
              />
              {it.v.split(": ")[0]}: <b style={{ color: isSigil ? "#f3e8ff" : isSos ? "#fff" : "var(--mz-fg)", fontWeight: 700 }}>
                {it.v.split(": ")[1]}
              </b>
            </span>
          );
        }
        // Renderiza com "Modo: <b>X</b>" se contém ":"
        if (it.v.includes(":") && it.v.includes("Modo")) {
          const [pre, post] = it.v.split(": ");
          return (
            <span key={i}>
              {pre}: <b style={{ color: "var(--mz-fg)", fontWeight: 700 }}>{post}</b>
            </span>
          );
        }
        return <span key={i}>{it.v}</span>;
      })}
    </div>
  );
}

function Composer({ mode, conv }) {
  const isSigil = mode === "sigiloso";
  const isSos = mode === "sos";

  const composerBg = isSigil ? "#1a0033" : isSos ? "#1a0808" : "var(--mz-bg-card)";
  const composerBorder = isSigil ? "#4c1d95" : isSos ? "#7f1d1d" : "var(--mz-rule)";
  const taBg = isSigil ? "#2d0050" : isSos ? "#2a0606" : "var(--mz-bg-card-2)";
  const taBorder = isSigil ? "#4c1d95" : isSos ? "#7f1d1d" : "var(--mz-rule)";
  const taColor = isSigil ? "#f3e8ff" : isSos ? "#fff" : "var(--mz-fg)";

  const sendBg = isSigil ? "#7c3aed" : isSos ? "#dc2626" : "var(--mz-tenant-primary)";
  const sendBorder = isSigil ? "#a855f7" : isSos ? "#ef4444" : "var(--mz-tenant-primary-strong)";
  const sendPrefix = isSigil ? "🔒 " : isSos ? "🚨 " : "";
  const sendLabel = isSigil ? "Cifrar e enviar" : isSos ? "Responder" : "Enviar";

  const placeholder =
    isSigil ? `Mensagem cifrada para ${conv.nome.split("·")[0]}...` :
    isSos   ? `Resposta de coord. para ${conv.nome.split("·")[0]}...` :
              `Mensagem para ${conv.nome.split("·")[0]}...`;

  return (
    <footer
      style={{
        borderTop: `1px solid ${composerBorder}`,
        padding: "12px 18px",
        background: composerBg,
        display: "flex",
        gap: 10,
        alignItems: "end",
      }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        <ComposerTool>📎</ComposerTool>
        <ComposerTool>📷</ComposerTool>
        <ComposerTool>🎤</ComposerTool>
      </div>
      <textarea
        placeholder={placeholder}
        style={{
          flex: 1,
          minHeight: 40,
          maxHeight: 160,
          background: taBg,
          border: `1px solid ${taBorder}`,
          borderRadius: 6,
          padding: "10px 14px",
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          color: taColor,
          outline: "none",
          resize: "none",
        }}
      />
      <button
        style={{
          background: sendBg,
          border: `1px solid ${sendBorder}`,
          color: "#fff",
          padding: "10px 18px",
          fontSize: 12.5,
          fontWeight: 700,
          borderRadius: 6,
          cursor: "pointer",
          display: "flex",
          gap: 6,
          alignItems: "center",
        }}
      >
        {sendPrefix}
        {sendLabel}
      </button>
    </footer>
  );
}

function ComposerTool({ children }) {
  return (
    <button
      style={{
        width: 36,
        height: 36,
        background: "var(--mz-bg-card-2)",
        border: "1px solid var(--mz-rule)",
        color: "var(--mz-fg)",
        borderRadius: 6,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
