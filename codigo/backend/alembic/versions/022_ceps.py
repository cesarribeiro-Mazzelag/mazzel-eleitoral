"""CEP — camada de validacao e refinamento de microregioes

CEP NAO eh fonte de geometria (regra do Cesar 13/04/2026).
Eh apenas fonte de:
  - bairro popular (DNE Correios via CNEFE IBGE)
  - validacao de coerencia das microregioes
  - refinamento de nome quando bairro dominante eh claro

Tabela `ceps`:
  - cep            (PK, 8 digitos sem hifen)
  - bairro / cidade / uf
  - lat, lng       (geolocalizacao do CEP via CNEFE)
  - codigo_setor   (FK setores_censitarios — ja vem do CNEFE)

Colunas novas em `microregioes`:
  - bairro_dominante_cep   — bairro com maior numero de CEPs nesta micro
  - pct_bairro_dominante   — % CEPs do bairro dominante (0-100)
  - n_bairros_cep          — contagem de bairros distintos
  - flag_inconsistencia_cep — TRUE se >3 bairros distintos
  - flag_revisao_nome      — TRUE se 40-59% (zona cinza, precisa human review)
"""
from alembic import op
import sqlalchemy as sa


revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ceps",
        sa.Column("cep", sa.String(8), primary_key=True),
        sa.Column("bairro", sa.String(200), nullable=True),
        sa.Column("cidade", sa.String(200), nullable=True),
        sa.Column("uf", sa.String(2), nullable=True),
        sa.Column("lat", sa.Numeric(10, 6), nullable=True),
        sa.Column("lng", sa.Numeric(10, 6), nullable=True),
        sa.Column("codigo_setor", sa.String(15), nullable=True),
        sa.Column("origem", sa.String(20), nullable=False, server_default="cnefe"),
        sa.Column("criado_em", sa.DateTime, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["codigo_setor"], ["setores_censitarios.codigo_setor"]),
    )
    op.create_index("idx_ceps_setor", "ceps", ["codigo_setor"])
    op.create_index("idx_ceps_cidade_uf", "ceps", ["cidade", "uf"])
    op.create_index("idx_ceps_bairro", "ceps", ["bairro"])

    # Colunas novas em microregioes
    op.add_column("microregioes", sa.Column("bairro_dominante_cep", sa.String(200), nullable=True))
    op.add_column("microregioes", sa.Column("pct_bairro_dominante", sa.Numeric(5, 2), nullable=True))
    op.add_column("microregioes", sa.Column("n_bairros_cep", sa.Integer, nullable=True, server_default="0"))
    op.add_column("microregioes", sa.Column("flag_inconsistencia_cep", sa.Boolean, nullable=False, server_default="false"))
    op.add_column("microregioes", sa.Column("flag_revisao_nome", sa.Boolean, nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("microregioes", "flag_revisao_nome")
    op.drop_column("microregioes", "flag_inconsistencia_cep")
    op.drop_column("microregioes", "n_bairros_cep")
    op.drop_column("microregioes", "pct_bairro_dominante")
    op.drop_column("microregioes", "bairro_dominante_cep")
    op.drop_index("idx_ceps_bairro", table_name="ceps")
    op.drop_index("idx_ceps_cidade_uf", table_name="ceps")
    op.drop_index("idx_ceps_setor", table_name="ceps")
    op.drop_table("ceps")
