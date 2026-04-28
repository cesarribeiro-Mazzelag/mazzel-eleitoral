/* Filiados · DATA LAYER (1:1 com Designer V1.2)
 * Fonte: public/mockups/v1.2/F4-estatutario/02-filiados.html
 *
 * 12 filiados de exemplo + perfil completo do João Mendes (cabo eleitoral
 * ZL · OP-2026-014) que aparece como selecionado por default.
 */

export const KPIS = [
  { label: "Filiados ativos · BR", value: "3.247.184",            delta: "▲ 12.4k este mês",     deltaTipo: "up" },
  { label: "SP capital",            value: "124.812",             delta: "▲ 1.247 (30d)",         deltaTipo: "up" },
  { label: "DocuSign pendentes",    value: "847",                 delta: "▼ 32 vs sem. passada", deltaTipo: "down", valueColor: "var(--mz-warn)" },
  { label: "A regularizar TSE",     value: "214",                 delta: "prazo 30 dias",        valueColor: "var(--mz-danger)" },
];

export const FILTROS = {
  ufs: ["São Paulo (124.812)", "Rio de Janeiro", "Minas Gerais", "Bahia"],
  municipios: ["São Paulo (capital)", "Guarulhos", "Campinas"],
  status: [
    { label: "Regular (118k)", on: true },
    { label: "Pendente (847)", on: true },
    { label: "Sigiloso (12)" },
    { label: "Vencido (214)" },
  ],
  tags: [
    { label: "Cabo eleitoral (1.847)", on: true },
    { label: "Liderança (423)" },
    { label: "Mandatário (147)" },
    { label: "Doador (892)" },
    { label: "Voluntário (3.124)" },
  ],
  datas: ["Qualquer data", "Últimos 30 dias", "Este ano", "2024-2026"],
  abonadores: ["Qualquer", "Cabo eleitoral", "Liderança comunitária", "Mandatário"],
};

export const TABS = [
  { id: "todos",     label: "Todos",              num: "124.812" },
  { id: "docusign",  label: "Pendentes DocuSign", num: "847" },
  { id: "abono",     label: "Em abono",           num: "312" },
  { id: "sigilosos", label: "Sigilosos",          num: "12" },
  { id: "renovar",   label: "A renovar",          num: "214" },
  { id: "auditoria", label: "Auditoria",          num: "5" },
];

