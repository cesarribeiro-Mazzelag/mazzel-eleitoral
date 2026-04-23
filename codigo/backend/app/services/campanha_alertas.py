"""
Motor de alertas inteligentes para o Modulo Campanha.

Detecta situacoes criticas nas cercas virtuais e registra alertas
na tabela existente `alertas` (app/models/operacional.py).

Tipos gerados (prefixo CAMP_ para diferenciar dos alertas eleitorais existentes):
  CAMP_SCORE_QUEDA        - score caiu >= 10 pontos desde ultimo calculo
  CAMP_CLASSIFICACAO_CRITICO - cerca mudou para classificacao 'critico'
  CAMP_SEM_RESPONSAVEL    - cerca ativa sem responsavel ha > 3 dias
  CAMP_META_BAIXA         - score abaixo de 50% da meta de votos

Os alertas sao inseridos na tabela `alertas` existente.
Campos nao-aplicaveis ao contexto de campanha (municipio_id, delegado_id,
politico_id) ficam NULL — isso e intencional e valido pelo schema.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campanha import CercaAgregacao
from app.models.operacional import Alerta, GravidadeAlerta


# ---------------------------------------------------------------------------
# Helper: insere alerta se ainda nao existe um identico nao-lido
# ---------------------------------------------------------------------------

async def _inserir_alerta_se_novo(
    db: AsyncSession,
    tipo: str,
    gravidade: GravidadeAlerta,
    descricao: str,
    deduplication_key: str,   # chave textual para evitar duplicatas em 24h
) -> bool:
    """
    Insere alerta apenas se nao houver alerta do mesmo tipo e chave nas ultimas 24h.
    Retorna True se inseriu, False se era duplicata.
    """
    existe = (await db.execute(text("""
        SELECT 1 FROM alertas
        WHERE tipo = :tipo
          AND descricao LIKE :chave_pattern
          AND lido = FALSE
          AND criado_em >= NOW() - INTERVAL '24 hours'
        LIMIT 1
    """), {
        "tipo": tipo,
        "chave_pattern": f"%{deduplication_key}%",
    })).fetchone()

    if existe:
        return False

    alerta = Alerta(
        tipo=tipo,
        gravidade=gravidade,
        descricao=descricao,
        lido=False,
        notificado_email=False,
        notificado_whatsapp=False,
    )
    db.add(alerta)
    return True


# ---------------------------------------------------------------------------
# Verificacao de alertas para uma cerca especifica
# ---------------------------------------------------------------------------

async def verificar_alertas_cerca(
    db: AsyncSession,
    cerca_id: UUID,
    agg_atual: CercaAgregacao,
) -> int:
    """
    Analisa o estado atual da cerca e gera alertas quando necessario.
    Retorna o numero de alertas inseridos.
    """
    n_alertas = 0

    # Busca nome da cerca para descricao legivel
    cerca_row = (await db.execute(text("""
        SELECT cv.nome, cam.nome AS campanha_nome
        FROM camp_cercas_virtuais cv
        JOIN camp_campanhas cam ON cam.id = cv.campanha_id
        WHERE cv.id = :cerca_id
    """), {"cerca_id": str(cerca_id)})).fetchone()

    if cerca_row is None:
        return 0

    cerca_nome    = cerca_row[0]
    campanha_nome = cerca_row[1]

    # Busca estado anterior da agregacao (antes do recalculo atual)
    anterior_row = (await db.execute(text("""
        SELECT score_performance, classificacao, atualizado_em
        FROM camp_cercas_agregacoes
        WHERE cerca_virtual_id = :cerca_id
          AND atualizado_em < :agora
        ORDER BY atualizado_em DESC
        LIMIT 1
    """), {
        "cerca_id": str(cerca_id),
        "agora": agg_atual.atualizado_em,
    })).fetchone()

    score_anterior    = anterior_row[0] if anterior_row else None
    classif_anterior  = anterior_row[1] if anterior_row else None

    # ------------------------------------------------------------------
    # Alerta 1: Score caiu >= 10 pontos
    # ------------------------------------------------------------------
    if (
        score_anterior is not None
        and agg_atual.score_performance is not None
        and (score_anterior - agg_atual.score_performance) >= 10.0
    ):
        queda = round(score_anterior - agg_atual.score_performance, 1)
        inserido = await _inserir_alerta_se_novo(
            db,
            tipo="CAMP_SCORE_QUEDA",
            gravidade=GravidadeAlerta.CRITICO if queda >= 20 else GravidadeAlerta.ALERTA,
            descricao=(
                f"[{campanha_nome}] Cerca '{cerca_nome}': score caiu {queda} pontos "
                f"({score_anterior:.1f} -> {agg_atual.score_performance:.1f}). "
                f"Classificacao atual: {agg_atual.classificacao}. "
                f"[cerca_id:{cerca_id}]"
            ),
            deduplication_key=f"cerca_id:{cerca_id}",
        )
        if inserido:
            n_alertas += 1

    # ------------------------------------------------------------------
    # Alerta 2: Classificacao mudou para 'critico'
    # ------------------------------------------------------------------
    if (
        agg_atual.classificacao == "critico"
        and classif_anterior is not None
        and classif_anterior != "critico"
    ):
        inserido = await _inserir_alerta_se_novo(
            db,
            tipo="CAMP_CLASSIFICACAO_CRITICO",
            gravidade=GravidadeAlerta.CRITICO,
            descricao=(
                f"[{campanha_nome}] Cerca '{cerca_nome}': passou para classificacao CRITICO "
                f"(era: {classif_anterior}). Score atual: {agg_atual.score_performance:.1f}. "
                f"Acao imediata necessaria. [cerca_id:{cerca_id}]"
            ),
            deduplication_key=f"cerca_id:{cerca_id}",
        )
        if inserido:
            n_alertas += 1

    # ------------------------------------------------------------------
    # Alerta 3: Cerca ativa sem responsavel ha > 3 dias
    # ------------------------------------------------------------------
    sem_responsavel_row = (await db.execute(text("""
        SELECT criado_em
        FROM camp_cercas_virtuais
        WHERE id = :cerca_id
          AND status = 'ativa'
          AND responsavel_papel_id IS NULL
          AND criado_em <= NOW() - INTERVAL '3 days'
        LIMIT 1
    """), {"cerca_id": str(cerca_id)})).fetchone()

    if sem_responsavel_row:
        dias = (datetime.now(tz=timezone.utc) - sem_responsavel_row[0].replace(tzinfo=timezone.utc)).days
        inserido = await _inserir_alerta_se_novo(
            db,
            tipo="CAMP_SEM_RESPONSAVEL",
            gravidade=GravidadeAlerta.ALERTA,
            descricao=(
                f"[{campanha_nome}] Cerca '{cerca_nome}': sem responsavel atribuido "
                f"ha {dias} dia(s). Atribua um coordenador para esta area. "
                f"[cerca_id:{cerca_id}]"
            ),
            deduplication_key=f"cerca_id:{cerca_id}",
        )
        if inserido:
            n_alertas += 1

    # ------------------------------------------------------------------
    # Alerta 4: Score abaixo de 50% da meta
    # ------------------------------------------------------------------
    meta_row = (await db.execute(text("""
        SELECT votos_meta FROM camp_metas_cerca
        WHERE cerca_virtual_id = :cerca_id AND votos_meta > 0
        LIMIT 1
    """), {"cerca_id": str(cerca_id)})).fetchone()

    if meta_row and agg_atual.score_performance is not None:
        votos_meta = meta_row[0]
        votos_json = agg_atual.votos_historicos_json or {}
        anos = sorted(int(k) for k in votos_json.keys())
        votos_atuais = votos_json.get(str(max(anos)), 0) if anos else 0

        if votos_meta > 0 and votos_atuais < (votos_meta * 0.5):
            pct_meta = round((votos_atuais / votos_meta) * 100, 1)
            inserido = await _inserir_alerta_se_novo(
                db,
                tipo="CAMP_META_BAIXA",
                gravidade=GravidadeAlerta.ALERTA,
                descricao=(
                    f"[{campanha_nome}] Cerca '{cerca_nome}': {votos_atuais:,} votos "
                    f"vs meta de {votos_meta:,} ({pct_meta}% da meta). "
                    f"Score de performance: {agg_atual.score_performance:.1f}. "
                    f"[cerca_id:{cerca_id}]"
                ).replace(",", "."),
                deduplication_key=f"cerca_id:{cerca_id}",
            )
            if inserido:
                n_alertas += 1

    if n_alertas > 0:
        await db.commit()

    return n_alertas


# ---------------------------------------------------------------------------
# Verificacao em lote para todas as cercas de uma campanha
# ---------------------------------------------------------------------------

async def verificar_alertas_campanha(
    db: AsyncSession,
    campanha_id: UUID,
) -> int:
    """
    Roda verificacao de alertas para todas as cercas ativas de uma campanha.
    Retorna total de alertas gerados.
    """
    from app.models.campanha import CampCerca, CercaAgregacao as AggModel
    from sqlalchemy import select

    cercas = (await db.execute(text("""
        SELECT cv.id
        FROM camp_cercas_virtuais cv
        WHERE cv.campanha_id = :camp_id
          AND cv.status = 'ativa'
    """), {"camp_id": str(campanha_id)})).fetchall()

    total = 0
    for (cerca_id,) in cercas:
        agg_row = (await db.execute(text("""
            SELECT * FROM camp_cercas_agregacoes
            WHERE cerca_virtual_id = :cerca_id
        """), {"cerca_id": str(cerca_id)})).fetchone()

        if agg_row is None:
            continue

        # Reconstroi objeto CercaAgregacao a partir do row
        agg = AggModel()
        mapping = dict(agg_row._mapping)
        agg.cerca_virtual_id             = mapping["cerca_virtual_id"]
        agg.votos_historicos_json        = mapping.get("votos_historicos_json")
        agg.crescimento_pct_ultimo_ciclo = mapping.get("crescimento_pct_ultimo_ciclo")
        agg.liderancas_ativas_count      = mapping.get("liderancas_ativas_count", 0)
        agg.cabos_ativos_count           = mapping.get("cabos_ativos_count", 0)
        agg.score_performance            = mapping.get("score_performance")
        agg.classificacao                = mapping.get("classificacao")
        agg.tendencia                    = mapping.get("tendencia")
        agg.atualizado_em                = mapping.get("atualizado_em")

        n = await verificar_alertas_cerca(db, UUID(str(cerca_id)), agg)
        total += n

    return total
