"""
Dependências FastAPI reutilizáveis — auth, db, perfil.
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decodificar_token
from app.models.operacional import Usuario, PerfilUsuario

bearer = HTTPBearer(auto_error=False)


async def get_usuario_atual(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    token = None

    # 1. Tenta header Authorization: Bearer <token>
    if credentials:
        token = credentials.credentials

    # 2. Tenta cookie ub_token
    if not token:
        token = request.cookies.get("ub_token")

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")

    payload = decodificar_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado.")

    usuario_id = payload.get("sub")
    if not usuario_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.")

    result = await db.execute(select(Usuario).where(Usuario.id == int(usuario_id)))
    usuario = result.scalar_one_or_none()

    if not usuario or not usuario.ativo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado ou inativo.")

    return usuario


def exigir_perfil(*perfis: PerfilUsuario):
    """Dependência que garante que o usuário tem um dos perfis exigidos."""
    async def _check(usuario: Usuario = Depends(get_usuario_atual)):
        if usuario.perfil not in perfis:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Requerido: {[p.value for p in perfis]}"
            )
        return usuario
    return _check


# Atalhos prontos para usar nos endpoints
requer_presidente   = exigir_perfil(PerfilUsuario.PRESIDENTE)
requer_diretoria    = exigir_perfil(PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA)
requer_delegado     = exigir_perfil(PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA, PerfilUsuario.DELEGADO)
requer_qualquer     = get_usuario_atual  # qualquer perfil autenticado
