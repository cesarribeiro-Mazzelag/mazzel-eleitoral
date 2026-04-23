"""
PASSO 11 — Senado Federal (Fase 3 do Radar Político)

Baixa via API pública (sem chave):
  - Lista de senadores em exercício (81)
  - Autorias (matérias propostas) por cada senador

Fonte: https://legis.senado.leg.br/dadosabertos/

A API retorna XML por padrão. Pedimos JSON com Accept header.
O endpoint /autorias está marcado como deprecado, mas ainda responde
em 2026-04. Quando ele cair, trocar por /processo?codAutor={cod}.
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

API = "https://legis.senado.leg.br/dadosabertos"
PAUSE = 0.15
TIMEOUT = 30
HEADERS = {"Accept": "application/json"}


def _get(url: str, retries: int = 3) -> dict | None:
    """GET com retry simples."""
    for tentativa in range(retries):
        try:
            r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code == 200:
                return r.json()
            if r.status_code in (429, 500, 502, 503):
                time.sleep(2 ** tentativa)
                continue
            return None
        except requests.RequestException:
            time.sleep(2 ** tentativa)
    return None


def baixar_senadores() -> list[dict]:
    """Lista os 81 senadores em exercício."""
    data = _get(f"{API}/senador/lista/atual")
    if not data:
        return []
    parlamentares = (
        data.get("ListaParlamentarEmExercicio", {})
            .get("Parlamentares", {})
            .get("Parlamentar", [])
    )
    return parlamentares if isinstance(parlamentares, list) else [parlamentares]


def baixar_autorias_senador(cod: str, max_props: int = 50) -> list[dict]:
    """Lista autorias (matérias) propostas pelo senador."""
    data = _get(f"{API}/senador/{cod}/autorias")
    if not data:
        return []
    autorias = (
        data.get("MateriasAutoriaParlamentar", {})
            .get("Parlamentar", {})
            .get("Autorias", {})
            .get("Autoria", [])
    )
    if not autorias:
        return []
    if not isinstance(autorias, list):
        autorias = [autorias]

    # Cada item tem .Materia com {Codigo, Sigla, Numero, Ano, Ementa, Data}
    materias = []
    seen = set()
    for a in autorias:
        m = a.get("Materia") if isinstance(a, dict) else None
        if not m:
            continue
        codigo = m.get("Codigo")
        if codigo in seen:
            continue
        seen.add(codigo)
        materias.append(m)
        if len(materias) >= max_props:
            break
    return materias


def upsert_mandato(session, sen: dict) -> int:
    """Insere ou atualiza mandato do senador. Devolve mandato_id."""
    ident = sen.get("IdentificacaoParlamentar", {})
    cod = str(ident.get("CodigoParlamentar", ""))
    nome = ident.get("NomeParlamentar", "")
    nome_civil = ident.get("NomeCompletoParlamentar", "")
    partido = ident.get("SiglaPartidoParlamentar", "")
    uf = ident.get("UfParlamentar", "")
    foto = ident.get("UrlFotoParlamentar")
    email = ident.get("EmailParlamentar")

    res = session.execute(text("""
        INSERT INTO mandatos_legislativo
            (casa, id_externo, nome, nome_civil, partido_sigla, uf,
             legislatura, foto_url, email, ativo, atualizado_em)
        VALUES
            ('SENADO', :id_ext, :nome, :nome_civil, :partido, :uf,
             :legislatura, :foto, :email, true, NOW())
        ON CONFLICT (casa, id_externo) DO UPDATE SET
            nome           = EXCLUDED.nome,
            nome_civil     = EXCLUDED.nome_civil,
            partido_sigla  = EXCLUDED.partido_sigla,
            uf             = EXCLUDED.uf,
            foto_url       = EXCLUDED.foto_url,
            email          = EXCLUDED.email,
            ativo          = true,
            atualizado_em  = NOW()
        RETURNING id
    """), {
        "id_ext":      cod,
        "nome":        nome[:200],
        "nome_civil":  (nome_civil or "")[:300],
        "partido":     (partido or "")[:20],
        "uf":          (uf or "")[:2],
        "legislatura": 57,
        "foto":        foto,
        "email":       (email or "")[:200] if email else None,
    })
    return res.fetchone()[0]


def upsert_materia(session, mandato_id: int, materia: dict) -> None:
    """Insere matéria do Senado como proposicao_legislativo."""
    codigo = materia.get("Codigo")
    if not codigo:
        return
    sigla = (materia.get("Sigla") or "")[:10]
    numero = materia.get("Numero")
    ano = materia.get("Ano")
    ementa = (materia.get("Ementa") or "")[:5000]
    data_str = materia.get("Data")

    data_apresentacao = None
    if data_str:
        try:
            data_apresentacao = datetime.fromisoformat(data_str.split("T")[0]).date()
        except (ValueError, TypeError):
            data_apresentacao = None

    try:
        numero = int(numero) if numero else None
    except (ValueError, TypeError):
        numero = None
    try:
        ano = int(ano) if ano else None
    except (ValueError, TypeError):
        ano = None

    session.execute(text("""
        INSERT INTO proposicoes_legislativo
            (casa, id_externo, mandato_id, sigla_tipo, numero, ano,
             data_apresentacao, ementa)
        VALUES
            ('SENADO', :id_ext, :mandato, :sigla, :numero, :ano, :data, :ementa)
        ON CONFLICT (casa, id_externo) DO UPDATE SET
            mandato_id        = EXCLUDED.mandato_id,
            ementa            = EXCLUDED.ementa,
            data_apresentacao = EXCLUDED.data_apresentacao
    """), {
        "id_ext":  str(codigo),
        "mandato": mandato_id,
        "sigla":   sigla,
        "numero":  numero,
        "ano":     ano,
        "data":    data_apresentacao,
        "ementa":  ementa,
    })


def matchar_candidato_id(session, mandato_id: int, nome: str, nome_civil: str, uf: str) -> bool:
    """Match best-effort com candidato do TSE."""
    nomes = [n for n in [nome, nome_civil] if n]
    for nome_busca in nomes:
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
                UPDATE mandatos_legislativo SET candidato_id = :cid WHERE id = :mid
            """), {"cid": row[0], "mid": mandato_id})
            return True
    return False


