"""
Helper compartilhado: gera GeoJSON da força eleitoral de um candidato.

Contém as 3 lógicas SQL extraídas dos endpoints existentes do mapa principal
(`/mapa/geojson/brasil`, `/mapa/geojson/{uf}`, `/mapa/municipio/{ibge}/distritos`)
no branch `candidato_id is not None`. Os endpoints originais foram refatorados
para chamar este helper, mantendo comportamento idêntico (validado por smoke
test antes/depois).

Granularidade depende do cargo da candidatura:
    VEREADOR / PREFEITO            → bairros (distritos IBGE) do município
                                      via spatial join com locais_votacao
    DEP. ESTADUAL/FEDERAL/GOV/DIST → municípios do estado choropleth
    SENADOR / PRESIDENTE           → 27 estados do Brasil choropleth

Cache em memória por `candidatura_id` (limpo no restart). TTL infinito.

Sempre retorna mapa: se não houver granularidade suficiente (ex: município
sem distritos cadastrados), faz fallback para o nível acima.
"""
from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.cores_partidos import get_cor_partido
from app.services.mapa_score import enriquecer_features_percentil, SCORE_FNS

logger = logging.getLogger(__name__)


# ── Constantes ───────────────────────────────────────────────────────────────

_CARGO_MUNICIPAL = {"VEREADOR", "PREFEITO"}
_CARGO_ESTADUAL = {
    "DEPUTADO ESTADUAL", "DEPUTADO FEDERAL",
    "GOVERNADOR", "DEPUTADO DISTRITAL",
}
_CARGO_NACIONAL = {"SENADOR", "PRESIDENTE"}

_CARGOS_PRINCIPAIS = _CARGO_MUNICIPAL | _CARGO_ESTADUAL | _CARGO_NACIONAL


# ── Cache em memória (por candidatura_id) ────────────────────────────────────

_CACHE: dict[int, dict] = {}
_CACHE_MAX = 200


def _cache_put(cid: int, payload: dict) -> None:
    if len(_CACHE) >= _CACHE_MAX:
        _CACHE.pop(next(iter(_CACHE)))
    _CACHE[cid] = payload


def limpar_cache() -> None:
    """Permite limpar o cache externamente (testes, refresh manual)."""
    _CACHE.clear()


# ── Função principal ─────────────────────────────────────────────────────────


async def obter_geojson_candidato(
    db: AsyncSession,
    candidato_id: int,
    candidatura_id: int | None = None,
) -> Optional[dict]:
    """
    Retorna FeatureCollection GeoJSON da força eleitoral do candidato no
    cargo da candidatura especificada. Se `candidatura_id` for omitido, usa
    a candidatura mais recente do candidato (entre os cargos principais).

    Schema do retorno:
        {
          "type": "FeatureCollection",
          "features": [{ geometry, properties: { nome_regiao, votos_total,
                          nivel_farol, score_normalizado, codigo_regiao } }],
          "_meta": {
              candidato_id, candidato_nome, partido_numero, partido_sigla,
              partido_cor, cargo, ano, nivel, uf, municipio_ibge,
              municipio_nome, total_features, total_votos, fallback_aplicado,
              top_regiao, regiao_mais_fraca,
          }
        }

    Devolve `None` quando o candidato não tem candidaturas válidas, quando
    a candidatura escolhida não tem votos registrados em nenhuma região,
    ou quando a renderização falha. Loga warning em vez de propagar erro.
    """
    cand_row = await _resolver_candidatura(db, candidato_id, candidatura_id)
    if cand_row is None:
        return None

    cid = cand_row.candidatura_id
    if cid in _CACHE:
        return _CACHE[cid]

    cargo = (cand_row.cargo or "").upper()

    try:
        if cargo in _CARGO_MUNICIPAL:
            payload = await _gerar_municipal(db, cand_row)
        elif cargo in _CARGO_ESTADUAL:
            payload = await _gerar_estadual(db, cand_row)
        elif cargo in _CARGO_NACIONAL:
            payload = await _gerar_nacional(db, cand_row)
        else:
            return None
    except Exception as e:  # noqa: BLE001
        logger.warning(
            "Falha ao gerar geojson do candidato %s (candidatura %s): %s",
            candidato_id, cid, e,
        )
        return None

    if payload:
        _cache_put(cid, payload)
    return payload


# ── Resolução da candidatura ─────────────────────────────────────────────────


