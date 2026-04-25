"""Endpoint canonico do modulo Dossies (Biblioteca de Dossies Politicos).

GET /dossies        - lista paginada de cartinhas com filtros e ordenacao
GET /dossie/{id}    - dossie completo (single source of truth, em dossie.py)

Em 21/04/2026 o "Radar Politico" foi unificado com "Dossies". Este endpoint
e a fonte canonica da listagem. O alias `/radar/politicos` (em radar.py)
delega pra mesma funcao e existe so pra nao quebrar a versao preservada.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import requer_qualquer
from app.dossie.listagem import listar_dossies
from app.models.operacional import Usuario
from app.schemas.radar import DossiesListagemResponse, FiltrosDossies


router = APIRouter()


def _split_csv(value: Optional[str]) -> Optional[list[str]]:
    if not value:
        return None
    parts = [p.strip() for p in value.split(",") if p.strip()]
    return parts or None


def _split_csv_int(value: Optional[str]) -> Optional[list[int]]:
    if not value:
        return None
    out: list[int] = []
    for p in value.split(","):
        p = p.strip()
        if not p:
            continue
        try:
            out.append(int(p))
        except ValueError:
            continue
    return out or None


@router.get("")
async def get_dossies(
    classificacao: Optional[str] = Query(None, description="CSV: FORTE,EM_RISCO,..."),
    risco:         Optional[str] = Query(None, description="CSV: BAIXO,MEDIO,ALTO"),
    status:        Optional[str] = Query(None, description="CSV: ELEITO,NAO_ELEITO,SUPLENTE_ASSUMIU,SUPLENTE_ESPERA"),
    cargo:         Optional[str] = Query(None, description="CSV: PRESIDENTE,GOVERNADOR,..."),
    estado_uf:     Optional[str] = Query(None, description="CSV: SP,RJ,MG,..."),
    ano:           Optional[str] = Query(None, description="CSV: 2018,2022,..."),
    tier:          Optional[str] = Query(None, description="dourado|ouro|prata|bronze"),
    trait:         Optional[str] = Query(None, description="LEGEND|CAMPEAO|FERA|COMEBACK|ESTREANTE"),
    busca:         Optional[str] = Query(None, min_length=2),
    ordenar_por:   str = Query("overall_desc"),
    pagina:        int = Query(1, ge=1),
    por_pagina:    int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
) -> DossiesListagemResponse:
    """Biblioteca de Dossies Politicos - paginada, com filtros e ordenacao."""
    filtros = FiltrosDossies(
        classificacao=_split_csv(classificacao),  # type: ignore[arg-type]
        risco=_split_csv(risco),                  # type: ignore[arg-type]
        status=_split_csv(status),                # type: ignore[arg-type]
        cargo=_split_csv(cargo),
        estado_uf=_split_csv(estado_uf),
        ano=_split_csv_int(ano),
        tier=tier,
        trait=trait,
        busca=busca,
        ordenar_por=ordenar_por,                  # type: ignore[arg-type]
        pagina=pagina,
        por_pagina=por_pagina,
    )
    return await listar_dossies(db, filtros)
