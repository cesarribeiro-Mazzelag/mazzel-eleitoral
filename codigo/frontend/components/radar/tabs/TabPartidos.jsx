"use client";

/**
 * Tab Partidos V2 - aprovado em 17/04/2026.
 *
 * Grid de CardPartido V2 (4:5, logo central, chip contexto, 3 atributos).
 * Usa /radar/partidos (que ja retorna fifa.overall + tier do partido).
 *
 * Contexto UF (escopo regional) fica pra Etapa 7 - backend tenant-partido.
 */
import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { useDebounce } from "@/hooks/useDebounce";
import { useFilterHistory } from "@/hooks/useFilterHistory";
import { CardPartido } from "@/components/radar/CardPartido";
import { CapCutToolbar } from "@/components/radar/CapCutToolbar";
import { Target, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
const tkn = () => (typeof window === "undefined" ? "" : localStorage.getItem("ub_token") ?? "");

const FILTROS_INICIAIS = {
  busca: "",
  cargo: "",
  estado_uf: "",
  municipio_id: "",
  municipio_nome: "",
  zona: "",
  ano: "",
  tier: "",
  ordenar_por: "votos_total",
};

const fetcher = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${tkn()}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export function TabPartidos() {
  const { estado: filtros, push, undo, redo, canUndo, canRedo } = useFilterHistory(FILTROS_INICIAIS);
  const [visualizacao, setVisualizacao] = useState("grid");
  const buscaDeb = useDebounce(filtros.busca, 350);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filtros.ano) p.set("ano", String(filtros.ano));
    if (buscaDeb && buscaDeb.length >= 2) p.set("busca", buscaDeb);
    p.set("ordenar_por", filtros.ordenar_por);
    p.set("pagina", "1");
    p.set("por_pagina", "100");
    return p.toString();
  }, [filtros.ano, filtros.ordenar_por, buscaDeb]);

  const { data, error, isLoading } = useSWR(
    `${API}/radar/partidos?${queryString}`,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const partidos = data?.items ?? [];

  return (
    <div className="-mx-4 -my-4 flex flex-col">
      <CapCutToolbar
        filtros={filtros}
        onChange={push}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        visualizacao={visualizacao}
        onVisualizacao={setVisualizacao}
      />

      <div className="px-6 py-2 text-[11px] text-gray-500 flex items-center justify-between bg-gray-50">
        <span>
          <span className="font-black text-gray-900 tabular-nums">{partidos.length}</span> partidos
          {filtros.estado_uf && <span className="ml-1 text-purple-600 font-bold">· em {filtros.estado_uf}</span>}
        </span>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            atualizando...
          </span>
        )}
      </div>

      <div className="px-6 py-5 bg-gray-50 flex-1">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            Erro: {String(error.message ?? error)}
          </div>
        )}

        {!isLoading && partidos.length === 0 && !error && (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">Nenhum partido encontrado</p>
          </div>
        )}

        {partidos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {partidos.map(p => (
              <CardPartido
                key={p.partido_id}
                partido={p}
                escopoUF={filtros.estado_uf || null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
