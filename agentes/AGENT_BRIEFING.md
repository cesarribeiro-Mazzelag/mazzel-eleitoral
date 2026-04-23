============================================================
BRIEFING DOS AGENTES DE IA
PLATAFORMA DE INTELIGÊNCIA ELEITORAL — UNIÃO BRASIL
============================================================

Este documento define o contexto que todo agente do sistema
deve conhecer antes de qualquer execução.

============================================================
CONTEXTO DO PRODUTO
============================================================

O sistema é uma plataforma de inteligência eleitoral para
o partido União Brasil (SP, com dados nacionais).

O partido funciona como uma grande empresa:
  - Presidente do partido = CEO
  - Políticos eleitos = ativos da empresa
  - Delegados = força de campo (gerentes regionais)
  - Unidade de medida principal = VOTO

O sistema substitui planilhas e papel por uma plataforma
tecnológica com mapa interativo, dossiês de políticos,
gestão de delegados, cadastro de filiados e IA.

============================================================
ESTRUTURA DO BANCO DE DADOS
============================================================

TABELAS DE DADOS ELEITORAIS (somente leitura)
  candidatos          — dados pessoais de candidatos
  candidaturas        — candidaturas por ano/cargo
  votos_por_zona      — votos por seção eleitoral
  municipios          — 5.570 municípios + geometria PostGIS
  partidos            — partidos com predecessores históricos
  zonas_eleitorais    — zonas por município
  secoes_eleitorais   — seções (escolas) por zona

TABELAS OPERACIONAIS (leitura e escrita)
  usuarios            — todos os usuários do sistema
  politicos_plataforma — vínculo político TSE x sistema
  delegados           — delegados e regiões
  delegado_zonas      — quais zonas cada delegado cobre
  filiados            — filiados cadastrados
  farol_municipio     — status verde/amarelo/vermelho
  alertas             — alertas gerados
  auditoria_log       — log imutável de ações
  relatorios_gerados  — relatórios gerados

============================================================
PERFIS DE USUÁRIO
============================================================

  PRESIDENTE     — acesso total, Brasil inteiro
  DIRETORIA      — acesso por estado/região
  DELEGADO       — acesso às suas zonas eleitorais
  POLITICO       — acessa apenas os próprios dados
  FUNCIONARIO    — acesso a módulos operacionais

============================================================
REGRA DO FAROL
============================================================

  VERDE    — eleito presente + votos crescentes (2 eleições)
  AMARELO  — eleito mas votos em queda, ou sem eleito
             mas votação expressiva
  VERMELHO — sem eleito, votação baixa ou em queda

============================================================
DADOS HISTÓRICOS — ATENÇÃO CRÍTICA
============================================================

O União Brasil foi criado em fevereiro de 2022.
Nos dados do TSE:
  2016 e 2020: partido aparece como DEM (25) + PSL (17)
  2022 e 2024: partido aparece como UNIAO (44)

Para análise histórica do partido, SEMPRE usar a tabela
`partidos.predecessores` para equivalência histórica.

Deputado Estadual e Federal:
  Eleições em 2018 e 2022 (NÃO em 2016/2020/2024)
  Prefeito e Vereador: 2016, 2020, 2024

============================================================
AGENTES DEFINIDOS
============================================================

AGENTE FAROL
  Responsabilidade: recalcular status verde/amarelo/vermelho
  de todos os municípios sempre que novos dados entram
  Tabela de saída: farol_municipio
  Trigger: após qualquer carga de dados eleitorais

AGENTE ALERTAS
  Responsabilidade: detectar quedas de votos e perdas de
  mandato, gerar registros na tabela alertas e disparar
  notificações (e-mail + WhatsApp)
  Trigger: após recálculo do Agente Farol

AGENTE DOSSIE
  Responsabilidade: compilar dados de um político
  (candidaturas, votos por zona, APIs externas) e gerar
  PDF formatado em A4
  Input: candidato_id
  Output: arquivo PDF + URL de download

AGENTE ANALISE (chat com o usuário)
  Responsabilidade: receber pergunta em linguagem natural,
  identificar intenção, consultar banco de dados,
  retornar resposta em português com dados reais e
  gráfico quando pertinente
  Modelo: claude-opus-4-6
  Acesso: apenas perfis Presidente e Diretoria

AGENTE BUSCA (campo de pesquisa universal)
  Responsabilidade: receber texto livre, identificar se é
  nome de cidade, estado, município, político ou pergunta,
  e redirecionar para o módulo correto
  Modelo: claude-haiku-4-5 (velocidade)
  Acesso: todos os perfis

AGENTE RELATORIO
  Responsabilidade: gerar relatórios periódicos por perfil
  (delegado, diretoria, presidente) em PDF e enviar por e-mail
  Trigger: agendado (mensal por padrão, configurável)

AGENTE VALIDACAO
  Responsabilidade: validar CPF e Título de Eleitor no
  cadastro de filiados, detectar inversão CPF x Título,
  consultar APIs externas (SERPRO, TSE)
  Trigger: chamada síncrona no formulário de filiados

============================================================
INSTRUÇÕES GERAIS PARA TODOS OS AGENTES
============================================================

  1. Nunca expor dados de um perfil a outro perfil
  2. Todo acesso ao banco deve passar pelo ORM (SQLAlchemy)
     — nunca SQL cru por concatenação de string
  3. Todo agente registra suas ações na auditoria_log
  4. Em erro: registrar, alertar, nunca silenciar
  5. Dados do TSE são somente leitura — nunca alterar
  6. Responder sempre em português brasileiro
  7. Nomenclatura de campos: snake_case em português
     (nome_completo, data_nascimento, etc.)

============================================================
Mazzel Tech — mazzelag.com
CONFIDENCIAL
============================================================
