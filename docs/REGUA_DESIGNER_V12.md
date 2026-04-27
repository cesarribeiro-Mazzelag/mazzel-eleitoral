# Régua Designer V1.2 vs V2 portado

> **Propósito:** inventário formal do que Claude Designer entregou (16 telas hi-fi + sistema), auditoria honesta dos meus 9 ports e priorização de fixes. Antes de mexer em mais código, esta régua é a fonte da verdade.

> Atualizado em 27/04/2026, depois do feedback "tipografia pesada / aproximação descuidada".

---

## A. Sistema transversal (RESUMO_EXECUTIVO.md)

### A.1 Tipografia oficial (regra geral)
- **Bebas Neue** — display + dados grandes (KPIs hero da F2 Cartinha, F4 Saúde Nominatas, F3 Operações sub-views, INDEX hero)
- **Inter** — UI body + headlines de seção (Variação A do Dashboard Milton, todos os labels, sidebar)
- **JetBrains Mono** — IDs, timestamps, OVR de candidato, hashes de operação

**Regra prática:** se é número grande de "marca" (KPI hero, OVR card 4:5, big number Saúde) = Bebas. Se é número de UI (KPI dashboard, badge, contador) = Inter weight 800. Se é ID/hash/tempo = JetBrains Mono.

### A.2 Pesos canônicos
| Uso | Peso |
|---|---|
| Eyebrow / greet | **500** |
| Label uppercase | **600** |
| Card title (h3 12px) | **700** |
| Headline / KPI value | **800** |
| Bebas Neue | **400 padrão** (Bebas só tem um peso) |

### A.3 Letter-spacing
| Uso | Tracking |
|---|---|
| Headline / KPI value | **-0.025em** |
| Card title | **0.02em** |
| Label uppercase pequeno (10-11px) | **0.08em** |
| Hint card / metadata | **0.10em** |
| Eyebrow muito pequeno | **0.16em** |

### A.4 Linguagem (CRÍTICO)
- **Telas sigilosas** (Emendas + Saúde Nominatas) — linguagem **neutra**: "padrão atípico detectado", "concentração de origem geográfica", "pulso de filiação", "diligência aberta". **NUNCA** "fraude", "crime", "denúncia".
- **Topbar Milton-CEO** — em telas sigilosas, 3 perguntas-chave em ≤3s.
- **Cabo / campo** — linguagem direta, frases curtas, mobile-first.

---

## B. Inventário dos 16 mockups

### F1 · Fundação (2 telas)

#### F1.1 · `01-login-ub.html` — Login UB
- 2-col: brand-side (gradient azul UB + mesh + headline) + form-side
- Bebas Neue na headline "sabe onde está"
- 2FA TOTP no fluxo
- **Meu port:** `app/login/page.jsx` — feito mas tipografia não validada vs mockup

#### F1.2 · `02-sidebar-condicional.html` — Sidebar 10 perfis
- Demo page que mostra como sidebar muda por perfil
- Não é o componente real — é o spec
- **Meu port:** `Sidebar.jsx` + `sidebars.js` derivado do briefing § 7. Tipografia não auditada.

### F2 · Núcleo (3 telas)

#### F2.1 · `01-dashboard-milton-3v.html` — Dashboard Executivo Milton (3 variações)
- **Variação A · Linear** — minimalista, foco em delta. 4 KPIs hero + 3 colunas (subordinados/sentinela/decisões).
- **Variação B · Stripe** — sparklines + densidade média.
- **Variação C · Palantir** — 12 KPIs em grid + heatmap + feed live + ações.
- **Cesar 27/04 escolheu A**. Eu errei e fiz C primeiro. Agora reescrevi Variação A com tipografia exata copiada do mockup.
- **Meu port:** `Home.jsx` Variação A — tipografia corrigida valor por valor.

#### F2.2 · `02-cartinha-2v.html` — Cartinha 4:5 · 2 variações **(NÃO PORTADO)**
- Card de político 4:5 estilo Instagram
- 2 variações visuais
- Bebas Neue no OVR + insígnias + traits
- Headline 28px / weight 800 / -0.02em

#### F2.3 · `03-dossie-8cargos.html` — Dossiê 8 cargos **(NÃO PORTADO)**
- 8 cargos × seções priorizadas dinamicamente
- Motor único de seções (priority/placeholder)
- Caso âncora por cargo

### F3 · Operação (4 telas)

