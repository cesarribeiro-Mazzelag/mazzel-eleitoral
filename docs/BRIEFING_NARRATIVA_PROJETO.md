# BRIEFING NARRATIVA: PLATAFORMA ELEITORAL UNIÃO BRASIL

## 1. ORIGEM E VISÃO DO PRODUTO

### Problema que resolve

A União Brasil (partido 44, maior coligação centrista do Brasil desde fusão com PSL em 2022) operava com ferramentas anacrónicas: planilhas Excel, papel, memória pessoal de líderes políticos. Não havia panorama unificado de: quem são os candidatos viáveis, qual sua força real, como construir alianças, quem não tem dados acessíveis. O partido estava "no século XX em um mundo digital" — desorganização material em um segmento com muito dinheiro envolvido.

Cesar Ribeiro identificou oportunidade: criar uma plataforma de inteligência eleitoral que fosse simultaneamente:
- **Ferramenta operacional** para campanha 2026 (gestão de lideranças, cabos eleitorais, mapa territorial)
- **BI investigativo** que consolidasse dados públicos (TSE, Câmara, Senado, CGU, TCU, CNJ) num painel único
- **Raio-X completo** de cada candidato com dimensões políticas, jurídicas, financeiras e territoriais

### Cliente e filosofia

Cliente: União Brasil (Anderson e liderança estadual SP).

**Filosofia: imparcialidade narrativa** ([[2026-04-24 - Filosofia imparcialidade narrativa]]). A plataforma não toma lado político — ela narra os fatos que os dados contam. Motivo: o mercado real da plataforma são múltiplos partidos (pode ser contratada para PT, PL, PSDB, União Brasil). Credibilidade depende de zero viés. Dados públicos do TSE, Câmara, Senado, CGU, TCU são objetivos; a leitura deles precisa ser igualmente objetiva. Condenações, inelegibilidades, reformas judiciais — nada é ocultado, tudo é contextualizado com instância, motivo e histórico.

### Inspiração de design

**Visão visual Globo G1:** Mapa eleitoral com drill-down Brasil → UF → Município → Bairro → Escola. Padrão de jornalismo de dados moderno com tooltips ricos, cores semânticas (partido dominante), breadcrumb navegável. Referência: `2026-04-15 - Mega Sessao Redesign e Microbairros` — redesign completo com 9 fases, cores por partido, hover preview (Globo-like).

**Cards políticos estilo FIFA Ultimate Team:** Cada candidato é uma "carta" 4:5 (proporcional Instagram) com foto grande, Overall (0-99), 6 atributos hexagonais (VOT/EFI/ART/FID/FIN/TER em v8; ATV/LEG/BSE/INF/MID/PAC em v9), status visual (eleito/não eleito/suplente), bandeira partido. Inspiração: Cesar quer que a inteligência política seja tão acessível quanto avaliar um jogador de futebol — uma olhada na cartinha e você sabe se é forte ou fraco.

### Comparação com predecessores

Antes: planilhas do Excel, nenhuma integração entre dados, informações repetidas, inconsistências entre bases. Agora: 50+ scripts ETL processando 17.5M+ votos, 463K candidatos, 5.571 municípios. Backend FastAPI retorna dados estruturados por cargo, ciclo, turno. Frontend Next.js 15 oferece UI interativa com filtros server-side, paginação, maps interativos. Sistema unificado que não existe em nenhuma outra plataforma brasileira.

---

## 2. EVOLUÇÃO HISTÓRICA (12/04 a 25/04)

### Semana 1: Recuperação e fundamentação (12/04-16/04)

**12/04 - Mapa Eleitoral V1 Evolução** ([[2026-04-12 - Uniao Brasil - Mapa Eleitoral V1 Evolucao]]):
- Backend restaurado com escala percentil 0-5, presidente funcionando
- Drill-down Brasil → Estado → Município funcionando
- Sidebar precisava reescrita (problemas de sincronização)
- **Decisão crítica:** geojson deve incluir dominante_nome, dominante_partido_sigla, dominante_votos nas properties (Tooltip X9 com competidor em nível 0)
- 4 bugs reportados por Cesar (presidente não aparecia, filtro partido quebrado, sidebar não responsiva, aba Não-eleitos disfuncional)
- **Lição aprendida:** eu empilhava código sem plano; Cesar exigiu profundidade antes de velocidade

**15/04 - Mega Sessão Redesign e Microbairros** ([[2026-04-15 - Uniao Brasil - Mega Sessao Redesign e Microbairros]]):
- Redesign Globo-like em 9 fases: cores por partido dominante, breadcrumb clicável, tabs turno, hover preview sidebar
- **Dados de apuração:** tabela `apuracao_municipio` populada (TSE 4 ciclos). 219K fotos candidatos preenchidas com .jpeg
- **Robo de microbairros:** ETL 43 descobriu 1.795 microbairros SP via HERE Geocoding (100% centroide+bbox) + OSM Nominatim (30.9% polygon real)
- **Voronoi suavizado:** ETL 45 criou 1.073 polígonos com ST_VoronoiPolygons + buffer + Chaiken smoothing
- **GeoSampa descartado:** não publica polígonos de bairros vernaculares. Nossos dados (CEP+censitário) superiores ao OSM
- **Endpoints novos:** `/mapa/municipio/{ibge}/top2` (top 10 candidatos), `/mapa/totais-apuracao`, `/mapa/municipio/{ibge}/comparativo-zonas`
- **Radar Politico:** 4 tabs (Partidos, Políticos grid cards, Análise KPIs, Em destaque). PoliticoCard com foto, votos, partido logo
- **Pipeline SP inteira:** 598 microzonas completadas (Receita ETL 26→30→31→32→36→35→26→22)
- **Cesinha irritado:** Voronoi com qualidade visual ruim. Avaliado Mapbox Boundaries (~$500/mês) para próxima fase

**16/04 - Radar Politico Champion Select** ([[2026-04-16 - Radar Politico Champion Select]]):
- Backend: StatusPolitico 4 tipos (ELEITO, NAO_ELEITO, SUPLENTE_ASSUMIU, SUPLENTE_ESPERA)
- Cruzamento mandatos x candidaturas: 355 suplentes que assumiram identificados
- **Deduplicação 2º turno:** agrupa por sequencial_tse, consolida votos
- **Unificação candidaturas:** 161k candidatos com IDs duplicados unificados por nome_completo
- Overall FIFA: 6 dimensões (VOT, EFI, ART, FID, FIN, TER) + overall
- Score POL reformulado: 5 componentes (experiência 30, mandatos 25, diversidade cargos 15, fidelidade 20, coerência 10)
- Frontend: grid cards com badges status, borda lateral colorida, Badge "2T" com espadas
- Champion Page com hero section (foto + KPIs + mini-scores), Overall hexágono SVG, mapa eleitoral MapLibre
- **Erros admitidos:** Cesar pediu layout e eu disse "entendi" 2x sem entender. Tive que reverter mudanças.
- **Lição:** quando layout é descrito, pedir ordem EXATA antes de codar

**16/04 (tarde) - Champion Page e Cerebro Claude** ([[2026-04-16b - Uniao Brasil - Champion Page e Cerebro]]):
- Seletor de ciclo clicável na trajetória (ciclo ativo = fundo roxo + borda + seta)
- Bonus complexidade territorial: vereador/prefeito ganham até +13 por PIB+população município. Dep/Senador ganham por estado. Presidente máximo.
- Score e Overall alinhados: Score.geral = FIFA.overall
- Tooltips em KPIs do hero explicando cada métrica
- **Cerebro Claude criado:** Obsidian Vault com 43 notas (28 sessões + 5 decisões + 2 aprendizados + 4 templates + índice). 27 sessões históricas migradas.

### Semana 2: Fundamentação teórica e decisões arquiteturais (20/04-24/04)

