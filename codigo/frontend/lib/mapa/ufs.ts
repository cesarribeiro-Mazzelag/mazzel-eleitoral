/**
 * Mapa de sigla de UF → nome do estado.
 *
 * Usado por tooltips, breadcrumbs e qualquer UI que precise exibir o nome
 * completo a partir da sigla. Fonte única pra toda a aplicação.
 */

const NOME_DA_UF: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export function nomeDaUf(sigla: string | null | undefined): string {
  if (!sigla) return "";
  const s = String(sigla).toUpperCase();
  return NOME_DA_UF[s] ?? s;
}

export const UFS_SIGLAS = Object.keys(NOME_DA_UF);
