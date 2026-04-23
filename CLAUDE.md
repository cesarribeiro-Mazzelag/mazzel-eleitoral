# Plataforma de Inteligência Eleitoral — União Brasil

## Contexto do Projeto

Sistema de BI eleitoral para o partido União Brasil.
O partido funciona como uma grande empresa: políticos eleitos são os ativos, voto é a unidade de medida, o presidente do partido é o CEO.

Substitui planilhas e papel por inteligência de dados com mapa interativo, dossiê de políticos, gestão de delegados e IA com linguagem natural.

**Pasta local:** `/Users/cesarribeiro/projetos/uniao-brasil/`
**Arquitetura completa:** `arquitetura/MASTER_ARCHITECTURE.md`
**Briefing dos agentes:** `agentes/AGENT_BRIEFING.md`

---

## Stack

- **Backend:** Python 3.12 + FastAPI + SQLAlchemy 2.0 async + Pydantic v2 + Alembic + Redis + Celery
- **Frontend:** Next.js 15 + React 19 + Tailwind CSS + MapLibre GL JS + Recharts
- **Banco:** PostgreSQL 16 + extensão PostGIS (geometrias de municípios)
- **IA:** Claude API (claude-opus-4-6 para análise, claude-haiku-4-5 para busca)
- **PDF:** WeasyPrint
- **Auth:** JWT + httpOnly cookies + 2FA (TOTP)
- **Deploy:** Railway (backend + banco + redis) + Vercel (frontend)

---

## Módulos (ordem de execução)

| Sprint | Módulo | Status |
|--------|--------|--------|
| 0 | Fundação: Auth + RBAC + Auditoria | pendente |
| 1 | ETL: Pipeline de dados TSE + IBGE | pendente |
| 2 | Mapa eleitoral interativo + Farol | pendente |
| 3 | Dossiê do político + PDF | pendente |
| 4 | Portal do político (área individual) | pendente |
| 5 | Delegados e territórios | pendente |
| 6 | Cadastro de filiados (validação CPF + Título) | pendente |
| 7 | IA e linguagem natural (agentes) | pendente |
| 8 | Alertas e notificações (e-mail + WhatsApp) | pendente |
| 9 | Polimento, segurança, QA | pendente |

---

## Perfis de Acesso (RBAC)

- **PRESIDENTE** - acesso total, Brasil inteiro
- **DIRETORIA** - acesso por estado/região
- **DELEGADO** - acessa apenas suas zonas eleitorais
- **POLITICO** - acessa apenas os próprios dados
- **FUNCIONARIO** - módulos operacionais atribuídos

---

## Dados Críticos (ler antes de qualquer trabalho com dados TSE)

**União Brasil não existia em 2016 e 2020.**
- 2016/2020: partido = DEM (nº 25) + PSL (nº 17)
- 2022/2024: partido = UNIAO (nº 44)
- Usar tabela `partidos.predecessores` para equivalência histórica

**Cargos por ciclo eleitoral:**
- Prefeito + Vereador: 2016, 2020, 2024
- Deputado Estadual + Deputado Federal + Senador + Governador: 2018, 2022

**Código TSE de município ≠ Código IBGE.** Usar tabela `municipios` com mapeamento.

**Encoding dos CSVs do TSE:** ISO-8859-1 (Latin-1). Converter para UTF-8 no ETL.

---

## Regras do Projeto

- Módulo aprovado = zona protegida. Nenhuma alteração sem mapeamento completo de impacto.
- Sem gambiarras. Se não pode ser feito certo agora, não é feito agora.
- Com dúvida: perguntar. Não entregar parcial.
- NUNCA push/deploy sem ordem explícita.
- Segurança desde o Sprint 0: httpOnly cookies, SameSite, CSRF, rate limiting, 2FA.
- UX para leigo: se um usuário de 65 anos não consegue usar sem ajuda, não está pronto.
- Todo agente registra ações na `auditoria_log`.
- Dados do TSE são somente leitura — nunca alterar diretamente.
- Responder sempre em português brasileiro.

---

## APIs Externas

| API | Uso | Custo |
|-----|-----|-------|
| TSE - dadosabertos.tse.jus.br | Dados eleitorais (CSV) | Gratuito |
| IBGE - servicodados.ibge.gov.br | Municípios, PIB, população | Gratuito |
| IBGE - geoftp.ibge.gov.br | Shapefiles municípios | Gratuito |
| Câmara Federal - dadosabertos.camara.leg.br | Deputados federais | Gratuito |
| Senado Federal - legis.senado.leg.br/dadosabertos | Senadores | Gratuito |
| ViaCEP - viacep.com.br | Preenchimento de endereço por CEP | Gratuito |
| SERPRO DataValid | Validação de CPF | Pago |
| Claude API (Anthropic) | IA + agentes | Pago (uso) |

---

## Farol de Força (algoritmo por município)

- **VERDE** - eleito presente + votos crescentes nas últimas 2 eleições
- **AMARELO** - eleito com votos em queda, ou sem eleito mas votação expressiva
- **VERMELHO** - sem eleito, votação baixa ou em queda
