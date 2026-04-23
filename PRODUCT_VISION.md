# Plataforma Mazzel de Inteligência Eleitoral

**Documento de visão consolidada do produto.**
Última atualização: 2026-04-11.
Esta é a fonte da verdade do que a plataforma é, para quem é, como se vende e como se constrói. Toda decisão de produto, design e código deve consultar este documento antes de ser tomada. Quando o documento estiver desatualizado, atualize-o antes de codar.

---

## 1. Identidade do produto

> **O sistema administrativo mais completo de um partido político, disfarçado de plataforma de inteligência eleitoral.**

A plataforma Mazzel não é um BI eleitoral. Não é um CRM de campanha. Não é um GIS partidário. É **as três coisas juntas, num único produto**, organizadas em torno de uma promessa central:

**Dar ao presidente do partido o controle real sobre as pessoas, o dinheiro e o território da operação política dele.**

O produto resolve um problema estrutural do mercado político brasileiro: a opacidade arcaica que protege figuras improdutivas, esconde resultados de campo, e impede que o partido saiba onde investir o próximo real. A plataforma transforma o partido num organismo mensurável.

### O que a plataforma NÃO é

- Não é um produto de visualização de eleições passadas (isso é vitrine, não produto).
- Não é um aplicativo de campanha por candidato (o cliente é o partido, não o candidato individual).
- Não é uma ferramenta jornalística (o público é interno do partido, não o eleitor comum).

### Frase de elevador

> "Plataforma que controla o partido inteiro, do presidente nacional ao cabo eleitoral na esquina, com mapa, dossiê, agenda e accountability. Mostra onde o partido está forte, quem está trabalhando para construir o futuro, e quem está só recebendo salário."

---

## 2. Modelo comercial - 3 versões

A plataforma é vendida em 3 níveis. O nível define o que o cliente vê, com que precisão, e quanto ele paga.

| | **Demo (público)** | **Single (pago básico)** | **Premium (pago completo)** |
|---|---|---|---|
| Quem acessa | Visitante do site sem login | Partido contratante, isolado | Partido contratante, visão completa |
| Dados | Amostra fixa, eleição passada, partido fictício | Apenas o próprio partido | Todos os partidos, com nomes |
| Comparações | "Veja como funcionaria com seu partido" (CTA) | Contra média do mercado, sem nomear adversário | Contra qualquer partido, nominalmente |
| Precisão dos números | Exato (são dados de exemplo) | **Faixas e médias** | Números exatos |
| Capítulos do mapa | 2 (gostinho) | 4 (operação básica) | 7 (todos) |
| Drill geográfico | Brasil + Estado | + Município | + Distrito + Zona + Escola |
| Dossiê do político | Não | Apenas dos próprios | Todos |
| IA / linguagem natural | Não | Limitada (3 perguntas/mês) | Liberada |
| Exportação PDF | Não | Não | Sim |
| Modo Operação (cabos/coordenadores) | Não | Sim | Sim |

### Princípio da imprecisão deliberada (Single)

A imprecisão do plano Single **não é limitação técnica, é alavanca comercial**. Protege 3 coisas ao mesmo tempo: a propriedade intelectual da plataforma, a confidencialidade entre partidos, e o motivo de existir do plano Premium.

**Como materializar a imprecisão:**

- **Faixas em vez de números:** "entre 25 e 35 prefeitos" em vez de "28".
- **Posição relativa:** "3º maior partido em SP" em vez de "11,4% dos votos".
- **Indicadores qualitativos:** "forte / médio / fraco / ausente" em vez de farol numérico.
- **Agregação temporal:** "média dos últimos 2 ciclos" em vez de "2024".
- **Gráficos sem eixos numéricos:** o partido vê a curva, não o valor absoluto.

**Tamanho das faixas (regra padrão):**

- 0-50 unidades: faixa de 5 ("25 a 30")
- 51-200 unidades: faixa de 10
- 201+ unidades: faixa de 25

