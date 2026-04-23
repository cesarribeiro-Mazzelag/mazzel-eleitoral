// Tipos internos compartilhados entre MapaEleitoral e subcomponentes.
// Extraidos de MapaEleitoral.tsx sem alterar shape.

export interface HoverInfo {
  x: number; y: number;
  nome: string;
  status?: string;
  extra?: string;
  hint?: string;
}

export interface PartidoItem {
  numero:             number;
  sigla:              string;
  nome:               string;
  logo_url:           string | null;
  total_candidaturas: number;
  total_eleitos:      number;
  total_votos:        number;
}
