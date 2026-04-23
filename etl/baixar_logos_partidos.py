"""
Script: baixa logos oficiais dos partidos da Wikipedia PT e extrai cor dominante.

Fluxo por partido:
  1. Tenta titulos candidatos na ordem (mapa manual + fallbacks genericos)
  2. Primeiro que retornar pageimage valida - baixa thumbnail 500px
  3. Extrai cor dominante do logo via Pillow (quantize 5 cores, pega a mais
     vibrante ignorando branco/preto/cinza)
  4. Salva PNG em codigo/frontend/public/logos/partidos/{SIGLA}.png
  5. UPDATE partidos SET logo_url, cor_primaria

Uso:
    python3 baixar_logos_partidos.py              # todos
    python3 baixar_logos_partidos.py PT PSOL UB   # so siglas especificas
    python3 baixar_logos_partidos.py --dry-run    # so reporta, nao salva
"""
from __future__ import annotations
import sys
import re
import io
import unicodedata
from pathlib import Path
from urllib.parse import quote
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
from sqlalchemy import text
from db import get_session, test_connection

try:
    import requests
    from PIL import Image
except ImportError as e:
    print(f"Dependencia faltando: {e}. Rode: pip install requests pillow")
    sys.exit(1)


WIKI_API = "https://pt.wikipedia.org/w/api.php"
# Wikipedia exige User-Agent identificavel (HTTP 403 caso contrario)
USER_AGENT = "UBElectoralPlatform/1.0 (https://uniaobrasil.org.br; contato@uniaobrasil.org.br)"
HTTP_HEADERS = {"User-Agent": USER_AGENT}

LOGO_DIR = Path(__file__).parent.parent / "codigo" / "frontend" / "public" / "logos" / "partidos"
LOGO_DIR.mkdir(parents=True, exist_ok=True)


# Mapa manual sigla -> lista de titulos candidatos na Wikipedia PT.
# Ordem importa: primeiro que der match ganha.
TITULOS_POR_SIGLA = {
    "PT":            ["Partido dos Trabalhadores"],
    "PSOL":          ["Partido Socialismo e Liberdade"],
    "PSDB":          ["Partido da Social Democracia Brasileira"],
    "PL":            ["Partido Liberal (2006)"],
    "PSD":           ["Partido Social Democrático (2011)"],
    "MDB":           ["Movimento Democrático Brasileiro (1980)"],
    "PP":            ["Progressistas"],
    "UNIÃO":         ["União Brasil"],
    "UNIAO":         ["União Brasil"],
    "PODEMOS":       ["Podemos (Brasil)"],
    "REPUBLICANOS":  ["Republicanos (Brasil)"],
    "NOVO":          ["Partido Novo"],
    "cidadania":     ["Cidadania (partido político)"],
    "CIDADANIA":     ["Cidadania (partido político)"],
    "SOLIDARIEDADE": ["Solidariedade (Brasil)"],
    "SD":            ["Solidariedade (Brasil)"],
    "REDE":          ["Rede Sustentabilidade"],
    "PV":            ["Partido Verde (Brasil)"],
    "PC do B":       ["Partido Comunista do Brasil"],
    "PCdoB":         ["Partido Comunista do Brasil"],
    "PCB":           ["Partido Comunista Brasileiro"],
    "PCO":           ["Partido da Causa Operária"],
    "PSTU":          ["Partido Socialista dos Trabalhadores Unificado"],
    "PDT":           ["Partido Democrático Trabalhista"],
    "PSB":           ["Partido Socialista Brasileiro"],
    "PTB":           ["Partido Trabalhista Brasileiro (1981)"],
    "PSC":           ["Partido Social Cristão"],
    "AVANTE":        ["Avante (partido político)"],
    "AGIR":          ["Agir (partido político)"],
    "PATRIOTA":      ["Patriota (partido político)"],
    "PRTB":          ["Partido Renovador Trabalhista Brasileiro"],
    "PMB":           ["Partido da Mulher Brasileira"],
    "PMN":           ["Partido da Mobilização Nacional"],
    "PRONA":         ["Partido de Reedificação da Ordem Nacional"],
    "PFL":           ["Partido da Frente Liberal"],
    "DEM":           ["Democratas (Brasil)"],
    "PSL":           ["Partido Social Liberal"],
    "PR":            ["Partido da República"],
    "PRB":           ["Partido Republicano Brasileiro"],
    "PROS":          ["Partido Republicano da Ordem Social"],
    "PHS":           ["Partido Humanista da Solidariedade"],
    "PPL":           ["Partido Pátria Livre"],
    "PSDC":          ["Partido Social Democrata Cristão"],
    "PEN":           ["Partido Ecológico Nacional"],
    "PTN":           ["Partido Trabalhista Nacional"],
    "PT do B":       ["Partido Trabalhista do Brasil"],
    "PTdoB":         ["Partido Trabalhista do Brasil"],
    "PRP":           ["Partido Republicano Progressista"],
    "PST":           ["Partido Social Trabalhista"],
    "PPR":           ["Partido Progressista Reformador"],
    "PSB":           ["Partido Socialista Brasileiro (1985)"],
    "PST":           ["Partido Social Trabalhista (1989)"],
}


