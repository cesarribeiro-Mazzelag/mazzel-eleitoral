"use client";

/* Campanha 2026 · Tela 1 · Hub.
 * Adaptado de designer/campanha-tela1.jsx. */

import { useState } from "react";
import { Icon } from "../../Icon";
import {
  Card, Segment, ProgressBar, Sparkline, KpiTile, Avatar, HeroStat,
} from "./primitives";
import {
  CAMPANHAS, HUB_KPIS, SPARKS, ATIVIDADES, TOP_CERCAS, BOTTOM_CERCAS,
  COPILOTO_SUGESTOES, AGENDA_HOJE, captacaoPct,
} from "./data";

export function Tela1Hub({ persona = { label: "Presidente", scope: "Nacional" } }) {
  const [camp, setCamp] = useState(CAMPANHAS[0]);
  const [janela, setJanela] = useState("hoje");
  const kpis = HUB_KPIS[camp.id] || HUB_KPIS["jaques-26"];

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1680, margin: "0 auto" }}>
      {/* Hero */}
      <div className="camp-hero p-6 flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="chip"
              style={{
                background: "rgba(255,255,255,0.16)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
                boxShadow: "none",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34d399" }} />
              {camp.status.toUpperCase()} · {camp.fase}
            </span>
            <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
              {persona.label} · {persona.scope}
            </span>
          </div>
          <h1 className="text-[32px] font-black font-display leading-tight mb-1">{camp.candidato}</h1>
          <div className="text-[14px]" style={{ color: "rgba(255,255,255,0.82)" }}>
            {camp.cargo} · <strong>{camp.partido}</strong> · {camp.coligacao}
          </div>
          <div className="flex items-center gap-5 mt-4">
            <HeroStat label="Score overall" value={camp.score} />
            <div className="w-px h-10" style={{ background: "rgba(255,255,255,0.2)" }} />
            <HeroStat label="Intenção de voto" value={`${camp.intencaoVoto}%`} delta={camp.margem} />
            <div className="w-px h-10" style={{ background: "rgba(255,255,255,0.2)" }} />
            <HeroStat label="Lideranças" value={camp.ativos} sub="ativas" />
            <div className="w-px h-10" style={{ background: "rgba(255,255,255,0.2)" }} />
            <HeroStat label="Cercas" value={camp.cercas} sub="/ 46 · 82%" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button className="btn-primary" style={{ background: "#fff", color: "var(--tenant-primary)", padding: "10px 16px" }} type="button">
            <Icon name="Sparkles" size={13} />Briefing da manhã
          </button>
          <button className="btn-ghost" style={{ background: "rgba(255,255,255,0.14)", color: "#fff", padding: "9px 16px" }} type="button">
            <Icon name="FileText" size={12} />Relatório PDF
          </button>
        </div>
      </div>

      {/* Campanhas switcher */}
      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1">
        <span className="text-[10.5px] t-fg-dim uppercase tracking-[0.14em] font-semibold mr-2">Campanhas ativas:</span>
        {CAMPANHAS.map((c) => {
          const active = camp.id === c.id;
          const deltaCls = c.delta7d > 0 ? "chip-green" : c.delta7d < 0 ? "chip-red" : "chip-muted";
          return (
            <button
              key={c.id}
              onClick={() => setCamp(c)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg whitespace-nowrap"
              style={{
                background: active ? "var(--bg-card)" : "transparent",
                border: `1px solid ${active ? "var(--rule-strong)" : "var(--rule)"}`,
                color: active ? "var(--fg-strong)" : "var(--fg-muted)",
                minWidth: 220,
              }}
              type="button"
            >
              <Avatar nome={c.candidato} size={28} />
              <div className="text-left">
                <div className="text-[12px] font-bold">{c.candidato}</div>
                <div className="text-[10px] t-fg-dim">{c.cargo} · score {c.score}</div>
              </div>
              <span className={`chip ${deltaCls}`}>
                {c.delta7d > 0 ? "+" : ""}{c.delta7d}
              </span>
            </button>
          );
        })}
        <button className="btn-ghost ml-1" style={{ padding: "8px 10px" }} type="button">
          <Icon name="Plus" size={12} />Nova
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KpiTile
            key={k.id}
            label={k.label}
            valor={k.valor}
            delta={k.delta}
            sentiment={k.sentiment}
            sub={k.sub}
            sparkPoints={SPARKS[k.id]}
          />
        ))}
      </div>

      {/* Timeline + sidebar */}
      <div className="grid grid-cols-[1fr_380px] gap-4">
        <Card
          title="Atividade em tempo real"
          sub="Hoje · Bahia"
          right={
            <Segment
              value={janela}
              onChange={setJanela}
              options={[
                { value: "hoje", label: "Hoje" },
                { value: "7d",   label: "7 dias" },
                { value: "30d",  label: "30 dias" },
              ]}
            />
          }
          noPadding
        >
          <div>
            {ATIVIDADES.map((a, i) => (
              <div
                key={i}
                className="grid items-start gap-3 px-5 py-3"
                style={{
                  gridTemplateColumns: "56px 28px 1fr auto",
                  borderBottom: i < ATIVIDADES.length - 1 ? "1px solid var(--rule)" : "none",
                }}
              >
                <div className="text-[11px] tnum font-mono t-fg-dim pt-0.5">{a.hora}</div>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: a.alert ? "rgba(220,38,38,0.08)" : "var(--rule)",
                    color: a.alert ? "var(--danger)" : "var(--fg-muted)",
                  }}
                >
                  <Icon name={a.icon} size={13} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="chip chip-muted" style={{ height: 17, fontSize: 9.5 }}>{a.tipo}</span>
                    {a.alert && (
                      <span className="chip chip-red" style={{ height: 17, fontSize: 9.5 }}>ATENÇÃO</span>
                    )}
                    <span className="text-[10px] t-fg-faint">· {a.cerca}</span>
                  </div>
                  <div className="text-[12.5px] t-fg">{a.texto}</div>
                  <div className="text-[10.5px] t-fg-dim mt-0.5">{a.meta}</div>
                </div>
                <button className="btn-ghost self-center" style={{ padding: "4px 8px", fontSize: 10.5 }} type="button">
                  Abrir →
                </button>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card
            title="Copiloto sugere"
            sub="IA · Diário"
            right={<span className="chip chip-purple">BETA</span>}
          >
            <div className="space-y-2">
              {COPILOTO_SUGESTOES.map((s, i) => {
                const colors = {
                  danger: { bg: "rgba(220,38,38,0.08)",  fg: "var(--danger)" },
                  warn:   { bg: "rgba(217,119,6,0.08)",  fg: "var(--warn)" },
                  accent: { bg: "rgba(147,51,234,0.08)", fg: "var(--accent-blue)" },
                }[s.color] || { bg: "var(--rule)", fg: "var(--fg)" };
                return (
                  <div
                    key={i}
                    className="p-3 rounded-lg"
                    style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}
                  >
                    <div className="flex items-start gap-2.5 mb-1.5">
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: colors.bg, color: colors.fg }}
                      >
                        <Icon name={s.icon} size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold t-fg-strong">{s.title}</div>
                        <div className="text-[11px] t-fg-muted mt-0.5" style={{ lineHeight: 1.45 }}>{s.body}</div>
                      </div>
                    </div>
                    <button
                      className="btn-ghost w-full"
                      style={{ justifyContent: "center", padding: "6px 8px", fontSize: 11 }}
                      type="button"
                    >
                      {s.cta} →
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Captação da meta" sub="R$ 4,82 mi / 6,20 mi">
            <div className="space-y-3">
              <Sparkline points={SPARKS.captacao} width={332} height={60} color="var(--ok)" fill />
              <ProgressBar value={captacaoPct(camp)} color="var(--ok)" height={8} />
              <div className="flex items-center justify-between text-[11px]">
                <span className="t-fg-dim">Projeção · agosto</span>
                <span className="font-bold t-fg-strong">R$ 6,4 mi</span>
              </div>
            </div>
          </Card>

          <Card
            title="Agenda de hoje"
            sub="Bahia · 5 compromissos"
            right={<button className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10.5 }} type="button">Ver tudo</button>}
          >
            <div className="space-y-2.5">
              {AGENDA_HOJE.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 py-1">
                  <div className="text-[11px] tnum font-mono font-bold t-fg-strong pt-0.5" style={{ minWidth: 40 }}>
                    {ev.hora}
                  </div>
                  <div
                    className="w-[3px] self-stretch rounded-full"
                    style={{ background: ev.status === "confirmado" ? "var(--ok)" : "var(--warn)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold t-fg-strong truncate">{ev.local}</div>
                    <div className="text-[10.5px] t-fg-dim truncate">{ev.tipo}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Top + Bottom cercas */}
      <div className="grid grid-cols-2 gap-4">
        <Card
          title="Cercas de destaque"
          sub="Top 5 · ritmo de cadastro"
          right={<button className="btn-ghost" style={{ padding: "4px 8px", fontSize: 10.5 }} type="button">Ver todas</button>}
          noPadding
        >
          {TOP_CERCAS.map((c, i) => (
            <div
              key={i}
              className="grid items-center gap-3 px-5 py-3"
              style={{
                gridTemplateColumns: "20px 1fr auto 120px",
                borderBottom: i < TOP_CERCAS.length - 1 ? "1px solid var(--rule)" : "none",
              }}
            >
              <div className="text-[12px] font-bold tnum t-fg-strong">{i + 1}</div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold t-fg-strong">{c.nome}</div>
                <div className="text-[10.5px] t-fg-dim">{c.responsavel}</div>
              </div>
              <div className="text-right">
                <div className="text-[12px] font-bold tnum t-fg-strong">{c.feito.toLocaleString("pt-BR")}</div>
                <div className="text-[10px] t-fg-dim">/ {c.meta.toLocaleString("pt-BR")}</div>
              </div>
              <div>
                <ProgressBar value={c.pct} color="var(--ok)" />
                <div className="text-[10px] tnum t-fg-muted mt-1 text-right">{c.pct}%</div>
              </div>
            </div>
          ))}
        </Card>

        <Card
          title="Cercas em atenção"
          sub="Baixo desempenho · intervir"
          noPadding
          right={<span className="chip chip-red">4 críticas</span>}
        >
          {BOTTOM_CERCAS.map((c, i) => {
            const semResp = c.responsavel === "-";
            return (
              <div
                key={i}
                className="grid items-center gap-3 px-5 py-3"
                style={{
                  gridTemplateColumns: "20px 1fr auto 120px",
                  borderBottom: i < BOTTOM_CERCAS.length - 1 ? "1px solid var(--rule)" : "none",
                }}
              >
                <div className="text-[12px] font-bold tnum" style={{ color: "var(--danger)" }}>!</div>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold t-fg-strong">{c.nome}</div>
                  <div className="text-[10.5px]" style={{ color: semResp ? "var(--danger)" : "var(--fg-dim)" }}>
                    {semResp ? "⚠ sem responsável" : c.responsavel}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-bold tnum t-fg-strong">{c.feito.toLocaleString("pt-BR")}</div>
                  <div className="text-[10px] t-fg-dim">/ {c.meta.toLocaleString("pt-BR")}</div>
                </div>
                <div>
                  <ProgressBar value={c.pct} color={c.pct < 20 ? "var(--danger)" : "var(--warn)"} />
                  <div
                    className="text-[10px] tnum mt-1 text-right"
                    style={{ color: c.pct < 20 ? "var(--danger)" : "var(--warn)" }}
                  >
                    {c.pct}%
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
