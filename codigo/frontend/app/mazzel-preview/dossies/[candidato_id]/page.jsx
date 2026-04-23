"use client";

/**
 * /mazzel-preview/dossies/[candidato_id] - Dossie completo dentro do MazzelLayout.
 * Reutiliza o DossieBureau (mesmo componente do /radar/politicos/[id]).
 */
import { useParams } from "next/navigation";
import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { DossieBureau } from "@/components/dossie/DossieBureau";

export default function DossieDetalhePage() {
  const { candidato_id } = useParams();

  return (
    <MazzelLayout
      activeModule="dossies"
      breadcrumbs={["Uniao Brasil", "Dossies", `#${candidato_id}`]}
      alertCount={7}
    >
      <DossieBureau />
    </MazzelLayout>
  );
}