def _fetch_pageimage(titulo: str) -> Optional[str]:
    """Consulta Wikipedia PT pageimages. Retorna URL do thumbnail 500px ou None."""
    r = requests.get(WIKI_API, params={
        "action": "query",
        "titles": titulo,
        "prop": "pageimages",
        "format": "json",
        "pithumbsize": 500,
        "redirects": 1,
    }, headers=HTTP_HEADERS, timeout=10)
    if r.status_code != 200:
        return None
    data = r.json()
    pages = data.get("query", {}).get("pages", {})
    if not pages:
        return None
    page = next(iter(pages.values()))
    return page.get("thumbnail", {}).get("source")


# Arquivos de UI que aparecem em toda pagina - ignorar no fallback
_IGNORAR_IMGS = (
    "commons-logo", "wikidata-logo", "wikibooks-logo", "wikinews-logo",
    "wikiquote-logo", "wikisource-logo", "wikiversity-logo", "wikivoyage-logo",
)


def _fetch_logo_fallback(titulo: str) -> Optional[str]:
    """
    Fallback: lista imagens da pagina, filtra pelo nome contendo 'logo' ou
    'logom' (logomarca). Devolve URL 500px da primeira que casar ou None.
    """
    r = requests.get(WIKI_API, params={
        "action": "query",
        "titles": titulo,
        "prop": "images",
        "format": "json",
        "imlimit": 500,
        "redirects": 1,
    }, headers=HTTP_HEADERS, timeout=10)
    if r.status_code != 200:
        return None
    pages = r.json().get("query", {}).get("pages", {})
    if not pages:
        return None
    imgs = list(pages.values())[0].get("images", [])

    candidatos = []
    for im in imgs:
        t = im.get("title", "")
        low = t.lower()
        if any(x in low for x in _IGNORAR_IMGS):
            continue
        if "logo" in low or "logom" in low or "símbol" in low or "simbol" in low:
            candidatos.append(t)

    if not candidatos:
        return None

    # Resolve URL 500px do primeiro candidato
    r2 = requests.get(WIKI_API, params={
        "action": "query",
        "titles": candidatos[0],
        "prop": "imageinfo",
        "iiprop": "url",
        "iiurlwidth": 500,
        "format": "json",
    }, headers=HTTP_HEADERS, timeout=10)
    if r2.status_code != 200:
        return None
    pages2 = r2.json().get("query", {}).get("pages", {})
    if not pages2:
        return None
    info = list(pages2.values())[0].get("imageinfo", [])
    if not info:
        return None
    return info[0].get("thumburl") or info[0].get("url")


def _buscar_logo(sigla: str, nome: str) -> tuple[Optional[str], Optional[str]]:
    """Tenta varios titulos. Retorna (titulo_que_funcionou, url_thumb)."""
    candidatos = list(TITULOS_POR_SIGLA.get(sigla, []))
    # Fallback generico: nome do partido e variantes com parenteses
    candidatos.extend([
        nome,
        f"{nome} (Brasil)",
        f"{nome} (partido político)",
    ])
    # Passada 1: pageimage direto
    for titulo in candidatos:
        try:
            url = _fetch_pageimage(titulo)
            if url:
                return titulo, url
        except Exception:
            continue
    # Passada 2: fallback via prop=images (pega do infobox mesmo que nao
    # esteja marcado como pageimage oficial)
    for titulo in candidatos:
        try:
            url = _fetch_logo_fallback(titulo)
            if url:
                return titulo + " [fallback]", url
        except Exception:
            continue
    return None, None


