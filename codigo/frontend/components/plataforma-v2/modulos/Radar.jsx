"use client";

/* Radar Politico - observatorio dinamico (PLACEHOLDER).
 *
 * O grid FIFA de politicos foi movido para Dossies em 24/04/2026.
 * Esta tela aguarda credito Claude Design para construir o Radar v2:
 * timeline de eventos, movimentacoes, alertas estrategicos, pautas,
 * balanca de forcas, sentinela. */

import Link from "next/link";
import { Icon } from "../Icon";

const COMPONENTES = [
  {
    titulo: "Timeline de eventos",
    desc:   "Linha do tempo dos eventos politicos mais relevantes (declaracoes, novos cargos, alianças, quebras de partido) em tempo real.",
  },
  {
    titulo: "Movimentações estratégicas",
    desc:   "Deputados trocando de partido, lideranças consolidando base, deslocamentos entre blocos - com fonte e data.",
  },
  {
    titulo: "Alertas estratégicos",
    desc:   "Radar de risco politico: CPIs, CPs, decisões STF/TSE, protagonismo midiático.",
  },
  {
    titulo: "Pautas em disputa",
    desc:   "Temas dominando agenda legislativa + posicionamento dos principais atores.",
  },
  {
    titulo: "Balança de forças",
    desc:   "Mapeamento dinâmico de coalizões, bancadas e núcleos de poder por cenário.",
  },
  {
    titulo: "Sentinela",
    desc:   "Alertas automáticos quando um político do seu radar bate threshold (ex: Wagner atinge top 10 nacional).",
  },
];

export function Radar() {
  return (
    <div className="bg-page-grad min-h-full">
      <div className="max-w-[1400px] mx-auto px-8 py-7">
        <div className="mb-6">
          <div className="text-[11px] t-fg-dim tracking-[0.18em] uppercase font-semibold">
            Radar Político · observatório dinâmico
          </div>
          <h1 className="text-[32px] font-display font-bold t-fg-strong mt-1 leading-none">
            Observatório em construção
          </h1>
          <div className="text-[13px] t-fg-muted mt-2 max-w-2xl">
            O Radar Político está sendo reformulado. A listagem anterior de políticos com score
            FIFA + filtros foi movida para o <Link href="/mazzel-preview/dossies" className="t-accent">módulo Dossiês</Link> (onde o conteúdo pertence: é
            a porta de entrada pro dossiê de 9 seções). O novo Radar vai entregar um painel
            dinâmico com 6 componentes observando o cenário político em tempo real.
          </div>
        </div>

        <div
          className="rounded-2xl p-8 mb-6"
          style={{
            background: "linear-gradient(135deg, rgba(var(--tenant-primary-rgb),0.12), rgba(var(--tenant-primary-rgb),0.03))",
            border: "1px solid rgba(var(--tenant-primary-rgb),0.3)",
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ width: 56, height: 56, background: "var(--tenant-primary)", color: "#fff" }}
            >
              <Icon name="Target" size={26} />
            </div>
            <div>
              <div className="text-[15px] font-bold t-fg-strong">Radar v2 · em design com Claude Design</div>
              <div className="text-[12.5px] t-fg-muted mt-1 max-w-xl">
                Aguardando créditos pra finalizar os mockups. Arquitetura aprovada em 21/04/2026.
                Dependências técnicas: ingestão de timeline (news feeds), agregador de movimentações
                (TSE + Câmara + Senado), motor de regras pra alertas estratégicos.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {COMPONENTES.map((c, i) => (
            <div
              key={i}
              className="rounded-xl p-5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ width: 28, height: 28, background: "var(--rule)", color: "var(--fg-muted)" }}
                >
                  <Icon name="Build" size={13} />
                </div>
                <div className="text-[10px] t-fg-dim uppercase tracking-wider font-semibold">
                  Componente {i + 1}
                </div>
              </div>
              <div className="text-[14px] font-bold t-fg-strong mb-1">{c.titulo}</div>
              <div className="text-[11.5px] t-fg-muted leading-relaxed">{c.desc}</div>
            </div>
          ))}
        </div>

        <div
          className="mt-8 rounded-xl px-5 py-4 flex items-center gap-3"
          style={{ background: "var(--bg-card-2)", border: "1px solid var(--rule)" }}
        >
          <Icon name="FileSearch" size={16} className="t-accent" />
          <div className="flex-1 text-[12.5px] t-fg">
            Enquanto o Radar v2 não chega, use os <strong>Dossiês</strong> pra explorar políticos com filtros e
            score FIFA.
          </div>
          <Link href="/mazzel-preview/dossies" className="btn-primary inline-flex items-center gap-2">
            <Icon name="ArrowRight" size={12} />Abrir biblioteca de dossiês
          </Link>
        </div>
      </div>
    </div>
  );
}
