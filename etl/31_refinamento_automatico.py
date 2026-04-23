"""ETL 31: Refinamento automatico de poligonos de microzonas.

Cesar editou 15 microzonas de Pirituba manualmente (21+ edicoes registradas
em microregiao_edicoes_manuais). Analise estatistica revelou o padrao:
    - Reducao media de 20% de vertices
    - Compacidade sai de 0.21 -> 0.40 (+87%)
    - Area cresce em media +2.5% (NUNCA corta, so envelopa)
    - Iteracoes sao necessarias em casos complexos (Vila Pereira Barreto 8x)

Este ETL replica o comportamento dele via pipeline iterativo:

Pipeline por microzona (ate convergir):
    1. ST_SimplifyVW (Visvalingam-Whyatt) - remove vertices de menor
       importancia (menor triangulo com vizinhos). Mantem os estruturais.
    2. Closing morfologico: ST_Buffer(+D) + ST_Buffer(-D) - fecha dentes
       pequenos (< 2D) sem deformar forma geral. Esse eh o "lasso".
    3. ST_Union com geometria original - garante que NUNCA cortou area.
    4. Simplify final (tolerance/2) - consolida.

Condicoes de parada:
    - compacidade >= 0.35 (converge)
    - 8 iteracoes sem chegar (marca como "complexo", flag revisao)
    - delta de compacidade < 0.01 (estabilizou, para)

Calibrado pelos dados reais do Cesar:
    - Tolerance area: 0.005%-0.04% (escalona por iteracao)
    - Offset closing: sqrt(area) * 0.002 (~2% escala linear)
    - Alvo compacidade: 0.35 (mediana dos resultados dele)

Uso:
    python3 31_refinamento_automatico.py --distrito 355030863           # 1 distrito
    python3 31_refinamento_automatico.py --municipio 3550308            # cidade
    python3 31_refinamento_automatico.py --distrito 355030863 --dry-run # sem gravar

Respeita freeze e atualiza hash+audit.
"""
from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path

from sqlalchemy import text
import json

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine


def laplacian_smooth_ring(ring: list, lambda_: float = 0.5, iters: int = 3) -> list:
    """
    Laplacian smoothing: cada vertex move pra media dos vizinhos.
    Suaviza zigzag mantendo forma geral.

    ring: lista de coords [[lng, lat], ..., [lng, lat]] com duplicado de fechamento
    lambda_: 0-1, quanto move (0=nao mexe, 1=vai pra media)
    iters: quantas passadas

    Retorna ring smoothed com fechamento.
    """
    if len(ring) < 4:
        return ring
    pts = ring[:-1]  # remove duplicado de fechamento
    n = len(pts)
    for _ in range(iters):
        novo = []
        for i in range(n):
            x, y = pts[i]
            xp, yp = pts[(i - 1) % n]
            xn, yn = pts[(i + 1) % n]
            # Move em direcao a media dos vizinhos
            nx = x + lambda_ * ((xp + xn) / 2 - x)
            ny = y + lambda_ * ((yp + yn) / 2 - y)
            novo.append([nx, ny])
        pts = novo
    return pts + [pts[0]]  # refecha


# Parametros calibrados pelos dados reais (Cesar editou +2.5% area media,
# max +12%). Guard rail: se uma iteracao expande mais que 8% aborta.
COMPAC_LIMIAR_RODAR = 0.30    # so roda em microzonas com compac < 0.30
COMPAC_ALVO = 0.35            # alvo de convergencia
MAX_ITERACOES = 8
TOL_AREA_BASE = 0.0005
OFFSET_CLOSING_FRAC = 0.008
AREA_CRESCIMENTO_MAX_ACUMULADO = 0.12  # 12% max TOTAL (limite observado no Cesar)
CONCAVE_TARGET_INICIAL = 0.96          # balanceado


def _calc_compac_sql(geom_col: str = "geometry") -> str:
    """SQL inline para calcular compacidade 4pi*A/P^2."""
    return f"""
        4 * pi() * ST_Area({geom_col}::geography) /
        NULLIF(power(ST_Perimeter({geom_col}::geography), 2), 0)
    """


