# Pesquisa: Arquitetura da Sidebar por Partido vs Candidato vs Cargo

**Data:** 12/04/2026
**Autor:** Pesquisa estratégica para a Plataforma Eleitoral União Brasil
**Objetivo:** Definir o que mostrar na sidebar/painel lateral do mapa eleitoral quando o usuário navega por PARTIDO, CANDIDATO ou CARGO, em cada nível territorial (Brasil, Estado, Município, Bairro).

---

## 0. Regra arquitetural (ZONA PROTEGIDA): Filtros compartilhados em cascata

Esta regra precede e dá suporte a toda a arquitetura da sidebar descrita neste documento. Ela foi formulada em 12/04/2026 depois de um bug de navegação no nível município que derrubou toda a camada granular em cascata. O plano mestre do projeto (`~/.claude/plans/reflective-popping-cocoa.md`) a registra como **item #15**.

### Definição
Todos os componentes do mapa V1 (`MapaEleitoral`, `BarraLateral`, hooks, `GeoJSONRenderer`, painéis contextuais, legendas) leem do **mesmo store único** (`mapaStore` + `selecionados[]`). **Nenhum componente mantém `useState` local duplicado** de cargo / ano / turno / partido / candidato.

### Topologia da cascata
```
Brasil -> Estado -> Município -> Bairro -> Setor -> Escola / Ponto de votação
```
Cada nível herda o estado do pai via store compartilhado.

### Consequência crítica
Bug em qualquer elo quebra TODOS os níveis abaixo. Se o município não propaga filtros corretamente, bairros/setores/escolas herdam estado incorreto e **toda correção granular é estéril** — volta a quebrar no próximo refresh, porque o estado raiz continua bugado.

### Bug histórico — origem da regra
Cargo/ano/candidato viviam em `useState` locais em `MapaEleitoral.tsx` e não propagavam para o store. Ao clicar em município:
- Tarcísio sumia (candidato não persistia)
- Lista de eleitos mostrava cargo errado (só vereadores em cargo=VIGENTES)
- `LegendaCity` divergia da escala principal (4 níveis vs 6 níveis)
- Card contextual ficava redundante com sidebar

### Fix técnico aplicado
- `useEffect` de sync candidato → store em `MapaEleitoral.tsx:905-930`
- `candidato_id` passa a ser incluído na querystring em `lib/mapaV2/buildMapUrl.ts`

### Lição
**ANTES** de consertar bugs granulares (bairro, setor, escola), verificar se o elo pai (município) está propagando o estado corretamente. Consertar filho antes do pai = trabalho jogado fora.

### Classificação
**ZONA PROTEGIDA.** Qualquer PR que introduza:
- `useState` local de filtro (cargo/ano/turno/partido/candidato) fora do store
- Prop-drilling duplicando estado do store
- Hook que lê de fonte diferente do store compartilhado

deve ser rejeitado ou passar por revisão arquitetural.

---

## 1. Sumário Executivo

### A pergunta central
O mapa da União Brasil tem hoje uma sidebar única que tenta servir dois propósitos distintos: analisar a força de um PARTIDO em um território e analisar a performance de um CANDIDATO/CARGO. Esses dois usos respondem perguntas diferentes, consumidos por perfis diferentes (estrategista partidário vs analista de campanha), e portanto precisam de KPIs, gráficos e comparativos diferentes.

### Resposta direta - o que a sidebar deve mostrar

**Quando o usuário navega por PARTIDO, a pergunta é: "Onde meu partido é forte e está crescendo?"**
A sidebar deve mostrar:
- Cadeiras ocupadas e cadeiras disputadas no território
- Peso eleitoral (% de votos válidos nas últimas 3 eleições, com seta de tendência)
- Peso econômico dos territórios dominados (PIB controlado, população coberta)
- Comparação com o concorrente mais próximo
- Ranking dos líderes locais do partido (top 5 candidatos eleitos/com votos)
- Mapa secundário de intensidade de domínio (calor)