async def _resolver_candidatura(
    db: AsyncSession,
    candidato_id: int,
    candidatura_id: int | None,
):
    """
    Devolve a row da candidatura escolhida com todos os campos necessários
    para o helper. Default = candidatura mais recente entre cargos principais.
    """
    if candidatura_id is not None:
        # Dossie unifica candidaturas por nome_completo (mesmo politico com
        # sequencial_tse diferente por ciclo). A candidatura_id enviada pode
        # pertencer a outro candidato_id com o MESMO nome - por isso o filtro
        # usa ids_unificados em vez de `ca.candidato_id = :cdt` direto.
        sql = text("""
            WITH ids_unificados AS (
                SELECT DISTINCT c2.id
                FROM candidatos c1
                JOIN candidatos c2 ON c2.nome_completo = c1.nome_completo
                WHERE c1.id = :cdt
                  AND c1.nome_completo IS NOT NULL
                  AND c1.nome_completo != ''
            )
            SELECT
                ca.id           AS candidatura_id,
                ca.ano,
                UPPER(ca.cargo) AS cargo,
                ca.estado_uf,
                ca.municipio_id,
                m.codigo_ibge   AS municipio_ibge,
                m.nome          AS municipio_nome,
                p.numero        AS partido_numero,
                p.sigla         AS partido_sigla,
                COALESCE(c.nome_urna, c.nome_completo) AS candidato_nome
            FROM candidaturas ca
            JOIN candidatos  c ON c.id = ca.candidato_id
            JOIN partidos    p ON p.id = ca.partido_id
            LEFT JOIN municipios m ON m.id = ca.municipio_id
            WHERE ca.id = :cid
              AND ca.candidato_id IN (SELECT id FROM ids_unificados)
            LIMIT 1
        """)
        params = {"cid": candidatura_id, "cdt": candidato_id}
    else:
        # Mais recente entre cargos principais (vereador/prefeito/dep/gov/sen/pres)
        sql = text("""
            SELECT
                ca.id           AS candidatura_id,
                ca.ano,
                UPPER(ca.cargo) AS cargo,
                ca.estado_uf,
                ca.municipio_id,
                m.codigo_ibge   AS municipio_ibge,
                m.nome          AS municipio_nome,
                p.numero        AS partido_numero,
                p.sigla         AS partido_sigla,
                COALESCE(c.nome_urna, c.nome_completo) AS candidato_nome
            FROM candidaturas ca
            JOIN candidatos  c ON c.id = ca.candidato_id
            JOIN partidos    p ON p.id = ca.partido_id
            LEFT JOIN municipios m ON m.id = ca.municipio_id
            WHERE ca.candidato_id = :cdt
              AND UPPER(ca.cargo) IN (
                'PRESIDENTE','GOVERNADOR','SENADOR','DEPUTADO FEDERAL',
                'DEPUTADO ESTADUAL','DEPUTADO DISTRITAL','PREFEITO','VEREADOR'
              )
            ORDER BY ca.ano DESC, ca.id DESC
            LIMIT 1
        """)
        params = {"cdt": candidato_id}

    r = await db.execute(sql, params)
    return r.fetchone()


# ── Builder do _meta ─────────────────────────────────────────────────────────


def _build_meta(
    cand_row,
    nivel: str,
    features: list[dict],
    fallback_aplicado: bool = False,
) -> dict:
    """
    Monta o bloco `_meta` que acompanha cada FeatureCollection. Contém
    `top_regiao` e `regiao_mais_fraca` para alimentar o texto interpretativo
    do dossiê.
    """
    com_votos = [
        f for f in features
        if (f.get("properties", {}).get("votos_total") or 0) > 0
    ]
    com_votos.sort(
        key=lambda f: f["properties"].get("votos_total") or 0, reverse=True,
    )

    total_votos = sum(
        f["properties"].get("votos_total") or 0 for f in features
    )

    top_regiao = (
        com_votos[0]["properties"].get("nome_regiao") if com_votos else None
    )
    regiao_mais_fraca = (
        com_votos[-1]["properties"].get("nome_regiao") if len(com_votos) >= 6 else None
    )

    return {
        "candidato_id":      None,  # preenchido fora
        "candidato_nome":    cand_row.candidato_nome,
        "partido_numero":    int(cand_row.partido_numero) if cand_row.partido_numero else None,
        "partido_sigla":     cand_row.partido_sigla,
        "partido_cor":       get_cor_partido(cand_row.partido_numero),
        "cargo":             cand_row.cargo,
        "ano":               cand_row.ano,
        "nivel":             nivel,
        "uf":                cand_row.estado_uf,
        "municipio_ibge":    cand_row.municipio_ibge,
        "municipio_nome":    cand_row.municipio_nome,
        "total_features":   len(features),
        "total_votos":      int(total_votos),
        "fallback_aplicado": fallback_aplicado,
        "top_regiao":        top_regiao,
        "regiao_mais_fraca": regiao_mais_fraca,
    }


