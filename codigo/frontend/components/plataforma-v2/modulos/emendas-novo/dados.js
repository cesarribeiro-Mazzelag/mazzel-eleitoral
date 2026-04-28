/* Emendas · DATA LAYER (1:1 com Designer V1.2)
 * Fonte: public/mockups/v1.2/F3-modulos/04-modulo-emendas.data.js (363 linhas)
 *
 * Caso âncora central: Santa Bárbara d'Oeste (SP) score 87 CRÍTICO
 * (EMD-2025-014729 · André Amaral UNIÃO-PB · R$ 35M · sem ligação eleitoral
 * + finalidade vaga + autor sem votos em SBO em 2022).
 *
 * 20 municípios SP · 10 parlamentares · 9 emendas · 7 alertas · 6 regras.
 */

export const TABS = [
  { id: "map",    num: "01", label: "Mapa de Emendas" },
  { id: "dossie", num: "02", label: "Dossiê da Emenda" },
  { id: "flux",   num: "03", label: "Fluxo · Sankey" },
  { id: "inc",    num: "04", label: "Inconsistências", badge: "5" },
  { id: "alert",  num: "05", label: "Alertas",         badge: "3" },
];

// Topbar Milton-CEO 3 perguntas em ≤3s
export const TOPBAR_3_PERGUNTAS = [
  { lbl: "Quanto chegou em SP?",  v: "R$ 547M",          delta: "2024-26" },
  { lbl: "Inconsistências",        v: "5 críticas",       warn: true,           sub: "R$ 124M sob suspeita" },
  { lbl: "Concentração suspeita",  v: "SBO + Registro",  alert: true,          sub: "2 cidades · 8.4x benchmark" },
];

export const MUNICIPIOS = [
  { id: "sp",   nm: "São Paulo",                 x: 660, y: 440, pop: 12330000, total: 89400000, score: 18, status: "ok",   area: "Capital · RM" },
  { id: "cps",  nm: "Campinas",                  x: 580, y: 380, pop: 1223000,  total: 28700000, score: 24, status: "ok",   area: "RMC" },
  { id: "sbo",  nm: "Santa Bárbara d'Oeste",     x: 545, y: 365, pop: 195000,   total: 78200000, score: 87, status: "crit", area: "RMC", flag: "INCONSISTÊNCIA · 2 emendas críticas" },
  { id: "amer", nm: "Americana",                  x: 555, y: 350, pop: 240000,   total: 11400000, score: 32, status: "ok",   area: "RMC" },
  { id: "lim",  nm: "Limeira",                    x: 520, y: 340, pop: 308000,   total: 14100000, score: 38, status: "ok",   area: "RMC" },
  { id: "pir",  nm: "Piracicaba",                 x: 510, y: 380, pop: 410000,   total: 19800000, score: 28, status: "ok",   area: "Centro" },
  { id: "rib",  nm: "Ribeirão Preto",             x: 480, y: 280, pop: 720000,   total: 42600000, score: 22, status: "ok",   area: "Norte" },
  { id: "sjc",  nm: "São José dos Campos",        x: 770, y: 430, pop: 730000,   total: 38900000, score: 26, status: "ok",   area: "Vale" },
  { id: "sant", nm: "Santos",                     x: 700, y: 510, pop: 433000,   total: 22300000, score: 30, status: "ok",   area: "Baixada" },
  { id: "guar", nm: "Guarulhos",                  x: 680, y: 425, pop: 1390000,  total: 31800000, score: 31, status: "ok",   area: "RMSP" },
  { id: "sor",  nm: "Sorocaba",                   x: 580, y: 460, pop: 695000,   total: 26700000, score: 25, status: "ok",   area: "Sudoeste" },
  { id: "bau",  nm: "Bauru",                      x: 380, y: 360, pop: 380000,   total: 16400000, score: 35, status: "ok",   area: "Centro-oeste" },
  { id: "sjp",  nm: "São José do Rio Preto",      x: 320, y: 240, pop: 480000,   total: 22900000, score: 28, status: "ok",   area: "Noroeste" },
  { id: "mar",  nm: "Marília",                    x: 300, y: 380, pop: 240000,   total: 9200000,  score: 33, status: "ok",   area: "Centro-oeste" },
  { id: "pres", nm: "Presidente Prudente",         x: 200, y: 360, pop: 230000,   total: 8900000,  score: 41, status: "high", area: "Oeste" },
  { id: "frc",  nm: "Franca",                     x: 460, y: 220, pop: 360000,   total: 14600000, score: 36, status: "ok",   area: "Norte" },
  { id: "jund", nm: "Jundiaí",                    x: 620, y: 405, pop: 420000,   total: 17300000, score: 24, status: "ok",   area: "RMSP" },
  { id: "reg",  nm: "Registro",                    x: 660, y: 580, pop: 56000,    total: 22400000, score: 76, status: "crit", area: "Vale Ribeira", flag: "INCONSISTÊNCIA · Volume 7x acima do esperado" },
  { id: "arar", nm: "Araraquara",                  x: 440, y: 320, pop: 240000,   total: 11200000, score: 30, status: "ok",   area: "Centro" },
  { id: "ita",  nm: "Itapeva",                    x: 500, y: 540, pop: 95000,    total: 18600000, score: 68, status: "high", area: "Sudoeste", flag: "Volume acima do esperado · investigar" },
];

