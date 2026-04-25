# Briefing Claude Designer - Plataforma Mazzel Eleitoral

Oi Claude Designer. Vou te dar tudo que precisa para integrar e aplicar os designs que você vem gerando: acesso, stack, contexto estratégico, perfis, módulos novos, módulos a refinar e como a gente vai trabalhar. Lê tudo antes de começar - nada aqui é opcional.

---

## ⚠️ LEITURA OBRIGATÓRIA ANTES DE TUDO (atualizado 25/04/2026 noite)

Para esta sessão você vai entregar a **especificação técnica final do produto** + designs de tudo que falta. Pra fazer isso bem, abrir e absorver os 7 documentos abaixo NA ORDEM:

| # | Documento | O que tem |
|---|-----------|-----------|
| 1 | `docs/BRIEFING_NARRATIVA_PROJETO.md` | Narrativa completa do projeto (origem, evolução 12/04→25/04, estado atual, roadmap, regras). 50 KB de contexto. |
| 2 | `docs/UB_estrutura_partidaria.md` | Como o União Brasil se organiza (nominata, hierarquia Nacional→Estadual→Municipal, ficha de filiação, RBAC scoped, módulos administrativos novos, DocuSign). |
| 3 | `docs/perfis_e_paineis.md` | **Universo completo de perfis** (4 camadas): Mazzel + Política Partidária (8 cargos × 3 níveis) + Eletiva (7 cargos + gabinete) + Operacional (cascata). Cada perfil tem sidebar própria. |
| 4 | `docs/principio_portabilidade_perfil.md` | **Político é dono do dado pessoal; partido é dono da estratégia.** Quando político troca de partido: pessoal migra, estratégia fica. Diferencial competitivo + LGPD por design. |
| 5 | `docs/modulo_operacoes.md` | **Módulo central:** Operações estilo Facebook Ads + cascata de delegação (Pres → Coord → Cabo) + score subindo + Mapa Estratégico como base + Chat evoluído (Discord-style com salas de áudio). Substitui o nome temporário "Campanha 2026". |
| 6 | `docs/anderson_milton_briefing.md` | **Quem aprova o produto:** Milton Leite (Pres Estadual SP, perfil CEO). Crítica do mock, dossiê personalizado por cargo, sistema de IDs+convites Discord-style, bug crítico do Mapa Eleitoral V2, lista de 13 seções de entregáveis priorizados. |
| 7 | `docs/mapa_eleitoral_evolucao.md` | **Pra onde o Mapa precisa evoluir** — conceito de navegação atual aprovado (drill-down 5 níveis + foto-on-hover), 10 áreas de salto pra produção (performance, camadas estratégicas, modos comparativos, mobile-first, ações executivas, integração com Operações, etc.). Lista o que produzir nesta sessão + decisões já tomadas (não revisar) + decisões em aberto (Designer pode propor). |
| 8 | `STATUS_DADOS_V2.md` (raiz do worktree) | Qual módulo é REAL, qual é HIBRIDO (API+fallback mock), qual é MOCK puro, qual é PLACEHOLDER. Pra você não estilizar baseado em magnitudes erradas. |

E também os **arquivos oficiais do cliente** em `docs/anderson_referencias/`:
- `modelo_nominata_atual.docx` — papel timbrado oficial UB com logo + número 44 (extraído pra `codigo/frontend/public/branding/uniao-brasil/papel_timbrado.png`)
- `ficha_filiacao_partidaria.pdf` — formulário oficial de filiação

**Resumo em 3 linhas:**
1. O produto é uma plataforma multi-tenant de inteligência eleitoral pro União Brasil (e futuros partidos) que precisa fazer sentido pra um Presidente do partido (perfil CEO) controlar/organizar/crescer o negócio dele.
2. **Cada perfil** (Super Admin Mazzel até Cabo Eleitoral) tem painel próprio derivado do cargo + nível + escopo. Político eleito tem painel pessoal "agente de inteligência política" que migra com ele se trocar de partido.
3. **Operações** (estilo Facebook Ads + Discord pra comunicação) é o módulo central — onde campanhas eleitorais e cobertura territorial diária são planejadas no Mapa Estratégico, delegadas pela cascata, executadas pelos cabos, e medidas via score que sobe pela hierarquia.

