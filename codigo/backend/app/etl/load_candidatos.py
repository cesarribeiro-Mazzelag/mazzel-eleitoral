"""
Carrega candidatos e candidaturas de todos os anos no banco.
Filtra apenas União Brasil + predecessores históricos (DEM, PSL).
"""
import hashlib
import pandas as pd
from pathlib import Path
from sqlalchemy import text
from app.etl.config import (
    DATA_DIR, TSE_SEP, TSE_ENC, TODOS_ANOS, NUMEROS_UNIAO,
    COLUNAS_CAND, SITUACOES_ELEITO,
)


def _ler_csv(path: Path) -> pd.DataFrame:
    try:
        return pd.read_csv(path, sep=TSE_SEP, encoding=TSE_ENC, dtype=str,
                           low_memory=False, on_bad_lines="skip")
    except Exception as e:
        print(f"    ⚠ Erro lendo {path.name}: {e}")
        return pd.DataFrame()


def _normalizar(df: pd.DataFrame, ano: int) -> pd.DataFrame:
    df.columns = [c.strip() for c in df.columns]

    # Filtra só colunas que existem no arquivo
    cols = [c for c in COLUNAS_CAND if c in df.columns]
    df = df[cols].copy()

    # Filtro de partido
    if "NR_PARTIDO" not in df.columns:
        return pd.DataFrame()
    df["NR_PARTIDO"] = pd.to_numeric(df["NR_PARTIDO"], errors="coerce")
    df = df[df["NR_PARTIDO"].isin(NUMEROS_UNIAO)].copy()
    if df.empty:
        return df

    # Limpa strings
    for col in df.select_dtypes("object").columns:
        df[col] = df[col].str.strip()

    # Eleito
    sit_col = "DS_SIT_TOT_TURNO" if "DS_SIT_TOT_TURNO" in df.columns else None
    if sit_col:
        df["eleito"] = df[sit_col].isin(SITUACOES_ELEITO)
    else:
        df["eleito"] = False

    df["ano"] = ano
    return df


def _hash_cpf(cpf: str) -> str | None:
    if not cpf or cpf in ("-4", "#NULO#", "#NE#", ""):
        return None
    d = "".join(c for c in str(cpf) if c.isdigit())
    if len(d) != 11:
        return None
    return hashlib.sha256(d.encode()).hexdigest()


def _get_or_create_partido(conn, numero: int) -> int:
    r = conn.execute(text("SELECT id FROM partidos WHERE numero = :n"), {"n": numero}).fetchone()
    if r:
        return r[0]
    # Cria partido desconhecido se necessário
    r = conn.execute(text("""
        INSERT INTO partidos (numero, sigla, nome) VALUES (:n, :s, :nm)
        ON CONFLICT (numero) DO UPDATE SET sigla = EXCLUDED.sigla
        RETURNING id
    """), {"n": numero, "s": str(numero), "nm": f"Partido {numero}"}).fetchone()
    conn.commit()
    return r[0]


def _get_municipio_id(conn, codigo_tse: str) -> int | None:
    if not codigo_tse or not str(codigo_tse).strip().lstrip("0").isdigit():
        return None
    codigo = int(str(codigo_tse).strip().lstrip("0") or "0")
    r = conn.execute(
        text("SELECT id FROM municipios WHERE codigo_tse = :c"), {"c": codigo}
    ).fetchone()
    return r[0] if r else None


def carregar_candidatos(conn, ano: int):
    pasta = DATA_DIR / f"cand_{ano}"
    csvs = list(pasta.glob("*.csv"))
    if not csvs:
        print(f"  ⚠ Nenhum CSV em {pasta}")
        return 0

    frames = []
    for csv in csvs:
        df = _ler_csv(csv)
        if not df.empty:
            frames.append(_normalizar(df, ano))

    if not frames:
        return 0

    df = pd.concat(frames, ignore_index=True)
    df = df.drop_duplicates(subset=["SQ_CANDIDATO"]) if "SQ_CANDIDATO" in df.columns else df

    total_cand = 0
    total_cand_dup = 0

    for _, row in df.iterrows():
        seq = str(row.get("SQ_CANDIDATO", "")).strip()
        if not seq:
            continue

        nome   = str(row.get("NM_CANDIDATO", "")).strip()[:300]
        urna   = str(row.get("NM_URNA_CANDIDATO", "")).strip()[:200]
        cpf_h  = _hash_cpf(str(row.get("NR_CPF_CANDIDATO", "")))

        # Upsert candidato
        r = conn.execute(text("""
            INSERT INTO candidatos
                (sequencial_tse, nome_completo, nome_urna, cpf_hash,
                 genero, grau_instrucao, cor_raca, ocupacao)
            VALUES (:seq, :nome, :urna, :cpf,
                    :gen, :grau, :raca, :ocup)
            ON CONFLICT DO NOTHING
            RETURNING id
        """), {
            "seq":  seq, "nome": nome, "urna": urna, "cpf": cpf_h,
            "gen":  str(row.get("DS_GENERO",""))[:20],
            "grau": str(row.get("DS_GRAU_INSTRUCAO",""))[:100],
            "raca": str(row.get("DS_COR_RACA",""))[:50],
            "ocup": str(row.get("DS_OCUPACAO",""))[:200],
        }).fetchone()

        if r is None:
            r = conn.execute(
                text("SELECT id FROM candidatos WHERE sequencial_tse = :s"), {"s": seq}
            ).fetchone()
            total_cand_dup += 1
        else:
            total_cand += 1

        if not r:
            continue
        candidato_id = r[0]

        numero_p = int(row.get("NR_PARTIDO", 0) or 0)
        partido_id = _get_or_create_partido(conn, numero_p)

        cod_mun = str(row.get("CD_MUNICIPIO", "")).strip()
        mun_id  = _get_municipio_id(conn, cod_mun)
        uf      = str(row.get("SG_UF", "")).strip()[:2]
        cargo   = str(row.get("DS_CARGO", "")).strip()[:100]
        sit     = str(row.get("DS_SIT_TOT_TURNO", "")).strip()[:50]
        eleito  = bool(row.get("eleito", False))

        conn.execute(text("""
            INSERT INTO candidaturas
                (candidato_id, partido_id, municipio_id, estado_uf,
                 ano, cargo, situacao_final, eleito)
            VALUES (:cid, :pid, :mid, :uf, :ano, :cargo, :sit, :el)
            ON CONFLICT DO NOTHING
        """), {
            "cid": candidato_id, "pid": partido_id, "mid": mun_id,
            "uf": uf, "ano": ano, "cargo": cargo, "sit": sit, "el": eleito,
        })

    conn.commit()
    total = len(df)
    print(f"  ✓ {ano}: {total} registros → {total_cand} candidatos novos, {total_cand_dup} já existiam")
    return total
