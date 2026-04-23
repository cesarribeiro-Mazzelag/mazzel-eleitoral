/* =========================================================================
 * Campanha 2026 · Data Layer
 * Portado de campanha-data.jsx + campanha-data2.jsx
 * ========================================================================= */

export const CAMPANHAS = [
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

export const CERCAS = [
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
          { id: "b-tomba",    nivel: "bairro", nome: "Tomba",       responsavel: "Rita Lima",       responsavelId: "lid-11", eleitores: 28000, meta: 3200, cadastrados: 2640, engajamento: 84, score: 88, status: "ativo" },
          { id: "b-brasilia", nivel: "bairro", nome: "Brasília",    responsavel: "Marcos Oliveira", responsavelId: "lid-12", eleitores: 31200, meta: 3400, cadastrados: 2128, engajamento: 71, score: 73, status: "ativo" },
          { id: "b-caseb",    nivel: "bairro", nome: "Caseb",       responsavel: "Ana Paula",       responsavelId: "lid-13", eleitores: 18400, meta: 2100, cadastrados: 1890, engajamento: 81, score: 79, status: "ativo" },
          { id: "b-cidade-n", nivel: "bairro", nome: "Cidade Nova", responsavel: "—",               responsavelId: null,     eleitores: 14600, meta: 1600, cadastrados: 410,  engajamento: 38, score: 42, status: "vaga" },
          { id: "b-parque",   nivel: "bairro", nome: "Parque Ipê",  responsavel: "José Roberto",    responsavelId: "lid-14", eleitores: 22100, meta: 2500, cadastrados: 1012, engajamento: 51, score: 54, status: "atencao" },
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
          { id: "b-periperi", nivel: "bairro", nome: "Periperi", responsavel: "Tiago Mendes",  responsavelId: "lid-15", eleitores: 42000, meta: 4800, cadastrados: 3200, engajamento: 72, score: 71, status: "ativo" },
          { id: "b-paripe",   nivel: "bairro", nome: "Paripe",   responsavel: "Sandra Rocha",  responsavelId: "lid-16", eleitores: 38500, meta: 4200, cadastrados: 2480, engajamento: 65, score: 66, status: "ativo" },
          { id: "b-coutos",   nivel: "bairro", nome: "Coutos",   responsavel: "—",             responsavelId: null,     eleitores: 28800, meta: 3100, cadastrados: 680,  engajamento: 42, score: 44, status: "vaga" },
        ],
      },
      { id: "mun-sfelix",    nivel: "municipio", nome: "São Félix",   responsavel: "Otávio Campos",   responsavelId: "lid-08", eleitores: 12400, meta: 1400, cadastrados: 1180, engajamento: 89, score: 91, status: "destaque" },
      { id: "mun-cachoeira", nivel: "municipio", nome: "Cachoeira",   responsavel: "Paula Nascimento", responsavelId: "lid-09", eleitores: 22800, meta: 2600, cadastrados: 1740, engajamento: 72, score: 74, status: "ativo" },
      { id: "mun-maragogipe",nivel: "municipio", nome: "Maragogipe",  responsavel: "—",               responsavelId: null,     eleitores: 32100, meta: 3600, cadastrados: 340,  engajamento: 22, score: 28, status: "critico" },
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

