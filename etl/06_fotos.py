"""
PASSO 6 — Download e indexação de fotos de candidatos
Fonte: TSE CDN — foto_cand{ano}_{UF}_div.zip por estado

Padrão de arquivo dentro do ZIP:
  F{UF}{SQ_CANDIDATO}_div.jpg
  ex: FSP250002527932_div.jpg → estado SP, sequencial 250002527932

Estratégia:
  1. Baixa ZIP por UF (tamanho médio: 100-2000 MB por estado)
  2. Extrai JPEGs para dados_brutos/fotos/{ano}/{UF}/
  3. Faz match sequencial_tse → candidato_id no banco
  4. Atualiza candidatos.foto_url com caminho relativo

O backend serve as fotos via endpoint GET /fotos/{sequencial}
"""
from __future__ import annotations
import sys
import struct
import zipfile
import io
import requests
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))

from sqlalchemy import text
from db import get_session, test_connection
from config import DADOS_BRUTOS

TSE_CDN = "https://cdn.tse.jus.br/estatistica/sead/eleicoes"

# Todos os estados + ZZ (exterior) + BR (geral)
UFS_MUNICIPAIS = [
    "AC", "AL", "AM", "AP", "BA", "CE", "ES", "GO",
    "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI",
    "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE",
    "SP", "TO",
]
UFS_GERAIS = UFS_MUNICIPAIS + ["DF", "BR"]  # DF: deputados/senador, BR: presidente

ANOS_MUNICIPAIS = [2024, 2020, 2016, 2012, 2008]
ANOS_GERAIS = [2022, 2018, 2014, 2010]


def _url_zip_fotos(ano: int, uf: str) -> str:
    return f"{TSE_CDN}/eleicoes{ano}/fotos/foto_cand{ano}_{uf}_div.zip"


def _pasta_fotos(ano: int, uf: str) -> Path:
    p = DADOS_BRUTOS / "fotos" / str(ano) / uf
    p.mkdir(parents=True, exist_ok=True)
    return p


def _download_zip(url: str, dest: Path) -> bool:
    """Baixa arquivo com suporte a Range (retomada)."""
    tmp = dest.with_suffix(".part")
    start = tmp.stat().st_size if tmp.exists() else 0
    headers = {"Range": f"bytes={start}-"} if start > 0 else {}

    try:
        r = requests.get(url, headers=headers, stream=True, timeout=60)
        if r.status_code == 416:
            tmp.rename(dest)
            return True
        if r.status_code not in (200, 206):
            return False

        total = int(r.headers.get("content-length", 0)) + start
        mode = "ab" if start > 0 else "wb"
        downloaded = start

        with open(tmp, mode) as f:
            for chunk in r.iter_content(65536):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = downloaded / total * 100
                        print(f"\r    {pct:.1f}% ({downloaded/1024/1024:.0f}/{total/1024/1024:.0f} MB)", end="", flush=True)
        print()
        tmp.rename(dest)
        return True
    except requests.RequestException as e:
        print(f"\n    erro download: {e}")
        return False


def _extrair_fotos_streaming(zip_path: Path, dest_dir: Path) -> int:
    """
    Extrai JPEGs do ZIP sem precisar de central directory.
    Necessário porque o TSE não garante zip íntegro no streaming.
    Retorna número de fotos extraídas.
    """
    extraidos = 0

    with open(zip_path, "rb") as f:
        data = f.read()

    pos = 0
    while pos < len(data) - 30:
        if data[pos:pos+4] != b"PK\x03\x04":
            pos += 1
            continue

        # Lê header local
        compressed_size = struct.unpack("<I", data[pos+18:pos+22])[0]
        fname_len = struct.unpack("<H", data[pos+26:pos+28])[0]
        extra_len = struct.unpack("<H", data[pos+28:pos+30])[0]
        fname_bytes = data[pos+30:pos+30+fname_len]

        try:
            fname = fname_bytes.decode("utf-8")
        except UnicodeDecodeError:
            fname = fname_bytes.decode("latin-1")

        data_start = pos + 30 + fname_len + extra_len
        compressed_data = data[data_start:data_start + compressed_size]

        if fname.lower().endswith((".jpg", ".jpeg")) and compressed_size > 0:
            dest_file = dest_dir / fname
            if not dest_file.exists():
                try:
                    # Dados podem estar comprimidos (deflate)
                    method = struct.unpack("<H", data[pos+8:pos+10])[0]
                    if method == 8:  # deflate
                        raw = __import__("zlib").decompress(compressed_data, -15)
                    else:  # stored
                        raw = compressed_data
                    dest_file.write_bytes(raw)
                    extraidos += 1
                except Exception:
                    pass

        pos = data_start + max(compressed_size, 1)

    return extraidos