A imprecisão é aplicada **no backend**, dentro de um serviço único de obfuscação que recebe `nivel_de_acesso` e devolve a versão correta dos números. O frontend não decide nada sobre obfuscação.

### Demo como produto de marketing

O Demo é tratado como produto separado, não como "versão limitada".

- **URL pública** sem login (ex: `mapa.[plataforma].com/demonstracao`).
- **Tenant fictício** chamado "Partido Demonstração" com sigla DEMO 99 (decisão a confirmar: usar partido real neutro).
- **Dados congelados** de uma eleição passada (2020 ou 2018), 100% TSE público.
- **CTA persistente** no rodapé da sidebar: "Veja seu partido aqui dentro" → formulário com nome, partido, cargo, telefone.
- **Sem cadastro, sem login, sem download.**

---

## 3. Atores da plataforma e hierarquia

A plataforma reflete a estrutura real de um partido brasileiro.

```
PRESIDENTE NACIONAL DO PARTIDO
        |
PRESIDENTE ESTADUAL (ex: Milton Leite - SP)
        |
COORDENADOR REGIONAL (responsável por subconjunto do estado)
        |
LIDERANÇA TERRITORIAL (movimenta votos em bairros e escolas)
        |
CABO ELEITORAL (atua no chão, em escolas específicas)
        |
ELEITOR / FILIADO
```

Em paralelo, fora da pirâmide de execução, existem os **políticos** (vereadores, deputados, prefeitos, governadores, senadores) eleitos pelo partido. O político tem **acesso próprio à plataforma**, com tudo personalizado para o ponto de vista dele: a história dele, as escolas dele, os cabos que atuaram para ele, a votação dele.

### Tabela de atores

| Ator | Função | Escopo | O que vê na plataforma |
|---|---|---|---|
| **Presidente Nacional** | Decisão estratégica do partido | Brasil inteiro | Tudo |
| **Presidente Estadual** | Cresce o partido no estado, nomeia coordenadores | 1 estado | Tudo do estado |
| **Coordenador Regional** | Coordena cabos e lideranças na região atribuída | Conjunto de municípios contíguos | Tudo da região |
| **Liderança** | Movimenta votos no bairro / escola | Bairro + escolas vinculadas | Próprio território |
| **Cabo Eleitoral** | Entrega santinho, faz porta a porta | Escolas específicas | Próprias escolas |
| **Político eleito ou candidato** | Consulta a própria votação e equipe | Próprias zonas de influência | Apenas dados próprios |
| **Filiado** | Base do partido | Sem acesso (futuro) | - |
| **Funcionário** | Operacional, configurado caso a caso | Variável | Variável |

---

## 4. RBAC com escopo territorial (regra dura)

**Toda ação de designação, edição ou criação na plataforma é validada contra o polígono de jurisdição do usuário que está executando.**

### Regras

1. Cada usuário com cargo tem um **polígono de jurisdição** (lista de municípios, ou cerca virtual, ou estado).
2. Toda ação que afeta uma entidade territorial (criar cabo, atribuir liderança, designar coordenador, registrar visita) checa: **a entidade alvo está dentro do polígono do usuário?**
3. Se não está, o backend **recusa** com mensagem clara: "Esta ação está fora da sua área de atuação. Fale com seu superior hierárquico."
4. Cargo superior pode atuar dentro do polígono dos subordinados (presidente estadual pode designar dentro de qualquer região do estado dele).
5. Cargo inferior **nunca** pode atuar fora do próprio polígono (coordenador da Zona Oeste de São Paulo não cria cabo em Guarulhos).
6. Mudanças de polígono de jurisdição só podem ser feitas pelo cargo imediatamente superior, e ficam registradas na auditoria.

### Implementação

