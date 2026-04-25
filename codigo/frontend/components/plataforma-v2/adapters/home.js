/* Adapter: /dashboard/visao-geral (backend) -> KPIs do Home (Designer).
 *
 * Regras:
 * - Nunca inventar valores. Se um campo não vem do backend, deixa null e
 *   a UI decide como mostrar.
 * - Numeros formatados em pt-BR.
 * - Emendas por UF, top overall e audit feed seguem com mock enquanto
 *   não há endpoint consolidado. */

function fmtInt(n) {
  if (n === null || n === undefined) return "-";
  return Number(n).toLocaleString("pt-BR");
}

function fmtPct(n) {
  if (n === null || n === undefined) return "-";
  return `${Number(n).toFixed(1).replace(".", ",")}%`;
}

export function kpisFromDashboard(visaoGeral, role = "presidente") {
  if (!visaoGeral?.big_numbers) return null;
  const b = visaoGeral.big_numbers;

  if (role === "candidato") {
    // Candidato tem KPIs próprios (vem de /meu-painel/resumo) - não usar aqui.
    return null;
  }

  const coberturaMuni = b.total_municipios
    ? Math.round((b.municipios_com_eleito / b.total_municipios) * 1000) / 10
    : null;

  return [
    {
      k: "Total eleitos",
      v: fmtInt(b.total_eleitos),
      hint: `${fmtInt(b.estados_com_eleito)} estados · ${fmtInt(b.partidos_com_eleitos)} partidos`,
      trend: b.taxa_eleicao ? `${b.taxa_eleicao.toString().replace(".", ",")}% taxa` : "-",
      ok: true,
    },
    {
      k: "Candidatos monitorados",
      v: fmtInt(b.total_candidatos),
      hint: "base TSE consolidada",
      trend: fmtInt(b.candidatas_femininas) + " mulheres",
      ok: true,
    },
    {
      k: "Cobertura municipal",
      v: coberturaMuni !== null ? `${String(coberturaMuni).replace(".", ",")}%` : "-",
      hint: `${fmtInt(b.municipios_com_eleito)} de ${fmtInt(b.total_municipios)} municípios`,
      trend: fmtInt(b.municipios_com_votos) + " com votos",
      ok: true,
    },
    {
      k: "Receita declarada",
      v: formatReceita(b.receita_total),
      hint: `despesa ${formatReceita(b.despesa_total)}`,
      trend: fmtPct(b.pct_mulheres_eleitas) + " fem.",
      ok: true,
    },
  ];
}

function formatReceita(n) {
  if (!n) return "-";
  if (n >= 1e9) return `R$ ${(n / 1e9).toFixed(1).replace(".", ",")}B`;
  if (n >= 1e6) return `R$ ${(n / 1e6).toFixed(1).replace(".", ",")}M`;
  if (n >= 1e3) return `R$ ${(n / 1e3).toFixed(0)}k`;
  return `R$ ${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function alertasFromApi(lista) {
  if (!Array.isArray(lista)) return null;
  return lista.slice(0, 8).map((a) => ({
    id: a.id,
    sev: mapSeveridade(a.gravidade || a.severidade),
    tipo: a.tipo || "Alerta",
    who: a.titulo || a.titulo_alerta || "-",
    uf: a.estado_uf || "-",
    what: a.descricao || a.detalhe || "",
    when: a.criado_em_humano || a.criado_em || "-",
    tag: a.categoria || a.tipo || "",
  }));
}

function mapSeveridade(g) {
  const s = String(g || "").toLowerCase();
  if (s === "critico" || s === "crit") return "crit";
  if (s === "alto" || s === "alta")    return "alto";
  if (s === "medio" || s === "média" || s === "media") return "med";
  return "bx";
}

export function topEstadosFromDashboard(visaoGeral, limit = 8) {
  const lista = visaoGeral?.por_estado;
  if (!Array.isArray(lista)) return null;
  return lista.slice(0, limit).map((e) => ({
    uf: e.estado,
    v: fmtInt(e.eleitos) + " eleitos",
    votos: e.votos,
    partidos: e.partidos,
  }));
}

function cargoShort(cargo) {
  if (!cargo) return "-";
  const c = String(cargo).toUpperCase();
  if (c.includes("PRESIDENTE"))   return "Pres";
  if (c.includes("GOVERNADOR"))   return "Gov";
  if (c.includes("SENADOR"))      return "Sen";
  if (c.includes("FEDERAL"))      return "Dep";
  if (c.includes("ESTADUAL"))     return "Dep";
  if (c.includes("PREFEITO"))     return "Pref";
  if (c.includes("VEREADOR"))     return "Ver";
  return c.slice(0, 4);
}

export function topCandidatosFromRadar(apiResp) {
  if (!apiResp?.items) return null;
  return apiResp.items.slice(0, 10).map((p) => ({
    id: p.candidato_id,
    nome: p.nome,
    partido: p.partido_sigla || "-",
    uf: p.estado_uf || "-",
    cargo: cargoShort(p.cargo),
    overall: p.overall ?? 0,
    tier: p.tier || "bronze",
  }));
}

export function movimentacoesFromAuditoria(apiResp) {
  const arr = Array.isArray(apiResp) ? apiResp : apiResp?.items || apiResp?.logs || [];
  if (!arr.length) return null;
  return arr.slice(0, 5).map((a) => ({
    hora: a.hora || a.criado_em_humano || (a.criado_em ? new Date(a.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "-"),
    evento: a.acao || a.tipo || "Atividade",
    detail: `${a.usuario_nome || a.quem || "-"} · ${a.objeto || a.detalhe || ""}`.trim(),
    icon: iconForAcao(a.acao || a.tipo),
  }));
}

function iconForAcao(acao) {
  const a = String(acao || "").toUpperCase();
  if (a.includes("LOGIN"))   return "UserCheck";
  if (a.includes("EXPORT"))  return "Download";
  if (a.includes("VIEW"))    return "FileSearch";
  if (a.includes("SYNC"))    return "Users";
  if (a.includes("ROLE"))    return "Settings";
  if (a.includes("COMMENT")) return "Bell";
  return "Briefcase";
}

export function auditFromAuditoria(apiResp) {
  const arr = Array.isArray(apiResp) ? apiResp : apiResp?.items || apiResp?.logs || [];
  if (!arr.length) return null;
  return arr.slice(0, 5).map((a) => ({
    who: a.usuario_nome || a.quem || "Sistema",
    what: `${(a.acao || a.tipo || "ação").toLowerCase()} · ${a.objeto || a.detalhe || ""}`.trim(),
    when: a.hora || a.criado_em_humano || (a.criado_em ? new Date(a.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "-"),
  }));
}

