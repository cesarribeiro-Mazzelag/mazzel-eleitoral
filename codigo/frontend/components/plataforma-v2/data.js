/* Constantes compartilhadas da plataforma Mazzel.
 * Derivado de designer/platform-data.jsx + platform-data2.jsx. */

export const TENANTS = {
  uniao: {
    id: "uniao",
    nome: "União Brasil",            // nome do partido
    productName: "União Conecta",    // nome da plataforma pro UB (Cesar 27/04)
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
    productName: "PT Conecta",
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
    productName: "PSDB Conecta",
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

/* ==========================================================
 * OPERAÇÕES (modulo F3) - Designer V1.2 02-modulo-operacoes
 * ========================================================== */

export const OPERACOES_KPIS = [
  { l: "Operações Ativas",       v: "14",       d: "+3 (mês)",            ok: true  },
  { l: "Cobertura agregada",     v: "68%",      d: "+12pp 90d",           ok: true  },
  { l: "Lideranças engajadas",   v: "2.847",    d: "+187 (sem)",          ok: true  },
  { l: "Investimento ativo",     v: "R$ 14,2M", d: "orçamento aprovado",  ok: null  },
];

export const OPERACOES_ATIVAS = [
  { id: "OP-2026-014", status: "live",  tipo: "Capilarização", nome: "Capilarização SP Cap · Zona Sul",   uf: "SP", mun: "São Paulo",   recorte: "Zona Sul · 14 distritos",        progresso: 67, lid: 147, cabos: 68,  fil: 2847,  alertas: 3, leader: "RT", leaderNome: "Rita Tavares"     },
  { id: "OP-2026-013", status: "live",  tipo: "Eleitoral",     nome: "Pré-2026 · MG · Triângulo",         uf: "MG", mun: "12 mun.",     recorte: "Uberlândia + Uberaba metro",     progresso: 48, lid: 89,  cabos: 41,  fil: 1284,  alertas: 1, leader: "CB", leaderNome: "Carla Bessa"      },
  { id: "OP-2026-012", status: "alert", tipo: "Crise",         nome: "Resposta · Pres. Mun. RO afastado", uf: "RO", mun: "Porto Velho", recorte: "capital + entorno",             progresso: 28, lid: 12,  cabos: 4,   fil: 187,   alertas: 7, leader: "MB", leaderNome: "M. Bertaiolli"    },
  { id: "OP-2026-011", status: "live",  tipo: "Filiação",      nome: "Mutirão Filiação · CE",             uf: "CE", mun: "14 mun.",     recorte: "Fortaleza metropolitana",        progresso: 72, lid: 124, cabos: 58,  fil: 4124,  alertas: 0, leader: "PB", leaderNome: "P. Bezerra"       },
  { id: "OP-2026-010", status: "live",  tipo: "Capilarização", nome: "Capilarização PE · Sertão",         uf: "PE", mun: "23 mun.",     recorte: "Vale do São Francisco",          progresso: 54, lid: 78,  cabos: 32,  fil: 1728,  alertas: 2, leader: "MS", leaderNome: "M. Souza"         },
  { id: "OP-2026-009", status: "plan",  tipo: "Eleitoral",     nome: "Pré-Convenção · DF",                uf: "DF", mun: "Brasília",    recorte: "plano piloto + RA-7",            progresso: 12, lid: 24,  cabos: 8,   fil: 312,   alertas: 0, leader: "PR", leaderNome: "P. Roberto"       },
];

export const OPERACOES_CONCLUIDAS = [
  { id: "OP-2025-007", status: "done", tipo: "Capilarização", nome: "Capilarização BA Metro",     uf: "BA", mun: "Salvador + RM", recorte: "47 bairros",                       progresso: 100, lid: 312, cabos: 128, fil: 14847, alertas: 0, leader: "JW", leaderNome: "J. Wagner"   },
  { id: "OP-2025-006", status: "done", tipo: "Eleitoral",     nome: "Pós-2024 · MG Triângulo",    uf: "MG", mun: "8 mun.",        recorte: "Uberlândia + cidades-foco",        progresso: 100, lid: 87,  cabos: 38,  fil: 4280,  alertas: 0, leader: "CB", leaderNome: "Carla Bessa" },
];

export const OPERACOES_TIPOS = [
  { k: "todas",          l: "Todas"          },
  { k: "Capilarização",  l: "Capilarização"  },
  { k: "Eleitoral",      l: "Eleitoral"      },
  { k: "Crise",          l: "Crise"          },
  { k: "Filiação",       l: "Filiação"       },
];

export const OPERACOES_STATUS_LABEL = {
  live:  "AO VIVO",
  plan:  "PLANEJ.",
  done:  "CONCLUÍDA",
  alert: "ALERTA",
};

/* ==========================================================
 * HOME · DASHBOARD MILTON (Designer V1.2 F2-01 Variação A · Linear minimalista)
 * ========================================================== */

export const HOME_LINEAR_HEADLINE = {
  greet: "Bom dia, Presidente",
  cidade_pct: "78%",   // % SP coberta
  mun_risco: 3,
};

export const HOME_LINEAR_KPIS = [
  {
    k: "filiados",
    l: "Filiados SP",
    v: "124.847",
    deltas: [
      { when: "7 dias",   v: "+412",    dir: "up" },
      { when: "30 dias",  v: "+2.103",  dir: "up" },
      { when: "vs 2022",  v: "+18%",    dir: "up" },
    ],
  },
  {
    k: "comissoes",
    l: "Comissões Ativas",
    v: "503",
    suffix: "/645",
    deltas: [
      { when: "Esta semana", v: "+7",   dir: "up"   },
      { when: "Pendentes",   v: "142",  dir: "down" },
      { when: "Cobertura",   v: "78%",  dir: "flat" },
    ],
  },
  {
    k: "score",
    l: "Score Médio Pres Mun.",
    v: "71",
    deltas: [
      { when: "7 dias",  v: "+1.2",       dir: "up"   },
      { when: "Top 10%", v: "≥87",        dir: "flat" },
      { when: "Risco",   v: "23 mun.",    dir: "down" },
    ],
  },
  {
    k: "receita",
    l: "Receita Partidária",
    v: "R$ 4,2M",
    deltas: [
      { when: "30 dias",  v: "+R$ 320k",  dir: "up"   },
      { when: "Meta 2026", v: "68%",      dir: "flat" },
      { when: "vs 2024",  v: "+11%",      dir: "up"   },
    ],
  },
];

export const HOME_LINEAR_SUBORDINADOS = [
  { mun: "São Paulo · Capital",       nome: "Bruno Covas Filho",     ovr: 94, delta: "+2.1", dir: "up",   status: "ok"   },
  { mun: "Campinas",                  nome: "Roberto Lima",           ovr: 87, delta: "+0.8", dir: "up",   status: "ok"   },
  { mun: "Santos",                    nome: "Priscila Gama",          ovr: 82, delta: "+1.4", dir: "up",   status: "ok"   },
  { mun: "São Bernardo do Campo",     nome: "Carlos Mendes",          ovr: 76, delta: "−0.3", dir: "down", status: "ok"   },
  { mun: "Itaquaquecetuba",           nome: "Alessandro Rotunno",     ovr: 68, delta: "+0.4", dir: "up",   status: "ok"   },
  { mun: "Ribeirão Preto",            nome: "Vaga · Sem Pres há 14 dias", ovr: 42, delta: "−4.8", dir: "down", status: "crit", warn: true },
  { mun: "Sorocaba",                  nome: "Nominata vencida",       ovr: 51, delta: "−2.1", dir: "down", status: "warn", warn: true },
];

export const HOME_LINEAR_SENTINELA = [
  { bold: "Tarcísio assinou contrato",  rest: " — leva educação SP.",                                  when: "há 2h", kind: "ok"   },
  { bold: "PSD anunciou pré-candidato", rest: " em Campinas.",                                          when: "há 5h", kind: "ok"   },
  { bold: "Vereador Y ficha-suja",      rest: " · Itu — TSE julgamento 12/05.",                         when: "há 8h", kind: "crit" },
  { bold: "847 novos filiados",          rest: " esta semana — Vale do Paraíba liderando.",             when: "ontem", kind: "ok"   },
];

export const HOME_LINEAR_DECISOES = [
  { pri: "alta",  txt: "Substituir Pres Municipal de ", bold: "Ribeirão Preto", suffix: " — vago há 14 dias.",     meta: "3 candidatos sugeridos pela IA" },
  { pri: "alta",  txt: "Aprovar verba ",                bold: "R$ 280k",         suffix: " para campanha Vale Paraíba.", meta: "Tesoureira aguardando há 5 dias" },
  { pri: "media", txt: "Reagir ao anúncio do PSD em Campinas — IA sugere encontrar 3 lideranças locais.", bold: null, suffix: "", meta: "Janela: 72h" },
];

/* ==========================================================
 * HOME · CENTRO DE COMANDO (Designer V1.2 F2-01 Variação C · Palantir)
 * Mantida disponível pra rota alternativa /mazzel-preview/centro-comando
 * caso voltemos a usar densidade Palantir.
 * ========================================================== */

export const HOME_PALANTIR_KPIS = [
  // linha 1
  { k: "filiados",   l: "Filiados Totais",  v: "124.847",  d: "+2.103 (30d)",        ok: true,  alert: false },
  { k: "comissoes",  l: "Comissões Ativas", v: "503/645",  d: "+7 esta semana",      ok: true,  alert: false },
  { k: "score",      l: "Score Médio",      v: "71.4",     d: "+1.2",                ok: true,  alert: false },
  { k: "receita",    l: "Receita 30d",      v: "R$ 4,2M",  d: "+R$ 320k",            ok: true,  alert: false },
  { k: "cabos",      l: "Cabos Ativos",     v: "3.412",    d: "+147",                ok: true,  alert: false },
  { k: "operacoes",  l: "Operações",        v: "23",       d: "3 atrasadas",         ok: false, alert: false },
  // linha 2
  { k: "eleitos",    l: "Eleitos Mandato",  v: "147",      d: "12 sen+dep · 135 ver",ok: null,  alert: false },
  { k: "emendas",    l: "Emendas Exec.",    v: "R$ 84M",   d: "62% empenhadas",      ok: true,  alert: false },
  { k: "risco",      l: "Mun. em Risco",    v: "23",       d: "≤ 50 OVR · ⚠ ação",   ok: false, alert: true  },
  { k: "nominatas",  l: "Nominatas Pend.",  v: "142",      d: "DocuSign",            ok: null,  alert: false },
  { k: "alertas",    l: "Alertas Críticos", v: "12",       d: "7 jurídicos · 5 op.", ok: false, alert: true  },
  { k: "ranking",    l: "Ranking BR",       v: "3º",       d: "↑1 vs trim. anterior",ok: true,  alert: false },
];

/* Heatmap SP - 20x9 = 180 celulas. Determinístico (mesma sequência sempre). */
export const HOME_PALANTIR_HEATMAP = (() => {
  const palette = ["#1e3a8a", "#1d4ed8", "#2563eb", "#3b82f6", "#f59e0b", "#fb923c", "#dc2626"];
  const out = [];
  for (let i = 0; i < 180; i++) {
    const r = ((i * 137 + 42) % 100) / 100;
    let idx;
    if (r < 0.15) idx = 0;
    else if (r < 0.35) idx = 2;
    else if (r < 0.65) idx = 3;
    else if (r < 0.85) idx = 4;
    else if (r < 0.95) idx = 5;
    else idx = 6;
    out.push({ color: palette[idx], opacity: 0.4 + (idx / 6) * 0.6 });
  }
  return out;
})();

export const HOME_PALANTIR_FEED = [
  { ts: "09:14:22", tag: "alt", bold: "Ribeirão Preto", rest: " · Pres vago há 14d · Score caiu para 42" },
  { ts: "09:08:11", tag: "opp", bold: null,             rest: "Coord ABC concluiu visita aos 7 prefeitos" },
  { ts: "08:54:43", tag: "pol", bold: "Tarcísio",       rest: " assinou contrato Educação SP" },
  { ts: "08:33:09", tag: "fin", bold: null,             rest: "Receita 30d cruzou R$4M · meta 60% atingida" },
  { ts: "08:21:55", tag: "pol", bold: null,             rest: "PSD anunciou pré-candidato em Campinas" },
  { ts: "07:48:11", tag: "opp", bold: null,             rest: "847 filiados novos no Vale do Paraíba (sem)" },
  { ts: "07:32:00", tag: "alt", bold: null,             rest: "Vereador Y · Itu · TSE julgamento ficha-suja 12/05" },
  { ts: "07:14:33", tag: "opp", bold: null,             rest: "Cabo #3412 · check-in GPS · Itaquera Quadra 47" },
  { ts: "06:58:21", tag: "fin", bold: null,             rest: "R$ 320k empenhados · Emenda Sen. Wagner" },
  { ts: "06:42:08", tag: "pol", bold: null,             rest: "Acordo informal · Pref Santos × Vereador Z" },
];

export const HOME_PALANTIR_FEED_TAGS = {
  alt: { label: "ALERTA",   color: "#fca5a5", bg: "rgba(239,68,68,0.12)"  },
  opp: { label: "OPERAÇÃO", color: "#86efac", bg: "rgba(34,197,94,0.12)"  },
  pol: { label: "POLÍTICA", color: "#93c5fd", bg: "rgba(59,130,246,0.12)" },
  fin: { label: "FINANÇAS", color: "#fcd34d", bg: "rgba(251,191,36,0.12)" },
};

export const HOME_PALANTIR_ACOES = [
  { icon: "!",  text: "Substituir Pres Mun Ribeirão",        href: null },
  { icon: "$",  text: "Liberar R$ 280k Vale do Paraíba",     href: null },
  { icon: "⚡", text: "Reagir a PSD Campinas",               href: null },
  { icon: "📅", text: "Confirmar agenda Tarcísio · S. Vicente", href: null },
  { icon: "+",  text: "Criar nova operação territorial",    href: "/mazzel-preview/operacoes" },
  { icon: "M",  text: "Abrir Mapa Estratégico",             href: "/mazzel-preview/mapa" },
  { icon: "R",  text: "Pedir relatório semanal aos 645",    href: null },
  { icon: "📞", text: "Conferência Pres Municipais Top 20",  href: null },
];

/* ==========================================================
 * CHAT (modulo F3 03-chat-evoluido) - 3 modos
 * ========================================================== */

export const CHAT_MODES = [
  { k: "permanente", icon: "💬", label: "Permanente", sub: "Histórico auditável · LGPD",   qty: 142 },
  { k: "sigiloso",   icon: "🔒", label: "Sigiloso",   sub: "E2EE · auto-destrói",           qty: 14  },
  { k: "sos",        icon: "🚨", label: "SOS Cabo",   sub: "Pânico territorial · 24/7",     qty: 3   },
];

export const CHAT_FEATURES = {
  permanente: {
    title: "Recursos · Permanente",
    items: [
      { on: true, b: "Histórico ilimitado",  s: "Tudo gravado · auditável" },
      { on: true, b: "Pesquisa full-text",   s: "Inclusive anexos OCR"     },
      { on: true, b: "LGPD-compliant",       s: "Consentimento + retenção" },
      { on: true, b: "Auditoria por DPO",    s: "Logs imutáveis · jurídico" },
      { on: true, b: "Anexos ilimitados",    s: "Docs, áudio, foto, vídeo" },
      { on: false, b: "Auto-destruição",     s: "Indisponível neste modo"  },
    ],
  },
  sigiloso: {
    title: "Recursos · Sigiloso",
    items: [
      { on: true, b: "E2EE · Signal protocol",   s: "Servidor sem chaves"        },
      { on: true, b: "Auto-destruição 24h",      s: "Mensagem some dos 2 lados"  },
      { on: true, b: "Print bloqueado",          s: "Tela apaga ao detectar"     },
      { on: true, b: "Watermark dinâmica",       s: "Username + IP + hora"       },
      { on: true, b: "Sem encaminhamento",       s: "Sem copiar texto"           },
      { on: false, b: "Pesquisa de mensagens",   s: "Off por design"             },
    ],
  },
  sos: {
    title: "Recursos · SOS Cabo",
    items: [
      { crit: true, b: "Escalada automática",        s: "Coord + Jurídico + Seg"           },
      { crit: true, b: "Localização em tempo real",  s: "Cabo é geolocalizado"             },
      { crit: true, b: "Áudio direto · sirene",      s: "Toca em todos os celulares"       },
      { on: true,   b: "Histórico forense",          s: "Gravado para denúncia/BO"         },
      { on: true,   b: "Botão chamar PM",            s: "Disca 190 do app"                 },
      { on: true,   b: "Buddy automático",           s: "3 cabos próximos notificados"     },
    ],
  },
};

export const CHAT_CONVERSATIONS = {
  permanente: [
    { id: "p1", avatar: "JM", name: "João Mendes",         sub: "Cabo · Capão Redondo · OP-2026-014",   preview: "Beleza, mando o relatório das 23 ruas hoje à noite.",          when: "09:14", online: true,  unread: 0, tag: "OP-014",  active: true },
    { id: "p2", avatar: "OP", name: "OP-2026-014 · Coord", sub: "Grupo · 12 membros · Capilarização SP", preview: "Rita: Pessoal, reunião amanhã 10h confirmada?",                when: "08:42", unread: 4,    tag: "OP-014" },
    { id: "p3", avatar: "RT", name: "Rita Tavares",        sub: "Líder Operação · OVR 94",              preview: "Recebido. Vou validar com Milton e te respondo.",              when: "08:18", unread: 0 },
    { id: "p4", avatar: "TS", name: "Tesouraria UB",       sub: "Bot · Validações + Confirmações",      preview: "✓ Despesa R$ 38.400 (eventos abr) APROVADA — comprovação ok",  when: "ontem", unread: 1 },
    { id: "p5", avatar: "PS", name: "Paula Silva",         sub: "Cabo · Cidade Ademar",                 preview: "Marquei 38 fichas pra entregar amanhã. Foto anexa.",           when: "ontem", unread: 0 },
    { id: "p6", avatar: "DN", name: "Direção Nacional",    sub: "Grupo · 47 membros · Top brass",       preview: "Milton: Orientação para cabos sobre conduta TSE atualizada.",  when: "23/abr", unread: 0, tag: "OFICIAL" },
  ],
  sigiloso: [
    { id: "s1", avatar: "ML", name: "Milton Leite",        sub: "Pres. Estadual SP",                    preview: "[mensagem expirada]",                                    when: "09:04", unread: 1, tag: "SIGIL", active: true },
    { id: "s2", avatar: "WG", name: "Wagner BA",           sub: "Pres. Estadual BA · OVR 87",           preview: "[criptografada · auto-destrói em 14h]",                  when: "07:22", unread: 0, tag: "SIGIL" },
    { id: "s3", avatar: "DN", name: "Núcleo Estratégico",  sub: "5 membros · OVR ≥ 85",                 preview: "[mensagem cifrada]",                                     when: "ontem", unread: 2, tag: "SIGIL" },
    { id: "s4", avatar: "AD", name: "Advocacia · Dr. Ramos", sub: "Operação Confidencial",              preview: "[apenas leitura · expira em 6h]",                        when: "23/abr", unread: 0, tag: "SIGIL" },
  ],
  sos: [
    { id: "x1", avatar: "LR", name: "Luiz Ribeiro · CABO", sub: "🚨 EM ESCALADA · M'Boi Mirim · há 12 min", preview: "SOS aberto · localização ativa · áudio gravando", when: "AGORA",  unread: 1, tag: "SOS", active: true, sos: true },
    { id: "x2", avatar: "CD", name: "Carla Diniz · CABO",  sub: "Resolvido há 2h · BA · Periperi",       preview: "Cabo confirmou segurança · caso ENCERRADO pelo Coord.", when: "06:42", unread: 0, tag: "SOS" },
    { id: "x3", avatar: "AS", name: "Antonio Santos · CABO", sub: "Resolvido ontem · CE · Maracanaú",    preview: "Falso alarme · botão acionado por engano · ENCERRADO", when: "24/abr", unread: 0, tag: "SOS" },
  ],
};

/* ==========================================================
 * EMENDAS (modulo F3 04-modulo-emendas) - Designer V1.2
 * Caso real exemplar: Santa Bárbara d'Oeste (SP).
 * ========================================================== */

export const EMENDAS_MUNICIPIOS = [
  { id: "sp",   nm: "São Paulo",                pop: 12330000, total: 89_400_000, score: 18, status: "ok",   area: "Capital · RM" },
  { id: "cps",  nm: "Campinas",                 pop: 1223000,  total: 28_700_000, score: 24, status: "ok",   area: "RMC" },
  { id: "sbo",  nm: "Santa Bárbara d'Oeste",    pop: 195000,   total: 78_200_000, score: 87, status: "crit", area: "RMC", flag: "INCONSISTÊNCIA · 2 emendas críticas" },
  { id: "amer", nm: "Americana",                pop: 240000,   total: 11_400_000, score: 32, status: "ok",   area: "RMC" },
  { id: "lim",  nm: "Limeira",                  pop: 308000,   total: 14_100_000, score: 38, status: "ok",   area: "RMC" },
  { id: "pir",  nm: "Piracicaba",               pop: 410000,   total: 19_800_000, score: 28, status: "ok",   area: "Centro" },
  { id: "rib",  nm: "Ribeirão Preto",           pop: 720000,   total: 42_600_000, score: 22, status: "ok",   area: "Norte" },
  { id: "sjc",  nm: "São José dos Campos",      pop: 730000,   total: 38_900_000, score: 26, status: "ok",   area: "Vale" },
  { id: "sant", nm: "Santos",                   pop: 433000,   total: 22_300_000, score: 30, status: "ok",   area: "Baixada" },
  { id: "guar", nm: "Guarulhos",                pop: 1390000,  total: 31_800_000, score: 31, status: "ok",   area: "RMSP" },
  { id: "sor",  nm: "Sorocaba",                 pop: 695000,   total: 26_700_000, score: 25, status: "ok",   area: "Sudoeste" },
  { id: "bau",  nm: "Bauru",                    pop: 380000,   total: 16_400_000, score: 35, status: "ok",   area: "Centro-oeste" },
  { id: "sjp",  nm: "São José do Rio Preto",    pop: 480000,   total: 22_900_000, score: 28, status: "ok",   area: "Noroeste" },
  { id: "pres", nm: "Presidente Prudente",      pop: 230000,   total: 8_900_000,  score: 41, status: "high", area: "Oeste" },
  { id: "frc",  nm: "Franca",                   pop: 360000,   total: 14_600_000, score: 36, status: "ok",   area: "Norte" },
  { id: "jund", nm: "Jundiaí",                  pop: 420000,   total: 17_300_000, score: 24, status: "ok",   area: "RMSP" },
  { id: "reg",  nm: "Registro",                 pop: 56000,    total: 22_400_000, score: 76, status: "crit", area: "Vale Ribeira", flag: "INCONSISTÊNCIA · Volume 7x acima do esperado" },
  { id: "ita",  nm: "Itapeva",                  pop: 95000,    total: 18_600_000, score: 68, status: "high", area: "Sudoeste",     flag: "Volume acima do esperado · investigar" },
];

export const EMENDAS_LIST = [
  {
    id: "EMD-2025-014729",
    titulo: "Apoio ao desenvolvimento social e estrutural do município",
    autor: "André Amaral Filho",
    autor_partido: "UNIÃO",
    autor_uf: "PB",
    autor_nota: "Sem ligação eleitoral com SP · 0 votos no estado",
    municipio: "Santa Bárbara d'Oeste",
    valor: 35_000_000,
    valor_pago: 18_400_000,
    rp: "RP-6",
    categoria: "Infraestrutura urbana",
    finalidade: "Apoio ao desenvolvimento — sem objeto especificado",
    finalidade_score: 12,
    score: 92,
    tier: "crit",
    status: "em_execucao",
    motivos: [
      { tipo: "danger", label: "Volume 8.4x acima do benchmark de cidades similares" },
      { tipo: "danger", label: "Autor sem ligação eleitoral · 0 votos em SBO em 2022" },
      { tipo: "danger", label: "Finalidade vaga · NLP score 12/100" },
      { tipo: "warn",   label: "Liquidada sem nota fiscal pública vinculada" },
    ],
  },
  {
    id: "EMD-2025-018221",
    titulo: "Programa de modernização administrativa",
    autor: "Capitão Augusto",
    autor_partido: "PL",
    autor_uf: "SP",
    municipio: "Santa Bárbara d'Oeste",
    valor: 28_500_000,
    valor_pago: 28_500_000,
    rp: "RP-6",
    categoria: "Modernização",
    finalidade: "Software e equipamentos · objeto vago",
    finalidade_score: 22,
    score: 81,
    tier: "crit",
    status: "pago",
    motivos: [
      { tipo: "danger", label: "Pagamento integral sem nota fiscal pública na CGU" },
      { tipo: "danger", label: "Cluster: 3º autor convergindo na mesma cidade em 12m" },
      { tipo: "warn",   label: "Categoria 'Modernização' historicamente abusada" },
    ],
  },
  {
    id: "EMD-2025-021004",
    titulo: "Apoio à infraestrutura de saúde",
    autor: "André Amaral Filho",
    autor_partido: "UNIÃO",
    autor_uf: "PB",
    municipio: "Registro",
    valor: 22_400_000,
    valor_pago: 4_800_000,
    rp: "RP-6",
    categoria: "Saúde",
    finalidade: "Equipamentos hospitalares · sem licitação publicada",
    finalidade_score: 28,
    score: 76,
    tier: "high",
    status: "em_execucao",
    motivos: [
      { tipo: "danger", label: "Mesmo autor da EMD crítica em SBO · padrão" },
      { tipo: "danger", label: "Volume 7x acima do esperado para Registro" },
      { tipo: "warn",   label: "Licitação não localizada na CGU" },
    ],
  },
  {
    id: "EMD-2025-009872",
    titulo: "Reforma de UBS em Itapeva",
    autor: "Tabata Amaral",
    autor_partido: "PSB",
    autor_uf: "SP",
    municipio: "Itapeva",
    valor: 18_600_000,
    valor_pago: 12_400_000,
    rp: "RP-6",
    categoria: "Saúde",
    finalidade: "Reforma de Unidade Básica de Saúde · projeto detalhado",
    finalidade_score: 72,
    score: 56,
    tier: "high",
    status: "em_execucao",
    motivos: [
      { tipo: "warn", label: "Volume acima do esperado · investigar" },
    ],
  },
  {
    id: "EMD-2025-011503",
    titulo: "Recuperação de estradas vicinais",
    autor: "José Oliveira Junior",
    autor_partido: "UNIÃO",
    autor_uf: "SP",
    municipio: "Presidente Prudente",
    valor: 8_900_000,
    valor_pago: 4_180_000,
    rp: "RP-6",
    categoria: "Infraestrutura",
    finalidade: "Pavimentação · trecho 14km · projeto técnico anexo",
    finalidade_score: 81,
    score: 28,
    tier: "ok",
    status: "em_execucao",
    motivos: [],
  },
  {
    id: "EMD-2024-088712",
    titulo: "Hospital Estadual de Ribeirão Preto · obra estrutural",
    autor: "Mara Gabrilli",
    autor_partido: "PSDB",
    autor_uf: "SP",
    municipio: "Ribeirão Preto",
    valor: 42_600_000,
    valor_pago: 41_800_000,
    rp: "RP-8",
    categoria: "Saúde",
    finalidade: "Construção de centro cirúrgico · projeto licitado",
    finalidade_score: 94,
    score: 12,
    tier: "ok",
    status: "pago",
    motivos: [],
  },
];

export const EMENDAS_ALERTAS = [
  { id: "AL-9821", sev: "crit", when: "Hoje · 09:14",  when_tag: "AGORA",
    titulo: "Nova emenda com score 92 detectada · SBO",
    desc: "EMD-2025-014729 · André Amaral (UNIÃO-PB) → Santa Bárbara d'Oeste · R$ 35M · finalidade vaga + autor sem ligação",
    channels: ["push", "email", "whatsapp"],
    target: "Pres Estadual + Tesoureiro Estadual",
    emenda: "EMD-2025-014729" },
  { id: "AL-9820", sev: "crit", when: "Hoje · 07:42",  when_tag: "AGORA",
    titulo: "Padrão coordenado detectado · 3 autores → mesma cidade",
    desc: "Cluster: Amaral (UNIÃO-PB) + Augusto (PL-SP) + Oliveira (UNIÃO-SP) → SBO · R$ 78.2M cumulativo em 12 meses",
    channels: ["push", "email", "whatsapp"],
    target: "Pres Estadual",
    emenda: null },
  { id: "AL-9815", sev: "high", when: "Ontem · 22:08", when_tag: "24h",
    titulo: "Emenda paga sem nota fiscal pública",
    desc: "EMD-2025-018221 · Capitão Augusto (PL-SP) → SBO · R$ 28.5M · pagamento integral sem comprovação na CGU",
    channels: ["push", "email"],
    target: "Pres Estadual + Pres Municipal SBO",
    emenda: "EMD-2025-018221" },
  { id: "AL-9810", sev: "high", when: "Ontem · 14:30", when_tag: "24h",
    titulo: "Emenda Registro · score 76",
    desc: "EMD-2025-021004 · André Amaral → Registro · R$ 22.4M · mesmo autor da EMD crítica em SBO",
    channels: ["push", "email"],
    target: "Pres Estadual",
    emenda: "EMD-2025-021004" },
  { id: "AL-9802", sev: "med", when: "23/04", when_tag: "semana",
    titulo: "Nova emenda regular · Itapeva",
    desc: "EMD-2025-009872 · Tabata Amaral → Itapeva · R$ 18.6M · Saúde · score 56",
    channels: ["inapp", "email-digest"],
    target: "Pres Municipal Itapeva",
    emenda: "EMD-2025-009872" },
  { id: "AL-9789", sev: "low", when: "21/04", when_tag: "semana",
    titulo: "Emenda paga · Hospital de Ribeirão",
    desc: "EMD-2024-088712 · pagamento final R$ 41.8M · obra estrutural",
    channels: ["inapp"],
    target: "Tesoureiro local",
    emenda: "EMD-2024-088712" },
];

/* ==========================================================
 * F4 ESTATUTÁRIO - Designer V1.2
 * ========================================================== */

export const DIRETORIOS_TREE = [
  { lvl: "nac", icon: "N",  nome: "UB · Direção Nacional",  total: "RAIZ" },
  { lvl: "est", icon: "SP", nome: "São Paulo",              total: "645", expanded: true },
  { lvl: "mun", icon: "SP", nome: "São Paulo (capital)",    total: "96",  active: true },
  { lvl: "mun", icon: "GR", nome: "Guarulhos",              total: "61"  },
  { lvl: "mun", icon: "CP", nome: "Campinas",               total: "52"  },
  { lvl: "mun", icon: "OS", nome: "Osasco",                 total: "38",  warn: true },
  { lvl: "est", icon: "RJ", nome: "Rio de Janeiro",         total: "312" },
  { lvl: "est", icon: "MG", nome: "Minas Gerais",           total: "418" },
  { lvl: "est", icon: "BA", nome: "Bahia",                  total: "387", warn: true },
  { lvl: "est", icon: "RS", nome: "Rio G. do Sul",          total: "324" },
  { lvl: "est", icon: "RO", nome: "Rondônia",               total: "28",  warn: true },
];

export const DIRETORIO_MESA = [
  { av: "ML", nome: "Milton Leite",       sub: "Vereador SP · OVR 78 · DEM/UB desde 1996",   role: "Pres.",  primary: true },
  { av: "CV", nome: "Carla Vieira",       sub: "Vice · ex-Subprefeita Pinheiros",            role: "Vice"   },
  { av: "RA", nome: "Rogério Almeida",    sub: "Tesoureiro · contador CRC-SP",                role: "Tes."   },
  { av: "PS", nome: "Patrícia Souza",     sub: "Sec. Geral · advogada · OAB-SP",              role: "Sec."   },
  { av: "JD", nome: "João Dias",          sub: "Sec. Adjunto · OVR 71",                       role: "Adj."   },
  { av: "MR", nome: "Marina Rocha",       sub: "Vogal · zona leste",                          role: "Vogal"  },
  { av: "EF", nome: "Eduardo Ferraz",     sub: "Vogal · zona sul",                            role: "Vogal"  },
];

export const DIRETORIO_COMISSOES = [
  { icon: "E",  nome: "Comissão Executiva",     ocupacao: "11 / 11", coord: "Milton Leite (ex-officio)" },
  { icon: "F",  nome: "Conselho Fiscal",        ocupacao: "3 / 3",   coord: "Rogério Almeida"          },
  { icon: "É",  nome: "Comissão de Ética",      ocupacao: "4 / 5",   coord: "Patrícia Souza", vaga: 1   },
  { icon: "JV", nome: "Juventude UB-SP",        ocupacao: "9 mem",   coord: "Vitória Reis · 23 anos"   },
  { icon: "MU", nome: "Mulheres UB-SP",         ocupacao: "12 mem",  coord: "Carla Vieira"             },
  { icon: "AF", nome: "Afro-UB SP",             ocupacao: "8 mem",   coord: "Jonas Nascimento"         },
  { icon: "CR", nome: "Comissão Eleitoral 2026", ocupacao: "7 mem", coord: "Patrícia Souza · pres."   },
];

export const DIRETORIO_DOCUMENTOS = [
  { ico: "PDF", nome: "Estatuto UB Nacional v3.2",       sub: "aprovado 12/03/2024",          status: "VIGENTE",         status_kind: "ok"   },
  { ico: "PDF", nome: "Ata Convenção Mun. SP 2024",      sub: "21/jul/2024 · 96 votos",       status: "REGISTRADA",      status_kind: "ok"   },
  { ico: "PDF", nome: "Resolução 04/2026 · Comissões",   sub: "vigência: 2026–2028",          status: "VIGENTE",         status_kind: "ok"   },
  { ico: "DOC", nome: "Reg. Interno Comissão Ética",     sub: "aguardando 2 assinaturas",     status: "DOCUSIGN PEND.",  status_kind: "warn" },
  { ico: "PDF", nome: "Procuração TSE · Pres. Mun.",     sub: "vencendo 30/jun/2026",         status: "RENOVAR",         status_kind: "warn" },
  { ico: "DOC", nome: "Ata Vacância · Comissão Ética",   sub: "renúncia · necessita reposição", status: "REPOR",         status_kind: "warn" },
];

/* ==========================================================
 * Saúde das Nominatas · 1:1 com Designer V1.2
 * Fonte: codigo/frontend/public/mockups/v1.2/F4-estatutario/07-saude-nominatas.data.js
 *
 * - 7 sub-medidas com pesos (paridade 16, faixa 10, vinculação 18,
 *   experiência 14, documental 18, ativação 12, histórico 12 = 100)
 * - 3 casos âncora calibrados pra validação do método:
 *   Bauru (87 saudável) · Marília (69 atenção) · Tatuí (30 crítica diligência aberta)
 * - 18 secundárias pra heatmap/ranking
 * - 6 alertas anti-fraude com linguagem NEUTRA ("padrão atípico", nunca "fraude")
 * - 6 regras configuradas
 * ========================================================== */

export const NOMINATA_SUBMEDIDAS = [
  { key: "paridade",    nm: "Paridade de gênero",      desc: "Cota mínima de 30% do gênero feminino, conforme Lei 9.504/97 art.10§3",                  peso: 16, short: "PARIDADE"     },
  { key: "faixa",       nm: "Distribuição etária",     desc: "Heterogeneidade da nominata em faixas etárias — evita concentração 50+",                 peso: 10, short: "FAIXA ETÁRIA" },
  { key: "vinculacao",  nm: "Vinculação territorial",  desc: "Candidatos com domicílio eleitoral e residência reais no município",                     peso: 18, short: "VINCULAÇÃO"   },
  { key: "experiencia", nm: "Experiência política",    desc: "Mistura entre nomes consolidados e renovação · evita lista totalmente novata",          peso: 14, short: "EXPERIÊNCIA"  },
  { key: "documental",  nm: "Conformidade documental", desc: "Filiação ≥ 6 meses, ficha limpa Lei Complementar 135/2010, prestação de contas TSE",     peso: 18, short: "CONFORMIDADE" },
  { key: "ativacao",    nm: "Ativação de base",        desc: "Filiados ativos × candidatos · ratio mínimo · presença em diretório",                    peso: 12, short: "ATIVAÇÃO"     },
  { key: "hist",        nm: "Histórico eleitoral",     desc: "Performance em pleitos anteriores · % votos candidato/coligação",                        peso: 12, short: "HISTÓRICO"    },
];

export const NOMINATA_COMISSOES = [
  {
    id: "bauru",
    nm: "Bauru",
    uf: "SP",
    pop: 379_146,
    area: "Centro-Oeste paulista",
    pres: { nm: "Suéllen Rosim", cargo: "Pres. Municipal UB · Bauru", av: "SR" },
    filiados: 4_287,
    candidatos: 18,
    mandato: "2024-2028",
    scores: { paridade: 92, faixa: 88, vinculacao: 95, experiencia: 78, documental: 96, ativacao: 84, hist: 71 },
    tier: "ok",
    flags: [],
    ult_atualizacao: "há 2h · cron Mazzel",
  },
  {
    id: "marilia",
    nm: "Marília",
    uf: "SP",
    pop: 240_590,
    area: "Centro-Oeste paulista",
    pres: { nm: "Daniel Alonso", cargo: "Pres. Municipal UB · Marília", av: "DA" },
    filiados: 2_104,
    candidatos: 16,
    mandato: "2024-2028",
    scores: { paridade: 62, faixa: 71, vinculacao: 88, experiencia: 65, documental: 70, ativacao: 58, hist: 62 },
    tier: "high",
    flags: [
      { tipo: "warn", label: "Cota de gênero abaixo do mínimo legal · 25% < 30%" },
      { tipo: "warn", label: "2 candidatos com pendência de Ficha Limpa em validação" },
      { tipo: "info", label: "Ativação de base 58/100 · ratio de 131 filiados por candidato" },
    ],
    ult_atualizacao: "há 2h · cron Mazzel",
  },
  {
    id: "tatui",
    nm: "Tatuí",
    uf: "SP",
    pop: 124_815,
    area: "Sudoeste paulista",
    pres: { nm: "Luiz Sales", cargo: "Pres. Municipal UB · Tatuí · diligência aberta", av: "LS" },
    filiados: 8_412,
    candidatos: 22,
    mandato: "2024-2028",
    scores: { paridade: 38, faixa: 42, vinculacao: 28, experiencia: 35, documental: 22, ativacao: 18, hist: 31 },
    tier: "crit",
    flags: [
      { tipo: "danger", label: "Pulso de filiação em massa · 412 novos filiados em 18/03/2025 (1 dia)" },
      { tipo: "danger", label: "9 candidatos sem domicílio eleitoral local · acima do limite estatutário" },
      { tipo: "danger", label: "4 candidatos com Ficha Limpa pendente · LC 135/2010" },
      { tipo: "danger", label: "Prestação de contas TSE 2024 · em mora há 4 meses" },
      { tipo: "warn",   label: "Cota de gênero 18% · muito abaixo do mínimo legal de 30%" },
      { tipo: "warn",   label: "6 candidatos com mesma origem geográfica externa (Sorocaba)" },
    ],
    ult_atualizacao: "há 17min · cron Mazzel · prioridade ALTA",
  },
];

export const NOMINATA_SECUNDARIAS = [
  { id: "sao-paulo",    nm: "São Paulo",            pop: 12_400_000, score: 81, tier: "ok",   x: 525, y: 460 },
  { id: "guarulhos",    nm: "Guarulhos",            pop: 1_400_000,  score: 78, tier: "ok",   x: 540, y: 450 },
  { id: "campinas",     nm: "Campinas",             pop: 1_223_000,  score: 84, tier: "ok",   x: 458, y: 440 },
  { id: "sao-jose",     nm: "São José dos Campos",  pop: 729_000,    score: 86, tier: "ok",   x: 580, y: 442 },
  { id: "sorocaba",     nm: "Sorocaba",             pop: 689_000,    score: 65, tier: "high", x: 460, y: 478 },
  { id: "ribeirao",     nm: "Ribeirão Preto",       pop: 720_000,    score: 80, tier: "ok",   x: 372, y: 358 },
  { id: "sbo",          nm: "Santa Bárbara d'Oeste", pop: 197_000,   score: 48, tier: "high", x: 442, y: 432 },
  { id: "santos",       nm: "Santos",               pop: 433_000,    score: 76, tier: "ok",   x: 530, y: 532 },
  { id: "osasco",       nm: "Osasco",               pop: 731_000,    score: 67, tier: "high", x: 510, y: 458 },
  { id: "piracicaba",   nm: "Piracicaba",           pop: 410_000,    score: 72, tier: "ok",   x: 432, y: 422 },
  { id: "aracatuba",    nm: "Araçatuba",            pop: 199_000,    score: 70, tier: "ok",   x: 215, y: 380 },
  { id: "pres-prud",    nm: "Pres. Prudente",       pop: 232_000,    score: 56, tier: "high", x: 175, y: 420 },
  { id: "sjrp",         nm: "S.J. Rio Preto",       pop: 480_000,    score: 73, tier: "ok",   x: 305, y: 348 },
  { id: "jundiai",      nm: "Jundiaí",              pop: 432_000,    score: 79, tier: "ok",   x: 488, y: 444 },
  { id: "limeira",      nm: "Limeira",              pop: 311_000,    score: 38, tier: "crit", x: 425, y: 408 },
  { id: "caraguatatuba", nm: "Caraguatatuba",       pop: 130_000,    score: 42, tier: "crit", x: 615, y: 488 },
  { id: "itapeva",      nm: "Itapeva",              pop: 93_000,     score: 58, tier: "high", x: 380, y: 510 },
  { id: "braganca",     nm: "Bragança Paulista",    pop: 167_000,    score: 81, tier: "ok",   x: 502, y: 422 },
];

export const NOMINATA_ALERTAS = [
  {
    id: "ALN-3829", sev: "crit",
    titulo: "Pulso de filiação atípico detectado",
    desc: "412 filiações registradas em 18/03/2025 (1 dia) na comissão Tatuí · 21× a média móvel histórica. Pode indicar mobilização legítima OU lista pré-fabricada. Investigar manualmente.",
    target: "Tatuí · UB-SP", comissao: "tatui",
    when: "há 17min", when_tag: "AGORA",
    channels: ["push", "email", "in-app"],
    logica: "Pulse > 5σ acima da média móvel de 90 dias",
  },
  {
    id: "ALN-3825", sev: "crit",
    titulo: "Concentração de origem geográfica na nominata",
    desc: "6 dos 22 candidatos de Tatuí têm domicílio eleitoral em Sorocaba (cidade vizinha). Padrão pode indicar transferência de eleitores. Estatuto art. 38 · validar.",
    target: "Tatuí · UB-SP", comissao: "tatui",
    when: "há 1h", when_tag: "AGORA",
    channels: ["push", "email", "whatsapp"],
    logica: "Cluster K-means de origem por chapa",
  },
  {
    id: "ALN-3820", sev: "crit",
    titulo: "Prestação de contas TSE em mora prolongada",
    desc: "Comissão Municipal Tatuí · prestação 2024 sem protocolo no TSE há 4 meses. Risco de indeferimento da nominata 2026. Notificar presidência.",
    target: "Tatuí · UB-SP", comissao: "tatui",
    when: "ontem 22:14", when_tag: "24h",
    channels: ["push", "email", "in-app"],
    logica: "Cron diário · cruza TSE × calendário estatutário",
  },
  {
    id: "ALN-3815", sev: "high",
    titulo: "Cota de gênero abaixo do mínimo legal",
    desc: "Marília · 25% mulheres na nominata · Lei 9.504/97 art.10§3 exige 30% mínimo. Risco jurídico de impugnação. Sugestão: 2 candidaturas femininas adicionais.",
    target: "Marília · UB-SP", comissao: "marilia",
    when: "há 6h", when_tag: "24h",
    channels: ["email", "in-app"],
    logica: "Validador legal por nominata",
  },
  {
    id: "ALN-3812", sev: "high",
    titulo: "Ficha Limpa pendente em candidatos",
    desc: "4 candidatos em Tatuí + 2 em Marília com pendências judiciais sob LC 135/2010. Validação manual obrigatória antes do registro de candidatura.",
    target: "Tatuí + Marília · UB-SP", comissao: "tatui",
    when: "há 8h", when_tag: "24h",
    channels: ["email", "in-app"],
    logica: "Cruzamento CNJ · TJ-SP · TRE",
  },
  {
    id: "ALN-3805", sev: "med",
    titulo: "Documentos estatutários vencendo · Limeira",
    desc: "Procuração e Ata de eleição da Comissão Municipal de Limeira vencem em 28 dias. Renovação automática via DocuSign disponível.",
    target: "Limeira · UB-SP", comissao: "limeira",
    when: "há 2 dias", when_tag: "semana",
    channels: ["in-app"],
    logica: "Cron semanal · janela de vencimento 30d",
  },
];

export const NOMINATA_REGRAS = [
  { nm: "Pulso de filiação > 5σ",       desc: "Detecta picos diários de filiação 5+ desvios padrão acima da média móvel 90d", sev: "crit", channels: ["push", "email"], freq: "tempo real" },
  { nm: "Cota de gênero < 30%",         desc: "Lei 9.504/97 art.10§3 · validador legal",                                       sev: "high", channels: ["email"],         freq: "a cada nominata" },
  { nm: "Ficha Limpa pendente",         desc: "Cruza CNJ + TJ + TRE com nominata · LC 135/2010",                              sev: "high", channels: ["email"],         freq: "diário" },
  { nm: "Prestação contas TSE em mora", desc: "Verifica protocolo TSE × calendário estatutário",                              sev: "crit", channels: ["push", "email"], freq: "diário" },
  { nm: "Concentração geográfica",      desc: "K-means de domicílio eleitoral por chapa · alerta cluster externo",            sev: "high", channels: ["email"],         freq: "a cada nominata" },
  { nm: "Documentos vencendo 30d",      desc: "Procuração, Ata, Estatuto local · renovação automática sugerida",              sev: "med",  channels: ["in-app"],        freq: "semanal" },
];

/* Tesouraria · KPIs + transações sample */
export const TESOURARIA_KPIS = [
  { l: "Saldo conta partidária",  v: "R$ 4.218.430", d: "30/04 · sincronizado",       ok: true  },
  { l: "Receita 30d",             v: "R$ 320.812",   d: "filiações + doações",         ok: true  },
  { l: "Despesas 30d",            v: "R$ 187.450",   d: "operações + estrutura",       ok: null  },
  { l: "Pendentes aprovação",     v: "8",            d: "R$ 184k aguardando",          ok: false },
];

export const TESOURARIA_TRANSACOES = [
  { id: "TES-2026-01428", data: "25/abr", tipo: "saida",  descricao: "Aluguel sede mun. SP · abril", valor: -8400,   categoria: "Estrutura",   status: "aprovado" },
  { id: "TES-2026-01427", data: "25/abr", tipo: "entrada", descricao: "Doação PJ · Construtora ABC",   valor: 35000,  categoria: "Doação",      status: "aprovado" },
  { id: "TES-2026-01426", data: "24/abr", tipo: "saida",  descricao: "OP-2026-014 · cabos abril",     valor: -38400, categoria: "Operações",   status: "aprovado" },
  { id: "TES-2026-01425", data: "24/abr", tipo: "entrada", descricao: "Filiações abril (847 novas)",   valor: 84700,  categoria: "Filiações",   status: "aprovado" },
  { id: "TES-2026-01424", data: "23/abr", tipo: "saida",  descricao: "Material gráfico · evento Cap. Redondo", valor: -12300, categoria: "Marketing", status: "pendente" },
  { id: "TES-2026-01423", data: "23/abr", tipo: "saida",  descricao: "Honorários jurídicos · Dra Helena", valor: -18000, categoria: "Jurídico", status: "pendente" },
];

/* Documentos - lista geral */
export const DOCUMENTOS_KPIS = [
  { l: "DocuSign Pendentes", v: "12", ok: false, kind: "warn" },
  { l: "Vigentes",           v: "19", ok: true                },
  { l: "Vencendo",           v: "3",  ok: false, kind: "warn" },
  { l: "Sigilosos",          v: "2",  ok: null               },
];

/* IDs + Convites · Discord-style.
 * Cada entidade tem ID curto. 5 modos de adicionar pessoas, wizard 3 passos.
 * Designer V1.2 06-ids-convites.html + briefing § 12. */

export const CONVITES_KPIS = [
  { l: "Convites pendentes", v: "23",  d: "aguardando aceite",         ok: null  },
  { l: "Aceitos 30d",        v: "147", d: "+34 vs mês anterior",       ok: true  },
  { l: "Recusados",          v: "8",   d: "histórico 30d",              ok: null  },
  { l: "IDs ativos",         v: "1.284", d: "todos os perfis",          ok: true  },
];

export const CONVITES_LIST = [
  { id: "CV-2026-0184", para: "Bruno Oliveira",  email: "bruno@email.com",   perfil: "Cabo Eleitoral",     escopo: "SP · Capão Redondo",   modo: "link",        status: "pendente",  enviado: "há 2 dias" },
  { id: "CV-2026-0183", para: "Marina Costa",    email: "marina@email.com",  perfil: "Coord. Territorial", escopo: "SP · Zona Sul",        modo: "cpf",         status: "pendente",  enviado: "há 4 dias" },
  { id: "CV-2026-0182", para: "Pedro Almeida",   email: "p.almeida@email.com", perfil: "Político Eleito",  escopo: "Mandato vereador SP",  modo: "designacao",  status: "aceito",    enviado: "há 6 dias" },
  { id: "CV-2026-0181", para: "Helena Mota",     email: "helena@email.com",  perfil: "Equipe Gabinete",    escopo: "Gabinete Milton",      modo: "filiado",     status: "recusado",  enviado: "há 8 dias" },
  { id: "CV-2026-0180", para: "André Carvalho",  email: "ac@email.com",      perfil: "Cabo Eleitoral",     escopo: "SP · Cidade Ademar",   modo: "link",        status: "aceito",    enviado: "há 12 dias" },
];

/* IDs Discord-style por entidade da plataforma (briefing § 12). */
export const CONVITES_ID_EXAMPLES = [
  { entidade: "Tenant (Partido)",          formato: "tenant:slug",            exemplo: "tenant:uniao-brasil",         icon: "🏛" },
  { entidade: "Diretório Nacional",         formato: "dir:tenant:nacional",    exemplo: "dir:ub:nacional",             icon: "🇧🇷" },
  { entidade: "Diretório Estadual",         formato: "dir:tenant:UF",          exemplo: "dir:ub:sp",                   icon: "📍" },
  { entidade: "Diretório Municipal",        formato: "dir:tenant:UF:cod",      exemplo: "dir:ub:sp:3550308",           icon: "🏢" },
  { entidade: "Cargo na Comissão",          formato: "cargo:dir:codigo",       exemplo: "cargo:dir:ub:sp:presidente",  icon: "👤" },
  { entidade: "Painel Pessoal Político",    formato: "pol:slug",                exemplo: "pol:milton-leite",            icon: "🎯" },
  { entidade: "Equipe de Gabinete",         formato: "gab:pol_id",              exemplo: "gab:milton-leite",            icon: "👥" },
  { entidade: "Operação",                   formato: "op:tenant:hash",          exemplo: "op:ub:abc123",                icon: "⚡" },
  { entidade: "Sala de Chat",               formato: "chat:contexto:hash",      exemplo: "chat:op:ub:abc123",           icon: "💬" },
];

/* 3 modos de adicionar pessoa (passo 1 do wizard). */
export const CONVITES_MODOS = [
  {
    k: "cpf",
    titulo: "Buscar pessoa",
    sub: "CPF, e-mail ou título de eleitor",
    desc: "Plataforma busca em filiados TSE + base interna. Se achar, atribui cargo direto. Se não achar, oferece convidar por e-mail.",
    icon: "🔍",
    placeholder: "CPF, e-mail ou título eleitoral",
  },
  {
    k: "link",
    titulo: "Gerar link",
    sub: "Discord-style · expiração configurável",
    desc: "Cria link convite tipo app.mazzelag.com/convite/dir:ub:sp:3550308?token=xyz · usa uma vez ou múltiplo · 24h / 7d / sem expiração.",
    icon: "🔗",
    placeholder: null,
  },
  {
    k: "filiado",
    titulo: "Designar filiado",
    sub: "Pessoa já cadastrada como filiado UB",
    desc: "Lista filiados ativos da região, selecione e atribua cargo. Cabo, Coord, Membro de comissão são designados assim.",
    icon: "👤",
    placeholder: null,
  },
];

/* Lista de perfis com permissões pré-explicadas (passo 2 do wizard). */
export const CONVITES_PERFIS = [
  { k: "cabo_eleitoral",     label: "Cabo Eleitoral",       group: "Operacional", perms: "Agenda do dia · Mapa da área · Chat · Comando de campo · Metas semana · Registro rápido", escopo_label: "Quadra / microterritório" },
  { k: "coord_territorial",  label: "Coord Territorial",    group: "Operacional", perms: "Operações do território · Cabos sob ele · Metas · Relatórios · Mapa território",        escopo_label: "Bairros / zonas" },
  { k: "coord_regional",     label: "Coord Regional",       group: "Operacional", perms: "Operações da região · Coords territoriais · Cabos · Metas · Mapa região",                escopo_label: "Conjunto de municípios" },
  { k: "membro_comissao",    label: "Membro de Comissão",    group: "Política",    perms: "Dashboard escopo (leitura) · Documentos públicos · Atas · Calendário",                   escopo_label: "Diretório do nível" },
  { k: "secretario_geral",   label: "Secretário-Geral",     group: "Política",    perms: "Documentos · Diretórios · Atas · Comunicação Interna · Calendário · Filiados",          escopo_label: "Nacional / Estadual / Municipal" },
  { k: "tesoureiro",         label: "Tesoureiro",            group: "Política",    perms: "Tesouraria · Prestação Contas TSE · Doações · Despesas · Patrimônio · Relatórios",      escopo_label: "Nacional / Estadual / Municipal" },
  { k: "vice_presidente",    label: "Vice-Presidente",       group: "Política",    perms: "Idêntico ao Presidente em leitura · Pode propor e executar designado",                   escopo_label: "Mesmo do Presidente" },
  { k: "chefe_gabinete",     label: "Chefe de Gabinete",     group: "Eletiva",     perms: "Quase total ao painel do político (exceto deletar conta) · Designa permissões dos demais", escopo_label: "Gabinete do político" },
  { k: "assessor_comunicacao", label: "Assessor de Comunicação", group: "Eletiva", perms: "Clipping · Mídia · Agenda Pública · Alimenta blocos MID do Overall",                    escopo_label: "Gabinete" },
  { k: "assessor_juridico",  label: "Assessor Jurídico",     group: "Eletiva",     perms: "Módulo Jurídico do dossiê · Alertas de processos · Documentos jurídicos",                escopo_label: "Gabinete" },
  { k: "assessor_articulacao", label: "Assessor de Articulação Política", group: "Eletiva", perms: "Alianças · Lideranças · Operações que o político recebe · Cenário Político",  escopo_label: "Gabinete" },
  { k: "outro_personalizado", label: "Outro / Personalizado", group: "Customizado", perms: "Permissões definidas manualmente pelo Chefe de Gabinete",                              escopo_label: "Configurável" },
];

export const EMENDAS_REGRAS = [
  { sev: "crit", nm: "Nova emenda · score > 70",          desc: "Dispara push + email + WhatsApp em tempo real para Pres Estadual e Tesoureiro Estadual.", channels: ["push","email","whatsapp"], freq: "Real-time · debounce 5min", enabled: true },
  { sev: "crit", nm: "Padrão coordenado detectado",       desc: "Cluster de ≥ 3 autores convergindo na mesma cidade em janela de 12 meses.",              channels: ["push","email","whatsapp"], freq: "Diário · 06h scan",         enabled: true },
  { sev: "high", nm: "Pago sem nota fiscal",              desc: "Emenda liquidada/paga sem nota fiscal vinculada na CGU em até 90 dias.",                 channels: ["push","email"],            freq: "Diário",                    enabled: true },
  { sev: "high", nm: "Atraso entre marcos > 6 meses",     desc: "Aprovada sem empenho ou liquidada sem pagamento por mais de 180 dias.",                  channels: ["push","email"],            freq: "Semanal",                   enabled: true },
  { sev: "med",  nm: "Nova emenda aprovada · normal",     desc: "Emendas com score ≤ 40 entram no digest diário do Pres Municipal correspondente.",      channels: ["inapp","email-digest"],    freq: "Digest 07h",                enabled: true },
  { sev: "low",  nm: "Atualização de status",             desc: "Mudanças de fase (paga, liquidada) sem anomalia. In-app apenas.",                       channels: ["inapp"],                   freq: "Tempo real",                enabled: true },
];

export const CHAT_MESSAGES = {
  p1: [
    { type: "date", val: "TER · 23 ABR" },
    { from: "JM", name: "João Mendes", when: "14:32", body: "Bom dia, Coord. Acabei de fechar o levantamento da Vila Andrade — 23 ruas mapeadas, identifiquei 7 lideranças latentes que nunca filiaram." },
    { from: "me", name: "Você",        when: "14:38", body: "Excelente, João. Pode mandar a planilha?" },
    { from: "JM", name: "João Mendes", when: "14:39", body: "Mandei agora. Importante: 3 dessas 7 lideranças têm dúvida — pediram pra ouvir Milton diretamente.", attach: { ico: "XLS", b: "mapeamento-vila-andrade.xlsx", s: "32 KB · 23 ruas · 7 lid." } },
    { type: "date", val: "HOJE · 25 ABR" },
    { type: "system", val: "✓ Documento aprovado pelo Pres. Mun. · Milton Leite" },
    { from: "me", name: "Você",        when: "08:41", body: "João, Milton confirma agenda dia 28 às 19h em Capão Redondo. Pode organizar local + encontro com as 7 lideranças?" },
    { from: "JM", name: "João Mendes", when: "09:14", body: "Beleza, mando o relatório das 23 ruas hoje à noite." },
  ],
  p2: [
    { type: "date", val: "HOJE · 25 ABR" },
    { type: "system", val: "👥 Rita Tavares adicionou Carla Diniz ao grupo" },
    { from: "RT", name: "Rita Tavares · Líder", when: "08:38", body: "Bom dia, equipe. Pequeno alinhamento: amanhã reunião 10h presencial no Diretório Municipal. Pauta: revisão Fase 4 + repactuação metas." },
    { from: "JM", name: "João Mendes",          when: "08:40", body: "Confirmado." },
    { from: "PS", name: "Paula Silva",          when: "08:41", body: "Confirmado." },
    { from: "RT", name: "Rita Tavares · Líder", when: "08:42", body: "Pessoal, reunião amanhã 10h confirmada?" },
  ],
  s1: [
    { type: "date", val: "HOJE · 25 ABR" },
    { type: "system", val: "🔒 Conversa criptografada · E2EE · Mensagens expiram em 24h · Print BLOQUEADO" },
    { type: "expired", val: "Mensagem auto-destruída · 09:01" },
    { from: "ML", name: "Milton Leite", when: "09:03", body: "Confidencial: o nome para a chapa de 2026 ainda é o Pedro? Recebi sondagem do PSD oferecendo migração e quero entender nosso plano B.", expire: 0.78 },
    { from: "me", name: "Você",         when: "09:04", body: "Confirmado o Pedro como nome principal. Plano B é Carla, mas ainda não está oficializada — só fala com você por enquanto.", expire: 0.85 },
    { from: "ML", name: "Milton Leite", when: "09:04", body: "Entendido. Faço a contraposta com PSD ainda hoje e travo a janela.", expire: 0.92 },
    { type: "expired", val: "Mensagem auto-destruída · 09:14" },
  ],
  x1: [
    { type: "date", val: "HOJE · 25 ABR" },
    { type: "system", val: "🚨 SOS aberto às 09:02 · Cabo Luiz Ribeiro · M'Boi Mirim · SP" },
    { from: "LR",  name: "Luiz Ribeiro · CABO", when: "09:03", body: "Coord, situação tensa aqui. Grupo de 4 caras chegou no comício, falando agressivo. Tô com Carla e Bruno comigo, mas tô desconfortável." },
    { from: "sys", name: "Sistema",             when: "09:03", body: "⚡ Escalada automática iniciada · Coord. Operação + Jurídico Local + Segurança · Notificados via push.", system: true },
    { from: "sys", name: "Sistema",             when: "09:04", body: "📍 Localização travada: M'Boi Mirim · R. Augusto Carlos, 120 · pin enviado pra todos os notificados.", system: true },
    { from: "sys", name: "Sistema",             when: "09:04", body: "👥 3 cabos mais próximos identificados: Paulo Silva (180m), Rita Tavares (340m), Maria Souza (520m). Notificados.", system: true },
    { from: "me",  name: "Você (Coord.)",       when: "09:05", body: "Luiz, fica calmo. Paulo está chegando em 2 min. Já chamei a PM — código preto. Não saia do local. Mantém o áudio gravando." },
    { from: "LR",  name: "Luiz Ribeiro · CABO", when: "09:06", body: "Ok. Eles já tão indo embora. Acho que viram o áudio gravando." },
    { from: "sys", name: "Sistema",             when: "09:07", body: "✓ PM acionada · viatura 12 a caminho · ETA 4 min", system: true },
    { from: "sys", name: "Sistema",             when: "09:08", body: "✓ Paulo Silva chegou ao local · cabo Luiz confirmou presença", system: true },
  ],
};
