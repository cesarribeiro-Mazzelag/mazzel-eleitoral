# Fase D — Relatorio de Auditoria dos 14 ETLs (14/04/2026 17h)

## Criterios auditados

- **C1** SELECT microzonas-alvo: `origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')` E `congelada_em IS NULL`
- **C2** SELECT de VIZINHAS (union/diff/boundary): mesmo filtro de C1
- **C3** UPDATE na microzona-alvo: `origem != 'manual_edit' AND congelada_em IS NULL`
- **C4** UPDATE em VIZINHA: mesmos guards que C3
- **C5** NAO regenera `geometry` via `ST_Union(setores)` automaticamente
- **C6** Chama `_atualizar_hash_e_audit()` pra versionar
- **C7** Determinismo (2 rodadas = mesmo hash)
- **C8** Filtra `calibrada_final = FALSE` (coluna criada hoje, migration 029)

OK / FALHA / N/A = nao se aplica.

## Tabela de compliance

| ETL | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | Gravidade | Problema principal |
|---|---|---|---|---|---|---|---|---|---|---|
| 20 | N/A | N/A | N/A | N/A | OK | N/A | OK | FALHA | MEDIA | INSERT-only. Geometry via `ST_Union(setores)` ao criar (aceitavel). |
| 20b | N/A | N/A | N/A | N/A | OK | N/A | OK | FALHA | MEDIA | Idem 20. Usa locais_votacao como semente. |
| 22 | N/A | N/A | N/A | N/A | N/A | N/A | OK | FALHA | BAIXA | So le. Escreve em `microregioes_bordas`, nao em `microregioes`. |
| **23** | OK | OK | OK | N/A | **FALHA** | OK | OK | FALHA | **ALTA** | `_regenerar_geometria` reseta via `ST_Union(setores)` antes de P2/P0/P1. Destroi calibracao em voronoi_v2. Filtro origem protege manual_edit. |
| 26 | OK | N/A | OK | N/A | N/A | OK | OK | FALHA | BAIXA | So remove holes internos. Guards corretos. So C8 falta. |
| 29 | OK | N/A | OK | N/A | N/A | OK | OK | FALHA | BAIXA | Fecha slivers. Guards corretos. So C8 falta. |
| 30 | OK | N/A | OK | N/A | OK | OK | OK | FALHA | BAIXA | Suaviza bordas. Guards corretos. So C8 falta. |
| **31** | OK | **FALHA** | OK | **FALHA** | OK | **FALHA** | OK | FALHA | **ALTA** | SELECT de vizinhas sem `congelada_em`. UPDATE em vizinha pode sobrescrever congeladas. Sem audit. |
| **32** | OK | **FALHA** | OK | **FALHA** | OK | **FALHA** | OK | FALHA | **ALTA** | Mesmo padrao do 31. Vizinhas sem guard. Sem audit. |
| 33 | OK | OK | OK | OK | OK | **FALHA** | OK | FALHA | MEDIA | Fix dos guards de vizinha feito hoje. Falta audit. |
| 35 | OK | OK | OK* | OK | N/A | **FALHA** | OK | FALHA | MEDIA | Passo A: UPDATE usa CTE `candidatas` ja filtrada (OK mas fragil — melhor adicionar guard redundante no UPDATE). Sem audit. |
| 36 | OK | OK | OK | OK | N/A | **FALHA** | OK | FALHA | BAIXA | Chaikin. Sem audit. |
| 36b | OK | OK | OK | OK | N/A | **FALHA** | OK | FALHA | BAIXA | Chaikin agressivo. Duplica 36 — **candidato a remocao apos estender 36 com flag**. |
| **37** | OK | OK | **FALHA** | N/A | **FALHA** | **FALHA** | OK | FALHA | **ALTA** | Regenera geometry em massa via `ST_Union(setores)`. UPDATE sem `congelada_em`. Sem audit. |

## Resumo de falhas por gravidade

### ALTA (bloqueadores)

