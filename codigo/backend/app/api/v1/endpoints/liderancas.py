"""
Módulo Territorial — Lideranças
CRUD completo + score + ranking + alertas territoriais
"""
from __future__ import annotations

import json
from datetime import date, datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, text, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_usuario_atual, requer_qualquer, requer_diretoria, requer_presidente
from app.models.operacional import (
    Lideranca, LiderancaEscola, CercaVirtual, CercaLideranca,
    StatusLideranca, ScoreLideranca, Usuario, PerfilUsuario,
)
from app.models.eleitoral import Municipio, ZonaEleitoral

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class LiderancaCreate(BaseModel):
    nome_completo:   str
    nome_politico:   Optional[str]  = None
    telefone:        Optional[str]  = None
    whatsapp:        Optional[str]  = None
    email:           Optional[str]  = None
    municipio_id:    int
    bairro:          Optional[str]  = None
    zona_id:         Optional[int]  = None
    coordenador_id:  Optional[int]  = None
    equipe:          Optional[str]  = None
    status:          StatusLideranca = StatusLideranca.ATIVO
    data_entrada:    Optional[date] = None
    observacoes:     Optional[str]  = None
    escola_ids:      List[int]      = Field(default_factory=list)


class LiderancaUpdate(BaseModel):
    nome_completo:   Optional[str]  = None
    nome_politico:   Optional[str]  = None
    telefone:        Optional[str]  = None
    whatsapp:        Optional[str]  = None
    email:           Optional[str]  = None
    bairro:          Optional[str]  = None
    zona_id:         Optional[int]  = None
    coordenador_id:  Optional[int]  = None
    equipe:          Optional[str]  = None
    status:          Optional[StatusLideranca] = None
    data_entrada:    Optional[date] = None
    observacoes:     Optional[str]  = None
    escola_ids:      Optional[List[int]] = None


class LiderancaOut(BaseModel):
    id:                  int
    nome_completo:       str
    nome_politico:       Optional[str]
    telefone:            Optional[str]
    whatsapp:            Optional[str]
    email:               Optional[str]
    municipio_id:        int
    municipio_nome:      Optional[str]
    bairro:              Optional[str]
    zona_id:             Optional[int]
    zona_nome:           Optional[str]
    coordenador_id:      Optional[int]
    coordenador_nome:    Optional[str]
    equipe:              Optional[str]
    status:              str
    data_entrada:        Optional[date]
    score_valor:         Optional[float]
    score_classificacao: Optional[str]
    score_calculado_em:  Optional[datetime]
    observacoes:         Optional[str]
    escola_ids:          List[int]
    criado_em:           datetime

    class Config:
        from_attributes = True


class CercaCreate(BaseModel):
    nome:            str
    cor_hex:         str            = "#7B2FBE"
    estado_uf:       str
    municipio_id:    Optional[int]  = None
    equipe:          Optional[str]  = None
    observacoes:     Optional[str]  = None
    geometria_json:  str            # GeoJSON string do polígono


class CercaUpdate(BaseModel):
    nome:            Optional[str]  = None
    cor_hex:         Optional[str]  = None
    equipe:          Optional[str]  = None
    observacoes:     Optional[str]  = None
    geometria_json:  Optional[str]  = None
    ativo:           Optional[bool] = None


class CercaOut(BaseModel):
    id:               int
    nome:             str
    cor_hex:          str
    estado_uf:        str
    municipio_id:     Optional[int]
    responsavel_id:   Optional[int]
    equipe:           Optional[str]
    observacoes:      Optional[str]
    geometria_json:   Optional[str]
    total_votos:      int
    total_eleitores:  Optional[int]
    total_liderancas: int
    total_escolas:    int
    total_zonas:      int
    consolidado_em:   Optional[datetime]
    ativo:            bool
    criado_em:        datetime

    class Config:
        from_attributes = True


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _calcular_score(votos_atual: int, votos_anterior: int, ciclos_ativo: int) -> tuple[float, str]:
    """
    Fórmula: (volume×40%) + (crescimento×30%) + (constância×30%)
    Retorna (score 0-100, classificação)
    """
    # Volume: normalizado sobre 10.000 votos como benchmark 100%
    vol = min(votos_atual / 10_000, 1.0) * 100 * 0.40

    # Crescimento: -50% a +50% mapeado para 0-100
    if votos_anterior > 0:
        cresc_pct = (votos_atual - votos_anterior) / votos_anterior
    else:
        cresc_pct = 0.5 if votos_atual > 0 else 0.0
    cresc = min(max((cresc_pct + 0.5) / 1.0, 0), 1.0) * 100 * 0.30

    # Constância: ciclos_ativo / 4 eleições máximo
    const = min(ciclos_ativo / 4, 1.0) * 100 * 0.30

    score = vol + cresc + const

    if score >= 75:
        cls = "OURO"
    elif score >= 50:
        cls = "PRATA"
    elif score >= 25:
        cls = "BRONZE"
    else:
        cls = "CRITICO"

    return round(score, 1), cls


