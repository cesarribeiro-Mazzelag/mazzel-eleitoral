"""
Módulo Afiliados — endpoints REST.

Prefixos registrados em main.py:
  /afiliados/filiados        — CRUD + filtros de filiados
  /afiliados/kpis            — dashboard principal
  /afiliados/repasses        — série histórica financeira
  /afiliados/treinamentos    — cursos e treinamentos
  /afiliados/comunicacoes    — campanhas de comunicação
  /afiliados/demografia      — agregações demográficas
  /afiliados/saude           — saúde da base (filiações vs cancelamentos)

RBAC: todos exigem auth. Role mínima: DIRETORIA ou superior.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_usuario_atual, requer_diretoria
from app.models.afiliados import (
    AfilComunicacao,
    AfilFiliado,
    AfilRepasse,
    AfilSaudeBase,
    AfilTreinamento,
    AtividadeExecutivo,
)
from app.models.operacional import Usuario
from app.schemas.afiliados import (
    AfilComunicacaoListResponse,
    AfilComunicacaoRead,
    AfilFiliadoListResponse,
    AfilFiliadoRead,
    AfilRepasseListResponse,
    AfilRepasseRead,
    AfilSaudeBaseListResponse,
    AfilSaudeBaseRead,
    AfilTreinamentoListResponse,
    AfilTreinamentoRead,
    AfiliadosDemografia,
    AfiliadosKPIs,
    AtividadeExecutivoListResponse,
    AtividadeExecutivoRead,
    FaixaEtariaItem,
    GeneroItem,
    RegiaoItem,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _calc_faixa(data_nasc: Optional[date]) -> Optional[str]:
    if data_nasc is None:
        return None
    hoje = date.today()
    idade = hoje.year - data_nasc.year - ((hoje.month, hoje.day) < (data_nasc.month, data_nasc.day))
    if idade < 16:
        return None
    if idade <= 24:
        return "16-24"
    if idade <= 34:
        return "25-34"
    if idade <= 44:
        return "35-44"
    if idade <= 54:
        return "45-54"
    if idade <= 64:
        return "55-64"
    return "65+"


# ---------------------------------------------------------------------------
# GET /afiliados/kpis
# ---------------------------------------------------------------------------

@router.get("/afiliados/kpis", response_model=AfiliadosKPIs, tags=["afiliados"])
async def get_kpis(
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(requer_diretoria),
):
    tid = usuario.tenant_id
    agora = datetime.now(timezone.utc)
    limite_30d = agora - timedelta(days=30)

    # Contagens por status
    rows_status = await db.execute(
        select(AfilFiliado.status, func.count().label("cnt"))
        .where(AfilFiliado.tenant_id == tid)
        .group_by(AfilFiliado.status)
    )
    contagens = {r.status: r.cnt for r in rows_status}

    total = sum(contagens.values())
    ativos = contagens.get("ativo", 0)
    inativos = contagens.get("inativo", 0)
    suspensos = contagens.get("suspenso", 0)

    # Novos nos últimos 30 dias
    row_novos = await db.execute(
        select(func.count())
        .where(
            AfilFiliado.tenant_id == tid,
            AfilFiliado.created_at >= limite_30d,
        )
    )
    novos_30d = row_novos.scalar_one() or 0

    # Churn: registros que passaram para inativo/suspenso nos últimos 30 dias
    # Proxy: updated_at >= limite_30d AND status in ('inativo','suspenso')
    row_churn = await db.execute(
        select(func.count())
        .where(
            AfilFiliado.tenant_id == tid,
            AfilFiliado.updated_at >= limite_30d,
            AfilFiliado.status.in_(["inativo", "suspenso"]),
        )
    )
    churn_30d = row_churn.scalar_one() or 0

    # Diretórios: extraídos dos UFs distintos com filiados ativos
    row_dir_ativos = await db.execute(
        select(func.count(func.distinct(AfilFiliado.uf)))
        .where(
            AfilFiliado.tenant_id == tid,
            AfilFiliado.status == "ativo",
            AfilFiliado.uf.isnot(None),
        )
    )
    diretorios_ativos = row_dir_ativos.scalar_one() or 0

    row_dir_totais = await db.execute(
        select(func.count(func.distinct(AfilFiliado.uf)))
        .where(
            AfilFiliado.tenant_id == tid,
            AfilFiliado.uf.isnot(None),
        )
    )
    diretorios_totais = row_dir_totais.scalar_one() or 0

    return AfiliadosKPIs(
        total=total,
        ativos=ativos,
        inativos=inativos,
        suspensos=suspensos,
        novos_30d=novos_30d,
        churn_30d=churn_30d,
        diretorios_ativos=diretorios_ativos,
        diretorios_totais=diretorios_totais,
    )


# ---------------------------------------------------------------------------
# GET /afiliados/filiados
# ---------------------------------------------------------------------------

@router.get("/afiliados/filiados", response_model=AfilFiliadoListResponse, tags=["afiliados"])
async def listar_filiados(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=200),
    status: Optional[str] = Query(None),
    uf: Optional[str] = Query(None, max_length=2),
    busca: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(requer_diretoria),
):
    tid = usuario.tenant_id
    filtros = [AfilFiliado.tenant_id == tid]

    if status:
        filtros.append(AfilFiliado.status == status)
    if uf:
        filtros.append(AfilFiliado.uf == uf.upper())
    if busca:
        like = f"%{busca}%"
        filtros.append(
            AfilFiliado.nome_completo.ilike(like) | AfilFiliado.cidade.ilike(like)
        )

    # total
    row_total = await db.execute(select(func.count()).where(*filtros))
    total = row_total.scalar_one() or 0

    # página
    offset = (page - 1) * per_page
    rows = await db.execute(
        select(AfilFiliado)
        .where(*filtros)
        .order_by(AfilFiliado.nome_completo)
        .offset(offset)
        .limit(per_page)
    )
    items = [AfilFiliadoRead.model_validate(r) for r in rows.scalars().all()]

    return AfilFiliadoListResponse(items=items, total=total)


# ---------------------------------------------------------------------------
# GET /afiliados/filiados/{id}
# ---------------------------------------------------------------------------

@router.get("/afiliados/filiados/{filiado_id}", response_model=AfilFiliadoRead, tags=["afiliados"])
async def get_filiado(
    filiado_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(requer_diretoria),
):
    row = await db.execute(
        select(AfilFiliado).where(
            AfilFiliado.id == filiado_id,
            AfilFiliado.tenant_id == usuario.tenant_id,
        )
    )
    obj = row.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail="Filiado não encontrado.")
    return AfilFiliadoRead.model_validate(obj)


# ---------------------------------------------------------------------------
# GET /afiliados/repasses
# ---------------------------------------------------------------------------

@router.get("/afiliados/repasses", response_model=AfilRepasseListResponse, tags=["afiliados"])
async def listar_repasses(
    meses: int = Query(12, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(requer_diretoria),
):
    rows = await db.execute(
        select(AfilRepasse)
        .where(AfilRepasse.tenant_id == usuario.tenant_id)
        .order_by(AfilRepasse.mes_ref.desc())
        .limit(meses)
    )
    items = [AfilRepasseRead.model_validate(r) for r in rows.scalars().all()]
    return AfilRepasseListResponse(items=items, total=len(items))


# ---------------------------------------------------------------------------
# GET /afiliados/treinamentos
# ---------------------------------------------------------------------------

@router.get("/afiliados/treinamentos", response_model=AfilTreinamentoListResponse, tags=["afiliados"])
async def listar_treinamentos(
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(requer_diretoria),
):
    rows = await db.execute(
        select(AfilTreinamento)
        .where(AfilTreinamento.tenant_id == usuario.tenant_id)
        .order_by(AfilTreinamento.data_proxima.asc().nullslast())
    )
    items = [AfilTreinamentoRead.model_validate(r) for r in rows.scalars().all()]
    return AfilTreinamentoListResponse(items=items, total=len(items))


# ---------------------------------------------------------------------------
# GET /afiliados/comunicacoes
# ---------------------------------------------------------------------------

@router.get("/afiliados/comunicacoes", response_model=AfilComunicacaoListResponse, tags=["afiliados"])
async def listar_comunicacoes(
    limite: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(requer_diretoria),
):
    rows = await db.execute(
        select(AfilComunicacao)
        .where(AfilComunicacao.tenant_id == usuario.tenant_id)
        .order_by(AfilComunicacao.enviado_em.desc().nullslast())
        .limit(limite)
    )
    items = [AfilComunicacaoRead.model_validate(r) for r in rows.scalars().all()]
    return AfilComunicacaoListResponse(items=items, total=len(items))


# ---------------------------------------------------------------------------
# GET /afiliados/demografia
# ---------------------------------------------------------------------------

@router.get("/afiliados/demografia", response_model=AfiliadosDemografia, tags=["afiliados"])
async def get_demografia(
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(requer_diretoria),
):
    tid = usuario.tenant_id

    # Gênero
    rows_gen = await db.execute(
        select(AfilFiliado.genero, func.count().label("cnt"))
        .where(AfilFiliado.tenant_id == tid, AfilFiliado.genero.isnot(None))
        .group_by(AfilFiliado.genero)
    )
    gen_data = [(r.genero, r.cnt) for r in rows_gen]
    gen_total = sum(c for _, c in gen_data) or 1
    genero = [GeneroItem(label=g, pct=round(c / gen_total * 100, 1)) for g, c in gen_data]

    # Faixa etária: cálculo em Python sobre os registros com data_nascimento
    rows_dn = await db.execute(
        select(AfilFiliado.data_nascimento)
        .where(AfilFiliado.tenant_id == tid, AfilFiliado.data_nascimento.isnot(None))
    )
    faixas: dict[str, int] = {}
    for (dn,) in rows_dn:
        fx = _calc_faixa(dn)
        if fx:
            faixas[fx] = faixas.get(fx, 0) + 1
    fx_total = sum(faixas.values()) or 1
    ordem_faixa = ["16-24", "25-34", "35-44", "45-54", "55-64", "65+"]
    faixa_etaria = [
        FaixaEtariaItem(label=f, pct=round(faixas.get(f, 0) / fx_total * 100, 1))
        for f in ordem_faixa
        if f in faixas
    ]

    # UF (proxy de "região")
    rows_uf = await db.execute(
        select(AfilFiliado.uf, func.count().label("cnt"))
        .where(AfilFiliado.tenant_id == tid, AfilFiliado.uf.isnot(None))
        .group_by(AfilFiliado.uf)
        .order_by(func.count().desc())
        .limit(10)
    )
    uf_data = [(r.uf, r.cnt) for r in rows_uf]
    uf_total = sum(c for _, c in uf_data) or 1
    uf_list = [RegiaoItem(label=u, pct=round(c / uf_total * 100, 1)) for u, c in uf_data]

    return AfiliadosDemografia(genero=genero, faixa_etaria=faixa_etaria, uf=uf_list)


# ---------------------------------------------------------------------------
# GET /afiliados/saude
# ---------------------------------------------------------------------------

@router.get("/afiliados/saude", response_model=AfilSaudeBaseListResponse, tags=["afiliados"])
async def get_saude(
    meses: int = Query(12, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(requer_diretoria),
):
    rows = await db.execute(
        select(AfilSaudeBase)
        .where(AfilSaudeBase.tenant_id == usuario.tenant_id)
        .order_by(AfilSaudeBase.mes_ref.asc())
        .limit(meses)
    )
    items = [AfilSaudeBaseRead.model_validate(r) for r in rows.scalars().all()]
    return AfilSaudeBaseListResponse(items=items, total=len(items))


# ---------------------------------------------------------------------------
# GET /dossie/{candidato_id}/atividade/executivo  (Parte 2)
# ---------------------------------------------------------------------------

@router.get(
    "/dossie/{candidato_id}/atividade/executivo",
    response_model=AtividadeExecutivoListResponse,
    tags=["afiliados", "dossie"],
)
async def get_atividade_executivo(
    candidato_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    tipo: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    filtros = [AtividadeExecutivo.candidato_id == candidato_id]
    if tipo:
        filtros.append(AtividadeExecutivo.tipo == tipo)

    row_total = await db.execute(select(func.count()).where(*filtros))
    total = row_total.scalar_one() or 0

    offset = (page - 1) * per_page
    rows = await db.execute(
        select(AtividadeExecutivo)
        .where(*filtros)
        .order_by(AtividadeExecutivo.data.desc().nullslast())
        .offset(offset)
        .limit(per_page)
    )
    items = [AtividadeExecutivoRead.model_validate(r) for r in rows.scalars().all()]
    return AtividadeExecutivoListResponse(items=items, total=total)
