# BRIEFING DE REDESIGN - Plataforma Mazzel Inteligência Eleitoral

**Origem:** Pesquisa conduzida pelo Claude do Browser a pedido do Cesar.
**Data:** 2026-04-19
**Status:** Em recebimento (Cesar vai mandando em partes - vai atualizando este arquivo).
**URL base:** http://localhost:3002

> ⚠️ ESTE ARQUIVO É REFERÊNCIA DE DESIGN. Ler ANTES de mexer em qualquer módulo interno da plataforma.

---

## Contexto de Produto

Plataforma B2B vendida por licença (por partido, estado, candidato). Usuário-raiz (Presidente) tem visão de TODOS os dados do país - equivale a CEO com todos os partidos trabalhando para ele. Licenciados terão visão recortada pelo escopo.

Cards de alta qualidade já entregues: CardCandidato.tsx e CardPartido.tsx (dark theme, gradientes por cor de partido, OVR box glassmorphism, bandeiras oficiais). Interior da plataforma precisa evoluir para o mesmo nível.

---

## Módulos (menu atual)

**INTELIGÊNCIA:**
- Visão Geral - dashboard macro (panorama nacional)
- Mapa Eleitoral - drill-down Brasil → Estado → Município → Bairro
- Radar Político - grid CardPartido + CardCandidato

**OPERACIONAL (portal por usuário):**
- Suplentes - candidatos que quase foram eleitos (alto valor estratégico)
- Coordenadores
- Lideranças
- Cabos Eleitorais
- Delegados

**GESTÃO:**
- Filiados - CRM saúde da base filiada
- Alertas - notificações por gatilhos configuráveis
- Relatórios - relatórios + área de estudo/análise

**SISTEMA:**
- Glossário
- Admin
- Config

Usuário logado: Cesar Ribeiro | Role: Presidente (visão total do país).

---

## 1. Decisão global: MODO CLARO PADRÃO + DARK OPCIONAL + WHITE-LABEL

**Correção 19/04/2026** (decisão do Cesar): produto é **white-label** vendido por licença (por partido/estado/candidato). Cada partido vai "colar a lábel" com sua identidade de cores. Por isso:

- **Modo claro é o padrão** - base neutra que aceita o brand color de qualquer partido
- **Modo dark é opcional** (toggle no perfil do usuário) - preferência pessoal
- **Brand color é variável** via CSS var `--brand-primary` configurável por tenant/partido

### Design tokens (CSS vars)

**Modo claro (padrão):**
```css
--bg-primary:       #FAFAFA   (fundo de página)
--bg-card:          #FFFFFF   (fundo de card/painel)
--bg-elevated:      #F4F4F5   (hover state / modal)
--border-subtle:    rgba(0,0,0,0.06)
--border-default:   rgba(0,0,0,0.10)
--text-primary:     #0A0A0A
--text-secondary:   #52525B
--text-muted:       #A1A1AA
```

**Modo dark (toggle):**
```css
--bg-primary:       #0D0F1A
--bg-card:          #1A1D2E
--bg-elevated:      #232640
--border-subtle:    rgba(255,255,255,0.06)
--border-default:   rgba(255,255,255,0.10)
--text-primary:     #FFFFFF
--text-secondary:   rgba(255,255,255,0.65)
--text-muted:       rgba(255,255,255,0.40)
```

**Brand white-label (configurável por tenant/partido):**
```css
--brand-primary:    #7C3AED   /* ⭐ DEFAULT do produto em desenvolvimento
                                  (Mazzel violet). Cliente final sobrescreve
                                  com sua cor ao contratar. */
--brand-hover:      (derivado - 10% mais escuro)
--brand-soft:       (derivado - 95% claro pra backgrounds)
--accent-orange:    #F97316   /* destaque KPI - cross-tenant */
```

> **⚠️ Nessa fase de desenvolvimento usar SEMPRE `#7C3AED` (Mazzel violet).** As cores de partidos abaixo são referência de **como o white-label vai funcionar no cliente final** — não aplicar em elementos UI do produto-base. Elementos que já usam cores de partido (CardPolitico/CardPartido) seguem a cor do partido do candidato, isso é correto.

**Semânticos (mesmo em ambos modos):**
```css
--success:  #10B981
--warning:  #F59E0B
--error:    #EF4444
--info:     #3B82F6
```

### Exemplo de tenants (referência)

