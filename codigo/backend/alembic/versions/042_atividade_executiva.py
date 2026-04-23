"""042 - Schema atividade_executiva (Presidentes, Governadores, Prefeitos).

Cesar 18/04/2026: "todos os cargos tem trabalho, ate o presidente". O dossie
precisa mostrar atividade independente do cargo.

Separado de `mandatos_legislativo` porque:
  - Cargos diferentes (PRESIDENTE, GOVERNADOR, PREFEITO)
  - Atos diferentes (MP, Decreto, Veto) vs proposicoes legislativas
  - Periodos de mandato (ano_inicio / ano_fim) vs legislatura

Fontes:
  - Presidente: API Camara (MPs, PLs Executivo, Vetos) + DOU (decretos - fase 2)
  - Governador: DO estadual (fase 2, caro de coletar)
  - Prefeito: ja coberto financeiramente via execucao_orcamentaria_municipal
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision      = "042"
down_revision = "041"
branch_labels = None
depends_on    = None


cargo_exec = postgresql.ENUM(
    "PRESIDENTE", "VICE_PRESIDENTE",
    "GOVERNADOR", "VICE_GOVERNADOR",
    "PREFEITO", "VICE_PREFEITO",
    name="cargo_executivo_enum",
    create_type=True,
)

tipo_ato = postgresql.ENUM(
    "MP",               # Medida Provisoria
    "PL_EXECUTIVO",     # Projeto de Lei enviado pelo Executivo
    "PLP_EXECUTIVO",    # Projeto de Lei Complementar
    "PEC_EXECUTIVO",    # PEC do Executivo
    "VETO",             # Veto presidencial/governador
    "DECRETO",          # Decreto (DOU/DO)
    "MSG",              # Mensagem ao Legislativo
    "INDICACAO",        # Indicacao STF/STJ/TCU/PGR (presidente)
    name="tipo_ato_executivo_enum",
    create_type=True,
)


def upgrade() -> None:
    cargo_exec.create(op.get_bind(), checkfirst=True)
    tipo_ato.create(op.get_bind(), checkfirst=True)

    # ── mandatos_executivo ─────────────────────────────────────────────
    op.create_table(
        "mandatos_executivo",
        sa.Column("id",                  sa.Integer, primary_key=True),
        sa.Column("cargo",               postgresql.ENUM(
                                            "PRESIDENTE", "VICE_PRESIDENTE",
                                            "GOVERNADOR", "VICE_GOVERNADOR",
                                            "PREFEITO", "VICE_PREFEITO",
                                            name="cargo_executivo_enum",
                                            create_type=False),
                                          nullable=False),
        sa.Column("candidato_id",        sa.Integer,
                                          sa.ForeignKey("candidatos.id", ondelete="SET NULL"),
                                          nullable=True),
        sa.Column("nome",                sa.String(200), nullable=False),
        sa.Column("nome_completo",       sa.String(300), nullable=True),
        sa.Column("partido_sigla",       sa.String(20),  nullable=True),
        sa.Column("uf",                  sa.String(2),   nullable=True),
        sa.Column("municipio_id",        sa.Integer,
                                          sa.ForeignKey("municipios.id", ondelete="SET NULL"),
                                          nullable=True),
        sa.Column("ano_inicio",          sa.Integer, nullable=False),
        sa.Column("ano_fim",             sa.Integer, nullable=True),
        sa.Column("foto_url",            sa.Text, nullable=True),
        sa.Column("url_oficial",         sa.Text, nullable=True),
        sa.Column("ativo",               sa.Boolean, server_default="true"),
        sa.Column("criado_em",           sa.DateTime, server_default=sa.text("now()")),
        sa.Column("atualizado_em",       sa.DateTime, nullable=True),
    )
    op.create_index("ix_mandatos_exec_cargo_ano",
                    "mandatos_executivo", ["cargo", "ano_inicio"])
    op.create_index("ix_mandatos_exec_candidato",
                    "mandatos_executivo", ["candidato_id"])
    op.create_index("ix_mandatos_exec_nome",
                    "mandatos_executivo", ["nome"])
    op.create_unique_constraint(
        "uq_mandatos_exec_cargo_inicio_nome",
        "mandatos_executivo", ["cargo", "ano_inicio", "nome"])

    # ── atos_executivo ────────────────────────────────────────────────
    op.create_table(
        "atos_executivo",
        sa.Column("id",                  sa.Integer, primary_key=True),
        sa.Column("mandato_id",          sa.Integer,
                                          sa.ForeignKey("mandatos_executivo.id", ondelete="CASCADE"),
                                          nullable=False),
        sa.Column("tipo",                postgresql.ENUM(
                                            "MP", "PL_EXECUTIVO", "PLP_EXECUTIVO",
                                            "PEC_EXECUTIVO", "VETO", "DECRETO",
                                            "MSG", "INDICACAO",
                                            name="tipo_ato_executivo_enum",
                                            create_type=False),
                                          nullable=False),
        sa.Column("id_externo",          sa.String(30),  nullable=False),
        sa.Column("numero",              sa.Integer,     nullable=True),
        sa.Column("ano",                 sa.Integer,     nullable=True),
        sa.Column("data_apresentacao",   sa.Date,        nullable=True),
        sa.Column("ementa",              sa.Text,        nullable=True),
        sa.Column("situacao",            sa.String(100), nullable=True),
        sa.Column("aprovada",            sa.Boolean,     nullable=True),
        sa.Column("url",                 sa.Text,        nullable=True),
        sa.Column("fonte",               sa.String(40),  nullable=False),
        sa.Column("criado_em",           sa.DateTime,    server_default=sa.text("now()")),
    )
    op.create_index("ix_atos_mandato_tipo",
                    "atos_executivo", ["mandato_id", "tipo"])
    op.create_index("ix_atos_tipo_ano",
                    "atos_executivo", ["tipo", "ano"])
    op.create_index("ix_atos_aprovada",
                    "atos_executivo", ["aprovada"])
    op.create_unique_constraint(
        "uq_atos_tipo_id_externo",
        "atos_executivo", ["tipo", "id_externo"])


def downgrade() -> None:
    op.drop_constraint("uq_atos_tipo_id_externo", "atos_executivo", type_="unique")
    op.drop_index("ix_atos_aprovada", "atos_executivo")
    op.drop_index("ix_atos_tipo_ano", "atos_executivo")
    op.drop_index("ix_atos_mandato_tipo", "atos_executivo")
    op.drop_table("atos_executivo")

    op.drop_constraint("uq_mandatos_exec_cargo_inicio_nome", "mandatos_executivo", type_="unique")
    op.drop_index("ix_mandatos_exec_nome", "mandatos_executivo")
    op.drop_index("ix_mandatos_exec_candidato", "mandatos_executivo")
    op.drop_index("ix_mandatos_exec_cargo_ano", "mandatos_executivo")
    op.drop_table("mandatos_executivo")

    tipo_ato.drop(op.get_bind(), checkfirst=True)
    cargo_exec.drop(op.get_bind(), checkfirst=True)
