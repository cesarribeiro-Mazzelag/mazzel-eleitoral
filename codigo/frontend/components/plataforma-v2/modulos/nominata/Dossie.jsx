"use client";

/* Nominata · Aba 04 · Dossiê Comissão (foco: Tatuí, caso crítico)
 * 1:1 com Designer (07-saude-nominatas.html linhas 223-289 + app.js 426-606)
 *
 * 7 seções: identificação · sub-medidas · sinalizações · pulso filiação ·
 * cronologia · conformidade jurídica · recomendações Mazzel
 */

import { NOMINATA_DATA } from "./dados";
import { calcScore, tierColor, tierFromScore, fmt } from "./helpers";

const TOC_ITEMS = [
  { num: "01", label: "Identificação", active: true },
  { num: "02", label: "Sub-medidas do score" },
  { num: "03", label: "Sinalizações ativas" },
  { num: "04", label: "Pulso de filiação" },
  { num: "05", label: "Cronologia da comissão" },
  { num: "06", label: "Conformidade jurídica" },
  { num: "07", label: "Recomendações Mazzel" },
];

// Pulso de filiação · 20 dias (pico 412 no índice 12 = 18/03)
const PULSE_DATA = [3, 5, 4, 7, 6, 5, 8, 4, 6, 5, 7, 4, 412, 8, 6, 5, 7, 6, 4, 5];

const TIMELINE = [
  {
    tipo: "ok",
    stage: "Comissão constituída",
    when: "12/JUN/2024",
    body: "Eleita em convenção com 142 filiados presentes. Quórum regular. Ata protocolada na Justiça Eleitoral.",
  },
  {
    tipo: "warn",
    stage: "Prestação de contas TSE 2024",
    when: "VENCEU 31/DEZ/2024",
    body: "Prestação não protocolada · em mora há 4 meses. Risco de indeferimento da nominata 2026 conforme Resolução TSE 23.553/2017.",
  },
  {
    tipo: "danger",
    stage: "Pulso de filiação anômalo",
    when: "18/MAR/2025",
    body: "412 novos filiados em 1 dia · pico isolado · 21× a média móvel. Cruzamento com base estadual em andamento.",
  },
  {
    tipo: "warn",
    stage: "Nominata pré-2026 publicada",
    when: "02/ABR/2026",
    body: "22 candidatos. Cota de gênero 18% (abaixo dos 30% legais). 9 sem domicílio eleitoral local. 4 com Ficha Limpa pendente.",
  },
  {
    tipo: "ok",
    stage: "Próximo evento estatutário",
    when: "JUN/2026",
    body: "Convenção municipal · janela de 5/jun a 5/ago para registro de candidaturas (TSE).",
  },
];

const JURIDICA = [
  {
    tipo: "danger",
    label: "Lei 9.504/97 · cota de gênero",
    valor: "FORA · 18% < 30%",
    desc: "Risco de impugnação da chapa por TSE/MP Eleitoral. Mitigação: substituir 3 candidatos por candidaturas femininas até registro.",
  },
  {
    tipo: "danger",
    label: "LC 135/2010 · Ficha Limpa",
    valor: "4 PENDÊNCIAS",
    desc: "Cruzamento CNJ × TJ-SP × TRE pendente. Validação manual obrigatória antes do registro.",
  },
  {
    tipo: "danger",
    label: "Res. TSE 23.553/17 · prestação de contas",
    valor: "EM MORA · 4 MESES",
    desc: "Sem protocolo TSE 2024. Recomenda-se regularização imediata via PSPN/Sistema TSE.",
  },
  {
    tipo: "warn",
    label: "Estatuto art. 38 · vinculação local",
    valor: "9 / 22 SEM DOMICÍLIO",
    desc: "9 candidatos com domicílio eleitoral fora de Tatuí. 6 com origem geográfica em Sorocaba (cluster suspeito).",
  },
];

