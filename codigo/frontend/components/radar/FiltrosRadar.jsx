"use client";

/**
 * Filtros do Radar — Políticos.
 * Cargo, UF, ano, classificação, risco, ordenação.
 *
 * Mantém UX limpa: dropdowns simples, sem chips coloridos.
 */
import { useState } from "react";
import { Filter, X } from "lucide-react";

const CARGOS = [
  "PRESIDENTE", "GOVERNADOR", "SENADOR",
  "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL",
  "PREFEITO", "VEREADOR",
];

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA",
  "PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const ANOS = [2024, 2022, 2020, 2018];

const CLASSIFICACOES = [
  { value: "FORTE",          label: "Forte" },
  { value: "EM_CRESCIMENTO", label: "Em crescimento" },
  { value: "EM_RISCO",       label: "Em risco" },
  { value: "CRITICO",        label: "Crítico" },
];

const RISCOS = [
  { value: "BAIXO", label: "Baixo" },
  { value: "MEDIO", label: "Médio" },
  { value: "ALTO",  label: "Alto" },
];

const ORDENACOES = [
  { value: "potencial_estrategico", label: "Potencial estratégico" },
  { value: "votos_total",           label: "Votos totais" },
  { value: "ano_recente",           label: "Mais recente" },
  { value: "nome",                  label: "Nome (A-Z)" },
];

export function FiltrosRadar({ filtros, onChange }) {
  const [aberto, setAberto] = useState(false);

  const setCampo = (k, v) => onChange({ ...filtros, [k]: v, pagina: 1 });

  const limpar = () =>
    onChange({
      cargo: "",
      estado_uf: "",
      ano: "",
      classificacao: "",
      risco: "",
      busca: "",
      ordenar_por: "potencial_estrategico",
      pagina: 1,
    });

  const algumaCoisaAtiva =
    filtros.cargo || filtros.estado_uf || filtros.ano ||
    filtros.classificacao || filtros.risco || filtros.busca;

  return (
    <div className="card p-4 space-y-3">
      {/* Linha de busca + toggle filtros */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={filtros.busca || ""}
          onChange={(e) => setCampo("busca", e.target.value)}
          className="input flex-1"
        />
        <button
          onClick={() => setAberto((v) => !v)}
          className={[
            "btn-outline flex items-center gap-2 flex-shrink-0",
            aberto ? "bg-brand-50 border-brand-300 text-brand-700" : "",
          ].join(" ")}
        >
          <Filter className="w-4 h-4" />
          Filtros
        </button>
        {algumaCoisaAtiva && (
          <button
            onClick={limpar}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 flex-shrink-0"
          >
            <X className="w-3 h-3" />
            Limpar
          </button>
        )}
      </div>

      {/* Filtros expandidos */}
      {aberto && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-gray-100">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Cargo</label>
            <select
              value={filtros.cargo || ""}
              onChange={(e) => setCampo("cargo", e.target.value)}
              className="input mt-1 text-sm w-full"
            >
              <option value="">Todos</option>
              {CARGOS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">UF</label>
            <select
              value={filtros.estado_uf || ""}
              onChange={(e) => setCampo("estado_uf", e.target.value)}
              className="input mt-1 text-sm w-full"
            >
              <option value="">Todas</option>
              {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Ano</label>
            <select
              value={filtros.ano || ""}
              onChange={(e) => setCampo("ano", e.target.value)}
              className="input mt-1 text-sm w-full"
            >
              <option value="">Todos</option>
              {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Classificação</label>
            <select
              value={filtros.classificacao || ""}
              onChange={(e) => setCampo("classificacao", e.target.value)}
              className="input mt-1 text-sm w-full"
            >
              <option value="">Todas</option>
              {CLASSIFICACOES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Risco</label>
            <select
              value={filtros.risco || ""}
              onChange={(e) => setCampo("risco", e.target.value)}
              className="input mt-1 text-sm w-full"
            >
              <option value="">Todos</option>
              {RISCOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Ordenar</label>
            <select
              value={filtros.ordenar_por || "potencial_estrategico"}
              onChange={(e) => setCampo("ordenar_por", e.target.value)}
              className="input mt-1 text-sm w-full"
            >
              {ORDENACOES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
