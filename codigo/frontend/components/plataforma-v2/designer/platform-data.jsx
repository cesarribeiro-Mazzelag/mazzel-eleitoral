/* tenants + party colors + dataset */

const TENANTS = {
  uniao: {
    id: "uniao",
    nome: "União Brasil",
    sigla: "UB",
    primary: "#002A7B",
    primaryRgb: "0, 42, 123",
    accent: "#FFCC00",
    logoText: "UB",
    plano: "Enterprise",
    versao: "v2.4.1",
  },
  mazzel: {
    id: "mazzel",
    nome: "Mazzel Demo",
    sigla: "MZ",
    primary: "#6D28D9",
    primaryRgb: "109, 40, 217",
    accent: "#F59E0B",
    logoText: "MZ",
    plano: "Demo",
    versao: "v2.4.1",
  },
};

const PARTY_COLORS = {
  "PT":            "#E4142C",
  "PL":            "#004F9F",
  "CIDADANIA":     "#022E4A",
  "NOVO":          "#F3702B",
  "PV":            "#006600",
  "UNIÃO BRASIL":  "#002A7B",
  "UNIAO":         "#002A7B",
  "PSDB":          "#0C2CC3",
  "PSOL":          "#68008E",
  "PSD":           "#FDB913",
  "REPUBLICANOS":  "#005FAF",
  "PP":            "#14416F",
  "PDT":           "#033D7F",
  "MDB":           "#4AA71E",
  "REDE":          "#2EB5C2",
  "PODEMOS":       "#5A8ECB",
  "PSB":           "#E00000",
  "PCdoB":         "#DA251C",
  "AVANTE":        "#EE6C34",
  "SOLIDARIEDADE": "#341214",
  "PROS":          "#F68E21",
};
const partyColor = (p) => PARTY_COLORS[String(p || "").toUpperCase()] || "#6B7280";

const ROLES = {
  presidente:  { label: "Presidente",      scope: "Nacional · irrestrito",        icon: "Crown" },
  diretoria:   { label: "Diretoria",       scope: "Nacional · sem admin",          icon: "Users" },
  candidato:   { label: "Candidato",       scope: "Portal exclusivo · próprio",    icon: "User"  },
};

/* modules (sidebar order) */
const MODULES = [
  { id: "home",        label: "Dashboard",          icon: "Home",        roles: ["presidente","diretoria","candidato"] },
  { id: "mapa",        label: "Mapa Eleitoral",     icon: "MapPin",      roles: ["presidente","diretoria","candidato"] },
  { id: "radar",       label: "Radar Político",     icon: "Target",      roles: ["presidente","diretoria"] },
  { id: "dossie",      label: "Dossiês",            icon: "FileSearch",  roles: ["presidente","diretoria","candidato"] },
  { id: "estudo",      label: "Módulo Estudo",      icon: "BarChart3",   roles: ["presidente","diretoria"] },
  { id: "delegados",   label: "Delegados",          icon: "Users",       roles: ["presidente","diretoria"] },
  { id: "filiados",    label: "Filiados",           icon: "UserCheck",   roles: ["presidente","diretoria"] },
  { id: "ia",          label: "IA Assistente",      icon: "Sparkles",    roles: ["presidente","diretoria","candidato"] },
  { id: "alertas",     label: "Alertas",            icon: "Bell",        roles: ["presidente","diretoria","candidato"], badge: 7 },
  { id: "portal",      label: "Portal do Cliente",  icon: "Briefcase",   roles: ["presidente","diretoria"] },
  { id: "admin",       label: "Admin",              icon: "Settings",    roles: ["presidente"] },
];

/* UF + party strength dataset */
const UF_LIST = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

/* força partidária por UF (fictícia coerente) */
const PARTY_STRENGTH = {
  SP: "PL", RJ: "PL", MG: "UNIÃO BRASIL", BA: "PT", RS: "PL", PR: "PL",
  CE: "PT", PE: "PSB", SC: "PL", GO: "UNIÃO BRASIL", PA: "MDB", MA: "PT",
  PB: "PSB", ES: "UNIÃO BRASIL", MT: "UNIÃO BRASIL", MS: "PSDB", DF: "UNIÃO BRASIL",
  PI: "PT", AL: "UNIÃO BRASIL", SE: "PSD", RN: "PT", AM: "UNIÃO BRASIL",
  AC: "UNIÃO BRASIL", RO: "UNIÃO BRASIL", RR: "UNIÃO BRASIL", AP: "MDB", TO: "UNIÃO BRASIL",
};

