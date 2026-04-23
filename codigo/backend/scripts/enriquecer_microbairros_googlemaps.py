"""
Pipeline de enriquecimento de polígonos de microbairros via Google Maps + OSM Nominatim.

Estratégia (em ordem):
  1. OSM Nominatim (gratuito, sem scraping, 1 req/s)
  2. Google Maps Playwright (headless=False na 1a execucao p/ debug, headless=True no cron)
  3. Setores censitários IBGE (fallback PostGIS)

Rate limit:
  - Google Maps: 5 bairros/dia, 60s de espera entre cada busca
  - Nominatim: 1 req/s com User-Agent correto
  - A ordem acima evita bater no Google se OSM já resolver

Saída:
  - Salva resultado em polygon_google (nova coluna GEOMETRY) + polygon_google_fonte (text) + polygon_google_at (timestamptz)
  - Se nenhuma fonte funcionar, grava polygon_google = NULL e loga

Screenshots de validação (--screenshots):
  - Gera imagem do polígono no mapa do Playwright
  - Salva em /tmp/microbairros_{nome_normalizado}.png

Como rodar (container):
  # 1a vez — modo debug visual (headless=False):
  docker exec -e DISPLAY=:0 ub_backend python -m scripts.enriquecer_microbairros_googlemaps \\
      --limite=5 --debug

  # Modo automático (cron):
  docker exec ub_backend python -m scripts.enriquecer_microbairros_googlemaps --limite=5

  # Forçar lista específica de nomes:
  docker exec ub_backend python -m scripts.enriquecer_microbairros_googlemaps \\
      --nomes "Morro Grande,Vila Iara,Paulistano,Taipas,Vila Rica"

  # Gerar screenshots:
  docker exec ub_backend python -m scripts.enriquecer_microbairros_googlemaps \\
      --limite=5 --screenshots

Cron sugerido (2h manhã, 5 bairros/dia = ~150/mês):
  0 2 * * * docker exec ub_backend python -m scripts.enriquecer_microbairros_googlemaps --limite=5

AVISO: NÃO aumentar --limite além de 10 por rodada — risco de bloqueio Google Maps.
"""
from __future__ import annotations

import argparse
import json
import logging
import math
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Optional

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("ERRO: psycopg2 nao encontrado.", file=sys.stderr)
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("microbairros_googlemaps")

# ---------------------------------------------------------------------------
# Configurações
# ---------------------------------------------------------------------------

SP_BOUNDS = {
    "min_lon": -46.83, "max_lon": -46.36,
    "min_lat": -23.80, "max_lat": -23.36,
}

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "uniao-brasil-etl/1.0 (contato@uniaobrasil.org.br)"

# Diretório para screenshots
SCREENSHOTS_DIR = "/tmp"

# ---------------------------------------------------------------------------
# Banco de dados
# ---------------------------------------------------------------------------


def get_db_conn():
    database_url = os.environ.get("DATABASE_URL", "")
    if database_url:
        database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
        database_url = database_url.replace("postgresql+psycopg2://", "postgresql://")
        return psycopg2.connect(database_url)
    host = os.environ.get("POSTGRES_HOST", "localhost")
    port = os.environ.get("POSTGRES_PORT", "5432")
    db   = os.environ.get("POSTGRES_DB", "uniao_brasil")
    user = os.environ.get("POSTGRES_USER", "postgres")
    pwd  = os.environ.get("POSTGRES_PASSWORD", "postgres")
    return psycopg2.connect(host=host, port=port, dbname=db, user=user, password=pwd)


def garantir_colunas_google(conn):
    """Cria colunas polygon_google, polygon_google_fonte, polygon_google_at se não existirem."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'microbairros'
              AND column_name IN ('polygon_google', 'polygon_google_fonte', 'polygon_google_at')
        """)
        existentes = {row[0] for row in cur.fetchall()}

        if "polygon_google" not in existentes:
            log.info("Criando coluna polygon_google...")
            cur.execute("""
                ALTER TABLE microbairros
                ADD COLUMN polygon_google geometry(MultiPolygon, 4326)
            """)

        if "polygon_google_fonte" not in existentes:
            log.info("Criando coluna polygon_google_fonte...")
            cur.execute("""
                ALTER TABLE microbairros
                ADD COLUMN polygon_google_fonte text
            """)

        if "polygon_google_at" not in existentes:
            log.info("Criando coluna polygon_google_at...")
            cur.execute("""
                ALTER TABLE microbairros
                ADD COLUMN polygon_google_at timestamptz
            """)

    conn.commit()
    log.info("Colunas polygon_google verificadas/criadas.")