**Princípios não-negociáveis** (em ordem):
1. **Imparcialidade narrativa** — plataforma narra fatos, não toma lado político
2. **Continuidade institucional** — histórico fica vinculado ao cargo+região, não à pessoa (João sai, Maria entra, contexto continua)
3. **Portabilidade de perfil** — político é dono do que é dele
4. **Linguagem CEO** — pra Milton-chefe-de-estado: 3 perguntas em 3 segundos, números com delta, ações executivas
5. **Linguagem analfabeto digital funcional** — pra cabo idoso: 1 ação por tela, zero jargão, ícones+cores semânticas, wizard guiado
6. **Mapa central** — toda operação é desenhada e visualizada no Mapa Estratégico
7. **Score em toda hierarquia** — não só candidato; presidente, coordenador, tesoureiro, secretário, cabo — todos têm Overall

---

# PARTE 0 · ESTRUTURA DE BRANCHES (atualizado 25/04/2026)

O repositório tem **3 branches** depois da reorganização de 25/04. Você trabalha **sempre na branch `v2-dev`**.

| Branch | O que é | Você mexe? |
|--------|---------|------------|
| **`v2-dev`** | Plataforma nova em desenvolvimento - é onde você atua | SIM |
| **`preservada`** | Versão antiga congelada para a reunião com cliente UB-SP | NÃO. Não tocar. |
| **`main`** | Apenas config de Docker (`docker-compose.yml`) e meta-doc (`VERSOES.md`) | NÃO |

Pastas principais pra design (todos na branch `v2-dev`):
- `codigo/frontend/app/mazzel-preview/` - todas as rotas da plataforma
- `codigo/frontend/components/plataforma-v2/` - Shell + Sidebar + Topbar + RBAC + 18 módulos
- `codigo/frontend/components/plataforma-v2/modulos/` - implementação de cada módulo
- `codigo/frontend/components/radar/CardPolitico.jsx` - Card FIFA V8 (zona protegida, aprovado 19/04)
- `codigo/frontend/components/dossie/DossieBureau.jsx` - dossiê estilo Bureau (zona protegida, aprovado 19/04)
- `codigo/frontend/app/globals-mazzel.css` - tokens de tema
- `codigo/frontend/public/mockups/` - HTMLs originais que você gerou (Plataforma-v2, Dossie, Mapa do Cabo, Sidebar Condicional, etc)
- `codigo/backend/` - API FastAPI (só pra entender endpoints e schemas v9)

---

# PARTE 1 · ACESSO E STACK

## Stack técnica

- **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind CSS + MapLibre GL JS + Recharts
- **Backend:** FastAPI + SQLAlchemy 2.0 async + Pydantic v2 + PostgreSQL 16 + PostGIS (você não precisa mexer, mas entender)
- **Auth:** JWT + cookies httpOnly + 2FA TOTP
- **Fontes:** Inter + JetBrains Mono (Google Fonts)
- **Tema:** tokens CSS em `app/globals-mazzel.css` suporta `[data-theme="dark"]` e `[data-theme="light"]`

## Repositório GitHub (público)

`https://github.com/cesarribeiro-Mazzelag/mazzel-eleitoral` (lembre: branch **`v2-dev`** é onde você atua)

## Site rodando ao vivo (pode acessar)

**URL pública:** `https://secondary-donald-legacy-could.trycloudflare.com/login`

(URL muda toda vez que o tunnel reinicia - se cair, peço o César gerar nova URL)

