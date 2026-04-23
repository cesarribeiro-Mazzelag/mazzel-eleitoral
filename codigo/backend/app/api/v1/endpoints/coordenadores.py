"""
Módulo Coordenadores — gestão territorial do partido.

Cada coordenador é responsável por um território de ~50 municípios.
A diretoria configura os territórios; o mapa exibe cada um em uma cor distinta.

Endpoints:
  GET  /coordenadores                  — lista todos (com KPIs)
  POST /coordenadores                  — cria coordenador
  GET  /coordenadores/{id}             — detalhe + performance
  PUT  /coordenadores/{id}             — atualiza dados
  DELETE /coordenadores/{id}           — desativa (soft delete)
  GET  /coordenadores/geojson/{uf}     — GeoJSON dos municípios com cor do coordenador
  POST /coordenadores/{id}/municipios  — atribui municípios ao coordenador
  DELETE /coordenadores/{id}/municipios — remove municípios do território
  GET  /coordenadores/sem-coordenador/{uf} — municípios do estado sem coordenador
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from geoalchemy2.functions import ST_AsGeoJSON

from app.core.database import get_db
from app.core.deps import requer_qualquer, exigir_perfil
from app.models.operacional import Usuario, PerfilUsuario

router = APIRouter()

# Paleta de cores para territórios — 20 cores distintas e legíveis no mapa
PALETA_CORES = [
    "#E11D48",  # rosa forte
    "#7C3AED",  # roxo
    "#2563EB",  # azul
    "#059669",  # verde
    "#D97706",  # âmbar
    "#DC2626",  # vermelho
    "#0891B2",  # ciano
    "#65A30D",  # lima
    "#9333EA",  # violeta
    "#EA580C",  # laranja
    "#0D9488",  # teal
    "#BE185D",  # pink
    "#1D4ED8",  # azul escuro
    "#15803D",  # verde escuro
    "#B45309",  # marrom
    "#6D28D9",  # índigo
    "#0E7490",  # azul petróleo
    "#166534",  # verde floresta
    "#9D174D",  # borgonha
    "#92400E",  # marrom escuro
]


# ── Schemas ───────────────────────────────────────────────────────────────────
class CoordenadorCreate(BaseModel):
    nome:       str
    email:      Optional[str] = None
    telefone:   Optional[str] = None
    estado_uf:  str
    cor_hex:    Optional[str] = None
    usuario_id: Optional[int] = None


class CoordenadorUpdate(BaseModel):
    nome:       Optional[str] = None
    email:      Optional[str] = None
    telefone:   Optional[str] = None
    cor_hex:    Optional[str] = None
    usuario_id: Optional[int] = None
    ativo:      Optional[bool] = None


class AtribuirMunicipios(BaseModel):
    municipio_ids: List[int]


# ── Helpers ───────────────────────────────────────────────────────────────────
async def _proxima_cor(db: AsyncSession, estado_uf: str) -> str:
    """Escolhe automaticamente a próxima cor disponível no estado."""
    result = await db.execute(text("""
        SELECT cor_hex FROM coordenadores
        WHERE estado_uf = :uf AND ativo = TRUE
    """), {"uf": estado_uf.upper()})
    usadas = {r.cor_hex for r in result.fetchall()}
    for cor in PALETA_CORES:
        if cor not in usadas:
            return cor
    return PALETA_CORES[0]


def _fmt_uf(uf: str) -> str:
    return uf.strip().upper()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
async def listar_coordenadores(
    uf:    Optional[str] = Query(None),
    ativo: bool          = Query(True),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """Lista coordenadores com contagem de municípios e KPIs de performance."""
    filtro_uf = "AND c.estado_uf = :uf" if uf else ""

    result = await db.execute(text(f"""
        SELECT
            c.id, c.nome, c.email, c.telefone, c.estado_uf, c.cor_hex,
            c.ativo, c.criado_em,
            COUNT(cm.municipio_id)                          AS total_municipios,
            COUNT(cm.municipio_id) FILTER (
                WHERE EXISTS (
                    SELECT 1 FROM farol_municipio fm
                    WHERE fm.municipio_id = cm.municipio_id
                      AND fm.eleitos_atual > 0
                )
            )                                               AS municipios_com_eleito,
            COALESCE(SUM(
                (SELECT COALESCE(fm2.votos_atual, 0)
                 FROM farol_municipio fm2
                 WHERE fm2.municipio_id = cm.municipio_id
                   AND fm2.ano_referencia = 2024
                   AND UPPER(fm2.cargo) = 'VEREADOR'
                 ORDER BY fm2.id LIMIT 1)
            ), 0)                                           AS total_votos
        FROM coordenadores c
        LEFT JOIN coordenador_municipios cm ON cm.coordenador_id = c.id
        WHERE c.ativo = :ativo {filtro_uf}
        GROUP BY c.id, c.nome, c.email, c.telefone, c.estado_uf, c.cor_hex, c.ativo, c.criado_em
        ORDER BY c.estado_uf, c.nome
    """), {"ativo": ativo, "uf": _fmt_uf(uf) if uf else None})

    rows = result.fetchall()
    return {
        "coordenadores": [
            {
                "id":                    r.id,
                "nome":                  r.nome,
                "email":                 r.email,
                "telefone":              r.telefone,
                "estado_uf":             r.estado_uf,
                "cor_hex":               r.cor_hex,
                "ativo":                 r.ativo,
                "total_municipios":      int(r.total_municipios),
                "municipios_com_eleito": int(r.municipios_com_eleito),
                "total_votos":           int(r.total_votos),
            }
            for r in rows
        ],
        "total": len(rows),
    }


@router.get("/geojson/{uf}")
async def geojson_coordenadores(
    uf: str,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    GeoJSON dos municípios do estado coloridos pela cor do coordenador.
    Usado como overlay no MapaEleitoral — layer adicional sobre o choropleth.
    Municípios sem coordenador têm cor_hex = null.
    """
    result = await db.execute(text("""
        SELECT
            m.codigo_ibge,
            m.nome,
            c.id            AS coord_id,
            c.nome          AS coord_nome,
            c.cor_hex,
            ST_AsGeoJSON(ST_SimplifyPreserveTopology(m.geometry, 0.001), 4)::json AS geom
        FROM municipios m
        LEFT JOIN coordenador_municipios cm ON cm.municipio_id = m.id
        LEFT JOIN coordenadores c
            ON c.id = cm.coordenador_id AND c.ativo = TRUE
        WHERE m.estado_uf = :uf
          AND m.geometry IS NOT NULL
        ORDER BY m.nome
    """), {"uf": _fmt_uf(uf)})

    features = []
    for r in result.fetchall():
        if not r.geom:
            continue
        features.append({
            "type": "Feature",
            "geometry": r.geom,
            "properties": {
                "codigo_ibge": r.codigo_ibge,
                "nome":        r.nome,
                "coord_id":    r.coord_id,
                "coord_nome":  r.coord_nome,
                "cor_hex":     r.cor_hex,
            },
        })

    return {"type": "FeatureCollection", "features": features}


