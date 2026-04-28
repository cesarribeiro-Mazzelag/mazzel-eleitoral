"use client";

/* Módulo Documentos · 1:1 com Designer V1.2 (03-documentos.html)
 *
 * Layout 3 colunas: pastas (240) + tabela (1fr) + DocuSign drawer (460)
 * 6 abas · 11 docs · DocuSign envelope com 9 signatários + PDF preview
 *
 * Substitui Documentos.jsx anterior (128 linhas, sem side-r preview).
 */

import { useState } from "react";
import {
  FOLDERS_REPO,
  FOLDERS_MARCADORES,
  TABS,
  DOCS,
  DOC_ATIVO,
  FILE_COLORS,
  STATUS_STYLES,
} from "./dados";

export function Documentos() {
  const [tab, setTab] = useState("todos");
  const [docId, setDocId] = useState("ata-2026-04");
  const docAtivo = DOC_ATIVO; // único detalhado no canon

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "240px 1fr 460px",
        height: "calc(100vh - 48px)",
        background: "var(--mz-bg-page)",
      }}
    >
      <Side />
      <MainColumn tab={tab} onTab={setTab} docId={docId} onDoc={setDocId} />
      <SideR doc={docAtivo} />
    </div>
  );
}

/* ============ SIDE ESQUERDA · pastas ============ */
function Side() {
  return (
    <aside
      style={{
        background: "var(--mz-bg-sidebar)",
        borderRight: "1px solid var(--mz-rule)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <div style={{ margin: "14px 16px", padding: "18px 12px", border: "1.5px dashed var(--mz-rule-strong)", borderRadius: 6, textAlign: "center", cursor: "pointer", background: "var(--mz-bg-card)" }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>📤</div>
        <b style={{ display: "block", fontSize: 12, color: "var(--mz-fg-strong)", fontWeight: 700 }}>
          Arraste arquivos aqui
        </b>
        <span style={{ fontSize: 10, color: "var(--mz-fg-faint)", display: "block", marginTop: 3 }}>
          ou clique para enviar · PDF, DOCX, XLSX
        </span>
      </div>

      <div style={{ padding: "6px 8px 14px" }}>
        <SectHead>Repositório</SectHead>
        {FOLDERS_REPO.map((f, i) => (
          <Folder key={i} folder={f} indent={f.child ? 16 : 0} />
        ))}
        <SectHead style={{ marginTop: 12 }}>Marcadores</SectHead>
        {FOLDERS_MARCADORES.map((f, i) => (
          <Folder key={i} folder={f} marcador />
        ))}
      </div>
    </aside>
  );
}

function SectHead({ children, style }) {
  return (
    <h3
      style={{
        fontSize: 9.5,
        letterSpacing: "0.16em",
        color: "var(--mz-fg-faint)",
        textTransform: "uppercase",
        fontWeight: 700,
        margin: "12px 10px 6px",
        ...style,
      }}
    >
      {children}
    </h3>
  );
}

function Folder({ folder: f, indent = 0, marcador }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: marcador ? "12px 18px 1fr auto" : "12px 18px 1fr auto",
        gap: 8,
        padding: f.active ? "6px 10px 6px 7px" : "6px 10px",
        marginLeft: indent,
        cursor: "pointer",
        alignItems: "center",
        fontSize: 12,
        color: "var(--mz-fg)",
        borderRadius: 4,
        background: f.active ? "var(--mz-tenant-primary-soft)" : undefined,
        borderLeft: f.active ? "3px solid var(--mz-tenant-accent)" : undefined,
      }}
    >
      <span style={{ color: "var(--mz-fg-faint)", fontSize: 9 }}>{f.arr || ""}</span>
      <span style={{ fontSize: 13 }}>{f.ico}</span>
      <b style={{ fontWeight: 600, color: "var(--mz-fg-strong)" }}>{f.nome}</b>
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9.5,
          color: f.warn ? "var(--mz-fg-on-accent)" : "var(--mz-fg-faint)",
          background: f.warn ? "var(--mz-warn)" : undefined,
          padding: f.warn ? "1px 4px" : 0,
          borderRadius: 3,
          fontWeight: f.warn ? 800 : 400,
        }}
      >
        {f.qty}
      </span>
    </div>
  );
}

