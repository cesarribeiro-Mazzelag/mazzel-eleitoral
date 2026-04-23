"use client";

import { useEffect, useState } from "react";
import { BarChart2, X } from "lucide-react";
import type { SelecionadoItem } from "@/lib/types";
import { API } from "../utils";
import { CardPreviewCandidato } from "./CardPreviewCandidato";

// ── Preview de hover (Globo-like): sidebar atualiza ao passar mouse numa cidade ──

export function SidebarHoverPreview({
  top2, onEntrar, onAbrirComparativo, onAtivarGradiente, onAbrirDossie, selecionados = [],
  onFecharPreview,
}: {
  top2: import("@/hooks/useMunicipioTop2").Top2Response;
  onEntrar?: (ibge: string, nome: string) => void;
  onAbrirComparativo?: () => void;
  /** 2 cliques no card: ativa gradiente / entra comparação automaticamente. */
  onAtivarGradiente?: (id: number, nome: string, partido_num?: number, cargo?: string, ano?: number) => void;
  /** Botão ⓘ no card: abre dossiê. */
  onAbrirDossie?: (id: number) => void;
  /** Lista atual de selecionados pra destacar visualmente o card. */
  selecionados?: SelecionadoItem[];
  /** Fechar o preview e voltar ao ranking do estado (quando em nivel estado). */
  onFecharPreview?: () => void;
}) {
  const fmt = (n: number) => Number(n).toLocaleString("pt-BR");
  const fmtPct = (n?: number | null) =>
    n == null ? "" : `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  // Lista: regra depende do cargo
  // - 2º turno (Prefeito/Pres/Gov):    top 2 (eleito + 2º)
  // - Cargos proporcionais (Vereador/Dep): abas Eleitos / Não-eleitos
  // - Demais 1º turno majoritários:    top 5 com "Ver todos"
  const candidatos = top2.candidatos ?? [top2.eleito, top2.segundo].filter(Boolean) as import("@/hooks/useMunicipioTop2").Top2Item[];
  const mostrarTop2 = top2.teve_segundo_turno === true;
  const cargoProporcional = ["VEREADOR", "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL", "SENADOR"]
    .includes(top2.cargo?.toUpperCase() ?? "");
  const [expandido, setExpandido] = useState(false);
  const [abaProp, setAbaProp] = useState<"eleitos" | "nao_eleitos">("eleitos");
  // Quando troca de cidade, recolhe e volta pra aba eleitos.
  useEffect(() => { setExpandido(false); setAbaProp("eleitos"); }, [top2.municipio.codigo_ibge]);

  // Lista efetiva conforme modo
  let lista: typeof candidatos;
  let hasMais = false;
  if (cargoProporcional) {
    const eleitos = candidatos.filter(c => c.eleito);
    const naoEleitos = candidatos.filter(c => !c.eleito);
    const fonte = abaProp === "eleitos" ? eleitos : naoEleitos;
    // Eleitos: mostra TODOS (Cesar quer ver câmara inteira). Não-eleitos: top 10 por padrão.
    const limite = abaProp === "eleitos" ? fonte.length : (expandido ? fonte.length : 10);
    lista = fonte.slice(0, limite);
    hasMais = fonte.length > lista.length;
  } else {
    const limite = mostrarTop2 ? 2 : (expandido ? candidatos.length : 5);
    lista = candidatos.slice(0, limite);
    hasMais = candidatos.length > lista.length;
  }
  const eleitos = candidatos.filter(c => c.eleito);
  const naoEleitos = candidatos.filter(c => !c.eleito);

  const renderCandidato = (item: import("@/hooks/useMunicipioTop2").Top2Item) => {
    const iniciais = (item.nome ?? "?").split(" ").slice(0, 2).map(s => s[0]).join("").toUpperCase();
    const fotoFull = item.foto_url ? `${API}${item.foto_url}` : null;
    const pct = item.pct_validos;
    // Card está selecionado (gradiente ativo)?
    const sel = selecionados.find(s => s.tipo === "candidato" && s.id === item.candidato_id);
    return (
      <CardPreviewCandidato
        key={item.candidato_id}
        item={item}
        iniciais={iniciais}
        fotoFull={fotoFull}
        pct={pct}
        fmt={fmt}
        fmtPct={fmtPct}
        corSelecionado={sel?.cor ?? null}
        cargo={top2.cargo}
        ano={top2.ano}
        onAtivarGradiente={onAtivarGradiente}
        onAbrirDossie={onAbrirDossie}
      />
    );
  };

  const totais = top2.totais;
  const temTotais =
    totais && (totais.validos != null || totais.brancos != null || totais.nulos != null || totais.abstencoes != null);

  // Quando não tem `onEntrar`, está sendo usado no município já selecionado
  // (drill-down). Nesse caso o header não mostra "Preview · hover".
  const modoSelecionado = !onEntrar;
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-3 bg-gradient-to-br from-brand-50 to-white border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold text-brand-500 uppercase tracking-widest">
              {modoSelecionado ? "Apuração" : "Olhando cidade"}
            </p>
            <h3 className="text-base font-bold text-gray-900 leading-tight mt-0.5 truncate" title={top2.municipio.nome}>
              {top2.municipio.nome}
              {top2.municipio.estado_uf && (
                <span className="text-gray-400 font-normal text-sm"> · {top2.municipio.estado_uf}</span>
              )}
            </h3>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-1">
              {top2.cargo} {top2.ano} · {top2.turno}º turno
              {mostrarTop2 && <span className="ml-2 text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">2º turno</span>}
            </p>
          </div>
          {/* Fechar preview: so aparece em modo hover (nao drill-down) pra voltar ao ranking do estado */}
          {!modoSelecionado && onFecharPreview && (
            <button
              onClick={onFecharPreview}
              className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
              title="Voltar ao ranking do estado"
              aria-label="Fechar preview"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {!modoSelecionado && onEntrar && (
          <button
            onClick={() => onEntrar(top2.municipio.codigo_ibge, top2.municipio.nome)}
            className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
          >
            Entrar na cidade →
          </button>
        )}
      </div>

      {/* Abas Eleitos / Não-eleitos para cargos proporcionais */}
      {cargoProporcional && (
        <div className="flex border-t border-b border-gray-100 bg-gray-50">
          <button
            onClick={() => { setAbaProp("eleitos"); setExpandido(false); }}
            className={`flex-1 px-3 py-2 text-[11px] font-semibold transition-colors ${
              abaProp === "eleitos"
                ? "text-brand-800 border-b-2 border-brand-600 bg-white"
                : "text-gray-500 hover:text-gray-800 hover:bg-white"
            }`}
          >
            Eleitos ({eleitos.length})
          </button>
          <button
            onClick={() => { setAbaProp("nao_eleitos"); setExpandido(false); }}
            className={`flex-1 px-3 py-2 text-[11px] font-semibold transition-colors ${
              abaProp === "nao_eleitos"
                ? "text-brand-800 border-b-2 border-brand-600 bg-white"
                : "text-gray-500 hover:text-gray-800 hover:bg-white"
            }`}
          >
            Não eleitos ({naoEleitos.length})
          </button>
        </div>
      )}

      {lista.length === 0 ? (
        <div className="p-6 text-center text-[11px] text-gray-400 italic">
          {cargoProporcional && abaProp === "nao_eleitos"
            ? "Nenhum candidato não eleito com votos registrados"
            : "Sem dados de candidatos"}
        </div>
      ) : (
        lista.map(renderCandidato)
      )}

      {!mostrarTop2 && hasMais && (
        <div className="px-3 py-2 border-t border-gray-100">
          <button
            onClick={() => setExpandido(true)}
            className="w-full py-1.5 text-[11px] font-semibold text-brand-700 hover:text-brand-900 hover:bg-brand-50 rounded-lg transition-colors"
          >
            Ver todos (+{candidatos.length - lista.length}) ↓
          </button>
        </div>
      )}
      {!mostrarTop2 && expandido && (
        <div className="px-3 py-1.5 border-t border-gray-100">
          <button
            onClick={() => setExpandido(false)}
            className="w-full py-1 text-[10px] text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            Recolher ↑
          </button>
        </div>
      )}

      {temTotais && (() => {
        const t = totais!;
        // Total de votos = comparecimento se populado, senão válidos+brancos+nulos
        const totalVotos = t.total_votos ?? t.comparecimento ?? null;
        const rowPct = (label: string, valor: number | null, pct: number | null, destaque?: boolean) => {
          if (valor == null) return null;
          return (
            <div className="flex items-baseline justify-between gap-2 py-1">
              <span className={`text-[11px] ${destaque ? "font-semibold text-gray-800" : "text-gray-500"}`}>{label}</span>
              <div className="flex items-baseline gap-2">
                {pct != null && (
                  <span className={`text-[11px] ${destaque ? "font-bold text-gray-800" : "text-gray-600"}`}>{fmtPct(pct)}</span>
                )}
                <span className={`text-[11px] tabular-nums ${destaque ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>{fmt(valor)}</span>
              </div>
            </div>
          );
        };
        return (
          <div className="mt-2 px-3 py-2.5 bg-gray-50 border-t border-gray-100">
            <p className="text-[9px] font-bold text-gray-400 tracking-widest mb-1.5">APURAÇÃO</p>
            <div className="divide-y divide-gray-100">
              {totalVotos != null && rowPct("Total de votos", totalVotos, totalVotos && t.eleitores ? (totalVotos * 100) / t.eleitores : null, true)}
              {rowPct("Válidos", t.validos, t.pct_validos)}
              {rowPct("Brancos", t.brancos, t.pct_brancos)}
              {rowPct("Nulos", t.nulos, t.pct_nulos)}
              {rowPct("Abstenções", t.abstencoes, t.pct_abstencoes)}
              {rowPct("Aptos a votar", t.eleitores, null)}
            </div>
          </div>
        );
      })()}

      {onEntrar && (
        <div className="p-3">
          <button
            onClick={() => onEntrar(top2.municipio.codigo_ibge, top2.municipio.nome)}
            className="w-full py-2 text-[11px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors"
          >
            Entrar em {top2.municipio.nome} →
          </button>
        </div>
      )}

      {/* Fase 7: comparativo por zona eleitoral (só no modo selecionado — nivel=municipio) */}
      {modoSelecionado && onAbrirComparativo && (
        <div className="px-3 pb-3">
          <button
            onClick={onAbrirComparativo}
            className="w-full py-2 text-[11px] font-semibold text-brand-700 bg-white hover:bg-brand-50 border border-brand-300 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Comparativo por zona eleitoral
          </button>
        </div>
      )}

      {!modoSelecionado && (
        <div className="px-4 pb-3 text-[10px] text-gray-400 italic">
          Passe o mouse em outra cidade pra atualizar · 2 cliques pra entrar
        </div>
      )}
    </div>
  );
}
