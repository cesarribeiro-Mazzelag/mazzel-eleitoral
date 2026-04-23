"""
Seed: popula uma sala de demonstracao para o Chat Sigiloso.

Cria:
  - 1 sala "Coord Campanha BA 2026" vinculada a campanha seed existente
  - 3 participantes (usuarios do tenant_id=1)
  - 3 mensagens: 1 padrao, 1 sigilosa (ttl 3600s), 1 view_unico

Uso:
    docker exec ub_backend python -m app.cli.seed_chat

Idempotente: nao duplica se rodar duas vezes (checa por nome+tenant).
"""
import asyncio
import base64
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import select


TENANT_ID = 1


async def main() -> int:
    from app.core.database import AsyncSessionLocal
    from app.models.campanha import Campanha
    from app.models.chat import (
        ChatMensagem,
        ChatParticipante,
        ChatSala,
        ModoMensagem,
        PapelParticipante,
        TipoSala,
    )
    from app.models.operacional import Usuario

    async with AsyncSessionLocal() as db:
        # ------------------------------------------------------------------
        # 1. Pega 3 usuarios do tenant
        # ------------------------------------------------------------------
        res = await db.execute(
            select(Usuario)
            .where(Usuario.tenant_id == TENANT_ID, Usuario.ativo.is_(True))
            .order_by(Usuario.id.asc())
            .limit(3)
        )
        usuarios = list(res.scalars().all())
        if len(usuarios) < 2:
            print(
                f"ERRO: precisa ao menos 2 usuarios ativos no tenant {TENANT_ID}. "
                f"Encontrados: {len(usuarios)}",
                file=sys.stderr,
            )
            return 1
        criador = usuarios[0]
        outros = usuarios[1:]

        # ------------------------------------------------------------------
        # 2. Pega campanha seed (se existir)
        # ------------------------------------------------------------------
        res = await db.execute(
            select(Campanha).where(Campanha.tenant_id == TENANT_ID).limit(1)
        )
        campanha = res.scalar_one_or_none()

        # ------------------------------------------------------------------
        # 3. Cria ou pega a sala
        # ------------------------------------------------------------------
        nome_sala = "Coord Campanha BA 2026"
        res = await db.execute(
            select(ChatSala).where(
                ChatSala.tenant_id == TENANT_ID,
                ChatSala.nome == nome_sala,
            )
        )
        sala = res.scalar_one_or_none()
        if sala is None:
            sala = ChatSala(
                tenant_id=TENANT_ID,
                campanha_id=campanha.id if campanha else None,
                nome=nome_sala,
                descricao="Sala de coordenacao da campanha Wagner Senador BA 2026",
                tipo=TipoSala.GRUPO.value,
                criado_por_id=criador.id,
                e2e=True,
            )
            db.add(sala)
            await db.flush()
            print(f"[+] Sala criada: {sala.nome} ({sala.id})")

            # Participantes
            db.add(ChatParticipante(
                sala_id=sala.id,
                usuario_id=criador.id,
                papel=PapelParticipante.MODERADOR.value,
            ))
            for u in outros:
                db.add(ChatParticipante(
                    sala_id=sala.id,
                    usuario_id=u.id,
                    papel=PapelParticipante.MEMBRO.value,
                ))
            print(f"[+] {1 + len(outros)} participantes adicionados")

            # Mensagens: conteudo "criptografado" stub = bytes UTF-8 do texto.
            # Backend retorna como base64, cliente faz atob e mostra.
            # Em producao, cliente criptografa de verdade com chave da sala.
            def cripto(txt: str) -> bytes:
                return txt.encode("utf-8")

            agora = datetime.now(timezone.utc)
            db.add(ChatMensagem(
                sala_id=sala.id,
                remetente_id=criador.id,
                modo=ModoMensagem.PADRAO.value,
                conteudo_criptografado=cripto("Bom dia equipe, reuniao de coord hoje 15h."),
                tipo_conteudo="texto",
            ))
            db.add(ChatMensagem(
                sala_id=sala.id,
                remetente_id=outros[0].id,
                modo=ModoMensagem.SIGILOSO.value,
                conteudo_criptografado=cripto("Ok, confirmado. Mensagem expira em 1h."),
                tipo_conteudo="texto",
                expira_em=agora + timedelta(seconds=3600),
            ))
            if len(outros) > 1:
                db.add(ChatMensagem(
                    sala_id=sala.id,
                    remetente_id=outros[1].id,
                    modo=ModoMensagem.VIEW_UNICO.value,
                    conteudo_criptografado=cripto("Informacao restrita - view unico."),
                    tipo_conteudo="texto",
                ))
            print("[+] 3 mensagens seed inseridas")

            await db.commit()
        else:
            print(f"[=] Sala ja existe: {sala.nome} ({sala.id})")

        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
