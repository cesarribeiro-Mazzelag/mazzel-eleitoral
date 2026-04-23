"""
PASSO 1 — Seed da tabela `partidos`
Importa TODOS os partidos que aparecem nos dados TSE.
União Brasil (44) inclui predecessores DEM (25) e PSL (17) no campo predecessores.
"""
import sys
import json
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent / "codigo" / "backend"))

from sqlalchemy import text
from db import get_session, test_connection

# Partidos que aparecem nos dados TSE 2008-2024
# Lista completa dos partidos brasileiros com seus números
PARTIDOS = [
    # Número, Sigla, Nome, Predecessores (lista de números), Ativo
    (44, "UNIÃO", "União Brasil", [25, 17], True),
    (25, "DEM", "Democratas", [84], False),  # DEM extinto, virou UNIÃO
    (17, "PSL", "Partido Social Liberal", [], False),  # PSL extinto, virou UNIÃO
    (13, "PT", "Partido dos Trabalhadores", [], True),
    (45, "PSDB", "Partido da Social Democracia Brasileira", [], True),
    (15, "MDB", "Movimento Democrático Brasileiro", [], True),
    (22, "PL", "Partido Liberal", [], True),
    (20, "PSC", "Partido Social Cristão", [], True),
    (11, "PP", "Progressistas", [], True),
    (14, "PTB", "Partido Trabalhista Brasileiro", [], True),
    (12, "PDT", "Partido Democrático Trabalhista", [], True),
    (40, "PSB", "Partido Socialista Brasileiro", [], True),
    (23, "cidadania", "Cidadania", [23], True),  # era PPS
    (30, "NOVO", "Novo", [], True),
    (10, "REPUBLICANOS", "Republicanos", [10], True),  # era PRB
    (43, "PV", "Partido Verde", [], True),
    (50, "PSOL", "Partido Socialismo e Liberdade", [], True),
    (65, "PC do B", "Partido Comunista do Brasil", [], True),
    (55, "PSD", "Partido Social Democrático", [], True),
    (36, "AGIR", "Agir", [36], True),  # era PTC
    (51, "PATRIOTA", "Patriota", [51], True),  # era PEN
    (33, "PODEMOS", "Podemos", [33], True),  # era PTN
    (70, "AVANTE", "Avante", [70], True),  # era PTdoB
    (77, "SOLIDARIEDADE", "Solidariedade", [], True),
    (20, "PODE", "Podemos", [], True),
    (18, "REDE", "Rede Sustentabilidade", [], True),
    (35, "PMB", "Partido da Mulher Brasileira", [], False),
    (54, "PPL", "Partido Pátria Livre", [], False),
    (28, "PRTB", "Partido Renovação Trabalhista Brasileiro", [], True),
    (29, "PCB", "Partido Comunista Brasileiro", [], True),
    (16, "PSTU", "Partido Socialista dos Trabalhadores Unificado", [], True),
    (21, "PCO", "Partido da Causa Operária", [], True),
    (90, "PROS", "Partido Republicano da Ordem Social", [], True),
    (31, "PHS", "Partido Humanista da Solidariedade", [], False),
    (39, "SD", "Solidariedade", [], True),
    (19, "PTN", "Partido Trabalhista Nacional", [], False),
    (84, "PFL", "Partido da Frente Liberal", [], False),  # virou DEM
    (36, "PTC", "Partido Trabalhista Cristão", [], False),
    (41, "PST", "Partido Social Trabalhista", [], False),
    (27, "PSDC", "Partido Social Democrata Cristão", [], False),
    (52, "PPR", "Partido Progressista Reformador", [], False),
    (62, "PT do B", "Partido Trabalhista do Brasil", [], False),
    (67, "PEN", "Partido Ecológico Nacional", [], False),
    (71, "PSTN", "Partido Social Trabalhista Nacional", [], False),
    (72, "PSTN2", "Partido Social Trabalhista Nacional 2", [], False),
    (73, "PMN", "Partido da Mobilização Nacional", [], False),
    (74, "PRB", "Partido Republicano Brasileiro", [], False),
    (75, "DEM75", "Democratas (antigo)", [], False),
    (76, "PR", "Partido da República", [], False),  # virou PL
    (43, "PV43", "Partido Verde (antigo)", [], False),
    (79, "PRP", "Partido Republicano Progressista", [], False),
    (80, "PRONA", "Partido de Reedificação da Ordem Nacional", [], False),
    (93, "PMB93", "Partido da Mulher Brasileira (antigo)", [], False),
    (95, "PRTB95", "Partido Renovação Trabalhista Brasileiro (antigo)", [], False),
]

# Versão limpa sem duplicatas — usa dicionário {numero: dados}
PARTIDOS_MAP: dict[int, tuple] = {}
for p in PARTIDOS:
    numero = p[0]
    if numero not in PARTIDOS_MAP:
        PARTIDOS_MAP[numero] = p


def importar_partidos():
    if not test_connection():
        print("[erro] Sem conexão com o banco.")
        return False

    session = get_session()
    try:
        # Verifica quantos já existem
        existentes = session.execute(text("SELECT COUNT(*) FROM partidos")).scalar()
        print(f"[partidos] Registros existentes: {existentes}")

        inseridos = 0
        atualizados = 0

        for numero, sigla, nome, predecessores, ativo in PARTIDOS_MAP.values():
            existente = session.execute(
                text("SELECT id FROM partidos WHERE numero = :num"),
                {"num": numero}
            ).fetchone()

            if existente:
                session.execute(
                    text("""
                        UPDATE partidos
                        SET sigla = :sigla, nome = :nome,
                            predecessores = cast(:pred as jsonb), ativo = :ativo
                        WHERE numero = :num
                    """),
                    {
                        "sigla": sigla, "nome": nome,
                        "pred": json.dumps(predecessores),
                        "ativo": ativo, "num": numero,
                    }
                )
                atualizados += 1
            else:
                session.execute(
                    text("""
                        INSERT INTO partidos (numero, sigla, nome, predecessores, ativo)
                        VALUES (:num, :sigla, :nome, cast(:pred as jsonb), :ativo)
                    """),
                    {
                        "num": numero, "sigla": sigla, "nome": nome,
                        "pred": json.dumps(predecessores),
                        "ativo": ativo,
                    }
                )
                inseridos += 1

        session.commit()
        total = session.execute(text("SELECT COUNT(*) FROM partidos")).scalar()
        print(f"[partidos] Inseridos: {inseridos} | Atualizados: {atualizados} | Total: {total}")
        return True

    except Exception as e:
        session.rollback()
        print(f"[partidos] ERRO: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    print("=== Passo 1 — Importar Partidos ===\n")
    importar_partidos()
    print("\n[done]")
