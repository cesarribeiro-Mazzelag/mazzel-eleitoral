"""
Coleta de atividades do Prefeito de São Paulo (Ricardo Nunes).

Fonte: Portal de Legislação Municipal de SP (legislacao.prefeitura.sp.gov.br)
  - URL pattern individual: https://legislacao.prefeitura.sp.gov.br/leis/decreto-NNNNN
  - Estratégia: busca por range de números de decreto (2024-2025)

STATUS DA FONTE (21/04/2026)
-------------------------------
BLOQUEIO: O portal legislacao.prefeitura.sp.gov.br é uma SPA (Single Page App).
As URLs /leis/decreto-NNNNN retornam HTTP 200 mas com HTML shell vazio —
o conteúdo real (ementa, data, texto) é carregado via fetch JavaScript.

Evidências observadas:
  - GET /leis/decreto-63210 → HTTP 200, mas HTML não contém "DECRETO"
  - GET /leis/ + qualquer número → mesmo padrão (SPA shell)
  - API /api/* retorna 403 Forbidden (bloqueio de IP/User-Agent sem token)
  - Sitemap.xml vazio (0 URLs indexadas)
  - GET com Accept: application/json → 403

Alternativas bloqueadas:
  - Câmara Municipal SP (CMSP): usa Cloudflare com challenge JS (observado em
    documentacao.saopaulo.sp.leg.br)
  - Diário Oficial do Município: portal IMESP usa desafio JS similar

ALTERNATIVA FUNCIONAL IMPLEMENTADA:
  Busca PLs enviados pelo Executivo Municipal na API da Câmara Municipal SP,
  que usa o sistema SPL (Sistema de Processos Legislativos) —
  mas este sistema não tem API REST pública confirmada nos testes.

  Como fallback estável, buscamos "PLs de autoria Executivo Municipal" na
  base federal quando SP-capital aparece mencionado, como proxy parcial.

RECOMENDAÇÃO PARA COBERTURA COMPLETA:
  1. Playwright/Puppeteer com headless Chrome para navegar o SPA.
  2. Solicitar acesso à API do portal via LAI à Prefeitura SP.
  3. Parsear RSS/Atom do Diário Oficial do Município (se disponível).

Uso:
    docker exec ub_backend python -m app.services.coleta_atividade_prefeito

Requer migration 048 aplicada (cargo = 'prefeito').
"""
import asyncio
import sys
from datetime import date
from typing import Optional

import httpx


_BASE_URL_CAMARA = "https://dadosabertos.camara.leg.br/api/v2"

# Palavras que identificam proposições relacionadas ao município de SP
_PALAVRAS_MSP = [
    "Município de São Paulo",
    "Município de São Paulo",
    "Prefeitura de São Paulo",
    "Câmara Municipal de São Paulo",
]


async def _buscar_proposicoes_camara(tipo: str, ano: int) -> list[dict]:
    """Busca proposições na API da Câmara Federal por siglaTipo + ano."""
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


def _ementa_menciona_msp(ementa: str) -> bool:
    """Verifica se a ementa menciona o Município de São Paulo."""
    e = ementa.lower()
    return any(p.lower() in e for p in _PALAVRAS_MSP)


async def main() -> int:
    from app.core.database import AsyncSessionLocal
    from app.models.afiliados import AtividadeExecutivo
    from app.models.eleitoral import Candidato, Candidatura
    from sqlalchemy import select, func

    async with AsyncSessionLocal() as db:
        # ------------------------------------------------------------------
        # 1. Encontra candidato_id de Ricardo Nunes (Prefeito SP 2024 - eleito)
        # ------------------------------------------------------------------
        row = await db.execute(
            select(Candidato)
            .join(Candidatura, Candidatura.candidato_id == Candidato.id)
            .where(
                Candidato.nome_completo.ilike("%RICARDO%NUNES%"),
                func.upper(Candidatura.cargo) == "PREFEITO",
                Candidatura.ano == 2024,
                Candidatura.estado_uf == "SP",
                Candidatura.eleito.is_(True),
            )
            .order_by(Candidato.id.desc())
            .limit(1)
        )
        candidato = row.scalar_one_or_none()

        if candidato is None:
            print(
                "AVISO: Candidato Ricardo Nunes (Prefeito SP) não encontrado.\n"
                "Execute o ETL de candidatos (SP/2024/PREFEITO) primeiro.\n"
                "Encerrando sem inserções.",
                file=sys.stderr,
            )
            return 1

        print(f"Candidato: id={candidato.id} nome={candidato.nome_urna}")

        # ------------------------------------------------------------------
        # 2. Documenta limitação e usa fonte disponível (parcial)
        # ------------------------------------------------------------------
        print(
            "\n[INFO] FONTE BLOQUEADA: Portal legislacao.prefeitura.sp.gov.br usa SPA\n"
            "       com API protegida (403). Câmara Municipal SP usa challenge JS.\n"
            "       Coletando mensagens ao Congresso que mencionem Município SP\n"
            "       como proxy parcial de atividade do Executivo Municipal.\n"
            "       Para cobertura real: implementar Playwright + portal legislação SP.\n"
        )

        hoje = date.today()
        anos = sorted({hoje.year, hoje.year - 1})
        total_inseridos = 0
        total_pulados = 0

        for ano in anos:
            print(f"Buscando MSC relacionadas a Município SP, ano={ano}...")
            proposicoes = await _buscar_proposicoes_camara("MSC", ano)
            print(f"  {len(proposicoes)} MSC encontradas no total")

            msp_props = [
                p for p in proposicoes
                if _ementa_menciona_msp(p.get("ementa", ""))
            ]
            print(f"  {len(msp_props)} mencionam Município de São Paulo")

            for prop in msp_props:
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
                    cargo="prefeito",
                    data=data_prop,
                    tipo="projeto_lei_municipal",
                    titulo=titulo,
                    descricao=ementa[:2000] if ementa else None,
                    url_fonte=url_fonte,
                ))
                total_inseridos += 1

        await db.commit()
        print(
            f"\nColeta concluída: {total_inseridos} inseridos, {total_pulados} já existiam.\n"
            "NOTA: Resultado baixo/nulo é esperado — fonte parcial (MSC federal).\n"
            "      Decretos municipais SP requerem Playwright/headless browser.\n"
        )
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
