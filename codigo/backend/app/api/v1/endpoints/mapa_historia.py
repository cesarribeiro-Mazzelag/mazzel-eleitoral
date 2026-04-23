"""
Mapa Eleitoral - Endpoints orientados a CAPÍTULO (histórias prontas).

Cada endpoint devolve um GeoJSON FeatureCollection com:
  - features pintadas pela regra X9 visual (cor do partido cliente vs cor do
    partido adversário dominante, conforme PRODUCT_VISION seção 6.7)
  - meta.narrativa com texto pronto para a sidebar narradora ler
  - meta.top5 com ranking de partidos quando relevante

REGRA: este arquivo NÃO substitui o mapa.py atual. É paralelo. O frontend
novo (capítulos) consome estes endpoints. O frontend antigo segue intacto.

Princípio: o backend monta a estrutura da história. O frontend só renderiza.
Frases finais (copywriting) ficam para o César aprovar - aqui devolvemos a
narrativa em formato estrutural com slots preenchidos por dados.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.deps import requer_qualquer
from app.models.operacional import Usuario


router = APIRouter()


# Cor neutra de fallback quando o partido não tem cor definida.
# Mesma cor da migration 016.
COR_FALLBACK_PRIMARIA = "#64748B"
COR_FALLBACK_SECUNDARIA = "#FFFFFF"


# ─────────────────────────────────────────────────────────────────────────────
# Helper: classificação X9 (forte / fraco / ausente) para um partido cliente
# em um território com base em métricas de presença.
# ─────────────────────────────────────────────────────────────────────────────

def classificar_x9_presenca(
    eleitos_cliente: int,
    eleitos_dominante: int,
    cliente_e_dominante: bool,
) -> str:
    """
    Classifica a presença do partido cliente num território.

    Returns:
        'forte'   - cliente é o dominante (manda no território)
        'fraco'   - cliente tem eleitos mas não domina (perdendo terreno)
        'ausente' - cliente não tem nenhum eleito (adversário manda)
    """
    if cliente_e_dominante and eleitos_cliente > 0:
        return "forte"
    if eleitos_cliente > 0:
        return "fraco"
    return "ausente"


# ─────────────────────────────────────────────────────────────────────────────
# Capítulo 0 - Cenário Político Brasileiro
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/cenario")
async def get_capitulo_cenario(
    ano: int = Query(2024, description="Ano de referência (2024 = última municipal)"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Capítulo 0 - "O cenário político hoje".

    Devolve para cada estado o partido dominante (peso ponderado por cargo)
    e popula meta.top5 com os 5 maiores partidos do Brasil no ano.

    Sem filtro de tenant - é a porta de entrada universal.
    """
    # Top 5 partidos do Brasil no ano por peso ponderado
    top5_query = await db.execute(text("""
        SELECT
            p.numero,
            p.sigla,
            p.nome,
            p.logo_url,
            COALESCE(p.cor_primaria,   :cor_fb_pri) AS cor_primaria,
            COALESCE(p.cor_secundaria, :cor_fb_sec) AS cor_secundaria,
            SUM(
                CASE WHEN ca.eleito AND ca.turno = 1 THEN
                    CASE UPPER(ca.cargo)
                        WHEN 'PRESIDENTE'         THEN 500
                        WHEN 'GOVERNADOR'         THEN 100
                        WHEN 'SENADOR'            THEN 60
                        WHEN 'DEPUTADO FEDERAL'   THEN 20
                        WHEN 'PREFEITO'           THEN 15
                        WHEN 'DEPUTADO ESTADUAL'  THEN 8
                        WHEN 'DEPUTADO DISTRITAL' THEN 8
                        WHEN 'VEREADOR'           THEN 1
                        ELSE 0
                    END
                ELSE 0 END
            ) AS score_ponderado,
            COUNT(*) FILTER (WHERE ca.eleito AND ca.turno = 1) AS n_eleitos
        FROM candidaturas ca
        JOIN partidos p ON p.id = ca.partido_id
        WHERE ca.ano = :ano
        GROUP BY p.id, p.numero, p.sigla, p.nome, p.logo_url, p.cor_primaria, p.cor_secundaria
        HAVING SUM(CASE WHEN ca.eleito AND ca.turno = 1 THEN 1 ELSE 0 END) > 0
        ORDER BY score_ponderado DESC
        LIMIT 5
    """), {
        "ano": ano,
        "cor_fb_pri": COR_FALLBACK_PRIMARIA,
        "cor_fb_sec": COR_FALLBACK_SECUNDARIA,
    })

    top5 = []
    for r in top5_query.fetchall():
        top5.append({
            "numero":          int(r.numero),
            "sigla":           r.sigla,
            "nome":            r.nome,
            "logo_url":        r.logo_url,
            "cor_primaria":    r.cor_primaria,
            "cor_secundaria":  r.cor_secundaria,
            "eleitos":         int(r.n_eleitos),
            "score_ponderado": int(r.score_ponderado),
        })

    # Partido dominante por estado (com cor)
    estados_query = await db.execute(text("""
        WITH scores AS (
            SELECT
                ca.estado_uf,
                p.id     AS partido_id,
                p.numero AS partido_num,
                p.sigla  AS partido_sigla,
                COALESCE(p.cor_primaria,   :cor_fb_pri) AS cor_primaria,
                COALESCE(p.cor_secundaria, :cor_fb_sec) AS cor_secundaria,
                SUM(
                    CASE WHEN ca.eleito AND ca.turno = 1 THEN
                        CASE UPPER(ca.cargo)
                            WHEN 'PRESIDENTE'         THEN 500
                            WHEN 'GOVERNADOR'         THEN 100
                            WHEN 'SENADOR'            THEN 60
                            WHEN 'DEPUTADO FEDERAL'   THEN 20
                            WHEN 'PREFEITO'           THEN 15
                            WHEN 'DEPUTADO ESTADUAL'  THEN 8
                            WHEN 'DEPUTADO DISTRITAL' THEN 8
                            WHEN 'VEREADOR'           THEN 1
                            ELSE 0
                        END
                    ELSE 0 END
                ) AS score_ponderado,
                COUNT(*) FILTER (WHERE ca.eleito AND ca.turno = 1) AS n_eleitos
            FROM candidaturas ca
            JOIN partidos p ON p.id = ca.partido_id
            WHERE ca.ano = :ano
            GROUP BY ca.estado_uf, p.id, p.numero, p.sigla, p.cor_primaria, p.cor_secundaria
        ),
        dominante AS (
            SELECT DISTINCT ON (estado_uf)
                estado_uf, partido_id, partido_num, partido_sigla,
                cor_primaria, cor_secundaria, score_ponderado, n_eleitos
            FROM scores
            WHERE score_ponderado > 0
            ORDER BY estado_uf, score_ponderado DESC
        )
        SELECT
            eg.estado_uf,
            d.partido_id,
            d.partido_num,
            d.partido_sigla,
            d.cor_primaria,
            d.cor_secundaria,
            COALESCE(d.n_eleitos, 0) AS eleitos_dominante,
            ST_AsGeoJSON(eg.geometry, 4)::json AS geom
        FROM estados_geometria eg
        LEFT JOIN dominante d ON d.estado_uf = eg.estado_uf
        ORDER BY eg.estado_uf
    """), {
        "ano": ano,
        "cor_fb_pri": COR_FALLBACK_PRIMARIA,
        "cor_fb_sec": COR_FALLBACK_SECUNDARIA,
    })

    features = []
    for r in estados_query.fetchall():
        if not r.geom:
            continue
        features.append({
            "type": "Feature",
            "geometry": r.geom,
            "properties": {
                "estado_uf":         r.estado_uf,
                "partido_dominante_id":     r.partido_id,
                "partido_dominante_num":    int(r.partido_num) if r.partido_num else None,
                "partido_dominante_sigla":  r.partido_sigla,
                "cor_dominante_primaria":   r.cor_primaria   or COR_FALLBACK_PRIMARIA,
                "cor_dominante_secundaria": r.cor_secundaria or COR_FALLBACK_SECUNDARIA,
                "eleitos_dominante":        int(r.eleitos_dominante),
                # Para o capítulo cenário, todo estado tem o partido dominante
                # como "forte" - é a leitura natural do palco político.
                "nivel_presenca": "forte",
            },
        })

    return {
        "type": "FeatureCollection",
        "features": features,
        "meta": {
            "capitulo":  "cenario",
            "titulo":    "Cenário Político Brasileiro",
            "ano":       ano,
            "narrativa": {
                # Frases estruturais com slots preenchidos por dados reais.
                # O texto final (copywriting) fica para revisão do César.
                "linha1":    f"Os 5 maiores partidos do Brasil em {ano}",
                "destaque":  (
                    f"{top5[0]['sigla']} lidera com {top5[0]['eleitos']} eleitos"
                    if top5 else "Sem dados disponíveis"
                ),
                "subtitulo": (
                    f"Seguido por {top5[1]['sigla']} com {top5[1]['eleitos']}"
                    if len(top5) > 1 else None
                ),
                "acoes": [
                    {"label": "Ver onde meu partido está forte", "tipo": "capitulo", "valor": "onde-estou-forte"},
                    {"label": "Comparar dois partidos",          "tipo": "capitulo", "valor": "comparar", "bloqueado": True},
                ],
            },
            "top5": top5,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Capítulo 1 - Onde [seu partido] está forte
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/onde-estou-forte")
async def get_capitulo_onde_estou_forte(
    partido: int = Query(..., description="Número TSE do partido cliente (ex: 44 para União Brasil)"),
    ano: int = Query(2024, description="Ano de referência"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Capítulo 1 - "Onde [seu partido] está forte".

    Para cada estado, calcula:
    - eleitos do partido cliente
    - eleitos do partido dominante (pode ser o próprio cliente)
    - nivel_presenca (forte / fraco / ausente) usando regra X9
    - cor a aplicar (primária do cliente se forte, primária do dominante caso contrário)
    """
    # Cor do partido cliente
    partido_cliente_query = await db.execute(text("""
        SELECT numero, sigla, nome, logo_url,
               COALESCE(cor_primaria,   :cor_fb_pri) AS cor_primaria,
               COALESCE(cor_secundaria, :cor_fb_sec) AS cor_secundaria
        FROM partidos
        WHERE numero = :num
        LIMIT 1
    """), {
        "num": partido,
        "cor_fb_pri": COR_FALLBACK_PRIMARIA,
        "cor_fb_sec": COR_FALLBACK_SECUNDARIA,
    })
    cliente = partido_cliente_query.fetchone()
    if not cliente:
        return {"type": "FeatureCollection", "features": [], "meta": {"erro": f"Partido {partido} não encontrado"}}

    # Para cada estado: dominante + eleitos do cliente
    rows = await db.execute(text("""
        WITH scores AS (
            SELECT
                ca.estado_uf,
                p.id     AS partido_id,
                p.numero AS partido_num,
                p.sigla  AS partido_sigla,
                COALESCE(p.cor_primaria,   :cor_fb_pri) AS cor_primaria,
                SUM(
                    CASE WHEN ca.eleito AND ca.turno = 1 THEN
                        CASE UPPER(ca.cargo)
                            WHEN 'PRESIDENTE'         THEN 500
                            WHEN 'GOVERNADOR'         THEN 100
                            WHEN 'SENADOR'            THEN 60
                            WHEN 'DEPUTADO FEDERAL'   THEN 20
                            WHEN 'PREFEITO'           THEN 15
                            WHEN 'DEPUTADO ESTADUAL'  THEN 8
                            WHEN 'DEPUTADO DISTRITAL' THEN 8
                            WHEN 'VEREADOR'           THEN 1
                            ELSE 0
                        END
                    ELSE 0 END
                ) AS score_ponderado,
                COUNT(*) FILTER (WHERE ca.eleito AND ca.turno = 1) AS n_eleitos
            FROM candidaturas ca
            JOIN partidos p ON p.id = ca.partido_id
            WHERE ca.ano = :ano
            GROUP BY ca.estado_uf, p.id, p.numero, p.sigla, p.cor_primaria
        ),
        dominante AS (
            SELECT DISTINCT ON (estado_uf)
                estado_uf, partido_num, partido_sigla, cor_primaria, n_eleitos
            FROM scores
            WHERE score_ponderado > 0
            ORDER BY estado_uf, score_ponderado DESC
        ),
        cliente AS (
            SELECT estado_uf, n_eleitos AS eleitos_cliente
            FROM scores
            WHERE partido_num = :num
        )
        SELECT
            eg.estado_uf,
            COALESCE(c.eleitos_cliente, 0)        AS eleitos_cliente,
            COALESCE(d.n_eleitos,       0)        AS eleitos_dominante,
            COALESCE(d.partido_num,     0)        AS dom_num,
            COALESCE(d.partido_sigla,   '')       AS dom_sigla,
            COALESCE(d.cor_primaria,    :cor_fb_pri) AS dom_cor,
            ST_AsGeoJSON(eg.geometry, 4)::json    AS geom
        FROM estados_geometria eg
        LEFT JOIN dominante d ON d.estado_uf = eg.estado_uf
        LEFT JOIN cliente   c ON c.estado_uf = eg.estado_uf
        ORDER BY eg.estado_uf
    """), {
        "ano": ano,
        "num": partido,
        "cor_fb_pri": COR_FALLBACK_PRIMARIA,
    })

    cor_cliente = cliente.cor_primaria
    features = []
    total_estados_forte = 0
    total_eleitos_cliente = 0

    for r in rows.fetchall():
        if not r.geom:
            continue
        cliente_e_dominante = (int(r.dom_num) == partido)
        nivel_presenca = classificar_x9_presenca(
            int(r.eleitos_cliente),
            int(r.eleitos_dominante),
            cliente_e_dominante,
        )
        if nivel_presenca == "forte":
            total_estados_forte += 1
        total_eleitos_cliente += int(r.eleitos_cliente)

        # Cor a renderizar:
        # - forte: cor do cliente, saturada
        # - fraco: cor do adversário dominante, aparência opaca/lavada (frontend aplica opacidade)
        # - ausente: cor do adversário dominante, saturada (chama atenção)
        cor_render = cor_cliente if nivel_presenca == "forte" else r.dom_cor

        features.append({
            "type": "Feature",
            "geometry": r.geom,
            "properties": {
                "estado_uf":              r.estado_uf,
                "eleitos_cliente":        int(r.eleitos_cliente),
                "eleitos_dominante":      int(r.eleitos_dominante),
                "partido_dominante_num":  int(r.dom_num) if r.dom_num else None,
                "partido_dominante_sigla": r.dom_sigla,
                "cor_dominante_primaria": r.dom_cor,
                "cor_render":             cor_render,
                "nivel_presenca":         nivel_presenca,
            },
        })

    return {
        "type": "FeatureCollection",
        "features": features,
        "meta": {
            "capitulo":  "onde-estou-forte",
            "titulo":    f"Onde {cliente.sigla} está forte",
            "ano":       ano,
            "partido_cliente": {
                "numero":         int(cliente.numero),
                "sigla":          cliente.sigla,
                "nome":           cliente.nome,
                "logo_url":       cliente.logo_url,
                "cor_primaria":   cliente.cor_primaria,
                "cor_secundaria": cliente.cor_secundaria,
            },
            "narrativa": {
                "linha1":    f"{cliente.sigla} em {ano}",
                "destaque":  f"{total_eleitos_cliente} eleitos no Brasil",
                "subtitulo": (
                    f"Estados onde {cliente.sigla} domina: {total_estados_forte}"
                    if total_estados_forte > 0
                    else f"{cliente.sigla} ainda não domina nenhum estado"
                ),
                "acoes": [
                    {"label": "Voltar ao cenário",                 "tipo": "capitulo", "valor": "cenario"},
                    {"label": "Ver onde estou crescendo",          "tipo": "capitulo", "valor": "onde-estou-crescendo", "bloqueado": True},
                ],
            },
            "totais": {
                "estados_forte":  total_estados_forte,
                "eleitos_total":  total_eleitos_cliente,
            },
        },
    }