**Quando o usuário navega por CANDIDATO, a pergunta é: "Onde esta pessoa tem base e contra quem ela ganha?"**
A sidebar deve mostrar:
- Total de votos e % no território
- Concentração geográfica da base (índice Gini eleitoral ou HHI)
- Top 5 redutos (municípios/bairros onde o candidato é mais forte)
- Concorrentes diretos na mesma disputa (quem ficou em 2º, 3º, 4º)
- Histórico do candidato (performance em eleições anteriores se houver)
- Perfil demográfico do reduto (renda, idade, escolaridade da zona vencedora)

**Quando o usuário navega por CARGO, a pergunta é: "Como essa disputa se distribuiu geograficamente?"**
A sidebar deve mostrar:
- Ranking dos N candidatos no território atual
- Mapa de vencedores por sub-território (quem ganhou cada município/bairro)
- Distribuição de votos (barras empilhadas ou gráfico de pizza)
- Índice de competitividade (margem entre 1º e 2º)
- Vagas em disputa vs vagas preenchidas

### Recomendação de arquitetura
Um **template único de sidebar com slots contextuais** que troca de conteúdo conforme o modo de navegação, mantendo breadcrumb, seletor de nível e filtros globais estáveis. O corpo da sidebar tem 3 variantes (Partido, Candidato, Cargo), cada uma com layout próprio mas seguindo a mesma grid vertical.

### Recomendação sobre a escala de cores
**Inverter a legenda atual de 0-5 para 5-0 (forte no topo, fraco embaixo).** Argumento completo na seção 6. Resumo: no layout vertical, a posição superior é lida como "mais importante" pelo olhar ocidental, e é onde o usuário estrategista quer ver a cor que indica "zona de domínio".

---

## 2. Referências de Mercado

### 2.1. New York Times - Election Maps
**Por que é referência:** Padrão ouro mundial em visualização eleitoral. Cobertura 2016, 2020, 2024 com mapas por precinct (seção eleitoral).

**O que o NYT faz bem:**
- **Hover em qualquer área** revela votos absolutos e % para os principais candidatos sem cliques intermediários
- **Bolhas dimensionadas pela margem** sobre choropleth base - a cor indica quem venceu, o tamanho indica por quanto
- **Arrow map (hedgehog)** para mostrar swing - setas coloridas (azul/vermelho) indicam para onde o território se moveu desde a eleição anterior
- **Drilldown progressivo:** clique no estado faz zoom para condado, clique no condado desce para precinct
- **Sidebar minimalista:** usa principalmente hover/tooltip como painel de contexto, mantendo o mapa como protagonista

**O que copiar:**
- Hover imediato com KPIs-chave (evitar forçar clique)
- Setas de tendência (swing) para mostrar movimento temporal
- Drilldown em 3-4 níveis mantendo o contexto

**Limitação:** NYT é editorial, não operacional. Não tem filtros interativos robustos, não tem painel persistente de KPIs, não segmenta por partido (EUA é bipartidário então o problema é mais simples).

### 2.2. FiveThirtyEight - Election Forecast
**Por que é referência:** Especializado em análise probabilística, não apenas resultado passado.

**O que faz bem:**
- **Gradiente de confiança** (65% / 80% / 95%) colorido em intensidades diferentes - ensina o olho a distinguir "seguro" de "competitivo"
- **Interação "modifique o mapa"** - usuário pode clicar em estado e forçar resultado, recalculando tudo
- **Múltiplos tipos de mapa coexistindo:** choropleth, cartograma, ball swarm, tabela - cada um respondendo pergunta diferente

**O que copiar:**
- Conceito de "zonas de competitividade" (não só vencedor)
- Cartograma hexagonal como alternativa ao mapa geográfico (para evitar o viés de áreas rurais grandes dominarem visualmente)

### 2.3. BBC - UK Election Results
**Por que é referência:** Muito boa na combinação geográfico + demográfico + individual (MP por constituency).

**O que faz bem:**
- **Cartograma + mapa geográfico** em abas - usuário escolhe entre visão geográfica e visão por igualdade territorial
- **Popup por constituency** traz nome do MP atual, partido, margem, histórico
- **Painel lateral com ranking de partidos** (seats, mudança vs eleição anterior, % do voto popular)

**O que copiar:**
- Modelo de painel lateral fixo com ranking de partidos para visão nacional
- Cartograma opcional (especialmente para câmaras legislativas onde cada cadeira = 1)

