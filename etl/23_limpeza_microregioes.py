"""ETL: Limpeza final de microregioes — P2+P0+P1.

Pipeline aprovado (Claude + GPT) em 13/04/2026 12:30.

P2 — Reatribuir setores nao-contiguos para microregiao vizinha com
     maior fronteira compartilhada (fix NA FONTE das rebarbas).
P0 — Pos-Union: ST_Dump, descartar partes < 10% da area total ou
     < 200.000 m2. Reatribuir setores orfaos.
P1 — Opening morfologico: ST_Buffer(-0.0003) -> ST_Buffer(+0.0003)
     -> ST_MakeValid. Remove dentes e zigzag.

Validacao final: cada microregiao deve ter ST_NumGeometries = 1.

Uso:
    python3 23_limpeza_microregioes.py --distrito 355030863      # piloto
    python3 23_limpeza_microregioes.py --municipio 3550308       # cidade
"""
from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine

sys.path.insert(0, str(Path(__file__).parent))
from _governanca import (  # noqa: E402
    FILTRO_ALVO_SEM_ALIAS,
    FILTRO_UPDATE_SEM_ALIAS,
)


# Parametros
AREA_MIN_PART_M2 = 200_000   # 0.2 km2 (~2 quarteiroes)
AREA_MIN_FRACAO = 0.10       # part >= 10% da area total
BUFFER_EROSAO = -0.0002      # ~20m em SP (conservador p/ nao quebrar pescocos)
BUFFER_DILATACAO = 0.0002

# Modo agressivo (flag --agressivo): corta tentaculos ate ~66m de largura
# e simplifica pos-opening pra reduzir vertices. Usado no pipeline_sp_v3
# apos o Chaikin (ETL 36) pra capturar tentaculos residuais.
BUFFER_EROSAO_AGRESSIVO = -0.00030       # ~33m
BUFFER_DILATACAO_AGRESSIVO = 0.00030
SIMPLIFY_TOL_AGRESSIVO = 0.00003         # ~3m


def _contar_fragmentacao(conn, municipio_id: int, distrito_cd: str | None) -> dict:
    """Retorna {total, fragmentadas, max_parts, media_parts}."""
    filtro_dist = f"AND distrito_cd = '{distrito_cd}'" if distrito_cd else "AND distrito_cd IS NOT NULL"
    r = conn.execute(text(f"""
        WITH s AS (
            SELECT id, ST_NumGeometries(geometry) AS n
            FROM microregioes
            WHERE municipio_id = {municipio_id} {filtro_dist}
              AND origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND calibrada_final = FALSE
        )
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE n > 1) AS fragmentadas,
               COALESCE(MAX(n), 0) AS max_parts,
               ROUND(AVG(n)::numeric, 2) AS media_parts
        FROM s
    """)).fetchone()
    return {"total": r.total, "fragmentadas": r.fragmentadas,
            "max_parts": r.max_parts, "media_parts": float(r.media_parts or 0)}


def _regenerar_geometria(conn, mr_ids: list[int]):
    """Recalcula geometry + area_km2 + n_setores a partir dos setores.

    GUARDAS DE GOVERNANCA (Wave 1 — 14/04/2026):
    - Microzonas congeladas NUNCA sao tocadas.
    - manual_edit NUNCA eh tocada (origem != 'manual_edit').
    - calibrada_final = TRUE NUNCA eh tocada.
    - So eh chamada via flag --reset-from-setores do main.
    """
    if not mr_ids:
        return
    ids_sql = ",".join(str(i) for i in mr_ids)
    conn.execute(text(f"""
        UPDATE microregioes mr SET
            geometry = sub.geom,
            area_km2 = sub.area_km2,
            n_setores = sub.n_setores
        FROM (
            SELECT sc.microregiao_id AS id,
                   ST_Multi(ST_SetSRID(
                       ST_MakeValid(
                           ST_SimplifyPreserveTopology(ST_Union(sc.geometry), 0.0002)
                       ), 4674)) AS geom,
                   ROUND((SUM(ST_Area(sc.geometry::geography)) / 1000000.0)::numeric, 3) AS area_km2,
                   COUNT(*) AS n_setores
            FROM setores_censitarios sc
            WHERE sc.microregiao_id IN ({ids_sql})
            GROUP BY sc.microregiao_id
        ) sub
        WHERE mr.id = sub.id
          AND {FILTRO_UPDATE_SEM_ALIAS}
    """))


