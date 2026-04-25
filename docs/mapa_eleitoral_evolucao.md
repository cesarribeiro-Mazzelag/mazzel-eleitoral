# Mapa Eleitoral — Evolução pra produção

Documento focado em **pra onde o mapa precisa evoluir** pra dar o salto de produto-em-desenvolvimento pra produto-em-produção. O conceito de navegação atual é forte; este doc lista o que aprimorar e como expandir.

> Atualizado em 25/04/2026 (noite). Ler depois de testar `/mazzel-preview/mapa` — o componente completo `components/map/MapaEleitoral.tsx` (3.196 linhas) está agora ativo na rota.

---

## O que já está pronto e funciona

Conceito de navegação aprovado pelo César — não mexer na essência:

1. **Drill-down hierárquico em 5 níveis:** Brasil → UF → Município → Bairro → Escola/Zona
2. **Foto do candidato no hover** (sidebar atualiza em tempo real ao passar mouse na região) — interação destacada como núcleo da experiência
3. **Sidebar contextual dinâmica** (8 conteúdos diferentes: Brasil, Estado, Município, Partido, Candidato, Bairro, MicroRegião, Comparação)
4. **Tabs Turno** (1T / 2T / Total) com auto-switch quando cargo+ano tem 2º turno
5. **Tooltip X9 estilo Globo G1** mostrando competidor em nível 0 (cor complementar)
6. **Cores por partido dominante** (cada município pinta com cor do vencedor)
7. **Escala Farol percentil 0-5** (azul/verde/amarelo/vermelho — semântica)
8. **Breadcrumb clicável** (Brasil > SP > São Paulo > Sé) — navegação reversa fácil
9. **Microbairros SP** (1.795 polígonos via HERE+OSM, 1.073 Voronoi suavizados)
10. **Comparativo de zonas eleitorais** dentro do município
11. **11 endpoints integrados** (`/mapa/farol`, `/mapa/estado/*`, `/mapa/municipio/*/top2`, etc.)
12. **MapLibre GL JS** como engine (open-source, performance vetorial)

---

## Onde o produto precisa dar o salto

### A. Performance pra produção

O mapa hoje funciona bem com filtros aplicados. Em produção, com **1.053.427 candidatos** e **5.570 municípios × 4 ciclos × 8 cargos**, alguns gargalos vão aparecer:

| Gargalo | Solução |
|---------|---------|
| Render de 5.570 polígonos municipais | **Vector tiles** (Mapbox MTS ou OpenMapTiles auto-hospedado). MapLibre tem suporte nativo |
| Hover preview disparando fetch a cada movimento de mouse | **Debounce 200ms** + **prefetch** dos top 10 municípios visíveis |
| Carregamento de microbairros SP no zoom alto | **Lazy loading por viewport** (carrega só o que está visível) |
| Re-render do mapa ao trocar cargo/ano | **Layer switching** sem recriar mapa (`map.setLayoutProperty`) |
| Cache de fotos de candidatos | **CDN + WebP + lazy load** (img loading="lazy" + `srcset` responsivo) |

**Métrica-alvo:** First Contentful Paint < 1s; interação fluida em laptop médio (não-gaming) com 60fps no pan/zoom.

### B. Camadas estratégicas (sobre o mapa eleitoral existente)

O mapa hoje mostra dados **históricos** do TSE. Pra virar **ferramenta de comando** precisa receber camadas que respondem "o que está acontecendo AGORA":

| Camada | O que mostra | Conexão com módulo |
|--------|--------------|---------------------|
| **Lideranças ativas** | Onde tem Comissão Municipal funcionando + cor por score do presidente local | Diretórios |
| **Eleitos atuais** | Pontos por município com bandeira do partido vencedor + foto do eleito | Dossiês |
| **Emendas executadas** | Heat map de R$ por região + nome do parlamentar autor | Estudo |
| **Score Overall consolidado** | Cor por município reflete score médio dos cargos administrativos UB | Operações |
| **Operações ativas** | Pontos pulsantes nas regiões com campanha rodando + cor por status (verde=no prazo, amarelo=atenção, vermelho=atrasado) | Operações |
| **Adversários (zonas competitivas)** | Hatching/bordas em municípios dominados por outros partidos com chance de virar | Radar Político |
| **Filiados novos (últimos 30d)** | Bolinhas crescentes onde teve onda de filiação | Filiados |