/* dados KPI home */
const HOME_KPIS = {
  presidente: [
    { k: "Eleitos União Brasil",  v: "1.247", hint: "59 senadores + dep fed/est + prefeitos",  trend: "+2,4%", ok: true },
    { k: "Candidatos monitorados", v: "51.384", hint: "base TSE cruzada",                       trend: "+312",  ok: true },
    { k: "Alertas críticos 24h",   v: "12",     hint: "exige atenção imediata",                 trend: "+3",    ok: false },
    { k: "Score regional médio",   v: "73,8",   hint: "0-100 · agregado nacional",              trend: "+1,2",  ok: true },
  ],
  diretoria: [
    { k: "Eleitos União Brasil",  v: "1.247", hint: "59 senadores + dep fed/est + prefeitos",  trend: "+2,4%", ok: true },
    { k: "Candidatos monitorados", v: "51.384", hint: "base TSE cruzada",                       trend: "+312",  ok: true },
    { k: "Alertas críticos 24h",   v: "12",     hint: "exige atenção imediata",                 trend: "+3",    ok: false },
    { k: "Score regional médio",   v: "73,8",   hint: "0-100 · agregado nacional",              trend: "+1,2",  ok: true },
  ],
  candidato: [
    { k: "Meu Overall",            v: "87",     hint: "Top 12% entre senadores",                trend: "+3",    ok: true },
    { k: "Emendas executadas",     v: "R$ 42M", hint: "2024 · R$ 61M aprovado",                 trend: "+18%",  ok: true },
    { k: "Alertas ativos",         v: "0",      hint: "Ficha limpa",                            trend: "—",     ok: true },
    { k: "Sua base na UF",         v: "92%",    hint: "capilaridade dos municípios",            trend: "+1pp",  ok: true },
  ],
};

/* alertas recentes */
const HOME_ALERTS = [
  { id:"a1", sev:"crit", tipo:"Judicial", who:"Pablo Marçal",           uf:"SP", what:"Nova ação inscrita no CEAF", when:"há 12min", tag:"CEAF" },
  { id:"a2", sev:"alto", tipo:"Mídia",    who:"Sen. Flávio Bolsonaro",   uf:"RJ", what:"Cobertura negativa em Folha", when:"há 40min", tag:"Mídia" },
  { id:"a3", sev:"med",  tipo:"Emenda",   who:"Dep. Júlia Rocha",        uf:"MG", what:"Emenda cancelada pela CGU",   when:"há 1h",    tag:"RP-9" },
  { id:"a4", sev:"med",  tipo:"Processo", who:"Dep. Marcelo Queiroga",   uf:"PB", what:"TCU abriu TCE em valor de R$ 2,8M", when:"há 2h",  tag:"TCU" },
  { id:"a5", sev:"bx",   tipo:"Filiação", who:"150 novos filiados",      uf:"BA", what:"Registrados em 14 cidades",    when:"há 3h",    tag:"Interno" },
  { id:"a6", sev:"crit", tipo:"Processo", who:"Ex-Gov. Roberto Rocha",   uf:"MA", what:"STF recebeu denúncia — relator min. Gilmar Mendes", when:"há 4h", tag:"STF" },
  { id:"a7", sev:"alto", tipo:"Redes",    who:"Sen. Humberto Costa",     uf:"PE", what:"Pico de menções negativas (+340%)", when:"há 5h",    tag:"X" },
  { id:"a8", sev:"med",  tipo:"Mídia",    who:"Gov. Wanderlei Barbosa",  uf:"TO", what:"Entrevista exclusiva no CNN Brasil", when:"há 6h", tag:"TV" },
];

/* top 10 candidatos overall (home) */
const HOME_TOP_CANDIDATOS = [
  { nome:"Lula",                   partido:"PT",            uf:"BR", cargo:"Pres", overall:93, tier:"dourado" },
  { nome:"Tarcísio de Freitas",    partido:"REPUBLICANOS",  uf:"SP", cargo:"Gov",  overall:91, tier:"dourado" },
  { nome:"Ratinho Júnior",         partido:"PSD",           uf:"PR", cargo:"Gov",  overall:90, tier:"dourado" },
  { nome:"Jaques Wagner",          partido:"PT",            uf:"BA", cargo:"Sen",  overall:87, tier:"ouro"    },
  { nome:"Renan Calheiros",        partido:"MDB",           uf:"AL", cargo:"Sen",  overall:86, tier:"ouro"    },
  { nome:"Davi Alcolumbre",        partido:"UNIÃO BRASIL",  uf:"AP", cargo:"Sen",  overall:85, tier:"ouro"    },
  { nome:"Rodrigo Pacheco",        partido:"PSD",           uf:"MG", cargo:"Sen",  overall:85, tier:"ouro"    },
  { nome:"Sergio Moro",            partido:"UNIÃO BRASIL",  uf:"PR", cargo:"Sen",  overall:82, tier:"ouro"    },
  { nome:"Simone Tebet",           partido:"MDB",           uf:"MS", cargo:"Sen",  overall:81, tier:"ouro"    },
  { nome:"Eduardo Braga",          partido:"MDB",           uf:"AM", cargo:"Sen",  overall:81, tier:"ouro"    },
];

