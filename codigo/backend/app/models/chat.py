"""
Modelos do Chat Sigiloso.

Estilo Discord (salas persistentes) + WhatsApp (3 modos de mensagem).
E2E: servidor guarda apenas conteudo_criptografado BYTEA, nao descriptografa.
"""
import enum
import uuid
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text, ForeignKey,
    Index, CheckConstraint, LargeBinary,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class TipoSala(str, enum.Enum):
    DIRETO = "direto"
    GRUPO  = "grupo"
    CANAL  = "canal"


class PapelParticipante(str, enum.Enum):
    MODERADOR = "moderador"
    MEMBRO    = "membro"


class ModoMensagem(str, enum.Enum):
    PADRAO     = "padrao"
    SIGILOSO   = "sigiloso"
    VIEW_UNICO = "view_unico"


class TipoConteudo(str, enum.Enum):
    TEXTO  = "texto"
    IMAGEM = "imagem"
    AUDIO  = "audio"
    VIDEO  = "video"
    ANEXO  = "anexo"


class AcaoAudit(str, enum.Enum):
    SALA_CRIADA               = "sala_criada"
    SALA_RENOMEADA            = "sala_renomeada"
    SALA_ARQUIVADA            = "sala_arquivada"
    MSG_ENVIADA               = "msg_enviada"
    MSG_DELETADA              = "msg_deletada"
    MSG_EXPIRADA_TEMPO        = "msg_expirada_tempo"
    MSG_EXPIRADA_VIEW_UNICO   = "msg_expirada_view_unico"
    PARTICIPANTE_ADD          = "participante_add"
    PARTICIPANTE_REMOVE       = "participante_remove"
    PARTICIPANTE_SAIU         = "participante_saiu"
    LEITURA                   = "leitura"
    PRINT_DETECTADO           = "print_detectado"


# ---------------------------------------------------------------------------
# chat_sala
# ---------------------------------------------------------------------------

class ChatSala(Base):
    __tablename__ = "chat_sala"

    id = Column(PG_UUID(as_uuid=True), primary_key=True,
                default=uuid.uuid4, nullable=False)
    tenant_id = Column(
        Integer, ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    campanha_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("camp_campanhas.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    nome      = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    tipo = Column(
        String(16),
        CheckConstraint(
            "tipo IN ('direto','grupo','canal')",
            name="ck_chat_sala_tipo",
        ),
        nullable=False, default=TipoSala.GRUPO.value,
    )
    criado_por_id = Column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    e2e        = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=True)

    participantes = relationship(
        "ChatParticipante", back_populates="sala",
        cascade="all, delete-orphan",
    )
    mensagens = relationship(
        "ChatMensagem", back_populates="sala",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# chat_participante
# ---------------------------------------------------------------------------

class ChatParticipante(Base):
    __tablename__ = "chat_participante"

    id = Column(PG_UUID(as_uuid=True), primary_key=True,
                default=uuid.uuid4, nullable=False)
    sala_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("chat_sala.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    usuario_id = Column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    papel = Column(
        String(12),
        CheckConstraint(
            "papel IN ('moderador','membro')",
            name="ck_chat_participante_papel",
        ),
        nullable=False, default=PapelParticipante.MEMBRO.value,
    )
    entrou_em         = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    saiu_em           = Column(DateTime(timezone=True), nullable=True)
    ultima_leitura_em = Column(DateTime(timezone=True), nullable=True)
    silenciado        = Column(Boolean, nullable=False, default=False)

    sala = relationship("ChatSala", back_populates="participantes")


# ---------------------------------------------------------------------------
# chat_mensagem
# ---------------------------------------------------------------------------

class ChatMensagem(Base):
    __tablename__ = "chat_mensagem"

    id = Column(PG_UUID(as_uuid=True), primary_key=True,
                default=uuid.uuid4, nullable=False)
    sala_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("chat_sala.id", ondelete="CASCADE"),
        nullable=False,
    )
    remetente_id = Column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    modo = Column(
        String(16),
        CheckConstraint(
            "modo IN ('padrao','sigiloso','view_unico')",
            name="ck_chat_mensagem_modo",
        ),
        nullable=False, default=ModoMensagem.PADRAO.value,
    )
    conteudo_criptografado = Column(LargeBinary, nullable=False)
    tipo_conteudo = Column(
        String(20),
        CheckConstraint(
            "tipo_conteudo IN ('texto','imagem','audio','video','anexo')",
            name="ck_chat_mensagem_tipo_conteudo",
        ),
        nullable=False, default=TipoConteudo.TEXTO.value,
    )
    expira_em       = Column(DateTime(timezone=True), nullable=True)
    visualizada_em  = Column(DateTime(timezone=True), nullable=True)
    reply_to_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("chat_mensagem.id", ondelete="SET NULL"),
        nullable=True,
    )
    deletada     = Column(Boolean, nullable=False, default=False)
    deletada_em  = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    sala = relationship("ChatSala", back_populates="mensagens")

    __table_args__ = (
        Index("ix_chat_mensagem_sala_created", "sala_id", "created_at"),
        CheckConstraint(
            "modo <> 'sigiloso' OR expira_em IS NOT NULL",
            name="ck_chat_mensagem_sigiloso_expira",
        ),
    )


# ---------------------------------------------------------------------------
# chat_audit
# ---------------------------------------------------------------------------

class ChatAudit(Base):
    __tablename__ = "chat_audit"

    id = Column(PG_UUID(as_uuid=True), primary_key=True,
                default=uuid.uuid4, nullable=False)
    sala_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("chat_sala.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    usuario_id = Column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    acao        = Column(String(40), nullable=False)
    mensagem_id = Column(PG_UUID(as_uuid=True), nullable=True)
    meta        = Column(JSONB, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
