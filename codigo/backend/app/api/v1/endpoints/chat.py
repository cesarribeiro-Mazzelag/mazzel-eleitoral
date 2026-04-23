"""
Chat Sigiloso - 9 endpoints REST.

Entry points (frontend):
  - /chat (sidebar global, todos os perfis autenticados)
  - /campanha?tab=chat (contextual)

E2E: servidor armazena conteudo_criptografado BYTEA, nunca descriptografa.
Cleanup de mensagens por TTL ou view_unico: app/cli/chat_cleanup.py

RBAC minimo: participante ativo (saiu_em IS NULL) da sala.
Tenant isolation: filtro por tenant_id do usuario em todas as queries.
"""
from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_usuario_atual
from app.models.chat import (
    AcaoAudit,
    ChatAudit,
    ChatMensagem,
    ChatParticipante,
    ChatSala,
    ModoMensagem,
    PapelParticipante,
)
from app.models.operacional import Usuario
from app.schemas.chat import (
    ChatAuditRead,
    ChatMensagemCreate,
    ChatMensagemListResponse,
    ChatMensagemRead,
    ChatParticipanteCreate,
    ChatParticipanteRead,
    ChatSalaCreate,
    ChatSalaDetail,
    ChatSalaListResponse,
    ChatSalaRead,
    ChatSalaUpdate,
)


