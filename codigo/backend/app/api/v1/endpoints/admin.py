"""
Endpoints de Administração (apenas PRESIDENTE)
  GET  /admin/usuarios         - listar todos os usuários
  POST /admin/usuarios         - criar usuário
  PUT  /admin/usuarios/{id}    - editar usuário
  POST /admin/usuarios/{id}/toggle - ativar/desativar
  GET  /admin/auditoria        - log de auditoria
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from pydantic import BaseModel, EmailStr
from typing import Optional
import time

from app.core.database import get_db
from app.core.deps import requer_presidente
from app.core.security import hash_senha
from app.models.operacional import Usuario, AuditoriaLog

router = APIRouter()


def _serializar_usuario(u: Usuario) -> dict:
    return {
        "id":          u.id,
        "nome":        u.nome,
        "email":       u.email,
        "perfil":      u.perfil,
        "estado_uf":   u.estado_uf_restrito,
        "ativo":       u.ativo,
        "tem_2fa":     u.totp_habilitado,
        "ultimo_acesso": u.ultimo_acesso.isoformat() if u.ultimo_acesso else None,
    }


# ─── Usuários ─────────────────────────────────────────────────────────────────

@router.get("/usuarios")
async def listar_usuarios(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_presidente),
):
    r = await db.execute(select(Usuario).order_by(Usuario.nome))
    return [_serializar_usuario(u) for u in r.scalars().all()]


class CriarUsuarioInput(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    perfil: str
    estado_uf: Optional[str] = None


@router.post("/usuarios", status_code=201)
async def criar_usuario(
    body: CriarUsuarioInput,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_presidente),
):
    existe = await db.execute(select(Usuario).where(Usuario.email == body.email.lower()))
    if existe.scalar_one_or_none():
        raise HTTPException(400, "E-mail já cadastrado.")

    perfis_validos = {"PRESIDENTE", "DIRETORIA", "DELEGADO", "POLITICO", "FUNCIONARIO"}
    if body.perfil not in perfis_validos:
        raise HTTPException(400, f"Perfil inválido. Use: {', '.join(perfis_validos)}")

    usuario = Usuario(
        nome=body.nome,
        email=body.email.lower(),
        senha_hash=hash_senha(body.senha),
        perfil=body.perfil,
        estado_uf_restrito=body.estado_uf,
        ativo=True,
    )
    db.add(usuario)
    await db.commit()
    await db.refresh(usuario)
    return _serializar_usuario(usuario)


class EditarUsuarioInput(BaseModel):
    nome: Optional[str] = None
    perfil: Optional[str] = None
    estado_uf: Optional[str] = None


@router.put("/usuarios/{usuario_id}")
async def editar_usuario(
    usuario_id: int,
    body: EditarUsuarioInput,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_presidente),
):
    r = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = r.scalar_one_or_none()
    if not usuario:
        raise HTTPException(404, "Usuário não encontrado.")

    if body.nome:    usuario.nome = body.nome
    if body.perfil:  usuario.perfil = body.perfil
    if body.estado_uf is not None:
        usuario.estado_uf_restrito = body.estado_uf or None

    await db.commit()
    return _serializar_usuario(usuario)


@router.post("/usuarios/{usuario_id}/toggle")
async def toggle_ativo(
    usuario_id: int,
    db: AsyncSession = Depends(get_db),
    me: Usuario = Depends(requer_presidente),
):
    if usuario_id == me.id:
        raise HTTPException(400, "Você não pode desativar sua própria conta.")

    r = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = r.scalar_one_or_none()
    if not usuario:
        raise HTTPException(404, "Usuário não encontrado.")

    usuario.ativo = not usuario.ativo
    await db.commit()
    return {"ok": True, "ativo": usuario.ativo}


# ─── Auditoria ────────────────────────────────────────────────────────────────

@router.get("/auditoria")
async def listar_auditoria(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    usuario_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_presidente),
):
    q = select(AuditoriaLog).order_by(AuditoriaLog.criado_em.desc())
    if usuario_id:
        q = q.where(AuditoriaLog.usuario_id == usuario_id)

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    q = q.offset(offset).limit(limit)
    r = await db.execute(q)
    logs = r.scalars().all()

    return {
        "total": total,
        "items": [
            {
                "id":         log.id,
                "usuario_id": log.usuario_id,
                "acao":       log.acao,
                "tabela":     log.tabela,
                "ip":         log.ip,
                "criado_em":  log.criado_em.isoformat() if log.criado_em else None,
            }
            for log in logs
        ],
    }


# ─── Materialized Views (refresh) ─────────────────────────────────────────────

_MV_REFRESH_ALLOWED = {
    "mv_radar_politicos",
    # adicionar outras MVs aqui conforme forem criadas
}


@router.post("/materialized-view/{nome}/refresh")
async def refresh_materialized_view(
    nome: str,
    concurrent: bool = Query(True, description="Usar REFRESH CONCURRENTLY (nao bloqueia leituras). Precisa de UNIQUE INDEX."),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_presidente),
):
    """
    Atualiza uma materialized view pre-aprovada. Rodar apos grandes ETLs
    (novas candidaturas, dedup, ficha limpa, etc.) para refletir dados
    novos na listagem do Radar.

    Whitelist (so MVs cadastradas em `_MV_REFRESH_ALLOWED`) para evitar
    SQL injection via parametro `nome`.
    """
    if nome not in _MV_REFRESH_ALLOWED:
        raise HTTPException(
            400,
            f"MV '{nome}' nao esta na whitelist. Permitidas: {sorted(_MV_REFRESH_ALLOWED)}",
        )

    modo = "CONCURRENTLY" if concurrent else ""
    t0 = time.time()
    try:
        # DDL — precisa estar fora de transacao quando CONCURRENTLY.
        # SQLAlchemy abre tx por padrao; commit antes, execute, commit depois.
        await db.commit()
        await db.execute(text(f"REFRESH MATERIALIZED VIEW {modo} {nome}"))
        await db.commit()
    except Exception as e:
        raise HTTPException(500, f"Falha no REFRESH: {type(e).__name__}: {e}")
    dt = time.time() - t0
    return {"ok": True, "mv": nome, "concurrent": concurrent, "tempo_seg": round(dt, 1)}
