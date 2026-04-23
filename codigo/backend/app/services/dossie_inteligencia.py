"""
Camada de inteligência do dossiê político — funções PURAS, sem I/O.

Recebe um `DossiePolitico` parcialmente preenchido (blocos de dados) e devolve
o bloco `Inteligencia` (scores + alertas + classificação) e o `resumo_executivo`.

REGRAS (não violar):
- Cada score 0-100 OU None. None significa "sem base de dados", NÃO "neutro".
- score.geral é a média APENAS dos scores não-None. Não usar 50 como default.
- Alertas usam linguagem analítica neutra, sem juízo moral.
- O resumo executivo é GERADO POR TEMPLATE — sem chamada a IA externa.
- Toda heurística está documentada em comentário no método correspondente.
- Quando faltar base, retornar None ou string vazia — nunca inventar.
"""
from __future__ import annotations

import math
from typing import Optional

from app.schemas.dossie import (
    Classificacao,
    Comportamento,
    DossiePolitico,
    Inteligencia,
    NivelClassificacao,
    OverallFifa,
    Score,
)
from app.services.dossie_ideologia import get_ideologia


# ── Constantes de pesos por componente ───────────────────────────────────────

# Score Eleitoral (soma 100):
_PESO_ELEITORAL_TAXA_SUCESSO = 40
_PESO_ELEITORAL_CRESCIMENTO = 30
_PESO_ELEITORAL_PERSISTENCIA = 20
_PESO_ELEITORAL_VOLUME = 10

# Score Financeiro (soma 100):
_PESO_FIN_REGISTROS = 40
_PESO_FIN_EFICIENCIA = 30
_PESO_FIN_EQUILIBRIO = 30

# Score Político (soma 100):
_PESO_POL_FIDELIDADE = 60
_PESO_POL_COERENCIA = 40

# Score Jurídico (partimos de 100 e subtraímos penalidades):
# Peso maior em inabilitação TCU (função pública) > sanção CEIS/CEAF > inapto ciclo
_PENA_JURI_INAPTO_CICLO_ATUAL = 30   # ficha_limpa=False no ciclo ativo
_PENA_JURI_CICLO_HISTORICO_INAPTO = 10  # por ciclo inapto anterior (cap em 4)
_PENA_JURI_SANCAO_CGU_ATIVA = 25     # por sanção CEIS/CEAF ativa (cap em 2)
_PENA_JURI_TCU_ATIVO = 40            # por inabilitação TCU ativa

# Mapeamento ideologia → posição numérica para medir "distância ideológica"
# (0=esquerda, 4=direita). Usado em coerência e em alerta de mudança ideológica.
_IDEOLOGIA_POSICAO: dict[str, int] = {
    "esquerda": 0,
    "centro-esquerda": 1,
    "centro": 2,
    "centro-direita": 3,
    "direita": 4,
}


# ════════════════════════════════════════════════════════════════════════════
# SCORES
# ════════════════════════════════════════════════════════════════════════════


def calcular_score_eleitoral(dossie: DossiePolitico) -> Optional[float]:
    """
    Score 0-100 baseado em performance eleitoral histórica.

    Componentes (pesos somam 100):
    - Taxa de sucesso     (40 pts): % de candidaturas em que foi eleito
    - Crescimento de votos (30 pts): variação % na última candidatura vs anterior
    - Persistência         (20 pts): nº de eleições disputadas (cap em 5)
    - Volume de votos      (10 pts): log10 dos votos totais (escala suave)

    Devolve None se não há nenhuma candidatura registrada.
    """
    cargos = dossie.trajetoria.cargos_disputados
    if not cargos:
        return None

    total = len(cargos)
    n_eleito = sum(1 for c in cargos if c.resultado == "ELEITO")

    # 1. Taxa de sucesso
    taxa = n_eleito / total if total > 0 else 0.0
    pts_taxa = taxa * _PESO_ELEITORAL_TAXA_SUCESSO

    # 2. Crescimento de votos: compara últimas duas candidaturas com votos > 0
    # cargos é DESC por ano, então cargos[0] é o mais recente.
    com_votos = [c for c in cargos if c.votos > 0]
    pts_cresc = 0.0
    if len(com_votos) >= 2:
        atual, anterior = com_votos[0].votos, com_votos[1].votos
        if anterior > 0:
            delta = (atual - anterior) / anterior
            # Mapeia delta [-50%, +50%] para [0, 30]. Cap em ambos extremos.
            pts_cresc = max(0.0, min(_PESO_ELEITORAL_CRESCIMENTO,
                                      (delta + 0.5) * _PESO_ELEITORAL_CRESCIMENTO))
    elif len(com_votos) == 1:
        # Sem base de comparação — pontuação neutra parcial (metade do peso)
        pts_cresc = _PESO_ELEITORAL_CRESCIMENTO / 2

    # 3. Persistência (cap em 5 candidaturas para 100% do peso)
    pts_pers = min(total / 5.0, 1.0) * _PESO_ELEITORAL_PERSISTENCIA

    # 4. Volume de votos: log10(total+1), escalado.
    # 1k votos → ~3, 100k → ~5, 1M → ~6, 10M → ~7. Normalizado por 7 (cap).
    total_votos = dossie.desempenho_eleitoral.total_votos
    if total_votos > 0:
        log_v = math.log10(total_votos + 1)
        pts_vol = min(log_v / 7.0, 1.0) * _PESO_ELEITORAL_VOLUME
    else:
        pts_vol = 0.0

    return round(pts_taxa + pts_cresc + pts_pers + pts_vol, 1)


def calcular_score_financeiro(dossie: DossiePolitico) -> Optional[float]:
    """
    Score 0-100 baseado em transparência e eficiência financeira.

    Componentes (pesos somam 100):
    - Tem registros financeiros (40 pts): se há receita ou despesa registrada
    - Eficiência               (30 pts): custo por voto (R$/voto), escala invertida
    - Equilíbrio orçamentário  (30 pts): receita >= despesa = 30, déficit = proporcional

    Devolve None se o bloco financeiro não tem dados (`disponivel=false`).
    Concentração de doadores fica de fora porque o ETL ainda não rodou —
    quando rodar, adicionar novo componente.
    """
    fin = dossie.financeiro
    if not fin.disponivel:
        return None

    total_arrecadado = fin.total_arrecadado or 0
    total_gasto = fin.total_gasto or 0

    if total_arrecadado == 0 and total_gasto == 0:
        return None

    # 1. Tem registros financeiros
    pts_reg = _PESO_FIN_REGISTROS

    # 2. Eficiência (custo por voto)
    # < R$ 5/voto = score máximo. > R$ 100/voto = score zero. Escala linear inversa.
    total_votos = dossie.desempenho_eleitoral.total_votos
    pts_efi = 0.0
    if total_gasto > 0 and total_votos > 0:
        custo_por_voto = total_gasto / total_votos
        if custo_por_voto <= 5:
            pts_efi = _PESO_FIN_EFICIENCIA
        elif custo_por_voto >= 100:
            pts_efi = 0
        else:
            # Linear: 5 → 30, 100 → 0
            pts_efi = _PESO_FIN_EFICIENCIA * (1 - (custo_por_voto - 5) / 95)

    # 3. Equilíbrio orçamentário
    pts_equi = 0.0
    if total_arrecadado >= total_gasto:
        pts_equi = _PESO_FIN_EQUILIBRIO
    elif total_arrecadado > 0:
        # Déficit proporcional
        razao = total_arrecadado / total_gasto
        pts_equi = _PESO_FIN_EQUILIBRIO * razao

    return round(pts_reg + pts_efi + pts_equi, 1)


