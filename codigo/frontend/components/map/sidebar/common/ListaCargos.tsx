"use client";

import type { SelecionadoItem, EleitoPorCargo } from "@/lib/types";
import { ORDEM_CARGO, COR_CARGO } from "../constants";
import { CardPolitico } from "./CardPolitico";

export function ListaCargos({
  cargos, cargoDestaque, selecionados, mostrarPartido = false,
  onAtivarGradiente, onAbrirDossie,
}: {
  cargos: Array<{ cargo: string; eleitos: (EleitoPorCargo & { partido_num?: number; partido_sigla?: string })[] }>;
  cargoDestaque?: string | null;
  selecionados: SelecionadoItem[];
  mostrarPartido?: boolean;
  /** 2 cliques no card → ativa modo gradiente / entra comparação se já tem outro selecionado. */
  onAtivarGradiente: (id: number, nome: string, partido_num?: number, cargo?: string, ano?: number) => void;
  /** Botão ⓘ no card → abre o dossiê. */
  onAbrirDossie: (id: number) => void;
}) {
  if (cargos.length === 0) return null;
  const ordenados = [...cargos].sort((a, b) => {
    const ia = ORDEM_CARGO.indexOf(a.cargo), ib = ORDEM_CARGO.indexOf(b.cargo);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="p-3 space-y-4">
      {ordenados.map(({ cargo, eleitos }) => {
        const destaque = cargoDestaque && cargo.toUpperCase() === cargoDestaque.toUpperCase();
        return (
          <div key={cargo} className={destaque ? "rounded-xl ring-2 ring-brand-200 p-1.5 -mx-1" : ""}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${COR_CARGO[cargo] ?? "bg-gray-100 text-gray-700"}`}>
                {cargo}
              </span>
              <span className="text-[10px] text-gray-400">{eleitos.length}</span>
            </div>
            <div className="space-y-1">
              {eleitos.map(e => {
                const sel = selecionados.find(s => s.tipo === "candidato" && s.id === e.candidato_id);
                return (
                  <CardPolitico
                    key={`${e.candidato_id}-${e.cargo}-${e.ano}`}
                    e={e}
                    corSelecionado={sel?.cor ?? null}
                    mostrarPartido={mostrarPartido}
                    /* 1 click: noop. 2 cliques: ativa gradiente / entra comparação */
                    onSingleClick={() => {}}
                    onDoubleClick={() => onAtivarGradiente(e.candidato_id, e.nome, e.partido_num, e.cargo, e.ano)}
                    onAbrirDossie={() => onAbrirDossie(e.candidato_id)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