export const LIDERANCAS = [
  { id: "lid-01", nome: "Antonio Mazzel",      papel: "Delegado",            cidade: "Salvador",           cerca: null,                tier: "ouro",   score: 98, eleitoresInfluenciados: 0,      aniversario: "1978-04-12", telefone: "(71) 9 9101-0001", whats: true,  tags: ["Delegado"],                     ultimoContato: "hoje" },
  { id: "lid-02", nome: "Clarissa Souza",      papel: "Coord. Regional",     cidade: "Feira de Santana",   cerca: "Regional Recôncavo", tier: "ouro",   score: 92, eleitoresInfluenciados: 486000, aniversario: "1982-11-03", telefone: "(75) 9 8182-3311", whats: true,  tags: ["Regional","Mulher"],             ultimoContato: "2d" },
  { id: "lid-03", nome: "Renato Bastos",       papel: "Coord. Regional",     cidade: "Barreiras",          cerca: "Regional Oeste Baiano", tier: "prata", score: 78, eleitoresInfluenciados: 284000, aniversario: "1975-09-20", telefone: "(77) 9 8420-1100", whats: true, tags: ["Regional"],                    ultimoContato: "5d" },
  { id: "lid-06", nome: "Diego Almeida",       papel: "Coord. Territorial",  cidade: "Feira de Santana",   cerca: "Feira de Santana",   tier: "ouro",   score: 86, eleitoresInfluenciados: 448000, aniversario: "1984-03-15", telefone: "(75) 9 9812-4422", whats: true,  tags: ["Territorial"],                  ultimoContato: "1d" },
  { id: "lid-07", nome: "Beatriz Fernandes",   papel: "Coord. Territorial",  cidade: "Salvador",           cerca: "Salvador (subúrbio)", tier: "prata",  score: 74, eleitoresInfluenciados: 380000, aniversario: "1980-07-28", telefone: "(71) 9 9641-7722", whats: true,  tags: ["Territorial","Mulher"],         ultimoContato: "3d" },
  { id: "lid-08", nome: "Otávio Campos",       papel: "Coord. Territorial",  cidade: "São Félix",          cerca: "São Félix",           tier: "ouro",   score: 91, eleitoresInfluenciados: 12400,  aniversario: "1971-12-05", telefone: "(75) 9 8733-9911", whats: true,  tags: ["Territorial","Destaque"],       ultimoContato: "hoje" },
  { id: "lid-09", nome: "Paula Nascimento",    papel: "Coord. Territorial",  cidade: "Cachoeira",          cerca: "Cachoeira",           tier: "prata",  score: 72, eleitoresInfluenciados: 22800,  aniversario: "1988-06-11", telefone: "(75) 9 9211-3040", whats: true,  tags: ["Territorial","Mulher"],         ultimoContato: "2d" },
  { id: "lid-11", nome: "Rita Lima",           papel: "Cabo Eleitoral",      cidade: "Feira de Santana",   cerca: "Tomba",               tier: "ouro",   score: 89, eleitoresInfluenciados: 28000,  aniversario: "1990-04-23", telefone: "(75) 9 9522-8810", whats: true,  tags: ["Cabo","Mulher","Destaque"],     ultimoContato: "hoje" },
  { id: "lid-12", nome: "Marcos Oliveira",     papel: "Cabo Eleitoral",      cidade: "Feira de Santana",   cerca: "Brasília",            tier: "prata",  score: 72, eleitoresInfluenciados: 31200,  aniversario: "1985-02-18", telefone: "(75) 9 9611-4401", whats: true,  tags: ["Cabo"],                         ultimoContato: "4d" },
  { id: "lid-13", nome: "Ana Paula Ribeiro",   papel: "Cabo Eleitoral",      cidade: "Feira de Santana",   cerca: "Caseb",               tier: "prata",  score: 76, eleitoresInfluenciados: 18400,  aniversario: "1992-10-30", telefone: "(75) 9 9420-7711", whats: true,  tags: ["Cabo","Mulher"],                ultimoContato: "2d" },
  { id: "lid-14", nome: "José Roberto",        papel: "Cabo Eleitoral",      cidade: "Feira de Santana",   cerca: "Parque Ipê",          tier: "bronze", score: 54, eleitoresInfluenciados: 22100,  aniversario: "1968-01-09", telefone: "(75) 9 8110-2233", whats: false, tags: ["Cabo","Atenção"],               ultimoContato: "12d" },
  { id: "lid-15", nome: "Tiago Mendes",        papel: "Cabo Eleitoral",      cidade: "Salvador",           cerca: "Periperi",            tier: "prata",  score: 70, eleitoresInfluenciados: 42000,  aniversario: "1987-05-02", telefone: "(71) 9 9702-4455", whats: true,  tags: ["Cabo"],                         ultimoContato: "3d" },
  { id: "lid-16", nome: "Sandra Rocha",        papel: "Cabo Eleitoral",      cidade: "Salvador",           cerca: "Paripe",              tier: "prata",  score: 68, eleitoresInfluenciados: 38500,  aniversario: "1979-08-14", telefone: "(71) 9 9811-7200", whats: true,  tags: ["Cabo","Mulher"],                ultimoContato: "6d" },
  { id: "lid-21", nome: "Helena Barreto",      papel: "Liderança comunitária",cidade: "Feira de Santana",  cerca: "Tomba",               tier: "ouro",   score: 82, eleitoresInfluenciados: 6200,   aniversario: "1983-11-27", telefone: "(75) 9 9311-6040", whats: true,  tags: ["Comunidade","Mulher"],          ultimoContato: "hoje" },
  { id: "lid-22", nome: "Dona Marieta",        papel: "Liderança comunitária",cidade: "Cachoeira",         cerca: "Cachoeira",           tier: "ouro",   score: 85, eleitoresInfluenciados: 4800,   aniversario: "1956-08-19", telefone: "(75) 9 8944-1122", whats: false, tags: ["Comunidade","Mulher"],          ultimoContato: "hoje" },
  { id: "lid-23", nome: "Pastor Elias",        papel: "Liderança religiosa",  cidade: "Feira de Santana",  cerca: "Brasília",            tier: "ouro",   score: 88, eleitoresInfluenciados: 8200,   aniversario: "1966-03-15", telefone: "(75) 9 9001-3344", whats: true,  tags: ["Religioso","Comunidade"],       ultimoContato: "2d" },
];

