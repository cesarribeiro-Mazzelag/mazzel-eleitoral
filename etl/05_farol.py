"""
PASSO 5 — Calcular Farol por Município
Popula a tabela `farol_municipio` com status AZUL/VERDE/AMARELO/VERMELHO
para cada município × cargo × partido × ano, para TODOS os partidos.

Algoritmo baseado em percentual de mandatos (pct_mandatos = eleitos_partido / total_eleitos_municipio):

  AZUL     — partido tem ≥30% dos mandatos da câmara (força hegemônica — pode bloquear e liderar)
  VERDE    — partido tem 15-29% dos mandatos (força relevante, participa da maioria)
  AMARELO  — partido tem >0% e <15% dos mandatos, OU votação ≥5% sem mandato (presença frágil)
  VERMELHO — partido tem 0 mandatos E <5% dos votos municipais (ausência ou presença simbólica)

Nota: "total_eleitos_municipio" = total de eleitos de TODOS os partidos naquele cargo/município/ano.
Isso representa os assentos disponíveis na câmara/colégio (ex: câmara de vereadores).
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))

from sqlalchemy import text
from db import get_session, test_connection
from config import ANOS_MUNICIPAIS, ANOS_GERAIS, TODOS_OS_ANOS

# Pares (ano_atual, ano_anterior) para comparação
PARES_MUNICIPAIS = [
    (2024, 2020), (2020, 2016), (2016, 2012), (2012, 2008),
]
PARES_GERAIS = [
    (2022, 2018), (2018, 2014), (2014, 2010), (2010, 2006),
]
TODOS_OS_PARES = PARES_MUNICIPAIS + PARES_GERAIS

# Limiares de mandatos para classificação de força
PCT_FORCA      = 0.30  # ≥30% dos mandatos → AZUL (força hegemônica)
PCT_EQUILIBRIO = 0.15  # 15-29% → VERDE (força relevante)
PCT_EXPRESSIVO = 0.05  # ≥5% dos votos sem mandato → AMARELO (expressivo)


def calcular_farol_municipio(
    municipio_id: int,
    partido_id: int,
    cargo: str,
    ano_atual: int,
    ano_anterior: int,
    session,
) -> dict | None:
    """
    Calcula o farol para um município + partido + cargo.
    Usa % de mandatos como métrica principal.
    Retorna dict com campos para inserção, ou None se sem dados.
    """
    # Votos e eleitos no ano atual para este partido
    r_atual = session.execute(
        text("""
            SELECT
                COALESCE(SUM(c.votos_total), 0) AS votos,
                COUNT(CASE WHEN c.eleito THEN 1 END) AS eleitos
            FROM candidaturas c
            WHERE c.municipio_id = :mid
              AND c.partido_id = :pid
              AND c.cargo = :cargo
              AND c.ano = :ano
        """),
        {"mid": municipio_id, "pid": partido_id, "cargo": cargo, "ano": ano_atual}
    ).fetchone()

    if not r_atual or r_atual[0] == 0:
        return None

    votos_atual   = int(r_atual[0])
    eleitos_atual = int(r_atual[1])

    # Total de eleitos do município neste cargo (todos os partidos)
    r_total_eleitos = session.execute(
        text("""
            SELECT COUNT(CASE WHEN c.eleito THEN 1 END)
            FROM candidaturas c
            WHERE c.municipio_id = :mid AND c.cargo = :cargo AND c.ano = :ano
        """),
        {"mid": municipio_id, "cargo": cargo, "ano": ano_atual}
    ).scalar()
    total_eleitos_municipio = int(r_total_eleitos or 0)

    # Total de votos do município neste cargo (todos os partidos)
    r_total_votos = session.execute(
        text("""
            SELECT COALESCE(SUM(votos_total), 0)
            FROM candidaturas
            WHERE municipio_id = :mid AND cargo = :cargo AND ano = :ano
        """),
        {"mid": municipio_id, "cargo": cargo, "ano": ano_atual}
    ).scalar()
    total_votos_municipio = int(r_total_votos or 0)

    # Métricas percentuais
    pct_mandatos = (eleitos_atual / total_eleitos_municipio) if total_eleitos_municipio > 0 else 0.0
    pct_votos    = (votos_atual / total_votos_municipio) if total_votos_municipio > 0 else 0.0

    # Votos e eleitos no ano anterior (para variação histórica)
    r_anterior = session.execute(
        text("""
            SELECT COALESCE(SUM(c.votos_total), 0) AS votos,
                   COUNT(CASE WHEN c.eleito THEN 1 END) AS eleitos
            FROM candidaturas c
            WHERE c.municipio_id = :mid
              AND c.partido_id = :pid
              AND c.cargo = :cargo
              AND c.ano = :ano
        """),
        {"mid": municipio_id, "pid": partido_id, "cargo": cargo, "ano": ano_anterior}
    ).fetchone()

    votos_anterior   = int(r_anterior[0]) if r_anterior else 0
    eleitos_anterior = int(r_anterior[1]) if r_anterior else 0

    if votos_anterior > 0:
        variacao_pct = (votos_atual - votos_anterior) / votos_anterior * 100
    else:
        variacao_pct = 100.0 if votos_atual > 0 else 0.0

    # ── Algoritmo 4 cores ──────────────────────────────────────────────────
    # AZUL     ≥ 30% dos mandatos da câmara (força hegemônica)
    # VERDE    15-29% dos mandatos (força relevante)
    # AMARELO  > 0 mandato e <15%, OU ≥5% dos votos sem mandato
    # VERMELHO 0 mandatos e <5% dos votos (ausência / presença simbólica)
    if pct_mandatos >= PCT_FORCA:
        status = "AZUL"
    elif pct_mandatos >= PCT_EQUILIBRIO:
        status = "VERDE"
    elif eleitos_atual > 0 or pct_votos >= PCT_EXPRESSIVO:
        status = "AMARELO"
    else:
        status = "VERMELHO"

    return {
        "municipio_id":           municipio_id,
        "partido_id":             partido_id,
        "cargo":                  cargo,
        "ano_referencia":         ano_atual,
        "status":                 status,
        "votos_atual":            votos_atual,
        "votos_anterior":         votos_anterior,
        "variacao_pct":           round(variacao_pct, 2),
        "eleitos_atual":          eleitos_atual,
        "eleitos_anterior":       eleitos_anterior,
        "pct_mandatos":           round(pct_mandatos * 100, 2),
        "total_eleitos_municipio": total_eleitos_municipio,
    }


def calcular_todos_os_farois(anos: list[int] = None):
    if not test_connection():
        return False

    session = get_session()
    try:
        # Carrega combos únicos de (municipio_id, partido_id, cargo, ano)
        # que existem em candidaturas — só processa o que tem dado real
        print("[farol] Buscando combinações com dados...")

        pares = TODOS_OS_PARES
        if anos:
            pares = [(a, p) for a, p in pares if a in anos]

        total_inseridos = 0
        total_atualizados = 0

        for ano_atual, ano_anterior in pares:
            print(f"\n[farol] Calculando {ano_anterior} → {ano_atual}")

            # Busca todos os combos de municipio + partido + cargo que têm dados
            combos = session.execute(
                text("""
                    SELECT DISTINCT municipio_id, partido_id, cargo
                    FROM candidaturas
                    WHERE ano = :ano AND municipio_id IS NOT NULL
                    ORDER BY municipio_id, partido_id, cargo
                """),
                {"ano": ano_atual}
            ).fetchall()

            print(f"  {len(combos)} combinações encontradas")

            for i, (municipio_id, partido_id, cargo) in enumerate(combos):
                if not municipio_id or not partido_id:
                    continue

                resultado = calcular_farol_municipio(
                    municipio_id, partido_id, cargo,
                    ano_atual, ano_anterior, session
                )

                if not resultado:
                    continue

                # Upsert
                existente = session.execute(
                    text("""
                        SELECT id FROM farol_municipio
                        WHERE municipio_id = :mid AND partido_id = :pid
                          AND cargo = :cargo AND ano_referencia = :ano
                    """),
                    {
                        "mid": municipio_id, "pid": partido_id,
                        "cargo": cargo, "ano": ano_atual,
                    }
                ).fetchone()

                if existente:
                    session.execute(
                        text("""
                            UPDATE farol_municipio
                            SET status = :status,
                                votos_atual = :votos_atual, votos_anterior = :votos_anterior,
                                variacao_pct = :variacao_pct,
                                eleitos_atual = :eleitos_atual, eleitos_anterior = :eleitos_anterior,
                                pct_mandatos = :pct_mandatos,
                                total_eleitos_municipio = :total_eleitos_municipio,
                                calculado_em = NOW()
                            WHERE municipio_id = :municipio_id AND partido_id = :partido_id
                              AND cargo = :cargo AND ano_referencia = :ano_referencia
                        """),
                        {**resultado}
                    )
                    total_atualizados += 1
                else:
                    session.execute(
                        text("""
                            INSERT INTO farol_municipio
                                (municipio_id, partido_id, cargo, ano_referencia,
                                 status, votos_atual, votos_anterior, variacao_pct,
                                 eleitos_atual, eleitos_anterior,
                                 pct_mandatos, total_eleitos_municipio,
                                 calculado_em)
                            VALUES
                                (:municipio_id, :partido_id, :cargo, :ano_referencia,
                                 :status, :votos_atual, :votos_anterior, :variacao_pct,
                                 :eleitos_atual, :eleitos_anterior,
                                 :pct_mandatos, :total_eleitos_municipio,
                                 NOW())
                        """),
                        {**resultado}
                    )
                    total_inseridos += 1

                if (total_inseridos + total_atualizados) % 1000 == 0:
                    session.commit()
                    print(f"  {i+1}/{len(combos)} processados...", end="\r")

            session.commit()
            print(f"  {len(combos)} processados.")

        total_db = session.execute(text("SELECT COUNT(*) FROM farol_municipio")).scalar()
        print(f"\n[farol] Inseridos: {total_inseridos} | Atualizados: {total_atualizados}")
        print(f"[farol] Total banco: {total_db} registros de farol")
        return True

    except Exception as e:
        session.rollback()
        print(f"[farol] ERRO: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    import sys as _sys
    anos_arg = None
    if len(_sys.argv) > 1:
        anos_arg = [int(a) for a in _sys.argv[1:]]

    print("=== Passo 5 — Calcular Farol por Município ===\n")
    calcular_todos_os_farois(anos_arg)
    print("\n[done]")
