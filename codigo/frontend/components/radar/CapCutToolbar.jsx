"use client";

/**
 * Topbar estilo CapCut - horizontal, com grupos segmentados.
 *
 * Layout (esquerda -> direita):
 *   Undo/Redo | Busca | Cargo · UF · Municipio · Zona · Tier | Ordenar | Grid/Lista
 *
 * Filtros em CASCATA:
 *   - UF aparece sempre
 *   - Municipio aparece APOS UF selecionada
 *   - Zona aparece APOS Municipio selecionado
 *
 * Low-latency: sem animacoes pesadas, sem re-renders em cascata.
 */
import { useState } from "react";
import {
  Search, Undo2, Redo2, Briefcase, Map, MapPin, Layers, Calendar,
  Medal, ArrowDownWideNarrow, LayoutGrid, List, X, ChevronDown,
} from "lucide-react";

const CARGOS = [
  "PRESIDENTE", "GOVERNADOR", "SENADOR",
  "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL",
  "PREFEITO", "VICE-PREFEITO", "VEREADOR",
];
const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const ANOS = [2024, 2022, 2020, 2018, 2016];
const TIERS = [
  { v: "dourado", label: "Dourado", cor: "#d4a84b" },
  { v: "ouro",    label: "Ouro",    cor: "#eab308" },
  { v: "prata",   label: "Prata",   cor: "#9ca3af" },
  { v: "bronze",  label: "Bronze",  cor: "#b87333" },
];
const ORDENACOES = [
  { v: "overall_desc",  label: "Overall" },
  { v: "votos_total",   label: "Votos" },
  { v: "ano_recente",   label: "Mais recente" },
  { v: "nome",          label: "Nome A-Z" },
];

// ── Componentes internos ─────────────────────────────────────────────────────