/* emendas por UF */
const HOME_EMENDAS_UF = [
  { uf:"MG", v:"R$ 184M" }, { uf:"SP", v:"R$ 172M" }, { uf:"BA", v:"R$ 156M" }, { uf:"RJ", v:"R$ 134M" },
  { uf:"PE", v:"R$ 108M" }, { uf:"RS", v:"R$ 92M"  }, { uf:"CE", v:"R$ 84M"  }, { uf:"PR", v:"R$ 80M"  },
];

/* movimentações do dia */
const HOME_MOV_DIA = [
  { hora:"14:23", evento:"Nova filiação em massa", detail:"14 prefeitos do RN migraram para UB", icon:"UserCheck" },
  { hora:"12:08", evento:"Convenção partidária",   detail:"Homologação Fed. MG · 1.240 delegados", icon:"Users" },
  { hora:"10:44", evento:"Emenda liberada",        detail:"R$ 8,4M · Sen. Efraim Filho · PB",      icon:"Banknote" },
  { hora:"09:17", evento:"Sanção",                 detail:"TCU aplicou multa R$ 320k a Dep. L.Silva", icon:"AlertTriangle" },
  { hora:"08:02", evento:"Alteração de cargo",     detail:"Elmar Nascimento reeleito líder Câmara", icon:"Briefcase" },
];

/* audit feed */
const HOME_AUDIT = [
  { who:"Ana Carolina (Diretoria)", what:"visualizou dossiê — Jaques Wagner",          when:"há 2min" },
  { who:"Carlos Lima (Delegado BA)", what:"exportou relatório emendas · 2024",          when:"há 8min" },
  { who:"Sistema",                   what:"sincronizou TSE · 48.312 registros atualizados", when:"há 14min" },
  { who:"Maria Fernanda (Diretoria)", what:"comentou em alerta #a2 (Flávio Bolsonaro)",  when:"há 22min" },
  { who:"João Pedro (Presidente)",   what:"alterou permissão de 3 usuários",             when:"há 34min" },
];

