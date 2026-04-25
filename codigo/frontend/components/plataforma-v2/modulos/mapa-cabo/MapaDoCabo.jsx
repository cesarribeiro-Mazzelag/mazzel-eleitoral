"use client";

/* Mapa do Cabo - painel do Coordenador Territorial.
 * Adaptado de Mapa do Cabo.html App. */

import { useState } from "react";
import { INITIAL_OWNERS } from "./data";
import { MapCanvas } from "./MapCanvas";
import { LeftToolbar } from "./LeftToolbar";
import { RightDrawer } from "./RightDrawer";

export function MapaDoCabo() {
  const [layer, setLayer] = useState("responsavel");
  const [editMode, setEditMode] = useState("view");
  const [showRoutes, setShowRoutes] = useState(true);
  const [selected, setSelected] = useState(null);
  const [lassoSet, setLassoSet] = useState(new Set());
  const [caboFocus, setCaboFocus] = useState(null);
  const [owners, setOwners] = useState({ ...INITIAL_OWNERS });

  function onLassoAdd(ids) {
    setLassoSet(new Set(ids));
    setSelected(null);
    setCaboFocus(null);
  }

  function onAssign(caboId) {
    setOwners((cur) => {
      const next = { ...cur };
      for (const id of lassoSet) next[id] = caboId;
      return next;
    });
    setLassoSet(new Set());
    setEditMode("view");
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 48px)" }}
    >
      <div
        className="flex items-center justify-between px-5 h-11 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--rule)", background: "var(--bg-topbar)" }}
      >
        <div>
          <div className="text-[10px] t-fg-dim uppercase tracking-[0.14em] font-semibold">
            Coordenação territorial · Bairro Tomba
          </div>
          <div className="text-[13px] font-bold t-fg-strong leading-tight">Mapa do Cabo</div>
        </div>
        <div className="text-[11px] t-fg-muted">Coordenador: <span className="t-fg-strong font-semibold">Otávio Campos</span> · Recôncavo</div>
      </div>

      <div className="flex flex-1 min-h-0">
        <LeftToolbar
          layer={layer}       setLayer={setLayer}
          editMode={editMode} setEditMode={setEditMode}
          showRoutes={showRoutes} setShowRoutes={setShowRoutes}
          caboFocus={caboFocus} setCaboFocus={setCaboFocus}
          owners={owners}
        />
        <div className="flex-1 min-w-0 relative">
          <MapCanvas
            layer={layer}
            owners={owners}
            selected={selected}
            onSelect={(id) => { setSelected(id); setCaboFocus(null); setLassoSet(new Set()); }}
            editMode={editMode}
            lassoSet={lassoSet}
            onLassoAdd={onLassoAdd}
            showRoutes={showRoutes}
            caboFocus={caboFocus}
          />
        </div>
        <RightDrawer
          selected={selected}
          setSelected={setSelected}
          lassoSet={lassoSet}
          setLassoSet={setLassoSet}
          onAssign={onAssign}
          caboFocus={caboFocus}
          owners={owners}
        />
      </div>
    </div>
  );
}
