"""
Download dos arquivos do TSE e IBGE.
Todos os dados são públicos e gratuitos.
"""
import zipfile
from pathlib import Path
import httpx
from app.etl.config import DATA_DIR, TSE_CDN, IBGE_SHAPEFILE_URL, TODOS_ANOS


def _baixar(url: str, destino: Path, desc: str = "") -> Path:
    if destino.exists():
        print(f"  [cache] {destino.name}")
        return destino

    print(f"  ↓ {desc or destino.name} ...", end="", flush=True)
    with httpx.Client(timeout=300, follow_redirects=True) as c:
        with c.stream("GET", url) as r:
            r.raise_for_status()
            total = int(r.headers.get("content-length", 0))
            baixado = 0
            with open(destino, "wb") as f:
                for chunk in r.iter_bytes(8192):
                    f.write(chunk)
                    baixado += len(chunk)
                    if total:
                        print(f"\r  ↓ {desc or destino.name} {baixado/total*100:.0f}%", end="", flush=True)
    print(f"\r  ✓ {desc or destino.name} ({destino.stat().st_size // 1024 // 1024} MB)")
    return destino


def _extrair(zip_path: Path, destino_dir: Path) -> list[Path]:
    destino_dir.mkdir(parents=True, exist_ok=True)
    arquivos = []
    with zipfile.ZipFile(zip_path) as z:
        for nome in z.namelist():
            if nome.lower().endswith(".csv") or nome.lower().endswith(".shp") \
               or nome.lower().endswith(".dbf") or nome.lower().endswith(".prj") \
               or nome.lower().endswith(".shx") or nome.lower().endswith(".cpg"):
                z.extract(nome, destino_dir)
                arquivos.append(destino_dir / nome)
    return arquivos


def baixar_municipios_tse_ibge() -> Path:
    """Mapeamento código TSE <-> código IBGE."""
    print("\n[1/4] Mapeamento municípios TSE ↔ IBGE")
    url = f"{TSE_CDN}/municipio_tse_ibge/municipio_tse_ibge.zip"
    zip_path = DATA_DIR / "municipio_tse_ibge.zip"
    dest_dir = DATA_DIR / "municipio_tse_ibge"

    _baixar(url, zip_path, "municipio_tse_ibge")
    if not list(dest_dir.glob("*.csv")):
        _extrair(zip_path, dest_dir)
    return dest_dir


def baixar_ibge_shapefile() -> Path:
    """Shapefile de municípios do IBGE (polígonos para o mapa)."""
    print("\n[2/4] Shapefile de municípios IBGE")
    zip_path = DATA_DIR / "BR_Municipios_2022.zip"
    dest_dir = DATA_DIR / "shapefiles"

    _baixar(IBGE_SHAPEFILE_URL, zip_path, "BR_Municipios_2022 (shapefile)")
    if not list(dest_dir.glob("*.shp")):
        _extrair(zip_path, dest_dir)
    return dest_dir


def baixar_candidatos(ano: int) -> Path:
    print(f"  candidatos {ano} ...", end="", flush=True)
    url = f"{TSE_CDN}/consulta_cand/consulta_cand_{ano}.zip"
    zip_path = DATA_DIR / f"cand_{ano}.zip"
    dest_dir = DATA_DIR / f"cand_{ano}"

    _baixar(url, zip_path, f"candidatos {ano}")
    if not list(dest_dir.glob("*.csv")):
        _extrair(zip_path, dest_dir)
    return dest_dir


def baixar_votacao(ano: int) -> Path:
    print(f"  votação {ano} ...", end="", flush=True)
    url = f"{TSE_CDN}/votacao_candidato_munzona/votacao_candidato_munzona_{ano}_BRASIL.zip"
    zip_path = DATA_DIR / f"voto_{ano}.zip"
    dest_dir = DATA_DIR / f"voto_{ano}"

    _baixar(url, zip_path, f"votação {ano}")
    if not list(dest_dir.glob("*.csv")):
        _extrair(zip_path, dest_dir)
    return dest_dir


def baixar_tudo():
    DATA_DIR.mkdir(exist_ok=True)
    baixar_municipios_tse_ibge()
    baixar_ibge_shapefile()

    print("\n[3/4] Candidatos por eleição")
    for ano in TODOS_ANOS:
        baixar_candidatos(ano)

    print("\n[4/4] Votação por eleição")
    for ano in TODOS_ANOS:
        baixar_votacao(ano)

    print("\n✓ Download completo.\n")
