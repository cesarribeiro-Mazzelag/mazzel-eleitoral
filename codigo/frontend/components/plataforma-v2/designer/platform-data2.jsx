/* Datasets para Lotes 2-4 */

/* ====== Módulo Estudo ====== */
const ESTUDO_TEMAS = [
  { id:"reforma-trib",  nome:"Reforma Tributária",          mencoes: 18420, sentimento: -12, trend: "+340%", cat:"Economia" },
  { id:"seguranca",     nome:"Segurança Pública",           mencoes: 14230, sentimento:  -8, trend: "+22%",  cat:"Social"   },
  { id:"marco-temporal",nome:"Marco Temporal",              mencoes: 12110, sentimento: -34, trend: "+180%", cat:"Judicial" },
  { id:"saude",         nome:"SUS · filas de cirurgia",     mencoes:  9820, sentimento: -18, trend: "+14%",  cat:"Social"   },
  { id:"educacao",      nome:"Escola sem partido",          mencoes:  8740, sentimento:   2, trend: "-6%",   cat:"Social"   },
  { id:"clima",         nome:"Seca Amazônia 2024",          mencoes:  7620, sentimento: -28, trend: "+62%",  cat:"Ambiente" },
  { id:"arcabouco",     nome:"Arcabouço fiscal",            mencoes:  6930, sentimento:  -6, trend: "+9%",   cat:"Economia" },
  { id:"eleicoes",      nome:"Eleições municipais 2024",    mencoes:  6430, sentimento:   8, trend: "-12%",  cat:"Política" },
];

const ESTUDO_CLUSTERS = [
  { lider:"Lula (PT)",                aliados: 312, alcance: "Nacional",  forca: 88, cor: "#E4142C" },
  { lider:"Bolsonaro (PL)",           aliados: 276, alcance: "Nacional",  forca: 85, cor: "#004F9F" },
  { lider:"Tarcísio (REPUBLICANOS)",  aliados: 124, alcance: "SP + SE",   forca: 78, cor: "#005FAF" },
  { lider:"Ratinho Jr (PSD)",         aliados:  98, alcance: "Sul + MT",  forca: 74, cor: "#FDB913" },
  { lider:"ACM Neto (UB)",            aliados:  72, alcance: "NE + BA",   forca: 68, cor: "#002A7B" },
];

const ESTUDO_ESTUDOS = [
  { titulo:"Perfil do eleitor indeciso · SE 2024",        autor:"Equipe pesquisa Mazzel",  data:"12 nov 2024", tipo:"Pesquisa",   paginas: 64 },
  { titulo:"Impacto da reforma tributária no Nordeste",   autor:"Eduardo Amaral (econ.)",  data:"03 nov 2024", tipo:"Análise",    paginas: 38 },
  { titulo:"Mapeamento de redes · Influência em X",       autor:"Social Lab MZ",           data:"28 out 2024", tipo:"Relatório",  paginas: 52 },
  { titulo:"Desempenho eleitoral UB 2022-2024",           autor:"Consultoria interna",     data:"14 out 2024", tipo:"Estudo",     paginas: 84 },
  { titulo:"Correlação emendas x votos · meta-análise",   autor:"J.P. Andrade (cientista)", data:"30 set 2024", tipo:"Paper",     paginas: 28 },
  { titulo:"Evangélicos e poder de voto · 2016-2024",     autor:"Equipe religião Mazzel",   data:"18 set 2024", tipo:"Estudo",    paginas: 46 },
];

/* ====== Portal do Cliente (candidato) ====== */
const PORTAL_AGENDA = [
  { h:"08:00", titulo:"Café com prefeitos · Feira de Santana",   local:"FSA/BA",     tipo:"Base", conf:"confirmado" },
  { h:"10:30", titulo:"Entrevista TV Bahia · Jornal Nacional",   local:"Salvador",   tipo:"Mídia", conf:"confirmado" },
  { h:"14:00", titulo:"Sessão CAS · votação MP 1.184",           local:"Brasília",   tipo:"Legislativo", conf:"pendente" },
  { h:"16:30", titulo:"Reunião bancada do Nordeste",             local:"Congresso",  tipo:"Articulação", conf:"confirmado" },
  { h:"19:00", titulo:"Jantar com empresários do Oeste",         local:"Barreiras",  tipo:"Base", conf:"confirmado" },
];

const PORTAL_METAS = [
  { m:"Emendas aprovadas 2024",     v:61, meta:80, unidade:"R$ M" },
  { m:"Base municipal ativa",       v:92, meta:95, unidade:"%"   },
  { m:"Discursos em plenário",      v:34, meta:40, unidade:""    },
  { m:"Menções positivas (mídia)",  v:68, meta:75, unidade:"%"   },
];

const PORTAL_EQUIPE = [
  { nome:"Ana Moura",       papel:"Chefia de gabinete",        local:"Brasília",   ativo:true  },
  { nome:"Rafael Tavares",  papel:"Assessor imprensa",         local:"Brasília",   ativo:true  },
  { nome:"Carla Pinheiro",  papel:"Articulação Congresso",     local:"Brasília",   ativo:false },
  { nome:"Pedro Vilaça",    papel:"Coordenador base BA",       local:"Salvador",   ativo:true  },
  { nome:"Júlia Neves",     papel:"Redes sociais",             local:"Salvador",   ativo:true  },
];

