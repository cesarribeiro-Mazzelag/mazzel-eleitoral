/* Diretórios & Comissões · DATA LAYER (1:1 com Designer V1.2)
 * Fonte: public/mockups/v1.2/F4-estatutario/01-diretorios-comissoes.html
 *
 * 5 abas: Diretório · Comissões · Atas · Atos & Resoluções · Histórico
 * 4 órgãos colegiados (Mesa/Executiva/Fiscal/Ética) com membros completos
 * 10 comissões setoriais
 * 9 documentos estatutários
 * 6 entradas timeline
 * Sidebar direita: Saúde Estatutária + Alertas + Próximas Reuniões + Ações + Conformidade
 */

export const TREE = [
  { lvl: "nac", icon: "N",  nome: "UB · Direção Nacional", total: "RAIZ", arr: "▾" },
  { lvl: "est", icon: "SP", nome: "São Paulo",             total: "645",  arr: "▾", expanded: true },
  { lvl: "mun", icon: "SP", nome: "São Paulo (capital)",   total: "96",   arr: "▸", active: true },
  { lvl: "mun", icon: "GR", nome: "Guarulhos",             total: "61",   arr: "▸" },
  { lvl: "mun", icon: "CP", nome: "Campinas",              total: "52",   arr: "▸" },
  { lvl: "mun", icon: "OS", nome: "Osasco",                total: "38",   arr: "▸", warn: true },
  { lvl: "est", icon: "RJ", nome: "Rio de Janeiro",        total: "312",  arr: "▸" },
  { lvl: "est", icon: "MG", nome: "Minas Gerais",          total: "418",  arr: "▸" },
  { lvl: "est", icon: "BA", nome: "Bahia",                 total: "387",  arr: "▸", warn: true },
  { lvl: "est", icon: "CE", nome: "Ceará",                 total: "147",  arr: "▸" },
  { lvl: "est", icon: "PE", nome: "Pernambuco",            total: "152",  arr: "▸" },
  { lvl: "est", icon: "RS", nome: "Rio G. do Sul",         total: "324",  arr: "▸" },
  { lvl: "est", icon: "RO", nome: "Rondônia",              total: "28",   arr: "▸", warn: true },
  { lvl: "est", icon: "DF", nome: "Distrito Federal",      total: "1",    arr: "▸" },
];

export const TABS = [
  { id: "dir",  label: "Diretório" },
  { id: "com",  label: "Comissões" },
  { id: "atas", label: "Atas" },
  { id: "atos", label: "Atos & Resoluções" },
  { id: "hist", label: "Histórico" },
];

export const HERO = {
  badge: "SP",
  titulo: "Diretório Municipal · São Paulo Capital",
  pills: [
    { label: "✓ Estatuto vigente", tipo: "ok" },
    { label: "Mandato: 2024 — 2028", bold: ["2024 — 2028"] },
    { label: "Pres: Milton Leite", bold: ["Milton Leite"] },
    { label: "CNPJ: 12.345.678/0001-90", bold: ["12.345.678/0001-90"] },
    { label: "TSE: regular · sem pendências", bold: ["regular · sem pendências"] },
  ],
  stats: [
    { lbl: "Membros eleitos",  v: "96" },
    { lbl: "Comissões ativas", v: "14" },
    { lbl: "Suplentes",        v: "28" },
    { lbl: "Filiados ativos",  v: "124k" },
    { lbl: "Mandatários",      v: "147" },
  ],
  acoes: [
    { label: "+ Convocar Reunião", tipo: "tenant" },
    { label: "+ Nova Comissão",    tipo: "primary" },
    { label: "📋 Exportar PDF",    tipo: "default" },
    { label: "📜 Ver Estatuto",    tipo: "default" },
  ],
};

