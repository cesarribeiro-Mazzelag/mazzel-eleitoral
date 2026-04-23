"""
Endpoints de segurança — detecção de scraping/extensões IA.

POST /seguranca/scraping-detectado: recebe report do frontend quando detecta
extensão IA ou automação no browser. Registra em `seguranca_scraping` pra
audit trail e relatórios agregados (admin).

GET /seguranca/scraping-report: admin-only, retorna agregação dos últimos 7d.

Cesar 20/04/2026: pré-requisito pro Modo Campanha com recursos pagos.
"""
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.core.database import get_db
from app.core.deps import requer_qualquer, requer_presidente
from app.models.operacional import Usuario, SegurancaScraping

router = APIRouter(prefix="/seguranca", tags=["seguranca"])


MOTIVOS_VALIDOS = {
    "claude_extension",
    "chatgpt_extension",
    "perplexity_extension",
    "automation_cdp",
    "headless_browser",
    "suspicious_user_agent",
    "dom_overlay_injection",
}


@router.post("/scraping-detectado")
async def registrar_scraping(
    payload: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(requer_qualquer),
):
    """
    Frontend envia fingerprint de scraping/extensão IA detectada.
    Fail-open: mesmo se falhar validação, retorna 200 pra não ajudar o
    adversario a testar se o endpoint está monitorando.
    """
    motivo = payload.get("motivo", "")
    if motivo not in MOTIVOS_VALIDOS:
        return {"ok": True}  # descarta silenciosamente

    url = payload.get("url")
    detalhes = payload.get("detalhes")

    # IP real atrás de proxy
    ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else None)
    )

    registro = SegurancaScraping(
        user_id=user.id,
        motivo=motivo,
        url=(str(url)[:500] if url else None),
        user_agent=(request.headers.get("user-agent") or "")[:500],
        ip=(ip or None),
        detalhes=detalhes,
    )
    db.add(registro)
    await db.commit()
    return {"ok": True}


@router.get("/scraping-report")
async def scraping_report(
    dias: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_presidente),
):
    """
    Admin: agregacao de deteccoes nos ultimos N dias (default 7).
    Retorna contagem por motivo + top 10 usuarios suspeitos.
    """
    result = await db.execute(text(f"""
        SELECT motivo, COUNT(*) AS total, COUNT(DISTINCT user_id) AS usuarios
        FROM seguranca_scraping
        WHERE criado_em > NOW() - INTERVAL '{dias} days'
        GROUP BY motivo
        ORDER BY total DESC
    """))
    por_motivo = [
        {"motivo": r.motivo, "total": r.total, "usuarios": r.usuarios}
        for r in result.fetchall()
    ]

    top_usuarios = await db.execute(text(f"""
        SELECT u.id, u.nome, u.email, COUNT(ss.id) AS deteccoes,
               array_agg(DISTINCT ss.motivo) AS motivos
        FROM seguranca_scraping ss
        JOIN usuarios u ON u.id = ss.user_id
        WHERE ss.criado_em > NOW() - INTERVAL '{dias} days'
        GROUP BY u.id, u.nome, u.email
        ORDER BY deteccoes DESC
        LIMIT 10
    """))
    top = [
        {
            "user_id": r.id,
            "nome": r.nome,
            "email": r.email,
            "deteccoes": r.deteccoes,
            "motivos": list(r.motivos or []),
        }
        for r in top_usuarios.fetchall()
    ]

    return {
        "dias": dias,
        "por_motivo": por_motivo,
        "top_usuarios": top,
    }
