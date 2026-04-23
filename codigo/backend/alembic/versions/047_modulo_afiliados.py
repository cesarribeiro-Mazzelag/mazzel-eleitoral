"""047 - Módulo Afiliados: 5 tabelas base.

Cesar 21/04/2026: gestão de filiados, repasses, treinamentos,
comunicações e saúde da base partidária.
Tabelas criadas (com prefixo afil_):
  1. afil_filiado        — perfil do filiado com status, tags, contribuição
  2. afil_repasse        — repasses financeiros mensais (fundo partidário, doações)
  3. afil_treinamento    — cursos e treinamentos da base
  4. afil_comunicacao    — campanhas de comunicação enviadas
  5. afil_saude_base     — série histórica de filiações/cancelamentos por mês

Decisões:
  - Prefixo afil_ para isolamento de namespace
  - CPF armazenado como hash SHA-256 (CHAR 64) — privacidade por design
  - total em afil_repasse é persistido no insert (não GENERATED)
  - canal em afil_comunicacao é TEXT livre (ex: "Email+WhatsApp")
  - genero e data_nascimento adicionados ao filiado para suportar /afiliados/demografia
  - tenant_id em todas as tabelas (multi-tenant)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision      = "047"
down_revision = "046"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. afil_filiado
    # ------------------------------------------------------------------
    op.create_table(
        "afil_filiado",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.Integer(),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("nome_completo", sa.String(400), nullable=False),
        sa.Column("cpf_hash", sa.CHAR(64), nullable=True),           # SHA-256 hex
        sa.Column("cidade", sa.String(200), nullable=True),
        sa.Column("uf", sa.String(2), nullable=True),
        sa.Column("status", sa.String(10),
                  sa.CheckConstraint(
                      "status IN ('ativo','inativo','suspenso')",
                      name="ck_afil_filiado_status",
                  ),
                  nullable=False, default="ativo"),
        sa.Column("data_filiacao", sa.Date(), nullable=True),
        sa.Column("contribuinte_em_dia", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("treinamentos_concluidos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tags", JSONB(), nullable=True),                    # array de strings
        sa.Column("genero", sa.String(20), nullable=True),            # para /demografia
        sa.Column("data_nascimento", sa.Date(), nullable=True),       # para faixa etária
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=True),
    )
    op.create_index("ix_afil_filiado_tenant_id", "afil_filiado", ["tenant_id"])
    op.create_index("ix_afil_filiado_tenant_status", "afil_filiado", ["tenant_id", "status"])

    # ------------------------------------------------------------------
    # 2. afil_repasse
    # ------------------------------------------------------------------
    op.create_table(
        "afil_repasse",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.Integer(),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("mes_ref", sa.Date(), nullable=False),              # primeiro dia do mês
        sa.Column("fundo_partidario", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("fundo_especial", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("doacoes", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("total", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_afil_repasse_tenant_id", "afil_repasse", ["tenant_id"])
    op.create_index("ix_afil_repasse_tenant_mes", "afil_repasse", ["tenant_id", "mes_ref"])

    # ------------------------------------------------------------------
    # 3. afil_treinamento
    # ------------------------------------------------------------------
    op.create_table(
        "afil_treinamento",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.Integer(),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("nome_curso", sa.String(400), nullable=False),
        sa.Column("inscritos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("concluintes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("nps", sa.Integer(),
                  sa.CheckConstraint(
                      "nps IS NULL OR (nps >= 0 AND nps <= 100)",
                      name="ck_afil_treinamento_nps",
                  ),
                  nullable=True),
        sa.Column("data_proxima", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_afil_treinamento_tenant_id", "afil_treinamento", ["tenant_id"])

    # ------------------------------------------------------------------
    # 4. afil_comunicacao
    # ------------------------------------------------------------------
    op.create_table(
        "afil_comunicacao",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.Integer(),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("assunto", sa.String(500), nullable=False),
        sa.Column("canal", sa.Text(), nullable=True),                 # ex: "Email+WhatsApp"
        sa.Column("enviados", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("aberturas", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cliques", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("enviado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_afil_comunicacao_tenant_id", "afil_comunicacao", ["tenant_id"])

    # ------------------------------------------------------------------
    # 5. afil_saude_base
    # ------------------------------------------------------------------
    op.create_table(
        "afil_saude_base",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.Integer(),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("mes_ref", sa.Date(), nullable=False),              # primeiro dia do mês
        sa.Column("filiacoes_mes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cancelamentos_mes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_afil_saude_base_tenant_id", "afil_saude_base", ["tenant_id"])
    op.create_index("ix_afil_saude_base_tenant_mes", "afil_saude_base", ["tenant_id", "mes_ref"])

    # ------------------------------------------------------------------
    # 6. atividade_executivo (Parte 2 - Presidente)
    # ------------------------------------------------------------------
    op.create_table(
        "atividade_executivo",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("candidato_id", sa.Integer(),
                  sa.ForeignKey("candidatos.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("data", sa.Date(), nullable=True),
        sa.Column("tipo", sa.String(30),
                  sa.CheckConstraint(
                      "tipo IN ('sancao','veto','decreto','mensagem_congresso')",
                      name="ck_atividade_executivo_tipo",
                  ),
                  nullable=False),
        sa.Column("titulo", sa.Text(), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("url_fonte", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_atividade_executivo_candidato_id", "atividade_executivo", ["candidato_id"])
    op.create_index("ix_atividade_executivo_tipo", "atividade_executivo", ["tipo"])
    op.create_index("ix_atividade_executivo_data", "atividade_executivo", ["data"])


def downgrade() -> None:
    op.drop_table("atividade_executivo")
    op.drop_table("afil_saude_base")
    op.drop_table("afil_comunicacao")
    op.drop_table("afil_treinamento")
    op.drop_table("afil_repasse")
    op.drop_table("afil_filiado")
