"""
Download dos arquivos do TSE.
Todos os dados são públicos e gratuitos (CC-BY).
CDN: https://cdn.tse.jus.br/estatistica/sead/odsele/
"""
import os
import zipfile
import tempfile
from pathlib import Path
import httpx


TSE_CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele"

# Anos e tipos de arquivo para download
ELEICOES_MUNICIPAIS = [2016, 2020, 2024]  # Prefeito + Vereador
ELEICOES_GERAIS = [2018, 2022]            # Dep. Estadual + Dep. Federal + Senador + Gov
TODOS_ANOS = sorted(set(ELEICOES_MUNICIPAIS + ELEICOES_GERAIS))

ARQUIVOS = {
    "candidatos": "consulta_cand/consulta_cand_{ano}.zip",
    "votacao_munzona": "votacao_candidato_munzona/votacao_candidato_munzona_{ano}_BRASIL.zip",
    "municipio_tse_ibge": "municipio_tse_ibge/municipio_tse_ibge.zip",  # Mapeamento único
}

DATA_DIR = Path(__file__).parent.parent.parent / "dados_brutos"


async def baixar_arquivo(url: str, destino: Path) -> Path:
    """Baixa um arquivo com barra de progresso."""
    print(f"Baixando: {url}")
    async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
        async with client.stream("GET", url) as resp:
            resp.raise_for_status()
            total = int(resp.headers.get("content-length", 0))
            baixado = 0
            with open(destino, "wb") as f:
                async for chunk in resp.aiter_bytes(chunk_size=8192):
                    f.write(chunk)
                    baixado += len(chunk)
                    if total:
                        pct = baixado / total * 100
                        print(f"\r  {pct:.1f}%", end="", flush=True)
    print(f"\n  Salvo em: {destino}")
    return destino


def extrair_zip(zip_path: Path, destino_dir: Path) -> list[Path]:
    """Extrai todos os CSVs de um ZIP."""
    destino_dir.mkdir(parents=True, exist_ok=True)
    arquivos_extraidos = []
    with zipfile.ZipFile(zip_path, "r") as z:
        for nome in z.namelist():
            if nome.lower().endswith(".csv"):
                z.extract(nome, destino_dir)
                arquivos_extraidos.append(destino_dir / nome)
    return arquivos_extraidos


async def baixar_todos():
    """Baixa todos os arquivos do TSE necessários para o pipeline."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Mapeamento TSE x IBGE (único, sem ano)
    mapa_url = f"{TSE_CDN}/{ARQUIVOS['municipio_tse_ibge']}"
    mapa_zip = DATA_DIR / "municipio_tse_ibge.zip"
    if not mapa_zip.exists():
        await baixar_arquivo(mapa_url, mapa_zip)
    extrair_zip(mapa_zip, DATA_DIR / "municipio_tse_ibge")

    # Candidatos e votação por ano
    for ano in TODOS_ANOS:
        for tipo, template in [
            ("candidatos", ARQUIVOS["candidatos"]),
            ("votacao_munzona", ARQUIVOS["votacao_munzona"]),
        ]:
            nome_arquivo = template.format(ano=ano).split("/")[-1]
            zip_path = DATA_DIR / nome_arquivo

            if not zip_path.exists():
                url = f"{TSE_CDN}/{template.format(ano=ano)}"
                await baixar_arquivo(url, zip_path)

            destino_dir = DATA_DIR / f"{tipo}_{ano}"
            if not destino_dir.exists():
                extrair_zip(zip_path, destino_dir)

    print("\nDownload completo.")


if __name__ == "__main__":
    import asyncio
    asyncio.run(baixar_todos())
