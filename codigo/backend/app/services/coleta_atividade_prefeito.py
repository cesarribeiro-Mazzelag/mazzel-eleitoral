"""
Coleta de atividades do Prefeito de Sao Paulo (Ricardo Nunes).

Fonte (confirmada em 23/04/2026):
  DOCSP - Diario Oficial da Cidade de Sao Paulo
  URL: https://diariooficial.prefeitura.sp.gov.br/md_epubli_controlador.php
  - Sistema PHP/MySQL (ARQUIP) com renderizacao server-side
  - Sem autenticacao, sem captcha observado
  - Encoding ISO-8859-1
  - Total de resultados: ~1.300 para "NUNES decreto"

Descobertas tecnicas (23/04/2026):
  - Paginacao funciona via parametro GET: hdnInicio=0,10,20,... (NAO offset!)
  - Filtro dta_ini/dta_fim nao funciona (ignora data, retorna por relevancia)
  - Cada pagina tem exatamente 10 blocos "sumoDocumento"
  - Para cobrir todos os 1.300 resultados: iterar hdnInicio de 0 a 1290 (passo 10)

Estrategia:
  - Busca por palavras="NUNES decreto" sem filtro de data
  - Paginacao via hdnInicio=0,10,20,...
  - Split por "sumoDocumento" para isolar cada bloco
  - Extrai numero/data/ementa via regex de cada bloco
  - URL unica: decreto-NNNNN-YYYYMMDD (sem permalink disponivel)
  - UPSERT por url_fonte (idempotente)
  - Para quando 3 paginas consecutivas nao tem novos decretos de Nunes
  - Rate limit 0.5s entre paginas

Cobertura: todos os decretos de Nunes disponiveis no DOCSP (~1.300)

Dependencias: httpx (ja presente no container), stdlib apenas.

Uso:
    docker exec ub_backend python -m app.services.coleta_atividade_prefeito
"""
import asyncio
import html as html_lib
import re
import sys
import time
from datetime import date, datetime
from typing import Optional

import httpx


# ---------------------------------------------------------------------------
# Configuracao
# ---------------------------------------------------------------------------

_BASE_URL_DOCSP = "https://diariooficial.prefeitura.sp.gov.br/md_epubli_controlador.php"

# Rate limit entre paginas (segundos)
_RATE_LIMIT = 0.5

# Limite de seguranca: total esperado ~1.300, limite com margem
_MAX_PAGINAS = 200

# Itens por pagina no DOCSP (confirmado: 10)
_ITENS_POR_PAGINA = 10

# Paginas consecutivas sem novos decretos de Nunes antes de parar
_MAX_PAGINAS_SEM_NOVOS = 10

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Referer": "https://diariooficial.prefeitura.sp.gov.br/",
}

# Regex para numero e data do decreto
# Casos confirmados no DOCSP:
#   "DECRETO Nº 65.109, DE 23 DE ABRIL DE 2026"
#   "DECRETO N. 65.109, DE 23 DE ABRIL DE 2026"
#   "Decreto nº 65.617, de 23 de ABRIL de 2026"
_RE_DECRETO = re.compile(
    r"DECRETO\s+N[.°º]?\s*(\d{1,2}[.]\d{3})[,\s]+DE\s+(\d{1,2}\s+DE\s+\w+\s+DE\s+\d{4})",
    re.IGNORECASE,
)

_MESES_PT = {
    "janeiro": 1, "fevereiro": 2, "marco": 3, "abril": 4,
    "maio": 5, "junho": 6, "julho": 7, "agosto": 8,
    "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12,
}


# ---------------------------------------------------------------------------
# Helpers de parse
# ---------------------------------------------------------------------------

def _remover_tags_html(texto: str) -> str:
    """Remove tags HTML e decodifica entidades HTML."""
    sem_tags = re.sub(r"<[^>]+>", " ", texto)
    return html_lib.unescape(sem_tags)


def _parsear_data_extenso(data_str: str) -> Optional[date]:
    """
    Parseia "23 DE ABRIL DE 2026" -> date(2026, 4, 23).
    """
    if not data_str:
        return None
    s = data_str.strip().lower()
    partes = re.split(r"\s+de\s+", s)
    if len(partes) != 3:
        return None
    try:
        dia = int(partes[0].strip())
        mes_str = partes[1].strip()
        mes_str_clean = mes_str.replace("\xe7", "c")
        mes = _MESES_PT.get(mes_str, _MESES_PT.get(mes_str_clean, 0))
        ano = int(partes[2].strip())
        if mes == 0 or dia < 1 or dia > 31 or ano < 2000:
            return None
        return date(ano, mes, dia)
    except (ValueError, IndexError):
        return None


