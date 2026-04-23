============================================================
PROPOSTA TÉCNICA E COMERCIAL
PLATAFORMA DE INTELIGÊNCIA ELEITORAL
UNIÃO BRASIL — SÃO PAULO
============================================================

Fornecedor:
Mazzel Tech

Contato:
cesar.ribeiro@mazzelag.com

Data:
04 de Abril de 2026

Versão:
1.0

============================================================
SUMÁRIO
============================================================

 1. Validação de Dados
 2. Alertas Críticos do Escopo
 3. Arquitetura Técnica
 4. Escopo Contratado
 5. Cronograma
 6. Custos de Infraestrutura e Tecnologia
 7. Investimento — Escopo Contratado
 8. Expansão Estratégica Recomendada
 9. Condições Comerciais
10. Próximos Passos

============================================================
1. VALIDAÇÃO DE DADOS
============================================================

Antes de elaborar esta proposta, realizamos pesquisa técnica
completa nas fontes de dados solicitadas. Todos os dados são
públicos, gratuitos e verificados em 04/04/2026.

Fonte                         Status    Licença
----                          ------    -------
TSE — Candidatos 2016-2024    OK        Creative Commons CC-BY
TSE — Votação por Município   OK        Creative Commons CC-BY
TSE — Código Município x IBGE OK        Creative Commons CC-BY
IBGE — Shapefile Municípios   OK        Domínio Público
IBGE — PIB Municipal          OK        Domínio Público
IBGE — População Estimada     OK        Domínio Público

Volume de dados verificado:

  Eleição 2024 — Votação:      717.285 registros (328 MB)
  Eleição 2024 — Candidatos:   463.794 registros (243 MB)
  Eleições 2016 e 2020:        volume similar por edição
  Municípios SP (filtrado):    645 municípios
  Municípios Brasil (total):   5.570 municípios

Conclusão: projeto 100% viável. Todos os dados necessários
estão disponíveis sem custo e sem restrição de uso.

============================================================
2. ALERTAS CRÍTICOS DO ESCOPO
============================================================

A pesquisa identificou dois pontos que precisam de decisão
formal antes do início do desenvolvimento. Não são bloqueios,
mas impactam o que será exibido na plataforma.

------------------------------------------------------------
ALERTA 1 — O União Brasil não existia em 2016 e 2020
------------------------------------------------------------

O partido União Brasil foi criado em fevereiro de 2022,
pela fusão do DEM (Democratas, número 25) com o PSL
(Partido Social Liberal, número 17).

  2016: candidatos aparecem como DEM e PSL — não como UNIAO
  2020: candidatos aparecem como DEM e PSL — não como UNIAO
  2022+: candidatos aparecem como UNIAO (número 44)

O TSE não retroage os dados. Para comparativo histórico
2016-2020-2024, é necessário criar uma tabela de equivalência:

  UNIAO (2022+) = DEM + PSL (até 2021)

Decisão necessária:
Incluir DEM + PSL como predecessores históricos para 2016
e 2020?

Recomendamos: Sim. É a análise mais completa e honesta.

------------------------------------------------------------
ALERTA 2 — Deputados Estadual e Federal são de outros anos
------------------------------------------------------------

Eleições municipais (Prefeito e Vereador) ocorrem em:
  2016, 2020, 2024

Eleições nacionais (Deputado Estadual e Federal) ocorrem em:
  2018, 2022

Não existem dados de "Deputado Estadual eleito em 2016"
ou "Deputado Federal eleito em 2020".

Proposta de solução:
Separar os módulos por ciclo eleitoral:

  Módulo Municipal:   Prefeito + Vereador   (2016, 2020, 2024)
  Módulo Nacional:    Dep. Estadual +
                      Dep. Federal          (2018, 2022)

Isso não reduz o escopo — enriquece o produto e reflete
a realidade dos dados corretamente.

============================================================
3. ARQUITETURA TÉCNICA
============================================================

