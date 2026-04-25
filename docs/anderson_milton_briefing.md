# Briefing do cliente — Anderson + Milton Leite

Observações capturadas em 25/04/2026 sobre **quem decide** e **o que precisa ver** pra aprovar a plataforma. Documenta o cliente real e dirige decisões de produto, UX e priorização.

> **Atualização noturna 25/04/2026:** seções 7-12 adicionadas após sessão de download de visão. Consolidam universo completo de perfis, princípios estruturais (Overall por hierarquia + Portabilidade + Continuidade institucional), módulo Operações (estilo Facebook Ads), módulo Chat evoluído (Discord-style), e bug crítico do Mapa Eleitoral V2.

**Documentos complementares (leitura obrigatória pelo Designer):**
- `perfis_e_paineis.md` — universo completo de perfis (4 camadas)
- `modulo_operacoes.md` — Operações estilo Facebook Ads + Chat evoluído
- `principio_portabilidade_perfil.md` — separação dado pessoal vs estratégico do partido
- `UB_estrutura_partidaria.md` — nominata, hierarquia, RBAC, DocuSign

---

## Quem é quem

### Anderson
- **Papel:** cliente operacional. Interlocutor direto do César.
- **O que faz:** entrega documentos oficiais (nominata, ficha de filiação), levanta requisitos administrativos, intermedia conversas com a alta liderança.
- **Pediu explicitamente:**
  1. Arquivar todos os documentos do partido na plataforma.
  2. Gerar assinaturas eletrônicas via **DocuSign** (validade legal).
  3. Painéis específicos pros perfis da nominata (Presidente, Tesoureiro, Secretário etc.).

### Milton Leite — quem aprova
- **Papel:** quem dá o "sim" final no projeto.
- **Perfil:** **CEO de empresa**. Direto, sem rodeios, foco em resultado.
- **O que ele precisa ver:**
  - "Faz sentido pra trabalhar" — toda função tem propósito operacional claro
  - **Ver o negócio acontecer** — KPIs ao vivo, indicadores de movimento
  - **Controlar** — saber o que está acontecendo, em qualquer nível
  - **Organizar** — estrutura clara, hierarquia visível, responsabilidades atribuídas
  - **Fazer o partido crescer** — métricas de evolução, não só estado atual

### Implicação direta no design

A linguagem visual e textual da plataforma deve ser **executiva**, não acadêmica:

| Evitar | Preferir |
|--------|----------|
| "Análise comparativa de desempenho" | "Quem cresceu, quem caiu" |
| Gráficos exploratórios sem conclusão | Big numbers + seta + ação sugerida |
| Filtros expostos sem default útil | Default = visão executiva pronta |
| Métricas estáticas | Indicadores de **delta** (vs. semana, vs. mês, vs. eleição passada) |
| "Ver detalhes" | "Tomar ação" / "Designar responsável" / "Pedir relatório" |

O dashboard inicial precisa responder em **3 segundos** as três perguntas do CEO:
1. **Como meu partido está hoje?**
2. **O que mudou desde ontem?**
3. **O que preciso decidir agora?**

---

## Mock data: ponto crítico que precisa correção

### Problema atual

Hoje o **demo do Wagner** (Senador) é o único candidato com dados completos em todas as dimensões do Overall v9 (ATV/LEG/BSE/INF/MID/PAC). Pra outros cargos a base de dados está parcial:

- **Senadores:** dados completos (Wagner, Renan, etc.)
- **Deputados Federais:** parcial (alguns sim, maioria com sub-medidas null)
- **Deputados Estaduais:** quase tudo null
- **Prefeitos:** só dados eleitorais, sem mandato detalhado
- **Vereadores:** só dados TSE (sem atividade legislativa local)
- **Não-eleitos / Suplentes:** só dados de candidatura
- **Candidatos sem mandato ativo / com cargo no governo / com função partidária:** zero cobertura

### Por que isso é crítico pro Milton