**20/04 - Ciência política BR e Overall FIFA por cargo** ([[2026-04-20 - Ciencia politica BR e Overall FIFA por cargo]]):
- Estudo profundo Sonnet identificando erro crítico: Wagner ART=5 (senador reeleito, titular CCJ). Regra universal para cargos diferentes gera análise errada.
- **6 princípios estabelecidos:**
  1. Cargo define a régua (nunca mesma fórmula ART em Senador, Deputado, Vereador)
  2. Qualidade > quantidade (Relatoria PEC aprovada >> 50 PLs de rotina)
  3. Articulação informal (medir resultados, não processo)
  4. Contexto geográfico (normalizar por porte)
  5. DIAP é benchmark confiável (protagonismo, coalizões)
  6. Overall honesto sobre limites (exibir como estimativa + dados brutos)
- **Matriz 8 cargos definida:** pesos diferentes para VOT/EFI/ART/FID/INT/TER/POT/FIN por cargo

**20/04 - Dashboards modernos referências** ([[2026-04-20 - Dashboards modernos referencias para dossie politico]]):
- 7 referências mapeadas (Linear, Vercel, Stripe, StatsBomb, NYTimes, Palantir, shadcn)
- Anti-patterns encontrados: grid stretch (mapa alto + Overall baixo = vazio), radar vazio sem fallback, mapa choropleth sem gradiente para entidade única, 3+ blocos "Sem dados" em grid, tabs de tema escondem alertas críticos
- **Recomendação:** abolir tabs de tema. Scroll vertical único com 8 seções (header + 8 atributos + mapa + trajetória + atividade + alertas + financeiro + perfil)

**20/04 - Sistema judiciário BR** ([[2026-04-20 - Sistema judiciario BR APIs e cruzamento CPF]]):
- Estrutura do Judiciário: STF (foro privilegiado), STJ (governadores/desembargadores), TSE (candidatos), DataJud (90 tribunais), CNJ CNIA (improbidade)
- **4 ondas de coleta:** (1) FEITA 17/04 — Ficha Limpa + CEIS/CEAF + TCU (ZERO custo); (2) DataJud 90 tribunais + CNIA + PGFN + CNEP + STJ scraping; (3) CNPJs via Receita Federal; (4) DOU + Querido Diário + GDELT mídia
- **Onda 1 resolve 80-85% do valor sem pagar API nenhuma.** JUDIT ($1.5k-3k/mês) só para 20-30 candidatos críticos com alerta em tempo real.

**24/04 - Matriz Overall v9 por cargo + arquetipos + não-eleitos** ([[2026-04-24 - Matriz Overall v9 por cargo + arquetipos + nao-eleitos]]):
- Mudança estrutural: INT saiu do Overall (virou módulo de sançoes separado). EFI/FIN sumiram (vão para módulos auxiliares). TER virou BSE.2 Capilaridade. Surgiu PAC (Pactuação) como dimensão independente.
- **6 dimensões v9 (18 sub-medidas):** ATV/LEG/BSE/INF/MID/PAC × 3 sub-medidas cada (144 valores conforme escopo)
- **3 categorias de cargo:** Legislativo eleito, Executivo eleito (PRES/GOV/PREF), Não-eleito (nova)
- **6 arquetipos migrados com Populista virando penalidade -5:** "Mídia sem entrega não é talento, é teatro"
- **Bonus cargo escalonado** PRES +8 → VER_INT +2 + dimensão-mãe ×1.05
- **11 casos-limite validados:** Wagner 5→86 (bug consertado!), Nikolas 84 mantém, Lula 96, Renan/Lira 89
- **Cobertura atual ~50%,** plano para 90%+ após sprints de coleta

**24/04 (madrugada) - Overall Dossié v9 (6 dim × 3 sub-medidas)** ([[Decisao - Overall Dossie v9 (6 dim x 3 sub-medidas)]]):
- **Aprovado por Cesar** em 24/04, superando [[Decisao - Overall FIFA 6 dimensoes]] (16/04)
- PRS renomeado para **ATV** (Atividade) — conceito genérico que funciona para parlamentar (Discursos+Comissões+CPIs), executivo (Agenda+Audiências+DOU), não-eleito (Eventos+Comícios+Reuniões)
- **PAC.3 substituída por Taxa de execução de emendas** (para parlamentares federais/estaduais). Justificativa: taxa de execução = "consegui pactuar com Executivo pra liberar dinheiro" = sinal puro de pactuação
- **Regra de null proporcional:** por dimensão, <67% cobertura mostra "parcial"; <34% mostra "X de 3"; <0% mostra "em construção"
- **19 sub-medidas com status:** ATV.1-2 OK; ATV.3 falta ETL; LEG.1-3 OK; BSE.1-2 OK; BSE.3 plano pronto (Agente 3); INF.1-2 OK parcial; INF.3 plano pronto (Agente 4); MID.1-3 plano gratuito $25-40/mês (Agente 5); PAC.1-2 plano pronto (Agente 6); PAC.3 API Portal Transparência

**24/04 - Retrabalho Overall v9 + porte HTML** ([[2026-04-24 - Sessao retrabalho Overall v9 + porte HTML]]):
- Reset após agente anterior quebrar (/mazzel-preview deletado, artefatos perdidos)
- **Restauração /v1:** plataforma antiga funcional, preservada para reunião com cliente UB-SP
- **2 arquiteturas decididas:** `/v1` (raiz, funcional) vs `/mazzel-preview` (nova, em desenvolvimento com Claude Designer)
- **Última carta do político:** Opção A — última carta DISPUTADA (qualquer resultado), não a última eleita
- **Cobertura expandida:** coletar TODOS os políticos que já foram eleitos desde 1994 (TSE tem dados abertos)
- **6 agentes Sonnet lançados em paralelo** (PRS.1 Plenário Senado, PRS.3 Sessões Conjuntas, BSE.3 Fidelidade, INF.3 Rede Apoios, MID.1-3 Exposição, PAC.1-3 Pactuação)
- **Padrão crítico:** 3 endpoints Senado descontinuados em 01/02/2026 (votacoes, autoria) — ainda servindo por inércia, podem cair a qualquer momento. **Sprint 0 = migração urgente**

**24/04 (tarde) - Dossié sprint completo planejamento** ([[2026-04-24b - Uniao Brasil - Dossie sprint completo planejamento]]):
- **100% planejamento — nada de código escrito.** Atualizações Obsidian + lançamento agentes Sonnet paralelo
- **Cartinhas do localhost → módulo Dossié:** Click abre dossié individual com cartinha embarcada
- **4 camadas de busca aprovadas:** nome (barra), chips (cargo/UF/partido/ciclo/status), IA (perguntas em linguagem natural), presets (20 cartões: Fenômenos, Trabalhadores, Suplentes, etc)
- **Paginação hibrida:** 1ª carga 30, pré-carga até ~90, botão "Ver mais (30)" após 90. Virtualizacao + lazy load obrigatórios
- **Pivot importante — PRS → ATV em todas referências**
- **Pivot importante — Emendas em PAC.3 (caminho D adotado):** Taxa execução emendas entra no Overall (só parlamentares) + card dedicado no dossié
- **3 sprints planejados:** Sprint 0 urgência (migar endpoints Senado), Sprint 1 frontend Dossié (4-6h), Sprint 2+ ETLs sub-medidas

### Semana 3: Isolamento físico e decisões finais (25/04)

**24/04 (noite) - Spike DSF Senado OCR** ([[2026-04-24 - Spike DSF Senado OCR]]):
- Agente tentou extrair DSF (Diários de Sessão Deliberativas) via Playwright + pdf.js (bash bloqueado)
- Achou: PDFs digitais nativos 100% extraíveis, cobertura desde 01/07/1997, custo zero
- **Recomendação:** postergar. Proxy via votação nominal entrega 85-90% qualidade em ~30% esforço

