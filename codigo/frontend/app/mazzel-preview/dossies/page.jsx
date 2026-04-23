"use client";

/**
 * /mazzel-preview/dossies - Biblioteca de Dossies.
 * Reutiliza TabPoliticos V2 (CardPolitico V8, filtros CapCut, undo/redo, scroll infinito).
 * Click no card navega para /mazzel-preview/dossies/[id] (DossieBureau).
 */
import { useRouter } from "next/navigation";
import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { TabPoliticos } from "@/components/radar/tabs/TabPoliticos";

function DossiesContent() {
  const router = useRouter();
  return (
    <div style={{ background: "var(--mz-bg-page)", minHeight: "100%" }}>
      <TabPoliticos
        onAbrirDossie={(candidatoId) => router.push(`/mazzel-preview/dossies/${candidatoId}`)}
      />
    </div>
  );
}

export default function DossiesPage() {
  return (
    <MazzelLayout
      activeModule="dossies"
      breadcrumbs={["Uniao Brasil", "Dossies"]}
      alertCount={7}
    >
      <DossiesContent />
    </MazzelLayout>
  );
}
