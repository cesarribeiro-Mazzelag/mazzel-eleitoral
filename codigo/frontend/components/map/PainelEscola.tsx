"use client";

/**
 * PainelEscola - painel lateral exibido quando o usuário clica numa escola
 * (local de votação) no nível "escolas" do mapa eleitoral.
 *
 * M9 - granularidade bairro+escola para mapeamento de desempenho da equipe.
 *
 * Mostra:
 *  - Nome, bairro, endereço, eleitorado da escola
 *  - Top 5 candidatos com mais votos NESSA ZONA no ano/cargo selecionados
 *  - Cabos eleitorais atuando na escola (cabo_escolas) - vazio até cadastro
 *  - Lideranças responsáveis (lideranca_escolas) - vazio até cadastro
 *
 * O endpoint backend é /mapa/escola/{local_id}.
 */
import { X, MapPin, Users, Vote, Award, AlertTriangle } from "lucide-react";
import useSWR from "swr";
import { mapaFetcher } from "@/hooks/useMapaData";
import { API_BASE as API } from "@/lib/api/base";

interface EscolaDetalhe {
  local: {
    id: number;
    nr_zona: number;
    nr_local: number;
    nome: string;
    bairro: string | null;
    endereco: string | null;
    cep: string | null;
    latitude: number;
    longitude: number;
    qt_eleitores: number | null;
    municipio_ibge: string;
    municipio_nome: string;
    estado_uf: string;
  };
  filtro: { ano: number; cargo: string };
  top_candidatos: Array<{
    candidato_id: number;
    nome_urna: string;
    foto_url: string | null;
    cargo: string;
    eleito: boolean;
    partido_num: number;
    partido_sigla: string;
    partido_cor: string;
    votos_zona: number;
  }>;
  cabos_eleitorais: Array<{
    id: number;
    nome_completo: string;
    nome_guerra: string | null;
    foto_url: string | null;
    status: string;
    performance: string;
    conversao_pct: number | null;
    variacao_pct: number | null;
    votos_ciclo: number | null;
    eleitores_area: number | null;
  }>;
  liderancas: Array<{
    id: number;
    nome_completo: string;
    nome_politico: string | null;
    foto_url: string | null;
    bairro: string | null;
    status: string;
    score: string | null;
    score_valor: number | null;
  }>;
  totais: { n_cabos: number; n_liderancas: number };
}

interface Props {
  localId: number;
  ano: number;
  cargo: string;
  onFechar: () => void;
  onAbrirDossie?: (candidatoId: number) => void;
}

function fmt(n: number | null | undefined) {
  if (n == null) return "-";
  return n.toLocaleString("pt-BR");
}

const COR_PERFORMANCE: Record<string, string> = {
  VERDE:     "bg-emerald-100 text-emerald-800",
  AMARELO:   "bg-yellow-100 text-yellow-800",
  VERMELHO:  "bg-red-100 text-red-800",
  SEM_DADOS: "bg-gray-100 text-gray-500",
};

const COR_SCORE: Record<string, string> = {
  OURO:    "bg-amber-100 text-amber-800",
  PRATA:   "bg-slate-100 text-slate-700",
  BRONZE:  "bg-orange-100 text-orange-800",
  CRITICO: "bg-red-100 text-red-800",
};