def _atualizar_hash_e_audit(
    conn, municipio_id: int, distrito_cd: str | None, motivo: str
) -> int:
    """Recalcula hash de geometria. Se mudou, incrementa versao e grava audit.

    Microzonas congeladas NAO entram (hash nao muda porque geometria nao mudou).
    Retorna o numero de microzonas que tiveram mudanca real de geometria.
    """
    filtro_dist = (
        f"AND distrito_cd = '{distrito_cd}'" if distrito_cd
        else "AND distrito_cd IS NOT NULL"
    )
    motivo_sql = motivo.replace("'", "''")

    result = conn.execute(text(f"""
        WITH calc AS (
            SELECT id,
                   hash_geometria AS hash_antigo,
                   versao AS versao_antiga,
                   md5(ST_AsText(geometry)) AS hash_novo
            FROM microregioes
            WHERE municipio_id = {municipio_id} {filtro_dist}
              AND origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND calibrada_final = FALSE
              AND congelada_em IS NULL
        ),
        mudadas AS (
            SELECT id, hash_novo, versao_antiga + 1 AS versao_nova
            FROM calc
            WHERE hash_antigo IS DISTINCT FROM hash_novo
        ),
        upd AS (
            UPDATE microregioes mr SET
                hash_geometria = m.hash_novo,
                versao = m.versao_nova,
                atualizado_em = now()
            FROM mudadas m
            WHERE mr.id = m.id
            RETURNING mr.id, m.hash_novo, m.versao_nova
        )
        INSERT INTO microregioes_audit
            (microregiao_id, versao, hash_geometria, motivo)
        SELECT id, versao_nova, hash_novo, '{motivo_sql}' FROM upd
        RETURNING microregiao_id
    """)).fetchall()

    n = len(result)
    if n:
        print(f"  audit: {n} microzonas versionadas (motivo={motivo!r})")
    return n


