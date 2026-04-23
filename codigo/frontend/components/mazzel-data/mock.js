/* Dados mock para rotas /mazzel-preview - portados de platform-data.jsx e platform-data2.jsx */

// ── Party colors ──────────────────────────────────────────────────────────────

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

export function partyColor(p) {
  return PARTY_COLORS[String(p || "").toUpperCase()] || "#6B7280";
}

// ── UF data ───────────────────────────────────────────────────────────────────

export const UF_LIST = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export const PARTY_STRENGTH = {
  SP: "PL", RJ: "PL", MG: "UNIÃO BRASIL", BA: "PT", RS: "PL", PR: "PL",
  CE: "PT", PE: "PSB", SC: "PL", GO: "UNIÃO BRASIL", PA: "MDB", MA: "PT",
  PB: "PSB", ES: "UNIÃO BRASIL", MT: "UNIÃO BRASIL", MS: "PSDB", DF: "UNIÃO BRASIL",
  PI: "PT", AL: "UNIÃO BRASIL", SE: "PSD", RN: "PT", AM: "UNIÃO BRASIL",
  AC: "UNIÃO BRASIL", RO: "UNIÃO BRASIL", RR: "UNIÃO BRASIL", AP: "MDB", TO: "UNIÃO BRASIL",
};

export const UF_NAMES = {
  AC:"Acre", AL:"Alagoas", AM:"Amazonas", AP:"Amapá", BA:"Bahia", CE:"Ceará",
  DF:"Distrito Federal", ES:"Espírito Santo", GO:"Goiás", MA:"Maranhão",
  MG:"Minas Gerais", MS:"Mato Grosso do Sul", MT:"Mato Grosso", PA:"Pará",
  PB:"Paraíba", PE:"Pernambuco", PI:"Piauí", PR:"Paraná", RJ:"Rio de Janeiro",
  RN:"Rio Grande do Norte", RO:"Rondônia", RR:"Roraima", RS:"Rio Grande do Sul",
  SC:"Santa Catarina", SE:"Sergipe", SP:"São Paulo", TO:"Tocantins",
};

// ── Tenants ───────────────────────────────────────────────────────────────────

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

// ── KPIs Home ─────────────────────────────────────────────────────────────────

export const HOME_KPIS = {
  presidente: [
    { k: "Eleitos União Brasil",    v: "1.247",  hint: "59 senadores + dep fed/est + prefeitos", trend: "+2,4%", ok: true },
    { k: "Candidatos monitorados",  v: "51.384", hint: "base TSE cruzada",                       trend: "+312",  ok: true },
    { k: "Alertas críticos 24h",    v: "12",     hint: "exige atenção imediata",                 trend: "+3",    ok: false },
    { k: "Score regional médio",    v: "73,8",   hint: "0-100 · agregado nacional",              trend: "+1,2",  ok: true },
  ],
  diretoria: [
    { k: "Eleitos União Brasil",    v: "1.247",  hint: "59 senadores + dep fed/est + prefeitos", trend: "+2,4%", ok: true },
    { k: "Candidatos monitorados",  v: "51.384", hint: "base TSE cruzada",                       trend: "+312",  ok: true },
    { k: "Alertas críticos 24h",    v: "12",     hint: "exige atenção imediata",                 trend: "+3",    ok: false },
    { k: "Score regional médio",    v: "73,8",   hint: "0-100 · agregado nacional",              trend: "+1,2",  ok: true },
  ],
  candidato: [
    { k: "Meu Overall",             v: "87",     hint: "Top 12% entre senadores",                trend: "+3",    ok: true },
    { k: "Emendas executadas",      v: "R$ 42M", hint: "2024 · R$ 61M aprovado",                 trend: "+18%",  ok: true },
    { k: "Alertas ativos",          v: "0",      hint: "Ficha limpa",                            trend: "-",     ok: true },
    { k: "Sua base na UF",          v: "92%",    hint: "capilaridade dos municípios",            trend: "+1pp",  ok: true },
  ],
};