#### F3.1 · `01-mapa-estrategico.html` — Mapa Estratégico **(NÃO PORTADO)**
- 3 modos (operação · compliance · cobertura)
- Layout: layers à esquerda + map area
- Diferente do Mapa Eleitoral atual (que é V1)

#### F3.2 · `02-modulo-operacoes.html` — Operações
- 4 sub-views: Hub · Wizard 6 passos · Gestão Ativa Live · Relatório Final
- Estilo Facebook Ads aplicado à política
- **Meu port:** `Operacoes.jsx` — só Hub. Wizard/Live/Relatório stub.

#### F3.3 · `03-chat-evoluido.html` — Chat Discord-style
- 3 modos: permanente · sigiloso (E2EE) · SOS Cabo
- Salas áudio · watermark · visualização única
- **Meu port:** `Chat.jsx` — feito mas SEM salas áudio, watermark, visualização única.

#### F3.4 · `04-modulo-emendas.html` (+ `.app.js` + `.data.js`)
- **5 abas:** Mapa SP heatmap · Dossiê emenda 9 seções · Sankey · Inconsistências · Alertas
- Caso âncora **Santa Bárbara d'Oeste · score 92**
- 8 regras de inconsistência · 12 regras de alerta
- Topbar Milton-CEO 3 perguntas
- Linguagem **neutra**
- **Meu port:** `Emendas.jsx` — só Inconsistências + Alertas. Mapa SVG/Sankey/Dossiê stub. **SEM topbar Milton-CEO.**

### F4 · Estatutário (7 telas)

#### F4.1 · `01-diretorios-comissoes.html` — Diretórios & Comissões
- Tree esquerda (Nacional → Estadual → Municipal) + main + right aside
- 5 abas: Diretório · Comissões · Atas · Atos & Resoluções · Histórico
- Mesa Diretora 7 cargos
- 10 comissões setoriais
- 9 documentos estatutários
- **Meu port:** `Diretorios.jsx` — feito. Tree esquerda + abas (4 stub) + Mesa + Comissões + Documentos.

#### F4.2 · `02-filiados.html` **(NÃO PORTADO — zona protegida atual /afiliados)**
- 5 abas: Pendentes DocuSign 847 · Em abono 312 · Sigilosos 12 · A renovar 214 · Auditoria 5
- Side esquerda + main + side-r (dossiê do filiado selecionado)
- Caso âncora "João Mendes da Silva"

#### F4.3 · `03-documentos.html`
- 5 abas: DocuSign Pendentes 12 · Vigentes 19 · Vencendo 3 · Sigilosos 2 · Rascunhos 2
- Side esquerda + main + side-r (preview "Ata Reunião Executiva 04/2026")
- **Meu port:** `Documentos.jsx` — feito mas com layout simplificado, **sem side-r preview**.

#### F4.4 · `04-tesouraria.html`
- KPIs + extratos + categorização
- 605 linhas no Designer (não li com profundidade)
- **Meu port:** `Tesouraria.jsx` — KPIs + lista de transações. Possivelmente raso vs Designer.

#### F4.5 · `05-painel-pessoal-politico.html` **(NÃO PORTADO)**
- 733 linhas (a maior do F4)
- 3 hero variants: político · equipe gabinete · agenda pessoal
- "Agente de Inteligência Política Pessoal" — princípio do briefing § 9
- Caso âncora "RAFAEL RODRIGUES"

#### F4.6 · `06-ids-convites.html` — Sistema IDs · Convites
- Wizard 3 passos (Buscar/Link/Designar)
- IDs Discord-style por entidade
- Side esquerda com left-nav + main + section
- 648 linhas
- **Meu port:** `Convites.jsx` — wizard 3 passos OK + IDs side panel OK. Não auditei se layout left-nav corresponde ao Designer.

#### F4.7 · `07-saude-nominatas.html` (+ `.app.js` + `.data.js`)
- **5 abas:** Score Hexágono · Heatmap SP · Ranking · Dossiê Comissão · Alertas Anti-Fraude
- 7 sub-medidas ponderadas: paridade 16, faixa 10, vinculação 18, experiência 14, documental 18, ativação 12, histórico 12 = 100
- Casos âncora **Bauru** (87 saudável) · **Marília** (69 atenção) · **Tatuí** (30 crítica diligência)
- Linguagem **neutra**
- 6 alertas + 6 regras
- "Pulso de filiação" Tatuí: 412 em 1 dia, 21× a média móvel
- **Meu port:** `SaudeNominatas.jsx` — **MUITO ABAIXO**. Casos errados (SP/Campinas/Santos genéricos), SEM hexágono (pulei a aba 01), sub-medidas não modeladas, botão "Reportar fraude" (linguagem errada).

