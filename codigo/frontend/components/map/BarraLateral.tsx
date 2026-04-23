"use client";

/**
 * Barra Lateral Unificada do Mapa Eleitoral.
 *
 * REESCRITA COMPLETA (12/04/2026) - Sidebar reativa que acompanha a navegacao do mapa.
 *
 * Arquitetura:
 *   SidebarContent decide o que mostrar baseado em:
 *   - nivel (brasil / estado / municipio)
 *   - cargoMapa (VIGENTES / PRESIDENTE / GOVERNADOR / etc)
 *   - partidoUnico (partido selecionado ou null)
 *   - candidatoFiltrado (candidato selecionado ou null)
 *
 * Cada combinacao nivel+filtro tem conteudo contextual.
 * A sidebar SINCRONIZA com o mapa: muda quando o usuario navega.
 */

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  Users, Vote, BarChart2,
  MapPin, Star, X, PanelRightOpen, PanelRightClose, Crown, ArrowLeft, Info,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import type { NivelMapa, SelecionadoItem, EleitoPorCargo, EstadoEleitos } from "@/lib/types";
import { corDoPartido, gerarEscalaPartido, calcularNivel } from "@/lib/farolPartido";
import { useMapaStore, CARGOS_COM_DOIS_TURNOS, type TabTurno } from "@/lib/store/mapaStore";
import { FILTERS_DEFAULT, UI_DEFAULT } from "@/lib/mapa/machine";
import { LogoPartido } from "@/components/shared/LogoPartido";
import {
  useSidebarState,
  useMapaActions,
} from "@/hooks/useMapaState";
import { useTotaisApuracao } from "@/hooks/useTotaisApuracao";
import {
  useEstadoEleitosBy,
  useEstadoNaoEleitosBy,
  useRankingPartidosBy,
  useMunicipioDetalhe,
  useMunicipioVereadoresBy,
  useMapaUrlSwr,
} from "@/hooks/useMapaData";
import { API_BASE } from "@/lib/api/base";
import { Avatar } from "./sidebar/common/Avatar";
import { Skeleton } from "./sidebar/common/Skeleton";
import { HintInteracao } from "./sidebar/common/HintInteracao";
import { StatsResumo } from "./sidebar/common/StatsResumo";
import { BlocoTotaisApuracao } from "./sidebar/common/BlocoTotaisApuracao";
import { SidebarTituloBreadcrumb } from "./sidebar/chrome/SidebarTituloBreadcrumb";
import { SidebarTabsCombinadas } from "./sidebar/chrome/SidebarTabsCombinadas";
import { HeaderVoltar } from "./sidebar/chrome/HeaderVoltar";
import { SidebarCompact } from "./sidebar/chrome/SidebarCompact";
import { BotaoSidebarFlutuante as BotaoSidebarFlutuanteImpl } from "./sidebar/chrome/BotaoSidebarFlutuante";
import { CardPolitico } from "./sidebar/common/CardPolitico";
import { CardCandidatoCompacto } from "./sidebar/common/CardCandidatoCompacto";
import { ListaCargos } from "./sidebar/common/ListaCargos";
import { CardPreviewCandidato } from "./sidebar/common/CardPreviewCandidato";
import { SidebarHoverPreview } from "./sidebar/common/SidebarHoverPreview";
import {
  NOME_ESTADO,
  ORDEM_CARGO,
  CARGOS_SEM_ABA_NAO_ELEITO,
  COR_CARGO,
  SUPLEMENTARES_PENDENTES_2026,
} from "./sidebar/constants";
import { fmt, siglaExibida, isLogoHorizontal } from "./sidebar/utils";
import type { RankingPartido, MunicipioEleito } from "./sidebar/types";
import { PainelComparacao } from "./sidebar/conteudo/PainelComparacao";
import { ConteudoBairro } from "./sidebar/conteudo/ConteudoBairro";
import { ConteudoMicroRegiao } from "./sidebar/conteudo/ConteudoMicroRegiao";
import { ConteudoBrasilRanking } from "./sidebar/conteudo/ConteudoBrasilRanking";
import { ConteudoPartido } from "./sidebar/conteudo/ConteudoPartido";
import { ConteudoEstado } from "./sidebar/conteudo/ConteudoEstado";
import { ConteudoMunicipio } from "./sidebar/conteudo/ConteudoMunicipio";
import { ConteudoCandidato } from "./sidebar/conteudo/ConteudoCandidato";

