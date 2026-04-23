"""
Modelos de dados eleitorais — somente leitura.
Originados do TSE e IBGE via pipeline ETL.
NUNCA alterar registros dessas tabelas diretamente.
"""
from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    Date, DateTime, Text, ForeignKey, Index, JSON
)
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.models.base import Base


class Partido(Base):
    __tablename__ = "partidos"

    id = Column(Integer, primary_key=True)
    numero = Column(Integer, nullable=False, unique=True)
    sigla = Column(String(20), nullable=False)
    nome = Column(String(200), nullable=False)
    # DEM (25) + PSL (17) → UNIAO (44)
    # Armazenado como lista de números de partidos predecessores
    predecessores = Column(JSON, default=list)
    ativo = Column(Boolean, default=True)
    logo_url = Column(String(500))

    candidaturas = relationship("Candidatura", back_populates="partido")


class Municipio(Base):
    __tablename__ = "municipios"

    id = Column(Integer, primary_key=True)
    codigo_tse = Column(Integer, nullable=False, unique=True, index=True)
    codigo_ibge = Column(String(7), nullable=False, unique=True, index=True)
    nome = Column(String(200), nullable=False)
    estado_uf = Column(String(2), nullable=False, index=True)
    populacao = Column(Integer)
    pib_per_capita = Column(Float)
    # Polígono do município (PostGIS) — para o mapa
    geometry         = Column(Geometry("MULTIPOLYGON", srid=4326))
    # Geometrias pré-simplificadas para performance do mapa (migration 011)
    geometry_brasil  = Column(Geometry("MULTIPOLYGON", srid=4326))  # tolerância 0.01° — nível Brasil
    geometry_estado  = Column(Geometry("MULTIPOLYGON", srid=4326))  # tolerância 0.001° — nível estado

    zonas = relationship("ZonaEleitoral", back_populates="municipio")
    farol = relationship("FarolMunicipio", back_populates="municipio")

    __table_args__ = (
        Index("ix_municipios_estado_uf", "estado_uf"),
    )


class ZonaEleitoral(Base):
    __tablename__ = "zonas_eleitorais"

    id = Column(Integer, primary_key=True)
    numero = Column(Integer, nullable=False)
    municipio_id = Column(Integer, ForeignKey("municipios.id"), nullable=False)
    descricao = Column(String(300))

    municipio = relationship("Municipio", back_populates="zonas")
    secoes = relationship("SecaoEleitoral", back_populates="zona")
    delegado_zonas = relationship("DelegadoZona", back_populates="zona")

    __table_args__ = (
        Index("ix_zona_municipio", "numero", "municipio_id"),
    )


class SecaoEleitoral(Base):
    __tablename__ = "secoes_eleitorais"

    id = Column(Integer, primary_key=True)
    numero = Column(Integer, nullable=False)
    zona_id = Column(Integer, ForeignKey("zonas_eleitorais.id"), nullable=False)
    # Nome da escola/local de votação
    local_votacao = Column(String(300))
    endereco = Column(String(400))

    zona = relationship("ZonaEleitoral", back_populates="secoes")
    votos = relationship("VotosPorZona", back_populates="secao")


class Candidato(Base):
    __tablename__ = "candidatos"

    id = Column(Integer, primary_key=True)
    # Sequencial único TSE — chave de cruzamento entre arquivos
    sequencial_tse = Column(String(20), nullable=False, index=True)
    nome_completo = Column(String(300), nullable=False)
    nome_urna = Column(String(200))
    # CPF armazenado como hash (nunca em claro)
    cpf_hash = Column(String(64), index=True)
    foto_url = Column(String(500))
    genero = Column(String(20))
    cor_raca = Column(String(50))
    grau_instrucao = Column(String(100))
    ocupacao = Column(String(200))
    data_nascimento = Column(Date)
    naturalidade = Column(String(200))
    estado_nascimento_uf = Column(String(2))

    candidaturas = relationship("Candidatura", back_populates="candidato")
    plataforma = relationship("PoliticoPlataforma", back_populates="candidato")

    __table_args__ = (
        Index("ix_candidatos_nome_completo", "nome_completo"),
    )