export const PARLAMENTARES = {
  kim_kataguiri:    { nm: "Kim Kataguiri",        partido: "UNIÃO", cargo: "Deputado Federal", uf: "SP", av: "KK" },
  eduardo_bolsonaro:{ nm: "Eduardo Bolsonaro",    partido: "PL",    cargo: "Deputado Federal", uf: "SP", av: "EB" },
  tabata_amaral:    { nm: "Tabata Amaral",        partido: "PSB",   cargo: "Deputada Federal", uf: "SP", av: "TA" },
  arthur_moledo:    { nm: "Arthur do Val",        partido: "NOVO",  cargo: "Deputado Federal", uf: "SP", av: "AM" },
  rodrigo_gambale:  { nm: "Rodrigo Gambale",      partido: "UNIÃO", cargo: "Deputado Federal", uf: "SP", av: "RG", nota: "Domicílio eleitoral: Santo André (Grande SP)" },
  jose_oliveira:    { nm: "José Oliveira Junior", partido: "UNIÃO", cargo: "Deputado Federal", uf: "SP", av: "JO" },
  capitao_augusto:  { nm: "Capitão Augusto",      partido: "PL",    cargo: "Deputado Federal", uf: "SP", av: "CA" },
  mara_gabrilli:    { nm: "Mara Gabrilli",        partido: "PSDB",  cargo: "Senadora",         uf: "SP", av: "MG" },
  damares:          { nm: "Damares Alves",        partido: "REPUB", cargo: "Senadora",         uf: "DF", av: "DA" },
  andre_amaral:     { nm: "André Amaral Filho",   partido: "UNIÃO", cargo: "Deputado Federal", uf: "PB", av: "AA", nota: "Sem ligação eleitoral com SP · 0 votos no estado" },
};

