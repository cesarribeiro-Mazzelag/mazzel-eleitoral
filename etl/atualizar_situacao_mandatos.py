"""
Script: atualiza `mandatos_legislativo.situacao`, `condicao_eleitoral` e
detecta licenciamentos, via API publica da Camara e do Senado.

CAMARA (https://dadosabertos.camara.leg.br/):
  GET /deputados/{id} devolve ultimoStatus.situacao ("Exercicio", "Licenciado",
  "Suplencia", "Afastado", "Vacancia", "Convocado") + condicaoEleitoral.

SENADO (https://legis.senado.leg.br/dadosabertos/):
  GET /senador/{id}/historico devolve lista de mandatos com Exercicio/Licenca.

Idempotente - pode rodar quantas vezes quiser. Nao apaga, apenas UPDATEs.
"""
from __future__ import annotations
import sys
import time
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
try:
    import requests
except ImportError:
    print("requests nao instalado. pip install requests")
    sys.exit(1)

from sqlalchemy import text
from db import get_session, test_connection


HEADERS = {
    "User-Agent": "UBElectoralPlatform/1.0 (+contato@uniaobrasil.org.br)",
    "Accept": "application/json",
}
CAMARA_API = "https://dadosabertos.camara.leg.br/api/v2"
SENADO_API = "https://legis.senado.leg.br/dadosabertos"


def _detecta_licenciado_para(descricao: Optional[str]) -> Optional[str]:
    """
    Heuristica: extrai para onde o parlamentar se licenciou.
    API Camara nao tem campo estruturado - tentar via condicaoEleitoralDetalhe
    ou descricaoStatus. Quando nao consegue, None.
    """
    if not descricao:
        return None
    d = descricao.strip()
    # Ignora descricoes puramente institucionais
    if d.lower() in ("licenciado", "em exercicio", "exercicio"):
        return None
    # Remove prefixos comuns
    for prefix in ["Licenciado para ", "Licenciado ", "Afastado para "]:
        if d.lower().startswith(prefix.lower()):
            return d[len(prefix):].strip()
    return d[:200]


def atualizar_camara(session) -> tuple[int, int]:
    """
    Para cada mandato da Camara no banco, consulta a API e atualiza.
    Retorna (atualizados, erros).
    """
    rows = session.execute(text("""
        SELECT id, id_externo, nome
        FROM mandatos_legislativo
        WHERE casa = 'CAMARA'
        ORDER BY id
    """)).fetchall()

    print(f"[camara] {len(rows)} mandatos para consultar")
    ok = 0
    err = 0
    for i, r in enumerate(rows, 1):
        try:
            resp = requests.get(
                f"{CAMARA_API}/deputados/{r.id_externo}",
                headers=HEADERS, timeout=10,
            )
            if resp.status_code != 200:
                err += 1
                continue
            dados = resp.json().get("dados", {}) or {}
            ult = dados.get("ultimoStatus") or {}
            situacao = ult.get("situacao")                    # Exercicio, Licenciado, ...
            condicao = ult.get("condicaoEleitoral")           # Titular, Suplente
            # Detalhe do afastamento (quando existe, fica em "descricaoStatus")
            desc = ult.get("descricaoStatus")
            licenciado_para = (
                _detecta_licenciado_para(desc)
                if situacao and situacao.lower() != "exercício" else None
            )

            session.execute(
                text("""
                    UPDATE mandatos_legislativo
                    SET situacao = :sit,
                        condicao_eleitoral = :cond,
                        licenciado_para = :lic,
                        atualizado_em = now()
                    WHERE id = :id
                """),
                {"id": r.id, "sit": situacao, "cond": condicao, "lic": licenciado_para},
            )
            ok += 1
        except Exception as e:
            err += 1
            if err < 5:
                print(f"  [erro] {r.id_externo} ({r.nome}): {e}")

        if i % 50 == 0:
            session.commit()
            print(f"  [{i}/{len(rows)}] commit parcial - ok={ok} err={err}")
        time.sleep(0.05)  # respeita API (20req/s)

    session.commit()
    print(f"[camara] done: {ok} atualizados, {err} erros")
    return ok, err


def atualizar_senado(session) -> tuple[int, int]:
    """
    Senado API nao tem campo situacao trivial como Camara. Por enquanto,
    marca todos como 'Exercicio' + 'Titular' quando ativo=true no banco.
    TODO: consultar /senador/{id}/mandatos pra detalhe real.
    """
    res = session.execute(text("""
        UPDATE mandatos_legislativo
        SET situacao = COALESCE(situacao,
              CASE WHEN ativo THEN 'Exercício' ELSE 'Encerrado' END),
            condicao_eleitoral = COALESCE(condicao_eleitoral, 'Titular')
        WHERE casa = 'SENADO'
    """))
    session.commit()
    count = res.rowcount or 0
    print(f"[senado] {count} mandatos marcados com situacao default")
    return count, 0


def main(apenas: Optional[str] = None) -> bool:
    if not test_connection():
        return False
    session = get_session()
    try:
        if apenas in (None, "camara"):
            atualizar_camara(session)
        if apenas in (None, "senado"):
            atualizar_senado(session)
    finally:
        session.close()
    return True


if __name__ == "__main__":
    apenas = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] in ("camara", "senado") else None
    main(apenas)