export const HUB_KPIS = {
  "jaques-26": [
    { id: "intencao",  label: "Intenção de voto",       valor: "28,4%",      delta: "+1,8pp", sentiment: "up",      sub: "7 dias · pesquisa interna n=1.200" },
    { id: "cadastro",  label: "Lideranças cadastradas",  valor: "1.482",     delta: "+124",   sentiment: "up",      sub: "semana · meta 1.600" },
    { id: "cercas",    label: "Cercas ativas",           valor: "38 / 46",   delta: "82%",    sentiment: "neutral", sub: "8 cercas sem responsável" },
    { id: "captacao",  label: "Captação",                valor: "R$ 4,82 mi", delta: "78%",   sentiment: "up",      sub: "da meta · R$ 6,2 mi" },
  ],
};

export const SPARKS = {
  intencao: [24.2,24.6,25.1,25.3,25.8,26.0,25.9,26.4,26.7,27.1,27.0,27.2,27.4,27.6,27.5,27.8,28.0,27.9,28.1,28.0,27.7,27.9,28.1,28.2,28.0,28.3,28.2,28.3,28.4,28.4],
  cadastro:  [780,810,845,870,902,938,964,1010,1040,1075,1102,1128,1150,1180,1208,1232,1260,1290,1312,1340,1368,1388,1402,1420,1435,1446,1458,1466,1474,1482],
  captacao:  [420,480,540,610,720,820,1100,1400,1820,2100,2320,2500,2680,2820,2980,3140,3300,3440,3600,3770,3920,4050,4180,4310,4430,4540,4630,4720,4780,4820],
};

export const ATIVIDADES = [
  { hora: "14:32", icon: "UserPlus",      tipo: "Cadastro",       texto: "Rita Lima cadastrou 12 lideranças em Tomba",            meta: "+1.200 eleitores estimados",     cerca: "Tomba" },
  { hora: "13:18", icon: "Flag",          tipo: "Cerca",          texto: "Cidade Nova sem responsável há 7 dias",                  meta: "atenção · escalado para Delegado", cerca: "Cidade Nova", alert: true },
  { hora: "12:04", icon: "Gift",          tipo: "Aniversário",    texto: "Pastor Elias · 60 anos amanhã",                          meta: "CRM gerou pauta de contato",     cerca: "Brasília" },
  { hora: "11:45", icon: "MessageCircle", tipo: "Chat sigiloso",  texto: "Delegado enviou briefing para 14 Regionais",             meta: "modo furtivo · expira em 24h",   cerca: "Nacional" },
  { hora: "10:30", icon: "Sparkles",      tipo: "IA",             texto: "Copiloto sugeriu 3 ações para cerca Maragogipe",         meta: "score crítico · 28",             cerca: "Maragogipe" },
  { hora: "09:12", icon: "CheckCircle",   tipo: "Meta",           texto: "Regional Recôncavo bateu 62% da meta de cadastro",       meta: "ritmo: meta projetada em 18d",   cerca: "Recôncavo" },
  { hora: "08:40", icon: "Heart",         tipo: "Engajamento",    texto: "Dona Marieta visitou 34 casas em Cachoeira",             meta: "top 5 da semana",                cerca: "Cachoeira" },
  { hora: "08:02", icon: "AlertTriangle", tipo: "Alerta",         texto: "Queda de engajamento em Parque Ipê (-14%)",              meta: "responsável: José Roberto",      cerca: "Parque Ipê", alert: true },
];