Se o Milton abrir o dossiê do Presidente da Comissão Municipal de Itaquaquecetuba (vereador suplente que hoje exerce função partidária administrativa) e ver **6 dimensões em branco**, ele vai concluir que a plataforma **não funciona pra quem ele realmente precisa gerenciar** — porque a maioria dos comandados dele não está no Congresso.

### Direção pro Designer

O Designer precisa pensar em:

1. **Dossiê personalizado por cargo + situação.** As 6 dimensões v9 são iguais pra todo mundo, mas as **sub-medidas** mudam:
   - **Parlamentar federal:** discursos plenário + comissões + emendas executadas
   - **Parlamentar estadual:** discursos AL + projetos estaduais + cargos
   - **Vereador:** projetos câmara municipal + audiências + atendimento à base
   - **Executivo (Pres/Gov/Pref):** decretos + obras + audiências + DOU
   - **Não-eleito com cargo no governo:** secretarias, gabinetes, projetos
   - **Não-eleito com função partidária:** eventos partidários, articulação interna, recrutamento de filiados, mobilização territorial
   - **Candidato derrotado:** trajetória eleitoral, votos por região, potencial de retorno
2. **Fallbacks visuais inteligentes.** Quando uma sub-medida não tem dado:
   - **Não** mostrar "0" (sugere que a pessoa zerou — falso)
   - **Não** mostrar barra cinza vazia (Milton interpreta como "produto incompleto")
   - **Mostrar** chip "dado em construção" + link "como vamos coletar isso" (transparência educa o usuário)
3. **Demos dummy para cada cargo** (mesmo enquanto ETLs não rodam):
   - 1 senador (Wagner — já existe)
   - 1 deputado federal completo
   - 1 deputado estadual completo
   - 1 prefeito (capital + interior, perfis diferentes)
   - 1 governador
   - 1 vereador (capital + interior)
   - 1 não-eleito com cargo público (ex: secretário estadual)
   - 1 dirigente partidário sem cargo eletivo (ex: Presidente Comissão Municipal)

### Direção pro Cesar

Cobertura técnica (Sprint 2+ já planejado em `[[2026-04-24b - Uniao Brasil - Dossie sprint completo planejamento]]`):
- ATV.3 CPIs/missões
- BSE.3 Fidelidade (Trilha B)
- INF.3 Rede de apoios (grafo co-autoria)
- PAC.1-3 Pactuação (votações nominais + emendas)
- MID.1-3 Mídia (GDELT + RSS + YouTube)

Pra dirigentes partidários sem cargo eletivo (perfil que **só existe na nominata UB**), as dimensões v9 precisam ser **reconceitualizadas** — atualmente estão pensadas pra eleitos. Sugestão:
- **ATV** = atos partidários (eventos organizados, reuniões da comissão, presença em sessões do diretório)
- **LEG** = produção administrativa (resoluções, manifestos, programas internos)
- **BSE** = território de atuação dentro do partido (zona/seção/município de filiação)
- **INF** = posição na hierarquia partidária (quantos membros sob cascata)
- **MID** = exposição interna (boletins do partido, redes próprias)
- **PAC** = articulação intra-partido + alianças informais

Esse é um sub-projeto que pode ir pro **módulo Estudo** ou virar tela própria do **módulo Diretórios**.

---

## Cartinhas — refinamento solicitado

César avaliou: *"Estão boas, mas podem melhorar — Designer pode propor melhorias para ficar harmônico com o layout da plataforma."*

### O que está bom hoje
- Formato 4:5 Instagram-friendly
- Foto grande, OVR + tier visíveis
- 6 atributos numéricos (ATV/LEG/BSE/INF/MID/PAC)
- Badge de cargo + UF + bandeira
- Cores por partido + bandeira do estado canto superior
- Logo do partido no rodapé

