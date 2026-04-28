/* Mapa Estratégico · DATA LAYER
 *
 * Fontes canônicas:
 *   - 3 Modos pré-config: [[Decisao - SGIP3 TSE Fonte Canonica de Nominatas]]
 *     + sessão Cérebro 27/04 ponto 4
 *   - 5 camadas individuais (modo Avançado): plataforma.html linhas 1226-1232
 *   - DATA por UF (pres, scores, mandatos): mockup Designer V1.2
 *     01-mapa-estrategico.html linhas 738-802
 */

// Os 3 Modos pré-configurados respondem a UMA pergunta executiva cada.
// Default ao abrir = Saúde Operacional (visão "como está minha operação").
// Modo Avançado expõe as 5 camadas individuais pra tesoureiro/sec-geral.
export const MODOS = [
  {
    id: "saude",
    titulo: "Saúde Operacional",
    pergunta: "Onde o partido está vivo, e onde está morto?",
    camadas: "Score Nominatas (cor) + densidade de cabos",
    accent: "#34d399",
  },
  {
    id: "dinheiro",
    titulo: "Fluxo de Dinheiro",
    pergunta: "Pra onde o dinheiro está indo?",
    camadas: "Heat map Emendas (cor) + autores principais",
    accent: "#FFCC00",
  },
  {
    id: "compliance",
    titulo: "Compliance",
    pergunta: "Onde tenho problema?",
    camadas: "Cruzamento: nominata fraca + emendas altas = vermelho crítico",
    accent: "#dc2626",
    critico: true,
  },
];

// 5 camadas individuais do Modo Avançado · canon do plataforma.html linhas 1226-1232
export const CAMADAS_AVANCADAS = [
  { id: "partido",  label: "Partido dominante" },
  { id: "score",    label: "Score regional" },
  { id: "eleitos",  label: "Eleitos UB" },
  { id: "emendas",  label: "Emendas R$" },
  { id: "alertas",  label: "Densidade alertas" },
];

export const ANOS = ["2026 (proj.)", "2024", "2022", "2020", "2018"];