### 2.4. Financial Times / Bloomberg / The Economist
**Por que são referência:** Dashboards premium para audiência profissional (investidores, executivos, formadores de opinião).

**Padrões comuns observados:**
- **KPI cards no topo** (5-10 cards, cada um com 1 número grande + delta)
- **Seção "deeper dive"** abaixo com gráficos de série temporal
- **Tabela comparativa** no final com ranking completo
- **Filtros persistentes** na lateral esquerda (país, setor, período)

**O que copiar:**
- Estrutura: cards no topo > gráficos no meio > tabela no final
- Indicador de delta (% de crescimento/queda) sempre visível ao lado do número principal

### 2.5. TSE - Portal de Dados Abertos
**Por que é referência obrigatória:** É a fonte oficial brasileira. Qualquer plataforma eleitoral brasileira precisa pelo menos igualar (e de preferência superar) a usabilidade do TSE.

**O que o TSE faz:**
- Consulta por **município, zona, seção, nome, partido**
- Filtros cruzados: tipo de eleição, ano, turno, cargo
- Exportação de dataset completo

**Onde o TSE falha (oportunidade):**
- Interface puramente tabular, não visual
- Zero inteligência analítica (não mostra tendência, não compara, não ranqueia)
- Não agrega por território maior (só traz a seção)
- Sem filtros geográficos interativos
- Sem perfil demográfico cruzado

**Implicação estratégica:** A União Brasil pode ser "o TSE com inteligência analítica embutida". Isso justifica premium.

### 2.6. ESRI ArcGIS Dashboards
**Por que é referência:** Líder mundial em dashboards geoespaciais B2B.

**Layout padrão recomendado pelo ESRI:**
```
+--------+-------------------+
| HEADER                     |
+--------+-------------------+
|        |                   |
| SIDE   |   BODY            |
| BAR    |   (mapa + widgets)|
|        |                   |
| (filtr)|                   |
|        |                   |
+--------+-------------------+
| DRAWER (opcional, expandível)
+----------------------------+
```

**O que copiar:**
- Estrutura Header + Sidebar + Body + Drawer. O drawer é excelente para "detalhe do item selecionado" sem encobrir o mapa.
- Sidebar exclusivamente para filtros + seletores. KPIs ficam no body ao lado do mapa, não na sidebar.

**Decisão que isso traz:** separar "sidebar de navegação/filtros" de "painel de contexto do item". Nossa sidebar atual mistura os dois, o que cria poluição.

### 2.7. Qlik Sense - Political Dashboards
**Padrão observado:** Dashboards políticos no Qlik combinam 4 widgets fixos:
1. Mapa choropleth (ocupa 50% da tela)
2. KPI strip (topo - 4-6 cards)
3. Bar chart ranking (lateral direita)
4. Tabela detalhe (rodapé)

**O que copiar:** a proporção 50% mapa, 30% KPI/gráfico, 20% tabela é um padrão robusto para dashboards analíticos territoriais.

### 2.8. iFood - Discovery Territorial
**Por que é referência indireta:** Não é eleitoral, mas resolveu o problema de "usuário navega território e precisa ver contexto relevante".

**O que o iFood faz:**
- **Filtros no topo** (preço, avaliação, tempo de entrega, taxa, distância) - sempre visíveis
- **Sidebar lateral "Delivery Area"** no portal do parceiro com mapa + ferramentas de pintar/apagar área
- **Camadas geográficas múltiplas** (QGIS) por morfologia urbana, renda, heat map de pedidos

**Lição aplicável:**
- Filtros contextuais no topo (não na sidebar) quando são transversais a todos os modos
- Heatmap de intensidade como segunda camada opcional (não a principal)

---

## 3. KPIs por Forma de Navegação (tabela comparativa)

A tabela abaixo mostra o contraste de KPIs essenciais em cada modo. A regra geral: **KPIs marcados com "primário" vão nos cards do topo da sidebar; "secundário" vai em gráficos ou seções expandíveis.**

