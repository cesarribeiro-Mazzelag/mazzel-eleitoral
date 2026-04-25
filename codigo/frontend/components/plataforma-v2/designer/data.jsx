/* ==== shared data layer ==== */

const ARCHETYPES = {
  fenomeno:    { label: "Fenômeno",       cls: "chip-blue",   dot: "dot-blue" },
  trabalhador: { label: "Trabalhador",    cls: "chip-green",  dot: "dot-green" },
  articulador: { label: "Articulador",    cls: "chip-purple", dot: "dot-purple" },
  chefeBase:   { label: "Chefe de base",  cls: "chip-orange", dot: "dot-orange" },
};

const DIMENSIONS = [
  { key: "ATV", label: "Atividade",   hint: "Participação em votações e sessões" },
  { key: "LEG", label: "Legislativo", hint: "Autoria, relatoria e aprovação de PLs" },
  { key: "BSE", label: "Base",        hint: "Força eleitoral no colégio" },
  { key: "INF", label: "Influência",  hint: "Articulação e poder de pauta" },
  { key: "MID", label: "Mídia",       hint: "Exposição e engajamento público" },
  { key: "PAC", label: "Pactuação",   hint: "Capacidade de formar alianças" },
];

const STATS = {
  wagner: { ATV: 94, LEG: 79, BSE: 93, INF: 88, MID: 72, PAC: 91 },
  marcal: { ATV: 12, LEG:  4, BSE: 68, INF: 22, MID: 96, PAC: 18 },
};

const STAT_BREAKDOWN = {
  ATV: [
    { k: "Presença plenário",   v: 94, w: "40%" },
    { k: "Presença comissões",  v: 96, w: "30%" },
    { k: "Sessões conjuntas",   v: 91, w: "30%" },
  ],
  LEG: [
    { k: "PLs de autoria",      v: 82, w: "35%" },
    { k: "PLs aprovados",       v: 76, w: "40%" },
    { k: "Relatorias",          v: 80, w: "25%" },
  ],
  BSE: [
    { k: "Votação absoluta",    v: 95, w: "40%" },
    { k: "Capilaridade UF",     v: 92, w: "35%" },
    { k: "Fidelidade do eleitor", v: 90, w: "25%" },
  ],
  INF: [
    { k: "Liderança partidária", v: 90, w: "35%" },
    { k: "Cargos em comissões",  v: 85, w: "30%" },
    { k: "Rede de apoios",       v: 89, w: "35%" },
  ],
  MID: [
    { k: "Menções mídia",       v: 68, w: "40%" },
    { k: "Engajamento redes",   v: 74, w: "35%" },
    { k: "Entrevistas TV",      v: 75, w: "25%" },
  ],
  PAC: [
    { k: "Acordos interpartidários", v: 93, w: "50%" },
    { k: "Base governista",     v: 90, w: "30%" },
    { k: "Diálogo com oposição", v: 88, w: "20%" },
  ],
};