// Aba Comissões: 4 órgãos colegiados detalhados
export const COMISSOES_DETALHADAS = [
  {
    icon: "M", nome: "Mesa Diretora", qty: "7 / 7 ocupados",
    members: [
      { av: "ML", nome: "Milton Leite",     sub: "Vereador SP · OVR 78 · DEM/UB desde 1996", role: "Pres.",  roleClass: "pres" },
      { av: "CV", nome: "Carla Vieira",     sub: "Vice · ex-Subprefeita Pinheiros",          role: "Vice",   roleClass: "vice" },
      { av: "RA", nome: "Rogério Almeida",  sub: "Tesoureiro · contador CRC-SP",             role: "Tes.",   roleClass: "tes" },
      { av: "PS", nome: "Patrícia Souza",   sub: "Sec. Geral · advogada · OAB-SP",           role: "Sec.",   roleClass: "sec" },
      { av: "JD", nome: "João Dias",        sub: "Sec. Adjunto · OVR 71",                    role: "Adj." },
      { av: "MR", nome: "Marina Rocha",     sub: "Vogal · zona leste",                       role: "Vogal" },
      { av: "EF", nome: "Eduardo Ferraz",   sub: "Vogal · zona sul",                         role: "Vogal" },
    ],
  },
  {
    icon: "E", nome: "Comissão Executiva", qty: "11 / 11 ocupados",
    members: [
      { av: "ML", nome: "Milton Leite",     sub: "Pres. Mun. · ex-officio",                  role: "Coord.", roleClass: "pres" },
      { av: "RT", nome: "Rita Tavares",     sub: "Coord. Operações · OP-2026-014",           role: "Op." },
      { av: "CV", nome: "Carla Vieira",     sub: "Liderança Política",                       role: "Pol." },
      { av: "FB", nome: "Fernando Brito",   sub: "Comunicação · ex-DCJ",                     role: "Com." },
      { av: "PS", nome: "Patrícia Souza",   sub: "Jurídico",                                  role: "Jur." },
      { av: "+6", nome: "+ 6 outros membros", sub: "ver lista completa",                     role: "▸" },
    ],
  },
  {
    icon: "F", nome: "Conselho Fiscal", qty: "3 / 3 ocupados",
    members: [
      { av: "RA", nome: "Rogério Almeida",  sub: "Coordenador · contador",                   role: "Coord.", roleClass: "tes" },
      { av: "LM", nome: "Luiza Martins",    sub: "Auditora · CFA",                           role: "Aud." },
      { av: "CB", nome: "Carlos Bueno",     sub: "Suplente convocado",                       role: "Sup." },
    ],
  },
  {
    icon: "É", nome: "Comissão de Ética", qty: "4 / 5 ocupados",
    members: [
      { av: "PS", nome: "Patrícia Souza",   sub: "Pres. · OAB-SP 187432",                    role: "Pres.",  roleClass: "pres" },
      { av: "JR", nome: "Juliana Ramos",    sub: "Membro · LGPD",                            role: "Mem." },
      { av: "AC", nome: "Andre Costa",      sub: "Membro · advogado",                        role: "Mem." },
      { av: "HM", nome: "Helena Mota",      sub: "Membro",                                   role: "Mem." },
      { av: "?",  nome: "Vaga em aberto",   sub: "1 cadeira · convocar suplente",            role: "Vaga",   roleClass: "vac" },
    ],
  },
];

// Comissões setoriais (10 ativas - mostrando 4 detalhadas como no mockup)
export const COMISSOES_SETORIAIS = [
  {
    icon: "JV", nome: "Juventude UB-SP", qty: "9 mem · ativa",
    members: [
      { av: "VR", nome: "Vitória Reis", sub: "23 anos · USP · ativista",  role: "Pres.", roleClass: "pres" },
      { av: "+8", nome: "+ 8 jovens lideranças", sub: "≤30 anos · OVR médio 64", role: "▸" },
    ],
  },
  {
    icon: "MU", nome: "Mulheres UB-SP", qty: "12 mem · ativa",
    members: [
      { av: "CV", nome: "Carla Vieira", sub: "Pres. · ex-Subprefeita", role: "Pres.", roleClass: "pres" },
      { av: "+11", nome: "+ 11 lideranças", sub: "cota estatutária 30%", role: "▸" },
    ],
  },
  {
    icon: "AF", nome: "Afro-UB SP", qty: "8 mem · ativa",
    members: [
      { av: "JN", nome: "Jonas Nascimento", sub: "Pres. · ativista CONEN", role: "Pres.", roleClass: "pres" },
    ],
  },
  {
    icon: "CR", nome: "Comissão Eleitoral 2026", qty: "7 mem · prazo até dez/26",
    members: [
      { av: "PS", nome: "Patrícia Souza", sub: "Pres. · jurídico eleitoral", role: "Pres.", roleClass: "pres" },
      { av: "+6", nome: "+ 6 membros",    sub: "composição mista",           role: "▸" },
    ],
  },
];