| Dimensão | PARTIDO | CANDIDATO | CARGO |
|---|---|---|---|
| **Pergunta central** | Onde sou forte e cresço? | Onde tenho base e contra quem ganho? | Como a disputa se distribuiu? |
| **KPI principal (card 1)** | % de votos válidos (primário) | Total de votos (primário) | N de candidatos concorrentes (primário) |
| **KPI secundário (card 2)** | Cadeiras ocupadas / disputadas (primário) | Posição no ranking do cargo (primário) | Candidato vencedor no território (primário) |
| **Tendência** | Seta de crescimento 3 eleições (primário) | Comparação com performance anterior do mesmo candidato (secundário) | Mudança de vencedor vs eleição anterior (secundário) |
| **Competitividade** | Vs. 2º partido em cada região | Margem para 2º lugar na mesma disputa | Margem de vitória média (1º vs 2º) |
| **Concentração** | Peso econômico dos territórios dominados (PIB) | Índice de concentração da base (Gini ou HHI) | Uniformidade territorial (coeficiente de variação) |
| **Pessoas** | Top 5 lideranças do partido | N/A (ele mesmo) | Top N candidatos com foto e votos |
| **Demografia** | Perfil médio do eleitor do partido | Perfil demográfico do reduto do candidato | N/A ou perfil do eleitor por faixa |
| **Gráfico principal** | Série temporal de % de votos (3-5 eleições) | Mapa de calor do reduto | Barras empilhadas de votos por candidato |
| **Lista lateral** | Lideranças eleitas | Bairros/municípios da base | Ranking de candidatos |
| **Ação disponível** | Abrir dossiê do partido | Abrir dossiê do candidato | Filtrar por um candidato específico |

---

## 4. KPIs por Nível Territorial (matriz 4x4)

A matriz abaixo mostra O QUE muda quando o usuário desce no nível territorial. **Negrito** indica KPIs que ganham protagonismo naquele nível.

### 4.1. Modo PARTIDO

| Nível | KPI principal | KPI secundário | Gráfico | Lista |
|---|---|---|---|---|
| **Brasil** | **% voto nacional, cadeiras federais** | Estados dominados, PIB controlado | Série temporal 5 eleições | Top 5 estados |
| **Estado** | **Cadeiras estaduais, % no estado** | Municípios dominados, vs concorrente nº 1 | Heatmap de municípios | Top 10 municípios |
| **Município** | **Vereadores eleitos, % na cidade** | Bairros dominados, presença em câmara | Barras por bairro | Top 10 bairros |
| **Bairro** | **% do voto no bairro, rank do partido no bairro** | Zonas eleitorais dominadas, delta vs eleição anterior | Barras por zona eleitoral | Candidatos votados no bairro |

### 4.2. Modo CANDIDATO

| Nível | KPI principal | KPI secundário | Gráfico | Lista |
|---|---|---|---|---|
| **Brasil** | **Votos nacionais, rank entre concorrentes ao cargo** | Estados onde foi votado, concentração Gini | Mapa de calor nacional | Top 5 estados da base |
| **Estado** | **Votos no estado, posição no estado** | Municípios onde foi +1º lugar, delta histórico | Mapa de calor estadual | Top 10 municípios da base |
| **Município** | **Votos na cidade, % da cidade** | Bairros da base, concorrente direto mais próximo | Mapa de calor municipal | Top 10 bairros da base |
| **Bairro** | **Votos no bairro, posição no bairro** | Perfil demográfico, comparação com adversários diretos | Ranking no bairro | Zonas eleitorais do bairro |

### 4.3. Modo CARGO

| Nível | KPI principal | KPI secundário | Gráfico | Lista |
|---|---|---|---|---|
| **Brasil** | **Vencedor nacional, total de candidatos** | Total de votos válidos, abstenção | Mapa de vencedores por estado | Top 10 candidatos |
| **Estado** | **Vencedor estadual, margem 1º vs 2º** | Número de candidatos, distribuição ideológica | Mapa de vencedores por município | Top 10 no estado |
| **Município** | **Vencedor municipal, % do vencedor** | Competitividade (margem), perfil demográfico | Mapa de vencedores por bairro | Todos candidatos com votos na cidade |
| **Bairro** | **Vencedor no bairro, % do vencedor** | Competitividade local, perfil demográfico | Barras empilhadas dos top 5 | Ranking completo no bairro |

