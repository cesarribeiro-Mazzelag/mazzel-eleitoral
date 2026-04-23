"""ETL 37 (v2 — 14/04/2026 17h): Reatribui setor_censitario -> microzona pelo
DISTRITO fisico. SO UPDATE em setores_censitarios.microregiao_id.

Mudanca critica vs v1: NAO mexe mais em microregioes.geometry. A v1 regenerava
geom via ST_Union(setores), o que destruiu calibracao em ~480 microzonas.

Regra de governanca (Wave 1, aprovada Cesar + GPT):
    - setores_censitarios.microregiao_id eh atribuicao ANALITICA (de onde
      veio o eleitor). Muda livremente.
    - microregioes.geometry eh atribuicao VISUAL (shape calibrado). Nao
      muda aqui. Se precisar regenerar, use ETL 23 com --reset-from-setores.

Fix historico: 591 setores em SP estavam atribuidos a microzonas de
distritos diferentes. Bug de cascata antiga. Reatribuicao corrige.

Filtros de target:
    - So reatribui setor se microzona ATUAL dele for tocavel
      (voronoi_v2/plus_manual E nao-congelada E nao-calibrada_final).
    - Setor cuja microzona atual for manual_edit/congelada/calibrada_final
      nao eh tocado (trust na calibracao humana).
    - Microzona DESTINO tambem precisa ser tocavel.

Uso:
    python3 37_corrigir_setores_distritos.py --municipio 3550308
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
from _governanca import FILTRO_ALVO_SEM_ALIAS  # noqa: E402


def reatribuir(codigo_ibge: str) -> dict:
    """Reatribui setores baguncados. SO escreve em setores_censitarios."""
    stats = {"baguncados_encontrados": 0, "reatribuidos": 0, "sem_destino": 0}
    cd_mun = codigo_ibge.zfill(7)

    with engine.begin() as conn:
        # Identifica setores cujo centroide cai em distrito X mas a microzona
        # atual pertence a distrito Y. Ambos source e destino precisam respeitar
        # FILTRO_ALVO (sem tocar manual_edit / congelada / calibrada_final).
        baguncados = conn.execute(text(f"""
            SELECT sc.id AS setor_id, sc.codigo_setor,
                   dm_fisico.cd_dist AS dist_correto,
                   sc.geometry AS g,
                   mr.id AS mr_atual,
                   mr.origem AS origem_atual,
                   mr.congelada_em IS NOT NULL AS cong_atual,
                   mr.calibrada_final AS final_atual
            FROM setores_censitarios sc
            JOIN microregioes mr ON mr.id = sc.microregiao_id
            JOIN distritos_municipio dm_fisico
                ON dm_fisico.cd_mun = :cd_mun
               AND ST_Contains(dm_fisico.geometry, ST_Centroid(sc.geometry))
            WHERE sc.codigo_municipio = :cd_mun
              AND mr.distrito_cd != dm_fisico.cd_dist
              -- source da reatribuicao: a microzona ATUAL do setor deve ser tocavel.
              -- Se for manual_edit/congelada/final, respeitamos e pulamos.
              AND {FILTRO_ALVO_SEM_ALIAS.replace('origem', 'mr.origem').replace('congelada_em', 'mr.congelada_em').replace('calibrada_final', 'mr.calibrada_final')}
        """), {"cd_mun": cd_mun}).fetchall()

        stats["baguncados_encontrados"] = len(baguncados)
        print(f"  baguncados tocaveis: {len(baguncados)}")

        if not baguncados:
            return stats

        # Pra cada setor baguncado: encontra microzona destino do distrito
        # fisico correto que tambem seja tocavel (FILTRO_ALVO).
        for b in baguncados:
            destino = conn.execute(text(f"""
                SELECT mr.id FROM microregioes mr
                WHERE mr.distrito_cd = :cd_correto
                  AND {FILTRO_ALVO_SEM_ALIAS.replace('origem', 'mr.origem').replace('congelada_em', 'mr.congelada_em').replace('calibrada_final', 'mr.calibrada_final')}
                ORDER BY ST_Distance(mr.geometry, ST_Transform(ST_Centroid(:g_setor), 4674))
                LIMIT 1
            """), {"cd_correto": b.dist_correto, "g_setor": b.g}).fetchone()

            if not destino:
                stats["sem_destino"] += 1
                continue

            # UPDATE apenas em setores_censitarios. microregioes.geometry
            # permanece intocada.
            conn.execute(text("""
                UPDATE setores_censitarios SET microregiao_id = :novo
                WHERE id = :sid
            """), {"novo": destino.id, "sid": b.setor_id})
            stats["reatribuidos"] += 1

    return stats


def compliance_check() -> dict:
    """Verifica via analise estatica que ETL 37 nao escreve em geometry.

    Heuristica: procura SO por execucoes reais `conn.execute(text(...UPDATE microregioes...`,
    ignorando strings literais em comentarios/docstrings/regex patterns.
    """
    import re
    path = Path(__file__).parent / "37_corrigir_setores_distritos.py"
    txt = path.read_text()
    warnings = []

    # Detecta conn.execute(text(...)) com UPDATE microregioes dentro
    execs = re.findall(
        r"conn\.execute\(text\(\s*\"\"\"(.*?)\"\"\"", txt, re.I | re.S
    )
    for sql in execs:
        if re.search(r"UPDATE\s+microregioes\s+(?:mr\s+)?SET\s+geometry", sql, re.I):
            warnings.append(
                f"ETL 37 nao pode UPDATE geometry. SQL: {sql[:80]!r}..."
            )

    return {"ok": not warnings, "warnings": warnings, "etl": "ETL 37 (v2)"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipio")
    parser.add_argument("--check-only", action="store_true",
                        help="roda so compliance check, sem tocar no banco")
    args = parser.parse_args()

    if args.check_only:
        c = compliance_check()
        print(f"Compliance: {'OK' if c['ok'] else 'FALHA'}")
        for w in c["warnings"]:
            print(f"  ⚠ {w}")
        return

    inicio = time.time()
    print(f"Municipio {args.municipio}...")
    s = reatribuir(args.municipio)
    print(f"\nFIM. {time.time() - inicio:.0f}s")
    print(f"  baguncados_encontrados: {s['baguncados_encontrados']}")
    print(f"  reatribuidos: {s['reatribuidos']}")
    print(f"  sem_destino: {s['sem_destino']}")


if __name__ == "__main__":
    main()
