"use client";

/* Cartinha 4:5 · componente único com 2 variações
 * 1:1 com Designer V1.2 (02-cartinha-2v.html)
 *
 * Variação A · Cinema (UB Oficial)
 *   Fundo escuro UB radial gradient (#002a7b → #001540 → #000820)
 *   Borda amarela #FFCC00 2px · escudo UB · OVR Bebas Neue grande
 *   Use: mídia, redes sociais, telão de convenção, álbum eleitos
 *
 * Variação B · Minimal (Densidade Operacional)
 *   Fundo claro #fafafa · banda lateral 6px colorida pelo tier
 *   Use: dentro do produto, listas, ranking, dossiê comparado, briefings
 *
 * Quando dado falta (decisão César 25/04):
 *   - Mostrar "EM CONSTRUÇÃO" no lugar do OVR · nunca "0"
 *   - Stats viram "··" (cinza)
 *   - opacity 0.92 · escudo dimmed
 */

import { TIER_COLORS, tierFromOvr } from "./dados";

const SUBSCORES = ["Lid", "Mid", "Bas", "Cap"];

export function Cartinha({
  variacao = "A",
  politico,
  width = 320,
  compact = false,
}) {
  if (variacao === "B") return <CartinhaB politico={politico} width={width} compact={compact} />;
  return <CartinhaA politico={politico} width={width} />;
}

