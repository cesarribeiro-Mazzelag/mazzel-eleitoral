/* Adapters para listagens que consomem API real. */

import { partyColor } from "../data";

/* ─── Radar ─── */

function cargoShort(cargo) {
  if (!cargo) return "-";
  const c = String(cargo).toUpperCase();
  if (c.includes("PRESIDENTE"))   return "PRES";
  if (c.includes("GOVERNADOR"))   return "GOV";
  if (c.includes("SENADOR"))      return "SEN";
  if (c.includes("FEDERAL"))      return "DEP";
  if (c.includes("ESTADUAL"))     return "DEP";
  if (c.includes("DISTRITAL"))    return "DEP";
  if (c.includes("PREFEITO"))     return "PREF";
  if (c.includes("VEREADOR"))     return "VER";
  return c.slice(0, 4);
}

function tierNormalize(t) {
  if (!t) return "bronze";
  const x = String(t).toLowerCase();
  if (["dourado", "ouro", "prata", "bronze"].includes(x)) return x;
  return "bronze";
}

// Mapeia atributos_6 do backend (8 dim antigas: VOT/EFI/ART/FID/INT/TER/POT/FIN)
// para as 6 dim v9 (ATV/LEG/BSE/INF/MID/PAC) conforme o estudo de matriz aprovado em 24/04/2026.
// Mapeamento aproximado ate o backend retornar overall_v9 nativo - cada v9 mapeia
// para UMA antiga distinta (sem duplicar) pra preservar variacao entre candidatos.
function mapAtributos6ToV9(atr) {
  if (!atr) return null;
  return {
    ATV: atr.EFI ?? atr.efi ?? null,    // Atividade ~ Eficiencia (taxa vitoria + custo/voto)
    LEG: atr.ART ?? atr.art ?? null,    // Legislativo ~ Articulacao (PLs aprovados)
    BSE: atr.VOT ?? atr.vot ?? null,    // Base ~ Votacao (volume eleitoral)
    INF: atr.FID ?? atr.fid ?? null,    // Influencia ~ Fidelidade (coerencia partidaria)
    MID: atr.POT ?? atr.pot ?? null,    // Midia ~ Potencial midiatico (momentum)
    PAC: atr.TER ?? atr.ter ?? null,    // Pactuacao ~ Territorial (alcance geografico = capacidade de pactuar regioes)
  };
}

export function radarCardsFromApi(apiResp) {
  if (!apiResp?.items) return null;
  return apiResp.items.map((p) => {
    const v9 = p.overall_v9 || mapAtributos6ToV9(p.atributos_6);
    return {
      // Campos legados (FifaMiniCard usa)
      id: p.candidato_id,
      nome: p.nome,
      partido: p.partido_sigla || "-",
      uf: p.estado_uf || "-",
      cargo: cargoShort(p.cargo),
      overall: p.overall ?? 0,
      tier: tierNormalize(p.tier),
      traits: p.traits || [],
      pac: v9?.PAC ?? null, pres: v9?.ATV ?? null, inf: v9?.INF ?? null,
      leg: v9?.LEG ?? null, bse: v9?.BSE ?? null, mid: v9?.MID ?? null,

      // Campos que CardPolitico (Card V8) precisa
      candidato_id: p.candidato_id,
      nome_urna: p.nome_urna,
      nome_completo: p.nome_completo,
      partido_sigla: p.partido_sigla,
      estado_uf: p.estado_uf,
      foto_url: p.foto_url,
      votos_total: p.votos_total ?? p.votos,
      ano: p.ano ?? p.ano_eleicao,
      overall_v9: v9,
    };
  });
}

/* ─── Filiados ─── */

export function filiadosListFromApi(apiResp) {
  if (!apiResp) return null;
  const lista = apiResp.filiados || apiResp.items || [];
  const total = apiResp.total ?? lista.length;
  // Agregacao por UF pra manter shape do Designer (FILIADOS_UF).
  const porUf = {};
  lista.forEach((f) => {
    const uf = f.estado_uf || "-";
    if (!porUf[uf]) porUf[uf] = { uf, total: 0, novos30d: 0, baixas30d: 0 };
    porUf[uf].total += 1;
  });
  const arr = Object.values(porUf).sort((a, b) => b.total - a.total);
  return { lista, total, porUf: arr };
}

