"use client";

/**
 * Filtros visuais estilo FUT (FIFA Ultimate Team).
 *
 * Chips clicaveis por categoria:
 *   - Tier (dourado/ouro/prata/bronze)
 *   - Trait (legend/campeao/fera/comeback/estreante)
 *   - Cargo (vereador, deputado, etc)
 *   - UF
 *   - Ano
 *
 * Busca destacada + ordenacao rapida + toggle grid/lista.
 */
import { Search, Grid3x3, List, ArrowDown } from "lucide-react";

const TIERS = [
  { key: "dourado", label: "Dourado", color: "#f4d03f", bg: "bg-yellow-100 border-yellow-400" },
  { key: "ouro",    label: "Ouro",    color: "#fbbf24", bg: "bg-amber-100 border-amber-400" },
  { key: "prata",   label: "Prata",   color: "#9ca3af", bg: "bg-gray-100 border-gray-400" },
  { key: "bronze",  label: "Bronze",  color: "#d97706", bg: "bg-orange-100 border-orange-400" },
];

const TRAITS = [
  { key: "LEGEND",    emoji: "⭐", label: "Legend" },
  { key: "CAMPEAO",   emoji: "🏆", label: "Campeão" },
  { key: "FERA",      emoji: "🔥", label: "Fera" },
  { key: "COMEBACK",  emoji: "🔄", label: "Comeback" },
  { key: "ESTREANTE", emoji: "🌱", label: "Estreante" },
];

const CARGOS = [
  { key: "PRESIDENTE",         label: "Presidente",   abrev: "PRE" },
  { key: "GOVERNADOR",         label: "Governador",   abrev: "GOV" },
  { key: "SENADOR",            label: "Senador",      abrev: "SEN" },
  { key: "PREFEITO",           label: "Prefeito",     abrev: "PM" },
  { key: "DEPUTADO FEDERAL",   label: "Dep. Federal", abrev: "DF" },
  { key: "DEPUTADO ESTADUAL",  label: "Dep. Estadual", abrev: "DE" },
  { key: "DEPUTADO DISTRITAL", label: "Dep. Distrital", abrev: "DD" },
  { key: "VEREADOR",           label: "Vereador",     abrev: "VER" },
];

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
];

const ANOS = [2024, 2022, 2020, 2018, 2016];

const ORDENACOES = [
  { key: "overall_desc",         label: "Overall" },
  { key: "potencial_estrategico", label: "Potencial" },
  { key: "votos_desc",           label: "Votos" },
  { key: "nome_asc",             label: "Nome A-Z" },
];

function Chip({ ativo, onClick, children, cor, count, compacto }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all whitespace-nowrap",
        ativo
          ? "bg-gray-900 text-white border-gray-900 shadow-sm"
          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50",
        compacto ? "px-2 py-0.5 text-[10px]" : "",
      ].join(" ")}
    >
      {cor && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cor }} />}
      {children}
      {count != null && (
        <span className={`text-[9px] ${ativo ? "text-gray-300" : "text-gray-400"}`}>
          {count.toLocaleString("pt-BR")}
        </span>
      )}
    </button>
  );
}

function GrupoFiltro({ titulo, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{titulo}</p>
      <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
    </div>
  );
}

