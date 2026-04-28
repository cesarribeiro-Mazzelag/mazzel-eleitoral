/* Operações · DATA LAYER (1:1 com Designer V1.2)
 * Fonte: public/mockups/v1.2/F3-modulos/02-modulo-operacoes.html
 *
 * 4 sub-views: Hub · Wizard 6 passos · Gestão Ativa Live · Relatório Final
 * Estilo Facebook Ads aplicado à política · cascata Pres → Coord → Cabo
 *
 * Casos âncora:
 *   - Hub: 6 ops ativas + 2 concluídas (Capilarização SP/MG/PE, Eleitoral, Crise RO, Filiação CE, etc)
 *   - Wizard: criação OP-2026-014 Capilarização SP Zona Sul (Rita Tavares líder)
 *   - Live: OP-2026-014 em fase 4/6 Mobilização (147/200 lid + 68/100 cabos + 2.847 fil)
 *   - Relatório: OP-2025-007 BA Salvador Metro (encerrada com sucesso, 14.847 filiações)
 */

export const VIEWS = [
  { id: "hub",    num: "01", label: "Hub" },
  { id: "wizard", num: "02", label: "Wizard 6 passos" },
  { id: "live",   num: "03", label: "Gestão Ativa Live" },
  { id: "report", num: "04", label: "Relatório Final" },
];

/* ============ HUB ============ */
export const HUB_KPIS = [
  { lbl: "Operações ativas",   v: "14",   delta: "+3 este mês", up: true },
  { lbl: "Em alerta",          v: "3",   delta: "exigem atenção", warn: true },
  { lbl: "Cabos engajados",    v: "247", delta: "+18 este mês", up: true },
  { lbl: "Investimento ativo", v: "R$ 14,2M", delta: "orçamento aprovado" },
];

export const HUB_ACTIONS = [
  { ico: "+",  titulo: "Criar Nova Operação",  sub: "Wizard guiado · 6 passos", primary: true },
  { ico: "📋", titulo: "Template Library",     sub: "14 modelos validados" },
  { ico: "⚡", titulo: "Briefing IA",           sub: "Sugere onde criar a próxima op" },
];

export const ACTIVE_OPS = [
  { id: "OP-2026-014", status: "live",  tipo: "Capilarização", nome: "Capilarização SP Cap · Zona Sul",  uf: "SP", mun: "São Paulo",        recorte: "Zona Sul · 14 distritos",        progresso: 67, lid: 147, cabos: 68, fil: 2847, alertas: 3, leader: "RT", leaderNome: "Rita Tavares" },
  { id: "OP-2026-013", status: "live",  tipo: "Eleitoral",      nome: "Pré-2026 · MG · Triângulo",        uf: "MG", mun: "12 mun.",          recorte: "Uberlândia + Uberaba metro",     progresso: 48, lid: 89,  cabos: 41, fil: 1284, alertas: 1, leader: "CB", leaderNome: "Carla Bessa" },
  { id: "OP-2026-012", status: "alert", tipo: "Crise",          nome: "Resposta · Pres. Mun. RO afastado", uf: "RO", mun: "Porto Velho",     recorte: "capital + entorno",              progresso: 28, lid: 12,  cabos: 4,  fil: 187,  alertas: 7, leader: "MB", leaderNome: "M. Bertaiolli" },
  { id: "OP-2026-011", status: "live",  tipo: "Filiação",       nome: "Mutirão Filiação · CE",            uf: "CE", mun: "14 mun.",          recorte: "Fortaleza metropolitana",        progresso: 72, lid: 124, cabos: 58, fil: 4124, alertas: 0, leader: "PB", leaderNome: "P. Bezerra" },
  { id: "OP-2026-010", status: "live",  tipo: "Capilarização", nome: "Capilarização PE · Sertão",         uf: "PE", mun: "23 mun.",          recorte: "Vale do São Francisco",          progresso: 54, lid: 78,  cabos: 32, fil: 1728, alertas: 2, leader: "MS", leaderNome: "M. Souza" },
  { id: "OP-2026-009", status: "plan",  tipo: "Eleitoral",      nome: "Pré-Convenção · DF",                uf: "DF", mun: "Brasília",         recorte: "plano piloto + RA-7",            progresso: 12, lid: 24,  cabos: 8,  fil: 312,  alertas: 0, leader: "PR", leaderNome: "P. Roberto" },
];

