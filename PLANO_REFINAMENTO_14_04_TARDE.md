# Plano de Refinamento de Microzonas — 14/04/2026 16:40

## 1. Panorama atual SP capital

| Metrica | Valor |
|---|---|
| Total microzonas | 520 |
| `origem = 'voronoi_v2'` (pipeline automatico) | 474 |
| `origem = 'voronoi_v2_plus_manual'` | 1 |
| `origem = 'manual_edit'` | 45 (39 congeladas + 6 livres) |
| MultiPolygon (>1 parte) | 59 |
| Partes < 1ha ainda no mapa | 3 |
| **Cobertura SP** | **95.35%** (caiu de 99.91% apos SQL de limpeza de partes < 1ha) |

**Regressao identificada:** o SQL one-shot que rodei pra limpar partes < 1ha cortou ~4.5% de area de SP. Partes pequenas nao eram so agulhas — algumas eram fragmentos legitimos (ilhas em rio, parte separada por estrada). Esse SQL foi **gambiarra** e deixou a cobertura abaixo do estado anterior.

## 2. Inventario dos ETLs (estado atual)

| ETL | Funcao | Filtro origem | Respeita `congelada_em`? | Rastreavel (audit)? |
|---|---|---|---|---|
| 20 | Voronoi inicial via OSM | - | - | Via UPSERT |
| 20b | Voronoi via locais_votacao (fallback 15 distritos) | - | - | Nao |
| 22 | Bordas dissolvidas (line layer) | Todas | - | - |
| 23 | Limpeza P2+P0+P1 (reatribuir, descartar, opening) | voronoi_v2 + plus_manual | Sim | **Sim** |
| 26 | Remove holes internos < 50k m² | voronoi_v2 | Sim | Sim |
| 29 | Fecha slivers (gaps microscopicos) | voronoi_v2 | Sim | Sim |
| 30 | Suaviza bordas + remove holes degenerados | voronoi_v2 | Sim | Sim |
| 31 | Refinamento iterativo (SimplifyVW+Closing) | voronoi_v2 + plus_manual | Sim | Nao |
| 32 | Poda invasoes + vertices agudos | voronoi_v2 + plus_manual | Sim | Nao |
| 33 | Preenche gaps distrito-microzona | voronoi_v2 + plus_manual | **Bug fixado hoje** | Nao |
| 35 | Agulhas MultiPoly + gaps pequenos | voronoi_v2 + plus_manual | **Bug fixado hoje** | Nao |
| 36 | Chaikin arredondar fronteiras | voronoi_v2 + plus_manual | Sim | Nao |
| 36b | Chaikin agressivo (distritos > 1500ha) | voronoi_v2 + plus_manual | Sim | Nao |
| 37 | Reatribuir setores ao distrito correto | voronoi_v2 | Sim | Nao |

## 3. Pipeline oficial atual (`/tmp/pipeline_sp_v3.sh`)

```
31 → 32 → 33 → 35 → 36 → 23 --agressivo → 22
```

## 4. Conflitos de semantica identificados

**4.1. Regeneracao de geometria conflita com edicao manual**
- ETL 23 P2 regenera `geometry = ST_Union(setores)` em cada rodada pra garantir determinismo
- ETL 37 tambem regenera via setores
- Esses ETLs **destroem a geometria calibrada** do usuario se a microzona nao foi marcada como `manual_edit`
- O endpoint PATCH marca `origem='manual_edit'` apos edicao, entao a geometria do usuario fica protegida — MAS isso depende de todos ETLs filtrarem `manual_edit` fora, o que nao era o caso ate hoje.

**4.2. Bugs recorrentes de UPDATE sem filtro `congelada_em`**
- Ja corrigi em 2 ETLs hoje (33 e 35), mas o padrao pode estar em outros lugares
- Todo UPDATE que seleciona VIZINHA (nao so a microzona-alvo) precisa filtrar congelada_em
- Impacto: microzonas congeladas foram sobrescritas 3 vezes hoje. Restaurei 17 + 20 = 37 calibracoes manuais do audit.

**4.3. Diferenca entre "parte agulha" e "microzona agulha"**
- ETL 35 passo A remove PARTE-agulha de MultiPolygon (compac < 0.12)
- Agulhas visuais da imagem sao **partes microscopicas** (0.00-0.03ha) que ST_Buffer/Simplify deixa como artefato
- Essas nao tem compac < 0.12 mas sao IMPERCEPTIVEIS de tao pequenas
- Precisa criterio **absoluto por area** (< 1ha) alem de compacidade

