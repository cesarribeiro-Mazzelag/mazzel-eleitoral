"""
API principal — Inteligência Eleitoral Mazzel Tech
"""
from contextlib import asynccontextmanager
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.endpoints import auth, mapa, mapa_historia, politicos, politico_portal, delegados, filiados, validar, ia, alertas, admin, fotos, coordenadores, dashboard, liderancas, cabos, dossie, radar, sistema, seguranca, campanha, afiliados, chat

logger = logging.getLogger(__name__)


_CARGOS_ESTADUAIS = {
    "PRESIDENTE", "GOVERNADOR", "SENADOR",
    "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL"
}

_GEOM_BRASIL = "COALESCE(m.geometry_brasil, ST_Multi(ST_SimplifyPreserveTopology(m.geometry, 0.01)))"


async def _prewarm_cache():
    """Pre-aquece o cache de GeoJSON do Brasil para os cargos mais comuns."""
    try:
        from app.core.database import AsyncSessionLocal
        from app.api.v1.endpoints.mapa import _brasil_mun_cache
        from sqlalchemy import text

        # Visão global primeiro (estado inicial do mapa), depois cargos específicos
        targets = [
            (None,                None),   # visão global — carrega primeiro
            ("VEREADOR",          2024),
            ("PREFEITO",          2024),
            ("GOVERNADOR",        2022),
            ("DEPUTADO ESTADUAL", 2022),
            ("DEPUTADO FEDERAL",  2022),
        ]

        async with AsyncSessionLocal() as db:
            for cargo, ano in targets:
                cargo_key = cargo if cargo else "TODOS"
                ano_key   = str(ano) if ano else "TODOS"
                cache_key = f"mun:{ano_key}:{cargo_key}:todos"
                if cache_key in _brasil_mun_cache:
                    continue  # já está quente

                logger.info(f"Pre-warming cache: brasil-municipios cargo={cargo_key} ano={ano_key}")

                if cargo and ano and cargo.upper() in _CARGOS_ESTADUAIS:
                    # ── Cargo estadual: agrega por estado_uf, replica para municípios ──
                    result = await db.execute(text(f"""
                        WITH eleitos_estado AS (
                            SELECT
                                ca.estado_uf,
                                p.numero AS partido_num,
                                p.sigla  AS partido_sigla,
                                SUM(ca.votos_total)                      AS total_votos,
                                COUNT(*) FILTER (WHERE ca.eleito = TRUE) AS n_eleitos
                            FROM candidaturas ca
                            JOIN partidos p ON p.id = ca.partido_id
                            WHERE ca.ano = :ano AND UPPER(ca.cargo) = :cargo
                            GROUP BY ca.estado_uf, p.numero, p.sigla
                        ),
                        dominante AS (
                            SELECT DISTINCT ON (estado_uf)
                                estado_uf, partido_num, partido_sigla, n_eleitos, total_votos
                            FROM eleitos_estado
                            ORDER BY estado_uf, n_eleitos DESC NULLS LAST, total_votos DESC NULLS LAST
                        )
                        SELECT
                            m.codigo_ibge, m.nome, m.estado_uf,
                            COALESCE(d.partido_num,   0)  AS partido_num,
                            COALESCE(d.partido_sigla, '')  AS partido_sigla,
                            COALESCE(d.n_eleitos,     0)   AS eleitos,
                            COALESCE(d.total_votos,   0)   AS votos,
                            ST_AsGeoJSON({_GEOM_BRASIL}, 3)::json AS geom
                        FROM municipios m
                        LEFT JOIN dominante d ON d.estado_uf = m.estado_uf
                        WHERE m.geometry IS NOT NULL
                        ORDER BY m.id
                    """), {"ano": ano, "cargo": cargo.upper()})

                elif cargo and ano:
                    # ── Cargo municipal: agrega por municipio_id ──
                    result = await db.execute(text(f"""
                        WITH eleitos_mun AS (
                            SELECT
                                ca.municipio_id,
                                p.numero AS partido_num,
                                p.sigla  AS partido_sigla,
                                SUM(ca.votos_total)                      AS total_votos,
                                COUNT(*) FILTER (WHERE ca.eleito = TRUE) AS n_eleitos
                            FROM candidaturas ca
                            JOIN partidos p ON p.id = ca.partido_id
                            WHERE ca.ano = :ano AND UPPER(ca.cargo) = :cargo
                            GROUP BY ca.municipio_id, p.numero, p.sigla
                        ),
                        dominante AS (
                            SELECT DISTINCT ON (municipio_id)
                                municipio_id, partido_num, partido_sigla, n_eleitos, total_votos
                            FROM eleitos_mun
                            ORDER BY municipio_id, n_eleitos DESC NULLS LAST, total_votos DESC NULLS LAST
                        )
                        SELECT
                            m.codigo_ibge, m.nome, m.estado_uf,
                            COALESCE(d.partido_num,   0)  AS partido_num,
                            COALESCE(d.partido_sigla, '')  AS partido_sigla,
                            COALESCE(d.n_eleitos,     0)   AS eleitos,
                            COALESCE(d.total_votos,   0)   AS votos,
                            ST_AsGeoJSON({_GEOM_BRASIL}, 3)::json AS geom
                        FROM municipios m
                        LEFT JOIN dominante d ON d.municipio_id = m.id
                        WHERE m.geometry IS NOT NULL
                        ORDER BY m.id
                    """), {"ano": ano, "cargo": cargo.upper()})

                else:
                    # ── Visão global: partido dominante por município (todos os pleitos) ──
                    result = await db.execute(text(f"""
                        WITH eleitos_mun AS (
                            SELECT
                                ca.municipio_id,
                                p.numero AS partido_num,
                                p.sigla  AS partido_sigla,
                                SUM(ca.votos_total)                      AS total_votos,
                                COUNT(*) FILTER (WHERE ca.eleito = TRUE) AS n_eleitos
                            FROM candidaturas ca
                            JOIN partidos p ON p.id = ca.partido_id
                            JOIN (
                                SELECT UPPER(cargo) AS cargo, MAX(ano) AS ultimo_ano
                                FROM candidaturas WHERE eleito = TRUE
                                GROUP BY UPPER(cargo)
                            ) ult ON UPPER(ca.cargo) = ult.cargo AND ca.ano = ult.ultimo_ano
                            GROUP BY ca.municipio_id, p.numero, p.sigla
                        ),
                        dominante AS (
                            SELECT DISTINCT ON (municipio_id)
                                municipio_id, partido_num, partido_sigla, n_eleitos, total_votos
                            FROM eleitos_mun
                            ORDER BY municipio_id, n_eleitos DESC NULLS LAST, total_votos DESC NULLS LAST
                        )
                        SELECT
                            m.codigo_ibge, m.nome, m.estado_uf,
                            COALESCE(d.partido_num,   0)  AS partido_num,
                            COALESCE(d.partido_sigla, '')  AS partido_sigla,
                            COALESCE(d.n_eleitos,     0)   AS eleitos,
                            COALESCE(d.total_votos,   0)   AS votos,
                            ST_AsGeoJSON({_GEOM_BRASIL}, 3)::json AS geom
                        FROM municipios m
                        LEFT JOIN dominante d ON d.municipio_id = m.id
                        WHERE m.geometry IS NOT NULL
                        ORDER BY m.id
                    """), {})

                features = []
                for r in result.fetchall():
                    if not r.geom:
                        continue
                    features.append({
                        "type": "Feature",
                        "geometry": r.geom,
                        "properties": {
                            "codigo_ibge":   r.codigo_ibge,
                            "nome":          r.nome,
                            "estado_uf":     r.estado_uf,
                            "votos":         int(r.votos or 0),
                            "eleitos":       int(r.eleitos or 0),
                            "partido_num":   int(r.partido_num or 0),
                            "partido_sigla": r.partido_sigla or "",
                            "status_farol":  "SEM_DADOS",
                        },
                    })

                if features:
                    _brasil_mun_cache[cache_key] = {"type": "FeatureCollection", "features": features}
                    logger.info(f"Cache pronto: {cache_key} ({len(features)} municípios)")

    except Exception as e:
        logger.warning(f"Pre-warm falhou (não crítico): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: pre-aquece cache em background para não atrasar o início
    asyncio.create_task(_prewarm_cache())
    yield
    # Shutdown: nada a fazer


app = FastAPI(
    title="Inteligência Eleitoral Mazzel Tech",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
    lifespan=lifespan,
)

_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3002",
    "https://app.mazzeltech.com",
    "https://www.mazzeltech.com",
    "https://mazzeltech.com",
]
if settings.FRONTEND_URL:
    _ORIGINS.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router,            prefix="/auth",        tags=["auth"])
