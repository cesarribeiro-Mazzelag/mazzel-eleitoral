"use client";

/**
 * Breadcrumb geografico do Radar.
 *
 * Mostra: Brasil > SP > São Paulo > Zona 305
 * Cada nivel clicavel volta para aquele escopo (limpa os niveis abaixo).
 *
 * Aparece apenas quando pelo menos UF esta selecionada.
 */
import { ChevronRight, Map, X } from "lucide-react";

export function Breadcrumb({ filtros, onChange }) {
  const { estado_uf, municipio_nome, zona } = filtros;

  if (!estado_uf) return null;

  const limparContexto = () => {
    onChange({ ...filtros, estado_uf: "", municipio_id: "", municipio_nome: "", zona: "" });
  };

  const irPara = (nivel) => {
    const patch = { ...filtros };
    if (nivel === "brasil") {
      patch.estado_uf = "";
      patch.municipio_id = "";
      patch.municipio_nome = "";
      patch.zona = "";
    } else if (nivel === "uf") {
      patch.municipio_id = "";
      patch.municipio_nome = "";
      patch.zona = "";
    } else if (nivel === "municipio") {
      patch.zona = "";
    }
    onChange(patch);
  };

  return (
    <div className="flex items-center gap-2 px-6 py-2 bg-white border-b border-gray-200 text-[11px]">
      <span className="text-[10px] font-bold tracking-widest text-gray-400 flex-shrink-0">
        CONTEXTO:
      </span>
      <button
        onClick={() => irPara("brasil")}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-gray-600 font-semibold hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <Map className="w-3 h-3" />
        Brasil
      </button>

      <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />

      <button
        onClick={() => irPara("uf")}
        disabled={!municipio_nome && !zona}
        className={`px-2 py-1 rounded-md font-semibold transition-colors ${
          municipio_nome || zona
            ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            : "text-purple-700 bg-purple-50 cursor-default"
        }`}
      >
        {estado_uf}
      </button>

      {municipio_nome && (
        <>
          <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
          <button
            onClick={() => irPara("municipio")}
            disabled={!zona}
            className={`px-2 py-1 rounded-md font-semibold transition-colors truncate max-w-[180px] ${
              zona
                ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                : "text-purple-700 bg-purple-50 cursor-default"
            }`}
          >
            {municipio_nome}
          </button>
        </>
      )}

      {zona && (
        <>
          <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
          <span className="px-2 py-1 rounded-md text-purple-700 bg-purple-50 font-semibold">
            Zona {zona}
          </span>
        </>
      )}

      <button
        onClick={limparContexto}
        className="ml-auto text-[10px] font-semibold text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
      >
        <X className="w-3 h-3" />
        Limpar contexto
      </button>
    </div>
  );
}