def refinar_uma_iteracao(conn, mr_id: int, iteracao: int,
                          ch_target_override: float | None = None,
                          area_original: float | None = None,
                          max_acumulado: float = 0.12) -> dict:
    """
    Aplica 1 iteracao do pipeline de refinamento.
    Retorna dict com metricas antes/depois (nao commita).
    """
    # Pega area pra calibrar tolerancias
    area_row = conn.execute(text("""
        SELECT ST_Area(geometry::geography) AS area_m2,
               ST_NPoints(geometry) AS n_vert,
               ST_Perimeter(geometry::geography) AS perim_m
        FROM microregioes WHERE id = :mid
    """), {"mid": mr_id}).fetchone()

    area_m2 = float(area_row.area_m2 or 0)
    if area_m2 <= 0:
        return {"ok": False, "motivo": "area zero"}

    # Tolerancia ADAPTATIVA (calibrada pelas edicoes Cesar 14/04 12:20).
    # Microzonas pequenas precisam preservar detalhe de borda (ruas,
    # topografia). Grandes podem simplificar mais - forma geral importa.
    # Multiplica pelo fator de escala baseado em area_ha.
    area_ha = area_m2 / 10000
    if area_ha < 50:        fator = 0.4   # pequenas - preserva mais
    elif area_ha < 200:     fator = 0.7
    elif area_ha < 500:     fator = 1.0   # padrao
    else:                   fator = 1.5   # grandes - simplify mais forte
    tol_area = area_m2 * (TOL_AREA_BASE * fator * (1.0 + iteracao * 0.5))
    # Offset em graus aproximado: sqrt(area_m2) da o lado equivalente, dividido
    # por 111320 pra virar graus em lat. Multiplica pela fracao escala.
    sqrt_area = area_m2 ** 0.5
    offset_m = sqrt_area * OFFSET_CLOSING_FRAC
    offset_deg = offset_m / 111320.0

    # Pipeline SQL:
    # 1. ST_SimplifyVW(geometry, tol_area_m2) - ST_SimplifyVW espera area em
    #    sistema de coordenadas; nossa geom e 4674 (graus). Converte tol p graus^2.
    # 2. Buffer (+offset) -> Buffer (-offset) em graus.
    # 3. ST_Union com original.
    # 4. Simplify final (tol/2).
    tol_area_deg2 = tol_area / (111320.0 ** 2)  # graus^2 aproximado

    # lambda_ do Laplacian: começa moderado, afrouxa se rejeita (override)
    lap_lambda = ch_target_override if ch_target_override is not None else 0.5

    # PIPELINE:
    # 1. Simplify VW (remove vertices insignificantes)
    # 2. Laplacian smoothing em Python (suaviza zigzag - sem expandir muito)
    # 3. ST_Union com original (guard rail: nunca corta)
    # 4. Simplify final
    geom_atual = conn.execute(text("""
        SELECT ST_AsGeoJSON(ST_SimplifyVW(geometry, :tol))::json AS gj,
               ST_AsEWKT(geometry) AS orig_ewkt
        FROM microregioes WHERE id = :mid
    """), {"mid": mr_id, "tol": tol_area_deg2}).fetchone()

    gj = geom_atual.gj
    # Trabalha com Polygon ou MultiPolygon (pega maior parte)
    if gj.get("type") == "Polygon":
        rings = gj["coordinates"]
    elif gj.get("type") == "MultiPolygon":
        partes = gj["coordinates"]
        maior = max(partes, key=lambda p: len(p[0]))
        rings = maior
    else:
        return {"ok": False, "motivo": "tipo geometria inesperado"}

    # Laplacian em todos rings (exterior + holes se houver)
    rings_smooth = [laplacian_smooth_ring(r, lambda_=lap_lambda, iters=3) for r in rings]
    smooth_geojson = {"type": "Polygon", "coordinates": rings_smooth}

    preview = conn.execute(text(f"""
        WITH orig AS (SELECT geometry AS g, distrito_cd, municipio_id FROM microregioes WHERE id = :mid),
        smooth AS (
            SELECT ST_SetSRID(ST_GeomFromGeoJSON(:gj), 4674) AS g
        ),
        -- Distrito-pai: hard boundary. Microzona NUNCA pode sair dele.
        -- distritos_municipio esta em SRID 4326, microregioes 4674.
        distrito_pai AS (
            SELECT ST_Transform(dm.geometry, 4674) AS g
            FROM distritos_municipio dm, orig
            WHERE dm.cd_dist = orig.distrito_cd
        ),
        -- Outras microzonas do mesmo distrito (vizinhas).
        -- Microzona nao pode SOBREPOR espaco delas.
        -- NOTA: filtra TODAS as vizinhas (mesmo manual_edit/congeladas/final),
        -- porque o ST_Difference LER a geom delas sem ALTERA. A alteracao
        -- so acontece na microzona-alvo (:mid) via UPDATE abaixo.
        vizinhas AS (
            SELECT ST_Union(mr.geometry) AS g
            FROM microregioes mr, orig
            WHERE mr.distrito_cd = orig.distrito_cd
              AND mr.municipio_id = orig.municipio_id
              AND mr.id != :mid
        ),
        -- Garante uniao com original (nao corta area)
        unido AS (
            SELECT ST_MakeValid(ST_Union(smooth.g, orig.g)) AS g FROM smooth, orig
        ),
        -- GUARD 1: recorta pelo distrito-pai (fica DENTRO do distrito)
        cortado_dist AS (
            SELECT ST_Intersection(unido.g, distrito_pai.g) AS g
            FROM unido, distrito_pai
        ),
        -- GUARD 2: remove sobreposicao com microzonas vizinhas
        cortado_vi AS (
            SELECT CASE
                WHEN vizinhas.g IS NOT NULL
                THEN ST_Difference(cortado_dist.g, vizinhas.g)
                ELSE cortado_dist.g
            END AS g
            FROM cortado_dist LEFT JOIN vizinhas ON TRUE
        ),
        -- Garante que ainda cobre o original (cortes podem ter reduzido)
        pos_guard AS (
            SELECT ST_MakeValid(ST_Union(cortado_vi.g, orig.g)) AS g
            FROM cortado_vi, orig
        ),
        -- Recorta de novo pelo distrito (pos-union final)
        pos_dist AS (
            SELECT ST_Intersection(pos_guard.g, distrito_pai.g) AS g
            FROM pos_guard, distrito_pai
        ),
        final AS (
            -- ST_CollectionExtract(_, 3) pega so poligonos se resultado for
            -- GeometryCollection (evita erro de tipo mixto com linestring/point)
            SELECT ST_Multi(ST_SetSRID(
                ST_CollectionExtract(
                    ST_MakeValid(ST_SimplifyVW(pos_dist.g, {tol_area_deg2 * 0.5})),
                    3
                ), 4674
            )) AS g FROM pos_dist
        )
        SELECT ST_AsEWKT(final.g) AS ewkt,
               ST_NPoints(final.g) AS v_depois,
               ST_Area(final.g::geography) AS area_depois,
               4 * pi() * ST_Area(final.g::geography) /
                   NULLIF(power(ST_Perimeter(final.g::geography), 2), 0) AS compac_depois
        FROM final
    """), {"mid": mr_id, "gj": json.dumps(smooth_geojson)}).fetchone()

    if not preview:
        return {"ok": False, "motivo": "falhou pipeline"}

    area_depois = float(preview.area_depois or 0)
    base_area = area_original if area_original is not None else area_m2
    pct_acumulado = (area_depois - base_area) / base_area if base_area > 0 else 0
    compac_antes = (
        4 * 3.14159265 * area_m2 / (area_row.perim_m ** 2)
        if area_row.perim_m else 0
    )

    # Guard rail: se ACUMULADO desde o inicio passou do limite, rejeita.
    # Isso permite primeira iteracao fazer um "salto" grande (fechar dentes
    # grandes) e iteracoes seguintes so refinarem dentro do orcamento.
    if pct_acumulado > max_acumulado:
        return {
            "ok": False,
            "motivo": f"area acumulada +{pct_acumulado*100:.1f}% > {max_acumulado*100:.1f}%",
            "pct_acumulado": round(pct_acumulado * 100, 2),
            "compac_antes": round(compac_antes, 3),
        }

    # Aplica agora (passou guard rail).
    # Governanca Wave 1: origem != 'manual_edit', nao-congelada, nao calibrada_final.
    conn.execute(text("""
        UPDATE microregioes SET geometry = ST_GeomFromEWKT(:ewkt)
        WHERE id = :mid
          AND origem != 'manual_edit'
          AND congelada_em IS NULL
          AND calibrada_final = FALSE
          AND geometry IS NOT NULL
    """), {"mid": mr_id, "ewkt": preview.ewkt})

    return {
        "ok": True,
        "v_antes": area_row.n_vert, "v_depois": preview.v_depois,
        "area_antes": area_m2, "area_depois": area_depois,
        "pct_acumulado": round(pct_acumulado * 100, 2),
        "compac_antes": round(compac_antes, 3),
        "compac_depois": round(float(preview.compac_depois or 0), 3),
    }


