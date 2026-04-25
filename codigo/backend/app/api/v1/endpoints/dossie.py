"""
Endpoint unico do Dossie Politico.

GET /dossie/{candidato_id}     → DossiePolitico (JSON)
GET /dossie/{candidato_id}/pdf → PDF via Chromium headless (replica fiel do dossie digital)

SINGLE SOURCE OF TRUTH: este e o UNICO endpoint que serve o dossie. UI e
PDF consomem a mesma pagina React - o PDF e gerado abrindo a propria pagina
num browser headless e imprimindo em papel de largura fixa 1600px.
"""
import io
import logging

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.dossie import compilar_dossie
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import requer_qualquer
from app.core.security import criar_access_token
from app.models.operacional import Usuario
from app.schemas.dossie import DossiePolitico
from app.services.overall_v9_batch import persistir_overall_v9_de_dossie
from app.services.pdf_browser import gerar_pdf_dossie_via_browser


logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{candidato_id}", response_model=DossiePolitico)
async def get_dossie(
    candidato_id: int,
    ano: Optional[int] = Query(None, description="Ciclo eleitoral especifico (ex: 2022). Omitir = mais recente."),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
) -> DossiePolitico:
    """Dossie politico. Parametro ?ano= filtra financeiro/desempenho/mapa para aquele ciclo."""
    try:
        dossie = await compilar_dossie(db, candidato_id, ano_ciclo=ano)
    except ValueError as e:
        raise HTTPException(404, str(e))

    # Lazy warmup: persiste overall na politico_overall_v9 pra que o /radar
    # passe a mostrar valor coerente com o dossie. Idempotente, ~5ms. Falha
    # silenciosa pra nao quebrar a resposta do dossie.
    if ano is None:
        try:
            await persistir_overall_v9_de_dossie(db, candidato_id, dossie)
        except Exception:
            logger.exception("Falha ao persistir overall_v9 (lazy warmup)")

    return dossie


@router.get("/{candidato_id}/pdf")
async def get_dossie_pdf(
    candidato_id: int,
    ano: Optional[int] = Query(None, description="Ciclo eleitoral especifico (ex: 2022). Omitir = mais recente."),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(requer_qualquer),
):
    """
    Gera o PDF abrindo /radar/politicos/{id} num Chromium headless.

    PDF sai IDENTICO ao dossie digital (mesmos graficos, mesmo mapa,
    mesmas fontes, texto selecionavel). Pagina unica longa - leitor
    de PDF rola verticalmente como no site.
    """
    # Valida candidato e pega nome numa compilacao so (evita recompilar pro filename)
    try:
        dossie = await compilar_dossie(db, candidato_id, ano_ciclo=ano)
    except ValueError as e:
        raise HTTPException(404, str(e))
    nome = dossie.identificacao.nome_urna or dossie.identificacao.nome or f"politico_{candidato_id}"

    if not settings.FRONTEND_URL:
        raise HTTPException(
            500,
            "FRONTEND_URL nao configurada - defina em .env/railway para gerar PDF",
        )

    # Token efemero (mesmos dados, mas novo TTL) passado pro browser via
    # query string. O token original do usuario nao e exposto em logs nem
    # URLs internas.
    token_interno = criar_access_token({"sub": str(usuario.id)})

    try:
        pdf_bytes = await gerar_pdf_dossie_via_browser(
            candidato_id=candidato_id,
            token=token_interno,
            ano=ano,
            frontend_url=settings.FRONTEND_URL,
        )
    except Exception as e:
        logger.exception(f"[dossie/pdf] falha ao gerar PDF do candidato {candidato_id}")
        raise HTTPException(500, f"Erro ao gerar PDF: {e}")

    nome_slug = nome.lower().replace(" ", "_")
    ciclo_sufixo = f"_{ano}" if ano else ""
    nome_arquivo = f"dossie_{nome_slug}{ciclo_sufixo}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nome_arquivo}"'},
    )