/* ============ VARIAÇÃO A · Cinema UB Oficial ============ */
function CartinhaA({ politico: p, width }) {
  const isPlaceholder = p.ovr == null;
  const tier = p.tier ?? tierFromOvr(p.ovr);
  const height = (width * 5) / 4;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 18,
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform 240ms cubic-bezier(.2,.8,.3,1), box-shadow 240ms",
        background: "radial-gradient(80% 80% at 50% 0%, #002a7b 0%, #001540 60%, #000820 100%)",
        border: "2px solid #FFCC00",
        boxShadow:
          "0 0 0 2px rgba(0,0,0,0.6), 0 12px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,204,0,0.5)",
        opacity: isPlaceholder ? 0.92 : 1,
      }}
    >
      {/* Shine top + halftone amarelo canto */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 60% at 50% -10%, rgba(255,204,0,0.18), transparent 60%), repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 6px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -20,
          right: -20,
          width: 160,
          height: 160,
          backgroundImage: "radial-gradient(circle, rgba(255,204,0,0.5) 1.5px, transparent 1.6px)",
          backgroundSize: "8px 8px",
          opacity: 0.3,
          pointerEvents: "none",
        }}
      />

      {/* Top: tier OVR + escudo */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          zIndex: 3,
        }}
      >
        <div
          style={{
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: 38,
            fontWeight: 700,
            color: isPlaceholder ? "rgba(255,204,0,0.4)" : "#FFCC00",
            lineHeight: 1,
            letterSpacing: "0.04em",
            textShadow: isPlaceholder
              ? "none"
              : "0 0 14px rgba(255,204,0,0.6), 0 2px 0 rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "baseline",
            gap: 4,
          }}
        >
          <span style={{ fontSize: isPlaceholder ? 22 : 30, letterSpacing: isPlaceholder ? "-0.02em" : undefined }}>
            {isPlaceholder ? "—" : p.ovr}
          </span>
          <span
            style={{
              fontSize: 9,
              color: "rgba(255,204,0,0.7)",
              letterSpacing: "0.18em",
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              alignSelf: "flex-start",
              marginTop: 6,
            }}
          >
            {isPlaceholder ? "EM CONSTRUÇÃO" : "OVR"}
          </span>
        </div>
        <EscudoUB variacao="A" />
      </div>

      {/* Cargo tag */}
      <span
        style={{
          position: "absolute",
          top: 60,
          left: 16,
          zIndex: 3,
          fontSize: 9.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 700,
          color: "#FFCC00",
          padding: "3px 8px",
          background: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,204,0,0.4)",
          borderRadius: 999,
        }}
      >
        {p.cargo}
      </span>

      {/* Foto silhouette */}
      <div
        style={{
          position: "absolute",
          inset: "78px 16px 132px 16px",
          borderRadius: 12,
          overflow: "hidden",
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background:
              "radial-gradient(ellipse 60% 70% at 50% 30%, rgba(255,255,255,0.06), transparent 70%), linear-gradient(180deg, #1a3a8a 0%, #0a1f5a 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <span
            style={{
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: 90,
              color: "#FFCC00",
              textShadow: "0 4px 24px rgba(0,0,0,0.6), 0 0 30px rgba(255,204,0,0.3)",
              letterSpacing: "0.04em",
              lineHeight: 1,
              opacity: isPlaceholder ? 0.4 : 0.85,
            }}
          >
            {p.iniciais}
          </span>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "60%",
              background: "linear-gradient(180deg, transparent, rgba(0,8,32,0.95))",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* Nome + meta */}
      <div style={{ position: "absolute", left: 16, right: 16, bottom: 90, zIndex: 3 }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            color: "#fff",
            lineHeight: 1.05,
            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          {p.nome}
          <br />
          {p.sobrenome}
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 6,
            fontSize: 10,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: "0.04em",
          }}
        >
          <b style={{ color: "#FFCC00", fontWeight: 700 }}>{p.uf}</b>
          <span>·</span>
          <span>{p.partido}</span>
          <span>·</span>
          <span>{p.mandatoLabel}</span>
        </div>
      </div>

      {/* Stats grid 4x1 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 3,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          background: "rgba(0,0,0,0.4)",
          padding: "10px 16px 12px",
          borderTop: "1px solid rgba(255,204,0,0.25)",
        }}
      >
        {SUBSCORES.map((k) => {
          const v = p.stats?.[k];
          return (
            <div
              key={k}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: "rgba(255,204,0,0.85)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                }}
              >
                {k}
              </span>
              <span
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 17,
                  fontWeight: 800,
                  color: v != null ? "#fff" : "rgba(255,255,255,0.35)",
                  lineHeight: 1,
                }}
              >
                {v != null ? v : "··"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ VARIAÇÃO B · Minimal ============ */
function CartinhaB({ politico: p, width, compact }) {
  const isPlaceholder = p.ovr == null;
  const tier = p.tier ?? tierFromOvr(p.ovr) ?? "C";
  const tierColor = TIER_COLORS[tier];
  const height = (width * 5) / 4;
  const photoSize = compact ? 64 : 90;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 18,
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform 240ms cubic-bezier(.2,.8,.3,1), box-shadow 240ms",
        background: "#fafafa",
        border: "1px solid #e2e2e2",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        color: "#111",
        opacity: isPlaceholder ? 0.92 : 1,
      }}
    >
      {/* Banda lateral colorida pelo tier */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: tierColor,
        }}
      />

      {/* Top: tier letter + OVR + escudo */}
      <div
        style={{
          padding: "16px 18px 12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span
            style={{
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: 28,
              fontWeight: 700,
              color: isPlaceholder ? "rgba(0,0,0,0.3)" : tierColor,
              lineHeight: 1,
              letterSpacing: "0.05em",
              opacity: isPlaceholder ? 0.3 : 1,
            }}
          >
            {isPlaceholder ? "—" : tier}
          </span>
          <div>
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 38,
                fontWeight: 800,
                color: isPlaceholder ? "#999" : "#111",
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              {isPlaceholder ? "··" : p.ovr}
            </div>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: isPlaceholder ? "#aaa" : "#888",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginTop: 4,
                display: "block",
              }}
            >
              {isPlaceholder ? "EM CONSTRUÇÃO" : "OVR"}
            </span>
          </div>
        </div>
        <EscudoUB variacao="B" dimmed={isPlaceholder} />
      </div>

      {/* Foto + nome */}
      <div
        style={{
          padding: compact ? "0 14px 10px 18px" : "4px 18px 14px 24px",
          display: "flex",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: photoSize,
            height: photoSize,
            borderRadius: "50%",
            background: isPlaceholder
              ? "#ddd"
              : `linear-gradient(135deg, ${tierColor}, #001540)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: isPlaceholder ? "none" : "inset 0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          <span
            style={{
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: compact ? 30 : 44,
              color: isPlaceholder ? "#999" : "#FFCC00",
              letterSpacing: "0.04em",
            }}
          >
            {p.iniciais}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: compact ? 14 : 19,
              fontWeight: 800,
              letterSpacing: "-0.015em",
              color: "#111",
              lineHeight: 1.1,
              textWrap: "pretty",
            }}
          >
            {p.nome}
            {!compact && (
              <>
                <br />
                {p.sobrenome}
              </>
            )}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#666",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            {p.cargo}
          </div>
          <div
            style={{
              fontSize: compact ? 10 : 11,
              color: isPlaceholder ? "#888" : "#444",
              marginTop: 6,
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <b
              style={{
                color: isPlaceholder
                  ? "#888"
                  : (p.delta || "").startsWith("+")
                  ? "#16a34a"
                  : (p.delta || "").startsWith("−")
                  ? "#dc2626"
                  : "#003399",
                fontWeight: 700,
              }}
            >
              {p.delta}
            </b>
            {p.deltaUnit && !isPlaceholder && (
              <>
                <span style={{ color: "#666" }}>7d</span>
                <span style={{ width: 3, height: 3, background: "#888", borderRadius: "50%" }} />
                <span>{p.deltaUnit}</span>
              </>
            )}
            {!p.deltaUnit && !isPlaceholder && <span>7d</span>}
          </div>
        </div>
      </div>

      {/* Stats grid 4x1 */}
      {!compact && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            borderTop: "1px solid #e2e2e2",
            background: "#fff",
            padding: "12px 18px 14px 24px",
            gap: 1,
          }}
        >
          {SUBSCORES.map((k) => {
            const v = p.stats?.[k];
            return (
              <div
                key={k}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 1,
                }}
              >
                <span
                  style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    color: "#888",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 16,
                    fontWeight: 700,
                    color: v != null ? "#111" : "#bbb",
                    lineHeight: 1.2,
                  }}
                >
                  {v != null ? v : "··"}
                </span>
                <span
                  style={{
                    width: "100%",
                    height: 3,
                    background: "#e2e2e2",
                    borderRadius: 1.5,
                    marginTop: 4,
                    overflow: "hidden",
                    display: "block",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      height: "100%",
                      background: tierColor,
                      width: `${v != null ? v : 0}%`,
                    }}
                  />
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Foot · gradient */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: isPlaceholder
            ? "linear-gradient(90deg, #ccc, #eee)"
            : `linear-gradient(90deg, ${tierColor}, #FFCC00)`,
        }}
      />
    </div>
  );
}