/* ============ COLUNA CENTRAL · tabs + tabela ============ */
function MainColumn({ tab, onTab, docId, onDoc }) {
  return (
    <main
      style={{
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--mz-bg-page)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "12px 22px",
          borderBottom: "1px solid var(--mz-rule)",
          background: "var(--mz-bg-topbar)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 11.5, color: "var(--mz-fg-muted)", flex: 1, display: "flex", gap: 6 }}>
          Repositório
          <Sep />
          <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>Estatutários</b>
          <Sep />
          <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>Atas Mun. SP</b>
          <Sep />
          <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>2026</b>
        </div>
        <div style={{ width: 280, position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: 7, fontSize: 11 }}>🔍</span>
          <input
            defaultValue="Q1 2026"
            style={{
              width: "100%",
              background: "var(--mz-bg-card)",
              border: "1px solid var(--mz-rule)",
              borderRadius: 6,
              padding: "7px 30px",
              fontSize: 11.5,
              color: "var(--mz-fg)",
              outline: "none",
            }}
          />
        </div>
        <Btn>📂 Nova Pasta</Btn>
        <Btn primary>+ Novo Documento</Btn>
        <Btn tenant>📤 Enviar p/ DocuSign</Btn>
      </div>

      {/* Tabs bar */}
      <div
        style={{
          padding: "0 22px",
          borderBottom: "1px solid var(--mz-rule)",
          background: "var(--mz-bg-topbar)",
          display: "flex",
          gap: 0,
        }}
      >
        {TABS.map((t) => {
          const ativo = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                padding: "11px 14px",
                background: "none",
                border: 0,
                color: ativo ? "var(--mz-fg-strong)" : "var(--mz-fg-muted)",
                cursor: "pointer",
                borderBottom: ativo ? "2px solid var(--mz-tenant-accent)" : "2px solid transparent",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              {t.label}
              <span
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 9.5,
                  background: t.warn
                    ? "var(--mz-warn)"
                    : ativo
                    ? "var(--mz-tenant-accent)"
                    : "var(--mz-bg-card)",
                  padding: "1px 5px",
                  borderRadius: 3,
                  color: t.warn || ativo ? "var(--mz-fg-on-accent)" : "var(--mz-fg-faint)",
                }}
              >
                {t.num}
              </span>
            </button>
          );
        })}
      </div>

      {/* View bar */}
      <div
        style={{
          padding: "10px 22px",
          borderBottom: "1px solid var(--mz-rule)",
          background: "var(--mz-bg-page)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 11,
          color: "var(--mz-fg-muted)",
        }}
      >
        <span>
          <b style={{ color: "var(--mz-fg-strong)" }}>{DOCS.length}</b> documentos · ordenados por{" "}
          <b style={{ color: "var(--mz-fg-strong)" }}>data desc.</b>
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <span>Ordenar:</span>
          <Sel options={["Data desc.", "Nome A-Z", "Tipo", "Status DocuSign"]} />
          <span>Filtrar:</span>
          <Sel options={["Todos os tipos", "PDF", "DOCX", "Atas"]} />
          <div style={{ display: "flex", background: "var(--mz-bg-card)", border: "1px solid var(--mz-rule)", borderRadius: 4 }}>
            <button style={{ background: "var(--mz-tenant-primary)", color: "#fff", border: 0, padding: "5px 9px", fontSize: 11, cursor: "pointer" }}>
              ☰
            </button>
            <button style={{ background: "none", color: "var(--mz-fg-muted)", border: 0, padding: "5px 9px", fontSize: 11, cursor: "pointer" }}>
              ▦
            </button>
          </div>
        </div>
      </div>

      {/* Docs area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
        <DocHead />
        {DOCS.map((d) => (
          <DocRow key={d.id} doc={d} active={d.id === docId} onClick={() => onDoc(d.id)} />
        ))}
      </div>
    </main>
  );
}

function Sep() {
  return <span style={{ color: "var(--mz-rule-strong)", margin: "0 6px" }}>›</span>;
}

function Sel({ options }) {
  return (
    <select
      style={{
        background: "var(--mz-bg-card)",
        border: "1px solid var(--mz-rule)",
        borderRadius: 4,
        padding: "4px 8px",
        fontSize: 11,
        color: "var(--mz-fg)",
        outline: "none",
      }}
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

function Btn({ children, primary, tenant }) {
  return (
    <button
      style={{
        fontSize: 11.5,
        fontWeight: tenant ? 800 : 600,
        padding: "7px 12px",
        borderRadius: 6,
        border: tenant
          ? "1px solid var(--mz-tenant-accent)"
          : primary
          ? "1px solid var(--mz-tenant-primary-strong)"
          : "1px solid var(--mz-rule)",
        background: tenant ? "var(--mz-tenant-accent)" : primary ? "var(--mz-tenant-primary)" : "var(--mz-bg-card)",
        color: tenant ? "var(--mz-fg-on-accent)" : primary ? "#fff" : "var(--mz-fg)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const COLS = "26px 1fr 110px 130px 90px 100px 110px 60px";

function DocHead() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: COLS,
        gap: 10,
        padding: "8px 14px",
        fontSize: 9.5,
        letterSpacing: "0.14em",
        color: "var(--mz-fg-faint)",
        textTransform: "uppercase",
        fontWeight: 700,
        borderBottom: "1px solid var(--mz-rule)",
      }}
    >
      <span></span>
      <span>Documento</span>
      <span>Tipo</span>
      <span>Atualizado</span>
      <span>Versão</span>
      <span>Status</span>
      <span>DocuSign</span>
      <span></span>
    </div>
  );
}

function DocRow({ doc: d, active, onClick }) {
  const status = STATUS_STYLES[d.statusClass] || STATUS_STYLES.vigente;
  const fileColor = FILE_COLORS[d.fileTypeClass] || "#4b5563";

  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: COLS,
        gap: 10,
        padding: "11px 14px",
        borderBottom: "1px solid var(--mz-rule)",
        alignItems: "center",
        cursor: "pointer",
        background: active ? "var(--mz-tenant-primary-soft)" : undefined,
        borderLeft: active ? "3px solid var(--mz-tenant-accent)" : undefined,
        paddingLeft: active ? 11 : 14,
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          border: "1.5px solid var(--mz-rule-strong)",
          borderRadius: 3,
          background: active ? "var(--mz-tenant-accent)" : "transparent",
          borderColor: active ? "var(--mz-tenant-accent)" : undefined,
        }}
      />
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 36,
            height: 44,
            borderRadius: 4,
            background: fileColor,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Bebas Neue, sans-serif",
            fontSize: 11,
            flexShrink: 0,
            letterSpacing: "0.04em",
          }}
        >
          {d.fileType}
        </div>
        <div>
          <b style={{ fontSize: 12.5, color: "var(--mz-fg-strong)", display: "block", fontWeight: 600, lineHeight: 1.3 }}>
            {d.titulo}
            {d.lock && (
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 5px",
                  borderRadius: 3,
                  background: "rgba(168,85,247,0.18)",
                  color: "#c084fc",
                  fontWeight: 800,
                  marginLeft: 6,
                }}
              >
                {d.lock}
              </span>
            )}
          </b>
          <small style={{ fontSize: 10.5, color: "var(--mz-fg-faint)", display: "block", marginTop: 2 }}>
            {d.sub}
          </small>
        </div>
      </div>
      <span style={{ fontSize: 11.5, color: "var(--mz-fg)" }}>
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{d.tipo}</b>
        <small style={{ display: "block", color: "var(--mz-fg-faint)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>
          {d.tamanho}
        </small>
      </span>
      <span style={{ fontSize: 11.5, color: "var(--mz-fg)" }}>
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{d.atualizado}</b>
        <small style={{ display: "block", color: "var(--mz-fg-faint)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>
          {d.atualizadoSub}
        </small>
      </span>
      <span style={{ fontSize: 11.5, color: "var(--mz-fg)" }}>
        <b style={{ color: "var(--mz-fg-strong)", fontWeight: 600 }}>{d.versao}</b>
        <small style={{ display: "block", color: "var(--mz-fg-faint)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>
          {d.versaoSub}
        </small>
      </span>
      <span style={{ fontSize: 11.5, color: "var(--mz-fg)" }}>
        <span
          style={{
            fontSize: 9.5,
            padding: "3px 7px",
            borderRadius: 3,
            fontWeight: 800,
            letterSpacing: "0.04em",
            display: "inline-block",
            background: status.bg,
            color: status.fg,
          }}
        >
          {d.status}
        </span>
      </span>
      <span style={{ fontSize: 11.5, color: "var(--mz-fg)" }}>
        {d.docusignProgress != null ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                flex: 1,
                height: 4,
                background: "var(--mz-bg-elevated)",
                borderRadius: 2,
                overflow: "hidden",
                minWidth: 50,
              }}
            >
              <span style={{ display: "block", height: "100%", width: `${d.docusignProgress}%`, background: "var(--mz-warn)" }} />
            </div>
            <small style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: "var(--mz-fg-faint)" }}>
              {d.docusignProgressLabel}
            </small>
          </div>
        ) : (
          <>
            <b style={{ color: d.docusignColor || "var(--mz-fg-strong)", fontWeight: 600 }}>{d.docusign}</b>
            <small style={{ display: "block", color: "var(--mz-fg-faint)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>
              {d.docusignSub}
            </small>
          </>
        )}
      </span>
      <div style={{ display: "flex", gap: 4, opacity: active ? 1 : 0 }}>
        <button style={actionBtn}>👁</button>
        <button style={actionBtn}>⬇</button>
        <button style={actionBtn}>⋯</button>
      </div>
    </div>
  );
}

const actionBtn = {
  width: 24,
  height: 24,
  border: 0,
  background: "var(--mz-bg-card)",
  borderRadius: 4,
  color: "var(--mz-fg-muted)",
  cursor: "pointer",
  fontSize: 11,
};

/* ============ SIDE DIREITA · DocuSign drawer ============ */
function SideR({ doc }) {
  return (
    <aside
      style={{
        background: "var(--mz-bg-sidebar)",
        borderLeft: "1px solid var(--mz-rule)",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "22px 22px 18px",
          borderBottom: "1px solid var(--mz-rule)",
          background: "linear-gradient(135deg, rgba(0,42,123,0.18), transparent)",
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div
            style={{
              width: 52,
              height: 64,
              borderRadius: 5,
              background: "var(--mz-tenant-accent)",
              color: "var(--mz-fg-on-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: 14,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            PDF
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, color: "var(--mz-fg-strong)", fontWeight: 800, lineHeight: 1.2 }}>
              {doc.titulo}
            </h2>
            <div style={{ fontSize: 11, color: "var(--mz-fg-muted)", marginTop: 6, fontFamily: "JetBrains Mono, monospace" }}>
              {doc.meta}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 12 }}>
          {doc.pills.map((p, i) => {
            const okStyle = p.tipo === "ok"
              ? { background: "var(--mz-ok-soft)", color: "var(--mz-ok)", borderColor: "transparent", fontWeight: 700 }
              : { background: "var(--mz-bg-card)", color: "var(--mz-fg-muted)", borderColor: "var(--mz-rule)" };
            return (
              <span
                key={i}
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: `1px solid ${okStyle.borderColor}`,
                  ...okStyle,
                }}
              >
                {p.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Metadados */}
      <RSect titulo="Metadados">
        <dl style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "6px 12px", fontSize: 11.5, margin: 0 }}>
          {doc.metadados.map((m) => (
            <Pair key={m.k} k={m.k} v={m.v} sub={m.sub} />
          ))}
        </dl>
      </RSect>

      {/* DocuSign envelope */}
      <RSect titulo="DocuSign · Envelope" qty={doc.envelope.id}>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(0,42,123,0.16), var(--mz-bg-card))",
            border: "1px solid var(--mz-tenant-accent)",
            borderRadius: 6,
            padding: 14,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--mz-rule)" }}>
            <div
              style={{
                width: 38,
                height: 38,
                background: "var(--mz-tenant-accent)",
                color: "var(--mz-fg-on-accent)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Bebas Neue, sans-serif",
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              DS
            </div>
            <div>
              <b style={{ fontSize: 13, color: "var(--mz-fg-strong)", display: "block", fontWeight: 700 }}>
                {doc.envelope.titulo}
              </b>
              <span style={{ fontSize: 10, color: "var(--mz-fg-faint)", fontFamily: "JetBrains Mono, monospace" }}>
                {doc.envelope.sub}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            {Array.from({ length: doc.envelope.progress.steps }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 6,
                  background: i < doc.envelope.progress.done ? "var(--mz-ok)" : "var(--mz-bg-elevated)",
                  borderRadius: 3,
                }}
              />
            ))}
            <small style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "var(--mz-fg-faint)", whiteSpace: "nowrap" }}>
              {doc.envelope.progress.label}
            </small>
          </div>
          {doc.envelope.signers.map((s, i) => (
            <Signer key={i} signer={s} first={i === 0} />
          ))}
        </div>
      </RSect>

      {/* PDF Preview */}
      <RSect titulo="Pré-visualização" qty="pág 1/8">
        <div
          style={{
            background: "#f5f5f0",
            border: "1px solid var(--mz-rule)",
            borderRadius: 4,
            padding: "24px 18px",
            color: "#1a1a1a",
            fontFamily: "Times New Roman, serif",
            fontSize: 9.5,
            lineHeight: 1.45,
            maxHeight: 280,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <h5 style={{ textAlign: "center", fontSize: 11, fontWeight: 800, margin: "0 0 10px", letterSpacing: "0.06em" }}>
            ATA DA REUNIÃO 04/2026 DA COMISSÃO EXECUTIVA · UB SP
          </h5>
          <p style={{ margin: "6px 0", textAlign: "justify" }}>
            Aos dezoito dias do mês de abril de dois mil e vinte e seis, às quatorze horas,
            reuniu-se a Comissão Executiva do Diretório Municipal de São Paulo da União Brasil,
            sob a presidência do Sr. Milton Leite, com a presença dos demais membros abaixo
            identificados, para deliberação dos seguintes pontos de pauta:
          </p>
          <p style={{ margin: "6px 0", textAlign: "justify" }}>
            <b>1.</b> Revisão do Plano Operacional 2026-014 (OP-014), com apresentação do
            orçamento alocado de R$ 850.000,00 destinado à mobilização de cabos eleitorais nas
            zonas leste e sul da capital.
          </p>
          <p style={{ margin: "6px 0", textAlign: "justify" }}>
            <b>2.</b> Vacância em cadeira da Comissão de Ética por renúncia formal protocolada
            por Mariana Lopes, deliberando-se pela convocação do suplente em prazo de até trinta
            dias, nos termos do art. 47 do Estatuto.
          </p>
          <div style={{ marginTop: 14, borderTop: "1px solid #999", paddingTop: 8, display: "flex", gap: 14, fontSize: 9 }}>
            <SigCol stamp="Milton Leite" cargo="Pres. Mun." />
            <SigCol stamp="C. Vieira"    cargo="Vice-Pres." />
            <SigCol stamp="P. Souza"     cargo="Sec. Geral" />
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 60,
              background: "linear-gradient(to bottom, transparent, #f5f5f0)",
              pointerEvents: "none",
            }}
          />
        </div>
      </RSect>

      {/* Histórico de Versões */}
      <RSect titulo="Histórico de Versões" qty={String(doc.versoes.length)}>
        {doc.versoes.map((v, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr auto",
              gap: 10,
              padding: "8px 0",
              borderBottom: i === doc.versoes.length - 1 ? 0 : "1px solid var(--mz-rule)",
              fontSize: 11.5,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "Bebas Neue, sans-serif",
                fontSize: 13,
                background: v.current ? "var(--mz-tenant-accent)" : "var(--mz-bg-elevated)",
                color: v.current ? "var(--mz-fg-on-accent)" : "var(--mz-fg-muted)",
                padding: "1px 6px",
                borderRadius: 3,
                minWidth: 36,
                textAlign: "center",
                letterSpacing: "0.04em",
                fontWeight: v.current ? 800 : undefined,
              }}
            >
              {v.v}
            </span>
            <div>
              <b style={{ color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{v.titulo}</b>
              <span style={{ color: "var(--mz-fg-faint)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>
                {v.sub}
              </span>
            </div>
            <span style={{ fontSize: 10, color: "var(--mz-fg-faint)", fontFamily: "JetBrains Mono, monospace" }}>
              {v.when}
            </span>
          </div>
        ))}
      </RSect>

      {/* Auditoria LGPD */}
      <RSect titulo="Auditoria de Acessos · LGPD" qty="14 (30d)">
        {doc.auditoria.map((a, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "12px 1fr",
              gap: 10,
              padding: "6px 0",
              fontSize: 11,
              alignItems: "start",
            }}
          >
            <span style={{ color: "var(--mz-tenant-accent)", fontSize: 8, lineHeight: 1.4 }}>●</span>
            <div>
              <b style={{ color: "var(--mz-fg)", fontWeight: 600 }}>{a.texto}</b>
              <div style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--mz-fg-faint)", fontSize: 10 }}>
                {a.when}
              </div>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 10, color: "var(--mz-fg-faint)", marginTop: 8, lineHeight: 1.5 }}>
          Acesso auditado · LGPD art. 37 · retenção 5 anos · imutável.
        </div>
      </RSect>

      {/* Ações */}
      <RSect titulo="Ações">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {doc.acoes.map((a) => (
            <button
              key={a}
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                padding: "7px 12px",
                borderRadius: 6,
                border: "1px solid var(--mz-rule)",
                background: "var(--mz-bg-card)",
                color: "var(--mz-fg)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {a}
            </button>
          ))}
          <button
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              padding: "7px 12px",
              borderRadius: 6,
              border: "1px solid var(--mz-tenant-primary-strong)",
              background: "var(--mz-tenant-primary)",
              color: "#fff",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {doc.acaoPrincipal}
          </button>
        </div>
      </RSect>
    </aside>
  );
}