def p2_reatribuir_por_adjacencia(
    municipio_id: int, distrito_cd: str | None
) -> int:
    """Detecta setores nao-contiguos (fora do maior componente) e move
    para a microregiao vizinha com maior fronteira compartilhada com o
    setor.

    Retorna: numero de setores movidos.
    """
    print("\n[P2] reatribuicao por adjacencia fisica...")
    filtro_dist = f"AND mr.distrito_cd = '{distrito_cd}'" if distrito_cd else "AND mr.distrito_cd IS NOT NULL"
    total_movidos = 0

    with engine.begin() as conn:
        # 1. Lista microregioes fragmentadas (>1 parte)
        fragmentadas = conn.execute(text(f"""
            SELECT mr.id, mr.nome, ST_NumGeometries(mr.geometry) AS n_parts
            FROM microregioes mr
            WHERE mr.municipio_id = {municipio_id} {filtro_dist}
              AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND mr.calibrada_final = FALSE
              AND ST_NumGeometries(mr.geometry) > 1
            ORDER BY ST_Area(mr.geometry::geography) DESC
        """)).fetchall()

        print(f"  {len(fragmentadas)} microregioes fragmentadas a tratar")

        for mr in fragmentadas:
            # 2. Para cada microregiao, identificar parte principal (maior area)
            #    e listar setores que NAO estao nela
            r = conn.execute(text(f"""
                WITH parts AS (
                    SELECT (ST_Dump(geometry)).geom AS geom,
                           (ST_Dump(geometry)).path[1] AS idx
                    FROM microregioes WHERE id = {mr.id}
                ),
                parts_area AS (
                    SELECT idx, geom, ST_Area(geom::geography) AS area_m2
                    FROM parts
                ),
                maior AS (
                    SELECT idx FROM parts_area ORDER BY area_m2 DESC LIMIT 1
                )
                SELECT idx FROM maior
            """)).fetchone()
            if not r:
                continue

            # 3. Setores orfaos = os que NAO tocam a parte principal.
            # setores = SRID 4326, microregioes = SRID 4674 -> ST_Transform.
            setores_orfaos = conn.execute(text(f"""
                WITH parts AS (
                    SELECT (ST_Dump(geometry)).geom AS geom,
                           (ST_Dump(geometry)).path[1] AS idx
                    FROM microregioes WHERE id = {mr.id}
                ),
                principal AS (
                    SELECT ST_Transform(geom, 4326) AS geom FROM parts
                    ORDER BY ST_Area(geom::geography) DESC LIMIT 1
                )
                SELECT sc.id, sc.codigo_setor
                FROM setores_censitarios sc
                CROSS JOIN principal p
                WHERE sc.microregiao_id = {mr.id}
                  AND NOT ST_Intersects(ST_Centroid(sc.geometry), p.geom)
            """)).fetchall()

            if not setores_orfaos:
                continue

            # 4. Para cada orfao, achar microregiao vizinha com MAIOR
            #    fronteira compartilhada. setores 4326, mr 4674 -> transform.
            movidos_mr = 0
            for so in setores_orfaos:
                vizinha = conn.execute(text(f"""
                    WITH setor_g AS (
                        SELECT ST_Transform(geometry, 4674) AS g
                        FROM setores_censitarios WHERE id = {so.id}
                    )
                    SELECT mr2.id,
                           ST_Length(ST_Intersection(
                               ST_Boundary(s.g),
                               ST_Boundary(mr2.geometry))::geography) AS fronteira_m
                    FROM microregioes mr2
                    CROSS JOIN setor_g s
                    WHERE mr2.municipio_id = {municipio_id}
                      AND mr2.id != {mr.id}
                      AND mr2.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
                  AND mr2.calibrada_final = FALSE
                      AND ST_DWithin(mr2.geometry, s.g, 0.0001)
                    ORDER BY fronteira_m DESC NULLS LAST
                    LIMIT 1
                """)).fetchone()

                if vizinha and vizinha.fronteira_m and vizinha.fronteira_m > 0:
                    conn.execute(text(f"""
                        UPDATE setores_censitarios
                        SET microregiao_id = {vizinha.id}
                        WHERE id = {so.id}
                    """))
                    movidos_mr += 1

            if movidos_mr:
                print(f"      [{mr.nome}] {movidos_mr}/{len(setores_orfaos)} setores orfaos movidos")
                total_movidos += movidos_mr

        # 5. Regenera geometria de TODAS microregioes afetadas
        print("  regenerando geometrias apos P2...")
        ids_afetadas = [r.id for r in conn.execute(text(f"""
            SELECT DISTINCT mr.id
            FROM microregioes mr
            WHERE mr.municipio_id = {municipio_id} {filtro_dist}
              AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND mr.calibrada_final = FALSE
        """))]
        _regenerar_geometria(conn, ids_afetadas)

    print(f"  P2: {total_movidos} setores reatribuidos")
    return total_movidos


