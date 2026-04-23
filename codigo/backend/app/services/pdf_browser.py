"""
Geracao de PDF do dossie via browser headless (Chromium/Playwright).

Por que browser em vez de WeasyPrint/ReportLab?
- O PDF precisa ser IDENTICO ao dossie digital (mesma tela, mesmos
  graficos, mesmo mapa). Manter 2 implementacoes visuais e custoso e
  diverge rapido.
- Chromium renderiza TODO o CSS/JS real (MapLibre WebGL, Recharts,
  fontes customizadas, gradientes, filters), e gera PDF vetorial com
  texto selecionavel.

Fluxo:
1. Abre Chromium, configura viewport 1600x2000.
2. Navega pra {FRONTEND_URL}/radar/politicos/{id}?print=1&token=<jwt>
3. Frontend detecta `print=1`: seta token no localStorage, adiciona
   classe `exportando-pdf` no body, renderiza largura fixa 1600px.
4. Aguarda fontes + flag `window.__dossieReady === true` (setada pela
   pagina quando dossie + mapa terminaram de carregar).
5. Mede scrollHeight real do `#dossie-print`.
6. Gera PDF com papel de 1600x{altura}px (1 pagina longa - scroll
   vertical no leitor).

Compatibilidade com browser pool: hoje abre/fecha chromium por
request (~3-5s overhead). Se virar gargalo, da pra manter browser
singleton no startup da FastAPI.
"""
from __future__ import annotations

import logging
from urllib.parse import quote

from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)


async def gerar_pdf_dossie_via_browser(
    *,
    candidato_id: int,
    token: str,
    ano: int | None = None,
    frontend_url: str,
    timeout_ms: int = 45_000,
) -> bytes:
    """
    Gera o PDF navegando pelo frontend real e imprimindo via Chromium.

    Args:
        candidato_id: id do candidato (rota /radar/politicos/{id}).
        token: JWT do usuario autenticado - sera gravado no localStorage
               do contexto do browser.
        ano: ciclo eleitoral opcional (query string ?ano=2024).
        frontend_url: URL base do frontend (ex: http://host.docker.internal:3000).
        timeout_ms: timeout maximo por operacao (default 45s).

    Returns:
        Bytes do PDF.

    Raises:
        TimeoutError: se o frontend nao sinalizar `window.__dossieReady`
                      dentro do timeout (mapa/dossie nao carregou).
    """
    if not frontend_url:
        raise ValueError("FRONTEND_URL nao configurada - impossivel gerar PDF via browser")

    # Query string: print=1 sinaliza modo captura, token vai tambem pra
    # frontend setar no localStorage antes dos fetches.
    query = f"?print=1&token={quote(token)}"
    if ano:
        query += f"&ano={ano}"
    url = f"{frontend_url.rstrip('/')}/radar/politicos/{candidato_id}{query}"

    logger.info(f"[pdf_browser] navegando para {frontend_url}/radar/politicos/{candidato_id} (ano={ano})")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            # --no-sandbox: obrigatorio em container Docker root
            # --disable-dev-shm-usage: evita crash por /dev/shm pequeno em Docker
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        try:
            context = await browser.new_context(
                viewport={"width": 1400, "height": 2000},
                device_scale_factor=2,  # retina - fontes/graficos mais nitidos
            )
            page = await context.new_page()

            # Vai direto pra pagina. Frontend pega o token do query string
            # no primeiro render, grava no localStorage, e os fetches
            # subsequentes (SWR) usam esse token.
            await page.goto(url, wait_until="networkidle", timeout=timeout_ms)

            # Aguarda fontes carregadas (senao PDF sai com Times New Roman fallback)
            await page.evaluate("document.fonts.ready")

            # Aguarda flag que o dossie + mapa terminaram de renderizar.
            # Setada por window.__setDossieReady() no frontend depois que
            # MapLibre terminou de baixar tiles e choropleth foi aplicado.
            await page.wait_for_function(
                "window.__dossieReady === true",
                timeout=timeout_ms,
            )

            # Mede altura real do dossie (elemento-alvo tem overflow auto
            # no dia-a-dia, mas no modo print a classe `exportando-pdf`
            # remove o overflow e ele ocupa scrollHeight inteiro).
            altura_px = await page.evaluate(
                """() => {
                    const el = document.getElementById('dossie-print');
                    if (!el) return document.body.scrollHeight;
                    // forca reflow pra pegar altura pos-fontes
                    return Math.ceil(el.scrollHeight);
                }"""
            )
            altura_px = int(altura_px) + 40  # folga pra nao cortar na borda
            logger.info(f"[pdf_browser] altura medida: {altura_px}px")

            # PDF de pagina unica longa. width em px, height calculado.
            pdf_bytes = await page.pdf(
                width="1400px",
                height=f"{altura_px}px",
                print_background=True,
                margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
                prefer_css_page_size=False,
            )
            logger.info(f"[pdf_browser] PDF gerado: {len(pdf_bytes)} bytes")
            return pdf_bytes
        finally:
            await browser.close()