export const DONE_OPS = [
  { id: "OP-2025-007", status: "done", tipo: "Capilarização", nome: "Capilarização BA Metro",        uf: "BA", mun: "Salvador + RM", recorte: "47 bairros",                       progresso: 100, lid: 312, cabos: 128, fil: 14847, alertas: 0, leader: "JW", leaderNome: "J. Wagner" },
  { id: "OP-2025-006", status: "done", tipo: "Eleitoral",      nome: "Pós-2024 · MG Triângulo",       uf: "MG", mun: "8 mun.",        recorte: "Uberlândia + cidades-foco",        progresso: 100, lid: 87,  cabos: 38,  fil: 4280,  alertas: 0, leader: "CB", leaderNome: "Carla Bessa" },
];

export const OPS_FILTROS = ["Todas", "Capilarização", "Eleitoral", "Crise", "Filiação"];

export const STATUS_LABELS = {
  live:  "AO VIVO",
  plan:  "PLANEJ.",
  done:  "CONCLUÍDA",
  alert: "ALERTA",
};

/* ============ WIZARD ============ */
export const WIZ_STEPS = [
  { num: "01", titulo: "Tipo de Operação",     desc: "Defina o objetivo macro · isso determina template, fases, KPIs e gatilhos automáticos." },
  { num: "02", titulo: "Recorte Territorial",   desc: "Cascata UF → Municípios → Bairros. Defina onde a operação atua." },
  { num: "03", titulo: "Liderança & Equipe",    desc: "Líder da operação + cabos-de-piso. A equipe vê tudo; o líder pode editar." },
  { num: "04", titulo: "Cronograma & Fases",     desc: "6 fases padrão · você pode renomear, reordenar e ajustar duração." },
  { num: "05", titulo: "Metas & Orçamento",      desc: "KPIs alvo + valor empenhado. Auditável pela Tesouraria." },
  { num: "06", titulo: "Revisão & Lançamento",  desc: "Conferir tudo + lançar a operação. Tudo o que vier depois é live." },
];

export const TIPOS_OPERACAO = [
  { id: "capilarizacao", ico: "⚙️", titulo: "Capilarização Territorial",   desc: "Expandir cobertura UB em região definida · cabos + filiações + presença local", fases: "6", duracao: "3-12 meses",  orcamento: "R$ 500k - 5M" },
  { id: "eleitoral",     ico: "🎯", titulo: "Pré/Pós Campanha Eleitoral",  desc: "Preparação ou consolidação pós-eleição · candidaturas + chapas + alianças",       fases: "8", duracao: "6-18 meses", orcamento: "R$ 1M - 50M" },
  { id: "crise",         ico: "🚨", titulo: "Resposta a Crise",             desc: "Resposta rápida · escândalo, afastamento, judicialização · ciclo curto",         fases: "4", duracao: "2-8 semanas", orcamento: "R$ 100k - 2M" },
  { id: "filiacao",      ico: "📋", titulo: "Mutirão de Filiação",          desc: "Janela TSE · campanha intensiva pra fechar prazo de filiação",                  fases: "5", duracao: "1-3 meses",  orcamento: "R$ 300k - 2M" },
];

export const UFS_LIST = [
  { id: "SP", nome: "São Paulo",        m: "645" },
  { id: "RJ", nome: "Rio de Janeiro",   m: "92" },
  { id: "MG", nome: "Minas Gerais",     m: "853" },
  { id: "BA", nome: "Bahia",             m: "417" },
  { id: "CE", nome: "Ceará",             m: "184" },
  { id: "PE", nome: "Pernambuco",        m: "185" },
  { id: "RS", nome: "Rio G. Sul",       m: "497" },
  { id: "PR", nome: "Paraná",            m: "399" },
  { id: "GO", nome: "Goiás",             m: "246" },
  { id: "DF", nome: "Distrito Federal", m: "1" },
];

export const MUN_SP = ["São Paulo", "Guarulhos", "Campinas", "São Bernardo do Campo", "Santo André", "Osasco", "Sorocaba", "Ribeirão Preto", "São José dos Campos", "Mauá"];
export const BAIRROS_SP = ["Vila Mariana", "Itaim Bibi", "Moema", "Saúde", "Mirandópolis", "Pinheiros", "Vila Olímpia", "Brooklin", "Vila Nova Conceição", "Jardim Paulista", "Ipiranga", "Aclimação", "Liberdade", "Bela Vista"];

