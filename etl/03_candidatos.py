"""
PASSO 3 — Importar candidatos e candidaturas
Fonte: consulta_cand_{ano}.zip — TSE (todos os partidos, todos os cargos)

Popula as tabelas:
  - candidatos (dados pessoais — deduplicado por sequencial TSE + nome)
  - candidaturas (uma linha por candidatura por eleição)

Encoding: ISO-8859-1 (Latin-1)
Separador: ponto-e-vírgula

Estratégia de deduplicação de candidatos:
  O mesmo político candidato em 2016 e 2024 tem o mesmo NR_CPF_CANDIDATO
  mas sequenciais TSE diferentes por eleição. Usamos CPF hash como chave
  para evitar duplicatas na tabela `candidatos`.
"""
from __future__ import annotations
import sys
import csv
import hashlib
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))

from sqlalchemy import text
from db import get_session, test_connection
from config import DADOS_BRUTOS, TODOS_OS_ANOS, BATCH_SIZE, TSE_ENCODING, TSE_SEPARATOR
from download import download_candidatos, extract_zip

# Mapeamento de colunas TSE → campos internos
# O TSE muda nomes de colunas entre anos — mapeamos todos os variantes
COL_SEQUENCIAL = ["SQ_CANDIDATO"]
COL_NOME = ["NM_CANDIDATO"]
COL_NOME_URNA = ["NM_URNA_CANDIDATO"]
COL_CPF = ["NR_CPF_CANDIDATO"]
COL_PARTIDO_NUM = ["NR_PARTIDO"]
COL_PARTIDO_SIGLA = ["SG_PARTIDO"]
COL_CARGO = ["DS_CARGO", "CD_CARGO"]
COL_ANO = ["CD_ANO_ELEICAO", "ANO_ELEICAO"]
COL_UF = ["SG_UF"]
COL_MUNICIPIO_TSE = ["CD_MUNICIPIO", "CD_MUN_GOV", "SG_UE"]
COL_VOTOS = ["QT_VOTOS_NOMINAIS", "QT_VOTOS_NOMINAIS_VALIDOS"]
COL_SITUACAO = ["DS_SIT_TOT_TURNO", "DS_SITUACAO_CANDIDATO_TOT_TURNO"]
COL_GENERO = ["DS_GENERO"]
COL_RACA = ["DS_RACA_COR"]
COL_INSTRUCAO = ["DS_GRAU_INSTRUCAO"]
COL_OCUPACAO = ["DS_OCUPACAO"]
COL_NASCIMENTO = ["DT_NASCIMENTO"]
COL_NATURALIDADE = ["NM_MUNICIPIO_NASCIMENTO"]
COL_UF_NASC = ["SG_UF_NASCIMENTO"]
COL_DESPESA = ["VR_DESPESA_MAX_CAMPANHA"]
COL_RECEITA = ["VR_BEM_CANDIDATO"]  # approximation
COL_NUMERO_CAND = ["NR_CANDIDATO"]


def _get_col(row: dict, candidates: list[str], default=""):
    """Pega o valor da primeira coluna encontrada."""
    for c in candidates:
        if c in row:
            v = row[c].strip().strip('"')
            return v if v not in ("#NULO#", "#NE#", "#NI#", "") else default
    return default


def _hash_cpf(cpf: str) -> str | None:
    if not cpf or len(cpf) < 11:
        return None
    cpf_clean = "".join(c for c in cpf if c.isdigit())
    if len(cpf_clean) < 11:
        return None
    return hashlib.sha256(cpf_clean.encode()).hexdigest()


def _situacao_eleito(situacao: str) -> bool:
    # Usar startswith para evitar match em "NÃO ELEITO"
    s = situacao.upper().strip()
    return s.startswith("ELEITO") or s.startswith("ELEITA")


def _parse_votos(valor: str) -> int:
    try:
        return int(valor.replace(".", "").replace(",", ""))
    except (ValueError, AttributeError):
        return 0


def _parse_float(valor: str) -> float | None:
    try:
        return float(valor.replace(".", "").replace(",", "."))
    except (ValueError, AttributeError):
        return None