**25/04 - Reorganização em worktrees** ([[2026-04-25 - Uniao Brasil - Reorganizacao em worktrees]]):
- **Causa raiz:** 2 versões (PRESERVADA + V2) compartilhando o mesmo working tree. Sem isolamento, agentes embolavam nomes ("v1", "v2", "mazzel-preview", "raiz")
- **Decisão:** 3 worktrees físicos separados
  - **PRESERVADA:** `/uniao-brasil-preservada/`, branch `preservada`, localhost:3002 — Frozen para reunião UB-SP
  - **V2:** `/uniao-brasil-v2/`, branch `v2-dev`, localhost:3003 + tunnel Cloudflare — Em desenvolvimento
  - **(root):** `/uniao-brasil/`, branch `main` — Só `.git` + `docker-compose.yml`
- Backend (Postgres, Redis) compartilhados via Docker (mounted V2)
- **3 branches criadas:** `main` (afa0cd3), `preservada` (b153ee7), `v2-dev` (5648e31)
- **3 VERSOES.md criados** (raiz, preservada, v2)
- **Aprendizado crítico:** Versões simultâneas exigem isolamento físico — documentação em texto não basta. Agente novo não lê antes de agir.

**25/04 - Decisão de deploy estratégico** ([[Decisao - Estrategia de deploy dev local ate produto pronto 2026-04-25]]):
- Durante desenvolvimento: Mac Cesar + tunnel Cloudflare (`trycloudflare.com`). **Sem Vercel/Railway ativos.**
- GitHub = hospedagem código + backup remoto, SEM CI/CD
- Quando produto pronto: migrar para Railway (backend) + Vercel (frontend) + DNS `app.mazzelag.com`
- **Consequências:** tunnel muda URL ao reiniciar; GitHub tem 3 branches públicas; Vercel nenhum projeto linkado a `mazzel-eleitoral`

**25/04 - MapLibre: 2 modos (Histórico + Futuro)** ([[Decisao - MapLibre dois modos historico futuro 2026-04-25]]):
- **Modo Histórico:** TSE votação/eleitos/forças historicamente (votos, eleitos, comparação temporal ciclos)
- **Modo Futuro (NOVO):** Automação prospectiva — estratégia, base partidária, lideranças, coordenadores, cabos
- Outras seções: Cabo (mapa território do cabo), Campanha 2026 (mapa cercas), Dossié (mapa eleitoral candidato), Estudo/Coordenadores/Lideranças (a portar)
- **Regras visuais:** Brasil-only (maxBounds), estilo consistente, topbar funcional, sidebar contextual
- **Modo Futuro dependências:** backend (tabelas/endpoints estratégia, base, lideranças, coordenadores), frontend (componentes input), IA (automação)

**25/04 - Mapa Estratégico vs Mapa Eleitoral** ([[Decisao - Mapa Estrategico vs Mapa Eleitoral 2026-04-25]]):
- **Pivot importante:** "Modo Futuro" vira **PRINCIPAL** ("Mapa Estratégico"), "Modo Histórico" vira **SECUNDÁRIO** (dentro módulo Estudo)
- **Mapa Estratégico (novo, principal):** Domínio territorial — equipe, lideranças, candidatos eleitos, emendas, scores Overall v9. Sidebar principal `/mazzel-preview/mapa`
- **Mapa Eleitoral (existente):** Votação histórica TSE. Sub-tela módulo **Estudo**
- **Justificativa Cesar:** "Partido funciona como empresa. Mapa eleitoral = dado histórico. Mapa Estratégico = 'como está minha operação territorial AGORA'. Diariamente, quem usa quer ver o segundo."
- Pendência: Designer revisar proposta pré-reunião

**25/04 - Decisão: Migração definitiva para mazzel-preview** ([[Decisao - Migracao para mazzel-preview pos reuniao 2026-04-25]]):
- Versão `/mazzel-preview/*` (25 módulos + RBAC + tenant switcher) = **versão definitiva pós-reunião UB-SP**
- Versão raiz (`/dashboard`, `/mapa`, `/radar`) = **descontinuada pós-reunião** (preservada APENAS para reunião como backup)
- Implicações: portar tudo que existe em raiz; conectar APIs já funcionais; calibrar bases TODOS os cargos (cobertura hoje parcial)
- **Checklist:** validar V2 funciona com dados reais SP (cliente vai testar SP); apos reunião: lançar agentes portar resto; calibrar ETLs por cargo; remover middleware; descontinuar raiz

---

## 3. ESTADO ATUAL (25/04/2026)

### Módulos entregues

**Dossié (Champion Page)** — Perfil individual do político com:
- Hero section com foto, nome, cargo, Overall (0-99), badges (status, Ficha Limpa, alertas)
- 6 dimensões Overall v9 em hexágono SVG (ATV/LEG/BSE/INF/MID/PAC)
- Seletor de ciclo clicável na trajetória (eleição/suplência por ano)
- 9 seções: Desempenho, Legislativo, Financeiro, Mapa, Trajetória, Atividade, Alertas Jurídicos, Perfil, Emendas (parlamentares)
- Score POL reformulado (5 componentes)
- Bonus complexidade territorial

**Mapa Eleitoral (V1, em refinamento)** — Drill-down Brasil → UF → Município → Bairro → Escola:
- 5 níveis navegáveis com breadcrumb clicável
- PostGIS + MapLibre GL
- Escala 0-5 percentil, cores por partido dominante
- Tooltip X9 (mostra competidor em nível 0 — cor complementar)
- Sidebar congelada com hover preview
- Tabs Turno (Total/2º Turno/1º Turno) para cargos majoritários
- Dados apuração TSE (4 ciclos: 2018-2024)
- Microbairros SP (1.795 via HERE+OSM, 1.073 Voronoi suavizados)
- **Pendências:** sidebar não sincroniza todos níveis, Voronoi qualidade visual ruim (avaliar Mapbox Boundaries)

**Radar Político (4 tabs)** — Observatório político estilo LOL/DOTA:
- **Partidos:** ranking por força, logo centralizada, % força na cor do partido
- **Políticos:** grid cards com foto grande, badges status, micro progresso votos, glow na cor
- **Análise:** KPIs compactos + distribuição bancada com logos
- **Em Destaque:** 4 seções (top votados, suplentes que assumiram, quase ganharam, 2º turno)
- 4 status políticos: ELEITO, NÃO_ELEITO, SUPLENTE_ASSUMIU, SUPLENTE_ESPERA
- Badge "2T" com espadas para candidatos 2º turno
- Deduplicação por sequencial_tse

**Lideranças** — Migration 008 (`liderancas_cercas`), estrutura base presente, integração com campanha pendente

**Filiados** — Migration com dados de filiação do partido

**Delegados** — Estrutura para gestão de delegados eleitorais

**Portal Cliente** — Acesso para políticos logados verem seus próprios dados

**Alertas** — Sistema de notificações (onda 1: jurídicas com Ficha Limpa/CEIS/CEAF/TCU)

**IA (Summarização)** — LLM para gerar resumos narrativos de dossié (sem opinião, apenas fatos)

**Admin** — Painel administrativo Mazzel (super admin)

**Cabo Eleitoral** — Interface minimalista para executor de campo:
- Agenda do dia
- Mapa da área (microterritório)
- Chat com coordenador + grupo cercas
- Comando de campo (check-in GPS, entrega material, visita, panfletagem)
- Metas semana
- Registro rápido (foto + nota)
- Suporte 2 modos: autônomo (smartphone) e validado (sem smartphone, coordenador valida presença)

### Módulos placeholder / em desenvolvimento

