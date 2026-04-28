/* Documentos · DATA LAYER (1:1 com Designer V1.2)
 * Fonte: public/mockups/v1.2/F4-estatutario/03-documentos.html
 *
 * 3 colunas: árvore pastas (240) + tabela docs (1fr) + DocuSign drawer (460)
 * 6 abas: Todos · DocuSign Pendentes · Vigentes · Vencendo · Sigilosos · Rascunhos
 * 11 docs · 9 signatários no envelope DS-2026-04719
 */

export const FOLDERS_REPO = [
  { ico: "🗂️", nome: "Estatutários",      qty: "147", expanded: true,  arr: "▾" },
  { ico: "📁", nome: "Estatuto Nacional", qty: "12",  child: true,    arr: "▸" },
  { ico: "📁", nome: "Atas Mun. SP",       qty: "38",  child: true,    arr: "▸",  active: true },
  { ico: "📁", nome: "Resoluções",        qty: "24",  child: true,    arr: "▸" },
  { ico: "📁", nome: "Termos & Procurações", qty: "73", child: true,  arr: "▸" },
  { ico: "🗂️", nome: "Filiação",           qty: "124k", arr: "▸" },
  { ico: "🗂️", nome: "Tesouraria",         qty: "2.4k", arr: "▸" },
  { ico: "🗂️", nome: "Operações",          qty: "412",  arr: "▸" },
  { ico: "🗂️", nome: "Eleitoral / TSE",    qty: "187",  arr: "▸" },
  { ico: "🗂️", nome: "Jurídico",           qty: "23",   arr: "▸", warn: true },
  { ico: "🗂️", nome: "Comunicação",        qty: "156",  arr: "▸" },
  { ico: "🗂️", nome: "Gabinete",           qty: "847",  arr: "▸" },
];

export const FOLDERS_MARCADORES = [
  { ico: "⭐",  nome: "Favoritos",  qty: "17" },
  { ico: "🔔",  nome: "Vencendo",   qty: "8",  warn: true },
  { ico: "🔒",  nome: "Sigilosos",  qty: "4" },
  { ico: "🗑️",  nome: "Lixeira",    qty: "12" },
];

export const TABS = [
  { id: "todos",     label: "Todos",              num: "38" },
  { id: "pendentes", label: "DocuSign Pendentes", num: "12", warn: true },
  { id: "vigentes",  label: "Vigentes",           num: "19" },
  { id: "vencendo",  label: "Vencendo",           num: "3",  warn: true },
  { id: "sigilosos", label: "Sigilosos",          num: "2" },
  { id: "rascunhos", label: "Rascunhos",          num: "2" },
];