**Credenciais (perfil admin Mazzel):**
- Email: `cesar.ribeiro@mazzelag.com`
- Senha: `Xbox360ps3@`

Rotas pra inspecionar depois do login:
- `/mazzel-preview/home` - dashboard
- `/mazzel-preview/dossies` - biblioteca de 1.053.427 políticos em cards FIFA V8
- `/mazzel-preview/dossies/931510` - dossiê Bureau do Lula (exemplo completo)
- `/mazzel-preview/campanha` - 7 tabs
- `/mazzel-preview/chat` - chat sigiloso
- `/mazzel-preview/mapa` - **Mapa Estratégico** (ver mudança crítica abaixo)
- `/mazzel-preview/delegados`, `/coordenadores`, `/liderancas`, `/cabos`, `/suplentes`, `/afiliados`, `/alertas`, `/ia`, `/portal`, `/relatorios`, `/glossario`, `/estudo`, `/admin`

**Observação:** a URL é um tunnel Cloudflare grátis rodando no Mac do César. Só fica no ar quando o computador dele está ligado. A URL pode mudar quando reiniciar o tunnel. Pra produção migramos depois pra `app.mazzelag.com`.

### ⚠️ MUDANÇA CRÍTICA: Mapa Estratégico vs Mapa Eleitoral (decisão 25/04/2026)

A sidebar principal **NÃO** terá Mapa Eleitoral. O Mapa Eleitoral é motor de dados (TSE, votação, eleitos históricos), mas pra rotina do partido faz mais sentido um **Mapa Estratégico** mostrando o que o partido está fazendo HOJE no território.

| Mapa | Foco | Onde fica | Status |
|------|------|-----------|--------|
| **Mapa Estratégico** (NOVO) | Domínio territorial: equipe + lideranças + candidatos eleitos + emendas + scores | Sidebar principal (`/mazzel-preview/mapa`) | A redesenhar pelo Designer |
| **Mapa Eleitoral** (existente) | Votação histórica TSE com drill-down | Sub-tela do módulo **Estudo** (`/mazzel-preview/estudo/mapa-eleitoral` ou similar) | Reaproveitar lógica existente |

**Como deve funcionar o Mapa Estratégico:**
- Drill-down 5 níveis (Brasil→UF→Município→Bairro→Microregião) - **mesma lógica do Mapa Eleitoral, apenas voltada pra pessoas da equipe**
- Click numa região → painel lateral mostra:
  - Lideranças daquela área (com card resumo)
  - Trabalho das lideranças (atividades, presença, etc)
  - Candidatos eleitos da região
  - Emendas executadas
  - Scores Overall v9
  - Cobertura da equipe (quantos cabos/coordenadores ativos)
- **Navegação integrada:** click numa liderança no mapa → abre dossiê dela direto

Importante: o Designer já tinha proposto algo nesse sentido em `Plataforma-v2.html` ou correlatos, mas implementações de agentes posteriores quebraram a lógica subindo o Mapa Eleitoral como principal. **Voltar pra proposta original do Designer.**

---

# PARTE 2 · O QUE É A PLATAFORMA

**Mazzel Eleitoral** é um SaaS white-label de gestão política para partidos brasileiros. É a única plataforma no mercado que unifica: inteligência eleitoral (dados TSE + mapa), gestão de campanhas, CRM da base partidária, comando de campo, chat sigiloso e portal do candidato eleito.

- O projeto em si é a **Mazzel Eleitoral**
- **União Brasil** é o primeiro tenant/cliente (demo do pitch comercial)
- Cada partido contratante vira um tenant com branding próprio (logo, cor primária, domínio)
- Escala alvo: 800+ campanhas ativas simultaneamente durante eleição

---

# PARTE 3 · PERFIS DE USUÁRIO (RBAC)

A plataforma tem **perfis distintos com lógicas diferentes**. Cada um vê sidebar e dashboard específicos. O layout **não pode ser monolítico**.

