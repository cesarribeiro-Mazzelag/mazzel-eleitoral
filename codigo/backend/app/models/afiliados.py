"""
Modelos do Módulo Afiliados — leitura e escrita.
Entidades para gestão de filiados partidários:
filiados, repasses, treinamentos, comunicações e saúde da base.
"""
from datetime import date, datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, Date, DateTime,
    Text, ForeignKey, Index, Numeric, CheckConstraint, CHAR,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.models.base import Base


# ---------------------------------------------------------------------------
# afil_filiado
# ---------------------------------------------------------------------------

class AfilFiliado(Base):
    """Perfil do filiado partidário."""
    __tablename__ = "afil_filiado"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nome_completo = Column(String(400), nullable=False)
    cpf_hash = Column(CHAR(64), nullable=True)          # SHA-256 hex do CPF
    cidade = Column(String(200), nullable=True)
    uf = Column(String(2), nullable=True)
    status = Column(
        String(10),
        CheckConstraint(
            "status IN ('ativo','inativo','suspenso')",
            name="ck_afil_filiado_status",
        ),
        nullable=False,
        default="ativo",
    )
    data_filiacao = Column(Date(), nullable=True)
    contribuinte_em_dia = Column(Boolean(), nullable=False, default=False)
    treinamentos_concluidos = Column(Integer(), nullable=False, default=0)
    tags = Column(JSONB(), nullable=True)                # array de strings JSON
    genero = Column(String(20), nullable=True)           # "Masculino", "Feminino", "Não binário"
    data_nascimento = Column(Date(), nullable=True)      # para cálculo de faixa etária
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

    __table_args__ = (
        Index("ix_afil_filiado_tenant_id", "tenant_id"),
        Index("ix_afil_filiado_tenant_status", "tenant_id", "status"),
    )


# ---------------------------------------------------------------------------
# afil_repasse
# ---------------------------------------------------------------------------

class AfilRepasse(Base):
    """Repasses financeiros mensais ao diretório."""
    __tablename__ = "afil_repasse"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mes_ref = Column(Date(), nullable=False)             # primeiro dia do mês
    fundo_partidario = Column(Numeric(14, 2), nullable=False, default=0)
    fundo_especial = Column(Numeric(14, 2), nullable=False, default=0)
    doacoes = Column(Numeric(14, 2), nullable=False, default=0)
    total = Column(Numeric(14, 2), nullable=False, default=0)  # persistido no insert
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_afil_repasse_tenant_id", "tenant_id"),
        Index("ix_afil_repasse_tenant_mes", "tenant_id", "mes_ref"),
    )


# ---------------------------------------------------------------------------
# afil_treinamento
# ---------------------------------------------------------------------------

class AfilTreinamento(Base):
    """Cursos e treinamentos da base partidária."""
    __tablename__ = "afil_treinamento"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nome_curso = Column(String(400), nullable=False)
    inscritos = Column(Integer(), nullable=False, default=0)
    concluintes = Column(Integer(), nullable=False, default=0)
    nps = Column(
        Integer(),
        CheckConstraint(
            "nps IS NULL OR (nps >= 0 AND nps <= 100)",
            name="ck_afil_treinamento_nps",
        ),
        nullable=True,
    )
    data_proxima = Column(Date(), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_afil_treinamento_tenant_id", "tenant_id"),
    )


# ---------------------------------------------------------------------------
# afil_comunicacao
# ---------------------------------------------------------------------------

class AfilComunicacao(Base):
    """Campanhas de comunicação enviadas para a base."""
    __tablename__ = "afil_comunicacao"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assunto = Column(String(500), nullable=False)
    canal = Column(Text(), nullable=True)               # ex: "Email+WhatsApp", "SMS"
    enviados = Column(Integer(), nullable=False, default=0)
    aberturas = Column(Integer(), nullable=False, default=0)
    cliques = Column(Integer(), nullable=False, default=0)
    enviado_em = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_afil_comunicacao_tenant_id", "tenant_id"),
    )


# ---------------------------------------------------------------------------
# afil_saude_base
# ---------------------------------------------------------------------------

class AfilSaudeBase(Base):
    """Série histórica mensal de filiações e cancelamentos."""
    __tablename__ = "afil_saude_base"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mes_ref = Column(Date(), nullable=False)             # primeiro dia do mês
    filiacoes_mes = Column(Integer(), nullable=False, default=0)
    cancelamentos_mes = Column(Integer(), nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_afil_saude_base_tenant_id", "tenant_id"),
        Index("ix_afil_saude_base_tenant_mes", "tenant_id", "mes_ref"),
    )


# ---------------------------------------------------------------------------
# AtividadeExecutivo (Parte 2 - Presidente)
# ---------------------------------------------------------------------------

class AtividadeExecutivo(Base):
    """Atividades do Poder Executivo: sanções, vetos, decretos.

    Campo cargo discrimina o nível do executivo:
      presidente | governador | prefeito

    Tipos aceitos por cargo:
      presidente  → sancao, veto, decreto, mensagem_congresso
      governador  → decreto_estadual, mensagem_assembleia
      prefeito    → decreto_municipal, projeto_lei_municipal
    """
    __tablename__ = "atividade_executivo"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidato_id = Column(
        Integer,
        ForeignKey("candidatos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Nivel do executivo: presidente | governador | prefeito
    cargo = Column(
        String(20),
        CheckConstraint(
            "cargo IN ('presidente','governador','prefeito')",
            name="ck_atividade_executivo_cargo",
        ),
        nullable=False,
        server_default="presidente",
    )
    data = Column(Date(), nullable=True)
    tipo = Column(
        String(30),
        CheckConstraint(
            "tipo IN ("
            "'sancao','veto','decreto','mensagem_congresso',"
            "'decreto_estadual','mensagem_assembleia',"
            "'decreto_municipal','projeto_lei_municipal'"
            ")",
            name="ck_atividade_executivo_tipo",
        ),
        nullable=False,
    )
    titulo = Column(Text(), nullable=False)
    descricao = Column(Text(), nullable=True)
    url_fonte = Column(Text(), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_atividade_executivo_candidato_id", "candidato_id"),
        Index("ix_atividade_executivo_tipo", "tipo"),
        Index("ix_atividade_executivo_data", "data"),
        Index("ix_atividade_executivo_cargo", "cargo"),
    )