export const EMENDAS = [
  // CASO CENTRAL · 3 emendas SBO
  {
    id: "EMD-2025-014729",
    titulo: "Apoio ao desenvolvimento social e estrutural do município",
    autor: "andre_amaral", municipio: "sbo",
    valor: 35000000, valor_pago: 18400000,
    rp: "RP-6", categoria: "Infraestrutura urbana",
    finalidade: "Apoio ao desenvolvimento - sem objeto especificado",
    finalidade_score: 12,
    orgao_executor: "Secretaria Municipal de Obras",
    status: "em_execucao",
    score: 92, tier: "crit",
    dimensoes: { volume: 95, autor: 98, finalidade: 88, concentracao: 82, execucao: 78 },
    motivos: [
      { tipo: "danger", label: "Volume 8.4x acima do benchmark de cidades similares" },
      { tipo: "danger", label: "Autor sem ligação eleitoral · 0 votos em SBO em 2022" },
      { tipo: "danger", label: "Finalidade vaga · NLP score 12/100" },
      { tipo: "warn",   label: "Liquidada sem nota fiscal pública vinculada" },
    ],
  },
  {
    id: "EMD-2025-018221",
    titulo: "Aquisição de equipamentos hospitalares (não especificados)",
    autor: "capitao_augusto", municipio: "sbo",
    valor: 28500000, valor_pago: 28500000,
    rp: "RP-6", categoria: "Saúde",
    finalidade: "Equipamentos para Hospital Municipal",
    score: 73, tier: "crit",
    dimensoes: { volume: 78, autor: 60, finalidade: 72, concentracao: 88, execucao: 65 },
    status: "paga",
    motivos: [
      { tipo: "danger", label: "Mesmo cluster de 3 autores envia repetidamente para SBO" },
      { tipo: "warn",   label: "Volume 4.6x acima da média per capita de cidades similares" },
      { tipo: "warn",   label: "Equipamento 'não especificado' · NLP detectou ambiguidade" },
    ],
  },
  {
    id: "EMD-2025-008431",
    titulo: "Repavimentação de vias urbanas",
    autor: "rodrigo_gambale", municipio: "sbo",
    valor: 14700000, valor_pago: 8800000,
    rp: "RP-6", categoria: "Infraestrutura urbana",
    finalidade: "Pavimentação asfáltica de 18 km de vias",
    score: 32, tier: "ok",
    dimensoes: { volume: 38, autor: 25, finalidade: 18, concentracao: 50, execucao: 28 },
    status: "em_execucao",
  },
  // ATENÇÃO
  {
    id: "EMD-2025-021004",
    titulo: "Construção de centro multiuso",
    autor: "andre_amaral", municipio: "reg",
    valor: 22400000, valor_pago: 0,
    rp: "RP-6", categoria: "Infraestrutura",
    finalidade: "Apoio à construção de equipamento social",
    score: 76, tier: "crit",
    status: "aprovada",
    dimensoes: { volume: 92, autor: 90, finalidade: 70, concentracao: 60, execucao: 30 },
    motivos: [
      { tipo: "danger", label: "Volume 7.2x o benchmark · cidade pequena (56k hab)" },
      { tipo: "danger", label: "Mesmo autor da EMD-2025-014729 · padrão coordenado" },
      { tipo: "warn",   label: "Finalidade vaga" },
    ],
  },
  {
    id: "EMD-2025-009872",
    titulo: "Modernização da rede de saúde básica",
    autor: "tabata_amaral", municipio: "ita",
    valor: 18600000, valor_pago: 6200000,
    rp: "RP-9", categoria: "Saúde",
    finalidade: "Reforma de 4 UBS + aquisição de equipamentos pediátricos",
    score: 56, tier: "high",
    status: "em_execucao",
    dimensoes: { volume: 70, autor: 30, finalidade: 18, concentracao: 35, execucao: 50 },
    motivos: [
      { tipo: "warn", label: "Volume acima do esperado · cidade pequena (95k hab)" },
      { tipo: "warn", label: "Atraso entre liquidação e pagamento (6 meses)" },
    ],
  },
  {
    id: "EMD-2025-011503",
    titulo: "Apoio a entidade beneficente",
    autor: "jose_oliveira", municipio: "pres",
    valor: 8900000, valor_pago: 4200000,
    rp: "RP-6", categoria: "Assistência social",
    finalidade: "Apoio institucional · entidade não nominada",
    score: 51, tier: "high",
    status: "em_execucao",
    dimensoes: { volume: 52, autor: 40, finalidade: 84, concentracao: 30, execucao: 32 },
    motivos: [
      { tipo: "warn", label: "Finalidade vaga · entidade beneficiária não identificada" },
    ],
  },
  // OK
  {
    id: "EMD-2024-088712",
    titulo: "Ampliação do Hospital das Clínicas - Ribeirão Preto",
    autor: "mara_gabrilli", municipio: "rib",
    valor: 42000000, valor_pago: 41800000,
    rp: "RP-6", categoria: "Saúde",
    finalidade: "Ampliação da ala oncológica · 80 leitos · execução pela USP",
    score: 14, tier: "ok",
    status: "paga",
    dimensoes: { volume: 22, autor: 5, finalidade: 4, concentracao: 12, execucao: 8 },
  },
  {
    id: "EMD-2024-072100",
    titulo: "Aeroporto · ampliação de pista",
    autor: "kim_kataguiri", municipio: "sjc",
    valor: 38500000, valor_pago: 24100000,
    rp: "RP-9", categoria: "Infraestrutura · obra estrutural",
    finalidade: "Ampliação de pista do Aeroporto Prof. Urbano Ernesto Stumpf",
    score: 18, tier: "ok",
    status: "em_execucao",
    dimensoes: { volume: 28, autor: 8, finalidade: 6, concentracao: 18, execucao: 12 },
  },
  {
    id: "EMD-2025-003241",
    titulo: "Centro de pesquisa agropecuária - Esalq",
    autor: "tabata_amaral", municipio: "pir",
    valor: 12600000, valor_pago: 8400000,
    rp: "RP-6", categoria: "Educação · pesquisa",
    finalidade: "Modernização de laboratório de fitopatologia · ESALQ-USP",
    score: 12, tier: "ok",
    status: "em_execucao",
    dimensoes: { volume: 18, autor: 4, finalidade: 2, concentracao: 10, execucao: 14 },
  },
];

