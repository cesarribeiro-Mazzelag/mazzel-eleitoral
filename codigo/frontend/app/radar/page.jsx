"use client";

/**
 * /radar — Hub principal do Radar Político.
 * 4 tabs: Partidos, Políticos, Análise, Em destaque.
 *
 * Conceito (Cesar 15/04 noite):
 *   - Partidos = entidades coletivas (estudo de força partidária)
 *   - Políticos = pessoas (estudo de candidatos individuais)
 *   - Análise = KPIs e dashboards macro
 *   - Em destaque = histórias contextuais
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { TabPartidos } from "@/components/radar/tabs/TabPartidos";
import { TabPoliticos } from "@/components/radar/tabs/TabPoliticos";
import { TabAnalise } from "@/components/radar/tabs/TabAnalise";
import { TabDestaque } from "@/components/radar/tabs/TabDestaque";
import { Building2, Users, BarChart3, Sparkles } from "lucide-react";

const TABS = [
  { id: "partidos",  label: "Partidos",     icon: Building2,  Component: TabPartidos },
  { id: "politicos", label: "Políticos",    icon: Users,      Component: TabPoliticos },
  { id: "analise",   label: "Análise",      icon: BarChart3,  Component: TabAnalise },
  { id: "destaque",  label: "Em destaque",  icon: Sparkles,   Component: TabDestaque },
];

export default function RadarPage() {
  const [tabAtiva, setTabAtiva] = useState("politicos");
  const router = useRouter();

  const TabContent = TABS.find(t => t.id === tabAtiva)?.Component ?? (() => null);

  // Click no card abre a Champion Page do politico (rota rica existente).
  // NAO usar /dossie/[id] - aquela e a rota antiga com modal em variant tela.
  const abrirDossie = (candidatoId) => {
    router.push(`/radar/politicos/${candidatoId}`);
  };

  return (
    <AppLayout>
      <div className="flex flex-col w-full h-full bg-gray-50">
        {/* ── Header compacto: titulo inline com tabs ──────────────── */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-black text-gray-900">Radar Politico</h1>
            <nav className="flex items-center gap-0.5">
              {TABS.map(t => {
                const Icon = t.icon;
                const ativo = tabAtiva === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTabAtiva(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      ativo
                        ? "text-brand-800 bg-brand-50"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* ── Conteudo ─────────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto p-4">
          <TabContent onAbrirDossie={abrirDossie} />
        </main>
      </div>
    </AppLayout>
  );
}
