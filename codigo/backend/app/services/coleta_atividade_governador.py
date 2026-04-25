"""
Coleta de atividades do Governador de Sao Paulo (Tarcisio de Freitas).

Fontes (confirmadas em 23/04/2026):
  1. ALESP Dados Abertos XML:
     https://www.al.sp.gov.br/repositorioDados/legislacao/legislacao_normas.zip
     - ZIP com ~10MB (~118MB descomprimido), atualizado diariamente
     - Tag raiz: <Normas>, elementos: <LegislacaoNorma>
     - Campos relevantes: <Data>, <Numero>, <Ementa>, <IdTipo>, <URLFicha>
     - IdTipo=3 = DECRETO ESTADUAL (confirmado por inspeção em 23/04/2026)

  2. ALESP Repositorio HTML (texto completo):
     https://www.al.sp.gov.br/repositorio/legislacao/decreto/{ANO}/decreto-{NNNNN}-{DD.MM.YYYY}.html
     - Encoding ISO-8859-1
     - Contem: numero, ementa, texto integral, assinantes

Estrategia:
  - Baixa o ZIP uma vez
  - Filtra IdTipo=3 (decreto estadual) com data >= 2023-01-01
  - Deduplica por numero+data (o XML tem entradas repetidas)
  - Para cada decreto, busca HTML no repositorio
  - Verifica assinatura: "TARCISIO" no texto do HTML
  - UPSERT por url_fonte (idempotente)
  - Rate limit 1s entre chamadas HTML

Dependencias: httpx (ja presente no container), stdlib apenas.

Uso:
    docker exec ub_backend python -m app.services.coleta_atividade_governador
"""
import asyncio
import html as html_lib
import io
import re
import sys
import time
import zipfile
import xml.etree.ElementTree as ET
from datetime import date, datetime
from html.parser import HTMLParser
from typing import Optional

import httpx


# ---------------------------------------------------------------------------
# Configuracao
# ---------------------------------------------------------------------------

_URL_ZIP_ALESP = "https://www.al.sp.gov.br/repositorioDados/legislacao/legislacao_normas.zip"
_BASE_REPOSITORIO = "https://www.al.sp.gov.br/repositorio/legislacao/decreto"

# IdTipo=3 = DECRETO ESTADUAL (confirmado por inspecao do XML em 23/04/2026)
_ID_TIPO_DECRETO = "3"

# Mandato de Tarcisio comeca em jan/2023
_ANO_INICIO_MANDATO = 2023
_DATA_INICIO_MANDATO = "2023-01-01"

# Rate limit entre chamadas HTML (segundos) - respeito ao servidor da ALESP
_RATE_LIMIT_HTML = 1.0

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9",
}


# ---------------------------------------------------------------------------
# Parser HTML simples (sem dependencia de bs4)
# ---------------------------------------------------------------------------

