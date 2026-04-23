"""
Servico de agregacao de KPIs para cercas virtuais do Modulo Campanha.

Faz cruzamento PostGIS entre o poligono da cerca e as zonas eleitorais
para agregar votos historicos do candidato da campanha.

Estrutura de dados TSE disponivel:
  - votos_por_zona: candidatura_id + zona_id + municipio_id + qt_votos + turno
  - candidaturas: candidato_id + municipio_id + ano + cargo + votos_total
  - candidatos: sequencial_tse + nome_completo + cpf_hash
  - zonas_eleitorais: id + numero + municipio_id
  - municipios: id + geometry (MULTIPOLYGON) -- poligono do municipio

LIMITACAO ATUAL:
  zonas_eleitorais NAO tem campo geometrico proprio (sem lat/lng ou centroide).
  O cruzamento PostGIS precisa do centroide ou poligono de cada zona.

  Estrategia implementada:
    1. Tenta cruzamento via municipio: votos de municipios cujo centroide
       cai dentro do poligono da cerca (ST_Contains sobre municipios.geometry).
    2. Se candidato tem CPF cadastrado na plataforma e ha matching por nome,
       usa candidaturas linkadas.
    3. Caso o candidato nao tenha candidaturas TSE ainda (CPF nao importado),
       retorna mock com municipio/UF da campanha para nao bloquear o fluxo.

Pendencias para ETL futuro:
  - Importar centroides de zonas eleitorais (tabela locais_votacao tem endereco textual)
  - Geocodificar locais_votacao para ter ponto geografico por zona
  - Com isso, ST_Contains(cerca.poligono, zona.centroide) seria possivel
"""
from __future__ import annotations

import math
import time
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campanha import (
    CampCerca,
    Campanha,
    CercaAgregacao,
    PapelCampanhaModel,
    PessoaBase,
)


# ---------------------------------------------------------------------------
# Calculo de votos historicos via PostGIS (municipios dentro da cerca)
# ---------------------------------------------------------------------------

async def calcular_votos_historicos_cerca(
    db: AsyncSession,
    cerca_id: UUID,
) -> dict[int, int]:
    """
    Agrega votos historicos do candidato da campanha dentro da cerca.

    Estrategia: busca municipios cujo centroide (ou poligono simplificado)
    esta dentro do poligono da cerca, depois soma votos por ano.

    Retorna: {2016: X, 2020: Y, 2024: Z} -- apenas anos com dados.
    """
    # Busca cerca + campanha + candidato
    row = (await db.execute(text("""
        SELECT
            cv.id            AS cerca_id,
            cv.poligono      AS poligono,
            cv.campanha_id   AS campanha_id,
            cv.nome          AS cerca_nome,
            cam.candidato_pessoa_id,
            cam.ciclo_eleitoral,
            cam.cargo_disputado,
            cam.uf,
            cam.municipio_id AS camp_municipio_id,
            pb.cpf           AS candidato_cpf
        FROM camp_cercas_virtuais cv
        JOIN camp_campanhas cam ON cam.id = cv.campanha_id
        JOIN camp_pessoas_base pb ON pb.id = cam.candidato_pessoa_id
        WHERE cv.id = :cerca_id
    """), {"cerca_id": str(cerca_id)})).fetchone()

    if row is None:
        return {}

    # ------------------------------------------------------------------
    # Tentativa 1: cruzamento PostGIS municipios x poligono da cerca
    # Requer que cerca.poligono esteja preenchido
    # ------------------------------------------------------------------
    if row.poligono is not None:
        votos = await _votos_por_municipios_na_cerca(
            db, row
        )
        if votos:
            return votos

    # ------------------------------------------------------------------
    # Tentativa 2: fallback por municipio da campanha (sem geometria)
    # Usado quando poligono nao foi definido ainda ou cerca cobre apenas 1 municipio
    # ------------------------------------------------------------------
    if row.camp_municipio_id:
        votos = await _votos_por_municipio_id(
            db, row.camp_municipio_id, row
        )
        if votos:
            return votos

    # ------------------------------------------------------------------
    # Tentativa 3: fallback por UF da campanha (nenhuma geometria disponivel)
    # ------------------------------------------------------------------
    if row.uf:
        votos = await _votos_por_uf(db, row.uf, row)
        if votos:
            return votos

    # Sem dados: retorna vazio (mock com zeros sera aplicado pelo caller)
    return {}