Stack definida:

  Frontend:    Next.js 15 + React 19 + Tailwind CSS
               Recharts (gráficos)
               MapLibre GL (mapa interativo open source)
               Vercel (hospedagem + deploy automático)

  Backend:     Python + FastAPI
               Autenticação JWT
               Controle de acesso por perfil
               Railway (hospedagem + deploy automático)

  Banco:       PostgreSQL
               ~2 milhões de registros processados
               Railway PostgreSQL

  Pipeline:    Python ETL
               Download automático dos CSVs do TSE
               Normalização de encoding (Latin-1 para UTF-8)
               Mapeamento código TSE x código IBGE
               Tabela de equivalência DEM + PSL = UNIAO

Por que não Power BI:

  1. Volume: 717 mil linhas em 2024 sozinho — Excel trava.
             Power BI Desktop tem limitações sem modelagem
             prévia robusta.

  2. Mapa:   Power BI tem limitações para 645 polígonos
             municipais com interatividade real.
             MapLibre GL é superior em performance e
             personalização.

  3. Custo:  Power BI Premium com os recursos necessários
             custa mais que toda a infraestrutura própria.

  4. Controle: Com stack própria, o cliente possui o sistema.
               Sem dependência de licença Microsoft.

  5. Futuro: A plataforma pode crescer com IA, alertas em
             tempo real e app mobile — impossível no Power BI.

============================================================
4. ESCOPO CONTRATADO
============================================================

O escopo abaixo corresponde exatamente ao que foi solicitado,
com os ajustes técnicos indicados nos alertas da seção 2.

------------------------------------------------------------
4.1 PIPELINE DE DADOS
------------------------------------------------------------

Entregável técnico — não visível ao usuário final.

- Download e processamento dos CSVs do TSE
  (eleições 2016, 2018, 2020, 2022, 2024)
- Normalização de schema entre os diferentes anos
  (estrutura dos arquivos muda entre eleições)
- Mapeamento de código TSE x código IBGE para todos os
  645 municípios de São Paulo
- Criação da tabela de equivalência DEM + PSL = União Brasil
- Carga no PostgreSQL com índices otimizados
- Integração com shapefile de municípios (IBGE)
- Pipeline reproduzível: atualização futura automática

------------------------------------------------------------
4.2 VISÃO GERAL (DASHBOARD PRINCIPAL)
------------------------------------------------------------

- KPIs: total de votos, total de eleitos, municípios com
  representação, crescimento vs. eleição anterior
- Gráfico de evolução histórica de votos
- Gráfico de evolução de eleitos por cargo
- Ranking top 10 candidatos por votos
- Filtros globais: cargo, equipe, ano de referência

------------------------------------------------------------
4.3 EVOLUÇÃO DE CANDIDATOS
------------------------------------------------------------

- Busca por nome de candidato
- Histórico completo: todos os cargos e eleições
- Evolução de votos eleição a eleição
- Crescimento percentual entre eleições
- Comparação com média do partido no município

------------------------------------------------------------
4.4 MAPA + EQUIPES
------------------------------------------------------------

- Mapa interativo com os 645 municípios de São Paulo
- Coloração por equipe (13 equipes, 13 cores)
- Hover com tooltip: município, votos, eleitos, equipe
- Filtro por equipe para destacar território
- Indicador visual de alertas: OK / Atenção / Alerta / Crítico
- Clique no município abre painel lateral com dados completos

------------------------------------------------------------
4.5 ANÁLISE POR MUNICÍPIO
------------------------------------------------------------

- Ranking de municípios por votos totais do partido
- Ranking por crescimento percentual (última eleição)
- Lista de candidatos eleitos em cada município (histórico)
- Comparativo de desempenho por cargo
- Filtro por equipe responsável

------------------------------------------------------------
4.6 ELEITOS E CARGOS
------------------------------------------------------------

- Painel de mandatários atuais do partido em SP
- Distribuição por cargo: prefeitos, vereadores,
  deputados estaduais, deputados federais