def p0_remover_ilhas(municipio_id: int, distrito_cd: str | None) -> int:
    """ST_Dump + filtra partes < 10% ou < 200k m2. Reatribui setores orfaos
    e regenera geometry.

    Retorna: numero de partes removidas.
    """
    print("\n[P0] remocao de ilhas pos-union...")
    filtro_dist = f"AND mr.distrito_cd = '{distrito_cd}'" if distrito_cd else "AND mr.distrito_cd IS NOT NULL"
    partes_removidas = 0

    with engine.begin() as conn:
        # Para cada microregiao ainda fragmentada, identificar partes a remover
        fragmentadas = conn.execute(text(f"""
            SELECT mr.id, mr.nome
            FROM microregioes mr
            WHERE mr.municipio_id = {municipio_id} {filtro_dist}
              AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND mr.calibrada_final = FALSE
              AND ST_NumGeometries(mr.geometry) > 1
        """)).fetchall()

        for mr in fragmentadas:
            # Parts com area e flag "eh pequena"
            partes = conn.execute(text(f"""
                WITH p AS (
                    SELECT (ST_Dump(geometry)).geom AS geom,
                           (ST_Dump(geometry)).path[1] AS idx
                    FROM microregioes WHERE id = {mr.id}
                ),
                pa AS (
                    SELECT idx, geom, ST_Area(geom::geography) AS area_m2
                    FROM p
                ),
                tot AS (
                    SELECT SUM(area_m2) AS total FROM pa
                )
                SELECT pa.idx, pa.area_m2,
                       pa.area_m2 / NULLIF(tot.total, 0) AS fracao,
                       ST_AsEWKT(pa.geom) AS geom_ewkt
                FROM pa CROSS JOIN tot
                ORDER BY pa.area_m2 DESC
            """)).fetchall()

            if not partes:
                continue

            # Parte 0 eh a maior. Keep parts where fracao >= 0.10 OR area >= 200k
            pequenas_idx = [p.idx for p in partes
                            if p.fracao < AREA_MIN_FRACAO and p.area_m2 < AREA_MIN_PART_M2]

            if not pequenas_idx:
                continue

            # Setores dentro das partes pequenas → reatribuir para microregiao
            # vizinha com maior fronteira compartilhada
            for p in partes:
                if p.idx not in pequenas_idx:
                    continue
                setores_afetados = conn.execute(text(f"""
                    SELECT sc.id
                    FROM setores_censitarios sc
                    WHERE sc.microregiao_id = {mr.id}
                      AND ST_Intersects(ST_Centroid(sc.geometry),
                          ST_Transform(ST_GeomFromEWKT('{p.geom_ewkt}'), 4326))
                """)).fetchall()

                for so in setores_afetados:
                    vizinha = conn.execute(text(f"""
                        WITH setor_g AS (
                            SELECT ST_Transform(geometry, 4674) AS g
                            FROM setores_censitarios WHERE id = {so.id}
                        )
                        SELECT mr2.id,
                               ST_Length(ST_Intersection(
                                   ST_Boundary(s.g),
                                   ST_Boundary(mr2.geometry))::geography) AS fronteira_m
                        FROM microregioes mr2
                        CROSS JOIN setor_g s
                        WHERE mr2.municipio_id = {municipio_id}
                          AND mr2.id != {mr.id}
                          AND mr2.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
                  AND mr2.calibrada_final = FALSE
                          AND ST_DWithin(mr2.geometry, s.g, 0.0005)
                        ORDER BY fronteira_m DESC NULLS LAST
                        LIMIT 1
                    """)).fetchone()
                    if vizinha and vizinha.fronteira_m and vizinha.fronteira_m > 0:
                        conn.execute(text(f"""
                            UPDATE setores_censitarios
                            SET microregiao_id = {vizinha.id}
                            WHERE id = {so.id}
                        """))

                partes_removidas += 1

            print(f"      [{mr.nome}] {len(pequenas_idx)} ilhas removidas")

        # Regenera geometrias afetadas
        if partes_removidas:
            print("  regenerando geometrias apos P0...")
            ids_afetadas = [r.id for r in conn.execute(text(f"""
                SELECT DISTINCT mr.id
                FROM microregioes mr
                WHERE mr.municipio_id = {municipio_id} {filtro_dist}
                  AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND mr.calibrada_final = FALSE
            """))]
            _regenerar_geometria(conn, ids_afetadas)

    print(f"  P0: {partes_removidas} ilhas removidas")
    return partes_removidas


