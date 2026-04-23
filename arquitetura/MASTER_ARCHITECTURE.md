============================================================
PLATAFORMA DE INTELIGÊNCIA ELEITORAL
UNIÃO BRASIL — DOCUMENTO MESTRE DE ARQUITETURA
============================================================

Versão:    1.0
Data:      04 de Abril de 2026
Autor:     Mazzel Tech
Status:    Aprovado para execução

============================================================
VISÃO DO PRODUTO
============================================================

O partido político funciona como uma grande empresa.
Os ativos são os políticos eleitos.
A unidade de medida principal é o VOTO.
O presidente do partido é o CEO — precisa de visibilidade
total sobre tudo.

Hoje a operação é arcaica: planilhas, papéis, sem
inteligência de dados, sem mapa, sem histórico unificado.

O que estamos construindo é o sistema operacional do
partido. Uma plataforma que qualquer pessoa, incluindo
um senhor de 65 anos com pouca experiência em tecnologia,
consegue usar para tomar decisões baseadas em dados.

Referência de UX de mapa: Globo.com nas eleições.
Referência de produto: plataforma tão robusta quanto
qualquer ferramenta de BI corporativo, mas com a
simplicidade de um aplicativo de celular.

============================================================
HIERARQUIA DE CARGOS E PERFIS DO SISTEMA
============================================================

CARGOS POLÍTICOS MONITORADOS
-----------------------------
  Presidente da República
  Governador
  Senador
  Deputado Federal
  Deputado Estadual
  Prefeito
  Vereador

PERFIS DE ACESSO À PLATAFORMA
------------------------------

  PRESIDENTE DO PARTIDO
  - Visão: tudo, Brasil inteiro, todos os cargos
  - Acesso: irrestrito
  - Equivalente a: CEO

  DIRETORIA NACIONAL / ESTADUAL
  - Visão: estado ou região determinada
  - Acesso: módulos estratégicos + relatórios

  DELEGADO REGIONAL
  - Visão: zonas eleitorais sob sua responsabilidade
  - Acesso: mapa da sua zona, cadastro de filiados,
    desempenho dos políticos da sua área
  - É a força de campo do partido (equivalente a
    gerente comercial, com voto como unidade de medida)

  POLÍTICO / CANDIDATO
  - Visão: apenas os próprios dados
  - Acesso: portal individual com dossiê pessoal,
    histórico de votos, granularidade de origem dos votos

  FUNCIONÁRIO ADMINISTRATIVO
  - Visão: módulos operacionais atribuídos
  - Acesso: cadastro, relatórios básicos

============================================================
MÓDULOS DO SISTEMA
============================================================

------------------------------------------------------------
MÓDULO 01 — FUNDAÇÃO (Auth + RBAC + Auditoria)
------------------------------------------------------------

Auth:
  - Login com e-mail + senha
  - 2FA obrigatório para Presidente e Diretoria
  - JWT + refresh token (httpOnly cookie)
  - Controle de sessão (logout por inatividade)
  - Recuperação de senha por e-mail

RBAC (Controle de Acesso por Papel):
  - 5 perfis descritos acima
  - Cada rota e cada ação tem permissão declarada
  - Nenhum dado de outro perfil vaza entre sessões

Auditoria (obrigatório — padrão Mazzel):
  - Registro de TODA ação do sistema:
    quem fez, o que fez, quando, de qual IP
  - Imutável: logs não podem ser apagados por usuário
  - Painel de auditoria para Presidente + Diretoria
  - Alerta automático em ações suspeitas

------------------------------------------------------------
MÓDULO 02 — MAPA ELEITORAL INTERATIVO
------------------------------------------------------------

Inspiração: apuração em tempo real da Globo.com

Níveis de granularidade (drill-down completo):
  Brasil → Estado → Município → Zona Eleitoral → Seção

Cada nível mostra:
  - Quantidade de votos do União Brasil
  - Políticos eleitos naquela área
  - Farol de força (verde / amarelo / vermelho)
  - Evolução histórica (1994 até hoje)
  - Delegado responsável

Farol de Força (algoritmo por município):
  VERDE    — partido tem representação eleita e votos
             crescentes nas últimas 2 eleições
  AMARELO  — representação mas votos em queda, ou
             nenhum eleito mas votação expressiva
  VERMELHO — nenhum eleito, votação baixa ou em queda