// Dados sintéticos por UF · 1:1 com 01-mapa-estrategico.html linhas 774-802
// (cobertura, score Pres Estadual, filiados, mandatos, %votos UB, eventos, alertas)
export const UF_DATA = {
  SP: { cob: 78, score: 78, fil: 124847, mand: 147, votosUB: 38, vencedor: 1, pres: "Milton Leite",  presOvr: 78, alertas: 7, eventos: 12, lid: 28, risco: "media" },
  RJ: { cob: 65, score: 71, fil: 78421,  mand: 89,  votosUB: 32, vencedor: 0, pres: "Pedro Cunha",   presOvr: 71, alertas: 4, eventos: 8,  lid: 18, risco: "media" },
  MG: { cob: 71, score: 75, fil: 98330,  mand: 124, votosUB: 41, vencedor: 1, pres: "Carla Bessa",   presOvr: 75, alertas: 3, eventos: 14, lid: 22, risco: "baixa" },
  RS: { cob: 58, score: 68, fil: 67250,  mand: 76,  votosUB: 28, vencedor: 0, pres: "A. Steffen",    presOvr: 68, alertas: 2, eventos: 5,  lid: 12, risco: "baixa" },
  BA: { cob: 82, score: 84, fil: 101480, mand: 138, votosUB: 47, vencedor: 1, pres: "J. Wagner",     presOvr: 87, alertas: 1, eventos: 18, lid: 31, risco: "baixa" },
  CE: { cob: 74, score: 78, fil: 71300,  mand: 88,  votosUB: 36, vencedor: 1, pres: "P. Bezerra",    presOvr: 78, alertas: 2, eventos: 9,  lid: 19, risco: "baixa" },
  PR: { cob: 62, score: 70, fil: 72100,  mand: 94,  votosUB: 31, vencedor: 0, pres: "L. Albuquerque",presOvr: 70, alertas: 5, eventos: 6,  lid: 15, risco: "media" },
  PE: { cob: 68, score: 72, fil: 64800,  mand: 78,  votosUB: 33, vencedor: 1, pres: "M. Souza",      presOvr: 72, alertas: 3, eventos: 11, lid: 17, risco: "baixa" },
  GO: { cob: 60, score: 65, fil: 47210,  mand: 56,  votosUB: 26, vencedor: 0, pres: "F. Andrade",    presOvr: 65, alertas: 4, eventos: 7,  lid: 11, risco: "media" },
  PA: { cob: 55, score: 62, fil: 38900,  mand: 51,  votosUB: 22, vencedor: 0, pres: "C. Sabino",     presOvr: 84, alertas: 2, eventos: 5,  lid: 9,  risco: "baixa" },
  AM: { cob: 41, score: 56, fil: 22340,  mand: 28,  votosUB: 18, vencedor: 0, pres: "R. Lima",       presOvr: 56, alertas: 6, eventos: 3,  lid: 6,  risco: "alta"  },
  MA: { cob: 52, score: 64, fil: 41250,  mand: 62,  votosUB: 24, vencedor: 0, pres: "A. Sales",      presOvr: 64, alertas: 3, eventos: 8,  lid: 12, risco: "media" },
  PI: { cob: 47, score: 58, fil: 24310,  mand: 32,  votosUB: 21, vencedor: 0, pres: "D. Rocha",      presOvr: 58, alertas: 2, eventos: 4,  lid: 7,  risco: "media" },
  RN: { cob: 64, score: 70, fil: 28910,  mand: 37,  votosUB: 30, vencedor: 1, pres: "F. Mineiro",    presOvr: 70, alertas: 1, eventos: 6,  lid: 9,  risco: "baixa" },
  PB: { cob: 70, score: 73, fil: 32100,  mand: 41,  votosUB: 35, vencedor: 1, pres: "E. Júnior",     presOvr: 73, alertas: 2, eventos: 7,  lid: 10, risco: "baixa" },
  AL: { cob: 51, score: 60, fil: 18460,  mand: 24,  votosUB: 23, vencedor: 0, pres: "P. Dantas",     presOvr: 60, alertas: 4, eventos: 3,  lid: 5,  risco: "media" },
  SE: { cob: 56, score: 65, fil: 14820,  mand: 19,  votosUB: 27, vencedor: 0, pres: "A. Mota",       presOvr: 65, alertas: 1, eventos: 4,  lid: 6,  risco: "baixa" },
  ES: { cob: 67, score: 71, fil: 31200,  mand: 38,  votosUB: 32, vencedor: 0, pres: "C. Da Vitória", presOvr: 71, alertas: 2, eventos: 5,  lid: 8,  risco: "baixa" },
  MT: { cob: 53, score: 63, fil: 26410,  mand: 31,  votosUB: 25, vencedor: 0, pres: "V. Pinheiro",   presOvr: 63, alertas: 3, eventos: 4,  lid: 7,  risco: "media" },
  MS: { cob: 49, score: 60, fil: 20180,  mand: 25,  votosUB: 22, vencedor: 0, pres: "C. Alves",      presOvr: 60, alertas: 2, eventos: 3,  lid: 5,  risco: "media" },
  DF: { cob: 73, score: 76, fil: 38420,  mand: 21,  votosUB: 38, vencedor: 1, pres: "P. Roberto",    presOvr: 76, alertas: 5, eventos: 9,  lid: 14, risco: "media" },
  TO: { cob: 38, score: 54, fil: 11420,  mand: 18,  votosUB: 17, vencedor: 0, pres: "L. Negrão",     presOvr: 54, alertas: 3, eventos: 2,  lid: 4,  risco: "alta"  },
  RO: { cob: 35, score: 51, fil: 9320,   mand: 12,  votosUB: 15, vencedor: 0, pres: "M. Bertaiolli", presOvr: 51, alertas: 6, eventos: 1,  lid: 3,  risco: "alta"  },
  AC: { cob: 31, score: 48, fil: 7100,   mand: 9,   votosUB: 13, vencedor: 0, pres: "V. Furlan",     presOvr: 48, alertas: 4, eventos: 1,  lid: 2,  risco: "alta"  },
  AP: { cob: 28, score: 45, fil: 6810,   mand: 7,   votosUB: 12, vencedor: 0, pres: "A. Penha",      presOvr: 45, alertas: 2, eventos: 1,  lid: 2,  risco: "alta"  },
  RR: { cob: 26, score: 43, fil: 5230,   mand: 6,   votosUB: 11, vencedor: 0, pres: "P. Hugo",       presOvr: 43, alertas: 3, eventos: 0,  lid: 1,  risco: "alta"  },
  SC: { cob: 60, score: 67, fil: 51230,  mand: 69,  votosUB: 30, vencedor: 0, pres: "R. Branco",     presOvr: 67, alertas: 2, eventos: 6,  lid: 11, risco: "baixa" },
};

export const UF_NOME = {
  AC:"Acre", AL:"Alagoas", AM:"Amazonas", AP:"Amapá", BA:"Bahia", CE:"Ceará",
  DF:"Distrito Federal", ES:"Espírito Santo", GO:"Goiás", MA:"Maranhão",
  MG:"Minas Gerais", MS:"Mato Grosso do Sul", MT:"Mato Grosso", PA:"Pará",
  PB:"Paraíba", PE:"Pernambuco", PI:"Piauí", PR:"Paraná", RJ:"Rio de Janeiro",
  RN:"Rio Grande do Norte", RO:"Rondônia", RR:"Roraima", RS:"Rio Grande do Sul",
  SC:"Santa Catarina", SE:"Sergipe", SP:"São Paulo", TO:"Tocantins",
};

export const UF_REGIAO = {
  SP:"Sudeste", RJ:"Sudeste", MG:"Sudeste", ES:"Sudeste",
  RS:"Sul", SC:"Sul", PR:"Sul",
  BA:"Nordeste", PE:"Nordeste", CE:"Nordeste", MA:"Nordeste", PI:"Nordeste",
  RN:"Nordeste", PB:"Nordeste", AL:"Nordeste", SE:"Nordeste",
  GO:"Centro-oeste", MT:"Centro-oeste", MS:"Centro-oeste", DF:"Centro-oeste",
  AM:"Norte", PA:"Norte", RR:"Norte", AP:"Norte", AC:"Norte", RO:"Norte", TO:"Norte",
};

// Top 3 políticos canônicos por UF (mocks alinhados com plataforma.html linhas 1261-1265)
export const TOP3_PADRAO = [
  { nome: "Jaques Wagner",  partido: "PT",  overall: 87 },
  { nome: "Otto Alencar",   partido: "PSD", overall: 79 },
  { nome: "Angelo Coronel", partido: "PSD", overall: 75 },
];
