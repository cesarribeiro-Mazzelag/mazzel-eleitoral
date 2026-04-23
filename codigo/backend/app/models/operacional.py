"""
Modelos operacionais — leitura e escrita.
Gerenciados pela plataforma.
"""
import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    Date, DateTime, Text, ForeignKey, Index, JSON, Enum
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base


class PerfilUsuario(str, enum.Enum):
    PRESIDENTE = "PRESIDENTE"
    DIRETORIA = "DIRETORIA"
    DELEGADO = "DELEGADO"
    POLITICO = "POLITICO"
    FUNCIONARIO = "FUNCIONARIO"


class TenantModo(str, enum.Enum):
    DEMO = "DEMO"
    CONTRATADO = "CONTRATADO"


class Tenant(Base):
    """
    Tenant = cliente da plataforma Mazzel Tech.
    DEMO = acesso nacional a todos os dados, sem módulos operacionais.
    CONTRATADO = white-label do partido, com branding e módulos completos.
    """
    __tablename__ = "tenants"

    id              = Column(Integer, primary_key=True)
    nome            = Column(String(200), nullable=False)
    modo            = Column(Enum(TenantModo), nullable=False, default=TenantModo.DEMO)
    partido_id      = Column(Integer, ForeignKey("partidos.id", ondelete="SET NULL"), nullable=True, index=True)
    logo_url        = Column(Text, nullable=True)
    cor_primaria    = Column(String(7), nullable=True)
    cor_secundaria  = Column(String(7), nullable=True)
    dominio_custom  = Column(String(200), nullable=True)
    ativo           = Column(Boolean, default=True, index=True)
    criado_em       = Column(DateTime, server_default=func.now())
    atualizado_em   = Column(DateTime, onupdate=func.now())

    usuarios        = relationship("Usuario", back_populates="tenant")


class StatusFarol(str, enum.Enum):
    VERDE = "VERDE"
    AMARELO = "AMARELO"
    VERMELHO = "VERMELHO"


class GravidadeAlerta(str, enum.Enum):
    OK = "OK"
    ATENCAO = "ATENCAO"
    ALERTA = "ALERTA"
    CRITICO = "CRITICO"


class StatusValidacao(str, enum.Enum):
    PENDENTE = "PENDENTE"
    VALIDO = "VALIDO"
    INVALIDO = "INVALIDO"
    ERRO_EXTERNO = "ERRO_EXTERNO"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True)
    nome = Column(String(300), nullable=False)
    email = Column(String(300), nullable=False, unique=True, index=True)
    senha_hash = Column(String(300), nullable=False)
    perfil = Column(Enum(PerfilUsuario), nullable=False, index=True)
    # Restrição de acesso por estado (para DIRETORIA e DELEGADO)
    estado_uf_restrito = Column(String(2))
    ativo = Column(Boolean, default=True)
    totp_secret = Column(String(100))  # 2FA
    totp_habilitado = Column(Boolean, default=False)
    ultimo_acesso = Column(DateTime)
    criado_em = Column(DateTime, server_default=func.now())
    atualizado_em = Column(DateTime, onupdate=func.now())

    tenant_id   = Column(Integer, ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True, index=True)

    tenant        = relationship("Tenant", back_populates="usuarios")
    delegado      = relationship("Delegado", back_populates="usuario", uselist=False)
    politico      = relationship("PoliticoPlataforma", back_populates="usuario", uselist=False)
    auditoria_log = relationship("AuditoriaLog", back_populates="usuario")


class PoliticoPlataforma(Base):
    """
    Vínculo entre um candidato do TSE e um usuário da plataforma.
    Quando um político tem login, este registro existe.
    """
    __tablename__ = "politicos_plataforma"

    id = Column(Integer, primary_key=True)
    # FK para candidatos (tabela TSE)
    candidato_id = Column(Integer, ForeignKey("candidatos.id"), nullable=False, unique=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, unique=True)
    delegado_responsavel_id = Column(Integer, ForeignKey("delegados.id"))
    notas_internas = Column(Text)
    criado_em = Column(DateTime, server_default=func.now())

    candidato = relationship("Candidato", back_populates="plataforma")
    usuario = relationship("Usuario", back_populates="politico")
    delegado_responsavel = relationship("Delegado")