### O que pode melhorar (Designer decide)
- **Harmonia de tipografia** com o resto da plataforma (sidebar, headers usam Inter ou Display? Confirmar)
- **Spacing e proporção** — a faixa colorida embaixo (cor do partido) vs. faixa de cima (foto+OVR) está balanceada?
- **Estados visuais por cargo:** vereador, senador e candidato derrotado parecem diferentes? Ou só muda o badge?
- **Status de "não-eleito"** — hoje a cartinha não diferencia visualmente quem perdeu de quem ainda está em campanha
- **Cargos partidários (não-eleitos)** — mostrar o cargo na nominata em vez de "candidato a vereador 2024"
- **Indicador de evolução** — Milton-CEO quer ver delta, não só foto estática. Sugestão: micro-trendline ao lado do OVR ("+3 nos últimos 3 meses")
- **Score POL vs. OVR** — hoje o número é OVR. Mostrar também o Score POL? Como? (decisão Designer)

### Zona protegida (não mexer sem conversar)
O Card V2 (4:5) foi aprovado em 24/04 — `[[project_uniao_brasil_card_v2]]` no Cérebro. Mudanças cosméticas são bem-vindas; mudança de proporção, layout estrutural ou siglas v9 → não.

---

## Sidebar — lógica por perfil

Hoje a sidebar tem **23 itens** e mostra todos pra todos os usuários. Isso não funciona pro Milton-CEO nem pra um Tesoureiro Municipal.

### Direção pro Designer

**Cada perfil RBAC tem uma sidebar diferente.** Não é menu acordeão — é menu **filtrado por permissão real**.

| Perfil | Itens visíveis (proposta inicial) |
|--------|-----------------------------------|
| **Presidente Nacional / Milton Leite** | Dashboard executivo, Diretórios (todos níveis), Dossiês, Mapa Estratégico, Radar Político, Alertas, Estudo, Campanha 2026, Documentos, Tesouraria (visão consolidada), Admin |
| **Presidente Estadual** | Dashboard (UF), Diretórios (sua UF), Dossiês (UF), Mapa Estratégico (UF), Alertas, Campanha 2026 (UF), Documentos (UF), Tesouraria (UF) |
| **Presidente Municipal** | Dashboard (município), Comissão Municipal (sua nominata), Filiados (município), Documentos (município), Tesouraria (município), Cabos Eleitorais |
| **Tesoureiro (qualquer nível)** | Tesouraria (escopo do nível), Documentos, Filiados (consultar) |
| **Secretário** | Comissão (escopo), Documentos, Filiados, Atas |
| **Político eleito (com mandato)** | Portal pessoal, Dossiê próprio, Mandato, Atividade legislativa, Mídia, Agenda |
| **Candidato em campanha** | Portal pessoal, Dossiê próprio, Mapa Estratégico (sua zona), Cabos Eleitorais, Agenda |
| **Cabo Eleitoral** | Tela única (mobile-first): Agenda do dia, Mapa, Chat, Comando de campo, Metas, Registro |
| **Filiado** | Dossiê próprio, Diretório onde está vinculado, Documentos pessoais |

**Implicações de implementação:**
- A sidebar precisa ser **derivada do perfil + escopo** no momento do login (já tem RBAC base, falta o filtro)
- Itens "Coordenadores", "Afiliados", "Mandato", "Super" da sidebar atual precisam de definição clara de quem vê
- Designer deve propor **agrupamento visual** dentro da sidebar (não 12 itens chapados — agrupados por tarefa: Operação, Gestão, Análise, Configuração)

---

## White label União Brasil

### Hoje (estado atual)
- Sigla "UB" + cor roxa (Mazzel)
- Logo Mazzel
- Sidebar/header em tons roxo/cinza

