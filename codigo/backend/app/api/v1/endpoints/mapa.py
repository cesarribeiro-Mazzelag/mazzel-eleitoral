"""
Endpoints do Mapa Eleitoral
  GET /mapa/farol           - farol por município (para colorir o mapa)
  GET /mapa/municipio/{id}  - dados de um município (painel lateral)
  GET /mapa/buscar          - busca por texto livre (autocomplete)
  GET /mapa/estado/{uf}     - resumo de um estado
  GET /mapa/geojson/{uf}    - GeoJSON dos municípios de um estado (para o mapa)
"""
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
from geoalchemy2.functions import ST_AsGeoJSON
import json
import gzip
import logging
from pathlib import Path

from app.core.database import get_db
from app.core.deps import requer_qualquer, requer_presidente
from app.models.operacional import Usuario, UsuarioBusca
from app.services.mapa_score import enriquecer_features, enriquecer_features_percentil, SCORE_FNS
from app.services.mapa_candidato_geojson import obter_geojson_candidato

logger = logging.getLogger(__name__)

router = APIRouter()

# IDs históricos do União Brasil — usados apenas onde um tenant específico exige
# Para visão nacional (Mazzel Tech DEMO), sem filtro de partido
PARTIDOS_UB = (44, 25, 17)

# ── Cache em disco (persistente entre restarts) ─────────────────────────────
# Geojsons custosos (brasil-municipios, brasil, uf) ficam gravados em gzip
# sob /app/cache/geojson/ - mount do docker-compose preserva no host.
# Cache key -> arquivo. Leitura = fs + gunzip (milissegundos).
# Query dinamica so roda na 1a vez que um (cargo/ano/modo/turno) aparece.
GEOJSON_CACHE_DIR = Path("/app/cache/geojson")
try:
    GEOJSON_CACHE_DIR.mkdir(parents=True, exist_ok=True)
except Exception as e:
    logger.warning(f"Falha criar cache dir {GEOJSON_CACHE_DIR}: {e}")


def _cache_path(key: str) -> Path:
    """Converte cache key em caminho de arquivo seguro."""
    safe = key.replace(":", "_").replace("/", "_").replace(" ", "_")
    return GEOJSON_CACHE_DIR / f"{safe}.json.gz"


def _carregar_disco(key: str) -> dict | None:
    """Le geojson do disco. Retorna None se nao existir ou erro."""
    p = _cache_path(key)
    if not p.exists():
        return None
    try:
        with gzip.open(p, "rb") as f:
            return json.loads(f.read())
    except Exception as e:
        logger.warning(f"Erro lendo cache {key}: {e}")
        return None


def _carregar_disco_bytes(key: str) -> bytes | None:
    """
    Le os bytes RAW do .json.gz. Mais rapido que _carregar_disco porque
    evita o round-trip JSON→dict→JSON. Retorna bytes gzipped prontos pra
    servir com Content-Encoding: gzip - o browser descomprime.
    """
    p = _cache_path(key)
    if not p.exists():
        return None
    try:
        return p.read_bytes()
    except Exception as e:
        logger.warning(f"Erro lendo cache bytes {key}: {e}")
        return None


def _salvar_disco(key: str, data: dict) -> None:
    """Salva geojson no disco em gzip. Falhas nao bloqueiam o endpoint."""
    p = _cache_path(key)
    try:
        with gzip.open(p, "wb", compresslevel=6) as f:
            f.write(json.dumps(data, separators=(",", ":")).encode("utf-8"))
    except Exception as e:
        logger.warning(f"Erro salvando cache {key}: {e}")


def _servir_cache_rapido(key: str) -> Response | None:
    """
    Atalho ultrarrapido: se existe .json.gz no disco, retorna Response com
    os bytes RAW + Content-Encoding: gzip. Nao re-serializa nada. Ganho: de
    1.5-3s (json parse + serialize) para <50ms (disk read + network).

    Retorna None se arquivo nao existe - caller faz fallback para query SQL.
    """
    data = _carregar_disco_bytes(key)
    if data is None:
        return None
    return Response(
        content=data,
        media_type="application/json",
        headers={
            "Content-Encoding": "gzip",
            "Cache-Control": "private, max-age=300",
            "X-Cache": "disk",
        },
    )


def limpar_cache_disco() -> int:
    """Remove todos os geojsons cacheados. Retorna quantidade removida."""
    count = 0
    if GEOJSON_CACHE_DIR.exists():
        for p in GEOJSON_CACHE_DIR.glob("*.json.gz"):
            p.unlink()
            count += 1
    return count


# Cache da máscara (calculada uma vez, geometria estática)
_mascara_cache: dict | None = None

# Cache do GeoJSON Brasil por chave (ano:cargo:modo) — geometrias custosas
# Limpar com: _geojson_brasil_cache.clear()
_geojson_brasil_cache: dict = {}

# Cache do GeoJSON por UF — mesmo pattern, chave inclui uf+filtros.
# Dados TSE imutáveis → cache in-memory process-level é seguro.
_geojson_uf_cache: dict = {}


def limpar_cache_brasil():
    """Limpa o cache do GeoJSON Brasil (chamar após correção de dados)."""
    _geojson_brasil_cache.clear()
    _geojson_uf_cache.clear()


@router.get("/distritos-geojson")
async def get_distritos_geojson(
    codigo_ibge: str = Query(..., description="codigo_ibge do municipio (ex: 3550308)"),
    db: AsyncSession = Depends(get_db),
):
    """Retorna GeoJSON FeatureCollection dos distritos do municipio.

    Cada feature tem: nome, cd_dist, partido_dominante (numero), votos_total.
    Pro POC do Google Maps (/mapa-google).
    """
    r = await db.execute(text("""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(json_build_object(
                'type', 'Feature',
                'properties', json_build_object(
                    'cd_dist', d.cd_dist,
                    'nome', d.nm_dist,
                    'cd_mun', d.cd_mun
                ),
                'geometry', ST_AsGeoJSON(d.geometry)::json
            )), '[]'::json)
        ) AS fc
        FROM distritos_municipio d
        WHERE d.cd_mun = :cd
    """), {"cd": codigo_ibge.zfill(7)})
    row = r.fetchone()
    return row.fc if row else {"type": "FeatureCollection", "features": []}