# ── 1. Mapa MUNICIPAL — distritos via spatial join ───────────────────────────


async def _gerar_municipal(db: AsyncSession, cand_row) -> Optional[dict]:
    """
    Reproduz a lógica de `/mapa/municipio/{ibge}/distritos?candidato_id=X`.
    Cada distrito IBGE recebe a soma dos votos das zonas cujos locais
    (lat/lng) caem dentro dele (ST_Within).

    Fallback: se o município não tem distritos cadastrados, sobe para o
    nível ESTADUAL (município inteiro pintado em mapa do estado).
    """
    if cand_row.municipio_id is None or cand_row.municipio_ibge is None:
        return await _gerar_estadual(db, cand_row)

    cd_mun = cand_row.municipio_ibge.zfill(7)
    cid = cand_row.candidatura_id

    # Conta distritos do município ANTES de fazer a query pesada
    cnt = await db.execute(text("""
        SELECT COUNT(*) FROM distritos_municipio WHERE cd_mun = :cd
    """), {"cd": cd_mun})
    n_distritos = cnt.scalar() or 0
    if n_distritos == 0:
        return await _gerar_estadual(db, cand_row, _fallback=True)

    result = await db.execute(text("""
        WITH zona_votos AS (
            SELECT
                ze.numero AS nr_zona,
                COALESCE(SUM(vpz.qt_votos), 0) AS votos
            FROM zonas_eleitorais ze
            LEFT JOIN votos_por_zona vpz
                   ON vpz.zona_id = ze.id
                  AND vpz.candidatura_id = :cid
            WHERE ze.municipio_id = :mid
            GROUP BY ze.numero
        ),
        zona_distrito AS (
            SELECT DISTINCT ON (lv.nr_zona)
                lv.nr_zona,
                d.cd_dist
            FROM locais_votacao lv
            JOIN distritos_municipio d
              ON ST_Within(
                    ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326),
                    d.geometry
                 )
            WHERE lv.municipio_id = :mid
              AND d.cd_mun = :cd_mun
              AND lv.latitude  IS NOT NULL
              AND lv.longitude IS NOT NULL
            ORDER BY lv.nr_zona
        ),
        distrito_agg AS (
            SELECT
                zd.cd_dist,
                COALESCE(SUM(zv.votos), 0) AS votos_total
            FROM zona_distrito zd
            JOIN zona_votos zv ON zv.nr_zona = zd.nr_zona
            GROUP BY zd.cd_dist
        )
        SELECT
            d.cd_dist,
            d.nm_dist,
            COALESCE(da.votos_total, 0) AS votos_total,
            ST_AsGeoJSON(
                ST_SimplifyPreserveTopology(d.geometry, 0.0005), 6
            )::json AS geom
        FROM distritos_municipio d
        LEFT JOIN distrito_agg da ON da.cd_dist = d.cd_dist
        WHERE d.cd_mun = :cd_mun
          AND d.geometry IS NOT NULL
        ORDER BY votos_total DESC
    """), {"mid": cand_row.municipio_id, "cd_mun": cd_mun, "cid": cid})

    rows = result.fetchall()
    if not rows:
        return await _gerar_estadual(db, cand_row, _fallback=True)

    features = []
    for r in rows:
        if not r.geom:
            continue
        features.append({
            "type": "Feature",
            "geometry": r.geom,
            "properties": {
                "nome_regiao":  r.nm_dist or "(sem nome)",
                "codigo_regiao": r.cd_dist,
                "votos_total":  int(r.votos_total or 0),
            },
        })

    if not features:
        return await _gerar_estadual(db, cand_row, _fallback=True)

    enriquecer_features_percentil(features, lambda p: float(p.get("votos_total") or 0))

    payload = {
        "type": "FeatureCollection",
        "features": features,
        "_meta": _build_meta(cand_row, nivel="bairros", features=features),
    }
    return payload


