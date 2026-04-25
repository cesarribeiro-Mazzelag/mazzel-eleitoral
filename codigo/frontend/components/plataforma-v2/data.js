/* Constantes compartilhadas da plataforma Mazzel.
 * Derivado de designer/platform-data.jsx + platform-data2.jsx. */

export const TENANTS = {
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
  pt: {
    id: "pt",
    nome: "PT",
    sigla: "PT",
    primary: "#E11D48",
    primaryRgb: "225, 29, 72",
    accent: "#FACC15",
    logoText: "PT",
    plano: "Enterprise",
    versao: "v2.4.1",
  },
  psdb: {
    id: "psdb",
    nome: "PSDB",
    sigla: "SD",
    primary: "#1E40AF",
    primaryRgb: "30, 64, 175",
    accent: "#FDE047",
    logoText: "SD",
    plano: "Standard",
    versao: "v2.4.1",
  },
  pl: {
    id: "pl",
    nome: "PL",
    sigla: "PL",
    primary: "#15803D",
    primaryRgb: "21, 128, 61",
    accent: "#FACC15",
    logoText: "PL",
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

export const PARTY_COLORS = {
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
export const partyColor = (p) => PARTY_COLORS[String(p || "").toUpperCase()] || "#6B7280";

/* ROLES e MODULES agora vivem em rbac.js (matriz 10x25).
 * Este arquivo mantem apenas reexport pra compat com imports antigos. */
export { ROLES, MODULES } from "./rbac";

export const UF_LIST = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

export const PARTY_STRENGTH = {
  SP: "PL", RJ: "PL", MG: "UNIÃO BRASIL", BA: "PT", RS: "PL", PR: "PL",
  CE: "PT", PE: "PSB", SC: "PL", GO: "UNIÃO BRASIL", PA: "MDB", MA: "PT",
  PB: "PSB", ES: "UNIÃO BRASIL", MT: "UNIÃO BRASIL", MS: "PSDB", DF: "UNIÃO BRASIL",
  PI: "PT", AL: "UNIÃO BRASIL", SE: "PSD", RN: "PT", AM: "UNIÃO BRASIL",
  AC: "UNIÃO BRASIL", RO: "UNIÃO BRASIL", RR: "UNIÃO BRASIL", AP: "MDB", TO: "UNIÃO BRASIL",
};

export const HOME_KPIS = {
  presidente: [
    { k: "Eleitos União Brasil",   v: "1.247",  hint: "59 senadores + dep fed/est + prefeitos", trend: "+2,4%", ok: true },
    { k: "Candidatos monitorados", v: "51.384", hint: "base TSE cruzada",                       trend: "+312",  ok: true },
    { k: "Alertas críticos 24h",   v: "12",     hint: "exige atenção imediata",                 trend: "+3",    ok: false },
    { k: "Score regional médio",   v: "73,8",   hint: "0-100 · agregado nacional",              trend: "+1,2",  ok: true },
  ],
  diretoria: [
    { k: "Eleitos União Brasil",   v: "1.247",  hint: "59 senadores + dep fed/est + prefeitos", trend: "+2,4%", ok: true },
    { k: "Candidatos monitorados", v: "51.384", hint: "base TSE cruzada",                       trend: "+312",  ok: true },
    { k: "Alertas críticos 24h",   v: "12",     hint: "exige atenção imediata",                 trend: "+3",    ok: false },
    { k: "Score regional médio",   v: "73,8",   hint: "0-100 · agregado nacional",              trend: "+1,2",  ok: true },
  ],
  candidato: [
    { k: "Meu Overall",        v: "87",     hint: "Top 12% entre senadores",      trend: "+3",   ok: true },
    { k: "Emendas executadas", v: "R$ 42M", hint: "2024 · R$ 61M aprovado",       trend: "+18%", ok: true },
    { k: "Alertas ativos",     v: "0",      hint: "Ficha limpa",                  trend: "-",    ok: true },
    { k: "Sua base na UF",     v: "92%",    hint: "capilaridade dos municípios",  trend: "+1pp", ok: true },
  ],
};

export const HOME_ALERTS = [
  { id:"a1", sev:"crit", tipo:"Judicial", who:"Pablo Marçal",          uf:"SP", what:"Nova ação inscrita no CEAF",         when:"há 12min", tag:"CEAF" },
  { id:"a2", sev:"alto", tipo:"Mídia",    who:"Sen. Flávio Bolsonaro", uf:"RJ", what:"Cobertura negativa em Folha",        when:"há 40min", tag:"Mídia" },
  { id:"a3", sev:"med",  tipo:"Emenda",   who:"Dep. Júlia Rocha",      uf:"MG", what:"Emenda cancelada pela CGU",          when:"há 1h",    tag:"RP-9" },
  { id:"a4", sev:"med",  tipo:"Processo", who:"Dep. Marcelo Queiroga", uf:"PB", what:"TCU abriu TCE em valor de R$ 2,8M",  when:"há 2h",    tag:"TCU" },
  { id:"a5", sev:"bx",   tipo:"Filiação", who:"150 novos filiados",    uf:"BA", what:"Registrados em 14 cidades",          when:"há 3h",    tag:"Interno" },
  { id:"a6", sev:"crit", tipo:"Processo", who:"Ex-Gov. Roberto Rocha", uf:"MA", what:"STF recebeu denúncia - relator min. Gilmar Mendes", when:"há 4h", tag:"STF" },
  { id:"a7", sev:"alto", tipo:"Redes",    who:"Sen. Humberto Costa",   uf:"PE", what:"Pico de menções negativas (+340%)",  when:"há 5h",    tag:"X" },
  { id:"a8", sev:"med",  tipo:"Mídia",    who:"Gov. Wanderlei Barbosa", uf:"TO", what:"Entrevista exclusiva no CNN Brasil", when:"há 6h",   tag:"TV" },
];

export const HOME_TOP_CANDIDATOS = [
  { nome:"Lula",                partido:"PT",            uf:"BR", cargo:"Pres", overall:93, tier:"dourado" },
  { nome:"Tarcísio de Freitas", partido:"REPUBLICANOS",  uf:"SP", cargo:"Gov",  overall:91, tier:"dourado" },
  { nome:"Ratinho Júnior",      partido:"PSD",           uf:"PR", cargo:"Gov",  overall:90, tier:"dourado" },
  { nome:"Jaques Wagner",       partido:"PT",            uf:"BA", cargo:"Sen",  overall:87, tier:"ouro"    },
  { nome:"Renan Calheiros",     partido:"MDB",           uf:"AL", cargo:"Sen",  overall:86, tier:"ouro"    },
  { nome:"Davi Alcolumbre",     partido:"UNIÃO BRASIL",  uf:"AP", cargo:"Sen",  overall:85, tier:"ouro"    },
  { nome:"Rodrigo Pacheco",     partido:"PSD",           uf:"MG", cargo:"Sen",  overall:85, tier:"ouro"    },
  { nome:"Sergio Moro",         partido:"UNIÃO BRASIL",  uf:"PR", cargo:"Sen",  overall:82, tier:"ouro"    },
  { nome:"Simone Tebet",        partido:"MDB",           uf:"MS", cargo:"Sen",  overall:81, tier:"ouro"    },
  { nome:"Eduardo Braga",       partido:"MDB",           uf:"AM", cargo:"Sen",  overall:81, tier:"ouro"    },
];

export const HOME_EMENDAS_UF = [
  { uf:"MG", v:"R$ 184M" }, { uf:"SP", v:"R$ 172M" }, { uf:"BA", v:"R$ 156M" }, { uf:"RJ", v:"R$ 134M" },
  { uf:"PE", v:"R$ 108M" }, { uf:"RS", v:"R$ 92M"  }, { uf:"CE", v:"R$ 84M"  }, { uf:"PR", v:"R$ 80M"  },
];

export const HOME_MOV_DIA = [
  { hora:"14:23", evento:"Nova filiação em massa", detail:"14 prefeitos do RN migraram para UB",   icon:"UserCheck" },
  { hora:"12:08", evento:"Convenção partidária",   detail:"Homologação Fed. MG · 1.240 delegados", icon:"Users" },
  { hora:"10:44", evento:"Emenda liberada",        detail:"R$ 8,4M · Sen. Efraim Filho · PB",      icon:"Banknote" },
  { hora:"09:17", evento:"Sanção",                 detail:"TCU aplicou multa R$ 320k a Dep. L.Silva", icon:"AlertTriangle" },
  { hora:"08:02", evento:"Alteração de cargo",     detail:"Elmar Nascimento reeleito líder Câmara", icon:"Briefcase" },
];

export const HOME_AUDIT = [
  { who:"Ana Carolina (Diretoria)",   what:"visualizou dossiê - Jaques Wagner",               when:"há 2min" },
  { who:"Carlos Lima (Delegado BA)",  what:"exportou relatório emendas · 2024",               when:"há 8min" },
  { who:"Sistema",                    what:"sincronizou TSE · 48.312 registros atualizados",  when:"há 14min" },
  { who:"Maria Fernanda (Diretoria)", what:"comentou em alerta #a2 (Flávio Bolsonaro)",       when:"há 22min" },
  { who:"João Pedro (Presidente)",    what:"alterou permissão de 3 usuários",                 when:"há 34min" },
];

// Helper: cria item de mock com todos os campos que CardPolitico (V8) precisa.
// Mantem retrocompat com FifaMiniCard antigo (pac/pres/inf/leg/bse/mid lowercase).
function mk(id, nome, partido, uf, cargo, cargoLong, overall, tier, traits, atv, leg, bse, inf, mid, pac, votos, ano, fotoUrl) {
  return {
    id, candidato_id: id,
    nome, nome_urna: nome.toUpperCase(),
    partido, partido_sigla: partido,
    uf, estado_uf: uf,
    cargo, cargo_long: cargoLong,
    overall, tier, traits,
    // legado FifaMiniCard
    pac, pres: atv, inf, leg, bse, mid,
    // v9 oficial
    overall_v9: { ATV: atv, LEG: leg, BSE: bse, INF: inf, MID: mid, PAC: pac },
    foto_url: fotoUrl,
    votos_total: votos,
    ano,
  };
}

export const RADAR_CANDIDATOS = [
  mk( 1, "Lula",                    "PT",          "BR", "PRES", "Presidente",      93, "dourado", ["LEGEND","FENOMENO"], 95, 78, 94, 96, 89, 82, 60345999, 2022, "/fotos/2022/BR/FBR280001607829_div.jpg"),
  mk( 2, "Tarcísio de Freitas",     "REPUBLICANOS","SP", "GOV",  "Governador",      91, "dourado", ["FENOMENO","CAMPEAO"], 92, 68, 88, 90, 94, 78, 9489149, 2022, "/fotos/2022/SP/FSP250001615967_div.jpg"),
  mk( 3, "Ratinho Júnior",          "PSD",         "PR", "GOV",  "Governador",      90, "dourado", ["CAMPEAO","FERA_REG"], 90, 72, 91, 86, 82, 85, 4156661, 2022, null),
  mk( 4, "Jaques Wagner",           "PT",          "BA", "SEN",  "Senador",         87, "ouro",    ["LEGEND","FERA_REG"],  94, 79, 93, 88, 72, 91, 4241830, 2018, "/fotos/2018/BA/FBA50000607712_div.jpg"),
  mk( 5, "Renan Calheiros",         "MDB",         "AL", "SEN",  "Senador",         86, "ouro",    ["LEGEND"],             88, 84, 82, 92, 68, 94,  876854, 2018, null),
  mk( 6, "Davi Alcolumbre",         "UNIÃO",       "AP", "SEN",  "Senador",         85, "ouro",    ["FERA_REG","CAMPEAO"], 84, 72, 95, 91, 70, 88,  287842, 2022, null),
  mk( 7, "Rodrigo Pacheco",         "PSD",         "MG", "SEN",  "Senador",         85, "ouro",    ["CAMPEAO"],            92, 78, 80, 88, 74, 90, 4763908, 2018, "/fotos/2018/MG/FMG130000604556_div.jpg"),
  mk( 8, "Sergio Moro",             "PL",          "PR", "SEN",  "Senador",         82, "ouro",    ["FENOMENO"],           82, 68, 78, 74, 92, 62, 1956243, 2022, "/fotos/2022/PR/FPR160001621846_div.jpeg"),
  mk( 9, "Simone Tebet",            "MDB",         "MS", "SEN",  "Senadora",        81, "ouro",    ["CAMPEAO"],            86, 74, 72, 80, 84, 82,  393174, 2014, null),
  mk(10, "Eduardo Braga",           "MDB",         "AM", "SEN",  "Senador",         81, "ouro",    ["FERA_REG"],           80, 76, 88, 82, 64, 84,  864708, 2018, "/fotos/2022/AM/FAM40001610345_div.jpg"),
  mk(11, "Otto Alencar",            "PSD",         "BA", "SEN",  "Senador",         79, "prata",   ["FERA_REG"],           84, 74, 86, 78, 58, 82, 4106554, 2018, "/fotos/2022/BA/FBA50001605790_div.jpg"),
  mk(12, "Efraim Filho",            "UNIÃO",       "PB", "SEN",  "Senador",         78, "prata",   ["CAMPEAO"],            80, 72, 82, 76, 62, 84,  929938, 2022, "/fotos/2018/PB/FPB150000608820_div.jpg"),
  mk(13, "Alessandro Vieira",       "MDB",         "SE", "SEN",  "Senador",         76, "prata",   ["ESTREANTE"],          82, 70, 74, 72, 80, 70,  339183, 2018, null),
  mk(14, "Carlos Viana",            "PODEMOS",     "MG", "SEN",  "Senador",         74, "prata",   ["COMEBACK"],           78, 68, 72, 70, 74, 76, 4116085, 2018, "/fotos/2022/MG/FMG130001650894_div.jpg"),
  mk(15, "Soraya Thronicke",        "PODEMOS",     "MS", "SEN",  "Senadora",        73, "prata",   ["ESTREANTE"],          74, 60, 68, 64, 86, 62,  301290, 2018, "/fotos/2018/MS/FMS120000623873_div.jpg"),
  mk(16, "Humberto Costa",          "PT",          "PE", "SEN",  "Senador",         72, "prata",   ["FERA_REG"],           78, 72, 80, 74, 58, 78, 1980858, 2018, "/fotos/2018/PE/FPE170000604548_div.jpg"),
  mk(17, "Marcos Rogério",          "PL",          "RO", "SEN",  "Senador",         70, "bronze",  [],                     74, 62, 70, 66, 72, 68,  219358, 2018, "/fotos/2022/RO/FRO220001647595_div.jpg"),
  mk(18, "Zequinha Marinho",        "PODEMOS",     "PA", "SEN",  "Senador",         68, "bronze",  [],                     72, 60, 72, 64, 56, 70,  869535, 2018, "/fotos/2022/PA/FPA140001596649_div.jpg"),
  mk(19, "Irajá",                   "PSD",         "TO", "SEN",  "Senador",         67, "bronze",  ["ESTREANTE"],          70, 58, 66, 60, 62, 64,  208482, 2022, "/fotos/2022/TO/FTO270001697127_div.jpg"),
  mk(20, "Jorge Kajuru",            "PSB",         "GO", "SEN",  "Senador",         64, "bronze",  [],                     68, 52, 60, 54, 88, 48,  825597, 2018, "/fotos/2018/GO/FGO90000613472_div.jpg"),
  mk(21, "Omar Aziz",               "PSD",         "AM", "SEN",  "Senador",         77, "prata",   ["CAMPEAO"],            80, 70, 78, 76, 68, 82,  616894, 2018, "/fotos/2018/AM/FAM40000603709_div.jpg"),
  mk(22, "Angelo Coronel",          "PSD",         "BA", "SEN",  "Senador",         75, "prata",   [],                     78, 66, 82, 70, 60, 74, 1928650, 2018, "/fotos/2018/BA/FBA50000607716_div.jpg"),
  mk(23, "Astronauta Marcos Pontes","PL",          "SP", "SEN",  "Senador",         71, "bronze",  ["ESTREANTE"],          74, 56, 68, 62, 80, 58, 7152836, 2022, null),
  mk(24, "Pablo Marçal",            "PRTB",        "SP", "PREF", "Candidato a Prefeito (não eleito)", 38, "bronze", ["ESTREANTE"], 12,  4, 68, 22, 96, 18, 1719274, 2024, "/fotos/2024/SP/FSP250001978066_div.jpeg"),
];

export const TRAIT_LABEL = {
  FENOMENO: "Fenômeno",
  FERA_REG: "Fera regional",
  CAMPEAO:  "Campeão",
  LEGEND:   "Lenda",
  COMEBACK: "Comeback",
  ESTREANTE:"Estreante",
};

/* ====== Lote 2: Estudo ====== */
export const ESTUDO_TEMAS = [
  { id:"reforma-trib",  nome:"Reforma Tributária",       mencoes: 18420, sentimento: -12, trend: "+340%", cat:"Economia" },
  { id:"seguranca",     nome:"Segurança Pública",        mencoes: 14230, sentimento:  -8, trend: "+22%",  cat:"Social"   },
  { id:"marco-temporal",nome:"Marco Temporal",           mencoes: 12110, sentimento: -34, trend: "+180%", cat:"Judicial" },
  { id:"saude",         nome:"SUS · filas de cirurgia",  mencoes:  9820, sentimento: -18, trend: "+14%",  cat:"Social"   },
  { id:"educacao",      nome:"Escola sem partido",       mencoes:  8740, sentimento:   2, trend: "-6%",   cat:"Social"   },
  { id:"clima",         nome:"Seca Amazônia 2024",       mencoes:  7620, sentimento: -28, trend: "+62%",  cat:"Ambiente" },
  { id:"arcabouco",     nome:"Arcabouço fiscal",         mencoes:  6930, sentimento:  -6, trend: "+9%",   cat:"Economia" },
  { id:"eleicoes",      nome:"Eleições municipais 2024", mencoes:  6430, sentimento:   8, trend: "-12%",  cat:"Política" },
];

export const ESTUDO_CLUSTERS = [
  { lider:"Lula (PT)",                aliados: 312, alcance: "Nacional", forca: 88, cor: "#E4142C" },
  { lider:"Bolsonaro (PL)",           aliados: 276, alcance: "Nacional", forca: 85, cor: "#004F9F" },
  { lider:"Tarcísio (REPUBLICANOS)",  aliados: 124, alcance: "SP + SE",  forca: 78, cor: "#005FAF" },
  { lider:"Ratinho Jr (PSD)",         aliados:  98, alcance: "Sul + MT", forca: 74, cor: "#FDB913" },
  { lider:"ACM Neto (UB)",            aliados:  72, alcance: "NE + BA",  forca: 68, cor: "#002A7B" },
];

export const ESTUDO_ESTUDOS = [
  { titulo:"Perfil do eleitor indeciso · SE 2024",        autor:"Equipe pesquisa Mazzel",   data:"12 nov 2024", tipo:"Pesquisa",  paginas: 64 },
  { titulo:"Impacto da reforma tributária no Nordeste",   autor:"Eduardo Amaral (econ.)",   data:"03 nov 2024", tipo:"Análise",   paginas: 38 },
  { titulo:"Mapeamento de redes · Influência em X",       autor:"Social Lab MZ",            data:"28 out 2024", tipo:"Relatório", paginas: 52 },
  { titulo:"Desempenho eleitoral UB 2022-2024",           autor:"Consultoria interna",      data:"14 out 2024", tipo:"Estudo",    paginas: 84 },
  { titulo:"Correlação emendas x votos · meta-análise",   autor:"J.P. Andrade (cientista)", data:"30 set 2024", tipo:"Paper",     paginas: 28 },
  { titulo:"Evangélicos e poder de voto · 2016-2024",     autor:"Equipe religião Mazzel",   data:"18 set 2024", tipo:"Estudo",    paginas: 46 },
];

/* ====== Portal do Cliente ====== */
export const PORTAL_AGENDA = [
  { h:"08:00", titulo:"Café com prefeitos · Feira de Santana", local:"FSA/BA",    tipo:"Base",        conf:"confirmado" },
  { h:"10:30", titulo:"Entrevista TV Bahia · Jornal Nacional", local:"Salvador",  tipo:"Mídia",       conf:"confirmado" },
  { h:"14:00", titulo:"Sessão CAS · votação MP 1.184",         local:"Brasília",  tipo:"Legislativo", conf:"pendente"   },
  { h:"16:30", titulo:"Reunião bancada do Nordeste",           local:"Congresso", tipo:"Articulação", conf:"confirmado" },
  { h:"19:00", titulo:"Jantar com empresários do Oeste",       local:"Barreiras", tipo:"Base",        conf:"confirmado" },
];

export const PORTAL_METAS = [
  { m:"Emendas aprovadas 2024",    v:61, meta:80, unidade:"R$ M" },
  { m:"Base municipal ativa",      v:92, meta:95, unidade:"%"   },
  { m:"Discursos em plenário",     v:34, meta:40, unidade:""    },
  { m:"Menções positivas (mídia)", v:68, meta:75, unidade:"%"   },
];

export const PORTAL_EQUIPE = [
  { nome:"Ana Moura",      papel:"Chefia de gabinete",    local:"Brasília", ativo:true  },
  { nome:"Rafael Tavares", papel:"Assessor imprensa",     local:"Brasília", ativo:true  },
  { nome:"Carla Pinheiro", papel:"Articulação Congresso", local:"Brasília", ativo:false },
  { nome:"Pedro Vilaça",   papel:"Coordenador base BA",   local:"Salvador", ativo:true  },
  { nome:"Júlia Neves",    papel:"Redes sociais",         local:"Salvador", ativo:true  },
];

/* ====== Admin / White-Label ====== */
export const ADMIN_USUARIOS = [
  { nome:"Paulo Guedes",       email:"paulo.g@unionbrasil.org.br",  papel:"Presidente", uf:"-",  status:"ativo",    mfa:true,  last:"agora" },
  { nome:"Ana Carolina Silva", email:"ana.c@unionbrasil.org.br",    papel:"Diretoria",  uf:"-",  status:"ativo",    mfa:true,  last:"há 2min" },
  { nome:"Carlos Lima",        email:"carlos.l@unionbrasil.org.br", papel:"Delegado",   uf:"BA", status:"ativo",    mfa:true,  last:"há 8min" },
  { nome:"Maria Fernanda T.",  email:"maria.t@unionbrasil.org.br",  papel:"Diretoria",  uf:"-",  status:"ativo",    mfa:false, last:"há 22min" },
  { nome:"João Pedro Martins", email:"joao.m@unionbrasil.org.br",   papel:"Analista",   uf:"-",  status:"ativo",    mfa:true,  last:"há 34min" },
  { nome:"Jaques Wagner",      email:"jw@senado.leg.br",            papel:"Candidato",  uf:"BA", status:"ativo",    mfa:true,  last:"há 1h" },
  { nome:"Flávia Cunha",       email:"flavia.c@unionbrasil.org.br", papel:"Delegado",   uf:"RJ", status:"pendente", mfa:false, last:"nunca" },
  { nome:"Ricardo Amaral",     email:"ricardo.a@unionbrasil.org.br",papel:"Analista",   uf:"-",  status:"suspenso", mfa:true,  last:"há 4d" },
];

export const ADMIN_PAPEIS = [
  { papel:"Presidente",  qtd:1,   desc:"Acesso total · admin irrestrito",                     perm:["Tudo"] },
  { papel:"Diretoria",   qtd:8,   desc:"Leitura/escrita em todos os módulos, sem admin",      perm:["Home","Mapa","Radar","Dossiê","Estudo","Delegados","Filiados","IA","Alertas"] },
  { papel:"Delegado",    qtd:27,  desc:"Gestão da própria UF · visibilidade nacional limitada", perm:["Home","Mapa (própria UF)","Filiados (própria UF)","Alertas"] },
  { papel:"Analista",    qtd:14,  desc:"Leitura ampla, sem exportação em massa",              perm:["Home","Radar","Estudo","Dossiê (leitura)"] },
  { papel:"Candidato",   qtd:1247,desc:"Portal próprio · dados individuais apenas",            perm:["Portal do Cliente","Dossiê próprio","IA"] },
];

export const ADMIN_AUDIT = [
  { quando:"14:23", quem:"Ana Carolina Silva", acao:"LOGIN",       obj:"Plataforma",                 ip:"177.42.12.8" },
  { quando:"14:12", quem:"Carlos Lima (BA)",   acao:"EXPORT",      obj:"relatório emendas 2024",     ip:"200.12.4.15" },
  { quando:"14:04", quem:"Sistema",            acao:"SYNC_TSE",    obj:"48.312 registros",           ip:"-" },
  { quando:"13:48", quem:"João Pedro Martins", acao:"VIEW_DOSSIE", obj:"Jaques Wagner",              ip:"187.33.9.2" },
  { quando:"13:22", quem:"Paulo Guedes",       acao:"ROLE_CHANGE", obj:"Ricardo Amaral -> suspenso", ip:"191.4.11.7" },
  { quando:"13:05", quem:"Maria Fernanda T.",  acao:"COMMENT",     obj:"alerta #a2",                 ip:"177.42.12.91" },
  { quando:"12:40", quem:"Ana Carolina Silva", acao:"EXPORT",      obj:"Top 100 overall · CSV",      ip:"177.42.12.8" },
];

/* ====== Delegados ====== */
export const DELEGADOS_LIST = [
  { nome:"Carlos Lima",      uf:"BA", cidades: 417, filiados: 28400, perf: 92, status: "top" },
  { nome:"Flávia Cunha",     uf:"RJ", cidades:  92, filiados: 22100, perf: 88, status: "top" },
  { nome:"Rodrigo Paiva",    uf:"MG", cidades: 853, filiados: 41200, perf: 86, status: "top" },
  { nome:"Eduardo Amaral",   uf:"SP", cidades: 645, filiados: 52800, perf: 84, status: "ok"  },
  { nome:"Lúcia Nascimento", uf:"PE", cidades: 185, filiados: 18900, perf: 78, status: "ok"  },
  { nome:"Marcelo Tavares",  uf:"CE", cidades: 184, filiados: 17200, perf: 76, status: "ok"  },
  { nome:"Fernanda Castro",  uf:"RS", cidades: 497, filiados: 14600, perf: 72, status: "ok"  },
  { nome:"Ricardo Brandão",  uf:"PR", cidades: 399, filiados: 13800, perf: 70, status: "ok"  },
  { nome:"Júlia Menezes",    uf:"GO", cidades: 246, filiados:  9200, perf: 64, status: "at"  },
  { nome:"Paulo Ribeiro",    uf:"ES", cidades:  78, filiados:  6100, perf: 58, status: "at"  },
  { nome:"Antônio Farias",   uf:"MA", cidades: 217, filiados:  5400, perf: 52, status: "baixo" },
  { nome:"Beatriz Aguiar",   uf:"PB", cidades: 223, filiados:  4900, perf: 48, status: "baixo" },
];

/* ====== Filiados ====== */
export const FILIADOS_UF = UF_LIST.map((uf, i) => ({
  uf,
  total: 1000 + ((uf.charCodeAt(0) + uf.charCodeAt(1) + i * 13) * 31) % 50000,
  novos30d: 50 + (uf.charCodeAt(0) * 7) % 2400,
  baixas30d: 10 + (uf.charCodeAt(1) * 3) % 800,
})).sort((a, b) => b.total - a.total);

export const FILIADOS_TOTAL = FILIADOS_UF.reduce((s, u) => s + u.total, 0);
export const FILIADOS_NOVOS_30 = FILIADOS_UF.reduce((s, u) => s + u.novos30d, 0);

export const FILIADOS_FAIXA_IDADE = [
  { faixa:"16-24", v: 8 },
  { faixa:"25-34", v: 18 },
  { faixa:"35-44", v: 24 },
  { faixa:"45-54", v: 22 },
  { faixa:"55-64", v: 16 },
  { faixa:"65+",   v: 12 },
];

/* ====== IA Chat ====== */
export const IA_SUGESTOES = [
  { titulo:"Quais senadores UB têm maior risco eleitoral em 2026?",      icon:"Target"    },
  { titulo:"Resumir posicionamento do partido sobre reforma tributária", icon:"Sparkles"  },
  { titulo:"Comparar desempenho de emendas entre Bahia e Pernambuco",    icon:"BarChart3" },
  { titulo:"Identificar municípios com maior potencial de crescimento",  icon:"MapPin"    },
  { titulo:"Gerar dossiê executivo · Jaques Wagner (1 página)",          icon:"FileSearch"},
  { titulo:"Analisar cobertura de mídia da última semana",               icon:"Sparkles"  },
];

export const IA_CONVERSA = [
  { role:"user", msg:"Quais alertas críticos nas últimas 24h exigem ação da diretoria?", t:"14:22" },
  {
    role:"assistant",
    msg:"Identifiquei 3 alertas críticos que recomendam ação imediata:",
    citations: [
      { ref:"CEAF", texto:"Pablo Marçal (PRTB-SP) · nova ação inscrita no CEAF · 12min atrás" },
      { ref:"STF",  texto:"Ex-Gov. Roberto Rocha (UB-MA) · denúncia recebida pelo STF, relator Gilmar Mendes · 4h atrás" },
      { ref:"TCU",  texto:"Dep. Marcelo Queiroga (PL-PB) · TCE aberto em R$ 2,8M · 2h atrás" },
    ],
    followup: "Recomendo priorizar o caso do STF - envolve ex-governador filiado à UB e a notícia já foi capturada por Folha e CNN. Quer que eu gere rascunho de nota oficial?",
    t:"14:22",
  },
];

/* ====== Alertas (Central) ====== */
export const ALERTAS_DIA = [
  { id:1,  sev:"crit", hora:"14:22", tipo:"Judicial",    titulo:"Nova ação CEAF · Pablo Marçal",       fonte:"Conjur",           uf:"SP" },
  { id:2,  sev:"alto", hora:"13:44", tipo:"Mídia",       titulo:"Folha: Flávio Bolsonaro em CPI",       fonte:"Folha de S.Paulo", uf:"RJ" },
  { id:3,  sev:"med",  hora:"13:02", tipo:"Emenda",      titulo:"CGU cancelou emenda Júlia Rocha",      fonte:"CGU",              uf:"MG" },
  { id:4,  sev:"med",  hora:"12:31", tipo:"Processo",    titulo:"TCU · TCE aberto · R$ 2,8M",           fonte:"TCU",              uf:"PB" },
  { id:5,  sev:"bx",   hora:"11:48", tipo:"Filiação",    titulo:"150 novos filiados BA em 14 cidades",  fonte:"Sistema interno",  uf:"BA" },
  { id:6,  sev:"crit", hora:"10:17", tipo:"Processo",    titulo:"STF: denúncia Roberto Rocha",          fonte:"STF",              uf:"MA" },
  { id:7,  sev:"alto", hora:"09:44", tipo:"Redes",       titulo:"Pico menções negativas H.Costa +340%", fonte:"X Analytics",      uf:"PE" },
  { id:8,  sev:"med",  hora:"09:05", tipo:"Mídia",       titulo:"CNN: entrevista Wanderlei Barbosa",    fonte:"CNN Brasil",       uf:"TO" },
  { id:9,  sev:"bx",   hora:"08:32", tipo:"Legislativo", titulo:"PL 4320/2024 aprovada Senado",         fonte:"Senado",           uf:"-" },
  { id:10, sev:"crit", hora:"08:01", tipo:"Mídia",       titulo:"Estadão · investigação bancada PP",    fonte:"Estadão",          uf:"-" },
];

export const ALERTAS_CATS = [
  { cat:"Judicial",    qtd: 14, cor:"#f87171" },
  { cat:"Mídia",       qtd: 42, cor:"#60a5fa" },
  { cat:"Emenda",      qtd:  8, cor:"#fbbf24" },
  { cat:"Processo",    qtd: 11, cor:"#fb923c" },
  { cat:"Redes",       qtd: 28, cor:"#a78bfa" },
  { cat:"Filiação",    qtd: 19, cor:"#34d399" },
  { cat:"Legislativo", qtd: 16, cor:"#93c5fd" },
];

/* ====== Dossie v9 - shared data ====== */

export const ARCHETYPES = {
  fenomeno:    { label: "Fenômeno",      cls: "chip-blue",   dot: "dot-blue" },
  trabalhador: { label: "Trabalhador",   cls: "chip-green",  dot: "dot-green" },
  articulador: { label: "Articulador",   cls: "chip-purple", dot: "dot-purple" },
  chefeBase:   { label: "Chefe de base", cls: "chip-orange", dot: "dot-orange" },
};

export const DIMENSIONS = [
  { key: "ATV", label: "Atividade",   hint: "Participação em votações e sessões" },
  { key: "LEG", label: "Legislativo", hint: "Autoria, relatoria e aprovação de PLs" },
  { key: "BSE", label: "Base",        hint: "Força eleitoral no colégio" },
  { key: "INF", label: "Influência",  hint: "Articulação e poder de pauta" },
  { key: "MID", label: "Mídia",       hint: "Exposição e engajamento público" },
  { key: "PAC", label: "Pactuação",   hint: "Capacidade de formar alianças" },
];

export const STATS = {
  wagner: { ATV: 94, LEG: 79, BSE: 93, INF: 88, MID: 72, PAC: 91 },
  marcal: { ATV: 12, LEG:  4, BSE: 68, INF: 22, MID: 96, PAC: 18 },
};

export const STAT_BREAKDOWN = {
  ATV: [
    { k: "Presença plenário",     v: 94, w: "40%" },
    { k: "Presença comissões",    v: 96, w: "30%" },
    { k: "Sessões conjuntas",     v: 91, w: "30%" },
  ],
  LEG: [
    { k: "PLs de autoria",        v: 82, w: "35%" },
    { k: "PLs aprovados",         v: 76, w: "40%" },
    { k: "Relatorias",            v: 80, w: "25%" },
  ],
  BSE: [
    { k: "Votação absoluta",      v: 95, w: "40%" },
    { k: "Capilaridade UF",       v: 92, w: "35%" },
    { k: "Fidelidade do eleitor", v: 90, w: "25%" },
  ],
  INF: [
    { k: "Liderança partidária",  v: 90, w: "35%" },
    { k: "Cargos em comissões",   v: 85, w: "30%" },
    { k: "Rede de apoios",        v: 89, w: "35%" },
  ],
  MID: [
    { k: "Menções mídia",         v: 68, w: "40%" },
    { k: "Engajamento redes",     v: 74, w: "35%" },
    { k: "Entrevistas TV",        v: 75, w: "25%" },
  ],
  PAC: [
    { k: "Acordos interpartidários", v: 93, w: "50%" },
    { k: "Base governista",       v: 90, w: "30%" },
    { k: "Diálogo com oposição",  v: 88, w: "20%" },
  ],
};

export const PROFILES = {
  wagner: {
    id: "wagner",
    firstName: "JAQUES",
    lastName: "WAGNER",
    cargo: "SEN",
    meta: "SENADOR · BA · 2018",
    bio: "Ex-governador da Bahia (2007-2014), ex-ministro da Defesa e da Casa Civil. Base histórica do PT no Nordeste.",
    rating: 87,
    position: "SEN",
    shortName: "J. WAGNER",
    percentile: "Top 12% entre senadores",
    cartinha: {
      candidato_id: "wagner",
      nome: "JAQUES WAGNER",
      nome_urna: "JAQUES WAGNER",
      cargo: "SENADOR",
      partido_sigla: "PT",
      estado_uf: "BA",
      foto_url: null,
      overall: 87,
      overall_v9: { ATV: 94, LEG: 79, BSE: 93, INF: 88, MID: 72, PAC: 91 },
      votos_total: 4241830,
      ano: 2018,
    },
    archetypes: ["fenomeno", "trabalhador", "articulador", "chefeBase"],
    traits: [
      { label: "Fenômeno",      variant: "gold"   },
      { label: "Fera regional", variant: "silver" },
    ],
    stats: [
      { k: "Mandatos",    v: "04" },
      { k: "PL aprovados", v: "127" },
      { k: "Presença",    v: "94%" },
      { k: "Emendas",     v: "R$ 42M" },
    ],
    eleitoral: {
      uf: "BA",
      escopo: "ESTADO · BAHIA",
      votos: "4.2M",
      percentValidos: "48%",
      ano: "2018",
      topMunis: [
        { nome: "Salvador",              pct: 52, votos: "680K" },
        { nome: "Feira de Santana",      pct: 49, votos: "210K" },
        { nome: "Vitória da Conquista",  pct: 47, votos: "145K" },
      ],
      mapIntensity: { BA: 92, PE: 38, SE: 62, AL: 34, CE: 28, PI: 22, MA: 18, BR: 0 },
    },
    trajetoria: [
      { ano: "1986", cargo: "Vereador",                 uf: "Salvador/BA", votos: "4.210",     status: "eleito",  partido: "PT" },
      { ano: "1990", cargo: "Dep. Estadual",            uf: "BA",          votos: "38.540",    status: "eleito",  partido: "PT" },
      { ano: "1994", cargo: "Dep. Federal",             uf: "BA",          votos: "62.100",    status: "eleito",  partido: "PT" },
      { ano: "2002", cargo: "Dep. Federal",             uf: "BA",          votos: "89.320",    status: "eleito",  partido: "PT" },
      { ano: "2006", cargo: "Governador",               uf: "BA",          votos: "3.187.000", status: "eleito",  partido: "PT" },
      { ano: "2010", cargo: "Governador (reel.)",       uf: "BA",          votos: "3.995.000", status: "eleito",  partido: "PT" },
      { ano: "2014", cargo: "Min. Defesa / Casa Civil", uf: "BR",          votos: "-",         status: "nomeado", partido: "PT" },
      { ano: "2018", cargo: "Senador",                  uf: "BA",          votos: "4.241.830", status: "eleito",  partido: "PT" },
    ],
    legislativo: {
      disponivel: true,
      aprovados: {
        count: 127,
        recentes: [
          { em: "Marco legal das energias do mar",         data: "mar/25" },
          { em: "Fundo de segurança hídrica do Nordeste",  data: "fev/25" },
          { em: "Regulamentação do crédito rural familiar", data: "dez/24" },
        ],
      },
      tramitando: {
        count: 18,
        recentes: [
          { em: "Incentivo fiscal à indústria naval baiana", data: "abr/26" },
          { em: "Política nacional de agroecologia",         data: "mar/26" },
          { em: "Bônus de produtividade ao SUS municipal",   data: "fev/26" },
        ],
      },
      vetados: {
        count: 4,
        recentes: [
          { em: "Isenção de IPVA para veículos elétricos",  data: "out/24" },
          { em: "Remanejo emergencial de emendas RP-9",     data: "jun/24" },
          { em: "Criação do piso salarial técnico",         data: "mar/24" },
        ],
      },
      comissoes: [
        { sigla: "CRE", nome: "Relações Exteriores e Defesa Nacional", cargo: "Presidente", ativa: true  },
        { sigla: "CAE", nome: "Assuntos Econômicos",                   cargo: "Titular",    ativa: true  },
        { sigla: "CCJ", nome: "Constituição e Justiça",                cargo: "Suplente",   ativa: true  },
        { sigla: "CRA", nome: "Agricultura e Reforma Agrária",         cargo: "Titular",    ativa: true  },
        { sigla: "CMA", nome: "Meio Ambiente",                         cargo: "Vice",       ativa: false },
      ],
      relatorias: [
        { em: "PLS 421/2024 - Incentivo à energia eólica offshore",   data: "abr/26", situ: "Em análise" },
        { em: "PLS 318/2024 - Regularização fundiária na zona rural", data: "mar/26", situ: "Aprovado"   },
        { em: "PEC 12/2023 - Reforma do sistema portuário",           data: "fev/26", situ: "Em análise" },
        { em: "PLS 104/2023 - Royalties do pré-sal",                  data: "nov/25", situ: "Aprovado"   },
        { em: "PLS 088/2023 - Fundo estadual de turismo",             data: "ago/25", situ: "Arquivado"  },
      ],
    },
    alertas: {
      fichaLimpa: true,
      itens: [],
    },
    financeiro: {
      disponivel: true,
      arrecadado: "R$ 18.420.000",
      gasto:      "R$ 17.810.000",
      saldo:      "R$ 610.000",
      cpv: { valor: "R$ 4,20", medianaCargo: "R$ 6,80", deltaPct: -38, label: "mediana senador BA" },
      fontes: [
        { k: "Fundo Partidário", v: 58 },
        { k: "Pessoa Física",    v: 24 },
        { k: "Pessoa Jurídica",  v:  9 },
        { k: "Recursos Próprios",v:  6 },
        { k: "Outros",           v:  3 },
      ],
      topDoadores: [
        { nome: "João Silva Ribeiro",     v: "R$ 410.000" },
        { nome: "Maria Helena Costa",     v: "R$ 380.000" },
        { nome: "Antônio Carlos Menezes", v: "R$ 320.000" },
        { nome: "Luiza Almeida",          v: "R$ 280.000" },
        { nome: "Pedro Henrique Rocha",   v: "R$ 260.000" },
        { nome: "Ana Paula Moraes",       v: "R$ 240.000" },
        { nome: "Carlos Eduardo Freitas", v: "R$ 220.000" },
        { nome: "Fernanda Braga",         v: "R$ 200.000" },
        { nome: "Roberto Souza",          v: "R$ 180.000" },
        { nome: "Gabriela Nunes",         v: "R$ 160.000" },
      ],
    },
    emendas: {
      aplicavel: true,
      apresentado: "R$ 82.500.000",
      aprovado:    "R$ 61.200.000",
      executado:   "R$ 42.100.000",
      taxa: 69,
      anual: [
        { ano: "2019", v: 22 },
        { ano: "2020", v: 38 },
        { ano: "2021", v: 51 },
        { ano: "2022", v: 58 },
        { ano: "2023", v: 64 },
        { ano: "2024", v: 72 },
        { ano: "2025", v: 69 },
      ],
      areas: [
        { k: "Saúde",          v: 34, c: "#3b82f6" },
        { k: "Educação",       v: 22, c: "#22c55e" },
        { k: "Obras",          v: 20, c: "#f97316" },
        { k: "Assist. Social", v: 14, c: "#a855f7" },
        { k: "Cultura",        v: 10, c: "#eab308" },
      ],
      top: [
        { muni: "Salvador/BA",              area: "Saúde",          v: "R$ 4.200.000", st: "Pago"        },
        { muni: "Feira de Santana/BA",      area: "Educação",       v: "R$ 3.100.000", st: "Pago"        },
        { muni: "Vitória da Conquista/BA",  area: "Obras",          v: "R$ 2.800.000", st: "Em execução" },
        { muni: "Juazeiro/BA",              area: "Saúde",          v: "R$ 2.400.000", st: "Pago"        },
        { muni: "Ilhéus/BA",                area: "Cultura",        v: "R$ 2.100.000", st: "Em execução" },
        { muni: "Itabuna/BA",               area: "Educação",       v: "R$ 1.900.000", st: "Pago"        },
        { muni: "Barreiras/BA",             area: "Obras",          v: "R$ 1.700.000", st: "Em execução" },
        { muni: "Teixeira de Freitas/BA",   area: "Assist. Social", v: "R$ 1.500.000", st: "Pago"        },
        { muni: "Jequié/BA",                area: "Saúde",          v: "R$ 1.400.000", st: "Pago"        },
        { muni: "Paulo Afonso/BA",          area: "Obras",          v: "R$ 1.200.000", st: "Cancelado"   },
      ],
    },
    perfil: {
      bioLong: "Jaques Wagner nasceu em Salvador em 1951. Engenheiro formado pela UFBA, iniciou a militância sindical no movimento estudantil dos anos 70. Foi um dos fundadores do PT na Bahia e ocupou cargos executivos de destaque tanto no governo estadual quanto federal, consolidando-se como uma das principais lideranças históricas do partido no Nordeste.",
      nascimento: "Salvador · 1951 · 75 anos",
      formacao: "Engenharia - UFBA (1974)",
      partidos: [{ p: "PT", desde: "1980" }],
      redes: [
        { rede: "Instagram", handle: "@jaqueswagner", seguidores: "1.2M", engajamento: "4.8%", verificado: true  },
        { rede: "Twitter",   handle: "@jaqueswagner", seguidores: "890K", engajamento: "2.1%", verificado: true  },
        { rede: "Facebook",  handle: "Jaques Wagner", seguidores: "1.8M", engajamento: "3.2%", verificado: true  },
        { rede: "YouTube",   handle: "Jaques Wagner", seguidores: "210K", engajamento: "1.4%", verificado: false },
      ],
      gabinete: "Senado Federal · Anexo II · Ala Teotônio Vilela · Gab 15",
      email: "sen.jaqueswagner@senado.leg.br",
    },
  },

  marcal: {
    id: "marcal",
    firstName: "PABLO",
    lastName: "MARÇAL",
    cargo: "NONE",
    meta: "SEM MANDATO · SP",
    bio: "Empresário, coach e pré-candidato. Sem histórico parlamentar consolidado. Perfil em construção.",
    rating: null,
    position: "-",
    shortName: "P. MARÇAL",
    percentile: "Dados insuficientes para ranking",
    archetypes: [],
    traits: [],
    sparse: true,
    stats: [
      { k: "Mandatos",    v: "-" },
      { k: "PL aprovados", v: "-" },
      { k: "Presença",    v: "-" },
      { k: "Emendas",     v: "-" },
    ],
    eleitoral: {
      uf: "SP",
      escopo: "MUNICÍPIO · SÃO PAULO",
      votos: "1.72M",
      percentValidos: "28%",
      ano: "2024",
      topMunis: [{ nome: "São Paulo (capital)", pct: 28, votos: "1.72M" }],
      mapIntensity: { SP: 62, MG: 8, RJ: 12, PR: 10, BR: 0 },
    },
    trajetoria: [
      { ano: "2022", cargo: "Presidente",   uf: "BR", votos: "28.114",    status: "nao-eleito", partido: "PRTB" },
      { ano: "2024", cargo: "Prefeito SP",  uf: "SP", votos: "1.720.000", status: "2o-turno",   partido: "PRTB" },
    ],
    legislativo: { disponivel: false },
    alertas: {
      fichaLimpa: false,
      itens: [
        { tipo: "CEAF",            orgao: "CGU",  data: "jan/24", valor: null,     desc: "Registro no Cadastro de Expulsões da Administração Federal",   severidade: "alto",  url: "#" },
        { tipo: "Execução Fiscal", orgao: "PGFN", data: "ago/23", valor: "R$ 2.1M",desc: "Débito inscrito em dívida ativa - em negociação",               severidade: "medio", url: "#" },
        { tipo: "TCU",             orgao: "TCU",  data: "out/22", valor: "R$ 480K",desc: "Tomada de contas especial - em andamento",                      severidade: "medio", url: "#" },
      ],
    },
    financeiro: { disponivel: false },
    emendas: { aplicavel: false },
    perfil: {
      bioLong: "Pablo Henrique Costa Marçal é empresário e influenciador digital, com atuação focada em mentoria de negócios e marketing pessoal. Em 2024 concorreu à Prefeitura de São Paulo, obtendo votação expressiva apesar de não alcançar o segundo turno na disputa final.",
      nascimento: "Goianésia · 1987 · 39 anos",
      formacao: "Educação Física (não concluído)",
      partidos: [{ p: "PRTB", desde: "2024" }, { p: "PROS", desde: "2022 (até 2023)" }],
      redes: [
        { rede: "Instagram", handle: "@pablomarcal1",   seguidores: "12.4M", engajamento: "8.2%",  verificado: true },
        { rede: "TikTok",    handle: "@pablomarcalofc", seguidores: "6.8M",  engajamento: "11.4%", verificado: true },
        { rede: "YouTube",   handle: "Pablo Marçal",    seguidores: "3.1M",  engajamento: "6.0%",  verificado: true },
        { rede: "Twitter",   handle: "@pablomarcal",    seguidores: "2.9M",  engajamento: "4.1%",  verificado: true },
      ],
      gabinete: "-",
      email: "-",
    },
  },
};

/* Constroi um profile minimo a partir de um item de RADAR_CANDIDATOS.
 * Usado quando backend nao retorna dossie (sem sessao) e cai em mock visual.
 * Garante que click em qualquer cartinha mock abre dossie coerente do candidato. */
function buildProfileFromCard(c) {
  if (!c) return null;
  const partes = c.nome.trim().split(/\s+/);
  const firstName = partes[0].toUpperCase();
  const lastName = partes.length > 1 ? partes.slice(1).join(" ").toUpperCase() : "";
  const shortName = partes.length > 1
    ? `${partes[0][0].toUpperCase()}. ${partes[partes.length - 1].toUpperCase()}`
    : firstName;
  const cargoLong = c.cargo_long || c.cargo;
  const meta = [cargoLong?.toUpperCase(), c.estado_uf, c.ano].filter(Boolean).join(" · ");
  return {
    id: c.candidato_id ?? c.id,
    firstName, lastName, shortName,
    cargo: c.cargo, position: c.cargo,
    meta: meta || "-",
    bio: `${c.nome} - ${cargoLong || c.cargo} pelo ${c.partido_sigla || c.partido} de ${c.estado_uf || c.uf}. Dossie completo em construcao - dados consolidados serao exibidos quando a sessao estiver autenticada.`,
    rating: c.overall ?? null,
    percentile: "Posição em cálculo",
    tier: c.tier || "bronze",
    archetypes: [],
    traits: (c.traits || []).slice(0, 2).map((t) => ({
      label: TRAIT_LABEL[t] || t,
      variant: ["LEGEND","CAMPEAO","FENOMENO"].includes(t) ? "gold" : "silver",
    })),
    sparse: false,
    cartinha: {
      candidato_id: c.candidato_id ?? c.id,
      nome: c.nome,
      nome_urna: c.nome_urna,
      cargo: cargoLong || c.cargo,
      partido_sigla: c.partido_sigla || c.partido,
      estado_uf: c.estado_uf || c.uf,
      foto_url: c.foto_url,
      overall: c.overall,
      overall_v9: c.overall_v9,
      votos_total: c.votos_total,
      ano: c.ano,
    },
    overallStats: c.overall_v9 || null,
    stats: [
      { k: "Votos último", v: c.votos_total ? c.votos_total.toLocaleString("pt-BR") : "-" },
      { k: "Cargo",        v: c.cargo || "-" },
      { k: "UF",           v: c.estado_uf || c.uf || "-" },
      { k: "Tier",         v: c.tier || "-" },
    ],
    eleitoral: { uf: c.estado_uf || c.uf, escopo: c.estado_uf || "-", votos: c.votos_total ? c.votos_total.toLocaleString("pt-BR") : "-", percentValidos: "-", ano: String(c.ano || "-"), topMunis: [], mapIntensity: {} },
    trajetoria: [],
    legislativo: { disponivel: false },
    alertas: { itens: [], totalAtivo: 0 },
    financeiro: { disponivel: false },
    emendas: { aplicavel: false },
    // perfil: shape completo pra nao quebrar Perfil.jsx (usa partidos.map e redes.map)
    perfil: {
      disponivel: true,
      bioLong: `${c.nome} - ${cargoLong || c.cargo} pelo ${c.partido_sigla || c.partido} de ${c.estado_uf || c.uf}. Biografia completa sera exibida quando o dossie consolidado estiver disponivel via backend.`,
      nascimento: "-",
      formacao: "-",
      partidos: [{ p: c.partido_sigla || c.partido, desde: "-" }],
      redes: [],
      gabinete: "-",
      email: "-",
    },
  };
}

/* Resolve id/slug para o profile correspondente. */
export function findProfile(idOrSlug) {
  if (!idOrSlug) return null;
  const key = String(idOrSlug).toLowerCase();
  if (PROFILES[key]) return PROFILES[key];
  if (key === "4" || key.includes("wagner")) return PROFILES.wagner;
  if (key === "24" || key.includes("marcal")) return PROFILES.marcal;
  // Fallback: ID numerico de mock - constroi profile a partir de RADAR_CANDIDATOS
  const idNum = Number(key);
  if (!Number.isNaN(idNum)) {
    const card = RADAR_CANDIDATOS.find((c) => c.id === idNum || c.candidato_id === idNum);
    if (card) return buildProfileFromCard(card);
  }
  return null;
}
