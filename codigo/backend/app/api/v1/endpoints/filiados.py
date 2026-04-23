"""
Endpoints de Filiados
  GET  /filiados          - lista (DELEGADO = próprios; DIRETORIA/PRESIDENTE = todos)
  POST /filiados          - cadastrar novo filiado
  GET  /filiados/{id}     - detalhe
  PUT  /filiados/{id}     - atualizar
  GET  /filiados/exportar - exportar CSV
"""
import csv
import io
import hashlib
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.deps import get_usuario_atual
from app.models.operacional import (
    Usuario, Filiado, Delegado, StatusValidacao
)
from app.models.eleitoral import Municipio, ZonaEleitoral
from app.services.validacao_filiado import (
    validar_cpf_completo, validar_titulo_eleitor
)

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class FiliadoCreate(BaseModel):
    nome_completo: str
    cpf: str                    # em claro — será hashado
    titulo_eleitor: Optional[str] = None
    data_nascimento: Optional[date] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado_uf: str
    municipio_id: Optional[int] = None

class FiliadoUpdate(BaseModel):
    nome_completo: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _hash_cpf(cpf: str) -> str:
    digitos = "".join(c for c in cpf if c.isdigit())
    return hashlib.sha256(digitos.encode()).hexdigest()

def _ultimos4(cpf: str) -> str:
    digitos = "".join(c for c in cpf if c.isdigit())
    return digitos[-4:] if len(digitos) >= 4 else digitos

async def _get_delegado_id(db, usuario: Usuario) -> int:
    """Retorna o delegado.id do usuário logado."""
    r = await db.execute(select(Delegado).where(Delegado.usuario_id == usuario.id))
    d = r.scalar_one_or_none()
    if not d:
        raise HTTPException(403, "Você não está vinculado como delegado.")
    return d.id

