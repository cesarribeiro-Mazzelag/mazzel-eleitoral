"use client";

import { Users, Vote, BarChart2, MapPin, Star, Crown } from "lucide-react";

// ── Sidebar Compact (modo icones) ───────────────────────────────────────────

export function SidebarCompact({
  cargoMapa, onSelectCargo,
}: {
  cargoMapa: string | null;
  onSelectCargo: (cargo: string | null) => void;
}) {
  const cargos: Array<{ id: string | null; label: string; icon: any; color: string }> = [
    { id: "VIGENTES",         label: "Vigentes",     icon: Crown,     color: "text-purple-600" },
    { id: "PRESIDENTE",       label: "Presidente",   icon: Star,      color: "text-purple-700" },
    { id: "GOVERNADOR",       label: "Governador",   icon: MapPin,    color: "text-brand-700" },
    { id: "SENADOR",          label: "Senador",      icon: Users,     color: "text-sky-700" },
    { id: "DEPUTADO FEDERAL", label: "Dep. Federal", icon: Vote,      color: "text-teal-700" },
    { id: "DEPUTADO ESTADUAL",label: "Dep. Estadual",icon: Vote,      color: "text-green-700" },
    { id: "PREFEITO",         label: "Prefeito",     icon: BarChart2, color: "text-orange-700" },
    { id: "VEREADOR",         label: "Vereador",     icon: Users,     color: "text-amber-700" },
  ];
  return (
    <div className="flex-1 flex flex-col items-center py-3 gap-1 overflow-y-auto">
      {cargos.map((c) => {
        const ativo = cargoMapa === c.id;
        const Icon = c.icon;
        return (
          <button
            key={c.id ?? "todos"}
            onClick={() => onSelectCargo(c.id)}
            title={c.label}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
              ativo ? "bg-brand-50 ring-2 ring-brand-300" : "hover:bg-gray-100"
            }`}
          >
            <Icon className={`w-5 h-5 ${ativo ? c.color : "text-gray-400"}`} />
          </button>
        );
      })}
    </div>
  );
}
