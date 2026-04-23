# PROPOSTA TÉCNICA E COMERCIAL
## Plataforma de Inteligência Eleitoral - União Brasil São Paulo
**Versão:** 1.0  
**Data:** 04 de abril de 2026  
**Preparado por:** Mazzel Tech  
**Confidencial**

---

## SUMÁRIO

1. [Análise de Viabilidade dos Dados](#1-análise-de-viabilidade-dos-dados)
2. [Alertas Críticos do Escopo](#2-alertas-críticos-do-escopo)
3. [Arquitetura Técnica](#3-arquitetura-técnica)
4. [Escopo Entregável](#4-escopo-entregável)
5. [O que Mais Podemos Embarcar](#5-o-que-mais-podemos-embarcar)
6. [Cronograma](#6-cronograma)
7. [Equipe e Responsabilidades](#7-equipe-e-responsabilidades)
8. [Investimento](#8-investimento)
9. [Condições Comerciais](#9-condições-comerciais)
10. [Próximos Passos](#10-próximos-passos)

---

## 1. ANÁLISE DE VIABILIDADE DOS DADOS

### Fontes verificadas (pesquisa realizada em 04/04/2026)

Todos os dados solicitados estão disponíveis publicamente e verificamos as fontes antes de elaborar esta proposta.

| Fonte | URL | Licença | Status |
|---|---|---|---|
| TSE - Dados Eleitorais | dadosabertos.tse.jus.br | Creative Commons CC-BY | ✅ Disponível e gratuito |
| TSE - Candidatos 2016/2020/2024 | cdn.tse.jus.br (CDN direto) | CC-BY | ✅ Confirmado |
| TSE - Votação por Município e Zona | cdn.tse.jus.br (CDN direto) | CC-BY | ✅ Confirmado |
| TSE - Correspondência Municipio TSE x IBGE | cdn.tse.jus.br | CC-BY | ✅ Confirmado |
| IBGE - Shapefile de Municípios 2022 | geoftp.ibge.gov.br | Domínio Público | ✅ Confirmado |
| IBGE - API de Municípios (JSON) | servicodados.ibge.gov.br | Domínio Público | ✅ Confirmado |
| IBGE - PIB Municipal (2010-2023) | servicodados.ibge.gov.br | Domínio Público | ✅ Disponível |
| IBGE - População Estimada (2011-2025) | servicodados.ibge.gov.br | Domínio Público | ✅ Disponível |

**Conclusão:** O projeto é 100% viável. Todos os dados necessários são públicos, gratuitos e já disponíveis.

---

## 2. ALERTAS CRÍTICOS DO ESCOPO

A pesquisa identificou dois pontos que precisam ser formalizados com o cliente **antes** do início do desenvolvimento. São alertas técnicos, não bloqueios - mas impactam decisões de produto.

---

### ⚠️ ALERTA 1 - O União Brasil não existia em 2016 e 2020

**Fato:** O partido União Brasil foi criado em fevereiro de 2022, pela fusão do DEM (Democratas, número 25) com o PSL (Partido Social Liberal, número 17). A primeira eleição disputada com o nome "UNIAO" e número 44 foi em 2022 (eleições gerais).

**Consequência para o escopo:**
- Em 2016 e 2020, não existe o campo `UNIAO` nos dados do TSE
- Para esses anos, o equivalente histórico é `DEM + PSL`
- O TSE não retroage os dados - não há campo de correspondência automática
- Alguns parlamentares do PSL migraram para o PL (Bolsonaro) em vez do UNIAO em 2022

**Decisão necessária com o cliente:**
> *"Para comparativo histórico 2016-2020-2024, queremos considerar DEM + PSL como predecessores do União Brasil?"*

Recomendamos que sim - é a análise mais honesta e completa. Precisaremos criar uma tabela de equivalência histórica e deixar isso claro visualmente na plataforma.

---

### ⚠️ ALERTA 2 - Deputados Estadual e Federal são de eleições diferentes

**Fato:** As eleições para Vereador e Prefeito são municipais (ocorrem em anos pares terminados em 0 ou 4: 2016, 2020, 2024). As eleições para Deputado Estadual e Deputado Federal são nacionais (ocorrem em anos pares alternados: 2018, 2022).

**Consequência para o escopo:**
- Não existe "Deputado Estadual eleito em 2016" ou "Deputado Federal eleito em 2020"
- Para esses cargos, os dados disponíveis são: 2018 e 2022
- A comparação temporal para Deputados é 2018 vs. 2022 (não 2016 vs. 2020)

**Proposta de solução:**  
Separar visualmente os módulos:

| Módulo | Cargos | Eleições |
|---|---|---|
| Eleições Municipais | Prefeito + Vereador | 2016, 2020, 2024 |
| Eleições Estadual/Federal | Dep. Estadual + Dep. Federal | 2018, 2022 |

Isso enriquece o produto e reflete a realidade dos dados sem perda de informação.

---

## 3. ARQUITETURA TÉCNICA

### Stack definida

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                             │
│  Next.js 15 + React 19 + Tailwind CSS                  │
│  Recharts (gráficos) + MapLibre GL (mapa interativo)   │
│  Vercel (deploy automático)                             │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                     BACKEND                             │
│  FastAPI (Python) + SQLAlchemy                         │
│  Autenticação JWT + controle de acesso por perfil      │
│  Railway (deploy automático)                            │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                  BANCO DE DADOS                         │
│  PostgreSQL (dados estruturados)                        │
│  Volume estimado: ~2M registros processados             │
│  Railway PostgreSQL                                     │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                PIPELINE DE DADOS                        │
│  Python ETL: coleta TSE → normalização → carga DB      │
│  Encoding: ISO-8859-1 → UTF-8                          │
│  Mapeamento: codigo TSE ↔ codigo IBGE                   │
│  Tabela de equivalência histórica: DEM+PSL → UNIAO     │
└─────────────────────────────────────────────────────────┘
```

### Por que não Power BI (MVP do escopo original)?

O cliente listou Power BI como opção MVP. Recomendamos fortemente a stack acima pelos seguintes motivos:

1. **Volume de dados:** O arquivo de votação 2024 do TSE tem 717.285 linhas e 328 MB descompactado. Excel trava. Power BI Desktop tem dificuldade sem modelagem prévia.
2. **Mapa interativo real:** Power BI tem limitações sérias para mapas com shapes municipais do IBGE (5.570 polígonos). MapLibre/Leaflet são superiores em performance e personalização.
3. **Custo total:** Power BI Premium com todos os recursos necessários custa mais que hospedar a stack completa em Railway + Vercel.
4. **Propriedade:** Com stack própria, o cliente tem o sistema, sem dependência de licença Microsoft.
5. **Evolutibilidade:** A plataforma pode crescer com IA, alertas em tempo real, app mobile - impossível no Power BI.

---

## 4. ESCOPO ENTREGÁVEL

### 4.1 Pipeline de Dados (Backend técnico - não visível ao usuário)

- [ ] Coleta automática dos CSVs do TSE (eleições 2016, 2018, 2020, 2022, 2024)
- [ ] Normalização de encoding (Latin-1 → UTF-8) e schema entre anos
- [ ] Mapeamento código TSE ↔ código IBGE para todos os 645 municípios de SP
- [ ] Criação da tabela de equivalência histórica DEM + PSL → União Brasil
- [ ] Carga no PostgreSQL com índices otimizados para queries de análise
- [ ] Integração com shapefile IBGE (geometrias dos municípios)
- [ ] Pipeline reproduzível (quando saírem dados de 2026, atualização é automática)

### 4.2 Módulo: Visão Geral (Dashboard Principal)

- KPIs no topo: total de votos, total de eleitos, municípios com representação, crescimento vs. eleição anterior
- Gráfico de evolução histórica de votos (2016 → 2020 → 2024 para municipais)
- Gráfico de evolução de eleitos por cargo
- Ranking rápido de top 10 candidatos por votos
- Filtros globais: cargo, equipe, ano de referência

### 4.3 Módulo: Mapa + Equipes

- Mapa interativo com todos os 645 municípios de São Paulo
- Coloração por equipe (13 cores distintas)
- Hover com tooltip: município, votos, eleitos, equipe responsável
- Filtro por equipe para destacar território
- Indicador visual de alertas no mapa (OK / Atenção / Alerta / Crítico)
- Clique no município abre painel lateral com dados completos

### 4.4 Módulo: Análise por Candidato

- Busca por nome de candidato
- Histórico completo do candidato (todos os cargos disputados em todos os anos)
- Evolução de votos eleição a eleição
- Município(s) onde disputou, resultado em cada eleição
- Indicador de crescimento percentual
- Comparação com média do partido no município

### 4.5 Módulo: Análise por Município

- Ranking de municípios por votos totais do partido
- Ranking por crescimento percentual 2020 → 2024
- Lista de candidatos eleitos em cada município (histórico)
- Comparativo de desempenho por cargo
- Filtro por equipe responsável

### 4.6 Módulo: Eleitos e Cargos

- Painel de todos os mandatários atuais do partido em SP
- Distribuição por cargo: quantos prefeitos, vereadores, dep. estaduais, dep. federais
- Filtro por eleição e cargo
- Situação atual: eleito, suplente, não eleito
- Exportação para Excel/CSV

### 4.7 Módulo: Gestão de Equipes

- Cadastro das 13 equipes (nome, coordenador, 2 auxiliares, cor)
- Atribuição de municípios por equipe (drag and drop ou upload CSV)
- Painel de performance por equipe: votos obtidos vs. meta
- Ranking de equipes: votos, eleitos, crescimento
- Histórico de performance da equipe

### 4.8 Sistema de Alertas

- Detecção automática de queda de votos entre eleições
- Detecção de perda de mandatos (eleito → não eleito)
- Classificação: OK / Atenção / Alerta / Crítico (com thresholds configuráveis)
- Painel de alertas com lista priorizada por gravidade
- Mapa com overlays de alerta por município

### 4.9 Módulo: Metas e Performance

- Definição de meta de votos por equipe
- Definição de meta de eleitos por equipe
- Acompanhamento em tempo real (referenciando a última eleição disponível)
- Classificação automática: Excelente (≥100%), Atenção (70-99%), Crítico (<70%)
- Simulador de metas para eleição futura

### 4.10 Controle de Acesso

- Login com JWT
- Perfis: Administrador / Coordenador de Equipe / Visualizador
- Coordenador vê apenas dados da sua equipe
- Administrador vê tudo

---

## 5. O QUE MAIS PODEMOS EMBARCAR

Esta seção apresenta o que é possível construir com os dados públicos disponíveis - indo muito além do escopo original. São oportunidades de diferenciação que transformam a ferramenta de relatório em **inteligência política real**.

---

### 5.1 Dados de TODOS os Partidos, TODOS os Municípios do Brasil

**O que é:** Com a mesma base do TSE, temos dados de todos os 33+ partidos e todos os 5.570 municípios do país - não apenas SP e não apenas União Brasil.

**O que isso habilita:**
- **Radar da concorrência:** quantos votos o PT, PL, MDB têm no mesmo município onde o União Brasil atua
- **Mapeamento de hegemonia regional:** municípios onde o partido já é dominante vs. onde é fraco vs. onde nenhum grande partido tem força (espaço em branco)
- **Identificação de candidatos adversários com crescimento acelerado** - os que vêm crescendo mais que a média
- **Share of votes:** o partido tem X% dos votos válidos num município - isso sobe ou cai a cada eleição?

**Valor para o cliente:** Sair do olhar interno e ter visão 360 do cenário competitivo.

---

### 5.2 Inteligência de Candidatos Adversários

**O que é:** Mapeamento detalhado dos candidatos de outros partidos com maior risco competitivo.

**O que isso habilita:**
- Ranking de adversários por cargo e município
- Candidatos com maior crescimento de votos nas últimas 2 eleições
- Candidatos eleitos em municípios-alvo do União Brasil
- Alertas: "este adversário cresceu 40% em 2020 → 2024 no município X onde sua equipe atua"

---

### 5.3 Score de Potencial por Município

**O que é:** Algoritmo que cruza dados eleitorais com dados socioeconômicos do IBGE para calcular o potencial de crescimento em cada município.

**Variáveis disponíveis:**
- PIB per capita municipal (IBGE, 2010-2023)
- População estimada (IBGE, 2011-2025)
- Taxa de crescimento eleitoral histórica do partido
- Penetração do partido vs. tamanho do eleitorado

**Output:** Mapa de calor com "municípios de alta oportunidade" - lugares onde o partido tem espaço para crescer baseado em dados objetivos, não intuição.

---

### 5.4 Motor de Busca com Linguagem Natural (IA)

**O que é:** Um campo de busca onde o usuário digita uma pergunta em português e o sistema responde com dados.

**Exemplos de perguntas que funcionam:**
- *"Quais municípios tiveram queda de votos para vereador em 2024?"*
- *"Qual equipe teve melhor desempenho relativo à meta?"*
- *"Mostre candidatos do partido que foram eleitos prefeito em mais de uma eleição"*
- *"Quais municípios do interior paulista o PL ganhou em 2024?"*
- *"Candidatos que cresceram mais de 30% entre 2020 e 2024"*

**Como funciona:** Claude API (Anthropic) converte a pergunta em uma query SQL, executa no banco e apresenta o resultado em linguagem natural + gráfico gerado automaticamente.

**Diferencial:** A equipe política pode usar a ferramenta sem treinamento técnico.

---

### 5.5 Simulador Eleitoral (Cenários Futuros)

**O que é:** Ferramenta para projeção de resultados baseada em cenários hipotéticos.

**Funcionalidades:**
- "Se crescermos X% nos municípios da equipe 3, quantos vereadores a mais elegeríamos?"
- Simulação de impacto de candidaturas novas em municípios específicos
- Projeção de quociente eleitoral com base em estimativa de votos
- Análise de quociente eleitoral: quantos votos são necessários para eleger mais um vereador em cada município

**Base técnica:** O quociente eleitoral é calculável com dados públicos do TSE (total de votos válidos / vagas disponíveis por município).

---

### 5.6 Análise de Coligações e Federações

**O que é:** O TSE disponibiliza dados de coligações e federações eleitorais.

**O que isso habilita:**
- Mapeamento de quais partidos o União Brasil coligou em cada município
- Performance das coligações vs. candidaturas solo
- Análise de quais partidos aliados trouxeram mais votos
- Identificação de melhores parceiros para 2028

---

### 5.7 Perfil Demográfico dos Candidatos

**O que é:** Os dados do TSE incluem informações dos candidatos além de votos.

**Campos disponíveis:**
- Gênero (Masculino/Feminino)
- Cor/raça (autodeclarada)
- Grau de instrução (do analfabeto ao pós-graduado)
- Ocupação (médico, agricultor, empresário, servidor público, etc.)
- Faixa etária

**O que isso habilita:**
- Perfil demográfico dos eleitos vs. não eleitos do partido
- Análise de diversidade por cargo e por equipe
- Identificação de perfis de candidatos com maior taxa de sucesso no partido
- Comparativo com outros partidos: "nosso partido tem X% de candidatas mulheres vs. Y% da média estadual"

---

### 5.8 Rastreamento de Trajetórias Políticas

**O que é:** Como temos CPFs (ou sequenciais únicos do TSE) dos candidatos, podemos rastrear toda a trajetória de um político ao longo de eleições.

**O que isso habilita:**
- Histórico completo de um candidato: todos os cargos disputados desde 1994
- Mudanças de partido ao longo do tempo (quando migrou de DEM para PSL, ou de PSL para PL)
- Taxa de sucesso: quantas vezes disputou vs. quantas foi eleito
- Identificação de candidatos "escaláveis": vereadores com crescimento consistente que podem disputar Dep. Estadual

---

### 5.9 Alertas Inteligentes por E-mail / WhatsApp

**O que é:** Sistema automatizado de notificações para os coordenadores de equipe.

**Exemplos de alertas:**
- "📉 Atenção: O município de Campinas registrou queda de 22% nos votos para vereador entre 2020 e 2024"
- "🏆 Sua equipe atingiu 108% da meta de eleitos - parabéns!"
- "⚠️ 3 municípios da sua região estão em status Crítico"

**Canais:** E-mail (Resend/SendGrid) + WhatsApp Business API

---

### 5.10 Export e Relatórios Automatizados

**O que é:** Geração automática de relatórios em PDF e Excel.

**Exemplos:**
- Relatório mensal de performance por equipe (gerado automaticamente e enviado por e-mail)
- Relatório de análise regional para apresentação interna
- Export de todos os dados filtrados em Excel com um clique
- Apresentação automática em PowerPoint (via biblioteca python-pptx)

---

### 5.11 Dados de Financiamento de Campanha (FUNDO ELEITORAL)

**O que é:** O TSE disponibiliza dados de prestação de contas de campanha.

**Campos disponíveis:**
- Receitas por candidato (Fundo Eleitoral, doações de partidos, doações de pessoas físicas)
- Despesas por candidato (campanha, material gráfico, impulsionamento digital, etc.)
- Relação custo por voto: quantos reais foram gastos por voto obtido

**O que isso habilita:**
- Análise de eficiência de campanha: quem converteu melhor por R$ gasto
- Comparativo com adversários: "o candidato X do PT gastou 3x mais e teve resultado similar ao nosso"
- Planejamento de orçamento para 2026/2028 baseado em benchmarks históricos

---

### 5.12 App Mobile (visualização)

**O que é:** Versão mobile da plataforma para coordenadores de campo.

**Funcionalidades essenciais:**
- Dashboard resumido com KPIs da equipe
- Mapa com municípios da equipe
- Alertas em push notification
- Busca rápida de candidato ou município

**Tecnologia:** Next.js PWA (sem app store) ou React Native.

---

## 6. CRONOGRAMA

### Fase 0: Alinhamento (3 dias úteis)

| Atividade | Responsável |
|---|---|
| Validar alertas críticos com o cliente (DEM+PSL, Dep. Estadual/Federal) | Ambos |
| Definir quais extras da seção 5 entram no escopo | Ambos |
| Acesso ao cadastro das 13 equipes e municípios atribuídos | Cliente |
| Definição de metas iniciais por equipe (se existirem) | Cliente |

---

### Fase 1: MVP (7 dias corridos - entrega parcial)

**Semana 1 (dias 1 a 7)**

| Dia | Entregáveis |
|---|---|
| 1-2 | Pipeline de dados: download TSE, normalização, carga PostgreSQL (SP 2016-2024) |
| 2-3 | Mapeamento IBGE, shapefile, tabela equivalência histórica DEM+PSL |
| 3-4 | Backend API: endpoints de KPIs, candidatos, municípios |
| 4-5 | Dashboard principal (KPIs + evolução histórica + ranking) |
| 5-6 | Mapa interativo com municípios de SP e dados básicos |
| 6-7 | Módulo de equipes (cadastro + atribuição de municípios) |
| 7 | **Deploy MVP em produção + sessão de review com cliente** |

**Entrega Parcial (dia 7):** Dashboard funcional com dados reais, mapa básico, módulo de equipes.

---

### Fase 2: Produto Completo (dias 8 a 21)

| Dias | Entregáveis |
|---|---|
| 8-10 | Sistema de alertas (detecção de quedas + classificação + painel) |
| 10-12 | Módulo de metas e performance (setup + ranking de equipes) |
| 12-14 | Módulo Eleitos & Cargos (mandatários + distribuição) |
| 14-16 | Análise por candidato (busca + histórico + evolução) |
| 16-18 | Análise por município (ranking + comparativo) |
| 18-20 | Controle de acesso (login + perfis + restrição por equipe) |
| 20-21 | Testes, ajustes finais, documentação básica |
| **21** | **Entrega final + treinamento** |

---

### Fase 3: Extras (pós-MVP, acordar com cliente)

| Sprint | Entregável | Prazo adicional |
|---|---|---|
| Sprint A | IA com linguagem natural | +7 dias |
| Sprint B | Dados de todos os partidos (radar da concorrência) | +5 dias |
| Sprint C | Score de potencial por município | +5 dias |
| Sprint D | Financiamento de campanha | +5 dias |
| Sprint E | App mobile PWA | +10 dias |
| Sprint F | Alertas por e-mail/WhatsApp | +3 dias |

---

## 7. EQUIPE E RESPONSABILIDADES

| Papel | Responsabilidade |
|---|---|
| Engenheiro de Dados | Pipeline TSE, normalização, modelagem do banco |
| Desenvolvedor Backend | API FastAPI, autenticação, endpoints de análise |
| Desenvolvedor Frontend | Dashboards, mapa interativo, UI/UX |
| Coordenador de Projeto | Gestão de prazo, comunicação com cliente, QA |

**Do cliente:**
- Cadastro das 13 equipes (nome, coordenador, auxiliares)
- Lista de municípios por equipe
- Metas de votos e eleitos por equipe (se definidas)
- Pessoa de contato para validações rápidas (máximo 1 reunião/semana)

---

## 8. INVESTIMENTO

### 8.1 Resumo Executivo de Valores

| Módulo | Descrição | Valor |
|---|---|---|
| **Setup + Pipeline de Dados** | Coleta TSE, normalização 5 eleições, banco PostgreSQL, shapefile IBGE, tabela histórica DEM+PSL | R$ 8.000 |
| **Produto Base (escopo solicitado)** | 6 módulos + mapa + alertas + metas + controle de acesso | R$ 42.000 |
| **Infraestrutura (12 meses)** | Railway + Vercel + domínio + backups automáticos | R$ 4.800 |
| **TOTAL MVP COMPLETO** | Tudo acima - entrega em 21 dias | **R$ 54.800** |

---

### 8.2 Extras (opcional - sob demanda)

| Extra | Descrição | Valor |
|---|---|---|
| IA com Linguagem Natural | Motor de busca em português com Claude API | R$ 8.000 |
| Radar da Concorrência | Dados de todos os partidos + share of votes + hegemonia | R$ 6.000 |
| Score de Potencial por Município | Algoritmo IBGE + TSE + recomendações | R$ 5.000 |
| Financiamento de Campanha | Custo por voto, receitas/despesas, benchmark | R$ 5.000 |
| Alertas E-mail + WhatsApp | Notificações automáticas para coordenadores | R$ 3.500 |
| App Mobile (PWA) | Versão mobile para campo | R$ 9.000 |
| Perfil Demográfico Completo | Gênero, raça, instrução, ocupação, análise de diversidade | R$ 3.000 |
| Simulador Eleitoral | Projeção de cenários + quociente eleitoral | R$ 7.000 |
| Trajetória Política Histórica | Rastreamento completo de carreira por candidato | R$ 4.000 |

**Pacote recomendado (produto completo de alto impacto):**

| Item | Valor |
|---|---|
| MVP Completo (21 dias) | R$ 54.800 |
| IA com Linguagem Natural | R$ 8.000 |
| Radar da Concorrência | R$ 6.000 |
| Score de Potencial por Município | R$ 5.000 |
| Alertas E-mail + WhatsApp | R$ 3.500 |
| **TOTAL PACOTE ESTRATÉGICO** | **R$ 77.300** |

---

### 8.3 Manutenção Mensal (pós-entrega)

| Plano | Inclui | Valor/mês |
|---|---|---|
| **Básico** | Infraestrutura + monitoramento + suporte técnico | R$ 1.800/mês |
| **Padrão** | Básico + atualizações de dados TSE quando publicados + 4h de ajustes/mês | R$ 3.200/mês |
| **Estratégico** | Padrão + análises sob demanda + novos relatórios + SLA 24h | R$ 5.500/mês |

---

## 9. CONDIÇÕES COMERCIAIS

### Forma de pagamento sugerida

| Marco | % | Valor (MVP Completo) |
|---|---|---|
| Assinatura do contrato + início | 40% | R$ 21.920 |
| Entrega Parcial (dia 7 - MVP funcional) | 30% | R$ 16.440 |
| Entrega Final (dia 21 - produto completo) | 30% | R$ 16.440 |

### Garantias

- **Dados:** Todos os dados são públicos e verificados antes do desenvolvimento
- **Código-fonte:** Entregue ao cliente ao final do projeto
- **Suporte:** 30 dias de suporte pós-entrega inclusos no valor base
- **Sigilo:** Contrato de confidencialidade assinado antes do início

### O que NÃO está incluído

- Licenças de software externo (se o cliente optar por ferramentas pagas como Mapbox Premium)
- Conteúdo editorial ou análise política interpretativa
- Coleta de dados primários (pesquisas de campo, enquetes)
- Integração com sistemas internos do partido (se existirem)

---

## 10. PRÓXIMOS PASSOS

Para avançar, precisamos de resposta sobre os dois alertas críticos identificados:

**Decisão 1:** Para 2016 e 2020, incluímos DEM + PSL como predecessores históricos do União Brasil?
> Recomendamos: **Sim** - é a análise mais completa e honesta

**Decisão 2:** Mapa temporal dos cargos - separamos municupais (2016/2020/2024) de estadual/federal (2018/2022)?
> Recomendamos: **Sim** - reflete a realidade dos dados e enriquece o produto

**Decisão 3:** Quais extras da seção 5 entram no escopo?
> Recomendamos o Pacote Estratégico (MVP + IA + Concorrência + Score + Alertas)

Com as decisões acima, conseguimos iniciar a **Fase 0 de alinhamento** em até 48h após a aprovação.

---

## APÊNDICE - VOLUME E QUALIDADE DOS DADOS VERIFICADOS

| Arquivo TSE | Registros | Tamanho |
|---|---|---|
| votacao_candidato_munzona_2024_BRASIL.csv | 717.285 linhas | 328 MB descompactado |
| consulta_cand_2024_BRASIL.csv | 463.794 linhas | 243 MB descompactado |
| Eleições 2016 e 2020 | Volume similar | ~200 MB cada |
| Municípios SP (filtrado) | ~645 municípios | Subconjunto do Brasil |
| Shapefile IBGE Municípios 2022 | 5.570 polígonos | Incluído sem custo |

**Encoding:** ISO-8859-1 (Latin-1) - normalizado para UTF-8 no pipeline  
**Separador:** ponto e vírgula (`;`)  
**Atualização TSE:** Diária (dados de 2024 já consolidados e finais)

---

*Proposta preparada por Mazzel Tech - mazzelag.com*  
*Contato: cesar.ribeiro@mazzelag.com*  
*Confidencial - não distribuir sem autorização*