- Tabela `usuarios` ganha relação com `polígono de jurisdição` (pode reaproveitar `cercas_virtuais` ou criar tabela `jurisdicoes` separada).
- Decorator no backend: `@requer_jurisdicao(entidade)` que valida automaticamente.
- Cada endpoint de criação/edição roda esse decorator antes da regra de negócio.
- Toda recusa por jurisdição vira registro no `auditoria_log` (para detectar tentativas de violação).

---

## 5. Os módulos da plataforma

A plataforma se organiza em 8 módulos. Todos compartilham o mesmo banco, o mesmo RBAC, a mesma identidade visual, e **todos alimentam ou consomem o Mapa Eleitoral**.

| Módulo | Função | Estado atual |
|---|---|---|
| **Visão Geral** | Painel de comando do presidente. Indicadores grandes, tudo num olhar. | A reconstruir (atual está amador) |
| **Mapa Eleitoral** | Inteligência espacial - vitrine X9 da plataforma | Em rebuild (esta rodada) |
| **Radar Político** | Estudo de pessoas - dossiês, fotos, classificação por potencial | Existe, precisa melhoria visual e cobertura de fotos |
| **Operação** | Cadastro e medição de coordenadores, lideranças, cabos. Quem trabalha onde, com qual desempenho. Agenda de visitas. | Backend já existe (coordenadores, lideranças, cabos, cercas, performance). Falta interface e comprovação in-loco. |
| **Filiados** | Base do partido com validação CPF e Título | Existe |
| **IA** | Linguagem natural sobre tudo acima | Existe |
| **Alertas** | Notificações de eventos críticos (queda de cabo, inatividade de coordenador, etc) | Existe (estrutura) |
| **Auditoria** | Log imutável de toda ação | Existe |

---

## 6. O Mapa Eleitoral (módulo principal desta rodada)

O Mapa é o **lugar onde toda a vida do partido se materializa visualmente**. É o painel central. É o que o presidente do partido olha primeiro quando abre a plataforma. É o que ele mostra para outros presidentes e fica orgulhoso.

### 6.1 Os 3 pilares conectados

```
┌────────────────────────────────────────────┐
│  TOP BAR (logo + busca + avatar)           │
├──────────────────────────────────┬─────────┤
│                                  │         │
│                                  │ SIDEBAR │
│        MAPA (centro)             │ DIREITA │
│                                  │ (narra- │
│   (com botões nas extremidades)  │  dor)   │
│                                  │         │
│                                  │         │
└──────────────────────────────────┴─────────┘
```

**Regra única dos 3 pilares:** toda interação atualiza os outros dois pilares simultaneamente. Nunca um pilar fica defasado dos outros.

### 6.2 Top bar (fina, fixa, identidade)

- Logo do partido cliente + nome ("Mapa Eleitoral - União Brasil")
- **Único campo de busca** grande: "Buscar cidade ou político"
- Avatar do usuário (canto direito)
- **Não tem filtro nenhum.** Filtros vivem nos capítulos.

### 6.3 Sidebar direita (narradora, sempre visível)

A sidebar é um **narrador de jornal**, não um menu, não um filtro. Ela conta a história em linguagem humana, com texto grande, indicadores visuais simples, e botões grandes que disparam a próxima ação.

**Regra de ouro da sidebar:** nunca tem dropdown, nunca tem checkbox, nunca tem campo de input. Só texto, indicadores visuais, fotos, logos e botões.

**Estado padrão (Brasil):**
```
─────────────────────────────────
   UNIÃO BRASIL HOJE
─────────────────────────────────

   412 prefeitos eleitos em 2024.

   Crescemos 18% desde 2020.

   Maior força: Bahia (47 prefeitos)
   Maior crescimento: Tocantins (+9)
   Maior risco: Mato Grosso (-3)

   [ Ver onde estamos fortes ]
   [ Ver onde estamos crescendo ]
   [ Ver os 10 maiores eleitos ]
─────────────────────────────────
```

