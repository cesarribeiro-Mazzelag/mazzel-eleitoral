"""
Endpoints de Validação
  POST /validar/cpf    - valida CPF (matemática + SERPRO opcional)
  POST /validar/titulo - valida Título de Eleitor
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.deps import requer_qualquer
from app.models.operacional import Usuario
from app.services.validacao_filiado import (
    validar_cpf_completo,
    validar_titulo_eleitor,
    verificar_inversao,
)

router = APIRouter()


class CpfPayload(BaseModel):
    cpf: str

class TituloPayload(BaseModel):
    titulo: str


@router.post("/cpf")
async def validar_cpf(
    payload: CpfPayload,
    _: Usuario = Depends(requer_qualquer),
):
    digitos = "".join(c for c in payload.cpf if c.isdigit())

    # Testa inversão antes da validação
    inversao = verificar_inversao("cpf", digitos)
    if inversao:
        return {
            "valido": False,
            "aviso": True,
            "mensagem": inversao["mensagem"],
            "fonte": "local",
        }

    resultado = await validar_cpf_completo(digitos)
    return {
        "valido":    resultado.valido,
        "mensagem":  resultado.mensagem,
        "fonte":     resultado.fonte,
    }


@router.post("/titulo")
async def validar_titulo(
    payload: TituloPayload,
    _: Usuario = Depends(requer_qualquer),
):
    digitos = "".join(c for c in payload.titulo if c.isdigit())

    # Testa inversão
    inversao = verificar_inversao("titulo", digitos)
    if inversao:
        return {
            "valido": False,
            "aviso": True,
            "mensagem": inversao["mensagem"],
            "fonte": "local",
        }

    resultado = await validar_titulo_eleitor(digitos)
    return {
        "valido":   resultado.valido,
        "mensagem": resultado.mensagem,
        "fonte":    resultado.fonte,
    }
