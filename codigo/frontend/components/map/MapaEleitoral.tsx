"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Map, { Layer, Source, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { X, MapPin, ArrowLeft, Users, BarChart2, ChevronDown, Calendar, Flag, Vote, Flame } from "lucide-react";
// PainelMunicipio e PainelVereadores removidos na FASE 3 (auditoria
// 12/04/2026). A sidebar padronizada (BarraLateral) assume todos os
// casos do nivel municipio. Arquivos mantidos no repo como dead code.
// import { PainelMunicipio } from "./PainelMunicipio";
// import { PainelVereadores } from "./PainelVereadores";
import { PainelEscola } from "./PainelEscola";
import { FiltroMapa } from "./FiltroMapa";
import { BarraLateral, BotaoSidebarFlutuante } from "./BarraLateral";
import { ModalDominancia } from "./ModalDominancia";
import { useRouter } from "next/navigation";
import { corFarolNivel, corOposta, corDoPartido as _corDoPartido } from "@/lib/farolPartido";
import type { FarolResponse, NivelMapa, SelecionadoItem } from "@/lib/types";
import {
  CORES_PARTIDOS,
  COR_PARTIDO_FALLBACK,
  CORES_FAROL,
  NOME_ESTADO,
  CARGOS_COM_2_TURNO,
  corPartido,
  corParaSelecionado,
  fmt,
} from "./mapa/utils";
import type { HoverInfo, PartidoItem } from "./mapa/types";
import { TooltipCursor } from "./mapa/tooltips/TooltipCursor";
import { Legenda } from "./mapa/legendas/Legenda";
import { LegendaComparacao } from "./mapa/legendas/LegendaComparacao";
import { LegendaCity } from "./mapa/legendas/LegendaCity";
import { PainelPartidos } from "./mapa/chrome/PainelPartidos";
import { TopbarExpandivel } from "./mapa/chrome/TopbarExpandivel";
import { SeletorModo } from "./mapa/chrome/SeletorModo";
import { useMapaStore } from "@/lib/store/mapaStore";
import { useMapaUrlSwr, useFarolGlobal } from "@/hooks/useMapaData";
import { useMunicipioTop2, useDistritoTop2 } from "@/hooks/useMunicipioTop2";
import { useMicrobairros } from "@/hooks/useMicrobairros";
import { ComparativoZonasPainel } from "./ComparativoZonasPainel";
import { useSWRConfig } from "swr";
import { HeatmapLayer } from "./HeatmapLayer";
import { MapaToolbar } from "./MapaToolbar";
import { DebugOverlay } from "./DebugOverlay";
import { SeletorComparacaoTemporal } from "./SeletorComparacaoTemporal";
import { API_BASE } from "@/lib/api/base";

const API = API_BASE;

// Cargos disponíveis no seletor de camada do mapa
const CARGOS_MAPA = [
  // Especial: todos os mandatos vigentes (2024 + 2022 + 2018 senadores)
  { cargo: "VIGENTES",          ano: 0,    ciclo: 0,    label: "Todos Vigentes", cor: "bg-brand-700",  peso: 0,  qtd: "100k" },
  // Ciclo 2022 — eleições estaduais e federais
  { cargo: "PRESIDENTE",        ano: 2022, ciclo: 2022, label: "Presidente",    cor: "bg-purple-700", peso: 500, qtd: "1"    },
  { cargo: "GOVERNADOR",        ano: 2022, ciclo: 2022, label: "Governador",    cor: "bg-brand-700",  peso: 100, qtd: "27"   },
  { cargo: "SENADOR",           ano: 2022, ciclo: 2022, label: "Senador",       cor: "bg-sky-700",    peso: 60,  qtd: "27"   },
  { cargo: "DEPUTADO FEDERAL",  ano: 2022, ciclo: 2022, label: "Dep. Federal",  cor: "bg-teal-700",   peso: 20,  qtd: "513"  },
  { cargo: "DEPUTADO ESTADUAL", ano: 2022, ciclo: 2022, label: "Dep. Estadual", cor: "bg-green-700",  peso: 8,   qtd: "1.0k" },
  // Ciclo 2024 — eleições municipais
  { cargo: "PREFEITO",          ano: 2024, ciclo: 2024, label: "Prefeito",      cor: "bg-orange-600", peso: 15,  qtd: "5.5k" },
  { cargo: "VEREADOR",          ano: 2024, ciclo: 2024, label: "Vereador",      cor: "bg-brand-800",  peso: 1,   qtd: "58k"  },
];

// FASE 4: cargos municipais — candidato desses cargos nao persiste ao
// sair do municipio (nao existe em nivel estado/brasil).
const CARGOS_MUNICIPAIS = new Set(["VEREADOR", "PREFEITO", "VICE-PREFEITO"]);

const OPACIDADE_FILL = 0.84;

const COR_FILL_EXPRESSAO = [
  "match", ["get", "status_farol"],
  "AZUL",    CORES_FAROL.AZUL,
  "VERDE",   CORES_FAROL.VERDE,
  "AMARELO", CORES_FAROL.AMARELO,
  CORES_FAROL.VERMELHO,
];

const BRASIL_BOUNDS: [[number, number], [number, number]] = [[-73.99, -33.75], [-28.85, 5.27]];

// Enquadramento padrão — calibrado manualmente para abrir o Brasil
// com proporção ideal (estados visíveis + contexto de países vizinhos)
const BRASIL_VIEW = { center: [-55.4957, -12.8967] as [number, number], zoom: 3.26 };
const BRASIL_FIT_PADDING = { top: 50, bottom: 100, left: 225, right: 65 };

// Centróides visuais de cada estado (um ponto por UF — evita label duplicado em MultiPolygon)
const CENTROIDES_ESTADOS: Record<string, [number, number]> = {
  AC: [-70.5,  -9.0],  AM: [-64.0,  -4.5],  RR: [-61.0,   2.0],
  AP: [-51.9,   1.0],  PA: [-52.5,  -3.5],  RO: [-63.0, -10.8],
  TO: [-48.4, -10.2],  MA: [-44.8,  -5.0],  PI: [-42.8,  -7.0],
  CE: [-39.3,  -5.1],  RN: [-36.5,  -5.8],  PB: [-36.8,  -7.1],
  PE: [-37.3,  -8.7],  AL: [-36.6,  -9.6],  SE: [-37.1, -10.6],
  BA: [-41.7, -12.5],  MG: [-44.7, -18.1],  ES: [-40.3, -19.6],
  RJ: [-43.2, -22.5],  SP: [-48.5, -22.2],  PR: [-51.6, -24.6],
  SC: [-50.5, -27.2],  RS: [-53.0, -29.8],  MS: [-54.5, -20.5],
  MT: [-55.9, -12.6],  GO: [-49.6, -15.9],  DF: [-47.9, -15.8],
};

// GeoJSON estático com um ponto por estado — usado para labels sem duplicatas
const LABEL_ESTADOS_GEOJSON: any = {
  type: "FeatureCollection",
  features: Object.entries(CENTROIDES_ESTADOS).map(([uf, [lng, lat]]) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: { estado_uf: uf },
  })),
};

const MAP_STYLE_BASE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// BarraFiltros movido para ./mapa/chrome/BarraFiltros.tsx (dead code local).

// LogoPartido extraído para components/shared/LogoPartido.tsx
// PainelPartidos movido para ./mapa/chrome/PainelPartidos.tsx.

// Legenda + LegendaComparacao + LegendaCity movidos para ./mapa/legendas/.
// TooltipCursor + TooltipCandidato movidos para ./mapa/tooltips/.

// PainelContexto removido (UX Fase): seu conteúdo migrou para o componente
// <StatsResumo> dentro do BarraLateral (topo da sidebar). Esta função foi
// deletada para eliminar dead code.

// BotoesNavegacao movido para ./mapa/chrome/BotoesNavegacao.tsx (dead code local).

// ── Componente principal ───────────────────────────────────────────────────────
//
// Props (Fase 0a refator 27/04/2026, mapas canon):
//   - esconderTopbar / overlayTop  → wrappers como MapaEstrategico injetam sua
//     própria topbar (3 Modos + camadas) sem duplicar a topbar nativa de filtros.
//   - esconderSidebar / overlayRight → idem para BarraLateral. Wrapper provê
//     painel de preview específico (ex: KPIs UB-state, score saúde nominata).
//
// Toda a lógica core (drill-down 5 níveis, Zustand store, hover, tooltip,
// SWR fetches, MapLibre Sources/Layers) permanece intacta. Wrappers compõem o
// engine; não substituem.
export interface MapaEleitoralProps {
  esconderTopbar?: boolean;
  esconderSidebar?: boolean;
  overlayTop?: ReactNode;
  overlayRight?: ReactNode;
}