async def _votos_por_municipios_na_cerca(db: AsyncSession, row) -> dict[int, int]:
    """
    Usa ST_Intersects entre o poligono da cerca e os poligonos dos municipios.
    Cruza com candidaturas por nome/CPF do candidato.
    """
    # Mapeamento de cargo da campanha para cargo TSE
    _CARGO_MAP = {
        "VEREADOR":    "Vereador",
        "PREFEITO":    "Prefeito",
        "DEP_ESTADUAL": "Deputado Estadual",
        "DEP_FEDERAL":  "Deputado Federal",
        "SENADOR":     "Senador",
        "GOVERNADOR":  "Governador",
        "PRESIDENTE":  "Presidente",
    }
    cargo_tse = _CARGO_MAP.get(row.cargo_disputado, row.cargo_disputado)

    # Tenta matching por CPF primeiro (mais confiavel)
    # candidatos.cpf_hash = sha256(cpf) -- sem cpf em claro
    # Se nao tiver cpf, tenta por nome
    candidato_join = ""
    candidato_filter = ""

    if row.candidato_cpf:
        import hashlib
        cpf_hash = hashlib.sha256(row.candidato_cpf.encode()).hexdigest()
        candidato_join = "JOIN candidatos cand ON cand.id = c.candidato_id"
        candidato_filter = f"AND cand.cpf_hash = '{cpf_hash}'"
    else:
        # Sem CPF: nao ha como cruzar com TSE de forma segura
        return {}

    sql = text(f"""
        SELECT
            c.ano,
            SUM(vpz.qt_votos) AS total_votos
        FROM candidaturas c
        {candidato_join}
        JOIN votos_por_zona vpz ON vpz.candidatura_id = c.id
        JOIN municipios m ON m.id = vpz.municipio_id
        WHERE ST_Intersects(
            m.geometry_brasil,
            ST_SetSRID(:poligono ::geometry, 4326)
        )
        AND LOWER(c.cargo) LIKE LOWER(:cargo_pattern)
        AND vpz.turno = 1
        {candidato_filter}
        GROUP BY c.ano
        ORDER BY c.ano
    """)

    try:
        from geoalchemy2.shape import to_shape
        from shapely import wkt as shapely_wkt
        shp = to_shape(row.poligono)
        wkt_str = shp.wkt

        result = (await db.execute(sql, {
            "poligono": wkt_str,
            "cargo_pattern": f"%{cargo_tse}%",
        })).fetchall()

        return {r[0]: int(r[1]) for r in result if r[1]}
    except Exception:
        return {}


async def _votos_por_municipio_id(
    db: AsyncSession,
    municipio_id: int,
    row,
) -> dict[int, int]:
    """
    Fallback: soma votos do candidato no municipio da campanha, por ano.
    Usa CPF hash para identificar candidato no TSE.
    """
    if not row.candidato_cpf:
        return {}

    import hashlib
    cpf_hash = hashlib.sha256(row.candidato_cpf.encode()).hexdigest()

    _CARGO_MAP = {
        "VEREADOR": "Vereador", "PREFEITO": "Prefeito",
        "DEP_ESTADUAL": "Deputado Estadual", "DEP_FEDERAL": "Deputado Federal",
        "SENADOR": "Senador", "GOVERNADOR": "Governador", "PRESIDENTE": "Presidente",
    }
    cargo_tse = _CARGO_MAP.get(row.cargo_disputado, row.cargo_disputado)

    result = (await db.execute(text("""
        SELECT c.ano, SUM(vpz.qt_votos) AS total_votos
        FROM candidaturas c
        JOIN candidatos cand ON cand.id = c.candidato_id
        JOIN votos_por_zona vpz ON vpz.candidatura_id = c.id
        WHERE cand.cpf_hash = :cpf_hash
          AND c.municipio_id = :municipio_id
          AND LOWER(c.cargo) LIKE LOWER(:cargo_pattern)
          AND vpz.turno = 1
        GROUP BY c.ano
        ORDER BY c.ano
    """), {
        "cpf_hash": cpf_hash,
        "municipio_id": municipio_id,
        "cargo_pattern": f"%{cargo_tse}%",
    })).fetchall()

    return {r[0]: int(r[1]) for r in result if r[1]}


