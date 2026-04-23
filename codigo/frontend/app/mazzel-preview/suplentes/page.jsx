"use client";

import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { Info, UserPlus } from "lucide-react";

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>
      <Info size={8} />em construcao
    </span>
  );
}

const MOCK_SUPLENTES = [
  { id: 1, nome: "Carla Nunes", cargo: "Dep. Federal", uf: "SP", posicao: 1, titular: "Eduardo Amaral" },
  { id: 2, nome: "Roberto Viana", cargo: "Dep. Federal", uf: "BA", posicao: 2, titular: "Jaques Wagner" },
  { id: 3, nome: "Beatriz Lima", cargo: "Senador", uf: "RJ", posicao: 1, titular: "Flavio Bolsonaro" },
];

function SuplentesContent() {
  return (
    <div className="px-8 py-6" style={{ background: "var(--mz-bg-page)", minHeight: "100%" }}>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="text-[11px] mz-t-fg-dim tracking-[0.18em] uppercase font-semibold">Operacional</div>
          <MockBadge />
        </div>
        <h1 className="text-[24px] font-bold mz-t-fg-strong mt-0.5 flex items-center gap-2">
          <UserPlus size={22} />Suplentes
        </h1>
        <div className="text-[13px] mz-t-fg-muted mt-1">
          Gestao de suplentes do partido - sucessao de mandato
        </div>
      </div>

      <div className="mz-ring-soft rounded-xl overflow-hidden" style={{ background: "var(--mz-bg-card)" }}>
        <table className="w-full text-[12px]">
          <thead style={{ background: "var(--mz-bg-card-2)" }}>
            <tr className="mz-t-fg-dim uppercase tracking-[0.14em] text-[10px]">
              <th className="px-4 py-3 text-left">Suplente</th>
              <th className="px-4 py-3 text-left">Cargo</th>
              <th className="px-4 py-3 text-left">UF</th>
              <th className="px-4 py-3 text-left">Posicao</th>
              <th className="px-4 py-3 text-left">Titular</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_SUPLENTES.map(s => (
              <tr key={s.id} className="border-t" style={{ borderColor: "var(--mz-rule)" }}>
                <td className="px-4 py-3 font-semibold mz-t-fg-strong">{s.nome}</td>
                <td className="px-4 py-3 mz-t-fg-muted">{s.cargo}</td>
                <td className="px-4 py-3 mz-t-fg-muted">{s.uf}</td>
                <td className="px-4 py-3 mz-t-fg-muted">{s.posicao}</td>
                <td className="px-4 py-3 mz-t-fg-muted">{s.titular}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SuplentesPage() {
  return (
    <MazzelLayout activeModule="suplentes" breadcrumbs={["Uniao Brasil", "Suplentes"]} alertCount={7}>
      <SuplentesContent />
    </MazzelLayout>
  );
}