async def _enrich_lideranca(l: Lideranca, db: AsyncSession) -> dict:
    """Monta LiderancaOut com nomes desnormalizados."""
    municipio_nome = None
    if l.municipio_id:
        m = await db.get(Municipio, l.municipio_id)
        municipio_nome = m.nome if m else None

    zona_nome = None
    if l.zona_id:
        z = await db.get(ZonaEleitoral, l.zona_id)
        zona_nome = f"Zona {z.numero}" if z else None

    coordenador_nome = None
    if l.coordenador_id:
        from app.models.operacional import Coordenador
        c = await db.get(Coordenador, l.coordenador_id)
        coordenador_nome = c.nome if c else None

    escola_ids = [e.local_votacao_id for e in l.escolas] if l.escolas else []

    return {
        **{k: getattr(l, k) for k in [
            "id", "nome_completo", "nome_politico", "telefone", "whatsapp",
            "email", "municipio_id", "bairro", "zona_id", "coordenador_id",
            "equipe", "status", "data_entrada", "score_valor",
            "score_classificacao", "score_calculado_em", "observacoes", "criado_em"
        ]},
        "municipio_nome":   municipio_nome,
        "zona_nome":        zona_nome,
        "coordenador_nome": coordenador_nome,
        "escola_ids":       escola_ids,
    }


# ─── Utilitário: Municípios por UF ───────────────────────────────────────────

@router.get("/util/municipios/{uf}", summary="Lista municípios de um estado")
async def municipios_por_uf(
    uf: str,
    db: AsyncSession = Depends(get_db),
    _:  Usuario      = Depends(get_usuario_atual),
):
    rows = (await db.execute(
        select(Municipio.id, Municipio.nome)
        .where(Municipio.estado_uf == uf.upper())
        .order_by(Municipio.nome)
    )).all()
    return [{"id": r.id, "nome": r.nome} for r in rows]


# ─── Endpoints: Lideranças ────────────────────────────────────────────────────

@router.get("/", summary="Listar lideranças")
async def listar_liderancas(
    municipio_id:   Optional[int]   = None,
    estado_uf:      Optional[str]   = None,
    coordenador_id: Optional[int]   = None,
    status:         Optional[str]   = None,
    classificacao:  Optional[str]   = None,
    q:              Optional[str]   = None,
    page:           int             = Query(1, ge=1),
    per_page:       int             = Query(50, ge=1, le=200),
    db:             AsyncSession    = Depends(get_db),
    _:              Usuario         = Depends(get_usuario_atual),
):
    query = (
        select(Lideranca)
        .options(selectinload(Lideranca.escolas))
        .order_by(Lideranca.nome_completo)
    )

    if municipio_id:
        query = query.where(Lideranca.municipio_id == municipio_id)
    if coordenador_id:
        query = query.where(Lideranca.coordenador_id == coordenador_id)
    if status:
        query = query.where(Lideranca.status == status)
    if classificacao:
        query = query.where(Lideranca.score_classificacao == classificacao)
    if q:
        query = query.where(
            or_(
                Lideranca.nome_completo.ilike(f"%{q}%"),
                Lideranca.nome_politico.ilike(f"%{q}%"),
            )
        )
    if estado_uf:
        query = query.join(Municipio, Lideranca.municipio_id == Municipio.id)\
                     .where(Municipio.estado_uf == estado_uf)

    # Total
    total_q = select(func.count()).select_from(query.subquery())
    total   = (await db.execute(total_q)).scalar_one()

    # Paginação
    offset = (page - 1) * per_page
    rows   = (await db.execute(query.offset(offset).limit(per_page))).scalars().all()

    items = [await _enrich_lideranca(r, db) for r in rows]
    return {"total": total, "page": page, "items": items}