const RECOMENDACOES = [
  "Regularizar prestação de contas TSE 2024 - protocolar via PSPN nos próximos 7 dias para evitar indeferimento da nominata.",
  "Auditar pulso de filiação 18/03 - cruzar 412 nomes com base estadual e verificar abonadores. Convocar presidência para esclarecimento.",
  "Substituir candidaturas para conformidade de gênero - adicionar 3 candidatas mulheres para atingir 30% mínimo legal.",
  "Validar Ficha Limpa - finalizar cruzamento dos 4 candidatos pendentes antes de 5/jun (janela de registro).",
  "Reanalisar cluster Sorocaba - entrevistar os 6 candidatos para verificar vínculo real com Tatuí.",
  "Notificar Comissão Estadual UB-SP - submeter dossiê para deliberação em reunião executiva.",
];

const RECOMENDACAO_BOLD = [
  "Regularizar prestação de contas TSE 2024",
  "Auditar pulso de filiação 18/03",
  "Substituir candidaturas para conformidade de gênero",
  "Validar Ficha Limpa",
  "Reanalisar cluster Sorocaba",
  "Notificar Comissão Estadual UB-SP",
];

export function Dossie() {
  const c = NOMINATA_DATA.COMISSOES.find((x) => x.id === "tatui");
  const score = calcScore(c.scores);

  return (
    <div
      className="grid h-full"
      style={{ gridTemplateColumns: "240px 1fr" }}
    >
      {/* TOC esquerda */}
      <aside
        style={{
          background: "var(--mz-bg-sidebar)",
          borderRight: "1px solid var(--mz-rule)",
          overflowY: "auto",
          padding: "22px 16px",
        }}
      >
        <SectionHeader>Dossiê · navegação</SectionHeader>
        {TOC_ITEMS.map((t) => (
          <TocItem key={t.num} num={t.num} label={t.label} active={t.active} />
        ))}
        <SectionHeader style={{ marginTop: 26 }}>Outras comissões</SectionHeader>
        <TocItem num="→" label="Bauru (saudável)" />
        <TocItem num="→" label="Marília (atenção)" />
      </aside>

      {/* Body */}
      <div
        style={{
          overflowY: "auto",
          padding: 0,
          background: "var(--mz-bg-page)",
        }}
      >
        {/* HERO */}
        <div
          style={{
            padding: "28px 32px",
            borderBottom: "1px solid var(--mz-rule)",
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: 22,
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  padding: "3px 9px",
                  background: "var(--mz-bg-card)",
                  borderRadius: 4,
                  color: "var(--mz-fg-faint)",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                DOS-NOMINATA-TATUI-2026
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  background: "var(--mz-danger-soft)",
                  color: "var(--mz-danger)",
                }}
              >
                DILIGÊNCIA ABERTA
              </span>
            </div>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: "var(--mz-fg-strong)",
                margin: "6px 0 8px",
                letterSpacing: "-0.02em",
              }}
            >
              {c.nm}, {c.uf}
            </h1>
            <div style={{ fontSize: 12, color: "var(--mz-fg-muted)" }}>
              Comissão Municipal União Brasil · presidida por{" "}
              <b style={{ color: "var(--mz-fg)" }}>{c.pres.nm}</b>{" "}
              · mandato <b style={{ color: "var(--mz-fg)" }}>{c.mandato}</b>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid var(--mz-rule)",
              }}
            >
              <HeroMeta label="População"          value={`${fmt(c.pop)} hab`} />
              <HeroMeta label="Região"             value={c.area} />
              <HeroMeta label="Filiados"           value={fmt(c.filiados)} />
              <HeroMeta label="Candidatos nominados" value={c.candidatos} />
            </div>
          </div>

          {/* Score card */}
          <div
            style={{
              background: "var(--mz-bg-card)",
              border: "1px solid var(--mz-rule)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                color: "var(--mz-fg-faint)",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Score Saúde Comissão
            </div>
            <div
              style={{
                fontFamily: "Bebas Neue, sans-serif",
                fontSize: 64,
                lineHeight: 1,
                letterSpacing: "0.02em",
                color: "#f87171",
              }}
            >
              {score}
              <span
                style={{
                  fontSize: 16,
                  color: "var(--mz-fg-faint)",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                }}
              >
                {" "}
                /100
              </span>
            </div>
            <div
              style={{
                fontSize: 14,
                color: "var(--mz-danger)",
                fontWeight: 700,
                margin: "8px 0 4px",
              }}
            >
              CRÍTICA · 6 sinalizações
            </div>
            <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", lineHeight: 1.45 }}>
              Comissão fora dos parâmetros estatutários e legais em pelo menos quatro das sete
              sub-medidas. Recomenda-se intervenção imediata.
            </div>
            <hr style={{ border: 0, borderTop: "1px solid var(--mz-rule)", margin: "14px 0" }} />
            <div style={{ fontSize: 10.5, color: "var(--mz-fg-faint)", lineHeight: 1.5 }}>
              {c.ult_atualizacao}
            </div>
          </div>
        </div>

        {/* SEC 02 · sub-medidas */}
        <Section num="02" title="Sub-medidas do score" extra="média ponderada · 7 critérios">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {NOMINATA_DATA.SUBMEDIDAS.map((sm) => {
              const v = c.scores[sm.key];
              const t = tierFromScore(v);
              return (
                <Cell key={sm.key} tipo={t === "crit" ? "danger" : t === "high" ? "warn" : null}>
                  <CellLbl>
                    {sm.nm} · peso {sm.peso}
                  </CellLbl>
                  <div
                    style={{
                      fontFamily: "Bebas Neue, sans-serif",
                      fontSize: 28,
                      lineHeight: 1,
                      color: tierColor(t),
                      letterSpacing: "0.02em",
                    }}
                  >
                    {v}
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--mz-fg-faint)",
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      /100
                    </span>
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--mz-fg-muted)", marginTop: 4, lineHeight: 1.4 }}>
                    {sm.desc}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      height: 4,
                      background: "var(--mz-bg-elevated)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${v}%`,
                        background: tierColor(t),
                      }}
                    />
                  </div>
                </Cell>
              );
            })}
          </div>
        </Section>

        {/* SEC 03 · sinalizações */}
        <Section num="03" title="Sinalizações ativas" extra={`${c.flags.length} flags abertas`}>
          {c.flags.map((f, i) => (
            <AlertTile key={i} tipo={f.tipo === "danger" ? "crit" : "high"} label={f.label} />
          ))}
        </Section>

        {/* SEC 04 · pulso filiação */}
        <Section
          num="04"
          title="Pulso de filiação · 20 dias"
          extra="eixo: filiações/dia · pico de 412 em 18/03"
        >
          <div
            style={{
              background: "var(--mz-bg-card)",
              border: "1px solid var(--mz-rule)",
              borderRadius: 10,
              padding: 18,
            }}
          >
            <PulseSpark data={PULSE_DATA} />
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                background: "var(--mz-danger-soft)",
                borderRadius: 8,
                border: "1px solid rgba(248,113,113,0.25)",
                fontSize: 11.5,
                color: "var(--mz-fg)",
                lineHeight: 1.55,
              }}
            >
              <b style={{ color: "var(--mz-danger)" }}>Padrão atípico detectado · ALN-3829.</b>{" "}
              412 filiações em 1 dia (18/03/2025) · 21× a média móvel histórica. Pode indicar
              mobilização legítima OU lista pré-fabricada para garantir maioria em convenção.
              Investigar manualmente: cruzar nomes com base estadual e verificar abonadores.
            </div>
          </div>
        </Section>

        {/* SEC 05 · cronologia */}
        <Section num="05" title="Cronologia da comissão">
          <div
            style={{
              position: "relative",
              padding: "8px 0 8px 28px",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 9,
                top: 8,
                bottom: 8,
                width: 2,
                background: "var(--mz-rule)",
              }}
            />
            {TIMELINE.map((it, i) => (
              <TimelineItem key={i} {...it} />
            ))}
          </div>
        </Section>

        {/* SEC 06 · jurídica */}
        <Section num="06" title="Conformidade jurídica">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {JURIDICA.map((j, i) => (
              <Cell key={i} tipo={j.tipo}>
                <CellLbl>{j.label}</CellLbl>
                <div
                  style={{
                    fontFamily: "Bebas Neue, sans-serif",
                    fontSize: 22,
                    lineHeight: 1,
                    color: j.tipo === "danger" ? "var(--mz-danger)" : "var(--mz-warn)",
                    letterSpacing: "0.02em",
                    marginTop: 4,
                  }}
                >
                  {j.valor}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--mz-fg-muted)",
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}
                >
                  {j.desc}
                </div>
              </Cell>
            ))}
          </div>
        </Section>

        {/* SEC 07 · recomendações */}
        <Section num="07" title="Recomendações Mazzel" extra="priorizadas" lastSection>
          <div
            style={{
              background: "var(--mz-bg-card)",
              borderLeft: "4px solid var(--mz-tenant-accent)",
              borderRadius: "0 10px 10px 0",
              padding: "16px 20px",
            }}
          >
            <ol
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 12.5,
                color: "var(--mz-fg)",
                lineHeight: 1.7,
              }}
            >
              {RECOMENDACOES.map((r, i) => {
                const bold = RECOMENDACAO_BOLD[i];
                const tail = r.replace(bold, "").trim();
                return (
                  <li key={i}>
                    <b>{bold}</b> {tail}
                  </li>
                );
              })}
            </ol>
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ============ SUBCOMPONENTES ============ */