@router.get("/mascara")
async def get_mascara(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Retorna o polígono inverso do Brasil (mundo - Brasil).
    Usado como overlay branco no MapLibre para ocultar países vizinhos.

    Query pesada (ST_Difference + ST_Union de 5570 municípios = ~2min cold!).
    Cache em disco + memória porque a geometria é estática (só muda se
    geometrias de municípios mudarem - raríssimo).
    """
    global _mascara_cache
    # Nível 1: memória (instantâneo na mesma instância)
    if _mascara_cache is not None:
        return _mascara_cache

    # Nível 2: disco (persiste entre restarts)
    disco = _carregar_disco("mascara:brasil:v1")
    if disco is not None:
        _mascara_cache = disco
        return disco

    # Nível 3: query pesada (primeira execução após clear de caches)
    result = await db.execute(text("""
        SELECT ST_AsGeoJSON(
            ST_Difference(
                ST_MakeEnvelope(-180, -90, 180, 90, 4326),
                ST_SimplifyPreserveTopology(ST_Union(geometry), 0.005)
            ),
            3
        )::json AS geom
        FROM municipios
        WHERE geometry IS NOT NULL
    """))
    row = result.fetchone()
    if not row or not row.geom:
        return {"type": "FeatureCollection", "features": []}

    _mascara_cache = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": row.geom,
            "properties": {},
        }],
    }
    _salvar_disco("mascara:brasil:v1", _mascara_cache)
    return _mascara_cache


@router.get("/buscar-candidato")
async def buscar_candidato(
    q: str = Query(..., min_length=3, description="Texto a buscar (nome do candidato). Min 3 chars."),
    limit: int = Query(10, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Busca rapida de candidato (autocomplete). Pensado para latencia <200ms.

    - Usa indice GIN pg_trgm em UPPER(nome_completo) e UPPER(nome_urna)
    - Retorna candidatura MAIS RECENTE do candidato
    - Sem CTE pesada (vs /radar/politicos?busca=... que roda dedup + windows)

    Ordenacao: similaridade trigram (mais proximo do query primeiro), com
    tie-break pelo ano da candidatura mais recente (dados mais atuais).
    """
    termo = q.upper().strip()
    params = {
        "q": f"%{termo}%",
        "q_pref": f"{termo}%",
        "q_sim": termo,
        "lim": limit,
    }
    # Estrategia: 2 camadas. Primeiro buscar matches PREFIXO (nome comeca
    # com o termo) — altamente relevantes e poucos resultados. Depois
    # complementar com matches CONTEM (limitado a 200 pra cada indice
    # trigram). Evita similarity() em 10k+ linhas quando nomes sao comuns
    # (NUNES, LULA, SILVA).
    sql = """
        WITH matches AS (
            (SELECT id, 1 AS bucket FROM candidatos
             WHERE UPPER(nome_urna) LIKE :q_pref LIMIT 40)
            UNION
            (SELECT id, 1 AS bucket FROM candidatos
             WHERE UPPER(nome_completo) LIKE :q_pref LIMIT 40)
            UNION
            (SELECT id, 2 AS bucket FROM candidatos
             WHERE UPPER(nome_urna) LIKE :q LIMIT 200)
            UNION
            (SELECT id, 2 AS bucket FROM candidatos
             WHERE UPPER(nome_completo) LIKE :q LIMIT 200)
        ),
        match AS (
            SELECT c.id,
                   COALESCE(NULLIF(c.nome_urna, ''), c.nome_completo) AS nome,
                   c.nome_completo,
                   c.foto_url,
                   MIN(m.bucket) AS bucket,
                   GREATEST(
                       similarity(UPPER(COALESCE(c.nome_urna, '')), :q_sim),
                       similarity(UPPER(c.nome_completo), :q_sim)
                   ) AS sim
            FROM candidatos c
            JOIN matches m ON m.id = c.id
            GROUP BY c.id
            ORDER BY bucket ASC, sim DESC
            LIMIT :lim
        )
        SELECT m.id AS candidato_id,
               m.nome,
               m.nome_completo,
               m.foto_url,
               ca.id AS candidatura_id,
               ca.ano,
               ca.cargo,
               ca.estado_uf,
               ca.eleito,
               p.sigla AS partido_sigla,
               p.numero AS partido_numero,
               mu.nome AS municipio_nome
        FROM match m
        LEFT JOIN LATERAL (
            SELECT ca.id, ca.ano, ca.cargo, ca.estado_uf, ca.eleito,
                   ca.partido_id, ca.municipio_id
            FROM candidaturas ca
            WHERE ca.candidato_id = m.id
            ORDER BY ca.ano DESC, ca.votos_total DESC NULLS LAST
            LIMIT 1
        ) ca ON TRUE
        LEFT JOIN partidos p ON p.id = ca.partido_id
        LEFT JOIN municipios mu ON mu.id = ca.municipio_id
        ORDER BY m.bucket ASC, m.sim DESC
    """
    rows = (await db.execute(text(sql), params)).mappings().all()
    return [
        {
            "candidato_id": r["candidato_id"],
            "candidatura_id": r["candidatura_id"],
            "nome": r["nome"],
            "nome_completo": r["nome_completo"],
            "foto_url": r["foto_url"],
            "ano": r["ano"],
            "cargo": r["cargo"],
            "estado_uf": r["estado_uf"],
            "eleito": r["eleito"],
            "partido_sigla": r["partido_sigla"],
            "partido_numero": r["partido_numero"],
            "municipio_nome": r["municipio_nome"],
        }
        for r in rows
    ]


@router.get("/candidato/{candidato_id}/geojson")
async def get_candidato_geojson(
    candidato_id: int,
    candidatura_id: int | None = Query(
        None,
        description="ID de uma candidatura específica. Default = última.",
    ),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    GeoJSON da força eleitoral de um candidato no cargo da última candidatura
    (ou da `candidatura_id` informada). Granularidade depende do cargo:

        VEREADOR / PREFEITO            → bairros (distritos IBGE)
        DEP. ESTADUAL/FEDERAL/GOV/DIST → municípios do estado
        SENADOR / PRESIDENTE           → 27 estados do Brasil

    Retorna FeatureCollection com `_meta` (cargo, partido_cor, top_regiao,
    regiao_mais_fraca, etc.) usado pelo `<DossieMapaCandidato>` e pelo PDF.
    Cache em memória por candidatura_id (TTL infinito até restart).

    Devolve 404 se o candidato não tem candidaturas válidas em cargos
    principais ou se nenhum mapa pôde ser gerado.
    """
    payload = await obter_geojson_candidato(db, candidato_id, candidatura_id)
    if payload is None:
        from fastapi import HTTPException
        raise HTTPException(404, "Sem dados de mapa para esse candidato.")
    payload["_meta"]["candidato_id"] = candidato_id
    return payload


@router.get("/visao-geral")
async def get_visao_geral(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Dashboard nacional — visão completa de todos os mandatos ativos do partido.
    Cada cargo usa o último pleito em que o partido participou.
    """
    result = await db.execute(text("""
        WITH ultimo_por_cargo AS (
            -- Último ano de eleição por cargo em que o partido teve eleitos
            SELECT ca.cargo, MAX(ca.ano) AS ultimo_ano
            FROM candidaturas ca
            WHERE ca.eleito = TRUE
            GROUP BY ca.cargo
        )
        SELECT
            ca.cargo,
            upc.ultimo_ano            AS ano,
            COUNT(DISTINCT ca.id)     AS total_eleitos,
            COUNT(DISTINCT ca.estado_uf) AS estados_cobertos,
            COALESCE(SUM(ca.votos_total), 0) AS total_votos
        FROM candidaturas ca
        JOIN ultimo_por_cargo upc
            ON ca.cargo = upc.cargo AND ca.ano = upc.ultimo_ano
        WHERE ca.eleito = TRUE
        GROUP BY ca.cargo, upc.ultimo_ano
          AND ca.cargo IN (
              'PRESIDENTE', 'GOVERNADOR', 'SENADOR',
              'DEPUTADO FEDERAL', 'DEPUTADO ESTADUAL', 'DEPUTADO DISTRITAL',
              'PREFEITO', 'VEREADOR'
          )
        ORDER BY
            CASE ca.cargo
                WHEN 'PRESIDENTE'        THEN 1
                WHEN 'GOVERNADOR'        THEN 2
                WHEN 'SENADOR'           THEN 3
                WHEN 'DEPUTADO FEDERAL'  THEN 4
                WHEN 'DEPUTADO ESTADUAL' THEN 5
                WHEN 'DEPUTADO DISTRITAL'THEN 6
                WHEN 'PREFEITO'          THEN 7
                WHEN 'VEREADOR'          THEN 8
                ELSE 9
            END
    """))

    rows = result.fetchall()

    por_cargo = [
        {
            "cargo":            r.cargo,
            "ano":              r.ano,
            "total_eleitos":    r.total_eleitos,
            "estados_cobertos": r.estados_cobertos,
            "total_votos":      int(r.total_votos or 0),
        }
        for r in rows
    ]

    total_eleitos = sum(r["total_eleitos"] for r in por_cargo)
    total_votos   = sum(r["total_votos"]   for r in por_cargo)

    # Cobertura geográfica (via farol VEREADOR 2024 — cargo mais amplo)
    cobertura = await db.execute(text("""
        SELECT
            COUNT(DISTINCT CASE WHEN f.eleitos_atual > 0 THEN m.id END) AS municipios_com_eleito,
            COUNT(DISTINCT m.id) AS total_municipios,
            COUNT(DISTINCT CASE WHEN f.eleitos_atual > 0 THEN m.estado_uf END) AS estados_com_eleito
        FROM municipios m
        LEFT JOIN (
            SELECT DISTINCT ON (municipio_id)
                municipio_id, eleitos_atual
            FROM farol_municipio f
            JOIN partidos p ON p.id = f.partido_id
            WHERE f.ano_referencia = 2024
              AND UPPER(f.cargo) = 'VEREADOR'
            ORDER BY municipio_id, f.eleitos_atual DESC NULLS LAST
        ) f ON f.municipio_id = m.id
    """))
    cob = cobertura.fetchone()

    return {
        "total_eleitos":        total_eleitos,
        "total_votos":          total_votos,
        "por_cargo":            por_cargo,
        "municipios_com_eleito": cob.municipios_com_eleito if cob else 0,
        "total_municipios":     cob.total_municipios if cob else 0,
        "estados_com_eleito":   cob.estados_com_eleito if cob else 0,
    }


@router.get("/farol")
async def get_farol(
    ano: int = Query(2024, description="Ano de referência"),
    cargo: str = Query("VEREADOR", description="Cargo"),
    uf: str | None = Query(None, description="Filtrar por estado"),
    partido_ids: str | None = Query(None, description="Números dos partidos separados por vírgula (ex: 44,25). Vazio = todos"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Retorna o farol (verde/amarelo/vermelho) por município.
    Usado para colorir o mapa e exibir o painel de KPIs.
    partido_ids vazio = visão nacional (todos os partidos).
    """
    filtro_uf = "AND m.estado_uf = :uf" if uf else ""
    params: dict = {"ano": ano, "cargo": cargo.upper()}
    if uf:
        params["uf"] = uf

    # Filtro de partido (opcional — vazio = todos os partidos)
    if partido_ids:
        nums = [int(p.strip()) for p in partido_ids.split(",") if p.strip().isdigit()]
        if nums:
            placeholders = ", ".join(f":pnum_{i}" for i in range(len(nums)))
            filtro_partido = f"AND f.partido_id IN (SELECT id FROM partidos WHERE numero IN ({placeholders}))"
            order_partido = "CASE 1 THEN 1 ELSE 2 END"
            for i, n in enumerate(nums):
                params[f"pnum_{i}"] = n
        else:
            filtro_partido = ""
            order_partido = "1"
    else:
        filtro_partido = ""
        order_partido = "1"

    result = await db.execute(text(f"""
        SELECT DISTINCT ON (m.id)
            m.id,
            m.codigo_ibge,
            m.nome,
            m.estado_uf,
            f.status        AS farol,
            f.votos_atual,
            f.votos_anterior,
            f.variacao_pct,
            f.eleitos_atual
        FROM municipios m
        LEFT JOIN farol_municipio f
            ON f.municipio_id = m.id
           AND f.ano_referencia = :ano
           AND UPPER(f.cargo) = :cargo
           {filtro_partido}
        WHERE 1=1 {filtro_uf}
        ORDER BY m.id, {order_partido}
    """), params)

    rows = result.fetchall()

    municipios = [
        {
            "id":           r.id,
            "codigo_ibge":  r.codigo_ibge,
            "nome":         r.nome,
            "estado_uf":    r.estado_uf,
            "farol":        r.farol or "SEM_DADOS",
            "votos_atual":  r.votos_atual or 0,
            "votos_ant":    r.votos_anterior or 0,
            "variacao_pct": r.variacao_pct,
            "eleitos":      r.eleitos_atual or 0,
        }
        for r in rows
    ]

    # Resumo geral (4 cores: AZUL, VERDE, AMARELO, VERMELHO)
    azuis     = sum(1 for m in municipios if m["farol"] == "AZUL")
    verdes    = sum(1 for m in municipios if m["farol"] == "VERDE")
    amarelos  = sum(1 for m in municipios if m["farol"] == "AMARELO")
    vermelhos = sum(1 for m in municipios if m["farol"] == "VERMELHO")
    total_votos   = sum(m["votos_atual"] for m in municipios)
    total_eleitos = sum(m["eleitos"] for m in municipios)

    # Presença real = municípios onde UB tem força suficiente (AZUL + VERDE + AMARELO)
    # VERMELHO = candidatou mas muito fraco (<5% votos e 0 eleitos)
    # SEM_DADOS = nunca candidatou neste cargo/ano
    municipios_com_presenca = azuis + verdes + amarelos
    municipios_sem_candidato = sum(1 for m in municipios if m["farol"] == "SEM_DADOS")
    total_municipios = len(municipios)

    return {
        "municipios":               municipios,
        "total_votos":              total_votos,
        "total_eleitos":            total_eleitos,
        "azuis":                    azuis,
        "verdes":                   verdes,
        "amarelos":                 amarelos,
        "vermelhos":                vermelhos,
        "municipios_com_presenca":  municipios_com_presenca,   # azul+verde+amarelo
        "municipios_com_eleito":    sum(1 for m in municipios if m["eleitos"] > 0),
        "municipios_sem_candidato": municipios_sem_candidato,  # cinza no mapa
        "municipios_vermelho":      vermelhos,                 # rodou mas fraco
        "total_municipios":         total_municipios,
    }


_partidos_cache: dict = {}  # cache in-memory TTL 1h
_ranking_partidos_cache: dict = {}  # cache por (cargo, ano, uf, turno)
_comparacao_cands_cache: dict = {}  # cache /geojson/{uf}/comparacao
_comparacao_partidos_cache: dict = {}  # cache /geojson/{uf}/comparacao-partidos

@router.get("/partidos")
async def get_partidos(
    response: Response,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """Lista todos os partidos com candidatos no banco, ordenados por total de votos.

    Cache in-memory TTL 1h + Cache-Control 300s (partidos mudam raramente).
    Antes: 7-8s por request (agregava 1M+ candidaturas a cada chamada).
    """
    import time
    now = time.time()
    cached = _partidos_cache.get("v1")
    if cached and (now - cached["at"]) < 3600:
        response.headers["Cache-Control"] = "private, max-age=300"
        return cached["data"]

    result = await db.execute(text("""
        SELECT
            p.numero,
            p.sigla,
            p.nome,
            p.logo_url,
            COUNT(DISTINCT ca.id)            AS total_candidaturas,
            COUNT(DISTINCT ca.id) FILTER (WHERE ca.eleito = TRUE) AS total_eleitos,
            COALESCE(SUM(ca.votos_total), 0) AS total_votos
        FROM partidos p
        JOIN candidaturas ca ON ca.partido_id = p.id
        GROUP BY p.numero, p.sigla, p.nome, p.logo_url
        HAVING COUNT(DISTINCT ca.id) > 10
        ORDER BY total_votos DESC
        LIMIT 40
    """))
    data = [
        {
            "numero":              r.numero,
            "sigla":               r.sigla,
            "nome":                r.nome,
            "logo_url":            r.logo_url,
            "total_candidaturas":  r.total_candidaturas,
            "total_eleitos":       r.total_eleitos,
            "total_votos":         int(r.total_votos or 0),
        }
        for r in result.fetchall()
    ]
    _partidos_cache["v1"] = {"at": now, "data": data}
    response.headers["Cache-Control"] = "private, max-age=300"
    return data


@router.get("/ranking-partidos")
async def get_ranking_partidos(
    response: Response,
    cargo: str | None = Query(None, description="Filtra cargo específico (VEREADOR, PREFEITO...). Omitir = vigentes"),
    ano: int | None = Query(None, description="Ano. Obrigatório se cargo passado."),
    uf: str | None = Query(None, description="UF pra escopo estadual (ex: SP). Omitir = nacional"),
    turno: int = Query(1, description="Turno: 0=Total (COALESCE 2t/1t), 1=1T puro, 2=2T puro"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Ranking de partidos.
    - Sem cargo: vigentes (score composto, todos os cargos atuais)
    - Com cargo+ano: contagem real de eleitos + votos pra aquele cargo/ano/turno
    - Com uf: restringe ao estado (ex: forca dos partidos em SP)
    Tabs (padrão Globo):
    - turno=0 (Total): resultado FINAL usando COALESCE(votos_2t, votos_1t) por candidato.
                       Eleitor votou só 1x efetivamente no pleito final. NUNCA somar 1T+2T.
    - turno=1 (1T): soma votos_1t (pleito original com todos os candidatos)
    - turno=2 (2T): soma votos_2t (só candidatos que foram pro 2T)
    Cache in-memory (dados TSE imutaveis).
    """
    cache_key = f"r:{cargo or 'vig'}:{ano or 'x'}:{uf or 'BR'}:t{turno}"
    if cache_key in _ranking_partidos_cache:
        response.headers["Cache-Control"] = "private, max-age=300"
        return _ranking_partidos_cache[cache_key]

    uf_filter = "AND ca.estado_uf = :uf" if uf else ""

    # ── Modo cargo específico (Vereador/Deputado/etc): conta REAL, sem subestimar ──
    # Turno 1 = candidaturas.votos_1t. Turno 2 = candidaturas.votos_2t (preenchido
    # só pra quem foi pra 2T). Campo `turno` em candidaturas eh sempre 1 (modelo
    # TSE). Voto por turno: usar votos_1t / votos_2t. Eleito: COUNT da candidatura.
    if cargo and ano:
        params: dict = {"ano": ano, "cargo": cargo.upper()}
        if uf:
            params["uf"] = uf.upper()
        # Padrão unificado (19/04/2026): TODOS os cargos votaram no 1T, o 2T é
        # apenas desempate para alguns municípios. Então:
        # - Total (turno=0): usa votos_1t (pleito universal - 127M bate com realidade).
        #                   Diferença pro 1T é só semântica: tab Total representa
        #                   "resultado final do pleito" (coluna eleito já é final
        #                   no banco - quem venceu o 2T aparece como eleito=true).
        # - 1T (turno=1): votos_1t puros
        # - 2T (turno=2): votos_2t puros + filtrar só quem foi pro 2T
        # Cesar 19/04: "banco e o mesmo, um nao pode mostrar algo diferente do outro".
        if turno == 2:
            votos_expr = "ca.votos_2t"
            extra_filter_2t = "AND COALESCE(ca.votos_2t, 0) > 0"
        else:  # turno == 0 ou 1: mesmo votos_1t
            votos_expr = "ca.votos_1t"
            extra_filter_2t = ""
        rows = (await db.execute(text(f"""
            SELECT
                p.numero, p.sigla, p.nome, p.logo_url,
                COUNT(*) FILTER (WHERE ca.eleito)                AS total_eleitos,
                COALESCE(SUM({votos_expr}), 0)                    AS total_votos,
                COUNT(DISTINCT ca.estado_uf)                      AS estados_presenca
            FROM candidaturas ca
            JOIN partidos p ON p.id = ca.partido_id
            WHERE ca.ano = :ano AND UPPER(ca.cargo) = :cargo
              {uf_filter}
              {extra_filter_2t}
            GROUP BY p.numero, p.sigla, p.nome, p.logo_url
            HAVING SUM({votos_expr}) > 0 OR COUNT(*) FILTER (WHERE ca.eleito) > 0
            ORDER BY total_eleitos DESC, total_votos DESC
        """), params)).fetchall()
        data = [
            {
                "numero": r.numero, "sigla": r.sigla, "nome": r.nome, "logo_url": r.logo_url,
                "total_eleitos": int(r.total_eleitos or 0),
                "total_votos": int(r.total_votos or 0),
                "estados_presenca": int(r.estados_presenca or 0),
                "score_composto": float(r.total_votos or 0),
            }
            for r in rows
        ]
        _ranking_partidos_cache[cache_key] = data
        response.headers["Cache-Control"] = "private, max-age=300"
        return data
    result = await db.execute(text("""
        WITH pop_brasil AS (
            SELECT COALESCE(SUM(populacao), 1)::float AS total
            FROM municipios WHERE populacao > 0
        ),
        votos_max AS (
            SELECT COALESCE(MAX(votos_total), 1)::float AS maximo
            FROM candidaturas
            WHERE eleito = TRUE AND turno = 1
              AND ((ano = 2024 AND cargo IN ('PREFEITO','VEREADOR'))
                OR (ano = 2022 AND cargo IN ('PRESIDENTE','GOVERNADOR','DEPUTADO FEDERAL','DEPUTADO ESTADUAL','DEPUTADO DISTRITAL'))
                OR (ano IN (2018,2022) AND cargo = 'SENADOR'))
        ),
        vigentes AS (
            SELECT
                p.numero,
                p.sigla,
                p.nome,
                p.logo_url,
                ca.votos_total,
                m.estado_uf,
                COALESCE(m.populacao, 0) AS pop_municipio,
                COALESCE(m.populacao, 0)::float * COALESCE(m.pib_per_capita, 0) AS pib_municipio,
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
                END AS peso_cargo
            FROM candidaturas ca
            JOIN partidos p ON p.id = ca.partido_id
            LEFT JOIN municipios m ON m.id = ca.municipio_id
            WHERE ca.eleito = TRUE
              AND ca.turno = 1
              AND (
                (ca.ano = 2024 AND UPPER(ca.cargo) IN ('PREFEITO', 'VEREADOR'))
                OR (ca.ano = 2022 AND UPPER(ca.cargo) IN ('PRESIDENTE', 'GOVERNADOR', 'DEPUTADO FEDERAL', 'DEPUTADO ESTADUAL', 'DEPUTADO DISTRITAL'))
                OR (ca.ano IN (2018, 2022) AND UPPER(ca.cargo) = 'SENADOR')
              )
        ),
        por_partido AS (
            SELECT
                v.numero,
                v.sigla,
                v.nome,
                v.logo_url,
                COUNT(*)                         AS total_eleitos,
                COALESCE(SUM(v.votos_total), 0)  AS total_votos,
                COUNT(DISTINCT v.estado_uf)      AS estados_presenca,
                SUM(v.peso_cargo)                AS pilar1_cadeiras,
                SUM(v.pop_municipio)::float      AS pop_controlada,
                SUM(v.pib_municipio)::float      AS pib_controlado
            FROM vigentes v
            GROUP BY v.numero, v.sigla, v.nome, v.logo_url
        ),
        com_score AS (
            SELECT
                pp.*,
                -- Pilar 1: cadeiras ponderadas (normalizado pelo max)
                pp.pilar1_cadeiras::float / NULLIF((SELECT MAX(pilar1_cadeiras) FROM por_partido), 1) AS p1_norm,
                -- Pilar 2: votos (normalizado pelo max)
                pp.total_votos::float / NULLIF((SELECT MAX(total_votos) FROM por_partido), 1) AS p2_norm,
                -- Pilar 3: forca economica = PIB controlado (normalizado pelo max)
                pp.pib_controlado / NULLIF((SELECT MAX(pib_controlado) FROM por_partido), 1) AS p3_norm
            FROM por_partido pp
        )
        SELECT *,
            (p1_norm * 0.4 + p2_norm * 0.3 + p3_norm * 0.3) * 100 AS score_composto
        FROM com_score
        ORDER BY score_composto DESC
    """))
    return [
        {
            "numero":            r.numero,
            "sigla":             r.sigla,
            "nome":              r.nome,
            "logo_url":          r.logo_url,
            "total_eleitos":     r.total_eleitos,
            "total_votos":       int(r.total_votos or 0),
            "estados_presenca":  r.estados_presenca,
            "pilar1_cadeiras":   int(r.pilar1_cadeiras or 0),
            "pilar2_votos_pct":  round(float(r.p2_norm or 0) * 100, 1),
            "pilar3_econ_pct":   round(float(r.p3_norm or 0) * 100, 1),
            "pib_controlado":    int(r.pib_controlado or 0),
            "pop_controlada":    int(r.pop_controlada or 0),
            "score_composto":    round(float(r.score_composto or 0), 1),
        }
        for r in result.fetchall()
    ]


@router.get("/geojson/brasil")
async def get_geojson_brasil(
    ano: int = Query(2024),
    cargo: str = Query("VEREADOR"),
    modo: str = Query("eleitos", description="'eleitos' = farol por resultado eleitoral; 'votos' = farol por força de voto percentílica"),
    partido: int | None = Query(None, description="Número do partido. Omitir = todos os partidos"),
    candidato_id: int | None = Query(None, description="Filtra por candidato — mostra força de voto por estado"),
    turno: int = Query(1, description="Turno da eleição (1 ou 2)"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    GeoJSON de todos os ESTADOS do Brasil com o farol do partido selecionado.
    Resultado é cacheado em memória por (ano, cargo, modo, partido).
    """

    # ── Filtro por candidato específico (para dossiê — SENADOR/PRESIDENTE) ──
    if candidato_id is not None:
        result = await db.execute(text("""
            WITH cand AS (
                SELECT ca.id AS candidatura_id
                FROM candidaturas ca
                WHERE ca.candidato_id = :cid
                  AND ca.ano = :ano
                  AND UPPER(ca.cargo) = :cargo
                LIMIT 1
            ),
            votos_estado AS (
                SELECT m.estado_uf, SUM(vpz.qt_votos) AS votos
                FROM votos_por_zona vpz
                JOIN zonas_eleitorais ze ON ze.id = vpz.zona_id
                JOIN municipios m ON m.id = ze.municipio_id
                WHERE vpz.candidatura_id = (SELECT candidatura_id FROM cand)
                GROUP BY m.estado_uf
            ),
            stats AS (
                SELECT AVG(votos) AS media, STDDEV(votos) AS desvio
                FROM votos_estado WHERE votos > 0
            )
            SELECT
                eg.estado_uf,
                COALESCE(ve.votos, 0) AS votos,
                CASE
                    WHEN ve.votos IS NULL OR ve.votos = 0               THEN 'FORA'
                    WHEN ve.votos >= COALESCE(s.media + s.desvio, ve.votos) THEN 'AZUL'
                    WHEN ve.votos >= COALESCE(s.media, 0)               THEN 'VERDE'
                    ELSE                                                     'AMARELO'
                END AS status_farol,
                ST_AsGeoJSON(eg.geometry, 4)::json AS geom
            FROM estados_geometria eg
            LEFT JOIN votos_estado ve ON ve.estado_uf = eg.estado_uf
            CROSS JOIN stats s
            ORDER BY eg.estado_uf
        """), {"cid": candidato_id, "ano": ano, "cargo": cargo.upper()})

        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "estado_uf":    r.estado_uf,
                    "status_farol": r.status_farol,
                    "votos":        int(r.votos or 0),
                },
            })
        enriquecer_features_percentil(features, SCORE_FNS["votos"])
        return {"type": "FeatureCollection", "features": features}

    # ── Visão inicial "Todos os cargos" com dominância ponderada por peso ──────
    if cargo.upper() == "TODOS" and partido is None:
        # Pesos: quanto mais estratégico o cargo, maior o peso no score
        result = await db.execute(text("""
            WITH scores AS (
                SELECT
                    ca.estado_uf,
                    p.numero  AS partido_num,
                    p.sigla   AS partido_sigla,
                    SUM(
                        CASE WHEN ca.eleito THEN
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
                    COUNT(*) FILTER (WHERE ca.eleito) AS n_eleitos
                FROM candidaturas ca
                JOIN partidos p ON p.id = ca.partido_id
                GROUP BY ca.estado_uf, p.numero, p.sigla
            ),
            totais_estado AS (
                SELECT estado_uf, SUM(n_eleitos) AS total_eleitos_real
                FROM scores GROUP BY estado_uf
            ),
            dominante AS (
                SELECT DISTINCT ON (estado_uf)
                    estado_uf, partido_num, partido_sigla, score_ponderado, n_eleitos
                FROM scores
                WHERE score_ponderado > 0
                ORDER BY estado_uf, score_ponderado DESC
            )
            SELECT
                eg.estado_uf,
                COALESCE(d.partido_num,         0)  AS partido_num,
                COALESCE(d.partido_sigla,       '') AS partido_sigla,
                COALESCE(d.n_eleitos,           0)  AS eleitos_dominante,
                COALESCE(te.total_eleitos_real, 0)  AS total_eleitos,
                (SELECT COUNT(*) FROM municipios m WHERE m.estado_uf = eg.estado_uf) AS total_municipios,
                ST_AsGeoJSON(eg.geometry, 4)::json AS geom
            FROM estados_geometria eg
            LEFT JOIN dominante     d  ON d.estado_uf  = eg.estado_uf
            LEFT JOIN totais_estado te ON te.estado_uf = eg.estado_uf
            ORDER BY eg.estado_uf
        """))
        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "estado_uf":         r.estado_uf,
                    "partido_num":       r.partido_num,
                    "partido_sigla":     r.partido_sigla,
                    "eleitos_dominante": r.eleitos_dominante,
                    "total_eleitos":     r.total_eleitos,
                    "total_municipios":  r.total_municipios,
                    "status_farol":      "TODOS",
                },
            })
        enriquecer_features_percentil(features, SCORE_FNS["eleitos_dominante"])
        data = {"type": "FeatureCollection", "features": features}
        _geojson_brasil_cache["TODOS"] = data
        return data

    # ── Mandatos vigentes: consolida 2024 + 2022 + 2018(senadores) ───────────
    if cargo.upper() == "VIGENTES":
        cache_key_v = f"VIGENTES:{partido or 'todos'}"
        if cache_key_v in _geojson_brasil_cache:
            return _geojson_brasil_cache[cache_key_v]

        filtro_v = f"AND p.numero = {int(partido)}" if partido else ""
        result = await db.execute(text(f"""
            WITH scores AS (
                SELECT
                    ca.estado_uf,
                    p.numero  AS partido_num,
                    p.sigla   AS partido_sigla,
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
                    COUNT(*) FILTER (WHERE ca.eleito AND ca.turno = 1) AS n_eleitos,
                    -- VIGENTES: votos ZERADO intencionalmente. Somar votos de cargos
                    -- diferentes (vereador + governador + senador) nao tem significado
                    -- estatistico. Use score_ponderado como metrica de presenca.
                    -- Cesar 20/04/2026.
                    0::bigint AS total_votos
                FROM candidaturas ca
                JOIN partidos p ON p.id = ca.partido_id
                WHERE ca.turno = 1
                  AND (
                    (ca.ano = 2024 AND UPPER(ca.cargo) IN ('PREFEITO','VEREADOR'))
                    OR (ca.ano = 2022 AND UPPER(ca.cargo) IN ('PRESIDENTE','GOVERNADOR','DEPUTADO FEDERAL','DEPUTADO ESTADUAL','DEPUTADO DISTRITAL'))
                    OR (ca.ano IN (2018,2022) AND UPPER(ca.cargo) = 'SENADOR')
                  )
                  {filtro_v}
                GROUP BY ca.estado_uf, p.numero, p.sigla
            ),
            totais_estado AS (
                SELECT estado_uf, SUM(score_ponderado) AS score_total, SUM(n_eleitos) AS total_eleitos
                FROM scores GROUP BY estado_uf
            ),
            dominante AS (
                SELECT DISTINCT ON (estado_uf)
                    estado_uf, partido_num, partido_sigla, score_ponderado, n_eleitos, total_votos
                FROM scores
                WHERE score_ponderado > 0
                ORDER BY estado_uf, score_ponderado DESC
            )
            SELECT
                eg.estado_uf,
                COALESCE(d.partido_num,         0)   AS partido_num,
                COALESCE(d.partido_sigla,       '')  AS partido_sigla,
                COALESCE(d.n_eleitos,           0)   AS eleitos_dominante,
                COALESCE(d.score_ponderado,     0)   AS score_dominante,
                COALESCE(d.total_votos,         0)   AS votos_dominante,
                COALESCE(te.total_eleitos,      0)   AS total_eleitos,
                COALESCE(te.score_total,        0)   AS score_total,
                (SELECT COUNT(*) FROM municipios m WHERE m.estado_uf = eg.estado_uf) AS total_municipios,
                ST_AsGeoJSON(eg.geometry, 4)::json AS geom
            FROM estados_geometria eg
            LEFT JOIN dominante     d  ON d.estado_uf  = eg.estado_uf
            LEFT JOIN totais_estado te ON te.estado_uf = eg.estado_uf
            ORDER BY eg.estado_uf
        """))

        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            score = int(r.score_dominante or 0)
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "estado_uf":         r.estado_uf,
                    "partido_num":       r.partido_num,
                    "partido_sigla":     r.partido_sigla,
                    "eleitos_dominante": r.eleitos_dominante,
                    "score_dominante":   score,
                    "score_ponderado":   score,   # alias — COR_FILL_VIGENTES_PARTIDO lê este campo
                    "votos_dominante":   int(r.votos_dominante or 0),
                    "score_total":       int(r.score_total or 0),
                    "total_eleitos":     r.total_eleitos,
                    "total_municipios":  r.total_municipios,
                    "status_farol":      "VIGENTES",
                },
            })
        enriquecer_features_percentil(features, SCORE_FNS["score_ponderado"])
        data = {"type": "FeatureCollection", "features": features}
        _geojson_brasil_cache[cache_key_v] = data
        return data

    # Filtro dinâmico de partido — None = todos os partidos (visão nacional)
    if partido is not None:
        filtro_partido = f"AND f.partido_id IN (SELECT id FROM partidos WHERE numero = {int(partido)})"
    else:
        filtro_partido = ""

    cache_key = f"br:{ano}:{cargo.upper()}:{modo}:{partido or 'todos'}:t{turno}"
    rapido = _servir_cache_rapido(cache_key)
    if rapido is not None:
        return rapido
    if cache_key in _geojson_brasil_cache:
        return _geojson_brasil_cache[cache_key]

    if modo == "votos":
        result = await db.execute(text(f"""
            WITH municipio_dedup AS (
                SELECT DISTINCT ON (m.id)
                    m.estado_uf,
                    COALESCE(f.votos_atual, 0)   AS votos,
                    COALESCE(f.eleitos_atual, 0)  AS eleitos
                FROM municipios m
                LEFT JOIN farol_municipio f
                    ON f.municipio_id = m.id
                   AND f.ano_referencia = :ano
                   AND UPPER(f.cargo) = :cargo
                   {filtro_partido}
                ORDER BY m.id
            ),
            votos_estado AS (
                SELECT
                    estado_uf,
                    SUM(votos)   AS total_votos,
                    SUM(eleitos) AS total_eleitos,
                    COUNT(*)     AS total_municipios
                FROM municipio_dedup
                GROUP BY estado_uf
            ),
            stats AS (
                SELECT
                    AVG(total_votos)    AS media,
                    STDDEV(total_votos) AS desvio
                FROM votos_estado WHERE total_votos > 0
            )
            SELECT
                ve.estado_uf,
                ve.total_votos,
                ve.total_eleitos,
                ve.total_municipios,
                CASE
                    WHEN ve.total_votos = 0                                                                      THEN 'VERMELHO'
                    WHEN ve.total_eleitos > 0 AND s.desvio > 0 AND ve.total_votos >= s.media + s.desvio         THEN 'AZUL'
                    WHEN ve.total_eleitos > 0 AND ve.total_votos >= COALESCE(s.media, 0)                        THEN 'VERDE'
                    WHEN ve.total_eleitos > 0                                                                    THEN 'AMARELO'
                    WHEN s.desvio > 0 AND ve.total_votos >= s.media                                             THEN 'AMARELO'
                    ELSE                                                                                              'VERMELHO'
                END AS status_farol,
                ST_AsGeoJSON(eg.geometry, 4)::json AS geom
            FROM votos_estado ve
            CROSS JOIN stats s
            JOIN estados_geometria eg ON eg.estado_uf = ve.estado_uf
            ORDER BY ve.estado_uf
        """), {"ano": ano, "cargo": cargo.upper()})

        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "estado_uf":        r.estado_uf,
                    "status_farol":     r.status_farol,
                    "total_municipios": r.total_municipios,
                    "total_votos":      r.total_votos,
                    "total_eleitos":    r.total_eleitos,
                    "azuis": 0, "verdes": 0, "amarelos": 0, "vermelhos": 0,
                },
            })
        score_fn_brasil = SCORE_FNS["total_votos"]
    elif partido is None and cargo.upper() == "PRESIDENTE":
        # ── PRESIDENTE: dominância por VOTOS em cada estado ──────────────────
        # Presidente tem estado_uf='BR' em candidaturas (eleição nacional).
        # Para colorir o mapa por estado, agregamos votos_por_zona via
        # municipios.estado_uf e encontramos o partido com mais votos em cada UF.
        result = await db.execute(text("""
            WITH votos_partido_estado AS (
                SELECT
                    m.estado_uf,
                    p.numero  AS partido_num,
                    p.sigla   AS partido_sigla,
                    SUM(vpz.qt_votos) AS total_votos
                FROM votos_por_zona vpz
                JOIN candidaturas ca ON ca.id = vpz.candidatura_id
                JOIN partidos p ON p.id = ca.partido_id
                JOIN municipios m ON m.id = vpz.municipio_id
                WHERE UPPER(ca.cargo) = 'PRESIDENTE'
                  AND ca.ano = :ano
                  AND vpz.turno = :turno
                GROUP BY m.estado_uf, p.numero, p.sigla
            ),
            dominante AS (
                SELECT DISTINCT ON (estado_uf)
                    estado_uf, partido_num, partido_sigla, total_votos
                FROM votos_partido_estado
                ORDER BY estado_uf, total_votos DESC
            ),
            totais AS (
                SELECT estado_uf, SUM(total_votos) AS total_votos_estado
                FROM votos_partido_estado
                GROUP BY estado_uf
            )
            SELECT
                eg.estado_uf,
                COALESCE(d.partido_num, 0)      AS partido_num,
                COALESCE(d.partido_sigla, '')    AS partido_sigla,
                COALESCE(d.total_votos, 0)       AS votos_dominante,
                COALESCE(t.total_votos_estado, 0) AS total_votos,
                (SELECT COUNT(*) FROM municipios m WHERE m.estado_uf = eg.estado_uf) AS total_municipios,
                ST_AsGeoJSON(eg.geometry, 4)::json AS geom
            FROM estados_geometria eg
            LEFT JOIN dominante d ON d.estado_uf = eg.estado_uf
            LEFT JOIN totais    t ON t.estado_uf = eg.estado_uf
            ORDER BY eg.estado_uf
        """), {"ano": ano, "turno": turno})

        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "estado_uf":        r.estado_uf,
                    "partido_num":      r.partido_num,
                    "partido_sigla":    r.partido_sigla,
                    "eleitos_dominante": r.votos_dominante,
                    "total_eleitos":    r.total_votos,
                    "total_municipios": r.total_municipios,
                    "status_farol":     "TODOS",
                },
            })
        score_fn_brasil = SCORE_FNS["eleitos_dominante"]
    elif partido is None:
        # ── Todos os partidos: cor pelo partido dominante por estado ──────────
        # P0-3 fix: agrega tambem SUM(votos_total) por estado para o toggle
        # Estados. Antes o frontend recebia total_eleitos mas nao total_votos,
        # entao mostrava 0 no card Votos quando granularidade=Estados.
        result = await db.execute(text("""
            WITH base AS (
                SELECT
                    ca.estado_uf,
                    p.numero  AS partido_num,
                    p.sigla   AS partido_sigla,
                    ca.eleito,
                    COALESCE(ca.votos_total, 0) AS votos
                FROM candidaturas ca
                JOIN partidos p ON p.id = ca.partido_id
                WHERE (
                    (ca.ano = :ano AND UPPER(ca.cargo) = :cargo AND ca.turno = :turno)
                    OR (ca.estado_uf = 'DF' AND :cargo = 'VEREADOR'
                        AND UPPER(ca.cargo) IN ('DEPUTADO DISTRITAL', 'DEPUTADO ESTADUAL')
                        AND ca.turno = :turno
                        AND ca.ano = (
                            SELECT MAX(ca2.ano) FROM candidaturas ca2
                            WHERE ca2.estado_uf = 'DF'
                              AND UPPER(ca2.cargo) IN ('DEPUTADO DISTRITAL', 'DEPUTADO ESTADUAL')
                              AND ca2.ano <= :ano
                        ))
                    OR (ca.estado_uf = 'DF' AND :cargo = 'PREFEITO'
                        AND UPPER(ca.cargo) = 'GOVERNADOR'
                        AND ca.turno = :turno
                        AND ca.ano = (
                            SELECT MAX(ca2.ano) FROM candidaturas ca2
                            WHERE ca2.estado_uf = 'DF'
                              AND UPPER(ca2.cargo) = 'GOVERNADOR'
                              AND ca2.ano <= :ano
                        ))
                )
            ),
            eleitos_estado AS (
                SELECT estado_uf, partido_num, partido_sigla,
                       COUNT(*) FILTER (WHERE eleito) AS n_eleitos
                FROM base
                GROUP BY estado_uf, partido_num, partido_sigla
            ),
            totais AS (
                SELECT estado_uf,
                       SUM(CASE WHEN eleito THEN 1 ELSE 0 END) AS total_eleitos,
                       SUM(votos)::bigint AS total_votos
                FROM base
                GROUP BY estado_uf
            ),
            dominante AS (
                SELECT DISTINCT ON (estado_uf)
                    estado_uf, partido_num, partido_sigla, n_eleitos
                FROM eleitos_estado
                WHERE n_eleitos > 0
                ORDER BY estado_uf, n_eleitos DESC
            )
            SELECT
                eg.estado_uf,
                COALESCE(d.partido_num, 0)    AS partido_num,
                COALESCE(d.partido_sigla, '') AS partido_sigla,
                COALESCE(d.n_eleitos, 0)      AS eleitos_dominante,
                COALESCE(t.total_eleitos, 0)  AS total_eleitos,
                COALESCE(t.total_votos,   0)  AS total_votos,
                (SELECT COUNT(*) FROM municipios m WHERE m.estado_uf = eg.estado_uf) AS total_municipios,
                ST_AsGeoJSON(eg.geometry, 4)::json AS geom
            FROM estados_geometria eg
            LEFT JOIN dominante d ON d.estado_uf = eg.estado_uf
            LEFT JOIN totais    t ON t.estado_uf = eg.estado_uf
            ORDER BY eg.estado_uf
        """), {"ano": ano, "cargo": cargo.upper(), "turno": turno})

        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "estado_uf":        r.estado_uf,
                    "partido_num":      r.partido_num,
                    "partido_sigla":    r.partido_sigla,
                    "eleitos_dominante": r.eleitos_dominante,
                    "total_eleitos":    r.total_eleitos,
                    "total_votos":      int(r.total_votos or 0),
                    "total_municipios": r.total_municipios,
                    "status_farol":     "TODOS",
                },
            })
        score_fn_brasil = SCORE_FNS["eleitos_dominante"]
    else:
        # ── Partido específico: farol por estado ─────────────────────────────
        result = await db.execute(text(f"""
            WITH farol_ub AS (
                SELECT DISTINCT ON (m.id)
                    m.id AS municipio_id,
                    m.estado_uf,
                    COALESCE(f.status, 'SEM_DADOS') AS status_farol,
                    COALESCE(f.eleitos_atual, 0)     AS eleitos,
                    COALESCE(f.votos_atual,   0)     AS votos
                FROM municipios m
                LEFT JOIN farol_municipio f
                    ON f.municipio_id = m.id
                   AND f.ano_referencia = :ano
                   AND UPPER(f.cargo) = :cargo
                   {filtro_partido}
                ORDER BY m.id
            ),
            estado_stats AS (
                SELECT
                    estado_uf,
                    COUNT(*)                                          AS total_municipios,
                    COUNT(*) FILTER (WHERE status_farol = 'AZUL')    AS azuis,
                    COUNT(*) FILTER (WHERE status_farol = 'VERDE')   AS verdes,
                    COUNT(*) FILTER (WHERE status_farol = 'AMARELO') AS amarelos,
                    COUNT(*) FILTER (WHERE status_farol = 'VERMELHO') AS vermelhos,
                    SUM(eleitos)                                      AS total_eleitos,
                    SUM(votos)::bigint                                AS total_votos
                FROM farol_ub
                GROUP BY estado_uf
            )
            SELECT
                e.estado_uf,
                e.total_municipios,
                e.azuis, e.verdes, e.amarelos, e.vermelhos,
                e.total_eleitos,
                e.total_votos,
                CASE
                    WHEN e.azuis > 0 AND e.azuis >= e.verdes AND e.azuis >= e.amarelos AND e.azuis >= e.vermelhos
                        THEN 'AZUL'
                    WHEN e.verdes >= e.amarelos AND e.verdes >= e.vermelhos AND e.verdes > 0
                        THEN 'VERDE'
                    WHEN e.amarelos >= e.vermelhos AND e.amarelos > 0
                        THEN 'AMARELO'
                    WHEN e.vermelhos > 0
                        THEN 'VERMELHO'
                    ELSE 'SEM_DADOS'
                END AS status_dominante,
                ST_AsGeoJSON(eg.geometry, 4)::json AS geom
            FROM estado_stats e
            JOIN estados_geometria eg ON eg.estado_uf = e.estado_uf
            ORDER BY e.estado_uf
        """), {"ano": ano, "cargo": cargo.upper()})

        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "estado_uf":        r.estado_uf,
                    "status_farol":     r.status_dominante,
                    "total_municipios": r.total_municipios,
                    "azuis":            r.azuis,
                    "verdes":           r.verdes,
                    "amarelos":         r.amarelos,
                    "vermelhos":        r.vermelhos,
                    "total_eleitos":    r.total_eleitos,
                    "total_votos":      int(r.total_votos or 0),
                },
            })
        score_fn_brasil = SCORE_FNS["estado_partido_composite"]

    enriquecer_features_percentil(features, score_fn_brasil)
    resultado = {"type": "FeatureCollection", "features": features}
    _geojson_brasil_cache[cache_key] = resultado
    # Persiste em disco (exceto quando candidato_id presente - alta cardinalidade)
    if candidato_id is None:
        _salvar_disco(cache_key, resultado)
    return resultado


# Cache separado para o mapa Brasil por município (geometrias estáticas)
_brasil_mun_cache: dict = {}


@router.get("/geojson/brasil-municipios")
async def get_geojson_brasil_municipios(
    response: Response,
    ano: int | None = Query(None, description="Ano da eleição. Omitir para visão geral de todos os anos"),
    cargo: str | None = Query(None, description="Cargo. Omitir para visão geral (todos os cargos)"),
    partido: int | None = Query(None, description="Número do partido (opcional). Sem ele: partido dominante por município"),
    turno: int = Query(1, description="Turno (1 ou 2). Afeta cargos com 2T (PRESIDENTE/GOVERNADOR/PREFEITO)."),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    GeoJSON de TODOS OS MUNICÍPIOS do Brasil — nível Brasil com partido dominante.
    Usa geometry_brasil (pré-simplificada 0.01°) — sem computação em runtime.
    - Sem cargo/ano: visão global de todos os pleitos (partido dominante por município)
    - Com cargo: filtra para aquele cargo/ano/turno específico
    - Com partido: farol de força daquele partido em cada município.
    Resultado cacheado em memória por (ano, cargo, partido, turno).
    """
    cargo_key   = cargo.upper() if cargo else "TODOS"
    ano_key     = str(ano) if ano else "TODOS"
    cache_key   = f"mun:{ano_key}:{cargo_key}:{partido or 'todos'}:t{turno}"
    # FAST PATH: cache em disco retorna bytes gzipped direto (sem re-serializar).
    # ~50ms em vez de 1.5-3s. Sobrevive a restart.
    rapido = _servir_cache_rapido(cache_key)
    if rapido is not None:
        return rapido
    # Cache em memória (2a camada, ex: se warmup nao rodou)
    if cache_key in _brasil_mun_cache:
        response.headers["Cache-Control"] = "private, max-age=300"
        return _brasil_mun_cache[cache_key]

    # Usa geometry_brasil pré-simplificada quando disponível, fallback para simplificação runtime
    geom_col = "COALESCE(m.geometry_brasil, ST_Multi(ST_SimplifyPreserveTopology(m.geometry, 0.01)))"

    # Cargos estaduais/nacionais não têm municipio_id em candidaturas — agrega por estado_uf
    # e replica o resultado para todos os municípios daquele estado.
    CARGOS_ESTADUAIS = {
        "PRESIDENTE", "GOVERNADOR", "SENADOR",
        "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL"
    }
    cargo_upper = cargo.upper() if cargo else None
    is_estadual = cargo_upper in CARGOS_ESTADUAIS

    if partido is not None:
        # ── Farol do partido por município ────────────────────────────────
        if cargo and ano:
            if cargo_upper == "PRESIDENTE":
                # PRESIDENTE: agregar votos_por_zona por municipio (nao replicar nacional)
                sql_farol = f"""
                WITH votos_mun AS (
                    SELECT
                        vpz.municipio_id,
                        SUM(vpz.qt_votos) AS votos
                    FROM votos_por_zona vpz
                    JOIN candidaturas ca ON ca.id = vpz.candidatura_id
                    WHERE ca.partido_id IN (SELECT id FROM partidos WHERE numero = {int(partido)})
                      AND UPPER(ca.cargo) = 'PRESIDENTE'
                      AND ca.ano = :ano
                      AND vpz.turno = :turno
                    GROUP BY vpz.municipio_id
                ),
                mun_votos AS (
                    SELECT
                        m.id, m.codigo_ibge, m.nome, m.estado_uf,
                        COALESCE(vm.votos, 0) AS votos,
                        CASE WHEN vm.votos > 0 THEN 1 ELSE 0 END AS eleitos,
                        ST_AsGeoJSON({geom_col}, 3)::json AS geom
                    FROM municipios m
                    LEFT JOIN votos_mun vm ON vm.municipio_id = m.id
                    WHERE m.geometry IS NOT NULL
                )"""
                sql_params: dict = {"ano": ano, "turno": turno}
            elif is_estadual:
                # Cargo estadual (GOV, DEP, SEN): agrega por estado
                sql_farol = f"""
                WITH estado_agg AS (
                    SELECT
                        ca.estado_uf,
                        COALESCE(SUM(ca.votos_total), 0)         AS votos,
                        COUNT(*) FILTER (WHERE ca.eleito = TRUE)  AS eleitos
                    FROM candidaturas ca
                    WHERE ca.partido_id IN (SELECT id FROM partidos WHERE numero = {int(partido)})
                      AND ca.ano = :ano AND UPPER(ca.cargo) = :cargo
                    GROUP BY ca.estado_uf
                ),
                mun_votos AS (
                    SELECT
                        m.id, m.codigo_ibge, m.nome, m.estado_uf,
                        COALESCE(ea.votos, 0) AS votos,
                        COALESCE(ea.eleitos, 0) AS eleitos,
                        ST_AsGeoJSON({geom_col}, 3)::json AS geom
                    FROM municipios m
                    LEFT JOIN estado_agg ea ON ea.estado_uf = m.estado_uf
                    WHERE m.geometry IS NOT NULL
                )"""
                sql_params: dict = {"ano": ano, "cargo": cargo_upper}
            else:
                # Cargo municipal: usa farol_municipio pré-calculado
                sql_farol = f"""
                WITH mun_votos AS (
                    SELECT DISTINCT ON (m.id)
                        m.id, m.codigo_ibge, m.nome, m.estado_uf,
                        COALESCE(f.votos_atual, 0)  AS votos,
                        COALESCE(f.eleitos_atual, 0) AS eleitos,
                        ST_AsGeoJSON({geom_col}, 3)::json AS geom
                    FROM municipios m
                    LEFT JOIN farol_municipio f
                        ON f.municipio_id = m.id
                       AND f.ano_referencia = :ano
                       AND UPPER(f.cargo) = :cargo
                       AND f.partido_id IN (SELECT id FROM partidos WHERE numero = {int(partido)})
                    WHERE m.geometry IS NOT NULL
                    ORDER BY m.id
                )"""
                sql_params = {"ano": ano, "cargo": cargo_upper}
        else:
            # Visão global: agrega candidaturas do último pleito de cada cargo
            # Nota: geom não entra no GROUP BY — calcula depois de agregar por m.id
            sql_farol = f"""
            WITH ultimo_por_cargo AS (
                SELECT UPPER(cargo) AS cargo, MAX(ano) AS ultimo_ano
                FROM candidaturas WHERE eleito = TRUE
                GROUP BY UPPER(cargo)
            ),
            mun_agg AS (
                SELECT
                    m.id,
                    COALESCE(SUM(ca.votos_total), 0)            AS votos,
                    COUNT(*) FILTER (WHERE ca.eleito = TRUE)    AS eleitos
                FROM municipios m
                LEFT JOIN candidaturas ca
                    ON ca.municipio_id = m.id
                   AND ca.partido_id IN (SELECT id FROM partidos WHERE numero = {int(partido)})
                   AND EXISTS (
                       SELECT 1 FROM ultimo_por_cargo ult
                       WHERE UPPER(ca.cargo) = ult.cargo AND ca.ano = ult.ultimo_ano
                   )
                WHERE m.geometry IS NOT NULL
                GROUP BY m.id
            ),
            mun_votos AS (
                SELECT
                    m.id, m.codigo_ibge, m.nome, m.estado_uf,
                    COALESCE(a.votos,   0)                       AS votos,
                    COALESCE(a.eleitos, 0)                       AS eleitos,
                    ST_AsGeoJSON({geom_col}, 3)::json            AS geom
                FROM municipios m
                JOIN mun_agg a ON a.id = m.id
            )"""
            sql_params = {}

        result = await db.execute(text(f"""
            {sql_farol},
            stats AS (
                SELECT AVG(votos) AS media, STDDEV(votos) AS desvio
                FROM mun_votos WHERE votos > 0
            )
            SELECT
                mv.codigo_ibge, mv.nome, mv.estado_uf,
                mv.votos, mv.eleitos, mv.geom,
                0 AS partido_num, '' AS partido_sigla,
                CASE
                    WHEN mv.votos = 0 OR mv.votos IS NULL                                                    THEN 'VERMELHO'
                    WHEN mv.eleitos > 0 AND s.desvio > 0 AND mv.votos >= s.media + s.desvio                 THEN 'AZUL'
                    WHEN mv.eleitos > 0 AND mv.votos >= COALESCE(s.media, 0)                                THEN 'VERDE'
                    WHEN mv.eleitos > 0                                                                      THEN 'AMARELO'
                    WHEN s.desvio > 0 AND mv.votos >= s.media                                               THEN 'AMARELO'
                    ELSE                                                                                          'VERMELHO'
                END AS status_farol
            FROM mun_votos mv CROSS JOIN stats s
        """), sql_params)

        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "codigo_ibge":   r.codigo_ibge,
                    "nome":          r.nome,
                    "estado_uf":     r.estado_uf,
                    "votos":         int(r.votos or 0),
                    "eleitos":       int(r.eleitos or 0),
                    "partido_num":   0,
                    "partido_sigla": "",
                    "status_farol":  r.status_farol,
                },
            })

    else:
        # ── Partido dominante por municipio (todos os partidos) ──────────
        if cargo and ano and cargo_upper == "PRESIDENTE":
            # PRESIDENTE: dominancia por votos por municipio via votos_por_zona
            result = await db.execute(text(f"""
                WITH votos_partido_mun AS (
                    SELECT
                        vpz.municipio_id,
                        p.numero AS partido_num,
                        p.sigla  AS partido_sigla,
                        SUM(vpz.qt_votos) AS total_votos
                    FROM votos_por_zona vpz
                    JOIN candidaturas ca ON ca.id = vpz.candidatura_id
                    JOIN partidos p ON p.id = ca.partido_id
                    WHERE UPPER(ca.cargo) = 'PRESIDENTE'
                      AND ca.ano = :ano
                      AND vpz.turno = :turno
                    GROUP BY vpz.municipio_id, p.numero, p.sigla
                ),
                dominante AS (
                    SELECT DISTINCT ON (municipio_id)
                        municipio_id, partido_num, partido_sigla, total_votos
                    FROM votos_partido_mun
                    ORDER BY municipio_id, total_votos DESC
                )
                SELECT
                    m.codigo_ibge, m.nome, m.estado_uf,
                    COALESCE(d.partido_num, 0)      AS partido_num,
                    COALESCE(d.partido_sigla, '')    AS partido_sigla,
                    CASE WHEN d.total_votos > 0 THEN 1 ELSE 0 END AS eleitos,
                    COALESCE(d.total_votos, 0)       AS votos,
                    ST_AsGeoJSON({geom_col}, 3)::json AS geom
                FROM municipios m
                LEFT JOIN dominante d ON d.municipio_id = m.id
                WHERE m.geometry IS NOT NULL
                ORDER BY m.id
            """), {"ano": ano, "turno": turno})
        elif cargo and ano and is_estadual:
            # Cargo estadual (GOV, DEP, SEN): partido dominante por estado
            # turno=2: só estados onde houve 2T (votos_2t>0). Demais ficam cinza.
            # turno=0/1: todos estados, votos do 1T.
            # SENADOR/DEP*: só têm 1T (filtro_turno = "" mesmo em turno=2).
            cargo_tem_2t = cargo_upper in {"PRESIDENTE", "GOVERNADOR"}
            if turno == 2 and cargo_tem_2t:
                filtro_turno_estado = "AND COALESCE(ca.votos_2t, 0) > 0"
                votos_col_estado = "COALESCE(ca.votos_2t, 0)"
            else:
                filtro_turno_estado = ""
                votos_col_estado = "COALESCE(ca.votos_1t, ca.votos_total, 0)"
            # SENADOR/DEP com turno=2: não há 2T - retorna vazio (efeito similar ao municipal)
            if turno == 2 and not cargo_tem_2t:
                filtro_turno_estado = "AND 1=0"  # força vazio
            result = await db.execute(text(f"""
                WITH eleitos_estado AS (
                    SELECT
                        ca.estado_uf,
                        p.numero AS partido_num,
                        p.sigla  AS partido_sigla,
                        SUM({votos_col_estado})                  AS total_votos,
                        COUNT(*) FILTER (WHERE ca.eleito = TRUE) AS n_eleitos
                    FROM candidaturas ca
                    JOIN partidos p ON p.id = ca.partido_id
                    WHERE ca.ano = :ano AND UPPER(ca.cargo) = :cargo
                      {filtro_turno_estado}
                    GROUP BY ca.estado_uf, p.numero, p.sigla
                ),
                dominante AS (
                    SELECT DISTINCT ON (estado_uf)
                        estado_uf, partido_num, partido_sigla, n_eleitos, total_votos
                    FROM eleitos_estado
                    WHERE estado_uf != 'BR' AND total_votos > 0
                    ORDER BY estado_uf, n_eleitos DESC NULLS LAST, total_votos DESC NULLS LAST
                )
                SELECT
                    m.codigo_ibge, m.nome, m.estado_uf,
                    COALESCE(d.partido_num, 0)    AS partido_num,
                    COALESCE(d.partido_sigla, '') AS partido_sigla,
                    COALESCE(d.n_eleitos, 0)      AS eleitos,
                    COALESCE(d.total_votos, 0)    AS votos,
                    ST_AsGeoJSON({geom_col}, 3)::json AS geom
                FROM municipios m
                LEFT JOIN dominante d ON d.estado_uf = m.estado_uf
                WHERE m.geometry IS NOT NULL
                ORDER BY m.id
            """), {"ano": ano, "cargo": cargo_upper})

        else:
            # ── Cargo municipal OU visão global: partido dominante por município ──
            # turno=2: mostra APENAS municípios que foram pro 2T (Cesar 19/04 bug crítico).
            #          Outros municípios ficam sem partido (cinza) - o mapa destaca onde
            #          o 2T aconteceu de fato.
            # turno=1 ou 0: pleito universal, todos os municípios.
            if cargo and ano:
                join_extra  = ""
                # Filtro de turno: 2T só quem teve votos_2t > 0
                turno_filter = "AND COALESCE(ca.votos_2t, 0) > 0" if turno == 2 else ""
                votos_col = "ca.votos_2t" if turno == 2 else "ca.votos_1t"
                filtro_candidaturas = f"WHERE ca.ano = :ano AND UPPER(ca.cargo) = :cargo {turno_filter}"
                params: dict = {"ano": ano, "cargo": cargo_upper}
            else:
                # JOIN para pegar só o último pleito por cargo - visão global (sem cargo)
                join_extra = """
                    JOIN (
                        SELECT UPPER(cargo) AS cargo, MAX(ano) AS ultimo_ano
                        FROM candidaturas WHERE eleito = TRUE
                        GROUP BY UPPER(cargo)
                    ) ult ON UPPER(ca.cargo) = ult.cargo AND ca.ano = ult.ultimo_ano
                """
                filtro_candidaturas = ""
                votos_col = "ca.votos_total"  # legado: visão global usa votos_total
                params = {}

            result = await db.execute(text(f"""
                WITH eleitos_mun AS (
                    SELECT
                        ca.municipio_id,
                        p.numero AS partido_num,
                        p.sigla  AS partido_sigla,
                        SUM({votos_col})                         AS total_votos,
                        COUNT(*) FILTER (WHERE ca.eleito = TRUE) AS n_eleitos
                    FROM candidaturas ca
                    JOIN partidos p ON p.id = ca.partido_id
                    {join_extra}
                    {filtro_candidaturas}
                    GROUP BY ca.municipio_id, p.numero, p.sigla
                ),
                dominante AS (
                    SELECT DISTINCT ON (municipio_id)
                        municipio_id, partido_num, partido_sigla, n_eleitos, total_votos
                    FROM eleitos_mun
                    WHERE total_votos > 0
                    ORDER BY municipio_id, n_eleitos DESC NULLS LAST, total_votos DESC NULLS LAST
                )
                SELECT
                    m.codigo_ibge, m.nome, m.estado_uf,
                    COALESCE(d.partido_num,   0)  AS partido_num,
                    COALESCE(d.partido_sigla, '')  AS partido_sigla,
                    COALESCE(d.n_eleitos,     0)   AS eleitos,
                    COALESCE(d.total_votos,   0)   AS votos,
                    ST_AsGeoJSON({geom_col}, 3)::json AS geom
                FROM municipios m
                LEFT JOIN dominante d ON d.municipio_id = m.id
                WHERE m.geometry IS NOT NULL
                ORDER BY m.id
            """), params)

        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "codigo_ibge":   r.codigo_ibge,
                    "nome":          r.nome,
                    "estado_uf":     r.estado_uf,
                    "votos":         int(r.votos or 0),
                    "eleitos":       int(r.eleitos or 0),
                    "partido_num":   int(r.partido_num or 0),
                    "partido_sigla": r.partido_sigla or "",
                    "status_farol":  "SEM_DADOS",
                },
            })

    enriquecer_features_percentil(features, SCORE_FNS["votos"])
    resultado = {"type": "FeatureCollection", "features": features}
    _brasil_mun_cache[cache_key] = resultado
    # Persiste em disco quando nao ha filtro dinamico (partido/candidato)
    # Views com filtro sao voláteis e poluiriam o cache sem ganho real.
    if partido is None:
        _salvar_disco(cache_key, resultado)
    response.headers["Cache-Control"] = "private, max-age=300"
    return resultado


@router.get("/geojson/{uf}")
async def get_geojson(
    uf: str,
    response: Response,
    ano: int = Query(2024),
    cargo: str = Query("VEREADOR"),
    modo: str = Query("eleitos", description="'eleitos' = resultado eleitoral; 'votos' = força de voto percentílica"),
    turno: int = Query(1, description="Turno da eleicao (1 ou 2)"),
    partido: int | None = Query(None, description="Número do partido. Omitir = todos os partidos"),
    candidato_id: int | None = Query(None, description="Filtra pelo candidato específico — mostra força por município"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """GeoJSON dos municípios de um estado filtrado por partido ou candidato.

    Cache in-memory por (uf:ano:cargo:modo:turno:partido:candidato). TSE imutavel.
    Sem cache: 1.5-2s por chamada. Com cache warm: <50ms. Reduz latencia do
    drill-down entre estados e alternancia de cargo.
    """
    cache_key = f"uf:{uf.upper()}:{ano}:{cargo.upper()}:{modo}:t{turno}:p{partido or 'x'}:c{candidato_id or 'x'}"
    # FAST PATH: disco com bytes gzipped prontos.
    rapido = _servir_cache_rapido(cache_key)
    if rapido is not None:
        return rapido
    if cache_key in _geojson_uf_cache:
        response.headers["Cache-Control"] = "private, max-age=300"
        return _geojson_uf_cache[cache_key]

    # ── Modo vigentes: agrega todos os mandatos em exercício por município ────────
    if cargo.upper() == "VIGENTES":
        filtro_v = f"AND p.numero = {int(partido)}" if partido else ""
        result = await db.execute(text(f"""
            WITH scores AS (
                SELECT
                    ca.municipio_id,
                    p.numero  AS partido_num,
                    p.sigla   AS partido_sigla,
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
                    COUNT(*) FILTER (WHERE ca.eleito AND ca.turno = 1) AS n_eleitos,
                    -- VIGENTES: votos ZERADO intencionalmente. Somar votos de cargos
                    -- diferentes (vereador + governador + senador) nao tem significado
                    -- estatistico. Use score_ponderado como metrica de presenca.
                    -- Cesar 20/04/2026.
                    0::bigint AS total_votos
                FROM candidaturas ca
                JOIN partidos p ON p.id = ca.partido_id
                JOIN municipios m ON m.id = ca.municipio_id
                WHERE m.estado_uf = :uf
                  AND ca.turno = 1
                  AND (
                    (ca.ano = 2024 AND UPPER(ca.cargo) IN ('PREFEITO','VEREADOR'))
                    OR (ca.ano = 2022 AND UPPER(ca.cargo) IN ('PRESIDENTE','GOVERNADOR','DEPUTADO FEDERAL','DEPUTADO ESTADUAL','DEPUTADO DISTRITAL'))
                    OR (ca.ano IN (2018,2022) AND UPPER(ca.cargo) = 'SENADOR')
                  )
                  {filtro_v}
                GROUP BY ca.municipio_id, p.numero, p.sigla
            ),
            dominante AS (
                SELECT DISTINCT ON (municipio_id)
                    municipio_id, partido_num, partido_sigla, score_ponderado, n_eleitos, total_votos
                FROM scores
                WHERE score_ponderado > 0
                ORDER BY municipio_id, score_ponderado DESC
            )
            SELECT
                m.codigo_ibge,
                m.nome,
                m.estado_uf,
                COALESCE(d.partido_num,       0)  AS partido_num,
                COALESCE(d.partido_sigla,     '')  AS partido_sigla,
                COALESCE(d.n_eleitos,         0)  AS eleitos,
                COALESCE(d.score_ponderado,   0)  AS score_ponderado,
                COALESCE(d.total_votos,       0)  AS votos,
                ST_AsGeoJSON(COALESCE(m.geometry_estado, ST_Multi(ST_SimplifyPreserveTopology(m.geometry, 0.001))), 4)::json AS geom
            FROM municipios m
            LEFT JOIN dominante d ON d.municipio_id = m.id
            WHERE m.estado_uf = :uf AND m.geometry IS NOT NULL
            ORDER BY m.id
        """), {"uf": uf.upper()})

        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "codigo_ibge":   r.codigo_ibge,
                    "nome":          r.nome,
                    "estado_uf":     r.estado_uf,
                    "partido_num":   r.partido_num,
                    "partido_sigla": r.partido_sigla,
                    "eleitos":       r.eleitos,
                    "score_ponderado": int(r.score_ponderado or 0),
                    "votos":         int(r.votos or 0),
                    "status_farol":  "VIGENTES",
                    "variacao_pct":  None,
                },
            })
        enriquecer_features_percentil(features, SCORE_FNS["score_ponderado"])
        resultado = {"type": "FeatureCollection", "features": features}
        _geojson_uf_cache[cache_key] = resultado
        if candidato_id is None:
            _salvar_disco(cache_key, resultado)
        response.headers["Cache-Control"] = "private, max-age=300"
        return resultado

    # ── Filtro por candidato específico ──────────────────────────────────────────
    if candidato_id is not None:
        result = await db.execute(text("""
            WITH cand AS (
                SELECT ca.id AS candidatura_id
                FROM candidaturas ca
                WHERE ca.candidato_id = :cid
                  AND ca.ano = :ano
                  AND UPPER(ca.cargo) = :cargo
                LIMIT 1
            ),
            votos_mun AS (
                SELECT ze.municipio_id, SUM(vpz.qt_votos) AS votos
                FROM votos_por_zona vpz
                JOIN zonas_eleitorais ze ON ze.id = vpz.zona_id
                WHERE vpz.candidatura_id = (SELECT candidatura_id FROM cand)
                GROUP BY ze.municipio_id
            ),
            stats AS (
                SELECT AVG(votos) AS media, STDDEV(votos) AS desvio
                FROM votos_mun WHERE votos > 0
            )
            SELECT
                m.codigo_ibge,
                m.nome,
                m.estado_uf,
                COALESCE(vm.votos, 0) AS votos,
                CASE
                    WHEN vm.votos IS NULL                                                         THEN 'FORA'
                    WHEN vm.votos = 0                                                            THEN 'VERMELHO'
                    WHEN vm.votos >= COALESCE(s.media + s.desvio, vm.votos)                      THEN 'AZUL'
                    WHEN vm.votos >= COALESCE(s.media, 0)                                        THEN 'VERDE'
                    ELSE                                                                              'AMARELO'
                END AS status_farol,
                ST_AsGeoJSON(COALESCE(m.geometry_estado, ST_Multi(ST_SimplifyPreserveTopology(m.geometry, 0.001))), 4)::json AS geom
            FROM municipios m
            LEFT JOIN votos_mun vm ON vm.municipio_id = m.id
            CROSS JOIN stats s
            WHERE m.estado_uf = :uf AND m.geometry IS NOT NULL
            ORDER BY m.id
        """), {"cid": candidato_id, "ano": ano, "cargo": cargo.upper(), "uf": uf.upper()})

        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "codigo_ibge":  r.codigo_ibge,
                    "nome":         r.nome,
                    "estado_uf":    r.estado_uf,
                    "status_farol": r.status_farol,
                    "votos":        r.votos,
                    "eleitos":      0,
                    "variacao_pct": None,
                },
            })
        enriquecer_features_percentil(features, SCORE_FNS["votos"])
        resultado = {"type": "FeatureCollection", "features": features}
        _geojson_uf_cache[cache_key] = resultado
        if candidato_id is None:
            _salvar_disco(cache_key, resultado)
        response.headers["Cache-Control"] = "private, max-age=300"
        return resultado

    if partido is not None:
        filtro_partido = f"AND f.partido_id IN (SELECT id FROM partidos WHERE numero = {int(partido)})"
    else:
        filtro_partido = ""  # todos os partidos

    if modo == "votos":
        result = await db.execute(text(f"""
            WITH mun_votos AS (
                SELECT DISTINCT ON (m.id)
                    m.codigo_ibge,
                    m.nome,
                    m.estado_uf,
                    COALESCE(f.votos_atual, 0)   AS votos,
                    COALESCE(f.eleitos_atual, 0)  AS eleitos,
                    f.variacao_pct,
                    ST_AsGeoJSON(COALESCE(m.geometry_estado, ST_Multi(ST_SimplifyPreserveTopology(m.geometry, 0.001))), 4)::json AS geom
                FROM municipios m
                LEFT JOIN farol_municipio f
                    ON f.municipio_id = m.id
                   AND f.ano_referencia = :ano
                   AND UPPER(f.cargo) = :cargo
                   {filtro_partido}
                WHERE m.estado_uf = :uf
                  AND m.geometry IS NOT NULL
                ORDER BY m.id
            ),
            stats AS (
                SELECT
                    AVG(votos)    AS media,
                    STDDEV(votos) AS desvio
                FROM mun_votos WHERE votos > 0
            )
            SELECT
                mv.codigo_ibge, mv.nome, mv.estado_uf, mv.votos, mv.eleitos,
                mv.variacao_pct, mv.geom,
                CASE
                    WHEN mv.votos = 0                                  THEN 'VERMELHO'
                    WHEN mv.votos >= COALESCE(s.media + s.desvio, mv.votos) THEN 'AZUL'
                    WHEN mv.votos >= COALESCE(s.media, 0)              THEN 'VERDE'
                    ELSE                                                    'AMARELO'
                END AS status_farol
            FROM mun_votos mv
            CROSS JOIN stats s
        """), {"uf": uf.upper(), "ano": ano, "cargo": cargo.upper()})

        # Build features + return early (ramo self-contained).
        # Antes este bloco não montava `features` e caía no enriquecer_features_percentil
        # final do endpoint → UnboundLocalError quando modo=votos + cargo municipal
        # + sem partido filtrado (exposto após redesign Globo-like em 15/04/2026).
        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "codigo_ibge":  r.codigo_ibge,
                    "nome":         r.nome,
                    "estado_uf":    r.estado_uf,
                    "status_farol": r.status_farol,
                    "votos":        r.votos,
                    "eleitos":      r.eleitos,
                    "variacao_pct": r.variacao_pct,
                },
            })
        enriquecer_features_percentil(features, SCORE_FNS["votos"])
        resultado = {"type": "FeatureCollection", "features": features}
        _geojson_uf_cache[cache_key] = resultado
        if candidato_id is None:
            _salvar_disco(cache_key, resultado)
        response.headers["Cache-Control"] = "private, max-age=300"
        return resultado
    elif partido is None and cargo.upper() in ("PRESIDENTE", "GOVERNADOR", "SENADOR", "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL"):
        # ── Cargos estaduais/federais: dominancia por VOTOS em cada municipio ─
        # Esses cargos tem municipio_id=NULL em candidaturas (sao estaduais).
        # Agregamos via votos_por_zona que tem municipio_id por zona eleitoral.
        cargo_upper = cargo.upper()
        result = await db.execute(text("""
            WITH votos_partido_mun AS (
                SELECT
                    vpz.municipio_id,
                    p.numero  AS partido_num,
                    p.sigla   AS partido_sigla,
                    SUM(vpz.qt_votos) AS total_votos
                FROM votos_por_zona vpz
                JOIN candidaturas ca ON ca.id = vpz.candidatura_id
                JOIN partidos p ON p.id = ca.partido_id
                JOIN municipios m ON m.id = vpz.municipio_id
                WHERE UPPER(ca.cargo) = :cargo
                  AND ca.ano = :ano
                  AND vpz.turno = :turno
                  AND m.estado_uf = :uf
                GROUP BY vpz.municipio_id, p.numero, p.sigla
            ),
            dominante AS (
                SELECT DISTINCT ON (municipio_id)
                    municipio_id, partido_num, partido_sigla, total_votos
                FROM votos_partido_mun
                ORDER BY municipio_id, total_votos DESC
            ),
            totais AS (
                SELECT municipio_id, SUM(total_votos) AS total_votos_mun
                FROM votos_partido_mun
                GROUP BY municipio_id
            )
            SELECT
                m.codigo_ibge,
                m.nome,
                m.estado_uf,
                COALESCE(d.partido_num, 0)      AS partido_num,
                COALESCE(d.partido_sigla, '')    AS partido_sigla,
                COALESCE(d.total_votos, 0)       AS votos_dominante,
                COALESCE(t.total_votos_mun, 0)   AS votos,
                ST_AsGeoJSON(COALESCE(m.geometry_estado, ST_Multi(ST_SimplifyPreserveTopology(m.geometry, 0.001))), 4)::json AS geom
            FROM municipios m
            LEFT JOIN dominante d ON d.municipio_id = m.id
            LEFT JOIN totais    t ON t.municipio_id = m.id
            WHERE m.estado_uf = :uf AND m.geometry IS NOT NULL
            ORDER BY m.id
        """), {"uf": uf.upper(), "ano": ano, "cargo": cargo_upper, "turno": turno})

        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "codigo_ibge":   r.codigo_ibge,
                    "nome":          r.nome,
                    "estado_uf":     r.estado_uf,
                    "partido_num":   r.partido_num,
                    "partido_sigla": r.partido_sigla,
                    "eleitos":       r.votos_dominante,
                    "votos":         r.votos,
                    "status_farol":  "TODOS",
                    "variacao_pct":  None,
                },
            })
    elif partido is None:
        # ── Todos os partidos: partido dominante por município ────────────────
        result = await db.execute(text("""
            WITH eleitos_mun AS (
                SELECT
                    ca.municipio_id,
                    p.numero  AS partido_num,
                    p.sigla   AS partido_sigla,
                    SUM(ca.votos_total) AS total_votos,
                    COUNT(*) FILTER (WHERE ca.eleito) AS n_eleitos
                FROM candidaturas ca
                JOIN partidos   p  ON p.id  = ca.partido_id
                JOIN municipios m  ON m.id  = ca.municipio_id
                WHERE ca.ano = :ano AND UPPER(ca.cargo) = :cargo
                  AND m.estado_uf = :uf
                GROUP BY ca.municipio_id, p.numero, p.sigla
            ),
            dominante AS (
                SELECT DISTINCT ON (municipio_id)
                    municipio_id, partido_num, partido_sigla, n_eleitos, total_votos
                FROM eleitos_mun
                WHERE n_eleitos > 0
                ORDER BY municipio_id, n_eleitos DESC
            )
            SELECT
                m.codigo_ibge,
                m.nome,
                m.estado_uf,
                COALESCE(d.partido_num,   0)  AS partido_num,
                COALESCE(d.partido_sigla, '') AS partido_sigla,
                COALESCE(d.n_eleitos,     0)  AS eleitos,
                COALESCE(d.total_votos,   0)  AS votos,
                ST_AsGeoJSON(COALESCE(m.geometry_estado, ST_Multi(ST_SimplifyPreserveTopology(m.geometry, 0.001))), 4)::json AS geom
            FROM municipios m
            LEFT JOIN dominante d ON d.municipio_id = m.id
            WHERE m.estado_uf = :uf AND m.geometry IS NOT NULL
            ORDER BY m.id
        """), {"uf": uf.upper(), "ano": ano, "cargo": cargo.upper()})

        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "codigo_ibge":   r.codigo_ibge,
                    "nome":          r.nome,
                    "estado_uf":     r.estado_uf,
                    "partido_num":   r.partido_num,
                    "partido_sigla": r.partido_sigla,
                    "eleitos":       r.eleitos,
                    "votos":         r.votos,
                    "status_farol":  "TODOS",
                    "variacao_pct":  None,
                },
            })
    else:
        # ── Partido específico com info X9 (quem domina onde o partido está ausente) ─
        result = await db.execute(text(f"""
            WITH partido_mun AS (
                SELECT DISTINCT ON (m.id)
                    m.id AS municipio_id,
                    m.codigo_ibge,
                    m.nome,
                    m.estado_uf,
                    COALESCE(f.status, 'SEM_DADOS') AS status_farol,
                    COALESCE(f.votos_atual, 0)       AS votos,
                    COALESCE(f.eleitos_atual, 0)     AS eleitos,
                    f.variacao_pct,
                    ST_AsGeoJSON(COALESCE(m.geometry_estado, ST_Multi(ST_SimplifyPreserveTopology(m.geometry, 0.001))), 4)::json AS geom
                FROM municipios m
                LEFT JOIN farol_municipio f
                    ON f.municipio_id = m.id
                   AND f.ano_referencia = :ano
                   AND UPPER(f.cargo) = :cargo
                   {filtro_partido}
                WHERE m.estado_uf = :uf
                  AND m.geometry IS NOT NULL
                ORDER BY m.id
            ),
            dominante_local AS (
                -- Para cada município onde o partido filtrado tem 0 presença,
                -- encontra quem realmente domina (X9)
                SELECT DISTINCT ON (ca.municipio_id)
                    ca.municipio_id,
                    p.numero        AS dom_partido_num,
                    p.sigla         AS dom_partido_sigla,
                    COALESCE(c.nome_urna, c.nome_completo) AS dom_nome,
                    ca.votos_total  AS dom_votos
                FROM candidaturas ca
                JOIN partidos   p ON p.id = ca.partido_id
                JOIN candidatos c ON c.id = ca.candidato_id
                WHERE ca.ano = :ano
                  AND UPPER(ca.cargo) = :cargo
                  AND ca.eleito = TRUE
                  AND ca.turno  = 1
                  AND ca.partido_id NOT IN (SELECT id FROM partidos WHERE numero = {int(partido)})
                ORDER BY ca.municipio_id, ca.votos_total DESC NULLS LAST
            )
            SELECT
                pm.*,
                CASE WHEN pm.status_farol IN ('VERMELHO','SEM_DADOS') THEN dl.dom_partido_num   ELSE NULL END AS x9_partido_num,
                CASE WHEN pm.status_farol IN ('VERMELHO','SEM_DADOS') THEN dl.dom_partido_sigla ELSE NULL END AS x9_partido_sigla,
                CASE WHEN pm.status_farol IN ('VERMELHO','SEM_DADOS') THEN dl.dom_nome          ELSE NULL END AS x9_nome,
                CASE WHEN pm.status_farol IN ('VERMELHO','SEM_DADOS') THEN dl.dom_votos         ELSE NULL END AS x9_votos
            FROM partido_mun pm
            LEFT JOIN dominante_local dl ON dl.municipio_id = pm.municipio_id
            ORDER BY pm.codigo_ibge
        """), {"uf": uf.upper(), "ano": ano, "cargo": cargo.upper()})

    if partido is not None:
        features = []
        for r in result.fetchall():
            if not r.geom:
                continue
            features.append({
                "type": "Feature",
                "geometry": r.geom,
                "properties": {
                    "codigo_ibge":      r.codigo_ibge,
                    "nome":             r.nome,
                    "estado_uf":        r.estado_uf,
                    "status_farol":     r.status_farol,
                    "votos":            r.votos,
                    "eleitos":          r.eleitos,
                    "variacao_pct":     r.variacao_pct,
                    "x9_partido_num":   r.x9_partido_num,
                    "x9_partido_sigla": r.x9_partido_sigla,
                    "x9_nome":          r.x9_nome,
                    "x9_votos":         int(r.x9_votos) if r.x9_votos else None,
                },
            })

    enriquecer_features_percentil(features, SCORE_FNS["votos"])
    resultado = {"type": "FeatureCollection", "features": features}
    _geojson_uf_cache[cache_key] = resultado
    if candidato_id is None:
        _salvar_disco(cache_key, resultado)
    response.headers["Cache-Control"] = "private, max-age=300"
    return resultado