def main(skip_props: bool = False, max_sens: int | None = None):
    print("=== Passo 11 — Senado Federal ===\n")
    if not test_connection():
        return

    print("[1/3] Baixando lista de senadores em exercício...")
    senadores = baixar_senadores()
    if max_sens:
        senadores = senadores[:max_sens]
    print(f"  {len(senadores)} senadores encontrados.\n")

    session = get_session()
    n_mandatos = 0
    n_materias = 0
    n_matched = 0

    for i, sen in enumerate(senadores, 1):
        try:
            ident = sen.get("IdentificacaoParlamentar", {})
            nome = ident.get("NomeParlamentar", "?")
            partido = ident.get("SiglaPartidoParlamentar", "?")
            uf = ident.get("UfParlamentar", "?")
            cod = str(ident.get("CodigoParlamentar", ""))

            print(f"  [{i:3d}/{len(senadores)}] {nome:30s} {partido:8s} {uf}", end="", flush=True)

            mandato_id = upsert_mandato(session, sen)
            n_mandatos += 1

            nome_civil = ident.get("NomeCompletoParlamentar", "")
            if matchar_candidato_id(session, mandato_id, nome, nome_civil, uf):
                n_matched += 1
                print(" ✓match", end="", flush=True)

            if not skip_props:
                materias = baixar_autorias_senador(cod, max_props=50)
                for m in materias:
                    upsert_materia(session, mandato_id, m)
                    n_materias += 1
                print(f" · {len(materias)} matérias", end="", flush=True)

            session.commit()
            print()
            time.sleep(PAUSE)

        except Exception as e:
            print(f"  [erro] {e}")
            session.rollback()

    session.close()
    print(f"\n[done] {n_mandatos} mandatos · {n_matched} matched ({100*n_matched/max(1,n_mandatos):.0f}%) · {n_materias} matérias")


if __name__ == "__main__":
    skip_props = "--skip-props" in sys.argv
    max_sens = None
    for arg in sys.argv[1:]:
        if arg.startswith("--max="):
            max_sens = int(arg.split("=")[1])
    main(skip_props=skip_props, max_sens=max_sens)
