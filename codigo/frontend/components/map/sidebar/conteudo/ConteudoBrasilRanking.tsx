"use client";

import type { SelecionadoItem } from "@/lib/types";
import { corDoPartido } from "@/lib/farolPartido";
import { useMapaStore } from "@/lib/store/mapaStore";
import { LogoPartido } from "@/components/shared/LogoPartido";
import { useTotaisApuracao } from "@/hooks/useTotaisApuracao";
import { useEstadoEleitosBy, useEstadoNaoEleitosBy, useRankingPartidosBy } from "@/hooks/useMapaData";
import { NOME_ESTADO } from "../constants";
import { fmt, siglaExibida, isLogoHorizontal } from "../utils";
import type { RankingPartido } from "../types";
import { Avatar } from "../common/Avatar";
import { Skeleton } from "../common/Skeleton";
import { StatsResumo } from "../common/StatsResumo";
import { BlocoTotaisApuracao } from "../common/BlocoTotaisApuracao";

// ── Ranking de partidos (nivel brasil, sem filtro) ──────────────────────────

export function ConteudoBrasilRanking({
  selecionados, onTogglePartido, onToggleCandidato, onAbrirDossie, cargoMapa, geojsonData,
  uf,  // novo (19/04): escopo estadual. null/undefined = Brasil, "SP" = estado SP
}: {
  selecionados: SelecionadoItem[];
  onTogglePartido: (numero: number, sigla: string) => void;
  onToggleCandidato?: (id: number, nome: string, partido_num?: number, cargo?: string, ano?: number) => void;
  onAbrirDossie?: (id: number) => void;
  cargoMapa?: string | null;
  geojsonData?: any;
  uf?: string | null;
}) {
  // Cargos individuais (PRESIDENTE, GOVERNADOR) - mostrar candidatos direto.
  // No escopo ESTADO: só GOVERNADOR faz sentido (Presidente é nacional).
  const CARGOS_COM_CANDIDATOS = new Set(["PRESIDENTE", "GOVERNADOR"]);
  const cargoUp = cargoMapa?.toUpperCase() ?? "";
  const mostrarCandidatos =
    !!cargoMapa &&
    CARGOS_COM_CANDIDATOS.has(cargoUp) &&
    (!uf || cargoUp === "GOVERNADOR");

  // Presidente: escopo BR. Governador no estado: usar uf. Governador sem uf: skip.
  const ufParaCandidatos = mostrarCandidatos
    ? cargoUp === "PRESIDENTE"
      ? "BR"
      : uf ?? null
    : null;

  // SWR resolve race conditions automaticamente (AbortController interno,
  // dedup, keepPreviousData). Antes havia 2 fetchs paralelos sem abort.
  const { data: candidatosCargo = null } = useEstadoEleitosBy(
    ufParaCandidatos,
    mostrarCandidatos ? cargoMapa : null
  );
  const { data: candidatosNaoEleitos = null } = useEstadoNaoEleitosBy(
    ufParaCandidatos,
    mostrarCandidatos ? cargoMapa : null
  );

  // ano padrão por cargo (defensivo - usado quando cargo específico precisa de ano)
  const anoDefault = ["VEREADOR", "PREFEITO"].includes(cargoUp) ? 2024 : 2022;
  const turnoRanking = useMapaStore((s) => s.filters.turno);

  // Ranking via SWR. Quando cargo=VIGENTES os argumentos cargo/ano/turno viram
  // null no hook (gera URL sem filtros, conta mandatos vigentes agregados).
  const { data: rankingData, isLoading: carregandoRanking } = useRankingPartidosBy({
    cargo: cargoMapa,
    ano: anoDefault,
    turno: turnoRanking,
    uf,
  });
  const ranking: RankingPartido[] = Array.isArray(rankingData) ? rankingData : [];
  const carregando = carregandoRanking && ranking.length === 0;

  // Sempre usa /ranking-partidos (backend). Tentativa anterior de agregar do
  // geojson criava inconsistência: em Municípios (5570 features) contava só o
  // dominante (~75M votos), em Estados (27 features) caia no backend (~127M).
  // Dois números diferentes pra mesma pergunta confunde o usuário. Backend é
  // cacheado em memória + disco, latência <50ms — zero motivo pra duplicar.
  const rankingCargo = null;

  const partidosSel = selecionados.filter(s => s.tipo === "partido");

  // Totais nacionais (válidos/brancos/nulos/abst) — só com cargo+ano definidos
  const { data: totaisData } = useTotaisApuracao({
    cargo: cargoMapa ?? null, ano: anoDefault, turno: 1, nivel: "brasil",
    enabled: !!cargoMapa && cargoMapa !== "VIGENTES",
  });

  if (carregando && !rankingCargo) return <Skeleton />;

  // Se tem cargo especifico E nao tem filtro de uf (escopo nacional), agregar
  // do geojsonData. Com uf, usar sempre o endpoint (contagem exata do estado).
  // Isso evita mostrar dados nacionais quando usuario esta num estado especifico.
  const usarRankingCargo = !uf && rankingCargo;
  const dadosAtivos = usarRankingCargo
    ? (rankingCargo as any[]).map((r: any) => ({ ...r, total_eleitos: r.eleitos, total_votos: r.votos, score_composto: r.votos }))
    : ranking;
  const escopoLabel = uf ? (NOME_ESTADO[uf] ?? uf) : "Brasil";
  const labelStats = cargoMapa && cargoMapa !== "VIGENTES"
    ? `${cargoMapa} · ${escopoLabel}`
    : `Mandatos vigentes · ${escopoLabel}`;
  const totalEleitos = usarRankingCargo
    ? (rankingCargo as any[]).reduce((a: number, b: any) => a + b.eleitos, 0)
    : ranking.reduce((a, b) => a + b.total_eleitos, 0);
  const totalVotos = usarRankingCargo
    ? (rankingCargo as any[]).reduce((a: number, b: any) => a + b.votos, 0)
    : ranking.reduce((a, b) => a + b.total_votos, 0);

  // Modo VIGENTES: nao somar votos (soma de cargos diferentes = incoerente).
  // Mostra so contagem de mandatos. Cesar 20/04/2026.
  const isVigentes = cargoMapa === "VIGENTES" || !cargoMapa;
  const statsVisiveis = isVigentes
    ? [
        { titulo: "partidos", valor: String(dadosAtivos.length) },
        { titulo: "mandatos ativos", valor: fmt(totalEleitos), cor: "text-green-700" },
      ]
    : [
        { titulo: "partidos", valor: String(dadosAtivos.length) },
        { titulo: "eleitos", valor: fmt(totalEleitos), cor: "text-green-700" },
        { titulo: "votos", valor: fmt(totalVotos), cor: "text-brand-800" },
      ];

  return (
    <>
      <StatsResumo stats={statsVisiveis} />
      <div className="flex-1 overflow-y-auto">

        {/* Candidatos do cargo (PRESIDENTE, GOVERNADOR) */}
        {mostrarCandidatos && (candidatosCargo || candidatosNaoEleitos) && (
          <div className="p-3 border-b border-gray-200">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Candidatos a {cargoMapa}
            </p>
            {/* Eleito */}
            {candidatosCargo?.cargos?.flatMap(c => c.eleitos).map(e => (
              <div
                key={e.candidato_id}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-green-50 border border-green-200 mb-1.5 cursor-pointer hover:bg-green-100 transition-colors"
                onClick={() => onAbrirDossie?.(e.candidato_id)}
              >
                <Avatar nome={e.nome} fotoUrl={e.foto_url} size={10} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-gray-900 truncate">{e.nome}</p>
                    <span className="text-[9px] font-bold bg-green-600 text-white px-1.5 py-0.5 rounded-full">ELEITO</span>
                  </div>
                  <p className="text-[10px] text-gray-500">{e.partido_sigla} - {fmt(e.votos)} votos</p>
                </div>
              </div>
            ))}
            {/* Nao eleitos */}
            {candidatosNaoEleitos?.cargos?.flatMap(c => c.eleitos).slice(0, 10).map(e => (
              <div
                key={e.candidato_id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 mb-0.5 cursor-pointer transition-colors"
                onClick={() => onAbrirDossie?.(e.candidato_id)}
              >
                <Avatar nome={e.nome} fotoUrl={e.foto_url} size={8} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 truncate">{e.nome}</p>
                  <p className="text-[10px] text-gray-400">{e.partido_sigla} - {fmt(e.votos)} votos</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ranking de partidos: título + header sticky colado + linhas.
            Sem wrapper com padding interno pra que o sticky grude de fato no topo. */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pt-2.5 pb-1.5">
            Força dos partidos
          </p>
          {(() => {
            const listaRank = rankingCargo ?? ranking;
            const totalEleitosRank = listaRank.reduce(
              (s: number, p: any) => s + (p.total_eleitos ?? p.eleitos ?? 0), 0);
            const mostrarPct = cargoUp !== "PRESIDENTE" && totalEleitosRank > 0;
            return (
              <>
                {/* Header sticky: sem margin/padding externo para colar no topo do scroll.
                    "Partido" centralizado sobre a coluna (logo + sigla = 130px).
                    Números alinhados à DIREITA (convenção contábil) - assim valores
                    com larguras diferentes ("16%" vs "15,5%") ficam com a ponta direita
                    na mesma linha vertical, criando ritmo visual consistente.
                    ELEITOS e % com MESMA largura pra espaço uniforme entre colunas. */}
                <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 bg-gray-50 border-y border-gray-200">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide w-[130px] text-center">
                    Partido
                  </span>
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide w-14 text-center" title="Cargos conquistados pelo partido">
                    Eleitos
                  </span>
                  {mostrarPct && (
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide w-14 text-right" title="% dos cargos do pleito">
                      %
                    </span>
                  )}
                  {!isVigentes && (
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide w-[100px] text-right" title="Soma de votos no partido">
                      Votos
                    </span>
                  )}
                </div>
                {listaRank.map((p: any) => {
                  const num = p.numero ?? p.num;
                  const siglaOrig = p.sigla;
                  const siglaView = siglaExibida(siglaOrig);
                  const eleitos = p.total_eleitos ?? p.eleitos ?? 0;
                  const votos = p.total_votos ?? p.votos ?? 0;
                  const pct = mostrarPct
                    ? Math.round((eleitos / totalEleitosRank) * 1000) / 10  // 1 casa decimal
                    : null;
                  const sel = partidosSel.find(s => s.id === num);
                  const corMapa = corDoPartido(num); // cor que o partido tem no mapa
                  const cor = sel?.cor ?? corMapa;
                  const ativo = !!sel;
                  return (
                    <button
                      key={num}
                      onClick={() => onTogglePartido(num, siglaOrig)}
                      title={siglaOrig}
                      className={`w-full flex items-center gap-2 py-1.5 px-3 transition-all text-left border-b border-gray-50 ${
                        ativo ? "bg-gray-50" : "hover:bg-gray-50"
                      }`}
                      style={ativo ? { boxShadow: `inset 3px 0 0 0 ${cor}` } as any : {}}
                    >
                      {/* Bolinha da cor do mapa: identifica visualmente o partido no mapa
                          (logo oficial muitas vezes tem paleta diferente da do mapa). */}
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 border border-white shadow-sm"
                        style={{ backgroundColor: corMapa }}
                        title={`Cor no mapa: ${corMapa}`}
                      />
                      <div className="flex items-center gap-2 w-[130px] min-w-0">
                        {/* Área fixa 52×40 pra o logo: quadrados (40×40) centralizam,
                            horizontais (50×40) preenchem. Sigla sempre começa no mesmo X. */}
                        <div className="w-[52px] h-10 flex items-center justify-center flex-shrink-0">
                          <LogoPartido
                            sigla={siglaOrig}
                            cor={cor}
                            size={40}
                            wide={isLogoHorizontal(siglaOrig)}
                          />
                        </div>
                        <span className="text-[12px] font-bold text-gray-800 truncate">{siglaView}</span>
                      </div>
                      <span className="text-[12px] font-bold text-gray-800 w-14 text-center tabular-nums">{fmt(eleitos)}</span>
                      {mostrarPct && (
                        <span className="text-[11px] font-semibold text-gray-500 w-14 text-right tabular-nums">
                          {pct != null ? `${pct.toLocaleString("pt-BR")}%` : "-"}
                        </span>
                      )}
                      {!isVigentes && (
                        <span className="text-[11px] text-gray-500 w-[100px] text-right tabular-nums">{fmt(votos)}</span>
                      )}
                    </button>
                  );
                })}
              </>
            );
          })()}
        </div>
        {/* Apuração no FINAL da lista (após scroll) - dados de referência */}
        <BlocoTotaisApuracao data={totaisData} />
      </div>
    </>
  );
}