class Candidatura(Base):
    __tablename__ = "candidaturas"

    id = Column(Integer, primary_key=True)
    candidato_id = Column(Integer, ForeignKey("candidatos.id"), nullable=False, index=True)
    partido_id = Column(Integer, ForeignKey("partidos.id"), nullable=False)
    municipio_id = Column(Integer, ForeignKey("municipios.id"), index=True)
    estado_uf = Column(String(2), nullable=False, index=True)

    ano = Column(Integer, nullable=False, index=True)
    # Prefeito, Vereador, Deputado Federal, Deputado Estadual, Senador, Governador, Presidente
    cargo = Column(String(100), nullable=False, index=True)
    numero_candidato = Column(String(10))

    turno          = Column(Integer, default=1, index=True)   # 1 ou 2
    votos_total    = Column(Integer, default=0)
    # ELEITO / ELEITO POR QP / ELEITO POR MÉDIA / NAO ELEITO / SUPLENTE / 2o TURNO
    situacao_final = Column(String(50), index=True)
    eleito         = Column(Boolean, default=False, index=True)

    despesa_campanha = Column(Float)
    receita_campanha = Column(Float)

    candidato    = relationship("Candidato", back_populates="candidaturas")
    partido      = relationship("Partido", back_populates="candidaturas")
    municipio    = relationship("Municipio")
    votos_por_zona = relationship("VotosPorZona", back_populates="candidatura")

    __table_args__ = (
        Index("ix_candidatura_ano_cargo",       "ano", "cargo"),
        Index("ix_candidatura_partido_ano",     "partido_id", "ano"),
        Index("ix_candidatura_ano_cargo_turno", "ano", "cargo", "turno"),
    )


class VotosPorZona(Base):
    __tablename__ = "votos_por_zona"

    id             = Column(Integer, primary_key=True)
    candidatura_id = Column(Integer, ForeignKey("candidaturas.id"), nullable=False, index=True)
    municipio_id   = Column(Integer, ForeignKey("municipios.id"),   nullable=False, index=True)
    zona_id        = Column(Integer, ForeignKey("zonas_eleitorais.id"), index=True)
    secao_id       = Column(Integer, ForeignKey("secoes_eleitorais.id"), index=True)
    turno          = Column(Integer, default=1, index=True)   # 1 ou 2
    qt_votos       = Column(Integer, default=0)

    # Dados eleitorais da seção nesse turno (do TSE)
    qt_eleitores_secao = Column(Integer)   # eleitorado aptos a votar
    qt_comparecimento  = Column(Integer)   # quem compareceu
    qt_abstencoes      = Column(Integer)   # não compareceu
    qt_votos_validos   = Column(Integer)   # votos válidos totais na seção
    qt_votos_brancos   = Column(Integer)   # votos brancos na seção
    qt_votos_nulos     = Column(Integer)   # votos nulos na seção

    candidatura = relationship("Candidatura", back_populates="votos_por_zona")
    secao       = relationship("SecaoEleitoral", back_populates="votos")


class ResultadoZona(Base):
    """
    Agregação analítica pré-calculada pelo ETL.
    1 linha = 1 partido × 1 local_votacao × 1 turno × 1 ano × 1 cargo.
    Permite calcular conversão e market share sem agregar votos_por_zona em runtime.
    """
    __tablename__ = "resultados_zona"

    id                  = Column(Integer, primary_key=True)
    ano                 = Column(Integer, nullable=False, index=True)
    turno               = Column(Integer, nullable=False, default=1, index=True)
    cargo               = Column(String(100), nullable=False, index=True)
    partido_id          = Column(Integer, ForeignKey("partidos.id"), index=True)
    municipio_id        = Column(Integer, ForeignKey("municipios.id"), nullable=False, index=True)
    zona_id             = Column(Integer, ForeignKey("zonas_eleitorais.id"), index=True)
    local_votacao_id    = Column(Integer, ForeignKey("locais_votacao.id"), index=True)

    qt_votos_partido    = Column(Integer, default=0)
    qt_eleitores        = Column(Integer)
    qt_comparecimento   = Column(Integer)
    qt_abstencoes       = Column(Integer)
    qt_votos_validos    = Column(Integer)
    qt_votos_brancos    = Column(Integer)
    qt_votos_nulos      = Column(Integer)

    # KPIs derivados (populados pelo job pós-ETL)
    pct_conversao       = Column(Float)   # votos_partido / eleitores
    pct_market_share    = Column(Float)   # votos_partido / votos_validos
    pct_comparecimento  = Column(Float)   # comparecimento / eleitores
    calculado_em        = Column(DateTime)

    partido    = relationship("Partido")
    municipio  = relationship("Municipio")
    zona       = relationship("ZonaEleitoral")

    __table_args__ = (
        Index("ix_resultados_zona_lookup", "municipio_id", "zona_id", "ano", "turno", "cargo"),
    )