export const TOP_CERCAS = [
  { nome: "São Félix",    meta: 1400, feito: 1180, pct: 84, responsavel: "Otávio Campos" },
  { nome: "Tomba",        meta: 3200, feito: 2640, pct: 83, responsavel: "Rita Lima" },
  { nome: "Caseb",        meta: 2100, feito: 1890, pct: 90, responsavel: "Ana Paula" },
  { nome: "Cachoeira",    meta: 2600, feito: 1740, pct: 67, responsavel: "Paula Nascimento" },
  { nome: "Brasília",     meta: 3400, feito: 2128, pct: 63, responsavel: "Marcos Oliveira" },
];

export const BOTTOM_CERCAS = [
  { nome: "Maragogipe",   meta: 3600, feito: 340,  pct: 9,  responsavel: "—" },
  { nome: "Cidade Nova",  meta: 1600, feito: 410,  pct: 26, responsavel: "—" },
  { nome: "Coutos",       meta: 3100, feito: 680,  pct: 22, responsavel: "—" },
  { nome: "Parque Ipê",   meta: 2500, feito: 1012, pct: 40, responsavel: "José Roberto" },
];

export const CHAT_CANAIS = [
  { id: "delegado-regionais", nome: "Delegado → Regionais",  tipo: "broadcast", membros: 14, ultima: "12 min", preview: "Briefing: cronograma de caravana atualizado. Favor confirmar presença.", unread: 3, furtivo: true,  classificacao: "reservado" },
  { id: "reconcavo",          nome: "Regional Recôncavo",    tipo: "grupo",     membros: 8,  ultima: "1 h",    preview: "Diego: material gráfico do Tomba está pronto. Vou enviar amanhã.",     unread: 0, furtivo: false, classificacao: "interno" },
  { id: "coord-tomba",        nome: "Coordenação Tomba",     tipo: "grupo",     membros: 4,  ultima: "2 h",    preview: "Rita: terminamos as 12 lideranças. Foto do cadastro anexada.",          unread: 0, furtivo: false, classificacao: "interno" },
  { id: "confidencial-01",    nome: "Gabinete · Estratégia", tipo: "grupo",     membros: 3,  ultima: "4 h",    preview: "Mensagem criptografada",                                                unread: 1, furtivo: true,  classificacao: "confidencial" },
  { id: "rita-lima",          nome: "Rita Lima",             tipo: "direto",    membros: 2,  ultima: "1 d",    preview: "Pode me ligar quando puder?",                                           unread: 0, furtivo: false, classificacao: "interno" },
  { id: "pastor-elias",       nome: "Pastor Elias",          tipo: "direto",    membros: 2,  ultima: "2 d",    preview: "Estaremos lá no domingo, com fé em Deus.",                              unread: 0, furtivo: false, classificacao: "interno" },
  { id: "maragogipe-sos",     nome: "SOS Maragogipe",        tipo: "grupo",     membros: 5,  ultima: "3 d",    preview: "Score em 28. Precisamos de plano B.",                                   unread: 0, furtivo: true,  classificacao: "reservado" },
];

