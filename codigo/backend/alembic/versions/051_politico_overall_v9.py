"""051 - Tabela politico_overall_v9 (fonte unica do overall).

Cesar 25/04/2026: resolve a inconsistencia entre `/radar/politicos` e
`/dossie/{id}` — ambos passam a ler da mesma tabela em vez de calcular
em paralelo. Tambem precalcula o overall_v9 (ATV/LEG/BSE/INF/MID/PAC)
pra ordenacao SQL real (antes era proxy + reorder em Python).

PK (candidato_id, ciclo_ano) permite multiplos ciclos por candidato
(ex: LULA 2018 e 2022). `calc_version` versiona a formula — quando
ajustar pesos, o backfill regrava com a nova versao.

Backfill priorizado (script externo): eleitos + cargos altos + alta
votacao. Demais candidatos ficam sem linha aqui e o `/radar` retorna
overall=NULL pra eles. `/dossie/{id}` calcula on-the-fly e persiste
quando acessado individualmente (lazy warmup).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision      = "051"
down_revision = "050"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        "politico_overall_v9",
        sa.Column("candidato_id", sa.BigInteger, nullable=False),
        sa.Column("ciclo_ano", sa.SmallInteger, nullable=False),

        # Sub-medidas v9 (0-99 ou NULL)
        sa.Column("atv", sa.SmallInteger, nullable=True),
        sa.Column("leg", sa.SmallInteger, nullable=True),
        sa.Column("bse", sa.SmallInteger, nullable=True),
        sa.Column("inf", sa.SmallInteger, nullable=True),
        sa.Column("mid", sa.SmallInteger, nullable=True),
        sa.Column("pac", sa.SmallInteger, nullable=True),

        # Overall final (0-99 ou NULL)
        sa.Column("overall", sa.SmallInteger, nullable=True),
        sa.Column("tier", sa.Text, nullable=True),  # dourado | ouro | prata | bronze
        sa.Column("traits", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("arquetipos", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("bonus_aplicados", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("penalidades_aplicadas", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),

        # Versionamento + auditoria
        sa.Column("calc_version", sa.Text, nullable=False, server_default="v9.0"),
        sa.Column("calculado_em", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("now()")),

        sa.PrimaryKeyConstraint("candidato_id", "ciclo_ano"),
    )

    # Index pra ordenacao por overall (NULLS LAST natural no PG quando DESC)
    op.create_index(
        "ix_overall_v9_overall_desc",
        "politico_overall_v9",
        [sa.text("overall DESC NULLS LAST")],
        postgresql_where=sa.text("overall IS NOT NULL"),
    )
    # Index pra filtro por tier
    op.create_index("ix_overall_v9_tier", "politico_overall_v9", ["tier"])
    # Index pra ciclo (consultas por ano)
    op.create_index("ix_overall_v9_ciclo", "politico_overall_v9", ["ciclo_ano"])


def downgrade() -> None:
    op.drop_index("ix_overall_v9_ciclo", table_name="politico_overall_v9")
    op.drop_index("ix_overall_v9_tier", table_name="politico_overall_v9")
    op.drop_index("ix_overall_v9_overall_desc", table_name="politico_overall_v9")
    op.drop_table("politico_overall_v9")
