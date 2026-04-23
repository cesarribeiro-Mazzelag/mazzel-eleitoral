"""
PASSO 10 - PIB per capita municipal
Importa dados de PIB per capita do IBGE (Pesquisa 38, indicador 47001)
para todos os municípios da tabela `municipios`.

Fonte: IBGE - Produto Interno Bruto dos Municípios
API: servicodados.ibge.gov.br
Ano mais recente disponível: 2023
"""
import sys
import time
import requests
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent / "codigo" / "backend"))

from sqlalchemy import text
from db import get_session, test_connection

# IBGE Pesquisa 38 = PIB Municipal, indicador 47001 = PIB per capita
IBGE_API = "https://servicodados.ibge.gov.br/api/v1/pesquisas/38/periodos/{ano}/indicadores/47001/resultados/{codigos}"
ANO = "2023"
BATCH_SIZE = 100  # municípios por request (evitar URL muito longa)


def buscar_codigos_ibge(session):
    """Retorna lista de (codigo_ibge_7dig, id) de todos os municípios."""
    rows = session.execute(
        text("SELECT id, codigo_ibge FROM municipios WHERE codigo_ibge IS NOT NULL ORDER BY codigo_ibge")
    ).fetchall()
    return [(r[1], r[0]) for r in rows]  # (codigo_ibge, id)


def fetch_pib_batch(codigos_7dig):
    """
    Busca PIB per capita para um lote de municípios.
    A API usa código IBGE de 7 dígitos.
    Retorna dict {localidade_6dig: valor_float}
    """
    # A API aceita códigos separados por |
    codigos_str = "|".join(codigos_7dig)
    url = IBGE_API.format(ano=ANO, codigos=codigos_str)

    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    data = resp.json()

    resultado = {}
    if data and isinstance(data, list) and len(data) > 0:
        for item in data[0].get("res", []):
            loc = item.get("localidade", "")
            val_str = item.get("res", {}).get(ANO)
            if val_str and val_str not in ("...", "-", "X"):
                try:
                    resultado[loc] = float(val_str)
                except (ValueError, TypeError):
                    pass
    return resultado


def importar_pib():
    if not test_connection():
        print("[erro] Sem conexão com o banco.")
        return False

    session = get_session()
    try:
        municipios = buscar_codigos_ibge(session)
        total = len(municipios)
        print(f"[pib] Total de municípios no banco: {total}")

        # Mapear codigo_ibge_7dig -> id
        mapa_id = {cod: mid for cod, mid in municipios}
        # Mapear localidade_6dig -> codigo_ibge_7dig
        # A API retorna localidade sem o dígito verificador (6 dígitos)
        mapa_6para7 = {}
        for cod7, _ in municipios:
            cod6 = cod7[:6]
            mapa_6para7[cod6] = cod7

        codigos_7 = [cod for cod, _ in municipios]
        atualizados = 0
        sem_dado = 0
        erros_api = 0

        for i in range(0, len(codigos_7), BATCH_SIZE):
            batch = codigos_7[i:i + BATCH_SIZE]
            batch_num = i // BATCH_SIZE + 1
            total_batches = (len(codigos_7) + BATCH_SIZE - 1) // BATCH_SIZE

            try:
                resultado = fetch_pib_batch(batch)
                print(f"  [batch {batch_num}/{total_batches}] {len(batch)} enviados, {len(resultado)} com dado")

                for loc6, valor in resultado.items():
                    cod7 = mapa_6para7.get(loc6)
                    if cod7 and cod7 in mapa_id:
                        session.execute(
                            text("UPDATE municipios SET pib_per_capita = :val WHERE codigo_ibge = :cod"),
                            {"val": valor, "cod": cod7}
                        )
                        atualizados += 1

                sem_dado += len(batch) - len(resultado)

            except requests.RequestException as e:
                print(f"  [batch {batch_num}] ERRO API: {e}")
                erros_api += len(batch)

            # Pausa entre requests para não sobrecarregar a API
            if i + BATCH_SIZE < len(codigos_7):
                time.sleep(0.5)

        session.commit()

        # Verificação
        preenchidos = session.execute(
            text("SELECT COUNT(*) FROM municipios WHERE pib_per_capita IS NOT NULL AND pib_per_capita > 0")
        ).scalar()

        print(f"\n[pib] Resultado:")
        print(f"  Atualizados: {atualizados}")
        print(f"  Sem dado na API: {sem_dado}")
        print(f"  Erros de API: {erros_api}")
        print(f"  Total com PIB no banco: {preenchidos}/{total}")

        # Amostra de verificação
        amostra = session.execute(
            text("""
                SELECT nome, estado_uf, codigo_ibge, pib_per_capita
                FROM municipios
                WHERE pib_per_capita IS NOT NULL AND pib_per_capita > 0
                ORDER BY pib_per_capita DESC
                LIMIT 10
            """)
        ).fetchall()

        print(f"\n[pib] Top 10 PIB per capita:")
        for m in amostra:
            print(f"  {m[0]} ({m[1]}) - R$ {m[3]:,.2f}")

        return True

    except Exception as e:
        session.rollback()
        print(f"[pib] ERRO: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    print("=== Passo 10 - PIB per capita municipal (IBGE) ===\n")
    importar_pib()
    print("\n[done]")