export const ALERTAS = [
  { id: "AL-9821", sev: "crit", when: "Hoje · 09:14",  when_tag: "AGORA",   titulo: "Nova emenda com score 92 detectada · SBO",         desc: "EMD-2025-014729 · André Amaral (UNIÃO-PB) → Santa Bárbara d'Oeste · R$ 35M · finalidade vaga + autor sem ligação", channels: ["push","email","whatsapp"], target: "Pres Estadual + Tesoureiro Estadual" },
  { id: "AL-9820", sev: "crit", when: "Hoje · 07:42",  when_tag: "AGORA",   titulo: "Padrão coordenado detectado · 3 autores → mesma cidade", desc: "Cluster: Amaral (UNIÃO-PB) + Augusto (PL-SP) + Oliveira (UNIÃO-SP) → SBO · R$ 78.2M cumulativo em 12 meses", channels: ["push","email","whatsapp"], target: "Pres Estadual" },
  { id: "AL-9815", sev: "high", when: "Ontem · 22:08", when_tag: "24h",     titulo: "Emenda paga sem nota fiscal pública",                desc: "EMD-2025-018221 · Capitão Augusto (PL-SP) → SBO · R$ 28.5M · pagamento integral sem comprovação na CGU", channels: ["push","email"], target: "Pres Estadual + Pres Municipal SBO" },
  { id: "AL-9810", sev: "high", when: "Ontem · 14:30", when_tag: "24h",     titulo: "Emenda Registro · score 76",                          desc: "EMD-2025-021004 · André Amaral → Registro · R$ 22.4M · mesmo autor da EMD crítica em SBO", channels: ["push","email"], target: "Pres Estadual" },
  { id: "AL-9802", sev: "med",  when: "23/04",         when_tag: "semana",  titulo: "Nova emenda regular · Itapeva",                       desc: "EMD-2025-009872 · Tabata Amaral → Itapeva · R$ 18.6M · Saúde · score 56", channels: ["inapp","email-digest"], target: "Pres Municipal Itapeva" },
  { id: "AL-9801", sev: "med",  when: "22/04",         when_tag: "semana",  titulo: "Atualização de empenho · Pres. Prudente",            desc: "EMD-2025-011503 · José Oliveira → Pres. Prudente · 47% liquidado", channels: ["inapp","email-digest"], target: "Pres Municipal Pres. Prudente" },
  { id: "AL-9789", sev: "low",  when: "21/04",         when_tag: "semana",  titulo: "Emenda paga · Hospital de Ribeirão",                  desc: "EMD-2024-088712 · pagamento final R$ 41.8M · obra estrutural", channels: ["inapp"], target: "Tesoureiro local" },
];

export const REGRAS = [
  { sev: "crit", nm: "Nova emenda · score > 70",       desc: "Dispara push + email + WhatsApp em tempo real para Pres Estadual e Tesoureiro Estadual.",  channels: ["push","email","whatsapp"], freq: "Real-time · debounce 5min", enabled: true },
  { sev: "crit", nm: "Padrão coordenado detectado",   desc: "Cluster de ≥ 3 autores convergindo na mesma cidade em janela de 12 meses.",                channels: ["push","email","whatsapp"], freq: "Diário · 06h scan",        enabled: true },
  { sev: "high", nm: "Pago sem nota fiscal",            desc: "Emenda liquidada/paga sem nota fiscal vinculada na CGU em até 90 dias.",                  channels: ["push","email"],            freq: "Diário",                    enabled: true },
  { sev: "high", nm: "Atraso entre marcos > 6 meses", desc: "Aprovada sem empenho ou liquidada sem pagamento por mais de 180 dias.",                    channels: ["push","email"],            freq: "Semanal",                    enabled: true },
  { sev: "med",  nm: "Nova emenda aprovada · normal", desc: "Emendas com score ≤ 40 entram no digest diário do Pres Municipal correspondente.",        channels: ["inapp","email-digest"],    freq: "Digest 07h",                enabled: true },
  { sev: "low",  nm: "Atualização de status",           desc: "Mudanças de fase (paga, liquidada) sem anomalia. In-app apenas.",                         channels: ["inapp"],                    freq: "Tempo real",                enabled: true },
];

export const STATUS_LABEL = {
  em_execucao: "EM EXECUÇÃO",
  aprovada:    "APROVADA",
  paga:        "PAGA",
};

export const TIER_COLOR = {
  ok:   "#16a34a",
  high: "#f59e0b",
  crit: "#dc2626",
};

export const SEV_LABEL = {
  crit: "CRÍTICO",
  high: "ALTO",
  med:  "MÉDIO",
  low:  "BAIXO",
};

export const SEV_COLOR = {
  crit: "#dc2626",
  high: "#f59e0b",
  med:  "#60a5fa",
  low:  "#94a3b8",
};