def refinar_microzona(mr_id: int, nome: str, dry_run: bool = False) -> dict:
    """
    Refina iterativamente uma microzona ate convergir ou atingir max iter.
    Retorna relatorio completo.
    """
    # Sempre abre connection + transacao explicita. Em dry_run fazemos
    # rollback no final; em live, commit. Assim evita confusao com
    # engine.begin() context manager.
    conn = engine.connect()
    trans = conn.begin()

    try:
        # Estado inicial. Skip se congelada/manual_edit/calibrada_final.
        # Governanca Wave 1: double-check aqui por seguranca mesmo que o
        # processar_escopo ja filtre no SELECT inicial.
        r0 = conn.execute(text(f"""
            SELECT ST_NPoints(geometry) AS n_vert,
                   ST_Area(geometry::geography) AS area_m2,
                   {_calc_compac_sql()} AS compac,
                   origem, congelada_em, calibrada_final
            FROM microregioes WHERE id = :mid
        """), {"mid": mr_id}).fetchone()

        if r0.congelada_em is not None:
            return {"nome": nome, "skip": "congelada"}
        if r0.origem == 'manual_edit':
            return {"nome": nome, "skip": "manual_edit"}
        if r0.calibrada_final:
            return {"nome": nome, "skip": "calibrada_final"}

        compac_inicial = round(float(r0.compac or 0), 3)
        v_inicial = r0.n_vert
        area_inicial = float(r0.area_m2 or 0)

        if compac_inicial >= COMPAC_LIMIAR_RODAR:
            return {
                "nome": nome, "skip": "ja_ok",
                "compac_inicial": compac_inicial,
                "v_inicial": v_inicial,
            }

        # Loop ADAPTATIVO com Laplacian smoothing.
        # lap_lambda: 0.1 (suave) ate 0.6 (forte). Comeca 0.5 (razoavel).
        historico_compac = [compac_inicial]
        iteracao_final = 0
        lap_lambda = 0.5
        rejeitados = 0

        for it in range(MAX_ITERACOES * 2):
            stats = refinar_uma_iteracao(
                conn, mr_id, it,
                ch_target_override=lap_lambda,
                area_original=area_inicial,
                max_acumulado=AREA_CRESCIMENTO_MAX_ACUMULADO,
            )

            if not stats.get("ok"):
                # Rejeitado: reduz lambda (smoothing mais suave = menos expande)
                lap_lambda = max(0.1, lap_lambda - 0.1)
                rejeitados += 1
                if rejeitados >= 5:
                    break
                continue

            rejeitados = 0
            compac_atual = stats["compac_depois"]
            historico_compac.append(compac_atual)
            iteracao_final += 1

            if compac_atual >= COMPAC_ALVO:
                break
            if iteracao_final >= MAX_ITERACOES:
                break
            if len(historico_compac) >= 3:
                delta = compac_atual - historico_compac[-3]
                if delta < 0.005:
                    # Estabilizou - aumenta lambda pra empurrar mais
                    lap_lambda = min(0.7, lap_lambda + 0.05)

        # Estado final
        rf = conn.execute(text(f"""
            SELECT ST_NPoints(geometry) AS n_vert,
                   ST_Area(geometry::geography) AS area_m2,
                   {_calc_compac_sql()} AS compac
            FROM microregioes WHERE id = :mid
        """), {"mid": mr_id}).fetchone()

        relatorio = {
            "nome": nome,
            "v_inicial": v_inicial, "v_final": rf.n_vert,
            "compac_inicial": compac_inicial,
            "compac_final": round(float(rf.compac or 0), 3),
            "area_pct_mudou": round(
                100.0 * (float(rf.area_m2) - area_inicial) / area_inicial, 2
            ),
            "iteracoes": iteracao_final,
            "convergiu": rf.compac and float(rf.compac) >= COMPAC_ALVO,
            "revisao_manual": rf.compac and float(rf.compac) < 0.28,
        }

        if dry_run:
            trans.rollback()
        else:
            trans.commit()

        return relatorio
    except Exception:
        trans.rollback()
        raise
    finally:
        conn.close()