class _TextExtractor(HTMLParser):
    """Extrai texto plano de HTML, ignorando scripts e estilos."""

    _SKIP_TAGS = {"script", "style", "head", "meta", "link", "noscript"}
    _BLOCK_TAGS = {"div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "br", "hr", "tr", "li"}

    def __init__(self):
        super().__init__()
        self._partes: list[str] = []
        self._ignorar = False
        self._em_h3 = False
        self._h3_partes: list[str] = []

    def handle_starttag(self, tag, attrs):
        t = tag.lower()
        if t in self._SKIP_TAGS:
            self._ignorar = True
        if t == "h3":
            self._em_h3 = True
        if t in self._BLOCK_TAGS:
            self._partes.append(" ")

    def handle_endtag(self, tag):
        t = tag.lower()
        if t in self._SKIP_TAGS:
            self._ignorar = False
        if t == "h3":
            self._em_h3 = False
            self._partes.append(" ")

    def handle_data(self, data):
        if self._ignorar:
            return
        stripped = data.strip()
        if stripped:
            self._partes.append(stripped)
            if self._em_h3:
                self._h3_partes.append(stripped)

    def get_text(self) -> str:
        return html_lib.unescape(" ".join(self._partes))

    def get_h3(self) -> str:
        return html_lib.unescape(" ".join(self._h3_partes))


def _extrair_texto_html(html_str: str) -> tuple[str, str]:
    """
    Extrai (texto_completo, ementa_h3) de um HTML da ALESP.
    """
    parser = _TextExtractor()
    try:
        parser.feed(html_str)
    except Exception:
        pass
    return parser.get_text(), parser.get_h3()


# ---------------------------------------------------------------------------
# Download e parse do ZIP/XML da ALESP
# ---------------------------------------------------------------------------

def _get_text_el(el: ET.Element, *tags: str) -> str:
    """Busca texto de sub-elemento por multiplas tags possiveis."""
    for tag in tags:
        no = el.find(tag)
        if no is not None and no.text:
            return no.text.strip()
    return ""


def _parsear_data_iso(data_str: str) -> Optional[date]:
    """
    Parseia data em formato ISO do XML da ALESP: "2023-01-24T00:00:00-03:00"
    Retorna apenas a data (sem hora/timezone).
    """
    if not data_str:
        return None
    # Pega os primeiros 10 chars: "2023-01-24"
    s = data_str.strip()[:10]
    try:
        return date.fromisoformat(s)
    except ValueError:
        # Tenta outros formatos
        for fmt in ["%d/%m/%Y", "%d.%m.%Y"]:
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue
        return None


def _baixar_e_parsear_xml() -> list[dict]:
    """
    Baixa o ZIP da ALESP e retorna lista de decretos estaduais do mandato Tarcisio.

    Schema confirmado:
      - Raiz: <Normas>
      - Elementos: <LegislacaoNorma>
      - Campos: <Data>, <Numero>, <Ementa>, <IdTipo>, <URLFicha>, <IdNorma>
      - Filtro: IdTipo=3 (decreto estadual) AND Data >= 2023-01-01
    """
    print("Baixando ALESP legislacao_normas.zip...")
    try:
        resp = httpx.get(
            _URL_ZIP_ALESP,
            headers=_HEADERS,
            timeout=120,
            follow_redirects=True,
        )
        resp.raise_for_status()
    except httpx.HTTPError as e:
        print(f"[ERRO] Falha ao baixar ZIP: {e}", file=sys.stderr)
        return []

    print(f"ZIP baixado: {len(resp.content):,} bytes")

    try:
        zf = zipfile.ZipFile(io.BytesIO(resp.content))
    except zipfile.BadZipFile as e:
        print(f"[ERRO] ZIP invalido: {e}", file=sys.stderr)
        return []

    nomes = zf.namelist()
    xml_bytes = zf.read("legislacao_normas.xml") if "legislacao_normas.xml" in nomes else None
    if xml_bytes is None:
        for nome in nomes:
            if nome.endswith(".xml"):
                xml_bytes = zf.read(nome)
                break

    if xml_bytes is None:
        print(f"[ERRO] Nenhum XML no ZIP. Conteudo: {nomes}", file=sys.stderr)
        return []

    print(f"Parseando XML ({len(xml_bytes):,} bytes)...")

    # Parse com fallback iso-8859-1
    root: Optional[ET.Element] = None
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        try:
            texto = xml_bytes.decode("iso-8859-1")
            texto = re.sub(r"<\?xml[^>]+\?>", '<?xml version="1.0" encoding="utf-8"?>', texto)
            root = ET.fromstring(texto.encode("utf-8"))
        except (UnicodeDecodeError, ET.ParseError) as e:
            print(f"[ERRO] Falha ao parsear XML: {e}", file=sys.stderr)
            return []

    if root is None:
        return []

    # Itera elementos LegislacaoNorma
    elementos = root.findall("LegislacaoNorma")
    if not elementos:
        # Fallback: todos os filhos diretos
        elementos = list(root)

    print(f"Total de elementos no XML: {len(elementos):,}")

    # Filtra e deduplica
    decretos: list[dict] = []
    vistos: set[str] = set()  # chave: numero+data para deduplicacao

    for el in elementos:
        id_tipo = _get_text_el(el, "IdTipo")
        if id_tipo != _ID_TIPO_DECRETO:
            continue

        data_str = _get_text_el(el, "Data")
        data_decreto = _parsear_data_iso(data_str)
        if data_decreto is None:
            continue
        if data_str[:10] < _DATA_INICIO_MANDATO:
            continue

        numero = _get_text_el(el, "Numero")
        ementa = _get_text_el(el, "Ementa")

        if not numero:
            continue

        # Deduplicacao (o XML tem entradas repetidas)
        chave = f"{numero}_{data_str[:10]}"
        if chave in vistos:
            continue
        vistos.add(chave)

        decretos.append({
            "numero": numero,
            "data_decreto": data_decreto,
            "ementa": ementa,
        })

    return decretos


# ---------------------------------------------------------------------------
# Busca HTML do repositorio ALESP
# ---------------------------------------------------------------------------

def _montar_url_repositorio(numero: str, data_decreto: date) -> str:
    """
    Monta URL do repositorio HTML da ALESP.
    Padrao: /repositorio/legislacao/decreto/{ANO}/decreto-{NNNNN}-{DD.MM.YYYY}.html
    Ex: /decreto/2024/decreto-68322-31.01.2024.html
    """
    numero_limpo = re.sub(r"[^\d]", "", numero)
    data_fmt = data_decreto.strftime("%d.%m.%Y")
    ano = data_decreto.year
    return f"{_BASE_REPOSITORIO}/{ano}/decreto-{numero_limpo}-{data_fmt}.html"


def _buscar_html_decreto(client: httpx.Client, url: str) -> Optional[str]:
    """
    Busca HTML do decreto no repositorio da ALESP.
    Retorna texto decodificado (ISO-8859-1) ou None se nao encontrado.
    """
    try:
        resp = client.get(url, headers=_HEADERS, timeout=20, follow_redirects=True)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.content.decode("iso-8859-1", errors="replace")
    except httpx.HTTPError:
        return None


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main() -> int:
    from app.core.database import AsyncSessionLocal
    from app.models.afiliados import AtividadeExecutivo
    from app.models.eleitoral import Candidato, Candidatura
    from sqlalchemy import select, func

    async with AsyncSessionLocal() as db:
        # ------------------------------------------------------------------
        # 1. Encontra candidato_id de Tarcisio de Freitas (Gov SP 2022 - eleito)
        # ------------------------------------------------------------------
        row = await db.execute(
            select(Candidato)
            .join(Candidatura, Candidatura.candidato_id == Candidato.id)
            .where(
                Candidato.nome_completo.ilike("%TARCISIO%FREITAS%"),
                func.upper(Candidatura.cargo) == "GOVERNADOR",
                Candidatura.ano == 2022,
                Candidatura.estado_uf == "SP",
                Candidatura.eleito.is_(True),
            )
            .order_by(Candidato.id.desc())
            .limit(1)
        )
        candidato = row.scalar_one_or_none()

        if candidato is None:
            print(
                "AVISO: Candidato Tarcisio de Freitas nao encontrado.\n"
                "Execute o ETL de candidatos (SP/2022/GOVERNADOR) primeiro.\n"
                "Encerrando sem insercoes.",
                file=sys.stderr,
            )
            return 1

        print(f"Candidato: id={candidato.id} nome={candidato.nome_urna}")

        # ------------------------------------------------------------------
        # 2. Baixa e parseia o XML da ALESP
        # ------------------------------------------------------------------
        decretos = _baixar_e_parsear_xml()
        print(f"Decretos estaduais filtrados (IdTipo=3, data>={_DATA_INICIO_MANDATO}): {len(decretos):,}")

        if not decretos:
            print(
                "[AVISO] Nenhum decreto encontrado no XML. Encerrando.",
                file=sys.stderr,
            )
            return 1

        # ------------------------------------------------------------------
        # 3. Para cada decreto, busca HTML e verifica assinatura de Tarcisio
        # ------------------------------------------------------------------
        print(f"Buscando HTML de cada decreto (rate {_RATE_LIMIT_HTML}s)...")
        total_inseridos = 0
        total_ja_existiam = 0
        total_falhas_http = 0
        total_nao_tarcisio = 0

        with httpx.Client(timeout=25, follow_redirects=True) as client_http:
            for decreto in decretos:
                numero = decreto["numero"]
                data_decreto: date = decreto["data_decreto"]
                ementa_xml = decreto["ementa"]

                url_html = _montar_url_repositorio(numero, data_decreto)

                # Idempotencia: verifica no banco antes de buscar HTML
                row_exist = await db.execute(
                    select(AtividadeExecutivo).where(
                        AtividadeExecutivo.url_fonte == url_html,
                        AtividadeExecutivo.candidato_id == candidato.id,
                    )
                )
                if row_exist.scalar_one_or_none() is not None:
                    total_ja_existiam += 1
                    continue

                # Busca HTML com rate limit
                html = _buscar_html_decreto(client_http, url_html)
                time.sleep(_RATE_LIMIT_HTML)

                if html is None:
                    total_falhas_http += 1
                    continue

                texto_completo, ementa_h3 = _extrair_texto_html(html)
                texto_upper = texto_completo.upper()

                # Verifica assinatura de Tarcisio no texto do HTML
                tem_tarcisio = "TARCISIO" in texto_upper or "TARCÍSIO" in texto_upper
                if not tem_tarcisio:
                    total_nao_tarcisio += 1
                    continue

                # Prefere ementa do HTML (h3); fallback para XML
                ementa = ementa_h3 or ementa_xml
                numero_limpo = re.sub(r"[^\d]", "", numero)
                titulo = ementa[:500] if ementa else f"Decreto {numero_limpo}/{data_decreto.year}"

                print(f"  {numero_limpo}/{data_decreto.year} - \"{titulo[:60]}\" - inserido")

                db.add(AtividadeExecutivo(
                    candidato_id=candidato.id,
                    cargo="governador",
                    data=data_decreto,
                    tipo="decreto_estadual",
                    titulo=titulo,
                    descricao=ementa[:2000] if ementa else None,
                    url_fonte=url_html,
                ))
                total_inseridos += 1

                if total_inseridos % 50 == 0:
                    await db.flush()

        await db.commit()

        print(
            f"\nColeta concluida: {total_inseridos} inseridos, "
            f"{total_ja_existiam} ja existiam, "
            f"{total_falhas_http} falhas HTTP, "
            f"{total_nao_tarcisio} nao assinados por Tarcisio"
        )
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
