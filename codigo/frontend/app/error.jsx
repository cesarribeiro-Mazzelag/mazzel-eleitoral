"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Logar erros críticos (pode integrar Sentry aqui no futuro)
    console.error("[Plataforma UB] Erro:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Algo deu errado</h1>
        <p className="text-gray-500 text-sm mb-2">
          Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
        </p>
        {error?.message && (
          <p className="text-xs text-red-400 font-mono bg-red-50 rounded-lg px-3 py-2 mb-6">
            {error.message}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 bg-uniao-azul text-white text-sm font-medium rounded-xl hover:bg-uniao-azul/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
          <a
            href="/dashboard"
            className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Voltar ao painel
          </a>
        </div>
      </div>
    </div>
  );
}