/* ====== Admin / White-Label ====== */
const ADMIN_USUARIOS = [
  { nome:"Paulo Guedes",        email:"paulo.g@unionbrasil.org.br", papel:"Presidente",   uf:"—",  status:"ativo",    mfa:true, last:"agora" },
  { nome:"Ana Carolina Silva",  email:"ana.c@unionbrasil.org.br",   papel:"Diretoria",    uf:"—",  status:"ativo",    mfa:true, last:"há 2min" },
  { nome:"Carlos Lima",         email:"carlos.l@unionbrasil.org.br",papel:"Delegado",     uf:"BA", status:"ativo",    mfa:true, last:"há 8min" },
  { nome:"Maria Fernanda T.",   email:"maria.t@unionbrasil.org.br", papel:"Diretoria",    uf:"—",  status:"ativo",    mfa:false,last:"há 22min" },
  { nome:"João Pedro Martins",  email:"joao.m@unionbrasil.org.br",  papel:"Analista",     uf:"—",  status:"ativo",    mfa:true, last:"há 34min" },
  { nome:"Jaques Wagner",       email:"jw@senado.leg.br",           papel:"Candidato",    uf:"BA", status:"ativo",    mfa:true, last:"há 1h" },
  { nome:"Flávia Cunha",        email:"flavia.c@unionbrasil.org.br",papel:"Delegado",     uf:"RJ", status:"pendente", mfa:false,last:"nunca" },
  { nome:"Ricardo Amaral",      email:"ricardo.a@unionbrasil.org.br",papel:"Analista",    uf:"—",  status:"suspenso", mfa:true, last:"há 4d"  },
];

const ADMIN_PAPEIS = [
  { papel:"Presidente",  qtd:1,  desc:"Acesso total · admin irrestrito",                   perm:["Tudo"] },
  { papel:"Diretoria",   qtd:8,  desc:"Leitura/escrita em todos os módulos, sem admin",     perm:["Home","Mapa","Radar","Dossiê","Estudo","Delegados","Filiados","IA","Alertas"] },
  { papel:"Delegado",    qtd:27, desc:"Gestão da própria UF · visibilidade nacional limitada", perm:["Home","Mapa (própria UF)","Filiados (própria UF)","Alertas"] },
  { papel:"Analista",    qtd:14, desc:"Leitura ampla, sem exportação em massa",             perm:["Home","Radar","Estudo","Dossiê (leitura)"] },
  { papel:"Candidato",   qtd:1247,desc:"Portal próprio · dados individuais apenas",         perm:["Portal do Cliente","Dossiê próprio","IA"] },
];

const ADMIN_AUDIT = [
  { quando:"14:23", quem:"Ana Carolina Silva", acao:"LOGIN",          obj:"Plataforma",                ip:"177.42.12.8" },
  { quando:"14:12", quem:"Carlos Lima (BA)",   acao:"EXPORT",         obj:"relatório emendas 2024",    ip:"200.12.4.15" },
  { quando:"14:04", quem:"Sistema",            acao:"SYNC_TSE",       obj:"48.312 registros",          ip:"—"          },
  { quando:"13:48", quem:"João Pedro Martins", acao:"VIEW_DOSSIE",    obj:"Jaques Wagner",             ip:"187.33.9.2" },
  { quando:"13:22", quem:"Paulo Guedes",       acao:"ROLE_CHANGE",    obj:"Ricardo Amaral → suspenso", ip:"191.4.11.7" },
  { quando:"13:05", quem:"Maria Fernanda T.",  acao:"COMMENT",        obj:"alerta #a2",                ip:"177.42.12.91" },
  { quando:"12:40", quem:"Ana Carolina Silva", acao:"EXPORT",         obj:"Top 100 overall · CSV",     ip:"177.42.12.8" },
];