# ---------------------------------------------------------------------------
# Auditoria de cobertura
# ---------------------------------------------------------------------------


def auditoria_cobertura(conn) -> dict:
    """
    Retorna contagens de cobertura por tipo de polígono.
    Categorias:
      - bom: polygon_final IS NOT NULL OU (polygon_censitario + area_km2 > 0.0001)
             OU osm_polygon com ST_NPoints >= 20
      - medio: polygon_censitario IS NOT NULL mas pequeno (< 0.0001 km²)
               OU polygon_voronoi IS NOT NULL
      - ruim: só ponto (sem polígono real)
      - sem_nome: nome é NULL ou inválido
    """
    with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
        cur.execute("""
            SELECT
                uf,
                COUNT(*) FILTER (
                    WHERE polygon_final IS NOT NULL
                       OR (polygon_censitario IS NOT NULL AND area_km2 > 0.0001)
                       OR (osm_polygon IS NOT NULL AND ST_NPoints(osm_polygon) >= 20)
                ) AS poligono_bom,
                COUNT(*) FILTER (
                    WHERE (polygon_censitario IS NOT NULL AND (area_km2 IS NULL OR area_km2 <= 0.0001))
                       AND polygon_final IS NULL
                       AND (osm_polygon IS NULL OR ST_NPoints(osm_polygon) < 20)
                ) AS poligono_medio,
                COUNT(*) FILTER (
                    WHERE polygon_final IS NULL
                      AND polygon_censitario IS NULL
                      AND osm_polygon IS NULL
                      AND polygon_voronoi IS NOT NULL
                ) AS so_voronoi,
                COUNT(*) FILTER (
                    WHERE polygon_final IS NULL
                      AND polygon_censitario IS NULL
                      AND osm_polygon IS NULL
                      AND polygon_voronoi IS NULL
                ) AS so_ponto,
                COUNT(*) FILTER (
                    WHERE nome IS NULL OR nome = '' OR nome ILIKE 'microbairro%%'
                ) AS sem_nome,
                COUNT(*) AS total
            FROM microbairros
            WHERE uf IN ('SP', 'RJ', 'MG')
              AND cidade IN ('São Paulo', 'Rio de Janeiro', 'Belo Horizonte')
            GROUP BY uf
            ORDER BY total DESC
        """)
        rows = cur.fetchall()

    return {row["uf"]: dict(row) for row in rows}


# ---------------------------------------------------------------------------
# Fonte 1: OSM Nominatim
# ---------------------------------------------------------------------------


def buscar_nominatim(nome: str, cidade: str = "São Paulo", uf: str = "SP") -> Optional[str]:
    """Busca polígono via OSM Nominatim. Retorna GeoJSON geometry string ou None."""
    params = urllib.parse.urlencode({
        "q": f"{nome}, {cidade}, {uf}, Brasil",
        "format": "geojson",
        "polygon_geojson": "1",
        "limit": "3",
        "addressdetails": "1",
        "countrycodes": "br",
    })
    url = f"{NOMINATIM_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        log.debug(f"Nominatim erro para '{nome}': {e}")
        return None

    if not data or "features" not in data:
        return None

    for feature in data["features"]:
        geom = feature.get("geometry", {})
        geom_type = geom.get("type", "")
        if geom_type not in ("Polygon", "MultiPolygon"):
            continue

        # Validar que está dentro dos bounds esperados
        coords_flat = []
        if geom_type == "Polygon":
            coords_flat = geom.get("coordinates", [[]])[0]
        elif geom_type == "MultiPolygon":
            coords_flat = geom.get("coordinates", [[[[]]]])[0][0]

        if coords_flat:
            lons = [c[0] for c in coords_flat if len(c) >= 2]
            lats = [c[1] for c in coords_flat if len(c) >= 2]
            if lons and lats:
                centro_lon = sum(lons) / len(lons)
                centro_lat = sum(lats) / len(lats)
                # Bounds SP (default) — outros municípios usam bounds mais frouxos
                if uf == "SP" and cidade == "São Paulo":
                    if not (SP_BOUNDS["min_lat"] <= centro_lat <= SP_BOUNDS["max_lat"] and
                            SP_BOUNDS["min_lon"] <= centro_lon <= SP_BOUNDS["max_lon"]):
                        log.debug(f"Nominatim: '{nome}' fora de SP ({centro_lat:.4f}, {centro_lon:.4f})")
                        continue

        return json.dumps(geom)

    return None


# ---------------------------------------------------------------------------
# Fonte 2: Google Maps via Playwright
# ---------------------------------------------------------------------------