export const CHAT_MENSAGENS = {
  "delegado-regionais": [
    { id: 1, autor: "Antonio Mazzel",    papel: "Delegado",    texto: "Bom dia a todos. Subindo briefing da semana.",                 hora: "08:12", me: true,  status: "lido" },
    { id: 2, autor: "Antonio Mazzel",    papel: "Delegado",    texto: "Prioridade 1: cobrir as 8 cercas sem responsável até sexta.",   hora: "08:12", me: true,  status: "lido" },
    { id: 3, autor: "Clarissa Souza",    papel: "Regional",    texto: "Ok. Recôncavo cobre Cidade Nova e Coutos até quarta.",          hora: "08:24", me: false, status: "lido" },
    { id: 4, autor: "Renato Bastos",     papel: "Regional",    texto: "Oeste assume 2 cercas do Sul temporariamente. Aguardo confirm.",hora: "08:31", me: false, status: "lido" },
    { id: 5, autor: "Antonio Mazzel",    papel: "Delegado",    texto: "Confirmado. Reforço do jurídico será enviado para os novos.",   hora: "08:36", me: true,  status: "lido" },
    { id: 6, autor: "Antonio Mazzel",    papel: "Delegado",    texto: "Anexando o cronograma de caravana de março.",                  hora: "11:40", me: true,  status: "lido", anexo: "caravana-mar.pdf · 2,1 MB" },
    { id: 7, autor: "Beatriz Fernandes", papel: "Territorial", texto: "Recebido. Vou alinhar com o time de Salvador hoje à noite.",   hora: "11:45", me: false, status: "lido" },
    { id: 8, autor: "Antonio Mazzel",    papel: "Delegado",    texto: "Favor confirmar presença até amanhã 18h.",                     hora: "11:46", me: true,  status: "entregue" },
  ],
};

export const RANKING = [...Array(14)].map((_, i) => {
  const lid = [
    { id:"lid-08", nome:"Otávio Campos",    cidade:"São Félix",      cerca:"São Félix",    papel:"Coord. Territorial", score:91 },
    { id:"lid-11", nome:"Rita Lima",         cidade:"Feira de S.",    cerca:"Tomba",        papel:"Cabo Eleitoral",     score:89 },
    { id:"lid-23", nome:"Pastor Elias",      cidade:"Feira de S.",    cerca:"Brasília",     papel:"Liderança religiosa",score:88 },
    { id:"lid-02", nome:"Clarissa Souza",    cidade:"Feira de S.",    cerca:"Recôncavo",    papel:"Coord. Regional",    score:92 },
    { id:"lid-22", nome:"Dona Marieta",      cidade:"Cachoeira",      cerca:"Cachoeira",    papel:"Liderança comunit.", score:85 },
    { id:"lid-21", nome:"Helena Barreto",    cidade:"Feira de S.",    cerca:"Tomba",        papel:"Liderança comunit.", score:82 },
    { id:"lid-06", nome:"Diego Almeida",     cidade:"Feira de S.",    cerca:"Feira de S.",  papel:"Coord. Territorial", score:86 },
    { id:"lid-13", nome:"Ana Paula Ribeiro", cidade:"Feira de S.",    cerca:"Caseb",        papel:"Cabo Eleitoral",     score:76 },
    { id:"lid-03", nome:"Renato Bastos",     cidade:"Barreiras",      cerca:"Oeste Baiano", papel:"Coord. Regional",    score:78 },
    { id:"lid-09", nome:"Paula Nascimento",  cidade:"Cachoeira",      cerca:"Cachoeira",    papel:"Coord. Territorial", score:72 },
    { id:"lid-12", nome:"Marcos Oliveira",   cidade:"Feira de S.",    cerca:"Brasília",     papel:"Cabo Eleitoral",     score:72 },
    { id:"lid-07", nome:"Beatriz Fernandes", cidade:"Salvador",       cerca:"Subúrbio",     papel:"Coord. Territorial", score:74 },
    { id:"lid-15", nome:"Tiago Mendes",      cidade:"Salvador",       cerca:"Periperi",     papel:"Cabo Eleitoral",     score:70 },
    { id:"lid-14", nome:"José Roberto",      cidade:"Feira de S.",    cerca:"Parque Ipê",   papel:"Cabo Eleitoral",     score:54 },
  ][i];
  return {
    ...lid,
    posicao: i + 1,
    variacao: i < 3 ? [+2, -1, +3][i] : (i % 3 === 0 ? +1 : i % 3 === 1 ? 0 : -1),
    cadastrosMes: Math.max(4, Math.round((lid.score / 10) + ((i % 5) * 3))),
  };
});

