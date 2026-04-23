"""001 fundacao

Revision ID: 001
Revises:
Create Date: 2026-04-04

Sprint 0 — Fundação completa:
  - Extensão PostGIS
  - Tabelas eleitorais (TSE — somente leitura)
  - Tabelas operacionais (plataforma)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostGIS
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # ── partidos ────────────────────────────────────────────────────────────────
    op.create_table(
        "partidos",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("numero", sa.Integer, nullable=False, unique=True),
        sa.Column("sigla", sa.String(20), nullable=False),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("predecessores", postgresql.JSON, server_default="[]"),
        sa.Column("ativo", sa.Boolean, server_default="true"),
    )

    # ── municipios ──────────────────────────────────────────────────────────────
    op.create_table(
        "municipios",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("codigo_tse", sa.Integer, nullable=False, unique=True),
        sa.Column("codigo_ibge", sa.String(7), nullable=False, unique=True),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("estado_uf", sa.String(2), nullable=False),
        sa.Column("populacao", sa.Integer),
        sa.Column("pib_per_capita", sa.Float),
        sa.Column("geometry", geoalchemy2.types.Geometry("MULTIPOLYGON", srid=4326, nullable=True)),
    )
    op.create_index("ix_municipios_estado_uf", "municipios", ["estado_uf"])
    op.create_index("ix_municipios_codigo_tse", "municipios", ["codigo_tse"])
    op.create_index("ix_municipios_codigo_ibge", "municipios", ["codigo_ibge"])

    # ── zonas_eleitorais ────────────────────────────────────────────────────────
    op.create_table(
        "zonas_eleitorais",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("numero", sa.Integer, nullable=False),
        sa.Column("municipio_id", sa.Integer, sa.ForeignKey("municipios.id"), nullable=False),
        sa.Column("descricao", sa.String(300)),
    )
    op.create_index("ix_zona_municipio", "zonas_eleitorais", ["numero", "municipio_id"])

    # ── secoes_eleitorais ───────────────────────────────────────────────────────
    op.create_table(
        "secoes_eleitorais",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("numero", sa.Integer, nullable=False),
        sa.Column("zona_id", sa.Integer, sa.ForeignKey("zonas_eleitorais.id"), nullable=False),
        sa.Column("local_votacao", sa.String(300)),
        sa.Column("endereco", sa.String(400)),
    )

    # ── candidatos ──────────────────────────────────────────────────────────────
    op.create_table(
        "candidatos",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("sequencial_tse", sa.String(20), nullable=False),
        sa.Column("nome_completo", sa.String(300), nullable=False),
        sa.Column("nome_urna", sa.String(200)),
        sa.Column("cpf_hash", sa.String(64)),
        sa.Column("foto_url", sa.String(500)),
        sa.Column("genero", sa.String(20)),
        sa.Column("cor_raca", sa.String(50)),
        sa.Column("grau_instrucao", sa.String(100)),
        sa.Column("ocupacao", sa.String(200)),
        sa.Column("data_nascimento", sa.Date),
        sa.Column("naturalidade", sa.String(200)),
        sa.Column("estado_nascimento_uf", sa.String(2)),
    )
    op.create_index("ix_candidatos_sequencial_tse", "candidatos", ["sequencial_tse"])
    op.create_index("ix_candidatos_nome_completo", "candidatos", ["nome_completo"])
    op.create_index("ix_candidatos_cpf_hash", "candidatos", ["cpf_hash"])

    # ── candidaturas ────────────────────────────────────────────────────────────
    op.create_table(
        "candidaturas",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("candidato_id", sa.Integer, sa.ForeignKey("candidatos.id"), nullable=False),
        sa.Column("partido_id", sa.Integer, sa.ForeignKey("partidos.id"), nullable=False),
        sa.Column("municipio_id", sa.Integer, sa.ForeignKey("municipios.id")),
        sa.Column("estado_uf", sa.String(2), nullable=False),
        sa.Column("ano", sa.Integer, nullable=False),
        sa.Column("cargo", sa.String(100), nullable=False),
        sa.Column("numero_candidato", sa.String(10)),
        sa.Column("votos_total", sa.Integer, server_default="0"),
        sa.Column("situacao_final", sa.String(50)),
        sa.Column("eleito", sa.Boolean, server_default="false"),
        sa.Column("despesa_campanha", sa.Float),
        sa.Column("receita_campanha", sa.Float),
    )
    op.create_index("ix_candidatura_candidato", "candidaturas", ["candidato_id"])
    op.create_index("ix_candidatura_municipio", "candidaturas", ["municipio_id"])
    op.create_index("ix_candidatura_ano_cargo", "candidaturas", ["ano", "cargo"])
    op.create_index("ix_candidatura_partido_ano", "candidaturas", ["partido_id", "ano"])
    op.create_index("ix_candidatura_eleito", "candidaturas", ["eleito"])

    # ── votos_por_zona ──────────────────────────────────────────────────────────
    op.create_table(
        "votos_por_zona",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("candidatura_id", sa.Integer, sa.ForeignKey("candidaturas.id"), nullable=False),
        sa.Column("municipio_id", sa.Integer, sa.ForeignKey("municipios.id"), nullable=False),
        sa.Column("zona_id", sa.Integer, sa.ForeignKey("zonas_eleitorais.id")),
        sa.Column("secao_id", sa.Integer, sa.ForeignKey("secoes_eleitorais.id")),
        sa.Column("qt_votos", sa.Integer, server_default="0"),
    )
    op.create_index("ix_votos_candidatura", "votos_por_zona", ["candidatura_id"])
    op.create_index("ix_votos_municipio", "votos_por_zona", ["municipio_id"])

    # ── usuarios ────────────────────────────────────────────────────────────────
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("nome", sa.String(300), nullable=False),
        sa.Column("email", sa.String(300), nullable=False, unique=True),
        sa.Column("senha_hash", sa.String(300), nullable=False),
        sa.Column("perfil", sa.String(20), nullable=False),
        sa.Column("estado_uf_restrito", sa.String(2)),
        sa.Column("ativo", sa.Boolean, server_default="true"),
        sa.Column("totp_secret", sa.String(100)),
        sa.Column("totp_habilitado", sa.Boolean, server_default="false"),
        sa.Column("ultimo_acesso", sa.DateTime(timezone=True)),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index("ix_usuarios_email", "usuarios", ["email"])
    op.create_index("ix_usuarios_perfil", "usuarios", ["perfil"])

    # ── delegados ───────────────────────────────────────────────────────────────
    op.create_table(
        "delegados",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("usuario_id", sa.Integer, sa.ForeignKey("usuarios.id"), nullable=False, unique=True),
        sa.Column("nome", sa.String(300), nullable=False),
        sa.Column("email", sa.String(300)),
        sa.Column("telefone", sa.String(30)),
        sa.Column("whatsapp", sa.String(30)),
        sa.Column("estado_uf", sa.String(2), nullable=False),
        sa.Column("ativo", sa.Boolean, server_default="true"),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_delegados_estado_uf", "delegados", ["estado_uf"])

    # ── delegado_zonas ──────────────────────────────────────────────────────────
    op.create_table(
        "delegado_zonas",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("delegado_id", sa.Integer, sa.ForeignKey("delegados.id"), nullable=False),
        sa.Column("zona_id", sa.Integer, sa.ForeignKey("zonas_eleitorais.id"), nullable=False),
        sa.Column("municipio_id", sa.Integer, sa.ForeignKey("municipios.id"), nullable=False),
    )

    # ── politicos_plataforma ────────────────────────────────────────────────────
    op.create_table(
        "politicos_plataforma",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("candidato_id", sa.Integer, sa.ForeignKey("candidatos.id"), nullable=False, unique=True),
        sa.Column("usuario_id", sa.Integer, sa.ForeignKey("usuarios.id"), nullable=False, unique=True),
        sa.Column("delegado_responsavel_id", sa.Integer, sa.ForeignKey("delegados.id")),
        sa.Column("notas_internas", sa.Text),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── filiados ────────────────────────────────────────────────────────────────
    op.create_table(
        "filiados",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("nome_completo", sa.String(300), nullable=False),
        sa.Column("cpf_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("cpf_ultimos4", sa.String(4)),
        sa.Column("titulo_eleitor", sa.String(20), unique=True),
        sa.Column("data_nascimento", sa.Date),
        sa.Column("cep", sa.String(9)),
        sa.Column("logradouro", sa.String(300)),
        sa.Column("numero", sa.String(20)),
        sa.Column("complemento", sa.String(100)),
        sa.Column("bairro", sa.String(200)),
        sa.Column("cidade", sa.String(200)),
        sa.Column("estado_uf", sa.String(2), nullable=False),
        sa.Column("telefone", sa.String(30)),
        sa.Column("whatsapp", sa.String(30)),
        sa.Column("email", sa.String(300)),
        sa.Column("foto_url", sa.String(500)),
        sa.Column("municipio_id", sa.Integer, sa.ForeignKey("municipios.id")),
        sa.Column("zona_id", sa.Integer, sa.ForeignKey("zonas_eleitorais.id")),
        sa.Column("secao_id", sa.Integer, sa.ForeignKey("secoes_eleitorais.id")),
        sa.Column("status_validacao_cpf", sa.String(20), server_default="PENDENTE"),
        sa.Column("status_validacao_titulo", sa.String(20), server_default="PENDENTE"),
        sa.Column("detalhes_validacao", postgresql.JSON),
        sa.Column("cadastrado_por_id", sa.Integer, sa.ForeignKey("delegados.id"), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_filiados_cpf_hash", "filiados", ["cpf_hash"])
    op.create_index("ix_filiados_titulo", "filiados", ["titulo_eleitor"])
    op.create_index("ix_filiados_estado_uf", "filiados", ["estado_uf"])

    # ── farol_municipio ─────────────────────────────────────────────────────────
    op.create_table(
        "farol_municipio",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("municipio_id", sa.Integer, sa.ForeignKey("municipios.id"), nullable=False),
        sa.Column("ano_referencia", sa.Integer, nullable=False),
        sa.Column("cargo", sa.String(100), nullable=False),
        sa.Column("status", sa.String(10), nullable=False),
        sa.Column("votos_atual", sa.Integer, server_default="0"),
        sa.Column("votos_anterior", sa.Integer, server_default="0"),
        sa.Column("variacao_pct", sa.Float),
        sa.Column("eleitos_atual", sa.Integer, server_default="0"),
        sa.Column("eleitos_anterior", sa.Integer, server_default="0"),
        sa.Column("calculado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_farol_municipio_status", "farol_municipio", ["status"])
    op.create_index("ix_farol_municipio_ano_cargo", "farol_municipio", ["municipio_id", "ano_referencia", "cargo"])

    # ── alertas ─────────────────────────────────────────────────────────────────
    op.create_table(
        "alertas",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("tipo", sa.String(100), nullable=False),
        sa.Column("gravidade", sa.String(10), nullable=False),
        sa.Column("municipio_id", sa.Integer, sa.ForeignKey("municipios.id")),
        sa.Column("delegado_id", sa.Integer, sa.ForeignKey("delegados.id")),
        sa.Column("politico_id", sa.Integer, sa.ForeignKey("politicos_plataforma.id")),
        sa.Column("descricao", sa.Text, nullable=False),
        sa.Column("lido", sa.Boolean, server_default="false"),
        sa.Column("notificado_email", sa.Boolean, server_default="false"),
        sa.Column("notificado_whatsapp", sa.Boolean, server_default="false"),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_alertas_gravidade", "alertas", ["gravidade"])
    op.create_index("ix_alertas_lido", "alertas", ["lido"])

    # ── auditoria_log ───────────────────────────────────────────────────────────
    op.create_table(
        "auditoria_log",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("usuario_id", sa.Integer, sa.ForeignKey("usuarios.id")),
        sa.Column("acao", sa.String(100), nullable=False),
        sa.Column("tabela", sa.String(100)),
        sa.Column("registro_id", sa.Integer),
        sa.Column("dados_antes", postgresql.JSON),
        sa.Column("dados_depois", postgresql.JSON),
        sa.Column("ip", sa.String(50)),
        sa.Column("user_agent", sa.String(500)),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_auditoria_usuario_data", "auditoria_log", ["usuario_id", "criado_em"])
    op.create_index("ix_auditoria_acao_data", "auditoria_log", ["acao", "criado_em"])

    # ── relatorios_gerados ──────────────────────────────────────────────────────
    op.create_table(
        "relatorios_gerados",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("tipo", sa.String(100), nullable=False),
        sa.Column("gerado_por_id", sa.Integer, sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("parametros", postgresql.JSON),
        sa.Column("arquivo_url", sa.String(500)),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── Seed: usuário admin inicial ─────────────────────────────────────────────
    # Senha: Admin@2026 (hash bcrypt)
    op.execute("""
        INSERT INTO usuarios (nome, email, senha_hash, perfil)
        VALUES (
            'Administrador',
            'admin@uniaobrasil.org.br',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TdUsrRfiqNWQBfaMYMFQzGlFQ7zi',
            'PRESIDENTE'
        )
    """)

    # ── Seed: partidos históricos do União Brasil ───────────────────────────────
    op.execute("""
        INSERT INTO partidos (numero, sigla, nome, predecessores, ativo) VALUES
        (44, 'UNIAO', 'União Brasil', '[25, 17]', true),
        (25, 'DEM',   'Democratas',   '[]',       false),
        (17, 'PSL',   'Partido Social Liberal', '[]', false)
    """)


def downgrade() -> None:
    for t in [
        "relatorios_gerados", "auditoria_log", "alertas", "farol_municipio",
        "filiados", "politicos_plataforma", "delegado_zonas", "delegados",
        "usuarios", "votos_por_zona", "candidaturas", "candidatos",
        "secoes_eleitorais", "zonas_eleitorais", "municipios", "partidos",
    ]:
        op.drop_table(t)
    op.execute("DROP EXTENSION IF EXISTS postgis")
