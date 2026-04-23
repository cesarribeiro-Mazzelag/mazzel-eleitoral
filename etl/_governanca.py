"""Constantes de governanca do pipeline de microzonas.

Regras imutaveis (aprovadas Cesar + GPT 14/04/2026 17h):

1. Geometria calibrada eh fonte de verdade. ETL nao sobrescreve shape.
2. manual_edit eh intocavel em QUALQUER estado (nao importa congelamento).
3. Microzona congelada (congelada_em IS NOT NULL) eh intocavel.
4. calibrada_final = TRUE eh intocavel (intencao explicita de "nao tocar mais").
5. Toda escrita em microregioes.geometry requer audit via
   `_atualizar_hash_e_audit` do ETL 23.
6. Regeneracao via ST_Union(setores) so roda com flag explicita
   (--reset-from-setores) fora do pipeline default.

Todos ETLs devem importar as constantes daqui em vez de duplicar SQL inline.
"""

# Filtro pra microzonas-alvo (as que o ETL vai processar).
# Uso: f"WHERE mr.municipio_id = :mid AND {FILTRO_ALVO}"
FILTRO_ALVO = (
    "mr.origem IN ('voronoi_v2', 'voronoi_v2_plus_manual') "
    "AND mr.congelada_em IS NULL "
    "AND mr.calibrada_final = FALSE"
)

# Filtro pra VIZINHAS (selecionadas em union/diff/boundary).
# Vizinhas tambem nao podem ser mexidas se forem manual_edit/congelada/final.
# Mesmo conjunto que FILTRO_ALVO, mas pode ser diferenciado no futuro.
FILTRO_VIZINHA = FILTRO_ALVO

# Guard pra UPDATE em microregioes (seja alvo ou vizinha).
# SEMPRE adicionar no WHERE de todo UPDATE que escreve em geometry.
# geometry IS NOT NULL eh protecao adicional (nunca sobrescreve NULL com NULL).
# Uso: f"UPDATE microregioes mr SET geometry=... WHERE mr.id=:id AND {FILTRO_UPDATE}"
FILTRO_UPDATE = (
    "mr.origem != 'manual_edit' "
    "AND mr.congelada_em IS NULL "
    "AND mr.calibrada_final = FALSE "
    "AND mr.geometry IS NOT NULL"
)

# Versao sem prefixo pra uso em subqueries sem alias:
# Uso: f"WHERE id=:id AND {FILTRO_UPDATE_SEM_ALIAS}"
FILTRO_UPDATE_SEM_ALIAS = (
    "origem != 'manual_edit' "
    "AND congelada_em IS NULL "
    "AND calibrada_final = FALSE "
    "AND geometry IS NOT NULL"
)

FILTRO_ALVO_SEM_ALIAS = (
    "origem IN ('voronoi_v2', 'voronoi_v2_plus_manual') "
    "AND congelada_em IS NULL "
    "AND calibrada_final = FALSE"
)


def checar_compliance_etl(sql_text: str, nome_etl: str) -> dict:
    """Analise estatica (heuristica) de texto SQL de um ETL.

    Retorna dict com {ok, warnings[]}. Usada em testes offline pra detectar
    UPDATEs/SELECTs que esqueceram os filtros de governanca.
    """
    import re
    warnings = []

    # Procura UPDATE microregioes sem congelada_em
    updates = re.findall(r"UPDATE\s+microregioes[^;]{0,800}?(?=;|\Z)", sql_text, re.I | re.S)
    for u in updates:
        if "congelada_em" not in u.lower():
            warnings.append(f"UPDATE sem congelada_em: {u[:120]}...")
        if "manual_edit" not in u.lower() and "origem" not in u.lower()[:600]:
            warnings.append(f"UPDATE sem filtro origem manual_edit: {u[:120]}...")
        if "calibrada_final" not in u.lower():
            warnings.append(f"UPDATE sem calibrada_final: {u[:120]}...")

    return {"ok": not warnings, "warnings": warnings, "etl": nome_etl}
