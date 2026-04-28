/* Matriz RBAC central da plataforma - fonte da verdade.
 *
 * Deriva de Sprint1/sidebar-condicional.html (Designer, abr/2026).
 * 10 personas x 25 modulos x 7 secoes.
 *
 * Visibilidade: "full" | "filtered" | "hidden"
 * - full: o usuario ve tudo
 * - filtered: o usuario ve apenas o que esta no seu escopo (UF, tenant, zona)
 * - hidden: nao aparece na sidebar
 *
 * NAO inventar perfis ou modulos - qualquer ajuste exige alinhamento com Designer. */

/* 10 perfis canônicos do Designer V1.2 (mockup 02-sidebar-condicional.html).
 * Coord Regional/Territorial e Candidato ficaram FORA da V1 — Designer registrou
 * essa decisão linhas 537-543 do mockup. NÃO reintroduzir.
 * Filiado também fica de fora desta V1. */
export const ROLES = {
  "mazzel-super":  { label: "Super Admin Mazzel", group: "Camada 1 · Mazzel",      scope: "Todos os Tenants"          },
  "admin-tenant":  { label: "Admin do Partido",   group: "Camada 1 · Mazzel",      scope: "Tenant inteiro"             },

  "pres-nac":      { label: "Pres Nacional",      group: "Camada 2 · Política",    scope: "Brasil · 27 UFs"            },
  "pres-est":      { label: "Pres Estadual",      group: "Camada 2 · Política",    scope: "UF · 645 municípios (SP)"   },
  "pres-mun":      { label: "Pres Municipal",     group: "Camada 2 · Política",    scope: "Município"                  },
  "tesou":         { label: "Tesoureiro",         group: "Camada 2 · Política",    scope: "Tesouraria do nível"        },
  "secgeral":      { label: "Sec-Geral",          group: "Camada 2 · Política",    scope: "Comissão do nível"          },

  "eleito":        { label: "Político Eleito",    group: "Camada 3 · Eletiva",     scope: "Mandato pessoal"            },
  "gabinete":      { label: "Equipe Gabinete",    group: "Camada 3 · Eletiva",     scope: "Gabinete do político"       },

  "cabo":          { label: "Cabo Eleitoral",     group: "Camada 4 · Operacional", scope: "Microterritório · mobile"   },
};

export const ROLE_ORDER = [
  "mazzel-super", "admin-tenant",
  "pres-nac", "pres-est", "pres-mun", "tesou", "secgeral",
  "eleito", "gabinete",
  "cabo",
];

/* Mapeamento do perfil real (backend) -> persona Designer V1.2.
 * Backend ainda usa nomes antigos (PRESIDENTE, DIRETORIA, etc) — esse
 * map traduz pra os 10 IDs canônicos. */
export const ROLE_MAP = {
  PRESIDENTE:   "pres-nac",
  DIRETORIA:    "pres-est",      // Milton Leite (cliente real)
  POLITICO:     "eleito",
  CANDIDATO:    "eleito",        // Designer não tem perfil candidato na V1 — trata como eleito até decisão
  GABINETE:     "gabinete",
  FUNCIONARIO:  "admin-tenant",
  ADMIN:        "admin-tenant",
  SUPER:        "mazzel-super",
  CABO:         "cabo",
  // DELEGADO/COORDENADOR (backend antigo) → Designer eliminou na V1.
  // Mapeio pra "pres-mun" como fallback mais próximo até ETL definir.
  DELEGADO:     "pres-mun",
  COORDENADOR:  "pres-mun",
};

export const SECTIONS = [
  "Inteligência",
  "Ação política",
  "Estrutura",
  "Estatutário",
  "Campo",
  "Mandato",
  "Operação",
  "Conta",
];

