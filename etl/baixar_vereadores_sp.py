"""
Script: baixa vereadores da Camara Municipal de Sao Paulo via WP REST API.

Endpoint: https://www.saopaulo.sp.leg.br/wp-json/wp/v2/vereador

Match: por nome_completo normalizado vs candidatos do banco. Aceita ids
unificados (mesmo politico em ciclos diferentes).

Popula tabela `mandatos_legislativo` com casa=CAMARA_MUNICIPAL,
municipio_id=sao paulo, splegis_id=ID no sistema de projetos de lei
(usado depois no Sprint 2 para scraping de proposicoes).
"""
from __future__ import annotations
import sys
import time
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

from sqlalchemy import text
from db import get_session, test_connection


WP_API = "https://www.saopaulo.sp.leg.br/wp-json/wp/v2/vereador"
UA = {"User-Agent": "UBElectoralPlatform/1.0 (+contato@uniaobrasil.org.br)"}

# Sao Paulo: codigo IBGE = 3550308
MUNICIPIO_IBGE_SP = 3550308


def _norm(s: str) -> str:
    if not s: return ""
    nfd = unicodedata.normalize("NFD", s.upper())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn").strip()


def _get_meta(vereador: dict, key: str):
    m = vereador.get("meta_all") or {}
    v = m.get(key)
    if isinstance(v, list) and v:
        return v[0]
    return v


def baixar_vereadores() -> list[dict]:
    """Paginacao: per_page=100. Total ~190 = 2 paginas."""
    todos = []
    page = 1
    while True:
        r = requests.get(WP_API, params={"per_page": 100, "page": page},
                         headers=UA, timeout=30)
        if r.status_code != 200:
            if r.status_code == 400 and page > 1:
                break  # pagina alem do fim
            print(f"  [erro] HTTP {r.status_code} na pagina {page}")
            break
        lista = r.json()
        if not lista:
            break
        print(f"  [wp] pagina {page}: {len(lista)} vereadores")
        todos.extend(lista)
        if len(lista) < 100:
            break
        page += 1
        time.sleep(0.5)
    return todos