export const LEADER_OPTIONS = [
  { id: "rita",   av: "RT", nome: "Rita Tavares",  ovr: 94 },
  { id: "milton", av: "ML", nome: "Milton Leite",  ovr: 78 },
  { id: "paula",  av: "PS", nome: "Paula Silva",    ovr: 82 },
];

export const CABOS_OPTIONS = [
  { id: "joao",  av: "JM", nome: "João Mendes",   ovr: 91, on: true },
  { id: "paula", av: "PS", nome: "Paula Silva",    ovr: 82, on: true },
  { id: "andre", av: "AF", nome: "André Fonseca", ovr: 68, on: true },
  { id: "luiz",  av: "LR", nome: "Luiz Ribeiro",   ovr: 65 },
  { id: "carla", av: "CD", nome: "Carla Diniz",    ovr: 71 },
];

export const FASES_PADRAO = [
  { n: "01", t: "Mapeamento",   d: "Levantar lideranças latentes na região",   dur: "2 sem" },
  { n: "02", t: "Recrutamento", d: "Convidar e formalizar cabos-de-piso",       dur: "3 sem" },
  { n: "03", t: "Treinamento",   d: "Capacitação obrigatória + onboarding",     dur: "2 sem" },
  { n: "04", t: "Mobilização",   d: "Bater na porta · filiações · eventos",      dur: "8 sem", active: true },
  { n: "05", t: "Consolidação", d: "Mensurar resultados · ajustes",              dur: "4 sem" },
  { n: "06", t: "Encerramento",  d: "Relatório final · transição",               dur: "2 sem" },
];

export const METAS_PERFORMANCE = [
  { lbl: "Filiações novas",       sub: "cadastradas + abonadas",                         val: "5.000" },
  { lbl: "Cabos engajados",       sub: "treinados + ativos",                            val: "100" },
  { lbl: "Eventos realizados",    sub: "comícios, plenárias, encontros",                val: "18" },
  { lbl: "Cobertura · % bairros", sub: "com pelo menos 1 cabo ativo",                  val: "80%" },
  { lbl: "Score Pres. Mun. · meta", sub: "OVR atual: 78 · meta: +8 pts",                val: "86" },
];

export const ORCAMENTO_DETALHADO = [
  { lbl: "Pessoal · cabos + coord.", sub: "R$ 4k/cabo/mês × 5 meses",                    val: "500.000" },
  { lbl: "Eventos · mobilização",    sub: "18 eventos × média R$ 6k",                    val: "108.000" },
  { lbl: "Mídia digital",             sub: "impulsionamento + criação",                    val: "120.000" },
  { lbl: "Material gráfico",          sub: "panfletos, banners, brindes",                  val: "62.000" },
  { lbl: "Reserva imprevistos",       sub: "~7%",                                           val: "60.000" },
];

export const ORCAMENTO_TOTAL = "R$ 850.000";

/* ============ LIVE (Gestão Ativa OP-2026-014) ============ */
export const LIVE_HERO = {
  tag: "EM ANDAMENTO",
  id: "OP-2026-014",
  titulo: "Capilarização SP Capital · Zona Sul",
  where: [
    { lbl: "UF",          v: "São Paulo" },
    { lbl: "Município",   v: "São Paulo (capital)" },
    { lbl: "Recorte",      v: "Zona Sul · 14 distritos" },
    { lbl: "Cargo-foco",   v: "Vereador 2028" },
  ],
  fase: { atual: 4, total: 6, nome: "Mobilização", percent: 67 },
};

export const LIVE_KPIS = [
  { lbl: "Lideranças", v: "147 / 200", delta: "+12 (sem)",        up: true },
  { lbl: "Cabos",      v: "68 / 100",  delta: "+5 (sem)",         up: true },
  { lbl: "Filiações",  v: "2.847",     delta: "+341 (sem)",       up: true },
  { lbl: "Eventos",    v: "12 / 18",   delta: "próximo: 28/abr" },
  { lbl: "Orçamento",  v: "68%",       delta: "no ritmo",         down: true },
];