export const HOME_ALERTS = [
  { id:"a1", sev:"crit", tipo:"Judicial", who:"Pablo Marçal",           uf:"SP", what:"Nova ação inscrita no CEAF", when:"há 12min" },
  { id:"a2", sev:"alto", tipo:"Mídia",    who:"Sen. Flávio Bolsonaro",   uf:"RJ", what:"Cobertura negativa em Folha", when:"há 40min" },
  { id:"a3", sev:"med",  tipo:"Emenda",   who:"Dep. Júlia Rocha",        uf:"MG", what:"Emenda cancelada pela CGU",   when:"há 1h" },
  { id:"a4", sev:"med",  tipo:"Processo", who:"Dep. Marcelo Queiroga",   uf:"PB", what:"TCU abriu TCE em valor de R$ 2,8M", when:"há 2h" },
  { id:"a5", sev:"bx",   tipo:"Filiação", who:"150 novos filiados",      uf:"BA", what:"Registrados em 14 cidades",    when:"há 3h" },
  { id:"a6", sev:"crit", tipo:"Processo", who:"Ex-Gov. Roberto Rocha",   uf:"MA", what:"STF recebeu denúncia — relator min. Gilmar Mendes", when:"há 4h" },
  { id:"a7", sev:"alto", tipo:"Redes",    who:"Sen. Humberto Costa",     uf:"PE", what:"Pico de menções negativas (+340%)", when:"há 5h" },
  { id:"a8", sev:"med",  tipo:"Mídia",    who:"Gov. Wanderlei Barbosa",  uf:"TO", what:"Entrevista exclusiva no CNN Brasil", when:"há 6h" },
];