function RSect({ titulo, qty, children }) {
  return (
    <section style={{ padding: "16px 22px", borderBottom: "1px solid var(--mz-rule)" }}>
      <h4
        style={{
          fontSize: 9.5,
          letterSpacing: "0.16em",
          color: "var(--mz-fg-faint)",
          textTransform: "uppercase",
          fontWeight: 700,
          margin: "0 0 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {titulo}
        {qty && (
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "JetBrains Mono, monospace",
              background: "var(--mz-tenant-accent)",
              color: "var(--mz-fg-on-accent)",
              padding: "1px 5px",
              borderRadius: 3,
              fontSize: 9.5,
              fontWeight: 800,
            }}
          >
            {qty}
          </span>
        )}
      </h4>
      {children}
    </section>
  );
}

function Pair({ k, v, sub }) {
  return (
    <>
      <dt style={{ color: "var(--mz-fg-faint)" }}>{k}</dt>
      <dd style={{ margin: 0, color: "var(--mz-fg-strong)", fontWeight: 600 }}>
        {v}
        {sub && (
          <small style={{ display: "block", color: "var(--mz-fg-faint)", fontWeight: 400, fontFamily: "JetBrains Mono, monospace", fontSize: 10, marginTop: 1 }}>
            {sub}
          </small>
        )}
      </dd>
    </>
  );
}