- Filtro por eleição e cargo
- Situação: eleito, suplente, não eleito
- Exportação para Excel/CSV

------------------------------------------------------------
4.7 GESTÃO TERRITORIAL (EQUIPES)
------------------------------------------------------------

- Cadastro das 13 equipes
  (nome, coordenador, 2 auxiliares, cor)
- Atribuição de municípios por equipe
- Painel de performance por equipe:
  votos obtidos vs. meta
- Ranking de equipes: votos, eleitos, crescimento
- Histórico de performance por equipe

------------------------------------------------------------
4.8 SISTEMA DE ALERTAS
------------------------------------------------------------

- Detecção automática de queda de votos entre eleições
- Detecção de perda de mandatos (eleito → não eleito)
- Classificação configurável:
    OK         — desempenho estável ou crescente
    Atenção    — queda leve (thresholds configuráveis)
    Alerta     — queda moderada
    Crítico    — queda severa ou perda de mandato
- Painel de alertas priorizado por gravidade
- Mapa com overlays de alerta por município

------------------------------------------------------------
4.9 METAS E PERFORMANCE
------------------------------------------------------------

- Definição de meta de votos por equipe
- Definição de meta de eleitos por equipe
- Classificação automática:
    Excelente  >= 100% da meta
    Atenção    70% a 99% da meta
    Crítico    < 70% da meta
- Ranking de equipes: votos, eleitos, crescimento

------------------------------------------------------------
4.10 CONTROLE DE ACESSO
------------------------------------------------------------

- Login com autenticação JWT (token seguro)
- Perfis:
    Administrador      — acesso total
    Coordenador        — acesso apenas à sua equipe
    Visualizador       — leitura sem edição
- Gestão de usuários pelo administrador

------------------------------------------------------------
4.11 ENTREGÁVEIS FINAIS
------------------------------------------------------------

- Plataforma web funcional em produção
- Base de dados tratada e documentada
- Mapa interativo operando
- Sistema de alertas ativo
- Controle de acesso configurado
- Documentação técnica básica (README + manual de uso)
- Sessão de treinamento com a equipe (2 horas)

============================================================
5. CRONOGRAMA
============================================================

------------------------------------------------------------
FASE 0 — ALINHAMENTO (3 dias úteis antes do início)
------------------------------------------------------------

Atividade                               Responsável
---------                               -----------
Validar alertas críticos (seção 2)      Ambos
Definir módulos de expansão (seção 8)   Ambos
Receber cadastro das 13 equipes         Cliente
Receber lista de municípios por equipe  Cliente
Receber metas por equipe (se definidas) Cliente

------------------------------------------------------------
FASE 1 — ENTREGA PARCIAL (dias 1 a 7)
------------------------------------------------------------

Dia   Entregável
---   ----------
1-2   Pipeline de dados: download TSE, normalização, carga
      PostgreSQL (eleições municipais SP 2016-2024)
2-3   Mapeamento IBGE, shapefile, tabela DEM+PSL=UNIAO
3-4   Backend API: endpoints KPIs, candidatos, municípios
4-5   Dashboard principal (KPIs + evolução + ranking)
5-6   Mapa interativo com municípios de SP (dados básicos)
6-7   Módulo de equipes (cadastro + atribuição de municípios)
  7   Deploy MVP em produção + sessão de review com cliente

------------------------------------------------------------
FASE 2 — ENTREGA FINAL (dias 8 a 21)
------------------------------------------------------------

Dias    Entregável
----    ----------
 8-10   Sistema de alertas (detecção + classificação + painel)
10-12   Módulo de metas e performance + ranking de equipes
12-14   Módulo Eleitos e Cargos (mandatários + distribuição)
14-16   Análise por candidato (histórico + evolução)
16-18   Análise por município (ranking + comparativo)
18-20   Controle de acesso (login + perfis + restrição)
20-21   Testes, ajustes finais, documentação
   21   Entrega final + treinamento com a equipe