def calcular_score_politico(dossie: DossiePolitico) -> Optional[float]:
    """
    Score 0-100 baseado em experiencia, fidelidade e consistencia politica.

    Componentes (pesos somam 100):
    - Experiencia eleitoral   (30 pts): num de eleicoes disputadas (cap 6)
    - Mandatos conquistados   (25 pts): num de vitorias (cap 4)
    - Diversidade de cargos   (15 pts): disputou cargos diferentes (municipal+estadual+federal)
    - Fidelidade partidaria   (20 pts): num de partidos (menos = melhor)
    - Coerencia ideologica    (10 pts): se manteve na mesma faixa

    Devolve None se nao ha candidaturas.
    """
    cargos = dossie.trajetoria.cargos_disputados
    if not cargos:
        return None

    historico = dossie.perfil_politico.historico_partidos
    n_partidos = len(historico) if historico else 1

    # 1. Experiencia (30 pts): mais eleicoes = mais experiente
    n_eleicoes = len(cargos)
    pts_exp = min(n_eleicoes / 6.0, 1.0) * 30

    # 2. Mandatos conquistados (25 pts)
    n_eleito = sum(1 for c in cargos if c.resultado == "ELEITO")
    pts_mand = min(n_eleito / 4.0, 1.0) * 25

    # 3. Diversidade de cargos (15 pts): disputou municipal, estadual, federal?
    niveis = set()
    for c in cargos:
        cargo_upper = (c.cargo or "").upper()
        if cargo_upper in ("VEREADOR", "PREFEITO"):
            niveis.add("municipal")
        elif cargo_upper in ("DEPUTADO ESTADUAL", "GOVERNADOR"):
            niveis.add("estadual")
        elif cargo_upper in ("DEPUTADO FEDERAL", "SENADOR", "PRESIDENTE"):
            niveis.add("federal")
    pts_div = (len(niveis) / 3.0) * 15

    # 4. Fidelidade (20 pts): menos trocas = melhor
    if n_partidos == 1:
        pts_fid = 20
    elif n_partidos == 2:
        pts_fid = 14
    elif n_partidos == 3:
        pts_fid = 8
    else:
        pts_fid = 3

    # 5. Coerencia (10 pts)
    if dossie.perfil_politico.ideologia_aproximada and n_partidos == 1:
        pts_coer = 10
    elif dossie.perfil_politico.ideologia_aproximada:
        pts_coer = 7
    else:
        pts_coer = 5

    return round(pts_exp + pts_mand + pts_div + pts_fid + pts_coer, 1)


def calcular_score_juridico(dossie: DossiePolitico) -> Optional[float]:
    """
    Score 0-100 baseado em aptidão jurídico-administrativa. Parte de 100
    e subtrai penalidades acumulativas.

    Componentes:
    - Ficha limpa ciclo atual inapto: −30
    - Cada ciclo histórico inapto:    −10 (cap em 4 ciclos = −40)
    - Cada sanção CGU (CEIS/CEAF) ativa: −25 (cap em 2 sanções = −50)
    - Inabilitação TCU ativa:          −40 (binário, flag de alto risco)

    Retorna None quando o candidato não tem NENHUM dado jurídico
    (sem ficha_limpa e sem sanções) — não usar 100 como neutro, pois
    daria score alto artificial a quem simplesmente não foi auditado.
    """
    juri = dossie.juridico
    if not juri.disponivel:
        return None

    score = 100.0

    # Ficha limpa ciclo atual
    if juri.ficha_limpa is False:
        score -= _PENA_JURI_INAPTO_CICLO_ATUAL

    # Ciclos históricos inaptos (cap em 4)
    ciclos_inapto_cap = min(juri.ciclos_inapto, 4)
    score -= ciclos_inapto_cap * _PENA_JURI_CICLO_HISTORICO_INAPTO

    # Sanções ativas: separa TCU das demais (TCU tem peso próprio)
    sancoes_tcu = [s for s in juri.sancoes if s.fonte == "TCU" and s.ativa]
    sancoes_cgu = [s for s in juri.sancoes if s.fonte in ("CEIS", "CEAF") and s.ativa]

    if sancoes_tcu:
        score -= _PENA_JURI_TCU_ATIVO
    cgu_cap = min(len(sancoes_cgu), 2)
    score -= cgu_cap * _PENA_JURI_SANCAO_CGU_ATIVA

    return round(max(score, 0.0), 1)


def _derivar_risco_juridico(score_juri: Optional[float]) -> Optional[NivelClassificacao]:
    """ALTO: score<40. MEDIO: 40-69. BAIXO: ≥70. None se score None."""
    if score_juri is None:
        return None
    if score_juri < 40:
        return "ALTO"
    if score_juri < 70:
        return "MEDIO"
    return "BAIXO"


def _calcular_score_geral(score: Score) -> Optional[float]:
    """
    Média aritmética dos scores não-None. Se todos forem None, retorna None.
    Nunca inclui None na média (não usar 0 nem 50 como neutro).
    """
    valores = [
        v for v in (
            score.eleitoral,
            score.juridico,
            score.financeiro,
            score.politico,
            score.digital,
        )
        if v is not None
    ]
    if not valores:
        return None
    return round(sum(valores) / len(valores), 1)


# ════════════════════════════════════════════════════════════════════════════
# COMPORTAMENTO
# ════════════════════════════════════════════════════════════════════════════


def calcular_comportamento(dossie: DossiePolitico) -> Comportamento:
    """
    Bloco `comportamento` do `Inteligencia`.

    - alinhamento_partido: requer dados legislativos → None
    - alinhamento_governo: requer dados legislativos → None
    - coerencia_ideologica: derivada do nº de partidos + ideologia conhecida.
    """
    historico = dossie.perfil_politico.historico_partidos
    n_partidos = len(historico)

    coerencia: Optional[float]
    if n_partidos == 0:
        coerencia = None
    elif n_partidos == 1:
        coerencia = 100.0
    elif n_partidos == 2:
        coerencia = 70.0
    elif n_partidos == 3:
        coerencia = 50.0
    else:
        coerencia = 25.0

    return Comportamento(
        alinhamento_partido=None,   # sem dados legislativos
        alinhamento_governo=None,   # sem dados legislativos
        coerencia_ideologica=coerencia,
    )


# ════════════════════════════════════════════════════════════════════════════
# ALERTAS
# ════════════════════════════════════════════════════════════════════════════


def gerar_alertas(dossie: DossiePolitico) -> list[str]:
    """
    Alertas analíticos automáticos. Linguagem neutra, sem juízo moral.
    Cada item é uma string curta auto-explicativa.

    Heurísticas implementadas:
    - Queda de votos > 30% vs candidatura anterior
    - Crescimento de votos > 30% vs candidatura anterior
    - Mudança frequente de partido (>= 3 partidos)
    - Sem mandatos eleitos após múltiplas candidaturas
    - Custo por voto elevado (> R$ 50)
    - Carreira recente sem candidaturas (>= 8 anos sem disputa)
    - Inabilitação ativa pelo TCU (com data_fim quando disponível)
    - Sanções CGU ativas (CEIS/CEAF)
    - Ficha limpa indicando inapto no ciclo atual

    NÃO inclui alertas sem base de dados (digital/legislativo).
    """
    alertas: list[str] = []
    cargos = dossie.trajetoria.cargos_disputados

    # ── Variação de votos vs eleição anterior ────────────────────────────
    com_votos = [c for c in cargos if c.votos > 0]
    if len(com_votos) >= 2:
        atual, anterior = com_votos[0].votos, com_votos[1].votos
        if anterior > 0:
            delta_pct = ((atual - anterior) / anterior) * 100
            if delta_pct <= -30:
                alertas.append(
                    f"Queda de votos de {abs(delta_pct):.0f}% em relação à eleição anterior."
                )
            elif delta_pct >= 30:
                alertas.append(
                    f"Crescimento de votos de {delta_pct:.0f}% em relação à eleição anterior."
                )

    # ── Mudança frequente de partido ─────────────────────────────────────
    n_partidos = len(dossie.perfil_politico.historico_partidos)
    if n_partidos >= 3:
        alertas.append(
            f"Histórico de {n_partidos} partidos diferentes ao longo da carreira."
        )

    # ── Sem mandatos eleitos após múltiplas candidaturas ─────────────────
    n_eleito = sum(1 for c in cargos if c.resultado == "ELEITO")
    if len(cargos) >= 3 and n_eleito == 0:
        alertas.append(
            f"Disputou {len(cargos)} eleições sem ser eleito em nenhuma."
        )

    # ── Custo por voto elevado ───────────────────────────────────────────
    fin = dossie.financeiro
    total_votos = dossie.desempenho_eleitoral.total_votos
    if fin.disponivel and fin.total_gasto and total_votos > 0:
        custo_por_voto = fin.total_gasto / total_votos
        if custo_por_voto > 50:
            alertas.append(
                f"Custo por voto elevado: R$ {custo_por_voto:.2f} por voto."
            )

    # ── Carreira recente sem candidaturas ────────────────────────────────
    if cargos:
        from datetime import date
        ano_atual = date.today().year
        ultima_disputa = max(c.ano for c in cargos)
        gap = ano_atual - ultima_disputa
        if gap >= 8:
            alertas.append(
                f"Sem candidaturas registradas há {gap} anos (última: {ultima_disputa})."
            )

    # ── Sanções e inaptidão jurídica ─────────────────────────────────────
    juri = dossie.juridico
    if juri.disponivel:
        tcu_ativos = [s for s in juri.sancoes if s.fonte == "TCU" and s.ativa]
        cgu_ativos = [s for s in juri.sancoes if s.fonte in ("CEIS", "CEAF") and s.ativa]

        if tcu_ativos:
            # TCU normalmente tem data_fim (inabilitação é por prazo determinado)
            fim = tcu_ativos[0].data_fim
            if fim:
                alertas.append(f"Inabilitado pelo TCU até {fim}.")
            else:
                alertas.append("Inabilitado pelo TCU (sem prazo final registrado).")

        if cgu_ativos:
            fontes = sorted({s.fonte for s in cgu_ativos})
            n = len(cgu_ativos)
            sufixo = "ativa" if n == 1 else "ativas"
            alertas.append(
                f"{n} sanção administrativa {sufixo} ({'/'.join(fontes)})."
            )

        if juri.ficha_limpa is False:
            alertas.append("Ficha limpa indica inapto no ciclo atual.")

    return alertas


