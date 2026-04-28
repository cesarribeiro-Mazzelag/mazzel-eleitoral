/* Tesouraria · DATA LAYER (1:1 com Designer V1.2)
 * Fonte: public/mockups/v1.2/F4-estatutario/04-tesouraria.html
 *
 * Saldo R$ 4.7M · Q1/2026 SP capital · 7 contas · 412 doadores · 1.247 lançamentos
 * 4 hero KPIs · 4 TSE compliance cards · cashflow trimestral · rubricas
 * orçado vs realizado · top transações · top doadores · alocação por município
 * · 4 alertas financeiros priorizados
 */

export const NAV_PRIMARY = [
  { ico: "📊", label: "Dashboard",         qty: "—",     active: true },
  { ico: "💰", label: "Receitas",          qty: "2.4M" },
  { ico: "💸", label: "Despesas",          qty: "1.8M" },
  { ico: "📋", label: "Rubricas",          qty: "12" },
  { ico: "🔁", label: "Conciliação",       qty: "23",    warn: true },
  { ico: "🏦", label: "Contas Bancárias",   qty: "7" },
  { ico: "👥", label: "Doadores",          qty: "847" },
  { ico: "📤", label: "Repasses",          qty: "147" },
];

export const NAV_COMPLIANCE = [
  { ico: "⚖️", label: "TSE / Prest. Contas", qty: "OK" },
  { ico: "📅", label: "Prazos",              qty: "3", warn: true },
  { ico: "📜", label: "Auditorias",          qty: "14" },
  { ico: "🔐", label: "Logs LGPD",            qty: "—" },
];

export const NAV_RELATORIOS = [
  { ico: "📈", label: "Mensal",            qty: "—" },
  { ico: "📊", label: "Trimestral (Q1)",    qty: "—" },
  { ico: "📑", label: "Exercício 2025",     qty: "—" },
];

export const HERO_KPIS = [
  { lbl: "Saldo Consolidado", v: "R$ 4.7", suffix: "M",  delta: "▲ R$ 612k (+15%) vs Q4/25",        sub: "7 contas · 4 bancos",            tipo: "tenant" },
  { lbl: "Receitas Q1/2026",  v: "R$ 2.4", suffix: "M",  delta: "▲ R$ 287k (+13%) YoY",             sub: "847 lançamentos · 412 doadores", tipo: "up" },
  { lbl: "Despesas Q1/2026",  v: "R$ 1.8", suffix: "M",  delta: "▲ R$ 142k (+8.5%) YoY",            sub: "1.247 lançamentos · 12 rubricas", tipo: "down" },
  { lbl: "A Conciliar",        v: "R$ 47",  suffix: "k",  delta: "23 lançamentos pendentes",         sub: "prazo limite: 30/abr (5 dias)",   tipo: "warn" },
];

export const TSE_CARDS = [
  { ico: "✓", titulo: "Prest. Contas Q4/2025", val: "PROTOCOLADA",   sub: "n° 4127-A · TSE 18/jan/2026",     tipo: "ok" },
  { ico: "!", titulo: "Prest. Contas Q1/2026", val: "EM PREP.",      sub: "prazo: 30/abr/2026 · 5 dias restantes", tipo: "warn" },
  { ico: "✓", titulo: "Limite Doação PF",      val: "62% utilizado", sub: "R$ 1.4M / R$ 2.3M (10% renda)",   tipo: "ok" },
  { ico: "⚠", titulo: "Doações irregulares",   val: "2 alertas",     sub: "doadores acima do teto · revisar", tipo: "danger" },
];

export const CASHFLOW = [
  { mes: "jan",  in: 72, out: 58 },
  { mes: "fev",  in: 64, out: 51 },
  { mes: "mar",  in: 88, out: 70 },
  { mes: "abr*", in: 47, out: 38, parcial: true },
];