@router.post("/", status_code=status.HTTP_201_CREATED, summary="Criar liderança")
async def criar_lideranca(
    body: LiderancaCreate,
    db:   AsyncSession = Depends(get_db),
    me:   Usuario      = Depends(get_usuario_atual),
):
    if me.perfil not in (PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA, PerfilUsuario.FUNCIONARIO):
        raise HTTPException(status_code=403, detail="Sem permissão")

    l = Lideranca(**body.model_dump(exclude={"escola_ids"}))
    db.add(l)
    await db.flush()  # gera id

    for eid in body.escola_ids:
        db.add(LiderancaEscola(lideranca_id=l.id, local_votacao_id=eid))

    await db.commit()
    await db.refresh(l)
    return await _enrich_lideranca(l, db)


@router.get("/{lideranca_id}", summary="Detalhe da liderança")
async def detalhe_lideranca(
    lideranca_id: int,
    db: AsyncSession = Depends(get_db),
    _:  Usuario      = Depends(get_usuario_atual),
):
    l = await db.get(
        Lideranca, lideranca_id,
        options=[selectinload(Lideranca.escolas), selectinload(Lideranca.cercas)]
    )
    if not l:
        raise HTTPException(status_code=404, detail="Liderança não encontrada")
    return await _enrich_lideranca(l, db)


@router.patch("/{lideranca_id}", summary="Atualizar liderança")
async def atualizar_lideranca(
    lideranca_id: int,
    body: LiderancaUpdate,
    db:   AsyncSession = Depends(get_db),
    me:   Usuario      = Depends(get_usuario_atual),
):
    if me.perfil not in (PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA, PerfilUsuario.FUNCIONARIO):
        raise HTTPException(status_code=403, detail="Sem permissão")

    l = await db.get(Lideranca, lideranca_id, options=[selectinload(Lideranca.escolas)])
    if not l:
        raise HTTPException(status_code=404, detail="Liderança não encontrada")

    data = body.model_dump(exclude_unset=True, exclude={"escola_ids"})
    for k, v in data.items():
        setattr(l, k, v)

    if body.escola_ids is not None:
        # Remove vínculos antigos e recria
        for e in l.escolas:
            await db.delete(e)
        for eid in body.escola_ids:
            db.add(LiderancaEscola(lideranca_id=l.id, local_votacao_id=eid))

    l.atualizado_em = datetime.utcnow()
    await db.commit()
    await db.refresh(l)
    return await _enrich_lideranca(l, db)


@router.delete("/{lideranca_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_lideranca(
    lideranca_id: int,
    db: AsyncSession = Depends(get_db),
    me: Usuario      = Depends(get_usuario_atual),
):
    if me.perfil != PerfilUsuario.PRESIDENTE:
        raise HTTPException(status_code=403, detail="Apenas PRESIDENTE pode deletar")
    l = await db.get(Lideranca, lideranca_id)
    if not l:
        raise HTTPException(status_code=404, detail="Não encontrada")
    await db.delete(l)
    await db.commit()


# ─── Score e Ranking ─────────────────────────────────────────────────────────

@router.get("/ranking/geral", summary="Ranking de lideranças por score")
async def ranking_liderancas(
    municipio_id: Optional[int] = None,
    estado_uf:    Optional[str] = None,
    limit:        int           = Query(20, ge=1, le=100),
    db: AsyncSession            = Depends(get_db),
    _:  Usuario                 = Depends(get_usuario_atual),
):
    query = (
        select(Lideranca)
        .options(selectinload(Lideranca.escolas))
        .where(Lideranca.score_valor.isnot(None))
        .order_by(Lideranca.score_valor.desc())
        .limit(limit)
    )
    if municipio_id:
        query = query.where(Lideranca.municipio_id == municipio_id)
    if estado_uf:
        query = query.join(Municipio).where(Municipio.estado_uf == estado_uf)

    rows = (await db.execute(query)).scalars().all()
    return [await _enrich_lideranca(r, db) for r in rows]


# ─── Endpoints: Cercas Virtuais ───────────────────────────────────────────────

@router.get("/cercas/", summary="Listar cercas virtuais")
async def listar_cercas(
    estado_uf:   Optional[str] = None,
    municipio_id: Optional[int] = None,
    db: AsyncSession            = Depends(get_db),
    _:  Usuario                 = Depends(get_usuario_atual),
):
    query = select(CercaVirtual).where(CercaVirtual.ativo == True).order_by(CercaVirtual.nome)
    if estado_uf:
        query = query.where(CercaVirtual.estado_uf == estado_uf)
    if municipio_id:
        query = query.where(CercaVirtual.municipio_id == municipio_id)
    rows = (await db.execute(query)).scalars().all()
    return rows


