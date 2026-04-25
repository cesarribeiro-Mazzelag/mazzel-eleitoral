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

export const ROLES = {
  presidente:         { label: "Presidente",        group: "Cadeia de comando",          scope: "Nacional irrestrito"      },
  lideranca_estadual: { label: "Liderança UF",      group: "Cadeia de comando",          scope: "Estadual"                 },
  coord_regional:     { label: "Coord Regional",    group: "Cadeia de comando",          scope: "Regional · múltiplos mun" },
  coord_territorial:  { label: "Coord Territorial", group: "Cadeia de comando",          scope: "Bairros / zonas"          },
  cabo_eleitoral:     { label: "Cabo Eleitoral",    group: "Cadeia de comando",          scope: "Quadra / microterritório" },

  politico_eleito:    { label: "Político Eleito",   group: "Autoridades independentes",  scope: "Mandato ativo"            },
  candidato:          { label: "Candidato",         group: "Autoridades independentes",  scope: "Campanha individual"      },
  equipe_gabinete:    { label: "Equipe Gabinete",   group: "Autoridades independentes",  scope: "Gabinete"                 },

  admin_partido:      { label: "Admin Partido",     group: "Operação",                   scope: "Time administrativo"      },
  admin_mazzel:       { label: "Admin Mazzel",      group: "Super admin",                scope: "Plataforma · tenants"     },
};

export const ROLE_ORDER = [
  "presidente", "lideranca_estadual", "coord_regional", "coord_territorial", "cabo_eleitoral",
  "politico_eleito", "candidato", "equipe_gabinete",
  "admin_partido", "admin_mazzel",
];

/* Mapeamento do perfil real (backend) -> persona do RBAC. */
export const ROLE_MAP = {
  PRESIDENTE:   "presidente",
  DIRETORIA:    "lideranca_estadual",
  DELEGADO:     "coord_regional",
  COORDENADOR:  "coord_territorial",
  CABO:         "cabo_eleitoral",
  POLITICO:     "politico_eleito",
  CANDIDATO:    "candidato",
  GABINETE:     "equipe_gabinete",
  FUNCIONARIO:  "admin_partido",
  ADMIN:        "admin_mazzel",
  SUPER:        "admin_mazzel",
};

export const SECTIONS = [
  "Inteligência",
  "Ação política",
  "Estrutura",
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
  { id: "campanha", label: "Campanha 2026",  section: "Ação política", href: "/mazzel-preview/campanha", icon: "Sparkles" },
  { id: "chat",     label: "Chat",           section: "Ação política", href: "/mazzel-preview/chat",     icon: "Bell" },
  { id: "ia",       label: "Mazzel IA",      section: "Ação política", href: "/mazzel-preview/ia",       icon: "Sparkles" },

  // ── Estrutura (cadeia de comando do partido) ──
  { id: "liderancas",    label: "Lideranças",        section: "Estrutura", href: "/mazzel-preview/liderancas",    icon: "Star" },
  { id: "filiados",      label: "Filiados",           section: "Estrutura", href: "/mazzel-preview/afiliados",     icon: "UserCheck", badgeLabel: "NEW" },
  { id: "delegados",     label: "Delegados",          section: "Estrutura", href: "/mazzel-preview/delegados",     icon: "Users" },
  { id: "cabos-gestao",  label: "Cabos Eleitorais",   section: "Estrutura", href: "/mazzel-preview/cabos-gestao",  icon: "Zap" },

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

  campanha: { presidente: "full",   lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "filtered", cabo_eleitoral: "filtered", politico_eleito: "hidden", candidato: "filtered", equipe_gabinete: "hidden",   admin_partido: "full", admin_mazzel: "full" },
  chat:     { presidente: "full",   lideranca_estadual: "full",     coord_regional: "full",     coord_territorial: "full",     cabo_eleitoral: "full",     politico_eleito: "full",   candidato: "full",     equipe_gabinete: "full",     admin_partido: "full", admin_mazzel: "full" },
  ia:       { presidente: "full",   lideranca_estadual: "full",     coord_regional: "full",     coord_territorial: "hidden",   cabo_eleitoral: "hidden",   politico_eleito: "full",   candidato: "full",     equipe_gabinete: "full",     admin_partido: "full", admin_mazzel: "full" },

  liderancas: { presidente: "full", lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "hidden",   cabo_eleitoral: "hidden",   politico_eleito: "hidden", candidato: "hidden",   equipe_gabinete: "hidden",   admin_partido: "full", admin_mazzel: "full" },
  filiados:   { presidente: "full", lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "filtered", cabo_eleitoral: "hidden",   politico_eleito: "hidden", candidato: "hidden",   equipe_gabinete: "hidden",   admin_partido: "full", admin_mazzel: "full" },
  delegados:  { presidente: "full", lideranca_estadual: "filtered", coord_regional: "hidden",   coord_territorial: "hidden",   cabo_eleitoral: "hidden",   politico_eleito: "hidden", candidato: "hidden",   equipe_gabinete: "hidden",   admin_partido: "full", admin_mazzel: "full" },
  "cabos-gestao": { presidente: "full", lideranca_estadual: "full", coord_regional: "filtered", coord_territorial: "filtered", cabo_eleitoral: "hidden", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "hidden", admin_partido: "full", admin_mazzel: "full" },

  agenda_dia: { presidente: "hidden", lideranca_estadual: "hidden", coord_regional: "hidden", coord_territorial: "hidden", cabo_eleitoral: "full", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "hidden", admin_partido: "full", admin_mazzel: "hidden" },
  minha_area: { presidente: "hidden", lideranca_estadual: "hidden", coord_regional: "hidden", coord_territorial: "hidden", cabo_eleitoral: "full", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "hidden", admin_partido: "full", admin_mazzel: "hidden" },
  metas_sem:  { presidente: "hidden", lideranca_estadual: "hidden", coord_regional: "hidden", coord_territorial: "hidden", cabo_eleitoral: "full", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "hidden", admin_partido: "full", admin_mazzel: "hidden" },
  registro:   { presidente: "hidden", lideranca_estadual: "hidden", coord_regional: "hidden", coord_territorial: "hidden", cabo_eleitoral: "full", politico_eleito: "hidden", candidato: "hidden", equipe_gabinete: "hidden", admin_partido: "full", admin_mazzel: "hidden" },

  compromissos:     { presidente: "hidden", lideranca_estadual: "hidden", coord_regional: "hidden", coord_territorial: "hidden", cabo_eleitoral: "hidden", politico_eleito: "full", candidato: "hidden", equipe_gabinete: "full", admin_partido: "full", admin_mazzel: "hidden" },
  estrutura_partido:{ presidente: "hidden", lideranca_estadual: "hidden", coord_regional: "hidden", coord_territorial: "hidden", cabo_eleitoral: "hidden", politico_eleito: "full", candidato: "hidden", equipe_gabinete: "full", admin_partido: "full", admin_mazzel: "hidden" },

  agenda:     { presidente: "full", lideranca_estadual: "full",     coord_regional: "full",     coord_territorial: "full",     cabo_eleitoral: "hidden",   politico_eleito: "full", candidato: "full",     equipe_gabinete: "full", admin_partido: "full", admin_mazzel: "full" },
  alertas:    { presidente: "full", lideranca_estadual: "filtered", coord_regional: "filtered", coord_territorial: "filtered", cabo_eleitoral: "filtered", politico_eleito: "full", candidato: "filtered", equipe_gabinete: "full", admin_partido: "full", admin_mazzel: "full" },
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
