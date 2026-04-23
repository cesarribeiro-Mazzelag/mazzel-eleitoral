"""Cobertura eleitoral das microzonas.

Reflexao Cesar + GPT (13/04/2026): microzona eh unidade territorial, nao
unidade-de-escola. A escola eh o ponto oficial de apuracao mas nao define
a microzona - o TERRITORIO define. Toda microzona tem cobertura eleitoral:
- direta, se tem escola interna
- estimada, se depende de escolas vizinhas

Esta migration cria a tabela de cobertura + 2 colunas auxiliares na
propria `microregioes` pra analise rapida (dominante / contagem).

Regra de ouro: toda microzona deve ter valor, cor e posicao no gradiente.
Nunca "sem dado".
"""
from alembic import op
import sqlalchemy as sa


revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tabela de cobertura: N escolas por microzona com peso normalizado.
    op.create_table(
        "microregiao_escola_cobertura",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("microregiao_id", sa.Integer(), nullable=False),
        sa.Column("local_votacao_id", sa.Integer(), nullable=False),
        # peso normalizado: soma == 1.0 por microregiao_id
        sa.Column("peso", sa.Float(), nullable=False),
        sa.Column("distancia_m", sa.Float(), nullable=True),
        # tipos:
        #   'interna'             - escola dentro do poligono
        #   'vizinha_estimativa'  - escola em microzona adjacente ou proxima
        #   'vizinha_distante'    - escola a > 3km (marcada como suspeita)
        #   'manual'              - edicao manual (futuro)
        sa.Column("tipo_cobertura", sa.String(30), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=False),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["microregiao_id"], ["microregioes.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["local_votacao_id"], ["locais_votacao.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint(
            "microregiao_id", "local_votacao_id",
            name="uq_mrcob_microzona_local",
        ),
        sa.CheckConstraint("peso > 0 AND peso <= 1", name="ck_mrcob_peso_range"),
    )
    op.create_index(
        "idx_mrcob_microregiao",
        "microregiao_escola_cobertura",
        ["microregiao_id"],
    )
    op.create_index(
        "idx_mrcob_tipo",
        "microregiao_escola_cobertura",
        ["tipo_cobertura"],
    )

    # Cache na microregioes pra consulta/debug rapido.
    op.add_column(
        "microregioes",
        sa.Column("tipo_cobertura_dominante", sa.String(30), nullable=True),
    )
    op.add_column(
        "microregioes",
        sa.Column("n_escolas_cobertura", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("microregioes", "n_escolas_cobertura")
    op.drop_column("microregioes", "tipo_cobertura_dominante")
    op.drop_index("idx_mrcob_tipo", table_name="microregiao_escola_cobertura")
    op.drop_index("idx_mrcob_microregiao", table_name="microregiao_escola_cobertura")
    op.drop_table("microregiao_escola_cobertura")
