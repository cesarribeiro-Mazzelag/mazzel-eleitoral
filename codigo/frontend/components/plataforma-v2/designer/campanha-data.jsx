/* =========================================================================
 * Campanha · Data Layer — cercas, lideranças, campanhas, chat
 * ========================================================================= */

/* ----- Campanhas ativas ----- */
const CAMPANHAS = [
  {
    id: "jaques-26",
    candidato: "Jaques Wagner",
    cargo: "Senador · BA",
    partido: "PT",
    coligacao: "Brasil da Esperança",
    status: "Planejamento",
    fase: "T-12m",
    score: 73,
    intencaoVoto: 28.4,
    margem: "+4.2pp",
    meta: 6200000,
    captado: 4821000,
    ativos: 142,
    cercas: 38,
    delta7d: +1.8,
  },
  {
    id: "jm-26",
    candidato: "João Leão",
    cargo: "Governador · BA",
    partido: "PP",
    coligacao: "Bahia para Todos",
    status: "Pré-campanha",
    fase: "T-10m",
    score: 61,
    intencaoVoto: 18.2,
    margem: "-2.1pp",
    meta: 9400000,
    captado: 3120000,
    ativos: 87,
    cercas: 22,
    delta7d: -0.4,
  },
  {
    id: "am-federal",
    candidato: "Adolfo Menezes",
    cargo: "Dep. Federal · BA",
    partido: "PSD",
    coligacao: "Aliança pela Bahia",
    status: "Monitoramento",
    fase: "T-11m",
    score: 68,
    intencaoVoto: 3.8,
    margem: "+0.6pp",
    meta: 1800000,
    captado: 940000,
    ativos: 64,
    cercas: 14,
    delta7d: +2.3,
  },
];

/* ----- Estrutura geográfica · cercas ----- */
/* Bahia foco: Regional Recôncavo → Municípios → Bairros/micro-cercas */
const CERCAS = [
  {
    id: "reg-reconcavo",
    nivel: "regional",
    nome: "Regional Recôncavo",
    responsavel: "Clarissa Souza",
    responsavelId: "lid-02",
    eleitores: 486000,
    meta: 62000,
    cadastrados: 38412,
    engajamento: 78,
    score: 82,
    status: "ativo",
    filhas: [
      {
        id: "mun-feira",
        nivel: "municipio",
        nome: "Feira de Santana",
        responsavel: "Diego Almeida",
        responsavelId: "lid-06",
        eleitores: 448000,
        meta: 48000,
        cadastrados: 29804,
        engajamento: 74,
        score: 76,
        status: "ativo",
        filhas: [
          { id: "b-tomba",    nivel: "bairro", nome: "Tomba",           responsavel: "Rita Lima",       responsavelId: "lid-11", eleitores: 28000, meta: 3200, cadastrados: 2640, engajamento: 84, score: 88, status: "ativo" },
          { id: "b-brasilia", nivel: "bairro", nome: "Brasília",        responsavel: "Marcos Oliveira", responsavelId: "lid-12", eleitores: 31200, meta: 3400, cadastrados: 2128, engajamento: 71, score: 73, status: "ativo" },
          { id: "b-caseb",    nivel: "bairro", nome: "Caseb",           responsavel: "Ana Paula",       responsavelId: "lid-13", eleitores: 18400, meta: 2100, cadastrados: 1890, engajamento: 81, score: 79, status: "ativo" },
          { id: "b-cidade-n", nivel: "bairro", nome: "Cidade Nova",     responsavel: "—",               responsavelId: null,      eleitores: 14600, meta: 1600, cadastrados: 410, engajamento: 38, score: 42, status: "vaga" },
          { id: "b-parque",   nivel: "bairro", nome: "Parque Ipê",      responsavel: "José Roberto",    responsavelId: "lid-14", eleitores: 22100, meta: 2500, cadastrados: 1012, engajamento: 51, score: 54, status: "atencao" },
        ],
      },
      {
        id: "mun-ssalvador",
        nivel: "municipio",
        nome: "Salvador (subúrbio)",
        responsavel: "Beatriz Fernandes",
        responsavelId: "lid-07",
        eleitores: 380000,
        meta: 42000,
        cadastrados: 21100,
        engajamento: 66,
        score: 68,
        status: "ativo",
        filhas: [
          { id: "b-periperi", nivel: "bairro", nome: "Periperi",        responsavel: "Tiago Mendes",    responsavelId: "lid-15", eleitores: 42000, meta: 4800, cadastrados: 3200, engajamento: 72, score: 71, status: "ativo" },
          { id: "b-paripe",   nivel: "bairro", nome: "Paripe",          responsavel: "Sandra Rocha",    responsavelId: "lid-16", eleitores: 38500, meta: 4200, cadastrados: 2480, engajamento: 65, score: 66, status: "ativo" },
          { id: "b-coutos",   nivel: "bairro", nome: "Coutos",          responsavel: "—",               responsavelId: null,      eleitores: 28800, meta: 3100, cadastrados: 680, engajamento: 42, score: 44, status: "vaga" },
        ],
      },
      {
        id: "mun-sfelix",
        nivel: "municipio",
        nome: "São Félix",
        responsavel: "Otávio Campos",
        responsavelId: "lid-08",
        eleitores: 12400,
        meta: 1400,
        cadastrados: 1180,
        engajamento: 89,
        score: 91,
        status: "destaque",
      },
      {
        id: "mun-cachoeira",
        nivel: "municipio",
        nome: "Cachoeira",
        responsavel: "Paula Nascimento",
        responsavelId: "lid-09",
        eleitores: 22800,
        meta: 2600,
        cadastrados: 1740,
        engajamento: 72,
        score: 74,
        status: "ativo",
      },
      {
        id: "mun-maragogipe",
        nivel: "municipio",
        nome: "Maragogipe",
        responsavel: "—",
        responsavelId: null,
        eleitores: 32100,
        meta: 3600,
        cadastrados: 340,
        engajamento: 22,
        score: 28,
        status: "critico",
      },
    ],
  },
  {
    id: "reg-oeste",
    nivel: "regional",
    nome: "Regional Oeste Baiano",
    responsavel: "Renato Bastos",
    responsavelId: "lid-03",
    eleitores: 284000,
    meta: 32000,
    cadastrados: 18200,
    engajamento: 64,
    score: 66,
    status: "ativo",
    filhas: [],
  },
  {
    id: "reg-sul",
    nivel: "regional",
    nome: "Regional Sul",
    responsavel: "—",
    responsavelId: null,
    eleitores: 412000,
    meta: 46000,
    cadastrados: 8400,
    engajamento: 38,
    score: 41,
    status: "vaga",
    filhas: [],
  },
];