export function MapaEleitoral({
  esconderTopbar = false,
  esconderSidebar = false,
  overlayTop,
  overlayRight,
}: MapaEleitoralProps = {}) {
  const mapRef          = useRef<any>(null);
  const clickTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Fase 4 (Globo-like): detector de duplo-clique (1 click = preview/zoom, 2 cliques = drill).
  const ultimoClickIbgeRef = useRef<string | null>(null);
  const [ibgePreview, setIbgePreview] = useState<string | null>(null);
  // Tooltip rico Globo-like: ibge em hover estável (setado no debounce 300ms).
  const [ibgeHover, setIbgeHover] = useState<string | null>(null);
  // Fase 7: painel comparativo por zona eleitoral (side panel).
  const [comparativoAberto, setComparativoAberto] = useState(false);
  // Microbairros HERE+OSM (1.795 SP capital). Toggle aparece quando dentro de SP.
  // O fetch + microbairrosAtivado dependem de ufSelecionada/ibgeSelecionado e
  // estão definidos depois — buscar via useEffect ou após as variáveis estarem prontas.
  // microbairrosVisivel = sempre true. Botao removido em 20/04: camada
  // vive direto no MapLibre, outline pontilhado discreto (padrao Google Maps).
  const [microbairrosVisivel] = useState(true);
  const municipioBounds = useRef<Record<string, [[number, number], [number, number]]>>({});
  const estadoBoundsRef = useRef<[[number, number], [number, number]] | null>(null);
  // Cesar 20/04: rastrear qual UF gerou os bounds. keepPreviousData do SWR mantem
  // o data da UF anterior enquanto o novo fetch nao chega, entao estadoBoundsRef
  // pode estar "desatualizado" durante a transicao A -> null -> B. Sem esse ref,
  // o effect de fitBounds animava pros bounds antigos e marcava a UF nova como
  // "ja animada", resultando em mapa cinza/desalinhado.
  const estadoBoundsUfRef = useRef<string | null>(null);

  // ── Geografia movida para o store global (Fase 5 - nível 2) ─────────────
  const nivel = useMapaStore((s) => s.geography.nivel) as NivelMapa;
  const setNivel = useMapaStore((s) => s.setNivel) as (n: NivelMapa) => void;

  // ── Filtros movidos para o store global (Fase 5 - nível 1) ──────────────
  // Mantemos os mesmos nomes de variável (modoMapa/setModoMapa/etc) para
  // não tocar no JSX downstream — só a fonte mudou (useState → Zustand).
  const modoMapaStore = useMapaStore((s) => s.filters.modo);
  const modoMapa: "eleitos" | "votos" =
    modoMapaStore === "heatmap" ? "eleitos" : modoMapaStore;
  const setModoMapaStore = useMapaStore((s) => s.setModo);
  const setModoMapa = useCallback(
    (m: "eleitos" | "votos") => setModoMapaStore(m),
    [setModoMapaStore],
  );
  // Versão "unificada" usada apenas pelo toggle do header (3 estados).
  const modoMapaUnificado = modoMapaStore;
  const setModoUnificado = setModoMapaStore;

  const cargoMapa = useMapaStore((s) => s.filters.cargo);
  const setCargoMapa = useMapaStore((s) => s.setCargo);

  const anoMapa = useMapaStore((s) => s.filters.ano);
  const setAnoMapa = useMapaStore((s) => s.setAno);

  const turnoMapaStore = useMapaStore((s) => s.filters.turno);
  // turno=0 ("Total") no store = visualmente igual ao 1T no mapa (cor=partido eleito,
  // que não muda entre turnos). Só números na sidebar mudam (via /ranking-partidos).
  const turnoMapa: number = turnoMapaStore === 0 ? 1 : turnoMapaStore;
  const setTurnoMapaStore = useMapaStore((s) => s.setTurno);
  const setTurnoMapa = useCallback(
    (t: number) => setTurnoMapaStore((t === 2 ? 2 : 1) as 1 | 2),
    [setTurnoMapaStore],
  );
  // Estado da sidebar global. Legendas no canto inferior só aparecem quando
  // a sidebar está COMPLETAMENTE fechada (no modo compact ela ocupa 80px e
  // já mostra ícones de cargos — duplicaria conteúdo).
  const sidebarFechada = useMapaStore((s) => s.ui.sidebarState === "closed");

  // Comparação temporal só renderiza visualmente no nível estado: o endpoint
  // /comparacao-temporal recebe :uf no path. Esse flag é usado tanto para
  // mostrar a legenda quanto para suprimir as outras legendas (mutuamente
  // exclusivas no mesmo canto inferior esquerdo do mapa).
  const comparacaoTemporalVisivel =
    useMapaStore((s) => s.filters.anoComparacao) !== null && nivel === "estado";

  // ── Estado de seleção unificado (Fase 2.3: migrado pro store V2) ───────────
  // Substitui: candidatoFiltroId, candidatoFiltroNome, partidoNumero, partidoSigla
  // Antes era useState local e divergia do store no reload (botao voltar ficava
  // desabilitado mesmo com PSD filtrado no sessionStorage). Agora store e a
  // unica fonte de verdade, persistido em sessionStorage pelo persist middleware.
  const selecionados = useMapaStore((s) => s.selecionados);
  const setSelecionadosStore = useMapaStore((s) => s.setSelecionados);
  const clearSelecionadosStore = useMapaStore((s) => s.clearSelecionados);
  // Shim pra callsites legacy que usam setSelecionados([...]) ou setSelecionados(prev => fn(prev)).
  const setSelecionados = useCallback(
    (update: SelecionadoItem[] | ((prev: SelecionadoItem[]) => SelecionadoItem[])) => {
      const current = useMapaStore.getState().selecionados;
      const next = typeof update === "function" ? update(current) : update;
      setSelecionadosStore(next);
    },
    [setSelecionadosStore]
  );

  const [dropdownAberto, setDropdownAberto]           = useState<"ciclo" | "cargo" | "partido" | null>(null);
  // ufSelecionada e ibgeSelecionado vêm do store (Fase 5 - nível 2)
  const ufSelecionada = useMapaStore((s) => s.geography.uf);
  const setUfSelecionada = useMapaStore((s) => s.setUf);
  const ibgeSelecionado = useMapaStore((s) => s.geography.ibge);
  const setIbgeSelecionado = useMapaStore((s) => s.setIbge);

  // Microbairros HERE+OSM — fetch só ativa quando o toggle está ON E está em SP capital
  const microbairrosAtivado = microbairrosVisivel && (
    ufSelecionada === "SP" || ibgeSelecionado === "3550308"
  );
  const { data: microbairrosGeoJSON } = useMicrobairros({
    cidade: "São Paulo", uf: "SP", enabled: microbairrosAtivado,
  });

  const [nomeMunicipioSelecionado, setNomeMunicipioSelecionado] = useState<string>("");
  const [mostrarVereadores, setMostrarVereadores] = useState(false);
  const [modoBairros, setModoBairros]             = useState(false); // duplo-clique ativa bairros para qualquer cargo

  const [vereadorSelecionado, setVereadorSelecionado] = useState<{
    candidaturaId: number; nome: string; fotoUrl?: string | null;
  } | null>(null);

  const [dominanciaIbge, setDominanciaIbge] = useState<string | null>(null);
  const [buscaResetKey, setBuscaResetKey] = useState(0);  // P2-4: bumpa pra forcar remount do FiltroMapa
  const router = useRouter();
  const abrirDossie = (id: number) => router.push(`/radar/politicos/${id}`);

  // Globo-like: abre direto em "municipios" (mapa já colorido por partido dominante).
  const [granularidadeBrasil, setGranularidadeBrasil] = useState<"estados" | "municipios">("municipios");

  const [farolGlobal, setFarolGlobal]           = useState<FarolResponse | null>(null);
  const [geojson, setGeojson]                   = useState<any>(null);
  const [geojsonBrasilMun, setGeojsonBrasilMun] = useState<any>(null);
  const [geojsonBrasilEstados, setGeojsonBrasilEstados] = useState<any>(null);
  const [geojsonCoord, setGeojsonCoord]         = useState<any>(null);
  const [mostrarCoordenadores, setMostrarCoordenadores] = useState(false);
  const [distritosCity, setDistritosCity]   = useState<any>(null);
  const [setoresCity, setSetoresCity]       = useState<any>(null);   // setores censitarios (granularidade fina)
  const [microRegioes, setMicroRegioes]     = useState<any[]>([]);   // bairros OSM (Jardim Iris, Taipas, etc)
  const [locaisVotacao, setLocaisVotacao]   = useState<any>(null);   // escola pins
  const [modoLocais, setModoLocais]         = useState(false);       // nível escola (clique num bairro)
  const [modoSetores, setModoSetores]       = useState(false);       // nível setor (granularidade fina)
  const [modoMicroRegioes, setModoMicroRegioes] = useState(false);   // mostrar bairros OSM como pins
  const [escolaSelecionadaId, setEscolaSelecionadaId] = useState<number | null>(null); // M9 — clique numa escola abre PainelEscola
  const [bairroSelecionado, setBairroSelecionado] = useState<{ cd: string; nome: string } | null>(null);
  // Microzona selecionada (sub-distrito OSM dentro de um distrito IBGE).
  // Quando setada, sidebar mostra dados dela. Segundo clique aprofunda em pontos.
  const [microRegiaoSelecionada, setMicroRegiaoSelecionada] = useState<{
    id: number; nome: string; tipo: string; votos: number; nivel_farol: number;
    tipo_cobertura?: string | null;
    n_escolas_cobertura?: number | null;
  } | null>(null);
  const [carregando, setCarregando]         = useState(false);
  const [hover, setHover]                   = useState<HoverInfo | null>(null);

  // ── Editor manual de polygon (Cesar 13/04 21h: quer editar e sistema aprender) ──
  // modoEdicao.rings representa o polygon sendo editado como array de rings.
  // Cada ring e um array de coordenadas [lng, lat]. rings[0] = exterior,
  // rings[1..n] = holes.
  const [modoEdicao, setModoEdicao] = useState<{
    mrId: number; nome: string; rings: number[][][];
  } | null>(null);
  const [vertexDrag, setVertexDrag] = useState<{ ringIdx: number; vertIdx: number } | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  // Ferramenta ativa no painel de edicao. "mover" = cursor default com drag.
  // "adicionar" = click na linha insere vertex. "remover" = click no vertex remove.
  const [ferramentaEditor, setFerramentaEditor] = useState<"mover" | "adicionar" | "remover">("mover");
  // Pilha de historicoEdicao pra permitir undo. Cada entrada eh um snapshot de rings.
  const [historicoEdicao, setHistoricoEdicao] = useState<number[][][][]>([]);
  const [ringsOriginais, setRingsOriginais] = useState<number[][][] | null>(null);

  // mutate global do SWR - usado no salvarEdicao pra revalidar microregioes
  // sem precisar de reload de pagina. useSWRConfig nao bloqueia ordem.
  const { mutate: swrMutate } = useSWRConfig();

  const iniciarEdicao = useCallback((mr: any) => {
    const geom = mr.geometry;
    if (!geom) return;
    let rings: number[][][];
    if (geom.type === "Polygon") {
      rings = geom.coordinates as number[][][];
    } else if (geom.type === "MultiPolygon") {
      const partes = geom.coordinates as number[][][][];
      const maior = partes.reduce((acc, p) => p[0].length > acc[0].length ? p : acc, partes[0]);
      rings = maior;
    } else {
      return;
    }
    setModoEdicao({ mrId: mr.id, nome: mr.nome, rings });
    setRingsOriginais(JSON.parse(JSON.stringify(rings))); // deep clone
    setHistoricoEdicao([]);
    setFerramentaEditor("mover");
  }, []);

  const cancelarEdicao = useCallback(() => {
    setModoEdicao(null);
    setVertexDrag(null);
    setHistoricoEdicao([]);
    setRingsOriginais(null);
    setFerramentaEditor("mover");
  }, []);

  // Salva snapshot atual dos rings no historico antes de aplicar mudanca.
  // Chamado antes de add/remove vertex. Arrastar um vertex NAO empilha (o
  // drag eh continuo; empilhar seria ruidoso).
  const pushHistorico = useCallback(() => {
    setModoEdicao(prev => {
      if (!prev) return prev;
      setHistoricoEdicao(h => [...h, JSON.parse(JSON.stringify(prev.rings))]);
      return prev;
    });
  }, []);

  const desfazerEdicao = useCallback(() => {
    setHistoricoEdicao(h => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setModoEdicao(prev => prev ? { ...prev, rings: last } : prev);
      return h.slice(0, -1);
    });
  }, []);

  const salvarEdicao = useCallback(async () => {
    if (!modoEdicao || salvandoEdicao) return;
    setSalvandoEdicao(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("ub_token") : null;
      const geometry = {
        type: "Polygon" as const,
        coordinates: modoEdicao.rings,
      };
      const res = await fetch(`${API_BASE}/mapa/microregiao/${modoEdicao.mrId}/geometry`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ geometry, motivo: "edicao_manual_mapa" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "erro" }));
        alert(`Erro ao salvar: ${err.detail ?? res.status}`);
        return;
      }
      // Fecha o editor e revalida a source microregioes SEM reload de pagina.
      // Usuario continua no contexto atual (cidade/distrito aberto).
      setModoEdicao(null);
      setVertexDrag(null);
      setHistoricoEdicao([]);
      setRingsOriginais(null);
      // Invalida todas SWR keys que envolvem /microregioes (pega geom nova).
      await swrMutate(
        (key: any) => typeof key === "string" && key.includes("/microregioes"),
        undefined,
        { revalidate: true },
      );
    } catch (e: any) {
      alert(`Erro de rede ao salvar: ${e.message}`);
    } finally {
      setSalvandoEdicao(false);
    }
  }, [modoEdicao, salvandoEdicao, swrMutate]);

  const removerHoles = useCallback(async () => {
    if (!modoEdicao || salvandoEdicao) return;
    setSalvandoEdicao(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("ub_token") : null;
      const res = await fetch(`${API_BASE}/mapa/microregiao/${modoEdicao.mrId}/remover-holes`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "erro" }));
        alert(`Erro ao remover holes: ${err.detail ?? res.status}`);
        return;
      }
      const r = await res.json();
      alert(`Holes removidos! +${r.area_ganho_m2?.toFixed?.(0) ?? 0} m² de area recuperada.`);
      setModoEdicao(null);
      setVertexDrag(null);
      setHistoricoEdicao([]);
      setRingsOriginais(null);
      await swrMutate(
        (key: any) => typeof key === "string" && key.includes("/microregioes"),
        undefined,
        { revalidate: true },
      );
    } catch (e: any) {
      alert(`Erro de rede ao remover holes: ${e.message}`);
    } finally {
      setSalvandoEdicao(false);
    }
  }, [modoEdicao, salvandoEdicao, swrMutate]);

  const apagarMicrozona = useCallback(async () => {
    if (!modoEdicao || salvandoEdicao) return;
    setSalvandoEdicao(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("ub_token") : null;
      const res = await fetch(`${API_BASE}/mapa/microregiao/${modoEdicao.mrId}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "erro" }));
        alert(`Erro ao apagar: ${err.detail ?? res.status}`);
        return;
      }
      setModoEdicao(null);
      setVertexDrag(null);
      setHistoricoEdicao([]);
      setRingsOriginais(null);
      await swrMutate(
        (key: any) => typeof key === "string" && key.includes("/microregioes"),
        undefined,
        { revalidate: true },
      );
    } catch (e: any) {
      alert(`Erro de rede ao apagar: ${e.message}`);
    } finally {
      setSalvandoEdicao(false);
    }
  }, [modoEdicao, salvandoEdicao, swrMutate]);

  // ── Derived state ─────────────────────────────────────────────────────────
  // useMemo garante referência estável — evita loop infinito no handleMouseMove
  const candidatosSel = useMemo(() => selecionados.filter(s => s.tipo === "candidato"), [selecionados]);
  const partidosSel   = useMemo(() => selecionados.filter(s => s.tipo === "partido"),   [selecionados]);
  const modoComparacao = selecionados.length >= 2;

  // Refs para candidatosSel/partidosSel: handleMouseMove lê via ref → evita recriar callback a cada seleção
  const candidatosSelRef = useRef(candidatosSel);
  candidatosSelRef.current = candidatosSel;
  const partidosSelRef = useRef(partidosSel);
  partidosSelRef.current = partidosSel;
  const tipoComparacao: "candidatos" | "partidos" = partidosSel.length >= 2 ? "partidos" : "candidatos";

  // Compatibilidade com subcomponentes que ainda usam valores únicos
  const candidatoFiltroId   = candidatosSel.length === 1 ? candidatosSel[0].id : null;
  const candidatoFiltroNome = candidatosSel.length === 1 ? candidatosSel[0].nome : "";
  const partidoNumero       = partidosSel.length === 1 ? partidosSel[0].id : null;  // null = todos

  // ── Toggle de selecionado ──────────────────────────────────────────────────
  const toggleSelecionado = useCallback((item: Omit<SelecionadoItem, "cor">) => {
    setSelecionados(prev => {
      const idx = prev.findIndex(s => s.tipo === item.tipo && s.id === item.id);
      if (idx !== -1) {
        // Deselecionar
        return prev.filter((_, i) => i !== idx);
      }
      // Se mudou de tipo (candidato <-> partido), começa do zero com a cor certa
      if (prev.length > 0 && prev[0].tipo !== item.tipo) {
        const cor = corParaSelecionado(item, []);
        return [{ ...item, cor }];
      }
      const cor = corParaSelecionado(item, prev);
      return [...prev, { ...item, cor }];
    });
  }, []);

  const removerSelecionado = useCallback((id: number, tipo: "candidato" | "partido") => {
    setSelecionados(prev => prev.filter(s => !(s.tipo === tipo && s.id === id)));
  }, []);

  const limparSelecionados = useCallback(() => setSelecionados([]), []);

  // ── Sincronização seleção → store global (Fase 5 - nível 3) ─────────────
  // Componentes novos (HeatmapLayer, recomendações) leem do store. Mantemos
  // a fonte da verdade local em `selecionados` mas espelhamos partido único
  // e candidato único para o store. Isso vai junto da migração de fetches.
  const setStorePartido    = useMapaStore((s) => s.setPartido);
  const setStoreCandidato  = useMapaStore((s) => s.setCandidato);
  useEffect(() => { setStorePartido(partidoNumero); }, [partidoNumero, setStorePartido]);
  useEffect(() => { setStoreCandidato(candidatoFiltroId); }, [candidatoFiltroId, setStoreCandidato]);

  // ── Sync candidato unico -> cargo/ano do store ──────────────────────────
  // Quando usuario filtra um candidato (ex: Tarcisio GOVERNADOR 2022), os
  // metadados dele (cargo/ano) vao pro store. TURNO fica livre — usuario
  // escolhe 1o ou 2o turno pelo toggle sem o sync forcar de volta.
  //
  // Regressao corrigida em 13/04: antes forcava turnoMapa=2 ao detectar
  // candidato de cargo majoritario, criando loop que travava os botoes de
  // 1o/2o Turno. Cargos sem 2 turno continuam forcados ao turno 1.
  useEffect(() => {
    if (candidatosSel.length !== 1) return;
    const cand = candidatosSel[0];
    if (!cand.cargo || !cand.ano) return;
    if (cargoMapa !== cand.cargo) setCargoMapa(cand.cargo);
    if (anoMapa !== cand.ano) setAnoMapa(cand.ano);
    // Cargos sem 2o turno: forca turno 1 (nao ha outro).
    if (!CARGOS_COM_2_TURNO.has(cand.cargo) && turnoMapa !== 1) {
      setTurnoMapa(1);
    }
  }, [candidatosSel, cargoMapa, anoMapa, turnoMapa, setCargoMapa, setAnoMapa, setTurnoMapa]);

  // ── Auto-layer (Globo-like): "eleitos" é o default, "votos" quando há filtro ──
  // Regra atualizada (15/04/2026, demo Globo):
  //  - Sem filtro de partido/candidato  → modo "eleitos" (pinta pelo partido dominante,
  //    como a Globo G1 faz na abertura). Antes forçava "votos" pra cargo específico, o
  //    que deixava o estado cinza no drill-down (sem partido = sem cor definida).
  //  - Com partido/candidato filtrado   → modo "votos" (mostra o farol do filtro).
  //
  // Aplica so na TRANSICAO de cargo/filtro (useRef guarda ultima combinação sincronizada).
  // Apos sincronizar uma vez, respeita cliques manuais do usuario sem brigar em cada render.
  // useEffect auto de modo REMOVIDO em 20/04/2026 (Cesar):
  // Ele sobrescrevia modo=votos/heatmap toda vez que user trocava cargo ou
  // filtro, zerando a escolha manual. Agora o modo e 100% controlado pelo
  // toggle da topbar. Default vem do store (FILTERS_DEFAULT.modo = "eleitos").

  // ── Fetch: farol global (migrado para SWR — cache 5min) ──────────────────
  const { data: farolGlobalSwr } = useFarolGlobal();
  useEffect(() => {
    if (farolGlobalSwr) setFarolGlobal(farolGlobalSwr as FarolResponse);
  }, [farolGlobalSwr]);

  // Máscara visual "só Brasil": polígono inverso (mundo - Brasil) colorido em
  // tom neutro, cobrindo paises vizinhos. Geometria estática — 1 fetch por sessão.
  // Backend retorna FeatureCollection pronta; usamos direto como data da Source.
  const { data: mascaraBrasilSwr } = useMapaUrlSwr<any>(() => `/mapa/mascara`);

  // ── Fetch: GeoJSON Brasil por ESTADOS (migrado para SWR — Fase 5 nível 3) ─
  // Sempre busca em nível brasil: além do fill (quando granularidade=estados),
  // o geojson serve pra desenhar as fronteiras estaduais POR CIMA da visão municípios.
  const { data: brasilEstadosSwr } = useMapaUrlSwr(() => {
    if (nivel !== "brasil") return null;
    const partidoParam = partidoNumero != null ? `&partido=${partidoNumero}` : "";
    if (!cargoMapa || cargoMapa === "VIGENTES") {
      return `/mapa/geojson/brasil?cargo=VIGENTES&modo=${modoMapa}${partidoParam}`;
    }
    const turnoParam = turnoMapa === 2 ? "&turno=2" : "";
    return `/mapa/geojson/brasil?cargo=${encodeURIComponent(cargoMapa)}&ano=${anoMapa}&modo=${modoMapa}${partidoParam}${turnoParam}`;
  });
  useEffect(() => {
    if (brasilEstadosSwr?.type === "FeatureCollection") {
      setGeojsonBrasilEstados(brasilEstadosSwr);
    }
  }, [brasilEstadosSwr]);

  // ── Fetch: GeoJSON Brasil-municípios (migrado para SWR) ──────────────────
  const { data: brasilMunSwr } = useMapaUrlSwr(() => {
    const partidoParam = partidoNumero != null ? `&partido=${partidoNumero}` : "";
    const cargoParam = cargoMapa ? `cargo=${encodeURIComponent(cargoMapa)}&ano=${anoMapa}&` : "";
    const turnoParam = cargoMapa && turnoMapa === 2 ? `turno=2&` : "";
    return `/mapa/geojson/brasil-municipios?${cargoParam}${turnoParam}${partidoParam.replace(/^&/, "")}`;
  });
  useEffect(() => {
    if (brasilMunSwr?.type === "FeatureCollection") {
      setGeojsonBrasilMun(brasilMunSwr);
    }
  }, [brasilMunSwr]);

  // Tooltip/sidebar Globo-like: fetch top2 (eleito + 2º + apuração) da cidade.
  // Prioridade: município selecionado (drill-down) > município em hover estável.
  const tabAtiva = useMapaStore((s) => s.filters.tab);
  const setTabStore = useMapaStore((s) => s.setTab);
  const ibgeAlvo = ibgeSelecionado ?? ibgeHover;
  const { data: top2Data } = useMunicipioTop2(ibgeAlvo, cargoMapa, anoMapa, turnoMapa, tabAtiva);
  // Apuração por DISTRITO (bairro) — ativa quando há bairroSelecionado (drill-down).
  const { data: top2Distrito } = useDistritoTop2(
    bairroSelecionado?.cd ?? null, cargoMapa, anoMapa, turnoMapa, tabAtiva,
  );

  // Auto-switch pra "2º Turno" ao entrar numa cidade que teve 2T no cargo/ano atual.
  // Padrão Globo/G1: se houve 2T, a "última disputa" é o 2T — mapa colore só pelos
  // 2 finalistas e sidebar lista os 2. User pode trocar pra Total/1T pelo TabsTurno.
  // Ao SAIR da cidade (volta pro estado/Brasil), restaura tab=Total pra não enviar
  // turno=2 em endpoints estaduais (geojson/SP turno=2 zera 90% dos municípios que
  // não tiveram 2T → mapa branco).
  const lastAutoSwitchKey = useRef<string | null>(null);
  const autoSwitchedRef   = useRef<boolean>(false);
  useEffect(() => {
    if (!ibgeSelecionado || !cargoMapa) {
      // Saiu da cidade: se fomos nós que mudamos pra 2T, restaurar Total.
      if (autoSwitchedRef.current) {
        setTabStore("total");
        setTurnoMapaStore(0);
        autoSwitchedRef.current = false;
      }
      lastAutoSwitchKey.current = null;
      return;
    }
    const key = `${ibgeSelecionado}-${cargoMapa}-${anoMapa}`;
    if (lastAutoSwitchKey.current === key) return;
    if (!top2Data || top2Data.municipio?.codigo_ibge !== ibgeSelecionado) return;
    lastAutoSwitchKey.current = key;
    if (top2Data.teve_segundo_turno === true) {
      setTabStore("2_turno");
      setTurnoMapaStore(2);
      autoSwitchedRef.current = true;
    }
  }, [ibgeSelecionado, cargoMapa, anoMapa, top2Data, setTabStore, setTurnoMapaStore]);

  // Quando cargo muda: limpa geojson. Candidatos só são removidos se o
  // cargo do candidato divergir do novo cargoMapa — assim o sync
  // candidato→cargo (linhas 918-930) não entra em loop com este efeito.
  // Regra de filtros compartilhados (zona protegida do plano): candidato
  // persiste sempre que faz sentido no filtro atual.
  useEffect(() => {
    setGeojson(null);
    municipioBounds.current = {};
    setSelecionados(prev => prev.filter(s => {
      if (s.tipo === "partido") return true;
      // Candidato cujo cargo bate com o novo cargoMapa é preservado.
      if (s.tipo === "candidato" && s.cargo && cargoMapa && s.cargo === cargoMapa) return true;
      return false;
    }));
    if (!cargoMapa || cargoMapa !== "VEREADOR") {
      setMostrarVereadores(false);
      setVereadorSelecionado(null);
      setDistritosCity(null);
    }
    // Cargo nacional (PRESIDENTE, SENADOR): volta ao nivel Brasil
    // Cargo estadual (GOV, DEP): se esta no municipio, volta ao estado
    const cargosNacionais = new Set(["PRESIDENTE", "SENADOR"]);
    const cargosEstaduais = new Set(["GOVERNADOR", "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL"]);
    if (cargoMapa && cargosNacionais.has(cargoMapa.toUpperCase()) && nivel !== "brasil") {
      setNivel("brasil");
      setUfSelecionada(null);
      setIbgeSelecionado(null);
      setModoBairros(false);
      setModoLocais(false);
      if (mapRef.current) {
        mapRef.current.getMap().fitBounds(BRASIL_BOUNDS, { padding: BRASIL_FIT_PADDING, duration: 800 });
      }
    } else if (cargoMapa && cargosEstaduais.has(cargoMapa.toUpperCase()) && nivel === "municipio") {
      setModoBairros(false);
      setModoLocais(false);
    }
  }, [cargoMapa, anoMapa]);

  // ── Fetch: GeoJSON de distritos (bairros) — migrado para SWR ─────────────
  const { data: distritosSwr } = useMapaUrlSwr(() => {
    if (!ibgeSelecionado || !modoBairros) return null;

    // PRIORIDADE 1: se tem candidato unico filtrado, usar o cargo/ano DELE
    // (ex: Tarcisio -> GOVERNADOR/2022, nao VEREADOR/2024)
    const cand = candidatosSel.length === 1 ? candidatosSel[0] : null;
    let cargoFinal: string;
    let anoFinal: number;
    if (cand?.cargo && cand?.ano) {
      cargoFinal = cand.cargo;
      anoFinal = cand.ano;
    } else {
      const cargoEfetivo = cargoMapa;
      const anoEfetivo = anoMapa;
      cargoFinal = (!cargoEfetivo || cargoEfetivo === "VIGENTES") ? "VEREADOR" : cargoEfetivo;
      anoFinal = (!cargoEfetivo || cargoEfetivo === "VIGENTES") ? 2024 : anoEfetivo;
    }

    const base = `/mapa/municipio/${ibgeSelecionado}`;
    const cargoParam = `cargo=${encodeURIComponent(cargoFinal)}&ano=${anoFinal}&turno=${turnoMapa}`;

    if (modoComparacao && candidatosSel.length >= 2) {
      const ids = candidatosSel.map(s => s.id).join(",");
      return `${base}/distritos/comparacao?candidatos=${ids}&${cargoParam}`;
    }
    if (candidatosSel.length === 1) {
      return `${base}/distritos?candidato_id=${candidatosSel[0].id}&${cargoParam}`;
    }
    if (partidosSel.length >= 1) {
      return `${base}/distritos?partido=${partidosSel[0].id}&${cargoParam}`;
    }
    if (cargoMapa === "VEREADOR" && vereadorSelecionado) {
      return `${base}/distritos?candidatura_id=${vereadorSelecionado.candidaturaId}&${cargoParam}`;
    }
    return `${base}/distritos?${cargoParam}`;
  });
  useEffect(() => {
    if (distritosSwr?.features?.length > 0) setDistritosCity(distritosSwr);
    else if (!ibgeSelecionado || !modoBairros) setDistritosCity(null);
  }, [distritosSwr, ibgeSelecionado, modoBairros]);

  // ── Fetch: Setores censitarios (granularidade fina - so quando modoSetores ativo) ──
  const { data: setoresSwr } = useMapaUrlSwr(() => {
    if (!ibgeSelecionado || !modoSetores) return null;

    // PRIORIDADE: cargo/ano do candidato filtrado (ex: Tarcisio GOVERNADOR 2022)
    const cand = candidatosSel.length === 1 ? candidatosSel[0] : null;
    let cargoFinal: string;
    let anoFinal: number;
    if (cand?.cargo && cand?.ano) {
      cargoFinal = cand.cargo;
      anoFinal = cand.ano;
    } else {
      cargoFinal = (!cargoMapa || cargoMapa === "VIGENTES") ? "VEREADOR" : cargoMapa;
      anoFinal = (!cargoMapa || cargoMapa === "VIGENTES") ? 2024 : anoMapa;
    }

    const base = `/mapa/municipio/${ibgeSelecionado}`;
    const params = new URLSearchParams({ cargo: cargoFinal, ano: String(anoFinal), turno: String(turnoMapa) });
    if (candidatosSel.length === 1) params.set("candidato_id", String(candidatosSel[0].id));
    else if (partidosSel.length === 1) params.set("partido", String(partidosSel[0].id));
    if (bairroSelecionado?.nome) {
      return `${base}/distrito/${encodeURIComponent(bairroSelecionado.nome)}/setores?${params.toString()}`;
    }
    return `${base}/setores?${params.toString()}`;
  });

  useEffect(() => {
    if (setoresSwr?.features?.length > 0) setSetoresCity(setoresSwr);
    else if (!modoSetores) setSetoresCity(null);
  }, [setoresSwr, modoSetores]);

  // ── Fetch: Micro-regioes OSM (bairros populares: Jardim Iris, Taipas, etc) ──
  // Cascata distrito -> microzona (OSM) com filtros sincronizados.
  // Backend agrega votos dos setores -> locais -> zonas, retorna nivel_farol
  // por microzona. Frontend usa nivel_farol pra aplicar mesma escala 5-0
  // dos distritos (gradiente da forca do filtro ativo).
  const { data: microRegioesSwr } = useMapaUrlSwr(() => {
    if (!ibgeSelecionado || !modoMicroRegioes) return null;
    const params = new URLSearchParams();
    if (bairroSelecionado?.cd) params.set("dentro_de_distrito", bairroSelecionado.cd);

    // Mesmo padrao dos distritos oficiais (linha ~1033 deste arquivo):
    // quando o usuario nao escolheu cargo especifico (VIGENTES), usar
    // VEREADOR/2024 como default - cargo mais granular com dados reais.
    // Sem isso a microzona fica cinza porque o backend nao sabe o que agregar.
    const cand = candidatosSel.length === 1 ? candidatosSel[0] : null;
    let cargoFinal: string;
    let anoFinal: number;
    if (cand?.cargo && cand?.ano) {
      cargoFinal = cand.cargo;
      anoFinal = cand.ano;
    } else {
      cargoFinal = (!cargoMapa || cargoMapa === "VIGENTES") ? "VEREADOR" : cargoMapa;
      anoFinal = (!cargoMapa || cargoMapa === "VIGENTES") ? 2024 : anoMapa;
    }
    params.set("cargo", cargoFinal);
    params.set("ano", String(anoFinal));
    params.set("turno", String(turnoMapa ?? 1));
    if (cand) params.set("candidato_id", String(cand.id));
    else if (partidosSel.length === 1) params.set("partido", String(partidosSel[0].id));

    return `/mapa/municipio/${ibgeSelecionado}/microregioes?${params.toString()}`;
  });
  useEffect(() => {
    if (Array.isArray(microRegioesSwr)) setMicroRegioes(microRegioesSwr);
    else if (!modoMicroRegioes) setMicroRegioes([]);
  }, [microRegioesSwr, modoMicroRegioes]);

  // Bordas dissolvidas (uma linha por fronteira compartilhada — anti-duplicacao)
  const { data: microRegioesBordasSwr } = useMapaUrlSwr(() => {
    if (!ibgeSelecionado || !modoMicroRegioes) return null;
    const params = new URLSearchParams();
    if (bairroSelecionado?.cd) params.set("distrito", bairroSelecionado.cd);
    return `/mapa/municipio/${ibgeSelecionado}/microregioes_bordas?${params.toString()}`;
  });

  // ── Fetch: Escola pins (locais de votacao) - migrado para SWR ────────────
  const { data: locaisSwr } = useMapaUrlSwr(() => {
    if (!ibgeSelecionado || !modoLocais) return null;
    const cand = candidatosSel.length === 1 ? candidatosSel[0] : null;
    const part = partidosSel.length === 1 ? partidosSel[0] : null;

    const cargoEfetivoBruto = (cargoMapa === "VIGENTES" && cand?.cargo) ? cand.cargo! : (cargoMapa ?? "VEREADOR");
    const cargoEfetivo = cargoEfetivoBruto === "VIGENTES" ? "VEREADOR" : cargoEfetivoBruto;
    const anoEfetivo   = (cargoMapa === "VIGENTES" && cand?.ano) ? cand.ano! : (cargoEfetivoBruto === "VIGENTES" ? 2024 : anoMapa);

    const params = new URLSearchParams({
      cargo: cargoEfetivo,
      ano:   String(anoEfetivo),
      turno: String(turnoMapa),
    });
    if (cand)      params.set("candidato_id", String(cand.id));
    else if (part) params.set("partido", String(part.id));
    return `/mapa/municipio/${ibgeSelecionado}/locais?${params.toString()}`;
  });
  useEffect(() => {
    if (locaisSwr?.features?.length > 0) setLocaisVotacao(locaisSwr);
    else if (!ibgeSelecionado || !modoLocais) setLocaisVotacao(null);
  }, [locaisSwr, ibgeSelecionado, modoLocais]);

  // ── Fetch: GeoJSON de coordenadores — migrado para SWR ───────────────────
  const { data: coordSwr } = useMapaUrlSwr(() =>
    ufSelecionada ? `/coordenadores/geojson/${ufSelecionada}` : null
  );
  useEffect(() => {
    if (coordSwr?.type === "FeatureCollection") setGeojsonCoord(coordSwr);
    else if (!ufSelecionada) setGeojsonCoord(null);
  }, [coordSwr, ufSelecionada]);

  // ── Fetch: GeoJSON de estado (migrado para SWR — Fase 5 nível 3) ─────────
  // Lê filters.anoComparacao do store: quando definido (Fase 6 - comparação
  // temporal), troca o endpoint normal por /comparacao com 2 anos.
  const anoComparacao = useMapaStore((s) => s.filters.anoComparacao);

  const { data: geojsonUfSwr, isLoading: ufLoading } = useMapaUrlSwr(() => {
    if (!ufSelecionada) return null;
    if (!cargoMapa && nivel === "estado") return null;

    // Comparação temporal explícita (Fase 6): usa endpoint dedicado
    if (anoComparacao && cargoMapa && cargoMapa !== "VIGENTES") {
      const partidoParam = partidosSel.length === 1 ? `&partido=${partidosSel[0].id}` : "";
      return `/mapa/geojson/${ufSelecionada}/comparacao-temporal?cargo=${encodeURIComponent(cargoMapa)}&ano=${anoMapa}&ano_anterior=${anoComparacao}${partidoParam}`;
    }

    if (cargoMapa === "VIGENTES" && candidatosSel.length === 1 && candidatosSel[0].cargo) {
      const cand = candidatosSel[0];
      return `/mapa/geojson/${ufSelecionada}?modo=${modoMapa}&cargo=${encodeURIComponent(cand.cargo!)}&ano=${cand.ano ?? 2022}&candidato_id=${cand.id}`;
    }
    if (cargoMapa === "VIGENTES" || !cargoMapa) {
      const partidoParam = partidosSel.length === 1 ? `&partido=${partidosSel[0].id}` : "";
      return `/mapa/geojson/${ufSelecionada}?modo=${modoMapa}&cargo=VIGENTES${partidoParam}`;
    }
    if (candidatosSel.length >= 2) {
      const ids = candidatosSel.map(s => s.id).join(",");
      return `/mapa/geojson/${ufSelecionada}/comparacao?candidatos=${ids}&cargo=${encodeURIComponent(cargoMapa)}&ano=${anoMapa}`;
    }
    if (partidosSel.length >= 2) {
      const nums = partidosSel.map(s => s.id).join(",");
      return `/mapa/geojson/${ufSelecionada}/comparacao-partidos?partidos=${nums}&cargo=${encodeURIComponent(cargoMapa)}&ano=${anoMapa}&turno=${turnoMapa}&modo=${modoMapa}`;
    }
    const partidoParam   = partidosSel.length === 1 ? `&partido=${partidosSel[0].id}` : "";
    const candidatoParam = candidatosSel.length === 1 ? `&candidato_id=${candidatosSel[0].id}` : "";
    const turnoParam2    = turnoMapa === 2 ? "&turno=2" : "";
    return `/mapa/geojson/${ufSelecionada}?modo=${modoMapa}&cargo=${encodeURIComponent(cargoMapa)}&ano=${anoMapa}${partidoParam}${candidatoParam}${turnoParam2}`;
  });

  // Loading state derivado do SWR
  useEffect(() => { setCarregando(ufLoading); }, [ufLoading]);

  // Limpa geojson quando UF é desfocada (sem fetch ativo)
  useEffect(() => {
    if (!ufSelecionada) { setGeojson(null); municipioBounds.current = {}; }
    // Cesar 20/04 (bug mapa cinza): ao mudar de UF, invalida bounds antigos.
    // Sem isso o fitBounds animava pra regiao errada (SWR keepPreviousData).
    if (estadoBoundsUfRef.current !== ufSelecionada) {
      estadoBoundsRef.current = null;
      estadoBoundsUfRef.current = null;
    }
  }, [ufSelecionada]);

  // Sync data → setGeojson + cálculo de bounds. O fitBounds fica em outro
  // effect pra disparar SO quando o usuario muda de UF (nao quando so os
  // dados filtram por candidato/partido/cargo/ano). Antes, qualquer refetch
  // do geojsonUfSwr resetava o zoom mesmo quando o user estava dentro de
  // um municipio zoomed, virando "bug de reset visto em 19/04".
  useEffect(() => {
    const data = geojsonUfSwr;
    if (!data || data.type !== "FeatureCollection") return;
    // Cesar 20/04: sem UF ativa ignoramos o data (keepPreviousData pode trazer
    // o geojson da UF anterior enquanto estamos em brasil, piscando o mapa).
    if (!ufSelecionada) return;
    setGeojson(data);
    if (!data.features?.length) return;

    const idx: Record<string, [[number, number], [number, number]]> = {};
    let s1 = Infinity, s2 = -Infinity, s3 = Infinity, s4 = -Infinity;
    for (const f of data.features) {
      if (!f.geometry) continue;
      let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const poly of (polys as any[])) for (const coord of ((poly as any)[0] as number[][])) {
        const [lng, lat] = coord;
        if (lng < a) a = lng; if (lng > b) b = lng;
        if (lat < c) c = lat; if (lat > d) d = lat;
      }
      const ibge = f.properties?.codigo_ibge;
      if (ibge) idx[ibge] = [[a, c], [b, d]];
      if (a < s1) s1 = a; if (b > s2) s2 = b;
      if (c < s3) s3 = c; if (d > s4) s4 = d;
    }
    municipioBounds.current = idx;
    estadoBoundsRef.current = [[s1, s3], [s2, s4]];
    estadoBoundsUfRef.current = ufSelecionada;
  }, [geojsonUfSwr, ufSelecionada]);

  // FitBounds do estado SO quando user muda de UF e esta em nivel estado.
  // Guards:
  //  - nao anima dentro de municipio (preserva zoom do drill-down)
  //  - marca ultimaUfRef APOS o fit efetivo, nao antes: senao, se bounds
  //    ainda nao foi calculado (fetch em curso), perde a chance de animar
  //    quando bounds chegarem.
  const ultimaUfAnimadaRef = useRef<string | null>(null);
  useEffect(() => {
    if (!ufSelecionada) { ultimaUfAnimadaRef.current = null; return; }
    if (nivel !== "estado") return;
    if (ultimaUfAnimadaRef.current === ufSelecionada) return;
    const bounds = estadoBoundsRef.current;
    if (!bounds || !mapRef.current) return;  // bounds ainda nao calculado - espera
    // Cesar 20/04 (bug mapa cinza): so anima se bounds correspondem a UF atual.
    if (estadoBoundsUfRef.current !== ufSelecionada) return;
    mapRef.current.getMap().fitBounds(bounds, { padding: 40, duration: 800 });
    ultimaUfAnimadaRef.current = ufSelecionada;
  }, [ufSelecionada, nivel, geojsonUfSwr]);

  // ── Navegação ─────────────────────────────────────────────────────────────
  const resetCity = () => {
    setMostrarVereadores(false);
    setModoBairros(false);
    setVereadorSelecionado(null);
    setDistritosCity(null);
    setSetoresCity(null);
    setModoSetores(false);
    setMicroRegioes([]);
    setModoMicroRegioes(false);
    setLocaisVotacao(null);
    setModoLocais(false);
    setBairroSelecionado(null); setMicroRegiaoSelecionada(null);
    setEscolaSelecionadaId(null);
    // P0-2 fix: limpar nome do municipio tambem. Senao breadcrumb mostra
    // cidade antiga quando user navega via busca entre estados.
    setNomeMunicipioSelecionado("");
  };

  const irParaEstado = useCallback((uf: string) => {
    setUfSelecionada(uf.toUpperCase());
    setIbgeSelecionado(null);
    setIbgePreview(null);
    // P1-1 fix: manter o filtro de partido no drill-down (entrar num estado
    // NAO reseta mais). Antes o `setSelecionados([])` apagava o filtro, o QA
    // relatou como bug em 19/04 — usuario espera persistencia ate limpar.
    resetCity();
    setNivel("estado");
  }, []);

  const voltarParaBrasil = useCallback(() => {
    setUfSelecionada(null);
    setIbgeSelecionado(null);
    setIbgePreview(null);
    setGeojson(null);
    setGeojsonCoord(null);
    // Cesar 20/04/2026: voltar step-a-step preserva filtro (partido/candidato).
    // Antes limpava selecionados junto - usuario perdia o contexto. Agora:
    // estado -> voltar vai pra Brasil PRESERVANDO filtro.
    // Brasil + filtro -> voltar limpa filtro (via voltarUmNivel, nao aqui).
    // Brasil puro -> voltar desabilitado (tela inicial).
    resetCity();
    setNivel("brasil");
    setGranularidadeBrasil("municipios");
    mapRef.current?.getMap().easeTo({ center: BRASIL_VIEW.center, zoom: BRASIL_VIEW.zoom, duration: 800 });
  }, []);

  const voltarParaEstado = useCallback(() => {
    setIbgeSelecionado(null);
    resetCity();
    setNivel("estado");
    if (estadoBoundsRef.current && mapRef.current) {
      mapRef.current.getMap().fitBounds(estadoBoundsRef.current, { padding: 40, duration: 800 });
    }
  }, []);

  // Reset total (botao "Voltar ao inicio" na sidebar). Combina:
  //   - voltarParaBrasil (limpa geografia local, selecionados, zoom)
  //   - reset do store (limpa filtros cargo/ano/turno/modo/tab/viewMode/anoComparacao)
  // Regra em feedback_mapa_botao_voltar.md (Cesar 20/04).
  const resetTotalStore = useMapaStore((s) => s.reset);
  const resetTotalMapa = useCallback(() => {
    setUfSelecionada(null);
    setIbgeSelecionado(null);
    setIbgePreview(null);
    setGeojson(null);
    setGeojsonCoord(null);
    setSelecionados([]);
    resetCity();
    setNivel("brasil");
    setGranularidadeBrasil("municipios");
    resetTotalStore();
    mapRef.current?.getMap().easeTo({ center: BRASIL_VIEW.center, zoom: BRASIL_VIEW.zoom, duration: 800 });
  }, [resetTotalStore]);

  // voltarUmNivel + podeVoltar + rotuloVoltar + useEffect ESC: movidos pra
  // depois da declaracao de `modoCity` (temporal dead zone).

  // ── Clique: Brasil → Estado → Município (sempre zoom + bairros) ──────────
  // ── Handlers do editor de polygon (drag de vertex) ──────────────────────
  const handleMouseDownEditor = useCallback((e: any) => {
    if (!modoEdicao) return;
    const f = e.features?.[0];
    if (!f) return;
    // QUALQUER click numa feature do editor bloqueia o pan do mapa pra
    // garantir que o click seja processado (senao o mapa pana e cancela
    // o onClick, bug reportado pelo Cesar em adicionar).
    e.preventDefault();

    // FERRAMENTA REMOVER: click em vertex remove na hora (sem dbl-click)
    if (ferramentaEditor === "remover" && f.layer?.id === "editor-vertex") {
      const props = f.properties ?? {};
      const ringIdx = Number(props.ringIdx);
      const vertIdx = Number(props.vertIdx);
      pushHistorico();
      setModoEdicao(prev => {
        if (!prev) return prev;
        const ring = prev.rings[ringIdx];
        const pts = ring.slice(0, -1);
        // Ao chegar no limite minimo, dispara DELETE da microzona inteira
        // (setores vao pra vizinha). Comportamento intencional pra permitir
        // apagar microzonas-agulha com varios cliques no Remover.
        if (pts.length <= 3) {
          apagarMicrozona();
          return prev;
        }
        const novoPts = pts.filter((_, i) => i !== vertIdx);
        const newRings = prev.rings.map((r, ri) =>
          ri === ringIdx ? [...novoPts, novoPts[0]] : r
        );
        return { ...prev, rings: newRings };
      });
      return;
    }
    // FERRAMENTA MOVER (default): arrasta vertex existente
    if (ferramentaEditor === "mover" && f.layer?.id === "editor-vertex") {
      const props = f.properties ?? {};
      setVertexDrag({
        ringIdx: Number(props.ringIdx),
        vertIdx: Number(props.vertIdx),
      });
      if (mapRef.current) {
        mapRef.current.getMap().dragPan.disable();
      }
      return;
    }
    // FERRAMENTA ADICIONAR: inserir direto no mousedown E no onClick, pra
    // cobrir caso de qualquer drag minusculo bloquear o click (fire-once
    // guard via hasAddedRef evita dupla insercao).
    if (ferramentaEditor === "adicionar" &&
        (f.layer?.id === "editor-midpoint" || f.layer?.id === "editor-midpoint-hit")) {
      const props = f.properties ?? {};
      const ringIdx = Number(props.ringIdx);
      const vertIdx = Number(props.vertIdx);
      const { lng, lat } = e.lngLat;
      console.log("[editor] adicionar vertex:", { ringIdx, vertIdx, lng, lat });
      setHistoricoEdicao(h => [...h, modoEdicao ? JSON.parse(JSON.stringify(modoEdicao.rings)) : []]);
      setModoEdicao(prev => {
        if (!prev) return prev;
        const newRings = prev.rings.map((ring, ri) => {
          if (ri !== ringIdx) return ring;
          const pts = ring.slice(0, -1);
          pts.splice(vertIdx + 1, 0, [lng, lat]);
          return [...pts, pts[0]];
        });
        return { ...prev, rings: newRings };
      });
    }
  }, [modoEdicao, ferramentaEditor, apagarMicrozona]);

  const handleMouseMoveEditor = useCallback((e: any) => {
    if (!modoEdicao || !vertexDrag) return;
    const { lng, lat } = e.lngLat;
    setModoEdicao(prev => {
      if (!prev) return prev;
      const newRings = prev.rings.map((ring, ri) => {
        if (ri !== vertexDrag.ringIdx) return ring;
        // Ring tem o vertex+1 no final (fechamento do polygon). Se for o
        // primeiro ou ultimo vertex fisico, atualiza os 2 pra manter fechado.
        const out = ring.map((coord, vi) => {
          if (vi === vertexDrag.vertIdx) return [lng, lat];
          if (vertexDrag.vertIdx === 0 && vi === ring.length - 1) return [lng, lat];
          return coord;
        });
        return out;
      });
      return { ...prev, rings: newRings };
    });
  }, [modoEdicao, vertexDrag]);

  const handleMouseUpEditor = useCallback(() => {
    if (!modoEdicao) return;
    setVertexDrag(null);
    if (mapRef.current) {
      mapRef.current.getMap().dragPan.enable();
    }
  }, [modoEdicao]);

  // handleClickMidpoint: NAO inserir aqui, ja inserimos no onMouseDown.
  // Mantido como no-op pra evitar dupla insercao se onClick disparar tambem.
  const handleClickMidpoint = useCallback((_e: any) => {
    // noop - insercao agora eh feita em handleMouseDownEditor
    return false;
  }, []);

  // REMOVER vertex: double-click num vertex existente. Nao permite remover
  // se ficar com <3 vertices (polygon precisa de no minimo 3).
  const handleDblClickEditor = useCallback((e: any) => {
    if (!modoEdicao) return;
    const f = e.features?.[0];
    if (!f || f.layer?.id !== "editor-vertex") return;
    e.preventDefault();
    const props = f.properties ?? {};
    const ringIdx = Number(props.ringIdx);
    const vertIdx = Number(props.vertIdx);
    setModoEdicao(prev => {
      if (!prev) return prev;
      const ring = prev.rings[ringIdx];
      if (!ring) return prev;
      const pts = ring.slice(0, -1);
      if (pts.length <= 3) {
        // No limite minimo: apaga a microzona inteira.
        apagarMicrozona();
        return prev;
      }
      const novoPts = pts.filter((_, i) => i !== vertIdx);
      const newRings = prev.rings.map((r, ri) =>
        ri === ringIdx ? [...novoPts, novoPts[0]] : r
      );
      return { ...prev, rings: newRings };
    });
  }, [modoEdicao]);

  // Desabilita o double-click-zoom do MapLibre durante modo edicao.
  // Tambem desabilita dragPan nas ferramentas "adicionar" e "remover"
  // pra garantir que click puro seja detectado (pan acidental cancela click).
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    if (modoEdicao) {
      map.doubleClickZoom.disable();
      if (ferramentaEditor === "adicionar" || ferramentaEditor === "remover") {
        map.dragPan.disable();
      } else {
        // ferramenta "mover": dragPan so eh desabilitado quando vertex em drag
        if (!vertexDrag) map.dragPan.enable();
      }
    } else {
      map.doubleClickZoom.enable();
      map.dragPan.enable();
    }
  }, [modoEdicao, ferramentaEditor, vertexDrag]);

  const handleClick = useCallback((e: any) => {
    // Quando em modo edicao: click em midpoint adiciona vertex, senao ignora
    // (sempre bloqueia click de selecao de microzona).
    if (modoEdicao) {
      handleClickMidpoint(e);
      return;
    }
    const f = e.features?.[0];
    if (!f) return;

    if (nivel === "brasil") {
      const uf = f.properties?.estado_uf;
      if (!uf) return;
      irParaEstado(uf);
    } else if (nivel === "estado") {
      const ibge = f.properties?.codigo_ibge;
      const nome = f.properties?.nome ?? "";
      if (!ibge) return;

      // Comparação (2+ candidatos/partidos): modal de dominância
      if (modoComparacao) {
        setDominanciaIbge(ibge);
        return;
      }

      // Fase 4 (Globo-like): 1 click = preview (zoom leve + highlight).
      // 2 cliques na mesma cidade = drill (entra no município, mostra bairros).
      const doubleClick = ultimoClickIbgeRef.current === ibge && clickTimer.current !== null;
      if (doubleClick) {
        if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
        ultimoClickIbgeRef.current = null;
        setIbgePreview(null);
        setIbgeSelecionado(ibge);
        setNomeMunicipioSelecionado(nome);
        setModoBairros(true);
        setModoLocais(false);
        setLocaisVotacao(null);
        setMostrarVereadores(cargoMapa === "VEREADOR");
        setVereadorSelecionado(null);
        setNivel("municipio");
        const bounds = municipioBounds.current[ibge];
        if (bounds && mapRef.current) {
          mapRef.current.getMap().fitBounds(bounds, { padding: 60, duration: 900 });
        }
      } else {
        // Single-click: só preview (highlight + zoom suave, sem drill).
        if (clickTimer.current) clearTimeout(clickTimer.current);
        ultimoClickIbgeRef.current = ibge;
        setIbgePreview(ibge);
        clickTimer.current = setTimeout(() => {
          clickTimer.current = null;
          ultimoClickIbgeRef.current = null;
        }, 350);
        const bounds = municipioBounds.current[ibge];
        if (bounds && mapRef.current) {
          mapRef.current.getMap().fitBounds(bounds, { padding: 140, duration: 600, maxZoom: 10 });
        }
      }
    } else if (nivel === "municipio" && modoLocais && f.layer?.id === "locais-circle") {
      // M9 — Clique numa ESCOLA (pin) abre o PainelEscola
      const localId = f.properties?.id;
      if (localId) setEscolaSelecionadaId(Number(localId));
      return;
    } else if (nivel === "municipio" && modoMicroRegioes && !modoLocais &&
               (f.layer?.id === "microregioes-fill" || f.layer?.id === "microregioes-circle")) {
      // Cascata aprimorada: 1o clique = seleciona microzona (sidebar);
      // 2o clique na mesma = aprofunda em pontos de votacao.
      const f2 = e.features?.[0];
      if (!f2) return;
      const props = f2.properties ?? {};
      const idMR = Number(props.id);
      const jaSelecionada = microRegiaoSelecionada?.id === idMR;
      if (jaSelecionada) {
        setModoLocais(true);
      } else {
        setMicroRegiaoSelecionada({
          id: idMR,
          nome: String(props.nome ?? ""),
          tipo: String(props.tipo ?? ""),
          votos: Number(props.votos ?? 0),
          nivel_farol: Number(props.nivel_farol ?? 0),
          tipo_cobertura: props.tipo_cobertura ?? null,
          n_escolas_cobertura: props.n_escolas_cobertura != null
            ? Number(props.n_escolas_cobertura) : null,
        });
      }
      if (f2.geometry && mapRef.current) {
        const coords: number[][] =
          f2.geometry.type === "Polygon"       ? f2.geometry.coordinates[0] :
          f2.geometry.type === "MultiPolygon"  ? f2.geometry.coordinates.flat(2) :
          f2.geometry.type === "Point"         ? [(f2.geometry as any).coordinates] :
          [];
        if (coords.length) {
          const lngs = coords.map((c: number[]) => c[0]);
          const lats = coords.map((c: number[]) => c[1]);
          mapRef.current.getMap().fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 60, duration: 700, maxZoom: 15 }
          );
        }
      }
    } else if (nivel === "municipio" && modoBairros && !modoLocais && !modoMicroRegioes) {
      // Ponto 4 (cascata): clique num DISTRITO. Fase 9: microzonas só nos 3
      // distritos calibrados (Brasilândia, Pirituba, Freguesia do Ó). Nos demais,
      // cascata para no bairro (mostra locais de votação direto).
      const f2 = e.features?.[0];
      if (!f2) return;
      const cdDist = f2.properties?.cd_dist ?? f2.properties?.codigo_setor ?? "";
      const nmDist = f2.properties?.nm_dist ?? f2.properties?.nome ?? "Bairro";
      setBairroSelecionado({ cd: String(cdDist), nome: nmDist });
      const DISTRITOS_COM_MICROZONAS = new Set(["355030811", "355030863", "355030829"]);
      if (DISTRITOS_COM_MICROZONAS.has(String(cdDist))) {
        setModoMicroRegioes(true);
      } else {
        setModoLocais(true);
      }
      // Zoom no distrito clicado via bbox do feature
      if (f2.geometry && mapRef.current) {
        const coords: number[][] =
          f2.geometry.type === "Polygon"       ? f2.geometry.coordinates[0] :
          f2.geometry.type === "MultiPolygon"  ? f2.geometry.coordinates.flat(2) :
          [];
        if (coords.length) {
          const lngs = coords.map((c: number[]) => c[0]);
          const lats = coords.map((c: number[]) => c[1]);
          mapRef.current.getMap().fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 80, duration: 800 }
          );
        }
      }
    }
  }, [nivel, irParaEstado, cargoMapa, modoComparacao, modoBairros, modoLocais, modoMicroRegioes, modoEdicao, handleClickMidpoint]);

  // ── Hover debounce (Globo-like 300ms): popup no mapa imediato, store com delay ──
  // Ao deixar a feature: popup some, store mantém último (sidebar "congelada").
  const hoverDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agendarHoverStore = useCallback((payload: any, ibgeDaFeature: string | null) => {
    if (hoverDebounceRef.current) clearTimeout(hoverDebounceRef.current);
    hoverDebounceRef.current = setTimeout(() => {
      useMapaStore.getState().setHover(payload);
      // Só dispara fetch /top2 quando o hover estabilizou numa cidade.
      if (ibgeDaFeature) setIbgeHover(ibgeDaFeature);
    }, 300);
  }, []);

  // ── Hover rico com contexto por layer ────────────────────────────────────
  const handleMouseMove = useCallback((e: any) => {
    // Se esta em modo edicao arrastando vertex, delega pro handler do editor
    if (modoEdicao && vertexDrag) {
      handleMouseMoveEditor(e);
      return;
    }
    const f = e.features?.[0];
    if (!f) {
      // Popup some imediato; store NÃO é limpo (mantém último hover na sidebar).
      setHover(null);
      if (hoverDebounceRef.current) { clearTimeout(hoverDebounceRef.current); hoverDebounceRef.current = null; }
      return;
    }
    const p = f.properties;
    const { x, y } = e.point;
    let info: HoverInfo = { x, y, nome: "" };

    if (f.layer?.id === "coord-fill") {
      info = {
        x, y,
        nome:  p?.coord_nome ?? "Sem coordenador",
        extra: p?.coord_nome ? `Coordenador · ${p.nome}` : `Município sem coordenador`,
        hint:  p?.coord_nome ? undefined : "Atribua via módulo Coordenadores",
      };
    } else if (f.layer?.id === "distritos-fill") {
      const farolLabel: Record<string, string> = {
        AZUL: "Muito forte", VERDE: "Forte", AMARELO: "Fraco", SEM_DADOS: "Ausente",
      };
      info = {
        x, y,
        nome:   p?.nm_dist ?? "Bairro",
        status: p?.farol,
        extra:  p?.votos != null ? `${fmt(p.votos)} votos · ${farolLabel[p?.farol] ?? ""}` : undefined,
        hint:   "Clique para ver locais de votação",
      };
    } else if (f.layer?.id === "locais-circle") {
      info = {
        x, y,
        nome:  p?.nome ?? "Local de votação",
        extra: [
          `Zona ${p?.nr_zona}`,
          p?.bairro ? p.bairro : null,
          p?.votos_zona != null ? `${fmt(p.votos_zona)} votos` : null,
        ].filter(Boolean).join(" · "),
        hint: p?.endereco ?? undefined,
      };
    } else if (nivel === "brasil") {
      const cargoLabel = CARGOS_MAPA.find(c => c.cargo === cargoMapa)?.label ?? cargoMapa ?? "";
      const isGranEstados = granularidadeBrasil === "estados";
      const nomeMapa = isGranEstados
        ? (NOME_ESTADO[p?.estado_uf] ?? p?.estado_uf ?? "")
        : (p?.nome ?? "");
      // Estados usam total_votos/total_eleitos; municípios usam votos/eleitos
      const votosHover   = isGranEstados ? (p?.total_votos   ?? 0) : (p?.votos   ?? 0);
      const eleitosHover = isGranEstados ? (p?.total_eleitos ?? 0) : (p?.eleitos  ?? 0);
      const extraParts: string[] = [];
      if (!isGranEstados && p?.estado_uf) extraParts.push(NOME_ESTADO[p.estado_uf] ?? p.estado_uf);
      if (partidoNumero === null && p?.partido_sigla) extraParts.push(`Dom: ${p.partido_sigla}`);
      if (partidoNumero !== null && p?.status_farol && p.status_farol !== "VERMELHO") extraParts.push(`${fmt(votosHover)} votos`);
      if (eleitosHover > 0) extraParts.push(`${eleitosHover} eleito${eleitosHover > 1 ? "s" : ""}`);
      info = {
        x, y,
        nome:   nomeMapa,
        status: partidoNumero !== null ? p?.status_farol : undefined,
        extra:  extraParts.join(" · "),
        hint:   cargoLabel ? `${cargoLabel} ${anoMapa} · Clique para entrar no estado` : "Clique para entrar no estado",
      };
    } else {
      // Município - pode estar em modo comparação
      const cargoLabel = CARGOS_MAPA.find(c => c.cargo === cargoMapa)?.label ?? cargoMapa ?? "";

      if (modoComparacao && candidatosSelRef.current.length >= 2) {
        const domId = p?.candidato_dominante_id;
        const domSel = candidatosSelRef.current.find(s => s.id === domId);
        info = {
          x, y,
          nome:  p?.nome ?? "",
          extra: domSel
            ? `Lidera: ${domSel.nome} · ${fmt(p?.votos_dominante)} votos`
            : `Sem presença dos candidatos selecionados`,
          hint:  "Clique para ver ranking completo",
        };
      } else if (modoComparacao && partidosSelRef.current.length >= 2) {
        const domNum = p?.partido_dominante_num;
        const domSel = partidosSelRef.current.find(s => s.id === domNum);
        info = {
          x, y,
          nome:  p?.nome ?? "",
          extra: domSel
            ? `Domina: ${domSel.nome}`
            : `Nenhum dos partidos tem presença aqui`,
          hint:  "Clique para ver análise regional",
        };
      } else {
        const varPct = p?.variacao_pct;
        const varStr = varPct != null
          ? ` · ${varPct > 0 ? "+" : ""}${Number(varPct).toFixed(1)}%`
          : "";
        const extraParts = [`${cargoLabel} ${anoMapa}`];
        if (p?.eleitos > 0) extraParts.push(`${p.eleitos} eleito${p.eleitos > 1 ? "s" : ""}`);
        if (p?.votos > 0)   extraParts.push(`${fmt(p.votos)} votos${varStr}`);
        const hintText = candidatoFiltroId
          ? "Clique para ver quem domina esta região"
          : cargoMapa === "VEREADOR"
            ? "Clique para resumo · Duplo clique para bairros e vereadores"
            : cargoMapa
              ? "Clique para resumo · Duplo clique para entrar no município"
              : "Selecione um cargo para ver dados · Clique para resumo";
        info = {
          x, y,
          nome:   p?.nome ?? "",
          status: p?.status_farol,
          extra:  extraParts.join(" · "),
          hint:   hintText,
        };
      }
    }
    setHover(info);
    // Sidebar (Globo-like): update só após 300ms de hover estável.
    // Se a feature tem codigo_ibge (município), passa pra disparar fetch /top2 rico.
    const ibgeFeat = typeof p?.codigo_ibge === "string" ? p.codigo_ibge : null;
    agendarHoverStore({ ...info, properties: p }, ibgeFeat);
  // candidatosSel/partidosSel lidos via ref → callback estável, sem loop infinito
  }, [nivel, granularidadeBrasil, modoMapa, cargoMapa, anoMapa, candidatoFiltroId, modoComparacao, partidoNumero, modoEdicao, vertexDrag, handleMouseMoveEditor, agendarHoverStore]);

  // ── Expressões de cor ──────────────────────────────────────────────────────
  const COR_FAROL_EXPRESSAO = [
    "match", ["get", "farol"],
    "AZUL",    CORES_FAROL.AZUL,
    "VERDE",   CORES_FAROL.VERDE,
    "AMARELO", CORES_FAROL.AMARELO,
    CORES_FAROL.VERMELHO,
  ];

  // Expressão de cor por partido dominante (quando nenhum partido selecionado)
  const COR_PARTIDO_EXPRESSAO: any = partidoNumero === null && partidosSel.length === 0
    ? [
        "match", ["get", "partido_num"],
        ...Object.entries(CORES_PARTIDOS).flatMap(([num, cor]) => [Number(num), cor]),
        "#9CA3AF",
      ]
    : null;

  // ── Escala 0-5 unificada baseada em nivel_farol (percentil do backend) ───
  // Nivel 0 usa `corOp` (cor oposta do filtro) para chamar atencao nos
  // outliers sem voto — regra do Cesar.
  function buildEscalaNivelFarol(cor: string, corOp: string): any {
    return [
      "match", ["coalesce", ["get", "nivel_farol"], 0],
      0, corOp,
      1, corFarolNivel(cor, 1),
      2, corFarolNivel(cor, 2),
      3, corFarolNivel(cor, 3),
      4, corFarolNivel(cor, 4),
      5, corFarolNivel(cor, 5),
      corOp,
    ];
  }

  // Partido unico selecionado (qualquer cargo incluindo VIGENTES)
  const COR_FILL_PARTIDO_ESCALA: any = (() => {
    if (partidoNumero === null || partidosSel.length !== 1) return null;
    const cor = corPartido(partidosSel[0].id);
    return buildEscalaNivelFarol(cor, corOposta(cor));
  })();

  // VIGENTES com partido: mesma escala (nivel_farol ja vem do backend)
  const COR_FILL_VIGENTES_PARTIDO: any = (() => {
    if (cargoMapa !== "VIGENTES" || partidosSel.length !== 1) return null;
    const cor = corPartido(partidosSel[0].id);
    return buildEscalaNivelFarol(cor, corOposta(cor));
  })();

  // Candidato unico filtrado
  const COR_FILL_CANDIDATO: any = candidatosSel.length === 1
    ? (() => {
        const cor = candidatosSel[0].cor;
        return buildEscalaNivelFarol(cor, "#D1D5DB");
      })()
    : null;

  // ── Modo comparação: gradiente visual por MARGEM DE VITÓRIA ──────────────
  // Backend retorna margem_pct: 0-100 = (dominante - 2o) / total_selecionados.
  // A cor é do vencedor relativo, mas:
  //   margem < 10%  → cinza (empate técnico, NINGUÉM DOMINA)
  //   margem 10-30% → cor do vencedor bem pálida (disputa apertada)
  //   margem 30-60% → cor média (vitória clara mas morna)
  //   margem > 60%  → cor saturada (dominação)
  // Isso responde à ideia "onde ambos são fracos ninguém domina" do Cesar.
  const EMPATE_TECNICO_MARGEM = 10;  // margem < 10% = empate visual

  // Expressão de cor base (quem ganhou). Vira cinza quando margem <10.
  const buildCorComparacao = (attr: string, opts: Array<[number, string]>): any => {
    const matchCase: any[] = ["match", ["get", attr], ...opts.flatMap(([id, cor]) => [id, cor]), "#D1D5DB"];
    return [
      "case",
      ["<", ["coalesce", ["get", "margem_pct"], 0], EMPATE_TECNICO_MARGEM],
      "#D1D5DB",  // empate técnico → cinza neutro
      matchCase,
    ];
  };

  const COR_COMPARACAO_CANDIDATOS: any = candidatosSel.length >= 2
    ? buildCorComparacao("candidato_dominante_id", candidatosSel.map(s => [s.id, s.cor]))
    : null;

  const COR_COMPARACAO_PARTIDOS: any = nivel !== "brasil" && partidosSel.length >= 2
    ? buildCorComparacao("partido_dominante_num", partidosSel.map(s => [s.id, s.cor]))
    : null;

  const COR_COMPARACAO_PARTIDOS_BRASIL: any = nivel === "brasil" && partidosSel.length >= 2
    ? buildCorComparacao("partido_num", partidosSel.map(s => [s.id, s.cor]))
    : null;

  // Opacidade modulada por MARGEM (substitui nivel_farol antigo).
  // Regiões sem margem definida (total=0) ficam bem apagadas.
  const emModoComparacao = candidatosSel.length >= 2 || partidosSel.length >= 2;
  const OPACITY_COMPARACAO: any = emModoComparacao
    ? ["interpolate", ["linear"], ["coalesce", ["get", "margem_pct"], 0],
        0,  0.20,  // sem dados
        10, 0.35,  // empate técnico (já vira cinza mas transparente tb)
        30, 0.55,  // disputa apertada
        60, 0.80,  // vitória clara
        100, 1.00, // dominação total
      ]
    : null;

  // ── Comparação temporal: escala vermelho/cinza/verde por crescimento_percentual ──
  // Quando filters.anoComparacao está ativo (ex: 2024 vs 2020), o backend devolve
  // /comparacao-temporal com `crescimento_percentual` por município. Aqui mapeamos
  // para uma escala diverging: vermelho (queda forte) → cinza (estável) → verde (alta).
  // SÓ aplica no nível estado — o GeoJSON do nível brasil não vem do endpoint
  // /comparacao-temporal e portanto não tem o campo, ficaria tudo cinza.
  const COR_COMPARACAO_TEMPORAL: any = (anoComparacao && nivel === "estado")
    ? [
        "interpolate", ["linear"],
        ["coalesce", ["get", "crescimento_percentual"], 0],
        -50, "#B91C1C", // queda forte
        -20, "#EF4444",
         -5, "#FCA5A5",
          0, "#D1D5DB", // estável (cinza)
          5, "#86EFAC",
         20, "#22C55E",
         50, "#15803D", // alta forte
      ]
    : null;

  // Expressão de cor ativa — prioridade (maior especificidade primeiro):
  const COR_FILL_ATIVO: any =
    COR_COMPARACAO_TEMPORAL ??     // Fase UX: comparação temporal sobrepõe tudo
    COR_COMPARACAO_CANDIDATOS ??
    COR_COMPARACAO_PARTIDOS_BRASIL ??
    COR_COMPARACAO_PARTIDOS ??
    COR_FILL_CANDIDATO ??
    COR_FILL_VIGENTES_PARTIDO ??  // VIGENTES + partido único: usa score_ponderado (escala absoluta)
    COR_FILL_PARTIDO_ESCALA ??    // partido único em modo não-VIGENTES: usa status_farol percentil
    (partidoNumero === null && !COR_PARTIDO_EXPRESSAO ? COR_FILL_EXPRESSAO :
     partidoNumero === null ? COR_PARTIDO_EXPRESSAO :
     COR_FILL_EXPRESSAO);

  const statsAtivos = (() => {
    const fonteBrasil = granularidadeBrasil === "estados" ? geojsonBrasilEstados : geojsonBrasilMun;
    const feats = (nivel === "brasil" ? fonteBrasil : geojson)?.features ?? [];
    if (nivel === "brasil") {
      // Brasil: conta municípios com partido dominante identificado
      if (modoComparacao && partidosSel.length >= 2) {
        const comPresenca = feats.filter((f: any) => partidosSel.some(s => s.id === (f.properties?.partido_num ?? 0))).length;
        return { azuis: comPresenca, verdes: 0, amarelos: 0, vermelhos: feats.length - comPresenca, total: feats.length };
      }
      if (partidoNumero !== null) {
        // Partido único: conta por farol
        return {
          azuis:     feats.filter((f: any) => f.properties.status_farol === "AZUL").length,
          verdes:    feats.filter((f: any) => f.properties.status_farol === "VERDE").length,
          amarelos:  feats.filter((f: any) => f.properties.status_farol === "AMARELO").length,
          vermelhos: feats.filter((f: any) => f.properties.status_farol === "VERMELHO").length,
          total: feats.length,
        };
      }
      // Todos os partidos: conta municípios com eleito identificado
      const comEleitos = feats.filter((f: any) => (f.properties?.eleitos ?? 0) > 0).length;
      return { azuis: comEleitos, verdes: 0, amarelos: 0, vermelhos: feats.length - comEleitos, total: feats.length };
    }
    if (modoComparacao) {
      const comPresenca = feats.filter((f: any) => {
        const id = f.properties?.candidato_dominante_id ?? f.properties?.partido_dominante_num;
        return id != null && id !== -1;
      }).length;
      return { azuis: comPresenca, verdes: 0, amarelos: 0, vermelhos: feats.length - comPresenca, total: feats.length };
    }
    if (candidatoFiltroId != null) {
      return {
        azuis:     feats.filter((f: any) => f.properties.status_farol === "AZUL").length,
        verdes:    feats.filter((f: any) => f.properties.status_farol === "VERDE").length,
        amarelos:  feats.filter((f: any) => f.properties.status_farol === "AMARELO").length,
        vermelhos: feats.filter((f: any) => f.properties.status_farol === "VERMELHO").length,
        total:     feats.filter((f: any) => f.properties.status_farol !== "FORA").length,
      };
    }
    if (partidoNumero === null && partidosSel.length === 0) {
      const comEleitos = feats.filter((f: any) => (f.properties.total_eleitos ?? f.properties.eleitos ?? 0) > 0).length;
      return { azuis: comEleitos, verdes: 0, amarelos: 0, vermelhos: feats.length - comEleitos, total: feats.length };
    }
    return {
      azuis:     feats.filter((f: any) => f.properties.status_farol === "AZUL").length,
      verdes:    feats.filter((f: any) => f.properties.status_farol === "VERDE").length,
      amarelos:  feats.filter((f: any) => f.properties.status_farol === "AMARELO").length,
      vermelhos: feats.filter((f: any) => ["VERMELHO", "SEM_DADOS"].includes(f.properties.status_farol)).length,
      total: feats.length,
    };
  })();

  const modoCity = modoBairros || modoLocais; // bairros OU escola pins
  const painelAberto = ibgeSelecionado !== null;

  // ── Handler "voltar um nivel" + Escape shortcut ─────────────────────────
  // Precisa estar APOS `modoCity` (temporal dead zone). Hierarquia:
  // escolaSelecionada > locaisVotacao > microRegiao > bairro > municipio > estado > brasil
  const voltarUmNivel = useCallback(() => {
    if (escolaSelecionadaId != null) {
      setEscolaSelecionadaId(null);
      return;
    }
    if (modoLocais) {
      setModoLocais(false);
      setLocaisVotacao(null);
      setModoMicroRegioes(false);
      setBairroSelecionado(null);
      setMicroRegiaoSelecionada(null);
      const bounds = ibgeSelecionado ? municipioBounds.current[ibgeSelecionado] : null;
      if (bounds && mapRef.current) {
        mapRef.current.getMap().fitBounds(bounds, { padding: 60, duration: 800 });
      }
      return;
    }
    if (microRegiaoSelecionada) {
      setMicroRegiaoSelecionada(null);
      return;
    }
    if (bairroSelecionado || modoMicroRegioes) {
      setModoMicroRegioes(false);
      setBairroSelecionado(null);
      const bounds = ibgeSelecionado ? municipioBounds.current[ibgeSelecionado] : null;
      if (bounds && mapRef.current) {
        mapRef.current.getMap().fitBounds(bounds, { padding: 60, duration: 800 });
      }
      return;
    }
    if (modoCity || nivel === "municipio") {
      voltarParaEstado();
      return;
    }
    if (nivel === "estado") {
      voltarParaBrasil();
      return;
    }
    // Nivel brasil com filtro: voltar limpa APENAS o filtro (step-by-step).
    // Cesar 20/04: usuario espera desfazer 1 acao por vez, nao reset total.
    // "Voltar ao inicio" completo (limpa tudo) so pela sidebar.
    if (nivel === "brasil" && selecionados.length > 0) {
      setSelecionados([]);
      return;
    }
  }, [
    escolaSelecionadaId, modoLocais, microRegiaoSelecionada, bairroSelecionado,
    modoMicroRegioes, modoCity, nivel, ibgeSelecionado, voltarParaEstado, voltarParaBrasil,
    selecionados.length, setSelecionados,
  ]);

  const podeVoltar = nivel !== "brasil" || escolaSelecionadaId != null || modoLocais
    || microRegiaoSelecionada != null || bairroSelecionado != null
    || selecionados.length > 0;
  const rotuloVoltar = (() => {
    if (escolaSelecionadaId != null) return "Fechar local";
    if (modoLocais) return "Voltar aos bairros";
    if (microRegiaoSelecionada) return "Voltar ao bairro";
    if (bairroSelecionado || modoMicroRegioes) return "Voltar à cidade";
    if (modoCity || nivel === "municipio") return "Voltar ao estado";
    if (nivel === "estado") return "Voltar ao Brasil";
    if (nivel === "brasil" && selecionados.length > 0) return "Limpar filtro";
    return "Voltar";
  })();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      voltarUmNivel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [voltarUmNivel]);
  const dadosBrasil = granularidadeBrasil === "estados" ? geojsonBrasilEstados : geojsonBrasilMun;
  const dadosAtivos = nivel === "brasil" ? dadosBrasil : geojson;
  const layerAtivo  = nivel === "brasil" ? "estados-fill" : "municipios-fill";

  // Array memoizado — evita recriar referência a cada render e disparar loop no onMouseMove
  const interactiveLayerIds = useMemo(() => [
    ...(dadosAtivos && !modoCity ? [layerAtivo] : []),
    ...(nivel === "estado" && mostrarCoordenadores && geojsonCoord && !modoCity ? ["coord-fill"] : []),
    // Distritos clicaveis so quando NAO ha microzona ativa — senao o clique
    // no poligono grande (distrito) seria disparado antes da microzona filha.
    ...(modoCity && !modoLocais && !modoMicroRegioes && distritosCity ? ["distritos-fill"] : []),
    // Ponto 4: microzonas clicaveis (poligonos + pontos fallback)
    ...(modoMicroRegioes && microRegioes.length > 0 && !modoEdicao ? ["microregioes-fill", "microregioes-circle"] : []),
    ...(modoLocais && locaisVotacao && !modoEdicao ? ["locais-circle"] : []),
    // Editor: quais layers sao clicaveis depende da ferramenta ativa.
    // "mover" e "remover": so vertex clicavel.
    // "adicionar": so midpoints clicaveis (evita click acidental em vertex).
    ...(modoEdicao
      ? ferramentaEditor === "adicionar"
        ? ["editor-midpoint-hit", "editor-midpoint"]
        : ["editor-vertex"]
      : []),
  ], [dadosAtivos, modoCity, layerAtivo, nivel, mostrarCoordenadores, geojsonCoord, modoLocais, modoMicroRegioes, distritosCity, microRegioes, locaisVotacao, modoEdicao, ferramentaEditor]);

  // Highlight do município selecionado (drill) ou em preview (Fase 4 single-click).
  const ibgeHighlight = ibgeSelecionado ?? (nivel === "estado" ? ibgePreview : null);
  const municipioHighlightExpr = ibgeHighlight && !modoCity
    ? ["case", ["==", ["get", "codigo_ibge"], ibgeHighlight], 2.5, 0.5] as any
    : 0.5 as any;
  const municipioHighlightColor = ibgeHighlight && !modoCity
    ? ["case", ["==", ["get", "codigo_ibge"], ibgeHighlight], "#F59E0B", "#ffffff"] as any
    : "#ffffff" as any;

  // ── Derivados para a barra de filtros ──────────────────────────────────────
  const cicloAtivo = CARGOS_MAPA.find(c => c.cargo === cargoMapa)?.ciclo ?? 2024;
  const cargosDoCiclo = CARGOS_MAPA.filter(c => c.ciclo === cicloAtivo && c.cargo !== "VIGENTES");

  // Troca de ciclo reseta pro maior cargo do ano (Globo-like):
  // 2024/2020 → PREFEITO, 2022/2018 → PRESIDENTE.
  const handleSwitchCiclo = (novoCiclo: number) => {
    const CARGO_DEFAULT: Record<number, string> = {
      2024: "PREFEITO", 2022: "PRESIDENTE", 2020: "PREFEITO", 2018: "PRESIDENTE",
    };
    const cargoDefault = CARGO_DEFAULT[novoCiclo];
    const cfg = CARGOS_MAPA.find(c => c.ciclo === novoCiclo && c.cargo === cargoDefault)
      ?? CARGOS_MAPA.find(c => c.ciclo === novoCiclo);
    if (cfg) { setCargoMapa(cfg.cargo); setAnoMapa(cfg.ano); setTurnoMapa(1); }
  };

  return (
    <div className="flex flex-col w-full h-full">
      <style>{`.maplibregl-ctrl-bottom-left { margin-bottom: 8px !important; margin-left: 8px !important; }`}</style>

      {/* ── BARRA DE FILTROS ─────────────────────────────────────────────── */}
      {/* Wrappers (MapaEstrategico/Nominata/etc) podem suprimir essa topbar
          via prop esconderTopbar e injetar a própria via overlayTop. */}
      {esconderTopbar ? overlayTop : (<>
      {/* Backdrop para fechar dropdowns */}
      {dropdownAberto && (
        <div className="fixed inset-0 z-40" onClick={() => setDropdownAberto(null)} />
      )}

      <TopbarExpandivel>
      <header className="w-full flex-shrink-0 flex items-center gap-2 px-4 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200 relative z-30" style={{ height: 52 }}>

        {/* Nova navegação (Globo-like): breadcrumb vive na SidebarBreadcrumb da BarraLateral.
            Barra superior = só filtros + busca. Topbar compacta (Cesar 20/04): icones
            lucide + valor atual inline (sem rotulo "Ciclo:"/"Cargo:"/"Partido:"). */}

        {/* ── SELETOR DE MODO (Inteligencia / Campanha / Zona) ───────────────── */}
        <SeletorModo />

        {/* ── DROPDOWN CICLO ────────────────────────────────────────────────── */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setDropdownAberto(v => v === "ciclo" ? null : "ciclo")}
            title="Trocar ciclo eleitoral (Municipal 2024, Federal 2022, Municipal 2020, Federal 2018)"
            className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-all ${
              dropdownAberto === "ciclo"
                ? "bg-brand-50 border-brand-300 text-brand-800"
                : "border-gray-200 bg-white hover:bg-brand-50/50 hover:border-brand-200 text-gray-700"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-bold">
              {cicloAtivo === 2022 ? "Fed. 2022" : cicloAtivo === 2024 ? "Mun. 2024" : cicloAtivo === 2020 ? "Mun. 2020" : `Fed. ${cicloAtivo}`}
            </span>
            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${dropdownAberto === "ciclo" ? "rotate-180" : ""}`} />
          </button>
          {dropdownAberto === "ciclo" && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50">
              {[
                { v: 2024, l: "Municipal 2024",  desc: "Prefeito, Vereador"       },
                { v: 2022, l: "Federal 2022",    desc: "Presidente, Gov., Dep."   },
                { v: 2020, l: "Municipal 2020",  desc: "Prefeito, Vereador"       },
                { v: 2018, l: "Federal 2018",    desc: "Gov., Dep. Federal"       },
              ].map(({ v, l, desc }) => (
                <button key={v} onClick={() => { handleSwitchCiclo(v); setDropdownAberto(null); }}
                  className={`w-full text-left px-3 py-2 transition-colors ${cicloAtivo === v ? "bg-brand-50" : "hover:bg-gray-50"}`}>
                  <p className={`text-xs font-bold ${cicloAtivo === v ? "text-brand-800" : "text-gray-800"}`}>{l}</p>
                  <p className="text-[10px] text-gray-400">{desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── DROPDOWN CARGO ────────────────────────────────────────────────── */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setDropdownAberto(v => v === "cargo" ? null : "cargo")}
            title="Filtrar por cargo"
            className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-all ${
              dropdownAberto === "cargo"
                ? "bg-brand-50 border-brand-300 text-brand-800"
                : "border-gray-200 bg-white hover:bg-brand-50/50 hover:border-brand-200 text-gray-700"
            }`}
          >
            <Vote className="w-3.5 h-3.5 text-gray-400" />
            {cargoMapa ? (
              <>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${CARGOS_MAPA.find(c => c.cargo === cargoMapa)?.cor ?? "bg-gray-500"}`} />
                <span className="font-bold max-w-[80px] truncate">
                  {CARGOS_MAPA.find(c => c.cargo === cargoMapa)?.label ?? cargoMapa}
                </span>
              </>
            ) : (
              <span className="font-bold text-gray-500">Todos</span>
            )}
            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${dropdownAberto === "cargo" ? "rotate-180" : ""}`} />
          </button>
          {dropdownAberto === "cargo" && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50">
              <div className="px-3 pb-1.5 border-b border-gray-100">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
                  {cicloAtivo === 2022 ? "Federal 2022" : cicloAtivo === 2024 ? "Municipal 2024" : cicloAtivo === 2020 ? "Municipal 2020" : `Federal ${cicloAtivo}`}
                </p>
              </div>
              {/* Cargos disputados no ciclo ativo (Globo-like: sem "Todos Vigentes"). */}
              {cargosDoCiclo.map(cfg => {
                const ativo = cargoMapa === cfg.cargo;
                return (
                  <button key={cfg.cargo}
                    onClick={() => {
                      setCargoMapa(cfg.cargo); setAnoMapa(cfg.ano);
                      if (!CARGOS_COM_2_TURNO.has(cfg.cargo)) setTurnoMapa(1);
                      setDropdownAberto(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${ativo ? "bg-brand-50 text-brand-800 font-bold" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.cor}`} />
                      <span>{cfg.label}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${ativo ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-400"}`}>{cfg.qtd}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── DROPDOWN PARTIDO ──────────────────────────────────────────────── */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setDropdownAberto(v => v === "partido" ? null : "partido")}
            title="Filtrar por partido ou candidato"
            className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-all ${
              dropdownAberto === "partido" || partidosSel.length > 0 || candidatosSel.length > 0
                ? "bg-brand-50 border-brand-300 text-brand-800"
                : "border-gray-200 bg-white hover:bg-brand-50/50 hover:border-brand-200 text-gray-700"
            }`}
          >
            <Flag className="w-3.5 h-3.5 text-gray-400" />
            {partidosSel.length === 0 && candidatosSel.length === 0 ? (
              <span className="font-bold text-gray-500">Todos</span>
            ) : (
              <>
                {/* Avatars coloridos dos selecionados */}
                <div className="flex -space-x-1">
                  {partidosSel.slice(0, 3).map(s => (
                    <div key={s.id} className="w-4 h-4 rounded-full border border-white flex-shrink-0"
                         style={{ backgroundColor: s.cor }} title={s.nome} />
                  ))}
                </div>
                <span className="font-bold">
                  {partidosSel.length === 1 ? partidosSel[0].nome
                   : candidatosSel.length > 0 ? `${candidatosSel.length} cand.`
                   : `${partidosSel.length} partidos`}
                </span>
              </>
            )}
            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${dropdownAberto === "partido" ? "rotate-180" : ""}`} />
          </button>
          {dropdownAberto === "partido" && (
            <div className="absolute top-full left-0 mt-1 z-50" style={{ width: 320 }}>
              <PainelPartidos
                selecionados={selecionados}
                onTogglePartido={(numero, sigla) => {
                  toggleSelecionado({ tipo: "partido", id: numero, nome: sigla });
                  setGeojson(null);
                  setGeojsonBrasilMun(null);
                }}
                onFechar={() => setDropdownAberto(null)}
              />
            </div>
          )}
        </div>

        <div className="w-px h-7 bg-gray-200 flex-shrink-0" />

        {/* Modo: Eleitos / Votos / Heatmap (UX Fase: unificado no header).
            P1-2: no nivel municipio, o mapa de distritos sempre pinta por volume
            de votos (cargo municipal) ou partido dominante (cargo nao-municipal)
            — alternar Eleitos/Votos nao tem efeito ai. Desabilitamos as tabs e
            exibimos chip informativo ao inves de deixar o usuario clicar sem
            resposta. */}
        {modoCity ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-gray-100 text-gray-600 rounded-lg flex-shrink-0" title="Neste nivel a coloração mostra força de voto por bairro">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block" />
            Força de voto por bairro
          </div>
        ) : (
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
            {(["eleitos", "votos", "heatmap"] as const).map((m) => {
              const ativo = modoMapaUnificado === m;
              return (
                <button
                  key={m}
                  onClick={() => setModoUnificado(m)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
                    ativo ? "bg-white text-brand-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {m === "eleitos" ? "Eleitos" : m === "votos" ? "Votos" : "Heatmap"}
                </button>
              );
            })}
          </div>
        )}

        {/* Comparação temporal — só faz sentido no nível estado (endpoint
            /comparacao-temporal recebe :uf no path). Esconder fora disso
            evita o usuário ativar e ver o mapa não reagir. */}
        {nivel === "estado" && cargoMapa && cargoMapa !== "VIGENTES" && (
          <SeletorComparacaoTemporal />
        )}

        {nivel === "estado" && (
          <button onClick={() => setMostrarCoordenadores(v => !v)} title="Coordenadores"
            className={`p-1.5 rounded-lg border transition-colors flex-shrink-0 ${mostrarCoordenadores ? "bg-brand-800 text-white border-brand-800" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
            <MapPin className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Seletor 1º/2º Turno removido da barra superior (nova nav Globo-like):
            agora vive nas Tabs Total/2º/1º da BarraLateral (sidebar), que só aparecem
            em cargos com 2 turnos (Presidente/Governador/Prefeito). */}

        <div className="flex-1" />

        {/* ╔══════════════════════════════════════════════════════════╗ */}
        {/* ║ GRUPO 4 - AÇÕES (limpar tudo + busca)                    ║ */}
        {/* ╚══════════════════════════════════════════════════════════╝ */}

        {/* Botão Limpar tudo: reseta filtros + seleções + geografia.
            Só aparece quando há algo para limpar. Default Globo-like: 2024 + Prefeito. */}
        {(cargoMapa !== "PREFEITO" || anoMapa !== 2024 || partidosSel.length > 0 || candidatosSel.length > 0 || nivel !== "brasil") && (
          <button
            onClick={() => {
              // Reset filtros padrão: Municipal 2024 + Prefeito (maior cargo último ciclo)
              setCargoMapa("PREFEITO");
              setAnoMapa(2024);
              setTurnoMapa(1);
              setModoUnificado("eleitos");
              setSelecionados([]);
              setBuscaResetKey(k => k + 1);  // P2-4: força remount do FiltroMapa pra limpar input
              voltarParaBrasil();
            }}
            title="Limpar todos os filtros e voltar ao Brasil"
            aria-label="Limpar todos os filtros"
            className="flex items-center gap-1 h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            Limpar
          </button>
        )}

        {/* Busca - cresce pra ocupar o espaco disponivel, com min/max razoaveis. */}
        <div className="flex-shrink min-w-[260px] max-w-[420px] w-full">
          <FiltroMapa
            key={buscaResetKey}
            onResultado={(tipo, valor, sugestao) => {
              if (tipo === "estado") {
                // P0-2: reset completo ao navegar via busca.
                // irParaEstado ja reseta resetCity (inclui nomeMunicipioSelecionado).
                irParaEstado(valor);
                return;
              }
              if (tipo === "municipio") {
                const mun = farolGlobal?.municipios.find((m) => m.codigo_ibge === valor);
                if (mun) {
                  irParaEstado(mun.estado_uf);
                  setIbgeSelecionado(valor);
                  setNomeMunicipioSelecionado(mun.nome);  // P0-2: atualiza breadcrumb
                  setMostrarVereadores(false);
                  setNivel("municipio");
                }
                return;
              }
              if (tipo === "bairro" && sugestao?.contexto_uf && sugestao?.contexto_ibge) {
                // Drill em cascata: UF -> municipio -> bairro (distrito).
                irParaEstado(sugestao.contexto_uf);
                setIbgeSelecionado(sugestao.contexto_ibge);
                setNomeMunicipioSelecionado(sugestao.contexto_nome?.split("/")[0] ?? "");
                setMostrarVereadores(false);
                setNivel("municipio");
                setBairroSelecionado({ cd: valor, nome: sugestao.label });
                return;
              }
              if (tipo === "zona" && sugestao?.contexto_uf && sugestao?.contexto_ibge) {
                // Zona nao e um drill geografico por enquanto - navega ate o
                // municipio da zona. Drill fino de zona e futuro.
                irParaEstado(sugestao.contexto_uf);
                setIbgeSelecionado(sugestao.contexto_ibge);
                setNomeMunicipioSelecionado(sugestao.contexto_nome?.split("/")[0] ?? "");
                setMostrarVereadores(false);
                setNivel("municipio");
                return;
              }
            }}
          />
        </div>
      </header>
      </TopbarExpandivel>
      </>)}

      {/* ── ÁREA DO MAPA + BARRA LATERAL ────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Mapa */}
        <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">

          {/* ── Controles mapa topo esquerdo ── */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            {/* ═══ BOTÃO VOLTAR FIXO ═══════════════════════════════════════════
                Aparece em TODOS os niveis/modos exceto Brasil raiz. Elimina o
                problema de telas onde o usuario fica preso sem botao voltar.
                Handler unico `voltarUmNivel` sobe um degrau da hierarquia:
                escola > locais > microregiao > bairro > municipio > estado > brasil.
                Suporta ESC como atalho. */}
            {podeVoltar && (
              <button
                onClick={voltarUmNivel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-gray-700 shadow-md border border-gray-200 text-xs font-semibold hover:text-brand-800 hover:bg-brand-50 hover:border-brand-300 transition-all"
                title={`${rotuloVoltar} (ESC)`}
                aria-label={rotuloVoltar}
              >
                <ArrowLeft className="w-3.5 h-3.5 text-brand-700" />
                {rotuloVoltar}
              </button>
            )}

            {/* Toolbar-breadcrumb persistente (P-C1): botoes Estado/Municipio
                sempre visiveis no topo-esquerdo. Item #2 do plano mestre. */}
            {!modoCity && (
              <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg shadow border border-gray-200 px-1.5 py-1">
                <button
                  onClick={voltarParaBrasil}
                  disabled={nivel === "brasil"}
                  title="Ir para Brasil"
                  className={
                    "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors " +
                    (nivel === "brasil"
                      ? "text-brand-800 cursor-default"
                      : "text-gray-700 hover:text-brand-800 hover:bg-brand-50")
                  }
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Brasil
                </button>
                {ufSelecionada && (
                  <>
                    <ChevronDown className="w-3 h-3 text-gray-300 -rotate-90" />
                    <button
                      onClick={voltarParaEstado}
                      disabled={nivel === "estado"}
                      title={`Ir para ${NOME_ESTADO[ufSelecionada] ?? ufSelecionada}`}
                      className={
                        "px-2 py-1 rounded-md text-xs font-semibold transition-colors " +
                        (nivel === "estado"
                          ? "text-brand-800 cursor-default"
                          : "text-gray-700 hover:text-brand-800 hover:bg-brand-50")
                      }
                    >
                      {NOME_ESTADO[ufSelecionada] ?? ufSelecionada}
                    </button>
                  </>
                )}
                {ibgeSelecionado && nivel === "municipio" && (
                  <>
                    <ChevronDown className="w-3 h-3 text-gray-300 -rotate-90" />
                    <span className="px-2 py-1 text-xs font-semibold text-brand-800">
                      {nomeMunicipioSelecionado || "Cidade"}
                    </span>
                  </>
                )}
              </div>
            )}

            {modoCity && (
              /* Chip com nome da cidade + contexto ativo. Botao voltar ficou
                 no fixo acima (voltarUmNivel lida com todos os niveis). */
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-900/80 backdrop-blur-sm rounded-md shadow-sm text-[11px] text-white">
                <span className="font-semibold truncate max-w-[140px]">{nomeMunicipioSelecionado}</span>
                {bairroSelecionado && (
                  <span className="text-[10px] text-gray-300 flex-shrink-0">
                    · {bairroSelecionado.nome}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Granularidade Brasil — só no nível brasil (estados ↔ municípios) */}
          {!modoCity && nivel === "brasil" && (
            <div className="absolute top-4 right-4 z-10">
              <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {[
                  { id: "estados",    label: "Estados",    ativo: granularidadeBrasil === "estados",    onClick: () => setGranularidadeBrasil("estados")    },
                  { id: "municipios", label: "Municípios", ativo: granularidadeBrasil === "municipios", onClick: () => setGranularidadeBrasil("municipios") },
                ].map((btn, i) => (
                  <button
                    key={btn.id}
                    onClick={btn.onClick}
                    className={[
                      "px-3 py-2 text-[11px] font-semibold transition-all whitespace-nowrap",
                      i > 0 ? "border-l border-gray-200" : "",
                      btn.ativo ? "bg-brand-800 text-white" : "text-gray-600 hover:bg-brand-50 hover:text-brand-800",
                    ].join(" ")}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PainelContexto removido (Fase UX): conteúdo migrou para o topo
              da BarraLateral via componente <StatsResumo>. */}

          {/* Painel de edicao de polygon (Cesar 13/04 noite: "monta um painel
              real"). Flutuante do lado esquerdo do mapa. Estilo editor
              profissional (Figma / Photoshop). */}
          {modoEdicao && (() => {
            const nVertices = modoEdicao.rings[0]?.length - 1 ?? 0;
            const houveMudanca = ringsOriginais
              ? JSON.stringify(ringsOriginais) !== JSON.stringify(modoEdicao.rings)
              : false;
            const ferramentas: { id: typeof ferramentaEditor; label: string; dica: string; icone: React.ReactNode }[] = [
              {
                id: "mover",
                label: "Mover",
                dica: "Arraste as bolinhas azuis grandes pra ajustar a posicao",
                icone: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
                  </svg>
                ),
              },
              {
                id: "adicionar",
                label: "Adicionar",
                dica: "Clique numa bolinha azul entre 2 vertices pra inserir um ponto",
                icone: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                ),
              },
              {
                id: "remover",
                label: "Remover",
                dica: "Clique numa bolinha vermelha pra remover. No minimo (3 vertices) apaga a microzona inteira.",
                icone: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8 12h8" />
                  </svg>
                ),
              },
            ];
            const ferramentaAtual = ferramentas.find(f => f.id === ferramentaEditor)!;
            return (
              <div className="absolute top-4 left-4 z-30 pointer-events-auto w-[280px]">
                <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-500 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Editor de poligono</p>
                    </div>
                    <p className="text-sm font-bold mt-0.5 truncate">{modoEdicao.nome}</p>
                    <p className="text-[10px] text-blue-100">
                      {nVertices} vertices
                      {historicoEdicao.length > 0 && ` - ${historicoEdicao.length} alteracao(oes) nao salvas`}
                    </p>
                  </div>

                  {/* Ferramentas */}
                  <div className="px-3 py-3 border-b border-gray-100">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Ferramenta ativa
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {ferramentas.map(f => {
                        const ativa = f.id === ferramentaEditor;
                        return (
                          <button
                            key={f.id}
                            onClick={() => setFerramentaEditor(f.id)}
                            title={f.dica}
                            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border-2 transition-all ${
                              ativa
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-600"
                            }`}
                          >
                            {f.icone}
                            <span className="text-[10px] font-semibold">{f.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 leading-tight">
                      {ferramentaAtual.dica}
                    </p>
                  </div>

                  {/* Acoes - 2 linhas pra caber tudo em 280px */}
                  <div className="px-3 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={desfazerEdicao}
                        disabled={historicoEdicao.length === 0 || salvandoEdicao}
                        title="Desfazer ultima alteracao"
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 7v6h6" />
                          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13" />
                        </svg>
                        Desfazer
                      </button>
                      <button
                        onClick={removerHoles}
                        disabled={salvandoEdicao}
                        title="Remove todos os buracos internos (ilhas brancas)"
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200 hover:bg-amber-50 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="12" cy="12" r="4" strokeDasharray="2" />
                        </svg>
                        Sem holes
                      </button>
                      <button
                        onClick={apagarMicrozona}
                        disabled={salvandoEdicao}
                        title="Apagar microzona inteira (setores vao pra vizinha)"
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                        Apagar
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={cancelarEdicao}
                        disabled={salvandoEdicao}
                        className="flex-1 px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={salvarEdicao}
                        disabled={salvandoEdicao || !houveMudanca}
                        className="flex-1 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {salvandoEdicao ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Spinner */}
          {carregando && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-4 py-2 flex items-center gap-2 border border-gray-200">
                <div className="w-3.5 h-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-600 font-medium">Carregando...</span>
              </div>
            </div>
          )}

          {/* Tooltip rico */}
          {hover && hover.nome && !painelAberto && !dominanciaIbge && (
            <TooltipCursor x={hover.x} y={hover.y} info={hover} modo={modoMapa} top2={top2Data} />
          )}

        {/* Mapa MapLibre */}
        <Map
          ref={mapRef}
          initialViewState={{ longitude: -52, latitude: -15, zoom: 4 }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={MAP_STYLE_BASE}
          interactiveLayerIds={interactiveLayerIds}
          onClick={handleClick}
          onMouseDown={handleMouseDownEditor}
          onMouseUp={handleMouseUpEditor}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            // Popup some, mas store (sidebar) preserva último hover — "sidebar congelada".
            setHover(null);
            if (hoverDebounceRef.current) { clearTimeout(hoverDebounceRef.current); hoverDebounceRef.current = null; }
          }}
          cursor={
            modoEdicao
              ? ferramentaEditor === "adicionar" ? "crosshair"
              : ferramentaEditor === "remover" ? "not-allowed"
              : vertexDrag ? "grabbing"
              : "grab"
              : "pointer"
          }
          onLoad={() => mapRef.current?.getMap().jumpTo({ center: BRASIL_VIEW.center, zoom: BRASIL_VIEW.zoom })}
          onError={() => {}}
        >
          <NavigationControl position="bottom-left" />

          {/* Máscara Brasil-only: polígono inverso cobrindo paises vizinhos em
              tom neutro. Como a geometria é "mundo - Brasil", pode ficar no topo
              da stack: ela só pinta FORA do território brasileiro, então cobre
              labels estrangeiros (Venezuela, Peru, etc) sem tocar o Brasil. */}
          {mascaraBrasilSwr?.features?.length > 0 && (
            <Source id="mascara-brasil" type="geojson" data={mascaraBrasilSwr as any}>
              <Layer
                id="mascara-brasil-fill"
                type="fill"
                paint={{ "fill-color": "#F5F5F5", "fill-opacity": 1 }}
              />
            </Source>
          )}

          {/* Brasil — estados (27 polígonos) ou municípios (5570) conforme granularidade */}
          {nivel === "brasil" && dadosBrasil && (
            <Source id="estados" type="geojson" data={dadosBrasil}>
              <Layer id="estados-fill" type="fill" paint={{
                "fill-color":   COR_FILL_ATIVO as any,
                "fill-opacity":
                  modoMapaUnificado === "heatmap" ? 0.15 :
                  (OPACITY_COMPARACAO as any) ?? OPACIDADE_FILL,
              }} />
              {/* Borda de cada feature (município OU estado dependendo da granularidade).
                  Em zoom nacional com granularidade=municipios, a borda branca 0.4 de
                  5570 polígonos se sobrepõe virando névoa que apaga as cores.
                  Solução: invisível em zoom baixo, aparece conforme aproxima. */}
              <Layer id="estados-outline" type="line" paint={{
                "line-color": "#ffffff",
                "line-width": granularidadeBrasil === "municipios"
                  ? ["interpolate", ["linear"], ["zoom"], 3, 0, 5, 0.15, 7, 0.5] as any
                  : 0.4,
                "line-opacity": granularidadeBrasil === "municipios"
                  ? ["interpolate", ["linear"], ["zoom"], 3, 0, 5, 0.5, 7, 1] as any
                  : 1,
              }} />
              {/* Labels de municípios no Brasil (granularidade municípios, zoom alto) */}
              {granularidadeBrasil === "municipios" && (
                <Layer
                  id="municipios-brasil-label"
                  type="symbol"
                  minzoom={7}
                  layout={{
                    "text-field": ["get", "nome"],
                    "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
                    "text-size": ["interpolate", ["linear"], ["zoom"], 7, 9, 10, 12],
                    "text-anchor": "center",
                    "text-allow-overlap": false,
                    "text-max-width": 8,
                  } as any}
                  paint={{
                    "text-color": "#1E0A3C",
                    "text-halo-color": "rgba(255,255,255,0.85)",
                    "text-halo-width": 1.5,
                  } as any}
                />
              )}
            </Source>
          )}

          {/* Municípios (nível Estado / City) */}
          {nivel !== "brasil" && geojson && (
            <Source id="municipios" type="geojson" data={geojson}>
              <Layer id="municipios-fill" type="fill" paint={{
                "fill-color":   COR_FILL_ATIVO as any,
                "fill-opacity": modoCity
                  ? ["case", ["==", ["get", "codigo_ibge"], ibgeSelecionado ?? ""], 0.10, 0] as any
                  : ((OPACITY_COMPARACAO as any) ?? OPACIDADE_FILL),
              }} />
              <Layer id="municipios-outline" type="line" paint={{
                "line-color": modoCity ? "#1E3A8A" : municipioHighlightColor,
                "line-width": modoCity
                  ? ["case", ["==", ["get", "codigo_ibge"], ibgeSelecionado ?? ""], 2, 0] as any
                  : municipioHighlightExpr,
                "line-opacity": 1,
              }} />
              {/* Labels dos municípios no nível estado — visíveis a partir do zoom 6 */}
              {!modoCity && (
                <Layer
                  id="municipios-estado-label"
                  type="symbol"
                  minzoom={6}
                  layout={{
                    "text-field": ["get", "nome"],
                    "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
                    "text-size": ["interpolate", ["linear"], ["zoom"], 6, 9, 9, 13, 12, 15],
                    "text-anchor": "center",
                    "text-allow-overlap": false,
                    "text-max-width": 8,
                  } as any}
                  paint={{
                    "text-color": "#1E0A3C",
                    "text-halo-color": "rgba(255,255,255,0.9)",
                    "text-halo-width": 1.5,
                  } as any}
                />
              )}
            </Source>
          )}

          {/* Overlay de coordenadores */}
          {nivel === "estado" && mostrarCoordenadores && geojsonCoord && !modoCity && (
            <Source id="coord-overlay" type="geojson" data={geojsonCoord}>
              <Layer id="coord-fill" type="fill" paint={{
                "fill-color":   ["coalesce", ["get", "cor_hex"], "rgba(0,0,0,0)"] as any,
                "fill-opacity": ["case", ["has", "cor_hex"], 0.30, 0] as any,
              }} />
              <Layer id="coord-outline" type="line" paint={{
                "line-color": ["coalesce", ["get", "cor_hex"], "#cccccc"] as any,
                "line-width": ["case", ["has", "cor_hex"], 1.5, 0] as any,
                "line-opacity": 0.7,
              }} />
            </Source>
          )}

          {/* Distritos/bairros — modo city (qualquer cargo) */}
          {/* Ocultar quando modoMicroRegioes ativo: a camada de microzonas
              fica por cima e o fundo dos distritos cria "linhas duplas"
              nas bordas compartilhadas (print Cesar 13/04 10:08). */}
          {modoCity && !modoMicroRegioes && distritosCity && (() => {
            // Cor dos bairros: segue exatamente o mesmo filtro ativo do mapa de municípios
            const corAtiva = candidatosSel.length >= 2 || (modoComparacao && partidosSel.length >= 2)
              ? // Comparação: cada item tem sua cor
                candidatosSel.length >= 2
                  ? ["match", ["get", "candidato_dominante_id"],
                      ...candidatosSel.flatMap(s => [s.id, s.cor]),
                      "#D1D5DB"]
                  : ["match", ["get", "partido_dominante_num"],
                      ...partidosSel.flatMap(s => [s.id, s.cor]),
                      "#D1D5DB"]
              : (() => {
                  // Filtro único: candidato ou partido → escala de intensidade na cor do filtro
                  const filtrado = candidatosSel[0] ?? partidosSel[0];
                  if (!filtrado) {
                    // FASE 2 (F1): sem filtro, pinta bairros por partido
                    // dominante (igual ao mapa de municipios no estado).
                    // Funciona pra qualquer cargo incluindo Pres/Gov/Sen/DepF/DepE
                    // — antes ficavam rosa uniforme porque a query filtrava
                    // por municipio_id (que e NULL em cargos nao-municipais).
                    return [
                      "match", ["coalesce", ["get", "partido_dominante_num"], 0],
                      ...Object.entries(CORES_PARTIDOS).flatMap(([num, cor]) => [Number(num), cor]),
                      COR_PARTIDO_FALLBACK,  // fallback visivel (cinza medio, nunca cor oficial)
                    ];
                  }
                  const cor = filtrado.cor;
                  return buildEscalaNivelFarol(cor, corOposta(cor));
                })();
            const corBairros: any = corAtiva;
            return (
              <Source id="distritos" type="geojson" data={distritosCity}>
                <Layer id="distritos-fill" type="fill" paint={{
                  "fill-color":   corBairros,
                  "fill-opacity": 0.55,
                }} />
                <Layer id="distritos-outline" type="line" paint={{
                  "line-color":   "#374151",
                  "line-width":   0.7,
                  "line-opacity": 0.6,
                }} />
                {/* Labels dos bairros — visíveis a partir do zoom 9 */}
                <Layer
                  id="distritos-label"
                  type="symbol"
                  minzoom={9}
                  layout={{
                    "text-field": ["coalesce", ["get", "nm_dist"], ["get", "nome"], ""],
                    "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
                    "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 13, 14],
                    "text-anchor": "center",
                    "text-allow-overlap": false,
                    "text-max-width": 10,
                  } as any}
                  paint={{
                    "text-color": "#1E0A3C",
                    "text-halo-color": "rgba(255,255,255,0.9)",
                    "text-halo-width": 1.5,
                  } as any}
                />
              </Source>
            );
          })()}

          {/* Setores censitarios — granularidade MAXIMA (IBGE ~150-300 domicilios por setor) */}
          {modoSetores && setoresCity && (() => {
            const filtrado = candidatosSel[0] ?? partidosSel[0];
            const cor = filtrado?.cor ?? CORES_FAROL.AZUL;
            const corSetores: any = buildEscalaNivelFarol(cor, corOposta(cor));
            return (
              <Source id="setores" type="geojson" data={setoresCity}>
                <Layer id="setores-fill" type="fill" paint={{
                  "fill-color":   corSetores,
                  "fill-opacity": 0.6,
                }} />
                <Layer id="setores-outline" type="line" paint={{
                  "line-color":   "#1E0A3C",
                  "line-width":   0.3,
                  "line-opacity": 0.4,
                }} />
              </Source>
            );
          })()}

          {/* Micro-regioes (bairros populares OSM: Jardim Iris, Taipas, Morro Grande) */}
          {/* P-A2/P-C4: poligonos construidos via ST_Union dos setores IBGE. */}
          {/* Pin roxo removido — agora temos demarcacao real + nome do bairro. */}
          {modoMicroRegioes && microRegioes.length > 0 && (() => {
            // Backend ja retorna `mr.geometry` como Polygon/MultiPolygon (com ST_Union dos setores).
            // Fallback pra Point quando o bairro nao tem setores unidos.
            const fc = {
              type: "FeatureCollection",
              features: microRegioes.map(mr => ({
                type: "Feature",
                geometry: mr.geometry ?? {
                  type: "Point",
                  coordinates: [mr.longitude, mr.latitude],
                },
                properties: {
                  id: mr.id,
                  nome: mr.nome,
                  tipo: mr.tipo,
                  quantidade_setores: mr.quantidade_setores,
                  populacao: mr.populacao,
                  votos: mr.votos ?? 0,
                  nivel_farol: mr.nivel_farol ?? 0,
                  partido_dominante_num: mr.partido_dominante_num ?? null,
                  candidato_dominante_id: mr.candidato_dominante_id ?? null,
                  tipo_cobertura: mr.tipo_cobertura ?? null,
                  n_escolas_cobertura: mr.n_escolas_cobertura ?? 0,
                },
              })),
            };
            // Cor da microzona: REPLICA a logica dos distritos oficiais
            // (ver bloco modoCity acima). Assim as microzonas tem tratamento
            // visual identico aos bairros oficiais:
            //   - Comparacao (2+ candidatos ou 2+ partidos): match por id
            //   - Filtro unico: gradiente escala 5-0 por nivel_farol
            //   - Sem filtro: paleta do partido_dominante_num por microzona
            const corMicroBase: any = (() => {
              if (candidatosSel.length >= 2) {
                return ["match", ["get", "candidato_dominante_id"],
                  ...candidatosSel.flatMap(s => [s.id, s.cor]),
                  "#D1D5DB"];
              }
              if (modoComparacao && partidosSel.length >= 2) {
                return ["match", ["get", "partido_dominante_num"],
                  ...partidosSel.flatMap(s => [s.id, s.cor]),
                  "#D1D5DB"];
              }
              const filtrado = candidatosSel[0] ?? partidosSel[0];
              if (!filtrado) {
                return ["match", ["coalesce", ["get", "partido_dominante_num"], 0],
                  ...Object.entries(CORES_PARTIDOS).flatMap(([num, cor]) => [Number(num), cor]),
                  COR_PARTIDO_FALLBACK];
              }
              const cor = filtrado.cor;
              return buildEscalaNivelFarol(cor, corOposta(cor));
            })();
            const filtroUnicoMR = candidatosSel[0] ?? partidosSel[0];
            return (
              <>
              <Source id="microregioes" type="geojson" data={fc}>
                {/* Fill translucido original (Cesar 21:05: "linha anterior
                    ficou mais bonita"). Opacity 0.55 default, gradiente
                    0.05-0.45 por nivel_farol com filtro unico. */}
                <Layer
                  id="microregioes-fill"
                  type="fill"
                  filter={["any",
                    ["==", ["geometry-type"], "Polygon"],
                    ["==", ["geometry-type"], "MultiPolygon"],
                  ] as any}
                  paint={{
                    "fill-color": corMicroBase,
                    "fill-opacity": filtroUnicoMR
                      ? ["interpolate", ["linear"],
                          ["coalesce", ["get", "nivel_farol"], 0],
                          0, 0.05, 1, 0.14, 2, 0.22, 3, 0.30, 4, 0.38, 5, 0.45,
                        ] as any
                      : 0.55,
                  }}
                />
                {/* Labels com nome da microzona - aparecem a partir do zoom 13
                    (microzonas sao menores que distritos, precisam zoom maior
                    pra nao sobrepor). Mesmo padrao tipografico dos distritos. */}
                <Layer
                  id="microregioes-label"
                  type="symbol"
                  minzoom={13}
                  filter={["any",
                    ["==", ["geometry-type"], "Polygon"],
                    ["==", ["geometry-type"], "MultiPolygon"],
                  ] as any}
                  layout={{
                    "text-field": ["get", "nome"],
                    "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
                    "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10, 16, 13],
                    "text-anchor": "center",
                    "text-allow-overlap": false,
                    "text-max-width": 8,
                  } as any}
                  paint={{
                    "text-color": "#1E0A3C",
                    "text-halo-color": "rgba(255,255,255,0.92)",
                    "text-halo-width": 1.4,
                  } as any}
                />
                {/* Outline halo + linha derivados do proprio poligono. */}
                <Layer
                  id="microregioes-outline-halo"
                  type="line"
                  filter={["any",
                    ["==", ["geometry-type"], "Polygon"],
                    ["==", ["geometry-type"], "MultiPolygon"],
                  ] as any}
                  paint={{
                    "line-color": "#FFFFFF",
                    "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.8, 16, 3.5] as any,
                    "line-opacity": 0.3,
                    "line-blur": 0.7,
                  } as any}
                />
                <Layer
                  id="microregioes-outline"
                  type="line"
                  filter={["any",
                    ["==", ["geometry-type"], "Polygon"],
                    ["==", ["geometry-type"], "MultiPolygon"],
                  ] as any}
                  paint={{
                    "line-color": "#1F2937",
                    "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.7, 16, 1.3] as any,
                    "line-opacity": 0.65,
                    "line-blur": 0.1,
                  } as any}
                />
                {/* Fallback: pontos so pra microzonas sem poligono */}
                <Layer
                  id="microregioes-circle"
                  type="circle"
                  minzoom={11}
                  filter={["==", ["geometry-type"], "Point"] as any}
                  paint={{
                    "circle-color": filtroUnicoMR?.cor ?? "#7C3AED",
                    "circle-radius": 4,
                    "circle-stroke-width": 1,
                    "circle-stroke-color": "#ffffff",
                    "circle-opacity": 0.65,
                  }}
                />
              </Source>
              </>
            );
          })()}

          {/* EDITOR de polygon - vertices draggable sobre a microzona em edicao.
              Cesar 13/04 21h: "quero editar pra voce aprender o que eu quero".
              V1: arrastar vertex. V2: click em midpoint = adiciona, dbl-click
              em vertex = remove. Bolinhas azul/branco = vertices. Pontos
              cinza pequenos no meio de cada segmento = midpoints (click
              pra adicionar um vertex ali). */}
          {modoEdicao && (() => {
            const verticesGeo = {
              type: "FeatureCollection" as const,
              features: modoEdicao.rings.flatMap((ring, ringIdx) =>
                ring.slice(0, -1).map((coord, vertIdx) => ({
                  type: "Feature" as const,
                  geometry: { type: "Point" as const, coordinates: coord },
                  properties: {
                    ringIdx,
                    vertIdx,
                    _editorVertex: true,
                    sendoArrastado:
                      vertexDrag?.ringIdx === ringIdx &&
                      vertexDrag?.vertIdx === vertIdx,
                  },
                }))
              ),
            };
            // Midpoints: um ponto no meio de cada segmento do ring. vertIdx
            // salvo aqui eh o indice do vertex ANTERIOR - ao clicar, novo
            // vertex eh inserido na posicao vertIdx+1.
            const midpointsGeo = {
              type: "FeatureCollection" as const,
              features: modoEdicao.rings.flatMap((ring, ringIdx) => {
                const pts = ring.slice(0, -1); // sem duplicado de fechamento
                return pts.map((coord, vertIdx) => {
                  const next = pts[(vertIdx + 1) % pts.length];
                  const mid: [number, number] = [
                    (coord[0] + next[0]) / 2,
                    (coord[1] + next[1]) / 2,
                  ];
                  return {
                    type: "Feature" as const,
                    geometry: { type: "Point" as const, coordinates: mid },
                    properties: { ringIdx, vertIdx, _editorMidpoint: true },
                  };
                });
              }),
            };
            const linhasGeo = {
              type: "FeatureCollection" as const,
              features: modoEdicao.rings.map(ring => ({
                type: "Feature" as const,
                geometry: { type: "LineString" as const, coordinates: ring },
                properties: {},
              })),
            };
            return (
              <>
                <Source id="editor-lines" type="geojson" data={linhasGeo}>
                  <Layer
                    id="editor-line"
                    type="line"
                    paint={{
                      "line-color": "#2563EB",
                      "line-width": 2,
                      "line-opacity": 0.85,
                      "line-dasharray": [2, 2] as any,
                    } as any}
                  />
                </Source>
                {/* Midpoints: tamanho razoavel pra adicionar (8px visivel +
                    hit-area invisivel 14px pra click confortavel sem ficar
                    gigante). Em outras ferramentas: 3px discretos. */}
                <Source id="editor-midpoints" type="geojson" data={midpointsGeo}>
                  {ferramentaEditor === "adicionar" && (
                    <Layer
                      id="editor-midpoint-hit"
                      type="circle"
                      paint={{
                        "circle-radius": 14,
                        "circle-color": "#2563EB",
                        "circle-opacity": 0.001,
                      } as any}
                    />
                  )}
                  <Layer
                    id="editor-midpoint"
                    type="circle"
                    paint={{
                      "circle-radius": ferramentaEditor === "adicionar" ? 7 : 3,
                      "circle-color": ferramentaEditor === "adicionar" ? "#2563EB" : "#9CA3AF",
                      "circle-stroke-color": "#FFFFFF",
                      "circle-stroke-width": ferramentaEditor === "adicionar" ? 2 : 1,
                      "circle-opacity": ferramentaEditor === "adicionar" ? 1 : 0.5,
                    } as any}
                  />
                </Source>
                {/* Vertices principais. EM FERRAMENTA "ADICIONAR" vertices
                    sao ESCONDIDOS (visibility none) pra que o hit-test do
                    MapLibre sempre acerte o midpoint (antes vertex ficava
                    por cima e bloqueava click). */}
                <Source id="editor-vertices" type="geojson" data={verticesGeo}>
                  <Layer
                    id="editor-vertex"
                    type="circle"
                    layout={{
                      visibility: ferramentaEditor === "adicionar" ? "none" : "visible",
                    } as any}
                    paint={{
                      "circle-radius": 8,
                      "circle-color": "#FFFFFF",
                      "circle-stroke-color":
                        ferramentaEditor === "remover" ? "#DC2626" : "#2563EB",
                      "circle-stroke-width": ferramentaEditor === "remover" ? 3 : 2.5,
                      "circle-opacity": 1,
                    } as any}
                  />
                </Source>
              </>
            );
          })()}

          {/* Escola pins — nível mais granular (locais de votação) */}
          {modoLocais && locaisVotacao && (() => {
            const filtrado = candidatosSel[0] ?? partidosSel[0];
            const corBase  = filtrado?.cor ?? CORES_FAROL.AZUL;
            const corCircle: any = buildEscalaNivelFarol(corBase, corOposta(corBase));
            return (
              <Source id="locais" type="geojson" data={locaisVotacao}>
                <Layer id="locais-circle" type="circle" paint={{
                  "circle-color":        corCircle,
                  "circle-radius":       ["interpolate", ["linear"], ["zoom"], 10, 4, 14, 8, 17, 14] as any,
                  "circle-stroke-width": 1.5,
                  "circle-stroke-color": "#ffffff",
                  "circle-opacity":      0.9,
                }} />
                <Layer
                  id="locais-label"
                  type="symbol"
                  minzoom={13}
                  layout={{
                    "text-field": ["get", "nome"],
                    "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
                    "text-size": 10,
                    "text-anchor": "top",
                    "text-offset": [0, 1],
                    "text-allow-overlap": false,
                    "text-max-width": 10,
                  } as any}
                  paint={{
                    "text-color": "#1E0A3C",
                    "text-halo-color": "rgba(255,255,255,0.9)",
                    "text-halo-width": 1.5,
                  } as any}
                />
              </Source>
            );
          })()}

          {/* Fronteiras estaduais — sempre visíveis no nível Brasil (tanto na
              visão estados quanto sobre os municípios, pra identificação). */}
          {nivel === "brasil" && geojsonBrasilEstados && (
            <Source id="estados-bordas" type="geojson" data={geojsonBrasilEstados}>
              <Layer
                id="estados-bordas-line"
                type="line"
                paint={{
                  "line-color": "#ffffff",
                  "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.2, 6, 2.0],
                  "line-opacity": 0.9,
                }}
              />
            </Source>
          )}

          {/* Labels dos estados — renderizado POR ÚLTIMO para ficar na frente de todos os fills */}
          {nivel === "brasil" && (
            <Source id="estados-label-pts" type="geojson" data={LABEL_ESTADOS_GEOJSON}>
              <Layer
                id="estados-sigla"
                type="symbol"
                layout={{
                  "text-field": ["get", "estado_uf"],
                  "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                  "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 5, 15],
                  "text-anchor": "center",
                  "text-allow-overlap": true,
                  "text-ignore-placement": true,
                  "symbol-z-order": "source",
                } as any}
                paint={{
                  "text-color": "#ffffff",
                  "text-halo-color": "rgba(0,0,0,0.85)",
                  "text-halo-width": 2.5,
                } as any}
              />
            </Source>
          )}
          {/* Microbairros HERE+OSM - outline pontilhado discreto (padrao Google Maps).
              Sem fill - nao compete com as cores eleitorais do candidato.
              Cor do outline: cinza medio, como o Google faz com limites de bairros. */}
          {microbairrosAtivado && microbairrosGeoJSON && (
            <Source id="microbairros-here" type="geojson" data={microbairrosGeoJSON}>
              <Layer
                id="microbairros-polygon-line"
                type="line"
                filter={["==", ["geometry-type"], "Polygon"]}
                paint={{
                  "line-color": "#dc2626",
                  "line-width": 1.2,
                  "line-opacity": 0.55,
                  "line-dasharray": [2, 2] as any,
                }}
              />
              <Layer
                id="microbairros-point"
                type="circle"
                minzoom={11}
                filter={["==", ["geometry-type"], "Point"]}
                paint={{
                  "circle-color": "#dc2626",
                  "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 2.5, 16, 5] as any,
                  "circle-stroke-color": "#ffffff",
                  "circle-stroke-width": 1,
                  "circle-opacity": 0.7,
                }}
              />
              <Layer
                id="microbairros-label"
                type="symbol"
                minzoom={13}
                layout={{
                  "text-field": ["get", "nome"],
                  "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                  "text-size": ["interpolate", ["linear"], ["zoom"], 13, 9, 17, 12],
                  "text-anchor": "top",
                  "text-offset": [0, 0.6] as any,
                  "text-allow-overlap": false,
                  "text-max-width": 8,
                } as any}
                paint={{
                  "text-color": "#374151",
                  "text-halo-color": "rgba(255,255,255,0.95)",
                  "text-halo-width": 1.5,
                } as any}
              />
            </Source>
          )}

          {/* Heatmap - renderizado POR CIMA de todos os outros layers */}
          <HeatmapLayer />
        </Map>

        {/* Botao de toggle de microbairros removido em 20/04: camada agora
            vive direto no MapLibre quando em SP capital. */}

        {/* ── Toolbar Fase 6: modo (eleitos/votos/heatmap) + comparação + debug ── */}
        <MapaToolbar />


        {/* ── Debug overlay (Fase 6) — só aparece quando ui.debugMode === true ── */}
        <DebugOverlay />

        {/* ── Legenda comparação temporal (substitui as outras quando ativa) ─
            Renderiza apenas no nível estado: o GeoJSON do nível brasil não vem
            do endpoint /comparacao-temporal e não tem crescimento_percentual.
            Quando esta legenda aparece, as outras (Legenda, LegendaComparacao,
            candidato filtrado) são suprimidas para evitar sobreposição. */}
        {comparacaoTemporalVisivel && !modoCity && (
          <div className="absolute bottom-8 left-4 z-10 bg-white rounded-xl shadow-lg border border-gray-200 px-3 py-2.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Variação {anoComparacao} → {anoMapa}
            </p>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-gray-500 mr-1">Caiu</span>
              <div
                className="h-2 w-32 rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, #B91C1C 0%, #EF4444 25%, #D1D5DB 50%, #22C55E 75%, #15803D 100%)",
                }}
              />
              <span className="text-[9px] text-gray-500 ml-1">Cresceu</span>
            </div>
            <div className="flex items-center justify-between mt-0.5 text-[9px] text-gray-400">
              <span>-50%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>
        )}

        {/* As 3 legendas abaixo são MUTUAMENTE EXCLUSIVAS com a legenda
            temporal acima. Só aparecem quando a temporal NÃO está visível. */}
        {!comparacaoTemporalVisivel && (<>
        {/* ── Legenda comparação ────────────────────────────────────────── */}
        {dadosAtivos && !modoCity && modoComparacao && sidebarFechada && (
          <LegendaComparacao
            selecionados={selecionados}
            dadosAtivos={dadosAtivos}
            nivel={nivel}
            tipoComparacao={tipoComparacao}
          />
        )}

        {/* ── Legenda Heatmap (quando modo=heatmap). P1-3 fix ─────────────── */}
        {modoMapaUnificado === "heatmap" && !modoCity && !modoComparacao && sidebarFechada && (
          <div className="absolute bottom-8 left-4 z-10 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-w-[220px]">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2" style={{ background: "linear-gradient(135deg,#1E0A3C,#3B0764)" }}>
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse inline-block" />
              <p className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Heatmap Ativo</p>
            </div>
            <div className="px-3 py-2.5 space-y-1.5">
              <p className="text-[11px] text-gray-700">Densidade de votos por local</p>
              {/* Escala gradiente */}
              <div className="h-2.5 rounded-full w-full" style={{ background: "linear-gradient(90deg, rgba(33,102,172,0.4) 0%, rgba(103,169,207,0.6) 25%, rgba(209,229,240,0.7) 50%, rgba(253,219,199,0.8) 75%, rgba(239,138,98,0.9) 90%, rgba(178,24,43,1) 100%)" }} />
              <div className="flex justify-between text-[9px] text-gray-500 font-semibold">
                <span>Poucos votos</span>
                <span>Muitos votos</span>
              </div>
              <div className="border-t border-gray-100 pt-1.5 mt-1.5 text-[10px] text-gray-400">
                {cargoMapa || "Cargo atual"} · {anoMapa}
              </div>
            </div>
          </div>
        )}

        {/* ── Legenda padrão ────────────────────────────────────────────── */}
        {dadosAtivos && !modoCity && !modoComparacao && !candidatoFiltroId && modoMapaUnificado !== "heatmap" && sidebarFechada && (
          <Legenda
            nivel={nivel}
            stats={statsAtivos}
            uf={ufSelecionada}
            modo={modoMapa}
            geojsonData={dadosAtivos}
            partidoNumero={partidoNumero}
            onTogglePartido={(numero, sigla) =>
              toggleSelecionado({ tipo: "partido", id: numero, nome: sigla })
            }
          />
        )}

        {/* ── Legenda candidato único filtrado ──────────────────────────── */}
        {dadosAtivos && !modoCity && !modoComparacao && candidatoFiltroId && sidebarFechada && (
          <div className="absolute bottom-8 left-4 z-10 bg-white rounded-xl shadow-lg p-3 min-w-[190px]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: candidatosSel[0]?.cor ?? CORES_FAROL.AZUL }} />
              <p className="text-[10px] font-bold text-gray-700 truncate">{candidatoFiltroNome}</p>
            </div>
            {[
              { cor: CORES_FAROL.AZUL,    label: "Muito forte", desc: "≥ média + 1σ" },
              { cor: CORES_FAROL.VERDE,   label: "Forte",       desc: "Acima da média" },
              { cor: CORES_FAROL.AMARELO, label: "Fraco",       desc: "Abaixo da média" },
              { cor: CORES_FAROL.VERMELHO,label: "Sem votos",   desc: "Zero registrado" },
              { cor: "#D1D5DB",           label: "Fora do escopo", desc: "Não concorreu" },
            ].map(({ cor, label, desc }) => (
              <div key={label} className="flex items-center gap-2 py-0.5">
                <div className="w-3 h-3 rounded-sm flex-shrink-0 border border-gray-200" style={{ backgroundColor: cor }} />
                <div>
                  <span className="text-xs text-gray-800 font-medium">{label}</span>
                  <span className="text-[9px] text-gray-400 block">{desc}</span>
                </div>
              </div>
            ))}
            {statsAtivos.total > 0 && (
              <div className="border-t border-gray-100 mt-1.5 pt-1.5 text-[10px] text-gray-400">
                {statsAtivos.azuis + statsAtivos.verdes} municípios com presença
              </div>
            )}
          </div>
        )}
        </>)}{/* fim guard !(temporal && estado) */}

        {/* ── Legenda city mode ─────────────────────────────────────────── */}
        {modoCity && distritosCity && (
          <LegendaCity selecionados={selecionados} vereadorSelecionado={vereadorSelecionado} />
        )}

        </div>{/* fim absolute inset-0 mapa */}

        {/* ── M9 - Painel da Escola (clique num pin de local de votação) ─── */}
        {modoLocais && escolaSelecionadaId != null && (
          <div className="absolute right-0 top-0 bottom-0 z-30 w-full sm:w-auto">
            <PainelEscola
              localId={escolaSelecionadaId}
              ano={anoMapa || 2024}
              cargo={cargoMapa && cargoMapa !== "VIGENTES" ? cargoMapa : "VEREADOR"}
              onFechar={() => setEscolaSelecionadaId(null)}
              onAbrirDossie={abrirDossie}
            />
          </div>
        )}

        {/* FASE 3 (F2+F3+F4): PainelMunicipio e PainelVereadores removidos.
            A BarraLateral padronizada assume todos os casos do municipio.
            - ConteudoMunicipio: sem filtro (mostra eleitos por cargo)
            - ConteudoPartido: com partido filtrado
            - ConteudoCandidato: com candidato filtrado
            Os arquivos PainelMunicipio.tsx e PainelVereadores.tsx ficam
            no repo como dead code ate a proxima validacao. */}

        {/* ── Modal de dominância regional ─────────────────────────────── */}
        {dominanciaIbge && (
          <ModalDominancia
            codigoIbge={dominanciaIbge}
            cargo={cargoMapa ?? ""}
            ano={anoMapa}
            candidatoFiltroNome={candidatoFiltroNome}
            candidatosDestaque={candidatosSel.map(s => s.id)}
            onFechar={() => setDominanciaIbge(null)}
            onAbrirDossie={(id) => { setDominanciaIbge(null); abrirDossie(id); }}
          />
        )}

        </div>{/* fim flex-1 relative mapa */}

        {/* ── Barra lateral (candidatos / partidos por estado) ─────────── */}
        {/* Wrappers (MapaEstrategico/Nominata/etc) podem suprimir essa sidebar
            via prop esconderSidebar e injetar a própria via overlayRight. */}
        {esconderSidebar ? overlayRight : (<>
        <BarraLateral
          nivel={nivel}
          ufSelecionada={ufSelecionada}
          ibgeSelecionado={ibgeSelecionado}
          nomeMunicipio={nomeMunicipioSelecionado}
          cargoMapa={cargoMapa}
          anoMapa={anoMapa}
          turnoMapa={turnoMapa}
          modoMapa={modoMapa}
          selecionados={selecionados}
          geojsonData={dadosAtivos}
          onToggleCandidato={(id, nome, partido_num, cargo, ano) => toggleSelecionado({ tipo: "candidato", id, nome, partido_num, cargo, ano })}
          onTogglePartido={(numero, sigla) => toggleSelecionado({ tipo: "partido", id: numero, nome: sigla })}
          onAbrirDossie={abrirDossie}
          onLimparSelecionados={limparSelecionados}
          onVoltarStep={voltarUmNivel}
          onClickEstado={(uf) => irParaEstado(uf)}
          onVoltarBrasil={voltarParaBrasil}
          onVoltarEstado={voltarParaEstado}
          hoverPreview={top2Data}
          apuracaoDistrito={top2Distrito}
          distritosGeojson={distritosCity}
          onAbrirComparativo={() => setComparativoAberto(true)}
          onFecharHoverPreview={() => {
            setIbgeHover(null);
            setIbgePreview(null);
          }}
          onAbrirMunicipioHover={(ibge, nome) => {
            // Mesma cascata do 2-click no mapa: entra no município direto.
            setIbgeSelecionado(ibge);
            setNomeMunicipioSelecionado(nome);
            setModoBairros(true);
            setModoLocais(false);
            setLocaisVotacao(null);
            setMostrarVereadores(cargoMapa === "VEREADOR");
            setVereadorSelecionado(null);
            setNivel("municipio");
            const bounds = municipioBounds.current[ibge];
            if (bounds && mapRef.current) {
              mapRef.current.getMap().fitBounds(bounds, { padding: 60, duration: 900 });
            }
          }}
          onClickMunicipio={(ibge, nome) => {
            // P-A3: sidebar por partido como navegacao alternativa.
            // Reusa a mesma sequencia do clique no mapa pra entrar no municipio.
            setIbgeSelecionado(ibge);
            setNomeMunicipioSelecionado(nome);
            setModoBairros(true);
            setModoLocais(false);
            setLocaisVotacao(null);
            setNivel("municipio");
            const bounds = municipioBounds.current[ibge];
            if (bounds && mapRef.current) {
              mapRef.current.getMap().fitBounds(bounds, { padding: 60, duration: 900 });
            }
          }}
          onVerPontos={() => { setModoBairros(true); setModoLocais(true); }}
          bairroSelecionado={bairroSelecionado}
          microRegiaoSelecionada={microRegiaoSelecionada}
          onVoltarMicroRegiao={() => setMicroRegiaoSelecionada(null)}
          onIniciarEdicaoMicroRegiao={() => {
            // Busca a microzona original no array microRegioes pra pegar a geometry
            const mr = microRegioes.find(m => m.id === microRegiaoSelecionada?.id);
            if (mr) iniciarEdicao(mr);
          }}
          onVoltarBairro={() => {
            setBairroSelecionado(null); setMicroRegiaoSelecionada(null);
            setModoLocais(false);
            setLocaisVotacao(null);
            const bounds = ibgeSelecionado ? municipioBounds.current[ibgeSelecionado] : null;
            if (bounds && mapRef.current) {
              mapRef.current.getMap().fitBounds(bounds, { padding: 60, duration: 700 });
            }
          }}
          onSelectCargo={(c) => {
            // Compact mode: selecionar cargo precisa também ajustar ano e turno
            // para o ciclo eleitoral correto, senão fetch retorna dados zerados.
            if (!c) {
              setCargoMapa(null);
              setTurnoMapa(1);
              return;
            }
            const cfg = CARGOS_MAPA.find((x) => x.cargo === c);
            setCargoMapa(c);
            if (cfg && cfg.ano > 0) setAnoMapa(cfg.ano);
            if (!CARGOS_COM_2_TURNO.has(c)) setTurnoMapa(1);
          }}
        />
        {/* Botão flutuante para reabrir sidebar — só renderiza se nenhum
            painel modal está ocupando a lateral direita. */}
        {!painelAberto && <BotaoSidebarFlutuante />}
        </>)}

        {/* Fase 7 — Comparativo por Zona Eleitoral (side panel Globo-like) */}
        <ComparativoZonasPainel
          ibge={ibgeSelecionado}
          cargo={cargoMapa}
          ano={anoMapa}
          turno={turnoMapa as 1 | 2}
          aberto={comparativoAberto && !!ibgeSelecionado}
          onFechar={() => setComparativoAberto(false)}
        />

      </div>{/* fim flex-1 flex */}
    </div>
  );
}
