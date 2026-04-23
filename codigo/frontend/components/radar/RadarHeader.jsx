"use client";

/**
 * Header do Radar Político — título + tabs Políticos/Partidos + aviso
 * "Dados em validação" (quando modo_dados=EXPERIMENTAL).
 *
 * Compartilhado entre /radar/politicos e /radar/partidos.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, UserCheck, Landmark } from "lucide-react";
import { AvisoModoExperimental } from "./AvisoModoExperimental";

const TABS = [
  { path: "/radar/politicos", label: "Políticos", icon: UserCheck },
  { path: "/radar/partidos",  label: "Partidos",  icon: Landmark },
];

export function RadarHeader() {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
          <Radar className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            Radar Político
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Hub de inteligência sobre políticos e partidos com classificação,
            risco e métrica destaque.
          </p>
        </div>
      </div>

      {/* Aviso de modo experimental — só aparece quando o backend reporta */}
      <AvisoModoExperimental />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map((tab) => {
          const ativo = pathname?.startsWith(tab.path);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={[
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                ativo
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
              ].join(" ")}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