def processar_arquivo_csv(
    csv_path: Path,
    ano: int,
    municipios_map: dict,  # {codigo_tse: id}
    partidos_map: dict,    # {numero: id}
    candidatos_cache: dict,  # {cpf_hash: id} — atualizado em tempo real
    session,
) -> tuple[int, int]:
    """
    Processa um CSV de candidatos de um UF.
    Retorna (candidatos_inseridos, candidaturas_inseridas).
    """
    cands_inseridos = 0
    cands_ignorados = 0
    candidaturas_inseridas = 0
    candidaturas_ignoradas = 0

    batch_cands = []
    batch_candids = []

    with open(csv_path, encoding=TSE_ENCODING, errors="replace") as f:
        reader = csv.DictReader(f, delimiter=TSE_SEPARATOR, quotechar='"')

        for row in reader:
            # Campos básicos
            sequencial = _get_col(row, COL_SEQUENCIAL)
            if not sequencial:
                continue

            nome = _get_col(row, COL_NOME)
            nome_urna = _get_col(row, COL_NOME_URNA)
            cpf_raw = _get_col(row, COL_CPF)
            cpf_hash = _hash_cpf(cpf_raw)

            partido_num_str = _get_col(row, COL_PARTIDO_NUM)
            cargo = _get_col(row, COL_CARGO).upper()
            uf = _get_col(row, COL_UF)
            municipio_tse = _get_col(row, COL_MUNICIPIO_TSE)
            situacao_raw = _get_col(row, COL_SITUACAO)
            votos_str = _get_col(row, COL_VOTOS, "0")
            numero_cand = _get_col(row, COL_NUMERO_CAND)

            # Converte partido
            try:
                partido_num = int(partido_num_str)
            except (ValueError, TypeError):
                partido_num = 0
            partido_id = partidos_map.get(partido_num)

            # Municipio (apenas para eleições municipais)
            # TSE usa formatos diferentes: "1015" ou "01015" — normaliza para inteiro
            municipio_id = None
            if municipio_tse and municipio_tse.isdigit():
                municipio_id = municipios_map.get(int(municipio_tse))

            # Estado UF para eleições estaduais/federais
            estado_uf = uf if uf else None

            # Votos e situação
            votos = _parse_votos(votos_str)
            eleito = _situacao_eleito(situacao_raw)

            # --- Candidato ---
            # Deduplicação: se CPF hash já existe, usa o ID existente
            candidato_id = None
            if cpf_hash and cpf_hash in candidatos_cache:
                candidato_id = candidatos_cache[cpf_hash]
            else:
                # Insere novo candidato
                genero = _get_col(row, COL_GENERO)
                raca = _get_col(row, COL_RACA)
                instrucao = _get_col(row, COL_INSTRUCAO)
                ocupacao = _get_col(row, COL_OCUPACAO)
                nascimento_str = _get_col(row, COL_NASCIMENTO)
                naturalidade = _get_col(row, COL_NATURALIDADE)
                uf_nasc = _get_col(row, COL_UF_NASC)

                # Data de nascimento
                data_nasc = None
                if nascimento_str:
                    for fmt in ["%d/%m/%Y", "%Y-%m-%d"]:
                        try:
                            from datetime import datetime
                            data_nasc = datetime.strptime(nascimento_str, fmt).date()
                            break
                        except ValueError:
                            pass

                result = session.execute(
                    text("""
                        INSERT INTO candidatos
                            (sequencial_tse, nome_completo, nome_urna, cpf_hash,
                             genero, cor_raca, grau_instrucao, ocupacao,
                             data_nascimento, naturalidade, estado_nascimento_uf)
                        VALUES
                            (:seq, :nome, :urna, :cpf,
                             :gen, :raca, :inst, :ocup,
                             :nasc, :nat, :uf_nasc)
                        RETURNING id
                    """),
                    {
                        "seq": sequencial, "nome": nome[:300] if nome else None,
                        "urna": nome_urna[:200] if nome_urna else None,
                        "cpf": cpf_hash,
                        "gen": genero[:20] if genero else None,
                        "raca": raca[:50] if raca else None,
                        "inst": instrucao[:100] if instrucao else None,
                        "ocup": ocupacao[:200] if ocupacao else None,
                        "nasc": data_nasc,
                        "nat": naturalidade[:200] if naturalidade else None,
                        "uf_nasc": uf_nasc[:2] if uf_nasc else None,
                    }
                )
                row_id = result.fetchone()
                if row_id:
                    candidato_id = row_id[0]
                    if cpf_hash:
                        candidatos_cache[cpf_hash] = candidato_id
                    cands_inseridos += 1

            if not candidato_id:
                continue

            # --- Candidatura ---
            despesa = _parse_float(_get_col(row, COL_DESPESA))
            receita = _parse_float(_get_col(row, COL_RECEITA))

            # Verifica se candidatura já existe (mesmo candidato + ano + cargo + UF)
            existing = session.execute(
                text("""
                    SELECT id FROM candidaturas
                    WHERE candidato_id = :cid AND ano = :ano
                      AND cargo = :cargo AND estado_uf = :uf
                      AND (municipio_id = :mid OR (:mid IS NULL AND municipio_id IS NULL))
                """),
                {
                    "cid": candidato_id, "ano": ano, "cargo": cargo[:100],
                    "uf": estado_uf, "mid": municipio_id,
                }
            ).fetchone()

            if existing:
                candidaturas_ignoradas += 1
                continue

            session.execute(
                text("""
                    INSERT INTO candidaturas
                        (candidato_id, partido_id, municipio_id, estado_uf,
                         ano, cargo, numero_candidato, votos_total,
                         situacao_final, eleito,
                         despesa_campanha, receita_campanha)
                    VALUES
                        (:cid, :pid, :mid, :uf,
                         :ano, :cargo, :num, :votos,
                         :sit, :eleito,
                         :desp, :rec)
                """),
                {
                    "cid": candidato_id, "pid": partido_id, "mid": municipio_id,
                    "uf": estado_uf, "ano": ano,
                    "cargo": cargo[:100], "num": numero_cand[:10] if numero_cand else None,
                    "votos": votos, "sit": situacao_raw[:50] if situacao_raw else None,
                    "eleito": eleito, "desp": despesa, "rec": receita,
                }
            )
            candidaturas_inseridas += 1

            # Commit em batches
            if (cands_inseridos + candidaturas_inseridas) % BATCH_SIZE == 0:
                session.commit()

    session.commit()
    return cands_inseridos, candidaturas_inseridas


