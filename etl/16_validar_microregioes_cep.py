"""ETL: Validacao e refinamento de microregioes via CEPs (CNEFE).

Para cada microregiao, agrega os bairros (DSC_LOCALIDADE do CNEFE) via
setores -> ceps. Determina:
  - bairro_dominante_cep      (maior contagem)
  - pct_bairro_dominante      (% do dominante sobre total)
  - n_bairros_cep             (distintos)
  - flag_inconsistencia_cep   (>3 bairros distintos)
  - flag_revisao_nome         (40-59% — zona cinza)

Renomeia automaticamente apenas quando:
  - microregiao tem nome generico ("Região X — Y") OU "split_kmeans" no nome
  - bairro_dominante_cep >= 60%
  - bairro nao colide com outra microregiao do mesmo municipio

Uso:
    python3 16_validar_microregioes_cep.py --municipio 3550308
    python3 16_validar_microregioes_cep.py --uf SP
"""
from __future__ import annotations
import argparse
import re
import sys
import time
import unicodedata
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from db import engine

THRESHOLD_RENAME = 60.0     # >= esse % -> renomear automaticamente
THRESHOLD_REVISAO = 40.0    # entre esse e RENAME -> flag de revisao
MAX_BAIRROS = 3             # > esse -> flag de inconsistencia


def normalizar(s: str) -> str:
    if not s:
        return ""
    n = unicodedata.normalize("NFKD", s)
    n = "".join(c for c in n if not unicodedata.combining(c))
    n = re.sub(r"[^a-zA-Z0-9 ]+", " ", n).strip()
    n = re.sub(r"\s+", " ", n).title()
    return n


