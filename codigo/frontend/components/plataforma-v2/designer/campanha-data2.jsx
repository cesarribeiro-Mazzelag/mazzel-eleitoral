/* =========================================================================
 * Campanha · Data Layer parte 2 — chat sigiloso, logística, KPIs, sparklines
 * ========================================================================= */

/* ----- KPIs do hub (por campanha ativa principal) ----- */
const HUB_KPIS = {
  "jaques-26": [
    { id: "intencao",   label: "Intenção de voto",      valor: "28,4%",       delta: "+1,8pp",  sentiment: "up",   sub: "7 dias · pesquisa interna n=1.200" },
    { id: "cadastro",   label: "Lideranças cadastradas", valor: "1.482",      delta: "+124",    sentiment: "up",   sub: "semana · meta 1.600" },
    { id: "cercas",     label: "Cercas ativas",          valor: "38 / 46",    delta: "82%",     sentiment: "neutral", sub: "8 cercas sem responsável" },
    { id: "captacao",   label: "Captação",               valor: "R$ 4,82 mi",  delta: "78%",     sentiment: "up",   sub: "da meta · R$ 6,2 mi" },
  ],
};

/* sparkline pontos (30d) */
const SPARKS = {
  intencao: [24.2, 24.6, 25.1, 25.3, 25.8, 26.0, 25.9, 26.4, 26.7, 27.1, 27.0, 27.2, 27.4, 27.6, 27.5, 27.8, 28.0, 27.9, 28.1, 28.0, 27.7, 27.9, 28.1, 28.2, 28.0, 28.3, 28.2, 28.3, 28.4, 28.4],
  cadastro: [780, 810, 845, 870, 902, 938, 964, 1010, 1040, 1075, 1102, 1128, 1150, 1180, 1208, 1232, 1260, 1290, 1312, 1340, 1368, 1388, 1402, 1420, 1435, 1446, 1458, 1466, 1474, 1482],
  captacao: [420, 480, 540, 610, 720, 820, 1100, 1400, 1820, 2100, 2320, 2500, 2680, 2820, 2980, 3140, 3300, 3440, 3600, 3770, 3920, 4050, 4180, 4310, 4430, 4540, 4630, 4720, 4780, 4820],
};

/* ----- Atividade do dia (hub) ----- */
const ATIVIDADES = [
  { hora: "14:32", icon: "UserPlus", tipo: "Cadastro",      texto: "Rita Lima cadastrou 12 lideranças em Tomba",       meta: "+1.200 eleitores estimados", cerca: "Tomba" },
  { hora: "13:18", icon: "Flag",     tipo: "Cerca",         texto: "Cidade Nova sem responsável há 7 dias",             meta: "atenção · escalado para Delegado", cerca: "Cidade Nova", alert: true },
  { hora: "12:04", icon: "Gift",     tipo: "Aniversário",   texto: "Pastor Elias · 60 anos amanhã",                     meta: "CRM gerou pauta de contato", cerca: "Brasília" },
  { hora: "11:45", icon: "MessageCircle", tipo: "Chat sigiloso", texto: "Delegado enviou briefing para 14 Regionais",    meta: "modo furtivo · expira em 24h", cerca: "Nacional" },
  { hora: "10:30", icon: "Sparkles", tipo: "IA",            texto: "Copiloto sugeriu 3 ações para cerca Maragogipe",    meta: "score crítico · 28", cerca: "Maragogipe" },
  { hora: "09:12", icon: "CheckCircle", tipo: "Meta",       texto: "Regional Recôncavo bateu 62% da meta de cadastro",  meta: "ritmo: meta projetada em 18d", cerca: "Recôncavo" },
  { hora: "08:40", icon: "Heart",    tipo: "Engajamento",   texto: "Dona Marieta visitou 34 casas em Cachoeira",        meta: "top 5 da semana", cerca: "Cachoeira" },
  { hora: "08:02", icon: "AlertTriangle", tipo: "Alerta",   texto: "Queda de engajamento em Parque Ipê (-14%)",         meta: "responsável: José Roberto", cerca: "Parque Ipê", alert: true },
];

/* ----- Alvos de meta (top cercas e bottom cercas) ----- */
const TOP_CERCAS = [
  { nome: "São Félix",            meta: 1400,  feito: 1180, pct: 84, responsavel: "Otávio Campos" },
  { nome: "Tomba",                meta: 3200,  feito: 2640, pct: 83, responsavel: "Rita Lima" },
  { nome: "Caseb",                meta: 2100,  feito: 1890, pct: 90, responsavel: "Ana Paula" },
  { nome: "Cachoeira",            meta: 2600,  feito: 1740, pct: 67, responsavel: "Paula Nascimento" },
  { nome: "Brasília",             meta: 3400,  feito: 2128, pct: 63, responsavel: "Marcos Oliveira" },
];
const BOTTOM_CERCAS = [
  { nome: "Maragogipe",           meta: 3600,  feito: 340,  pct: 9,  responsavel: "—" },
  { nome: "Cidade Nova",          meta: 1600,  feito: 410,  pct: 26, responsavel: "—" },
  { nome: "Coutos",               meta: 3100,  feito: 680,  pct: 22, responsavel: "—" },
  { nome: "Parque Ipê",           meta: 2500,  feito: 1012, pct: 40, responsavel: "José Roberto" },
];