def _extrair_fotos_zipfile(zip_path: Path, dest_dir: Path) -> int:
    """Extrai via zipfile padrão (mais rápido se o ZIP estiver íntegro)."""
    extraidos = 0
    try:
        with zipfile.ZipFile(zip_path) as z:
            for info in z.infolist():
                if info.filename.lower().endswith((".jpg", ".jpeg")):
                    dest_file = dest_dir / Path(info.filename).name
                    if not dest_file.exists():
                        dest_file.write_bytes(z.read(info.filename))
                        extraidos += 1
    except zipfile.BadZipFile:
        return -1  # Sinaliza para usar método streaming
    return extraidos


def _sequencial_do_filename(fname: str, uf: str) -> str | None:
    """
    Extrai sequencial_tse do nome do arquivo de foto.
    Padrão: F{UF}{sequencial}_div.jpg
    ex: FSP250002527932_div.jpg → '250002527932'
    """
    fname = Path(fname).stem  # remove extensão
    prefix = f"F{uf.upper()}"
    if fname.upper().startswith(prefix):
        seq = fname[len(prefix):]
        seq = seq.replace("_div", "").replace("_DIV", "")
        return seq if seq else None
    return None


def _carregar_mapa_seq_cpf(ano: int) -> dict[str, str]:
    """
    Le os CSVs de candidatos para o ano e cria mapa sequencial -> cpf_hash.
    Isso permite fazer match de fotos mesmo quando o sequencial no banco
    eh de um ano diferente (o candidatos.sequencial_tse guarda apenas o
    primeiro sequencial importado).
    """
    import csv
    import hashlib

    extract_dir = DADOS_BRUTOS / "candidatos" / f"consulta_cand_{ano}"
    if not extract_dir.exists():
        print(f"  [aviso] CSV dir nao encontrado: {extract_dir}")
        return {}

    mapa: dict[str, str] = {}
    csvs = sorted(extract_dir.glob(f"consulta_cand_{ano}_*.csv"))
    if not csvs:
        csvs = sorted(extract_dir.glob("*.csv"))

    for csv_path in csvs:
        try:
            with open(csv_path, encoding="latin-1", errors="replace") as f:
                reader = csv.DictReader(f, delimiter=";", quotechar='"')
                for row in reader:
                    seq = row.get("SQ_CANDIDATO", "").strip().strip('"')
                    cpf_raw = row.get("NR_CPF_CANDIDATO", "").strip().strip('"')
                    if not seq or not cpf_raw:
                        continue
                    cpf_clean = "".join(c for c in cpf_raw if c.isdigit())
                    if len(cpf_clean) < 11:
                        continue
                    cpf_hash = hashlib.sha256(cpf_clean.encode()).hexdigest()
                    mapa[seq] = cpf_hash
        except Exception as e:
            print(f"  [aviso] Erro lendo {csv_path.name}: {e}")

    return mapa


def indexar_fotos_no_banco(ano: int, uf: str, pasta: Path, session,
                           seq_to_cpf: dict[str, str] = None,
                           cpf_to_id: dict[str, int] = None) -> int:
    """
    Para cada foto extraida, encontra o candidato e atualiza foto_url.

    Estrategia de match (em ordem):
      1. Match direto: candidatos.sequencial_tse = sequencial do arquivo
      2. Match via CSV: sequencial -> cpf_hash (do CSV) -> candidato_id (do banco)

    Retorna numero de candidatos atualizados.
    """
    atualizados = 0
    fotos = list(pasta.glob(f"F{uf.upper()}*_div.jpg"))

    for foto in fotos:
        seq = _sequencial_do_filename(foto.name, uf)
        if not seq:
            continue

        # Caminho relativo para servir via backend
        foto_url = f"/fotos/{ano}/{uf}/{foto.name}"

        # Tentativa 1: match direto pelo sequencial_tse no banco
        result = session.execute(
            text("""
                UPDATE candidatos
                SET foto_url = :url
                WHERE sequencial_tse = :seq AND foto_url IS NULL
            """),
            {"url": foto_url, "seq": seq}
        )
        if result.rowcount > 0:
            atualizados += 1
            continue

        # Tentativa 2: match via CSV (sequencial deste ano -> cpf_hash -> candidato_id)
        if seq_to_cpf and cpf_to_id:
            cpf_hash = seq_to_cpf.get(seq)
            if cpf_hash:
                cand_id = cpf_to_id.get(cpf_hash)
                if cand_id:
                    result = session.execute(
                        text("""
                            UPDATE candidatos
                            SET foto_url = :url
                            WHERE id = :cid AND foto_url IS NULL
                        """),
                        {"url": foto_url, "cid": cand_id}
                    )
                    if result.rowcount > 0:
                        atualizados += 1

    if atualizados > 0:
        session.commit()
    return atualizados