// 11 documentos · 1ª selecionada por default (Ata 04/2026)
export const DOCS = [
  {
    id: "ata-2026-04",
    fileType: "PDF", fileTypeClass: "pdf",
    titulo: "Ata Reunião Executiva 04/2026",
    sub: "Mesa Diretora · 18/abr/2026 · 9 presentes",
    tipo: "Ata", tamanho: "2.4 MB",
    atualizado: "18/abr/2026", atualizadoSub: "há 7 dias",
    versao: "v1.2", versaoSub: "3 versões",
    status: "ASSINADA", statusClass: "assinado",
    docusign: "9/9", docusignSub: "concluída", docusignColor: "var(--mz-ok)",
  },
  {
    id: "reg-etica",
    fileType: "DOC", fileTypeClass: "doc",
    titulo: "Reg. Interno Comissão Ética 2026", lock: "SIGILOSO",
    sub: "aguardando contra-assinaturas · 5 signatários",
    tipo: "Regulamento", tamanho: "847 KB",
    atualizado: "22/abr/2026", atualizadoSub: "há 3 dias",
    versao: "v0.4", versaoSub: "rascunho",
    status: "PENDENTE", statusClass: "pendente",
    docusignProgress: 60, docusignProgressLabel: "3/5",
  },
  {
    id: "procuracao-tse",
    fileType: "PDF", fileTypeClass: "pdf",
    titulo: "Procuração TSE · Pres. Mun. (renovação)",
    sub: "Milton Leite · vence em 65 dias · gerar nova",
    tipo: "Procuração", tamanho: "412 KB",
    atualizado: "15/abr/2026", atualizadoSub: "há 10 dias",
    versao: "v1.0", versaoSub: "—",
    status: "VENCENDO", statusClass: "exp",
    docusign: "A renovar", docusignSub: "30/jun/2026", docusignColor: "var(--mz-warn)",
  },
  {
    id: "res-04-2026",
    fileType: "PDF", fileTypeClass: "pdf",
    titulo: "Resolução 04/2026 · Comissões Setoriais",
    sub: "vigência 2026—2028 · aprovada unanimemente",
    tipo: "Resolução", tamanho: "1.1 MB",
    atualizado: "18/abr/2026", atualizadoSub: "há 7 dias",
    versao: "v1.0", versaoSub: "—",
    status: "VIGENTE", statusClass: "vigente",
    docusign: "3/3", docusignSub: "concluída", docusignColor: "var(--mz-ok)",
  },
  {
    id: "memo-op014",
    fileType: "PDF", fileTypeClass: "pdf",
    titulo: "Memorando OP-014 · Alocação orçamentária",
    sub: "R$ 850k aprovado · Operações + Tesouraria",
    tipo: "Memorando", tamanho: "284 KB",
    atualizado: "04/abr/2026", atualizadoSub: "há 21 dias",
    versao: "v1.0", versaoSub: "—",
    status: "PROTOCOLADO", statusClass: "protocolado",
    docusign: "2/2", docusignSub: "concluída", docusignColor: "var(--mz-ok)",
  },
  {
    id: "ata-vacancia",
    fileType: "DOC", fileTypeClass: "doc",
    titulo: "Ata Vacância · Comissão de Ética",
    sub: "Renúncia formal Mariana Lopes · necessita reposição",
    tipo: "Ata", tamanho: "156 KB",
    atualizado: "22/abr/2026", atualizadoSub: "há 3 dias",
    versao: "v1.0", versaoSub: "—",
    status: "PENDENTE", statusClass: "pendente",
    docusignProgress: 33, docusignProgressLabel: "1/3",
  },
  {
    id: "prestacao-q1",
    fileType: "XLS", fileTypeClass: "xls",
    titulo: "Prestação Contas Q1/2026",
    sub: "Tesouraria Mun. · receita R$ 2.4M / despesa R$ 1.8M",
    tipo: "Planilha", tamanho: "3.2 MB",
    atualizado: "15/abr/2026", atualizadoSub: "há 10 dias",
    versao: "v2.1", versaoSub: "5 versões",
    status: "ASSINADA", statusClass: "assinado",
    docusign: "3/3", docusignSub: "concluída", docusignColor: "var(--mz-ok)",
  },
  {
    id: "convocacao-conv",
    fileType: "PDF", fileTypeClass: "pdf",
    titulo: "Convocação Convenção Mun. Extraord.",
    sub: "10/mai/2026 · pauta única: chapa 2026",
    tipo: "Convocação", tamanho: "198 KB",
    atualizado: "20/abr/2026", atualizadoSub: "há 5 dias",
    versao: "v1.1", versaoSub: "2 versões",
    status: "VIGENTE", statusClass: "vigente",
    docusign: "2/2", docusignSub: "concluída", docusignColor: "var(--mz-ok)",
  },
  {
    id: "termo-filiacao",
    fileType: "DOC", fileTypeClass: "doc",
    titulo: "Termo de Filiação UB · template v2024.r3",
    sub: "com cláusula LGPD · 124k filiados ativos",
    tipo: "Template", tamanho: "92 KB",
    atualizado: "14/mar/2024", atualizadoSub: "há 2 anos",
    versao: "v2024.r3", versaoSub: "14 versões",
    status: "VIGENTE", statusClass: "vigente",
    docusign: "—", docusignSub: "template",
  },
  {
    id: "backup-atas-q1",
    fileType: "ZIP", fileTypeClass: "zip",
    titulo: "Backup Atas Q1 2026 · arquivo morto",
    sub: "14 atas · checksum SHA-256 verificado",
    tipo: "Arquivo", tamanho: "18.4 MB",
    atualizado: "02/abr/2026", atualizadoSub: "há 23 dias",
    versao: "—", versaoSub: "—",
    status: "ARQUIVADO", statusClass: "protocolado",
    docusign: "—", docusignSub: "imutável",
  },
  {
    id: "rascunho-carta",
    fileType: "DOC", fileTypeClass: "doc",
    titulo: "Rascunho · Carta abertura Convenção",
    sub: "autoria Milton Leite · ainda em edição",
    tipo: "Discurso", tamanho: "48 KB",
    atualizado: "25/abr/2026", atualizadoSub: "hoje · 09:14",
    versao: "v0.7", versaoSub: "rascunho",
    status: "RASCUNHO", statusClass: "rascunho",
    docusign: "—", docusignSub: "—",
  },
];

