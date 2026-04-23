"""
Helpers para cálculo de nivel_farol (0..5) e score_normalizado (0..1)
nas properties dos GeoJSON do mapa eleitoral.

Esses campos COEXISTEM com status_farol categorial — não substituem.
O frontend novo lê apenas nivel_farol; o código antigo continua lendo status_farol.

Regras (spec aprovada):
- score 0 → nivel 0 obrigatório
- score_max inválido → nivel 0
- normalização é por cohort (a própria FeatureCollection)
- 6 buckets: 0 = ausência absoluta, 1..5 = gradiente proporcional
"""
from __future__ import annotations
from math import floor
from typing import Callable

NIVEL_MAX = 5

ScoreFn = Callable[[dict], float]


def calcular_nivel_farol(
    score: float | None, score_max: float | None
) -> int:
    """
    Converte score absoluto em nivel_farol (0..5) dado o máximo do cohort.

    - score None ou <= 0  → 0
    - score_max inválido  → 0
    - score >= score_max  → 5
    - caso geral: floor(score / score_max * 5) + 1, limitado a 5
    """
    if score is None or score <= 0:
        return 0
    if score_max is None or score_max <= 0:
        return 0
    norm = float(score) / float(score_max)
    if norm >= 1.0:
        return NIVEL_MAX
    nivel = int(floor(norm * NIVEL_MAX)) + 1
    return min(nivel, NIVEL_MAX)


def calcular_score_normalizado(
    score: float | None, score_max: float | None
) -> float:
    """Retorna score/score_max truncado em [0,1]. Inputs inválidos → 0.0"""
    if score is None or score <= 0:
        return 0.0
    if score_max is None or score_max <= 0:
        return 0.0
    return min(float(score) / float(score_max), 1.0)


def enriquecer_features(
    features: list[dict],
    score_fn: ScoreFn,
) -> list[dict]:
    """
    Adiciona properties.score_normalizado e properties.nivel_farol em
    cada feature da coleção. Modifica in-place e retorna a lista.

    O cohort de normalização é a própria FeatureCollection
    (score_max = maior valor produzido por score_fn entre as features).

    Args:
        features: Lista de features GeoJSON (cada uma com `properties` dict).
        score_fn: Função que recebe `properties` e devolve score numérico.
                  Use as funções em SCORE_FNS para os casos padrão do mapa.
    """
    if not features:
        return features

    valores: list[float] = []
    for f in features:
        props = f.get("properties") or {}
        try:
            valor = float(score_fn(props) or 0)
        except (TypeError, ValueError):
            valor = 0.0
        valores.append(valor if valor > 0 else 0.0)

    score_max = max(valores) if valores else 0.0

    for feature, valor in zip(features, valores):
        props = feature.setdefault("properties", {})
        props["score_normalizado"] = calcular_score_normalizado(valor, score_max)
        props["nivel_farol"] = calcular_nivel_farol(valor, score_max)

    return features


# ── Extratores prontos para os branches do mapa.py ───────────────────────────
# Cada função recebe `properties` dict e devolve o score numérico do território.


def _f(props: dict, key: str) -> float:
    """Coerção segura de properties[key] para float."""
    v = props.get(key)
    if v is None:
        return 0.0
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


SCORE_FNS: dict[str, ScoreFn] = {
    # Voto bruto do território (município ou estado)
    "votos": lambda p: _f(p, "votos"),
    # Voto consolidado de um estado (modo=votos do /brasil)
    "total_votos": lambda p: _f(p, "total_votos"),
    # Estado avaliado pelo nº de eleitos do partido dominante
    "eleitos_dominante": lambda p: _f(p, "eleitos_dominante"),
    # Modo VIGENTES: usa score ponderado pré-calculado pelo SQL
    "score_ponderado": lambda p: _f(p, "score_ponderado"),
    # Brasil + partido específico: composto a partir das contagens de cores
    # (5×azul + 3×verde + 1×amarelo; vermelho não pontua)
    "estado_partido_composite": lambda p: (
        5.0 * _f(p, "azuis")
        + 3.0 * _f(p, "verdes")
        + 1.0 * _f(p, "amarelos")
    ),
}


# ─────────────────────────────────────────────────────────────────────────────
# Variante PERCENTIL — usada quando a distribuição é muito skewed
# (caso típico: candidato a governador onde 1 município concentra muito voto)
# ─────────────────────────────────────────────────────────────────────────────

def enriquecer_features_percentil(
    features: list[dict],
    score_fn: ScoreFn,
) -> list[dict]:
    """
    Versão alternativa de enriquecer_features que usa **rank percentil** em vez
    de normalização linear pelo MAX.

    Por que existe:
        Para candidato a governador/presidente, 1 município (a capital) pode
        concentrar 30%+ dos votos. Normalização linear (score/score_max) esmaga
        todo o resto: capital=1.0, todos os outros < 0.2 → caem em nivel 1.
        O mapa fica todo "fraco" exceto a capital.

    Como funciona:
        1. Score 0 → nivel 0 obrigatório (preserva semântica de "ausente")
        2. Score > 0 → calcula percentil_rank ENTRE OS COM VOTO
           - top 10% → nivel 5
           - top 25% → nivel 4
           - top 50% → nivel 3
           - top 75% → nivel 2
           - resto   → nivel 1
        3. Empates: usa ordem lexicográfica do score (estável)

    Resultado: cada nivel_farol fica com proporções equivalentes,
    o mapa pinta de forma DISTRIBUÍDA, gradiente bonito.
    """
    if not features:
        return features

    # Calcula valores
    valores: list[float] = []
    for f in features:
        props = f.get("properties") or {}
        try:
            valor = float(score_fn(props) or 0)
        except (TypeError, ValueError):
            valor = 0.0
        valores.append(valor if valor > 0 else 0.0)

    # Ordena APENAS os valores > 0 (preserva 0 = ausente)
    valores_com_voto = sorted(v for v in valores if v > 0)
    n = len(valores_com_voto)

    if n == 0:
        # Sem nenhum município com voto — tudo nivel 0
        for feature in features:
            props = feature.setdefault("properties", {})
            props["score_normalizado"] = 0.0
            props["nivel_farol"] = 0
        return features

    # Thresholds por percentil (top 10/25/50/75)
    p90 = valores_com_voto[int(n * 0.90)] if n >= 10 else valores_com_voto[-1]
    p75 = valores_com_voto[int(n * 0.75)] if n >= 4  else valores_com_voto[-1]
    p50 = valores_com_voto[int(n * 0.50)] if n >= 2  else valores_com_voto[0]
    p25 = valores_com_voto[int(n * 0.25)] if n >= 4  else valores_com_voto[0]

    score_max = valores_com_voto[-1] or 1.0

    for feature, valor in zip(features, valores):
        props = feature.setdefault("properties", {})
        if valor <= 0:
            props["score_normalizado"] = 0.0
            props["nivel_farol"] = 0
            continue

        # Score normalizado: ainda usa max, é informativo
        props["score_normalizado"] = round(valor / score_max, 4)

        # Nivel: por percentil
        if valor >= p90:
            nivel = 5
        elif valor >= p75:
            nivel = 4
        elif valor >= p50:
            nivel = 3
        elif valor >= p25:
            nivel = 2
        else:
            nivel = 1
        props["nivel_farol"] = nivel

    return features