const PROFILES = {
  wagner: {
    id: "wagner",
    firstName: "JAQUES",
    lastName: "WAGNER",
    cargo: "SEN",
    meta: "SENADOR · BA · 2018",
    bio: "Ex-governador da Bahia (2007–2014), ex-ministro da Defesa e da Casa Civil. Base histórica do PT no Nordeste.",
    rating: 87,
    position: "SEN",
    shortName: "J. WAGNER",
    percentile: "Top 12% entre senadores",
    archetypes: ["fenomeno","trabalhador","articulador","chefeBase"],
    traits: [{ label: "Fenômeno", variant: "gold" }, { label: "Fera regional", variant: "silver" }],
    stats: [
      { k: "Mandatos", v: "04" },
      { k: "PL aprovados", v: "127" },
      { k: "Presença", v: "94%" },
      { k: "Emendas", v: "R$ 42M" },
    ],
    eleitoral: {
      uf: "BA", escopo: "ESTADO · BAHIA",
      votos: "4.2M", percentValidos: "48%", ano: "2018",
      topMunis: [
        { nome: "Salvador",        pct: 52, votos: "680K" },
        { nome: "Feira de Santana", pct: 49, votos: "210K" },
        { nome: "Vitória da Conquista", pct: 47, votos: "145K" },
      ],
      // abstract choropleth — array of polygons with intensity 0-100
      mapIntensity: { BA: 92, PE: 38, SE: 62, AL: 34, CE: 28, PI: 22, MA: 18, BR: 0 },
    },
    trajetoria: [
      { ano: "1986", cargo: "Vereador",         uf: "Salvador/BA", votos: "4.210",   status: "eleito", partido: "PT" },
      { ano: "1990", cargo: "Dep. Estadual",    uf: "BA",          votos: "38.540",  status: "eleito", partido: "PT" },
      { ano: "1994", cargo: "Dep. Federal",     uf: "BA",          votos: "62.100",  status: "eleito", partido: "PT" },
      { ano: "2002", cargo: "Dep. Federal",     uf: "BA",          votos: "89.320",  status: "eleito", partido: "PT" },
      { ano: "2006", cargo: "Governador",       uf: "BA",          votos: "3.187.000", status: "eleito", partido: "PT" },
      { ano: "2010", cargo: "Governador (reel.)", uf: "BA",        votos: "3.995.000", status: "eleito", partido: "PT" },
      { ano: "2014", cargo: "Min. Defesa / Casa Civil", uf: "BR",  votos: "—",       status: "nomeado", partido: "PT" },
      { ano: "2018", cargo: "Senador",          uf: "BA",          votos: "4.241.830", status: "eleito", partido: "PT" },
    ],
    legislativo: {
      disponivel: true,
      aprovados: { count: 127, recentes: [
        { em: "Marco legal das energias do mar",         data: "mar/25" },
        { em: "Fundo de segurança hídrica do Nordeste",   data: "fev/25" },
        { em: "Regulamentação do crédito rural familiar", data: "dez/24" },
      ]},
      tramitando: { count: 18, recentes: [
        { em: "Incentivo fiscal à indústria naval baiana", data: "abr/26" },
        { em: "Política nacional de agroecologia",        data: "mar/26" },
        { em: "Bônus de produtividade ao SUS municipal",  data: "fev/26" },
      ]},
      vetados: { count: 4, recentes: [
        { em: "Isenção de IPVA para veículos elétricos",  data: "out/24" },
        { em: "Remanejo emergencial de emendas RP-9",     data: "jun/24" },
        { em: "Criação do piso salarial técnico",         data: "mar/24" },
      ]},
      comissoes: [
        { sigla: "CRE",  nome: "Relações Exteriores e Defesa Nacional", cargo: "Presidente", ativa: true },
        { sigla: "CAE",  nome: "Assuntos Econômicos",                    cargo: "Titular",    ativa: true },
        { sigla: "CCJ",  nome: "Constituição e Justiça",                 cargo: "Suplente",   ativa: true },
        { sigla: "CRA",  nome: "Agricultura e Reforma Agrária",          cargo: "Titular",    ativa: true },
        { sigla: "CMA",  nome: "Meio Ambiente",                          cargo: "Vice",       ativa: false },
      ],
      relatorias: [
        { em: "PLS 421/2024 — Incentivo à energia eólica offshore", data: "abr/26", situ: "Em análise" },
        { em: "PLS 318/2024 — Regularização fundiária na zona rural", data: "mar/26", situ: "Aprovado" },
        { em: "PEC 12/2023 — Reforma do sistema portuário", data: "fev/26", situ: "Em análise" },
        { em: "PLS 104/2023 — Royalties do pré-sal", data: "nov/25", situ: "Aprovado" },
        { em: "PLS 088/2023 — Fundo estadual de turismo", data: "ago/25", situ: "Arquivado" },
      ],
    },
    alertas: {
      fichaLimpa: true,
      itens: [], // ficha limpa
    },
    financeiro: {
      disponivel: true,
      arrecadado: "R$ 18.420.000",
      gasto:       "R$ 17.810.000",
      saldo:       "R$ 610.000",
      cpv: { valor: "R$ 4,20", medianaCargo: "R$ 6,80", deltaPct: -38, label: "mediana senador BA" },
      fontes: [
        { k: "Fundo Partidário", v: 58 },
        { k: "Pessoa Física",    v: 24 },
        { k: "Pessoa Jurídica",  v:  9 },
        { k: "Recursos Próprios",v:  6 },
        { k: "Outros",           v:  3 },
      ],
      topDoadores: [
        { nome: "João Silva Ribeiro",       v: "R$ 410.000" },
        { nome: "Maria Helena Costa",       v: "R$ 380.000" },
        { nome: "Antônio Carlos Menezes",   v: "R$ 320.000" },
        { nome: "Luiza Almeida",            v: "R$ 280.000" },
        { nome: "Pedro Henrique Rocha",     v: "R$ 260.000" },
        { nome: "Ana Paula Moraes",         v: "R$ 240.000" },
        { nome: "Carlos Eduardo Freitas",   v: "R$ 220.000" },
        { nome: "Fernanda Braga",           v: "R$ 200.000" },
        { nome: "Roberto Souza",            v: "R$ 180.000" },
        { nome: "Gabriela Nunes",           v: "R$ 160.000" },
      ],
    },
    emendas: {
      aplicavel: true,
      apresentado:  "R$ 82.500.000",
      aprovado:     "R$ 61.200.000",
      executado:    "R$ 42.100.000",
      taxa: 69,
      anual: [
        { ano: "2019", v: 22 },
        { ano: "2020", v: 38 },
        { ano: "2021", v: 51 },
        { ano: "2022", v: 58 },
        { ano: "2023", v: 64 },
        { ano: "2024", v: 72 },
        { ano: "2025", v: 69 },
      ],
      areas: [
        { k: "Saúde",            v: 34, c: "#3b82f6" },
        { k: "Educação",         v: 22, c: "#22c55e" },
        { k: "Obras",            v: 20, c: "#f97316" },
        { k: "Assist. Social",    v: 14, c: "#a855f7" },
        { k: "Cultura",          v: 10, c: "#eab308" },
      ],
      top: [
        { muni: "Salvador/BA",         area: "Saúde",     v: "R$ 4.200.000", st: "Pago" },
        { muni: "Feira de Santana/BA", area: "Educação",  v: "R$ 3.100.000", st: "Pago" },
        { muni: "Vitória da Conquista/BA", area: "Obras", v: "R$ 2.800.000", st: "Em execução" },
        { muni: "Juazeiro/BA",         area: "Saúde",     v: "R$ 2.400.000", st: "Pago" },
        { muni: "Ilhéus/BA",           area: "Cultura",   v: "R$ 2.100.000", st: "Em execução" },
        { muni: "Itabuna/BA",          area: "Educação",  v: "R$ 1.900.000", st: "Pago" },
        { muni: "Barreiras/BA",        area: "Obras",     v: "R$ 1.700.000", st: "Em execução" },
        { muni: "Teixeira de Freitas/BA", area: "Assist. Social", v: "R$ 1.500.000", st: "Pago" },
        { muni: "Jequié/BA",           area: "Saúde",     v: "R$ 1.400.000", st: "Pago" },
        { muni: "Paulo Afonso/BA",     area: "Obras",     v: "R$ 1.200.000", st: "Cancelado" },
      ],
    },
    perfil: {
      bioLong: "Jaques Wagner nasceu em Salvador em 1951. Engenheiro formado pela UFBA, iniciou a militância sindical no movimento estudantil dos anos 70. Foi um dos fundadores do PT na Bahia e ocupou cargos executivos de destaque tanto no governo estadual quanto federal, consolidando-se como uma das principais lideranças históricas do partido no Nordeste.",
      nascimento: "Salvador · 1951 · 75 anos",
      formacao: "Engenharia — UFBA (1974)",
      partidos: [{ p: "PT", desde: "1980" }],
      redes: [
        { rede: "Instagram", handle: "@jaqueswagner", seguidores: "1.2M", engajamento: "4.8%", verificado: true },
        { rede: "Twitter",   handle: "@jaqueswagner", seguidores: "890K", engajamento: "2.1%", verificado: true },
        { rede: "Facebook",  handle: "Jaques Wagner", seguidores: "1.8M", engajamento: "3.2%", verificado: true },
        { rede: "YouTube",   handle: "Jaques Wagner", seguidores: "210K", engajamento: "1.4%", verificado: false },
      ],
      gabinete: "Senado Federal · Anexo II · Ala Teotônio Vilela · Gab 15",
      email: "sen.jaqueswagner@senado.leg.br",
    },
  },

  marcal: {
    id: "marcal",
    firstName: "PABLO",
    lastName: "MARÇAL",
    cargo: "NONE",
    meta: "SEM MANDATO · SP",
    bio: "Empresário, coach e pré-candidato. Sem histórico parlamentar consolidado. Perfil em construção.",
    rating: null,
    position: "—",
    shortName: "P. MARÇAL",
    percentile: "Dados insuficientes para ranking",
    archetypes: [],
    traits: [],
    sparse: true,
    stats: [
      { k: "Mandatos", v: "—" },
      { k: "PL aprovados", v: "—" },
      { k: "Presença", v: "—" },
      { k: "Emendas", v: "—" },
    ],
    eleitoral: {
      uf: "SP", escopo: "MUNICÍPIO · SÃO PAULO",
      votos: "1.72M", percentValidos: "28%", ano: "2024",
      topMunis: [
        { nome: "São Paulo (capital)", pct: 28, votos: "1.72M" },
      ],
      mapIntensity: { SP: 62, MG: 8, RJ: 12, PR: 10, BR: 0 },
    },
    trajetoria: [
      { ano: "2022", cargo: "Presidente", uf: "BR", votos: "28.114", status: "nao-eleito", partido: "PRTB" },
      { ano: "2024", cargo: "Prefeito SP", uf: "SP", votos: "1.720.000", status: "2o-turno", partido: "PRTB" },
    ],
    legislativo: { disponivel: false },
    alertas: {
      fichaLimpa: false,
      itens: [
        { tipo: "CEAF",       orgao: "CGU",  data: "jan/24", valor: null,          desc: "Registro no Cadastro de Expulsões da Administração Federal", severidade: "alto",   url: "#" },
        { tipo: "Execução Fiscal", orgao: "PGFN", data: "ago/23", valor: "R$ 2.1M", desc: "Débito inscrito em dívida ativa — em negociação", severidade: "medio",  url: "#" },
        { tipo: "TCU",        orgao: "TCU",  data: "out/22", valor: "R$ 480K",     desc: "Tomada de contas especial — em andamento", severidade: "medio",  url: "#" },
      ],
    },
    financeiro: { disponivel: false },
    emendas: { aplicavel: false },
    perfil: {
      bioLong: "Pablo Henrique Costa Marçal é empresário e influenciador digital, com atuação focada em mentoria de negócios e marketing pessoal. Em 2024 concorreu à Prefeitura de São Paulo, obtendo votação expressiva apesar de não alcançar o segundo turno na disputa final.",
      nascimento: "Goianésia · 1987 · 39 anos",
      formacao: "Educação Física (não concluído)",
      partidos: [{ p: "PRTB", desde: "2024" }, { p: "PROS", desde: "2022 (até 2023)" }],
      redes: [
        { rede: "Instagram", handle: "@pablomarcal1", seguidores: "12.4M", engajamento: "8.2%", verificado: true },
        { rede: "TikTok",    handle: "@pablomarcalofc", seguidores: "6.8M", engajamento: "11.4%", verificado: true },
        { rede: "YouTube",   handle: "Pablo Marçal", seguidores: "3.1M", engajamento: "6.0%", verificado: true },
        { rede: "Twitter",   handle: "@pablomarcal", seguidores: "2.9M", engajamento: "4.1%", verificado: true },
      ],
      gabinete: "—",
      email: "—",
    },
  },
};

Object.assign(window, { ARCHETYPES, DIMENSIONS, STATS, STAT_BREAKDOWN, PROFILES });