export const HOME_TOP_CANDIDATOS = [
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

export const HOME_EMENDAS_UF = [
  { uf:"MG", v:"R$ 184M" }, { uf:"SP", v:"R$ 172M" }, { uf:"BA", v:"R$ 156M" }, { uf:"RJ", v:"R$ 134M" },
  { uf:"PE", v:"R$ 108M" }, { uf:"RS", v:"R$ 92M"  }, { uf:"CE", v:"R$ 84M"  }, { uf:"PR", v:"R$ 80M"  },
];

export const HOME_MOV_DIA = [
  { hora:"14:23", evento:"Nova filiação em massa", detail:"14 prefeitos do RN migraram para UB" },
  { hora:"12:08", evento:"Convenção partidária",   detail:"Homologação Fed. MG · 1.240 delegados" },
  { hora:"10:44", evento:"Emenda liberada",        detail:"R$ 8,4M · Sen. Efraim Filho · PB" },
  { hora:"09:17", evento:"Sanção",                 detail:"TCU aplicou multa R$ 320k a Dep. L.Silva" },
  { hora:"08:02", evento:"Alteração de cargo",     detail:"Elmar Nascimento reeleito líder Câmara" },
];

export const HOME_AUDIT = [
  { who:"Ana Carolina (Diretoria)", what:"visualizou dossiê — Jaques Wagner",          when:"há 2min" },
  { who:"Carlos Lima (Delegado BA)", what:"exportou relatório emendas · 2024",          when:"há 8min" },
  { who:"Sistema",                   what:"sincronizou TSE · 48.312 registros atualizados", when:"há 14min" },
  { who:"Maria Fernanda (Diretoria)", what:"comentou em alerta #a2 (Flávio Bolsonaro)",  when:"há 22min" },
  { who:"João Pedro (Presidente)",   what:"alterou permissão de 3 usuários",             when:"há 34min" },
];

// ── Radar candidatos ──────────────────────────────────────────────────────────

export const RADAR_CANDIDATOS = [
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
  { id:23, nome:"Astronauta Pontes",   partido:"PL",           uf:"SP", cargo:"SEN",  overall:71, tier:"bronze",  traits:["ESTREANTE"],              pac:58, pres:74, inf:62, leg:56, bse:68, mid:80 },
  { id:24, nome:"Pablo Marçal",        partido:"PRTB",         uf:"SP", cargo:"-",    overall:38, tier:"bronze",  traits:["ESTREANTE"],              pac:18, pres:12, inf:22, leg:4,  bse:68, mid:96 },
];

export const TRAIT_LABEL = {
  FENOMENO:"Fenômeno", FERA_REG:"Fera regional", CAMPEAO:"Campeão",
  LEGEND:"Lenda", COMEBACK:"Comeback", ESTREANTE:"Estreante",
};

// ── Módulo Estudo ─────────────────────────────────────────────────────────────

export const ESTUDO_TEMAS = [
  { id:"reforma-trib",   nome:"Reforma Tributária",          mencoes: 18420, sentimento: -12, trend: "+340%", cat:"Economia" },
  { id:"seguranca",      nome:"Segurança Pública",           mencoes: 14230, sentimento:  -8, trend: "+22%",  cat:"Social"   },
  { id:"marco-temporal", nome:"Marco Temporal",              mencoes: 12110, sentimento: -34, trend: "+180%", cat:"Judicial" },
  { id:"saude",          nome:"SUS · filas de cirurgia",     mencoes:  9820, sentimento: -18, trend: "+14%",  cat:"Social"   },
  { id:"educacao",       nome:"Escola sem partido",          mencoes:  8740, sentimento:   2, trend: "-6%",   cat:"Social"   },
  { id:"clima",          nome:"Seca Amazônia 2024",          mencoes:  7620, sentimento: -28, trend: "+62%",  cat:"Ambiente" },
  { id:"arcabouco",      nome:"Arcabouço fiscal",            mencoes:  6930, sentimento:  -6, trend: "+9%",   cat:"Economia" },
  { id:"eleicoes",       nome:"Eleições municipais 2024",    mencoes:  6430, sentimento:   8, trend: "-12%",  cat:"Política" },
];

export const ESTUDO_CLUSTERS = [
  { lider:"Lula (PT)",                aliados: 312, alcance: "Nacional",  forca: 88, cor: "#E4142C" },
  { lider:"Bolsonaro (PL)",           aliados: 276, alcance: "Nacional",  forca: 85, cor: "#004F9F" },
  { lider:"Tarcísio (REPUBLICANOS)",  aliados: 124, alcance: "SP + SE",   forca: 78, cor: "#005FAF" },
  { lider:"Ratinho Jr (PSD)",         aliados:  98, alcance: "Sul + MT",  forca: 74, cor: "#FDB913" },
  { lider:"ACM Neto (UB)",            aliados:  72, alcance: "NE + BA",   forca: 68, cor: "#002A7B" },
];

export const ESTUDO_ESTUDOS = [
  { titulo:"Perfil do eleitor indeciso · SE 2024",        autor:"Equipe pesquisa Mazzel",  data:"12 nov 2024", tipo:"Pesquisa",   paginas: 64 },
  { titulo:"Impacto da reforma tributária no Nordeste",   autor:"Eduardo Amaral (econ.)",  data:"03 nov 2024", tipo:"Análise",    paginas: 38 },
  { titulo:"Mapeamento de redes · Influência em X",       autor:"Social Lab MZ",           data:"28 out 2024", tipo:"Relatório",  paginas: 52 },
  { titulo:"Desempenho eleitoral UB 2022-2024",           autor:"Consultoria interna",     data:"14 out 2024", tipo:"Estudo",     paginas: 84 },
  { titulo:"Correlação emendas x votos · meta-análise",   autor:"J.P. Andrade",            data:"30 set 2024", tipo:"Paper",      paginas: 28 },
  { titulo:"Evangélicos e poder de voto · 2016-2024",     autor:"Equipe religião Mazzel",  data:"18 set 2024", tipo:"Estudo",     paginas: 46 },
];

// ── Portal do Cliente ─────────────────────────────────────────────────────────

export const PORTAL_AGENDA = [
  { h:"08:00", titulo:"Café com prefeitos · Feira de Santana",   local:"FSA/BA",     tipo:"Base",        conf:"confirmado" },
  { h:"10:30", titulo:"Entrevista TV Bahia · Jornal Nacional",   local:"Salvador",   tipo:"Mídia",       conf:"confirmado" },
  { h:"14:00", titulo:"Sessão CAS · votação MP 1.184",           local:"Brasília",   tipo:"Legislativo", conf:"pendente" },
  { h:"16:30", titulo:"Reunião bancada do Nordeste",             local:"Congresso",  tipo:"Articulação", conf:"confirmado" },
  { h:"19:00", titulo:"Jantar com empresários do Oeste",         local:"Barreiras",  tipo:"Base",        conf:"confirmado" },
];

export const PORTAL_METAS = [
  { m:"Emendas aprovadas 2024",     v:61, meta:80, unidade:"R$ M" },
  { m:"Base municipal ativa",       v:92, meta:95, unidade:"%"    },
  { m:"Discursos em plenário",      v:34, meta:40, unidade:""     },
  { m:"Menções positivas (mídia)",  v:68, meta:75, unidade:"%"    },
];

export const PORTAL_EQUIPE = [
  { nome:"Ana Moura",       papel:"Chefia de gabinete",        local:"Brasília",   ativo:true  },
  { nome:"Rafael Tavares",  papel:"Assessor imprensa",         local:"Brasília",   ativo:true  },
  { nome:"Carla Pinheiro",  papel:"Articulação Congresso",     local:"Brasília",   ativo:false },
  { nome:"Pedro Vilaça",    papel:"Coordenador base BA",       local:"Salvador",   ativo:true  },
  { nome:"Júlia Neves",     papel:"Redes sociais",             local:"Salvador",   ativo:true  },
];

// ── Admin / White-Label ───────────────────────────────────────────────────────

export const ADMIN_USUARIOS = [
  { nome:"Paulo Guedes",        email:"paulo.g@unionbrasil.org.br", papel:"Presidente",   uf:"-",  status:"ativo",    mfa:true,  last:"agora" },
  { nome:"Ana Carolina Silva",  email:"ana.c@unionbrasil.org.br",   papel:"Diretoria",    uf:"-",  status:"ativo",    mfa:true,  last:"há 2min" },
  { nome:"Carlos Lima",         email:"carlos.l@unionbrasil.org.br",papel:"Delegado",     uf:"BA", status:"ativo",    mfa:true,  last:"há 8min" },
  { nome:"Maria Fernanda T.",   email:"maria.t@unionbrasil.org.br", papel:"Diretoria",    uf:"-",  status:"ativo",    mfa:false, last:"há 22min" },
  { nome:"João Pedro Martins",  email:"joao.m@unionbrasil.org.br",  papel:"Analista",     uf:"-",  status:"ativo",    mfa:true,  last:"há 34min" },
  { nome:"Jaques Wagner",       email:"jw@senado.leg.br",           papel:"Candidato",    uf:"BA", status:"ativo",    mfa:true,  last:"há 1h" },
  { nome:"Flávia Cunha",        email:"flavia.c@unionbrasil.org.br",papel:"Delegado",     uf:"RJ", status:"pendente", mfa:false, last:"nunca" },
  { nome:"Ricardo Amaral",      email:"ricardo.a@unionbrasil.org.br",papel:"Analista",    uf:"-",  status:"suspenso", mfa:true,  last:"há 4d" },
];

export const ADMIN_PAPEIS = [
  { papel:"Presidente",  qtd:1,    desc:"Acesso total · admin irrestrito",                   perm:["Tudo"] },
  { papel:"Diretoria",   qtd:8,    desc:"Leitura/escrita em todos os módulos, sem admin",     perm:["Home","Mapa","Radar","Dossiê","Estudo","Delegados","Filiados","IA","Alertas"] },
  { papel:"Delegado",    qtd:27,   desc:"Gestão da própria UF · visibilidade nacional limitada", perm:["Home","Mapa (própria UF)","Filiados (própria UF)","Alertas"] },
  { papel:"Analista",    qtd:14,   desc:"Leitura ampla, sem exportação em massa",             perm:["Home","Radar","Estudo","Dossiê (leitura)"] },
  { papel:"Candidato",   qtd:1247, desc:"Portal próprio · dados individuais apenas",         perm:["Portal do Cliente","Dossiê próprio","IA"] },
];

export const ADMIN_AUDIT = [
  { quando:"14:23", quem:"Ana Carolina Silva", acao:"LOGIN",       obj:"Plataforma",                ip:"177.42.12.8" },
  { quando:"14:12", quem:"Carlos Lima (BA)",   acao:"EXPORT",      obj:"relatório emendas 2024",    ip:"200.12.4.15" },
  { quando:"14:04", quem:"Sistema",            acao:"SYNC_TSE",    obj:"48.312 registros",          ip:"-"          },
  { quando:"13:48", quem:"João Pedro Martins", acao:"VIEW_DOSSIE", obj:"Jaques Wagner",             ip:"187.33.9.2" },
  { quando:"13:22", quem:"Paulo Guedes",       acao:"ROLE_CHANGE", obj:"Ricardo Amaral - suspenso", ip:"191.4.11.7" },
  { quando:"13:05", quem:"Maria Fernanda T.",  acao:"COMMENT",     obj:"alerta #a2",                ip:"177.42.12.91" },
  { quando:"12:40", quem:"Ana Carolina Silva", acao:"EXPORT",      obj:"Top 100 overall · CSV",     ip:"177.42.12.8" },
];

// ── Delegados ─────────────────────────────────────────────────────────────────

export const DELEGADOS_LIST = [
  { nome:"Carlos Lima",         uf:"BA", cidades: 417, filiados: 28400, perf: 92, status: "top" },
  { nome:"Flávia Cunha",        uf:"RJ", cidades:  92, filiados: 22100, perf: 88, status: "top" },
  { nome:"Rodrigo Paiva",       uf:"MG", cidades: 853, filiados: 41200, perf: 86, status: "top" },
  { nome:"Eduardo Amaral",      uf:"SP", cidades: 645, filiados: 52800, perf: 84, status: "ok"  },
  { nome:"Lúcia Nascimento",    uf:"PE", cidades: 185, filiados: 18900, perf: 78, status: "ok"  },
  { nome:"Marcelo Tavares",     uf:"CE", cidades: 184, filiados: 17200, perf: 76, status: "ok"  },
  { nome:"Fernanda Castro",     uf:"RS", cidades: 497, filiados: 14600, perf: 72, status: "ok"  },
  { nome:"Ricardo Brandão",     uf:"PR", cidades: 399, filiados: 13800, perf: 70, status: "ok"  },
  { nome:"Júlia Menezes",       uf:"GO", cidades: 246, filiados:  9200, perf: 64, status: "at"  },
  { nome:"Paulo Ribeiro",       uf:"ES", cidades:  78, filiados:  6100, perf: 58, status: "at"  },
  { nome:"Antônio Farias",      uf:"MA", cidades: 217, filiados:  5400, perf: 52, status: "baixo" },
  { nome:"Beatriz Aguiar",      uf:"PB", cidades: 223, filiados:  4900, perf: 48, status: "baixo" },
];

// ── Filiados ──────────────────────────────────────────────────────────────────

function buildFiliadosUf() {
  return UF_LIST.map((uf, i) => ({
    uf,
    total: 1000 + ((uf.charCodeAt(0) + uf.charCodeAt(1) + i * 13) * 31) % 50000,
    novos30d: 50 + (uf.charCodeAt(0) * 7) % 2400,
    baixas30d: 10 + (uf.charCodeAt(1) * 3) % 800,
  })).sort((a, b) => b.total - a.total);
}

export const FILIADOS_UF = buildFiliadosUf();
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

// ── IA Chat ───────────────────────────────────────────────────────────────────

export const IA_SUGESTOES = [
  { titulo:"Quais senadores UB têm maior risco eleitoral em 2026?",      icon:"Target"    },
  { titulo:"Resumir posicionamento do partido sobre reforma tributária",  icon:"Sparkles"  },
  { titulo:"Comparar desempenho de emendas entre Bahia e Pernambuco",    icon:"BarChart3" },
  { titulo:"Identificar municípios com maior potencial de crescimento",  icon:"MapPin"    },
  { titulo:"Gerar dossiê executivo · Jaques Wagner (1 página)",           icon:"FileSearch"},
  { titulo:"Analisar cobertura de mídia da última semana",                icon:"Sparkles"  },
];

export const IA_CONVERSA = [
  {
    role: "user",
    msg: "Quais alertas críticos nas últimas 24h exigem ação da diretoria?",
    t: "14:22",
  },
  {
    role: "assistant",
    msg: "Identifiquei 3 alertas críticos que recomendam ação imediata:",
    citations: [
      { ref:"CEAF", texto:"Pablo Marçal (PRTB-SP) · nova ação inscrita no CEAF · 12min atrás" },
      { ref:"STF",  texto:"Ex-Gov. Roberto Rocha (UB-MA) · denúncia recebida pelo STF, relator Gilmar Mendes · 4h atrás" },
      { ref:"TCU",  texto:"Dep. Marcelo Queiroga (PL-PB) · TCE aberto em R$ 2,8M · 2h atrás" },
    ],
    followup: "Recomendo priorizar o caso do STF — envolve ex-governador filiado à UB e a notícia já foi capturada por Folha e CNN. Quer que eu gere rascunho de nota oficial?",
    t: "14:22",
  },
];

// ── Alertas ───────────────────────────────────────────────────────────────────

export const ALERTAS_DIA = [
  { id:1,  sev:"crit", hora:"14:22", tipo:"Judicial",    titulo:"Nova ação CEAF · Pablo Marçal",      fonte:"Conjur",           uf:"SP" },
  { id:2,  sev:"alto", hora:"13:44", tipo:"Mídia",       titulo:"Folha: Flávio Bolsonaro em CPI",     fonte:"Folha de S.Paulo", uf:"RJ" },
  { id:3,  sev:"med",  hora:"13:02", tipo:"Emenda",      titulo:"CGU cancelou emenda Júlia Rocha",     fonte:"CGU",              uf:"MG" },
  { id:4,  sev:"med",  hora:"12:31", tipo:"Processo",    titulo:"TCU · TCE aberto · R$ 2,8M",          fonte:"TCU",              uf:"PB" },
  { id:5,  sev:"bx",   hora:"11:48", tipo:"Filiação",    titulo:"150 novos filiados BA em 14 cidades", fonte:"Sistema interno",  uf:"BA" },
  { id:6,  sev:"crit", hora:"10:17", tipo:"Processo",    titulo:"STF: denúncia Roberto Rocha",         fonte:"STF",              uf:"MA" },
  { id:7,  sev:"alto", hora:"09:44", tipo:"Redes",       titulo:"Pico menções negativas H.Costa +340%",fonte:"X Analytics",      uf:"PE" },
  { id:8,  sev:"med",  hora:"09:05", tipo:"Mídia",       titulo:"CNN: entrevista Wanderlei Barbosa",   fonte:"CNN Brasil",       uf:"TO" },
  { id:9,  sev:"bx",   hora:"08:32", tipo:"Legislativo", titulo:"PL 4320/2024 aprovada Senado",        fonte:"Senado",           uf:"-"  },
  { id:10, sev:"crit", hora:"08:01", tipo:"Mídia",       titulo:"Estadão · investigação bancada PP",   fonte:"Estadão",          uf:"-"  },
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

// ── SVG Brazil states ─────────────────────────────────────────────────────────

export const BRASIL_STATES = [
  { uf: "AC", cx: 96,  cy: 240, path: "M60,220 L130,215 L135,260 L80,265 Z" },
  { uf: "AM", cx: 230, cy: 200, path: "M140,150 L330,150 L335,250 L140,255 Z" },
  { uf: "RR", cx: 280, cy: 110, path: "M230,80 L320,85 L325,145 L235,145 Z" },
  { uf: "AP", cx: 390, cy: 115, path: "M355,85 L425,90 L430,145 L360,145 Z" },
  { uf: "PA", cx: 400, cy: 210, path: "M340,150 L465,150 L465,265 L345,260 Z" },
  { uf: "RO", cx: 165, cy: 290, path: "M140,265 L230,265 L230,320 L140,320 Z" },
  { uf: "MT", cx: 305, cy: 305, path: "M235,265 L390,265 L395,355 L240,355 Z" },
  { uf: "MS", cx: 330, cy: 390, path: "M275,360 L395,360 L400,445 L280,445 Z" },
  { uf: "TO", cx: 430, cy: 290, path: "M400,265 L470,265 L475,340 L405,340 Z" },
  { uf: "MA", cx: 490, cy: 205, path: "M470,150 L545,155 L550,255 L475,260 Z" },
  { uf: "PI", cx: 515, cy: 250, path: "M490,200 L555,200 L560,295 L495,295 Z" },
  { uf: "CE", cx: 560, cy: 195, path: "M540,155 L615,160 L620,225 L545,225 Z" },
  { uf: "RN", cx: 620, cy: 205, path: "M600,170 L660,175 L665,220 L605,220 Z" },
  { uf: "PB", cx: 635, cy: 235, path: "M595,220 L670,225 L670,255 L600,255 Z" },
  { uf: "PE", cx: 605, cy: 260, path: "M555,250 L670,255 L670,285 L560,285 Z" },
  { uf: "AL", cx: 635, cy: 290, path: "M600,285 L665,288 L665,310 L605,310 Z" },
  { uf: "SE", cx: 615, cy: 315, path: "M585,308 L645,310 L645,335 L590,335 Z" },
  { uf: "BA", cx: 525, cy: 310, path: "M460,265 L590,270 L595,365 L465,365 Z" },
  { uf: "GO", cx: 410, cy: 360, path: "M385,340 L460,340 L465,410 L390,410 Z" },
  { uf: "DF", cx: 450, cy: 350, path: "M440,340 L470,340 L470,360 L440,360 Z" },
  { uf: "MG", cx: 475, cy: 400, path: "M395,365 L575,370 L580,445 L400,445 Z" },
  { uf: "ES", cx: 555, cy: 420, path: "M535,395 L590,395 L590,445 L540,445 Z" },
  { uf: "RJ", cx: 510, cy: 455, path: "M470,440 L560,440 L560,475 L475,475 Z" },
  { uf: "SP", cx: 425, cy: 450, path: "M330,430 L470,430 L475,480 L335,480 Z" },
  { uf: "PR", cx: 380, cy: 490, path: "M310,475 L445,475 L445,510 L315,510 Z" },
  { uf: "SC", cx: 375, cy: 525, path: "M315,510 L430,510 L430,545 L320,545 Z" },
  { uf: "RS", cx: 340, cy: 570, path: "M265,545 L410,545 L415,610 L270,610 Z" },
];