---

## C. Auditoria honesta · meus 9 ports vs Designer

### Aprovados (próximos do mockup)
| Módulo | Estado |
|---|---|
| Login UB | OK funcional, tipografia não auditada vs mockup |
| Sidebar derivada | OK (sidebars.js segue briefing) — pendente revisão tipográfica |
| Convites Wizard | Próximo — falta layout left-nav |

### Em correção (tipografia pesada)
| Módulo | Erro |
|---|---|
| Home (Variação A) | Tipografia recém-corrigida valor por valor — Cesar precisa validar |

### Falhas graves
| Módulo | Erro |
|---|---|
| **Saúde Nominatas** | Casos âncora errados (deveria ser Bauru/Marília/Tatuí) · sem hexágono score · sub-medidas faltando · linguagem errada ("Reportar fraude") |
| **Emendas** | Sem topbar Milton-CEO 3 perguntas · Mapa SVG/Sankey/Dossiê stub |
| **Chat** | Sem salas áudio · sem watermark · sem visualização única |
| **Operações** | Wizard/Live/Relatório stub |
| **Documentos** | Sem side-r preview |
| **Tesouraria** | Layout não auditado vs 605 linhas Designer |
| **Diretórios** | 4 abas (Comissões/Atas/Atos/Histórico) stub |

### Não tocado ainda
| Módulo | Status |
|---|---|
| Cartinha 4:5 (F2.2) | Não portado |
| Dossiê 8 cargos (F2.3) | Não portado (Dossies atual é V1) |
| Mapa Estratégico (F3.1) | Não portado (Mapa atual é V1) |
| Filiados upgrade (F4.2) | Não tocado (zona aberta agora) |
| Painel Pessoal (F4.5) | Não tocado (zona aberta agora) |

---

## D. Plano de fix priorizado

### Sprint 1 · Fixes graves (fazer primeiro)
1. **Saúde Nominatas refazer** com casos Bauru/Marília/Tatuí + hexágono 7 sub-medidas + linguagem neutra + dossiê Tatuí com pulso de filiação
2. **Emendas refazer** com topbar Milton-CEO 3 perguntas + ler `04-modulo-emendas.app.js` pra implementar Mapa SVG SP + Sankey
3. **Chat completar** com salas áudio (skeleton) + watermark + visualização única
4. **Validação tipográfica** dos 8 outros módulos (auditoria valor-por-valor vs mockup)

### Sprint 2 · Não portado (oportunidade)
5. **Cartinha 4:5** (F2.2) — card político 4:5 estilo Instagram
6. **Dossiê 8 cargos** (F2.3) — refazer Dossies com motor de seções priorizadas por cargo
7. **Mapa Estratégico** (F3.1) — 3 modos (operação · compliance · cobertura)
8. **Filiados upgrade** (F4.2) — 5 abas + side-r dossiê filiado
9. **Painel Pessoal Político** (F4.5) — 3 hero variants + Agente de Inteligência

### Sprint 3 · Polimento
10. **Operações Wizard 6 passos + Live + Relatório** completos
11. **Diretórios** abas Comissões/Atas/Atos/Histórico
12. **Documentos** side-r preview
13. **Tesouraria** auditoria contra 605 linhas Designer

---

## E. Regra de processo a partir de agora

1. **Antes de portar um módulo** — ler o mockup HTML por inteiro + .data.js / .app.js se houver
2. **Tipografia** — copiar font-size/weight/letter-spacing/line-height **valor por valor**, sem inventar
3. **Casos âncora** — usar os calibrados pelo Designer (Bauru/Marília/Tatuí, Santa Bárbara, Rafael Rodrigues, etc.) — não inventar nomes genéricos
4. **Linguagem** — copiar do Designer. Telas sigilosas = neutra. Topbar Milton-CEO = 3 perguntas em ≤3s
5. **Sub-medidas / pesos / regras** — replicar do .data.js do Designer
6. **Validação obrigatória** antes de marcar como pronto: abrir mockup + meu port lado a lado, comparar

Este é o trabalho que eu pulei. Não vai mais acontecer.