def _extrair_decreto_do_bloco(bloco_html: str) -> Optional[dict]:
    """
    Extrai metadados de um bloco HTML do DOCSP.

    Cada bloco comeca com 'sumoDocumento' e contem texto de uma materia.
    Retorna dict ou None se nao for decreto de Nunes.
    """
    # Remove tags e normaliza
    texto = _remover_tags_html(bloco_html)
    texto = " ".join(texto.split())
    texto_upper = texto.upper()

    # Verifica que contem DECRETO e NUNES como prefeito
    if "DECRETO" not in texto_upper or "NUNES" not in texto_upper:
        return None

    # Pega o primeiro match de DECRETO N. NUMERO, DE DATA
    match = _RE_DECRETO.search(texto)
    if not match:
        return None

    numero_raw = match.group(1)
    data_extenso = match.group(2).strip()
    data_decreto = _parsear_data_extenso(data_extenso)

    # Ementa: texto apos numero/data
    pos_fim = match.end()
    texto_apos = texto[pos_fim:pos_fim + 2500].strip()

    # Remove assinatura do final da ementa
    pos_assinatura = texto_apos.upper().find("RICARDO NUNES")
    if pos_assinatura > 20:
        ementa = texto_apos[:pos_assinatura].strip()
    else:
        ementa = texto_apos[:2000]

    ementa = " ".join(ementa.split())[:2000]

    # Titulo: primeira frase da ementa
    titulo_base = f"DECRETO N. {numero_raw}, DE {data_extenso.upper()}"
    if ementa and len(ementa) > 5:
        match_ponto = re.search(r"\.\s", ementa)
        if match_ponto and match_ponto.start() > 10:
            titulo = ementa[:match_ponto.start() + 1].strip()
        else:
            titulo = ementa[:200].strip()
        titulo = titulo[:500] if len(titulo) > 5 else titulo_base[:500]
    else:
        titulo = titulo_base[:500]

    # URL identificadora unica
    numero_para_url = re.sub(r"[^\d]", "", numero_raw)
    if data_decreto:
        url_fonte = (
            f"https://diariooficial.prefeitura.sp.gov.br"
            f"/decreto-{numero_para_url}-{data_decreto.strftime('%Y%m%d')}"
        )
    else:
        url_fonte = (
            f"https://diariooficial.prefeitura.sp.gov.br/decreto-{numero_para_url}"
        )

    return {
        "numero": numero_raw,
        "data_decreto": data_decreto,
        "ementa": ementa,
        "titulo": titulo,
        "url_fonte": url_fonte,
    }


def _extrair_blocos_da_pagina(html_str: str) -> list[dict]:
    """
    Extrai todos os decretos de Nunes de uma pagina do DOCSP.
    Usa split por 'sumoDocumento' (separador de bloco confirmado).
    """
    resultados = []
    partes = re.split(r"sumoDocumento", html_str)
    for parte in partes[1:]:  # pula o header
        resultado = _extrair_decreto_do_bloco(parte)
        if resultado is not None:
            resultados.append(resultado)
    return resultados


def _pagina_tem_resultados(html_str: str) -> bool:
    """Verifica se a pagina tem blocos de materia."""
    texto_lower = html_str.lower()
    indicadores_vazio = [
        "nenhum resultado",
        "nenhuma materia",
        "sem resultados",
        "nenhum registro",
    ]
    for ind in indicadores_vazio:
        if ind in texto_lower:
            return False
    return "sumodocumento" in texto_lower


def _buscar_pagina(client: httpx.Client, hdn_inicio: int) -> Optional[str]:
    """
    Busca uma pagina do DOCSP usando hdnInicio para paginacao.
    Retorna HTML decodificado (ISO-8859-1) ou None.

    Parametro confirmado: hdnInicio=0,10,20,... (em GET)
    """
    params = {
        "acao": "materias_pesquisar",
        "palavras": "NUNES decreto",
        "caderno": "1",
        "hdnInicio": str(hdn_inicio),
    }
    try:
        resp = client.get(
            _BASE_URL_DOCSP,
            params=params,
            headers=_HEADERS,
            timeout=30,
            follow_redirects=True,
        )
        resp.raise_for_status()
        return resp.content.decode("iso-8859-1", errors="replace")
    except httpx.HTTPError as e:
        print(f"  [AVISO] Falha HTTP hdnInicio={hdn_inicio}: {e}", file=sys.stderr)
        return None


