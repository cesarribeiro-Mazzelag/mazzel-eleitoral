/* Sidebar derivada de perfil — 1:1 com Designer V1.2.
 *
 * Fonte: codigo/frontend/public/mockups/v1.2/F1-fundacao/02-sidebar-condicional.html
 * (linhas 545-1082, const PROFILES).
 *
 * 10 perfis canônicos. NÃO inventar item, label, grupo ou ID.
 * Decisões registradas pelo Designer (linhas 537-543):
 *   - "Coordenadores", "Afiliados", "Mandato", "Super" da V2 antiga absorvidos
 *     pelos perfis canônicos (deixaram de ser itens universais)
 *   - Cabo Eleitoral é último nível DENTRO de Operações (sem item próprio nas sidebars dos superiores)
 *   - Filiado fica de fora desta V1 (decisão César 25/04)
 *   - Coord Regional / Coord Territorial fica de fora desta V1
 *
 * Cada item: [label, sid, icon, badge | null]
 * Badge formats:
 *   - 'live'         → indicador pulse
 *   - 'danger:N'     → chip vermelho com N
 *   - 'warn:N|texto' → chip âmbar
 *   - 'tenant:N'     → chip accent (amarelo UB)
 *   - 'ok'           → chip verde
 *   - string livre   → chip muted (ex.: '500 santinhos', 'v2.4', '847k')
 *   - null           → sem badge
 *
 * Hrefs apontam pras rotas que existem hoje no V2 (codigo/frontend/app/mazzel-preview).
 * Items sem rota dedicada apontam pro fallback mais próximo (ex.: '#todo' marca placeholder). */

/* Resolver href do item da sidebar a partir do sid (id curto do Designer) e do role.
 * Mantém os items declarativos como o Designer escreveu, mas resolve pro V2. */