function SectionHeader({ children, style }) {
  return (
    <h3
      style={{
        fontSize: 9.5,
        letterSpacing: "0.16em",
        color: "var(--mz-fg-faint)",
        textTransform: "uppercase",
        fontWeight: 700,
        margin: "0 0 14px",
        padding: "0 4px",
        ...style,
      }}
    >
      {children}
    </h3>
  );
}

function TocItem({ num, label, active }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr",
        gap: 8,
        padding: active ? "8px 12px 8px 9px" : "8px 12px",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 11.5,
        color: active ? "var(--mz-fg-strong)" : "var(--mz-fg-muted)",
        background: active ? "var(--mz-tenant-primary-soft)" : "transparent",
        borderLeft: active ? "3px solid var(--mz-tenant-accent)" : undefined,
        transition: "all 100ms",
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          color: active ? "var(--mz-tenant-accent)" : "var(--mz-fg-faint)",
          fontWeight: 700,
        }}
      >
        {num}
      </span>
      <span>{label}</span>
    </div>
  );
}

function HeroMeta({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.14em",
          color: "var(--mz-fg-faint)",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: "var(--mz-fg-strong)", fontWeight: 600, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function Section({ num, title, extra, lastSection, children }) {
  return (
    <section
      style={{
        padding: "24px 32px",
        borderBottom: lastSection ? "0" : "1px solid var(--mz-rule)",
      }}
    >
      <h2
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--mz-fg-strong)",
          margin: "0 0 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          letterSpacing: "-0.01em",
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            color: "var(--mz-tenant-accent)",
            padding: "3px 7px",
            background: "var(--mz-tenant-accent-soft)",
            borderRadius: 4,
            fontWeight: 700,
            letterSpacing: "0.06em",
          }}
        >
          {num}
        </span>
        {title}
        {extra && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              color: "var(--mz-fg-faint)",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            {extra}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

function Cell({ tipo, children }) {
  const bg = tipo === "danger" ? "var(--mz-danger-soft)" :
             tipo === "warn"   ? "var(--mz-warn-soft)"   :
                                 "var(--mz-bg-card)";
  const border = tipo === "danger" ? "rgba(248,113,113,0.25)" :
                 tipo === "warn"   ? "rgba(251,191,36,0.25)" :
                                     "var(--mz-rule)";
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: 14,
      }}
    >
      {children}
    </div>
  );
}

