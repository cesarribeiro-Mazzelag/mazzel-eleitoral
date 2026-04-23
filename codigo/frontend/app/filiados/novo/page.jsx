"use client";

import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { FormularioFiliado } from "@/components/filiados/FormularioFiliado";
import { BotaoVoltar } from "@/components/ui/BotaoVoltar";
import { UserPlus } from "lucide-react";

export default function NovoFiliadoPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BotaoVoltar onClick={() => router.push("/filiados")} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-5 h-5 text-uniao-azul" />
            <h1 className="text-2xl font-bold text-gray-900">Novo Filiado</h1>
          </div>
          <p className="text-sm text-gray-500">
            CPF e Título de Eleitor são validados automaticamente.
            O CPF nunca é armazenado em claro.
          </p>
        </div>

        <div className="card p-6">
          <FormularioFiliado
            onSucesso={() => router.push("/filiados")}
          />
        </div>
      </div>
    </AppLayout>
  );
}