// Aba Diretório: 9 documentos
export const DOCUMENTOS = [
  { ico: "PDF", titulo: "Estatuto UB Nacional v3.2",          sub: "aprovado 12/03/2024",            r1Lbl: "Páginas",     r1Val: "147",  status: "VIGENTE",          statusClass: "assinado" },
  { ico: "PDF", titulo: "Ata Convenção Mun. SP 2024",          sub: "21/jul/2024 · 96 votos",         r1Lbl: "Páginas",     r1Val: "32",   status: "REGISTRADA",       statusClass: "assinado" },
  { ico: "PDF", titulo: "Resolução 04/2026 · Comissões",       sub: "vigência: 2026—2028",            r1Lbl: "Páginas",     r1Val: "14",   status: "VIGENTE",          statusClass: "assinado" },
  { ico: "DOC", titulo: "Reg. Interno Comissão Ética",         sub: "aguardando 2 assinaturas",       r1Lbl: "Pendências",  r1Val: "2 / 5",status: "DOCUSIGN PEND.",   statusClass: "pend" },
  { ico: "PDF", titulo: "Ata Reunião Executiva 04/2026",       sub: "18/abr/2026 · 9 presentes",      r1Lbl: "Páginas",     r1Val: "8",    status: "ASSINADA",         statusClass: "assinado" },
  { ico: "DOC", titulo: "Memorando OP-014 · alocação",         sub: "orçamento R$ 850k aprovado",     r1Lbl: "Origem",      r1Val: "Operações", status: "PROTOCOLADO", statusClass: "assinado" },
  { ico: "PDF", titulo: "Termo de Filiação · template",        sub: "v2024 com cláusula LGPD",        r1Lbl: "Versão",      r1Val: "2024.r3", status: "VIGENTE",      statusClass: "assinado" },
  { ico: "PDF", titulo: "Procuração TSE · Pres. Mun.",         sub: "vencendo 30/jun/2026",           r1Lbl: "Vence em",    r1Val: "65 dias", r1Color: "var(--mz-warn)", status: "RENOVAR", statusClass: "exp" },
  { ico: "DOC", titulo: "Ata Vacância · Comissão Ética",       sub: "renúncia · necessita reposição", r1Lbl: "Cargo",       r1Val: "1 vaga",  status: "REPOR",       statusClass: "pend" },
];

// Aba Histórico: timeline de atos
export const TIMELINE = [
  { tipo: "ok",     when: "25/abr/2026 · 09:14", titulo: "Reunião Executiva 05/2026 marcada",        body: "Pauta: revisão Fase 4 OP-2026-014 + Tesouraria Q2 + comissão eleitoral. Local: Diretório Mun. · 26/abr 10h." },
  { tipo: "warn",   when: "22/abr/2026 · 14:30", titulo: "Vacância em Comissão de Ética",            body: "Renúncia formal de Mariana Lopes (motivos pessoais). Ata protocolada. Convocar suplente em 30 dias conforme Estatuto art. 47." },
  { tipo: "ok",     when: "18/abr/2026",          titulo: "Resolução 04/2026 publicada",               body: "Define composição das 14 comissões para mandato 2026-2028. Aprovada unanimemente em reunião 03/2026." },
  { tipo: "ok",     when: "12/abr/2026",          titulo: "Mesa Diretora homologada pelo TSE",         body: "Composição 2024-2028 ratificada. Sem ressalvas. Próxima validação: jul/2026 (semestral)." },
  { tipo: "ok",     when: "04/abr/2026",          titulo: "Comissão Eleitoral 2026 instituída",        body: "7 membros · prazo até dez/2026 · prepara processo interno de pré-candidaturas." },
  { tipo: "danger", when: "28/mar/2026",          titulo: "Procuração TSE vencendo em 65 dias",        body: "Renovação automática agendada · gerar nova via DocuSign até 25/jun." },
];

// Sidebar direita: Saúde Estatutária
export const SAUDE = [
  { lbl: "Composição Mesa Diretora",       v: "7 / 7",        bar: 100 },
  { lbl: "Composição Comissões",            v: "54 / 56",      bar: 96 },
  { lbl: "Comissão Ética · cota",           v: "4 / 5",        bar: 80,  warn: true,  vColor: "var(--mz-warn)" },
  { lbl: "Atas em dia",                     v: "11 / 12",      bar: 92 },
  { lbl: "Quórum últimas 5 reuniões",       v: "média 87%",    bar: 87,  vColor: "var(--mz-ok)" },
  { lbl: "Cota mulheres",                    v: "38%",          bar: 76,  vColor: "var(--mz-ok)" },
  { lbl: "Documentos vigentes",              v: "9 / 11",       bar: 82,  warn: true },
];

// Sidebar direita: 3 Alertas
export const ALERTAS = [
  { ic: "!", titulo: "Vaga em Comissão de Ética", sub: "Convocar suplente · prazo 22/mai (30d)", danger: false },
  { ic: "!", titulo: "Procuração TSE vencendo",   sub: "65 dias · gerar nova via DocuSign",       danger: false },
  { ic: "i", titulo: "Reg. Interno Ética",         sub: "2 assinaturas pendentes em DocuSign",      danger: false },
];

