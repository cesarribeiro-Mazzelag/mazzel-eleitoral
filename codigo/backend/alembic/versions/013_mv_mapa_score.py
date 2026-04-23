"""013 - Materialized views de score e dominância do mapa eleitoral

Revision ID: 013
Revises: 012
Create Date: 2026-04-10

Cria 4 materialized views para acelerar as consultas do mapa eleitoral
e padronizar a fonte de verdade para nivel_farol/score_normalizado:

  mv_score_estado          - score ponderado por (ano, cargo, turno, partido, estado)
  mv_score_municipio       - score ponderado por (ano, cargo, turno, partido, município)
  mv_dominancia_estado     - partido + candidato dominante por (ano, cargo, turno, estado)
  mv_dominancia_municipio  - partido + candidato dominante por (ano, cargo, turno, município)

Cada MV tem um índice UNIQUE para permitir REFRESH MATERIALIZED VIEW CONCURRENTLY
(refresh manual no fim do ETL via run_all.py).

O score_ponderado já incorpora o peso do cargo:
  PRESIDENTE=500, GOVERNADOR=100, SENADOR=60, DEPUTADO FEDERAL=20,
  PREFEITO=15, DEPUTADO ESTADUAL/DISTRITAL=8, VEREADOR=1.

Bairro/distrito fica fora desta migration: o link votos↔bairro depende de
locais_votacao.bairro (string sem geometria) ou de spatial join com
distritos_municipio (custoso). Será adicionado quando o frontend exigir.
"""

from alembic import op


revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


# Expressão SQL reutilizável para o peso por cargo
PESO_CARGO_SQL = """
    CASE UPPER(ca.cargo)
        WHEN 'PRESIDENTE'         THEN 500
        WHEN 'GOVERNADOR'         THEN 100
        WHEN 'SENADOR'            THEN 60
        WHEN 'DEPUTADO FEDERAL'   THEN 20
        WHEN 'PREFEITO'           THEN 15
        WHEN 'DEPUTADO ESTADUAL'  THEN 8
        WHEN 'DEPUTADO DISTRITAL' THEN 8
        WHEN 'VEREADOR'           THEN 1
        ELSE 0
    END
"""