@router.get("/sem-coordenador/{uf}")
async def municipios_sem_coordenador(
    uf: str,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """Municípios do estado sem coordenador atribuído — para facilitar configuração."""
    result = await db.execute(text("""
        SELECT m.id, m.codigo_ibge, m.nome,
               COALESCE(f.votos_atual, 0) AS votos,
               COALESCE(f.eleitos_atual, 0) AS eleitos
        FROM municipios m
        LEFT JOIN coordenador_municipios cm ON cm.municipio_id = m.id
        LEFT JOIN farol_municipio f
            ON f.municipio_id = m.id
           AND f.ano_referencia = 2024
           AND UPPER(f.cargo) = 'VEREADOR'
           AND f.partido_id IN (SELECT id FROM partidos WHERE numero IN (44, 25, 17))
        WHERE m.estado_uf = :uf
          AND cm.municipio_id IS NULL
        ORDER BY votos DESC, m.nome
    """), {"uf": _fmt_uf(uf)})

    rows = result.fetchall()
    return {
        "municipios": [
            {
                "id": r.id, "codigo_ibge": r.codigo_ibge,
                "nome": r.nome, "votos": int(r.votos), "eleitos": int(r.eleitos),
            }
            for r in rows
        ],
        "total": len(rows),
    }


@router.get("/{coord_id}")
async def get_coordenador(
    coord_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """Detalhe do coordenador com lista de municípios e KPIs de performance."""
    coord = await db.execute(text("""
        SELECT id, nome, email, telefone, estado_uf, cor_hex, ativo, criado_em
        FROM coordenadores WHERE id = :id
    """), {"id": coord_id})
    coord = coord.fetchone()
    if not coord:
        raise HTTPException(404, "Coordenador não encontrado")

    # Municípios do território com performance
    muns = await db.execute(text("""
        SELECT
            m.id, m.codigo_ibge, m.nome,
            COALESCE(f.status, 'SEM_DADOS')  AS farol,
            COALESCE(f.votos_atual, 0)        AS votos,
            COALESCE(f.eleitos_atual, 0)      AS eleitos,
            f.variacao_pct
        FROM coordenador_municipios cm
        JOIN municipios m ON m.id = cm.municipio_id
        LEFT JOIN farol_municipio f
            ON f.municipio_id = m.id
           AND f.ano_referencia = 2024
           AND UPPER(f.cargo) = 'VEREADOR'
           AND f.partido_id IN (SELECT id FROM partidos WHERE numero IN (44, 25, 17))
        WHERE cm.coordenador_id = :cid
        ORDER BY votos DESC, m.nome
    """), {"cid": coord_id})
    muns_rows = muns.fetchall()

    municipios = [
        {
            "id": r.id, "codigo_ibge": r.codigo_ibge, "nome": r.nome,
            "farol": r.farol, "votos": int(r.votos),
            "eleitos": int(r.eleitos), "variacao_pct": r.variacao_pct,
        }
        for r in muns_rows
    ]

    total_votos   = sum(m["votos"] for m in municipios)
    total_eleitos = sum(m["eleitos"] for m in municipios)
    azuis    = sum(1 for m in municipios if m["farol"] == "AZUL")
    verdes   = sum(1 for m in municipios if m["farol"] == "VERDE")
    amarelos = sum(1 for m in municipios if m["farol"] == "AMARELO")
    vermelhos = sum(1 for m in municipios if m["farol"] in ("VERMELHO", "SEM_DADOS"))

    return {
        "coordenador": {
            "id": coord.id, "nome": coord.nome, "email": coord.email,
            "telefone": coord.telefone, "estado_uf": coord.estado_uf,
            "cor_hex": coord.cor_hex, "ativo": coord.ativo,
        },
        "municipios": municipios,
        "stats": {
            "total_municipios": len(municipios),
            "total_votos":   total_votos,
            "total_eleitos": total_eleitos,
            "azuis": azuis, "verdes": verdes,
            "amarelos": amarelos, "vermelhos": vermelhos,
        },
    }


@router.post("")
async def criar_coordenador(
    dados: CoordenadorCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(exigir_perfil(PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA)),
):
    """Cria um novo coordenador. Cor atribuída automaticamente se não informada."""
    cor = dados.cor_hex or await _proxima_cor(db, dados.estado_uf)
    result = await db.execute(text("""
        INSERT INTO coordenadores (nome, email, telefone, estado_uf, cor_hex, usuario_id)
        VALUES (:nome, :email, :tel, :uf, :cor, :uid)
        RETURNING id
    """), {
        "nome": dados.nome, "email": dados.email, "tel": dados.telefone,
        "uf": _fmt_uf(dados.estado_uf), "cor": cor, "uid": dados.usuario_id,
    })
    await db.commit()
    return {"id": result.scalar(), "cor_hex": cor}


@router.put("/{coord_id}")
async def atualizar_coordenador(
    coord_id: int,
    dados: CoordenadorUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(exigir_perfil(PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA)),
):
    sets = []
    params: dict = {"id": coord_id}
    if dados.nome      is not None: sets.append("nome = :nome");       params["nome"]  = dados.nome
    if dados.email     is not None: sets.append("email = :email");     params["email"] = dados.email
    if dados.telefone  is not None: sets.append("telefone = :tel");    params["tel"]   = dados.telefone
    if dados.cor_hex   is not None: sets.append("cor_hex = :cor");     params["cor"]   = dados.cor_hex
    if dados.usuario_id is not None: sets.append("usuario_id = :uid"); params["uid"]   = dados.usuario_id
    if dados.ativo     is not None: sets.append("ativo = :ativo");     params["ativo"] = dados.ativo
    if not sets:
        raise HTTPException(400, "Nenhum campo para atualizar")
    sets.append("atualizado_em = now()")
    await db.execute(text(f"UPDATE coordenadores SET {', '.join(sets)} WHERE id = :id"), params)
    await db.commit()
    return {"ok": True}


@router.delete("/{coord_id}")
async def desativar_coordenador(
    coord_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(exigir_perfil(PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA)),
):
    await db.execute(text(
        "UPDATE coordenadores SET ativo = FALSE, atualizado_em = now() WHERE id = :id"
    ), {"id": coord_id})
    await db.commit()
    return {"ok": True}


@router.post("/{coord_id}/municipios")
async def atribuir_municipios(
    coord_id: int,
    dados: AtribuirMunicipios,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(exigir_perfil(PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA)),
):
    """
    Atribui municípios ao coordenador.
    Se um município já tem coordenador, move para o novo (remove vínculo anterior).
    """
    if not dados.municipio_ids:
        raise HTTPException(400, "Informe ao menos um município")

    # Remove vínculos anteriores desses municípios (evita duplicata com outro coordenador)
    await db.execute(text("""
        DELETE FROM coordenador_municipios
        WHERE municipio_id = ANY(:ids)
    """), {"ids": dados.municipio_ids})

    # Insere novos vínculos
    for mid in dados.municipio_ids:
        await db.execute(text("""
            INSERT INTO coordenador_municipios (coordenador_id, municipio_id)
            VALUES (:cid, :mid)
            ON CONFLICT (coordenador_id, municipio_id) DO NOTHING
        """), {"cid": coord_id, "mid": mid})

    await db.commit()
    return {"ok": True, "atribuidos": len(dados.municipio_ids)}


@router.delete("/{coord_id}/municipios")
async def remover_municipios(
    coord_id: int,
    dados: AtribuirMunicipios,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(exigir_perfil(PerfilUsuario.PRESIDENTE, PerfilUsuario.DIRETORIA)),
):
    """Remove municípios do território do coordenador."""
    await db.execute(text("""
        DELETE FROM coordenador_municipios
        WHERE coordenador_id = :cid AND municipio_id = ANY(:ids)
    """), {"cid": coord_id, "ids": dados.municipio_ids})
    await db.commit()
    return {"ok": True}
