"""
Endpoints de Políticos
  GET /politicos/buscar      - busca por nome (autocomplete)
  GET /politicos/{id}        - dados básicos do candidato

Nota: GET /dossie/{id} migrou para `app/api/v1/endpoints/dossie.py`
(rota única, single source of truth — evita duplicação).
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, text

from app.core.database import get_db
from app.core.deps import requer_qualquer
from app.models.operacional import Usuario
from app.models.eleitoral import Candidato, Candidatura

router = APIRouter()

PARTIDOS_UB = (44, 25, 17)


@router.get("/buscar")
async def buscar_politicos(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """Busca políticos pelo nome (autocomplete)."""
    rows = await db.execute(text("""
        SELECT DISTINCT c.id,
               COALESCE(c.nome_urna, c.nome_completo) AS nome,
               ca.cargo,
               ca.estado_uf,
               ca.ano,
               ca.eleito
        FROM candidatos c
        JOIN candidaturas ca ON ca.candidato_id = c.id
        JOIN partidos p ON p.id = ca.partido_id
        WHERE UPPER(COALESCE(c.nome_urna, c.nome_completo)) LIKE :q
          AND p.numero IN (44, 25, 17)
        ORDER BY ca.eleito DESC, ca.ano DESC, nome
        LIMIT 20
    """), {"q": f"%{q.upper()}%"})

    return [
        {
            "id":        r.id,
            "nome":      r.nome,
            "cargo":     r.cargo,
            "estado_uf": r.estado_uf,
            "ano":       r.ano,
            "eleito":    r.eleito,
        }
        for r in rows.fetchall()
    ]


@router.get("/{candidato_id}")
async def get_politico(
    candidato_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """Dados básicos de um candidato."""
    cand = await db.execute(
        select(Candidato).where(Candidato.id == candidato_id)
    )
    c = cand.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Candidato não encontrado")

    # Última candidatura
    ultima_q = await db.execute(
        select(Candidatura)
        .where(Candidatura.candidato_id == candidato_id)
        .order_by(desc(Candidatura.ano))
        .limit(1)
    )
    ultima = ultima_q.scalar_one_or_none()

    return {
        "id":             c.id,
        "nome_completo":  c.nome_completo,
        "nome_urna":      c.nome_urna,
        "foto_url":       c.foto_url,
        "genero":         c.genero,
        "grau_instrucao": c.grau_instrucao,
        "ocupacao":       c.ocupacao,
        "cargo_atual":    ultima.cargo if ultima else None,
        "estado_uf":      ultima.estado_uf if ultima else None,
        "ano_ultimo":     ultima.ano if ultima else None,
        "eleito_ultimo":  ultima.eleito if ultima else None,
    }


# Endpoints /dossie e /dossie/pdf migraram para `app/api/v1/endpoints/dossie.py`
# (rota única `GET /dossie/{id}`). Evita duplicação — single source of truth.