// Documento ativo (drawer direito) - Ata 04/2026
export const DOC_ATIVO = {
  id: "ata-2026-04",
  titulo: "Ata Reunião Executiva 04/2026",
  meta: "SHA-256: 4f7a...c819 · 2.4 MB",
  pills: [
    { label: "✓ Assinada",    tipo: "ok" },
    { label: "9/9 signatários" },
    { label: "v1.2 · vigente" },
    { label: "14 acessos (30d)" },
  ],
  metadados: [
    { k: "Tipo",          v: "Ata de reunião",          sub: "órgão estatutário" },
    { k: "Origem",        v: "Mesa Diretora · Pres. Mun." },
    { k: "Reunião",       v: "04/2026 (4ª do exercício)", sub: "18/abr/2026 · 14h-17h" },
    { k: "Local",         v: "Diretório Mun. SP",        sub: "R. Augusta, 1234" },
    { k: "Quórum",        v: "9 de 11 (82%)" },
    { k: "Pauta",         v: "3 itens",                  sub: "orçamento Q2 · OP-014 · vacância ética" },
    { k: "Confidencial.", v: "Pública" },
    { k: "Retenção",      v: "Permanente",                sub: "art. 47 Estatuto" },
  ],
  envelope: {
    id: "DS-2026-04719",
    titulo: "Ata 04/2026 · 9 signatários",
    sub: "aberto 18/abr · concluído 19/abr · 28h36m",
    progress: { steps: 6, done: 6, label: "9/9 ✓" },
    signers: [
      { av: "ML", nome: "Milton Leite",    sub: "Pres. · 18/abr 17:42 · IP 187.X.X.42",         status: "ASSINADO", state: "done" },
      { av: "CV", nome: "Carla Vieira",    sub: "Vice · 18/abr 18:14 · IP 200.X.X.91",          status: "ASSINADO", state: "done" },
      { av: "RA", nome: "Rogério Almeida", sub: "Tes. · 18/abr 19:28 · IP 191.X.X.07",          status: "ASSINADO", state: "done" },
      { av: "PS", nome: "Patrícia Souza",  sub: "Sec. Geral · 19/abr 09:12 · IP 187.X.X.42",     status: "ASSINADO", state: "done" },
      { av: "+5", nome: "+ 5 outros signatários", sub: "último: 19/abr 22:18",                  status: "ASSINADO", state: "done" },
    ],
  },
  versoes: [
    { v: "v1.2", titulo: "Versão atual",      sub: "Patrícia Souza · ajustes finais",          when: "19/abr 09:12", current: true },
    { v: "v1.1", titulo: "Revisão jurídica",   sub: "Patrícia Souza · grafias e datas",         when: "18/abr 22:30" },
    { v: "v1.0", titulo: "Primeira versão",    sub: "Sec. Geral · transcrição em ata",          when: "18/abr 17:14" },
  ],
  auditoria: [
    { texto: "Vc abriu o documento agora",   when: "25/abr/2026 09:14:23 · IP 187.X.X.42" },
    { texto: "Rita Tavares baixou (PDF)",     when: "22/abr/2026 14:08 · IP 200.X.X.91" },
    { texto: "Milton Leite leu",              when: "22/abr/2026 11:30" },
    { texto: "Sistema · ingestão p/ busca",   when: "19/abr/2026 09:15 (cron)" },
  ],
  acoes: [
    "👁 Abrir leitor PDF",
    "⬇ Baixar com selo digital",
    "📤 Compartilhar (link expira em 7d)",
    "🔁 Solicitar nova versão",
    "🏷️ Editar metadados",
    "🔐 Mudar para sigiloso",
  ],
  acaoPrincipal: "+ Vincular a operação",
};

export const FILE_COLORS = {
  pdf: "#c2410c",
  doc: "#1d4ed8",
  xls: "#047857",
  img: "#7c3aed",
  zip: "#4b5563",
};

export const STATUS_STYLES = {
  vigente:     { bg: "var(--mz-ok-soft)",     fg: "var(--mz-ok)" },
  assinado:    { bg: "var(--mz-ok-soft)",     fg: "var(--mz-ok)" },
  pendente:    { bg: "var(--mz-warn-soft)",   fg: "var(--mz-warn)" },
  rascunho:    { bg: "var(--mz-bg-elevated)", fg: "var(--mz-fg-muted)" },
  exp:         { bg: "var(--mz-danger-soft)", fg: "var(--mz-danger)" },
  protocolado: { bg: "var(--mz-info-soft)",   fg: "var(--mz-info)" },
};