class Delegado(Base):
    __tablename__ = "delegados"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, unique=True)
    nome = Column(String(300), nullable=False)
    email = Column(String(300))
    telefone = Column(String(30))
    whatsapp = Column(String(30))
    estado_uf = Column(String(2), nullable=False, index=True)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, server_default=func.now())

    usuario = relationship("Usuario", back_populates="delegado")
    zonas = relationship("DelegadoZona", back_populates="delegado")
    filiados_cadastrados = relationship("Filiado", back_populates="cadastrado_por_delegado")


class DelegadoZona(Base):
    __tablename__ = "delegado_zonas"

    id = Column(Integer, primary_key=True)
    delegado_id = Column(Integer, ForeignKey("delegados.id"), nullable=False, index=True)
    zona_id = Column(Integer, ForeignKey("zonas_eleitorais.id"), nullable=False, index=True)
    municipio_id = Column(Integer, ForeignKey("municipios.id"), nullable=False, index=True)

    delegado = relationship("Delegado", back_populates="zonas")
    zona = relationship("ZonaEleitoral", back_populates="delegado_zonas")


class Filiado(Base):
    __tablename__ = "filiados"

    id = Column(Integer, primary_key=True)
    nome_completo = Column(String(300), nullable=False)
    # CPF armazenado como hash (nunca em claro no banco)
    cpf_hash = Column(String(64), nullable=False, unique=True, index=True)
    # Últimos 4 dígitos do CPF para exibição
    cpf_ultimos4 = Column(String(4))
    titulo_eleitor = Column(String(20), unique=True, index=True)
    data_nascimento = Column(Date)

    # Endereço
    cep = Column(String(9))
    logradouro = Column(String(300))
    numero = Column(String(20))
    complemento = Column(String(100))
    bairro = Column(String(200))
    cidade = Column(String(200))
    estado_uf = Column(String(2), nullable=False, index=True)

    telefone = Column(String(30))
    whatsapp = Column(String(30))
    email = Column(String(300))
    foto_url = Column(String(500))

    municipio_id = Column(Integer, ForeignKey("municipios.id"), index=True)
    zona_id = Column(Integer, ForeignKey("zonas_eleitorais.id"))
    secao_id = Column(Integer, ForeignKey("secoes_eleitorais.id"))

    status_validacao_cpf = Column(Enum(StatusValidacao), default=StatusValidacao.PENDENTE)
    status_validacao_titulo = Column(Enum(StatusValidacao), default=StatusValidacao.PENDENTE)
    detalhes_validacao = Column(JSON)

    cadastrado_por_id = Column(Integer, ForeignKey("delegados.id"), nullable=False)
    criado_em = Column(DateTime, server_default=func.now())
    atualizado_em = Column(DateTime, onupdate=func.now())

    cadastrado_por_delegado = relationship("Delegado", back_populates="filiados_cadastrados")


class FarolMunicipio(Base):
    __tablename__ = "farol_municipio"

    id = Column(Integer, primary_key=True)
    municipio_id = Column(Integer, ForeignKey("municipios.id"), nullable=False, index=True)
    # partido_id = NULL significa farol consolidado do União Brasil (para compatibilidade)
    # partido_id preenchido = farol específico de um partido (todos os partidos no ETL)
    partido_id = Column(Integer, ForeignKey("partidos.id"), nullable=True, index=True)
    ano_referencia = Column(Integer, nullable=False)
    cargo = Column(String(100), nullable=False)
    status = Column(Enum(StatusFarol), nullable=False, index=True)
    votos_atual = Column(Integer, default=0)
    votos_anterior = Column(Integer, default=0)
    variacao_pct = Column(Float)
    eleitos_atual = Column(Integer, default=0)
    eleitos_anterior = Column(Integer, default=0)
    calculado_em = Column(DateTime, server_default=func.now())

    municipio = relationship("Municipio", back_populates="farol")

    __table_args__ = (
        Index("ix_farol_municipio_ano_cargo", "municipio_id", "partido_id", "ano_referencia", "cargo"),
    )