app.include_router(mapa.router,            prefix="/mapa",        tags=["mapa"])
app.include_router(mapa_historia.router,   prefix="/mapa/historia", tags=["mapa-historia"])
app.include_router(politicos.router,       prefix="/politicos",   tags=["politicos"])
app.include_router(radar.router,           prefix="/radar",       tags=["radar"])
app.include_router(sistema.router,         prefix="/sistema",     tags=["sistema"])
app.include_router(dossie.router,          prefix="/dossie",      tags=["dossie"])
app.include_router(politico_portal.router, prefix="/meu-painel",  tags=["meu-painel"])
app.include_router(delegados.router,       prefix="/delegados",   tags=["delegados"])
app.include_router(filiados.router,        prefix="/filiados",    tags=["filiados"])
app.include_router(validar.router,         prefix="/validar",     tags=["validar"])
app.include_router(ia.router,              prefix="/ia",          tags=["ia"])
app.include_router(alertas.router,         prefix="/alertas",     tags=["alertas"])
app.include_router(admin.router,           prefix="/admin",       tags=["admin"])
app.include_router(fotos.router,           prefix="/fotos",       tags=["fotos"])
app.include_router(coordenadores.router,   prefix="/coordenadores", tags=["coordenadores"])
app.include_router(dashboard.router,       prefix="/dashboard",     tags=["dashboard"])
app.include_router(liderancas.router,      prefix="/liderancas",    tags=["liderancas"])
app.include_router(cabos.router,           prefix="/cabos",         tags=["cabos"])
app.include_router(seguranca.router,                                tags=["seguranca"])
app.include_router(campanha.router,                                 tags=["campanha"])
app.include_router(afiliados.router,                                tags=["afiliados"])
app.include_router(chat.router,                                     tags=["chat"])

# ── Routers futuros (descomenta sprint a sprint) ──────────────────────────────
# from app.api.v1.endpoints import delegados, filiados, validar, alertas, ia
# app.include_router(delegados.router, prefix="/delegados", tags=["delegados"])
# app.include_router(filiados.router,  prefix="/filiados",  tags=["filiados"])
# app.include_router(validar.router,   prefix="/validar",   tags=["validar"])
# app.include_router(alertas.router,   prefix="/alertas",   tags=["alertas"])
# app.include_router(ia.router,        prefix="/ia",        tags=["ia"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
