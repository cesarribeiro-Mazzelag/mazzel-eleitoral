"use client";

/**
 * Página /design-lab - showroom de elementos visuais do produto inteiro.
 *
 * Cada seção tem várias variações numeradas. O usuário aponta o que escolhe
 * e a partir daí todas as páginas (mapa, dashboards, radar, etc) usam esses
 * elementos como referência.
 */
import { DesignLabShell } from "@/components/design-lab/DesignLabShell";
import type { Section } from "@/components/design-lab/types";
import { Section1Tipografia } from "@/components/design-lab/sections/Section1Tipografia";
import { Section2Cores } from "@/components/design-lab/sections/Section2Cores";
import { Section3Botoes } from "@/components/design-lab/sections/Section3Botoes";
import { Section4KPI } from "@/components/design-lab/sections/Section4KPI";
import { Section5Pessoas } from "@/components/design-lab/sections/Section5Pessoas";
import { Section6Partidos } from "@/components/design-lab/sections/Section6Partidos";
import { Section7Sidebar } from "@/components/design-lab/sections/Section7Sidebar";
import { Section8TopBar } from "@/components/design-lab/sections/Section8TopBar";
import { Section9Capitulos } from "@/components/design-lab/sections/Section9Capitulos";
import { Section10LinhaDoTempo } from "@/components/design-lab/sections/Section10LinhaDoTempo";
import { Section11Mapa } from "@/components/design-lab/sections/Section11Mapa";
import { Section12Tooltip } from "@/components/design-lab/sections/Section12Tooltip";

const SECTIONS: Section[] = [
  Section1Tipografia,
  Section2Cores,
  Section3Botoes,
  Section4KPI,
  Section5Pessoas,
  Section6Partidos,
  Section7Sidebar,
  Section8TopBar,
  Section9Capitulos,
  Section10LinhaDoTempo,
  Section11Mapa,
  Section12Tooltip,
];

export default function DesignLabPage() {
  return <DesignLabShell sections={SECTIONS} />;
}