# ════════════════════════════════════════════════════════════════════════════
# CLASSIFICAÇÃO (RISCO + POTENCIAL)
# ════════════════════════════════════════════════════════════════════════════


def classificar(dossie: DossiePolitico, score: Score) -> Classificacao:
    """
    Classifica risco e potencial em ALTO/MEDIO/BAIXO.

    RISCO: usa score.geral + nº de alertas críticos como sinais.
        ALTO  → score < 40 ou >= 3 alertas
        MEDIO → score < 60 ou == 1-2 alertas
        BAIXO → caso contrário

    POTENCIAL: usa score.geral + se a última candidatura foi vitoriosa.
        ALTO  → score >= 70 e última candidatura ELEITO
        MEDIO → score >= 50
        BAIXO → caso contrário

    Devolve Classificacao(None, None) quando:
      - score.geral eh None (sem base), OU
      - Menos de 3 dimensoes (das 5) tem score calculado — classificar apenas
        com 1-2 dimensoes geraria rotulo agressivo para quem apenas tem poucos
        dados registrados (nao eh "candidato fraco", e "dados insuficientes").
    """
    if score.geral is None:
        return Classificacao(risco=None, potencial=None)

    n_disponiveis = sum(1 for v in (
        score.eleitoral, score.juridico, score.financeiro,
        score.politico, score.digital,
    ) if v is not None)
    if n_disponiveis < 3:
        return Classificacao(risco=None, potencial=None)

    n_alertas = len(gerar_alertas(dossie))

    # ── Risco ────────────────────────────────────────────────────────────
    risco: NivelClassificacao
    if score.geral < 40 or n_alertas >= 3:
        risco = "ALTO"
    elif score.geral < 60 or n_alertas >= 1:
        risco = "MEDIO"
    else:
        risco = "BAIXO"

    # ── Potencial ────────────────────────────────────────────────────────
    cargos = dossie.trajetoria.cargos_disputados
    eleito_recente = bool(cargos and cargos[0].resultado == "ELEITO")

    potencial: NivelClassificacao
    if score.geral >= 70 and eleito_recente:
        potencial = "ALTO"
    elif score.geral >= 50:
        potencial = "MEDIO"
    else:
        potencial = "BAIXO"

    return Classificacao(risco=risco, potencial=potencial)


# ════════════════════════════════════════════════════════════════════════════
# RESUMO EXECUTIVO
# ════════════════════════════════════════════════════════════════════════════


def gerar_resumo_executivo(dossie: DossiePolitico) -> str:
    """
    Gera o resumo executivo do dossiê via template heurístico.

    Tom: analítico, neutro, objetivo. Sem chamada a IA externa.
    Cada parágrafo é um eixo: visão geral / forças / riscos / leitura estratégica.
    """
    nome = dossie.identificacao.nome_urna or dossie.identificacao.nome
    perfil = dossie.perfil_politico
    cargos = dossie.trajetoria.cargos_disputados
    desempenho = dossie.desempenho_eleitoral
    intel = dossie.inteligencia

    # ── Parágrafo 1: visão geral ─────────────────────────────────────────
    partes_p1 = [f"{nome} é filiado(a) ao {perfil.partido_atual or '(partido não informado)'}."]
    if perfil.ideologia_aproximada:
        partes_p1.append(
            f"Posição ideológica estimada do partido: {perfil.ideologia_aproximada}."
        )
    if cargos:
        n_total = len(cargos)
        n_eleito = sum(1 for c in cargos if c.resultado == "ELEITO")
        taxa = (n_eleito / n_total) * 100 if n_total else 0
        partes_p1.append(
            f"Disputou {n_total} eleição(ões), eleito(a) em {n_eleito} ({taxa:.0f}% de aproveitamento)."
        )
    p1 = " ".join(partes_p1)

    # ── Parágrafo 2: principais forças ───────────────────────────────────
    forcas: list[str] = []
    if intel.score.eleitoral is not None and intel.score.eleitoral >= 70:
        forcas.append("performance eleitoral consistente")
    if desempenho.regioes_fortes:
        forcas.append(f"presença forte em {', '.join(desempenho.regioes_fortes[:2])}")
    if intel.score.financeiro is not None and intel.score.financeiro >= 70:
        forcas.append("eficiência financeira de campanha")
    if intel.comportamento.coerencia_ideologica and intel.comportamento.coerencia_ideologica >= 70:
        forcas.append("fidelidade partidária")
    p2 = (
        f"Pontos fortes: {'; '.join(forcas)}."
        if forcas
        else "Pontos fortes: sem destaques significativos identificados nos dados disponíveis."
    )

    # ── Parágrafo 3: principais riscos ───────────────────────────────────
    if intel.alertas:
        p3 = "Pontos de atenção: " + " ".join(
            f"({i+1}) {a}" for i, a in enumerate(intel.alertas[:4])
        )
    else:
        p3 = "Pontos de atenção: nenhum alerta automático foi disparado."

    # ── Parágrafo 4: leitura estratégica ─────────────────────────────────
    risco = intel.classificacao.risco
    potencial = intel.classificacao.potencial
    if risco and potencial:
        p4 = (
            f"Leitura estratégica: classificação automática indica risco {risco.lower()} "
            f"e potencial {potencial.lower()}. "
        )
        if intel.score.geral is not None:
            p4 += f"Score geral consolidado: {intel.score.geral:.0f}/100."
    else:
        p4 = (
            "Leitura estratégica: dados insuficientes para classificar risco "
            "e potencial automaticamente."
        )

    return "\n\n".join([p1, p2, p3, p4])


# ════════════════════════════════════════════════════════════════════════════
# OVERALL FIFA - 8 DIMENSOES POLITICAS
# ════════════════════════════════════════════════════════════════════════════

# Comissoes permanentes do Senado com maior peso politico (estudo Sonnet 20/04).
# CCJ controla constitucionalidade; CAE economia; CAS sociais; CI infra/comunicacoes;
# CRE relacoes exteriores; CDH direitos humanos; CMA meio ambiente.
COMISSOES_ESTRATEGICAS_SENADO = {"CCJ", "CAE", "CAS", "CI", "CRE", "CDH", "CMA"}

# Idem na Camara dos Deputados.
COMISSOES_ESTRATEGICAS_CAMARA = {"CCJC", "CFT", "CTASP", "CSPCCO", "CFFC"}

# Matriz de pesos por cargo, conforme estudo Sonnet 20/04/2026.
# Soma 100 em cada linha. Vice-Pres/Vice-Gov usam coluna do titular mas
# com ART e EFI reduzidos a 10 quando sem mandato executivo exercido.
PESOS_OVERALL_POR_CARGO: dict[str, dict[str, int]] = {
    "PRESIDENTE":          {"VOT": 20, "EFI": 10, "ART": 20, "FID": 10, "INT": 15, "TER": 10, "POT": 10, "FIN": 5},
    "VICE-PRESIDENTE":     {"VOT": 20, "EFI": 10, "ART": 20, "FID": 10, "INT": 15, "TER": 10, "POT": 10, "FIN": 5},
    "GOVERNADOR":          {"VOT": 20, "EFI": 10, "ART": 20, "FID": 5,  "INT": 15, "TER": 10, "POT": 10, "FIN": 10},
    "VICE-GOVERNADOR":     {"VOT": 20, "EFI": 10, "ART": 20, "FID": 5,  "INT": 15, "TER": 10, "POT": 10, "FIN": 10},
    "SENADOR":             {"VOT": 20, "EFI": 10, "ART": 25, "FID": 10, "INT": 10, "TER": 10, "POT": 5,  "FIN": 10},
    # POT subiu de 10->15 (fenomenos jovens como Nikolas nao eram penalizados pela
    # matriz original). ART caiu 20->17. Estudo Sonnet 20/04/2026.
    "DEPUTADO FEDERAL":    {"VOT": 18, "EFI": 10, "ART": 17, "FID": 10, "INT": 10, "TER": 10, "POT": 15, "FIN": 10},
    # POT subiu 10->13, TER caiu 15->12 pra equilibrar.
    "DEPUTADO ESTADUAL":   {"VOT": 20, "EFI": 10, "ART": 15, "FID": 10, "INT": 10, "TER": 12, "POT": 13, "FIN": 10},
    "DEPUTADO DISTRITAL":  {"VOT": 20, "EFI": 10, "ART": 15, "FID": 10, "INT": 10, "TER": 12, "POT": 13, "FIN": 10},
    "PREFEITO":            {"VOT": 25, "EFI": 15, "ART": 15, "FID": 5,  "INT": 15, "TER": 10, "POT": 10, "FIN": 5},
    "VICE-PREFEITO":       {"VOT": 25, "EFI": 15, "ART": 15, "FID": 5,  "INT": 15, "TER": 10, "POT": 10, "FIN": 5},
    # POT subiu 10->15, VOT ajustado 25->23, EFI ajustado 15->12.
    "VEREADOR_CAPITAL":    {"VOT": 23, "EFI": 12, "ART": 10, "FID": 5,  "INT": 15, "TER": 10, "POT": 15, "FIN": 10},
    # POT subiu 10->12, EFI ajustado 15->13.
    "VEREADOR_INTERIOR":   {"VOT": 25, "EFI": 13, "ART": 10, "FID": 5,  "INT": 15, "TER": 10, "POT": 12, "FIN": 10},
}

