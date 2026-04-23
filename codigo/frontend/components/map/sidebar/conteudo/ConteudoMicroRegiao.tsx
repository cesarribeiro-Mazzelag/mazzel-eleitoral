"use client";

import { ArrowLeft } from "lucide-react";
import type { SelecionadoItem } from "@/lib/types";
import { fmt } from "../utils";
import { StatsResumo } from "../common/StatsResumo";

// ── Conteudo Microzona (sub-distrito OSM dentro do distrito) ─────────────
// Cesar (13/04 02:39): cada subdistrito tem pelo menos uma escola = ponto
// de votacao. Sidebar mostra forca do candidato/partido filtrado naquele
// subdistrito, sincronizada com filtros do mapa.
export function ConteudoMicroRegiao({
  microSel, distritoNome, candidatoUnico, partidoUnico,
  cargoMapa, anoMapa, onVoltar, onIniciarEdicao,
}: {
  microSel: {
    id: number; nome: string; tipo: string; votos: number; nivel_farol: number;
    tipo_cobertura?: string | null;
    n_escolas_cobertura?: number | null;
  };
  distritoNome?: string;
  candidatoUnico: SelecionadoItem | null;
  partidoUnico: SelecionadoItem | null;
  cargoMapa: string | null;
  anoMapa: number;
  onVoltar: () => void;
  onIniciarEdicao?: () => void;
}) {
  const filtroAtivo = candidatoUnico ?? partidoUnico;
  // P2-5: mesma escala de LABELS_ESCALA_ELEITOS - reusar.
  const labelNivel: Record<number, string> = {
    5: "Alta concentração",
    4: "Forte presença",
    3: "Presença moderada",
    2: "Baixa presença",
    1: "Presença residual",
    0: "Sem dados",
  };
  return (
    <>
      <div className="px-3 pt-3 pb-1 flex-shrink-0">
        <button
          onClick={onVoltar}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao distrito
        </button>
      </div>

      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-brand-50 to-white">
        <p className="text-[9px] font-bold text-brand-600 uppercase tracking-widest mb-0.5">
          Subdistrito · {microSel.tipo}
        </p>
        <h3 className="text-sm font-bold text-gray-900">{microSel.nome}</h3>
        {distritoNome && (
          <p className="text-[10px] text-gray-500 mt-0.5">dentro de {distritoNome}</p>
        )}
        {/* Badge da cobertura eleitoral (reflexao Cesar+GPT 13/04 noite).
            Microzona eh territorio, escola eh ponto de apuracao. Microzonas
            sem escola propria recebem cobertura estimada por vizinhas. */}
        {microSel.tipo_cobertura && (
          <div className="mt-2 flex items-center gap-1.5">
            {microSel.tipo_cobertura === "interna" ? (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                Cobertura propria · {microSel.n_escolas_cobertura ?? 0} escola(s)
              </span>
            ) : microSel.tipo_cobertura === "vizinha_estimativa" ? (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                Cobertura estimada · {microSel.n_escolas_cobertura ?? 0} escola(s) vizinha(s)
              </span>
            ) : microSel.tipo_cobertura === "vizinha_distante" ? (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                Cobertura distante · {microSel.n_escolas_cobertura ?? 0} escola(s) {'> 3km'}
              </span>
            ) : null}
          </div>
        )}
      </div>

      <StatsResumo
        label={filtroAtivo ? `${filtroAtivo.nome} aqui` : `${cargoMapa ?? "—"} ${anoMapa}`}
        stats={[
          { titulo: "Votos", valor: fmt(microSel.votos), cor: "text-brand-800" },
          { titulo: "Nível", valor: `${microSel.nivel_farol}/5`, cor: "text-green-700" },
          { titulo: "Força", valor: labelNivel[microSel.nivel_farol].split(" ")[0] },
        ]}
      />

      <div className="px-3 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Força neste subdistrito</span>
        </div>
        <div className="flex items-center gap-1 h-2 rounded-full overflow-hidden bg-gray-200">
          {[1, 2, 3, 4, 5].map(n => (
            <div
              key={n}
              className={`flex-1 transition-colors`}
              style={{
                backgroundColor:
                  n <= microSel.nivel_farol
                    ? (filtroAtivo ? filtroAtivo.cor : "#7C3AED")
                    : "transparent",
              }}
            />
          ))}
        </div>
        <p className="text-[10px] text-gray-500 mt-1.5">
          {labelNivel[microSel.nivel_farol]}
          {filtroAtivo && ` · ${filtroAtivo.nome}`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <p className="text-[11px] text-gray-400 italic">
          Clique novamente no subdistrito no mapa para ver os pontos de votacao.
        </p>

        {/* Editar polygon manualmente (Cesar 13/04 21h). Disponivel apenas
            pra admin/PRESIDENTE - o endpoint valida. Fora do perfil, botao
            aparece mas retorna erro ao salvar. */}
        {onIniciarEdicao && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              Correcao manual
            </p>
            <button
              onClick={onIniciarEdicao}
              className="w-full px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Editar poligono
            </button>
            <p className="text-[9px] text-gray-400 mt-1.5 leading-tight">
              Arraste os vertices azuis no mapa pra ajustar o contorno.
              Salva na base e versiona.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
