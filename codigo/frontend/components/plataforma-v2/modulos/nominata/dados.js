/* ============================================================
   NOMINATA · DATA LAYER (1:1 com Designer V1.2)
   Fonte canônica: public/mockups/v1.2/F4-estatutario/07-saude-nominatas.data.js
   Não inventar dados - se precisar adicionar, atualizar mockup primeiro.
   ============================================================ */

export const NOMINATA_DATA = {
  // peso total = 100; cada uma 0-100; média ponderada vira o score
  SUBMEDIDAS: [
    { key: "paridade",   nm: "Paridade de gênero",      desc: "Cota mínima de 30% do gênero feminino, conforme Lei 9.504/97 art.10§3", peso: 16 },
    { key: "faixa",      nm: "Distribuição etária",     desc: "Heterogeneidade da nominata em faixas etárias - evita concentração 50+", peso: 10 },
    { key: "vinculacao", nm: "Vinculação territorial",  desc: "Candidatos com domicílio eleitoral e residência reais no município",     peso: 18 },
    { key: "experiencia",nm: "Experiência política",    desc: "Mistura entre nomes consolidados e renovação - evita lista totalmente novata", peso: 14 },
    { key: "documental", nm: "Conformidade documental", desc: "Filiação ≥ 6 meses, ficha limpa Lei Complementar 135/2010, prestação de contas TSE", peso: 18 },
    { key: "ativacao",   nm: "Ativação de base",        desc: "Filiados ativos × candidatos · ratio mínimo · presença em diretório",   peso: 12 },
    { key: "hist",       nm: "Histórico eleitoral",     desc: "Performance em pleitos anteriores · % votos candidato/coligação",       peso: 12 },
  ],

  COMISSOES: [
    {
      id: "bauru",
      nm: "Bauru",
      uf: "SP",
      pop: 379146,
      area: "Centro-Oeste paulista",
      pres: { nm: "Suéllen Rosim", cargo: "Pres. Municipal UB · Bauru", av: "SR" },
      filiados: 4287,
      candidatos: 18,
      mandato: "2024-2028",
      scores: { paridade: 92, faixa: 88, vinculacao: 95, experiencia: 78, documental: 96, ativacao: 84, hist: 71 },
      tier: "ok",
      flags: [],
      ult_atualizacao: "há 2h · cron Mazzel",
    },
    {
      id: "marilia",
      nm: "Marília",
      uf: "SP",
      pop: 240590,
      area: "Centro-Oeste paulista",
      pres: { nm: "Daniel Alonso", cargo: "Pres. Municipal UB · Marília", av: "DA" },
      filiados: 2104,
      candidatos: 16,
      mandato: "2024-2028",
      scores: { paridade: 62, faixa: 71, vinculacao: 88, experiencia: 65, documental: 70, ativacao: 58, hist: 62 },
      tier: "high",
      flags: [
        { tipo: "warn", label: "Cota de gênero abaixo do mínimo legal · 25% < 30%" },
        { tipo: "warn", label: "2 candidatos com pendência de Ficha Limpa em validação" },
        { tipo: "info", label: "Ativação de base 58/100 · ratio de 131 filiados por candidato" },
      ],
      ult_atualizacao: "há 2h · cron Mazzel",
    },
    {
      id: "tatui",
      nm: "Tatuí",
      uf: "SP",
      pop: 124815,
      area: "Sudoeste paulista",
      pres: { nm: "Luiz Sales", cargo: "Pres. Municipal UB · Tatuí · diligência aberta", av: "LS" },
      filiados: 8412,
      candidatos: 22,
      mandato: "2024-2028",
      scores: { paridade: 38, faixa: 42, vinculacao: 28, experiencia: 35, documental: 22, ativacao: 18, hist: 31 },
      tier: "crit",
      flags: [
        { tipo: "danger", label: "Pulso de filiação em massa · 412 novos filiados em 18/03/2025 (1 dia)" },
        { tipo: "danger", label: "9 candidatos sem domicílio eleitoral local · acima do limite estatutário" },
        { tipo: "danger", label: "4 candidatos com Ficha Limpa pendente · LC 135/2010" },
        { tipo: "danger", label: "Prestação de contas TSE 2024 · em mora há 4 meses" },
        { tipo: "warn", label: "Cota de gênero 18% · muito abaixo do mínimo legal de 30%" },
        { tipo: "warn", label: "6 candidatos com mesma origem geográfica externa (Sorocaba)" },
      ],
      ult_atualizacao: "há 17min · cron Mazzel · prioridade ALTA",
    },
  ],

  // SP tem 645 municípios · 18 amostras representativas pra ranking/heatmap
  // x/y são coords do mockup SVG do Designer (700×720). HeatmapSP converte
  // pra lat/lng aproximados antes de plotar no MapLibre.
  COMISSOES_SECUNDARIAS: [
    { id: "sao-paulo",   nm: "São Paulo",             pop: 12400000, score: 81, tier: "ok",   x: 525, y: 460 },
    { id: "guarulhos",   nm: "Guarulhos",             pop: 1400000,  score: 78, tier: "ok",   x: 540, y: 450 },
    { id: "campinas",    nm: "Campinas",              pop: 1223000,  score: 84, tier: "ok",   x: 458, y: 440 },
    { id: "sao-jose",    nm: "São José dos Campos",   pop: 729000,   score: 86, tier: "ok",   x: 580, y: 442 },
    { id: "sorocaba",    nm: "Sorocaba",              pop: 689000,   score: 65, tier: "high", x: 460, y: 478 },
    { id: "ribeirao",    nm: "Ribeirão Preto",        pop: 720000,   score: 80, tier: "ok",   x: 372, y: 358 },
    { id: "sbo",         nm: "Santa Bárbara d'Oeste", pop: 197000,   score: 48, tier: "high", x: 442, y: 432 },
    { id: "santos",      nm: "Santos",                pop: 433000,   score: 76, tier: "ok",   x: 530, y: 532 },
    { id: "osasco",      nm: "Osasco",                pop: 731000,   score: 67, tier: "high", x: 510, y: 458 },
    { id: "piracicaba",  nm: "Piracicaba",            pop: 410000,   score: 72, tier: "ok",   x: 432, y: 422 },
    { id: "aracatuba",   nm: "Araçatuba",             pop: 199000,   score: 70, tier: "ok",   x: 215, y: 380 },
    { id: "pres-prud",   nm: "Pres. Prudente",        pop: 232000,   score: 56, tier: "high", x: 175, y: 420 },
    { id: "sjrp",        nm: "S.J. Rio Preto",        pop: 480000,   score: 73, tier: "ok",   x: 305, y: 348 },
    { id: "jundiai",     nm: "Jundiaí",               pop: 432000,   score: 79, tier: "ok",   x: 488, y: 444 },
    { id: "limeira",     nm: "Limeira",               pop: 311000,   score: 38, tier: "crit", x: 425, y: 408 },
    { id: "caraguatatuba",nm: "Caraguatatuba",        pop: 130000,   score: 42, tier: "crit", x: 615, y: 488 },
    { id: "itapeva",     nm: "Itapeva",               pop: 93000,    score: 58, tier: "high", x: 380, y: 510 },
    { id: "braganca",    nm: "Bragança Paulista",     pop: 167000,   score: 81, tier: "ok",   x: 502, y: 422 },
  ],

  // linguagem neutra · "padrão atípico detectado", nunca "fraude" ou "crime"
  ALERTAS: [
    {
      id: "ALN-3829", sev: "crit",
      titulo: "Pulso de filiação atípico detectado",
      desc: "412 filiações registradas em 18/03/2025 (1 dia) na comissão Tatuí · 21× a média móvel histórica. Pode indicar mobilização legítima OU lista pré-fabricada. Investigar manualmente.",
      target: "Tatuí · UB-SP", comissao: "tatui",
      when: "há 17min", when_tag: "AGORA",
      channels: ["push", "email", "in-app"],
      logica: "Pulse > 5σ acima da média móvel de 90 dias",
    },
    {
      id: "ALN-3825", sev: "crit",
      titulo: "Concentração de origem geográfica na nominata",
      desc: "6 dos 22 candidatos de Tatuí têm domicílio eleitoral em Sorocaba (cidade vizinha). Padrão pode indicar transferência de eleitores. Estatuto art. 38 · validar.",
      target: "Tatuí · UB-SP", comissao: "tatui",
      when: "há 1h", when_tag: "AGORA",
      channels: ["push", "email", "whatsapp"],
      logica: "Cluster K-means de origem por chapa",
    },
    {
      id: "ALN-3820", sev: "crit",
      titulo: "Prestação de contas TSE em mora prolongada",
      desc: "Comissão Municipal Tatuí · prestação 2024 sem protocolo no TSE há 4 meses. Risco de indeferimento da nominata 2026. Notificar presidência.",
      target: "Tatuí · UB-SP", comissao: "tatui",
      when: "ontem 22:14", when_tag: "24h",
      channels: ["push", "email", "in-app"],
      logica: "Cron diário · cruza TSE × calendário estatutário",
    },
    {
      id: "ALN-3815", sev: "high",
      titulo: "Cota de gênero abaixo do mínimo legal",
      desc: "Marília · 25% mulheres na nominata · Lei 9.504/97 art.10§3 exige 30% mínimo. Risco jurídico de impugnação. Sugestão: 2 candidaturas femininas adicionais.",
      target: "Marília · UB-SP", comissao: "marilia",
      when: "há 6h", when_tag: "24h",
      channels: ["email", "in-app"],
      logica: "Validador legal por nominata",
    },
    {
      id: "ALN-3812", sev: "high",
      titulo: "Ficha Limpa pendente em candidatos",
      desc: "4 candidatos em Tatuí + 2 em Marília com pendências judiciais sob LC 135/2010. Validação manual obrigatória antes do registro de candidatura.",
      target: "Tatuí + Marília · UB-SP", comissao: "tatui",
      when: "há 8h", when_tag: "24h",
      channels: ["email", "in-app"],
      logica: "Cruzamento CNJ · TJ-SP · TRE",
    },
    {
      id: "ALN-3805", sev: "med",
      titulo: "Documentos estatutários vencendo · Limeira",
      desc: "Procuração e Ata de eleição da Comissão Municipal de Limeira vencem em 28 dias. Renovação automática via DocuSign disponível.",
      target: "Limeira · UB-SP", comissao: "limeira",
      when: "há 2 dias", when_tag: "semana",
      channels: ["in-app"],
      logica: "Cron semanal · janela de vencimento 30d",
    },
  ],

  REGRAS: [
    { nm: "Pulso de filiação > 5σ",       desc: "Detecta picos diários de filiação 5+ desvios padrão acima da média móvel 90d", sev: "crit", channels: ["push", "email"], freq: "tempo real" },
    { nm: "Cota de gênero < 30%",         desc: "Lei 9.504/97 art.10§3 · validador legal",                                       sev: "high", channels: ["email"],         freq: "a cada nominata" },
    { nm: "Ficha Limpa pendente",         desc: "Cruza CNJ + TJ + TRE com nominata · LC 135/2010",                              sev: "high", channels: ["email"],         freq: "diário" },
    { nm: "Prestação contas TSE em mora", desc: "Verifica protocolo TSE × calendário estatutário",                              sev: "crit", channels: ["push", "email"], freq: "diário" },
    { nm: "Concentração geográfica",      desc: "K-means de domicílio eleitoral por chapa · alerta cluster externo",            sev: "high", channels: ["email"],         freq: "a cada nominata" },
    { nm: "Documentos vencendo 30d",      desc: "Procuração, Ata, Estatuto local · renovação automática sugerida",              sev: "med",  channels: ["in-app"],        freq: "semanal" },
  ],
};

export const SUBMED_SHORT = {
  paridade: "PARIDADE",
  faixa: "FAIXA ETÁRIA",
  vinculacao: "VINCULAÇÃO",
  experiencia: "EXPERIÊNCIA",
  documental: "CONFORMIDADE",
  ativacao: "ATIVAÇÃO",
  hist: "HISTÓRICO",
};