**Radar reformulado** — (bloqueado por créditos Claude Designer até 24/04) Observatório dinâmico com 6 componentes:
1. Timeline viva (feed cronológico reverso: processo criminal, mudança partido, posse suplente, nova sanção CEIS/CEAF/TCU, votação crítica, discurso, mídia)
2. Movimentações semana (top 10 subidas/quedas, em risco inelegibilidade, estreantes)
3. Alertas estratégicos (filtrados por role)
4. Acompanhamento pautas (temas em alta, políticos na frente)
5. Balança de forças (composição Congresso, coalizões, bancadas temáticas)
6. Sentinela (próximas votações críticas, sessões CPIs, julgados STF)

**Alianças Políticas** — (nova, planejada) 7 camadas:
1. Base histórica (quem apoiou, resultados)
2. Mapa interativo de alianças (partidos, lideranças, influenciadores por região + lacunas)
3. Painel de metas ("construir apoio em 3 cidades até eleição")
4. Análise potenciais alianças (sugestões IA baseado histórico + proximidade ideológica)
5. Simulador cenários ("se fechar aliança com partido X, qual impacto em votos?")
6. Alertas e calendário (prazos, compromissos, reuniões)
7. Relatórios estratégicos

**Estudo** — Panorama nacional via emendas; Mapa Eleitoral como sub-tela (histórico TSE relocado)

**Campanha 2026** — (8 conceitos documentados) Planejamento territorial, alocação cabos/lideranças, acompanhamento agenda candidato, integração Radar para definir adversários, pesquisas internas

**Pesquisas** — (bloqueado por créditos Designer) 5 telas:
1. Agregador (média ponderada FiveThirtyEight-style)
2. Histórico (evolução temporal cenários)
3. Matriz (candidato × instituto × cenário)
4. Recortes (demográfico: sexo, idade, renda, região, escolaridade, religião)
5. Privadas (upload + fusão pesquisas do partido)

Widgets distribuídos: Dossié (3 últimas pesquisas), Mapa (overlay regiões fortes/fracas), Estudo (aba nacional), Alertas (queda X pontos), Portal Cliente (evolução pessoal), Overall FIFA (atributo POT ganha sinal pesquisas)

**Chat Sigiloso** — Para comando de campanha (integração com Campanha 2026)

**Agenda Pública** — Calendário de eventos políticos

**Relatórios** — Painéis exportáveis (PDF, CSV, PPTX)

**Coordenadores** — Gestão de coordenadores regionais na cascata (nível 3 abaixo de Presidente do partido)

**Super** — (placeholder) Módulo para presidente do partido (visão agregada nacional)

**Afiliados** — CRM separado de Campanha (gestão de filiações)

**Mandato** — Acompanhamento de mandatos (para políticos eleitos)

### Schema Overall v9 (6 dimensões × 3 sub-medidas)

#### Dimensões

| Sigla | Label | Conceito |
|-------|-------|----------|
| **ATV** | Atividade | Discursos+Comissões+CPIs (parlamentar); Agenda+Audiências+DOU (executivo); Eventos+Comícios+Reuniões (não-eleito) |
| **LEG** | Legislativo | Autoria, relatoria, aprovação de PLs; Decretos/Projetos/Vetos (executivo); Produção própria/cargos técnicos/conselhos (não-eleito) |
| **BSE** | Base | Votação absoluta, capilaridade UF, fidelidade eleitor |
| **INF** | Influência | Liderança partidária, cargos comissões, rede apoios |
| **MID** | Mídia | Menções mídia, engajamento redes, entrevistas TV |
| **PAC** | Pactuação | Acordos interpartidários, base governista, taxa execução emendas (parlamentares) / diálogo oposição (executivo/não-eleito) |

#### Cobertura de dados (24/04/2026)

| Sub-medida | Status | Plano |
|---|---|---|
| ATV.1 Discursos plenário (Câmara) | ✅ OK | Via API discursos |
| ATV.1 Discursos plenário (Senado) | ✅ OK | Via API discursos; **ALERTA:** endpoint deprecado 01/02/2026 |
| ATV.2 Comissões (Câmara) | ✅ OK | API expõe titularidade |
| ATV.2 Comissões (Senado) | ⚠️ Parcial | API expõe titularidade, falta participação em pauta. **ALERTA:** endpoint deprecado 01/02/2026 |
| ATV.3 CPIs e missões | ❌ Falta | ETL específico (extrair comissões + missões oficiais) — **Agente 2 (Sonnet)**|
| LEG.1-3 (Legislativo) | ✅ OK | PLs, aprovação, relatorias |
| BSE.1-2 (Votos + Capilaridade) | ✅ OK | TSE, IBGE |
| BSE.3 Fidelidade eleitor | 🔄 Plano | Agente 3: 0.6×Persistência + 0.4×Estabilidade do share zonal. Cobertura 60-75%. **Via Trilha B votos_por_zona** |
| INF.1-2 (Liderança + Cargos) | ✅ OK | Parcial. Câmara/Senado oficializados |
| INF.3 Rede de apoios | 🔄 Plano | Agente 4: grafo co-autoria PL. Weighted degree (60%) + eigenvector (40%). **ALERTA:** Senado descontinuou autoria 01/02/2026 |
| MID.1-3 (Mídia) | 🔄 Plano | Agente 5: plano gratuito **$25-40/mês** (GDELT + RSS 6 jornais + YouTube + IG Business Discovery). **X/Twitter fora** (free tier morto). Cobertura ~70% atual; ~90% com X API Basic ($100-200/mês) |
| PAC.1-2 (Acordos + Base) | 🔄 Plano | Agente 6: votações nominais cruzadas, orientação governo/oposição. Câmara API tem `/votacoes/{id}/orientacoes` direto |
| PAC.3 Taxa execução emendas | ✅ OK | API Portal Transparência + Câmara/Senado emendas (gratuitas). **Caminho D:** entra no Overall (só parlamentares) + card dedicado no dossié |

**Cobertura geral:** ~50% hoje, plano para 90%+ após sprints coleta. **Bloqueios críticos:** 3 endpoints Senado deprecados 01/02/2026 (votações, autoria, mais um) — ainda servindo por inércia, podem cair. **Sprint 0 = migração urgente.**

### Matriz de pesos por cargo (Overall v9)

```
DIM  | PRES | GOV | SEN | DEP_FED | DEP_EST | PREF | VER_CAP | VER_INT
ATV  |  10  | 10  | 15  |   18    |   18    |  10  |   18    |   15
LEG  |  10  | 10  | 25  |   22    |   18    |  10  |   18    |   12
BSE  |  25  | 25  | 18  |   18    |   22    |  30  |   25    |   30
INF  |  20  | 20  | 22  |   18    |   15    |  18  |   12    |   13
MID  |  15  | 15  | 10  |   14    |   12    |  17  |   17    |   15
PAC  |  20  | 20  | 10  |   10    |   15    |  15  |   10    |   15
TOT  | 100  |100  |100  |  100    |  100    | 100  |  100    |  100
```

**Highlights:**
- **Senador:** LEG 25% (pilar do cargo, CCJ/CAE/CAS terminativas). INF 22% (81 cadeiras = peso individual alto). ATV 15% (comissões têm poder decisório)
- **Vereador Interior:** BSE 30% (política personalíssima, ganha quem tem capilaridade). INF.3 Rede informal 60% (articulação mais informal)
- **Executivos (PRES/GOV/PREF):** PAC 20% (existem para pactuar). ATV reconceitua para Agenda+Audiências+DOU
- **Não-eleitos:** sub-medidas completamente reconceitualizadas (Eventos, Comicios, Reuniões para ATV; Cargos técnicos para LEG; Rede apoios 60% em INF)

### Arquétipos e Bonus

**6 arquetipos:**
1. **Fenômeno** — Votação explosiva (desvio padrão > media/2), novo no mercado, trajetória curta mas brilhante
2. **Trabalhador** — Presença consistente, crescimento linear, sem megavoto mas sólido
3. **Articulador** — Alto em INF e PAC, relações políticas, menos em votos absolutos
4. **Chefe de Base** — Alto em BSE (fidelidade local), voto garantido
5. **Populista** — Alto em MID, engajamento redes, voto volátil. **Penalidade -5** ("Mídia sem entrega não é talento, é teatro")
6. **Técnico** — Alto em LEG, produção legislativa, expertise setorial