def upgrade() -> None:
    # ── 1. mv_score_estado ────────────────────────────────────────────────
    # Agregação por estado para cada (ano, cargo, turno, partido).
    # Cobre tanto cargos municipais (agregados) quanto estaduais/nacionais.
    op.execute(f"""
        CREATE MATERIALIZED VIEW mv_score_estado AS
        SELECT
            ca.ano,
            UPPER(ca.cargo)                                AS cargo,
            COALESCE(ca.turno, 1)                          AS turno,
            ca.partido_id,
            p.numero                                       AS partido_numero,
            p.sigla                                        AS partido_sigla,
            ca.estado_uf,
            COUNT(*) FILTER (WHERE ca.eleito = TRUE)       AS n_eleitos,
            COUNT(*)                                       AS n_candidatos,
            COALESCE(SUM(ca.votos_total), 0)               AS total_votos,
            COALESCE(SUM(
                CASE WHEN ca.eleito = TRUE THEN {PESO_CARGO_SQL} ELSE 0 END
            ), 0)                                          AS score_ponderado
        FROM candidaturas ca
        JOIN partidos p ON p.id = ca.partido_id
        WHERE ca.estado_uf IS NOT NULL
        GROUP BY ca.ano, UPPER(ca.cargo), COALESCE(ca.turno, 1),
                 ca.partido_id, p.numero, p.sigla, ca.estado_uf
        WITH DATA
    """)

    op.execute("""
        CREATE UNIQUE INDEX ux_mv_score_estado
        ON mv_score_estado (ano, cargo, turno, partido_id, estado_uf)
    """)
    op.execute("""
        CREATE INDEX ix_mv_score_estado_lookup
        ON mv_score_estado (estado_uf, cargo, ano, turno)
    """)
    op.execute("""
        CREATE INDEX ix_mv_score_estado_partido
        ON mv_score_estado (partido_numero, ano, cargo, turno)
    """)

    # ── 2. mv_score_municipio ─────────────────────────────────────────────
    # Granularidade municipal. Apenas linhas com municipio_id (cargos
    # municipais — vereador, prefeito). Cargos estaduais/nacionais ficam
    # em mv_score_estado.
    op.execute(f"""
        CREATE MATERIALIZED VIEW mv_score_municipio AS
        SELECT
            ca.ano,
            UPPER(ca.cargo)                                AS cargo,
            COALESCE(ca.turno, 1)                          AS turno,
            ca.partido_id,
            p.numero                                       AS partido_numero,
            p.sigla                                        AS partido_sigla,
            ca.municipio_id,
            m.codigo_ibge,
            m.estado_uf,
            COUNT(*) FILTER (WHERE ca.eleito = TRUE)       AS n_eleitos,
            COUNT(*)                                       AS n_candidatos,
            COALESCE(SUM(ca.votos_total), 0)               AS total_votos,
            COALESCE(SUM(
                CASE WHEN ca.eleito = TRUE THEN {PESO_CARGO_SQL} ELSE 0 END
            ), 0)                                          AS score_ponderado
        FROM candidaturas ca
        JOIN partidos p   ON p.id = ca.partido_id
        JOIN municipios m ON m.id = ca.municipio_id
        WHERE ca.municipio_id IS NOT NULL
        GROUP BY ca.ano, UPPER(ca.cargo), COALESCE(ca.turno, 1),
                 ca.partido_id, p.numero, p.sigla,
                 ca.municipio_id, m.codigo_ibge, m.estado_uf
        WITH DATA
    """)

    op.execute("""
        CREATE UNIQUE INDEX ux_mv_score_municipio
        ON mv_score_municipio (ano, cargo, turno, partido_id, municipio_id)
    """)
    op.execute("""
        CREATE INDEX ix_mv_score_municipio_lookup
        ON mv_score_municipio (municipio_id, cargo, ano, turno)
    """)
    op.execute("""
        CREATE INDEX ix_mv_score_municipio_estado
        ON mv_score_municipio (estado_uf, cargo, ano, turno, partido_numero)
    """)
    op.execute("""
        CREATE INDEX ix_mv_score_municipio_codigo
        ON mv_score_municipio (codigo_ibge, cargo, ano, turno)
    """)

    # ── 3. mv_dominancia_estado ───────────────────────────────────────────
    # Para cada (ano, cargo, turno, estado) qual partido tem mais votos e
    # quem é o candidato dominante (top em votos). Usado para tooltip X9.
    op.execute("""
        CREATE MATERIALIZED VIEW mv_dominancia_estado AS
        SELECT DISTINCT ON (ano, cargo, turno, estado_uf)
            ano,
            cargo,
            turno,
            estado_uf,
            partido_id,
            partido_numero,
            partido_sigla,
            candidato_id,
            dominante_nome,
            dominante_votos
        FROM (
            SELECT
                ca.ano,
                UPPER(ca.cargo)              AS cargo,
                COALESCE(ca.turno, 1)        AS turno,
                ca.estado_uf,
                ca.partido_id,
                p.numero                     AS partido_numero,
                p.sigla                      AS partido_sigla,
                ca.candidato_id,
                COALESCE(c.nome_urna, c.nome_completo) AS dominante_nome,
                COALESCE(ca.votos_total, 0)  AS dominante_votos
            FROM candidaturas ca
            JOIN partidos   p ON p.id = ca.partido_id
            JOIN candidatos c ON c.id = ca.candidato_id
            WHERE ca.estado_uf IS NOT NULL
        ) sub
        ORDER BY ano, cargo, turno, estado_uf, dominante_votos DESC NULLS LAST
        WITH DATA
    """)

    op.execute("""
        CREATE UNIQUE INDEX ux_mv_dominancia_estado
        ON mv_dominancia_estado (ano, cargo, turno, estado_uf)
    """)
    op.execute("""
        CREATE INDEX ix_mv_dominancia_estado_partido
        ON mv_dominancia_estado (partido_numero, ano, cargo, turno)
    """)

    # ── 4. mv_dominancia_municipio ────────────────────────────────────────
    # Para cada (ano, cargo, turno, município) qual partido + candidato
    # dominante (mais votos). Apenas cargos municipais.
    op.execute("""
        CREATE MATERIALIZED VIEW mv_dominancia_municipio AS
        SELECT DISTINCT ON (ano, cargo, turno, municipio_id)
            ano,
            cargo,
            turno,
            municipio_id,
            codigo_ibge,
            estado_uf,
            partido_id,
            partido_numero,
            partido_sigla,
            candidato_id,
            dominante_nome,
            dominante_votos
        FROM (
            SELECT
                ca.ano,
                UPPER(ca.cargo)              AS cargo,
                COALESCE(ca.turno, 1)        AS turno,
                ca.municipio_id,
                m.codigo_ibge,
                m.estado_uf,
                ca.partido_id,
                p.numero                     AS partido_numero,
                p.sigla                      AS partido_sigla,
                ca.candidato_id,
                COALESCE(c.nome_urna, c.nome_completo) AS dominante_nome,
                COALESCE(ca.votos_total, 0)  AS dominante_votos
            FROM candidaturas ca
            JOIN partidos   p ON p.id = ca.partido_id
            JOIN candidatos c ON c.id = ca.candidato_id
            JOIN municipios m ON m.id = ca.municipio_id
            WHERE ca.municipio_id IS NOT NULL
        ) sub
        ORDER BY ano, cargo, turno, municipio_id, dominante_votos DESC NULLS LAST
        WITH DATA
    """)

    op.execute("""
        CREATE UNIQUE INDEX ux_mv_dominancia_municipio
        ON mv_dominancia_municipio (ano, cargo, turno, municipio_id)
    """)
    op.execute("""
        CREATE INDEX ix_mv_dominancia_municipio_codigo
        ON mv_dominancia_municipio (codigo_ibge, ano, cargo, turno)
    """)
    op.execute("""
        CREATE INDEX ix_mv_dominancia_municipio_estado
        ON mv_dominancia_municipio (estado_uf, ano, cargo, turno)
    """)


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_dominancia_municipio")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_dominancia_estado")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_score_municipio")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_score_estado")
