// Tipos compartilhados pela sidebar refatorada.
// Extraido de BarraLateral.tsx (bloco "Tipos") sem alterar shape.

export interface RankingPartido {
  numero: number; sigla: string; nome: string; logo_url: string | null;
  total_eleitos: number; total_votos: number; estados_presenca: number;
  pilar1_cadeiras: number; pilar2_votos_pct: number; pilar3_econ_pct: number;
  pib_controlado: number; pop_controlada: number; score_composto: number;
}

export interface MunicipioEleito {
  nome_urna: string; cargo: string; ano: number; votos: number;
  candidato_id: number; candidatura_id: number; foto_url: string | null;
  partido_sigla?: string; partido_num?: number;
}

export interface MunicipioData {
  municipio: { nome: string; estado_uf: string; populacao: number; pib_per_capita: number };
  farol: Array<{ cargo: string; status: string; eleitos_atual: number; votos_atual: number; ano: number }>;
  eleitos: MunicipioEleito[];
}