**Bonus aplicáveis:**
- **Bonus cargo escalonado:** PRES +8 → GOV +6 → SEN +5 → PREF +5 → DEP_FED +4 → DEP_EST +3 → VER_CAP +3 → VER_INT +2 + dimensão-mãe ×1.05
- **ICT (Índice Complexidade Territorial):** z-score PIB+IDH+população+arrecadação. Max +5. Vereador SP ganha mais que vereador interior.
- **Penalidade inerte:** -3 (exceto Fenômeno Brasil)
- **Trait RADAR para não-eleitos:** variantes FENÔMENO (novo) e BASE (consolidado)

### Dashboards e referências

**7 referências de design moderno:**
- Linear.app (hierarchy: estratégico topo, operacional embaixo; `align-items: start`)
- Vercel Dashboard 2025 (sidebar colapsável, ordem = fluxo analista real)
- Stripe Dashboard (4 cards altura fixa, número hero + seta + sparkline)
- StatsBomb/Wyscout (eixos por posição, baseline de comparação obrigatório, dados esparsos = opacity 0.2)
- NYTimes/Guardian (sequência: quem é → onde ganhou → o que fez → o que deve fazer)
- Palantir Gotham (centrada em hipótese analista, alerta semântico colore entidade em TODOS lugares)
- shadcn Empty + Tremor (componente Clean, anti-pattern: 3+ empty states ilustrados)

**Anti-patterns identificados:**
1. Grid stretch (mapa alto + Overall baixo = 70% vazio). Fix: `items-start`
2. Radar vazio sem fallback. Fix: <3 eixos = barras horizontais; 5+ = radar parcial opacity 0.2
3. Mapa choropleth sem gradiente (enganoso). Fix: gradiente relativo ao candidato (0% a max%)
4. 3+ blocos "Sem dados". Fix: accordion fechado com motivo
5. Tabs de tema escondem alertas críticos. Fix: badge permanente no header

**Recomendação:** Abolir tabs de tema. Scroll vertical único + índice lateral sticky com 8 seções:
1. Header fixo (foto + nome + cargo + Overall + badges jurídico)
2. 6 atributos em grid (ATV, LEG, BSE, INF, MID, PAC)
3. Mapa eleitoral full-width com gradiente intensidade
4. Trajetória (timeline horizontal, colapsável se vazio)
5. Atividade legislativa (projetos + comissões, colapsável)
6. Alertas jurídicos (seção oculta se nenhum)
7. Financeiro (doações por setor + evolução)
8. Perfil (bio + redes + contato)

### Sistema judiciário BR (integração dossié)

**Onda 1 (17/04, ZERO custo):**
- Ficha Limpa (LC 135/2010) — 8 anos inelegibilidade por condenação colegiada
- CEIS (Cadastro de Pessoas Impossibilitadas) — CGU sanções
- CEAF (Cadastro de Pessoas Inabilitadas) — TCU condenações administrativas
- TCU (Tribunal Contas União) — Tomada Contas Especial, débitos

**Onda 2 (planejada, ~zero custo):**
- DataJud (CNJ) — 90 tribunais (Justiça Federal, Estadual, Trabalho, Eleitoral). Gratuito, rate limit ~30-60 req/min. **LIMITAÇÕES:** defasagem 24-48h, CPF inconsistente, STF/STJ cobertura parcial, Juizados cobertura ruim
- CNIA (Improbidade Administrativa) — scraping simples `cnj.jus.br/improbidade_adm/consultar_requerido.php`
- PGFN (Procuradoria Geral Fazenda) — devedores >= R$ 15k
- CNEP (Cadastro Nacional Entidades Privadas Punidas)
- STJ (scraping)

**Onda 3 (planejada):**
- CNPJs via Receita Federal (download 10GB/mês)

**Onda 4 (planejada):**
- DOU + Querido Diário + GDELT mídia

**Filosofia juridical:** Não é "Ficha Limpa sim/não". Condenações reformadas, inelegibilidades atuais — tudo é contextualizado com instância, motivo, status atual, histórico tramitação. Lula exemplo: condenado Lava Jato, anulado por foro incompetente (não merito), eleito presidente 2022. Bolsonaro: inelegível por tentativa golpe, mas julgamento tem controvérsia "política" vs "jurídica". Cada alerta precisa capturar **instância + motivo decisão + se reformado + status atual + histórico completo.**

### ETLs e Pipeline

**50+ scripts** processando:
- **TSE:** candidaturas, votos, desempenho, ciclos (1994-2024)
- **Câmara dos Deputados:** proposições, votações nominais, comissões, discursos, desempenho parlamentar (639 deputados catalogados em 24/04)
- **Senado Federal:** proposições, votações nominais, comissões, discursos, desempenho parlamentar (81 senadores, bug 100% em métrica 24/04)
- **IBGE:** dados territoriais, censos, setor censitário
- **CGU:** sanções (CEIS, CEAF)
- **TCU:** condenações, débitos
- **DataJud:** processos judiciais (90 tribunais)

**Schema HEAD (migration 050):** sub-medidas v9 adicionadas, JOIN dossié reformulado

**Data Lake:** 17.5M+ votos, 463K candidatos, 5.571 municípios, 1.795 microbairros SP, 1.073 polígonos Voronoi

### Infraestrutura

**Backend:** FastAPI em `codigo/backend/`, Docker porta 8002
**Frontend PRESERVADA:** Next.js 15 em `codigo/frontend/` (V1), Docker porta 3002
**Frontend V2:** Next.js 15 em `codigo/frontend/` (V2), localhost:3003 + tunnel Cloudflare
**Banco:** PostgreSQL, port 5435, backup `/backups/backup_pre_dedupe_20260410_204926.pgdump`
**Cache:** Redis, port 6382
**Login padrão:** cesar@uniaobrasil.org.br / 123456

---

## 4. AONDE QUEREMOS CHEGAR (Roadmap + Visão Futuro)

### Roadmap 2026

**Objetivo central:** Preparação para eleições gerais 2026 (Deputado Federal, Estadual, Senador, Governador, Presidente).

**Modulos que precisam estar maduros:**
1. **Lideranças** — Integração com planejamento campanha, vincular liderança → territórios → base eleitoral
2. **Cabos Eleitorais** — Gestão ativa (cadastro, metas, performance, remuneração compliance TSE)
3. **Dossié Completo** — Carreira, votações nominais, temas atuação legislativa, raio-X 9 seções
4. **Campanha 2026** — Dashboard metas por território, alocação cabos/lideranças, acompanhamento agenda candidato, integração Radar

**Timeline proposto:**
- **Até julho/2026:** Dossié completo + Lideranças/Cabos maduros
- **Até agosto/2026:** Dashboard Campanha com metas territória
- **Até setembro/2026:** Pré-campanha começa (filiações + convenção)
- **Outubro/2026:** Dia D — módulos operacionais no dia eleição

### Próximas sprints (planejadas)

**Sprint 0 (urgência operacional, 2-4h):** Migração 3 endpoints Senado deprecados (01/02/2026):
- `/senador/{cod}/votacoes` → `GET /plenario/agenda/mes` (universo) + `/votacao` (votos)
- Autoria descontinuada → alternativa (grafo co-autoria com tabela N:N `proposicoes_autores`)
- Sessões Conjuntas → proxy via `agenda/cn` + votações nominais Câmara+Senado do dia

**Sprint 1 (frontend Dossié, 4-6h):**
- Hero limpo + grade cartinhas (30 inicial, híbrido auto-load)
- Busca em 4 camadas (nome + chips + IA + presets)
- Cartinha com siglas v9 atualizadas (ATV/LEG/BSE/INF/MID/PAC)
- Click → dossié individual com cartinha embarcada
- Backend: migrar schema dossié v8 → v9
- Performance: virtualizacao + lazy load fotos