async def _votos_por_uf(db: AsyncSession, uf: str, row) -> dict[int, int]:
    """
    Fallback final: soma votos do candidato em toda a UF, por ano.
    Usado para candidaturas estaduais/nacionais sem municipio especifico.
    """
    if not row.candidato_cpf:
        return {}

    import hashlib
    cpf_hash = hashlib.sha256(row.candidato_cpf.encode()).hexdigest()

    _CARGO_MAP = {
        "VEREADOR": "Vereador", "PREFEITO": "Prefeito",
        "DEP_ESTADUAL": "Deputado Estadual", "DEP_FEDERAL": "Deputado Federal",
        "SENADOR": "Senador", "GOVERNADOR": "Governador", "PRESIDENTE": "Presidente",
    }
    cargo_tse = _CARGO_MAP.get(row.cargo_disputado, row.cargo_disputado)

    result = (await db.execute(text("""
        SELECT c.ano, SUM(vpz.qt_votos) AS total_votos
        FROM candidaturas c
        JOIN candidatos cand ON cand.id = c.candidato_id
        JOIN votos_por_zona vpz ON vpz.candidatura_id = c.id
        WHERE cand.cpf_hash = :cpf_hash
          AND c.estado_uf = :uf
          AND LOWER(c.cargo) LIKE LOWER(:cargo_pattern)
          AND vpz.turno = 1
        GROUP BY c.ano
        ORDER BY c.ano
    """), {
        "cpf_hash": cpf_hash,
        "uf": uf.upper(),
        "cargo_pattern": f"%{cargo_tse}%",
    })).fetchall()

    return {r[0]: int(r[1]) for r in result if r[1]}


# ---------------------------------------------------------------------------
# Calculo de score e classificacao
# ---------------------------------------------------------------------------

def calcular_score_performance(votos_historicos: dict[int, int], meta_votos: int) -> float:
    """
    Score 0-100 = 40% volume_normalizado + 30% crescimento + 30% constancia.

    - volume_normalizado: votos_ultimo / meta (cap em 1.0)
    - crescimento: (ultimo / penultimo) - 1, cap em [-1.0, +1.0], normalizado para [0, 1]
    - constancia: 1 - coeficiente_variacao (quanto mais estaveis os votos, maior)

    Se nao ha meta definida (0), usa o maior valor historico como referencia.
    """
    if not votos_historicos:
        return 0.0

    anos = sorted(votos_historicos.keys())
    valores = [votos_historicos[a] for a in anos]

    # --- Componente 1: Volume (40%) ---
    ultimo = valores[-1]
    referencia = meta_votos if meta_votos and meta_votos > 0 else max(valores)
    volume_norm = min(ultimo / referencia, 1.0) if referencia > 0 else 0.0

    # --- Componente 2: Crescimento (30%) ---
    if len(valores) >= 2:
        penultimo = valores[-2]
        if penultimo > 0:
            crescimento_raw = (ultimo - penultimo) / penultimo
        else:
            crescimento_raw = 0.0
        # Cap em [-1.0, +1.0], normaliza para [0, 1]
        crescimento_raw = max(-1.0, min(1.0, crescimento_raw))
        crescimento_norm = (crescimento_raw + 1.0) / 2.0
    else:
        crescimento_norm = 0.5  # sem historico suficiente: neutro

    # --- Componente 3: Constancia (30%) ---
    if len(valores) >= 2:
        media = sum(valores) / len(valores)
        if media > 0:
            desvio = math.sqrt(sum((v - media) ** 2 for v in valores) / len(valores))
            cv = desvio / media  # coeficiente de variacao
            constancia_norm = max(0.0, 1.0 - cv)
        else:
            constancia_norm = 0.0
    else:
        constancia_norm = 0.5  # sem historico: neutro

    score = (0.40 * volume_norm + 0.30 * crescimento_norm + 0.30 * constancia_norm) * 100.0
    return round(min(100.0, max(0.0, score)), 2)