------------------------------------------------------------
FASE 3 — EXPANSÃO ESTRATÉGICA (pós-MVP, sob demanda)
------------------------------------------------------------

Os módulos da seção 8 são desenvolvidos após a entrega
do escopo base, em sprints independentes acordados com
o cliente.

============================================================
6. CUSTOS DE INFRAESTRUTURA E TECNOLOGIA
============================================================

Esta seção detalha todos os custos recorrentes de
operação da plataforma após a entrega. São custos do
cliente, não inclusos no valor do projeto.

------------------------------------------------------------
6.1 INFRAESTRUTURA DE PRODUÇÃO (mensal)
------------------------------------------------------------

Serviço                Descrição                   Custo/mês
-------                ---------                   ---------
Railway — Backend      Servidor FastAPI             R$ 120
                       1 vCPU + 512 MB RAM
                       (escala automática)

Railway — Banco        PostgreSQL gerenciado        R$ 120
                       5 GB armazenamento
                       Backup diário automático

Vercel — Frontend      Next.js + CDN global         R$ 110
                       Deploy automático no Git
                       SSL incluído

CDN — Arquivos         Shapefiles + CSVs            R$ 50
                       processados (estáticos)

Domínio                .com.br ou .com              R$ 12
                       (cobrança anual R$ 140)

                       ─────────────────────
TOTAL INFRAESTRUTURA                                R$ 412/mês

------------------------------------------------------------
6.2 TECNOLOGIA EMBARCADA — LICENÇAS BASE
------------------------------------------------------------

Tecnologia             Uso                          Custo
----------             ---                          -----
Next.js / React        Interface da plataforma      Gratuito
FastAPI / Python       Backend / API                Gratuito
PostgreSQL             Banco de dados               Gratuito
MapLibre GL JS         Mapas interativos            Gratuito
Dados TSE              Resultados eleitorais        Gratuito
Dados IBGE             Shapefiles + API             Gratuito

Todas as tecnologias do escopo base são open source
ou dados públicos. Custo de licença: R$ 0.

------------------------------------------------------------
6.3 INFRAESTRUTURA COM EXPANSÃO (IA EMBARCADA)
------------------------------------------------------------

Se o módulo de IA com Linguagem Natural (E1) for contratado,
há custo adicional de uso da API de inteligência artificial.

Serviço                Descrição                   Custo/mês
-------                ---------                   ---------
Claude API             IA de linguagem natural      R$ 300-700
(Anthropic)            Estimativa: 1.000-5.000      (uso variável)
                       consultas/mês

                       ─────────────────────
TOTAL INFRA COM IA                          R$ 712-1.112/mês

O custo da API de IA é proporcional ao uso. Com controle
de quota por usuário, pode ser mantido no intervalo
estimado acima.

------------------------------------------------------------
6.4 PROJEÇÃO DE CUSTO OPERACIONAL ANUAL
------------------------------------------------------------

Cenário                Mensal          Anual
-------                ------          -----
Escopo base            R$ 412          R$ 4.944
Escopo base + IA       R$ 812          R$ 9.744

Estes valores cobrem toda a operação da plataforma:
servidores, banco de dados, hospedagem, SSL, backup,
CDN e domínio. Sem surpresas.

============================================================
7. INVESTIMENTO — ESCOPO CONTRATADO
============================================================

------------------------------------------------------------
7.1 COMPOSIÇÃO DO VALOR
------------------------------------------------------------

Item                                             Valor
----                                             -----
Pipeline de dados (ETL)                          R$  8.000
  Coleta TSE 5 eleições, normalização,
  banco, shapefile IBGE, tabela histórica

Módulos de dashboard (6 módulos)                 R$ 28.000
  Visão geral, candidatos, mapa+equipes,
  município, eleitos+cargos, gestão equipes

Sistema de alertas                               R$  7.000
  Detecção automática, classificação,
  painel, overlays no mapa

Metas e performance                              R$  4.000
  Setup de metas, ranking, classificação

