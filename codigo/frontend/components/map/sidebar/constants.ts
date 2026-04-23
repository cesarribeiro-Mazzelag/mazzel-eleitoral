// Constantes compartilhadas pela sidebar refatorada.
// Extraidas de BarraLateral.tsx sem alterar semantica.

export const NOME_ESTADO: Record<string, string> = {
  AC:"Acre", AL:"Alagoas", AM:"Amazonas", AP:"Amapá", BA:"Bahia",
  CE:"Ceará", DF:"Distrito Federal", ES:"Espírito Santo", GO:"Goiás",
  MA:"Maranhão", MG:"Minas Gerais", MS:"Mato Grosso do Sul", MT:"Mato Grosso",
  PA:"Pará", PB:"Paraíba", PE:"Pernambuco", PI:"Piauí", PR:"Paraná",
  RJ:"Rio de Janeiro", RN:"Rio Grande do Norte", RO:"Rondônia", RR:"Roraima",
  RS:"Rio Grande do Sul", SC:"Santa Catarina", SE:"Sergipe", SP:"São Paulo",
  TO:"Tocantins",
};

export const ORDEM_CARGO = [
  "PRESIDENTE", "GOVERNADOR", "SENADOR",
  "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "PREFEITO", "VEREADOR",
];

export const CARGOS_SEM_ABA_NAO_ELEITO = new Set(["PRESIDENTE", "GOVERNADOR", "PREFEITO"]);

export const COR_CARGO: Record<string, string> = {
  PRESIDENTE:            "bg-purple-100 text-purple-800",
  GOVERNADOR:            "bg-brand-100 text-brand-800",
  SENADOR:               "bg-sky-100 text-sky-800",
  "DEPUTADO FEDERAL":    "bg-teal-100 text-teal-800",
  "DEPUTADO ESTADUAL":   "bg-green-100 text-green-800",
  PREFEITO:              "bg-orange-100 text-orange-800",
  VEREADOR:              "bg-amber-100 text-amber-800",
};

// Abreviações padrão Globo/G1 pra siglas longas. Tabela curada — não auto-truncar
// no meio (REPUBLICANOS → RE... fica ilegível). Cesar 19/04: "padrão Globo:
// REPUBLICANOS vira REP, SOLIDARIEDADE vira SD, super curto".
export const SIGLA_CURTA: Record<string, string> = {
  "REPUBLICANOS":   "REP",
  "SOLIDARIEDADE":  "SD",
  "PROGRESSISTAS":  "PP",       // sigla oficial TSE já é PP
  "CIDADANIA":      "CID",
  "PODEMOS":        "POD",
  "PATRIOTA":       "PATRI",
  "DEMOCRACIA CRISTÃ": "DC",
  "MOBILIZA":       "MOB",
  "AGIR":           "AGIR",
  "AVANTE":         "AVANTE",
  "NOVO":           "NOVO",
};

// Partidos com LOGO HORIZONTAL (wordmark ou proporção > 1:1). Container ganha
// 25% mais largura (50×40 em vez de 40×40) pra o logo não ficar espremido.
// Lista curada baseada nos arquivos /logos/partidos/*.png.
export const LOGO_HORIZONTAL = new Set([
  "PP", "PROGRESSISTAS",
  "REPUBLICANOS",
  "CIDADANIA",
  "PODEMOS",
  "AVANTE",
  "AGIR",
  "SOLIDARIEDADE",
  "MOBILIZA",
  "NOVO",
  "PATRIOTA",
  "PSB",        // PSB40 com número ao lado
  "DC",
  "REDE",
  "UNIÃO",      // UNIÃO BRASIL é wordmark
  "UNIÃO BRASIL",
]);

// Municípios sem prefeito registrado pelo TSE (eleição anulada ou candidatos
// indeferidos/cassados). Dados oficiais do TSE em abril/2026 - refletimos o que
// a fonte oficial informa. Card explicativo evita usuário achar que é bug.
export const SUPLEMENTARES_PENDENTES_2026: Record<string, { data: string; motivo: string }> = {
  // Cassados/indeferidos após posse - aguardam suplementar 2026 (TRE-MG / TRE-SP)
  "3102506": { data: "21/06/2026", motivo: "Candidato eleito cassado por abuso de poder" },
  "3108255": { data: "21/06/2026", motivo: "Candidato eleito indeferido por inelegibilidade" },
  "3141603": { data: "A definir",  motivo: "Candidato eleito condenado criminalmente" },
  "3507753": { data: "17/05/2026", motivo: "Prefeito e vice cassados por abuso de poder econômico" },
  "3542503": { data: "A definir",  motivo: "Candidato eleito inelegível (fraude à cota de gênero)" },
  "3554953": { data: "A definir",  motivo: "Candidato eleito indeferido pela Lei da Ficha Limpa" },
  // Eleições anuladas pelo TSE - TSE mantém status #NULO até suplementar
  "5200852": { data: "A definir",  motivo: "Eleição anulada pelo TSE" },                // Americano do Brasil/GO
  "5210208": { data: "A definir",  motivo: "Eleição anulada pelo TSE" },                // Iporá/GO
  "2100709": { data: "A definir",  motivo: "Eleição anulada pelo TSE" },                // Anajatuba/MA
  "2104909": { data: "A definir",  motivo: "Eleição anulada pelo TSE" },                // Guimarães/MA
  "2110237": { data: "A definir",  motivo: "Eleição anulada pelo TSE" },                // Santana do Maranhão/MA
  "2800605": { data: "A definir",  motivo: "Eleição anulada pelo TSE" },                // Barra dos Coqueiros/SE
  "2801603": { data: "A definir",  motivo: "Eleição anulada pelo TSE" },                // Cedro de São João/SE
  "2804805": { data: "A definir",  motivo: "Eleição anulada pelo TSE" },                // Nossa Senhora do Socorro/SE
  // Casos especiais: STF mantém prefeito em exercício mesmo com eleição anulada pelo TSE
  "1508100": { data: "Suspensa (STF)", motivo: "Eleição anulada pelo TSE; STF suspendeu suplementar e mantém prefeito em exercício" }, // Tucuruí/PA
  "3302007": { data: "Via STF",        motivo: "Eleição anulada pelo TSE; prefeito empossado por decisão do STF" },                     // Itaguaí/RJ
};

// Labels semanticos da escala 5-0. Forte no topo, fraco na base.
// P2-5 fix: separa "escala de concentracao" (5-1, continua) de estado "Sem dados"
// (0, categorico). Antes misturava "Dominio absoluto" com "Sem presenca" como se
// fossem pontos da mesma regua, confundindo o usuario.
export const LABELS_ESCALA_ELEITOS: Record<number, string> = {
  5: "Alta concentração",
  4: "Forte presença",
  3: "Presença moderada",
  2: "Baixa presença",
  1: "Presença residual",
  0: "Sem dados",
};
export const LABELS_ESCALA_VOTOS: Record<number, string> = {
  5: "Mais votado",
  4: "Muito votado",
  3: "Votacao media",
  2: "Votacao baixa",
  1: "Votacao minima",
  0: "Sem votos",
};
