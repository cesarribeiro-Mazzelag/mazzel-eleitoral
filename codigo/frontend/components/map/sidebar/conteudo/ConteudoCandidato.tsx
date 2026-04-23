"use client";

import { useMemo } from "react";
import { Users, MapPin, X } from "lucide-react";
import type { NivelMapa, SelecionadoItem } from "@/lib/types";
import { useMapaStore } from "@/lib/store/mapaStore";
import { useTotaisApuracao } from "@/hooks/useTotaisApuracao";
import { useEstadoEleitosBy } from "@/hooks/useMapaData";
import { NOME_ESTADO } from "../constants";
import { fmt } from "../utils";
import { Avatar } from "../common/Avatar";
import { StatsResumo } from "../common/StatsResumo";
import { HintInteracao } from "../common/HintInteracao";
import { BlocoTotaisApuracao } from "../common/BlocoTotaisApuracao";

// ── Conteudo: Candidato unico selecionado ────────────────────────────────────
// Segue o mesmo template de ConteudoPartido, mas para 1 candidato.
// Renderiza 3 views: brasil / estado / municipio.
// Le do geojsonData (ja filtrado com candidato_id via buildMapUrl).
// Pesquisa de mercado em docs/PESQUISA_SIDEBAR_NAVEGACAO.md secao 4.2.

