/* Painel Pessoal Político · DATA LAYER (1:1 com Designer V1.2)
 * Fonte: public/mockups/v1.2/F4-estatutario/05-painel-pessoal-politico.html
 *
 * Caso âncora canônico: Rafael Rodrigues - vereador 3º mandato
 * Líder de Bancada UB · São Paulo. Os dados visíveis NÃO são
 * compartilhados com o partido sem autorização explícita do político.
 */

export const POLITICO = {
  iniciais: "RR",
  nome: "Rafael Rodrigues",
  cargo: "Vereador · 3º Mandato",
  pill: "Líder Bancada",
  uf: "SP",
  partido: "UB",
};

export const TRAJETORIA = [
  { yr: "2025-28", titulo: "Vereador · 3º Mandato",      sub: "SP · 18.420 votos · UB",                badge: "ATIVO",       state: "now" },
  { yr: "2021-24", titulo: "Vereador · 2º Mandato",      sub: "SP · 14.890 votos · UB",                badge: "FINALIZADO" },
  { yr: "2017-20", titulo: "Vereador · 1º Mandato",      sub: "SP · 9.110 votos · DEM",                badge: "FINALIZADO" },
  { yr: "2014",    titulo: "Candidato Dep. Estadual",    sub: "SP · 32.110 votos · NÃO ELEITO",        badge: "DERROTA" },
];

export const METRICAS_MANDATO = [
  { lbl: "Projetos",  v: "47",  delta: "+12 em 2026" },
  { lbl: "Aprovados", v: "31",  delta: "66% taxa" },
  { lbl: "Emendas",   v: "R$ 8.4", suffix: "M",  delta: "94% executadas" },
  { lbl: "Presença",  v: "98",  suffix: "%", delta: "Top 5 vereadores" },
];

// Performance eleitoral · 4 disputas (2014, 2016, 2020, 2024)
export const PERFORMANCE = [
  { ano: 2014, votos: 32110, eleito: false, x: 60,  y: 140 },
  { ano: 2016, votos: 9110,  eleito: true,  x: 220, y: 90  },
  { ano: 2020, votos: 14890, eleito: true,  x: 380, y: 80  },
  { ano: 2024, votos: 18420, eleito: true,  x: 540, y: 40  },
];

export const INDICADORES_PRIVADOS = [
  { lbl: "Aprovação Pesquisa", v: "71",  suffix: "%",     delta: "+4pp último mês" },
  { lbl: "Mídia Próxima",      v: "+18", suffix: "pts",   delta: "vs média bancada" },
  { lbl: "Capital Político",   v: "8.4", suffix: "/10",   delta: "Análise IA" },
  { lbl: "Risco LGPD",         v: "BAIXO",                delta: "0 alertas",        deltaColor: "var(--mz-ok)" },
];

export const PROXIMOS = [
  { dia: "28", mes: "ABR", titulo: "Sessão Plenária",            sub: "Câmara Municipal · 14h00 · Pauta orçamento" },
  { dia: "29", mes: "ABR", titulo: "Comissão Saúde",             sub: "Sala 12 · 09h00 · Relatoria PL 234/26" },
  { dia: "30", mes: "ABR", titulo: "Visita Bairro Capão Redondo", sub: "Posto Saúde · 16h00 · Operação Caminhada" },
  { dia: "02", mes: "MAI", titulo: "Reunião Líder Bancada",      sub: "Diretório UB · 11h00 · Estratégia 2026" },
  { dia: "04", mes: "MAI", titulo: "Entrevista Folha SP",        sub: "Gabinete · 10h00 · Pauta saúde mental" },
];

export const REPUTACAO = [
  { lbl: "Sentimento mídia (7d)", v: "+ 0.62", color: "var(--mz-ok)", bold: true },
  { lbl: "Menções redes",         v: "3.4k",   mono: true },
  { lbl: "Crises detectadas",     v: "0",      color: "var(--mz-ok)", bold: true },
  { lbl: "Influência rede UB",    v: "#3 / 87", mono: true },
];

/* ============ MODE 2: GABINETE ============ */

export const GAB_STATS = [
  { lbl: "Total Equipe",      v: "28",   sub: "21 cargos comissionados · 7 voluntários" },
  { lbl: "Folha Mensal",      v: "R$ 184k", sub: "94% do teto da Casa" },
  { lbl: "Vagas Críticas",    v: "3",    sub: "Chefe imprensa · Jurídico · Estagiário", warn: true },
  { lbl: "Tempo Médio Casa",  v: "3.8",  suffix: "anos", sub: "Equipe estável" },
  { lbl: "Turnover Anual",    v: "8",    suffix: "%", sub: "Abaixo da média" },
];

export const EQUIPE = [
  { iniciais: "JC", nome: "Joana Carvalho",     sub: "10 anos · Confiança máxima",        role: "CHEFE GABINETE",     roleClass: "cef", status: "Ativo",    statusKey: "ok",   destaque: true },
  { iniciais: "PM", nome: "Pedro Magalhães",    sub: "5 anos · Articulação política",     role: "Assessor Político-Sr", roleClass: "com", status: "Ativo",    statusKey: "ok" },
  { iniciais: "RA", nome: "Renata Almeida",     sub: "3 anos · Comissões e plenário",     role: "Assessor Legislativo", roleClass: "com", status: "Ativo",    statusKey: "ok" },
  { iniciais: "?",  nome: "VAGA · CHEFE IMPRENSA", sub: "Vacância: 21 dias",                role: "Comunicação",          roleClass: "warn", status: "Vago",   statusKey: "crit", vaga: true },
  { iniciais: "FS", nome: "Fernanda Silva",     sub: "2 anos · Redes e produção",         role: "Mídia Sênior",         roleClass: "com", status: "Ativo",    statusKey: "ok" },
  { iniciais: "LO", nome: "Lucas Oliveira",     sub: "1 ano · Demandas constituintes",    role: "Assessor Comunitário", roleClass: "com", status: "Ativo",    statusKey: "ok" },
  { iniciais: "AC", nome: "Ana Cardoso",        sub: "4 anos · Agenda e protocolo",       role: "Secretária Executiva", roleClass: "com", status: "Atestado", statusKey: "warn" },
  { iniciais: "MR", nome: "Marcos Ribeiro",     sub: "6 meses · Estagiário Direito",      role: "Estagiário Jurídico",  roleClass: "com", status: "Ativo",    statusKey: "ok" },
];

