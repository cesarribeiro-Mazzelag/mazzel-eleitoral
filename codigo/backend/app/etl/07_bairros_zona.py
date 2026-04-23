"""
ETL 07 — Bairro por Zona Eleitoral
Lê o arquivo eleitorado_local_votacao_ATUAL.zip (TSE) e atualiza
zonas_eleitorais.descricao com o bairro mais frequente de cada zona.

Uso:
    python -m app.etl.07_bairros_zona
"""
import csv
import io
import zipfile
from collections import defaultdict, Counter
from pathlib import Path
import os
from sqlalchemy import create_engine, text
from app.etl.config import DATA_DIR

DATABASE_URL_SYNC = os.environ.get("DATABASE_URL", "").replace("+asyncpg", "")


ZIP_PATH = DATA_DIR / "zonas" / "eleitorado_local_votacao_ATUAL.zip"


def _normalizar(bairro: str) -> str:
    """Capitaliza o nome do bairro de forma legível."""
    if not bairro or bairro.strip() in ("#NULO", "-1", ""):
        return ""
    partes = bairro.strip().split()
    minusculas = {"de", "da", "do", "das", "dos", "e", "em", "a", "o", "as", "os"}
    resultado = []
    for i, p in enumerate(partes):
        resultado.append(p.capitalize() if (i == 0 or p.lower() not in minusculas) else p.lower())
    return " ".join(resultado)


def rodar():
    if not ZIP_PATH.exists():
        print(f"Arquivo não encontrado: {ZIP_PATH}")
        print("Coloque o arquivo eleitorado_local_votacao_ATUAL.zip em dados_brutos/zonas/")
        return

    print(f"Lendo {ZIP_PATH.name}...")

    # Lê o CSV e agrupa: (sg_uf, cd_municipio_tse, nr_zona) → Counter[bairro]
    # Mapeamos nr_zona por município TSE para zona_id no banco depois
    zona_bairros: dict[tuple, Counter] = defaultdict(Counter)

    with zipfile.ZipFile(ZIP_PATH) as zf:
        nome_csv = next(n for n in zf.namelist() if n.endswith(".csv"))
        with zf.open(nome_csv) as f:
            reader = csv.DictReader(
                io.TextIOWrapper(f, encoding="latin-1"),
                delimiter=";",
                quotechar='"',
            )
            total = 0
            for row in reader:
                uf     = row.get("SG_UF", "").strip()
                cd_mun = row.get("CD_MUNICIPIO", "").strip()
                nr_zona = row.get("NR_ZONA", "").strip()
                bairro  = _normalizar(row.get("NM_BAIRRO", ""))
                if uf and cd_mun and nr_zona and bairro:
                    zona_bairros[(uf, cd_mun, nr_zona)][bairro] += 1
                total += 1
                if total % 100_000 == 0:
                    print(f"  {total:,} linhas lidas...")

    print(f"  {total:,} linhas. {len(zona_bairros):,} combinações uf/mun/zona.")

    # Bairro mais frequente por zona
    bairro_por_zona: dict[tuple, str] = {
        k: counter.most_common(1)[0][0]
        for k, counter in zona_bairros.items()
    }

    # Atualiza o banco
    engine = create_engine(DATABASE_URL_SYNC)
    with engine.begin() as conn:
        # Carrega mapeamento: (codigo_tse) → municipio.id
        rows = conn.execute(text("SELECT codigo_tse, id FROM municipios")).fetchall()
        tse_to_mun_id = {str(r[0]): r[1] for r in rows}

        # Carrega zonas: (municipio_id, numero) → zona.id
        rows_z = conn.execute(text("SELECT id, municipio_id, numero FROM zonas_eleitorais")).fetchall()
        zona_key_to_id = {(str(r[1]), str(r[2])): r[0] for r in rows_z}

        atualizados = 0
        nao_encontrados = 0
        for (uf, cd_mun_tse, nr_zona), bairro in bairro_por_zona.items():
            mun_id = tse_to_mun_id.get(cd_mun_tse)
            if not mun_id:
                nao_encontrados += 1
                continue
            zona_id = zona_key_to_id.get((str(mun_id), str(int(nr_zona))))
            if not zona_id:
                nao_encontrados += 1
                continue
            conn.execute(
                text("UPDATE zonas_eleitorais SET descricao = :bairro WHERE id = :id"),
                {"bairro": bairro, "id": zona_id},
            )
            atualizados += 1

    print(f"  ✓ {atualizados:,} zonas atualizadas com bairro principal")
    print(f"  - {nao_encontrados:,} zonas não encontradas no banco")


if __name__ == "__main__":
    rodar()