Controle de acesso                               R$  4.500
  Login JWT, 3 perfis, gestão de usuários

Deploy, testes e documentação                    R$  3.300
  Configuração Railway + Vercel,
  QA, documentação, sessão de treinamento

                       ─────────────────────
TOTAL DO PROJETO                                R$ 54.800

------------------------------------------------------------
7.2 FORMA DE PAGAMENTO
------------------------------------------------------------

Marco                              %       Valor
-----                              --      -----
Assinatura + início do projeto     40%     R$ 21.920
Entrega parcial (dia 7)            30%     R$ 16.440
Entrega final (dia 21)             30%     R$ 16.440
                                   ─────────────────
                                   100%    R$ 54.800

============================================================
8. EXPANSÃO ESTRATÉGICA RECOMENDADA
============================================================

Com os mesmos dados públicos do TSE e do IBGE, é possível
ir muito além do escopo solicitado. A plataforma pode se
tornar um instrumento de inteligência política completo.

Os módulos abaixo são desenvolvidos após a entrega do
escopo base, em sprints independentes. Cada um tem prazo
e valor definidos.

------------------------------------------------------------
8.1 DADOS DE TODOS OS PARTIDOS — RADAR DA CONCORRÊNCIA
------------------------------------------------------------

O que é:
  Com a mesma base do TSE, carregamos todos os 33+ partidos
  e todos os 5.570 municípios do Brasil. Não apenas SP e
  não apenas União Brasil.

O que habilita:
  - Quantos votos PT, PL, MDB têm no mesmo município
    onde o União Brasil atua
  - Mapeamento de hegemonia: onde o partido é dominante,
    onde é fraco, onde há espaço em branco
  - Candidatos adversários com crescimento acelerado
  - Share of votes: qual % dos votos válidos o partido
    tem por município — sobe ou cai a cada eleição?

Prazo adicional:   +5 dias úteis
Valor:             R$ 6.000

------------------------------------------------------------
8.2 IA COM LINGUAGEM NATURAL
------------------------------------------------------------

O que é:
  Campo de busca onde o usuário digita uma pergunta em
  português e o sistema responde com dados e gráficos.

Exemplos de perguntas que funcionam:
  "Quais municípios tiveram queda de vereador em 2024?"
  "Qual equipe teve melhor desempenho relativo à meta?"
  "Candidatos do partido que foram eleitos prefeito
   em mais de uma eleição"
  "Quais municípios o PL ganhou no interior paulista?"
  "Candidatos que cresceram mais de 30% entre 2020 e 2024"

Como funciona:
  IA converte a pergunta em uma consulta ao banco de dados,
  executa, e apresenta o resultado em linguagem natural
  com gráfico gerado automaticamente.

Diferencial:
  A equipe política usa a ferramenta sem treinamento técnico.

Custo de infraestrutura adicional:
  R$ 300-700/mês (Claude API — uso variável)

Prazo adicional:   +7 dias úteis
Valor:             R$ 8.000

------------------------------------------------------------
8.3 SCORE DE POTENCIAL POR MUNICÍPIO
------------------------------------------------------------

O que é:
  Algoritmo que cruza dados eleitorais com dados
  socioeconômicos do IBGE para calcular o potencial
  de crescimento em cada município.

Variáveis cruzadas:
  - PIB per capita municipal (IBGE)
  - População e eleitorado estimado (IBGE)
  - Taxa de crescimento histórica do partido
  - Penetração do partido vs. tamanho do eleitorado

Output:
  Mapa de calor com municípios de alta oportunidade.
  Onde o partido tem espaço objetivo para crescer,
  baseado em dados — não em intuição.

Prazo adicional:   +5 dias úteis
Valor:             R$ 5.000

------------------------------------------------------------
8.4 FINANCIAMENTO DE CAMPANHA
------------------------------------------------------------

O que é:
  O TSE disponibiliza dados de prestação de contas de
  campanha. Receitas e despesas de todos os candidatos.