Interações:
  - Hover no município: tooltip rápido com KPIs
  - Clique no município: painel lateral com dados
  - Clique no ícone do político: abre Dossiê (Módulo 03)
  - Zoom: entra no nível seguinte automaticamente
  - Botão "Voltar" em cada nível (história de navegação)

Filtro de Pesquisa integrado ao mapa:
  O usuário pode digitar qualquer coisa no campo de busca:
  - Nome de cidade → centraliza e destaca no mapa
  - Nome de estado → centraliza no estado
  - Nome de município → abre painel do município
  - Nome de político → destaca onde ele atua e abre dossiê
  O filtro é inteligente: corrige erros de digitação e
  sugere resultados enquanto o usuário digita (autocomplete)

Dados carregados no mapa:
  - Todos os 5.570 municípios do Brasil
  - Shapefiles IBGE (polígonos de municípios)
  - Dados TSE desde 1994 (todos os cargos)
  - Zonas e seções eleitorais por município
  - Delegado responsável por cada zona

------------------------------------------------------------
MÓDULO 03 — DOSSIÊ DO POLÍTICO
------------------------------------------------------------

Acionado por: clique no ícone do político no mapa,
ou busca direta pelo nome.

Formato: modal no tamanho de uma lauda (A4 proporcional)
Disponível para: qualquer usuário com acesso ao mapa

Conteúdo do dossiê:
  FOTO E IDENTIFICAÇÃO
    - Foto oficial
    - Nome completo e nome de urna
    - Partido atual e partidos anteriores
    - Cargo atual (se eleito)
    - Estado e município de atuação

  CARREIRA POLÍTICA COMPLETA
    - Todas as candidaturas desde 1994
    - Cargo disputado, ano, resultado (eleito/não eleito)
    - Quantidade de votos em cada eleição
    - Mudanças de partido (linha do tempo)

  ÚLTIMAS 3 ELEIÇÕES (destaque visual)
    - Gráfico de evolução de votos
    - Crescimento ou queda percentual
    - Posição no ranking do partido no período

  DADOS DE ZONA E SEÇÃO
    - De onde vieram os votos (por zona/seção/município)
    - Mapa menor dentro do dossiê mostrando a origem

  AÇÕES
    - Botão: Baixar PDF (dossiê completo formatado)
    - Botão: Compartilhar link (com permissão)

Fontes de dados:
  TSE (obrigatório) + APIs públicas complementares:
  - Câmara dos Deputados API (deputados federais)
  - Senado Federal API (senadores)
  - Alesp / Assembleias Estaduais (quando disponível)

------------------------------------------------------------
MÓDULO 04 — PORTAL DO POLÍTICO (ÁREA INDIVIDUAL)
------------------------------------------------------------

Cada político tem login e senha próprios.
Ao entrar, vê apenas os próprios dados.

Conteúdo:
  PAINEL PESSOAL
    - KPIs da última campanha
    - Total de votos, posição no ranking do partido
    - Evolução das últimas 3 eleições (gráfico)

  GRANULARIDADE DE VOTOS
    - Mapa pessoal: de onde vieram meus votos
    - Drill-down: estado → município → zona → seção
    - Qual seção (escola) me deu mais votos
    - Qual seção me deu menos votos (oportunidade)

  MEU DOSSIÊ
    - Visualização do próprio dossiê (igual ao público)
    - Download em PDF

  TERRITÓRIO DO DELEGADO
    - Qual delegado é responsável pela sua área
    - Dados de contato do delegado

------------------------------------------------------------
MÓDULO 05 — GESTÃO DE DELEGADOS E TERRITÓRIOS
------------------------------------------------------------

O delegado é o gerente de campo do partido.
Unidade de medida: voto.
Funciona como área comercial da empresa.

Estrutura:
  - Cada delegado é responsável por zonas eleitorais
  - Um município = uma zona eleitoral (regra geral)
  - Delegados podem cobrir múltiplas zonas

Cadastro do delegado:
  - Nome, contato, região de atuação
  - Zonas eleitorais sob responsabilidade
  - Histórico de performance

Painel de desempenho do delegado:
  - Total de votos nas zonas sob responsabilidade
  - Evolução por eleição
  - Quantidade de filiados cadastrados na sua zona
  - Ranking de delegados (por votos, por crescimento)
  - Farol individual: verde/amarelo/vermelho

