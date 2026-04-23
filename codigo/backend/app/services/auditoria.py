"""
Serviço de auditoria — registra TODAS as ações do sistema.
Logs são imutáveis: nenhum endpoint de DELETE existe nesta tabela.
"""
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.models.operacional import AuditoriaLog


async def registrar(
    db: AsyncSession,
    *,
    usuario_id: int | None,
    acao: str,
    tabela: str | None = None,
    registro_id: int | None = None,
    dados_antes: dict | None = None,
    dados_depois: dict | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
) -> AuditoriaLog:
    """
    Registra uma ação na tabela de auditoria.
    Deve ser chamado em TODA operação de escrita do sistema.

    Exemplos de ações:
      LOGIN, LOGOUT, LOGIN_FALHOU, 2FA_HABILITADO
      CREATE_FILIADO, UPDATE_FILIADO, VIEW_DOSSIE
      ASSIGN_ZONA_DELEGADO, GENERATE_RELATORIO
      EXPORT_DADOS, SEARCH_POLITICO
    """
    log = AuditoriaLog(
        usuario_id=usuario_id,
        acao=acao,
        tabela=tabela,
        registro_id=registro_id,
        dados_antes=dados_antes,
        dados_depois=dados_depois,
        ip=ip,
        user_agent=user_agent,
    )
    db.add(log)
    await db.flush()  # Garante que o log é gravado antes do commit da transação
    return log
