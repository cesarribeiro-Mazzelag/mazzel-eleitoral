"""Microregioes: freeze, versao, hash e audit log.

Microzona vira unidade territorial operacional (nao apenas visual).
Precisa de garantias de identidade estavel e auditoria de mudancas.

Colunas novas em `microregioes`:
- congelada_em TIMESTAMP NULL    - marca microzona aprovada como intocavel pelo ETL
- congelada_por INTEGER NULL     - FK usuarios, quem congelou
- hash_geometria VARCHAR(32)     - md5 do ST_AsText(geometry), detecta drift
- versao INTEGER DEFAULT 1       - incrementa a cada UPDATE efetivo

Tabela nova `microregioes_audit`:
- log leve de mudancas (so hash + metadado, nao o blob da geometria)
- versao unica por microregiao + timestamp

Regra operacional:
- ETL nunca faz DELETE, so UPDATE.
- UPDATE so acontece se congelada_em IS NULL.
- Toda mudanca de geometria vira linha em microregioes_audit.

Plano aprovado (Claude + GPT + Cesar) em 13/04/2026.
"""
from alembic import op
import sqlalchemy as sa


revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "microregioes",
        sa.Column("congelada_em", sa.TIMESTAMP(timezone=False), nullable=True),
    )
    op.add_column(
        "microregioes",
        sa.Column("congelada_por", sa.Integer(), nullable=True),
    )
    op.add_column(
        "microregioes",
        sa.Column("hash_geometria", sa.String(32), nullable=True),
    )
    op.add_column(
        "microregioes",
        sa.Column("versao", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_foreign_key(
        "fk_microregioes_congelada_por",
        "microregioes",
        "usuarios",
        ["congelada_por"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "idx_microregioes_congelada",
        "microregioes",
        ["congelada_em"],
        postgresql_where=sa.text("congelada_em IS NOT NULL"),
    )

    op.create_table(
        "microregioes_audit",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("microregiao_id", sa.Integer(), nullable=False),
        sa.Column("versao", sa.Integer(), nullable=False),
        sa.Column("hash_geometria", sa.String(32), nullable=False),
        sa.Column("motivo", sa.String(200), nullable=True),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
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
            ["usuario_id"], ["usuarios.id"], ondelete="SET NULL"
        ),
        sa.UniqueConstraint(
            "microregiao_id", "versao", name="uq_microregioes_audit_versao"
        ),
    )
    op.create_index(
        "idx_microregioes_audit_mr",
        "microregioes_audit",
        ["microregiao_id", "created_at"],
    )

    # Popular hash inicial para todas microregioes ja existentes
    # (ETL 23 no Pirituba ja rodou antes desta migration).
    op.execute("""
        UPDATE microregioes
        SET hash_geometria = md5(ST_AsText(geometry))
        WHERE hash_geometria IS NULL
    """)


def downgrade() -> None:
    op.drop_index("idx_microregioes_audit_mr", table_name="microregioes_audit")
    op.drop_table("microregioes_audit")
    op.drop_index("idx_microregioes_congelada", table_name="microregioes")
    op.drop_constraint(
        "fk_microregioes_congelada_por", "microregioes", type_="foreignkey"
    )
    op.drop_column("microregioes", "versao")
    op.drop_column("microregioes", "hash_geometria")
    op.drop_column("microregioes", "congelada_por")
    op.drop_column("microregioes", "congelada_em")
