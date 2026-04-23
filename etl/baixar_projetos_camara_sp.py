"""
Script: popula proposicoes_legislativo com projetos de lei dos vereadores
da Camara Municipal SP.

Endpoint (HTML): /wp-content/uploads/php/vereador_projetos.php?vereador=X&tipo=Y
  tipo=T -> em Tramitacao
  tipo=A -> Aprovadas (leis)
  tipo=V -> Vetadas (parcial ou total)

Cada <li> tem atributo data-title="Projeto de Lei Nº 647/2025" ou similar,
e link para detalhe (guardado em id_externo pra rastreabilidade).

Idempotente via UNIQUE(casa, id_externo).
"""
from __future__ import annotations
import sys
import re
import time
import html
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

from sqlalchemy import text
from db import get_session, test_connection


BASE_URL = "https://www.saopaulo.sp.leg.br/wp-content/uploads/php/vereador_projetos.php"
UA = {"User-Agent": "UBElectoralPlatform/1.0 (+contato@uniaobrasil.org.br)"}

# Mapa tipo endpoint -> (situacao default, aprovada bool|None)
TIPOS = {
    "T": ("Em tramitação", None),
    "A": ("Aprovada", True),
    "V": ("Vetada", False),
}

# Regex para parsear <li><a data-title="..." href="..."> texto </a></li>
# data-title tem o nome estruturado do projeto
_RE_LI = re.compile(
    r'<li[^>]*>\s*<a[^>]*data-title="([^"]+)"[^>]*href="([^"]*)"',
    re.IGNORECASE,
)
# Da data-title extrai sigla, numero, ano e complemento (Veto Total, etc)
_RE_PROJETO = re.compile(
    r'^(?P<sigla>[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç.\s]*?)\s+'
    r'N[º°]\s*(?P<numero>\d+)/(?P<ano>\d{4})'
    r'(?:\s*\((?P<complemento>[^)]+)\))?',
    re.IGNORECASE,
)


def _sigla_para_codigo(s: str) -> str:
    """Normaliza nome do tipo de projeto para sigla curta."""
    s = s.lower()
    if "lei complementar" in s: return "PLC"
    if "lei" in s: return "PL"
    if "resolução" in s or "resolucao" in s: return "PR"
    if "decreto" in s: return "PDL"
    if "emenda" in s: return "PEC"
    return "P"  # generico


def parsear_projetos(html_text: str) -> list[dict]:
    resultados = []
    for m in _RE_LI.finditer(html_text):
        data_title = html.unescape(m.group(1)).strip()
        href = html.unescape(m.group(2)).strip()
        m2 = _RE_PROJETO.search(data_title)
        if not m2:
            continue
        sigla = _sigla_para_codigo(m2.group("sigla"))
        numero = int(m2.group("numero"))
        ano = int(m2.group("ano"))
        complemento = (m2.group("complemento") or "").strip()
        resultados.append({
            "sigla_tipo": sigla,
            "numero": numero,
            "ano": ano,
            "complemento": complemento,
            "titulo_completo": data_title,
            "url_detalhe": href,
        })
    return resultados


def baixar_por_splegis(splegis_id: str, tipo: str) -> list[dict]:
    url = f"{BASE_URL}?vereador={splegis_id}&tipo={tipo}"
    try:
        r = requests.get(url, headers=UA, timeout=15)
        if r.status_code != 200:
            return []
        return parsear_projetos(r.text)
    except Exception as e:
        print(f"  [erro] {splegis_id}/{tipo}: {e}")
        return []


def main() -> bool:
    if not test_connection():
        return False
    session = get_session()

    # Vereadores SP com splegis_id
    rows = session.execute(text("""
        SELECT id AS mandato_id, splegis_id, nome
        FROM mandatos_legislativo
        WHERE casa = 'CAMARA_MUNICIPAL' AND splegis_id IS NOT NULL
        ORDER BY nome
    """)).fetchall()
    print(f"[sp] {len(rows)} vereadores com splegis_id")

    total_inseridos = 0
    total_atualizados = 0
    total_erros = 0

    for i, v in enumerate(rows, 1):
        for tipo, (situacao_default, aprovada) in TIPOS.items():
            projetos = baixar_por_splegis(v.splegis_id, tipo)
            for p in projetos:
                # id_externo: SPLEGIS-<vereador>-<sigla>-<numero>-<ano>-<tipo>
                # (o mesmo projeto pode aparecer em T→A→V dependendo da progressao)
                id_externo = f"SP-{p['sigla_tipo']}-{p['numero']}-{p['ano']}"
                situacao = (
                    p["complemento"] if p["complemento"] else situacao_default
                )

                existing = session.execute(text("""
                    SELECT id FROM proposicoes_legislativo
                    WHERE casa = 'CAMARA_MUNICIPAL' AND id_externo = :ext
                """), {"ext": id_externo}).fetchone()

                params = {
                    "casa": "CAMARA_MUNICIPAL",
                    "id_externo": id_externo,
                    "mandato_id": v.mandato_id,
                    "sigla_tipo": p["sigla_tipo"],
                    "numero": p["numero"],
                    "ano": p["ano"],
                    "ementa": p["url_detalhe"][:2000] if p["url_detalhe"] else None,
                    "situacao": situacao[:100],
                    "aprovada": aprovada,
                }

                try:
                    if existing:
                        session.execute(text("""
                            UPDATE proposicoes_legislativo SET
                                situacao = :situacao,
                                aprovada = :aprovada,
                                ementa = COALESCE(:ementa, ementa)
                            WHERE id = :id
                        """), {**params, "id": existing[0]})
                        total_atualizados += 1
                    else:
                        session.execute(text("""
                            INSERT INTO proposicoes_legislativo
                                (casa, id_externo, mandato_id, sigla_tipo,
                                 numero, ano, ementa, situacao, aprovada)
                            VALUES
                                (:casa, :id_externo, :mandato_id, :sigla_tipo,
                                 :numero, :ano, :ementa, :situacao, :aprovada)
                        """), params)
                        total_inseridos += 1
                except Exception as e:
                    total_erros += 1

            time.sleep(0.15)  # respeita servidor

        if i % 10 == 0:
            session.commit()
            print(f"  [{i}/{len(rows)}] commit - ins={total_inseridos} upd={total_atualizados} err={total_erros}")

    session.commit()
    session.close()
    print(f"\n=== Resumo ===")
    print(f"  Inseridos:   {total_inseridos}")
    print(f"  Atualizados: {total_atualizados}")
    print(f"  Erros:       {total_erros}")
    return True


if __name__ == "__main__":
    main()
