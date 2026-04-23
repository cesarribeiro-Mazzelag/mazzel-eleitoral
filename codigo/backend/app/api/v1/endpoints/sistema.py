"""
Endpoints de governança e metadados do sistema.

GET /sistema/info  → modo_dados, versão, ambiente

Usado pelo frontend para mostrar avisos discretos quando estamos em modo
EXPERIMENTAL (dados ainda em validação). Sem autenticação porque é metadado
público — não revela nada sensível.
"""
from fastapi import APIRouter

from app.core.config import settings


router = APIRouter()


@router.get("/info")
async def get_sistema_info():
    """
    Retorna metadados do sistema. Usado pelo frontend para decidir mostrar
    o aviso "Dados em validação" no header do Radar.
    """
    return {
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "modo_dados": settings.MODO_DADOS,
        "modo_dados_descricao": (
            "Os dados estão em processo de validação contínua. "
            "Indicadores marcados como 'INDISPONÍVEL' significam que a fonte "
            "primária ainda não foi reconciliada."
            if settings.MODO_DADOS == "EXPERIMENTAL"
            else "Dados validados e auditados."
        ),
    }
