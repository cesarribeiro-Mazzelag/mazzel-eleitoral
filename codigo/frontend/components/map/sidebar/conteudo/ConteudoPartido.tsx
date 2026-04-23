"use client";

import { useMemo } from "react";
import { Users, MapPin } from "lucide-react";
import type { NivelMapa, SelecionadoItem, EstadoEleitos } from "@/lib/types";
import { useMapaStore } from "@/lib/store/mapaStore";
import { useTotaisApuracao } from "@/hooks/useTotaisApuracao";
import { useMapaUrlSwr, useMunicipioDetalhe } from "@/hooks/useMapaData";
import { NOME_ESTADO, ORDEM_CARGO, COR_CARGO } from "../constants";
import { fmt } from "../utils";
import type { MunicipioEleito } from "../types";
import { Skeleton } from "../common/Skeleton";
import { StatsResumo } from "../common/StatsResumo";
import { HintInteracao } from "../common/HintInteracao";
import { BlocoTotaisApuracao } from "../common/BlocoTotaisApuracao";
import { CardCandidatoCompacto } from "../common/CardCandidatoCompacto";
import { LegendaPartido } from "../common/LegendaPartido";

// ── Partido selecionado: conteudo por nivel ─────────────────────────────────

export function ConteudoPartido({
  partidoSel, nivel, ufSelecionada, ibgeSelecionado, nomeMunicipio,
  geojsonData, onVoltar, onClickEstado, onClickMunicipio, onAbrirDossie, onVerPontos,
  selecionados = [], onToggleCandidato,
}: {
  partidoSel: SelecionadoItem;
  nivel: NivelMapa;
  ufSelecionada: string | null;
  ibgeSelecionado: string | null;
  nomeMunicipio: string;
  geojsonData: any;
  onVoltar: () => void;
  onClickEstado?: (uf: string) => void;
  onClickMunicipio?: (ibge: string, nome: string) => void;
  onAbrirDossie?: (id: number) => void;
  onVerPontos?: () => void;
  selecionados?: SelecionadoItem[];
  onToggleCandidato?: (id: number, nome: string, partido_num?: number, cargo?: string, ano?: number) => void;
}) {
  // Filtros do store - cargo/ano/turno/tab. Tabs 1T/2T afetam os fetches aqui.
  const cargoFilter = useMapaStore((s) => s.filters.cargo);
  const anoFilter = useMapaStore((s) => s.filters.ano);
  const turnoFilter = useMapaStore((s) => s.filters.turno);

  // Apuração contextual (acompanha drill-down: brasil/estado/municipio).
  const nivelApuracao: "brasil" | "estado" | "municipio" =
    nivel === "municipio" ? "municipio" : nivel === "estado" ? "estado" : "brasil";
  const { data: totaisPartido } = useTotaisApuracao({
    cargo: cargoFilter ?? null, ano: anoFilter ?? 2024, turno: turnoFilter ?? 1,
    nivel: nivelApuracao,
    uf: nivelApuracao !== "brasil" ? ufSelecionada : null,
    codigoIbge: nivelApuracao === "municipio" ? ibgeSelecionado : null,
    enabled: !!cargoFilter && cargoFilter !== "VIGENTES",
  });

  // Políticos do partido no ESTADO (inclui filtro de partido explícito).
  // Não é o mesmo key de useEstadoEleitosBy porque aqui tem `partido` no qs.
  const { data: politicosEstado = null, isLoading: carregandoEstado } =
    useMapaUrlSwr<EstadoEleitos>(() => {
      if (!ufSelecionada || nivel === "brasil") return null;
      const params = new URLSearchParams();
      params.set("partido", String(partidoSel.id));
      if (cargoFilter) params.set("cargo", cargoFilter);
      if (anoFilter) params.set("ano", String(anoFilter));
      if (turnoFilter) params.set("turno", String(turnoFilter));
      return `/mapa/estado/${ufSelecionada}/eleitos?${params}`;
    });

  // Cidades do partido no estado (P-A3: navegação alternativa).
  const { data: cidadesPartido = null } = useMapaUrlSwr<
    Array<{ codigo_ibge: string; nome: string; eleitos: number; votos: number }>
  >(() => {
    if (nivel !== "estado" || !ufSelecionada) return null;
    const params = new URLSearchParams();
    if (cargoFilter) params.set("cargo", cargoFilter);
    if (anoFilter) params.set("ano", String(anoFilter));
    if (turnoFilter) params.set("turno", String(turnoFilter));
    const qs = params.toString() ? `?${params}` : "";
    return `/mapa/estado/${ufSelecionada}/partido/${partidoSel.id}/cidades${qs}`;
  });

  // Detalhe do município (drill de partido → município específico).
  const { data: dadosMunicipio = null } = useMunicipioDetalhe(
    nivel === "municipio" ? ibgeSelecionado : null
  );

  const carregando = carregandoEstado;

  // Derivados (TODOS os useMemo ANTES dos returns condicionais - regra de Hooks)
  // Agrega por UF (granularidade pode ser estados OU municípios — Globo-like abre em municipios).
  const listaEstados = useMemo(() => {
    if (nivel !== "brasil" || !geojsonData?.features) return [];
    const map = new Map<string, { nome: string; uf: string; votos: number; eleitos: number }>();
    for (const f of geojsonData.features) {
      const p = f.properties ?? {};
      const uf = p.estado_uf ?? "";
      if (!uf) continue;
      const votos = p.total_votos ?? p.votos ?? p.score_ponderado ?? 0;
      const eleitos = p.total_eleitos ?? p.eleitos_dominante ?? p.eleitos ?? 0;
      if (votos <= 0 && eleitos <= 0) continue;
      const entry = map.get(uf) ?? { nome: NOME_ESTADO[uf] ?? uf, uf, votos: 0, eleitos: 0 };
      entry.votos += votos;
      entry.eleitos += eleitos;
      map.set(uf, entry);
    }
    return [...map.values()].sort((a, b) => b.eleitos - a.eleitos || b.votos - a.votos);
  }, [geojsonData, nivel]);

  const cargosEstado = useMemo(() => {
    return politicosEstado?.cargos?.slice().sort((a, b) => {
      const ia = ORDEM_CARGO.indexOf(a.cargo), ib = ORDEM_CARGO.indexOf(b.cargo);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    }) ?? [];
  }, [politicosEstado]);

  const politicosDoPartido = useMemo(() => {
    if (!dadosMunicipio?.eleitos) return [];
    return dadosMunicipio.eleitos.filter(e => e.partido_num === partidoSel.id);
  }, [dadosMunicipio, partidoSel.id]);

  const cargosMunicipio = useMemo(() => {
    const map = new Map<string, MunicipioEleito[]>();
    for (const e of politicosDoPartido) {
      const lista = map.get(e.cargo) || [];
      lista.push(e);
      map.set(e.cargo, lista);
    }
    return [...map.entries()]
      .map(([cargo, lista]) => ({ cargo, eleitos: lista }))
      .sort((a, b) => {
        const ia = ORDEM_CARGO.indexOf(a.cargo), ib = ORDEM_CARGO.indexOf(b.cargo);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
  }, [politicosDoPartido]);

  const nomeEstado = NOME_ESTADO[ufSelecionada ?? ""] ?? ufSelecionada ?? "";
  const totalEleitosEstados = listaEstados.reduce((a, b) => a + b.eleitos, 0);
  const totalVotosEstados = listaEstados.reduce((a, b) => a + b.votos, 0);
  // Modo VIGENTES: votos sao 0 (soma entre cargos nao faz sentido). Esconde campo.
  const isVigentes = cargoFilter === "VIGENTES" || !cargoFilter;

  // Header "Limpar filtro" removido 20/04: redundante com "Voltar ao inicio"
  // do HeaderVoltar no pai. Regra: apenas 1 botao de saida por tela.
  const headerPartido = null;

  // ── NIVEL BRASIL: estados do partido ──────────────────────────────────
  if (nivel === "brasil") {
    return (
      <>
        {headerPartido}
        <StatsResumo
          label={`${partidoSel.nome} no Brasil`}
          stats={isVigentes ? [
            { titulo: "Estados", valor: String(listaEstados.length) },
            { titulo: "Mandatos ativos", valor: fmt(totalEleitosEstados), cor: "text-green-700" },
          ] : [
            { titulo: "Estados", valor: String(listaEstados.length) },
            { titulo: "Eleitos", valor: fmt(totalEleitosEstados), cor: "text-green-700" },
            { titulo: "Votos", valor: fmt(totalVotosEstados), cor: "text-brand-800" },
          ]}
        />
        <LegendaPartido partidoSel={partidoSel} />
        <HintInteracao texto="Clique no estado para ver politicos do partido" />
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-0.5">
            <div className="flex items-center gap-2 px-1.5 pb-1 border-b border-gray-100">
              <span className="text-[9px] font-semibold text-gray-400 w-4 text-right">#</span>
              <span className="text-[9px] font-semibold text-gray-400 flex-1">Estado</span>
              <span className="text-[9px] font-semibold text-gray-400 w-14 text-right">Eleitos</span>
              {!isVigentes && <span className="text-[9px] font-semibold text-gray-400 w-20 text-right">Votos</span>}
            </div>
            {listaEstados.map((it, i) => (
              <button
                key={it.uf}
                onClick={() => onClickEstado?.(it.uf)}
                className="w-full flex items-center gap-2 py-2 px-2 rounded-lg text-left hover:bg-brand-50 cursor-pointer transition-all"
              >
                <span className="text-[10px] font-bold text-gray-400 w-4 text-right">{i + 1}</span>
                <span className="text-xs text-brand-700 font-semibold truncate flex-1">{it.nome}</span>
                <span className="text-[10px] font-bold text-gray-700 w-14 text-right">{fmt(it.eleitos)}</span>
                {!isVigentes && <span className="text-[10px] text-gray-500 w-20 text-right">{fmt(it.votos)}</span>}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ── NIVEL ESTADO: politicos do partido no estado ──────────────────────
  if (nivel === "estado") {
    // KPIs padronizados (3-4 cards) — regra da pesquisa de sidebar P-B1.
    const totalVotosEstado = politicosEstado?.cargos.reduce(
      (sum, c) => sum + c.eleitos.reduce((s, e) => s + (e.votos ?? 0), 0), 0) ?? 0;
    const cargosAtivosEstado = politicosEstado?.cargos.filter(c => c.eleitos.length > 0).length ?? 0;
    const municipiosComEleito = new Set<string>();
    politicosEstado?.cargos.forEach(c => c.eleitos.forEach(e => {
      if (e.situacao) municipiosComEleito.add(e.situacao);
    }));
    return (
      <>
        {headerPartido}
        <StatsResumo
          label={`${partidoSel.nome} em ${nomeEstado}`}
          stats={isVigentes ? [
            { titulo: "Mandatos ativos", valor: fmt(politicosEstado?.total_eleitos), cor: "text-green-700" },
            { titulo: "Municípios", valor: String(municipiosComEleito.size) },
            { titulo: "Cargos", valor: String(cargosAtivosEstado) },
          ] : [
            { titulo: "Eleitos", valor: fmt(politicosEstado?.total_eleitos), cor: "text-green-700" },
            { titulo: "Votos", valor: fmt(totalVotosEstado), cor: "text-brand-800" },
            { titulo: "Municípios", valor: String(municipiosComEleito.size) },
            { titulo: "Cargos", valor: String(cargosAtivosEstado) },
          ]}
        />
        <LegendaPartido partidoSel={partidoSel} />
        <HintInteracao texto="1 clique filtra - 2 cliques abre dossie" />

        {/* P-A3: Cidades do partido — navegacao alternativa clicavel */}
        {cidadesPartido && cidadesPartido.length > 0 && onClickMunicipio && (
          <div className="border-b border-gray-100 bg-brand-50/40 px-3 py-2 flex-shrink-0 max-h-[240px] overflow-y-auto">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Cidades com eleitos · {cidadesPartido.length}
            </p>
            <div className="space-y-0.5">
              {cidadesPartido.slice(0, 20).map((cidade, i) => (
                <button
                  key={cidade.codigo_ibge}
                  onClick={() => onClickMunicipio(cidade.codigo_ibge, cidade.nome)}
                  className="w-full flex items-center gap-2 py-1 px-1.5 rounded-md text-left hover:bg-white cursor-pointer transition-colors"
                >
                  <span className="text-[10px] font-bold text-gray-400 w-4 text-right">{i + 1}</span>
                  <span className="text-xs text-brand-800 font-semibold truncate flex-1">{cidade.nome}</span>
                  <span className="text-[10px] font-bold text-green-700 w-8 text-right">{cidade.eleitos}</span>
                </button>
              ))}
              {cidadesPartido.length > 20 && (
                <p className="text-[9px] text-gray-400 pt-1 text-center">+{cidadesPartido.length - 20} cidades</p>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {carregando ? <Skeleton /> : cargosEstado.length > 0 ? (
            <div className="p-3 space-y-3">
              {cargosEstado.map(({ cargo, eleitos }) => (
                <div key={cargo}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${COR_CARGO[cargo] ?? "bg-gray-100 text-gray-700"}`}>
                      {cargo}
                    </span>
                    <span className="text-[10px] text-gray-400">{eleitos.length}</span>
                  </div>
                  <div className="space-y-1">
                    {eleitos.map(e => {
                      const sel = selecionados.find(
                        s => s.tipo === "candidato" && s.id === e.candidato_id
                      );
                      return (
                        <CardCandidatoCompacto
                          key={`${e.candidato_id}-${e.cargo}`}
                          candidatoId={e.candidato_id}
                          nome={e.nome}
                          fotoUrl={e.foto_url}
                          votos={e.votos}
                          extraInfo={String(e.ano)}
                          corSelecionado={sel?.cor ?? null}
                          onFiltrar={() => onToggleCandidato?.(
                            e.candidato_id, e.nome, partidoSel.id, e.cargo, e.ano
                          )}
                          onDossie={() => onAbrirDossie?.(e.candidato_id)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-xs text-gray-400">Nenhum eleito do {partidoSel.nome} em {nomeEstado}</p>
            </div>
          )}
        </div>
      </>
    );
  }

  // ── NIVEL MUNICIPIO: politicos do partido no municipio ────────────────
  return (
    <>
      {headerPartido}
      <StatsResumo
        label={`${partidoSel.nome} em ${nomeMunicipio || "municipio"}`}
        stats={[
          { titulo: "Eleitos aqui", valor: String(politicosDoPartido.length), cor: "text-green-700" },
        ]}
      />
      {onVerPontos && (
        <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={onVerPontos}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
            Ver pontos de votacao
          </button>
        </div>
      )}
      <HintInteracao texto="1 clique filtra - 2 cliques abre dossie" />
      <div className="flex-1 overflow-y-auto">
        {cargosMunicipio.length > 0 ? (
          <div className="p-3 space-y-3">
            {cargosMunicipio.map(({ cargo, eleitos }) => (
              <div key={cargo}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${COR_CARGO[cargo] ?? "bg-gray-100 text-gray-700"}`}>
                    {cargo}
                  </span>
                  <span className="text-[10px] text-gray-400">{eleitos.length}</span>
                </div>
                <div className="space-y-1">
                  {eleitos.map(e => {
                    const sel = selecionados.find(
                      s => s.tipo === "candidato" && s.id === e.candidato_id
                    );
                    return (
                      <CardCandidatoCompacto
                        key={`${e.candidato_id}-${e.cargo}`}
                        candidatoId={e.candidato_id}
                        nome={e.nome_urna}
                        fotoUrl={e.foto_url}
                        votos={e.votos}
                        extraInfo={String(e.ano)}
                        corSelecionado={sel?.cor ?? null}
                        onFiltrar={() => onToggleCandidato?.(
                          e.candidato_id, e.nome_urna, partidoSel.id, e.cargo, e.ano
                        )}
                        onDossie={() => onAbrirDossie?.(e.candidato_id)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-xs text-gray-400">
              {dadosMunicipio
                ? `Nenhum eleito do ${partidoSel.nome} neste municipio - o mapa mostra a forca nos bairros`
                : "Carregando..."
              }
            </p>
          </div>
        )}
        <BlocoTotaisApuracao data={totaisPartido} />
      </div>
    </>
  );
}