## Grupo A · Cadeia de comando de campanha (cascata top-down)

Esta é a **estrutura operacional** da campanha eleitoral. Funciona como militar: cada nível designa o próximo abaixo e vê só quem está debaixo dele.

| Nível | Perfil | Escopo | Quem é |
|-------|--------|--------|--------|
| 1 | **Presidente do partido** | Tenant inteiro (nacional) | Presidente nacional, diretoria executiva |
| 2 | **Liderança estadual** | UF | Presidente de diretório estadual |
| 3 | **Coordenador regional** | Conjunto de municípios | Coord de região dentro da UF |
| 4 | **Coordenador territorial** | Bairros/zonas de um município | Coord de bairro |
| 5 | **Cabo eleitoral** | Microterritório (rua/quadra) | Executor de campo, painel simplificado |

**Regra da cascata:**
```
Presidente → designa Liderança estadual
  → designa Coordenador regional
    → designa Coordenador territorial
      → designa Cabo eleitoral
        → EXECUTA (não designa ninguém)
```

O **Presidente** pode pular níveis e designar qualquer função direta quando quiser. Os demais só designam o próximo direto abaixo.

## Grupo B · Autoridades políticas independentes

**O político eleito NÃO faz parte da cadeia de comando de campanha.** Ele é uma **autoridade que atua de modo independente**. A campanha existiu pra elegê-lo; agora ele cumpre mandato e tem sua estrutura própria.

| Perfil | Escopo | Quem é |
|--------|--------|--------|
| **Político eleito (com mandato)** | Dados próprios + equipe de gabinete + dossiê público + estrutura do partido (visão consultiva) | Senador, Deputado, Prefeito, Governador, Vereador no cargo |
| **Candidato em campanha (ainda não eleito)** | Dados próprios + sua campanha + equipe de campanha | Candidato no processo eleitoral (antes da eleição) |
| **Equipe do político eleito** | Dados do político que atende | Chefe de gabinete, secretário, assessor, equipe de comunicação |

O político eleito **vê** a estrutura do partido (pra saber com quem contar politicamente) mas **não manda** nela. A hierarquia de campanha é serviço prestado ao partido pra eleger/reeleger - não é serviço prestado ao político individual.

## Grupo C · Operação administrativa do partido

| Perfil | Escopo |
|--------|--------|
| **Time administrativo** | CRM filiados, gestão interna, auditoria |

## Grupo D · Super admin da plataforma (Mazzel)

| Perfil | Escopo |
|--------|--------|
| **Admin Mazzel** | Plataforma inteira, todos os tenants | Só César Ribeiro (founder) |

## Implicação de design

- **Sidebar condicional por perfil** - 8 variações (uma por perfil listado)
- **Dashboard inicial específico** - presidente vê agregado nacional; cabo vê sua agenda; político eleito vê painel de mandato + estrutura do partido; equipe de gabinete vê a agenda do chefe
- Menu "Cabos Eleitorais" só aparece pra quem DESIGNA cabos (não pra cabo nem pra político eleito)
- Menu "Dossiês" aparece pra todos (consulta política é universal)

---

# PARTE 4 · ESCALA: 800+ CAMPANHAS SIMULTÂNEAS

O layout atual de `/mazzel-preview/campanha` foi desenhado pensando em UMA campanha (Jaques Wagner 2026). **Não escala** quando o partido tem 800 candidatos concorrendo ao mesmo tempo (Deputados Federais + Estaduais + Senadores + Prefeitos + Vereadores).

**O que precisa repensar:**

- **Seletor de campanha ativa no topo** (dropdown com busca, agrupado por cargo/UF)
- **"Minhas campanhas"** pra o usuário ter acesso rápido às campanhas que gerencia
- **Dashboard agregador nacional** (presidente do partido) vê saúde de todas as campanhas
- **Dashboard regional/estadual** (liderança UF) vê só as campanhas do estado
- **Dashboard individual** (candidato) vê só a sua
- Navegação entre campanhas deve ser **1 clique**, não "sair do módulo → escolher outra → entrar"

