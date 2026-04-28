/* Chat Evoluído · DATA LAYER (1:1 com Designer V1.2)
 * Fonte: public/mockups/v1.2/F3-modulos/03-chat-evoluido.html
 *
 * 3 modos: Permanente (LGPD audit) · Sigiloso (E2EE auto-destrói + watermark)
 * · SOS Cabo (escalada automática + localização + buddy + sirene áudio)
 *
 * Caso âncora SOS canônico: Luiz Ribeiro · M'Boi Mirim · OP-2026-014 · ATIVO
 * Caso âncora Sigiloso: Milton Leite confidencial chapa 2026 (com expiração)
 */

export const MODES = [
  { id: "permanente", ico: "💬", titulo: "Permanente", sub: "Histórico auditável · LGPD", qty: "142" },
  { id: "sigiloso",   ico: "🔒", titulo: "Sigiloso",   sub: "E2EE · auto-destrói",        qty: "14" },
  { id: "sos",        ico: "🚨", titulo: "SOS Cabo",   sub: "Pânico territorial · 24/7",  qty: "3" },
];

export const FEATURES = {
  permanente: {
    titulo: "Recursos · Permanente",
    items: [
      { state: "on",  b: "Histórico ilimitado",  s: "Tudo gravado · auditável" },
      { state: "on",  b: "Pesquisa full-text",   s: "Inclusive anexos OCR" },
      { state: "on",  b: "LGPD-compliant",        s: "Consentimento + retenção" },
      { state: "on",  b: "Auditoria por DPO",     s: "Logs imutáveis · jurídico" },
      { state: "on",  b: "Anexos ilimitados",     s: "Docs, áudio, foto, vídeo" },
      { state: "off", b: "Auto-destruição",       s: "Indisponível neste modo" },
      { state: "off", b: "Print bloqueado",       s: "Indisponível neste modo" },
    ],
  },
  sigiloso: {
    titulo: "Recursos · Sigiloso",
    items: [
      { state: "on",  b: "E2EE · Signal protocol", s: "Servidor sem chaves" },
      { state: "on",  b: "Auto-destruição 24h",    s: "Mensagem some dos 2 lados" },
      { state: "on",  b: "Print bloqueado",        s: "Tela apaga ao detectar" },
      { state: "on",  b: "Watermark dinâmica",     s: "Username + IP + hora" },
      { state: "on",  b: "Sem encaminhamento",      s: "Sem copiar texto" },
      { state: "on",  b: "Sem backup em nuvem",     s: "Apenas dispositivo" },
      { state: "off", b: "Pesquisa de mensagens",   s: "Off por design" },
      { state: "off", b: "Auditoria pelo DPO",      s: "Não acessível" },
    ],
  },
  sos: {
    titulo: "Recursos · SOS Cabo",
    items: [
      { state: "crit", b: "Escalada automática",       s: "Coord + Jurídico + Seg" },
      { state: "crit", b: "Localização em tempo real", s: "Cabo é geolocalizado" },
      { state: "crit", b: "Áudio direto · sirene",     s: "Toca em todos os celulares" },
      { state: "on",   b: "Histórico forense",          s: "Gravado para denúncia/BO" },
      { state: "on",   b: "Botão chamar PM",            s: "Disca 190 do app" },
      { state: "on",   b: "Buddy automático",           s: "3 cabos próximos notificados" },
      { state: "on",   b: "Trilha de áudio ativa",       s: "Microfone grava p/ contexto" },
      { state: "on",   b: "Encerramento manual",        s: "Só Coord. fecha o caso" },
    ],
  },
};

export const CL_TABS = ["Todas", "DM", "Grupos", "Operações", "Não-lidas"];