export const HEATMAP_CERCAS = [
  "Tomba","Brasília","Caseb","Cidade Nova","Parque Ipê","Periperi","Paripe","Coutos","São Félix","Cachoeira","Maragogipe",
].map((nome, i) => ({
  nome,
  dias: Array.from({ length: 12 * 7 }, (_, d) => {
    const base = [88, 73, 85, 28, 52, 71, 66, 30, 92, 74, 22][i];
    const wave = Math.sin((d + i) * 0.7) * 12;
    const noise = ((d * 37 + i * 13) % 15) - 7;
    return Math.max(0, Math.min(100, Math.round(base + wave + noise)));
  }),
}));

export const MISSOES = [
  { id:"m-01", tipo:"ALERTA",  prioridade:"alta",   titulo:"Maragogipe sem responsável",     descricao:"Score 28. 9 dias sem liderança ativa. Escalado do Delegado.", cerca:"Maragogipe",    responsavel:"—",             prazo:"hoje",    status:"aberto",     cadastros: 340 },
  { id:"m-02", tipo:"META",    prioridade:"media",  titulo:"Tomba: bater 3.200 cadastros",   descricao:"Rita Lima lidera. 2.640/3.200. Ritmo bom, falta sprint final.", cerca:"Tomba",         responsavel:"Rita Lima",      prazo:"15/abr",  status:"em_andamento", cadastros: 2640 },
  { id:"m-03", tipo:"ALERTA",  prioridade:"alta",   titulo:"Parque Ipê engajamento caindo",  descricao:"Queda -14% em 7 dias. José Roberto com contato há 12 dias.", cerca:"Parque Ipê",    responsavel:"José Roberto",  prazo:"amanhã",  status:"aberto",     cadastros: 1012 },
  { id:"m-04", tipo:"MISSAO",  prioridade:"media",  titulo:"Caravana Recôncavo · 22/abr",    descricao:"Visita institucional a 4 municípios. Confirmar presença dos Regionais.", cerca:"Recôncavo",   responsavel:"Clarissa Souza",prazo:"22/abr",  status:"planejado",  cadastros: null },
  { id:"m-05", tipo:"META",    prioridade:"baixa",  titulo:"Cachoeira: 2.600 cadastros",     descricao:"Paula Nascimento · 1.740/2.600 · 67% da meta", cerca:"Cachoeira",     responsavel:"Paula Nascimento", prazo:"30/abr",  status:"em_andamento", cadastros: 1740 },
  { id:"m-06", tipo:"ALERTA",  prioridade:"alta",   titulo:"Cidade Nova vaga há 7 dias",     descricao:"Sem responsável. 410 cadastros de 1.600 de meta.", cerca:"Cidade Nova",   responsavel:"—",             prazo:"hoje",    status:"aberto",     cadastros: 410 },
  { id:"m-07", tipo:"MISSAO",  prioridade:"media",  titulo:"Entrevistar candidato a Maragogipe", descricao:"3 perfis levantados pelo IA. Decisão final do Delegado.", cerca:"Maragogipe",  responsavel:"Antonio Mazzel", prazo:"quinta",  status:"planejado",  cadastros: null },
  { id:"m-08", tipo:"META",    prioridade:"baixa",  titulo:"Brasília: 3.400 cadastros",      descricao:"Marcos Oliveira · 2.128/3.400 · 63% da meta", cerca:"Brasília",      responsavel:"Marcos Oliveira",prazo:"30/abr",  status:"em_andamento", cadastros: 2128 },
  { id:"m-09", tipo:"FOLLOWUP",prioridade:"media",  titulo:"Ligar para Diego Almeida",       descricao:"Queda de 5pp no score semanal de Feira de Santana.", cerca:"Feira de S.",  responsavel:"Diego Almeida",  prazo:"hoje",    status:"aberto",     cadastros: null },
  { id:"m-10", tipo:"FOLLOWUP",prioridade:"baixa",  titulo:"WhatsApp para Renato Bastos",    descricao:"Checar status das 2 cercas do Sul que assumiu temporariamente.", cerca:"Oeste Baiano", responsavel:"Renato Bastos",  prazo:"amanhã",  status:"aberto",     cadastros: null },
];

export const captarPct = (camp) => {
  if (!camp || !camp.meta) return 0;
  return Math.round(((camp.captado ?? 0) / camp.meta) * 100);
};
