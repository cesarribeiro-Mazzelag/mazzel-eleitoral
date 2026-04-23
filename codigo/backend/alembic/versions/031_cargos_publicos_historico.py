"""Cargos publicos historico + situacao detalhada do mandato legislativo.

Cesar 16/04/2026: dossie precisa mostrar carreira completa no setor publico
(nao so mandatos eletivos). Fontes: API Camara, Wikidata, DOU.

1. mandatos_legislativo:
   - situacao: enum textual da API Camara (Exercicio, Licenciado, Suplencia,
     Afastado, Vacancia, Convocado, ...). Null quando ETL ainda nao rodou.
   - condicao_eleitoral: Titular | Suplente
   - licenciado_para: texto livre (ex: "Ministro da Fazenda", "Prefeito SP")

2. Nova tabela cargos_publicos_historico:
   - Cargos executivos anteriores (ministros, secretarios, cargos em comissao)
   - Fonte auditavel (wikidata / api_camara / dou / manual)
"""
from alembic import op
import sqlalchemy as sa


revision = "031"
down_revision = "030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # mandatos_legislativo: campos novos
    op.add_column("mandatos_legislativo",
                  sa.Column("situacao", sa.String(40), nullable=True))
    op.add_column("mandatos_legislativo",
                  sa.Column("condicao_eleitoral", sa.String(40), nullable=True))
    op.add_column("mandatos_legislativo",
                  sa.Column("licenciado_para", sa.String(200), nullable=True))

    # cargos_publicos_historico: carreira executiva/tecnica no setor publico
    op.create_table(
        "cargos_publicos_historico",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("candidato_id", sa.Integer,
                  sa.ForeignKey("candidatos.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("cargo", sa.String(300), nullable=False),
        sa.Column("orgao", sa.String(300), nullable=True),
        sa.Column("esfera", sa.String(20), nullable=True),   # federal | estadual | municipal
        sa.Column("uf", sa.String(2), nullable=True),
        sa.Column("inicio", sa.Date, nullable=True),
        sa.Column("fim", sa.Date, nullable=True),
        sa.Column("fonte", sa.String(30), nullable=False),  # wikidata | api_camara | dou | manual
        sa.Column("fonte_ref", sa.Text, nullable=True),     # URL/ID do item na fonte
        sa.Column("criado_em", sa.DateTime(timezone=False),
                  server_default=sa.text("now()")),
    )
    op.create_index("ix_cargos_hist_candidato",
                    "cargos_publicos_historico", ["candidato_id"])
    op.create_index("ix_cargos_hist_periodo",
                    "cargos_publicos_historico", ["inicio", "fim"])
    # Evita duplicar mesmo cargo/orgao/inicio pra mesma pessoa
    op.create_unique_constraint(
        "uq_cargos_hist_chave",
        "cargos_publicos_historico",
        ["candidato_id", "cargo", "orgao", "inicio"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_cargos_hist_chave", "cargos_publicos_historico",
                       type_="unique")
    op.drop_index("ix_cargos_hist_periodo", "cargos_publicos_historico")
    op.drop_index("ix_cargos_hist_candidato", "cargos_publicos_historico")
    op.drop_table("cargos_publicos_historico")
    op.drop_column("mandatos_legislativo", "licenciado_para")
    op.drop_column("mandatos_legislativo", "condicao_eleitoral")
    op.drop_column("mandatos_legislativo", "situacao")