export const FILIADOS = [
  {
    id: "joao-mendes", iniciais: "JM", nome: "João Mendes da Silva", cpfMasked: "187.***.***-42", idade: 47,
    statusKey: "regular", statusLabel: "REGULAR",
    desde: "14/03/2018", duracao: "8 anos",
    abonador: "Rita Tavares", abonadorTipo: "liderança",
    local: "Itaquera · ZL", localSub: "SP capital",
  },
  {
    id: "luiz-fernando", iniciais: "LF", nome: "Luiz Fernando Dias", cpfMasked: "412.***.***-08", idade: 39,
    statusKey: "regular", statusLabel: "CABO",
    desde: "22/06/2020", duracao: "5 anos",
    abonador: "João Mendes", abonadorTipo: "cabo",
    local: "Cidade Tiradentes", localSub: "SP capital",
  },
  {
    id: "paula-rocha", iniciais: "PR", nome: "Paula Rocha Albuquerque", cpfMasked: "089.***.***-71", idade: 32,
    statusKey: "pendente", statusLabel: "DOCUSIGN",
    desde: "23/04/2026", duracao: "3 dias",
    abonador: "Rita Tavares", abonadorTipo: "liderança",
    local: "São Mateus · ZL", localSub: "SP capital",
  },
  {
    id: "antonio-souza", iniciais: "AS", nome: "Antonio Souza Pereira", cpfMasked: "341.***.***-59", idade: 56,
    statusKey: "regular", statusLabel: "REGULAR",
    desde: "04/02/2014", duracao: "12 anos",
    abonador: "—", abonadorTipo: "filiação direta",
    local: "Mooca · Centro", localSub: "SP capital",
  },
  {
    id: "marcia-vieira", iniciais: "MV", nome: "Marcia Vieira Castro", cpfMasked: "567.***.***-13", idade: 44,
    statusKey: "novo", statusLabel: "NOVO",
    desde: "25/04/2026", duracao: "1 dia",
    abonador: "Carla Vieira", abonadorTipo: "vice-pres mun",
    local: "Pinheiros · ZO", localSub: "SP capital",
  },
  {
    id: "roberto-marinho", iniciais: "RM", nome: "Roberto Marinho Junior", cpfMasked: "712.***.***-86", idade: 61,
    statusKey: "sigiloso", statusLabel: "🔒 SIGILOSO",
    desde: "—", duracao: "oculto",
    abonador: "Milton Leite", abonadorTipo: "pres mun",
    local: "—", localSub: "protegido",
  },
  {
    id: "eliana-costa", iniciais: "EC", nome: "Eliana Costa Mendonça", cpfMasked: "234.***.***-44", idade: 51,
    statusKey: "exp", statusLabel: "VENCIDO",
    desde: "14/03/2010", duracao: "16 anos",
    abonador: "—", abonadorTipo: "",
    local: "Cidade Líder", localSub: "SP capital",
  },
  {
    id: "daniel-gomes", iniciais: "DG", nome: "Daniel Gomes Tavares", cpfMasked: "098.***.***-22", idade: 28,
    statusKey: "regular", statusLabel: "CABO",
    desde: "11/09/2022", duracao: "3 anos",
    abonador: "Luiz Fernando Dias", abonadorTipo: "cabo",
    local: "Cidade Tiradentes", localSub: "SP capital",
  },
  {
    id: "sandra-ferreira", iniciais: "SF", nome: "Sandra Ferreira Lima", cpfMasked: "156.***.***-91", idade: 38,
    statusKey: "pendente", statusLabel: "DOCUSIGN",
    desde: "20/04/2026", duracao: "6 dias",
    abonador: "João Mendes", abonadorTipo: "cabo",
    local: "Itaim Paulista", localSub: "SP capital",
  },
  {
    id: "carlos-bittencourt", iniciais: "CB", nome: "Carlos Bittencourt Lopes", cpfMasked: "478.***.***-35", idade: 49,
    statusKey: "regular", statusLabel: "DOADOR",
    desde: "02/05/2016", duracao: "9 anos",
    abonador: "Milton Leite", abonadorTipo: "pres mun",
    local: "Vila Mariana · ZS", localSub: "SP capital",
  },
  {
    id: "vitoria-reis", iniciais: "VR", nome: "Vitória Reis dos Santos", cpfMasked: "823.***.***-67", idade: 23,
    statusKey: "regular", statusLabel: "JOVEM",
    desde: "18/03/2024", duracao: "2 anos",
    abonador: "Carla Vieira", abonadorTipo: "vice-pres mun",
    local: "Butantã · ZO", localSub: "SP capital",
  },
  {
    id: "jonas-nascimento", iniciais: "JN", nome: "Jonas Nascimento Barros", cpfMasked: "691.***.***-04", idade: 41,
    statusKey: "regular", statusLabel: "LIDER.",
    desde: "09/11/2019", duracao: "6 anos",
    abonador: "—", abonadorTipo: "filiação direta",
    local: "Capão Redondo · ZS", localSub: "SP capital",
  },
];

// IDs dos 3 selecionados por default no mockup (aparecem na bulk-bar)
export const SELECIONADOS_DEFAULT = ["joao-mendes", "luiz-fernando", "paula-rocha"];
export const PERFIL_ATIVO_DEFAULT = "joao-mendes";

