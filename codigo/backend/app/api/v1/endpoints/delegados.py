"""
Endpoints de Delegados
  GET    /delegados                   - lista delegados
  POST   /delegados                   - criar delegado (PRESIDENTE/DIRETORIA)
  GET    /delegados/{id}              - dados + zonas + performance
  PUT    /delegados/{id}              - atualizar
  DELETE /delegados/{id}              - desativar
  GET    /delegados/{id}/zonas        - zonas atribuídas
  POST   /delegados/{id}/zonas        - atribuir/substituir zonas
  GET    /delegados/meu               - dados do próprio delegado logado
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_usuario_atual, requer_diretoria, requer_presidente
from app.models.operacional import Usuario, Delegado, DelegadoZona, Filiado
from app.models.eleitoral import ZonaEleitoral, Municipio

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class DelegadoCreate(BaseModel):
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    estado_uf: str
    usuario_id: int  # deve ser um usuário com perfil DELEGADO

class DelegadoUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    estado_uf: Optional[str] = None
    ativo: Optional[bool] = None

class AtribuirZonasPayload(BaseModel):
    zona_ids: List[int]


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_delegado_or_404(db, delegado_id: int) -> Delegado:
    r = await db.execute(select(Delegado).where(Delegado.id == delegado_id))
    d = r.scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Delegado não encontrado.")
    return d


async def _performance(db, delegado_id: int) -> dict:
    """KPIs de um delegado: filiados cadastrados, municípios cobertos, zonas."""
    filiados = await db.execute(
        select(func.count(Filiado.id)).where(
            Filiado.cadastrado_por_id == delegado_id
        )
    )
    n_filiados = filiados.scalar() or 0

    zonas_q = await db.execute(
        select(func.count(DelegadoZona.id)).where(
            DelegadoZona.delegado_id == delegado_id
        )
    )
    n_zonas = zonas_q.scalar() or 0

    muns_q = await db.execute(
        select(func.count(DelegadoZona.municipio_id.distinct())).where(
            DelegadoZona.delegado_id == delegado_id
        )
    )
    n_muns = muns_q.scalar() or 0

    return {
        "filiados_cadastrados": n_filiados,
        "zonas_cobertas": n_zonas,
        "municipios_cobertos": n_muns,
    }


async def _zonas_detalhadas(db, delegado_id: int) -> list:
    rows = await db.execute(
        select(DelegadoZona, ZonaEleitoral, Municipio)
        .join(ZonaEleitoral, DelegadoZona.zona_id == ZonaEleitoral.id)
        .join(Municipio, DelegadoZona.municipio_id == Municipio.id)
        .where(DelegadoZona.delegado_id == delegado_id)
        .order_by(Municipio.nome, ZonaEleitoral.numero)
    )
    return [
        {
            "delegado_zona_id": r.DelegadoZona.id,
            "zona_id":          r.ZonaEleitoral.id,
            "zona_numero":      r.ZonaEleitoral.numero,
            "municipio_id":     r.Municipio.id,
            "municipio_nome":   r.Municipio.nome,
            "estado_uf":        r.Municipio.estado_uf,
        }
        for r in rows.fetchall()
    ]


def _serializar(d: Delegado) -> dict:
    return {
        "id":         d.id,
        "nome":       d.nome,
        "email":      d.email,
        "telefone":   d.telefone,
        "whatsapp":   d.whatsapp,
        "estado_uf":  d.estado_uf,
        "ativo":      d.ativo,
        "usuario_id": d.usuario_id,
        "criado_em":  d.criado_em.isoformat() if d.criado_em else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/meu")
async def get_meu_delegado(
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    """Dados do próprio delegado logado + performance."""
    r = await db.execute(
        select(Delegado).where(Delegado.usuario_id == usuario.id)
    )
    d = r.scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Você não está vinculado como delegado.")

    return {
        **_serializar(d),
        "performance": await _performance(db, d.id),
        "zonas": await _zonas_detalhadas(db, d.id),
    }


@router.get("")
async def listar_delegados(
    estado_uf: Optional[str] = None,
    ativo: Optional[bool] = True,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    """Lista delegados. DELEGADO só vê a si mesmo."""
    if usuario.perfil == "DELEGADO":
        r = await db.execute(
            select(Delegado).where(Delegado.usuario_id == usuario.id)
        )
        delegados = r.scalars().all()
    else:
        q = select(Delegado)
        if estado_uf:
            q = q.where(Delegado.estado_uf == estado_uf.upper())
        if ativo is not None:
            q = q.where(Delegado.ativo == ativo)
        q = q.order_by(Delegado.estado_uf, Delegado.nome)
        r = await db.execute(q)
        delegados = r.scalars().all()

    result = []
    for d in delegados:
        perf = await _performance(db, d.id)
        result.append({**_serializar(d), **perf})
    return result


@router.post("")
async def criar_delegado(
    payload: DelegadoCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_diretoria),
):
    """Cria um novo delegado vinculado a um usuário."""
    # Verifica se usuário existe
    u = await db.execute(
        select(Usuario).where(Usuario.id == payload.usuario_id)
    )
    if not u.scalar_one_or_none():
        raise HTTPException(400, "Usuário não encontrado.")

    # Verifica se já tem delegado vinculado
    existe = await db.execute(
        select(Delegado).where(Delegado.usuario_id == payload.usuario_id)
    )
    if existe.scalar_one_or_none():
        raise HTTPException(409, "Usuário já é delegado.")

    d = Delegado(
        usuario_id=payload.usuario_id,
        nome=payload.nome,
        email=payload.email,
        telefone=payload.telefone,
        whatsapp=payload.whatsapp,
        estado_uf=payload.estado_uf.upper(),
    )
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return _serializar(d)


@router.get("/{delegado_id}")
async def get_delegado(
    delegado_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    """Dados completos de um delegado."""
    d = await _get_delegado_or_404(db, delegado_id)

    # DELEGADO só pode ver a si mesmo
    if usuario.perfil == "DELEGADO":
        meu = await db.execute(
            select(Delegado).where(Delegado.usuario_id == usuario.id)
        )
        meu_d = meu.scalar_one_or_none()
        if not meu_d or meu_d.id != delegado_id:
            raise HTTPException(403, "Acesso negado.")

    return {
        **_serializar(d),
        "performance": await _performance(db, d.id),
        "zonas": await _zonas_detalhadas(db, d.id),
    }


@router.put("/{delegado_id}")
async def atualizar_delegado(
    delegado_id: int,
    payload: DelegadoUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_diretoria),
):
    d = await _get_delegado_or_404(db, delegado_id)
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        if campo == "estado_uf" and valor:
            valor = valor.upper()
        setattr(d, campo, valor)
    await db.commit()
    await db.refresh(d)
    return _serializar(d)


@router.delete("/{delegado_id}")
async def desativar_delegado(
    delegado_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_presidente),
):
    d = await _get_delegado_or_404(db, delegado_id)
    d.ativo = False
    await db.commit()
    return {"ok": True}


@router.get("/{delegado_id}/zonas")
async def get_zonas(
    delegado_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_usuario_atual),
):
    await _get_delegado_or_404(db, delegado_id)
    return await _zonas_detalhadas(db, delegado_id)


@router.post("/{delegado_id}/zonas")
async def atribuir_zonas(
    delegado_id: int,
    payload: AtribuirZonasPayload,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_diretoria),
):
    """
    Substitui as zonas atribuídas ao delegado.
    Passa lista vazia para remover todas.
    """
    await _get_delegado_or_404(db, delegado_id)

    # Remove as atuais
    zonas_atuais = await db.execute(
        select(DelegadoZona).where(DelegadoZona.delegado_id == delegado_id)
    )
    for z in zonas_atuais.scalars().all():
        await db.delete(z)

    # Adiciona as novas
    for zona_id in payload.zona_ids:
        # Precisa do municipio_id via zona
        zona_q = await db.execute(
            select(ZonaEleitoral).where(ZonaEleitoral.id == zona_id)
        )
        zona = zona_q.scalar_one_or_none()
        if not zona:
            continue
        db.add(DelegadoZona(
            delegado_id=delegado_id,
            zona_id=zona_id,
            municipio_id=zona.municipio_id,
        ))

    await db.commit()
    return await _zonas_detalhadas(db, delegado_id)