def p0_finalizador_geometrico(municipio_id: int, distrito_cd: str | None) -> int:
    """Variante do P0 que filtra partes pequenas DIRETO na geometria,
    SEM regenerar from-setores. Preserva o resultado do P1 (suavizacao).

    Usado como passo final. Aceita divergencia minima entre setor.microregiao_id
    e microregiao.geometry (rebarba <10% que somente existe como pixel no mapa).
    """
    filtro_dist = f"AND distrito_cd = '{distrito_cd}'" if distrito_cd else "AND distrito_cd IS NOT NULL"
    removidas = 0

    with engine.begin() as conn:
        # Atualiza geometry: mantem apenas parts >= 10% OR >= 200k m2.
        # Se sobra so 1 parte (a maior): simples.
        # Se nao ha parts pequenas: mantem tudo.
        resultado = conn.execute(text(f"""
            WITH alvo AS (
                SELECT mr.id, mr.geometry
                FROM microregioes mr
                WHERE mr.municipio_id = {municipio_id} {filtro_dist}
                  AND mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND mr.calibrada_final = FALSE
                  AND ST_NumGeometries(mr.geometry) > 1
            ),
            parts AS (
                SELECT a.id,
                       (ST_Dump(a.geometry)).geom AS geom,
                       (ST_Dump(a.geometry)).path[1] AS idx
                FROM alvo a
            ),
            parts_area AS (
                SELECT p.id, p.idx, p.geom,
                       ST_Area(p.geom::geography) AS area_m2,
                       SUM(ST_Area(p.geom::geography)) OVER (PARTITION BY p.id) AS area_tot
                FROM parts p
            ),
            mantidas AS (
                SELECT id, geom, idx
                FROM parts_area
                WHERE area_m2 / NULLIF(area_tot, 0) >= {AREA_MIN_FRACAO}
                   OR area_m2 >= {AREA_MIN_PART_M2}
                   OR idx = (
                       SELECT idx FROM parts_area pa2
                       WHERE pa2.id = parts_area.id
                       ORDER BY pa2.area_m2 DESC LIMIT 1
                   )
            ),
            agregadas AS (
                SELECT id,
                       ST_Multi(ST_SetSRID(ST_MakeValid(ST_Union(geom)), 4674)) AS nova_geom,
                       COUNT(*) AS n_mantidas
                FROM mantidas
                GROUP BY id
            ),
            totais AS (
                SELECT p.id, MAX(p.idx) AS n_total FROM parts p GROUP BY p.id
            )
            UPDATE microregioes mr SET geometry = a.nova_geom
            FROM agregadas a, totais t
            WHERE mr.id = a.id AND mr.id = t.id
              AND a.n_mantidas < t.n_total
              AND mr.origem != 'manual_edit'
              AND mr.congelada_em IS NULL
              AND mr.calibrada_final = FALSE
              AND mr.geometry IS NOT NULL
            RETURNING mr.id, t.n_total - a.n_mantidas AS removidas
        """)).fetchall()

        removidas = sum(r.removidas for r in resultado)

    print(f"  P0-final: {len(resultado)} microregioes ajustadas, {removidas} parts removidas")
    return removidas


