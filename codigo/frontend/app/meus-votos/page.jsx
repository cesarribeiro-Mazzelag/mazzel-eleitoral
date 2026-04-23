"use client";

/**
 * Meus Votos — distribuição geográfica dos votos do político logado.
 * Mostra a última eleição: ranking de municípios por votos recebidos.
 */

import { useEffect, useState } from "react";
import { MapPin, Trophy } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
function tkn() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ub_token") ?? "";
}

function fmt(n) {
  if (n == null) return "-";
  return Number(n).toLocaleString("pt-BR");
}

export default function MeusVotosPage() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch(`${API}/meu-painel/votos`, {
      headers: { Authorization: `Bearer ${tkn()}` },
    })
      .then((r) => r.json())
      .then(setDados)
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, []);

  const votos = dados?.votos_por_municipio ?? [];
  const candidatura = dados?.candidatura;
  const maxVotos = votos[0]?.votos ?? 1;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Votos</h1>
          {candidatura && (
            <p className="text-sm text-gray-500 mt-1">
              {candidatura.cargo} · {candidatura.estado} · {candidatura.ano} ·{" "}
              <span className="font-semibold">{fmt(candidatura.votos_total)} votos totais</span>
              {candidatura.eleito && (
                <span className="ml-2 inline-flex items-center gap-1 text-green-600 font-medium">
                  <Trophy className="w-3.5 h-3.5" /> Eleito
                </span>
              )}
            </p>
          )}
        </div>

        {carregando ? (
          <div className="card p-8 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-uniao-azul border-t-transparent rounded-full animate-spin" />
          </div>
        ) : votos.length === 0 ? (
          <div className="card p-10 text-center">
            <MapPin className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhum dado de votos disponível.</p>
          </div>
        ) : (
          <div className="card divide-y divide-gray-50">
            {votos.map((v, i) => {
              const pct = Math.round((v.votos / maxVotos) * 100);
              return (
                <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                  {/* Posição */}
                  <span className={`text-sm font-bold w-6 text-center flex-shrink-0 ${
                    i === 0 ? "text-uniao-dourado" :
                    i === 1 ? "text-gray-400" :
                    i === 2 ? "text-amber-600" : "text-gray-300"
                  }`}>
                    {i + 1}
                  </span>

                  {/* Município */}
                  <div className="w-36 flex-shrink-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{v.municipio}</p>
                    <p className="text-xs text-gray-400">{v.estado_uf}</p>
                  </div>

                  {/* Barra */}
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: i === 0 ? "#2441B2" : i < 3 ? "#00AEEF" : "#93c5fd",
                      }}
                    />
                  </div>

                  {/* Votos */}
                  <span className="text-sm font-semibold text-gray-700 w-20 text-right flex-shrink-0">
                    {fmt(v.votos)}
                  </span>

                  {/* % do máximo */}
                  <span className="text-xs text-gray-400 w-10 text-right flex-shrink-0">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