export const DONUT_RUBRICAS = [
  { nome: "Operações",   sub: "OP-014 + outras",       pct: 38, color: "var(--mz-ok)" },
  { nome: "Pessoal",     sub: "gabinete + equipe",     pct: 26, color: "var(--mz-info)" },
  { nome: "Comunicação", sub: "mídia + gráfica",       pct: 17, color: "var(--mz-tenant-accent)" },
  { nome: "Eventos",     sub: "convenções + reuniões",  pct: 11, color: "var(--mz-warn)" },
  { nome: "Outros",       sub: "jurídico + manutenção",  pct: 8,  color: "var(--mz-danger)" },
];

export const RUBRICAS = [
  { nome: "Operações de campo",       real: "R$ 685k", orcado: "R$ 850k", pct: 81 },
  { nome: "Pessoal · gabinete",       real: "R$ 468k", orcado: "R$ 580k", pct: 81 },
  { nome: "Comunicação / mídia",       real: "R$ 306k", orcado: "R$ 320k", pct: 96, warn: true },
  { nome: "Eventos & convenções",      real: "R$ 218k", orcado: "R$ 180k", pct: 121, over: true },
  { nome: "Jurídico",                  real: "R$ 87k",  orcado: "R$ 140k", pct: 62 },
  { nome: "Tecnologia (plataforma)",    real: "R$ 42k",  orcado: "R$ 60k",  pct: 70 },
  { nome: "Manutenção sede",            real: "R$ 18k",  orcado: "R$ 30k",  pct: 60 },
];

export const TRANSACOES = [
  { tipo: "in",  titulo: "Doação PF · Carlos Bittencourt Lopes",   sub: "CPF 478.***.***-35 · TED Itaú",       cat: "DOAÇÃO PF",  when: "25/abr · 09:14", val: "+R$ 8.500",  status: "CONFIRMADO", statusClass: "ok" },
  { tipo: "out", titulo: "Pagto · Gráfica Imprema (kits OP-014)",   sub: "NF 4827 · 24.000 unid",                cat: "COMUNIC.",   when: "24/abr · 16:42", val: "−R$ 47.200", status: "PAGO",       statusClass: "ok" },
  { tipo: "in",  titulo: "Doação PJ · Construtora Aurora Ltda.",    sub: "CNPJ 12.***.***/0001-44 · PIX",        cat: "DOAÇÃO PJ",  when: "23/abr · 11:08", val: "+R$ 35.000", status: "TSE OK",     statusClass: "tse" },
  { tipo: "out", titulo: "Folha pessoal · gabinete (mar/26)",        sub: "14 servidores · CLT + comissionados",  cat: "PESSOAL",    when: "22/abr · 10:00", val: "−R$ 156k",   status: "PAGO",       statusClass: "ok" },
  { tipo: "in",  titulo: "Repasse Fundo Partidário · Direção Nac.", sub: "cota mensal SP capital",                cat: "FUNDO PART.",when: "20/abr · 14:30", val: "+R$ 412k",   status: "TSE OK",     statusClass: "tse" },
  { tipo: "out", titulo: "Locação sala extra · convenção 10/mai",   sub: "Espaço Augusta · 8h evento",          cat: "EVENTOS",    when: "19/abr · 09:48", val: "−R$ 24.000", status: "A CONCILIAR", statusClass: "pend" },
  { tipo: "in",  titulo: "Doação PF · Roberto Marinho Junior",     sub: "CPF 712.***.***-86 · TED Bradesco",    cat: "DOAÇÃO PF",  when: "18/abr · 17:14", val: "+R$ 12.000", status: "CONFIRMADO", statusClass: "ok" },
];

