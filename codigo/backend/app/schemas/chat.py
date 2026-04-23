"""
Schemas Pydantic v2 para o Chat Sigiloso.
Cobre 4 entidades: ChatSala, ChatParticipante, ChatMensagem, ChatAudit.
Conteudo criptografado trafega como base64 (cliente criptografa E2E).
"""
from __future__ import annotations

import base64
from datetime import datetime
from typing import Any, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# ChatSala
# ---------------------------------------------------------------------------

class ChatSalaCreate(BaseModel):
    nome: str = Field(..., max_length=200)
    descricao: Optional[str] = None
    tipo: Literal["direto", "grupo", "canal"] = "grupo"
    campanha_id: Optional[UUID] = None
    # Ids de usuarios (alem do criador) a adicionar como membros iniciais
    participantes_iniciais: List[int] = Field(default_factory=list)


class ChatSalaUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None


class ChatSalaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: int
    campanha_id: Optional[UUID] = None
    nome: str
    descricao: Optional[str] = None
    tipo: str
    criado_por_id: Optional[int] = None
    e2e: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class ChatSalaDetail(ChatSalaRead):
    """Sala com lista de participantes ativos."""
    participantes: List["ChatParticipanteRead"] = Field(default_factory=list)
    nao_lidas: int = 0


class ChatSalaListResponse(BaseModel):
    total: int
    salas: List[ChatSalaRead]


# ---------------------------------------------------------------------------
# ChatParticipante
# ---------------------------------------------------------------------------

class ChatParticipanteCreate(BaseModel):
    usuario_id: int
    papel: Literal["moderador", "membro"] = "membro"


class ChatParticipanteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sala_id: UUID
    usuario_id: int
    papel: str
    entrou_em: datetime
    saiu_em: Optional[datetime] = None
    ultima_leitura_em: Optional[datetime] = None
    silenciado: bool
    # Populado quando retornado dentro de ChatSalaDetail
    usuario_nome: Optional[str] = None


# ---------------------------------------------------------------------------
# ChatMensagem
# ---------------------------------------------------------------------------

class ChatMensagemCreate(BaseModel):
    conteudo_criptografado: str = Field(
        ..., description="Conteudo cifrado pelo cliente, codificado em base64."
    )
    modo: Literal["padrao", "sigiloso", "view_unico"] = "padrao"
    tipo_conteudo: Literal["texto", "imagem", "audio", "video", "anexo"] = "texto"
    ttl_segundos: Optional[int] = Field(
        None, ge=5, le=604800,
        description="TTL em segundos. Obrigatorio se modo='sigiloso'. Max 7 dias.",
    )
    reply_to_id: Optional[UUID] = None

    @field_validator("conteudo_criptografado")
    @classmethod
    def _valida_base64(cls, v: str) -> str:
        try:
            base64.b64decode(v, validate=True)
        except Exception as exc:
            raise ValueError("conteudo_criptografado deve ser base64 valido") from exc
        return v


class ChatMensagemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sala_id: UUID
    remetente_id: Optional[int] = None
    modo: str
    conteudo_criptografado: str  # base64
    tipo_conteudo: str
    expira_em: Optional[datetime] = None
    visualizada_em: Optional[datetime] = None
    reply_to_id: Optional[UUID] = None
    deletada: bool
    deletada_em: Optional[datetime] = None
    created_at: datetime

    @field_validator("conteudo_criptografado", mode="before")
    @classmethod
    def _bytes_para_base64(cls, v: Any) -> str:
        if isinstance(v, (bytes, bytearray, memoryview)):
            return base64.b64encode(bytes(v)).decode("ascii")
        if isinstance(v, str):
            # Se ja e base64 valido, mantem. Senao, codifica como bytes UTF-8.
            try:
                base64.b64decode(v, validate=True)
                return v
            except Exception:
                return base64.b64encode(v.encode("utf-8")).decode("ascii")
        return ""


class ChatMensagemListResponse(BaseModel):
    total: int
    mensagens: List[ChatMensagemRead]
    # Cursor de paginacao: created_at da mensagem mais antiga no conjunto
    proximo_cursor: Optional[datetime] = None


# ---------------------------------------------------------------------------
# ChatAudit (so leitura)
# ---------------------------------------------------------------------------

class ChatAuditRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sala_id: Optional[UUID] = None
    usuario_id: Optional[int] = None
    acao: str
    mensagem_id: Optional[UUID] = None
    meta: Optional[dict] = None
    created_at: datetime


# Forward ref resolver
ChatSalaDetail.model_rebuild()
