/* Dossie 8 Cargos · DATA LAYER (1:1 com Designer V1.2)
 * Fonte: public/mockups/v1.2/F2-nucleo/03-dossie-8cargos.html
 *
 * Motor único <Dossie role={...} /> renderiza todas as 15 seções,
 * mas a config do cargo marca cada uma como priority/hidden/placeholder.
 *
 * Decisão César 25/04: nunca mostrar "0" - quando dado falta, "EM CONSTRUÇÃO".
 */

// 15 seções canônicas (a engine sempre conhece todas)
export const SECTIONS = [
  { id: "cenario",  num: "01", title: "Cenário Político" },
  { id: "mapa",     num: "02", title: "Mapa Eleitoral" },
  { id: "trajeto",  num: "03", title: "Trajetória" },
  { id: "leg",      num: "04", title: "Atividade Legislativa" },
  { id: "comiss",   num: "05", title: "Comissões" },
  { id: "votos",    num: "06", title: "Pesquisas & Votações" },
  { id: "atos",     num: "07", title: "Atos Executivos" },
  { id: "aliancas", num: "08", title: "Alianças" },
  { id: "midia",    num: "09", title: "Mídia & Clipping" },
  { id: "jur",      num: "10", title: "Alertas Jurídicos" },
  { id: "fin",      num: "11", title: "Financeiro" },
  { id: "emendas",  num: "12", title: "Emendas" },
  { id: "partido",  num: "13", title: "Atuação Partidária" },
  { id: "base",     num: "14", title: "Base Territorial" },
  { id: "ia",       num: "15", title: "IA Estratégica" },
];

