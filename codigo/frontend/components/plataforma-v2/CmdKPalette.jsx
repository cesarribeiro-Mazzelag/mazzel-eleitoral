"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { UF_LIST, RADAR_CANDIDATOS } from "./data";
import { visibleModules } from "./rbac";

export function CmdKPalette({ open, onClose, role }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const navigate = (href) => {
    onClose();
    router.push(href);
  };

  const items = useMemo(() => {
    const modules = visibleModules(role).map((m) => ({
      kind: "Módulo", label: m.label, icon: m.icon, action: () => navigate(m.href),
    }));
    const candidatos = RADAR_CANDIDATOS.slice(0, 12).map((c) => ({
      kind: "Candidato", label: `${c.nome} · ${c.partido}-${c.uf}`, icon: "User",
      action: () => navigate("/mazzel-preview/dossies"),
    }));
    const ufs = UF_LIST.map((uf) => ({
      kind: "UF", label: `Unidade Federativa · ${uf}`, icon: "MapPin",
      action: () => navigate(`/mazzel-preview/mapa?uf=${uf}`),
    }));

    const base = [...modules, ...candidatos, ...ufs];
    if (!q) return base.slice(0, 14);
    const lc = q.toLowerCase();
    return base.filter((i) => i.label.toLowerCase().includes(lc) || i.kind.toLowerCase().includes(lc)).slice(0, 14);
  }, [q, role, router]);

  if (!open) return null;

  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--rule)" }}>
          <Icon name="Search" size={14} className="t-fg-dim" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="O que você procura?"
            className="flex-1 bg-transparent outline-none text-[13px] t-fg placeholder:t-fg-dim"
          />
          <span className="kbd">ESC</span>
        </div>
        <div className="max-h-[380px] overflow-y-auto py-2">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] t-fg-dim">Nenhum resultado.</div>
          )}
          {items.map((it, i) => (
            <button
              key={i}
              onClick={it.action}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--chart-hover)]"
              type="button"
            >
              <Icon name={it.icon} size={14} className="t-fg-muted" />
              <span className="text-[12.5px] t-fg flex-1">{it.label}</span>
              <span className="text-[10px] t-fg-dim tracking-wider uppercase">{it.kind}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