function CellLbl({ children }) {
  return (
    <div
      style={{
        fontSize: 9.5,
        letterSpacing: "0.14em",
        color: "var(--mz-fg-faint)",
        textTransform: "uppercase",
        fontWeight: 700,
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

function AlertTile({ tipo, label }) {
  const isCrit = tipo === "crit";
  const ic = isCrit ? "✕" : "!";
  const borderLeft = isCrit ? "#dc2626" : "#f59e0b";
  const icBg = isCrit ? "var(--mz-danger-soft)" : "var(--mz-warn-soft)";
  const icColor = isCrit ? "var(--mz-danger)" : "var(--mz-warn)";
  const [titulo, ...rest] = label.split(" · ");
  return (
    <div
      style={{
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderLeft: `3px solid ${borderLeft}`,
        borderRadius: 10,
        padding: "12px 14px",
        display: "grid",
        gridTemplateColumns: "36px 1fr",
        gap: 12,
        alignItems: "start",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 14,
          background: icBg,
          color: icColor,
        }}
      >
        {ic}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mz-fg-strong)" }}>{titulo}</div>
        <div style={{ fontSize: 11.5, color: "var(--mz-fg-muted)", marginTop: 4, lineHeight: 1.5 }}>
          {label}
        </div>
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            color: "var(--mz-fg-faint)",
            marginTop: 6,
            letterSpacing: "0.04em",
          }}
        >
          FONTE: cron Mazzel · LÓGICA: validador estatutário/legal · CONFIANÇA: alta
        </div>
      </div>
    </div>
  );
}

function PulseSpark({ data }) {
  const max = Math.max(...data);
  const sparkW = 600;
  const sparkH = 100;
  const barW = sparkW / data.length - 2;

  return (
    <svg viewBox={`0 0 ${sparkW} ${sparkH + 24}`} width="100%" preserveAspectRatio="none" style={{ display: "block" }}>
      <line x1="0" y1={sparkH} x2={sparkW} y2={sparkH} stroke="var(--mz-rule)" strokeWidth="0.5" />
      {data.map((v, i) => {
        const h = (v / max) * sparkH;
        const x = i * (sparkW / data.length);
        const isPulse = v > 50;
        return (
          <rect
            key={i}
            x={x}
            y={sparkH - h}
            width={barW}
            height={h}
            fill={isPulse ? "#dc2626" : "var(--mz-rule-strong)"}
            rx="1"
          />
        );
      })}
      <text
        x={(12 * sparkW) / 20 - 4}
        y={sparkH - (412 / max) * sparkH - 4}
        textAnchor="middle"
        fontFamily="Bebas Neue"
        fontSize="13"
        fill="#dc2626"
        letterSpacing="0.02em"
      >
        412 ▲
      </text>
      <text x="0" y={sparkH + 18} fontFamily="JetBrains Mono" fontSize="9" fill="var(--mz-fg-faint)">
        06/MAR
      </text>
      <text
        x={sparkW - 60}
        y={sparkH + 18}
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="var(--mz-fg-faint)"
      >
        25/MAR
      </text>
    </svg>
  );
}

function TimelineItem({ tipo, stage, when, body }) {
  const dotBg =
    tipo === "danger" ? "var(--mz-danger)" :
    tipo === "warn"   ? "var(--mz-warn)"   :
                        "var(--mz-tenant-accent)";
  return (
    <div style={{ position: "relative", padding: "10px 0 14px" }}>
      <div
        style={{
          position: "absolute",
          left: -23,
          top: 14,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: dotBg,
          border: "2px solid var(--mz-bg-page)",
        }}
      />
      <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mz-fg-strong)" }}>{stage}</div>
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10.5,
            color: "var(--mz-fg-faint)",
          }}
        >
          {when}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--mz-fg-muted)", marginTop: 4, lineHeight: 1.5 }}>
        {body}
      </div>
    </div>
  );
}