Para a presidência/diretoria:
  - Visão consolidada de todos os delegados
  - Mapa com desempenho por delegado
  - Alertas: delegados em zona vermelha

------------------------------------------------------------
MÓDULO 06 — CADASTRO DE FILIADOS
------------------------------------------------------------

Substitui o processo arcaico de papel + digitação manual.

Quem cadastra: o delegado responsável pela região

Formulário de cadastro (campos):
  Nome completo
  Data de nascimento
  CPF (com validação)
  Título de Eleitor (com validação)
  Zona e Seção eleitoral
  Endereço completo (com busca automática por CEP)
  Telefone e WhatsApp
  E-mail (opcional)
  Foto (opcional, por câmera ou upload)
  Município e estado

VALIDAÇÕES OBRIGATÓRIAS:
  CPF:
    - Validação matemática dos dígitos verificadores
      (evita CPFs inválidos antes de consultar externo)
    - Consulta via SERPRO DataValid (API paga, confiável)
      ou validação via Receita Federal (quando disponível)

  TÍTULO DE ELEITOR:
    - Validação matemática do dígito verificador do título
    - Consulta TSE: nome do eleitor, zona, seção, situação

  TRAVA CONTRA INVERSÃO CPF x TÍTULO:
    - Se o número digitado no campo CPF tem 11 dígitos e
      passa na validação de título, o sistema alerta:
      "Este número parece ser um Título de Eleitor. Verifique."
    - Se o número no campo Título tem formato de CPF, idem.
    - Validação cruzada: CPF e Título devem corresponder
      ao mesmo nome no banco do TSE/Receita

  DUPLICIDADE:
    - Sistema alerta se CPF já está cadastrado
    - Sistema alerta se Título já está cadastrado

Fluxo após cadastro:
  - Dados ficam na plataforma (banco próprio)
  - Exportação para formato de importação do TSE
    (para o filiado ser registrado oficialmente)
  - Delegado acompanha status de cada filiado

------------------------------------------------------------
MÓDULO 07 — CADASTRO DE FUNCIONÁRIOS
------------------------------------------------------------

Gestão da equipe interna do partido por região.

  - Cadastro completo do funcionário
  - Cargo / função no partido
  - Região / estado de atuação
  - Acesso ao sistema (qual perfil)
  - Histórico de atividade

------------------------------------------------------------
MÓDULO 08 — IA E LINGUAGEM NATURAL
------------------------------------------------------------

Dois componentes:

BUSCA INTELIGENTE (campo de pesquisa universal)
  - Disponível em toda a plataforma (topo da tela)
  - O usuário digita em português o que quer encontrar
  - Sistema identifica intenção e direciona:
    - É um nome de cidade → filtra no mapa
    - É um nome de político → abre dossiê
    - É uma pergunta → responde com dados

AGENTE DE ANÁLISE (chat com dados)
  - Interface de chat disponível para Presidente/Diretoria
  - Perguntas que funcionam:
    "Qual delegado teve melhor crescimento em 2024?"
    "Quais municípios paulistas temos risco vermelho?"
    "Candidatos do partido que cresceram mais de 30%
     entre 2020 e 2024"
    "Onde o PL ganhou força onde o União Brasil perdeu?"
    "Qual foi o custo por voto na campanha de [nome]?"
  - O agente conhece toda a estrutura do banco de dados
  - Respostas em linguagem natural + gráfico automático

AGENTES DO SISTEMA (internos, não visíveis ao usuário)
  - Agente de Farol: recalcula verde/amarelo/vermelho
    quando novos dados entram
  - Agente de Alertas: detecta quedas e envia notificações
  - Agente de Dossiê: monta PDF automaticamente do político
  - Agente de Relatório: gera relatórios periódicos
  - Agente de Validação: valida CPF/Título em cadastro

------------------------------------------------------------
MÓDULO 09 — SISTEMA DE ALERTAS
------------------------------------------------------------

Detecção automática e notificação:

  Queda de votos entre eleições (por município)
  Perda de mandato (eleito → não eleito)
  Delegado abaixo da meta
  Município migrou de verde para vermelho
  Filiado com cadastro inválido ou duplicado

Canais de notificação:
  - Painel de alertas dentro da plataforma
  - E-mail automático (por perfil)
  - WhatsApp Business API (para delegados em campo)

