"""
Script: puxa redes sociais oficiais dos politicos via Wikidata SPARQL.

Properties consultadas:
  P2002 = Twitter/X username
  P2003 = Instagram username
  P2013 = Facebook username
  P7085 = TikTok username
  P2397 = YouTube channel ID
  P856  = Official website

Como ja temos `wikidata_qid` populado em candidatos (via ETL de bio), este
script consulta em batches de Q-ids e faz UPDATE direto por qid.

Idempotente. UPDATE sobrescreve valores existentes.
"""
from __future__ import annotations
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "codigo" / "backend"))
try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

from sqlalchemy import text
from db import get_session, test_connection


SPARQL = "https://query.wikidata.org/sparql"
UA = {"User-Agent": "UBElectoralPlatform/1.0 (+contato@uniaobrasil.org.br)"}
BATCH = 400


def baixar_redes(qids_batch: list[str]) -> list[dict]:
    """Consulta SPARQL com VALUES de Q-ids. Retorna bindings."""
    values = " ".join(f"wd:{q}" for q in qids_batch)
    q = f"""
    SELECT ?p ?twitter ?instagram ?facebook ?tiktok ?youtube ?website WHERE {{
      VALUES ?p {{ {values} }}
      OPTIONAL {{ ?p wdt:P2002 ?twitter . }}
      OPTIONAL {{ ?p wdt:P2003 ?instagram . }}
      OPTIONAL {{ ?p wdt:P2013 ?facebook . }}
      OPTIONAL {{ ?p wdt:P7085 ?tiktok . }}
      OPTIONAL {{ ?p wdt:P2397 ?youtube . }}
      OPTIONAL {{ ?p wdt:P856  ?website . }}
    }}
    """
    r = requests.get(SPARQL, params={"query": q, "format": "json"},
                     headers=UA, timeout=60)
    if r.status_code != 200:
        print(f"  [erro] SPARQL {r.status_code}")
        return []
    return r.json().get("results", {}).get("bindings", [])


def main() -> bool:
    if not test_connection():
        return False
    session = get_session()

    # Todos os candidatos que ja tem Q-id (do ETL de bio)
    rows = session.execute(text("""
        SELECT DISTINCT wikidata_qid
        FROM candidatos
        WHERE wikidata_qid IS NOT NULL
    """)).fetchall()
    qids = [r[0] for r in rows if r[0]]
    print(f"[redes] {len(qids)} Q-ids unicos para consultar")

    atualizados = 0
    for i in range(0, len(qids), BATCH):
        lote = qids[i:i + BATCH]
        try:
            bindings = baixar_redes(lote)
        except Exception as e:
            print(f"  [erro batch {i}]: {e}")
            continue

        com_dados = 0
        for b in bindings:
            qid = b.get("p", {}).get("value", "").rsplit("/", 1)[-1]
            if not qid:
                continue

            def g(k):
                v = b.get(k, {}).get("value")
                return v.strip() if v else None

            twitter = g("twitter")
            instagram = g("instagram")
            facebook = g("facebook")
            tiktok = g("tiktok")
            youtube = g("youtube")
            website = g("website")

            # Pula se nao tem nenhum dado
            if not any([twitter, instagram, facebook, tiktok, youtube, website]):
                continue

            com_dados += 1
            session.execute(
                text("""
                    UPDATE candidatos
                    SET twitter   = COALESCE(:twitter,   twitter),
                        instagram = COALESCE(:instagram, instagram),
                        facebook  = COALESCE(:facebook,  facebook),
                        tiktok    = COALESCE(:tiktok,    tiktok),
                        youtube   = COALESCE(:youtube,   youtube),
                        website   = COALESCE(:website,   website)
                    WHERE wikidata_qid = :qid
                """),
                {
                    "qid": qid,
                    "twitter": twitter[:100] if twitter else None,
                    "instagram": instagram[:100] if instagram else None,
                    "facebook": facebook[:100] if facebook else None,
                    "tiktok": tiktok[:100] if tiktok else None,
                    "youtube": youtube[:100] if youtube else None,
                    "website": website[:500] if website else None,
                },
            )

        session.commit()
        atualizados += com_dados
        print(f"  [{i+len(lote)}/{len(qids)}] +{com_dados} com dados (total={atualizados})")
        time.sleep(1)

    session.close()
    print(f"\n=== Resumo: {atualizados} Q-ids com pelo menos uma rede social ===")
    return True


if __name__ == "__main__":
    main()