| Partido | brand-primary |
|---------|---------------|
| União Brasil | #005BAC (azul) |
| PT | #C8102E (vermelho) |
| PSDB | #005BAC (azul) |
| MDB | #0A9E5A (verde) |
| PL | #002776 (azul escuro) |
| Mazzel (demo/sem tenant) | #7C3AED (violet) |

Essas cores já estão em `components/radar/CardPolitico.jsx` e `CardPartido.jsx`, precisam ser extraídas pra CSS vars globais por tenant.

### Glassmorphism (cards especiais - funciona em ambos modos)
```css
/* modo claro */
background: rgba(255,255,255,0.7);
border: 1px solid rgba(0,0,0,0.06);
backdrop-filter: blur(12px);

/* modo dark */
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
backdrop-filter: blur(12px);
```

---

## 2. Sidebar - Rail persistente (primeira implementação)

### Problema atual
- Overlay full-screen cobre 100% do conteúdo
- Quando fechada, desaparece - usuário perde orientação
- Hamburger no canto não transmite hierarquia

### Solução: Rail icon-only + expansão on hover/pin

**Comportamento:**
- Colapsada: 64px (sempre visível)
- Expandida: 240px (hover OU clique no pin)
- Conteúdo principal é **empurrado** (não coberto) - margin-left dinâmico
- Item ativo: highlight com `--accent-purple` + barra vertical esquerda 3px
- Tooltip on hover quando colapsada
- Transition: 200ms ease-in-out

### Estrutura visual

```
┌─────────────────────────────────────┐
│  [M] MAZZEL                         │  logo (colapsa só M)
│  INTELIGÊNCIA ELEITORAL             │
├─────────────────────────────────────┤
│  — INTELIGÊNCIA —                   │
│  📊 Visão Geral                     │
│  🗺  Mapa Eleitoral                  │
│  🎯 Radar Político                  │
├─────────────────────────────────────┤
│  — OPERACIONAL —                    │
│  🏛  Suplentes                       │
│  📍 Coordenadores                   │
│  🔗 Lideranças                      │
│  ⚡ Cabos Eleitorais                │
│  👥 Delegados                       │
├─────────────────────────────────────┤
│  — GESTÃO —                         │
│  📖 Filiados                        │
│  🔔 Alertas                         │
│  📄 Relatórios                      │
├─────────────────────────────────────┤
│  — SISTEMA —                        │
│  ❓ Glossário                       │
│  🛡  Admin                           │
│  ⚙️  Config                          │
├─────────────────────────────────────┤
│  [avatar] Cesar Ribeiro             │
│           Presidente [logout]       │
└─────────────────────────────────────┘
```

### CSS raiz
```css
body { display: flex; }
.sidebar {
  width: 64px;
  min-height: 100vh;
  background: #1A1D2E;
  border-right: 1px solid rgba(255,255,255,0.06);
  transition: width 200ms ease-in-out;
  flex-shrink: 0;
}
.sidebar.expanded { width: 240px; }
.main-content {
  flex: 1;
  min-width: 0;
  background: #0D0F1A;
}
```

---

## 3. Visão Geral (Dashboard) - Redesign completo

### Problema atual
- Fundo branco genérico - parece relatório PDF
- KPIs importantes (70.968 eleitos, 5.568 municípios) enterrados após 3 scrolls
- Seções sem hierarquia visual
- Gráficos em coluna única - desperdiça espaço horizontal

### Novo layout (top → bottom)

**Header:**
```
"Panorama Político Nacional"  [filtro: 2024 Mun | 2022 Geral | Ambos]  [⟳]
"Visão consolidada · dados TSE · atualizado em DD/MM/YYYY"
```

**Hero KPI Row** (above the fold, 6 cards grandes):
- Grid 3×2 ou 6×1 responsivo
- Background: `rgba(255,255,255,0.04)` + border glassmorphism
- *[continua - Cesar vai mandar mais partes]*

---

---

## 4. Componentes aprovados (zona protegida) - mostrar pro Claude Design como baseline

Esses componentes já têm **design aprovado e validado pelo Cesar**. O Claude Design pode **propor evolução**, mas o baseline é esse. Se a proposta for melhor, avaliamos. Coerência visual entre todos os módulos é obrigatória - **o site precisa ter UM design só**.

### 4.1 CardPolitico (radar/dossiê/hero)

**Arquivo**: `codigo/frontend/components/radar/CardPolitico.jsx`