O que habilita:
  - Custo por voto: quantos R$ foram gastos por voto
  - Quem converteu melhor por R$ investido
  - Comparativo com adversários: o candidato X do PT
    gastou 3x mais e teve resultado similar
  - Planejamento de orçamento para 2026/2028 com
    base em benchmarks históricos reais

Prazo adicional:   +5 dias úteis
Valor:             R$ 5.000

------------------------------------------------------------
8.5 ALERTAS POR E-MAIL E WHATSAPP
------------------------------------------------------------

O que é:
  Sistema automático de notificações para coordenadores
  de equipe, sem precisar abrir a plataforma.

Exemplos de alertas enviados:
  "Atenção: Campinas registrou queda de 22% nos votos
   para vereador entre 2020 e 2024"
  "Sua equipe atingiu 108% da meta de eleitos"
  "3 municípios da sua região estão em status Crítico"

Canais:
  E-mail (automático) + WhatsApp Business API

Prazo adicional:   +3 dias úteis
Valor:             R$ 3.500

------------------------------------------------------------
8.6 PERFIL DEMOGRÁFICO DOS CANDIDATOS
------------------------------------------------------------

O que é:
  Os dados do TSE incluem gênero, cor/raça,
  escolaridade e ocupação de todos os candidatos.

O que habilita:
  - Perfil dos eleitos vs. não eleitos do partido
  - Análise de diversidade por cargo e por equipe
  - Perfis de candidatos com maior taxa de sucesso
  - Comparativo com outros partidos

Prazo adicional:   +3 dias úteis
Valor:             R$ 3.000

------------------------------------------------------------
8.7 SIMULADOR ELEITORAL
------------------------------------------------------------

O que é:
  Ferramenta de projeção baseada em cenários hipotéticos.

Funcionalidades:
  - "Se crescermos X% nos municípios da equipe 3,
    quantos vereadores a mais elegeríamos?"
  - Simulação de novas candidaturas em municípios
  - Projeção de quociente eleitoral
  - Quantos votos são necessários para eleger mais
    um vereador em cada município (dados públicos TSE)

Prazo adicional:   +5 dias úteis
Valor:             R$ 7.000

------------------------------------------------------------
8.8 TRAJETÓRIA POLÍTICA HISTÓRICA
------------------------------------------------------------

O que é:
  Rastreamento completo da carreira de qualquer político
  com dados do TSE desde 1994.

O que habilita:
  - Histórico: todos os cargos disputados desde 1994
  - Mudanças de partido ao longo do tempo
  - Taxa de sucesso: disputas vs. eleições
  - Candidatos "escaláveis": vereadores com crescimento
    consistente que podem disputar Dep. Estadual

Prazo adicional:   +4 dias úteis
Valor:             R$ 4.000

------------------------------------------------------------
8.9 APP MOBILE (PARA CAMPO)
------------------------------------------------------------

O que é:
  Versão mobile da plataforma para coordenadores
  em campo, sem instalação (PWA — abre no navegador
  do celular como se fosse um app).

Funcionalidades:
  - Dashboard resumido com KPIs da equipe
  - Mapa com municípios da equipe
  - Alertas em notificação push
  - Busca rápida de candidato ou município

Prazo adicional:   +10 dias úteis
Valor:             R$ 9.000

------------------------------------------------------------
8.10 RELATÓRIOS PDF AUTOMÁTICOS
------------------------------------------------------------

O que é:
  Geração automática de relatórios em PDF enviados
  por e-mail para coordenadores e diretoria.

Exemplos:
  - Relatório mensal de performance por equipe
  - Análise regional para apresentação interna
  - Export de dados filtrados em Excel com um clique

Prazo adicional:   +3 dias úteis
Valor:             R$ 3.500

------------------------------------------------------------
8.11 RESUMO DA EXPANSÃO ESTRATÉGICA
------------------------------------------------------------