@router.get("/municipio/{codigo_ibge}")
async def get_municipio(
    codigo_ibge: str,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Dados completos de um município para o painel lateral do mapa.
    """
    mun = await db.execute(text("""
        SELECT id, codigo_ibge, nome, estado_uf, populacao, pib_per_capita
        FROM municipios WHERE codigo_ibge = :c
    """), {"c": codigo_ibge.zfill(7)})
    mun = mun.fetchone()
    if not mun:
        from fastapi import HTTPException
        raise HTTPException(404, "Município não encontrado")

    # Farol por cargo — DISTINCT ON (cargo, ano) para evitar duplicatas por partido
    # Prioridade: partido 44 (atual) > 25 (DEM) > 17 (PSL) > NULL
    farol = await db.execute(text("""
        SELECT DISTINCT ON (f.cargo, f.ano_referencia)
            f.cargo, f.status, f.votos_atual, f.votos_anterior,
            f.variacao_pct, f.eleitos_atual, f.eleitos_anterior, f.ano_referencia
        FROM farol_municipio f
        LEFT JOIN partidos p ON p.id = f.partido_id
        WHERE f.municipio_id = :mid
        ORDER BY
            f.cargo,
            f.ano_referencia DESC,
            CASE WHEN p.numero = 44 THEN 1
                 WHEN p.numero = 25 THEN 2
                 WHEN p.numero = 17 THEN 3
                 ELSE 4 END
    """), {"mid": mun.id})
    farol_rows = farol.fetchall()

    # Candidatos eleitos neste município
    eleitos = await db.execute(text("""
        SELECT c.nome_urna, c.nome_completo, c.foto_url, ca.cargo, ca.ano, ca.votos_total,
               ca.id AS candidatura_id, c.id AS candidato_id,
               p.sigla AS partido_sigla, p.numero AS partido_num
        FROM candidaturas ca
        JOIN candidatos c ON c.id = ca.candidato_id
        JOIN partidos p ON p.id = ca.partido_id
        WHERE ca.municipio_id = :mid
          AND ca.eleito = TRUE
        ORDER BY ca.ano DESC, ca.votos_total DESC
        LIMIT 50
    """), {"mid": mun.id})

    return {
        "municipio": {
            "id":          mun.id,
            "codigo_ibge": mun.codigo_ibge,
            "nome":        mun.nome,
            "estado_uf":   mun.estado_uf,
            "populacao":   mun.populacao,
            "pib_per_capita": mun.pib_per_capita,
        },
        "farol": [
            {
                "cargo":          r.cargo,
                "status":         r.status,
                "votos_atual":    r.votos_atual,
                "votos_anterior": r.votos_anterior,
                "variacao_pct":   r.variacao_pct,
                "eleitos_atual":  r.eleitos_atual,
                "ano":            r.ano_referencia,
            }
            for r in farol_rows
        ],
        "eleitos": [
            {
                "nome_urna":      r.nome_urna or r.nome_completo,
                "cargo":          r.cargo,
                "ano":            r.ano,
                "votos":          r.votos_total,
                "candidato_id":   r.candidato_id,
                "candidatura_id": r.candidatura_id,
                "foto_url":       r.foto_url,
                "partido_sigla":  r.partido_sigla,
                "partido_num":    r.partido_num,
            }
            for r in eleitos.fetchall()
        ],
    }


@router.get("/estado/{uf}/eleitos")
async def get_estado_eleitos(
    uf: str,
    cargo: str | None = Query(None, description="Filtrar por cargo específico (ex: PREFEITO, VEREADOR)"),
    turno: int = Query(1, description="Turno da eleição (1 ou 2)"),
    partido: int | None = Query(None, description="Número do partido. Omitir = todos os partidos"),
    ano: int | None = Query(None, description="Ano da eleição. Omitir = todos os anos vigentes"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Políticos eleitos no estado, filtrados opcionalmente por partido, cargo e ano.
    Sem cargo: mostra cargos estaduais/federais (Governador, Senador, Dep. Federal, Dep. Estadual).
    Com cargo=PREFEITO ou cargo=VEREADOR: retorna os top 100 municipais do estado.
    """
    MUNICIPAIS = {"PREFEITO", "VEREADOR", "VICE-PREFEITO"}
    cargo_upper = cargo.upper().strip() if cargo else None
    filtro_partido = f"AND p.numero = {int(partido)}" if partido else ""
    filtro_ano = f"AND ca.ano = {int(ano)}" if ano else ""

    if cargo_upper in MUNICIPAIS:
        # Retorna os top eleitos municipais desse cargo no estado
        result = await db.execute(text(f"""
            SELECT
                c.id                                          AS candidato_id,
                COALESCE(c.nome_urna, c.nome_completo)        AS nome,
                c.foto_url,
                ca.cargo,
                ca.ano,
                ca.votos_total,
                m.nome AS municipio_nome,
                p.numero AS partido_num,
                p.sigla  AS partido_sigla
            FROM candidaturas ca
            JOIN candidatos c  ON c.id  = ca.candidato_id
            JOIN partidos   p  ON p.id  = ca.partido_id
            LEFT JOIN municipios m ON m.id = ca.municipio_id
            WHERE ca.estado_uf = :uf
              AND ca.eleito     = TRUE
              AND ca.cargo      = :cargo
              AND ca.turno      = :turno
              {filtro_partido}
              {filtro_ano}
            ORDER BY ca.ano DESC, COALESCE(ca.votos_total, 0) DESC
            LIMIT 100
        """), {"uf": uf.upper(), "cargo": cargo_upper, "turno": turno})

        rows = result.fetchall()
        cargos_com_eleitos = [{
            "cargo": cargo_upper,
            "eleitos": [
                {
                    "candidato_id":  r.candidato_id,
                    "nome":          r.nome,
                    "foto_url":      r.foto_url,
                    "cargo":         r.cargo,
                    "ano":           r.ano,
                    "votos":         r.votos_total,
                    "situacao":      r.municipio_nome,
                    "partido_num":   r.partido_num or 0,
                    "partido_sigla": r.partido_sigla or "",
                }
                for r in rows
            ]
        }] if rows else []

        return {
            "estado_uf":     uf.upper(),
            "cargos":        cargos_com_eleitos,
            "total_eleitos": len(rows),
        }

    # Cargos estaduais/federais — todos os partidos ou filtrado por partido
    # Senadores: inclui 2018 e 2022 (ambos em mandato vigente)
    result = await db.execute(text(f"""
        SELECT
            c.id                                          AS candidato_id,
            COALESCE(c.nome_urna, c.nome_completo)        AS nome,
            c.foto_url,
            ca.cargo,
            ca.ano,
            ca.votos_total,
            p.numero AS partido_num,
            p.sigla  AS partido_sigla
        FROM candidaturas ca
        JOIN candidatos c  ON c.id  = ca.candidato_id
        JOIN partidos   p  ON p.id  = ca.partido_id
        WHERE ca.estado_uf = :uf
          AND ca.eleito     = TRUE
          AND ca.turno      = :turno
          AND (
            (ca.cargo IN ('PRESIDENTE','GOVERNADOR','DEPUTADO FEDERAL','DEPUTADO ESTADUAL') AND ca.ano = 2022)
            OR (ca.cargo = 'SENADOR' AND ca.ano IN (2018, 2022))
          )
          {filtro_partido}
          {filtro_ano}
        ORDER BY
            CASE ca.cargo
                WHEN 'PRESIDENTE'       THEN 1
                WHEN 'GOVERNADOR'       THEN 2
                WHEN 'SENADOR'          THEN 3
                WHEN 'DEPUTADO FEDERAL' THEN 4
                WHEN 'DEPUTADO ESTADUAL'THEN 5
                ELSE 9
            END,
            ca.ano DESC,
            COALESCE(ca.votos_total, 0) DESC
    """), {"uf": uf.upper(), "turno": turno})

    rows = result.fetchall()

    # Agrupa por cargo mantendo a ordem
    ordem = ["PRESIDENTE", "GOVERNADOR", "SENADOR", "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL"]
    agrupado: dict[str, list] = {c: [] for c in ordem}
    for r in rows:
        if r.cargo in agrupado:
            agrupado[r.cargo].append({
                "candidato_id":  r.candidato_id,
                "nome":          r.nome,
                "foto_url":      r.foto_url,
                "cargo":         r.cargo,
                "ano":           r.ano,
                "votos":         r.votos_total,
                "partido_num":   r.partido_num or 0,
                "partido_sigla": r.partido_sigla or "",
            })

    cargos_com_eleitos = [
        {"cargo": cargo, "eleitos": agrupado[cargo]}
        for cargo in ordem
        if agrupado[cargo]
    ]

    return {
        "estado_uf":    uf.upper(),
        "cargos":       cargos_com_eleitos,
        "total_eleitos": len(rows),
    }


@router.get("/estado/{uf}/forcas")
async def get_estado_forcas(
    uf: str,
    cargo: str = Query("VEREADOR"),
    ano: int = Query(2024),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Top partidos por cadeiras e votos no estado para o cargo/ano.
    Retorna top 5 partidos com n_eleitos, total_votos, pct_cadeiras.
    """
    result = await db.execute(text("""
        WITH totais AS (
            SELECT
                p.numero        AS partido_num,
                p.sigla         AS partido_sigla,
                p.nome          AS partido_nome,
                COUNT(*) FILTER (WHERE ca.eleito) AS n_eleitos,
                SUM(ca.votos_total)               AS total_votos,
                COUNT(DISTINCT ca.id)             AS n_candidatos
            FROM candidaturas ca
            JOIN partidos   p ON p.id = ca.partido_id
            JOIN municipios m ON m.id = ca.municipio_id
            WHERE m.estado_uf = :uf
              AND ca.ano = :ano
              AND UPPER(ca.cargo) = :cargo
            GROUP BY p.numero, p.sigla, p.nome
        ),
        total_cadeiras AS (
            SELECT SUM(n_eleitos) AS total FROM totais WHERE n_eleitos > 0
        )
        SELECT
            t.partido_num,
            t.partido_sigla,
            t.partido_nome,
            t.n_eleitos,
            t.total_votos,
            t.n_candidatos,
            CASE WHEN tc.total > 0
                 THEN ROUND(t.n_eleitos * 100.0 / tc.total, 1)
                 ELSE 0 END AS pct_cadeiras
        FROM totais t
        CROSS JOIN total_cadeiras tc
        WHERE t.n_eleitos > 0
        ORDER BY t.n_eleitos DESC
        LIMIT 5
    """), {"uf": uf.upper(), "ano": ano, "cargo": cargo.upper()})

    rows = result.fetchall()
    total_cadeiras_result = await db.execute(text("""
        SELECT COUNT(*) AS total
        FROM candidaturas ca
        JOIN municipios m ON m.id = ca.municipio_id
        WHERE m.estado_uf = :uf AND ca.ano = :ano AND UPPER(ca.cargo) = :cargo AND ca.eleito
    """), {"uf": uf.upper(), "ano": ano, "cargo": cargo.upper()})
    total_cadeiras = total_cadeiras_result.fetchone().total or 0

    return {
        "partidos": [
            {
                "partido_num":    r.partido_num,
                "partido_sigla":  r.partido_sigla,
                "partido_nome":   r.partido_nome,
                "n_eleitos":      int(r.n_eleitos),
                "total_votos":    int(r.total_votos),
                "n_candidatos":   int(r.n_candidatos),
                "pct_cadeiras":   float(r.pct_cadeiras),
            }
            for r in rows
        ],
        "total_cadeiras": int(total_cadeiras),
    }


@router.get("/municipio/{codigo_ibge}/dominancia")
async def get_municipio_dominancia(
    codigo_ibge: str,
    cargo: str = Query("VEREADOR"),
    ano: int = Query(2024),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Dominância política num município: partido líder + top 3 candidatos por votos.
    Usado no modal de análise regional (quando candidato está filtrado no mapa).
    """
    mun = await db.execute(text("""
        SELECT id, nome, estado_uf FROM municipios WHERE codigo_ibge = :c
    """), {"c": codigo_ibge.zfill(7)})
    mun = mun.fetchone()
    if not mun:
        from fastapi import HTTPException
        raise HTTPException(404, "Município não encontrado")

    # Top candidatos por votos neste município/cargo/ano (todos os partidos)
    result = await db.execute(text("""
        WITH ranked AS (
            SELECT
                c.id                                        AS candidato_id,
                COALESCE(c.nome_urna, c.nome_completo)      AS nome,
                c.foto_url,
                p.sigla                                     AS partido_sigla,
                p.numero                                    AS partido_num,
                ca.votos_total                              AS votos,
                ca.eleito
            FROM candidaturas ca
            JOIN candidatos c ON c.id = ca.candidato_id
            JOIN partidos   p ON p.id = ca.partido_id
            WHERE ca.municipio_id = :mid
              AND ca.ano = :ano
              AND UPPER(ca.cargo) = :cargo
              AND ca.votos_total > 0
            ORDER BY ca.votos_total DESC
            LIMIT 10
        ),
        total AS (
            SELECT SUM(votos_total) AS total_votos
            FROM candidaturas ca
            WHERE ca.municipio_id = :mid AND ca.ano = :ano AND UPPER(ca.cargo) = :cargo
        )
        SELECT
            r.*,
            t.total_votos,
            CASE WHEN t.total_votos > 0
                 THEN ROUND(r.votos * 100.0 / t.total_votos, 1)
                 ELSE 0 END AS pct_total
        FROM ranked r
        CROSS JOIN total t
    """), {"mid": mun.id, "ano": ano, "cargo": cargo.upper()})

    rows = result.fetchall()
    if not rows:
        return {"municipio": mun.nome, "estado_uf": mun.estado_uf, "candidatos": [], "total_votos": 0}

    total_votos = int(rows[0].total_votos) if rows else 0
    maior_voto  = int(rows[0].votos) if rows else 1

    return {
        "municipio":    mun.nome,
        "estado_uf":    mun.estado_uf,
        "total_votos":  total_votos,
        "candidatos": [
            {
                "candidato_id":  r.candidato_id,
                "nome":          r.nome,
                "foto_url":      r.foto_url,
                "partido_sigla": r.partido_sigla,
                "partido_num":   r.partido_num,
                "votos":         int(r.votos),
                "pct_total":     float(r.pct_total),
                "pct_maior":     round(int(r.votos) * 100 / maior_voto, 1),
                "eleito":        r.eleito,
            }
            for r in rows[:5]
        ],
        "dominante": {
            "partido_sigla": rows[0].partido_sigla,
            "partido_num":   rows[0].partido_num,
        } if rows else None,
    }


@router.get("/estado/{uf}/partido/{numero}/cidades")
async def get_cidades_do_partido_no_estado(
    uf: str,
    numero: int,
    limit: int = Query(200, description="Limite de cidades retornadas"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Item P-A3 do plano mestre: sidebar por partido como navegação alternativa.

    Retorna as cidades de um estado onde um partido tem eleitos municipais
    (PREFEITO / VEREADOR). Cada cidade vem com `codigo_ibge` e `nome` para
    permitir navegação clicável no frontend.

    Agrega por municipio e ordena pelo total de eleitos (desc) e depois
    pelo total de votos (desc). Considera apenas vigentes (eleitos=true).
    """
    result = await db.execute(text("""
        SELECT
            m.codigo_ibge,
            m.nome                              AS municipio,
            COUNT(*)                            AS eleitos,
            COALESCE(SUM(ca.votos_total), 0)    AS votos
        FROM candidaturas ca
        JOIN partidos p   ON p.id = ca.partido_id
        JOIN municipios m ON m.id = ca.municipio_id
        WHERE m.estado_uf = :uf
          AND p.numero = :num
          AND ca.eleito = TRUE
          AND ca.cargo IN ('PREFEITO', 'VEREADOR')
        GROUP BY m.codigo_ibge, m.nome
        ORDER BY eleitos DESC, votos DESC
        LIMIT :lim
    """), {"uf": uf.upper(), "num": numero, "lim": limit})

    return [
        {
            "codigo_ibge": r.codigo_ibge,
            "nome":        r.municipio,
            "eleitos":     int(r.eleitos),
            "votos":       int(r.votos or 0),
        }
        for r in result.fetchall()
    ]


@router.get("/estado/{uf}/nao-eleitos")
async def get_estado_nao_eleitos(
    uf: str,
    response: Response,
    cargo: str | None = Query(None, description="Filtrar por cargo. Omitir = todos os cargos estaduais/federais"),
    partido: int | None = Query(None, description="Número do partido. Omitir = todos os partidos"),
    ano: int | None = Query(None, description="Ano da eleição. Omitir = 2022 e 2018"),
    turno: int = Query(1, description="0=Total/1T, 1=1T, 2=2T (só quem foi pro 2T e perdeu)"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Candidatos que concorreram mas NÃO foram eleitos no estado.
    Cargos estaduais/federais + opcionalmente municipais.

    turno=2: filtra só candidatos que foram pro 2T e perderam lá (votos_2t>0 AND !eleito).
    turno=0 ou 1: todos os não eleitos do pleito original (todos os candidatos do 1T).
    """
    MUNICIPAIS = {"PREFEITO", "VEREADOR", "VICE-PREFEITO"}
    ESTADUAIS_FEDERAIS = {"PRESIDENTE", "GOVERNADOR", "SENADOR", "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL"}
    cargo_upper = cargo.upper().strip() if cargo else None

    # Cache em disco: (uf:cargo:ano:turno:partido) - até 40k combinações, pequenas
    cache_key = f"nao_el:{uf.upper()}:{cargo_upper or 'X'}:{ano or 'X'}:t{1 if turno != 2 else 2}:p{partido or 'X'}"
    rapido = _servir_cache_rapido(cache_key)
    if rapido is not None:
        return rapido

    filtro_partido = f"AND p.numero = {int(partido)}" if partido else ""

    # Governanca (13/04): default de ano por tipo de cargo — evita
    # misturar ciclos 2018/2022/2024 numa mesma listagem. Antes sem
    # filtro_ano o endpoint retornava candidatos de todos os anos
    # juntos, polui a sidebar (Rogerio Chequer 2018 junto com Rodrigo
    # Garcia 2022 no GOVERNADOR).
    if ano:
        filtro_ano = f"AND ca.ano = {int(ano)}"
    elif cargo_upper in MUNICIPAIS:
        filtro_ano = "AND ca.ano = 2024"
    elif cargo_upper in ESTADUAIS_FEDERAIS:
        filtro_ano = "AND ca.ano = 2022"  # GOV/PRES/DEP/SEN mais recente
    else:
        # Sem cargo especifico — mantem comportamento legado
        filtro_ano = "AND ca.ano IN (2018, 2022, 2024)"

    if cargo_upper in MUNICIPAIS:
        filtro_cargo = f"AND UPPER(ca.cargo) = '{cargo_upper}'"
    elif cargo_upper:
        filtro_cargo = f"AND UPPER(ca.cargo) = '{cargo_upper}'"
    else:
        filtro_cargo = """AND ca.cargo IN (
            'SENADOR','DEPUTADO FEDERAL','DEPUTADO ESTADUAL'
        )"""

    # turno=2: só candidatos que foram pro 2T e perderam (votos_2t>0, !eleito).
    # turno=0 ou 1: todos os não eleitos do 1T (pleito universal).
    # Campo ca.turno é sempre 1 no modelo TSE (legado, não diferencia pleito).
    if turno == 2:
        filtro_turno = "AND COALESCE(ca.votos_2t, 0) > 0"
        votos_col = "COALESCE(ca.votos_2t, 0)"
    else:
        filtro_turno = ""
        votos_col = "COALESCE(ca.votos_1t, ca.votos_total, 0)"

    result = await db.execute(text(f"""
        SELECT
            c.id                                          AS candidato_id,
            COALESCE(c.nome_urna, c.nome_completo)        AS nome,
            c.foto_url,
            ca.cargo,
            ca.ano,
            {votos_col}                                   AS votos_total,
            ca.situacao_final,
            p.numero AS partido_num,
            p.sigla  AS partido_sigla
        FROM candidaturas ca
        JOIN candidatos c  ON c.id  = ca.candidato_id
        JOIN partidos   p  ON p.id  = ca.partido_id
        WHERE ca.estado_uf = :uf
          AND ca.eleito     = FALSE
          {filtro_turno}
          {filtro_cargo}
          {filtro_ano}
          {filtro_partido}
        ORDER BY
            CASE ca.cargo
                WHEN 'SENADOR'           THEN 3
                WHEN 'DEPUTADO FEDERAL'  THEN 4
                WHEN 'DEPUTADO ESTADUAL' THEN 5
                WHEN 'VEREADOR'          THEN 7
                ELSE 9
            END,
            ca.ano DESC,
            {votos_col} DESC,
            c.nome_completo ASC
        LIMIT 200
    """), {"uf": uf.upper()})

    rows = result.fetchall()

    ordem = ["PRESIDENTE", "GOVERNADOR", "SENADOR", "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "PREFEITO", "VEREADOR"]
    agrupado: dict[str, list] = {c: [] for c in ordem}
    for r in rows:
        if r.cargo in agrupado:
            agrupado[r.cargo].append({
                "candidato_id":  r.candidato_id,
                "nome":          r.nome,
                "foto_url":      r.foto_url,
                "cargo":         r.cargo,
                "ano":           r.ano,
                "votos":         r.votos_total,
                "situacao":      r.situacao_final,
                "partido_num":   r.partido_num,
                "partido_sigla": r.partido_sigla,
            })

    cargos_com_candidatos = [
        {"cargo": c, "eleitos": agrupado[c]}
        for c in ordem
        if agrupado[c]
    ]

    payload = {
        "estado_uf":        uf.upper(),
        "cargos":           cargos_com_candidatos,
        "total_nao_eleitos": len(rows),
    }
    _salvar_disco(cache_key, payload)
    response.headers["Cache-Control"] = "private, max-age=300"
    return payload


@router.get("/municipio/{codigo_ibge}/zonas")
async def get_municipio_zonas(
    codigo_ibge: str,
    response: Response,
    ano: int = Query(2024),
    turno: int = Query(1, description="Turno (0=Total/1T, 1=1T, 2=2T)"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Zonas eleitorais do município com votos agregados do partido.
    Usado no drill de duplo-clique no mapa estado.
    turno=0 (Total) ou 1: votos do 1T. turno=2: votos do 2T (só municipios com 2T).

    Cache disco: query faz Seq Scan em 19M linhas de votos_por_zona em municípios
    grandes (SP capital = 2s SQL). Com cache, 2a chamada em ~10ms.
    """
    cache_key = f"zonas:{codigo_ibge.zfill(7)}:{ano}:t{1 if turno != 2 else 2}"
    rapido = _servir_cache_rapido(cache_key)
    if rapido is not None:
        return rapido

    mun = await db.execute(text("""
        SELECT id, nome, estado_uf FROM municipios WHERE codigo_ibge = :c
    """), {"c": codigo_ibge.zfill(7)})
    mun = mun.fetchone()
    if not mun:
        from fastapi import HTTPException
        raise HTTPException(404, "Município não encontrado")

    # Total (turno=0) e 1T (turno=1) usam 1T. 2T usa 2T.
    # Otimização: usar ix_votos_municipio (municipio_id é conhecido). Filtrar votos
    # primeiro (CTE), depois LEFT JOIN com zonas. Query com `vpz.zona_id = ze.id`
    # no JOIN forçava Seq Scan em 19M linhas (5-9s). Agora usa index (<200ms).
    turno_sql = 2 if turno == 2 else 1
    result = await db.execute(text("""
        WITH votos_mun AS (
            SELECT
                vpz.zona_id,
                SUM(vpz.qt_votos)                    AS votos_total,
                COUNT(DISTINCT vpz.candidatura_id)    AS candidatos
            FROM votos_por_zona vpz
            JOIN candidaturas ca ON ca.id = vpz.candidatura_id AND ca.ano = :ano
            WHERE vpz.municipio_id = :mid
              AND vpz.turno        = :turno_sql
            GROUP BY vpz.zona_id
        )
        SELECT
            ze.numero                            AS zona_numero,
            ze.descricao,
            COALESCE(v.votos_total, 0)           AS votos_total,
            COALESCE(v.candidatos, 0)            AS candidatos_com_voto
        FROM zonas_eleitorais ze
        LEFT JOIN votos_mun v ON v.zona_id = ze.id
        WHERE ze.municipio_id = :mid
        ORDER BY v.votos_total DESC NULLS LAST, ze.numero
    """), {"mid": mun.id, "ano": ano, "turno_sql": turno_sql})

    zonas = [
        {
            "zona_numero":  r.zona_numero,
            "descricao":    r.descricao,
            "votos_total":  int(r.votos_total),
            "candidatos":   int(r.candidatos_com_voto),
        }
        for r in result.fetchall()
    ]

    payload = {
        "municipio": {
            "id":        mun.id,
            "nome":      mun.nome,
            "estado_uf": mun.estado_uf,
        },
        "zonas":       zonas,
        "total_votos": sum(z["votos_total"] for z in zonas),
        "total_zonas": len(zonas),
    }
    _salvar_disco(cache_key, payload)
    response.headers["Cache-Control"] = "private, max-age=300"
    return payload


@router.get("/municipio/{codigo_ibge}/vereadores")
async def get_municipio_vereadores(
    codigo_ibge: str,
    ano: int = Query(2024),
    turno: int = Query(1, description="Turno (0/1=1T, 2=2T). VEREADOR só tem 1T; turno=2 retorna vazio"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Vereadores do União Brasil eleitos no município, com votos totais.
    Usado no painel lateral após duplo clique no município.

    VEREADOR só tem 1º turno na prática. Se turno=2 for passado, retorna vazio
    em vez de mostrar dados do 1T (evita confundir usuário que navegou até aba 2T).
    """
    # VEREADOR não tem 2T — early return vazio quando solicitado
    if turno == 2:
        return {
            "municipio":     {},
            "vereadores":    [],
            "total_eleitos": 0,
            "total_votos":   0,
            "ano":           ano,
        }

    mun = await db.execute(text("""
        SELECT id, nome, estado_uf FROM municipios WHERE codigo_ibge = :c
    """), {"c": codigo_ibge.zfill(7)})
    mun = mun.fetchone()
    if not mun:
        from fastapi import HTTPException
        raise HTTPException(404, "Município não encontrado")

    # Usar votos_1t (voto real do vereador no pleito). votos_total é coluna legada.
    result = await db.execute(text("""
        SELECT
            ca.id                                          AS candidatura_id,
            c.id                                           AS candidato_id,
            COALESCE(c.nome_urna, c.nome_completo)         AS nome,
            c.foto_url,
            COALESCE(ca.votos_1t, ca.votos_total, 0)       AS votos_total,
            ca.eleito
        FROM candidaturas ca
        JOIN candidatos c  ON c.id  = ca.candidato_id
        JOIN partidos   p  ON p.id  = ca.partido_id
        WHERE ca.municipio_id = :mid
          AND ca.ano          = :ano
          AND ca.cargo        = 'VEREADOR'
        ORDER BY ca.eleito DESC, COALESCE(ca.votos_1t, ca.votos_total, 0) DESC NULLS LAST
        LIMIT 50
    """), {"mid": mun.id, "ano": ano})

    rows = result.fetchall()
    total_votos_mun = sum((r.votos_total or 0) for r in rows)

    vereadores = [
        {
            "candidatura_id": r.candidatura_id,
            "candidato_id":   r.candidato_id,
            "nome":           r.nome,
            "foto_url":       r.foto_url,
            "votos":          r.votos_total or 0,
            "eleito":         bool(r.eleito),
            "pct_municipio":  round((r.votos_total or 0) / total_votos_mun * 100, 1) if total_votos_mun else 0,
        }
        for r in rows
    ]

    eleitos = [v for v in vereadores if v["eleito"]]
    return {
        "municipio":    {"id": mun.id, "nome": mun.nome, "estado_uf": mun.estado_uf},
        "vereadores":   vereadores,
        "total_eleitos": len(eleitos),
        "total_votos":  total_votos_mun,
        "ano":          ano,
    }


@router.get("/municipio/{codigo_ibge}/vereador/{candidatura_id}/locais")
async def get_vereador_locais(
    codigo_ibge: str,
    candidatura_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Locais de votação (escolas) coloridos pelo desempenho do vereador por zona.
    Se votos_por_zona estiver populado: usa dados individuais do vereador.
    Caso contrário: usa o desempenho geral do partido na zona (fallback).
    """
    mun = await db.execute(text("""
        SELECT id, nome, estado_uf FROM municipios WHERE codigo_ibge = :c
    """), {"c": codigo_ibge.zfill(7)})
    mun = mun.fetchone()
    if not mun:
        from fastapi import HTTPException
        raise HTTPException(404, "Município não encontrado")

    # Tenta votos por zona do vereador específico
    zona_votos = await db.execute(text("""
        SELECT ze.numero AS nr_zona, COALESCE(SUM(vpz.qt_votos), 0) AS votos
        FROM zonas_eleitorais ze
        LEFT JOIN votos_por_zona vpz ON vpz.zona_id = ze.id
                                    AND vpz.candidatura_id = :cid
        WHERE ze.municipio_id = :mid
        GROUP BY ze.numero
    """), {"mid": mun.id, "cid": candidatura_id})
    zona_rows = zona_votos.fetchall()
    votos_map = {r.nr_zona: int(r.votos) for r in zona_rows}

    # Se nenhuma zona tem votos, usa fallback: desempenho geral do partido
    tem_dados_individuais = any(v > 0 for v in votos_map.values())
    if not tem_dados_individuais:
        # Busca ano da candidatura para o fallback
        ano_row = await db.execute(text(
            "SELECT ano FROM candidaturas WHERE id = :cid"
        ), {"cid": candidatura_id})
        ano_row = ano_row.fetchone()
        ano = ano_row.ano if ano_row else 2024
        zona_votos_fallback = await db.execute(text("""
            SELECT ze.numero AS nr_zona, COALESCE(SUM(vpz.qt_votos), 0) AS votos
            FROM zonas_eleitorais ze
            LEFT JOIN votos_por_zona vpz ON vpz.zona_id = ze.id
            LEFT JOIN candidaturas ca   ON ca.id = vpz.candidatura_id AND ca.ano = :ano
            WHERE ze.municipio_id = :mid
            GROUP BY ze.numero
        """), {"mid": mun.id, "ano": ano})
        for r in zona_votos_fallback.fetchall():
            votos_map[r.nr_zona] = int(r.votos)

    # Locais de votação
    locais = await db.execute(text("""
        SELECT nr_zona, nr_local, nome, bairro, endereco, latitude, longitude, qt_eleitores
        FROM locais_votacao
        WHERE municipio_id = :mid AND latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY nr_zona, nr_local
    """), {"mid": mun.id})

    rows_locais = locais.fetchall()
    votos_list = [votos_map.get(r.nr_zona, 0) for r in rows_locais]
    com_voto = sorted(v for v in votos_list if v > 0)
    p33 = com_voto[int(len(com_voto) * 0.33)] if com_voto else 0
    p66 = com_voto[int(len(com_voto) * 0.66)] if com_voto else 0

    def farol_zona(v: int) -> str:
        if v == 0:    return "VERMELHO"
        if v >= p66:  return "AZUL"
        if v >= p33:  return "VERDE"
        return "AMARELO"

    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [r.longitude, r.latitude]},
            "properties": {
                "nr_zona":      r.nr_zona,
                "nr_local":     r.nr_local,
                "nome":         r.nome,
                "bairro":       r.bairro,
                "endereco":     r.endereco,
                "qt_eleitores": r.qt_eleitores,
                "votos_zona":   votos_map.get(r.nr_zona, 0),
                "farol":        farol_zona(votos_map.get(r.nr_zona, 0)),
                "dados_individuais": tem_dados_individuais,
            },
        }
        for r in rows_locais
    ]

    return {
        "type":                "FeatureCollection",
        "features":            features,
        "total_locais":        len(features),
        "tem_dados_individuais": tem_dados_individuais,
        "p33": p33, "p66": p66,
    }


@router.get("/municipio/{codigo_ibge}/locais")
async def get_municipio_locais(
    codigo_ibge: str,
    ano: int = Query(2024),
    cargo: str = Query("VEREADOR"),
    candidato_id: int | None = Query(None, description="candidatos.id — resolve para candidatura automaticamente"),
    turno: int = Query(1),
    partido: int | None = Query(None, description="Número do partido para farol agregado"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Locais de votação (escolas) do município como GeoJSON de pontos.
    Suporta filtro por candidato, partido ou geral.
    Votos são agregados por zona eleitoral e distribuídos a cada escola da zona.
    """
    mun = await db.execute(text("""
        SELECT id, nome, estado_uf FROM municipios WHERE codigo_ibge = :c
    """), {"c": codigo_ibge.zfill(7)})
    mun = mun.fetchone()
    if not mun:
        from fastapi import HTTPException
        raise HTTPException(404, "Município não encontrado")
    mid = mun.id

    # Resolver candidato_id (candidatos.id) → candidatura_id (candidaturas.id)
    # Sem filtro municipio_id para suportar cargos estaduais/federais
    candidatura_id: int | None = None
    if candidato_id:
        res = await db.execute(text("""
            SELECT id FROM candidaturas
            WHERE candidato_id = :cid AND ano = :ano AND UPPER(cargo) = :cargo
            ORDER BY id LIMIT 1
        """), {"cid": candidato_id, "ano": ano, "cargo": cargo.upper()})
        row = res.fetchone()
        if row:
            candidatura_id = row.id

    # Montar filtro de candidatura para a query de votos
    if candidatura_id:
        filtro = "AND vpz.candidatura_id = :cand_id AND vpz.turno = :turno"
        params: dict = {"mid": mid, "cand_id": candidatura_id, "turno": turno}
    elif partido:
        filtro = """
            AND vpz.candidatura_id IN (
                SELECT ca2.id FROM candidaturas ca2
                JOIN partidos p2 ON p2.id = ca2.partido_id
                WHERE ca2.ano = :ano AND UPPER(ca2.cargo) = :cargo AND p2.numero = :partido
            )
            AND vpz.turno = :turno
        """
        params = {"mid": mid, "ano": ano, "cargo": cargo.upper(), "partido": partido, "turno": turno}
    else:
        filtro = """
            AND vpz.candidatura_id IN (
                SELECT id FROM candidaturas
                WHERE ano = :ano AND UPPER(cargo) = :cargo
            )
            AND vpz.turno = :turno
        """
        params = {"mid": mid, "ano": ano, "cargo": cargo.upper(), "turno": turno}

    # Votos por zona (agrega todas as seções da zona para o filtro dado)
    votos_zona = await db.execute(text(f"""
        SELECT
            ze.numero  AS nr_zona,
            COALESCE(SUM(vpz.qt_votos), 0) AS votos_total
        FROM zonas_eleitorais ze
        LEFT JOIN votos_por_zona vpz ON vpz.zona_id = ze.id
            AND vpz.municipio_id = :mid {filtro}
        WHERE ze.municipio_id = :mid
        GROUP BY ze.numero
    """), params)
    votos_map = {r.nr_zona: int(r.votos_total) for r in votos_zona.fetchall()}

    # Locais de votação com coordenadas
    # M9 — id incluído para o frontend abrir /mapa/escola/{id}
    locais = await db.execute(text("""
        SELECT DISTINCT ON (lv.nr_zona, lv.nr_local)
            lv.id,
            lv.nr_zona,
            lv.nr_local,
            lv.nome,
            lv.bairro,
            lv.endereco,
            lv.latitude,
            lv.longitude,
            lv.qt_eleitores
        FROM locais_votacao lv
        WHERE lv.municipio_id = :mid
          AND lv.latitude IS NOT NULL
          AND lv.longitude IS NOT NULL
        ORDER BY lv.nr_zona, lv.nr_local
    """), {"mid": mun.id})

    rows_locais = locais.fetchall()

    # Percentis para classificação relativa (mesmo algoritmo do PainelZonas)
    votos_list = [votos_map.get(r.nr_zona, 0) for r in rows_locais]
    com_voto = sorted(v for v in votos_list if v > 0)
    p33 = com_voto[int(len(com_voto) * 0.33)] if com_voto else 0
    p66 = com_voto[int(len(com_voto) * 0.66)] if com_voto else 0
    total_votos = sum(votos_list)

    def farol_zona(v: int) -> str:
        if v == 0:    return "VERMELHO"
        if v >= p66:  return "AZUL"
        if v >= p33:  return "VERDE"
        return "AMARELO"

    features = []
    for r in rows_locais:
        votos = votos_map.get(r.nr_zona, 0)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [r.longitude, r.latitude]},
            "properties": {
                "id":           r.id,
                "nr_zona":      r.nr_zona,
                "nr_local":     r.nr_local,
                "nome":         r.nome,
                "bairro":       r.bairro,
                "endereco":     r.endereco,
                "qt_eleitores": r.qt_eleitores,
                "votos_zona":   votos,
                "farol":        farol_zona(votos),
            },
        })

    # Adiciona nivel_farol (0-5) por percentil para escala unificada no frontend
    def _score_votos_zona(p: dict) -> float:
        return float(p.get("votos_zona") or 0)
    enriquecer_features_percentil(features, _score_votos_zona)

    return {
        "type":           "FeatureCollection",
        "features":       features,
        "municipio_nome": mun.nome,
        "estado_uf":      mun.estado_uf,
        "total_locais":   len(features),
        "total_votos":    total_votos,
        "p33":            p33,
        "p66":            p66,
    }


def _farol_from_percentis(votos: int, p33: int, p66: int) -> str:
    if votos == 0:    return "SEM_DADOS"   # nível 0 → cor oposta no frontend
    if votos >= p66:  return "AZUL"        # nível 5 → 100% da cor
    if votos >= p33:  return "VERDE"       # nível 4 → 80% da cor
    return "AMARELO"                       # nível 2 → 40% da cor (tem votos, fraco)


@router.get("/municipio/{codigo_ibge}/distritos/comparacao")
async def get_municipio_distritos_comparacao(
    codigo_ibge: str,
    candidatos: str = Query(..., description="IDs de candidatos separados por vírgula (2-10)"),
    cargo: str = Query("VEREADOR"),
    ano: int = Query(2024),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Distritos (bairros) de um município coloridos pelo candidato com mais votos em cada bairro.
    Usado em modo de comparação quando 2+ candidatos estão selecionados.
    """
    from fastapi import HTTPException
    cids = [int(x.strip()) for x in candidatos.split(",") if x.strip().lstrip("-").isdigit()]
    if len(cids) < 2 or len(cids) > 10:
        raise HTTPException(400, "Informe entre 2 e 10 candidatos")

    cd_mun = codigo_ibge.zfill(7)
    mun = await db.execute(text("SELECT id FROM municipios WHERE codigo_ibge = :c"), {"c": cd_mun})
    mun = mun.fetchone()
    if not mun:
        raise HTTPException(404, "Município não encontrado")
    mid = mun.id

    result = await db.execute(text("""
        WITH cand_votos AS (
            SELECT
                ze.numero AS nr_zona,
                ca.candidato_id,
                SUM(vpz.qt_votos) AS votos
            FROM votos_por_zona vpz
            JOIN zonas_eleitorais ze ON ze.id = vpz.zona_id
            JOIN candidaturas ca ON ca.id = vpz.candidatura_id
            WHERE ca.candidato_id = ANY(:cids)
              AND ca.ano = :ano
              AND UPPER(ca.cargo) = :cargo
              AND ze.municipio_id = :mid
            GROUP BY ze.numero, ca.candidato_id
        ),
        zona_dominante AS (
            SELECT DISTINCT ON (nr_zona)
                nr_zona, candidato_id, votos
            FROM cand_votos
            ORDER BY nr_zona, votos DESC
        ),
        zona_distrito AS (
            SELECT DISTINCT ON (lv.nr_zona)
                lv.nr_zona, d.cd_dist
            FROM locais_votacao lv
            JOIN distritos_municipio d ON ST_Within(
                ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326), d.geometry)
            WHERE lv.municipio_id = :mid AND d.cd_mun = :cd_mun
              AND lv.latitude IS NOT NULL AND lv.longitude IS NOT NULL
            ORDER BY lv.nr_zona
        ),
        distrito_agg AS (
            SELECT DISTINCT ON (zd.cd_dist)
                zd.cd_dist,
                zdom.candidato_id,
                zdom.votos
            FROM zona_distrito zd
            JOIN zona_dominante zdom ON zdom.nr_zona = zd.nr_zona
            ORDER BY zd.cd_dist, zdom.votos DESC
        )
        SELECT
            d.cd_dist, d.nm_dist,
            COALESCE(da.candidato_id, -1) AS candidato_dominante_id,
            COALESCE(da.votos, 0) AS votos_dominante,
            ST_AsGeoJSON(ST_SimplifyPreserveTopology(d.geometry, 0.0005), 6)::json AS geom
        FROM distritos_municipio d
        LEFT JOIN distrito_agg da ON da.cd_dist = d.cd_dist
        WHERE d.cd_mun = :cd_mun AND d.geometry IS NOT NULL
        ORDER BY d.cd_dist
    """), {"cids": cids, "ano": ano, "cargo": cargo.upper(), "mid": mid, "cd_mun": cd_mun})

    features = []
    for r in result.fetchall():
        if not r.geom:
            continue
        features.append({
            "type": "Feature",
            "geometry": r.geom,
            "properties": {
                "cd_dist": r.cd_dist,
                "nm_dist": r.nm_dist,
                "candidato_dominante_id": int(r.candidato_dominante_id),
                "votos_dominante": int(r.votos_dominante),
                "farol": "COMPARACAO",
            },
        })
    return {"type": "FeatureCollection", "features": features}


@router.get("/municipio/{codigo_ibge}/distritos")
async def get_municipio_distritos(
    codigo_ibge: str,
    ano: int = Query(2024),
    cargo: str = Query("VEREADOR"),
    turno: int = Query(1, description="Turno da eleicao (1 ou 2)"),
    candidatura_id: int | None = Query(None),
    candidato_id: int | None = Query(None, description="Resolve para candidatura automaticamente"),
    partido: int | None = Query(None, description="Número do partido para farol do partido"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Polígonos dos distritos/bairros com farol de performance eleitoral.
    Aceita qualquer cargo — usa votos_por_zona + spatial join PostGIS.
    Prioridade: candidatura_id > candidato_id (auto-resolve) > partido > geral.
    """
    cd_mun = codigo_ibge.zfill(7)

    mun = await db.execute(text(
        "SELECT id FROM municipios WHERE codigo_ibge = :c"
    ), {"c": cd_mun})
    mun = mun.fetchone()
    if not mun:
        from fastapi import HTTPException
        raise HTTPException(404, "Município não encontrado")
    mid = mun.id

    # Resolver candidato_id → candidatura_id (sem filtro municipio — suporta cargos estaduais/federais)
    if candidato_id and not candidatura_id:
        res = await db.execute(text("""
            SELECT id FROM candidaturas
            WHERE candidato_id = :cid AND ano = :ano AND UPPER(cargo) = :cargo
            ORDER BY id LIMIT 1
        """), {"cid": candidato_id, "ano": ano, "cargo": cargo.upper()})
        row = res.fetchone()
        if row:
            candidatura_id = row.id

    # FASE 2 (F1): suporte a cargos NAO-MUNICIPAIS (Pres/Gov/Sen/DepF/DepE).
    # Estes nao tem candidatura.municipio_id preenchido, so zonas eleitorais
    # do municipio votam neles. Por isso a query agrega votos via
    # ze.municipio_id = :mid, SEM filtrar ca.municipio_id. Funciona pra
    # qualquer cargo (municipal tambem — filtro do cargo ja seleciona).

    # Filtro de votos conforme contexto (com filtro de turno sempre)
    if candidatura_id:
        filtro_votos = "AND vpz.candidatura_id = :cid AND vpz.turno = :turno"
    elif partido:
        filtro_votos = """
            AND vpz.turno = :turno
            AND vpz.candidatura_id IN (
                SELECT ca2.id FROM candidaturas ca2
                JOIN partidos p2 ON p2.id = ca2.partido_id
                WHERE ca2.ano = :ano
                  AND UPPER(ca2.cargo) = :cargo
                  AND p2.numero = :partido
            )
        """
    else:
        # Default: filtra por cargo e ano (sem restringir municipio_id da
        # candidatura — necessario para cargos estaduais/federais).
        filtro_votos = """
            AND vpz.turno = :turno
            AND vpz.candidatura_id IN (
                SELECT id FROM candidaturas
                WHERE ano = :ano AND UPPER(cargo) = :cargo
            )
        """

    # Query agrega votos por (distrito, partido) — permite pintar bairros
    # por partido dominante, mesmo em cargos nao-municipais.
    #
    # IMPORTANTE (13/04): zona eleitoral cobre areas grandes e geralmente
    # tem locais de votacao em MULTIPLOS distritos. O DISTINCT ON (nr_zona)
    # anterior atribuia toda zona a 1 distrito so — os demais ficavam com
    # votos=0 (buracos laranja no mapa). Fix: rateio proporcional dos votos
    # pelo numero de locais de votacao em cada distrito. Ex: zona 275 com
    # 10 locais em Moema e 3 em Brasilandia → Moema pega 10/13 dos votos,
    # Brasilandia pega 3/13. Soma por zona sempre fecha = 1.
    result = await db.execute(text(f"""
        WITH zona_votos_partido AS (
            SELECT
                ze.numero  AS nr_zona,
                p.numero   AS partido_num,
                p.sigla    AS partido_sigla,
                COALESCE(SUM(vpz.qt_votos), 0) AS votos
            FROM zonas_eleitorais ze
            LEFT JOIN votos_por_zona vpz ON vpz.zona_id = ze.id {filtro_votos}
            LEFT JOIN candidaturas ca ON ca.id = vpz.candidatura_id
            LEFT JOIN partidos     p  ON p.id  = ca.partido_id
            WHERE ze.municipio_id = :mid
            GROUP BY ze.numero, p.numero, p.sigla
        ),
        zona_distrito AS (
            SELECT lv.nr_zona, d.cd_dist, COUNT(*) AS n_locais
            FROM locais_votacao lv
            JOIN distritos_municipio d
              ON ST_Within(
                    ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326),
                    d.geometry
                 )
            WHERE lv.municipio_id = :mid
              AND d.cd_mun = :cd_mun
              AND lv.latitude  IS NOT NULL
              AND lv.longitude IS NOT NULL
            GROUP BY lv.nr_zona, d.cd_dist
        ),
        zona_total_locais AS (
            SELECT nr_zona, SUM(n_locais) AS total_locais
            FROM zona_distrito
            GROUP BY nr_zona
        ),
        distrito_partido AS (
            SELECT
                zd.cd_dist,
                zvp.partido_num,
                zvp.partido_sigla,
                SUM(zvp.votos * zd.n_locais::float / NULLIF(ztl.total_locais, 0)) AS votos
            FROM zona_distrito zd
            JOIN zona_total_locais ztl ON ztl.nr_zona = zd.nr_zona
            JOIN zona_votos_partido zvp ON zvp.nr_zona = zd.nr_zona
            WHERE zvp.partido_num IS NOT NULL
            GROUP BY zd.cd_dist, zvp.partido_num, zvp.partido_sigla
        ),
        distrito_dominante AS (
            SELECT DISTINCT ON (cd_dist)
                cd_dist, partido_num, partido_sigla, votos AS votos_dominante
            FROM distrito_partido
            ORDER BY cd_dist, votos DESC
        ),
        distrito_total AS (
            SELECT cd_dist, SUM(votos) AS votos_total
            FROM distrito_partido
            GROUP BY cd_dist
        )
        SELECT
            d.cd_dist,
            d.nm_dist,
            COALESCE(dt.votos_total, 0) AS votos_total,
            dd.partido_num              AS partido_dominante_num,
            dd.partido_sigla            AS partido_dominante_sigla,
            ST_AsGeoJSON(
                ST_SimplifyPreserveTopology(d.geometry, 0.0005), 6
            )::json AS geom
        FROM distritos_municipio d
        LEFT JOIN distrito_total dt     ON dt.cd_dist = d.cd_dist
        LEFT JOIN distrito_dominante dd ON dd.cd_dist = d.cd_dist
        WHERE d.cd_mun = :cd_mun
          AND d.geometry IS NOT NULL
        ORDER BY votos_total DESC
    """), {
        "mid": mid, "cd_mun": cd_mun, "cid": candidatura_id,
        "ano": ano, "cargo": cargo.upper(), "partido": partido, "turno": turno,
    })

    rows = result.fetchall()

    # Percentis para farol relativo
    votos_list = [int(r.votos_total) for r in rows]
    com_voto = sorted(v for v in votos_list if v > 0)
    p33 = com_voto[int(len(com_voto) * 0.33)] if com_voto else 0
    p66 = com_voto[int(len(com_voto) * 0.66)] if com_voto else 0

    features = []
    for r in rows:
        if not r.geom:
            continue
        votos = int(r.votos_total)
        features.append({
            "type": "Feature",
            "geometry": r.geom,
            "properties": {
                "cd_dist":                r.cd_dist,
                "nm_dist":                r.nm_dist,
                "votos":                  votos,
                "farol":                  _farol_from_percentis(votos, p33, p66),
                "partido_dominante_num":  int(r.partido_dominante_num) if r.partido_dominante_num is not None else None,
                "partido_dominante_sigla": r.partido_dominante_sigla,
            },
        })

    enriquecer_features_percentil(features, SCORE_FNS["votos"])

    return {
        "type": "FeatureCollection",
        "features": features,
        "p33": p33,
        "p66": p66,
    }


@router.get("/municipio/{codigo_ibge}/distrito/{cd_dist}/resumo")
async def get_distrito_resumo(
    codigo_ibge: str,
    cd_dist: str,
    ano: int = Query(2024),
    cargo: str = Query("VEREADOR"),
    turno: int = Query(1),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    FASE 5 do plano mestre: resumo de um distrito/bairro para a
    sidebar `ConteudoBairro`.

    Agrega votos das zonas eleitorais cujo local de votacao cai dentro
    do poligono do distrito (via spatial join). Retorna top candidatos,
    partido dominante, total de votos e N pontos de votacao.
    """
    cd_mun = codigo_ibge.zfill(7)

    mun = await db.execute(
        text("SELECT id FROM municipios WHERE codigo_ibge = :c"),
        {"c": cd_mun},
    )
    mun = mun.fetchone()
    if not mun:
        from fastapi import HTTPException
        raise HTTPException(404, "Municipio nao encontrado")
    mid = mun.id

    # Resumo agregado do distrito — rateio proporcional por # locais (fix 13/04)
    resumo = await db.execute(text("""
        WITH zona_distrito_alvo AS (
            SELECT lv.nr_zona, COUNT(*) AS n_locais
            FROM locais_votacao lv
            JOIN distritos_municipio d
              ON ST_Within(
                    ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326),
                    d.geometry
                 )
            WHERE lv.municipio_id = :mid
              AND d.cd_mun = :cd_mun
              AND d.cd_dist = :cd_dist
              AND lv.latitude IS NOT NULL
              AND lv.longitude IS NOT NULL
            GROUP BY lv.nr_zona
        ),
        zona_total_locais AS (
            SELECT lv.nr_zona, COUNT(*) AS total_locais
            FROM locais_votacao lv
            WHERE lv.municipio_id = :mid
              AND lv.latitude IS NOT NULL
              AND lv.longitude IS NOT NULL
            GROUP BY lv.nr_zona
        ),
        votos_agg AS (
            SELECT
                c.id                         AS candidato_id,
                c.nome_urna                  AS nome,
                c.foto_url,
                ca.cargo                     AS cargo,
                ca.eleito                    AS eleito,
                p.numero                     AS partido_num,
                p.sigla                      AS partido_sigla,
                SUM(vpz.qt_votos * zda.n_locais::float / NULLIF(ztl.total_locais, 0)) AS votos
            FROM zona_distrito_alvo zda
            JOIN zona_total_locais  ztl ON ztl.nr_zona = zda.nr_zona
            JOIN zonas_eleitorais   ze  ON ze.numero = zda.nr_zona AND ze.municipio_id = :mid
            JOIN votos_por_zona     vpz ON vpz.zona_id = ze.id
                                           AND vpz.turno = :turno
            JOIN candidaturas       ca  ON ca.id = vpz.candidatura_id
                                           AND UPPER(ca.cargo) = :cargo
                                           AND ca.ano = :ano
            JOIN candidatos         c   ON c.id = ca.candidato_id
            JOIN partidos           p   ON p.id = ca.partido_id
            GROUP BY c.id, c.nome_urna, c.foto_url, ca.cargo, ca.eleito,
                     p.numero, p.sigla
        )
        SELECT * FROM votos_agg ORDER BY votos DESC
    """), {
        "mid": mid, "cd_mun": cd_mun, "cd_dist": cd_dist,
        "ano": ano, "cargo": cargo.upper(), "turno": turno,
    })
    candidatos = resumo.fetchall()

    # Total + partido dominante (agrega votos por partido)
    by_partido: dict[int, dict] = {}
    total_votos = 0
    for r in candidatos:
        total_votos += int(r.votos or 0)
        pn = int(r.partido_num) if r.partido_num is not None else 0
        if pn not in by_partido:
            by_partido[pn] = {"partido_num": pn, "partido_sigla": r.partido_sigla, "votos": 0}
        by_partido[pn]["votos"] += int(r.votos or 0)

    partidos_ordenados = sorted(by_partido.values(), key=lambda x: -x["votos"])
    partido_dominante = partidos_ordenados[0] if partidos_ordenados else None

    # Nome do distrito + contagem de pontos de votacao
    meta = await db.execute(text("""
        SELECT d.nm_dist,
               (SELECT COUNT(*) FROM locais_votacao lv
                WHERE lv.municipio_id = :mid
                  AND lv.latitude IS NOT NULL
                  AND ST_Within(
                      ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326),
                      d.geometry)
               ) AS pontos
        FROM distritos_municipio d
        WHERE d.cd_mun = :cd_mun AND d.cd_dist = :cd_dist
    """), {"mid": mid, "cd_mun": cd_mun, "cd_dist": cd_dist})
    meta_row = meta.fetchone()

    return {
        "cd_dist":            cd_dist,
        "nm_dist":            meta_row.nm_dist if meta_row else None,
        "pontos_votacao":     int(meta_row.pontos) if meta_row else 0,
        "total_votos":        total_votos,
        "partido_dominante":  partido_dominante,
        "partidos":           partidos_ordenados[:10],
        "candidatos":         [
            {
                "candidato_id":  int(r.candidato_id),
                "nome":          r.nome,
                "foto_url":      r.foto_url,
                "cargo":         r.cargo,
                "eleito":        r.eleito,
                "partido_num":   int(r.partido_num) if r.partido_num is not None else None,
                "partido_sigla": r.partido_sigla,
                "votos":         int(r.votos or 0),
            }
            for r in candidatos[:30]
        ],
        "cargo":  cargo.upper(),
        "ano":    ano,
        "turno":  turno,
    }


@router.get("/municipio/{codigo_ibge}/distrito/{cd_dist}/locais")
async def get_distrito_locais(
    codigo_ibge: str,
    cd_dist: str,
    ano: int = Query(2024),
    candidatura_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Pins das escolas dentro de um distrito específico, coloridos pelo farol.
    Disparado quando o usuário clica num bairro no modo city.
    """
    cd_mun = codigo_ibge.zfill(7)

    mun = await db.execute(text(
        "SELECT id FROM municipios WHERE codigo_ibge = :c"
    ), {"c": cd_mun})
    mun = mun.fetchone()
    if not mun:
        from fastapi import HTTPException
        raise HTTPException(404, "Município não encontrado")
    mid = mun.id

    # Votos por zona (vereador ou partido geral)
    if candidatura_id:
        filtro_votos = "AND vpz.candidatura_id = :cid"
    else:
        filtro_votos = "AND EXISTS (SELECT 1 FROM candidaturas ca2 WHERE ca2.id = vpz.candidatura_id AND ca2.ano = :ano)"

    zona_votos = await db.execute(text(f"""
        SELECT ze.numero AS nr_zona, COALESCE(SUM(vpz.qt_votos), 0) AS votos
        FROM zonas_eleitorais ze
        LEFT JOIN votos_por_zona vpz ON vpz.zona_id = ze.id {filtro_votos}
        WHERE ze.municipio_id = :mid
        GROUP BY ze.numero
    """), {"mid": mid, "cid": candidatura_id, "ano": ano})
    votos_map = {r.nr_zona: int(r.votos) for r in zona_votos.fetchall()}

    # Escolas dentro do distrito (spatial join)
    locais = await db.execute(text("""
        SELECT lv.nr_zona, lv.nr_local, lv.nome, lv.bairro, lv.endereco,
               lv.latitude, lv.longitude, lv.qt_eleitores
        FROM locais_votacao lv
        JOIN distritos_municipio d
          ON d.cd_dist = :cd_dist
         AND ST_Within(
                ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326),
                d.geometry
             )
        WHERE lv.municipio_id = :mid
          AND lv.latitude IS NOT NULL
          AND lv.longitude IS NOT NULL
        ORDER BY lv.nr_zona, lv.nr_local
    """), {"mid": mid, "cd_dist": cd_dist})

    rows_locais = locais.fetchall()
    votos_list = [votos_map.get(r.nr_zona, 0) for r in rows_locais]
    com_voto = sorted(v for v in votos_list if v > 0)
    p33 = com_voto[int(len(com_voto) * 0.33)] if com_voto else 0
    p66 = com_voto[int(len(com_voto) * 0.66)] if com_voto else 0

    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [r.longitude, r.latitude]},
            "properties": {
                "nr_zona":      r.nr_zona,
                "nr_local":     r.nr_local,
                "nome":         r.nome,
                "bairro":       r.bairro,
                "qt_eleitores": r.qt_eleitores,
                "votos_zona":   votos_map.get(r.nr_zona, 0),
                "farol":        _farol_from_percentis(votos_map.get(r.nr_zona, 0), p33, p66),
            },
        }
        for r in rows_locais
    ]

    return {
        "type":       "FeatureCollection",
        "features":   features,
        "total":      len(features),
    }


@router.get("/suplentes")
async def get_suplentes(
    uf:    str | None = Query(None, description="Filtrar por estado"),
    cargo: str        = Query("VEREADOR"),
    ano:   int        = Query(2024),
    faixa: str        = Query("todos", description="proximos|relevantes|todos"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Suplentes do União Brasil — candidatos não eleitos, ordenados por votos.
    Faixas estratégicas:
      proximos:   até 500 votos da última vaga (alta probabilidade de assumir)
      relevantes: 500–5000 votos (reserva estratégica)
      todos:      sem filtro de faixa
    """
    filtro_uf = "AND ca.estado_uf = :uf" if uf else ""

    result = await db.execute(text(f"""
        WITH eleitos_por_mun AS (
            -- Para cada município/ano/cargo, conta quantos foram eleitos e qual o menor voto eleito
            SELECT
                ca.municipio_id,
                ca.ano,
                ca.cargo,
                COUNT(*) FILTER (WHERE ca.eleito = TRUE) AS total_eleitos,
                MIN(ca.votos_total) FILTER (WHERE ca.eleito = TRUE) AS menor_voto_eleito
            FROM candidaturas ca
            WHERE UPPER(ca.cargo) = :cargo
              AND ca.ano = :ano
            GROUP BY ca.municipio_id, ca.ano, ca.cargo
        )
        SELECT
            c.id                                        AS candidato_id,
            ca.id                                       AS candidatura_id,
            COALESCE(c.nome_urna, c.nome_completo)      AS nome,
            c.foto_url,
            ca.votos_total,
            ca.estado_uf,
            m.nome                                      AS municipio,
            m.codigo_ibge,
            em.total_eleitos,
            em.menor_voto_eleito,
            (em.menor_voto_eleito - ca.votos_total)     AS votos_faltando
        FROM candidaturas ca
        JOIN candidatos c  ON c.id  = ca.candidato_id
        JOIN municipios m  ON m.id  = ca.municipio_id
        LEFT JOIN eleitos_por_mun em
            ON em.municipio_id = ca.municipio_id
           AND em.ano          = ca.ano
           AND em.cargo        = ca.cargo
        WHERE UPPER(ca.cargo) = :cargo
          AND ca.ano          = :ano
          AND ca.eleito       = FALSE
          AND ca.votos_total  > 0
          {filtro_uf}
        ORDER BY ca.votos_total DESC
        LIMIT 300
    """), {"cargo": cargo.upper(), "ano": ano, "uf": uf.upper() if uf else None})

    rows = result.fetchall()

    suplentes = []
    for r in rows:
        votos_faltando = r.votos_faltando if r.votos_faltando is not None else 9999
        votos = r.votos_total or 0

        # Aplica filtro de faixa
        if faixa == "proximos" and votos_faltando > 500:
            continue
        if faixa == "relevantes" and (votos_faltando <= 500 or votos_faltando > 5000):
            continue

        # Classifica proximidade de assumir
        if votos_faltando <= 0:
            proximidade = "CRITICO"    # Tecnicamente deveria ter assumido (cassação/renúncia pendente)
        elif votos_faltando <= 200:
            proximidade = "IMINENTE"   # Menos de 200 votos de diferença
        elif votos_faltando <= 500:
            proximidade = "PROXIMO"
        elif votos_faltando <= 2000:
            proximidade = "RELEVANTE"
        else:
            proximidade = "RESERVA"

        suplentes.append({
            "candidato_id":    r.candidato_id,
            "candidatura_id":  r.candidatura_id,
            "nome":            r.nome,
            "foto_url":        r.foto_url,
            "votos":           votos,
            "estado_uf":       r.estado_uf,
            "municipio":       r.municipio,
            "codigo_ibge":     r.codigo_ibge,
            "total_eleitos":   r.total_eleitos or 0,
            "menor_voto_eleito": r.menor_voto_eleito or 0,
            "votos_faltando":  votos_faltando,
            "proximidade":     proximidade,
        })

    # Estatísticas
    criticos   = sum(1 for s in suplentes if s["proximidade"] == "CRITICO")
    iminentes  = sum(1 for s in suplentes if s["proximidade"] == "IMINENTE")
    proximos   = sum(1 for s in suplentes if s["proximidade"] == "PROXIMO")
    relevantes = sum(1 for s in suplentes if s["proximidade"] == "RELEVANTE")

    return {
        "suplentes": suplentes,
        "total":     len(suplentes),
        "stats": {
            "criticos":   criticos,
            "iminentes":  iminentes,
            "proximos":   proximos,
            "relevantes": relevantes,
        },
        "ano":   ano,
        "cargo": cargo.upper(),
        "uf":    uf,
    }


@router.get("/geojson/{uf}/comparacao")
async def get_geojson_comparacao_candidatos(
    uf: str,
    response: Response,
    candidatos: str = Query(..., description="IDs de candidatos separados por vírgula (2-10)"),
    cargo: str = Query("VEREADOR"),
    ano: int = Query(2024),
    turno: int = Query(1, description="Turno (1 ou 2)"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    GeoJSON de comparação visual entre múltiplos candidatos.
    Cada município é colorido pelo candidato com mais votos lá.

    Retorna por feature:
      - candidato_dominante_id (-1 = nenhum dos selecionados)
      - votos_dominante
      - total_selecionados (soma dos votos de TODOS os candidatos comparados)
      - margem_pct (diferenca dominante vs 2o colocado, em %)

    margem_pct alimenta o gradiente visual do frontend:
      >60% = dominacao forte (cor saturada)
      30-60% = vitoria morna (cor media)
      <30% = disputa apertada (cor palida)
      <10% = empate tecnico / ninguem domina (cinza)
    """
    from fastapi import HTTPException
    cids = [int(x.strip()) for x in candidatos.split(",") if x.strip().lstrip("-").isdigit()]
    if len(cids) < 2 or len(cids) > 10:
        raise HTTPException(400, "Informe entre 2 e 10 candidatos")

    cache_key = f"cc:{uf.upper()}:{cargo.upper()}:{ano}:t{turno}:{','.join(str(x) for x in sorted(cids))}"
    if cache_key in _comparacao_cands_cache:
        response.headers["Cache-Control"] = "private, max-age=300"
        return _comparacao_cands_cache[cache_key]

    result = await db.execute(text("""
        WITH votos_por_mun AS (
            SELECT
                ze.municipio_id,
                ca.candidato_id,
                SUM(vpz.qt_votos) AS votos
            FROM votos_por_zona vpz
            JOIN zonas_eleitorais ze ON ze.id = vpz.zona_id
            JOIN candidaturas ca ON ca.id = vpz.candidatura_id
            WHERE ca.candidato_id = ANY(:cids)
              AND ca.ano = :ano
              AND UPPER(ca.cargo) = :cargo
              AND vpz.turno = :turno
            GROUP BY ze.municipio_id, ca.candidato_id
        ),
        agregado AS (
            SELECT
                municipio_id,
                SUM(votos)::bigint                         AS total,
                MAX(votos) FILTER (
                    WHERE votos = (SELECT MAX(v2.votos) FROM votos_por_mun v2 WHERE v2.municipio_id = votos_por_mun.municipio_id)
                )::bigint                                   AS votos_dominante_tmp
            FROM votos_por_mun
            GROUP BY municipio_id
        ),
        ranked AS (
            SELECT
                municipio_id,
                candidato_id,
                votos,
                ROW_NUMBER() OVER (PARTITION BY municipio_id ORDER BY votos DESC) AS rk
            FROM votos_por_mun
        ),
        dominante AS (
            SELECT
                r1.municipio_id,
                r1.candidato_id                             AS candidato_dominante_id,
                r1.votos                                    AS votos_dominante,
                COALESCE(r2.votos, 0)                       AS votos_segundo
            FROM ranked r1
            LEFT JOIN ranked r2 ON r2.municipio_id = r1.municipio_id AND r2.rk = 2
            WHERE r1.rk = 1 AND r1.votos > 0
        )
        SELECT
            m.codigo_ibge,
            m.nome,
            m.estado_uf,
            COALESCE(d.candidato_dominante_id, -1)  AS candidato_dominante_id,
            COALESCE(d.votos_dominante, 0)          AS votos_dominante,
            COALESCE(d.votos_segundo, 0)            AS votos_segundo,
            COALESCE(a.total, 0)                    AS total_selecionados,
            ST_AsGeoJSON(COALESCE(m.geometry_estado, ST_Multi(ST_SimplifyPreserveTopology(m.geometry, 0.001))), 4)::json AS geom
        FROM municipios m
        LEFT JOIN dominante d ON d.municipio_id = m.id
        LEFT JOIN agregado a ON a.municipio_id = m.id
        WHERE m.estado_uf = :uf AND m.geometry IS NOT NULL
        ORDER BY m.id
    """), {"cids": cids, "ano": ano, "cargo": cargo.upper(), "turno": turno, "uf": uf.upper()})

    features = []
    for r in result.fetchall():
        if not r.geom:
            continue
        total = int(r.total_selecionados or 0)
        dominante_v = int(r.votos_dominante or 0)
        segundo_v = int(r.votos_segundo or 0)
        margem_pct = 0.0
        if total > 0:
            margem_pct = round(100.0 * (dominante_v - segundo_v) / total, 1)
        features.append({
            "type": "Feature",
            "geometry": r.geom,
            "properties": {
                "codigo_ibge":            r.codigo_ibge,
                "nome":                   r.nome,
                "estado_uf":              r.estado_uf,
                "candidato_dominante_id": int(r.candidato_dominante_id),
                "votos_dominante":        dominante_v,
                "votos_segundo":          segundo_v,
                "total_selecionados":     total,
                "margem_pct":             margem_pct,
                "status_farol":           "COMPARACAO",
                "eleitos":                0,
                "variacao_pct":           None,
            },
        })
    payload = {"type": "FeatureCollection", "features": features}
    _comparacao_cands_cache[cache_key] = payload
    response.headers["Cache-Control"] = "private, max-age=300"
    return payload


@router.get("/geojson/{uf}/comparacao-partidos")
async def get_geojson_comparacao_partidos(
    uf: str,
    response: Response,
    partidos: str = Query(..., description="Números dos partidos separados por vírgula (2-10)"),
    cargo: str = Query("VEREADOR"),
    ano: int = Query(2024),
    turno: int = Query(1, description="Turno (1 ou 2). Cargos majoritarios com 2T podem usar 2."),
    modo: str = Query("eleitos", description="'eleitos' ou 'votos'"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    GeoJSON de comparação visual entre múltiplos partidos.
    Cada município é colorido pelo partido mais forte lá (eleitos ou votos).
    Propriedade retornada: partido_dominante_num (-1 = nenhum dos selecionados tem presença).
    """
    from fastapi import HTTPException
    pnums = [int(x.strip()) for x in partidos.split(",") if x.strip().lstrip("-").isdigit()]
    if len(pnums) < 2 or len(pnums) > 10:
        raise HTTPException(400, "Informe entre 2 e 10 partidos")

    cargo_upper = cargo.upper()

    cache_key = f"cp:{uf.upper()}:{cargo_upper}:{ano}:t{turno}:{modo}:{','.join(str(x) for x in sorted(pnums))}"
    if cache_key in _comparacao_partidos_cache:
        response.headers["Cache-Control"] = "private, max-age=300"
        return _comparacao_partidos_cache[cache_key]

    if cargo_upper == "VIGENTES":
        # VIGENTES: usar candidaturas diretamente (farol_municipio nao tem "VIGENTES")
        metrica_col = "score_ponderado" if modo == "eleitos" else "total_votos"
        result = await db.execute(text(f"""
            WITH partido_ids AS (
                SELECT id, numero FROM partidos WHERE numero = ANY(:pnums)
            ),
            scores AS (
                SELECT
                    ca.municipio_id,
                    pi.numero AS partido_num,
                    SUM(CASE WHEN ca.eleito AND ca.turno = 1 THEN
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
                    ELSE 0 END) AS score_ponderado,
                    COUNT(*) FILTER (WHERE ca.eleito AND ca.turno = 1) AS n_eleitos,
                    -- VIGENTES: votos ZERADO intencionalmente. Somar votos de cargos
                    -- diferentes (vereador + governador + senador) nao tem significado
                    -- estatistico. Use score_ponderado como metrica de presenca.
                    -- Cesar 20/04/2026.
                    0::bigint AS total_votos
                FROM candidaturas ca
                JOIN partido_ids pi ON pi.id = ca.partido_id
                JOIN municipios mx ON mx.id = ca.municipio_id
                WHERE mx.estado_uf = :uf
                  AND ca.turno = 1
                  AND (
                    (ca.ano = 2024 AND UPPER(ca.cargo) IN ('PREFEITO','VEREADOR'))
                    OR (ca.ano = 2022 AND UPPER(ca.cargo) IN ('PRESIDENTE','GOVERNADOR','DEPUTADO FEDERAL','DEPUTADO ESTADUAL','DEPUTADO DISTRITAL'))
                    OR (ca.ano IN (2018,2022) AND UPPER(ca.cargo) = 'SENADOR')
                  )
                GROUP BY ca.municipio_id, pi.numero
            ),
            dominante AS (
                SELECT DISTINCT ON (municipio_id)
                    municipio_id, partido_num, {metrica_col} AS metrica
                FROM scores
                WHERE {metrica_col} > 0
                ORDER BY municipio_id, {metrica_col} DESC
            )
            SELECT
                m.codigo_ibge,
                m.nome,
                m.estado_uf,
                COALESCE(d.partido_num, -1)  AS partido_dominante_num,
                COALESCE(d.metrica, 0)       AS metrica_dominante,
                ST_AsGeoJSON(COALESCE(m.geometry_estado, ST_Multi(ST_SimplifyPreserveTopology(m.geometry, 0.001))), 4)::json AS geom
            FROM municipios m
            LEFT JOIN dominante d ON d.municipio_id = m.id
            WHERE m.estado_uf = :uf AND m.geometry IS NOT NULL
            ORDER BY m.id
        """), {"pnums": pnums, "uf": uf.upper()})
    else:
        # Cargo especifico: agrega candidaturas diretamente com filtro de turno.
        # farol_municipio nao tem breakdown por turno - usar candidaturas eh mais
        # preciso pra tabs 1T/2T.
        metrica_sql = "n_eleitos" if modo == "eleitos" else "total_votos"
        result = await db.execute(text(f"""
            WITH partido_ids AS (
                SELECT id, numero FROM partidos WHERE numero = ANY(:pnums)
            ),
            agregado AS (
                SELECT
                    ca.municipio_id,
                    pi.numero AS partido_num,
                    COUNT(*) FILTER (WHERE ca.eleito)      AS n_eleitos,
                    COALESCE(SUM(
                        CASE WHEN :turno = 2 THEN ca.votos_2t ELSE ca.votos_1t END
                    ), 0)::bigint AS total_votos
                FROM candidaturas ca
                JOIN partido_ids pi ON pi.id = ca.partido_id
                JOIN municipios mx ON mx.id = ca.municipio_id
                WHERE ca.ano = :ano
                  AND UPPER(ca.cargo) = :cargo
                  AND mx.estado_uf = :uf
                GROUP BY ca.municipio_id, pi.numero
            ),
            total_por_mun AS (
                SELECT municipio_id, SUM({metrica_sql})::bigint AS total
                FROM agregado
                GROUP BY municipio_id
            ),
            ranked AS (
                SELECT
                    municipio_id, partido_num, {metrica_sql} AS metrica,
                    ROW_NUMBER() OVER (PARTITION BY municipio_id ORDER BY {metrica_sql} DESC) AS rk
                FROM agregado
                WHERE {metrica_sql} > 0
            ),
            dominante AS (
                SELECT
                    r1.municipio_id,
                    r1.partido_num,
                    r1.metrica                              AS metrica_dominante,
                    COALESCE(r2.metrica, 0)                 AS metrica_segundo
                FROM ranked r1
                LEFT JOIN ranked r2 ON r2.municipio_id = r1.municipio_id AND r2.rk = 2
                WHERE r1.rk = 1
            )
            SELECT
                m.codigo_ibge,
                m.nome,
                m.estado_uf,
                COALESCE(d.partido_num, -1)     AS partido_dominante_num,
                COALESCE(d.metrica_dominante, 0) AS metrica_dominante,
                COALESCE(d.metrica_segundo, 0)  AS metrica_segundo,
                COALESCE(t.total, 0)            AS total_selecionados,
                ST_AsGeoJSON(COALESCE(m.geometry_estado, ST_Multi(ST_SimplifyPreserveTopology(m.geometry, 0.001))), 4)::json AS geom
            FROM municipios m
            LEFT JOIN dominante d ON d.municipio_id = m.id
            LEFT JOIN total_por_mun t ON t.municipio_id = m.id
            WHERE m.estado_uf = :uf AND m.geometry IS NOT NULL
            ORDER BY m.id
        """), {"pnums": pnums, "ano": ano, "cargo": cargo_upper, "turno": turno, "uf": uf.upper()})

    features = []
    for r in result.fetchall():
        if not r.geom:
            continue
        total = int(r.total_selecionados or 0)
        dominante_v = int(r.metrica_dominante or 0)
        segundo_v = int(r.metrica_segundo or 0)
        margem_pct = 0.0
        if total > 0:
            margem_pct = round(100.0 * (dominante_v - segundo_v) / total, 1)
        features.append({
            "type": "Feature",
            "geometry": r.geom,
            "properties": {
                "codigo_ibge":          r.codigo_ibge,
                "nome":                 r.nome,
                "estado_uf":            r.estado_uf,
                "partido_dominante_num": int(r.partido_dominante_num),
                "metrica_dominante":    dominante_v,
                "metrica_segundo":      segundo_v,
                "total_selecionados":   total,
                "margem_pct":           margem_pct,
                "status_farol":         "COMPARACAO",
                "eleitos":              0,
                "variacao_pct":         None,
            },
        })
    # Ponto 2 (13/04): enriquecer com nivel_farol (percentil) para permitir
    # modulacao de intensidade no modo comparacao. Cor do dominante +
    # intensidade do nivel_farol = visualizacao bivariada (categorica + gradiente).
    # Score vem da metrica_dominante (voto do vencedor naquele municipio).
    enriquecer_features_percentil(
        features,
        lambda p: float(p.get("metrica_dominante") or 0),
    )
    payload = {"type": "FeatureCollection", "features": features}
    _comparacao_partidos_cache[cache_key] = payload
    response.headers["Cache-Control"] = "private, max-age=300"
    return payload


@router.get("/geojson/{uf}/comparacao-temporal")
async def get_geojson_comparacao_temporal(
    uf: str,
    cargo: str = Query(..., description="Cargo. NÃO usar VIGENTES."),
    ano: int = Query(..., description="Ano atual de referência"),
    ano_anterior: int = Query(..., description="Ano anterior para comparação"),
    partido: int | None = Query(None, description="Filtra por partido (opcional)"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    GeoJSON de COMPARAÇÃO TEMPORAL: para cada município retorna a variação
    percentual de votos entre dois anos do mesmo cargo. Lê das materialized
    views (Fase 2) — query simples e rápida.

    Properties retornadas:
      - votos_atual, votos_anterior, eleitos_atual, eleitos_anterior
      - crescimento_percentual (variação relativa de votos)
      - status_farol = "COMPARACAO_TEMPORAL"
    """
    cargo_upper = cargo.upper().strip()
    where_partido = "AND partido_numero = :partido" if partido is not None else ""
    params: dict = {
        "uf": uf.upper(),
        "cargo": cargo_upper,
        "ano": ano,
        "ano_anterior": ano_anterior,
    }
    if partido is not None:
        params["partido"] = partido

    result = await db.execute(text(f"""
        WITH atual AS (
            SELECT
                municipio_id,
                COALESCE(SUM(total_votos), 0) AS votos,
                COALESCE(SUM(n_eleitos), 0)   AS eleitos
            FROM mv_score_municipio
            WHERE estado_uf = :uf AND cargo = :cargo
              AND ano = :ano AND turno = 1 {where_partido}
            GROUP BY municipio_id
        ),
        anterior AS (
            SELECT
                municipio_id,
                COALESCE(SUM(total_votos), 0) AS votos,
                COALESCE(SUM(n_eleitos), 0)   AS eleitos
            FROM mv_score_municipio
            WHERE estado_uf = :uf AND cargo = :cargo
              AND ano = :ano_anterior AND turno = 1 {where_partido}
            GROUP BY municipio_id
        )
        SELECT
            m.codigo_ibge,
            m.nome,
            m.estado_uf,
            COALESCE(a.votos,    0) AS votos_atual,
            COALESCE(b.votos,    0) AS votos_anterior,
            COALESCE(a.eleitos,  0) AS eleitos_atual,
            COALESCE(b.eleitos,  0) AS eleitos_anterior,
            CASE
                WHEN COALESCE(b.votos, 0) > 0
                THEN ((COALESCE(a.votos, 0)::float - b.votos) / b.votos) * 100.0
                ELSE NULL
            END AS crescimento_percentual,
            ST_AsGeoJSON(
                COALESCE(m.geometry_estado, ST_Multi(ST_SimplifyPreserveTopology(m.geometry, 0.001))),
                4
            )::json AS geom
        FROM municipios m
        LEFT JOIN atual    a ON a.municipio_id = m.id
        LEFT JOIN anterior b ON b.municipio_id = m.id
        WHERE m.estado_uf = :uf AND m.geometry IS NOT NULL
        ORDER BY m.id
    """), params)

    features = []
    for r in result.fetchall():
        if not r.geom:
            continue
        crescimento = r.crescimento_percentual
        features.append({
            "type": "Feature",
            "geometry": r.geom,
            "properties": {
                "codigo_ibge":            r.codigo_ibge,
                "nome":                   r.nome,
                "estado_uf":              r.estado_uf,
                "votos_atual":            int(r.votos_atual or 0),
                "votos_anterior":         int(r.votos_anterior or 0),
                "eleitos_atual":          int(r.eleitos_atual or 0),
                "eleitos_anterior":       int(r.eleitos_anterior or 0),
                "crescimento_percentual": round(crescimento, 2) if crescimento is not None else None,
                "status_farol":           "COMPARACAO_TEMPORAL",
                # Para o frontend antigo que ainda lê variacao_pct:
                "variacao_pct":           round(crescimento, 2) if crescimento is not None else None,
                # eleitos atual reusado para o tooltip do frontend antigo
                "eleitos":                int(r.eleitos_atual or 0),
                "votos":                  int(r.votos_atual or 0),
            },
        })

    # Aplica nivel_farol/score_normalizado baseado no crescimento absoluto
    enriquecer_features_percentil(
        features,
        lambda p: float(abs(p.get("crescimento_percentual") or 0)),
    )

    return {"type": "FeatureCollection", "features": features}


@router.get("/buscar")
async def buscar(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Busca por texto livre — retorna municípios, estados e políticos.
    Alimenta o autocomplete do filtro do mapa.
    """
    q_like = f"%{q.upper()}%"
    sugestoes = []

    # Ordem de prioridade (Cesar 20/04/2026): geografia vem antes de pessoas.
    # Estados (raro) -> Municipios -> Bairros -> Zonas -> Politicos.
    # Politicos dedupe por nome (mesma pessoa pode ter 2-3 candidaturas no DB).

    # Estados
    estados = await db.execute(text("""
        SELECT DISTINCT estado_uf FROM municipios
        WHERE UPPER(estado_uf) LIKE :q
        ORDER BY estado_uf LIMIT 3
    """), {"q": q_like})
    for r in estados.fetchall():
        sugestoes.append({
            "tipo":  "estado",
            "label": r.estado_uf,
            "valor": r.estado_uf,
        })

    # Municípios
    muns = await db.execute(text("""
        SELECT nome, estado_uf, codigo_ibge
        FROM municipios
        WHERE UPPER(nome) LIKE :q
        ORDER BY nome LIMIT 5
    """), {"q": q_like})
    for r in muns.fetchall():
        sugestoes.append({
            "tipo":     "municipio",
            "label":    r.nome,
            "sublabel": r.estado_uf,
            "valor":    r.codigo_ibge,
        })

    # Bairros (distritos municipais) - usa cd_dist como valor
    bairros = await db.execute(text("""
        SELECT cd_dist, nm_dist, cd_mun, nm_mun, sigla_uf
        FROM distritos_municipio
        WHERE UPPER(nm_dist) LIKE :q
        ORDER BY nm_dist LIMIT 5
    """), {"q": q_like})
    for r in bairros.fetchall():
        sugestoes.append({
            "tipo":     "bairro",
            "label":    r.nm_dist,
            "sublabel": f"{r.nm_mun}/{r.sigla_uf}",
            "valor":    r.cd_dist,
            "contexto_ibge": r.cd_mun,
            "contexto_uf":   r.sigla_uf,
            "contexto_nome": f"{r.nm_mun}/{r.sigla_uf}",
        })

    # Zonas eleitorais - busca por numero ou descricao (municipio principal).
    zonas = await db.execute(text("""
        SELECT z.numero, z.descricao, m.codigo_ibge, m.nome AS municipio_nome, m.estado_uf
        FROM zonas_eleitorais z
        JOIN municipios m ON m.id = z.municipio_id
        WHERE UPPER(CAST(z.numero AS TEXT)) LIKE :q
           OR UPPER(COALESCE(z.descricao, '')) LIKE :q
        ORDER BY z.numero LIMIT 5
    """), {"q": q_like})
    for r in zonas.fetchall():
        sugestoes.append({
            "tipo":     "zona",
            "label":    f"Zona {r.numero}",
            "sublabel": f"{r.municipio_nome}/{r.estado_uf}",
            "valor":    str(r.numero),
            "contexto_ibge": r.codigo_ibge,
            "contexto_uf":   r.estado_uf,
            "contexto_nome": f"{r.municipio_nome}/{r.estado_uf}",
        })

    # Politicos - DEDUPE por ID (pessoa), pega a candidatura mais recente
    # pra cada pessoa. Ordena por ano DESC + cargo-peso (prefeito > vereador)
    # pra o candidato mais "famoso" aparecer primeiro. Ate 4 pra nao afogar.
    pols = await db.execute(text("""
        WITH ranqueado AS (
            SELECT
                c.id,
                COALESCE(c.nome_urna, c.nome_completo) AS nome,
                ca.cargo,
                ca.estado_uf,
                ca.ano,
                CASE UPPER(ca.cargo)
                    WHEN 'PRESIDENTE'        THEN 7
                    WHEN 'GOVERNADOR'        THEN 6
                    WHEN 'SENADOR'           THEN 5
                    WHEN 'DEPUTADO FEDERAL'  THEN 4
                    WHEN 'PREFEITO'          THEN 3
                    WHEN 'DEPUTADO ESTADUAL' THEN 2
                    WHEN 'VEREADOR'          THEN 1
                    ELSE 0
                END AS cargo_peso,
                ROW_NUMBER() OVER (
                    PARTITION BY c.id
                    ORDER BY ca.ano DESC,
                             CASE UPPER(ca.cargo)
                                 WHEN 'PRESIDENTE'        THEN 7
                                 WHEN 'GOVERNADOR'        THEN 6
                                 WHEN 'SENADOR'           THEN 5
                                 WHEN 'DEPUTADO FEDERAL'  THEN 4
                                 WHEN 'PREFEITO'          THEN 3
                                 WHEN 'DEPUTADO ESTADUAL' THEN 2
                                 WHEN 'VEREADOR'          THEN 1
                                 ELSE 0
                             END DESC
                ) AS rn
            FROM candidatos c
            JOIN candidaturas ca ON ca.candidato_id = c.id
            WHERE UPPER(COALESCE(c.nome_urna, c.nome_completo)) LIKE :q
        )
        SELECT id, nome, cargo, estado_uf, ano
        FROM ranqueado
        WHERE rn = 1
        ORDER BY cargo_peso DESC, ano DESC, nome
        LIMIT 4
    """), {"q": q_like})
    for r in pols.fetchall():
        sugestoes.append({
            "tipo":     "politico",
            "label":    r.nome,
            "sublabel": f"{r.cargo} · {r.estado_uf} · {r.ano}",
            "valor":    str(r.id),
        })

    return sugestoes


# ── Historico de buscas do usuario (Cesar 20/04) ─────────────────────────────

@router.post("/buscas/registrar")
async def registrar_busca(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(requer_qualquer),
):
    """
    Registra uma busca confirmada pelo usuario (click em sugestao).
    Alimenta o dropdown "Suas regioes recentes" do FiltroMapa.

    Body esperado:
        {
          "tipo": "municipio|estado|bairro|zona|politico|partido",
          "valor": "string canonico",
          "nome":  "label legivel",
          "uf":    "SP" | null,
          "contexto": "Sao Paulo/SP" | null
        }
    """
    tipo = payload.get("tipo")
    valor = payload.get("valor")
    nome = payload.get("nome")
    uf = payload.get("uf")
    contexto = payload.get("contexto")

    if not tipo or not valor or not nome:
        return {"ok": False, "erro": "tipo, valor e nome sao obrigatorios"}

    if tipo not in {"municipio", "estado", "bairro", "zona", "politico", "partido"}:
        return {"ok": False, "erro": "tipo invalido"}

    registro = UsuarioBusca(
        user_id=user.id,
        tipo=tipo,
        valor=str(valor)[:50],
        nome=str(nome)[:200],
        uf=(str(uf)[:2] if uf else None),
        contexto=(str(contexto)[:200] if contexto else None),
    )
    db.add(registro)
    await db.commit()
    return {"ok": True, "id": registro.id}


@router.get("/buscas/recentes")
async def buscas_recentes(
    limit: int = Query(10, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(requer_qualquer),
):
    """
    Ultimas buscas unicas do usuario (deduplica por tipo+valor, mantem a
    entrada mais recente). Retorna ate `limit` itens ordenados por recencia.
    """
    result = await db.execute(text("""
        SELECT DISTINCT ON (tipo, valor)
               tipo, valor, nome, uf, contexto, criado_em
        FROM usuario_buscas
        WHERE user_id = :uid
        ORDER BY tipo, valor, criado_em DESC
    """), {"uid": user.id})
    rows = result.fetchall()
    # Ordena por criado_em DESC em Python (DISTINCT ON ordena por chave primeiro).
    rows_sorted = sorted(rows, key=lambda r: r.criado_em, reverse=True)
    return [
        {
            "tipo":     r.tipo,
            "valor":    r.valor,
            "nome":     r.nome,
            "uf":       r.uf,
            "contexto": r.contexto,
        }
        for r in rows_sorted[:limit]
    ]


# ════════════════════════════════════════════════════════════════════════════
# ENDPOINTS DA FASE 3 — sidebar enxuta, recomendações estratégicas e heatmap
# ════════════════════════════════════════════════════════════════════════════


@router.get("/municipio/{codigo_ibge}/resumo")
async def get_municipio_resumo(
    codigo_ibge: str,
    ano: int = Query(2024, description="Ano de referência. Default: 2024"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Versão enxuta do painel de município para a sidebar do mapa.
    Retorna apenas o essencial: dados básicos, prefeito e vereadores eleitos
    do ano informado. NÃO substitui /municipio/{codigo_ibge} (versão completa).
    """
    mun_row = (await db.execute(text("""
        SELECT id, codigo_ibge, nome, estado_uf, populacao
        FROM municipios
        WHERE codigo_ibge = :ibge
        LIMIT 1
    """), {"ibge": codigo_ibge})).fetchone()

    if not mun_row:
        return {"municipio": None, "prefeito": None, "vereadores": [], "totais": {}}

    municipio_id = mun_row.id

    # Lê de mv_dominancia_municipio em vez de candidaturas direto:
    # ETL grava registros fantasma "eleito=true / votos=0" para vencedores
    # de 2º turno, e a MV (ordenada por dominante_votos DESC) já corrige isso.
    prefeito_row = (await db.execute(text("""
        SELECT
            d.candidato_id              AS id,
            d.dominante_nome            AS nome,
            c.foto_url                  AS foto_url,
            d.partido_numero            AS partido_numero,
            d.partido_sigla             AS partido_sigla,
            p.logo_url                  AS partido_logo_url,
            d.dominante_votos           AS votos
        FROM mv_dominancia_municipio d
        JOIN candidatos c ON c.id = d.candidato_id
        JOIN partidos   p ON p.id = d.partido_id
        WHERE d.municipio_id = :mun
          AND d.cargo = 'PREFEITO'
          AND d.ano = :ano
          AND d.turno = 1
        LIMIT 1
    """), {"mun": municipio_id, "ano": ano})).fetchone()

    vereadores_rows = (await db.execute(text("""
        SELECT
            c.id, COALESCE(c.nome_urna, c.nome_completo) AS nome,
            c.foto_url, p.numero AS partido_numero, p.sigla AS partido_sigla,
            p.logo_url AS partido_logo_url,
            COALESCE(ca.votos_total, 0) AS votos
        FROM candidaturas ca
        JOIN candidatos c ON c.id = ca.candidato_id
        JOIN partidos   p ON p.id = ca.partido_id
        WHERE ca.municipio_id = :mun
          AND UPPER(ca.cargo) = 'VEREADOR'
          AND ca.eleito = TRUE
          AND ca.ano = :ano
        ORDER BY ca.votos_total DESC
    """), {"mun": municipio_id, "ano": ano})).fetchall()

    totais_row = (await db.execute(text("""
        SELECT
            COALESCE(SUM(n_eleitos), 0)  AS total_eleitos,
            COALESCE(SUM(total_votos), 0) AS total_votos,
            COUNT(DISTINCT partido_id)    AS n_partidos
        FROM mv_score_municipio
        WHERE municipio_id = :mun
          AND ano = :ano
          AND turno = 1
    """), {"mun": municipio_id, "ano": ano})).fetchone()

    return {
        "municipio": {
            "codigo_ibge": mun_row.codigo_ibge,
            "nome":        mun_row.nome,
            "estado_uf":   mun_row.estado_uf,
            "populacao":   mun_row.populacao,
        },
        "prefeito": {
            "candidato_id":   prefeito_row.id,
            "nome":           prefeito_row.nome,
            "foto_url":       prefeito_row.foto_url,
            "partido_numero": prefeito_row.partido_numero,
            "partido_sigla":  prefeito_row.partido_sigla,
            "partido_logo":   prefeito_row.partido_logo_url,
            "votos":          int(prefeito_row.votos or 0),
        } if prefeito_row else None,
        "vereadores": [
            {
                "candidato_id":   v.id,
                "nome":           v.nome,
                "foto_url":       v.foto_url,
                "partido_numero": v.partido_numero,
                "partido_sigla":  v.partido_sigla,
                "partido_logo":   v.partido_logo_url,
                "votos":          int(v.votos or 0),
            }
            for v in vereadores_rows
        ],
        "totais": {
            "total_eleitos": int(totais_row.total_eleitos or 0),
            "total_votos":   int(totais_row.total_votos or 0),
            "n_partidos":    int(totais_row.n_partidos or 0),
        },
        "ano": ano,
    }


# ── Tooltip Globo G1: top 2 candidatos de um município (eleito + 2º colocado) ──

# Cache em memória do top2 por (ibge, cargo, ano, turno). TTL via header
# Cache-Control; limpa manualmente quando ETL reimporta votos.
_top2_cache: dict = {}

# Cargos majoritários (vencedor único): top2 = eleito + 2º colocado.
_TOP2_CARGOS_MAJORITARIOS = {"PREFEITO", "PRESIDENTE", "GOVERNADOR"}
# Cargos proporcionais (múltiplos eleitos): preview = top eleitos + top não-eleitos.
_TOP2_CARGOS_PROPORCIONAIS = {"VEREADOR", "DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL", "SENADOR"}
_TOP2_CARGOS_SUPORTADOS = _TOP2_CARGOS_MAJORITARIOS | _TOP2_CARGOS_PROPORCIONAIS


@router.get("/municipio/{codigo_ibge}/top2")
async def get_municipio_top2(
    codigo_ibge: str,
    response: Response,
    cargo: str = Query(..., description="PREFEITO | PRESIDENTE | GOVERNADOR"),
    ano: int = Query(..., description="Ano da eleição (2024, 2022, 2020, 2018...)"),
    turno: int = Query(1, description="1 ou 2"),
    tab: str | None = Query(None, description="'total' resolve turno automaticamente (2º se houve, senão 1º)"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Apuração de um município/cargo/ano/turno no estilo Globo G1.

    Retorna:
      - candidatos: top 10 ordenados por votos, com % de válidos, flag "eleito"
      - teve_segundo_turno: bool — controla layout do frontend
      - totais: eleitores, comparecimento, validos, brancos, nulos, abstencoes (+ %)

    Lógica por cargo:
      - PREFEITO: candidaturas.municipio_id + totais de votos_por_zona (município)
      - PRESIDENTE: tudo de votos_por_zona agregado no município
      - GOVERNADOR: candidatos da UF (replica); totais do estado
    """
    from app.services.cores_partidos import get_cor_partido

    cargo_upper = cargo.upper()
    if cargo_upper not in _TOP2_CARGOS_SUPORTADOS:
        response.status_code = 422
        return {"detail": f"Cargo {cargo_upper} não suportado (apenas majoritários)"}

    mun_row = (await db.execute(text("""
        SELECT id, codigo_ibge, nome, estado_uf
        FROM municipios
        WHERE codigo_ibge = :ibge
        LIMIT 1
    """), {"ibge": codigo_ibge})).fetchone()
    if not mun_row:
        response.status_code = 404
        return {"detail": "Município não encontrado"}

    # Tab "total" (Globo-like): resolve turno final automaticamente ANTES de tudo.
    # PREFEITO: se teve candidatura turno=2 com votos → turno=2; senão turno=1.
    # PRESIDENTE: se teve votos_por_zona turno=2 no município → turno=2; senão 1.
    # GOVERNADOR: se teve candidatura turno=2 no estado → turno=2; senão 1.
    if tab == "total":
        if cargo_upper == "PREFEITO":
            r = (await db.execute(text("""
                SELECT EXISTS (SELECT 1 FROM candidaturas WHERE municipio_id=:m
                  AND UPPER(cargo)='PREFEITO' AND ano=:a AND turno=2 AND COALESCE(votos_total,0) > 0) AS tem
            """), {"m": mun_row.id, "a": ano})).fetchone()
        elif cargo_upper == "PRESIDENTE":
            r = (await db.execute(text("""
                SELECT EXISTS (SELECT 1 FROM votos_por_zona WHERE municipio_id=:m AND turno=2 AND qt_votos > 0) AS tem
            """), {"m": mun_row.id})).fetchone()
        else:
            r = (await db.execute(text("""
                SELECT EXISTS (SELECT 1 FROM candidaturas WHERE estado_uf=:u
                  AND UPPER(cargo)='GOVERNADOR' AND ano=:a AND turno=2 AND COALESCE(votos_total,0) > 0) AS tem
            """), {"u": mun_row.estado_uf, "a": ano})).fetchone()
        turno = 2 if (r and r.tem) else 1

    cache_key = f"{codigo_ibge}:{cargo_upper}:{ano}:{turno}:{tab or ''}"
    if cache_key in _top2_cache:
        response.headers["Cache-Control"] = "private, max-age=300"
        return _top2_cache[cache_key]

    # ── Candidatos top 10 (por votos) ─────────────────────────────────────
    if cargo_upper == "PREFEITO":
        # Agrega votos_por_zona por candidato (candidaturas.votos_total está bugado
        # no banco — duplica registros e soma turnos. votos_por_zona tem turno correto).
        cand_rows = (await db.execute(text("""
            SELECT
                c.id                                     AS candidato_id,
                COALESCE(c.nome_urna, c.nome_completo)   AS nome,
                c.foto_url,
                p.numero                                 AS partido_num,
                p.sigla                                  AS partido_sigla,
                COALESCE(SUM(vpz.qt_votos), 0)           AS votos,
                BOOL_OR(COALESCE(ca.eleito, FALSE))      AS eleito
            FROM votos_por_zona vpz
            JOIN candidaturas ca ON ca.id = vpz.candidatura_id
            JOIN candidatos   c  ON c.id  = ca.candidato_id
            JOIN partidos     p  ON p.id  = ca.partido_id
            WHERE vpz.municipio_id = :mun
              AND UPPER(ca.cargo) = 'PREFEITO'
              AND ca.ano = :ano
              AND vpz.turno = :turno
            GROUP BY c.id, c.nome_urna, c.nome_completo, c.foto_url, p.numero, p.sigla
            ORDER BY votos DESC
            LIMIT 10
        """), {"mun": mun_row.id, "ano": ano, "turno": turno})).fetchall()

    elif cargo_upper == "PRESIDENTE":
        cand_rows = (await db.execute(text("""
            SELECT
                c.id                                     AS candidato_id,
                COALESCE(c.nome_urna, c.nome_completo)   AS nome,
                c.foto_url,
                p.numero                                 AS partido_num,
                p.sigla                                  AS partido_sigla,
                COALESCE(SUM(vpz.qt_votos), 0)           AS votos,
                BOOL_OR(COALESCE(ca.eleito, FALSE))      AS eleito
            FROM votos_por_zona vpz
            JOIN candidaturas ca ON ca.id = vpz.candidatura_id
            JOIN candidatos   c  ON c.id  = ca.candidato_id
            JOIN partidos     p  ON p.id  = ca.partido_id
            WHERE vpz.municipio_id = :mun
              AND UPPER(ca.cargo) = 'PRESIDENTE'
              AND ca.ano = :ano
              AND vpz.turno = :turno
            GROUP BY c.id, c.nome_urna, c.nome_completo, c.foto_url, p.numero, p.sigla
            ORDER BY votos DESC
            LIMIT 10
        """), {"mun": mun_row.id, "ano": ano, "turno": turno})).fetchall()

    elif cargo_upper == "GOVERNADOR":
        # GOVERNADOR — agrega votos_por_zona NO MUNICÍPIO (pra % locais)
        cand_rows = (await db.execute(text("""
            SELECT
                c.id                                     AS candidato_id,
                COALESCE(c.nome_urna, c.nome_completo)   AS nome,
                c.foto_url,
                p.numero                                 AS partido_num,
                p.sigla                                  AS partido_sigla,
                COALESCE(SUM(vpz.qt_votos), 0)           AS votos,
                BOOL_OR(COALESCE(ca.eleito, FALSE))      AS eleito
            FROM votos_por_zona vpz
            JOIN candidaturas ca ON ca.id = vpz.candidatura_id
            JOIN candidatos   c  ON c.id  = ca.candidato_id
            JOIN partidos     p  ON p.id  = ca.partido_id
            WHERE vpz.municipio_id = :mun
              AND UPPER(ca.cargo) = 'GOVERNADOR'
              AND ca.ano = :ano
              AND vpz.turno = :turno
            GROUP BY c.id, c.nome_urna, c.nome_completo, c.foto_url, p.numero, p.sigla
            ORDER BY votos DESC
            LIMIT 10
        """), {"mun": mun_row.id, "ano": ano, "turno": turno})).fetchall()

    else:
        # Cargos PROPORCIONAIS (VEREADOR/DEP_*/SENADOR): 2 queries separadas pra
        # garantir que abas de Eleitos e Não-eleitos sempre tenham conteúdo.
        # SP capital tem 55 vereadores eleitos — se LIMIT 30 simples só vinham eleitos.
        sql_prop = """
            SELECT
                c.id                                     AS candidato_id,
                COALESCE(c.nome_urna, c.nome_completo)   AS nome,
                c.foto_url,
                p.numero                                 AS partido_num,
                p.sigla                                  AS partido_sigla,
                COALESCE(SUM(vpz.qt_votos), 0)           AS votos,
                BOOL_OR(COALESCE(ca.eleito, FALSE))      AS eleito
            FROM votos_por_zona vpz
            JOIN candidaturas ca ON ca.id = vpz.candidatura_id
            JOIN candidatos   c  ON c.id  = ca.candidato_id
            JOIN partidos     p  ON p.id  = ca.partido_id
            WHERE vpz.municipio_id = :mun
              AND UPPER(ca.cargo) = :cargo
              AND ca.ano = :ano
              AND vpz.turno = :turno
            GROUP BY c.id, c.nome_urna, c.nome_completo, c.foto_url, p.numero, p.sigla
            HAVING SUM(vpz.qt_votos) > 0
              AND BOOL_OR(COALESCE(ca.eleito, FALSE)) = :eleito_flag
            ORDER BY votos DESC
            LIMIT :lim
        """
        params = {"mun": mun_row.id, "cargo": cargo_upper, "ano": ano, "turno": turno}
        # 100 eleitos (cobre câmaras municipais grandes) + 30 não-eleitos
        eleitos_rows = (await db.execute(text(sql_prop), {**params, "eleito_flag": True, "lim": 100})).fetchall()
        nao_eleitos_rows = (await db.execute(text(sql_prop), {**params, "eleito_flag": False, "lim": 30})).fetchall()
        cand_rows = list(eleitos_rows) + list(nao_eleitos_rows)

    # ── Totais da apuração (vêm da tabela apuracao_municipio, populada pelo
    # ETL 38 a partir do detalhe_votacao_munzona do TSE). Se não tiver
    # registro pro cargo/ano/turno, totais ficam None (frontend esconde).
    totais_row = (await db.execute(text("""
        SELECT
            aptos          AS eleitores,
            comparecimento,
            abstencoes,
            validos,
            brancos,
            nulos
        FROM apuracao_municipio
        WHERE municipio_id = :mun
          AND UPPER(cargo) = :cargo
          AND ano = :ano
          AND turno = :turno
    """), {"mun": mun_row.id, "cargo": cargo_upper, "ano": ano, "turno": turno})).fetchone()

    # ── Teve 2º turno neste município/cargo? ──────────────────────────────
    teve_segundo_turno = False
    if cargo_upper == "PREFEITO":
        r2t = (await db.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM candidaturas
                WHERE municipio_id = :mun AND UPPER(cargo) = 'PREFEITO'
                  AND ano = :ano AND turno = 2
                  AND COALESCE(votos_total, 0) > 0
            ) AS tem
        """), {"mun": mun_row.id, "ano": ano})).fetchone()
        teve_segundo_turno = bool(r2t.tem) if r2t else False
    elif cargo_upper == "PRESIDENTE":
        r2t = (await db.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM votos_por_zona
                WHERE municipio_id = :mun AND turno = 2 AND qt_votos > 0
            ) AS tem
        """), {"mun": mun_row.id})).fetchone()
        teve_segundo_turno = bool(r2t.tem) if r2t else False
    else:  # GOVERNADOR
        r2t = (await db.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM candidaturas
                WHERE estado_uf = :uf AND UPPER(cargo) = 'GOVERNADOR'
                  AND ano = :ano AND turno = 2
                  AND COALESCE(votos_total, 0) > 0
            ) AS tem
        """), {"uf": mun_row.estado_uf, "ano": ano})).fetchone()
        teve_segundo_turno = bool(r2t.tem) if r2t else False

    total_votos_cands = sum(int(r.votos or 0) for r in cand_rows)
    # Apuracao_municipio pode não ter entrada (cargo/ano não populado) — cai
    # no fallback de somar os votos dos candidatos, e deixa os demais como None.
    if totais_row is None:
        validos = total_votos_cands
        eleitores = comparecimento = brancos = nulos = abstencoes = None
    else:
        validos = int(totais_row.validos) if totais_row.validos is not None else total_votos_cands
        eleitores      = int(totais_row.eleitores)      if totais_row.eleitores      is not None else None
        comparecimento = int(totais_row.comparecimento) if totais_row.comparecimento is not None else None
        brancos        = int(totais_row.brancos)        if totais_row.brancos        is not None else None
        nulos          = int(totais_row.nulos)          if totais_row.nulos          is not None else None
        abstencoes     = int(totais_row.abstencoes)     if totais_row.abstencoes     is not None else None

    def _pct(num: float, den: float) -> float:
        return round((num * 100.0) / den, 2) if den > 0 else 0.0

    candidatos = [
        {
            "candidato_id":  r.candidato_id,
            "nome":          r.nome,
            "foto_url":      r.foto_url,
            "partido_num":   int(r.partido_num or 0),
            "partido_sigla": r.partido_sigla or "",
            "cor_hex":       get_cor_partido(r.partido_num),
            "votos":         int(r.votos or 0),
            "pct_validos":   _pct(float(r.votos or 0), float(validos)),
            "eleito":        bool(r.eleito),
        }
        for r in cand_rows
    ]

    payload = {
        "municipio": {
            "codigo_ibge": mun_row.codigo_ibge,
            "nome":        mun_row.nome,
            "estado_uf":   mun_row.estado_uf,
        },
        "cargo": cargo_upper,
        "ano":   ano,
        "turno": turno,
        "teve_segundo_turno": teve_segundo_turno,
        "candidatos": candidatos,
        # Compat retroativa com o tooltip que já consome eleito/segundo:
        "eleito":  candidatos[0] if len(candidatos) >= 1 else None,
        "segundo": candidatos[1] if len(candidatos) >= 2 else None,
        "totais": {
            "eleitores":      eleitores,
            "comparecimento": comparecimento,
            "abstencoes":     abstencoes,
            "validos":        validos,
            "brancos":        brancos,
            "nulos":          nulos,
            "total_votos":    (validos + (brancos or 0) + (nulos or 0)) if validos else None,
            "pct_abstencoes": _pct(abstencoes, eleitores) if abstencoes is not None and eleitores else None,
            "pct_validos":    _pct(validos, validos + (brancos or 0) + (nulos or 0)) if brancos is not None and nulos is not None else None,
            "pct_brancos":    _pct(brancos, validos + (brancos or 0) + (nulos or 0)) if brancos is not None else None,
            "pct_nulos":      _pct(nulos, validos + (brancos or 0) + (nulos or 0)) if nulos is not None else None,
        },
    }
    _top2_cache[cache_key] = payload
    response.headers["Cache-Control"] = "private, max-age=300"
    return payload


_top2_dist_cache: dict = {}
_comparativo_zonas_cache: dict = {}
_totais_cache: dict = {}
_microbairros_cache: dict = {}


@router.get("/microbairros")
async def get_microbairros(
    response: Response,
    cidade: str = Query("São Paulo", description="Filtra por cidade (default SP capital)"),
    uf: str = Query("SP"),
    so_com_polygon: bool = Query(False, description="Só retorna os que têm polygon OSM real"),
    limit: int = Query(2000, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    GeoJSON dos microbairros (HERE Geocoding + OSM polygon quando disponível).
    Cada feature tem `tipo: 'polygon' | 'point'` indicando se é polygon real do OSM
    ou só centroide HERE.
    """
    cache_key = f"{uf}:{cidade}:{so_com_polygon}:{limit}"
    if cache_key in _microbairros_cache:
        response.headers["Cache-Control"] = "private, max-age=600"
        return _microbairros_cache[cache_key]

    # Polygon final (fallback chain): polygon_final > polygon_censitario > polygon_voronoi > osm_polygon
    where_extra = "AND (polygon_final IS NOT NULL OR polygon_censitario IS NOT NULL OR osm_polygon IS NOT NULL OR polygon_voronoi IS NOT NULL)" if so_com_polygon else ""
    rows = (await db.execute(text(f"""
        SELECT id, nome, cidade, uf,
               here_lat, here_lng,
               ST_AsGeoJSON(COALESCE(polygon_final, polygon_censitario, polygon_voronoi, osm_polygon), 6)::json AS polygon_geojson,
               CASE
                 WHEN polygon_final IS NOT NULL THEN 'final'
                 WHEN polygon_censitario IS NOT NULL THEN 'censitario'
                 WHEN polygon_voronoi IS NOT NULL THEN 'voronoi'
                 WHEN osm_polygon IS NOT NULL THEN 'osm'
                 ELSE 'ponto'
               END AS polygon_origem,
               setores_censitarios_n,
               area_km2
        FROM microbairros
        WHERE uf = :uf AND cidade = :cidade
          AND status IN ('here_ok', 'osm_ok', 'censitaria_ok')
          {where_extra}
        ORDER BY (polygon_final IS NOT NULL) DESC,
                 (polygon_censitario IS NOT NULL) DESC,
                 (polygon_voronoi IS NOT NULL) DESC,
                 (osm_polygon IS NOT NULL) DESC, nome
        LIMIT :lim
    """), {"uf": uf.upper(), "cidade": cidade, "lim": limit})).fetchall()

    features = []
    for r in rows:
        if r.polygon_geojson:
            geom = r.polygon_geojson
            tipo = "polygon"
        elif r.here_lat is not None and r.here_lng is not None:
            geom = {"type": "Point", "coordinates": [float(r.here_lng), float(r.here_lat)]}
            tipo = "point"
        else:
            continue
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "id": r.id, "nome": r.nome, "cidade": r.cidade, "uf": r.uf,
                "tipo": tipo,
                "origem": r.polygon_origem or "ponto",  # 'censitario' | 'osm' | 'voronoi' | 'ponto'
                "setores_n": r.setores_censitarios_n,
                "area_km2": float(r.area_km2) if r.area_km2 else None,
            },
        })

    payload = {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "cidade": cidade, "uf": uf,
            "total": len(features),
            "polygons": sum(1 for f in features if f["properties"]["tipo"] == "polygon"),
            "points":   sum(1 for f in features if f["properties"]["tipo"] == "point"),
            "polygons_osm":     sum(1 for f in features if f["properties"]["origem"] == "osm"),
            "polygons_voronoi": sum(1 for f in features if f["properties"]["origem"] == "voronoi"),
        },
    }
    _microbairros_cache[cache_key] = payload
    response.headers["Cache-Control"] = "private, max-age=600"
    return payload


@router.get("/totais-apuracao")
async def get_totais_apuracao(
    response: Response,
    cargo: str = Query(...),
    ano: int = Query(...),
    turno: int = Query(1),
    nivel: str = Query("brasil", description="brasil | estado | municipio"),
    uf: str | None = Query(None),
    codigo_ibge: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Agrega totais da apuração por nível geográfico.
    Retorna: aptos, comparecimento, abstencoes, validos, brancos, nulos + percentuais.
    """
    cargo_upper = cargo.upper()
    # Turno=0 (Total): apuração do pleito original (1T), que tem todo o eleitorado.
    # Aptos/comparecimento/nulos/brancos/etc são do 1T (pleito universal).
    turno_efetivo = 1 if turno == 0 else turno
    cache_key = f"{nivel}:{uf or ''}:{codigo_ibge or ''}:{cargo_upper}:{ano}:{turno_efetivo}"
    if cache_key in _totais_cache:
        response.headers["Cache-Control"] = "private, max-age=300"
        return _totais_cache[cache_key]

    where_extra = ""
    params: dict = {"cargo": cargo_upper, "ano": ano, "turno": turno_efetivo}
    if nivel == "estado" and uf:
        where_extra = "AND m.estado_uf = :uf"
        params["uf"] = uf.upper()
    elif nivel == "municipio" and codigo_ibge:
        where_extra = "AND m.codigo_ibge = :ibge"
        params["ibge"] = codigo_ibge

    row = (await db.execute(text(f"""
        SELECT
            COALESCE(SUM(a.aptos), 0)          AS aptos,
            COALESCE(SUM(a.comparecimento), 0) AS comparecimento,
            COALESCE(SUM(a.abstencoes), 0)     AS abstencoes,
            COALESCE(SUM(a.validos), 0)        AS validos,
            COALESCE(SUM(a.brancos), 0)        AS brancos,
            COALESCE(SUM(a.nulos), 0)          AS nulos,
            COUNT(*)                           AS n_municipios
        FROM apuracao_municipio a
        JOIN municipios m ON m.id = a.municipio_id
        WHERE UPPER(a.cargo) = :cargo AND a.ano = :ano AND a.turno = :turno
        {where_extra}
    """), params)).fetchone()

    aptos = int(row.aptos)
    comparecimento = int(row.comparecimento)
    abstencoes = int(row.abstencoes)
    validos = int(row.validos)
    brancos = int(row.brancos)
    nulos = int(row.nulos)
    total_votos = validos + brancos + nulos

    def _pct(num: float, den: float) -> float | None:
        return round((num * 100.0) / den, 2) if den > 0 else None

    payload = {
        "nivel": nivel, "uf": uf, "codigo_ibge": codigo_ibge,
        "cargo": cargo_upper, "ano": ano, "turno": turno,
        "n_municipios": int(row.n_municipios),
        "totais": {
            "aptos": aptos, "comparecimento": comparecimento, "abstencoes": abstencoes,
            "validos": validos, "brancos": brancos, "nulos": nulos,
            "total_votos": total_votos,
            "pct_abstencoes": _pct(abstencoes, aptos),
            "pct_comparecimento": _pct(comparecimento, aptos),
            "pct_validos": _pct(validos, total_votos),
            "pct_brancos": _pct(brancos, total_votos),
            "pct_nulos": _pct(nulos, total_votos),
        },
    }
    _totais_cache[cache_key] = payload
    response.headers["Cache-Control"] = "private, max-age=300"
    return payload


@router.get("/municipio/{codigo_ibge}/comparativo-zonas")
async def get_comparativo_zonas(
    codigo_ibge: str,
    response: Response,
    cargo: str = Query(...),
    ano: int = Query(...),
    turno: int = Query(1),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Matriz candidato × zona eleitoral pro município/cargo/ano/turno.
    Retorna top 10 candidatos + todas as zonas do município, com votos e %
    da zona por candidato. Usado no side panel de comparativo (Fase 7).
    """
    from app.services.cores_partidos import get_cor_partido

    cargo_upper = cargo.upper()
    cache_key = f"{codigo_ibge}:{cargo_upper}:{ano}:{turno}"
    if cache_key in _comparativo_zonas_cache:
        response.headers["Cache-Control"] = "private, max-age=300"
        return _comparativo_zonas_cache[cache_key]

    mun_row = (await db.execute(text("""
        SELECT id, codigo_ibge, nome, estado_uf FROM municipios WHERE codigo_ibge = :ibge
    """), {"ibge": codigo_ibge})).fetchone()
    if not mun_row:
        response.status_code = 404
        return {"detail": "Município não encontrado"}

    # Lista de zonas com total de votos daquele cargo/ano/turno
    zonas_rows = (await db.execute(text("""
        SELECT ze.numero AS nr_zona, COALESCE(SUM(vpz.qt_votos), 0) AS total
        FROM zonas_eleitorais ze
        LEFT JOIN votos_por_zona vpz ON vpz.zona_id = ze.id AND vpz.turno = :turno
          AND vpz.candidatura_id IN (
            SELECT id FROM candidaturas WHERE ano = :ano AND UPPER(cargo) = :cargo
          )
        WHERE ze.municipio_id = :mun
        GROUP BY ze.numero
        ORDER BY ze.numero
    """), {"mun": mun_row.id, "ano": ano, "turno": turno, "cargo": cargo_upper})).fetchall()
    zonas = [{"numero": r.nr_zona, "total_votos": int(r.total)} for r in zonas_rows]
    totais_por_zona = {r.nr_zona: int(r.total) for r in zonas_rows}

    # Top 10 candidatos + votos por zona (matriz esparsa)
    cand_rows = (await db.execute(text("""
        WITH cand_totais AS (
            SELECT ca.candidato_id, COALESCE(SUM(vpz.qt_votos), 0) AS total
            FROM votos_por_zona vpz
            JOIN candidaturas ca ON ca.id = vpz.candidatura_id
            WHERE vpz.municipio_id = :mun AND vpz.turno = :turno
              AND ca.ano = :ano AND UPPER(ca.cargo) = :cargo
            GROUP BY ca.candidato_id
            ORDER BY total DESC
            LIMIT 10
        )
        SELECT
            c.id AS candidato_id,
            COALESCE(c.nome_urna, c.nome_completo) AS nome,
            c.foto_url, p.numero AS partido_num, p.sigla AS partido_sigla,
            ze.numero AS nr_zona,
            COALESCE(SUM(vpz.qt_votos), 0) AS votos_zona,
            BOOL_OR(COALESCE(ca.eleito, FALSE)) AS eleito,
            ct.total AS votos_total
        FROM cand_totais ct
        JOIN candidaturas ca ON ca.candidato_id = ct.candidato_id
          AND UPPER(ca.cargo) = :cargo AND ca.ano = :ano
        JOIN candidatos c ON c.id = ca.candidato_id
        JOIN partidos   p ON p.id = ca.partido_id
        LEFT JOIN votos_por_zona vpz ON vpz.candidatura_id = ca.id
          AND vpz.municipio_id = :mun AND vpz.turno = :turno
        LEFT JOIN zonas_eleitorais ze ON ze.id = vpz.zona_id
        GROUP BY c.id, c.nome_urna, c.nome_completo, c.foto_url, p.numero, p.sigla, ze.numero, ct.total
        ORDER BY ct.total DESC, c.id, ze.numero
    """), {"mun": mun_row.id, "ano": ano, "turno": turno, "cargo": cargo_upper})).fetchall()

    # Agregar: candidato_id -> { votos_total, votos_por_zona: { nr_zona: N } }
    candidatos: dict[int, dict] = {}
    for r in cand_rows:
        cid = r.candidato_id
        if cid not in candidatos:
            candidatos[cid] = {
                "candidato_id": cid,
                "nome": r.nome,
                "foto_url": r.foto_url,
                "partido_num": int(r.partido_num or 0),
                "partido_sigla": r.partido_sigla or "",
                "cor_hex": get_cor_partido(r.partido_num),
                "votos_total": int(r.votos_total or 0),
                "eleito": bool(r.eleito),
                "votos_por_zona": {},
                "pct_por_zona": {},
            }
        if r.nr_zona is not None and r.votos_zona:
            votos_z = int(r.votos_zona)
            total_z = totais_por_zona.get(r.nr_zona, 0)
            candidatos[cid]["votos_por_zona"][str(r.nr_zona)] = votos_z
            candidatos[cid]["pct_por_zona"][str(r.nr_zona)] = (
                round((votos_z * 100.0) / total_z, 2) if total_z > 0 else 0.0
            )

    lista_candidatos = sorted(candidatos.values(), key=lambda x: -x["votos_total"])

    payload = {
        "municipio": {
            "codigo_ibge": mun_row.codigo_ibge, "nome": mun_row.nome, "estado_uf": mun_row.estado_uf,
        },
        "cargo": cargo_upper, "ano": ano, "turno": turno,
        "zonas": zonas,
        "candidatos": lista_candidatos,
    }
    _comparativo_zonas_cache[cache_key] = payload
    response.headers["Cache-Control"] = "private, max-age=300"
    return payload


@router.get("/distrito/{cd_dist}/top2")
async def get_distrito_top2(
    cd_dist: str,
    response: Response,
    cargo: str = Query(...),
    ano: int = Query(...),
    turno: int = Query(1),
    tab: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Apuração DO DISTRITO (bairro IBGE) com top candidatos. Mesmo shape do
    /municipio/{ibge}/top2, porém sem brancos/nulos/abstenções (o TSE publica
    esses por município, não por distrito).

    As zonas do distrito são determinadas via ST_Within entre `locais_votacao.lat/long`
    e `distritos_municipio.geometry`.
    """
    from app.services.cores_partidos import get_cor_partido

    cargo_upper = cargo.upper()
    if cargo_upper not in _TOP2_CARGOS_SUPORTADOS:
        response.status_code = 422
        return {"detail": f"Cargo {cargo_upper} não suportado"}

    dist_row = (await db.execute(text("""
        SELECT cd_dist, nm_dist, cd_mun, sigla_uf
        FROM distritos_municipio
        WHERE cd_dist = :cd
        LIMIT 1
    """), {"cd": cd_dist})).fetchone()
    if not dist_row:
        response.status_code = 404
        return {"detail": "Distrito não encontrado"}

    # Tab "total": resolve turno final herdado do município pai.
    if tab == "total" and cargo_upper == "PREFEITO":
        r = (await db.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM candidaturas ca
                JOIN municipios m ON m.id = ca.municipio_id
                WHERE m.codigo_ibge = :mun AND UPPER(ca.cargo)='PREFEITO'
                  AND ca.ano = :a AND ca.turno = 2 AND COALESCE(ca.votos_total,0) > 0
            ) AS tem
        """), {"mun": dist_row.cd_mun, "a": ano})).fetchone()
        turno = 2 if (r and r.tem) else 1

    cache_key = f"{cd_dist}:{cargo_upper}:{ano}:{turno}:{tab or ''}"
    if cache_key in _top2_dist_cache:
        response.headers["Cache-Control"] = "private, max-age=300"
        return _top2_dist_cache[cache_key]

    # Zonas eleitorais dentro do distrito (via locais_votacao.lat/long).
    # Importante: usar `zona_id` (PK) e NAO `nr_zona`, pois o numero da zona
    # repete entre municipios (zona 63 existe em varios estados). Filtrar por
    # numero contaminava o ranking do bairro com votos de outros estados.
    zonas_rows = (await db.execute(text("""
        SELECT DISTINCT lv.zona_id
        FROM locais_votacao lv
        JOIN distritos_municipio d ON d.cd_dist = :cd
        WHERE lv.latitude IS NOT NULL AND lv.longitude IS NOT NULL
          AND lv.zona_id IS NOT NULL
          AND ST_Within(ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326), d.geometry)
    """), {"cd": cd_dist})).fetchall()
    zonas = [r.zona_id for r in zonas_rows]
    if not zonas:
        # Distrito sem mapeamento de zonas — retorna vazio mas válido
        payload = {
            "municipio": {"codigo_ibge": dist_row.cd_mun, "nome": dist_row.nm_dist or "", "estado_uf": dist_row.sigla_uf or ""},
            "cargo": cargo_upper, "ano": ano, "turno": turno,
            "teve_segundo_turno": False, "candidatos": [],
            "eleito": None, "segundo": None,
            "totais": {"eleitores": None, "comparecimento": None, "abstencoes": None,
                       "validos": None, "brancos": None, "nulos": None, "total_votos": None,
                       "pct_abstencoes": None, "pct_validos": None, "pct_brancos": None, "pct_nulos": None},
        }
        _top2_dist_cache[cache_key] = payload
        return payload

    # Top candidatos agregando votos_por_zona pelas zonas do distrito.
    # Filtro usa vpz.zona_id (PK) diretamente - evita cruzamento com zonas
    # homonimas de outros municipios.
    cand_rows = (await db.execute(text("""
        SELECT
            c.id                                     AS candidato_id,
            COALESCE(c.nome_urna, c.nome_completo)   AS nome,
            c.foto_url,
            p.numero                                 AS partido_num,
            p.sigla                                  AS partido_sigla,
            COALESCE(SUM(vpz.qt_votos), 0)           AS votos,
            BOOL_OR(COALESCE(ca.eleito, FALSE))      AS eleito
        FROM votos_por_zona vpz
        JOIN candidaturas ca ON ca.id = vpz.candidatura_id
        JOIN candidatos   c  ON c.id  = ca.candidato_id
        JOIN partidos     p  ON p.id  = ca.partido_id
        WHERE UPPER(ca.cargo) = :cargo
          AND ca.ano = :ano
          AND vpz.turno = :turno
          AND vpz.zona_id = ANY(:zonas)
        GROUP BY c.id, c.nome_urna, c.nome_completo, c.foto_url, p.numero, p.sigla
        ORDER BY votos DESC
        LIMIT 10
    """), {"cargo": cargo_upper, "ano": ano, "turno": turno, "zonas": zonas})).fetchall()

    total_votos_cands = sum(int(r.votos or 0) for r in cand_rows)
    validos = total_votos_cands

    def _pct(num: float, den: float) -> float:
        return round((num * 100.0) / den, 2) if den > 0 else 0.0

    candidatos = [
        {
            "candidato_id":  r.candidato_id,
            "nome":          r.nome,
            "foto_url":      r.foto_url,
            "partido_num":   int(r.partido_num or 0),
            "partido_sigla": r.partido_sigla or "",
            "cor_hex":       get_cor_partido(r.partido_num),
            "votos":         int(r.votos or 0),
            "pct_validos":   _pct(float(r.votos or 0), float(validos)),
            "eleito":        bool(r.eleito),
        }
        for r in cand_rows
    ]

    # Verificar 2º turno — se o cargo teve 2T no município (PREFEITO) ou estado (GOVERNADOR)
    teve_segundo_turno = False
    if cargo_upper == "PREFEITO":
        r2t = (await db.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM candidaturas ca
                JOIN municipios m ON m.id = ca.municipio_id
                WHERE m.codigo_ibge = :mun AND UPPER(ca.cargo) = 'PREFEITO'
                  AND ca.ano = :ano AND ca.turno = 2 AND COALESCE(ca.votos_total, 0) > 0
            ) AS tem
        """), {"mun": dist_row.cd_mun, "ano": ano})).fetchone()
        teve_segundo_turno = bool(r2t.tem) if r2t else False

    payload = {
        "municipio": {
            "codigo_ibge": dist_row.cd_mun,
            "nome":        dist_row.nm_dist or dist_row.cd_dist,
            "estado_uf":   dist_row.sigla_uf or "",
        },
        "cargo": cargo_upper,
        "ano":   ano,
        "turno": turno,
        "teve_segundo_turno": teve_segundo_turno,
        "candidatos": candidatos,
        "eleito":  candidatos[0] if candidatos else None,
        "segundo": candidatos[1] if len(candidatos) >= 2 else None,
        "totais": {
            # Só válidos (soma dos candidatos); TSE não publica brancos/nulos/abstenções por distrito.
            "eleitores": None, "comparecimento": None, "abstencoes": None,
            "validos": validos, "brancos": None, "nulos": None,
            "total_votos": validos if validos else None,
            "pct_abstencoes": None, "pct_validos": None, "pct_brancos": None, "pct_nulos": None,
        },
    }
    _top2_dist_cache[cache_key] = payload
    response.headers["Cache-Control"] = "private, max-age=300"
    return payload


# ── Recomendações estratégicas (heurística pura SQL, sem IA externa) ─────────

# Mapeamento de ciclo eleitoral: para cada cargo, qual é o ano "anterior"
# usado nas comparações temporais.
CICLO_ANTERIOR = {
    "PRESIDENTE":         {2022: 2018, 2018: 2014},
    "GOVERNADOR":         {2022: 2018, 2018: 2014},
    "SENADOR":            {2022: 2018, 2018: 2014},
    "DEPUTADO FEDERAL":   {2022: 2018, 2018: 2014},
    "DEPUTADO ESTADUAL":  {2022: 2018, 2018: 2014},
    "DEPUTADO DISTRITAL": {2022: 2018, 2018: 2014},
    "PREFEITO":           {2024: 2020, 2020: 2016},
    "VEREADOR":           {2024: 2020, 2020: 2016},
}


def _classificar_recomendacao(
    score_atual: float,
    score_max_atual: float,
    var_pct: float | None,
    n_eleitos_atual: int,
    n_eleitos_anterior: int,
) -> tuple[str, str, str]:
    """
    Classifica a região em (tipo, descricao, acao_sugerida) com base em:
    - força atual relativa (score_atual / score_max_atual)
    - variação percentual de votos vs ciclo anterior
    - delta de eleitos
    """
    forca_relativa = (score_atual / score_max_atual) if score_max_atual > 0 else 0.0
    delta_eleitos = n_eleitos_atual - n_eleitos_anterior

    # ── DOMINANTE ────────────────────────────────────────────────────────
    if forca_relativa >= 0.6 or n_eleitos_atual >= 3:
        return (
            "dominante",
            f"Presença forte: {n_eleitos_atual} mandato(s) eleito(s) e força relativa "
            f"de {int(forca_relativa * 100)}% em relação ao maior partido da região.",
            "Manter a presença. Investir em sucessão de lideranças, "
            "formação de quadros e expansão para regiões adjacentes.",
        )

    # ── RISCO (queda significativa) ──────────────────────────────────────
    if (var_pct is not None and var_pct < -10) or delta_eleitos < 0:
        var_txt = f"{var_pct:.1f}%" if var_pct is not None else "queda de mandatos"
        return (
            "risco",
            f"Tendência negativa: variação de {var_txt} em votos vs ciclo anterior "
            f"e {n_eleitos_atual} mandato(s) eleito(s) (anterior: {n_eleitos_anterior}).",
            "Reforçar presença com urgência. Avaliar lideranças locais, "
            "ouvir a base e revisar a estratégia regional antes do próximo ciclo.",
        )

    # ── OPORTUNIDADE (crescimento ou base baixa em expansão) ─────────────
    if (var_pct is not None and var_pct > 5) or n_eleitos_atual > n_eleitos_anterior:
        var_txt = f"+{var_pct:.1f}%" if var_pct is not None else "crescimento de mandatos"
        return (
            "oportunidade",
            f"Terreno em expansão: {var_txt} em votos vs ciclo anterior. "
            f"Há espaço para conquistar novos mandatos.",
            "Investir em campanha agora. Identificar cabos eleitorais, "
            "alianças locais e focar mídia segmentada nas regiões com maior crescimento.",
        )

    # ── ESTÁVEL (fallback como subcategoria de oportunidade) ─────────────
    return (
        "oportunidade",
        f"Presença estável com {n_eleitos_atual} mandato(s). "
        f"Sem variação significativa vs ciclo anterior.",
        "Manter a base ativa e buscar oportunidades de crescimento orgânico "
        "via filiação e formação de novas lideranças.",
    )


@router.get("/recomendacoes/{regiao}")
async def get_recomendacoes(
    regiao: str,
    partido: int = Query(..., description="Número TSE do partido (obrigatório)"),
    cargo: str = Query("VEREADOR", description="Cargo de referência"),
    ano: int = Query(2024, description="Ano atual de referência"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Recomendação estratégica para uma região (estado UF ou código IBGE municipal).

    Heurística: compara força do partido na região vs ciclo anterior,
    classifica em `dominante`, `oportunidade` ou `risco` e devolve descrição
    e ação sugerida via templates. Não usa IA externa.

    Lê das materialized views do mapa (mv_score_*).
    """
    cargo_upper = cargo.upper().strip()
    ciclo_map = CICLO_ANTERIOR.get(cargo_upper, {})
    ano_anterior = ciclo_map.get(ano)

    # Detecta granularidade pelo formato da regiao
    is_municipio = regiao.isdigit() and len(regiao) >= 6

    if is_municipio:
        mun = (await db.execute(text("""
            SELECT id, nome, estado_uf, codigo_ibge
            FROM municipios WHERE codigo_ibge = :ibge LIMIT 1
        """), {"ibge": regiao})).fetchone()
        if not mun:
            return {"erro": "municipio_nao_encontrado", "regiao": regiao}

        atual = (await db.execute(text("""
            SELECT
                COALESCE(SUM(n_eleitos), 0)      AS n_eleitos,
                COALESCE(SUM(total_votos), 0)    AS total_votos,
                COALESCE(SUM(score_ponderado), 0) AS score
            FROM mv_score_municipio
            WHERE municipio_id = :mun AND cargo = :cargo
              AND ano = :ano AND turno = 1 AND partido_numero = :partido
        """), {"mun": mun.id, "cargo": cargo_upper, "ano": ano, "partido": partido})).fetchone()

        score_max_atual = (await db.execute(text("""
            SELECT COALESCE(MAX(score_ponderado), 0) AS s
            FROM mv_score_municipio
            WHERE municipio_id = :mun AND cargo = :cargo
              AND ano = :ano AND turno = 1
        """), {"mun": mun.id, "cargo": cargo_upper, "ano": ano})).scalar() or 0

        anterior = None
        if ano_anterior:
            anterior = (await db.execute(text("""
                SELECT
                    COALESCE(SUM(n_eleitos), 0)   AS n_eleitos,
                    COALESCE(SUM(total_votos), 0) AS total_votos
                FROM mv_score_municipio
                WHERE municipio_id = :mun AND cargo = :cargo
                  AND ano = :ano_ant AND turno = 1 AND partido_numero = :partido
            """), {"mun": mun.id, "cargo": cargo_upper, "ano_ant": ano_anterior, "partido": partido})).fetchone()

        regiao_meta = {
            "tipo": "municipio",
            "codigo_ibge": mun.codigo_ibge,
            "nome": mun.nome,
            "estado_uf": mun.estado_uf,
        }
    else:
        # Tratado como estado UF
        uf = regiao.upper()
        atual = (await db.execute(text("""
            SELECT
                COALESCE(SUM(n_eleitos), 0)      AS n_eleitos,
                COALESCE(SUM(total_votos), 0)    AS total_votos,
                COALESCE(SUM(score_ponderado), 0) AS score
            FROM mv_score_estado
            WHERE estado_uf = :uf AND cargo = :cargo
              AND ano = :ano AND turno = 1 AND partido_numero = :partido
        """), {"uf": uf, "cargo": cargo_upper, "ano": ano, "partido": partido})).fetchone()

        score_max_atual = (await db.execute(text("""
            SELECT COALESCE(MAX(score_ponderado), 0) AS s
            FROM mv_score_estado
            WHERE estado_uf = :uf AND cargo = :cargo
              AND ano = :ano AND turno = 1
        """), {"uf": uf, "cargo": cargo_upper, "ano": ano})).scalar() or 0

        anterior = None
        if ano_anterior:
            anterior = (await db.execute(text("""
                SELECT
                    COALESCE(SUM(n_eleitos), 0)   AS n_eleitos,
                    COALESCE(SUM(total_votos), 0) AS total_votos
                FROM mv_score_estado
                WHERE estado_uf = :uf AND cargo = :cargo
                  AND ano = :ano_ant AND turno = 1 AND partido_numero = :partido
            """), {"uf": uf, "cargo": cargo_upper, "ano_ant": ano_anterior, "partido": partido})).fetchone()

        regiao_meta = {"tipo": "estado", "estado_uf": uf}

    # Calcula variação
    votos_atual = float(atual.total_votos or 0)
    votos_anterior = float(anterior.total_votos or 0) if anterior else 0.0
    var_pct: float | None = None
    if votos_anterior > 0:
        var_pct = ((votos_atual - votos_anterior) / votos_anterior) * 100.0

    n_eleitos_atual = int(atual.n_eleitos or 0)
    n_eleitos_anterior = int(anterior.n_eleitos or 0) if anterior else 0

    tipo, descricao, acao = _classificar_recomendacao(
        score_atual=float(atual.score or 0),
        score_max_atual=float(score_max_atual),
        var_pct=var_pct,
        n_eleitos_atual=n_eleitos_atual,
        n_eleitos_anterior=n_eleitos_anterior,
    )

    return {
        "regiao":         regiao_meta,
        "partido":        partido,
        "cargo":          cargo_upper,
        "ano":            ano,
        "ano_anterior":   ano_anterior,
        "metricas": {
            "n_eleitos_atual":     n_eleitos_atual,
            "n_eleitos_anterior":  n_eleitos_anterior,
            "votos_atual":         int(votos_atual),
            "votos_anterior":      int(votos_anterior),
            "variacao_pct":        round(var_pct, 2) if var_pct is not None else None,
            "score_ponderado":     int(atual.score or 0),
            "score_max_regiao":    int(score_max_atual),
            "forca_relativa_pct":  round((float(atual.score or 0) / float(score_max_atual) * 100), 1)
                                    if score_max_atual > 0 else 0.0,
        },
        "tipo":           tipo,
        "descricao":      descricao,
        "acao_sugerida":  acao,
    }


# ── Heatmap: pontos com weight=votos para o layer nativo do MapLibre ─────────

_heatmap_cache: dict = {}


@router.get("/heatmap")
async def get_heatmap(
    response: Response,
    ano: int = Query(2024),
    cargo: str = Query("VEREADOR"),
    partido: int | None = Query(None, description="Número TSE. Omitir = todos os partidos"),
    uf: str | None = Query(None, description="Filtrar para um estado. Omitir = Brasil inteiro"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    GeoJSON de PONTOS (centroide de cada município) com `weight` = total de votos.
    Para uso no layer `heatmap` nativo do MapLibre — não retorna polígonos.

    Cacheado em memória por (ano, cargo, partido, uf).
    """
    cargo_upper = cargo.upper().strip()
    uf_upper = uf.upper() if uf else None
    cache_key = f"hm:{ano}:{cargo_upper}:{partido or 'todos'}:{uf_upper or 'BR'}"
    if cache_key in _heatmap_cache:
        response.headers["Cache-Control"] = "private, max-age=300"
        return _heatmap_cache[cache_key]

    # Lê direto da MV de score por município (já agregada).
    where_partido = "AND s.partido_numero = :partido" if partido is not None else ""
    where_uf = "AND s.estado_uf = :uf" if uf_upper else ""
    params: dict = {"ano": ano, "cargo": cargo_upper}
    if partido is not None:
        params["partido"] = partido
    if uf_upper:
        params["uf"] = uf_upper

    result = await db.execute(text(f"""
        SELECT
            s.codigo_ibge,
            s.estado_uf,
            m.nome,
            COALESCE(SUM(s.total_votos), 0) AS votos,
            COALESCE(SUM(s.n_eleitos), 0)   AS eleitos,
            ST_X(ST_PointOnSurface(m.geometry)) AS lng,
            ST_Y(ST_PointOnSurface(m.geometry)) AS lat
        FROM mv_score_municipio s
        JOIN municipios m ON m.id = s.municipio_id
        WHERE s.ano = :ano
          AND s.cargo = :cargo
          AND s.turno = 1
          AND m.geometry IS NOT NULL
          {where_partido}
          {where_uf}
        GROUP BY s.codigo_ibge, s.estado_uf, m.nome, m.geometry
        HAVING COALESCE(SUM(s.total_votos), 0) > 0
    """), params)

    features = []
    for r in result.fetchall():
        if r.lng is None or r.lat is None:
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(r.lng), float(r.lat)]},
            "properties": {
                "codigo_ibge": r.codigo_ibge,
                "estado_uf":   r.estado_uf,
                "nome":        r.nome,
                "weight":      int(r.votos or 0),
                "eleitos":     int(r.eleitos or 0),
            },
        })

    # Normaliza weight para [0, 1] dentro do cohort — facilita o tuning
    # do heatmap layer no frontend.
    if features:
        max_w = max(f["properties"]["weight"] for f in features) or 1
        for f in features:
            f["properties"]["weight_norm"] = round(f["properties"]["weight"] / max_w, 4)

    enriquecer_features_percentil(features, lambda p: float(p.get("weight") or 0))
    resultado = {"type": "FeatureCollection", "features": features}
    _heatmap_cache[cache_key] = resultado
    response.headers["Cache-Control"] = "private, max-age=300"
    return resultado