def _serializar(f: Filiado) -> dict:
    return {
        "id":              f.id,
        "nome_completo":   f.nome_completo,
        "cpf_ultimos4":    f.cpf_ultimos4,
        "titulo_eleitor":  f.titulo_eleitor,
        "data_nascimento": f.data_nascimento.isoformat() if f.data_nascimento else None,
        "telefone":        f.telefone,
        "whatsapp":        f.whatsapp,
        "email":           f.email,
        "cep":             f.cep,
        "logradouro":      f.logradouro,
        "numero":          f.numero,
        "complemento":     f.complemento,
        "bairro":          f.bairro,
        "cidade":          f.cidade,
        "estado_uf":       f.estado_uf,
        "municipio_id":    f.municipio_id,
        "status_cpf":      f.status_validacao_cpf,
        "status_titulo":   f.status_validacao_titulo,
        "cadastrado_por":  f.cadastrado_por_id,
        "criado_em":       f.criado_em.isoformat() if f.criado_em else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/exportar")
async def exportar_csv(
    estado_uf: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    """Exporta filiados em CSV."""
    q = select(Filiado)
    if usuario.perfil == "DELEGADO":
        did = await _get_delegado_id(db, usuario)
        q = q.where(Filiado.cadastrado_por_id == did)
    elif estado_uf:
        q = q.where(Filiado.estado_uf == estado_uf.upper())

    q = q.order_by(Filiado.nome_completo)
    r = await db.execute(q)
    filiados = r.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Nome Completo", "CPF (últimos 4)", "Título Eleitor",
        "Data Nasc.", "Cidade", "Estado", "WhatsApp", "E-mail",
        "Status CPF", "Status Título", "Cadastrado em",
    ])
    for f in filiados:
        writer.writerow([
            f.id, f.nome_completo, f.cpf_ultimos4 or "", f.titulo_eleitor or "",
            f.data_nascimento or "", f.cidade or "", f.estado_uf,
            f.whatsapp or "", f.email or "",
            f.status_validacao_cpf or "", f.status_validacao_titulo or "",
            f.criado_em.strftime("%d/%m/%Y") if f.criado_em else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=filiados.csv"},
    )


@router.get("")
async def listar_filiados(
    estado_uf: Optional[str] = None,
    cidade: Optional[str] = None,
    busca: Optional[str] = None,
    pagina: int = Query(1, ge=1),
    limite: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    q = select(Filiado)

    if usuario.perfil == "DELEGADO":
        did = await _get_delegado_id(db, usuario)
        q = q.where(Filiado.cadastrado_por_id == did)
    else:
        if estado_uf:
            q = q.where(Filiado.estado_uf == estado_uf.upper())

    if cidade:
        q = q.where(Filiado.cidade.ilike(f"%{cidade}%"))
    if busca:
        q = q.where(Filiado.nome_completo.ilike(f"%{busca}%"))

    # Total
    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    q = q.order_by(Filiado.nome_completo).offset((pagina - 1) * limite).limit(limite)
    r = await db.execute(q)
    filiados = r.scalars().all()

    return {
        "total":    total,
        "pagina":   pagina,
        "limite":   limite,
        "filiados": [_serializar(f) for f in filiados],
    }


@router.post("")
async def cadastrar_filiado(
    payload: FiliadoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    """Cadastra novo filiado. Valida CPF e Título, hasheia CPF."""
    # Verifica duplicidade por hash CPF
    cpf_hash = _hash_cpf(payload.cpf)
    dup = await db.execute(select(Filiado).where(Filiado.cpf_hash == cpf_hash))
    if dup.scalar_one_or_none():
        raise HTTPException(409, "CPF já cadastrado na plataforma.")

    # Verifica duplicidade por Título
    if payload.titulo_eleitor:
        titulo_dig = "".join(c for c in payload.titulo_eleitor if c.isdigit())
        dup_t = await db.execute(
            select(Filiado).where(Filiado.titulo_eleitor == titulo_dig)
        )
        if dup_t.scalar_one_or_none():
            raise HTTPException(409, "Título de Eleitor já cadastrado.")

    # Valida CPF
    cpf_res = await validar_cpf_completo(payload.cpf)
    status_cpf = StatusValidacao.VALIDO if cpf_res.valido else StatusValidacao.INVALIDO

    # Valida Título
    status_titulo = StatusValidacao.PENDENTE
    titulo_dig = None
    if payload.titulo_eleitor:
        titulo_dig = "".join(c for c in payload.titulo_eleitor if c.isdigit())
        tit_res = await validar_titulo_eleitor(titulo_dig)
        status_titulo = StatusValidacao.VALIDO if tit_res.valido else StatusValidacao.INVALIDO

    # Delegado que está cadastrando
    if usuario.perfil == "DELEGADO":
        delegado_id = await _get_delegado_id(db, usuario)
    else:
        # PRESIDENTE/DIRETORIA: deve informar municipio_id do delegado responsável
        # Por ora usa delegado_id=1 como fallback (ajustar no painel admin)
        delegado_id = 1

    f = Filiado(
        nome_completo=payload.nome_completo.strip(),
        cpf_hash=cpf_hash,
        cpf_ultimos4=_ultimos4(payload.cpf),
        titulo_eleitor=titulo_dig,
        data_nascimento=payload.data_nascimento,
        telefone=payload.telefone,
        whatsapp=payload.whatsapp,
        email=payload.email,
        cep=payload.cep,
        logradouro=payload.logradouro,
        numero=payload.numero,
        complemento=payload.complemento,
        bairro=payload.bairro,
        cidade=payload.cidade,
        estado_uf=payload.estado_uf.upper(),
        municipio_id=payload.municipio_id,
        status_validacao_cpf=status_cpf,
        status_validacao_titulo=status_titulo,
        cadastrado_por_id=delegado_id,
    )
    db.add(f)
    await db.commit()
    await db.refresh(f)

    return {
        **_serializar(f),
        "validacao_cpf": {
            "status": status_cpf,
            "mensagem": cpf_res.mensagem,
            "fonte": cpf_res.fonte,
        },
    }


@router.get("/{filiado_id}")
async def get_filiado(
    filiado_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    r = await db.execute(select(Filiado).where(Filiado.id == filiado_id))
    f = r.scalar_one_or_none()
    if not f:
        raise HTTPException(404, "Filiado não encontrado.")

    # DELEGADO só vê seus próprios cadastros
    if usuario.perfil == "DELEGADO":
        did = await _get_delegado_id(db, usuario)
        if f.cadastrado_por_id != did:
            raise HTTPException(403, "Acesso negado.")

    return _serializar(f)


@router.put("/{filiado_id}")
async def atualizar_filiado(
    filiado_id: int,
    payload: FiliadoUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_atual),
):
    r = await db.execute(select(Filiado).where(Filiado.id == filiado_id))
    f = r.scalar_one_or_none()
    if not f:
        raise HTTPException(404, "Filiado não encontrado.")

    if usuario.perfil == "DELEGADO":
        did = await _get_delegado_id(db, usuario)
        if f.cadastrado_por_id != did:
            raise HTTPException(403, "Acesso negado.")

    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(f, campo, valor)

    await db.commit()
    await db.refresh(f)
    return _serializar(f)
