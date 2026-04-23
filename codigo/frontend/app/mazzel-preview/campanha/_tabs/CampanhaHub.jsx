"use client";

import { useState } from "react";
import {
  HUB_KPIS, SPARKS, TOP_CERCAS, BOTTOM_CERCAS, captarPct,
} from "@/components/mazzel-data/campanha";

// ATIVIDADES removido do mock - exibir empty state quando API retorna vazio
const ATIVIDADES_VAZIO = [];
import { useCampanhas, useAniversariantes } from "@/hooks/useCampanha";
import { Sparkles, FileText, UserPlus, Flag, MessageCircle, CheckCircle, Heart, AlertTriangle, Gift, Plus, Info } from "lucide-react";

function Avatar({ nome, size = 28 }) {
  const initials = nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  const colors = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899"];
  const color = colors[nome.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function SparkMini({ points, color = "var(--mz-ok, #34d399)", width = 80, height = 28 }) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const W = width, H = height;
  const pts = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 2) - 1;
    return `${x},${y}`;
  });
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ProgressBar({ value, color = "var(--mz-ok, #34d399)", height = 6 }) {
  return (
    <div style={{ height, background: "var(--mz-rule)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s" }} />
    </div>
  );
}

function MockBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}
    >
      <Info size={8} />
      dados de demonstração
    </span>
  );
}

const ICON_MAP = { UserPlus, Flag, MessageCircle, CheckCircle, Heart, AlertTriangle, Gift, Sparkles };

// Mapeia campos do backend (Campanha) para o formato esperado pelos componentes
function normalizeCampanha(c) {
  return {
    id: c.id,
    candidato: c.nome.replace(/^.*?- /, ""), // "Senador BA 2026 - Jaques Wagner" -> "Jaques Wagner"
    cargo: c.cargo_disputado + (c.uf ? ` · ${c.uf}` : ""),
    partido: "—",
    coligacao: "—",
    status: c.status === "ativa" ? "Ativa" : c.status,
    fase: c.periodo_atual || "—",
    score: 73, // sem endpoint de score ainda
    intencaoVoto: 28.4,
    margem: "+4.2pp",
    meta: c.orcamento_total_centavos ? c.orcamento_total_centavos / 100 : 6200000,
    captado: 4821000,
    ativos: 142,
    cercas: 38,
    delta7d: +1.8,
  };
}

