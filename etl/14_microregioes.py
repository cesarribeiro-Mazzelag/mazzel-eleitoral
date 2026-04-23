"""ETL: Geração de microregioes territoriais sólidas a partir dos setores IBGE."""
from __future__ import annotations
"""

Algoritmo (por município):

1. Para cada setor censitário, encontrar o "OSM dominante":
   - PREFERENCIAL: OSM (place=suburb|neighbourhood|quarter) cujo polígono
     CONTÉM o centróide do setor. Se múltiplos contêm, escolher o de
     menor área (mais específico).
   - FALLBACK 1: OSM Point mais próximo do centróide do setor (até 1km).
   - FALLBACK 2: cluster geográfico de setores adjacentes do mesmo
     distrito, sem nome OSM. Vira "Área sem nome — {distrito}".

2. Agrupar setores por (osm_dominante OU cluster_id), gerar microregião:
   - geometry = ST_Multi(ST_Union(setores))
   - nome = nome do OSM dominante OU "Área sem nome — {distrito}"
   - nome_padronizado = nome (admin pode editar depois)
   - nivel = 5 (subdistrito)

3. Balanceamento:
   - Microregiões com < 5 setores → tentar MERGE com vizinha mais próxima
     do mesmo distrito (que após merge fique <= 40 setores).
   - Microregiões com > 40 setores → SPLIT por k-means geográfico em
     subdivisões de ~25 setores cada.

4. Validação:
   - Cada setor com microregiao_id NÃO NULL.
   - Sem ST_Overlaps significativo entre microregiões adjacentes (overlap
     bem pequeno por causa de imprecisão de geometria é tolerado).

Uso:
    python3 14_microregioes.py --municipio 3550308    # SP capital (validação)
    python3 14_microregioes.py --uf SP                # estado inteiro
    python3 14_microregioes.py --uf SP --rebuild      # recria do zero
    python3 14_microregioes.py                        # Brasil inteiro (em fila por estado)
"""
import argparse
import re
import sys
import time
import unicodedata
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine

# ─────────────────────────────────────────────────────────────────────────────
# Parâmetros do algoritmo
# ─────────────────────────────────────────────────────────────────────────────

MIN_SETORES = 5      # microregião com menos que isso = candidata a merge
MAX_SETORES = 40     # acima disso = candidata a split
RADIUS_OSM_POINT_M = 1000  # raio max para match com OSM Point fallback


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def normalizar_nome(nome: str) -> str:
    """Versão sem acento, slug-friendly. Usado em nome_padronizado dedup."""
    if not nome:
        return ""
    n = unicodedata.normalize("NFKD", nome)
    n = "".join(c for c in n if not unicodedata.combining(c))
    n = re.sub(r"[^a-zA-Z0-9 ]+", " ", n).strip()
    n = re.sub(r"\s+", " ", n).title()
    return n


def municipios_da_uf(conn, uf: str) -> list[tuple[int, str, str]]:
    rs = conn.execute(text(
        "SELECT id, codigo_ibge, nome FROM municipios WHERE estado_uf = :uf "
        "ORDER BY id"
    ), {"uf": uf})
    return [(r.id, r.codigo_ibge, r.nome) for r in rs]


def municipio_por_codigo(conn, codigo_ibge: str) -> tuple[int, str, str] | None:
    rs = conn.execute(text(
        "SELECT id, codigo_ibge, nome FROM municipios WHERE codigo_ibge = :c"
    ), {"c": codigo_ibge.zfill(7)})
    r = rs.fetchone()
    return (r.id, r.codigo_ibge, r.nome) if r else None


# ─────────────────────────────────────────────────────────────────────────────
# Núcleo: processar UM município
# ─────────────────────────────────────────────────────────────────────────────

