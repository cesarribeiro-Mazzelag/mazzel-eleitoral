/* Mock do Mapa do Cabo (bairro Tomba, Feira de Santana).
 * Adaptado de Mapa do Cabo.html. Substituido por backend quando /mapa-cabo existir. */

export const CABOS = [
  { id: "rita",   nome: "Rita Lima",         tier: "ouro",   score: 89, fone: "(75) 9 9811-2211", visitasHoje: 42, metaHoje: 50, conv: 0.68, cor: "#2563eb" },
  { id: "marcos", nome: "Marcos Oliveira",   tier: "prata",  score: 72, fone: "(75) 9 9822-3344", visitasHoje: 28, metaHoje: 50, conv: 0.54, cor: "#059669" },
  { id: "ana",    nome: "Ana Paula Ribeiro", tier: "prata",  score: 76, fone: "(75) 9 9833-4455", visitasHoje: 31, metaHoje: 40, conv: 0.61, cor: "#7c3aed" },
  { id: "jose",   nome: "José Roberto",      tier: "bronze", score: 54, fone: "(75) 9 9844-5566", visitasHoje: 12, metaHoje: 35, conv: 0.32, cor: "#d97706" },
  { id: "helena", nome: "Helena Barreto",    tier: "ouro",   score: 82, fone: "(75) 9 9855-6677", visitasHoje: 38, metaHoje: 45, conv: 0.72, cor: "#db2777" },
];

const RUAS = [
  "Rua São Domingos", "Rua das Palmeiras", "Av. Getúlio Vargas", "Rua Coronel Juca Sobrinho",
  "Rua Olavo Bilac", "Rua dos Girassóis", "Rua Manoel Vitorino", "Av. Artêmio Castro",
  "Rua Pedro Álvares", "Rua da Matriz", "Travessa do Cruzeiro", "Rua Nilo Peçanha",
];

function buildQuadras() {
  const cols = 8;
  const rows = 5;
  const cellW = 84;
  const cellH = 78;
  const gapX = 8;
  const gapY = 8;
  const originX = 40;
  const originY = 40;
  const arr = [];
  let id = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = originX + c * (cellW + gapX);
      const y = originY + r * (cellH + gapY);
      const jx = Math.sin(id * 1.3) * 4;
      const jy = Math.cos(id * 1.7) * 4;
      const pts = [
        [x + jx, y + jy],
        [x + cellW - jy, y + jx],
        [x + cellW + jx, y + cellH - jy],
        [x - jy, y + cellH + jx],
      ];
      arr.push({
        id: `Q${String(id).padStart(2, "0")}`,
        centroid: [x + cellW / 2, y + cellH / 2],
        points: pts,
        domicilios: 40 + ((id * 7) % 60),
        rua: RUAS[id % RUAS.length],
      });
      id++;
    }
  }
  return arr;
}

export const QUADRAS_BASE = buildQuadras();

export const INITIAL_OWNERS = {
  Q01: "rita", Q02: "rita", Q03: "rita", Q09: "rita", Q10: "rita", Q11: "rita",
  Q04: "marcos", Q05: "marcos", Q06: "marcos", Q12: "marcos", Q13: "marcos", Q14: "marcos",
  Q07: "ana", Q08: "ana", Q15: "ana", Q16: "ana", Q23: "ana", Q24: "ana",
  Q17: "jose", Q18: "jose", Q19: "jose", Q20: "jose", Q25: "jose", Q26: "jose", Q27: "jose", Q28: "jose",
  Q33: "helena", Q34: "helena", Q35: "helena", Q36: "helena", Q37: "helena",
};

export const CONFLICTS = {
  Q20: ["jose", "helena"],
};

export function perfFor(qId, owners = INITIAL_OWNERS) {
  const caboId = owners[qId];
  if (!caboId) return { cobertura: 0, conversao: 0, feitoHoje: 0 };
  const cabo = CABOS.find((x) => x.id === caboId);
  const seed = qId.charCodeAt(1) + qId.charCodeAt(2);
  const ratio = 0.3 + ((seed * 7) % 60) / 100;
  return {
    cobertura: Math.min(0.95, ratio * (cabo.score / 80)),
    conversao: cabo.conv * (0.8 + ((seed * 11) % 30) / 100),
    feitoHoje: Math.round((seed % 7) + 1),
  };
}

export function routesForCabo(caboId, owners = INITIAL_OWNERS) {
  const qs = Object.entries(owners).filter(([, v]) => v === caboId).map(([k]) => k);
  return qs.map((q) => QUADRAS_BASE.find((x) => x.id === q)?.centroid).filter(Boolean);
}

export const CHECKLIST_MOCK = [
  { label: "Nº 12 - D. Maria",    status: "done" },
  { label: "Nº 18 - Sr. João",    status: "done" },
  { label: "Nº 24 - F. Sandra",   status: "partial" },
  { label: "Nº 31 - Sr. Carlos",  status: "done" },
  { label: "Nº 45 - Joana",       status: "partial" },
  { label: "Nº 52 - vago",        status: "pending" },
  { label: "Nº 58 - a identificar", status: "pending" },
];

export const ELEITORES_MOCK = [
  { nome: "Maria das Graças S.", idade: 62, status: "confirmado" },
  { nome: "João Batista R.",     idade: 48, status: "confirmado" },
  { nome: "Sandra Pereira",      idade: 35, status: "pendente" },
  { nome: "Carlos Augusto M.",   idade: 71, status: "confirmado" },
  { nome: "Joana Silva Reis",    idade: 29, status: "contactada" },
];

export const AGENDA_DIA_MOCK = [
  { hora: "08:00", text: "Briefing equipe · ponto de encontro" },
  { hora: "09:30", text: "Rita · Rua São Domingos" },
  { hora: "14:00", text: "Marcos · Av. Getúlio Vargas" },
  { hora: "17:00", text: "Check-in diário · chat furtivo" },
];