- **Proporção**: 204×360 (default) ou 240×422 (hero do dossiê)
- **Fundo**: gradiente 3-stop vertical usando cores oficiais do partido do candidato (a→a 65%→b 100%)
- **OVR box** (top-left 50×52): glassmorphism escuro com tint do tier (dourado/ouro/prata/bronze), número grande 22px font-black, label "OVR" 8.5px tracking widest
- **Bandeira UF** (top-right 36×26): SVG oficial da Wikimedia, fundo branco, arredondada
- **Foto do candidato** (5/7 do card): object-cover, object-position center top, lazy load
- **Fade layer**: gradient transparent→cor do partido pra suavizar transição foto→info
- **Info section** (1/4 inferior, transparente sobre o gradiente):
  - Stripe cromático 28×2 (accent da cor do partido)
  - CARGO uppercase tracking 2.5px
  - NOME font-black adaptativo (14-22px conforme comprimento)
  - Stats box com 6 atributos (VOT/FID/EFI/INT/ART/TER) em grid flex
  - Chip branco com logo do partido + "VOTOS 2024: 53.453"
- **Moldura interna dupla**: outer 1px na cor do partido + inner 2px rgba(255,255,255,0.12)

### 4.2 CardPartido (radar)

Mesma linguagem visual do CardPolitico mas com **logo oficial do partido em destaque** + dados agregados do partido (total eleitos, % vagas, OVR de partido em 7 dimensões ATQ/MEIO/DEF/COESAO/FIN/TRADICAO/MOMENTUM).

### 4.3 Sidebar do mapa (preview de município)

**Arquivo**: `components/map/BarraLateral.tsx` → `SidebarHoverPreview` e `CardPreviewCandidato`

Elementos essenciais que Cesar **aprovou expressamente**:
- Foto circular do candidato (38-44px) com **borda na cor do partido**
- Nome em tipografia legível (não pode ser cortado excessivamente)
- Chip com **sigla do partido + número da legenda** (ex: "PL · 22")
- **Barra de progresso** horizontal na **cor oficial do partido**
- Número absoluto de votos + **percentual** (ex: "113.271 votos · 51,08%")
- Badge "Eleito" quando aplicável (verde emerald)

Esse padrão é **referência pra qualquer lista de candidatos no produto inteiro**.

### 4.4 Sistema de cores oficiais de partido (lógica aprovada)

22 partidos mapeados com 3 cores cada: **a** (dominante), **b** (secundária), **accent** (detalhe).
O CardPolitico usa `a + b` como gradiente; linha de destaque e chips usam `accent`.

**Paleta completa:**

| Sigla | a | b | accent | Notas |
|---|---|---|---|---|
| PT | #C8102E | #8B0A1A | #FFDD00 | vermelho + amarelo |
| PSDB | #005BAC | #F5C500 | #005BAC | azul + amarelo |
| MDB | #0A9E5A | #F5C500 | #0A9E5A | verde + amarelo |
| PSD | #F39200 | #005BAC | #F39200 | laranja + azul |
| PL | #002776 | #F5C500 | #F5C500 | azul marinho + amarelo |
| REPUBLICANOS | #00874C | #0055A4 | #F5C518 | verde + azul |
| PSC | #00874C | #005BAC | #F5C518 | verde + azul |
| PSL | #005BAC | #00984C | #F5C518 | sem vermelho |
| PDT | #E30613 | #005BAC | #F5C518 | vermelho + azul |
| NOVO | #F39200 | #1A1A1A | #F39200 | laranja + preto |
| DEM | #005BAC | #00984C | #F5C518 | extinto mas histórico |
| PATRIOTA | #00984C | #F5C518 | #005BAC | verde |
| PP | #005BAC | #00984C | #F5C518 | azul + verde |
| PSOL | #E30613 | #F5C518 | #F5C518 | vermelho + amarelo |
| PSB | #FFDD00 | #005BAC | #005BAC | amarelo forte |
| UNIÃO | #005BAC | #F5C518 | #E30613 | azul + amarelo + vermelho |
| AVANTE | #005BAC | #00984C | #F5C518 | |
| SOLIDARIEDADE | #E30613 | #F5C518 | #005BAC | |
| CIDADANIA | #E30613 | #FFFFFF | #005BAC | |
| PTN / fallback | #334155 | #64748B | #94A3B8 | cinza neutro |

### 4.5 Tiers do Overall (cartinha gamificada)

| Tier | Overall | Border/Accent | Aplicação |
|---|---|---|---|
| Dourado | 85+ | #F5C518 + glow 60% | OVR glass + label |
| Ouro | 75-84 | #F5C518 + glow 55% | idem |
| Prata | 65-74 | #CBD5E1 + glow 55% | idem |
| Bronze | <65 | #CD7F32 + glow 60% | idem |