Inspiração: Google Analytics quando tem 50 propriedades - dropdown inteligente + "favoritos" + atalhos.

---

# PARTE 5 · CHAT - JÁ IMPLEMENTADO

O backend do Chat Sigiloso está **100% pronto**. O layout atual (`components/chat/ChatWorkspace.jsx`) funciona end-to-end via tunnel. **Não precisa criar do zero** - só ajustar o visual pro design system Mazzel.

**Funcionalidades implementadas:**

- 4 tabelas: `chat_sala`, `chat_participante`, `chat_mensagem`, `chat_audit`
- 9 endpoints REST (`/chat/salas`, `/chat/mensagens`, etc)
- 3 modos de mensagem:
  - **Padrão** - persiste (WhatsApp normal)
  - **Sigiloso** - TTL configurável (apaga automaticamente após N segundos)
  - **Visualização única** - apaga 5s após leitura (igual WhatsApp)
- E2E: servidor armazena apenas `conteudo_criptografado BYTEA`, nunca descriptografa
- RBAC por sala, audit log completo, cleanup job para mensagens expiradas
- Estilo Discord (salas persistentes) + WhatsApp (modos de mensagem)
- Entry points: sidebar global (`/mazzel-preview/chat`) + tab dentro de Campanha

**Bugs que corrigi recentemente no preview (pra você saber o estado atual):**

- Seleção automática da primeira sala real (não mais mock `delegado-regionais`)
- Decodificação base64 do conteúdo (atob UTF-8)
- Autoria correta (não mais "Você" para todas as mensagens)
- Contagem de membros via detalhe da sala
- Envio de view_único e sigiloso funcionando end-to-end

---

# PARTE 6 · DOSSIÊS vs RADAR POLÍTICO

## Dossiês (`/mazzel-preview/dossies`)

- Biblioteca de **1.053.427 políticos** (candidatos TSE 1994-2024)
- Grid de Cards FIFA V8 com foto HD + bandeira UF + OVR + stats (VOT/FID/EFI/INT/ART/TER)
- Filtros: cargo, UF, ano, tier, busca por nome, ordenação
- Scroll infinito
- Click no card → `/mazzel-preview/dossies/[id]` = **Dossiê Bureau** estilo Serasa (15+ cards: Overall 8D, raio-x, KPIs, alertas, chapa, benchmarking, desempenho eleitoral, mapa, redutos)

**Novo filtro pedido:** "não eleitos por pequena diferença" - últimas colocações de perdedores, considerando quociente eleitoral nas proporcionais. Gente que quase entrou e pode subir na próxima eleição = radar de oportunidade.

## Radar Político (`/mazzel-preview/radar` - hoje placeholder)

Vai virar **observatório dinâmico em tempo real** (não mais lista de cards - isso foi pra Dossiês). 6 componentes:

1. **Timeline viva** - feed cronológico de eventos: novo processo criminal, mudança de partido (TSE), sanção CEIS/CEAF/TCU, votação crítica no Congresso (quem votou como), discurso relevante, aparição na mídia
2. **Movimentações da semana** - top 10 subidas/quedas em pesquisas, em risco de inelegibilidade, estreantes em ascensão
3. **Alertas estratégicos** filtrados por perfil (presidente do partido vê diferente do candidato individual)
4. **Acompanhamento de pautas** - temas em alta, quem lidera cada pauta
5. **Balança de forças** - composição atual do Congresso, movimentos de coalizão
6. **Sentinela** - próximos 7 dias: votações críticas, CPIs, julgamentos STF

---

# PARTE 7 · MÓDULO NOVO · ALIANÇAS POLÍTICAS

Ideia do cliente, **ainda não implementada**. Vai ser módulo dedicado na sidebar.

