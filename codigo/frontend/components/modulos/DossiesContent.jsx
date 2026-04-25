"use client";

/**
 * DossiesContent - Biblioteca de Dossies (grid de cards FIFA V8).
 *
 * Reutiliza TabPoliticos V2 (filtros CapCut, undo/redo, scroll infinito).
 * Pode ser embebido em qualquer layout (v1 ou plataforma v2).
 *
 * Props:
 *   - dossieHrefBase: prefixo da rota do dossie individual
 *     ex: "/v1/dossies" ou "/mazzel-preview/dossies"
 */

import { useRouter } from "next/navigation";
import { TabPoliticos } from "@/components/radar/tabs/TabPoliticos";

export function DossiesContent({ dossieHrefBase }) {
  const router = useRouter();
  return (
    <div style={{ background: "var(--mz-bg-page)", minHeight: "100%" }}>
      <TabPoliticos
        onAbrirDossie={(candidatoId) => router.push(`${dossieHrefBase}/${candidatoId}`)}
      />
    </div>
  );
}