export function PainelEscola({ localId, ano, cargo, onFechar, onAbrirDossie }: Props) {
  const { data, isLoading, error } = useSWR<EscolaDetalhe>(
    `/mapa/escola/${localId}?ano=${ano}&cargo=${encodeURIComponent(cargo)}`,
    mapaFetcher,
    { revalidateOnFocus: false },
  );

  return (
    <div className="w-screen sm:w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-xl z-10">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-gray-100 bg-gradient-to-br from-brand-50 to-white">
        <div className="min-w-0 pr-2">
          {isLoading ? (
            <div className="h-5 bg-gray-200 rounded animate-pulse w-48 mb-2" />
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-700 uppercase tracking-wider">
                <MapPin className="w-3 h-3" />
                Escola eleitoral
              </div>
              <h2 className="text-base font-bold text-gray-900 mt-0.5 leading-tight">
                {data?.local.nome ?? "—"}
              </h2>
              {data?.local.bairro && (
                <p className="text-xs text-gray-600 mt-0.5">{data.local.bairro}</p>
              )}
              {data?.local.endereco && (
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">{data.local.endereco}</p>
              )}
            </>
          )}
        </div>
        <button
          onClick={onFechar}
          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 p-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-sm text-red-500 p-5 text-center">
          Erro ao carregar escola
        </div>
      ) : data ? (
        <div className="flex-1 overflow-y-auto">
          {/* KPIs da escola */}
          <div className="grid grid-cols-2 gap-2 p-4 border-b border-gray-100">
            <div className="rounded-xl bg-gray-50 px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Eleitores
              </div>
              <div className="text-xl font-bold text-gray-900 mt-0.5">
                {fmt(data.local.qt_eleitores)}
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Zona / Local
              </div>
              <div className="text-xl font-bold text-gray-900 mt-0.5">
                {data.local.nr_zona} · {data.local.nr_local}
              </div>
            </div>
          </div>

          {/* Top candidatos da zona */}
          {data.top_candidatos.length > 0 && (
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Vote className="w-3.5 h-3.5" />
                Top 5 da zona · {data.filtro.cargo} {data.filtro.ano}
              </h3>
              <div className="space-y-2">
                {data.top_candidatos.map((c, i) => (
                  <button
                    key={c.candidato_id}
                    onClick={() => onAbrirDossie?.(c.candidato_id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-brand-50 transition-colors text-left border border-gray-100 hover:border-brand-200 group"
                  >
                    <span className="w-5 text-right text-xs font-bold text-gray-300 flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="relative w-9 h-9 flex-shrink-0">
                      <div
                        className="absolute inset-0 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: c.partido_cor }}
                      >
                        {c.nome_urna?.[0] ?? "?"}
                      </div>
                      {c.foto_url && (
                        <img
                          src={`${API}${c.foto_url}`}
                          alt={c.nome_urna}
                          className="absolute inset-0 w-9 h-9 rounded-full object-cover object-top border-2 border-white"
                          onError={(ev) => {
                            (ev.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {c.nome_urna}
                        </p>
                        {c.eleito && (
                          <Award className="w-3 h-3 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">
                        {c.partido_sigla} · {c.partido_num}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-gray-900 tabular-nums">
                        {fmt(c.votos_zona)}
                      </div>
                      <div className="text-[9px] text-gray-400 uppercase tracking-wider">
                        votos
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cabos eleitorais */}
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Cabos eleitorais ({data.totais.n_cabos})
            </h3>
            {data.cabos_eleitorais.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
                <AlertTriangle className="w-5 h-5 text-gray-300 mx-auto mb-1.5" />
                <p className="text-xs text-gray-500">
                  Nenhum cabo eleitoral atribuído a esta escola
                </p>
                <button className="mt-2 text-[11px] font-semibold text-brand-700 hover:text-brand-900">
                  + Designar cabo eleitoral
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {data.cabos_eleitorais.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                      {(c.nome_guerra ?? c.nome_completo)[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {c.nome_guerra ?? c.nome_completo}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            COR_PERFORMANCE[c.performance] ?? COR_PERFORMANCE.SEM_DADOS
                          }`}
                        >
                          {c.performance}
                        </span>
                        {c.conversao_pct != null && (
                          <span className="text-[10px] text-gray-500">
                            {c.conversao_pct.toFixed(1)}% conv.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lideranças */}
          <div className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Lideranças ({data.totais.n_liderancas})
            </h3>
            {data.liderancas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-500">
                  Nenhuma liderança vinculada
                </p>
                <button className="mt-2 text-[11px] font-semibold text-brand-700 hover:text-brand-900">
                  + Vincular liderança
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {data.liderancas.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                      {(l.nome_politico ?? l.nome_completo)[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {l.nome_politico ?? l.nome_completo}
                      </p>
                      {l.score && (
                        <span
                          className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            COR_SCORE[l.score] ?? "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {l.score}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
