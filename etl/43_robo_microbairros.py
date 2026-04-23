"""ETL 43 — Robô descobridor de microbairros via HERE Maps + OSM Nominatim.

Para cada bairro popular cadastrado em microbairros.status='pendente':
  1. HERE Geocoding & Search (gratuito 250k req/mês) → centroide + bbox + hierarquia
  2. OSM Nominatim (gratuito) → polygon real quando existir mapeado

Resume automaticamente baseado em status. Pode parar (Ctrl-C) e retomar.

Setup (1x):
    1. https://developer.here.com/sign-up → cria conta
    2. Cria projeto, gera 'API Key' no painel (~50 chars)
    3. Exporta env var: export HERE_API_KEY="sua-key"

Uso:
    HERE_API_KEY=xxx python3 43_robo_microbairros.py
    HERE_API_KEY=xxx python3 43_robo_microbairros.py --limite 50  # teste curto
    HERE_API_KEY=xxx python3 43_robo_microbairros.py --reprocessar erro
    HERE_API_KEY=xxx python3 43_robo_microbairros.py --skip-osm  # só HERE
"""
from __future__ import annotations
import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine

HERE_BASE = "https://geocode.search.hereapi.com/v1/geocode"
NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search"

UA = {
    "User-Agent": "UniaoBrasil/1.0 (cesar@mazzelag.com) - robo-microbairros",
}

# Rate limits (segundos entre requests)
HERE_DELAY = 0.25   # 4 req/s — bem dentro do limite Freemium (5/s)
OSM_DELAY = 1.1     # Nominatim pede 1 req/s + margem


def query_here(api_key: str, bairro: str, cidade: str, uf: str) -> dict | None:
    qs = urllib.parse.urlencode({
        "q": f"{bairro}, {cidade}, {uf}, Brazil",
        "in": "countryCode:BRA",
        "lang": "pt-BR",
        "limit": 1,
        "apiKey": api_key,
    })
    url = f"{HERE_BASE}?{qs}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=15) as r:
            data = json.loads(r.read().decode())
        items = data.get("items", [])
        return items[0] if items else None
    except urllib.error.HTTPError as e:
        body = ""
        try: body = e.read().decode()[:200]
        except: pass
        raise RuntimeError(f"HERE HTTP {e.code}: {body}")


def query_osm(bairro: str, cidade: str, uf: str) -> dict | None:
    qs = urllib.parse.urlencode({
        "q": f"{bairro}, {cidade}, {uf}, Brazil",
        "format": "json",
        "polygon_geojson": 1,
        "limit": 1,
        "countrycodes": "br",
    })
    url = f"{NOMINATIM_BASE}?{qs}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=15) as r:
            rows = json.loads(r.read().decode())
        if not rows:
            return None
        # Só retorna se for polygon (Point não serve aqui — HERE já dá ponto melhor)
        gj = rows[0].get("geojson", {})
        if gj.get("type") not in ("Polygon", "MultiPolygon"):
            return None
        return rows[0]
    except urllib.error.HTTPError:
        return None
    except Exception:
        return None


def salvar_here(conn, mb_id: int, item: dict):
    pos = item.get("position", {})
    mv = item.get("mapView") or {}
    score = item.get("scoring", {}).get("queryScore")
    addr = item.get("address", {})
    # bbox: west, south, east, north → polygon retangular
    bbox_wkt = None
    if all(k in mv for k in ("west", "south", "east", "north")):
        w, s, e, n = mv["west"], mv["south"], mv["east"], mv["north"]
        bbox_wkt = f"POLYGON(({w} {s},{e} {s},{e} {n},{w} {n},{w} {s}))"
    conn.execute(text("""
        UPDATE microbairros SET
            here_lat = :lat, here_lng = :lng,
            here_bbox = CASE WHEN :bbox_wkt IS NULL THEN NULL
                             ELSE ST_GeomFromText(:bbox_wkt, 4326) END,
            here_hierarchy = CAST(:addr AS jsonb),
            here_score = :score,
            status = 'here_ok',
            captado_em = now(),
            erro_msg = NULL
        WHERE id = :id
    """), {
        "id": mb_id, "lat": pos.get("lat"), "lng": pos.get("lng"),
        "bbox_wkt": bbox_wkt,
        "addr": json.dumps(addr, ensure_ascii=False),
        "score": score,
    })


