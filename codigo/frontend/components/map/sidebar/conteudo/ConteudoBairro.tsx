"use client";

import { ArrowLeft, Users } from "lucide-react";
import type { SelecionadoItem } from "@/lib/types";
import { useMapaUrlSwr } from "@/hooks/useMapaData";
import { fmt } from "../utils";
import { Skeleton } from "../common/Skeleton";
import { StatsResumo } from "../common/StatsResumo";
import { HintInteracao } from "../common/HintInteracao";
import { CardCandidatoCompacto } from "../common/CardCandidatoCompacto";

// ── Conteudo: Bairro selecionado (FASE 5) ────────────────────────────────
// Render quando o usuario clicou num bairro dentro do municipio.
// Dados via endpoint /municipio/{ibge}/distrito/{cd_dist}/resumo.

export function ConteudoBairro({
  codigoIbge, cdDist, nomeBairro, cargoMapa, anoMapa, turnoMapa,
  onVoltarBairro, onAbrirDossie, onToggleCandidato, selecionados,
}: {
  codigoIbge: string;
  cdDist: string;
  nomeBairro: string;
  cargoMapa: string | null;
  anoMapa: number;
  turnoMapa: number;
  onVoltarBairro: () => void;
  onAbrirDossie: (id: number) => void;
  onToggleCandidato: (id: number, nome: string, partido_num?: number, cargo?: string, ano?: number) => void;
  selecionados: SelecionadoItem[];
}) {
  const { data: resumo = null, isLoading: carregando } = useMapaUrlSwr<any>(
    () => {
      if (!codigoIbge || !cdDist) return null;
      const params = new URLSearchParams();
      params.set("ano", String(anoMapa || 2024));
      params.set("cargo", cargoMapa || "VEREADOR");
      params.set("turno", String(turnoMapa || 1));
      return `/mapa/municipio/${codigoIbge}/distrito/${cdDist}/resumo?${params}`;
    }
  );

  return (
    <>
      <div className="px-3 pt-3 pb-1 flex-shrink-0">
        <button
          onClick={onVoltarBairro}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao municipio
        </button>
      </div>

      <StatsResumo
        label={nomeBairro}
        stats={[
          { titulo: "Votos", valor: fmt(resumo?.total_votos ?? 0), cor: "text-brand-800" },
          { titulo: "Pontos", valor: fmt(resumo?.pontos_votacao ?? 0) },
          { titulo: "Dominante", valor: resumo?.partido_dominante?.partido_sigla ?? "-", cor: "text-green-700" },
          { titulo: "Candidatos", valor: String(resumo?.candidatos?.length ?? 0) },
        ]}
      />

      <HintInteracao texto="1 clique filtra - 2 cliques abre dossie" />

      <div className="flex-1 overflow-y-auto">
        {carregando ? (
          <Skeleton />
        ) : resumo?.candidatos?.length > 0 ? (
          <div className="p-3 space-y-1">
            {resumo.candidatos.map((c: any, i: number) => {
              const selecionado = selecionados.find(
                s => s.tipo === "candidato" && s.id === c.candidato_id
              );
              return (
                <CardCandidatoCompacto
                  key={`${c.candidato_id}-${i}`}
                  candidatoId={c.candidato_id}
                  nome={c.nome}
                  fotoUrl={c.foto_url}
                  partidoSigla={c.partido_sigla}
                  votos={c.votos}
                  eleito={c.eleito}
                  numero={i + 1}
                  corSelecionado={selecionado?.cor ?? null}
                  onFiltrar={() => onToggleCandidato(
                    c.candidato_id, c.nome, c.partido_num,
                    cargoMapa ?? undefined, anoMapa
                  )}
                  onDossie={() => onAbrirDossie(c.candidato_id)}
                />
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-xs text-gray-400">Sem dados para este bairro em {cargoMapa} {anoMapa}</p>
          </div>
        )}
      </div>
    </>
  );
}