class Alerta(Base):
    __tablename__ = "alertas"

    id = Column(Integer, primary_key=True)
    tipo = Column(String(100), nullable=False)
    gravidade = Column(Enum(GravidadeAlerta), nullable=False, index=True)
    municipio_id = Column(Integer, ForeignKey("municipios.id"), index=True)
    delegado_id = Column(Integer, ForeignKey("delegados.id"), index=True)
    politico_id = Column(Integer, ForeignKey("politicos_plataforma.id"), index=True)
    descricao = Column(Text, nullable=False)
    lido = Column(Boolean, default=False)
    notificado_email = Column(Boolean, default=False)
    notificado_whatsapp = Column(Boolean, default=False)
    criado_em = Column(DateTime, server_default=func.now())


class AuditoriaLog(Base):
    """
    Log imutável de todas as ações do sistema.
    Nenhum usuário pode apagar ou alterar registros desta tabela.
    """
    __tablename__ = "auditoria_log"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), index=True)
    # Ação: LOGIN, LOGOUT, CREATE_FILIADO, UPDATE_DELEGADO, VIEW_DOSSIE, etc.
    acao = Column(String(100), nullable=False, index=True)
    # Tabela afetada (quando aplicável)
    tabela = Column(String(100))
    # ID do registro afetado
    registro_id = Column(Integer)
    # Snapshot antes e depois (para alterações)
    dados_antes = Column(JSON)
    dados_depois = Column(JSON)
    # Contexto técnico
    ip = Column(String(50))
    user_agent = Column(String(500))
    criado_em = Column(DateTime, server_default=func.now(), index=True)

    usuario = relationship("Usuario", back_populates="auditoria_log")

    __table_args__ = (
        Index("ix_auditoria_usuario_data", "usuario_id", "criado_em"),
        Index("ix_auditoria_acao_data", "acao", "criado_em"),
    )


class Coordenador(Base):
    """
    Coordenador territorial — responsável por ~50 municípios.
    Cada coordenador tem uma cor no mapa e pode ser vinculado a um usuário da plataforma.
    """
    __tablename__ = "coordenadores"

    id           = Column(Integer, primary_key=True)
    nome         = Column(String(300), nullable=False)
    email        = Column(String(300), nullable=True)
    telefone     = Column(String(30),  nullable=True)
    estado_uf    = Column(String(2),   nullable=False, index=True)
    cor_hex      = Column(String(7),   nullable=False, default="#3B82F6")
    usuario_id   = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    ativo        = Column(Boolean, default=True, index=True)
    criado_em    = Column(DateTime, server_default=func.now())
    atualizado_em = Column(DateTime, onupdate=func.now())

    municipios   = relationship("CoordenadorMunicipio", back_populates="coordenador",
                                cascade="all, delete-orphan")
    usuario      = relationship("Usuario", foreign_keys=[usuario_id])


class CoordenadorMunicipio(Base):
    """
    Vínculo coordenador ↔ município (território).
    """
    __tablename__ = "coordenador_municipios"

    id             = Column(Integer, primary_key=True)
    coordenador_id = Column(Integer, ForeignKey("coordenadores.id", ondelete="CASCADE"), nullable=False, index=True)
    municipio_id   = Column(Integer, ForeignKey("municipios.id",    ondelete="CASCADE"), nullable=False, index=True)
    atribuido_em   = Column(DateTime, server_default=func.now())

    coordenador = relationship("Coordenador", back_populates="municipios")


class RelatorioGerado(Base):
    __tablename__ = "relatorios_gerados"

    id = Column(Integer, primary_key=True)
    tipo = Column(String(100), nullable=False)
    gerado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    parametros = Column(JSON)
    arquivo_url = Column(String(500))
    criado_em = Column(DateTime, server_default=func.now())


# ─────────────────────────────────────────────────────────────────────────────
# MÓDULO TERRITORIAL: Lideranças + Cercas Virtuais
# ─────────────────────────────────────────────────────────────────────────────

