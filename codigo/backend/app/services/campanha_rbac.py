"""
Servico RBAC cascata hierarquico para o Modulo Campanha.

Regras:
- PRESIDENTE / DIRETORIA: bypass total — veem tudo do tenant
- DELEGADO: si mesmo + toda arvore descendente (CTE recursivo)
- COORD_REGIONAL / COORD_TERRITORIAL: si mesmo + descendentes
- CABO / APOIADOR: apenas si mesmo
- CANDIDATO: si mesmo + equipe da propria campanha (papeis onde campanha_id bate)
- Sem papel: escopo vazio (lista vazia, nao 403)

Hierarquia de criacao (pode_criar_papel_abaixo):
  delegado -> coord_regional -> coord_territorial -> cabo/apoiador
  Presidente/Diretoria podem criar qualquer papel.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campanha import PapelCampanhaModel
from app.models.operacional import PerfilUsuario, Usuario


# ---------------------------------------------------------------------------
# Hierarquia de criacao
# ---------------------------------------------------------------------------

_HIERARQUIA = ["delegado", "coord_regional", "coord_territorial", "cabo", "apoiador"]

_PODE_CRIAR: dict[str, list[str]] = {
    "delegado":            ["coord_regional", "coord_territorial", "cabo", "apoiador"],
    "coord_regional":      ["coord_territorial", "cabo", "apoiador"],
    "coord_territorial":   ["cabo", "apoiador"],
    "cabo":                [],
    "apoiador":            [],
    "candidato":           [],
    "lideranca":           [],  # Lideranca nao tem cascata definida — Presidente/Dir gerenciam
}


def pode_criar_papel_abaixo(papel_atual: str, papel_novo: str) -> bool:
    """
    Retorna True se papel_atual pode criar papel_novo.
    Presidente/Diretoria: bypass (chamador deve checar PerfilUsuario antes).
    """
    permitidos = _PODE_CRIAR.get(papel_atual, [])
    return papel_novo in permitidos


# ---------------------------------------------------------------------------
# EscopoRBAC — dataclass passada como Depends
# ---------------------------------------------------------------------------

@dataclass
class EscopoRBAC:
    tenant_id: int
    # None = vee tudo (bypass); [] = nao vee nada; [ids] = filtro aplicado
    papeis_visiveis: Optional[list[UUID]] = field(default=None)
    # None = vee tudo; [ids] = pessoas filtradas via papeis
    pessoas_visiveis: Optional[list[UUID]] = field(default=None)
    # UUID do papel ativo do usuario logado (None se Presidente/Diretoria ou sem papel)
    papel_ativo_id: Optional[UUID] = field(default=None)
    papel_ativo_tipo: Optional[str] = field(default=None)
    # campanhas_ids visiveis: None = todas, [] = nenhuma, [ids] = filtro
    campanhas_visiveis: Optional[list[UUID]] = field(default=None)


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

_PERFIS_BYPASS = {PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA}


async def get_papel_ativo_do_usuario(
    db: AsyncSession,
    usuario_id: int,
) -> Optional[PapelCampanhaModel]:
    """
    Retorna o papel ativo mais recente do usuario logado (se tiver).
    Presidente/Diretoria normalmente nao tem papel — retorna None.
    Quando ha multiplos papeis ativos, retorna o mais recente (criado_em DESC).

    Nao ha FK direta entre Usuario e PapelCampanhaModel.
    Estrategia: join via email (Usuario.email == PessoaBase.email dentro do mesmo tenant).
    Retorna None se nao encontrar — comportamento seguro.
    """
    from sqlalchemy import select, and_
    from app.models.campanha import PessoaBase
    from app.models.operacional import Usuario as UsuarioModel

    # Passo 1: busca usuario para pegar email + tenant_id
    usuario_row = (await db.execute(
        select(UsuarioModel).where(UsuarioModel.id == usuario_id)
    )).scalar_one_or_none()

    if usuario_row is None or not usuario_row.email:
        return None

    # Passo 2: busca pessoa_base pelo email dentro do mesmo tenant
    pessoa = (await db.execute(
        select(PessoaBase).where(
            and_(
                PessoaBase.email == usuario_row.email,
                PessoaBase.tenant_id == usuario_row.tenant_id,
            )
        )
    )).scalar_one_or_none()

    if pessoa is None:
        return None

    # Passo 3: busca papel ativo mais recente desta pessoa
    papel = (await db.execute(
        select(PapelCampanhaModel)
        .where(
            and_(
                PapelCampanhaModel.pessoa_id == pessoa.id,
                PapelCampanhaModel.status == "ativo",
            )
        )
        .order_by(PapelCampanhaModel.criado_em.desc())
    )).scalar_one_or_none()

    return papel


async def get_arvore_descendente(
    db: AsyncSession,
    papel_id: UUID,
) -> list[UUID]:
    """
    CTE recursivo: retorna lista de papel_ids descendentes,
    incluindo o proprio papel_id (raiz).

    SQL gerado:
        WITH RECURSIVE arvore AS (
            SELECT id FROM camp_papeis_campanha WHERE id = :papel_raiz
            UNION ALL
            SELECT p.id FROM camp_papeis_campanha p
            JOIN arvore a ON p.superior_id = a.id
        )
        SELECT id FROM arvore;
    """
    sql = text("""
        WITH RECURSIVE arvore AS (
            SELECT id
            FROM camp_papeis_campanha
            WHERE id = :papel_raiz
              AND status = 'ativo'
            UNION ALL
            SELECT p.id
            FROM camp_papeis_campanha p
            JOIN arvore a ON p.superior_id = a.id
            WHERE p.status = 'ativo'
        )
        SELECT id FROM arvore
    """)
    rows = (await db.execute(sql, {"papel_raiz": str(papel_id)})).fetchall()
    return [UUID(str(r[0])) for r in rows]


async def get_campanhas_de_papel(
    db: AsyncSession,
    papel_ids: list[UUID],
    tenant_id: int,
) -> list[UUID]:
    """Retorna campaign_ids acessiveis pelos papeis fornecidos."""
    if not papel_ids:
        return []
    from sqlalchemy import select
    from app.models.campanha import Campanha
    # campanhas onde ha ao menos um papel na lista
    sql = text("""
        SELECT DISTINCT campanha_id
        FROM camp_papeis_campanha
        WHERE id = ANY(:ids)
          AND status = 'ativo'
    """)
    rows = (await db.execute(sql, {"ids": [str(p) for p in papel_ids]})).fetchall()
    camp_ids = [UUID(str(r[0])) for r in rows]
    return camp_ids


async def get_pessoas_de_papeis(
    db: AsyncSession,
    papel_ids: list[UUID],
) -> list[UUID]:
    """Retorna pessoa_ids associadas aos papeis fornecidos."""
    if not papel_ids:
        return []
    sql = text("""
        SELECT DISTINCT pessoa_id
        FROM camp_papeis_campanha
        WHERE id = ANY(:ids)
          AND status = 'ativo'
    """)
    rows = (await db.execute(sql, {"ids": [str(p) for p in papel_ids]})).fetchall()
    return [UUID(str(r[0])) for r in rows]


# ---------------------------------------------------------------------------
# Funcao principal: calcula escopo completo
# ---------------------------------------------------------------------------

async def calcular_escopo(
    db: AsyncSession,
    usuario: Usuario,
) -> EscopoRBAC:
    """
    Calcula o EscopoRBAC completo para o usuario logado.

    Casos:
    1. PRESIDENTE / DIRETORIA => bypass (None em tudo)
    2. Tem papel ativo => CTE arvore descendente
    3. Sem papel => escopo vazio (listas vazias)
    """
    tenant_id = usuario.tenant_id

    # Caso 1: bypass total
    if usuario.perfil in _PERFIS_BYPASS:
        return EscopoRBAC(tenant_id=tenant_id)

    # Busca papel ativo
    papel = await get_papel_ativo_do_usuario(db, usuario.id)

    # Caso 3: sem papel => escopo vazio
    if papel is None:
        return EscopoRBAC(
            tenant_id=tenant_id,
            papeis_visiveis=[],
            pessoas_visiveis=[],
            campanhas_visiveis=[],
            papel_ativo_id=None,
            papel_ativo_tipo=None,
        )

    # Caso 2: tem papel — expandir arvore descendente
    papel_ids = await get_arvore_descendente(db, papel.id)
    pessoas_ids = await get_pessoas_de_papeis(db, papel_ids)
    campanhas_ids = await get_campanhas_de_papel(db, papel_ids, tenant_id)

    # Caso especial CANDIDATO: ve todos os papeis da sua campanha
    if papel.papel == "candidato":
        sql = text("""
            SELECT id FROM camp_papeis_campanha
            WHERE campanha_id = :camp_id
              AND status = 'ativo'
        """)
        rows = (await db.execute(sql, {"camp_id": str(papel.campanha_id)})).fetchall()
        equipe_ids = [UUID(str(r[0])) for r in rows]
        # une arvore propria + equipe da campanha
        papel_ids = list(set(papel_ids) | set(equipe_ids))
        pessoas_ids = await get_pessoas_de_papeis(db, papel_ids)

    return EscopoRBAC(
        tenant_id=tenant_id,
        papeis_visiveis=papel_ids,
        pessoas_visiveis=pessoas_ids,
        campanhas_visiveis=campanhas_ids,
        papel_ativo_id=papel.id,
        papel_ativo_tipo=papel.papel,
    )
