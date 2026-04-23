"""
Modelos do Módulo Campanha — leitura e escrita.
Entidades operacionais para gestão de campanhas eleitorais:
pessoas, papéis, campanhas, cercas virtuais, metas e agregações.
"""
import enum
from sqlalchemy import (
    Column, String, Integer, BigInteger, Float, Boolean,
    Date, DateTime, Text, ForeignKey, Index, JSON, CheckConstraint,
    ARRAY,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.models.base import Base
import uuid


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class FonteCadastroPessoa(str, enum.Enum):
    TSE_IMPORT    = "tse_import"
    MANUAL        = "manual"
    OAUTH         = "oauth"
    MIGRACAO_LEGADA = "migracao_legada"


class StatusPessoa(str, enum.Enum):
    ATIVO    = "ativo"
    INATIVO  = "inativo"
    FALECIDO = "falecido"
    REMOVIDO = "removido"


class PapelCampanha(str, enum.Enum):
    LIDERANCA          = "lideranca"
    DELEGADO           = "delegado"
    COORD_REGIONAL     = "coord_regional"
    COORD_TERRITORIAL  = "coord_territorial"
    CABO               = "cabo"
    APOIADOR           = "apoiador"
    CANDIDATO          = "candidato"


class StatusPapel(str, enum.Enum):
    ATIVO    = "ativo"
    INATIVO  = "inativo"
    SUSPENSO = "suspenso"


class CargoDisputado(str, enum.Enum):
    PRESIDENTE     = "PRESIDENTE"
    GOVERNADOR     = "GOVERNADOR"
    SENADOR        = "SENADOR"
    DEP_FEDERAL    = "DEP_FEDERAL"
    DEP_ESTADUAL   = "DEP_ESTADUAL"
    PREFEITO       = "PREFEITO"
    VEREADOR       = "VEREADOR"


class PeriodoCampanha(str, enum.Enum):
    PRE_CAMPANHA   = "pre_campanha"
    CONVENCAO      = "convencao"
    CAMPANHA       = "campanha"
    SEGUNDO_TURNO  = "segundo_turno"
    POS            = "pos"


class StatusCampanha(str, enum.Enum):
    ATIVA      = "ativa"
    ENCERRADA  = "encerrada"
    ARQUIVADA  = "arquivada"


class TipoCriacaoCerca(str, enum.Enum):
    RAIO             = "raio"
    BAIRROS_OFICIAIS = "bairros_oficiais"
    LASSO            = "lasso"
    IMPORT_KML       = "import_kml"


class StatusCerca(str, enum.Enum):
    ATIVA     = "ativa"
    ARQUIVADA = "arquivada"


class PrioridadeMeta(str, enum.Enum):
    CRITICA = "critica"
    ALTA    = "alta"
    MEDIA   = "media"
    BAIXA   = "baixa"


class ClassificacaoCerca(str, enum.Enum):
    OURO    = "ouro"
    PRATA   = "prata"
    BRONZE  = "bronze"
    CRITICO = "critico"


class TendenciaCerca(str, enum.Enum):
    CRESCENDO = "crescendo"
    ESTAVEL   = "estavel"
    CAINDO    = "caindo"


# ---------------------------------------------------------------------------
# Tabela 1 — camp_pessoas_base
# ---------------------------------------------------------------------------

class PessoaBase(Base):
    """Perfil unificado do indivíduo. Reutilizável entre campanhas e ciclos."""
    __tablename__ = "camp_pessoas_base"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nome_completo   = Column(String(400), nullable=False)
    nome_politico   = Column(String(200), nullable=True)   # apelido/nome de urna
    # CHAR(11) — somente dígitos, sem pontuação; nullable para estrangeiros
    cpf = Column(
        String(11),
        nullable=True,
    )
    data_nascimento = Column(Date, nullable=True)           # crítico: alertas aniversariantes
    foto_url        = Column(Text, nullable=True)
    telefone        = Column(String(20), nullable=True)
    whatsapp        = Column(String(20), nullable=True)
    email           = Column(String(300), nullable=True)
    endereco_json   = Column(JSON, nullable=True)           # {logradouro, bairro, cidade, uf, cep}
    # Redes sociais
    instagram_handle = Column(String(100), nullable=True)
    facebook_url     = Column(Text, nullable=True)
    tiktok_handle    = Column(String(100), nullable=True)
    youtube_url      = Column(Text, nullable=True)
    twitter_handle   = Column(String(100), nullable=True)
    observacoes     = Column(Text, nullable=True)
    fonte_cadastro  = Column(
        String(20),
        CheckConstraint(
            "fonte_cadastro IN ('tse_import','manual','oauth','migracao_legada')",
            name="ck_camp_pessoas_fonte_cadastro",
        ),
        nullable=False,
        default=FonteCadastroPessoa.MANUAL.value,
    )
    cpf_verificado_em = Column(DateTime(timezone=True), nullable=True)
    status = Column(
        String(10),
        CheckConstraint(
            "status IN ('ativo','inativo','falecido','removido')",
            name="ck_camp_pessoas_status",
        ),
        nullable=False,
        default=StatusPessoa.ATIVO.value,
        index=True,
    )
    criado_em    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

    # Relationships
    papeis    = relationship("PapelCampanhaModel", back_populates="pessoa", foreign_keys="PapelCampanhaModel.pessoa_id")
    campanhas_candidato = relationship("Campanha", back_populates="candidato_pessoa", foreign_keys="Campanha.candidato_pessoa_id")

    __table_args__ = (
        # CPF único por tenant (não globalmente — mesmo CPF pode existir em tenants diferentes)
        Index("ix_camp_pessoas_tenant_cpf", "tenant_id", "cpf", unique=True),
        # Email único por tenant
        Index("ix_camp_pessoas_tenant_email", "tenant_id", "email", unique=True),
        # Para query de aniversariantes: WHERE extract(month from data_nascimento) = X AND extract(day from ...) = Y
        Index("ix_camp_pessoas_tenant_id", "tenant_id"),
        Index("ix_camp_pessoas_data_nascimento", "data_nascimento"),
        Index("ix_camp_pessoas_status", "status"),
        CheckConstraint(
            "cpf IS NULL OR (LENGTH(cpf) = 11 AND cpf ~ '^[0-9]{11}$')",
            name="ck_camp_pessoas_cpf_formato",
        ),
    )


# ---------------------------------------------------------------------------
# Tabela 3 — camp_campanhas  (definida antes de camp_papeis_campanha por FK)
# ---------------------------------------------------------------------------

class Campanha(Base):
    """Entidade mãe: uma corrida eleitoral de um candidato num ciclo."""
    __tablename__ = "camp_campanhas"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nome = Column(String(300), nullable=False)   # ex: "Vereador SP 2024 - João Silva"
    candidato_pessoa_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("camp_pessoas_base.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    cargo_disputado = Column(
        String(20),
        CheckConstraint(
            "cargo_disputado IN ('PRESIDENTE','GOVERNADOR','SENADOR','DEP_FEDERAL','DEP_ESTADUAL','PREFEITO','VEREADOR')",
            name="ck_camp_campanhas_cargo",
        ),
        nullable=False,
    )
    ciclo_eleitoral = Column(Integer, nullable=False, index=True)   # ex: 2024, 2026
    uf = Column(String(2), nullable=True, index=True)
    municipio_id = Column(
        Integer,
        ForeignKey("municipios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Orçamento em centavos (evita float para dinheiro)
    orcamento_total_centavos = Column(BigInteger, nullable=True, default=0)
    # {fundo_partidario: X, emendas: Y, proprio: Z, doacoes: W} — valores em centavos
    fonte_orcamento_json     = Column(JSON, nullable=True)
    # {votos_meta: X, cobertura_meta: Y, cercas_meta: Z}
    metas_json               = Column(JSON, nullable=True)
    periodo_atual = Column(
        String(20),
        CheckConstraint(
            "periodo_atual IN ('pre_campanha','convencao','campanha','segundo_turno','pos')",
            name="ck_camp_campanhas_periodo",
        ),
        nullable=False,
        default=PeriodoCampanha.PRE_CAMPANHA.value,
    )
    data_inicio        = Column(DateTime(timezone=True), nullable=True)
    data_encerramento  = Column(DateTime(timezone=True), nullable=True)
    status = Column(
        String(15),
        CheckConstraint(
            "status IN ('ativa','encerrada','arquivada')",
            name="ck_camp_campanhas_status",
        ),
        nullable=False,
        default=StatusCampanha.ATIVA.value,
        index=True,
    )
    criado_em    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

    # Relationships
    candidato_pessoa = relationship("PessoaBase", back_populates="campanhas_candidato", foreign_keys=[candidato_pessoa_id])
    papeis           = relationship("PapelCampanhaModel", back_populates="campanha")
    cercas           = relationship("CampCerca", back_populates="campanha")

    __table_args__ = (
        Index("ix_camp_campanhas_tenant_ciclo", "tenant_id", "ciclo_eleitoral"),
    )


# ---------------------------------------------------------------------------
# Tabela 4 — camp_cercas_virtuais  (antes de camp_papeis por FK responsavel)
# ---------------------------------------------------------------------------

class CampCerca(Base):
    """Polígono geográfico com equipe: a unidade operacional territorial."""
    __tablename__ = "camp_cercas_virtuais"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    campanha_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("camp_campanhas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("camp_cercas_virtuais.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    nome    = Column(String(200), nullable=False)
    cor_hex = Column(String(7), nullable=False, default="#3B82F6")   # ex: #3B82F6
    # FK para papeis_campanha — preenchida após criar o papel do coordenador
    responsavel_papel_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("camp_papeis_campanha.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # PostGIS: polígono WGS84
    poligono = Column(Geometry("POLYGON", srid=4326), nullable=True)
    tipo_criacao = Column(
        String(20),
        CheckConstraint(
            "tipo_criacao IN ('raio','bairros_oficiais','lasso','import_kml')",
            name="ck_camp_cercas_tipo_criacao",
        ),
        nullable=False,
        default=TipoCriacaoCerca.LASSO.value,
    )
    raio_metros = Column(Integer, nullable=True)                    # válido quando tipo_criacao=raio
    centro      = Column(Geometry("POINT", srid=4326), nullable=True)
    # Lista de IDs de bairros IBGE (quando tipo_criacao=bairros_oficiais)
    bairros_oficiais_ids = Column(ARRAY(Text), nullable=True)
    observacoes  = Column(Text, nullable=True)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(
        String(10),
        CheckConstraint(
            "status IN ('ativa','arquivada')",
            name="ck_camp_cercas_status",
        ),
        nullable=False,
        default=StatusCerca.ATIVA.value,
        index=True,
    )
    criado_em    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

    # Relationships
    campanha    = relationship("Campanha", back_populates="cercas")
    parent      = relationship("CampCerca", remote_side="CampCerca.id", foreign_keys=[parent_id])
    filhas      = relationship("CampCerca", back_populates="parent", foreign_keys=[parent_id])
    responsavel = relationship("PapelCampanhaModel", back_populates="cercas_responsavel", foreign_keys=[responsavel_papel_id])
    meta        = relationship("MetaCerca", back_populates="cerca", uselist=False)
    agregacao   = relationship("CercaAgregacao", back_populates="cerca", uselist=False)

    __table_args__ = (
        Index("ix_camp_cercas_campanha_id", "campanha_id"),
        Index("ix_camp_cercas_parent_id", "parent_id"),
        Index("ix_camp_cercas_responsavel_id", "responsavel_papel_id"),
        # Spatial index para queries PostGIS (ST_Contains, ST_Intersects, etc.)
        Index("ix_camp_cercas_poligono_gist", "poligono", postgresql_using="gist"),
    )


# ---------------------------------------------------------------------------
# Tabela 2 — camp_papeis_campanha  (após cercas por FK cerca_virtual_id)
# ---------------------------------------------------------------------------

class PapelCampanhaModel(Base):
    """Vínculo pessoa-papel-campanha-território. Histórico preservado por data."""
    __tablename__ = "camp_papeis_campanha"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    pessoa_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("camp_pessoas_base.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    campanha_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("camp_campanhas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    papel = Column(
        String(25),
        CheckConstraint(
            "papel IN ('lideranca','delegado','coord_regional','coord_territorial','cabo','apoiador','candidato')",
            name="ck_camp_papeis_papel",
        ),
        nullable=False,
        index=True,
    )
    cerca_virtual_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("camp_cercas_virtuais.id", ondelete="SET NULL"),
        nullable=True,   # apoiadores não têm cerca obrigatória
        index=True,
    )
    # Hierarquia cascata: Delegado tem superior_id NULL, demais têm NOT NULL
    # Enforçado via CHECK constraint na migration (não pode ser feito trivialmente em SQLAlchemy puro)
    superior_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("camp_papeis_campanha.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    data_inicio = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    data_fim    = Column(DateTime(timezone=True), nullable=True)   # null = ativo
    status = Column(
        String(10),
        CheckConstraint(
            "status IN ('ativo','inativo','suspenso')",
            name="ck_camp_papeis_status",
        ),
        nullable=False,
        default=StatusPapel.ATIVO.value,
        index=True,
    )
    criado_em    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

    # Relationships
    pessoa   = relationship("PessoaBase", back_populates="papeis", foreign_keys=[pessoa_id])
    campanha = relationship("Campanha", back_populates="papeis", foreign_keys=[campanha_id])
    cerca_virtual = relationship("CampCerca", foreign_keys=[cerca_virtual_id])
    superior      = relationship("PapelCampanhaModel", remote_side="PapelCampanhaModel.id", foreign_keys=[superior_id])
    subordinados  = relationship("PapelCampanhaModel", back_populates="superior", foreign_keys=[superior_id])
    cercas_responsavel = relationship("CampCerca", back_populates="responsavel", foreign_keys="CampCerca.responsavel_papel_id")

    __table_args__ = (
        Index("ix_camp_papeis_pessoa_campanha", "pessoa_id", "campanha_id"),
        # Constraint: delegado => superior_id NULL; outros papéis => superior_id NOT NULL
        # Nota: apoiador e candidato também podem ter superior NULL (cargos topo/externos)
        # Regra: papel=delegado OU papel=candidato => superior_id deve ser NULL
        # Implementado como CHECK na migration SQL diretamente.
    )


# ---------------------------------------------------------------------------
# Tabela 5 — camp_metas_cerca
# ---------------------------------------------------------------------------

class MetaCerca(Base):
    """Objetivo quantitativo de cada cerca virtual."""
    __tablename__ = "camp_metas_cerca"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    cerca_virtual_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("camp_cercas_virtuais.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,   # 1 meta por cerca (use JSON para múltiplos períodos se necessário)
        index=True,
    )
    votos_meta            = Column(Integer, nullable=True)
    eleitores_estimados   = Column(Integer, nullable=True)
    cobertura_pct_meta    = Column(
        Integer,
        CheckConstraint(
            "cobertura_pct_meta IS NULL OR (cobertura_pct_meta >= 0 AND cobertura_pct_meta <= 100)",
            name="ck_camp_metas_cobertura_pct",
        ),
        nullable=True,
    )
    visitas_cabo_meta = Column(Integer, nullable=True)
    data_limite       = Column(Date, nullable=True)
    prioridade = Column(
        String(10),
        CheckConstraint(
            "prioridade IN ('critica','alta','media','baixa')",
            name="ck_camp_metas_prioridade",
        ),
        nullable=False,
        default=PrioridadeMeta.MEDIA.value,
    )
    criado_em    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

    # Relationships
    cerca = relationship("CampCerca", back_populates="meta")


# ---------------------------------------------------------------------------
# Tabela 6 — camp_cercas_agregacoes
# ---------------------------------------------------------------------------

class CercaAgregacao(Base):
    """Cache de KPIs por cerca. Atualizado via worker/trigger periódico."""
    __tablename__ = "camp_cercas_agregacoes"

    # PK = FK (1:1 com cerca)
    cerca_virtual_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("camp_cercas_virtuais.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    # {2016: X, 2020: Y, 2024: Z} — votos históricos por ciclo
    votos_historicos_json            = Column(JSON, nullable=True)
    crescimento_pct_ultimo_ciclo     = Column(Float, nullable=True)
    liderancas_ativas_count          = Column(Integer, nullable=False, default=0)
    cabos_ativos_count               = Column(Integer, nullable=False, default=0)
    escolas_eleitorais_count         = Column(Integer, nullable=False, default=0)
    zonas_count                      = Column(Integer, nullable=False, default=0)
    # 0.00 a 99.99: 40% volume + 30% crescimento + 30% constância
    score_performance = Column(
        Float,
        CheckConstraint(
            "score_performance IS NULL OR (score_performance >= 0 AND score_performance <= 100)",
            name="ck_camp_agregacoes_score",
        ),
        nullable=True,
    )
    classificacao = Column(
        String(10),
        CheckConstraint(
            "classificacao IS NULL OR classificacao IN ('ouro','prata','bronze','critico')",
            name="ck_camp_agregacoes_classificacao",
        ),
        nullable=True,
        index=True,
    )
    tendencia = Column(
        String(10),
        CheckConstraint(
            "tendencia IS NULL OR tendencia IN ('crescendo','estavel','caindo')",
            name="ck_camp_agregacoes_tendencia",
        ),
        nullable=True,
        index=True,
    )
    atualizado_em = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    cerca = relationship("CampCerca", back_populates="agregacao")
