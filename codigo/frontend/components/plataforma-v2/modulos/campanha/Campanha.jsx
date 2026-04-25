"use client";

/* Campanha 2026 - shell com 7 telas (tabs horizontais).
 * Tela 1 (Hub) entregue; telas 2-7 como placeholders com roadmap explicito. */

import { useState } from "react";
import { Icon } from "../../Icon";
import { usePlatform } from "../../PlatformContext";
import { ROLES } from "../../rbac";
import { ScreenTabs } from "./primitives";
import { CAMP_SCREENS } from "./data";
import { Tela1Hub } from "./Tela1Hub";
import { Tela4Hierarquia } from "./Tela4Hierarquia";
import { Tela5Cadastro } from "./Tela5Cadastro";
import { Tela6Comando } from "./Tela6Comando";
import { Tela7Chat } from "./Tela7Chat";
import { Tela8Ranking } from "./Tela8Ranking";
import { MapaDoCabo } from "../mapa-cabo/MapaDoCabo";

function ComingSoon({ title, description, bullets }) {
  return (
    <div className="p-6">
      <div
        className="rounded-xl p-10 text-center"
        style={{ background: "var(--bg-card)", border: "1px solid var(--rule)" }}
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl t-bg-tenant-soft mb-4">
          <Icon name="Build" size={22} className="t-tenant" />
        </div>
        <div className="text-[20px] font-semibold t-fg-strong">{title}</div>
        <div className="text-[13px] t-fg-muted mt-2 max-w-xl mx-auto">{description}</div>
        {bullets && (
          <ul className="text-[12px] t-fg-muted mt-4 space-y-1 max-w-md mx-auto text-left">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="t-fg-ghost mt-[3px]">·</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function Campanha() {
  const [screen, setScreen] = useState("hub");
  const { role } = usePlatform();
  const persona = {
    label: ROLES[role]?.label || role,
    scope: ROLES[role]?.scope || "-",
  };

  return (
    <div style={{ minHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column" }}>
      <ScreenTabs screens={CAMP_SCREENS} active={screen} onChange={setScreen} />
      <div className="flex-1">
        {screen === "hub" && <Tela1Hub persona={persona} />}
        {screen === "mapa" && <MapaDoCabo />}
        {screen === "arvore" && <Tela4Hierarquia />}
        {screen === "cadastro" && <Tela5Cadastro />}
        {screen === "crm" && <Tela6Comando />}
        {screen === "chat" && <Tela7Chat />}
        {screen === "ranking" && <Tela8Ranking />}
      </div>
    </div>
  );
}