PESOS_DEFAULT = {"VOT": 15, "EFI": 10, "ART": 15, "FID": 10, "INT": 15, "TER": 15, "POT": 10, "FIN": 10}


def _resolver_chave_pesos(cargo_atual: str, eh_capital: bool) -> str:
    """Mapeia cargo TSE para chave da matriz PESOS_OVERALL_POR_CARGO.
    Vereador precisa distinguir capital vs interior.
    """
    c = (cargo_atual or "").upper().strip()
    if c == "VEREADOR":
        return "VEREADOR_CAPITAL" if eh_capital else "VEREADOR_INTERIOR"
    if c in PESOS_OVERALL_POR_CARGO:
        return c
    return ""


def _art_senador(legis) -> int:
    """ART para Senador - nao usa volume de PLs de autoria (proxy inverso).
    Pesa comissoes (Presidente/Vice/Titular/Suplente, com bonus em estrategicas),
    relatorias, historico de comissoes e mandato ativo.
    """
    if not legis or not legis.disponivel:
        return 0

    # (1) Comissoes atuais - 40% = 40 pts
    # Presidente=20, Vice=10, Titular=5, Suplente=3.
    # Multiplica x2 se for comissao estrategica (CCJ/CAE/CAS/CI/CRE/CDH/CMA).
    # Frentes parlamentares e grupos de amizade nao contam (sigla com 4+ letras prefixo).
    CARGO_PESO = {"Presidente": 20, "Vice-Presidente": 10, "Vice": 10, "Titular": 5, "Suplente": 3, "Relator": 8}
    pts_com = 0.0
    for com in legis.comissoes_atuais or []:
        if not com.ativa:
            continue
        # filtra frentes e grupos parlamentares (nao sao comissoes permanentes)
        sigla = (com.sigla or "").upper()
        nome = (com.nome or "").lower()
        if sigla.startswith(("FP", "GP")) or "frente" in nome or "grupo parlamentar" in nome:
            continue
        peso = CARGO_PESO.get(com.cargo or "", 2)
        if sigla in COMISSOES_ESTRATEGICAS_SENADO:
            peso *= 2
        pts_com += peso
    pts_com = min(40.0, pts_com)

    # (2) Relatorias - 30% = 30 pts. Cap em 10 relatorias.
    pts_rel = min((legis.n_relatorias or 0) / 10.0, 1.0) * 30

    # (3) Historico de comissoes - 15% = 15 pts. Cap em 20 comissoes.
    pts_hist = min((legis.n_comissoes_historico or 0) / 20.0, 1.0) * 15

    # (4) Mandato ativo - 15% = 15 pts.
    situacao = (legis.situacao or "").lower()
    if "exerc" in situacao or "ativ" in situacao:
        pts_mand = 15.0
    elif "licenc" in situacao:
        pts_mand = 8.0
    else:
        pts_mand = 0.0

    # Bonus de autoria (nao penalidade): se apresentou muitos PLs, +5.
    # Diferente do Deputado Federal, volume de autoria em Senador indica
    # atividade legislativa complementar, nao eficacia articulatoria.
    bonus = 5.0 if (legis.projetos_apresentados or 0) >= 20 else 0.0

    return min(99, int(pts_com + pts_rel + pts_hist + pts_mand + bonus))


def _art_deputado_federal(legis) -> int:
    """ART para Deputado Federal - formula herdada do calculo original,
    com projetos apresentados e aprovados tendo peso maior. Sera refinada
    na fase 2 com emendas executadas + lideranca + presidencia de comissao.
    """
    if not legis or not legis.disponivel:
        return 0
    projetos = legis.projetos_apresentados or 0
    aprovados = legis.projetos_aprovados or 0

    # Aprovados (45%): peso em output real, cap 20.
    pts_aprov = min(aprovados / 20.0, 1.0) * 45

    # Taxa de aprovacao (15%).
    pts_taxa = (aprovados / projetos * 15) if projetos > 0 else 0.0

    # Relatorias + comissoes estrategicas (30%).
    CARGO_PESO = {"Presidente": 18, "Vice-Presidente": 9, "Vice": 9, "Titular": 4, "Suplente": 2, "Relator": 7}
    pts_com = 0.0
    for com in legis.comissoes_atuais or []:
        if not com.ativa:
            continue
        sigla = (com.sigla or "").upper()
        nome = (com.nome or "").lower()
        if sigla.startswith(("FP", "GP")) or "frente" in nome or "grupo parlamentar" in nome:
            continue
        peso = CARGO_PESO.get(com.cargo or "", 2)
        if sigla in COMISSOES_ESTRATEGICAS_CAMARA:
            peso *= 2
        pts_com += peso
    pts_com = min(20.0, pts_com)
    pts_rel = min((legis.n_relatorias or 0) / 10.0, 1.0) * 10

    # Mandato ativo (10%).
    situacao = (legis.situacao or "").lower()
    pts_mand = 10.0 if ("exerc" in situacao or "ativ" in situacao) else (5.0 if "licenc" in situacao else 0.0)

    return min(99, int(pts_aprov + pts_taxa + pts_com + pts_rel + pts_mand))


def _art_executivo(executivo, cargos) -> int:
    """ART para cargos executivos (Presidente, Governador, Prefeito).
    Mede atividade legislativa do Executivo: MPs, PLs, PLPs, PECs enviadas
    ao Congresso/Assembleia/Camara Municipal, taxa de aprovacao de MPs,
    anos em exercicio e consolidacao (numero de mandatos no cargo).

    Estudo Sonnet 20/04: governismo + base alinhada sao os melhores proxies,
    mas ainda nao estao no schema. Usamos os dados disponiveis.
    """
    pts = 0.0

    # (1) Volume de atos executivos - 35%. Cap em 100 atos.
    # MPs pesam mais (instrumento forte) que decretos; PECs mais que PLs.
    if executivo and executivo.disponivel:
        mps = executivo.n_medidas_provisorias or 0
        pls = executivo.n_pls_enviados or 0
        plps = executivo.n_plps_enviados or 0
        pecs = executivo.n_pecs_enviadas or 0
        # peso ponderado por impacto
        volume_ponderado = mps * 2 + pecs * 2 + plps * 1.2 + pls * 1.0
        pts += min(volume_ponderado / 100.0, 1.0) * 35

        # (2) Taxa de aprovacao de MPs - 25%.
        if executivo.taxa_aprovacao_mps is not None:
            pts += float(executivo.taxa_aprovacao_mps) / 100.0 * 25
        else:
            # Sem dado de aprovacao: neutro parcial 12 pts
            pts += 12.0

        # (3) Anos em exercicio - 15%. Cap em 4 anos (1 mandato).
        if executivo.mandato_ano_inicio and executivo.mandato_ano_fim:
            anos = executivo.mandato_ano_fim - executivo.mandato_ano_inicio
            pts += min(anos / 4.0, 1.0) * 15

    # (4) Consolidacao (mandatos anteriores mesmo cargo ou superior) - 25%.
    # Ex-governador virando senador/presidente; ex-prefeito virando governador.
    if cargos:
        n_eleito_exec = sum(1 for c in cargos
                            if c.resultado == "ELEITO"
                            and (c.cargo or "").upper() in ("PRESIDENTE", "GOVERNADOR", "PREFEITO"))
        pts += min(n_eleito_exec / 3.0, 1.0) * 25

    return min(99, int(pts))


