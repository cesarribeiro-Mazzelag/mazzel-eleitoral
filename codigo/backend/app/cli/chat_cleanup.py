"""
Cleanup de mensagens do Chat Sigiloso.

Remove (soft delete) mensagens em duas condicoes:
  1. expira_em < NOW()                       (modo sigiloso ou TTL opcional)
  2. modo='view_unico' AND visualizada_em + 5s < NOW()

Registra entrada em chat_audit pra cada mensagem removida, preservando
rastreabilidade (sem conteudo - so metadata).

Uso:
    docker exec ub_backend python -m app.cli.chat_cleanup

Recomendado agendar via cron/celery a cada 1 minuto em producao.
"""
import asyncio
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, or_, select


async def main() -> int:
    from app.core.database import AsyncSessionLocal
    from app.models.chat import AcaoAudit, ChatAudit, ChatMensagem, ModoMensagem

    agora = datetime.now(timezone.utc)
    delay_view_unico = agora - timedelta(seconds=5)

    async with AsyncSessionLocal() as db:
        # Busca candidatas em aberto
        res = await db.execute(
            select(ChatMensagem).where(
                ChatMensagem.deletada.is_(False),
                or_(
                    and_(
                        ChatMensagem.expira_em.isnot(None),
                        ChatMensagem.expira_em <= agora,
                    ),
                    and_(
                        ChatMensagem.modo == ModoMensagem.VIEW_UNICO.value,
                        ChatMensagem.visualizada_em.isnot(None),
                        ChatMensagem.visualizada_em <= delay_view_unico,
                    ),
                ),
            )
        )
        msgs = list(res.scalars().all())

        removidas_tempo = 0
        removidas_view = 0
        for m in msgs:
            expirou_tempo = m.expira_em is not None and m.expira_em <= agora
            acao = (
                AcaoAudit.MSG_EXPIRADA_TEMPO
                if expirou_tempo
                else AcaoAudit.MSG_EXPIRADA_VIEW_UNICO
            )
            db.add(ChatAudit(
                sala_id=m.sala_id,
                usuario_id=m.remetente_id,
                acao=acao.value,
                mensagem_id=m.id,
                meta={
                    "modo": m.modo,
                    "tipo_conteudo": m.tipo_conteudo,
                    "idade_segundos": int((agora - m.created_at).total_seconds()),
                },
            ))
            m.deletada = True
            m.deletada_em = agora
            m.conteudo_criptografado = b""
            if expirou_tempo:
                removidas_tempo += 1
            else:
                removidas_view += 1

        await db.commit()

        total = removidas_tempo + removidas_view
        print(
            f"chat_cleanup: {total} removidas "
            f"({removidas_tempo} por tempo, {removidas_view} por view_unico)"
        )
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
