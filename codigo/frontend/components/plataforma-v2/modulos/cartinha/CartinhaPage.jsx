"use client";

/* Cartinha 4:5 · página showcase
 * 1:1 com Designer V1.2 (02-cartinha-2v.html)
 *
 * 4 seções:
 *   1. Variação A · Cinema (4 exemplares)
 *   2. Variação B · Minimal (4 exemplares)
 *   3. Uso · Bancada SP em Mosaico (12 cartinhas B compactos)
 *   4. Comparativo (4 cells: A / B / Tiers / Em construção)
 */

import { Cartinha } from "./Cartinha";
import { DEMOS_CANONICOS, BANCADA_SP } from "./dados";

export function CartinhaPage() {
  return (
    <div
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -200px, rgba(0,42,123,0.18), transparent), var(--mz-bg-page)",
        padding: "32px 40px 60px",
        color: "var(--mz-fg)",
        minHeight: "100vh",
        overflowY: "auto",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 28,
          gap: 32,
          paddingBottom: 18,
          borderBottom: "1px solid var(--mz-rule)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--mz-fg-strong)",
              margin: "0 0 4px",
            }}
          >
            Cartinha 4:5 · Card-de-Político
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--mz-fg-muted)",
              maxWidth: 720,
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Componente viral do produto · vira screenshot, vira meme, vira{" "}
            <b style={{ color: "var(--mz-tenant-accent)" }}>"compartilhe seu OVR"</b>.{" "}
            <b style={{ color: "var(--mz-tenant-accent)" }}>Proporção 4:5</b> (320×400px) por
            compatibilidade com Instagram/Stories.{" "}
            <b style={{ color: "var(--mz-tenant-accent)" }}>Decisão César 25/04:</b> não
            inventar score; quando dado falta, mostra "em construção" - nunca "0".
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 11,
            color: "var(--mz-fg-faint)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          <span>
            <b style={{ color: "var(--mz-fg-strong)" }}>2</b> variações
          </span>
          <span>
            <b style={{ color: "var(--mz-fg-strong)" }}>4</b> tiers (S · A · B · C)
          </span>
          <span>
            <b style={{ color: "var(--mz-fg-strong)" }}>4:5</b> ratio
          </span>
          <span>
            <b style={{ color: "var(--mz-fg-strong)" }}>320×400</b>px
          </span>
        </div>
      </header>

      {/* SEC · VARIAÇÃO A */}
      <Section
        num="VARIAÇÃO · A"
        titulo="UB Oficial - Cinematográfica"
        badge="Recomendada para Mídia"
        sub={
          <>
            <b style={{ color: "var(--mz-fg)", fontWeight: 600 }}>Linguagem:</b> escudo, cores
            oficiais UB (#003399 + #FFCC00), texto em <b style={{ color: "var(--mz-fg)" }}>Bebas Neue</b>
            {" "}e tipo grande. Usar quando o card sai do produto: pra imprensa, redes sociais
            oficiais, álbum de figurinhas dos eleitos do partido, telões em convenção.{" "}
            <b style={{ color: "var(--mz-fg)" }}>Não use</b> dentro do dossiê - fica
            visualmente competitivo demais com o painel.
          </>
        }
      >
        <Stage>
          {DEMOS_CANONICOS.map((p) => (
            <CardWithLabel key={`A-${p.id}`} variacao="A" politico={p} />
          ))}
        </Stage>
      </Section>

      {/* SEC · VARIAÇÃO B */}
      <Section
        num="VARIAÇÃO · B"
        titulo="Minimal - Densidade Operacional"
        badge="Recomendada Dentro do Produto"
        sub={
          <>
            <b style={{ color: "var(--mz-fg)", fontWeight: 600 }}>Linguagem:</b> fundo claro,
            tipo grande, banda lateral colorida pelo tier (S/A/B/C/D). Usar dentro de listas,
            ranking, dossiê comparado, briefings impressos.{" "}
            <b style={{ color: "var(--mz-fg)" }}>Compatível com modo claro</b>; legível em
            densidade alta; cabe 6 por linha sem competir com o resto da UI.
          </>
        }
      >
        <Stage>
          {DEMOS_CANONICOS.map((p) => (
            <CardWithLabel key={`B-${p.id}`} variacao="B" politico={p} />
          ))}
        </Stage>
      </Section>

      {/* SEC · USO 01 · Bancada SP */}
      <Section
        num="USO · 01"
        titulo="Bancada SP em Mosaico"
        badge="Aplicação dentro do produto"
        sub={
          <>
            Como Variação B aparece dentro do produto: lista de eleitos da bancada estadual SP,
            em densidade alta, ordenada por OVR. Click → abre Dossiê.
          </>
        }
      >
        <div
          style={{
            background: "var(--mz-bg-card)",
            border: "1px solid var(--mz-rule)",
            borderRadius: 12,
            padding: "24px 28px",
          }}
        >
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--mz-fg-strong)",
              margin: "0 0 18px",
              letterSpacing: "0.02em",
            }}
          >
            Bancada União Brasil · São Paulo · 12 eleitos
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 12,
            }}
          >
            {BANCADA_SP.map((p, i) => (
              <Cartinha
                key={`bsp-${i}`}
                variacao="B"
                politico={{
                  nome: p.nome,
                  cargo: p.cargo,
                  iniciais: p.ini,
                  ovr: p.ovr,
                  tier: p.tier,
                  delta: p.delta,
                  stats: { Lid: null, Mid: null, Bas: null, Cap: null },
                }}
                width={undefined}
                compact
              />
            ))}
          </div>
        </div>
      </Section>

      {/* SEC · COMPARAR */}
      <Section num="COMPARAR" titulo="Quando usar cada uma">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <CompareCell titulo="Variação A · Cinema">
            <li>
              <b>Mídia & Marketing</b> - convenção, redes sociais, telão
            </li>
            <li>
              <b>Cards de elite</b> - Senadores, Govs, Top OVR
            </li>
            <li>
              <b>1 por tela</b> - herói, shareable
            </li>
            <li>Fundo escuro UB + amarelo dourado</li>
            <li>Tipo Bebas Neue (impacto)</li>
          </CompareCell>
          <CompareCell titulo="Variação B · Minimal">
            <li>
              <b>Dentro do produto</b> - listas, ranking, dossiê
            </li>
            <li>
              <b>Densidade alta</b> - 6+ por linha
            </li>
            <li>
              <b>Briefings impressos</b> - papel timbrado
            </li>
            <li>Fundo claro · banda colorida por tier</li>
            <li>Compatível com modo claro</li>
          </CompareCell>
          <CompareCell titulo="Tiers (ambas)">
            <li>
              <b>S</b> - ≥90 OVR (amarelo UB)
            </li>
            <li>
              <b>A</b> - 80-89 (verde)
            </li>
            <li>
              <b>B</b> - 70-79 (azul UB)
            </li>
            <li>
              <b>C</b> - 60-69 (laranja)
            </li>
            <li>
              <b>D</b> - &lt;60 (vermelho · alerta)
            </li>
          </CompareCell>
          <CompareCell titulo="Em construção (decisão 25/04)">
            <li>
              Quando dado falta: <b>nunca mostrar 0</b>
            </li>
            <li>
              Mostrar reticências{" "}
              <code style={{ background: "#000", padding: "1px 4px", borderRadius: 2 }}>··</code>
            </li>
            <li>
              Label "<b>EM CONSTRUÇÃO</b>" no lugar do OVR
            </li>
            <li>Card opacity 0.92, escudo dimmed</li>
            <li>Não bloqueia clique - abre dossiê com banner</li>
          </CompareCell>
        </div>
      </Section>
    </div>
  );
}

