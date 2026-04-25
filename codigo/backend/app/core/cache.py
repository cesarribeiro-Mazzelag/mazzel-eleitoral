"""Cache simples baseado em Redis.

Stack ja tem Redis (settings.REDIS_URL) mas nao havia helper de cache. Este
modulo expoe `cached_json(key, ttl, builder)` pra endpoints que executam
queries pesadas e podem aceitar TTL curto (segundos a minutos).

Uso:
    from app.core.cache import cached_json

    @router.get("/foo")
    async def get_foo(...):
        key = f"foo:{algum_param}"
        return await cached_json(key, ttl=300, builder=lambda: _calcular_foo(...))

Notas:
- Falha silenciosa: se Redis cair, o builder roda direto (sem cache).
- Valores serializados como JSON. Use orjson se ficar gargalo.
- Use prefixo do modulo na chave (ex: `dashboard:visao-geral:hash`).
"""
from __future__ import annotations

import json
import logging
from typing import Awaitable, Callable, Optional

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis: Optional[aioredis.Redis] = None


def _client() -> Optional[aioredis.Redis]:
    global _redis
    if _redis is None:
        try:
            _redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
        except Exception:
            logger.exception("Falha ao conectar Redis - cache desabilitado")
            return None
    return _redis


async def cached_json(
    key: str,
    ttl: int,
    builder: Callable[[], Awaitable[dict | list]],
) -> dict | list:
    """Le do cache Redis. Em miss, roda builder e cacheia o resultado.

    builder e uma corotina sem args (use lambda + closure pra capturar deps).
    Falha silenciosa: se Redis nao estiver disponivel, builder roda direto.
    """
    cli = _client()
    if cli is not None:
        try:
            raw = await cli.get(key)
            if raw is not None:
                return json.loads(raw)
        except Exception:
            logger.exception("Cache GET falhou (key=%s) - executando builder", key)

    value = await builder()

    if cli is not None:
        try:
            await cli.set(key, json.dumps(value, default=str), ex=ttl)
        except Exception:
            logger.exception("Cache SET falhou (key=%s)", key)

    return value


async def cache_invalidate(pattern: str) -> int:
    """Invalida chaves matching pattern (ex: 'dashboard:*'). Retorna deletadas."""
    cli = _client()
    if cli is None:
        return 0
    try:
        keys = [k async for k in cli.scan_iter(pattern)]
        if not keys:
            return 0
        return await cli.delete(*keys)
    except Exception:
        logger.exception("Cache INVALIDATE falhou (pattern=%s)", pattern)
        return 0
