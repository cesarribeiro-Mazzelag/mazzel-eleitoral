"use client";

/**
 * Modal de Dominância Regional
 * Abre quando o usuário clica num município enquanto um candidato está filtrado.
 * Mostra os top candidatos que dominam aquela região, com barras de votos.
 */

import { useEffect, useState } from "react";
import { X, Trophy, TrendingUp } from "lucide-react";
import { API_BASE as API } from "@/lib/api/base";

function token() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ub_token") ?? "";
}

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR");
}

// Cores oficiais dos partidos
const CORES_PARTIDOS: Record<number, string> = {
  13: "#CC0000", 22: "#1E40AF", 10: "#1D4ED8", 44: "#EA580C",
  55: "#1E3A8A", 15: "#065F46", 11: "#1E4D8C", 12: "#DC2626",
  77: "#D97706", 45: "#2563EB", 20: "#0284C7", 14: "#991B1B",
  23: "#B45309", 40: "#15803D", 65: "#7F1D1D", 50: "#6D28D9",
  17: "#1E3A8A", 25: "#1D4ED8",
};

function corPartido(num: number): string {
  return CORES_PARTIDOS[num] ?? "#6B7280";
}

interface CandidatoItem {
  candidato_id: number;
  nome: string;
  foto_url: string | null;
  partido_sigla: string;
  partido_num: number;
  votos: number;
  pct_total: number;
  pct_maior: number;
  eleito: boolean;
}

interface DominanciaData {
  municipio: string;
  estado_uf: string;
  total_votos: number;
  candidatos: CandidatoItem[];
  dominante: { partido_sigla: string; partido_num: number } | null;
}