# ─────────────────────────────────────────────────────────────────────────────
# M9 - Granularidade ESCOLA: detalhe completo de um local de votação.
# Usado pelo PainelEscola.tsx do mapa V1.
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/escola/{local_id}")
async def get_escola_detalhe(
    local_id: int,
    ano: int = Query(2024, description="Ano de referência para os votos"),
    cargo: str = Query("VEREADOR", description="Cargo de referência"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Detalhe completo de uma escola (local de votação) para o painel:
      - Dados do local (nome, bairro, endereço, GPS, eleitores)
      - Top 5 candidatos com mais votos nessa zona no ano/cargo
      - Cabos eleitorais atuando aqui (cabo_escolas) - pode estar vazio
      - Lideranças responsáveis (lideranca_escolas) - pode estar vazio

    Esse endpoint é o coração do "mapeamento de desempenho da equipe":
    quem trabalha aqui, quais resultados teve.
    """
    from fastapi import HTTPException

    # 1. Dados do local de votação
    local = await db.execute(text("""
        SELECT lv.id, lv.nr_zona, lv.nr_local, lv.nome, lv.bairro,
               lv.endereco, lv.cep, lv.latitude, lv.longitude, lv.qt_eleitores,
               m.codigo_ibge, m.nome AS municipio_nome, m.estado_uf
        FROM locais_votacao lv
        JOIN municipios m ON m.id = lv.municipio_id
        WHERE lv.id = :id
    """), {"id": local_id})
    row = local.fetchone()
    if not row:
        raise HTTPException(404, f"Escola {local_id} nao encontrada")

    # 2. Top 5 candidatos com mais votos NESSA ZONA no ano/cargo
    top_candidatos = await db.execute(text("""
        SELECT
            c.id          AS candidato_id,
            c.nome_urna,
            c.foto_url,
            ca.cargo,
            ca.eleito,
            p.numero      AS partido_num,
            p.sigla       AS partido_sigla,
            COALESCE(p.cor_primaria, '#64748B') AS partido_cor,
            COALESCE(SUM(vpz.qt_votos), 0) AS votos_zona
        FROM votos_por_zona vpz
        JOIN candidaturas ca ON ca.id = vpz.candidatura_id
        JOIN candidatos   c  ON c.id  = ca.candidato_id
        JOIN partidos     p  ON p.id  = ca.partido_id
        JOIN zonas_eleitorais ze ON ze.id = vpz.zona_id
        WHERE ze.numero = :nr_zona
          AND vpz.municipio_id = (SELECT id FROM municipios WHERE codigo_ibge = :ibge)
          AND ca.ano = :ano
          AND UPPER(ca.cargo) = :cargo
          AND vpz.turno = 1
        GROUP BY c.id, c.nome_urna, c.foto_url, ca.cargo, ca.eleito,
                 p.numero, p.sigla, p.cor_primaria
        ORDER BY votos_zona DESC
        LIMIT 5
    """), {"nr_zona": row.nr_zona, "ibge": row.codigo_ibge, "ano": ano, "cargo": cargo.upper()})

    top = []
    for r in top_candidatos.fetchall():
        top.append({
            "candidato_id":  int(r.candidato_id),
            "nome_urna":     r.nome_urna,
            "foto_url":      r.foto_url,
            "cargo":         r.cargo,
            "eleito":        bool(r.eleito),
            "partido_num":   int(r.partido_num),
            "partido_sigla": r.partido_sigla,
            "partido_cor":   r.partido_cor,
            "votos_zona":    int(r.votos_zona),
        })

    # 3. Cabos eleitorais atuando nesta escola
    cabos = await db.execute(text("""
        SELECT
            ce.id, ce.nome_completo, ce.nome_guerra, ce.foto_url,
            ce.status, ce.performance, ce.conversao_pct, ce.variacao_pct,
            ce.votos_ciclo_atual, ce.eleitores_area
        FROM cabo_escolas ces
        JOIN cabos_eleitorais ce ON ce.id = ces.cabo_id
        WHERE ces.local_votacao_id = :id
        ORDER BY ce.performance, ce.nome_completo
    """), {"id": local_id})

    cabos_list = []
    for r in cabos.fetchall():
        cabos_list.append({
            "id":               int(r.id),
            "nome_completo":    r.nome_completo,
            "nome_guerra":      r.nome_guerra,
            "foto_url":         r.foto_url,
            "status":           r.status,
            "performance":      r.performance,
            "conversao_pct":    float(r.conversao_pct) if r.conversao_pct else None,
            "variacao_pct":     float(r.variacao_pct) if r.variacao_pct else None,
            "votos_ciclo":      int(r.votos_ciclo_atual) if r.votos_ciclo_atual else None,
            "eleitores_area":   int(r.eleitores_area) if r.eleitores_area else None,
        })

    # 4. Liderancas vinculadas a esta escola
    liderancas = await db.execute(text("""
        SELECT
            l.id, l.nome_completo, l.nome_politico, l.foto_url, l.bairro,
            l.status, l.score_classificacao, l.score_valor
        FROM lideranca_escolas le
        JOIN liderancas l ON l.id = le.lideranca_id
        WHERE le.local_votacao_id = :id
        ORDER BY l.score_classificacao, l.nome_completo
    """), {"id": local_id})

    liderancas_list = []
    for r in liderancas.fetchall():
        liderancas_list.append({
            "id":             int(r.id),
            "nome_completo":  r.nome_completo,
            "nome_politico":  r.nome_politico,
            "foto_url":       r.foto_url,
            "bairro":         r.bairro,
            "status":         r.status,
            "score":          r.score_classificacao,
            "score_valor":    float(r.score_valor) if r.score_valor else None,
        })

    return {
        "local": {
            "id":             int(row.id),
            "nr_zona":        int(row.nr_zona),
            "nr_local":       int(row.nr_local),
            "nome":           row.nome,
            "bairro":         row.bairro,
            "endereco":       row.endereco,
            "cep":            row.cep,
            "latitude":       float(row.latitude),
            "longitude":      float(row.longitude),
            "qt_eleitores":   int(row.qt_eleitores) if row.qt_eleitores else None,
            "municipio_ibge": row.codigo_ibge,
            "municipio_nome": row.municipio_nome,
            "estado_uf":      row.estado_uf,
        },
        "filtro": {
            "ano":   ano,
            "cargo": cargo.upper(),
        },
        "top_candidatos": top,
        "cabos_eleitorais": cabos_list,
        "liderancas":     liderancas_list,
        "totais": {
            "n_cabos":      len(cabos_list),
            "n_liderancas": len(liderancas_list),
        },
    }


# ---------------------------------------------------------------------------
# Setores censitários — granularidade máxima (drill-down abaixo de distrito)
# ---------------------------------------------------------------------------

@router.get("/municipio/{codigo_ibge}/setores")
async def get_municipio_setores(
    codigo_ibge: str,
    cargo: str = Query("VEREADOR"),
    ano: int = Query(2024),
    turno: int = Query(1, description="Turno da eleicao (1 ou 2)"),
    candidato_id: int | None = Query(None),
    candidatura_id: int | None = Query(None),
    partido: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    GeoJSON dos setores censitários de um município com farol eleitoral.
    Cada setor tem ~150-300 domicílios - granularidade máxima.
    Usa spatial join para associar locais de votação aos setores e agregar votos.
    """
    from fastapi import HTTPException

    cd_mun = codigo_ibge.zfill(7)

    mun = await db.execute(text(
        "SELECT id FROM municipios WHERE codigo_ibge = :c"
    ), {"c": cd_mun})
    mun = mun.fetchone()
    if not mun:
        raise HTTPException(404, "Município não encontrado")
    mid = mun.id

    # Resolver candidato_id -> candidatura_id
    if candidato_id and not candidatura_id:
        res = await db.execute(text("""
            SELECT id FROM candidaturas
            WHERE candidato_id = :cid AND ano = :ano AND UPPER(cargo) = :cargo
            ORDER BY id LIMIT 1
        """), {"cid": candidato_id, "ano": ano, "cargo": cargo.upper()})
        row = res.fetchone()
        if row:
            candidatura_id = row.id

    # Filtro de votos conforme contexto (sempre filtra por turno)
    if candidatura_id:
        filtro_votos = "AND vpz.candidatura_id = :cid AND vpz.turno = :turno"
    elif partido:
        filtro_votos = """
            AND vpz.turno = :turno
            AND vpz.candidatura_id IN (
                SELECT ca2.id FROM candidaturas ca2
                JOIN partidos p2 ON p2.id = ca2.partido_id
                WHERE ca2.municipio_id = :mid
                  AND ca2.ano = :ano
                  AND UPPER(ca2.cargo) = :cargo
                  AND p2.numero = :partido
            )
        """
    else:
        filtro_votos = """
            AND vpz.turno = :turno
            AND vpz.candidatura_id IN (
                SELECT id FROM candidaturas
                WHERE municipio_id = :mid AND ano = :ano AND UPPER(cargo) = :cargo
            )
        """

    result = await db.execute(text(f"""
        WITH zona_votos AS (
            SELECT
                ze.numero  AS nr_zona,
                COALESCE(SUM(vpz.qt_votos), 0) AS votos
            FROM zonas_eleitorais ze
            LEFT JOIN votos_por_zona vpz ON vpz.zona_id = ze.id {filtro_votos}
            WHERE ze.municipio_id = :mid
            GROUP BY ze.numero
        ),
        local_setor AS (
            -- Cada local de votacao e atribuido ao setor que o contem
            SELECT
                lv.nr_zona,
                lv.id AS local_id,
                sc.codigo_setor
            FROM locais_votacao lv
            JOIN setores_censitarios sc
              ON ST_Within(
                    ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326),
                    sc.geometry
                 )
            WHERE lv.municipio_id = :mid
              AND sc.codigo_municipio = :cd_mun
              AND lv.latitude  IS NOT NULL
              AND lv.longitude IS NOT NULL
        ),
        setor_agg AS (
            -- Agregar votos por setor (via zonas dos locais naquele setor)
            SELECT
                ls.codigo_setor,
                COALESCE(SUM(zv.votos), 0) AS votos_total
            FROM local_setor ls
            JOIN zona_votos zv ON zv.nr_zona = ls.nr_zona
            GROUP BY ls.codigo_setor
        )
        SELECT
            sc.codigo_setor,
            sc.nome_distrito,
            sc.nome_subdistrito,
            sc.tipo,
            sc.populacao,
            sc.domicilios,
            COALESCE(sa.votos_total, 0) AS votos_total,
            ST_AsGeoJSON(
                ST_SimplifyPreserveTopology(sc.geometry, 0.0003), 6
            )::json AS geom
        FROM setores_censitarios sc
        LEFT JOIN setor_agg sa ON sa.codigo_setor = sc.codigo_setor
        WHERE sc.codigo_municipio = :cd_mun
          AND sc.geometry IS NOT NULL
        ORDER BY votos_total DESC
    """), {
        "mid": mid, "cd_mun": cd_mun, "cid": candidatura_id,
        "ano": ano, "cargo": cargo.upper(), "partido": partido, "turno": turno,
    })

    rows = result.fetchall()

    if not rows:
        return {
            "type": "FeatureCollection",
            "features": [],
            "total_setores": 0,
        }

    # Percentis para farol relativo
    votos_list = [int(r.votos_total) for r in rows]
    com_voto = sorted(v for v in votos_list if v > 0)
    p33 = com_voto[int(len(com_voto) * 0.33)] if com_voto else 0
    p66 = com_voto[int(len(com_voto) * 0.66)] if com_voto else 0

    features = []
    for r in rows:
        if not r.geom:
            continue
        votos = int(r.votos_total)
        features.append({
            "type": "Feature",
            "geometry": r.geom,
            "properties": {
                "codigo_setor":    r.codigo_setor,
                "nome_distrito":   r.nome_distrito,
                "nome_subdistrito": r.nome_subdistrito,
                "tipo":            r.tipo,
                "populacao":       r.populacao,
                "domicilios":      r.domicilios,
                "votos":           votos,
                "farol":           _farol_from_percentis(votos, p33, p66),
            },
        })

    enriquecer_features_percentil(features, SCORE_FNS["votos"])

    return {
        "type": "FeatureCollection",
        "features": features,
        "total_setores": len(features),
        "p33": p33,
        "p66": p66,
    }


@router.get("/municipio/{codigo_ibge}/distrito/{nome_distrito}/setores")
async def get_distrito_setores(
    codigo_ibge: str,
    nome_distrito: str,
    cargo: str = Query("VEREADOR"),
    ano: int = Query(2024),
    turno: int = Query(1, description="Turno da eleicao (1 ou 2)"),
    candidato_id: int | None = Query(None),
    partido: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Setores censitarios dentro de um distrito especifico.
    Usado para navegacao granular: municipio → distrito → setores.
    Muito mais leve que carregar todos os setores do municipio.
    """
    cd_mun = codigo_ibge.zfill(7)

    mun = await db.execute(text("SELECT id FROM municipios WHERE codigo_ibge = :c"), {"c": cd_mun})
    mun = mun.fetchone()
    if not mun:
        from fastapi import HTTPException
        raise HTTPException(404, "Municipio nao encontrado")
    mid = mun.id

    # Resolver candidato_id -> candidatura_id
    candidatura_id = None
    if candidato_id:
        res = await db.execute(text("""
            SELECT id FROM candidaturas
            WHERE candidato_id = :cid AND ano = :ano AND UPPER(cargo) = :cargo
            ORDER BY id LIMIT 1
        """), {"cid": candidato_id, "ano": ano, "cargo": cargo.upper()})
        row = res.fetchone()
        if row:
            candidatura_id = row.id

    if candidatura_id:
        filtro_votos = "AND vpz.candidatura_id = :cid AND vpz.turno = :turno"
    elif partido:
        filtro_votos = f"""
            AND vpz.turno = :turno
            AND vpz.candidatura_id IN (
                SELECT ca2.id FROM candidaturas ca2
                JOIN partidos p2 ON p2.id = ca2.partido_id
                WHERE ca2.municipio_id = :mid AND ca2.ano = :ano
                  AND UPPER(ca2.cargo) = :cargo AND p2.numero = :partido
            )
        """
    else:
        filtro_votos = """
            AND vpz.turno = :turno
            AND vpz.candidatura_id IN (
                SELECT id FROM candidaturas
                WHERE municipio_id = :mid AND ano = :ano AND UPPER(cargo) = :cargo
            )
        """

    # Rateio proporcional por # locais (fix 13/04): evita que um setor com
    # poucos locais de uma zona multicoberta pegue 100% dos votos.
    result = await db.execute(text(f"""
        WITH zona_votos AS (
            SELECT ze.numero AS nr_zona, COALESCE(SUM(vpz.qt_votos), 0) AS votos
            FROM zonas_eleitorais ze
            LEFT JOIN votos_por_zona vpz ON vpz.zona_id = ze.id {filtro_votos}
            WHERE ze.municipio_id = :mid
            GROUP BY ze.numero
        ),
        -- N locais por (zona, setor) dentro do distrito alvo
        local_setor_n AS (
            SELECT lv.nr_zona, sc.codigo_setor, COUNT(*) AS n_locais
            FROM locais_votacao lv
            JOIN setores_censitarios sc
              ON ST_Within(ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326), sc.geometry)
            WHERE lv.municipio_id = :mid
              AND sc.codigo_municipio = :cd_mun
              AND sc.nome_distrito = :nome_dist
              AND lv.latitude IS NOT NULL AND lv.longitude IS NOT NULL
            GROUP BY lv.nr_zona, sc.codigo_setor
        ),
        -- Total de locais da zona no MUNICIPIO inteiro (nao so distrito)
        -- para saber que fracao dos votos da zona cai neste distrito.
        zona_total_locais AS (
            SELECT lv.nr_zona, COUNT(*) AS total_locais
            FROM locais_votacao lv
            WHERE lv.municipio_id = :mid
              AND lv.latitude IS NOT NULL AND lv.longitude IS NOT NULL
            GROUP BY lv.nr_zona
        ),
        setor_agg AS (
            SELECT ls.codigo_setor,
                   SUM(zv.votos * ls.n_locais::float / NULLIF(ztl.total_locais, 0)) AS votos_total
            FROM local_setor_n ls
            JOIN zona_total_locais ztl ON ztl.nr_zona = ls.nr_zona
            JOIN zona_votos         zv ON zv.nr_zona  = ls.nr_zona
            GROUP BY ls.codigo_setor
        )
        SELECT
            sc.codigo_setor, sc.nome_distrito, sc.nome_subdistrito, sc.tipo,
            sc.populacao, sc.domicilios,
            COALESCE(sa.votos_total, 0) AS votos_total,
            ST_AsGeoJSON(ST_SimplifyPreserveTopology(sc.geometry, 0.0001), 6)::json AS geom
        FROM setores_censitarios sc
        LEFT JOIN setor_agg sa ON sa.codigo_setor = sc.codigo_setor
        WHERE sc.codigo_municipio = :cd_mun
          AND sc.nome_distrito = :nome_dist
          AND sc.geometry IS NOT NULL
        ORDER BY votos_total DESC
    """), {
        "mid": mid, "cd_mun": cd_mun, "cid": candidatura_id,
        "ano": ano, "cargo": cargo.upper(), "partido": partido,
        "nome_dist": nome_distrito, "turno": turno,
    })

    rows = result.fetchall()
    votos_list = [int(r.votos_total) for r in rows]
    com_voto = sorted(v for v in votos_list if v > 0)
    p33 = com_voto[int(len(com_voto) * 0.33)] if com_voto else 0
    p66 = com_voto[int(len(com_voto) * 0.66)] if com_voto else 0

    features = []
    for r in rows:
        if not r.geom:
            continue
        votos = int(r.votos_total)
        features.append({
            "type": "Feature",
            "geometry": r.geom,
            "properties": {
                "codigo_setor":    r.codigo_setor,
                "nome_distrito":   r.nome_distrito,
                "nome_subdistrito": r.nome_subdistrito,
                "tipo":            r.tipo,
                "populacao":       r.populacao,
                "domicilios":      r.domicilios,
                "votos":           votos,
                "farol":           _farol_from_percentis(votos, p33, p66),
            },
        })

    enriquecer_features_percentil(features, SCORE_FNS["votos"])

    return {
        "type": "FeatureCollection",
        "features": features,
        "distrito": nome_distrito,
        "total_setores": len(features),
    }


async def _microregioes_da_tabela(
    db: AsyncSession,
    municipio_id: int,
    cd_mun: str,
    dentro_de_distrito: str | None,
    cargo: str | None,
    ano: int | None,
    turno: int,
    candidato_id: int | None,
    partido: int | None,
) -> list[dict]:
    """Lê microregioes pre-calculadas da tabela e agrega votos sob demanda."""
    agrega = cargo is not None and ano is not None
    cargo_upper = cargo.upper().strip() if cargo else None

    # Filtro de votos (mesmo padrao dos outros endpoints).
    candidatura_id = None
    if agrega:
        if candidato_id:
            res = await db.execute(text(
                "SELECT id FROM candidaturas WHERE candidato_id = :cid "
                "AND ano = :ano AND UPPER(cargo) = :cargo ORDER BY id LIMIT 1"
            ), {"cid": candidato_id, "ano": ano, "cargo": cargo_upper})
            row = res.fetchone()
            candidatura_id = row.id if row else -1
            filtro_v = "AND vpz.candidatura_id = :cid_candidatura AND vpz.turno = :turno"
        elif partido:
            filtro_v = """
                AND vpz.turno = :turno
                AND vpz.candidatura_id IN (
                    SELECT ca2.id FROM candidaturas ca2
                    JOIN partidos p2 ON p2.id = ca2.partido_id
                    WHERE ca2.ano = :ano AND UPPER(ca2.cargo) = :cargo
                      AND p2.numero = :partido
                )
            """
        else:
            filtro_v = """
                AND vpz.turno = :turno
                AND vpz.candidatura_id IN (
                    SELECT id FROM candidaturas
                    WHERE ano = :ano AND UPPER(cargo) = :cargo
                )
            """
    else:
        filtro_v = ""

    # Filtro por distrito IBGE (cascata distrito -> microregiao).
    # SRID: microregioes=4674, distritos=4326 → ST_Transform na fly.
    filtro_dist = ""
    if dentro_de_distrito:
        filtro_dist = """
            AND EXISTS (
                SELECT 1 FROM distritos_municipio dm
                WHERE dm.cd_mun = :cd_mun AND dm.cd_dist = :cd_dist
                  AND ST_Intersects(ST_Transform(mr.geometry, 4326), dm.geometry)
            )
        """

    # Agregacao de votos por microregiao, agora COM COBERTURA ELETORAL
    # (tabela microregiao_escola_cobertura - ETL 28, reflexao Cesar+GPT
    # 13/04/2026). Microzona nunca fica "sem dado": toda microzona que
    # tem cobertura recebe votos (direta ou ponderada por escolas vizinhas).
    #
    # Formula:
    #   votos_na_microzona = SUM(
    #     cobertura.peso * (votos_da_escola_na_zona *
    #                        n_locais_escola_na_zona / total_locais_da_zona)
    #   )
    #
    # Onde `n_locais_escola_na_zona` eh sempre 1 (1 escola = 1 linha). A
    # distribuicao zona->local continua sendo feita proporcionalmente pela
    # contagem total de locais que a zona atende no municipio.
    cte_votos = ""
    join_votos_sel = "0::float AS votos, NULL::int AS partido_dominante_num, NULL::int AS candidato_dominante_id"
    join_votos_from = ""
    if agrega:
        cte_votos = f"""
            , zona_total AS (
                SELECT nr_zona, COUNT(*) AS total_locais
                FROM locais_votacao
                WHERE municipio_id = :mid AND nr_zona IS NOT NULL
                GROUP BY nr_zona
            ),
            votos_mr_partido_candidato AS (
                SELECT cob.microregiao_id AS mid,
                       p.numero AS partido_num,
                       ca.candidato_id,
                       SUM(
                         cob.peso *
                         (vpz.qt_votos::float / NULLIF(zt.total_locais, 0))
                       ) AS votos
                FROM microregiao_escola_cobertura cob
                JOIN locais_votacao     lv  ON lv.id = cob.local_votacao_id
                JOIN zona_total         zt  ON zt.nr_zona = lv.nr_zona
                JOIN zonas_eleitorais   ze  ON ze.numero = lv.nr_zona
                                           AND ze.municipio_id = :mid
                JOIN votos_por_zona     vpz ON vpz.zona_id = ze.id {filtro_v}
                JOIN candidaturas       ca  ON ca.id = vpz.candidatura_id
                JOIN partidos           p   ON p.id = ca.partido_id
                GROUP BY cob.microregiao_id, p.numero, ca.candidato_id
            ),
            votos_mr_partido AS (
                SELECT mid, partido_num, SUM(votos) AS votos_partido
                FROM votos_mr_partido_candidato GROUP BY mid, partido_num
            ),
            partido_dominante AS (
                SELECT mid, partido_num AS partido_dominante_num
                FROM (
                    SELECT mid, partido_num, votos_partido,
                           ROW_NUMBER() OVER (PARTITION BY mid ORDER BY votos_partido DESC) AS rn
                    FROM votos_mr_partido
                ) t WHERE rn = 1
            ),
            candidato_dominante AS (
                SELECT mid, candidato_id AS candidato_dominante_id
                FROM (
                    SELECT mid, candidato_id, votos,
                           ROW_NUMBER() OVER (PARTITION BY mid ORDER BY votos DESC) AS rn
                    FROM votos_mr_partido_candidato
                ) t WHERE rn = 1
            ),
            votos_microregiao AS (
                SELECT mid, SUM(votos_partido) AS votos FROM votos_mr_partido GROUP BY mid
            )
        """
        join_votos_sel = (
            "COALESCE(vb.votos, 0) AS votos, "
            "pd.partido_dominante_num, "
            "cd.candidato_dominante_id"
        )
        join_votos_from = """
            LEFT JOIN votos_microregiao   vb ON vb.mid = mr.id
            LEFT JOIN partido_dominante   pd ON pd.mid = mr.id
            LEFT JOIN candidato_dominante cd ON cd.mid = mr.id
        """

    sql = f"""
        WITH ignored AS (SELECT 1)
        {cte_votos}
        SELECT mr.id, mr.nome, mr.nome_padronizado, mr.nivel,
               mr.area_km2, mr.n_setores, mr.populacao, mr.osm_ref_id, mr.origem,
               mr.tipo_cobertura_dominante, mr.n_escolas_cobertura,
               ST_AsGeoJSON(mr.geometry, 6)::json AS geom,
               ST_Y(ST_Centroid(mr.geometry)) AS lat,
               ST_X(ST_Centroid(mr.geometry)) AS lng,
               {join_votos_sel}
        FROM microregioes mr
        {join_votos_from}
        WHERE mr.municipio_id = :mid
          {filtro_dist}
        ORDER BY mr.n_setores DESC, mr.nome
    """

    params: dict = {
        "mid": municipio_id, "cd_mun": cd_mun,
        "cd_dist": dentro_de_distrito,
        "ano": ano, "cargo": cargo_upper, "turno": turno,
        "partido": partido, "cid_candidatura": candidatura_id,
    }
    result = await db.execute(text(sql), params)
    rows = result.fetchall()

    features = []
    for r in rows:
        votos_val = float(r.votos or 0)
        features.append({
            "id":                 r.id,
            "nome":               r.nome,
            "nome_padronizado":   r.nome_padronizado,
            "nivel":              r.nivel,
            "tipo":               r.origem,           # mantem chave 'tipo' p/ compat front
            "populacao":          r.populacao,
            "quantidade_setores": r.n_setores,
            "area_km2":           float(r.area_km2) if r.area_km2 is not None else None,
            "geometry":           r.geom,
            "latitude":           float(r.lat) if r.lat is not None else None,
            "longitude":          float(r.lng) if r.lng is not None else None,
            "votos":              int(votos_val),
            "partido_dominante_num":   getattr(r, "partido_dominante_num", None),
            "candidato_dominante_id":  getattr(r, "candidato_dominante_id", None),
            "tipo_cobertura":          r.tipo_cobertura_dominante,
            "n_escolas_cobertura":     r.n_escolas_cobertura,
        })

    # Calcula nivel_farol por percentil dos votos (igual ao endpoint legado).
    if agrega and features:
        valores = sorted([f["votos"] for f in features if f["votos"] > 0])
        n = len(valores)
        if n > 0:
            p10 = valores[int(n * 0.10)] if n >= 10 else valores[0]
            p25 = valores[int(n * 0.25)] if n >= 4 else valores[0]
            p50 = valores[int(n * 0.50)] if n >= 2 else valores[0]
            p75 = valores[int(n * 0.75)] if n >= 4 else valores[-1]
            p90 = valores[int(n * 0.90)] if n >= 10 else valores[-1]
            for f in features:
                v = f["votos"]
                if v <= 0:
                    f["nivel_farol"] = 0
                elif v >= p90:
                    f["nivel_farol"] = 5
                elif v >= p75:
                    f["nivel_farol"] = 4
                elif v >= p50:
                    f["nivel_farol"] = 3
                elif v >= p25:
                    f["nivel_farol"] = 2
                else:
                    f["nivel_farol"] = 1
        else:
            for f in features:
                f["nivel_farol"] = 0
    else:
        for f in features:
            f["nivel_farol"] = 0

    return features


@router.get("/municipio/{codigo_ibge}/microregioes_bordas")
async def get_microregioes_bordas(
    codigo_ibge: str,
    distrito: str | None = Query(None, description="cd_dist do distrito IBGE — opcional"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Retorna as bordas dissolvidas das microregioes (sem duplicacao
    visual quando 2 microregioes vizinhas compartilham fronteira).

    Tabela materializada `microregioes_bordas` populada via ETL 22.
    Estilo Positron: linha unica para cada borda compartilhada.
    """
    cd_mun = codigo_ibge.zfill(7)
    mun = await db.execute(
        text("SELECT id FROM municipios WHERE codigo_ibge = :c"),
        {"c": cd_mun},
    )
    mun = mun.fetchone()
    if not mun:
        from fastapi import HTTPException
        raise HTTPException(404, "Municipio nao encontrado")

    where = f"municipio_id = {mun.id}"
    if distrito:
        where += f" AND distrito_cd = '{distrito}'"
    else:
        where += " AND distrito_cd IS NULL"

    result = await db.execute(text(f"""
        SELECT ST_AsGeoJSON(geometry, 6)::json AS geom, n_segmentos
        FROM microregioes_bordas WHERE {where}
        LIMIT 1
    """))
    row = result.fetchone()
    if not row:
        return {"type": "FeatureCollection", "features": []}

    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": row.geom,
            "properties": {"n_segmentos": row.n_segmentos},
        }],
    }


