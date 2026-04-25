/* Adapter: /dossie/{id} (backend DossiePolitico) -> shape do Designer.
 *
 * O Dossie e o hub central de dados da plataforma, entao este adapter
 * tem impacto em Home, Mapa, Radar e qualquer outro modulo que leia
 * dados consolidados.
 *
 * Regras:
 * - Nunca inventar dados. Campo faltante -> null ou disponivel=false.
 * - Respeitar o contrato `disponivel: false` do backend.
 * - Campos do Designer que nao existem no backend ficam como fallback
 *   estetico (bio padrao, percentil calculado, etc).
 *
 * Fonte do shape esperado: designer/data.jsx (PROFILES.wagner como referencia). */

/* ─────────── helpers ─────────── */

function splitNome(nomeCompleto) {
  if (!nomeCompleto) return { firstName: "-", lastName: "-" };
  const partes = String(nomeCompleto).trim().split(/\s+/);
  if (partes.length === 1) return { firstName: partes[0].toUpperCase(), lastName: "" };
  const firstName = partes[0].toUpperCase();
  const lastName = partes.slice(1).join(" ").toUpperCase();
  return { firstName, lastName };
}

function shortNameOf(nome, nomeUrna) {
  if (nomeUrna) return nomeUrna.toUpperCase();
  if (!nome) return "-";
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].toUpperCase();
  return `${partes[0][0].toUpperCase()}. ${partes[partes.length - 1].toUpperCase()}`;
}

// Reduz bio longa para 1-2 frases (max ~180 chars) preservando palavras.
// Biografia completa fica na secao Perfil (perfil.bioLong).
function bioCurto(bio) {
  if (!bio) return null;
  const limpo = String(bio).trim().replace(/\s+/g, " ");
  if (limpo.length <= 180) return limpo;
  // Tenta cortar no fim de frase (ponto seguido de espaco)
  const cortePonto = limpo.indexOf(". ", 80);
  if (cortePonto > 0 && cortePonto <= 200) return limpo.slice(0, cortePonto + 1);
  // Senao corta na ultima palavra antes de 180
  const corte = limpo.slice(0, 180).lastIndexOf(" ");
  return limpo.slice(0, corte > 0 ? corte : 180) + "…";
}