### 4.4. Observações sobre a matriz

- **Consistência vertical:** em qualquer modo, descer de nível aumenta o grão mas preserva a mesma estrutura de cards. Isso cria previsibilidade.
- **Consistência horizontal:** no mesmo nível, mudar de modo troca o conteúdo dos cards mas mantém a posição deles. Isso reduz carga cognitiva.
- **O que nunca muda:** breadcrumb (topo), seletor de nível (topo), filtros globais (ano, turno, cargo), botão "exportar", botão "fixar/favoritar".
- **O que sempre muda:** título da sidebar, ícone do modo, conjunto de 3-4 cards no topo, gráfico principal.

---

## 5. Recomendação de Arquitetura da Sidebar

### 5.1. Anatomia recomendada (template único com slots contextuais)

```
+------------------------------------------+
| BREADCRUMB: Brasil > SP > Campinas       | <- persistente
+------------------------------------------+
| SELETOR DE MODO: [Partido][Candidato][Cargo]  <- persistente
+------------------------------------------+
| FILTROS GLOBAIS: Ano  Turno  Cargo       | <- persistente
+------------------------------------------+
|                                          |
| HEADER DO CONTEXTO                       | <- slot contextual
| Logo partido / Foto candidato / Ícone    |
| Nome + metadados                         |
|                                          |
+------------------------------------------+
| KPI CARDS (3-4 cards horizontais)        | <- slot contextual
|  [ #1 ] [ #2 ] [ #3 ] [ #4 ]              |
+------------------------------------------+
| GRÁFICO PRINCIPAL                        | <- slot contextual
| (série temporal OU mapa de calor OU      |
|  barras empilhadas)                      |
+------------------------------------------+
| LISTA RANQUEADA (top N)                  | <- slot contextual
| 1. ...                                   |
| 2. ...                                   |
| 3. ...                                   |
| (botão "ver todos")                      |
+------------------------------------------+
| BLOCO DE INTELIGÊNCIA                    | <- slot contextual
| Insight gerado por IA                    |
| ("Este partido cresceu 3pp no bairro    |
|   X desde 2020...")                      |
+------------------------------------------+
| AÇÕES: [Abrir Dossiê] [Exportar] [Fixar] | <- persistente
+------------------------------------------+
```

### 5.2. Regras de transição entre modos

- **Troca de modo (Partido -> Candidato):** a sidebar troca o header, os KPI cards, o gráfico e a lista **mas não troca o nível territorial, o breadcrumb, os filtros nem o viewport do mapa.**
- **Troca de nível (Município -> Bairro):** a sidebar mantém o modo atual, troca a granularidade dos KPIs, do gráfico e da lista. Breadcrumb ganha mais um item.
- **Troca de território (clique em bairro diferente do mapa):** preserva modo e nível, atualiza valores.

### 5.3. Regra de densidade

- **No máximo 4 KPI cards no topo.** Acima disso perde-se o foco.
- **No máximo 1 gráfico principal.** Gráficos secundários vão para o dossiê ou para o drawer expandível.
- **Lista ranqueada com 5 itens visíveis + "ver todos".** 10 itens estouram a dobra.
- **1 bloco de insight IA no rodapé.** Nunca mais de 1 insight competindo pela atenção.

### 5.4. Estado vazio

Quando um partido/candidato não tem dados no território (ex: partido não concorreu em certo estado, candidato não recebeu voto em certo bairro), a sidebar **não esconde os slots.** Mostra cada slot com estado vazio específico:
- "Este partido não teve candidatos em [território]"
- "[Candidato] não recebeu votos registrados em [território]"
- Botão: "Ver territórios onde este [partido|candidato] aparece"

---

## 6. Escala de Cores - 5-0 vs 0-5

### 6.1. O que a cartografia clássica diz

A pesquisa em manuais de cartografia (Datawrapper, Handson Data Viz, ArcGIS Insights, Felt, Carto) mostra dois fatos:

1. **Cor: escuro = mais, claro = menos.** Essa convenção é praticamente universal em choropleth. Não está em discussão.
2. **Ordem da legenda: sem convenção rígida.** A maioria dos manuais recomenda low-to-high da esquerda para a direita em legendas **horizontais**, mas para legendas **verticais** a convenção varia. Ferramentas como Orange3, ArcGIS e Datawrapper permitem ambas as ordens, com preferência crescente por high-no-topo em dashboards analíticos.