/* ============ ESCUDO UB ============ */
function EscudoUB({ variacao, dimmed }) {
  if (variacao === "A") {
    return (
      <div
        style={{
          width: 38,
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #FFCC00, #f0a500)",
          borderRadius: 6,
          boxShadow: "0 0 12px rgba(255,204,0,0.35)",
        }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="#003399">
          <path d="M12 2L4 5v6.5C4 16.2 7.4 20.5 12 22c4.6-1.5 8-5.8 8-10.5V5l-8-3z" />
          <text x="12" y="15" textAnchor="middle" fontSize="9" fontWeight="900" fill="#FFCC00" fontFamily="Inter">
            UB
          </text>
        </svg>
      </div>
    );
  }
  // Variação B - escudo amarelo com texto azul
  return (
    <div
      style={{
        width: 36,
        height: 36,
        background: "#003399",
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: dimmed ? 0.5 : 1,
      }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path
          d="M12 2L4 5v6.5C4 16.2 7.4 20.5 12 22c4.6-1.5 8-5.8 8-10.5V5l-8-3z"
          fill="#FFCC00"
        />
        <text x="12" y="15" textAnchor="middle" fontSize="9" fontWeight="900" fill="#003399" fontFamily="Inter">
          UB
        </text>
      </svg>
    </div>
  );
}