function Avatar({ nome, fotoUrl, cor }: { nome: string; fotoUrl: string | null; cor: string }) {
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center text-sm font-bold text-white"
        style={{ backgroundColor: cor }}
      >
        {nome[0]}
      </div>
      {fotoUrl && (
        <img
          src={`${API}${fotoUrl}`}
          alt={nome}
          className="absolute inset-0 w-10 h-10 rounded-full object-cover object-top border-2 border-white shadow-sm"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
    </div>
  );
}

interface Props {
  codigoIbge: string;
  cargo: string;
  ano: number;
  candidatoFiltroNome?: string;
  candidatosDestaque?: number[];  // IDs dos candidatos selecionados para destacar
  onFechar: () => void;
  onAbrirDossie: (id: number) => void;
}

export function ModalDominancia({ codigoIbge, cargo, ano, candidatoFiltroNome, candidatosDestaque = [], onFechar, onAbrirDossie }: Props) {
  const [dados, setDados] = useState<DominanciaData | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    setDados(null);
    fetch(`${API}/mapa/municipio/${codigoIbge}/dominancia?cargo=${encodeURIComponent(cargo)}&ano=${ano}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(setDados)
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, [codigoIbge, cargo, ano]);

  const cargoLabel = cargo.charAt(0) + cargo.slice(1).toLowerCase();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onFechar}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 bottom-4 sm:inset-auto sm:right-4 sm:bottom-4 sm:w-[420px] z-50 rounded-2xl overflow-hidden shadow-2xl border border-white/10">

        {/* Header */}
        <div
          className="px-5 pt-5 pb-4"
          style={{ background: "linear-gradient(135deg, #1E0A3C, #3B0764)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest mb-1">
                Análise Regional · {cargoLabel} {ano}
              </p>
              <h3 className="text-lg font-bold text-white truncate">
                {dados?.municipio ?? "Carregando..."}
              </h3>
              {dados && (
                <p className="text-xs text-brand-300 mt-0.5">
                  {fmt(dados.total_votos)} votos no total · {dados.estado_uf}
                </p>
              )}
            </div>
            <button
              onClick={onFechar}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors flex-shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contexto: candidato(s) filtrado(s) */}
          {candidatoFiltroNome && candidatosDestaque.length <= 1 && (
            <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <TrendingUp className="w-3.5 h-3.5 text-brand-300 flex-shrink-0" />
              <p className="text-xs text-brand-200">
                Comparando com <span className="font-bold text-white">{candidatoFiltroNome}</span>
              </p>
            </div>
          )}
          {candidatosDestaque.length >= 2 && (
            <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <TrendingUp className="w-3.5 h-3.5 text-brand-300 flex-shrink-0" />
              <p className="text-xs text-brand-200">
                <span className="font-bold text-white">{candidatosDestaque.length} candidatos</span> em comparação - destacados abaixo
              </p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="bg-white">
          {carregando ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !dados || dados.candidatos.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              Sem dados eleitorais para este município.
            </div>
          ) : (
            <div className="p-4 space-y-2.5">

              {/* Rótulo "Quem domina" */}
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Quem domina esta região
                </p>
              </div>

              {/* Ponto 3 (13/04): banner de MARGEM DE VITORIA + INTENSIDADE.
                  Mostra se o 1o lugar dominou com folga ou venceu em empate
                  tecnico. Complementa a visualizacao no mapa. */}
              {dados.candidatos.length >= 2 && dados.total_votos > 0 && (() => {
                const primeiro = dados.candidatos[0];
                const segundo = dados.candidatos[1];
                const pctPrimeiro = primeiro.pct_total ?? 0;
                const pctSegundo = segundo.pct_total ?? 0;
                const margem = pctPrimeiro - pctSegundo;
                // 5 niveis de dominio, alinhados com backend
                const nivel =
                  pctPrimeiro >= 60 ? 5 :
                  pctPrimeiro >= 45 ? 4 :
                  pctPrimeiro >= 35 ? 3 :
                  pctPrimeiro >= 25 ? 2 : 1;
                const labelNivel =
                  nivel === 5 ? "Domínio absoluto" :
                  nivel === 4 ? "Vitória clara" :
                  nivel === 3 ? "Vitória competitiva" :
                  nivel === 2 ? "Vitória apertada" :
                               "Empate técnico";
                const corBar =
                  nivel >= 4 ? "bg-green-500" :
                  nivel >= 3 ? "bg-lime-500" :
                  nivel >= 2 ? "bg-amber-500" : "bg-red-500";
                return (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 mb-3">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                        Margem de vitoria
                      </p>
                      <p className="text-xs font-bold text-gray-800">
                        {margem.toFixed(1)} pontos
                      </p>
                    </div>
                    <div className="flex items-center gap-1 h-1.5 rounded-full overflow-hidden bg-gray-200">
                      {[1, 2, 3, 4, 5].map(n => (
                        <div
                          key={n}
                          className={`flex-1 ${n <= nivel ? corBar : "bg-transparent"}`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1.5">
                      {labelNivel} · {primeiro.nome} liderou com {pctPrimeiro.toFixed(1)}% vs {pctSegundo.toFixed(1)}% de {segundo.nome}
                    </p>
                  </div>
                );
              })()}

              {dados.candidatos.map((c, i) => {
                const cor = corPartido(c.partido_num);
                const isPrimeiro = i === 0;
                const isDestaque = candidatosDestaque.includes(c.candidato_id);
                return (
                  <button
                    key={c.candidato_id}
                    onClick={() => onAbrirDossie(c.candidato_id)}
                    className={`w-full text-left rounded-xl border overflow-hidden transition-all hover:shadow-md ${
                      isDestaque
                        ? "border-brand-400 bg-brand-50/40 ring-2 ring-brand-200"
                        : isPrimeiro
                          ? "border-amber-200 bg-amber-50/50"
                          : "border-gray-100 bg-white hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 px-3 pt-3 pb-2">
                      {/* Posição */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                          isPrimeiro ? "bg-amber-400 text-white" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {i + 1}
                      </div>

                      {/* Avatar */}
                      <Avatar nome={c.nome} fotoUrl={c.foto_url} cor={cor} />

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                          {c.nome}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: cor }}
                          >
                            {c.partido_sigla}
                          </span>
                          {c.eleito && (
                            <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                              Eleito
                            </span>
                          )}
                          {isDestaque && (
                            <span className="text-[10px] font-bold text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded">
                              Selecionado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Votos */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{fmt(c.votos)}</p>
                        <p className="text-[10px] text-gray-400">{c.pct_total.toFixed(1)}%</p>
                      </div>
                    </div>

                    {/* Barra de votos */}
                    <div className="px-3 pb-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${c.pct_maior}%`,
                            backgroundColor: cor,
                            opacity: isPrimeiro ? 1 : 0.6,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}

              <p className="text-center text-[10px] text-gray-400 pt-1">
                Clique no candidato para abrir o dossiê completo
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
