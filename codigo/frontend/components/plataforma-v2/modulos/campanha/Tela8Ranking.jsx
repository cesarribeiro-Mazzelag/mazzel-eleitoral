"use client";

/* Campanha 2026 · Tela 8 · Ranking + Heatmap.
 * Adaptado de Plataforma-v2.html Tela8Ranking. */

import { useState } from "react";
import { Icon } from "../../Icon";
import { Card, Segment, Avatar } from "./primitives";
import { RANKING, HEATMAP_CERCAS } from "./data";

function podiumStyle(i) {
  if (i === 0) return { background: "linear-gradient(135deg,#facc15,#b8860b)", color: "#1a1205" };
  if (i === 1) return { background: "linear-gradient(135deg,#f3f4f6,#9ca3af)", color: "#18181b" };
  return { background: "linear-gradient(135deg,#f59e0b,#9a3412)", color: "#fff" };
}

const GAMIFICACAO = [
  { icon: "Zap",    t: "+1 pt",  d: "por liderança ativada" },
  { icon: "Star",   t: "+5 pt",  d: "por liderança com tag Destaque" },
  { icon: "Bell",   t: "+2 pt",  d: "por contato ativo (WhatsApp ≤ 7d)" },
  { icon: "Target", t: "+20 pt", d: "por cerca 100% da meta" },
];

export function Tela8Ranking() {
  const [view, setView] = useState("lista");

  return (
    <div className="p-6 space-y-5" style={{ maxWidth: 1680, margin: "0 auto" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black font-display t-fg-strong">Ranking & heatmap</h1>
          <div className="text-[12px] t-fg-muted mt-0.5">
            Produtividade individual · engajamento por cerca/dia
          </div>
        </div>
        <div className="flex gap-2">
          <Segment
            value={view}
            onChange={setView}
            options={[
              { value: "lista",   label: "Ranking" },
              { value: "heatmap", label: "Heatmap" },
            ]}
          />
          <button className="btn-ghost" type="button"><Icon name="Download" size={11} />Exportar</button>
        </div>
      </div>

      {view === "lista" && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 380px" }}>
          <Card title="Ranking do mês" sub={`${RANKING.length} lideranças · ordenado por score`} noPadding>
            <div
              className="grid items-center gap-3 px-4 py-2"
              style={{
                gridTemplateColumns: "40px 32px 1fr 90px 90px 80px 70px",
                background: "var(--bg-card-2)",
                fontWeight: 600,
                color: "var(--fg-dim)",
                fontSize: 10.5,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              <div className="text-center">#</div>
              <div />
              <div>Liderança</div>
              <div>Papel</div>
              <div className="text-right">Presença</div>
              <div className="text-right">Δ</div>
              <div className="text-right">Score</div>
            </div>
            {RANKING.slice(0, 12).map((l) => {
              const scoreColor =
                l.score >= 80 ? "var(--ok)" :
                l.score >= 60 ? "var(--warn)" : "var(--danger)";
              const varColor =
                l.variacao > 0 ? "var(--ok)" :
                l.variacao < 0 ? "var(--danger)" : "var(--fg-dim)";
              return (
                <div
                  key={l.id}
                  className="grid items-center gap-3 px-4 py-2.5"
                  style={{
                    gridTemplateColumns: "40px 32px 1fr 90px 90px 80px 70px",
                    borderBottom: "1px solid var(--rule)",
                  }}
                >
                  <div className="text-center">
                    {l.posicao <= 3 ? (
                      <span
                        className="inline-flex items-center justify-center rounded-full font-black text-[11px]"
                        style={{ width: 24, height: 24, ...podiumStyle(l.posicao - 1) }}
                      >
                        {l.posicao}
                      </span>
                    ) : (
                      <span className="text-[12px] font-bold tnum t-fg-muted">{l.posicao}</span>
                    )}
                  </div>
                  <Avatar nome={l.nome} size={28} />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold t-fg-strong truncate">{l.nome}</div>
                    <div className="text-[10.5px] t-fg-dim truncate">{l.cidade} · {l.cerca}</div>
                  </div>
                  <div className="text-[11px] t-fg-muted truncate">{l.papel}</div>
                  <div className="text-right text-[12px] font-bold tnum t-fg">{l.cadastrosMes}</div>
                  <div className="text-right text-[11px] font-bold tnum" style={{ color: varColor }}>
                    {l.variacao > 0 ? `↑${l.variacao}` : l.variacao < 0 ? `↓${Math.abs(l.variacao)}` : "-"}
                  </div>
                  <div className="text-right text-[13px] font-bold tnum" style={{ color: scoreColor }}>
                    {l.score}
                  </div>
                </div>
              );
            })}
          </Card>

          <div className="space-y-4">
            <Card title="Pódio · ouro" sub="Top 3 do mês">
              <div className="space-y-3">
                {RANKING.slice(0, 3).map((l, i) => (
                  <div key={l.id} className="flex items-center gap-3">
                    <div
                      className="rounded-xl flex items-center justify-center font-black text-[15px]"
                      style={{ width: 40, height: 40, ...podiumStyle(i) }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-bold t-fg-strong">{l.nome}</div>
                      <div className="text-[10.5px] t-fg-dim">
                        {l.cerca} · {l.cadastrosMes} presenças
                      </div>
                    </div>
                    <div
                      className="text-[16px] font-black tnum font-display"
                      style={{ color: "var(--ok)" }}
                    >
                      {l.score}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Gamificação" sub="Regras ativas">
              <div className="space-y-2 text-[11.5px]">
                {GAMIFICACAO.map((r, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1">
                    <Icon name={r.icon} size={13} className="t-fg-dim" />
                    <span className="font-bold tnum t-fg-strong w-10">{r.t}</span>
                    <span className="t-fg-muted flex-1">{r.d}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {view === "heatmap" && (
        <Card title="Engajamento diário por cerca" sub="12 semanas · mais escuro = mais engajamento">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px repeat(84, 1fr)",
              gap: 2,
              fontSize: 9.5,
            }}
          >
            <div />
            {Array.from({ length: 84 }, (_, i) => (
              <div
                key={i}
                className="text-center t-fg-faint"
                style={{ fontSize: 8, visibility: i % 7 === 0 ? "visible" : "hidden" }}
              >
                W{Math.floor(i / 7) + 1}
              </div>
            ))}
            {HEATMAP_CERCAS.map((c) => (
              <div key={c.nome} className="contents">
                <div className="text-[10.5px] t-fg-strong font-semibold py-0.5 truncate">{c.nome}</div>
                {c.dias.map((v, d) => (
                  <div
                    key={d}
                    title={`${c.nome} · ${v}%`}
                    style={{
                      height: 14,
                      borderRadius: 2,
                      background: `rgba(29, 78, 216, ${Math.max(0.05, v / 100)})`,
                      border: v < 20 ? "1px solid rgba(220,38,38,0.4)" : "none",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4 text-[10.5px] t-fg-dim">
            <span>Baixo</span>
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((op) => (
              <span
                key={op}
                style={{
                  width: 18, height: 12, borderRadius: 2,
                  background: `rgba(29, 78, 216, ${op})`,
                }}
              />
            ))}
            <span>Alto</span>
            <div className="flex-1" />
            <span className="flex items-center gap-1">
              <span style={{ width: 10, height: 10, border: "1.5px solid var(--danger)", borderRadius: 2 }} />
              &lt; 20% · alerta
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