- **ETL 23** — `_regenerar_geometria` reseta geom via setores antes de cada passo. Conflita com principio "geometria calibrada eh fonte de verdade". Precisa flag `--reset-from-setores` opt-in, nao default.
- **ETL 31** — SELECT de vizinhas (linha 185-190) sem filtro `congelada_em`. UPDATE em vizinha nao garante protecao. Sem audit.
- **ETL 32** — Mesmo padrao de 31. SELECT vizinhas (linha 122-127) sem `congelada_em`. UPDATE em vizinha desprotegido. Sem audit.
- **ETL 37** — Regenera geom via `ST_Union(setores)` em massa (linhas 71-82). UPDATE sem `congelada_em` no passo 3 (linha 115). Sem audit. Ja causou destruicao de calibracoes hoje.

### MEDIA (relevantes)

- **ETL 33** — Guards de vizinha ok (fix hoje). Falta audit. C8.
- **ETL 35** — Passo A fragil (UPDATE sem guard redundante). Sem audit. C8.
- **ETL 20 / 20b** — INSERT-only, mas nao marcam nova microzona com hash/audit inicial.
- **ETL 30** — Guards ok. So C8 falta.

### BAIXA

- **ETL 22** — Escreve em outra tabela. So C8.
- **ETL 26, 29** — Compliance bom. So C8.
- **ETL 36, 36b** — Sem audit. So C8. 36b duplicado.

## Impactos confirmados hoje

1. **ETL 35 C4 (pre-fix):** 17 manual_edit congeladas sobrescritas em Parelheiros/Santo Amaro. Restauradas do audit.
2. **ETL 33 C4 (pre-fix):** 20 manual_edit sobrescritas. Restauradas do audit.
3. **ETL 37 C5:** Regenerou 480 microzonas via `ST_Union(setores)`, reintroduziu formas brutas e caiu cobertura de 99.9% pra 99.4% (cascata de consequencias).

## Recomendacao de ordem de correcao

### Wave 1 (ALTA — bloqueio total do pipeline)

1. **ETL 37 → Reescrever.** Remover regeneracao de geometry. So `UPDATE setores_censitarios` (atribuicao analitica). Adicionar audit. Se precisa de limpeza geom, delegar pro ETL 23 P2 com flag explicita.

2. **ETL 23 → Tornar reset opt-in.** `_regenerar_geometria` so roda com `--reset-from-setores`. Default: trabalha em cima da geometry atual. Adicionar check C8.

3. **ETL 31 / 32 → Fix vizinhas.** Adicionar `AND mr.congelada_em IS NULL AND mr.origem != 'manual_edit'` no SELECT de vizinhas. Adicionar `_atualizar_hash_e_audit` ao fim.

### Wave 2 (MEDIA — governanca)

4. **ETL 33, 35, 36, 36b → Adicionar audit.** Chamada `_atualizar_hash_e_audit` ao fim. ETL 35 ganha guard redundante no UPDATE Passo A.

5. **Todos ETLs com UPDATE → Adicionar `AND calibrada_final = FALSE`** (C8).

6. **ETL 30, 26, 29 → Adicionar C8.**

### Wave 3 (consolidacao)

7. **Deletar ETL 36b** (duplicado), adicionar flag `--agressivo` no 36. Igual ao que fiz com ETL 39 → 23 hoje.

8. **ETL 20, 20b → Marcar hash inicial** no INSERT pra rastreabilidade.

## Plano de governanca apos fix

Constantes compartilhadas num modulo `etl/_governanca.py`:

```python
FILTRO_ALVO = (
    "origem IN ('voronoi_v2', 'voronoi_v2_plus_manual') "
    "AND congelada_em IS NULL AND calibrada_final = FALSE"
)
FILTRO_VIZINHA = FILTRO_ALVO  # mesmo
FILTRO_UPDATE = (
    "origem != 'manual_edit' AND congelada_em IS NULL AND calibrada_final = FALSE"
)
```

Todos ETLs passam a reusar.

## Backup preservado

`backup_microregioes_20260414_1640` com 520 linhas (estado pre-Fase-D). Se algum fix quebrar coisa, recuperacao direta via `UPDATE ... FROM backup_...`.

## Proximo passo

Aguardando Cesar/GPT priorizar Wave 1 (4 ETLs altos). **Nao executo nenhuma correcao sem aprovacao explicita.**