@router.get("/municipio/{codigo_ibge}/microregioes")
async def get_microregioes(
    codigo_ibge: str,
    tipo: str | None = Query(None, description="LEGADO/ignorado — microregioes agora tem nivel unico"),
    poligono: bool = Query(True, description="LEGADO/ignorado — sempre poligono"),
    dentro_de_distrito: str | None = Query(None, description="Filtra microzonas que tocam o poligono do distrito IBGE (cd_dist)."),
    cargo: str | None = Query(None, description="Cargo para agregar votos (ex: GOVERNADOR)"),
    ano: int | None = Query(None),
    turno: int = Query(1),
    candidato_id: int | None = Query(None),
    partido: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """
    Lista micro-regioes (OpenStreetMap) de um municipio com setores IBGE vinculados.

    Ex: Pirituba (SP) retorna Jardim Iris, Taipas, Morro Grande, Vila Iara, etc.
    Cada micro-regiao tem os setores censitarios IBGE que a compoem (via spatial join).

    Quando `poligono=true` (default, item P-A2 do plano mestre), devolve o
    poligono construido via ST_Union dos setores censitarios vinculados a
    cada bairro. Isso substitui o pin/ponto OSM por uma demarcacao real.
    Casos em que a uniao falha (bairro sem setores ativos) caem no fallback
    da geometria original do OSM.

    Quando `dentro_de_distrito` e passado (Ponto 4 do plano 13/04), filtra
    apenas microzonas cujo centroide esta dentro do poligono do distrito
    IBGE. Implementa a cascata Cidade -> Distrito -> Micro-regiao do iFood.
    """
    cd_mun = codigo_ibge.zfill(7)
    mun = await db.execute(text("SELECT id FROM municipios WHERE codigo_ibge = :c"), {"c": cd_mun})
    mun = mun.fetchone()
    if not mun:
        from fastapi import HTTPException
        raise HTTPException(404, "Municipio nao encontrado")

    # Verifica se existe microregioes pre-calculadas (ETL 14_microregioes.py).
    # Se sim, usa elas (modelagem solida sem sobreposicao).
    # Senao, cai no modo legado (ST_Union em runtime — para municipios cujo
    # ETL ainda nao rodou).
    pre = await db.execute(text(
        "SELECT COUNT(*) AS n FROM microregioes WHERE municipio_id = :mid"
    ), {"mid": mun.id})
    usar_tabela = pre.fetchone().n > 0

    if usar_tabela:
        return await _microregioes_da_tabela(
            db, mun.id, cd_mun, dentro_de_distrito,
            cargo, ano, turno, candidato_id, partido,
        )

    # ─── MODO LEGADO (municipio sem ETL ainda) ───
    filtro_tipo = "AND bo.tipo = :tipo" if tipo else ""
    # Filtro pelo poligono do distrito (cascata distrito -> microzona).
    # Passos 2 e 3 do plano Cesar (13/04):
    #   PRIMARIO: ST_Intersects(bo.geometry, dm.geometry) — pega bairros
    #     cuja geometria toca o distrito (inclusive parcialmente em
    #     sub-distritos fronteiricos). Funciona tanto para Point quanto
    #     para Polygon OSM.
    #   FALLBACK: ST_Contains(dm.geometry, ST_Centroid(bo.geometry)) —
    #     dispara quando ST_Intersects falha (ex: geometria invalida).
    filtro_distrito = (
        "AND EXISTS (SELECT 1 FROM distritos_municipio dm "
        "WHERE dm.cd_mun = :cd_mun AND dm.cd_dist = :cd_dist "
        "AND (ST_Intersects(bo.geometry, dm.geometry) "
        "     OR ST_Contains(dm.geometry, ST_Centroid(bo.geometry))))"
        if dentro_de_distrito else ""
    )

    # Agrega votos por microzona via setores -> locais -> zonas. Se cargo/ano
    # nao sao passados, retorna votos=0 (so demarcacao, sem gradiente).
    agrega_votos = cargo is not None and ano is not None
    if agrega_votos:
        cargo_upper = cargo.upper().strip()
        # Filtro de votos (replica padrao dos outros endpoints)
        if candidato_id:
            # Resolve candidato_id -> candidatura_id no ano/cargo
            res = await db.execute(text(
                "SELECT id FROM candidaturas WHERE candidato_id = :cid "
                "AND ano = :ano AND UPPER(cargo) = :cargo ORDER BY id LIMIT 1"
            ), {"cid": candidato_id, "ano": ano, "cargo": cargo_upper})
            row = res.fetchone()
            candidatura_id = row.id if row else -1
            filtro_votos = "AND vpz.candidatura_id = :cid_candidatura AND vpz.turno = :turno"
        elif partido:
            candidatura_id = None
            filtro_votos = """
                AND vpz.turno = :turno
                AND vpz.candidatura_id IN (
                    SELECT ca2.id FROM candidaturas ca2
                    JOIN partidos p2 ON p2.id = ca2.partido_id
                    WHERE ca2.ano = :ano AND UPPER(ca2.cargo) = :cargo
                      AND p2.numero = :partido
                )
            """
        else:
            candidatura_id = None
            filtro_votos = """
                AND vpz.turno = :turno
                AND vpz.candidatura_id IN (
                    SELECT id FROM candidaturas
                    WHERE ano = :ano AND UPPER(cargo) = :cargo
                )
            """
    else:
        candidatura_id = None
        filtro_votos = ""

    # Geometria final: sempre ST_Union dos setores (poligono) ou OSM fallback.
    # ST_SimplifyPreserveTopology suaviza a geometria (remove vertices redundantes
    # das bordas internas dos setores agregados — elimina "linhas internas" que
    # poluem visualmente).
    geom_expr = "ST_SimplifyPreserveTopology(COALESCE(u.geom_union, b.geom_osm), 0.0001)"

    # CTE de votos agregados — so se cargo/ano passados.
    cte_votos = ""
    join_votos = ""
    select_votos = "0 AS votos"
    if agrega_votos:
        # bairro -> setores -> locais -> zonas -> votos (com rateio proporcional
        # de locais multi-setor). Ver Ponto 4 do plano mestre.
        cte_votos = f"""
            , bairro_setor_local AS (
                SELECT b.id AS bairro_id, lv.nr_zona, COUNT(*) AS n_locais
                FROM bairros b
                JOIN setores_censitarios sc ON sc.codigo_setor = ANY(b.setores_ibge)
                JOIN locais_votacao lv
                  ON lv.municipio_id = :mid
                 AND lv.latitude IS NOT NULL AND lv.longitude IS NOT NULL
                 AND ST_Within(ST_SetSRID(ST_MakePoint(lv.longitude, lv.latitude), 4326), sc.geometry)
                GROUP BY b.id, lv.nr_zona
            ),
            zona_total AS (
                SELECT nr_zona, SUM(n_locais) AS total FROM bairro_setor_local GROUP BY nr_zona
            ),
            votos_bairro AS (
                SELECT bsl.bairro_id,
                       SUM(vpz.qt_votos * bsl.n_locais::float / NULLIF(zt.total, 0)) AS votos
                FROM bairro_setor_local bsl
                JOIN zona_total       zt  ON zt.nr_zona = bsl.nr_zona
                JOIN zonas_eleitorais ze  ON ze.numero = bsl.nr_zona AND ze.municipio_id = :mid
                JOIN votos_por_zona   vpz ON vpz.zona_id = ze.id {filtro_votos}
                GROUP BY bsl.bairro_id
            )
        """
        join_votos = "LEFT JOIN votos_bairro vb ON vb.bairro_id = b.id"
        select_votos = "COALESCE(vb.votos, 0) AS votos"

    sql = f"""
        WITH bairros AS (
            SELECT bo.id, bo.osm_id, bo.osm_type, bo.nome, bo.tipo, bo.populacao,
                   bo.setores_ibge, bo.geometry AS geom_osm
            FROM bairros_osm bo
            WHERE bo.municipio_id = :mid
              AND COALESCE(array_length(bo.setores_ibge, 1), 0) > 0
              {filtro_tipo}
              {filtro_distrito}
        ),
        unidos AS (
            SELECT b.id,
                   ST_Multi(ST_Union(sc.geometry)) AS geom_union
            FROM bairros b
            LEFT JOIN setores_censitarios sc
              ON sc.codigo_setor = ANY(b.setores_ibge)
            GROUP BY b.id
        )
        {cte_votos}
        SELECT b.id, b.osm_id, b.osm_type, b.nome, b.tipo, b.populacao,
               COALESCE(array_length(b.setores_ibge, 1), 0) AS quantidade_setores,
               ST_AsGeoJSON({geom_expr if poligono else "b.geom_osm"})::json AS geom,
               ST_Y(ST_Centroid(COALESCE(u.geom_union, b.geom_osm))) AS lat,
               ST_X(ST_Centroid(COALESCE(u.geom_union, b.geom_osm))) AS lng,
               {select_votos}
        FROM bairros b
        LEFT JOIN unidos u ON u.id = b.id
        {join_votos}
        ORDER BY quantidade_setores DESC, b.nome
    """

    params: dict = {
        "mid": mun.id, "tipo": tipo,
        "cd_mun": cd_mun, "cd_dist": dentro_de_distrito,
        "ano": ano, "cargo": cargo_upper if agrega_votos else None,
        "turno": turno, "partido": partido,
        "cid_candidatura": candidatura_id,
    }
    result = await db.execute(text(sql), params)

    features = []
    for r in result.fetchall():
        votos_val = int(r.votos or 0) if hasattr(r, "votos") else 0
        features.append({
            "id":                  r.id,
            "osm_id":              r.osm_id,
            "osm_type":            r.osm_type,
            "nome":                r.nome,
            "tipo":                r.tipo,
            "populacao":           r.populacao,
            "quantidade_setores":  r.quantidade_setores,
            "geometry":            r.geom,
            "latitude":            float(r.lat) if r.lat is not None else None,
            "longitude":           float(r.lng) if r.lng is not None else None,
            "votos":               votos_val,
        })

    # Calculo inline de nivel_farol por percentil (0=ausente, 1-5=gradiente).
    # Assim cada microzona ganha a mesma escala 5-0 dos distritos.
    if agrega_votos and features:
        valores = sorted([f["votos"] for f in features if f["votos"] > 0])
        n = len(valores)
        if n > 0:
            p10 = valores[int(n * 0.10)] if n >= 10 else valores[0]
            p25 = valores[int(n * 0.25)] if n >= 4 else valores[0]
            p50 = valores[int(n * 0.50)] if n >= 2 else valores[0]
            p75 = valores[int(n * 0.75)] if n >= 4 else valores[-1]
            p90 = valores[int(n * 0.90)] if n >= 10 else valores[-1]
            for f in features:
                v = f["votos"]
                if v <= 0:
                    f["nivel_farol"] = 0
                elif v >= p90:
                    f["nivel_farol"] = 5
                elif v >= p75:
                    f["nivel_farol"] = 4
                elif v >= p50:
                    f["nivel_farol"] = 3
                elif v >= p25:
                    f["nivel_farol"] = 2
                else:
                    f["nivel_farol"] = 1
        else:
            for f in features:
                f["nivel_farol"] = 0
    else:
        for f in features:
            f["nivel_farol"] = 0

    return features


# ═════════════════════════════════════════════════════════════════════════
# Edicao manual de microzona (Cesar edita, sistema aprende o padrao)
# ═════════════════════════════════════════════════════════════════════════

from pydantic import BaseModel, Field


class EditarGeometriaInput(BaseModel):
    """Nova geometria em GeoJSON (Polygon ou MultiPolygon)."""
    geometry: dict = Field(..., description="GeoJSON Polygon/MultiPolygon")
    motivo: str | None = Field(None, max_length=200)


@router.patch("/microregiao/{microregiao_id}/geometry")
async def editar_microregiao_geometry(
    microregiao_id: int,
    body: EditarGeometriaInput,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(requer_presidente),
):
    """
    Aceita nova geometria da microzona, grava snapshot antes+depois em
    microregiao_edicoes_manuais, e faz UPDATE de microregioes.geometry.

    Respeita freeze: microzona congelada nao pode ser editada.
    Grava diff para analise posterior (o sistema aprende o padrao
    das correcoes feitas pelo usuario).
    """
    import json
    from fastapi import HTTPException

    # 1. Validar existencia + nao-congelada
    mr = await db.execute(text(
        "SELECT id, nome, congelada_em, versao, ST_AsEWKT(geometry) AS geom_ewkt, "
        "ST_NPoints(geometry) AS n_vert, ST_Area(geometry::geography) AS area_m2 "
        "FROM microregioes WHERE id = :mid"
    ), {"mid": microregiao_id})
    mr = mr.fetchone()
    if not mr:
        raise HTTPException(404, "Microzona nao encontrada")
    # Congelamento protege dos ETLs automaticos, mas edicao manual sempre
    # pode sobrescrever - o usuario sabe o que esta fazendo.

    # 2. Aceita geometria e corrige internamente.
    # ST_MakeValid resolve auto-intersecao; ST_CollectionExtract(3) pega so
    # poligonos se virou GeometryCollection. Rejeita so se ficar vazia.
    geom_json = json.dumps(body.geometry)
    result = await db.execute(text("""
        SELECT
            ST_AsEWKT(ST_Multi(ST_SetSRID(
                ST_CollectionExtract(ST_MakeValid(ST_GeomFromGeoJSON(:g)), 3),
                4674
            ))) AS geom_ewkt,
            ST_NPoints(ST_CollectionExtract(ST_MakeValid(ST_GeomFromGeoJSON(:g)), 3)) AS n_vert,
            ST_Area(ST_CollectionExtract(ST_MakeValid(ST_GeomFromGeoJSON(:g)), 3)::geography) AS area_m2,
            ST_IsEmpty(ST_CollectionExtract(ST_MakeValid(ST_GeomFromGeoJSON(:g)), 3)) AS vazia
    """), {"g": geom_json})
    nova = result.fetchone()
    if not nova or nova.vazia or nova.area_m2 < 1:
        raise HTTPException(400, "Geometria vazia apos correcao")

    # Guard contra perda acidental de area (ex: auto-intersecao severa fez
    # ST_CollectionExtract descartar grande pedaço). Cesar 14/04 13h:
    # edicao em Parelheiros perdeu 618ha silenciosamente.
    pct_perdido = 100.0 * (mr.area_m2 - nova.area_m2) / mr.area_m2 if mr.area_m2 > 0 else 0
    if pct_perdido > 25.0:
        raise HTTPException(
            400,
            f"Edicao reduziu area em {pct_perdido:.1f}% ({mr.area_m2/10000:.0f}ha -> {nova.area_m2/10000:.0f}ha). "
            "Perda grande - se for intencional (cortar parte), tente dividir em 2 edicoes. "
            "Possivel auto-intersecao se nao for intencional."
        )

    # 3. Gravar log da edicao (snapshot antes + depois pra analise)
    await db.execute(text("""
        INSERT INTO microregiao_edicoes_manuais (
            microregiao_id, usuario_id,
            geometry_antes, geometry_depois,
            n_vertices_antes, n_vertices_depois,
            area_antes_m2, area_depois_m2, diff_area_m2,
            motivo
        ) VALUES (
            :mid, :uid,
            :g_antes, :g_depois,
            :n_antes, :n_depois,
            :a_antes, :a_depois, :diff,
            :motivo
        )
    """), {
        "mid": microregiao_id, "uid": usuario.id,
        "g_antes": mr.geom_ewkt, "g_depois": nova.geom_ewkt,
        "n_antes": mr.n_vert, "n_depois": nova.n_vert,
        "a_antes": mr.area_m2, "a_depois": nova.area_m2,
        "diff": nova.area_m2 - mr.area_m2,
        "motivo": body.motivo,
    })

    # 4. UPDATE microzona + incrementar versao + atualizar hash
    # origem: sempre 'manual_edit' (simples, evita overflow do VARCHAR(30)
    # em edicoes repetidas). Historico fica em microregiao_edicoes_manuais.
    # Usa diretamente a geometria ja validada (nova.geom_ewkt) - evita
    # re-executar ST_MakeValid que pode dar GeometryCollection.
    await db.execute(text("""
        UPDATE microregioes SET
            geometry = ST_GeomFromEWKT(:ewkt),
            area_km2 = ROUND((:area / 1000000.0)::numeric, 3),
            versao = versao + 1,
            hash_geometria = md5(ST_AsText(ST_GeomFromEWKT(:ewkt))),
            atualizado_em = now(),
            origem = 'manual_edit'
        WHERE id = :mid
    """), {"ewkt": nova.geom_ewkt, "area": nova.area_m2, "mid": microregiao_id})

    # 5. Gravar linha em microregioes_audit
    await db.execute(text("""
        INSERT INTO microregioes_audit
            (microregiao_id, versao, hash_geometria, motivo, usuario_id)
        SELECT mr.id, mr.versao, mr.hash_geometria, 'edicao_manual', :uid
        FROM microregioes mr WHERE mr.id = :mid
    """), {"mid": microregiao_id, "uid": usuario.id})

    # 6. Regenerar bordas dissolvidas do distrito.
    # Sem isso, o frontend renderiza outline antigo sobre fill novo
    # (Cesar 14/04: "demarcacao sumiu do mapa" em Jardim da Saude).
    dist_info = await db.execute(text("""
        SELECT municipio_id, distrito_cd FROM microregioes WHERE id = :mid
    """), {"mid": microregiao_id})
    dist_info = dist_info.fetchone()

    if dist_info and dist_info.distrito_cd:
        # Cast explicito de :distrito_cd pra varchar pra evitar asyncpg
        # AmbiguousParameterError (text vs character varying).
        await db.execute(text("""
            DELETE FROM microregioes_bordas
            WHERE municipio_id = :municipio_id
              AND distrito_cd = CAST(:distrito_cd AS varchar)
        """), {"municipio_id": dist_info.municipio_id,
               "distrito_cd": dist_info.distrito_cd})
        await db.execute(text("""
            INSERT INTO microregioes_bordas (municipio_id, distrito_cd, geometry, n_segmentos)
            SELECT :municipio_id, CAST(:distrito_cd AS varchar),
                   ST_Multi(ST_LineMerge(ST_SnapToGrid(
                       ST_Union(ST_SnapToGrid(ST_Boundary(geometry), 0.000001)),
                       0.000001
                   ))),
                   COUNT(*)
            FROM microregioes
            WHERE municipio_id = :municipio_id
              AND distrito_cd = CAST(:distrito_cd AS varchar)
        """), {"municipio_id": dist_info.municipio_id,
               "distrito_cd": dist_info.distrito_cd})

    await db.commit()

    return {
        "ok": True,
        "microregiao_id": microregiao_id,
        "n_vertices_antes": mr.n_vert,
        "n_vertices_depois": nova.n_vert,
        "diff_area_m2": round(nova.area_m2 - mr.area_m2, 2),
    }


@router.post("/microregiao/{microregiao_id}/remover-holes")
async def remover_holes_microregiao(
    microregiao_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(requer_presidente),
):
    """Remove todos os interior rings (holes/ilhas brancas) da microzona.

    Mantem o contorno externo. Audit registrado. Nao respeita congelamento
    (edicao manual humana sempre pode sobrescrever)."""
    from fastapi import HTTPException
    mr = (await db.execute(text(
        "SELECT id, nome, ST_AsEWKT(geometry) AS g_antes, "
        "ST_NPoints(geometry) AS n_vert_antes, "
        "ST_Area(geometry::geography) AS a_antes "
        "FROM microregioes WHERE id = :mid"
    ), {"mid": microregiao_id})).fetchone()
    if not mr:
        raise HTTPException(404, "Microzona nao encontrada")

    # Reconstroi a geometria: pra cada parte do MultiPolygon, mantem SO o
    # exterior ring (ST_ExteriorRing) reembrulhado em ST_MakePolygon.
    nova = (await db.execute(text("""
        WITH orig AS (SELECT geometry AS g FROM microregioes WHERE id = :mid),
        partes AS (SELECT (ST_Dump(orig.g)).geom AS p FROM orig),
        sem_holes AS (
            SELECT ST_MakePolygon(ST_ExteriorRing(p)) AS p FROM partes
        )
        SELECT ST_AsEWKT(ST_Multi(ST_SetSRID(ST_Union(p), 4674))) AS g_depois,
               ST_NPoints(ST_Multi(ST_Union(p))) AS n_vert_depois,
               ST_Area(ST_Union(p)::geography) AS a_depois
        FROM sem_holes
    """), {"mid": microregiao_id})).fetchone()

    if not nova or not nova.g_depois:
        raise HTTPException(400, "Falha ao reconstruir geometria sem holes")

    # Audit
    await db.execute(text("""
        INSERT INTO microregiao_edicoes_manuais (
            microregiao_id, usuario_id, geometry_antes, geometry_depois,
            n_vertices_antes, n_vertices_depois,
            area_antes_m2, area_depois_m2, diff_area_m2, motivo
        ) VALUES (
            :mid, :uid, :ga, :gd, :nva, :nvd,
            CAST(:aa AS float), CAST(:ad AS float), CAST(:diff AS float),
            'remover_holes'
        )
    """), {
        "mid": microregiao_id, "uid": usuario.id,
        "ga": mr.g_antes, "gd": nova.g_depois,
        "nva": mr.n_vert_antes, "nvd": nova.n_vert_depois,
        "aa": mr.a_antes, "ad": nova.a_depois,
        "diff": float(nova.a_depois) - float(mr.a_antes),
    })

    await db.execute(text("""
        UPDATE microregioes SET
            geometry = ST_GeomFromEWKT(:g),
            area_km2 = ROUND((:a/1000000.0)::numeric, 3),
            versao = versao + 1,
            hash_geometria = md5(ST_AsText(ST_GeomFromEWKT(:g))),
            atualizado_em = now()
        WHERE id = :mid
    """), {"g": nova.g_depois, "a": nova.a_depois, "mid": microregiao_id})
    await db.commit()
    return {
        "ok": True,
        "microregiao_id": microregiao_id,
        "holes_removidos_vertices": mr.n_vert_antes - nova.n_vert_depois,
        "area_ganho_m2": round(float(nova.a_depois) - float(mr.a_antes), 2),
    }


@router.delete("/microregiao/{microregiao_id}")
async def deletar_microregiao(
    microregiao_id: int,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(requer_presidente),
):
    """Apaga microzona indesejada (ex: agulha). Setores orfaos reatribuidos
    a microzona vizinha do MESMO distrito com maior fronteira compartilhada."""
    from fastapi import HTTPException
    mr = (await db.execute(text(
        "SELECT id, nome, distrito_cd, municipio_id, "
        "ST_AsEWKT(geometry) AS geom_ewkt, "
        "ST_Area(geometry::geography) AS area_m2 "
        "FROM microregioes WHERE id = :mid"
    ), {"mid": microregiao_id})).fetchone()
    if not mr:
        raise HTTPException(404, "Microzona nao encontrada")

    # Registra snapshot pre-delete no audit
    await db.execute(text("""
        INSERT INTO microregiao_edicoes_manuais (
            microregiao_id, usuario_id, geometry_antes, geometry_depois,
            n_vertices_antes, n_vertices_depois,
            area_antes_m2, area_depois_m2, diff_area_m2, motivo
        ) VALUES (
            :mid, :uid, :g_antes, ST_GeomFromText('MULTIPOLYGON EMPTY', 4674),
            (SELECT ST_NPoints(geometry) FROM microregioes WHERE id=:mid), 0,
            CAST(:a_antes AS float), 0, CAST(:diff AS float), 'delecao_manual'
        )
    """), {
        "mid": microregiao_id, "uid": usuario.id,
        "g_antes": mr.geom_ewkt, "a_antes": mr.area_m2,
        "diff": -float(mr.area_m2),
    })

    # Escolhe vizinha do mesmo distrito com maior fronteira
    vizinha = (await db.execute(text("""
        SELECT mr.id,
               ST_Length(ST_Intersection(ST_Boundary(ag.geometry), ST_Boundary(mr.geometry))::geography) AS fronteira_m
        FROM microregioes mr, microregioes ag
        WHERE ag.id = :aid AND mr.distrito_cd = ag.distrito_cd
          AND mr.municipio_id = ag.municipio_id AND mr.id != ag.id
        ORDER BY fronteira_m DESC NULLS LAST, ST_Distance(mr.geometry, ag.geometry)
        LIMIT 1
    """), {"aid": microregiao_id})).fetchone()

    if vizinha:
        # Funde geometria na vizinha + re-atribui setores
        await db.execute(text("""
            UPDATE microregioes vz SET
                geometry = ST_Multi(ST_SetSRID(ST_CollectionExtract(ST_MakeValid(
                    ST_Union(vz.geometry, ag.geometry)), 3), 4674)),
                area_km2 = ROUND((ST_Area(ST_Union(vz.geometry, ag.geometry)::geography)/1000000.0)::numeric, 3)
            FROM microregioes ag
            WHERE vz.id = :vid AND ag.id = :aid
        """), {"vid": vizinha.id, "aid": microregiao_id})
        await db.execute(text(
            "UPDATE setores_censitarios SET microregiao_id = :vid WHERE microregiao_id = :aid"
        ), {"vid": vizinha.id, "aid": microregiao_id})
    else:
        await db.execute(text(
            "UPDATE setores_censitarios SET microregiao_id = NULL WHERE microregiao_id = :aid"
        ), {"aid": microregiao_id})

    await db.execute(text("DELETE FROM microregioes WHERE id = :aid"), {"aid": microregiao_id})
    await db.commit()
    return {"ok": True, "deletada": microregiao_id, "fundida_em": vizinha.id if vizinha else None}


@router.get("/microregiao/{microregiao_id}/edicoes")
async def listar_edicoes_microregiao(
    microregiao_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requer_qualquer),
):
    """Lista edicoes manuais feitas na microzona (historico pra analise)."""
    result = await db.execute(text("""
        SELECT e.id, e.created_at, u.nome AS usuario,
               e.n_vertices_antes, e.n_vertices_depois,
               e.area_antes_m2, e.area_depois_m2, e.diff_area_m2,
               e.motivo
        FROM microregiao_edicoes_manuais e
        LEFT JOIN usuarios u ON u.id = e.usuario_id
        WHERE e.microregiao_id = :mid
        ORDER BY e.created_at DESC
    """), {"mid": microregiao_id})
    return [dict(r._mapping) for r in result.fetchall()]