A sidebar reescreve sozinha quando o usuário muda o nível geográfico, o capítulo ativo, ou clica numa entidade no mapa.

### 6.4 Mapa (centro, com botões nas extremidades)

Os controles ficam **nas bordas do mapa**, posicionados como num game console: grandes, redondos, com sombra suave, claramente clicáveis.

- **Borda superior do mapa:** linha de **7 botões dos capítulos**. Botão ativo destacado.
- **Borda esquerda do mapa:** breadcrumb vertical clicável - "Brasil > São Paulo > Campinas". Cada nível volta com 1 clique.
- **Borda inferior do mapa:** **linha do tempo deslizante** grande, com 2018 / 2020 / 2022 / 2024 como bolinhas grandes. Botão "play" no canto.
- **Borda direita do mapa (próxima da sidebar):** toggles grandes - "Mostrar nomes das cidades?" "Mostrar pins de escola?" "Modo: Resultado / Operação".
- **Cantos:** zoom + e -, grandes e redondos, no canto inferior direito.

### 6.5 Os 7 capítulos

O mapa é organizado em **histórias prontas**, não em filtros. O usuário escolhe o capítulo, o mapa e a sidebar contam a história.

| # | Capítulo | Demo | Single | Premium |
|---|---|---|---|---|
| 0 | **O cenário político hoje** (top 5 partidos no Brasil) | Sim | Sim | Sim |
| 1 | **Onde [seu partido] está forte** | Não | Sim (faixas) | Sim (exato) |
| 2 | **Onde [seu partido] está crescendo** | Não | Sim (faixas) | Sim (exato) |
| 3 | **Onde [seu partido] está perdendo** | Não | Sim (faixas) | Sim (exato) |
| 4 | **Os maiores eleitos do partido** | Não | Sim (top 3, sem dossiê) | Sim (top 10 + dossiês) |
| 5 | **Quem ameaça o partido** (concorrentes crescendo onde você cai) | Não | **Bloqueado (CTA upgrade)** | Sim |
| 6 | **Comparar com outro partido** | Demo (com partido fictício) | **Bloqueado (CTA upgrade)** | Sim |
| 7 | **Linha do tempo do partido** (autoplay temporal) | Não | Sim (sem números) | Sim (com tudo) |

Capítulos 5 e 6 são os principais drivers de upgrade do Single para o Premium.

### 6.6 Os 2 modos do mapa

O mesmo container, a mesma sidebar, os mesmos botões - mas duas leituras complementares do território.

#### Modo "Resultado" (votos e eleitos)
- O território pintado pela força eleitoral.
- Pergunta que responde: **"Como o partido está hoje?"**
- Capítulos 0-7 acima.

#### Modo "Operação" (pessoas e desempenho)
- O território pintado pela presença e desempenho da equipe do partido.
- Mostra: tem coordenador? Quantas visitas no último mês? Cabos ativos? Última atividade?
- Pins com fotos de coordenadores nas regiões deles.
- Alertas vermelhos em municípios com presença histórica e zero atividade nos últimos 60 dias (o "X9 das pessoas").
- Pergunta que responde: **"Quem está construindo o futuro do partido, e quem está só recebendo salário?"**

Toggle no canto superior direito do mapa: "Resultado | Operação".

### 6.7 O X9 visual (regra estrutural de cor)

**A inovação visual mais forte do produto.** O mapa não pinta com escala neutra de farol. Pinta com **as cores do confronto político**.

**Regra dos 3 estados visuais por município:**

| Estado do partido cliente | Cor aplicada | Mensagem emocional |
|---|---|---|
| **Forte** | Cor do partido cliente, saturada (ex: azul/amarelo do União Brasil) | "Aqui você manda" |
| **Fraco** | Cor da oposição dominante, **opaca / lavada** | "Aqui você está perdendo terreno" |
| **Ausente** | Cor da oposição dominante, **saturada e gritante** | "Aqui o adversário manda. Faça algo." |

