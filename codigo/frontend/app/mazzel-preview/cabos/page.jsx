"use client";

import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { Info, Megaphone } from "lucide-react";
import useSWR from "swr";

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8002";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ub_token");
}

async function fetchCabos() {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const resp = await fetch(`${API_BASE}/cabos`, { headers, credentials: "include" });
  if (!resp.ok) throw new Error(`Erro ${resp.status}`);
  return resp.json();
}

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>
      <Info size={8} />dados de demonstracao
    </span>
  );
}

const MOCK_CABOS = [
  { id: 1, nome: "Jose Santos", uf: "BA", zona: "Recôncavo", cidades: 4, ativos: 12 },
  { id: 2, nome: "Maria Oliveira", uf: "BA", zona: "Oeste", cidades: 6, ativos: 18 },
  { id: 3, nome: "Pedro Almeida", uf: "SP", zona: "Interior", cidades: 8, ativos: 24 },
];

function CabosContent() {
  const { data, error, isLoading } = useSWR("cabos", fetchCabos, { shouldRetryOnError: false });
  const cabos = !error && data?.length > 0 ? data : MOCK_CABOS;
  const isMock = !data || data.length === 0 || error;

  return (
    <div className="px-8 py-6" style={{ background: "var(--mz-bg-page)", minHeight: "100%" }}>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="text-[11px] mz-t-fg-dim tracking-[0.18em] uppercase font-semibold">Operacional</div>
          {isMock && <MockBadge />}
        </div>
        <h1 className="text-[24px] font-bold mz-t-fg-strong mt-0.5 flex items-center gap-2">
          <Megaphone size={22} />Cabos Eleitorais
        </h1>
        <div className="text-[13px] mz-t-fg-muted mt-1">
          Gestao de cabos eleitorais por zona - presenca territorial
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {cabos.map(c => (
          <div key={c.id} className="rounded-xl p-4 mz-ring-soft" style={{ background: "var(--mz-bg-card)" }}>
            <div className="text-[14px] font-bold mz-t-fg-strong">{c.nome}</div>
            <div className="text-[11px] mz-t-fg-dim mt-0.5">{c.zona} - {c.uf}</div>
            <div className="flex items-center gap-4 mt-3 text-[11px]">
              <div><span className="mz-t-fg-dim">cidades </span><span className="font-bold">{c.cidades}</span></div>
              <div><span className="mz-t-fg-dim">ativos </span><span className="font-bold">{c.ativos}</span></div>
            </div>
          </div>
        ))}
      </div>

      {isLoading && <div className="text-[12px] mz-t-fg-dim mt-4">Carregando...</div>}
    </div>
  );
}

export default function CabosPage() {
  return (
    <MazzelLayout activeModule="cabos" breadcrumbs={["Uniao Brasil", "Cabos Eleitorais"]} alertCount={7}>
      <CabosContent />
    </MazzelLayout>
  );
}