router = APIRouter(prefix="/chat", tags=["chat"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _audit(
    db: AsyncSession, *,
    acao: AcaoAudit,
    sala_id: Optional[UUID],
    usuario_id: Optional[int],
    mensagem_id: Optional[UUID] = None,
    meta: Optional[dict] = None,
) -> None:
    db.add(ChatAudit(
        sala_id=sala_id,
        usuario_id=usuario_id,
        acao=acao.value,
        mensagem_id=mensagem_id,
        meta=meta,
    ))


async def _get_sala_com_acesso(
    db: AsyncSession, sala_id: UUID, usuario: Usuario,
    *, exige_moderador: bool = False,
) -> tuple[ChatSala, ChatParticipante]:
    """Retorna (sala, participante_ativo) ou levanta 404/403."""
    res = await db.execute(
        select(ChatSala).where(
            ChatSala.id == sala_id,
            ChatSala.tenant_id == usuario.tenant_id,
        )
    )
    sala = res.scalar_one_or_none()
    if sala is None:
        raise HTTPException(status_code=404, detail="Sala nao encontrada.")

    res = await db.execute(
        select(ChatParticipante).where(
            ChatParticipante.sala_id == sala_id,
            ChatParticipante.usuario_id == usuario.id,
            ChatParticipante.saiu_em.is_(None),
        )
    )
    participante = res.scalar_one_or_none()
    if participante is None:
        raise HTTPException(status_code=403, detail="Nao e participante desta sala.")

    if exige_moderador and participante.papel != PapelParticipante.MODERADOR.value:
        raise HTTPException(status_code=403, detail="Requer papel de moderador.")

    return sala, participante


def _msg_expirada(m: ChatMensagem, agora: datetime) -> bool:
    if m.deletada:
        return True
    if m.expira_em is not None and m.expira_em <= agora:
        return True
    if (
        m.modo == ModoMensagem.VIEW_UNICO.value
        and m.visualizada_em is not None
        and m.visualizada_em + timedelta(seconds=5) <= agora
    ):
        return True
    return False


# ---------------------------------------------------------------------------
# 1. GET /chat/salas - lista salas do usuario
# ---------------------------------------------------------------------------

@router.get("/salas", response_model=ChatSalaListResponse)
async def listar_salas(
    campanha_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    stmt = (
        select(ChatSala)
        .join(ChatParticipante, ChatParticipante.sala_id == ChatSala.id)
        .where(
            ChatSala.tenant_id == usuario.tenant_id,
            ChatParticipante.usuario_id == usuario.id,
            ChatParticipante.saiu_em.is_(None),
        )
        .order_by(ChatSala.updated_at.desc().nullslast(), ChatSala.created_at.desc())
    )
    if campanha_id is not None:
        stmt = stmt.where(ChatSala.campanha_id == campanha_id)

    res = await db.execute(stmt)
    salas = res.scalars().unique().all()
    return ChatSalaListResponse(total=len(salas), salas=[ChatSalaRead.model_validate(s) for s in salas])


# ---------------------------------------------------------------------------
# 2. POST /chat/salas - criar sala
# ---------------------------------------------------------------------------

@router.post("/salas", response_model=ChatSalaRead, status_code=status.HTTP_201_CREATED)
async def criar_sala(
    payload: ChatSalaCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    if usuario.tenant_id is None:
        raise HTTPException(status_code=400, detail="Usuario sem tenant.")

    sala = ChatSala(
        tenant_id=usuario.tenant_id,
        campanha_id=payload.campanha_id,
        nome=payload.nome,
        descricao=payload.descricao,
        tipo=payload.tipo,
        criado_por_id=usuario.id,
    )
    db.add(sala)
    await db.flush()

    # Criador entra como moderador
    db.add(ChatParticipante(
        sala_id=sala.id,
        usuario_id=usuario.id,
        papel=PapelParticipante.MODERADOR.value,
    ))

    # Participantes iniciais (validar tenant_id)
    if payload.participantes_iniciais:
        res = await db.execute(
            select(Usuario.id).where(
                Usuario.id.in_(payload.participantes_iniciais),
                Usuario.tenant_id == usuario.tenant_id,
                Usuario.id != usuario.id,
            )
        )
        validos = {row[0] for row in res.fetchall()}
        for uid in validos:
            db.add(ChatParticipante(
                sala_id=sala.id,
                usuario_id=uid,
                papel=PapelParticipante.MEMBRO.value,
            ))

    await _audit(db, acao=AcaoAudit.SALA_CRIADA, sala_id=sala.id,
                 usuario_id=usuario.id, meta={"nome": sala.nome, "tipo": sala.tipo})
    await db.commit()
    await db.refresh(sala)
    return ChatSalaRead.model_validate(sala)


# ---------------------------------------------------------------------------
# 3. GET /chat/salas/{id} - detalhes + participantes + nao_lidas
# ---------------------------------------------------------------------------

@router.get("/salas/{sala_id}", response_model=ChatSalaDetail)
async def detalhe_sala(
    sala_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    sala, meu = await _get_sala_com_acesso(db, sala_id, usuario)

    res = await db.execute(
        select(ChatParticipante, Usuario.nome)
        .join(Usuario, Usuario.id == ChatParticipante.usuario_id)
        .where(
            ChatParticipante.sala_id == sala_id,
            ChatParticipante.saiu_em.is_(None),
        )
    )
    parts: list[ChatParticipanteRead] = []
    for p, nome in res.fetchall():
        item = ChatParticipanteRead.model_validate(p)
        item.usuario_nome = nome
        parts.append(item)

    # Contagem de nao lidas (created_at > ultima_leitura_em OR ultima_leitura_em IS NULL)
    agora = datetime.now(timezone.utc)
    cond_nao_lidas = and_(
        ChatMensagem.sala_id == sala_id,
        ChatMensagem.deletada.is_(False),
        ChatMensagem.remetente_id != usuario.id,
        or_(ChatMensagem.expira_em.is_(None), ChatMensagem.expira_em > agora),
    )
    if meu.ultima_leitura_em is not None:
        cond_nao_lidas = and_(cond_nao_lidas, ChatMensagem.created_at > meu.ultima_leitura_em)
    res = await db.execute(select(func.count()).select_from(ChatMensagem).where(cond_nao_lidas))
    nao_lidas = res.scalar_one() or 0

    base = ChatSalaRead.model_validate(sala).model_dump()
    return ChatSalaDetail(**base, participantes=parts, nao_lidas=int(nao_lidas))


# ---------------------------------------------------------------------------
# 4. GET /chat/salas/{id}/mensagens - listar mensagens nao expiradas
# ---------------------------------------------------------------------------

@router.get("/salas/{sala_id}/mensagens", response_model=ChatMensagemListResponse)
async def listar_mensagens(
    sala_id: UUID,
    cursor: Optional[datetime] = Query(None, description="created_at para paginar (mais antigas que)"),
    limite: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    await _get_sala_com_acesso(db, sala_id, usuario)

    agora = datetime.now(timezone.utc)
    stmt = (
        select(ChatMensagem)
        .where(
            ChatMensagem.sala_id == sala_id,
            ChatMensagem.deletada.is_(False),
            or_(ChatMensagem.expira_em.is_(None), ChatMensagem.expira_em > agora),
            # Esconder view_unico ja visualizada + 5s
            or_(
                ChatMensagem.modo != ModoMensagem.VIEW_UNICO.value,
                ChatMensagem.visualizada_em.is_(None),
                ChatMensagem.visualizada_em > agora - timedelta(seconds=5),
            ),
        )
        .order_by(ChatMensagem.created_at.desc())
        .limit(limite)
    )
    if cursor is not None:
        stmt = stmt.where(ChatMensagem.created_at < cursor)

    res = await db.execute(stmt)
    msgs = list(res.scalars().all())
    proximo = msgs[-1].created_at if len(msgs) == limite else None
    return ChatMensagemListResponse(
        total=len(msgs),
        mensagens=[ChatMensagemRead.model_validate(m) for m in msgs],
        proximo_cursor=proximo,
    )


# ---------------------------------------------------------------------------
# 5. POST /chat/salas/{id}/mensagens - enviar mensagem
# ---------------------------------------------------------------------------

@router.post("/salas/{sala_id}/mensagens", response_model=ChatMensagemRead,
             status_code=status.HTTP_201_CREATED)
async def enviar_mensagem(
    sala_id: UUID,
    payload: ChatMensagemCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    await _get_sala_com_acesso(db, sala_id, usuario)

    expira_em: Optional[datetime] = None
    if payload.modo == ModoMensagem.SIGILOSO.value:
        ttl = payload.ttl_segundos or 60
        expira_em = datetime.now(timezone.utc) + timedelta(seconds=ttl)
    elif payload.ttl_segundos:
        # Permite TTL em padrao tambem (auto-destruicao opcional)
        expira_em = datetime.now(timezone.utc) + timedelta(seconds=payload.ttl_segundos)

    msg = ChatMensagem(
        sala_id=sala_id,
        remetente_id=usuario.id,
        modo=payload.modo,
        conteudo_criptografado=base64.b64decode(payload.conteudo_criptografado),
        tipo_conteudo=payload.tipo_conteudo,
        expira_em=expira_em,
        reply_to_id=payload.reply_to_id,
    )
    db.add(msg)
    await db.flush()

    # Atualiza updated_at da sala pra ordenar lista
    res = await db.execute(select(ChatSala).where(ChatSala.id == sala_id))
    sala = res.scalar_one()
    sala.updated_at = datetime.now(timezone.utc)

    await _audit(db, acao=AcaoAudit.MSG_ENVIADA, sala_id=sala_id,
                 usuario_id=usuario.id, mensagem_id=msg.id,
                 meta={"modo": msg.modo, "tipo": msg.tipo_conteudo})
    await db.commit()
    await db.refresh(msg)
    return ChatMensagemRead.model_validate(msg)


# ---------------------------------------------------------------------------
# 6. DELETE /chat/mensagens/{id} - apagar mensagem (remetente ou moderador)
# ---------------------------------------------------------------------------

@router.delete("/mensagens/{mensagem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_mensagem(
    mensagem_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    res = await db.execute(select(ChatMensagem).where(ChatMensagem.id == mensagem_id))
    msg = res.scalar_one_or_none()
    if msg is None or msg.deletada:
        raise HTTPException(status_code=404, detail="Mensagem nao encontrada.")

    _, participante = await _get_sala_com_acesso(db, msg.sala_id, usuario)
    if msg.remetente_id != usuario.id and participante.papel != PapelParticipante.MODERADOR.value:
        raise HTTPException(status_code=403, detail="Sem permissao para apagar.")

    msg.deletada = True
    msg.deletada_em = datetime.now(timezone.utc)
    # Zera conteudo pra reduzir superficie de exposicao
    msg.conteudo_criptografado = b""

    await _audit(db, acao=AcaoAudit.MSG_DELETADA, sala_id=msg.sala_id,
                 usuario_id=usuario.id, mensagem_id=msg.id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# 7. POST /chat/salas/{id}/participantes - adicionar participante (moderador)
# ---------------------------------------------------------------------------

@router.post("/salas/{sala_id}/participantes", response_model=ChatParticipanteRead,
             status_code=status.HTTP_201_CREATED)
async def add_participante(
    sala_id: UUID,
    payload: ChatParticipanteCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    await _get_sala_com_acesso(db, sala_id, usuario, exige_moderador=True)

    # Valida que o novo usuario eh do mesmo tenant
    res = await db.execute(
        select(Usuario).where(
            Usuario.id == payload.usuario_id,
            Usuario.tenant_id == usuario.tenant_id,
        )
    )
    alvo = res.scalar_one_or_none()
    if alvo is None:
        raise HTTPException(status_code=404, detail="Usuario alvo nao encontrado.")

    # Se ja ha participante ativo, retorna 409
    res = await db.execute(
        select(ChatParticipante).where(
            ChatParticipante.sala_id == sala_id,
            ChatParticipante.usuario_id == payload.usuario_id,
            ChatParticipante.saiu_em.is_(None),
        )
    )
    if res.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Ja e participante ativo.")

    novo = ChatParticipante(
        sala_id=sala_id,
        usuario_id=payload.usuario_id,
        papel=payload.papel,
    )
    db.add(novo)

    await _audit(db, acao=AcaoAudit.PARTICIPANTE_ADD, sala_id=sala_id,
                 usuario_id=usuario.id, meta={"alvo": payload.usuario_id, "papel": payload.papel})
    await db.commit()
    await db.refresh(novo)
    return ChatParticipanteRead.model_validate(novo)


# ---------------------------------------------------------------------------
# 8. DELETE /chat/salas/{id}/participantes/{usuario_id} - remove (moderador ou auto)
# ---------------------------------------------------------------------------

@router.delete("/salas/{sala_id}/participantes/{alvo_usuario_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def remover_participante(
    sala_id: UUID,
    alvo_usuario_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    _, meu = await _get_sala_com_acesso(db, sala_id, usuario)

    auto_saida = alvo_usuario_id == usuario.id
    if not auto_saida and meu.papel != PapelParticipante.MODERADOR.value:
        raise HTTPException(status_code=403, detail="Requer papel de moderador.")

    res = await db.execute(
        select(ChatParticipante).where(
            ChatParticipante.sala_id == sala_id,
            ChatParticipante.usuario_id == alvo_usuario_id,
            ChatParticipante.saiu_em.is_(None),
        )
    )
    alvo = res.scalar_one_or_none()
    if alvo is None:
        raise HTTPException(status_code=404, detail="Participante nao encontrado.")

    alvo.saiu_em = datetime.now(timezone.utc)

    acao = AcaoAudit.PARTICIPANTE_SAIU if auto_saida else AcaoAudit.PARTICIPANTE_REMOVE
    await _audit(db, acao=acao, sala_id=sala_id, usuario_id=usuario.id,
                 meta={"alvo": alvo_usuario_id})
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# 9. POST /chat/mensagens/{id}/lida - marca lida (destinatario)
# ---------------------------------------------------------------------------

@router.post("/mensagens/{mensagem_id}/lida", response_model=ChatMensagemRead)
async def marcar_lida(
    mensagem_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    res = await db.execute(select(ChatMensagem).where(ChatMensagem.id == mensagem_id))
    msg = res.scalar_one_or_none()
    if msg is None or msg.deletada:
        raise HTTPException(status_code=404, detail="Mensagem nao encontrada.")

    agora = datetime.now(timezone.utc)
    if _msg_expirada(msg, agora):
        raise HTTPException(status_code=410, detail="Mensagem expirada.")

    _, meu = await _get_sala_com_acesso(db, msg.sala_id, usuario)

    if msg.remetente_id == usuario.id:
        raise HTTPException(status_code=400, detail="Remetente nao marca propria mensagem.")

    if msg.visualizada_em is None:
        msg.visualizada_em = agora

    # Atualiza ponteiro de leitura do participante (serve pra nao_lidas)
    if meu.ultima_leitura_em is None or meu.ultima_leitura_em < msg.created_at:
        meu.ultima_leitura_em = msg.created_at

    await _audit(db, acao=AcaoAudit.LEITURA, sala_id=msg.sala_id,
                 usuario_id=usuario.id, mensagem_id=msg.id,
                 meta={"modo": msg.modo})
    await db.commit()
    await db.refresh(msg)
    return ChatMensagemRead.model_validate(msg)