export const FOLHA = [
  { lbl: "Cargos Comissionados (21)", v: "R$ 142.840" },
  { lbl: "Estagiários (4)",           v: "R$ 8.400" },
  { lbl: "Encargos · INSS · FGTS",    v: "R$ 28.760" },
  { lbl: "Verba Indenizatória",       v: "R$ 4.200" },
  { lbl: "Total",                     v: "R$ 184.200", total: true },
];

export const SINAIS_ALERTA = [
  { titulo: "Folha 94% do teto",                    desc: "Sem margem para nova contratação. Avaliar substituição interna.",        sev: "warn" },
  { titulo: "Vacância chefe imprensa há 21 dias",   desc: "Período crítico · pré-eleitoral. Indicação urgente.",                    sev: "crit" },
  { titulo: "Aniversário 5 anos · Pedro Magalhães", desc: "Reconhecimento + revisão salarial pendente.",                            sev: "warn" },
];

/* ============ MODE 3: AGENDA ============ */

// Calendário Abril 2026 - 5 semanas (DOM-SAB) com eventos por dia
export const CAL_ABR_2026 = [
  // Semana 1
  [
    { num: 29, muted: true },
    { num: 30, muted: true },
    { num: 31, muted: true },
    { num:  1, eventos: [{ tipo: "event", label: "Sessão" }] },
    { num:  2 },
    { num:  3, eventos: [{ tipo: "cor", label: "Família" }] },
    { num:  4 },
  ],
  // Semana 2
  [
    { num:  5 },
    { num:  6, eventos: [{ tipo: "event", label: "Comissão" }, { tipo: "event", label: "Sessão" }] },
    { num:  7, eventos: [{ tipo: "event", label: "Audiência" }] },
    { num:  8, eventos: [{ tipo: "event", label: "Sessão" }] },
    { num:  9 },
    { num: 10, eventos: [{ tipo: "travel", label: "Brasília" }] },
    { num: 11 },
  ],
  // Semana 3
  [
    { num: 12 },
    { num: 13, eventos: [{ tipo: "event", label: "Sessão" }] },
    { num: 14 },
    { num: 15, eventos: [{ tipo: "event", label: "Sessão" }, { tipo: "cor", label: "Op.Caminhada" }] },
    { num: 16 },
    { num: 17 },
    { num: 18, eventos: [{ tipo: "event", label: "Convenção UB" }] },
  ],
  // Semana 4
  [
    { num: 19 },
    { num: 20, eventos: [{ tipo: "event", label: "Sessão" }] },
    { num: 21 },
    { num: 22, eventos: [{ tipo: "event", label: "Sessão" }] },
    { num: 23 },
    { num: 24, eventos: [{ tipo: "cor", label: "Família" }] },
    { num: 25 },
  ],
  // Semana 5
  [
    { num: 26 },
    { num: 27, eventos: [{ tipo: "event", label: "Líder" }] },
    { num: 28, today: true, eventos: [{ tipo: "event", label: "Sessão" }, { tipo: "event", label: "Comissão" }, { tipo: "cor", label: "Visita" }] },
    { num: 29, eventos: [{ tipo: "event", label: "Comissão Saúde" }] },
    { num: 30, eventos: [{ tipo: "cor", label: "Op.Caminhada" }] },
    { num:  1, muted: true },
    { num:  2, muted: true },
  ],
];

export const HOJE = [
  { hr: "08:30", titulo: "Briefing Diário",       sub: "Joana Carvalho · Gabinete" },
  { hr: "09:00", titulo: "Comissão Saúde",        sub: "Sala 12 · Relatoria PL 234" },
  { hr: "11:30", titulo: "Reunião imprensa",      sub: "Folha SP · pauta saúde mental" },
  { hr: "14:00", titulo: "Sessão Plenária",       sub: "Câmara · Pauta orçamento" },
  { hr: "16:00", titulo: "Visita Capão Redondo",  sub: "Posto Saúde · Op.Caminhada", dotColor: "var(--mz-ok)" },
  { hr: "19:00", titulo: "🔒 Privado",            sub: "Compromisso pessoal · não compartilhado", privado: true },
];

export const NAV_PRIMARY = [
  { ico: "📊", label: "Visão Geral",         active: true },
  { ico: "👥", label: "Gabinete",            qty: "28" },
  { ico: "📅", label: "Agenda",              qty: "12" },
  { ico: "📋", label: "Compromissos",        qty: "3", warn: true },
  { ico: "💼", label: "Mandato Atual" },
  { ico: "📈", label: "Histórico Eleitoral" },
];

export const NAV_CIDADE = [
  { ico: "🏛", label: "Diretório UB" },
  { ico: "🗺", label: "Mapa Estratégico" },
  { ico: "📨", label: "Cartinha" },
];

export const MODES = [
  { id: "my",  num: "1", label: "Minha Vida Política" },
  { id: "gab", num: "2", label: "Equipe Gabinete" },
  { id: "ag",  num: "3", label: "Agenda Pessoal" },
];
