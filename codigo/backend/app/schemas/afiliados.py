"""
Schemas Pydantic v2 para o Módulo Afiliados.
Cobre as 5 entidades: AfilFiliado, AfilRepasse, AfilTreinamento,
AfilComunicacao, AfilSaudeBase + KPIDashboard + AtividadeExecutivo.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# 1. AfilFiliado
# ---------------------------------------------------------------------------

class AfilFiliadoCreate(BaseModel):
    tenant_id: int
    nome_completo: str = Field(..., max_length=400)
    cpf_hash: Optional[str] = Field(None, max_length=64)
    cidade: Optional[str] = Field(None, max_length=200)
    uf: Optional[str] = Field(None, max_length=2)
    status: str = "ativo"
    data_filiacao: Optional[date] = None
    contribuinte_em_dia: bool = False
    treinamentos_concluidos: int = 0
    tags: Optional[List[str]] = None
    genero: Optional[str] = None
    data_nascimento: Optional[date] = None


class AfilFiliadoUpdate(BaseModel):
    nome_completo: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    status: Optional[str] = None
    data_filiacao: Optional[date] = None
    contribuinte_em_dia: Optional[bool] = None
    treinamentos_concluidos: Optional[int] = None
    tags: Optional[List[str]] = None
    genero: Optional[str] = None
    data_nascimento: Optional[date] = None


class AfilFiliadoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    nome_completo: str
    cpf_hash: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    status: str
    data_filiacao: Optional[date] = None
    contribuinte_em_dia: bool
    treinamentos_concluidos: int
    tags: Optional[List[str]] = None
    genero: Optional[str] = None
    data_nascimento: Optional[date] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class AfilFiliadoListResponse(BaseModel):
    items: List[AfilFiliadoRead]
    total: int


# ---------------------------------------------------------------------------
# 2. AfilRepasse
# ---------------------------------------------------------------------------

class AfilRepasseCreate(BaseModel):
    tenant_id: int
    mes_ref: date
    fundo_partidario: Decimal = Decimal("0")
    fundo_especial: Decimal = Decimal("0")
    doacoes: Decimal = Decimal("0")
    total: Decimal = Decimal("0")


class AfilRepasseUpdate(BaseModel):
    fundo_partidario: Optional[Decimal] = None
    fundo_especial: Optional[Decimal] = None
    doacoes: Optional[Decimal] = None
    total: Optional[Decimal] = None


class AfilRepasseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    mes_ref: date
    fundo_partidario: Decimal
    fundo_especial: Decimal
    doacoes: Decimal
    total: Decimal
    created_at: datetime


class AfilRepasseListResponse(BaseModel):
    items: List[AfilRepasseRead]
    total: int


# ---------------------------------------------------------------------------
# 3. AfilTreinamento
# ---------------------------------------------------------------------------

class AfilTreinamentoCreate(BaseModel):
    tenant_id: int
    nome_curso: str = Field(..., max_length=400)
    inscritos: int = 0
    concluintes: int = 0
    nps: Optional[int] = Field(None, ge=0, le=100)
    data_proxima: Optional[date] = None


class AfilTreinamentoUpdate(BaseModel):
    nome_curso: Optional[str] = None
    inscritos: Optional[int] = None
    concluintes: Optional[int] = None
    nps: Optional[int] = Field(None, ge=0, le=100)
    data_proxima: Optional[date] = None


class AfilTreinamentoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    nome_curso: str
    inscritos: int
    concluintes: int
    nps: Optional[int] = None
    data_proxima: Optional[date] = None
    created_at: datetime


class AfilTreinamentoListResponse(BaseModel):
    items: List[AfilTreinamentoRead]
    total: int


# ---------------------------------------------------------------------------
# 4. AfilComunicacao
# ---------------------------------------------------------------------------

class AfilComunicacaoCreate(BaseModel):
    tenant_id: int
    assunto: str = Field(..., max_length=500)
    canal: Optional[str] = None
    enviados: int = 0
    aberturas: int = 0
    cliques: int = 0
    enviado_em: Optional[datetime] = None


class AfilComunicacaoUpdate(BaseModel):
    assunto: Optional[str] = None
    canal: Optional[str] = None
    enviados: Optional[int] = None
    aberturas: Optional[int] = None
    cliques: Optional[int] = None
    enviado_em: Optional[datetime] = None


class AfilComunicacaoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    assunto: str
    canal: Optional[str] = None
    enviados: int
    aberturas: int
    cliques: int
    enviado_em: Optional[datetime] = None
    created_at: datetime


class AfilComunicacaoListResponse(BaseModel):
    items: List[AfilComunicacaoRead]
    total: int


# ---------------------------------------------------------------------------
# 5. AfilSaudeBase
# ---------------------------------------------------------------------------

class AfilSaudeBaseCreate(BaseModel):
    tenant_id: int
    mes_ref: date
    filiacoes_mes: int = 0
    cancelamentos_mes: int = 0


class AfilSaudeBaseUpdate(BaseModel):
    filiacoes_mes: Optional[int] = None
    cancelamentos_mes: Optional[int] = None


class AfilSaudeBaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    mes_ref: date
    filiacoes_mes: int
    cancelamentos_mes: int
    created_at: datetime


class AfilSaudeBaseListResponse(BaseModel):
    items: List[AfilSaudeBaseRead]
    total: int


# ---------------------------------------------------------------------------
# KPI Dashboard
# ---------------------------------------------------------------------------

class AfiliadosKPIs(BaseModel):
    total: int
    ativos: int
    inativos: int
    suspensos: int
    novos_30d: int
    churn_30d: int
    diretorios_ativos: int
    diretorios_totais: int


# ---------------------------------------------------------------------------
# Demografia
# ---------------------------------------------------------------------------

class GeneroItem(BaseModel):
    label: str
    pct: float


class FaixaEtariaItem(BaseModel):
    label: str
    pct: float


class RegiaoItem(BaseModel):
    label: str
    pct: float


class AfiliadosDemografia(BaseModel):
    genero: List[GeneroItem]
    faixa_etaria: List[FaixaEtariaItem]
    uf: List[RegiaoItem]


# ---------------------------------------------------------------------------
# AtividadeExecutivo (Parte 2)
# ---------------------------------------------------------------------------

class AtividadeExecutivoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    candidato_id: int
    cargo: str = "presidente"
    data: Optional[date] = None
    tipo: str
    titulo: str
    descricao: Optional[str] = None
    url_fonte: Optional[str] = None
    created_at: datetime


class AtividadeExecutivoListResponse(BaseModel):
    items: List[AtividadeExecutivoRead]
    total: int