Quando o presidente abre o mapa, ele não vê uma escala técnica. Vê **um campo de batalha**. Os territórios verdes/amarelos são dele. Os vermelhos/vinhos pertencem ao adversário e estão **gritando para serem tomados**.

**Implicações técnicas:**
- Tabela `partidos` precisa ganhar `cor_primaria` e `cor_secundaria`.
- Backend devolve, para cada município, `partido_dominante_id` e `nivel_presenca_cliente` (forte/fraco/ausente).
- Frontend lê a cor do partido cliente do tenant atual + cor do partido dominante e aplica a regra.
- Cada partido cliente vê o mapa pintado com as próprias cores. Plataforma branca por dentro.

### 6.8 As 3 camadas geográficas (do macro ao micro)

O mapa cobre toda a escala que o partido opera, do Brasil ao quarteirão.

**Camada 1 - Geografia oficial (base estática)**
- País → Estado → Município → Zona Eleitoral
- Vem do IBGE + TSE.
- Já existe no banco. Já tem geometrias simplificadas para performance.

**Camada 2 - Cerca virtual (área de responsabilidade operacional)**
- Polígono livre desenhado pelo coordenador.
- Já existe no banco como `cercas_virtuais` com PostGIS Polygon real.
- O coordenador desenha "Minha região: Vila Brasilândia Alta", dá nome, vincula lideranças e cabos.
- Múltiplas cercas dentro do mesmo município. Sobreposição permitida.

**Camada 3 - Pin de escola (átomo de execução)**
- Cada local de votação é uma escola, com coordenadas oficiais.
- Já existe no banco como `locais_votacao` (referenciado em `secoes_eleitorais.local_votacao`).
- Frontend renderiza pins ao zoom alto.
- Clicar na escola mostra na sidebar: "História da escola" - votos por partido em cada eleição, cabos atuando aqui, próximas visitas.

### 6.9 A escola como nó central do mapa

A escola é o lugar mais importante do mapa eleitoral. É onde o voto é depositado, onde o cabo atua, e onde a história se mede.

Card de escola na sidebar:
```
─────────────────────────────────
EMEF PADRE ANCHIETA
Brasilândia, São Paulo
─────────────────────────────────

Nesta escola, em 2024:
  União Brasil teve 142 votos
  Crescemos 18 votos vs 2020
  Posição: 4º partido na escola

Cabos eleitorais atuando aqui:
  Maria Silva (foto) - ativa
  João Santos (foto) - sem registro
  de atividade há 23 dias - ALERTA

Próxima visita do coordenador:
  12 de junho

[ Ver histórico completo ]
[ Designar cabo eleitoral aqui ]
─────────────────────────────────
```

### 6.10 Kill feature: causalidade entre cabo eleitoral e variação de votos

A pergunta que ninguém consegue responder hoje no Brasil:

> "Esse cabo eleitoral que eu paguei R$ 3 mil **trouxe quantos votos a mais**?"

A plataforma responde porque cruza 2 dados:
- **Trilha do cabo** (escolas atribuídas a ele) - `cabo_escolas`.
- **Resultado eleitoral por escola** (votos por partido por seção) - `resultados_zona`.

Se Maria atuou em 6 escolas e essas 6 tiveram crescimento médio de 22% para o nosso candidato, enquanto escolas vizinhas sem atuação tiveram crescimento de 4%, **Maria gerou 18 pontos de crescimento. Isso é o ROI dela**.

Inversamente: se João recebeu R$ 3 mil para 5 escolas, e essas 5 escolas não cresceram ou caíram, **João é improdutivo**. Partido demite, contrata outro, mede de novo.

Esse é o produto. **Inteligência aplicada a quem trabalha no chão.** Nenhum competidor brasileiro faz isso hoje.

---

## 7. Accountability dos profissionais

Cada pessoa que recebe salário do partido tem, na plataforma, métricas claras de trabalho e um score visível.

