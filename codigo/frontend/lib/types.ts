// Tipos compartilhados - Mazzel Tech Inteligência Eleitoral

export type NivelMapa = "brasil" | "estado" | "municipio";

// Item selecionado no mapa (candidato ou partido) para modo de comparação
export interface SelecionadoItem {
  tipo: "candidato" | "partido";
  id: number;           // candidato_id ou partido numero
  nome: string;         // nome_urna ou sigla
  cor: string;          // cor atribuída para comparação visual
  partido_num?: number; // número do partido do candidato (para cor correta)
  cargo?: string;       // cargo do candidato (ex: GOVERNADOR) — para fetch correto em modo VIGENTES
  ano?: number;         // ano da eleição do candidato — para fetch correto em modo VIGENTES
}

export type StatusFarol = "AZUL" | "VERDE" | "AMARELO" | "VERMELHO" | "SEM_DADOS";

export interface MunicipioFarol {
  id: number;
  codigo_ibge: string;
  nome: string;
  estado_uf: string;
  farol: StatusFarol;
  votos_atual: number;
  votos_ant: number;
  variacao_pct: number | null;
  eleitos: number;
}

export interface FarolResponse {
  municipios: MunicipioFarol[];
  total_votos: number;
  total_eleitos: number;
  azuis: number;
  verdes: number;
  amarelos: number;
  vermelhos: number;
  variacao_media: number | null;
  municipios_com_eleito: number;
  municipios_vermelho: number;
  municipios_sem_candidato: number;
  total_municipios: number;
}

// ── Modal Estado ──────────────────────────────────────────────────────────────

export interface EleitoPorCargo {
  candidato_id: number;
  nome: string;
  foto_url: string | null;
  cargo: string;
  ano: number;
  votos: number;
  partido_num?: number;
  partido_sigla?: string;
  situacao?: string; // usado para municipio_nome em cargos municipais
}

export interface EstadoEleitos {
  estado_uf: string;
  cargos: Array<{
    cargo: string;
    eleitos: EleitoPorCargo[];
  }>;
  total_eleitos: number;
  total_nao_eleitos?: number;
}

// ── Painel Zonas ──────────────────────────────────────────────────────────────

export interface ZonaEleitoral {
  zona_numero: number;
  descricao: string | null;
  votos_total: number;
  candidatos: number;
}

export interface MunicipioZonas {
  municipio: {
    id: number;
    nome: string;
    estado_uf: string;
  };
  zonas: ZonaEleitoral[];
  total_votos: number;
  total_zonas: number;
}

// ── Locais de Votação (pins no mapa municipal) ────────────────────────────────

export interface LocalVotacaoProps {
  nr_zona: number;
  nr_local: number;
  nome: string | null;
  bairro: string | null;
  endereco: string | null;
  qt_eleitores: number | null;
  votos_zona: number;
}

export interface MunicipioLocais {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: LocalVotacaoProps;
  }>;
  municipio_nome: string;
  estado_uf: string;
  total_locais: number;
  total_votos: number;
  p33: number;
  p66: number;
}

export interface MunicipioGeoJSON {
  type: "Feature";
  geometry: object;
  properties: {
    codigo_ibge: string;
    nome: string;
    estado_uf: string;
    status_farol: StatusFarol;
    votos: number;
    eleitos: number;
    variacao_pct: number | null;
  };
}

export interface MunicipioDetalhe {
  municipio: {
    id: number;
    codigo_ibge: string;
    nome: string;
    estado_uf: string;
    populacao: number | null;
    pib_per_capita: number | null;
  };
  farol: Array<{
    cargo: string;
    status: StatusFarol;
    votos_atual: number;
    votos_anterior: number;
    variacao_pct: number | null;
    eleitos_atual: number;
    ano: number;
  }>;
  eleitos: Array<{
    nome_urna: string;
    cargo: string;
    ano: number;
    votos: number;
    candidato_id: number;
    candidatura_id: number;
    foto_url: string | null;
  }>;
}

export interface Sugestao {
  tipo: "municipio" | "estado" | "politico";
  label: string;
  sublabel?: string;
  valor: string;
}

// ── Dossiê ────────────────────────────────────────────────────────────────────
//
// Os tipos canônicos do Dossiê Político moraram em `lib/types/dossie.ts`
// (espelhamento manual do Pydantic `DossiePolitico` do backend). Aqui ficam
// apenas os tipos auxiliares ainda referenciados por componentes legados:
//
//   - `DossieEleicao`  → usado por `components/dossie/GraficoEvolucaoVotos.tsx`
//                         (importado em `app/meu-painel/page.jsx`)
//   - `DossieVotoZona` → usado por `components/dossie/MapaMiniatura.tsx`
//
// Os tipos antigos (Dossie, DossieCandidato, DossieRanking, DossieTrajetoria,
// DossieConcorrente, DossieCarreira, DossieTimeCampo, DossieCandidatura) foram
// removidos junto com a reescrita do ModalDossie (Fase 3 do refactor).

export interface DossieEleicao {
  ano: number;
  cargo: string;
  votos: number | null;
  eleito: boolean;
}

export interface DossieVotoZona {
  label:      string;       // Zona 001 | São Paulo | SP — semântico por cargo
  municipio?: string;       // sublabel para cargo municipal (ex: São Paulo)
  estado_uf?: string;
  votos:      number;
}

// ── Usuário ───────────────────────────────────────────────────────────────────

export type PerfilUsuario =
  | "PRESIDENTE"
  | "DIRETORIA"
  | "DELEGADO"
  | "POLITICO"
  | "FUNCIONARIO";

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  estado_uf?: string;
}