**Sprint 2+ (ETLs sub-medidas, conforme plano Agentes 1-6):**
- ATV.3 (CPIs), BSE.3 (Fidelidade), INF.3 (Rede), MID.1-3 (Mídia), PAC.1-3 (Pactuação)
- Card dedicado emendas no dossié
- Módulo Estudo (panorama nacional via emendas)

### Módulo Campanha 2026 (8 conceitos)

**Estrutura documentada (planejamento já feito):**
1. **Planejamento eleitoral por território** — Mapa + metas voto (esperado vs real)
2. **Alocação cabos/lideranças** — Quem trabalha em qual zona, meta de cobertura
3. **Acompanhamento agenda** — Calendário de eventos/comícios, presença do candidato
4. **Integração Radar** — Definir adversários por zona, análise força concorrente
5. **Pesquisas internas** — Intenção de voto por bairro (upload de dados privados)
6. **Chat sigiloso** — Comunicação comando campanha (integrado com módulo)
7. **Cercas iFood** — Cerco ao eleitorado (estilo food delivery: "quem trabalha essa zona?")
8. **Simulador cenários** — "Se ganho 15pp em SP, preciso só 60% de RJ?" (modelo matemático votação)

### Módulo Pesquisas (bloqueado créditos Designer até 24/04)

**5 telas hibridas:**
1. **Agregador** — Média ponderada FiveThirtyEight-style de todas as pesquisas (calibração por instituto, recência)
2. **Histórico** — Evolução temporal por cenário (1º turno, 2º turno, rejeição)
3. **Matriz** — Cruzamento candidato × instituto × cenário (pivot table)
4. **Recortes** — Demográfico (sexo, idade, renda, região, escolaridade, religião)
5. **Privadas** — Upload + fusão pesquisas do partido (CSV/PDF com OCR)

**Widgets distribuídos:**
- Dossié: 3 últimas pesquisas do político
- Mapa: overlay regiões fortes/fracas por pesquisa
- Estudo: aba nacional com agregado
- Alertas: notifica queda X pontos
- Portal Cliente: evolução pessoal do político logado
- Overall FIFA: atributo POT ganha sinal pesquisas

**Fontes de dados:**
- TSE SPESQ (Sistema Pesquisas Eleitorais) — gratuito desde 1995, todas registradas obrigatoriamente
- Scraping: Poder360, Datafolha, Quaest, AtlasIntel, IBOPE, Paraná Pesquisas
- Upload privadas do partido
- Sentimento redes (fase 2, LLM + APIs sociais)

**Fases (~6 meses):**
1. Coleta + listagem básica (TSE SPESQ 1994+)
2. Agregador ponderado FiveThirtyEight
3. Recortes + matriz cruzamento
4. Upload privadas + fusão
5. Integração cross-módulo (widgets)
6. IA preditiva (Monte Carlo, cone incerteza)

### Radar Político reformulado (observatório dinâmico, bloqueado Designer)

**6 componentes:**
1. **Timeline viva (centro)** — Feed cronológico reverso:
   - Novo processo criminal contra X
   - Mudança de partido (TSE)
   - Posse de suplente
   - Nova sanção CEIS/CEAF/TCU
   - Votação crítica Congresso (quem votou como)
   - Discurso relevante
   - Aparição mídia relevante

2. **Movimentações semana:**
   - Top 10 subidas em pesquisas
   - Top 10 quedas
   - Em risco inelegibilidade
   - Estreantes em ascensão

3. **Alertas estratégicos (filtrados role):**
   - Presidente: "3 parlamentares do partido com movimentação jurídica esta semana"
   - Delegado UF: "Vereador X da sua UF perdeu mandato"
   - Candidato: "Concorrente Y cresceu 5pp"

4. **Acompanhamento pautas (temas em alta):**
   - "Reforma tributária · 340% menções"
   - Quais políticos na frente de cada pauta

5. **Balança de forças (agregado):**
   - Composição atual Congresso por partido
   - Movimentos coalizão
   - Ranking bancadas temáticas (BBB, Evangélica, etc)

6. **Sentinela (proativo):**
   - "Próximos 7 dias: X votações críticas"
   - "Hoje: sessão CPI Y às 15h"
   - "Amanhã: STF julga AP Z"

### Módulo Estudo (panorama nacional)

**Objetivo:** Entender geografia política via dados de emendas parlamentares (R$ 50 bi em 2024).

**3 seções:**
1. **Mapa Eleitoral histórico** — Drill-down TSE (relocado de sidebar principal, agora secundário em Estudo)
2. **Emendas por região** — Quem executou emenda onde, concentração, impacto territorial
3. **Legislação temática** — PLS aprovados por tema, protagonismo por partido

### Módulo Afiliados (CRM separado)

**Separação crítica:** Campanha 2026 = gestão cabos eleitorais (operacional). Afiliados = CRM estruturado (administrativo).

**Funcionalidades:**
- Cadastro filiado (CPF, UF, voluntário vs remunerado)
- Histórico participações
- Status contribuições (quotas, eventos)
- Documentos (comprovante filiação, recibos)
- **Integração:** Cabo eleitoral é um tipo de filiado (subconjunto com role Campanha)

### Editor portado do Jarbis

**Motivo:** Jarbis tem editor visual de dashboards muito bom. Reaproveitá-lo em União Brasil para:
- Permitir políticos/coordenadores criarem seus próprios painéis
- Customizar visualizações
- Salvar presets (filtros + layout)

### Ferramentas pagas a contratar (US$ 1k/mês mínimo)

[[2026-04-24 - Ferramentas pagas a contratar para Dossie v9]] — Priorizadas:

**0. Claude Design (créditos)** — ALTA PRIORIDADE
- Trabalho visual de UI (cartinha, dossié, mapa, redesigns)
- Entrega 1-2 turns o que Claude Code demora horas
- **Já bloqueou:** Radar v2, módulo Pesquisas

**1. X (Twitter) API Basic — US$ 100-200/mês**
- Desbloqueia MID.2 para X (rede de discurso político mais ativa BR)
- Sem ela, perde ~30% do sinal

**2. NewsAPI.ai (Event Registry) ou Brandwatch — US$ 500-2k/mês**
- Texto integral matérias (GDELT só traz título+URL)
- Sentiment já calculado
- Cobertura jornais regionais BR
- Alternativa BR: Knewin / Cortex Intelligence

**3. AssemblyAI ou Deepgram — ~US$ 0.37/hora audio**
- Fallback quando YouTube sem captions auto-gerados
- ~1k h/mês = ~US$ 370/mês

**4. Kantar IBOPE / Comscore TV — sob consulta (R$ alto)**
- Exposição real TV (YouTube = só recortes/virais)
- Adie até cliente premium pedir

**5. Meta Content Library + TikTok Research API — zero (exige academica/non-profit)**
- Cross-platform sentiment Meta + TikTok
- Caminho: parceria universidade

**Stack mínima (X + NewsAPI):** US$ 1k/mês (~R$ 5k/mês 2026)
**Stack completa (+ AssemblyAI):** ~US$ 1.5k/mês (~R$ 7.5k/mês)

### MapLibre: decisão 2 modos

**Aprovado Cesar 25/04/2026** ([[Decisao - MapLibre dois modos historico futuro 2026-04-25]]):

- **Modo Histórico:** TSE votação/eleitos/forças historicamente
- **Modo Futuro:** Automação prospectiva (estratégia, base, lideranças, coordenadores)

**Outras seções que usam MapLibre:**
- Modulo Mapa principal (`/mazzel-preview/mapa`)
- Mapa do Cabo (`/mazzel-preview/cabo`) — território do cabo
- Campanha 2026 (`/mazzel-preview/campanha`) — mapa cercas
- Possivelmente Dossié (mapa eleitoral candidato)
- Possivelmente Estudo, Coordenadores, Lideranças