### Para coordenadores
- Cobertura territorial (% dos municípios atribuídos com atividade no último mês)
- Lideranças sob responsabilidade dele
- Cabos sob responsabilidade dele
- Variação dos indicadores eleitorais na região dele ao longo dos meses
- Score automático calculado pelo backend

### Para lideranças
- Score OURO/PRATA/BRONZE/CRITICO (já existe no banco)
- Fórmula: votos × 40% + crescimento × 30% + constância × 30%
- Escolas vinculadas
- Histórico de atividade

### Para cabos eleitorais
- Performance VERDE/AMARELO/VERMELHO/SEM_DADOS (já existe no banco)
- Fórmula: conversão de voto na urna nas escolas atribuídas
- Variação vs ciclo anterior
- Comprovação de atividade in-loco

### Relatório semanal automático
O presidente do partido recebe e-mail e tela com:
- "Estes 3 coordenadores estaduais não tiveram atividade nos últimos 30 dias."
- "Estes 5 cabos estão acima da média do partido."
- "Estes 8 municípios da sua base perderam força sem ninguém responder."

---

## 8. Comprovação in-loco (estratégia em camadas)

O cabo eleitoral é, em geral, classe muito baixa no Brasil. Pode não ter celular smartphone. A solução não pode depender de tecnologia que ele não tem.

### Camada A (primária) - Atestado pelo coordenador

**O coordenador é o validador humano.** Ele encontra o cabo na rua, tira foto dos dois juntos, GPS do celular do coordenador valida o local, sistema registra "Maria Silva atestada in-loco pelo coordenador João às 14h". Funciona mesmo se o cabo não tem celular.

Isso resolve o problema estrutural sem exigir tecnologia que o cabo não tem.

### Camada B (secundária, opcional) - PWA do cabo
Para cabos que têm smartphone, app web instalável (PWA) com check-in geolocalizado periódico (foto + GPS + horário). Combina foto + presença física com timestamp confiável.

### Camada C (terciária) - WhatsApp localização estática
Cabo manda localização estática (1 ponto) no início e no fim da jornada para o WhatsApp da plataforma. Sistema valida que os 2 pontos estão dentro da área dele e o intervalo é compatível com jornada de 4-6 horas.

**Pendência crítica de verificação:** confirmar com a documentação oficial do WhatsApp Business API se live location passa ou não. Hipótese forte é que não passa, só localização estática.

### Quem valida quem
- Coordenador valida cabos da própria região.
- Presidente estadual pode validar coordenadores e cabos.
- Presidente nacional pode validar qualquer um.
- Validação fora da jurisdição é bloqueada pelo RBAC territorial.

### Tabelas a criar
- `visitas` (planejada por coordenador, com data/local/responsável/objetivo)
- `check_ins` (registro real de presença, com foto, GPS, autor, atestado)
- `atestados_coordenador` (vínculo cabo + coordenador atestador + foto + timestamp + cerca onde aconteceu)

---

## 9. Identidade visual obrigatória (regras invioláveis)

A presença visual de fotos e logos é o que faz a plataforma ter cara de coisa séria para o presidente do partido. Não é decoração - é regra de produto.

### Regra 1 - Toda pessoa nomeada tem foto
Card de político, dossiê, lista de coordenadores, lista de cabos, ranking de eleitos, narrativa da sidebar - **se aparece o nome de Lucas Pavanotto, aparece a foto dele junto**. Sem exceção.

Quando não houver foto, mostra **avatar genérico discreto** (não silhueta agressiva) e marca no backend como pendência. Pendência vai para a fila do administrador do tenant resolver.

### Regra 2 - Todo partido mencionado tem logo
Não escrevemos "PSD" sem o logo do PSD ao lado. Comparações entre partidos exibem logos lado a lado. Top 5 partidos no Capítulo 0 exibe os 5 logos como banners.

