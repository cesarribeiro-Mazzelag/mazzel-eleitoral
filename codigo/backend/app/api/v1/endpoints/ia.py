"""
Endpoints de IA
  POST /ia/chat        - chat em linguagem natural com dados reais
  GET  /ia/busca       - identifica intenção de busca rápida
  GET  /ia/sugestoes   - perguntas sugeridas baseadas no perfil
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_usuario_atual
from app.models.operacional import Usuario
from app.agents.analise import processar_pergunta, busca_rapida

router = APIRouter()


class ChatPayload(BaseModel):
    pergunta: str
    historico: list[dict] = []


SUGESTOES_POR_PERFIL = {
    "PRESIDENTE": [
        "Como foi nosso desempenho em 2024 comparado a 2020?",
        "Quais estados temos mais municípios vermelhos?",
        "Onde crescemos mais em votos de vereador em 2024?",
        "Quais são os 10 municípios com maior queda de votos?",
        "Como está a força do partido em São Paulo?",
    ],
    "DIRETORIA": [
        "Quais municípios do meu estado estão no vermelho?",
        "Como evoluímos em vereadores de 2020 para 2024?",
        "Quais municípios ganhamos eleito em 2024 que não tínhamos em 2020?",
        "Qual município tem mais filiados cadastrados?",
    ],
    "DELEGADO": [
        "Quantos filiados foram cadastrados este mês?",
        "Quais zonas sob minha responsabilidade precisam de atenção?",
    ],
}


@router.post("/chat")
async def chat(
    payload: ChatPayload,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    """Chat em linguagem natural com dados eleitorais reais."""
    contexto = {
        "perfil": usuario.perfil,
        "estado_uf": usuario.estado_uf if hasattr(usuario, "estado_uf") else None,
        "nome": usuario.nome,
    }

    resposta = await processar_pergunta(
        pergunta=payload.pergunta,
        historico=payload.historico,
        contexto_usuario=contexto,
        db=db,
    )

    return {"resposta": resposta}


@router.get("/busca")
async def busca(
    q: str,
    _: Usuario = Depends(get_usuario_atual),
):
    """Identifica a intenção de busca (haiku) para o campo de pesquisa universal."""
    resultado = await busca_rapida(q)
    return resultado


@router.get("/sugestoes")
async def sugestoes(
    usuario: Usuario = Depends(get_usuario_atual),
):
    """Perguntas sugeridas baseadas no perfil do usuário."""
    perguntas = SUGESTOES_POR_PERFIL.get(
        usuario.perfil,
        SUGESTOES_POR_PERFIL["DIRETORIA"],
    )
    return {"sugestoes": perguntas}