// Sidebar direita: 3 Próximas Reuniões
export const REUNIOES = [
  { dia: "26", titulo: "Reunião Executiva 05/2026", sub: "26/abr · 10h · Diretório Mun. · 11 convocados", icoBg: "var(--mz-tenant-accent)",  icoColor: "var(--mz-fg-on-accent)" },
  { dia: "30", titulo: "Reunião Conselho Fiscal",   sub: "30/abr · 14h · validação Q1",                   icoBg: "var(--mz-info-soft)",      icoColor: "var(--mz-info)" },
  { dia: "10", titulo: "Convenção Mun. Extraord.",  sub: "10/mai · pauta única: chapa 2026",              icoBg: "var(--mz-tenant-primary)", icoColor: "var(--mz-tenant-accent)" },
];

// Sidebar direita: Ações Rápidas
export const ACOES_RAPIDAS = [
  "📋 Convocar reunião extraordinária",
  "⚖️ Convocar suplente vacância",
  "📜 Gerar ata pré-formatada",
  "🔁 Renovar procuração TSE",
  "📤 Exportar relatório estatutário",
];
export const ACAO_PRINCIPAL = "+ Nova comissão especial";

// Sidebar direita: Conformidade TSE/LGPD
export const CONFORMIDADE = [
  { lbl: "TSE · regularidade",       v: "REGULAR",          vColor: "var(--mz-ok)", bold: true },
  { lbl: "CNPJ · Receita",           v: "ATIVA",            vColor: "var(--mz-ok)", bold: true },
  { lbl: "LGPD · DPO designado",     v: "SIM",              vColor: "var(--mz-ok)", bold: true },
  { lbl: "Última auditoria",          v: "14/mar/2026",     vColor: "var(--mz-fg)" },
];

// Aba Atas: lista de 6 atas
export const ATAS = [
  { id: "ATA-2026-005", titulo: "Ata Reunião Executiva 05/2026", sub: "Pauta: OP-2026-014 + Tesouraria Q2", presentes: "11/11",  status: "AGUARDANDO", statusClass: "pend",   when: "26/abr (futura)" },
  { id: "ATA-2026-004", titulo: "Ata Reunião Executiva 04/2026", sub: "Aprovação Resolução 04/2026",         presentes: "9/11",   status: "ASSINADA",   statusClass: "assinado", when: "18/abr/2026" },
  { id: "ATA-2026-003", titulo: "Ata Reunião Executiva 03/2026", sub: "Composição comissões 2026-2028",       presentes: "10/11",  status: "ASSINADA",   statusClass: "assinado", when: "11/abr/2026" },
  { id: "ATA-2026-002", titulo: "Ata Conselho Fiscal Q1",         sub: "Aprovação balanço Q1",                 presentes: "3/3",    status: "REGISTRADA", statusClass: "assinado", when: "04/abr/2026" },
  { id: "ATA-2024-CV",  titulo: "Ata Convenção Municipal 2024",   sub: "Eleição Mesa Diretora · 96 votos",     presentes: "96/96",  status: "REGISTRADA", statusClass: "assinado", when: "21/jul/2024" },
  { id: "ATA-2026-VAC", titulo: "Ata Vacância Comissão Ética",     sub: "Renúncia Mariana Lopes",               presentes: "—",      status: "REPOR",      statusClass: "pend",   when: "22/abr/2026" },
];

// Aba Atos & Resoluções: resoluções + memorandos + atos
export const ATOS_RESOLUCOES = [
  { id: "RES 04/2026",  titulo: "Composição das 14 Comissões 2026-2028",    autor: "Mesa Diretora",       status: "VIGENTE",      statusClass: "assinado", when: "18/abr/2026" },
  { id: "RES 03/2026",  titulo: "Reg. Interno Comissão Eleitoral",            autor: "Mesa Diretora",       status: "VIGENTE",      statusClass: "assinado", when: "04/abr/2026" },
  { id: "MEM OP-014",   titulo: "Alocação orçamentária OP-2026-014",          autor: "Coord. Operações",    status: "PROTOCOLADO",  statusClass: "assinado", when: "12/abr/2026" },
  { id: "RES 02/2026",  titulo: "Atualização Reg. Interno Comissão Ética",    autor: "Comissão de Ética",  status: "DOCUSIGN PEND.", statusClass: "pend",  when: "08/abr/2026" },
  { id: "RES 01/2026",  titulo: "Plano Estratégico 2026 · Diretório Mun.",     autor: "Mesa Diretora",       status: "VIGENTE",      statusClass: "assinado", when: "15/jan/2026" },
  { id: "ATO 12/2025",  titulo: "Designação Coord. Operações OP-014",          autor: "Pres. Mun.",          status: "VIGENTE",      statusClass: "assinado", when: "20/dez/2025" },
];