**Já temos os logos** dos 30+ partidos brasileiros via Wikimedia Commons (`partidos.logo_url`).

### Regra 3 - A plataforma carrega a identidade do partido cliente em primeiro plano
Quando o partido X faz login, ele vê:
- Logo dele no canto superior
- Cor primária dele em botões e elementos de marca
- Nome dele na sidebar narradora
- Cores dele no mapa quando "forte"

Ele não pode esquecer 1 segundo que a plataforma é dele.

**Estado atual:** `tenants.cor_primaria` / `cor_secundaria` / `logo_url` já existem. Falta usar no frontend.

### Origem das fotos
- **Candidatos do TSE**: campo `candidatos.foto_url` existe. Hipótese forte: ETL TSE já popula. Verificar com query.
- **Deputados federais**: API da Câmara dos Deputados publica foto oficial.
- **Senadores**: API do Senado publica foto oficial.
- **Coordenadores, lideranças, cabos**: upload manual no cadastro.
- **Filiados**: upload pelo próprio cadastro.

---

## 10. Princípios de UX para o usuário de 70+

O presidente do partido pode ter 70 anos e nunca ter usado dashboard. A plataforma é desenhada para ele.

### Regras invioláveis

1. **Frases curtas.** Máximo 12 palavras por frase na sidebar narradora.
2. **Nomes humanos.** "Onde estamos fortes", não "Distribuição de capital político".
3. **Números arredondados.** "412 prefeitos", não "412,00 prefeitos eleitos".
4. **Tipografia grande.** Mínimo 16px no corpo, 22px nos títulos da sidebar.
5. **Botões grandes.** Mínimo 48px de altura. Sempre com texto. **Nunca só ícone.**
6. **Cores com contraste alto.** Texto preto sobre branco.
7. **Sem hover-only.** Tudo importante funciona com clique. Hover é só extra.
8. **Confirmação visual de cada ação.** Animação de 600ms ao clicar num capítulo. O senhor vê que algo aconteceu.
9. **Reversibilidade total.** Botão "voltar" sempre presente, sempre no mesmo lugar.
10. **Zero jargão.** Palavras proibidas: "filtro", "modo", "query", "dataset", "métrica". Palavras permitidas: "história", "ver", "comparar", "voltar", "buscar".

---

## 11. Estado atual do código (auditoria de 2026-04-11)

### O que JÁ existe e está pronto
- Multi-tenant (`tenants` mig 007) com modos DEMO/CONTRATADO
- Coordenadores (`coordenadores` + `coordenador_municipios` mig 006)
- Lideranças com score automático (`liderancas` mig 008)
- Cercas virtuais com PostGIS Polygon (`cercas_virtuais` mig 008)
- Cabos eleitorais com contrato e performance (`cabos_eleitorais` mig 010)
- Logos dos partidos brasileiros (`partidos.logo_url` mig 012)
- Foto de candidato (`candidatos.foto_url` - estrutura pronta)
- PoliticoPlataforma (vínculo TSE → usuário)
- AuditoriaLog imutável
- Geometrias simplificadas para performance (mig 011)
- Resultados agregados por escola x partido x ano (`resultados_zona`)
- Farol multi-partido (`farol_municipio` com partido_id)
- Validação Trilha B (votos por zona consistentes)
- Radar Político Fase 1

### O que existe parcialmente
- RBAC com escopo: existe `usuarios.estado_uf_restrito`, mas falta granularidade fina (município, cerca, região)
- Mapa V2: existe a base técnica (MapLibre, store, hooks, hardening B01-B15), mas a camada de capítulos, X9 visual e modo Operação não existem
- Fotos: estrutura pronta, cobertura real precisa ser verificada
- Tabela `partidos`: tem `logo_url`, falta `cor_primaria` e `cor_secundaria`