/* ─── Delegados ─── */

export function delegadosListFromApi(apiResp) {
  const arr = Array.isArray(apiResp) ? apiResp : apiResp?.items || apiResp?.delegados || [];
  return arr.map((d) => ({
    nome: d.nome || "-",
    uf: d.estado_uf || d.uf || "-",
    cidades: d.cidades_cobertas ?? d.cidades ?? 0,
    filiados: d.total_filiados ?? d.filiados ?? 0,
    perf: d.performance ?? d.perf ?? 0,
    status: derivePerfStatus(d.performance ?? d.perf ?? 0),
  }));
}

function derivePerfStatus(perf) {
  if (perf >= 85) return "top";
  if (perf >= 65) return "ok";
  if (perf >= 50) return "at";
  return "baixo";
}

/* ─── Alertas central ─── */

export function alertasListFromApi(apiResp) {
  const arr = Array.isArray(apiResp) ? apiResp : apiResp?.items || apiResp?.alertas || [];
  return arr.map((a, i) => ({
    id: a.id ?? i,
    sev: mapSev(a.gravidade || a.severidade || a.sev),
    hora: a.hora || a.criado_em_humano || (a.criado_em ? new Date(a.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "-"),
    tipo: a.tipo || a.categoria || "Alerta",
    titulo: a.titulo || a.descricao || "-",
    fonte: a.fonte || "-",
    uf: a.estado_uf || a.uf || "-",
  }));
}

function mapSev(g) {
  const s = String(g || "").toLowerCase();
  if (s === "critico" || s === "crit") return "crit";
  if (s === "alto" || s === "alta")    return "alto";
  if (s === "medio" || s === "média" || s === "media") return "med";
  return "bx";
}

/* ─── Admin ─── */

export function adminUsuariosFromApi(apiResp) {
  const arr = Array.isArray(apiResp) ? apiResp : apiResp?.items || apiResp?.usuarios || [];
  return arr.map((u) => ({
    nome: u.nome || "-",
    email: u.email || "-",
    papel: u.perfil || u.papel || "-",
    uf: u.estado_uf || u.uf_restrito || u.uf || "-",
    status: u.ativo === false ? "suspenso" : (u.status || "ativo"),
    mfa: !!(u.totp_habilitado ?? u.mfa),
    last: u.ultimo_acesso_humano || u.ultimo_acesso || u.last || "-",
  }));
}

export function adminAuditoriaFromApi(apiResp) {
  const arr = Array.isArray(apiResp) ? apiResp : apiResp?.items || apiResp?.logs || [];
  return arr.slice(0, 20).map((a) => ({
    quando: a.hora || a.criado_em_humano || (a.criado_em ? new Date(a.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "-"),
    quem: a.usuario_nome || a.quem || "-",
    acao: a.acao || a.tipo || "-",
    obj: a.objeto || a.detalhe || "-",
    ip: a.ip || "-",
  }));
}

/* ─── Portal (candidato) ─── */

export function portalKpisFromApi(apiResp) {
  if (!apiResp) return null;
  const p = apiResp.perfil || apiResp;
  const m = apiResp.municipio || apiResp.farol_municipio || {};
  return [
    { l: "Último cargo",      v: p.ultimo_cargo || "-", h: p.ultimo_ano ? `${p.ultimo_ano}` : "-",  ok: true  },
    { l: "Votos última eleição", v: p.ultimos_votos ? p.ultimos_votos.toLocaleString("pt-BR") : "-", h: "última candidatura", ok: true },
    { l: "Farol município",   v: m.status || "-",        h: m.nome || "-",                             ok: m.status === "VERDE" || m.status === "AZUL" },
    { l: "Eleições disputadas", v: String(p.total_eleicoes || 0), h: "histórico total",                ok: true  },
  ];
}
