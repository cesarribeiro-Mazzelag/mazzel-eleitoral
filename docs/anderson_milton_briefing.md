# Briefing do cliente — Anderson + Milton Leite

Observações capturadas em 25/04/2026 sobre **quem decide** e **o que precisa ver** pra aprovar a plataforma. Documenta o cliente real e dirige decisões de produto, UX e priorização.

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

## Documentos referenciados

- Narrativa completa do projeto: `docs/BRIEFING_NARRATIVA_PROJETO.md`
- Estrutura partidária UB: `docs/UB_estrutura_partidaria.md`
- Status de dados (mock vs real): `STATUS_DADOS_V2.md` (raiz do worktree)
- Briefing original do Designer: `BRIEFING_CLAUDE_DESIGNER.md` (raiz do worktree)
- Referências do Anderson: `docs/anderson_referencias/` (modelo nominata + ficha filiação)
- Logo/papel timbrado UB: `codigo/frontend/public/branding/uniao-brasil/papel_timbrado.png`