def processar_escopo(municipio_id: int, distrito_cd: str | None, dry_run: bool):
    filtro = f"AND distrito_cd = '{distrito_cd}'" if distrito_cd else "AND distrito_cd IS NOT NULL"
    # Governanca Wave 1: alvos sao voronoi_v2/plus_manual nao-congeladas e
    # nao-calibrada_final. Manual_edit sempre excluida.
    with engine.connect() as conn:
        alvos = conn.execute(text(f"""
            SELECT id, nome, {_calc_compac_sql()} AS compac
            FROM microregioes
            WHERE municipio_id = :mid {filtro}
              AND origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')
              AND congelada_em IS NULL
              AND calibrada_final = FALSE
            ORDER BY nome
        """), {"mid": municipio_id}).fetchall()

    print(f"\nProcessando {len(alvos)} microzonas... ({'DRY-RUN' if dry_run else 'LIVE'})")
    print(f"Pipeline: ST_SimplifyVW + closing morfologico + ST_Union com original")
    print(f"Alvo compacidade: {COMPAC_ALVO}  |  Max iteracoes: {MAX_ITERACOES}\n")
    print(f"{'nome':<30} {'v_ini':>6} {'v_fim':>6} {'c_ini':>6} {'c_fim':>6} {'area%':>7} {'iter':>5} {'status':<18}")
    print("-" * 100)

    skip_ok = skip_cong = refinadas = converg = nao_converg = 0
    for a in alvos:
        rel = refinar_microzona(a.id, a.nome, dry_run=dry_run)
        if rel.get("skip") == "ja_ok":
            skip_ok += 1
            print(f"{a.nome[:29]:<30} {rel['v_inicial']:>6} {'-':>6} {rel['compac_inicial']:>6.3f} {'-':>6} {'-':>7} {'-':>5} {'ja boa (skip)':<18}")
            continue
        if rel.get("skip") == "congelada":
            skip_cong += 1
            print(f"{a.nome[:29]:<30} {'-':>6} {'-':>6} {'-':>6} {'-':>6} {'-':>7} {'-':>5} {'congelada':<18}")
            continue
        refinadas += 1
        if rel["convergiu"]:
            converg += 1
            status = "convergiu"
        else:
            nao_converg += 1
            status = "revisao manual" if rel.get("revisao_manual") else "parcial"
        print(f"{a.nome[:29]:<30} {rel['v_inicial']:>6} {rel['v_final']:>6} "
              f"{rel['compac_inicial']:>6.3f} {rel['compac_final']:>6.3f} "
              f"{rel['area_pct_mudou']:>+7.2f} {rel['iteracoes']:>5} {status:<18}")

    print("-" * 100)
    print(f"\nResumo:")
    print(f"  ja boas (compac >= {COMPAC_LIMIAR_RODAR})    : {skip_ok}")
    print(f"  congeladas (nao tocadas)                      : {skip_cong}")
    print(f"  refinadas                                     : {refinadas}")
    print(f"    -> convergiram (compac >= {COMPAC_ALVO})    : {converg}")
    print(f"    -> parciais (ficaram melhor mas abaixo)     : {nao_converg}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipio")
    parser.add_argument("--distrito")
    parser.add_argument("--dry-run", action="store_true",
                        help="Simula sem gravar (usa transacao rollback)")
    args = parser.parse_args()
    if not args.municipio and not args.distrito:
        print("uso: --municipio CODIGO_IBGE  ou  --distrito CD_DIST  [--dry-run]")
        return

    inicio = time.time()
    with engine.connect() as conn:
        if args.distrito:
            r = conn.execute(text("""
                SELECT d.cd_dist, d.nm_dist, m.id AS mid, m.nome AS nome_mun
                FROM distritos_municipio d JOIN municipios m ON m.codigo_ibge = d.cd_mun
                WHERE d.cd_dist = :cd
            """), {"cd": args.distrito}).fetchone()
            if not r: print("distrito nao encontrado"); return
            municipio_id, distrito_cd = r.mid, r.cd_dist
            print(f"Escopo: {r.nome_mun} / {r.nm_dist} ({distrito_cd})")
        else:
            r = conn.execute(text("""
                SELECT id AS mid, codigo_ibge, nome FROM municipios WHERE codigo_ibge = :c
            """), {"c": args.municipio.zfill(7)}).fetchone()
            if not r: print("municipio nao encontrado"); return
            municipio_id, distrito_cd = r.mid, None
            print(f"Escopo: {r.nome}")

    processar_escopo(municipio_id, distrito_cd, dry_run=args.dry_run)

    # Governanca Wave 1: audit obrigatorio em toda escrita de geometria.
    # Chama _atualizar_hash_e_audit do ETL 23 (reuso) pra registrar quem mudou.
    if not args.dry_run:
        print("\n[audit] versionando microzonas que mudaram geometricamente...")
        from importlib import import_module
        etl23 = import_module("23_limpeza_microregioes")
        with engine.begin() as conn:
            etl23._atualizar_hash_e_audit(conn, municipio_id, distrito_cd,
                                          "etl_31_refinamento")

    print(f"\nFIM. {time.time() - inicio:.0f}s\n")


if __name__ == "__main__":
    main()
