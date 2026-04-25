/* Adapter: /mapa/estado/{uf}/eleitos + /forcas -> ufDetail shape do Designer.
 *
 * Combina:
 *   - eleitos.cargos: contagem por cargo + top 3 mais votados
 *   - forcas.partidos: partido dominante (top 1) e % cadeiras
 *
 * Campos sem endpoint (emendas R$, alertas abertos, trend YoY) ficam null
 * e a UI mostra "-". */

export function buildUfDetail({ uf, eleitos, forcas }) {
  const cargos = eleitos?.cargos || [];
  const byCargo = (nome) =>
    cargos.find((c) => c.cargo === nome)?.eleitos?.length || 0;

  const topPartido = forcas?.partidos?.[0];
  const partidoDominante = topPartido?.partido_sigla || "-";

  // Top 3 políticos: agrega todos os eleitos, ordena por votos desc
  const todosEleitos = cargos.flatMap((c) => c.eleitos || []);
  todosEleitos.sort((a, b) => (b.votos || 0) - (a.votos || 0));
  const top3 = todosEleitos.slice(0, 3).map((p) => ({
    id: p.candidato_id,
    nome: p.nome,
    partido: p.partido_sigla || "-",
    overall: null,  // não vem deste endpoint
    votos: p.votos,
  }));

  // Score regional: % de cadeiras do partido dominante (proxy simples)
  const score = topPartido?.pct_cadeiras != null ? Math.round(topPartido.pct_cadeiras) : null;

  return {
    uf,
    partido: partidoDominante,
    score,
    eleitos: eleitos?.total_eleitos ?? 0,
    senadores: byCargo("SENADOR"),
    deputados: byCargo("DEPUTADO FEDERAL"),
    prefeitos: byCargo("PREFEITO"),
    emendas: null,         // sem endpoint
    alertas: null,         // precisa request separada
    trend: null,           // sem endpoint de YoY
    top3,
  };
}
