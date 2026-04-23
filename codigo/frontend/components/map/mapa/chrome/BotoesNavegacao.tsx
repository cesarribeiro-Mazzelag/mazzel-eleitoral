"use client";

import type { NivelMapa } from "@/lib/types";
import { NOME_ESTADO, CARGOS_COM_2_TURNO } from "../utils";

// ── Botões de navegação de profundidade + granularidade ──────────────────────────────────────
export function BotoesNavegacao({
  nivel, ufSelecionada, nomeMunicipio,
  granularidadeBrasil, onGranularidadeEstados, onGranularidadeMunicipios,
  onBrasil, onEstado,
  cargoMapa, turno, onTurno,
}: {
  nivel: NivelMapa;
  ufSelecionada: string | null;
  nomeMunicipio: string;
  granularidadeBrasil: "estados" | "municipios";
  onGranularidadeEstados: () => void;
  onGranularidadeMunicipios: () => void;
  onBrasil: () => void;
  onEstado: () => void;
  cargoMapa: string | null;
  turno: number;
  onTurno: (t: number) => void;
}) {
  const btns = [
    {
      id: "nacional",
      label: "Nacional",
      ativo: nivel === "brasil" && granularidadeBrasil === "estados",
      onClick: nivel !== "brasil" ? onBrasil
             : granularidadeBrasil !== "estados" ? onGranularidadeEstados
             : undefined,
      disabled: false,
    },
    {
      id: "estado",
      label: nivel === "estado"
        ? (NOME_ESTADO[ufSelecionada ?? ""] ?? ufSelecionada ?? "Estado")
        : "Estado",
      ativo: (nivel === "brasil" && granularidadeBrasil === "municipios") || nivel === "estado",
      onClick: nivel === "municipio" ? onEstado
             : nivel === "brasil" && granularidadeBrasil === "estados" ? onGranularidadeMunicipios
             : undefined,
      disabled: false,
    },
    {
      id: "municipio",
      label: nomeMunicipio ? nomeMunicipio.split(" ").slice(0, 2).join(" ") : "Município",
      ativo: nivel === "municipio",
      onClick: undefined,
      disabled: nivel !== "municipio",
    },
  ];

  const mostrarTurno = cargoMapa && CARGOS_COM_2_TURNO.has(cargoMapa);

  return (
    <div className="flex items-center gap-2">
      {/* Botões de granularidade */}
      <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {btns.map((btn, i) => (
          <button
            key={btn.id}
            onClick={btn.onClick}
            disabled={btn.disabled || !btn.onClick}
            className={[
              "px-3 py-2 text-[11px] font-semibold transition-all whitespace-nowrap",
              i > 0 ? "border-l border-gray-200" : "",
              btn.ativo
                ? "bg-brand-800 text-white"
                : btn.disabled
                ? "text-gray-300 cursor-default"
                : "text-gray-600 hover:bg-brand-50 hover:text-brand-800 cursor-pointer",
            ].join(" ")}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Seletor de turno — só para cargos com 2º turno */}
      {mostrarTurno && (
        <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {[1, 2].map((t, i) => (
            <button
              key={t}
              onClick={() => onTurno(t)}
              className={[
                "px-3 py-2 text-[11px] font-semibold transition-all whitespace-nowrap",
                i > 0 ? "border-l border-gray-200" : "",
                turno === t
                  ? "bg-brand-800 text-white"
                  : "text-gray-600 hover:bg-brand-50 hover:text-brand-800 cursor-pointer",
              ].join(" ")}
            >
              {t}º Turno
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
