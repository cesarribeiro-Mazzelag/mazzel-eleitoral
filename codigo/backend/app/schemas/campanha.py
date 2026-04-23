"""
Schemas Pydantic v2 para o Modulo Campanha.
Cobre as 6 entidades: PessoaBase, Campanha, CercaVirtual,
PapelCampanhaModel, MetaCerca, CercaAgregacao.
"""
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Literais alinhados com os enums dos modelos
# ---------------------------------------------------------------------------

FonteCadastroPessoaLit = Literal[
    "tse_import", "manual", "oauth", "migracao_legada"
]
StatusPessoaLit = Literal["ativo", "inativo", "falecido", "removido"]
PapelCampanhaLit = Literal[
    "lideranca", "delegado", "coord_regional", "coord_territorial",
    "cabo", "apoiador", "candidato"
]
StatusPapelLit = Literal["ativo", "inativo", "suspenso"]
CargoDisputadoLit = Literal[
    "PRESIDENTE", "GOVERNADOR", "SENADOR",
    "DEP_FEDERAL", "DEP_ESTADUAL", "PREFEITO", "VEREADOR"
]
PeriodoCampanhaLit = Literal[
    "pre_campanha", "convencao", "campanha", "segundo_turno", "pos"
]
StatusCampanhaLit = Literal["ativa", "encerrada", "arquivada"]
TipoCriacaoCercaLit = Literal["raio", "bairros_oficiais", "lasso", "import_kml"]
StatusCercaLit = Literal["ativa", "arquivada"]
PrioridadeMetaLit = Literal["critica", "alta", "media", "baixa"]
ClassificacaoCercaLit = Literal["ouro", "prata", "bronze", "critico"]
TendenciaCercaLit = Literal["crescendo", "estavel", "caindo"]

_CPF_RE = re.compile(r"^\d{11}$")
_COR_HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


# ---------------------------------------------------------------------------
# Helpers de validacao reutilizaveis
# ---------------------------------------------------------------------------

def _validar_cpf(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    v = re.sub(r"[^0-9]", "", v)
    if not _CPF_RE.match(v):
        raise ValueError("CPF deve conter exatamente 11 digitos numericos.")
    return v


def _validar_cor_hex(v: str) -> str:
    if not _COR_HEX_RE.match(v):
        raise ValueError("cor_hex deve estar no formato #RRGGBB (ex: #3B82F6).")
    return v


# ---------------------------------------------------------------------------
# Endereco simplificado (reutilizado em PessoaBase)
# ---------------------------------------------------------------------------

class EnderecoDict(BaseModel):
    logradouro: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = Field(None, min_length=2, max_length=2)
    cep: Optional[str] = None


# ---------------------------------------------------------------------------
# 1. PessoaBase
# ---------------------------------------------------------------------------

class PessoaBaseCreate(BaseModel):
    tenant_id: int
    nome_completo: str = Field(..., min_length=2, max_length=400)
    nome_politico: Optional[str] = Field(None, max_length=200)
    cpf: Optional[str] = None
    data_nascimento: Optional[date] = None
    foto_url: Optional[str] = None
    telefone: Optional[str] = Field(None, max_length=20)
    whatsapp: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    endereco_json: Optional[dict[str, str]] = None
    instagram_handle: Optional[str] = Field(None, max_length=100)
    facebook_url: Optional[str] = None
    tiktok_handle: Optional[str] = Field(None, max_length=100)
    youtube_url: Optional[str] = None
    twitter_handle: Optional[str] = Field(None, max_length=100)
    observacoes: Optional[str] = None
    fonte_cadastro: FonteCadastroPessoaLit = "manual"
    status: StatusPessoaLit = "ativo"

    @field_validator("cpf", mode="before")
    @classmethod
    def validar_cpf(cls, v: Any) -> Optional[str]:
        return _validar_cpf(v)


class PessoaBaseUpdate(BaseModel):
    nome_completo: Optional[str] = Field(None, min_length=2, max_length=400)
    nome_politico: Optional[str] = Field(None, max_length=200)
    cpf: Optional[str] = None
    data_nascimento: Optional[date] = None
    foto_url: Optional[str] = None
    telefone: Optional[str] = Field(None, max_length=20)
    whatsapp: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    endereco_json: Optional[dict[str, str]] = None
    instagram_handle: Optional[str] = Field(None, max_length=100)
    facebook_url: Optional[str] = None
    tiktok_handle: Optional[str] = Field(None, max_length=100)
    youtube_url: Optional[str] = None
    twitter_handle: Optional[str] = Field(None, max_length=100)
    observacoes: Optional[str] = None
    fonte_cadastro: Optional[FonteCadastroPessoaLit] = None
    status: Optional[StatusPessoaLit] = None

    @field_validator("cpf", mode="before")
    @classmethod
    def validar_cpf(cls, v: Any) -> Optional[str]:
        return _validar_cpf(v)


class PessoaBaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: int
    nome_completo: str
    nome_politico: Optional[str] = None
    cpf: Optional[str] = None
    data_nascimento: Optional[date] = None
    foto_url: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    endereco_json: Optional[dict] = None
    instagram_handle: Optional[str] = None
    facebook_url: Optional[str] = None
    tiktok_handle: Optional[str] = None
    youtube_url: Optional[str] = None
    twitter_handle: Optional[str] = None
    observacoes: Optional[str] = None
    fonte_cadastro: str
    status: str
    cpf_verificado_em: Optional[datetime] = None
    criado_em: datetime
    atualizado_em: Optional[datetime] = None


class PessoaBaseListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: list[PessoaBaseRead]


# ---------------------------------------------------------------------------
# 2. Campanha
# ---------------------------------------------------------------------------

class CampanhaCreate(BaseModel):
    tenant_id: int
    nome: str = Field(..., min_length=2, max_length=300)
    candidato_pessoa_id: UUID
    cargo_disputado: CargoDisputadoLit
    ciclo_eleitoral: int = Field(..., ge=2000, le=2100)
    uf: Optional[str] = Field(None, min_length=2, max_length=2)
    municipio_id: Optional[int] = None
    orcamento_total_centavos: Optional[int] = Field(None, ge=0)
    fonte_orcamento_json: Optional[dict] = None
    metas_json: Optional[dict] = None
    periodo_atual: PeriodoCampanhaLit = "pre_campanha"
    data_inicio: Optional[datetime] = None
    data_encerramento: Optional[datetime] = None
    status: StatusCampanhaLit = "ativa"


class CampanhaUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=300)
    orcamento_total_centavos: Optional[int] = Field(None, ge=0)
    fonte_orcamento_json: Optional[dict] = None
    metas_json: Optional[dict] = None
    periodo_atual: Optional[PeriodoCampanhaLit] = None
    data_inicio: Optional[datetime] = None
    data_encerramento: Optional[datetime] = None
    status: Optional[StatusCampanhaLit] = None
    uf: Optional[str] = Field(None, min_length=2, max_length=2)


class CampanhaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: int
    nome: str
    candidato_pessoa_id: UUID
    cargo_disputado: str
    ciclo_eleitoral: int
    uf: Optional[str] = None
    municipio_id: Optional[int] = None
    orcamento_total_centavos: Optional[int] = None
    fonte_orcamento_json: Optional[dict] = None
    metas_json: Optional[dict] = None
    periodo_atual: str
    data_inicio: Optional[datetime] = None
    data_encerramento: Optional[datetime] = None
    status: str
    criado_em: datetime
    atualizado_em: Optional[datetime] = None


class CampanhaListResponse(BaseModel):
    total: int
    items: list[CampanhaRead]


# ---------------------------------------------------------------------------
# 3. CercaVirtual  (com suporte a GeoJSON, raio+centro, ou bairros)
# ---------------------------------------------------------------------------

class CentroInput(BaseModel):
    """Lat/Lng para criacao de cerca por raio."""
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class CercaVirtualCreate(BaseModel):
    campanha_id: UUID
    parent_id: Optional[UUID] = None
    nome: str = Field(..., min_length=1, max_length=200)
    cor_hex: str = "#3B82F6"
    observacoes: Optional[str] = None
    responsavel_papel_id: Optional[UUID] = None

    # Tres formas mutuamente exclusivas de definir o poligono:
    # 1. GeoJSON direto {"type":"Polygon","coordinates":[...]}
    geojson_poligono: Optional[dict] = None
    # 2. Lista de IDs de bairros IBGE (backend converte via PostGIS)
    bairros_oficiais_ids: Optional[list[str]] = None
    # 3. Raio em metros + centro
    raio_metros: Optional[int] = Field(None, ge=1, le=500_000)
    centro: Optional[CentroInput] = None

    tipo_criacao: TipoCriacaoCercaLit = "lasso"
    status: StatusCercaLit = "ativa"

    @field_validator("cor_hex", mode="before")
    @classmethod
    def validar_cor(cls, v: Any) -> str:
        return _validar_cor_hex(v)

    @model_validator(mode="after")
    def validar_tipo_poligono(self) -> "CercaVirtualCreate":
        modos_ativos = sum([
            self.geojson_poligono is not None,
            bool(self.bairros_oficiais_ids),
            self.raio_metros is not None,
        ])
        # Permitir nenhum modo (cerca sem poligono ainda)
        if modos_ativos > 1:
            raise ValueError(
                "Informe apenas um modo de poligono: geojson_poligono, "
                "bairros_oficiais_ids ou raio_metros+centro."
            )
        if self.raio_metros is not None and self.centro is None:
            raise ValueError("centro e obrigatorio quando raio_metros e informado.")
        return self


class CercaVirtualUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    cor_hex: Optional[str] = None
    observacoes: Optional[str] = None
    responsavel_papel_id: Optional[UUID] = None
    status: Optional[StatusCercaLit] = None

    @field_validator("cor_hex", mode="before")
    @classmethod
    def validar_cor(cls, v: Any) -> Optional[str]:
        if v is None:
            return v
        return _validar_cor_hex(v)


class CercaVirtualRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    campanha_id: UUID
    parent_id: Optional[UUID] = None
    nome: str
    cor_hex: str
    observacoes: Optional[str] = None
    responsavel_papel_id: Optional[UUID] = None
    # GeoJSON serializado pelo endpoint (PostGIS -> dict)
    poligono_geojson: Optional[dict] = None
    tipo_criacao: str
    raio_metros: Optional[int] = None
    bairros_oficiais_ids: Optional[list[str]] = None
    status: str
    data_criacao: datetime
    criado_em: datetime
    atualizado_em: Optional[datetime] = None


class CercaVirtualListResponse(BaseModel):
    total: int
    items: list[CercaVirtualRead]


# ---------------------------------------------------------------------------
# 4. PapelCampanha
# ---------------------------------------------------------------------------

class PapelCampanhaCreate(BaseModel):
    pessoa_id: UUID
    campanha_id: UUID
    papel: PapelCampanhaLit
    cerca_virtual_id: Optional[UUID] = None
    superior_id: Optional[UUID] = None
    status: StatusPapelLit = "ativo"
    data_inicio: Optional[datetime] = None


class PapelCampanhaUpdate(BaseModel):
    papel: Optional[PapelCampanhaLit] = None
    cerca_virtual_id: Optional[UUID] = None
    superior_id: Optional[UUID] = None
    status: Optional[StatusPapelLit] = None
    data_fim: Optional[datetime] = None


class PapelCampanhaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    pessoa_id: UUID
    campanha_id: UUID
    papel: str
    cerca_virtual_id: Optional[UUID] = None
    superior_id: Optional[UUID] = None
    data_inicio: datetime
    data_fim: Optional[datetime] = None
    status: str
    criado_em: datetime
    atualizado_em: Optional[datetime] = None


class PapelCampanhaListResponse(BaseModel):
    total: int
    items: list[PapelCampanhaRead]


# ---------------------------------------------------------------------------
# 5. MetaCerca
# ---------------------------------------------------------------------------

class MetaCercaCreate(BaseModel):
    cerca_virtual_id: UUID
    votos_meta: Optional[int] = Field(None, ge=0)
    eleitores_estimados: Optional[int] = Field(None, ge=0)
    cobertura_pct_meta: Optional[int] = Field(None, ge=0, le=100)
    visitas_cabo_meta: Optional[int] = Field(None, ge=0)
    data_limite: Optional[date] = None
    prioridade: PrioridadeMetaLit = "media"


class MetaCercaUpdate(BaseModel):
    votos_meta: Optional[int] = Field(None, ge=0)
    eleitores_estimados: Optional[int] = Field(None, ge=0)
    cobertura_pct_meta: Optional[int] = Field(None, ge=0, le=100)
    visitas_cabo_meta: Optional[int] = Field(None, ge=0)
    data_limite: Optional[date] = None
    prioridade: Optional[PrioridadeMetaLit] = None


class MetaCercaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cerca_virtual_id: UUID
    votos_meta: Optional[int] = None
    eleitores_estimados: Optional[int] = None
    cobertura_pct_meta: Optional[int] = None
    visitas_cabo_meta: Optional[int] = None
    data_limite: Optional[date] = None
    prioridade: str
    criado_em: datetime
    atualizado_em: Optional[datetime] = None


# ---------------------------------------------------------------------------
# 6. CercaAgregacao (somente leitura — preenchida por worker)
# ---------------------------------------------------------------------------

class CercaAgregacaoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cerca_virtual_id: UUID
    votos_historicos_json: Optional[dict] = None
    crescimento_pct_ultimo_ciclo: Optional[float] = None
    liderancas_ativas_count: int = 0
    cabos_ativos_count: int = 0
    escolas_eleitorais_count: int = 0
    zonas_count: int = 0
    score_performance: Optional[float] = None
    classificacao: Optional[ClassificacaoCercaLit] = None
    tendencia: Optional[TendenciaCercaLit] = None
    atualizado_em: datetime
