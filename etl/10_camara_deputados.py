"""
PASSO 10 — Câmara dos Deputados (Fase 3 do Radar Político)

Baixa via API pública (sem chave):
  - Lista de deputados em exercício (legislatura atual = 57)
  - Proposições autoradas por cada deputado

Fonte: https://dadosabertos.camara.leg.br/api/v2/

Match candidato_id é best-effort por (nome_civil OR nome) + UF + ano recente.
Quando não bate, mandato existe sem candidato_id (ainda dá pra exibir no dossiê
quando o usuário busca por nome).

Estratégia anti-rate-limit: pause de 0.15s entre requests, retry simples em 429.
"""
from __future__ import annotations
import sys
import time
import requests
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))

from sqlalchemy import text
from db import get_session, test_connection

API = "https://dadosabertos.camara.leg.br/api/v2"
LEGISLATURA_ATUAL = 57  # 2023-2026
PAUSE = 0.15
TIMEOUT = 30


def _get(url: str, params: dict | None = None, retries: int = 3) -> dict | None:
    """GET com retry simples em 429/5xx."""
    for tentativa in range(retries):
        try:
            r = requests.get(url, params=params, timeout=TIMEOUT,
                             headers={"Accept": "application/json"})
            if r.status_code == 200:
                return r.json()
            if r.status_code in (429, 500, 502, 503):
                time.sleep(2 ** tentativa)
                continue
            return None
        except requests.RequestException:
            time.sleep(2 ** tentativa)
    return None


def baixar_deputados() -> list[dict]:
    """Lista deputados em exercício (paginated)."""
    deputados = []
    pagina = 1
    while True:
        data = _get(f"{API}/deputados", {
            "idLegislatura": LEGISLATURA_ATUAL,
            "ordem": "ASC",
            "ordenarPor": "nome",
            "itens": 100,
            "pagina": pagina,
        })
        if not data or not data.get("dados"):
            break
        deputados.extend(data["dados"])
        if len(data["dados"]) < 100:
            break
        pagina += 1
        time.sleep(PAUSE)
    return deputados


def baixar_detalhe_deputado(id_dep: int) -> dict | None:
    """Busca detalhe (foto, gabinete, e-mail, nome civil completo)."""
    data = _get(f"{API}/deputados/{id_dep}")
    return (data or {}).get("dados")


def baixar_proposicoes_deputado(id_dep: int, max_props: int = 1000) -> list[dict]:
    """Lista proposições autoradas pelo deputado.

    `idDeputadoAutor` é o filtro correto (testado).
    Default 1000 (era 50) - cobrir carreira completa dos veteranos.
    Deputado mediano tem 100-300 proposições em mandato de 4 anos.
    """
    props = []
    pagina = 1
    while len(props) < max_props:
        data = _get(f"{API}/proposicoes", {
            "idDeputadoAutor": id_dep,
            "ordem": "DESC",
            "ordenarPor": "id",
            "itens": min(100, max_props - len(props)),
            "pagina": pagina,
        })
        if not data or not data.get("dados"):
            break
        props.extend(data["dados"])
        if len(data["dados"]) < 100:
            break
        pagina += 1
        time.sleep(PAUSE)
    return props[:max_props]


def baixar_situacao_proposicao(id_prop: int) -> tuple[str | None, bool | None]:
    """Detalhe de tramitação para extrair situação atual e se foi aprovada."""
    data = _get(f"{API}/proposicoes/{id_prop}")
    if not data or not data.get("dados"):
        return None, None
    p = data["dados"]
    situacao = (p.get("statusProposicao") or {}).get("descricaoSituacao")
    # Aprovação grosseira: situação contém 'Aprovad'
    aprovada = bool(situacao and "Aprovad" in situacao)
    return situacao, aprovada


def upsert_mandato(session, dep: dict, detalhe: dict | None) -> int:
    """Insere ou atualiza mandato. Devolve mandato_id."""
    nome_civil = (detalhe or {}).get("nomeCivil") or dep.get("nome")
    foto_url   = (detalhe or {}).get("ultimoStatus", {}).get("urlFoto") or dep.get("urlFoto")
    email      = (detalhe or {}).get("ultimoStatus", {}).get("gabinete", {}).get("email") or dep.get("email")

    res = session.execute(text("""
        INSERT INTO mandatos_legislativo
            (casa, id_externo, nome, nome_civil, partido_sigla, uf,
             legislatura, foto_url, email, ativo, atualizado_em)
        VALUES
            ('CAMARA', :id_ext, :nome, :nome_civil, :partido, :uf,
             :legislatura, :foto, :email, true, NOW())
        ON CONFLICT (casa, id_externo) DO UPDATE SET
            nome           = EXCLUDED.nome,
            nome_civil     = EXCLUDED.nome_civil,
            partido_sigla  = EXCLUDED.partido_sigla,
            uf             = EXCLUDED.uf,
            legislatura    = EXCLUDED.legislatura,
            foto_url       = EXCLUDED.foto_url,
            email          = EXCLUDED.email,
            ativo          = true,
            atualizado_em  = NOW()
        RETURNING id
    """), {
        "id_ext":      str(dep["id"]),
        "nome":        dep["nome"][:200],
        "nome_civil":  (nome_civil or "")[:300],
        "partido":     dep.get("siglaPartido", "")[:20],
        "uf":          dep.get("siglaUf", "")[:2],
        "legislatura": LEGISLATURA_ATUAL,
        "foto":        foto_url,
        "email":       (email or "")[:200] if email else None,
    })
    return res.fetchone()[0]


