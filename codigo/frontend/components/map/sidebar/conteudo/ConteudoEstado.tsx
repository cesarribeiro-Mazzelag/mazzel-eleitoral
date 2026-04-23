"use client";

import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import type { SelecionadoItem, EstadoEleitos } from "@/lib/types";
import { useTotaisApuracao } from "@/hooks/useTotaisApuracao";
import { useEstadoEleitosBy, useEstadoNaoEleitosBy } from "@/hooks/useMapaData";
import { NOME_ESTADO, ORDEM_CARGO, CARGOS_SEM_ABA_NAO_ELEITO } from "../constants";
import { fmt } from "../utils";
import { Skeleton } from "../common/Skeleton";
import { StatsResumo } from "../common/StatsResumo";
import { HintInteracao } from "../common/HintInteracao";
import { BlocoTotaisApuracao } from "../common/BlocoTotaisApuracao";
import { ListaCargos } from "../common/ListaCargos";

// ── Conteudo Estado (sem partido selecionado) ───────────────────────────────

export function ConteudoEstado({
  uf, cargoMapa, anoMapa, turnoMapa, selecionados,
  onToggleCandidato, onAbrirDossie,
}: {
  uf: string;
  cargoMapa: string | null;
  anoMapa: number;
  turnoMapa: number;
  selecionados: SelecionadoItem[];
  onToggleCandidato: (id: number, nome: string, partido_num?: number, cargo?: string, ano?: number) => void;
  onAbrirDossie: (id: number) => void;
}) {
  const [aba, setAba] = useState<"eleitos" | "nao_eleitos">("eleitos");

  const semAba = cargoMapa ? CARGOS_SEM_ABA_NAO_ELEITO.has(cargoMapa.toUpperCase()) : false;

  // Apuração contextual do estado (válidos/brancos/nulos/abstenções/aptos).
  const { data: totaisEstado } = useTotaisApuracao({
    cargo: cargoMapa ?? null, ano: anoMapa, turno: turnoMapa ?? 1, nivel: "estado", uf,
    enabled: !!cargoMapa && cargoMapa !== "VIGENTES",
  });

  // Governanca (13/04): SEMPRE passar cargo+ano+turno. Sem isso o backend caia
  // em default de multiplos anos e a lista vinha contaminada (ex: candidato
  // de 2018 aparecia junto com candidato de 2022 no GOVERNADOR).
  //
  // Racional da migração (Fase 2.2): antes havia 3 fetches crus, 2 deles sem
  // AbortController (linhas 1864/1873 do código antigo) - Bug 2 do plano V2.
  // SWR resolve race por construção: chave muda ⇒ request anterior abortada.
  const { data: eleitos = null, isLoading: carregando } = useEstadoEleitosBy(
    uf,
    cargoMapa,
    anoMapa,
    turnoMapa ?? 1
  );
  // Pré-carrega não-eleitos sempre (backend cacheado, latência <50ms warm);
  // aba "nao_eleitos" vira troca instantânea de visualização.
  const { data: naoEleitos = null, isLoading: loadingNao } = useEstadoNaoEleitosBy(
    uf,
    cargoMapa,
    anoMapa,
    turnoMapa ?? 1
  );

  // Reseta aba pra "eleitos" quando muda contexto.
  useEffect(() => {
    setAba("eleitos");
  }, [uf, cargoMapa, anoMapa, turnoMapa]);

  function handleAba(novaAba: "eleitos" | "nao_eleitos") {
    setAba(novaAba);
  }

  const cargosUnificados = useMemo(() => {
    if (!semAba || !eleitos) return null;
    const cargo = cargoMapa?.toUpperCase() ?? "";
    const eleitosLista = eleitos.cargos.find(c => c.cargo === cargo)?.eleitos ?? [];
    const naoEleitosLista = naoEleitos?.cargos.find(c => c.cargo === cargo)?.eleitos ?? [];
    const merged = [
      ...eleitosLista.map(e => ({ ...e, _eleito: true })),
      ...naoEleitosLista.map(e => ({ ...e, _eleito: false })),
    ];
    return merged.length > 0 ? [{ cargo, eleitos: merged as any[] }] : null;
  }, [semAba, eleitos, naoEleitos, cargoMapa]);

  const dadosAtivos = aba === "eleitos" ? eleitos : naoEleitos;
  const loadingAtivo = aba === "eleitos" ? carregando : loadingNao;

  const cargosOrdenados = (dados: EstadoEleitos | null) =>
    dados?.cargos.slice().sort((a, b) => {
      const ia = ORDEM_CARGO.indexOf(a.cargo), ib = ORDEM_CARGO.indexOf(b.cargo);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    }) ?? [];

  // KPIs padronizados (3-4 cards) — regra da pesquisa de sidebar P-B1.
  const kpiEstado = useMemo(() => {
    const totalEleitos = eleitos?.total_eleitos ?? 0;
    const totalVotos = eleitos?.cargos.reduce(
      (sum, c) => sum + c.eleitos.reduce((s, e) => s + (e.votos ?? 0), 0), 0) ?? 0;
    const cargosAtivos = eleitos?.cargos.filter(c => c.eleitos.length > 0).length ?? 0;
    const partidos = new Set<number>();
    eleitos?.cargos.forEach(c => c.eleitos.forEach(e => {
      if (e.partido_num != null) partidos.add(e.partido_num);
    }));
    return { totalEleitos, totalVotos, cargosAtivos, partidos: partidos.size };
  }, [eleitos]);

  return (
    <>
      <StatsResumo
        label={`${NOME_ESTADO[uf] ?? uf} - ${cargoMapa ?? "Todos os cargos"}`}
        stats={[
          { titulo: "Eleitos", valor: fmt(kpiEstado.totalEleitos), cor: "text-green-700" },
          { titulo: "Votos", valor: fmt(kpiEstado.totalVotos), cor: "text-brand-800" },
          { titulo: "Cargos", valor: String(kpiEstado.cargosAtivos) },
          { titulo: "Partidos", valor: String(kpiEstado.partidos) },
        ]}
      />

      {!semAba && (
        <div className="flex border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => handleAba("eleitos")}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              aba === "eleitos" ? "text-brand-900 border-b-2 border-brand-900" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Eleitos {eleitos ? `(${eleitos.total_eleitos})` : ""}
          </button>
          <button
            onClick={() => handleAba("nao_eleitos")}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              aba === "nao_eleitos" ? "text-brand-900 border-b-2 border-brand-900" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Nao eleitos {naoEleitos ? `(${naoEleitos.total_nao_eleitos ?? 0})` : ""}
          </button>
        </div>
      )}

      <HintInteracao texto="1 clique - adiciona ao mapa - 2 cliques - dossie" />

      <div className="flex-1 overflow-y-auto">
        {loadingAtivo ? (
          <Skeleton />
        ) : semAba && cargosUnificados ? (
          <ListaCargos
            cargos={cargosUnificados}
            cargoDestaque={cargoMapa}
            selecionados={selecionados}
            mostrarPartido
            onAtivarGradiente={onToggleCandidato}
            onAbrirDossie={onAbrirDossie}
          />
        ) : cargosOrdenados(dadosAtivos).length > 0 ? (
          <ListaCargos
            cargos={cargosOrdenados(dadosAtivos)}
            cargoDestaque={cargoMapa}
            selecionados={selecionados}
            mostrarPartido={aba === "nao_eleitos"}
            onAtivarGradiente={onToggleCandidato}
            onAbrirDossie={onAbrirDossie}
          />
        ) : (
          <div className="p-8 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">
              {aba === "eleitos" ? "Nenhum eleito registrado." : "Nenhum candidato nao eleito encontrado."}
            </p>
          </div>
        )}
        <BlocoTotaisApuracao data={totaisEstado} />
      </div>
    </>
  );
}
