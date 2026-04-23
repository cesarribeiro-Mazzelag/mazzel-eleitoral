/**
 * Utilitário de cores para o Farol por Partido.
 *
 * Escala 0-5:
 *  0 = cor oposta (complementar) do partido — indica que OUTRO partido domina aqui
 *  1 = 20% da cor do partido (muito fraco)
 *  2 = 40%
 *  3 = 60%
 *  4 = 80%
 *  5 = 100% (cor plena — partido dominante)
 *
 * Em modo comparação (2+ partidos/candidatos): nível 0 = cinza neutro (#D1D5DB)
 */

// ── Conversões ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hn = h / 360;
  return [
    Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hn) * 255),
    Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  ];
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Gera a cor para um nível 0-5 da escala do partido.
 * Nível 0 = cor oposta (HSL 180°) para chamar atenção nos outliers
 *   sem voto — regra do Cesar: "quando está no zero colocar uma cor
 *   oposta é justamente para chamar a atenção".
 *   Em modoComparacao retorna cinza neutro (não distrai da comparação).
 * Níveis 1-5 = interpolação de 20%→100% da cor do partido.
 */
export function corFarolNivel(
  corPartido: string,
  nivel: number,
  modoComparacao = false,
): string {
  if (nivel === 0) {
    if (modoComparacao) return "#D1D5DB";
    return corOposta(corPartido);
  }
  const intensidade = nivel / 5; // 0.2, 0.4, 0.6, 0.8, 1.0
  return interpolarCor(corPartido, intensidade);
}

/**
 * Calcula a cor oposta (complementar) de uma cor hex.
 * Rotaciona 180° no espaço HSL mantendo saturação e luminosidade.
 */
export function corOposta(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const hOp = (h + 180) % 360;
  const [rn, gn, bn] = hslToRgb(hOp, Math.max(s, 0.6), Math.min(Math.max(l, 0.35), 0.55));
  return rgbToHex(rn, gn, bn);
}

/**
 * Interpola entre branco (#F5F5F5) e a cor plena do partido.
 * intensidade: 0.0 (branco) → 1.0 (cor plena)
 */
export function interpolarCor(hex: string, intensidade: number): string {
  const [r, g, b] = hexToRgb(hex);
  const base = 245; // F5F5F5
  return rgbToHex(
    Math.round(base + (r - base) * intensidade),
    Math.round(base + (g - base) * intensidade),
    Math.round(base + (b - base) * intensidade),
  );
}

/**
 * Gera a escala completa de 6 cores [0..5] para um partido.
 * Pronto para uso em legendas e swatches.
 */
export function gerarEscalaPartido(corPartido: string, modoComparacao = false): string[] {
  return Array.from({ length: 6 }, (_, i) => corFarolNivel(corPartido, i, modoComparacao));
}

/**
 * Calcula o nível 0-5 de força de um partido em uma região.
 *
 * Modo "eleitos": baseado no score ponderado estratégico.
 *   - 0: sem eleitos
 *   - 1-5: percentil do score entre todos os municípios do estado
 *
 * Modo "votos": baseado no percentil de votos.
 *
 * @param valor - score ou votos da região
 * @param referencia - array com todos os valores do contexto (para calcular percentis)
 */
export function calcularNivel(
  valor: number,
  referencia: number[],
  modo: "score" | "votos" = "score",
): number {
  if (!valor || valor <= 0) return 0;
  const positivos = referencia.filter(v => v > 0);
  if (positivos.length === 0) return valor > 0 ? 3 : 0;

  positivos.sort((a, b) => a - b);
  const rank = positivos.filter(v => v <= valor).length / positivos.length;

  if (rank >= 0.9)  return 5;
  if (rank >= 0.7)  return 4;
  if (rank >= 0.45) return 3;
  if (rank >= 0.2)  return 2;
  return 1;
}

/**
 * Verifica se duas cores são similares (distância no espaço HSL < threshold).
 * threshold = 60° diferença de matiz ou diferença de luminosidade/saturação < 0.2
 */
export function coresSimilares(hex1: string, hex2: string, threshold = 60): boolean {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const [h1] = rgbToHsl(r1, g1, b1);
  const [h2] = rgbToHsl(r2, g2, b2);
  const diff = Math.abs(h1 - h2);
  return Math.min(diff, 360 - diff) < threshold;
}

/**
 * Garante contraste mínimo entre a cor nova e as já usadas.
 * Se similar demais, rotaciona 180° (complementar).
 */
export function corComContraste(cor: string, usadas: string[]): string {
  const conflito = usadas.some(u => coresSimilares(cor, u));
  return conflito ? corOposta(cor) : cor;
}

// ── Cores oficiais dos partidos ──────────────────────────────────────────────
// Fonte: tabela `partidos.cor_primaria` no banco, atualizada via ETL
// `etl/baixar_logos_partidos.py` (extracao automatica do logo da Wikipedia PT).
// Reflete rebrandings recentes (ex: PSOL roxo 2023, PT vermelho novo, etc).
// Re-rodar o ETL quando partidos rebrandarem.
export const CORES_PARTIDOS: Record<number, string> = {
  10: "#005FAF",  // REPUBLICANOS
  11: "#14416F",  // PP
  12: "#033D7F",  // PDT
  13: "#E4142C",  // PT
  14: "#006B25",  // PTB
  15: "#4AA71E",  // MDB
  16: "#EE1C24",  // PSTU
  17: "#1F3467",  // PSL (historico)
  18: "#2EB5C2",  // REDE
  19: "#000000",  // PTN
  20: "#006F41",  // PSC
  21: "#C90B1C",  // PCO
  22: "#004F9F",  // PL
  23: "#022E4A",  // CIDADANIA
  25: "#144059",  // DEM
  27: "#0668C2",  // PSDC
  28: "#3B8BE2",  // PRTB - azul medio (cor oficial do partido, bandeira emoldurada em azul)
  29: "#A72823",  // PCB
  30: "#F3702B",  // NOVO
  31: "#8A191E",  // PHS
  33: "#5A8ECB",  // PODEMOS
  35: "#103D80",  // PMB
  36: "#FFFF03",  // AGIR
  39: "#341214",  // SD
  40: "#E00000",  // PSB
  43: "#006600",  // PV
  44: "#002A7B",  // UNIAO (União Brasil) - azul marinho oficial
  45: "#0C2CC3",  // PSDB
  50: "#68008E",  // PSOL (roxo atual pos-rebranding 2023)
  51: "#9C9C94",  // PATRIOTA
  52: "#002AC3",  // PPR
  54: "#005200",  // PPL
  55: "#FDB913",  // PSD
  62: "#EE6C34",  // PT do B
  65: "#DA251C",  // PC do B
  67: "#00562E",  // PEN
  70: "#EE6C34",  // AVANTE
  73: "#D91A1A",  // PMN
  74: "#005FAF",  // PRB
  76: "#004F9F",  // PR
  77: "#341214",  // SOLIDARIEDADE
  79: "#007FCA",  // PRP
  80: "#054E3E",  // PRONA
  84: "#144059",  // PFL
  90: "#F68E21",  // PROS
};

export function corDoPartido(numero: number): string {
  return CORES_PARTIDOS[numero] ?? "#6B7280";
}