def baixar_fotos_ano(ano: int, ufs: list[str] = None, apenas_indexar: bool = False):
    """Baixa e indexa fotos para um ano eleitoral."""
    if ufs is None:
        ufs = UFS_GERAIS if ano in [2022, 2018, 2014, 2010, 2006] else UFS_MUNICIPAIS

    if not test_connection():
        return False

    session = get_session()
    total_extraidos = 0
    total_indexados = 0

    # Carrega mapa sequencial->cpf_hash do CSV deste ano
    print(f"[fotos] Carregando mapa sequencial->cpf_hash do CSV {ano}...")
    seq_to_cpf = _carregar_mapa_seq_cpf(ano)
    print(f"  {len(seq_to_cpf)} mapeamentos sequencial->cpf carregados")

    # Carrega mapa cpf_hash->candidato_id do banco
    print(f"[fotos] Carregando mapa cpf_hash->id do banco...")
    rows = session.execute(
        text("SELECT cpf_hash, id FROM candidatos WHERE cpf_hash IS NOT NULL")
    ).fetchall()
    cpf_to_id = {r[0]: r[1] for r in rows}
    print(f"  {len(cpf_to_id)} candidatos com cpf_hash no banco")

    for uf in ufs:
        print(f"\n[fotos] {ano}/{uf}")
        pasta = _pasta_fotos(ano, uf)
        zip_dest = DADOS_BRUTOS / "fotos" / "zips" / f"foto_cand{ano}_{uf}_div.zip"
        zip_dest.parent.mkdir(parents=True, exist_ok=True)

        # Verifica se já foi extraído
        fotos_existentes = list(pasta.glob("*.jpg"))
        if fotos_existentes and not apenas_indexar:
            print(f"  [skip] {len(fotos_existentes)} fotos já extraídas")
            n_idx = indexar_fotos_no_banco(ano, uf, pasta, session,
                                           seq_to_cpf, cpf_to_id)
            total_indexados += n_idx
            continue

        if not apenas_indexar:
            # Verifica se ZIP existe
            if not zip_dest.exists():
                url = _url_zip_fotos(ano, uf)
                print(f"  Download: {url}")
                if not _download_zip(url, zip_dest):
                    print(f"  [skip] Falha no download de {uf}")
                    continue
            else:
                print(f"  [skip] ZIP já baixado ({zip_dest.stat().st_size/1024/1024:.0f} MB)")

            # Extrai
            print(f"  Extraindo...", end=" ", flush=True)
            n = _extrair_fotos_zipfile(zip_dest, pasta)
            if n == -1:
                print("ZIP inválido, tentando método streaming...")
                n = _extrair_fotos_streaming(zip_dest, pasta)
            print(f"{n} fotos")
            total_extraidos += n

        # Indexa no banco
        n_idx = indexar_fotos_no_banco(ano, uf, pasta, session,
                                       seq_to_cpf, cpf_to_id)
        print(f"  {n_idx} candidatos com foto_url atualizado")
        total_indexados += n_idx

    session.close()

    print(f"\n[fotos] {ano} concluido: {total_extraidos} fotos extraidas, {total_indexados} indexadas")
    return True


if __name__ == "__main__":
    import sys as _sys

    print("=== Passo 6 - Fotos de Candidatos ===\n")
    print("Tamanho total estimado por eleicao:")
    print("  2024 (municipal): ~12 GB")
    print("  2022 (geral):     ~8 GB")
    print()

    anos_arg = [2024]
    ufs_arg = None
    apenas_indexar = False
    reindexar_tudo = False

    if "--indexar" in _sys.argv:
        apenas_indexar = True
        _sys.argv.remove("--indexar")

    if "--reindexar" in _sys.argv:
        reindexar_tudo = True
        _sys.argv.remove("--reindexar")

    anos_num = [int(a) for a in _sys.argv[1:] if a.isdigit()]
    ufs_str = [a.upper() for a in _sys.argv[1:] if a.upper() in UFS_GERAIS]

    if anos_num:
        anos_arg = anos_num
    if ufs_str:
        ufs_arg = ufs_str

    if reindexar_tudo:
        # Limpa foto_url para reindexar com o algoritmo melhorado
        # Processa do mais recente ao mais antigo: foto mais nova tem prioridade
        print("[reindexar] Limpando foto_url de todos os candidatos...")
        from db import get_session as _gs
        s = _gs()
        r = s.execute(text("UPDATE candidatos SET foto_url = NULL WHERE foto_url IS NOT NULL"))
        s.commit()
        print(f"  {r.rowcount} registros limpos")
        s.close()
        # Ordena anos do mais recente ao mais antigo
        anos_arg = sorted(anos_arg, reverse=True)

    for ano in anos_arg:
        baixar_fotos_ano(ano, ufs_arg, apenas_indexar)

    print("\n[done]")