function Select({ icon: Icon, label, value, displayValue, onClear, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap text-[11px] font-semibold
        ${active
          ? "bg-purple-50 text-purple-700 border-purple-200"
          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"}
      `}
    >
      <Icon className="w-3.5 h-3.5" />
      {label && <span className="text-gray-500">{label}:</span>}
      <span>{displayValue}</span>
      {value && onClear ? (
        <X
          className="w-3 h-3 text-gray-400 hover:text-red-500"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
        />
      ) : (
        <ChevronDown className={`w-3 h-3 ${active ? "text-purple-400" : "text-gray-400"}`} />
      )}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />;
}

// ── Toolbar principal ────────────────────────────────────────────────────────

export function CapCutToolbar({
  // Estado
  filtros,
  onChange,            // (novosFiltros) => void
  // Historico
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  // Visualizacao
  visualizacao = "grid",
  onVisualizacao,
}) {
  const [menuAberto, setMenuAberto] = useState(null); // null | 'cargo' | 'uf' | 'ano' | 'tier' | 'ordenar'

  const atualizar = (patch) => {
    onChange({ ...filtros, ...patch });
    setMenuAberto(null);
  };
  const limpar = (chaves) => {
    const patch = {};
    chaves.forEach(k => { patch[k] = ""; });
    // Se limpar UF, limpar tambem municipio/zona
    if (chaves.includes("estado_uf")) {
      patch.municipio_id = "";
      patch.zona = "";
    }
    if (chaves.includes("municipio_id")) {
      patch.zona = "";
    }
    atualizar(patch);
  };

  return (
    <div className="relative bg-white border-b border-gray-200">
      <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto">
        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title="Voltar filtro (Cmd+Z)"
          aria-label="Voltar filtro"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title="Avançar filtro (Cmd+Shift+Z)"
          aria-label="Avançar filtro"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <Sep />

        {/* Busca */}
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={filtros.busca ?? ""}
            onChange={(e) => onChange({ ...filtros, busca: e.target.value })}
            placeholder="Buscar por nome..."
            className="w-full pl-8 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:border-purple-400 focus:bg-white"
          />
          {filtros.busca && (
            <button
              onClick={() => onChange({ ...filtros, busca: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              aria-label="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Sep />

        {/* Cargo */}
        <Select
          icon={Briefcase}
          label="Cargo"
          value={filtros.cargo}
          displayValue={filtros.cargo || "Todos"}
          active={!!filtros.cargo}
          onClick={() => setMenuAberto(menuAberto === "cargo" ? null : "cargo")}
          onClear={() => limpar(["cargo"])}
        />

        {/* UF (sempre visivel) */}
        <Select
          icon={Map}
          label="UF"
          value={filtros.estado_uf}
          displayValue={filtros.estado_uf || "Todas"}
          active={!!filtros.estado_uf}
          onClick={() => setMenuAberto(menuAberto === "uf" ? null : "uf")}
          onClear={() => limpar(["estado_uf"])}
        />

        {/* Municipio - aparece APOS UF */}
        {filtros.estado_uf && (
          <Select
            icon={MapPin}
            label="Município"
            value={filtros.municipio_nome}
            displayValue={filtros.municipio_nome || "Todos"}
            active={!!filtros.municipio_nome}
            onClick={() => setMenuAberto(menuAberto === "municipio" ? null : "municipio")}
            onClear={() => limpar(["municipio_id", "municipio_nome"])}
          />
        )}

        {/* Zona - aparece APOS Municipio */}
        {filtros.municipio_nome && (
          <Select
            icon={Layers}
            label="Zona"
            value={filtros.zona}
            displayValue={filtros.zona || "Todas"}
            active={!!filtros.zona}
            onClick={() => setMenuAberto(menuAberto === "zona" ? null : "zona")}
            onClear={() => limpar(["zona"])}
          />
        )}

        <Sep />

        <Select
          icon={Calendar}
          label="Ano"
          value={filtros.ano}
          displayValue={filtros.ano || "Todos"}
          active={!!filtros.ano}
          onClick={() => setMenuAberto(menuAberto === "ano" ? null : "ano")}
          onClear={() => limpar(["ano"])}
        />

        <Select
          icon={Medal}
          label="Tier"
          value={filtros.tier}
          displayValue={filtros.tier ? filtros.tier[0].toUpperCase() + filtros.tier.slice(1) : "Todos"}
          active={!!filtros.tier}
          onClick={() => setMenuAberto(menuAberto === "tier" ? null : "tier")}
          onClear={() => limpar(["tier"])}
        />

        <Sep />

        <Select
          icon={ArrowDownWideNarrow}
          label="Ordenar"
          value={filtros.ordenar_por}
          displayValue={(ORDENACOES.find(o => o.v === filtros.ordenar_por) ?? ORDENACOES[0]).label}
          active={false}
          onClick={() => setMenuAberto(menuAberto === "ordenar" ? null : "ordenar")}
        />

        {/* Toggle grid / lista */}
        {onVisualizacao && (
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 ml-1">
            <button
              onClick={() => onVisualizacao("grid")}
              className={`w-7 h-6 rounded-md flex items-center justify-center ${visualizacao === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
              aria-label="Visualização grade"
              title="Cartas"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onVisualizacao("lista")}
              className={`w-7 h-6 rounded-md flex items-center justify-center ${visualizacao === "lista" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
              aria-label="Visualização lista"
              title="Lista compacta"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Dropdowns */}
      {menuAberto === "cargo" && (
        <Dropdown>
          <div className="flex flex-wrap gap-1 max-w-lg">
            {CARGOS.map(c => (
              <button
                key={c}
                onClick={() => atualizar({ cargo: c })}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${filtros.cargo === c ? "bg-purple-600 text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}`}
              >{c}</button>
            ))}
          </div>
        </Dropdown>
      )}

      {menuAberto === "uf" && (
        <Dropdown>
          <div className="grid grid-cols-9 gap-1 w-[450px]">
            {UFS.map(u => (
              <button
                key={u}
                onClick={() => atualizar({ estado_uf: u, municipio_id: "", municipio_nome: "", zona: "" })}
                className={`py-1 rounded text-[11px] font-black ${filtros.estado_uf === u ? "bg-purple-600 text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}`}
              >{u}</button>
            ))}
          </div>
        </Dropdown>
      )}

      {menuAberto === "ano" && (
        <Dropdown>
          <div className="flex gap-1">
            {ANOS.map(a => (
              <button
                key={a}
                onClick={() => atualizar({ ano: a })}
                className={`px-3 py-1 rounded text-[11px] font-semibold ${filtros.ano === a ? "bg-purple-600 text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}`}
              >{a}</button>
            ))}
          </div>
        </Dropdown>
      )}

      {menuAberto === "tier" && (
        <Dropdown>
          <div className="flex gap-1">
            {TIERS.map(t => (
              <button
                key={t.v}
                onClick={() => atualizar({ tier: t.v })}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold ${filtros.tier === t.v ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.cor }} />
                {t.label}
              </button>
            ))}
          </div>
        </Dropdown>
      )}

      {menuAberto === "ordenar" && (
        <Dropdown>
          <div className="flex flex-col gap-0.5 w-[150px]">
            {ORDENACOES.map(o => (
              <button
                key={o.v}
                onClick={() => atualizar({ ordenar_por: o.v })}
                className={`text-left px-2 py-1.5 rounded text-[11px] font-semibold ${filtros.ordenar_por === o.v ? "bg-purple-600 text-white" : "hover:bg-gray-100 text-gray-700"}`}
              >{o.label}</button>
            ))}
          </div>
        </Dropdown>
      )}
    </div>
  );
}

function Dropdown({ children }) {
  return (
    <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg px-4 py-3 z-20">
      {children}
    </div>
  );
}
