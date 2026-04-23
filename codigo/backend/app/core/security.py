"""
Segurança: hashing de senhas, JWT, 2FA (TOTP), hash de CPF.
"""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import pyotp
from jose import jwt, JWTError

from app.core.config import settings


# ─── Senhas ───────────────────────────────────────────────────────────────────

def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt(rounds=12)).decode()


def verificar_senha(senha_plain: str, senha_hash: str) -> bool:
    return bcrypt.checkpw(senha_plain.encode(), senha_hash.encode())


# ─── CPF / dados sensíveis ────────────────────────────────────────────────────

def hash_cpf(cpf: str) -> str:
    """
    Hash HMAC-SHA256 do CPF (apenas dígitos).
    Usa SECRET_KEY como chave para que o hash seja determinístico
    mas não reversível sem a chave.
    """
    cpf_limpo = "".join(c for c in cpf if c.isdigit())
    return hmac.new(
        settings.SECRET_KEY.encode(),
        cpf_limpo.encode(),
        hashlib.sha256,
    ).hexdigest()


# ─── JWT ──────────────────────────────────────────────────────────────────────

def criar_access_token(dados: dict[str, Any]) -> str:
    to_encode = dados.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def criar_refresh_token(dados: dict[str, Any]) -> str:
    to_encode = dados.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decodificar_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


# ─── 2FA (TOTP) ───────────────────────────────────────────────────────────────

def gerar_totp_secret() -> str:
    return pyotp.random_base32()


def gerar_totp_uri(secret: str, email: str) -> str:
    """URI para QR Code (Google Authenticator, Authy, etc.)"""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=settings.TOTP_ISSUER)


def verificar_totp(secret: str, codigo: str) -> bool:
    totp = pyotp.TOTP(secret)
    # valid_window=1 aceita o código do período anterior (tolerância de 30s)
    return totp.verify(codigo, valid_window=1)


# ─── Validação de CPF (dígitos verificadores) ─────────────────────────────────

def validar_cpf_digitos(cpf: str) -> bool:
    """
    Valida matematicamente os dígitos verificadores do CPF.
    Não consulta API externa — apenas verifica se o número é matematicamente válido.
    """
    digitos = "".join(c for c in cpf if c.isdigit())
    if len(digitos) != 11 or len(set(digitos)) == 1:
        return False

    soma = sum(int(digitos[i]) * (10 - i) for i in range(9))
    resto = (soma * 10) % 11
    if resto == 10:
        resto = 0
    if resto != int(digitos[9]):
        return False

    soma = sum(int(digitos[i]) * (11 - i) for i in range(10))
    resto = (soma * 10) % 11
    if resto == 10:
        resto = 0
    return resto == int(digitos[10])


# ─── Detecção de inversão CPF x Título de Eleitor ────────────────────────────

def detectar_inversao_cpf_titulo(valor: str) -> dict:
    """
    Detecta se o usuário inverteu CPF com Título de Eleitor.
    CPF: 11 dígitos
    Título de Eleitor: 13 dígitos (ou 12 em alguns formatos antigos)
    """
    digitos = "".join(c for c in valor if c.isdigit())
    resultado = {"parece_cpf": False, "parece_titulo": False, "aviso": None}

    if len(digitos) == 11 and validar_cpf_digitos(digitos):
        resultado["parece_cpf"] = True

    if len(digitos) in (12, 13):
        resultado["parece_titulo"] = True

    return resultado
