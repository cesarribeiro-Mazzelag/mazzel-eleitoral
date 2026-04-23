"""
Modulo Campanha — CRUD REST com RBAC cascata hierarquico (Fase B2).
Fase B3 (agregacoes PostGIS + workers) pendente.

Prefixos registrados em main.py:
  /pessoas-base       — PessoaBase
  /campanhas          — Campanha
  /cercas             — CercaVirtual
  /papeis-campanha    — PapelCampanhaModel
  /metas-cerca        — MetaCerca
  /cercas-agregacoes  — CercaAgregacao (so leitura)
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping, Point
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_usuario_atual
from app.models.campanha import (
    CampCerca,
    Campanha,
    CercaAgregacao,
    MetaCerca,
    PapelCampanhaModel,
    PessoaBase,
)
# Alias retrocompat interno (CercaVirtual conflita com app.models.operacional)
CercaVirtual = CampCerca
from app.models.operacional import Usuario
from app.schemas.campanha import (
    CampanhaCreate,
    CampanhaListResponse,
    CampanhaRead,
    CampanhaUpdate,
    CercaAgregacaoRead,
    CercaVirtualCreate,
    CercaVirtualListResponse,
    CercaVirtualRead,
    CercaVirtualUpdate,
    MetaCercaCreate,
    MetaCercaRead,
    MetaCercaUpdate,
    PapelCampanhaCreate,
    PapelCampanhaListResponse,
    PapelCampanhaRead,
    PapelCampanhaUpdate,
    PessoaBaseCreate,
    PessoaBaseListResponse,
    PessoaBaseRead,
    PessoaBaseUpdate,
)
from app.services.campanha_rbac import (
    EscopoRBAC,
    calcular_escopo,
    get_papel_ativo_do_usuario,
    pode_criar_papel_abaixo,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Depends: escopo RBAC
# ---------------------------------------------------------------------------

async def get_escopo_rbac(
    usuario: Usuario = Depends(get_usuario_atual),
    db: AsyncSession = Depends(get_db),
) -> EscopoRBAC:
    """Dependency: calcula e retorna EscopoRBAC para o usuario logado."""
    return await calcular_escopo(db, usuario)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _check_tenant(usuario: Usuario, tenant_id: int) -> None:
    """Garante que o usuario pertence ao tenant solicitado."""
    if usuario.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: tenant nao autorizado.",
        )


def _check_escopo_campanha(escopo: EscopoRBAC, campanha_id: UUID) -> None:
    """404 se a campanha nao esta no escopo visivel do usuario."""
    if escopo.campanhas_visiveis is not None and campanha_id not in escopo.campanhas_visiveis:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada.")


def _check_escopo_pessoa(escopo: EscopoRBAC, pessoa_id: UUID) -> None:
    """404 se a pessoa nao esta no escopo visivel do usuario."""
    if escopo.pessoas_visiveis is not None and pessoa_id not in escopo.pessoas_visiveis:
        raise HTTPException(status_code=404, detail="Pessoa nao encontrada.")


def _check_escopo_papel(escopo: EscopoRBAC, papel_id: UUID) -> None:
    """404 se o papel nao esta no escopo visivel do usuario."""
    if escopo.papeis_visiveis is not None and papel_id not in escopo.papeis_visiveis:
        raise HTTPException(status_code=404, detail="Papel nao encontrado.")


async def _get_or_404(db: AsyncSession, model, obj_id, label: str):
    result = await db.execute(select(model).where(model.id == obj_id))
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{label} nao encontrado(a).")
    return obj


def _poligono_para_geojson(poligono) -> Optional[dict]:
    """Converte geometria PostGIS (WKBElement) para dict GeoJSON, ou None."""
    if poligono is None:
        return None
    try:
        shp = to_shape(poligono)
        return mapping(shp)
    except Exception:
        return None


async def _poligono_para_wkt(db: AsyncSession, create: CercaVirtualCreate) -> Optional[str]:
    """
    Converte o input de poligono para WKT SRID=4326 usando PostGIS quando necessario.
    Retorna None se nenhum modo foi fornecido.
    """
    # Modo 1: GeoJSON direto
    if create.geojson_poligono:
        gj_str = json.dumps(create.geojson_poligono)
        row = await db.execute(
            text("SELECT ST_AsText(ST_SetSRID(ST_GeomFromGeoJSON(:gj), 4326)) AS wkt"),
            {"gj": gj_str},
        )
        return row.scalar_one_or_none()

    # Modo 2: Raio + Centro — gera buffer circular via PostGIS (retorna Polygon)
    if create.raio_metros is not None and create.centro is not None:
        row = await db.execute(
            text(
                "SELECT ST_AsText(ST_SetSRID("
                "  ST_Buffer("
                "    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,"
                "    :raio"
                "  )::geometry,"
                "  4326"
                ")) AS wkt"
            ),
            {"lat": create.centro.lat, "lng": create.centro.lng, "raio": create.raio_metros},
        )
        return row.scalar_one_or_none()

    # Modo 3: bairros_oficiais_ids — sem tabela de bairros ainda; salva lista, sem poligono
    return None


def _cerca_to_read(cerca: CercaVirtual) -> CercaVirtualRead:
    data = {
        "id": cerca.id,
        "campanha_id": cerca.campanha_id,
        "parent_id": cerca.parent_id,
        "nome": cerca.nome,
        "cor_hex": cerca.cor_hex,
        "observacoes": cerca.observacoes,
        "responsavel_papel_id": cerca.responsavel_papel_id,
        "poligono_geojson": _poligono_para_geojson(cerca.poligono),
        "tipo_criacao": cerca.tipo_criacao,
        "raio_metros": cerca.raio_metros,
        "bairros_oficiais_ids": cerca.bairros_oficiais_ids,
        "status": cerca.status,
        "data_criacao": cerca.data_criacao,
        "criado_em": cerca.criado_em,
        "atualizado_em": cerca.atualizado_em,
    }
    return CercaVirtualRead(**data)


# ===========================================================================
# PESSOAS BASE
# ===========================================================================

@router.post("/pessoas-base", response_model=PessoaBaseRead, status_code=201, tags=["campanha-pessoas"])
async def criar_pessoa(
    body: PessoaBaseCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    _check_tenant(usuario, body.tenant_id)
    pessoa = PessoaBase(**body.model_dump())
    db.add(pessoa)
    await db.commit()
    await db.refresh(pessoa)
    return PessoaBaseRead.model_validate(pessoa)


@router.get("/pessoas-base", response_model=PessoaBaseListResponse, tags=["campanha-pessoas"])
async def listar_pessoas(
    tenant_id: int = Query(...),
    nome: Optional[str] = Query(None),
    cpf: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
    escopo: EscopoRBAC = Depends(get_escopo_rbac),
):
    _check_tenant(usuario, tenant_id)
    q = select(PessoaBase).where(PessoaBase.tenant_id == tenant_id)
    if nome:
        q = q.where(PessoaBase.nome_completo.ilike(f"%{nome}%"))
    if cpf:
        cpf_clean = "".join(c for c in cpf if c.isdigit())
        q = q.where(PessoaBase.cpf == cpf_clean)
    if status:
        q = q.where(PessoaBase.status == status)

    # RBAC: filtrar por pessoas visiveis
    if escopo.pessoas_visiveis is not None:
        if not escopo.pessoas_visiveis:
            # Sem escopo: retorna vazio sem bater no banco
            return PessoaBaseListResponse(total=0, page=page, limit=limit, items=[])
        q = q.where(PessoaBase.id.in_(escopo.pessoas_visiveis))

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar_one()

    offset = (page - 1) * limit
    rows = (await db.execute(q.offset(offset).limit(limit))).scalars().all()
    return PessoaBaseListResponse(
        total=total,
        page=page,
        limit=limit,
        items=[PessoaBaseRead.model_validate(p) for p in rows],
    )


@router.get("/pessoas-base/aniversariantes", response_model=list[PessoaBaseRead], tags=["campanha-pessoas"])
async def aniversariantes(
    tenant_id: int = Query(...),
    dia: str = Query("hoje", pattern="^(hoje|semana|mes)$"),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
    escopo: EscopoRBAC = Depends(get_escopo_rbac),
):
    """Retorna pessoas com aniversario hoje, nesta semana ou neste mes."""
    _check_tenant(usuario, tenant_id)

    # RBAC: escopo vazio => retorna lista vazia
    if escopo.pessoas_visiveis is not None and not escopo.pessoas_visiveis:
        return []

    now = datetime.now(tz=timezone.utc)

    if dia == "hoje":
        cond = text(
            "EXTRACT(MONTH FROM data_nascimento) = :m "
            "AND EXTRACT(DAY FROM data_nascimento) = :d"
        )
        params = {"m": now.month, "d": now.day}
    elif dia == "semana":
        cond = text(
            "TO_CHAR(data_nascimento, 'MM-DD') BETWEEN "
            "TO_CHAR(CURRENT_DATE, 'MM-DD') AND "
            "TO_CHAR(CURRENT_DATE + INTERVAL '6 days', 'MM-DD')"
        )
        params = {}
    else:  # mes
        cond = text("EXTRACT(MONTH FROM data_nascimento) = :m")
        params = {"m": now.month}

    q = (
        select(PessoaBase)
        .where(PessoaBase.tenant_id == tenant_id)
        .where(PessoaBase.data_nascimento.isnot(None))
        .where(PessoaBase.status == "ativo")
        .where(cond.bindparams(**params))
        .order_by(
            func.to_char(PessoaBase.data_nascimento, "MM-DD")
        )
    )

    # RBAC: filtrar pelo escopo
    if escopo.pessoas_visiveis is not None:
        q = q.where(PessoaBase.id.in_(escopo.pessoas_visiveis))

    rows = (await db.execute(q)).scalars().all()
    return [PessoaBaseRead.model_validate(p) for p in rows]


@router.get("/pessoas-base/{pessoa_id}", response_model=PessoaBaseRead, tags=["campanha-pessoas"])
async def detalhe_pessoa(
    pessoa_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
    escopo: EscopoRBAC = Depends(get_escopo_rbac),
):
    pessoa = await _get_or_404(db, PessoaBase, pessoa_id, "Pessoa")
    _check_tenant(usuario, pessoa.tenant_id)
    _check_escopo_pessoa(escopo, pessoa_id)
    return PessoaBaseRead.model_validate(pessoa)


@router.patch("/pessoas-base/{pessoa_id}", response_model=PessoaBaseRead, tags=["campanha-pessoas"])
async def atualizar_pessoa(
    pessoa_id: UUID,
    body: PessoaBaseUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    pessoa = await _get_or_404(db, PessoaBase, pessoa_id, "Pessoa")
    _check_tenant(usuario, pessoa.tenant_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(pessoa, field, value)
    await db.commit()
    await db.refresh(pessoa)
    return PessoaBaseRead.model_validate(pessoa)


@router.delete("/pessoas-base/{pessoa_id}", status_code=204, tags=["campanha-pessoas"])
async def remover_pessoa(
    pessoa_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    """Soft delete: muda status para 'removido'."""
    pessoa = await _get_or_404(db, PessoaBase, pessoa_id, "Pessoa")
    _check_tenant(usuario, pessoa.tenant_id)
    pessoa.status = "removido"
    await db.commit()


# ===========================================================================
# CAMPANHAS
# ===========================================================================

@router.post("/campanhas", response_model=CampanhaRead, status_code=201, tags=["campanha-campanhas"])
async def criar_campanha(
    body: CampanhaCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    _check_tenant(usuario, body.tenant_id)
    # Verifica candidato existe e e do mesmo tenant
    cand = await _get_or_404(db, PessoaBase, body.candidato_pessoa_id, "Candidato")
    if cand.tenant_id != body.tenant_id:
        raise HTTPException(400, "Candidato pertence a outro tenant.")
    campanha = Campanha(**body.model_dump())
    db.add(campanha)
    await db.commit()
    await db.refresh(campanha)
    return CampanhaRead.model_validate(campanha)


@router.get("/campanhas", response_model=CampanhaListResponse, tags=["campanha-campanhas"])
async def listar_campanhas(
    tenant_id: int = Query(...),
    ciclo: Optional[int] = Query(None),
    uf: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
    escopo: EscopoRBAC = Depends(get_escopo_rbac),
):
    _check_tenant(usuario, tenant_id)
    q = select(Campanha).where(Campanha.tenant_id == tenant_id)
    if ciclo:
        q = q.where(Campanha.ciclo_eleitoral == ciclo)
    if uf:
        q = q.where(Campanha.uf == uf.upper())
    if status:
        q = q.where(Campanha.status == status)

    # RBAC: filtrar campanhas visiveis
    if escopo.campanhas_visiveis is not None:
        if not escopo.campanhas_visiveis:
            return CampanhaListResponse(total=0, items=[])
        q = q.where(Campanha.id.in_(escopo.campanhas_visiveis))

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar_one()
    rows = (await db.execute(q.order_by(Campanha.criado_em.desc()))).scalars().all()
    return CampanhaListResponse(total=total, items=[CampanhaRead.model_validate(c) for c in rows])


@router.get("/campanhas/{campanha_id}", response_model=CampanhaRead, tags=["campanha-campanhas"])
async def detalhe_campanha(
    campanha_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
    escopo: EscopoRBAC = Depends(get_escopo_rbac),
):
    campanha = await _get_or_404(db, Campanha, campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    _check_escopo_campanha(escopo, campanha_id)
    return CampanhaRead.model_validate(campanha)


@router.patch("/campanhas/{campanha_id}", response_model=CampanhaRead, tags=["campanha-campanhas"])
async def atualizar_campanha(
    campanha_id: UUID,
    body: CampanhaUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    campanha = await _get_or_404(db, Campanha, campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(campanha, field, value)
    await db.commit()
    await db.refresh(campanha)
    return CampanhaRead.model_validate(campanha)


@router.delete("/campanhas/{campanha_id}", status_code=204, tags=["campanha-campanhas"])
async def arquivar_campanha(
    campanha_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    """Soft delete: status -> arquivada."""
    campanha = await _get_or_404(db, Campanha, campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    campanha.status = "arquivada"
    await db.commit()


# ===========================================================================
# CERCAS VIRTUAIS
# ===========================================================================

@router.post("/cercas", response_model=CercaVirtualRead, status_code=201, tags=["campanha-cercas"])
async def criar_cerca(
    body: CercaVirtualCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    # Valida campanha e tenant
    campanha = await _get_or_404(db, Campanha, body.campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)

    # Converte poligono para WKT PostGIS
    wkt = await _poligono_para_wkt(db, body)

    cerca_data = body.model_dump(
        exclude={"geojson_poligono", "centro"}
    )
    cerca = CercaVirtual(**cerca_data)

    if wkt:
        # Atribui via texto — geoalchemy2 aceita WKT/EWKT
        cerca.poligono = f"SRID=4326;{wkt}"

    if body.tipo_criacao == "raio" and body.centro:
        cerca.centro = f"SRID=4326;POINT({body.centro.lng} {body.centro.lat})"

    db.add(cerca)
    await db.commit()
    await db.refresh(cerca)
    return _cerca_to_read(cerca)


@router.get("/cercas", response_model=CercaVirtualListResponse, tags=["campanha-cercas"])
async def listar_cercas(
    campanha_id: UUID = Query(...),
    parent_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
    escopo: EscopoRBAC = Depends(get_escopo_rbac),
):
    campanha = await _get_or_404(db, Campanha, campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    # RBAC: campanha fora do escopo => 404
    _check_escopo_campanha(escopo, campanha_id)

    q = select(CercaVirtual).where(
        CercaVirtual.campanha_id == campanha_id,
        CercaVirtual.status == "ativa",
    )
    if parent_id is not None:
        q = q.where(CercaVirtual.parent_id == parent_id)

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar_one()
    rows = (await db.execute(q.order_by(CercaVirtual.nome))).scalars().all()
    return CercaVirtualListResponse(
        total=total,
        items=[_cerca_to_read(c) for c in rows],
    )


@router.get("/cercas/{cerca_id}", response_model=CercaVirtualRead, tags=["campanha-cercas"])
async def detalhe_cerca(
    cerca_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
    escopo: EscopoRBAC = Depends(get_escopo_rbac),
):
    cerca = await _get_or_404(db, CercaVirtual, cerca_id, "Cerca")
    campanha = await _get_or_404(db, Campanha, cerca.campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    _check_escopo_campanha(escopo, cerca.campanha_id)
    return _cerca_to_read(cerca)


@router.patch("/cercas/{cerca_id}", response_model=CercaVirtualRead, tags=["campanha-cercas"])
async def atualizar_cerca(
    cerca_id: UUID,
    body: CercaVirtualUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    cerca = await _get_or_404(db, CercaVirtual, cerca_id, "Cerca")
    campanha = await _get_or_404(db, Campanha, cerca.campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(cerca, field, value)
    await db.commit()
    await db.refresh(cerca)
    return _cerca_to_read(cerca)


@router.delete("/cercas/{cerca_id}", status_code=204, tags=["campanha-cercas"])
async def arquivar_cerca(
    cerca_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    cerca = await _get_or_404(db, CercaVirtual, cerca_id, "Cerca")
    campanha = await _get_or_404(db, Campanha, cerca.campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    cerca.status = "arquivada"
    await db.commit()


# ===========================================================================
# PAPEIS CAMPANHA
# ===========================================================================

@router.post("/papeis-campanha", response_model=PapelCampanhaRead, status_code=201, tags=["campanha-papeis"])
async def criar_papel(
    body: PapelCampanhaCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
    escopo: EscopoRBAC = Depends(get_escopo_rbac),
):
    campanha = await _get_or_404(db, Campanha, body.campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    # Verifica pessoa existe
    await _get_or_404(db, PessoaBase, body.pessoa_id, "Pessoa")

    # RBAC: validar hierarquia de criacao
    # Presidente/Diretoria (escopo.papeis_visiveis is None) => pode criar tudo
    if escopo.papel_ativo_tipo is not None:
        if not pode_criar_papel_abaixo(escopo.papel_ativo_tipo, body.papel):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Seu papel '{escopo.papel_ativo_tipo}' nao pode criar o papel '{body.papel}'. "
                    "Voce so pode criar papeis imediatamente abaixo na hierarquia."
                ),
            )
        # Alem disso, garante que a campanha esta no escopo visivel
        _check_escopo_campanha(escopo, body.campanha_id)

    papel = PapelCampanhaModel(**body.model_dump())
    db.add(papel)
    await db.commit()
    await db.refresh(papel)
    return PapelCampanhaRead.model_validate(papel)


@router.get("/papeis-campanha", response_model=PapelCampanhaListResponse, tags=["campanha-papeis"])
async def listar_papeis(
    campanha_id: UUID = Query(...),
    papel: Optional[str] = Query(None),
    pessoa_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
    escopo: EscopoRBAC = Depends(get_escopo_rbac),
):
    campanha = await _get_or_404(db, Campanha, campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    _check_escopo_campanha(escopo, campanha_id)

    q = select(PapelCampanhaModel).where(PapelCampanhaModel.campanha_id == campanha_id)
    if papel:
        q = q.where(PapelCampanhaModel.papel == papel)
    if pessoa_id:
        q = q.where(PapelCampanhaModel.pessoa_id == pessoa_id)

    # RBAC: filtrar papeis visiveis
    if escopo.papeis_visiveis is not None:
        if not escopo.papeis_visiveis:
            return PapelCampanhaListResponse(total=0, items=[])
        q = q.where(PapelCampanhaModel.id.in_(escopo.papeis_visiveis))

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar_one()
    rows = (await db.execute(q)).scalars().all()
    return PapelCampanhaListResponse(
        total=total,
        items=[PapelCampanhaRead.model_validate(p) for p in rows],
    )


@router.get("/papeis-campanha/{papel_id}", response_model=PapelCampanhaRead, tags=["campanha-papeis"])
async def detalhe_papel(
    papel_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
    escopo: EscopoRBAC = Depends(get_escopo_rbac),
):
    papel = await _get_or_404(db, PapelCampanhaModel, papel_id, "Papel")
    campanha = await _get_or_404(db, Campanha, papel.campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    _check_escopo_papel(escopo, papel_id)
    return PapelCampanhaRead.model_validate(papel)


@router.patch("/papeis-campanha/{papel_id}", response_model=PapelCampanhaRead, tags=["campanha-papeis"])
async def atualizar_papel(
    papel_id: UUID,
    body: PapelCampanhaUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    papel = await _get_or_404(db, PapelCampanhaModel, papel_id, "Papel")
    campanha = await _get_or_404(db, Campanha, papel.campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(papel, field, value)
    await db.commit()
    await db.refresh(papel)
    return PapelCampanhaRead.model_validate(papel)


# ===========================================================================
# METAS CERCA
# ===========================================================================

@router.post("/metas-cerca", response_model=MetaCercaRead, status_code=201, tags=["campanha-metas"])
async def criar_meta(
    body: MetaCercaCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    cerca = await _get_or_404(db, CercaVirtual, body.cerca_virtual_id, "Cerca")
    campanha = await _get_or_404(db, Campanha, cerca.campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    # Garante unicidade (1 meta por cerca)
    exists = (await db.execute(
        select(MetaCerca).where(MetaCerca.cerca_virtual_id == body.cerca_virtual_id)
    )).scalar_one_or_none()
    if exists:
        raise HTTPException(409, "Meta ja existe para esta cerca. Use PATCH para atualizar.")
    meta = MetaCerca(**body.model_dump())
    db.add(meta)
    await db.commit()
    await db.refresh(meta)
    return MetaCercaRead.model_validate(meta)


@router.get("/metas-cerca", response_model=list[MetaCercaRead], tags=["campanha-metas"])
async def listar_metas(
    cerca_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    cerca = await _get_or_404(db, CercaVirtual, cerca_id, "Cerca")
    campanha = await _get_or_404(db, Campanha, cerca.campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    rows = (await db.execute(
        select(MetaCerca).where(MetaCerca.cerca_virtual_id == cerca_id)
    )).scalars().all()
    return [MetaCercaRead.model_validate(m) for m in rows]


@router.patch("/metas-cerca/{meta_id}", response_model=MetaCercaRead, tags=["campanha-metas"])
async def atualizar_meta(
    meta_id: UUID,
    body: MetaCercaUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    meta = await _get_or_404(db, MetaCerca, meta_id, "Meta")
    cerca = await _get_or_404(db, CercaVirtual, meta.cerca_virtual_id, "Cerca")
    campanha = await _get_or_404(db, Campanha, cerca.campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(meta, field, value)
    await db.commit()
    await db.refresh(meta)
    return MetaCercaRead.model_validate(meta)


@router.delete("/metas-cerca/{meta_id}", status_code=204, tags=["campanha-metas"])
async def deletar_meta(
    meta_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    meta = await _get_or_404(db, MetaCerca, meta_id, "Meta")
    cerca = await _get_or_404(db, CercaVirtual, meta.cerca_virtual_id, "Cerca")
    campanha = await _get_or_404(db, Campanha, cerca.campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    await db.delete(meta)
    await db.commit()


# ===========================================================================
# CERCAS AGREGACOES (somente leitura)
# ===========================================================================

@router.get("/cercas-agregacoes/{cerca_id}", response_model=CercaAgregacaoRead, tags=["campanha-agregacoes"])
async def detalhe_agregacao(
    cerca_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    cerca = await _get_or_404(db, CercaVirtual, cerca_id, "Cerca")
    campanha = await _get_or_404(db, Campanha, cerca.campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)
    agg = (await db.execute(
        select(CercaAgregacao).where(CercaAgregacao.cerca_virtual_id == cerca_id)
    )).scalar_one_or_none()
    if agg is None:
        raise HTTPException(404, "Agregacao nao encontrada para esta cerca.")
    return CercaAgregacaoRead.model_validate(agg)


@router.post("/cercas/{cerca_id}/recalcular-agregacao", response_model=CercaAgregacaoRead, tags=["campanha-agregacoes"])
async def recalcular_agregacao_manual(
    cerca_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
    escopo: EscopoRBAC = Depends(get_escopo_rbac),
):
    """
    Recalcula manualmente os KPIs de performance de uma cerca virtual.
    Apenas responsavel pela cerca ou superior na hierarquia pode disparar.
    Presidente/Diretoria podem sempre.
    """
    from app.services.campanha_agregacao import recalcular_cerca

    cerca = await _get_or_404(db, CercaVirtual, cerca_id, "Cerca")
    campanha = await _get_or_404(db, Campanha, cerca.campanha_id, "Campanha")
    _check_tenant(usuario, campanha.tenant_id)

    # RBAC: verifica se campanha esta no escopo (bypass para Presidente/Diretoria)
    _check_escopo_campanha(escopo, cerca.campanha_id)

    # Verifica se o usuario e responsavel ou superior na hierarquia
    # Escopo None = bypass total (Presidente/Diretoria)
    if escopo.papeis_visiveis is not None and cerca.responsavel_papel_id is not None:
        if cerca.responsavel_papel_id not in escopo.papeis_visiveis:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o responsavel pela cerca ou superior hierarquico pode recalcular.",
            )

    try:
        agg = await recalcular_cerca(db, cerca_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no calculo: {str(e)}")

    return CercaAgregacaoRead(
        cerca_virtual_id=agg.cerca_virtual_id,
        votos_historicos_json=agg.votos_historicos_json,
        crescimento_pct_ultimo_ciclo=agg.crescimento_pct_ultimo_ciclo,
        liderancas_ativas_count=agg.liderancas_ativas_count,
        cabos_ativos_count=agg.cabos_ativos_count,
        escolas_eleitorais_count=agg.escolas_eleitorais_count,
        zonas_count=agg.zonas_count,
        score_performance=agg.score_performance,
        classificacao=agg.classificacao,
        tendencia=agg.tendencia,
        atualizado_em=agg.atualizado_em,
    )


@router.post("/recalcular-todas-cercas", tags=["campanha-agregacoes"])
async def recalcular_todas_cercas_endpoint(
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
    escopo: EscopoRBAC = Depends(get_escopo_rbac),
):
    """
    Recalcula KPIs de todas as cercas ativas (apenas Presidente/Diretoria).
    Retorna resumo: cercas_atualizadas, alertas_gerados, duracao_s.
    """
    from app.services.campanha_agregacao import recalcular_todas_cercas_ativas
    from app.models.operacional import PerfilUsuario

    if usuario.perfil not in {PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas Presidente ou Diretoria podem recalcular todas as cercas.",
        )

    resultado = await recalcular_todas_cercas_ativas(db)
    return resultado