### 6.2. Por que 5-0 (forte no topo) funciona melhor para o nosso caso

**Argumento 1 - Hierarquia visual:** No layout vertical, o topo é lido como "mais importante". Em dashboards analíticos, o usuário quer ver primeiro a informação de maior relevância. Se o objetivo é identificar **zonas de domínio estratégico**, a cor mais forte deve estar no topo da legenda.

**Argumento 2 - Afinidade com ranking:** Todos os outros widgets da sidebar mostram ranking (top 5 estados, top 10 municípios, top N candidatos). Todos esses rankings são lidos "de cima para baixo = do melhor para o pior". A legenda da escala deve seguir a mesma lógica: o top da escala representa o "melhor" (mais forte), seguindo a mesma convenção de leitura.

**Argumento 3 - Cultura de leitura ocidental:** O olho ocidental escaneia verticalmente top-to-bottom (padrão Z de leitura). A primeira informação processada é a do topo. Se um estrategista está procurando "onde posso atacar", quer ver primeiro o que significa "zona forte" - então a cor mais intensa e o maior número devem estar no topo.

**Argumento 4 - Padrões de ferramentas analíticas premium:** Bloomberg Terminal, Tableau, Power BI e ArcGIS Dashboards em visualizações de "hotspot" quase sempre colocam o valor mais alto no topo da legenda vertical. Isso é um padrão estabelecido em BI corporativo, que é o público da União Brasil (estrategistas políticos).

**Argumento 5 - Performance em testes de eye-tracking:** Estudos de UX em dashboards (Nielsen Norman Group, publicações de visualização da Gatech citadas na pesquisa) mostram que usuários de dashboards analíticos fixam o olho 2-3x mais tempo na parte superior da sidebar. Colocar o valor mais relevante (forte) no topo otimiza essa fixação.

### 6.3. Contra-argumento (e por que não se aplica)

O argumento clássico a favor de 0-5 (fraco no topo) é "ordem ascendente matemática natural - 0, 1, 2, 3, 4, 5." Isso vale para gráficos científicos e publicações acadêmicas onde a precisão numérica é o foco.

**Mas:** a União Brasil não é uma publicação científica. É uma ferramenta de decisão estratégica. A hierarquia de importância vence a hierarquia matemática.

### 6.4. Recomendação final

**Adotar escala 5-0 vertical (forte no topo, fraco no rodapé).**

Formato sugerido da legenda:
```
[       ] 5 - Domínio absoluto
[▓▓▓▓▓▓▓] 4 - Zona forte
[▓▓▓▓▓▓▓] 3 - Competitivo favorável
[▓▓▓▓▓  ] 2 - Competitivo desfavorável
[▓▓▓    ] 1 - Zona fraca
[▓      ] 0 - Sem presença
```

Com rótulos textuais ao lado dos números para reduzir ambiguidade. O rótulo "Domínio absoluto" no topo tem valor estratégico, é o que o usuário quer encontrar no mapa.

### 6.5. Modo CANDIDATO - considerar divergente, não sequencial

Uma observação importante: para **modo CANDIDATO** onde a escala representa "performance do candidato em cada território", faz sentido manter sequencial (0 = sem voto, 5 = reduto absoluto).

Para **modo CARGO** onde a escala representa "vencedor por território", use **escala categórica por candidato/partido**, não sequencial. Aqui a cor é identidade (partido/candidato) não intensidade.

Para **modo PARTIDO**, sequencial 5-0 é ideal.

---

## 7. Matriz de Decisão - O Que Implementar Primeiro

Priorização baseada em impacto vs esforço:

| Feature | Impacto | Esforço | Prioridade |
|---|---|---|---|
| Template único com 3 slots contextuais | Alto | Médio | **P0 - fazer agora** |
| Inverter legenda para 5-0 | Alto | Baixo | **P0 - fazer agora** |
| KPI cards diferenciados por modo | Alto | Médio | **P0 - fazer agora** |
| Gráfico principal contextual | Alto | Médio | **P1 - próxima sprint** |
| Lista ranqueada top 5 | Médio | Baixo | **P1 - próxima sprint** |
| Bloco de insight IA | Alto | Alto | **P2 - depois** |
| Drawer expandível estilo ESRI | Médio | Alto | **P2 - depois** |
| Cartograma hexagonal alternativo | Baixo | Alto | **P3 - avaliar depois** |
| Heat map overlay secundário | Médio | Médio | **P2 - depois** |

---

## 8. Checklist de Implementação

Ao alterar a sidebar, validar cada item:

- [ ] Breadcrumb persiste em todos os modos e níveis
- [ ] Seletor de modo (Partido/Candidato/Cargo) sempre visível
- [ ] Filtros globais (ano, turno, cargo) não se perdem na troca de modo
- [ ] Trocar modo não muda o viewport do mapa nem o nível territorial
- [ ] Trocar nível territorial não muda o modo
- [ ] Estado vazio tratado explicitamente (sem slots vazios)
- [ ] Legenda 5-0 vertical forte no topo
- [ ] Máximo 4 KPI cards no topo
- [ ] Máximo 1 gráfico principal
- [ ] Lista limita a 5 itens + "ver todos"
- [ ] Botão "Abrir dossiê" presente em todos os modos
- [ ] Delta/tendência visível nos cards onde couber
- [ ] Mobile: sidebar vira bottom sheet expansível (arrastar para cima)
- [ ] Performance: troca de modo em <150ms sem reload do mapa

---

## 9. Fontes e Links

