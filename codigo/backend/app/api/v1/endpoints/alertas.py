"""
Endpoints de Alertas
  GET  /alertas              - lista alertas (com filtros e paginação)
  POST /alertas/{id}/lido    - marcar um alerta como lido
  POST /alertas/lidos        - marcar todos como lidos
  POST /alertas/gerar        - dispara geração automática (PRESIDENTE/DIRETORIA)
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_usuario_atual, requer_diretoria
from app.models.operacional import Usuario, Alerta, GravidadeAlerta, Delegado
from app.services.gerador_alertas import gerar_alertas_farol

router = APIRouter()


def _serializar(a: Alerta) -> dict:
    return {
        "id":               a.id,
        "tipo":             a.tipo,
        "gravidade":        a.gravidade,
        "municipio_id":     a.municipio_id,
        "delegado_id":      a.delegado_id,
        "descricao":        a.descricao,
        "lido":             a.lido,
        "notificado_email": a.notificado_email,
        "criado_em":        a.criado_em.isoformat() if a.criado_em else None,
    }


@router.get("")
async def listar_alertas(
    lido: Optional[bool] = None,
    gravidade: Optional[str] = None,
    tipo: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    q = select(Alerta)

    # DELEGADO vê apenas alertas vinculados a ele
    if usuario.perfil == "DELEGADO":
        meu = await db.execute(
            select(Delegado).where(Delegado.usuario_id == usuario.id)
        )
        delegado = meu.scalar_one_or_none()
        if delegado:
            q = q.where(
                (Alerta.delegado_id == delegado.id) |
                (Alerta.delegado_id == None)
            )

    if lido is not None:
        q = q.where(Alerta.lido == lido)
    if gravidade:
        q = q.where(Alerta.gravidade == gravidade.upper())
    if tipo:
        q = q.where(Alerta.tipo == tipo.upper())

    # Total
    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    q = q.order_by(Alerta.criado_em.desc()).offset(offset).limit(limit)
    r = await db.execute(q)
    items = r.scalars().all()

    return {
        "total": total,
        "items": [_serializar(a) for a in items],
    }


@router.post("/lidos")
async def marcar_todos_lidos(
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    """Marca todos os alertas não lidos como lidos."""
    q = update(Alerta).where(Alerta.lido == False).values(lido=True)

    if usuario.perfil == "DELEGADO":
        meu = await db.execute(
            select(Delegado).where(Delegado.usuario_id == usuario.id)
        )
        delegado = meu.scalar_one_or_none()
        if delegado:
            q = update(Alerta).where(
                Alerta.lido == False,
                Alerta.delegado_id == delegado.id,
            ).values(lido=True)

    await db.execute(q)
    await db.commit()
    return {"ok": True}


@router.post("/{alerta_id}/lido")
async def marcar_lido(
    alerta_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_usuario_atual),
):
    r = await db.execute(select(Alerta).where(Alerta.id == alerta_id))
    alerta = r.scalar_one_or_none()
    if not alerta:
        raise HTTPException(404, "Alerta não encontrado.")
    alerta.lido = True
    await db.commit()
    return {"ok": True}


@router.post("/gerar")
async def gerar_alertas(
    uf: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_diretoria),
):
    """
    Gera alertas automáticos baseados no farol.
    Pode filtrar por estado (UF). Sem filtro = Brasil todo.
    """
    criados = await gerar_alertas_farol(db, uf=uf)
    return {
        "ok": True,
        "alertas_criados": criados,
        "mensagem": f"{criados} novo(s) alerta(s) gerado(s)." if criados else "Nenhum alerta novo.",
    }