export function ConteudoCandidato({
  candidatoSel, nivel, ufSelecionada, ibgeSelecionado, nomeMunicipio,
  geojsonData, distritosGeojson, onVoltar, onClickEstado, onAbrirDossie, onVerPontos,
  onToggleCandidato,
}: {
  candidatoSel: SelecionadoItem;
  nivel: NivelMapa;
  ufSelecionada: string | null;
  ibgeSelecionado: string | null;
  nomeMunicipio: string;
  geojsonData: any;
  distritosGeojson?: any | null;
  onVoltar: () => void;
  onClickEstado?: (uf: string) => void;
  onAbrirDossie?: (id: number) => void;
  onVerPontos?: () => void;
  onToggleCandidato?: (id: number, nome: string, partido_num?: number, cargo?: string, ano?: number) => void;
}) {
  // Apuração contextual (acompanha drill-down: brasil/estado/municipio).
  const nivelApuracaoC: "brasil" | "estado" | "municipio" =
    nivel === "municipio" ? "municipio" : nivel === "estado" ? "estado" : "brasil";
  const anoFilterC = useMapaStore((s) => s.filters.ano);
  const turnoFilterC = useMapaStore((s) => s.filters.turno);
  const { data: totaisCand } = useTotaisApuracao({
    cargo: candidatoSel.cargo ?? null,
    ano: candidatoSel.ano ?? anoFilterC ?? 2024,
    turno: turnoFilterC ?? 1,
    nivel: nivelApuracaoC,
    uf: nivelApuracaoC !== "brasil" ? ufSelecionada : null,
    codigoIbge: nivelApuracaoC === "municipio" ? ibgeSelecionado : null,
    enabled: !!candidatoSel.cargo,
  });

  // Ponto 1 (13/04): lista dos demais candidatos do cargo — Cesar pediu
  // "manter a lista dos candidatos que disputaram o cargo, e reorganizar
  // como apresentamos as informacoes relevantes". Filtrado fica destacado
  // e clicar em outro troca o filtro.
  const ufParaOutros =
    nivel === "estado" && candidatoSel.cargo && candidatoSel.ano
      ? ufSelecionada
      : null;
  const { data: eleitosEstadoCand = null } = useEstadoEleitosBy(
    ufParaOutros,
    candidatoSel.cargo ?? null,
    candidatoSel.ano ?? undefined
  );
  const outrosCandidatos = useMemo<any[]>(() => {
    if (!eleitosEstadoCand || !candidatoSel.cargo) return [];
    const cargoGrupo = eleitosEstadoCand.cargos?.find(
      (c: any) => c.cargo.toUpperCase() === candidatoSel.cargo!.toUpperCase()
    );
    return cargoGrupo?.eleitos ?? [];
  }, [eleitosEstadoCand, candidatoSel.cargo]);

  // Agrega features do geojsonData por UF (compatível com granularidade estados ou municípios).
  // O fetch ja veio filtrado por candidato (buildMapUrl passa candidato_id).
  const listaEstados = useMemo(() => {
    if (nivel !== "brasil" || !geojsonData?.features) return [];
    const map = new Map<string, { nome: string; uf: string; votos: number }>();
    for (const f of geojsonData.features) {
      const p = f.properties ?? {};
      const uf = p.estado_uf ?? "";
      if (!uf) continue;
      const votos = p.total_votos ?? p.votos ?? p.score_ponderado ?? 0;
      if (votos <= 0) continue;
      const entry = map.get(uf) ?? { nome: NOME_ESTADO[uf] ?? uf, uf, votos: 0 };
      entry.votos += votos;
      map.set(uf, entry);
    }
    return [...map.values()].sort((a, b) => b.votos - a.votos);
  }, [geojsonData, nivel]);

  const listaMunicipios = useMemo(() => {
    if (nivel !== "estado" || !geojsonData?.features) return [];
    const items: Array<{ nome: string; ibge: string; votos: number }> = [];
    for (const f of geojsonData.features) {
      const p = f.properties ?? {};
      const votos = p.total_votos ?? p.votos ?? p.score_ponderado ?? 0;
      if (votos > 0) items.push({ nome: p.nome ?? "", ibge: p.codigo_ibge ?? "", votos });
    }
    return items.sort((a, b) => b.votos - a.votos);
  }, [geojsonData, nivel]);

  const listaBairros = useMemo(() => {
    if (nivel !== "municipio") return [];
    // Bairros vem de `distritosGeojson` (endpoint /municipio/{ibge}/distritos).
    // `geojsonData` no nivel municipio eh o geojson do ESTADO (municipios), nao
    // os bairros - por isso antes listava so o municipio como 1 linha.
    const fonte = distritosGeojson?.features ?? [];
    const items: Array<{ nome: string; votos: number; farol?: number }> = [];
    for (const f of fonte) {
      const p = f.properties ?? {};
      const votos = p.votos_total ?? p.votos ?? 0;
      const nome = p.nm_dist ?? p.nome_distrito ?? p.nome ?? "";
      if (votos > 0 && nome) items.push({ nome, votos, farol: p.farol });
    }
    return items.sort((a, b) => b.votos - a.votos);
  }, [distritosGeojson, nivel]);

  const totalVotos =
    nivel === "brasil" ? listaEstados.reduce((a, b) => a + b.votos, 0)
    : nivel === "estado" ? listaMunicipios.reduce((a, b) => a + b.votos, 0)
    : listaBairros.reduce((a, b) => a + b.votos, 0);

  const nomeEstado = NOME_ESTADO[ufSelecionada ?? ""] ?? ufSelecionada ?? "";
  const cargoLabel = candidatoSel.cargo ? `${candidatoSel.cargo}${candidatoSel.ano ? ` ${candidatoSel.ano}` : ""}` : "";

  // Ponto 1 (13/04): chip compacto unico (antes eram 2 blocos: header +
  // card). Nome do candidato + partido/cargo + botoes Dossie/Limpar numa
  // unica linha. Economiza espaco vertical e deixa a lista de candidatos
  // do cargo como protagonista.
  const chipCandidato = (
    <div className="px-3 py-2 border-b border-gray-100 bg-gradient-to-r from-brand-50 to-white flex items-center gap-2 flex-shrink-0">
      <div
        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-[11px]"
        style={{ backgroundColor: candidatoSel.cor }}
      >
        {candidatoSel.nome.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-900 truncate leading-tight">{candidatoSel.nome}</p>
        {cargoLabel && <p className="text-[9px] text-gray-500 truncate leading-tight">{cargoLabel}</p>}
      </div>
      {onAbrirDossie && (
        <button
          onClick={() => onAbrirDossie(candidatoSel.id)}
          className="text-[10px] px-1.5 py-0.5 rounded bg-brand-700 text-white hover:bg-brand-800 font-semibold"
          title="Abrir dossie"
        >
          Dossie
        </button>
      )}
      <button
        onClick={onVoltar}
        className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Limpar filtro de candidato"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );

  // ── NIVEL BRASIL ─────────────────────────────────────────────────────────
  if (nivel === "brasil") {
    return (
      <>

        {chipCandidato}
        <StatsResumo
          label={`Base nacional do candidato`}
          stats={[
            { titulo: "Estados", valor: String(listaEstados.length) },
            { titulo: "Votos", valor: fmt(totalVotos), cor: "text-brand-800" },
            { titulo: "Reduto", valor: listaEstados[0]?.nome.slice(0, 8) ?? "-", cor: "text-green-700" },
          ]}
        />
        <HintInteracao texto="Clique no estado para aprofundar" />
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-0.5">
            <div className="flex items-center gap-2 px-1.5 pb-1 border-b border-gray-100">
              <span className="text-[9px] font-semibold text-gray-400 w-4 text-right">#</span>
              <span className="text-[9px] font-semibold text-gray-400 flex-1">Estado</span>
              <span className="text-[9px] font-semibold text-gray-400 w-20 text-right">Votos</span>
            </div>
            {listaEstados.map((it, i) => (
              <button
                key={it.uf}
                onClick={() => onClickEstado?.(it.uf)}
                className="w-full flex items-center gap-2 py-2 px-2 rounded-lg text-left hover:bg-brand-50 cursor-pointer transition-all"
              >
                <span className="text-[10px] font-bold text-gray-400 w-4 text-right">{i + 1}</span>
                <span className="text-xs text-brand-700 font-semibold truncate flex-1">{it.nome}</span>
                <span className="text-[10px] font-bold text-gray-700 w-20 text-right">{fmt(it.votos)}</span>
              </button>
            ))}
            {listaEstados.length === 0 && (
              <div className="p-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">{candidatoSel.nome} nao teve votos registrados</p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── NIVEL ESTADO ─────────────────────────────────────────────────────────
  if (nivel === "estado") {
    const topMunicipio = listaMunicipios[0];
    return (
      <>

        {chipCandidato}
        <StatsResumo
          label={`${candidatoSel.nome} em ${nomeEstado}`}
          stats={[
            { titulo: "Municípios", valor: String(listaMunicipios.length) },
            { titulo: "Votos", valor: fmt(totalVotos), cor: "text-brand-800" },
            { titulo: "Reduto", valor: topMunicipio?.nome.slice(0, 10) ?? "-", cor: "text-green-700" },
          ]}
        />

        {/* Ponto 1 (13/04): lista dos demais candidatos do cargo — manter
            visivel mesmo com filtro ativo. Filtrado destacado, clicar em
            outro troca o filtro. */}
        {outrosCandidatos.length > 0 && onToggleCandidato && (
          <div className="border-b border-gray-100 bg-gray-50/50 flex-shrink-0 max-h-[260px] overflow-y-auto">
            <p className="px-3 pt-2 pb-1 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
              Disputaram este cargo · {outrosCandidatos.length}
            </p>
            <div className="px-2 pb-2 space-y-0.5">
              {outrosCandidatos.slice(0, 20).map((c: any) => {
                const ativo = c.candidato_id === candidatoSel.id;
                return (
                  <button
                    key={c.candidato_id}
                    onClick={() => {
                      if (!ativo) {
                        onToggleCandidato(c.candidato_id, c.nome_urna ?? c.nome, c.partido_num, c.cargo, c.ano);
                      }
                    }}
                    className={`w-full flex items-center gap-2 p-1.5 rounded-md text-left transition-colors ${
                      ativo ? "bg-brand-100 ring-1 ring-brand-300" : "hover:bg-white"
                    }`}
                  >
                    <Avatar nome={c.nome_urna ?? c.nome} fotoUrl={c.foto_url} size={7} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] truncate ${ativo ? "font-bold text-brand-900" : "font-semibold text-gray-800"}`}>
                        {c.nome_urna ?? c.nome}
                      </p>
                      <p className="text-[9px] text-gray-500">{c.partido_sigla} · {fmt(c.votos)}</p>
                    </div>
                    {c.eleito && (
                      <span className="text-[8px] font-bold text-green-700 bg-green-50 px-1 rounded">ELEITO</span>
                    )}
                  </button>
                );
              })}
              {outrosCandidatos.length > 20 && (
                <p className="text-[9px] text-gray-400 pt-1 text-center">+{outrosCandidatos.length - 20}</p>
              )}
            </div>
          </div>
        )}

        <HintInteracao texto="Redutos do candidato · clique no municipio para ver bairros" />
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-0.5">
            <div className="flex items-center gap-2 px-1.5 pb-1 border-b border-gray-100">
              <span className="text-[9px] font-semibold text-gray-400 w-4 text-right">#</span>
              <span className="text-[9px] font-semibold text-gray-400 flex-1">Municipio</span>
              <span className="text-[9px] font-semibold text-gray-400 w-20 text-right">Votos</span>
            </div>
            {listaMunicipios.slice(0, 50).map((it, i) => (
              <div
                key={it.ibge}
                className="w-full flex items-center gap-2 py-2 px-2 rounded-lg text-left hover:bg-brand-50 transition-all"
              >
                <span className="text-[10px] font-bold text-gray-400 w-4 text-right">{i + 1}</span>
                <span className="text-xs text-brand-700 font-semibold truncate flex-1">{it.nome}</span>
                <span className="text-[10px] font-bold text-gray-700 w-20 text-right">{fmt(it.votos)}</span>
              </div>
            ))}
            {listaMunicipios.length === 0 && (
              <div className="p-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">Sem votos registrados em {nomeEstado}</p>
              </div>
            )}
            {listaMunicipios.length > 50 && (
              <p className="text-[10px] text-gray-400 pt-2 text-center">+{listaMunicipios.length - 50} municipios</p>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── NIVEL MUNICIPIO ──────────────────────────────────────────────────────
  return (
    <>

      {chipCandidato}
      <StatsResumo
        label={`${candidatoSel.nome} em ${nomeMunicipio || "cidade"}`}
        stats={[
          { titulo: "Bairros", valor: String(listaBairros.length) },
          { titulo: "Votos", valor: fmt(totalVotos), cor: "text-brand-800" },
          { titulo: "Reduto", valor: listaBairros[0]?.nome.slice(0, 10) ?? "-", cor: "text-green-700" },
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
      <HintInteracao texto="Bairros onde o candidato foi mais votado" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-0.5">
          <div className="flex items-center gap-2 px-1.5 pb-1 border-b border-gray-100">
            <span className="text-[9px] font-semibold text-gray-400 w-4 text-right">#</span>
            <span className="text-[9px] font-semibold text-gray-400 flex-1">Bairro / Distrito</span>
            <span className="text-[9px] font-semibold text-gray-400 w-20 text-right">Votos</span>
          </div>
          {listaBairros.slice(0, 30).map((it, i) => (
            <div
              key={`${it.nome}-${i}`}
              className="w-full flex items-center gap-2 py-2 px-2 rounded-lg text-left hover:bg-brand-50 transition-all"
            >
              <span className="text-[10px] font-bold text-gray-400 w-4 text-right">{i + 1}</span>
              <span className="text-xs text-brand-700 font-semibold truncate flex-1">{it.nome}</span>
              <span className="text-[10px] font-bold text-gray-700 w-20 text-right">{fmt(it.votos)}</span>
            </div>
          ))}
          {listaBairros.length === 0 && (
            <div className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-xs text-gray-400">Sem dados granulares para este municipio</p>
            </div>
          )}
          {listaBairros.length > 30 && (
            <p className="text-[10px] text-gray-400 pt-2 text-center">+{listaBairros.length - 30} bairros</p>
          )}
        </div>
        <BlocoTotaisApuracao data={totaisCand} />
      </div>
    </>
  );
}