function Signer({ signer: s, first }) {
  const stateBg =
    s.state === "done" ? "var(--mz-ok)" :
    s.state === "cur"  ? "var(--mz-warn)" :
                         "var(--mz-tenant-primary)";
  const stateColor = s.state === "done" || s.state === "cur" ? "#fff" : "var(--mz-tenant-accent)";
  const sttBg =
    s.state === "done" ? "var(--mz-ok-soft)" :
    s.state === "cur"  ? "var(--mz-warn-soft)" :
                         "var(--mz-bg-elevated)";
  const sttFg =
    s.state === "done" ? "var(--mz-ok)" :
    s.state === "cur"  ? "var(--mz-warn)" :
                         "var(--mz-fg-faint)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr auto",
        gap: 10,
        padding: "10px 0",
        borderTop: first ? 0 : "1px solid var(--mz-rule)",
        alignItems: "center",
        fontSize: 11.5,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: stateBg,
          color: stateColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: 12,
        }}
      >
        {s.av}
      </div>
      <div>
        <b style={{ color: "var(--mz-fg-strong)", display: "block", fontWeight: 600 }}>{s.nome}</b>
        <span style={{ color: "var(--mz-fg-faint)", fontSize: 10 }}>{s.sub}</span>
      </div>
      <span
        style={{
          fontSize: 9.5,
          padding: "2px 6px",
          borderRadius: 3,
          fontWeight: 800,
          background: sttBg,
          color: sttFg,
        }}
      >
        {s.status}
      </span>
    </div>
  );
}

function SigCol({ stamp, cargo }) {
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          borderBottom: "1px solid #333",
          height: 24,
          marginBottom: 4,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Brush Script MT, cursive",
            fontSize: 16,
            color: "#002a7b",
            transform: "rotate(-3deg)",
            paddingBottom: 2,
          }}
        >
          {stamp}
        </span>
      </div>
      {cargo}
    </div>
  );
}
