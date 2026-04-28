/* Cartinha 4:5 · DATA LAYER (1:1 com Designer V1.2)
 * Fonte: public/mockups/v1.2/F2-nucleo/02-cartinha-2v.html
 *
 * "Componente viral do produto - vira screenshot, vira meme, vira
 *  'compartilhe seu OVR'. Proporção 4:5 (320×400px) por compatibilidade
 *  com Instagram/Stories." - Designer
 *
 * Decisão César 25/04: NÃO inventar score; quando dado falta,
 * mostra "EM CONSTRUÇÃO" - nunca "0".
 */

// 4 exemplares canônicos (1 por tier S/A/B + 1 placeholder "em construção")
export const DEMOS_CANONICOS = [
  {
    id: "tarcisio",
    nome: "Tarcísio",
    sobrenome: "de Freitas",
    cargo: "Governador · SP",
    uf: "SP",
    partido: "Republicanos",
    mandatoLabel: "1º mandato",
    iniciais: "TF",
    ovr: 96,
    tier: "S",
    delta: "+2.1",
    deltaUnit: "12,8M votos",
    stats: { Lid: 96, Mid: 94, Bas: 98, Cap: 95 },
    label: "Tier S · elite/governador",
  },
  {
    id: "wagner",
    nome: "Jaques",
    sobrenome: "Wagner",
    cargo: "Senador · BA",
    uf: "BA",
    partido: "PT",
    mandatoLabel: "3º mandato",
    iniciais: "JW",
    ovr: 87,
    tier: "A",
    delta: "+0.8",
    deltaUnit: "3º mandato",
    stats: { Lid: 88, Mid: 82, Bas: 90, Cap: 86 },
    label: "Tier A · senador veterano",
  },
  {
    id: "milton",
    nome: "Milton",
    sobrenome: "Leite",
    cargo: "Pres Estadual · SP",
    uf: "SP",
    partido: "UB",
    mandatoLabel: "Vereador 7×",
    iniciais: "ML",
    ovr: 78,
    tier: "B",
    delta: "−0.3",
    deltaUnit: "Vereador 7×",
    stats: { Lid: 82, Mid: 71, Bas: 84, Cap: 76 },
    label: "Tier B · cargo partidário",
  },
  {
    id: "rotunno",
    nome: "Alessandro",
    sobrenome: "Rotunno",
    cargo: "Vereador · Itaquaquecetuba",
    uf: "SP",
    partido: "UB",
    mandatoLabel: "1º mandato",
    iniciais: "AR",
    ovr: null, // EM CONSTRUÇÃO - decisão César 25/04
    tier: null,
    delta: "Score em curadoria",
    deltaUnit: null,
    stats: { Lid: null, Mid: null, Bas: null, Cap: null },
    label: "Em construção · fallback (decisão César)",
  },
];

// Bancada SP · 12 eleitos para Mosaico de uso real
export const BANCADA_SP = [
  { nome: "Tarcísio de Freitas",  cargo: "Gov · SP",                ini: "TF", ovr: 96,  tier: "S", delta: "+2.1" },
  { nome: "Jaques Wagner",        cargo: "Sen · BA",                ini: "JW", ovr: 87,  tier: "A", delta: "+0.8" },
  { nome: "Eduardo Suplicy",      cargo: "Vereador · SP",           ini: "ES", ovr: 85,  tier: "A", delta: "+0.3" },
  { nome: "Carla Morando",        cargo: "Dep Fed · SP",            ini: "CM", ovr: 81,  tier: "A", delta: "−0.4" },
  { nome: "Coronel Telhada",      cargo: "Dep Est · SP",            ini: "CT", ovr: 79,  tier: "B", delta: "+1.2" },
  { nome: "Milton Leite",         cargo: "Pres Est · SP",           ini: "ML", ovr: 78,  tier: "B", delta: "−0.3" },
  { nome: "Bruno Covas Filho",    cargo: "Pres Mun · Capital",      ini: "BC", ovr: 76,  tier: "B", delta: "+2.1" },
  { nome: "Roberto Lima",         cargo: "Pres Mun · Campinas",     ini: "RL", ovr: 73,  tier: "B", delta: "+0.8" },
  { nome: "Priscila Gama",        cargo: "Pres Mun · Santos",       ini: "PG", ovr: 71,  tier: "B", delta: "+1.4" },
  { nome: "Carlos Mendes",        cargo: "Vereador · S.B.Campo",    ini: "CM", ovr: 65,  tier: "C", delta: "−1.1" },
  { nome: "Alessandro Rotunno",   cargo: "Vereador · Itaquá",       ini: "AR", ovr: null,tier: null,delta: "··"   },
  { nome: "Felipe Macedo",        cargo: "Pres Mun · Guarulhos",    ini: "FM", ovr: null,tier: null,delta: "··"   },
];

// Tier tokens · 5 cores
export const TIER_COLORS = {
  S: "#FFCC00", // amarelo UB
  A: "#16a34a", // verde
  B: "#003399", // azul UB
  C: "#f59e0b", // laranja
  D: "#dc2626", // vermelho
};

export function tierFromOvr(ovr) {
  if (ovr == null) return null;
  if (ovr >= 90) return "S";
  if (ovr >= 80) return "A";
  if (ovr >= 70) return "B";
  if (ovr >= 60) return "C";
  return "D";
}
