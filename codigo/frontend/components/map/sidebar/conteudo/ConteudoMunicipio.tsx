"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, MapPin, Info } from "lucide-react";
import type { SelecionadoItem } from "@/lib/types";
import { useMapaStore } from "@/lib/store/mapaStore";
import { useTotaisApuracao } from "@/hooks/useTotaisApuracao";
import { useMunicipioDetalhe, useMunicipioVereadoresBy } from "@/hooks/useMapaData";
import { ORDEM_CARGO, COR_CARGO, SUPLEMENTARES_PENDENTES_2026 } from "../constants";
import { fmt } from "../utils";
import type { MunicipioEleito } from "../types";
import { Skeleton } from "../common/Skeleton";
import { StatsResumo } from "../common/StatsResumo";
import { HintInteracao } from "../common/HintInteracao";
import { BlocoTotaisApuracao } from "../common/BlocoTotaisApuracao";
import { CardPolitico } from "../common/CardPolitico";
import { CardCandidatoCompacto } from "../common/CardCandidatoCompacto";

// ── Conteudo Municipio (sem partido selecionado) ────────────────────────────

export function ConteudoMunicipio({
  codigoIbge, nomeMunicipio, uf, cargoMapa,
  selecionados, onToggleCandidato, onAbrirDossie, onVerPontos,
}: {
  codigoIbge: string; nomeMunicipio: string; uf: string; cargoMapa: string | null;
  selecionados: SelecionadoItem[];
  onToggleCandidato: (id: number, nome: string, partido_num?: number, cargo?: string, ano?: number) => void;
  onAbrirDossie: (id: number) => void;
  onVerPontos: () => void;
}) {
  // FASE 3: aba "Eleitos / Nao eleitos" (portada de ConteudoEstado).
  const [aba, setAba] = useState<"eleitos" | "nao_eleitos">("eleitos");

  // Apuração contextual do município (válidos/brancos/nulos/abstenções/aptos).
  const anoMapa = useMapaStore((s) => s.filters.ano);
  const turnoMapa = useMapaStore((s) => s.filters.turno);
  const { data: totaisMun } = useTotaisApuracao({
    cargo: cargoMapa ?? null, ano: anoMapa, turno: turnoMapa ?? 1, nivel: "municipio", codigoIbge,
    enabled: !!cargoMapa && cargoMapa !== "VIGENTES",
  });

  // Dados do município via SWR (antes: useState + fetch + AbortController).
  const { data: dados = null, isLoading: carregando } =
    useMunicipioDetalhe(codigoIbge);

  // Aba "Nao eleitos" só tem dados para VEREADOR (endpoint /vereadores).
  const abaNaoEleitosAtiva = cargoMapa === "VEREADOR";
  const { data: vereadoresResp } = useMunicipioVereadoresBy(
    abaNaoEleitosAtiva ? codigoIbge : null
  );
  const vereadoresNaoEleitos = useMemo<any[] | null>(() => {
    if (!abaNaoEleitosAtiva) return null;
    const lista = vereadoresResp?.vereadores;
    return Array.isArray(lista) ? lista.filter((v: any) => !v.eleito) : null;
  }, [abaNaoEleitosAtiva, vereadoresResp]);

  // Reset aba se cargo muda para algo sem aba
  useEffect(() => {
    if (!abaNaoEleitosAtiva) setAba("eleitos");
  }, [abaNaoEleitosAtiva]);

  const candidatoFiltrado = selecionados.find(s => s.tipo === "candidato");

  const cargosOrdenados = useMemo(() => {
    if (!dados?.eleitos) return [];
    const cargoMap = new Map<string, MunicipioEleito[]>();
    for (const e of dados.eleitos) {
      const lista = cargoMap.get(e.cargo) || [];
      lista.push(e);
      cargoMap.set(e.cargo, lista);
    }
    const filtrados = cargoMapa && cargoMapa !== "VIGENTES"
      ? [...cargoMap.entries()].filter(([c]) => c.toUpperCase() === cargoMapa.toUpperCase())
      : [...cargoMap.entries()];
    return filtrados
      .map(([cargo, lista]) => ({ cargo, eleitos: lista }))
      .sort((a, b) => {
        const ia = ORDEM_CARGO.indexOf(a.cargo), ib = ORDEM_CARGO.indexOf(b.cargo);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
  }, [dados, cargoMapa]);

  // KPIs padronizados (4 cards) — regra da pesquisa de sidebar.
  const kpiMunicipio = useMemo(() => {
    const eleitos = dados?.eleitos ?? [];
    const cargosAtivos = new Set(eleitos.map(e => e.cargo)).size;
    const partidos = new Set(eleitos.map(e => e.partido_num).filter(p => p != null)).size;
    return {
      populacao: dados?.municipio.populacao ?? 0,
      totalEleitos: eleitos.length,
      cargosAtivos,
      partidos,
    };
  }, [dados]);

  if (carregando) return <Skeleton />;
  if (!dados) return (
    <div className="p-6 text-center">
      <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-200" />
      <p className="text-xs text-gray-400">Dados nao disponiveis</p>
    </div>
  );

  return (
    <>
      <StatsResumo
        label={nomeMunicipio}
        stats={[
          { titulo: "Populacao", valor: fmt(kpiMunicipio.populacao) },
          { titulo: "Eleitos", valor: String(kpiMunicipio.totalEleitos), cor: "text-green-700" },
          { titulo: "Cargos", valor: String(kpiMunicipio.cargosAtivos) },
          { titulo: "Partidos", valor: String(kpiMunicipio.partidos) },
        ]}
      />

      {candidatoFiltrado && (
        <div className="px-4 py-2 border-b border-gray-100" style={{ backgroundColor: `${candidatoFiltrado.cor}10` }}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: candidatoFiltrado.cor }} />
            <p className="text-xs font-bold text-gray-900">{candidatoFiltrado.nome}</p>
          </div>
          <p className="text-[9px] text-gray-500 mt-0.5">
            O mapa mostra a forca deste candidato nos bairros
          </p>
        </div>
      )}

      <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={onVerPontos}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold rounded-xl transition-colors"
        >
          <MapPin className="w-3.5 h-3.5" />
          Ver pontos de votacao
        </button>
      </div>

      {/* P2-6: aba Eleitos / Não eleitos. Hoje populada so pra VEREADOR
          (endpoint /vereadores). Pros outros cargos, mostra aba unica "Eleitos"
          + chip explicativo pra evitar o UI "pular" ao trocar cargo. */}
      {abaNaoEleitosAtiva ? (
        <div className="flex border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setAba("eleitos")}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              aba === "eleitos" ? "text-brand-900 border-b-2 border-brand-900" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Eleitos ({kpiMunicipio.totalEleitos})
          </button>
          <button
            onClick={() => setAba("nao_eleitos")}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              aba === "nao_eleitos" ? "text-brand-900 border-b-2 border-brand-900" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Não eleitos {vereadoresNaoEleitos ? `(${vereadoresNaoEleitos.length})` : ""}
          </button>
        </div>
      ) : cargoMapa && cargoMapa !== "VIGENTES" && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 bg-gray-50/60 flex-shrink-0">
          <span className="text-[11px] font-semibold text-brand-900">
            Eleitos ({kpiMunicipio.totalEleitos})
          </span>
          <span className="text-[9px] text-gray-400" title="Lista de não eleitos só está populada para Vereador hoje">
            Só eleitos neste cargo
          </span>
        </div>
      )}

      <HintInteracao texto="1 clique - adiciona ao mapa - 2 cliques - dossie" />

      <div className="flex-1 overflow-y-auto">
        {aba === "nao_eleitos" && vereadoresNaoEleitos ? (
          vereadoresNaoEleitos.length > 0 ? (
            <div className="p-3 space-y-1">
              {vereadoresNaoEleitos.slice(0, 100).map((v: any) => {
                const selecionado = selecionados.find(
                  s => s.tipo === "candidato" && s.id === v.candidato_id
                );
                return (
                  <CardCandidatoCompacto
                    key={v.candidatura_id}
                    candidatoId={v.candidato_id}
                    nome={v.nome}
                    fotoUrl={v.foto_url}
                    partidoSigla={v.partido_sigla}
                    votos={v.votos}
                    extraInfo={v.pct_municipio != null ? `${v.pct_municipio.toFixed(2)}%` : undefined}
                    corSelecionado={selecionado?.cor ?? null}
                    onFiltrar={() => onToggleCandidato(
                      v.candidato_id, v.nome, v.partido_num,
                      cargoMapa ?? undefined, undefined
                    )}
                    onDossie={() => onAbrirDossie(v.candidato_id)}
                  />
                );
              })}
              {vereadoresNaoEleitos.length > 100 && (
                <p className="text-[10px] text-gray-400 pt-2 text-center">+{vereadoresNaoEleitos.length - 100} candidatos</p>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-xs text-gray-400">Nenhum nao-eleito registrado</p>
            </div>
          )
        ) : (
          <>
          {/* Banner "Aguardando suplementar 2026" para os 6 municípios MG/SP
              com eleição cassada/indeferida. Aparece acima dos eleitos (vereadores
              ainda existem) ou como conteúdo único se não há nenhum eleito. */}
          {SUPLEMENTARES_PENDENTES_2026[codigoIbge] && (
            <div className="p-3 pb-0">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2 mb-1.5">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs font-semibold text-amber-900">
                    Sem prefeito: aguardando eleição suplementar
                  </div>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed mb-2">
                  {SUPLEMENTARES_PENDENTES_2026[codigoIbge].motivo}. Município governado pelo presidente da Câmara até a suplementar.
                </p>
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-amber-200">
                  <span className="text-amber-700">Data da suplementar</span>
                  <span className="font-semibold text-amber-900">
                    {SUPLEMENTARES_PENDENTES_2026[codigoIbge].data}
                  </span>
                </div>
              </div>
            </div>
          )}
          {cargosOrdenados.length > 0 ? (
          <div className="p-3 space-y-4">
            {cargosOrdenados.map(({ cargo, eleitos }) => (
              <div key={cargo}>
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
                        e={{ ...e, nome: e.nome_urna, foto_url: e.foto_url } as any}
                        corSelecionado={sel?.cor ?? null}
                        mostrarPartido
                        onSingleClick={() => {}}
                        onDoubleClick={() => onToggleCandidato(e.candidato_id, e.nome_urna, e.partido_num, e.cargo, e.ano)}
                        onAbrirDossie={() => onAbrirDossie(e.candidato_id)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : !SUPLEMENTARES_PENDENTES_2026[codigoIbge] ? (
          <div className="p-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-xs text-gray-400">Nenhum eleito registrado neste municipio</p>
          </div>
        ) : null}
          </>
        )}
        <BlocoTotaisApuracao data={totaisMun} />
      </div>
    </>
  );
}
