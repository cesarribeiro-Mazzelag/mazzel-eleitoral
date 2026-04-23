// Helpers puros compartilhados pelo MapaEleitoral e subcomponentes.
// Extraidos de MapaEleitoral.tsx sem alterar comportamento.

import type { SelecionadoItem } from "@/lib/types";
import { CORES_PARTIDOS as CORES_PARTIDOS_GLOBAL } from "@/lib/farolPartido";

export const CORES_FAROL: Record<string, string> = {
  AZUL:     "#1E3A8A",
  VERDE:    "#3B82F6",
  AMARELO:  "#EAB308",
  VERMELHO: "#DC2626",
  SEM_DADOS:"#DC2626",
};

export const NOME_ESTADO: Record<string, string> = {
  AC:"Acre", AL:"Alagoas", AM:"Amazonas", AP:"Amapá", BA:"Bahia",
  CE:"Ceará", DF:"Distrito Federal", ES:"Espírito Santo", GO:"Goiás",
  MA:"Maranhão", MG:"Minas Gerais", MS:"Mato Grosso do Sul", MT:"Mato Grosso",
  PA:"Pará", PB:"Paraíba", PE:"Pernambuco", PI:"Piauí", PR:"Paraná",
  RJ:"Rio de Janeiro", RN:"Rio Grande do Norte", RO:"Rondônia", RR:"Roraima",
  RS:"Rio Grande do Sul", SC:"Santa Catarina", SE:"Sergipe", SP:"São Paulo",
  TO:"Tocantins",
};

// Cargos que podem ter 2º turno
export const CARGOS_COM_2_TURNO = new Set(["PRESIDENTE", "GOVERNADOR", "PREFEITO"]);

// Paleta ÚNICA de cores dos partidos. Antes havia duplicação local aqui e em
// lib/farolPartido.ts - cores DIFERENTES pro mesmo partido (ex: PSD era amarelo
// na bolinha do ranking mas azul no mapa). Cesar 19/04: "banco e o mesmo, um nao
// pode mostrar algo diferente do outro". Unificamos para a paleta oficial do
// farolPartido.ts - único source of truth.
export const CORES_PARTIDOS = CORES_PARTIDOS_GLOBAL;

// Cor de fallback quando um partido_num nao esta na paleta acima. Escolhida
// propositalmente diferente de qualquer cor oficial pra ser OBVIO que e fallback
// (usuario nao confunde com cor real de partido). Melhor que o cinza quase-branco
// anterior (`#E5E7EB`) que ficava invisivel sobre o CARTO Positron.
export const COR_PARTIDO_FALLBACK = "#9CA3AF";

// Paleta de fallback para comparação — usada quando cor do partido já está em uso
export const CORES_COMPARACAO_FALLBACK = [
  "#7C3AED", // violet
  "#DB2777", // pink
  "#0D9488", // teal
  "#65A30D", // lime
  "#EA580C", // orange
  "#6366F1", // indigo
  "#D97706", // amber
  "#0891B2", // cyan
];

export function corPartido(num: number): string {
  return CORES_PARTIDOS[num] ?? COR_PARTIDO_FALLBACK;
}

// Retorna a cor ideal para o item sendo adicionado à seleção
// - Partido: usa cor oficial do partido (fallback genérico se já em uso por outro)
// - Candidato com partido_num: usa cor do partido (primary ou variação)
// - Candidato sem info: paleta de fallback
export function corParaSelecionado(
  item: Omit<SelecionadoItem, "cor">,
  prev: SelecionadoItem[],
): string {
  const usadas = new Set(prev.map(s => s.cor));

  if (item.tipo === "partido") {
    const corOficial = corPartido(item.id);
    if (!usadas.has(corOficial)) return corOficial;
    // Já em uso: fallback genérico
    return CORES_COMPARACAO_FALLBACK.find(c => !usadas.has(c))
      ?? CORES_COMPARACAO_FALLBACK[prev.length % CORES_COMPARACAO_FALLBACK.length];
  }

  // Candidato: tenta cor do partido dele
  if (item.partido_num) {
    const corOficial = corPartido(item.partido_num);
    if (!usadas.has(corOficial)) return corOficial;
  }

  // Fallback genérico para candidatos
  return CORES_COMPARACAO_FALLBACK.find(c => !usadas.has(c))
    ?? CORES_COMPARACAO_FALLBACK[prev.length % CORES_COMPARACAO_FALLBACK.length];
}

export function token() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ub_token") ?? "";
}

export function fmt(n: number | null | undefined) {
  if (n == null) return "-";
  return Number(n).toLocaleString("pt-BR");
}
