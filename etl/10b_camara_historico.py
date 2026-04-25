"""
ETL 10b — Câmara dos Deputados: legislaturas históricas (55a e 56a)

Objetivo: popular mandatos e proposições de deputados das legislaturas
anteriores à atual (57a), aumentando cobertura do dossiê para 60-70%.

Uso:
    python etl/10b_camara_historico.py --legislatura 55
    python etl/10b_camara_historico.py --legislatura 56
    python etl/10b_camara_historico.py --legislatura 56 --skip-props
    python etl/10b_camara_historico.py --legislatura 55 --max=50

Legislaturas:
    55 = 2015-2019
    56 = 2019-2023
    57 = 2023-2026 (ja coberta pelo script 10_camara_deputados.py)

SEGURANÇA CRITICA:
    O UNIQUE INDEX em mandatos_legislativo e (casa, id_externo).
    Um deputado que serviu na 55a E na 57a tem o mesmo id_externo.
    Este script usa ON CONFLICT DO NOTHING — nunca sobrescreve dados
    existentes (mandatos da 57a com presença/atividade já coletados).

    Mandatos históricos sao inseridos com ativo=FALSE para distinguir
    de mandatos em exercício.

Anos de referência para atividade:
    55a -> 2017 (meio do mandato, mais dados completos)
    56a -> 2021 (meio do mandato, mais dados completos)
"""
from __future__ import annotations

import argparse
import sys
import time
import requests
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))

from sqlalchemy import text
from db import get_session, test_connection

API = "https://dadosabertos.camara.leg.br/api/v2"
PAUSE = 0.20   # um pouco mais conservador que o script principal
TIMEOUT = 30

# Mapeamento: legislatura -> ano de referência para coleta de atividade
ANO_REFERENCIA = {
    55: 2017,
    56: 2021,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

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


def baixar_deputados(legislatura: int) -> list[dict]:
    """Lista todos os deputados de uma legislatura (paginado, deduplica por id)."""
    deputados = []
    vistos: set[int] = set()
    pagina = 1
    while True:
        data = _get(f"{API}/deputados", {
            "idLegislatura": legislatura,
            "ordem": "ASC",
            "ordenarPor": "nome",
            "itens": 100,
            "pagina": pagina,
        })
        if not data or not data.get("dados"):
            break
        novos = 0
        for dep in data["dados"]:
            dep_id = dep["id"]
            if dep_id not in vistos:
                vistos.add(dep_id)
                deputados.append(dep)
                novos += 1
        if len(data["dados"]) < 100:
            break
        pagina += 1
        time.sleep(PAUSE)

    return deputados


def baixar_detalhe_deputado(id_dep: int) -> dict | None:
    """Detalhe do deputado (foto, email, nome civil)."""
    data = _get(f"{API}/deputados/{id_dep}")
    return (data or {}).get("dados")


def baixar_proposicoes_deputado(id_dep: int, max_props: int = 1000) -> list[dict]:
    """Proposições autoradas pelo deputado."""
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


def upsert_mandato_historico(session, dep: dict, detalhe: dict | None, legislatura: int) -> tuple[int | None, bool]:
    """
    Insere mandato histórico SOMENTE se nao existe ainda.
    ON CONFLICT DO NOTHING — nunca sobrescreve a legislatura 57 ou
    qualquer dado de atividade já coletado.

    Retorna (mandato_id, inserido_agora).
    - Se inserido_agora=True: mandato novo, deve coletar proposicoes.
    - Se inserido_agora=False: ja existia (provavelmente da 57a), pular proposicoes.
    """
    nome_civil = (detalhe or {}).get("nomeCivil") or dep.get("nome")
    foto_url   = (detalhe or {}).get("ultimoStatus", {}).get("urlFoto") or dep.get("urlFoto")
    email      = (detalhe or {}).get("ultimoStatus", {}).get("gabinete", {}).get("email") or dep.get("email")

    # Tentar inserir; se conflito, nao faz nada
    res = session.execute(text("""
        INSERT INTO mandatos_legislativo
            (casa, id_externo, nome, nome_civil, partido_sigla, uf,
             legislatura, foto_url, email, ativo, atualizado_em)
        VALUES
            ('CAMARA', :id_ext, :nome, :nome_civil, :partido, :uf,
             :legislatura, :foto, :email, false, NOW())
        ON CONFLICT (casa, id_externo) DO NOTHING
        RETURNING id
    """), {
        "id_ext":      str(dep["id"]),
        "nome":        dep["nome"][:200],
        "nome_civil":  (nome_civil or "")[:300],
        "partido":     dep.get("siglaPartido", "")[:20],
        "uf":          dep.get("siglaUf", "")[:2],
        "legislatura": legislatura,
        "foto":        foto_url,
        "email":       (email or "")[:200] if email else None,
    })
    row = res.fetchone()
    if row:
        return row[0], True  # inserido agora

    # Ja existia — buscar o id para retorno
    res2 = session.execute(text("""
        SELECT id FROM mandatos_legislativo
        WHERE casa = 'CAMARA' AND id_externo = :id_ext
    """), {"id_ext": str(dep["id"])})
    existing = res2.fetchone()
    if existing:
        return existing[0], False  # existia antes (57a ou outra leg)
    return None, False


def upsert_proposicao(session, mandato_id: int, prop: dict) -> None:
    """Insere proposicao se nao existe."""
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
        ON CONFLICT (casa, id_externo) DO NOTHING
    """), {
        "id_ext":  str(prop["id"]),
        "mandato": mandato_id,
        "sigla":   (prop.get("siglaTipo") or "")[:10],
        "numero":  prop.get("numero"),
        "ano":     prop.get("ano"),
        "data":    data_apresentacao,
        "ementa":  (prop.get("ementa") or "")[:5000],
    })


def matchar_candidato_id(session, mandato_id: int, nome: str, nome_civil: str, uf: str) -> int | None:
    """Match best-effort com candidato TSE por nome + UF."""
    for nome_busca in [nome, nome_civil]:
        if not nome_busca:
            continue
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
                WHERE id = :mid AND candidato_id IS NULL
            """), {"cid": row[0], "mid": mandato_id})
            return row[0]
    return None