/* radar FIFA - 24 candidatos */
const RADAR_CANDIDATOS = [
  { id:1,  nome:"Lula",                partido:"PT",           uf:"BR", cargo:"PRES", overall:93, tier:"dourado", traits:["LEGEND","FENOMENO"],    pac:82, pres:95, inf:96, leg:78, bse:94, mid:89 },
  { id:2,  nome:"Tarcísio de Freitas", partido:"REPUBLICANOS", uf:"SP", cargo:"GOV",  overall:91, tier:"dourado", traits:["FENOMENO","CAMPEAO"],    pac:78, pres:92, inf:90, leg:68, bse:88, mid:94 },
  { id:3,  nome:"Ratinho Júnior",      partido:"PSD",          uf:"PR", cargo:"GOV",  overall:90, tier:"dourado", traits:["CAMPEAO","FERA_REG"],    pac:85, pres:90, inf:86, leg:72, bse:91, mid:82 },
  { id:4,  nome:"Jaques Wagner",       partido:"PT",           uf:"BA", cargo:"SEN",  overall:87, tier:"ouro",    traits:["LEGEND","FERA_REG"],     pac:91, pres:94, inf:88, leg:79, bse:93, mid:72 },
  { id:5,  nome:"Renan Calheiros",     partido:"MDB",          uf:"AL", cargo:"SEN",  overall:86, tier:"ouro",    traits:["LEGEND"],                 pac:94, pres:88, inf:92, leg:84, bse:82, mid:68 },
  { id:6,  nome:"Davi Alcolumbre",     partido:"UNIÃO BRASIL", uf:"AP", cargo:"SEN",  overall:85, tier:"ouro",    traits:["FERA_REG","CAMPEAO"],    pac:88, pres:84, inf:91, leg:72, bse:95, mid:70 },
  { id:7,  nome:"Rodrigo Pacheco",     partido:"PSD",          uf:"MG", cargo:"SEN",  overall:85, tier:"ouro",    traits:["CAMPEAO"],                pac:90, pres:92, inf:88, leg:78, bse:80, mid:74 },
  { id:8,  nome:"Sergio Moro",         partido:"UNIÃO BRASIL", uf:"PR", cargo:"SEN",  overall:82, tier:"ouro",    traits:["FENOMENO"],               pac:62, pres:82, inf:74, leg:68, bse:78, mid:92 },
  { id:9,  nome:"Simone Tebet",        partido:"MDB",          uf:"MS", cargo:"SEN",  overall:81, tier:"ouro",    traits:["CAMPEAO"],                pac:82, pres:86, inf:80, leg:74, bse:72, mid:84 },
  { id:10, nome:"Eduardo Braga",       partido:"MDB",          uf:"AM", cargo:"SEN",  overall:81, tier:"ouro",    traits:["FERA_REG"],               pac:84, pres:80, inf:82, leg:76, bse:88, mid:64 },
  { id:11, nome:"Otto Alencar",        partido:"PSD",          uf:"BA", cargo:"SEN",  overall:79, tier:"prata",   traits:["FERA_REG"],               pac:82, pres:84, inf:78, leg:74, bse:86, mid:58 },
  { id:12, nome:"Efraim Filho",        partido:"UNIÃO BRASIL", uf:"PB", cargo:"SEN",  overall:78, tier:"prata",   traits:["CAMPEAO"],                pac:84, pres:80, inf:76, leg:72, bse:82, mid:62 },
  { id:13, nome:"Alessandro Vieira",   partido:"MDB",          uf:"SE", cargo:"SEN",  overall:76, tier:"prata",   traits:["ESTREANTE"],              pac:70, pres:82, inf:72, leg:70, bse:74, mid:80 },
  { id:14, nome:"Carlos Viana",        partido:"PODEMOS",      uf:"MG", cargo:"SEN",  overall:74, tier:"prata",   traits:["COMEBACK"],               pac:76, pres:78, inf:70, leg:68, bse:72, mid:74 },
  { id:15, nome:"Soraya Thronicke",    partido:"PODEMOS",      uf:"MS", cargo:"SEN",  overall:73, tier:"prata",   traits:["ESTREANTE"],              pac:62, pres:74, inf:64, leg:60, bse:68, mid:86 },
  { id:16, nome:"Humberto Costa",      partido:"PT",           uf:"PE", cargo:"SEN",  overall:72, tier:"prata",   traits:["FERA_REG"],               pac:78, pres:78, inf:74, leg:72, bse:80, mid:58 },
  { id:17, nome:"Marcos Rogério",      partido:"PL",           uf:"RO", cargo:"SEN",  overall:70, tier:"bronze",  traits:[],                          pac:68, pres:74, inf:66, leg:62, bse:70, mid:72 },
  { id:18, nome:"Zequinha Marinho",    partido:"PODEMOS",      uf:"PA", cargo:"SEN",  overall:68, tier:"bronze",  traits:[],                          pac:70, pres:72, inf:64, leg:60, bse:72, mid:56 },
  { id:19, nome:"Irajá",               partido:"PSD",          uf:"TO", cargo:"SEN",  overall:67, tier:"bronze",  traits:["ESTREANTE"],              pac:64, pres:70, inf:60, leg:58, bse:66, mid:62 },
  { id:20, nome:"Jorge Kajuru",        partido:"PSB",          uf:"GO", cargo:"SEN",  overall:64, tier:"bronze",  traits:[],                          pac:48, pres:68, inf:54, leg:52, bse:60, mid:88 },
  { id:21, nome:"Omar Aziz",           partido:"PSD",          uf:"AM", cargo:"SEN",  overall:77, tier:"prata",   traits:["CAMPEAO"],                pac:82, pres:80, inf:76, leg:70, bse:78, mid:68 },
  { id:22, nome:"Angelo Coronel",      partido:"PSD",          uf:"BA", cargo:"SEN",  overall:75, tier:"prata",   traits:[],                          pac:74, pres:78, inf:70, leg:66, bse:82, mid:60 },
  { id:23, nome:"Astronauta Marcos Pontes", partido:"PL",      uf:"SP", cargo:"SEN",  overall:71, tier:"bronze",  traits:["ESTREANTE"],              pac:58, pres:74, inf:62, leg:56, bse:68, mid:80 },
  { id:24, nome:"Pablo Marçal",        partido:"PRTB",         uf:"SP", cargo:"—",    overall:38, tier:"bronze",  traits:["ESTREANTE"],              pac:18, pres:12, inf:22, leg:4,  bse:68, mid:96 },
];

const TRAIT_LABEL = { FENOMENO:"Fenômeno", FERA_REG:"Fera regional", CAMPEAO:"Campeão", LEGEND:"Lenda", COMEBACK:"Comeback", ESTREANTE:"Estreante" };

Object.assign(window, {
  TENANTS, PARTY_COLORS, partyColor, ROLES, MODULES, UF_LIST, PARTY_STRENGTH,
  HOME_KPIS, HOME_ALERTS, HOME_TOP_CANDIDATOS, HOME_EMENDAS_UF, HOME_MOV_DIA, HOME_AUDIT,
  RADAR_CANDIDATOS, TRAIT_LABEL,
});
