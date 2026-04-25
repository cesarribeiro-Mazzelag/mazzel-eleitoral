# Auditoria de Cobertura de Dados por Cargo

**Data:** 2026-04-24
**Banco:** `uniao_brasil` via `ub_postgres`

---

## Tabela de Cobertura

> **Notas de leitura:**
> - "Total candidaturas" = soma de todas as eleicoes no banco (nacionais: 2018+2022; municipais: 2020+2024)
> - "Eleitos" = soma de ambas as eleicoes disponiveis
> - "% Overall" = cobertura em `mv_radar_politicos` (pct_rank + classificacao calculados); nao existe tabela de Overall FIFA implementada ainda
> - "% Foto" = foto_url IS NOT NULL AND != '' na tabela `candidatos`
> - "% Bio" = bio_resumida IS NOT NULL na tabela `candidatos`
> - "% Sancoes" = ao menos 1 registro em `sancoes_administrativas` (CEIS/CEAF/TCU)
> - "% Financeiro" = `prestacao_resumo_candidato` vinculado (calculado sobre eleicoes 2022/2024 - dado mais completo)
> - "% Ativ Legis" = ao menos 1 mandato vinculado em `mandatos_legislativo`
> - "% Ativ Exec" = ao menos 1 registro em `mandatos_executivo` ou `atividade_executivo`

| Cargo | Total Candidaturas | Eleitos | Eleicoes no banco | % Foto | % Overall | % Bio | % Sancoes | % Financeiro* | % Ativ Legis | % Ativ Exec |
|---|---|---|---|---|---|---|---|---|---|---|
| PRESIDENTE | 27 | 1 | 2018, 2022 | 100,0 | 100,0 | 63,6 | 0,0 | 0,0 | 9,1 | 4,5 |
| GOVERNADOR | 428 | 41 | 2018, 2022 | 100,0 | 100,0 | 26,6 | 0,3 | 91,5 | 6,6 | 0,3 |
| SENADOR | 624 | 80 | 2018, 2022 | 100,0 | 100,0 | 24,2 | 0,3 | 87,7 | 12,9 | 0,0 |
| DEPUTADO FEDERAL | 19.117 | 1.025 | 2018, 2022 | 100,0 | 100,0 | 4,6 | 0,3 | 87,1 | 3,2 | 0,0 |
| DEPUTADO ESTADUAL | 34.611 | 2.068 | 2018, 2022 | 100,0 | 100,0 | 2,6 | 0,2 | 87,0 | 0,5 | 0,0 |
| PREFEITO | 35.278 | 11.098 | 2020, 2024 | 100,0 | 99,7 | 1,6 | 0,5 | 96,7 | 0,2 | 0,0 |
| VEREADOR | 950.031 | 116.270 | 2020, 2024 | 100,0 | 100,0 | 0,1 | 0,1 | 84,0 | 0,0 | 0,0 |

*Financeiro calculado sobre eleicoes 2022/2024. Presidente 2022 tem 0% pois prestacao de contas presidential nao foi carregada no ETL.

---

## Observacoes tecnicas por dimensao

**Foto:** 100% de cobertura em todos os cargos. A foto_url vem do TSE (padrao `/fotos/{ano}/{UF}/F{sequencial}_div.jpg`) e e carregada junto com os dados de candidatura.

**Overall (mv_radar):** A view `mv_radar_politicos` cobre 100% das candidaturas com `pct_rank` e `classificacao`. Porem, a tabela de **Overall FIFA** (score multidimensional planejado no projeto) ainda nao foi implementada - nao existe nenhuma coluna `overall` no banco.

**Bio:** Cobertura muito baixa para a maioria dos cargos. Os dados existentes vem de cruzamento com Wikidata. Presidente tem 63,6% (14 de 22) porque sao poucos candidatos e os principais tem pagina Wikipedia.

**Sancoes:** Apenas 1.305 registros para 1.036 candidatos unicos (CEIS: 982, CEAF: 254, TCU: 69). A cobertura parece baixa em percentual mas reflete a realidade: a maioria dos candidatos nao tem sancao ativa. O dado esta correto em valor absoluto - o gap e que pessoas sancionadas que NAO candidataram (ou cujo CPF nao foi cruzado) ficam de fora.

**Financeiro:** Fonte e `prestacao_resumo_candidato`. Presidente 2022 tem 0% - as prestacoes de contas da eleicao presidencial nao foram carregadas no ETL. Os demais cargos em 2022/2024 tem cobertura boa (84-97%).

**Atividade Legislativa:** Cobertura critica. O banco so tem 943 mandatos no total (Camara: 639, Senado: 81, Assembleia: 94, Camara Municipal: 129). Isso representa apenas os parlamentares **ativos** importados da API da Camara e Senado - nao ha historico de mandatos anteriores. Portanto, um Deputado Federal que candidatou em 2018 e NAO esta mais ativo nao aparece.

**Atividade Executiva:** Critica. Apenas 14 registros em `mandatos_executivo` (7 Presidentes + 7 Governadores, anos 1995-2023) e 6.067 em `atividade_executivo` vinculados a apenas 3 candidatos (1 Presidente, 1 Governador, 1 Prefeito).

---

## Gaps criticos

