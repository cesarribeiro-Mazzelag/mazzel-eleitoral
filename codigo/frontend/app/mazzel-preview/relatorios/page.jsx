"use client";

import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { Info, FileText, Download, Calendar } from "lucide-react";

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>
      <Info size={8} />em construcao
    </span>
  );
}

const MOCK_RELATORIOS = [
  { id: 1, titulo: "Balanco Eleitoral - Abril/2026", tipo: "Mensal", data: "2026-04-20", autor: "Sistema" },
  { id: 2, titulo: "Performance de Delegados UF", tipo: "Operacional", data: "2026-04-18", autor: "Cesar Ribeiro" },
  { id: 3, titulo: "Financas do Diretorio Nacional - Q1", tipo: "Trimestral", data: "2026-04-15", autor: "Tesouraria" },
  { id: 4, titulo: "Auditoria de Alertas Criticos", tipo: "Compliance", data: "2026-04-10", autor: "Sistema" },
];

function RelatoriosContent() {
  return (
    <div className="px-8 py-6" style={{ background: "var(--mz-bg-page)", minHeight: "100%" }}>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-[11px] mz-t-fg-dim tracking-[0.18em] uppercase font-semibold">Outputs</div>
            <MockBadge />
          </div>
          <h1 className="text-[24px] font-bold mz-t-fg-strong mt-0.5 flex items-center gap-2">
            <FileText size={22} />Relatorios
          </h1>
          <div className="text-[13px] mz-t-fg-muted mt-1">
            Relatorios periodicos, auditorias e exportacoes
          </div>
        </div>
        <button className="mz-btn-primary flex items-center gap-1.5">
          <Calendar size={13} />Gerar novo relatorio
        </button>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
        {MOCK_RELATORIOS.map(r => (
          <div key={r.id} className="rounded-xl p-4 mz-ring-soft flex items-start gap-3"
            style={{ background: "var(--mz-bg-card)" }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--mz-rule)" }}>
              <FileText size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold mz-t-fg-strong">{r.titulo}</div>
              <div className="text-[10.5px] mz-t-fg-dim mt-0.5">{r.tipo} - {r.data} - {r.autor}</div>
              <button className="mt-2 text-[11px] font-semibold flex items-center gap-1 mz-t-fg-muted">
                <Download size={11} />Baixar PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RelatoriosPage() {
  return (
    <MazzelLayout activeModule="relatorios" breadcrumbs={["Uniao Brasil", "Relatorios"]} alertCount={7}>
      <RelatoriosContent />
    </MazzelLayout>
  );
}