**4.4. Setores censitarios desincronizados com geometria**
- ETL 23 P0 tenta reatribuir setores orfaos
- Mas setores podem estar fisicamente DENTRO de distrito X e atribuidos a microzona Y
- ETL 37 tentou corrigir isso mas o fix regenerou geometria e reintroduziu partes dentadas
- **Causa raiz do problema atual:** a cascata setores_censitarios.microregiao_id nao eh 100% consistente com geometria.

## 5. Raiz do problema visual (as agulhas do Morro Doce)

1. Microzona Morro Doce (805ha, compac 0.09) tem forma naturalmente dentada (distrito tentacular Anhanguera)
2. Apos ETL 23 P1 agressivo: encolheu levemente
3. Apos ETL 35: removeu so partes com compac < 0.12
4. Apos Chaikin (36): adicionou vertices mas manteve tentaculos grandes
5. **Resultado: MultiPolygon com 5 partes: 1 de 798ha + 4 de 0.00-0.03ha**
6. MapLibre pinta cada parte como poligono separado, **mostra label em cada centroide** → **3+ labels "Morro Doce"** visualmente
7. Partes < 1ha sao invisiveis como fill mas aparecem como **outlines pretas no zoom alto** → "agulhas"

## 6. Por que o editor nao apaga

- Editor frontend pega so a **parte maior** do MultiPolygon ao abrir (linha 914 MapaEleitoral.tsx)
- Apagar via botao vermelho deleta a MICROZONA INTEIRA (parte maior inclusa) — nao so as agulhas
- Usuario quer apagar so as partes microscopicas mas o editor nao tem essa granularidade

## 7. Plano concreto (zero gambiarra, zero ETL novo)

### Fase A — Correcao de regressao (urgente)

Rodar ETL 23 COMPLETO (nao so agressivo) em SP pra:
1. Recuperar cobertura (ETL 23 P2 reatribui orfaos via adjacencia)
2. Consolidar partes microscopicas (P0-finalizador tem logica pra isso)
3. Registrar em audit

### Fase B — Adicionar passo P3 no ETL 23 (nao novo ETL)

Criar funcao `p3_limpar_partes_microscopicas` dentro do ETL 23:

```python
def p3_limpar_partes_microscopicas(municipio_id, distrito_cd, area_min_m2=5_000):
    """Remove partes de MultiPolygon com area < area_min_m2 (default 0.5ha)
    apenas se a microzona tiver ao menos 1 parte >= 10ha (protege ilhas legitimas).
    Compensacao: os setores associados as partes removidas sao reatribuidos
    via P2 imediatamente depois (mantem cobertura)."""
```

Guard principal: SO remove parte microscopica se existir parte principal >= 10ha. Isso protege distritos com areas genuinamente fragmentadas.

### Fase C — Ferramenta visual pra Cesar

Adicionar no editor frontend um botao **"Limpar agulhas"** que chama novo endpoint:
- `POST /mapa/microregiao/{id}/limpar-agulhas`
- Mantem parte principal, descarta partes < N ha configuraveis
- Retorna preview antes de confirmar

### Fase D — Auditoria de todos ETLs

Checklist de ETL compliance (executar pra cada ETL de 20 a 37):
- [ ] Filtra `origem IN ('voronoi_v2', 'voronoi_v2_plus_manual')` em TODOS SELECTs
- [ ] Filtra `congelada_em IS NULL` em TODOS UPDATEs (incluindo vizinhas)
- [ ] Registra audit via `_atualizar_hash_e_audit` do ETL 23
- [ ] Passa no teste de determinismo (2 rodadas seguidas = hash identico)

Produzir planilha com resultado. ETLs reprovados entram em fila de correcao.

## 8. Riscos

| Risco | Mitigacao |
|---|---|
| Fase A pode reintroduzir formas brutas (como ETL 37 fez antes) | Rodar com pipeline completo em sequencia (31→32→33→35→36→23) pra suavizar apos P2 |
| Fase B pode remover partes legitimas | Guard "so se existir parte principal >= 10ha" |
| Fase D pode revelar mais bugs | Melhor saber agora do que em producao |

## 9. O que NAO vou fazer

- Nao crio ETL 38/39/40 novos
- Nao rodo mais SQL one-shot sem filtro completo
- Nao toco em manual_edit congeladas ou nao congeladas
- Nao executo nada sem Cesar aprovar

## 10. Pergunta pro GPT

1. A cascata `setores_censitarios.microregiao_id` → `ST_Union(setores)` → `geometry` eh a fonte de verdade certa? Ou a geometria calibrada deveria ser a fonte?
2. Guards de 5% area total + 1ha absoluto + compac < 0.12 sao suficientes pra detectar "agulha" vs "ilha legitima"? Tem criterio melhor?
3. Qual ordem final correta do pipeline considerando que 23 P2 regenera geometry via setores?