| Dimensao | Cargo afetado | Cobertura atual | Impacto |
|---|---|---|---|
| Bio | VEREADOR | 0,1% | Impossivel exibir perfil narrativo. 950k candidatos sem descricao |
| Bio | PREFEITO | 1,6% | 580 de 35 mil prefeitos com bio |
| Bio | DEPUTADO ESTADUAL | 2,6% | 834 de 32 mil deputados estaduais |
| Bio | DEPUTADO FEDERAL | 4,6% | 812 de 18 mil deputados federais |
| Ativ Legislativa | DEPUTADO ESTADUAL | 0,5% | So 94 assembleias importadas, cobrindo 74 candidatos |
| Ativ Legislativa | DEPUTADO FEDERAL | 3,2% | So 639 mandatos ativos na Camara (sem historico) |
| Ativ Legislativa | VEREADOR | 0,0% | So 129 vereadores importados (provavelmente SP) |
| Ativ Executiva | GOVERNADOR | 0,3% | 7 governadores no banco (nenhum com atividade vinculada de forma util) |
| Ativ Executiva | PREFEITO | 0,0% | Zero prefeitos com mandato executivo vinculado |
| Financeiro | PRESIDENTE | 0,0% | ETL de prestacao presidencial nao foi rodado |
| Overall FIFA | TODOS | 0,0% | Tabela ainda nao implementada |

---

## Recomendacoes ETL

### P0 - Bloqueia funcionalidade do dossie

**1. Atividade Legislativa historica (Camara Federal)**
- Hoje: so membros ativos da 57a legislatura (639 deputados)
- Necessario: importar historico de legislaturas anteriores (55a e 56a = 2014-2022) via API dados.camara.gov.br
- Endpoint: `GET /deputados?legislatura=55` e `/deputados?legislatura=56`
- Impacto: eleva cobertura de Dep Federal de 3,2% para ~60-70% dos eleitos em 2018+2022

**2. Atividade Legislativa historica (Senado)**
- Hoje: 81 senadores (legislatura atual)
- Necessario: importar senadores das legislaturas 55 e 56 via legis.senado.gov.br
- Endpoint: `GET /senadores/lista/atual?legislatura=55`
- Impacto: eleva cobertura de Senador de 12,9% para ~80-90% dos eleitos

**3. Atividade Legislativa (Assembleias Estaduais)**
- Hoje: 94 deputados estaduais importados (provavelmente SP via ALESP)
- Necessario: importar as 26 outras assembleias via portais individuais ou API SPLEGIS
- Impacto: eleva cobertura de Dep Estadual de 0,5% para ~40-60% dos eleitos

**4. Prestacao de contas Presidente 2022**
- Hoje: 0 registros em `prestacao_resumo_candidato` para presidenciaveveis
- Causa provavel: ETL filtrou apenas candidaturas municipais ou o `candidatura_id` nao foi linkado
- Acao: re-rodar ETL prestacao apenas para cargo=PRESIDENTE, verificar se ha dados na fonte TSE

### P1 - Enriquecimento do dossie

**5. Bio via Wikipedia/Wikidata**
- Hoje: ~3.549 candidatos com wikidata_qid (foco nos mais relevantes ja feito)
- Oportunidade: ~96% dos cargos menores sem bio alguma
- Estrategia realista: bio auto-gerada por IA a partir de dados estruturados (cargo, partido, votos, historico) para candidatos sem Wikipedia. Nao depende de ETL externo.
- Prioridade: Dep Federal eleitos (512 em 2018 + 513 em 2022 = ~1.025), Senadores eleitos (80), Governadores eleitos (41)

**6. Atividade Executiva - Prefeitos**
- Hoje: tabela `atividade_executivo` tem 6.067 atos mas apenas 1 prefeito vinculado
- Acao: carregar diarios oficiais municipais (pelo menos capitais + cidades acima de 500k habitantes) via Querido Diario (OK Brasil)
- Impacto: eleva cobertura dos 5.553 prefeitos eleitos em 2024

**7. Atividade Executiva - Governadores**
- Hoje: 7 governadores no `mandatos_executivo`, apenas 1 com `atividade_executivo`
- Acao: importar decretos e mensagens de assembleia dos 26 estados + DF
- Fonte: diarios oficiais estaduais

### P2 - Qualidade e completude

**8. Sancoes - ampliar alcance**
- Hoje: CEIS + CEAF + TCU (1.305 registros)
- Oportunidade: CNJ (processos judiciais), CNMP (membros do MP), portais de transparencia estaduais
- Nota: % baixa e esperada (maioria dos candidatos nao tem sancao). Prioridade menor.

**9. Overall FIFA**
- Nao existe tabela de score multidimensional implementada
- Necessario: criar tabela `overall_politico` com as 8 dimensoes planejadas (articulacao, votacao, financeiro, sancoes, atividade, presenca, historico, potencial)
- Depende dos P0/P1 acima para ter dados suficientes para calcular

**10. Vereadores capitais - atividade legislativa**
- As 129 camaras municipais importadas parecem ser de uma unica cidade (provavel SP)
- Acao: importar as 26 outras capitais + municipios acima de 300k habitantes
- Fonte: portais das Camaras Municipais (APIs variam por cidade)
