"""
Agente Farol — calcula status verde/amarelo/vermelho por município.
Executado após cada carga de dados eleitorais.
"""
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.eleitoral import Candidatura, Municipio, Partido
from app.models.operacional import FarolMunicipio, StatusFarol


# Números dos partidos que compõem o histórico do União Brasil
NUMEROS_UNIAO_BRASIL = {44}          # UNIAO (2022+)
NUMEROS_PREDECESSORES = {25, 17}     # DEM + PSL (até 2021)

# Todos os números históricos do partido
TODOS_NUMEROS_HISTORICOS = NUMEROS_UNIAO_BRASIL | NUMEROS_PREDECESSORES


def _calcular_status(
    votos_atual: int,
    votos_anterior: int,
    eleitos_atual: int,
    eleitos_anterior: int,
) -> StatusFarol:
    """
    Regras do farol:
      VERDE    — tem eleito E votos crescentes (ou estáveis) nas últimas 2 eleições
      AMARELO  — tem eleito mas votos em queda, OU sem eleito mas votação expressiva
      VERMELHO — sem eleito e votação baixa ou em queda
    """
    variacao = 0.0
    if votos_anterior > 0:
        variacao = (votos_atual - votos_anterior) / votos_anterior

    if eleitos_atual > 0 and variacao >= -0.05:  # eleito e não caiu mais de 5%
        return StatusFarol.VERDE

    if eleitos_atual > 0 and variacao < -0.05:   # eleito mas queda expressiva
        return StatusFarol.AMARELO

    if eleitos_atual == 0 and votos_atual > 0 and variacao >= 0:
        return StatusFarol.AMARELO  # sem eleito mas crescendo

    return StatusFarol.VERMELHO


async def recalcular_municipio(
    db: AsyncSession,
    municipio_id: int,
    ano_referencia: int,
    cargo: str,
    ano_anterior: int,
) -> FarolMunicipio:
    """
    Recalcula o farol de um município específico para um cargo e ano.
    """
    # IDs dos partidos do União Brasil (histórico)
    partidos_q = await db.execute(
        select(Partido.id).where(Partido.numero.in_(TODOS_NUMEROS_HISTORICOS))
    )
    partido_ids = [r[0] for r in partidos_q.fetchall()]

    async def _total_votos_eleitos(ano: int):
        q = await db.execute(
            select(
                func.sum(Candidatura.votos_total).label("votos"),
                func.count(Candidatura.id).filter(Candidatura.eleito == True).label("eleitos"),
            ).where(
                Candidatura.municipio_id == municipio_id,
                Candidatura.partido_id.in_(partido_ids),
                Candidatura.ano == ano,
                Candidatura.cargo == cargo,
            )
        )
        row = q.fetchone()
        return (row.votos or 0), (row.eleitos or 0)

    votos_atual, eleitos_atual = await _total_votos_eleitos(ano_referencia)
    votos_anterior, eleitos_anterior = await _total_votos_eleitos(ano_anterior)

    variacao_pct = None
    if votos_anterior > 0:
        variacao_pct = round((votos_atual - votos_anterior) / votos_anterior * 100, 2)

    status = _calcular_status(votos_atual, votos_anterior, eleitos_atual, eleitos_anterior)

    # Upsert
    existing = await db.execute(
        select(FarolMunicipio).where(
            FarolMunicipio.municipio_id == municipio_id,
            FarolMunicipio.ano_referencia == ano_referencia,
            FarolMunicipio.cargo == cargo,
        )
    )
    farol = existing.scalar_one_or_none()

    if farol is None:
        farol = FarolMunicipio(
            municipio_id=municipio_id,
            ano_referencia=ano_referencia,
            cargo=cargo,
        )
        db.add(farol)

    farol.status = status
    farol.votos_atual = votos_atual
    farol.votos_anterior = votos_anterior
    farol.variacao_pct = variacao_pct
    farol.eleitos_atual = eleitos_atual
    farol.eleitos_anterior = eleitos_anterior

    await db.flush()
    return farol