function resolveHref(sid, role) {
  // Cabo eleitoral tem rotas próprias (mobile bottom tabs)
  if (role === "cabo") {
    const cabo = {
      home:   "/mazzel-preview/cabo/agenda",   // Tarefa do Dia
      mapa:   "/mazzel-preview/cabo/area",
      chat:   "/mazzel-preview/chat",
      hist:   "/mazzel-preview/cabo/registro",
      sos:    "#sos",                          // ativa modo SOS do chat (TODO)
      meta:   "/mazzel-preview/cabo/metas",
      mat:    "#mat",                          // TODO: rota materiais alocados
      coord:  "/mazzel-preview/chat",          // canal direto com coord
    };
    return cabo[sid] || "/mazzel-preview";
  }

  // Mapa universal: sid → rota V2
  const map = {
    // Comuns
    home:    "/mazzel-preview",
    mapa:    "/mazzel-preview/mapa",
    ops:     "/mazzel-preview/operacoes",
    radar:   "/mazzel-preview/radar",
    alert:   "/mazzel-preview/alertas",
    chat:    "/mazzel-preview/chat",
    ag:      "/mazzel-preview/agenda",
    ia:      "/mazzel-preview/ia",
    est:     "/mazzel-preview/estudo",
    ali:     "/mazzel-preview/aliancas",
    lid:     "/mazzel-preview/liderancas",
    em:      "/mazzel-preview/emendas",
    inv:     "/mazzel-preview/convites",

    // Estrutura partidária
    dir:     "/mazzel-preview/diretorios",
    com:     "/mazzel-preview/diretorios",     // Comissão Nacional/Estadual/Executiva
    uf:      "/mazzel-preview/diretorios",     // Estados (27 UFs)
    mun:     "/mazzel-preview/diretorios",     // 645 Municípios
    nom:     "/mazzel-preview/nominata",
    fil:     "/mazzel-preview/filiados",
    cab:     "/mazzel-preview/cabos-gestao",
    sec:     "/mazzel-preview/diretorios",
    memb:    "/mazzel-preview/diretorios",
    sup:     "/mazzel-preview/diretorios",     // Suplentes
    ata:     "/mazzel-preview/diretorios",     // Atas

    // Documentos
    doc:     "/mazzel-preview/documentos",
    res:     "/mazzel-preview/documentos",
    man:     "/mazzel-preview/documentos",
    tpl:     "/mazzel-preview/documentos",
    ds:      "/mazzel-preview/documentos",     // DocuSign
    sol:     "/mazzel-preview/documentos",     // Solicitações

    // Tesouraria
    tes:     "/mazzel-preview/tesouraria",
    fin:     "/mazzel-preview/tesouraria",
    rec:     "/mazzel-preview/tesouraria",
    desp:    "/mazzel-preview/tesouraria",
    pag:     "/mazzel-preview/tesouraria",
    con:     "/mazzel-preview/tesouraria",
    comp:    "/mazzel-preview/tesouraria",
    nf:      "/mazzel-preview/tesouraria",
    rel:     "/mazzel-preview/tesouraria",     // Relatórios financeiros (Tesoureiro)
    tse:     "/mazzel-preview/tesouraria",     // Prestação TSE
    aud:     "/mazzel-preview/admin",
    audit:   "/mazzel-preview/admin",

    // Dossies
    dos:     "/mazzel-preview/dossies",
    banc:    "/mazzel-preview/dossies",        // Bancada (filtro)
    gov:     "/mazzel-preview/dossies",        // Tarcísio (gov) — TODO link direto

    // Político eleito + gabinete (Camada 3)
    eq:      "/mazzel-preview/portal",         // Equipe Gabinete (TODO sub-rota)
    tar:     "/mazzel-preview/portal",         // Tarefas
    atv:     "/mazzel-preview/portal",         // Atividade Legisl.
    vot:     "/mazzel-preview/portal",         // Bancada/Votações
    mid:     "#todo:midia",                    // Mídia & Clipping
    clip:    "#todo:clipping",
    opem:    "/mazzel-preview/operacoes",      // Operações em mim
    op:      "/mazzel-preview/operacoes",
    proc:    "#todo:processos",
    aler:    "/mazzel-preview/alertas",        // Alertas Jurídicos
    dis:     "#todo:discursos",
    soc:     "#todo:redes-sociais",

    // Mazzel super admin (Camada 1)
    console: "/mazzel-preview/admin",
    tenants: "/mazzel-preview/admin",          // TODO: rota /super/tenants
    health:  "/mazzel-preview/admin",
    jobs:    "/mazzel-preview/admin",
    costs:   "/mazzel-preview/admin",
    logs:    "/mazzel-preview/admin",
    lgpd:    "/mazzel-preview/admin",
    flags:   "/mazzel-preview/admin",
    sup_:    "/mazzel-preview/admin",          // Suporte (sid 'sup' colide; alias)
    rbac:    "/mazzel-preview/admin",
    users:   "/mazzel-preview/admin",
    brand:   "/mazzel-preview/admin",
    dom:     "/mazzel-preview/admin",
    logo:    "/mazzel-preview/admin",
    pdf:     "/mazzel-preview/documentos",
    plug:    "/mazzel-preview/admin",
    dou:     "/mazzel-preview/admin",
    ses:     "/mazzel-preview/admin",
    wa:      "/mazzel-preview/admin",
  };

  return map[sid] || "#todo:" + sid;
}

/* Mapa Designer icon → V2 Icon component name. */
const ICON_MAP = {
  home: "Home",       building: "Build",     pulse: "Trend",       cycle: "Cycle",
  wallet: "Wallet",   list: "FileText",      shield: "Shield",     lock: "Lock",
  flag: "Flag",       rocket: "Rocket",      help: "Help",         globe: "External",
  palette: "Settings", people: "Users",      team: "Users",        mail: "Bell",
  plug: "Settings",   phone: "Phone",        doc: "FileText",      image: "Image",
  file: "FileText",   map: "MapPin",         target: "Target",     radar: "Target",
  bell: "Bell",       tree: "GitBranch",     badge: "UserCheck",   profile: "User",
  gov: "Build",       broadcast: "External", spark: "Sparkles",    pen: "Edit",
  cal: "Calendar",    check: "Check",        star: "Star",         link: "External",
  walk: "MapPin",     sign: "Edit",          book: "FileText",     box: "FileText",
  alert: "AlertTriangle", mic: "Mic",        clock: "Calendar",    plus: "Plus",
  minus: "Minus",     chart: "Trend",
};