### Alvo
- Sigla "UB" + cores **azul (#003399 aprox) + amarelo (#FFD700 aprox)**
- Logo oficial UB extraído do papel timbrado: `codigo/frontend/public/branding/uniao-brasil/papel_timbrado.png`
- Versões necessárias do logo (Designer extrair/limpar):
  - `logo_full_horizontal.svg` — "UNIÃO BRASIL 44" completo, fundo transparente
  - `logo_icon.svg` — só o globo + número 44 (favicon, mobile)
  - `logo_white.svg` — versão branca pra fundo escuro
  - `header_pdf.png` — cabeçalho de PDF com logo + dados oficiais
  - `footer_pdf.png` — faixa azul/amarela do rodapé do papel timbrado

### Multi-tenant ready
A plataforma é Mazzel (white label). Cada cliente terá sua identidade. Implementação:
- Tema CSS por tenant (`--brand-primary`, `--brand-accent`, `--brand-logo-url`)
- Tenant `uniao-brasil` aplica azul/amarelo + logo UB
- Tenants futuros (PT, PSDB etc.) terão suas próprias paletas
- Topbar mantém marca Mazzel discreta no rodapé/about (atribuição)

### Papel timbrado (uso operacional)
O papel timbrado oficial UB já está no repo. Reutilizar pra:
- PDF de relatórios (estudos de campo, auditorias, dossiês exportados, prestações de contas)
- Templates DocuSign (nominata, ficha de filiação, atas)
- Cabeçalho de e-mails transacionais quando o tenant for UB

---

## Lista de entregáveis pra sessão do Claude Designer

César vai abrir uma sessão dedicada do Claude Designer pra resolver tudo. Lista do que precisa sair dessa sessão:

### Visual
- [ ] Tema CSS UB (azul + amarelo) substituindo roxo Mazzel quando tenant = UB
- [ ] Logo oficial UB em 4 variações (full horizontal, icon, branco, header PDF)
- [ ] Tela de login com branding UB (background, logo, mensagem "União Brasil 44")
- [ ] Sidebar redesenhada: agrupamento visual + lógica por perfil (9 sidebars diferentes)
- [ ] Cartinhas refinadas: harmonia tipográfica, indicador delta, estados visuais por cargo

### Dossiê personalizado por cargo
- [ ] 8 layouts de dossiê (1 por cargo: Pres / Gov / Sen / Dep Fed / Dep Est / Pref / Vereador / Não-eleito)
- [ ] Sub-medidas v9 ajustadas a cada cargo (ATV pra parlamentar ≠ ATV pra dirigente partidário)
- [ ] Fallback visual de "dado em construção" (chip explicativo, não 0 nem branco)
- [ ] Demos dummy preenchidos pra todos os 8 cargos

### Módulos administrativos (4 novos)
- [ ] Diretórios & Comissões (árvore navegável Nacional → Estadual → Municipal + ficha de nominata)
- [ ] Filiados com fluxo de abonador + assinatura digital DocuSign
- [ ] Documentos (repositório + filtros + integração DocuSign + status visual)
- [ ] Tesouraria (visível só pra cargo Tesoureiro)

### Dashboard executivo (perfil Milton-CEO)
- [ ] 3 perguntas respondidas em 3 segundos: como está? o que mudou? o que decidir?
- [ ] KPIs com delta (vs. semana, vs. mês, vs. eleição passada)
- [ ] Sentinela / Movimentações (alimenta do Radar reformulado)
- [ ] Mapa Estratégico embarcado (overview territorial)

### Mapa Estratégico (decisão 25/04)
- [ ] Substitui o Mapa Eleitoral na sidebar principal
- [ ] Foco em **operação territorial AGORA** (lideranças, candidatos eleitos, emendas, scores)
- [ ] Mapa Eleitoral existente vai pra sub-tela do módulo Estudo

### Especificação técnica (entregável final do Designer)
- [ ] Documento `.md` com:
  - Estrutura de componentes (qual componente tem qual responsabilidade)
  - Tokens de design (cores, tipografia, spacing, sombras)
  - Estados visuais (hover, active, disabled, loading, empty)
  - Mockups de cada tela (idealmente Figma export ou HTML rasterizado)
  - Lista de assets necessários (ícones, ilustrações, vídeos)

### Prioridades (ordem de execução sugerida)
1. **Tema visual UB + logo** (rápido, desbloqueia tudo)
2. **Dashboard executivo** (perfil Milton — 1ª impressão)
3. **Sidebar por perfil** (estrutura informacional)
4. **Cartinhas refinadas + dossiê personalizado por cargo** (núcleo do produto)
5. **Mapa Estratégico** (decisão recente, precisa Designer)
6. **4 módulos administrativos** (Diretórios, Filiados c/ abonador, Documentos, Tesouraria)

---

---

## 7. Universo completo de perfis (4 camadas)

Milton-Pres Estadual SP foi caso real, não regra. A plataforma cobre **muito mais perfis** porque cada nó da estrutura partidária + cada político eleito + cada equipe de gabinete tem painel próprio.

| Camada | Tipos de perfil | Volume potencial |
|--------|-----------------|---|
| 1. **Mazzel** (técnica) | Super Admin · Admin do Partido | ~10-50 pessoas |
| 2. **Política Partidária** (institucional) | 8 cargos × 3 níveis (Nacional/Estadual/Municipal) | ~44.800 cargos |
| 3. **Eletiva** (políticos + gabinetes) | 7 cargos × média 5-6 pessoas/gabinete | ~325.000 pessoas |
| 4. **Operacional de Campanha** (cascata) | Coord Regional → Coord Territorial → Cabo | variável |
| Filiado base | 1 | milhões |

**Mapa completo dos painéis:** `docs/perfis_e_paineis.md` (decisão estruturante, leitura obrigatória).

**Princípio crítico:** cada perfil tem **sidebar derivada do cargo + nível + escopo** — não menu universal filtrado. 3-8 itens por perfil, agrupados visualmente.

---

## 8. Painel Pessoal do Político = "agente de inteligência política pessoal"

Quando o político (ou alguém da equipe dele) entra na plataforma, vê o **estado-maior pessoal**. Não é filtro do painel do partido — é universo próprio.

Conteúdo (detalhe em `perfis_e_paineis.md` § Camada 3):
- Cenário Político (radar dinâmico)
- Meu Dossiê (Overall, sub-medidas, comparativo com pares)
- Agenda (pessoal + oficial + pública)
- Alianças (mapa + sugestões IA + alertas)
- Lideranças da minha região
- Estudo Político (panoramas, emendas, demografia)
- Clipping (mídia espontânea)
- Bancada / Votações (parlamentares) ou Atendimento à Base (executivos/vereadores)
- Operações em mim (quem tem campanha pra me visitar)
- Equipe de Gabinete (cadastro compartilhado: político + chefe podem adicionar)

Equipe de Gabinete tem **tipos canônicos** + opção "Outro": Chefe · Comunicação · Jurídico · Articulação · Parlamentar · Base.

---

## 9. Princípios estruturais

### A. Overall em toda a hierarquia (não só candidatos)

Hoje Overall existe pra candidato (LULA=85). Vai existir pra **toda a cadeia**: Presidente Nacional, Estadual, Municipal, Tesoureiro, Secretário, Coord Regional, Territorial, Cabo. Cada cargo tem suas sub-medidas próprias (detalhe no `modulo_operacoes.md` § Score sobe pela cascata).

**Vantagem CEO:** Milton abre painel, vê **um número** por subordinado direto. Score baixo? Clica pra investigar.

### B. Continuidade institucional (histórico do cargo, não da pessoa)

Quando muda quem ocupa um cargo (João → Maria) durante operação ativa:
- Histórico fica vinculado ao **cargo + região**, não à pessoa
- João tem score só do período em que ocupou
- Maria assume com **acesso total ao contexto** (tarefas pendentes, relatórios anteriores, próximos passos)
- Score de Maria começa a contar a partir da data que assumiu
- Comparação justa: quem performou melhor naquele cargo?

Implementação: tabela `atividade_cargo` separa QUEM executou QUANDO o QUÊ — independente de quem ocupa o cargo agora.

### C. Portabilidade de Perfil + Isolamento de Dados Estratégicos

Dados pessoais do político (dossiê público, agenda, alianças informais) **migram com ele** se trocar de partido. Estratégia confidencial do partido sobre ele **fica no tenant antigo**.

Detalhe completo: `principio_portabilidade_perfil.md`. Diferencial competitivo: alinhamento de incentivos sem trava abusiva, atende LGPD por design.

---

## 10. Módulo Operações (substitui "Campanha 2026")

Módulo central da plataforma — eterno, não vinculado a uma eleição. Cobre toda operação organizada do partido: campanhas eleitorais, cobertura territorial diária, ofensivas administrativas, mobilizações.

**Arquitetura Facebook Ads aplicada:**
- Campanha (objetivo) → Configuração (público no mapa + prazo + recursos) → Tarefas (ações concretas) → Score
- Cascata de delegação (Pres Nacional → Pres Estadual → Pres Municipal → Coord Regional → Coord Territorial → Cabo)
- Mapa Estratégico como base visual de todas as operações
- Score sobe pela cascata em tempo real

**Cabo Eleitoral integrado** — não é mais módulo separado na sidebar, vira o último nível dentro de Operações.

Detalhe completo: `docs/modulo_operacoes.md`.

---

## 11. Módulo Chat evoluído (Discord-style)

O Chat existente vai evoluir pra cobrir 2 modos:

**Permanente** — conversas 1-1 e grupos, texto + mídia, histórico preservado, uso cotidiano.

**Sigiloso (durante operações sensíveis)** — salas de áudio (voz tempo real), canais auto-criados por campanha, mídia com **visualização única** (Snapchat-style), watermark obrigatório (anti-leak), apaga ao concluir operação, modo radio (push-to-talk pra cabos em campo).

**SOS pro cabo:** botão grande de emergência → notifica Coord Territorial + Pres Municipal imediatamente.

Detalhe completo: `docs/modulo_operacoes.md` § Comunicação interna.

---

## 12. Sistema de IDs + Convites (Discord-style aplicado à política)

**Princípio do César:** "Cada painel tem seu ID. Precisa pensar como as pessoas vão adicionar as pessoas, como fazemos no Discord. Apesar da complexidade enorme, navegação precisa ser de forma intuitiva."

### Cada entidade da plataforma tem ID único

| Entidade | Formato sugerido do ID | Exemplo |
|----------|------------------------|---------|
| **Tenant (Partido)** | `tenant:slug` | `tenant:uniao-brasil` |
| **Diretório Nacional** | `dir:tenant:nacional` | `dir:ub:nacional` |
| **Diretório Estadual** | `dir:tenant:UF` | `dir:ub:sp` |
| **Diretório Municipal** | `dir:tenant:UF:cod_ibge` | `dir:ub:sp:3550308` |
| **Comissão Executiva** | mesmo do Diretório (1:1) | `dir:ub:sp:3550308` |
| **Cargo na Comissão** | `cargo:dir:codigo` | `cargo:dir:ub:sp:presidente` |
| **Painel Pessoal Político** | `pol:cpf` ou `pol:slug` | `pol:milton-leite` |
| **Equipe de Gabinete** | `gab:pol_id` | `gab:milton-leite` |
| **Operação** | `op:tenant:hash` | `op:ub:abc123` |
| **Sala de Chat** | `chat:contexto:hash` | `chat:op:ub:abc123` |

ID curto e legível pra ser memorável e compartilhável (estilo Discord `discord.gg/xyz`).

### Como pessoas entram em painéis (5 modos)

#### 1. Convite por link (Discord-style)
- Presidente Estadual gera link: `app.mazzelag.com/convite/dir:ub:sp:3550308?token=xyz`
- Envia por WhatsApp pro novo Sec-Geral Municipal
- Sec-Geral abre, cria conta (ou loga), aceita convite, está dentro com permissão automática
- Convite tem **expiração** configurável (24h, 7d, sem expiração) e **uso único ou múltiplo**

#### 2. Busca por CPF / Título Eleitoral
- Tesoureiro Municipal precisa adicionar Membro à Comissão
- Busca por CPF ou título → plataforma encontra a pessoa (se tem cadastro) ou oferece "convidar por e-mail"
- Atribui cargo + permissões → membro recebe notificação

#### 3. Auto-via filiação (TSE)
- Pessoa se filia ao UB no município X
- Plataforma detecta (via TSE ou cadastro próprio)
- Auto-adiciona ao Diretório Municipal X com perfil `Filiado`
- Notifica Presidente Municipal: "Novo filiado: João Silva (#abc123). Quer designar pra algum cargo?"

#### 4. Cascata de designação
- Presidente Estadual cadastra Presidente Municipal de cada cidade
- Presidente Municipal cadastra Secretários, Tesoureiros, Membros
- Presidente Municipal designa Coord Regional pras campanhas
- Coord Regional designa Coord Territorial
- Coord Territorial designa Cabos Eleitorais
- Cada designado recebe notificação + onboarding curto

#### 5. Equipe de Gabinete (cadastro compartilhado)
- Político E Chefe de Gabinete podem adicionar/remover membros
- Adicionar = busca por CPF + escolhe tipo (Comunicação/Jurídico/etc.) → permissões auto-aplicadas
- Remover = revoga acesso imediatamente

### Padrão visual de adicionar pessoas (UX)

Em qualquer tela onde se adiciona pessoa, a UI é **idêntica** (consistência cognitiva):

```
┌─────────────────────────────────────┐
│  Adicionar pessoa                   │
│                                     │
│  ○ Buscar (CPF ou e-mail)           │
│  ○ Convidar por link                │
│  ○ Designar de filiados existentes  │
│                                     │
│  [Próximo]                          │
└─────────────────────────────────────┘
```

Depois disso: passo 2 é **escolher cargo/tipo** (com permissões pré-explicadas) → passo 3 é **confirmar e enviar**. Wizard de 3 passos, sempre.

### Mapa de relações

Cada perfil tem **dashboard de relações** mostrando:
- Em quantos Diretórios está vinculado
- Quantos painéis acessa
- Quem o convidou
- Quem ele convidou
- Histórico de mudanças de cargo

Útil pra **auditoria** (quem deu acesso a quem) e pra **transparência** (cada usuário vê tudo que pode ver e por quê).

### Notificações

Sistema unificado de notificações pra reduzir fricção:
- **In-app** (sino na topbar)
- **E-mail** (transacional via SES/Resend)
- **WhatsApp** (templates aprovados — pra cabos e operações urgentes)
- **Push** (mobile, quando tiver app)

Cada usuário configura preferência por tipo de evento (convite recebido, operação designada, alerta crítico, etc.).

---

## 13. Bug crítico: Mapa Eleitoral V2 quebrado

**Diagnóstico:** o mapa eleitoral foi rebatido na V2 mal feito — não acompanha o layout da V2, perdeu navegação e perdeu as automações do MapLibre que existiam na versão preservada (V1).

**Funcionalidade perdida que mais machuca:** foto do candidato aparecendo na sidebar quando o usuário passa o mouse na região. Existe na V1, foi perdida no porte. César considera essa interação "muito foda" — núcleo da experiência.

**Direção pra Claude Code (próxima sessão):**
1. Auditar `/mazzel-preview/mapa` na V2 vs `/mapa` na preservada
2. Listar uma a uma as funcionalidades perdidas (foto-on-hover, drill-down 5 níveis, sidebar contextual, escala de cores, tabs turno, etc.)
3. Portar com cuidado — não é refazer, é trazer o que já funcionava
4. Lembrando: o **Mapa Eleitoral** vai pro **módulo Estudo** (decisão 25/04). A sidebar principal tem o novo **Mapa Estratégico** (que o Designer está desenhando). Mas o Eleitoral em si precisa estar funcional onde quer que esteja.

---

## Documentos referenciados

- Narrativa completa do projeto: `docs/BRIEFING_NARRATIVA_PROJETO.md`
- Universo completo de perfis: `docs/perfis_e_paineis.md`
- Módulo Operações + Chat evoluído: `docs/modulo_operacoes.md`
- Princípio portabilidade de perfil: `docs/principio_portabilidade_perfil.md`
- Estrutura partidária UB: `docs/UB_estrutura_partidaria.md`
- Status de dados (mock vs real): `STATUS_DADOS_V2.md` (raiz do worktree)
- Briefing original do Designer: `BRIEFING_CLAUDE_DESIGNER.md` (raiz do worktree)
- Referências do Anderson: `docs/anderson_referencias/` (modelo nominata + ficha filiação)
- Logo/papel timbrado UB: `codigo/frontend/public/branding/uniao-brasil/papel_timbrado.png`