def processar_municipio(municipio_id: int, codigo_ibge: str, nome_mun: str):
    print(f"\n[{nome_mun} / {codigo_ibge}]")
    cd_mun = codigo_ibge.zfill(7)

    with engine.begin() as conn:
        # Para cada microregiao do municipio, agrega bairros via ceps -> setor -> microregiao
        result = conn.execute(text(f"""
            WITH micro_bairro AS (
                SELECT mr.id        AS micro_id,
                       mr.nome      AS micro_nome,
                       mr.origem    AS micro_origem,
                       cep.bairro   AS bairro,
                       COUNT(*)     AS n_ceps
                FROM microregioes mr
                JOIN setores_censitarios sc ON sc.microregiao_id = mr.id
                JOIN ceps cep ON cep.codigo_setor = sc.codigo_setor
                WHERE mr.municipio_id = {municipio_id}
                  AND sc.codigo_municipio = '{cd_mun}'
                  AND cep.bairro IS NOT NULL
                GROUP BY mr.id, mr.nome, mr.origem, cep.bairro
            ),
            agregado AS (
                SELECT mb.micro_id,
                       mb.micro_nome,
                       mb.micro_origem,
                       SUM(mb.n_ceps)::int AS total_ceps,
                       COUNT(*)::int       AS n_bairros,
                       (array_agg(mb.bairro ORDER BY mb.n_ceps DESC))[1] AS bairro_dom,
                       (array_agg(mb.n_ceps ORDER BY mb.n_ceps DESC))[1] AS n_dom
                FROM micro_bairro mb
                GROUP BY mb.micro_id, mb.micro_nome, mb.micro_origem
            )
            SELECT * FROM agregado
        """))
        rows = result.fetchall()

    print(f"      {len(rows)} microregioes com CEPs vinculados")

    n_renomeadas = 0
    n_revisao = 0
    n_inconsistencia = 0
    n_sem_dados = 0

    with engine.begin() as conn:
        # Reseta flags do municipio antes de re-validar
        conn.execute(text(f"""
            UPDATE microregioes SET
              bairro_dominante_cep = NULL,
              pct_bairro_dominante = NULL,
              n_bairros_cep = 0,
              flag_inconsistencia_cep = FALSE,
              flag_revisao_nome = FALSE
            WHERE municipio_id = {municipio_id}
        """))

        for r in rows:
            pct = (r.n_dom / r.total_ceps * 100) if r.total_ceps > 0 else 0.0
            inconsistente = r.n_bairros > MAX_BAIRROS

            # Decide renomeacao
            renomear = False
            revisao = False
            if pct >= THRESHOLD_RENAME:
                # Critério: nome atual eh "generico" (Region/Area/split)
                nome_generico = (
                    r.micro_nome.startswith("Região ") or
                    r.micro_nome.startswith("Área sem nome") or
                    "—" in r.micro_nome and r.micro_origem == "split_kmeans"
                )
                if nome_generico and r.bairro_dom:
                    renomear = True
            elif pct >= THRESHOLD_REVISAO:
                revisao = True

            # Atualiza flags + dados CEP
            conn.execute(text(f"""
                UPDATE microregioes SET
                  bairro_dominante_cep = :bd,
                  pct_bairro_dominante = :pct,
                  n_bairros_cep = :nb,
                  flag_inconsistencia_cep = :inc,
                  flag_revisao_nome = :rev
                WHERE id = :mid
            """), {
                "bd": r.bairro_dom, "pct": round(pct, 2), "nb": r.n_bairros,
                "inc": inconsistente, "rev": revisao, "mid": r.micro_id,
            })

            if renomear:
                # Verifica se nome ja existe (UNIQUE)
                novo_pad = f"{normalizar(r.bairro_dom)}-{r.micro_id}"
                conn.execute(text("""
                    UPDATE microregioes SET nome = :n, nome_padronizado = :p
                    WHERE id = :id
                """), {"n": r.bairro_dom, "p": novo_pad, "id": r.micro_id})
                n_renomeadas += 1
            if revisao:
                n_revisao += 1
            if inconsistente:
                n_inconsistencia += 1

        # Microregioes sem CEPs vinculados (sem dados pra validar)
        sem = conn.execute(text(f"""
            SELECT COUNT(*) AS n FROM microregioes
            WHERE municipio_id = {municipio_id}
              AND id NOT IN (SELECT DISTINCT mr2.id FROM microregioes mr2
                             JOIN setores_censitarios sc ON sc.microregiao_id = mr2.id
                             JOIN ceps c ON c.codigo_setor = sc.codigo_setor
                             WHERE mr2.municipio_id = {municipio_id})
        """)).fetchone()
        n_sem_dados = sem.n

    print(f"      renomeadas (>=60% dominante): {n_renomeadas}")
    print(f"      flag revisao (40-59%): {n_revisao}")
    print(f"      flag inconsistencia (>3 bairros): {n_inconsistencia}")
    print(f"      sem CEPs vinculados: {n_sem_dados}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipio", help="Codigo IBGE")
    parser.add_argument("--uf", default=None)
    args = parser.parse_args()

    inicio = time.time()
    with engine.connect() as conn:
        if args.municipio:
            r = conn.execute(text(
                "SELECT id, codigo_ibge, nome FROM municipios WHERE codigo_ibge = :c"
            ), {"c": args.municipio.zfill(7)}).fetchone()
            if not r:
                print(f"Municipio {args.municipio} nao encontrado")
                return
            municipios = [(r.id, r.codigo_ibge, r.nome)]
        elif args.uf:
            rs = conn.execute(text(
                "SELECT id, codigo_ibge, nome FROM municipios WHERE estado_uf = :uf ORDER BY id"
            ), {"uf": args.uf.upper()})
            municipios = [(r.id, r.codigo_ibge, r.nome) for r in rs]
        else:
            print("Uso: --municipio CODIGO_IBGE  ou  --uf SP")
            return

    for mid, cibge, nome in municipios:
        try:
            processar_municipio(mid, cibge, nome)
        except Exception as e:
            print(f"  ERRO em {nome}: {e}")
            continue

    print(f"\nFIM. {time.time() - inicio:.0f}s")


if __name__ == "__main__":
    main()