def processar_municipio(municipio_id: int, codigo_ibge: str, nome_mun: str, rebuild: bool = False):
    """Gera microregioes para 1 município."""
    print(f"\n{'='*60}\n[{nome_mun} / {codigo_ibge}] iniciando")

    with engine.begin() as conn:
        if rebuild:
            print("  [rebuild] limpando microregioes existentes...")
            conn.execute(text("UPDATE setores_censitarios SET microregiao_id = NULL "
                              "WHERE codigo_municipio = :c"),
                         {"c": codigo_ibge.zfill(7)})
            conn.execute(text("DELETE FROM microregioes WHERE municipio_id = :mid"),
                         {"mid": municipio_id})

        # Já tem dados pra esse município? Pula se não for rebuild.
        existe = conn.execute(text(
            "SELECT COUNT(*) AS n FROM microregioes WHERE municipio_id = :mid"
        ), {"mid": municipio_id}).fetchone()
        if existe.n > 0 and not rebuild:
            print(f"  já tem {existe.n} microregioes (use --rebuild para recriar). Pulando.")
            return 0

        # ── PASSO 1: matchar setor → OSM dominante ─────────────────────
        print("  [1/4] matchando setores → OSM (Polygon CONTAINS centróide)...")
        # Cria tabela temporária com o match
        conn.execute(text("DROP TABLE IF EXISTS _tmp_setor_osm"))
        conn.execute(text(f"""
            CREATE TEMP TABLE _tmp_setor_osm AS
            WITH setor_centroides AS (
                SELECT sc.codigo_setor,
                       ST_Centroid(sc.geometry) AS centro,
                       sc.nome_distrito,
                       sc.nome_subdistrito
                FROM setores_censitarios sc
                WHERE sc.codigo_municipio = '{codigo_ibge.zfill(7)}'
            ),
            -- Match com OSM Polygon (CONTAINS)
            match_polygon AS (
                SELECT DISTINCT ON (sc.codigo_setor)
                    sc.codigo_setor,
                    bo.id    AS osm_id,
                    bo.nome  AS osm_nome,
                    sc.nome_distrito,
                    sc.nome_subdistrito,
                    'osm_polygon' AS metodo
                FROM setor_centroides sc
                JOIN bairros_osm bo ON bo.municipio_id = {municipio_id}
                  AND ST_GeometryType(bo.geometry) IN ('ST_Polygon','ST_MultiPolygon')
                  AND ST_Contains(bo.geometry, sc.centro)
                ORDER BY sc.codigo_setor, ST_Area(bo.geometry) ASC  -- menor área = mais específico
            ),
            -- Match com OSM Point (mais próximo até {RADIUS_OSM_POINT_M}m)
            sem_polygon AS (
                SELECT sc.* FROM setor_centroides sc
                WHERE sc.codigo_setor NOT IN (SELECT codigo_setor FROM match_polygon)
            ),
            match_point AS (
                SELECT DISTINCT ON (sc.codigo_setor)
                    sc.codigo_setor,
                    bo.id    AS osm_id,
                    bo.nome  AS osm_nome,
                    sc.nome_distrito,
                    sc.nome_subdistrito,
                    'osm_point' AS metodo
                FROM sem_polygon sc
                JOIN bairros_osm bo ON bo.municipio_id = {municipio_id}
                  AND ST_GeometryType(bo.geometry) = 'ST_Point'
                  AND ST_DWithin(bo.geometry::geography, sc.centro::geography, {RADIUS_OSM_POINT_M})
                ORDER BY sc.codigo_setor, ST_Distance(bo.geometry::geography, sc.centro::geography)
            ),
            sem_match AS (
                SELECT sc.* FROM setor_centroides sc
                WHERE sc.codigo_setor NOT IN (SELECT codigo_setor FROM match_polygon)
                  AND sc.codigo_setor NOT IN (SELECT codigo_setor FROM match_point)
            )
            SELECT codigo_setor, osm_id, osm_nome, nome_distrito, nome_subdistrito, metodo FROM match_polygon
            UNION ALL
            SELECT codigo_setor, osm_id, osm_nome, nome_distrito, nome_subdistrito, metodo FROM match_point
            UNION ALL
            SELECT codigo_setor, NULL::int, NULL::varchar, nome_distrito, nome_subdistrito, 'distrito_fallback'
              FROM sem_match
        """))
        n_total = conn.execute(text("SELECT COUNT(*) AS n FROM _tmp_setor_osm")).fetchone().n
        n_polygon = conn.execute(text("SELECT COUNT(*) AS n FROM _tmp_setor_osm WHERE metodo='osm_polygon'")).fetchone().n
        n_point = conn.execute(text("SELECT COUNT(*) AS n FROM _tmp_setor_osm WHERE metodo='osm_point'")).fetchone().n
        n_fallback = conn.execute(text("SELECT COUNT(*) AS n FROM _tmp_setor_osm WHERE metodo='distrito_fallback'")).fetchone().n
        print(f"      {n_total} setores · {n_polygon} OSM polygon · {n_point} OSM point · {n_fallback} fallback distrito")

        # ── PASSO 2: agrupar setores por OSM ou distrito_fallback ──────
        print("  [2/4] agrupando por OSM (ou fallback distrito) e gerando geometrias...")
        # Para distrito_fallback, usar nome "Area sem nome - {distrito}"
        # Para OSM match, usar o nome do OSM
        # Insere em microregioes
        conn.execute(text(f"""
            INSERT INTO microregioes (
                nome, nome_padronizado, nivel, municipio_id, distrito_cd,
                geometry, area_km2, n_setores, populacao, osm_ref_id, origem
            )
            SELECT
                COALESCE(t.osm_nome, 'Área sem nome — ' || COALESCE(t.nome_distrito, 'Sem distrito')) AS nome,
                COALESCE(t.osm_nome, 'area-sem-nome-' || COALESCE(NULLIF(t.nome_distrito, ''), 'sem-distrito')) AS nome_padronizado,
                5 AS nivel,
                {municipio_id} AS municipio_id,
                NULL AS distrito_cd,
                ST_Multi(ST_SetSRID(ST_Union(sc.geometry), 4674)) AS geometry,
                ROUND((SUM(ST_Area(sc.geometry::geography)) / 1000000.0)::numeric, 3) AS area_km2,
                COUNT(*) AS n_setores,
                SUM(sc.populacao)::int AS populacao,
                MAX(t.osm_id) AS osm_ref_id,
                CASE
                  WHEN MAX(t.metodo) = 'osm_polygon' THEN 'osm'
                  WHEN MAX(t.metodo) = 'osm_point'   THEN 'osm_proxim'
                  ELSE 'distrito_fallback'
                END AS origem
            FROM _tmp_setor_osm t
            JOIN setores_censitarios sc ON sc.codigo_setor = t.codigo_setor
            GROUP BY
                COALESCE(t.osm_nome, 'Área sem nome — ' || COALESCE(t.nome_distrito, 'Sem distrito')),
                COALESCE(t.osm_nome, 'area-sem-nome-' || COALESCE(NULLIF(t.nome_distrito, ''), 'sem-distrito')),
                t.nome_distrito
            ON CONFLICT (municipio_id, nome_padronizado) DO NOTHING
        """))
        n_inseridas = conn.execute(text(
            "SELECT COUNT(*) AS n FROM microregioes WHERE municipio_id = :mid"
        ), {"mid": municipio_id}).fetchone().n
        print(f"      {n_inseridas} microregioes criadas")

        # Linkar setores → microregiao_id
        conn.execute(text(f"""
            UPDATE setores_censitarios sc
            SET microregiao_id = mr.id
            FROM _tmp_setor_osm t, microregioes mr
            WHERE sc.codigo_setor = t.codigo_setor
              AND mr.municipio_id = {municipio_id}
              AND mr.nome_padronizado = COALESCE(
                  t.osm_nome,
                  'area-sem-nome-' || COALESCE(NULLIF(t.nome_distrito, ''), 'sem-distrito')
              )
        """))

        # ── PASSO 3a: SPLIT de grandes via k-means geográfico ──────────
        # ST_ClusterKMeans (PostGIS) divide setores em clusters por proximidade
        # do centroide, mantendo continuidade espacial razoavel.
        print(f"  [3a] split de grandes (>{MAX_SETORES} setores) via k-means...")
        grandes = conn.execute(text(f"""
            SELECT id, nome, nome_padronizado, n_setores
            FROM microregioes
            WHERE municipio_id = {municipio_id} AND n_setores > {MAX_SETORES}
            ORDER BY n_setores DESC
        """)).fetchall()
        n_split = 0
        for g in grandes:
            k = max(2, (g.n_setores + 24) // 25)  # ~25 setores por cluster
            # Calcula clusters via ST_ClusterKMeans
            clusters = conn.execute(text(f"""
                SELECT codigo_setor,
                       ST_ClusterKMeans(ST_Centroid(geometry), {k})
                         OVER ()                               AS cluster_id,
                       ST_Y(ST_Centroid(geometry)) AS lat,
                       ST_X(ST_Centroid(geometry)) AS lng
                FROM setores_censitarios
                WHERE microregiao_id = {g.id}
            """)).fetchall()
            if not clusters:
                continue
            # Centroide do original (referencia para direcao cardinal dos sub-clusters)
            ref = conn.execute(text(
                f"SELECT ST_Y(ST_Centroid(geometry)) AS lat, ST_X(ST_Centroid(geometry)) AS lng "
                f"FROM microregioes WHERE id = {g.id}"
            )).fetchone()
            ref_lat, ref_lng = float(ref.lat), float(ref.lng)

            # Agrupa por cluster
            from collections import defaultdict
            buckets: dict[int, list] = defaultdict(list)
            for c in clusters:
                buckets[c.cluster_id].append(c)

            # Cria nova microregiao por cluster
            for cluster_id, items in buckets.items():
                # Direcao cardinal: media lat/lng do cluster vs centroide original
                avg_lat = sum(i.lat for i in items) / len(items)
                avg_lng = sum(i.lng for i in items) / len(items)
                dy, dx = avg_lat - ref_lat, avg_lng - ref_lng
                if abs(dx) < 0.003 and abs(dy) < 0.003:
                    direcao = "Centro"
                elif abs(dy) > abs(dx):
                    direcao = "Norte" if dy > 0 else "Sul"
                else:
                    direcao = "Leste" if dx > 0 else "Oeste"

                novo_nome = f"{g.nome} — {direcao}"
                novo_pad = normalizar_nome(novo_nome)
                codigos = "','".join(i.codigo_setor for i in items)

                # Insere a nova microregiao com geometria do cluster
                novo_id = conn.execute(text(f"""
                    INSERT INTO microregioes (
                        nome, nome_padronizado, nivel, municipio_id, distrito_cd,
                        geometry, area_km2, n_setores, populacao, osm_ref_id, origem
                    )
                    SELECT :nome, :pad, 5, {municipio_id}, NULL,
                           ST_Multi(ST_SetSRID(ST_Union(sc.geometry), 4674)),
                           ROUND((SUM(ST_Area(sc.geometry::geography)) / 1000000.0)::numeric, 3),
                           COUNT(*),
                           SUM(sc.populacao)::int,
                           NULL,
                           'split_kmeans'
                    FROM setores_censitarios sc
                    WHERE sc.codigo_setor IN ('{codigos}')
                    ON CONFLICT (municipio_id, nome_padronizado) DO UPDATE
                      SET n_setores = EXCLUDED.n_setores,
                          geometry = EXCLUDED.geometry,
                          area_km2 = EXCLUDED.area_km2
                    RETURNING id
                """), {"nome": novo_nome, "pad": novo_pad}).fetchone()
                # Move os setores pra nova microregiao
                conn.execute(text(
                    f"UPDATE setores_censitarios SET microregiao_id = {novo_id.id} "
                    f"WHERE codigo_setor IN ('{codigos}')"
                ))

            # Apaga a microregiao original (todos os setores foram realocados)
            conn.execute(text(f"DELETE FROM microregioes WHERE id = {g.id}"))
            n_split += 1
        print(f"      {n_split} grandes splitadas em clusters menores")

        # ── PASSO 3b: EXPANSÃO de pequenas via ST_DWithin ──────────────
        # Para microregioes < MIN_SETORES, fundir com vizinha mais próxima
        # do mesmo distrito (centroide via ST_DWithin até 2km).
        print(f"  [3b] expansao de pequenas (<{MIN_SETORES} setores) via ST_DWithin...")
        pequenas = conn.execute(text(f"""
            SELECT mr.id, mr.nome, mr.n_setores,
                   ST_Centroid(mr.geometry) AS centro,
                   (SELECT sc.nome_distrito FROM setores_censitarios sc
                    WHERE sc.microregiao_id = mr.id LIMIT 1) AS distrito_pai
            FROM microregioes mr
            WHERE mr.municipio_id = {municipio_id} AND mr.n_setores < {MIN_SETORES}
            ORDER BY mr.n_setores ASC
        """)).fetchall()
        n_merge = 0
        for p in pequenas:
            # Vizinha mais próxima do centroide, mesmo distrito se possível,
            # que após merge fique <= MAX_SETORES.
            viz = conn.execute(text(f"""
                WITH candidatas AS (
                    SELECT mr.id, mr.n_setores,
                           ST_Distance(mr.geometry::geography,
                                       (SELECT geometry FROM microregioes WHERE id = {p.id})::geography
                           ) AS dist_m,
                           (SELECT sc.nome_distrito FROM setores_censitarios sc
                            WHERE sc.microregiao_id = mr.id LIMIT 1) = :dist_pai AS mesmo_dist
                    FROM microregioes mr
                    WHERE mr.municipio_id = {municipio_id}
                      AND mr.id != {p.id}
                      AND mr.n_setores + {p.n_setores} <= {MAX_SETORES}
                      AND ST_DWithin(
                          mr.geometry::geography,
                          (SELECT geometry FROM microregioes WHERE id = {p.id})::geography,
                          2000)
                )
                SELECT id, n_setores FROM candidatas
                ORDER BY mesmo_dist DESC, dist_m ASC, n_setores ASC
                LIMIT 1
            """), {"dist_pai": p.distrito_pai or ""}).fetchone()
            if viz:
                conn.execute(text(f"UPDATE setores_censitarios SET microregiao_id = {viz.id} WHERE microregiao_id = {p.id}"))
                conn.execute(text(f"""
                    UPDATE microregioes SET
                      geometry  = ST_Multi(ST_Union(geometry, (SELECT geometry FROM microregioes WHERE id = {p.id}))),
                      n_setores = n_setores + {p.n_setores},
                      area_km2  = ROUND((ST_Area(ST_Union(geometry,
                                  (SELECT geometry FROM microregioes WHERE id = {p.id}))::geography) / 1000000.0)::numeric, 3),
                      populacao = COALESCE(populacao, 0) + COALESCE((SELECT populacao FROM microregioes WHERE id = {p.id}), 0)
                    WHERE id = {viz.id}
                """))
                conn.execute(text(f"DELETE FROM microregioes WHERE id = {p.id}"))
                n_merge += 1
        print(f"      {n_merge} pequenas fundidas em vizinhas")

        # ── PASSO 3c: RENOMEAR "Área sem nome" via direcao cardinal ────
        print("  [3c] renomeando 'Area sem nome' usando direcao cardinal...")
        sem_nome = conn.execute(text(f"""
            SELECT mr.id, mr.nome,
                   ST_Y(ST_Centroid(mr.geometry)) AS lat,
                   ST_X(ST_Centroid(mr.geometry)) AS lng,
                   COALESCE((SELECT sc.nome_distrito FROM setores_censitarios sc
                             WHERE sc.microregiao_id = mr.id LIMIT 1), 'Sem distrito') AS distrito_pai
            FROM microregioes mr
            WHERE mr.municipio_id = {municipio_id}
              AND mr.nome LIKE 'Área sem nome%'
        """)).fetchall()
        n_rename = 0
        for sn in sem_nome:
            # Centroide do distrito pai (referencia)
            ref = conn.execute(text(f"""
                SELECT ST_Y(ST_Centroid(geometry)) AS lat,
                       ST_X(ST_Centroid(geometry)) AS lng
                FROM distritos_municipio
                WHERE cd_mun = '{codigo_ibge.zfill(7)}' AND nm_dist = :dpai
                LIMIT 1
            """), {"dpai": sn.distrito_pai}).fetchone()
            if not ref:
                continue
            dy, dx = float(sn.lat) - float(ref.lat), float(sn.lng) - float(ref.lng)
            if abs(dx) < 0.003 and abs(dy) < 0.003:
                direcao = "Central"
            elif abs(dy) > abs(dx):
                direcao = "Norte" if dy > 0 else "Sul"
            else:
                direcao = "Leste" if dx > 0 else "Oeste"
            novo_nome = f"Região {direcao} — {sn.distrito_pai}"
            # Sufixo do id no nome_padronizado garante UNIQUE sem violar
            # constraint quando varias microregioes ficam na mesma direcao.
            novo_pad = f"{normalizar_nome(novo_nome)}-{sn.id}"
            conn.execute(text(
                "UPDATE microregioes SET nome = :n, nome_padronizado = :p WHERE id = :id"
            ), {"n": novo_nome, "p": novo_pad, "id": sn.id})
            n_rename += 1
        print(f"      {n_rename} renomeadas com direcao cardinal")

        # ── PASSO 4: validação ─────────────────────────────────────────
        print("  [4/4] validacao...")
        sem_micro = conn.execute(text(f"""
            SELECT COUNT(*) AS n FROM setores_censitarios
            WHERE codigo_municipio = '{codigo_ibge.zfill(7)}' AND microregiao_id IS NULL
        """)).fetchone().n
        n_final = conn.execute(text(
            "SELECT COUNT(*) AS n FROM microregioes WHERE municipio_id = :mid"
        ), {"mid": municipio_id}).fetchone().n
        avg_setores = conn.execute(text(f"""
            SELECT ROUND(AVG(n_setores)::numeric, 1) AS media,
                   MIN(n_setores) AS min_s,
                   MAX(n_setores) AS max_s,
                   COUNT(*) FILTER (WHERE n_setores < {MIN_SETORES}) AS pequenas,
                   COUNT(*) FILTER (WHERE n_setores > {MAX_SETORES}) AS grandes
            FROM microregioes WHERE municipio_id = {municipio_id}
        """)).fetchone()
        print(f"      microregioes finais: {n_final} · setores sem micro: {sem_micro}")
        print(f"      média: {avg_setores.media} setores · min: {avg_setores.min_s} · max: {avg_setores.max_s}")
        print(f"      ainda pequenas (<{MIN_SETORES}): {avg_setores.pequenas} · grandes (>{MAX_SETORES}): {avg_setores.grandes}")

        return n_final


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipio", help="Codigo IBGE de um municipio")
    parser.add_argument("--uf", help="Sigla UF (processa todos municipios da UF)")
    parser.add_argument("--rebuild", action="store_true", help="Recria do zero")
    args = parser.parse_args()

    inicio = time.time()
    total = 0

    with engine.connect() as conn:
        if args.municipio:
            mun = municipio_por_codigo(conn, args.municipio)
            if not mun:
                print(f"Municipio {args.municipio} nao encontrado")
                return
            municipios = [mun]
        elif args.uf:
            municipios = municipios_da_uf(conn, args.uf.upper())
        else:
            print("Uso: --municipio CODIGO_IBGE  ou  --uf SP")
            return

    print(f"Processando {len(municipios)} municipios...")
    for mid, cibge, nome in municipios:
        try:
            n = processar_municipio(mid, cibge, nome, rebuild=args.rebuild)
            total += n
        except Exception as e:
            print(f"  ERRO em {nome} ({cibge}): {e}")
            continue

    elapsed = time.time() - inicio
    print(f"\n{'='*60}\nFIM. {total} microregioes geradas em {elapsed:.0f}s")


if __name__ == "__main__":
    main()