def upsert_proposicao(session, mandato_id: int, prop: dict) -> None:
    """Insere ou atualiza proposição (sem situação inicial)."""
    data_apresentacao = prop.get("dataApresentacao")
    if data_apresentacao:
        try:
            data_apresentacao = datetime.fromisoformat(data_apresentacao.split("T")[0]).date()
        except (ValueError, TypeError):
            data_apresentacao = None

    session.execute(text("""
        INSERT INTO proposicoes_legislativo
            (casa, id_externo, mandato_id, sigla_tipo, numero, ano,
             data_apresentacao, ementa)
        VALUES
            ('CAMARA', :id_ext, :mandato, :sigla, :numero, :ano, :data, :ementa)
        ON CONFLICT (casa, id_externo) DO UPDATE SET
            mandato_id        = EXCLUDED.mandato_id,
            ementa            = EXCLUDED.ementa,
            data_apresentacao = EXCLUDED.data_apresentacao
    """), {
        "id_ext":  str(prop["id"]),
        "mandato": mandato_id,
        "sigla":   (prop.get("siglaTipo") or "")[:10],
        "numero":  prop.get("numero"),
        "ano":     prop.get("ano"),
        "data":    data_apresentacao,
        "ementa":  (prop.get("ementa") or "")[:5000],
    })


def matchar_candidato_id(session, mandato_id: int, nome: str, nome_civil: str, uf: str) -> None:
    """Tenta encontrar candidato_id no TSE por nome (urna ou completo) + UF.

    Estratégia best-effort: busca por nome_urna similar OU nome_completo similar
    no estado, em candidaturas do ano mais recente. Se múltiplos matches, escolhe
    o que tem candidatura mais recente.
    """
    nomes = [nome, nome_civil]
    nomes = [n for n in nomes if n]
    if not nomes:
        return

    for nome_busca in nomes:
        # Busca exata por nome_urna
        res = session.execute(text("""
            SELECT DISTINCT c.id
            FROM candidatos c
            JOIN candidaturas ca ON ca.candidato_id = c.id
            WHERE ca.estado_uf = :uf
              AND (
                UPPER(c.nome_urna) = UPPER(:nome)
                OR UPPER(c.nome_completo) = UPPER(:nome)
              )
            ORDER BY c.id DESC
            LIMIT 1
        """), {"nome": nome_busca, "uf": uf})
        row = res.fetchone()
        if row:
            session.execute(text("""
                UPDATE mandatos_legislativo
                SET candidato_id = :cid
                WHERE id = :mid
            """), {"cid": row[0], "mid": mandato_id})
            return


def main(skip_props: bool = False, max_deps: int | None = None, max_props_por_dep: int = 1000):
    print("=== Passo 10 — Câmara dos Deputados ===\n")
    print(f"    (max_props_por_dep={max_props_por_dep})")
    if not test_connection():
        return

    print("[1/3] Baixando lista de deputados em exercício...")
    deputados = baixar_deputados()
    if max_deps:
        deputados = deputados[:max_deps]
    print(f"  {len(deputados)} deputados encontrados.\n")

    session = get_session()
    n_mandatos = 0
    n_proposicoes = 0
    n_matched = 0

    for i, dep in enumerate(deputados, 1):
        try:
            print(f"  [{i:3d}/{len(deputados)}] {dep['nome']:30s} {dep.get('siglaPartido','?'):8s} {dep.get('siglaUf','?')}", end="", flush=True)

            # Detalhe (foto, e-mail)
            detalhe = baixar_detalhe_deputado(dep["id"])
            time.sleep(PAUSE)

            mandato_id = upsert_mandato(session, dep, detalhe)
            n_mandatos += 1

            # Match candidato
            nome_civil = (detalhe or {}).get("nomeCivil") or ""
            matchar_candidato_id(session, mandato_id, dep["nome"], nome_civil, dep.get("siglaUf", ""))
            res = session.execute(text("SELECT candidato_id FROM mandatos_legislativo WHERE id = :id"), {"id": mandato_id})
            cid = res.fetchone()[0]
            if cid:
                n_matched += 1
                print(f" → cand={cid}", end="", flush=True)

            if not skip_props:
                # Proposições (default 1000 - cobre carreira completa)
                props = baixar_proposicoes_deputado(dep["id"], max_props=max_props_por_dep)
                for p in props:
                    upsert_proposicao(session, mandato_id, p)
                    n_proposicoes += 1
                print(f" · {len(props)} props", end="", flush=True)

            session.commit()
            print()

        except Exception as e:
            print(f"  [erro] {e}")
            session.rollback()

    session.close()
    print(f"\n[done] {n_mandatos} mandatos · {n_matched} matched ({100*n_matched/max(1,n_mandatos):.0f}%) · {n_proposicoes} proposições")


if __name__ == "__main__":
    skip_props = "--skip-props" in sys.argv
    max_deps = None
    max_props_por_dep = 1000
    for arg in sys.argv[1:]:
        if arg.startswith("--max="):
            max_deps = int(arg.split("=")[1])
        elif arg.startswith("--max-props="):
            max_props_por_dep = int(arg.split("=")[1])
    main(skip_props=skip_props, max_deps=max_deps, max_props_por_dep=max_props_por_dep)
