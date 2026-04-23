from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Inteligência Eleitoral Mazzel Tech"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "production"] = "development"
    DEBUG: bool = False

    # Banco de dados
    DATABASE_URL: str
    REDIS_URL: str

    # Auth
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    # Dev/testes: 8h de sessao. Antes de lancamento em producao,
    # reduzir (ex: 60-120min) + implementar refresh token flow no frontend.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # 2FA
    TOTP_ISSUER: str = "Mazzel Inteligencia Eleitoral"

    # Claude API
    ANTHROPIC_API_KEY: str = ""

    # SERPRO DataValid
    SERPRO_API_KEY: str = ""
    SERPRO_CPF_URL: str = "https://gateway.apiserpro.serpro.gov.br/datavalid/v2/validate"

    # E-mail
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = ""

    # Frontend URL (CORS dinâmico — colocar URL completa do Vercel/dominio custom)
    FRONTEND_URL: str = ""

    # WhatsApp Business API
    WHATSAPP_API_URL: str = ""
    WHATSAPP_TOKEN: str = ""

    # IBGE / TSE
    IBGE_API_BASE: str = "https://servicodados.ibge.gov.br/api/v1"
    TSE_CDN_BASE: str = "https://cdn.tse.jus.br/estatistica/sead/odsele"
    CAMARA_API_BASE: str = "https://dadosabertos.camara.leg.br/api/v2"
    SENADO_API_BASE: str = "https://legis.senado.leg.br/dadosabertos"

    # ─── GOVERNANÇA DE DADOS ──────────────────────────────────────────────
    # MODO_DADOS controla se a plataforma sinaliza ao usuário que os dados
    # estão em validação. Valores:
    #   - "PROD"          : todos os dados foram validados, UI sem aviso
    #   - "EXPERIMENTAL"  : dados em validação, UI mostra aviso discreto
    # Default = EXPERIMENTAL até a Fase 2 do Radar Político fechar e o ETL
    # de correção de votos_total terminar com mv_validacao_votos zerada.
    # Regra obrigatória: nenhum dado inconsistente pode ser apresentado como
    # verdade ao usuário, independente do modo.
    MODO_DADOS: Literal["PROD", "EXPERIMENTAL"] = "EXPERIMENTAL"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