function resolveIcon(designerIcon) {
  return ICON_MAP[designerIcon] || "Home";
}

/* Parser de badge → estrutura usada pelo componente Sidebar */
function parseBadge(raw) {
  if (!raw) return null;
  if (raw === "live") return { kind: "live" };
  if (raw === "ok") return { kind: "ok", text: "OK" };
  if (raw.startsWith && raw.startsWith("danger:")) return { kind: "danger", text: raw.slice(7) };
  if (raw.startsWith && raw.startsWith("warn:"))   return { kind: "warn",   text: raw.slice(5) };
  if (raw.startsWith && raw.startsWith("tenant:")) return { kind: "tenant", text: raw.slice(7) };
  return { kind: "muted", text: String(raw) };
}

/* ============================================================
 * 10 PERFIS · Designer V1.2 — copiado linha por linha
 * ============================================================ */

export const PROFILES = [
  /* ========== CAMADA 1 — MAZZEL ========== */
  {
    id: "mazzel-super",
    pill: "Super Admin Mazzel",
    pillNum: "01",
    camada: "C1",
    nome: "Marcelo (Mazzel)",
    iniciais: "MZ",
    role: "Super Admin",
    scope: "Todos os Tenants",
    sections: [
      { sec: "Operacional", items: [
        ["Console",          "console", "home",   "live"],
        ["Tenants",          "tenants", "building", "4"],
        ["Saúde do Sistema", "health",  "pulse",  "live"],
        ["ETLs & Jobs",      "jobs",    "cycle",  null],
        ["Custos",           "costs",   "wallet", null],
      ]},
      { sec: "Auditoria", items: [
        ["Logs de Acesso",    "logs",  "list",   null],
        ["Auditoria Cross",   "audit", "shield", "12k"],
        ["Cumprimento LGPD",  "lgpd",  "lock",   "ok"],
      ]},
      { sec: "Plataforma", items: [
        ["Feature Flags", "flags", "flag",   null],
        ["Releases",      "rel",   "rocket", "v2.4"],
        ["Suporte",       "sup_",  "help",   "7"],
      ]},
    ],
  },

  {
    id: "admin-tenant",
    pill: "Admin do Partido",
    pillNum: "02",
    camada: "C1",
    nome: "Equipe TI União Brasil",
    iniciais: "TI",
    role: "Admin de Tenant",
    scope: "Tenant: União Brasil",
    sections: [
      { sec: "Tenant", items: [
        ["Visão Geral", "home",  "home",    null],
        ["White Label", "brand", "palette", null],
        ["Domínios",    "dom",   "globe",   null],
      ]},
      { sec: "Pessoas", items: [
        ["Usuários",            "users", "people", "2.847"],
        ["Papéis & RBAC",       "rbac",  "shield", null],
        ["Convites Pendentes",  "inv",   "mail",   "14"],
        ["Auditoria",           "audit", "list",   null],
      ]},
      { sec: "Integrações", items: [
        ["DocuSign",          "ds",  "sign",  "ok"],
        ["TSE / DivulgaCand", "tse", "plug",  "live"],
        ["DOU",               "dou", "plug",  null],
        ["SES (e-mail)",      "ses", "mail",  null],
        ["WhatsApp Business", "wa",  "phone", "ok"],
      ]},
      { sec: "Conteúdo", items: [
        ["Templates de Doc.", "tpl",  "doc",   "23"],
        ["Logo & Branding",   "logo", "image", null],
        ["Modelos PDF",       "pdf",  "file",  null],
      ]},
    ],
  },

  /* ========== CAMADA 2 — POLÍTICA PARTIDÁRIA ========== */
  {
    id: "pres-nac",
    pill: "Pres Nacional",
    pillNum: "03",
    camada: "C2",
    nome: "Antônio Rueda",
    iniciais: "AR",
    role: "Presidente Nacional",
    scope: "Brasil · 27 UFs",
    sections: [
      { sec: "Comando", items: [
        ["Dashboard Nacional", "home",  "home",   "live"],
        ["Mapa Estratégico",   "mapa",  "map",    null],
        ["Operações",          "ops",   "target", "14"],
        ["Radar Político",     "radar", "radar",  "3"],
        ["Alertas",            "alert", "bell",   "danger:7"],
      ]},
      { sec: "Partido", items: [
        ["Diretórios",         "dir", "tree",   "5.570"],
        ["Comissão Nacional",  "com", "people", null],
        ["Estados (27 UFs)",   "uf",  "flag",   null],
        ["Filiados",           "fil", "badge",  "847k"],
        ["Nominata",           "nom", "list",   "warn:23%"],
      ]},
      { sec: "Eletivos & Mídia", items: [
        ["Dossiês",          "dos",  "profile",   "70k"],
        ["Bancada",          "banc", "gov",       null],
        ["Mídia & Clipping", "mid",  "broadcast", null],
      ]},
      { sec: "Gestão", items: [
        ["Documentos",     "doc", "doc",    null],
        ["Tesouraria",     "tes", "wallet", null],
        ["Estudo",         "est", "book",   null],
        ["IA Estratégica", "ia",  "spark",  null],
      ]},
    ],
  },

  {
    id: "pres-est",
    pill: "Pres Estadual (Milton)",
    pillNum: "04",
    camada: "C2",
    nome: "Milton Leite",
    iniciais: "ML",
    role: "Presidente Estadual SP",
    scope: "São Paulo · 645 municípios",
    sections: [
      { sec: "Comando SP", items: [
        ["Dashboard SP",     "home",  "home",   "live"],
        ["Mapa Estratégico", "mapa",  "map",    null],
        ["Operações",        "ops",   "target", "23"],
        ["Radar SP",         "radar", "radar",  "5"],
        ["Alertas SP",       "alert", "bell",   "danger:12"],
      ]},
      { sec: "Estrutura SP", items: [
        ["Comissão Estadual", "com", "people", null],
        ["645 Municípios",    "mun", "tree",   "warn:78%"],
        ["Filiados SP",       "fil", "badge",  "124k"],
        ["Cabos Eleitorais",  "cab", "walk",   "3.412"],
      ]},
      { sec: "Eletivos SP", items: [
        ["Dossiês SP",     "dos",  "profile", null],
        ["Bancada SP",     "banc", "gov",     null],
        ["Tarcísio (gov)", "gov",  "star",    "tenant:96"],
      ]},
      { sec: "Gestão SP", items: [
        ["Documentos SP",  "doc", "doc",       null],
        ["Tesouraria SP",  "tes", "wallet",    null],
        ["Mídia SP",       "mid", "broadcast", null],
        ["IA Estratégica", "ia",  "spark",     null],
      ]},
    ],
  },

  {
    id: "pres-mun",
    pill: "Pres Municipal",
    pillNum: "05",
    camada: "C2",
    nome: "Alessandro Rotunno",
    iniciais: "AR",
    role: "Presidente Municipal",
    scope: "Itaquaquecetuba/SP",
    sections: [
      { sec: "Município", items: [
        ["Painel Municipal",  "home",  "home",   "live"],
        ["Mapa do Município", "mapa",  "map",    null],
        ["Operações",         "ops",   "target", "6"],
        ["Alertas",           "alert", "bell",   "warn:3"],
      ]},
      { sec: "Comissão", items: [
        ["Nominata Municipal",  "nom",  "list",   "warn:Pendente"],
        ["Sec-Geral",           "sec",  "people", null],
        ["Tesoureiro",          "tes",  "wallet", null],
        ["Membros & Suplentes", "memb", "team",   "12"],
      ]},
      { sec: "Base", items: [
        ["Filiados",         "fil", "badge", "847"],
        ["Cabos Eleitorais", "cab", "walk",  "34"],
        ["Lideranças",       "lid", "star",  null],
      ]},
      { sec: "Gestão", items: [
        ["Documentos", "doc", "doc",    null],
        ["Atas",       "ata", "pen",    null],
        ["Tesouraria", "fin", "wallet", null],
      ]},
    ],
  },

  {
    id: "tesou",
    pill: "Tesoureiro",
    pillNum: "06",
    camada: "C2",
    nome: "Cláudia Silva",
    iniciais: "CS",
    role: "Tesoureira Estadual",
    scope: "União Brasil SP",
    sections: [
      { sec: "Tesouraria", items: [
        ["Painel Financeiro", "home", "home",   "live"],
        ["Receitas",          "rec",  "plus",   null],
        ["Despesas",          "desp", "minus",  null],
        ["Contas a Pagar",    "pag",  "wallet", "warn:14"],
        ["Conciliação",       "con",  "check",  null],
      ]},
      { sec: "Compliance", items: [
        ["Prestação TSE",    "tse", "gov",    "ok"],
        ["DocuSign Recibos", "ds",  "sign",   null],
        ["Auditoria",        "aud", "shield", null],
      ]},
      { sec: "Documentos", items: [
        ["Comprovantes",  "comp", "file",  null],
        ["Notas Fiscais", "nf",   "doc",   null],
        ["Relatórios",    "rel",  "chart", null],
      ]},
      { sec: "Consulta", items: [
        ["Filiados (read)", "fil", "badge", null],
      ]},
    ],
  },

  {
    id: "secgeral",
    pill: "Sec-Geral",
    pillNum: "07",
    camada: "C2",
    nome: "Pedro Almeida",
    iniciais: "PA",
    role: "Secretário-Geral",
    scope: "Comissão Estadual SP",
    sections: [
      { sec: "Secretaria", items: [
        ["Painel",          "home", "home",  null],
        ["Agenda Comissão", "ag",   "cal",   null],
        ["Atas",            "ata",  "pen",   "warn:3"],
        ["Tarefas",         "tar",  "check", "7"],
      ]},
      { sec: "Nominata", items: [
        ["Nominata",          "nom",  "list", "warn:Pendente"],
        ["Membros",           "memb", "team", null],
        ["Suplentes",         "sup",  "team", null],
        ["DocuSign Pendentes","ds",   "sign", "4"],
      ]},
      { sec: "Documentos", items: [
        ["Repositório", "doc", "doc",  null],
        ["Resoluções",  "res", "star", null],
        ["Manifestos",  "man", "flag", null],
        ["Templates",   "tpl", "pen",  null],
      ]},
      { sec: "Filiados (apoio)", items: [
        ["Filiados",     "fil", "badge", null],
        ["Solicitações", "sol", "mail",  null],
      ]},
    ],
  },

  /* ========== CAMADA 3 — ELETIVA ========== */
  {
    id: "eleito",
    pill: "Político Eleito",
    pillNum: "08",
    camada: "C3",
    nome: "Senador Jaques Wagner",
    iniciais: "JW",
    role: "Senador (BA)",
    scope: "Mandato pessoal · BA",
    sections: [
      { sec: "Eu", items: [
        ["Cenário Político", "home", "radar",   "live"],
        ["Meu Dossiê",       "dos",  "profile", "tenant:95"],
        ["Minha Agenda",     "ag",   "cal",     null],
        ["Equipe Gabinete",  "eq",   "team",    "8"],
      ]},
      { sec: "Mandato", items: [
        ["Atividade Legisl.", "atv", "gov",       null],
        ["Bancada/Votações",  "vot", "flag",      null],
        ["Comissões",         "com", "list",      null],
        ["Discursos & Mídia", "mid", "broadcast", null],
      ]},
      { sec: "Base & Aliados", items: [
        ["Mapa da Base",     "mapa", "map",    null],
        ["Alianças",         "ali",  "link",   null],
        ["Lideranças BA",    "lid",  "star",   null],
        ["Operações em mim", "opem", "target", "3"],
      ]},
      { sec: "Inteligência", items: [
        ["Estudo",     "est",  "book",      null],
        ["Emendas",    "em",   "wallet",    null],
        ["Clipping",   "clip", "broadcast", null],
        ["IA Pessoal", "ia",   "spark",     null],
      ]},
    ],
  },

  {
    id: "gabinete",
    pill: "Equipe Gabinete",
    pillNum: "09",
    camada: "C3",
    nome: "Mariana Costa",
    iniciais: "MC",
    role: "Chefe de Gabinete · Sen. Wagner",
    scope: "Gabinete · subtipo: Chefe",
    sections: [
      { sec: "Subtipo: Chefe", items: [
        ["Painel Geral",    "home", "home",  null],
        ["Agenda Político", "ag",   "cal",   null],
        ["Equipe",          "eq",   "team",  null],
        ["Tarefas",         "tar",  "check", "12"],
      ]},
      { sec: "Mandato", items: [
        ["Atividade Legisl.", "atv", "gov",  null],
        ["Bancada/Votações",  "vot", "flag", null],
      ]},
      { sec: "Comunicação", items: [
        ["Mídia & Clipping", "mid", "broadcast", null],
        ["Discursos",        "dis", "mic",       null],
        ["Redes Sociais",    "soc", "globe",     null],
      ]},
      { sec: "Articulação", items: [
        ["Alianças",         "ali",  "link",   null],
        ["Mapa da Base",     "mapa", "map",    null],
        ["Operações em mim", "op",   "target", "3"],
      ]},
      { sec: "Jurídico", items: [
        ["Processos",         "proc", "shield", null],
        ["Alertas Jurídicos", "aler", "bell",   null],
      ]},
    ],
  },

  /* ========== CAMADA 4 — OPERACIONAL (mobile-first) ========== */
  {
    id: "cabo",
    pill: "Cabo Eleitoral (mobile)",
    pillNum: "10",
    camada: "C4",
    nome: "José Silva",
    iniciais: "JS",
    role: "Cabo Eleitoral",
    scope: "Itaquera · Quadra 47",
    /* Cabo é mobile-first (bottom-tabs grandes), NÃO tem sidebar tradicional.
     * Em desktop preview rendemos os mesmos items numa coluna estreita. */
    mobileFirst: true,
    sections: [
      { sec: "Bottom Tabs (mobile)", items: [
        ["Tarefa do Dia",    "home", "check", "tenant:NOVA"],
        ["Mapa",             "mapa", "map",   null],
        ["Falar",            "chat", "mic",   "live"],
        ["Histórico",        "hist", "clock", null],
        ["SOS · Emergência", "sos",  "alert", "danger"],
      ]},
      { sec: "Acesso rápido", items: [
        ["Minhas metas",       "meta",  "star",   null],
        ["Materiais alocados", "mat",   "box",    "500 santinhos"],
        ["Coordenador",        "coord", "people", null],
      ]},
    ],
  },
];

/* ============================================================
 * API consumida pelo Sidebar.jsx
 * ============================================================ */

export const PROFILE_IDS = PROFILES.map((p) => p.id);

export function getProfile(id) {
  return PROFILES.find((p) => p.id === id) || PROFILES.find((p) => p.id === "pres-est");
}

/* Retorna [{ section, items: [{ id, sid, label, icon, href, badge }] }] já resolvido. */
export function sidebarGroupsFor(role) {
  const profile = getProfile(role);
  return profile.sections.map(({ sec, items }) => ({
    section: sec,
    items: items.map(([label, sid, icon, badge]) => ({
      id: sid,
      sid,
      label,
      icon: resolveIcon(icon),
      iconRaw: icon,
      href: resolveHref(sid, role),
      badge: parseBadge(badge),
    })),
  }));
}

export function isMobileFirstProfile(role) {
  return !!getProfile(role).mobileFirst;
}

/* Compat: Topbar/CmdK ainda querem itens flat. */
export function sidebarItemsFor(role) {
  return sidebarGroupsFor(role).flatMap((g) => g.items);
}