**UX:** toggle de camadas no canto inferior direito (estilo Google Maps) — usuário liga/desliga. Combinações geram **visões executivas**: ex: "Mostrar lideranças + eleitos + emendas" = visão estratégica completa.

### C. Modo comparativo

Hoje vê 1 cenário por vez. Em produção precisa comparar:

- **2 anos lado a lado** (split view) — 2018 vs 2022, ver evolução
- **2 partidos lado a lado** — UB vs PSD em SP
- **2 cargos lado a lado** — Presidente vs Governador, ver onde houve voto cruzado
- **Modo "fade temporal"** — animação de slider (2014 → 2018 → 2022 → 2024) mostrando evolução visual
- **Diff map** — uma camada subtrai outra (votos UB 2024 - 2020 = onde cresceu/perdeu)

### D. Tooltips ricos com ação rápida

Hoje o tooltip mostra dados. Pode evoluir pra **mini-card com ação**:

```
┌─────────────────────────────────┐
│  [foto]  TARCÍSIO DE FREITAS    │
│          Governador SP · 96 OVR │
│          13.480.643 votos       │
│  ─────────────────────────────  │
│  [ Ver dossiê ]  [ Designar  ]  │
│                  [ visita     ]  │
└─────────────────────────────────┘
```

Botões abrem o dossiê do político ou criam tarefa de Operação direto do mapa. **Reduz fricção** de 5 cliques pra 2.

### E. Mobile-first pra Cabo Eleitoral e Coordenadores em campo

O mapa atual é desktop. Pra cabo em campo precisa:

- **Bottom sheet** em vez de sidebar lateral
- **Gestos** (pinch zoom, swipe pra navegar entre níveis)
- **Modo offline** com mapa cached (cabo perde sinal no interior)
- **GPS auto-localizar** (botão "minha posição" centraliza no usuário)
- **Modo simples** (visualização reduzida — só território do cabo, sem sobrecarga)

### F. Integração com módulo Operações

**Desenhar campanha no mapa** — ferramenta-chave do módulo Operações que precisa do mapa como base:

- Modo "desenhar área" (raio, polígono livre, multi-seleção bairros, zonas eleitorais)
- Modo "designar tarefa" (clique num ponto → abre wizard de tarefa)
- Visualização "operações ativas no mapa" (camada sobreposta com status visual)
- Heat map de **conclusão de tarefas** (verde escuro = 100% concluído, amarelo = parcial, cinza = sem ação)

### G. Ações executivas direto do mapa

Pro perfil **Milton-CEO** (Presidente Estadual SP), o mapa precisa permitir tomar decisão sem sair dele:

- Click direito num município → "Ver Comissão Municipal", "Designar campanha aqui", "Pedir relatório", "Substituir presidente municipal"
- Seleção múltipla → ações em lote ("Enviar mensagem a todos os presidentes municipais selecionados")
- Heat map de score → identificar visualmente onde está o problema
- Alertas no mapa (pontos vermelhos pulsantes onde tem ocorrência crítica — ex: prefeito ficou inelegível)

### H. Acessibilidade e inclusão

Lembrando da regra "analfabeto funcional digital":

- **Modo simplificado** opcional (só Brasil → UF, sem drill-down profundo)
- **Tour interativo** na primeira vez (highlights + explicações)
- **Linguagem leiga** nos tooltips ("Aqui o partido teve poucos votos em 2022" em vez de "Score percentil 1.2")
- **Alto contraste** pra visões diurnas externas
- **Leitor de tela** (ARIA labels nos polígonos, breadcrumb anunciado)

### I. Onboarding e descoberta

