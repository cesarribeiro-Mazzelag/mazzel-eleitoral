"""
Endpoints do Radar Político — listagens leves de Políticos e Partidos.

Estes endpoints servem **a listagem** do hub. O dossiê detalhado de um único
candidato continua em `GET /dossie/{candidato_id}` (single source of truth).

GET /radar/politicos  — lista paginada de políticos com filtros
GET /radar/partidos   — lista paginada de partidos com filtros
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import requer_qualquer
from app.models.operacional import Usuario
from app.radar.dimensions.politicos import listar_politicos
from app.radar.dimensions.partidos import listar_partidos
from app.schemas.radar import (
    FiltrosPartidos,
    FiltrosPoliticos,
    RadarPartidosResponse,
    RadarPoliticosResponse,
)


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


@router.get("/politicos", response_model=RadarPoliticosResponse)
async def get_radar_politicos(
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
) -> RadarPoliticosResponse:
    """Lista de politicos do Radar - paginada, com filtros e ordenacao."""
    filtros = FiltrosPoliticos(
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
    return await listar_politicos(db, filtros)


@router.get("/partidos", response_model=RadarPartidosResponse)
async def get_radar_partidos(
    ano:           Optional[int] = Query(None),
    busca:         Optional[str] = Query(None, min_length=2),
    ordenar_por:   str = Query("votos_total"),
    pagina:        int = Query(1, ge=1),
    por_pagina:    int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
) -> RadarPartidosResponse:
    """Lista de partidos do Radar — paginada, com filtros."""
    filtros = FiltrosPartidos(
        ano=ano,
        busca=busca,
        ordenar_por=ordenar_por,                  # type: ignore[arg-type]
        pagina=pagina,
        por_pagina=por_pagina,
    )
    return await listar_partidos(db, filtros)
