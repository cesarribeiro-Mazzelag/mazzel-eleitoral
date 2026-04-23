"""046 - Fundação do Módulo Campanha: 6 tabelas base.

Cesar 20/04/2026: modelagem completa para gestão de campanhas eleitorais.
Tabelas criadas (com prefixo camp_):
  1. camp_pessoas_base      — perfil unificado do indivíduo (CRM)
  2. camp_campanhas         — entidade mãe de cada corrida eleitoral
  3. camp_cercas_virtuais   — polígonos PostGIS com equipe (iFood-style)
  4. camp_papeis_campanha   — vínculo pessoa-papel-campanha-território (histórico)
  5. camp_metas_cerca       — objetivos por cerca
  6. camp_cercas_agregacoes — cache de KPIs (atualizado via worker)

Decisões arquiteturais:
  - Prefixo camp_ (não schema separado) — consistente com o projeto
  - UUIDs como PKs — escala melhor, não expõe sequência
  - Enums como CHECK constraints (não tipo PG ENUM) — mais flexível para evolução
  - PostGIS POLYGON + POINT SRID 4326 (WGS84)
  - CPF CHAR(11) com CHECK de formato (somente dígitos)
  - Orçamento em centavos (BigInteger, não float)
  - tenant_id em todas tabelas de topo (isolamento multi-tenant)
  - FKs com ON DELETE CASCADE onde perda de pai implica perda do filho
  - Ordem de criação: pessoas -> campanhas -> cercas -> papeis -> metas -> agregacoes
    (respeita dependências de FK; responsavel_papel_id em cercas é nullable)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY


revision      = "046"
down_revision = "045"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. camp_pessoas_base
    # ------------------------------------------------------------------
    op.create_table(
        "camp_pessoas_base",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", sa.Integer(),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("nome_completo", sa.String(400), nullable=False),
        sa.Column("nome_politico", sa.String(200), nullable=True),
        # CPF somente dígitos, 11 chars, unique por tenant via índice parcial
        sa.Column("cpf", sa.String(11), nullable=True),
        sa.Column("data_nascimento", sa.Date(), nullable=True),
        sa.Column("foto_url", sa.Text(), nullable=True),
        sa.Column("telefone", sa.String(20), nullable=True),
        sa.Column("whatsapp", sa.String(20), nullable=True),
        sa.Column("email", sa.String(300), nullable=True),
        sa.Column("endereco_json", sa.JSON(), nullable=True),
        sa.Column("instagram_handle", sa.String(100), nullable=True),
        sa.Column("facebook_url", sa.Text(), nullable=True),
        sa.Column("tiktok_handle", sa.String(100), nullable=True),
        sa.Column("youtube_url", sa.Text(), nullable=True),
        sa.Column("twitter_handle", sa.String(100), nullable=True),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column("fonte_cadastro", sa.String(20), nullable=False,
                  server_default="manual"),
        sa.Column("cpf_verificado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(10), nullable=False, server_default="ativo"),
        sa.Column("criado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=True),
        # CHECK constraints
        sa.CheckConstraint(
            "cpf IS NULL OR (LENGTH(cpf) = 11 AND cpf ~ '^[0-9]{11}$')",
            name="ck_camp_pessoas_cpf_formato",
        ),
        sa.CheckConstraint(
            "fonte_cadastro IN ('tse_import','manual','oauth','migracao_legada')",
            name="ck_camp_pessoas_fonte_cadastro",
        ),
        sa.CheckConstraint(
            "status IN ('ativo','inativo','falecido','removido')",
            name="ck_camp_pessoas_status",
        ),
    )
    op.create_index("ix_camp_pessoas_tenant_id",    "camp_pessoas_base", ["tenant_id"])
    op.create_index("ix_camp_pessoas_status",       "camp_pessoas_base", ["status"])
    op.create_index("ix_camp_pessoas_data_nasc",    "camp_pessoas_base", ["data_nascimento"])
    # Unique por tenant: cpf (apenas quando não NULL)
    op.create_index("ix_camp_pessoas_tenant_cpf",
                    "camp_pessoas_base", ["tenant_id", "cpf"],
                    unique=True, postgresql_where=sa.text("cpf IS NOT NULL"))
    # Unique por tenant: email (apenas quando não NULL)
    op.create_index("ix_camp_pessoas_tenant_email",
                    "camp_pessoas_base", ["tenant_id", "email"],
                    unique=True, postgresql_where=sa.text("email IS NOT NULL"))

    # ------------------------------------------------------------------
    # 2. camp_campanhas
    # ------------------------------------------------------------------
    op.create_table(
        "camp_campanhas",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", sa.Integer(),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("nome", sa.String(300), nullable=False),
        sa.Column("candidato_pessoa_id", UUID(as_uuid=True),
                  sa.ForeignKey("camp_pessoas_base.id", ondelete="RESTRICT"),
                  nullable=False),
        sa.Column("cargo_disputado", sa.String(20), nullable=False),
        sa.Column("ciclo_eleitoral", sa.Integer(), nullable=False),
        sa.Column("uf", sa.String(2), nullable=True),
        sa.Column("municipio_id", sa.Integer(),
                  sa.ForeignKey("municipios.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("orcamento_total_centavos", sa.BigInteger(), nullable=True,
                  server_default="0"),
        sa.Column("fonte_orcamento_json", sa.JSON(), nullable=True),
        sa.Column("metas_json", sa.JSON(), nullable=True),
        sa.Column("periodo_atual", sa.String(20), nullable=False,
                  server_default="pre_campanha"),
        sa.Column("data_inicio", sa.DateTime(timezone=True), nullable=True),
        sa.Column("data_encerramento", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(15), nullable=False, server_default="ativa"),
        sa.Column("criado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=True),
        sa.CheckConstraint(
            "cargo_disputado IN ('PRESIDENTE','GOVERNADOR','SENADOR','DEP_FEDERAL','DEP_ESTADUAL','PREFEITO','VEREADOR')",
            name="ck_camp_campanhas_cargo",
        ),
        sa.CheckConstraint(
            "periodo_atual IN ('pre_campanha','convencao','campanha','segundo_turno','pos')",
            name="ck_camp_campanhas_periodo",
        ),
        sa.CheckConstraint(
            "status IN ('ativa','encerrada','arquivada')",
            name="ck_camp_campanhas_status",
        ),
    )
    op.create_index("ix_camp_campanhas_tenant_id",    "camp_campanhas", ["tenant_id"])
    op.create_index("ix_camp_campanhas_candidato_id", "camp_campanhas", ["candidato_pessoa_id"])
    op.create_index("ix_camp_campanhas_ciclo",        "camp_campanhas", ["ciclo_eleitoral"])
    op.create_index("ix_camp_campanhas_uf",           "camp_campanhas", ["uf"])
    op.create_index("ix_camp_campanhas_municipio_id", "camp_campanhas", ["municipio_id"])
    op.create_index("ix_camp_campanhas_status",       "camp_campanhas", ["status"])
    op.create_index("ix_camp_campanhas_tenant_ciclo", "camp_campanhas", ["tenant_id", "ciclo_eleitoral"])

    # ------------------------------------------------------------------
    # 3. camp_cercas_virtuais
    # responsavel_papel_id FK para camp_papeis_campanha adicionado depois
    # ------------------------------------------------------------------
    op.create_table(
        "camp_cercas_virtuais",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("campanha_id", UUID(as_uuid=True),
                  sa.ForeignKey("camp_campanhas.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("parent_id", UUID(as_uuid=True),
                  sa.ForeignKey("camp_cercas_virtuais.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("cor_hex", sa.String(7), nullable=False, server_default="#3B82F6"),
        # responsavel_papel_id será adicionado como ALTER TABLE após criar camp_papeis_campanha
        # poligono e centro são colunas PostGIS - adicionadas via op.execute após create_table
        sa.Column("tipo_criacao", sa.String(20), nullable=False, server_default="lasso"),
        sa.Column("raio_metros", sa.Integer(), nullable=True),
        sa.Column("bairros_oficiais_ids", ARRAY(sa.Text()), nullable=True),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column("data_criacao", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("status", sa.String(10), nullable=False, server_default="ativa"),
        sa.Column("criado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=True),
        sa.CheckConstraint(
            "tipo_criacao IN ('raio','bairros_oficiais','lasso','import_kml')",
            name="ck_camp_cercas_tipo_criacao",
        ),
        sa.CheckConstraint(
            "status IN ('ativa','arquivada')",
            name="ck_camp_cercas_status",
        ),
        sa.CheckConstraint(
            "cor_hex ~ '^#[0-9A-Fa-f]{6}$'",
            name="ck_camp_cercas_cor_hex",
        ),
    )
    # Adicionar colunas PostGIS via SQL direto (não há suporte nativo no op.add_column para Geometry)
    op.execute(
        "ALTER TABLE camp_cercas_virtuais "
        "ADD COLUMN poligono geometry(Polygon,4326)"
    )
    op.execute(
        "ALTER TABLE camp_cercas_virtuais "
        "ADD COLUMN centro geometry(Point,4326)"
    )
    op.create_index("ix_camp_cercas_campanha_id",    "camp_cercas_virtuais", ["campanha_id"])
    op.create_index("ix_camp_cercas_parent_id",      "camp_cercas_virtuais", ["parent_id"])
    op.create_index("ix_camp_cercas_status",         "camp_cercas_virtuais", ["status"])
    # Spatial index GIST para queries PostGIS
    op.execute(
        "CREATE INDEX ix_camp_cercas_poligono_gist "
        "ON camp_cercas_virtuais USING GIST (poligono)"
    )

    # ------------------------------------------------------------------
    # 4. camp_papeis_campanha
    # ------------------------------------------------------------------
    op.create_table(
        "camp_papeis_campanha",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("pessoa_id", UUID(as_uuid=True),
                  sa.ForeignKey("camp_pessoas_base.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("campanha_id", UUID(as_uuid=True),
                  sa.ForeignKey("camp_campanhas.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("papel", sa.String(25), nullable=False),
        sa.Column("cerca_virtual_id", UUID(as_uuid=True),
                  sa.ForeignKey("camp_cercas_virtuais.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("superior_id", UUID(as_uuid=True),
                  sa.ForeignKey("camp_papeis_campanha.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("data_inicio", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("data_fim", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(10), nullable=False, server_default="ativo"),
        sa.Column("criado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=True),
        sa.CheckConstraint(
            "papel IN ('lideranca','delegado','coord_regional','coord_territorial','cabo','apoiador','candidato')",
            name="ck_camp_papeis_papel",
        ),
        sa.CheckConstraint(
            "status IN ('ativo','inativo','suspenso')",
            name="ck_camp_papeis_status",
        ),
        # Hierarquia: delegado e candidato são raízes — não têm superior
        sa.CheckConstraint(
            "(papel IN ('delegado','candidato') AND superior_id IS NULL) OR "
            "(papel NOT IN ('delegado','candidato'))",
            name="ck_camp_papeis_hierarquia_raiz",
        ),
    )
    op.create_index("ix_camp_papeis_pessoa_id",      "camp_papeis_campanha", ["pessoa_id"])
    op.create_index("ix_camp_papeis_campanha_id",    "camp_papeis_campanha", ["campanha_id"])
    op.create_index("ix_camp_papeis_cerca_id",       "camp_papeis_campanha", ["cerca_virtual_id"])
    op.create_index("ix_camp_papeis_superior_id",    "camp_papeis_campanha", ["superior_id"])
    op.create_index("ix_camp_papeis_papel",          "camp_papeis_campanha", ["papel"])
    op.create_index("ix_camp_papeis_status",         "camp_papeis_campanha", ["status"])
    op.create_index("ix_camp_papeis_pessoa_campanha","camp_papeis_campanha", ["pessoa_id", "campanha_id"])

    # ------------------------------------------------------------------
    # Agora adicionar FK responsavel_papel_id em cercas (círculo camp_cercas -> camp_papeis)
    # ------------------------------------------------------------------
    op.add_column(
        "camp_cercas_virtuais",
        sa.Column("responsavel_papel_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_camp_cercas_responsavel_papel_id_camp_papeis_campanha",
        "camp_cercas_virtuais",
        "camp_papeis_campanha",
        ["responsavel_papel_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_camp_cercas_responsavel_id", "camp_cercas_virtuais", ["responsavel_papel_id"])

    # ------------------------------------------------------------------
    # 5. camp_metas_cerca
    # ------------------------------------------------------------------
    op.create_table(
        "camp_metas_cerca",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("cerca_virtual_id", UUID(as_uuid=True),
                  sa.ForeignKey("camp_cercas_virtuais.id", ondelete="CASCADE"),
                  nullable=False, unique=True),
        sa.Column("votos_meta", sa.Integer(), nullable=True),
        sa.Column("eleitores_estimados", sa.Integer(), nullable=True),
        sa.Column("cobertura_pct_meta", sa.Integer(), nullable=True),
        sa.Column("visitas_cabo_meta", sa.Integer(), nullable=True),
        sa.Column("data_limite", sa.Date(), nullable=True),
        sa.Column("prioridade", sa.String(10), nullable=False, server_default="media"),
        sa.Column("criado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=True),
        sa.CheckConstraint(
            "cobertura_pct_meta IS NULL OR (cobertura_pct_meta >= 0 AND cobertura_pct_meta <= 100)",
            name="ck_camp_metas_cobertura_pct",
        ),
        sa.CheckConstraint(
            "prioridade IN ('critica','alta','media','baixa')",
            name="ck_camp_metas_prioridade",
        ),
    )
    op.create_index("ix_camp_metas_cerca_id", "camp_metas_cerca", ["cerca_virtual_id"])

    # ------------------------------------------------------------------
    # 6. camp_cercas_agregacoes  (PK = FK, 1:1 com cerca)
    # ------------------------------------------------------------------
    op.create_table(
        "camp_cercas_agregacoes",
        sa.Column("cerca_virtual_id", UUID(as_uuid=True),
                  sa.ForeignKey("camp_cercas_virtuais.id", ondelete="CASCADE"),
                  primary_key=True, nullable=False),
        sa.Column("votos_historicos_json", sa.JSON(), nullable=True),
        sa.Column("crescimento_pct_ultimo_ciclo", sa.Float(), nullable=True),
        sa.Column("liderancas_ativas_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cabos_ativos_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("escolas_eleitorais_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("zonas_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score_performance", sa.Float(), nullable=True),
        sa.Column("classificacao", sa.String(10), nullable=True),
        sa.Column("tendencia", sa.String(10), nullable=True),
        sa.Column("atualizado_em", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "score_performance IS NULL OR (score_performance >= 0 AND score_performance <= 100)",
            name="ck_camp_agregacoes_score",
        ),
        sa.CheckConstraint(
            "classificacao IS NULL OR classificacao IN ('ouro','prata','bronze','critico')",
            name="ck_camp_agregacoes_classificacao",
        ),
        sa.CheckConstraint(
            "tendencia IS NULL OR tendencia IN ('crescendo','estavel','caindo')",
            name="ck_camp_agregacoes_tendencia",
        ),
    )
    op.create_index("ix_camp_agregacoes_classificacao", "camp_cercas_agregacoes", ["classificacao"])
    op.create_index("ix_camp_agregacoes_tendencia",     "camp_cercas_agregacoes", ["tendencia"])


def downgrade() -> None:
    # Ordem inversa respeitando FKs
    op.drop_table("camp_cercas_agregacoes")
    op.drop_table("camp_metas_cerca")

    # Remover FK e coluna responsavel_papel_id antes de dropar papeis
    op.drop_index("ix_camp_cercas_responsavel_id", table_name="camp_cercas_virtuais")
    op.drop_constraint(
        "fk_camp_cercas_responsavel_papel_id_camp_papeis_campanha",
        "camp_cercas_virtuais",
        type_="foreignkey",
    )
    op.drop_column("camp_cercas_virtuais", "responsavel_papel_id")

    op.drop_table("camp_papeis_campanha")

    op.execute("DROP INDEX IF EXISTS ix_camp_cercas_poligono_gist")
    op.drop_index("ix_camp_cercas_responsavel_id", table_name="camp_cercas_virtuais")
    op.drop_index("ix_camp_cercas_status",         table_name="camp_cercas_virtuais")
    op.drop_index("ix_camp_cercas_parent_id",      table_name="camp_cercas_virtuais")
    op.drop_index("ix_camp_cercas_campanha_id",    table_name="camp_cercas_virtuais")
    op.drop_table("camp_cercas_virtuais")

    op.drop_index("ix_camp_campanhas_tenant_ciclo",  table_name="camp_campanhas")
    op.drop_index("ix_camp_campanhas_status",        table_name="camp_campanhas")
    op.drop_index("ix_camp_campanhas_municipio_id",  table_name="camp_campanhas")
    op.drop_index("ix_camp_campanhas_uf",            table_name="camp_campanhas")
    op.drop_index("ix_camp_campanhas_ciclo",         table_name="camp_campanhas")
    op.drop_index("ix_camp_campanhas_candidato_id",  table_name="camp_campanhas")
    op.drop_index("ix_camp_campanhas_tenant_id",     table_name="camp_campanhas")
    op.drop_table("camp_campanhas")

    op.drop_index("ix_camp_pessoas_tenant_email", table_name="camp_pessoas_base")
    op.drop_index("ix_camp_pessoas_tenant_cpf",   table_name="camp_pessoas_base")
    op.drop_index("ix_camp_pessoas_data_nasc",    table_name="camp_pessoas_base")
    op.drop_index("ix_camp_pessoas_status",       table_name="camp_pessoas_base")
    op.drop_index("ix_camp_pessoas_tenant_id",    table_name="camp_pessoas_base")
    op.drop_table("camp_pessoas_base")