**7 camadas:**

1. **Base histórica** - quem o político apoiou, quem apoiou ele, resultados (eleições vencidas, cargos conquistados)
2. **Mapa interativo de alianças** - camadas de partidos aliados, lideranças locais, influenciadores, grupos comunitários; regiões cobertas e lacunas
3. **Painel de metas** - alvos concretos ("construir apoio em 3 novas cidades até a eleição")
4. **Análise de potenciais alianças** - sugestões com base em dados: presença em redes, histórico eleitoral, proximidade ideológica
5. **Simulador de cenários** - "se fechar aliança com partido X, qual o impacto em votos?"
6. **Alertas + calendário** - prazos de negociações, compromissos com aliados
7. **Relatórios** - consolidado estratégico

Substituir "memória pessoal" do político por **painel de gestão política**.

---

# PARTE 8 · MÓDULO CABO ELEITORAL · CASCATA HIERÁRQUICA

Painel top-down de designação de funções (ver PARTE 3 Grupo A).

## Painel do Cabo (simplificado)

É o **executor de campo**. Interface minimalista, pensada pra uso em celular em trânsito (mesmo sem app mobile nativo ainda):

- **Agenda do dia** - o que fazer, onde, com quem
- **Mapa da área** - microterritório atribuído
- **Chat** - com coordenador direto + grupo da cerca
- **Comando de campo** - tarefas do dia (check-in GPS, entrega de material, visita a eleitor, panfletagem)
- **Metas da semana** - simples, visual tipo "3/5 ruas cobertas"
- **Registro rápido** - tirar foto + nota de ocorrência

## Detalhe crítico - Cabo sem smartphone

Cabo eleitoral é frequentemente humilde, idoso, sem celular. A arquitetura suporta 2 modos:

- **Cabo autônomo** (tem smartphone): ele mesmo faz check-in GPS, upload de foto
- **Cabo validado** (sem smartphone): coordenador territorial valida presença dele fisicamente via plataforma (GPS do coord + foto + nota + opcional assinatura digital do cabo no celular do coord)

Campo `possui_smartphone: bool` na pessoa. Checkin tem `validado_por_papel_id` (FK papeis_campanha) pra saber se foi o próprio cabo ou o coord.

Implicações:
- Pagamento de cabos: relatórios comprovam dias trabalhados validados
- Prestação de contas Justiça Eleitoral: trilha de trabalho
- Humanização: não exclui cabos idosos ou humildes

---

# PARTE 9 · AGENDA GOOGLE INTEGRADA

Para político eleito (que tem equipe própria), integrar **Google Calendar API** pra leitura de compromissos.

A equipe do político (chefe de gabinete, secretário, assessor) acessa a plataforma Mazzel e vê a agenda do chefe direto sincronizada do Google.

**Funcionalidades esperadas:**

- OAuth Google pra conectar calendário
- Visualização de compromissos do dia/semana/mês
- Marcação de compromissos relevantes (reunião política, votação, CPI, entrevista)
- Cruzamento com alertas do Radar Político (evento político vai acontecer tal dia)
- Lembrete de compromissos com aliados (vem do módulo Alianças)

---

# PARTE 10 · MÓDULO ESTUDO

Módulo panorâmico nacional de análise agregada:

- Ranking por partido / UF / área de atuação
- Comparativos cross-candidatos
- Tendências históricas (1994 a 2024, 7 ciclos eleitorais)
- Relatórios de inteligência ("quem são os jogadores que importam")
- Exportação em PDF
- Filtros avançados: cargo, UF, ciclo, tema de atuação

---

# PARTE 11 · ZONAS PROTEGIDAS - NÃO REDESENHAR

Esses componentes foram aprovados e funcionam. **Não tocar sem consultar o César antes:**