def salvar_osm(conn, mb_id: int, row: dict):
    from shapely.geometry import shape, MultiPolygon, Polygon
    geom = shape(row["geojson"])
    if isinstance(geom, Polygon):
        geom = MultiPolygon([geom])
    place_id = int(row.get("place_id") or 0)
    conn.execute(text("""
        UPDATE microbairros SET
            osm_polygon = ST_Multi(ST_GeomFromText(:wkt, 4326)),
            osm_place_id = :pid,
            status = 'osm_ok'
        WHERE id = :id
    """), {"id": mb_id, "wkt": geom.wkt, "pid": place_id})


def marcar_erro(conn, mb_id: int, msg: str):
    conn.execute(text("UPDATE microbairros SET status='erro', erro_msg=:m, captado_em=now() WHERE id=:id"),
                 {"id": mb_id, "m": msg[:500]})


def marcar_sem_match(conn, mb_id: int):
    conn.execute(text("UPDATE microbairros SET status='sem_match', captado_em=now() WHERE id=:id"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--uf", default=None, help="filtra UF (ex: SP)")
    ap.add_argument("--limite", type=int, default=None, help="máximo de bairros nesta rodada")
    ap.add_argument("--reprocessar", default=None,
                    help="status pra reprocessar (ex: erro). Default: pendente")
    ap.add_argument("--skip-osm", action="store_true", help="pular OSM (só HERE)")
    args = ap.parse_args()

    api_key = os.environ.get("HERE_API_KEY")
    if not api_key:
        print("ERRO: defina HERE_API_KEY no ambiente.")
        print("  export HERE_API_KEY='sua-key-de-https://developer.here.com'")
        sys.exit(1)

    status_alvo = args.reprocessar or "pendente"
    where_uf = "AND uf = :uf" if args.uf else ""
    limite = "LIMIT :lim" if args.limite else ""

    with engine.connect() as conn:
        rows = conn.execute(text(f"""
            SELECT id, nome, cidade, uf
            FROM microbairros
            WHERE status = :st {where_uf}
            ORDER BY uf, cidade, nome
            {limite}
        """), {"st": status_alvo, "uf": args.uf, "lim": args.limite}).fetchall()

    print(f"Processando {len(rows)} bairros (status={status_alvo}, uf={args.uf or 'TODOS'})")
    if not rows:
        return

    contadores = {"here_ok": 0, "osm_ok": 0, "erro": 0, "sem_match": 0}
    inicio = time.time()

    for i, mb in enumerate(rows, 1):
        try:
            item_here = query_here(api_key, mb.nome, mb.cidade, mb.uf)
            time.sleep(HERE_DELAY)
            if not item_here:
                with engine.begin() as conn:
                    marcar_sem_match(conn, mb.id)
                contadores["sem_match"] += 1
            else:
                with engine.begin() as conn:
                    salvar_here(conn, mb.id, item_here)
                contadores["here_ok"] += 1
                # Tentar OSM em paralelo se quer polígono real
                if not args.skip_osm:
                    osm = query_osm(mb.nome, mb.cidade, mb.uf)
                    time.sleep(OSM_DELAY)
                    if osm:
                        with engine.begin() as conn:
                            salvar_osm(conn, mb.id, osm)
                        contadores["osm_ok"] += 1
        except KeyboardInterrupt:
            print(f"\n[interrompido] processados {i}/{len(rows)}")
            break
        except Exception as e:
            with engine.begin() as conn:
                marcar_erro(conn, mb.id, f"{type(e).__name__}: {e}")
            contadores["erro"] += 1

        if i % 25 == 0 or i == len(rows):
            elapsed = time.time() - inicio
            taxa = i / elapsed if elapsed > 0 else 0
            eta_s = (len(rows) - i) / taxa if taxa > 0 else 0
            eta_min = eta_s / 60
            print(f"  [{i:5d}/{len(rows)}] here_ok={contadores['here_ok']} "
                  f"osm_ok={contadores['osm_ok']} sem_match={contadores['sem_match']} "
                  f"erro={contadores['erro']} | {taxa:.1f}/s eta={eta_min:.0f}min")

    print(f"\n══ RESUMO ══")
    for k, v in contadores.items():
        print(f"  {k:10s}: {v}")


if __name__ == "__main__":
    main()