Módulo                                  Prazo       Valor
------                                  -----       -----
E1 — IA com Linguagem Natural           +7 dias     R$  8.000
E2 — Radar da Concorrência             +5 dias     R$  6.000
E3 — Score de Potencial por Município  +5 dias     R$  5.000
E4 — Financiamento de Campanha         +5 dias     R$  5.000
E5 — Alertas E-mail + WhatsApp         +3 dias     R$  3.500
E6 — Perfil Demográfico                +3 dias     R$  3.000
E7 — Simulador Eleitoral               +5 dias     R$  7.000
E8 — Trajetória Política Histórica     +4 dias     R$  4.000
E9 — App Mobile (PWA)                  +10 dias    R$  9.000
E10 — Relatórios PDF Automáticos       +3 dias     R$  3.500

TOTAL DA EXPANSÃO COMPLETA             +50 dias    R$ 54.000

------------------------------------------------------------
8.12 PACOTES DE EXPANSÃO SUGERIDOS
------------------------------------------------------------

Pacote Estratégico (recomendado):
  Escopo base                           R$ 54.800
  E1 — IA com Linguagem Natural         R$  8.000
  E2 — Radar da Concorrência           R$  6.000
  E3 — Score de Potencial              R$  5.000
  E5 — Alertas E-mail + WhatsApp       R$  3.500
  ─────────────────────────────────────────────────
  TOTAL PACOTE ESTRATÉGICO             R$ 77.300
  Prazo total:                         41 dias úteis

Plataforma Completa (todos os módulos):
  Escopo base                           R$ 54.800
  Todos os módulos de expansão          R$ 54.000
  ─────────────────────────────────────────────────
  TOTAL PLATAFORMA COMPLETA            R$108.800
  Prazo total:                         71 dias úteis

============================================================
9. CONDIÇÕES COMERCIAIS
============================================================

------------------------------------------------------------
9.1 MANUTENÇÃO MENSAL (PÓS-ENTREGA)
------------------------------------------------------------

Plano           Inclui                              Valor/mês
-----           ------                              ---------
Básico          Infraestrutura + monitoramento       R$ 1.800
                + suporte técnico

Padrão          Básico + atualização de dados TSE    R$ 3.200
                quando publicados
                + 4 horas de ajustes por mês

Estratégico     Padrão + análises sob demanda        R$ 5.500
                + novos relatórios
                + SLA de resposta em 24 horas

------------------------------------------------------------
9.2 GARANTIAS
------------------------------------------------------------

- Dados: todos os dados são públicos e verificados
  antes do início do desenvolvimento
- Código-fonte: entregue ao cliente ao final do projeto
- Suporte: 30 dias inclusos após a entrega final
- Confidencialidade: contrato de sigilo assinado
  antes do início

------------------------------------------------------------
9.3 O QUE NÃO ESTÁ INCLUÍDO
------------------------------------------------------------

- Licenças de software externo pago (se o cliente optar
  por ferramentas adicionais pagas)
- Conteúdo editorial ou análise política interpretativa
- Coleta de dados primários (pesquisas de campo)
- Integração com sistemas internos do partido
  (se existirem sistemas legados)

============================================================
10. PRÓXIMOS PASSOS
============================================================

Para avançar, precisamos de resposta sobre os pontos:

Decisão 1:
  Para 2016 e 2020, incluímos DEM + PSL como
  predecessores históricos do União Brasil?
  Recomendamos: Sim.

Decisão 2:
  Separamos os módulos por ciclo eleitoral
  (municipal vs. estadual/federal)?
  Recomendamos: Sim.

Decisão 3:
  Quais módulos de expansão (seção 8) entram no escopo?
  Sugestão: Pacote Estratégico (E1 + E2 + E3 + E5).

Com as decisões acima, iniciamos a Fase 0 de alinhamento
em até 48 horas após a aprovação formal.

============================================================
DOCUMENTO CONFIDENCIAL
Mazzel Tech — mazzelag.com
============================================================