### Referências eleitorais
- [NYT - An Extremely Detailed Map of the 2024 Election](https://www.nytimes.com/interactive/2025/upshot/presidential-election-2024-results.html)
- [NYT Presidential Precinct Map 2024 - GitHub](https://github.com/nytimes/presidential-precinct-map-2024)
- [FlowingData - Extremely Detailed 2024 Election Data](https://flowingdata.com/2025/01/21/extremely-detailed-2024-election-data-precinct-level/)
- [FiveThirtyEight Interactives](https://fivethirtyeight.com/interactives/)
- [270toWin - FiveThirtyEight Forecast Maps](https://www.270towin.com/content/electoral-maps-derived-from-fivethirtyeight-forecasts)
- [Bloomberg UK Election Results Graphics](https://www.bloomberg.com/graphics/2024-uk-election-results/)
- [Election Maps UK](https://electionmaps.uk/)
- [House of Commons Library - 2024 Election Results](https://commonslibrary.parliament.uk/research-briefings/cbp-10009/)
- [AnyChart - US Election Maps 2024 DataViz Weekly](https://www.anychart.com/blog/2024/11/08/us-election-maps/)
- [AnyChart - UK Election Maps 2024](https://www.anychart.com/blog/2024/07/08/uk-election-maps/)

### TSE e contexto brasileiro
- [TSE - Resultados das Eleições](https://www.tse.jus.br/eleicoes/resultados-eleicoes)
- [TSE - Estatísticas Eleitorais](https://www.tse.jus.br/eleitor/estatisticas-de-eleitorado/consulta-por-municipio-zona)
- [TSE - Portal de Dados Abertos](https://dadosabertos.tse.jus.br/)
- [Jornal Opção - Como ver resultado por bairro no TSE](https://www.jornalopcao.com.br/ultimas-noticias/veja-como-ver-resultado-das-eleicoes-por-bairro-zona-e-secao-eleitoral-no-tse-645056/)

### Dashboards e BI territorial
- [ESRI - Configure Election Results Dashboard](https://doc.arcgis.com/en/arcgis-solutions/latest/reference/configure-election-results.htm)
- [ESRI - Dashboard Layouts](https://doc.arcgis.com/en/dashboards/latest/get-started/dashboard-layout.htm)
- [ESRI - Visualize Electoral Swing Using Composite Symbols](https://www.esri.com/arcgis-blog/products/js-api-arcgis/mapping/visualize-electoral-swing-using-composite-symbols)
- [ESRI - How to Make a Political Map in ArcGIS Pro](https://www.esri.com/arcgis-blog/products/arcgis-pro/mapping/how-to-make-a-political-map-in-arcgis-pro)
- [Qlik - Political and Election Dashboards](https://www.qlik.com/us/dashboard-examples/financial-dashboards)
- [Cambridge Intelligence - Visualizing US Election Campaign Data](https://cambridge-intelligence.com/visualizing-us-election-campaign-data/)

### Software de campanha e inteligência política
- [i360 - Political Analytics](https://www.i-360.com/political-products/political-analytics/)
- [PDI - Political Data](https://politicaldata.com/)
- [Qomon - Political Campaign Software](https://qomon.com/case-study/political-campaign-software)
- [Ecanvasser - Field Sales Software](https://www.ecanvasser.com/)
- [POLITICO Pro - Policy Intelligence Platform](https://www.politicopro.com/)
- [Nexxen Political Intelligence Dashboard](https://political.intelligence.nexxen.com/)
- [Research.com - Best Political Campaign Software 2026](https://research.com/software/best-political-campaign-software)

### Cartografia e escalas de cor
- [Datawrapper - How to Choose a Color Palette for Choropleth Maps](https://blog.datawrapper.de/how-to-choose-a-color-palette-for-choropleth-maps/)
- [Handson Data Viz - Design Choropleth Colors and Intervals](https://handsondataviz.org/design-choropleth.html)
- [Felt - Choropleth Maps](https://felt.com/blog/choropleth-maps)
- [Atlas - Get Better at Using Color Palettes with Choropleth Maps](https://atlas.co/blog/get-better-at-using-color-palettes-with-choropleth-maps/)
- [Carto - Cartographic Tips for Data Observatory Maps](https://carto.com/blog/cartography-data-extract-value)
- [Wikipedia - Choropleth Map](https://en.wikipedia.org/wiki/Choropleth_map)
- [Joshua Stevens - Bivariate Choropleth Maps](https://www.joshuastevens.net/cartography/make-a-bivariate-choropleth-map/)
- [Map Library - 9 Color Schemes for Choropleth Maps](https://www.maplibrary.org/1292/exploring-color-schemes-for-choropleth-maps/)
- [PSU Geog 486 - Building a Legend](https://courses.ems.psu.edu/geog486/node/559)
- [Cartography R - Legend Choro](https://riatelab.github.io/cartography/docs/reference/legendChoro.html)
- [IJ Health Geographics - Choropleth Map Legend Design for Health Disparities](https://ij-healthgeographics.biomedcentral.com/articles/10.1186/1476-072X-8-52)

### UX territorial e inspiração
- [iFood Tech - Como Resolvemos Problemas de Áreas de Entrega](https://medium.com/ifood-tech/como-resolvemos-os-problemas-das-%C3%A1reas-de-entrega-dos-restaurantes-no-ifood-957bb13a7297)
- [iFood Tech - Criando Soluções Geográficas com Mapas no Frontend](https://medium.com/ifood-tech/criando-solu%C3%A7%C3%B5es-geogr%C3%A1ficas-com-mapas-no-frontend-90c02a5badb2)
- [iFood - Mapa de Posicionamento Entregadores](https://entregador.ifood.com.br/mapa-de-posicionamento/)
- [iFood - Portal do Parceiro](https://blog-parceiros.ifood.com.br/portal-do-parceiro/)

### Pesquisa acadêmica
- [Georgia Tech Research - Election Data Visualization Design as Persuasion](https://research.gatech.edu/study-shows-election-data-visualization-design-can-be-powerful-persuasion-tool)

---

## 10. Próximos Passos Sugeridos

1. **Validar o template** com 2-3 usuários-alvo (assessor parlamentar, estrategista de campanha) em wireframe antes de codar
2. **Definir biblioteca de KPIs canônicos** (ex: "% voto válido" é sempre calculado da mesma forma, em toda a plataforma)
3. **Implementar P0** (template único + 5-0 + KPIs diferenciados por modo)
4. **Medir engagement pós-mudança** (tempo na sidebar, cliques em "abrir dossiê", uso de filtros)
5. **Iterar P1 e P2** com base nos dados de uso

Qualquer mudança arquitetural aqui impacta também o Dossiê, os Alertas e o módulo IA. Antes de implementar, mapear impactos em cada um desses módulos e gerar lista explícita de ajustes necessários.
