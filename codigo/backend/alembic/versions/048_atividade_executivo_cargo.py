"""048 - Adiciona campo cargo em atividade_executivo.

Objetivo: estender a tabela existente para suportar governadores e prefeitos
alem do presidente. Campo cargo discrimina o tipo de executivo.
Valores aceitos: presidente | governador | prefeito
Registros existentes (Lula) recebem DEFAULT 'presidente'.

Tambem relaxa o CHECK de tipo para aceitar 'decreto_estadual' e
'decreto_municipal' alem dos tipos ja existentes.
"""
from alembic import op
import sqlalchemy as sa


revision      = "048"
down_revision = "047"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # 1. Adiciona coluna cargo (default presidente para registros existentes)
    op.add_column(
        "atividade_executivo",
        sa.Column(
            "cargo",
            sa.String(20),
            nullable=False,
            server_default="presidente",
        ),
    )

    # 2. Remove o CHECK constraint antigo de tipo (limitado a 4 valores)
    op.drop_constraint("ck_atividade_executivo_tipo", "atividade_executivo", type_="check")

    # 3. Adiciona CHECK constraint novo que inclui tipos estaduais/municipais
    op.create_check_constraint(
        "ck_atividade_executivo_tipo",
        "atividade_executivo",
        "tipo IN ("
        "'sancao','veto','decreto','mensagem_congresso',"
        "'decreto_estadual','mensagem_assembleia',"
        "'decreto_municipal','projeto_lei_municipal'"
        ")",
    )

    # 4. Adiciona CHECK constraint para cargo
    op.create_check_constraint(
        "ck_atividade_executivo_cargo",
        "atividade_executivo",
        "cargo IN ('presidente','governador','prefeito')",
    )

    # 5. Indice para filtros por cargo
    op.create_index(
        "ix_atividade_executivo_cargo",
        "atividade_executivo",
        ["cargo"],
    )


def downgrade() -> None:
    op.drop_index("ix_atividade_executivo_cargo", table_name="atividade_executivo")
    op.drop_constraint("ck_atividade_executivo_cargo", "atividade_executivo", type_="check")
    op.drop_constraint("ck_atividade_executivo_tipo", "atividade_executivo", type_="check")
    op.create_check_constraint(
        "ck_atividade_executivo_tipo",
        "atividade_executivo",
        "tipo IN ('sancao','veto','decreto','mensagem_congresso')",
    )
    op.drop_column("atividade_executivo", "cargo")