export const FEED = [
  { tipo: "fil",   av: "JM", t: "**João Mendes** registrou 12 novas filiações em **Capão Redondo**", sub: "Lote validado pela Receita · 12/12 abonadas",                          when: "07:42" },
  { tipo: "sys",   av: "⚡", t: "Sistema · **Meta semanal de filiações batida** em Cidade Ademar (+105%)", sub: "Gatilho automático · bonificação Rita Tavares",                  when: "06:18" },
  { tipo: "lid",   av: "RT", t: "**Rita Tavares** adicionou nova liderança: **Marcos Pereira (OVR 71)**", sub: "Bairro: Vila Andrade · onboarding agendado 28/abr",                when: "06:02" },
  { tipo: "alert", av: "!",  t: "Alerta · Sub-cabo **Luiz Ribeiro (M' Boi Mirim)** abaixo de 50% da meta", sub: "Recomendação: chamada 1:1 + plano de retomada",                  when: "05:48" },
  { tipo: "fil",   av: "PS", t: "**Paula Silva** realizou evento \"Plenária Cidade Ademar\"",          sub: "147 presentes · 38 fichas de filiação coletadas",                     when: "21:14 24/abr" },
  { tipo: "sys",   av: "📋", t: "Sistema · **Tesouraria validou despesa** R$ 38.400 (eventos abr)",  sub: "Comprovação: 12 NFs + 1 boletim · sem ressalva",                       when: "17:30 24/abr" },
  { tipo: "lid",   av: "AF", t: "**André Fonseca** concluiu treinamento obrigatório",                sub: "Módulo 4/4 · Compliance + LGPD · status: ATIVO",                       when: "14:22 24/abr" },
  { tipo: "fil",   av: "JM", t: "**João Mendes** registrou 8 novas filiações em **Jardim São Luís**", sub: "Lote validado · 7 abonadas + 1 pendente",                              when: "11:08 24/abr" },
];

export const FEED_FILTROS = ["Todos", "Lideranças", "Filiações", "Alertas"];

export const COORDENACAO = [
  { av: "RT", nome: "Rita Tavares",   sub: "Líder · Zona Sul",         pct: 94, level: "high" },
  { av: "JM", nome: "João Mendes",    sub: "Sub · Capão Redondo",       pct: 91, level: "high" },
  { av: "PS", nome: "Paula Silva",     sub: "Sub · Cidade Ademar",       pct: 73, level: "mid" },
  { av: "AF", nome: "André Fonseca",  sub: "Sub · Santo Amaro",         pct: 68, level: "mid" },
  { av: "LR", nome: "Luiz Ribeiro",    sub: "Sub · M' Boi Mirim",        pct: 42, level: "low" },
];

export const PROXIMOS_MARCOS = [
  { ico: "📅", nome: "Convenção Zona Sul",  sub: "Comício · Cap. Redondo",      when: "28/abr", color: "var(--mz-warn)" },
  { ico: "🎯", nome: "Meta · 200 lid.",     sub: "Faltam 53 cadastros",         when: "15/mai", color: "var(--mz-info)" },
  { ico: "📋", nome: "Audit · Tesouraria",   sub: "Comprovação 50% orç.",        when: "22/mai", color: "var(--mz-tenant-accent)" },
  { ico: "✓",  nome: "Encerramento",         sub: "Relatório final",             when: "30/jun", color: "var(--mz-ok)" },
];

export const LIVE_ALERTAS = [
  { ico: "!", nome: "M' Boi Mirim · 42%",   sub: "Sub-cabo abaixo da meta", warn: true },
  { ico: "!", nome: "Orçamento Q2",         sub: "Adiantado · revisar",      warn: true },
  { ico: "i", nome: "Concorrência PSD",     sub: "Aumentou eventos +47%",    info: true },
];

export const LIVE_ACOES = [
  "📋 Exportar relatório parcial",
  "💬 Abrir chat sigiloso",
  "🎯 Ajustar metas",
];
export const LIVE_ACAO_PRIMARY = "⏸️ Pausar operação";

