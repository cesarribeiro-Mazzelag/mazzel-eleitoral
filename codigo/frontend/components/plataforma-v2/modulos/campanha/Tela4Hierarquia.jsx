"use client";

/* Campanha 2026 · Tela 4 · Hierarquia (arvore Delegado -> Regional -> Municipio -> Bairro).
 * Adaptado de Plataforma-v2.html Tela4Arvore. */

import { useState } from "react";
import { Icon } from "../../Icon";
import { Card, Segment, ProgressBar, Avatar } from "./primitives";
import { CERCAS } from "./data";

function StatusDot({ status }) {
  const color =
    status === "destaque" ? "var(--ok)" :
    status === "ativo"    ? "var(--ok)" :
    status === "atencao"  ? "var(--warn)" :
    status === "vaga"     ? "var(--danger)" :
    status === "critico"  ? "var(--danger)" : "var(--fg-dim)";
  return (
    <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: color }} />
  );
}

function StatCard({ label, value, sub, tone }) {
  const color =
    tone === "ok"     ? "var(--ok)" :
    tone === "warn"   ? "var(--warn)" :
    tone === "danger" ? "var(--danger)" :
    "var(--fg-strong)";
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}
    >
      <div className="text-[10px] t-fg-dim uppercase tracking-wider font-semibold mb-1.5">{label}</div>
      <div className="text-[26px] font-black tnum font-display" style={{ color }}>{value}</div>
      <div className="text-[10.5px] t-fg-muted mt-0.5">{sub}</div>
    </div>
  );
}

function Row({ node, depth, expanded, onToggle }) {
  const hasChildren = node.filhas && node.filhas.length > 0;
  const isOpen = expanded[node.id];
  const ratio = (node.cadastrados / node.meta) * 100;
  const progressColor =
    ratio > 70 ? "var(--ok)" :
    ratio > 40 ? "var(--warn)" : "var(--danger)";
  const scoreColor =
    node.score >= 70 ? "var(--ok)" :
    node.score >= 50 ? "var(--warn)" : "var(--danger)";
  const iconName =
    node.nivel === "regional"  ? "Star" :
    node.nivel === "municipio" ? "MapPin" : "Home";

  return (
    <>
      <div
        className="grid items-center gap-3 px-4 py-3"
        style={{
          gridTemplateColumns: `${depth * 20 + 28}px 24px 1fr 140px 120px 80px 140px 80px`,
          paddingLeft: 14 + depth * 20,
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div
          onClick={() => hasChildren && onToggle(node.id)}
          style={{ cursor: hasChildren ? "pointer" : "default" }}
        >
          {hasChildren && <Icon name={isOpen ? "ChevronDown" : "ChevronRight"} size={12} className="t-fg-muted" />}
        </div>
        <StatusDot status={node.status} />
        <div className="min-w-0 flex items-center gap-2">
          <Icon name={iconName} size={12} className="t-fg-dim" />
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold t-fg-strong truncate">{node.nome}</div>
            <div className="text-[10px] t-fg-dim uppercase tracking-wider">{node.nivel}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          {node.responsavelId ? (
            <Avatar nome={node.responsavel} size={22} />
          ) : (
            <span
              className="rounded-full flex items-center justify-center"
              style={{ width: 22, height: 22, background: "rgba(220,38,38,0.1)", color: "var(--danger)" }}
            >
              <Icon name="AlertTriangle" size={10} />
            </span>
          )}
          <div className="text-[11.5px] t-fg truncate">{node.responsavel}</div>
        </div>
        <div>
          <ProgressBar value={ratio} color={progressColor} />
          <div className="text-[10px] tnum t-fg-dim mt-0.5">
            {node.cadastrados.toLocaleString("pt-BR")} / {node.meta.toLocaleString("pt-BR")}
          </div>
        </div>
        <div className="text-[13px] font-bold tnum" style={{ color: scoreColor }}>{node.score}</div>
        <div className="text-[11px] tnum t-fg-muted">{node.engajamento}%</div>
        <div className="flex gap-1 justify-end">
          <button className="btn-ghost" style={{ padding: "4px 7px" }} type="button">
            <Icon name="Bell" size={10} />
          </button>
          <button className="btn-ghost" style={{ padding: "4px 7px" }} type="button">
            <Icon name="Dots" size={10} />
          </button>
        </div>
      </div>
      {hasChildren && isOpen && node.filhas.map((c) => (
        <Row key={c.id} node={c} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
      ))}
    </>
  );
}

export function Tela4Hierarquia() {
  const [expanded, setExpanded] = useState({ "reg-reconcavo": true, "mun-feira": true });
  const [modo, setModo] = useState("operacional");

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <div className="p-6 space-y-4" style={{ maxWidth: 1680, margin: "0 auto" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black font-display t-fg-strong">Hierarquia da campanha</h1>
          <div className="text-[12px] t-fg-muted mt-0.5">
            Delegado → Regionais → Territoriais → Bairros · cobertura em tempo real
          </div>
        </div>
        <div className="flex gap-2">
          <Segment
            value={modo}
            onChange={setModo}
            options={[
              { value: "operacional", label: "Operacional" },
              { value: "geografica",  label: "Geográfica" },
            ]}
          />
          <button className="btn-ghost" type="button"><Icon name="Download" size={11} />Export</button>
          <button className="btn-primary" type="button"><Icon name="Plus" size={11} />Nova cerca</button>
        </div>
      </div>

      <Card title="Estrutura territorial" sub={`${CERCAS.length} regionais · drill-down`} noPadding>
        <div
          className="grid items-center gap-3 px-4 py-2"
          style={{
            gridTemplateColumns: "48px 24px 1fr 140px 120px 80px 140px 80px",
            background: "var(--bg-card-2)",
            fontWeight: 600,
            color: "var(--fg-dim)",
            fontSize: 10.5,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <div />
          <div />
          <div>Cerca</div>
          <div>Responsável</div>
          <div>Presença</div>
          <div>Score</div>
          <div>Engaj.</div>
          <div className="text-right">Ações</div>
        </div>
        {CERCAS.map((n) => (
          <Row key={n.id} node={n} depth={0} expanded={expanded} onToggle={toggle} />
        ))}
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Regionais" value="3" sub="1 vaga" tone="warn" />
        <StatCard label="Territoriais" value="8" sub="1 vaga" tone="warn" />
        <StatCard label="Bairros" value="11" sub="2 vagos" tone="danger" />
        <StatCard label="Cobertura total" value="74%" sub="meta 90%" tone="ok" />
      </div>
    </div>
  );
}
