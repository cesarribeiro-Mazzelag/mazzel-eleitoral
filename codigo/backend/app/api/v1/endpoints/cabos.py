"""
Módulo Cabos Eleitorais
CRUD + performance + vínculos com escolas e zonas
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func, text, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_usuario_atual
from app.models.operacional import (
    CaboEleitoral, CaboZona, CaboEscola,
    StatusCabo, PerformanceCabo, Usuario, PerfilUsuario,
)
from app.models.eleitoral import Municipio, ZonaEleitoral

router = APIRouter()

# ─── Schemas ─────────────────────────────────────────────────────────────────

class CaboCreate(BaseModel):
    nome_completo:  str
    nome_guerra:    Optional[str]  = None
    telefone:       Optional[str]  = None
    whatsapp:       Optional[str]  = None
    email:          Optional[str]  = None
    cpf:            Optional[str]  = None
    municipio_id:   int
    bairros:        Optional[str]  = None
    coordenador_id: Optional[int]  = None
    lideranca_id:   Optional[int]  = None
    status:         StatusCabo     = StatusCabo.ATIVO
    data_inicio:    Optional[date] = None
    data_fim:       Optional[date] = None
    valor_contrato: Optional[float] = None
    meta_votos:     Optional[int]  = None
    observacoes:    Optional[str]  = None
    zona_ids:       List[int]      = []
    escola_ids:     List[int]      = []


class CaboUpdate(BaseModel):
    nome_completo:  Optional[str]  = None
    nome_guerra:    Optional[str]  = None
    telefone:       Optional[str]  = None
    whatsapp:       Optional[str]  = None
    email:          Optional[str]  = None
    bairros:        Optional[str]  = None
    coordenador_id: Optional[int]  = None
    lideranca_id:   Optional[int]  = None
    status:         Optional[StatusCabo] = None
    data_inicio:    Optional[date] = None
    data_fim:       Optional[date] = None
    valor_contrato: Optional[float] = None
    meta_votos:     Optional[int]  = None
    observacoes:    Optional[str]  = None
    zona_ids:       Optional[List[int]] = None
    escola_ids:     Optional[List[int]] = None


class CaboOut(BaseModel):
    id:               int
    nome_completo:    str
    nome_guerra:      Optional[str]
    telefone:         Optional[str]
    whatsapp:         Optional[str]
    email:            Optional[str]
    municipio_id:     int
    municipio_nome:   Optional[str]
    bairros:          Optional[str]
    coordenador_id:   Optional[int]
    lideranca_id:     Optional[int]
    status:           str
    data_inicio:      Optional[date]
    data_fim:         Optional[date]
    valor_contrato:   Optional[float]
    meta_votos:       Optional[int]
    ciclo_ref:        Optional[int]
    votos_ciclo_atual:    Optional[int]
    votos_ciclo_anterior: Optional[int]
    eleitores_area:   Optional[int]
    conversao_pct:    Optional[float]
    variacao_pct:     Optional[float]
    performance:      str
    zona_ids:         List[int]
    escola_ids:       List[int]
    observacoes:      Optional[str]
    criado_em:        datetime

    class Config:
        from_attributes = True


# ─── Helper ───────────────────────────────────────────────────────────────────

async def _enrich(c: CaboEleitoral, db: AsyncSession) -> dict:
    m = await db.get(Municipio, c.municipio_id)
    return {
        **{k: getattr(c, k) for k in [
            "id", "nome_completo", "nome_guerra", "telefone", "whatsapp", "email",
            "municipio_id", "bairros", "coordenador_id", "lideranca_id", "status",
            "data_inicio", "data_fim", "valor_contrato", "meta_votos",
            "ciclo_ref", "votos_ciclo_atual", "votos_ciclo_anterior",
            "eleitores_area", "conversao_pct", "variacao_pct", "performance",
            "observacoes", "criado_em",
        ]},
        "municipio_nome": m.nome if m else None,
        "zona_ids":   [z.zona_id   for z in (c.zonas   or [])],
        "escola_ids": [e.local_votacao_id for e in (c.escolas or [])],
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/", summary="Listar cabos eleitorais")
async def listar_cabos(
    municipio_id:   Optional[int] = None,
    coordenador_id: Optional[int] = None,
    status:         Optional[str] = None,
    performance:    Optional[str] = None,
    q:              Optional[str] = None,
    page:           int = Query(1, ge=1),
    per_page:       int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _:  Usuario      = Depends(get_usuario_atual),
):
    query = (
        select(CaboEleitoral)
        .options(selectinload(CaboEleitoral.zonas), selectinload(CaboEleitoral.escolas))
        .order_by(CaboEleitoral.nome_completo)
    )
    if municipio_id:   query = query.where(CaboEleitoral.municipio_id   == municipio_id)
    if coordenador_id: query = query.where(CaboEleitoral.coordenador_id == coordenador_id)
    if status:         query = query.where(CaboEleitoral.status         == status)
    if performance:    query = query.where(CaboEleitoral.performance     == performance)
    if q:
        query = query.where(or_(
            CaboEleitoral.nome_completo.ilike(f"%{q}%"),
            CaboEleitoral.nome_guerra.ilike(f"%{q}%"),
        ))

    total  = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    offset = (page - 1) * per_page
    rows   = (await db.execute(query.offset(offset).limit(per_page))).scalars().all()
    items  = [await _enrich(r, db) for r in rows]
    return {"total": total, "page": page, "items": items}


@router.post("/", status_code=status.HTTP_201_CREATED, summary="Criar cabo eleitoral")
async def criar_cabo(
    body: CaboCreate,
    db:   AsyncSession = Depends(get_db),
    me:   Usuario      = Depends(get_usuario_atual),
):
    if me.perfil not in (PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA, PerfilUsuario.FUNCIONARIO):
        raise HTTPException(status_code=403, detail="Sem permissão")

    c = CaboEleitoral(**body.model_dump(exclude={"zona_ids", "escola_ids"}))
    db.add(c)
    await db.flush()

    for zid in body.zona_ids:
        db.add(CaboZona(cabo_id=c.id, zona_id=zid))
    for eid in body.escola_ids:
        db.add(CaboEscola(cabo_id=c.id, local_votacao_id=eid))

    await db.commit()
    await db.refresh(c)
    return await _enrich(c, db)


@router.get("/{cabo_id}", summary="Detalhe do cabo eleitoral")
async def detalhe_cabo(
    cabo_id: int,
    db: AsyncSession = Depends(get_db),
    _:  Usuario      = Depends(get_usuario_atual),
):
    c = await db.get(
        CaboEleitoral, cabo_id,
        options=[selectinload(CaboEleitoral.zonas), selectinload(CaboEleitoral.escolas)]
    )
    if not c:
        raise HTTPException(status_code=404, detail="Cabo não encontrado")
    return await _enrich(c, db)


@router.patch("/{cabo_id}", summary="Atualizar cabo eleitoral")
async def atualizar_cabo(
    cabo_id: int,
    body:    CaboUpdate,
    db:      AsyncSession = Depends(get_db),
    me:      Usuario      = Depends(get_usuario_atual),
):
    if me.perfil not in (PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA, PerfilUsuario.FUNCIONARIO):
        raise HTTPException(status_code=403, detail="Sem permissão")

    c = await db.get(
        CaboEleitoral, cabo_id,
        options=[selectinload(CaboEleitoral.zonas), selectinload(CaboEleitoral.escolas)]
    )
    if not c:
        raise HTTPException(status_code=404, detail="Não encontrado")

    data = body.model_dump(exclude_unset=True, exclude={"zona_ids", "escola_ids"})
    for k, v in data.items():
        setattr(c, k, v)

    if body.zona_ids is not None:
        for z in c.zonas:
            await db.delete(z)
        for zid in body.zona_ids:
            db.add(CaboZona(cabo_id=c.id, zona_id=zid))

    if body.escola_ids is not None:
        for e in c.escolas:
            await db.delete(e)
        for eid in body.escola_ids:
            db.add(CaboEscola(cabo_id=c.id, local_votacao_id=eid))

    c.atualizado_em = datetime.utcnow()
    await db.commit()
    await db.refresh(c)
    return await _enrich(c, db)


@router.delete("/{cabo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_cabo(
    cabo_id: int,
    db: AsyncSession = Depends(get_db),
    me: Usuario      = Depends(get_usuario_atual),
):
    if me.perfil not in (PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA):
        raise HTTPException(status_code=403, detail="Sem permissão")
    c = await db.get(CaboEleitoral, cabo_id)
    if not c:
        raise HTTPException(status_code=404, detail="Não encontrado")
    await db.delete(c)
    await db.commit()


# ─── Performance ─────────────────────────────────────────────────────────────

@router.get("/{cabo_id}/performance", summary="Métricas de performance do cabo")
async def performance_cabo(
    cabo_id: int,
    db: AsyncSession = Depends(get_db),
    _:  Usuario      = Depends(get_usuario_atual),
):
    """
    Retorna métricas de conversão do cabo nas suas escolas.
    Usa resultados_zona quando disponível (pós-ETL completo).
    Fallback: market share calculado de votos_por_zona.
    """
    c = await db.get(
        CaboEleitoral, cabo_id,
        options=[selectinload(CaboEleitoral.zonas), selectinload(CaboEleitoral.escolas)]
    )
    if not c:
        raise HTTPException(status_code=404, detail="Não encontrado")

    escola_ids = [e.local_votacao_id for e in (c.escolas or [])]
    zona_ids   = [z.zona_id          for z in (c.zonas   or [])]

    if not escola_ids and not zona_ids:
        return {
            "cabo_id":         cabo_id,
            "nome":            c.nome_completo,
            "performance":     c.performance,
            "conversao_pct":   c.conversao_pct,
            "variacao_pct":    c.variacao_pct,
            "ciclo_ref":       c.ciclo_ref,
            "escolas":         [],
            "msg":             "Nenhuma escola ou zona vinculada."
        }

    # Busca dados de resultados_zona para as escolas/zonas do cabo
    filtro_zona = ""
    filtro_local = ""
    params: dict = {}

    if zona_ids:
        placeholders = ", ".join(f":z{i}" for i in range(len(zona_ids)))
        filtro_zona = f"AND rz.zona_id IN ({placeholders})"
        for i, zid in enumerate(zona_ids):
            params[f"z{i}"] = zid

    if escola_ids:
        placeholders = ", ".join(f":e{i}" for i in range(len(escola_ids)))
        filtro_local = f"AND rz.local_votacao_id IN ({placeholders})"
        for i, eid in enumerate(escola_ids):
            params[f"e{i}"] = eid

    sql = text(f"""
        SELECT
            rz.ano,
            rz.turno,
            rz.cargo,
            rz.local_votacao_id,
            lv.nome_local                           AS escola_nome,
            rz.qt_votos_partido,
            rz.qt_eleitores,
            rz.qt_comparecimento,
            rz.qt_abstencoes,
            rz.qt_votos_validos,
            rz.qt_votos_brancos,
            rz.qt_votos_nulos,
            rz.pct_conversao,
            rz.pct_market_share,
            rz.pct_comparecimento
        FROM resultados_zona rz
        LEFT JOIN locais_votacao lv ON lv.id = rz.local_votacao_id
        WHERE 1=1
          {filtro_zona}
          {filtro_local}
        ORDER BY rz.ano DESC, rz.turno, rz.cargo
        LIMIT 500
    """)

    rows = (await db.execute(sql, params)).fetchall()

    por_ano: dict = {}
    for r in rows:
        key = (r.ano, r.turno, r.cargo)
        if key not in por_ano:
            por_ano[key] = {
                "ano": r.ano, "turno": r.turno, "cargo": r.cargo,
                "escolas": [], "totais": {
                    "qt_votos_partido": 0, "qt_eleitores": 0,
                    "qt_comparecimento": 0, "qt_votos_validos": 0,
                    "qt_votos_brancos": 0, "qt_votos_nulos": 0,
                }
            }
        grp = por_ano[key]
        grp["escolas"].append({
            "local_votacao_id": r.local_votacao_id,
            "escola_nome":      r.escola_nome,
            "qt_votos_partido": r.qt_votos_partido,
            "qt_eleitores":     r.qt_eleitores,
            "qt_comparecimento":r.qt_comparecimento,
            "qt_votos_validos": r.qt_votos_validos,
            "qt_votos_brancos": r.qt_votos_brancos,
            "qt_votos_nulos":   r.qt_votos_nulos,
            "pct_conversao":    r.pct_conversao,
            "pct_market_share": r.pct_market_share,
        })
        for campo in ("qt_votos_partido", "qt_eleitores", "qt_comparecimento",
                       "qt_votos_validos", "qt_votos_brancos", "qt_votos_nulos"):
            val = getattr(r, campo) or 0
            grp["totais"][campo] = (grp["totais"][campo] or 0) + val

    ciclos = list(por_ano.values())

    return {
        "cabo_id":       cabo_id,
        "nome":          c.nome_completo,
        "performance":   c.performance,
        "conversao_pct": c.conversao_pct,
        "variacao_pct":  c.variacao_pct,
        "ciclo_ref":     c.ciclo_ref,
        "meta_votos":    c.meta_votos,
        "ciclos":        ciclos,
        "total_escolas": len(escola_ids),
        "total_zonas":   len(zona_ids),
    }


# ─── Ranking de cabos ─────────────────────────────────────────────────────────

@router.get("/ranking/performance", summary="Ranking de cabos por conversão")
async def ranking_cabos(
    municipio_id:   Optional[int] = None,
    coordenador_id: Optional[int] = None,
    limit:          int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _:  Usuario      = Depends(get_usuario_atual),
):
    query = (
        select(CaboEleitoral)
        .options(selectinload(CaboEleitoral.zonas), selectinload(CaboEleitoral.escolas))
        .where(CaboEleitoral.conversao_pct.isnot(None))
        .order_by(CaboEleitoral.conversao_pct.desc())
        .limit(limit)
    )
    if municipio_id:   query = query.where(CaboEleitoral.municipio_id   == municipio_id)
    if coordenador_id: query = query.where(CaboEleitoral.coordenador_id == coordenador_id)

    rows = (await db.execute(query)).scalars().all()
    return [await _enrich(r, db) for r in rows]