### 4.6 Traits políticos formais (zero gamer)

REELEITO / ESTREANTE / MAIS VOTADO / VIROU O JOGO / HEGEMÔNICO / ASCENDEU
Chips coloridos (um por trait) mostrados no Raio-X do dossiê e no card.

---

## 5. Limitações técnicas (contexto pro Claude Design)

### 5.1 Fotos dos candidatos (TSE)

- Fonte única: **TSE (Tribunal Superior Eleitoral)**. Público oficial, sem alternativas.
- **Qualidade variável**: resoluções de 150×200 até 800×1200. Sem padronização.
- **Fundos diversos**: branco, cinza, azul genérico, degradê, ambiente aleatório, foto tirada de carteira de identidade, screenshot recortado.
- **Enquadramento inconsistente**: meio corpo, rosto + ombros, retrato inteiro, foto 3×4.
- **Iluminação e cor**: sombras fortes, dominantes azuladas, contraste ruim, pele lavada.
- **Soluções aplicadas no card**: fundo em gradiente da cor do partido tapa a diferença; fade layer suaviza transição; OVR glass fica sobre a foto (não depende dela).

**Recomendação pro Claude Design**: qualquer novo layout precisa **aceitar fotos ruins como entrada**. Não assumir fotos profissionais ou crops padronizados. Bom exemplo: revistas esportivas que usam crops desleixados com filtros/gradientes cobrindo.

### 5.2 Logos de partidos

- 49 logos em `/public/logos/partidos/{SIGLA}.png`
- Resolução variável, maioria 200-400px
- Fundo transparente (PNG), mas nem todos
- Normalização: `absLogo` faz `toUpperCase().normalize("NFD").replace(acentos).replace(espacos)` pra casar "UNIÃO" → `UNIAO.png`

### 5.3 Bandeiras de UF

- 28 SVGs baixados localmente em `/public/bandeiras/{UF}.svg`
- Fonte: Wikimedia Commons (oficial)
- Tamanhos variam de 250 bytes (Acre) a 350KB (Rio Grande do Sul)

### 5.4 Escalas dos atributos (0-99, estilo FIFA)

Cada dimensão 0-99 ou null. Nunca usar 50 neutro pra faltante (daria ideia de avaliação real sendo média). Se não tem dado, exibir "—".

---

## 6. Sidebar do mapa - padrão visual aprovado

Usar como referência obrigatória pra QUALQUER lista de candidatos/partidos no produto.

**Layout de card de candidato na sidebar** (70-80px altura, horizontal):
- 40×40px avatar circular com border 2px na cor do partido
- Nome (text-sm font-bold) até 2 linhas
- Chip "PL · 22" (sigla + número legenda)
- Barra de progresso horizontal 4px altura, cor do partido, com glow sutil
- `113.271 votos · 51,08%` (tabular-nums)
- Badge "Eleito" quando aplicável

**Cesar aprovou expressamente este padrão.** Claude Design pode propor evolução mas tem que preservar:
- Foto redonda com border cor partido
- Nome legível (nunca truncar <15 chars)
- Sigla + número da legenda
- Barra cor partido com votos absolutos + percentil

---

## PARTES PENDENTES (aguardando resto do briefing)

- Detalhes do Hero KPI Row (6 cards)
- Restante do layout do Dashboard
- Mapa Eleitoral (refinamentos de design) - Cesar gosta da sidebar atual
- Radar Político (redesign do grid)
- Suplentes, Coordenadores, Lideranças, Cabos, Delegados
- Filiados (CRM)
- Alertas (configuração de gatilhos)
- Relatórios + Área de estudo
- Glossário
- Admin / Config

## Referências externas pra Claude Design analisar

- **Globo.com apuração eleitoral** - drill-down, sidebar de município, tooltip rico (inspiração principal do mapa)
- **Stripe Dashboard** - cards KPI dark + glassmorphism
- **Linear** - sidebar rail + dark/light toggle
- **Vercel Analytics** - hero metrics + densidade
- **Serasa / Bureau de crédito** - inspiração do layout do dossiê (ficha de análise)
- **FIFA Ultimate Team** - cartinha do candidato (inspiração visual, sem linguagem gamer)
- **Pentagon briefing** - insígnias de cargo (Presidente/Governador/Prefeito/Senador/Dep/Vereador com metais)