- `components/radar/CardPolitico.jsx` - Card FIFA V8, aprovado 19/04/2026
- `components/dossie/DossieBureau.jsx` - Dossiê Bureau estilo Serasa, aprovado 19/04/2026
- Fluxo OAuth Google/GitHub - aprovado
- Onboarding signup → verificar email → dashboard - aprovado 23/03/2026

Se for necessário evoluir algum desses, sugere - o César decide.

---

# PARTE 12 · O QUE QUERO QUE VOCÊ FAÇA (ORDEM DE PRIORIDADE)

1. **Migrar o `/mazzel-preview/*` inteiro pro bundle v8** que você me enviou (`Mazzel Eleitoral-8/src/platform-*.jsx`). Não criar do zero - ajustar o que já tem funcionando pro seu layout v8. O César reforçou: você vai **ajustar os layouts** baseado no que já construiu e funciona, e se precisar refinar os cards de políticos pra caber na essência visual do v8, pode ajustar.

2. **Redesenhar Campanha pra escala** (800+ campanhas) - seletor inteligente, dashboards por perfil

3. **Sidebar condicional por perfil** (8 variações - Grupo A/B/C/D da PARTE 3)

4. **Dark/Light toggle** no Topbar (infra CSS pronta em `globals-mazzel.css`, falta botão + persistir localStorage)

5. **Subir MapLibre real** em `/mazzel-preview/mapa` (hoje mock estático)

6. **Painel do Político Eleito** (autoridade independente) - dashboard de mandato + visão consultiva da estrutura do partido + agenda Google

7. **Painel da Equipe de Gabinete** (chefe de gabinete, secretário) - atende o político eleito, vê agenda dele, tarefas, compromissos

8. **Módulo Alianças Políticas** (novo - 7 camadas da PARTE 7)

9. **Módulo Cabo Eleitoral** - reformular com cascata hierárquica + painel simplificado do cabo

10. **Radar Político observatório dinâmico** (6 componentes da PARTE 6)

11. **Integração Agenda Google** (UI + fluxo OAuth)

12. **Módulo Estudo** (layout da análise panorâmica)

13. **Visão de partido = time** - página de partido com logo grande + elenco agrupado por cargo (candidatos e eleitos)

---

# PARTE 13 · FLUXO DE TRABALHO

- Você (Designer) gera código / diretrizes / componentes
- César passa pro Claude Code (eu) que aplica no repo, testa no browser via Playwright, comita
- Tunnel atualiza automaticamente (hot reload do Next.js)
- Você revisa ao vivo via URL pública e itera
- Dúvida ou decisão arquitetural → fala com o César, não assume

---

# PARTE 14 · RESTRIÇÕES TÉCNICAS

- Frontend: Next.js 15 App Router + React 19 + Tailwind + MapLibre + Recharts
- Fontes: Inter + JetBrains Mono (Google Fonts)
- Tema: `[data-theme="dark"]` e `[data-theme="light"]` já parametrizados em `globals-mazzel.css`
- Backend FastAPI - não mexer
- Sem em-dash (`—`) no código, usar hífen simples
- Nomes de variáveis em pt-br sem acento (`nome_completo`, não `nomeCompleto`)
- Commit NÃO - Claude Code faz o commit final quando o César autorizar

---

# PARTE 15 · CONTEXTO ESTRATÉGICO

Estamos próximos da eleição de 2026. O negócio precisa escalar. O primeiro cliente é o União Brasil (demo), mas a plataforma é **Mazzel Eleitoral** - vai atender PT, PSDB, PL, PSD, MDB e qualquer outro partido que contratar o white-label.

O projeto é ambicioso: substituir planilhas, WhatsApp fragmentado e memória pessoal por uma **plataforma unificada de gestão política** estilo Salesforce pra campanhas eleitorais.

Agora é a hora de **escalar o negócio**. O briefing está completo - pode começar pelo item 1 da prioridade (migração bundle v8) e me avisa o que você decide atacar primeiro.