export function FiltrosFUT({ filtros, onChange, contadoresPorTier, vista, onMudarVista }) {
  // Toggle helper: se ja tem valor selecionado, desseleciona
  function toggle(campo, valor) {
    const atual = filtros[campo];
    onChange({
      ...filtros,
      [campo]: atual === valor ? "" : valor,
      pagina: 1,
    });
  }

  function setValor(campo, valor) {
    onChange({ ...filtros, [campo]: valor, pagina: 1 });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
      {/* Linha 1: Busca destacada + ordenacao + toggle vista */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, sigla ou cargo..."
            value={filtros.busca || ""}
            onChange={(e) => onChange({ ...filtros, busca: e.target.value, pagina: 1 })}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Ordenacao */}
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-gray-400 font-bold uppercase">Ordenar:</span>
          {ORDENACOES.map(o => (
            <Chip
              key={o.key}
              ativo={filtros.ordenar_por === o.key}
              onClick={() => setValor("ordenar_por", o.key)}
              compacto
            >
              {filtros.ordenar_por === o.key && <ArrowDown className="w-2.5 h-2.5" />}
              {o.label}
            </Chip>
          ))}
        </div>

        {/* Toggle grid/lista */}
        {onMudarVista && (
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => onMudarVista("grid")}
              className={`p-1.5 ${vista === "grid" ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              title="Cartas"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMudarVista("lista")}
              className={`p-1.5 border-l border-gray-200 ${vista === "lista" ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              title="Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Linha 2: Tier */}
      <GrupoFiltro titulo="Tier">
        {TIERS.map(t => (
          <Chip
            key={t.key}
            ativo={filtros.tier === t.key}
            onClick={() => toggle("tier", t.key)}
            cor={t.color}
            count={contadoresPorTier?.[t.key]}
          >
            {t.label}
          </Chip>
        ))}
      </GrupoFiltro>

      {/* Linha 3: Trait */}
      <GrupoFiltro titulo="Trait">
        {TRAITS.map(tr => (
          <Chip
            key={tr.key}
            ativo={filtros.trait === tr.key}
            onClick={() => toggle("trait", tr.key)}
          >
            <span>{tr.emoji}</span>
            {tr.label}
          </Chip>
        ))}
      </GrupoFiltro>

      {/* Linha 4: Cargo */}
      <GrupoFiltro titulo="Cargo">
        {CARGOS.map(c => (
          <Chip
            key={c.key}
            ativo={filtros.cargo === c.key}
            onClick={() => toggle("cargo", c.key)}
          >
            {c.label}
          </Chip>
        ))}
      </GrupoFiltro>

      {/* Linha 5: UF + Ano (compacto) */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
        <GrupoFiltro titulo="UF">
          {UFS.map(uf => (
            <Chip
              key={uf}
              ativo={filtros.estado_uf === uf}
              onClick={() => toggle("estado_uf", uf)}
              compacto
            >
              {uf}
            </Chip>
          ))}
        </GrupoFiltro>

        <GrupoFiltro titulo="Ano">
          {ANOS.map(a => (
            <Chip
              key={a}
              ativo={filtros.ano === String(a)}
              onClick={() => toggle("ano", String(a))}
              compacto
            >
              {a}
            </Chip>
          ))}
        </GrupoFiltro>
      </div>

      {/* Limpar filtros */}
      {(filtros.tier || filtros.trait || filtros.cargo || filtros.estado_uf || filtros.ano || filtros.busca) && (
        <div className="flex items-center justify-end pt-1 border-t border-gray-100">
          <button
            onClick={() => onChange({
              ...filtros,
              tier: "", trait: "", cargo: "", estado_uf: "", ano: "", busca: "",
              pagina: 1,
            })}
            className="text-[11px] text-gray-500 hover:text-gray-900 font-semibold"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}

export function BarraBreakdownTiers({ total, contadores }) {
  if (!contadores) return null;
  const counts = {
    dourado: contadores.dourado || 0,
    ouro: contadores.ouro || 0,
    prata: contadores.prata || 0,
    bronze: contadores.bronze || 0,
  };
  const soma = counts.dourado + counts.ouro + counts.prata + counts.bronze;
  if (soma === 0) return null;

  const pct = {
    dourado: (counts.dourado / soma) * 100,
    ouro: (counts.ouro / soma) * 100,
    prata: (counts.prata / soma) * 100,
    bronze: (counts.bronze / soma) * 100,
  };

  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
        {pct.dourado > 0 && <div style={{ width: `${pct.dourado}%`, background: "#f4d03f" }} title={`Dourado: ${counts.dourado}`} />}
        {pct.ouro > 0 && <div style={{ width: `${pct.ouro}%`, background: "#fbbf24" }} title={`Ouro: ${counts.ouro}`} />}
        {pct.prata > 0 && <div style={{ width: `${pct.prata}%`, background: "#9ca3af" }} title={`Prata: ${counts.prata}`} />}
        {pct.bronze > 0 && <div style={{ width: `${pct.bronze}%`, background: "#d97706" }} title={`Bronze: ${counts.bronze}`} />}
      </div>
      <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-gray-600">
        <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-1" />Dourado: <span className="font-bold tabular-nums">{counts.dourado.toLocaleString("pt-BR")}</span></span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />Ouro: <span className="font-bold tabular-nums">{counts.ouro.toLocaleString("pt-BR")}</span></span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1" />Prata: <span className="font-bold tabular-nums">{counts.prata.toLocaleString("pt-BR")}</span></span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-orange-600 mr-1" />Bronze: <span className="font-bold tabular-nums">{counts.bronze.toLocaleString("pt-BR")}</span></span>
      </div>
    </div>
  );
}
