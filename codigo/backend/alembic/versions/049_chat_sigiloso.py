"""049 - Chat Sigiloso: salas, participantes, mensagens e auditoria.

Cesar 23/04/2026: chat estilo Discord (salas persistentes) + WhatsApp
(3 modos de mensagem: padrao, sigiloso, view_unico) com E2E.

Tabelas criadas (prefixo chat_):
  1. chat_sala         - sala de conversa (1:1, grupo ou canal)
  2. chat_participante - vinculo usuario-sala
  3. chat_mensagem     - mensagem criptografada com modo de envio
  4. chat_audit        - log de auditoria de todas as acoes

Decisoes:
  - UUID PK (consistente com modulo campanha)
  - Participantes e remetentes sao Usuarios (integer FK). Pessoas sem
    acesso a plataforma nao sao participantes diretos.
  - E2E: servidor guarda apenas `conteudo_criptografado BYTEA`, nunca
    descriptografa. Chaves sao gerenciadas client-side.
  - 3 modos:
      * padrao     = persiste, sem TTL
      * sigiloso   = `expira_em` obrigatorio, cleanup job apaga por tempo
      * view_unico = apaga apos `visualizada_em` ser preenchido + delay 5s
  - Campanha_id NULL permite salas fora de contexto de campanha (sidebar global).
  - tenant_id em todas tabelas de topo (multi-tenant isolation).
  - Cleanup job: ver app/cli/chat_cleanup.py
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, BYTEA


revision      = "049"
down_revision = "048"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. chat_sala
    # ------------------------------------------------------------------
    op.create_table(
        "chat_sala",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", sa.Integer(),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("campanha_id", UUID(as_uuid=True),
                  sa.ForeignKey("camp_campanhas.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("tipo", sa.String(16), nullable=False, server_default="grupo"),
        sa.Column("criado_por_id", sa.Integer(),
                  sa.ForeignKey("usuarios.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("e2e", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=True),
        sa.CheckConstraint(
            "tipo IN ('direto','grupo','canal')",
            name="ck_chat_sala_tipo",
        ),
    )
    op.create_index("ix_chat_sala_tenant", "chat_sala", ["tenant_id"])
    op.create_index("ix_chat_sala_campanha", "chat_sala", ["campanha_id"])

    # ------------------------------------------------------------------
    # 2. chat_participante
    # ------------------------------------------------------------------
    op.create_table(
        "chat_participante",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("sala_id", UUID(as_uuid=True),
                  sa.ForeignKey("chat_sala.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("usuario_id", sa.Integer(),
                  sa.ForeignKey("usuarios.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("papel", sa.String(12), nullable=False, server_default="membro"),
        sa.Column("entrou_em", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("saiu_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ultima_leitura_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("silenciado", sa.Boolean(), nullable=False, server_default="false"),
        sa.CheckConstraint(
            "papel IN ('moderador','membro')",
            name="ck_chat_participante_papel",
        ),
    )
    op.create_index("ix_chat_participante_sala", "chat_participante", ["sala_id"])
    op.create_index("ix_chat_participante_usuario", "chat_participante", ["usuario_id"])
    # Unique parcial: um usuario ativo uma vez por sala (reentrada permitida apos saiu_em)
    op.execute(
        "CREATE UNIQUE INDEX ix_chat_participante_sala_usuario_ativo "
        "ON chat_participante(sala_id, usuario_id) WHERE saiu_em IS NULL"
    )

    # ------------------------------------------------------------------
    # 3. chat_mensagem
    # ------------------------------------------------------------------
    op.create_table(
        "chat_mensagem",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("sala_id", UUID(as_uuid=True),
                  sa.ForeignKey("chat_sala.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("remetente_id", sa.Integer(),
                  sa.ForeignKey("usuarios.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("modo", sa.String(16), nullable=False, server_default="padrao"),
        sa.Column("conteudo_criptografado", BYTEA(), nullable=False),
        sa.Column("tipo_conteudo", sa.String(20), nullable=False, server_default="texto"),
        sa.Column("expira_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("visualizada_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reply_to_id", UUID(as_uuid=True),
                  sa.ForeignKey("chat_mensagem.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("deletada", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deletada_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "modo IN ('padrao','sigiloso','view_unico')",
            name="ck_chat_mensagem_modo",
        ),
        sa.CheckConstraint(
            "tipo_conteudo IN ('texto','imagem','audio','video','anexo')",
            name="ck_chat_mensagem_tipo_conteudo",
        ),
        sa.CheckConstraint(
            "modo <> 'sigiloso' OR expira_em IS NOT NULL",
            name="ck_chat_mensagem_sigiloso_expira",
        ),
    )
    op.create_index("ix_chat_mensagem_sala_created", "chat_mensagem",
                    ["sala_id", sa.text("created_at DESC")])
    # Index parcial para cleanup por tempo
    op.execute(
        "CREATE INDEX ix_chat_mensagem_expira "
        "ON chat_mensagem(expira_em) WHERE expira_em IS NOT NULL AND deletada = false"
    )
    # Index parcial para cleanup de view_unico
    op.execute(
        "CREATE INDEX ix_chat_mensagem_view_unico "
        "ON chat_mensagem(visualizada_em) "
        "WHERE modo = 'view_unico' AND visualizada_em IS NOT NULL AND deletada = false"
    )

    # ------------------------------------------------------------------
    # 4. chat_audit
    # ------------------------------------------------------------------
    op.create_table(
        "chat_audit",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("sala_id", UUID(as_uuid=True),
                  sa.ForeignKey("chat_sala.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("usuario_id", sa.Integer(),
                  sa.ForeignKey("usuarios.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("acao", sa.String(40), nullable=False),
        sa.Column("mensagem_id", UUID(as_uuid=True), nullable=True),
        sa.Column("meta", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "acao IN ("
            "'sala_criada','sala_renomeada','sala_arquivada',"
            "'msg_enviada','msg_deletada','msg_expirada_tempo','msg_expirada_view_unico',"
            "'participante_add','participante_remove','participante_saiu',"
            "'leitura','print_detectado'"
            ")",
            name="ck_chat_audit_acao",
        ),
    )
    op.create_index("ix_chat_audit_sala", "chat_audit", ["sala_id"])
    op.create_index("ix_chat_audit_usuario", "chat_audit", ["usuario_id"])
    op.create_index("ix_chat_audit_created", "chat_audit",
                    [sa.text("created_at DESC")])


def downgrade() -> None:
    op.drop_table("chat_audit")
    op.drop_table("chat_mensagem")
    op.drop_table("chat_participante")
    op.drop_table("chat_sala")