def _art_deputado_estadual(legis) -> int:
    """ART para Deputado Estadual/Distrital - formula similar ao Dep Federal
    mas com peso menor em volume (Assembleias menores) e foco maior em
    comissoes + mandato ativo.
    """
    if not legis or not legis.disponivel:
        return 0
    projetos = legis.projetos_apresentados or 0
    aprovados = legis.projetos_aprovados or 0

    # Aprovados (40%)
    pts_aprov = min(aprovados / 15.0, 1.0) * 40
    # Taxa (15%)
    pts_taxa = (aprovados / projetos * 15) if projetos > 0 else 0.0
    # Comissoes atuais (20%)
    CARGO_PESO = {"Presidente": 15, "Vice-Presidente": 8, "Vice": 8, "Titular": 3, "Suplente": 2, "Relator": 6}
    pts_com = 0.0
    for com in legis.comissoes_atuais or []:
        if not com.ativa:
            continue
        sigla = (com.sigla or "").upper()
        nome = (com.nome or "").lower()
        if sigla.startswith(("FP", "GP")) or "frente" in nome or "grupo parlamentar" in nome:
            continue
        pts_com += CARGO_PESO.get(com.cargo or "", 1)
    pts_com = min(20.0, pts_com)
    # Relatorias (10%)
    pts_rel = min((legis.n_relatorias or 0) / 8.0, 1.0) * 10
    # Mandato ativo (15%)
    situacao = (legis.situacao or "").lower()
    pts_mand = 15.0 if ("exerc" in situacao or "ativ" in situacao) else (7.0 if "licenc" in situacao else 0.0)

    return min(99, int(pts_aprov + pts_taxa + pts_com + pts_rel + pts_mand))


def _art_vereador(legis, cargos) -> int:
    """ART para Vereador - Camaras Municipais raramente expoem dados
    estruturados (exceto SP). Quando legis.disponivel=True, usa mesma logica
    do Dep Estadual com pesos menores. Senao, usa trajetoria de reeleicoes
    como proxy de capital politico local.
    """
    if legis and legis.disponivel:
        aprovados = legis.projetos_aprovados or 0
        projetos = legis.projetos_apresentados or 0
        pts_aprov = min(aprovados / 10.0, 1.0) * 45
        pts_taxa = (aprovados / projetos * 15) if projetos > 0 else 0.0
        # Comissoes (25%)
        pts_com = 0.0
        for com in legis.comissoes_atuais or []:
            if not com.ativa:
                continue
            cargo_c = com.cargo or ""
            if cargo_c == "Presidente":
                pts_com += 10
            elif cargo_c in ("Vice", "Vice-Presidente"):
                pts_com += 5
            elif cargo_c == "Titular":
                pts_com += 2
            else:
                pts_com += 1
        pts_com = min(25.0, pts_com)
        # Mandato ativo (15%)
        situacao = (legis.situacao or "").lower()
        pts_mand = 15.0 if ("exerc" in situacao or "ativ" in situacao) else 0.0
        return min(99, int(pts_aprov + pts_taxa + pts_com + pts_mand))
    # Fallback: carreira. Vereador reeleito = articulacao comprovada na base.
    if cargos:
        n_ver_eleito = sum(1 for c in cargos
                           if c.resultado == "ELEITO" and (c.cargo or "").upper() == "VEREADOR")
        pts_carreira = min(n_ver_eleito / 3.0, 1.0) * 50
        # Eleito no ultimo ciclo = +20
        ultima = cargos[0] if cargos else None
        pts_atual = 20.0 if ultima and ultima.resultado == "ELEITO" else 0.0
        return min(99, int(pts_carreira + pts_atual + 20))  # +20 base de atividade civil
    return 0


def _art_por_cargo(cargo_atual: str, legis, cargos, executivo=None) -> Optional[int]:
    """Router de ART por cargo. Cada cargo tem regua especifica baseada
    no estudo Sonnet 20/04/2026 (ciencia politica brasileira).

    - Senador: comissoes + relatorias + historico (NAO usa volume de PLs)
    - Deputado Federal: aprovados + comissoes estrategicas + relatorias
    - Deputado Estadual: similar ao Dep Fed com pesos menores
    - Presidente/Governador/Prefeito: atividade do Executivo (MPs/PLs/PECs)
    - Vereador: comissoes + aprovados (quando disponivel) ou carreira
    - Vice-* : usa pesos do titular mas dados executivos (se assumiu)
    """
    c = (cargo_atual or "").upper().strip()
    if c == "SENADOR":
        return _art_senador(legis)
    if c == "DEPUTADO FEDERAL":
        return _art_deputado_federal(legis)
    if c in ("DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL"):
        return _art_deputado_estadual(legis)
    if c in ("PRESIDENTE", "VICE-PRESIDENTE", "GOVERNADOR", "VICE-GOVERNADOR", "PREFEITO", "VICE-PREFEITO"):
        return _art_executivo(executivo, cargos)
    if c == "VEREADOR":
        return _art_vereador(legis, cargos)
    # Fallback generico: usa dados legislativos se disponivel, senao carreira.
    if legis and legis.disponivel:
        projetos = legis.projetos_apresentados or 0
        aprovados = legis.projetos_aprovados or 0
        pts_aprov = min(aprovados / 20.0, 1.0) * 60
        pts_taxa = (aprovados / projetos * 20) if projetos > 0 else 0.0
        return min(99, int(pts_aprov + pts_taxa + 20))
    if cargos:
        n_eleito = sum(1 for c_ in cargos if c_.resultado == "ELEITO")
        return min(99, int(n_eleito * 15))
    return None


def _detectar_arquetipos(dims: dict) -> list[tuple[str, int]]:
    """Detecta arquétipos políticos a partir das 8 dimensoes FIFA.

    Cada arquétipo indica um perfil de força autêntico (Fenomeno, Trabalhador,
    Articulador, Chefe de base, Técnico-legislador). Bonus sao CUMULATIVOS:
    Lira pode ser Articulador + Chefe de base (+10).

    Recebe dict com chaves VOT, EFI, ART, FID, INT, TER, POT, FIN
    (valores 0-99 ou None). Retorna lista de (nome, bonus_overall).
    """
    resultado: list[tuple[str, int]] = []
    vot = dims.get("VOT") or 0
    art = dims.get("ART") or 0
    pot = dims.get("POT") or 0
    fid = dims.get("FID") or 0
    ter = dims.get("TER") or 0
    int_ = dims.get("INT") or 0
    efi = dims.get("EFI") or 0

    cargo_up = (dims.get("_cargo") or "").upper()

    # Fenomeno: grande massa eleitoral + alto potencial
    if pot >= 85 and vot >= 85:
        resultado.append(("Fenômeno", 5))
    # Trabalhador: articulacao + integridade (entrega silenciosa)
    if art >= 75 and int_ >= 80:
        resultado.append(("Trabalhador", 5))
    # Articulador: articulacao + fidelidade (maquina politica)
    if art >= 85 and fid >= 70:
        resultado.append(("Articulador", 5))
    # Chefe de base: capilaridade territorial + fidelidade.
    # NAO aplica a Presidente/Governador - TER alto nesses cargos eh trivial
    # (naturalmente ganham em todo o territorio). "Chefe de base" faz sentido
    # pra Senador/DepFed/DepEstadual/Prefeito/Vereador que constroem base regional.
    if ter >= 85 and fid >= 70 and cargo_up not in ("PRESIDENTE", "VICE-PRESIDENTE", "GOVERNADOR", "VICE-GOVERNADOR"):
        resultado.append(("Chefe de base", 5))
    # Tecnico-legislador: articulacao + eficiencia (especialista produtivo)
    if art >= 75 and efi >= 75:
        resultado.append(("Técnico-legislador", 3))

    return resultado


