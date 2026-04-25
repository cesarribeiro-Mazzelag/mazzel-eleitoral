"use client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PoliticosContent } from "@/components/modulos/PoliticosContent";

export default function RadarPoliticosPage() {
  return (
    <AppLayout>
      <PoliticosContent hrefBase="/radar/politicos" mostrarHeader={true} />
    </AppLayout>
  );
}