/* ============ HELPERS ============ */

function Section({ num, titulo, badge, sub, children }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 4 }}>
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--mz-tenant-accent)",
            letterSpacing: "0.10em",
          }}
        >
          {num}
        </span>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.015em",
            color: "var(--mz-fg-strong)",
            margin: 0,
          }}
        >
          {titulo}
        </h2>
        {badge && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 999,
              background: "var(--mz-tenant-primary-soft)",
              color: "var(--mz-tenant-accent)",
              letterSpacing: "0.04em",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {sub && (
        <p
          style={{
            fontSize: 13,
            color: "var(--mz-fg-muted)",
            maxWidth: 820,
            lineHeight: 1.6,
            margin: "0 0 22px",
            paddingLeft: 32,
            borderLeft: "2px solid var(--mz-rule)",
          }}
        >
          {sub}
        </p>
      )}
      {children}
    </section>
  );
}

function Stage({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 320px)",
        gap: 20,
        justifyContent: "start",
        padding: "20px 0",
      }}
    >
      {children}
    </div>
  );
}

function CardWithLabel({ variacao, politico }) {
  return (
    <div>
      <Cartinha variacao={variacao} politico={politico} width={320} />
      <span
        style={{
          display: "block",
          marginTop: 10,
          fontSize: 11,
          color: "var(--mz-fg-faint)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        <b
          style={{
            color: "var(--mz-fg-strong)",
            display: "block",
            fontSize: 12,
            letterSpacing: "0.02em",
            textTransform: "none",
            marginBottom: 2,
          }}
        >
          {politico.tier ? `Tier ${politico.tier}` : "Em construção"}
        </b>
        {politico.label?.includes("·") ? politico.label.split("·")[1].trim() : politico.label}
      </span>
    </div>
  );
}

function CompareCell({ titulo, children }) {
  const items = Array.isArray(children) ? children : [children];
  const last = items.length - 1;
  return (
    <div
      style={{
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderRadius: 8,
        padding: 14,
        fontSize: 11,
        color: "var(--mz-fg-muted)",
        lineHeight: 1.55,
      }}
    >
      <h4
        style={{
          fontSize: 10.5,
          letterSpacing: "0.10em",
          color: "var(--mz-tenant-accent)",
          textTransform: "uppercase",
          margin: "0 0 8px",
          fontWeight: 700,
        }}
      >
        {titulo}
      </h4>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((child, i) => (
          <li
            key={i}
            style={{
              padding: "4px 0",
              borderBottom: i === last ? 0 : "1px dashed var(--mz-rule)",
              display: "flex",
              gap: 6,
              color: "var(--mz-fg-muted)",
            }}
          >
            <span style={{ color: "var(--mz-tenant-accent)", fontWeight: 700 }}>·</span>
            <span style={{ flex: 1, color: "var(--mz-fg-muted)" }}>
              {child.props ? child.props.children : child}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