def _normalizar_filename(nome: str) -> str:
    """Converte nome para snake_case ASCII para usar em nome de arquivo."""
    nfkd = unicodedata.normalize("NFKD", nome)
    ascii_str = "".join(c for c in nfkd if not unicodedata.combining(c))
    ascii_str = ascii_str.lower()
    ascii_str = re.sub(r"[^a-z0-9]+", "_", ascii_str)
    return ascii_str.strip("_")


def _pixel_to_latlng(
    px: float, py: float,
    viewport_w: int, viewport_h: int,
    center_lat: float, center_lng: float,
    zoom: float,
) -> tuple[float, float]:
    """
    Converte pixel (x,y) do screenshot em lat/lng usando projeção Web Mercator.
    Google Maps usa tiles 256x256 com EPSG:3857.
    Retorna (lat, lng).
    """
    world_size = 256 * (2 ** zoom)
    center_px = (center_lng + 180) / 360 * world_size
    center_py = (
        (1 - math.log(
            math.tan(math.radians(center_lat)) + 1 / math.cos(math.radians(center_lat))
        ) / math.pi) / 2 * world_size
    )
    target_px = center_px + (px - viewport_w / 2)
    target_py = center_py + (py - viewport_h / 2)
    lng = target_px / world_size * 360 - 180
    n = math.pi - 2 * math.pi * target_py / world_size
    lat = math.degrees(math.atan(0.5 * (math.exp(n) - math.exp(-n))))
    return lat, lng


