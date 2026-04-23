"""
Download dos arquivos do TSE com verificação de integridade e retomada.
"""
from __future__ import annotations
import os
import sys
import zipfile
import requests
from pathlib import Path
from typing import Optional
from config import TSE_CDN, DADOS_BRUTOS, TODOS_OS_ANOS


def _download_file(url: str, dest: Path, desc: str = "") -> bool:
    """Baixa arquivo com barra de progresso. Retoma download parcial."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")

    headers = {}
    start = 0
    if tmp.exists():
        start = tmp.stat().st_size
        headers["Range"] = f"bytes={start}-"

    try:
        r = requests.get(url, headers=headers, stream=True, timeout=60)

        # 416 = Range Not Satisfiable (arquivo já completo no .part)
        if r.status_code == 416:
            tmp.rename(dest)
            print(f"  [ok] {desc} já baixado")
            return True

        if r.status_code not in (200, 206):
            print(f"  [erro] HTTP {r.status_code} para {url}")
            return False

        total = int(r.headers.get("content-length", 0)) + start
        mode = "ab" if start > 0 else "wb"

        downloaded = start
        with open(tmp, mode) as f:
            for chunk in r.iter_content(chunk_size=65536):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = downloaded / total * 100
                        print(f"\r  {desc}: {pct:.1f}% ({downloaded/1024/1024:.1f} MB)", end="", flush=True)

        print()

        # Valida o zip baixado
        if dest.suffix == ".zip":
            if not _is_valid_zip(tmp):
                print(f"  [erro] ZIP inválido após download: {dest.name}")
                return False

        tmp.rename(dest)
        print(f"  [ok] {dest.name} ({dest.stat().st_size/1024/1024:.1f} MB)")
        return True

    except requests.RequestException as e:
        print(f"  [erro] {e}")
        return False


def _is_valid_zip(path: Path) -> bool:
    """Verifica se o arquivo ZIP está íntegro (central directory presente)."""
    try:
        with zipfile.ZipFile(path) as z:
            z.namelist()
        return True
    except zipfile.BadZipFile:
        return False


def download_candidatos(anos: list[int] = None) -> dict[int, Path]:
    """
    Baixa os arquivos de candidatos do TSE.
    URL: {TSE_CDN}/consulta_cand/consulta_cand_{ano}.zip
    Retorna dict {ano: Path} para os anos baixados com sucesso.
    """
    if anos is None:
        anos = TODOS_OS_ANOS

    resultados = {}
    pasta = DADOS_BRUTOS / "candidatos"
    pasta.mkdir(parents=True, exist_ok=True)

    for ano in anos:
        dest = pasta / f"consulta_cand_{ano}.zip"

        # Se já existe e é válido, pula
        if dest.exists() and _is_valid_zip(dest):
            print(f"  [skip] consulta_cand_{ano}.zip já existe e é válido")
            resultados[ano] = dest
            continue

        # Remove zip corrompido anterior se existir
        if dest.exists():
            print(f"  [aviso] ZIP corrompido encontrado, removendo: {dest.name}")
            dest.unlink()

        url = f"{TSE_CDN}/consulta_cand/consulta_cand_{ano}.zip"
        print(f"\n[download] Candidatos {ano}")
        if _download_file(url, dest, f"cand_{ano}"):
            resultados[ano] = dest
        else:
            print(f"  [aviso] Pulando ano {ano} (falha no download)")

    return resultados


def download_votos_municipio(anos: list[int] = None) -> dict[int, Path]:
    """
    Baixa os arquivos de votação por município/zona.
    URL: {TSE_CDN}/votacao_candidato_munzona/votacao_candidato_munzona_{ano}.zip
    """
    if anos is None:
        anos = TODOS_OS_ANOS

    resultados = {}
    pasta = DADOS_BRUTOS / "votos"
    pasta.mkdir(parents=True, exist_ok=True)

    for ano in anos:
        dest = pasta / f"votacao_candidato_munzona_{ano}.zip"

        if dest.exists() and _is_valid_zip(dest):
            print(f"  [skip] votacao_candidato_munzona_{ano}.zip já existe e é válido")
            resultados[ano] = dest
            continue

        if dest.exists():
            print(f"  [aviso] ZIP corrompido encontrado, removendo: {dest.name}")
            dest.unlink()

        url = f"{TSE_CDN}/votacao_candidato_munzona/votacao_candidato_munzona_{ano}.zip"
        print(f"\n[download] Votos por município/zona {ano}")
        if _download_file(url, dest, f"votos_{ano}"):
            resultados[ano] = dest
        else:
            print(f"  [aviso] Pulando ano {ano} (falha no download)")

    return resultados


def download_zonas_eleitorais(ano: int = 2024) -> Optional[Path]:
    """
    Baixa arquivo de zonas e locais de votação (eleitorado_local_votacao).
    Usa o ano mais recente disponível.
    """
    pasta = DADOS_BRUTOS / "zonas"
    pasta.mkdir(parents=True, exist_ok=True)
    dest = pasta / f"eleitorado_local_votacao_{ano}.zip"

    if dest.exists() and _is_valid_zip(dest):
        print(f"  [skip] eleitorado_local_votacao_{ano}.zip já existe")
        return dest

    if dest.exists():
        dest.unlink()

    url = f"{TSE_CDN}/eleitorado_local_votacao/eleitorado_local_votacao_{ano}.zip"
    print(f"\n[download] Zonas eleitorais {ano}")
    if _download_file(url, dest, f"zonas_{ano}"):
        return dest
    return None


def extract_zip(zip_path: Path, dest_dir: Path = None) -> Path:
    """Extrai ZIP para diretório. Retorna o diretório de extração."""
    if dest_dir is None:
        dest_dir = zip_path.parent / zip_path.stem

    dest_dir.mkdir(parents=True, exist_ok=True)

    # Verifica se já foi extraído (tem arquivos CSV)
    existing = list(dest_dir.glob("*.csv"))
    if existing:
        print(f"  [skip] {zip_path.name} já extraído ({len(existing)} CSVs)")
        return dest_dir

    print(f"  [extract] {zip_path.name} → {dest_dir}")
    with zipfile.ZipFile(zip_path) as z:
        z.extractall(dest_dir)

    csvs = list(dest_dir.glob("*.csv"))
    print(f"  [ok] {len(csvs)} arquivos extraídos")
    return dest_dir


if __name__ == "__main__":
    print("=== Download TSE — Plataforma Eleitoral ===\n")

    anos_arg = None
    if len(sys.argv) > 1:
        anos_arg = [int(a) for a in sys.argv[1:]]
        print(f"Anos selecionados: {anos_arg}")

    print("\n--- Candidatos ---")
    download_candidatos(anos_arg)

    print("\n--- Votos por município/zona ---")
    download_votos_municipio(anos_arg)

    print("\n--- Zonas eleitorais ---")
    download_zonas_eleitorais()

    print("\n[done] Downloads concluídos.")