// Perfil completo do filiado (lateral direita)
// 1:1 com mockup linhas 363-475 - João Mendes da Silva
export const PERFIL_DETALHE = {
  "joao-mendes": {
    iniciais: "JM",
    nome: "João Mendes da Silva",
    meta: "Cabo eleitoral · OP-2026-014 · Zona Leste",
    pills: [
      { label: "✓ TSE Regular",         tipo: "ok" },
      { label: "✓ DocuSign assinado",   tipo: "ok" },
      { label: "8 anos de filiação",    tipo: "neutral" },
      { label: "Quadrante 14-A",        tipo: "neutral" },
      { label: "⚠ 23 visitas pendentes", tipo: "warn" },
    ],
    cadastrais: [
      { k: "CPF",         v: "187.***.***-42", sub: "validado em 14/03/2018" },
      { k: "Nascimento",  v: "22/08/1978 (47 anos)" },
      { k: "Telefone",    v: "(11) 9****-2284", sub: "WhatsApp ativo" },
      { k: "Email",       v: "j.mendes****@gmail.com" },
      { k: "Endereço",    v: "Itaquera · ZL", sub: "quadrante 14-A · SP capital" },
      { k: "Ocupação",    v: "Comerciante (mercearia)" },
      { k: "Estado civil", v: "Casado · 2 filhos" },
    ],
    cadeiaAbono: [
      { iniciais: "ML", nome: "Milton Leite",            sub: "Pres. Mun. · raiz da árvore",            nivel: "N0" },
      { iniciais: "RT", nome: "Rita Tavares",            sub: "Liderança comunitária ZL · abonou direto", nivel: "N1" },
      { iniciais: "JM", nome: "João Mendes (vc)",        sub: "Cabo · abonado por Rita em 14/03/2018",  nivel: "N2", destaque: true },
      { iniciais: "+12", nome: "+ 12 abonados por João", sub: "cabos e filiados sob sua árvore",        nivel: "N3+" },
    ],
    docusign: {
      titulo: "Termo de Filiação UB v2024.r3",
      envelope: "envelope #DS-2018-04719",
      steps: [
        { label: "Envio do termo",            sub: "14/03/2018 · 09:14",                        status: "FEITO",       state: "done" },
        { label: "Verificação CPF/Receita",   sub: "14/03/2018 · 09:18",                        status: "VALIDADO",    state: "done" },
        { label: "Assinatura do filiado",     sub: "14/03/2018 · 11:42 · IP 187.X.X.42",        status: "ASSINADO",    state: "done" },
        { label: "Contra-assinatura abonador", sub: "Rita Tavares · 14/03/2018 · 14:08",         status: "ASSINADO",    state: "done" },
        { label: "Protocolo TSE",             sub: "26/03/2018 · lote 4127-A",                  status: "REGISTRADO",  state: "done" },
        { label: "Termo arquivado",           sub: "repositório DocuSign · imutável",           status: "VIGENTE",     state: "done" },
      ],
    },
    tags: ["cabo eleitoral", "OP-2026-014", "quadrante 14-A", "comerciante", "whatsapp ativo"],
    auditoria: [
      { texto: "Reportou rota OP-014 dia 1",            when: "25/abr/2026 09:14" },
      { texto: "Recebeu material gráfico (kit 14-A)",   when: "22/abr/2026 11:30" },
      { texto: "Validação biométrica · campo",          when: "18/abr/2026 14:22" },
      { texto: "Adicionado a OP-2026-014 por Rita Tavares", when: "04/abr/2026 10:05" },
      { texto: "Atualização de telefone (LGPD log)",    when: "28/mar/2026 16:48" },
    ],
    acoes: [
      "💬 Iniciar chat (DM)",
      "📞 Ligar via gabinete",
      "📋 Ver dossiê de cabo",
      "📤 Reenviar termo (DocuSign)",
      "🏷️ Editar tags",
      "⚖️ Designar como abonador",
    ],
    acaoPrincipal: "+ Adicionar a operação",
    lgpd: [
      { texto: "Vc (você) leu agora",                   when: "25/abr/2026 09:14:23 · IP 187.X.X.42" },
      { texto: "Rita Tavares leu",                      when: "22/abr/2026 18:30" },
      { texto: "Sistema · validação TSE periódica",     when: "14/abr/2026 03:00 (cron)" },
    ],
  },
};

export const STATUS_CLASS = {
  regular:  { bg: "var(--mz-ok-soft)",                 fg: "var(--mz-ok)" },
  pendente: { bg: "var(--mz-warn-soft)",               fg: "var(--mz-warn)" },
  sigiloso: { bg: "rgba(168, 85, 247, 0.18)",          fg: "#c084fc" },
  exp:      { bg: "var(--mz-danger-soft)",             fg: "var(--mz-danger)" },
  novo:     { bg: "var(--mz-info-soft)",               fg: "var(--mz-info)" },
};