def _extrair_total_resultados(html_str: str) -> int:
    """
    Extrai o total de resultados da pagina DOCSP.
    Padrao confirmado: "1 - 10 de 1300" em elementos com classe nroResultados.
    """
    matches = re.findall(r'nroResultados[^>]*>([^<]+)<', html_str)
    if len(matches) >= 3:
        try:
            return int(matches[2].strip().replace(".", ""))
        except ValueError:
            pass
    return 0


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
        # 1. Encontra candidato_id de Ricardo Nunes (Prefeito SP 2024 - eleito)
        # ------------------------------------------------------------------
        row = await db.execute(
            select(Candidato)
            .join(Candidatura, Candidatura.candidato_id == Candidato.id)
            .where(
                Candidato.nome_completo.ilike("%RICARDO%NUNES%"),
                func.upper(Candidatura.cargo) == "PREFEITO",
                Candidatura.ano == 2024,
                Candidatura.estado_uf == "SP",
                Candidatura.eleito.is_(True),
            )
            .order_by(Candidato.id.desc())
            .limit(1)
        )
        candidato = row.scalar_one_or_none()

        if candidato is None:
            print(
                "AVISO: Candidato Ricardo Nunes (Prefeito SP) nao encontrado.\n"
                "Execute o ETL de candidatos (SP/2024/PREFEITO) primeiro.\n"
                "Encerrando sem insercoes.",
                file=sys.stderr,
            )
            return 1

        print(f"Candidato: id={candidato.id} nome={candidato.nome_urna}")

        # ------------------------------------------------------------------
        # 2. Paginacao no DOCSP via hdnInicio
        # ------------------------------------------------------------------
        print(f"Buscando decretos de Nunes no DOCSP (palavras='NUNES decreto')...")

        total_inseridos = 0
        total_ja_existiam = 0
        total_falhas_http = 0
        falhas_consecutivas = 0
        paginas_sem_novos = 0
        urls_sessao: set[str] = set()
        total_resultados = 0

        with httpx.Client(follow_redirects=True) as client_http:
            for pagina in range(_MAX_PAGINAS):
                hdn_inicio = pagina * _ITENS_POR_PAGINA
                print(f"  Pagina {pagina + 1} (hdnInicio={hdn_inicio})...")

                html = _buscar_pagina(client_http, hdn_inicio)
                time.sleep(_RATE_LIMIT)

                if html is None:
                    total_falhas_http += 1
                    falhas_consecutivas += 1
                    if falhas_consecutivas >= 5:
                        print("  [STOP] 5 falhas HTTP. Encerrando.")
                        break
                    continue

                falhas_consecutivas = 0

                # Extrai total na primeira pagina
                if pagina == 0:
                    total_resultados = _extrair_total_resultados(html)
                    if total_resultados > 0:
                        max_paginas_real = (total_resultados // _ITENS_POR_PAGINA) + 1
                        print(f"  Total de resultados no DOCSP: {total_resultados}")
                        print(f"  Paginas a percorrer: {min(max_paginas_real, _MAX_PAGINAS)}")

                if not _pagina_tem_resultados(html):
                    print(f"  Fim dos resultados na pagina {pagina + 1}.")
                    break

                resultados = _extrair_blocos_da_pagina(html)
                print(f"    {len(resultados)} decretos de Nunes nesta pagina")

                inseridos_pagina = 0
                for resultado in resultados:
                    url_fonte = resultado["url_fonte"]

                    if url_fonte in urls_sessao:
                        total_ja_existiam += 1
                        continue
                    urls_sessao.add(url_fonte)

                    row_exist = await db.execute(
                        select(AtividadeExecutivo).where(
                            AtividadeExecutivo.url_fonte == url_fonte,
                            AtividadeExecutivo.candidato_id == candidato.id,
                        )
                    )
                    if row_exist.scalar_one_or_none() is not None:
                        total_ja_existiam += 1
                        continue

                    titulo = resultado["titulo"][:500]
                    ementa = resultado["ementa"]
                    data_decreto = resultado["data_decreto"]
                    numero = resultado["numero"]

                    print(f"    Decreto {numero} - \"{titulo[:60]}\" - inserido")

                    db.add(AtividadeExecutivo(
                        candidato_id=candidato.id,
                        cargo="prefeito",
                        data=data_decreto,
                        tipo="decreto_municipal",
                        titulo=titulo,
                        descricao=ementa[:2000] if ementa else None,
                        url_fonte=url_fonte,
                    ))
                    total_inseridos += 1
                    inseridos_pagina += 1

                await db.flush()

                # Para se nenhum novo decreto por _MAX_PAGINAS_SEM_NOVOS paginas
                if inseridos_pagina == 0:
                    paginas_sem_novos += 1
                    if paginas_sem_novos >= _MAX_PAGINAS_SEM_NOVOS:
                        print(
                            f"  [STOP] {_MAX_PAGINAS_SEM_NOVOS} paginas sem novos decretos. "
                            "Encerrando."
                        )
                        break
                else:
                    paginas_sem_novos = 0

                # Para se ja passou do total de resultados
                if total_resultados > 0 and hdn_inicio + _ITENS_POR_PAGINA >= total_resultados:
                    print(f"  Fim: hdnInicio {hdn_inicio} >= total {total_resultados}.")
                    break

        await db.commit()

        print(
            f"\nColeta concluida: {total_inseridos} inseridos, "
            f"{total_ja_existiam} ja existiam, "
            f"{total_falhas_http} falhas HTTP"
        )
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
