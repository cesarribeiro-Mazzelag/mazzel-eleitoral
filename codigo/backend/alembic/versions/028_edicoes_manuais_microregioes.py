"""Log de edicoes manuais de microzonas.

Cesar (13/04/2026 21h): vai editar microzonas manualmente pra me ensinar o
padrao de correcao dele. Eu monitoro via tabela de edicoes e depois
automatizo. Por isso o log precisa preservar TUDO: geometry antes, depois,
diff de area, timestamp, usuario.

Essa tabela vai ser a fonte de dados de aprendizado. SQL analitico vai
rodar em cima dela pra extrair padroes (quais vertices move, quais reducoes
de area faz, etc).
"""
from alembic import op
import sqlalchemy as sa


revision = "028"
down_revision = "027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "microregiao_edicoes_manuais",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("microregiao_id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=False),
            server_default=sa.func.now(), nullable=False,
        ),
        # Geometria completa antes e depois - permite analise diff posterior
        sa.Column(
            "geometry_antes",
            sa.Text(),  # Guardado como EWKT pra flexibilidade de analise
            nullable=False,
        ),
        sa.Column(
            "geometry_depois",
            sa.Text(),
            nullable=False,
        ),
        sa.Column("n_vertices_antes", sa.Integer(), nullable=False),
        sa.Column("n_vertices_depois", sa.Integer(), nullable=False),
        sa.Column("area_antes_m2", sa.Float(), nullable=False),
        sa.Column("area_depois_m2", sa.Float(), nullable=False),
        sa.Column("diff_area_m2", sa.Float(), nullable=False),
        sa.Column(
            "motivo", sa.String(200), nullable=True,
            comment="Opcional - usuario pode explicar a correcao",
        ),
        sa.ForeignKeyConstraint(
            ["microregiao_id"], ["microregioes.id"], ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["usuarios.id"], ondelete="SET NULL",
        ),
    )
    op.create_index(
        "idx_mrem_microregiao",
        "microregiao_edicoes_manuais",
        ["microregiao_id", "created_at"],
    )
    op.create_index(
        "idx_mrem_usuario",
        "microregiao_edicoes_manuais",
        ["usuario_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_mrem_usuario", table_name="microregiao_edicoes_manuais")
    op.drop_index("idx_mrem_microregiao", table_name="microregiao_edicoes_manuais")
    op.drop_table("microregiao_edicoes_manuais")
