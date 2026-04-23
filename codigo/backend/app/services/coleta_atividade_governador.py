"""
Coleta de atividades do Governador de São Paulo (Tarcísio de Freitas).

Fonte: Portal de Legislação da Assembleia Legislativa do Estado de SP (ALESP)
  - Base URL: https://www.al.sp.gov.br/norma/?id={id}
  - Estratégia: busca sequencial de IDs em range conhecido (2023-2025)
  - Filtro: apenas "DECRETO ESTADUAL" assinados pelo Executivo

STATUS DA FONTE (21/04/2026)
-------------------------------
BLOQUEIO PARCIAL: A ALESP usa uma SPA (React/Angular) para renderizar
os resultados de pesquisa. A busca POST em /norma/pesquisa/ retorna HTML
shell sem dados; os decretos são carregados via fetch JS dinâmico.

A API REST pública da ALESP tem apenas 1 endpoint:
  GET /norma/searchPortal?q=... (autocomplete, retorna [] para "decreto estadual")

O endpoint individual /norma/?id=NNNNN retorna 200 com conteúdo parseable,
mas os IDs não são sequenciais nem previsíveis sem a listagem (que requer JS).

ALTERNATIVA IMPLEMENTADA:
  - Busca na Câmara Federal por "Mensagem" (MSC) enviada pelo Governo de SP
    ao Congresso, que passa pela ALESP antes. Filtro por UF="SP" na ementa.
  - Essa abordagem captura mensagens do Governador para o Senado/Câmara, não
    decretos estaduais diretos.

RECOMENDAÇÃO PARA COBERTURA COMPLETA:
  1. Usar Playwright/Selenium com JS habilitado para navegar ALESP.
  2. Ou solicitar acesso à API interna da ALESP via LAI (Lei de Acesso à Informação).
  3. Ou scrapar o Diário Oficial do Estado (DOSP) via IMESP - requer browser headless
     pois o portal usa challenge JS (Cloudflare-like).

Uso:
    docker exec ub_backend python -m app.services.coleta_atividade_governador

Requer migration 048 aplicada (cargo = 'governador').
"""
import asyncio
import sys
from datetime import date
from typing import Optional

import httpx


_BASE_URL_CAMARA = "https://dadosabertos.camara.leg.br/api/v2"

# Palavras-chave para identificar mensagens relacionadas ao Governo de SP
# que chegam ao Congresso Nacional (governadores enviam mensagens ao Senado
# quando há crédito extraordinário, acordo internacional, etc.)
_PALAVRAS_SP = [
    "São Paulo",
    "Estado de São Paulo",
    "Governo do Estado de São Paulo",
]


async def _buscar_proposicoes(tipo: str, ano: int) -> list[dict]:
    """Busca proposições na API da Câmara por siglaTipo + ano."""
    url = f"{_BASE_URL_CAMARA}/proposicoes"
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
            return resp.json().get("dados", [])
        except httpx.HTTPError as e:
            print(f"[AVISO] Falha ao buscar {tipo}/{ano}: {e}", file=sys.stderr)
            return []


def _ementa_menciona_sp(ementa: str) -> bool:
    """Verifica se a ementa menciona o Estado de São Paulo."""
    e = ementa.lower()
    return any(p.lower() in e for p in _PALAVRAS_SP)


async def main() -> int:
    from app.core.database import AsyncSessionLocal
    from app.models.afiliados import AtividadeExecutivo
    from app.models.eleitoral import Candidato, Candidatura
    from sqlalchemy import select, func

    async with AsyncSessionLocal() as db:
        # ------------------------------------------------------------------
        # 1. Encontra candidato_id de Tarcísio de Freitas (Gov SP 2022 - eleito)
        # ------------------------------------------------------------------
        row = await db.execute(
            select(Candidato)
            .join(Candidatura, Candidatura.candidato_id == Candidato.id)
            .where(
                Candidato.nome_completo.ilike("%TARCISIO%FREITAS%"),
                func.upper(Candidatura.cargo) == "GOVERNADOR",
                Candidatura.ano == 2022,
                Candidatura.estado_uf == "SP",
                Candidatura.eleito.is_(True),
            )
            .order_by(Candidato.id.desc())
            .limit(1)
        )
        candidato = row.scalar_one_or_none()

        if candidato is None:
            print(
                "AVISO: Candidato Tarcísio de Freitas não encontrado.\n"
                "Execute o ETL de candidatos (SP/2022/GOVERNADOR) primeiro.\n"
                "Encerrando sem inserções.",
                file=sys.stderr,
            )
            return 1

        print(f"Candidato: id={candidato.id} nome={candidato.nome_urna}")

        # ------------------------------------------------------------------
        # 2. Documenta limitação e usa fonte disponível
        # ------------------------------------------------------------------
        print(
            "\n[INFO] FONTE PARCIAL: A ALESP não possui API pública para decretos estaduais.\n"
            "       Coletando mensagens ao Congresso (tipo MSC) que mencionen SP\n"
            "       como proxy de atividade legislativa do Governo Estadual.\n"
            "       Para decretos completos: usar Playwright + DOSP (fora do escopo atual).\n"
        )

        hoje = date.today()
        anos = sorted({hoje.year, hoje.year - 1})
        total_inseridos = 0
        total_pulados = 0

        for ano in anos:
            print(f"Buscando MSC ano={ano}...")
            proposicoes = await _buscar_proposicoes("MSC", ano)
            print(f"  {len(proposicoes)} MSC encontradas")

            # Filtra apenas as que mencionam SP na ementa
            sp_props = [
                p for p in proposicoes
                if _ementa_menciona_sp(p.get("ementa", ""))
            ]
            print(f"  {len(sp_props)} relacionadas a SP")

            for prop in sp_props:
                prop_id = prop.get("id")
                if not prop_id:
                    continue

                url_fonte = f"{_BASE_URL_CAMARA}/proposicoes/{prop_id}"

                row_exist = await db.execute(
                    select(AtividadeExecutivo).where(
                        AtividadeExecutivo.url_fonte == url_fonte,
                        AtividadeExecutivo.candidato_id == candidato.id,
                    )
                )
                if row_exist.scalar_one_or_none() is not None:
                    total_pulados += 1
                    continue

                ementa = prop.get("ementa", "")
                titulo = ementa[:500] if ementa else f"MSC {prop_id}"

                dt_str = prop.get("dataApresentacao")
                data_prop = None
                if dt_str:
                    try:
                        data_prop = date.fromisoformat(dt_str[:10])
                    except ValueError:
                        pass

                db.add(AtividadeExecutivo(
                    candidato_id=candidato.id,
                    cargo="governador",
                    data=data_prop,
                    tipo="mensagem_assembleia",
                    titulo=titulo,
                    descricao=ementa[:2000] if ementa else None,
                    url_fonte=url_fonte,
                ))
                total_inseridos += 1

        await db.commit()
        print(
            f"\nColeta concluída: {total_inseridos} inseridos, {total_pulados} já existiam.\n"
            "NOTA: Resultado baixo é esperado — fonte parcial (MSC via Câmara Federal).\n"
            "      Para cobertura real de decretos estaduais SP, implementar scraping\n"
            "      do DOSP com Playwright ou aguardar API oficial da ALESP.\n"
        )
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