Classificação:
  OK / Atenção / Alerta / Crítico

------------------------------------------------------------
MÓDULO 10 — RELATÓRIOS E EXPORTAÇÕES
------------------------------------------------------------

  Dossiê do político em PDF (gerado sob demanda)
  Relatório de performance por delegado
  Relatório de filiados por região
  Exportação de dados em Excel/CSV
  Relatório para diretoria (gerado automaticamente,
  enviado por e-mail com periodicidade configurável)

------------------------------------------------------------
MÓDULO 11 — AUDITORIA COMPLETA (padrão Mazzel)
------------------------------------------------------------

  Log de toda ação do sistema:
    - Quem fez
    - O que fez (ação específica)
    - Em qual registro
    - Quando (timestamp preciso)
    - De qual IP e dispositivo

  Painel de auditoria:
    - Filtro por usuário, data, tipo de ação
    - Exportação do log completo
    - Alertas de ações incomuns

  Regras:
    - Logs são imutáveis
    - Nem o admin pode apagar logs
    - Retenção mínima de 5 anos

============================================================
STACK TÉCNICA DEFINITIVA
============================================================

BACKEND
  Linguagem:     Python 3.12
  Framework:     FastAPI
  ORM:           SQLAlchemy 2.0 async
  Validação:     Pydantic v2
  Migrations:    Alembic
  Cache:         Redis
  Tarefas async: Celery + Redis (para ETL e alertas)
  PDF:           WeasyPrint (dossiês e relatórios)
  Auth:          JWT + httpOnly cookies + 2FA (TOTP)
  Deploy:        Railway

FRONTEND
  Framework:     Next.js 15 + React 19
  Estilo:        Tailwind CSS
  Mapa:          MapLibre GL JS (open source — sem custo)
  Gráficos:      Recharts
  UI Components: Radix UI (acessível)
  Deploy:        Vercel

BANCO DE DADOS
  Principal:     PostgreSQL 16
                 com extensão PostGIS (geometrias do mapa)
  Cache:         Redis 7
  Deploy:        Railway PostgreSQL

PIPELINE DE DADOS (ETL)
  Linguagem:     Python
  Libs:          Pandas, GeoPandas, Shapely
  Fonte:         TSE (CSV público) + IBGE (shapefile + API)
  Dados extras:  Câmara Federal API, Senado Federal API
  Periodicidade: Manual (por eleição) + automático quando
                 TSE publica novos dados

INTELIGÊNCIA ARTIFICIAL
  Provedor:      Claude API (Anthropic)
  Modelo:        claude-opus-4-6 (análise) /
                 claude-haiku-4-5 (busca rápida)
  Uso:           Agente de análise + busca natural +
                 geração de relatórios + alertas inteligentes

VALIDAÇÕES EXTERNAS
  CPF:           Validação matemática local (dígitos)
                 + SERPRO DataValid (API paga, opcional)
  Título:        Validação matemática local +
                 Consulta TSE (quando disponível)
  CEP:           ViaCEP (gratuito)

