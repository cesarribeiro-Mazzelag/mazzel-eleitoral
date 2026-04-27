# Módulo Emendas

Centro de controle financeiro do partido. Auditoria de emendas parlamentares + detecção automática de inconsistências + alertas em tempo real. Dor central reportada pelo Anderson: Milton (Pres Estadual UB-SP) demora **mais de uma semana** pra saber pra onde as emendas estão indo, e não tem ferramenta pra detectar inconsistências (caso real: Santa Bárbara d'Oeste recebendo R$70-80mi sem contexto plausível).

> Decisão: César + Anderson, 27/04/2026. Módulo NOVO, separado de Tesouraria e Estudo. Acesso restrito a alta liderança partidária.

---

## Princípio organizador

Emenda = **dinheiro do partido em circulação**. Quem controla emendas controla a base. A plataforma precisa dar ao Presidente Estadual a visão que ele hoje não tem:

1. **Onde** o dinheiro está indo (mapa)
2. **Quem** mandou (parlamentar autor)
3. **Quanto** já foi pago e quanto ainda está em execução
4. **Por quê** foi destinado (finalidade declarada)
5. **Se há inconsistência** (volume desproporcional, autor sem ligação geográfica, finalidade vaga)

Tudo em tempo real (alerta no momento da aprovação) e visualmente (mapa Globo G1 com hover).

---

## Estrutura — 5 componentes

### 1. Mapa de Emendas

Reaproveita o `MapaEleitoral.tsx` em **modo emendas** (props específicas):

- **Heat map** de R$ recebido por município, no período selecionável (ano, semestre, parlamentar específico, status)
- **Cores semânticas inteligentes** (não só "muito = vermelho"):
  - **Verde escuro** = volume coerente com porte da cidade
  - **Verde claro** = volume baixo (cidade pequena, valor pequeno = normal)
  - **Amarelo** = acima do esperado mas justificável (obra estrutural, calamidade)
  - **Vermelho** = inconsistência detectada (volume desproporcional + autor sem histórico + finalidade vaga)

- **Hover G1-style** mostra:
  - Nome do município + porte (PIB, pop, IDH, ranking nacional)
  - Total recebido no período + comparativo histórico
  - **Top 3 parlamentares autores** com link pro dossiê de cada
  - **Presidente Municipal UB + Tesoureiro** (puxa da nominata via SGIP)
  - Última emenda aprovada (autor + valor + status)
  - Score de risco médio das emendas da cidade

- **Click** → drill-down do município com lista completa de emendas + estatísticas

### 2. Dossiê da Emenda (perfil individual)

Espelho do Dossiê do Político, mas pra emenda. Seções:

#### Identificação
- Número da emenda (formato oficial)
- Autor (parlamentar com link pro dossiê dele)
- Beneficiário (município, órgão executor)
- Valor empenhado
- Categoria orçamentária (saúde, educação, infraestrutura, cultura, etc.)

#### Trajetória do dinheiro (timeline visual)
- Apresentação → Aprovação → Empenho → Liquidação → Pagamento
- Cada marco com data, valor, agente responsável
- **Atrasos entre marcos** geram alerta (ex: aprovada há 6 meses sem empenho = pendente)

#### Status atual
- Pendente / Em execução / Paga / Cancelada / Devolvida
- Restos a pagar (se houver)

#### Destinação real
- Secretaria/órgão executor
- Finalidade declarada (texto oficial)
- Análise NLP da vagueza da finalidade (score)

#### Auditoria
- Prestação de contas existe? Status?
- Licitação pública vinculada?
- Contrato público acessível?
- Notas fiscais registradas?

#### Padrões do autor (cruzamento histórico)
- Outras emendas do parlamentar pra esta cidade (frequência, valores)
- Concentração geográfica (% emendas dele que vão pra esta cidade)
- Doações de campanha de empresas locais ao autor (TSE)
- Nota: presença/ausência de ligação eleitoral natural

#### Padrões do beneficiário (cruzamento)
- Outras emendas recebidas pelo município (volume, autores, distribuição)
- Histórico de contas julgadas pelo TCE
- Adversários políticos dominantes localmente
- Presidente Municipal UB local + score nominata (vinculação política)

#### Padrões do órgão executor
- Histórico CGU/TCU (sanções? investigações?)
- Licitações abertas/encerradas
- Empresa fornecedora aparece com frequência? (sinal de fornecedor único)

#### Alertas vinculados (auto-gerados)
- Inconsistência geográfica
- Sem contrapartida
- Finalidade vaga
- Padrão suspeito (lobby coordenado, captura)

#### Documentos
- Vincula com módulo Documentos (módulo separado já planejado)
- Ofícios, contratos, notas fiscais

### 3. Fluxo de Emendas (timeline + Sankey)

- **Linha do tempo** com filtros (ano, autor, município, status, valor) — visualização cronológica
- **Sankey diagram** de origem (parlamentar/partido) → destino (município/órgão)
- Útil pra detectar padrões: "este autor manda 80% das emendas pra 3 cidades" / "este órgão recebe de 12 autores diferentes"

### 4. Painel de Inconsistências (Auditoria de Anomalias)

**O coração do módulo pro Milton.** Lista priorizada de emendas com **score de risco 0-100** calculado pelo algoritmo (ver seção Algoritmo abaixo).

UI:
- Lista ordenada por score decrescente
- Cards com resumo executivo: município + autor + valor + score
- Filtros: estado, ano, valor mínimo, score mínimo
- Click → Dossiê da Emenda completo
- Botão "**Marcar como justificada**" (Tesoureiro/Pres Estadual silencia com justificativa registrada)

Caso Santa Bárbara d'Oeste vai aparecer no topo automaticamente.

### 5. Sistema de Alertas em Tempo Real

Trigger via crawl do Portal da Transparência + APIs Câmara/Senado.

**Tipos de alerta:**

| Severidade | Trigger | Quem recebe | Canal |
|------------|---------|-------------|-------|
| **CRÍTICO (vermelho)** | Nova emenda com score risco > 70 | Pres Estadual + Tesoureiro Estadual | Push + e-mail + WhatsApp |
| **ALTO (laranja)** | Emenda paga com inconsistência detectada na execução | Pres Estadual + Pres Municipal correspondente | Push + e-mail |
| **MÉDIO (amarelo)** | Nova emenda normal aprovada | Pres Municipal correspondente | In-app + e-mail digest diário |
| **BAIXO (azul)** | Atualização de status (paga, liquidada) | Tesoureiro local | In-app só |

**Princípio:** ping em tempo real só pra CRÍTICO e ALTO. MÉDIO e BAIXO vão em **digest diário às 7h**. Reduz ruído mantendo controle.

---

## Algoritmo de Score de Risco (5 dimensões)

Score combinado **0-100**, ponderado entre 5 dimensões independentes:

| Dimensão | Peso | O que mede |
|----------|------|------------|
| **1. Desproporção de volume** | 25% | Z-score per capita: R$/habitante vs benchmark de cidades similares (cluster por porte+IDH+região). Outlier = +risco |
| **2. Padrão do autor** | 25% | Parlamentar tem ligação eleitoral com a cidade? Já enviou X emendas pra cá? Sem histórico = +risco |
| **3. Vagueza de finalidade** | 20% | NLP no texto: finalidades como "apoio ao desenvolvimento" sem objeto específico = +risco. "Ampliação do hospital municipal X com Y leitos" = -risco |
| **4. Concentração e repetição** | 15% | Mesmo cluster de autores enviando pra mesma cidade ao longo de anos com finalidades repetidas = +risco |
| **5. Status de execução** | 15% | Paga sem licitação registrada / sem prestação de contas / sem nota fiscal = +risco |

**Threshold visual:**
- Score < 40 = fora do radar (verde)
- 40-70 = atenção (amarelo no painel)
- > 70 = ALERTA (vermelho, vira notificação CRÍTICA)

### Mitigação de falso-positivo

- **Whitelisting**: emendas pra obras grandes federais (ferrovia, porto, universidade) recebem flag "obra estrutural" → score reduzido automaticamente
- **Ano de calamidade pública**: estado de calamidade decretado (DOU) contextualiza emendas no período
- **Categoria orçamentária**: saúde tem benchmarks diferentes de infraestrutura. Não comparar maçã com laranja
- **Calibração regional**: cidade pequena com hospital regional recebe naturalmente mais — cluster de cidades-polo tem benchmark próprio

### Cuidado jurídico

A plataforma **não diz "fraude"**. Diz **"inconsistência detectada — investigar"**. Diferença operacional:
- Texto neutro descritivo, não acusatório
- Toda detecção tem **explicação algorítmica visível** ("Por que isso é suspeito? Volume R$/hab é 8x acima da média de cidades similares + autor sem ligação geográfica + finalidade vaga")
- Botão "Marcar como justificada" (registrado em auditoria)
- Toda ação algorítmica é logada (LGPD + auditoria)

Isso protege o partido de processo por difamação. Algoritmo aponta padrão; ação política é humana.

---

## RBAC — Quem vê o quê

Módulo de **alta sensibilidade**. Acesso restrito:

| Perfil | Acesso |
|--------|--------|
| **Super Admin Mazzel** | Total (auditoria global) |
| **Presidente Nacional** | Total |
| **Presidente Estadual** | Sua UF (todas as emendas pro estado) |
| **Presidente Municipal** | Seu município |
| **Tesoureiro** (qualquer nível) | Emendas + financeiro do nível |
| **Vice-Presidente** | Mesmo do Presidente em leitura |
| **Político eleito parlamentar** | Suas próprias emendas (não vê de outros) |
| **Secretário** | Não vê |
| **Membro de Comissão** | Não vê |
| **Equipe de Gabinete** | Acessa apenas se Chefe + Político autorizou |
| **Coord Regional / Territorial** | Não vê |
| **Cabo Eleitoral** | Não vê |
| **Filiado** | Não vê |

---

## Integração com outros módulos

| Módulo | Como Emendas se conecta |
|--------|-------------------------|
| **Mapa Estratégico** | Camada "Volume de Emendas" + "Compliance" (combina nominatas + emendas) |
| **Dossiê do Político** (parlamentar) | Aba "Emendas autoradas" no dossiê dele com timeline + alertas |
| **Dossiê do Município** | Bloco "Emendas recebidas" com lista + total |
| **Diretórios & Comissões** | Vínculo: emendas da região × Presidente Municipal local (responsabilidade política) |
| **Tesouraria** | Visão consolidada de receitas/despesas inclui emendas executadas pelo partido |
| **Documentos** | Anexos vinculados (ofícios, contratos, NFs) |
| **Alertas** | Notificações inteligentes integradas ao módulo Alertas geral |
| **Operações** | Resposta a inconsistência pode virar Operação ("investigar emenda X em município Y") |
| **Radar Político** | Padrões coletivos (lobby coordenado, captura regional) alimentam o Radar |
| **Estudo** | Panorama nacional de emendas por região alimenta análises temáticas |

---

## Fontes de dados (backend ETL — Sprint dedicado)

| Dado | Fonte | Custo | Status |
|------|-------|-------|--------|
| Emendas individuais Câmara | API oficial Câmara dos Deputados | Gratuito | API funcional, falta ETL |
| Emendas individuais Senado | API oficial Senado Federal | Gratuito | API funcional, falta ETL |
| Empenho/liquidação/pagamento | Portal da Transparência (CGU) | Gratuito | API funcional, falta ETL |
| Cadastro de municípios + IBGE/PIB | IBGE + Receita Federal | Gratuito | Já temos infraestrutura |
| Calamidades públicas | DOU (Querido Diário) | Gratuito | Falta ETL |
| Sanções CGU/TCU | CEIS, CEAF, TCU, CNEP | Gratuito | Já temos onda 1 implementada |

Sprint backend dedicado, ~3-4 semanas pra cobertura completa.

---

## UX pro perfil Milton-CEO

Princípio: **3 perguntas em 3 segundos**. Ao abrir o módulo Emendas, Milton vê:

1. **"Como está SP hoje?"** → Big numbers do topo:
   - Total recebido em SP no ano (R$)
   - Variação vs ano anterior (delta)
   - Nº de emendas com inconsistência detectada
   - Top 3 cidades com maior volume

2. **"O que mudou desde ontem?"** → Feed lateral:
   - 3 emendas novas aprovadas
   - 1 alerta CRÍTICO disparado
   - 2 emendas pagas

3. **"O que preciso decidir agora?"** → Painel de inconsistências:
   - 5 emendas em vermelho aguardando avaliação
   - Botões "Investigar" / "Marcar como justificada" / "Designar Operação"

Linguagem executiva. Zero jargão técnico. Visual com cores semânticas.

---

## UX pro Cabo Eleitoral / Coord Territorial

**Não veem o módulo.** Sem ofuscação — não está na sidebar deles. RBAC restrito.

---

## Documentos relacionados

- `docs/UB_estrutura_partidaria.md` — Hierarquia partidária (RBAC base)
- `docs/perfis_e_paineis.md` — Tabela completa de quem vê o quê
- `docs/api_sgip_descoberta.md` — Fonte das nominatas pro cruzamento
- `docs/mapa_eleitoral_evolucao.md` — 3 Modos do Mapa Estratégico (incluindo modo Compliance que combina Emendas + Nominatas)
- `docs/principio_portabilidade_perfil.md` — Multi-tenant (emendas ficam no tenant; dossiê do parlamentar autor é cross-tenant)
- `docs/anderson_milton_briefing.md` — Caso real Santa Bárbara d'Oeste + dor do Milton
- [[Decisao - Overall Dossie v9]] (Cérebro) — PAC.3 = Taxa execução emendas (parlamentares)
- [[2026-04-24 - Sistema judiciario BR APIs e cruzamento CPF]] (Cérebro) — Onda de coleta de dados públicos