def _cor_dominante(img: Image.Image) -> str:
    """
    Cor dominante do logo: quantiza em 8 cores, escolhe a mais vibrante
    (maior saturacao) que NAO seja branco/preto/cinza/transparente.
    """
    img = img.convert("RGBA")
    # Reduz tamanho pra acelerar quantize
    img = img.resize((80, 80))

    # Pixels validos (nao transparentes)
    pixels = [p for p in img.getdata() if p[3] > 200]
    if not pixels:
        return "#64748B"

    # RGB only para quantizar
    rgb_img = Image.new("RGB", (80, 80))
    idx = 0
    for y in range(80):
        for x in range(80):
            if idx < len(pixels):
                rgb_img.putpixel((x, y), pixels[idx][:3])
                idx += 1

    q = rgb_img.quantize(colors=8)
    palette = q.getpalette()
    counts = sorted(q.getcolors(), reverse=True)  # [(count, idx), ...]

    def saturacao(r, g, b):
        mx, mn = max(r, g, b), min(r, g, b)
        return (mx - mn) / mx if mx > 0 else 0

    def eh_neutro(r, g, b):
        mx, mn = max(r, g, b), min(r, g, b)
        delta = mx - mn
        # Branco / preto / cinza / quase-cinza
        if mx > 240 and mn > 230: return True   # branco
        if mx < 30: return True                 # preto
        if delta < 25 and 40 < mx < 220: return True  # cinza medio
        return False

    melhor = None
    melhor_score = -1
    for count, i in counts:
        r, g, b = palette[i * 3], palette[i * 3 + 1], palette[i * 3 + 2]
        if eh_neutro(r, g, b):
            continue
        sat = saturacao(r, g, b)
        # Pontua combinando contagem e saturacao
        score = count * (0.3 + sat * 0.7)
        if score > melhor_score:
            melhor_score = score
            melhor = (r, g, b)

    if melhor is None:
        # Fallback: cor mais frequente mesmo se neutra
        count, i = counts[0]
        melhor = (palette[i * 3], palette[i * 3 + 1], palette[i * 3 + 2])

    return "#{:02X}{:02X}{:02X}".format(*melhor)


def _baixar_e_salvar(url: str, sigla: str) -> tuple[Path, str]:
    """Baixa imagem, salva como PNG, retorna (path, cor_hex)."""
    r = requests.get(url, timeout=15, headers=HTTP_HEADERS)
    r.raise_for_status()
    img = Image.open(io.BytesIO(r.content))

    cor = _cor_dominante(img)

    # Normaliza nome do arquivo (mesma regra do LogoPartido frontend:
    # toUpperCase -> NFD -> remove diacriticos -> remove espacos)
    nfd = unicodedata.normalize("NFD", sigla.upper())
    nome_arq = re.sub(r"[\u0300-\u036f]", "", nfd).replace(" ", "")
    nome_arq = re.sub(r"[^A-Z0-9]", "", nome_arq)
    path = LOGO_DIR / f"{nome_arq}.png"

    img.convert("RGBA").save(path, "PNG", optimize=True)
    return path, cor


def baixar_todos(siglas_filtro: Optional[list[str]] = None, dry_run: bool = False):
    if not test_connection():
        return False

    session = get_session()
    try:
        rows = session.execute(text("""
            SELECT id, numero, sigla, nome
            FROM partidos
            ORDER BY numero
        """)).fetchall()
    except Exception as e:
        print(f"[db] ERRO ao listar partidos: {e}")
        session.close()
        return False

    if siglas_filtro:
        siglas_upper = {s.upper() for s in siglas_filtro}
        rows = [r for r in rows if r.sigla.upper() in siglas_upper]

    print(f"Processando {len(rows)} partidos...\n")

    sucesso = 0
    erro = 0
    for r in rows:
        print(f"[{r.numero:3d} {r.sigla:15s}] ", end="", flush=True)
        try:
            titulo, url = _buscar_logo(r.sigla, r.nome)
            if not url:
                print("LOGO NAO ENCONTRADO")
                erro += 1
                continue

            path, cor = _baixar_e_salvar(url, r.sigla)
            rel_url = f"/logos/partidos/{path.name}"
            print(f"OK - {titulo[:40]:40s} cor={cor} -> {path.name}")

            if not dry_run:
                session.execute(
                    text("""
                        UPDATE partidos
                        SET logo_url = :url, cor_primaria = :cor
                        WHERE id = :id
                    """),
                    {"id": r.id, "url": rel_url, "cor": cor},
                )
                session.commit()
            sucesso += 1
        except Exception as e:
            print(f"ERRO: {e}")
            erro += 1

    print(f"\nResumo: {sucesso} OK, {erro} erros")
    session.close()
    return True


if __name__ == "__main__":
    args = sys.argv[1:]
    dry = "--dry-run" in args
    siglas = [a for a in args if not a.startswith("--")]
    baixar_todos(siglas or None, dry_run=dry)