class StatusLideranca(str, enum.Enum):
    ATIVO   = "ATIVO"
    INATIVO = "INATIVO"

class ScoreLideranca(str, enum.Enum):
    OURO    = "OURO"
    PRATA   = "PRATA"
    BRONZE  = "BRONZE"
    CRITICO = "CRITICO"


class Lideranca(Base):
    """
    Liderança política territorial — pessoa de influência no chão de urna.
    Diferente de coordenador (gestor) e delegado (representante formal):
    liderança é quem movimenta votos em bairros e escolas eleitorais.
    """
    __tablename__ = "liderancas"

    id                  = Column(Integer, primary_key=True)
    nome_completo       = Column(String(300), nullable=False)
    nome_politico       = Column(String(200))            # apelido / nome de rua
    telefone            = Column(String(30))
    whatsapp            = Column(String(30))
    email               = Column(String(300))
    foto_url            = Column(Text)

    # Território
    municipio_id        = Column(Integer, ForeignKey("municipios.id"),      nullable=False, index=True)
    bairro              = Column(String(200))
    zona_id             = Column(Integer, ForeignKey("zonas_eleitorais.id"), index=True)

    # Vinculações operacionais
    coordenador_id      = Column(Integer, ForeignKey("coordenadores.id"),   index=True)
    equipe              = Column(String(300))

    # Status e datas
    status              = Column(PG_ENUM("ATIVO", "INATIVO",
                                         name="status_lideranca_enum", create_type=False),
                                 server_default="ATIVO", nullable=False, index=True)
    data_entrada        = Column(Date)

    # Score calculado pelo sistema (fórmula: votos×40% + crescimento×30% + constância×30%)
    score_valor         = Column(Float)
    score_classificacao = Column(PG_ENUM("OURO", "PRATA", "BRONZE", "CRITICO",
                                          name="score_lideranca_enum", create_type=False))
    score_calculado_em  = Column(DateTime)

    observacoes         = Column(Text)
    criado_em           = Column(DateTime, server_default=func.now())
    atualizado_em       = Column(DateTime, onupdate=func.now())

    # Relationships
    municipio           = relationship("Municipio")
    zona                = relationship("ZonaEleitoral")
    coordenador         = relationship("Coordenador")
    escolas             = relationship("LiderancaEscola", back_populates="lideranca",
                                       cascade="all, delete-orphan")
    cercas              = relationship("CercaLideranca",  back_populates="lideranca",
                                       cascade="all, delete-orphan")


class LiderancaEscola(Base):
    """M2M: liderança ↔ escola eleitoral (local_votacao)"""
    __tablename__ = "lideranca_escolas"

    id               = Column(Integer, primary_key=True)
    lideranca_id     = Column(Integer, ForeignKey("liderancas.id",    ondelete="CASCADE"), nullable=False, index=True)
    local_votacao_id = Column(Integer, ForeignKey("locais_votacao.id", ondelete="CASCADE"), nullable=False, index=True)
    vinculado_em     = Column(DateTime, server_default=func.now())

    lideranca        = relationship("Lideranca", back_populates="escolas")