// Toggle "Ver por: Partidos | Eleitos" persistente no drill-down.
// "partidos" (default): sidebar mostra força dos partidos no nível atual (ranking).
// "eleitos": sidebar mostra listagem de eleitos por cargo OU preview do hover.

interface BarraLateralProps {
  nivel: NivelMapa;
  ufSelecionada: string | null;
  ibgeSelecionado: string | null;
  nomeMunicipio: string;
  cargoMapa: string | null;
  anoMapa: number;
  turnoMapa: number;
  modoMapa: "eleitos" | "votos";
  selecionados: SelecionadoItem[];
  geojsonData: any;
  onToggleCandidato: (id: number, nome: string, partido_num?: number, cargo?: string, ano?: number) => void;
  onTogglePartido: (numero: number, sigla: string) => void;
  onAbrirDossie: (id: number) => void;
  onLimparSelecionados: () => void;
  /** Volta step-by-step: sobe UM nivel na hierarquia (bairro→cidade→estado→brasil). */
  onVoltarStep?: () => void;
  onSelectCargo?: (cargo: string | null) => void;
  onClickEstado?: (uf: string) => void;
  onClickMunicipio?: (ibge: string, nome: string) => void;
  onVerPontos?: () => void;
  // FASE 5: bairro/distrito selecionado dentro do municipio
  bairroSelecionado?: { cd: string; nome: string } | null;
  onVoltarBairro?: () => void;
  // Microzona (sub-distrito OSM dentro do distrito) selecionada
  microRegiaoSelecionada?: {
    id: number; nome: string; tipo: string; votos: number; nivel_farol: number;
    tipo_cobertura?: string | null;
    n_escolas_cobertura?: number | null;
  } | null;
  onVoltarMicroRegiao?: () => void;
  onIniciarEdicaoMicroRegiao?: () => void;
  // Navegação pelo breadcrumb da sidebar (substitui barra superior).
  onVoltarBrasil?: () => void;
  onVoltarEstado?: () => void;
  // Preview Globo-like: top2 da cidade em hover estável (300ms). Exibido no
  // slot do nível estado pra atualizar a sidebar sem sair do mapa.
  hoverPreview?: import("@/hooks/useMunicipioTop2").Top2Response | null;
  onAbrirMunicipioHover?: (ibge: string, nome: string) => void;
  /** Fecha o preview de hover e volta ao ranking do estado (fix navegacao 19/04). */
  onFecharHoverPreview?: () => void;
  /** GeoJSON dos distritos do municipio selecionado. Usado em ConteudoCandidato
      nivel municipio pra listar bairros onde o candidato foi mais votado. */
  distritosGeojson?: any | null;
  /** Apuração por distrito (bairro) — top candidatos pelas zonas do cd_dist. */
  apuracaoDistrito?: import("@/hooks/useMunicipioTop2").Top2Response | null;
  /** Fase 7: abre o side panel comparativo por zona eleitoral. */
  onAbrirComparativo?: () => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTEUDOS POR NIVEL + FILTRO
// ══════════════════════════════════════════════════════════════════════════════


// Re-exportacao do botao flutuante (agora definido em sidebar/chrome/).
// Mantem compat com imports existentes (MapaEleitoral.tsx).
export const BotaoSidebarFlutuante = BotaoSidebarFlutuanteImpl;

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

export function BarraLateral({
  nivel, ufSelecionada, ibgeSelecionado, nomeMunicipio,
  cargoMapa, anoMapa, turnoMapa, modoMapa,
  selecionados, geojsonData,
  onToggleCandidato, onTogglePartido, onAbrirDossie, onLimparSelecionados, onVoltarStep,
  onSelectCargo, onClickEstado, onClickMunicipio, onVerPontos,
  bairroSelecionado, onVoltarBairro,
  microRegiaoSelecionada, onVoltarMicroRegiao, onIniciarEdicaoMicroRegiao,
  onVoltarBrasil, onVoltarEstado,
  hoverPreview, onAbrirMunicipioHover, onFecharHoverPreview, apuracaoDistrito, distritosGeojson, onAbrirComparativo,
}: BarraLateralProps) {
  const nomeEstado = NOME_ESTADO[ufSelecionada ?? ""] ?? ufSelecionada ?? "Estado";
  const sidebarState = useSidebarState();
  const { toggleSidebarCompact, fecharSidebar } = useMapaActions();
  // viewMode: "partidos" | "eleitos" - alterna conteúdo da sidebar no drill-down
  // Cesar 19/04: "quero manter o angulo partidos ao navegar".
  const viewMode = useMapaStore((s) => s.ui.viewMode);
  // 400px é o equilíbrio final: cabe logo 50×40 + sigla até ~8 chars + 3 colunas
  // numéricas centralizadas. Sem gap de espaço vazio entre partido e eleitos.
  const width = sidebarState === "open" ? 360 : sidebarState === "compact" ? 80 : 0;

  const partidosSelecionados = selecionados.filter((s) => s.tipo === "partido");
  const partidoUnico = partidosSelecionados.length === 1 ? partidosSelecionados[0] : null;
  const candidatosSelecionados = selecionados.filter((s) => s.tipo === "candidato");
  const candidatoUnico = candidatosSelecionados.length === 1 ? candidatosSelecionados[0] : null;

  // Modo comparação: 2+ candidatos OU 2+ partidos selecionados
  const emComparacao = candidatosSelecionados.length >= 2 || partidosSelecionados.length >= 2;
  const tipoComparacao: "candidatos" | "partidos" = candidatosSelecionados.length >= 2 ? "candidatos" : "partidos";
  const itensComparados = tipoComparacao === "candidatos" ? candidatosSelecionados : partidosSelecionados;

  // Titulo contextual
  const tituloHumano = candidatoUnico
    ? `Base de ${candidatoUnico.nome}`
    : partidoUnico
      ? `Desempenho do ${partidoUnico.nome}`
      : nivel === "brasil"
        ? "Força dos partidos no Brasil"
        : nivel === "estado"
          ? `Quem domina ${nomeEstado}`
          : `Políticos de ${nomeMunicipio || "cidade"}`;

  const subtituloHumano = cargoMapa && cargoMapa !== "VIGENTES"
    ? `${cargoMapa} ${anoMapa}`
    : "Todos os cargos";

  return (
    <div
      className="flex-shrink-0 flex flex-col bg-white border-l border-gray-200 shadow-sm transition-all duration-300 relative h-full"
      style={{ width, overflow: "hidden" }}
    >
      {sidebarState !== "closed" && (
        <>
          {/* Header compacto: breadcrumb clicável vira o título.
              Antes: header roxo gigante (~80px) com "Quem domina X" + breadcrumb
              em linha separada (~28px) + subtitle "PREFEITO · X" duplicando info.
              Agora: 1 linha (~36px) com breadcrumb-título + ações.
              Cesar 19/04: sidebar gastando 5/10 de altura no chrome — densificar. */}
          <div
            className="flex-shrink-0 px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-2"
            style={{ background: "linear-gradient(135deg, #1E0A3C, #3B0764)" }}
          >
            {sidebarState === "open" ? (
              <SidebarTituloBreadcrumb
                nivel={nivel}
                ufSelecionada={ufSelecionada}
                nomeEstado={nomeEstado}
                nomeMunicipio={nomeMunicipio}
                onVoltarBrasil={onVoltarBrasil}
                onVoltarEstado={onVoltarEstado}
              />
            ) : (
              <Crown className="w-5 h-5 text-brand-300 mx-auto" />
            )}

            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={toggleSidebarCompact}
                className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                title={sidebarState === "open" ? "Recolher para icones" : "Expandir painel"}
              >
                {sidebarState === "open"
                  ? <PanelRightClose className="w-3.5 h-3.5" />
                  : <PanelRightOpen className="w-3.5 h-3.5" />}
              </button>
              {sidebarState === "open" && (
                <button
                  onClick={fecharSidebar}
                  className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="Fechar painel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Chip do filtro ativo (só quando há partido/candidato isolado).
              Mostra o que está colorindo o mapa — afford. de "limpar pra voltar". */}
          {sidebarState === "open" && (partidoUnico || candidatoUnico) && (
            <div className="flex-shrink-0 px-3 py-1.5 border-b border-gray-100 bg-brand-50/40 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: (partidoUnico ?? candidatoUnico)?.cor }} />
              <span className="text-[11px] font-semibold text-gray-800 truncate flex-1">
                {(partidoUnico ?? candidatoUnico)?.nome}
              </span>
              <span className="text-[9px] text-gray-400 uppercase tracking-wider">
                {candidatoUnico ? "candidato" : "partido"}
              </span>
            </div>
          )}

          {/* Linha de tabs combinada: Turno (esquerda) + ViewMode (direita).
              Antes: 2 linhas separadas, ~88px. Agora: 1 linha, ~36px. */}
          {sidebarState === "open" && (
            <SidebarTabsCombinadas
              cargo={cargoMapa}
              nivel={nivel}
              partidoUnico={partidoUnico}
              candidatoUnico={candidatoUnico}
            />
          )}

          {/* Header "Voltar ao inicio" - feedback_mapa_botao_voltar.md.
              Sempre visivel (exceto em bairro/microzona que tem voltar proprio).
              Desabilita quando estado == inicial; click faz reset total. */}
          {sidebarState === "open" && !bairroSelecionado && !microRegiaoSelecionada && (
            <HeaderVoltar onVoltarStep={onVoltarStep ?? (() => {})} />
          )}

          {/* Ponto 1 (13/04): LegendaSelecao removida daqui para evitar
              duplicacao com LegendaCity no canto inferior do mapa. A
              escala 5-0 fica em UM lugar so (canto do mapa, proximo
              ao dado, padrao NYT/Bloomberg). */}

          {/* Modo COMPACT: icones de cargo */}
          {sidebarState === "compact" && (
            <SidebarCompact
              cargoMapa={cargoMapa}
              onSelectCargo={onSelectCargo ?? (() => {})}
            />
          )}

          {/* ── CONTEUDO PRINCIPAL (modo open) ────────────────────────────── */}

          {/* Microzona (subdistrito OSM) tem precedencia maxima — granularidade
              mais fina. Apresenta dados sincronizados com filtros do mapa. */}
          {sidebarState === "open" && nivel === "municipio" && ibgeSelecionado && microRegiaoSelecionada && (
            <ConteudoMicroRegiao
              microSel={microRegiaoSelecionada}
              distritoNome={bairroSelecionado?.nome}
              candidatoUnico={candidatoUnico}
              partidoUnico={partidoUnico}
              cargoMapa={cargoMapa}
              anoMapa={anoMapa}
              onVoltar={onVoltarMicroRegiao ?? (() => {})}
              onIniciarEdicao={onIniciarEdicaoMicroRegiao}
            />
          )}

          {/* Bairro selecionado: se temos apuração rica (top candidatos + % por zonas do
              distrito), usa o preview Globo-like. Fallback pro ConteudoBairro antigo. */}
          {sidebarState === "open" && nivel === "municipio" && ibgeSelecionado && bairroSelecionado && !microRegiaoSelecionada && (
            apuracaoDistrito && apuracaoDistrito.candidatos && apuracaoDistrito.candidatos.length > 0 ? (
              <SidebarHoverPreview
                top2={apuracaoDistrito}
                onAtivarGradiente={onToggleCandidato}
                onAbrirDossie={onAbrirDossie}
                selecionados={selecionados}
              />
            ) : (
              <ConteudoBairro
                codigoIbge={ibgeSelecionado}
                cdDist={bairroSelecionado.cd}
                nomeBairro={bairroSelecionado.nome}
                cargoMapa={cargoMapa}
                anoMapa={anoMapa}
                turnoMapa={turnoMapa}
                onVoltarBairro={onVoltarBairro ?? (() => {})}
                onAbrirDossie={onAbrirDossie}
                onToggleCandidato={onToggleCandidato}
                selecionados={selecionados}
              />
            )
          )}

          {/* Modo comparacao: 2+ selecionados (candidatos OU partidos).
              Precedencia maxima - sobrepoe candidatoUnico/partidoUnico. */}
          {sidebarState === "open" && !microRegiaoSelecionada && !bairroSelecionado && emComparacao && (
            <PainelComparacao
              itens={itensComparados}
              tipo={tipoComparacao}
              geojsonData={geojsonData}
              distritosGeojson={distritosGeojson}
              nivel={nivel}
              onLimparTodos={onLimparSelecionados}
            />
          )}

          {/* Candidato unico selecionado tem precedencia sobre partido/cargo */}
          {sidebarState === "open" && !microRegiaoSelecionada && !bairroSelecionado && !emComparacao && candidatoUnico && (
            <ConteudoCandidato
              candidatoSel={candidatoUnico}
              nivel={nivel}
              ufSelecionada={ufSelecionada}
              ibgeSelecionado={ibgeSelecionado}
              nomeMunicipio={nomeMunicipio}
              geojsonData={geojsonData}
              distritosGeojson={distritosGeojson}
              onVoltar={onLimparSelecionados}
              onClickEstado={onClickEstado}
              onAbrirDossie={onAbrirDossie}
              onVerPontos={onVerPontos}
              onToggleCandidato={onToggleCandidato}
            />
          )}

          {/* Com partido selecionado: ConteudoPartido (nivel-aware) */}
          {sidebarState === "open" && !microRegiaoSelecionada && !bairroSelecionado && !emComparacao && !candidatoUnico && partidoUnico && (
            <ConteudoPartido
              partidoSel={partidoUnico}
              nivel={nivel}
              ufSelecionada={ufSelecionada}
              ibgeSelecionado={ibgeSelecionado}
              nomeMunicipio={nomeMunicipio}
              geojsonData={geojsonData}
              onVoltar={onLimparSelecionados}
              onClickEstado={onClickEstado}
              onClickMunicipio={onClickMunicipio}
              onAbrirDossie={onAbrirDossie}
              onVerPontos={onVerPontos}
            />
          )}

          {/* Sem partido/candidato: Brasil → Ranking (VIGENTES) ou dados do cargo */}
          {sidebarState === "open" && !microRegiaoSelecionada && !bairroSelecionado && !candidatoUnico && !partidoUnico && nivel === "brasil" && (
            <ConteudoBrasilRanking
              selecionados={selecionados}
              onTogglePartido={onTogglePartido}
              onToggleCandidato={onToggleCandidato}
              onAbrirDossie={onAbrirDossie}
              cargoMapa={cargoMapa}
              geojsonData={geojsonData}
            />
          )}

          {/* Sem partido/candidato: Estado → modo Partidos (default) OU modo Eleitos.
              viewMode="partidos": SEMPRE mostra força dos partidos no estado (ranking).
              viewMode="eleitos": mostra preview do município em hover OU eleitos do estado. */}
          {sidebarState === "open" && !microRegiaoSelecionada && !bairroSelecionado && !candidatoUnico && !partidoUnico && nivel === "estado" && ufSelecionada && (
            viewMode === "partidos" ? (
              <ConteudoBrasilRanking
                selecionados={selecionados}
                onTogglePartido={onTogglePartido}
                onToggleCandidato={onToggleCandidato}
                onAbrirDossie={onAbrirDossie}
                cargoMapa={cargoMapa}
                geojsonData={geojsonData}
                uf={ufSelecionada}
              />
            ) : hoverPreview && hoverPreview.municipio.estado_uf === ufSelecionada ? (
              <SidebarHoverPreview
                top2={hoverPreview}
                onEntrar={onAbrirMunicipioHover}
                onFecharPreview={onFecharHoverPreview}
                onAtivarGradiente={onToggleCandidato}
                onAbrirDossie={onAbrirDossie}
                selecionados={selecionados}
              />
            ) : (
              <ConteudoEstado
                uf={ufSelecionada}
                cargoMapa={cargoMapa}
                anoMapa={anoMapa}
                turnoMapa={turnoMapa}
                selecionados={selecionados}
                onToggleCandidato={onToggleCandidato}
                onAbrirDossie={onAbrirDossie}
              />
            )
          )}

          {/* Sem partido/candidato: Municipio → apuração (top candidatos + totais)
              Se tem dados da apuração pro cargo/ano, usa o mesmo preview rico do hover.
              Fallback pro ConteudoMunicipio (versão sem dados de apuração ou cargo não suportado). */}
          {sidebarState === "open" && !microRegiaoSelecionada && !bairroSelecionado && !candidatoUnico && !partidoUnico && nivel === "municipio" && ibgeSelecionado && (
            hoverPreview && hoverPreview.municipio.codigo_ibge === ibgeSelecionado ? (
              <SidebarHoverPreview
                top2={hoverPreview}
                onAbrirComparativo={onAbrirComparativo}
                onAtivarGradiente={onToggleCandidato}
                onAbrirDossie={onAbrirDossie}
                selecionados={selecionados}
              />
            ) : (
              <ConteudoMunicipio
                codigoIbge={ibgeSelecionado}
                nomeMunicipio={nomeMunicipio}
                uf={ufSelecionada ?? ""}
                cargoMapa={cargoMapa}
                selecionados={selecionados}
                onToggleCandidato={onToggleCandidato}
                onAbrirDossie={onAbrirDossie}
                onVerPontos={onVerPontos ?? (() => {})}
              />
            )
          )}
        </>
      )}
    </div>
  );
}