def main():
    parser = argparse.ArgumentParser(
        description="ETL histórico Câmara — legislaturas 55 (2015-2019) e 56 (2019-2023)"
    )
    parser.add_argument(
        "--legislatura", type=int, required=True, choices=[55, 56],
        help="Legislatura a importar: 55 (2015-2019) ou 56 (2019-2023)"
    )
    parser.add_argument(
        "--skip-props", action="store_true",
        help="Pular coleta de proposicoes (apenas mandatos)"
    )
    parser.add_argument(
        "--max", type=int, default=None, dest="max_deps",
        help="Limite de deputados (para teste)"
    )
    parser.add_argument(
        "--max-props", type=int, default=1000, dest="max_props",
        help="Limite de proposicoes por deputado (default: 1000)"
    )
    args = parser.parse_args()

    legislatura = args.legislatura
    ano_ref = ANO_REFERENCIA[legislatura]

    print(f"\n{'='*60}")
    print(f"ETL Câmara Histórico — Legislatura {legislatura}")
    print(f"Período: {'2015-2019' if legislatura == 55 else '2019-2023'}")
    print(f"Ano de referência para atividade: {ano_ref}")
    print(f"Modo: {'sem proposicoes' if args.skip_props else 'com proposicoes'}")
    print(f"{'='*60}\n")

    if not test_connection():
        sys.exit(1)

    print(f"[1/3] Baixando lista de deputados da {legislatura}a legislatura...")
    deputados = baixar_deputados(legislatura)
    if args.max_deps:
        deputados = deputados[:args.max_deps]
    print(f"  {len(deputados)} deputados unicos encontrados.\n")

    session = get_session()
    n_inseridos = 0
    n_ja_existia = 0
    n_proposicoes = 0
    n_matched = 0
    erros = []

    print(f"[2/3] Processando {len(deputados)} deputados...")
    for i, dep in enumerate(deputados, 1):
        try:
            print(
                f"  [{i:3d}/{len(deputados)}] {dep['nome']:30s} "
                f"{dep.get('siglaPartido','?'):8s} {dep.get('siglaUf','?')}",
                end="", flush=True
            )

            detalhe = baixar_detalhe_deputado(dep["id"])
            time.sleep(PAUSE)

            mandato_id, inserido = upsert_mandato_historico(session, dep, detalhe, legislatura)

            if not inserido:
                n_ja_existia += 1
                print(" [ja existia — pulado]", flush=True)
                session.commit()
                continue

            n_inseridos += 1

            # Match candidato TSE
            nome_civil = (detalhe or {}).get("nomeCivil") or ""
            cid = matchar_candidato_id(session, mandato_id, dep["nome"], nome_civil, dep.get("siglaUf", ""))
            if cid:
                n_matched += 1
                print(f" cand={cid}", end="", flush=True)

            # Proposicoes
            if not args.skip_props:
                props = baixar_proposicoes_deputado(dep["id"], max_props=args.max_props)
                for p in props:
                    upsert_proposicao(session, mandato_id, p)
                    n_proposicoes += 1
                print(f" | {len(props)} props", end="", flush=True)

            session.commit()
            print(" OK", flush=True)

        except Exception as e:
            session.rollback()
            msg = f"{dep.get('nome', '?')}: {e}"
            erros.append(msg)
            print(f" ERRO: {e}", flush=True)

    session.close()

    print(f"\n[3/3] Verificando cobertura no banco...")
    # Reconectar para verificação final
    from db import get_session as gs2
    s2 = gs2()
    try:
        res = s2.execute(text("""
            SELECT
                COALESCE(legislatura::text, 'NULL') as leg,
                COUNT(*) as total,
                COUNT(atividade_atualizada_em) as com_atividade
            FROM mandatos_legislativo
            WHERE casa = 'CAMARA'
            GROUP BY legislatura
            ORDER BY legislatura
        """))
        rows = res.fetchall()
        print(f"\n  Cobertura CAMARA por legislatura:")
        for row in rows:
            pct = round(row.com_atividade / row.total * 100, 1) if row.total else 0
            print(f"    Leg {row.leg}: {row.total} mandatos, {row.com_atividade} com atividade ({pct}%)")
    finally:
        s2.close()

    print(f"\n{'='*60}")
    print(f"RESUMO — Legislatura {legislatura}")
    print(f"  Deputados processados : {len(deputados)}")
    print(f"  Mandatos inseridos    : {n_inseridos}")
    print(f"  Ja existiam (57a)     : {n_ja_existia}")
    print(f"  Match TSE             : {n_matched} ({round(100*n_matched/max(1,n_inseridos),1)}%)")
    print(f"  Proposicoes inseridas : {n_proposicoes}")
    if erros:
        print(f"  Erros                 : {len(erros)}")
        for e in erros[:5]:
            print(f"    - {e}")
        if len(erros) > 5:
            print(f"    ... (+{len(erros)-5} mais)")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