- **Tour de 4 passos** na primeira visita (1: como navegar, 2: como filtrar, 3: como comparar, 4: como tomar ação)
- **Tooltip de "você sabia?"** ocasional (educa sobre features avançadas)
- **Atalhos de teclado** documentados (`?` mostra cheat sheet)
- **Histórico de navegação** (botões voltar/avançar como browser)

### J. Customização por perfil

Cada perfil RBAC vê o mapa **focado no que faz sentido pra ele**:

| Perfil | Default ao abrir |
|--------|------------------|
| **Super Admin Mazzel** | Brasil completo, todos partidos, modo comparação tenants |
| **Presidente Nacional** | Brasil, foco no UB, camadas estratégicas |
| **Presidente Estadual** | UF dele, drill habilitado até bairro, lideranças ativas |
| **Presidente Municipal** | Município dele, microbairros, eleitos vereadores |
| **Coord Regional** | Região dele com operações ativas em destaque |
| **Coord Territorial** | Microterritório com cabos sob ele plotados |
| **Cabo Eleitoral** | Mapa simplificado mobile-first, GPS auto |
| **Político eleito** | Município/UF de eleição, foto dele em destaque |
| **Filiado** | Município de filiação, info pública |

---

## Como integrar com os outros mapas

Decisão 25/04 manhã: vai existir mais de um mapa na plataforma. Cada um com propósito diferente, mas **mesma base técnica** (componente `MapaEleitoral.tsx` reutilizado com props/modos):

| Mapa | Rota | Foco | Base técnica |
|------|------|------|--------------|
| **Mapa Estratégico** (NOVO, sidebar principal) | `/mazzel-preview/mapa` | Operação territorial AGORA — equipe, lideranças, eleitos, emendas, scores | `MapaEleitoral` + camadas estratégicas habilitadas + camadas históricas desabilitadas |
| **Mapa Eleitoral** (existente, vai pra sub-tela do Estudo) | `/mazzel-preview/estudo/mapa-eleitoral` | Histórico TSE — votação por município/zona/escola | `MapaEleitoral` em modo histórico (atual) |
| **Mapa do Cabo** | `/mazzel-preview/cabo/mapa` | Microterritório do cabo, GPS auto | `MapaEleitoral` em modo simplificado mobile + GPS |
| **Mapa de Operações** (dentro do módulo Operações) | `/mazzel-preview/operacoes/{id}/mapa` | Ferramenta de desenho de campanha | `MapaEleitoral` em modo edição com toolbar de desenho |

**Princípio:** **um único componente core**, modos diferentes via props. Evita duplicação e garante consistência visual/UX.

---

## Pra o Designer entregar

Lista do que produzir nesta sessão dedicada (alinhado com lista geral do `anderson_milton_briefing.md`):

### Refinamentos visuais
- [ ] Atualizar paleta pra azul/amarelo UB (substitui roxo Mazzel) na sidebar do mapa
- [ ] Tooltip de hover com mini-card rico (foto + nome + score + ações)
- [ ] Toggle de camadas (canto inferior direito, estilo Google Maps)
- [ ] Modo escuro opcional (mapa básico em dark, polígonos com cores ajustadas)
- [ ] Estados visuais consistentes (hover, selected, disabled, loading)

### Camadas estratégicas (definição visual)
- [ ] Mockup de cada camada (lideranças, eleitos, emendas, scores, operações, adversários, filiados novos)
- [ ] Iconografia (símbolos pra cabos, lideranças, eventos)
- [ ] Heat map (gradiente de cor por intensidade)

### Modos novos
- [ ] Split view comparativo (UI de divisão de tela)
- [ ] Modo desenho (toolbar lateral com ferramentas)
- [ ] Modo mobile (bottom sheet, gestos, GPS)
- [ ] Modo simplificado (visão CEO sem drill-down profundo)

### Onboarding e UX
- [ ] Tour de 4 passos (mockups das overlays)
- [ ] Cheat sheet de atalhos de teclado
- [ ] Linguagem dos tooltips (rewording leigo)