// 9 cargos canônicos (8 cargos + fallback)
export const ROLES = [
  {
    id: "gov", pillNum: "01", pill: "Governador",
    nome: "Tarcísio de Freitas", iniciais: "TF",
    role: "Governador · São Paulo",
    metas: ["1º mandato", "Republicanos", "eleito 2022 · 55,3% 2º turno"],
    ovr: 96, tier: "S",
    eyebrow: "Cargo Executivo · Estadual",
    desc: "Foco em Atos Executivos (decretos, programas) e Mapa Eleitoral consolidado SP. Atividade Legislativa é apenas vetos/sanções (mostrada como leve).",
    priority: ["atos", "mapa", "cenario", "aliancas", "midia"],
    hidden: ["leg", "comiss"],
    placeholder: ["emendas"],
  },
  {
    id: "sen", pillNum: "02", pill: "Senador",
    nome: "Jaques Wagner", iniciais: "JW",
    role: "Senador · Bahia",
    metas: ["3º mandato", "PT", "eleito 2018 · 4,8M votos"],
    ovr: 87, tier: "A",
    eyebrow: "Cargo Eletivo · Federal · Senado",
    desc: "Foco em Atividade Legislativa, Comissões, Alianças. Atos Executivos não se aplica. Base Territorial é estado inteiro (BA).",
    priority: ["leg", "comiss", "votos", "aliancas", "mapa"],
    hidden: ["atos"],
    placeholder: [],
  },
  {
    id: "depfed", pillNum: "03", pill: "Dep. Federal",
    nome: "Carla Morando", iniciais: "CM",
    role: "Dep. Federal · São Paulo",
    metas: ["2º mandato", "PSDB", "eleita 2022 · 187k votos"],
    ovr: 81, tier: "A",
    eyebrow: "Cargo Eletivo · Federal · Câmara",
    desc: "Câmara: legislativo + comissões + emendas individuais. Mapa Eleitoral mostra distritos onde teve mais votos.",
    priority: ["leg", "comiss", "emendas", "mapa", "midia"],
    hidden: ["atos"],
    placeholder: [],
  },
  {
    id: "depest", pillNum: "04", pill: "Dep. Estadual",
    nome: "Cel. Telhada", iniciais: "CT",
    role: "Dep. Estadual · São Paulo",
    metas: ["1º mandato", "PP", "eleito 2022 · 154k votos"],
    ovr: 79, tier: "B",
    eyebrow: "Cargo Eletivo · Estadual · ALESP",
    desc: "Foco em ALESP: legislativo estadual, comissões, emendas estaduais. Sem federal stuff.",
    priority: ["leg", "comiss", "emendas", "mapa", "base"],
    hidden: ["atos"],
    placeholder: [],
  },
  {
    id: "pref", pillNum: "05", pill: "Prefeito",
    nome: "Bruno Covas Filho", iniciais: "BC",
    role: "Prefeito · São Paulo · Capital",
    metas: ["1º mandato", "UB", "eleito 2024 · 47% 1º turno"],
    ovr: 94, tier: "S",
    eyebrow: "Cargo Executivo · Municipal",
    desc: "Atos Executivos municipais + base territorial detalhada. Mapa Eleitoral por bairro (não por município).",
    priority: ["atos", "mapa", "base", "partido", "midia"],
    hidden: ["leg", "comiss"],
    placeholder: ["fin"],
  },
  {
    id: "ver", pillNum: "06", pill: "Vereador",
    nome: "Alessandro Rotunno", iniciais: "AR",
    role: "Vereador · Itaquaquecetuba",
    metas: ["1º mandato", "UB", "eleito 2024 · 4.302 votos"],
    ovr: 65, tier: "C",
    eyebrow: "Cargo Eletivo · Municipal",
    desc: "Câmara Municipal: proposições por área temática + base hiperlocal (bairro). Pesquisas oficiais raramente existem.",
    priority: ["leg", "base", "mapa", "partido", "midia"],
    hidden: ["atos", "emendas"],
    placeholder: ["votos"],
  },
  {
    id: "nao", pillNum: "07", pill: "Não Eleito (Partido)",
    nome: "Milton Leite", iniciais: "ML",
    role: "Pres. Estadual · UB · São Paulo",
    metas: ["Vereador 7×", "UB", "cargo partidário · não-eletivo"],
    ovr: 78, tier: "B",
    eyebrow: "Camada 2 · Política Partidária",
    desc: "Sem mandato vigente. Foco em trajetória, atuação partidária e influência. Mostra Cartinha mas com 'ex-mandato' como atributo principal.",
    priority: ["trajeto", "partido", "aliancas", "cenario", "midia"],
    hidden: ["leg", "comiss", "votos", "atos", "emendas"],
    placeholder: [],
  },
  {
    id: "min", pillNum: "08", pill: "Ministro",
    nome: "Celso Sabino", iniciais: "CS",
    role: "Ministro do Turismo · UB",
    metas: ["no cargo desde 2023", "UB", "ex-Dep Federal PA"],
    ovr: 84, tier: "A",
    eyebrow: "Cargo Executivo · Federal",
    desc: "Híbrido: tem mandato federal (suspenso pelo cargo) + comanda pasta. Foca em atos administrativos da pasta + trajetória.",
    priority: ["atos", "trajeto", "midia", "aliancas", "partido"],
    hidden: ["leg", "comiss", "votos", "emendas"],
    placeholder: [],
  },
  {
    id: "fall", pillNum: "⚠", pill: "Fallback (sem dado)",
    nome: "Filiado Não Catalogado", iniciais: "··",
    role: "Vereador · Município de Pequeno Porte",
    metas: ["dado não disponível", "UB", "—"],
    ovr: null, tier: "—",
    eyebrow: "Em Construção",
    desc: "Político sem dado catalogado. Toda a interface se transforma em placeholders sóbrios - nunca mostra '0', nunca inventa dado.",
    priority: [],
    hidden: [],
    placeholder: SECTIONS.map((s) => s.id),
  },
];

// Mapa Eleitoral · contexto por cargo (substituirá grid abstrato anterior)
export const MAP_CTX = {
  gov:    { ctx: "UF: SP · 645 mun.",                title: "Performance por município", sub: "645 municípios · São Paulo",     cargo: "Governador",      shape: "sp" },
  sen:    { ctx: "UF: BA · 417 mun.",                title: "Performance por município", sub: "417 municípios · Bahia",         cargo: "Senador",         shape: "ba" },
  depfed: { ctx: "UF: SP · zonas eleitorais",        title: "Distritos com mais votos",  sub: "Distribuição estadual SP",       cargo: "Dep. Federal",    shape: "sp" },
  depest: { ctx: "UF: SP · ALESP",                   title: "Distritos ALESP",           sub: "Distribuição estadual SP",       cargo: "Dep. Estadual",   shape: "sp" },
  pref:   { ctx: "Mun: São Paulo · 32 distritos",    title: "Performance por bairro",    sub: "96 distritos · capital SP",      cargo: "Prefeito",        shape: "capital" },
  ver:    { ctx: "Mun: Itaquaquecetuba · 14 bairros", title: "Performance por bairro",   sub: "Itaquaquecetuba (mun. interior)", cargo: "Vereador",       shape: "mun" },
  nao:    { ctx: "UF: SP · perspectiva partido",     title: "Cobertura territorial UB",  sub: "645 municípios · presença UB",   cargo: "Pres. Estadual",  shape: "sp" },
  min:    { ctx: "Brasil · pasta Turismo",           title: "Programas por região",      sub: "Investimentos federais Turismo", cargo: "Ministro",        shape: "br" },
  _default:{ ctx: "Brasil · 5.570 mun.",             title: "Performance nacional",      sub: "Visão Brasil completo",          cargo: "—",               shape: "br" },
};