/* ----- Chat sigiloso ----- */
const CHAT_CANAIS = [
  { id: "delegado-regionais", nome: "Delegado → Regionais",     tipo: "broadcast",  membros: 14, ultima: "12 min", preview: "Briefing: cronograma de caravana atualizado. Favor confirmar presença.", unread: 3, furtivo: true,  classificacao: "reservado" },
  { id: "reconcavo",          nome: "Regional Recôncavo",       tipo: "grupo",      membros: 8,  ultima: "1 h",  preview: "Diego: material gráfico do Tomba está pronto. Vou enviar amanhã.", unread: 0, furtivo: false, classificacao: "interno" },
  { id: "coord-tomba",        nome: "Coordenação Tomba",        tipo: "grupo",      membros: 4,  ultima: "2 h",  preview: "Rita: terminamos as 12 lideranças. Foto do cadastro anexada.", unread: 0, furtivo: false, classificacao: "interno" },
  { id: "confidencial-01",    nome: "Gabinete · Estratégia",    tipo: "grupo",      membros: 3,  ultima: "4 h",  preview: "Mensagem criptografada", unread: 1, furtivo: true,  classificacao: "confidencial" },
  { id: "rita-lima",          nome: "Rita Lima",                tipo: "direto",     membros: 2,  ultima: "1 d",  preview: "Pode me ligar quando puder?", unread: 0, furtivo: false, classificacao: "interno" },
  { id: "pastor-elias",       nome: "Pastor Elias",             tipo: "direto",     membros: 2,  ultima: "2 d",  preview: "Estaremos lá no domingo, com fé em Deus.", unread: 0, furtivo: false, classificacao: "interno" },
  { id: "maragogipe-sos",     nome: "SOS Maragogipe",           tipo: "grupo",      membros: 5,  ultima: "3 d",  preview: "Score em 28. Precisamos de plano B.", unread: 0, furtivo: true,  classificacao: "reservado" },
];

const CHAT_MENSAGENS = {
  "delegado-regionais": [
    { id: 1, autor: "Antonio Mazzel",   papel: "Delegado",    texto: "Bom dia a todos. Subindo briefing da semana.",                  hora: "08:12", me: true,  status: "lido" },
    { id: 2, autor: "Antonio Mazzel",   papel: "Delegado",    texto: "Prioridade 1: cobrir as 8 cercas sem responsável até sexta.",    hora: "08:12", me: true,  status: "lido" },
    { id: 3, autor: "Clarissa Souza",   papel: "Regional",    texto: "Ok. Recôncavo cobre Cidade Nova e Coutos até quarta.",          hora: "08:24", me: false, status: "lido" },
    { id: 4, autor: "Renato Bastos",    papel: "Regional",    texto: "Oeste assume 2 cercas do Sul temporariamente. Aguardo confirm.", hora: "08:31", me: false, status: "lido" },
    { id: 5, autor: "Antonio Mazzel",   papel: "Delegado",    texto: "Confirmado. Reforço do jurídico será enviado para os novos.",    hora: "08:36", me: true,  status: "lido" },
    { id: 6, autor: "Antonio Mazzel",   papel: "Delegado",    texto: "Anexando o cronograma de caravana de março.",                   hora: "11:40", me: true,  status: "lido", anexo: "caravana-mar.pdf · 2,1 MB" },
    { id: 7, autor: "Beatriz Fernandes",papel: "Territorial", texto: "Recebido. Vou alinhar com o time de Salvador hoje à noite.",    hora: "11:45", me: false, status: "lido" },
    { id: 8, autor: "Antonio Mazzel",   papel: "Delegado",    texto: "Favor confirmar presença até amanhã 18h.",                      hora: "11:46", me: true,  status: "entregue" },
  ],
};

/* ----- Ranking individual (lideranças ordenadas por score no mês) ----- */
const RANKING = [...LIDERANCAS]
  .filter(l => l.papel !== "Delegado")
  .sort((a, b) => b.score - a.score)
  .map((l, i) => ({
    ...l,
    posicao: i + 1,
    variacao: i < 3 ? [+2, -1, +3][i] : (i % 3 === 0 ? +1 : (i % 3 === 1 ? 0 : -1)),
    cadastrosMes: Math.max(4, Math.round((l.score / 10) + ((i % 5) * 3))),
  }));

/* ----- Heatmap engajamento por cerca/dia (últimas 12 semanas) ----- */
const HEATMAP_CERCAS = [
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

Object.assign(window, { HUB_KPIS, SPARKS, ATIVIDADES, TOP_CERCAS, BOTTOM_CERCAS, CHAT_CANAIS, CHAT_MENSAGENS, RANKING, HEATMAP_CERCAS });