class CercaVirtual(Base):
    """
    Polígono desenhado pelo usuário no mapa — define um microterritório estratégico.
    Exemplos: bairros, favelas, regiões de atuação, bases eleitorais.
    Geometria armazenada como PostGIS Polygon (SRID 4326) + GeoJSON string para API.
    """
    __tablename__ = "cercas_virtuais"

    id               = Column(Integer, primary_key=True)
    nome             = Column(String(300), nullable=False)
    cor_hex          = Column(String(7), server_default="#7B2FBE")
    estado_uf        = Column(String(2), nullable=False, index=True)
    municipio_id     = Column(Integer, ForeignKey("municipios.id"),  index=True)
    responsavel_id   = Column(Integer, ForeignKey("usuarios.id"))
    equipe           = Column(String(300))
    observacoes      = Column(Text)

    # GeoJSON do polígono (para retorno na API sem processar PostGIS)
    geometria_json   = Column(Text)
    # (geometria_postgis é coluna geometry adicionada via SQL no migration)

    # Cache de consolidação — atualizado ao salvar/editar a cerca
    total_votos      = Column(Integer, server_default="0")
    total_eleitores  = Column(Integer)
    total_liderancas = Column(Integer, server_default="0")
    total_escolas    = Column(Integer, server_default="0")
    total_zonas      = Column(Integer, server_default="0")
    consolidado_em   = Column(DateTime)

    ativo            = Column(Boolean, server_default="true", index=True)
    criado_em        = Column(DateTime, server_default=func.now())
    atualizado_em    = Column(DateTime, onupdate=func.now())

    municipio        = relationship("Municipio")
    responsavel      = relationship("Usuario", foreign_keys=[responsavel_id])
    liderancas       = relationship("CercaLideranca", back_populates="cerca",
                                    cascade="all, delete-orphan")


class CercaLideranca(Base):
    """M2M: cerca virtual ↔ liderança"""
    __tablename__ = "cerca_liderancas"

    id           = Column(Integer, primary_key=True)
    cerca_id     = Column(Integer, ForeignKey("cercas_virtuais.id", ondelete="CASCADE"), nullable=False, index=True)
    lideranca_id = Column(Integer, ForeignKey("liderancas.id",      ondelete="CASCADE"), nullable=False, index=True)
    vinculado_em = Column(DateTime, server_default=func.now())

    cerca        = relationship("CercaVirtual", back_populates="liderancas")
    lideranca    = relationship("Lideranca",    back_populates="cercas")


# ── Cabos Eleitorais ──────────────────────────────────────────────────────────

class StatusCabo(str, enum.Enum):
    ATIVO      = "ATIVO"
    INATIVO    = "INATIVO"
    RESCINDIDO = "RESCINDIDO"


class PerformanceCabo(str, enum.Enum):
    VERDE     = "VERDE"
    AMARELO   = "AMARELO"
    VERMELHO  = "VERMELHO"
    SEM_DADOS = "SEM_DADOS"


class CaboEleitoral(Base):
    """
    Agente de campo contratado por um coordenador.
    Responsável por mobilizar eleitores em um conjunto de escolas (locais de votação).
    Performance medida por conversão de voto na urna (dados TSE pós-eleição).
    """
    __tablename__ = "cabos_eleitorais"

    id              = Column(Integer, primary_key=True)
    nome_completo   = Column(String(300), nullable=False)
    nome_guerra     = Column(String(200))
    telefone        = Column(String(30))
    whatsapp        = Column(String(30))
    email           = Column(String(300))
    foto_url        = Column(Text)
    cpf             = Column(String(14))
    municipio_id    = Column(Integer, ForeignKey("municipios.id"), nullable=False, index=True)
    bairros         = Column(Text)   # lista livre de bairros cobertos

    # Hierarquia
    coordenador_id  = Column(Integer, ForeignKey("coordenadores.id"), index=True)
    lideranca_id    = Column(Integer, ForeignKey("liderancas.id"))   # se o cabo também é liderança

    # Contrato
    status          = Column(
        PG_ENUM("ATIVO", "INATIVO", "RESCINDIDO", name="status_cabo_enum", create_type=False),
        nullable=False, server_default="ATIVO"
    )
    data_inicio     = Column(Date)
    data_fim        = Column(Date)
    valor_contrato  = Column(Float)
    meta_votos      = Column(Integer)

    # Performance calculada pós-eleição
    ciclo_ref               = Column(Integer)       # ano do último ciclo calculado
    votos_ciclo_atual       = Column(Integer)
    votos_ciclo_anterior    = Column(Integer)
    eleitores_area          = Column(Integer)       # eleitorado das escolas dele
    conversao_pct           = Column(Float)         # votos_ciclo_atual / eleitores_area × 100
    variacao_pct            = Column(Float)         # delta vs ciclo anterior
    performance             = Column(
        PG_ENUM("VERDE", "AMARELO", "VERMELHO", "SEM_DADOS", name="performance_cabo_enum", create_type=False),
        server_default="SEM_DADOS"
    )
    performance_calculada_em = Column(DateTime)

    observacoes     = Column(Text)
    criado_em       = Column(DateTime, server_default=func.now())
    atualizado_em   = Column(DateTime)

    municipio    = relationship("Municipio")
    coordenador  = relationship("Coordenador")
    lideranca    = relationship("Lideranca")
    zonas        = relationship("CaboZona",   back_populates="cabo", cascade="all, delete-orphan")
    escolas      = relationship("CaboEscola", back_populates="cabo", cascade="all, delete-orphan")