def _extrair_poligono_cv(
    screenshot_bytes: bytes,
    viewport_w: int,
    viewport_h: int,
    center_lat: float,
    center_lng: float,
    zoom: float,
    sidebar_w: int = 0,
    topbar_h: int = 80,
    debug_path: Optional[str] = None,
) -> Optional[list]:
    """
    Extrai polígono do bairro de um screenshot do Google Maps via Computer Vision.

    O stroke do polígono tem cor #EA4335 (Google Red).
    Em HSV (OpenCV 0-180): Hue=2, Sat~197, Val~234.
    Estratégia:
      1. Mask HSV para vermelho puro (Hue 0-8, Sat>140, Val>150)
      2. Dilate agressivo para conectar os pontos pontilhados
      3. findContours -> maior contorno = polígono do bairro
      4. approxPolyDP para simplificar
      5. pixel -> lat/lng via Web Mercator

    Retorna lista de [lng, lat] ou None se falhar.
    """
    try:
        import cv2
        import numpy as np
    except ImportError:
        log.error("opencv-python-headless não instalado. Execute: pip install opencv-python-headless numpy")
        return None

    img = cv2.imdecode(np.frombuffer(screenshot_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        log.warning("  [CV] Falha ao decodificar screenshot")
        return None

    h, w = img.shape[:2]

    # Recortar area do mapa (excluir sidebar esquerda e topbar)
    map_y_start = topbar_h
    map_y_end = h - 20  # remover rodapé
    map_x_start = sidebar_w
    map_x_end = w

    map_roi = img[map_y_start:map_y_end, map_x_start:map_x_end]
    if map_roi.size == 0:
        log.warning("  [CV] ROI do mapa vazia")
        return None

    # Mask para cor #EA4335 (Google Red) em HSV
    # Hue OpenCV: ~2 (vermelho puro, escala 0-180)
    hsv_roi = cv2.cvtColor(map_roi, cv2.COLOR_BGR2HSV)
    mask1 = cv2.inRange(hsv_roi, np.array([0, 140, 150]), np.array([8, 255, 255]))
    mask2 = cv2.inRange(hsv_roi, np.array([172, 140, 150]), np.array([180, 255, 255]))
    mask = cv2.bitwise_or(mask1, mask2)

    n_red = int(np.count_nonzero(mask))
    log.info(f"  [CV] Pixels vermelhos (#EA4335) encontrados: {n_red}")
    if n_red < 30:
        log.warning(f"  [CV] Pixels insuficientes ({n_red}) - polígono provavelmente não carregou")
        return None

    # Dilate para conectar o traço pontilhado
    kernel = np.ones((7, 7), np.uint8)
    dilated = cv2.dilate(mask, kernel, iterations=6)

    # Encontrar contornos externos
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        log.warning("  [CV] Nenhum contorno encontrado")
        return None

    # Filtrar: ignorar contornos muito pequenos ou muito finos (ruas, labels, UI)
    # Manter apenas contornos com area > 3000 e aspect ratio razoável (0.2 - 5.0)
    candidatos = []
    for c in contours:
        area = cv2.contourArea(c)
        if area < 3000:
            continue
        x, y, bw, bh = cv2.boundingRect(c)
        if bh == 0:
            continue
        aspect = bw / bh
        if aspect < 0.15 or aspect > 6.0:
            continue  # muito fino = rua/label, nao bairro
        candidatos.append(c)

    if not candidatos:
        # Fallback: pegar o maior contorno sem filtro
        candidatos = sorted(contours, key=cv2.contourArea, reverse=True)[:1]

    # Escolher o candidato mais próximo do centro do mapa
    mapa_cx = (map_x_end - map_x_start) / 2
    mapa_cy = (map_y_end - map_y_start) / 2
    melhor = None
    menor_dist = float("inf")
    for c in candidatos:
        M = cv2.moments(c)
        if M["m00"] <= 0:
            continue
        cx = M["m10"] / M["m00"]
        cy = M["m01"] / M["m00"]
        dist = ((cx - mapa_cx) ** 2 + (cy - mapa_cy) ** 2) ** 0.5
        if dist < menor_dist:
            menor_dist = dist
            melhor = c

    if melhor is None:
        log.warning("  [CV] Nenhum contorno candidato válido")
        return None

    area_px = cv2.contourArea(melhor)
    peri = cv2.arcLength(melhor, True)
    log.info(f"  [CV] Contorno selecionado: area_px={area_px:.0f} peri={peri:.0f} pts={len(melhor)}")

    if area_px < 3000:
        log.warning(f"  [CV] Contorno muito pequeno (area_px={area_px:.0f}), descartando")
        return None

    # Simplificar para ~20-50 pontos
    epsilon = 0.005 * peri
    approx = cv2.approxPolyDP(melhor, epsilon, True)
    log.info(f"  [CV] approxPolyDP: {len(approx)} pontos")

    if len(approx) < 4:
        log.warning(f"  [CV] Polígono degenerado ({len(approx)} pontos)")
        return None

    # Converter pixels (ROI) -> pixels (imagem completa) -> lat/lng
    coords_lnglat = []
    for pt in approx:
        # Coordenadas na imagem completa
        px = pt[0][0] + map_x_start
        py = pt[0][1] + map_y_start
        lat, lng = _pixel_to_latlng(px, py, viewport_w, viewport_h, center_lat, center_lng, zoom)
        coords_lnglat.append([round(lng, 6), round(lat, 6)])

    # Fechar o ring GeoJSON
    if coords_lnglat[0] != coords_lnglat[-1]:
        coords_lnglat.append(coords_lnglat[0])

    # Salvar debug se solicitado
    if debug_path:
        viz = img.copy()
        approx_full = approx.copy()
        approx_full[:, :, 0] += map_x_start
        approx_full[:, :, 1] += map_y_start
        cv2.drawContours(viz, [approx_full], -1, (0, 255, 0), 3)
        for pt in approx_full:
            cv2.circle(viz, (pt[0][0], pt[0][1]), 5, (255, 0, 0), -1)
        cv2.imwrite(debug_path, viz)
        log.info(f"  [CV] Debug salvo: {debug_path}")

    return coords_lnglat


def buscar_google_maps(
    nome: str,
    cidade: str = "São Paulo",
    uf: str = "SP",
    headless: bool = True,
    screenshot_path: Optional[str] = None,
    hint_lat: Optional[float] = None,
    hint_lng: Optional[float] = None,
) -> Optional[str]:
    """
    Busca polígono REAL do bairro no Google Maps via Playwright + Computer Vision.

    Estratégia:
      1. Abre Google Maps com query "qual o tamanho do bairro {nome} - {cidade}"
         (essa query renderiza o polígono vermelho #EA4335 ao redor da área)
      2. Aguarda tiles carregarem (NÃO bloqueia PNG pois as tiles incluem o polígono)
      3. Extrai centro/zoom da URL final
      4. Tira screenshot e aplica CV:
         - Mask HSV para #EA4335 (Google Red, Hue 0-8, Sat>140, Val>150)
         - Dilate para conectar traços pontilhados
         - findContours + approxPolyDP
         - Converte pixels -> lat/lng via Web Mercator
      5. Fallback: se CV falhar, usa bounding box do centro

    Retorna GeoJSON geometry (Polygon real ou bbox fallback) ou None.
    """
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    except ImportError:
        log.error("Playwright não instalado. Execute: pip install playwright && playwright install chromium")
        return None

    VIEWPORT_W, VIEWPORT_H = 1440, 900

    # Query que faz o Google Maps renderizar o polígono vermelho do bairro
    query_str = f"qual o tamanho do bairro {nome} - {cidade}"
    query = urllib.parse.quote(query_str)
    url = f"https://www.google.com/maps/search/{query}"

    log.info(f"  [Google Maps] Abrindo: {url}")

    geojson_str = None

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=headless,
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-extensions",
                "--disable-dev-shm-usage",
            ],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            viewport={"width": VIEWPORT_W, "height": VIEWPORT_H},
            locale="pt-BR",
        )
        page = context.new_page()

        # IMPORTANTE: NAO bloquear PNG/tiles pois as tiles incluem o poligono renderizado
        # Apenas bloquear recursos que nao afetam o poligono (videos, fontes pesadas)
        page.route("**/*.{mp4,woff2,woff,ttf,otf}", lambda route: route.abort())

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45_000)
            # Aguarda o Google Maps navegar para a URL com @lat,lng,zoom
            # O Maps faz redirect JS para a URL com coordenadas após carregar
            for _wait_i in range(15):
                time.sleep(2)
                current_url = page.url
                if re.search(r"@-?\d+\.\d+,-?\d+\.\d+,\d+", current_url):
                    log.info(f"  [Google Maps] URL com coords após {(_wait_i+1)*2}s")
                    break
                if _wait_i == 14:
                    log.info(f"  [Google Maps] URL sem coords após 30s")

            current_url = page.url
            log.info(f"  [Google Maps] URL final: {current_url[:140]}")

            # Extrair centro e zoom da URL
            lat_center: Optional[float] = None
            lon_center: Optional[float] = None
            zoom_val: Optional[float] = None

            match_center = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+),(\d+(?:\.\d+)?)z", current_url)
            if match_center:
                lat_center = float(match_center.group(1))
                lon_center = float(match_center.group(2))
                zoom_val = float(match_center.group(3))
                log.info(f"  [Google Maps] Centro: lat={lat_center}, lon={lon_center}, zoom={zoom_val}")

            # Coords alternativas via parâmetros data
            if lat_center is None:
                match_coords = re.findall(r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)", current_url)
                if match_coords:
                    lat_center = float(match_coords[0][0])
                    lon_center = float(match_coords[0][1])
                    zoom_val = 16.0  # zoom default
                    log.info(f"  [Google Maps] Coords via data param: lat={lat_center}, lon={lon_center}")

            if lat_center is None or lon_center is None:
                # Tentar usar hint do banco (here_lat/here_lng) como fallback
                if hint_lat is not None and hint_lng is not None:
                    lat_center = hint_lat
                    lon_center = hint_lng
                    zoom_val = zoom_val or 16.0  # zoom=16 é o padrão do Maps para bairros em SP
                    log.info(f"  [Google Maps] Usando hint de coords: lat={lat_center}, lon={lon_center}")
                else:
                    log.warning(f"  [Google Maps] Sem coordenadas para '{nome}' - sem hint disponível")

            if lat_center is not None and lon_center is not None:
                # Validar bounds
                if uf == "SP" and cidade == "São Paulo":
                    if not (SP_BOUNDS["min_lat"] <= lat_center <= SP_BOUNDS["max_lat"] and
                            SP_BOUNDS["min_lon"] <= lon_center <= SP_BOUNDS["max_lon"]):
                        log.warning(f"  [Google Maps] Resultado fora de SP: lat={lat_center}, lon={lon_center}")
                        lat_center = None  # invalida para pular restante

            # Screenshot (sem full_page pois tiles são lazy-loaded por viewport)
            screenshot_bytes = page.screenshot(full_page=False)

            # Salvar screenshot se solicitado
            if screenshot_path:
                with open(screenshot_path, "wb") as f:
                    f.write(screenshot_bytes)
                log.info(f"  [Google Maps] Screenshot salvo: {screenshot_path}")

            # Sem coordenadas: nao há como converter pixels em lat/lng
            if lat_center is None or lon_center is None:
                pass  # geojson_str permanece None

            else:
                # --- Computer Vision: extrair polígono real ---
                debug_cv_path = None
                if screenshot_path:
                    base = screenshot_path.replace(".png", "")
                    debug_cv_path = f"{base}_cv_debug.png"

                coords = _extrair_poligono_cv(
                    screenshot_bytes=screenshot_bytes,
                    viewport_w=VIEWPORT_W,
                    viewport_h=VIEWPORT_H,
                    center_lat=lat_center,
                    center_lng=lon_center,
                    zoom=zoom_val,
                    sidebar_w=0,
                    topbar_h=80,
                    debug_path=debug_cv_path,
                )

                if coords and len(coords) >= 5:
                    lats_c = [c[1] for c in coords]
                    avg_lat = sum(lats_c) / len(lats_c)
                    lat_km = 111.0
                    lng_km = 111.0 * math.cos(math.radians(avg_lat))
                    area_sh = 0.0
                    n_c = len(coords)
                    for i_c in range(n_c):
                        j_c = (i_c + 1) % n_c
                        x1 = coords[i_c][0] * lng_km
                        y1 = coords[i_c][1] * lat_km
                        x2 = coords[j_c][0] * lng_km
                        y2 = coords[j_c][1] * lat_km
                        area_sh += x1 * y2 - x2 * y1
                    area_km2 = abs(area_sh) / 2

                    log.info(f"  [CV] Polígono: {len(coords)} pts, área={area_km2:.4f} km²")

                    if 0.001 <= area_km2 <= 15.0:
                        geojson_poly = {
                            "type": "Polygon",
                            "coordinates": [coords],
                        }
                        geojson_str = json.dumps(geojson_poly)
                        log.info(f"  [CV] Polígono CV aceito para '{nome}'")
                    else:
                        log.warning(
                            f"  [CV] Área fora do range ({area_km2:.4f} km²), descartando CV. "
                            f"Usando bbox fallback."
                        )

                if geojson_str is None:
                    # Fallback: bounding box do centro
                    log.info(f"  [Google Maps] Usando bbox fallback para '{nome}'")
                    offset_lat = 0.003
                    offset_lon = 0.004
                    bbox_polygon = {
                        "type": "Polygon",
                        "coordinates": [[
                            [lon_center - offset_lon, lat_center - offset_lat],
                            [lon_center + offset_lon, lat_center - offset_lat],
                            [lon_center + offset_lon, lat_center + offset_lat],
                            [lon_center - offset_lon, lat_center + offset_lat],
                            [lon_center - offset_lon, lat_center - offset_lat],
                        ]]
                    }
                    geojson_str = json.dumps(bbox_polygon)
                    log.info(f"  [Google Maps] Bbox gerada: centro ({lat_center}, {lon_center})")

        except PWTimeout:
            log.warning(f"  [Google Maps] Timeout ao carregar '{nome}'")
        except Exception as e:
            log.error(f"  [Google Maps] Erro inesperado para '{nome}': {e}")
        finally:
            context.close()
            browser.close()

    return geojson_str


