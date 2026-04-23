"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { MapaEleitoral } from "@/components/map/MapaEleitoral";

export default function MapaPage() {
  return (
    <AppLayout semPadding semChatIA>
      <MapaEleitoral />
    </AppLayout>
  );
}
