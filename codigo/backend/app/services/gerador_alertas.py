"""
Gerador automático de alertas eleitorais.
Analisa o farol e cria alertas para situações críticas.

Tipos gerados:
  QUEDA_CRITICA      - município com -30%+ de votos
  REDUTO_PERDIDO     - tinha eleito em 2020, não tem em 2024
  NOVO_REDUTO        - ganhou eleito em 2024 que não tinha em 2020
  DELEGADO_INATIVO   - delegado sem filiados nos últimos 30 dias
"""
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
from app.models.operacional import Alerta, GravidadeAlerta, Delegado, Filiado


async def gerar_alertas_farol(db: AsyncSession, uf: str | None = None) -> int:
    """
    Varre o farol_municipio e gera alertas para situações críticas.
    Evita duplicatas (não gera o mesmo alerta duas vezes para o mesmo município/tipo).
    Retorna o número de alertas criados.
    """
    filtro_uf = "AND m.estado_uf = :uf" if uf else ""

    rows = await db.execute(text(f"""
        SELECT
            m.id        AS municipio_id,
            m.nome      AS municipio_nome,
            m.estado_uf,
            f.status,
            f.votos_atual,
            f.votos_anterior,
            f.variacao_pct,
            f.eleitos_atual,
            f.eleitos_anterior,
            f.cargo,
            f.ano_referencia
        FROM farol_municipio f
        JOIN municipios m ON m.id = f.municipio_id
        WHERE f.ano_referencia = 2024
          AND UPPER(f.cargo) = 'VEREADOR'
          {filtro_uf}
        ORDER BY f.variacao_pct ASC NULLS LAST
    """), {"uf": uf.upper() if uf else None})

    criados = 0
    for row in rows.fetchall():
        alertas_para_criar = []

        # 1. Reduto perdido: tinha eleito, perdeu
        if row.eleitos_anterior > 0 and row.eleitos_atual == 0:
            alertas_para_criar.append({
                "tipo": "REDUTO_PERDIDO",
                "gravidade": GravidadeAlerta.CRITICO,
                "descricao": (
                    f"{row.municipio_nome} ({row.estado_uf}): perdemos presença. "
                    f"Tínhamos {row.eleitos_anterior} eleito(s) em 2020, zero em 2024. "
                    f"Votos: {(row.votos_atual or 0):,} vs {(row.votos_anterior or 0):,}."
                ).replace(",", "."),
            })

        # 2. Queda crítica de votos (>30%) mesmo mantendo eleito
        elif row.variacao_pct is not None and row.variacao_pct <= -30:
            alertas_para_criar.append({
                "tipo": "QUEDA_CRITICA",
                "gravidade": GravidadeAlerta.ALERTA,
                "descricao": (
                    f"{row.municipio_nome} ({row.estado_uf}): queda de "
                    f"{abs(row.variacao_pct):.1f}% nos votos de vereador "
                    f"({(row.votos_anterior or 0):,} → {(row.votos_atual or 0):,})."
                ).replace(",", "."),
            })

        # 3. Novo reduto: ganhou eleito que não tinha
        if row.eleitos_atual > 0 and row.eleitos_anterior == 0:
            alertas_para_criar.append({
                "tipo": "NOVO_REDUTO",
                "gravidade": GravidadeAlerta.OK,
                "descricao": (
                    f"{row.municipio_nome} ({row.estado_uf}): novo reduto! "
                    f"Conquistamos {row.eleitos_atual} vaga(s) de vereador em 2024."
                ),
            })

        for alerta_data in alertas_para_criar:
            # Evita duplicata: mesmo tipo + mesmo município já existente
            dup = await db.execute(text("""
                SELECT id FROM alertas
                WHERE municipio_id = :mid AND tipo = :tipo
                  AND criado_em > NOW() - INTERVAL '30 days'
            """), {"mid": row.municipio_id, "tipo": alerta_data["tipo"]})
            if dup.fetchone():
                continue

            alerta = Alerta(
                tipo=alerta_data["tipo"],
                gravidade=alerta_data["gravidade"],
                municipio_id=row.municipio_id,
                descricao=alerta_data["descricao"],
            )
            db.add(alerta)
            criados += 1

    # 4. Delegados sem atividade (sem filiados nos últimos 60 dias)
    delegados_inativos = await db.execute(text("""
        SELECT d.id, d.nome, d.estado_uf,
               COUNT(f.id) AS filiados_recentes
        FROM delegados d
        LEFT JOIN filiados f ON f.cadastrado_por_id = d.id
          AND f.criado_em > NOW() - INTERVAL '60 days'
        WHERE d.ativo = TRUE
        GROUP BY d.id, d.nome, d.estado_uf
        HAVING COUNT(f.id) = 0
        LIMIT 50
    """ + (f" AND d.estado_uf = '{uf.upper()}'" if uf else "")))

    for d in delegados_inativos.fetchall():
        dup = await db.execute(text("""
            SELECT id FROM alertas
            WHERE delegado_id = :did AND tipo = 'DELEGADO_INATIVO'
              AND criado_em > NOW() - INTERVAL '7 days'
        """), {"did": d.id})
        if dup.fetchone():
            continue

        alerta = Alerta(
            tipo="DELEGADO_INATIVO",
            gravidade=GravidadeAlerta.ATENCAO,
            delegado_id=d.id,
            descricao=(
                f"Delegado {d.nome} ({d.estado_uf}) sem filiados cadastrados "
                f"nos últimos 60 dias."
            ),
        )
        db.add(alerta)
        criados += 1

    if criados > 0:
        await db.commit()

    return criados
