"use client";

/**
 * Meu Dossiê — visualização e download do dossiê próprio.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Download } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
function tkn() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ub_token") ?? "";
}

export default function MeuDossiePage() {
  const router = useRouter();
  const [baixando, setBaixando] = useState(false);

  // Pega o candidato_id do usuário logado via /meu-painel/resumo
  const [candidatoId, setCandidatoId] = useState(null);

  // Carrega o candidato_id na montagem
  useState(() => {
    fetch(`${API}/meu-painel/resumo`, {
      headers: { Authorization: `Bearer ${tkn()}` },
    })
      .then((r) => r.json())
      .then((d) => setCandidatoId(d?.candidato?.id ?? null))
      .catch(() => {});
  });

  async function baixarPdf() {
    setBaixando(true);
    try {
      const resp = await fetch(`${API}/meu-painel/dossie/pdf`, {
        headers: { Authorization: `Bearer ${tkn()}` },
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "meu_dossie.pdf";
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setBaixando(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Dossiê</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualize e baixe seu dossiê político completo.
          </p>
        </div>

        <div className="card p-8 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-full bg-uniao-azul/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-uniao-azul" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800">Dossiê Político Completo</h2>
            <p className="text-sm text-gray-500 mt-1">
              Histórico eleitoral, votos por município, evolução gráfica e informações do perfil.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button
              onClick={() => candidatoId && router.push(`/radar/politicos/${candidatoId}`)}
              disabled={!candidatoId}
              className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              Visualizar
            </button>
            <button
              onClick={baixarPdf}
              disabled={baixando}
              className="flex-1 btn-secondary flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {baixando ? "Gerando..." : "Baixar PDF"}
            </button>
          </div>
        </div>
      </div>

    </AppLayout>
  );
}