**Cada seção ajustada a sua necessidade — só mapa principal tem 2 modos completos.**

### Mapa Estratégico vs Mapa Eleitoral (decisão 25/04)

**Pivot importante** ([[Decisao - Mapa Estrategico vs Mapa Eleitoral 2026-04-25]]):

| Mapa | Foco | Onde fica | Status |
|------|------|-----------|--------|
| **Mapa Estratégico (NOVO, principal)** | Domínio territorial: equipe + lideranças + candidatos eleitos + emendas + scores Overall v9 | Sidebar principal `/mazzel-preview/mapa` | A redesenhar Claude Designer |
| **Mapa Eleitoral (existente)** | Votação histórica TSE | Sub-tela módulo **Estudo** | Reaproveitar logica drill-down |

**Justificativa:** Partido funciona como empresa. Mapa eleitoral = dado histórico. Mapa Estratégico = "como está minha operação territorial AGORA". Diariamente, quem usa quer ver o segundo.

**Reaproveita logica:** drill-down Brasil → UF → Município → Bairro → Microregião (já existe Mapa Eleitoral)

### Card Político V2 4:5 Instagram (zona protegida)

**Aprovado Cesar 24/04** — mudança siglas para v9:
- **Siglas atualizadas:** ATV/LEG/BSE/INF/MID/PAC (ao invés de VOT/EFI/ART/FID/FIN/TER)
- **Card embarcado:** aparece em Dossié individual + Radar cards grid
- **Zona protegida:** Card aprovado. Não alterar sem planejamento explícito.

### Tenant partido (layout hierárquico)

**Estrutura 9 perfis RBAC** ([[Decisão - 9 perfis RBAC + Cascata Cabo Eleitoral]]):

**Grupo A — Cadeia de comando campanha (cascata):**
1. Presidente do partido (tenant inteiro nacional)
2. Liderança estadual (UF)
3. Coordenador regional (conjunto municípios)
4. Coordenador territorial (bairros/zonas)
5. Cabo eleitoral (microterritório)

**Grupo B — Autoridades independentes:**
- Político eleito (com mandato)
- Candidato em campanha
- Equipe do político eleito

**Grupo C — Operação administrativa:**
- Time administrativo (CRM filiados, gestão interna)

**Grupo D — Super admin Mazzel:**
- Admin Mazzel (Cesar, plataforma inteira, todos tenants)

**Cascata designação:** cada nível designa próximo abaixo. Presidente pode pular níveis. Shortcut: designar qualquer função direto quando quiser.

**Painel Cabo (simplificado, pensado celular):**
- Agenda do dia
- Mapa da área
- Chat com coordenador + grupo cerca
- Comando de campo (check-in GPS, tarefas)
- Metas semana
- Registro rápido (foto + nota)

**Suporte 2 modos:**
- **Cabo autônomo:** check-in GPS ele mesmo
- **Cabo validado:** sem smartphone, coordenador valida presença (GPS coord + foto + nota)

**Implicação design:** Sidebar condicional por perfil (9 variações). Dashboard específico por perfil. Menu "Cabos Eleitorais" só para quem DESIGNA. Cabo não vê menu — só o que executa.

### Champion Page (página individual rica)

**Estrutura aprovada 16/04-16/04 (tarde):**
- Hero section (foto + nome + cargo + Overall + badges)
- 6 dimensões Overall em hexágono SVG
- Mapa eleitoral com seletor ciclo
- 9 seções: Desempenho, Legislativo, Financeiro, Mapa, Trajetória, Atividade, Alertas, Perfil, Emendas
- Todos blocos do dossié (9 seções)
- Layout assimétrico conforme referência Linear/Vercel

---

## 5. REGRAS E APRENDIZADOS DURADOUROS

### Filosofia imparcialidade narrativa

[[2026-04-24 - Filosofia imparcialidade narrativa]] — Princípio central do produto.

> "Na corrida do ouro ganha mais dinheiro quem vende pa."

Plataforma **narra fatos que dados contam**, em qualquer direção política. Motivos:
- Mercado real = múltiplos partidos (pode ser PT, PL, PSDB, UB)
- Credibilidade = zero viés
- Dados públicos TSE/Câmara/Senado/CGU/TCU são objetivos

**Nuances jurídicas críticas:** Não é "Ficha Limpa sim/não". Cada alerta precisa capturar:
- Instância do processo
- Motivo da decisão (mérito / foro / prescrição)
- Se foi reformado, justificativa
- Status atual
- Histórico completo tramitação

Exemplos: Lula (condenado Lava Jato → anulado foro → eleito presidente). Bolsonaro (inelegível tentativa golpe → controvérsia política). Nada ocultado, tudo contextualizado.

### Regras de comportamento

[[Regras de Comportamento]] — Governam interações com Cesar.

**Regra Zero — Previsibilidade:** Prever antes de executar. Se não consigo prever resultado, não executo — investigo primeiro. Velocidade só tem valor DEPOIS de previsibilidade.

**Derivadas:**
1. **Absorver profundidade:** Cesar comunica sistemas completos. Absorver TUDO antes de planejar. Se algo não está no plano, plano incompleto.
2. **Disciplina de entrega:** Nunca dizer "pronto" sem listar o que testei E o que NÃO testei.
3. **Engenharia disciplinada:** Módulo aprovado = zona protegida. Mapear impactos antes de alterar.
4. **Perguntar ao invés de chutar:** Com dúvida, PERGUNTAR. "Ou entrega certo, ou não faz."
5. **Honestidade acima de autopreservação:** Conclusão clara = falar direto, sem "mas" defensivo.
6. **Não dizer que entendeu sem entender:** Aprendido 16/04. Cesar pediu alinhar cards, eu disse "entendi" 2x sem entender. Resultado: mudança errada, reversão, frustração. **Regra:** se dúvida, PERGUNTAR com clareza ao invés de assumir.

**Regras operacionais:**
- Verificar head real via `ls -t` antes criar migration
- Reiniciar servidor local após mudanças frontend
- NUNCA push/deploy sem ordem explícita
- Nova conversa por feature, Grep antes Read, respostas pontuais
- NUNCA usar em-dash, sempre hífen simples

### Anti-patterns conhecidos

**Mapa:**
- Sidebar não sincroniza ao navegar níveis (Brasil → Estado → Município)
- Pixel-level detail (Voronoi com qualidade visual ruim)
- Confundir "mapa eleitoral" com "mapa estratégico" (2 conceitos diferentes, prioridades opostas)

**FIFA/Overall:**
- Aplicar mesma fórmula a cargos diferentes (Wagner ART=5 bug)
- Contar volume sem peso qualitativo (PEC != Lei do Dia do Vereador)
- Ignorar hierarquia comissões (CCJ Senado >>> Comissão Turismo)
- Não normalizar por quociente eleitoral (SP 270k != RR 10k)

**Hooks/Filtros:**
- Sidebar em `components/radar/` com filtros partido quebra zoom
- PainelDesempenhoPartido reescrito 3x, inconstente
- Cache não invalidado ao trocar ciclo

### Bugs históricos e resoluções

