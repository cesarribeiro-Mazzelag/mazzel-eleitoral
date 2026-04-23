"use client";

import { useState } from "react";
import { MazzelLayout } from "@/components/layout-mazzel/MazzelLayout";
import { BarChart3, Map, GitBranch, Users, Crosshair, Shield, Trophy, ExternalLink } from "lucide-react";
import Link from "next/link";

import CampanhaHub from "./_tabs/CampanhaHub";
import CampanhaMapa from "./_tabs/CampanhaMapa";
import CampanhaHierarquia from "./_tabs/CampanhaHierarquia";
import CampanhaLiderancas from "./_tabs/CampanhaLiderancas";
import CampanhaComando from "./_tabs/CampanhaComando";
import CampanhaChat from "./_tabs/CampanhaChat";
import CampanhaRanking from "./_tabs/CampanhaRanking";

const TABS = [
  { id:"hub",        label:"Hub",              Icon: BarChart3 },
  { id:"mapa",       label:"Mapa Operacional",  Icon: Map },
  { id:"hierarquia", label:"Hierarquia",        Icon: GitBranch },
  { id:"liderancas", label:"Lideranças",        Icon: Users },
  { id:"comando",    label:"Comando de Campo",  Icon: Crosshair },
  { id:"chat",       label:"Chat",              Icon: Shield },
  { id:"ranking",    label:"Ranking",           Icon: Trophy },
];

const TAB_CONTENT = {
  hub:        <CampanhaHub />,
  mapa:       <CampanhaMapa />,
  hierarquia: <CampanhaHierarquia />,
  liderancas: <CampanhaLiderancas />,
  comando:    <CampanhaComando />,
  chat:       <CampanhaChat />,
  ranking:    <CampanhaRanking />,
};

function CampanhaContent() {
  const [activeTab, setActiveTab] = useState("hub");

  return (
    <div className="flex flex-col" style={{ background:"var(--mz-bg-page)", minHeight:"100%", height:"100%" }}>
      {/* Page header */}
      <div className="px-8 pt-6 pb-0" style={{ background:"var(--mz-bg-card)", borderBottom:"1px solid var(--mz-rule)" }}>
        <div className="flex items-end justify-between mb-4 max-w-[1680px] mx-auto">
          <div>
            <div className="text-[11px] mz-t-fg-dim tracking-[0.18em] uppercase font-semibold">Campanha 2026</div>
            <h1 className="text-[30px] font-black mz-t-fg-strong mt-1 leading-none">Central de campanha</h1>
            <div className="text-[13px] mz-t-fg-muted mt-1.5">Jaques Wagner · Senador · BA · score 73 · T-12m</div>
          </div>
          <div className="flex items-center gap-3 pb-1">
            <Link href="/mazzel-preview/campanha/mapa-do-cabo"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11.5px] font-semibold mz-t-fg-muted"
              style={{ background:"var(--mz-rule)", border:"1px solid var(--mz-rule-strong,rgba(0,0,0,0.1))" }}>
              <ExternalLink size={11}/>Mapa do Cabo
            </Link>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 max-w-[1680px] mx-auto overflow-x-auto" style={{ scrollbarWidth:"none" }}>
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id)}
                className="flex items-center gap-2 px-4 py-3 text-[12px] font-semibold whitespace-nowrap border-b-2 transition-all"
                style={{
                  borderColor: active ? "var(--mz-tenant-primary,#002A7B)" : "transparent",
                  color: active ? "var(--mz-tenant-primary,#002A7B)" : "var(--mz-fg-muted)",
                  background: "transparent",
                }}>
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {TAB_CONTENT[activeTab]}
      </div>
    </div>
  );
}

export default function CampanhaPage() {
  return (
    <MazzelLayout activeModule="campanha" breadcrumbs={["Mazzel","Campanha 2026"]}>
      <CampanhaContent />
    </MazzelLayout>
  );
}
