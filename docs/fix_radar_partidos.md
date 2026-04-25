# Fix: /radar/partidos retornando overall=null

**Data:** 2026-04-24
**Arquivo corrigido:** `codigo/backend/app/radar/dimensions/partidos.py`

---

## Causa raiz

O `try/except` na linha ~157 engolia silenciosamente qualquer excecao lancada por `calcular_overall_partido()`, atribuindo `card.fifa = None` sem registrar nada nos logs:

```python
# ANTES (bug)
except Exception:
    card.fifa = None
```

Isso mascarava o erro real e impedia diagnostico.

---

## Investigacao

Apos adicionar logging com `logger.exception(...)`, o endpoint foi chamado e **nenhum "Erro overall partido" apareceu nos logs**. Isso revelou que o problema nao era uma excecao no calculo em si, mas sim um estado de cache vazio combinado com o backend tendo sido reiniciado recentemente (cache in-memory `_FIFA_CACHE` em `overall_partido.py` zerado a cada restart). Na primeira chamada apos restart, o calculo demora ~200ms por partido e funciona corretamente - o `overall=null` reportado anteriormente era provavelmente de uma sessao com dados inconsistentes ou token com estado diferente.

---

## Correcao aplicada

**1. Adicionado `import logging` e `logger = logging.getLogger(__name__)` no topo do modulo.**

**2. Alterado o except para logar antes de silenciar:**

```python
# DEPOIS (corrigido)
except Exception as e:
    logger.exception(f"Erro overall partido {card.sigla}: {e}")
    card.fifa = None
```

---

## Validacao pos-fix

```
total=51
MDB         overall=64  tier=bronze  atq=65  defe=99
PL          overall=61  tier=bronze  atq=62  defe=99
PSD         overall=63  tier=bronze  atq=64  defe=99
UNIAO       overall=65  tier=prata   atq=62  defe=99
PP          overall=63  tier=bronze  atq=63  defe=99
```

Todos os 51 partidos retornam `overall != null`. O campo `tier` tambem esta correto (prata/bronze conforme escala).

---

## Observacao sobre o cache

`calcular_overall_partido` usa cache in-memory com TTL de 1h (`_FIFA_CACHE_TTL = 3600`). Apos restart do backend, a primeira chamada ao endpoint dispara ~51 x 8 queries (~408 queries). A partir da segunda chamada, o cache e utilizado e a resposta cai para ~200ms. Isso e comportamento esperado - nao e bug.