export const MODULES = [
  // ── Inteligência ──
  { id: "home",     label: "Dashboard",      section: "Inteligência", href: "/mazzel-preview",          icon: "Home" },
  { id: "mapa",     label: "Mapa Eleitoral", section: "Inteligência", href: "/mazzel-preview/mapa",     icon: "MapPin" },
  { id: "radar",    label: "Radar Político", section: "Inteligência", href: "/mazzel-preview/radar",    icon: "Target" },
  { id: "dossies",  label: "Dossiês",        section: "Inteligência", href: "/mazzel-preview/dossies",  icon: "FileSearch" },
  { id: "aliancas", label: "Alianças",       section: "Inteligência", href: "/mazzel-preview/aliancas", icon: "Users", badgeLabel: "NEW" },
  { id: "estudo",   label: "Módulo Estudo",  section: "Inteligência", href: "/mazzel-preview/estudo",   icon: "BarChart3" },

  // ── Ação política ──
  { id: "campanha",  label: "Campanha 2026",  section: "Ação política", href: "/mazzel-preview/campanha",  icon: "Sparkles" },
  { id: "operacoes", label: "Operações",      section: "Ação política", href: "/mazzel-preview/operacoes", icon: "Zap", badgeLabel: "NEW" },
  { id: "chat",      label: "Chat",           section: "Ação política", href: "/mazzel-preview/chat",      icon: "Bell" },
  { id: "ia",        label: "Mazzel IA",      section: "Ação política", href: "/mazzel-preview/ia",        icon: "Sparkles" },

  // ── Estrutura (cadeia de comando do partido) ──
  { id: "liderancas",    label: "Lideranças",        section: "Estrutura", href: "/mazzel-preview/liderancas",    icon: "Star" },
  { id: "filiados",      label: "Filiados",           section: "Estrutura", href: "/mazzel-preview/afiliados",     icon: "UserCheck", badgeLabel: "NEW" },
  { id: "delegados",     label: "Delegados",          section: "Estrutura", href: "/mazzel-preview/delegados",     icon: "Users" },
  { id: "cabos-gestao",  label: "Cabos Eleitorais",   section: "Estrutura", href: "/mazzel-preview/cabos-gestao",  icon: "Zap" },

  // ── Estatutário (F4 Designer V1.2) ──
  { id: "diretorios",        label: "Diretórios",         section: "Estatutário", href: "/mazzel-preview/diretorios",        icon: "GitBranch", badgeLabel: "NEW" },
  { id: "documentos",        label: "Documentos",         section: "Estatutário", href: "/mazzel-preview/documentos",        icon: "FileText",  badgeLabel: "NEW" },
  { id: "tesouraria",        label: "Tesouraria",         section: "Estatutário", href: "/mazzel-preview/tesouraria",        icon: "Banknote",  badgeLabel: "NEW" },
  { id: "convites",          label: "IDs · Convites",     section: "Estatutário", href: "/mazzel-preview/convites",          icon: "UserCheck", badgeLabel: "NEW" },
  { id: "nominata",          label: "Nominata",           section: "Estatutário", href: "/mazzel-preview/nominata",          icon: "Target",    badgeLabel: "NEW" },

  // ── Campo (Cabo) ──
  { id: "agenda_dia", label: "Agenda do dia",   section: "Campo", href: "/mazzel-preview/cabo/agenda",   icon: "Calendar" },
  { id: "minha_area", label: "Minha área",      section: "Campo", href: "/mazzel-preview/cabo/area",     icon: "MapPin" },
  { id: "metas_sem",  label: "Metas da semana", section: "Campo", href: "/mazzel-preview/cabo/metas",    icon: "Trend" },
  { id: "registro",   label: "Registro rápido", section: "Campo", href: "/mazzel-preview/cabo/registro", icon: "Edit" },

  // ── Mandato (político eleito + gabinete) ──
  { id: "compromissos",     label: "Compromissos",          section: "Mandato", href: "/mazzel-preview/mandato/compromissos", icon: "Check" },
  { id: "estrutura_partido",label: "Estrutura do partido",  section: "Mandato", href: "/mazzel-preview/mandato/estrutura",    icon: "GitBranch", consultivo: true },

  // ── Operação ──
  { id: "agenda",     label: "Agenda",     section: "Operação", href: "/mazzel-preview/agenda",     icon: "Calendar", badgeLabel: "NEW" },
  { id: "alertas",    label: "Alertas",    section: "Operação", href: "/mazzel-preview/alertas",    icon: "Bell", badge: 7 },
  { id: "emendas",    label: "Emendas",    section: "Operação", href: "/mazzel-preview/emendas",    icon: "Banknote", badgeLabel: "NEW" },
  { id: "relatorios", label: "Relatórios", section: "Operação", href: "/mazzel-preview/relatorios", icon: "FileText" },

  // ── Conta ──
  { id: "portal",    label: "Meu painel", section: "Conta", href: "/mazzel-preview/portal",    icon: "User" },
  { id: "glossario", label: "Glossário",  section: "Conta", href: "/mazzel-preview/glossario", icon: "FileText" },
  { id: "admin",     label: "Admin",      section: "Conta", href: "/mazzel-preview/admin",     icon: "Settings" },
  { id: "super",     label: "Super Admin",section: "Conta", href: "/mazzel-preview/super",     icon: "Crown" },
];

/* Matriz de visibilidade.
 * Chave = id do modulo. Valor = { role: "full"|"filtered"|"hidden" }
 * Ordem dos roles: presidente, lideranca_estadual, coord_regional, coord_territorial, cabo_eleitoral,
 *                  politico_eleito, candidato, equipe_gabinete, admin_partido, admin_mazzel */