### Especificação técnica
- [ ] Documentar como `MapaEleitoral` recebe props pra cada modo (Estratégico/Eleitoral/Cabo/Operações)
- [ ] Documentar tokens de cor para cada camada
- [ ] Documentar gestos mobile esperados

---

## Referências de mercado

Estudar antes de redesenhar (todas têm features inspiradoras):

- **Globo G1 Eleições** — drill-down + tooltip + cores semânticas (inspiração original)
- **NYTimes Election Maps** — narrativa visual + animação temporal
- **The Economist** — densidade alta de dados sem poluição visual
- **Mapbox Showcase** — performance + camadas + interação fluida
- **Foursquare City Guide** — heat map + descoberta + bottom sheet mobile
- **Strava Heatmap** — modo descoberta + filtros visuais
- **Google Maps + Apple Maps** — gestos + GPS + offline + bottom sheet

---

## Decisões já tomadas (não revisar — Designer respeita)

- ✅ MapLibre GL JS como engine (open-source, sem lock-in Mapbox)
- ✅ Drill-down 5 níveis aprovado
- ✅ Foto-on-hover na sidebar é experiência-núcleo
- ✅ Cores semânticas (farol percentil 0-5)
- ✅ Mapa Estratégico vai pra sidebar principal; Mapa Eleitoral vai pro Estudo
- ✅ Componente `MapaEleitoral.tsx` é a base — não reescrever do zero
- ✅ Microbairros SP via HERE+OSM (1.795 polígonos) — não regressar pra Voronoi puro
- ✅ Card V2 4:5 do político no hover preview (zona protegida)

---

## Decisões em aberto (Designer pode propor)

- Default zoom inicial (Brasil completo? UF do usuário? Município do usuário?)
- Posição da sidebar (esquerda/direita/fechada por padrão)
- Comportamento ao clicar duas vezes (zoom in? abrir dossiê?)
- Atalhos de teclado canônicos
- Como apresentar camadas combinadas (todas visíveis? carrossel? pills?)
- Bottom sheet mobile (snap points, comportamento ao deslizar)
- Tema escuro (vale a pena agora ou pode ficar pra depois?)

---

## Visão de produção

Quando o produto entrar em produção real (set/2026 estimado):

- **Performance:** 100k usuários simultâneos, mapa carregando em < 2s
- **Escala:** vector tiles cacheados em CDN global (CloudFront ou Cloudflare R2)
- **Disponibilidade:** 99.9% uptime, fallback gráfico quando MapLibre falha
- **Multi-tenant:** mapa preserva customizações por tenant (branding UB azul/amarelo, mas outros partidos terão suas paletas)
- **Offline-first** pro Cabo Eleitoral (PWA com Service Worker + IndexedDB)
- **Auditoria:** toda interação no mapa loga ação (quem viu o quê, quando, por que)
- **Telemetria:** heatmap de uso (onde os usuários clicam mais? quais filtros são usados? quanto tempo ficam?)
- **AB testing:** testar variações de UI sem deploy (LaunchDarkly ou Statsig)

---

## Documentos relacionados

- `docs/perfis_e_paineis.md` — quem usa o mapa em cada nível
- `docs/modulo_operacoes.md` — como o mapa é base visual de Operações
- `docs/anderson_milton_briefing.md` § 13 — correção do bug + decisões pendentes
- `STATUS_DADOS_V2.md` — estado real dos endpoints do mapa (todos REAL)
- `BRIEFING_NARRATIVA_PROJETO.md` § Mapa Eleitoral — histórico desde 12/04
- [[Decisao - Plano Mapa Eleitoral]] (Cérebro)
- [[Decisao - Refinamento Mapa V1]] (Cérebro)
- [[Decisao - Mapa Estrategico vs Mapa Eleitoral 2026-04-25]] (Cérebro)
- [[Decisao - MapLibre dois modos historico futuro 2026-04-25]] (Cérebro)