def importar_candidatos(anos: list[int] = None):
    if anos is None:
        anos = TODOS_OS_ANOS

    if not test_connection():
        return False

    session = get_session()
    try:
        # Cache de municípios
        print("[candidatos] Carregando cache de municípios...")
        rows = session.execute(text("SELECT codigo_tse, id FROM municipios")).fetchall()
        # Chave como inteiro (para normalizar "01015" → 1015 → match com banco)
        municipios_map = {int(r[0]): r[1] for r in rows if r[0] is not None}
        print(f"  {len(municipios_map)} municípios carregados")

        # Cache de partidos
        print("[candidatos] Carregando cache de partidos...")
        rows = session.execute(text("SELECT numero, id FROM partidos")).fetchall()
        partidos_map = {r[0]: r[1] for r in rows}
        print(f"  {len(partidos_map)} partidos carregados")

        # Cache de candidatos por CPF hash
        print("[candidatos] Carregando cache de candidatos existentes...")
        rows = session.execute(
            text("SELECT cpf_hash, id FROM candidatos WHERE cpf_hash IS NOT NULL")
        ).fetchall()
        candidatos_cache = {r[0]: r[1] for r in rows}
        print(f"  {len(candidatos_cache)} candidatos no cache")

    except Exception as e:
        print(f"[candidatos] ERRO ao carregar caches: {e}")
        session.close()
        return False

    total_cands = 0
    total_candidaturas = 0

    for ano in anos:
        print(f"\n{'='*50}")
        print(f"[candidatos] Processando ano {ano}")

        # Download se necessário
        zip_path = DADOS_BRUTOS / "candidatos" / f"consulta_cand_{ano}.zip"
        if not zip_path.exists():
            downloads = download_candidatos([ano])
            if ano not in downloads:
                print(f"  [skip] Não foi possível baixar candidatos {ano}")
                continue
            zip_path = downloads[ano]

        # Extrai
        extract_dir = extract_zip(zip_path)

        # Processa cada UF
        csvs = sorted(extract_dir.glob(f"consulta_cand_{ano}_*.csv"))
        if not csvs:
            # Pode ser que o arquivo de consulta esteja com nome diferente
            csvs = sorted(extract_dir.glob("*.csv"))

        if not csvs:
            print(f"  [aviso] Nenhum CSV encontrado em {extract_dir}")
            continue

        print(f"  {len(csvs)} arquivos UF para processar")

        for i, csv_path in enumerate(csvs, 1):
            uf = csv_path.stem.split("_")[-1]

            # Pula arquivo BRASIL (agregado de todos os UFs — dados duplicados)
            if uf.upper() == "BRASIL":
                print(f"  [{i}/{len(csvs)}] {uf}... [skip — agregado, dados já nos UFs]")
                continue

            print(f"  [{i}/{len(csvs)}] {uf}...", end=" ", flush=True)

            try:
                c, ca = processar_arquivo_csv(
                    csv_path, ano, municipios_map, partidos_map,
                    candidatos_cache, session
                )
                total_cands += c
                total_candidaturas += ca
                print(f"cands={c}, candidaturas={ca}")
            except Exception as e:
                session.rollback()
                print(f"\n  [erro] {csv_path.name}: {e}")

    total_db_cands = session.execute(text("SELECT COUNT(*) FROM candidatos")).scalar()
    total_db_cand = session.execute(text("SELECT COUNT(*) FROM candidaturas")).scalar()
    print(f"\n[candidatos] Sessão: +{total_cands} candidatos, +{total_candidaturas} candidaturas")
    print(f"[candidatos] Total banco: {total_db_cands} candidatos, {total_db_cand} candidaturas")

    session.close()
    return True


if __name__ == "__main__":
    import sys as _sys
    anos_arg = None
    if len(_sys.argv) > 1:
        anos_arg = [int(a) for a in _sys.argv[1:]]

    print("=== Passo 3 — Importar Candidatos e Candidaturas ===\n")
    importar_candidatos(anos_arg)
    print("\n[done]")
