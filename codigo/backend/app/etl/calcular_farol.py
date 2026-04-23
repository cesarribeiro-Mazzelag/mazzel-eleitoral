"""
Calcula o Farol de Força por município após a carga dos dados.
Verde / Amarelo / Vermelho para cada município × cargo × ano.
"""
from sqlalchemy import text

# Par de eleições para comparação
PARES_ELEICAO = {
    "municipal": [(2020, 2016), (2024, 2020)],
    "geral":     [(2022, 2018)],
}

CARGOS_MUNICIPAIS = ("VEREADOR", "PREFEITO", "VICE-PREFEITO")
CARGOS_GERAIS     = ("DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "SENADOR", "GOVERNADOR")


def _status(votos_atual, votos_ant, eleitos_atual, eleitos_ant):
    variacao = (votos_atual - votos_ant) / votos_ant if votos_ant > 0 else 0.0
    if eleitos_atual > 0 and variacao >= -0.05:
        return "VERDE"
    if eleitos_atual > 0 and variacao < -0.05:
        return "AMARELO"
    if eleitos_atual == 0 and votos_atual > 0 and variacao >= 0:
        return "AMARELO"
    return "VERMELHO"


def calcular_farol(conn):
    print("\n  Calculando Farol de Força...")

    # IDs dos partidos históricos
    rows = conn.execute(text("SELECT id FROM partidos WHERE numero IN (44, 25, 17)")).fetchall()
    partido_ids = [r[0] for r in rows]
    if not partido_ids:
        print("  ⚠ Nenhum partido encontrado")
        return

    rows_mun = conn.execute(text("SELECT id FROM municipios")).fetchall()
    mun_ids  = [r[0] for r in rows_mun]

    inseridos = 0
    for (ano_ref, ano_ant) in [*PARES_ELEICAO["municipal"], *PARES_ELEICAO["geral"]]:
        if ano_ref in (2024, 2020, 2016):
            cargos = CARGOS_MUNICIPAIS
        else:
            cargos = CARGOS_GERAIS

        for cargo in cargos:
            # Totais por município para os dois anos
            def _agg(ano):
                return conn.execute(text("""
                    SELECT
                        ca.municipio_id,
                        COALESCE(SUM(ca.votos_total), 0)           AS votos,
                        COUNT(*) FILTER (WHERE ca.eleito = TRUE)   AS eleitos
                    FROM candidaturas ca
                    WHERE ca.partido_id = ANY(:pids)
                      AND ca.ano = :ano
                      AND UPPER(ca.cargo) = :cargo
                      AND ca.municipio_id IS NOT NULL
                    GROUP BY ca.municipio_id
                """), {"pids": partido_ids, "ano": ano, "cargo": cargo.upper()}).fetchall()

            dados_ref = {r[0]: (r[1], r[2]) for r in _agg(ano_ref)}
            dados_ant = {r[0]: (r[1], r[2]) for r in _agg(ano_ant)}

            muns_com_dados = set(dados_ref) | set(dados_ant)
            for mun_id in muns_com_dados:
                votos_r, el_r = dados_ref.get(mun_id, (0, 0))
                votos_a, el_a = dados_ant.get(mun_id, (0, 0))

                if votos_r == 0 and votos_a == 0:
                    continue

                var = round((votos_r - votos_a) / votos_a * 100, 2) if votos_a > 0 else None
                st  = _status(votos_r, votos_a, el_r, el_a)

                conn.execute(text("""
                    INSERT INTO farol_municipio
                        (municipio_id, ano_referencia, cargo, status,
                         votos_atual, votos_anterior, variacao_pct,
                         eleitos_atual, eleitos_anterior)
                    VALUES (:mid, :ano, :cargo, :st, :vr, :va, :var, :er, :ea)
                    ON CONFLICT DO NOTHING
                """), {
                    "mid": mun_id, "ano": ano_ref, "cargo": cargo,
                    "st": st, "vr": votos_r, "va": votos_a,
                    "var": var, "er": el_r, "ea": el_a,
                })
                inseridos += 1

        conn.commit()
        print(f"    {ano_ref} vs {ano_ant}: {inseridos} registros de farol")
        inseridos = 0

    print("  ✓ Farol calculado")
