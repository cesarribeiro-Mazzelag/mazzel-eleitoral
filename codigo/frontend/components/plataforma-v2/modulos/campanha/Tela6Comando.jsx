"use client";

/* Campanha 2026 · Tela 6 · Comando de Campo.
 * Missoes, Aniversarios, Follow-ups, Validacoes.
 * Adaptado de Plataforma-v2.html Tela6Comando. */

import { useState } from "react";
import { Icon } from "../../Icon";
import { Card, Avatar, ProgressBar } from "./primitives";
import { LIDERANCAS, proximoAniversarioDias } from "./data";

const TODAY = new Date(2026, 2, 14);  // data fixa do Designer - continua coerente com mocks

const MISSOES = [
  { id: "M-0147", titulo: "Panfletagem Feira de São Joaquim", prioridade: "alta",  atribuido: 12, concluido:  8, prazo: "hoje 18h",  tipo: "panfleto" },
  { id: "M-0148", titulo: "Presença porta-a-porta Cabula VI", prioridade: "alta",  atribuido:  8, concluido:  3, prazo: "hoje 20h",  tipo: "cadastro" },
  { id: "M-0149", titulo: "Carreata Pituba (apoio)",          prioridade: "media", atribuido: 24, concluido: 24, prazo: "concluída", tipo: "evento" },
  { id: "M-0150", titulo: "Selfie + GPS · Ronda validação",   prioridade: "alta",  atribuido: 10, concluido:  6, prazo: "2h",        tipo: "validacao" },
  { id: "M-0151", titulo: "Cobertura ato Liberdade",          prioridade: "baixa", atribuido:  5, concluido:  0, prazo: "amanhã",    tipo: "evento" },
  { id: "M-0152", titulo: "Visita a líderes comunitários SC", prioridade: "media", atribuido:  6, concluido:  4, prazo: "sex 17h",   tipo: "visita" },
];

const FOLLOWUPS = [
  { nome: "Carlos Silva",  zona: "Cabula",   ultimo: "há 2 dias", status: "ok",     acao: "Ligar para confirmar presença" },
  { nome: "Lúcia Mendes",  zona: "Pituba",   ultimo: "há 5 dias", status: "atraso", acao: "Sem resposta desde ato" },
  { nome: "Pedro Ramos",   zona: "Subúrbio", ultimo: "há 1 dia",  status: "ok",     acao: "Enviar material novo" },
  { nome: "Ana Paula",     zona: "Brotas",   ultimo: "há 9 dias", status: "atraso", acao: "Verificar saúde + enviar cesta" },
  { nome: "João Batista",  zona: "Itapuã",   ultimo: "há 3 dias", status: "ok",     acao: "Retorno sobre demanda creche" },
];

const VALIDACOES = [
  { id: "V-8821", cabo: "C003 · Pedro R.",   tipo: "selfie+GPS", status: "validado", quando: "14:32" },
  { id: "V-8822", cabo: "C007 · Ana P.",     tipo: "selfie+GPS", status: "pendente", quando: "14:45" },
  { id: "V-8823", cabo: "C011 · Bruno T.",   tipo: "pergunta",   status: "falhou",   quando: "14:50" },
  { id: "V-8824", cabo: "C014 · Helena V.",  tipo: "selfie+GPS", status: "validado", quando: "14:58" },
  { id: "V-8825", cabo: "C019 · Silva",      tipo: "cross-ping", status: "validado", quando: "15:02" },
  { id: "V-8826", cabo: "C022 · Oliveira",   tipo: "selfie+GPS", status: "pendente", quando: "15:10" },
];

const FRAUDES = [
  { cabo: "C011 · Bruno T.", tempo: "há 28min", nivel: "danger", desc: "Pergunta-teste errada. GPS diverge 3km da zona atribuída.", cta: "Revogar acesso" },
  { cabo: "C043 · Nunes",    tempo: "há 1h",    nivel: "warn",   desc: "Ping do celular não bate com checkin em rua (possível delegação).", cta: "Abrir investigação" },
  { cabo: "C052 · Castro",   tempo: "há 2h",    nivel: "warn",   desc: "Selfie com metadado de outro aparelho.", cta: "Reenviar pedido" },
];