export const DOADORES = [
  { av: "CA", nome: "Construtora Aurora Ltda.",  sub: "CNPJ 12.***.***/0001-44 · São Paulo",  total: "R$ 87",  totalSuffix: "k",  doacoes: "3", ultima: "23/abr",  flag: "✓ TSE OK",        flagColor: "var(--mz-ok)",   tipo: "pj" },
  { av: "SF", nome: "SóFort Indústria S.A.",      sub: "CNPJ 23.***.***/0001-78 · Campinas",   total: "R$ 65",  totalSuffix: "k",  doacoes: "2", ultima: "14/mar",  flag: "✓ TSE OK",        flagColor: "var(--mz-ok)",   tipo: "pj" },
  { av: "JK", nome: "Júlio Kowalski Lopes",       sub: "CPF 156.***.***-22 · empresário",       total: "R$ 42",  totalSuffix: "k",  doacoes: "4", ultima: "18/abr",  flag: "⚠ revisar limite", flagColor: "var(--mz-warn)", tipo: "pf" },
  { av: "FP", nome: "Fundo Partidário · Nacional", sub: "repasse mensal · cota SP capital",     total: "R$ 1.2", totalSuffix: "M",  doacoes: "Repasses: 3", ultima: "20/mai (próx)", flag: "✓ regular", flagColor: "var(--mz-ok)", tipo: "fp" },
  { av: "CB", nome: "Carlos Bittencourt Lopes",    sub: "CPF 478.***.***-35 · contador",         total: "R$ 28",  totalSuffix: "k",  doacoes: "5", ultima: "25/abr",  flag: "✓ TSE OK",        flagColor: "var(--mz-ok)",   tipo: "pf" },
  { av: "+",  nome: "+ 842 outros doadores",       sub: "847 totais · ticket médio R$ 2.834",   total: "R$ 998", totalSuffix: "k",  doacoes: "87% PF · 13% PJ", ultima: "ver lista completa →", flag: null, tipo: "pj" },
];

export const MUNICIPIOS = [
  { av: "SP", nome: "São Paulo (capital)", sub: "Mun. · 124k filiados · OP-2026-014", orcado: "R$ 850k",   realizado: "R$ 685k", realizadoColor: "var(--mz-warn)",   pct: 81, warn: true,  vRestante: "R$ 165k", vRestanteColor: "var(--mz-tenant-accent)", subRestante: "disponível" },
  { av: "GR", nome: "Guarulhos",            sub: "Mun. · 38k filiados",                  orcado: "R$ 280k",   realizado: "R$ 184k", pct: 66, vRestante: "R$ 96k",  subRestante: "disponível" },
  { av: "CP", nome: "Campinas",             sub: "Mun. · 27k filiados",                  orcado: "R$ 220k",   realizado: "R$ 142k", pct: 65, vRestante: "R$ 78k",  subRestante: "disponível" },
  { av: "OS", nome: "Osasco",               sub: "Mun. · 18k filiados · ⚠ repasse atrasado", orcado: "R$ 140k", realizado: "R$ 28k", realizadoColor: "var(--mz-danger)", pct: 20, warn: true, vRestante: "R$ 112k", vRestanteColor: "var(--mz-warn)", subRestante: "a repassar" },
  { av: "+",  nome: "+ 641 outros municípios", sub: "SP · agregado",                       orcado: "R$ 1.84M",  realizado: "R$ 1.21M", pct: 66, vRestante: "R$ 627k", subRestante: "disponível" },
];

export const ALERTAS = [
  { tipo: "danger", ico: "⚠", titulo: "2 doadores acima do teto de doação PF", desc: "Júlio Kowalski Lopes (R$ 42k · 11.2% renda) e mais 1. Revisar antes da prestação Q1 (30/abr).", btn: "Revisar agora", btnTipo: "primary" },
  { tipo: "warn",   ico: "!", titulo: "Eventos & convenções: 121% do orçado",   desc: "Estouro de R$ 38k em rubrica. Aprovar suplementação ou realocar de Jurídico (saldo R$ 53k disponível).", btn: "Realocar" },
  { tipo: "warn",   ico: "!", titulo: "Repasse a Osasco atrasado · 80% do orçado pendente", desc: "R$ 112k a repassar · prazo estatutário 25/abr (vencido). Acionado pelo presidente municipal Osasco.", btn: "Liberar TED" },
  { tipo: "info",   ico: "i", titulo: "Prestação Contas Q1/2026 · TSE",          desc: "Prazo 30/abr (5 dias). 23 lançamentos a conciliar antes de protocolar. Auto-rascunho gerado por IA.", btn: "Abrir rascunho", btnTipo: "primary" },
];

export const PERIODOS = ["7d", "30d", "Q1/2026", "Ano", "Custom"];