# ---------------------------------------------------------------------------
# Fonte 3: IBGE setores (fallback PostGIS)
# ---------------------------------------------------------------------------


def buscar_ibge_setores(conn, mb_id: int) -> Optional[str]:
    """
    Agrega setores censitários que intersectam o polygon_voronoi do microbairro.
    Requer que polygon_voronoi exista.
    """
    with conn.cursor() as cur:
        cur.execute("""
            SELECT ST_AsGeoJSON(
                ST_Multi(
                    ST_SimplifyPreserveTopology(
                        ST_Union(s.geometry),
                        0.00002
                    )
                )
            ) AS geojson
            FROM setores_censitarios s
            JOIN microbairros m ON ST_Intersects(s.geometry, m.polygon_voronoi)
            WHERE m.id = %s
            GROUP BY m.id
            HAVING ST_Area(ST_Union(s.geometry)) > 0
        """, (mb_id,))
        row = cur.fetchone()
        if row and row[0]:
            return row[0]
    return None


# ---------------------------------------------------------------------------
# Loop principal
# ---------------------------------------------------------------------------


def processar_lote(
    conn,
    limite: int,
    nomes_forçados: Optional[list[str]],
    headless: bool,
    gerar_screenshots: bool,
) -> dict:
    stats = {
        "processados": 0, "via_nominatim": 0,
        "via_google_cv": 0, "via_google_bbox": 0,
        "via_ibge": 0, "erros": 0,
    }

    with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
        if nomes_forçados:
            # Busca por lista de nomes explícita
            placeholders = ",".join(["%s"] * len(nomes_forçados))
            cur.execute(f"""
                SELECT id, nome, nome_padronizado, here_lat, here_lng, cidade, uf
                FROM microbairros
                WHERE nome = ANY(ARRAY[{placeholders}])
                  AND uf = 'SP' AND cidade = 'São Paulo'
                ORDER BY nome
            """, nomes_forçados)
        else:
            # Prioriza bairros sem polygon_google ainda, priorizando SP capital
            cur.execute("""
                SELECT id, nome, nome_padronizado, here_lat, here_lng, cidade, uf
                FROM microbairros
                WHERE polygon_google IS NULL
                  AND uf = 'SP' AND cidade = 'São Paulo'
                  AND status IN ('here_ok', 'osm_ok', 'censitaria_ok')
                  AND nome IS NOT NULL AND nome != ''
                ORDER BY
                    (polygon_final IS NULL AND polygon_censitario IS NULL) DESC,
                    id
                LIMIT %s
            """, (limite,))

        rows = cur.fetchall()

    if not rows:
        log.info("Nenhum microbairro pendente encontrado.")
        return stats

    log.info(f"Processando {len(rows)} microbairros...")
    agora = datetime.now(timezone.utc)

    for i, row in enumerate(rows, 1):
        mb_id    = row["id"]
        nome     = row["nome"]
        cidade   = row["cidade"] or "São Paulo"
        uf       = row["uf"] or "SP"
        here_lat = float(row["here_lat"]) if row["here_lat"] is not None else None
        here_lng = float(row["here_lng"]) if row["here_lng"] is not None else None

        log.info(f"\n[{i}/{len(rows)}] ID {mb_id} — '{nome}' ({cidade}/{uf})")

        geojson_str: Optional[str] = None
        fonte: Optional[str] = None

        # --- Passo 1: OSM Nominatim (gratuito, sem risco de bloqueio) ---
        log.info(f"  Tentando OSM Nominatim...")
        geojson_str = buscar_nominatim(nome, cidade, uf)
        time.sleep(1.1)  # Rate limit Nominatim: máx 1 req/s
        if geojson_str:
            fonte = "nominatim"
            log.info(f"  -> OK via Nominatim")

        # --- Passo 2: Google Maps via Playwright ---
        if geojson_str is None:
            log.info(f"  Nominatim falhou. Tentando Google Maps (aguardando 3s)...")
            time.sleep(3)  # Pausa extra antes do Google

            screenshot_path = None
            if gerar_screenshots:
                nome_file = _normalizar_filename(nome)
                screenshot_path = os.path.join(SCREENSHOTS_DIR, f"microbairros_{nome_file}.png")

            geojson_str = buscar_google_maps(
                nome, cidade, uf,
                headless=headless,
                screenshot_path=screenshot_path,
                hint_lat=here_lat,
                hint_lng=here_lng,
            )
            if geojson_str:
                # Detectar se foi polígono real (CV) ou bbox fallback (5 pontos = retângulo)
                try:
                    _gj = json.loads(geojson_str)
                    _coords = _gj.get("coordinates", [[]])[0]
                    if len(_coords) > 6:
                        fonte = "google_cv"
                        log.info(f"  -> OK via Google Maps (Computer Vision, {len(_coords)} pts)")
                    else:
                        fonte = "google_bbox"
                        log.info(f"  -> OK via Google Maps (bbox fallback)")
                except Exception:
                    fonte = "google_bbox"

            # Pausa pós-Google (rate limit crítico)
            log.info(f"  Aguardando 60s (rate limit Google Maps)...")
            time.sleep(60)

        # --- Passo 3: IBGE setores (fallback PostGIS) ---
        if geojson_str is None:
            log.info(f"  Tentando IBGE setores censitários...")
            geojson_str = buscar_ibge_setores(conn, mb_id)
            if geojson_str:
                fonte = "ibge_setores"
                log.info(f"  -> OK via IBGE setores")

        # --- Persistência ---
        if geojson_str is None:
            log.warning(f"  FALHA TOTAL para '{nome}' — sem polígono em nenhuma fonte")
            # Marca como tentado (evitar re-processar indefinidamente)
            try:
                with conn.cursor() as cur_w:
                    cur_w.execute("""
                        UPDATE microbairros
                        SET polygon_google_fonte = 'sem_poligono',
                            polygon_google_at = %s
                        WHERE id = %s
                    """, (agora, mb_id))
                conn.commit()
            except Exception as e:
                conn.rollback()
                log.error(f"  Erro gravando 'sem_poligono' para ID {mb_id}: {e}")
            stats["erros"] += 1
            continue

        # Valida tamanho mínimo do polígono antes de gravar
        try:
            geom_dict = json.loads(geojson_str)
            coords = []
            if geom_dict["type"] == "Polygon":
                coords = geom_dict["coordinates"][0]
            elif geom_dict["type"] == "MultiPolygon":
                coords = geom_dict["coordinates"][0][0]
            if len(coords) < 3:
                log.warning(f"  Polígono degenerado ({len(coords)} pontos) para '{nome}', ignorando")
                stats["erros"] += 1
                continue
        except Exception as e:
            log.warning(f"  Erro validando GeoJSON para '{nome}': {e}")
            stats["erros"] += 1
            continue

        try:
            with conn.cursor() as cur_w:
                cur_w.execute("""
                    UPDATE microbairros
                    SET polygon_google = ST_Multi(
                            ST_CollectionExtract(
                                ST_MakeValid(
                                    ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)
                                ),
                                3
                            )
                        ),
                        polygon_google_fonte = %s,
                        polygon_google_at = %s
                    WHERE id = %s
                """, (geojson_str, fonte, agora, mb_id))
            conn.commit()

            stats["processados"] += 1
            if fonte == "nominatim":        stats["via_nominatim"] += 1
            elif fonte == "google_cv":      stats["via_google_cv"] += 1
            elif fonte == "google_bbox":    stats["via_google_bbox"] += 1
            elif fonte == "ibge_setores":   stats["via_ibge"] += 1

            log.info(f"  GRAVADO ID {mb_id} '{nome}' -> {fonte}")

        except Exception as e:
            conn.rollback()
            log.error(f"  Erro gravando polígono ID {mb_id} '{nome}': {e}")
            stats["erros"] += 1

    return stats


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="Enriquece polígonos de microbairros via Google Maps + Nominatim + IBGE",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--limite", type=int, default=5,
        help="Número de microbairros a processar nesta rodada (default: 5, máx recomendado: 10)"
    )
    parser.add_argument(
        "--nomes", type=str, default=None,
        help='Lista de nomes separados por vírgula (ex: "Morro Grande,Vila Iara")'
    )
    parser.add_argument(
        "--debug", action="store_true",
        help="Modo debug: browser visível (headless=False) — requer DISPLAY"
    )
    parser.add_argument(
        "--screenshots", action="store_true",
        help="Salva screenshots em /tmp/microbairros_*.png para validação visual"
    )
    parser.add_argument(
        "--auditoria", action="store_true",
        help="Só imprime auditoria de cobertura e sai (não processa)"
    )
    args = parser.parse_args()

    if args.limite > 10:
        log.warning("⚠️  --limite > 10 aumenta risco de bloqueio Google Maps. Considere usar <= 10.")

    try:
        conn = get_db_conn()
    except Exception as e:
        log.error(f"Falha ao conectar ao banco: {e}")
        sys.exit(1)

    # Garantir colunas extras existem
    garantir_colunas_google(conn)

    # Modo auditoria
    if args.auditoria:
        log.info("\n" + "=" * 60)
        log.info("AUDITORIA DE COBERTURA DE POLÍGONOS")
        log.info("=" * 60)
        try:
            resultado = auditoria_cobertura(conn)
            for uf, dados in resultado.items():
                log.info(
                    f"\n{uf} — {dados.get('cidade', uf)} | total={dados['total']}\n"
                    f"  Bom (polygon_final ou censitário+área):  {dados['poligono_bom']}\n"
                    f"  Médio (censitário pequeno ou Voronoi):   {dados['poligono_medio']}\n"
                    f"  Só Voronoi (geometrico, sem dado real):  {dados['so_voronoi']}\n"
                    f"  Só ponto (sem nenhum polígono):          {dados['so_ponto']}\n"
                    f"  Sem nome:                                {dados['sem_nome']}"
                )
        except Exception as e:
            log.error(f"Erro na auditoria: {e}")
        conn.close()
        return

    nomes_lista = None
    if args.nomes:
        nomes_lista = [n.strip() for n in args.nomes.split(",") if n.strip()]
        log.info(f"Modo nomes explícitos: {nomes_lista}")

    headless = not args.debug

    log.info("=" * 60)
    log.info("PIPELINE MICROBAIRROS — GOOGLE MAPS + NOMINATIM + IBGE")
    log.info(f"Limite: {args.limite} | Debug: {args.debug} | Screenshots: {args.screenshots}")
    log.info("=" * 60)

    try:
        stats = processar_lote(
            conn,
            limite=args.limite,
            nomes_forçados=nomes_lista,
            headless=headless,
            gerar_screenshots=args.screenshots,
        )
    finally:
        conn.close()

    log.info("\n" + "=" * 60)
    log.info("RESULTADO FINAL")
    log.info("=" * 60)
    log.info(f"  Processados com sucesso: {stats['processados']}")
    log.info(f"  Via Nominatim:              {stats['via_nominatim']}")
    log.info(f"  Via Google Maps (CV real):  {stats['via_google_cv']}")
    log.info(f"  Via Google Maps (bbox):     {stats['via_google_bbox']}")
    log.info(f"  Via IBGE setores:           {stats['via_ibge']}")
    log.info(f"  Erros/sem polígono:         {stats['erros']}")
    log.info("")
    log.info("Cron sugerido (2h manhã, 5 bairros/dia):")
    log.info("  0 2 * * * docker exec ub_backend python -m scripts.enriquecer_microbairros_googlemaps --limite=5")

    sys.exit(0 if stats["erros"] == 0 else 1)


if __name__ == "__main__":
    main()
