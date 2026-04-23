"""044 - Historico de buscas do usuario no mapa eleitoral.

Cesar 20/04/2026: tornar a busca da topbar mais inteligente. Quando o usuario
foca o input (sem digitar), mostrar as regioes que ele mais procurou. Score
futuro: frequencia * 0.7 + recencia * 0.3.

Tabela `usuario_buscas`:
  - Registra cada clique em sugestao confirmada (NAO keystroke).
  - Colunas: user_id, tipo (municipio/estado/bairro/zona/politico/partido),
    valor (codigo_ibge | uf | cd_dist | numero_zona | id_politico | num_partido),
    nome (label legivel, ex "Sao Paulo" ou "PSD"), criado_em.
  - Indexes: (user_id, criado_em DESC) pra buscar recentes.
"""
from alembic import op
import sqlalchemy as sa


revision      = "044"
down_revision = "043"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        "usuario_buscas",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("valor", sa.String(50), nullable=False),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("uf", sa.String(2), nullable=True),
        sa.Column("contexto", sa.String(200), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_usuario_buscas_user_criado",
        "usuario_buscas",
        ["user_id", sa.text("criado_em DESC")],
    )
    op.create_index(
        "ix_usuario_buscas_user_tipo_valor",
        "usuario_buscas",
        ["user_id", "tipo", "valor"],
    )


def downgrade() -> None:
    op.drop_index("ix_usuario_buscas_user_tipo_valor", table_name="usuario_buscas")
    op.drop_index("ix_usuario_buscas_user_criado", table_name="usuario_buscas")
    op.drop_table("usuario_buscas")