| Bug | Diagnóstico | Resolução |
|-----|---|---|
| **Wagner ART=5** (16/04) | Regra universal ART ignorava que Senador tem poder terminativo em comissões. Volume PLs proxy inverso de articulação. | Matriz por cargo com ART Senador = 25% (vs 20% Deputado). Sub-medidas reconceitualizadas. Sonnet estudo profundo 2026-04-20 |
| **Votos_total zero 10k eleitos antigos** (11/04) | ETL 04_votos_zona.py não mapeou candidaturas em votos_por_zona (problema match sequencial_tse). | Regra defensiva: eleito=true AND votos=0 → INDISPONÍVEL. ETL Trilha B trata versão corrigida |
| **Senado métrica 91%** (24/04) | `/senador/{cod}/votacoes` retorna só nominais, falta sessões plenárias. Endpoint descontinuado 01/02/2026. | Sprint 0: migrar pra `/plenario/agenda/mes` (universo) + `/votacao` (votos por senador) |
| **Suplentes EM_CRESCIMENTO zero** (11/04) | LAG exige MESMO `candidato_id` em 2 anos. Deduplicação falha sem CPF. | Melhorar deduplicação: nome+nascimento+UF como chave secundária. |
| **Mapa estado cinza** (15/04) | Auto-layer forçava votos sem partido → sem cor. | Remover COR_FILL_VIGENTES_PARTIDO com score_ponderado |
| **Sidebar nível município mostra estado** (12/04) | Falta sincronização: `/mapa/municipio/ibge` deve retornar só politicos aquele município, não estado. | Endpoint `/mapa/municipio/{ibge}/eleitos?cargo=` filtra corretamente. Frontend fetches contextual por nível. |

### Decisões que NÃO podem ser revertidas

- **Card V2 aprovado (24/04)** — Siglas ATV/LEG/BSE/INF/MID/PAC entram no produto. Não mudar para V3 sem replanejar.
- **Card V8 protegido** — Antigas siglas VOT/EFI/ART/FID/FIN/TER ficam em histórico/legacy. Novo card não as usa.
- **Fluxo OAuth confirmado** — Login via `cesar@uniaobrasil.org.br`. Backend CORS permite `localhost:3003` + `trycloudflare.com`
- **Matriz Overall v9 por cargo (24/04)** — 144 valores (6 dim × 3 sub × 8 cargos) com bonus arquetipos. Mudanças futuras via "override por módulo de calibração" (nó opcional), não reset.
- **Mapa Estratégico principal (25/04)** — Mapa Eleitoral sai de sidebar, vai pro Estudo. Decisão aprovada, briefing pro Designer pendente.
- **Worktrees isolados (25/04)** — PRESERVADA + V2 + root em folders separadas, branches separadas. Não unificá-los.
- **Plataforma V2 = definitiva (25/04)** — Após reunião UB-SP, descontinuar raiz. V2 é a versão.

### Consultar Cerebro antes de decisão arquitetural

[[2026-04-24 - Consultar Cerebro antes de decisao arquitetural]] — Padrão aprendido na sessão 25/04.

Quando agente novo entra em sessão, **SEMPRE consultar Obsidian Vault primeiro** antes:
- Deletar trabalho (pode ser legítimo, não alucinação)
- Propor arquitetura (pode contrariar decisão existente)
- Alterar módulo aprovado (pode quebrar zona protegida)
- Revertir mudancas (primeiro mapear contexto no Cerebro)

Exemplo: 25/04 eu propus reverter porte de `Plataforma-v2.html` sem consultar. Cesar pediu auditoria com Cerebro primeiro. 95% das mudanças eram legítimas.

### Aprendizados de design e padrões

**Dashboards modernos [[2026-04-20 - Dashboards modernos referencias para dossie politico]]:**
- Abolir tabs de tema. Scroll vertical único + índice lateral sticky.
- `align-items: start` em grids (nunca stretch)
- 3 decisões empty state (ocultar? versão degradada? estado completo?)
- Nunca 3+ empty states ilustrados na mesma tela (usar texto simples)
- Hierarquia visual: nível 1 manchete (64px, peso 900) → nível 2 suporte (28-36px, 600) → nível 3 contexto (gráficos) → nível 4 detalhe (colapsável)
- Cor semântica: verde=positivo, vermelho=alerta, amarelo=neutro, cinza=sem dados
- Mapa de 1 candidato SEM gradiente = enganoso. Sempre gradiente intensidade (0% a max%)
- Radar vazio: <3 eixos = barras horizontais; 5+ = radar parcial opacity 0.2

**Ciência política BR [[2026-04-20 - Ciencia politica BR e Overall FIFA por cargo]]:**
- Senador: ART peso maior (comissões terminativas CCJ/CAE/CAS). Volume PLs proxy inverso.
- Deputado Federal: trabalho em 4 frentes (legislativo + orçamentário + base + interno). Indicador-chave = emendas EXECUTADAS (não apresentadas).
- Vereador: 5 tiers (SP 55 vereadores != Mucajai). Mesma fórmula gera erro metodológico grave.
- Prefeito: 3 tiers (capitais ~ governador médio; médias ~ dependente transferências; pequenas ~ personalíssima)
- **10 anti-patterns críticos:** volume sem peso, regua errada por cargo, ignorar hierarquia, confundir presença com atividade, não normalizar por porte, etc

**Judiciário BR [[2026-04-20 - Sistema judiciario BR APIs e cruzamento CPF]]:**
- Onda 1 (ZERO custo): Ficha Limpa + CEIS/CEAF + TCU resolve 80-85% do valor
- DataJud: 90 tribunais, gratuito, rate ~30-60 req/min, defasagem 24-48h
- LGPD: dados públicos são públicos. Lei Acesso Informação 12.527/2011 prevalece. STJ 2024: "pessoas públicas têm proteção diminuída"
- Jurisprudência favorável: STJ AREsp 1.648.419/2024, TSE Resolução 23.714/2024, STF RE 673.707 (direito esquecimento rejeitado interesse público)

**Nomes vs Arquitetura [[2026-04-25 - Versoes simultaneas exigem isolamento fisico]]:**
- Versões simultâneas em mesmo working tree = desastre
- Nomenclatura em texto não basta. Isolamento FÍSICO obrigatório (worktree, branch, pasta)
- Custo "perguntar antes de apagar" < custo reverter algo apagado

---

## CONCLUSÃO

O projeto **Plataforma Eleitoral União Brasil** evoluiu em 14 dias (12/04-25/04) de "mapa com bugs" para **sistema integrado de inteligência política** com:
- ✅ 2 arquiteturas paralelas isoladas (PRESERVADA pronta para reunião; V2 em desenvolvimento)
- ✅ Overall v9 com 144 métricas (6 dim × 3 sub × 8 cargos) aprovado e documentado
- ✅ 9 perfis RBAC (cascata comando campanha + autoridades independentes + admin)
- ✅ Dossié raio-X 9 seções com dados jurídicos, financeiros, territoriais
- ✅ Mapa Eleitoral Globo G1-style com 1.795 microbairros SP
- ✅ Radar Político 4 tabs (Partidos, Políticos, Análise, Destaque)
- ✅ ETL pipeline 50+ scripts (17.5M votos, 463K candidatos, 5.571 municípios)
- ✅ Obsidian Cerebro com 43 notas documentando história completa

**Próximos 2 meses:** Estabilizar V2, entregar para Claude Designer revisar, portar resto de raiz, calibrar ETLs por cargo, abrir creditos Claude Design (bloqueante para Radar v2 + módulo Pesquisas).

**Visão:** Uma plataforma que seja simultaneamente ferramenta operacional para campanha 2026 E observatório dinâmico de inteligência política — tão acessível quanto um card FIFA, tão profunda quanto análise DIAP.

# BRIEFING NARRATIVA — FIM

---

**Documentação:**
- Obsidian: `/Users/cesarribeiro/Documents/Obsidian Vault/Cerebro Claude/`
- Repo principal: `/Users/cesarribeiro/projetos/uniao-brasil/` (root + PRESERVADA + V2)
- Backend: `codigo/backend/` (FastAPI)
- Frontend V2: `codigo/frontend/` (Next.js 15)
- Tunnel Cloudflare: https://secondary-donald-legacy-could.trycloudflare.com

**Contatos:**
- PM/Ideação: Cesar Ribeiro (cesar@uniaobrasil.org.br / cesarxmidia)
- Cliente: União Brasil (Anderson, liderança SP)
- Designer: Claude Designer (créditos em negociação 24/04)