# ── 2. Mapa ESTADUAL — municípios do estado ──────────────────────────────────


async def _gerar_estadual(
    db: AsyncSession,
    cand_row,
    _fallback: bool = False,
) -> Optional[dict]:
    """
    Reproduz a lógica de `/mapa/geojson/{uf}?candidato_id=X` (branch
    `if candidato_id is not None`). Choropleth dos municípios do estado
    com soma de votos do candidato.

    Quando `_fallback=True`, indica que viemos do nível municipal por
    falta de distritos — marca no _meta para informar a UI.
    """
    if not cand_row.estado_uf:
        return None

    result = await db.execute(text("""
        WITH votos_mun AS (
            SELECT ze.municipio_id, SUM(vpz.qt_votos) AS votos
            FROM votos_por_zona vpz
            JOIN zonas_eleitorais ze ON ze.id = vpz.zona_id
            WHERE vpz.candidatura_id = :cid
            GROUP BY ze.municipio_id
        )
        SELECT
            m.codigo_ibge,
            m.nome,
            m.estado_uf,
            COALESCE(vm.votos, 0) AS votos_total,
            ST_AsGeoJSON(
                COALESCE(
                    m.geometry_estado,
                    ST_Multi(ST_SimplifyPreserveTopology(m.geometry, 0.001))
                ),
                4
            )::json AS geom
        FROM municipios m
        LEFT JOIN votos_mun vm ON vm.municipio_id = m.id
        WHERE m.estado_uf = :uf AND m.geometry IS NOT NULL
        ORDER BY votos_total DESC
    """), {"cid": cand_row.candidatura_id, "uf": cand_row.estado_uf.upper()})

    rows = result.fetchall()
    if not rows:
        return None

    features = []
    for r in rows:
        if not r.geom:
            continue
        features.append({
            "type": "Feature",
            "geometry": r.geom,
            "properties": {
                "nome_regiao":   r.nome,
                "codigo_regiao": r.codigo_ibge,
                "votos_total":   int(r.votos_total or 0),
            },
        })

    if not features:
        return None

    enriquecer_features_percentil(
        features, lambda p: float(p.get("votos_total") or 0),
    )

    nivel = "municipios" if not _fallback else "municipios_fallback"
    payload = {
        "type": "FeatureCollection",
        "features": features,
        "_meta": _build_meta(cand_row, nivel=nivel, features=features, fallback_aplicado=_fallback),
    }
    return payload


# ── 3. Mapa NACIONAL — 27 estados ────────────────────────────────────────────


async def _gerar_nacional(db: AsyncSession, cand_row) -> Optional[dict]:
    """
    Reproduz a lógica de `/mapa/geojson/brasil?candidato_id=X`. Choropleth
    dos 27 estados com soma de votos do candidato.
    """
    cid = cand_row.candidatura_id

    result = await db.execute(text("""
        WITH votos_estado AS (
            SELECT m.estado_uf, SUM(vpz.qt_votos) AS votos
            FROM votos_por_zona vpz
            JOIN zonas_eleitorais ze ON ze.id = vpz.zona_id
            JOIN municipios m ON m.id = ze.municipio_id
            WHERE vpz.candidatura_id = :cid
            GROUP BY m.estado_uf
        )
        SELECT
            eg.estado_uf,
            COALESCE(ve.votos, 0) AS votos_total,
            ST_AsGeoJSON(eg.geometry, 4)::json AS geom
        FROM estados_geometria eg
        LEFT JOIN votos_estado ve ON ve.estado_uf = eg.estado_uf
        ORDER BY votos_total DESC
    """), {"cid": cid})

    rows = result.fetchall()
    if not rows:
        return None

    features = []
    for r in rows:
        if not r.geom:
            continue
        features.append({
            "type": "Feature",
            "geometry": r.geom,
            "properties": {
                "nome_regiao":   r.estado_uf,
                "codigo_regiao": r.estado_uf,
                "votos_total":   int(r.votos_total or 0),
            },
        })

    if not features:
        return None

    enriquecer_features_percentil(
        features, lambda p: float(p.get("votos_total") or 0),
    )

    payload = {
        "type": "FeatureCollection",
        "features": features,
        "_meta": _build_meta(cand_row, nivel="estados", features=features),
    }
    return payload
