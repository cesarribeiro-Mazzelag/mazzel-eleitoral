"""
Renderização de GeoJSON em PNG para o dossiê (PDF).

Recebe o payload do helper `mapa_candidato_geojson` e produz uma imagem
PNG choropleth limpa, sem títulos/legendas matplotlib (essas são responsabilidade
do PDF que embute a imagem).

Estilo:
    - Choropleth gradiente do branco → cor do partido baseado em nivel_farol (0-5)
    - Cinza claro (#E5E7EB) para regiões sem votos (nivel_farol == 0)
    - Borda fina cinza médio
    - Background transparente
    - DPI alto (180) para nitidez

Cache em memória por candidatura_id (mesmo sistema do helper). PNG fica
no payload `_render_cache` separado para não afetar a resposta JSON do endpoint.
"""
from __future__ import annotations

import base64
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)


# Cache em memória por candidatura_id (separado do cache GeoJSON)
_PNG_CACHE: dict[int, str] = {}
_CACHE_MAX = 200


def limpar_cache_png() -> None:
    _PNG_CACHE.clear()


def _hex_to_rgb(hex_str: str) -> tuple[float, float, float]:
    """#1A2B3C → (0.10, 0.17, 0.24) em escala 0-1."""
    h = hex_str.lstrip("#")
    return tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4))  # type: ignore


def _interpolar_branco_para_cor(
    cor_partido_rgb: tuple[float, float, float],
    nivel: int,
) -> tuple[float, float, float]:
    """
    nivel 1..5 → interpolação linear entre branco quase puro e cor pura
    do partido. nivel == 0 → cinza neutro (tratado fora).
    """
    if nivel <= 0:
        return (0.898, 0.906, 0.922)  # #E5E7EB
    # nivel 1 = 80% branco / 20% cor
    # nivel 5 = 0% branco / 100% cor
    fator = nivel / 5.0
    branco = (1.0, 1.0, 1.0)
    return tuple(
        branco[i] * (1 - fator) + cor_partido_rgb[i] * fator
        for i in range(3)
    )  # type: ignore


def renderizar_geojson_png(
    payload: dict,
    *,
    candidatura_id: int,
) -> Optional[str]:
    """
    Renderiza o FeatureCollection do helper em PNG choropleth e devolve
    um data URI base64. Cache em memória por candidatura_id.

    Espera:
        payload["features"] — list de Feature GeoJSON com properties.nivel_farol
        payload["_meta"]["partido_cor"] — cor hex do partido para o gradient

    Devolve None se renderização falhar (loga warning).
    """
    if candidatura_id in _PNG_CACHE:
        return _PNG_CACHE[candidatura_id]

    try:
        png_data_uri = _render_choropleth(payload)
    except Exception as e:  # noqa: BLE001
        logger.warning(
            "Falha ao renderizar PNG do mapa (candidatura %s): %s",
            candidatura_id, e,
        )
        return None

    if png_data_uri:
        if len(_PNG_CACHE) >= _CACHE_MAX:
            _PNG_CACHE.pop(next(iter(_PNG_CACHE)))
        _PNG_CACHE[candidatura_id] = png_data_uri
    return png_data_uri


def _render_choropleth(payload: dict) -> Optional[str]:
    import json
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from shapely.geometry import shape
    import geopandas as gpd

    features = payload.get("features", [])
    if not features:
        return None

    meta = payload.get("_meta", {})
    cor_partido_hex = meta.get("partido_cor", "#94A3B8")
    cor_partido_rgb = _hex_to_rgb(cor_partido_hex)

    gdf_data = []
    for f in features:
        geom_obj = f.get("geometry")
        if not geom_obj:
            continue
        # geometry pode vir como dict (GeoJSON nativo) ou string JSON
        if isinstance(geom_obj, str):
            geom_obj = json.loads(geom_obj)
        try:
            geom = shape(geom_obj)
        except Exception:
            continue
        nivel = int(f.get("properties", {}).get("nivel_farol") or 0)
        gdf_data.append({"geometry": geom, "nivel": nivel})

    if not gdf_data:
        return None

    gdf = gpd.GeoDataFrame(gdf_data, crs="EPSG:4326")
    gdf["cor"] = gdf["nivel"].apply(
        lambda n: _interpolar_branco_para_cor(cor_partido_rgb, n)
    )

    # Tamanho proporcional ao tipo de mapa (estado é mais alongado, brasil é mais largo)
    nivel_geo = meta.get("nivel", "bairros")
    if nivel_geo == "estados":
        figsize = (8, 7)
    elif "municipios" in nivel_geo:
        figsize = (8, 8)
    else:  # bairros
        figsize = (8, 8)

    fig, ax = plt.subplots(figsize=figsize, dpi=180)
    fig.patch.set_alpha(0)  # background transparente
    ax.set_facecolor("none")
    gdf.plot(
        ax=ax,
        color=gdf["cor"].tolist(),
        edgecolor="#475569",
        linewidth=0.35,
    )
    ax.set_axis_off()
    plt.tight_layout(pad=0)

    buf = io.BytesIO()
    fig.savefig(
        buf, format="png", dpi=180,
        bbox_inches="tight", pad_inches=0.05,
        transparent=True,
    )
    plt.close(fig)
    buf.seek(0)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"