@router.post("/cercas/", status_code=status.HTTP_201_CREATED, summary="Criar cerca virtual")
async def criar_cerca(
    body: CercaCreate,
    db:   AsyncSession = Depends(get_db),
    me:   Usuario      = Depends(get_usuario_atual),
):
    if me.perfil not in (PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA):
        raise HTTPException(status_code=403, detail="Sem permissão")

    cerca = CercaVirtual(
        **body.model_dump(),
        responsavel_id=me.id,
    )
    db.add(cerca)
    await db.flush()

    # Salva geometria PostGIS a partir do GeoJSON
    if body.geometria_json:
        await db.execute(
            text("""
                UPDATE cercas_virtuais
                SET geometria_postgis = ST_GeomFromGeoJSON(:geojson)
                WHERE id = :id
            """),
            {"geojson": body.geometria_json, "id": cerca.id}
        )

    await _consolidar_cerca(cerca.id, db)
    await db.commit()
    await db.refresh(cerca)
    return cerca


@router.patch("/cercas/{cerca_id}", summary="Atualizar cerca virtual")
async def atualizar_cerca(
    cerca_id: int,
    body:     CercaUpdate,
    db:       AsyncSession = Depends(get_db),
    me:       Usuario      = Depends(get_usuario_atual),
):
    if me.perfil not in (PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA):
        raise HTTPException(status_code=403, detail="Sem permissão")

    cerca = await db.get(CercaVirtual, cerca_id)
    if not cerca:
        raise HTTPException(status_code=404, detail="Cerca não encontrada")

    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(cerca, k, v)

    if body.geometria_json:
        await db.execute(
            text("""
                UPDATE cercas_virtuais
                SET geometria_postgis = ST_GeomFromGeoJSON(:geojson)
                WHERE id = :id
            """),
            {"geojson": body.geometria_json, "id": cerca_id}
        )
        await _consolidar_cerca(cerca_id, db)

    cerca.atualizado_em = datetime.utcnow()
    await db.commit()
    await db.refresh(cerca)
    return cerca


@router.delete("/cercas/{cerca_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_cerca(
    cerca_id: int,
    db: AsyncSession = Depends(get_db),
    me: Usuario      = Depends(get_usuario_atual),
):
    if me.perfil != PerfilUsuario.PRESIDENTE:
        raise HTTPException(status_code=403, detail="Apenas PRESIDENTE pode deletar")
    c = await db.get(CercaVirtual, cerca_id)
    if not c:
        raise HTTPException(status_code=404, detail="Não encontrada")
    await db.delete(c)
    await db.commit()


@router.post("/cercas/{cerca_id}/consolidar", summary="Recalcular métricas da cerca")
async def consolidar_cerca(
    cerca_id: int,
    db: AsyncSession = Depends(get_db),
    me: Usuario      = Depends(get_usuario_atual),
):
    if me.perfil not in (PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA):
        raise HTTPException(status_code=403, detail="Sem permissão")
    await _consolidar_cerca(cerca_id, db)
    await db.commit()
    return {"ok": True}


async def _consolidar_cerca(cerca_id: int, db: AsyncSession):
    """
    Recalcula total_votos, total_liderancas, total_escolas e total_zonas
    para uma cerca virtual usando PostGIS spatial queries.
    """
    # Total de lideranças vinculadas manualmente
    total_liderancas = (await db.execute(
        select(func.count()).where(CercaLideranca.cerca_id == cerca_id)
    )).scalar_one()

    # Total de locais de votação dentro do polígono
    total_escolas = (await db.execute(text("""
        SELECT COUNT(*)
        FROM locais_votacao lv
        JOIN cercas_virtuais cv ON cv.id = :cerca_id
        WHERE cv.geometria_postgis IS NOT NULL
          AND ST_Within(
              ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326),
              cv.geometria_postgis
          )
    """), {"cerca_id": cerca_id})).scalar_one() or 0

    # Total de zonas eleitorais que contêm esses locais
    total_zonas = (await db.execute(text("""
        SELECT COUNT(DISTINCT lv.zona_id)
        FROM locais_votacao lv
        JOIN cercas_virtuais cv ON cv.id = :cerca_id
        WHERE cv.geometria_postgis IS NOT NULL
          AND ST_Within(
              ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326),
              cv.geometria_postgis
          )
    """), {"cerca_id": cerca_id})).scalar_one() or 0

    await db.execute(
        text("""
            UPDATE cercas_virtuais
            SET total_liderancas = :tl,
                total_escolas    = :te,
                total_zonas      = :tz,
                consolidado_em   = now()
            WHERE id = :id
        """),
        {"tl": total_liderancas, "te": total_escolas, "tz": total_zonas, "id": cerca_id}
    )