/* ====== Delegados ====== */
const DELEGADOS_LIST = [
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

/* ====== Filiados ====== */
const FILIADOS_UF = UF_LIST.map((uf, i) => ({
  uf,
  total: 1000 + ((uf.charCodeAt(0) + uf.charCodeAt(1) + i * 13) * 31) % 50000,
  novos30d: 50 + (uf.charCodeAt(0) * 7) % 2400,
  baixas30d: 10 + (uf.charCodeAt(1) * 3) % 800,
})).sort((a,b) => b.total - a.total);

const FILIADOS_TOTAL = FILIADOS_UF.reduce((s, u) => s + u.total, 0);
const FILIADOS_NOVOS_30 = FILIADOS_UF.reduce((s, u) => s + u.novos30d, 0);

const FILIADOS_FAIXA_IDADE = [
  { faixa:"16-24", v: 8 },
  { faixa:"25-34", v: 18 },
  { faixa:"35-44", v: 24 },
  { faixa:"45-54", v: 22 },
  { faixa:"55-64", v: 16 },
  { faixa:"65+",   v: 12 },
];

/* ====== IA Chat ====== */
const IA_SUGESTOES = [
  { titulo:"Quais senadores UB têm maior risco eleitoral em 2026?",       icon:"Target"   },
  { titulo:"Resumir posicionamento do partido sobre reforma tributária",  icon:"Sparkles" },
  { titulo:"Comparar desempenho de emendas entre Bahia e Pernambuco",     icon:"BarChart3"},
  { titulo:"Identificar municípios com maior potencial de crescimento",   icon:"MapPin"   },
  { titulo:"Gerar dossiê executivo · Jaques Wagner (1 página)",            icon:"FileSearch"},
  { titulo:"Analisar cobertura de mídia da última semana",                 icon:"Sparkles" },
];

const IA_CONVERSA = [
  {
    role:"user",
    msg:"Quais alertas críticos nas últimas 24h exigem ação da diretoria?",
    t:"14:22",
  },
  {
    role:"assistant",
    msg:"Identifiquei 3 alertas críticos que recomendam ação imediata:",
    citations: [
      { ref:"CEAF",  texto:"Pablo Marçal (PRTB-SP) · nova ação inscrita no CEAF · 12min atrás" },
      { ref:"STF",   texto:"Ex-Gov. Roberto Rocha (UB-MA) · denúncia recebida pelo STF, relator Gilmar Mendes · 4h atrás" },
      { ref:"TCU",   texto:"Dep. Marcelo Queiroga (PL-PB) · TCE aberto em R$ 2,8M · 2h atrás" },
    ],
    followup: "Recomendo priorizar o caso do STF — envolve ex-governador filiado à UB e a notícia já foi capturada por Folha e CNN. Quer que eu gere rascunho de nota oficial?",
    t:"14:22",
  },
];

/* ====== Alertas (Central) ====== */
const ALERTAS_DIA = [
  { id:1, sev:"crit", hora:"14:22", tipo:"Judicial", titulo:"Nova ação CEAF · Pablo Marçal",      fonte:"Conjur",          uf:"SP" },
  { id:2, sev:"alto", hora:"13:44", tipo:"Mídia",    titulo:"Folha: Flávio Bolsonaro em CPI",     fonte:"Folha de S.Paulo",uf:"RJ" },
  { id:3, sev:"med",  hora:"13:02", tipo:"Emenda",   titulo:"CGU cancelou emenda Júlia Rocha",     fonte:"CGU",             uf:"MG" },
  { id:4, sev:"med",  hora:"12:31", tipo:"Processo", titulo:"TCU · TCE aberto · R$ 2,8M",          fonte:"TCU",             uf:"PB" },
  { id:5, sev:"bx",   hora:"11:48", tipo:"Filiação", titulo:"150 novos filiados BA em 14 cidades", fonte:"Sistema interno", uf:"BA" },
  { id:6, sev:"crit", hora:"10:17", tipo:"Processo", titulo:"STF: denúncia Roberto Rocha",         fonte:"STF",             uf:"MA" },
  { id:7, sev:"alto", hora:"09:44", tipo:"Redes",    titulo:"Pico menções negativas H.Costa +340%",fonte:"X Analytics",     uf:"PE" },
  { id:8, sev:"med",  hora:"09:05", tipo:"Mídia",    titulo:"CNN: entrevista Wanderlei Barbosa",   fonte:"CNN Brasil",      uf:"TO" },
  { id:9, sev:"bx",   hora:"08:32", tipo:"Legislativo", titulo:"PL 4320/2024 aprovada Senado",    fonte:"Senado",          uf:"—" },
  { id:10,sev:"crit", hora:"08:01", tipo:"Mídia",    titulo:"Estadão · investigação bancada PP",  fonte:"Estadão",         uf:"—" },
];

const ALERTAS_CATS = [
  { cat:"Judicial",     qtd: 14, cor:"#f87171" },
  { cat:"Mídia",        qtd: 42, cor:"#60a5fa" },
  { cat:"Emenda",       qtd:  8, cor:"#fbbf24" },
  { cat:"Processo",     qtd: 11, cor:"#fb923c" },
  { cat:"Redes",        qtd: 28, cor:"#a78bfa" },
  { cat:"Filiação",     qtd: 19, cor:"#34d399" },
  { cat:"Legislativo",  qtd: 16, cor:"#93c5fd" },
];

Object.assign(window, {
  ESTUDO_TEMAS, ESTUDO_CLUSTERS, ESTUDO_ESTUDOS,
  PORTAL_AGENDA, PORTAL_METAS, PORTAL_EQUIPE,
  ADMIN_USUARIOS, ADMIN_PAPEIS, ADMIN_AUDIT,
  DELEGADOS_LIST, FILIADOS_UF, FILIADOS_TOTAL, FILIADOS_NOVOS_30, FILIADOS_FAIXA_IDADE,
  IA_SUGESTOES, IA_CONVERSA,
  ALERTAS_DIA, ALERTAS_CATS,
});
