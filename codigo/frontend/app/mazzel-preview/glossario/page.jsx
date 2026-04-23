"use client";

import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { BookOpen, Award, Shield, Eye, Lock } from "lucide-react";

const GLOSSARIO = [
  {
    secao: "Overall FIFA",
    icone: Award,
    itens: [
      { t: "Overall", d: "Score 0-99 calculado a partir de 6 atributos do politico." },
      { t: "Tier", d: "Classificacao visual: Dourado (95+), Ouro (85-94), Prata (70-84), Bronze (<70)." },
      { t: "Campeao", d: "Politico com overall >=90 e impacto comprovado." },
    ],
  },
  {
    secao: "6 Atributos",
    icone: Award,
    itens: [
      { t: "VOT", d: "Votacao historica e performance eleitoral." },
      { t: "FID", d: "Fidelidade partidaria - tempo de filiacao e coerencia ideologica." },
      { t: "EFI", d: "Eficiencia - projetos aprovados vs apresentados." },
      { t: "INT", d: "Influencia - presenca em comissoes e redes." },
      { t: "ART", d: "Articulacao - emendas e coalizoes construidas." },
      { t: "TER", d: "Territorio - cobertura regional e base eleitoral." },
    ],
  },
  {
    secao: "Traits politicos",
    icone: Shield,
    itens: [
      { t: "Fenomeno", d: "Crescimento explosivo em curto periodo." },
      { t: "Trabalhador", d: "Alta produtividade legislativa." },
      { t: "Articulador", d: "Grande capacidade de coalizao." },
      { t: "Chefe de base", d: "Controla territorio regional forte." },
    ],
  },
  {
    secao: "Chat",
    icone: Lock,
    itens: [
      { t: "Modo padrao", d: "Mensagem persiste. E2E (ponta-a-ponta)." },
      { t: "Modo sigiloso", d: "TTL curto - apaga automatico apos tempo." },
      { t: "Visualizacao unica", d: "Apaga 5s apos primeira visualizacao." },
    ],
  },
];

function GlossarioContent() {
  return (
    <div className="px-8 py-6" style={{ background: "var(--mz-bg-page)", minHeight: "100%" }}>
      <div className="mb-6">
        <div className="text-[11px] mz-t-fg-dim tracking-[0.18em] uppercase font-semibold">Referencia</div>
        <h1 className="text-[24px] font-bold mz-t-fg-strong mt-0.5 flex items-center gap-2">
          <BookOpen size={22} />Glossario
        </h1>
        <div className="text-[13px] mz-t-fg-muted mt-1">
          Conceitos, metricas e modos usados na plataforma
        </div>
      </div>

      <div className="space-y-6" style={{ maxWidth: 900 }}>
        {GLOSSARIO.map(g => {
          const Ic = g.icone;
          return (
            <div key={g.secao} className="mz-ring-soft rounded-xl p-5" style={{ background: "var(--mz-bg-card)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Ic size={16} />
                <div className="text-[14px] font-bold mz-t-fg-strong">{g.secao}</div>
              </div>
              <div className="space-y-2">
                {g.itens.map(i => (
                  <div key={i.t} className="flex gap-3 text-[12.5px]">
                    <div className="font-bold mz-t-fg-strong" style={{ width: 120, flexShrink: 0 }}>{i.t}</div>
                    <div className="mz-t-fg-muted flex-1">{i.d}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GlossarioPage() {
  return (
    <MazzelLayout activeModule="glossario" breadcrumbs={["Uniao Brasil", "Glossario"]} alertCount={7}>
      <GlossarioContent />
    </MazzelLayout>
  );
}
