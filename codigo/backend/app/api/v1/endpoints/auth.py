"""
Endpoints de autenticação — Sprint 0
  POST /auth/login        - login email+senha (+ 2FA se habilitado)
  POST /auth/2fa/verificar - segunda etapa do 2FA
  POST /auth/logout       - invalidar sessão
  GET  /auth/me           - dados do usuário atual
  POST /auth/2fa/setup    - habilitar 2FA (retorna QR URI)
  POST /auth/2fa/confirmar - confirmar e ativar 2FA
"""
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.database import get_db
from app.core.deps import get_usuario_atual
from app.core.security import (
    verificar_senha, hash_senha, criar_access_token, criar_refresh_token,
    decodificar_token, gerar_totp_secret, gerar_totp_uri, verificar_totp,
)
from app.models.operacional import Usuario
from app.services.auditoria import registrar

router = APIRouter()

# ─── Schemas ──────────────────────────────────────────────────────────────────

class LoginInput(BaseModel):
    email: EmailStr
    senha: str

class Verificar2faInput(BaseModel):
    codigo: str
    token_temp: str

class Confirmar2faInput(BaseModel):
    codigo: str

class TrocarSenhaInput(BaseModel):
    senha_atual: str
    senha_nova: str

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    return (forwarded.split(",")[0].strip() if forwarded else request.client.host) or "unknown"

def _ua(request: Request) -> str:
    return request.headers.get("User-Agent", "")[:500]

def _set_cookies(response: Response, access: str, refresh: str):
    # httpOnly + SameSite=Lax para segurança
    kw = dict(httponly=True, samesite="lax", secure=False)  # secure=True em produção
    response.set_cookie("ub_token", access, max_age=3600, **kw)
    response.set_cookie("ub_refresh", refresh, max_age=604800, **kw)

def _clear_cookies(response: Response):
    response.delete_cookie("ub_token")
    response.delete_cookie("ub_refresh")

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(
    body: LoginInput,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Usuario).where(Usuario.email == body.email.lower())
    )
    usuario = result.scalar_one_or_none()

    if not usuario or not verificar_senha(body.senha, usuario.senha_hash):
        await registrar(db, usuario_id=None, acao="LOGIN_FALHOU",
                        dados_depois={"email": body.email}, ip=_ip(request), user_agent=_ua(request))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="E-mail ou senha incorretos.")

    if not usuario.ativo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Conta inativa. Entre em contato com o administrador.")

    # Atualiza último acesso (sem timezone — coluna TIMESTAMP WITHOUT TIME ZONE)
    await db.execute(
        update(Usuario)
        .where(Usuario.id == usuario.id)
        .values(ultimo_acesso=datetime.utcnow())
    )

    # Se 2FA habilitado, emite token temporário (válido por 5 min)
    if usuario.totp_habilitado:
        token_temp = criar_access_token({"sub": str(usuario.id), "type": "2fa_pending"})
        await registrar(db, usuario_id=usuario.id, acao="LOGIN_2FA_INICIADO",
                        ip=_ip(request), user_agent=_ua(request))
        return {"requer_2fa": True, "token_temp": token_temp}

    # Login completo
    access  = criar_access_token({"sub": str(usuario.id)})
    refresh = criar_refresh_token({"sub": str(usuario.id)})
    _set_cookies(response, access, refresh)

    await registrar(db, usuario_id=usuario.id, acao="LOGIN",
                    ip=_ip(request), user_agent=_ua(request))

    return {
        "access_token": access,
        "requer_2fa": False,
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "perfil": usuario.perfil,
            "estado_uf_restrito": usuario.estado_uf_restrito,
        },
    }


@router.post("/2fa/verificar")
async def verificar_2fa(
    body: Verificar2faInput,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    payload = decodificar_token(body.token_temp)
    if not payload or payload.get("type") != "2fa_pending":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.")

    result = await db.execute(select(Usuario).where(Usuario.id == int(payload["sub"])))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado.")

    if not verificar_totp(usuario.totp_secret, body.codigo):
        await registrar(db, usuario_id=usuario.id, acao="2FA_FALHOU",
                        ip=_ip(request), user_agent=_ua(request))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Código inválido.")

    access  = criar_access_token({"sub": str(usuario.id)})
    refresh = criar_refresh_token({"sub": str(usuario.id)})
    _set_cookies(response, access, refresh)

    await registrar(db, usuario_id=usuario.id, acao="LOGIN_2FA_OK",
                    ip=_ip(request), user_agent=_ua(request))

    return {
        "access_token": access,
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "perfil": usuario.perfil,
            "estado_uf_restrito": usuario.estado_uf_restrito,
        },
    }


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    _clear_cookies(response)
    await registrar(db, usuario_id=usuario.id, acao="LOGOUT",
                    ip=_ip(request), user_agent=_ua(request))
    return {"ok": True}


@router.get("/me")
async def me(usuario: Usuario = Depends(get_usuario_atual)):
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "perfil": usuario.perfil,
        "estado_uf_restrito": usuario.estado_uf_restrito,
        "totp_habilitado": usuario.totp_habilitado,
        "ultimo_acesso": usuario.ultimo_acesso,
    }


@router.post("/2fa/setup")
async def setup_2fa(
    usuario: Usuario = Depends(get_usuario_atual),
    db: AsyncSession = Depends(get_db),
):
    """Gera um novo secret TOTP e retorna o URI para QR Code."""
    if usuario.totp_habilitado:
        raise HTTPException(status_code=400, detail="2FA já está habilitado.")

    secret = gerar_totp_secret()
    uri    = gerar_totp_uri(secret, usuario.email)

    # Salva o secret (ainda não ativo — ativado só após confirmar)
    await db.execute(
        update(Usuario).where(Usuario.id == usuario.id).values(totp_secret=secret)
    )

    return {"secret": secret, "uri": uri}


@router.post("/2fa/confirmar")
async def confirmar_2fa(
    body: Confirmar2faInput,
    request: Request,
    usuario: Usuario = Depends(get_usuario_atual),
    db: AsyncSession = Depends(get_db),
):
    """Confirma o código e ativa o 2FA definitivamente."""
    if not usuario.totp_secret:
        raise HTTPException(status_code=400, detail="Faça o setup do 2FA primeiro.")

    if not verificar_totp(usuario.totp_secret, body.codigo):
        raise HTTPException(status_code=400, detail="Código inválido. Tente novamente.")

    await db.execute(
        update(Usuario).where(Usuario.id == usuario.id).values(totp_habilitado=True)
    )
    await registrar(db, usuario_id=usuario.id, acao="2FA_HABILITADO",
                    ip=_ip(request), user_agent=_ua(request))

    return {"ok": True, "mensagem": "2FA habilitado com sucesso."}


@router.post("/trocar-senha")
async def trocar_senha(
    body: TrocarSenhaInput,
    request: Request,
    usuario: Usuario = Depends(get_usuario_atual),
    db: AsyncSession = Depends(get_db),
):
    """Troca a senha do usuário autenticado."""
    if not verificar_senha(body.senha_atual, usuario.senha_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta.")

    if len(body.senha_nova) < 8:
        raise HTTPException(status_code=400, detail="A nova senha deve ter pelo menos 8 caracteres.")

    await db.execute(
        update(Usuario)
        .where(Usuario.id == usuario.id)
        .values(senha_hash=hash_senha(body.senha_nova))
    )
    await db.commit()
    await registrar(db, usuario_id=usuario.id, acao="SENHA_ALTERADA",
                    ip=_ip(request), user_agent=_ua(request))
    return {"ok": True}