/* ============ RELATÓRIO FINAL (OP-2025-007 BA) ============ */
export const REPORT = {
  id: "OP-2025-007",
  titulo: "Capilarização\nBA · Salvador\nMetropolitana",
  lead: "OP-2025-007 · 18/jan/2025 - 22/abr/2026 · Encerrada com sucesso",
  resumo: [
    "A operação **OP-2025-007 · Capilarização BA Metropolitana** foi conduzida em 47 bairros de Salvador e Região Metropolitana entre janeiro de 2025 e abril de 2026, sob coordenação do Pres. Estadual Wagner. Investimento total: **R$ 4,2M**. Resultado: **cobertura UB saltou de 41% para 78%** nos bairros-alvo, com **14.847 novas filiações** consolidadas - superando a meta original em **+18%**.",
    "O modelo será replicado em **Recife** (PE) e **Fortaleza** (CE) no Q3/2026, totalizando R$ 11,8M de investimento previsto na expansão Nordeste.",
  ],
  kpis: [
    [
      { lbl: "Cobertura UB · Bairros-alvo", v: "78%",       delta: "+37pp vs. baseline",     up: true },
      { lbl: "Novas Filiações",              v: "14.847",   delta: "+18% vs. meta",          up: true },
      { lbl: "Lideranças Ativas",             v: "312",      delta: "+24% vs. meta",          up: true },
      { lbl: "Investimento",                  v: "R$ 4,2M",  delta: "Dentro do orçamento" },
    ],
    [
      { lbl: "Eventos realizados",            v: "47",       delta: "+9 vs. plan.",           up: true },
      { lbl: "Cabos engajados",               v: "128",      delta: "retenção 91%",           up: true },
      { lbl: "Score Pres. Est.",              v: "87",       delta: "+5 pts vs. início",      up: true },
      { lbl: "ROI estimado",                  v: "3.8x",     delta: "Excelente",              up: true },
    ],
  ],
  bairros: [
    { nome: "Pituba",     cabo: "Maria Souza",         cob: "94%", fil: "1.247", delta: "+12.4", deltaColor: "var(--mz-ok)",     status: "★ Excedeu",  statusColor: "var(--mz-ok)" },
    { nome: "Brotas",     cabo: "João Lima",           cob: "91%", fil: "1.108", delta: "+10.8", deltaColor: "var(--mz-ok)",     status: "★ Excedeu",  statusColor: "var(--mz-ok)" },
    { nome: "Itapuã",     cabo: "Paulo Santos",        cob: "87%", fil: "982",   delta: "+9.1",  deltaColor: "var(--mz-ok)",     status: "★ Excedeu",  statusColor: "var(--mz-ok)" },
    { nome: "Cabula",     cabo: "Rita Mendes",         cob: "82%", fil: "874",   delta: "+8.4",  deltaColor: "var(--mz-ok)",     status: "Atingiu",     statusColor: undefined },
    { nome: "Pernambués", cabo: "Carlos Dias",         cob: "79%", fil: "821",   delta: "+7.9",  deltaColor: "var(--mz-ok)",     status: "Atingiu" },
    { nome: "Liberdade",  cabo: "Ana Cruz",            cob: "76%", fil: "714",   delta: "+7.2",  deltaColor: "var(--mz-ok)",     status: "Atingiu" },
    { nome: "Periperi",   cabo: "Luiz Almeida",        cob: "62%", fil: "524",   delta: "+4.8",  deltaColor: "var(--mz-warn)",   status: "Parcial",     statusColor: "var(--mz-warn)" },
    { nome: "Sussuarana", cabo: "(órfão · vacância)",  cob: "48%", fil: "312",   delta: "+2.1",  deltaColor: "var(--mz-danger)", status: "Aquém",       statusColor: "var(--mz-danger)" },
  ],
  licoes: [
    { titulo: "O que funcionou:",     body: "O modelo de cabo-líder + 4 sub-cabos por bairro mostrou-se ideal - bairros com essa estrutura completa atingiram média de **87% cobertura**, contra **52%** em bairros com estrutura incompleta." },
    { titulo: "O que não funcionou:", body: "Sussuarana ficou aquém por vacância de cabo-líder na fase 4. Em **Recife**, designar 2 cabos-líder candidatos por bairro (redundância) elimina esse risco." },
    { titulo: "Principal aprendizado:", body: "A primeira fase (mapeamento) é o que define o sucesso - bairros onde o mapeamento foi feito por equipe local **(não por consultoria externa)** tiveram performance **+34% superior**. Replicar esse padrão é mandatório." },
  ],
};

export const META_TOTAL_DEFAULT = {
  uf: "SP", municipios: 1, bairros: 5, populacao: "~520.000",
  inicio: "28/abr/2026", fim: "29/out/2026", duracao: "22 semanas (~5 meses)",
};