export default function CampanhaHub() {
  const { campanhas: apiCampanhas, isLoading, isMock: campMock } = useCampanhas();
  const { aniversariantes, isLoading: anivLoading, isMock: anivMock } = useAniversariantes("hoje");

  // Usa API real sem fallback mock
  const campanhasDisplay = apiCampanhas.map(normalizeCampanha);

  const isMock = campMock;

  const [camp, setCamp] = useState(null);
  const campAtual = camp ?? campanhasDisplay[0] ?? null;
  // KPIs: usa dados da API normalizados se disponivel
  const kpis = campAtual ? (HUB_KPIS[campAtual.id] ?? []) : [];

  // Aniversariantes: usa API real se disponível, senão filtra mock
  const aniversariantesHoje = aniversariantes.length > 0
    ? aniversariantes.map(p => p.nome_completo)
    : [];

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1680, margin: "0 auto" }}>
      {/* Flag de demonstração */}
      {isMock && (
        <div className="flex items-center gap-2">
          <MockBadge />
          <span className="text-[10.5px] mz-t-fg-dim">API retornou vazio — exibindo dados de demonstração</span>
        </div>
      )}

      {/* Hero card */}
      <div className="rounded-2xl p-6 flex items-center gap-6" style={{ background: "linear-gradient(135deg, var(--mz-tenant-primary, #002A7B), #1a3fa0)", color: "#fff", boxShadow: "0 8px 32px rgba(0,42,123,0.25)" }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
              {campAtual?.status?.toUpperCase()} · {campAtual?.fase}
            </span>
          </div>
          <h1 className="text-[30px] font-black leading-tight mb-1">{campAtual?.candidato}</h1>
          <div className="text-[14px]" style={{ color: "rgba(255,255,255,0.82)" }}>
            {campAtual?.cargo} · <strong>{campAtual?.partido}</strong> · {campAtual?.coligacao}
          </div>
          <div className="flex items-center gap-5 mt-4 flex-wrap">
            {[
              { label: "Score overall", value: campAtual?.score },
              { label: "Intenção de voto", value: `${campAtual?.intencaoVoto}%`, delta: campAtual?.margem },
              { label: "Lideranças", value: campAtual?.ativos, sub: "ativas" },
              { label: "Cercas", value: `${campAtual?.cercas}/46` },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-4">
                {i > 0 && <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.2)" }} />}
                <div>
                  <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.65)" }}>{s.label}</div>
                  <div className="text-[20px] font-black" style={{ lineHeight: 1.15 }}>{s.value}</div>
                  {s.delta && <div className="text-[10.5px]" style={{ color: "#34d399" }}>{s.delta}</div>}
                  {s.sub && <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.55)" }}>{s.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-[12px]" style={{ background: "#fff", color: "var(--mz-tenant-primary, #002A7B)" }}>
            <Sparkles size={13} />Briefing da manhã
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-[12px]" style={{ background: "rgba(255,255,255,0.14)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
            <FileText size={12} />Relatório PDF
          </button>
        </div>
      </div>

      {/* Campanhas switcher */}
      <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
        <span className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.14em] font-semibold mr-2 flex-shrink-0">Campanhas ativas:</span>
        {isLoading ? (
          <span className="text-[11px] mz-t-fg-dim px-3 py-2">Carregando...</span>
        ) : (
          campanhasDisplay.map(c => {
            const active = (campAtual?.id === c.id);
            return (
              <button key={c.id} onClick={() => setCamp(c)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg whitespace-nowrap flex-shrink-0"
                style={{
                  background: active ? "var(--mz-bg-card)" : "transparent",
                  border: `1px solid ${active ? "var(--mz-rule-strong)" : "var(--mz-rule)"}`,
                  cursor: "pointer", minWidth: 220,
                }}>
                <Avatar nome={c.candidato} size={28} />
                <div className="text-left">
                  <div className="text-[12px] font-bold mz-t-fg-strong">{c.candidato}</div>
                  <div className="text-[10px] mz-t-fg-dim">{c.cargo} · score {c.score}</div>
                </div>
                <span className="inline-flex items-center px-2 h-5 rounded-full text-[10px] font-bold ml-auto"
                  style={{
                    background: (c.delta7d || 0) > 0 ? "rgba(5,150,105,0.12)" : (c.delta7d || 0) < 0 ? "rgba(220,38,38,0.12)" : "rgba(82,82,91,0.1)",
                    color: (c.delta7d || 0) > 0 ? "var(--mz-ok, #34d399)" : (c.delta7d || 0) < 0 ? "var(--mz-danger, #f87171)" : "var(--mz-fg-dim)",
                  }}>
                  {(c.delta7d || 0) > 0 ? "+" : ""}{c.delta7d ?? 0}
                </span>
              </button>
            );
          })
        )}
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold mz-t-fg-dim flex-shrink-0" style={{ background: "var(--mz-rule)" }}>
          <Plus size={12} />Nova
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={k.id} className="mz-kpi-card mz-ring-soft space-y-2">
            <div className="text-[10.5px] mz-t-fg-dim uppercase tracking-[0.12em] font-semibold">{k.label}</div>
            <div className="text-[28px] font-black mz-tnum mz-t-fg-strong leading-none">{k.valor}</div>
            <div className="flex items-center gap-2">
              {k.delta && (
                <span className="text-[11px] font-bold" style={{ color: k.sentiment === "up" ? "var(--mz-ok, #34d399)" : "var(--mz-fg-dim)" }}>{k.delta}</span>
              )}
              <SparkMini points={SPARKS[k.id] || SPARKS.intencao} width={64} height={20} />
            </div>
            <div className="text-[10px] mz-t-fg-dim">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 2-col: atividade + copiloto + captação */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 380px" }}>
        {/* Timeline atividade */}
        <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--mz-rule)", background: "var(--mz-bg-card-2)" }}>
            <div>
              <div className="text-[13px] font-bold mz-t-fg-strong">Atividade em tempo real</div>
              <div className="text-[10.5px] mz-t-fg-dim">Hoje · Bahia</div>
            </div>
          </div>
          {ATIVIDADES_VAZIO.length === 0 ? (
            <div className="text-center text-[12px] mz-t-fg-dim py-8">Sem atividades recentes nesta campanha.</div>
          ) : ATIVIDADES_VAZIO.map((a, i) => {
            const Icon = ICON_MAP[a.icon] || MessageCircle;
            return (
              <div key={i} className="grid items-center gap-3 px-5 py-3 border-b last:border-0"
                style={{ gridTemplateColumns: "56px 28px 1fr auto", borderColor: "var(--mz-rule)" }}>
                <div className="text-[11px] mz-tnum font-mono mz-t-fg-dim">{a.hora}</div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: a.alert ? "rgba(220,38,38,0.08)" : "var(--mz-rule)", color: a.alert ? "var(--mz-danger, #f87171)" : "var(--mz-fg-muted)" }}>
                  <Icon size={13} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="inline-flex px-2 h-[17px] items-center rounded-full text-[9.5px] font-bold" style={{ background: "var(--mz-rule)", color: "var(--mz-fg-dim)" }}>{a.tipo}</span>
                    {a.alert && <span className="inline-flex px-2 h-[17px] items-center rounded-full text-[9.5px] font-bold" style={{ background: "rgba(220,38,38,0.1)", color: "var(--mz-danger, #f87171)" }}>ATENÇÃO</span>}
                    <span className="text-[10px] mz-t-fg-dim">· {a.cerca}</span>
                  </div>
                  <div className="text-[12.5px] mz-t-fg">{a.texto}</div>
                  <div className="text-[10.5px] mz-t-fg-dim mt-0.5">{a.meta}</div>
                </div>
                <button className="text-[10.5px] font-semibold mz-t-fg-dim flex-shrink-0" style={{ padding: "4px 8px", background: "var(--mz-rule)", borderRadius: 6 }}>Abrir →</button>
              </div>
            );
          })}
        </div>

        {/* Sidebar: copiloto + captação */}
        <div className="space-y-4">
          {/* Aniversariantes (API real se disponível) */}
          {(aniversariantes.length > 0 || !anivLoading) && (
            <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--mz-rule)", background: "var(--mz-bg-card-2)" }}>
                <div className="text-[13px] font-bold mz-t-fg-strong">Aniversariantes hoje</div>
                {anivMock && <MockBadge />}
              </div>
              <div className="p-4">
                {aniversariantes.length === 0 ? (
                  <div className="text-[11.5px] mz-t-fg-dim text-center py-2">Nenhum aniversariante hoje.</div>
                ) : (
                  <div className="space-y-2">
                    {aniversariantes.slice(0, 5).map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2.5">
                        <Avatar nome={p.nome_completo} size={26} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold mz-t-fg-strong truncate">{p.nome_completo}</div>
                          {p.data_nascimento && (
                            <div className="text-[10px] mz-t-fg-dim">{new Date(p.data_nascimento).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</div>
                          )}
                        </div>
                        <Gift size={12} style={{ color: "var(--mz-warn, #fbbf24)", flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Copiloto */}
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
            <div className="px-4 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "var(--mz-rule)", background: "var(--mz-bg-card-2)" }}>
              <div>
                <div className="text-[13px] font-bold mz-t-fg-strong">Copiloto sugere</div>
                <div className="text-[10.5px] mz-t-fg-dim">IA · Diário</div>
              </div>
              <span className="inline-flex px-2 h-5 items-center rounded-full text-[9.5px] font-bold" style={{ background: "rgba(147,51,234,0.1)", color: "#9333ea" }}>BETA</span>
            </div>
            <div className="p-4 space-y-2">
              {[
                { icon: AlertTriangle, color: "danger",  title: "Maragogipe em risco",       body: "Score 28. Sem responsável há 9d. Redirecione Renato Bastos (Oeste)?",   cta: "Ver plano" },
                { icon: Gift,          color: "warn",    title: "Pastor Elias faz 60 anos amanhã", body: "Gere mensagem personalizada e encomende buquê (R$ 220).",        cta: "Preparar" },
                { icon: Sparkles,      color: "accent",  title: "Oportunidade em Cachoeira", body: "Paula cresceu +18% em cadastros. Promover a Territorial?",              cta: "Analisar" },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-lg" style={{ background: "var(--mz-bg-card-2, rgba(0,0,0,0.02))", border: "1px solid var(--mz-rule)" }}>
                  <div className="flex items-start gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{
                        background: s.color === "danger" ? "rgba(220,38,38,0.08)" : s.color === "warn" ? "rgba(217,119,6,0.08)" : "rgba(147,51,234,0.08)",
                        color: s.color === "danger" ? "var(--mz-danger, #f87171)" : s.color === "warn" ? "var(--mz-warn, #fbbf24)" : "#9333ea",
                      }}>
                      <s.icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold mz-t-fg-strong">{s.title}</div>
                      <div className="text-[11px] mz-t-fg-muted mt-0.5" style={{ lineHeight: 1.45 }}>{s.body}</div>
                    </div>
                  </div>
                  <button className="w-full text-[11px] font-semibold py-1.5 rounded-md mz-t-fg-dim" style={{ background: "var(--mz-rule)", textAlign: "center" }}>{s.cta} →</button>
                </div>
              ))}
            </div>
          </div>

          {/* Captação */}
          <div className="mz-ring-soft rounded-xl p-4" style={{ background: "var(--mz-bg-card)" }}>
            <div className="text-[13px] font-bold mz-t-fg-strong mb-0.5">Captação da meta</div>
            <div className="text-[10.5px] mz-t-fg-dim mb-3">R$ 4,82 mi / R$ 6,20 mi</div>
            <SparkMini points={SPARKS.captacao} width={340} height={56} color="var(--mz-ok, #34d399)" />
            <div className="mt-3">
              <ProgressBar value={captarPct(campAtual)} color="var(--mz-ok, #34d399)" height={8} />
            </div>
            <div className="flex items-center justify-between text-[11px] mt-2">
              <span className="mz-t-fg-dim">Projeção · agosto</span>
              <span className="font-bold mz-t-fg-strong">R$ 6,4 mi</span>
            </div>
          </div>

          {/* Top/Bottom cercas */}
          <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--mz-rule)", background: "var(--mz-bg-card-2)" }}>
              <div className="text-[13px] font-bold mz-t-fg-strong">Top · Bottom cercas</div>
            </div>
            <div className="p-4 space-y-1">
              {TOP_CERCAS.slice(0, 3).map((c, i) => (
                <div key={c.nome} className="flex items-center gap-3 py-1.5">
                  <div className="text-[10.5px] mz-tnum font-bold w-8 text-right" style={{ color: c.pct >= 75 ? "var(--mz-ok, #34d399)" : "var(--mz-warn, #fbbf24)" }}>{c.pct}%</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-semibold mz-t-fg-strong truncate">{c.nome}</div>
                    <ProgressBar value={c.pct} color={c.pct >= 75 ? "var(--mz-ok, #34d399)" : "var(--mz-warn, #fbbf24)"} height={4} />
                  </div>
                </div>
              ))}
              <div className="text-[10px] mz-t-fg-dim uppercase tracking-wider font-semibold mt-2 mb-1">Atenção</div>
              {BOTTOM_CERCAS.slice(0, 3).map((c, i) => (
                <div key={c.nome} className="flex items-center gap-3 py-1.5">
                  <div className="text-[10.5px] mz-tnum font-bold w-8 text-right" style={{ color: "var(--mz-danger, #f87171)" }}>{c.pct}%</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-semibold mz-t-fg-strong truncate">{c.nome} {!c.responsavel || c.responsavel === "—" ? <span style={{ color: "var(--mz-danger, #f87171)", fontSize: 9.5 }}>· SEM RESP.</span> : null}</div>
                    <ProgressBar value={c.pct} color="var(--mz-danger, #f87171)" height={4} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