SEGURANÇA
  Autenticação:  JWT + refresh token (httpOnly, SameSite)
  2FA:           TOTP (Google Authenticator compatível)
  HTTPS:         Obrigatório (Let's Encrypt via Railway/Vercel)
  Rate limiting: Por IP e por usuário
  CSRF:          Proteção em todos os endpoints POST/PUT/DELETE
  Auditoria:     Módulo 11 (imutável)
  Secrets:       Variáveis de ambiente (nunca no código)

============================================================
MODELAGEM DE DADOS
============================================================

DADOS ELEITORAIS (somente leitura — vindos do TSE)

  candidatos
    id, nome_completo, nome_urna, cpf_hash, foto_url,
    genero, cor_raca, grau_instrucao, ocupacao,
    data_nascimento, naturalidade

  candidaturas
    id, candidato_id, ano, cargo, partido_id,
    municipio_id, estado_uf, votos, situacao_turno,
    situacao_final (eleito/nao_eleito/suplente),
    despesa_campanha, receita_campanha

  votos_por_zona
    candidatura_id, municipio_id, zona, secao,
    qt_votos

  municipios
    id, codigo_tse, codigo_ibge, nome, estado_uf,
    geometry (PostGIS), populacao, pib_per_capita

  partidos
    id, numero, sigla, nome,
    predecessores (DEM+PSL → UNIAO, etc.)

  zonas_eleitorais
    id, numero, municipio_id, descricao

  secoes_eleitorais
    id, numero, zona_id, local_votacao (escola/local)

DADOS OPERACIONAIS (escrita — geridos pela plataforma)

  usuarios
    id, nome, email, senha_hash, perfil, ativo,
    2fa_secret, ultimo_acesso, criado_em

  politicos_plataforma
    id, candidato_id (FK para candidatos TSE),
    usuario_id (FK para usuarios),
    delegado_responsavel_id, notas_internas

  delegados
    id, usuario_id, nome, email, telefone,
    whatsapp, estado_uf, ativo

  delegado_zonas
    delegado_id, zona_id, municipio_id

  filiados
    id, nome_completo, cpf_hash, titulo_eleitor,
    data_nascimento, zona_id, secao_id,
    endereco, telefone, whatsapp, email,
    municipio_id, estado_uf, status_validacao,
    cadastrado_por (delegado_id), criado_em

  farol_municipio
    municipio_id, ano_referencia, status (verde/amarelo/vermelho),
    votos_atual, votos_anterior, variacao_pct,
    eleitos_atual, eleitos_anterior, calculado_em

  alertas
    id, tipo, gravidade, municipio_id, delegado_id,
    politico_id, descricao, lido, criado_em

  auditoria_log
    id, usuario_id, acao, tabela, registro_id,
    dados_antes (JSON), dados_depois (JSON),
    ip, user_agent, criado_em

  relatorios_gerados
    id, tipo, gerado_por, parametros (JSON),
    arquivo_url, criado_em

============================================================
INFRAESTRUTURA E CUSTOS OPERACIONAIS
============================================================

PRODUÇÃO (mensal)
  Railway — Backend FastAPI + Celery    R$ 120
  Railway — PostgreSQL + PostGIS        R$ 180
  Railway — Redis                       R$  60
  Vercel  — Frontend Next.js            R$ 110
  CDN     — Arquivos estáticos          R$  50
  Domínio                               R$  12
  ─────────────────────────────────────────
  TOTAL SEM IA                          R$ 532/mês

  Claude API (se IA contratada)         R$ 300-700/mês
  SERPRO DataValid (se contratado)      R$ 200-500/mês

  ─────────────────────────────────────────
  TOTAL COM IA + VALIDAÇÃO CPF          R$ 1.032-1.732/mês

============================================================
ORDEM DE EXECUÇÃO — SPRINTS
============================================================

A ordem respeita dependências técnicas:
sem fundação, nada funciona.
Cada sprint resulta em algo testável e entregável.

------------------------------------------------------------
SPRINT 0 — FUNDAÇÃO (dias 1-5)
------------------------------------------------------------

Saída: projeto no ar, banco configurado, login funcionando

  - Repositório Git + estrutura de pastas
  - Configuração Railway (backend + banco + redis)
  - Configuração Vercel (frontend)
  - Banco de dados: criação das migrations iniciais
  - Módulo de Auth (login, JWT, refresh, logout)
  - RBAC: 5 perfis declarados e aplicados
  - Módulo de Auditoria (log imutável)
  - Seed de dados de teste (usuários dos 5 perfis)
  - CI/CD: deploy automático no push

Resultado: sistema no ar com login funcionando e auditoria
registrando tudo.

------------------------------------------------------------
SPRINT 1 — ETL DOS DADOS TSE (dias 6-12)
------------------------------------------------------------

Saída: banco de dados com dados eleitorais reais desde 1994

  - Download e normalização dos CSVs do TSE
    (candidatos, votação por zona/seção, 1994-2024)
  - Carga de shapefiles IBGE (5.570 municípios, PostGIS)
  - Mapeamento código TSE x código IBGE
  - Tabela de equivalência DEM + PSL = União Brasil
  - Dados de zonas e seções eleitorais
  - Validação de integridade dos dados carregados
  - Script reproduzível para atualizar quando sair 2026

Resultado: banco com ~20 milhões de registros eleitorais
limpos, indexados e prontos para consulta.

------------------------------------------------------------
SPRINT 2 — MAPA ELEITORAL (dias 13-22)
------------------------------------------------------------

Saída: mapa do Brasil funcionando com drill-down e farol

  - Mapa base com MapLibre GL JS + shapefiles IBGE
  - Coloração por farol (verde/amarelo/vermelho)
  - Drill-down: Brasil → Estado → Município → Zona
  - Tooltip no hover: KPIs do município
  - Painel lateral ao clicar no município
  - Filtro de pesquisa integrado (cidade, estado, político)
  - Botão "Voltar" na navegação do mapa
  - Responsivo: funciona em desktop, tablet e celular

Resultado: mapa interativo navegável com dados reais do TSE.

------------------------------------------------------------
SPRINT 3 — DOSSIÊ DO POLÍTICO (dias 23-29)
------------------------------------------------------------

Saída: dossiê completo de qualquer político, em PDF

  - Modal A4 com dados completos do político
  - Carreira desde 1994 (tabela + linha do tempo)
  - Últimas 3 eleições em destaque (gráfico)
  - Mapa pequeno com origem dos votos
  - Integração APIs externas:
    Câmara Federal (deputados federais)
    Senado Federal (senadores)
  - Geração de PDF via WeasyPrint
  - Download do dossiê

Resultado: clicou no político no mapa → dossiê completo
aparece em segundos, com download disponível.

------------------------------------------------------------
SPRINT 4 — PORTAL DO POLÍTICO (dias 30-35)
------------------------------------------------------------

Saída: área logada individual para cada político

  - Login separado para políticos
  - Painel pessoal com KPIs da última campanha
  - Mapa de granularidade: de onde vieram meus votos
  - Drill-down até seção eleitoral (escola)
  - Dossiê próprio (igual ao público, mas com mais dados)
  - Download do próprio dossiê em PDF

Resultado: cada político acessa sua própria inteligência
eleitoral sem ver os dados dos outros.

------------------------------------------------------------
SPRINT 5 — DELEGADOS E TERRITÓRIOS (dias 36-42)
------------------------------------------------------------

Saída: gestão completa de delegados e suas zonas

  - Cadastro de delegados (com vínculo a zonas)
  - Atribuição de zonas eleitorais por delegado
  - Painel de performance do delegado (unidade = voto)
  - Ranking de delegados
  - Mapa com sobreposição de áreas por delegado
  - Farol individual do delegado

Resultado: o presidente do partido vê, no mapa, quem é
o delegado responsável por cada zona e como está o
desempenho dele.

------------------------------------------------------------
SPRINT 6 — CADASTRO DE FILIADOS (dias 43-50)
------------------------------------------------------------

Saída: sistema de filiação digital substituindo o papel

  - Formulário de cadastro pelo delegado
  - Validação matemática de CPF e Título de Eleitor
  - Trava de inversão CPF x Título
  - Consulta ViaCEP (preenchimento automático de endereço)
  - Consulta SERPRO/TSE para validação externa
  - Alerta de duplicidade
  - Painel de filiados por delegado/região
  - Exportação para formato TSE

Resultado: delegado cadastra filiado pelo celular, o
sistema valida na hora, sem papel, sem erro.

------------------------------------------------------------
SPRINT 7 — IA E LINGUAGEM NATURAL (dias 51-58)
------------------------------------------------------------

Saída: agente de análise e busca inteligente funcionando

  - Campo de busca universal com autocomplete
  - Agente de análise (chat com dados) via Claude API
  - Agentes internos:
    Farol (recalculo automático)
    Alertas (detecção de quedas)
    Dossiê (geração de PDF)
    Relatório (periódicos)
  - Respostas em linguagem natural + gráficos automáticos

Resultado: o presidente digita "quais municípios
perdemos força em SP em 2024?" e recebe um mapa
com a resposta em segundos.

------------------------------------------------------------
SPRINT 8 — ALERTAS E NOTIFICAÇÕES (dias 59-63)
------------------------------------------------------------

Saída: sistema de alertas ativo em todos os canais

  - Detecção automática de quedas e perdas
  - Painel de alertas na plataforma
  - E-mail automático por perfil
  - WhatsApp Business API para delegados

------------------------------------------------------------
SPRINT 9 — POLIMENTO E SEGURANÇA (dias 64-70)
------------------------------------------------------------

Saída: produto completo, seguro, aprovado para produção

  - 2FA para perfis executivos
  - Testes de penetração (básico)
  - Auditoria de segurança completa
  - Ajustes de UX (foco no usuário de 65 anos)
  - Testes de carga
  - Documentação completa
  - Sessão de treinamento com a equipe

------------------------------------------------------------
RESUMO DO CRONOGRAMA
------------------------------------------------------------

Sprint   Módulo                      Dias    Acumulado
------   ------                      ----    ---------
  0      Fundação + Auth + Auditoria  1-5       5 dias
  1      ETL Dados TSE               6-12      12 dias
  2      Mapa Eleitoral             13-22      22 dias
  3      Dossiê do Político         23-29      29 dias
  4      Portal do Político         30-35      35 dias
  5      Delegados e Territórios    36-42      42 dias
  6      Cadastro de Filiados       43-50      50 dias
  7      IA e Linguagem Natural     51-58      58 dias
  8      Alertas e Notificações     59-63      63 dias
  9      Polimento e Segurança      64-70      70 dias

ENTREGA TOTAL: 70 dias corridos

============================================================
INVESTIMENTO CONSOLIDADO
============================================================

DESENVOLVIMENTO
  Sprint 0 — Fundação + Auth + Auditoria       R$  8.000
  Sprint 1 — ETL + Pipeline de Dados           R$ 12.000
  Sprint 2 — Mapa Eleitoral Interativo         R$ 18.000
  Sprint 3 — Dossiê do Político + PDF          R$ 10.000
  Sprint 4 — Portal do Político                R$  8.000
  Sprint 5 — Delegados e Territórios           R$  9.000
  Sprint 6 — Cadastro de Filiados              R$ 10.000
  Sprint 7 — IA e Linguagem Natural            R$ 12.000
  Sprint 8 — Alertas e Notificações            R$  5.000
  Sprint 9 — Polimento, Segurança, QA          R$  8.000
  ─────────────────────────────────────────────────────
  TOTAL DESENVOLVIMENTO                       R$100.000

INFRAESTRUTURA (12 meses de operação)
  Railway + Vercel + Redis + CDN + Domínio     R$  6.384
  ─────────────────────────────────────────────────────
  TOTAL INFRAESTRUTURA (1 ANO)                R$  6.384

TECNOLOGIA EMBARCADA (licenças anuais)
  Claude API — estimativa anual               R$  6.000
  SERPRO DataValid — estimativa anual         R$  3.600
  ─────────────────────────────────────────────────────
  TOTAL TECNOLOGIA                            R$  9.600

  ═════════════════════════════════════════════════════
  TOTAL DO PROJETO (desenvolvimento)         R$100.000
  TOTAL OPERAÇÃO ANO 1 (infra + tecnologia)  R$ 15.984
  ═════════════════════════════════════════════════════

FORMA DE PAGAMENTO (proposta)
  Marco 1 — Assinatura + Sprint 0+1 entregue   30%   R$ 30.000
  Marco 2 — Sprint 2+3 entregue (mapa + dossiê) 30%  R$ 30.000
  Marco 3 — Sprints 4-6 entregues              20%   R$ 20.000
  Marco 4 — Entrega final completa             20%   R$ 20.000

============================================================
REGRAS DO PROJETO (ENGENHARIA)
============================================================

  1. Módulo aprovado = zona protegida. Nenhuma alteração
     sem mapeamento completo de impacto.

  2. Sem gambiarras. Se algo não pode ser feito certo
     agora, não é feito agora.

  3. Sem código com bug conhecido entregue como solução.

  4. Com dúvida: perguntar. Não entregar parcial.

  5. NUNCA push/deploy sem ordem explícita do cliente.

  6. Toda migration com down_revision verificado no
     head real (não chutado).

  7. Segurança não é opcional: httpOnly cookies,
     SameSite, CSRF, rate limiting, 2FA — tudo
     desde o Sprint 0.

  8. UX para leigo: se um usuário de 65 anos não
     consegue usar sem ajuda, não está pronto.

============================================================
PRÓXIMOS PASSOS IMEDIATOS
============================================================

  1. Aprovação deste documento pelo cliente
  2. Decisões sobre os alertas críticos (seção 2 da proposta)
  3. Definição do domínio da plataforma
  4. Assinatura do contrato e NDA
  5. Kick-off: início do Sprint 0

============================================================
Mazzel Tech — mazzelag.com
cesar.ribeiro@mazzelag.com
CONFIDENCIAL
============================================================