def calcular_overall_fifa(
    dossie: DossiePolitico,
    complexidade_municipal: dict | None = None,
    partido_overall: Optional[int] = None,
    partido_sigla: Optional[str] = None,
    bonus_recorde: tuple[int, list[str]] = (0, []),
) -> OverallFifa:
    """
    Calcula as 6 dimensoes do radar chart estilo FIFA.
    Cada dimensao 0-99. Overall = media ponderada.

    1. VOTACAO (pace): volume e crescimento de votos
       - log10(total_votos) normalizado por 8 (10M+) = 50%
       - crescimento vs eleicao anterior = 30%
       - numero de eleicoes com votos = 20%

    2. EFICIENCIA (shooting): taxa de vitoria + custo/voto
       - taxa de vitoria (eleito/total) = 60%
       - custo por voto invertido (menor = melhor) = 40%

    3. ARTICULACAO (passing): atividade legislativa
       - numero de projetos apresentados (cap 50) = 50%
       - taxa de aprovacao = 30%
       - tem mandato ativo = 20%

    4. FIDELIDADE (dribbling): lealdade e coerencia
       - numero de partidos (menos = melhor) = 60%
       - coerencia ideologica = 40%

    5. FINANCEIRO (defending): gestao financeira
       - equilibrio orcamentario = 40%
       - eficiencia custo/voto vs benchmark = 30%
       - diversificacao de doadores = 30%

    6. TERRITORIAL (physical): presenca geografica
       - numero de regioes fortes = 50%
       - total de votos na ultima eleicao = 50%
    """
    cargos = dossie.trajetoria.cargos_disputados
    desemp = dossie.desempenho_eleitoral
    fin = dossie.financeiro
    legis = dossie.legislativo

    # ── 1. VOTACAO ──────────────────────────────────────────────────────
    votacao = None
    if cargos:
        total_votos = desemp.total_votos or 0
        com_votos = [c for c in cargos if c.votos > 0]

        # Volume (50%): log10 normalizado
        vol = 0.0
        if total_votos > 0:
            vol = min(math.log10(total_votos + 1) / 8.0, 1.0) * 50

        # Crescimento (30%)
        cresc = 15.0  # neutro se so tem 1
        if len(com_votos) >= 2:
            atual, anterior = com_votos[0].votos, com_votos[1].votos
            if anterior > 0:
                delta = (atual - anterior) / anterior
                cresc = max(0.0, min(30.0, (delta + 0.5) * 30))

        # Persistencia (20%): num eleicoes com votos
        pers = min(len(com_votos) / 5.0, 1.0) * 20

        votacao = min(99, int(vol + cresc + pers))

    # ── 2. EFICIENCIA ───────────────────────────────────────────────────
    eficiencia = None
    if cargos:
        total = len(cargos)
        n_eleito = sum(1 for c in cargos if c.resultado == "ELEITO")
        taxa = (n_eleito / total) if total > 0 else 0

        # Taxa de vitoria (60%)
        pts_taxa = taxa * 60

        # Custo/voto (40%): invertido
        pts_cpv = 20.0  # neutro se sem dados
        total_votos = desemp.total_votos or 0
        if fin.disponivel and fin.total_gasto and total_votos > 0:
            cpv = fin.total_gasto / total_votos
            if cpv <= 5:
                pts_cpv = 40
            elif cpv >= 100:
                pts_cpv = 0
            else:
                pts_cpv = 40 * (1 - (cpv - 5) / 95)

        eficiencia = min(99, int(pts_taxa + pts_cpv))

    # ── 3. ARTICULACAO ──────────────────────────────────────────────────
    # Regua por cargo (estudo Sonnet 20/04/2026). Cada cargo tem formula
    # especifica - Senador usa comissoes/relatorias (nao volume de PLs, que
    # e proxy inverso); Presidente/Governador/Prefeito usa atividade do
    # Executivo (MPs/PLs/PECs); Deputado Estadual e Vereador com logica
    # proporcional ao porte do cargo.
    cargo_art = cargos[0].cargo if cargos else ""
    executivo_block = getattr(dossie, "executivo", None)
    articulacao = _art_por_cargo(cargo_art, legis, cargos, executivo_block)

    # ── 4. FIDELIDADE ───────────────────────────────────────────────────
    fidelidade = None
    historico = dossie.perfil_politico.historico_partidos
    if historico:
        n_partidos = len(historico)
        # Menos partidos = melhor (60%)
        if n_partidos == 1:
            pts_fid = 60
        elif n_partidos == 2:
            pts_fid = 40
        elif n_partidos == 3:
            pts_fid = 20
        else:
            pts_fid = 5

        # Coerencia (40%): proxy pela coerencia ja calculada
        coer = dossie.inteligencia.comportamento.coerencia_ideologica
        pts_coer = (coer / 100.0 * 40) if coer is not None else 20

        fidelidade = min(99, int(pts_fid + pts_coer))

    # ── 5. FINANCEIRO ───────────────────────────────────────────────────
    financeiro = None
    if fin.disponivel and (fin.total_arrecadado or fin.total_gasto):
        arrecadado = fin.total_arrecadado or 0
        gasto = fin.total_gasto or 0

        # Equilibrio (40%)
        pts_eq = 0.0
        if arrecadado >= gasto:
            pts_eq = 40
        elif arrecadado > 0:
            pts_eq = 40 * (arrecadado / gasto)

        # Eficiencia CPV vs benchmark (30%)
        pts_bench = 15.0  # neutro
        if fin.cpv_benchmark and fin.cpv_benchmark.mediana_pares and fin.cpv_benchmark.valor_candidato is not None:
            ratio = fin.cpv_benchmark.valor_candidato / fin.cpv_benchmark.mediana_pares
            if ratio <= 0.5:
                pts_bench = 30
            elif ratio >= 2.0:
                pts_bench = 0
            else:
                pts_bench = 30 * (1 - (ratio - 0.5) / 1.5)

        # Diversificacao (30%): mais doadores = melhor
        pts_div = 15.0  # neutro
        if fin.concentracao and fin.concentracao.n_doadores is not None:
            n_doadores = fin.concentracao.n_doadores
            if n_doadores >= 50:
                pts_div = 30
            elif n_doadores >= 20:
                pts_div = 22
            elif n_doadores >= 10:
                pts_div = 15
            else:
                pts_div = 8

        financeiro = min(99, int(pts_eq + pts_bench + pts_div))

    # ── 6. TERRITORIAL ──────────────────────────────────────────────────
    territorial = None
    if cargos:
        regioes = len(desemp.regioes_fortes) if desemp.regioes_fortes else 0

        # Regioes fortes (50%): cap em 5
        pts_reg = min(regioes / 5.0, 1.0) * 50

        # Votos ultima eleicao (50%)
        ultima_votos = cargos[0].votos if cargos[0].votos > 0 else 0
        pts_ult = 0.0
        if ultima_votos > 0:
            pts_ult = min(math.log10(ultima_votos + 1) / 7.0, 1.0) * 50

        territorial = min(99, int(pts_reg + pts_ult))

    # ── 7. POTENCIAL ────────────────────────────────────────────────────
    # Reescrito 20/04/2026 para capturar fenomenos jovens (Nikolas=29 anos,
    # recordista BR, 20M seguidores). Formula:
    #   IDADE (40%) + RECORDE (30%) + CRESCIMENTO (20%) + CONSISTENCIA (10%)
    # Jovem recordista = POT alto (carreira pela frente + excepcional agora).
    potencial = None
    if cargos:
        com_votos = [c for c in cargos if c.votos > 0]

        # (1) IDADE - 40 pts max. Quanto mais jovem, maior POT.
        idade = getattr(dossie.identificacao, "idade", None) if dossie.identificacao else None
        if idade is not None:
            if idade < 35:
                pts_idade = 40.0
            elif idade < 40:
                pts_idade = 30.0
            elif idade < 50:
                pts_idade = 20.0
            elif idade < 60:
                pts_idade = 10.0
            else:
                pts_idade = 5.0
        else:
            pts_idade = 15.0  # neutro parcial se sem dado

        # (2) RECORDE - 30 pts max. Reutiliza bonus_recorde ja calculado.
        bonus_rec_pts, _ = bonus_recorde
        if bonus_rec_pts >= 8:       # mais votado do BR
            pts_recorde = 30.0
        elif bonus_rec_pts >= 5:     # mais votado do estado
            pts_recorde = 20.0
        elif bonus_rec_pts >= 3:     # top 5 BR
            pts_recorde = 10.0
        else:
            pts_recorde = 0.0

        # (3) CRESCIMENTO - 20 pts max (era 50, reduzido).
        pts_cresc = 10.0  # neutro
        if len(com_votos) >= 2:
            atual, anterior = com_votos[0].votos, com_votos[1].votos
            if anterior > 0:
                delta = (atual - anterior) / anterior
                pts_cresc = max(0.0, min(20.0, 10 + delta * 20))
        elif len(com_votos) == 1:
            pts_cresc = 10.0

        # (4) CONSISTENCIA - 10 pts max (era 30, reduzido).
        pts_cons = 5.0
        cargos_distintos = len(set(c.cargo for c in cargos))
        if len(cargos) >= 3:
            if cargos_distintos == 1:
                pts_cons = 10.0  # mesmo cargo sempre
            elif cargos_distintos == 2:
                pts_cons = 7.0   # progressao logica
            else:
                pts_cons = 3.0   # flutuacao

        potencial = min(99, int(pts_idade + pts_recorde + pts_cresc + pts_cons))

    # ── 8. INTEGRIDADE ──────────────────────────────────────────────────
    # Inverso do risco juridico. Ficha limpa e sem sancoes = 99.
    # Ficha suja + sancoes CGU/TCU = base baixa.
    juridico = dossie.juridico
    integridade = None
    if juridico and (juridico.disponivel or juridico.ficha_limpa is not None):
        pts_int = 99.0
        # Ficha limpa suja no ciclo atual = -30
        if juridico.ficha_limpa is False:
            pts_int -= 30
        # Cada ciclo historico inapto = -8 (cap -24)
        if juridico.ciclos_inapto:
            pts_int -= min(24, juridico.ciclos_inapto * 8)
        # Sancoes CGU ativas (CEIS/CEAF) = -25 por sancao (cap -50)
        if juridico.sancoes_ativas:
            pts_int -= min(50, juridico.sancoes_ativas * 25)
        integridade = max(0, min(99, int(pts_int)))

    # ═══════════════════════════════════════════════════════════════════
    # BONUS E PENALIDADES (analogia Endrick/Chelsea - a "liga" importa)
    # ═══════════════════════════════════════════════════════════════════
    bonus_aplicados: list[str] = []
    penalidades_aplicadas: list[str] = []

    # ── BONUS COMPLEXIDADE TERRITORIAL ─────────────────────────────────
    # Candidatos de municipios com maior PIB e populacao ganham bonus.
    # Ser eleito em SP (11M hab, PIB 93k) e diferente de municipio pequeno.
    # Cap +13 pts total distribuidos em VOT, EFI e TER.
    bonus_complexidade = 0
    if complexidade_municipal:
        pib = complexidade_municipal.get("pib_per_capita", 0)
        pop = complexidade_municipal.get("populacao", 0)
        if pib > 30000:
            bonus_complexidade += min(5, int((pib - 30000) / 34000))
        if pop > 100000:
            bonus_complexidade += min(8, int(math.log10(pop / 100000) * 5))

    if bonus_complexidade > 0:
        if votacao is not None:
            votacao = min(99, votacao + bonus_complexidade)
        if eficiencia is not None:
            eficiencia = min(99, eficiencia + bonus_complexidade // 2)
        if territorial is not None:
            territorial = min(99, territorial + bonus_complexidade)
        bonus_aplicados.append(f"Complexidade territorial (+{bonus_complexidade})")

    # ── BONUS IMPORTANCIA DO CARGO ─────────────────────────────────────
    # Presidente > Senador > Governador > Dep.Fed > Dep.Est > Prefeito > Vereador
    # Aplicado como bonus GLOBAL no overall final (nao nas dimensoes).
    cargo_atual = (cargos[0].cargo if cargos else "").upper()
    capitais = {"São Paulo", "Rio de Janeiro", "Belo Horizonte", "Salvador",
                "Brasília", "Fortaleza", "Curitiba", "Recife", "Porto Alegre",
                "Manaus", "Belém", "Goiânia", "Guarulhos", "Campinas"}
    municipio_atual = getattr(cargos[0], "municipio", None) if cargos else None
    eh_capital = municipio_atual in capitais if municipio_atual else False

    bonus_cargo = 0
    cargo_label = None
    if cargo_atual == "PRESIDENTE":
        bonus_cargo, cargo_label = 15, "Presidente"
    elif cargo_atual == "SENADOR":
        bonus_cargo, cargo_label = 10, "Senador"
    elif cargo_atual == "GOVERNADOR":
        bonus_cargo, cargo_label = 8, "Governador"
    elif cargo_atual == "DEPUTADO FEDERAL":
        bonus_cargo, cargo_label = 5, "Dep. Federal"
    elif cargo_atual in ("DEPUTADO ESTADUAL", "DEPUTADO DISTRITAL"):
        bonus_cargo, cargo_label = 3, "Dep. Estadual"
    elif cargo_atual == "PREFEITO":
        bonus_cargo, cargo_label = (6, "Prefeito de capital") if eh_capital else (2, "Prefeito")
    elif cargo_atual == "VEREADOR":
        bonus_cargo, cargo_label = (3, "Vereador de capital") if eh_capital else (0, "Vereador")

    if bonus_cargo:
        bonus_aplicados.append(f"{cargo_label} (+{bonus_cargo})")

    # ── BONUS STAR PLAYER DO PARTIDO ───────────────────────────────────
    # Colocacao dentro do partido afeta VOT e ART.
    # Dados vem do bloco Comparativos (proporcionais) ou do campo foi_eleito.
    comp = dossie.comparativos
    bonus_star = 0
    if comp and comp.eh_proporcional and comp.colocacao_no_partido:
        if comp.colocacao_no_partido == 1:
            bonus_star = 5
            bonus_aplicados.append("1º do partido (+5)")
        elif comp.colocacao_no_partido <= 3:
            bonus_star = 3
            bonus_aplicados.append(f"{comp.colocacao_no_partido}º do partido (+3)")
        elif comp.total_candidatos_partido and comp.colocacao_no_partido / comp.total_candidatos_partido > 0.7:
            # Ultimo terco = peso morto
            bonus_star = -3
            penalidades_aplicadas.append("Peso morto do partido (-3)")

    if bonus_star and votacao is not None:
        votacao = max(0, min(99, votacao + bonus_star))
    if bonus_star > 0 and articulacao is not None:
        articulacao = min(99, articulacao + bonus_star)

    # ── PENALIDADE PARLAMENTAR INERTE ──────────────────────────────────
    # Mandato ativo + 0 projetos aprovados = flag de politico midiatico/inerte.
    # NAO aplica a Senador: no Senado, volume de autoria e proxy inverso de
    # articulacao (senador forte relata, nao apresenta). Estudo Sonnet 20/04.
    #
    # Condicoes amaciadas (Mecanismo 4, 20/04/2026):
    # Aplica apenas se TODAS verdadeiras:
    #   1. Nao e Senador (mantido)
    #   2. 0 aprovados + >= 10 apresentados (mantido)
    #   3. VOT abaixo de 70 como proxy de top-25% (fenomenos eleitorais
    #      compensam falta de aprovacoes por agenda politica, nao por inercial)
    cargo_up = (cargo_atual or "").upper()
    if (
        cargo_up != "SENADOR"
        and legis.disponivel
        and (legis.projetos_aprovados or 0) == 0
        and (legis.projetos_apresentados or 0) >= 10
        and (votacao or 0) < 70  # proxy top-25%: VOT alto = fenomeno, nao inerte
    ):
        if articulacao is not None:
            articulacao = max(0, articulacao - 15)
        penalidades_aplicadas.append("Parlamentar inerte (-15 ART)")

    # ── PENALIDADE CARREIRA FLUTUANTE ──────────────────────────────────
    # 3+ cargos diferentes em 3+ eleicoes = oportunismo de cargo.
    if cargos and len(cargos) >= 3:
        cargos_distintos = len(set(c.cargo for c in cargos))
        if cargos_distintos >= 3:
            if potencial is not None:
                potencial = max(0, potencial - 10)
            penalidades_aplicadas.append("Carreira flutuante (-10 POT)")

    # ── PENALIDADE FICHA SUJA REINCIDENTE ──────────────────────────────
    if juridico and (juridico.ciclos_inapto or 0) >= 2:
        if integridade is not None:
            integridade = max(0, integridade - 20)
        penalidades_aplicadas.append("Ficha suja reincidente (-20 INT)")

    # ── OVERALL ─────────────────────────────────────────────────────────
    # Media PONDERADA pela matriz PESOS_OVERALL_POR_CARGO (estudo Sonnet 20/04).
    # Quando um atributo e None, seu peso e redistribuido proporcionalmente
    # entre os atributos restantes para nao puxar o overall pra baixo.
    dims_map = {
        "VOT": votacao, "EFI": eficiencia, "ART": articulacao, "FID": fidelidade,
        "FIN": financeiro, "TER": territorial, "POT": potencial, "INT": integridade,
    }
    chave_pesos = _resolver_chave_pesos(cargo_atual, eh_capital)
    pesos_cargo = PESOS_OVERALL_POR_CARGO.get(chave_pesos, PESOS_DEFAULT)

    soma_pesos_validos = sum(pesos_cargo[k] for k, v in dims_map.items() if v is not None)
    if soma_pesos_validos > 0:
        overall = min(99, int(
            sum(v * pesos_cargo[k] for k, v in dims_map.items() if v is not None)
            / soma_pesos_validos
        ))
    else:
        overall = None

    # Guarda a base pra aplicar cap de bonus (+15) mais abaixo.
    overall_base_ponderado = overall

    # Bonus global de cargo aplicado SOBRE o overall final
    if overall is not None and bonus_cargo:
        overall = min(99, overall + bonus_cargo)

    # ── BONUS DE LIGA (partido -> candidato) ──────────────────────────
    # Analogia Endrick: mesmo jogador, liga diferente = Overall diferente.
    # Candidato em partido Gigante (overall 85+ no escopo) ganha +5.
    # Candidato em partido Grande (75-84) ganha +3. Medio (65-74) ganha +1.
    # O partido_overall ja e o Overall REGIONAL correspondente ao escopo
    # do candidato (vereador SP recebe UB-SP-capital, dep fed SP recebe UB-SP).
    if overall is not None and partido_overall is not None:
        bonus_liga = 0
        liga_label = None
        if partido_overall >= 85:
            bonus_liga, liga_label = 5, "Gigante"
        elif partido_overall >= 75:
            bonus_liga, liga_label = 3, "Grande"
        elif partido_overall >= 65:
            bonus_liga, liga_label = 1, "Medio"
        if bonus_liga > 0:
            overall = min(99, overall + bonus_liga)
            sigla_tag = f" {partido_sigla}" if partido_sigla else ""
            bonus_aplicados.append(f"Liga{sigla_tag} {liga_label} (+{bonus_liga})")

    # ── BONUS ARQUETIPO POLITICO ────────────────────────────────────────
    # Detecta se o candidato encaixa em arquétipos puros (Fenomeno, Trabalhador,
    # Articulador, Chefe de base, Tecnico-legislador). Bonus cumulativos.
    # Usa os valores POS-penalidades para nao premiar quem foi penalizado.
    # `_cargo` permite excluir Presidente/Governador de "Chefe de base".
    dims_para_arquetipos = {
        "VOT": votacao, "EFI": eficiencia, "ART": articulacao, "FID": fidelidade,
        "FIN": financeiro, "TER": territorial, "POT": potencial, "INT": integridade,
        "_cargo": cargo_atual,
    }
    arquetipos_detectados = _detectar_arquetipos(dims_para_arquetipos)
    for nome_arq, bonus_arq in arquetipos_detectados:
        if overall is not None:
            overall = min(99, overall + bonus_arq)
        bonus_aplicados.append(f"{nome_arq} (+{bonus_arq})")

    # ── BONUS RECORDE ELEITORAL ─────────────────────────────────────────
    # Passado pelo chamador que tem contexto async (db). Valor pre-calculado
    # via _calcular_bonus_recorde. Se nao passado, nao aplica (0, []).
    bonus_recorde_pts, traits_recorde = bonus_recorde
    if bonus_recorde_pts > 0 and overall is not None:
        overall = min(99, overall + bonus_recorde_pts)
        bonus_aplicados.append(f"Recorde eleitoral (+{bonus_recorde_pts})")

    # ── CAP DE BONUS (+15) ──────────────────────────────────────────────
    # Evita saturacao em 99 por pilha de bonus (Lula/Tarcísio chegavam em 98/99
    # com complexidade + cargo + recorde + arquetipo + liga). Se o overall
    # subiu mais que 15 pontos acima da media ponderada base, limita.
    # Preserva os labels em bonus_aplicados (transparencia) mas ajusta o valor.
    if overall is not None and overall_base_ponderado is not None:
        acrescimo = overall - overall_base_ponderado
        if acrescimo > 15:
            overall = min(99, overall_base_ponderado + 15)

    # ── TIER ────────────────────────────────────────────────────────────
    tier = None
    if overall is not None:
        if overall >= 85:
            tier = "dourado"
        elif overall >= 75:
            tier = "ouro"
        elif overall >= 65:
            tier = "prata"
        else:
            tier = "bronze"

    # ── TRAITS ESPECIAIS (cartinhas FIFA) ──────────────────────────────
    traits: list[str] = []
    if cargos:
        n_eleicoes = len(cargos)
        n_vitorias = sum(1 for c in cargos if c.resultado == "ELEITO")
        ultima_eleito = cargos[0].resultado == "ELEITO"
        penultima_eleito = cargos[1].resultado == "ELEITO" if len(cargos) >= 2 else None

        if n_eleicoes >= 4 and n_vitorias >= 3:
            traits.append("LEGEND")
        if ultima_eleito:
            traits.append("CAMPEAO")
        if comp and comp.percentil and comp.percentil >= 90:
            traits.append("FERA")
        if penultima_eleito is False and ultima_eleito:
            traits.append("COMEBACK")
        if n_eleicoes == 1:
            traits.append("ESTREANTE")

    # Traits de recorde eleitoral (FENOMENO, FERA_REGIONAL) vem do chamador
    for t in traits_recorde:
        if t not in traits:
            traits.append(t)

    return OverallFifa(
        votacao=votacao,
        eficiencia=eficiencia,
        articulacao=articulacao,
        fidelidade=fidelidade,
        financeiro=financeiro,
        territorial=territorial,
        potencial=potencial,
        integridade=integridade,
        overall=overall,
        tier=tier,
        traits=traits,
        bonus_aplicados=bonus_aplicados,
        penalidades_aplicadas=penalidades_aplicadas,
    )


# ════════════════════════════════════════════════════════════════════════════
# ORQUESTRADOR
# ════════════════════════════════════════════════════════════════════════════


def enriquecer_inteligencia(
    dossie: DossiePolitico,
    complexidade_municipal: dict | None = None,
    partido_overall: Optional[int] = None,
    partido_sigla: Optional[str] = None,
    bonus_recorde: tuple[int, list[str]] = (0, []),
) -> DossiePolitico:
    """
    Funcao orquestradora chamada pelo `compilar_dossie` no fim do pipeline.
    Recebe um `DossiePolitico` com os blocos de DADOS preenchidos e
    devolve o mesmo objeto com os blocos `inteligencia` e `resumo_executivo`
    populados.

    complexidade_municipal: {"pib_per_capita": float, "populacao": int}
    do municipio da ultima candidatura. Usado para bonus territorial.

    partido_overall: Overall FIFA do partido no ESCOPO do candidato (vereador
    SP -> UB-SP-capital, dep fed SP -> UB-SP, presidente -> UB nacional).
    Usado como bonus de liga (Endrick/Chelsea).

    bonus_recorde: (pontos, traits) pre-calculado pelo chamador async (compilar_dossie)
    via _calcular_bonus_recorde. Passado como (0, []) quando nao disponivel.

    Funcao pura - nao le do banco, nao chama servico externo.
    """
    # Calcula scores individuais (formulas proprias)
    s_eleitoral = calcular_score_eleitoral(dossie)
    s_financeiro = calcular_score_financeiro(dossie)
    s_politico = calcular_score_politico(dossie)
    s_juridico = calcular_score_juridico(dossie)

    # Preenche risco_juridico no bloco de dados (frontend/PDF leem de la)
    dossie.juridico.risco_juridico = _derivar_risco_juridico(s_juridico)

    # Score provisorio (sera realinhado com Overall abaixo)
    score = Score(
        eleitoral=s_eleitoral,
        juridico=s_juridico,
        financeiro=s_financeiro,
        politico=s_politico,
        digital=None,
        eleitoral_disponivel=s_eleitoral is not None,
        juridico_disponivel=s_juridico is not None,
        financeiro_disponivel=s_financeiro is not None,
        politico_disponivel=s_politico is not None,
        digital_disponivel=False,
    )
    score.geral = _calcular_score_geral(score)

    comportamento = calcular_comportamento(dossie)
    alertas = gerar_alertas(dossie)

    # Inteligencia parcial (para classificar usa score ja preenchido)
    dossie.inteligencia = Inteligencia(
        comportamento=comportamento,
        alertas=alertas,
        score=score,
        overall_fifa=OverallFifa(),
        classificacao=Classificacao(),
    )
    dossie.inteligencia.classificacao = classificar(dossie, score)

    # Overall FIFA (precisa do comportamento + inteligencia preenchidos)
    fifa = calcular_overall_fifa(
        dossie,
        complexidade_municipal,
        partido_overall=partido_overall,
        partido_sigla=partido_sigla,
        bonus_recorde=bonus_recorde,
    )
    dossie.inteligencia.overall_fifa = fifa

    # Alinhar Score com Overall: Score.geral = Overall.overall
    # As dimensoes do Score mapeiam para medias do FIFA:
    # ELE = media(VOT, EFI), FIN = FIN do FIFA, POL = media(FID, ART)
    if fifa.overall is not None:
        score.geral = float(fifa.overall)
        if fifa.votacao is not None and fifa.eficiencia is not None:
            score.eleitoral = round((fifa.votacao + fifa.eficiencia) / 2, 1)
        if fifa.financeiro is not None:
            score.financeiro = float(fifa.financeiro)
        if fifa.fidelidade is not None and fifa.articulacao is not None:
            score.politico = round((fifa.fidelidade + fifa.articulacao) / 2, 1)
        elif fifa.fidelidade is not None:
            score.politico = float(fifa.fidelidade)
        dossie.inteligencia.score = score

    # Resumo executivo só faz sentido com inteligência preenchida
    dossie.resumo_executivo = gerar_resumo_executivo(dossie)

    return dossie