export const CONVS = {
  permanente: [
    { id: "p1", avatar: "JM", nome: "João Mendes", sub: "Cabo · Capão Redondo · OP-2026-014", preview: "Beleza, mando o relatório das 23 ruas hoje à noite.", when: "09:14", online: true, unread: 0, tag: "OP-014", active: true },
    { id: "p2", avatar: "OP", nome: "OP-2026-014 · Coord. Geral", sub: "Grupo · 12 membros · Capilarização SP", preview: "Rita: Pessoal, reunião amanhã 10h confirmada?", when: "08:42", unread: 4, tag: "OP-014" },
    { id: "p3", avatar: "RT", nome: "Rita Tavares", sub: "Líder Operação · OVR 94", preview: "Recebido. Vou validar com Milton e te respondo.", when: "08:18", unread: 0 },
    { id: "p4", avatar: "TS", nome: "Tesouraria UB", sub: "Bot · Validações + Confirmações", preview: "✓ Despesa R$ 38.400 (eventos abr) APROVADA - comprovação ok", when: "ontem", unread: 1 },
    { id: "p5", avatar: "PS", nome: "Paula Silva", sub: "Cabo · Cidade Ademar", preview: "Marquei 38 fichas pra entregar amanhã. Foto anexa.", when: "ontem", unread: 0 },
    { id: "p6", avatar: "DN", nome: "Direção Nacional", sub: "Grupo · 47 membros · Top brass", preview: "Milton: Orientação para cabos sobre conduta TSE atualizada.", when: "23/abr", unread: 0, tag: "OFICIAL" },
    { id: "p7", avatar: "JD", nome: "Jurídico · Dra. Helena", sub: "Compliance + LGPD", preview: "Dra. Helena: Analisei o caso RO-001. Parecer no docs.", when: "22/abr", unread: 0 },
  ],
  sigiloso: [
    { id: "s1", avatar: "ML", nome: "Milton Leite", sub: "Pres. Estadual SP", preview: "[mensagem expirada]", when: "09:04", unread: 1, tag: "SIGIL", active: true },
    { id: "s2", avatar: "WG", nome: "Wagner BA", sub: "Pres. Estadual BA · OVR 87", preview: "[criptografada · auto-destrói em 14h]", when: "07:22", unread: 0, tag: "SIGIL" },
    { id: "s3", avatar: "DN", nome: "Núcleo Estratégico", sub: "5 membros · OVR ≥ 85", preview: "[mensagem cifrada]", when: "ontem", unread: 2, tag: "SIGIL" },
    { id: "s4", avatar: "AD", nome: "Advocacia · Dr. Ramos", sub: "Operação Confidencial", preview: "[apenas leitura · expira em 6h]", when: "23/abr", unread: 0, tag: "SIGIL" },
  ],
  sos: [
    { id: "x1", avatar: "LR", nome: "Luiz Ribeiro · CABO", sub: "🚨 EM ESCALADA · M'Boi Mirim · há 12 min", preview: "SOS aberto · localização ativa · áudio gravando", when: "AGORA", unread: 1, tag: "SOS", active: true, sos: true },
    { id: "x2", avatar: "CD", nome: "Carla Diniz · CABO", sub: "Resolvido há 2h · BA · Periperi", preview: "Cabo confirmou segurança · caso ENCERRADO pelo Coord.", when: "06:42", unread: 0, tag: "SOS" },
    { id: "x3", avatar: "AS", nome: "Antonio Santos · CABO", sub: "Resolvido ontem · CE · Maracanaú", preview: "Falso alarme · botão acionado por engano · ENCERRADO", when: "24/abr", unread: 0, tag: "SOS" },
  ],
};