def p1_opening_morfologico(municipio_id: int, distrito_cd: str | None, agressivo: bool = False):
    """Aplica ST_Buffer(-) + ST_Buffer(+) em todas microregioes do escopo.

    Remove dentes/zigzag mantendo forma geral. Modo agressivo (--agressivo)
    corta tentaculos ate ~66m + simplifica pos-opening (reduz vertices).
    """
    erosao = BUFFER_EROSAO_AGRESSIVO if agressivo else BUFFER_EROSAO
    dilatacao = BUFFER_DILATACAO_AGRESSIVO if agressivo else BUFFER_DILATACAO
    simplify_wrap = (
        f"ST_SimplifyPreserveTopology(__GEOM__, {SIMPLIFY_TOL_AGRESSIVO})"
        if agressivo else "__GEOM__"
    )
    print(f"\n[P1] opening morfologico{'  [AGRESSIVO ~33m+simplify]' if agressivo else ''}...")
    filtro_dist = f"AND distrito_cd = '{distrito_cd}'" if distrito_cd else "AND distrito_cd IS NOT NULL"

    geom_expr = f"""ST_MakeValid(
        ST_Buffer(
            ST_Buffer(geometry, {erosao}),
            {dilatacao}
        )
    )"""
    geom_expr_simplified = simplify_wrap.replace("__GEOM__", geom_expr)

    with engine.begin() as conn:
        # Aplica opening. Se buffer negativo "comer" geometria toda (area zero),
        # mantem original.
        conn.execute(text(f"""
            UPDATE microregioes SET geometry = sub.cleaned
            FROM (
                SELECT id,
                       CASE
                           WHEN ST_IsEmpty(ST_Buffer(geometry, {erosao})) THEN geometry
                           ELSE ST_Multi(ST_SetSRID(
                                    {geom_expr_simplified},
                                    4674))
                       END AS cleaned
                FROM microregioes
                WHERE municipio_id = {municipio_id} {filtro_dist}
                  AND origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND calibrada_final = FALSE
                  AND congelada_em IS NULL
            ) sub
            WHERE microregioes.id = sub.id
              AND microregioes.origem != 'manual_edit'
              AND microregioes.congelada_em IS NULL
              AND microregioes.calibrada_final = FALSE
              AND microregioes.geometry IS NOT NULL
        """))

        # Garante MultiPolygon (pode ter virado Polygon)
        conn.execute(text(f"""
            UPDATE microregioes
            SET geometry = ST_Multi(geometry)
            WHERE municipio_id = {municipio_id} {filtro_dist}
              AND {FILTRO_UPDATE_SEM_ALIAS}
              AND origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND ST_GeometryType(geometry) = 'ST_Polygon'
        """))

    print("  P1 ok")


