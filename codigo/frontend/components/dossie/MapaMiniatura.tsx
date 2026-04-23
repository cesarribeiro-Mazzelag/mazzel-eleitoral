"use client";

/**
 * Mapa miniatura de origem dos votos.
 * Versão simplificada: lista visual com barras de proporção.
 * O mapa interativo completo é acessível via PainelMunicipio.
 */

import type { DossieVotoZona } from "@/lib/types";

interface Props {
  votos: DossieVotoZona[];
}

export function MapaMiniatura({ votos }: Props) {
  if (!votos.length) return null;

  const max = votos[0]?.votos ?? 1;
  const exibir = votos.slice(0, 10);

  return (
    <div className="space-y-2">
      {exibir.map((v, i) => {
        const pct = Math.round((v.votos / max) * 100);
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-28 truncate flex-shrink-0">
              {v.municipio}
              <span className="text-gray-400 ml-1 text-[10px]">{v.estado_uf}</span>
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: i === 0 ? "#2441B2" : i < 3 ? "#00AEEF" : "#93c5fd",
                }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-16 text-right flex-shrink-0">
              {v.votos.toLocaleString("pt-BR")}
            </span>
          </div>
        );
      })}
      {votos.length > 10 && (
        <p className="text-xs text-gray-400 text-center pt-1">
          +{votos.length - 10} municípios
        </p>
      )}
    </div>
  );
}