/* ----- Lideranças (pessoas na hierarquia) ----- */
const LIDERANCAS = [
  { id: "lid-01", nome: "Antonio Mazzel",      papel: "Delegado",            cidade: "Salvador",          cerca: null,               tier: "ouro",    score: 98, eleitoresInfluenciados: 0, aniversario: "1978-04-12", telefone: "(71) 9 9101-0001", whats: true, tags: ["Delegado"], ultimoContato: "hoje" },
  { id: "lid-02", nome: "Clarissa Souza",      papel: "Coord. Regional",     cidade: "Feira de Santana",  cerca: "Regional Recôncavo", tier: "ouro",    score: 92, eleitoresInfluenciados: 486000, aniversario: "1982-11-03", telefone: "(75) 9 8182-3311", whats: true, tags: ["Regional","Mulher"], ultimoContato: "2d" },
  { id: "lid-03", nome: "Renato Bastos",       papel: "Coord. Regional",     cidade: "Barreiras",         cerca: "Regional Oeste Baiano", tier: "prata", score: 78, eleitoresInfluenciados: 284000, aniversario: "1975-09-20", telefone: "(77) 9 8420-1100", whats: true, tags: ["Regional"], ultimoContato: "5d" },
  { id: "lid-06", nome: "Diego Almeida",       papel: "Coord. Territorial",  cidade: "Feira de Santana",  cerca: "Feira de Santana",  tier: "ouro",    score: 86, eleitoresInfluenciados: 448000, aniversario: "1984-03-15", telefone: "(75) 9 9812-4422", whats: true, tags: ["Territorial"], ultimoContato: "1d" },
  { id: "lid-07", nome: "Beatriz Fernandes",   papel: "Coord. Territorial",  cidade: "Salvador",          cerca: "Salvador (subúrbio)", tier: "prata", score: 74, eleitoresInfluenciados: 380000, aniversario: "1980-07-28", telefone: "(71) 9 9641-7722", whats: true, tags: ["Territorial","Mulher"], ultimoContato: "3d" },
  { id: "lid-08", nome: "Otávio Campos",       papel: "Coord. Territorial",  cidade: "São Félix",         cerca: "São Félix",         tier: "ouro",    score: 91, eleitoresInfluenciados: 12400, aniversario: "1971-12-05", telefone: "(75) 9 8733-9911", whats: true, tags: ["Territorial","Destaque"], ultimoContato: "hoje" },
  { id: "lid-09", nome: "Paula Nascimento",    papel: "Coord. Territorial",  cidade: "Cachoeira",         cerca: "Cachoeira",         tier: "prata", score: 72, eleitoresInfluenciados: 22800, aniversario: "1988-06-11", telefone: "(75) 9 9211-3040", whats: true, tags: ["Territorial","Mulher"], ultimoContato: "2d" },
  { id: "lid-11", nome: "Rita Lima",           papel: "Cabo Eleitoral",      cidade: "Feira de Santana",  cerca: "Tomba",             tier: "ouro",    score: 89, eleitoresInfluenciados: 28000, aniversario: "1990-04-23", telefone: "(75) 9 9522-8810", whats: true, tags: ["Cabo","Mulher","Destaque"], ultimoContato: "hoje" },
  { id: "lid-12", nome: "Marcos Oliveira",     papel: "Cabo Eleitoral",      cidade: "Feira de Santana",  cerca: "Brasília",          tier: "prata", score: 72, eleitoresInfluenciados: 31200, aniversario: "1985-02-18", telefone: "(75) 9 9611-4401", whats: true, tags: ["Cabo"], ultimoContato: "4d" },
  { id: "lid-13", nome: "Ana Paula Ribeiro",   papel: "Cabo Eleitoral",      cidade: "Feira de Santana",  cerca: "Caseb",             tier: "prata", score: 76, eleitoresInfluenciados: 18400, aniversario: "1992-10-30", telefone: "(75) 9 9420-7711", whats: true, tags: ["Cabo","Mulher"], ultimoContato: "2d" },
  { id: "lid-14", nome: "José Roberto",        papel: "Cabo Eleitoral",      cidade: "Feira de Santana",  cerca: "Parque Ipê",        tier: "bronze",score: 54, eleitoresInfluenciados: 22100, aniversario: "1968-01-09", telefone: "(75) 9 8110-2233", whats: false, tags: ["Cabo","Atenção"], ultimoContato: "12d" },
  { id: "lid-15", nome: "Tiago Mendes",        papel: "Cabo Eleitoral",      cidade: "Salvador",          cerca: "Periperi",          tier: "prata", score: 70, eleitoresInfluenciados: 42000, aniversario: "1987-05-02", telefone: "(71) 9 9702-4455", whats: true, tags: ["Cabo"], ultimoContato: "3d" },
  { id: "lid-16", nome: "Sandra Rocha",        papel: "Cabo Eleitoral",      cidade: "Salvador",          cerca: "Paripe",            tier: "prata", score: 68, eleitoresInfluenciados: 38500, aniversario: "1979-08-14", telefone: "(71) 9 9811-7200", whats: true, tags: ["Cabo","Mulher"], ultimoContato: "6d" },
  { id: "lid-21", nome: "Helena Barreto",      papel: "Liderança comunitária",cidade: "Feira de Santana", cerca: "Tomba",             tier: "ouro",    score: 82, eleitoresInfluenciados: 6200, aniversario: "1983-11-27", telefone: "(75) 9 9311-6040", whats: true, tags: ["Comunidade","Mulher"], ultimoContato: "hoje" },
  { id: "lid-22", nome: "Pastor Elias",        papel: "Liderança religiosa", cidade: "Feira de Santana",  cerca: "Brasília",          tier: "ouro",    score: 85, eleitoresInfluenciados: 3400, aniversario: "1965-06-19", telefone: "(75) 9 8820-1122", whats: true, tags: ["Religioso"], ultimoContato: "1d" },
  { id: "lid-23", nome: "Dona Marieta",        papel: "Líder de bairro",     cidade: "Cachoeira",         cerca: "Cachoeira",         tier: "prata", score: 76, eleitoresInfluenciados: 1800, aniversario: "1952-03-08", telefone: "(75) 9 8540-7733", whats: false, tags: ["Comunidade","Mulher","Idoso"], ultimoContato: "5d" },
];

/* aniversariantes da semana ordenados para CRM */
function proximoAniversario(isoDate, refDate = new Date()) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const thisYear = new Date(refDate.getFullYear(), m - 1, d);
  if (thisYear < new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate())) {
    thisYear.setFullYear(refDate.getFullYear() + 1);
  }
  const diffDays = Math.floor((thisYear - new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate())) / 86400000);
  return { date: thisYear, diffDays };
}

Object.assign(window, { CAMPANHAS, CERCAS, LIDERANCAS, proximoAniversario });
