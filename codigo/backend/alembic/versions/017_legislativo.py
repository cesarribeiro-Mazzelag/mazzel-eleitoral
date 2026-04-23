"""017 - Tabelas legislativas (Câmara dos Deputados + Senado Federal)

Revision ID: 017
Revises: 016
Create Date: 2026-04-11

Adiciona o pipeline legislativo do Dossiê Político (Fase 3 do Radar):
  - mandatos_legislativo: deputados/senadores em exercício, com vínculo
    opcional ao candidato_id do TSE (matched por nome + UF)
  - proposicoes_legislativo: projetos apresentados pelos parlamentares
    (PL, PEC, PDL, REQ etc) com ementa, ano, tema, situação

Fonte:
  - Câmara: https://dadosabertos.camara.leg.br/api/v2/
  - Senado: https://legis.senado.leg.br/dadosabertos/

Match candidato_id é best-effort (API não publica CPF). Quando falhar,
o mandato existe mas candidato_id fica null - o dossiê ainda funciona
quando o usuário busca pelo nome.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision      = "017"
down_revision = "016"
branch_labels = None
depends_on    = None


casa_enum = postgresql.ENUM(
    "CAMARA", "SENADO",
    name="casa_legislativa_enum",
    create_type=True,
)


def upgrade() -> None:
    casa_enum.create(op.get_bind(), checkfirst=True)

    # ── mandatos_legislativo ─────────────────────────────────────────────────
    op.create_table(
        "mandatos_legislativo",
        sa.Column("id",                  sa.Integer, primary_key=True),
        sa.Column("casa",                postgresql.ENUM("CAMARA", "SENADO",
                                            name="casa_legislativa_enum",
                                            create_type=False),
                  nullable=False),
        # ID na API externa (Câmara: deputados/{id}.id; Senado: CodigoParlamentar)
        sa.Column("id_externo",          sa.String(20),  nullable=False),
        sa.Column("nome",                sa.String(200), nullable=False),
        sa.Column("nome_civil",          sa.String(300), nullable=True),
        sa.Column("partido_sigla",       sa.String(20),  nullable=True),
        sa.Column("uf",                  sa.String(2),   nullable=True),
        sa.Column("legislatura",         sa.Integer,     nullable=True),  # 57 = 2023-2026
        sa.Column("foto_url",            sa.Text,        nullable=True),
        sa.Column("email",               sa.String(200), nullable=True),
        # Match best-effort com TSE (pode ser null se nome não bater)
        sa.Column("candidato_id",        sa.Integer,
                  sa.ForeignKey("candidatos.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("ativo",               sa.Boolean,     server_default="true"),
        sa.Column("criado_em",           sa.DateTime,    server_default=sa.text("now()")),
        sa.Column("atualizado_em",       sa.DateTime,    nullable=True),
    )
    op.create_index("ix_mandatos_casa",       "mandatos_legislativo", ["casa"])
    op.create_index("ix_mandatos_externo",    "mandatos_legislativo", ["casa", "id_externo"], unique=True)
    op.create_index("ix_mandatos_candidato",  "mandatos_legislativo", ["candidato_id"])
    op.create_index("ix_mandatos_uf_partido", "mandatos_legislativo", ["uf", "partido_sigla"])

    # ── proposicoes_legislativo ──────────────────────────────────────────────
    op.create_table(
        "proposicoes_legislativo",
        sa.Column("id",                  sa.Integer, primary_key=True),
        sa.Column("casa",                postgresql.ENUM("CAMARA", "SENADO",
                                            name="casa_legislativa_enum",
                                            create_type=False),
                  nullable=False),
        # ID na API externa
        sa.Column("id_externo",          sa.String(30),  nullable=False),
        sa.Column("mandato_id",          sa.Integer,
                  sa.ForeignKey("mandatos_legislativo.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("sigla_tipo",          sa.String(10),  nullable=False),  # PL, PEC, PDL, REQ
        sa.Column("numero",              sa.Integer,     nullable=True),
        sa.Column("ano",                 sa.Integer,     nullable=True),
        sa.Column("data_apresentacao",   sa.Date,        nullable=True),
        sa.Column("ementa",              sa.Text,        nullable=True),
        sa.Column("situacao",            sa.String(100), nullable=True),  # 'Aprovada', 'Em tramitação', etc
        sa.Column("aprovada",            sa.Boolean,     nullable=True),
        sa.Column("tema",                sa.String(100), nullable=True),
        sa.Column("criado_em",           sa.DateTime,    server_default=sa.text("now()")),
    )
    op.create_index("ix_proposicoes_mandato",  "proposicoes_legislativo", ["mandato_id"])
    op.create_index("ix_proposicoes_externo",  "proposicoes_legislativo", ["casa", "id_externo"], unique=True)
    op.create_index("ix_proposicoes_ano",      "proposicoes_legislativo", ["ano"])
    op.create_index("ix_proposicoes_aprovada", "proposicoes_legislativo", ["aprovada"])


def downgrade() -> None:
    op.drop_index("ix_proposicoes_aprovada", "proposicoes_legislativo")
    op.drop_index("ix_proposicoes_ano",      "proposicoes_legislativo")
    op.drop_index("ix_proposicoes_externo",  "proposicoes_legislativo")
    op.drop_index("ix_proposicoes_mandato",  "proposicoes_legislativo")
    op.drop_table("proposicoes_legislativo")

    op.drop_index("ix_mandatos_uf_partido", "mandatos_legislativo")
    op.drop_index("ix_mandatos_candidato",  "mandatos_legislativo")
    op.drop_index("ix_mandatos_externo",    "mandatos_legislativo")
    op.drop_index("ix_mandatos_casa",       "mandatos_legislativo")
    op.drop_table("mandatos_legislativo")

    casa_enum.drop(op.get_bind(), checkfirst=True)
