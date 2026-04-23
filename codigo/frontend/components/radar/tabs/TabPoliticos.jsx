"use client";

/**
 * Tab Politicos V2 - aprovado em 17/04/2026.
 *
 * Usa CardPolitico V2 (4:5, Overall+laurel, insignias, 6 atributos).
 * Topbar CapCutToolbar + Breadcrumb + useFilterHistory (undo/redo).
 * Scroll infinito via IntersectionObserver (<= Etapa 6 do plano).
 *
 * Low-latency: SWR com keepPreviousData, debounce na busca, fetch
 * acontece apenas quando filtros serializados realmente mudam.
 */
import { useMemo, useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { useDebounce } from "@/hooks/useDebounce";
import { useFilterHistory } from "@/hooks/useFilterHistory";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { CardPolitico } from "@/components/radar/CardPolitico";
import { CapCutToolbar } from "@/components/radar/CapCutToolbar";
import { Breadcrumb } from "@/components/radar/Breadcrumb";
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
  ordenar_por: "overall_desc",
};

const fetcher = async (url) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${tkn()}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export function TabPoliticos({ onAbrirDossie }) {
  const { estado: filtros, push, undo, redo, canUndo, canRedo } = useFilterHistory(FILTROS_INICIAIS);
  const [visualizacao, setVisualizacao] = useState("grid");
  const [pagina, setPagina] = useState(1);
  const [itensAcumulados, setItensAcumulados] = useState([]);
  const buscaDeb = useDebounce(filtros.busca, 350);

  // Chave serializada dos filtros (exceto pagina) - dispara reset quando muda
  const chaveFiltros = `${filtros.cargo}|${filtros.estado_uf}|${filtros.ano}|${filtros.tier}|${filtros.ordenar_por}|${buscaDeb}|${visualizacao}`;

  useEffect(() => {
    setPagina(1);
    setItensAcumulados([]);
  }, [chaveFiltros]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filtros.cargo)      p.set("cargo", filtros.cargo);
    if (filtros.estado_uf)  p.set("estado_uf", filtros.estado_uf);
    if (filtros.ano)        p.set("ano", String(filtros.ano));
    if (filtros.tier)       p.set("tier", filtros.tier);
    if (buscaDeb && buscaDeb.length >= 2) p.set("busca", buscaDeb);
    p.set("ordenar_por", filtros.ordenar_por);
    p.set("pagina", String(pagina));
    p.set("por_pagina", "24");
    return p.toString();
  }, [filtros.cargo, filtros.estado_uf, filtros.ano, filtros.tier, filtros.ordenar_por, buscaDeb, pagina]);

  const { data, error, isLoading } = useSWR(
    `${API}/radar/politicos?${queryString}`,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  const total = data?.total ?? 0;
  const totalPaginas = Math.ceil(total / 24) || 1;
  const temMais = pagina < totalPaginas;

  // Acumular itens quando nova pagina chega
  useEffect(() => {
    if (!data?.items) return;
    setItensAcumulados((prev) => {
      if (pagina === 1) return data.items;
      // Evita duplicar se SWR retornar mesma pagina 2x (keepPreviousData)
      const ids = new Set(prev.map(i => i.candidatura_id));
      const novos = data.items.filter(i => !ids.has(i.candidatura_id));
      return [...prev, ...novos];
    });
  }, [data, pagina]);

  const politicos = itensAcumulados;

  const mudarFiltros = (novo) => push(novo);

  const carregarMais = useCallback(() => {
    if (!isLoading && temMais) setPagina(p => p + 1);
  }, [isLoading, temMais]);

  const sentinelaRef = useInfiniteScroll({
    onCarregarMais: carregarMais,
    temMais,
    carregando: isLoading,
  });

  return (
    <div className="-mx-4 -my-4 flex flex-col">
      {/* Topbar CapCut */}
      <CapCutToolbar
        filtros={filtros}
        onChange={mudarFiltros}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        visualizacao={visualizacao}
        onVisualizacao={setVisualizacao}
      />

      {/* Breadcrumb geografico */}
      <Breadcrumb filtros={filtros} onChange={mudarFiltros} />

      {/* Contador de resultados */}
      <div className="px-6 py-2 text-[11px] text-gray-500 flex items-center justify-between bg-gray-50">
        <span>
          <span className="font-black text-gray-900 tabular-nums">{total.toLocaleString("pt-BR")}</span> políticos encontrados
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
            Erro ao carregar: {String(error.message ?? error)}
          </div>
        )}

        {!isLoading && politicos.length === 0 && !error && (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">Nenhum político encontrado</p>
            <p className="text-xs text-gray-500 mt-1">Ajuste os filtros ou a busca</p>
          </div>
        )}

        {politicos.length > 0 && (
          <>
            {visualizacao === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {politicos.map(p => (
                  <CardPolitico
                    key={p.candidatura_id}
                    politico={p}
                    onAbrirDossie={onAbrirDossie}
                  />
                ))}
              </div>
            ) : (
              <ListaCompacta politicos={politicos} onAbrirDossie={onAbrirDossie} />
            )}

            {/* Scroll infinito: sentinela + indicador */}
            {temMais && (
              <div ref={sentinelaRef} className="flex items-center justify-center gap-2 mt-6 py-4 text-gray-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  Carregando mais... {politicos.length.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")}
                </span>
              </div>
            )}
            {!temMais && politicos.length > 24 && (
              <div className="text-center py-6 text-xs text-gray-400">
                Fim da lista · {politicos.length.toLocaleString("pt-BR")} políticos carregados
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Lista compacta alternativa ao grid (toggle na topbar)
function ListaCompacta({ politicos, onAbrirDossie }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-[10px] font-black tracking-widest text-gray-500">
            <th className="px-3 py-2 text-left">OVR</th>
            <th className="px-3 py-2 text-left">NOME</th>
            <th className="px-3 py-2 text-left">CARGO</th>
            <th className="px-3 py-2 text-left">UF</th>
            <th className="px-3 py-2 text-left">PARTIDO</th>
            <th className="px-3 py-2 text-right">VOTOS</th>
            <th className="px-3 py-2 text-center">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {politicos.map(p => (
            <tr
              key={p.candidatura_id}
              onClick={() => onAbrirDossie?.(p.candidato_id)}
              className="border-b border-gray-100 hover:bg-purple-50 cursor-pointer"
            >
              <td className="px-3 py-2 font-black tabular-nums">{p.overall ?? "—"}</td>
              <td className="px-3 py-2 font-semibold text-gray-900">{p.nome}</td>
              <td className="px-3 py-2 text-gray-600 text-xs">{p.cargo}</td>
              <td className="px-3 py-2 text-gray-600 font-bold">{p.estado_uf}</td>
              <td className="px-3 py-2 text-gray-600 text-xs font-bold">{p.partido_sigla}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                {p.votos_total != null ? Number(p.votos_total).toLocaleString("pt-BR") : "-"}
              </td>
              <td className="px-3 py-2 text-center text-[10px] font-black tracking-wider">
                {p.eleito ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">ELEITO</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">NÃO ELEITO</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
