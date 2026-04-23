"""
Portal Individual do Político
Endpoints exclusivos para usuários com perfil POLITICO.
Toda rota usa o candidato vinculado ao usuário logado (PoliticoPlataforma).

  GET /meu-painel/resumo  - dashboard pessoal
  GET /meu-painel/votos   - histórico de votos por eleição
  GET /meu-painel/dossie  - DossiePolitico do próprio político (JSON tipado)

Nota: o PDF do dossiê está em GET /dossie/{id}/pdf (rota única).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, text

from app.core.database import get_db
from app.core.deps import get_usuario_atual
from app.models.operacional import Usuario, PoliticoPlataforma
from app.models.eleitoral import Candidato, Candidatura, VotosPorZona, Municipio
from app.agents.dossie import compilar_dossie
from app.schemas.dossie import DossiePolitico

router = APIRouter()


async def _get_candidato_id(usuario: Usuario, db: AsyncSession) -> int:
    """Retorna o candidato_id vinculado ao político logado."""
    if usuario.perfil != "POLITICO":
        raise HTTPException(403, "Acesso restrito ao perfil POLITICO.")
    plat = await db.execute(
        select(PoliticoPlataforma).where(
            PoliticoPlataforma.usuario_id == usuario.id
        )
    )
    p = plat.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Vínculo político não configurado. Contate o administrador.")
    return p.candidato_id


@router.get("/resumo")
async def get_resumo(
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    """Dashboard pessoal: perfil, última eleição, evolução de votos."""
    candidato_id = await _get_candidato_id(usuario, db)

    # Dados do candidato
    cand_q = await db.execute(
        select(Candidato).where(Candidato.id == candidato_id)
    )
    cand = cand_q.scalar_one_or_none()
    if not cand:
        raise HTTPException(404, "Candidato não encontrado.")

    # Todas as candidaturas ordenadas
    cands_q = await db.execute(
        select(Candidatura)
        .where(Candidatura.candidato_id == candidato_id)
        .order_by(desc(Candidatura.ano))
    )
    candidaturas = cands_q.scalars().all()

    # Farol do município na última eleição
    farol_row = None
    if candidaturas:
        ultima = candidaturas[0]
        if ultima.municipio_id:
            fr = await db.execute(text("""
                SELECT status, votos_atual, votos_anterior, variacao_pct, eleitos_atual
                FROM farol_municipio
                WHERE municipio_id = :mid
                  AND cargo = :cargo
                  AND ano_referencia = :ano
            """), {
                "mid": ultima.municipio_id,
                "cargo": ultima.cargo.upper(),
                "ano": ultima.ano,
            })
            farol_row = fr.fetchone()

    return {
        "candidato": {
            "id":             cand.id,
            "nome_completo":  cand.nome_completo,
            "nome_urna":      cand.nome_urna,
            "foto_url":       cand.foto_url,
            "genero":         cand.genero,
            "grau_instrucao": cand.grau_instrucao,
            "ocupacao":       cand.ocupacao,
        },
        "candidaturas": [
            {
                "ano":        c.ano,
                "cargo":      c.cargo,
                "estado_uf":  c.estado_uf,
                "votos":      c.votos_total,
                "situacao":   c.situacao_final,
                "eleito":     c.eleito,
            }
            for c in candidaturas
        ],
        "farol_ultima_eleicao": {
            "status":         farol_row.status if farol_row else None,
            "votos_atual":    farol_row.votos_atual if farol_row else None,
            "votos_anterior": farol_row.votos_anterior if farol_row else None,
            "variacao_pct":   farol_row.variacao_pct if farol_row else None,
        } if farol_row else None,
    }


@router.get("/votos")
async def get_votos(
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    """Votos por município na última candidatura."""
    candidato_id = await _get_candidato_id(usuario, db)

    # Última candidatura com votos
    ultima_q = await db.execute(
        select(Candidatura)
        .where(
            Candidatura.candidato_id == candidato_id,
            Candidatura.votos_total > 0,
        )
        .order_by(desc(Candidatura.ano))
        .limit(1)
    )
    ultima = ultima_q.scalar_one_or_none()
    if not ultima:
        return {"candidatura": None, "votos_por_municipio": []}

    # Votos por município
    vz_q = await db.execute(
        select(VotosPorZona, Municipio)
        .join(Municipio, VotosPorZona.municipio_id == Municipio.id)
        .where(VotosPorZona.candidatura_id == ultima.id)
        .order_by(desc(VotosPorZona.qt_votos))
        .limit(100)
    )
    votos = [
        {
            "municipio":  row.Municipio.nome,
            "estado_uf":  row.Municipio.estado_uf,
            "codigo_ibge":row.Municipio.codigo_ibge,
            "votos":      row.VotosPorZona.qt_votos,
        }
        for row in vz_q.fetchall()
    ]

    return {
        "candidatura": {
            "ano":    ultima.ano,
            "cargo":  ultima.cargo,
            "estado": ultima.estado_uf,
            "votos_total": ultima.votos_total,
            "eleito": ultima.eleito,
        },
        "votos_por_municipio": votos,
    }


@router.get("/dossie", response_model=DossiePolitico)
async def get_meu_dossie(
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
) -> DossiePolitico:
    """Dossiê do próprio político (perfil POLITICO acessando seus dados)."""
    candidato_id = await _get_candidato_id(usuario, db)
    try:
        return await compilar_dossie(db, candidato_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


# /dossie/pdf removido — o PDF do dossiê foi reescrito na Fase 4 do refactor
# e fica acessível em GET /dossie/{id}/pdf (rota única, single source of truth).
