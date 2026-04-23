"""
Coleta de atividades do Poder Executivo — escopo inicial: Presidente da República.

Fonte: API da Câmara dos Deputados (dadosabertos.camara.leg.br/api/v2)
  - Endpoint /proposicoes com filtro por siglaTipo e ano (a API não aceita
    dataApresentacaoFim no futuro — usa-se ano=YYYY)
  - Siglas válidas para atividade executiva:
      MSC = Mensagem ao Congresso
      PL  = Projeto de Lei (inclui PLs de autoria do Executivo)
      PEC = Proposta de Emenda à Constituição (quando de iniciativa do Executivo)

Estratégia:
  - Busca MSC e PL do ano atual e do ano anterior (últimos ~12 meses via dois anos)
  - Identifica candidato_id do Presidente Lula via Candidatura (ano=2022, cargo=PRESIDENTE)
  - Idempotente: verifica por url_fonte antes de inserir

Nota: decretos presidenciais ficam no Planalto (www.planalto.gov.br) e não estão
disponíveis via API pública estruturada sem scraping. O coletor foca em dados da
Câmara que são mais estáveis e bem documentados.

Uso:
    docker exec ub_backend python -m app.services.coleta_atividade_executivo

robots.txt da Câmara permite crawling de dadosabertos.camara.leg.br.
"""
import asyncio
import sys
from datetime import date, timedelta
from typing import Optional

import httpx


# Siglas válidas na API da Câmara mapeadas para tipo interno
_TIPO_MAP = {
    "MSC": "mensagem_congresso",  # Mensagem ao Congresso (enviada pelo Executivo)
    "PL":  "sancao",              # Projetos de Lei
    "PEC": "mensagem_congresso",  # PEC
}

_BASE_URL = "https://dadosabertos.camara.leg.br/api/v2"


async def _buscar_proposicoes_por_ano(tipo: str, ano: int) -> list[dict]:
    """Busca proposições na API da Câmara por siglaTipo + ano."""
    url = f"{_BASE_URL}/proposicoes"
    params = {
        "siglaTipo": tipo,
        "ano": ano,
        "itens": 100,
        "ordem": "DESC",
        "ordenarPor": "id",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            return data.get("dados", [])
        except httpx.HTTPError as e:
            print(f"[AVISO] Falha ao buscar {tipo}/{ano}: {e}", file=sys.stderr)
            return []


async def _buscar_detalhe(prop_id: int) -> Optional[dict]:
    """Busca detalhes de uma proposição específica."""
    url = f"{_BASE_URL}/proposicoes/{prop_id}"
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json().get("dados", {})
        except httpx.HTTPError:
            return None


async def main() -> int:
    from app.core.database import AsyncSessionLocal
    from app.models.afiliados import AtividadeExecutivo
    from app.models.eleitoral import Candidato, Candidatura
    from sqlalchemy import select, func

    async with AsyncSessionLocal() as db:
        # ------------------------------------------------------------------
        # 1. Encontra candidato_id do Presidente Lula via Candidatura (2022)
        #    cargo fica em candidaturas, não em candidatos
        # ------------------------------------------------------------------
        row = await db.execute(
            select(Candidato)
            .join(Candidatura, Candidatura.candidato_id == Candidato.id)
            .where(
                Candidato.nome_urna.ilike("%LULA%"),
                func.upper(Candidatura.cargo).in_(["PRESIDENTE", "PRESIDENTE DA REPÚBLICA"]),
                Candidatura.ano == 2022,
            )
            .order_by(Candidato.id.desc())
            .limit(1)
        )
        candidato = row.scalar_one_or_none()

        if candidato is None:
            # Tenta nome_completo sem filtro de ano
            row2 = await db.execute(
                select(Candidato)
                .join(Candidatura, Candidatura.candidato_id == Candidato.id)
                .where(
                    Candidato.nome_completo.ilike("%LUIZ INÁCIO%"),
                    func.upper(Candidatura.cargo).in_(["PRESIDENTE", "PRESIDENTE DA REPÚBLICA"]),
                )
                .order_by(Candidato.id.desc())
                .limit(1)
            )
            candidato = row2.scalar_one_or_none()

        if candidato is None:
            print(
                "AVISO: Candidato Presidente Lula não encontrado no banco. "
                "Execute o ETL de candidatos primeiro.\n"
                "Encerrando coleta sem inserções.",
                file=sys.stderr,
            )
            return 1

        print(f"Candidato identificado: id={candidato.id} nome={candidato.nome_urna}")

        # ------------------------------------------------------------------
        # 2. Define anos de interesse (atual + anterior)
        # ------------------------------------------------------------------
        hoje = date.today()
        anos = sorted({hoje.year, hoje.year - 1})

        # ------------------------------------------------------------------
        # 3. Coleta proposições por tipo e ano
        # ------------------------------------------------------------------
        total_inseridos = 0
        total_pulados = 0

        for sigla in _TIPO_MAP:
            for ano in anos:
                print(f"Buscando tipo {sigla} ano={ano}...")
                proposicoes = await _buscar_proposicoes_por_ano(sigla, ano)
                print(f"  {len(proposicoes)} registros recebidos da API")

                for prop in proposicoes:
                    prop_id = prop.get("id")
                    if not prop_id:
                        continue

                    url_fonte = f"{_BASE_URL}/proposicoes/{prop_id}"

                    # Idempotência: pula se já existe
                    row_exist = await db.execute(
                        select(AtividadeExecutivo).where(
                            AtividadeExecutivo.url_fonte == url_fonte,
                            AtividadeExecutivo.candidato_id == candidato.id,
                        )
                    )
                    if row_exist.scalar_one_or_none() is not None:
                        total_pulados += 1
                        continue

                    # Busca detalhe para data e ementa
                    detalhe = await _buscar_detalhe(prop_id)
                    ementa = ""
                    data_prop = None

                    if detalhe:
                        ementa = detalhe.get("ementa") or detalhe.get("ementaDetalhada") or ""
                        dt_str = detalhe.get("dataApresentacao") or detalhe.get("dataPublicacao")
                        if dt_str:
                            try:
                                data_prop = date.fromisoformat(dt_str[:10])
                            except ValueError:
                                data_prop = None

                    titulo = prop.get("ementa") or f"{sigla} {prop_id}"
                    if len(titulo) > 500:
                        titulo = titulo[:497] + "..."

                    tipo_interno = _TIPO_MAP.get(sigla, "decreto")

                    db.add(AtividadeExecutivo(
                        candidato_id=candidato.id,
                        data=data_prop,
                        tipo=tipo_interno,
                        titulo=titulo,
                        descricao=ementa[:2000] if ementa else None,
                        url_fonte=url_fonte,
                    ))
                    total_inseridos += 1

                await db.flush()

        await db.commit()
        print(f"\nColeta concluída: {total_inseridos} inseridos, {total_pulados} já existiam.")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
