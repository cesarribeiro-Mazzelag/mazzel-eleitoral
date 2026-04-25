# Módulo Operações — Arquitetura completa

Módulo central da plataforma. Substitui o nome temporário "Campanha 2026" e cobre **toda operação organizada do partido**: campanhas eleitorais, cobertura territorial diária, ofensivas administrativas, mobilizações, eventos. Eterno, não vinculado a uma eleição específica.

> Decisão: César, sessão 25/04/2026 noite. Nome canônico = **Operações**. "Campanha 2026" vira sub-aba dentro de Operações quando entrar período eleitoral.

---

## Princípio organizador

Operações replica a **lógica de Campanha do Facebook Ads** aplicada ao universo político, com o **mapa como elemento central** de configuração e visualização.

```
Facebook Ads                         Operações Políticas
────────────                         ────────────────────
Campanha (Objetivo)            →     Campanha (Filiar 5k em SP / Visitar prefeitos / Cobrir bairro X)
   │                                    │
   ├── Conjunto de Anúncios       →     ├── Configuração:
   │   (público, orçamento, prazo)      │   região no mapa, prazo, recursos, responsável
   │                                    │
   └── Anúncios (criativos)       →     └── Tarefas (ações concretas):
                                            visitar X, distribuir santinho rua Y, encontrar empresário Z

Métricas (CPM, CTR, CPA)        →     Score (tarefas concluídas, conversões, custo)
```

---

## Estrutura hierárquica de uma operação

### 1. Campanha (nível mais alto)

Define **o quê** e **por quê** se faz. Tem objetivo claro, dono, prazo, orçamento opcional.

**Tipos de objetivo (catálogo canônico):**

| Objetivo | Exemplo |
|----------|---------|
| **Filiação** | Filiar 5.000 pessoas no Vale do Paraíba em 90 dias |
| **Cobertura** | Cobrir 100% das ruas de Itaquaquecetuba com material de campanha |
| **Articulação** | Reunir-se com todos os 645 prefeitos paulistas em 60 dias |
| **Eleitoral** (em período de eleição) | Eleger 3 prefeitos na ABC Paulista |
| **Defesa** | Defender mandato vereador Y na 2ª rodada das audiências sobre ficha limpa |
| **Mobilização** | Levar 10k pessoas ao ato de 7 de setembro |
| **Pesquisa** | Mapear intenção de voto em 30 cidades estratégicas |
| **Comunicação** | Aumentar menções positivas a deputado X em 50% no trimestre |

### 2. Configuração (público + prazo + recursos)

Define **onde**, **quando** e **com o quê**. **Mapa central** aqui.

**Definição geográfica (no mapa):**
- **Raio** (círculo de N km a partir de um ponto) — útil pra eventos
- **Bairros** (multi-seleção de polígonos)
- **Zonas Eleitorais** (TSE)
- **Setores Censitários** (IBGE)
- **Microbairros / Microzonas** (1.795 SP — base própria)
- **Município(s)** (multi-seleção)
- **Estado(s)** (escopo amplo)
- **Zonas Confitantes** (regiões competitivas com adversário — baseado em score)

**Prazo:** data início + data fim, ou recorrência ("toda semana, 30 dias").

**Recursos:** orçamento (R$), materiais alocados (santinhos, banners, brindes), pessoal designado.

### 3. Tarefas (ações concretas)

O que cada executor precisa fazer. Cada tarefa tem:

- **Tipo** (catálogo: visita, evento, distribuição, reunião, ligação, postagem, registro fotográfico, check-in GPS, etc.)
- **Designado** (quem executa)
- **Localização** (ponto específico no mapa, ou área da configuração-pai)
- **Prazo individual** (dentro do prazo da configuração)
- **Critério de conclusão** (foto + nota + GPS, ou só auto-check-in, ou aprovação do superior)
- **Recompensa de score** (quanto vale completar — alimenta Overall do executor)

---

## Cascata de delegação

A Operação flui hierarquia abaixo. Cada nível recebe UMA campanha e cria N sub-campanhas pra subordinados.