// Polígonos esquemáticos (path SVG) por contexto - substituirá grid abstrato
// Designer: "este placeholder valida o LAYOUT - o componente real (MapaEleitoral.tsx
// 3.196 linhas) renderiza polígonos vetoriais reais via MapLibre"
export const MAP_SHAPES = {
  br: [
    { d: "M40,30 L90,20 L140,30 L160,55 L130,70 L60,75 L30,55 Z",  label: "N",  hot: 0.25 },
    { d: "M140,30 L200,30 L220,60 L180,80 L160,55 Z",              label: "NE", hot: 0.35 },
    { d: "M60,75 L130,70 L160,55 L180,80 L150,110 L80,110 Z",      label: "CO", hot: 0.55 },
    { d: "M80,110 L150,110 L165,135 L100,140 Z",                   label: "SE", hot: 0.85 },
    { d: "M100,140 L165,135 L150,170 L90,170 Z",                   label: "S",  hot: 0.65 },
  ],
  sp: [
    { d: "M30,80 L70,60 L110,55 L150,65 L160,90 L120,110 L60,110 Z",       label: "Oeste",   hot: 0.55 },
    { d: "M110,55 L150,65 L195,55 L220,75 L200,95 L160,90 Z",              label: "Norte",   hot: 0.62 },
    { d: "M160,90 L200,95 L230,115 L210,140 L160,140 L130,115 Z",          label: "Capital", hot: 0.92 },
    { d: "M60,110 L120,110 L130,115 L160,140 L120,160 L80,150 Z",          label: "Sul",     hot: 0.45 },
    { d: "M210,140 L240,150 L235,175 L195,170 L160,140 Z",                 label: "Litoral", hot: 0.72 },
  ],
  ba: [
    { d: "M30,40 L80,25 L120,40 L130,70 L80,85 L40,75 Z",                  label: "Oeste",  hot: 0.42 },
    { d: "M120,40 L170,30 L210,55 L200,85 L150,90 L130,70 Z",              label: "Norte",  hot: 0.55 },
    { d: "M40,75 L80,85 L130,70 L150,90 L130,130 L70,125 Z",               label: "Centro", hot: 0.78 },
    { d: "M130,130 L150,90 L200,85 L230,120 L210,160 L160,170 L130,150 Z", label: "Sul",    hot: 0.88 },
    { d: "M210,160 L235,165 L240,180 L210,180 Z",                          label: "Litoral",hot: 0.95 },
  ],
  capital: [
    { d: "M50,40 L120,30 L180,45 L195,75 L130,80 L60,75 Z",                label: "Norte",  hot: 0.55 },
    { d: "M195,75 L230,90 L230,135 L195,140 L160,110 Z",                   label: "Leste",  hot: 0.42 },
    { d: "M60,75 L130,80 L160,110 L150,150 L90,160 L40,130 Z",             label: "Centro", hot: 0.92 },
    { d: "M150,150 L195,140 L230,135 L240,170 L200,180 L160,180 Z",        label: "Sul",    hot: 0.78 },
    { d: "M40,130 L90,160 L150,150 L160,180 L100,180 L30,160 Z",           label: "Oeste",  hot: 0.62 },
  ],
  mun: [
    { d: "M40,50 L90,40 L140,55 L130,90 L70,90 L40,75 Z",                  label: "Centro", hot: 0.88 },
    { d: "M140,55 L200,45 L240,70 L220,100 L170,95 L130,90 Z",             label: "Norte",  hot: 0.55 },
    { d: "M40,75 L70,90 L130,90 L120,140 L70,150 L30,130 Z",               label: "Oeste",  hot: 0.42 },
    { d: "M130,90 L170,95 L220,100 L210,140 L150,150 L120,140 Z",          label: "Leste",  hot: 0.65 },
    { d: "M120,140 L150,150 L210,140 L195,180 L130,180 L80,170 Z",         label: "Sul",    hot: 0.78 },
  ],
};

export const HEAT_PALETTE = ["#1e3a8a", "#1d4ed8", "#2563eb", "#f59e0b", "#fb923c", "#dc2626"];

export function heatColor(v) {
  const idx = Math.min(HEAT_PALETTE.length - 1, Math.floor(v * HEAT_PALETTE.length));
  return HEAT_PALETTE[idx];
}
