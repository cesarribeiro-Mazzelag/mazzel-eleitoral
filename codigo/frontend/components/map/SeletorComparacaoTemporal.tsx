"use client";

/**
 * Widget de seleção de ano para comparação temporal.
 *
 * Permite escolher um segundo ano (ex: 2020 vs 2024) para comparar o
 * crescimento/queda do partido selecionado. Atualiza filters.anoComparacao
 * no store global. Quando definido, o backend pode usar os endpoints
 * /geojson/{uf}/comparacao para retornar dados lado a lado.
 *
 * Por enquanto o widget é puro filtro — a renderização da comparação no
 * mapa é feita pelos componentes que escutam filters.anoComparacao.
 */
import { useMapaActions, useMapaFilters } from "@/hooks/useMapaState";

// Anos disponíveis pelo cargo de referência (ciclos eleitorais brasileiros)
const ANOS_POR_CICLO: Record<string, number[]> = {
  PRESIDENTE: [2014, 2018, 2022],
  GOVERNADOR: [2014, 2018, 2022],
  SENADOR: [2014, 2018, 2022],
  "DEPUTADO FEDERAL": [2014, 2018, 2022],
  "DEPUTADO ESTADUAL": [2014, 2018, 2022],
  "DEPUTADO DISTRITAL": [2014, 2018, 2022],
  PREFEITO: [2016, 2020, 2024],
  VEREADOR: [2016, 2020, 2024],
};

export function SeletorComparacaoTemporal() {
  const filters = useMapaFilters();
  const { setAnoComparacao } = useMapaActions();

  const cargoRef = filters.cargo ?? "VEREADOR";
  const anos = ANOS_POR_CICLO[cargoRef] ?? ANOS_POR_CICLO.VEREADOR;
  const anosDisponiveis = anos.filter((a) => a !== filters.ano);

  const ativo = filters.anoComparacao !== null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm">
      <span className="text-slate-500">Comparar com:</span>
      <select
        className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
        value={filters.anoComparacao ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          setAnoComparacao(v === "" ? null : Number(v));
        }}
      >
        <option value="">— nenhum —</option>
        {anosDisponiveis.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      {ativo && (
        <button
          onClick={() => setAnoComparacao(null)}
          className="rounded px-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Limpar comparação"
          title="Limpar comparação"
        >
          ×
        </button>
      )}
      {ativo && (
        <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
          {filters.anoComparacao} vs {filters.ano}
        </span>
      )}
    </div>
  );
}