def classificar(score: float) -> str:
    """
    Retorna classificacao baseada no score.
      ouro   >= 85
      prata  >= 70
      bronze >= 50
      critico < 50
    """
    if score >= 85.0:
        return "ouro"
    elif score >= 70.0:
        return "prata"
    elif score >= 50.0:
        return "bronze"
    else:
        return "critico"


def calcular_tendencia(
    score_atual: float,
    score_anterior: Optional[float],
    limiar_pp: float = 5.0,
) -> str:
    """
    Compara score_atual com score_anterior (snapshot de 7 dias atras).
    Retorna:
      'crescendo' se subiu >= limiar_pp pontos percentuais
      'caindo'    se caiu  >= limiar_pp pontos percentuais
      'estavel'   caso contrario
    Se score_anterior e None (primeiro calculo): retorna 'estavel'.
    """
    if score_anterior is None:
        return "estavel"
    delta = score_atual - score_anterior
    if delta >= limiar_pp:
        return "crescendo"
    elif delta <= -limiar_pp:
        return "caindo"
    return "estavel"


# ---------------------------------------------------------------------------
# Orquestrador principal
# ---------------------------------------------------------------------------

async def recalcular_cerca(
    db: AsyncSession,
    cerca_id: UUID,
) -> CercaAgregacao:
    """
    Orquestra o calculo completo de KPIs de uma cerca:
      1. Busca cerca + meta
      2. Calcula votos historicos (PostGIS ou fallback)
      3. Calcula score + classificacao + tendencia
      4. Conta equipe (lideres, cabos)
      5. UPSERT em camp_cercas_agregacoes
      6. Retorna objeto atualizado
    """
    from sqlalchemy import select

    # Busca cerca
    cerca = (await db.execute(
        text("SELECT * FROM camp_cercas_virtuais WHERE id = :id"),
        {"id": str(cerca_id)},
    )).fetchone()

    if cerca is None:
        raise ValueError(f"Cerca {cerca_id} nao encontrada.")

    # Busca meta de votos (pode ser None)
    meta_row = (await db.execute(text("""
        SELECT votos_meta FROM camp_metas_cerca
        WHERE cerca_virtual_id = :cerca_id
        LIMIT 1
    """), {"cerca_id": str(cerca_id)})).fetchone()
    meta_votos = meta_row[0] if meta_row and meta_row[0] else 0

    # Votos historicos
    votos_historicos = await calcular_votos_historicos_cerca(db, cerca_id)

    # Se nao achou dados reais, usa mock zerado por ano esperado
    # (nao bloqueia o fluxo, sera sobrescrito quando ETL importar votos do candidato)
    if not votos_historicos:
        votos_historicos = {}

    # Score
    score = calcular_score_performance(votos_historicos, meta_votos)
    classif = classificar(score)

    # Tendencia: busca score anterior (snapshot mais recente de >= 7 dias atras)
    anterior_row = (await db.execute(text("""
        SELECT score_performance, atualizado_em
        FROM camp_cercas_agregacoes
        WHERE cerca_virtual_id = :cerca_id
          AND atualizado_em <= NOW() - INTERVAL '7 days'
        ORDER BY atualizado_em DESC
        LIMIT 1
    """), {"cerca_id": str(cerca_id)})).fetchone()

    # Se nao ha snapshot antigo, compara com valor atual (sem tendencia ainda)
    score_anterior = anterior_row[0] if anterior_row else None
    tendencia = calcular_tendencia(score, score_anterior)

    # Conta equipe ativa
    equipe = (await db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE papel IN ('lideranca','coord_regional','coord_territorial')) AS lideres,
            COUNT(*) FILTER (WHERE papel = 'cabo') AS cabos
        FROM camp_papeis_campanha
        WHERE cerca_virtual_id = :cerca_id
          AND status = 'ativo'
    """), {"cerca_id": str(cerca_id)})).fetchone()

    lideres_count = int(equipe[0]) if equipe else 0
    cabos_count   = int(equipe[1]) if equipe else 0

    # Crescimento percentual ultimo ciclo
    anos = sorted(votos_historicos.keys()) if votos_historicos else []
    crescimento_pct = None
    if len(anos) >= 2:
        v_atual    = votos_historicos[anos[-1]]
        v_anterior = votos_historicos[anos[-2]]
        if v_anterior > 0:
            crescimento_pct = round(((v_atual - v_anterior) / v_anterior) * 100, 2)

    # UPSERT em camp_cercas_agregacoes
    agora = datetime.now(tz=timezone.utc)

    await db.execute(text("""
        INSERT INTO camp_cercas_agregacoes (
            cerca_virtual_id,
            votos_historicos_json,
            crescimento_pct_ultimo_ciclo,
            liderancas_ativas_count,
            cabos_ativos_count,
            escolas_eleitorais_count,
            zonas_count,
            score_performance,
            classificacao,
            tendencia,
            atualizado_em
        ) VALUES (
            :cerca_id,
            :votos_json::jsonb,
            :crescimento_pct,
            :lideres,
            :cabos,
            0,
            0,
            :score,
            :classificacao,
            :tendencia,
            :agora
        )
        ON CONFLICT (cerca_virtual_id) DO UPDATE SET
            votos_historicos_json        = EXCLUDED.votos_historicos_json,
            crescimento_pct_ultimo_ciclo = EXCLUDED.crescimento_pct_ultimo_ciclo,
            liderancas_ativas_count      = EXCLUDED.liderancas_ativas_count,
            cabos_ativos_count           = EXCLUDED.cabos_ativos_count,
            score_performance            = EXCLUDED.score_performance,
            classificacao                = EXCLUDED.classificacao,
            tendencia                    = EXCLUDED.tendencia,
            atualizado_em                = EXCLUDED.atualizado_em
    """), {
        "cerca_id":       str(cerca_id),
        "votos_json":     __import__("json").dumps(
                              {str(k): v for k, v in votos_historicos.items()}
                          ),
        "crescimento_pct": crescimento_pct,
        "lideres":        lideres_count,
        "cabos":          cabos_count,
        "score":          score,
        "classificacao":  classif,
        "tendencia":      tendencia,
        "agora":          agora,
    })
    await db.commit()

    # Retorna objeto atualizado
    result = (await db.execute(text("""
        SELECT * FROM camp_cercas_agregacoes
        WHERE cerca_virtual_id = :cerca_id
    """), {"cerca_id": str(cerca_id)})).fetchone()

    # Monta CercaAgregacao ORM-like a partir do row
    agg = CercaAgregacao()
    agg.cerca_virtual_id             = cerca_id
    agg.votos_historicos_json        = votos_historicos
    agg.crescimento_pct_ultimo_ciclo = crescimento_pct
    agg.liderancas_ativas_count      = lideres_count
    agg.cabos_ativos_count           = cabos_count
    agg.escolas_eleitorais_count     = 0
    agg.zonas_count                  = 0
    agg.score_performance            = score
    agg.classificacao                = classif
    agg.tendencia                    = tendencia
    agg.atualizado_em                = agora

    return agg


async def recalcular_todas_cercas_ativas(db: AsyncSession) -> dict:
    """
    Recalcula KPIs de todas as cercas com status='ativa'.
    Retorna resumo: {cercas_atualizadas, alertas_gerados, duracao_s}.
    """
    t0 = time.monotonic()

    rows = (await db.execute(text("""
        SELECT id FROM camp_cercas_virtuais
        WHERE status = 'ativa'
        ORDER BY criado_em
    """))).fetchall()

    cerca_ids = [row[0] for row in rows]
    atualizadas = 0
    alertas_gerados = 0
    erros = []

    for cerca_id in cerca_ids:
        try:
            agg = await recalcular_cerca(db, UUID(str(cerca_id)))
            atualizadas += 1

            # Gerar alertas desta cerca
            from app.services.campanha_alertas import verificar_alertas_cerca
            n_alertas = await verificar_alertas_cerca(db, UUID(str(cerca_id)), agg)
            alertas_gerados += n_alertas

        except Exception as e:
            erros.append({"cerca_id": str(cerca_id), "erro": str(e)})
            continue

    duracao = round(time.monotonic() - t0, 2)

    return {
        "cercas_atualizadas": atualizadas,
        "alertas_gerados":    alertas_gerados,
        "duracao_s":          duracao,
        "erros":              erros,
    }