def main() -> bool:
    if not test_connection():
        return False
    session = get_session()

    # Municipio SP
    row = session.execute(
        text("SELECT id FROM municipios WHERE codigo_ibge = :c"),
        {"c": str(MUNICIPIO_IBGE_SP)}
    ).fetchone()
    if not row:
        print(f"[erro] municipio IBGE {MUNICIPIO_IBGE_SP} nao encontrado no banco")
        session.close()
        return False
    municipio_id_sp = row[0]
    print(f"[sp] municipio_id = {municipio_id_sp}")

    # Index candidatos por nome (unifica ids do mesmo nome_completo)
    print("[match] carregando candidatos...")
    rows = session.execute(text("""
        SELECT id, nome_completo, nome_urna FROM candidatos
        WHERE nome_completo IS NOT NULL
    """)).fetchall()
    id_to_nc = {r.id: r.nome_completo for r in rows}
    idx: dict[str, list[int]] = {}
    for r in rows:
        if r.nome_completo:
            idx.setdefault(_norm(r.nome_completo), []).append(r.id)
        if r.nome_urna:
            k = _norm(r.nome_urna)
            if k and r.id not in idx.get(k, []):
                idx.setdefault(k, []).append(r.id)
    print(f"  {len(rows)} candidatos, {len(idx)} chaves de match")

    print("[wp] baixando vereadores SP...")
    vereadores = baixar_vereadores()
    print(f"[wp] {len(vereadores)} vereadores recebidos")

    inseridos = 0
    atualizados = 0
    sem_match = 0
    homonimo = 0

    for v in vereadores:
        nome_completo = _get_meta(v, "_cmsp_vereador_nome_completo") or v.get("title", {}).get("rendered", "")
        splegis_id = _get_meta(v, "_cmsp_vereador_consulta_splegis_id")
        partido = _get_meta(v, "_cmsp_vereador_party")
        ativo_flag = _get_meta(v, "_cmsp_vereador_ativo")
        foto_url = _get_meta(v, "_cmsp_vereador_image")
        email = _get_meta(v, "_cmsp_vereador_contato_email")
        id_externo = str(v.get("id"))

        if not nome_completo:
            continue

        # Tenta match por nome_completo; fallback: title (nome parlamentar)
        nome_parlamentar = v.get("title", {}).get("rendered", "")
        candidato_id = None
        for chave_nome in [nome_completo, nome_parlamentar]:
            ids = idx.get(_norm(chave_nome), [])
            if not ids:
                continue
            # Se todos apontam pro mesmo nome_completo, ok
            ncs = {id_to_nc.get(i) for i in ids}
            if len(ncs) == 1:
                candidato_id = ids[0]  # pega o primeiro (qualquer ID duplicado serve como ancora)
                break

        if not candidato_id:
            # Verifica se foi sem match ou homonimo real
            found_any = any(idx.get(_norm(n)) for n in [nome_completo, nome_parlamentar])
            if found_any:
                homonimo += 1
            else:
                sem_match += 1
            continue

        ativo = (ativo_flag or "").lower() == "on"
        situacao = "Exercício" if ativo else "Encerrado"

        # Upsert pelo id_externo (casa + id_externo sao UNIQUE)
        existing = session.execute(text("""
            SELECT id FROM mandatos_legislativo
            WHERE casa = 'CAMARA_MUNICIPAL' AND id_externo = :ext
        """), {"ext": id_externo}).fetchone()

        params = {
            "casa": "CAMARA_MUNICIPAL",
            "id_externo": id_externo,
            "nome": nome_parlamentar[:200],
            "nome_civil": nome_completo[:300],
            "partido_sigla": (partido or "")[:20] or None,
            "uf": "SP",
            "legislatura": None,
            "foto_url": foto_url,
            "email": email[:200] if email else None,
            "candidato_id": candidato_id,
            "ativo": ativo,
            "municipio_id": municipio_id_sp,
            "splegis_id": splegis_id,
            "situacao": situacao,
            "condicao_eleitoral": "Titular" if ativo else None,
        }

        if existing:
            session.execute(text("""
                UPDATE mandatos_legislativo SET
                    nome = :nome,
                    nome_civil = :nome_civil,
                    partido_sigla = :partido_sigla,
                    uf = :uf,
                    foto_url = COALESCE(:foto_url, foto_url),
                    email = COALESCE(:email, email),
                    candidato_id = :candidato_id,
                    ativo = :ativo,
                    municipio_id = :municipio_id,
                    splegis_id = :splegis_id,
                    situacao = :situacao,
                    condicao_eleitoral = COALESCE(:condicao_eleitoral, condicao_eleitoral),
                    atualizado_em = now()
                WHERE id = :id
            """), {**params, "id": existing[0]})
            atualizados += 1
        else:
            session.execute(text("""
                INSERT INTO mandatos_legislativo
                    (casa, id_externo, nome, nome_civil, partido_sigla, uf,
                     legislatura, foto_url, email, candidato_id, ativo,
                     municipio_id, splegis_id, situacao, condicao_eleitoral)
                VALUES
                    (:casa, :id_externo, :nome, :nome_civil, :partido_sigla, :uf,
                     :legislatura, :foto_url, :email, :candidato_id, :ativo,
                     :municipio_id, :splegis_id, :situacao, :condicao_eleitoral)
            """), params)
            inseridos += 1

    session.commit()
    session.close()
    print(f"\n=== Resumo ===")
    print(f"  Inseridos:          {inseridos}")
    print(f"  Atualizados:        {atualizados}")
    print(f"  Sem match no banco: {sem_match}")
    print(f"  Homonimos:          {homonimo}")
    return True


if __name__ == "__main__":
    main()