export const MSGS = {
  p1: [
    { type: "date", val: "TER · 23 ABR" },
    { from: "JM", nome: "João Mendes", when: "14:32", body: "Bom dia, Coord. Acabei de fechar o levantamento da Vila Andrade - 23 ruas mapeadas, identifiquei 7 lideranças latentes que nunca filiaram." },
    { from: "me", nome: "Você", when: "14:38", body: "Excelente, João. Pode mandar a planilha?" },
    { from: "JM", nome: "João Mendes", when: "14:39", body: "Mandei agora. Importante: 3 dessas 7 lideranças têm dúvida - pediram pra ouvir Milton diretamente.", attach: { ico: "XLS", b: "mapeamento-vila-andrade.xlsx", s: "32 KB · 23 ruas · 7 lid." } },
    { type: "date", val: "HOJE · 25 ABR" },
    { type: "system", val: "✓ Documento aprovado pelo Pres. Mun. · Milton Leite" },
    { from: "me", nome: "Você", when: "08:41", body: "João, Milton confirma agenda dia 28 às 19h em Capão Redondo. Pode organizar local + encontro com as 7 lideranças?" },
    { from: "JM", nome: "João Mendes", when: "09:12", body: "Confirmado. Vou usar o salão da igreja Bom Jesus, cabe 80 pessoas e fica central. Também adiciono mais 4 nomes que apareceram no fim de semana." },
    { from: "JM", nome: "João Mendes", when: "09:14", body: "Beleza, mando o relatório das 23 ruas hoje à noite." },
  ],
  p2: [
    { type: "date", val: "HOJE · 25 ABR" },
    { type: "system", val: "👥 Rita Tavares adicionou Carla Diniz ao grupo" },
    { from: "RT", nome: "Rita Tavares · Líder", when: "08:38", body: "Bom dia, equipe. Pequeno alinhamento: amanhã reunião 10h presencial no Diretório Municipal. Pauta: revisão Fase 4 + repactuação metas." },
    { from: "JM", nome: "João Mendes", when: "08:40", body: "Confirmado." },
    { from: "PS", nome: "Paula Silva", when: "08:41", body: "Confirmado." },
    { from: "AF", nome: "André Fonseca", when: "08:42", body: "Confirmado." },
    { from: "RT", nome: "Rita Tavares · Líder", when: "08:42", body: "Pessoal, reunião amanhã 10h confirmada?" },
  ],
  s1: [
    { type: "date", val: "HOJE · 25 ABR" },
    { type: "system", val: "🔒 Conversa criptografada · E2EE · Mensagens expiram em 24h · Print BLOQUEADO" },
    { type: "expired", val: "Mensagem auto-destruída · 09:01" },
    { from: "ML", nome: "Milton Leite", when: "09:03", body: "Confidencial: o nome para a chapa de 2026 ainda é o Pedro? Recebi sondagem do PSD oferecendo migração e quero entender nosso plano B.", expire: 0.78 },
    { from: "me", nome: "Você", when: "09:04", body: "Confirmado o Pedro como nome principal. Plano B é Carla, mas ainda não está oficializada - só fala com você por enquanto.", expire: 0.85 },
    { from: "ML", nome: "Milton Leite", when: "09:04", body: "Entendido. Faço a contraposta com PSD ainda hoje e travo a janela.", expire: 0.92 },
    { type: "expired", val: "Mensagem auto-destruída · 09:14" },
  ],
  x1: [
    { type: "date", val: "HOJE · 25 ABR" },
    { type: "system", val: "🚨 SOS aberto às 09:02 · Cabo Luiz Ribeiro · M'Boi Mirim · SP" },
    { type: "sos-card" },
    { from: "LR", nome: "Luiz Ribeiro · CABO", when: "09:03", body: "Coord, situação tensa aqui. Grupo de 4 caras chegou no comício, falando agressivo. Tô com Carla e Bruno comigo, mas tô desconfortável." },
    { type: "sysmsg", from: "sys", when: "09:03", body: "⚡ Escalada automática iniciada · Coord. Operação + Jurídico Local + Segurança · Notificados via push." },
    { type: "sysmsg", from: "sys", when: "09:04", body: "📍 Localização travada: M'Boi Mirim · R. Augusto Carlos, 120 · pin enviado pra todos os notificados." },
    { type: "sysmsg", from: "sys", when: "09:04", body: "👥 3 cabos mais próximos identificados: Paulo Silva (180m), Rita Tavares (340m), Maria Souza (520m). Notificados." },
    { from: "me", nome: "Você (Coord.)", when: "09:05", body: "Luiz, fica calmo. Paulo está chegando em 2 min. Já chamei a PM - código preto. Não saia do local. Mantém o áudio gravando." },
    { from: "LR", nome: "Luiz Ribeiro · CABO", when: "09:06", body: "Ok. Eles já tão indo embora. Acho que viram o áudio gravando." },
    { type: "sysmsg", from: "sys", when: "09:07", body: "✓ PM acionada · viatura 12 a caminho · ETA 4 min" },
    { type: "sysmsg", from: "sys", when: "09:08", body: "✓ Paulo Silva chegou ao local · cabo Luiz confirmou presença" },
    { from: "me", nome: "Você (Coord.)", when: "09:14", body: "Luiz, me confirma agora: tudo bem? Posso pedir encerramento do SOS?" },
  ],
};

export const SOS_CARD_DATA = {
  cabo: "Luiz Ribeiro",
  abertoHa: "12 min · em escalada",
  operacao: "OP-2026-014 · M'Boi Mirim",
  localizacao: "R. Augusto Carlos, 120",
  audio: "🔴 GRAVANDO · 12:14 min",
};

// Composer meta por modo (cifrado/auto-destrói/print/watermark/etc)
export const COMPOSER_META = {
  permanente: [
    { tipo: "info", v: "Modo: Permanente · histórico auditável · LGPD" },
    { tipo: "info", v: "Anexos OK · sem expiração" },
    { tipo: "right", v: "⌘ Enter para enviar" },
  ],
  sigiloso: [
    { tipo: "info", v: "🔒 Cifrado · E2EE Signal" },
    { tipo: "toggle", on: true, v: "Auto-destrói: 24h" },
    { tipo: "toggle", on: true, v: "Print: BLOQUEADO" },
    { tipo: "toggle", on: true, v: "Watermark: ATIVO" },
    { tipo: "right", v: "Mensagem expira mesmo se você sair" },
  ],
  sos: [
    { tipo: "info", v: "🚨 SOS aberto · Resposta de Coordenação" },
    { tipo: "info", v: "Tudo gravado para forense" },
    { tipo: "right", v: "Para encerrar: botão 'Encerrar SOS' no header" },
  ],
};

export const TITULO_LISTA = {
  permanente: "Conversas Permanentes",
  sigiloso:   "Sigiloso · 14 ativos",
  sos:        "SOS Cabo · 3 abertos",
};