```
Presidente Nacional
   │ cria campanha "Cobrir 27 estados em 90 dias com nominatas atualizadas"
   │
   ▼
Presidente Estadual (cada UF)
   │ recebe sub-campanha "Atualizar nominatas dos 645 municípios SP"
   │ desdobra em → cria sub-campanhas pros 645 Presidentes Municipais
   │
   ▼
Presidente Municipal (cada município)
   │ recebe sub-campanha "Atualizar nominata do meu município"
   │ desdobra → cria tarefas pra Sec-Geral, Tesoureiro, Membros
   │
   ▼
Secretário-Geral Municipal
   │ recebe tarefas concretas (coletar dados de cada cargo, validar CPF, agendar assinatura)
   │ executa, reporta, marca completa
   │
   ▼
Score sobe pela cascata:
   Sec-Geral terminou → +score Pres Municipal → +score Pres Estadual → +score Pres Nacional
```

**Mesmo padrão pra cabo eleitoral:**

```
Pres Estadual cria "Distribuir 1M santinhos no Grande SP"
   ▼
Coord Regional ABC recebe "Distribuir 200k santinhos na ABC"
   ▼
Coord Territorial Santo André recebe "Distribuir 50k santinhos em Santo André"
   ▼
Cabo Eleitoral recebe "Distribuir 500 santinhos rua X em 3 dias, com check-in GPS + foto"
```

---

## Painel de Operações por perfil

| Perfil | O que vê |
|--------|----------|
| **Presidente Nacional** | Todas as campanhas nacionais ativas + score consolidado por UF + alertas (UF atrasada, meta em risco) |
| **Presidente Estadual** | Campanhas onde ele é dono (criadas por Nacional) + campanhas que criou pra Municipais + score por município |
| **Presidente Municipal** | Campanhas que recebe + que criou + score da Comissão Municipal |
| **Coord Regional** | Campanhas operacionais regionais + score Coord Territoriais sob ele |
| **Coord Territorial** | Tarefas a designar + Cabos sob ele + mapa do território com cobertura visual |
| **Cabo Eleitoral** | Tela única mobile: tarefa do dia + mapa + chat + botão "completei" + foto + GPS |
| **Político (objetivo)** | "Operações em mim" — quem pediu pra agendar/visitar/encontrar com ele |

---

## Score sobe pela cascata (Princípio "Overall por hierarquia")

Cada nível tem um Overall calculado a partir das operações que ele e seus subordinados executaram. Igual ao Overall do candidato, mas pra **cargo administrativo**.

| Nível | Sub-medidas do Overall |
|-------|------------------------|
| **Presidente Nacional** | crescimento filiados nacional · receita partidária · novos eleitos vs ciclo passado · cobertura territorial (% municípios com Comissão ativa) · ranking partido vs concorrentes · score médio Pres Estaduais |
| **Presidente Estadual** | crescimento UF · eleitos UF · receita UF · % municípios sob comando · score médio Pres Municipais sob ele · operações concluídas no prazo |
| **Presidente Municipal** | crescimento município · nominata atualizada · filiações novas · operações concluídas · score médio cargos administrativos sob ele |
| **Coord Regional** | crescimento da região · conversão eventos→filiações · score médio Coord Territoriais |
| **Coord Territorial** | metas territoriais batidas · score médio Cabos |
| **Cabo Eleitoral** | check-ins GPS · materiais entregues · eventos comparecidos · panfletagem cumprida · conversão filiados |
| **Tesoureiro** | prestação contas em dia · taxa erro TSE · despesas vs orçamento · transparência publicada |
| **Secretário-Geral** | nominata atualizada · atas em dia · documentos arquivados · resposta a demandas |

**Vantagem CEO:** Milton-Pres Estadual abre Operações, vê **um número** por subordinado direto. Score baixo? Clica pra investigar. Igual gerente em empresa.

---

## Princípio de Continuidade Institucional

Quando muda quem ocupa um cargo (João → Maria) durante uma operação ativa:

- **Histórico da operação** fica vinculado ao **cargo + região**, não à pessoa
- **João tem score** medido só pelo período em que ocupou
- **Maria assume** com **acesso total ao contexto**: tarefas pendentes, relatórios anteriores, próximos passos, gargalos identificados
- **Score de Maria** começa a ser medido a partir da data que ela assumiu
- **Comparação justa**: quem performou melhor — João ou Maria — naquele cargo

Implementação: tabela `atividade_cargo` registra QUEM (membro_comissao_id) executou QUANDO (data_atividade) o QUÊ (tipo + métricas) — separado do registro de quem ocupa o cargo agora.

---

## Mapa Estratégico como base visual

Toda configuração de operação acontece **sobre o mapa**. Não é "Mapa Estratégico vs Operações" — é "**Operações DESENHADAS no Mapa Estratégico**".

**O mapa mostra:**
- Camada base: divisão administrativa (UF, município, bairro)
- Camada de **lideranças** (onde tem Comissão ativa, score por município)
- Camada de **eleitos** (onde UB elegeu nos últimos ciclos)
- Camada de **emendas** (R$ direcionado por região)
- Camada de **operações ativas** (regiões com campanha rodando, status visual)
- Camada de **adversários** (zonas dominadas por outros partidos — "zonas confitantes")

**Quando cria uma operação,** desenha a região no mapa. **Quando vê o resultado,** vê no mapa onde executou bem e onde falhou.

---

## Comunicação interna — Módulo Chat evoluído (Discord-style)

Operações precisam de **comunicação fluida** entre os executores. O módulo Chat existente vai evoluir pra cobrir 2 modos:

### Modo Permanente (uso geral)

- Conversas 1-1 e grupos
- Texto + mídia (foto, vídeo, áudio)
- Histórico preservado
- Notificações
- Funcionalidade: comunicação cotidiana entre membros do mesmo Diretório, equipe de gabinete, etc.

### Modo Sigiloso (durante operações sensíveis — estilo Discord)

