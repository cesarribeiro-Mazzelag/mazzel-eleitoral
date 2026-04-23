"use client";

import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import Link from "next/link";
import { Telescope, ArrowRight } from "lucide-react";

function RadarPlaceholderContent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] text-center px-8 py-16" style={{ background:"var(--mz-bg-page)" }}>
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background:"rgba(0,42,123,0.08)", border:"1px solid rgba(0,42,123,0.15)" }}>
        <Telescope size={36} style={{ color:"var(--mz-tenant-primary,#002A7B)" }}/>
      </div>

      <h1 className="text-[28px] font-black mz-t-fg-strong mb-2 leading-tight">
        Novo Radar Político em construção
      </h1>

      <p className="text-[15px] mz-t-fg-muted max-w-[540px] mb-2" style={{ lineHeight:1.6 }}>
        Observatório dinâmico do cenário político nacional - timeline viva de eventos,
        movimentações estratégicas, alertas e sentinela.
      </p>

      <p className="text-[13px] mz-t-fg-dim mb-8 max-w-[480px]" style={{ lineHeight:1.5 }}>
        Enquanto isso, consulte os perfis completos e rankings FIFA dos políticos em Dossies.
      </p>

      <Link href="/mazzel-preview/dossies"
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-bold text-white"
        style={{ background:"var(--mz-tenant-primary,#002A7B)", boxShadow:"0 4px 16px rgba(0,42,123,0.3)" }}>
        Acessar Dossies
        <ArrowRight size={14}/>
      </Link>

      <div className="mt-12 grid grid-cols-3 gap-4 max-w-[600px]">
        {[
          { emoji:"📡", title:"Sentinela de alertas", desc:"Monitoramento automatico de eventos e mudancas no cenario" },
          { emoji:"📈", title:"Timeline viva", desc:"Cronologia interativa de movimentacoes, eleicoes e coalizoes" },
          { emoji:"🗺", title:"Mapa de forcas", desc:"Visualizacao geografica do poder por regiao e partido" },
        ].map(f => (
          <div key={f.title} className="mz-ring-soft rounded-xl p-4 text-left" style={{ background:"var(--mz-bg-card)" }}>
            <div className="text-[24px] mb-2">{f.emoji}</div>
            <div className="text-[12px] font-bold mz-t-fg-strong mb-1">{f.title}</div>
            <div className="text-[11px] mz-t-fg-muted" style={{ lineHeight:1.45 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <p className="text-[11px] mz-t-fg-dim mt-8">Em desenvolvimento - previsao: Fase D</p>
    </div>
  );
}

export default function RadarPage() {
  return (
    <MazzelLayout activeModule="radar" breadcrumbs={["Mazzel","Radar Politico"]}>
      <RadarPlaceholderContent />
    </MazzelLayout>
  );
}