### Gaps a construir
1. Comprovação in-loco (tabelas `visitas`, `check_ins`, `atestados_coordenador`)
2. RBAC com escopo territorial fino (decorator + validações nos endpoints)
3. Endpoints orientados a capítulo do mapa
4. Cores oficiais dos partidos (migração)
5. Pins de escola no frontend do Mapa V2
6. Modo Operação no frontend do Mapa V2
7. Capítulo 0 (cenário político Brasil) - endpoint + frontend
8. X9 visual no GeoJSONRenderer
9. Sidebar narradora reformulada
10. Botões nas extremidades do mapa
11. Linha do tempo deslizante no rodapé do mapa
12. Job de cálculo de causalidade cabo → variação de voto por escola
13. Cadastro manual de cargos partidários (presidentes estaduais, coordenadores) - não vem do TSE
14. Página de Demo público (URL sem login, dados congelados)
15. Serviço de obfuscação para o plano Single (faixas, médias, qualitativos)

---

## 12. Decisões já tomadas (registradas)

| # | Decisão | Data |
|---|---|---|
| 1 | Conceito X9 visual aprovado como regra estrutural do mapa | 2026-04-11 |
| 2 | Modo Operação entra nesta rodada (não fica para depois) | 2026-04-11 |
| 3 | Capítulo 0 (Cenário Político) confirmado como porta de entrada | 2026-04-11 |
| 4 | Fotos: aproveitar `candidatos.foto_url` que já existe; verificar cobertura real antes de baixar mais nada | 2026-04-11 |
| 5 | Demo usa partido real neutro (não fictício) | 2026-04-11 |
| 6 | Multi-tenant: estrutura já existe, só validar e usar | 2026-04-11 |
| 7 | Camadas geográficas: setor IBGE + cerca virtual + escola, com aprovação territorial pelo cargo acima | 2026-04-11 |
| 8 | Comprovação in-loco: o coordenador valida o cabo (Camada A primária) | 2026-04-11 |
| 9 | Pins de escola via INEP/TSE como nó central do mapa | 2026-04-11 |
| 10 | Permissão de designação respeita polígono de jurisdição (RBAC territorial) | 2026-04-11 |

## 13. Pendências de verificação

| # | O que verificar | Como |
|---|---|---|
| 1 | `candidatos.foto_url` está populado pelo ETL TSE? Para quantos? | Query `SELECT COUNT(*) FROM candidatos WHERE foto_url IS NOT NULL` |
| 2 | WhatsApp Business API recebe live location de usuário comum? | Documentação oficial Meta |
| 3 | Setor censitário do IBGE é necessário ou as cercas + escolas bastam? | Decisão de produto |
| 4 | Locais de votação têm coordenadas GPS? | Query no banco |
| 5 | Existe job de cálculo de performance do cabo eleitoral rodando? | Verificar Celery / scripts |

---

## 14. Glossário do produto

- **Tenant**: cliente da plataforma (um partido). Mode = DEMO ou CONTRATADO.
- **Capítulo**: história pré-montada do mapa. Combina cargo + ano + modo + texto narrativo + próxima ação.
- **Modo Resultado**: leitura do mapa pela força eleitoral.
- **Modo Operação**: leitura do mapa pelas pessoas que trabalham para o partido.
- **X9 visual**: regra de pintar municípios fracos/ausentes com a cor do adversário.
- **Cerca virtual**: polígono livre desenhado por coordenador para definir área operacional.
- **Liderança**: pessoa que movimenta votos em bairros e escolas. Tem score OURO/PRATA/BRONZE/CRITICO.
- **Cabo eleitoral**: agente de campo contratado por coordenador. Performance medida por conversão de voto.
- **Atestado de coordenador**: registro de presença do cabo validado por foto+GPS do coordenador.
- **Faixa (plano Single)**: intervalo numérico devolvido em vez do número exato. Imprecisão deliberada.
- **Sidebar narradora**: painel direito do mapa que conta a história em linguagem humana.
- **Jurisdição**: polígono geográfico em que um usuário tem permissão de atuar.