- **Salas de áudio** (voz em tempo real, várias pessoas)
- **Salas de texto** por campanha (canais auto-criados pra cada operação)
- **Mídia com visualização única** (foto/áudio/vídeo abre, vê, desaparece — tipo Snapchat/WhatsApp Visualização Única)
- **Watermark obrigatório** (todo conteúdo carrega marca d'água com nome+data do espectador — anti-leak)
- **Apaga ao concluir operação** (mensagens da campanha somem quando operação encerra)
- **Modo radio:** botão push-to-talk pra coordenadores em campo (estilo PTT)

**Exemplo de uso:**
- Pres Estadual abre campanha "Articulação ABC"
- Plataforma cria automaticamente sala de áudio + canal de texto pra esta campanha
- Convida automaticamente todos designados
- Durante 60 dias da operação, equipe se comunica por essa sala
- Quando operação encerra, sala arquiva (acesso só pra Pres Estadual e auditoria)

### Integração com cabo eleitoral

Cabo precisa de chat **ultra-simples** — tela única com:
- Botão grande "Falar" (push-to-talk pro Coord Territorial)
- Lista de mensagens curtas (máx 3 visíveis)
- Botão "Foto" (envia foto de tarefa concluída)
- Botão "SOS" (alerta emergência → Coord + Pres Municipal recebem notificação imediata)

---

## UX pra "analfabeto funcional digital"

Princípio crítico do produto. Operações **TEM** que ser usável por cabo eleitoral idoso, presidente municipal de cidade pequena, dirigente partidário sem familiaridade com tecnologia.

### Regras inegociáveis

1. **Zero jargão técnico** — "campanha" não "ad set"; "tarefa" não "deliverable"; "região" não "polígono"
2. **1 ação principal por tela** — Cabo abre app: vê 1 tarefa do dia, 1 botão "Começar", 1 botão "Pronto". Sem distração.
3. **Linguagem direta na 2ª pessoa** — "Você precisa visitar o Prefeito X até quinta" não "Tarefa designada ao usuário"
4. **Ícones + cores semânticas** — vermelho=atrasado, verde=ok, amarelo=atenção, azul=informativo
5. **Wizard pra criar operação** — passo 1: qual seu objetivo? passo 2: onde? (mapa) passo 3: até quando? passo 4: quem executa?
6. **Pré-visualização antes de qualquer ação irreversível** — "Você está pra criar uma operação que vai notificar 245 cabos. Confirma?"
7. **Botão DESFAZER** sempre disponível por 30s após qualquer ação
8. **Confirmação por voz** opcional — Cabo pode falar "completei" em vez de digitar
9. **Onboarding em vídeo curto** (60s) explicando a tela na primeira vez
10. **Suporte humano integrado** — botão "Pedir ajuda" abre chamado direto

---

## Relatórios automáticos

Toda operação gera relatório automático ao concluir:

- Resumo executivo (1 parágrafo)
- O que foi feito (lista das tarefas + executor + data)
- Onde foi feito (mapa com pontos de execução)
- O que foi falado/prometido (texto livre dos executores compilado)
- Próximos passos sugeridos (IA gera com base no histórico)
- Métricas (% conclusão, tempo médio, custo, conversões)
- Score impacto (quanto subiu o Overall dos envolvidos)

Relatório vira PDF com **papel timbrado UB** (já temos asset) e fica arquivado no módulo Documentos.

---

## Integrações com outros módulos

| Módulo | Como Operações se conecta |
|--------|---------------------------|
| **Mapa Estratégico** | Toda operação é desenhada e visualizada nele |
| **Dossiês** | "Operações em mim" — político vê quem está pra visitá-lo |
| **Lideranças** | Lista de quem pode executar uma operação |
| **Cabos Eleitorais** | Último nível da cascata operacional |
| **Documentos** | Relatórios finais arquivam aqui |
| **Tesouraria** | Orçamento de operação debita aqui; despesas reportadas |
| **Agenda** | Tarefas viram eventos na agenda do executor |
| **Chat** | Comunicação da campanha (modo sigiloso) |
| **Alertas** | Atrasos, metas em risco, SOS de cabos |
| **IA** | Sugestões de próximos passos, geração de relatório, otimização de rotas |
| **Radar Político** | Operações reagem a eventos (adversário X moveu → cria operação contramovimento) |

---

## Roadmap sugerido (priorização pós-Designer)

### Fase 1 — Fundação (sprint 1-2)
- Modelo de dados (`operacoes`, `configuracoes_operacao`, `tarefas`, `atividade_cargo`)
- CRUD básico de operação no painel
- Cascata de delegação simples (criar pra subordinado direto)
- Mapa Estratégico mostrando operações ativas

### Fase 2 — Execução (sprint 3-4)
- Painel do Cabo (mobile-first)
- Check-in GPS, foto, nota
- Score subindo pela cascata em tempo real
- Notificações básicas

### Fase 3 — Comunicação (sprint 5-6)
- Chat evoluído (Modo Permanente)
- Salas auto-criadas por campanha
- Integração mídia (foto/áudio com visualização única)

### Fase 4 — Inteligência (sprint 7+)
- Catálogo de objetivos com templates
- Sugestões IA pra criar operações
- Relatórios automáticos
- Otimização de rotas

### Fase 5 — Avançado
- Salas de áudio (Discord-style)
- Push-to-talk para cabos
- Modo radio
- Watermark anti-leak
- Simulador de cenários

---

## Decisões registradas relacionadas

- `docs/perfis_e_paineis.md` — quem participa da cascata (Camada 4)
- `docs/UB_estrutura_partidaria.md` — hierarquia partidária que Operações respeita
- `docs/principio_portabilidade_perfil.md` — operações ficam no tenant; pessoal migra
- `docs/anderson_milton_briefing.md` — Milton-CEO usa Operações pra "controlar o reinado estadual"
- [[Decisao - Mapa Estrategico vs Mapa Eleitoral 2026-04-25]] — Mapa Estratégico é base visual de Operações
- [[project_uniao_brasil_modulo_campanha.md]] (Cérebro) — 8 conceitos originais do que era "Campanha 2026"
