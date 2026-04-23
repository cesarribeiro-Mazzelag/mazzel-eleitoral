"""
Endpoint para servir fotos de candidatos.
As fotos são baixadas pelo ETL (06_fotos.py) e armazenadas localmente.
"""
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

# Diretório base onde o ETL armazena as fotos
# Mapeado via volume Docker: ./codigo/backend/dados_brutos
FOTOS_BASE = Path(__file__).parent.parent.parent.parent.parent / "dados_brutos" / "fotos"


@router.get("/{ano}/{uf}/{filename}")
async def get_foto(ano: int, uf: str, filename: str):
    """
    Serve foto de candidato.
    Path: /fotos/{ano}/{UF}/F{UF}{sequencial}_div.jpg
    """
    # Sanitiza inputs
    uf = uf.upper()
    if not filename.endswith((".jpg", ".jpeg")):
        raise HTTPException(status_code=400, detail="Formato inválido")

    # Bloqueia path traversal
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Path inválido")

    foto_path = FOTOS_BASE / str(ano) / uf / filename
    if not foto_path.exists():
        raise HTTPException(status_code=404, detail="Foto não encontrada")

    return FileResponse(
        foto_path,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=31536000"},  # cache 1 ano
    )


@router.get("/placeholder")
async def get_placeholder():
    """Retorna imagem placeholder para candidatos sem foto."""
    placeholder = FOTOS_BASE / "placeholder.jpg"
    if placeholder.exists():
        return FileResponse(placeholder, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Placeholder não configurado")