export const RBAC_MATRIX = {
  home:     { presidente: "full",   lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "filtered", cabo_eleitoral: "filtered", politico_eleito: "full",   candidato: "filtered", equipe_gabinete: "filtered", admin_partido: "full", admin_mazzel: "full" },
  mapa:     { presidente: "full",   lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "filtered", cabo_eleitoral: "hidden",   politico_eleito: "full",   candidato: "filtered", equipe_gabinete: "full",     admin_partido: "full", admin_mazzel: "full" },
  radar:    { presidente: "full",   lideranca_estadual: "filtered", coord_regional: "hidden",   coord_territorial: "hidden",   cabo_eleitoral: "hidden",   politico_eleito: "full",   candidato: "filtered", equipe_gabinete: "full",     admin_partido: "full", admin_mazzel: "full" },
  dossies:  { presidente: "full",   lideranca_estadual: "full",     coord_regional: "full",     coord_territorial: "full",     cabo_eleitoral: "hidden",   politico_eleito: "full",   candidato: "full",     equipe_gabinete: "full",     admin_partido: "full", admin_mazzel: "full" },
  aliancas: { presidente: "full",   lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "hidden",   cabo_eleitoral: "hidden",   politico_eleito: "full",   candidato: "filtered", equipe_gabinete: "full",     admin_partido: "full", admin_mazzel: "full" },
  estudo:   { presidente: "full",   lideranca_estadual: "filtered", coord_regional: "hidden",   coord_territorial: "hidden",   cabo_eleitoral: "hidden",   politico_eleito: "full",   candidato: "full",     equipe_gabinete: "full",     admin_partido: "full", admin_mazzel: "full" },

  campanha:  { presidente: "full", lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "filtered", cabo_eleitoral: "filtered", politico_eleito: "hidden", candidato: "filtered", equipe_gabinete: "hidden",   admin_partido: "full", admin_mazzel: "full" },
  operacoes: { presidente: "full", lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "filtered", cabo_eleitoral: "hidden",   politico_eleito: "hidden", candidato: "hidden",   equipe_gabinete: "hidden",   admin_partido: "full", admin_mazzel: "full" },
  chat:      { presidente: "full", lideranca_estadual: "full",     coord_regional: "full",     coord_territorial: "full",     cabo_eleitoral: "full",     politico_eleito: "full",   candidato: "full",     equipe_gabinete: "full",     admin_partido: "full", admin_mazzel: "full" },
  ia:       { presidente: "full",   lideranca_estadual: "full",     coord_regional: "full",     coord_territorial: "hidden",   cabo_eleitoral: "hidden",   politico_eleito: "full",   candidato: "full",     equipe_gabinete: "full",     admin_partido: "full", admin_mazzel: "full" },

  liderancas: { presidente: "full", lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "hidden",   cabo_eleitoral: "hidden",   politico_eleito: "hidden", candidato: "hidden",   equipe_gabinete: "hidden",   admin_partido: "full", admin_mazzel: "full" },
  filiados:   { presidente: "full", lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "filtered", cabo_eleitoral: "hidden",   politico_eleito: "hidden", candidato: "hidden",   equipe_gabinete: "hidden",   admin_partido: "full", admin_mazzel: "full" },
  delegados:  { presidente: "full", lideranca_estadual: "filtered", coord_regional: "hidden",   coord_territorial: "hidden",   cabo_eleitoral: "hidden",   politico_eleito: "hidden", candidato: "hidden",   equipe_gabinete: "hidden",   admin_partido: "full", admin_mazzel: "full" },
  "cabos-gestao": { presidente: "full", lideranca_estadual: "full", coord_regional: "filtered", coord_territorial: "filtered", cabo_eleitoral: "hidden", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "hidden", admin_partido: "full", admin_mazzel: "full" },

  diretorios:        { presidente: "full", lideranca_estadual: "filtered", coord_regional: "hidden",   coord_territorial: "hidden", cabo_eleitoral: "hidden", politico_eleito: "full",   candidato: "hidden", equipe_gabinete: "full", admin_partido: "full", admin_mazzel: "full" },
  documentos:        { presidente: "full", lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "hidden", cabo_eleitoral: "hidden", politico_eleito: "full",   candidato: "hidden", equipe_gabinete: "full", admin_partido: "full", admin_mazzel: "full" },
  tesouraria:        { presidente: "full", lideranca_estadual: "filtered", coord_regional: "hidden",   coord_territorial: "hidden", cabo_eleitoral: "hidden", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "hidden", admin_partido: "full", admin_mazzel: "full" },
  convites:          { presidente: "full", lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "hidden", cabo_eleitoral: "hidden", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "full", admin_partido: "full", admin_mazzel: "full" },
  saude_nominatas:   { presidente: "full", lideranca_estadual: "filtered", coord_regional: "hidden",   coord_territorial: "hidden", cabo_eleitoral: "hidden", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "hidden", admin_partido: "full", admin_mazzel: "full" },

  agenda_dia: { presidente: "hidden", lideranca_estadual: "hidden", coord_regional: "hidden", coord_territorial: "hidden", cabo_eleitoral: "full", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "hidden", admin_partido: "full", admin_mazzel: "hidden" },
  minha_area: { presidente: "hidden", lideranca_estadual: "hidden", coord_regional: "hidden", coord_territorial: "hidden", cabo_eleitoral: "full", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "hidden", admin_partido: "full", admin_mazzel: "hidden" },
  metas_sem:  { presidente: "hidden", lideranca_estadual: "hidden", coord_regional: "hidden", coord_territorial: "hidden", cabo_eleitoral: "full", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "hidden", admin_partido: "full", admin_mazzel: "hidden" },
  registro:   { presidente: "hidden", lideranca_estadual: "hidden", coord_regional: "hidden", coord_territorial: "hidden", cabo_eleitoral: "full", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "hidden", admin_partido: "full", admin_mazzel: "hidden" },

  compromissos:     { presidente: "hidden", lideranca_estadual: "hidden", coord_regional: "hidden", coord_territorial: "hidden", cabo_eleitoral: "hidden", politico_eleito: "full", candidato: "hidden", equipe_gabinete: "full", admin_partido: "full", admin_mazzel: "hidden" },
  estrutura_partido:{ presidente: "hidden", lideranca_estadual: "hidden", coord_regional: "hidden", coord_territorial: "hidden", cabo_eleitoral: "hidden", politico_eleito: "full", candidato: "hidden", equipe_gabinete: "full", admin_partido: "full", admin_mazzel: "hidden" },

  agenda:     { presidente: "full", lideranca_estadual: "full",     coord_regional: "full",     coord_territorial: "full",     cabo_eleitoral: "hidden",   politico_eleito: "full", candidato: "full",     equipe_gabinete: "full", admin_partido: "full", admin_mazzel: "full" },
  alertas:    { presidente: "full", lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "filtered", cabo_eleitoral: "filtered", politico_eleito: "full", candidato: "filtered", equipe_gabinete: "full", admin_partido: "full", admin_mazzel: "full" },
  emendas:    { presidente: "full", lideranca_estadual: "filtered", coord_regional: "hidden",   coord_territorial: "hidden",   cabo_eleitoral: "hidden",   politico_eleito: "full", candidato: "hidden",   equipe_gabinete: "full", admin_partido: "full", admin_mazzel: "full" },
  relatorios: { presidente: "full", lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "hidden",   cabo_eleitoral: "hidden",   politico_eleito: "full", candidato: "filtered", equipe_gabinete: "full", admin_partido: "full", admin_mazzel: "full" },

  portal:    { presidente: "full",   lideranca_estadual: "full",   coord_regional: "full",   coord_territorial: "full",   cabo_eleitoral: "full",   politico_eleito: "full",   candidato: "full",   equipe_gabinete: "full",   admin_partido: "full",   admin_mazzel: "full" },
  glossario: { presidente: "full",   lideranca_estadual: "full",   coord_regional: "full",   coord_territorial: "full",   cabo_eleitoral: "full",   politico_eleito: "full",   candidato: "full",   equipe_gabinete: "full",   admin_partido: "full",   admin_mazzel: "full" },
  admin:     { presidente: "hidden", lideranca_estadual: "hidden", coord_regional: "hidden", coord_territorial: "hidden", cabo_eleitoral: "hidden", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "hidden", admin_partido: "full",   admin_mazzel: "full" },
  super:     { presidente: "hidden", lideranca_estadual: "hidden", coord_regional: "hidden", coord_territorial: "hidden", cabo_eleitoral: "hidden", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "hidden", admin_partido: "hidden", admin_mazzel: "full" },
};

/* Helpers ------------------------------------------------------- */

export function visibilityFor(moduleId, role) {
  return RBAC_MATRIX[moduleId]?.[role] ?? "hidden";
}

export function visibleModules(role) {
  return MODULES.filter((m) => visibilityFor(m.id, role) !== "hidden");
}

export function modulesBySection(role) {
  const bucket = Object.fromEntries(SECTIONS.map((s) => [s, []]));
  visibleModules(role).forEach((m) => {
    if (bucket[m.section]) bucket[m.section].push({ ...m, vis: visibilityFor(m.id, role) });
  });
  return SECTIONS
    .map((s) => ({ section: s, items: bucket[s] }))
    .filter((g) => g.items.length > 0);
}