function fmtReais(n) {
  if (n === null || n === undefined) return "-";
  const v = Number(n);
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1).replace(".", ",")}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1).replace(".", ",")}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}k`;
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtReaisCheio(n) {
  if (n === null || n === undefined) return "-";
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtVotos(n) {
  if (!n) return "-";
  const v = Number(n);
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace(".", ",")}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

function cargoPosition(cargoTitulo) {
  if (!cargoTitulo) return "-";
  const c = String(cargoTitulo).toLowerCase();
  if (c.includes("presidente"))    return "PRES";
  if (c.includes("governador"))    return "GOV";
  if (c.includes("senador"))       return "SEN";
  if (c.includes("federal"))       return "DEP";
  if (c.includes("estadual"))      return "DEP-E";
  if (c.includes("distrital"))     return "DEP-D";
  if (c.includes("prefeito"))      return "PREF";
  if (c.includes("vereador"))      return "VER";
  return cargoTitulo.slice(0, 4).toUpperCase();
}

// tierOf removido - backend ja retorna `tier` em overall_fifa.tier.
// Quando indisponivel, frontend mostra "bronze" como fallback visual sem calculo.
const FALLBACK_TIER = "bronze";

function resultadoStatus(resultado, disputou2t) {
  if (disputou2t) return "2o-turno";
  const r = String(resultado || "").toUpperCase();
  if (r === "ELEITO") return "eleito";
  if (r === "SUPLENTE") return "nomeado";
  return "nao-eleito";
}

function percentileText(percentil, cargo) {
  if (percentil === null || percentil === undefined) return null;
  const p = Number(percentil);
  if (p >= 90) return `Top 10% entre ${cargoPluralLabel(cargo)}`;
  if (p >= 75) return `Top 25% entre ${cargoPluralLabel(cargo)}`;
  if (p >= 50) return `Top 50% entre ${cargoPluralLabel(cargo)}`;
  return `Posição ${(100 - p).toFixed(0)}% entre ${cargoPluralLabel(cargo)}`;
}

function cargoPluralLabel(cargo) {
  if (!cargo) return "pares";
  const c = String(cargo).toLowerCase();
  if (c.includes("senador"))   return "senadores";
  if (c.includes("federal"))   return "deputados federais";
  if (c.includes("estadual"))  return "deputados estaduais";
  if (c.includes("vereador"))  return "vereadores";
  if (c.includes("prefeito"))  return "prefeitos";
  if (c.includes("governador"))return "governadores";
  if (c.includes("presidente"))return "presidenciáveis";
  return "pares";
}

/* ─────────── traits + archetypes ─────────── */

const TRAIT_VARIANT = {
  LEGEND:    "gold",
  CAMPEAO:   "gold",
  FENOMENO:  "gold",
  FERA:      "silver",
  FERA_REG:  "silver",
  COMEBACK:  "silver",
  ESTREANTE: "silver",
};

const TRAIT_DISPLAY = {
  LEGEND:    "Lenda",
  CAMPEAO:   "Campeão",
  FENOMENO:  "Fenômeno",
  FERA:      "Fera regional",
  FERA_REG:  "Fera regional",
  COMEBACK:  "Comeback",
  ESTREANTE: "Estreante",
};

function adaptTraits(traits) {
  if (!Array.isArray(traits) || traits.length === 0) return [];
  return traits
    .map((t) => ({
      key: t,
      label: TRAIT_DISPLAY[t] || t,
      variant: TRAIT_VARIANT[t] || "silver",
    }))
    .slice(0, 3);
}

function deriveArchetypes(dossie) {
  const out = [];
  const fifa = dossie?.inteligencia?.overall_fifa || {};
  const leg = dossie?.legislativo || {};
  const redutos = dossie?.redutos_eleitorais || {};

  // Fenomeno: votacao alta (>= 85) ou tier dourado
  if ((fifa.votacao ?? 0) >= 85 || fifa.tier === "dourado") out.push("fenomeno");

  // Trabalhador: muitos projetos aprovados ou articulacao >= 80
  if ((leg.projetos_aprovados ?? 0) >= 50 || (fifa.articulacao ?? 0) >= 80) out.push("trabalhador");

  // Articulador: preside comissao ou fidelidade >= 85
  const presideComissao = (leg.presidencias || []).length > 0;
  if (presideComissao || (fifa.fidelidade ?? 0) >= 85) out.push("articulador");

  // Chefe de base: territorial >= 80 ou capilaridade grande
  const temCapilaridade = (redutos.total_regioes_com_voto ?? 0) >= 80;
  if ((fifa.territorial ?? 0) >= 80 || temCapilaridade) out.push("chefeBase");

  return out;
}

/* ─────────── stats do header ─────────── */

function adaptStats(dossie) {
  const t = dossie?.trajetoria?.cargos_disputados || [];
  const mandatos = t.filter((c) => String(c.resultado).toUpperCase() === "ELEITO").length;
  const leg = dossie?.legislativo || {};
  const exe = dossie?.executivo || {};
  const fin = dossie?.financeiro || {};

  // Cargos executivos (PRES/GOV/PREF) tem stats vindos de `dossie.executivo`.
  // Parlamentares (SEN/DEP) tem stats de `dossie.legislativo`.
  // Quando ambos sao "disponivel"=false (vereador, candidato sem mandato), mostra so Mandatos+Receita.
  const ehExecutivo = exe.cargo && (exe.n_medidas_provisorias > 0 || exe.n_decretos > 0 || exe.n_pls_enviados > 0 || exe.total_atos > 0);

  if (ehExecutivo) {
    return [
      { k: "Mandatos",       v: mandatos > 0 ? String(mandatos).padStart(2, "0") : "-" },
      { k: "MPs / Decretos", v: exe.total_atos > 0 ? String(exe.total_atos) : "-" },
      { k: "Aprovacao MPs",  v: exe.taxa_aprovacao_mps != null ? `${Math.round(exe.taxa_aprovacao_mps)}%` : "-" },
      { k: "Receita",        v: fin.total_arrecadado != null ? fmtReais(fin.total_arrecadado) : "-" },
    ];
  }

  return [
    { k: "Mandatos",     v: mandatos > 0 ? String(mandatos).padStart(2, "0") : "-" },
    { k: "PL aprovados", v: leg.projetos_aprovados != null ? String(leg.projetos_aprovados) : "-" },
    { k: "Atividade",    v: leg.presenca_plenario_pct != null ? `${Math.round(leg.presenca_plenario_pct)}%` : "-" },
    { k: "Receita",      v: fin.total_arrecadado != null ? fmtReais(fin.total_arrecadado) : "-" },
  ];
}

/* ─────────── eleitoral + map intensity ─────────── */

function adaptEleitoral(dossie) {
  const de = dossie?.desempenho_eleitoral || {};
  const re = dossie?.redutos_eleitorais || {};
  const comp = dossie?.comparativos || {};
  const id = dossie?.identificacao || {};
  const leg = dossie?.legislativo || {};

  const escopoLabel =
    comp.escopo === "municipal" ? `MUNICÍPIO · ${(comp.municipio || "").toUpperCase()}` :
    comp.escopo === "nacional"  ? "BRASIL" :
    de.ciclo_uf                  ? `ESTADO · ${ufNome(de.ciclo_uf)}` :
    "-";

  const topMunis = (re.redutos || []).slice(0, 3).map((r) => ({
    nome: r.label,
    pct: Math.round((r.pct_do_total || 0) * 100),
    votos: fmtVotos(r.votos),
  }));

  const mapIntensity = {};
  if (de.ciclo_uf) mapIntensity[de.ciclo_uf] = 90;
  (de.regioes_fortes || []).slice(0, 5).forEach((uf, i) => {
    mapIntensity[uf] = 70 - i * 10;
  });
  (de.regioes_fracas || []).slice(0, 3).forEach((uf, i) => {
    mapIntensity[uf] = 20 - i * 5;
  });

  const partidoSigla = (id.partido_sigla || leg.partido_sigla || "").toUpperCase() || null;

  return {
    uf: de.ciclo_uf || "-",
    escopo: escopoLabel,
    votos: fmtVotos(de.total_votos || 0),
    percentValidos: comp.percentil != null ? `${Math.round(comp.percentil)}%` : "-",
    ano: de.ciclo_ano ? String(de.ciclo_ano) : "-",
    topMunis: topMunis.length > 0 ? topMunis : [{ nome: "Sem redutos ainda", pct: 0, votos: "-" }],
    mapIntensity,
    partidoSigla,
  };
}

function ufNome(uf) {
  const map = {
    AC:"Acre", AL:"Alagoas", AM:"Amazonas", AP:"Amapá", BA:"Bahia", CE:"Ceará",
    DF:"Distrito Federal", ES:"Espírito Santo", GO:"Goiás", MA:"Maranhão",
    MG:"Minas Gerais", MS:"Mato Grosso do Sul", MT:"Mato Grosso", PA:"Pará",
    PB:"Paraíba", PE:"Pernambuco", PI:"Piauí", PR:"Paraná", RJ:"Rio de Janeiro",
    RN:"Rio Grande do Norte", RO:"Rondônia", RR:"Roraima", RS:"Rio Grande do Sul",
    SC:"Santa Catarina", SE:"Sergipe", SP:"São Paulo", TO:"Tocantins",
  };
  return map[uf] || uf || "-";
}

/* ─────────── trajetoria ─────────── */

function adaptTrajetoria(dossie) {
  const cargos = dossie?.trajetoria?.cargos_disputados || [];
  return cargos.map((c) => ({
    ano: String(c.ano),
    cargo: c.cargo || "-",
    uf: c.municipio ? `${c.municipio}/${c.estado_uf || ""}` : (c.estado_uf || "-"),
    votos: c.votos ? c.votos.toLocaleString("pt-BR") : "-",
    status: resultadoStatus(c.resultado, c.disputou_segundo_turno),
    partido: c.partido || "-",
  }));
}

/* ─────────── legislativo ─────────── */

function adaptProjetoRef(list) {
  return (list || []).slice(0, 3).map((p) => ({
    em: p.ementa || `${p.sigla_tipo} ${p.numero}/${p.ano}`,
    data: p.ano ? `${p.ano}` : "-",
  }));
}

function adaptLegislativo(dossie) {
  const L = dossie?.legislativo || {};
  if (!L.disponivel) return { disponivel: false };
  return {
    disponivel: true,
    aprovados: {
      count: L.projetos_aprovados ?? 0,
      recentes: adaptProjetoRef(L.ultimas_aprovadas),
    },
    tramitando: {
      count: L.projetos_em_tramitacao ?? 0,
      recentes: adaptProjetoRef(L.ultimas_em_tramitacao),
    },
    vetados: {
      count: L.projetos_vetados ?? 0,
      recentes: adaptProjetoRef(L.ultimas_vetadas),
    },
    comissoes: (L.comissoes_atuais || []).map((c) => ({
      sigla: c.sigla || "-",
      nome: c.nome || "-",
      cargo: c.cargo || "Titular",
      ativa: !!c.ativa,
    })),
    relatorias: (L.relatorias_recentes || []).slice(0, 5).map((r) => ({
      em: r.ementa || `${r.sigla_tipo} ${r.numero}/${r.ano}`,
      data: r.ano ? `${r.ano}` : "-",
      situ: r.situacao || "Em análise",
    })),
  };
}

/* ─────────── alertas (juridico) ─────────── */

function adaptAlertas(dossie) {
  const j = dossie?.juridico || {};
  const itens = [];

  (j.sancoes || []).forEach((s) => {
    itens.push({
      tipo: s.fonte || "Sanção",
      orgao: s.orgao_sancionador || s.fonte || "-",
      data: s.data_inicio || "-",
      valor: null,
      desc: s.tipo_sancao || `Sanção registrada na base ${s.fonte}`,
      severidade: s.ativa === false ? "medio" : "alto",
      url: s.link_publicacao || "#",
    });
  });

  (j.processos_relevantes || []).forEach((p) => {
    itens.push({
      tipo: p.tipo,
      orgao: "Processo",
      data: "-",
      valor: null,
      desc: `Processo ${p.tipo.toLowerCase()} · ${p.status.replace("_", " ").toLowerCase()}`,
      severidade: p.status === "CONDENADO" ? "critico" : p.status === "EM_ANDAMENTO" ? "medio" : "baixo",
      url: "#",
    });
  });

  const fichaLimpa = j.ficha_limpa === true && itens.length === 0;
  return { fichaLimpa, itens };
}

/* ─────────── financeiro ─────────── */

function adaptFinanceiro(dossie) {
  const F = dossie?.financeiro || {};
  if (!F.disponivel) return { disponivel: false };

  const arrec = F.total_arrecadado ?? 0;
  const gasto = F.total_gasto ?? 0;
  const saldo = arrec - gasto;

  const fontes = [];
  const o = F.origem_recursos || {};
  if (o.fundo_partidario_pct != null)  fontes.push({ k: "Fundo Partidário",  v: Math.round(o.fundo_partidario_pct * 100) });
  if (o.fundo_eleitoral_pct != null)   fontes.push({ k: "Fundo Eleitoral",   v: Math.round(o.fundo_eleitoral_pct * 100) });
  if (o.doacao_privada_pct != null)    fontes.push({ k: "Doação privada",    v: Math.round(o.doacao_privada_pct * 100) });
  if (o.recursos_proprios_pct != null) fontes.push({ k: "Recursos próprios", v: Math.round(o.recursos_proprios_pct * 100) });
  if (o.outros_pct != null)            fontes.push({ k: "Outros",            v: Math.round(o.outros_pct * 100) });

  const bench = F.cpv_benchmark || {};
  const cpv = {
    valor: bench.valor_candidato != null ? fmtReaisCheio(bench.valor_candidato) : "-",
    medianaCargo: bench.mediana_pares != null ? fmtReaisCheio(bench.mediana_pares) : "-",
    deltaPct:
      bench.valor_candidato != null && bench.mediana_pares
        ? Math.round(((bench.valor_candidato - bench.mediana_pares) / bench.mediana_pares) * 100)
        : 0,
    label: "mediana pares",
  };

  const topDoadores = (F.principais_doadores || []).slice(0, 10).map((d) => ({
    nome: d.nome,
    v: fmtReaisCheio(d.valor),
  }));

  return {
    disponivel: true,
    arrecadado: fmtReaisCheio(arrec),
    gasto: fmtReaisCheio(gasto),
    saldo: (saldo < 0 ? "-" : "") + fmtReaisCheio(Math.abs(saldo)).replace("R$ ", "R$ "),
    cpv,
    fontes,
    topDoadores,
  };
}

/* ─────────── perfil (biografia, redes, contato) ─────────── */

function adaptPerfil(dossie) {
  const id = dossie?.identificacao || {};
  const pp = dossie?.perfil_politico || {};
  const rs = dossie?.redes_sociais || {};

  const nascimento = [
    id.naturalidade,
    id.idade ? `${id.idade} anos` : null,
    id.estado_nascimento ? `UF natal: ${id.estado_nascimento}` : null,
  ].filter(Boolean).join(" · ") || "-";

  const partidos = [];
  if (pp.partido_atual) partidos.push({ p: pp.partido_atual, desde: "atual" });
  (pp.historico_partidos || []).forEach((p) => {
    if (p && p !== pp.partido_atual) partidos.push({ p, desde: "histórico" });
  });

  const redes = [];
  if (rs.instagram) redes.push({ rede: "Instagram", handle: rs.instagram.startsWith("@") ? rs.instagram : `@${rs.instagram}`, seguidores: "-", engajamento: "-", verificado: true });
  if (rs.twitter)   redes.push({ rede: "Twitter",   handle: rs.twitter.startsWith("@") ? rs.twitter : `@${rs.twitter}`,       seguidores: "-", engajamento: "-", verificado: true });
  if (rs.facebook)  redes.push({ rede: "Facebook",  handle: rs.facebook,                                                      seguidores: "-", engajamento: "-", verificado: true });
  if (rs.youtube)   redes.push({ rede: "YouTube",   handle: rs.youtube,                                                       seguidores: "-", engajamento: "-", verificado: true });
  if (rs.tiktok)    redes.push({ rede: "TikTok",    handle: rs.tiktok.startsWith("@") ? rs.tiktok : `@${rs.tiktok}`,          seguidores: "-", engajamento: "-", verificado: true });

  return {
    bioLong: id.bio_resumida || "Biografia não disponível ainda.",
    nascimento,
    formacao: id.grau_instrucao || "-",
    partidos: partidos.length > 0 ? partidos : [{ p: "Sem partido", desde: "-" }],
    redes,
    gabinete: "-",
    email: "-",
  };
}

/* ─────────── overall ─────────── */

function adaptOverallStats(dossie) {
  // Mapeia o backend para as 6 dimensoes v9 (ATV/LEG/BSE/INF/MID/PAC).
  // Aceita 3 formatos: overall_v9 (novo, prioridade), overall_fifa (8 dim antigo), atributos_6 (legado).
  const inte = dossie?.inteligencia || {};
  if (inte.overall_v9) {
    const v = inte.overall_v9;
    return {
      ATV: v.atv ?? v.ATV ?? null,
      LEG: v.leg ?? v.LEG ?? null,
      BSE: v.bse ?? v.BSE ?? null,
      INF: v.inf ?? v.INF ?? null,
      MID: v.mid ?? v.MID ?? null,
      PAC: v.pac ?? v.PAC ?? null,
    };
  }
  // Fallback temporario: traduz overall_fifa antigo
  const f = inte.overall_fifa || {};
  return {
    ATV: f.integridade ?? null,    // Atividade ~ integridade (proxy fraco)
    LEG: f.articulacao ?? null,    // Legislativo ~ articulacao
    BSE: f.votacao ?? null,        // Base ~ votacao
    INF: f.fidelidade ?? null,     // Influencia ~ fidelidade
    MID: f.potencial ?? null,      // Midia ~ potencial (momentum)
    PAC: f.eficiencia ?? null,     // Pactuacao ~ eficiencia
  };
}

/* ─────────── profile root ─────────── */

export function adaptDossie(dossie) {
  if (!dossie) return null;

  const id = dossie.identificacao || {};
  const fifa = dossie.inteligencia?.overall_fifa || {};
  const leg = dossie.legislativo || {};
  const ciclo = dossie.desempenho_eleitoral || {};

  const { firstName, lastName } = splitNome(id.nome || id.nome_urna || "");
  const rating = fifa.overall ?? dossie.overall_ultimo_ciclo ?? null;
  const sparse = rating === null || rating === undefined;

  const cargoTitulo = leg.cargo_titulo || (ciclo.ciclo_cargo);
  const meta = [
    cargoTitulo ? cargoTitulo.toUpperCase() : null,
    ciclo.ciclo_uf,
    ciclo.ciclo_ano,
  ].filter(Boolean).join(" · ");

  // Cartinha embarcada (Card V8): shape compativel com /components/radar/CardPolitico.jsx
  // Tenta consumir dados da cartinha persistidos pelo Dossies.jsx (sessionStorage) pra
  // garantir consistencia entre grade e dossie. Fallback: dados do proprio /dossie/{id}.
  const overallStatsForCard = adaptOverallStats(dossie);
  let cartinhaFromGrid = null;
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(`dossie_card_${id.id}`);
      if (raw) cartinhaFromGrid = JSON.parse(raw);
    } catch {}
  }
  const cartinha = cartinhaFromGrid || {
    candidato_id: id.id,
    nome: id.nome,
    nome_urna: id.nome_urna,
    nome_completo: id.nome_completo || id.nome,
    cargo: cargoTitulo,
    partido_sigla: id.partido_sigla || leg.partido_sigla,
    estado_uf: id.estado_uf || ciclo.ciclo_uf,
    foto_url: id.foto_url,
    overall: rating,
    overall_v9: overallStatsForCard,  // ATV/LEG/BSE/INF/MID/PAC
    votos_total: ciclo.ciclo_votos ?? id.ultimos_votos,
    ano: ciclo.ciclo_ano,
  };

  // Quando temos cartinha vinda da grade, alinhamos overall do header com o da grade
  // (mesma fonte = mesmo numero pro usuario, evita "99 na grade vs 85 no dossie").
  const ratingExibido = cartinhaFromGrid?.overall ?? rating;
  const overallStatsExibidos = cartinhaFromGrid?.overall_v9 ?? overallStatsForCard;

  return {
    id: id.id,
    firstName,
    lastName,
    shortName: shortNameOf(id.nome, id.nome_urna),
    cargo: cargoPosition(cargoTitulo),
    position: cargoPosition(cargoTitulo),
    meta: meta || "-",
    // Bio do header: 1-2 frases curtas. Biografia completa fica em perfil.bioLong (secao Perfil).
    bio: bioCurto(id.bio_resumida) || (sparse
      ? "Perfil em construção. Dados consolidados ainda incompletos."
      : "Dados parciais disponíveis."),
    rating: ratingExibido,
    percentile: percentileText(dossie.comparativos?.percentil, cargoTitulo) || "Posição em cálculo",
    // tier vem do backend (fifa.tier). Frontend so consome.
    tier: fifa.tier || cartinhaFromGrid?.tier || FALLBACK_TIER,
    archetypes: sparse ? [] : deriveArchetypes(dossie),
    traits: sparse ? [] : adaptTraits(fifa.traits),
    sparse,
    stats: adaptStats(dossie),
    overallStats: overallStatsExibidos,
    cartinha,
    eleitoral: adaptEleitoral(dossie),
    trajetoria: adaptTrajetoria(dossie),
    legislativo: adaptLegislativo(dossie),
    executivo: dossie.executivo || null,  // passa direto - shape do backend bate com AtividadeExecutiva.jsx
    alertas: adaptAlertas(dossie),
    financeiro: adaptFinanceiro(dossie),
    emendas: { aplicavel: false },  // backend nao retorna bloco de emendas hoje
    perfil: adaptPerfil(dossie),
  };
}