function Tile({ label, value, sub, color }) {
  return (
    <Card>
      <div className="text-[10px] t-fg-dim uppercase tracking-wider mb-1 font-semibold">{label}</div>
      <div className="text-2xl font-bold tnum" style={{ color: color || "var(--fg-strong)" }}>{value}</div>
      <div className="text-[10px] t-fg-dim mt-0.5">{sub}</div>
    </Card>
  );
}

function MissaoCard({ m }) {
  const pct = Math.round((m.concluido / m.atribuido) * 100);
  const prioCls =
    m.prioridade === "alta"  ? "chip-red" :
    m.prioridade === "media" ? "chip-amber" : "chip-muted";
  const barColor = pct === 100 ? "var(--ok)" : "var(--accent-blue-strong)";
  return (
    <Card>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider t-fg-dim">{m.id} · {m.tipo}</div>
          <div className="font-semibold text-[13px] mt-0.5 t-fg-strong">{m.titulo}</div>
        </div>
        <span className={`chip ${prioCls}`} style={{ height: 18, fontSize: 9 }}>{m.prioridade}</span>
      </div>
      <div className="flex items-center gap-2 text-[11px] t-fg-muted mb-2">
        <span>{m.atribuido} cabos</span>
        <span>·</span>
        <span>{m.prazo}</span>
      </div>
      <ProgressBar value={pct} color={barColor} height={6} />
      <div className="flex items-center justify-between mt-1.5 text-[10px] t-fg-muted">
        <span>{m.concluido}/{m.atribuido} concluído</span>
        <span>{pct}%</span>
      </div>
      <div className="flex gap-2 mt-3">
        <button className="btn-ghost text-[11px]" style={{ padding: "4px 10px" }} type="button">Ver detalhes</button>
        <button className="btn-ghost text-[11px]" style={{ padding: "4px 10px" }} type="button">Cobrar atrasados</button>
      </div>
    </Card>
  );
}