def relatorio(municipio_id: int, distrito_cd: str | None, titulo: str):
    with engine.connect() as conn:
        stats = _contar_fragmentacao(conn, municipio_id, distrito_cd)
    print(f"\n[{titulo}]")
    print(f"  total microregioes    : {stats['total']}")
    print(f"  fragmentadas (>1 part): {stats['fragmentadas']}")
    print(f"  max_parts             : {stats['max_parts']}")
    print(f"  media_parts           : {stats['media_parts']}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipio", help="codigo_ibge (todos distritos)")
    parser.add_argument("--distrito", help="cd_dist (piloto)")
    parser.add_argument("--skip-p1", action="store_true",
                        help="pula opening morfologico (so P2+P0)")
    parser.add_argument("--agressivo", action="store_true",
                        help="P1 agressivo: D=~33m + simplify 3m pos-opening")
    parser.add_argument("--reset-from-setores", action="store_true",
                        help="PERIGOSO: regenera geometry via ST_Union(setores) "
                             "antes de P2/P0/P1. DESTROI calibragem existente. "
                             "Default: nao reseta.")
    args = parser.parse_args()

    if not args.municipio and not args.distrito:
        print("uso: --municipio CODIGO_IBGE  ou  --distrito CD_DIST")
        return

    inicio = time.time()
    with engine.connect() as conn:
        if args.distrito:
            r = conn.execute(text("""
                SELECT d.cd_dist, d.nm_dist, m.id AS mid, m.codigo_ibge, m.nome AS nome_mun
                FROM distritos_municipio d
                JOIN municipios m ON m.codigo_ibge = d.cd_mun
                WHERE d.cd_dist = :cd
            """), {"cd": args.distrito}).fetchone()
            if not r:
                print(f"distrito {args.distrito} nao encontrado")
                return
            municipio_id, distrito_cd = r.mid, r.cd_dist
            print(f"\npiloto: {r.nome_mun} / {r.nm_dist} (distrito {distrito_cd})")
        else:
            r = conn.execute(text("""
                SELECT id AS mid, codigo_ibge, nome AS nome_mun
                FROM municipios WHERE codigo_ibge = :c
            """), {"c": args.municipio.zfill(7)}).fetchone()
            if not r:
                print(f"municipio {args.municipio} nao encontrado")
                return
            municipio_id, distrito_cd = r.mid, None
            print(f"\nmunicipio: {r.nome_mun} ({r.codigo_ibge})")

    # Contagem de congeladas (informativo e guarda de freeze).
    with engine.connect() as conn:
        filtro_dist = f"AND distrito_cd = '{distrito_cd}'" if distrito_cd else "AND distrito_cd IS NOT NULL"
        n_congeladas = conn.execute(text(f"""
            SELECT COUNT(*) FROM microregioes
            WHERE municipio_id = {municipio_id} {filtro_dist}
              AND origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND calibrada_final = FALSE
              AND congelada_em IS NOT NULL
        """)).scalar()
    if n_congeladas:
        print(f"\n[freeze] {n_congeladas} microzona(s) congelada(s) - seriam puladas")

    # Reset opcional (--reset-from-setores): regenera geometry via
    # ST_Union(setores). DESTRUTIVO - sobrescreve calibragem feita via P1
    # anterior ou edicao manual (quando origem nao eh manual_edit ainda).
    # Regra de governanca (Wave 1): nunca roda por default.
    if args.reset_from_setores:
        print("\n[reset] ⚠ --reset-from-setores ATIVO - regenerando geometry from setores...")
        with engine.begin() as conn:
            ids_all = [r.id for r in conn.execute(text(f"""
                SELECT id FROM microregioes
                WHERE municipio_id = {municipio_id} {filtro_dist}
                  AND {FILTRO_ALVO_SEM_ALIAS}
            """))]
            _regenerar_geometria(conn, ids_all)
    else:
        print("\n[reset] pulado (default). Use --reset-from-setores se precisar regenerar geometry via ST_Union dos setores.")

    relatorio(municipio_id, distrito_cd, "ANTES")

    p2_reatribuir_por_adjacencia(municipio_id, distrito_cd)
    relatorio(municipio_id, distrito_cd, "APOS P2")

    p0_remover_ilhas(municipio_id, distrito_cd)
    relatorio(municipio_id, distrito_cd, "APOS P0")

    if not args.skip_p1:
        p1_opening_morfologico(municipio_id, distrito_cd, agressivo=args.agressivo)
        relatorio(municipio_id, distrito_cd, "APOS P1")

        # P0-finalizador: trabalha em cima da geometria suavizada (nao
        # regenera from-setores), preservando o P1.
        print("\n[P0-finalizador] consolidando fragmentos residuais do P1...")
        p0_finalizador_geometrico(municipio_id, distrito_cd)
        relatorio(municipio_id, distrito_cd, "APOS P0-FIM")

    # Consolida hash+audit 1 vez por rerun. Se geometria nao mudou (rerun
    # deterministico), nada e versionado. Se mudou, versao++ e linha nova
    # em microregioes_audit.
    # modo_execucao explicito no motivo pra rastrear o que rodou.
    modos = []
    if args.reset_from_setores:
        modos.append("reset")
    if args.agressivo:
        modos.append("agressivo")
    if args.skip_p1:
        modos.append("skip-p1")
    if not modos:
        modos.append("normal")
    modo = "+".join(modos)
    passos = "p2_p0" if args.skip_p1 else (
        "p2_p0_p1agr_p0fim" if args.agressivo else "p2_p0_p1_p0fim"
    )
    motivo = f"etl_23_{passos}__modo={modo}"
    print(f"\n[audit] modo_execucao='{modo}' -> motivo='{motivo}'")
    print("\n[audit] versionando microzonas que mudaram geometricamente...")
    with engine.begin() as conn:
        _atualizar_hash_e_audit(conn, municipio_id, distrito_cd, motivo)

    print(f"\nFIM. {time.time() - inicio:.0f}s")
    print("\nProximo: regenerar bordas dissolvidas (ETL 22).")


if __name__ == "__main__":
    main()