class CaboZona(Base):
    """M2M: cabo eleitoral ↔ zona eleitoral"""
    __tablename__ = "cabo_zonas"

    id        = Column(Integer, primary_key=True)
    cabo_id   = Column(Integer, ForeignKey("cabos_eleitorais.id", ondelete="CASCADE"), nullable=False, index=True)
    zona_id   = Column(Integer, ForeignKey("zonas_eleitorais.id", ondelete="CASCADE"), nullable=False, index=True)
    criado_em = Column(DateTime, server_default=func.now())

    cabo = relationship("CaboEleitoral", back_populates="zonas")


class CaboEscola(Base):
    """M2M: cabo eleitoral ↔ local de votação (escola)"""
    __tablename__ = "cabo_escolas"

    id               = Column(Integer, primary_key=True)
    cabo_id          = Column(Integer, ForeignKey("cabos_eleitorais.id", ondelete="CASCADE"), nullable=False, index=True)
    local_votacao_id = Column(Integer, ForeignKey("locais_votacao.id",  ondelete="CASCADE"), nullable=False, index=True)
    criado_em        = Column(DateTime, server_default=func.now())

    cabo = relationship("CaboEleitoral", back_populates="escolas")


class SegurancaScraping(Base):
    """
    Audit log de detecção de extensões de IA e scraping automatizado no frontend.

    Populado por POST /seguranca/scraping-detectado (frontend antiScraping.ts).
    Cesar 20/04/2026: pré-requisito pra lançamento do Modo Campanha pago.
    """
    __tablename__ = "seguranca_scraping"

    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    motivo     = Column(String(50), nullable=False)  # claude_extension | chatgpt_extension | automation_cdp | ...
    url        = Column(String(500), nullable=True)
    user_agent = Column(String(500), nullable=True)
    ip         = Column(String(50), nullable=True)
    detalhes   = Column(JSON, nullable=True)
    criado_em  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_seguranca_scraping_user_criado", "user_id", "criado_em"),
        Index("ix_seguranca_scraping_motivo", "motivo"),
    )


class UsuarioBusca(Base):
    """
    Historico de buscas confirmadas pelo usuario na topbar do mapa eleitoral.

    Cada registro representa UMA sugestao que o usuario clicou (nao keystroke).
    Usado pra alimentar "Suas regioes recentes" no dropdown da busca.

    Score futuro: frequencia * 0.7 + recencia * 0.3 (Cesar 20/04/2026).
    """
    __tablename__ = "usuario_buscas"

    id        = Column(Integer, primary_key=True)
    user_id   = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    # Tipos: municipio, estado, bairro, zona, politico, partido
    tipo      = Column(String(20), nullable=False)
    # Valor canonico (FK soft): codigo_ibge, uf, cd_dist, numero_zona, id_politico, num_partido
    valor     = Column(String(50), nullable=False)
    # Label legivel pra exibir sem novo fetch ("Sao Paulo", "PSD", "Moema").
    nome      = Column(String(200), nullable=False)
    # UF de contexto (quando aplicavel: bairro/zona/municipio).
    uf        = Column(String(2), nullable=True)
    # Contexto adicional pra sublabel ("Moema" + contexto "Sao Paulo/SP").
    contexto  = Column(String(200), nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_usuario_buscas_user_criado", "user_id", "criado_em"),
        Index("ix_usuario_buscas_user_tipo_valor", "user_id", "tipo", "valor"),
    )