export function Tela6Comando() {
  const [tab, setTab] = useState("missoes");

  const aniversariantes = LIDERANCAS
    .map((l) => ({ ...l, aniv: proximoAniversarioDias(l.aniversario, TODAY) }))
    .sort((a, b) => a.aniv - b.aniv)
    .slice(0, 6);

  const tabs = [
    { k: "missoes",       l: "Missões" },
    { k: "aniversarios",  l: "Aniversários" },
    { k: "followups",     l: "Follow-ups" },
    { k: "validacao",     l: "Validações" },
  ];

  const ativas = MISSOES.filter((m) => m.concluido < m.atribuido).length;
  const concluidas = MISSOES.length - ativas;

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <Tile label="Missões ativas"     value={ativas}   sub={`${concluidas} concluídas hoje`} />
        <Tile label="Cabos em campo"     value={<>48<span className="text-base t-fg-dim">/60</span></>} sub="80% da rede" color="var(--ok)" />
        <Tile label="Taxa de conclusão"  value="73%"      sub="▲ 8pp vs ontem" />
        <Tile label="Validações falhas"  value="3"        sub="nas últimas 2h" color="var(--danger)" />
      </div>

      <div className="flex gap-1 text-sm" style={{ borderBottom: "1px solid var(--rule)" }}>
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className="px-4 py-2"
            style={{
              borderBottom: `2px solid ${tab === t.k ? "var(--accent-blue-strong)" : "transparent"}`,
              color: tab === t.k ? "var(--fg-strong)" : "var(--fg-muted)",
              fontWeight: 600,
            }}
            type="button"
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === "missoes" && (
        <div className="grid grid-cols-2 gap-3">
          {MISSOES.map((m) => <MissaoCard key={m.id} m={m} />)}
          <button
            className="rounded-lg p-6 text-[13px] t-fg-dim hover:t-fg-strong"
            style={{ border: "2px dashed var(--rule-strong)" }}
            type="button"
          >
            + Nova missão
          </button>
        </div>
      )}

      {tab === "aniversarios" && (
        <div className="grid grid-cols-3 gap-3">
          {aniversariantes.map((l) => (
            <Card key={l.id}>
              <div className="flex items-center gap-3">
                <div
                  className="rounded-full flex items-center justify-center text-lg"
                  style={{
                    width: 40, height: 40,
                    background: "linear-gradient(135deg,#ec4899,#f97316)",
                  }}
                >
                  🎂
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate t-fg-strong">{l.nome}</div>
                  <div className="text-[10px] t-fg-muted">{l.cidade}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-bold" style={{ color: "#ec4899" }}>
                    {l.aniv === 0 ? "hoje" : `${l.aniv}d`}
                  </div>
                  <div className="text-[9px] t-fg-dim tnum">{l.aniversario}</div>
                </div>
              </div>
              <div className="flex gap-1 mt-3">
                <button className="btn-primary flex-1 text-[10px]" style={{ justifyContent: "center", padding: "5px 8px" }} type="button">
                  WhatsApp
                </button>
                <button className="btn-ghost flex-1 text-[10px]" style={{ justifyContent: "center", padding: "5px 8px" }} type="button">
                  Agendar visita
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "followups" && (
        <Card>
          <table className="w-full text-[12px]">
            <thead>
              <tr
                className="text-[10px] uppercase tracking-wider t-fg-dim text-left"
                style={{ borderBottom: "1px solid var(--rule)" }}
              >
                <th className="pb-2 font-semibold">Nome</th>
                <th className="pb-2 font-semibold">Zona</th>
                <th className="pb-2 font-semibold">Último contato</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2 font-semibold">Ação sugerida</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {FOLLOWUPS.map((f, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--rule)" }}>
                  <td className="py-2 t-fg-strong font-semibold">{f.nome}</td>
                  <td className="py-2 t-fg-muted">{f.zona}</td>
                  <td className="py-2 t-fg-muted">{f.ultimo}</td>
                  <td className="py-2">
                    <span
                      className={`chip ${f.status === "ok" ? "chip-green" : "chip-red"}`}
                      style={{ height: 18, fontSize: 9.5 }}
                    >
                      {f.status === "ok" ? "em dia" : "atraso"}
                    </span>
                  </td>
                  <td className="py-2 text-[11px] t-fg-muted">{f.acao}</td>
                  <td className="py-2 text-right">
                    <button className="text-[11px] t-accent" type="button">abrir →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "validacao" && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-wider t-fg-dim font-semibold">
                Ronda atual · M-0150
              </div>
              <span className="chip chip-blue" style={{ height: 18, fontSize: 9 }}>em andamento</span>
            </div>
            <div className="text-[30px] font-black tnum font-display mb-1 t-fg-strong">
              6<span className="text-lg t-fg-dim">/10</span>
            </div>
            <div className="text-[12px] t-fg-muted mb-3">validações concluídas · 3 falhas</div>
            <div className="space-y-1 text-[11.5px]">
              {VALIDACOES.map((v) => {
                const dotColor =
                  v.status === "validado" ? "var(--ok)" :
                  v.status === "falhou"   ? "var(--danger)" : "var(--warn)";
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-2 py-1"
                    style={{ borderBottom: "1px solid var(--rule)" }}
                  >
                    <span
                      className="inline-block rounded-full"
                      style={{ width: 8, height: 8, background: dotColor }}
                    />
                    <span className="t-fg flex-1">{v.cabo}</span>
                    <span className="t-fg-dim text-[10px]">{v.tipo}</span>
                    <span className="t-fg-dim text-[10px]">{v.quando}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="text-[10px] uppercase tracking-wider t-fg-dim mb-3 font-semibold">
              Sinais de fraude detectados
            </div>
            <div className="space-y-2 text-[11.5px]">
              {FRAUDES.map((f, i) => {
                const isDanger = f.nivel === "danger";
                const bg = isDanger ? "rgba(220,38,38,0.08)" : "rgba(217,119,6,0.08)";
                const border = isDanger ? "rgba(220,38,38,0.30)" : "rgba(217,119,6,0.30)";
                const color = isDanger ? "var(--danger)" : "var(--warn)";
                return (
                  <div
                    key={i}
                    className="p-3 rounded"
                    style={{ background: bg, border: `1px solid ${border}` }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color }}>●</span>
                      <b className="t-fg-strong">{f.cabo}</b>
                      <span className="text-[10px] t-fg-dim ml-auto">{f.tempo}</span>
                    </div>
                    <div className="t-fg">{f.desc}</div>
                    <button className="mt-2 text-[11px]" style={{ color }} type="button">
                      {f.cta} →
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
